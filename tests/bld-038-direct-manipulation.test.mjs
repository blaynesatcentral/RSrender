import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  nearestBoringLogDirectManipulationResizeHandle,
  resolveBoringLogDirectManipulationFrame,
  snapBoringLogDirectManipulationFrame,
} from "../packages/renderer-ui/dist/index.js";

const original = Object.freeze({
  xMpt: 110_000,
  yMpt: 293_338,
  widthMpt: 186_000,
  heightMpt: 9_000,
});

const baseInput = Object.freeze({
  original,
  pageWidthMpt: 612_000,
  pageHeightMpt: 792_000,
  minimumWidthMpt: 4_000,
  minimumHeightMpt: 4_000,
});

test("BLD-038 resolves integer-mpt move geometry with depth binding and page bounds", () => {
  const bound = resolveBoringLogDirectManipulationFrame({
    ...baseInput,
    handle: "move",
    deltaXMpt: 15_125,
    deltaYMpt: 27_000,
    positionMode: "depth-bound",
  });
  assert.deepEqual(bound, {
    accepted: true,
    frame: { xMpt: 125_125, yMpt: 293_338, widthMpt: 186_000, heightMpt: 9_000 },
    changed: true,
    yConstrained: true,
  });

  const free = resolveBoringLogDirectManipulationFrame({
    ...baseInput,
    handle: "move",
    deltaXMpt: 900_000,
    deltaYMpt: -900_000,
    positionMode: "free",
  });
  assert.deepEqual(free, {
    accepted: true,
    frame: { xMpt: 426_000, yMpt: 0, widthMpt: 186_000, heightMpt: 9_000 },
    changed: true,
    yConstrained: false,
  });
});

test("BLD-038 resolves free and depth-bound resize handles without fractional geometry", () => {
  const free = resolveBoringLogDirectManipulationFrame({
    ...baseInput,
    handle: "north-west",
    deltaXMpt: 20_000,
    deltaYMpt: -5_000,
    positionMode: "free",
  });
  assert.deepEqual(free, {
    accepted: true,
    frame: { xMpt: 130_000, yMpt: 288_338, widthMpt: 166_000, heightMpt: 14_000 },
    changed: true,
    yConstrained: false,
  });

  const bound = resolveBoringLogDirectManipulationFrame({
    ...baseInput,
    handle: "north",
    deltaXMpt: 0,
    deltaYMpt: -5_000,
    positionMode: "depth-bound",
  });
  assert.deepEqual(bound, {
    accepted: true,
    frame: { xMpt: 110_000, yMpt: 293_338, widthMpt: 186_000, heightMpt: 14_000 },
    changed: true,
    yConstrained: true,
  });
});

test("BLD-038 resolves overlapping small-frame controls by nearest semantic handle", () => {
  assert.equal(
    nearestBoringLogDirectManipulationResizeHandle(original, {
      xMpt: original.xMpt + original.widthMpt,
      yMpt: original.yMpt + Math.round(original.heightMpt / 2),
    }),
    "east",
  );
  assert.equal(
    nearestBoringLogDirectManipulationResizeHandle(original, {
      xMpt: original.xMpt + original.widthMpt,
      yMpt: original.yMpt + original.heightMpt,
    }),
    "south-east",
  );
  assert.equal(
    nearestBoringLogDirectManipulationResizeHandle(original, { xMpt: 0.5, yMpt: 0 }),
    null,
  );
});

test("BLD-038 fails closed for fractional, out-of-page, and impossible gesture inputs", () => {
  for (const input of [
    { ...baseInput, handle: "move", deltaXMpt: 0.5, deltaYMpt: 0, positionMode: "free" },
    {
      ...baseInput,
      original: { ...original, xMpt: 500_000 },
      handle: "move",
      deltaXMpt: 0,
      deltaYMpt: 0,
      positionMode: "free",
    },
    {
      ...baseInput,
      handle: "south-east",
      deltaXMpt: 0,
      deltaYMpt: 0,
      minimumWidthMpt: 700_000,
      positionMode: "free",
    },
  ]) {
    assert.deepEqual(resolveBoringLogDirectManipulationFrame(input), {
      accepted: false,
      code: "DIRECT_MANIPULATION_ARGUMENT_INVALID",
    });
  }
});

test("BLD-038 snaps move and resize edges deterministically with temporary bypass", () => {
  const moved = snapBoringLogDirectManipulationFrame({
    frame: { xMpt: 23_750, yMpt: 100_000, widthMpt: 100_000, heightMpt: 20_000 },
    handle: "move",
    xTargets: [
      { positionMpt: 24_000, kind: "region" },
      { positionMpt: 200_000, kind: "peer" },
    ],
    yTargets: [{ positionMpt: 99_500, kind: "depth" }],
    thresholdMpt: 1_000,
    pageWidthMpt: 612_000,
    pageHeightMpt: 792_000,
    bypass: false,
  });
  assert.deepEqual(moved, {
    frame: { xMpt: 24_000, yMpt: 99_500, widthMpt: 100_000, heightMpt: 20_000 },
    snapXMpt: 24_000,
    snapYMpt: 99_500,
    snapXKind: "region",
    snapYKind: "depth",
  });
  const resized = snapBoringLogDirectManipulationFrame({
    frame: { xMpt: 24_000, yMpt: 100_000, widthMpt: 99_500, heightMpt: 20_000 },
    handle: "east",
    xTargets: [{ positionMpt: 124_000, kind: "guide" }],
    yTargets: [],
    thresholdMpt: 1_000,
    pageWidthMpt: 612_000,
    pageHeightMpt: 792_000,
    bypass: false,
  });
  assert.deepEqual(resized.frame, {
    xMpt: 24_000,
    yMpt: 100_000,
    widthMpt: 100_000,
    heightMpt: 20_000,
  });
  assert.equal(resized.snapXMpt, 124_000);
  assert.equal(resized.snapXKind, "guide");
  const bypassed = snapBoringLogDirectManipulationFrame({
    frame: moved.frame,
    handle: "move",
    xTargets: [{ positionMpt: 25_000, kind: "grid" }],
    yTargets: [{ positionMpt: 100_000, kind: "grid" }],
    thresholdMpt: 10_000,
    pageWidthMpt: 612_000,
    pageHeightMpt: 792_000,
    bypass: true,
  });
  assert.deepEqual(bypassed, {
    frame: moved.frame,
    snapXMpt: null,
    snapYMpt: null,
    snapXKind: null,
    snapYKind: null,
  });
});

test("BLD-038 snaps text baselines only from an explicit baseline candidate", () => {
  const input = {
    frame: { xMpt: 24_000, yMpt: 100_000, widthMpt: 100_000, heightMpt: 20_000 },
    handle: "move",
    xTargets: [],
    yTargets: [{ positionMpt: 108_500, kind: "baseline" }],
    thresholdMpt: 1_000,
    pageWidthMpt: 612_000,
    pageHeightMpt: 792_000,
    bypass: false,
  };
  const withoutCandidate = snapBoringLogDirectManipulationFrame(input);
  assert.equal(withoutCandidate.snapYMpt, null);
  const withCandidate = snapBoringLogDirectManipulationFrame({
    ...input,
    baselineOffsetsYMpt: [8_000],
  });
  assert.deepEqual(withCandidate, {
    frame: { xMpt: 24_000, yMpt: 100_500, widthMpt: 100_000, heightMpt: 20_000 },
    snapXMpt: null,
    snapYMpt: 108_500,
    snapXKind: null,
    snapYKind: "baseline",
  });
  assert.deepEqual(snapBoringLogDirectManipulationFrame({ ...input, yTargets: [null] }), {
    frame: input.frame,
    snapXMpt: null,
    snapYMpt: null,
    snapXKind: null,
    snapYKind: null,
  });
});

test("BLD-038 installs accessible SVG handles and coalesces pointer completion through history", async () => {
  const [entry, stylesheet] = await Promise.all([
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url), "utf8"),
  ]);
  assert.match(entry, /id = "direct-manipulation-overlay"/u);
  assert.match(entry, /data-direct-manipulation-handle/u);
  assert.match(entry, /id = "direct-manipulation-move-control"/u);
  assert.match(entry, /setAttribute\("role", "button"\)/u);
  assert.match(entry, /setAttribute\("tabindex", "0"\)/u);
  assert.match(entry, /getScreenCTM\(\)/u);
  assert.match(entry, /setPointerCapture\(event\.pointerId\)/u);
  assert.match(entry, /releasePointerCapture/u);
  assert.match(entry, /pointercancel/u);
  assert.match(
    entry,
    /Canvas gesture canceled[\s\S]*document history and scene authority were unchanged/u,
  );
  assert.match(entry, /await applySelectedTextStyle\("canvas"\)/u);
  assert.match(entry, /release commits one Undo\/Redo step/u);
  assert.match(entry, /snapBoringLogDirectManipulationFrame/u);
  assert.match(entry, /hold Alt to bypass/u);
  assert.match(entry, /\.direct-snap-feedback/u);
  assert.match(entry, /depthTransform\.mptPerFoot/u);
  assert.match(entry, /textBaselineYMpt/u);
  assert.match(entry, /snapYKind/u);
  assert.match(entry, /scheduleLiveReflowPreview/u);
  assert.match(entry, /scheduleDirectManipulationPreview/u);
  assert.match(entry, /window\.requestAnimationFrame/u);
  assert.match(entry, /window\.cancelAnimationFrame/u);
  assert.match(entry, /\}, 180\);/u);
  assert.match(entry, /flushDirectManipulationPreview\(\)/u);
  assert.match(entry, /preview: \{/u);
  assert.match(entry, /installLiveReflowPreview/u);
  assert.match(entry, /await flushLiveReflowPreview\(\)/u);
  assert.match(entry, /text was reflowed by the shared layout authority/u);
  assert.match(entry, /node\.presentation\?\.locked === true/u);
  assert.match(stylesheet, /\.direct-manipulation-frame/u);
  assert.match(stylesheet, /\.direct-manipulation-handle/u);
  assert.match(stylesheet, /data-snap-kind="baseline"/u);
  assert.match(stylesheet, /data-snap-kind="depth"/u);
  assert.match(stylesheet, /data-snap-kind="region"/u);
  assert.doesNotMatch(stylesheet, /direct-manipulation[^}]+background-image/su);
});
