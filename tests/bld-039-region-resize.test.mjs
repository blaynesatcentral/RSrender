import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  boringLogContinuationPagesRevision,
  boringLogRegionResizeRevision,
  planBoringLogContinuationPages,
  resizeBoringLogPageRegions,
} from "../packages/scene/dist/index.js";
import { boringLogMvpTemplate } from "../packages/test-support/dist/index.js";

const base = {
  pageHeightMpt: boringLogMvpTemplate.page.heightMpt,
  regions: boringLogMvpTemplate.regions,
  depthTransform: boringLogMvpTemplate.depthTransform,
  minimumHeaderHeightMpt: 60_000,
  minimumDepthBodyHeightMpt: 300_000,
  minimumFooterHeightMpt: 72_000,
};

test("BLD-039 Header boundary preserves page and fixed depth scale while slack remains", () => {
  assert.equal(boringLogRegionResizeRevision, "bld-039-region-resize-v1");
  const result = resizeBoringLogPageRegions({
    ...base,
    boundary: "header-depth",
    requestedBoundaryYMpt: 124_000,
  });
  assert.equal(result.accepted, true);
  assert.equal(result.repaginationRequired, false);
  assert.equal(result.publicationBlocked, false);
  assert.equal(result.pageCount, 1);
  assert.equal(result.fixedMptPerFoot, 12_025);
  assert.deepEqual(
    result.regions.map(({ role, yMpt, heightMpt }) => ({ role, yMpt, heightMpt })),
    [
      { role: "header", yMpt: 14_000, heightMpt: 107_000 },
      { role: "depth-body", yMpt: 124_000, heightMpt: 546_000 },
      { role: "footer", yMpt: 670_000, heightMpt: 108_000 },
    ],
  );
  assert.deepEqual(result.depthTransform, {
    ...boringLogMvpTemplate.depthTransform,
    yStartMpt: 150_000,
    yEndMpt: 631_000,
  });
  assert.equal(result.regions.at(-1).yMpt + result.regions.at(-1).heightMpt, 778_000);
});

test("BLD-039 Footer boundary consumes plot slack without scaling or moving Header", () => {
  const result = resizeBoringLogPageRegions({
    ...base,
    boundary: "depth-footer",
    requestedBoundaryYMpt: 650_000,
  });
  assert.equal(result.accepted, true);
  assert.equal(result.repaginationRequired, false);
  assert.equal(result.depthTransform.mptPerFoot, boringLogMvpTemplate.depthTransform.mptPerFoot);
  assert.equal(result.depthTransform.yStartMpt, 130_000);
  assert.equal(result.depthTransform.yEndMpt, 611_000);
  assert.equal(result.regions[0].heightMpt, boringLogMvpTemplate.regions[0].heightMpt);
  assert.equal(result.regions[1].heightMpt, 546_000);
  assert.equal(result.regions[2].yMpt, 650_000);
  assert.equal(result.regions[2].heightMpt, 128_000);
});

test("BLD-039 larger Header growth returns explicit repagination instead of scaling or dropping", () => {
  const result = resizeBoringLogPageRegions({
    ...base,
    boundary: "header-depth",
    requestedBoundaryYMpt: 184_000,
  });
  assert.equal(result.accepted, true);
  assert.equal(result.changed, true);
  assert.equal(result.depthTransform, null);
  assert.equal(result.repaginationRequired, true);
  assert.equal(result.publicationBlocked, true);
  assert.equal(result.pageCount, 2);
  assert.equal(result.requiredPlotHeightMpt, 481_000);
  assert.equal(result.availablePlotHeightMpt, 460_000);
  assert.equal(result.maximumDepthPerPageFt, 460_000 / 12_025);
});

test("BLD-039 continuation pages preserve fixed scale and exact contiguous depth ownership", () => {
  assert.equal(boringLogContinuationPagesRevision, "bld-039-continuation-pages-v1");
  const result = planBoringLogContinuationPages({
    basePageId: "urn:rsrender:page:test-01",
    regionId: "region-depth-body",
    depthStartFt: 0,
    depthEndFt: 40,
    yStartMpt: 210_000,
    yEndLimitMpt: 670_000,
    mptPerFoot: 12_025,
  });
  assert.equal(result.accepted, true);
  assert.equal(result.pageCount, 2);
  assert.equal(result.requiredPlotHeightMpt, 481_000);
  assert.equal(result.availablePlotHeightMpt, 460_000);
  assert.deepEqual(
    result.pages.map(({ pageId, pageIndex, pageRole, finalDepthInclusive }) => ({
      pageId,
      pageIndex,
      pageRole,
      finalDepthInclusive,
    })),
    [
      {
        pageId: "urn:rsrender:page:test-01",
        pageIndex: 0,
        pageRole: "first",
        finalDepthInclusive: false,
      },
      {
        pageId: "urn:rsrender:page:test-01:continuation:2",
        pageIndex: 1,
        pageRole: "last",
        finalDepthInclusive: true,
      },
    ],
  );
  assert.equal(result.pages[0].depthRange.startFt, 0);
  assert.equal(result.pages[0].depthRange.endFt, 460_000 / 12_025);
  assert.equal(result.pages[1].depthRange.startFt, result.pages[0].depthRange.endFt);
  assert.equal(result.pages[1].depthRange.endFt, 40);
  assert.equal(result.pages[0].depthTransform.yEndMpt, 670_000);
  assert.equal(result.pages[1].depthTransform.yEndMpt, 231_000);
  assert.equal(
    result.pages.reduce(
      (sum, page) => sum + (page.depthTransform.yEndMpt - page.depthTransform.yStartMpt),
      0,
    ),
    481_000,
  );
  assert.ok(result.pages.every(({ depthTransform }) => depthTransform.mptPerFoot === 12_025));
});

test("BLD-039 continuation planner is bounded, total, and emits stable continuation roles", () => {
  const threePages = planBoringLogContinuationPages({
    basePageId: "page",
    regionId: "region-depth-body",
    depthStartFt: 0,
    depthEndFt: 40,
    yStartMpt: 130_000,
    yEndLimitMpt: 330_000,
    mptPerFoot: 12_025,
  });
  assert.equal(threePages.accepted, true);
  assert.deepEqual(
    threePages.pages.map(({ pageRole }) => pageRole),
    ["first", "continuation", "last"],
  );
  assert.equal(threePages.pages[1].depthRange.startFt, threePages.pages[0].depthRange.endFt);
  assert.equal(threePages.pages[2].depthRange.startFt, threePages.pages[1].depthRange.endFt);
  assert.deepEqual(planBoringLogContinuationPages(null), {
    accepted: false,
    code: "CONTINUATION_PAGES_ARGUMENT_INVALID",
  });
  assert.deepEqual(
    planBoringLogContinuationPages({
      basePageId: "page",
      regionId: "region-depth-body",
      depthStartFt: 0,
      depthEndFt: 10_001,
      yStartMpt: 0,
      yEndLimitMpt: 1,
      mptPerFoot: 1,
    }),
    { accepted: false, code: "CONTINUATION_PAGES_CAPACITY_EXCEEDED" },
  );
});

test("BLD-039 region boundaries clamp to typed minima and fail closed on bad topology", () => {
  const clamped = resizeBoringLogPageRegions({
    ...base,
    boundary: "depth-footer",
    requestedBoundaryYMpt: 790_000,
  });
  assert.equal(clamped.accepted, true);
  assert.equal(clamped.clamped, true);
  assert.equal(clamped.effectiveBoundaryYMpt, 706_000);
  assert.equal(clamped.regions.at(-1).heightMpt, 72_000);
  assert.deepEqual(
    resizeBoringLogPageRegions({
      ...base,
      regions: [
        base.regions[0],
        { ...base.regions[1], yMpt: base.regions[1].yMpt + 1 },
        base.regions[2],
      ],
      boundary: "header-depth",
      requestedBoundaryYMpt: 124_000,
    }),
    { accepted: false, code: "REGION_RESIZE_TOPOLOGY_INVALID" },
  );
  assert.deepEqual(resizeBoringLogPageRegions(null), {
    accepted: false,
    code: "REGION_RESIZE_ARGUMENT_INVALID",
  });
});

test("BLD-039 region commands expose exact route, Canvas, Properties, and history paths", async () => {
  const [broker, preload, main, entry, uiRoute, stylesheet] = await Promise.all([
    readFile(
      new URL(
        "../packages/platform-electron-main/src/boring-log-studio-route-broker.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../packages/platform-electron-main/src/boring-log-studio-preload-runtime.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../packages/platform-electron-main/src/semantic-editor-main.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(broker, /setRegionBoundary[\s\S]*requestedBoundaryYMpt/u);
  assert.match(preload, /BORING_LOG_STUDIO_SET_REGION_BOUNDARY_CHANNEL/u);
  assert.match(main, /resizeBoringLogPageRegions/u);
  assert.match(main, /REGION_REPAGINATION_REQUIRED/u);
  assert.match(main, /commitEmbeddedTemplateReplacement/u);
  assert.match(main, /operation: "region-boundary-resize"/u);
  assert.match(entry, /id = "region-boundary-controls"/u);
  assert.match(entry, /Region preview:[\s\S]*requires \$\{outcome.pageCount\} pages/u);
  assert.match(entry, /Page Region gesture canceled/u);
  assert.match(entry, /ArrowUp[\s\S]*ArrowDown/u);
  assert.match(uiRoute, /id="region-resize-properties"/u);
  assert.match(stylesheet, /\.region-boundary-control/u);
});
