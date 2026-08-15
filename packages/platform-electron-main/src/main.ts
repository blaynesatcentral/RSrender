import { once } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { app, BrowserWindow, Menu, protocol, session, webContents } from "electron";

import { EMPTY_SHELL_SECURITY_PROFILE, EMPTY_SHELL_URL } from "./security-profile.js";

const PROBE_ARGUMENT = "--rsrender-bld006-probe";
const RESULT_MARKER = "RSRENDER_BLD006_RESULT=";
const RESULT_FILENAME = "rsrender-bld006-probe-result.json";
const SHELL_SCHEME = "rsrender-shell";
const probeMode = process.argv.includes(PROBE_ARGUMENT);
const shellProfileRoot = path.join(app.getPath("temp"), "rsrender-bld006-shell-profile");
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
  evidenceGrade: "OBSERVED_PACKAGED";
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

function observe(id: string, pass: boolean, detail: string): Observation {
  return Object.freeze({ id, pass, detail, evidenceGrade: "OBSERVED_PACKAGED" });
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
): Promise<boolean> {
  const observations: Observation[] = [];
  const record = (id: string, pass: boolean, detail: string): void => {
    observations.push(observe(id, pass, detail));
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
    "NO_PRELOAD",
    !effectivePreferences.preload && EMPTY_SHELL_SECURITY_PROFILE.preload === "absent",
    `effectivePreload=${effectivePreferences.preload ? "present" : "absent"}; configured=absent`,
  );

  const rendererSurface = (await shellWindow.webContents.executeJavaScript(
    `({
      requireType: typeof globalThis.require,
      processType: typeof globalThis.process,
      electronType: typeof globalThis.electron,
      ipcRendererType: typeof globalThis.ipcRenderer,
      rsrenderType: typeof globalThis.rsrender,
      bodyText: document.body.innerText.replace(/\\s+/gu, ' ').trim()
    })`,
    true,
  )) as Record<string, string>;
  const forbiddenGlobalKeys = [
    "requireType",
    "processType",
    "electronType",
    "ipcRendererType",
    "rsrenderType",
  ];
  record(
    "NO_NODE_ELECTRON_GLOBALS",
    forbiddenGlobalKeys.every((key) => rendererSurface[key] === "undefined"),
    forbiddenGlobalKeys.map((key) => `${key}=${rendererSurface[key] ?? "missing"}`).join("; "),
  );
  record(
    "INERT_RENDERER",
    rendererSurface["bodyText"] ===
      "RSrender security shell No application capabilities are available.",
    "static packaged text only",
  );
  record(
    "NO_RENDERER_CAPABILITY",
    EMPTY_SHELL_SECURITY_PROFILE.ipcChannels.length === 0 &&
      EMPTY_SHELL_SECURITY_PROFILE.rendererCapabilities.length === 0 &&
      rendererSurface["rsrenderType"] === "undefined",
    "preload methods=0; IPC channels=0; renderer capabilities=0",
  );

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
    schema: "rsrender.bld006.packaged-probe.v0",
    result: passed ? "PASS" : "FAIL",
    scope: "empty packaged Electron security shell only",
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
      schema: "rsrender.bld006.packaged-probe.v0",
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
      phases.push("renderer-created");
      await shellWindow.loadURL(EMPTY_SHELL_URL);
      if (probeMode) {
        await runPackagedProbe(shellWindow, shellSession, counters, phases);
      }
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unknown empty-shell startup failure";
      if (probeMode) {
        emitResult({
          schema: "rsrender.bld006.packaged-probe.v0",
          result: "FAIL",
          failure: { code: "EMPTY_SHELL_HARNESS_FAILURE", message },
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
