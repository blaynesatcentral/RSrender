import assert from "node:assert/strict";
import test from "node:test";

import {
  arrangeBoringLogTextOccurrences,
  boringLogArrangementRevision,
} from "../packages/scene/dist/index.js";

const item = (occurrenceNodeId, frame, overrides = {}) => ({
  occurrenceNodeId,
  semanticId: `semantic:${occurrenceNodeId}`,
  frame,
  locked: false,
  positionMode: "free",
  ...overrides,
});

const frame = (xMpt, yMpt, widthMpt = 20_000, heightMpt = 10_000) => ({
  xMpt,
  yMpt,
  widthMpt,
  heightMpt,
});

const arrange = (items, keyElementId, operation) =>
  arrangeBoringLogTextOccurrences({
    pageWidthMpt: 612_000,
    pageHeightMpt: 792_000,
    keyElementId,
    items,
    operation,
  });

test("BLD-040 nudges one ordered selection in integer mpt and preserves item identity", () => {
  assert.equal(boringLogArrangementRevision, "bld-040-arrangement-v1");
  const items = [item("a", frame(10_000, 20_000)), item("b", frame(50_000, 60_000))];
  const result = arrange(items, "b", { kind: "nudge", deltaXMpt: 1_000, deltaYMpt: -100 });
  assert.equal(result.accepted, true);
  assert.equal(result.changed, true);
  assert.deepEqual(result.affectedOccurrenceNodeIds, ["a", "b"]);
  assert.deepEqual(
    result.items.map(({ occurrenceNodeId, frame: next }) => [
      occurrenceNodeId,
      next.xMpt,
      next.yMpt,
    ]),
    [
      ["a", 11_000, 19_900],
      ["b", 51_000, 59_900],
    ],
  );
  assert.deepEqual(items[0].frame, frame(10_000, 20_000));
});

test("BLD-040 aligns and matches size to the fixed Key Element while naming locked exclusions", () => {
  const items = [
    item("a", frame(10_000, 20_000, 12_000, 8_000)),
    item("key", frame(80_000, 90_000, 30_000, 20_000)),
    item("locked", frame(150_000, 160_000), { locked: true }),
  ];
  const aligned = arrange(items, "key", { kind: "align", alignment: "right" });
  assert.equal(aligned.accepted, true);
  assert.equal(aligned.items[0].frame.xMpt, 98_000);
  assert.deepEqual(aligned.items[1].frame, items[1].frame);
  assert.deepEqual(aligned.items[2].frame, items[2].frame);
  assert.deepEqual(aligned.excludedLockedOccurrenceNodeIds, ["locked"]);
  const matched = arrange(items, "key", { kind: "match-size", dimension: "both" });
  assert.equal(matched.accepted, true);
  assert.deepEqual(matched.items[0].frame, frame(10_000, 20_000, 30_000, 20_000));
  assert.deepEqual(matched.items[1].frame, items[1].frame);
  assert.deepEqual(matched.items[2].frame, items[2].frame);
});

test("BLD-040 distributes equal gaps or centers with stable fixed endpoints", () => {
  const horizontal = [
    item("a", frame(0, 10_000, 10_000, 5_000)),
    item("b", frame(20_000, 20_000, 20_000, 5_000)),
    item("c", frame(90_000, 30_000, 10_000, 5_000)),
  ];
  const gaps = arrange(horizontal, "b", {
    kind: "distribute",
    distribution: "horizontal-gaps",
  });
  assert.equal(gaps.accepted, true);
  assert.deepEqual(
    gaps.items.map(({ frame: next }) => next.xMpt),
    [0, 40_000, 90_000],
  );
  const vertical = [
    item("a", frame(10_000, 0, 10_000, 10_000)),
    item("b", frame(20_000, 30_000, 10_000, 20_000)),
    item("c", frame(30_000, 90_000, 10_000, 10_000)),
  ];
  const centers = arrange(vertical, "a", {
    kind: "distribute",
    distribution: "vertical-centers",
  });
  assert.equal(centers.accepted, true);
  assert.deepEqual(
    centers.items.map(({ frame: next }) => next.yMpt),
    [0, 40_000, 90_000],
  );
});

test("BLD-040 rejects locked nudge, depth-bound Y movement, insufficient spans, and page escape", () => {
  assert.deepEqual(
    arrange([item("a", frame(10_000, 20_000), { locked: true })], "a", {
      kind: "nudge",
      deltaXMpt: 1_000,
      deltaYMpt: 0,
    }),
    { accepted: false, code: "ARRANGEMENT_LOCKED" },
  );
  assert.deepEqual(
    arrange([item("a", frame(10_000, 20_000), { positionMode: "depth-bound" })], "a", {
      kind: "nudge",
      deltaXMpt: 0,
      deltaYMpt: 1_000,
    }),
    { accepted: false, code: "ARRANGEMENT_DEPTH_BOUND" },
  );
  assert.deepEqual(
    arrange(
      [
        item("a", frame(0, 0, 50_000, 10_000)),
        item("b", frame(20_000, 20_000, 50_000, 10_000)),
        item("c", frame(60_000, 40_000, 50_000, 10_000)),
      ],
      "b",
      { kind: "distribute", distribution: "horizontal-gaps" },
    ),
    { accepted: false, code: "ARRANGEMENT_INSUFFICIENT_SPAN" },
  );
  assert.deepEqual(
    arrange([item("a", frame(600_000, 20_000, 12_000, 10_000))], "a", {
      kind: "nudge",
      deltaXMpt: 1,
      deltaYMpt: 0,
    }),
    { accepted: false, code: "ARRANGEMENT_PAGE_BOUNDS" },
  );
});

test("BLD-040 arrangement boundary is total, strict, and rejects ambiguous selection", () => {
  assert.deepEqual(arrangeBoringLogTextOccurrences(null), {
    accepted: false,
    code: "ARRANGEMENT_ARGUMENT_INVALID",
  });
  assert.deepEqual(
    arrange([item("a", frame(10_000, 20_000)), item("a", frame(30_000, 40_000))], "a", {
      kind: "align",
      alignment: "left",
    }),
    { accepted: false, code: "ARRANGEMENT_SELECTION_INVALID" },
  );
  assert.deepEqual(
    arrange([item("a", frame(10_000, 20_000))], "missing", {
      kind: "nudge",
      deltaXMpt: 0,
      deltaYMpt: 0,
    }),
    { accepted: false, code: "ARRANGEMENT_KEY_ELEMENT_INVALID" },
  );
  const hostile = {};
  Object.defineProperty(hostile, "pageWidthMpt", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  assert.deepEqual(arrangeBoringLogTextOccurrences(hostile), {
    accepted: false,
    code: "ARRANGEMENT_ARGUMENT_INVALID",
  });
});
