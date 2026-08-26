import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createBoringLogStudioHtml,
  resolveStudioFeedbackPresentation,
} from "../packages/renderer-ui/dist/index.js";

test("BLD-061 classifies visible feedback without changing message authority", () => {
  assert.deepEqual(
    resolveStudioFeedbackPresentation("Column heading must contain 1 through 80 characters."),
    { severity: "danger", severityLabel: "Problem", showBanner: true },
  );
  assert.deepEqual(resolveStudioFeedbackPresentation("Guide gesture canceled."), {
    severity: "warning",
    severityLabel: "Attention",
    showBanner: true,
  });
  assert.deepEqual(resolveStudioFeedbackPresentation("Sample S-1 selected from Contents."), {
    severity: "success",
    severityLabel: "Complete",
    showBanner: false,
  });
  assert.deepEqual(resolveStudioFeedbackPresentation("Drag to resize; Esc cancels."), {
    severity: "info",
    severityLabel: "Status",
    showBanner: false,
  });
});

test("BLD-061 mirrors accessible status into visible non-modal surfaces", async () => {
  const [entry, stylesheet] = await Promise.all([
    readFile(
      new URL("../packages/renderer-ui/src/boring-log-studio-entry.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url), "utf8"),
  ]);
  const html = createBoringLogStudioHtml(null);

  assert.match(html, /id="visible-editor-status"[^>]*aria-hidden="true"/u);
  assert.match(html, /id="editor-feedback-banner"[^>]*aria-hidden="true"[^>]*hidden/u);
  assert.match(html, /id="editor-feedback-severity">Problem</u);
  assert.match(html, /id="dismiss-editor-feedback"[^>]*>Dismiss<\/button>/u);
  assert.match(
    html,
    /id="editor-status" role="status" aria-live="polite" aria-atomic="true">Loading structured scene\.<\/p>/u,
  );
  assert.match(entry, /new MutationObserver\(renderVisibleFeedback\)\.observe\(status,/u);
  assert.match(entry, /visibleStatus\.textContent = message/u);
  assert.match(entry, /feedbackBanner\.hidden = !presentation\.showBanner/u);
  assert.match(entry, /dismissedFeedbackMessage = status\.textContent\?\.trim\(\) \?\? ""/u);
  assert.match(stylesheet, /\.editor-feedback-banner\[data-severity="danger"\]/u);
  assert.match(stylesheet, /button\[aria-pressed="true"\][^{]*\{[^}]*font-weight:\s*700/su);
  assert.match(stylesheet, /button:active:not\(:disabled\)/u);
});
