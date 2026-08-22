import assert from "node:assert/strict";
import test from "node:test";

import { prepareBoringLogLayout, resolveBoringLogPageScene } from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_ORACLE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpOracle,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import { deterministicTextResults } from "./helpers/bld-024-deterministic-text-authority.mjs";
import { inspectBoringLogReferenceFidelity } from "../tooling/inspect-boring-log-reference-fidelity.mjs";

function resolvedScene() {
  const preparation = prepareBoringLogLayout({
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-030-reference-fidelity",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  });
  assert.equal(preparation.accepted, true, JSON.stringify(preparation));
  const resolved = resolveBoringLogPageScene(
    preparation.value,
    deterministicTextResults(preparation.value.textRequests),
  );
  assert.equal(resolved.accepted, true, JSON.stringify(resolved));
  return resolved.value;
}

test("BLD-030 qualifies the full structured reference-shaped scene against the frozen oracle", () => {
  const inspection = inspectBoringLogReferenceFidelity({
    scene: resolvedScene(),
    oracle: boringLogMvpOracle,
  });
  assert.equal(inspection.result, "PASS", JSON.stringify(inspection));
  assert.deepEqual(inspection.diagnostics, []);
  assert.equal(inspection.oracleDigest, BORING_LOG_MVP_ORACLE_DIGEST);
  assert.equal(inspection.summary.nodeCount, 328);
  assert.equal(inspection.summary.semanticCount, 90);
  assert.equal(inspection.summary.roleCounts["sample-symbol-split-spoon"], 10);
  assert.equal(inspection.summary.roleCounts["data-polyline"], 2);
  assert.equal(inspection.summary.roleCounts["data-range"], 6);
  assert.equal(inspection.summary.provenanceCounts.source, 224);
  assert.ok(inspection.summary.textLineCount >= 150);
});

test("BLD-030 fails closed for geometry, ordering, provenance, and semantic coverage drift", () => {
  const cases = [
    [
      "geometry",
      (scene) => {
        scene.pagePlan.pages[0].columns[3].widthMpt += 1;
        scene.pagePlan.pages[0].columns[4].xMpt += 1;
        scene.pagePlan.pages[0].columns[4].widthMpt -= 1;
      },
      "REFERENCE_MAJOR_VERTICAL_EDGES_MISMATCH",
    ],
    [
      "ordering",
      (scene) => (scene.pages[0].nodes[8].order += 1),
      "SCENE_CONTRACT_REJECTED:BORING_LOG_CONTRACT_INVALID_ORDER",
    ],
    [
      "provenance",
      (scene) =>
        (scene.pages[0].nodes.find((node) => node.semanticId.startsWith("sample:")).provenance =
          null),
      "REFERENCE_DATA_PROVENANCE_MISSING",
    ],
    [
      "coverage",
      (scene) =>
        (scene.pages[0].nodes.find((node) => node.role === "sample-label").role =
          "missing-sample-label"),
      "REFERENCE_SAMPLES_COUNT_MISMATCH",
    ],
  ];
  for (const [label, mutate, expected] of cases) {
    const scene = structuredClone(resolvedScene());
    mutate(scene);
    const inspection = inspectBoringLogReferenceFidelity({ scene, oracle: boringLogMvpOracle });
    assert.equal(inspection.result, "FAIL", label);
    assert.ok(inspection.diagnostics.includes(expected), `${label}:${JSON.stringify(inspection)}`);
  }
});

test("BLD-030 reference registration is independent of template self-conformance", () => {
  function shiftDescriptionBoundary(shiftMpt) {
    const scene = structuredClone(resolvedScene());
    const oracle = structuredClone(boringLogMvpOracle);
    scene.pagePlan.pages[0].columns[3].widthMpt += shiftMpt;
    scene.pagePlan.pages[0].columns[4].xMpt += shiftMpt;
    scene.pagePlan.pages[0].columns[4].widthMpt -= shiftMpt;
    oracle.geometryAnchors.majorVerticalEdgesMpt[4] += shiftMpt;
    return inspectBoringLogReferenceFidelity({ scene, oracle });
  }
  const withinTolerance = shiftDescriptionBoundary(1_000);
  assert.equal(withinTolerance.result, "PASS", JSON.stringify(withinTolerance));
  const outsideTolerance = shiftDescriptionBoundary(2_000);
  assert.equal(outsideTolerance.result, "FAIL");
  assert.ok(
    outsideTolerance.diagnostics.includes("REFERENCE_INTERNAL_X_OUTSIDE_TOLERANCE:3"),
    JSON.stringify(outsideTolerance),
  );
});
