import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session } from "electron";
import type { IpcMainInvokeEvent } from "electron";

import {
  createSyntheticBoringLogOverrideSession,
  createSyntheticOverrideRenderDatasetSession,
  type SyntheticBoringLogOverrideSession,
} from "@rsrender/application";
import type { BoringLogPublicationProjection } from "@rsrender/layout-host";

import {
  DOCUMENT_BOOTSTRAP_CHANNEL,
  DOCUMENT_GET_PROJECTION_CHANNEL,
  DOCUMENT_REDO_CHANNEL,
  DOCUMENT_ROUTE_URL,
  DOCUMENT_SET_DISPLAY_VALUE_CHANNEL,
  DOCUMENT_UNDO_CHANNEL,
  createDocumentRouteBroker,
  type DocumentRouteContext,
} from "./document-route-broker.js";
import { resolveBoringLogStudioProjection } from "./boring-log-studio-projection.js";
import { publishBoringLogPdf } from "./boring-log-pdf-publication.js";
import { BoringLogPdfPublicationRouteBroker } from "./boring-log-publication-route-broker.js";
import {
  BORING_LOG_PUBLICATION_BOOTSTRAP_CHANNEL,
  BORING_LOG_PUBLICATION_EXPORT_CHANNEL,
} from "./boring-log-publication-route-contract.js";
import { BoringLogStudioRouteBroker } from "./boring-log-studio-route-broker.js";
import {
  BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL,
  BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL,
} from "./boring-log-studio-route-contract.js";
import { DocumentSessionHost } from "./document-session-host.js";
import {
  packagedBoringLogStudioPreloadRelativePath,
  verifyPackagedBoringLogStudioPreload,
} from "./packaged-boring-log-studio-preload.js";
import {
  packagedDocumentPreloadRelativePath,
  verifyPackagedDocumentPreload,
} from "./packaged-document-preload.js";
import {
  packagedSemanticEditorRendererRelativePath,
  verifyPackagedSemanticEditorRenderer,
} from "./packaged-semantic-editor-renderer.js";
import {
  BORING_LOG_STUDIO_STYLESHEET_URL,
  SEMANTIC_EDITOR_SCRIPT_URL,
  SEMANTIC_EDITOR_SECURITY_PROFILE,
} from "./semantic-editor-security-profile.js";

const DOCUMENT_SCHEME = "rsrender-shell";
const LAYOUT_HOST_SCHEME = "rsrender-layout";
const LAYOUT_HOST_URL = "rsrender-layout://publication/index.html";
const PROBE_ARGUMENT = "--rsrender-bld021-probe";
const STUDIO_PROBE_ARGUMENT = "--rsrender-bld025-probe";
const PDF_PROBE_ARGUMENT = "--rsrender-bld027-probe";
const PROFILE_ARGUMENT_PREFIX = "--rsrender-bld021-profile=";
const STUDIO_PROFILE_ARGUMENT_PREFIX = "--rsrender-bld025-profile=";
const PDF_PROFILE_ARGUMENT_PREFIX = "--rsrender-bld027-profile=";
const PDF_OUTPUT_ARGUMENT_PREFIX = "--rsrender-bld027-output=";
const RESULT_MARKER = "RSRENDER_BLD021_RESULT=";
const STUDIO_RESULT_MARKER = "RSRENDER_BLD025_RESULT=";
const studioEditingMode = globalThis.__RSRENDER_BORING_LOG_LAYOUT_JOB__ !== undefined;
const bld021ProbeMode = process.argv.includes(PROBE_ARGUMENT);
const pdfProbeMode = process.argv.includes(PDF_PROBE_ARGUMENT);
const studioProbeMode = process.argv.includes(STUDIO_PROBE_ARGUMENT) || pdfProbeMode;
const probeMode = bld021ProbeMode || studioProbeMode;
const profileArgument = process.argv.find((value) =>
  value.startsWith(
    pdfProbeMode
      ? PDF_PROFILE_ARGUMENT_PREFIX
      : studioProbeMode
        ? STUDIO_PROFILE_ARGUMENT_PREFIX
        : PROFILE_ARGUMENT_PREFIX,
  ),
);
const profilePrefix = pdfProbeMode
  ? PDF_PROFILE_ARGUMENT_PREFIX
  : studioProbeMode
    ? STUDIO_PROFILE_ARGUMENT_PREFIX
    : PROFILE_ARGUMENT_PREFIX;
const profileRoot =
  profileArgument === undefined
    ? path.join(
        app.getPath("temp"),
        pdfProbeMode
          ? "rsrender-bld027-boring-log-pdf-profile"
          : studioProbeMode
            ? "rsrender-bld025-boring-log-studio-profile"
            : "rsrender-bld021-semantic-editor-profile",
      )
    : path.resolve(profileArgument.slice(profilePrefix.length));
const pdfProbeOutput = process.argv
  .find((value) => value.startsWith(PDF_OUTPUT_ARGUMENT_PREFIX))
  ?.slice(PDF_OUTPUT_ARGUMENT_PREFIX.length);
const preloadPath = path.join(
  app.getAppPath(),
  ...(studioEditingMode
    ? packagedBoringLogStudioPreloadRelativePath
    : packagedDocumentPreloadRelativePath
  ).split("/"),
);
const rendererPath = path.join(
  app.getAppPath(),
  ...packagedSemanticEditorRendererRelativePath.split("/"),
);
const stylesheetPath = path.join(app.getAppPath(), "renderer", "boring-log-studio.css");
const preloadBytes = (() => {
  try {
    return readFileSync(preloadPath) as Uint8Array;
  } catch {
    return null;
  }
})();
const rendererBytes = (() => {
  try {
    return readFileSync(rendererPath) as Uint8Array;
  } catch {
    return null;
  }
})();
const rendererSource = (() => {
  try {
    return rendererBytes === null
      ? null
      : new TextDecoder("utf-8", { fatal: true }).decode(rendererBytes);
  } catch {
    return null;
  }
})();
const stylesheetSource = (() => {
  try {
    return readFileSync(stylesheetPath, "utf8");
  } catch {
    return null;
  }
})();
const preloadVerification = studioEditingMode
  ? verifyPackagedBoringLogStudioPreload(preloadBytes)
  : verifyPackagedDocumentPreload(preloadBytes);
const rendererVerification = verifyPackagedSemanticEditorRenderer(
  rendererBytes,
  globalThis.__RSRENDER_SEMANTIC_EDITOR_RENDERER_SHA256__,
);

app.disableHardwareAcceleration();
app.setPath("userData", profileRoot);
app.setPath("sessionData", path.join(profileRoot, "session"));
protocol.registerSchemesAsPrivileged([
  {
    scheme: DOCUMENT_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: false,
      corsEnabled: false,
      stream: true,
    },
  },
  {
    scheme: LAYOUT_HOST_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: false,
      corsEnabled: false,
      stream: true,
    },
  },
]);

type Broker = Extract<ReturnType<typeof createDocumentRouteBroker>, { accepted: true }>["broker"];
type DataRecord = Readonly<Record<string, unknown>>;
type Counters = {
  navigation: number;
  popup: number;
  permissionCheck: number;
  permissionRequest: number;
  download: number;
  webview: number;
  network: number;
  certificate: number;
  rotation: number;
};

const handlers = [
  DOCUMENT_BOOTSTRAP_CHANNEL,
  DOCUMENT_GET_PROJECTION_CHANNEL,
  DOCUMENT_SET_DISPLAY_VALUE_CHANNEL,
  DOCUMENT_UNDO_CHANNEL,
  DOCUMENT_REDO_CHANNEL,
  BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL,
  BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL,
  BORING_LOG_PUBLICATION_BOOTSTRAP_CHANNEL,
  BORING_LOG_PUBLICATION_EXPORT_CHANNEL,
] as const;
const sessionHost = new DocumentSessionHost();
let editorWindow: BrowserWindow | null = null;
let editorSession: Electron.Session | null = null;
let broker: Broker | null = null;
let studioBroker: BoringLogStudioRouteBroker | null = null;
let publicationBroker: BoringLogPdfPublicationRouteBroker | null = null;
let teardownPromise: Promise<void> | null = null;
let probeFailure = "UNCLASSIFIED";

function exactRequest(rawUrl: string, method: string): "html" | "script" | "stylesheet" | null {
  if (method !== "GET") return null;
  if (rawUrl === DOCUMENT_ROUTE_URL) return "html";
  if (rawUrl === SEMANTIC_EDITOR_SCRIPT_URL) return "script";
  if (rawUrl === BORING_LOG_STUDIO_STYLESHEET_URL && stylesheetSource !== null) return "stylesheet";
  return null;
}

function installDenials(electronSession: Electron.Session, counters: Counters): void {
  electronSession.setPermissionCheckHandler(() => {
    counters.permissionCheck += 1;
    return false;
  });
  electronSession.setPermissionRequestHandler((_contents, _permission, callback) => {
    counters.permissionRequest += 1;
    callback(false);
  });
  electronSession.setDevicePermissionHandler(() => false);
  electronSession.on("will-download", (event) => {
    counters.download += 1;
    event.preventDefault();
  });
  electronSession.webRequest.onBeforeRequest((details, callback) => {
    const allowed = exactRequest(details.url, details.method) !== null;
    if (!allowed) counters.network += 1;
    callback({ cancel: !allowed });
  });
}

function installProtocol(electronSession: Electron.Session): void {
  electronSession.protocol.handle(DOCUMENT_SCHEME, (request) => {
    const kind = exactRequest(request.url, request.method);
    if (kind === null) {
      return new Response("Not found", {
        status: 404,
        headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    const body =
      kind === "html"
        ? globalThis.__RSRENDER_SEMANTIC_EDITOR_HTML__
        : kind === "script"
          ? rendererSource
          : stylesheetSource;
    return new Response(body, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Security-Policy": SEMANTIC_EDITOR_SECURITY_PROFILE.contentPolicy,
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Content-Type":
          kind === "html"
            ? "text/html; charset=utf-8"
            : kind === "script"
              ? "application/javascript; charset=utf-8"
              : "text/css; charset=utf-8",
        "Permissions-Policy":
          "accelerometer=(), camera=(), display-capture=(), geolocation=(), microphone=(), payment=(), usb=()",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}

async function renderPublicationPdf(
  projection: BoringLogPublicationProjection,
): Promise<Uint8Array> {
  const partition = `rsrender-layout-host-${randomBytes(16).toString("hex")}`;
  const layoutSession = session.fromPartition(partition, { cache: false });
  layoutSession.setPermissionCheckHandler(() => false);
  layoutSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  layoutSession.setDevicePermissionHandler(() => false);
  layoutSession.on("will-download", (event) => event.preventDefault());
  layoutSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: details.method !== "GET" || details.url !== LAYOUT_HOST_URL });
  });
  layoutSession.protocol.handle(LAYOUT_HOST_SCHEME, (request) => {
    if (request.method !== "GET" || request.url !== LAYOUT_HOST_URL) {
      return new Response("Not found", {
        status: 404,
        headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    return new Response(projection.html, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; font-src 'none'; frame-src 'none'; child-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
        "Content-Type": "text/html; charset=utf-8",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Permissions-Policy":
          "accelerometer=(), camera=(), display-capture=(), geolocation=(), microphone=(), payment=(), usb=()",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
  const layoutWindow = new BrowserWindow({
    show: false,
    width: 612,
    height: 792,
    useContentSize: true,
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      ...SEMANTIC_EDITOR_SECURITY_PROFILE.webPreferences,
      partition,
    },
  });
  layoutWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  layoutWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (targetUrl !== LAYOUT_HOST_URL) event.preventDefault();
  });
  layoutWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
  try {
    await layoutWindow.loadURL(LAYOUT_HOST_URL);
    const state = (await layoutWindow.webContents.executeJavaScript(
      `(() => ({ sceneDigest: document.querySelector("svg")?.getAttribute("data-scene-digest"), projectionDigest: document.querySelector("svg")?.getAttribute("data-projection-digest"), nodeCount: document.querySelectorAll(".scene-node").length, rasterCount: document.querySelectorAll("img,picture,canvas,image").length, title: document.title }))()`,
      true,
    )) as Readonly<Record<string, unknown>>;
    if (
      state["sceneDigest"] !== projection.manifest.sceneDigest ||
      state["projectionDigest"] !== projection.projectionDigest ||
      state["nodeCount"] !== projection.manifest.sceneNodeCount ||
      state["rasterCount"] !== 0 ||
      state["title"] !== projection.documentTitle
    ) {
      throw new Error("LAYOUT_HOST_PROJECTION_MISMATCH");
    }
    const pdf = await layoutWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      generateTaggedPDF: true,
      generateDocumentOutline: true,
      displayHeaderFooter: false,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    await new Promise<void>((resolve) => {
      layoutWindow.once("closed", resolve);
      layoutWindow.close();
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    return pdf;
  } finally {
    if (!layoutWindow.isDestroyed()) layoutWindow.destroy();
    layoutSession.protocol.unhandle(LAYOUT_HOST_SCHEME);
  }
}

function routeContext(window: BrowserWindow, event: IpcMainInvokeEvent): DocumentRouteContext {
  return Object.freeze({
    window: BrowserWindow.fromWebContents(event.sender),
    webContents: event.sender,
    frame: event.senderFrame,
    mainFrame: event.sender.mainFrame,
    url: event.senderFrame?.url ?? "",
    windowLive: !window.isDestroyed(),
    webContentsLive: !event.sender.isDestroyed(),
  });
}

function requireProbe(condition: unknown, code: string): asserts condition {
  if (!condition) {
    probeFailure = code;
    throw new Error(code);
  }
}

function record(input: unknown): DataRecord {
  requireProbe(typeof input === "object" && input !== null && !Array.isArray(input), "SHAPE");
  return input as DataRecord;
}

function emitResult(value: unknown): void {
  process.stdout.write(
    `${studioProbeMode ? STUDIO_RESULT_MARKER : RESULT_MARKER}${Buffer.from(JSON.stringify(value), "utf8").toString("base64")}\n`,
  );
}

async function pageValue(window: BrowserWindow, expression: string): Promise<unknown> {
  return window.webContents.executeJavaScript(expression, true);
}

async function waitFor(window: BrowserWindow, expression: string, code: string): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if ((await pageValue(window, expression)) === true) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const debug = await pageValue(
    window,
    `(() => ({ revision: document.getElementById("working-revision")?.textContent, status: document.getElementById("editor-status")?.textContent, error: document.getElementById("form-error")?.textContent, selected: document.querySelectorAll('input[type="checkbox"]:checked').length, applyDisabled: document.getElementById("apply-override")?.disabled, activeId: document.activeElement?.id }))()`,
  );
  requireProbe(false, `${code}:${JSON.stringify(debug)}`);
}

async function press(
  window: BrowserWindow,
  selector: string,
  keyCode: string,
  code: string,
): Promise<void> {
  window.webContents.focus();
  let focused = false;
  for (let attempt = 0; attempt < 40 && !focused; attempt += 1) {
    focused =
      (await pageValue(
        window,
        `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLElement) || (node instanceof HTMLButtonElement && node.disabled) || (node instanceof HTMLInputElement && node.disabled)) return false; node.focus(); return document.activeElement === node; })()`,
      )) === true;
    if (!focused) await new Promise((resolve) => setTimeout(resolve, 25));
  }
  requireProbe(focused, code);
  window.webContents.sendInputEvent({ type: "keyDown", keyCode });
  window.webContents.sendInputEvent({ type: "keyUp", keyCode });
  await new Promise((resolve) => setTimeout(resolve, 50));
}

async function typeText(window: BrowserWindow, selector: string, value: string): Promise<void> {
  requireProbe(
    (await pageValue(
      window,
      `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) return false; node.focus(); node.value = ""; return true; })()`,
    )) === true,
    "INPUT_FOCUS_FAILED",
  );
  await window.webContents.insertText(value);
}

async function uiSnapshot(window: BrowserWindow): Promise<DataRecord> {
  return record(
    await pageValue(
      window,
      `(() => ({
        title: document.querySelector("h1")?.textContent,
        tableCount: document.querySelectorAll("table").length,
        caption: document.querySelector("caption")?.textContent,
        rowCount: document.querySelectorAll("tbody tr:not([hidden])").length,
        workingRevision: document.getElementById("working-revision")?.textContent,
        durableRevision: document.getElementById("durable-revision")?.textContent,
        dirty: document.getElementById("dirty-state")?.textContent,
        history: document.getElementById("history-state")?.textContent,
        status: document.getElementById("editor-status")?.textContent,
        error: document.getElementById("form-error")?.textContent,
        activeId: document.activeElement?.id,
        apiKeys: Object.keys(globalThis.rsrender.document),
        nodeGlobals: [typeof require, typeof process, typeof electron],
        canvasCount: document.querySelectorAll("canvas,svg,img,picture").length,
        liveRegions: document.querySelectorAll('[role="status"][aria-live="polite"]').length,
      }))()`,
    ),
  );
}

async function runProbe(window: BrowserWindow, counters: Counters): Promise<DataRecord> {
  await waitFor(
    window,
    `document.getElementById("working-revision")?.textContent === "0" && document.getElementById("editor-status")?.textContent === "Full projection loaded."`,
    "WAIT_INITIAL",
  );
  const initial = await uiSnapshot(window);
  requireProbe(
    initial["title"] === "RSrender semantic override editor" &&
      initial["tableCount"] === 1 &&
      (initial["rowCount"] as number) >= 1 &&
      initial["workingRevision"] === "0" &&
      initial["durableRevision"] === "0" &&
      initial["dirty"] === "No" &&
      JSON.stringify(initial["apiKeys"]) === '["getProjection","setDisplayValue","undo","redo"]' &&
      JSON.stringify(initial["nodeGlobals"]) === '["undefined","undefined","undefined"]' &&
      initial["canvasCount"] === 0 &&
      initial["liveRegions"] === 1,
    "INITIAL_UI_INVALID",
  );
  const initialAuthority = record(
    await pageValue(
      window,
      `globalThis.rsrender.document.getProjection({ minimumWorkingRevision: 0 })`,
    ),
  );
  const initialProjection = record(initialAuthority["projection"]);
  const authorityValues = initialProjection["values"];
  requireProbe(Array.isArray(authorityValues), "AUTHORITY_VALUES_INVALID");
  const authorityTarget = authorityValues
    .map((value) => record(value))
    .find(
      (value) =>
        record(record(value["sourceOriginal"])["content"])["value"] === "SYNTHETIC-EXPLORATION-001",
    );
  requireProbe(authorityTarget !== undefined, "AUTHORITY_TARGET_MISSING");
  const authorityOriginal = record(authorityTarget["sourceOriginal"]);

  const targetSelector = await pageValue(
    window,
    `(() => { for (const row of document.querySelectorAll("tbody tr")) { if (row.cells[2]?.textContent === "SYNTHETIC-EXPLORATION-001") return 'input[data-field-identity="' + CSS.escape(row.dataset.fieldIdentity) + '"]'; } return null; })()`,
  );
  requireProbe(typeof targetSelector === "string", "TARGET_MISSING");
  await press(window, targetSelector, "Space", "FOCUS_TARGET");
  await typeText(window, "#override-value", "SYNTHETIC-EXPLORATION-001-EDITED");
  await typeText(window, "#override-reason", "User-visible semantic editor proof");
  await press(window, "#apply-override", "Space", "FOCUS_APPLY");
  await waitFor(
    window,
    `document.getElementById("working-revision")?.textContent === "1" && document.getElementById("editor-status")?.textContent?.startsWith("Override applied") === true && document.getElementById("undo")?.disabled === false`,
    "WAIT_SET",
  );
  const set = await uiSnapshot(window);
  requireProbe(set["dirty"] === "Yes" && set["activeId"] === "override-value", "SET_UI_INVALID");

  await press(window, "#undo", "Space", "FOCUS_UNDO");
  await waitFor(
    window,
    `document.getElementById("working-revision")?.textContent === "2" && document.getElementById("redo")?.disabled === false`,
    "WAIT_UNDO",
  );
  const undo = await uiSnapshot(window);
  requireProbe(undo["dirty"] === "Yes" && undo["activeId"] === "redo", "UNDO_UI_INVALID");

  await press(window, "#redo", "Space", "FOCUS_REDO");
  await waitFor(
    window,
    `document.getElementById("working-revision")?.textContent === "3" && document.getElementById("undo")?.disabled === false`,
    "WAIT_REDO",
  );
  const redo = await uiSnapshot(window);
  requireProbe(redo["dirty"] === "Yes" && redo["activeId"] === "undo", "REDO_UI_INVALID");

  await press(window, "#refetch", "Space", "FOCUS_REFETCH");
  await waitFor(
    window,
    `document.getElementById("editor-status")?.textContent === "Full projection refreshed."`,
    "WAIT_REFETCH",
  );
  const refetch = await uiSnapshot(window);
  requireProbe(
    refetch["workingRevision"] === "3" && refetch["activeId"] === "refetch",
    "REFETCH_INVALID",
  );

  await typeText(window, "#override-value", "");
  await press(window, "#apply-override", "Space", "FOCUS_INVALID_APPLY");
  await waitFor(
    window,
    `document.getElementById("form-error")?.textContent === "Enter a replacement display value."`,
    "WAIT_INVALID",
  );
  const invalid = await uiSnapshot(window);
  requireProbe(
    invalid["workingRevision"] === "3" && invalid["activeId"] === "override-value",
    "INVALID_INPUT_MUTATED",
  );

  await typeText(window, "#override-value", "x".repeat(16_385));
  await press(window, "#apply-override", "Space", "FOCUS_OVERSIZED_APPLY");
  await waitFor(
    window,
    `document.getElementById("form-error")?.textContent?.startsWith("Replacement values must be at most") === true`,
    "WAIT_OVERSIZED",
  );
  const oversized = await uiSnapshot(window);
  requireProbe(oversized["workingRevision"] === "3", "OVERSIZED_INPUT_MUTATED");

  const secondTargetSelector = await pageValue(
    window,
    `(() => { const selected = document.querySelector('input[type="checkbox"]:checked'); for (const candidate of document.querySelectorAll('input[type="checkbox"]:not(:disabled)')) { if (candidate !== selected) return 'input[data-field-identity="' + CSS.escape(candidate.dataset.fieldIdentity) + '"]'; } return null; })()`,
  );
  requireProbe(typeof secondTargetSelector === "string", "MULTI_TARGET_FIXTURE_MISSING");
  await press(window, secondTargetSelector, "Space", "FOCUS_SECOND_TARGET");
  await press(window, "#apply-override", "Space", "FOCUS_MULTI_APPLY");
  await waitFor(
    window,
    `document.getElementById("form-error")?.textContent === "Select exactly one eligible field."`,
    "WAIT_MULTI_TARGET",
  );
  const multiple = await uiSnapshot(window);
  requireProbe(multiple["workingRevision"] === "3", "MULTI_TARGET_MUTATED");
  await press(window, secondTargetSelector, "Space", "FOCUS_SECOND_TARGET_CLEAR");

  const commonBoundaryInput = {
    expectedWorkingRevision: 3,
    localOverrideIdentity: "urn:rsrender:bld-021:local-override:semantic-editor",
    targetSourceFieldIdentity: authorityTarget["sourceFieldIdentity"],
    expectedSourceValueDigest: authorityTarget["sourceBaselineValueDigest"],
    reason: "Synthetic command-boundary rejection proof",
  };
  const invalidType = record(
    await pageValue(
      window,
      `globalThis.rsrender.document.setDisplayValue(${JSON.stringify({
        ...commonBoundaryInput,
        expectedSourceValueType: "number",
        expectedSourceUnit: authorityOriginal["unit"],
        replacementContent: { kind: "value", value: 7, originalRepresentation: "7" },
        replacementUnit: authorityOriginal["unit"],
      })})`,
    ),
  );
  requireProbe(
    invalidType["accepted"] === false && invalidType["code"] === "INVALID_VALUE_TYPE",
    "INVALID_TYPE_BOUNDARY",
  );
  const wrongUnit = { state: "specified", quantity: "length", symbol: "m" };
  const invalidUnit = record(
    await pageValue(
      window,
      `globalThis.rsrender.document.setDisplayValue(${JSON.stringify({
        ...commonBoundaryInput,
        expectedSourceValueType: authorityOriginal["valueType"],
        expectedSourceUnit: wrongUnit,
        replacementContent: {
          kind: "value",
          value: "SYNTHETIC-EXPLORATION-001-UNIT-CHECK",
          originalRepresentation: "SYNTHETIC-EXPLORATION-001-UNIT-CHECK",
        },
        replacementUnit: wrongUnit,
      })})`,
    ),
  );
  requireProbe(
    invalidUnit["accepted"] === false && invalidUnit["code"] === "INVALID_UNIT",
    "INVALID_UNIT_BOUNDARY",
  );

  const externalCommit = record(
    await pageValue(
      window,
      `globalThis.rsrender.document.setDisplayValue(${JSON.stringify({
        ...commonBoundaryInput,
        expectedSourceValueType: authorityOriginal["valueType"],
        expectedSourceUnit: authorityOriginal["unit"],
        replacementContent: {
          kind: "value",
          value: "SYNTHETIC-EXPLORATION-001-EXTERNAL",
          originalRepresentation: "SYNTHETIC-EXPLORATION-001-EXTERNAL",
        },
        replacementUnit: authorityOriginal["unit"],
        reason: "Synthetic stale-projection recovery proof",
      })})`,
    ),
  );
  requireProbe(
    externalCommit["accepted"] === true && externalCommit["workingRevision"] === 4,
    "EXTERNAL_COMMIT_INVALID",
  );
  await press(window, "#undo", "Space", "FOCUS_STALE_UNDO");
  await waitFor(
    window,
    `document.getElementById("working-revision")?.textContent === "4" && document.getElementById("editor-status")?.textContent === "Projection refreshed after a stale edit."`,
    "WAIT_STALE_RECOVERY",
  );
  const staleRecovery = await uiSnapshot(window);

  const finalAuthority = record(
    await pageValue(
      window,
      `globalThis.rsrender.document.getProjection({ minimumWorkingRevision: 4 })`,
    ),
  );
  const finalProjection = record(finalAuthority["projection"]);
  for (const key of [
    "sourceSnapshotIdentity",
    "sourceSnapshotLogicalDigest",
    "sourceSnapshotEncodingDigest",
    "sourceContextIdentity",
    "sourceProjectIdentity",
  ]) {
    requireProbe(initialProjection[key] === finalProjection[key], "SOURCE_AUTHORITY_CHANGED");
  }

  const beforeNavigation = window.webContents.getURL();
  await pageValue(window, `location.assign("https://example.invalid/bld-021-navigation"); true`);
  await new Promise((resolve) => setTimeout(resolve, 50));
  requireProbe(
    window.webContents.getURL() === beforeNavigation && counters.navigation > 0,
    "NAVIGATION_INVALID",
  );
  await pageValue(window, `window.open("https://example.invalid/bld-021-popup"); true`);
  await new Promise((resolve) => setTimeout(resolve, 50));
  requireProbe(counters.popup > 0, "POPUP_INVALID");

  return Object.freeze({
    schema: "rsrender.bld021.semantic-editor-probe.v1",
    result: "PASS",
    electronVersion: process.versions.electron,
    rendererSha256: rendererVerification.accepted ? rendererVerification.sha256 : null,
    preloadSha256: preloadVerification.accepted ? preloadVerification.sha256 : null,
    revisions: Object.freeze({
      initial: 0,
      set: 1,
      undo: 2,
      redo: 3,
      refetch: 3,
      staleRecovery: 4,
    }),
    semantic: Object.freeze({
      initial,
      set,
      undo,
      redo,
      refetch,
      invalid,
      oversized,
      multiple,
      invalidType: invalidType["code"],
      invalidUnit: invalidUnit["code"],
      staleRecovery,
    }),
    sourceWitnessSha256: createHash("sha256")
      .update(
        JSON.stringify(
          [
            "sourceSnapshotIdentity",
            "sourceSnapshotLogicalDigest",
            "sourceSnapshotEncodingDigest",
            "sourceContextIdentity",
            "sourceProjectIdentity",
          ].map((key) => finalProjection[key]),
        ),
      )
      .digest("hex"),
    projectionDigest: finalProjection["projectionDigest"],
    datasetLogicalDigest: finalProjection["datasetLogicalDigest"],
    denials: Object.freeze({ ...counters, windowCount: BrowserWindow.getAllWindows().length }),
    securityProfile: SEMANTIC_EDITOR_SECURITY_PROFILE,
  });
}

async function runStudioProbe(window: BrowserWindow, counters: Counters): Promise<DataRecord> {
  await waitFor(
    window,
    `document.querySelectorAll("#svg-page > svg").length === 1 && ["Structured boring log scene rendered as semantic SVG.", "Editable structured boring log scene loaded from main authority."].includes(document.getElementById("editor-status")?.textContent ?? "")`,
    "WAIT_STUDIO",
  );
  const initial = record(
    await pageValue(
      window,
      `(() => ({
        title: document.title,
        panes: document.querySelectorAll(".contents-pane,.canvas-workspace,.properties-pane").length,
        svg: document.querySelectorAll("#svg-page > svg").length,
        sceneNodes: document.querySelectorAll("#svg-page .scene-node").length,
        semanticElements: new Set([...document.querySelectorAll("#svg-page [data-semantic-id]")].map((node) => node.getAttribute("data-semantic-id"))).size,
        treeRows: document.querySelectorAll("#contents-tree .tree-row").length,
        diagnostics: document.querySelectorAll("#diagnostics-list li").length,
        raster: document.querySelectorAll("img,picture,canvas,image").length,
        nodeGlobals: [typeof require, typeof process, typeof electron],
        pageDigest: document.querySelector("#svg-page > svg")?.getAttribute("data-scene-input-digest"),
      }))()`,
    ),
  );
  requireProbe(
    initial["title"] === "RSrender Boring Log Studio" &&
      initial["panes"] === 3 &&
      initial["svg"] === 1 &&
      (initial["sceneNodes"] as number) >= 200 &&
      (initial["semanticElements"] as number) >= 80 &&
      (initial["treeRows"] as number) >= 15 &&
      (initial["diagnostics"] as number) >= 1 &&
      initial["raster"] === 0 &&
      JSON.stringify(initial["nodeGlobals"]) === '["undefined","undefined","undefined"]' &&
      typeof initial["pageDigest"] === "string",
    "STUDIO_INITIAL_UI_INVALID",
  );
  requireProbe(
    (await pageValue(
      window,
      `(() => { const target = document.querySelector('.tree-row[data-semantic-id^="lithology:"] .tree-select'); if (!(target instanceof HTMLButtonElement)) return false; target.click(); return true; })()`,
    )) === true,
    "STUDIO_SELECTION_TARGET_MISSING",
  );
  await waitFor(
    window,
    `document.getElementById("selection-properties")?.hidden === false && document.getElementById("editor-status")?.textContent?.includes("synchronized") === true`,
    "WAIT_STUDIO_SELECTION",
  );
  const selection = record(
    await pageValue(
      window,
      `(() => ({
        semanticId: document.getElementById("property-semantic-id")?.textContent,
        role: document.getElementById("property-role")?.textContent,
        provenance: document.getElementById("property-provenance")?.textContent,
        selectedTreeRows: document.querySelectorAll("#contents-tree .tree-row.is-selected").length,
        selectedSceneNodes: document.querySelectorAll("#svg-page .scene-node.is-selected").length,
      }))()`,
    ),
  );
  requireProbe(
    typeof selection["semanticId"] === "string" &&
      selection["semanticId"].startsWith("lithology:") &&
      typeof selection["role"] === "string" &&
      typeof selection["provenance"] === "string" &&
      selection["provenance"].includes("Source original") &&
      selection["selectedTreeRows"] === 1 &&
      (selection["selectedSceneNodes"] as number) >= 1,
    "STUDIO_SELECTION_SYNC_INVALID",
  );
  window.setSize(1_100, 600);
  const interactions = record(
    await pageValue(
      window,
      `(() => {
        const tabStates = {};
        for (const tab of document.querySelectorAll("[data-ribbon-tab]")) {
          if (!(tab instanceof HTMLButtonElement)) continue;
          tab.click();
          const id = tab.dataset.ribbonTab ?? "";
          tabStates[id] = tab.getAttribute("aria-selected") === "true" && document.querySelectorAll('[data-ribbon-panel]:not([hidden])').length >= 1 && [...document.querySelectorAll('[data-ribbon-panel]:not([hidden])')].every((panel) => panel.dataset.ribbonPanel === id);
        }
        document.querySelector('[data-ribbon-tab="home"]')?.click();
        const rowsBefore = document.querySelectorAll("#contents-tree .tree-row").length;
        const disclosure = document.querySelector('.tree-row[data-semantic-id="page-root"] .tree-disclosure');
        if (!(disclosure instanceof HTMLButtonElement)) return { invalid: "missing-disclosure" };
        disclosure.click();
        const rowsCollapsed = document.querySelectorAll("#contents-tree .tree-row").length;
        disclosure.click();
        const rowsExpanded = document.querySelectorAll("#contents-tree .tree-row").length;
        const group = document.querySelector(".property-group");
        const summary = group?.querySelector("summary");
        if (!(group instanceof HTMLDetailsElement) || !(summary instanceof HTMLElement)) return { invalid: "missing-property-disclosure" };
        summary.click();
        const propertyCollapsed = group.open === false;
        summary.click();
        const propertyExpanded = group.open === true;
        document.getElementById("property-tab-diagnostics")?.click();
        const diagnosticsShown = document.getElementById("property-diagnostics-panel")?.hidden === false;
        document.getElementById("property-tab-element")?.click();
        const elementShown = document.getElementById("property-element-panel")?.hidden === false;
        const scroll = document.getElementById("properties-scroll");
        if (!(scroll instanceof HTMLElement)) return { invalid: "missing-properties-scroll" };
        scroll.scrollTop = scroll.scrollHeight;
        return {
          tabStates,
          rowsBefore,
          rowsCollapsed,
          rowsExpanded,
          propertyCollapsed,
          propertyExpanded,
          diagnosticsShown,
          elementShown,
          overflowY: getComputedStyle(scroll).overflowY,
          scrollable: scroll.scrollHeight > scroll.clientHeight,
          scrollTop: scroll.scrollTop,
        };
      })()`,
    ),
  );
  requireProbe(
    JSON.stringify(interactions["tabStates"]) ===
      '{"home":true,"layout":true,"data":true,"review":true,"publish":true}' &&
      (interactions["rowsBefore"] as number) >= 15 &&
      interactions["rowsCollapsed"] === 1 &&
      interactions["rowsExpanded"] === interactions["rowsBefore"] &&
      interactions["propertyCollapsed"] === true &&
      interactions["propertyExpanded"] === true &&
      interactions["diagnosticsShown"] === true &&
      interactions["elementShown"] === true &&
      interactions["overflowY"] === "auto" &&
      interactions["scrollable"] === true &&
      (interactions["scrollTop"] as number) > 0,
    "STUDIO_INTERACTIONS_INVALID",
  );
  await pageValue(window, `document.getElementById("zoom-in")?.click(); true`);
  requireProbe(
    (await pageValue(
      window,
      `document.getElementById("zoom-value")?.textContent === "90%" && document.getElementById("page-shadow")?.classList.contains("zoom-90") === true`,
    )) === true,
    "STUDIO_ZOOM_INVALID",
  );
  let editing: DataRecord | null = null;
  if (studioEditingMode) {
    const before = record(
      await pageValue(
        window,
        `(() => ({
          documentApi: Object.keys(globalThis.rsrender.document),
          studioApi: Object.keys(globalThis.rsrenderStudio),
          readonly: document.getElementById("property-content")?.readOnly,
          applyDisabled: document.getElementById("apply-property")?.disabled,
          source: document.getElementById("property-source-original")?.textContent,
          effective: document.getElementById("property-effective-value")?.textContent,
        }))()`,
      ),
    );
    requireProbe(
      JSON.stringify(before["documentApi"]) ===
        '["getProjection","setDisplayValue","undo","redo"]' &&
        JSON.stringify(before["studioApi"]) === '["getProjection"]' &&
        before["readonly"] === false &&
        before["applyDisabled"] === false &&
        before["source"] === before["effective"],
      "STUDIO_EDITING_AUTHORITY_INVALID",
    );
    const replacement = "Edited in packaged BLD-026 Studio";
    await typeText(window, "#property-content", replacement);
    await press(window, "#apply-property", "Space", "FOCUS_STUDIO_APPLY");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent === "Material Description applied at revision 1." && document.getElementById("property-effective-value")?.textContent === ${JSON.stringify(replacement)} && document.getElementById("property-provenance")?.textContent?.includes("Effective override") === true && document.getElementById("undo")?.disabled === false`,
      "WAIT_STUDIO_APPLY",
    );
    const applied = record(
      await pageValue(
        window,
        `(() => ({
          source: document.getElementById("property-source-original")?.textContent,
          effective: document.getElementById("property-effective-value")?.textContent,
          provenance: document.getElementById("property-provenance")?.textContent,
          digest: document.querySelector("#svg-page > svg")?.getAttribute("data-scene-input-digest"),
          selectedSceneNodes: document.querySelectorAll("#svg-page .scene-node.is-selected").length,
        }))()`,
      ),
    );
    requireProbe(
      applied["source"] === before["source"] &&
        applied["effective"] === replacement &&
        (applied["provenance"] as string).includes("Effective override") &&
        applied["digest"] !== initial["pageDigest"] &&
        (applied["selectedSceneNodes"] as number) >= 1,
      "STUDIO_APPLY_INVALID",
    );
    await press(window, "#undo", "Space", "FOCUS_STUDIO_UNDO");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent === "Undo completed at revision 2." && document.getElementById("property-effective-value")?.textContent === document.getElementById("property-source-original")?.textContent && document.getElementById("redo")?.disabled === false`,
      "WAIT_STUDIO_UNDO",
    );
    const undo = record(
      await pageValue(
        window,
        `(() => ({
          source: document.getElementById("property-source-original")?.textContent,
          effective: document.getElementById("property-effective-value")?.textContent,
          provenance: document.getElementById("property-provenance")?.textContent,
          digest: document.querySelector("#svg-page > svg")?.getAttribute("data-scene-input-digest"),
        }))()`,
      ),
    );
    await press(window, "#redo", "Space", "FOCUS_STUDIO_REDO");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent === "Redo completed at revision 3." && document.getElementById("property-effective-value")?.textContent === ${JSON.stringify(replacement)} && document.getElementById("undo")?.disabled === false`,
      "WAIT_STUDIO_REDO",
    );
    const redo = record(
      await pageValue(
        window,
        `(() => ({
          source: document.getElementById("property-source-original")?.textContent,
          effective: document.getElementById("property-effective-value")?.textContent,
          provenance: document.getElementById("property-provenance")?.textContent,
          digest: document.querySelector("#svg-page > svg")?.getAttribute("data-scene-input-digest"),
          raster: document.querySelectorAll("img,picture,canvas,image").length,
        }))()`,
      ),
    );
    requireProbe(
      undo["source"] === before["source"] &&
        undo["effective"] === before["source"] &&
        (undo["provenance"] as string).includes("Source original") &&
        redo["source"] === before["source"] &&
        redo["effective"] === replacement &&
        (redo["provenance"] as string).includes("Effective override") &&
        redo["raster"] === 0,
      "STUDIO_HISTORY_INVALID",
    );
    await press(window, "#undo", "Space", "FOCUS_STUDIO_CLEAR_TEXT_OVERRIDE");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent === "Undo completed at revision 4."`,
      "WAIT_STUDIO_CLEAR_TEXT_OVERRIDE",
    );
    requireProbe(
      (await pageValue(
        window,
        `(() => { const target = document.querySelector('.tree-row[data-semantic-id="column-lithology"] .tree-select'); if (!(target instanceof HTMLButtonElement)) return false; target.click(); return document.getElementById("property-content")?.readOnly === false; })()`,
      )) === true,
      "STUDIO_STYLE_TARGET_INVALID",
    );
    const pattern = "gravel-dot-ring";
    await typeText(window, "#property-content", pattern);
    await press(window, "#apply-property", "Space", "FOCUS_STUDIO_STYLE_APPLY");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent === "Lithology Pattern Style applied at revision 5." && document.getElementById("property-effective-value")?.textContent === ${JSON.stringify(pattern)} && document.querySelector('#svg-page pattern[id=${JSON.stringify(pattern)}]') !== null && [...document.querySelectorAll('#svg-page [data-node-role="lithology-pattern-interval"]')].every((node) => node.getAttribute("fill") === "url(#${pattern})")`,
      "WAIT_STUDIO_STYLE_APPLY",
    );
    const style = record(
      await pageValue(
        window,
        `(() => ({
          source: document.getElementById("property-source-original")?.textContent,
          effective: document.getElementById("property-effective-value")?.textContent,
          provenance: document.getElementById("property-provenance")?.textContent,
          patternedIntervals: document.querySelectorAll('#svg-page [data-node-role="lithology-pattern-interval"][fill="url(#${pattern})"]').length,
        }))()`,
      ),
    );
    requireProbe(
      style["source"] === "reference-varied-patterns" &&
        style["effective"] === pattern &&
        (style["provenance"] as string).includes("Effective override") &&
        style["patternedIntervals"] === 3,
      "STUDIO_STYLE_INVALID",
    );
    await press(window, "#undo", "Space", "FOCUS_STUDIO_STYLE_UNDO");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent === "Undo completed at revision 6." && document.getElementById("property-effective-value")?.textContent === "reference-varied-patterns"`,
      "WAIT_STUDIO_STYLE_UNDO",
    );
    requireProbe(
      (await pageValue(
        window,
        `(() => { const target = document.querySelector('.tree-row[data-semantic-id="column-description"] .tree-select'); if (!(target instanceof HTMLButtonElement)) return false; target.click(); return document.getElementById("property-content")?.readOnly === false; })()`,
      )) === true,
      "STUDIO_LAYOUT_TARGET_INVALID",
    );
    const widthMpt = "160000";
    await typeText(window, "#property-content", widthMpt);
    await press(window, "#apply-property", "Space", "FOCUS_STUDIO_LAYOUT_APPLY");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent === "Description Column Width Mpt applied at revision 7." && document.getElementById("property-effective-value")?.textContent === ${JSON.stringify(widthMpt)} && document.querySelector('#svg-page [data-semantic-id="column-description"][data-node-role="log-column-frame"]')?.getAttribute("width") === ${JSON.stringify(widthMpt)} && document.querySelector('#svg-page [data-semantic-id="column-sample"][data-node-role="log-column-frame"]')?.getAttribute("x") === "263000"`,
      "WAIT_STUDIO_LAYOUT_APPLY",
    );
    const layout = record(
      await pageValue(
        window,
        `(() => ({
          source: document.getElementById("property-source-original")?.textContent,
          effective: document.getElementById("property-effective-value")?.textContent,
          provenance: document.getElementById("property-provenance")?.textContent,
          width: document.querySelector('#svg-page [data-semantic-id="column-description"][data-node-role="log-column-frame"]')?.getAttribute("width"),
          followingX: document.querySelector('#svg-page [data-semantic-id="column-sample"][data-node-role="log-column-frame"]')?.getAttribute("x"),
        }))()`,
      ),
    );
    requireProbe(
      layout["source"] === "142000" &&
        layout["effective"] === widthMpt &&
        (layout["provenance"] as string).includes("Effective override") &&
        layout["width"] === widthMpt &&
        layout["followingX"] === "263000",
      "STUDIO_LAYOUT_INVALID",
    );
    await press(window, "#undo", "Space", "FOCUS_STUDIO_LAYOUT_UNDO");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent === "Undo completed at revision 8." && document.getElementById("property-effective-value")?.textContent === "142000" && document.querySelector('#svg-page [data-semantic-id="column-description"][data-node-role="log-column-frame"]')?.getAttribute("width") === "142000"`,
      "WAIT_STUDIO_LAYOUT_UNDO",
    );
    await press(window, "#redo", "Space", "FOCUS_STUDIO_LAYOUT_REDO");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent === "Redo completed at revision 9." && document.getElementById("property-effective-value")?.textContent === ${JSON.stringify(widthMpt)} && document.querySelector('#svg-page [data-semantic-id="column-description"][data-node-role="log-column-frame"]')?.getAttribute("width") === ${JSON.stringify(widthMpt)}`,
      "WAIT_STUDIO_LAYOUT_REDO",
    );
    editing = Object.freeze({ before, applied, undo, redo, replacement, style, layout });
  }
  let publication: DataRecord | null = null;
  if (pdfProbeMode) {
    requireProbe(
      (await pageValue(
        window,
        `(() => Object.keys(globalThis.rsrenderPublication ?? {}).join(",") === "exportPdf" && document.getElementById("export-pdf")?.disabled === false)()`,
      )) === true,
      "PUBLICATION_AUTHORITY_INVALID",
    );
    requireProbe(
      (await pageValue(
        window,
        `(() => { const tab = document.querySelector('[data-ribbon-tab="publish"]'); if (!(tab instanceof HTMLButtonElement)) return false; tab.click(); return document.querySelector('[data-ribbon-panel="publish"]')?.hidden === false; })()`,
      )) === true,
      "PUBLICATION_TAB_INVALID",
    );
    await press(window, "#export-pdf", "Space", "FOCUS_EXPORT_PDF");
    await waitFor(
      window,
      `document.getElementById("export-pdf")?.dataset.result === "EXPORT_VERIFIED_SUCCESS" && document.getElementById("editor-status")?.textContent?.startsWith("PDF exported and reopened successfully:") === true`,
      "WAIT_EXPORT_PDF",
    );
    publication = record(
      await pageValue(
        window,
        `(() => { const button = document.getElementById("export-pdf"); return { result: button?.dataset.result, destinationPath: button?.dataset.destinationPath, pdfDigest: button?.dataset.pdfDigest, sceneDigest: button?.dataset.sceneDigest, projectionDigest: button?.dataset.projectionDigest, pdfBytes: Number(button?.dataset.pdfBytes), activeId: document.activeElement?.id }; })()`,
      ),
    );
    requireProbe(
      publication["result"] === "EXPORT_VERIFIED_SUCCESS" &&
        publication["destinationPath"] === path.resolve(pdfProbeOutput ?? "") &&
        typeof publication["pdfDigest"] === "string" &&
        /^sha256:[0-9a-f]{64}$/u.test(publication["pdfDigest"]) &&
        typeof publication["sceneDigest"] === "string" &&
        /^sha256:[0-9a-f]{64}$/u.test(publication["sceneDigest"]) &&
        typeof publication["projectionDigest"] === "string" &&
        /^sha256:[0-9a-f]{64}$/u.test(publication["projectionDigest"]) &&
        typeof publication["pdfBytes"] === "number" &&
        publication["pdfBytes"] > 1_024 &&
        publication["activeId"] === "export-pdf",
      "PUBLICATION_RESULT_INVALID",
    );
  }
  return Object.freeze({
    schema: pdfProbeMode
      ? "rsrender.bld027.boring-log-pdf-probe.v1"
      : studioEditingMode
        ? "rsrender.bld026.boring-log-editor-probe.v1"
        : "rsrender.bld025.boring-log-studio-probe.v1",
    result: "PASS",
    electronVersion: process.versions.electron,
    rendererSha256: rendererVerification.accepted ? rendererVerification.sha256 : null,
    initial,
    selection,
    interactions,
    editing,
    publication,
    zoomPercent: 90,
    denials: Object.freeze({ ...counters, windowCount: BrowserWindow.getAllWindows().length }),
    securityProfile: SEMANTIC_EDITOR_SECURITY_PROFILE,
  });
}

async function teardown(): Promise<void> {
  if (teardownPromise !== null) return teardownPromise;
  teardownPromise = (async () => {
    for (const channel of handlers) ipcMain.removeHandler(channel);
    broker?.invalidate();
    broker?.closeSession();
    broker = null;
    studioBroker?.invalidate();
    studioBroker = null;
    publicationBroker?.invalidate();
    publicationBroker = null;
    sessionHost.close();
    const window = editorWindow;
    editorWindow = null;
    if (window !== null && !window.isDestroyed()) window.destroy();
    const electronSession = editorSession;
    editorSession = null;
    if (electronSession !== null) {
      electronSession.protocol.unhandle(DOCUMENT_SCHEME);
      await electronSession.clearStorageData().catch(() => undefined);
      await electronSession.clearCache().catch(() => undefined);
    }
  })();
  return teardownPromise;
}

async function fail(code: string): Promise<void> {
  await teardown();
  if (probeMode) {
    emitResult(
      Object.freeze({
        schema: studioProbeMode
          ? pdfProbeMode
            ? "rsrender.bld027.boring-log-pdf-probe.v1"
            : studioEditingMode
              ? "rsrender.bld026.boring-log-editor-probe.v1"
              : "rsrender.bld025.boring-log-studio-probe.v1"
          : "rsrender.bld021.semantic-editor-probe.v1",
        result: "FAIL",
        code,
        diagnosticCode: probeFailure,
        windowCount: BrowserWindow.getAllWindows().length,
        sessionPresent: sessionHost.snapshot().hasSession,
      }),
    );
  }
  app.exit(1);
}

async function main(): Promise<void> {
  if (!preloadVerification.accepted) return fail("DOCUMENT_PRELOAD_UNAVAILABLE");
  if (!rendererVerification.accepted) return fail("SEMANTIC_EDITOR_RENDERER_UNAVAILABLE");
  Menu.setApplicationMenu(null);
  const counters: Counters = {
    navigation: 0,
    popup: 0,
    permissionCheck: 0,
    permissionRequest: 0,
    download: 0,
    webview: 0,
    network: 0,
    certificate: 0,
    rotation: 0,
  };
  app.on("certificate-error", (event, _contents, _url, _error, _certificate, callback) => {
    counters.certificate += 1;
    event.preventDefault();
    callback(false);
  });
  const electronSession = session.fromPartition(SEMANTIC_EDITOR_SECURITY_PROFILE.partition, {
    cache: false,
  });
  editorSession = electronSession;
  installDenials(electronSession, counters);
  installProtocol(electronSession);
  const documentIdentity = studioEditingMode
    ? "urn:rsrender:bld-026:document:boring-log-studio-001"
    : "urn:rsrender:bld-021:document:semantic-editor-001";
  let structuredSession: SyntheticBoringLogOverrideSession | null = null;
  let service;
  if (studioEditingMode) {
    const synthetic = createSyntheticBoringLogOverrideSession({
      documentIdentity,
      ownerGeneration: 1,
      layoutJob: globalThis.__RSRENDER_BORING_LOG_LAYOUT_JOB__,
    });
    if (!synthetic.accepted) return fail("DOCUMENT_SESSION_UNAVAILABLE");
    structuredSession = synthetic.session;
    service = synthetic.session.service;
  } else {
    const synthetic = createSyntheticOverrideRenderDatasetSession({
      documentIdentity,
      ownerGeneration: 1,
    });
    if (!synthetic.accepted) return fail("DOCUMENT_SESSION_UNAVAILABLE");
    service = synthetic.session.service;
  }
  const hosted = await sessionHost.replace({
    documentIdentity,
    service,
    initialRequestId: "urn:rsrender:bld-021:request:initial-projection",
    clock: probeMode ? () => "2026-08-21T05:00:00.000Z" : () => new Date().toISOString(),
    ownerNonce: randomBytes(32).toString("hex"),
  });
  if (!hosted.accepted) return fail("DOCUMENT_SESSION_UNAVAILABLE");
  const window = new BrowserWindow({
    show: !probeMode,
    width: 1180,
    height: 800,
    useContentSize: true,
    title: globalThis.__RSRENDER_WINDOW_TITLE__ ?? "RSrender semantic override editor",
    backgroundColor: "#cbd2d7",
    autoHideMenuBar: true,
    webPreferences: {
      ...SEMANTIC_EDITOR_SECURITY_PROFILE.webPreferences,
      partition: SEMANTIC_EDITOR_SECURITY_PROFILE.partition,
      preload: preloadPath,
    },
  });
  editorWindow = window;
  const brokerResult = createDocumentRouteBroker({
    expectedWindow: window,
    expectedWebContents: window.webContents,
    session: hosted.session,
    createCapability: () => randomBytes(32).toString("hex"),
    createRequestId: (input: {
      readonly operation: string;
      readonly generation: number;
      readonly sequence: number;
    }) => `urn:rsrender:bld-021:request:${input.generation}:${input.sequence}:${input.operation}`,
  });
  if (!brokerResult.accepted) return fail("DOCUMENT_ROUTE_UNAVAILABLE");
  broker = brokerResult.broker;
  ipcMain.handle(DOCUMENT_BOOTSTRAP_CHANNEL, (event) =>
    brokerResult.broker.bootstrap(routeContext(window, event)),
  );
  ipcMain.handle(DOCUMENT_GET_PROJECTION_CHANNEL, (event, input: unknown) =>
    brokerResult.broker.getProjection(routeContext(window, event), input),
  );
  ipcMain.handle(DOCUMENT_SET_DISPLAY_VALUE_CHANNEL, (event, input: unknown) =>
    brokerResult.broker.setDisplayValue(routeContext(window, event), input),
  );
  ipcMain.handle(DOCUMENT_UNDO_CHANNEL, (event, input: unknown) =>
    brokerResult.broker.undo(routeContext(window, event), input),
  );
  ipcMain.handle(DOCUMENT_REDO_CHANNEL, (event, input: unknown) =>
    brokerResult.broker.redo(routeContext(window, event), input),
  );
  if (structuredSession !== null) {
    const source = structuredSession;
    let studioQuerySequence = 0;
    const getStudioProjection = async (minimumWorkingRevision: number | null) => {
      studioQuerySequence += 1;
      const queried = await hosted.session.getProjection(
        `urn:rsrender:bld-026:request:studio-scene:${studioQuerySequence}`,
        { minimumWorkingRevision },
      );
      if (!queried.accepted || queried.result.kind !== "render-dataset.projection.result") {
        return Object.freeze({
          accepted: false as const,
          code: "BORING_LOG_STUDIO_CONFIGURATION_INVALID" as const,
        });
      }
      return resolveBoringLogStudioProjection({
        layoutJob: source.layoutJob,
        bindings: source.bindings,
        dataset: queried.result.projection,
      });
    };
    const route = new BoringLogStudioRouteBroker({
      expectedWindow: window,
      expectedWebContents: window.webContents,
      documentIdentity,
      ownerGeneration: hosted.ownerGeneration,
      createCapability: () => randomBytes(32).toString("hex"),
      getProjection: getStudioProjection,
    });
    studioBroker = route;
    ipcMain.handle(BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL, (event) =>
      route.bootstrap(routeContext(window, event)),
    );
    ipcMain.handle(BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL, (event, input: unknown) =>
      route.getProjection(routeContext(window, event), input),
    );
    const publicationRoute = new BoringLogPdfPublicationRouteBroker({
      expectedWindow: window,
      expectedWebContents: window.webContents,
      documentIdentity,
      ownerGeneration: hosted.ownerGeneration,
      createCapability: () => randomBytes(32).toString("hex"),
      exportPdf: async ({ expectedWorkingRevision, expectedSceneInputDigest }) => {
        const current = await getStudioProjection(expectedWorkingRevision);
        if (
          !current.accepted ||
          current.projection.workingRevision !== expectedWorkingRevision ||
          current.projection.scene.inputDigest !== expectedSceneInputDigest
        ) {
          return Object.freeze({ accepted: false, code: "EXPORT_STALE_SCENE" as const });
        }
        return publishBoringLogPdf({
          scene: current.projection.scene,
          workingRevision: current.projection.workingRevision,
          expectedWorkingRevision,
          expectedSceneInputDigest,
          chooseDestination: async () => {
            if (pdfProbeMode) {
              return typeof pdfProbeOutput === "string" && pdfProbeOutput.length > 0
                ? path.resolve(pdfProbeOutput)
                : null;
            }
            const selected = await dialog.showSaveDialog(window, {
              title: "Export boring log PDF - Create New",
              defaultPath: path.join(app.getPath("documents"), "RSrender-boring-log.pdf"),
              buttonLabel: "Create PDF",
              filters: [{ name: "PDF document", extensions: ["pdf"] }],
              properties: ["createDirectory", "showOverwriteConfirmation"],
            });
            return selected.canceled || selected.filePath.length === 0 ? null : selected.filePath;
          },
          renderPdf: ({ projection }) => renderPublicationPdf(projection),
        });
      },
    });
    publicationBroker = publicationRoute;
    ipcMain.handle(BORING_LOG_PUBLICATION_BOOTSTRAP_CHANNEL, (event) =>
      publicationRoute.bootstrap(routeContext(window, event)),
    );
    ipcMain.handle(BORING_LOG_PUBLICATION_EXPORT_CHANNEL, (event, input: unknown) =>
      publicationRoute.exportPdf(routeContext(window, event), input),
    );
  }
  const rotate = () => {
    counters.rotation += 1;
    brokerResult.broker.invalidate();
    studioBroker?.invalidate();
    publicationBroker?.invalidate();
  };
  window.webContents.on("render-process-gone", rotate);
  window.webContents.on("destroyed", rotate);
  window.webContents.on("did-start-navigation", (_event, _url, _isInPlace, isMainFrame) => {
    if (isMainFrame) rotate();
  });
  window.webContents.setWindowOpenHandler(() => {
    counters.popup += 1;
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, targetUrl) => {
    if (targetUrl !== DOCUMENT_ROUTE_URL) {
      counters.navigation += 1;
      event.preventDefault();
    }
  });
  window.webContents.on("will-redirect", (event, targetUrl) => {
    if (targetUrl !== DOCUMENT_ROUTE_URL) {
      counters.navigation += 1;
      event.preventDefault();
    }
  });
  window.webContents.on("will-attach-webview", (event) => {
    counters.webview += 1;
    event.preventDefault();
  });
  window.on("closed", () => void teardown());
  await window.loadURL(DOCUMENT_ROUTE_URL);
  if (probeMode) {
    const result = studioProbeMode
      ? await runStudioProbe(window, counters)
      : await runProbe(window, counters);
    emitResult(result);
    await teardown();
    app.exit(0);
  }
}

const ownsInstance = app.requestSingleInstanceLock();
if (!ownsInstance) app.quit();
else {
  app.on("second-instance", () => undefined);
  app.on("window-all-closed", () => app.quit());
  void app
    .whenReady()
    .then(main)
    .catch(() => fail("SEMANTIC_EDITOR_HOST_UNAVAILABLE"));
}

declare global {
  var __RSRENDER_SEMANTIC_EDITOR_HTML__: string;
  var __RSRENDER_SEMANTIC_EDITOR_RENDERER_SHA256__: string;
  var __RSRENDER_WINDOW_TITLE__: string | undefined;
  var __RSRENDER_BORING_LOG_LAYOUT_JOB__: unknown;
}
