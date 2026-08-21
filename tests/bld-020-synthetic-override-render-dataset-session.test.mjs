import assert from "node:assert/strict";
import test from "node:test";

import {
  createSyntheticOverrideRenderDatasetSession,
  syntheticOverrideRenderDatasetSessionCapacities,
  syntheticOverrideRenderDatasetSessionRevision,
} from "../packages/application/dist/index.js";

const documentIdentity = "urn:test:bld-020:document:synthetic-session-001";
const ownerGeneration = 1;

function initialized(input = { documentIdentity, ownerGeneration }) {
  const result = createSyntheticOverrideRenderDatasetSession(input);
  assert.equal(result.accepted, true, result.code);
  return result.session;
}

function rejected(input, code) {
  const result = createSyntheticOverrideRenderDatasetSession(input);
  assert.deepEqual(result, { accepted: false, code });
  assert.equal(Object.isFrozen(result), true);
}

function query(session, requestId, minimumWorkingRevision = null) {
  return session.service.getProjection({
    contractVersion: 1,
    messageType: "query",
    scope: "document-domain",
    kind: "render-dataset.get",
    requestId,
    documentId: session.documentIdentity,
    ownerGeneration: session.ownerGeneration,
    minimumWorkingRevision,
  });
}

function setCommand(session, source, requestId) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "presentation-override.set-display-value",
    requestId,
    commandId: "presentation-override.set-display-value",
    documentId: session.documentIdentity,
    ownerGeneration: session.ownerGeneration,
    expectedWorkingRevision: 0,
    payload: {
      localOverrideIdentity: "urn:test:bld-020:local-override:exploration-name",
      targetSourceFieldIdentity: source.sourceFieldIdentity,
      expectedSourceValueDigest: source.sourceBaselineValueDigest,
      expectedSourceValueType: source.sourceOriginal.valueType,
      expectedSourceUnit: source.sourceOriginal.unit,
      replacementContent: {
        kind: "value",
        value: "SYNTHETIC-EXPLORATION-001-OVERRIDE",
        originalRepresentation: "SYNTHETIC-EXPLORATION-001-OVERRIDE",
      },
      replacementUnit: source.sourceOriginal.unit,
      reason: "Synthetic packaged-route qualification",
      authorIdentity: null,
      recordedAtUtc: "2026-08-20T19:02:00.000Z",
    },
  };
}

function navigationCommand(session, kind, requestId, expectedWorkingRevision) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind,
    requestId,
    commandId: kind,
    documentId: session.documentIdentity,
    ownerGeneration: session.ownerGeneration,
    expectedWorkingRevision,
    payload: null,
  };
}

test("synthetic session bootstrap returns one least-capable frozen BLD-019 facade", async () => {
  assert.equal(
    syntheticOverrideRenderDatasetSessionRevision,
    "bld-020-synthetic-override-render-dataset-session-v1",
  );
  assert.deepEqual(syntheticOverrideRenderDatasetSessionCapacities, {
    replayEntries: 64,
    historyEntries: 64,
    commits: 64,
    events: 64,
    subscriptionBatch: 64,
    collectionEntries: 64,
    commandReplayEntries: 64,
  });
  assert.equal(Object.isFrozen(syntheticOverrideRenderDatasetSessionCapacities), true);
  const session = initialized();
  assert.deepEqual(Reflect.ownKeys(session), ["documentIdentity", "ownerGeneration", "service"]);
  assert.equal(Object.isFrozen(session), true);
  assert.equal(session.documentIdentity, documentIdentity);
  assert.equal(session.ownerGeneration, ownerGeneration);
  assert.deepEqual(Reflect.ownKeys(session.service), [
    "setDisplayValue",
    "undo",
    "redo",
    "getProjection",
  ]);
  assert.equal(Object.isFrozen(session.service), true);
  assert.equal("execute" in session.service, false);
  assert.equal("dispatch" in session.service, false);
  assert.equal("refresh" in session.service, false);
  const projection = await query(session, "urn:test:bld-020:query:initial");
  assert.equal(projection.kind, "render-dataset.projection.result");
  assert.equal(projection.workingRevision, 0);
  assert.equal(projection.durableRevision, 0);
  assert.equal(projection.dirty, false);
  assert.equal(projection.canUndo, false);
  assert.equal(projection.canRedo, false);
  assert.equal(projection.eventSequence, 0);
  assert.equal(projection.projection.presentationOverrideState, "empty");
  assert.equal(projection.projection.values.length, 2);
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.projection.values), true);
});

test("synthetic source custody survives set, Undo, Redo, and refetch", async () => {
  const session = initialized();
  const initial = await query(session, "urn:test:bld-020:query:before");
  assert.equal(initial.kind, "render-dataset.projection.result");
  const source = initial.projection.values.find(
    (value) => value.sourceOriginal.content.value === "SYNTHETIC-EXPLORATION-001",
  );
  assert.ok(source);
  assert.equal(source.sourceOriginal.provenance.provenanceClass, "source");
  assert.equal(source.sourceOriginal.provenance.adapterId, "rsrender.synthetic.read-only-adapter");
  const sourceWitness = {
    sourceContextIdentity: initial.projection.sourceContextIdentity,
    sourceProjectIdentity: initial.projection.sourceProjectIdentity,
    sourceSnapshotIdentity: initial.projection.sourceSnapshotIdentity,
    sourceSnapshotLogicalDigest: initial.projection.sourceSnapshotLogicalDigest,
    sourceSnapshotEncodingDigest: initial.projection.sourceSnapshotEncodingDigest,
    sourceOriginal: source.sourceOriginal,
  };
  const set = await session.service.setDisplayValue(
    setCommand(session, source, "urn:test:bld-020:command:set"),
  );
  assert.equal(set.messageType, "command-result");
  assert.equal(set.kind, "override-render-dataset.committed");
  assert.equal(set.operation, "mutation");
  assert.equal(set.workingRevision, 1);
  assert.equal(set.projection.presentationOverrideState, "current");
  const undo = await session.service.undo(
    navigationCommand(session, "history.undo", "urn:test:bld-020:command:undo", 1),
  );
  assert.equal(undo.kind, "override-render-dataset.committed");
  assert.equal(undo.operation, "undo");
  assert.equal(undo.workingRevision, 2);
  assert.equal(undo.projection.presentationOverrideState, "empty");
  const redo = await session.service.redo(
    navigationCommand(session, "history.redo", "urn:test:bld-020:command:redo", 2),
  );
  assert.equal(redo.kind, "override-render-dataset.committed");
  assert.equal(redo.operation, "redo");
  assert.equal(redo.workingRevision, 3);
  assert.equal(redo.projection.presentationOverrideState, "current");
  const refetched = await query(session, "urn:test:bld-020:query:after");
  assert.equal(refetched.kind, "render-dataset.projection.result");
  assert.equal(refetched.workingRevision, 3);
  const refetchedSource = refetched.projection.values.find(
    (value) => value.sourceFieldIdentity === source.sourceFieldIdentity,
  );
  assert.ok(refetchedSource);
  assert.deepEqual(
    {
      sourceContextIdentity: refetched.projection.sourceContextIdentity,
      sourceProjectIdentity: refetched.projection.sourceProjectIdentity,
      sourceSnapshotIdentity: refetched.projection.sourceSnapshotIdentity,
      sourceSnapshotLogicalDigest: refetched.projection.sourceSnapshotLogicalDigest,
      sourceSnapshotEncodingDigest: refetched.projection.sourceSnapshotEncodingDigest,
      sourceOriginal: refetchedSource.sourceOriginal,
    },
    sourceWitness,
  );
});

test("configuration boundary is strict, total, getter-safe, and requires positive generation", () => {
  rejected(null, "SYNTHETIC_SESSION_CONFIGURATION_MALFORMED");
  rejected([], "SYNTHETIC_SESSION_CONFIGURATION_MALFORMED");
  rejected({}, "SYNTHETIC_SESSION_CONFIGURATION_MALFORMED");
  rejected(
    { documentIdentity, ownerGeneration, extra: true },
    "SYNTHETIC_SESSION_CONFIGURATION_MALFORMED",
  );
  rejected(
    { documentIdentity: "", ownerGeneration },
    "SYNTHETIC_SESSION_DOCUMENT_IDENTITY_INVALID",
  );
  for (const invalid of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
    rejected(
      { documentIdentity, ownerGeneration: invalid },
      "SYNTHETIC_SESSION_OWNER_GENERATION_INVALID",
    );
  }
  const withSymbol = { documentIdentity, ownerGeneration };
  withSymbol[Symbol("hostile")] = true;
  rejected(withSymbol, "SYNTHETIC_SESSION_CONFIGURATION_MALFORMED");
  let getterCalls = 0;
  const withAccessor = { ownerGeneration };
  Object.defineProperty(withAccessor, "documentIdentity", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return documentIdentity;
    },
  });
  rejected(withAccessor, "SYNTHETIC_SESSION_CONFIGURATION_MALFORMED");
  assert.equal(getterCalls, 0);
  const revoked = Proxy.revocable({ documentIdentity, ownerGeneration }, {});
  revoked.revoke();
  rejected(revoked.proxy, "SYNTHETIC_SESSION_CONFIGURATION_MALFORMED");
});

test("accepted configuration is detached and deterministic without exposing aggregate authority", async () => {
  const input = { documentIdentity, ownerGeneration };
  const first = initialized(input);
  input.documentIdentity = "urn:test:bld-020:document:mutated";
  input.ownerGeneration = 9;
  assert.equal(first.documentIdentity, documentIdentity);
  assert.equal(first.ownerGeneration, ownerGeneration);
  const second = initialized();
  const [firstProjection, secondProjection] = await Promise.all([
    query(first, "urn:test:bld-020:query:detached:first"),
    query(second, "urn:test:bld-020:query:detached:second"),
  ]);
  assert.equal(firstProjection.kind, "render-dataset.projection.result");
  assert.equal(secondProjection.kind, "render-dataset.projection.result");
  assert.deepEqual(firstProjection.projection, secondProjection.projection);
  assert.equal("aggregate" in first, false);
  assert.equal("sourceSnapshot" in first, false);
  assert.equal("history" in first, false);
  assert.equal("collections" in first, false);
});
