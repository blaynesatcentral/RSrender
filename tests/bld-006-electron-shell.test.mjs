import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  EMPTY_SHELL_SECURITY_PROFILE,
  EMPTY_SHELL_URL,
} from "../packages/platform-electron-main/dist/index.js";
import { inertShellHtml } from "../packages/renderer-ui/dist/index.js";

test("BLD-006 security profile explicitly denies renderer authority", () => {
  assert.equal(EMPTY_SHELL_SECURITY_PROFILE.electronVersion, "43.4.0");
  assert.equal(EMPTY_SHELL_SECURITY_PROFILE.persistence, "memory-only");
  assert.equal(EMPTY_SHELL_SECURITY_PROFILE.preload, "absent");
  assert.deepEqual(EMPTY_SHELL_SECURITY_PROFILE.ipcChannels, []);
  assert.deepEqual(EMPTY_SHELL_SECURITY_PROFILE.rendererCapabilities, []);
  assert.deepEqual(EMPTY_SHELL_SECURITY_PROFILE.webPreferences, {
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    devTools: false,
    webviewTag: false,
    safeDialogs: true,
    navigateOnDragDrop: false,
    spellcheck: false,
  });
  assert.equal(EMPTY_SHELL_URL, "rsrender-shell://app/index.html");
  assert.match(EMPTY_SHELL_SECURITY_PROFILE.contentPolicy, /connect-src 'none'/u);
  assert.match(EMPTY_SHELL_SECURITY_PROFILE.contentPolicy, /script-src 'none'/u);
  assert.match(EMPTY_SHELL_SECURITY_PROFILE.contentPolicy, /frame-src 'none'/u);
});

test("BLD-006 renderer is inert static markup", () => {
  assert.match(inertShellHtml, /No application capabilities are available\./u);
  assert.doesNotMatch(inertShellHtml, /<script\b/iu);
  assert.doesNotMatch(inertShellHtml, /<iframe\b/iu);
  assert.doesNotMatch(inertShellHtml, /<webview\b/iu);
  assert.doesNotMatch(inertShellHtml, /<(?:input|button|form|a)\b/iu);
  assert.doesNotMatch(inertShellHtml, /\b(?:src|href)\s*=/iu);
});

test("BLD-006 main registers no IPC or renderer preload bridge", async () => {
  const mainSource = await readFile("packages/platform-electron-main/src/main.ts", "utf8");
  assert.doesNotMatch(mainSource, /\bipcMain\b/u);
  assert.doesNotMatch(mainSource, /\bcontextBridge\b/u);
  assert.doesNotMatch(mainSource, /\bwebContents\.send\b/u);
  assert.doesNotMatch(mainSource, /\bpreload\s*:/u);
});
