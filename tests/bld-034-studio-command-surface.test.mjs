import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createBoringLogStudioHtml } from "../packages/renderer-ui/dist/index.js";

const expectedCommandIds = Object.freeze([
  "ribbon-tab-home",
  "ribbon-tab-layout",
  "ribbon-tab-data",
  "ribbon-tab-review",
  "ribbon-tab-publish",
  "new-project",
  "open-project",
  "import-rslog-project-data",
  "connect-rslog",
  "save-project",
  "save-project-as",
  "first-boring",
  "previous-boring",
  "next-boring",
  "last-boring",
  "select-page",
  "select-body",
  "undo",
  "redo",
  "apply-page-setup",
  "fit-page",
  "actual-size",
  "toggle-smart-snap",
  "toggle-grid-snap",
  "add-vertical-guide",
  "add-horizontal-guide",
  "align-left",
  "align-center",
  "align-right",
  "align-top",
  "align-middle",
  "align-bottom",
  "match-width",
  "match-height",
  "match-both",
  "distribute-horizontal",
  "distribute-vertical",
  "copy-selection",
  "cut-selection",
  "paste-selection",
  "duplicate-selection",
  "delete-selection",
  "group-selection",
  "ungroup-selection",
  "show-selection",
  "hide-selection",
  "lock-selection",
  "unlock-selection",
  "bring-front",
  "bring-forward",
  "send-backward",
  "send-back",
  "inspect-samples",
  "inspect-track",
  "toggle-attribute-table",
  "attribute-table-go-to",
  "close-attribute-table",
  "close-add-column",
  "insert-dynamic-text",
  "apply-data-controls",
  "validate-document",
  "show-diagnostics",
  "export-pdf",
  "publication-select-all",
  "publication-clear",
  "publication-project-order",
  "publication-move-up",
  "publication-move-down",
  "contents-options",
  "contents-mode-drawing",
  "contents-mode-source",
  "select-tool",
  "pan-tool",
  "properties-options",
  "dismiss-editor-feedback",
  "property-tab-element",
  "property-tab-diagnostics",
  "apply-property",
  "apply-lithology-interval",
  "apply-data-layer-symbology",
  "apply-column-width",
  "apply-region-height",
  "apply-region-border",
  "apply-text-style",
  "detach-text-annotation",
  "context-properties",
  "context-add-column",
  "context-align-left",
  "context-align-center",
  "context-align-right",
  "context-align-top",
  "context-align-middle",
  "context-align-bottom",
  "context-match-width",
  "context-match-height",
  "context-match-both",
  "context-distribute-horizontal",
  "context-distribute-vertical",
  "context-copy-selection",
  "context-cut-selection",
  "context-paste-selection",
  "context-duplicate-selection",
  "context-delete-selection",
  "context-group-selection",
  "context-ungroup-selection",
  "context-hide-selection",
  "context-lock-selection",
  "context-bring-front",
  "context-send-back",
  "reset-text-presentation",
  "set-lithology-default",
  "zoom-out",
  "zoom-in",
]);

test("BLD-034 gives every static Studio button an owned command identity", async () => {
  const html = createBoringLogStudioHtml(null);
  const buttons = [...html.matchAll(/<button\b([^>]*)>/gu)];
  assert.ok(buttons.length >= expectedCommandIds.length);
  const buttonIds = buttons.map(([, attributes]) => {
    const match = /\bid="([^"]+)"/u.exec(attributes);
    assert.notEqual(match, null, `button has no command identity: ${attributes}`);
    return match[1];
  });
  assert.deepEqual([...buttonIds].sort(), [...expectedCommandIds].sort());

  const entry = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
    "utf8",
  );
  for (const id of expectedCommandIds) {
    assert.match(entry, new RegExp(`"${id}"`, "u"));
  }
  assert.match(entry, /Unowned Boring Log Studio command/u);
  assert.doesNotMatch(html, />×<\/span>/u);
});

test("BLD-034 binds real tool, fit, validation, pane, mode, and dirty behavior", async () => {
  const entry = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
    "utf8",
  );
  assert.match(entry, /function setInteractionMode\(mode: "select" \| "pan"\)/u);
  assert.match(entry, /canvasStage\.addEventListener\("pointermove"/u);
  assert.match(entry, /if \(interactionMode !== "select"\) return/u);
  assert.match(entry, /function fitPage\(\): void/u);
  assert.match(entry, /canvasStage\.clientWidth - horizontalPadding/u);
  assert.match(entry, /canvasStage\.clientHeight - verticalPadding/u);
  assert.doesNotMatch(entry, /"fit-page"[^\n]+applyZoom\(80\)/u);
  assert.match(entry, /async function validateDocument\(\): Promise<void>/u);
  assert.match(entry, /refreshStudioProjection\(revision/u);
  assert.match(entry, /showPropertyPanel\("diagnostics"\)/u);
  assert.match(entry, /function toggleAllContentsGroups\(\): void/u);
  assert.match(entry, /function toggleAllPropertyGroups\(\): void/u);
  assert.match(entry, /function setContentsMode\(mode: "drawing" \| "source"\)/u);
  assert.match(entry, /studioProjection\?\.dirty === true/u);
  assert.match(entry, /documentState\.textContent = dirty \? "Unsaved changes" : "Clean"/u);
});

test("BLD-034 exposes explicit pan and dirty visual states", async () => {
  const stylesheet = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url),
    "utf8",
  );
  assert.match(stylesheet, /\.canvas-stage\.is-pan-mode\s*\{[^}]*cursor:\s*grab/su);
  assert.match(stylesheet, /\.canvas-stage\.is-panning[^}]*cursor:\s*grabbing/su);
  assert.match(stylesheet, /\.saved-dot\.is-dirty\s*\{[^}]*background:/su);
  assert.match(stylesheet, /\.status-ready\.is-dirty\s*\{[^}]*color:/su);
});
