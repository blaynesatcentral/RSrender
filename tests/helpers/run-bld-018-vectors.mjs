import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { createInMemoryPhase1ProjectHistoryCore } from "../../packages/application/dist/index.js";
import {
  canonicalizeJson,
  createProjectDomainEffect,
  sha256CanonicalJson,
} from "../../packages/contracts/dist/index.js";
import {
  createBld018Navigation,
  createBld018NextProject,
  createBld018PropertyEffect,
  bld018GeneratorRevision,
  bld018IterationsPerSeed,
  bld018OracleRevision,
  bld018PropertyInvariants,
  bld018PropertySeeds,
  runBld018PropertyModel,
} from "./bld-018-property-model.mjs";
import { emptyPhase1Project } from "./bld-016-fixtures.mjs";

const admittedNodeVersion = "v24.18.1";
const admittedExecutableSha256 =
  "sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582";
const executableSha256 = `sha256:${createHash("sha256")
  .update(readFileSync(process.execPath))
  .digest("hex")}`;
const runtimeLocale = Intl.DateTimeFormat().resolvedOptions().locale;
const runtimeTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
if (
  process.version !== admittedNodeVersion ||
  executableSha256 !== admittedExecutableSha256 ||
  runtimeLocale !== "en-US" ||
  runtimeTimeZone !== "UTC"
) {
  throw new Error("BLD-018 admitted runtime mismatch");
}

const fixedCapacities = Object.freeze({
  replayEntries: 32,
  historyEntries: 8,
  commits: 16,
  events: 16,
  subscriptionBatch: 8,
});

function requireCore(aggregate, capacities = fixedCapacities) {
  const created = createInMemoryPhase1ProjectHistoryCore({
    aggregate,
    ownerGeneration: 17,
    capacities,
  });
  if (!created.accepted) throw new Error(created.code);
  return created.core;
}

function witness(core) {
  const snapshot = core.inspectProject();
  return Object.freeze({
    aggregateDigest: snapshot.aggregateDigest,
    aggregateCanonicalDigest: sha256CanonicalJson(JSON.parse(snapshot.aggregateCanonicalJson)),
    workingRevision: snapshot.workingRevision,
    durableRevision: snapshot.durableRevision,
    historyCursor: snapshot.historyCursor,
    historyLength: snapshot.historyLength,
    eventCount: snapshot.events.length,
    replayEntryCount: snapshot.replayEntryCount,
    commitCount: snapshot.commitCount,
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
    tailEffectIdentity: snapshot.history.at(-1)?.effectIdentity ?? null,
  });
}

function normalizedResult(result) {
  return Object.freeze({
    kind: result.kind,
    requestId: result.requestId,
    reason: result.kind === "project-domain-history.rejected" ? result.reason : null,
    operation: result.kind === "project-domain-history.committed" ? result.operation : null,
    workingRevision:
      result.kind === "project-domain-history.committed" ? result.workingRevision : null,
    historyCursor: result.kind === "project-domain-history.committed" ? result.historyCursor : null,
    historyLength: result.kind === "project-domain-history.committed" ? result.historyLength : null,
    aggregateDigest:
      result.kind === "project-domain-history.committed" ? result.aggregateDigest : null,
    eventSequence: result.kind === "project-domain-history.committed" ? result.eventSequence : null,
    sourceCommandDigest:
      result.kind === "project-domain-history.committed" ? result.sourceCommandDigest : null,
    sourceCommandIdentity:
      result.kind === "project-domain-history.committed" ? result.sourceCommandIdentity : null,
    historyEntryIdentity:
      result.kind === "project-domain-history.committed" ? result.historyEntryIdentity : null,
    affectedIdentities:
      result.kind === "project-domain-history.committed" ? result.affectedIdentities : null,
    invalidations: result.kind === "project-domain-history.committed" ? result.invalidations : null,
    eventResult:
      result.kind === "project-domain-history.committed"
        ? Object.freeze({
            resultCode: result.eventResult.resultCode,
            payloadDigest: result.eventResult.payloadDigest,
          })
        : null,
  });
}

function recreateEffect(effect, changes = {}) {
  const created = createProjectDomainEffect({
    sourceRequestId: effect.sourceRequestId,
    sourceCommandCanonicalJson: effect.sourceCommandCanonicalJson,
    sourceCommandIdentity: effect.sourceCommandIdentity,
    commandLabel: effect.commandLabel,
    documentId: effect.documentId,
    ownerGeneration: effect.ownerGeneration,
    expectedWorkingRevision: effect.expectedWorkingRevision,
    beforeAggregateCanonicalJson: effect.beforeAggregate.canonicalJson,
    afterAggregateCanonicalJson: effect.afterAggregate.canonicalJson,
    affectedIdentities: effect.affectedIdentities,
    invalidations: effect.invalidations,
    eventResult: {
      resultCode: effect.eventResult.resultCode,
      canonicalPayload: effect.eventResult.canonicalPayload,
    },
    ...changes,
  });
  if (!created.accepted) throw new Error(created.code);
  return created.value;
}

async function runFixedTranscript() {
  const p0 = emptyPhase1Project();
  const p1 = createBld018NextProject(p0, 1, "fixed-one");
  const p2 = createBld018NextProject(p1, 2, "fixed-two");
  const p3 = createBld018NextProject(p2, 3, "fixed-three");
  const branchProject = createBld018NextProject(p1, 3, "fixed-branch");
  const core = requireCore(p0);
  const e1 = createBld018PropertyEffect(p0, p1, 10_001, 0, "fixed-one");
  const e2 = createBld018PropertyEffect(p1, p2, 10_002, 1, "fixed-two");
  const records = [];
  const record = (name, before, result, after, expected) => {
    assert.equal(result.kind, expected.kind);
    if (expected.kind === "project-domain-history.rejected") {
      assert.equal(result.reason, expected.reason);
    } else {
      assert.equal(result.operation, expected.operation);
    }
    if (expected.effect === "zero-authority-change") {
      assert.deepEqual(after, before);
    } else if (expected.effect === "replay-only") {
      assert.deepEqual({ ...after, replayEntryCount: before.replayEntryCount }, before);
      assert.equal(after.replayEntryCount, before.replayEntryCount + 1);
    } else if (expected.effect === "transition") {
      assert.equal(after.workingRevision, before.workingRevision + 1);
      assert.equal(after.eventCount, before.eventCount + 1);
      assert.equal(after.commitCount, before.commitCount + 1);
      assert.equal(after.replayEntryCount, before.replayEntryCount + 1);
      assert.equal(after.historyLength, before.historyLength + expected.historyDelta);
      assert.notEqual(after.aggregateDigest, before.aggregateDigest);
    } else {
      throw new Error("BLD-018 unknown fixed effect expectation");
    }
    records.push(Object.freeze({ name, before, result: normalizedResult(result), after }));
  };

  let before = witness(core);
  let result = core.executeProjectDomainEffect(e1);
  record("commit", before, result, witness(core), {
    kind: "project-domain-history.committed",
    operation: "mutation",
    effect: "transition",
    historyDelta: 1,
  });
  before = witness(core);
  result = core.executeProjectDomainEffect(e1);
  record("exact-full-effect-replay", before, result, witness(core), {
    kind: "project-domain-history.committed",
    operation: "mutation",
    effect: "zero-authority-change",
  });
  before = witness(core);
  result = core.executeProjectDomainEffect(recreateEffect(e1, { commandLabel: "changed" }));
  record("full-effect-request-reuse-mismatch", before, result, witness(core), {
    kind: "project-domain-history.rejected",
    reason: "REQUEST_ID_REUSE_MISMATCH",
    effect: "zero-authority-change",
  });
  before = witness(core);
  result = core.executeProjectDomainEffect(e2);
  record("second-commit", before, result, witness(core), {
    kind: "project-domain-history.committed",
    operation: "mutation",
    effect: "transition",
    historyDelta: 1,
  });
  const stale = createBld018PropertyEffect(p2, p3, 10_003, 0, "fixed-stale");
  before = witness(core);
  result = core.executeProjectDomainEffect(stale);
  record("retained-stale-rejection", before, result, witness(core), {
    kind: "project-domain-history.rejected",
    reason: "STALE_WORKING_REVISION",
    effect: "replay-only",
  });

  for (const [name, command] of [
    ["undo", createBld018Navigation("history.undo", p0, 10_004, 2)],
    ["redo", createBld018Navigation("history.redo", p0, 10_005, 3)],
    ["undo-before-branch", createBld018Navigation("history.undo", p0, 10_006, 4)],
  ]) {
    before = witness(core);
    result = core.executeProjectHistoryNavigation(command);
    record(name, before, result, witness(core), {
      kind: "project-domain-history.committed",
      operation: name === "redo" ? "redo" : "undo",
      effect: "transition",
      historyDelta: 0,
    });
  }
  const branch = createBld018PropertyEffect(p1, branchProject, 10_007, 5, "fixed-branch");
  before = witness(core);
  result = core.executeProjectDomainEffect(branch);
  record("branch-replacement", before, result, witness(core), {
    kind: "project-domain-history.committed",
    operation: "mutation",
    effect: "transition",
    historyDelta: 0,
  });
  const capture = core.captureProjectWorkingRevision();

  const inverseCore = requireCore(p0);
  const inverseForged = {
    ...e1,
    inverseApplication: {
      ...e1.inverseApplication,
      replacementAggregateCanonicalJson: e1.afterAggregate.canonicalJson,
    },
  };
  before = witness(inverseCore);
  result = inverseCore.executeProjectDomainEffect(inverseForged);
  record("inverse-invalid-nonretained", before, result, witness(inverseCore), {
    kind: "project-domain-history.rejected",
    reason: "EFFECT_CONTRACT_INVALID",
    effect: "zero-authority-change",
  });

  const semanticCore = requireCore(p0);
  const semanticCreated = createProjectDomainEffect({
    sourceRequestId: "urn:rsrender:bld-018-fixed:semantic-invalid",
    sourceCommandCanonicalJson: canonicalizeJson({ kind: "semantic-invalid" }),
    sourceCommandIdentity: "urn:rsrender:command:semantic-invalid",
    commandLabel: "Semantic invalid",
    documentId: p0.documentIdentity,
    ownerGeneration: 17,
    expectedWorkingRevision: 0,
    beforeAggregateCanonicalJson: canonicalizeJson(p0),
    afterAggregateCanonicalJson: "{}",
    affectedIdentities: [p0.documentIdentity],
    invalidations: ["render-dataset"],
    eventResult: { resultCode: "SEMANTIC_INVALID", canonicalPayload: "{}" },
  });
  assert.equal(semanticCreated.accepted, true);
  before = witness(semanticCore);
  result = semanticCore.executeProjectDomainEffect(semanticCreated.value);
  record("semantic-invalid-retained", before, result, witness(semanticCore), {
    kind: "project-domain-history.rejected",
    reason: "AGGREGATE_CONTRACT_INVALID",
    effect: "replay-only",
  });

  const capacityCore = requireCore(p0, {
    replayEntries: 4,
    historyEntries: 4,
    commits: 1,
    events: 4,
    subscriptionBatch: 8,
  });
  capacityCore.executeProjectDomainEffect(e1);
  before = witness(capacityCore);
  result = capacityCore.executeProjectDomainEffect(e2);
  record("commit-capacity-retained", before, result, witness(capacityCore), {
    kind: "project-domain-history.rejected",
    reason: "CAPACITY_EXHAUSTED",
    effect: "replay-only",
  });

  const inertCore = requireCore(p0);
  const inert = recreateEffect(e1, {
    sourceRequestId: "urn:rsrender:bld-018-fixed:inert",
    sourceCommandCanonicalJson: canonicalizeJson({
      callback: "never execute",
      refresh: true,
      save: true,
      storage: { write: true },
    }),
    eventResult: {
      resultCode: "callback:never-dispatch",
      canonicalPayload: canonicalizeJson({ publish: true, refresh: true }),
    },
  });
  before = witness(inertCore);
  result = inertCore.executeProjectDomainEffect(inert);
  record("inert-metadata-commit", before, result, witness(inertCore), {
    kind: "project-domain-history.committed",
    operation: "mutation",
    effect: "transition",
    historyDelta: 1,
  });

  const concurrentCore = requireCore(p0);
  const c1 = createBld018PropertyEffect(p0, p1, 20_001, 0, "concurrent-one");
  const c2 = createBld018PropertyEffect(
    p0,
    createBld018NextProject(p0, 1, "concurrent-two"),
    20_002,
    0,
    "concurrent-two",
  );
  const concurrencyBefore = witness(concurrentCore);
  const concurrencyResults = await Promise.all([
    Promise.resolve().then(() => concurrentCore.executeProjectDomainEffect(c1)),
    Promise.resolve().then(() => concurrentCore.executeProjectDomainEffect(c2)),
  ]);
  assert.equal(
    concurrencyResults.filter((candidate) => candidate.kind === "project-domain-history.committed")
      .length,
    1,
  );
  assert.deepEqual(
    concurrencyResults
      .filter((candidate) => candidate.kind === "project-domain-history.rejected")
      .map((candidate) => candidate.reason),
    ["STALE_WORKING_REVISION"],
  );
  const concurrencyAfter = witness(concurrentCore);
  assert.equal(concurrencyAfter.workingRevision, concurrencyBefore.workingRevision + 1);
  assert.equal(concurrencyAfter.historyLength, concurrencyBefore.historyLength + 1);
  assert.equal(concurrencyAfter.eventCount, concurrencyBefore.eventCount + 1);
  assert.equal(concurrencyAfter.commitCount, concurrencyBefore.commitCount + 1);
  assert.equal(concurrencyAfter.replayEntryCount, concurrencyBefore.replayEntryCount + 2);
  assert.equal(capture.workingRevision, witness(core).workingRevision);
  assert.equal(capture.aggregateDigest, witness(core).aggregateDigest);
  assert.deepEqual(
    records.map(({ name }) => name),
    [
      "commit",
      "exact-full-effect-replay",
      "full-effect-request-reuse-mismatch",
      "second-commit",
      "retained-stale-rejection",
      "undo",
      "redo",
      "undo-before-branch",
      "branch-replacement",
      "inverse-invalid-nonretained",
      "semantic-invalid-retained",
      "commit-capacity-retained",
      "inert-metadata-commit",
    ],
  );
  assert.deepEqual(
    records.map(({ result: candidate }) => candidate.reason).filter((reason) => reason !== null),
    [
      "REQUEST_ID_REUSE_MISMATCH",
      "STALE_WORKING_REVISION",
      "EFFECT_CONTRACT_INVALID",
      "AGGREGATE_CONTRACT_INVALID",
      "CAPACITY_EXHAUSTED",
    ],
  );

  return Object.freeze({
    schema: "rsrender.bld-018-fixed-public-core-transcript.v1",
    records: Object.freeze(records),
    capture: Object.freeze({
      capturedRevisionIdentity: capture.capturedRevisionIdentity,
      workingRevision: capture.workingRevision,
      aggregateDigest: capture.aggregateDigest,
      aggregateCanonicalDigest: sha256CanonicalJson(JSON.parse(capture.aggregateCanonicalJson)),
    }),
    concurrency: Object.freeze({
      before: concurrencyBefore,
      results: concurrencyResults.map(normalizedResult),
      after: concurrencyAfter,
    }),
    rejectionReasons: Object.freeze(
      records.map(({ result: candidate }) => candidate.reason).filter((reason) => reason !== null),
    ),
    failures: Object.freeze([]),
  });
}

async function runFullRepetition() {
  const fixed = await runFixedTranscript();
  const summaries = bld018PropertySeeds.map((seed) =>
    runBld018PropertyModel(seed, bld018IterationsPerSeed),
  );
  for (const summary of summaries) {
    assert.equal(summary.iterations, bld018IterationsPerSeed);
    assert.equal(summary.invariantChecksPerInvariant, bld018IterationsPerSeed);
    assert.ok(summary.branchReplacementCount > 0);
  }
  const transcript = Object.freeze({
    schema: "rsrender.bld-018-project-domain-effect-vector-transcript.v1",
    runtime: Object.freeze({
      node: process.version,
      executableSha256,
      locale: runtimeLocale,
      timeZone: runtimeTimeZone,
    }),
    generatorRevision: bld018GeneratorRevision,
    oracleRevision: bld018OracleRevision,
    fixed,
    fixedDigest: sha256CanonicalJson(fixed),
    property: Object.freeze({
      seeds: bld018PropertySeeds,
      iterationsPerSeed: bld018IterationsPerSeed,
      cases: bld018PropertySeeds.length * bld018IterationsPerSeed,
      invariants: bld018PropertyInvariants,
      invariantEvaluations:
        bld018PropertySeeds.length * bld018IterationsPerSeed * bld018PropertyInvariants.length,
      summaries,
    }),
  });
  return Object.freeze({ transcript, digest: sha256CanonicalJson(transcript) });
}

const repetitions = Object.freeze([await runFullRepetition(), await runFullRepetition()]);
if (repetitions[0].digest !== repetitions[1].digest) throw new Error("BLD-018 repeat mismatch");
process.stdout.write(`${JSON.stringify({ repetitions })}\n`);
