import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import {
  boringLogAttributeTableCorpusLimits,
  resolveBoringLogAttributeTableWindow,
} from "../packages/renderer-ui/dist/index.js";

test("BLD-048 virtualizes the declared maximum Attribute Table corpus", () => {
  const started = performance.now();
  let window;
  for (let index = 0; index < 10_000; index += 1) {
    window = resolveBoringLogAttributeTableWindow({
      totalRows: boringLogAttributeTableCorpusLimits.rows,
      scrollTopPx: (index % 4_096) * boringLogAttributeTableCorpusLimits.rowHeightPx,
      viewportHeightPx: 420,
    });
  }
  const elapsedMs = performance.now() - started;
  assert.equal(window.virtualized, true);
  assert.ok(window.renderedRows <= 40);
  assert.equal(
    window.topSpacerPx +
      window.renderedRows * boringLogAttributeTableCorpusLimits.rowHeightPx +
      window.bottomSpacerPx,
    boringLogAttributeTableCorpusLimits.rows * boringLogAttributeTableCorpusLimits.rowHeightPx,
  );
  assert.ok(elapsedMs < 250, `10,000 window resolutions took ${elapsedMs.toFixed(1)} ms`);
});

test("BLD-048 retains all rows below the virtualization threshold and rejects excess corpus", () => {
  const small = resolveBoringLogAttributeTableWindow({
    totalRows: 120,
    scrollTopPx: 0,
    viewportHeightPx: 220,
  });
  assert.deepEqual(small, {
    virtualized: false,
    startIndex: 0,
    endIndex: 120,
    renderedRows: 120,
    topSpacerPx: 0,
    bottomSpacerPx: 0,
  });
  assert.throws(
    () =>
      resolveBoringLogAttributeTableWindow({
        totalRows: boringLogAttributeTableCorpusLimits.rows + 1,
        scrollTopPx: 0,
        viewportHeightPx: 220,
      }),
    /BORING_LOG_ATTRIBUTE_TABLE_WINDOW_INVALID/u,
  );
});
