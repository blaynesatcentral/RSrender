import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  resolveStudioEffectiveViewportWidth,
  resolveStudioPaneWidths,
  resolveStudioRibbonGroupPlacement,
  studioPaneLimits,
} from "../packages/renderer-ui/dist/index.js";

test("BLD-053 preserves a valid CSS viewport instead of applying a second DPI reduction", () => {
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
      availableScreenWidth: 1_229,
    }),
    1_024,
  );
});

test("BLD-053 restores preferred pane widths and gives enlarged space back to Canvas", () => {
  const narrow = resolveStudioPaneWidths({
    workspaceWidth: 780,
    requestedContentsWidth: studioPaneLimits.contents.default,
    requestedPropertiesWidth: studioPaneLimits.properties.default,
    resizeTarget: "viewport",
  });
  const enlarged = resolveStudioPaneWidths({
    workspaceWidth: 1_400,
    requestedContentsWidth: studioPaneLimits.contents.default,
    requestedPropertiesWidth: studioPaneLimits.properties.default,
    resizeTarget: "viewport",
  });
  assert.ok(narrow.contentsWidth < studioPaneLimits.contents.default);
  assert.ok(enlarged.canvasWidth > narrow.canvasWidth);
  assert.equal(enlarged.contentsWidth, studioPaneLimits.contents.default);
  assert.equal(enlarged.propertiesWidth, studioPaneLimits.properties.default);
  assert.equal(
    enlarged.contentsWidth +
      enlarged.canvasWidth +
      enlarged.propertiesWidth +
      studioPaneLimits.splitterWidth * 2,
    1_400,
  );
});

test("BLD-060 moves whole command groups into a reachable overflow without horizontal scrolling", () => {
  const groups = [
    { id: "file", width: 330 },
    { id: "selection", width: 120 },
    { id: "page-setup", width: 760, alwaysOverflow: true },
    { id: "history", width: 120 },
  ];
  assert.deepEqual(
    resolveStudioRibbonGroupPlacement({
      ribbonWidth: 900,
      horizontalPadding: 24,
      messageWidth: 0,
      overflowTriggerWidth: 62,
      groups,
    }),
    {
      visibleIds: ["file", "selection", "history"],
      overflowIds: ["page-setup"],
    },
  );
  assert.deepEqual(
    resolveStudioRibbonGroupPlacement({
      ribbonWidth: 520,
      horizontalPadding: 24,
      messageWidth: 0,
      overflowTriggerWidth: 62,
      groups,
    }).overflowIds,
    ["selection", "page-setup", "history"],
  );
});

test("BLD-053 shell CSS and resize wiring remain fluid across narrow-wide cycles", async () => {
  const [stylesheet, entry] = await Promise.all([
    readFile(new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url), "utf8"),
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(stylesheet, /\.app-shell\s*\{[^}]*width:\s*100vw[^}]*min-width:\s*0/su);
  assert.match(stylesheet, /\.workspace\s*\{[^}]*width:\s*100%[^}]*max-width:\s*none/su);
  assert.doesNotMatch(stylesheet, /width:\s*attr\(data-effective-width px\)/u);
  assert.match(stylesheet, /@media \(max-width: 900px\)/u);
  assert.match(stylesheet, /font-size:\s*clamp\(9px,/u);
  assert.match(stylesheet, /\.ribbon\s*\{[^}]*flex-wrap:\s*nowrap[^}]*overflow-x:\s*hidden/su);
  assert.doesNotMatch(stylesheet, /\.ribbon\s*\{[^}]*overflow-x:\s*auto/su);
  assert.match(stylesheet, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(72px,\s*1fr\)\)/u);
  assert.match(entry, /preferredContentsPaneWidth/u);
  assert.match(entry, /preferredPropertiesPaneWidth/u);
  assert.match(entry, /resolveStudioRibbonGroupPlacement/u);
  assert.match(entry, /--contents-pane-width/u);
  assert.match(entry, /--properties-pane-width/u);
  assert.match(
    entry,
    /workspace\.parentElement\?\.clientWidth \?\? document\.documentElement\.clientWidth/u,
  );
  assert.match(
    entry,
    /applyPaneWidths\(preferredContentsPaneWidth, preferredPropertiesPaneWidth, "viewport"\)/u,
  );
});
