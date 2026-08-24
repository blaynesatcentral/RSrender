import assert from "node:assert/strict";
import test from "node:test";

import {
  boringLogPublicationPackageProjectionRevision,
  measureBoringLogTextRequests,
  projectBoringLogSceneSetForPublication,
} from "../packages/layout-host/dist/index.js";
import { prepareBoringLogLayout, resolveBoringLogPageScene } from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

function resolvedScene(template, jobId) {
  const prepared = prepareBoringLogLayout({
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId,
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template,
  });
  assert.equal(prepared.accepted, true, JSON.stringify(prepared));
  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true, JSON.stringify(measured));
  const resolved = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(resolved.accepted, true, JSON.stringify(resolved));
  return resolved.value;
}

function continuationTemplate() {
  const headerBoundary = 184_000;
  const footer = boringLogMvpTemplate.regions.find(({ role }) => role === "footer");
  assert.ok(footer);
  const regions = boringLogMvpTemplate.regions.map((region) =>
    region.role === "header"
      ? { ...region, heightMpt: 167_000 }
      : region.role === "depth-body"
        ? { ...region, yMpt: headerBoundary, heightMpt: footer.yMpt - headerBoundary }
        : region,
  );
  const yStartMpt = headerBoundary + 26_000;
  return {
    ...structuredClone(boringLogMvpTemplate),
    regions,
    depthTransform: {
      ...boringLogMvpTemplate.depthTransform,
      yStartMpt,
      yEndMpt: yStartMpt + 481_000,
    },
    pagination: {
      policy: "fixed-scale-continuation-v1",
      yEndLimitMpt: footer.yMpt,
    },
  };
}

function sceneSet() {
  const repeatedSingle = resolvedScene(
    structuredClone(boringLogMvpTemplate),
    "job:bld-044:single-letter",
  );
  const repeatedMulti = resolvedScene(continuationTemplate(), "job:bld-044:multi-letter");
  const mixedSizeTemplate = structuredClone(boringLogMvpTemplate);
  mixedSizeTemplate.page.widthMpt = 700_000;
  mixedSizeTemplate.page.heightMpt = 900_000;
  const repeatedMixedSize = resolvedScene(mixedSizeTemplate, "job:bld-044:single-mixed-size");
  assert.equal(repeatedSingle.pages.length, 1);
  assert.equal(repeatedMulti.pages.length, 2);
  assert.equal(repeatedMixedSize.pages.length, 1);
  assert.equal(repeatedSingle.pages[0].pageId, repeatedMulti.pages[0].pageId);
  assert.equal(repeatedSingle.pages[0].pageId, repeatedMixedSize.pages[0].pageId);
  return {
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-publication-scene-set.v1",
    kind: "boring-log.publication-scene-set",
    entries: [
      {
        boringLogIdentity: "urn:rsrender:boring-log:bld-044:01",
        explorationIdentity: "urn:rsrender:exploration:bld-044:01",
        sourceOrdinal: 1,
        scene: repeatedSingle,
      },
      {
        boringLogIdentity: "urn:rsrender:boring-log:bld-044:02",
        explorationIdentity: "urn:rsrender:exploration:bld-044:02",
        sourceOrdinal: 2,
        scene: repeatedMulti,
      },
      {
        boringLogIdentity: "urn:rsrender:boring-log:bld-044:03",
        explorationIdentity: "urn:rsrender:exploration:bld-044:03",
        sourceOrdinal: 3,
        scene: repeatedMixedSize,
      },
    ],
  };
}

test("BLD-044 scene-set projection preserves every Log Set page in exact source and page-plan order", () => {
  const input = sceneSet();
  const projected = projectBoringLogSceneSetForPublication(input);
  assert.equal(projected.accepted, true, JSON.stringify(projected));
  assert.equal(
    boringLogPublicationPackageProjectionRevision,
    "bld-044-layout-host-publication-package-v1",
  );
  const { manifest, html, svgMarkup } = projected.projection;
  assert.equal(manifest.entryCount, 3);
  assert.equal(manifest.pageCount, 4);
  assert.deepEqual(
    manifest.pages.map(
      ({ sourceOrdinal, sourcePageIndex, pagePlanIndex, widthMpt, heightMpt }) => ({
        sourceOrdinal,
        sourcePageIndex,
        pagePlanIndex,
        widthMpt,
        heightMpt,
      }),
    ),
    [
      {
        sourceOrdinal: 1,
        sourcePageIndex: 0,
        pagePlanIndex: 0,
        widthMpt: 612_000,
        heightMpt: 792_000,
      },
      {
        sourceOrdinal: 2,
        sourcePageIndex: 0,
        pagePlanIndex: 0,
        widthMpt: 612_000,
        heightMpt: 792_000,
      },
      {
        sourceOrdinal: 2,
        sourcePageIndex: 1,
        pagePlanIndex: 1,
        widthMpt: 612_000,
        heightMpt: 792_000,
      },
      {
        sourceOrdinal: 3,
        sourcePageIndex: 0,
        pagePlanIndex: 0,
        widthMpt: 700_000,
        heightMpt: 900_000,
      },
    ],
  );
  assert.deepEqual(
    manifest.pages.map(({ boringLogIdentity }) => boringLogIdentity),
    [
      input.entries[0].boringLogIdentity,
      input.entries[1].boringLogIdentity,
      input.entries[1].boringLogIdentity,
      input.entries[2].boringLogIdentity,
    ],
  );
  assert.equal((html.match(/<section\b/gu) ?? []).length, 4);
  assert.equal((svgMarkup.match(/<svg\b/gu) ?? []).length, 4);
  assert.ok(html.includes("@page rsrender_page_0001{size:612pt 792pt;margin:0}"));
  assert.ok(html.includes("@page rsrender_page_0004{size:700pt 900pt;margin:0}"));
  assert.equal(html.includes("@page{size:612pt 792pt"), false);
  const sourceOrder = [...html.matchAll(/data-source-ordinal="(\d+)"/gu)].map((match) =>
    Number(match[1]),
  );
  assert.deepEqual(sourceOrder, [1, 2, 2, 3]);
  assert.match(manifest.aggregateDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.match(projected.projection.projectionDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(Object.isFrozen(projected.projection), true);
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(Object.isFrozen(manifest.entries), true);
  assert.equal(Object.isFrozen(manifest.pages), true);
});

test("BLD-044 projection namespaces repeated DOM and resource IDs without losing authority", () => {
  const projected = projectBoringLogSceneSetForPublication(sceneSet());
  assert.equal(projected.accepted, true);
  const { html } = projected.projection;
  const ids = [...html.matchAll(/\sid="([^"]+)"/gu)].map((match) => match[1]);
  assert.equal(ids.length > 1_000, true);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(
    ids.every((id) => id.startsWith("rsrender-")),
    true,
  );
  const referencedIds = [...html.matchAll(/url\(#([^)]*)\)/gu)].map((match) => match[1]);
  assert.equal(referencedIds.length > 0, true);
  assert.equal(
    referencedIds.every((id) => ids.includes(id)),
    true,
  );
  assert.equal(
    (html.match(/data-authoritative-node-id=/gu) ?? []).length,
    projected.projection.manifest.pages.reduce((total, page) => total + page.sceneNodeCount, 0),
  );
  const repeatedPageId = sceneSet().entries[0].scene.pages[0].pageId;
  assert.equal(
    [...html.matchAll(/data-authoritative-page-id="([^"]+)"/gu)].filter(
      (match) => match[1] === repeatedPageId,
    ).length >= 3,
    true,
  );
  const repeatedRootNodeId = sceneSet().entries[0].scene.pages[0].rootNodeId;
  assert.equal(
    [...html.matchAll(/data-authoritative-node-id="([^"]+)"/gu)].filter(
      (match) => match[1] === repeatedRootNodeId,
    ).length >= 3,
    true,
  );
  const repeatedResourceId = sceneSet().entries[0].scene.resources.patterns[0].id;
  assert.equal(
    [...html.matchAll(/data-authoritative-resource-id="([^"]+)"/gu)].filter(
      (match) => match[1] === repeatedResourceId,
    ).length >= 3,
    true,
  );
  const originalDomIds = [...html.matchAll(/data-rsrender-original-dom-id="([^"]+)"/gu)].map(
    (match) => match[1],
  );
  assert.equal(new Set(originalDomIds).size < originalDomIds.length, true);
  const repeated = projectBoringLogSceneSetForPublication(structuredClone(sceneSet()));
  assert.deepEqual(repeated, projected);
});

test("BLD-044 reordered subsets preserve caller order and nonconsecutive source ordinals", () => {
  const complete = sceneSet();
  const subset = {
    ...complete,
    entries: [complete.entries[2], complete.entries[0]],
  };
  const projected = projectBoringLogSceneSetForPublication(subset);
  assert.equal(projected.accepted, true, JSON.stringify(projected));
  assert.deepEqual(
    projected.projection.manifest.entries.map(
      ({ boringLogIdentity, explorationIdentity, sourceOrdinal }) => ({
        boringLogIdentity,
        explorationIdentity,
        sourceOrdinal,
      }),
    ),
    [
      {
        boringLogIdentity: complete.entries[2].boringLogIdentity,
        explorationIdentity: complete.entries[2].explorationIdentity,
        sourceOrdinal: 3,
      },
      {
        boringLogIdentity: complete.entries[0].boringLogIdentity,
        explorationIdentity: complete.entries[0].explorationIdentity,
        sourceOrdinal: 1,
      },
    ],
  );
  assert.deepEqual(
    projected.projection.manifest.pages.map(({ sourceOrdinal, publicationPageIndex }) => ({
      sourceOrdinal,
      publicationPageIndex,
    })),
    [
      { sourceOrdinal: 3, publicationPageIndex: 0 },
      { sourceOrdinal: 1, publicationPageIndex: 1 },
    ],
  );
});

test("BLD-044 scene-set authority rejects malformed, duplicate, out-of-range, and invalid scenes", () => {
  const valid = sceneSet();
  assert.deepEqual(projectBoringLogSceneSetForPublication(null), {
    accepted: false,
    code: "BORING_LOG_PUBLICATION_SCENE_SET_MALFORMED",
  });
  assert.deepEqual(projectBoringLogSceneSetForPublication({ ...valid, entries: [] }), {
    accepted: false,
    code: "BORING_LOG_PUBLICATION_SCENE_SET_MALFORMED",
  });
  assert.deepEqual(
    projectBoringLogSceneSetForPublication({
      ...valid,
      entries: Array.from({ length: 65 }, () => valid.entries[0]),
    }),
    {
      accepted: false,
      code: "BORING_LOG_PUBLICATION_SCENE_SET_MALFORMED",
    },
  );
  assert.deepEqual(projectBoringLogSceneSetForPublication({ ...valid, unsupported: true }), {
    accepted: false,
    code: "BORING_LOG_PUBLICATION_SCENE_SET_MALFORMED",
  });
  for (const field of ["boringLogIdentity", "explorationIdentity", "sourceOrdinal"]) {
    const duplicate = structuredClone(valid);
    duplicate.entries[1][field] = duplicate.entries[0][field];
    assert.deepEqual(projectBoringLogSceneSetForPublication(duplicate), {
      accepted: false,
      code: "BORING_LOG_PUBLICATION_SCENE_SET_DUPLICATE",
    });
  }
  const outOfRange = structuredClone(valid);
  outOfRange.entries[1].sourceOrdinal = 65;
  assert.deepEqual(projectBoringLogSceneSetForPublication(outOfRange), {
    accepted: false,
    code: "BORING_LOG_PUBLICATION_SCENE_SET_MALFORMED",
  });
  const invalidScene = structuredClone(valid);
  invalidScene.entries[0].scene.pages[0].widthMpt += 0.5;
  assert.deepEqual(projectBoringLogSceneSetForPublication(invalidScene), {
    accepted: false,
    code: "BORING_LOG_PUBLICATION_SCENE_SET_SCENE_REJECTED",
  });
  const domCollision = structuredClone(valid);
  const oldPatternId = domCollision.entries[0].scene.resources.patterns[0].id;
  const rootNodeId = domCollision.entries[0].scene.pages[0].rootNodeId;
  domCollision.entries[0].scene.resources.patterns[0].id = rootNodeId;
  for (const page of domCollision.entries[0].scene.pages) {
    for (const node of page.nodes) {
      if (node.fillToken === oldPatternId) node.fillToken = rootNodeId;
      if (node.strokeToken === oldPatternId) node.strokeToken = rootNodeId;
    }
  }
  assert.deepEqual(projectBoringLogSceneSetForPublication(domCollision), {
    accepted: false,
    code: "BORING_LOG_PUBLICATION_SCENE_SET_DOM_COLLISION",
  });
});
