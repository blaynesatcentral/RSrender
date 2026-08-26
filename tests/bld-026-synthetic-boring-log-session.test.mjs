import assert from "node:assert/strict";
import test from "node:test";

import {
  createSyntheticBoringLogOverrideSession,
  syntheticBoringLogOverrideSessionCapacities,
  syntheticBoringLogOverrideSessionRevision,
} from "../packages/application/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const documentIdentity = "urn:test:bld-026:document:boring-log-session-001";

function layoutJob() {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-026-editable-boring-log@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  };
}

function initialized() {
  const result = createSyntheticBoringLogOverrideSession({
    documentIdentity,
    ownerGeneration: 1,
    layoutJob: layoutJob(),
  });
  assert.equal(result.accepted, true, result.code);
  return result.session;
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

function setCommand(session, source, replacementContent) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "presentation-override.set-display-value",
    requestId: "urn:test:bld-026:command:set",
    commandId: "presentation-override.set-display-value",
    documentId: session.documentIdentity,
    ownerGeneration: session.ownerGeneration,
    expectedWorkingRevision: 0,
    payload: {
      localOverrideIdentity: "urn:test:bld-026:override:material-description",
      targetSourceFieldIdentity: source.sourceFieldIdentity,
      expectedSourceValueDigest: source.sourceBaselineValueDigest,
      expectedSourceValueType: source.sourceOriginal.valueType,
      expectedSourceUnit: source.sourceOriginal.unit,
      replacementContent,
      replacementUnit: source.sourceOriginal.unit,
      reason: "BLD-026 structured scene editing proof",
      authorIdentity: null,
      recordedAtUtc: "2026-08-21T20:32:00.000Z",
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

test("BLD-026 creates a structured source session with exact semantic edit bindings", async () => {
  assert.equal(
    syntheticBoringLogOverrideSessionRevision,
    "bld-026-synthetic-boring-log-override-session-v1",
  );
  assert.deepEqual(syntheticBoringLogOverrideSessionCapacities, {
    replayEntries: 128,
    historyEntries: 128,
    commits: 128,
    events: 128,
    subscriptionBatch: 128,
    collectionEntries: 256,
    commandReplayEntries: 128,
  });
  const session = initialized();
  assert.equal(Object.isFrozen(session), true);
  assert.equal(Object.isFrozen(session.bindings), true);
  assert.equal(session.bindings.length, 27);
  assert.equal(
    new Set(session.bindings.map(({ sourceFieldIdentity }) => sourceFieldIdentity)).size,
    27,
  );
  assert.deepEqual(
    Object.fromEntries(
      [
        "project-name",
        "boring-title",
        "material-description",
        "sample-recovery",
        "remark-text",
        "lithology-pattern-style",
        "description-column-width-mpt",
        "ground-elevation-ft",
        "elevation-datum",
        "completion-depth-ft",
      ].map((property) => [
        property,
        session.bindings.filter((binding) => binding.property === property).length,
      ]),
    ),
    {
      "project-name": 1,
      "boring-title": 1,
      "material-description": 3,
      "sample-recovery": 10,
      "remark-text": 7,
      "lithology-pattern-style": 1,
      "description-column-width-mpt": 1,
      "ground-elevation-ft": 1,
      "elevation-datum": 1,
      "completion-depth-ft": 1,
    },
  );
  const projection = await query(session, "urn:test:bld-026:query:initial");
  assert.equal(projection.kind, "render-dataset.projection.result");
  assert.equal(projection.projection.values.length, 82);
  const eligible = projection.projection.values.filter(
    ({ sourceOriginal }) => sourceOriginal.eligibility.state === "eligible",
  );
  assert.equal(eligible.length, 27);
  assert.deepEqual(
    new Set(eligible.map(({ sourceFieldIdentity }) => sourceFieldIdentity)),
    new Set(session.bindings.map(({ sourceFieldIdentity }) => sourceFieldIdentity)),
  );
});

test("BLD-026 commits, undoes, and redoes a material edit without changing its source original", async () => {
  const session = initialized();
  const initial = await query(session, "urn:test:bld-026:query:before");
  assert.equal(initial.kind, "render-dataset.projection.result");
  const binding = session.bindings.find(
    ({ semanticId, property }) =>
      semanticId === "lithology:stratum-01" && property === "material-description",
  );
  assert.ok(binding);
  const source = initial.projection.values.find(
    ({ sourceFieldIdentity }) => sourceFieldIdentity === binding.sourceFieldIdentity,
  );
  assert.ok(source);
  const sourceOriginal = structuredClone(source.sourceOriginal);
  const replacement = "Edited synthetic silt description";
  const set = await session.service.setDisplayValue(
    setCommand(session, source, {
      kind: "value",
      value: replacement,
      originalRepresentation: replacement,
    }),
  );
  assert.equal(set.kind, "override-render-dataset.committed");
  assert.equal(set.workingRevision, 1);
  const edited = set.projection.values.find(
    ({ sourceFieldIdentity }) => sourceFieldIdentity === binding.sourceFieldIdentity,
  );
  assert.equal(edited.sourceOriginal.canonicalJson, sourceOriginal.canonicalJson);
  assert.equal(edited.sourceOriginal.digest, sourceOriginal.digest);
  assert.equal(edited.effectiveDisplay.content.value, replacement);
  assert.equal(edited.effectiveDisplay.provenance.provenanceClass, "override");
  const undo = await session.service.undo(
    navigationCommand(session, "history.undo", "urn:test:bld-026:command:undo", 1),
  );
  assert.equal(undo.kind, "override-render-dataset.committed");
  assert.equal(undo.workingRevision, 2);
  const undone = undo.projection.values.find(
    ({ sourceFieldIdentity }) => sourceFieldIdentity === binding.sourceFieldIdentity,
  );
  assert.equal(undone.effectiveDisplay.content.value, sourceOriginal.content.value);
  const redo = await session.service.redo(
    navigationCommand(session, "history.redo", "urn:test:bld-026:command:redo", 2),
  );
  assert.equal(redo.kind, "override-render-dataset.committed");
  assert.equal(redo.workingRevision, 3);
  const redone = redo.projection.values.find(
    ({ sourceFieldIdentity }) => sourceFieldIdentity === binding.sourceFieldIdentity,
  );
  assert.equal(redone.effectiveDisplay.content.value, replacement);
  assert.equal(redone.sourceOriginal.canonicalJson, sourceOriginal.canonicalJson);
  assert.equal(redone.sourceOriginal.digest, sourceOriginal.digest);
});

test("BLD-026 boring-log source-session boundary rejects malformed or invalid configuration", () => {
  for (const [input, code] of [
    [null, "BORING_LOG_SESSION_CONFIGURATION_MALFORMED"],
    [
      { documentIdentity: "", ownerGeneration: 1, layoutJob: layoutJob() },
      "BORING_LOG_SESSION_DOCUMENT_IDENTITY_INVALID",
    ],
    [
      { documentIdentity, ownerGeneration: 0, layoutJob: layoutJob() },
      "BORING_LOG_SESSION_OWNER_GENERATION_INVALID",
    ],
    [
      { documentIdentity, ownerGeneration: 1, layoutJob: null },
      "BORING_LOG_SESSION_LAYOUT_JOB_INVALID",
    ],
  ]) {
    assert.deepEqual(createSyntheticBoringLogOverrideSession(input), { accepted: false, code });
  }
});
