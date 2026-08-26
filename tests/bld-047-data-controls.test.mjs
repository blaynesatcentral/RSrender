import assert from "node:assert/strict";
import test from "node:test";

import { createSyntheticBoringLogOverrideSession } from "../packages/application/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import {
  completeBoringLogStudioProjection,
  prepareBoringLogStudioProjection,
} from "../packages/platform-electron-main/dist/index.js";
import { strictCoverageTextResults } from "./helpers/bld-033-strict-text-authority.mjs";

const documentIdentity = "urn:test:bld-047:document:data-controls-001";

function layoutJob() {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-047-data-controls@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  };
}

async function dataset(session, requestId) {
  const result = await session.service.getProjection({
    contractVersion: 1,
    messageType: "query",
    scope: "document-domain",
    kind: "render-dataset.get",
    requestId,
    documentId: documentIdentity,
    ownerGeneration: 1,
    minimumWorkingRevision: null,
  });
  assert.equal(result.kind, "render-dataset.projection.result");
  return result.projection;
}

function studioProjection(session, projection) {
  const prepared = prepareBoringLogStudioProjection({
    layoutJob: session.layoutJob,
    bindings: session.bindings,
    dataset: projection,
  });
  assert.equal(prepared.accepted, true, prepared.code);
  const complete = completeBoringLogStudioProjection(
    prepared.preparation,
    strictCoverageTextResults(prepared.preparation.layout.textRequests),
  );
  assert.equal(complete.accepted, true, complete.code);
  return complete.projection;
}

function setCommand(projection, editable, replacementContent) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "presentation-override.set-display-value",
    requestId: `urn:test:bld-047:data-control:${editable.property}`,
    commandId: "presentation-override.set-display-value",
    documentId: documentIdentity,
    ownerGeneration: 1,
    expectedWorkingRevision: projection.workingRevision,
    payload: {
      localOverrideIdentity: `urn:test:bld-047:override:${editable.property}`,
      targetSourceFieldIdentity: editable.sourceFieldIdentity,
      expectedSourceValueDigest: editable.sourceBaselineValueDigest,
      expectedSourceValueType: editable.sourceOriginal.valueType,
      expectedSourceUnit: editable.sourceOriginal.unit,
      replacementContent,
      replacementUnit: editable.unit,
      reason: "BLD-047 Data controls",
      authorIdentity: null,
      recordedAtUtc: "2026-08-24T00:00:00.000Z",
    },
  };
}

test("BLD-047 Data controls use project-owned overrides, preserve source digest, and update the scene", async () => {
  const created = createSyntheticBoringLogOverrideSession({
    documentIdentity,
    ownerGeneration: 1,
    layoutJob: layoutJob(),
  });
  assert.equal(created.accepted, true, created.code);
  const session = created.session;
  const initialDataset = await dataset(session, "urn:test:bld-047:query:initial");
  const initial = studioProjection(session, initialDataset);
  const editable = initial.editableValues.find(
    ({ property }) => property === "ground-elevation-ft",
  );
  assert.ok(editable);
  assert.equal(
    initial.dataSummary.groundElevationFt,
    boringLogMvpFixture.metadata.groundElevationFt,
  );
  const sourceDigest = initialDataset.sourceSnapshotLogicalDigest;

  const committed = await session.service.setDisplayValue(
    setCommand(initialDataset, editable, {
      kind: "value",
      value: 987.6,
      originalRepresentation: "987.6",
    }),
  );
  assert.equal(committed.kind, "override-render-dataset.committed");
  const changedDataset = await dataset(session, "urn:test:bld-047:query:changed");
  assert.equal(changedDataset.sourceSnapshotLogicalDigest, sourceDigest);
  const changed = studioProjection(session, changedDataset);
  assert.equal(changed.dataSummary.groundElevationFt, 987.6);
  const metadataValue = changed.scene.pages[0].nodes.find(
    ({ id }) => id === "node:header-project-metadata:4:value",
  );
  assert.equal(metadataValue?.kind, "text");
  assert.equal(metadataValue?.content, `987.6 ft · ${boringLogMvpFixture.metadata.elevationDatum}`);

  const undone = await session.service.undo({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "history.undo",
    requestId: "urn:test:bld-047:data-control:undo",
    commandId: "history.undo",
    documentId: documentIdentity,
    ownerGeneration: 1,
    expectedWorkingRevision: committed.workingRevision,
    payload: null,
  });
  assert.equal(undone.kind, "override-render-dataset.committed");
  const restored = studioProjection(
    session,
    await dataset(session, "urn:test:bld-047:query:restored"),
  );
  assert.equal(
    restored.dataSummary.groundElevationFt,
    boringLogMvpFixture.metadata.groundElevationFt,
  );
});
