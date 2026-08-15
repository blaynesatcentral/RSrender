import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { app, BrowserWindow, ipcMain, Menu, protocol, session, webContents } from "electron";
import type { IpcMainInvokeEvent } from "electron";

import {
  applicationVersionQueryHandlerRevision,
  createApplicationVersionQueryHandler,
} from "@rsrender/application";
import { applicationVersionContractRevision } from "@rsrender/contracts";

import {
  APPLICATION_VERSION_BOOTSTRAP_CHANNEL,
  APPLICATION_VERSION_QUERY_CHANNEL,
  ApplicationVersionRouteBroker,
  applicationVersionTransportRevision,
} from "./application-version-route-broker.js";
import type { ApplicationVersionRouteContext } from "./application-version-route-broker.js";
import { generatedApplicationVersionPreloadRevision } from "./generated-application-version-preload.js";
import {
  packagedApplicationVersionPreloadRelativePath,
  verifyPackagedApplicationVersionPreload,
} from "./packaged-application-version-preload.js";

import { EMPTY_SHELL_SECURITY_PROFILE, EMPTY_SHELL_URL } from "./security-profile.js";

const PROBE_ARGUMENT = "--rsrender-bld006-probe";
const RESULT_MARKER = "RSRENDER_BLD006_RESULT=";
const RESULT_FILENAME = "rsrender-bld006-probe-result.json";
const SHELL_SCHEME = "rsrender-shell";
const probeMode = process.argv.includes(PROBE_ARGUMENT);
const shellProfileRoot = path.join(app.getPath("temp"), "rsrender-bld006-shell-profile");
const applicationVersionPreloadPath = path.join(
  app.getAppPath(),
  ...packagedApplicationVersionPreloadRelativePath.split("/"),
);
const packagedPreloadBytes = (() => {
  try {
    return readFileSync(applicationVersionPreloadPath) as Uint8Array;
  } catch {
    return null;
  }
})();
const packagedPreloadVerification = verifyPackagedApplicationVersionPreload(packagedPreloadBytes);
if (!packagedPreloadVerification.accepted) {
  throw new Error(packagedPreloadVerification.code);
}
const packagedPreloadSha256 = packagedPreloadVerification.sha256;
mkdirSync(shellProfileRoot, { recursive: true, mode: 0o700 });
app.setPath("userData", shellProfileRoot);
app.setPath("sessionData", path.join(shellProfileRoot, "session"));

protocol.registerSchemesAsPrivileged([
  {
    scheme: SHELL_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: false,
      corsEnabled: false,
      stream: true,
    },
  },
]);

type Observation = Readonly<{
  id: string;
  pass: boolean;
  detail: string;
  evidenceGrade: "OBSERVED_PACKAGED" | "RELATIONAL_IN_PACKAGED_PROCESS";
}>;

type DenialCounters = {
  navigation: number;
  popup: number;
  permissionCheck: number;
  permissionRequest: number;
  download: number;
  webview: number;
  network: number;
  remoteCompleted: number;
};

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function observe(
  id: string,
  pass: boolean,
  detail: string,
  evidenceGrade: Observation["evidenceGrade"] = "OBSERVED_PACKAGED",
): Observation {
  return Object.freeze({ id, pass, detail, evidenceGrade });
}

function emitResult(value: unknown): void {
  const serialized = JSON.stringify(value);
  const payload = Buffer.from(serialized, "utf8").toString("base64");
  process.stdout.write(`${RESULT_MARKER}${payload}\n`);
  if (probeMode) {
    writeFileSync(path.join(app.getPath("temp"), RESULT_FILENAME), `${serialized}\n`, {
      encoding: "utf8",
      flag: "w",
      mode: 0o600,
    });
  }
}

function isExactShellRequest(rawUrl: string, method: string): boolean {
  return method === "GET" && rawUrl === EMPTY_SHELL_URL;
}

function installSessionDenials(shellSession: Electron.Session, counters: DenialCounters): void {
  shellSession.setPermissionCheckHandler(() => {
    counters.permissionCheck += 1;
    return false;
  });
  shellSession.setPermissionRequestHandler((_contents, _permission, callback) => {
    counters.permissionRequest += 1;
    callback(false);
  });
  shellSession.setDevicePermissionHandler(() => false);
  shellSession.on("will-download", (event) => {
    counters.download += 1;
    event.preventDefault();
  });
  shellSession.webRequest.onBeforeRequest((details, callback) => {
    const allowed = isExactShellRequest(details.url, details.method);
    if (!allowed) counters.network += 1;
    callback({ cancel: !allowed });
  });
  shellSession.webRequest.onCompleted(
    { urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] },
    () => {
      counters.remoteCompleted += 1;
    },
  );
}

function installInMemoryShell(shellSession: Electron.Session): void {
  shellSession.protocol.handle(SHELL_SCHEME, (request) => {
    if (!isExactShellRequest(request.url, request.method)) {
      return new Response("Not found", {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return new Response(globalThis.__RSRENDER_INERT_SHELL_HTML__, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Security-Policy": EMPTY_SHELL_SECURITY_PROFILE.contentPolicy,
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

function createShellWindow(counters: DenialCounters): BrowserWindow {
  const shellWindow = new BrowserWindow({
    show: !probeMode,
    width: 720,
    height: 480,
    useContentSize: true,
    title: "RSrender empty security shell",
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      ...EMPTY_SHELL_SECURITY_PROFILE.webPreferences,
      partition: EMPTY_SHELL_SECURITY_PROFILE.partition,
      preload: applicationVersionPreloadPath,
    },
  });

  shellWindow.webContents.setWindowOpenHandler(() => {
    counters.popup += 1;
    return { action: "deny" };
  });
  shellWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (targetUrl !== EMPTY_SHELL_URL) {
      counters.navigation += 1;
      event.preventDefault();
    }
  });
  shellWindow.webContents.on("will-redirect", (event, targetUrl) => {
    if (targetUrl !== EMPTY_SHELL_URL) {
      counters.navigation += 1;
      event.preventDefault();
    }
  });
  shellWindow.webContents.on("will-attach-webview", (event) => {
    counters.webview += 1;
    event.preventDefault();
  });

  return shellWindow;
}

function formatPreferenceValue(value: unknown): string {
  if (
    value === undefined ||
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return JSON.stringify(value) ?? "unserializable";
}

async function runPackagedProbe(
  shellWindow: BrowserWindow,
  shellSession: Electron.Session,
  counters: DenialCounters,
  phases: string[],
  versionBroker: ApplicationVersionRouteBroker,
  removeVersionHandlers: () => void,
): Promise<boolean> {
  const observations: Observation[] = [];
  const record = (
    id: string,
    pass: boolean,
    detail: string,
    evidenceGrade?: Observation["evidenceGrade"],
  ): void => {
    observations.push(observe(id, pass, detail, evidenceGrade));
  };

  phases.push("renderer-loaded");
  const effectivePreferences = (
    shellWindow.webContents as Electron.WebContents & {
      getLastWebPreferences: () => Electron.WebPreferences;
    }
  ).getLastWebPreferences();
  const runtimePreferenceAssertions = {
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
    nodeIntegrationInSubFrames: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    webviewTag: false,
    safeDialogs: true,
  } as const;
  const preferencesMatch = Object.entries(runtimePreferenceAssertions).every(
    ([key, value]) => effectivePreferences[key as keyof Electron.WebPreferences] === value,
  );
  record(
    "PACKAGED_RUNTIME",
    app.isPackaged && process.versions.electron === EMPTY_SHELL_SECURITY_PROFILE.electronVersion,
    `packaged=${app.isPackaged}; electron=${process.versions.electron ?? "absent"}`,
  );
  record(
    "EFFECTIVE_WEB_PREFERENCES",
    preferencesMatch,
    Object.entries(runtimePreferenceAssertions)
      .map(
        ([key]) =>
          `${key}=${formatPreferenceValue(
            effectivePreferences[key as keyof Electron.WebPreferences],
          )}`,
      )
      .join("; "),
  );
  record(
    "ONE_GENERATED_PRELOAD",
    packagedPreloadVerification.accepted &&
      EMPTY_SHELL_SECURITY_PROFILE.preload === "generated-application-version-only",
    `packagedDigestVerified=${packagedPreloadVerification.accepted}; effectivePreferenceField=${effectivePreferences.preload ? "present" : "redacted"}; configured=${EMPTY_SHELL_SECURITY_PROFILE.preload}`,
  );

  const rendererSurface = (await shellWindow.webContents.executeJavaScript(
    `({
      requireType: typeof globalThis.require,
      processType: typeof globalThis.process,
      electronType: typeof globalThis.electron,
      ipcRendererType: typeof globalThis.ipcRenderer,
      rsrenderType: typeof globalThis.rsrender,
      rsrenderKeys: globalThis.rsrender ? Object.keys(globalThis.rsrender) : [],
      applicationKeys: globalThis.rsrender?.application ? Object.keys(globalThis.rsrender.application) : [],
      getVersionType: typeof globalThis.rsrender?.application?.getVersion,
      getVersionArity: globalThis.rsrender?.application?.getVersion?.length,
      rootFrozen: globalThis.rsrender ? Object.isFrozen(globalThis.rsrender) : false,
      applicationFrozen: globalThis.rsrender?.application ? Object.isFrozen(globalThis.rsrender.application) : false,
      bodyText: document.body.innerText.replace(/\\s+/gu, ' ').trim()
    })`,
    true,
  )) as Record<string, unknown>;
  const forbiddenGlobalKeys = ["requireType", "processType", "electronType", "ipcRendererType"];
  record(
    "NO_NODE_ELECTRON_GLOBALS",
    forbiddenGlobalKeys.every((key) => rendererSurface[key] === "undefined"),
    forbiddenGlobalKeys
      .map((key) => `${key}=${formatPreferenceValue(rendererSurface[key] ?? "missing")}`)
      .join("; "),
  );
  record(
    "INERT_RENDERER",
    rendererSurface["bodyText"] ===
      "RSrender security shell One read-only application version query is available.",
    "static packaged text only",
  );
  record(
    "EXACT_RENDERER_API_SURFACE",
    rendererSurface["rsrenderType"] === "object" &&
      JSON.stringify(rendererSurface["rsrenderKeys"]) === JSON.stringify(["application"]) &&
      JSON.stringify(rendererSurface["applicationKeys"]) === JSON.stringify(["getVersion"]) &&
      rendererSurface["getVersionType"] === "function" &&
      rendererSurface["getVersionArity"] === 0 &&
      rendererSurface["rootFrozen"] === true &&
      rendererSurface["applicationFrozen"] === true,
    "one frozen zero-argument rsrender.application.getVersion method",
  );

  const versionResult = (await shellWindow.webContents.executeJavaScript(
    `globalThis.rsrender.application.getVersion()`,
    true,
  )) as Record<string, unknown>;
  record(
    "APPLICATION_VERSION_QUERY",
    versionResult["kind"] === "application.version.result" &&
      versionResult["version"] === app.getVersion() &&
      Object.keys(versionResult).sort().join(",") ===
        "contractVersion,kind,messageType,requestId,version",
    `kind=${String(versionResult["kind"])}; exactPackagedVersion=${versionResult["version"] === app.getVersion()}`,
  );

  const liveContext: ApplicationVersionRouteContext = {
    window: shellWindow,
    webContents: shellWindow.webContents,
    frame: shellWindow.webContents.mainFrame,
    mainFrame: shellWindow.webContents.mainFrame,
    url: shellWindow.webContents.mainFrame.url,
    windowLive: !shellWindow.isDestroyed(),
    webContentsLive: !shellWindow.webContents.isDestroyed(),
  };
  const alternateWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
    },
  });
  const matrix = await versionBroker.qualifyBoundNegativeMatrix(liveContext, {
    window: alternateWindow,
    webContents: alternateWindow.webContents,
    frame: alternateWindow.webContents.mainFrame,
  });
  alternateWindow.destroy();
  const expectedMatrix = {
    REPLAY: "SEQUENCE_REPLAYED",
    MALFORMED_RAW_ENVELOPE: "TRANSPORT_MALFORMED",
    CROSS_WINDOW: "CROSS_WINDOW",
    CROSS_SENDER: "SENDER_INVALID",
    CHILD_OR_UNBOUND_FRAME: "FRAME_INVALID",
    CROSS_ROUTE_QUERY: "ORIGIN_ROUTE_INVALID",
    CROSS_ROUTE_FRAGMENT: "ORIGIN_ROUTE_INVALID",
    CAPABILITY: "CAPABILITY_INVALID",
    GENERATION: "GENERATION_INVALID",
    QUERY_SCHEMA: "QUERY_SCHEMA_INVALID",
  } as const;
  for (const entry of matrix) {
    record(
      `PACKAGED_${entry.id}`,
      expectedMatrix[entry.id as keyof typeof expectedMatrix] === entry.code,
      `redactedRejectionObserved=${entry.code.length > 0}`,
      "RELATIONAL_IN_PACKAGED_PROCESS",
    );
  }
  record(
    "RAW_CHANNEL_UNAVAILABLE_TO_PAGE",
    rendererSurface["ipcRendererType"] === "undefined" &&
      EMPTY_SHELL_SECURITY_PROFILE.ipcChannels.length === 2,
    "page has no ipcRenderer/send/invoke/on or channel-name surface",
  );

  versionBroker.invalidate();
  const staleResult = (await shellWindow.webContents.executeJavaScript(
    `globalThis.rsrender.application.getVersion().then(() => "unexpected-success").catch((error) => String(error && error.message))`,
    true,
  )) as string;
  record(
    "CAPABILITY_ROTATION_REJECTS_LATE_CALL",
    staleResult === "APPLICATION_VERSION_UNAVAILABLE",
    `result=${staleResult}`,
  );
  const rebound = versionBroker.bootstrap(liveContext);
  record(
    "ROTATE_AND_REBOOTSTRAP",
    rebound.accepted && rebound.generation === 2,
    `newGenerationIssued=${rebound.accepted && rebound.generation === 2}`,
  );
  const lateGenerationResult = (await shellWindow.webContents.executeJavaScript(
    `globalThis.rsrender.application.getVersion().then(() => "unexpected-success").catch((error) => String(error && error.message))`,
    true,
  )) as string;
  record(
    "LATE_GENERATION_REDACTED",
    lateGenerationResult === "APPLICATION_VERSION_UNAVAILABLE",
    `publicResult=${lateGenerationResult}`,
  );
  versionBroker.invalidate();

  const originalUrl = shellWindow.webContents.getURL();
  await shellWindow.webContents.executeJavaScript(
    `location.assign('https://example.invalid/rsrender-navigation-probe'); true`,
    true,
  );
  await delay(100);
  record(
    "NAVIGATION_DENIED",
    shellWindow.webContents.getURL() === originalUrl && counters.navigation > 0,
    `denials=${counters.navigation}; currentUrlIsShell=${shellWindow.webContents.getURL() === originalUrl}`,
  );

  await shellWindow.webContents.executeJavaScript(
    `window.open('https://example.invalid/rsrender-popup-probe'); true`,
    true,
  );
  await delay(50);
  record(
    "POPUP_DENIED",
    counters.popup > 0 && BrowserWindow.getAllWindows().length === 1,
    `denials=${counters.popup}; windows=${BrowserWindow.getAllWindows().length}`,
  );

  const permissionResult = (await shellWindow.webContents.executeJavaScript(
    `Notification.requestPermission().catch(() => 'denied')`,
    true,
  )) as string;
  record(
    "PERMISSION_DENIED",
    permissionResult === "denied" && counters.permissionCheck + counters.permissionRequest > 0,
    `result=${permissionResult}; checks=${counters.permissionCheck}; requests=${counters.permissionRequest}`,
  );

  const networkResult = (await shellWindow.webContents.executeJavaScript(
    `Promise.race([
      fetch('https://example.invalid/rsrender-network-probe', { cache: 'no-store' })
        .then(() => 'unexpected-success')
        .catch(() => 'denied'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 1000))
    ])`,
    true,
  )) as string;
  await delay(50);
  record(
    "RENDERER_NETWORK_DENIED",
    networkResult === "denied" && counters.remoteCompleted === 0,
    `result=${networkResult}; policyDenials=${counters.network}; remoteCompleted=${counters.remoteCompleted}`,
  );
  record(
    "NONPERSISTENT_SESSION",
    !shellSession.isPersistent(),
    `persistent=${shellSession.isPersistent()}; cache=false`,
  );
  record(
    "ONE_INERT_RENDERER",
    webContents.getAllWebContents().filter((contents) => contents.getType() === "window").length ===
      1,
    `windowWebContents=${webContents.getAllWebContents().filter((contents) => contents.getType() === "window").length}`,
  );

  phases.push("probes-complete");
  const closed = once(shellWindow, "closed");
  removeVersionHandlers();
  versionBroker.invalidate();
  shellWindow.destroy();
  await closed;
  phases.push("renderer-destroyed");
  await shellSession.clearStorageData();
  await shellSession.clearCache();
  shellSession.protocol.unhandle(SHELL_SCHEME);
  phases.push("session-cleared");
  record(
    "IN_PROCESS_TEARDOWN",
    BrowserWindow.getAllWindows().length === 0 &&
      webContents.getAllWebContents().filter((contents) => contents.getType() === "window")
        .length === 0,
    `windows=${BrowserWindow.getAllWindows().length}; windowWebContents=${webContents.getAllWebContents().filter((contents) => contents.getType() === "window").length}`,
  );

  const passed = observations.every((entry) => entry.pass);
  emitResult({
    schema: "rsrender.bld012.packaged-application-version-probe.v0",
    result: passed ? "PASS" : "FAIL",
    scope: "one generated application-version query in packaged Electron shell",
    versions: {
      electron: process.versions.electron,
      chromium: process.versions.chrome,
      node: process.versions.node,
    },
    environment: {
      platform: process.platform,
      architecture: process.arch,
      osRelease: os.release(),
      packaged: app.isPackaged,
    },
    securityProfile: EMPTY_SHELL_SECURITY_PROFILE,
    revisions: {
      applicationVersionContract: applicationVersionContractRevision,
      applicationVersionHandler: applicationVersionQueryHandlerRevision,
      applicationVersionTransport: applicationVersionTransportRevision,
      generatedPreload: generatedApplicationVersionPreloadRevision,
    },
    digests: {
      packagedPreloadSha256,
    },
    counters,
    phases,
    counts: {
      passed: observations.filter((entry) => entry.pass).length,
      total: observations.length,
    },
    observations,
    nonClaims: [
      "Not a complete P06 or issue #37 result",
      "Not renderer crash/rebind evidence",
      "Not utility-process or native-decoder containment evidence",
      "Not signing, installer, update, release, or commercial approval",
    ],
  });
  app.exit(passed ? 0 : 1);
  return passed;
}

const hasSingleInstanceAuthority = app.requestSingleInstanceLock();
if (!hasSingleInstanceAuthority) {
  if (probeMode) {
    emitResult({
      schema: "rsrender.bld012.packaged-application-version-probe.v0",
      result: "FAIL",
      failure: { code: "SINGLE_INSTANCE_AUTHORITY_UNAVAILABLE" },
      nonClaims: ["No packaged-shell result is established"],
    });
  }
  app.exit(1);
} else {
  app.on("second-instance", () => {
    // The empty shell intentionally accepts no forwarded path, URL, or command.
  });
  app.on("certificate-error", (event, _contents, _url, _error, _certificate, callback) => {
    event.preventDefault();
    callback(false);
  });
  app.on("window-all-closed", () => {
    if (!probeMode) app.quit();
  });

  void app
    .whenReady()
    .then(async () => {
      const phases = ["app-ready"];
      Menu.setApplicationMenu(null);
      const counters: DenialCounters = {
        navigation: 0,
        popup: 0,
        permissionCheck: 0,
        permissionRequest: 0,
        download: 0,
        webview: 0,
        network: 0,
        remoteCompleted: 0,
      };
      const shellSession = session.fromPartition(EMPTY_SHELL_SECURITY_PROFILE.partition, {
        cache: false,
      });
      installSessionDenials(shellSession, counters);
      installInMemoryShell(shellSession);
      const shellWindow = createShellWindow(counters);
      const versionHandler = createApplicationVersionQueryHandler(app.getVersion());
      if (!versionHandler.accepted) throw new Error(versionHandler.code);
      const versionBroker = new ApplicationVersionRouteBroker({
        expectedWindow: shellWindow,
        expectedWebContents: shellWindow.webContents,
        service: versionHandler.service,
        createCapability: () => randomBytes(32).toString("hex"),
      });
      const routeContext = (event: IpcMainInvokeEvent): ApplicationVersionRouteContext => {
        const observedWindow = BrowserWindow.fromWebContents(event.sender);
        return {
          window: observedWindow,
          webContents: event.sender,
          frame: event.senderFrame,
          mainFrame: event.sender.mainFrame,
          url: event.senderFrame?.url ?? "",
          windowLive: observedWindow !== null && !observedWindow.isDestroyed(),
          webContentsLive: !event.sender.isDestroyed(),
        };
      };
      ipcMain.handle(APPLICATION_VERSION_BOOTSTRAP_CHANNEL, (event) =>
        versionBroker.bootstrap(routeContext(event)),
      );
      ipcMain.handle(APPLICATION_VERSION_QUERY_CHANNEL, (event, input: unknown) =>
        versionBroker.handle(routeContext(event), input),
      );
      const removeVersionHandlers = (): void => {
        ipcMain.removeHandler(APPLICATION_VERSION_BOOTSTRAP_CHANNEL);
        ipcMain.removeHandler(APPLICATION_VERSION_QUERY_CHANNEL);
      };
      shellWindow.webContents.on("render-process-gone", () => versionBroker.invalidate());
      shellWindow.webContents.on("destroyed", () => versionBroker.invalidate());
      shellWindow.webContents.on("will-navigate", () => versionBroker.invalidate());
      shellWindow.webContents.on("will-redirect", () => versionBroker.invalidate());
      shellWindow.on("closed", () => {
        versionBroker.invalidate();
        removeVersionHandlers();
      });
      phases.push("renderer-created");
      await shellWindow.loadURL(EMPTY_SHELL_URL);
      if (probeMode) {
        await runPackagedProbe(
          shellWindow,
          shellSession,
          counters,
          phases,
          versionBroker,
          removeVersionHandlers,
        );
      }
    })
    .catch((error: unknown) => {
      void error;
      if (probeMode) {
        emitResult({
          schema: "rsrender.bld012.packaged-application-version-probe.v0",
          result: "FAIL",
          failure: { code: "APPLICATION_VERSION_HARNESS_FAILURE" },
          nonClaims: ["No packaged-shell result is established"],
        });
      }
      app.exit(1);
    });
}

declare global {
  // The packaging step injects independently owned inert renderer markup as a
  // generated constant. It is data, not a preload or application capability.
  var __RSRENDER_INERT_SHELL_HTML__: string;
}
