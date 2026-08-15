import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  decodeDomainValueRecord,
  domainValueRecordsEqual,
  encodeDomainValueRecord,
} from "../packages/domain/dist/value-record.js";
import {
  fx04BoundaryRecords,
  fx04Revision,
  fx12BoundaryRecords,
  fx12Revision,
  makeRecord,
  provenanceFixtures,
} from "./helpers/bld-008-fixtures.mjs";

const seeds = [0x13579bdf, 0x2468ace0, 0x5eedb008];

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

test("FX-04 and adapter-neutral FX-12 preserve every admitted boundary exactly", () => {
  assert.equal(fx04Revision, "FX-04:sparse-missing@r1");
  assert.equal(fx12Revision, "FX-12:lab-supplemental@r1-adapter-neutral");
  assert.deepEqual(
    fx04BoundaryRecords.map((record) => record.content.kind),
    [
      "absent",
      "null",
      "empty-string",
      "empty-collection",
      "zero",
      "value",
      "not-available",
      "not-permitted",
      "malformed",
    ],
  );

  for (const record of [...fx04BoundaryRecords, ...fx12BoundaryRecords]) {
    const decoded = decodeDomainValueRecord(JSON.parse(JSON.stringify(record)));
    assert.equal(decoded.accepted, true);
    if (!decoded.accepted) continue;
    assert.deepEqual(decoded.value, record);
    assert.notEqual(decoded.value, record);
    assert.equal(Object.isFrozen(decoded.value), true);
    assert.equal(Object.isFrozen(decoded.value.content), true);
    assert.equal(Object.isFrozen(decoded.value.provenance), true);
    const encoded = encodeDomainValueRecord(decoded.value);
    assert.equal(encoded.accepted, true);
    if (encoded.accepted) {
      assert.equal(domainValueRecordsEqual(JSON.parse(encoded.json), record), true);
    }
  }

  assert.equal(fx04BoundaryRecords[4].content.value, 0);
  assert.equal(fx04BoundaryRecords[0].content.kind, "absent");
  assert.equal(fx04BoundaryRecords[1].content.kind, "null");
  assert.equal(fx04BoundaryRecords[2].content.kind, "empty-string");
  assert.equal(fx12BoundaryRecords[3].finality.state, "nonfinal");
  assert.equal(fx12BoundaryRecords[6].association.state, "unmatched");
  assert.equal(fx12BoundaryRecords[7].association.state, "ambiguous");
});

test("five provenance classes remain closed, distinct, and non-flattenable", () => {
  assert.deepEqual(
    provenanceFixtures.map((provenance) => provenance.provenanceClass),
    ["source", "supplemental", "override", "resolution", "derived"],
  );
  const encodings = provenanceFixtures.map((provenance) => {
    const result = encodeDomainValueRecord(makeRecord({ provenance }));
    assert.equal(result.accepted, true);
    return result.accepted ? result.json : "";
  });
  assert.equal(new Set(encodings).size, 5);

  for (let index = 0; index < provenanceFixtures.length; index += 1) {
    const current = provenanceFixtures[index];
    const next = provenanceFixtures[(index + 1) % provenanceFixtures.length];
    assert.equal(
      decodeDomainValueRecord(
        makeRecord({ provenance: { ...current, provenanceClass: next.provenanceClass } }),
      ).accepted,
      false,
    );
  }
});

test("coercion, invalid states, units, associations, and eligibility fail explicitly", () => {
  const invalidVectors = [
    [null, "DOMAIN_VALUE_MALFORMED"],
    [{ ...makeRecord(), recordVersion: 2 }, "DOMAIN_VALUE_UNSUPPORTED_VERSION"],
    [
      { ...makeRecord(), content: { kind: "zero", value: 1, originalRepresentation: "1" } },
      "DOMAIN_VALUE_INVALID_COMBINATION",
    ],
    [
      { ...makeRecord(), content: { kind: "value", value: 0, originalRepresentation: "0" } },
      "DOMAIN_VALUE_INVALID_COMBINATION",
    ],
    [
      { ...makeRecord(), content: { kind: "value", value: "", originalRepresentation: "" } },
      "DOMAIN_VALUE_INVALID_COMBINATION",
    ],
    [{ ...makeRecord(), content: { kind: "failed" } }, "DOMAIN_VALUE_UNKNOWN_TAG"],
    [{ ...makeRecord(), content: { kind: "absent" } }, "DOMAIN_VALUE_INVALID_COMBINATION"],
    [{ ...makeRecord(), association: { state: "unmatched" } }, "DOMAIN_VALUE_INVALID_COMBINATION"],
    [
      { ...makeRecord(), association: { state: "ambiguous", candidateTargetIdentities: ["one"] } },
      "DOMAIN_VALUE_INVALID_COMBINATION",
    ],
    [{ ...makeRecord(), finality: { state: "nonfinal" } }, "DOMAIN_VALUE_INVALID_COMBINATION"],
    [
      { ...makeRecord(), unit: { state: "unsupported", originalUnit: "vendor-unit" } },
      "DOMAIN_VALUE_INVALID_COMBINATION",
    ],
    [
      { ...makeRecord(), unit: { state: "specified", quantity: "ratio", symbol: "" } },
      "DOMAIN_VALUE_WRONG_TYPE",
    ],
    [
      { ...makeRecord(), eligibility: { state: "blocked", reasonCodes: [] } },
      "DOMAIN_VALUE_INVALID_COMBINATION",
    ],
    [
      { ...makeRecord(), eligibility: { state: "blocked", reasonCodes: ["vendor-severity"] } },
      "DOMAIN_VALUE_UNKNOWN_TAG",
    ],
    [{ ...makeRecord(), unexpected: "must-not-echo" }, "DOMAIN_VALUE_EXTRA_FIELD"],
  ];
  const missing = makeRecord();
  delete missing.content;
  invalidVectors.push([missing, "DOMAIN_VALUE_MISSING_FIELD"]);

  for (const [input, code] of invalidVectors) {
    const result = decodeDomainValueRecord(input);
    assert.deepEqual(result, { accepted: false, code });
    assert.equal(JSON.stringify(result).includes("must-not-echo"), false);
  }

  const inherited = Object.assign(Object.create({ sourcePrecedence: "forbidden" }), makeRecord());
  const symbolExtra = { ...makeRecord(), [Symbol("vendor")]: "forbidden" };
  const hiddenExtra = makeRecord();
  Object.defineProperty(hiddenExtra, "vendor", { value: "forbidden", enumerable: false });
  let getterRan = false;
  const accessor = makeRecord();
  Object.defineProperty(accessor, "content", {
    enumerable: true,
    get() {
      getterRan = true;
      throw new Error("secret");
    },
  });
  assert.deepEqual(decodeDomainValueRecord(inherited), {
    accepted: false,
    code: "DOMAIN_VALUE_MALFORMED",
  });
  assert.deepEqual(decodeDomainValueRecord(symbolExtra), {
    accepted: false,
    code: "DOMAIN_VALUE_EXTRA_FIELD",
  });
  assert.deepEqual(decodeDomainValueRecord(hiddenExtra), {
    accepted: false,
    code: "DOMAIN_VALUE_MALFORMED",
  });
  assert.deepEqual(decodeDomainValueRecord(accessor), {
    accepted: false,
    code: "DOMAIN_VALUE_MALFORMED",
  });
  assert.equal(getterRan, false);
});

test("three seeds run 1,000 exact positive and negative cases without axis collapse", () => {
  for (const seed of seeds) {
    const random = seededRandom(seed);
    for (let iteration = 0; iteration < 1_000; iteration += 1) {
      const provenance = provenanceFixtures[iteration % provenanceFixtures.length];
      const magnitude = (random() % 100_000) + 1;
      const record = makeRecord({
        content:
          iteration % 2 === 0
            ? { kind: "zero", value: 0, originalRepresentation: "0.0" }
            : { kind: "value", value: magnitude, originalRepresentation: String(magnitude) },
        provenance,
      });
      const encoded = encodeDomainValueRecord(record);
      assert.equal(encoded.accepted, true);
      if (encoded.accepted) {
        assert.equal(domainValueRecordsEqual(record, JSON.parse(encoded.json)), true);
      }

      assert.equal(
        decodeDomainValueRecord({ ...record, association: { state: "unmatched" } }).accepted,
        false,
      );
      assert.equal(
        decodeDomainValueRecord({
          ...record,
          content: { ...record.content, unexpected: iteration },
        }).accepted,
        false,
      );
      assert.equal(
        decodeDomainValueRecord({
          ...record,
          provenance: { ...provenance, provenanceClass: "flattened" },
        }).accepted,
        false,
      );
      assert.equal(
        decodeDomainValueRecord({
          ...record,
          provenance: { ...provenance, basisCodes: [`seed-${seed}\ud800`] },
        }).accepted,
        false,
      );
    }
  }
});

test("three pinned fresh processes repeat the exact corpus digest twice", () => {
  const outputs = [];
  for (let repetition = 0; repetition < 2; repetition += 1) {
    for (let processIndex = 0; processIndex < 3; processIndex += 1) {
      const run = spawnSync(process.execPath, ["tests/helpers/run-bld-008-vectors.mjs"], {
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
