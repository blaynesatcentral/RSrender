import assert from "node:assert/strict";
import test from "node:test";

import * as applicationExports from "../packages/application/dist/index.js";

import {
  advanceOverrideRenderDatasetProjectionReplica,
  createInMemoryOverrideRenderDatasetService,
  createOverrideRenderDatasetProjectionReplica,
} from "../packages/application/dist/index.js";
import {
  decodeOverrideRenderDatasetCommand,
  decodeOverrideRenderDatasetCommandResult,
  decodeOverrideRenderDatasetEvent,
  decodeOverrideRenderDatasetProjection,
  decodeOverrideRenderDatasetQueryResult,
  createOverrideRenderDatasetProjection,
  encodeOverrideRenderDatasetCommand,
} from "../packages/contracts/dist/index.js";
import {
  bld019Capacities,
  makeAggregateForDocument,
  makeUnsupportedInputAggregate,
  makeQuery,
  makeRedo,
  makeService,
  makeSetCommand,
  makeUndo,
  sourceSnapshotEncoding,
} from "./helpers/bld-019-fixtures.mjs";
import {
  makeCollection,
  makeOverride,
  makeRefreshedNameSnapshot,
} from "./helpers/bld-017-fixtures.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function committed(result) {
  assert.equal(result.kind, "override-render-dataset.committed");
  return result;
}

function rejected(result, reason) {
  assert.deepEqual(result, {
    contractVersion: 1,
    messageType: result.messageType,
    kind: "override-render-dataset.rejected",
    requestId: result.requestId,
    reason,
    changed: false,
    safeActions: [],
  });
  return result;
}

function assertSourceContinuity(projection, encodedSnapshot = sourceSnapshotEncoding()) {
  assert.equal(projection.sourceSnapshotIdentity, encodedSnapshot.value.snapshotIdentity);
  assert.equal(projection.sourceSnapshotLogicalDigest, encodedSnapshot.value.logicalDigest);
  assert.equal(projection.sourceSnapshotEncodingDigest, encodedSnapshot.digest);
  assert.equal(projection.sourceContextIdentity, encodedSnapshot.value.sourceContextIdentity);
  assert.equal(projection.sourceProjectIdentity, encodedSnapshot.value.sourceProjectIdentity);
}

function assertProjectionAuthorityEquals(actual, expected) {
  assert.equal(actual.datasetCanonicalJson, expected.datasetCanonicalJson);
  assert.equal(actual.datasetLogicalDigest, expected.datasetLogicalDigest);
  assert.equal(actual.datasetEncodingDigest, expected.datasetEncodingDigest);
  assert.equal(
    actual.presentationOverrideCollectionCanonicalJson,
    expected.presentationOverrideCollectionCanonicalJson,
  );
  assert.equal(
    actual.presentationOverrideCollectionDigest,
    expected.presentationOverrideCollectionDigest,
  );
  assert.deepEqual(actual.values, expected.values);
  assert.deepEqual(actual.overrides, expected.overrides);
}

function assertQueryMatchesCommitted(query, commandResult) {
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
    assert.equal(query[key], commandResult[key], key);
  }
  assert.deepEqual(query.projection, commandResult.projection);
}

test("closed command codec derives its canonical replay fingerprint and excludes caller-derived axes", () => {
  const command = makeSetCommand();
  const decoded = decodeOverrideRenderDatasetCommand(command);
  const encoded = encodeOverrideRenderDatasetCommand(command);
  assert.equal(decoded.accepted, true);
  assert.equal(encoded.accepted, true);
  assert.equal(Object.isFrozen(decoded.value), true);
  assert.equal(Object.isFrozen(decoded.value.payload), true);
  assert.equal(
    encodeOverrideRenderDatasetCommand(JSON.parse(encoded.canonicalJson)).digest,
    encoded.digest,
  );
  for (const forbidden of [
    "targetSourceContextIdentity",
    "targetSourceEntityIdentity",
    "replacementAssociation",
    "replacementFinality",
    "replacementEligibility",
    "enabled",
    "overrideRevision",
  ]) {
    const forged = clone(command);
    forged.payload[forbidden] = "urn:test:bld-019:forbidden";
    assert.equal(decodeOverrideRenderDatasetCommand(forged).accepted, false, forbidden);
  }
});

test("least-capable service facade has exactly four frozen own data-function keys", async () => {
  const service = makeService();
  assert.deepEqual(Reflect.ownKeys(service), ["setDisplayValue", "undo", "redo", "getProjection"]);
  assert.equal(Object.getPrototypeOf(service), Object.prototype);
  assert.equal(Object.isFrozen(service), true);
  for (const key of Reflect.ownKeys(service)) {
    const descriptor = Object.getOwnPropertyDescriptor(service, key);
    assert.equal(descriptor.enumerable, true);
    assert.equal("value" in descriptor, true);
    assert.equal(typeof descriptor.value, "function");
    assert.equal(Object.isFrozen(descriptor.value), true);
  }
  assert.equal("execute" in service, false);
  assert.equal("query" in service, false);
  const detached = service.getProjection;
  assert.equal((await detached(makeQuery())).kind, "render-dataset.projection.result");
});

test("initial full-refetch projection is source-original, clean, revision tagged, and immutable", async () => {
  const service = makeService();
  const beforeSource = sourceSnapshotEncoding();
  const result = await service.getProjection(makeQuery());
  assert.equal(result.kind, "render-dataset.projection.result");
  assert.equal(result.workingRevision, 0);
  assert.equal(result.durableRevision, 0);
  assert.equal(result.dirty, false);
  assert.equal(result.canUndo, false);
  assert.equal(result.canRedo, false);
  assert.equal(result.projection.presentationOverrideState, "empty");
  assert.equal(result.projection.overrides.length, 0);
  assert.equal(
    result.projection.values.every(
      (value) =>
        value.application.kind === "source" &&
        value.sourceOriginal.canonicalJson === value.effectiveDisplay.canonicalJson,
    ),
    true,
  );
  assert.deepEqual(sourceSnapshotEncoding(), beforeSource);
  assertSourceContinuity(result.projection, beforeSource);
  assert.equal(decodeOverrideRenderDatasetProjection(result.projection).accepted, true);
  assert.equal(Object.isFrozen(result.projection), true);
});

test("set creates one collection/history/event/revision and retains exact source bytes and provenance", async () => {
  const service = makeService();
  const sourceBefore = sourceSnapshotEncoding();
  const result = committed(await service.setDisplayValue(makeSetCommand()));
  assert.equal(result.operation, "mutation");
  assert.equal(result.previousWorkingRevision, 0);
  assert.equal(result.workingRevision, 1);
  assert.equal(result.durableRevision, 0);
  assert.equal(result.dirty, true);
  assert.equal(result.canUndo, true);
  assert.equal(result.canRedo, false);
  assert.equal(result.eventSequence, 1);
  assert.equal(result.projection.overrides.length, 1);
  const override = result.projection.overrides[0];
  assert.equal(override.enabled, true);
  assert.equal(override.reason, "Synthetic presentation replacement");
  assert.equal(override.replacementValue.provenance.provenanceClass, "override");
  const effective = result.projection.values.find(
    (value) => value.sourceFieldIdentity === override.targetSourceFieldIdentity,
  );
  assert.equal(effective.application.kind, "display-value-override");
  assert.equal(effective.effectiveDisplay.canonicalJson, override.replacementValue.canonicalJson);
  assert.equal(result.event.projection.projectionDigest, result.projection.projectionDigest);
  assert.deepEqual(sourceSnapshotEncoding(), sourceBefore);
  assertSourceContinuity(result.projection, sourceBefore);
  const refetched = await service.getProjection(
    makeQuery({ requestId: "urn:test:bld-019:query:after-set" }),
  );
  assertQueryMatchesCommitted(refetched, result);
  assertSourceContinuity(refetched.projection, sourceBefore);
  const repeated = await service.getProjection(
    makeQuery({ requestId: "urn:test:bld-019:query:after-set:repeat" }),
  );
  assert.deepEqual(repeated.projection, refetched.projection);
  assert.equal(repeated.workingRevision, refetched.workingRevision);
  assert.equal(repeated.eventSequence, refetched.eventSequence);
  assert.equal(decodeOverrideRenderDatasetCommandResult(result).accepted, true);
  assert.equal(decodeOverrideRenderDatasetEvent(result.event).accepted, true);
});

test("exact request replay returns byte-equal result and drift rejects without advancing", async () => {
  const service = makeService();
  const command = makeSetCommand();
  const first = committed(await service.setDisplayValue(command));
  const replay = await service.setDisplayValue(clone(command));
  assert.deepEqual(replay, first);
  rejected(
    await service.setDisplayValue(makeSetCommand({ replacementText: "DRIFT" })),
    "REQUEST_ID_REUSE_MISMATCH",
  );
  const query = await service.getProjection(makeQuery());
  assert.equal(query.workingRevision, 1);
  assert.equal(query.eventSequence, 1);
});

test("baseline, type, unit, rationale, target, and retarget failures are exact and non-mutating", async () => {
  const vectors = [
    [makeSetCommand({ expectedSourceValueDigest: `sha256:${"0".repeat(64)}` }), "INVALID_BASELINE"],
    [
      makeSetCommand({
        expectedSourceValueType: "number",
        replacementContent: { kind: "value", value: 7, originalRepresentation: "7" },
      }),
      "INVALID_VALUE_TYPE",
    ],
    [
      makeSetCommand({
        expectedSourceUnit: { state: "specified", quantity: "length", symbol: "m" },
        replacementUnit: { state: "specified", quantity: "length", symbol: "m" },
      }),
      "INVALID_UNIT",
    ],
    [makeSetCommand({ reason: "" }), "INVALID_RATIONALE"],
    [makeSetCommand({ reason: "   " }), "INVALID_RATIONALE"],
    [
      makeSetCommand({ targetSourceFieldIdentity: "urn:test:bld-019:missing-field" }),
      "TARGET_NOT_FOUND",
    ],
  ];
  for (let index = 0; index < vectors.length; index += 1) {
    const service = makeService();
    const [rawCommand, reason] = vectors[index];
    rawCommand.requestId = `urn:test:bld-019:negative:${index}`;
    rejected(await service.setDisplayValue(rawCommand), reason);
    const query = await service.getProjection(
      makeQuery({ requestId: `urn:test:bld-019:q:${index}` }),
    );
    assert.equal(query.workingRevision, 0);
    assert.equal(query.eventSequence, 0);
    assert.equal(query.projection.presentationOverrideState, "empty");
  }
  const retargetService = makeService();
  const first = committed(await retargetService.setDisplayValue(makeSetCommand()));
  const otherField = first.projection.values.find(
    (value) =>
      value.sourceFieldIdentity !== first.projection.overrides[0].targetSourceFieldIdentity,
  );
  rejected(
    await retargetService.setDisplayValue(
      makeSetCommand({
        requestId: "urn:test:bld-019:retarget",
        expectedWorkingRevision: 1,
        targetSourceFieldIdentity: otherField.sourceFieldIdentity,
        expectedSourceValueDigest: otherField.sourceOriginal.digest,
        expectedSourceValueType: otherField.sourceOriginal.valueType,
        expectedSourceUnit: otherField.sourceOriginal.unit,
        replacementContent: otherField.sourceOriginal.content,
        replacementUnit: otherField.sourceOriginal.unit,
      }),
    ),
    "DOMAIN_PRECONDITION_FAILED",
  );
});

test("semantic rejection replay is retained before reducer and remains exact after another commit", async () => {
  const service = makeService();
  const invalid = makeSetCommand({
    requestId: "urn:test:bld-019:retained-invalid",
    expectedSourceValueDigest: `sha256:${"1".repeat(64)}`,
  });
  const first = rejected(await service.setDisplayValue(invalid), "INVALID_BASELINE");
  committed(
    await service.setDisplayValue(
      makeSetCommand({ requestId: "urn:test:bld-019:valid-after-reject" }),
    ),
  );
  assert.deepEqual(await service.setDisplayValue(clone(invalid)), first);
  const drift = clone(invalid);
  drift.payload.reason = "changed";
  rejected(await service.setDisplayValue(drift), "REQUEST_ID_REUSE_MISMATCH");
});

test("wrong document, owner, stale revision, wrong named route, and minimum revision reject", async () => {
  const service = makeService();
  rejected(
    await service.setDisplayValue(
      makeSetCommand({ documentId: "urn:test:bld-019:document:other" }),
    ),
    "DOCUMENT_IDENTITY_MISMATCH",
  );
  rejected(
    await service.setDisplayValue(
      makeSetCommand({ requestId: "urn:test:bld-019:wrong-owner", ownerGeneration: 2 }),
    ),
    "OWNER_GENERATION_MISMATCH",
  );
  rejected(
    await service.setDisplayValue(
      makeSetCommand({ requestId: "urn:test:bld-019:stale", expectedWorkingRevision: 1 }),
    ),
    "STALE_WORKING_REVISION",
  );
  rejected(await service.undo(makeRedo()), "UNKNOWN_COMMAND");
  rejected(
    await service.getProjection(makeQuery({ minimumWorkingRevision: 1 })),
    "MINIMUM_WORKING_REVISION_UNAVAILABLE",
  );
  rejected(
    await service.getProjection(
      makeQuery({
        requestId: "urn:test:bld-019:query:wrong-document",
        documentId: "urn:test:bld-019:document:other",
      }),
    ),
    "DOCUMENT_IDENTITY_MISMATCH",
  );
  rejected(
    await service.getProjection(
      makeQuery({ requestId: "urn:test:bld-019:query:wrong-owner", ownerGeneration: 2 }),
    ),
    "OWNER_GENERATION_MISMATCH",
  );
});

test("initial Undo and Redo are retained no-change rejections", async () => {
  const service = makeService();
  const before = await service.getProjection(
    makeQuery({ requestId: "urn:test:bld-019:initial-nav:before" }),
  );
  const undo = makeUndo({
    requestId: "urn:test:bld-019:initial-nav:undo",
    expectedWorkingRevision: 0,
  });
  const redo = makeRedo({
    requestId: "urn:test:bld-019:initial-nav:redo",
    expectedWorkingRevision: 0,
  });
  const noUndo = rejected(await service.undo(undo), "NOTHING_TO_UNDO");
  const noRedo = rejected(await service.redo(redo), "NOTHING_TO_REDO");
  assert.deepEqual(await service.undo(clone(undo)), noUndo);
  assert.deepEqual(await service.redo(clone(redo)), noRedo);
  const after = await service.getProjection(
    makeQuery({ requestId: "urn:test:bld-019:initial-nav:after" }),
  );
  assert.equal(after.workingRevision, 0);
  assert.equal(after.eventSequence, 0);
  assertProjectionAuthorityEquals(after.projection, before.projection);
});

test("query preserves exact bounded assembler failures without mutating state", async () => {
  for (const collectionKind of [
    "supplemental-sources",
    "source-resolution-decisions",
    "source-extension-bindings",
  ]) {
    const service = makeService({
      aggregate: makeUnsupportedInputAggregate(collectionKind),
    });
    rejected(
      await service.getProjection(
        makeQuery({ requestId: `urn:test:bld-019:unsupported:${collectionKind}:one` }),
      ),
      "UNSUPPORTED_CURRENT_INPUT",
    );
    rejected(
      await service.getProjection(
        makeQuery({
          requestId: `urn:test:bld-019:unsupported:${collectionKind}:revision-witness`,
          minimumWorkingRevision: 1,
        }),
      ),
      "MINIMUM_WORKING_REVISION_UNAVAILABLE",
    );
    rejected(
      await service.getProjection(
        makeQuery({ requestId: `urn:test:bld-019:unsupported:${collectionKind}:two` }),
      ),
      "UNSUPPORTED_CURRENT_INPUT",
    );
  }
  const staleCollection = makeCollection([
    makeOverride({ expectedSourceValueDigest: `sha256:${"6".repeat(64)}` }),
  ]);
  const staleService = makeService({ collection: staleCollection });
  rejected(
    await staleService.getProjection(
      makeQuery({ requestId: "urn:test:bld-019:stale-current:one" }),
    ),
    "INVALID_BASELINE",
  );
  rejected(
    await staleService.getProjection(
      makeQuery({
        requestId: "urn:test:bld-019:stale-current:revision-witness",
        minimumWorkingRevision: 1,
      }),
    ),
    "MINIMUM_WORKING_REVISION_UNAVAILABLE",
  );
  rejected(
    await staleService.getProjection(
      makeQuery({ requestId: "urn:test:bld-019:stale-current:two" }),
    ),
    "INVALID_BASELINE",
  );
});

test("Undo and Redo each advance revision, restore exact projection, and remain revision-dirty", async () => {
  const service = makeService();
  const sourceBefore = sourceSnapshotEncoding();
  const initial = await service.getProjection(makeQuery());
  const edited = committed(await service.setDisplayValue(makeSetCommand()));
  const editedQuery = await service.getProjection(
    makeQuery({ requestId: "urn:test:bld-019:query:edited" }),
  );
  assertQueryMatchesCommitted(editedQuery, edited);
  const undone = committed(await service.undo(makeUndo()));
  assert.equal(undone.operation, "undo");
  assert.equal(undone.workingRevision, 2);
  assert.equal(undone.dirty, true);
  assert.equal(undone.canUndo, false);
  assert.equal(undone.canRedo, true);
  assert.equal(undone.projection.datasetLogicalDigest, initial.projection.datasetLogicalDigest);
  assert.equal(undone.projection.overrides.length, 0);
  const undoneQuery = await service.getProjection(
    makeQuery({ requestId: "urn:test:bld-019:query:undone" }),
  );
  assertQueryMatchesCommitted(undoneQuery, undone);
  const redone = committed(await service.redo(makeRedo()));
  assert.equal(redone.operation, "redo");
  assert.equal(redone.workingRevision, 3);
  assert.equal(redone.dirty, true);
  assert.equal(redone.canUndo, true);
  assert.equal(redone.canRedo, false);
  assert.equal(redone.projection.datasetLogicalDigest, edited.projection.datasetLogicalDigest);
  const redoneQuery = await service.getProjection(
    makeQuery({ requestId: "urn:test:bld-019:query:redone" }),
  );
  assertQueryMatchesCommitted(redoneQuery, redone);
  const redoneRepeatedQuery = await service.getProjection(
    makeQuery({ requestId: "urn:test:bld-019:query:redone:repeat" }),
  );
  assert.deepEqual(redoneRepeatedQuery.projection, redoneQuery.projection);
  assert.equal(redoneRepeatedQuery.workingRevision, redoneQuery.workingRevision);
  assert.equal(redoneRepeatedQuery.eventSequence, redoneQuery.eventSequence);
  for (const projection of [
    initial.projection,
    edited.projection,
    undone.projection,
    redone.projection,
  ]) {
    assertSourceContinuity(projection, sourceBefore);
  }
});

test("Undo then a new set replaces the abandoned branch and leaves Redo unavailable", async () => {
  const service = makeService();
  committed(await service.setDisplayValue(makeSetCommand()));
  committed(await service.undo(makeUndo()));
  const branch = committed(
    await service.setDisplayValue(
      makeSetCommand({
        requestId: "urn:test:bld-019:branch",
        expectedWorkingRevision: 2,
        replacementText: "SYNTHETIC-BRANCH",
        recordedAtUtc: "2026-08-20T12:00:01.000Z",
      }),
    ),
  );
  assert.equal(branch.workingRevision, 3);
  assert.equal(branch.canRedo, false);
  rejected(
    await service.redo(
      makeRedo({ requestId: "urn:test:bld-019:redo-abandoned", expectedWorkingRevision: 3 }),
    ),
    "NOTHING_TO_REDO",
  );
});

test("serialized concurrent same-revision edits produce one commit and one stale rejection", async () => {
  const service = makeService();
  const results = await Promise.all([
    service.setDisplayValue(makeSetCommand({ requestId: "urn:test:bld-019:concurrent:a" })),
    service.setDisplayValue(
      makeSetCommand({ requestId: "urn:test:bld-019:concurrent:b", replacementText: "B" }),
    ),
  ]);
  assert.equal(
    results.filter((result) => result.kind === "override-render-dataset.committed").length,
    1,
  );
  assert.equal(
    results.filter(
      (result) =>
        result.kind === "override-render-dataset.rejected" &&
        result.reason === "STALE_WORKING_REVISION",
    ).length,
    1,
  );
});

test("collection and replay capacities fail closed with no partial edit", async () => {
  const collectionLimited = makeService({
    capacities: { ...bld019Capacities, collectionEntries: 1 },
  });
  committed(await collectionLimited.setDisplayValue(makeSetCommand()));
  rejected(
    await collectionLimited.setDisplayValue(
      makeSetCommand({
        requestId: "urn:test:bld-019:collection-capacity",
        expectedWorkingRevision: 1,
        replacementText: "NEXT",
        recordedAtUtc: "2026-08-20T12:00:01.000Z",
      }),
    ),
    "CAPACITY_EXHAUSTED",
  );
  const projection = await collectionLimited.getProjection(makeQuery());
  assert.equal(projection.workingRevision, 1);

  const replayLimited = makeService({
    capacities: { ...bld019Capacities, commandReplayEntries: 1 },
  });
  rejected(
    await replayLimited.setDisplayValue(
      makeSetCommand({ requestId: "urn:test:bld-019:replay:first", reason: "" }),
    ),
    "INVALID_RATIONALE",
  );
  rejected(
    await replayLimited.setDisplayValue(
      makeSetCommand({ requestId: "urn:test:bld-019:replay:second" }),
    ),
    "CAPACITY_EXHAUSTED",
  );

  for (const capacityKey of ["replayEntries", "historyEntries", "commits", "events"]) {
    const service = makeService({
      capacities: { ...bld019Capacities, [capacityKey]: 1 },
    });
    const first = committed(
      await service.setDisplayValue(
        makeSetCommand({ requestId: `urn:test:bld-019:${capacityKey}:first` }),
      ),
    );
    rejected(
      await service.setDisplayValue(
        makeSetCommand({
          requestId: `urn:test:bld-019:${capacityKey}:second`,
          expectedWorkingRevision: 1,
          replacementText: `SECOND-${capacityKey}`,
          recordedAtUtc: "2026-08-20T12:00:02.000Z",
        }),
      ),
      "CAPACITY_EXHAUSTED",
    );
    const after = await service.getProjection(
      makeQuery({ requestId: `urn:test:bld-019:${capacityKey}:query` }),
    );
    assert.equal(after.workingRevision, 1, capacityKey);
    assert.equal(after.eventSequence, 1, capacityKey);
    assertProjectionAuthorityEquals(after.projection, first.projection);
  }
});

test("projection replica replaces whole validated projections and discards every untrusted mismatch", async () => {
  const service = makeService();
  const initial = await service.getProjection(makeQuery());
  const replica = createOverrideRenderDatasetProjectionReplica(initial);
  assert.equal(replica.accepted, true);
  const originalReplicaState = replica.state;
  const originalReplicaStateCanonical = JSON.stringify(replica.state);
  const edit = committed(await service.setDisplayValue(makeSetCommand()));
  const advanced = advanceOverrideRenderDatasetProjectionReplica(replica.state, edit.event);
  assert.equal(advanced.action, "applied");
  assert.deepEqual(advanced.state.projection, edit.projection);
  assert.deepEqual(advanced.state, {
    documentId: edit.documentId,
    ownerGeneration: edit.ownerGeneration,
    workingRevision: edit.workingRevision,
    eventSequence: edit.eventSequence,
    projection: edit.projection,
  });

  const beforeMismatch = clone(edit.event);
  beforeMismatch.beforeAggregateDigest = `sha256:${"f".repeat(64)}`;
  assert.deepEqual(advanceOverrideRenderDatasetProjectionReplica(replica.state, beforeMismatch), {
    action: "discard-and-refetch",
    reason: "BEFORE_AGGREGATE_DIGEST_MISMATCH",
    discardedState: null,
  });
  assert.equal(
    advanceOverrideRenderDatasetProjectionReplica(
      { ...replica.state, unexpected: true },
      edit.event,
    ).reason,
    "INVALID_REPLICA_STATE",
  );

  const otherDocumentService = makeService({
    aggregate: makeAggregateForDocument("urn:test:bld-019:document:other"),
  });
  const otherDocumentEvent = committed(
    await otherDocumentService.setDisplayValue(
      makeSetCommand({
        requestId: "urn:test:bld-019:other-document:event",
        documentId: "urn:test:bld-019:document:other",
      }),
    ),
  ).event;
  assert.equal(
    advanceOverrideRenderDatasetProjectionReplica(replica.state, otherDocumentEvent).reason,
    "DOCUMENT_IDENTITY_CHANGED",
  );

  const otherOwnerService = makeService({ ownerGeneration: 2 });
  const otherOwnerEvent = committed(
    await otherOwnerService.setDisplayValue(
      makeSetCommand({
        requestId: "urn:test:bld-019:other-owner:event",
        ownerGeneration: 2,
      }),
    ),
  ).event;
  assert.equal(
    advanceOverrideRenderDatasetProjectionReplica(replica.state, otherOwnerEvent).reason,
    "OWNER_GENERATION_CHANGED",
  );
  const gapService = makeService();
  const first = committed(await gapService.setDisplayValue(makeSetCommand()));
  const second = committed(
    await gapService.setDisplayValue(
      makeSetCommand({
        requestId: "urn:test:bld-019:gap:second",
        expectedWorkingRevision: 1,
        replacementText: "SECOND",
        recordedAtUtc: "2026-08-20T12:00:01.000Z",
      }),
    ),
  );
  assert.equal(first.event.eventSequence, 1);
  assert.deepEqual(advanceOverrideRenderDatasetProjectionReplica(replica.state, second.event), {
    action: "discard-and-refetch",
    reason: "EVENT_SEQUENCE_GAP",
    discardedState: null,
  });

  const skewedProjectionDraft = clone(replica.state.projection);
  delete skewedProjectionDraft.projectionIdentity;
  delete skewedProjectionDraft.projectionDigest;
  skewedProjectionDraft.eventSequence = 1;
  const skewedProjection = createOverrideRenderDatasetProjection(skewedProjectionDraft);
  assert.equal(skewedProjection.accepted, true);
  const skewedState = {
    ...replica.state,
    eventSequence: 1,
    projection: skewedProjection.value,
  };
  assert.equal(
    advanceOverrideRenderDatasetProjectionReplica(skewedState, second.event).reason,
    "BASE_WORKING_REVISION_MISMATCH",
  );

  const refreshedSnapshot = makeRefreshedNameSnapshot({ revision: 1 });
  const refreshedService = makeService({ sourceSnapshot: refreshedSnapshot });
  const refreshedEvent = clone(
    committed(
      await refreshedService.setDisplayValue(
        makeSetCommand({ requestId: "urn:test:bld-019:refreshed-source:event" }),
      ),
    ).event,
  );
  refreshedEvent.beforeAggregateDigest = replica.state.projection.aggregateDigest;
  assert.equal(decodeOverrideRenderDatasetEvent(refreshedEvent).accepted, true);
  assert.equal(
    advanceOverrideRenderDatasetProjectionReplica(replica.state, refreshedEvent).reason,
    "SOURCE_SNAPSHOT_CHANGED",
  );

  assert.equal(
    advanceOverrideRenderDatasetProjectionReplica(replica.state, { kind: "unknown" }).reason,
    "UNKNOWN_OR_MALFORMED_EVENT",
  );
  assert.equal(
    advanceOverrideRenderDatasetProjectionReplica(null, edit.event).reason,
    "NO_PROJECTION",
  );
  const relationalForgery = clone(edit.event);
  relationalForgery.afterAggregateDigest = `sha256:${"2".repeat(64)}`;
  assert.equal(
    advanceOverrideRenderDatasetProjectionReplica(replica.state, relationalForgery).reason,
    "UNKNOWN_OR_MALFORMED_EVENT",
  );
  const refetched = createOverrideRenderDatasetProjectionReplica(
    await service.getProjection(makeQuery({ requestId: "urn:test:bld-019:replica:full-refetch" })),
  );
  assert.equal(refetched.accepted, true);
  assert.deepEqual(refetched.state, advanced.state);
  assert.deepEqual(replica.state, originalReplicaState);
  assert.equal(JSON.stringify(replica.state), originalReplicaStateCanonical);
});

test("projection/result codecs reject relation, derived digest, cross-message, and policy-field forgeries", async () => {
  const service = makeService();
  const result = await service.getProjection(makeQuery());
  const dirty = clone(result);
  dirty.dirty = true;
  assert.equal(decodeOverrideRenderDatasetQueryResult(dirty).accepted, false);
  const dataset = clone(result);
  dataset.projection.datasetLogicalDigest = `sha256:${"0".repeat(64)}`;
  assert.equal(decodeOverrideRenderDatasetQueryResult(dataset).accepted, false);
  const reordered = clone(result.projection);
  delete reordered.projectionIdentity;
  delete reordered.projectionDigest;
  reordered.values.reverse();
  assert.equal(createOverrideRenderDatasetProjection(reordered).accepted, false);
  const impossiblePath = clone(result.projection);
  delete impossiblePath.projectionIdentity;
  delete impossiblePath.projectionDigest;
  impossiblePath.values[0].fieldPath = "mapped:/unsafe/../field";
  assert.equal(createOverrideRenderDatasetProjection(impossiblePath).accepted, false);
  const policy = clone(result);
  policy.projection.diagnosticFacts = [
    {
      factVersion: 1,
      code: "TEST.POLICY",
      category: "data",
      affected: { identityKind: "Field", identity: "urn:test:field" },
      cause: { causeKey: "test", evidenceClass: "test" },
      consequence: "conflict",
      input: { revision: "r1", digest: `sha256:${"0".repeat(64)}` },
      remediationActionIds: ["test.fix"],
      diagnosticIdentity: `sha256:${"0".repeat(64)}`,
      orderingKey: [],
      severity: "error",
    },
  ];
  assert.equal(decodeOverrideRenderDatasetQueryResult(policy).accepted, false);
  const queryRejection = await service.getProjection(makeQuery({ minimumWorkingRevision: 1 }));
  assert.equal(decodeOverrideRenderDatasetCommandResult(queryRejection).accepted, false);
});

test("hostile proxies, accessors, symbols, sparse arrays, and unsafe content are total and inert", async () => {
  const proxy = new Proxy(
    {},
    {
      getPrototypeOf() {
        throw new Error("forbidden");
      },
    },
  );
  assert.deepEqual(createInMemoryOverrideRenderDatasetService(proxy), {
    accepted: false,
    code: "INITIAL_CONFIGURATION_MALFORMED",
  });
  let getterCalls = 0;
  const hostile = Object.create(Object.prototype, {
    kind: {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("forbidden");
      },
    },
  });
  const service = makeService();
  rejected(await service.setDisplayValue(hostile), "CONTRACT_MALFORMED");
  assert.equal(getterCalls, 0);
  const symbol = makeSetCommand();
  symbol.payload[Symbol("hostile")] = true;
  rejected(await service.setDisplayValue(symbol), "CONTRACT_MALFORMED");
  const sparse = makeSetCommand();
  sparse.payload.replacementContent = { kind: "value", value: "x", originalRepresentation: "x" };
  sparse.payload.expectedSourceUnit = [];
  sparse.payload.expectedSourceUnit.length = 2;
  rejected(await service.setDisplayValue(sparse), "CONTRACT_MALFORMED");
  const unsafe = makeSetCommand();
  unsafe.payload.reason = "unsafe\u202Etext";
  rejected(await service.setDisplayValue(unsafe), "CONTRACT_MALFORMED");
  const zeroAsValue = makeSetCommand();
  zeroAsValue.payload.replacementContent = {
    kind: "value",
    value: 0,
    originalRepresentation: "0",
  };
  rejected(await service.setDisplayValue(zeroAsValue), "CONTRACT_MALFORMED");
  const extendedYear = makeSetCommand();
  extendedYear.payload.recordedAtUtc = "+010000-01-01T00:00:00.000Z";
  rejected(await service.setDisplayValue(extendedYear), "CONTRACT_MALFORMED");
  assert.equal("execute" in applicationExports, false);
  assert.equal("dispatch" in applicationExports, false);
  assert.equal("refresh" in applicationExports, false);
});

test("queued inputs are detached immediately and returned authority is deeply immutable", async () => {
  const service = makeService();
  const command = makeSetCommand({ requestId: "urn:test:bld-019:detached-input" });
  const pending = service.setDisplayValue(command);
  command.payload.reason = "MUTATED AFTER CALL";
  command.payload.replacementContent.value = "MUTATED AFTER CALL";
  const result = committed(await pending);
  assert.equal(result.projection.overrides[0].reason, "Synthetic presentation replacement");
  assert.equal(
    result.projection.overrides[0].replacementValue.content.value,
    "SYNTHETIC-OVERRIDDEN-EXPLORATION",
  );
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.projection), true);
  assert.equal(Object.isFrozen(result.projection.values), true);
  assert.equal(Object.isFrozen(result.projection.values[0]), true);
  assert.throws(() => {
    result.projection.values[0].application.kind = "source";
  }, TypeError);
  assert.throws(() => {
    result.projection.overrides.push(null);
  }, TypeError);
  const after = await service.getProjection(
    makeQuery({ requestId: "urn:test:bld-019:detached-output-query" }),
  );
  assertProjectionAuthorityEquals(after.projection, result.projection);
});
