import assert from "node:assert/strict";
import test from "node:test";

import { createSyntheticBoringLogOverrideSession } from "../packages/application/dist/index.js";
import {
  boringLogDynamicTextCatalog,
  validateDynamicTextCatalog,
} from "../packages/contracts/dist/index.js";
import {
  completeBoringLogStudioProjection,
  prepareBoringLogStudioProjection,
} from "../packages/platform-electron-main/dist/index.js";
import { createBoringLogStudioHtml } from "../packages/renderer-ui/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import { strictCoverageTextResults } from "./helpers/bld-033-strict-text-authority.mjs";

const documentIdentity = "urn:test:bld-056:dynamic-text-authoring";

function layoutJob() {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-056-dynamic-text-authoring@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  };
}

function resolve(session, projection) {
  const prepared = prepareBoringLogStudioProjection({
    layoutJob: session.layoutJob,
    bindings: session.bindings,
    dataset: projection,
  });
  assert.equal(prepared.accepted, true, prepared.code);
  return completeBoringLogStudioProjection(
    prepared.preparation,
    strictCoverageTextResults(prepared.preparation.layout.textRequests),
  );
}

test("BLD-056 exposes a searchable Properties catalog of admitted inert tokens", () => {
  const catalog = validateDynamicTextCatalog(boringLogDynamicTextCatalog);
  assert.equal(catalog.accepted, true, catalog.code);
  assert.ok(catalog.value.definitions.length >= 20);
  assert.ok(catalog.value.definitions.some(({ identifier }) => identifier === "project_name"));
  assert.ok(catalog.value.definitions.some(({ identifier }) => identifier === "boring_name"));

  const html = createBoringLogStudioHtml(null);
  assert.match(html, /id="insert-dynamic-text"/u);
  assert.match(html, /id="dynamic-text-search"/u);
  assert.match(html, /id="dynamic-text-options"/u);
});

test("BLD-056 resolves a Properties-authored token before measurement and Undo restores source text", async () => {
  const created = createSyntheticBoringLogOverrideSession({
    documentIdentity,
    ownerGeneration: 1,
    layoutJob: layoutJob(),
  });
  assert.equal(created.accepted, true, created.code);
  const session = created.session;
  const initial = await session.service.getProjection({
    contractVersion: 1,
    messageType: "query",
    scope: "document-domain",
    kind: "render-dataset.get",
    requestId: "urn:test:bld-056:query:initial",
    documentId: documentIdentity,
    ownerGeneration: 1,
    minimumWorkingRevision: null,
  });
  assert.equal(initial.kind, "render-dataset.projection.result");
  const projected = resolve(session, initial.projection);
  assert.equal(projected.accepted, true, projected.code);
  const editable = projected.projection.editableValues.find(
    ({ semanticId, property }) =>
      semanticId === "lithology:stratum-01" && property === "material-description",
  );
  assert.ok(editable);
  const sourceText = editable.sourceOriginal.content.value;
  const authoredText = "Project @project_name · log @boring_name";
  const committed = await session.service.setDisplayValue({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "presentation-override.set-display-value",
    requestId: "urn:test:bld-056:command:insert",
    commandId: "presentation-override.set-display-value",
    documentId: documentIdentity,
    ownerGeneration: 1,
    expectedWorkingRevision: 0,
    payload: {
      localOverrideIdentity: "urn:test:bld-056:override:insert",
      targetSourceFieldIdentity: editable.sourceFieldIdentity,
      expectedSourceValueDigest: editable.sourceBaselineValueDigest,
      expectedSourceValueType: editable.sourceOriginal.valueType,
      expectedSourceUnit: editable.sourceOriginal.unit,
      replacementContent: {
        kind: "value",
        value: authoredText,
        originalRepresentation: authoredText,
      },
      replacementUnit: editable.unit,
      reason: "Insert Dynamic Text from Properties",
      authorIdentity: null,
      recordedAtUtc: "2026-08-25T20:00:00.000Z",
    },
  });
  assert.equal(committed.kind, "override-render-dataset.committed");
  assert.equal(committed.canUndo, true);
  const edited = resolve(session, committed.projection);
  assert.equal(edited.accepted, true, edited.code);
  const request = edited.projection.scene.textRequests.find(
    ({ measurementId }) => measurementId === "measure:node:lithology:stratum-01:description",
  );
  assert.equal(request.dynamicTextResolution.sourceText, authoredText);
  assert.match(request.text, new RegExp(boringLogMvpFixture.metadata.projectName, "u"));
  assert.match(request.text, new RegExp(boringLogMvpFixture.metadata.documentTitle, "u"));

  const undone = await session.service.undo({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "history.undo",
    requestId: "urn:test:bld-056:command:undo",
    commandId: "history.undo",
    documentId: documentIdentity,
    ownerGeneration: 1,
    expectedWorkingRevision: committed.workingRevision,
    payload: null,
  });
  assert.equal(undone.kind, "override-render-dataset.committed");
  const restored = resolve(session, undone.projection);
  assert.equal(restored.accepted, true, restored.code);
  const restoredNode = restored.projection.scene.pages[0].nodes.find(
    ({ id }) => id === "node:lithology:stratum-01:description",
  );
  assert.equal(restoredNode.content, sourceText);
});
