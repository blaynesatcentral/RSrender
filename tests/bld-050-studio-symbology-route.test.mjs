import assert from "node:assert/strict";
import test from "node:test";

import { createSyntheticBoringLogOverrideSession } from "../packages/application/dist/index.js";
import { sha256CanonicalJson } from "../packages/contracts/dist/index.js";
import {
  BORING_LOG_STUDIO_SET_DATA_LAYER_SYMBOLOGY_CHANNEL,
  BoringLogStudioRouteBroker,
  completeBoringLogStudioProjection,
  prepareBoringLogStudioProjection,
} from "../packages/platform-electron-main/dist/index.js";
import { resolveBoringLogDataLayerSymbology } from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import { strictCoverageTextResults } from "./helpers/bld-033-strict-text-authority.mjs";

const documentIdentity = "urn:test:bld-050:document:studio-symbology";

function routeContext(expectedWindow, expectedWebContents, frame) {
  return {
    window: expectedWindow,
    webContents: expectedWebContents,
    frame,
    mainFrame: frame,
    url: "rsrender-shell://document/index.html",
    windowLive: true,
    webContentsLive: true,
  };
}

function envelope(binding, sequence, args) {
  return {
    transportVersion: 1,
    capability: binding.capability,
    generation: binding.generation,
    sequence,
    documentIdentity: binding.documentIdentity,
    ownerGeneration: binding.ownerGeneration,
    args,
  };
}

function layoutJob(template = structuredClone(boringLogMvpTemplate)) {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-050-studio-symbology@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: sha256CanonicalJson(template),
    document: structuredClone(boringLogMvpFixture),
    template,
  };
}

async function projectionFor(job) {
  const created = createSyntheticBoringLogOverrideSession({
    documentIdentity,
    ownerGeneration: 1,
    layoutJob: job,
  });
  assert.equal(created.accepted, true, created.code);
  const queried = await created.session.service.getProjection({
    contractVersion: 1,
    messageType: "query",
    scope: "document-domain",
    kind: "render-dataset.get",
    requestId: "urn:test:bld-050:query:studio-symbology",
    documentId: documentIdentity,
    ownerGeneration: 1,
    minimumWorkingRevision: null,
  });
  assert.equal(queried.kind, "render-dataset.projection.result");
  const prepared = prepareBoringLogStudioProjection({
    layoutJob: job,
    bindings: created.session.bindings,
    dataset: queried.projection,
  });
  assert.equal(prepared.accepted, true, prepared.code);
  return completeBoringLogStudioProjection(
    prepared.preparation,
    strictCoverageTextResults(prepared.preparation.layout.textRequests),
  );
}

test("BLD-050 projects effective human-readable Data Layer symbology and preserves legend intent", async () => {
  const initial = await projectionFor(layoutJob());
  assert.equal(initial.accepted, true, initial.code);
  assert.equal(initial.projection.dataLayerSymbologyStates.length, 3);
  const tokenMap = new Map(
    initial.projection.visualTokenOptions.map(({ tokenId, color, label }) => {
      assert.match(color, /^#[0-9a-f]{6}$/u);
      assert.ok(label.length > 0);
      return [tokenId, color];
    }),
  );
  const polyline = initial.projection.dataLayerSymbologyStates.find(
    ({ kind }) => kind === "numeric-polyline",
  );
  assert.equal(polyline.semanticId, `data-layer:${polyline.layerId}`);
  assert.equal(polyline.source, "template-default");
  assert.equal(polyline.line.strokeColor, tokenMap.get(polyline.line.strokeToken));
  assert.equal(polyline.point.strokeColor, tokenMap.get(polyline.point.strokeToken));

  const sourceLayer = boringLogMvpFixture.dataTrack.layers.find(
    ({ id }) => id === polyline.layerId,
  );
  const sourceLegend = boringLogMvpFixture.legend.find(
    ({ symbol }) =>
      symbol ===
      (sourceLayer.glyph === "filled-square" ? "filled-square-line" : "open-triangle-line"),
  );
  const resolved = resolveBoringLogDataLayerSymbology({
    layer: sourceLayer,
    legendLabel: sourceLegend.label,
    visualTokenIds: Object.keys(boringLogMvpTemplate.visualTokens),
  });
  assert.equal(resolved.accepted, true, resolved.code);
  const template = structuredClone(boringLogMvpTemplate);
  template.dataLayerSymbologyOverrides = [
    {
      ...resolved.value,
      kind: sourceLayer.kind,
      visible: false,
      legend: { visible: true, label: "Custom authored legend" },
      overrideIdentity: "urn:test:bld-050:symbology:override",
      overrideRevision: 1,
    },
  ];
  delete template.dataLayerSymbologyOverrides[0].source;
  const overridden = await projectionFor(layoutJob(template));
  assert.equal(overridden.accepted, true, overridden.code);
  const state = overridden.projection.dataLayerSymbologyStates.find(
    ({ layerId }) => layerId === sourceLayer.id,
  );
  assert.equal(state.source, "layer-override");
  assert.equal(state.visible, false);
  assert.deepEqual(state.legend, {
    visible: true,
    effectiveVisible: false,
    label: "Custom authored legend",
  });
});

test("BLD-050 route admits one exact bounded symbology command and rejects malformed topology", async () => {
  assert.equal(
    BORING_LOG_STUDIO_SET_DATA_LAYER_SYMBOLOGY_CHANNEL,
    "rsrender:boring-log-studio:set-data-layer-symbology:v1",
  );
  const expectedWindow = {};
  const expectedWebContents = {};
  const frame = {};
  let received = null;
  const route = new BoringLogStudioRouteBroker({
    expectedWindow,
    expectedWebContents,
    documentIdentity,
    ownerGeneration: 1,
    createCapability: () => "5".repeat(64),
    getProjection: async () => ({
      accepted: false,
      code: "BORING_LOG_STUDIO_CONFIGURATION_INVALID",
    }),
    setDataLayerSymbology: async (input) => {
      received = input;
      return { accepted: true, code: "DATA_LAYER_SYMBOLOGY_SET", workingRevision: 1 };
    },
  });
  const context = routeContext(expectedWindow, expectedWebContents, frame);
  const binding = route.bootstrap(context);
  assert.equal(binding.accepted, true, binding.code);
  const args = {
    expectedWorkingRevision: 0,
    layerId: "layer-n",
    applyScope: "layer",
    visible: true,
    order: 2,
    line: { strokeToken: "nTrack", strokeWidthMpt: 700, dashMpt: [3_000, 2_000] },
    point: {
      shape: "circle",
      sizeMpt: 4_000,
      fillToken: null,
      strokeToken: "nTrack",
      strokeWidthMpt: 600,
    },
    range: null,
    legend: { visible: true, label: "N, blows/ft" },
  };
  const accepted = await route.setDataLayerSymbology(context, envelope(binding, 1, args));
  assert.equal(accepted.accepted, true, accepted.code);
  assert.deepEqual(received, args);
  const projectDefaultArgs = { ...args, applyScope: "project-default" };
  const acceptedProjectDefault = await route.setDataLayerSymbology(
    context,
    envelope(binding, 2, projectDefaultArgs),
  );
  assert.equal(acceptedProjectDefault.accepted, true, acceptedProjectDefault.code);
  assert.deepEqual(received, projectDefaultArgs);
  for (const malformed of [
    { ...args, extra: true },
    Object.fromEntries(Object.entries(args).filter(([key]) => key !== "applyScope")),
    { ...args, applyScope: "classification-default" },
    { ...args, line: null },
    { ...args, line: { ...args.line, dashMpt: [3_000] } },
    { ...args, point: { ...args.point, sizeMpt: 999 } },
    { ...args, legend: { visible: true, label: "" } },
    { ...args, order: 256 },
  ]) {
    assert.deepEqual(await route.setDataLayerSymbology(context, envelope(binding, 3, malformed)), {
      accepted: false,
      code: "STUDIO_ROUTE_ARGUMENT_INVALID",
    });
  }
});
