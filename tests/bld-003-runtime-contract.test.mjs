import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  assertContractSchemaParity,
  contractManifestsAgree,
  contractTypeManifest,
  validateExampleBoundaryMessage,
} from "../packages/contracts/dist/runtime-contract.js";

const validMessages = [
  {
    contractVersion: 1,
    messageType: "command",
    kind: "example.noop",
    requestId: "request-1",
    scope: "application",
    payload: null,
  },
  {
    contractVersion: 1,
    messageType: "query",
    kind: "example.contract-version",
    requestId: "request-2",
    scope: "application",
  },
  {
    contractVersion: 1,
    messageType: "command-result",
    kind: "example.noop.completed",
    requestId: "request-1",
    changed: false,
  },
  {
    contractVersion: 1,
    messageType: "query-result",
    kind: "example.contract-version.result",
    requestId: "request-2",
    value: 1,
  },
  {
    contractVersion: 1,
    messageType: "event",
    kind: "example.observed",
    eventSequence: 0,
    changed: false,
  },
];

const propertySeeds = [0x13579bdf, 0x2468ace0, 0x5eedb003];

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

test("the closed command, query, result, and event examples round-trip exactly", () => {
  for (const message of validMessages) {
    const parsed = JSON.parse(JSON.stringify(message));
    assert.deepEqual(validateExampleBoundaryMessage(parsed), { accepted: true, value: message });
  }
});

test("invalid inputs reject with stable nonsecret codes", () => {
  const command = validMessages[0];
  const vectors = [
    [null, "CONTRACT_MALFORMED"],
    [{ ...command, contractVersion: undefined }, "CONTRACT_WRONG_TYPE"],
    [
      {
        messageType: "command",
        kind: "example.noop",
        requestId: "r",
        scope: "application",
        payload: null,
      },
      "CONTRACT_MISSING_FIELD",
    ],
    [{ ...command, unexpected: "secret-value-must-not-echo" }, "CONTRACT_EXTRA_FIELD"],
    [{ ...command, requestId: 4 }, "CONTRACT_WRONG_TYPE"],
    [{ ...command, requestId: "\ud800" }, "CONTRACT_WRONG_TYPE"],
    [{ ...command, kind: "example.unknown" }, "CONTRACT_UNKNOWN_TAG"],
    [{ ...command, messageType: "unknown" }, "CONTRACT_UNKNOWN_TAG"],
    [{ ...command, contractVersion: 2 }, "CONTRACT_UNSUPPORTED_VERSION"],
    [{ ...command, payload: { authority: "forbidden" } }, "CONTRACT_WRONG_TYPE"],
  ];

  const inherited = Object.assign(Object.create({ authority: "forbidden" }), command);
  const symbolExtra = { ...command, [Symbol("authority")]: "forbidden" };
  const hiddenExtra = { ...command };
  Object.defineProperty(hiddenExtra, "authority", { value: "forbidden", enumerable: false });
  let getterRan = false;
  const accessor = { ...command };
  Object.defineProperty(accessor, "requestId", {
    enumerable: true,
    get: () => {
      getterRan = true;
      throw new Error("secret-from-input");
    },
  });
  vectors.push(
    [inherited, "CONTRACT_MALFORMED"],
    [symbolExtra, "CONTRACT_EXTRA_FIELD"],
    [hiddenExtra, "CONTRACT_MALFORMED"],
    [accessor, "CONTRACT_MALFORMED"],
  );

  for (const [input, code] of vectors) {
    const result = validateExampleBoundaryMessage(input);
    assert.deepEqual(result, { accepted: false, code });
    assert.equal(JSON.stringify(result).includes("secret-value"), false);
  }
  assert.equal(getterRan, false);
});

test("three recorded seeds exercise every variant for 1,000 property cases", () => {
  for (const seed of propertySeeds) {
    const random = seededRandom(seed);
    for (let iteration = 0; iteration < 1_000; iteration += 1) {
      const suffix = `${seed.toString(16)}-${iteration}-${random().toString(16)}`;
      for (const template of validMessages) {
        const candidate = {
          ...template,
          ...(Object.hasOwn(template, "requestId") ? { requestId: `request-${suffix}` } : {}),
          ...(Object.hasOwn(template, "eventSequence")
            ? { eventSequence: random() % 1_000_000 }
            : {}),
        };
        const accepted = validateExampleBoundaryMessage(candidate);
        assert.equal(accepted.accepted, true);
        if (accepted.accepted) {
          assert.notEqual(accepted.value, candidate);
          assert.equal(Object.isFrozen(accepted.value), true);
          assert.deepEqual(accepted.value, candidate);
        }
        assert.deepEqual(validateExampleBoundaryMessage({ ...candidate, authority: suffix }), {
          accepted: false,
          code: "CONTRACT_EXTRA_FIELD",
        });
        if (Object.hasOwn(candidate, "requestId")) {
          assert.deepEqual(
            validateExampleBoundaryMessage({
              ...candidate,
              requestId: `${candidate.requestId}\ud800`,
            }),
            { accepted: false, code: "CONTRACT_WRONG_TYPE" },
          );
        }
      }
    }
  }
});

test("a deliberate TypeScript/runtime manifest drift fails closed", () => {
  assert.equal(contractManifestsAgree(), true);
  assert.doesNotThrow(() => assertContractSchemaParity());
  const driftedTypeManifest = {
    ...contractTypeManifest,
    "command:example.noop": {
      ...contractTypeManifest["command:example.noop"],
      payload: "nonempty-string",
    },
  };
  assert.equal(contractManifestsAgree(driftedTypeManifest), false);
  assert.throws(
    () => assertContractSchemaParity(driftedTypeManifest),
    (error) => error instanceof Error && error.message === "CONTRACT_SCHEMA_DRIFT",
  );

  const driftCheck = spawnSync(
    process.execPath,
    ["tests/helpers/check-bld-003-schema-drift.mjs", "tests/fixtures/bld-003-schema-drift.json"],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(driftCheck.status, 1);
  assert.equal(driftCheck.stdout.trim(), "CONTRACT_SCHEMA_DRIFT");
  assert.equal(driftCheck.stderr, "");

  const typeDriftCheck = spawnSync(
    process.execPath,
    [
      "node_modules/typescript/bin/tsc",
      "-p",
      "tests/fixtures/bld-003-type-schema-drift/tsconfig.json",
      "--pretty",
      "false",
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.notEqual(typeDriftCheck.status, 0);
  assert.match(typeDriftCheck.stdout, /TS2322/u);
});

test("three fresh processes repeat the same vector digest twice", () => {
  const outputs = [];
  for (let repetition = 0; repetition < 2; repetition += 1) {
    for (let processIndex = 0; processIndex < 3; processIndex += 1) {
      const run = spawnSync(process.execPath, ["tests/helpers/run-bld-003-vectors.mjs"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
      });
      assert.equal(run.status, 0);
      assert.equal(run.stderr, "");
      const output = JSON.parse(run.stdout);
      assert.equal(output.locale, "en-US");
      assert.equal(output.timeZone, "UTC");
      outputs.push(output.digest);
    }
  }
  assert.equal(new Set(outputs).size, 1);
});
