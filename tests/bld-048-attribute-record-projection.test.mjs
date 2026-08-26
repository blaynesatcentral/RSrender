import assert from "node:assert/strict";
import test from "node:test";

import { createSyntheticBoringLogOverrideSession } from "../packages/application/dist/index.js";
import {
  boringLogAttributeRecordProjectionRevision,
  completeBoringLogStudioProjection,
  prepareBoringLogStudioProjection,
} from "../packages/platform-electron-main/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import { strictCoverageTextResults } from "./helpers/bld-033-strict-text-authority.mjs";

const documentIdentity = "urn:test:bld-048:document:attribute-records-001";

function layoutJob() {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-048-attribute-records@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  };
}

function initialized() {
  const created = createSyntheticBoringLogOverrideSession({
    documentIdentity,
    ownerGeneration: 1,
    layoutJob: layoutJob(),
  });
  assert.equal(created.accepted, true, created.code);
  return created.session;
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

function resolve(session, projection) {
  const prepared = prepareBoringLogStudioProjection({
    layoutJob: session.layoutJob,
    bindings: session.bindings,
    dataset: projection,
  });
  assert.equal(prepared.accepted, true, prepared.code);
  const completed = completeBoringLogStudioProjection(
    prepared.preparation,
    strictCoverageTextResults(prepared.preparation.layout.textRequests),
  );
  assert.equal(completed.accepted, true, completed.code);
  return completed.projection;
}

test("BLD-048 projects stable records for strata, samples, plotted observations, and remarks", async () => {
  const session = initialized();
  const projection = resolve(
    session,
    await dataset(session, "urn:test:bld-048:query:initial-records"),
  );
  assert.equal(
    boringLogAttributeRecordProjectionRevision,
    "bld-048-attribute-record-projection-v1",
  );
  const expectedObservations = boringLogMvpFixture.dataTrack.layers.reduce(
    (sum, layer) => sum + layer.values.length,
    0,
  );
  assert.equal(
    projection.attributeRecords.length,
    boringLogMvpFixture.lithologyIntervals.length +
      boringLogMvpFixture.samples.length +
      expectedObservations +
      boringLogMvpFixture.remarks.length,
  );
  assert.deepEqual(
    projection.attributeRecords.map(({ recordKind }) => recordKind),
    [
      ...boringLogMvpFixture.lithologyIntervals.map(() => "lithology-interval"),
      ...boringLogMvpFixture.samples.map(() => "sample"),
      ...boringLogMvpFixture.dataTrack.layers.flatMap((layer) =>
        layer.values.map(() => "plotted-observation"),
      ),
      ...boringLogMvpFixture.remarks.map(() => "remark"),
    ],
  );
  const identities = projection.attributeRecords.map(({ recordIdentity }) => recordIdentity);
  assert.equal(new Set(identities).size, identities.length);
  assert.ok(identities.every((identity) => identity.startsWith("attribute:")));
  assert.ok(Object.isFrozen(projection.attributeRecords));
  assert.ok(
    projection.attributeRecords.every(
      (record) =>
        Object.isFrozen(record) &&
        Object.isFrozen(record.depth) &&
        Object.isFrozen(record.fields) &&
        record.fields.every((field) => Object.isFrozen(field) && Object.isFrozen(field.provenance)),
    ),
  );

  const sceneSemanticIds = new Set(
    projection.scene.pages.flatMap(({ nodes }) => nodes.map(({ semanticId }) => semanticId)),
  );
  assert.ok(
    projection.attributeRecords.every(({ semanticId }) => sceneSemanticIds.has(semanticId)),
    "every table identity targets the same semantic facts as the resolved scene",
  );

  const nObservation = projection.attributeRecords.find(
    ({ semanticId }) => semanticId === "data-layer:layer-n-value:sample-01",
  );
  assert.ok(nObservation);
  assert.equal(nObservation.recordKind, "plotted-observation");
  assert.equal(
    nObservation.fields.find(({ key }) => key === "series")?.effectiveDisplay,
    "spt-n-value",
  );
  assert.equal(nObservation.fields.find(({ key }) => key === "value")?.unit, "blows-per-foot");
  assert.ok(
    nObservation.fields.every(({ editability }) => editability.kind === "read-only-source"),
  );

  const plasticityLayer = boringLogMvpFixture.dataTrack.layers.find(
    ({ id }) => id === "layer-plasticity-range",
  );
  assert.ok(plasticityLayer);
  const plasticitySampleId = plasticityLayer.values[0][0];
  const plasticity = projection.attributeRecords.find(
    ({ semanticId }) => semanticId === `data-layer:layer-plasticity-range:${plasticitySampleId}`,
  );
  assert.ok(plasticity);
  assert.equal(plasticity.fields.find(({ key }) => key === "upper-value")?.unit, "percent");
  assert.equal(plasticity.fields.find(({ key }) => key === "lower-value")?.unit, "percent");
});

test("BLD-048 preserves stable record identity and source/effective provenance through an override", async () => {
  const session = initialized();
  const initialDataset = await dataset(session, "urn:test:bld-048:query:override-initial");
  const initial = resolve(session, initialDataset);
  const targetSemanticId = "lithology:stratum-01";
  const editable = initial.editableValues.find(
    ({ semanticId, property }) =>
      semanticId === targetSemanticId && property === "material-description",
  );
  assert.ok(editable);
  const before = initial.attributeRecords.find(({ semanticId }) => semanticId === targetSemanticId);
  assert.ok(before);
  const beforeField = before.fields.find(({ key }) => key === "description");
  assert.ok(beforeField);
  assert.deepEqual(beforeField.editability, {
    kind: "display-value-override",
    property: "material-description",
  });
  assert.equal(beforeField.provenance.sourceOriginal?.provenanceClass, "source");
  assert.equal(beforeField.provenance.effective?.provenanceClass, "source");

  const replacement = "Effective table value with preserved source original";
  const committed = await session.service.setDisplayValue({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "presentation-override.set-display-value",
    requestId: "urn:test:bld-048:command:set-description",
    commandId: "presentation-override.set-display-value",
    documentId: documentIdentity,
    ownerGeneration: 1,
    expectedWorkingRevision: initialDataset.workingRevision,
    payload: {
      localOverrideIdentity: "urn:test:bld-048:override:description",
      targetSourceFieldIdentity: editable.sourceFieldIdentity,
      expectedSourceValueDigest: editable.sourceBaselineValueDigest,
      expectedSourceValueType: editable.sourceOriginal.valueType,
      expectedSourceUnit: editable.sourceOriginal.unit,
      replacementContent: {
        kind: "value",
        value: replacement,
        originalRepresentation: replacement,
      },
      replacementUnit: editable.unit,
      reason: "BLD-048 attribute projection provenance proof",
      authorIdentity: null,
      recordedAtUtc: "2026-08-25T05:00:00.000Z",
    },
  });
  assert.equal(committed.kind, "override-render-dataset.committed");
  const changed = resolve(
    session,
    await dataset(session, "urn:test:bld-048:query:override-changed"),
  );
  assert.deepEqual(
    changed.attributeRecords.map(({ recordIdentity }) => recordIdentity),
    initial.attributeRecords.map(({ recordIdentity }) => recordIdentity),
  );
  const after = changed.attributeRecords.find(({ semanticId }) => semanticId === targetSemanticId);
  assert.ok(after);
  const afterField = after.fields.find(({ key }) => key === "description");
  assert.ok(afterField);
  assert.equal(afterField.sourceOriginal, beforeField.sourceOriginal);
  assert.equal(afterField.effectiveDisplay, replacement);
  assert.deepEqual(afterField.provenance.sourceOriginal, beforeField.provenance.sourceOriginal);
  assert.equal(afterField.provenance.effective?.provenanceClass, "effective-override");
  assert.notEqual(changed.scene.inputDigest, initial.scene.inputDigest);

  const remarkText = changed.attributeRecords
    .find(({ recordKind }) => recordKind === "remark")
    ?.fields.find(({ key }) => key === "text");
  assert.equal(remarkText?.editability.kind, "display-value-override");
  assert.notEqual(remarkText?.provenance.sourceOriginal, null);
});
