import assert from "node:assert/strict";
import test from "node:test";

import { normalizeMajorPdfRuleCoordinates } from "../tooling/inspect-boring-log-pdf.mjs";

test("BLD-030 normalizes long PDF vector rules to mpt and page-relative coordinates", () => {
  const svg = `
    <svg width="612" height="792" viewBox="0 0 612 792">
      <defs><path d="M 0 0 L 600 0"/></defs>
      <path fill="none" stroke="black" stroke-width="0.5" d="M 24 104 L 24 670" transform="matrix(1, 0, 0, 1, 0, 0)"/>
      <path fill="none" stroke="black" stroke-width="0.5" d="M 588 104 L 588 670" transform="matrix(1, 0, 0, 1, 0, 0)"/>
      <path fill="none" stroke="black" stroke-width="0.5" d="M 24 130 L 588 130" transform="matrix(1, 0, 0, 1, 0, 0)"/>
      <path fill="none" stroke="black" stroke-width="0.5" d="M 24 611.000001 L 588 611.000001" transform="matrix(1, 0, 0, 1, 0, 0)"/>
      <path fill="none" stroke="black" stroke-width="0.5" d="M 24 200 L 100 200"/>
      <path fill="none" stroke="black" stroke-width="0.5" d="M 0 0 C 20 10 40 20 60 30"/>
    </svg>`;
  const geometry = normalizeMajorPdfRuleCoordinates(svg, [612, 792]);
  assert.equal(geometry.result, "AVAILABLE");
  assert.deepEqual(geometry.horizontalCoordinatesMpt, [130_000, 611_000]);
  assert.deepEqual(geometry.verticalCoordinatesMpt, [24_000, 588_000]);
  assert.deepEqual(geometry.horizontalCoordinatesPermillion, [164_141, 771_465]);
  assert.deepEqual(geometry.verticalCoordinatesPermillion, [39_216, 960_784]);
  assert.equal(geometry.horizontalRules[0].maximumSpanPoints, 564);
  assert.equal(geometry.verticalRules[0].maximumSpanPoints, 566);
  assert.deepEqual(geometry.sourceInventory, {
    strokedPathCount: 6,
    linearPathCount: 5,
    curvedPathCount: 1,
    unsupportedTransformPathCount: 0,
    linearSegmentCount: 5,
  });
});

test("BLD-030 reports unavailable geometry when PDF page size cannot be established", () => {
  assert.deepEqual(normalizeMajorPdfRuleCoordinates("<svg/>", null), {
    result: "UNAVAILABLE",
    reason: "PDF_PAGE_SIZE_UNAVAILABLE",
    policy: {
      axisTolerancePoints: 0.02,
      horizontalMinimumSpanRatio: 0.75,
      verticalMinimumSpanRatio: 0.55,
    },
    horizontalRules: [],
    verticalRules: [],
  });
});
