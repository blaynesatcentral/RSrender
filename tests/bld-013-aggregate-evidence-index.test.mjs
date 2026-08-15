import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { clearTimeout, setTimeout } from "node:timers";
import { fileURLToPath, URL } from "node:url";
import test from "node:test";

import { sha256Utf8 } from "../packages/contracts/dist/index.js";
import {
  AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES as codes,
  readAggregateEvidenceIndex,
  writeAggregateEvidenceIndex,
} from "../packages/test-support/dist/index.js";
import { bld013IndexDraft, clone, loadBld013Sources } from "./helpers/bld-013-index-fixture.mjs";
import { runBld013PropertyModel } from "./helpers/bld-013-property-model.mjs";

function rejected(result, code) {
  assert.equal(result.ok, false);
  assert.ok(
    result.diagnostics.some((item) => item.code === code),
    JSON.stringify(result),
  );
}

test("BLD-013 validates the exact frozen BLD-008 through BLD-012 inventory without aggregate acceptance", async () => {
  const { draft, source } = await bld013IndexDraft();
  const result = await writeAggregateEvidenceIndex(draft, source);
  assert.equal(result.ok, true);
  assert.equal(result.index.schemaVersion, "rsrender.aggregate-evidence-index.v1");
  assert.deepEqual(
    result.index.entries.map(({ ticketId }) => ticketId),
    ["BLD-008", "BLD-009", "BLD-010", "BLD-011", "BLD-012"],
  );
  assert.equal(
    result.index.entries.every(({ sourceManifest }) => sourceManifest.resultState === "PASS"),
    true,
  );
  assert.ok(result.index.nonclaims.some((value) => value.includes("not aggregate acceptance")));
  assert.equal(Object.isFrozen(result.index), true);
  assert.equal(Object.isFrozen(result.index.entries[0]), true);
});

test("BLD-013 durable index canonical JSON and digest are exact", async () => {
  const { source } = await bld013IndexDraft();
  const path = fileURLToPath(
    new URL("../artifacts/bld-013-aggregate-evidence-index.json", import.meta.url),
  );
  const first = await readAggregateEvidenceIndex(readFileSync(path, "utf8"), source);
  const second = await readAggregateEvidenceIndex(readFileSync(path, "utf8"), source);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.canonicalJson, second.canonicalJson);
  assert.equal(first.index.inventoryDigest, second.index.inventoryDigest);
});

test("BLD-013 rejects missing, reordered, duplicate ticket, entry, and manifest identities", async () => {
  const { draft: baseline, source } = await bld013IndexDraft();
  for (const mutate of [
    (draft) => draft.entries.pop(),
    (draft) => draft.entries.reverse(),
    (draft) => {
      draft.entries[1].ticketId = "BLD-008";
    },
    (draft) => {
      draft.entries[1].entryId = draft.entries[0].entryId;
    },
    (draft) => {
      draft.entries[1].entryId = "ARBITRARY-UNIQUE-ROW";
    },
    (draft) => {
      draft.entries[1].sourceManifest.manifestIdentity =
        draft.entries[0].sourceManifest.manifestIdentity;
    },
  ]) {
    const draft = clone(baseline);
    mutate(draft);
    const result = await writeAggregateEvidenceIndex(draft, source);
    assert.equal(result.ok, false);
    assert.ok(
      result.diagnostics.some(
        ({ code }) =>
          code === codes.ticketSetInvalid ||
          code === codes.duplicateIdentity ||
          code === codes.digestInvalid,
      ),
    );
  }
});

test("BLD-013 rejects absent, non-text, digest-changed, and non-JSON source manifests totalistically", async () => {
  const { draft: baseline, source } = await bld013IndexDraft();
  rejected(
    await writeAggregateEvidenceIndex(baseline, {
      readSourceManifest() {
        throw new Error("absent");
      },
    }),
    codes.sourceMissing,
  );
  rejected(
    await writeAggregateEvidenceIndex(baseline, {
      readSourceManifest() {
        return 42;
      },
    }),
    codes.sourceJsonInvalid,
  );
  rejected(
    await writeAggregateEvidenceIndex(baseline, {
      async readSourceManifest(path) {
        return `${await source.readSourceManifest(path)} `;
      },
    }),
    codes.sourceDigestMismatch,
  );
  rejected(
    await writeAggregateEvidenceIndex(baseline, {
      async readSourceManifest(path) {
        return `${await source.readSourceManifest(path)}\ud800`;
      },
    }),
    codes.sourceJsonInvalid,
  );

  const draft = clone(baseline);
  const invalid = "not-json";
  const entry = draft.entries[4];
  entry.sourceManifest.digest = sha256Utf8(invalid);
  entry.sourceManifest.manifestIdentity = `${entry.sourceManifest.path}@${entry.sourceManifest.digest}`;
  rejected(
    await writeAggregateEvidenceIndex(draft, {
      async readSourceManifest(path) {
        return path === entry.sourceManifest.path ? invalid : source.readSourceManifest(path);
      },
    }),
    codes.sourceDigestMismatch,
  );
});

test("BLD-013 rejects altered source results even when attacker recomputes source and index digests", async () => {
  const { draft: baseline, source } = await bld013IndexDraft();
  const draft = clone(baseline);
  const sourceText = await source.readSourceManifest(draft.entries[1].sourceManifest.path);
  const changed = JSON.parse(sourceText);
  changed.result = "FAIL";
  const changedText = JSON.stringify(changed);
  const changedDigest = sha256Utf8(changedText);
  draft.entries[1].sourceManifest.digest = changedDigest;
  draft.entries[1].sourceManifest.manifestIdentity = `${draft.entries[1].sourceManifest.path}@${changedDigest}`;
  draft.entries[1].sourceManifest.resultState = "FAIL";
  rejected(
    await writeAggregateEvidenceIndex(draft, {
      async readSourceManifest(path) {
        return path === draft.entries[1].sourceManifest.path
          ? changedText
          : source.readSourceManifest(path);
      },
    }),
    codes.sourceDigestMismatch,
  );
});

test("BLD-013 rejects caller-selected pointers, schemas, ticket literals, and source paths", async () => {
  const { draft: baseline, source } = await bld013IndexDraft();
  const vectors = [
    [
      codes.sourcePointerInvalid,
      (draft) => {
        draft.entries[0].sourceManifest.failuresPointer = "/oracle/injectedFaults";
      },
    ],
    [
      codes.sourceSchemaInvalid,
      (draft) => {
        draft.entries[0].sourceManifest.schema = "rsrender.bld-evidence.future";
      },
    ],
    [
      codes.sourceMissing,
      (draft) => {
        const item = draft.entries[0].sourceManifest;
        item.path = "artifacts/not-selected.json";
        item.manifestIdentity = `${item.path}@${item.digest}`;
      },
    ],
    [
      codes.sourcePointerInvalid,
      (draft) => {
        draft.entries[4].sourceManifest.ticketPointer = "/trace/0";
      },
    ],
  ];
  for (const [code, mutate] of vectors) {
    const draft = clone(baseline);
    mutate(draft);
    rejected(await writeAggregateEvidenceIndex(draft, source), code);
  }
});

test("BLD-013 requires exact final product, invariant, acceptance, and OA trace", async () => {
  const { draft: baseline, source } = await bld013IndexDraft();
  const vectors = [
    [
      codes.requirementLinkInvalid,
      (draft) => {
        draft.entries[0].requirementLinks.shift();
      },
    ],
    [
      codes.requirementLinkInvalid,
      (draft) => {
        draft.entries[4].requirementLinks[2].requirementId = "P06";
      },
    ],
    [
      codes.requiredAuthorityMissing,
      (draft) => {
        draft.entries[0].authorityLinks.pop();
      },
    ],
    [
      codes.requiredAuthorityMissing,
      (draft) => {
        draft.entries[2].authorityLinks[0].sourcePointers = [];
      },
    ],
    [
      codes.requiredAuthorityMissing,
      (draft) => {
        draft.entries[2].authorityLinks[0].authorityReference += "#approximate";
      },
    ],
    [
      codes.requiredAuthorityMissing,
      (draft) => {
        draft.entries[1].authorityLinks = [clone(draft.entries[0].authorityLinks[0])];
      },
    ],
  ];
  for (const [code, mutate] of vectors) {
    const draft = clone(baseline);
    mutate(draft);
    rejected(await writeAggregateEvidenceIndex(draft, source), code);
  }
});

test("BLD-013 preserves BLD-010 legacy absence instead of inventing a fixture revision", async () => {
  const { draft: baseline, source } = await bld013IndexDraft();
  const legacy = baseline.entries[2];
  assert.equal(legacy.fixtureDisposition, "legacy-no-source-fixture-recorded");
  assert.deepEqual(legacy.fixtureLinks, []);
  for (const mutate of [
    (draft) => {
      draft.entries[2].fixtureDisposition = "source-recorded-fixtures";
    },
    (draft) => {
      draft.entries[2].fixtureLinks = [clone(draft.entries[3].fixtureLinks[0])];
    },
    (draft) => {
      draft.entries[2].fixtureLinks = [
        {
          fixtureIdentity: "tests/helpers/bld-010-fixtures.mjs",
          fixtureRevision: "bld-010-v1",
          digest: `sha256:${"0".repeat(64)}`,
          digestScope: "content-addressed-legacy",
          linkage: "legacy-no-source-fixture-recorded",
          identityPointer: "/artifacts/6/path",
          revisionPointer: "/contract/applicationServiceContractRevision",
          digestPointer: "/artifacts/6/sha256",
        },
      ];
    },
  ]) {
    const draft = clone(baseline);
    mutate(draft);
    rejected(await writeAggregateEvidenceIndex(draft, source), codes.fixtureLinkInvalid);
  }
});

test("BLD-013 rejects wrong fixture, oracle, revision, result, failure, and nonclaim links", async () => {
  const { draft: baseline, source } = await bld013IndexDraft();
  const vectors = [
    [
      codes.fixtureLinkInvalid,
      (draft) => {
        draft.entries[1].fixtureLinks[0].fixtureRevision += "-wrong";
      },
    ],
    [
      codes.fixtureLinkInvalid,
      (draft) => {
        draft.entries[3].fixtureLinks[0].digest = `sha256:${"0".repeat(64)}`;
      },
    ],
    [
      codes.oracleLinkInvalid,
      (draft) => {
        draft.entries[0].oracleLink.version += "-wrong";
        draft.entries[0].oracleLink.oracleId += "-wrong";
      },
    ],
    [
      codes.revisionLinkInvalid,
      (draft) => {
        draft.entries[4].revisionLinks[0].revision += "-wrong";
      },
    ],
    [
      codes.resultLinkInvalid,
      (draft) => {
        draft.entries[0].sourceManifest.resultState = "FAIL";
      },
    ],
    [
      codes.unknownResultState,
      (draft) => {
        draft.entries[0].sourceManifest.resultState = "UNKNOWN";
      },
    ],
    [
      codes.resultLinkInvalid,
      (draft) => {
        draft.entries[0].sourceManifest.failuresDigest = `sha256:${"0".repeat(64)}`;
      },
    ],
    [
      codes.nonclaimLinkInvalid,
      (draft) => {
        draft.entries[0].sourceManifest.nonclaimsDigest = `sha256:${"0".repeat(64)}`;
      },
    ],
    [
      codes.nonclaimLinkInvalid,
      (draft) => {
        draft.nonclaims.pop();
      },
    ],
  ];
  for (const [code, mutate] of vectors) {
    const draft = clone(baseline);
    mutate(draft);
    rejected(await writeAggregateEvidenceIndex(draft, source), code);
  }
});

test("BLD-013 rejects malformed, extra-field, bad-digest, and unsupported-version indexes", async () => {
  const { draft, source } = await bld013IndexDraft();
  rejected(await readAggregateEvidenceIndex("not-json", source), codes.jsonInvalid);
  rejected(
    await readAggregateEvidenceIndex(JSON.stringify({ schemaVersion: "future" }), source),
    codes.unsupportedVersion,
  );
  const written = await writeAggregateEvidenceIndex(draft, source);
  assert.equal(written.ok, true);
  const extra = JSON.parse(written.canonicalJson);
  extra.entries[0].unexpected = true;
  rejected(await readAggregateEvidenceIndex(JSON.stringify(extra), source), codes.malformed);
  const wrongDigest = JSON.parse(written.canonicalJson);
  wrongDigest.inventoryDigest = `sha256:${"0".repeat(64)}`;
  rejected(
    await readAggregateEvidenceIndex(JSON.stringify(wrongDigest), source),
    codes.digestMismatch,
  );
  const accessor = clone(draft);
  Object.defineProperty(accessor, "entries", {
    enumerable: true,
    get() {
      return [];
    },
  });
  rejected(await writeAggregateEvidenceIndex(accessor, source), codes.malformed);
});

test("BLD-013 public read/write boundaries totalize hostile scalar and object shapes", async () => {
  const { draft: baseline, source } = await bld013IndexDraft();
  const scalars = [null, undefined, true, 1, 1n, Symbol("hostile"), [], () => undefined];
  for (const value of scalars) {
    rejected(await writeAggregateEvidenceIndex(value, source), codes.malformed);
  }
  for (const text of ["null", "true", "1", "[]", '"text"']) {
    rejected(await readAggregateEvidenceIndex(text, source), codes.malformed);
  }
  rejected(await readAggregateEvidenceIndex(undefined, source), codes.jsonInvalid);

  const hostileDrafts = [];
  const inherited = clone(baseline);
  Object.setPrototypeOf(inherited, { inherited: true });
  hostileDrafts.push(inherited);
  const nestedInherited = clone(baseline);
  Object.setPrototypeOf(nestedInherited.entries[0], { inherited: true });
  hostileDrafts.push(nestedInherited);
  const hidden = clone(baseline);
  Object.defineProperty(hidden, "hidden", { enumerable: false, value: true });
  hostileDrafts.push(hidden);
  const nestedHidden = clone(baseline);
  Object.defineProperty(nestedHidden.entries[0], "hidden", {
    enumerable: false,
    value: true,
  });
  hostileDrafts.push(nestedHidden);
  const symbol = clone(baseline);
  symbol[Symbol("hostile")] = true;
  hostileDrafts.push(symbol);
  const nestedSymbol = clone(baseline);
  nestedSymbol.entries[0][Symbol("hostile")] = true;
  hostileDrafts.push(nestedSymbol);
  const nestedAccessor = clone(baseline);
  Object.defineProperty(nestedAccessor.entries[0], "ticketId", {
    enumerable: true,
    get() {
      return "BLD-008";
    },
  });
  hostileDrafts.push(nestedAccessor);
  for (const draft of hostileDrafts) {
    rejected(await writeAggregateEvidenceIndex(draft, source), codes.malformed);
  }
});

test("BLD-013 source boundary totalizes null, missing, throwing, rejected, and non-text providers", async () => {
  const { draft } = await bld013IndexDraft();
  const throwingGetter = {};
  Object.defineProperty(throwingGetter, "readSourceManifest", {
    get() {
      throw new Error("getter failure");
    },
  });
  const sources = [
    null,
    {},
    throwingGetter,
    {
      readSourceManifest() {
        throw new Error("sync failure");
      },
    },
    {
      readSourceManifest() {
        return Promise.reject(new Error("async failure"));
      },
    },
    {
      readSourceManifest() {
        return null;
      },
    },
    {
      readSourceManifest() {
        return undefined;
      },
    },
    {
      readSourceManifest() {
        return true;
      },
    },
    {
      readSourceManifest() {
        return 1;
      },
    },
    {
      readSourceManifest() {
        return 1n;
      },
    },
    {
      readSourceManifest() {
        return Symbol("hostile");
      },
    },
    {
      readSourceManifest() {
        return [];
      },
    },
    {
      readSourceManifest() {
        return () => undefined;
      },
    },
  ];
  for (const source of sources) {
    const result = await writeAggregateEvidenceIndex(draft, source);
    assert.equal(result.ok, false);
    assert.ok(
      result.diagnostics.some(
        ({ code }) => code === codes.sourceMissing || code === codes.sourceJsonInvalid,
      ),
    );
  }
});

test("BLD-013 three recorded property seeds reject 1,000 mutations per invariant run", async () => {
  const result = await runBld013PropertyModel();
  assert.equal(result.totalRejectedMutations, 3000);
  assert.equal(result.seedResults.length, 3);
  assert.equal(
    result.seedResults.every(({ iterations }) => iterations === 1000),
    true,
  );
});

test("BLD-013 repeats the full property model in three fresh pinned processes twice", async () => {
  const runner = fileURLToPath(new URL("./helpers/run-bld-013-vectors.mjs", import.meta.url));
  const results = await Promise.all(
    Array.from(
      { length: 3 },
      () =>
        new Promise((resolve, reject) => {
          const child = spawn(process.execPath, [runner], {
            cwd: fileURLToPath(new URL("../", import.meta.url)),
            env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
          });
          let stdout = "";
          let stderr = "";
          child.stdout.setEncoding("utf8").on("data", (chunk) => {
            stdout += chunk;
          });
          child.stderr.setEncoding("utf8").on("data", (chunk) => {
            stderr += chunk;
          });
          child.on("error", reject);
          const timeout = setTimeout(() => {
            child.kill();
            reject(new Error("BLD-013 fresh property process exceeded 180 seconds"));
          }, 180_000);
          child.on("close", (status) => {
            clearTimeout(timeout);
            if (status !== 0) reject(new Error(stderr));
            else resolve(JSON.parse(stdout));
          });
        }),
    ),
  );
  for (const result of results) {
    assert.equal(result.result, "PASS");
    assert.equal(result.timeZone, "UTC");
    assert.equal(result.locale, "en-US");
    assert.equal(result.runtime.nodeVersion, "v24.18.1");
    assert.equal(result.runtime.nodeExecutableIdentity, "node@24.18.1");
    assert.equal(
      result.runtime.nodeExecutableSha256,
      "sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582",
    );
    assert.equal(result.propertyRuns.length, 2);
    assert.equal(
      result.propertyRuns.every(({ property }) => property.totalRejectedMutations === 3000),
      true,
    );
    assert.equal(
      result.propertyRuns.every(({ runDigest }) => runDigest.startsWith("sha256:")),
      true,
    );
    assert.equal(result.aggregateAcceptanceClaim, false);
    assert.equal(result.sourceTestsExecuted, false);
  }
  assert.equal(new Set(results.map(({ transcriptDigest }) => transcriptDigest)).size, 1);
  assert.equal(
    new Set(
      results.flatMap(({ propertyRuns }) => propertyRuns.map(({ property }) => property.digest)),
    ).size,
    1,
  );
});

test("BLD-013 source callback never receives any path outside the frozen five-manifest inventory", async () => {
  const { draft } = await bld013IndexDraft();
  const { textByPath } = await loadBld013Sources();
  const observed = [];
  const result = await writeAggregateEvidenceIndex(draft, {
    readSourceManifest(path) {
      observed.push(path);
      return textByPath.get(path);
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(observed, [...textByPath.keys()]);
});
