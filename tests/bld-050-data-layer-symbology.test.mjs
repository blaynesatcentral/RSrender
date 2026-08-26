import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  captureOverrideRenderDatasetWorkingState,
  commitEmbeddedTemplateReplacement,
  createSyntheticBoringLogProjectSession,
} from "../packages/application/dist/index.js";
import {
  boringLogLayoutJobSchemaVersion,
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
} from "../packages/contracts/dist/index.js";
import { measureBoringLogTextRequests } from "../packages/layout-host/dist/index.js";
import {
  boringLogDataLayerSymbologyRevision,
  prepareBoringLogLayout,
  resolveBoringLogDataLayerSymbology,
  resolveBoringLogPageScene,
} from "../packages/scene/dist/index.js";
import { createBoringLogStudioHtml } from "../packages/renderer-ui/dist/index.js";
import {
  openLogProjectFile,
  saveLogProjectFile,
} from "../packages/platform-electron-main/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const visualTokenIds = Object.keys(boringLogMvpTemplate.visualTokens);

function layer(id) {
  return boringLogMvpFixture.dataTrack.layers.find((candidate) => candidate.id === id);
}

function assignedDigest(capture, explorationIdentity) {
  const membership = capture.project.aggregate.logSet.memberships.find(
    ({ sourceExplorationIdentity }) => sourceExplorationIdentity === explorationIdentity,
  );
  const assignment = capture.project.aggregate.logSet.templateAssignments.find(
    ({ scope }) =>
      scope.kind === "exploration" && scope.targetIdentity === membership.membershipIdentity,
  );
  return capture.project.aggregate.logSet.embeddedTemplateRepresentations.find(
    ({ embeddedTemplateRepresentationIdentity }) =>
      embeddedTemplateRepresentationIdentity === assignment.embeddedTemplateRepresentationIdentity,
  ).effectiveContentDigest;
}

function historyCommand(documentId, kind, expectedWorkingRevision) {
  return {
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind,
    requestId: `urn:rsrender:bld-050:${kind}:${expectedWorkingRevision}`,
    commandId: kind,
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision,
    payload: null,
  };
}

test("BLD-050 resolves legacy plot glyphs into renderer-neutral point/line/range symbols", () => {
  assert.equal(boringLogDataLayerSymbologyRevision, "bld-050-data-layer-symbology-v1");
  const n = resolveBoringLogDataLayerSymbology({
    layer: layer("layer-n-value"),
    legendLabel: "N, blows/ft",
    visualTokenIds,
  });
  assert.equal(n.accepted, true);
  assert.equal(n.value.point.shape, "square");
  assert.equal(n.value.point.fillToken, "nTrack");
  assert.deepEqual(n.value.line.dashMpt, []);
  assert.equal(n.value.legend.point, n.value.point);
  assert.equal(n.value.legend.line, n.value.line);

  const moisture = resolveBoringLogDataLayerSymbology({
    layer: layer("layer-moisture"),
    legendLabel: "Water content, %",
    visualTokenIds,
  });
  assert.equal(moisture.accepted, true);
  assert.equal(moisture.value.point.shape, "triangle");
  assert.deepEqual(moisture.value.line.dashMpt, [3_000, 2_000]);

  const range = resolveBoringLogDataLayerSymbology({
    layer: layer("layer-plasticity-range"),
    legendLabel: "Plastic range PL–LL",
    visualTokenIds,
  });
  assert.equal(range.accepted, true);
  assert.equal(range.value.line, null);
  assert.equal(range.value.point, null);
  assert.equal(range.value.range.firstEndpoint.fillToken, "pageFill");
  assert.equal(range.value.range.secondEndpoint.fillToken, "plasticityTrack");
  assert.equal(range.value.legend.range, range.value.range);
});

test("BLD-050 keeps Canvas and Legend on one detached admitted override", () => {
  const source = {
    layerId: "layer-moisture",
    visible: true,
    order: 2,
    line: { strokeToken: "nTrack", strokeWidthMpt: 900, dashMpt: [1_000, 1_000] },
    point: {
      shape: "circle",
      sizeMpt: 5_000,
      fillToken: "pageFill",
      strokeToken: "nTrack",
      strokeWidthMpt: 700,
    },
    range: null,
    legend: { visible: true, label: "Moisture (edited)" },
  };
  const result = resolveBoringLogDataLayerSymbology({
    layer: layer("layer-moisture"),
    legendLabel: "Water content, %",
    visualTokenIds,
    override: source,
  });
  assert.equal(result.accepted, true);
  assert.equal(result.value.source, "layer-override");
  assert.equal(result.value.point.shape, "circle");
  assert.equal(result.value.legend.point, result.value.point);
  assert.equal(result.value.legend.label, "Moisture (edited)");
  source.line.dashMpt[0] = 72_000;
  assert.deepEqual(result.value.line.dashMpt, [1_000, 1_000]);
});

test("BLD-050 rejects unknown tokens and kind-confused faux symbols", () => {
  const unknownToken = resolveBoringLogDataLayerSymbology({
    layer: layer("layer-n-value"),
    legendLabel: "N, blows/ft",
    visualTokenIds,
    override: {
      layerId: "layer-n-value",
      visible: true,
      order: 0,
      line: { strokeToken: "not-admitted", strokeWidthMpt: 500, dashMpt: [] },
      point: {
        shape: "square",
        sizeMpt: 3_000,
        fillToken: "nTrack",
        strokeToken: "ink",
        strokeWidthMpt: 500,
      },
      range: null,
      legend: { visible: true, label: "N" },
    },
  });
  assert.deepEqual(unknownToken, {
    accepted: false,
    code: "DATA_LAYER_SYMBOLOGY_TOKEN_UNKNOWN",
  });

  const kindMismatch = resolveBoringLogDataLayerSymbology({
    layer: layer("layer-plasticity-range"),
    legendLabel: "Plastic range",
    visualTokenIds,
    override: {
      layerId: "layer-plasticity-range",
      visible: true,
      order: 0,
      line: { strokeToken: "plasticityTrack", strokeWidthMpt: 500, dashMpt: [] },
      point: null,
      range: null,
      legend: { visible: true, label: "Plastic range" },
    },
  });
  assert.deepEqual(kindMismatch, {
    accepted: false,
    code: "DATA_LAYER_SYMBOLOGY_KIND_MISMATCH",
  });
});

test("BLD-050 admits a persisted template override and projects it into graph and legend together", () => {
  const override = {
    layerId: "layer-moisture",
    kind: "numeric-polyline",
    visible: true,
    order: 2,
    line: { strokeToken: "nTrack", strokeWidthMpt: 900, dashMpt: [1_000, 1_000] },
    point: {
      shape: "circle",
      sizeMpt: 5_000,
      fillToken: "pageFill",
      strokeToken: "nTrack",
      strokeWidthMpt: 700,
    },
    range: null,
    legend: { visible: true, label: "Moisture (edited)" },
    overrideIdentity: "urn:rsrender:symbology-override:layer-moisture",
    overrideRevision: 1,
  };
  const template = {
    ...structuredClone(boringLogMvpTemplate),
    dataLayerSymbologyOverrides: [override],
  };
  const job = {
    contractVersion: 1,
    schemaVersion: boringLogLayoutJobSchemaVersion,
    kind: "boring-log.layout-job",
    jobId: "job:bld-050:persisted-symbology",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: sha256CanonicalJson(template),
    document: structuredClone(boringLogMvpFixture),
    template,
  };
  assert.equal(validateBoringLogLayoutJobInput(job).accepted, true);
  const prepared = prepareBoringLogLayout(job);
  assert.equal(prepared.accepted, true);
  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true);
  const resolved = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(resolved.accepted, true);
  const graphLine = resolved.value.pages[0].nodes.find(
    ({ id }) => id === "node:data-layer:layer-moisture:line",
  );
  const legendLine = resolved.value.pages[0].nodes.find(
    ({ id }) => id === "node:legend:legend-water:symbol",
  );
  const graphPoint = resolved.value.pages[0].nodes.find(
    ({ id }) => id === "node:data-layer:layer-moisture:point:sample-01",
  );
  const legendPoint = resolved.value.pages[0].nodes.find(
    ({ id }) => id === "node:legend:legend-water:symbol:point",
  );
  const plasticityLegendLabel = resolved.value.pages[0].nodes.find(
    ({ id }) => id === "node:legend:legend-plll:label",
  );
  const moistureLegendLabel = resolved.value.pages[0].nodes.find(
    ({ id }) => id === "node:legend:legend-water:label",
  );
  assert.deepEqual(
    [graphLine.strokeToken, graphLine.strokeWidthMpt, graphLine.dashMpt],
    [legendLine.strokeToken, legendLine.strokeWidthMpt, legendLine.dashMpt],
  );
  assert.equal(graphPoint.kind, "circle");
  assert.equal(legendPoint.kind, "circle");
  assert.equal(graphPoint.radiusMpt, 2_500);
  assert.equal(legendPoint.radiusMpt, 2_500);
  assert.ok(
    plasticityLegendLabel.frame.yMpt < moistureLegendLabel.frame.yMpt,
    "the shared layer order must place the plasticity legend before edited moisture",
  );
  assert.ok(
    resolved.value.pages[0].nodes.some(
      ({ id, content }) =>
        id === "node:legend:legend-water:label" && content === "Moisture (edited)",
    ),
  );

  const hostile = structuredClone(job);
  hostile.template.dataLayerSymbologyOverrides[0].line.strokeToken = "unadmitted-token";
  hostile.templateDigest = sha256CanonicalJson(hostile.template);
  assert.equal(validateBoringLogLayoutJobInput(hostile).accepted, false);
});

test("BLD-050 persists one layer edit through Undo, Redo, Save, and Open", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "rsrender-bld050-symbology-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const documentId = "urn:rsrender:log-project:bld-050:symbology-history";
  const firstJob = {
    contractVersion: 1,
    schemaVersion: boringLogLayoutJobSchemaVersion,
    kind: "boring-log.layout-job",
    jobId: "job:bld-050:symbology-history:1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: sha256CanonicalJson(boringLogMvpTemplate),
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  };
  const secondDocument = JSON.parse(
    JSON.stringify(boringLogMvpFixture)
      .replaceAll("test-01", "test-02")
      .replaceAll("stratum-", "b02-stratum-")
      .replaceAll("sample-", "b02-sample-")
      .replaceAll("remark-", "b02-remark-"),
  );
  secondDocument.metadata.documentTitle = "BORING LOG TEST-02";
  const secondJob = {
    ...firstJob,
    jobId: "job:bld-050:symbology-history:2",
    document: secondDocument,
  };
  const created = createSyntheticBoringLogProjectSession({
    projectDocumentIdentity: documentId,
    ownerGeneration: 1,
    layoutJobs: [firstJob, secondJob],
  });
  assert.equal(created.accepted, true, created.code);
  const explorationIdentity = boringLogMvpFixture.identity.explorationId;
  const before = await captureOverrideRenderDatasetWorkingState(created.session.service);
  const beforeDigest = assignedDigest(before, explorationIdentity);
  const template = {
    ...structuredClone(boringLogMvpTemplate),
    dataLayerSymbologyOverrides: [
      {
        layerId: "layer-n-value",
        kind: "numeric-polyline",
        visible: true,
        order: 1,
        line: { strokeToken: "nTrack", strokeWidthMpt: 1_000, dashMpt: [2_000, 1_000] },
        point: {
          shape: "circle",
          sizeMpt: 5_000,
          fillToken: "nTrack",
          strokeToken: "ink",
          strokeWidthMpt: 600,
        },
        range: null,
        legend: { visible: true, label: "N-value (edited)" },
        overrideIdentity: "urn:rsrender:symbology-override:layer-n-value",
        overrideRevision: 1,
      },
    ],
  };
  const replacementDigest = sha256CanonicalJson(template);
  const committed = await commitEmbeddedTemplateReplacement(created.session.service, {
    requestId: "urn:rsrender:bld-050:request:set-layer-symbology:1",
    documentId,
    ownerGeneration: 1,
    expectedWorkingRevision: 0,
    explorationIdentity,
    expectedEffectiveContentDigest: beforeDigest,
    replacementEffectiveContentDigest: replacementDigest,
    reason: "Set N-value point and line symbology",
    operation: "data-layer-symbology",
  });
  assert.equal(committed.accepted, true, JSON.stringify(committed));
  assert.equal(committed.workingRevision, 1);
  assert.equal(committed.canUndo, true);
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    replacementDigest,
  );
  const undone = await created.session.service.undo(historyCommand(documentId, "history.undo", 1));
  assert.equal(undone.kind, "override-render-dataset.committed");
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    beforeDigest,
  );
  const redone = await created.session.service.redo(historyCommand(documentId, "history.redo", 2));
  assert.equal(redone.kind, "override-render-dataset.committed");
  assert.equal(
    assignedDigest(
      await captureOverrideRenderDatasetWorkingState(created.session.service),
      explorationIdentity,
    ),
    replacementDigest,
  );
  const redoneCapture = await captureOverrideRenderDatasetWorkingState(created.session.service);
  const target = path.join(temporaryRoot, "Saved Graph Symbology.rsrender");
  const saved = await saveLogProjectFile({
    targetPath: target,
    expectedBaseline: null,
    replaceExisting: false,
    layoutJobs: [{ ...firstJob, template, templateDigest: replacementDigest }, secondJob],
    projectAggregate: redoneCapture.project.aggregate,
    presentationOverrideCollections: redoneCapture.presentationOverrideCollections,
  });
  assert.equal(saved.accepted, true, saved.code);
  const reopened = await openLogProjectFile(target);
  assert.equal(reopened.accepted, true, reopened.code);
  const reopenedFirst = reopened.value.project.layoutJobs.find(
    ({ document }) => document.identity.explorationId === explorationIdentity,
  );
  const reopenedSecond = reopened.value.project.layoutJobs.find(
    ({ document }) => document.identity.explorationId === secondDocument.identity.explorationId,
  );
  assert.deepEqual(
    reopenedFirst.template.dataLayerSymbologyOverrides,
    template.dataLayerSymbologyOverrides,
  );
  assert.equal(Object.hasOwn(reopenedSecond.template, "dataLayerSymbologyOverrides"), false);
});

test("BLD-050 exposes a focused human graph symbology editor and owned Apply command", async () => {
  const html = createBoringLogStudioHtml(null);
  for (const id of [
    "data-layer-symbology-properties",
    "data-layer-symbol-preview",
    "data-layer-visible",
    "data-layer-order",
    "data-layer-line-color",
    "data-layer-line-width",
    "data-layer-line-style",
    "data-layer-point-shape",
    "data-layer-range-first-shape",
    "data-layer-range-second-shape",
    "data-layer-legend-visible",
    "data-layer-legend-label",
    "apply-data-layer-symbology",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`, "u"));
  }
  assert.match(
    html,
    /Canvas drawing and footer legend use this same renderer-neutral symbol and order/u,
  );
  assert.doesNotMatch(html, /<(?:img|canvas|picture)\b/iu);

  const entry = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
    "utf8",
  );
  assert.equal(entry.includes("/^data-layer:([^:]+)(?::|$)/u"), true);
  assert.match(entry, /dataLayerApplyScope\.id = "data-layer-apply-scope"/u);
  assert.match(entry, /"project-default", "Project default across every boring"/u);
  assert.match(entry, /applyScope: dataLayerApplyScope\.value/u);
  assert.match(entry, /setDataLayerSymbology\(\{/u);
  assert.match(entry, /"apply-data-layer-symbology"/u);
  assert.match(entry, /dataLayerSymbologyProperties\.scrollIntoView/u);
});

test("BLD-050 graph hit targets carry both semantic and exact node identity for click and right-click", async () => {
  const source = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-svg-projection.ts", import.meta.url),
    "utf8",
  );
  const hitTarget = source.slice(
    source.indexOf("function dataHitTarget"),
    source.indexOf("function rectMarkup"),
  );
  assert.match(hitTarget, /attribute\("data-node-id", node\.id\)/u);
  assert.match(hitTarget, /attribute\("data-semantic-id", node\.semanticId\)/u);
  assert.match(hitTarget, /class", "scene-data-hit-target"/u);
  assert.match(hitTarget, /node\.role === "data-polyline"/u);
});
