import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createBoringLogStudioHtml } from "../packages/renderer-ui/dist/index.js";

test("BLD-064 keeps selection scope ahead of progressively disclosed Inspector groups", async () => {
  const stylesheet = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url),
    "utf8",
  );
  const html = createBoringLogStudioHtml(null);
  const scopeIndex = html.indexOf('<div class="selection-card">');
  const regionIndex = html.indexOf('id="region-resize-properties"');
  const contentIndex = html.indexOf("<summary>Content & placement</summary>");
  assert.ok(scopeIndex > 0 && scopeIndex < regionIndex && regionIndex < contentIndex);
  assert.match(html, /<details class="property-group"><summary>Value source<\/summary>/u);
  assert.match(html, /<details id="text-inheritance-properties" class="property-group" hidden>/u);
  assert.match(html, /<details class="property-group"><summary>Advanced diagnostics<\/summary>/u);
  assert.match(
    stylesheet,
    /\.selection-card\s*\{[^}]*position:\s*sticky[^}]*top:\s*0[^}]*z-index:\s*6/su,
  );
});
