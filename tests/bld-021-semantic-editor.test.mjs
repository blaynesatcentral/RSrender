import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

import {
  semanticEditorMaximumStringUtf8Bytes,
  semanticEditorRevision,
  semanticEditorScriptUrl,
  semanticOverrideEditorHtml,
  validateReplacement,
  validateTargetSelection,
} from "../packages/renderer-ui/dist/index.js";
import {
  SEMANTIC_EDITOR_SCRIPT_URL,
  SEMANTIC_EDITOR_SECURITY_PROFILE,
  semanticEditorBundleMarker,
  verifyPackagedSemanticEditorRenderer,
} from "../packages/platform-electron-main/dist/index.js";

test("semantic route is one script-backed native editor without image or inline authority", () => {
  assert.equal(semanticEditorRevision, "bld-021-semantic-editor-v1");
  assert.equal(semanticEditorScriptUrl, SEMANTIC_EDITOR_SCRIPT_URL);
  assert.match(semanticOverrideEditorHtml, /<main aria-labelledby="editor-title">/u);
  assert.match(semanticOverrideEditorHtml, /<table>/u);
  assert.match(semanticOverrideEditorHtml, /<form id="override-form"/u);
  assert.match(semanticOverrideEditorHtml, /role="status" aria-live="polite"/u);
  assert.match(
    semanticOverrideEditorHtml,
    new RegExp(
      `<script src="${SEMANTIC_EDITOR_SCRIPT_URL.replaceAll("/", "\\/")}" defer><\\/script>`,
      "u",
    ),
  );
  assert.doesNotMatch(semanticOverrideEditorHtml, /<canvas|<svg|<img|<picture|style=|onclick=/u);
  assert.equal((semanticOverrideEditorHtml.match(/<script/gu) ?? []).length, 1);
});

test("replacement validation is closed, typed, and bounded at the transport string limit", () => {
  assert.equal(semanticEditorMaximumStringUtf8Bytes, 16_384);
  assert.deepEqual(validateReplacement("string", "Edited", "Because source display is stale"), {
    accepted: true,
    replacementContent: {
      kind: "value",
      value: "Edited",
      originalRepresentation: "Edited",
    },
    reason: "Because source display is stale",
  });
  assert.equal(validateReplacement("string", "", "Reason").accepted, false);
  assert.equal(validateReplacement("string", "Value", "   ").accepted, false);
  assert.equal(validateReplacement("string", "x".repeat(16_385), "Reason").accepted, false);
  assert.deepEqual(validateReplacement("number", "0", "Reason"), {
    accepted: true,
    replacementContent: { kind: "zero", value: 0, originalRepresentation: "0" },
    reason: "Reason",
  });
  assert.equal(validateReplacement("number", "NaN", "Reason").accepted, false);
  assert.equal(validateReplacement("boolean", "TRUE", "Reason").accepted, true);
  assert.equal(validateReplacement("absent", "Anything", "Reason").accepted, false);
});

test("target validation rejects zero, multiple, and ineligible selection without inference", () => {
  assert.deepEqual(validateTargetSelection(1, "eligible"), { accepted: true });
  assert.deepEqual(validateTargetSelection(0, "eligible"), {
    accepted: false,
    code: "TARGET_COUNT_INVALID",
    message: "Select exactly one eligible field.",
  });
  assert.deepEqual(validateTargetSelection(2, "eligible"), {
    accepted: false,
    code: "TARGET_COUNT_INVALID",
    message: "Select exactly one eligible field.",
  });
  assert.deepEqual(validateTargetSelection(1, "blocked"), {
    accepted: false,
    code: "TARGET_INELIGIBLE",
    message: "The selected field is not eligible for a Display Value Override.",
  });
});

test("renderer verifier accepts only exact marked bytes and exact digest", () => {
  const exact = Buffer.from(`/* ${semanticEditorBundleMarker} */\n(() => { "use strict"; })();\n`);
  const digest = createHash("sha256").update(exact).digest("hex");
  assert.deepEqual(verifyPackagedSemanticEditorRenderer(exact, digest), {
    accepted: true,
    sha256: digest,
    bytes: exact.byteLength,
    route: SEMANTIC_EDITOR_SCRIPT_URL,
  });
  assert.deepEqual(verifyPackagedSemanticEditorRenderer(null, digest), {
    accepted: false,
    code: "SEMANTIC_EDITOR_RENDERER_UNAVAILABLE",
  });
  assert.deepEqual(
    verifyPackagedSemanticEditorRenderer(Buffer.concat([exact, Buffer.from("x")]), digest),
    {
      accepted: false,
      code: "SEMANTIC_EDITOR_RENDERER_UNAVAILABLE",
    },
  );
  const wrongRoute = Buffer.from(`/* wrong.route */\n(() => {})();\n`);
  assert.deepEqual(
    verifyPackagedSemanticEditorRenderer(
      wrongRoute,
      createHash("sha256").update(wrongRoute).digest("hex"),
    ),
    { accepted: false, code: "SEMANTIC_EDITOR_RENDERER_UNAVAILABLE" },
  );
});

test("semantic profile changes only the exact script policy and retains denials", () => {
  assert.equal(SEMANTIC_EDITOR_SECURITY_PROFILE.url, "rsrender-shell://document/index.html");
  assert.equal(SEMANTIC_EDITOR_SECURITY_PROFILE.scriptUrl, SEMANTIC_EDITOR_SCRIPT_URL);
  assert.match(SEMANTIC_EDITOR_SECURITY_PROFILE.contentPolicy, /script-src 'self'/u);
  assert.match(SEMANTIC_EDITOR_SECURITY_PROFILE.contentPolicy, /script-src-attr 'none'/u);
  assert.match(SEMANTIC_EDITOR_SECURITY_PROFILE.contentPolicy, /connect-src 'none'/u);
  assert.equal(SEMANTIC_EDITOR_SECURITY_PROFILE.webPreferences.sandbox, true);
  assert.equal(SEMANTIC_EDITOR_SECURITY_PROFILE.webPreferences.contextIsolation, true);
  assert.equal(SEMANTIC_EDITOR_SECURITY_PROFILE.webPreferences.nodeIntegration, false);
  assert.equal(SEMANTIC_EDITOR_SECURITY_PROFILE.rendererNetwork, "deny-all");
});

test("renderer entry has no ambient transport, storage, background, or capture capability", async () => {
  const source = await readFile(
    new URL("../packages/renderer-ui/src/semantic-override-editor-entry.ts", import.meta.url),
    "utf8",
  );
  for (const [label, forbidden] of [
    ["innerHTML", /\binnerHTML\b/u],
    ["fetch", /\bfetch\s*\(/u],
    ["XMLHttpRequest", /\bXMLHttpRequest\b/u],
    ["WebSocket", /\bWebSocket\b/u],
    ["EventSource", /\bEventSource\b/u],
    ["setInterval", /\bsetInterval\b/u],
    ["setTimeout", /\bsetTimeout\b/u],
    ["localStorage", /\blocalStorage\b/u],
    ["sessionStorage", /\bsessionStorage\b/u],
    ["indexedDB", /\bindexedDB\b/u],
    ["clipboard", /\bclipboard\b/u],
    ["capturePage", /\bcapturePage\b/u],
    ["canvas", /\bcanvas\b/u],
    ["ipcRenderer", /\bipcRenderer\b/u],
    ["require", /\brequire\s*\(/u],
  ]) {
    assert.equal(forbidden.test(source), false, label);
  }
});
