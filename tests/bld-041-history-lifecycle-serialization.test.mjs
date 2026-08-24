import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("BLD-041 serializes lifecycle refresh before history controls become available", async () => {
  const entry = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
    "utf8",
  );

  assert.match(entry, /let lifecycleRefreshPromise: Promise<boolean> \| null = null/u);
  assert.match(entry, /if \(lifecycleRefreshPromise !== null\) return lifecycleRefreshPromise/u);
  assert.match(entry, /lifecycleRefreshPromise = pending;\s+updateHistoryControls\(\)/u);
  assert.match(
    entry,
    /undoButton\.disabled = lifecycleRefreshPending \|\| studioProjection\?\.canUndo !== true/u,
  );
  assert.match(
    entry,
    /redoButton\.disabled = lifecycleRefreshPending \|\| studioProjection\?\.canRedo !== true/u,
  );
  assert.match(
    entry,
    /if \(lifecycleRefreshPromise === pending\) lifecycleRefreshPromise = null;\s+updateHistoryControls\(\)/u,
  );
});
