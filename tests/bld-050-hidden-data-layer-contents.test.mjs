import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  prepareBoringLogLayout,
  resolveBoringLogDataLayerSymbology,
  resolveBoringLogPageScene,
} from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";
import {
  buildBoringLogStudioTree,
  visibleBoringLogStudioTreeItems,
} from "../packages/renderer-ui/dist/boring-log-studio-tree.js";
import { sha256CanonicalJson } from "../packages/contracts/dist/index.js";
import { deterministicTextResults } from "./helpers/bld-024-deterministic-text-authority.mjs";

function hiddenNValueScene() {
  const document = structuredClone(boringLogMvpFixture);
  const template = structuredClone(boringLogMvpTemplate);
  const layer = document.dataTrack.layers.find(({ id }) => id === "layer-n-value");
  assert.ok(layer);
  const resolved = resolveBoringLogDataLayerSymbology({
    layer,
    legendLabel: "N, blows/ft",
    visualTokenIds: Object.keys(template.visualTokens),
  });
  assert.equal(resolved.accepted, true, resolved.code);
  const override = {
    ...resolved.value,
    kind: layer.kind,
    visible: false,
    legend: { visible: true, label: "N, blows/ft" },
    overrideIdentity: "urn:test:bld-050:hidden-n-value",
    overrideRevision: 1,
  };
  delete override.source;
  template.dataLayerSymbologyOverrides = [override];
  const prepared = prepareBoringLogLayout({
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-050-hidden-layer-contents@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: sha256CanonicalJson(template),
    document,
    template,
  });
  assert.equal(prepared.accepted, true, prepared.code);
  const scene = resolveBoringLogPageScene(
    prepared.value,
    deterministicTextResults(prepared.value.textRequests),
  );
  assert.equal(scene.accepted, true, scene.code);
  return scene.value;
}

test("BLD-050 keeps a non-rendered Data Layer in Contents for visibility recovery", () => {
  const scene = hiddenNValueScene();
  const semanticId = "data-layer:layer-n-value";
  assert.equal(
    scene.pages[0].nodes.some((node) => node.semanticId === semanticId),
    false,
    "the fixture must prove recovery without relying on a visible SVG node",
  );
  const items = buildBoringLogStudioTree(scene, [{ semanticId, label: "N value", visible: false }]);
  const hidden = items.find((item) => item.semanticId === semanticId);
  assert.deepEqual(hidden, {
    semanticId,
    parentSemanticId: "column-data-track",
    label: "N value",
    level: 4,
    icon: "·",
    hidden: true,
    hasChildren: false,
  });
  assert.deepEqual(
    visibleBoringLogStudioTreeItems(items, new Set(), "N value").map(
      ({ semanticId: candidate }) => candidate,
    ),
    ["page-root", "region-depth-body", "column-n-value", "column-data-track", semanticId],
  );
});

test("BLD-050 wires projected hidden layers through drawing/source Contents and Inspector recovery", async () => {
  const entry = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    entry,
    /buildBoringLogStudioTree\(\s*scene,\s*studioProjection\?\.dataLayerSymbologyStates \?\? \[\],\s*\)/u,
  );
  assert.match(
    entry,
    /\.\.\.\(studioProjection\?\.dataLayerSymbologyStates \?\? \[\]\)\.map\(\s*\(\{ semanticId \}\) => semanticId\),/u,
  );
  assert.match(entry, /row\.classList\.toggle\("is-hidden-element", item\.hidden\)/u);
  assert.match(entry, /hidden; select to edit visibility/u);
  assert.match(entry, /representative === undefined && selectedDataLayerState !== null/u);
  assert.match(entry, /populateDataLayerSymbology\(selectedDataLayerState\)/u);
});
