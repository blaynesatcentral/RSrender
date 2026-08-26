import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createBoringLogStudioHtml,
  resolveStudioContextMenuPosition,
  resolveStudioEffectiveViewportWidth,
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

  // 1,280 physical px at 125% Windows scaling exposes roughly 1,024 CSS px.
  // All three panes must fit in that effective renderer viewport.
  const dpiCompacted = resolveStudioPaneWidths({
    workspaceWidth: 1_024,
    requestedContentsWidth: studioPaneLimits.contents.default,
    requestedPropertiesWidth: studioPaneLimits.properties.default,
    resizeTarget: "viewport",
  });
  assert.ok(dpiCompacted.canvasWidth >= studioPaneLimits.minimumCanvasWidth);
  assert.equal(
    dpiCompacted.contentsWidth +
      dpiCompacted.canvasWidth +
      dpiCompacted.propertiesWidth +
      studioPaneLimits.splitterWidth * 2,
    1_024,
  );
});

test("BLD-046 resolves only native/DPI-mismatched viewport widths", () => {
  const availableScreenWidth = 1_229;
  assert.equal(
    resolveStudioEffectiveViewportWidth({
      innerWidth: 1_180,
      devicePixelRatio: 1.25,
      availableScreenWidth: 1_536,
    }),
    1_180,
  );
  assert.equal(
    resolveStudioEffectiveViewportWidth({
      innerWidth: 1_280,
      devicePixelRatio: 1.25,
      availableScreenWidth,
    }),
    1_024,
  );
  assert.equal(
    resolveStudioEffectiveViewportWidth({
      innerWidth: 1_280,
      devicePixelRatio: 1.5,
      availableScreenWidth,
    }),
    853,
  );
  assert.equal(
    resolveStudioEffectiveViewportWidth({
      innerWidth: 1_280,
      devicePixelRatio: 1.75,
      availableScreenWidth,
    }),
    731,
  );
  assert.equal(
    resolveStudioEffectiveViewportWidth({
      innerWidth: 1_280,
      devicePixelRatio: 2,
      availableScreenWidth,
    }),
    640,
  );
  assert.equal(
    resolveStudioEffectiveViewportWidth({
      innerWidth: 1_024,
      devicePixelRatio: 1.25,
      availableScreenWidth,
    }),
    1_024,
  );
  assert.equal(
    resolveStudioEffectiveViewportWidth({
      innerWidth: 1_280,
      devicePixelRatio: 1,
      availableScreenWidth,
    }),
    1_280,
  );
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
    /grid-template-columns:[\s\S]+var\(--contents-pane-width,[\s\S]+var\(--properties-pane-width,/u,
  );
  assert.match(stylesheet, /\.ribbon\s*\{[^}]*flex-wrap:\s*nowrap/su);
  assert.match(stylesheet, /\.ribbon\s*\{[^}]*overflow-x:\s*hidden/su);
  assert.match(stylesheet, /\.ribbon\s*\{[^}]*overflow-y:\s*visible/su);
  assert.match(
    stylesheet,
    /\.canvas-context-menu\s*\{[^}]*position:\s*fixed[^}]*max-height:[^}]*overflow-y:\s*auto/su,
  );
  assert.match(stylesheet, /@container properties-pane \(max-width: 340px\)/u);
  assert.match(stylesheet, /overflow-wrap:\s*break-word/u);
  assert.match(stylesheet, /\.workspace\s*\{[\s\S]+width: 100%;[\s\S]+max-width: none/u);
});

test("BLD-046 wires pointer, keyboard, and precision-touchpad input", async () => {
  const [entry, main] = await Promise.all([
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../packages/platform-electron-main/src/semantic-editor-main.ts", import.meta.url),
      "utf8",
    ),
  ]);
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
  assert.match(entry, /resolveStudioRibbonGroupPlacement/u);
  assert.match(entry, /ribbonOverflowMenu\.append/u);
  assert.match(entry, /event\.preventDefault\(\)/u);
  assert.match(entry, /openCanvasContextMenu\(event\.clientX, event\.clientY\)/u);
  assert.match(main, /if \(!probeMode\) window\.center\(\)/u);
});
