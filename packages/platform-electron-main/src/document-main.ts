import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { app, BrowserWindow, ipcMain, Menu, protocol, session } from "electron";
import type { IpcMainInvokeEvent } from "electron";

import { createSyntheticOverrideRenderDatasetSession } from "@rsrender/application";

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
import { DOCUMENT_ROUTE_SECURITY_PROFILE } from "./document-security-profile.js";
import { DocumentSessionHost } from "./document-session-host.js";
import {
  packagedDocumentPreloadRelativePath,
  verifyPackagedDocumentPreload,
} from "./packaged-document-preload.js";

const DOCUMENT_SCHEME = "rsrender-shell";
const PROBE_ARGUMENT = "--rsrender-bld020-probe";
const PROFILE_ARGUMENT_PREFIX = "--rsrender-bld020-profile=";
const RESULT_MARKER = "RSRENDER_BLD020_RESULT=";
const probeMode = process.argv.includes(PROBE_ARGUMENT);
const profileArgument = process.argv.find((value) => value.startsWith(PROFILE_ARGUMENT_PREFIX));
const profileRoot =
  profileArgument === undefined
    ? path.join(app.getPath("temp"), "rsrender-bld020-document-profile")
    : path.resolve(profileArgument.slice(PROFILE_ARGUMENT_PREFIX.length));
const documentPreloadPath = path.join(
  app.getAppPath(),
  ...packagedDocumentPreloadRelativePath.split("/"),
);
const packagedPreloadBytes = (() => {
  try {
    return readFileSync(documentPreloadPath) as Uint8Array;
  } catch {
    return null;
  }
})();
const packagedPreloadVerification = verifyPackagedDocumentPreload(packagedPreloadBytes);

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
]);

type DenialCounters = {
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
type Broker = Extract<ReturnType<typeof createDocumentRouteBroker>, { accepted: true }>["broker"];
type RecordValue = Readonly<Record<string, unknown>>;

const handlers = [
  DOCUMENT_BOOTSTRAP_CHANNEL,
  DOCUMENT_GET_PROJECTION_CHANNEL,
  DOCUMENT_SET_DISPLAY_VALUE_CHANNEL,
  DOCUMENT_UNDO_CHANNEL,
  DOCUMENT_REDO_CHANNEL,
] as const;
let documentWindow: BrowserWindow | null = null;
let documentElectronSession: Electron.Session | null = null;
let broker: Broker | null = null;
const sessionHost = new DocumentSessionHost();
let teardownPromise: Promise<void> | null = null;
let probeFailureCode = "UNCLASSIFIED";

function exactDocumentRequest(rawUrl: string, method: string): boolean {
  return method === "GET" && rawUrl === DOCUMENT_ROUTE_URL;
}

function installDenials(documentSession: Electron.Session, counters: DenialCounters): void {
  documentSession.setPermissionCheckHandler(() => {
    counters.permissionCheck += 1;
    return false;
  });
  documentSession.setPermissionRequestHandler((_contents, _permission, callback) => {
    counters.permissionRequest += 1;
    callback(false);
  });
  documentSession.setDevicePermissionHandler(() => false);
  documentSession.on("will-download", (event) => {
    counters.download += 1;
    event.preventDefault();
  });
  documentSession.webRequest.onBeforeRequest((details, callback) => {
    const allowed = exactDocumentRequest(details.url, details.method);
    if (!allowed) counters.network += 1;
    callback({ cancel: !allowed });
  });
}

function installProtocol(documentSession: Electron.Session): void {
  documentSession.protocol.handle(DOCUMENT_SCHEME, (request) => {
    if (!exactDocumentRequest(request.url, request.method)) {
      return new Response("Not found", {
        status: 404,
        headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    return new Response(globalThis.__RSRENDER_INERT_SHELL_HTML__, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Security-Policy": DOCUMENT_ROUTE_SECURITY_PROFILE.contentPolicy,
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Content-Type": "text/html; charset=utf-8",
        "Permissions-Policy":
          "accelerometer=(), camera=(), display-capture=(), geolocation=(), microphone=(), payment=(), usb=()",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
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

function emitResult(value: unknown): void {
  process.stdout.write(
    `${RESULT_MARKER}${Buffer.from(JSON.stringify(value), "utf8").toString("base64")}\n`,
  );
}

function requireProbe(condition: unknown, code: string): asserts condition {
  if (!condition) {
    probeFailureCode = code;
    throw new Error(code);
  }
}

function record(input: unknown): RecordValue {
  requireProbe(
    typeof input === "object" && input !== null && !Array.isArray(input),
    "RESULT_SHAPE",
  );
  return input as RecordValue;
}

function exactKeys(input: RecordValue, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(input)) === JSON.stringify(expected);
}

function projectionTarget(result: RecordValue): RecordValue {
  const values = record(result["projection"])["values"];
  requireProbe(Array.isArray(values), "VALUES_INVALID");
  const valueList = values as unknown[];
  const target = valueList.find((value) => {
    const original = record(record(value)["sourceOriginal"]);
    const content = record(original["content"]);
    return content["kind"] === "value" && content["value"] === "SYNTHETIC-EXPLORATION-001";
  });
  requireProbe(target !== undefined, "TARGET_MISSING");
  return record(target);
}

function sourceWitness(result: RecordValue): string {
  const projection = record(result["projection"]);
  const target = projectionTarget(result);
  return JSON.stringify({
    sourceSnapshotIdentity: projection["sourceSnapshotIdentity"],
    sourceSnapshotLogicalDigest: projection["sourceSnapshotLogicalDigest"],
    sourceSnapshotEncodingDigest: projection["sourceSnapshotEncodingDigest"],
    sourceContextIdentity: projection["sourceContextIdentity"],
    sourceProjectIdentity: projection["sourceProjectIdentity"],
    sourceOriginal: target["sourceOriginal"],
    sourceBaselineValueDigest: target["sourceBaselineValueDigest"],
  });
}

function validatePublicResult(input: unknown, kind: "projection" | "committed"): RecordValue {
  const value = record(input);
  const expected =
    kind === "projection"
      ? [
          "accepted",
          "kind",
          "workingRevision",
          "durableRevision",
          "dirty",
          "canUndo",
          "canRedo",
          "eventSequence",
          "projection",
        ]
      : [
          "accepted",
          "kind",
          "previousWorkingRevision",
          "workingRevision",
          "durableRevision",
          "dirty",
          "canUndo",
          "canRedo",
          "eventSequence",
          "projection",
          "changed",
        ];
  requireProbe(exactKeys(value, expected), "PUBLIC_KEYS_INVALID");
  requireProbe(value["accepted"] === true && value["kind"] === kind, "PUBLIC_KIND_INVALID");
  for (const forbidden of [
    "requestId",
    "commandId",
    "event",
    "historyEntryIdentity",
    "capability",
    "sequence",
    "documentOwnerIdentity",
  ])
    requireProbe(!(forbidden in value), "PUBLIC_AUTHORITY_LEAK");
  return value;
}

async function pageCall(window: BrowserWindow, expression: string): Promise<RecordValue> {
  return record(await window.webContents.executeJavaScript(expression, true));
}

async function waitForReload(window: BrowserWindow): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("RELOAD_TIMEOUT")), 10_000);
    window.webContents.once("did-finish-load", () => {
      clearTimeout(timer);
      resolve();
    });
    window.webContents.reload();
  });
}

async function runProbe(
  window: BrowserWindow,
  counters: DenialCounters,
  preloadSha256: string,
  ownerIdentity: string,
): Promise<RecordValue> {
  const surface = record(
    await window.webContents.executeJavaScript(
      `(() => { const api = globalThis.rsrender.document; return {
        root: Object.keys(globalThis.rsrender), document: Object.keys(api),
        rootFrozen: Object.isFrozen(globalThis.rsrender), documentFrozen: Object.isFrozen(api),
        methodFrozen: Object.values(api).map(Object.isFrozen),
        methodArities: Object.values(api).map((method) => method.length),
        requireType: typeof require, processType: typeof process, electronType: typeof electron,
      }; })()`,
      true,
    ),
  );
  requireProbe(JSON.stringify(surface["root"]) === '["document"]', "SURFACE_ROOT_INVALID");
  requireProbe(
    JSON.stringify(surface["document"]) === '["getProjection","setDisplayValue","undo","redo"]',
    "SURFACE_METHODS_INVALID",
  );
  requireProbe(
    surface["rootFrozen"] === true && surface["documentFrozen"] === true,
    "SURFACE_MUTABLE",
  );
  requireProbe(
    JSON.stringify(surface["methodFrozen"]) === "[true,true,true,true]",
    "METHOD_MUTABLE",
  );
  // Electron's contextBridge proxies callable values with arity zero in the main world.
  // The generated-preload VM oracle separately proves the four source closures are arity one.
  requireProbe(JSON.stringify(surface["methodArities"]) === "[0,0,0,0]", "METHOD_ARITY_INVALID");
  requireProbe(
    surface["requireType"] === "undefined" &&
      surface["processType"] === "undefined" &&
      surface["electronType"] === "undefined",
    "NODE_SURFACE_EXPOSED",
  );

  const initial = validatePublicResult(
    await pageCall(
      window,
      `globalThis.rsrender.document.getProjection({ minimumWorkingRevision: null })`,
    ),
    "projection",
  );
  requireProbe(
    initial["workingRevision"] === 0 &&
      initial["durableRevision"] === 0 &&
      initial["dirty"] === false &&
      initial["canUndo"] === false &&
      initial["canRedo"] === false &&
      initial["eventSequence"] === 0,
    "INITIAL_AUTHORITY_INVALID",
  );
  const initialSource = sourceWitness(initial);
  const target = projectionTarget(initial);
  const original = record(target["sourceOriginal"]);
  const rejected = await pageCall(
    window,
    `globalThis.rsrender.document.undo({ expectedWorkingRevision: 0 })`,
  );
  requireProbe(
    exactKeys(rejected, ["accepted", "code"]) &&
      rejected["accepted"] === false &&
      rejected["code"] === "NOTHING_TO_UNDO",
    "DOMAIN_REJECTION_INVALID",
  );
  const afterRejected = validatePublicResult(
    await pageCall(
      window,
      `globalThis.rsrender.document.getProjection({ minimumWorkingRevision: 0 })`,
    ),
    "projection",
  );
  requireProbe(afterRejected["workingRevision"] === 0, "REJECTION_MUTATED");
  const setInput = {
    expectedWorkingRevision: 0,
    localOverrideIdentity: "urn:test:bld-020:local-override:exploration-name",
    targetSourceFieldIdentity: target["sourceFieldIdentity"],
    expectedSourceValueDigest: target["sourceBaselineValueDigest"],
    expectedSourceValueType: original["valueType"],
    expectedSourceUnit: original["unit"],
    replacementContent: {
      kind: "value",
      value: "SYNTHETIC-EXPLORATION-001-OVERRIDE",
      originalRepresentation: "SYNTHETIC-EXPLORATION-001-OVERRIDE",
    },
    replacementUnit: original["unit"],
    reason: "Synthetic packaged-route qualification",
  };
  const set = validatePublicResult(
    await pageCall(
      window,
      `globalThis.rsrender.document.setDisplayValue(${JSON.stringify(setInput)})`,
    ),
    "committed",
  );
  const setQuery = validatePublicResult(
    await pageCall(
      window,
      `globalThis.rsrender.document.getProjection({ minimumWorkingRevision: 1 })`,
    ),
    "projection",
  );
  const undo = validatePublicResult(
    await pageCall(window, `globalThis.rsrender.document.undo({ expectedWorkingRevision: 1 })`),
    "committed",
  );
  const undoQuery = validatePublicResult(
    await pageCall(
      window,
      `globalThis.rsrender.document.getProjection({ minimumWorkingRevision: 2 })`,
    ),
    "projection",
  );
  const redo = validatePublicResult(
    await pageCall(window, `globalThis.rsrender.document.redo({ expectedWorkingRevision: 2 })`),
    "committed",
  );
  const refetch = validatePublicResult(
    await pageCall(
      window,
      `globalThis.rsrender.document.getProjection({ minimumWorkingRevision: 3 })`,
    ),
    "projection",
  );
  const repeated = validatePublicResult(
    await pageCall(
      window,
      `globalThis.rsrender.document.getProjection({ minimumWorkingRevision: 3 })`,
    ),
    "projection",
  );
  requireProbe(
    set["workingRevision"] === 1 &&
      undo["workingRevision"] === 2 &&
      redo["workingRevision"] === 3 &&
      refetch["workingRevision"] === 3 &&
      repeated["workingRevision"] === 3,
    "REVISION_TRANSCRIPT_INVALID",
  );
  requireProbe(
    set["dirty"] === true && undo["dirty"] === true && redo["dirty"] === true,
    "DIRTY_INVALID",
  );
  requireProbe(
    record(set["projection"])["projectionDigest"] ===
      record(setQuery["projection"])["projectionDigest"] &&
      record(undo["projection"])["projectionDigest"] ===
        record(undoQuery["projection"])["projectionDigest"] &&
      record(redo["projection"])["projectionDigest"] ===
        record(refetch["projection"])["projectionDigest"] &&
      record(refetch["projection"])["projectionDigest"] ===
        record(repeated["projection"])["projectionDigest"],
    "REFETCH_AUTHORITY_DRIFT",
  );
  for (const result of [set, setQuery, undo, undoQuery, redo, refetch, repeated])
    requireProbe(sourceWitness(result) === initialSource, "SOURCE_AUTHORITY_CHANGED");
  requireProbe(
    record(undo["projection"])["datasetLogicalDigest"] ===
      record(initial["projection"])["datasetLogicalDigest"],
    "UNDO_DATASET_INVALID",
  );
  requireProbe(
    record(redo["projection"])["datasetLogicalDigest"] ===
      record(set["projection"])["datasetLogicalDigest"],
    "REDO_DATASET_INVALID",
  );
  const effectiveContent = record(record(projectionTarget(set)["effectiveDisplay"])["content"]);
  requireProbe(
    effectiveContent["value"] === "SYNTHETIC-EXPLORATION-001-OVERRIDE",
    "OVERRIDE_INVALID",
  );

  const originalUrl = window.webContents.getURL();
  await window.webContents.executeJavaScript(
    `location.assign("https://example.invalid/bld-020-navigation"); true`,
    true,
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  requireProbe(
    window.webContents.getURL() === originalUrl && counters.navigation > 0,
    "NAVIGATION_INVALID",
  );
  const stale = await pageCall(
    window,
    `globalThis.rsrender.document.getProjection({ minimumWorkingRevision: 3 })`,
  );
  requireProbe(
    stale["accepted"] === false && stale["code"] === "DOCUMENT_ROUTE_UNAVAILABLE",
    "STALE_ROUTE_EXPOSED",
  );
  await waitForReload(window);
  const reloaded = validatePublicResult(
    await pageCall(
      window,
      `globalThis.rsrender.document.getProjection({ minimumWorkingRevision: 3 })`,
    ),
    "projection",
  );
  requireProbe(
    record(reloaded["projection"])["projectionDigest"] ===
      record(refetch["projection"])["projectionDigest"],
    "RELOAD_SESSION_LOST",
  );
  await window.webContents.executeJavaScript(
    `window.open("https://example.invalid/bld-020-popup"); true`,
    true,
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  requireProbe(counters.popup > 0, "POPUP_INVALID");
  return Object.freeze({
    schema: "rsrender.bld020.packaged-document-route-probe.v1",
    result: "PASS",
    electronVersion: process.versions.electron,
    preloadSha256,
    ownerIdentitySha256: createHash("sha256").update(ownerIdentity).digest("hex"),
    surface,
    revisions: Object.freeze({ initial: 0, set: 1, undo: 2, redo: 3, refetch: 3, reload: 3 }),
    digests: Object.freeze({
      initialDataset: record(initial["projection"])["datasetLogicalDigest"],
      setDataset: record(set["projection"])["datasetLogicalDigest"],
      undoDataset: record(undo["projection"])["datasetLogicalDigest"],
      redoDataset: record(redo["projection"])["datasetLogicalDigest"],
      projection: record(refetch["projection"])["projectionDigest"],
      sourceWitness: createHash("sha256").update(initialSource).digest("hex"),
    }),
    denials: Object.freeze({ ...counters, windowCount: BrowserWindow.getAllWindows().length }),
    securityProfile: DOCUMENT_ROUTE_SECURITY_PROFILE,
  });
}

async function teardown(): Promise<void> {
  if (teardownPromise !== null) return teardownPromise;
  teardownPromise = (async () => {
    for (const channel of handlers) ipcMain.removeHandler(channel);
    broker?.invalidate();
    broker?.closeSession();
    broker = null;
    sessionHost.close();
    const window = documentWindow;
    documentWindow = null;
    if (window !== null && !window.isDestroyed()) window.destroy();
    const electronSession = documentElectronSession;
    documentElectronSession = null;
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
  if (probeMode)
    emitResult(
      Object.freeze({
        schema: "rsrender.bld020.packaged-document-route-probe.v1",
        result: "FAIL",
        code,
        diagnosticCode: probeFailureCode,
        windowCount: BrowserWindow.getAllWindows().length,
        sessionPresent: sessionHost.snapshot().hasSession,
      }),
    );
  app.exit(1);
}

async function main(): Promise<void> {
  if (!packagedPreloadVerification.accepted) return fail("DOCUMENT_PRELOAD_UNAVAILABLE");
  Menu.setApplicationMenu(null);
  const counters: DenialCounters = {
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
  const electronSession = session.fromPartition(DOCUMENT_ROUTE_SECURITY_PROFILE.partition, {
    cache: false,
  });
  documentElectronSession = electronSession;
  installDenials(electronSession, counters);
  installProtocol(electronSession);
  const documentIdentity = "urn:rsrender:bld-020:document:synthetic-session-001";
  const synthetic = createSyntheticOverrideRenderDatasetSession({
    documentIdentity,
    ownerGeneration: 1,
  });
  if (!synthetic.accepted) return fail("DOCUMENT_SESSION_UNAVAILABLE");
  const hosted = await sessionHost.replace({
    documentIdentity,
    service: synthetic.session.service,
    initialRequestId: "urn:rsrender:bld-020:request:initial-projection",
    clock: probeMode ? () => "2026-08-20T19:02:00.000Z" : () => new Date().toISOString(),
    ownerNonce: randomBytes(32).toString("hex"),
  });
  if (!hosted.accepted) return fail("DOCUMENT_SESSION_UNAVAILABLE");
  const ownerIdentity = hosted.session.snapshot().documentOwnerIdentity;
  const window = new BrowserWindow({
    show: !probeMode,
    width: 720,
    height: 480,
    useContentSize: true,
    title: "RSrender document route",
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      ...DOCUMENT_ROUTE_SECURITY_PROFILE.webPreferences,
      partition: DOCUMENT_ROUTE_SECURITY_PROFILE.partition,
      preload: documentPreloadPath,
    },
  });
  documentWindow = window;
  const brokerResult = createDocumentRouteBroker({
    expectedWindow: window,
    expectedWebContents: window.webContents,
    session: hosted.session,
    createCapability: () => randomBytes(32).toString("hex"),
    createRequestId: (input: {
      readonly operation: string;
      readonly generation: number;
      readonly sequence: number;
    }) => `urn:rsrender:bld-020:request:${input.generation}:${input.sequence}:${input.operation}`,
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
  const rotate = () => {
    counters.rotation += 1;
    brokerResult.broker.invalidate();
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
  window.on("closed", () => {
    void teardown();
  });
  await window.loadURL(DOCUMENT_ROUTE_URL);
  if (probeMode) {
    const result = await runProbe(
      window,
      counters,
      packagedPreloadVerification.sha256,
      ownerIdentity,
    );
    emitResult(result);
    await teardown();
    app.exit(0);
  }
}

const ownsInstance = app.requestSingleInstanceLock();
if (!ownsInstance) {
  app.quit();
} else {
  app.on("second-instance", () => undefined);
  app.on("window-all-closed", () => app.quit());
  void app
    .whenReady()
    .then(main)
    .catch(() => fail("DOCUMENT_HOST_UNAVAILABLE"));
}

declare global {
  var __RSRENDER_INERT_SHELL_HTML__: string;
}
