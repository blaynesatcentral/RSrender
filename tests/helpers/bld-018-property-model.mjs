import assert from "node:assert/strict";

import { createInMemoryPhase1ProjectHistoryCore } from "../../packages/application/dist/index.js";
import {
  canonicalizeJson,
  createProjectDomainEffect,
  sha256Utf8,
} from "../../packages/contracts/dist/index.js";
import { emptyPhase1Project, withCurrentHandle } from "./bld-016-fixtures.mjs";

export const bld018PropertySeeds = Object.freeze([0x1800_0001, 0x1800_0002, 0x1800_0003]);
export const bld018IterationsPerSeed = 1_000;
export const bld018GeneratorRevision = "bld-018-project-effect-history-generator-v1";
export const bld018OracleRevision = "bld-018-project-effect-history-oracle-v1";
export const bld018PropertyInvariants = Object.freeze([
  "atomicity",
  "full-effect-replay",
  "monotonic-revision-event",
  "bounded-capacity-no-eviction",
  "undo-redo-branch-model",
]);

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0;
    return value;
  };
}

function requireAccepted(result) {
  assert.equal(result.accepted, true);
  return result.value;
}

export function createBld018NextProject(project, revision, marker) {
  return withCurrentHandle(
    project,
    "presentation-overrides",
    revision,
    sha256Utf8(`bld-018-property:${marker}`),
  );
}

export function createBld018PropertyEffect(before, after, requestIndex, workingRevision, marker) {
  const sourceRequestId = `urn:rsrender:bld-018-property-request:${requestIndex}`;
  const sourceCommandCanonicalJson = canonicalizeJson({
    contractVersion: 1,
    kind: "bld-018.property-mutation",
    payload: { marker },
    requestId: sourceRequestId,
  });
  return requireAccepted(
    createProjectDomainEffect({
      sourceRequestId,
      sourceCommandCanonicalJson,
      sourceCommandIdentity: "urn:rsrender:command:bld-018.property-mutation",
      commandLabel: `Property mutation ${marker}`,
      documentId: before.documentIdentity,
      ownerGeneration: 17,
      expectedWorkingRevision: workingRevision,
      beforeAggregateCanonicalJson: canonicalizeJson(before),
      afterAggregateCanonicalJson: canonicalizeJson(after),
      affectedIdentities: [before.documentIdentity],
      invalidations: ["render-dataset"],
      eventResult: {
        resultCode: "BLD_018_PROPERTY_MUTATION",
        canonicalPayload: canonicalizeJson({ marker }),
      },
    }),
  );
}

export function createBld018Navigation(kind, project, requestIndex, workingRevision) {
  return Object.freeze({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind,
    requestId: `urn:rsrender:bld-018-property-${kind}:${requestIndex}`,
    commandId: kind,
    documentId: project.documentIdentity,
    ownerGeneration: 17,
    expectedWorkingRevision: workingRevision,
    payload: null,
  });
}

function snapshotWitness(snapshot) {
  return Object.freeze({
    aggregateCanonicalJson: snapshot.aggregateCanonicalJson,
    workingRevision: snapshot.workingRevision,
    historyCursor: snapshot.historyCursor,
    historyLength: snapshot.historyLength,
    eventCount: snapshot.events.length,
    replayEntryCount: snapshot.replayEntryCount,
    commitCount: snapshot.commitCount,
  });
}

export function runBld018PropertyModel(seed, iterations = bld018IterationsPerSeed) {
  const random = rng(seed);
  const initial = emptyPhase1Project();
  const created = createInMemoryPhase1ProjectHistoryCore({
    aggregate: initial,
    ownerGeneration: 17,
    capacities: {
      replayEntries: iterations + 8,
      historyEntries: iterations + 1,
      commits: iterations + 1,
      events: iterations + 1,
      subscriptionBatch: 8,
    },
  });
  assert.equal(created.accepted, true);
  const core = created.core;
  let current = initial;
  let workingRevision = 0;
  let serial = 1;
  let cursor = 0;
  let modelHistory = [];
  let mutationCount = 0;
  let undoCount = 0;
  let redoCount = 0;
  let branchReplacementCount = 0;

  for (let index = 0; index < iterations; index += 1) {
    const priorSnapshot = core.inspectProject();
    const priorSnapshotWitness = snapshotWitness(priorSnapshot);
    const roll = random() % 100;
    let replayKind;
    if (roll < 20 && cursor > 0) {
      const command = createBld018Navigation("history.undo", current, index, workingRevision);
      const transitioned = core.executeProjectHistoryNavigation(command);
      assert.equal(transitioned.kind, "project-domain-history.committed");
      cursor -= 1;
      current = modelHistory[cursor].before;
      undoCount += 1;
      const replay = core.executeProjectHistoryNavigation(command);
      assert.deepEqual(replay, transitioned);
      replayKind = "replayed";
    } else if (roll < 35 && cursor < modelHistory.length) {
      const command = createBld018Navigation("history.redo", current, index, workingRevision);
      const transitioned = core.executeProjectHistoryNavigation(command);
      assert.equal(transitioned.kind, "project-domain-history.committed");
      current = modelHistory[cursor].after;
      cursor += 1;
      redoCount += 1;
      const replay = core.executeProjectHistoryNavigation(command);
      assert.deepEqual(replay, transitioned);
      replayKind = "replayed";
    } else {
      const after = createBld018NextProject(current, serial, `${seed}:${index}:${random()}`);
      const candidate = createBld018PropertyEffect(
        current,
        after,
        index,
        workingRevision,
        `${seed}:${index}`,
      );
      const prepared = core.prepareProjectDomainEffect(candidate);
      assert.equal(prepared.kind, "ready");
      assert.deepEqual(snapshotWitness(core.inspectProject()), priorSnapshotWitness);
      const transitioned = core.commitPreparedProjectDomainEffect(prepared.prepared);
      assert.equal(transitioned.kind, "project-domain-history.committed");
      if (cursor < modelHistory.length) branchReplacementCount += 1;
      modelHistory = [...modelHistory.slice(0, cursor), { before: current, after }];
      cursor += 1;
      current = after;
      serial += 1;
      mutationCount += 1;
      replayKind = core.prepareProjectDomainEffect(candidate).kind;
    }

    workingRevision += 1;
    const snapshot = core.inspectProject();
    assert.deepEqual(snapshotWitness(priorSnapshot), priorSnapshotWitness);
    assert.equal(snapshot.workingRevision, workingRevision);
    assert.equal(snapshot.events.length, workingRevision);
    assert.equal(snapshot.commitCount, workingRevision);
    assert.equal(snapshot.replayEntryCount, workingRevision);
    assert.equal(snapshot.historyCursor, cursor);
    assert.equal(snapshot.historyLength, modelHistory.length);
    assert.equal(snapshot.aggregateDigest, sha256Utf8(canonicalizeJson(current)));
    assert.equal(snapshot.canUndo, cursor > 0);
    assert.equal(snapshot.canRedo, cursor < modelHistory.length);
    assert.ok(snapshot.replayEntryCount <= iterations + 8);
    assert.ok(snapshot.historyLength <= iterations + 1);
    assert.ok(snapshot.events.length <= iterations + 1);
    assert.equal(replayKind, "replayed");
    assert.deepEqual(snapshotWitness(core.inspectProject()), snapshotWitness(snapshot));
  }

  assert.equal(mutationCount + undoCount + redoCount, iterations);
  assert.ok(mutationCount > 0);
  assert.ok(undoCount > 0);
  assert.ok(redoCount > 0);
  assert.ok(branchReplacementCount > 0);

  return Object.freeze({
    seed,
    iterations,
    finalAggregateDigest: core.inspectProject().aggregateDigest,
    finalWorkingRevision: workingRevision,
    finalHistoryCursor: cursor,
    finalHistoryLength: modelHistory.length,
    mutationCount,
    undoCount,
    redoCount,
    branchReplacementCount,
    invariantChecksPerInvariant: iterations,
  });
}
