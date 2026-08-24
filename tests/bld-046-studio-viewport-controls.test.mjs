import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createBoringLogStudioHtml,
  resolveStudioContextMenuPosition,
  resolveStudioPaneWidths,
  studioPaneLimits,
} from "../packages/renderer-ui/dist/index.js";

test("BLD-046 resolves bounded pane widths while preserving a usable Canvas", () => {
  assert.deepEqual(
    resolveStudioPaneWidths({
      workspaceWidth: 1_000,
      requestedContentsWidth: 300,
      requestedPropertiesWidth: 300,
      resizeTarget: "viewport",
    }),
    { contentsWidth: 300, canvasWidth: 388, propertiesWidth: 300 },
  );

  const narrow = resolveStudioPaneWidths({
    workspaceWidth: 400,
    requestedContentsWidth: 900,
    requestedPropertiesWidth: 900,
    resizeTarget: "viewport",
  });
  assert.equal(narrow.canvasWidth, studioPaneLimits.minimumCanvasWidth);
  assert.equal(narrow.contentsWidth, studioPaneLimits.contents.minimum);
  assert.equal(narrow.propertiesWidth, studioPaneLimits.properties.minimum);

  const resizedContents = resolveStudioPaneWidths({
    workspaceWidth: 1_100,
    requestedContentsWidth: 450,
    requestedPropertiesWidth: 500,
    resizeTarget: "contents",
  });
  assert.equal(resizedContents.canvasWidth, studioPaneLimits.minimumCanvasWidth);
  assert.equal(resizedContents.contentsWidth, 268);
  assert.equal(resizedContents.propertiesWidth, 500);
});

test("BLD-046 clamps the compact Canvas context menu inside the viewport", () => {
  assert.deepEqual(
    resolveStudioContextMenuPosition({
      clientX: 790,
      clientY: 590,
      viewportWidth: 800,
      viewportHeight: 600,
      menuWidth: 220,
      menuHeight: 420,
    }),
    { left: 572, top: 172 },
  );
  assert.deepEqual(
    resolveStudioContextMenuPosition({
      clientX: -50,
      clientY: -50,
      viewportWidth: 800,
      viewportHeight: 600,
      menuWidth: 220,
      menuHeight: 420,
    }),
    { left: 8, top: 8 },
  );
});

test("BLD-046 exposes accessible splitters and compact responsive panes", async () => {
  const html = createBoringLogStudioHtml(null);
  assert.match(html, /id="contents-splitter"[^>]+role="separator"[^>]+tabindex="0"/u);
  assert.match(html, /id="properties-splitter"[^>]+role="separator"[^>]+tabindex="0"/u);
  assert.match(html, />Hatch pattern</u);
  assert.doesNotMatch(html, />Vector pattern</u);

  const stylesheet = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url),
    "utf8",
  );
  assert.match(
    stylesheet,
    /grid-template-columns:[\s\S]+var\(--contents-pane-width\)[\s\S]+var\(--properties-pane-width\)/u,
  );
  assert.match(stylesheet, /\.ribbon\s*\{[^}]*overflow-x:\s*auto/su);
  assert.match(
    stylesheet,
    /\.canvas-context-menu\s*\{[^}]*position:\s*fixed[^}]*max-height:[^}]*overflow-y:\s*auto/su,
  );
  assert.match(stylesheet, /@container properties-pane \(max-width: 340px\)/u);
  assert.match(stylesheet, /overflow-wrap:\s*break-word/u);
});

test("BLD-046 wires pointer, keyboard, and precision-touchpad input", async () => {
  const entry = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
    "utf8",
  );
  assert.match(entry, /function beginPaneResize\(/u);
  assert.match(entry, /splitter\.setPointerCapture\(event\.pointerId\)/u);
  assert.match(entry, /resizePaneFromKeyboard\(event, resizeTarget\)/u);
  assert.match(entry, /splitter\.addEventListener\("dblclick"/u);
  assert.match(
    entry,
    /canvasStage\.addEventListener\("wheel", applyTouchpadPinchZoom, \{ passive: false \}\)/u,
  );
  assert.match(entry, /if \(!event\.ctrlKey\) \{/u);
  assert.match(entry, /canvasStage\.scrollLeft \+= event\.deltaY/u);
  assert.match(entry, /ribbon\.scrollLeft \+= event\.deltaY/u);
  assert.match(entry, /event\.preventDefault\(\)/u);
  assert.match(entry, /openCanvasContextMenu\(event\.clientX, event\.clientY\)/u);
});
