import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { prepareBoringLogLayout, resolveBoringLogPageScene } from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import {
  boringLogStudioScriptUrl,
  boringLogStudioStylesheetUrl,
  boringLogSvgProjectionRevision,
  createBoringLogStudioHtml,
  projectBoringLogSceneToSvg,
} from "../packages/renderer-ui/dist/index.js";
import { deterministicTextResults } from "./helpers/bld-024-deterministic-text-authority.mjs";

function resolvedScene() {
  const preparation = prepareBoringLogLayout({
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-025-svg-test@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  });
  assert.equal(preparation.accepted, true);
  const result = resolveBoringLogPageScene(
    preparation.value,
    deterministicTextResults(preparation.value.textRequests),
  );
  assert.equal(result.accepted, true);
  return result.value;
}

test("BLD-025 projects the validated scene into ordered semantic vector SVG", () => {
  const scene = resolvedScene();
  const result = projectBoringLogSceneToSvg(scene);
  assert.equal(boringLogSvgProjectionRevision, "bld-025-svg-projection-v1");
  assert.equal(result.accepted, true);
  assert.equal(result.semanticElementCount, 319);
  assert.match(result.markup, /^<svg[^>]+viewBox="0 0 612000 792000"/u);
  assert.match(result.markup, /data-scene-input-digest="sha256:[0-9a-f]{64}"/u);
  assert.match(result.markup, /<pattern[^>]+pattern-silt-horizontal-dash/u);
  assert.match(result.markup, /data-node-role="material-description-interval"/u);
  assert.match(result.markup, /data-node-role="sample-n-value"/u);
  assert.match(result.markup, /data-node-role="data-polyline"/u);
  assert.match(result.markup, /data-node-role="approval-seal-box"/u);
  assert.match(result.markup, /data-node-role="approval-signature-line"/u);
  assert.match(result.markup, /data-provenance="source"/u);
  assert.doesNotMatch(result.markup, /<(?:img|image|canvas|foreignObject)\b/iu);
  assert.doesNotMatch(result.markup, /(?:data:image|\.png\b|\.jpe?g\b)/iu);
});

test("BLD-025 selection is projected by semantic identity without changing scene authority", () => {
  const scene = resolvedScene();
  const selected = projectBoringLogSceneToSvg(scene, "lithology:stratum-01");
  assert.equal(selected.accepted, true);
  assert.match(
    selected.markup,
    /data-semantic-id="lithology:stratum-01"[^>]+class="scene-node is-selected"/u,
  );
  assert.equal(selected.scene.inputDigest, scene.inputDigest);
  assert.deepEqual(selected.scene.pages[0].nodes, scene.pages[0].nodes);
});

test("BLD-025 Studio route is a modern three-pane shell with inert structured scene data", () => {
  const scene = resolvedScene();
  const html = createBoringLogStudioHtml(scene);
  assert.match(html, /RSrender Boring Log Studio/u);
  assert.match(html, /class="pane contents-pane"/u);
  assert.match(html, /class="canvas-workspace"/u);
  assert.match(html, /class="pane properties-pane"/u);
  assert.match(html, /id="resolved-page-scene" type="application\/json"/u);
  assert.match(html, new RegExp(`href="${boringLogStudioStylesheetUrl}"`, "u"));
  assert.match(html, new RegExp(`src="${boringLogStudioScriptUrl}"`, "u"));
  assert.doesNotMatch(html, /<(?:img|canvas|picture)\b/iu);
  assert.equal((html.match(/<script/gu) ?? []).length, 2);
  const escaped = createBoringLogStudioHtml({ text: "</script><img src=x>" });
  assert.doesNotMatch(escaped, /<img\b/iu);
  assert.match(escaped, /\\u003c\/script>/u);
});

test("BLD-025 browser authority contains no raster, ambient transport, or inline style shortcut", async () => {
  const [entry, stylesheet] = await Promise.all([
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(entry, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b/u);
  assert.doesNotMatch(entry, /\.style\b|setAttribute\(["']style/u);
  assert.doesNotMatch(
    entry,
    /(?:createElement\(["']canvas|toDataURL|drawImage|\.png\b|\.jpe?g\b)/iu,
  );
  assert.doesNotMatch(stylesheet, /background-image|url\(/iu);
});

test("BLD-025 rejects malformed or raster-bearing scene inputs at the SVG boundary", () => {
  assert.deepEqual(projectBoringLogSceneToSvg(null), {
    accepted: false,
    code: "BORING_LOG_SVG_SCENE_REJECTED",
    detail: "BORING_LOG_CONTRACT_MALFORMED",
  });
  const scene = structuredClone(resolvedScene());
  scene.pages[0].nodes[0].kind = "image";
  const result = projectBoringLogSceneToSvg(scene);
  assert.equal(result.accepted, false);
});
