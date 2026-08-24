import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { measureBoringLogTextRequests } from "../packages/layout-host/dist/index.js";
import { createBoringLogStudioHtml } from "../packages/renderer-ui/dist/index.js";
import { findCollisionFreeTextDuplicateOffset } from "../packages/renderer-ui/dist/boring-log-authoring-placement.js";
import { prepareBoringLogLayout, resolveBoringLogPageScene } from "../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../packages/test-support/dist/index.js";

test("BLD-040 exposes arrangement commands in the ribbon and exact Canvas context menu", () => {
  const html = createBoringLogStudioHtml(null);
  for (const id of [
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
  assert.match(entry, /alignment: "vertical-center"/u);
  assert.match(entry, /dimension: "both"/u);
  assert.match(entry, /distribution: "vertical-gaps"/u);
  assert.match(entry, /Detach all selected depth-bound text as free annotations/u);
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

test("BLD-040 coalesces repeated keyboard nudges at an explicit idle boundary", async () => {
  const entry = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
    "utf8",
  );
  const stylesheet = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url),
    "utf8",
  );
  assert.match(entry, /pendingKeyboardNudge/u);
  assert.match(entry, /function queueKeyboardNudge\(/u);
  assert.match(entry, /async function flushKeyboardNudge\(\)/u);
  assert.match(entry, /function cancelKeyboardNudge\(\)/u);
  assert.match(entry, /window\.setTimeout\(\(\) => void flushKeyboardNudge\(\), 220\)/u);
  assert.match(entry, /repeated keys coalesce into one Undo step after 220 ms idle/u);
  assert.match(entry, /expectedWorkingRevision: studioProjection\.workingRevision/u);
  assert.match(entry, /Vertical nudge is unavailable for depth-bound text/u);
  assert.match(entry, /Keyboard nudge stopped at the page boundary/u);
  assert.match(entry, /Pending keyboard nudge canceled; history and geometry are unchanged/u);
  assert.match(stylesheet, /\.keyboard-nudge-preview-frame/u);
});

test("BLD-040 exposes shared visibility, lock, and drawing-order commands", async () => {
  const html = createBoringLogStudioHtml(null);
  const entry = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
    "utf8",
  );
  const stylesheet = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url),
    "utf8",
  );
  for (const id of [
    "show-selection",
    "hide-selection",
    "lock-selection",
    "unlock-selection",
    "bring-front",
    "bring-forward",
    "send-backward",
    "send-back",
    "context-hide-selection",
    "context-lock-selection",
    "context-bring-front",
    "context-send-back",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`, "u"));
  }
  assert.match(entry, /async function mutateSelectedText\(/u);
  assert.match(entry, /apis\.studio\.mutateTextOccurrences/u);
  assert.match(entry, /commandSource: "keyboard" \| "ribbon" \| "context-menu" \| "contents"/u);
  assert.match(entry, /tree-state-command/u);
  assert.match(entry, /tree-visibility/u);
  assert.match(entry, /tree-lock/u);
  assert.match(entry, /key === "\]" \|\| key === "\["/u);
  assert.match(entry, /node\.presentation\?\.visible !== false/u);
  const main = await readFile(
    new URL("../packages/platform-electron-main/src/semantic-editor-main.ts", import.meta.url),
    "utf8",
  );
  assert.match(main, /TEXT_OCCURRENCES_DUPLICATED/u);
  assert.match(main, /textOccurrenceClones: \[\.\.\.existingClones, \.\.\.createdClones\]/u);
  assert.match(main, /TEXT_OCCURRENCES_GROUPED/u);
  assert.match(main, /TEXT_OCCURRENCES_UNGROUPED/u);
  assert.match(main, /textOccurrenceGroups: nextGroups/u);
  assert.match(main, /operation: "text-occurrence-authoring"/u);
  assert.match(stylesheet, /\.tree-row\.is-hidden-element/u);
  assert.match(stylesheet, /\.tree-row\.is-locked-element/u);
});

test("BLD-040 exposes a shared persisted layout clipboard command surface", async () => {
  const html = createBoringLogStudioHtml(null);
  const entry = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
    "utf8",
  );
  for (const id of [
    "copy-selection",
    "cut-selection",
    "paste-selection",
    "duplicate-selection",
    "delete-selection",
    "group-selection",
    "ungroup-selection",
    "context-copy-selection",
    "context-cut-selection",
    "context-paste-selection",
    "context-duplicate-selection",
    "context-delete-selection",
    "context-group-selection",
    "context-ungroup-selection",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`, "u"));
  }
  assert.match(entry, /textClipboardNodeIds/u);
  assert.match(entry, /function copySelectedText\(/u);
  assert.match(entry, /async function cutSelectedText\(/u);
  assert.match(entry, /function pasteCopiedText\(/u);
  assert.match(entry, /createdOccurrenceNodeIds/u);
  assert.match(entry, /function duplicateMutationFor\(/u);
  assert.match(entry, /findCollisionFreeTextDuplicateOffset/u);
  assert.match(entry, /Duplicate needs a collision-free location on this page/u);
  assert.match(entry, /event\.key === "Delete"/u);
  assert.match(entry, /kind: event\.shiftKey \? "ungroup" : "group"/u);
  assert.match(entry, /Grouping requires sibling text elements under the same Contents parent/u);
  for (const key of ["c", "x", "v", "d"]) {
    assert.match(entry, new RegExp(`key === "${key}"`, "u"));
  }
});

test("BLD-040 places duplicated header text without manufacturing publication collisions", () => {
  const prepared = prepareBoringLogLayout({
    contractVersion: 1,
    schemaVersion: "rsrender.boring-log-layout-job.v1",
    kind: "boring-log.layout-job",
    jobId: "job:bld-040-authoring-placement@r1",
    inputRevision: 1,
    fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
    templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
    document: structuredClone(boringLogMvpFixture),
    template: structuredClone(boringLogMvpTemplate),
  });
  assert.equal(prepared.accepted, true);
  const measured = measureBoringLogTextRequests(prepared.value.textRequests);
  assert.equal(measured.accepted, true);
  const resolved = resolveBoringLogPageScene(prepared.value, measured.results);
  assert.equal(resolved.accepted, true);
  const page = resolved.value.pages[0];
  const selectedIds = ["node:header-title", "node:header-sheet"];
  const offset = findCollisionFreeTextDuplicateOffset(resolved.value, page.pageId, selectedIds);
  assert.notEqual(offset, null);
  assert.notDeepEqual(offset, { offsetXMpt: 0, offsetYMpt: 0 });

  const results = new Map(
    resolved.value.textResults.map((result) => [result.measurementId, result]),
  );
  const existing = page.nodes
    .filter((node) => node.kind === "text" && node.presentation?.visible !== false)
    .map((node) => {
      const ink = results.get(node.measurementId).inkBounds;
      return {
        x: node.frame.xMpt + ink.xMpt,
        y: node.frame.yMpt + ink.yMpt,
        width: ink.widthMpt,
        height: ink.heightMpt,
      };
    });
  for (const node of page.nodes.filter(
    (candidate) => candidate.kind === "text" && selectedIds.includes(candidate.id),
  )) {
    const ink = results.get(node.measurementId).inkBounds;
    const clone = {
      x: node.frame.xMpt + ink.xMpt + offset.offsetXMpt,
      y: node.frame.yMpt + ink.yMpt + offset.offsetYMpt,
      width: ink.widthMpt,
      height: ink.heightMpt,
    };
    assert.equal(
      existing.some(
        (other) =>
          Math.min(clone.x + clone.width, other.x + other.width) > Math.max(clone.x, other.x) &&
          Math.min(clone.y + clone.height, other.y + other.height) > Math.max(clone.y, other.y),
      ),
      false,
    );
  }
});
