import assert from "node:assert/strict";
import test from "node:test";

import {
  boringLogColumnResizeRevision,
  resizeAdjacentBoringLogColumns,
} from "../packages/scene/dist/index.js";

const columns = Object.freeze([
  Object.freeze({ id: "column-a", role: "a", xMpt: 24_000, widthMpt: 28_000 }),
  Object.freeze({ id: "column-b", role: "b", xMpt: 52_000, widthMpt: 48_000 }),
  Object.freeze({ id: "column-c", role: "c", xMpt: 100_000, widthMpt: 80_000 }),
]);
const constraints = Object.freeze([
  Object.freeze({ columnId: "column-a", minimumWidthMpt: 18_000, widthPinned: false }),
  Object.freeze({ columnId: "column-b", minimumWidthMpt: 20_000, widthPinned: false }),
  Object.freeze({ columnId: "column-c", minimumWidthMpt: 50_000, widthPinned: false }),
]);

test("BLD-039 adjacent divider resize conserves the pair and every following column", () => {
  assert.equal(boringLogColumnResizeRevision, "bld-039-column-resize-v1");
  const result = resizeAdjacentBoringLogColumns({
    columns,
    constraints,
    dividerAfterColumnId: "column-a",
    requestedDividerXMpt: 60_000,
  });
  assert.equal(result.accepted, true);
  assert.deepEqual(result.columns, [
    { id: "column-a", role: "a", xMpt: 24_000, widthMpt: 36_000 },
    { id: "column-b", role: "b", xMpt: 60_000, widthMpt: 40_000 },
    columns[2],
  ]);
  assert.equal(result.conservedWidthMpt, 76_000);
  assert.equal(result.changed, true);
  assert.equal(result.clamped, false);
});

test("BLD-039 adjacent divider resize clamps to both explicit minimum widths", () => {
  const left = resizeAdjacentBoringLogColumns({
    columns,
    constraints,
    dividerAfterColumnId: "column-a",
    requestedDividerXMpt: 0,
  });
  assert.equal(left.accepted, true);
  assert.equal(left.effectiveDividerXMpt, 42_000);
  assert.equal(left.leftMinimumReached, true);
  assert.equal(left.clamped, true);
  const right = resizeAdjacentBoringLogColumns({
    columns,
    constraints,
    dividerAfterColumnId: "column-a",
    requestedDividerXMpt: 200_000,
  });
  assert.equal(right.accepted, true);
  assert.equal(right.effectiveDividerXMpt, 80_000);
  assert.equal(right.rightMinimumReached, true);
  assert.equal(right.columns[0].widthMpt + right.columns[1].widthMpt, 76_000);
});

test("BLD-039 adjacent divider resize honors pins and fails closed for invalid topology", () => {
  assert.deepEqual(
    resizeAdjacentBoringLogColumns({
      columns,
      constraints: constraints.map((constraint) =>
        constraint.columnId === "column-b" ? { ...constraint, widthPinned: true } : constraint,
      ),
      dividerAfterColumnId: "column-a",
      requestedDividerXMpt: 60_000,
    }),
    { accepted: false, code: "COLUMN_RESIZE_PINNED" },
  );
  assert.deepEqual(
    resizeAdjacentBoringLogColumns({
      columns: [columns[0], { ...columns[1], xMpt: 53_000 }, columns[2]],
      constraints,
      dividerAfterColumnId: "column-a",
      requestedDividerXMpt: 60_000,
    }),
    { accepted: false, code: "COLUMN_RESIZE_ORDER_INVALID" },
  );
  assert.deepEqual(
    resizeAdjacentBoringLogColumns({
      columns,
      constraints: constraints.slice(0, 2),
      dividerAfterColumnId: "column-a",
      requestedDividerXMpt: 60_000,
    }),
    { accepted: false, code: "COLUMN_RESIZE_CONSTRAINT_INVALID" },
  );
  assert.deepEqual(
    resizeAdjacentBoringLogColumns({
      columns,
      constraints,
      dividerAfterColumnId: "column-c",
      requestedDividerXMpt: 180_000,
    }),
    { accepted: false, code: "COLUMN_RESIZE_DIVIDER_NOT_FOUND" },
  );
});

test("BLD-039 adjacent divider resize is detached and total for hostile input", () => {
  const result = resizeAdjacentBoringLogColumns({
    columns,
    constraints,
    dividerAfterColumnId: "column-a",
    requestedDividerXMpt: 60_000,
  });
  assert.equal(result.accepted, true);
  assert.notEqual(result.columns, columns);
  assert.notEqual(result.columns[0], columns[0]);
  assert.deepEqual(resizeAdjacentBoringLogColumns(null), {
    accepted: false,
    code: "COLUMN_RESIZE_ARGUMENT_INVALID",
  });
  assert.deepEqual(
    resizeAdjacentBoringLogColumns({
      columns: [null],
      constraints: [],
      dividerAfterColumnId: "column-a",
      requestedDividerXMpt: 60_000,
    }),
    { accepted: false, code: "COLUMN_RESIZE_ARGUMENT_INVALID" },
  );
});
