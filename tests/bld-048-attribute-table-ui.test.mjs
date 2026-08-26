import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("BLD-048 exposes a docked accessible Attribute Table over shared projection records", async () => {
  const [route, entry, stylesheet] = await Promise.all([
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url), "utf8"),
  ]);

  assert.match(route, /id="toggle-attribute-table"[^>]+aria-pressed="false"/u);
  assert.match(route, /id="attribute-table-dock"[^>]+aria-labelledby="attribute-table-title"/u);
  assert.match(route, /id="attribute-table-splitter"[^>]+role="separator"[^>]+tabindex="0"/u);
  assert.match(route, /Find record or value/u);
  assert.match(route, /Selected only/u);
  assert.match(route, /id="attribute-table-go-to"[^>]+disabled>Go to/u);
  assert.match(route, /Strata[\s\S]*Samples[\s\S]*Graph observations[\s\S]*Remarks/u);
  assert.match(route, /Source \/ override/u);
  assert.match(route, /id="attribute-hover-card"[^>]+role="status"/u);

  assert.match(entry, /readonly attributeRecords: readonly AttributeRecord\[\]/u);
  assert.match(entry, /filteredAttributeRecords/u);
  assert.match(entry, /attributeTableSelectedOnly/u);
  assert.match(entry, /data-attribute-sort/u);
  assert.match(entry, /candidate\.semanticId === record\.semanticId/u);
  assert.match(
    entry,
    /replacementRow\?\.querySelector<HTMLTableCellElement>\("td\.is-editable"\)\?\.focus\(\)/u,
  );
  assert.match(entry, /reason: "Edited in RSrender Attribute Table"/u);
  assert.match(entry, /revertDisplayValue\(\{/u);
  assert.match(entry, /expectedOverrideRevision: editable\.application\.overrideRevision/u);
  assert.match(entry, /revertButton\.textContent = "Revert"/u);
  assert.match(entry, /event\.key === "Escape"[\s\S]*event\.key === "Enter"/u);
  assert.match(entry, /setAttributeHover\(record\.semanticId\)/u);
  assert.match(entry, /source \$\{source\}\$\{unit\} · project override/u);
  assert.match(entry, /pageHost\.addEventListener\("pointermove"/u);
  assert.match(entry, /pageHost\.addEventListener\("mousemove"/u);
  assert.match(entry, /attributeRecordForSemanticId\(semanticId\)/u);
  assert.match(entry, /matchingIndex \* boringLogAttributeTableCorpusLimits\.rowHeightPx/u);
  assert.match(entry, /attributeHoveredSemanticId = semanticId/u);
  assert.match(entry, /record\.semanticId === attributeHoveredSemanticId/u);
  assert.match(entry, /attributeTableSplitter\.setPointerCapture\(event\.pointerId\)/u);
  assert.match(entry, /attributeTableDock\.style\.height = `\$\{attributeTableHeight\}px`/u);
  assert.match(entry, /resolveBoringLogAttributeTableWindow\(/u);
  assert.match(entry, /attributeTableViewport\.dataset\["virtualized"\] = String\(virtualized\)/u);
  assert.match(entry, /requestAnimationFrame\(\(\) =>/u);
  assert.match(entry, /attributeActiveFieldIdentity = entry\.field\.fieldIdentity/u);
  assert.match(entry, /function goToActiveAttributeRecord/u);
  assert.match(entry, /revealed in the Attribute Table and Canvas/u);

  assert.match(stylesheet, /\.attribute-table-dock\s*\{[^}]*max-height:\s*42vh/su);
  assert.match(stylesheet, /\.attribute-table-viewport\s*\{[^}]*overflow:\s*auto/su);
  assert.match(stylesheet, /\.attribute-table-viewport th\s*\{[^}]*position:\s*sticky/su);
  assert.match(stylesheet, /\.scene-node\.is-attribute-hover/u);
  assert.match(stylesheet, /\.attribute-hover-card\s*\{[^}]*pointer-events:\s*none/su);
  assert.match(stylesheet, /tr\.attribute-table-virtual-spacer td/u);
  assert.match(stylesheet, /\.attribute-table-revert\s*\{/u);
});
