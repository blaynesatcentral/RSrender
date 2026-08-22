import assert from "node:assert/strict";
import test from "node:test";

import {
  applyBoringLogTextMeasurements,
  boringLogTextResolutionRevision,
  prepareBoringLogLayout,
  resolveBoringLogPageScene,
} from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import { strictCoverageTextResults } from "./helpers/bld-033-strict-text-authority.mjs";

function authority() {
  const prepared = prepareBoringLogLayout({
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-033-text-resolution@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  });
  assert.equal(prepared.accepted, true);
  const legacy = strictCoverageTextResults(prepared.value.textRequests);
  const scene = resolveBoringLogPageScene(prepared.value, legacy);
  assert.equal(scene.accepted, true);
  const faces = new Map(legacy.map((result) => [result.measurementId, result]));
  const exact = prepared.value.textRequests.map((request) => {
    const face = faces.get(request.measurementId);
    return {
      measurementId: request.measurementId,
      fontFaceDigest: face.fontFaceDigest,
      fontMetricsDigest: face.fontMetricsDigest,
      logicalBounds: { xMpt: 0, yMpt: 0, widthMpt: 0, heightMpt: request.lineHeightMpt },
      inkBounds: { xMpt: 0, yMpt: 0, widthMpt: 0, heightMpt: 0 },
      lines: [
        {
          text: request.text,
          sourceStartUtf16: request.sourceStartUtf16,
          sourceEndUtf16: request.sourceEndUtf16,
          xMpt: 0,
          baselineMpt: request.fontSizeMpt,
          advanceMpt: 0,
        },
      ],
      overflow: "none",
    };
  });
  return { scene: scene.value, requests: prepared.value.textRequests, exact };
}

test("BLD-033 installs exact ordered text results with complete UTF-16 source coverage", () => {
  const { scene, exact } = authority();
  const applied = applyBoringLogTextMeasurements(scene, exact);
  assert.equal(boringLogTextResolutionRevision, "bld-033-text-resolution-v1");
  assert.equal(applied.accepted, true, applied.code);
  assert.deepEqual(applied.scene.diagnostics, []);
  assert.equal(applied.scene.textResults.length, exact.length);
});

test("BLD-033 rejects reordered results and source gaps, and diagnoses ink outside a frame", () => {
  const { scene, requests, exact } = authority();
  const reordered = structuredClone(exact);
  [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
  assert.equal(applyBoringLogTextMeasurements(scene, reordered).accepted, false);

  const gapped = structuredClone(exact);
  gapped[0].lines[0].text = requests[0].text.slice(1);
  gapped[0].lines[0].sourceStartUtf16 += 1;
  gapped[0].overflow = "clipped";
  assert.equal(applyBoringLogTextMeasurements(scene, gapped).accepted, false);

  const colliding = structuredClone(exact);
  colliding[0].inkBounds.widthMpt = requests[0].maximumWidthMpt + 1;
  const applied = applyBoringLogTextMeasurements(scene, colliding);
  assert.equal(applied.accepted, true, applied.code);
  assert.equal(applied.scene.diagnostics[0].code, "BORING_LOG_TEXT_INK_OUTSIDE_FRAME");
  assert.equal(applied.scene.diagnostics[0].severity, "error");
});

test("BLD-033 reports positive-area text intersections in stable measurement order", () => {
  const { scene, exact } = authority();
  const overlappingScene = structuredClone(scene);
  const textNodes = overlappingScene.pages[0].nodes.filter(({ kind }) => kind === "text");
  textNodes[1].frame = structuredClone(textNodes[0].frame);
  const overlapping = structuredClone(exact);
  for (const result of overlapping.slice(0, 2)) {
    result.logicalBounds = { xMpt: 0, yMpt: 0, widthMpt: 1_000, heightMpt: 1_000 };
    result.inkBounds = { xMpt: 0, yMpt: 0, widthMpt: 1_000, heightMpt: 1_000 };
    result.lines[0].advanceMpt = 1_000;
  }
  const applied = applyBoringLogTextMeasurements(overlappingScene, overlapping);
  assert.equal(applied.accepted, true, applied.code);
  const collisions = applied.scene.diagnostics.filter(
    ({ code }) => code === "BORING_LOG_TEXT_COLLISION",
  );
  assert.equal(collisions.length, 1);
  const ordered = [overlapping[0].measurementId, overlapping[1].measurementId].sort((left, right) =>
    left.localeCompare(right, "en-US"),
  );
  assert.equal(collisions[0].message.includes(`${ordered[0]} and ${ordered[1]}`), true);
});
