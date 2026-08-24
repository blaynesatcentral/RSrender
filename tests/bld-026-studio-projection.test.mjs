import assert from "node:assert/strict";
import test from "node:test";

import { createSyntheticBoringLogOverrideSession } from "../packages/application/dist/index.js";
import { sha256CanonicalJson } from "../packages/contracts/dist/index.js";
import {
  boringLogStudioProjectionRevision,
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

const documentIdentity = "urn:test:bld-026:document:studio-projection-001";

function layoutJob() {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-026-studio-projection@r1",
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
  if (!prepared.accepted) return prepared;
  return completeBoringLogStudioProjection(
    prepared.preparation,
    strictCoverageTextResults(prepared.preparation.layout.textRequests),
  );
}

function displayCommand(session, projection, editable, replacementContent, suffix) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "presentation-override.set-display-value",
    requestId: `urn:test:bld-026:command:${suffix}`,
    commandId: "presentation-override.set-display-value",
    documentId: documentIdentity,
    ownerGeneration: 1,
    expectedWorkingRevision: projection.workingRevision,
    payload: {
      localOverrideIdentity: `urn:test:bld-026:override:${suffix}`,
      targetSourceFieldIdentity: editable.sourceFieldIdentity,
      expectedSourceValueDigest: editable.sourceBaselineValueDigest,
      expectedSourceValueType: editable.sourceOriginal.valueType,
      expectedSourceUnit: editable.sourceOriginal.unit,
      replacementContent,
      replacementUnit: editable.unit,
      reason: "BLD-026 style and layout projection proof",
      authorIdentity: null,
      recordedAtUtc: "2026-08-21T21:10:00.000Z",
    },
  };
}

test("BLD-026 main-owned Studio projection combines structured values and the resolved scene", async () => {
  const session = initialized();
  const initial = resolve(session, await dataset(session, "urn:test:bld-026:query:scene-1"));
  assert.equal(boringLogStudioProjectionRevision, "bld-026-studio-projection-v1");
  assert.equal(initial.accepted, true, initial.code);
  assert.equal(initial.projection.editableValues.length, 24);
  assert.deepEqual(initial.projection.textTemplateScopeSummary, {
    authoredStyleCount: 5,
    excludedOverrideStyleCount: 0,
  });
  assert.deepEqual(initial.projection.guides, []);
  assert.equal(initial.projection.scene.pages[0].nodes.length, 328);
  assert.equal(initial.projection.scene.pages[0].semanticOrder.length, 90);
  assert.equal(
    initial.projection.scene.pages[0].nodes.some(({ kind }) => kind === "image"),
    false,
  );
  const binding = session.bindings.find(
    ({ semanticId, property }) =>
      semanticId === "lithology:stratum-01" && property === "material-description",
  );
  assert.ok(binding);
  const editable = initial.projection.editableValues.find(
    ({ sourceFieldIdentity }) => sourceFieldIdentity === binding.sourceFieldIdentity,
  );
  assert.ok(editable);
  const replacement = "Edited through the main-owned structured scene projection";
  const committed = await session.service.setDisplayValue({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "presentation-override.set-display-value",
    requestId: "urn:test:bld-026:command:scene-set",
    commandId: "presentation-override.set-display-value",
    documentId: documentIdentity,
    ownerGeneration: 1,
    expectedWorkingRevision: 0,
    payload: {
      localOverrideIdentity: `urn:rsrender:bld-026:local-override:${editable.sourceFieldIdentity}`,
      targetSourceFieldIdentity: editable.sourceFieldIdentity,
      expectedSourceValueDigest: editable.sourceBaselineValueDigest,
      expectedSourceValueType: editable.sourceOriginal.valueType,
      expectedSourceUnit: editable.sourceOriginal.unit,
      replacementContent: {
        kind: "value",
        value: replacement,
        originalRepresentation: replacement,
      },
      replacementUnit: editable.sourceOriginal.unit,
      reason: "Edited in RSrender Boring Log Studio",
      authorIdentity: null,
      recordedAtUtc: "2026-08-21T21:00:00.000Z",
    },
  });
  assert.equal(committed.kind, "override-render-dataset.committed");
  const commandResultBytes = Buffer.byteLength(JSON.stringify(committed), "utf8");
  assert.ok(commandResultBytes > 1_048_576);
  assert.ok(
    commandResultBytes <= 1_310_720,
    `structured command result bytes: ${commandResultBytes}`,
  );
  const edited = resolve(session, committed.projection);
  assert.equal(edited.accepted, true, edited.code);
  const textNode = edited.projection.scene.pages[0].nodes.find(
    ({ kind, semanticId }) => kind === "text" && semanticId === "lithology:stratum-01",
  );
  assert.ok(textNode);
  assert.match(textNode.content, new RegExp(replacement, "u"));
  assert.equal(textNode.provenance.provenanceClass, "effective-override");
  assert.notEqual(edited.projection.scene.inputDigest, initial.projection.scene.inputDigest);
  const editedValue = edited.projection.editableValues.find(
    ({ sourceFieldIdentity }) => sourceFieldIdentity === binding.sourceFieldIdentity,
  );
  assert.equal(editedValue.sourceOriginal.digest, editable.sourceOriginal.digest);
  assert.equal(editedValue.effectiveDisplay.content.value, replacement);
});

test("BLD-038 Studio projection exposes guides without painting them into the shared scene", async () => {
  const job = layoutJob();
  job.template.guides = [
    { id: "guide-v-1", orientation: "vertical", positionMpt: 144_000, locked: false },
  ];
  job.templateDigest = sha256CanonicalJson(job.template);
  const created = createSyntheticBoringLogOverrideSession({
    documentIdentity,
    ownerGeneration: 1,
    layoutJob: job,
  });
  assert.equal(created.accepted, true, created.code);
  const projection = resolve(
    created.session,
    await dataset(created.session, "urn:test:bld-038:query:guide-scene"),
  );
  assert.equal(projection.accepted, true, projection.code);
  assert.deepEqual(projection.projection.guides, job.template.guides);
  assert.equal(
    projection.projection.scene.pages[0].nodes.some(({ id }) => id.includes("guide")),
    false,
  );
});

test("BLD-026 Studio projection fails closed on mismatched structured bindings", async () => {
  const session = initialized();
  const projection = await dataset(session, "urn:test:bld-026:query:scene-invalid");
  const hostile = structuredClone(session.bindings);
  hostile[0].sourceFieldIdentity = "urn:test:bld-026:unknown-field";
  assert.deepEqual(
    prepareBoringLogStudioProjection({
      layoutJob: session.layoutJob,
      bindings: hostile,
      dataset: projection,
    }),
    { accepted: false, code: "BORING_LOG_STUDIO_EDITABLE_VALUE_INVALID" },
  );
});

test("BLD-026 style and layout values rebuild vector resources and integer mpt geometry through history", async () => {
  const session = initialized();
  const initialDataset = await dataset(session, "urn:test:bld-026:query:style-layout-initial");
  const initial = resolve(session, initialDataset);
  assert.equal(initial.accepted, true, initial.code);
  const style = initial.projection.editableValues.find(
    ({ property }) => property === "lithology-pattern-style",
  );
  assert.ok(style);
  const pattern = "gravel-dot-ring";
  const styledCommit = await session.service.setDisplayValue(
    displayCommand(
      session,
      initialDataset,
      style,
      { kind: "value", value: pattern, originalRepresentation: pattern },
      "style",
    ),
  );
  assert.equal(styledCommit.kind, "override-render-dataset.committed");
  const styled = resolve(session, styledCommit.projection);
  assert.equal(styled.accepted, true, styled.code);
  const patternNodes = styled.projection.scene.pages[0].nodes.filter(
    ({ role }) => role === "lithology-pattern-interval",
  );
  assert.equal(patternNodes.length, 3);
  assert.ok(
    patternNodes.every(({ fillToken }) => fillToken === pattern),
    JSON.stringify(patternNodes.map(({ fillToken }) => fillToken)),
  );
  assert.ok(
    patternNodes.every(({ provenance }) => provenance?.provenanceClass === "effective-override"),
  );
  const undone = await session.service.undo({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "history.undo",
    requestId: "urn:test:bld-026:command:style-undo",
    commandId: "history.undo",
    documentId: documentIdentity,
    ownerGeneration: 1,
    expectedWorkingRevision: styledCommit.workingRevision,
    payload: null,
  });
  assert.equal(undone.kind, "override-render-dataset.committed");
  const afterUndo = resolve(session, undone.projection);
  assert.equal(afterUndo.accepted, true, afterUndo.code);
  assert.notEqual(
    afterUndo.projection.scene.pages[0].nodes.find(
      ({ role }) => role === "lithology-pattern-interval",
    ).fillToken,
    pattern,
  );
  const layout = afterUndo.projection.editableValues.find(
    ({ property }) => property === "description-column-width-mpt",
  );
  assert.ok(layout);
  const widthMpt = 160_000;
  const layoutCommit = await session.service.setDisplayValue(
    displayCommand(
      session,
      undone.projection,
      layout,
      { kind: "value", value: widthMpt, originalRepresentation: String(widthMpt) },
      "layout",
    ),
  );
  assert.equal(layoutCommit.kind, "override-render-dataset.committed");
  const laidOut = resolve(session, layoutCommit.projection);
  assert.equal(laidOut.accepted, true, laidOut.code);
  const columns = laidOut.projection.scene.pagePlan.pages[0].columns;
  const description = columns.find(({ role }) => role === "material-description");
  const remarks = columns.find(({ role }) => role === "remarks");
  assert.equal(
    description.widthMpt,
    session.layoutJob.template.columns.find(({ role }) => role === "material-description").widthMpt,
  );
  assert.equal(remarks.xMpt + remarks.widthMpt, 588_000);
  assert.equal(
    laidOut.projection.scene.pages[0].nodes.find(
      ({ semanticId, kind }) => semanticId === "column-description" && kind === "rect",
    ).provenance,
    null,
  );
});
