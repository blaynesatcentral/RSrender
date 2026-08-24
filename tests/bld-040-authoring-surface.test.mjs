import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createBoringLogStudioHtml } from "../packages/renderer-ui/dist/index.js";

test("BLD-040 exposes arrangement commands in the ribbon and exact Canvas context menu", () => {
  const html = createBoringLogStudioHtml(null);
  for (const id of [
    "align-left",
    "align-center",
    "align-right",
    "match-width",
    "match-height",
    "distribute-horizontal",
    "context-align-left",
    "context-align-center",
    "context-align-right",
    "context-match-width",
    "context-match-height",
    "context-distribute-horizontal",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`, "u"));
  }
  assert.match(html, /Align to Key Element/u);
  assert.match(html, /Select at least two text elements/u);
});

test("BLD-040 routes ribbon, context, and keyboard arrangement through one command function", async () => {
  const entry = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
    "utf8",
  );
  assert.match(entry, /async function arrangeSelectedText\(/u);
  assert.match(entry, /apis\.studio\.arrangeTextOccurrences/u);
  assert.match(entry, /commandSource: "keyboard" \| "ribbon" \| "context-menu"/u);
  assert.match(entry, /event\.shiftKey \|\| event\.ctrlKey \|\| event\.metaKey/u);
  assert.match(entry, /selectedTextNodeIds\.delete\(exactTextNode\.id\)/u);
  assert.match(entry, /the orange occurrence is the Key Element/u);
  assert.match(entry, /event\.altKey \? 100 : event\.shiftKey \? 10_000 : 1_000/u);
  assert.match(entry, /selectAllTextOccurrences\(\)/u);
  assert.match(entry, /clearSelection\(\)/u);
  assert.match(entry, /key === "z" \|\| key === "y"/u);
  assert.match(entry, /ARRANGEMENT_UNCHANGED/u);
});

test("BLD-040 makes the Key Element visually distinct from the rest of the selection", async () => {
  const stylesheet = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url),
    "utf8",
  );
  const entry = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
    "utf8",
  );
  assert.match(stylesheet, /\.scene-node\.is-key-element/u);
  assert.match(entry, /occurrence\.classList\.add\("is-key-element"\)/u);
  assert.match(entry, /button\.setAttribute\("aria-disabled", String\(unavailable\)\)/u);
});

test("BLD-040 supports additive Contents selection and a cancelable unlocked-text marquee", async () => {
  const entry = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
    "utf8",
  );
  const stylesheet = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url),
    "utf8",
  );
  assert.match(entry, /function beginMarquee\(event: PointerEvent\): void/u);
  assert.match(entry, /function finishMarquee\(event: PointerEvent\): void/u);
  assert.match(entry, /function cancelMarquee\(\): void/u);
  assert.match(entry, /node\.presentation\?\.locked !== true/u);
  assert.match(entry, /event\.shiftKey \|\| event\.ctrlKey \|\| event\.metaKey/u);
  assert.match(entry, /exactTextNodes\.length === 1 \? exactTextNodes\[0\]!\.id : null/u);
  assert.match(entry, /Properties values follow the Key Element/u);
  assert.match(stylesheet, /\.canvas-marquee-selection/u);
  assert.match(stylesheet, /\.canvas-stage\.is-marquee-selecting/u);
});
