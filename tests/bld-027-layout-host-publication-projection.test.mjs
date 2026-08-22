import assert from "node:assert/strict";
import test from "node:test";

import {
  measureBoringLogTextRequests,
  projectBoringLogSceneForPublication,
} from "../packages/layout-host/dist/index.js";
import { prepareBoringLogLayout, resolveBoringLogPageScene } from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

function resolvedScene() {
  const prepared = prepareBoringLogLayout({
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-027-publication@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  });
  assert.equal(prepared.accepted, true);
  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true);
  const resolved = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(resolved.accepted, true);
  return resolved.value;
}

test("BLD-027 Layout Host projects the validated scene as fixed non-wrapping publication HTML", () => {
  const scene = resolvedScene();
  const result = projectBoringLogSceneForPublication(scene);
  assert.equal(result.accepted, true, JSON.stringify(result));
  const { manifest, html, svgMarkup, projectionDigest, documentTitle } = result.projection;
  assert.equal(manifest.widthMpt, 612_000);
  assert.equal(manifest.heightMpt, 792_000);
  assert.equal(manifest.sceneNodeCount, 328);
  assert.equal(manifest.semanticElementCount, 90);
  assert.equal(manifest.sceneInputDigest, scene.inputDigest);
  assert.match(manifest.sceneDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.match(projectionDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.ok(documentTitle.includes(manifest.sceneDigest));
  assert.ok(documentTitle.includes(projectionDigest));
  assert.ok(html.includes("@page{size:612pt 792pt;margin:0}"));
  assert.ok(html.includes("text,tspan{white-space:pre}"));
  assert.ok(svgMarkup.includes('viewBox="0 0 612 792"'));
  assert.ok(svgMarkup.includes('width="612pt"'));
  assert.ok(svgMarkup.includes('height="792pt"'));
  assert.match(
    svgMarkup,
    /<pattern id="pattern-silt-horizontal-dash"[^>]*>[\s\S]*?<path d="M 0 2\.500 L 2 2\.500"/u,
  );
  assert.match(svgMarkup, /id="node:data-layer:layer-moisture:line"[^>]*stroke-dasharray="3 2"/u);
  assert.match(svgMarkup, /data-node-role="legend-symbol-split-spoon-cutout"/u);
  assert.match(svgMarkup, /data-node-role="legend-symbol-moisture-line"/u);
  assert.match(svgMarkup, /data-node-role="legend-symbol-pl-open"/u);
  assert.match(svgMarkup, /data-node-role="legend-symbol-ll-filled"/u);
  assert.equal((svgMarkup.match(/class="scene-node"/gu) ?? []).length, 328);
  assert.equal((svgMarkup.match(/<tspan/gu) ?? []).length, manifest.textLineCount);
  assert.equal(/<(?:img|image|canvas|picture)\b/iu.test(html), false);
  assert.equal(/<script\b/iu.test(html), false);
  assert.equal(/https?:\/\//iu.test(html.replace("http://www.w3.org/2000/svg", "")), false);
});

test("BLD-027 publication uses the same reference symbol grammar as screen SVG", () => {
  const result = projectBoringLogSceneForPublication(resolvedScene());
  assert.equal(result.accepted, true);
  const { svgMarkup } = result.projection;
  assert.match(
    svgMarkup,
    /<pattern id="pattern-silt-horizontal-dash"[^>]*>[\s\S]*?<path d="M 0 2\.500 L 2 2\.500"/u,
  );
  assert.match(svgMarkup, /id="node:data-layer:layer-moisture:line"[^>]*stroke-dasharray="3 2"/u);
  for (const role of [
    "legend-symbol-split-spoon-cutout",
    "legend-symbol-moisture-line",
    "legend-symbol-pl-open",
    "legend-symbol-ll-filled",
  ]) {
    assert.match(svgMarkup, new RegExp(`data-node-role="${role}"`, "u"));
  }
});

test("BLD-027 publication projection preserves every resolved source range and is deterministic", () => {
  const scene = resolvedScene();
  const first = projectBoringLogSceneForPublication(scene);
  const second = projectBoringLogSceneForPublication(structuredClone(scene));
  assert.equal(first.accepted, true);
  assert.deepEqual(second, first);
  for (const result of scene.textResults) {
    for (const line of result.lines) {
      assert.ok(
        first.projection.svgMarkup.includes(`data-source-start="${line.sourceStartUtf16}"`),
      );
      assert.ok(first.projection.svgMarkup.includes(`data-source-end="${line.sourceEndUtf16}"`));
    }
  }
  const tampered = structuredClone(scene);
  tampered.pages[0].widthMpt = 612_000.5;
  assert.deepEqual(projectBoringLogSceneForPublication(tampered), {
    accepted: false,
    code: "BORING_LOG_PUBLICATION_SCENE_REJECTED",
  });
});
