import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";

import { sha256CanonicalJson } from "../packages/contracts/dist/index.js";
import { prepareBoringLogLayout, resolveBoringLogPageScene } from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import { deterministicTextResults } from "./helpers/bld-024-deterministic-text-authority.mjs";

function layoutJob() {
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:mvp-boring-log-test-01@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: globalThis.structuredClone(boringLogMvpFixture),
    template: globalThis.structuredClone(boringLogMvpTemplate),
  };
}

function resolvedFixtureScene() {
  const preparation = prepareBoringLogLayout(layoutJob());
  assert.equal(preparation.accepted, true, JSON.stringify(preparation));
  const scene = resolveBoringLogPageScene(
    preparation.value,
    deterministicTextResults(preparation.value.textRequests),
  );
  assert.equal(scene.accepted, true, JSON.stringify(scene));
  return { preparation: preparation.value, scene: scene.value };
}

test("BLD-024 deterministically prepares the exact one-page plan and text authority requests", () => {
  const first = prepareBoringLogLayout(layoutJob());
  const second = prepareBoringLogLayout(layoutJob());
  assert.equal(first.accepted, true);
  assert.equal(second.accepted, true);
  assert.deepEqual(second.value, first.value);
  assert.equal(first.value.pagePlan.pages.length, 1);
  assert.equal(first.value.pagePlan.pages[0].widthMpt, 612_000);
  assert.equal(first.value.pagePlan.pages[0].heightMpt, 792_000);
  assert.equal(first.value.pagePlan.pages[0].depthRange.startFt, 0);
  assert.equal(first.value.pagePlan.pages[0].depthRange.endFt, 40);
  assert.equal(first.value.pagePlan.pages[0].depthTransform.yStartMpt, 130_000);
  assert.equal(first.value.pagePlan.pages[0].depthTransform.yEndMpt, 611_000);
  assert.deepEqual(
    first.value.pagePlan.pages[0].columns.map(({ role }) => role),
    boringLogMvpTemplate.columns.map(({ role }) => role),
  );
  assert.ok(first.value.textRequests.length > 75);
  assert.ok(
    first.value.textRequests.every(
      ({ sourceStartUtf16, sourceEndUtf16, text }) =>
        sourceEndUtf16 - sourceStartUtf16 === text.length,
    ),
  );
});

test("BLD-024 resolves every required boring-log section into one common vector scene", () => {
  const { scene } = resolvedFixtureScene();
  assert.equal(scene.pages.length, 1);
  assert.equal(scene.pages[0].rootNodeId, "node:page-root");
  assert.ok(scene.pages[0].nodes.length > 175);
  assert.deepEqual([...new Set(scene.pages[0].nodes.map(({ kind }) => kind))].sort(), [
    "circle",
    "group",
    "line",
    "path",
    "rect",
    "text",
  ]);
  const roles = new Set(scene.pages[0].nodes.map(({ role }) => role));
  for (const role of [
    "company-name",
    "document-title",
    "project-metadata-label",
    "project-metadata-value",
    "depth-minor-tick",
    "elevation-label",
    "depth-label",
    "lithology-pattern-interval",
    "material-description-interval",
    "sample-label",
    "sample-recovery",
    "sample-blows",
    "sample-n-value",
    "sample-symbol-split-spoon",
    "sample-refusal-glyph",
    "data-polyline",
    "data-range",
    "remark-interval",
    "legend-label",
    "publication-note",
    "approval-seal-box",
    "approval-signature-line",
  ]) {
    assert.equal(roles.has(role), true, `missing role ${role}`);
  }
  assert.equal(scene.resources.patterns.length, 3);
  assert.equal(scene.textRequests.length, scene.textResults.length);
  assert.equal(scene.inputDigest, sha256CanonicalJson(layoutJob()));
});

test("BLD-024 accounts for every interval, sample, plot value, remark, legend, note, and approval item", () => {
  const { scene } = resolvedFixtureScene();
  const nodes = scene.pages[0].nodes;
  for (const interval of boringLogMvpFixture.lithologyIntervals) {
    assert.ok(nodes.some(({ semanticId }) => semanticId === `lithology:${interval.id}`));
    interval.transitions.forEach((_, index) =>
      assert.ok(
        nodes.some(
          ({ semanticId }) => semanticId === `lithology:${interval.id}:transition:${index + 1}`,
        ),
      ),
    );
  }
  for (const sample of boringLogMvpFixture.samples) {
    assert.equal(nodes.filter(({ semanticId }) => semanticId === `sample:${sample.id}`).length, 8);
  }
  for (const layer of boringLogMvpFixture.dataTrack.layers) {
    for (const [sampleId] of layer.values) {
      assert.equal(
        nodes.filter(({ semanticId }) => semanticId === `data-layer:${layer.id}:${sampleId}`)
          .length,
        layer.kind === "numeric-polyline" ? 1 : 3,
      );
    }
    assert.equal(
      nodes.filter(({ semanticId }) => semanticId === `data-layer:${layer.id}`).length,
      layer.kind === "numeric-polyline" ? 1 : 0,
    );
  }
  for (const remark of boringLogMvpFixture.remarks) {
    assert.ok(nodes.some(({ semanticId }) => semanticId === `remark:${remark.id}`));
  }
  for (const item of boringLogMvpFixture.legend) {
    assert.ok(nodes.filter(({ semanticId }) => semanticId === `legend:${item.id}`).length >= 2);
  }
  assert.equal(nodes.filter(({ role }) => role === "publication-note").length, 8);
  assert.equal(nodes.filter(({ role }) => role === "approval-seal-box").length, 1);
  assert.equal(nodes.filter(({ role }) => role === "approval-signature-line").length, 1);
});

test("BLD-024 resolves the reference symbol grammar without projection-specific shortcuts", () => {
  const { scene } = resolvedFixtureScene();
  const nodes = scene.pages[0].nodes;
  const siltPattern = scene.resources.patterns.find(
    ({ id }) => id === "pattern-silt-horizontal-dash",
  );
  assert.equal(siltPattern?.kind, "horizontal-dash");

  const moistureLine = nodes.find(({ id }) => id === "node:data-layer:layer-moisture:line");
  assert.equal(moistureLine?.kind, "path");
  assert.deepEqual(moistureLine?.dashMpt, [3_000, 2_000]);

  const waterLegendLine = nodes.find(({ role }) => role === "legend-symbol-moisture-line");
  assert.equal(waterLegendLine?.kind, "line");
  assert.deepEqual(waterLegendLine?.dashMpt, moistureLine?.dashMpt);
  assert.ok(nodes.some(({ role }) => role === "legend-symbol-moisture-open-triangle"));
  assert.equal(nodes.filter(({ role }) => role === "legend-symbol-split-spoon-cutout").length, 2);

  const plEndpoints = nodes.filter(({ role }) => role === "data-range-endpoint-pl-open");
  const llEndpoints = nodes.filter(({ role }) => role === "data-range-endpoint-ll-filled");
  assert.ok(plEndpoints.length > 0);
  assert.equal(llEndpoints.length, plEndpoints.length);
  assert.ok(
    plEndpoints.every(
      (node) =>
        node.kind === "circle" &&
        node.fillToken === "pageFill" &&
        node.strokeToken === "plasticityTrack",
    ),
  );
  assert.ok(
    llEndpoints.every(
      (node) =>
        node.kind === "circle" &&
        node.fillToken === "plasticityTrack" &&
        node.strokeToken === "plasticityTrack",
    ),
  );
  assert.ok(nodes.some(({ role }) => role === "legend-symbol-pl-open"));
  assert.ok(nodes.some(({ role }) => role === "legend-symbol-ll-filled"));
});

test("BLD-024 uses one exact depth transform and stable integer-mpt geometry", () => {
  const { scene } = resolvedFixtureScene();
  const nodes = scene.pages[0].nodes;
  for (const sample of boringLogMvpFixture.samples) {
    const expectedY = 130_000 + Math.round(sample.depthFt * 12_025);
    const row = nodes.find(({ id }) => id === `node:sample:${sample.id}:row`);
    assert.equal(row.kind, "line");
    assert.equal(row.from.yMpt, expectedY);
    assert.equal(row.to.yMpt, expectedY);
  }
  const everyMpt = [];
  function collect(value, key = "") {
    if (key.endsWith("Mpt") && typeof value === "number") everyMpt.push(value);
    if (Array.isArray(value)) value.forEach((child) => collect(child));
    else if (value && typeof value === "object") {
      Object.entries(value).forEach(([childKey, child]) => collect(child, childKey));
    }
  }
  collect(scene);
  assert.ok(everyMpt.length > 1_000);
  assert.ok(everyMpt.every(Number.isSafeInteger));
});

test("BLD-024 preserves source and derived structural provenance without flattening overrides", () => {
  const input = layoutJob();
  const original = input.document.samples[0].provenance;
  input.document.samples[0].provenance = {
    provenanceClass: "effective-override",
    original,
    overrideIdentity: "override:sample-01",
    overrideRevision: 3,
    transformation: "replace-display-value",
  };
  const preparation = prepareBoringLogLayout(input);
  assert.equal(preparation.accepted, true);
  const result = resolveBoringLogPageScene(
    preparation.value,
    deterministicTextResults(preparation.value.textRequests),
  );
  assert.equal(result.accepted, true, JSON.stringify(result));
  const sampleNodes = result.value.pages[0].nodes.filter(
    ({ semanticId }) => semanticId === "sample:sample-01",
  );
  assert.ok(sampleNodes.length > 0);
  assert.ok(
    sampleNodes.every(({ provenance }) => provenance?.provenanceClass === "effective-override"),
  );
  assert.ok(
    sampleNodes.every(({ provenance }) => provenance.original.provenanceClass === "source"),
  );
});

test("BLD-024 makes overflow explicit and keeps the resolved text outcome unchanged", () => {
  const preparation = prepareBoringLogLayout(layoutJob());
  assert.equal(preparation.accepted, true);
  const forcedId = preparation.value.textRequests[0].measurementId;
  const results = deterministicTextResults(preparation.value.textRequests, new Set([forcedId]));
  const scene = resolveBoringLogPageScene(preparation.value, results);
  assert.equal(scene.accepted, true, JSON.stringify(scene));
  assert.equal(scene.value.pagePlan.overflow, "clipped-with-diagnostic");
  assert.ok(scene.value.diagnostics.some(({ code }) => code === "BORING_LOG_TEXT_OVERFLOW"));
  assert.deepEqual(scene.value.textResults, results);
});

test("BLD-024 fails closed for invalid input, missing text authority, and preparation drift", () => {
  const invalid = layoutJob();
  invalid.template.page.widthMpt = 612_000.25;
  assert.deepEqual(prepareBoringLogLayout(invalid), {
    accepted: false,
    code: "BORING_LOG_LAYOUT_INPUT_REJECTED",
    contractCode: "BORING_LOG_CONTRACT_INVALID_GEOMETRY",
  });

  const preparation = prepareBoringLogLayout(layoutJob());
  assert.equal(preparation.accepted, true);
  const results = deterministicTextResults(preparation.value.textRequests);
  assert.equal(
    resolveBoringLogPageScene(preparation.value, results.slice(1)).code,
    "BORING_LOG_LAYOUT_TEXT_RESULTS_MISMATCH",
  );

  const drifted = globalThis.structuredClone(preparation.value);
  drifted.textRequests[0].measurementId = "measure:drifted";
  assert.equal(
    resolveBoringLogPageScene(drifted, results).code,
    "BORING_LOG_LAYOUT_TEXT_RESULTS_MISMATCH",
  );

  let getterCalls = 0;
  const hostilePreparation = {};
  Object.defineProperty(hostilePreparation, "job", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return layoutJob();
    },
  });
  Object.defineProperty(hostilePreparation, "pagePlan", {
    enumerable: true,
    value: preparation.value.pagePlan,
  });
  Object.defineProperty(hostilePreparation, "textRequests", {
    enumerable: true,
    value: preparation.value.textRequests,
  });
  assert.equal(
    resolveBoringLogPageScene(hostilePreparation, results).code,
    "BORING_LOG_LAYOUT_TEXT_RESULTS_MISMATCH",
  );
  assert.equal(getterCalls, 0);

  const hostileResult = {};
  Object.defineProperty(hostileResult, "measurementId", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return preparation.value.textRequests[0].measurementId;
    },
  });
  assert.equal(
    resolveBoringLogPageScene(preparation.value, [hostileResult]).code,
    "BORING_LOG_LAYOUT_TEXT_RESULTS_MISMATCH",
  );
  assert.equal(getterCalls, 0);
});

test("BLD-024 repeats one exact normalized Page Plan and scene in fresh processes", () => {
  const helperPath = fileURLToPath(new URL("./helpers/run-bld-024-vectors.mjs", import.meta.url));
  const transcripts = [];
  for (let processIndex = 0; processIndex < 3; processIndex += 1) {
    for (let repetition = 0; repetition < 2; repetition += 1) {
      transcripts.push(
        JSON.parse(
          execFileSync(process.execPath, [helperPath], {
            encoding: "utf8",
            env: { ...process.env, LANG: "en-US", LC_ALL: "en-US", TZ: "UTC" },
          }).trim(),
        ),
      );
    }
  }
  assert.equal(transcripts.length, 6);
  assert.equal(new Set(transcripts.map((entry) => JSON.stringify(entry))).size, 1);
  assert.deepEqual(transcripts[0], {
    node: "v24.18.1",
    pagePlanDigest: "sha256:128e639895effbb9e2470035cdbb67cd838c0faa64d3efc749805dec503d1d04",
    sceneDigest: "sha256:6873137954097b4a5481696b729b19e48f649718c7f683058f60adbba0583a58",
    textRequestCount: 135,
    semanticCount: 90,
    nodeCount: 328,
    diagnosticCount: 0,
  });
});
