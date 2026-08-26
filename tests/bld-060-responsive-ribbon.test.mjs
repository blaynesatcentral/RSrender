import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createBoringLogStudioHtml,
  resolveStudioRibbonGroupPlacement,
} from "../packages/renderer-ui/dist/index.js";

test("BLD-060 ribbon placement is deterministic across narrow-wide-narrow cycles", () => {
  const groups = [
    { id: "a", width: 280 },
    { id: "b", width: 190 },
    { id: "c", width: 240 },
  ];
  const resolve = (ribbonWidth) =>
    resolveStudioRibbonGroupPlacement({
      ribbonWidth,
      horizontalPadding: 24,
      messageWidth: 0,
      overflowTriggerWidth: 62,
      groups,
    });
  const narrow = resolve(620);
  const wide = resolve(1_200);
  assert.deepEqual(resolve(620), narrow);
  assert.deepEqual(narrow, { visibleIds: ["a", "b"], overflowIds: ["c"] });
  assert.deepEqual(wide, { visibleIds: ["a", "b", "c"], overflowIds: [] });
});

test("BLD-060 shell owns a fixed-height, non-scrolling ribbon overflow and CSS-variable panes", async () => {
  const [stylesheet, entry] = await Promise.all([
    readFile(new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url), "utf8"),
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
      "utf8",
    ),
  ]);
  const html = createBoringLogStudioHtml(null);
  assert.match(html, /id="ribbon-overflow"[^>]+class="ribbon-overflow"/u);
  assert.match(html, /id="ribbon-overflow-menu"[^>]+class="ribbon-overflow-menu"/u);
  assert.match(stylesheet, /grid-template-rows:\s*40px 34px 92px 42px minmax\(0, 1fr\)/u);
  assert.match(stylesheet, /\.ribbon\s*\{[^}]*height:\s*92px[^}]*overflow-x:\s*hidden/su);
  assert.doesNotMatch(stylesheet, /\.ribbon\s*\{[^}]*overflow-[xy]:\s*auto/su);
  assert.doesNotMatch(stylesheet, /\.ribbon-group small\s*\{[^}]*position:\s*absolute/su);
  assert.match(entry, /workspace\.style\.setProperty\("--contents-pane-width"/u);
  assert.match(entry, /workspace\.style\.setProperty\("--properties-pane-width"/u);
  assert.match(entry, /window\.addEventListener\("resize"[\s\S]+queueResponsiveRibbonLayout/u);
});
