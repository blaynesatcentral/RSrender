import assert from "node:assert/strict";

import {
  advanceOverrideRenderDatasetProjectionReplica,
  createOverrideRenderDatasetProjectionReplica,
} from "../../packages/application/dist/index.js";
import {
  decodeOverrideRenderDatasetCommand,
  sha256CanonicalJson,
} from "../../packages/contracts/dist/index.js";
import {
  makeQuery,
  makeService,
  makeSetCommand,
  sourceSnapshotEncoding,
} from "./bld-019-fixtures.mjs";
import { bld017MinimalPropertySnapshot } from "./bld-017-fixtures.mjs";

export const bld019PropertySeeds = Object.freeze([0x1900_0001, 0x1900_0002, 0x1900_0003]);
export const bld019IterationsPerSeed = 1_000;
export const bld019GeneratorRevision = "bld-019-override-render-dataset-generator-v1";
export const bld019OracleRevision = "bld-019-override-render-dataset-oracle-v1";
export const bld019PropertyInvariants = Object.freeze([
  "command-precondition",
  "replay-revision",
  "baseline",
  "projection-replica",
  "atomicity",
  "source-immutability",
]);

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0;
    return value;
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireCommitted(result) {
  assert.equal(result.kind, "override-render-dataset.committed");
  return result;
}

function requireRejected(result, reason) {
  assert.equal(result.kind, "override-render-dataset.rejected");
  assert.equal(result.reason, reason);
  assert.equal(result.changed, false);
  return result;
}

function projectionWitness(projection) {
  return Object.freeze({
    projectionDigest: projection.projectionDigest,
    datasetLogicalDigest: projection.datasetLogicalDigest,
    datasetEncodingDigest: projection.datasetEncodingDigest,
    collectionDigest: projection.presentationOverrideCollectionDigest,
    sourceSnapshotIdentity: projection.sourceSnapshotIdentity,
    sourceSnapshotLogicalDigest: projection.sourceSnapshotLogicalDigest,
    sourceSnapshotEncodingDigest: projection.sourceSnapshotEncodingDigest,
    valuesDigest: sha256CanonicalJson(projection.values),
    overridesDigest: sha256CanonicalJson(projection.overrides),
  });
}

export async function runBld019PropertyModel(seed, iterations = bld019IterationsPerSeed) {
  const random = rng(seed);
  const counters = {
    commandPrecondition: 0,
    replayRevision: 0,
    baseline: 0,
    projectionReplica: 0,
    atomicity: 0,
    sourceImmutability: 0,
  };
  const sourceEncoding = sourceSnapshotEncoding(bld017MinimalPropertySnapshot);
  const baselineCommand = makeSetCommand({
    requestId: `urn:test:bld-019:property:${seed}:baseline`,
  });
  const authoritativeBaselineDigest = baselineCommand.payload.expectedSourceValueDigest;

  for (let index = 0; index < iterations; index += 1) {
    const command = makeSetCommand({
      requestId: `urn:test:bld-019:property:${seed}:precondition:${index}`,
    });
    switch (random() % 7) {
      case 0:
        command.contractVersion = 2;
        break;
      case 1:
        command.commandId = "history.undo";
        break;
      case 2:
        command.payload.untrustedDerivedAxis = true;
        break;
      case 3:
        command.payload.reason = `unsafe\u202E${index}`;
        break;
      case 4:
        command.payload.recordedAtUtc = "+010000-01-01T00:00:00.000Z";
        break;
      case 5:
        command.payload.replacementContent = {
          kind: "value",
          value: 0,
          originalRepresentation: "0",
        };
        break;
      default:
        command.payload.expectedSourceUnit = [];
        command.payload.expectedSourceUnit.length = 2;
        break;
    }
    assert.equal(decodeOverrideRenderDatasetCommand(command).accepted, false);
    counters.commandPrecondition += 1;
  }

  const replayService = makeService({
    sourceSnapshot: bld017MinimalPropertySnapshot,
    capacities: {
      replayEntries: iterations + 16,
      historyEntries: 16,
      commits: 16,
      events: 16,
      subscriptionBatch: 16,
      collectionEntries: 16,
      commandReplayEntries: iterations + 16,
    },
  });
  const replayCommand = makeSetCommand({
    requestId: `urn:test:bld-019:property:${seed}:replay`,
  });
  const committed = requireCommitted(await replayService.setDisplayValue(replayCommand));
  const committedSourceWitness = Object.freeze({
    snapshotIdentity: committed.projection.sourceSnapshotIdentity,
    logicalDigest: committed.projection.sourceSnapshotLogicalDigest,
    encodingDigest: committed.projection.sourceSnapshotEncodingDigest,
    sourceContextIdentity: committed.projection.sourceContextIdentity,
    sourceProjectIdentity: committed.projection.sourceProjectIdentity,
  });
  for (let index = 0; index < iterations; index += 1) {
    const replayed = await replayService.setDisplayValue(clone(replayCommand));
    assert.deepEqual(replayed, committed);
    assert.deepEqual(
      Object.freeze({
        snapshotIdentity: replayed.projection.sourceSnapshotIdentity,
        logicalDigest: replayed.projection.sourceSnapshotLogicalDigest,
        encodingDigest: replayed.projection.sourceSnapshotEncodingDigest,
        sourceContextIdentity: replayed.projection.sourceContextIdentity,
        sourceProjectIdentity: replayed.projection.sourceProjectIdentity,
      }),
      committedSourceWitness,
    );
    assert.equal(replayed.projection.sourceSnapshotEncodingDigest, sourceEncoding.digest);
    assert.equal(
      replayed.projection.sourceSnapshotLogicalDigest,
      sourceEncoding.value.logicalDigest,
    );
    assert.equal(replayed.projection.sourceSnapshotIdentity, sourceEncoding.value.snapshotIdentity);
    assert.equal(
      replayed.projection.sourceContextIdentity,
      sourceEncoding.value.sourceContextIdentity,
    );
    assert.equal(
      replayed.projection.sourceProjectIdentity,
      sourceEncoding.value.sourceProjectIdentity,
    );
    assert.equal(
      sha256CanonicalJson(JSON.parse(sourceEncoding.canonicalJson)),
      sourceEncoding.digest,
    );
    counters.sourceImmutability += 1;
  }
  const replayQuery = await replayService.getProjection(
    makeQuery({ requestId: `urn:test:bld-019:property:${seed}:replay-query` }),
  );
  assert.equal(replayQuery.workingRevision, 1);
  assert.equal(replayQuery.eventSequence, 1);

  const staleService = makeService({
    sourceSnapshot: bld017MinimalPropertySnapshot,
    capacities: {
      replayEntries: iterations + 16,
      historyEntries: 16,
      commits: 16,
      events: 16,
      subscriptionBatch: 16,
      collectionEntries: 16,
      commandReplayEntries: iterations + 16,
    },
  });
  const staleCommand = makeSetCommand({
    requestId: `urn:test:bld-019:property:${seed}:stale`,
    expectedWorkingRevision: 1,
  });
  const stale = requireRejected(
    await staleService.setDisplayValue(staleCommand),
    "STALE_WORKING_REVISION",
  );
  for (let index = 0; index < iterations; index += 1) {
    assert.deepEqual(await staleService.setDisplayValue(clone(staleCommand)), stale);
    counters.replayRevision += 1;
  }

  const invalidBaselineService = makeService({
    sourceSnapshot: bld017MinimalPropertySnapshot,
    capacities: {
      replayEntries: iterations + 16,
      historyEntries: 16,
      commits: 16,
      events: 16,
      subscriptionBatch: 16,
      collectionEntries: 16,
      commandReplayEntries: iterations + 16,
    },
  });
  const invalidBaselineBefore = await invalidBaselineService.getProjection(
    makeQuery({ requestId: `urn:test:bld-019:property:${seed}:baseline-before` }),
  );
  for (let index = 0; index < iterations; index += 1) {
    const differentDigest = `sha256:${((random() ^ index) >>> 0)
      .toString(16)
      .padStart(8, "0")}${"0".repeat(56)}`;
    assert.notEqual(differentDigest, authoritativeBaselineDigest);
    const command = makeSetCommand({
      requestId: `urn:test:bld-019:property:${seed}:baseline:${index}`,
      expectedSourceValueDigest: differentDigest,
    });
    const decoded = decodeOverrideRenderDatasetCommand(command);
    assert.equal(decoded.accepted, true);
    assert.notEqual(decoded.value.payload.expectedSourceValueDigest, authoritativeBaselineDigest);
    requireRejected(await invalidBaselineService.setDisplayValue(command), "INVALID_BASELINE");
    counters.baseline += 1;
  }
  const invalidBaselineAfter = await invalidBaselineService.getProjection(
    makeQuery({ requestId: `urn:test:bld-019:property:${seed}:baseline-after` }),
  );
  for (const key of [
    "documentId",
    "ownerGeneration",
    "workingRevision",
    "durableRevision",
    "dirty",
    "canUndo",
    "canRedo",
    "eventSequence",
  ]) {
    assert.equal(invalidBaselineAfter[key], invalidBaselineBefore[key], key);
  }
  assert.deepEqual(invalidBaselineAfter.projection, invalidBaselineBefore.projection);

  const replicaService = makeService({ sourceSnapshot: bld017MinimalPropertySnapshot });
  const initialQuery = await replicaService.getProjection(
    makeQuery({ requestId: `urn:test:bld-019:property:${seed}:replica-initial` }),
  );
  const replica = createOverrideRenderDatasetProjectionReplica(initialQuery);
  assert.equal(replica.accepted, true);
  const replicaStateWitness = replica.state;
  const replicaStateCanonicalWitness = JSON.stringify(replica.state);
  const replicaEdit = requireCommitted(
    await replicaService.setDisplayValue(
      makeSetCommand({ requestId: `urn:test:bld-019:property:${seed}:replica-edit` }),
    ),
  );
  for (let index = 0; index < iterations; index += 1) {
    const event = clone(replicaEdit.event);
    if (index % 2 === 0) {
      event.eventSequence += 1 + (random() % 7);
    } else {
      event.beforeAggregateDigest = `sha256:${(random() >>> 0)
        .toString(16)
        .padStart(8, "0")}${"1".repeat(56)}`;
    }
    const result = advanceOverrideRenderDatasetProjectionReplica(replica.state, event);
    assert.equal(result.action, "discard-and-refetch");
    assert.equal(result.discardedState, null);
    assert.deepEqual(replica.state, replicaStateWitness);
    assert.equal(JSON.stringify(replica.state), replicaStateCanonicalWitness);
    counters.projectionReplica += 1;
  }

  const atomicService = makeService({ sourceSnapshot: bld017MinimalPropertySnapshot });
  const atomicBefore = await atomicService.getProjection(
    makeQuery({ requestId: `urn:test:bld-019:property:${seed}:atomic-before` }),
  );
  const beforeWitness = projectionWitness(atomicBefore.projection);
  for (let index = 0; index < iterations; index += 1) {
    const malformed = makeSetCommand({
      requestId: `urn:test:bld-019:property:${seed}:atomic:${index}`,
    });
    malformed.payload[`untrusted-${random()}`] = index;
    requireRejected(await atomicService.setDisplayValue(malformed), "CONTRACT_MALFORMED");
    counters.atomicity += 1;
  }
  const atomicAfter = await atomicService.getProjection(
    makeQuery({ requestId: `urn:test:bld-019:property:${seed}:atomic-after` }),
  );
  for (const key of [
    "documentId",
    "ownerGeneration",
    "workingRevision",
    "durableRevision",
    "dirty",
    "canUndo",
    "canRedo",
    "eventSequence",
  ]) {
    assert.equal(atomicAfter[key], atomicBefore[key], key);
  }
  assert.deepEqual(atomicAfter.projection, atomicBefore.projection);
  assert.deepEqual(projectionWitness(atomicAfter.projection), beforeWitness);

  const sourceWitness = Object.freeze({
    snapshotIdentity: sourceEncoding.value.snapshotIdentity,
    logicalDigest: sourceEncoding.value.logicalDigest,
    encodingDigest: sourceEncoding.digest,
    canonicalDigest: sha256CanonicalJson(JSON.parse(sourceEncoding.canonicalJson)),
  });
  assert.deepEqual(
    Object.freeze({
      snapshotIdentity: committed.projection.sourceSnapshotIdentity,
      logicalDigest: committed.projection.sourceSnapshotLogicalDigest,
      encodingDigest: committed.projection.sourceSnapshotEncodingDigest,
      canonicalDigest: sha256CanonicalJson(JSON.parse(sourceEncoding.canonicalJson)),
    }),
    sourceWitness,
  );

  for (const count of Object.values(counters)) assert.equal(count, iterations);

  return Object.freeze({
    seed,
    iterations,
    invariantChecks: Object.freeze({ ...counters }),
    finalReplayProjectionDigest: replayQuery.projection.projectionDigest,
    atomicProjectionDigest: atomicAfter.projection.projectionDigest,
    sourceSnapshotIdentity: sourceWitness.snapshotIdentity,
    sourceSnapshotLogicalDigest: sourceWitness.logicalDigest,
    sourceSnapshotEncodingDigest: sourceWitness.encodingDigest,
    failures: Object.freeze([]),
  });
}
