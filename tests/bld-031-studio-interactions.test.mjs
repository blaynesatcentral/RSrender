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
import { createBoringLogStudioHtml } from "../packages/renderer-ui/dist/index.js";
import {
  buildBoringLogStudioTree,
  visibleBoringLogStudioTreeItems,
} from "../packages/renderer-ui/dist/boring-log-studio-tree.js";
import { deterministicTextResults } from "./helpers/bld-024-deterministic-text-authority.mjs";

function resolvedScene(textOccurrenceClones = undefined, textOccurrenceGroups = undefined) {
  const template = structuredClone(boringLogMvpTemplate);
  if (textOccurrenceClones !== undefined) template.textOccurrenceClones = textOccurrenceClones;
  if (textOccurrenceGroups !== undefined) template.textOccurrenceGroups = textOccurrenceGroups;
  const preparation = prepareBoringLogLayout({
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-031-studio-interactions@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template,
  });
  assert.equal(preparation.accepted, true);
  const result = resolveBoringLogPageScene(
    preparation.value,
    deterministicTextResults(preparation.value.textRequests),
  );
  assert.equal(result.accepted, true);
  return result.value;
}

test("BLD-040 places structured duplicate occurrences under their semantic Contents parent", () => {
  const cloneSemanticId = "header-company:clone:tree-copy";
  const items = buildBoringLogStudioTree(
    resolvedScene([
      {
        cloneNodeId: "node:clone:tree-copy",
        sourceOccurrenceNodeId: "node:header-company",
        semanticId: cloneSemanticId,
        offsetXMpt: 10_000,
        offsetYMpt: 10_000,
      },
    ]),
  );
  assert.ok(
    items.some(
      ({ semanticId, parentSemanticId, label }) =>
        semanticId === cloneSemanticId &&
        parentSemanticId === "region-header" &&
        label === "Company Name (Copy)",
    ),
  );
});

test("BLD-040 nests authored groups and their text children in Contents", () => {
  const groupSemanticId = "user-group:header-titles";
  const items = buildBoringLogStudioTree(
    resolvedScene(undefined, [
      {
        groupNodeId: "node:user-group:header-titles",
        semanticId: groupSemanticId,
        parentNodeId: "node:region-header",
        childOccurrenceNodeIds: ["node:header-title", "node:header-sheet"],
      },
    ]),
  );
  assert.ok(
    items.some(
      ({ semanticId, parentSemanticId, level }) =>
        semanticId === groupSemanticId && parentSemanticId === "region-header" && level === 3,
    ),
  );
  assert.ok(
    items.some(
      ({ semanticId, parentSemanticId, level }) =>
        semanticId === "header-title" && parentSemanticId === groupSemanticId && level === 4,
    ),
  );
  assert.ok(
    items.some(
      ({ semanticId, parentSemanticId, level }) =>
        semanticId === "header-sheet" && parentSemanticId === groupSemanticId && level === 4,
    ),
  );
});

test("BLD-031 builds a collapsible semantic tree and preserves filtered ancestry", () => {
  const items = buildBoringLogStudioTree(resolvedScene());
  assert.equal(items[0].semanticId, "page-root");
  assert.equal(items[0].hasChildren, true);
  assert.ok(
    items.some(
      ({ semanticId, level, label }) =>
        semanticId === "sample:sample-01" && level === 4 && label === "Sample S-1",
    ),
  );
  assert.ok(
    items.some(
      ({ semanticId, label }) =>
        semanticId === "lithology:stratum-01" && label === "Stratum 1 — Silt (ML)",
    ),
  );
  assert.deepEqual(
    visibleBoringLogStudioTreeItems(items, new Set(["page-root"]), "").map(
      ({ semanticId }) => semanticId,
    ),
    ["page-root"],
  );
  const filtered = visibleBoringLogStudioTreeItems(items, new Set(["page-root"]), "sample s-1");
  assert.deepEqual(
    filtered.map(({ semanticId }) => semanticId),
    ["page-root", "region-depth-body", "column-sample", "sample:sample-01"],
  );
});

test("BLD-031 route exposes live ribbon tabs, property tabs, and disclosure controls", () => {
  const html = createBoringLogStudioHtml(resolvedScene());
  assert.equal((html.match(/data-ribbon-tab=/gu) ?? []).length, 5);
  for (const tab of ["home", "layout", "data", "review", "publish"]) {
    assert.match(html, new RegExp(`data-ribbon-tab="${tab}"`, "u"));
    assert.match(html, new RegExp(`data-ribbon-panel="${tab}"`, "u"));
  }
  assert.match(html, /id="properties-scroll" class="properties-scroll" tabindex="0"/u);
  assert.match(html, /id="property-tab-element"[^>]+aria-controls="property-element-panel"/u);
  assert.match(
    html,
    /id="property-tab-diagnostics"[^>]+aria-controls="property-diagnostics-panel"/u,
  );
  assert.equal((html.match(/<details class="property-group" open>/gu) ?? []).length, 2);
  assert.match(html, /<details class="property-group"><summary>Advanced diagnostics<\/summary>/u);
});

test("BLD-031 constrains both side panes to independent scroll regions", async () => {
  const stylesheet = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url),
    "utf8",
  );
  assert.match(stylesheet, /\.contents-pane\s*\{[^}]*grid-template-rows:[^}]*minmax\(0, 1fr\)/su);
  assert.match(stylesheet, /\.contents-tree\s*\{[^}]*overflow:\s*auto/su);
  assert.match(stylesheet, /\.properties-pane\s*\{[^}]*grid-template-rows:[^}]*minmax\(0, 1fr\)/su);
  assert.match(stylesheet, /\.properties-scroll\s*\{[^}]*overflow-y:\s*auto/su);
});
