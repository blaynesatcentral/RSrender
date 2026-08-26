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
  boringLogStudioElementLabel,
  buildBoringLogStudioTree,
} from "../packages/renderer-ui/dist/boring-log-studio-tree.js";
import { deterministicTextResults } from "./helpers/bld-024-deterministic-text-authority.mjs";

function resolvedScene() {
  const preparation = prepareBoringLogLayout({
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-062-human-labels@r1",
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

test("BLD-062 derives useful labels while preserving semantic synchronization keys", () => {
  const scene = resolvedScene();
  assert.equal(boringLogStudioElementLabel(scene, "sample:sample-01"), "Sample S-1");
  assert.equal(boringLogStudioElementLabel(scene, "lithology:stratum-01"), "Stratum 1 — Silt (ML)");
  assert.equal(
    boringLogStudioElementLabel(scene, "data-layer:layer-n-value:sample-01"),
    "N value — S-1",
  );
  assert.match(boringLogStudioElementLabel(scene, "remark:remark-01"), /^Remark — Surface:/u);

  const items = buildBoringLogStudioTree(scene);
  assert.ok(
    items.some(
      ({ semanticId, label }) => semanticId === "sample:sample-01" && label === "Sample S-1",
    ),
  );
  assert.ok(items.every(({ label }) => !label.startsWith("Sample:Sample")));
  assert.ok(items.every(({ label }) => !label.startsWith("Lithology:Stratum")));
});

test("BLD-062 keeps exact identifiers in Advanced diagnostics, not normal selection status", async () => {
  const [entry, route] = await Promise.all([
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-route.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(entry, /selectionStatus\.textContent = elementLabel\(effectiveSemanticId\)/u);
  assert.match(
    entry,
    /\$\{elementLabel\(effectiveSemanticId\)\} selected\. Canvas, Contents, and Properties synchronized\./u,
  );
  assert.doesNotMatch(entry, /Selected exact occurrence \$\{representative\.id\}/u);
  assert.doesNotMatch(entry, /selectionStatus\.textContent = `[^`]*\$\{representative\.id\}/u);
  assert.match(route, /<dt>Semantic ID<\/dt><dd id="property-semantic-id">/u);
  assert.match(route, /<dt>Occurrence ID<\/dt><dd id="property-node-id">/u);
});
