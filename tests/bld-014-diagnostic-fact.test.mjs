import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  compareDiagnosticFacts,
  createDiagnosticFact,
  decodeDiagnosticFact,
  decodeDiagnosticFactSet,
  diagnosticFactContractRevision,
  diagnosticFactVersion,
  encodeDiagnosticFact,
  encodeDiagnosticFactSet,
  DIAGNOSTIC_FACT_CATEGORIES,
  DIAGNOSTIC_FACT_CONSEQUENCES,
} from "../packages/domain/dist/index.js";
import {
  bld014BoundaryDrafts,
  bld014BoundaryFacts,
  bld014FixtureRevision,
  bld014IterationsPerSeed,
  bld014PropertySeeds,
  createFixtureFact,
  makeDiagnosticDraft,
} from "./helpers/bld-014-fixtures.mjs";
import { runBld014PropertyModel } from "./helpers/bld-014-property-model.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeepFrozen(value, seen = new Set()) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const item of Object.values(value)) assertDeepFrozen(item, seen);
}

test("BLD-014 versioned facts preserve every structural field canonically and immutably", () => {
  assert.equal(diagnosticFactContractRevision, "bld-014-v1");
  assert.equal(diagnosticFactVersion, 1);
  assert.equal(bld014FixtureRevision, "bld-014-diagnostic-fact-fixture-v1");
  assert.equal(bld014BoundaryFacts.length, DIAGNOSTIC_FACT_CATEGORIES.length);
  assert.deepEqual(
    [...new Set(bld014BoundaryFacts.map((fact) => fact.consequence))].sort(),
    [...DIAGNOSTIC_FACT_CONSEQUENCES].sort(),
  );

  for (const fact of bld014BoundaryFacts) {
    const encoded = encodeDiagnosticFact(fact);
    assert.equal(encoded.accepted, true);
    if (!encoded.accepted) continue;
    assert.match(encoded.digest, /^sha256:[0-9a-f]{64}$/u);
    const decoded = decodeDiagnosticFact(JSON.parse(encoded.canonicalJson));
    assert.equal(decoded.accepted, true);
    if (!decoded.accepted) continue;
    assert.deepEqual(decoded.value, fact);
    assert.notEqual(decoded.value, fact);
    assertDeepFrozen(decoded.value);
  }
});

test("previously admitted long identities, paths, and revisions round-trip without new caps", () => {
  const long = "x".repeat(2_048);
  const fact = createFixtureFact({
    ...makeDiagnosticDraft(50),
    affected: {
      identityKind: "synthetic.entity",
      identity: `synthetic:${long}`,
      path: `/${long}`,
    },
    input: {
      ...makeDiagnosticDraft(50).input,
      revision: `synthetic-revision:${long}`,
    },
    remediationActionIds: [`inspect.${long}`],
  });
  const encoded = encodeDiagnosticFact(fact);
  assert.equal(encoded.accepted, true);
  if (!encoded.accepted) return;
  const decoded = decodeDiagnosticFact(JSON.parse(encoded.canonicalJson));
  assert.equal(decoded.accepted, true);
  if (!decoded.accepted) return;
  assert.equal(decoded.value.affected.identity, `synthetic:${long}`);
  assert.equal(decoded.value.affected.path, `/${long}`);
  assert.equal(decoded.value.input.revision, `synthetic-revision:${long}`);
  assert.deepEqual(decoded.value.remediationActionIds, [`inspect.${long}`]);
});

test("Diagnostic Identity is exact domain basis and excludes fact policy or presentation axes", () => {
  const draft = makeDiagnosticDraft(100);
  const base = createFixtureFact(draft);
  const identityStableVariants = [
    { ...draft, category: "security" },
    { ...draft, cause: { ...draft.cause, evidenceClass: "synthetic.alternate" } },
    { ...draft, consequence: "ignored" },
    { ...draft, input: { ...draft.input, digest: `sha256:${"e".repeat(64)}` } },
    { ...draft, remediationActionIds: ["resolve.synthetic", "inspect.synthetic"] },
  ].map(createFixtureFact);
  assert.equal(
    new Set([base, ...identityStableVariants].map((fact) => fact.diagnosticIdentity)).size,
    1,
  );
  assert.equal(
    new Set([base, ...identityStableVariants].map((fact) => encodeDiagnosticFact(fact).digest))
      .size,
    identityStableVariants.length + 1,
  );

  const identityChangingVariants = [
    { ...draft, code: `${draft.code}_CHANGED` },
    { ...draft, affected: { ...draft.affected, identityKind: "synthetic.other" } },
    { ...draft, affected: { ...draft.affected, identity: `${draft.affected.identity}:other` } },
    { ...draft, affected: { ...draft.affected, path: "/other" } },
    { ...draft, cause: { ...draft.cause, causeKey: `${draft.cause.causeKey}_other` } },
    { ...draft, input: { ...draft.input, revision: `${draft.input.revision}:other` } },
  ].map(createFixtureFact);
  assert.equal(
    new Set([base, ...identityChangingVariants].map((fact) => fact.diagnosticIdentity)).size,
    identityChangingVariants.length + 1,
  );
});

test("caller-supplied derived fields reject on create and are independently checked on decode", () => {
  const draft = makeDiagnosticDraft(200);
  const fact = createFixtureFact(draft);
  assert.deepEqual(
    createDiagnosticFact({ ...draft, diagnosticIdentity: fact.diagnosticIdentity }),
    {
      accepted: false,
      code: "DIAGNOSTIC_FACT_EXTRA_FIELD",
    },
  );
  assert.deepEqual(
    decodeDiagnosticFact({ ...fact, diagnosticIdentity: `sha256:${"0".repeat(64)}` }),
    { accepted: false, code: "DIAGNOSTIC_FACT_IDENTITY_MISMATCH" },
  );
  const wrongOrder = clone(fact);
  wrongOrder.orderingKey[0] = wrongOrder.orderingKey[0] === "source" ? "data" : "source";
  assert.deepEqual(decodeDiagnosticFact(wrongOrder), {
    accepted: false,
    code: "DIAGNOSTIC_FACT_ORDER_MISMATCH",
  });
});

test("fact sets reject duplicate identity and canonicalize insertion order without locale", () => {
  const facts = bld014BoundaryFacts.slice(0, 7);
  const forward = encodeDiagnosticFactSet(facts);
  const reverse = encodeDiagnosticFactSet([...facts].reverse());
  assert.equal(forward.accepted, true);
  assert.equal(reverse.accepted, true);
  if (!forward.accepted || !reverse.accepted) return;
  assert.equal(forward.canonicalJson, reverse.canonicalJson);
  assert.equal(forward.digest, reverse.digest);
  for (let index = 1; index < forward.value.length; index += 1) {
    const comparison = compareDiagnosticFacts(forward.value[index - 1], forward.value[index]);
    assert.equal(comparison.accepted, true);
    if (comparison.accepted) assert.equal(comparison.order < 0, true);
  }

  const sameIdentityDifferentConsequence = createFixtureFact({
    ...bld014BoundaryDrafts[0],
    consequence: "ignored",
  });
  assert.deepEqual(decodeDiagnosticFactSet([facts[0], sameIdentityDifferentConsequence]), {
    accepted: false,
    code: "DIAGNOSTIC_FACT_DUPLICATE_IDENTITY",
  });
});

test("UTF-16 code-unit ordering is exercised after equal leading key fields", () => {
  const base = makeDiagnosticDraft(250, {
    code: "SYNTHETIC.UNICODE_ORDER",
    category: "data",
    cause: { causeKey: "synthetic.same_cause", evidenceClass: "synthetic.same_evidence" },
    input: {
      revision: "synthetic-same-revision",
      digest: `sha256:${"a".repeat(64)}`,
    },
    remediationActionIds: ["inspect.synthetic"],
  });
  const facts = ["𝄞", "é", "a"].map((identity) =>
    createFixtureFact({
      ...base,
      affected: { identityKind: "synthetic.entity", identity },
    }),
  );
  const result = decodeDiagnosticFactSet(facts);
  assert.equal(result.accepted, true);
  if (!result.accepted) return;
  assert.deepEqual(
    result.value.map((fact) => fact.affected.identity),
    ["a", "é", "𝄞"],
  );
  for (let index = 1; index < result.value.length; index += 1) {
    const comparison = compareDiagnosticFacts(result.value[index - 1], result.value[index]);
    assert.deepEqual(comparison, { accepted: true, order: -1 });
  }
});

test("create detaches nested input and action arrays before freezing", () => {
  const draft = clone(makeDiagnosticDraft(275));
  const created = createDiagnosticFact(draft);
  assert.equal(created.accepted, true);
  if (!created.accepted) return;
  const before = encodeDiagnosticFact(created.value);
  assert.equal(before.accepted, true);
  draft.affected.identity = "mutated-private-identity";
  draft.cause.causeKey = "mutated.private_cause";
  draft.input.revision = "mutated-private-revision";
  draft.remediationActionIds.push("mutated.private_action");
  const after = encodeDiagnosticFact(created.value);
  assert.equal(after.accepted, true);
  if (before.accepted && after.accepted) {
    assert.equal(after.canonicalJson, before.canonicalJson);
    assert.equal(after.digest, before.digest);
    assert.equal(after.canonicalJson.includes("mutated-private"), false);
  }
});

test("missing, extra, wrong, unknown, unsafe, and malformed-order inputs reject stably", () => {
  const draft = makeDiagnosticDraft(300);
  const missing = clone(draft);
  delete missing.cause;
  const extra = { ...draft, severity: "error-private-value" };
  const wrong = { ...draft, consequence: 7 };
  const unknownCategory = { ...draft, category: "vendor-private-category" };
  const unknownConsequence = { ...draft, consequence: "silent" };
  const unsupported = { ...draft, factVersion: 2 };
  const duplicateAction = {
    ...draft,
    remediationActionIds: ["inspect.synthetic", "inspect.synthetic"],
  };
  const missingAction = { ...draft, remediationActionIds: [] };
  const unsafe = { ...draft, affected: { ...draft.affected, identity: "private\ud800value" } };
  const bidi = { ...draft, affected: { ...draft.affected, identity: "private\u202esecret" } };
  const cases = [
    [missing, "DIAGNOSTIC_FACT_MISSING_FIELD"],
    [extra, "DIAGNOSTIC_FACT_EXTRA_FIELD"],
    [wrong, "DIAGNOSTIC_FACT_WRONG_TYPE"],
    [unknownCategory, "DIAGNOSTIC_FACT_UNKNOWN_TAG"],
    [unknownConsequence, "DIAGNOSTIC_FACT_UNKNOWN_TAG"],
    [unsupported, "DIAGNOSTIC_FACT_UNSUPPORTED_VERSION"],
    [duplicateAction, "DIAGNOSTIC_FACT_INVALID_COMBINATION"],
    [missingAction, "DIAGNOSTIC_FACT_INVALID_COMBINATION"],
    [unsafe, "DIAGNOSTIC_FACT_UNSAFE_UNICODE"],
    [bidi, "DIAGNOSTIC_FACT_UNSAFE_UNICODE"],
  ];
  for (const [input, code] of cases) {
    const result = createDiagnosticFact(input);
    assert.deepEqual(result, { accepted: false, code });
    assert.equal(JSON.stringify(result).includes("private"), false);
  }

  const fact = clone(createFixtureFact(draft));
  fact.remediationActionIds.reverse();
  assert.deepEqual(decodeDiagnosticFact(fact), {
    accepted: false,
    code: "DIAGNOSTIC_FACT_ORDER_MISMATCH",
  });
});

test("hostile prototypes, symbols, hidden fields, accessors, and arrays never run getters", () => {
  const draft = makeDiagnosticDraft(400);
  const inherited = Object.assign(Object.create({ severity: "private" }), draft);
  const symbol = { ...draft, [Symbol("private")]: "private" };
  const hidden = { ...draft };
  Object.defineProperty(hidden, "private", { value: "private", enumerable: false });
  let getterRuns = 0;
  const accessor = { ...draft };
  Object.defineProperty(accessor, "cause", {
    enumerable: true,
    get() {
      getterRuns += 1;
      throw new Error("private");
    },
  });
  const nestedAccessor = { ...draft, cause: { ...draft.cause } };
  Object.defineProperty(nestedAccessor.cause, "causeKey", {
    enumerable: true,
    get() {
      getterRuns += 1;
      return "private";
    },
  });
  const sparseActions = [];
  sparseActions.length = 1;
  const sparse = { ...draft, remediationActionIds: sparseActions };
  const extraArray = { ...draft, remediationActionIds: ["inspect.synthetic"] };
  extraArray.remediationActionIds.private = "private";

  assert.equal(createDiagnosticFact(inherited).code, "DIAGNOSTIC_FACT_MALFORMED");
  assert.equal(createDiagnosticFact(symbol).code, "DIAGNOSTIC_FACT_EXTRA_FIELD");
  assert.equal(createDiagnosticFact(hidden).code, "DIAGNOSTIC_FACT_MALFORMED");
  assert.equal(createDiagnosticFact(accessor).code, "DIAGNOSTIC_FACT_MALFORMED");
  assert.equal(createDiagnosticFact(nestedAccessor).code, "DIAGNOSTIC_FACT_MALFORMED");
  assert.equal(createDiagnosticFact(sparse).code, "DIAGNOSTIC_FACT_MALFORMED");
  assert.equal(createDiagnosticFact(extraArray).code, "DIAGNOSTIC_FACT_EXTRA_FIELD");
  assert.equal(
    compareDiagnosticFacts(accessor, createFixtureFact(draft)).code,
    "DIAGNOSTIC_FACT_MALFORMED",
  );
  assert.equal(getterRuns, 0);
});

test("hostile ordering keys and set arrays reject without executing accessors", () => {
  const fact = clone(createFixtureFact(makeDiagnosticDraft(450)));
  let getterRuns = 0;
  const orderingAccessor = { ...fact };
  Object.defineProperty(orderingAccessor, "orderingKey", {
    enumerable: true,
    get() {
      getterRuns += 1;
      return fact.orderingKey;
    },
  });
  assert.deepEqual(decodeDiagnosticFactSet([orderingAccessor]), {
    accepted: false,
    code: "DIAGNOSTIC_FACT_MALFORMED",
  });

  const orderingSymbol = clone(fact);
  orderingSymbol.orderingKey[Symbol("private")] = "private";
  assert.deepEqual(decodeDiagnosticFactSet([orderingSymbol]), {
    accepted: false,
    code: "DIAGNOSTIC_FACT_EXTRA_FIELD",
  });

  const setAccessor = [fact];
  Object.defineProperty(setAccessor, "0", {
    enumerable: true,
    get() {
      getterRuns += 1;
      return fact;
    },
  });
  assert.deepEqual(decodeDiagnosticFactSet(setAccessor), {
    accepted: false,
    code: "DIAGNOSTIC_FACT_MALFORMED",
  });

  const setSymbol = [fact];
  setSymbol[Symbol("private")] = "private";
  assert.deepEqual(decodeDiagnosticFactSet(setSymbol), {
    accepted: false,
    code: "DIAGNOSTIC_FACT_EXTRA_FIELD",
  });
  assert.equal(getterRuns, 0);
});

test("policy, catalog, publication, and UI fields are structurally absent and not defaulted", () => {
  const prohibited = [
    "severity",
    "suppressible",
    "suppression",
    "acknowledgment",
    "blockingScope",
    "publicationReachability",
    "message",
    "humanReadableCause",
    "accessibilityAnnouncement",
    "uiOrder",
  ];
  const draft = makeDiagnosticDraft(500);
  const fact = createFixtureFact(draft);
  for (const field of prohibited) {
    assert.equal(Object.hasOwn(fact, field), false);
    assert.deepEqual(createDiagnosticFact({ ...draft, [field]: "private" }), {
      accepted: false,
      code: "DIAGNOSTIC_FACT_EXTRA_FIELD",
    });
  }
});

test("three recorded seeds execute 1,000 codec, identity, and ordering cases each", () => {
  for (const seed of bld014PropertySeeds) {
    const run = runBld014PropertyModel(seed, bld014IterationsPerSeed);
    assert.equal(run.codecCases, 1_000);
    assert.equal(run.identityCases, 1_000);
    assert.equal(run.orderingCases, 1_000);
    assert.deepEqual(run.failures, []);
  }
});

test("three fresh pinned processes each repeat the full property model twice exactly", () => {
  const outputs = [];
  for (let processIndex = 0; processIndex < 3; processIndex += 1) {
    const run = spawnSync(process.execPath, ["tests/helpers/run-bld-014-vectors.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
      maxBuffer: 4 * 1024 * 1024,
    });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stderr, "");
    const output = JSON.parse(run.stdout);
    assert.equal(output.nodeExecutableIdentity, "node@24.18.1");
    assert.equal(
      output.nodeExecutableDigest,
      "sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582",
    );
    assert.equal(output.locale, "en-US");
    assert.equal(output.timeZone, "UTC");
    assert.equal(output.result, "PASS");
    assert.equal(output.repetitions.length, 2);
    assert.equal(output.identicalRepetitions, true);
    for (const repetition of output.repetitions) {
      assert.deepEqual(repetition.failures, []);
      assert.equal(
        repetition.propertyRuns.reduce((sum, item) => sum + item.codecCases, 0),
        3_000,
      );
      assert.equal(
        repetition.propertyRuns.reduce((sum, item) => sum + item.identityCases, 0),
        3_000,
      );
      assert.equal(
        repetition.propertyRuns.reduce((sum, item) => sum + item.orderingCases, 0),
        3_000,
      );
    }
    outputs.push(output.processTranscriptDigest);
  }
  assert.equal(new Set(outputs).size, 1);
});
