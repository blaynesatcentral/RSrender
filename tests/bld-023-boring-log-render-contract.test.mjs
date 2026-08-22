import assert from "node:assert/strict";
import test from "node:test";

import {
  boringLogLayoutJobSchemaVersion,
  boringLogPagePlanSchemaVersion,
  resolvedBoringLogPageSceneSchemaVersion,
  validateBoringLogLayoutJobInput,
  validateBoringLogPagePlan,
  validateResolvedBoringLogPageScene,
} from "../packages/contracts/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

const fixtureDigest = BORING_LOG_MVP_FIXTURE_DIGEST;
const templateDigest = BORING_LOG_MVP_TEMPLATE_DIGEST;

function clone(value) {
  return globalThis.structuredClone(value);
}

function layoutJob() {
  return {
    contractVersion: 1,
    schemaVersion: boringLogLayoutJobSchemaVersion,
    kind: "boring-log.layout-job",
    jobId: "job:mvp-boring-log-test-01@r1",
    inputRevision: 1,
    fixtureDigest,
    templateDigest,
    document: clone(boringLogMvpFixture),
    template: clone(boringLogMvpTemplate),
  };
}

function pagePlan() {
  return {
    contractVersion: 1,
    schemaVersion: boringLogPagePlanSchemaVersion,
    kind: "boring-log.page-plan",
    jobId: "job:mvp-boring-log-test-01@r1",
    inputDigest: fixtureDigest,
    pages: [
      {
        pageId: boringLogMvpFixture.identity.pageId,
        pageIndex: 0,
        widthMpt: boringLogMvpTemplate.page.widthMpt,
        heightMpt: boringLogMvpTemplate.page.heightMpt,
        depthRange: clone(boringLogMvpFixture.referenceDepthRange),
        depthTransform: clone(boringLogMvpTemplate.depthTransform),
        regions: clone(boringLogMvpTemplate.regions),
        columns: clone(boringLogMvpTemplate.columns),
        semanticOrder: [
          "page-root",
          "region-header",
          "header-company",
          "header-title",
          "header-sheet",
          "header-project-metadata",
          "region-depth-body",
          ...boringLogMvpTemplate.columns.map(({ id }) => id),
          "region-footer",
          "footer-legend",
          "footer-notes",
          "footer-approval",
        ],
      },
    ],
    overflow: "none",
    diagnostics: [],
  };
}

function resolvedScene() {
  const content = boringLogMvpFixture.metadata.documentTitle;
  const pageId = boringLogMvpFixture.identity.pageId;
  const metadataProvenance = clone(boringLogMvpFixture.metadata.provenance);
  return {
    contractVersion: 1,
    schemaVersion: resolvedBoringLogPageSceneSchemaVersion,
    kind: "boring-log.resolved-page-scene",
    jobId: "job:mvp-boring-log-test-01@r1",
    inputDigest: fixtureDigest,
    pagePlan: pagePlan(),
    textRequests: [
      {
        measurementId: "measure:header-title",
        text: content,
        sourceIdentity: "metadata.documentTitle",
        sourceStartUtf16: 0,
        sourceEndUtf16: content.length,
        fontFamilyId: "font.logical.rsrender-sans",
        fontSizeMpt: 16_000,
        fontWeight: 700,
        lineHeightMpt: 20_000,
        maximumWidthMpt: 250_000,
        maximumLines: 1,
        wrapPolicy: "no-wrap",
      },
    ],
    textResults: [
      {
        measurementId: "measure:header-title",
        fontFaceDigest: fixtureDigest,
        fontMetricsDigest: templateDigest,
        logicalBounds: { xMpt: 0, yMpt: 0, widthMpt: 155_000, heightMpt: 20_000 },
        inkBounds: { xMpt: 500, yMpt: 2_000, widthMpt: 153_000, heightMpt: 16_000 },
        lines: [
          {
            text: content,
            sourceStartUtf16: 0,
            sourceEndUtf16: content.length,
            xMpt: 0,
            baselineMpt: 16_000,
            advanceMpt: 155_000,
          },
        ],
        overflow: "none",
      },
    ],
    resources: {
      visualTokens: clone(boringLogMvpTemplate.visualTokens),
      textStyles: clone(boringLogMvpTemplate.styles),
      patterns: [
        {
          id: "pattern-silt-horizontal-dash",
          kind: "line-hatch",
          foregroundToken: "ink",
          backgroundToken: "lithologySiltFill",
          spacingMpt: 5_000,
          markSizeMpt: 2_000,
          strokeWidthMpt: 500,
        },
        {
          id: "pattern-gravel-dot-ring",
          kind: "dot-ring",
          foregroundToken: "ink",
          backgroundToken: "lithologyGravelFill",
          spacingMpt: 6_000,
          markSizeMpt: 1_500,
          strokeWidthMpt: 500,
        },
      ],
    },
    pages: [
      {
        pageId,
        widthMpt: 612_000,
        heightMpt: 792_000,
        rootNodeId: "node:page-root",
        semanticOrder: ["page-root", "header-title"],
        nodes: [
          {
            id: "node:page-root",
            kind: "group",
            semanticId: "page-root",
            parentId: null,
            role: "page",
            order: 0,
            provenance: null,
            bounds: { xMpt: 0, yMpt: 0, widthMpt: 612_000, heightMpt: 792_000 },
            childIds: ["node:header-title"],
          },
          {
            id: "node:header-title",
            kind: "text",
            semanticId: "header-title",
            parentId: "node:page-root",
            role: "document-title",
            order: 1,
            provenance: metadataProvenance,
            measurementId: "measure:header-title",
            styleId: "style-title",
            content,
            frame: { xMpt: 184_000, yMpt: 25_000, widthMpt: 250_000, heightMpt: 20_000 },
          },
        ],
      },
    ],
    diagnostics: [],
  };
}

test("BLD-023 accepts and detaches the frozen structured fixture/template layout job", () => {
  const input = layoutJob();
  const result = validateBoringLogLayoutJobInput(input);
  assert.equal(result.accepted, true);
  assert.deepEqual(result.value, input);
  assert.notEqual(result.value, input);
  assert.notEqual(result.value.document, input.document);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.document.samples), true);
});

test("BLD-023 accepts renderer-neutral Page Plan and Resolved Page Scene contracts", () => {
  const plan = pagePlan();
  const planResult = validateBoringLogPagePlan(plan);
  assert.equal(planResult.accepted, true);
  assert.deepEqual(planResult.value, plan);

  const scene = resolvedScene();
  const sceneResult = validateResolvedBoringLogPageScene(scene);
  assert.equal(sceneResult.accepted, true, JSON.stringify(sceneResult));
  assert.deepEqual(sceneResult.value, scene);
  assert.equal(sceneResult.value.pages[0].nodes[1].semanticId, "header-title");
  assert.equal(sceneResult.value.textResults[0].overflow, "none");
});

test("BLD-023 covers the renderer-neutral vector scene-node vocabulary", () => {
  const scene = resolvedScene();
  const root = scene.pages[0].nodes[0];
  const vectorNodes = [
    {
      id: "node:header-frame",
      kind: "rect",
      semanticId: "region-header",
      parentId: root.id,
      role: "region-frame",
      order: 2,
      provenance: null,
      bounds: { xMpt: 15_000, yMpt: 14_000, widthMpt: 582_000, heightMpt: 76_000 },
      fillToken: "pageFill",
      strokeToken: "rule",
      strokeWidthMpt: 500,
    },
    {
      id: "node:depth-grid-line",
      kind: "line",
      semanticId: "column-depth",
      parentId: root.id,
      role: "depth-grid-line",
      order: 3,
      provenance: null,
      from: { xMpt: 43_000, yMpt: 121_000 },
      to: { xMpt: 43_000, yMpt: 704_000 },
      strokeToken: "lightRule",
      strokeWidthMpt: 250,
      dashMpt: [2_000, 1_000],
    },
    {
      id: "node:lithology-mark",
      kind: "path",
      semanticId: "column-lithology",
      parentId: root.id,
      role: "lithology-mark",
      order: 4,
      provenance: null,
      points: [
        { xMpt: 75_000, yMpt: 130_000 },
        { xMpt: 85_000, yMpt: 135_000 },
        { xMpt: 75_000, yMpt: 140_000 },
      ],
      closed: true,
      fillToken: "pattern-silt-horizontal-dash",
      strokeToken: "ink",
      strokeWidthMpt: 300,
    },
    {
      id: "node:sample-glyph",
      kind: "circle",
      semanticId: "column-sample",
      parentId: root.id,
      role: "sample-glyph",
      order: 5,
      provenance: clone(boringLogMvpFixture.samples[0].provenance),
      center: { xMpt: 265_000, yMpt: 142_000 },
      radiusMpt: 2_000,
      fillToken: "selection",
      strokeToken: "ink",
      strokeWidthMpt: 500,
    },
  ];
  root.childIds.push(...vectorNodes.map(({ id }) => id));
  scene.pages[0].nodes.push(...vectorNodes);
  scene.pages[0].semanticOrder.push(
    "region-header",
    "column-depth",
    "column-lithology",
    "column-sample",
  );
  const result = validateResolvedBoringLogPageScene(scene);
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(
    result.value.pages[0].nodes.map(({ kind }) => kind),
    ["group", "text", "rect", "line", "path", "circle"],
  );

  const brokenPaint = clone(scene);
  brokenPaint.pages[0].nodes[2].fillToken = "token:missing";
  assert.equal(
    validateResolvedBoringLogPageScene(brokenPaint).code,
    "BORING_LOG_CONTRACT_BROKEN_REFERENCE",
  );
});

test("BLD-023 preserves source-original and effective-override provenance", () => {
  const input = layoutJob();
  const source = input.document.samples[0].provenance;
  input.document.samples[0].provenance = {
    provenanceClass: "effective-override",
    original: source,
    overrideIdentity: "override:sample-01-label",
    overrideRevision: 2,
    transformation: "replace-display-value",
  };
  const result = validateBoringLogLayoutJobInput(input);
  assert.equal(result.accepted, true);
  assert.equal(result.value.document.samples[0].provenance.provenanceClass, "effective-override");
  assert.deepEqual(result.value.document.samples[0].provenance.original, source);
});

test("BLD-023 rejects float mpt, invalid depth ranges, duplicates, and broken references", () => {
  const floatGeometry = layoutJob();
  floatGeometry.template.page.widthMpt = 612_000.5;
  assert.equal(
    validateBoringLogLayoutJobInput(floatGeometry).code,
    "BORING_LOG_CONTRACT_INVALID_GEOMETRY",
  );

  const depthGap = layoutJob();
  depthGap.document.lithologyIntervals[1].depthFromFt = 16;
  assert.equal(
    validateBoringLogLayoutJobInput(depthGap).code,
    "BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE",
  );

  const duplicateSample = layoutJob();
  duplicateSample.document.samples[1].id = duplicateSample.document.samples[0].id;
  assert.equal(
    validateBoringLogLayoutJobInput(duplicateSample).code,
    "BORING_LOG_CONTRACT_DUPLICATE_IDENTITY",
  );

  const brokenAxis = layoutJob();
  brokenAxis.document.dataTrack.layers[0].axisId = "axis:missing";
  assert.equal(
    validateBoringLogLayoutJobInput(brokenAxis).code,
    "BORING_LOG_CONTRACT_BROKEN_REFERENCE",
  );

  const brokenScene = resolvedScene();
  brokenScene.pages[0].nodes[1].measurementId = "measure:missing";
  assert.equal(
    validateResolvedBoringLogPageScene(brokenScene).code,
    "BORING_LOG_CONTRACT_BROKEN_REFERENCE",
  );
});

test("BLD-023 rejects incompatible axis units, noncanonical order, and extra fields", () => {
  const incompatible = layoutJob();
  incompatible.document.dataTrack.axes[0].unit = "percent";
  assert.equal(
    validateBoringLogLayoutJobInput(incompatible).code,
    "BORING_LOG_CONTRACT_INCOMPATIBLE_AXIS",
  );

  const unorderedPlan = pagePlan();
  unorderedPlan.pages[0].pageIndex = 1;
  assert.equal(validateBoringLogPagePlan(unorderedPlan).code, "BORING_LOG_CONTRACT_INVALID_ORDER");

  const duplicateNodeOrder = resolvedScene();
  duplicateNodeOrder.pages[0].nodes[1].order = 0;
  assert.equal(
    validateResolvedBoringLogPageScene(duplicateNodeOrder).code,
    "BORING_LOG_CONTRACT_INVALID_ORDER",
  );

  const extraField = layoutJob();
  extraField.template.page.bleedMpt = 3_000;
  assert.equal(validateBoringLogLayoutJobInput(extraField).code, "BORING_LOG_CONTRACT_EXTRA_FIELD");
});

test("BLD-023 validates structured blow increments, refusal outcomes, and material tokens", () => {
  const accepted = layoutJob();
  assert.equal(accepted.document.samples[5].refusal, true);
  assert.equal(accepted.document.samples[5].nValue, null);
  assert.deepEqual(accepted.document.samples[5].blowIncrements, [
    { blows: 16, penetrationInches: 6 },
    { blows: 50, penetrationInches: 4 },
  ]);
  assert.equal(validateBoringLogLayoutJobInput(accepted).accepted, true);

  const missingPenetration = layoutJob();
  delete missingPenetration.document.samples[0].blowIncrements[0].penetrationInches;
  assert.equal(
    validateBoringLogLayoutJobInput(missingPenetration).code,
    "BORING_LOG_CONTRACT_MISSING_FIELD",
  );

  const excessivePenetration = layoutJob();
  excessivePenetration.document.samples[0].blowIncrements[0].penetrationInches = 7;
  assert.equal(
    validateBoringLogLayoutJobInput(excessivePenetration).code,
    "BORING_LOG_CONTRACT_WRONG_TYPE",
  );

  const contradictoryRefusal = layoutJob();
  contradictoryRefusal.document.samples[0].refusal = true;
  assert.equal(
    validateBoringLogLayoutJobInput(contradictoryRefusal).code,
    "BORING_LOG_CONTRACT_WRONG_TYPE",
  );

  const missingFillAuthority = layoutJob();
  delete missingFillAuthority.document.lithologyIntervals[0].materialFillToken;
  assert.equal(
    validateBoringLogLayoutJobInput(missingFillAuthority).code,
    "BORING_LOG_CONTRACT_MISSING_FIELD",
  );

  const brokenFillAuthority = layoutJob();
  brokenFillAuthority.document.lithologyIntervals[0].materialFillToken = "missing-fill-token";
  assert.equal(
    validateBoringLogLayoutJobInput(brokenFillAuthority).code,
    "BORING_LOG_CONTRACT_BROKEN_REFERENCE",
  );
});

test("BLD-023 rejects image, raster, background, and screenshot shortcuts", () => {
  const background = layoutJob();
  background.document.metadata.backgroundImage = "page.png";
  assert.equal(
    validateBoringLogLayoutJobInput(background).code,
    "BORING_LOG_CONTRACT_FORBIDDEN_RASTER",
  );

  const rasterToken = resolvedScene();
  rasterToken.resources.visualTokens.backgroundImage = "data:image/png;base64,not-allowed";
  assert.equal(
    validateResolvedBoringLogPageScene(rasterToken).code,
    "BORING_LOG_CONTRACT_FORBIDDEN_RASTER",
  );
});
