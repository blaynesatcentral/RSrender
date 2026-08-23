import { createHash, randomBytes } from "node:crypto";
import { closeSync, fstatSync, openSync, readFileSync, readSync } from "node:fs";
import path from "node:path";

import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session } from "electron";
import type { IpcMainInvokeEvent } from "electron";

import {
  captureOverrideRenderDatasetWorkingState,
  commitEmbeddedTemplateReplacement,
  markOverrideRenderDatasetDurable,
  createSyntheticBoringLogOverrideSession,
  createPersistedBoringLogOverrideSession,
  createSyntheticBoringLogProjectSession,
  createPersistedBoringLogProjectSession,
  createSyntheticOverrideRenderDatasetSession,
  type SyntheticBoringLogProjectSession,
  type SyntheticBoringLogOverrideSession,
} from "@rsrender/application";
import {
  boringLogTextColumnSemanticId,
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
  type BoringLogLayoutJobInput,
  type BoringLogTextMeasurementRequest,
  type BoringLogTextMeasurementResult,
} from "@rsrender/contracts";
import type { BoringLogPublicationProjection } from "@rsrender/layout-host";
import {
  applyBoringLogTextOccurrenceStyles,
  clearBoringLogTextOccurrencePresentation,
} from "@rsrender/scene";

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
import {
  completeBoringLogStudioProjection,
  prepareBoringLogStudioProjection,
  type BoringLogStudioProjection,
} from "./boring-log-studio-projection.js";
import {
  decodeBoringLogDocumentBundle,
  maximumBoringLogDocumentBundleBytes,
} from "./boring-log-document-ingress.js";
import { publishBoringLogPdf } from "./boring-log-pdf-publication.js";
import { BoringLogPdfPublicationRouteBroker } from "./boring-log-publication-route-broker.js";
import {
  BORING_LOG_PUBLICATION_BOOTSTRAP_CHANNEL,
  BORING_LOG_PUBLICATION_EXPORT_CHANNEL,
} from "./boring-log-publication-route-contract.js";
import {
  BoringLogStudioRouteBroker,
  type BoringLogStudioLifecycleOperation,
  type BoringLogStudioTextOccurrencePresentationResetInput,
  type BoringLogStudioTextOccurrenceStyleInput,
} from "./boring-log-studio-route-broker.js";
import {
  BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL,
  BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL,
  BORING_LOG_STUDIO_LIFECYCLE_CHANNEL,
  BORING_LOG_STUDIO_RESET_TEXT_OCCURRENCE_PRESENTATION_CHANNEL,
  BORING_LOG_STUDIO_SET_TEXT_OCCURRENCE_STYLE_CHANNEL,
} from "./boring-log-studio-route-contract.js";
import {
  captureLogProjectFileBaseline,
  openLogProjectFile,
  saveLogProjectFile,
  type LogProjectFileBaseline,
  type OpenedLogProjectFile,
} from "./log-project-file-broker.js";
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
const LAYOUT_MEASUREMENT_HOST_URL = "rsrender-layout://measurement/index.html";
const LAYOUT_MEASUREMENT_STYLESHEET_URL = "rsrender-layout://measurement/fonts.css";
const LAYOUT_MEASUREMENT_FONT_REGULAR_URL = "rsrender-layout://measurement/arial-regular.ttf";
const LAYOUT_MEASUREMENT_FONT_BOLD_URL = "rsrender-layout://measurement/arial-bold.ttf";
const LAYOUT_PUBLICATION_FONT_REGULAR_URL = "rsrender-layout://publication/arial-regular.ttf";
const LAYOUT_PUBLICATION_FONT_BOLD_URL = "rsrender-layout://publication/arial-bold.ttf";
const SCREEN_FONT_REGULAR_URL = "rsrender-shell://document/arial-regular.ttf";
const SCREEN_FONT_BOLD_URL = "rsrender-shell://document/arial-bold.ttf";
const PROBE_ARGUMENT = "--rsrender-bld021-probe";
const STUDIO_PROBE_ARGUMENT = "--rsrender-bld025-probe";
const PDF_PROBE_ARGUMENT = "--rsrender-bld027-probe";
const LIFECYCLE_PROBE_ARGUMENT = "--rsrender-bld035-probe";
const MULTI_BORING_PROBE_ARGUMENT = "--rsrender-bld036-probe";
const TEXT_STYLE_PROBE_ARGUMENT = "--rsrender-bld037-probe";
const PROFILE_ARGUMENT_PREFIX = "--rsrender-bld021-profile=";
const STUDIO_PROFILE_ARGUMENT_PREFIX = "--rsrender-bld025-profile=";
const PDF_PROFILE_ARGUMENT_PREFIX = "--rsrender-bld027-profile=";
const PDF_OUTPUT_ARGUMENT_PREFIX = "--rsrender-bld027-output=";
const PROJECT_OUTPUT_ARGUMENT_PREFIX = "--rsrender-bld035-output=";
const DOCUMENT_INPUT_ARGUMENT_PREFIX = "--rsrender-boring-log-input=";
const PROJECT_INPUT_ARGUMENT_PREFIX = "--rsrender-log-project=";
const DEFAULT_DOCUMENT_INPUT_RELATIVE_PATH = path.join(
  "example-data",
  "rsrender-example-boring-log.json",
);
const RESULT_MARKER = "RSRENDER_BLD021_RESULT=";
const STUDIO_RESULT_MARKER = "RSRENDER_BLD025_RESULT=";
const QUALIFIED_ARIAL_REGULAR_DIGEST =
  "sha256:b3658eadae55e682b5f69eb64c439c1ecc8f196c0bb8d4756d145d13bc86476a";
const QUALIFIED_ARIAL_BOLD_DIGEST =
  "sha256:e8f4e3baf6cc35fed6fcce3a540e8b39e8f6cda1d22a28f2ec8f526fef7a43f5";
function readBoundedRuntimeDocument(inputPath: string): Uint8Array {
  const descriptor = openSync(inputPath, "r");
  try {
    const details = fstatSync(descriptor);
    if (!details.isFile() || details.size > maximumBoringLogDocumentBundleBytes) {
      throw new Error("BORING_LOG_DOCUMENT_INPUT_SIZE_REJECTED");
    }
    const bytes = new Uint8Array(details.size);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const count = readSync(descriptor, bytes, offset, bytes.byteLength - offset, offset);
      if (count === 0) break;
      offset += count;
    }
    return offset === bytes.byteLength ? bytes : bytes.slice(0, offset);
  } finally {
    closeSync(descriptor);
  }
}

const runtimeDocumentInput = (() => {
  const argument = process.argv.find((value) => value.startsWith(DOCUMENT_INPUT_ARGUMENT_PREFIX));
  const explicit = argument !== undefined;
  const supplied = argument?.slice(DOCUMENT_INPUT_ARGUMENT_PREFIX.length);
  if (explicit && (supplied === undefined || supplied.length === 0)) {
    return Object.freeze({ mode: "rejected" as const });
  }
  const inputPath = explicit
    ? path.resolve(supplied!)
    : path.join(path.dirname(process.execPath), DEFAULT_DOCUMENT_INPUT_RELATIVE_PATH);
  let bytes: Uint8Array;
  try {
    bytes = readBoundedRuntimeDocument(inputPath);
  } catch (error) {
    const missingDefault =
      !explicit &&
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT";
    return Object.freeze({ mode: missingDefault ? ("absent" as const) : ("rejected" as const) });
  }
  const decoded = decodeBoringLogDocumentBundle(bytes);
  return decoded.accepted
    ? Object.freeze({ mode: "accepted" as const, inputPath, decoded })
    : Object.freeze({ mode: "rejected" as const });
})();
let runtimeLayoutJob =
  runtimeDocumentInput.mode === "accepted" ? runtimeDocumentInput.decoded.layoutJob : null;
const EXAMPLE_PROJECT_DOCUMENT_IDENTITY =
  "urn:rsrender:log-project:synthetic-riverside-multi-exploration";
function createSecondExampleLayoutJob(
  first: BoringLogLayoutJobInput,
): BoringLogLayoutJobInput | null {
  try {
    const document = JSON.parse(
      JSON.stringify(first.document)
        .replaceAll("test-01", "test-02")
        .replaceAll("stratum-", "b02-stratum-")
        .replaceAll("sample-", "b02-sample-")
        .replaceAll("remark-", "b02-remark-"),
    ) as BoringLogLayoutJobInput["document"];
    const updatedDocument = {
      ...document,
      metadata: {
        ...document.metadata,
        documentTitle: "BORING LOG TEST-02",
        groundElevationFt: 176.25,
        location: "Riverview Drive, Dayton, OR · Station 2",
      },
    };
    const candidate = validateBoringLogLayoutJobInput({
      ...first,
      jobId: "job:rsrender-example-boring-log-02@r1",
      inputRevision: 1,
      fixtureDigest: sha256CanonicalJson(updatedDocument),
      document: updatedDocument,
    });
    return candidate.accepted ? candidate.value : null;
  } catch {
    return null;
  }
}
let runtimeLayoutJobs: readonly BoringLogLayoutJobInput[] =
  runtimeLayoutJob === null
    ? Object.freeze([])
    : (() => {
        const second = createSecondExampleLayoutJob(runtimeLayoutJob);
        return second === null
          ? Object.freeze([runtimeLayoutJob])
          : Object.freeze([runtimeLayoutJob, second]);
      })();
const runtimeProjectInputPath = process.argv
  .find((value) => value.startsWith(PROJECT_INPUT_ARGUMENT_PREFIX))
  ?.slice(PROJECT_INPUT_ARGUMENT_PREFIX.length);
const studioEditingMode = runtimeLayoutJob !== null || (runtimeProjectInputPath?.length ?? 0) > 0;
const bld021ProbeMode = process.argv.includes(PROBE_ARGUMENT);
const textStyleProbeMode = process.argv.includes(TEXT_STYLE_PROBE_ARGUMENT);
const multiBoringProbeMode =
  process.argv.includes(MULTI_BORING_PROBE_ARGUMENT) || textStyleProbeMode;
const pdfProbeMode = process.argv.includes(PDF_PROBE_ARGUMENT) || multiBoringProbeMode;
const lifecycleProbeMode = process.argv.includes(LIFECYCLE_PROBE_ARGUMENT) || multiBoringProbeMode;
const studioProbeMode =
  process.argv.includes(STUDIO_PROBE_ARGUMENT) || pdfProbeMode || lifecycleProbeMode;
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
const lifecycleProbeOutput = process.argv
  .find((value) => value.startsWith(PROJECT_OUTPUT_ARGUMENT_PREFIX))
  ?.slice(PROJECT_OUTPUT_ARGUMENT_PREFIX.length);
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
  BORING_LOG_STUDIO_LIFECYCLE_CHANNEL,
  BORING_LOG_STUDIO_RESET_TEXT_OCCURRENCE_PRESENTATION_CHANNEL,
  BORING_LOG_STUDIO_SET_TEXT_OCCURRENCE_STYLE_CHANNEL,
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

function exactRequest(
  rawUrl: string,
  method: string,
): "html" | "script" | "stylesheet" | "font-regular" | "font-bold" | null {
  if (method !== "GET") return null;
  if (rawUrl === DOCUMENT_ROUTE_URL) return "html";
  if (rawUrl === SEMANTIC_EDITOR_SCRIPT_URL) return "script";
  if (rawUrl === BORING_LOG_STUDIO_STYLESHEET_URL && stylesheetSource !== null) return "stylesheet";
  if (rawUrl === SCREEN_FONT_REGULAR_URL) return "font-regular";
  if (rawUrl === SCREEN_FONT_BOLD_URL) return "font-bold";
  return null;
}

function qualifiedFontPath(name: "arial.ttf" | "arialbd.ttf"): string {
  const windowsDirectory = process.env["WINDIR"];
  if (typeof windowsDirectory !== "string" || windowsDirectory.length === 0) {
    throw new Error("QUALIFIED_FONT_ROOT_UNAVAILABLE");
  }
  return path.join(windowsDirectory, "Fonts", name);
}

function qualifiedFontCss(regularUrl: string, boldUrl: string): string {
  return `@font-face{font-family:'RSrender Qualified Arial';src:url('${regularUrl}') format('truetype');font-style:normal;font-weight:400}@font-face{font-family:'RSrender Qualified Arial';src:url('${boldUrl}') format('truetype');font-style:normal;font-weight:700}`;
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
    if (!allowed) {
      counters.network += 1;
      if (probeMode) {
        probeFailure = `NETWORK_DENIED:${details.method}:${details.url}`.slice(0, 256);
      }
    }
    callback({ cancel: !allowed });
  });
}

function installProtocol(electronSession: Electron.Session): void {
  electronSession.protocol.handle(DOCUMENT_SCHEME, (request) => {
    try {
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
            : kind === "stylesheet"
              ? `${qualifiedFontCss(SCREEN_FONT_REGULAR_URL, SCREEN_FONT_BOLD_URL)}\n${stylesheetSource ?? ""}`
              : readFileSync(qualifiedFontPath(kind === "font-bold" ? "arialbd.ttf" : "arial.ttf"));
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
                : kind === "stylesheet"
                  ? "text/css; charset=utf-8"
                  : "font/ttf",
          "Permissions-Policy":
            "accelerometer=(), camera=(), display-capture=(), geolocation=(), microphone=(), payment=(), usb=()",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error: unknown) {
      if (probeMode) {
        probeFailure =
          `PROTOCOL:${error instanceof Error ? `${error.name}:${error.message}` : String(error)}`.slice(
            0,
            256,
          );
      }
      throw error;
    }
  });
}

type ChromiumTextMeasurementOutcome =
  | Readonly<{
      readonly accepted: true;
      readonly results: readonly BoringLogTextMeasurementResult[];
      readonly authorityDigest: string;
    }>
  | Readonly<{ readonly accepted: false; readonly reason: string }>;

async function withLayoutHostTimeout<T>(
  operation: Promise<T>,
  timeoutMilliseconds: number,
  failureCode: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(failureCode)), timeoutMilliseconds);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

function qualifiedLocalArialFaces(): Readonly<{ readonly regular: string; readonly bold: string }> {
  const digest = (name: string): string =>
    `sha256:${createHash("sha256")
      .update(readFileSync(qualifiedFontPath(name as "arial.ttf" | "arialbd.ttf")))
      .digest("hex")}`;
  const regular = digest("arial.ttf");
  const bold = digest("arialbd.ttf");
  if (regular !== QUALIFIED_ARIAL_REGULAR_DIGEST || bold !== QUALIFIED_ARIAL_BOLD_DIGEST) {
    throw new Error("QUALIFIED_FONT_DIGEST_MISMATCH");
  }
  return Object.freeze({ regular, bold });
}

async function measureBoringLogTextInChromium(
  requests: readonly BoringLogTextMeasurementRequest[],
): Promise<ChromiumTextMeasurementOutcome> {
  if (!Array.isArray(requests) || requests.length > 4_096) {
    return Object.freeze({ accepted: false, reason: "REQUESTS_INVALID" });
  }
  let serializedRequests: string;
  try {
    serializedRequests = JSON.stringify(requests);
  } catch {
    return Object.freeze({ accepted: false, reason: "REQUESTS_NOT_SERIALIZABLE" });
  }
  if (Buffer.byteLength(serializedRequests, "utf8") > 1_048_576) {
    return Object.freeze({ accepted: false, reason: "REQUESTS_TOO_LARGE" });
  }
  const partition = `rsrender-layout-measure-${randomBytes(16).toString("hex")}`;
  const measurementSession = session.fromPartition(partition, { cache: false });
  measurementSession.setPermissionCheckHandler(() => false);
  measurementSession.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  measurementSession.setDevicePermissionHandler(() => false);
  measurementSession.on("will-download", (event) => event.preventDefault());
  measurementSession.webRequest.onBeforeRequest((details, callback) => {
    callback({
      cancel:
        details.method !== "GET" ||
        ![
          LAYOUT_MEASUREMENT_HOST_URL,
          LAYOUT_MEASUREMENT_STYLESHEET_URL,
          LAYOUT_MEASUREMENT_FONT_REGULAR_URL,
          LAYOUT_MEASUREMENT_FONT_BOLD_URL,
        ].includes(details.url),
    });
  });
  measurementSession.protocol.handle(LAYOUT_HOST_SCHEME, (request) => {
    if (request.method !== "GET") {
      return new Response("Not found", { status: 404 });
    }
    if (request.url === LAYOUT_MEASUREMENT_HOST_URL) {
      return new Response(
        `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><title>RSrender Layout Measurement Host</title><link rel="stylesheet" href="${LAYOUT_MEASUREMENT_STYLESHEET_URL}"></head><body><svg id="measurement-root" xmlns="http://www.w3.org/2000/svg" width="2400" height="1200" aria-hidden="true"></svg></body></html>`,
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "Content-Security-Policy":
              "default-src 'none'; style-src 'self'; img-src 'none'; connect-src 'none'; font-src 'self'; frame-src 'none'; child-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
            "Content-Type": "text/html; charset=utf-8",
            "Permissions-Policy":
              "accelerometer=(), camera=(), display-capture=(), geolocation=(), microphone=(), payment=(), usb=()",
          },
        },
      );
    }
    if (request.url === LAYOUT_MEASUREMENT_STYLESHEET_URL) {
      return new Response(
        qualifiedFontCss(LAYOUT_MEASUREMENT_FONT_REGULAR_URL, LAYOUT_MEASUREMENT_FONT_BOLD_URL),
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "text/css; charset=utf-8",
          },
        },
      );
    }
    if (
      request.url === LAYOUT_MEASUREMENT_FONT_REGULAR_URL ||
      request.url === LAYOUT_MEASUREMENT_FONT_BOLD_URL
    ) {
      return new Response(
        readFileSync(
          qualifiedFontPath(
            request.url === LAYOUT_MEASUREMENT_FONT_BOLD_URL ? "arialbd.ttf" : "arial.ttf",
          ),
        ),
        { status: 200, headers: { "Cache-Control": "no-store", "Content-Type": "font/ttf" } },
      );
    }
    return new Response("Not found", { status: 404 });
  });
  const measurementWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    useContentSize: true,
    webPreferences: {
      ...SEMANTIC_EDITOR_SECURITY_PROFILE.webPreferences,
      partition,
      backgroundThrottling: false,
    },
  });
  measurementWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  measurementWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (targetUrl !== LAYOUT_MEASUREMENT_HOST_URL) event.preventDefault();
  });
  measurementWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
  try {
    await withLayoutHostTimeout(
      measurementWindow.loadURL(LAYOUT_MEASUREMENT_HOST_URL),
      15_000,
      "MEASUREMENT_HOST_LOAD_TIMEOUT",
    );
    await withLayoutHostTimeout(
      measurementWindow.webContents.executeJavaScript(
        `document.fonts.load("10pt 'RSrender Qualified Arial'").then(() => document.fonts.load("700 10pt 'RSrender Qualified Arial'")).then(() => document.fonts.ready).then(() => true)`,
        true,
      ) as Promise<unknown>,
      15_000,
      "MEASUREMENT_FONT_LOAD_TIMEOUT",
    );
    const payload = Buffer.from(serializedRequests, "utf8").toString("base64");
    const measured = await withLayoutHostTimeout(
      measurementWindow.webContents.executeJavaScript(
        `(() => {
        try {
        const requests = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(${JSON.stringify(payload)}), (value) => value.charCodeAt(0))));
        const measurementStarted = performance.now();
        const root = document.getElementById("measurement-root");
        if (!(root instanceof SVGSVGElement)) return null;
        const ns = "http://www.w3.org/2000/svg";
        const probe = document.createElementNS(ns, "text");
        probe.setAttribute("x", "100");
        probe.setAttribute("y", "200");
        root.append(probe);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context === null) return null;
        const pxToMpt = (value) => Math.round(value * 750);
        const measure = (text, request) => {
          context.font = request.fontWeight + " " + request.fontSizeMpt / 1000 + "pt 'RSrender Qualified Arial'";
          const bounds = context.measureText(text);
          const scalarCount = Array.from(text).length;
          const spaces = Array.from(text).filter((value) => value === " ").length;
          const spacingAdvanceMpt =
            Math.max(0, scalarCount - 1) * request.letterSpacingMpt +
            spaces * request.wordSpacingMpt;
          return {
            advanceMpt: Math.max(0, pxToMpt(bounds.width) + spacingAdvanceMpt),
            xMpt: pxToMpt(-bounds.actualBoundingBoxLeft),
            yFromBaselineMpt: pxToMpt(-bounds.actualBoundingBoxAscent),
            widthMpt: Math.max(
              0,
              pxToMpt(bounds.actualBoundingBoxLeft + bounds.actualBoundingBoxRight) +
                spacingAdvanceMpt,
            ),
            heightMpt: pxToMpt(bounds.actualBoundingBoxAscent + bounds.actualBoundingBoxDescent),
          };
        };
        const nextBoundary = (text, offset) => {
          const first = text.charCodeAt(offset);
          return first >= 0xd800 && first <= 0xdbff && offset + 1 < text.length
            ? offset + 2
            : offset + 1;
        };
        let totalLines = 0;
        const resolveAtSize = (authoredRequest, fontSizeMpt) => {
          const lineHeightMpt = Math.max(
            fontSizeMpt,
            Math.round(authoredRequest.lineHeightMpt * fontSizeMpt / authoredRequest.fontSizeMpt),
          );
          const request = {
            ...authoredRequest,
            fontSizeMpt,
            lineHeightMpt,
            letterSpacingMpt: Math.round(
              (authoredRequest.letterSpacingMpt ?? 0) *
                fontSizeMpt /
                authoredRequest.fontSizeMpt,
            ),
            wordSpacingMpt: Math.round(
              (authoredRequest.wordSpacingMpt ?? 0) *
                fontSizeMpt /
                authoredRequest.fontSizeMpt,
            ),
            paragraphSpacingMpt: Math.round(
              (authoredRequest.paragraphSpacingMpt ?? 0) *
                fontSizeMpt /
                authoredRequest.fontSizeMpt,
            ),
            maximumLines:
              authoredRequest.overflowPolicy === "shrink-to-minimum"
                ? Math.min(
                    authoredRequest.maximumLines,
                    Math.max(1, Math.floor(authoredRequest.maximumHeightMpt / lineHeightMpt)),
                  )
                : authoredRequest.maximumLines,
          };
          probe.setAttribute("font-family", "RSrender Qualified Arial");
          probe.setAttribute("font-size", String(request.fontSizeMpt / 750));
          probe.setAttribute("font-weight", String(request.fontWeight));
          probe.setAttribute("letter-spacing", String(request.letterSpacingMpt / 750));
          probe.setAttribute("word-spacing", String(request.wordSpacingMpt / 750));
          probe.textContent = request.text.length === 0 ? "\u200b" : request.text;
          context.font = request.fontWeight + " " + request.fontSizeMpt / 1000 + "pt 'RSrender Qualified Arial'";
          const advance = (start, end) =>
            start === end ? 0 : measure(request.text.slice(start, end), request).advanceMpt;
          const lines = [];
          const ink = [];
          let cursor = 0;
          let overwide = false;
          let paragraphOffsetMpt = 0;
          while (cursor < request.text.length && lines.length < request.maximumLines) {
            totalLines += 1;
            if (totalLines > 16_000) throw new Error("MEASUREMENT_LINE_LIMIT");
            if (performance.now() - measurementStarted > 5_000) {
              throw new Error("MEASUREMENT_TIME_LIMIT");
            }
            const start = cursor;
            const paragraphEndCandidate = request.text.indexOf("\\n", cursor);
            const paragraphEnd =
              paragraphEndCandidate === -1 ? request.text.length : paragraphEndCandidate;
            let end = paragraphEnd;
            if (request.wrapPolicy === "word-v1") {
              const boundaries = [start];
              let boundary = start;
              while (boundary < paragraphEnd) {
                boundary = nextBoundary(request.text, boundary);
                boundaries.push(boundary);
              }
              let low = 1;
              let high = boundaries.length - 1;
              let best = 0;
              while (low <= high) {
                const middle = Math.floor((low + high) / 2);
                const candidate = boundaries[middle];
                if (advance(start, candidate) <= request.maximumWidthMpt) {
                  best = middle;
                  low = middle + 1;
                } else {
                  high = middle - 1;
                }
              }
              end = boundaries[Math.min(boundaries.length - 1, Math.max(1, best))];
              if (end < paragraphEnd) {
                const breakAt = request.text.lastIndexOf(" ", end);
                if (breakAt >= start) end = breakAt + 1;
              }
              end = Math.min(paragraphEnd, end);
            }
            const visibleText = request.text.slice(start, end);
            const hasParagraphBreak = end === paragraphEnd && paragraphEndCandidate !== -1;
            const text = request.text.slice(start, end + (hasParagraphBreak ? 1 : 0));
            const metrics = measure(visibleText, request);
            const baselineMpt =
              lines.length * request.lineHeightMpt +
              paragraphOffsetMpt -
              metrics.yFromBaselineMpt;
            const lineXMpt = Math.max(0, -metrics.xMpt);
            overwide ||= metrics.advanceMpt > request.maximumWidthMpt;
            lines.push({
              text,
              sourceStartUtf16: request.sourceStartUtf16 + start,
              sourceEndUtf16:
                request.sourceStartUtf16 + end + (hasParagraphBreak ? 1 : 0),
              xMpt: lineXMpt,
              baselineMpt,
              advanceMpt: metrics.advanceMpt,
            });
            ink.push({
              x: lineXMpt + metrics.xMpt,
              y: baselineMpt + metrics.yFromBaselineMpt,
              width: metrics.widthMpt,
              height: metrics.heightMpt,
            });
            cursor = end + (hasParagraphBreak ? 1 : 0);
            if (hasParagraphBreak) {
              paragraphOffsetMpt += request.paragraphSpacingMpt;
            }
            if (request.wrapPolicy === "no-wrap" && paragraphEndCandidate === -1) break;
          }
          if (request.text.length === 0) {
            lines.push({
              text: "",
              sourceStartUtf16: request.sourceStartUtf16,
              sourceEndUtf16: request.sourceStartUtf16,
              xMpt: 0,
              baselineMpt: request.fontSizeMpt,
              advanceMpt: 0,
            });
          }
          const minimumX = ink.length === 0 ? 0 : Math.min(...ink.map(({ x }) => x));
          const minimumY = ink.length === 0 ? 0 : Math.min(...ink.map(({ y }) => y));
          const maximumX = ink.length === 0 ? 0 : Math.max(...ink.map(({ x, width }) => x + width));
          const maximumY = ink.length === 0 ? 0 : Math.max(...ink.map(({ y, height }) => y + height));
          return {
            measurementId: request.measurementId,
            logicalBounds: {
              xMpt: 0,
              yMpt: 0,
              widthMpt: Math.max(0, ...lines.map(({ advanceMpt }) => advanceMpt)),
              heightMpt: lines.length * request.lineHeightMpt + paragraphOffsetMpt,
            },
            inkBounds: {
              xMpt: minimumX,
              yMpt: minimumY,
              widthMpt: maximumX - minimumX,
              heightMpt: maximumY - minimumY,
            },
            lines,
            overflow:
              cursor < request.text.length ||
              overwide ||
              (request.paragraphSpacingMpt !== 0 &&
                lines.length * request.lineHeightMpt + paragraphOffsetMpt >
                  request.maximumHeightMpt)
                ? "clipped"
                : "none",
            effectiveFontSizeMpt: fontSizeMpt,
            effectiveLineHeightMpt: lineHeightMpt,
          };
        };
        const results = requests.map((request) => {
          const authored = resolveAtSize(request, request.fontSizeMpt);
          if (authored.overflow === "none" || request.overflowPolicy === "clip-with-diagnostic") {
            return authored;
          }
          let low = request.minimumFontSizeMpt;
          let high = request.fontSizeMpt - 1;
          let best = null;
          while (low <= high) {
            const candidateSize = Math.floor((low + high) / 2);
            const candidate = resolveAtSize(request, candidateSize);
            if (candidate.overflow === "none") {
              best = candidate;
              low = candidateSize + 1;
            } else {
              high = candidateSize - 1;
            }
          }
          return best ?? resolveAtSize(request, request.minimumFontSizeMpt);
        });
        const calibrationRequest = {
          fontSizeMpt: 10000,
          fontWeight: 400,
          letterSpacingMpt: 0,
          wordSpacingMpt: 0,
        };
        return {
          fontReady: document.fonts.check("10pt 'RSrender Qualified Arial'"),
          computedFamily: getComputedStyle(probe).fontFamily,
          calibration: measure("RSrender 0123456789", calibrationRequest),
          results,
        };
        } catch (error) {
          return { measurementExecutionError: error instanceof Error ? error.name + ":" + error.message : String(error) };
        }
      })()`,
        true,
      ) as Promise<unknown>,
      15_000,
      "MEASUREMENT_EXECUTION_TIMEOUT",
    );
    if (typeof measured !== "object" || measured === null || Array.isArray(measured)) {
      return Object.freeze({ accepted: false, reason: "WITNESS_MALFORMED" });
    }
    if (Buffer.byteLength(JSON.stringify(measured), "utf8") > 1_048_576) {
      return Object.freeze({ accepted: false, reason: "WITNESS_TOO_LARGE" });
    }
    const witness = measured as DataRecord;
    if (typeof witness["measurementExecutionError"] === "string") {
      return Object.freeze({
        accepted: false,
        reason: `MEASUREMENT_SCRIPT:${witness["measurementExecutionError"]}`.slice(0, 256),
      });
    }
    if (
      witness["fontReady"] !== true ||
      typeof witness["computedFamily"] !== "string" ||
      !Array.isArray(witness["results"]) ||
      typeof witness["calibration"] !== "object" ||
      witness["calibration"] === null
    ) {
      return Object.freeze({
        accepted: false,
        reason: `WITNESS_REJECTED:${JSON.stringify({ fontReady: witness["fontReady"], computedFamily: witness["computedFamily"], results: Array.isArray(witness["results"]), calibration: typeof witness["calibration"] })}`,
      });
    }
    const authority = Object.freeze({
      revision: "bld-033-chromium-layout-host-v1",
      electron: process.versions.electron,
      chromium: process.versions.chrome,
      locale: app.getLocale(),
      fontFamily: witness["computedFamily"],
      calibration: witness["calibration"],
      fontFaces: qualifiedLocalArialFaces(),
    });
    const authorityDigest = sha256CanonicalJson(authority);
    const rawResults = witness["results"] as readonly DataRecord[];
    const fontWeights: readonly number[] = requests.map(
      ({ fontWeight }: BoringLogTextMeasurementRequest) => fontWeight,
    );
    const results = rawResults.map((result, index) => {
      const fontWeight = fontWeights[index];
      return {
        ...result,
        fontFaceDigest:
          fontWeight !== undefined && fontWeight >= 600
            ? authority.fontFaces.bold
            : authority.fontFaces.regular,
        fontMetricsDigest: authorityDigest,
      };
    }) as unknown as readonly BoringLogTextMeasurementResult[];
    return Object.freeze({
      accepted: true,
      results: Object.freeze(results),
      authorityDigest,
    });
  } catch (error) {
    return Object.freeze({
      accepted: false,
      reason: error instanceof Error ? error.message : "MEASUREMENT_FAILED",
    });
  } finally {
    if (!measurementWindow.isDestroyed()) measurementWindow.destroy();
    measurementSession.protocol.unhandle(LAYOUT_HOST_SCHEME);
  }
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
    callback({
      cancel:
        details.method !== "GET" ||
        ![
          LAYOUT_HOST_URL,
          LAYOUT_PUBLICATION_FONT_REGULAR_URL,
          LAYOUT_PUBLICATION_FONT_BOLD_URL,
        ].includes(details.url),
    });
  });
  layoutSession.protocol.handle(LAYOUT_HOST_SCHEME, (request) => {
    if (request.method !== "GET") {
      return new Response("Not found", {
        status: 404,
        headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    if (
      request.url === LAYOUT_PUBLICATION_FONT_REGULAR_URL ||
      request.url === LAYOUT_PUBLICATION_FONT_BOLD_URL
    ) {
      return new Response(
        readFileSync(
          qualifiedFontPath(
            request.url === LAYOUT_PUBLICATION_FONT_BOLD_URL ? "arialbd.ttf" : "arial.ttf",
          ),
        ),
        { status: 200, headers: { "Cache-Control": "no-store", "Content-Type": "font/ttf" } },
      );
    }
    if (request.url !== LAYOUT_HOST_URL) {
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
          "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; font-src 'self'; frame-src 'none'; child-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
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
    const fontReady: unknown = await layoutWindow.webContents.executeJavaScript(
      `document.fonts.ready.then(() => document.fonts.check("10pt 'RSrender Qualified Arial'"))`,
      true,
    );
    if (fontReady !== true) throw new Error("LAYOUT_HOST_FONT_UNAVAILABLE");
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

function emitStudioProbePhase(phase: string): void {
  if (studioProbeMode) process.stdout.write(`RSRENDER_PROBE_PHASE:${phase}\n`);
}

async function pageValue(window: BrowserWindow, expression: string): Promise<unknown> {
  return window.webContents.executeJavaScript(expression, true);
}

async function waitFor(
  window: BrowserWindow,
  expression: string,
  code: string,
  timeoutMs = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await pageValue(window, expression)) === true) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const debug = await pageValue(
    window,
    `(() => ({ revision: document.getElementById("working-revision")?.textContent, status: document.getElementById("editor-status")?.textContent, error: document.getElementById("form-error")?.textContent, selected: document.querySelectorAll('input[type="checkbox"]:checked').length, applyDisabled: document.getElementById("apply-override")?.disabled, activeId: document.activeElement?.id }))()`,
  );
  const upstream = probeFailure === "UNCLASSIFIED" ? "" : `:${probeFailure}`;
  requireProbe(false, `${code}${upstream}:${JSON.stringify(debug)}`);
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
  emitStudioProbePhase("started");
  await waitFor(
    window,
    `document.querySelectorAll("#svg-page > svg").length === 1 && document.body.dataset.authoritativeFileBound === "false" && document.getElementById("editor-status")?.textContent === "Untitled Log Project ready."`,
    "WAIT_STUDIO",
    60_000,
  );
  const initial = record(
    await pageValue(
      window,
      `(() => {
        const sceneNodes = [...document.querySelectorAll("#svg-page .scene-node")];
        const countBy = (values) => Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((candidate) => candidate === value).length]));
        const rect = (selector) => { const node = document.querySelector(selector); return node instanceof SVGRectElement ? { xMpt: Number(node.getAttribute("x")), yMpt: Number(node.getAttribute("y")), widthMpt: Number(node.getAttribute("width")), heightMpt: Number(node.getAttribute("height")) } : null; };
        const columns = [...document.querySelectorAll('#svg-page [data-node-role="log-column-frame"]')].map((node) => ({ semanticId: node.getAttribute("data-semantic-id"), xMpt: Number(node.getAttribute("x")), widthMpt: Number(node.getAttribute("width")) }));
        const regions = ["region-header", "region-depth-body", "region-footer"].map((semanticId) => ({ semanticId, bounds: rect('#svg-page [data-semantic-id="' + semanticId + '"][data-node-role="region-frame"]') }));
        const textSourceRanges = [...document.querySelectorAll("#svg-page text")].map((node) => ({ measurementId: node.getAttribute("data-measurement-id"), ranges: [...node.querySelectorAll("tspan")].map((line) => [Number(line.getAttribute("data-source-start")), Number(line.getAttribute("data-source-end"))]) }));
        return ({
        title: document.title,
        panes: document.querySelectorAll(".contents-pane,.canvas-workspace,.properties-pane").length,
        svg: document.querySelectorAll("#svg-page > svg").length,
        sceneNodes: sceneNodes.length,
        semanticElements: new Set([...document.querySelectorAll("#svg-page [data-semantic-id]")].map((node) => node.getAttribute("data-semantic-id"))).size,
        treeRows: document.querySelectorAll("#contents-tree .tree-row").length,
        diagnostics: document.querySelectorAll("#diagnostics-list li").length,
        diagnosticItems: [...document.querySelectorAll("#diagnostics-list li")].map((item) => item.textContent),
        errorDiagnostics: [...document.querySelectorAll("#diagnostics-list li")].filter((item) => item.textContent?.startsWith("ERROR")).length,
        clippedText: document.querySelectorAll('#svg-page text[data-overflow]:not([data-overflow="none"])').length,
        clippedTextItems: [...document.querySelectorAll('#svg-page text[data-overflow]:not([data-overflow="none"])')].map((node) => ({ semanticId: node.getAttribute("data-semantic-id"), role: node.getAttribute("data-node-role"), overflow: node.getAttribute("data-overflow") })),
        textLines: document.querySelectorAll("#svg-page text tspan").length,
        positiveTextAdvances: [...document.querySelectorAll("#svg-page text tspan")].filter((line) => Number(line.getAttribute("data-advance-mpt")) > 0).length,
        fontFaceDigests: [...new Set([...document.querySelectorAll("#svg-page text[data-font-face-digest]")].map((node) => node.getAttribute("data-font-face-digest")))].sort(),
        fontMetricsDigests: [...new Set([...document.querySelectorAll("#svg-page text[data-font-metrics-digest]")].map((node) => node.getAttribute("data-font-metrics-digest")))].sort(),
        raster: document.querySelectorAll("img,picture,canvas,image").length,
        nodeGlobals: [typeof require, typeof process, typeof electron],
        pageDigest: document.querySelector("#svg-page > svg")?.getAttribute("data-scene-input-digest"),
        reference: {
          viewBox: document.querySelector("#svg-page > svg")?.getAttribute("viewBox"),
          roles: countBy(sceneNodes.map((node) => node.getAttribute("data-node-role"))),
          provenance: countBy(sceneNodes.map((node) => node.getAttribute("data-provenance"))),
          columns,
          regions,
          patternCount: document.querySelectorAll("#svg-page defs pattern").length,
          lineHatchPatternCount: document.querySelectorAll("#svg-page defs pattern > path").length,
          dotRingPatternCount: document.querySelectorAll("#svg-page defs pattern > circle").length,
          depthMajorYMpt: [...new Set([...document.querySelectorAll('#svg-page [data-node-role="depth-major-grid"]')].map((node) => Number(node.getAttribute("y1"))))].sort((left, right) => left - right),
          plotGridXMpt: [...new Set([...document.querySelectorAll('#svg-page [data-node-role="data-axis-grid"]')].map((node) => Number(node.getAttribute("x1"))))].sort((left, right) => left - right),
          headings: Object.fromEntries([...document.querySelectorAll('#svg-page [data-node-role="log-column-heading"]')].map((node) => [node.getAttribute("data-semantic-id"), [...node.querySelectorAll("tspan")].map((line) => line.textContent).join(" ").replace(/\\s+/gu, " ").trim()])),
          plotTickLabels: [...document.querySelectorAll('#svg-page [data-node-role="data-axis-grid-label"]')].map((node) => Number(node.textContent)),
          refusalSemanticIds: [...document.querySelectorAll('#svg-page [data-node-role="sample-refusal-glyph"]')].map((node) => node.getAttribute("data-semantic-id")),
          moistureDashMpt: document.querySelector('#svg-page [data-semantic-id="data-layer:layer-moisture"][data-node-role="data-polyline"]')?.getAttribute("stroke-dasharray"),
          textSourceRanges,
        },
      }); })()`,
    ),
  );
  requireProbe(initial["title"] === "RSrender Boring Log Studio", "STUDIO_INITIAL_TITLE_INVALID");
  requireProbe(initial["panes"] === 3 && initial["svg"] === 1, "STUDIO_INITIAL_SHELL_INVALID");
  requireProbe(
    (initial["sceneNodes"] as number) >= 200 &&
      (initial["semanticElements"] as number) >= 80 &&
      (initial["treeRows"] as number) >= 15,
    "STUDIO_INITIAL_CONTENT_INVALID",
  );
  requireProbe(
    (initial["diagnostics"] as number) >= 1 &&
      initial["errorDiagnostics"] === 0 &&
      initial["clippedText"] === 0,
    `STUDIO_INITIAL_DIAGNOSTICS_INVALID:${JSON.stringify(initial["diagnosticItems"])}:${JSON.stringify(initial["clippedTextItems"])}`,
  );
  requireProbe(
    (initial["textLines"] as number) >= 100 && (initial["positiveTextAdvances"] as number) >= 100,
    `STUDIO_INITIAL_TEXT_INVALID:${String(initial["textLines"])}:${String(initial["positiveTextAdvances"])}`,
  );
  requireProbe(
    JSON.stringify(initial["fontFaceDigests"]) ===
      JSON.stringify([QUALIFIED_ARIAL_REGULAR_DIGEST, QUALIFIED_ARIAL_BOLD_DIGEST].sort()) &&
      Array.isArray(initial["fontMetricsDigests"]) &&
      initial["fontMetricsDigests"].length === 1,
    `STUDIO_INITIAL_FONT_INVALID:${JSON.stringify(initial["fontFaceDigests"])}:${JSON.stringify(initial["fontMetricsDigests"])}`,
  );
  requireProbe(
    initial["raster"] === 0 &&
      JSON.stringify(initial["nodeGlobals"]) === '["undefined","undefined","undefined"]' &&
      typeof initial["pageDigest"] === "string",
    "STUDIO_INITIAL_SECURITY_INVALID",
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
  await new Promise((resolve) => setTimeout(resolve, 100));
  const fitSmall = record(
    await pageValue(
      window,
      `(() => { document.getElementById("fit-page")?.click(); const stage = document.getElementById("canvas-stage"); const page = document.getElementById("page-shadow"); if (!(stage instanceof HTMLElement) || !(page instanceof HTMLElement)) return { invalid: "fit-elements" }; const expected = Math.min(160, Math.max(40, Math.floor((Math.min((stage.clientWidth - 56) / page.offsetWidth, (stage.clientHeight - 56) / page.offsetHeight) * 100) / 10) * 10)); return { actual: Number(document.getElementById("zoom")?.value), expected, mode: page.dataset.zoomMode, stageWidth: stage.clientWidth, stageHeight: stage.clientHeight }; })()`,
    ),
  );
  requireProbe(
    fitSmall["actual"] === fitSmall["expected"] && fitSmall["mode"] === "fit",
    "STUDIO_FIT_SMALL_INVALID",
  );
  window.setSize(1_400, 900);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const fitLarge = record(
    await pageValue(
      window,
      `(() => { document.getElementById("fit-page")?.click(); const stage = document.getElementById("canvas-stage"); const page = document.getElementById("page-shadow"); if (!(stage instanceof HTMLElement) || !(page instanceof HTMLElement)) return { invalid: "fit-elements" }; const expected = Math.min(160, Math.max(40, Math.floor((Math.min((stage.clientWidth - 56) / page.offsetWidth, (stage.clientHeight - 56) / page.offsetHeight) * 100) / 10) * 10)); return { actual: Number(document.getElementById("zoom")?.value), expected, mode: page.dataset.zoomMode, stageWidth: stage.clientWidth, stageHeight: stage.clientHeight }; })()`,
    ),
  );
  requireProbe(
    fitLarge["actual"] === fitLarge["expected"] && fitLarge["mode"] === "fit",
    "STUDIO_FIT_LARGE_INVALID",
  );
  window.setSize(1_100, 600);
  await new Promise((resolve) => setTimeout(resolve, 100));
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
        document.getElementById("contents-mode-source")?.click();
        const sourceRows = document.querySelectorAll("#contents-tree .tree-row").length;
        const sourceMode = document.getElementById("contents-tree")?.dataset.displayMode;
        document.getElementById("contents-mode-drawing")?.click();
        const drawingRows = document.querySelectorAll("#contents-tree .tree-row").length;
        document.getElementById("contents-options")?.click();
        const optionRowsCollapsed = document.querySelectorAll("#contents-tree .tree-row").length;
        document.getElementById("contents-options")?.click();
        const optionRowsExpanded = document.querySelectorAll("#contents-tree .tree-row").length;
        const group = document.querySelector(".property-group");
        const summary = group?.querySelector("summary");
        if (!(group instanceof HTMLDetailsElement) || !(summary instanceof HTMLElement)) return { invalid: "missing-property-disclosure" };
        summary.click();
        const propertyCollapsed = group.open === false;
        summary.click();
        const propertyExpanded = group.open === true;
        document.getElementById("properties-options")?.click();
        const allPropertiesCollapsed = [...document.querySelectorAll(".property-group")].every((candidate) => candidate instanceof HTMLDetailsElement && candidate.open === false);
        document.getElementById("properties-options")?.click();
        const allPropertiesExpanded = [...document.querySelectorAll(".property-group")].every((candidate) => candidate instanceof HTMLDetailsElement && candidate.open === true);
        document.getElementById("property-tab-diagnostics")?.click();
        const diagnosticsShown = document.getElementById("property-diagnostics-panel")?.hidden === false;
        document.getElementById("property-tab-element")?.click();
        const elementShown = document.getElementById("property-element-panel")?.hidden === false;
        const scroll = document.getElementById("properties-scroll");
        if (!(scroll instanceof HTMLElement)) return { invalid: "missing-properties-scroll" };
        scroll.scrollTop = scroll.scrollHeight;
        const selectedBeforePan = document.getElementById("property-semantic-id")?.textContent;
        document.getElementById("pan-tool")?.click();
        const panPressed = document.getElementById("pan-tool")?.getAttribute("aria-pressed") === "true" && document.getElementById("select-tool")?.getAttribute("aria-pressed") === "false";
        document.querySelector('#svg-page [data-semantic-id="region-header"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        const panSelectionGated = document.getElementById("property-semantic-id")?.textContent === selectedBeforePan;
        const ownedCommands = [...document.querySelectorAll("button[id]")].every((button) => button instanceof HTMLButtonElement && typeof button.dataset.commandOwned === "string");
        const ownedCommandCount = Number(document.body.dataset.ownedCommandCount);
        const stage = document.getElementById("canvas-stage");
        if (!(stage instanceof HTMLElement)) return { invalid: "missing-canvas-stage" };
        stage.scrollTop = 0;
        return {
          tabStates,
          rowsBefore,
          rowsCollapsed,
          rowsExpanded,
          sourceRows,
          sourceMode,
          drawingRows,
          optionRowsCollapsed,
          optionRowsExpanded,
          propertyCollapsed,
          propertyExpanded,
          allPropertiesCollapsed,
          allPropertiesExpanded,
          diagnosticsShown,
          elementShown,
          overflowY: getComputedStyle(scroll).overflowY,
          scrollable: scroll.scrollHeight > scroll.clientHeight,
          scrollTop: scroll.scrollTop,
          panPressed,
          panSelectionGated,
          ownedCommands,
          ownedCommandCount,
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
      (interactions["sourceRows"] as number) > 0 &&
      (interactions["sourceRows"] as number) < (interactions["rowsBefore"] as number) &&
      interactions["sourceMode"] === "source" &&
      interactions["drawingRows"] === interactions["rowsBefore"] &&
      interactions["optionRowsCollapsed"] === 1 &&
      interactions["optionRowsExpanded"] === interactions["rowsBefore"] &&
      interactions["propertyCollapsed"] === true &&
      interactions["propertyExpanded"] === true &&
      interactions["allPropertiesCollapsed"] === true &&
      interactions["allPropertiesExpanded"] === true &&
      interactions["diagnosticsShown"] === true &&
      interactions["elementShown"] === true &&
      interactions["overflowY"] === "auto" &&
      interactions["scrollable"] === true &&
      (interactions["scrollTop"] as number) > 0 &&
      interactions["panPressed"] === true &&
      interactions["panSelectionGated"] === true &&
      interactions["ownedCommands"] === true &&
      (interactions["ownedCommandCount"] as number) >= 25,
    "STUDIO_INTERACTIONS_INVALID",
  );
  const stageBounds = record(
    await pageValue(
      window,
      `(() => { const bounds = document.getElementById("canvas-stage")?.getBoundingClientRect(); return bounds === undefined ? {} : { x: Math.round(bounds.x + bounds.width / 2), y: Math.round(bounds.y + bounds.height / 2) }; })()`,
    ),
  );
  requireProbe(
    typeof stageBounds["x"] === "number" && typeof stageBounds["y"] === "number",
    "STUDIO_PAN_BOUNDS_INVALID",
  );
  window.webContents.sendInputEvent({
    type: "mouseDown",
    x: stageBounds["x"],
    y: stageBounds["y"] + 60,
    button: "left",
    clickCount: 1,
  });
  window.webContents.sendInputEvent({
    type: "mouseMove",
    x: stageBounds["x"],
    y: stageBounds["y"] - 60,
    movementX: 0,
    movementY: -120,
  });
  window.webContents.sendInputEvent({
    type: "mouseUp",
    x: stageBounds["x"],
    y: stageBounds["y"] - 60,
    button: "left",
    clickCount: 1,
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  const panScroll = await pageValue(
    window,
    `document.getElementById("canvas-stage")?.scrollTop ?? 0`,
  );
  requireProbe(typeof panScroll === "number" && panScroll > 0, "STUDIO_PAN_SCROLL_INVALID");
  await pageValue(
    window,
    `(() => { document.getElementById("select-tool")?.click(); const target = document.querySelector('.tree-row[data-semantic-id^="lithology:"] .tree-select'); if (target instanceof HTMLButtonElement) target.click(); document.getElementById("actual-size")?.click(); document.getElementById("zoom-out")?.click(); return true; })()`,
  );
  requireProbe(
    (await pageValue(
      window,
      `document.getElementById("zoom-value")?.textContent === "90%" && document.getElementById("page-shadow")?.classList.contains("zoom-90") === true && document.getElementById("page-shadow")?.dataset.zoomMode === "manual"`,
    )) === true,
    "STUDIO_ZOOM_INVALID",
  );
  await pageValue(window, `document.getElementById("ribbon-tab-review")?.click(); true`);
  await press(window, "#validate-document", "Space", "FOCUS_STUDIO_VALIDATE");
  await waitFor(
    window,
    `document.getElementById("validate-document")?.dataset.result === "VALIDATION_PASS" && document.getElementById("editor-status")?.textContent?.startsWith("Validation passed at revision 0:") === true`,
    "WAIT_STUDIO_VALIDATE",
  );
  const validation = record(
    await pageValue(
      window,
      `(() => ({ result: document.getElementById("validate-document")?.dataset.result, diagnosticsShown: document.getElementById("property-diagnostics-panel")?.hidden === false, diagnostics: document.querySelectorAll("#diagnostics-list li").length, revision: document.getElementById("editor-status")?.textContent, activeId: document.activeElement?.id }))()`,
    ),
  );
  requireProbe(
    validation["result"] === "VALIDATION_PASS" &&
      validation["diagnosticsShown"] === true &&
      (validation["diagnostics"] as number) >= 1 &&
      validation["activeId"] === "validate-document",
    "STUDIO_VALIDATION_INVALID",
  );
  await pageValue(
    window,
    `(() => { document.getElementById("property-tab-element")?.click(); document.getElementById("ribbon-tab-home")?.click(); return true; })()`,
  );
  let editing: DataRecord | null = null;
  if (studioEditingMode) {
    const before = record(
      await pageValue(
        window,
        `(async () => { const authority = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); return ({
          documentApi: Object.keys(globalThis.rsrender.document),
          studioApi: Object.keys(globalThis.rsrenderStudio),
          readonly: document.getElementById("property-content")?.readOnly,
          applyDisabled: document.getElementById("apply-property")?.disabled,
          source: document.getElementById("property-source-original")?.textContent,
          effective: document.getElementById("property-effective-value")?.textContent,
          dirtyText: document.getElementById("document-state")?.textContent,
          authorityDirty: authority.accepted ? authority.projection.dirty : null,
          workingRevision: authority.accepted ? authority.projection.workingRevision : null,
          durableRevision: authority.accepted ? authority.projection.durableRevision : null,
        }); })()`,
      ),
    );
    requireProbe(
      JSON.stringify(before["documentApi"]) ===
        '["getProjection","setDisplayValue","undo","redo"]' &&
        JSON.stringify(before["studioApi"]) ===
          '["getProjection","lifecycle","setTextOccurrenceStyle","resetTextOccurrencePresentation"]' &&
        before["readonly"] === false &&
        before["applyDisabled"] === false &&
        before["source"] === before["effective"] &&
        before["dirtyText"] === "Clean" &&
        before["authorityDirty"] === false &&
        before["workingRevision"] === 0 &&
        before["durableRevision"] === 0,
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
        `(async () => { const authority = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); return ({
          source: document.getElementById("property-source-original")?.textContent,
          effective: document.getElementById("property-effective-value")?.textContent,
          provenance: document.getElementById("property-provenance")?.textContent,
          digest: document.querySelector("#svg-page > svg")?.getAttribute("data-scene-input-digest"),
          selectedSceneNodes: document.querySelectorAll("#svg-page .scene-node.is-selected").length,
          dirtyText: document.getElementById("document-state")?.textContent,
          authorityDirty: authority.accepted ? authority.projection.dirty : null,
          workingRevision: authority.accepted ? authority.projection.workingRevision : null,
          durableRevision: authority.accepted ? authority.projection.durableRevision : null,
        }); })()`,
      ),
    );
    requireProbe(
      applied["source"] === before["source"] &&
        applied["effective"] === replacement &&
        (applied["provenance"] as string).includes("Effective override") &&
        applied["digest"] !== initial["pageDigest"] &&
        (applied["selectedSceneNodes"] as number) >= 1 &&
        applied["dirtyText"] === "Unsaved changes" &&
        applied["authorityDirty"] === true &&
        applied["workingRevision"] === 1 &&
        applied["durableRevision"] === 0,
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
        `(async () => { const authority = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); return ({
          source: document.getElementById("property-source-original")?.textContent,
          effective: document.getElementById("property-effective-value")?.textContent,
          provenance: document.getElementById("property-provenance")?.textContent,
          digest: document.querySelector("#svg-page > svg")?.getAttribute("data-scene-input-digest"),
          dirtyText: document.getElementById("document-state")?.textContent,
          authorityDirty: authority.accepted ? authority.projection.dirty : null,
          workingRevision: authority.accepted ? authority.projection.workingRevision : null,
          durableRevision: authority.accepted ? authority.projection.durableRevision : null,
        }); })()`,
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
        `(async () => { const authority = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); return ({
          source: document.getElementById("property-source-original")?.textContent,
          effective: document.getElementById("property-effective-value")?.textContent,
          provenance: document.getElementById("property-provenance")?.textContent,
          digest: document.querySelector("#svg-page > svg")?.getAttribute("data-scene-input-digest"),
          raster: document.querySelectorAll("img,picture,canvas,image").length,
          dirtyText: document.getElementById("document-state")?.textContent,
          authorityDirty: authority.accepted ? authority.projection.dirty : null,
          workingRevision: authority.accepted ? authority.projection.workingRevision : null,
          durableRevision: authority.accepted ? authority.projection.durableRevision : null,
        }); })()`,
      ),
    );
    requireProbe(
      undo["source"] === before["source"] &&
        undo["effective"] === before["source"] &&
        (undo["provenance"] as string).includes("Source original") &&
        redo["source"] === before["source"] &&
        redo["effective"] === replacement &&
        (redo["provenance"] as string).includes("Effective override") &&
        redo["raster"] === 0 &&
        undo["dirtyText"] === "Unsaved changes" &&
        undo["authorityDirty"] === true &&
        undo["workingRevision"] === 2 &&
        undo["durableRevision"] === 0 &&
        redo["dirtyText"] === "Unsaved changes" &&
        redo["authorityDirty"] === true &&
        redo["workingRevision"] === 3 &&
        redo["durableRevision"] === 0,
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
    const widthMpt = "190000";
    await typeText(window, "#property-content", widthMpt);
    await press(window, "#apply-property", "Space", "FOCUS_STUDIO_LAYOUT_APPLY");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent === "Description Column Width Mpt applied at revision 7." && document.getElementById("property-effective-value")?.textContent === ${JSON.stringify(widthMpt)} && document.querySelector('#svg-page [data-semantic-id="column-description"][data-node-role="log-column-frame"]')?.getAttribute("width") === ${JSON.stringify(widthMpt)} && document.querySelector('#svg-page [data-semantic-id="column-sample"][data-node-role="log-column-frame"]')?.getAttribute("x") === "300000"`,
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
      layout["source"] === "186000" &&
        layout["effective"] === widthMpt &&
        (layout["provenance"] as string).includes("Effective override") &&
        layout["width"] === widthMpt &&
        layout["followingX"] === "300000",
      "STUDIO_LAYOUT_INVALID",
    );
    await press(window, "#undo", "Space", "FOCUS_STUDIO_LAYOUT_UNDO");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent === "Undo completed at revision 8." && document.getElementById("property-effective-value")?.textContent === "186000" && document.querySelector('#svg-page [data-semantic-id="column-description"][data-node-role="log-column-frame"]')?.getAttribute("width") === "186000"`,
      "WAIT_STUDIO_LAYOUT_UNDO",
    );
    editing = Object.freeze({ before, applied, undo, redo, replacement, style, layout });
  }
  let publication: DataRecord | null = null;
  if (pdfProbeMode && !multiBoringProbeMode) {
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
  let boringNavigation: DataRecord | null = null;
  if (multiBoringProbeMode) {
    requireProbe(
      (await pageValue(
        window,
        `(() => { const node = document.querySelector('#svg-page [data-semantic-id="lithology:stratum-01"]'); if (!(node instanceof SVGElement)) return false; node.dispatchEvent(new MouseEvent("click", { bubbles: true })); return true; })()`,
      )) === true,
      "SELECT_FIRST_BORING_MATERIAL_BEFORE_NAVIGATION",
    );
    await waitFor(
      window,
      `document.getElementById("property-semantic-id")?.textContent === "lithology:stratum-01"`,
      "WAIT_FIRST_BORING_SELECTION_BEFORE_NAVIGATION",
    );
    await typeText(
      window,
      "#property-content",
      "First boring retained its own authored description.",
    );
    await press(window, "#apply-property", "Space", "FOCUS_FIRST_BORING_APPLY");
    await waitFor(
      window,
      `document.getElementById("property-effective-value")?.textContent === "First boring retained its own authored description." && document.getElementById("boring-indicators")?.textContent?.includes("Has overrides") === true`,
      "WAIT_FIRST_BORING_APPLY",
    );
    const beforeNavigation = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); return { accepted: value.accepted, workingRevision: value.accepted ? value.projection.workingRevision : null, dirty: value.accepted ? value.projection.dirty : null, active: document.body.dataset.activeBoringLogIdentity, selector: document.getElementById("boring-selector")?.value, position: document.getElementById("boring-position")?.textContent, effective: document.getElementById("property-effective-value")?.textContent, indicator: document.getElementById("boring-indicators")?.textContent }; })()`,
      ),
    );
    await press(window, "#next-boring", "Space", "FOCUS_NEXT_BORING");
    await waitFor(
      window,
      `document.body.dataset.activeBoringLogIdentity === "urn:rsrender:boring-log:test-02" && document.getElementById("canvas-title")?.textContent?.startsWith("BORING LOG TEST-02") === true && document.getElementById("boring-position")?.textContent === "Boring 2 of 2" && document.querySelector('#svg-page [data-semantic-id="lithology:b02-stratum-01"]') !== null`,
      "WAIT_NEXT_BORING",
    );
    requireProbe(
      (await pageValue(
        window,
        `(() => { const node = document.querySelector('#svg-page [data-semantic-id="lithology:b02-stratum-01"]'); if (!(node instanceof SVGElement)) return false; node.dispatchEvent(new MouseEvent("click", { bubbles: true })); return true; })()`,
      )) === true,
      "SELECT_SECOND_BORING_MATERIAL",
    );
    await waitFor(
      window,
      `document.getElementById("property-semantic-id")?.textContent === "lithology:b02-stratum-01"`,
      "WAIT_SECOND_BORING_SELECTION",
    );
    await typeText(
      window,
      "#property-content",
      "Second boring retained its own authored description.",
    );
    await press(window, "#apply-property", "Space", "FOCUS_SECOND_BORING_APPLY");
    await waitFor(
      window,
      `document.getElementById("property-effective-value")?.textContent === "Second boring retained its own authored description." && document.getElementById("boring-indicators")?.textContent?.includes("Has overrides") === true`,
      "WAIT_SECOND_BORING_APPLY",
    );
    const second = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); return { workingRevision: value.accepted ? value.projection.workingRevision : null, dirty: value.accepted ? value.projection.dirty : null, effective: document.getElementById("property-effective-value")?.textContent, indicator: document.getElementById("boring-indicators")?.textContent }; })()`,
      ),
    );
    if (!textStyleProbeMode) {
      requireProbe(
        (await pageValue(
          window,
          `(() => Object.keys(globalThis.rsrenderPublication ?? {}).join(",") === "exportPdf" && document.getElementById("export-pdf")?.disabled === false)()`,
        )) === true,
        "MULTI_BORING_PUBLICATION_AUTHORITY_INVALID",
      );
      requireProbe(
        (await pageValue(
          window,
          `(() => { const tab = document.querySelector('[data-ribbon-tab="publish"]'); if (!(tab instanceof HTMLButtonElement)) return false; tab.click(); return document.querySelector('[data-ribbon-panel="publish"]')?.hidden === false; })()`,
        )) === true,
        "MULTI_BORING_PUBLICATION_TAB_INVALID",
      );
      await press(window, "#export-pdf", "Space", "FOCUS_MULTI_BORING_EXPORT_PDF");
      await waitFor(
        window,
        `document.getElementById("export-pdf")?.dataset.result === "EXPORT_VERIFIED_SUCCESS" && document.getElementById("editor-status")?.textContent?.startsWith("PDF exported and reopened successfully:") === true`,
        "WAIT_MULTI_BORING_EXPORT_PDF",
      );
      publication = record(
        await pageValue(
          window,
          `(() => { const button = document.getElementById("export-pdf"); return { result: button?.dataset.result, destinationPath: button?.dataset.destinationPath, pdfDigest: button?.dataset.pdfDigest, sceneDigest: button?.dataset.sceneDigest, projectionDigest: button?.dataset.projectionDigest, pdfBytes: Number(button?.dataset.pdfBytes), activeBoringLogIdentity: document.body.dataset.activeBoringLogIdentity, activeId: document.activeElement?.id }; })()`,
        ),
      );
      requireProbe(
        publication["result"] === "EXPORT_VERIFIED_SUCCESS" &&
          publication["destinationPath"] === path.resolve(pdfProbeOutput ?? "") &&
          publication["activeBoringLogIdentity"] === "urn:rsrender:boring-log:test-02" &&
          typeof publication["pdfDigest"] === "string" &&
          /^sha256:[0-9a-f]{64}$/u.test(publication["pdfDigest"]) &&
          typeof publication["sceneDigest"] === "string" &&
          /^sha256:[0-9a-f]{64}$/u.test(publication["sceneDigest"]) &&
          typeof publication["projectionDigest"] === "string" &&
          /^sha256:[0-9a-f]{64}$/u.test(publication["projectionDigest"]) &&
          typeof publication["pdfBytes"] === "number" &&
          publication["pdfBytes"] > 1_024 &&
          publication["activeId"] === "export-pdf",
        "MULTI_BORING_PUBLICATION_RESULT_INVALID",
      );
    }
    await press(window, "#previous-boring", "Space", "FOCUS_PREVIOUS_BORING");
    await waitFor(
      window,
      `document.body.dataset.activeBoringLogIdentity === "urn:rsrender:boring-log:test-01" && document.getElementById("boring-position")?.textContent === "Boring 1 of 2" && document.getElementById("property-semantic-id")?.textContent === "lithology:stratum-01" && document.getElementById("property-effective-value")?.textContent === "First boring retained its own authored description."`,
      "WAIT_PREVIOUS_BORING",
    );
    const first = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); return { workingRevision: value.accepted ? value.projection.workingRevision : null, dirty: value.accepted ? value.projection.dirty : null, effective: document.getElementById("property-effective-value")?.textContent, selector: document.getElementById("boring-selector")?.value, indicator: document.getElementById("boring-indicators")?.textContent }; })()`,
      ),
    );
    requireProbe(
      beforeNavigation["accepted"] === true &&
        beforeNavigation["dirty"] === true &&
        beforeNavigation["effective"] === "First boring retained its own authored description." &&
        (beforeNavigation["indicator"] as string).includes("Has overrides") &&
        second["dirty"] === true &&
        (second["indicator"] as string).includes("Has overrides") &&
        first["dirty"] === true &&
        second["workingRevision"] === (beforeNavigation["workingRevision"] as number) + 1 &&
        first["workingRevision"] === second["workingRevision"] &&
        second["effective"] === "Second boring retained its own authored description." &&
        first["effective"] === "First boring retained its own authored description." &&
        (first["indicator"] as string).includes("Has overrides") &&
        first["selector"] === "1. BORING LOG TEST-01",
      "MULTI_BORING_NAVIGATION_INVALID",
    );
    boringNavigation = Object.freeze({ before: beforeNavigation, second, first });
    requireProbe(
      (await pageValue(
        window,
        `(() => { const node = document.querySelector('#svg-page [data-semantic-id="column-description"]'); if (!(node instanceof SVGElement)) return false; node.dispatchEvent(new MouseEvent("click", { bubbles: true })); return true; })()`,
      )) === true,
      "RESTORE_DESCRIPTION_COLUMN_SELECTION",
    );
    await waitFor(
      window,
      `document.getElementById("property-semantic-id")?.textContent === "column-description"`,
      "WAIT_DESCRIPTION_COLUMN_SELECTION",
    );
  }
  let textOccurrenceStyle: DataRecord | null = null;
  if (textStyleProbeMode) {
    requireProbe(
      (await pageValue(
        window,
        `(() => { const node = document.getElementById("node:lithology:stratum-01:transition:2:text"); if (!(node instanceof SVGElement)) return false; node.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 500, clientY: 320 })); return document.getElementById("canvas-context-menu")?.hidden === false; })()`,
      )) === true,
      "TEXT_OCCURRENCE_CONTEXT_MENU_INVALID",
    );
    await press(window, "#context-properties", "Space", "FOCUS_TEXT_OCCURRENCE_PROPERTIES");
    await waitFor(
      window,
      `document.getElementById("property-node-id")?.textContent === "node:lithology:stratum-01:transition:2:text" && document.getElementById("text-style-properties")?.hidden === false && document.getElementById("text-font-size")?.value === "5.5"`,
      "WAIT_TEXT_OCCURRENCE_PROPERTIES",
    );
    const before = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); const node = document.getElementById("node:lithology:stratum-01:transition:2:text"); return { workingRevision: value.accepted ? value.projection.workingRevision : null, sceneInputDigest: value.accepted ? value.projection.scene.inputDigest : null, nodeId: document.getElementById("property-node-id")?.textContent, fontSize: node?.getAttribute("font-size"), fontWeight: node?.getAttribute("font-weight"), fill: node?.getAttribute("fill"), scope: document.getElementById("text-style-scope")?.value, contextHidden: document.getElementById("canvas-context-menu")?.hidden }; })()`,
      ),
    );
    await typeText(window, "#text-font-size", "9");
    await typeText(window, "#text-line-height", "11");
    await typeText(window, "#text-letter-spacing", "0.25");
    await typeText(window, "#text-word-spacing", "0.5");
    await typeText(window, "#text-paragraph-spacing", "2");
    await typeText(window, "#text-frame-x", "125");
    await typeText(window, "#text-frame-width", "150");
    await typeText(window, "#text-frame-height", "22");
    await typeText(window, "#text-rotation", "5");
    await typeText(window, "#text-padding-top", "1");
    await typeText(window, "#text-padding-right", "2");
    await typeText(window, "#text-padding-bottom", "1");
    await typeText(window, "#text-padding-left", "2");
    requireProbe(
      (await pageValue(
        window,
        `(() => { const weight = document.getElementById("text-font-weight"); const decoration = document.getElementById("text-decoration"); const color = document.getElementById("text-color"); const anchor = document.getElementById("text-frame-anchor"); const horizontal = document.getElementById("text-horizontal-alignment"); const vertical = document.getElementById("text-vertical-alignment"); const wrap = document.getElementById("text-wrap-policy"); const locked = document.getElementById("text-locked"); const frameFillEnabled = document.getElementById("text-frame-fill-enabled"); const frameFillColor = document.getElementById("text-frame-fill-color"); const frameStrokeEnabled = document.getElementById("text-frame-stroke-enabled"); const frameStrokeColor = document.getElementById("text-frame-stroke-color"); if (!(weight instanceof HTMLSelectElement) || !(decoration instanceof HTMLSelectElement) || !(color instanceof HTMLInputElement) || !(anchor instanceof HTMLSelectElement) || !(horizontal instanceof HTMLSelectElement) || !(vertical instanceof HTMLSelectElement) || !(wrap instanceof HTMLSelectElement) || !(locked instanceof HTMLInputElement) || !(frameFillEnabled instanceof HTMLInputElement) || !(frameFillColor instanceof HTMLInputElement) || !(frameStrokeEnabled instanceof HTMLInputElement) || !(frameStrokeColor instanceof HTMLInputElement)) return false; weight.value = "700"; weight.dispatchEvent(new Event("change", { bubbles: true })); decoration.value = "underline"; decoration.dispatchEvent(new Event("change", { bubbles: true })); color.value = "#b42318"; color.dispatchEvent(new Event("input", { bubbles: true })); frameFillEnabled.checked = true; frameFillEnabled.dispatchEvent(new Event("change", { bubbles: true })); frameFillColor.value = "#fff4cc"; frameFillColor.dispatchEvent(new Event("input", { bubbles: true })); frameStrokeEnabled.checked = true; frameStrokeEnabled.dispatchEvent(new Event("change", { bubbles: true })); frameStrokeColor.value = "#b42318"; frameStrokeColor.dispatchEvent(new Event("input", { bubbles: true })); anchor.value = "bottom-center"; anchor.dispatchEvent(new Event("change", { bubbles: true })); horizontal.value = "center"; vertical.value = "middle"; wrap.value = "no-wrap"; locked.checked = true; locked.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`,
      )) === true,
      "TEXT_OCCURRENCE_CONTROLS_INVALID",
    );
    await typeText(window, "#text-frame-stroke-width", "0.75");
    await press(window, "#apply-text-style", "Space", "FOCUS_TEXT_OCCURRENCE_APPLY");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent?.startsWith("Text properties applied to node:lithology:stratum-01:transition:2:text at revision ") === true && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("font-size") === "9000" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("font-weight") === "700" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill") === "#b42318" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("data-frame-x-mpt") === "125000" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("data-frame-anchor") === "bottom-center" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("data-horizontal-alignment") === "center" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("data-locked") === "true"`,
      "WAIT_TEXT_OCCURRENCE_APPLY",
    );
    const applied = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); const node = document.getElementById("node:lithology:stratum-01:transition:2:text"); const frame = document.getElementById("node:lithology:stratum-01:transition:2:text:presentation-frame"); return { workingRevision: value.accepted ? value.projection.workingRevision : null, sceneInputDigest: value.accepted ? value.projection.scene.inputDigest : null, canUndo: value.accepted ? value.projection.canUndo : null, undoDisabled: document.getElementById("undo")?.disabled, fontSize: node?.getAttribute("font-size"), fontWeight: node?.getAttribute("font-weight"), textDecoration: node?.getAttribute("text-decoration"), letterSpacing: node?.getAttribute("data-letter-spacing-mpt"), wordSpacing: node?.getAttribute("data-word-spacing-mpt"), paragraphSpacing: node?.getAttribute("data-paragraph-spacing-mpt"), fill: node?.getAttribute("fill"), frameX: node?.getAttribute("data-frame-x-mpt"), frameWidth: node?.getAttribute("data-frame-width-mpt"), frameAnchor: node?.getAttribute("data-frame-anchor"), horizontalAlignment: node?.getAttribute("data-horizontal-alignment"), verticalAlignment: node?.getAttribute("data-vertical-alignment"), wrapPolicy: node?.getAttribute("data-wrap-policy"), locked: node?.getAttribute("data-locked"), transform: node?.getAttribute("transform"), presentationFrameFill: frame?.getAttribute("fill"), presentationFrameStroke: frame?.getAttribute("stroke"), presentationFrameStrokeWidth: frame?.getAttribute("stroke-width"), presentationFrameTransform: frame?.getAttribute("transform"), firstLineX: node?.querySelector("tspan")?.getAttribute("x"), provenance: document.getElementById("property-provenance")?.textContent, documentState: document.getElementById("document-state")?.textContent, indicator: document.getElementById("boring-indicators")?.textContent }; })()`,
      ),
    );
    requireProbe(applied["canUndo"] === true, "TEXT_OCCURRENCE_AUTHORITY_UNDO_INVALID");
    requireProbe(applied["undoDisabled"] === false, "TEXT_OCCURRENCE_UI_UNDO_INVALID");
    requireProbe(
      (await pageValue(
        window,
        `(() => { const tab = document.querySelector('[data-ribbon-tab="home"]'); if (!(tab instanceof HTMLButtonElement)) return false; tab.click(); return document.querySelector('[data-ribbon-panel="home"]')?.hidden === false; })()`,
      )) === true,
      "TEXT_OCCURRENCE_HISTORY_TAB_INVALID",
    );
    await press(window, "#undo", "Space", "FOCUS_TEXT_OCCURRENCE_UNDO");
    await waitFor(
      window,
      `document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("font-size") === "5500" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.hasAttribute("data-frame-x-mpt") === false && document.getElementById("node:lithology:stratum-01:transition:2:text:presentation-frame") === null && document.getElementById("redo")?.disabled === false`,
      "WAIT_TEXT_OCCURRENCE_UNDO",
    );
    const undo = record(
      await pageValue(
        window,
        `(() => { const node = document.getElementById("node:lithology:stratum-01:transition:2:text"); return { fontSize: node?.getAttribute("font-size"), fontWeight: node?.getAttribute("font-weight"), textDecoration: node?.getAttribute("text-decoration"), letterSpacing: node?.getAttribute("data-letter-spacing-mpt"), wordSpacing: node?.getAttribute("data-word-spacing-mpt"), paragraphSpacing: node?.getAttribute("data-paragraph-spacing-mpt"), fill: node?.getAttribute("fill"), frameX: node?.getAttribute("data-frame-x-mpt"), presentationFrame: document.getElementById("node:lithology:stratum-01:transition:2:text:presentation-frame") !== null, firstLineX: node?.querySelector("tspan")?.getAttribute("x") }; })()`,
      ),
    );
    await press(window, "#redo", "Space", "FOCUS_TEXT_OCCURRENCE_REDO");
    await waitFor(
      window,
      `document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("font-size") === "9000" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("font-weight") === "700" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("data-frame-x-mpt") === "125000" && document.getElementById("node:lithology:stratum-01:transition:2:text:presentation-frame")?.getAttribute("stroke") === "#b42318"`,
      "WAIT_TEXT_OCCURRENCE_REDO",
    );
    const redo = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); const node = document.getElementById("node:lithology:stratum-01:transition:2:text"); const frame = document.getElementById("node:lithology:stratum-01:transition:2:text:presentation-frame"); return { workingRevision: value.accepted ? value.projection.workingRevision : null, sceneInputDigest: value.accepted ? value.projection.scene.inputDigest : null, fontSize: node?.getAttribute("font-size"), fontWeight: node?.getAttribute("font-weight"), textDecoration: node?.getAttribute("text-decoration"), letterSpacing: node?.getAttribute("data-letter-spacing-mpt"), wordSpacing: node?.getAttribute("data-word-spacing-mpt"), paragraphSpacing: node?.getAttribute("data-paragraph-spacing-mpt"), fill: node?.getAttribute("fill"), frameX: node?.getAttribute("data-frame-x-mpt"), horizontalAlignment: node?.getAttribute("data-horizontal-alignment"), locked: node?.getAttribute("data-locked"), transform: node?.getAttribute("transform"), presentationFrameFill: frame?.getAttribute("fill"), presentationFrameStroke: frame?.getAttribute("stroke"), presentationFrameStrokeWidth: frame?.getAttribute("stroke-width"), presentationFrameTransform: frame?.getAttribute("transform") }; })()`,
      ),
    );
    requireProbe(
      applied["frameX"] === "125000" &&
        applied["frameAnchor"] === "bottom-center" &&
        applied["frameWidth"] === "150000" &&
        applied["horizontalAlignment"] === "center" &&
        applied["verticalAlignment"] === "middle" &&
        applied["wrapPolicy"] === "no-wrap" &&
        applied["textDecoration"] === "underline" &&
        applied["letterSpacing"] === "250" &&
        applied["wordSpacing"] === "500" &&
        applied["paragraphSpacing"] === "2000" &&
        applied["presentationFrameFill"] === "#fff4cc" &&
        applied["presentationFrameStroke"] === "#b42318" &&
        applied["presentationFrameStrokeWidth"] === "750" &&
        applied["presentationFrameTransform"] === "rotate(5 200000 304338)" &&
        applied["locked"] === "true",
      `TEXT_OCCURRENCE_LAYOUT_APPLY_INVALID:${JSON.stringify(applied)}`,
    );
    requireProbe(
      applied["transform"] === "rotate(5 200000 304338)",
      `TEXT_OCCURRENCE_ROTATION_INVALID:${String(applied["transform"])}`,
    );
    requireProbe(
      undo["frameX"] === null &&
        undo["presentationFrame"] === false &&
        undo["textDecoration"] === null &&
        undo["letterSpacing"] === null &&
        undo["wordSpacing"] === null &&
        undo["paragraphSpacing"] === null &&
        undo["firstLineX"] === "114750",
      `TEXT_OCCURRENCE_LAYOUT_UNDO_INVALID:${JSON.stringify(undo)}`,
    );
    requireProbe(
      redo["frameX"] === "125000" &&
        redo["horizontalAlignment"] === "center" &&
        redo["textDecoration"] === "underline" &&
        redo["letterSpacing"] === "250" &&
        redo["wordSpacing"] === "500" &&
        redo["paragraphSpacing"] === "2000" &&
        redo["presentationFrameFill"] === "#fff4cc" &&
        redo["presentationFrameStroke"] === "#b42318" &&
        redo["presentationFrameStrokeWidth"] === "750" &&
        redo["presentationFrameTransform"] === "rotate(5 200000 304338)" &&
        redo["locked"] === "true" &&
        redo["transform"] === "rotate(5 200000 304338)",
      `TEXT_OCCURRENCE_LAYOUT_REDO_INVALID:${JSON.stringify(redo)}`,
    );
    requireProbe(
      before["fontSize"] === "5500" &&
        before["fontWeight"] === "400" &&
        before["scope"] === "occurrence" &&
        before["contextHidden"] === true &&
        applied["workingRevision"] === (before["workingRevision"] as number) + 1 &&
        applied["fontSize"] === "9000" &&
        applied["fontWeight"] === "700" &&
        applied["fill"] === "#b42318" &&
        (applied["provenance"] as string).includes("Effective override") &&
        applied["documentState"] === "Unsaved changes" &&
        (applied["indicator"] as string).includes("Has overrides") &&
        applied["sceneInputDigest"] !== before["sceneInputDigest"] &&
        undo["fontSize"] === "5500" &&
        undo["fontWeight"] === "400" &&
        redo["fontSize"] === "9000" &&
        redo["fontWeight"] === "700" &&
        redo["textDecoration"] === "underline" &&
        redo["fill"] === "#b42318" &&
        redo["sceneInputDigest"] !== before["sceneInputDigest"],
      "TEXT_OCCURRENCE_STYLE_HISTORY_INVALID",
    );
    await press(window, "#detach-text-annotation", "Space", "FOCUS_TEXT_OCCURRENCE_DETACH");
    await waitFor(
      window,
      `document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("data-position-mode") === "free" && document.getElementById("text-position-mode")?.value === "free" && document.getElementById("text-frame-y")?.readOnly === false && document.getElementById("detach-text-annotation")?.disabled === true`,
      "WAIT_TEXT_OCCURRENCE_DETACH",
    );
    const detached = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); const node = document.getElementById("node:lithology:stratum-01:transition:2:text"); return { workingRevision: value.accepted ? value.projection.workingRevision : null, positionMode: node?.getAttribute("data-position-mode"), frameY: node?.getAttribute("data-frame-y-mpt"), anchorY: document.getElementById("text-frame-y")?.value, yReadOnly: document.getElementById("text-frame-y")?.readOnly, detachDisabled: document.getElementById("detach-text-annotation")?.disabled }; })()`,
      ),
    );
    await typeText(window, "#text-frame-y", "325.338");
    await press(window, "#apply-text-style", "Space", "FOCUS_TEXT_OCCURRENCE_FREE_Y_APPLY");
    await waitFor(
      window,
      `document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("data-position-mode") === "free" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("data-frame-y-mpt") === "303338"`,
      "WAIT_TEXT_OCCURRENCE_FREE_Y_APPLY",
    );
    const freeMoved = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); const node = document.getElementById("node:lithology:stratum-01:transition:2:text"); return { workingRevision: value.accepted ? value.projection.workingRevision : null, positionMode: node?.getAttribute("data-position-mode"), frameY: node?.getAttribute("data-frame-y-mpt"), anchorY: document.getElementById("text-frame-y")?.value }; })()`,
      ),
    );
    requireProbe(
      detached["workingRevision"] === (redo["workingRevision"] as number) + 1 &&
        detached["positionMode"] === "free" &&
        detached["frameY"] === "293338" &&
        detached["anchorY"] === "315.338" &&
        detached["yReadOnly"] === false &&
        detached["detachDisabled"] === true &&
        freeMoved["workingRevision"] === detached["workingRevision"] + 1 &&
        freeMoved["positionMode"] === "free" &&
        freeMoved["frameY"] === "303338" &&
        freeMoved["anchorY"] === "325.338",
      `TEXT_OCCURRENCE_DETACH_INVALID:${JSON.stringify({ detached, freeMoved })}`,
    );
    await press(window, "#reset-text-presentation", "Space", "FOCUS_TEXT_OCCURRENCE_RESET");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent?.startsWith("Presentation reset to inherited for node:lithology:stratum-01:transition:2:text at revision ") === true && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("font-size") === "5500" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.hasAttribute("data-frame-x-mpt") === false && document.getElementById("text-style-inheritance")?.textContent === "Inherited" && document.getElementById("text-layout-inheritance")?.textContent === "Inherited" && document.getElementById("reset-text-presentation")?.disabled === true`,
      "WAIT_TEXT_OCCURRENCE_RESET",
    );
    const reset = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); const node = document.getElementById("node:lithology:stratum-01:transition:2:text"); const state = value.accepted ? value.projection.textOccurrencePresentationStates.find((candidate) => candidate.occurrenceNodeId === "node:lithology:stratum-01:transition:2:text") : null; return { workingRevision: value.accepted ? value.projection.workingRevision : null, sceneInputDigest: value.accepted ? value.projection.scene.inputDigest : null, fontSize: node?.getAttribute("font-size"), frameX: node?.getAttribute("data-frame-x-mpt"), styleInheritance: state?.typography, layoutInheritance: state?.layout, resetDisabled: document.getElementById("reset-text-presentation")?.disabled }; })()`,
      ),
    );
    await press(window, "#undo", "Space", "FOCUS_TEXT_OCCURRENCE_RESET_UNDO");
    await waitFor(
      window,
      `document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("font-size") === "9000" && document.getElementById("text-style-inheritance")?.textContent === "This occurrence" && document.getElementById("text-layout-inheritance")?.textContent === "This occurrence"`,
      "WAIT_TEXT_OCCURRENCE_RESET_UNDO",
    );
    const resetUndo = record(
      await pageValue(
        window,
        `(() => { const node = document.getElementById("node:lithology:stratum-01:transition:2:text"); return { fontSize: node?.getAttribute("font-size"), frameX: node?.getAttribute("data-frame-x-mpt"), frameY: node?.getAttribute("data-frame-y-mpt"), positionMode: node?.getAttribute("data-position-mode"), resetDisabled: document.getElementById("reset-text-presentation")?.disabled }; })()`,
      ),
    );
    await press(window, "#redo", "Space", "FOCUS_TEXT_OCCURRENCE_RESET_REDO");
    await waitFor(
      window,
      `document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("font-size") === "5500" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.hasAttribute("data-frame-x-mpt") === false && document.getElementById("text-style-inheritance")?.textContent === "Inherited" && document.getElementById("text-layout-inheritance")?.textContent === "Inherited"`,
      "WAIT_TEXT_OCCURRENCE_RESET_REDO",
    );
    const resetRedo = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); const node = document.getElementById("node:lithology:stratum-01:transition:2:text"); return { workingRevision: value.accepted ? value.projection.workingRevision : null, fontSize: node?.getAttribute("font-size"), frameX: node?.getAttribute("data-frame-x-mpt"), resetDisabled: document.getElementById("reset-text-presentation")?.disabled }; })()`,
      ),
    );
    requireProbe(
      reset["workingRevision"] === freeMoved["workingRevision"] + 1 &&
        reset["fontSize"] === "5500" &&
        reset["frameX"] === null &&
        reset["styleInheritance"] === "inherited" &&
        reset["layoutInheritance"] === "inherited" &&
        reset["resetDisabled"] === true &&
        resetUndo["fontSize"] === "9000" &&
        resetUndo["frameX"] === "125000" &&
        resetUndo["frameY"] === "303338" &&
        resetUndo["positionMode"] === "free" &&
        resetUndo["resetDisabled"] === false &&
        resetRedo["fontSize"] === "5500" &&
        resetRedo["frameX"] === null &&
        resetRedo["resetDisabled"] === true,
      `TEXT_OCCURRENCE_RESET_HISTORY_INVALID:${JSON.stringify({ reset, resetUndo, resetRedo })}`,
    );
    await typeText(window, "#text-font-size", "12");
    await typeText(window, "#text-line-height", "14");
    await typeText(window, "#text-frame-width", "80");
    await typeText(window, "#text-frame-height", "20");
    requireProbe(
      (await pageValue(
        window,
        `(() => { const overflow = document.getElementById("text-overflow-policy"); const wrap = document.getElementById("text-wrap-policy"); if (!(overflow instanceof HTMLSelectElement) || !(wrap instanceof HTMLSelectElement)) return false; overflow.value = "shrink-to-minimum"; overflow.dispatchEvent(new Event("change", { bubbles: true })); wrap.value = "word-v1"; wrap.dispatchEvent(new Event("change", { bubbles: true })); return document.getElementById("text-minimum-font-size")?.disabled === false; })()`,
      )) === true,
      "TEXT_OCCURRENCE_FIT_CONTROLS_INVALID",
    );
    await typeText(window, "#text-minimum-font-size", "6");
    await press(window, "#apply-text-style", "Space", "FOCUS_TEXT_OCCURRENCE_FIT_APPLY");
    await waitFor(
      window,
      `(() => { const node = document.getElementById("node:lithology:stratum-01:transition:2:text"); const effective = Number(node?.getAttribute("data-effective-font-size-mpt")); return node?.getAttribute("data-overflow-policy") === "shrink-to-minimum" && node?.getAttribute("data-minimum-font-size-mpt") === "6000" && node?.getAttribute("data-authored-font-size-mpt") === "12000" && node?.getAttribute("data-overflow") === "none" && effective >= 6000 && effective < 12000; })()`,
      "WAIT_TEXT_OCCURRENCE_FIT_APPLY",
    );
    const fitted = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); const node = document.getElementById("node:lithology:stratum-01:transition:2:text"); return { workingRevision: value.accepted ? value.projection.workingRevision : null, authoredFontSize: node?.getAttribute("data-authored-font-size-mpt"), effectiveFontSize: node?.getAttribute("data-effective-font-size-mpt"), paintedFontSize: node?.getAttribute("font-size"), overflowPolicy: node?.getAttribute("data-overflow-policy"), minimumFontSize: node?.getAttribute("data-minimum-font-size-mpt"), overflow: node?.getAttribute("data-overflow"), help: document.getElementById("text-style-help")?.textContent }; })()`,
      ),
    );
    requireProbe(
      fitted["workingRevision"] === (resetRedo["workingRevision"] as number) + 1 &&
        fitted["authoredFontSize"] === "12000" &&
        fitted["paintedFontSize"] === fitted["effectiveFontSize"] &&
        Number(fitted["effectiveFontSize"]) >= 6_000 &&
        Number(fitted["effectiveFontSize"]) < 12_000 &&
        fitted["overflowPolicy"] === "shrink-to-minimum" &&
        fitted["minimumFontSize"] === "6000" &&
        fitted["overflow"] === "none" &&
        (fitted["help"] as string).includes("effective"),
      `TEXT_OCCURRENCE_FIT_INVALID:${JSON.stringify(fitted)}`,
    );
    await press(window, "#undo", "Space", "FOCUS_TEXT_OCCURRENCE_FIT_UNDO");
    await waitFor(
      window,
      `document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("font-size") === "5500" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.hasAttribute("data-overflow-policy") === false`,
      "WAIT_TEXT_OCCURRENCE_FIT_UNDO",
    );
    const fitUndo = record(
      await pageValue(
        window,
        `(() => { const node = document.getElementById("node:lithology:stratum-01:transition:2:text"); return { fontSize: node?.getAttribute("font-size"), overflowPolicy: node?.getAttribute("data-overflow-policy"), styleInheritance: document.getElementById("text-style-inheritance")?.textContent, layoutInheritance: document.getElementById("text-layout-inheritance")?.textContent }; })()`,
      ),
    );
    requireProbe(
      fitUndo["fontSize"] === "5500" &&
        fitUndo["overflowPolicy"] === null &&
        fitUndo["styleInheritance"] === "Inherited" &&
        fitUndo["layoutInheritance"] === "Inherited",
      `TEXT_OCCURRENCE_FIT_UNDO_INVALID:${JSON.stringify(fitUndo)}`,
    );
    requireProbe(
      (await pageValue(
        window,
        `(() => { const scope = document.getElementById("text-style-scope"); const color = document.getElementById("text-color"); const decoration = document.getElementById("text-decoration"); if (!(scope instanceof HTMLSelectElement) || !(color instanceof HTMLInputElement) || !(decoration instanceof HTMLSelectElement)) return false; scope.value = "named-style"; scope.dispatchEvent(new Event("change", { bubbles: true })); color.value = "#1d4ed8"; color.dispatchEvent(new Event("input", { bubbles: true })); decoration.value = "underline"; decoration.dispatchEvent(new Event("change", { bubbles: true })); return scope.value === "named-style" && document.getElementById("text-named-style-scope")?.disabled === false; })()`,
      )) === true,
      "TEXT_NAMED_STYLE_SCOPE_INVALID",
    );
    await press(window, "#apply-text-style", "Space", "FOCUS_TEXT_NAMED_STYLE_APPLY");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent?.startsWith("Named style style-small typography updated at revision ") === true && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill") === "#1d4ed8" && document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("fill") === "#1d4ed8" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("text-decoration") === "underline"`,
      "WAIT_TEXT_NAMED_STYLE_APPLY",
    );
    const namedStyleApplied = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); const target = value.accepted ? value.projection.scene.pages[0]?.nodes.find((node) => node.id === "node:lithology:stratum-01:transition:2:text") : null; const peer = value.accepted ? value.projection.scene.pages[0]?.nodes.find((node) => node.id === "node:lithology:stratum-01:transition:1:text") : null; const state = value.accepted ? value.projection.textOccurrencePresentationStates.find((candidate) => candidate.occurrenceNodeId === "node:lithology:stratum-01:transition:2:text") : null; return { workingRevision: value.accepted ? value.projection.workingRevision : null, targetFontSize: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("font-size"), peerFontSize: document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("font-size"), targetFill: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill"), peerFill: document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("fill"), targetDecoration: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("text-decoration"), targetStyleId: target?.styleId, peerStyleId: peer?.styleId, targetFrame: target?.frame, peerFrame: peer?.frame, typographyInheritance: state?.typography, layoutInheritance: state?.layout }; })()`,
      ),
    );
    await press(window, "#undo", "Space", "FOCUS_TEXT_NAMED_STYLE_UNDO");
    await waitFor(
      window,
      `document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill") === "#17202a" && document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("fill") === "#17202a"`,
      "WAIT_TEXT_NAMED_STYLE_UNDO",
    );
    const namedStyleUndo = record(
      await pageValue(
        window,
        `(() => ({ targetFontSize: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("font-size"), peerFontSize: document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("font-size"), targetFill: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill"), peerFill: document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("fill"), targetDecoration: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("text-decoration") }))()`,
      ),
    );
    await press(window, "#redo", "Space", "FOCUS_TEXT_NAMED_STYLE_REDO");
    await waitFor(
      window,
      `document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill") === "#1d4ed8" && document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("fill") === "#1d4ed8" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("text-decoration") === "underline"`,
      "WAIT_TEXT_NAMED_STYLE_REDO",
    );
    const namedStyleRedo = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); return { workingRevision: value.accepted ? value.projection.workingRevision : null, targetFontSize: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("font-size"), peerFontSize: document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("font-size"), targetFill: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill"), peerFill: document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("fill"), targetDecoration: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("text-decoration") }; })()`,
      ),
    );
    requireProbe(
      namedStyleApplied["workingRevision"] === (resetRedo["workingRevision"] as number) + 3 &&
        namedStyleApplied["targetFontSize"] === "5500" &&
        namedStyleApplied["peerFontSize"] === "5500" &&
        namedStyleApplied["targetFill"] === "#1d4ed8" &&
        namedStyleApplied["peerFill"] === "#1d4ed8" &&
        namedStyleApplied["targetDecoration"] === "underline" &&
        namedStyleApplied["targetStyleId"] === "style-small" &&
        namedStyleApplied["peerStyleId"] === "style-small" &&
        namedStyleApplied["typographyInheritance"] === "inherited" &&
        namedStyleApplied["layoutInheritance"] === "inherited" &&
        namedStyleUndo["targetFontSize"] === "5500" &&
        namedStyleUndo["peerFontSize"] === "5500" &&
        namedStyleUndo["targetFill"] === "#17202a" &&
        namedStyleUndo["peerFill"] === "#17202a" &&
        namedStyleUndo["targetDecoration"] === null &&
        namedStyleRedo["workingRevision"] === namedStyleApplied["workingRevision"] + 2 &&
        namedStyleRedo["targetFontSize"] === "5500" &&
        namedStyleRedo["peerFontSize"] === "5500" &&
        namedStyleRedo["targetFill"] === "#1d4ed8" &&
        namedStyleRedo["peerFill"] === "#1d4ed8" &&
        namedStyleRedo["targetDecoration"] === "underline",
      `TEXT_NAMED_STYLE_HISTORY_INVALID:${JSON.stringify({ namedStyleApplied, namedStyleUndo, namedStyleRedo })}`,
    );
    requireProbe(
      (await pageValue(
        window,
        `(() => { const target = document.getElementById("node:lithology:stratum-01:transition:2:text"); if (!(target instanceof SVGElement)) return false; target.dispatchEvent(new MouseEvent("click", { bubbles: true })); const peer = document.getElementById("node:lithology:stratum-01:transition:1:text"); if (!(peer instanceof SVGElement)) return false; peer.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true })); const scope = document.getElementById("text-style-scope"); const color = document.getElementById("text-color"); const decoration = document.getElementById("text-decoration"); if (!(scope instanceof HTMLSelectElement) || !(color instanceof HTMLInputElement) || !(decoration instanceof HTMLSelectElement)) return false; scope.value = "all-selected"; scope.dispatchEvent(new Event("change", { bubbles: true })); color.value = "#c2410c"; color.dispatchEvent(new Event("input", { bubbles: true })); decoration.value = "none"; decoration.dispatchEvent(new Event("change", { bubbles: true })); return scope.value === "all-selected" && document.getElementById("text-all-selected-scope")?.disabled === false && document.querySelectorAll("#svg-page .scene-node.is-selected").length === 2; })()`,
      )) === true,
      "TEXT_ALL_SELECTED_SCOPE_INVALID",
    );
    await press(window, "#apply-text-style", "Space", "FOCUS_TEXT_ALL_SELECTED_APPLY");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent?.startsWith("Typography applied to 2 selected occurrences at revision ") === true && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill") === "#c2410c" && document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("fill") === "#c2410c"`,
      "WAIT_TEXT_ALL_SELECTED_APPLY",
    );
    const allSelectedApplied = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); const target = value.accepted ? value.projection.scene.pages[0]?.nodes.find((node) => node.id === "node:lithology:stratum-01:transition:2:text") : null; const peer = value.accepted ? value.projection.scene.pages[0]?.nodes.find((node) => node.id === "node:lithology:stratum-01:transition:1:text") : null; const targetState = value.accepted ? value.projection.textOccurrencePresentationStates.find((candidate) => candidate.occurrenceNodeId === target?.id) : null; const peerState = value.accepted ? value.projection.textOccurrencePresentationStates.find((candidate) => candidate.occurrenceNodeId === peer?.id) : null; return { workingRevision: value.accepted ? value.projection.workingRevision : null, targetFill: document.getElementById(target?.id ?? "")?.getAttribute("fill"), peerFill: document.getElementById(peer?.id ?? "")?.getAttribute("fill"), targetDecoration: document.getElementById(target?.id ?? "")?.getAttribute("text-decoration"), peerDecoration: document.getElementById(peer?.id ?? "")?.getAttribute("text-decoration"), targetStyleId: target?.styleId, peerStyleId: peer?.styleId, targetFrame: target?.frame, peerFrame: peer?.frame, targetTypography: targetState?.typography, peerTypography: peerState?.typography, targetLayout: targetState?.layout, peerLayout: peerState?.layout, selectedCount: document.querySelectorAll("#svg-page .scene-node.is-selected").length }; })()`,
      ),
    );
    await press(window, "#undo", "Space", "FOCUS_TEXT_ALL_SELECTED_UNDO");
    await waitFor(
      window,
      `document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill") === "#1d4ed8" && document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("fill") === "#1d4ed8"`,
      "WAIT_TEXT_ALL_SELECTED_UNDO",
    );
    const allSelectedUndo = record(
      await pageValue(
        window,
        `(() => ({ targetFill: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill"), peerFill: document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("fill"), targetDecoration: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("text-decoration"), peerDecoration: document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("text-decoration") }))()`,
      ),
    );
    await press(window, "#redo", "Space", "FOCUS_TEXT_ALL_SELECTED_REDO");
    await waitFor(
      window,
      `document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill") === "#c2410c" && document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("fill") === "#c2410c"`,
      "WAIT_TEXT_ALL_SELECTED_REDO",
    );
    const allSelectedRedo = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); return { workingRevision: value.accepted ? value.projection.workingRevision : null, targetFill: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill"), peerFill: document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("fill"), targetDecoration: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("text-decoration"), peerDecoration: document.getElementById("node:lithology:stratum-01:transition:1:text")?.getAttribute("text-decoration") }; })()`,
      ),
    );
    requireProbe(
      allSelectedApplied["workingRevision"] === namedStyleRedo["workingRevision"] + 1 &&
        allSelectedApplied["targetFill"] === "#c2410c" &&
        allSelectedApplied["peerFill"] === "#c2410c" &&
        allSelectedApplied["targetDecoration"] === null &&
        allSelectedApplied["peerDecoration"] === null &&
        (allSelectedApplied["targetStyleId"] as string).startsWith("style-occurrence-") &&
        (allSelectedApplied["peerStyleId"] as string).startsWith("style-occurrence-") &&
        allSelectedApplied["targetTypography"] === "occurrence" &&
        allSelectedApplied["peerTypography"] === "occurrence" &&
        allSelectedApplied["targetLayout"] === "inherited" &&
        allSelectedApplied["peerLayout"] === "inherited" &&
        allSelectedApplied["selectedCount"] === 2 &&
        JSON.stringify(allSelectedApplied["targetFrame"]) ===
          JSON.stringify(namedStyleApplied["targetFrame"]) &&
        JSON.stringify(allSelectedApplied["peerFrame"]) ===
          JSON.stringify(namedStyleApplied["peerFrame"]) &&
        allSelectedUndo["targetFill"] === "#1d4ed8" &&
        allSelectedUndo["peerFill"] === "#1d4ed8" &&
        allSelectedUndo["targetDecoration"] === "underline" &&
        allSelectedUndo["peerDecoration"] === "underline" &&
        allSelectedRedo["workingRevision"] === allSelectedApplied["workingRevision"] + 2 &&
        allSelectedRedo["targetFill"] === "#c2410c" &&
        allSelectedRedo["peerFill"] === "#c2410c" &&
        allSelectedRedo["targetDecoration"] === null &&
        allSelectedRedo["peerDecoration"] === null,
      `TEXT_ALL_SELECTED_HISTORY_INVALID:${JSON.stringify({ allSelectedApplied, allSelectedUndo, allSelectedRedo })}`,
    );
    emitStudioProbePhase("all-selected-complete");
    requireProbe(
      (await pageValue(
        window,
        `(() => { const candidate = document.getElementById("node:lithology:stratum-02:transition:1:text"); if (!(candidate instanceof SVGElement)) return false; candidate.dispatchEvent(new MouseEvent("click", { bubbles: true })); const scope = document.getElementById("text-style-scope"); const color = document.getElementById("text-color"); const decoration = document.getElementById("text-decoration"); if (!(scope instanceof HTMLSelectElement) || !(color instanceof HTMLInputElement) || !(decoration instanceof HTMLSelectElement)) return false; scope.value = "column-default"; scope.dispatchEvent(new Event("change", { bubbles: true })); color.value = "#047857"; color.dispatchEvent(new Event("input", { bubbles: true })); decoration.value = "none"; decoration.dispatchEvent(new Event("change", { bubbles: true })); return scope.value === "column-default" && document.getElementById("text-column-default-scope")?.disabled === false; })()`,
      )) === true,
      "TEXT_COLUMN_STYLE_SCOPE_INVALID",
    );
    const columnStyleBefore = record(
      await pageValue(
        window,
        `(() => { const candidate = document.getElementById("node:lithology:stratum-02:transition:1:text"); return { frame: { x: candidate?.getAttribute("x"), y: candidate?.getAttribute("y"), width: candidate?.getAttribute("width"), height: candidate?.getAttribute("height") }, fill: candidate?.getAttribute("fill"), decoration: candidate?.getAttribute("text-decoration") }; })()`,
      ),
    );
    await press(window, "#apply-text-style", "Space", "FOCUS_TEXT_COLUMN_STYLE_APPLY");
    emitStudioProbePhase("column-apply-pressed");
    await waitFor(
      window,
      `document.getElementById("editor-status")?.textContent?.startsWith("column-description typography default updated at revision ") === true && document.getElementById("node:lithology:stratum-02:transition:1:text")?.getAttribute("fill") === "#047857" && document.getElementById("node:lithology:stratum-03:transition:1:text")?.getAttribute("fill") === "#047857" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill") === "#c2410c"`,
      "WAIT_TEXT_COLUMN_STYLE_APPLY",
    );
    const columnStyleApplied = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); const candidate = value.accepted ? value.projection.scene.pages[0]?.nodes.find((node) => node.id === "node:lithology:stratum-02:transition:1:text") : null; const inheritedPeer = value.accepted ? value.projection.scene.pages[0]?.nodes.find((node) => node.id === "node:lithology:stratum-03:transition:1:text") : null; const overridden = value.accepted ? value.projection.scene.pages[0]?.nodes.find((node) => node.id === "node:lithology:stratum-01:transition:2:text") : null; const state = value.accepted ? value.projection.textOccurrencePresentationStates.find((candidateState) => candidateState.occurrenceNodeId === candidate?.id) : null; const element = document.getElementById(candidate?.id ?? ""); return { workingRevision: value.accepted ? value.projection.workingRevision : null, candidateFill: element?.getAttribute("fill"), peerFill: document.getElementById(inheritedPeer?.id ?? "")?.getAttribute("fill"), overriddenFill: document.getElementById(overridden?.id ?? "")?.getAttribute("fill"), candidateDecoration: element?.getAttribute("text-decoration"), candidateStyleId: candidate?.styleId, peerStyleId: inheritedPeer?.styleId, overriddenStyleId: overridden?.styleId, candidateFrame: { x: element?.getAttribute("x"), y: element?.getAttribute("y"), width: element?.getAttribute("width"), height: element?.getAttribute("height") }, typographyInheritance: state?.typography, layoutInheritance: state?.layout }; })()`,
      ),
    );
    emitStudioProbePhase("column-apply-observed");
    await press(window, "#undo", "Space", "FOCUS_TEXT_COLUMN_STYLE_UNDO");
    await waitFor(
      window,
      `document.getElementById("node:lithology:stratum-02:transition:1:text")?.getAttribute("fill") === "#1d4ed8" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill") === "#c2410c"`,
      "WAIT_TEXT_COLUMN_STYLE_UNDO",
    );
    const columnStyleUndo = record(
      await pageValue(
        window,
        `(() => ({ candidateFill: document.getElementById("node:lithology:stratum-02:transition:1:text")?.getAttribute("fill"), peerFill: document.getElementById("node:lithology:stratum-03:transition:1:text")?.getAttribute("fill"), overriddenFill: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill"), candidateDecoration: document.getElementById("node:lithology:stratum-02:transition:1:text")?.getAttribute("text-decoration") }))()`,
      ),
    );
    emitStudioProbePhase("column-undo-observed");
    await press(window, "#redo", "Space", "FOCUS_TEXT_COLUMN_STYLE_REDO");
    await waitFor(
      window,
      `document.getElementById("node:lithology:stratum-02:transition:1:text")?.getAttribute("fill") === "#047857" && document.getElementById("node:lithology:stratum-03:transition:1:text")?.getAttribute("fill") === "#047857" && document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill") === "#c2410c"`,
      "WAIT_TEXT_COLUMN_STYLE_REDO",
    );
    const columnStyleRedo = record(
      await pageValue(
        window,
        `(async () => { const value = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null }); return { workingRevision: value.accepted ? value.projection.workingRevision : null, candidateFill: document.getElementById("node:lithology:stratum-02:transition:1:text")?.getAttribute("fill"), peerFill: document.getElementById("node:lithology:stratum-03:transition:1:text")?.getAttribute("fill"), overriddenFill: document.getElementById("node:lithology:stratum-01:transition:2:text")?.getAttribute("fill"), candidateDecoration: document.getElementById("node:lithology:stratum-02:transition:1:text")?.getAttribute("text-decoration") }; })()`,
      ),
    );
    emitStudioProbePhase("column-redo-observed");
    requireProbe(
      columnStyleApplied["workingRevision"] === allSelectedRedo["workingRevision"] + 1 &&
        columnStyleApplied["candidateFill"] === "#047857" &&
        columnStyleApplied["peerFill"] === "#047857" &&
        columnStyleApplied["overriddenFill"] === "#c2410c" &&
        columnStyleApplied["candidateDecoration"] === null &&
        (columnStyleApplied["candidateStyleId"] as string).startsWith("style-column-") &&
        columnStyleApplied["peerStyleId"] === columnStyleApplied["candidateStyleId"] &&
        (columnStyleApplied["overriddenStyleId"] as string).startsWith("style-occurrence-") &&
        columnStyleApplied["typographyInheritance"] === "inherited" &&
        columnStyleApplied["layoutInheritance"] === "inherited" &&
        JSON.stringify(columnStyleApplied["candidateFrame"]) ===
          JSON.stringify(columnStyleBefore["frame"]) &&
        columnStyleUndo["candidateFill"] === "#1d4ed8" &&
        columnStyleUndo["peerFill"] === "#1d4ed8" &&
        columnStyleUndo["overriddenFill"] === "#c2410c" &&
        columnStyleUndo["candidateDecoration"] === "underline" &&
        columnStyleRedo["workingRevision"] === columnStyleApplied["workingRevision"] + 2 &&
        columnStyleRedo["candidateFill"] === "#047857" &&
        columnStyleRedo["peerFill"] === "#047857" &&
        columnStyleRedo["overriddenFill"] === "#c2410c" &&
        columnStyleRedo["candidateDecoration"] === null,
      `TEXT_COLUMN_STYLE_HISTORY_INVALID:${JSON.stringify({ columnStyleBefore, columnStyleApplied, columnStyleUndo, columnStyleRedo })}`,
    );
    requireProbe(
      (await pageValue(
        window,
        `(() => { const tab = document.querySelector('[data-ribbon-tab="publish"]'); if (!(tab instanceof HTMLButtonElement)) return false; tab.click(); return document.querySelector('[data-ribbon-panel="publish"]')?.hidden === false; })()`,
      )) === true,
      "TEXT_OCCURRENCE_PUBLICATION_TAB_INVALID",
    );
    emitStudioProbePhase("publication-starting");
    await press(window, "#export-pdf", "Space", "FOCUS_TEXT_OCCURRENCE_EXPORT");
    await waitFor(
      window,
      `document.getElementById("export-pdf")?.dataset.result === "EXPORT_VERIFIED_SUCCESS" && document.getElementById("editor-status")?.textContent?.startsWith("PDF exported and reopened successfully:") === true`,
      "WAIT_TEXT_OCCURRENCE_EXPORT",
    );
    publication = record(
      await pageValue(
        window,
        `(() => { const button = document.getElementById("export-pdf"); return { result: button?.dataset.result, destinationPath: button?.dataset.destinationPath, pdfDigest: button?.dataset.pdfDigest, sceneDigest: button?.dataset.sceneDigest, projectionDigest: button?.dataset.projectionDigest, pdfBytes: Number(button?.dataset.pdfBytes), activeBoringLogIdentity: document.body.dataset.activeBoringLogIdentity, activeId: document.activeElement?.id }; })()`,
      ),
    );
    textOccurrenceStyle = Object.freeze({
      before,
      applied,
      undo,
      redo,
      detached,
      freeMoved,
      reset,
      resetUndo,
      resetRedo,
      fitted,
      fitUndo,
      namedStyleApplied,
      namedStyleUndo,
      namedStyleRedo,
      allSelectedApplied,
      allSelectedUndo,
      allSelectedRedo,
      columnStyleBefore,
      columnStyleApplied,
      columnStyleUndo,
      columnStyleRedo,
    });
    requireProbe(
      (await pageValue(
        window,
        `(() => { const node = document.querySelector('#svg-page [data-semantic-id="column-description"]'); if (!(node instanceof SVGElement)) return false; node.dispatchEvent(new MouseEvent("click", { bubbles: true })); return true; })()`,
      )) === true,
      "RESTORE_DESCRIPTION_COLUMN_AFTER_TEXT_STYLE",
    );
    await waitFor(
      window,
      `document.getElementById("property-semantic-id")?.textContent === "column-description"`,
      "WAIT_DESCRIPTION_COLUMN_AFTER_TEXT_STYLE",
    );
  }
  let persistence: DataRecord | null = null;
  if (lifecycleProbeMode) {
    await pageValue(window, `document.getElementById("ribbon-tab-home")?.click(); true`);
    await typeText(window, "#property-content", "192000");
    await press(window, "#apply-property", "Space", "FOCUS_PROJECT_PERSISTED_EDIT");
    await waitFor(
      window,
      `document.getElementById("property-effective-value")?.textContent === "192000" && document.getElementById("document-state")?.textContent === "Unsaved changes"`,
      "WAIT_PROJECT_PERSISTED_EDIT",
    );
    await press(window, "#save-project-as", "Space", "FOCUS_PROJECT_SAVE_AS");
    await waitFor(
      window,
      `document.body.dataset.authoritativeFileBound === "true" && document.getElementById("editor-status")?.textContent?.startsWith("Project saved and reopened successfully:") === true`,
      "WAIT_PROJECT_SAVE_AS",
    );
    persistence = record(
      await pageValue(
        window,
        `(async () => {
          const before = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: null });
          if (!before.accepted) return { accepted: false, code: before.code };
          const saved = await globalThis.rsrenderStudio.lifecycle({ operation: "save-project", expectedWorkingRevision: before.projection.workingRevision });
          const after = await globalThis.rsrenderStudio.getProjection({ minimumWorkingRevision: before.projection.workingRevision });
          return { saved, after: after.accepted ? { accepted: true, dirty: after.projection.dirty, workingRevision: after.projection.workingRevision, durableRevision: after.projection.durableRevision } : after, bodyBound: document.body.dataset.authoritativeFileBound, documentName: document.getElementById("document-name")?.textContent, status: document.getElementById("editor-status")?.textContent };
        })()`,
      ),
    );
    const saved = record(persistence["saved"]);
    const after = record(persistence["after"]);
    requireProbe(
      saved["accepted"] === true &&
        saved["code"] === "PROJECT_SAVE_VERIFIED" &&
        after["accepted"] === true &&
        after["dirty"] === false &&
        after["workingRevision"] === after["durableRevision"] &&
        persistence["bodyBound"] === "true" &&
        persistence["documentName"] === path.basename(path.resolve(lifecycleProbeOutput ?? "")),
      "PROJECT_LIFECYCLE_SAVE_INVALID",
    );
    const reopened = await openLogProjectFile(path.resolve(lifecycleProbeOutput ?? ""));
    requireProbe(
      reopened.accepted &&
        reopened.value.project.layoutJobs.some(
          ({ document }) =>
            document.identity.boringLogId === runtimeLayoutJob?.document.identity.boringLogId,
        ) &&
        reopened.value.project.presentationOverrideCollections.length === 1,
      "PROJECT_LIFECYCLE_REOPEN_INVALID",
    );
  }
  return Object.freeze({
    schema: textStyleProbeMode
      ? "rsrender.bld037.text-occurrence-style-probe.v1"
      : multiBoringProbeMode
        ? "rsrender.bld036.multi-boring-navigation-probe.v1"
        : lifecycleProbeMode
          ? "rsrender.bld035.log-project-lifecycle-probe.v1"
          : pdfProbeMode
            ? "rsrender.bld027.boring-log-pdf-probe.v1"
            : studioEditingMode
              ? "rsrender.bld026.boring-log-editor-probe.v1"
              : "rsrender.bld025.boring-log-studio-probe.v1",
    result: "PASS",
    electronVersion: process.versions.electron,
    rendererSha256: rendererVerification.accepted ? rendererVerification.sha256 : null,
    initial,
    selection,
    interactions: Object.freeze({ ...interactions, fitSmall, fitLarge, panScroll, validation }),
    editing,
    boringNavigation,
    textOccurrenceStyle,
    publication,
    persistence,
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
          ? textStyleProbeMode
            ? "rsrender.bld037.text-occurrence-style-probe.v1"
            : multiBoringProbeMode
              ? "rsrender.bld036.multi-boring-navigation-probe.v1"
              : lifecycleProbeMode
                ? "rsrender.bld035.log-project-lifecycle-probe.v1"
                : pdfProbeMode
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
  let openedRuntimeProject: OpenedLogProjectFile | null = null;
  if (typeof runtimeProjectInputPath === "string" && runtimeProjectInputPath.length > 0) {
    const opened = await openLogProjectFile(path.resolve(runtimeProjectInputPath));
    if (!opened.accepted || opened.value.readOnly) {
      return fail(opened.accepted ? "PROJECT_STORAGE_UNSUPPORTED" : opened.code);
    }
    openedRuntimeProject = opened.value;
    runtimeLayoutJob = opened.value.project.layoutJob;
    runtimeLayoutJobs = opened.value.project.layoutJobs;
  }
  if (
    globalThis.__RSRENDER_BORING_LOG_RUNTIME_INPUT_REQUIRED__ === true &&
    runtimeDocumentInput.mode !== "accepted"
  ) {
    return fail("BORING_LOG_RUNTIME_INPUT_UNAVAILABLE");
  }
  if (!preloadVerification.accepted) return fail("DOCUMENT_PRELOAD_UNAVAILABLE");
  if (!rendererVerification.accepted) return fail("SEMANTIC_EDITOR_RENDERER_UNAVAILABLE");
  if (runtimeDocumentInput.mode === "rejected") return fail("DOCUMENT_INPUT_UNAVAILABLE");
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
  if (studioEditingMode && runtimeLayoutJob === null) return fail("DOCUMENT_INPUT_UNAVAILABLE");
  const documentIdentity =
    openedRuntimeProject?.project.documentIdentity ??
    (runtimeLayoutJobs.length > 1
      ? EXAMPLE_PROJECT_DOCUMENT_IDENTITY
      : (runtimeLayoutJob?.document.identity.boringLogId ??
        "urn:rsrender:bld-021:document:semantic-editor-001"));
  let structuredSession:
    SyntheticBoringLogOverrideSession | SyntheticBoringLogProjectSession | null = null;
  let service;
  if (studioEditingMode) {
    const synthetic =
      runtimeLayoutJobs.length > 1
        ? openedRuntimeProject === null
          ? createSyntheticBoringLogProjectSession({
              projectDocumentIdentity: documentIdentity,
              ownerGeneration: 1,
              layoutJobs: runtimeLayoutJobs,
            })
          : createPersistedBoringLogProjectSession({
              projectDocumentIdentity: documentIdentity,
              ownerGeneration: 1,
              layoutJobs: runtimeLayoutJobs,
              projectAggregate: openedRuntimeProject.project.projectAggregate,
              presentationOverrideCollections:
                openedRuntimeProject.project.presentationOverrideCollections,
            })
        : openedRuntimeProject === null
          ? createSyntheticBoringLogOverrideSession({
              documentIdentity,
              ownerGeneration: 1,
              layoutJob: runtimeLayoutJob,
            })
          : createPersistedBoringLogOverrideSession({
              documentIdentity,
              ownerGeneration: 1,
              layoutJob: openedRuntimeProject.project.layoutJob,
              projectAggregate: openedRuntimeProject.project.projectAggregate,
              presentationOverrideCollections:
                openedRuntimeProject.project.presentationOverrideCollections,
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
    const projectDocuments = Object.freeze(
      "documents" in source
        ? [...source.documents]
        : [
            Object.freeze({
              boringLogIdentity: source.layoutJob.document.identity.boringLogId,
              explorationIdentity: source.layoutJob.document.identity.explorationId,
              displayName: source.layoutJob.document.metadata.documentTitle,
              ordinal: 1,
              warningCount: 0,
              layoutJob: source.layoutJob,
              bindings: source.bindings,
            }),
          ],
    );
    let activeDocumentIndex = 0;
    const activeDocument = () => projectDocuments[activeDocumentIndex]!;
    const retainedLayoutJobs = new Map<string, BoringLogLayoutJobInput>(
      projectDocuments.map(({ layoutJob }) => [
        `${layoutJob.document.identity.boringLogId}\u0000${sha256CanonicalJson(layoutJob.template)}`,
        layoutJob,
      ]),
    );
    const effectiveLayoutJob = (
      document: (typeof projectDocuments)[number],
      aggregate: NonNullable<
        Awaited<ReturnType<typeof captureOverrideRenderDatasetWorkingState>>
      >["project"]["aggregate"],
    ): BoringLogLayoutJobInput | null => {
      const membership = aggregate.logSet.memberships.find(
        ({ sourceExplorationIdentity }) =>
          sourceExplorationIdentity === document.explorationIdentity,
      );
      const assignment = aggregate.logSet.templateAssignments.find(
        ({ scope }) =>
          membership !== undefined &&
          scope.kind === "exploration" &&
          scope.targetIdentity === membership.membershipIdentity,
      );
      const representation = aggregate.logSet.embeddedTemplateRepresentations.find(
        ({ embeddedTemplateRepresentationIdentity }) =>
          embeddedTemplateRepresentationIdentity ===
          assignment?.embeddedTemplateRepresentationIdentity,
      );
      if (representation === undefined) return document.layoutJob;
      return (
        retainedLayoutJobs.get(
          `${document.boringLogIdentity}\u0000${representation.effectiveContentDigest}`,
        ) ?? null
      );
    };
    const currentLayoutJobs = (
      capture: NonNullable<Awaited<ReturnType<typeof captureOverrideRenderDatasetWorkingState>>>,
    ): readonly BoringLogLayoutJobInput[] | null => {
      const jobs = projectDocuments.map((document) =>
        effectiveLayoutJob(document, capture.project.aggregate),
      );
      return jobs.some((job) => job === null)
        ? null
        : Object.freeze(jobs as BoringLogLayoutJobInput[]);
    };
    let projectBinding: {
      authoritativePath: string | null;
      displayPath: string | null;
      baseline: LogProjectFileBaseline | null;
    } =
      openedRuntimeProject === null
        ? { authoritativePath: null, displayPath: null, baseline: null }
        : {
            authoritativePath: openedRuntimeProject.authoritativePath,
            displayPath: openedRuntimeProject.displayPath,
            baseline: openedRuntimeProject.baseline,
          };
    let studioQuerySequence = 0;
    const projectionCache = new Map<string, BoringLogStudioProjection>();
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
      const captured = await captureOverrideRenderDatasetWorkingState(source.service);
      const activeLayoutJob =
        captured === null ? null : effectiveLayoutJob(activeDocument(), captured.project.aggregate);
      if (activeLayoutJob === null) {
        return Object.freeze({
          accepted: false as const,
          code: "BORING_LOG_STUDIO_CONFIGURATION_INVALID" as const,
        });
      }
      const prepared = prepareBoringLogStudioProjection({
        layoutJob: activeLayoutJob,
        bindings: activeDocument().bindings,
        dataset: queried.result.projection,
      });
      if (!prepared.accepted) return prepared;
      const cacheKey = `${prepared.preparation.projection.workingRevision}:${sha256CanonicalJson(prepared.preparation.layout.textRequests)}`;
      const cached = projectionCache.get(cacheKey);
      if (cached !== undefined) {
        return Object.freeze({ accepted: true as const, projection: cached });
      }
      const measured = await measureBoringLogTextInChromium(
        prepared.preparation.layout.textRequests,
      );
      if (!measured.accepted) {
        if (probeMode) probeFailure = `STUDIO_MEASUREMENT:${measured.reason}`.slice(0, 256);
        return Object.freeze({
          accepted: false as const,
          code: "BORING_LOG_STUDIO_TEXT_REJECTED" as const,
        });
      }
      const completed = completeBoringLogStudioProjection(prepared.preparation, measured.results);
      if (!completed.accepted && probeMode) {
        probeFailure = `STUDIO_COMPLETION:${completed.code}`.slice(0, 256);
      }
      if (completed.accepted) {
        projectionCache.set(cacheKey, completed.projection);
        if (projectionCache.size > 8) {
          const oldest = projectionCache.keys().next().value;
          if (oldest !== undefined) projectionCache.delete(oldest);
        }
      }
      return completed;
    };
    const projectState = async () => {
      const queried = await hosted.session.getProjection(
        `urn:rsrender:bld-035:request:lifecycle-state:${Date.now()}`,
        { minimumWorkingRevision: null },
      );
      if (!queried.accepted || queried.result.kind !== "render-dataset.projection.result") {
        return null;
      }
      const captured = await captureOverrideRenderDatasetWorkingState(source.service);
      const overriddenFields = new Set<string>(
        captured?.presentationOverrideCollections.flatMap((collection) =>
          collection.items
            .filter(({ enabled }) => enabled)
            .map(({ targetSourceFieldIdentity }) => targetSourceFieldIdentity),
        ) ?? [],
      );
      const styledExplorations = new Set<string>();
      for (const assignment of captured?.project.aggregate.logSet.templateAssignments ?? []) {
        if (assignment.scope.kind !== "exploration") continue;
        const representation =
          captured?.project.aggregate.logSet.embeddedTemplateRepresentations.find(
            ({ embeddedTemplateRepresentationIdentity }) =>
              embeddedTemplateRepresentationIdentity ===
              assignment.embeddedTemplateRepresentationIdentity,
          );
        const membership = captured?.project.aggregate.logSet.memberships.find(
          ({ membershipIdentity }) => membershipIdentity === assignment.scope.targetIdentity,
        );
        if (representation?.origin.kind === "separate-template" && membership !== undefined) {
          styledExplorations.add(membership.sourceExplorationIdentity);
        }
      }
      return Object.freeze({
        documentIdentity,
        displayName:
          projectBinding.displayPath === null
            ? "Untitled Boring Log Project"
            : path.basename(projectBinding.displayPath),
        displayPath: projectBinding.displayPath,
        authoritativeFileBound: projectBinding.authoritativePath !== null,
        readOnly: false,
        storageStatus:
          projectBinding.authoritativePath === null ? "untargeted" : "supported-local-fixed-ntfs",
        workingRevision: queried.result.workingRevision,
        durableRevision: queried.result.durableRevision,
        dirty: queried.result.dirty,
        activeBoringLogIdentity: activeDocument().boringLogIdentity,
        activeExplorationIdentity: activeDocument().explorationIdentity,
        activeOrdinal: activeDocumentIndex + 1,
        boringLogs: Object.freeze(
          projectDocuments.map((document) =>
            Object.freeze({
              boringLogIdentity: document.boringLogIdentity,
              explorationIdentity: document.explorationIdentity,
              displayName: document.displayName,
              ordinal: document.ordinal,
              warningCount: document.warningCount,
              hasOverrides:
                styledExplorations.has(document.explorationIdentity) ||
                document.bindings.some(({ sourceFieldIdentity }) =>
                  overriddenFields.has(sourceFieldIdentity),
                ),
            }),
          ),
        ),
      });
    };
    const lifecycleResponse = (
      accepted: boolean,
      code: string,
      snapshot: Awaited<ReturnType<typeof projectState>> = null,
    ) => Object.freeze({ accepted, code, state: snapshot });
    const performProjectSave = async (
      expectedWorkingRevision: number | null,
      forceSaveAs: boolean,
    ) => {
      const captured = await captureOverrideRenderDatasetWorkingState(source.service);
      if (captured === null) {
        return lifecycleResponse(false, "PROJECT_STATE_UNAVAILABLE", await projectState());
      }
      if (
        expectedWorkingRevision !== null &&
        captured.project.workingRevision !== expectedWorkingRevision
      ) {
        return lifecycleResponse(false, "PROJECT_WORKING_REVISION_STALE", await projectState());
      }
      const saveLayoutJobs = currentLayoutJobs(captured);
      if (saveLayoutJobs === null) {
        return lifecycleResponse(false, "PROJECT_STATE_UNAVAILABLE", await projectState());
      }
      let target = forceSaveAs ? null : projectBinding.authoritativePath;
      if (target === null) {
        if (lifecycleProbeMode) {
          if (typeof lifecycleProbeOutput !== "string" || lifecycleProbeOutput.length === 0) {
            return lifecycleResponse(false, "PROJECT_PATH_INVALID", await projectState());
          }
          target = path.resolve(lifecycleProbeOutput);
        } else {
          const selected = await dialog.showSaveDialog(window, {
            title: forceSaveAs ? "Save Boring Log Project As" : "Save Boring Log Project",
            defaultPath: path.join(
              app.getPath("documents"),
              projectBinding.displayPath === null
                ? "Untitled Boring Log.rsrender"
                : path.basename(projectBinding.displayPath),
            ),
            buttonLabel: "Save Project",
            filters: [{ name: "RSrender Log Project", extensions: ["rsrender"] }],
            properties: ["createDirectory", "showOverwriteConfirmation"],
          });
          if (selected.canceled || selected.filePath.length === 0) {
            return lifecycleResponse(false, "PROJECT_SAVE_CANCELED", await projectState());
          }
          target = selected.filePath;
        }
      }
      const sameTarget = projectBinding.authoritativePath?.toLowerCase() === target.toLowerCase();
      const expectedBaseline = sameTarget
        ? projectBinding.baseline
        : captureLogProjectFileBaseline(target);
      const saved = await saveLogProjectFile({
        targetPath: target,
        expectedBaseline,
        replaceExisting: expectedBaseline !== null,
        ...(saveLayoutJobs.length > 1
          ? { layoutJobs: saveLayoutJobs }
          : { layoutJob: saveLayoutJobs[0]! }),
        projectAggregate: captured.project.aggregate,
        presentationOverrideCollections: captured.presentationOverrideCollections,
      });
      if (!saved.accepted) return lifecycleResponse(false, saved.code, await projectState());
      if (!(await markOverrideRenderDatasetDurable(source.service, captured.project))) {
        return lifecycleResponse(
          false,
          "PROJECT_SAVE_POST_REPLACEMENT_UNCERTAIN",
          await projectState(),
        );
      }
      projectBinding = {
        authoritativePath: path.resolve(target),
        displayPath: path.resolve(target),
        baseline: saved.value.baseline,
      };
      projectionCache.clear();
      return lifecycleResponse(true, "PROJECT_SAVE_VERIFIED", await projectState());
    };
    const handleLifecycle = async (input: {
      readonly operation: BoringLogStudioLifecycleOperation;
      readonly expectedWorkingRevision: number | null;
    }) => {
      const { operation, expectedWorkingRevision } = input;
      const current = await projectState();
      if (current === null) return lifecycleResponse(false, "PROJECT_STATE_UNAVAILABLE");
      if (operation === "get-state") {
        return lifecycleResponse(true, "PROJECT_STATE_READY", current);
      }
      if (
        operation === "first-boring" ||
        operation === "previous-boring" ||
        operation === "next-boring" ||
        operation === "last-boring"
      ) {
        if (
          expectedWorkingRevision !== null &&
          expectedWorkingRevision !== current.workingRevision
        ) {
          return lifecycleResponse(false, "PROJECT_WORKING_REVISION_STALE", current);
        }
        const nextIndex =
          operation === "first-boring"
            ? 0
            : operation === "last-boring"
              ? projectDocuments.length - 1
              : operation === "previous-boring"
                ? Math.max(0, activeDocumentIndex - 1)
                : Math.min(projectDocuments.length - 1, activeDocumentIndex + 1);
        activeDocumentIndex = nextIndex;
        projectionCache.clear();
        return lifecycleResponse(true, "PROJECT_BORING_CHANGED", await projectState());
      }
      if (operation === "save-project") {
        return performProjectSave(expectedWorkingRevision, false);
      }
      if (operation === "save-project-as") {
        return performProjectSave(expectedWorkingRevision, true);
      }

      if (current.dirty) {
        const choice = await dialog.showMessageBox(window, {
          type: "warning",
          title: "Unsaved Log Project changes",
          message:
            operation === "new-project"
              ? "Save changes before creating a new project?"
              : "Save changes before opening another project?",
          detail: "Unsaved project edits will be lost if you continue without saving.",
          buttons: ["Save", "Don't Save", "Cancel"],
          defaultId: 0,
          cancelId: 2,
          noLink: true,
        });
        if (choice.response === 2) {
          return lifecycleResponse(false, "PROJECT_REPLACE_CANCELED", current);
        }
        if (choice.response === 0) {
          const saved = await performProjectSave(expectedWorkingRevision, false);
          if (!saved.accepted) return saved;
        }
      }

      const baseArguments = process.argv
        .slice(1)
        .filter((argument) => !argument.startsWith(PROJECT_INPUT_ARGUMENT_PREFIX));
      if (operation === "new-project") {
        setTimeout(() => {
          app.relaunch({ args: baseArguments });
          app.exit(0);
        }, 150);
        return lifecycleResponse(true, "PROJECT_NEW_RESTARTING", current);
      }
      const selected = await dialog.showOpenDialog(window, {
        title: "Open Boring Log Project",
        buttonLabel: "Open Project",
        filters: [{ name: "RSrender Log Project", extensions: ["rsrender"] }],
        properties: ["openFile", "dontAddToRecent"],
      });
      if (selected.canceled || selected.filePaths.length !== 1) {
        return lifecycleResponse(false, "PROJECT_OPEN_CANCELED", current);
      }
      const opened = await openLogProjectFile(selected.filePaths[0]!);
      if (!opened.accepted || opened.value.readOnly) {
        return lifecycleResponse(
          false,
          opened.accepted ? "PROJECT_STORAGE_UNSUPPORTED" : opened.code,
          current,
        );
      }
      setTimeout(() => {
        app.relaunch({
          args: [...baseArguments, `${PROJECT_INPUT_ARGUMENT_PREFIX}${opened.value.displayPath}`],
        });
        app.exit(0);
      }, 150);
      return lifecycleResponse(true, "PROJECT_OPEN_RESTARTING", current);
    };
    let textStyleCommandSequence = 0;
    let textPresentationResetCommandSequence = 0;
    const handleTextOccurrenceStyle = async (input: BoringLogStudioTextOccurrenceStyleInput) => {
      const captured = await captureOverrideRenderDatasetWorkingState(source.service);
      if (captured === null) {
        return Object.freeze({ accepted: false, code: "PROJECT_STATE_UNAVAILABLE" });
      }
      if (captured.project.workingRevision !== input.expectedWorkingRevision) {
        return Object.freeze({ accepted: false, code: "PROJECT_WORKING_REVISION_STALE" });
      }
      const document = activeDocument();
      const currentJob = effectiveLayoutJob(document, captured.project.aggregate);
      const projected = await getStudioProjection(input.expectedWorkingRevision);
      if (currentJob === null || !projected.accepted) {
        return Object.freeze({ accepted: false, code: "TEXT_OCCURRENCE_STYLE_UNAVAILABLE" });
      }
      const node = projected.projection.scene.pages[0]?.nodes.find(
        (candidate) =>
          candidate.id === input.occurrenceNodeId &&
          candidate.semanticId === input.semanticId &&
          candidate.kind === "text",
      );
      const currentStyle =
        node?.kind === "text"
          ? projected.projection.scene.resources.textStyles.find(({ id }) => id === node.styleId)
          : undefined;
      const columnId = node?.kind === "text" ? boringLogTextColumnSemanticId(node) : null;
      const targetNodes = input.targets.map((target) =>
        projected.projection.scene.pages[0]?.nodes.find(
          (candidate) =>
            candidate.id === target.occurrenceNodeId &&
            candidate.semanticId === target.semanticId &&
            candidate.kind === "text" &&
            candidate.styleId === target.baseStyleId,
        ),
      );
      if (
        node?.kind !== "text" ||
        currentStyle === undefined ||
        currentStyle.id !== input.baseStyleId ||
        targetNodes.some((target) => target?.kind !== "text") ||
        input.fontFamilyId !== currentStyle.fontFamilyId ||
        input.fontSizeMpt < 4_000 ||
        input.fontSizeMpt > 48_000 ||
        input.lineHeightMpt < input.fontSizeMpt ||
        input.lineHeightMpt > 72_000 ||
        input.letterSpacingMpt < -2_000 ||
        input.letterSpacingMpt > 12_000 ||
        input.wordSpacingMpt < -2_000 ||
        input.wordSpacingMpt > 24_000 ||
        input.paragraphSpacingMpt < 0 ||
        input.paragraphSpacingMpt > 72_000 ||
        !/^#[0-9a-f]{6}$/iu.test(input.color) ||
        (input.layout.frameFillColor !== null &&
          !/^#[0-9a-f]{6}$/iu.test(input.layout.frameFillColor)) ||
        (input.layout.frameStrokeColor !== null &&
          !/^#[0-9a-f]{6}$/iu.test(input.layout.frameStrokeColor)) ||
        input.layout.frameStrokeWidthMpt < 0 ||
        input.layout.frameStrokeWidthMpt > 12_000 ||
        (input.layout.positionMode === "depth-bound" &&
          input.layout.frame.yMpt !== node.frame.yMpt) ||
        input.layout.frame.xMpt + input.layout.frame.widthMpt >
          projected.projection.scene.pages[0]!.widthMpt ||
        input.layout.frame.yMpt + input.layout.frame.heightMpt >
          projected.projection.scene.pages[0]!.heightMpt
      ) {
        return Object.freeze({ accepted: false, code: "TEXT_OCCURRENCE_STYLE_INVALID" });
      }
      const membership = captured.project.aggregate.logSet.memberships.find(
        ({ sourceExplorationIdentity }) =>
          sourceExplorationIdentity === document.explorationIdentity,
      );
      const assignment = captured.project.aggregate.logSet.templateAssignments.find(
        ({ scope }) =>
          membership !== undefined &&
          scope.kind === "exploration" &&
          scope.targetIdentity === membership.membershipIdentity,
      );
      const representation = captured.project.aggregate.logSet.embeddedTemplateRepresentations.find(
        ({ embeddedTemplateRepresentationIdentity }) =>
          embeddedTemplateRepresentationIdentity ===
          assignment?.embeddedTemplateRepresentationIdentity,
      );
      if (representation === undefined) {
        return Object.freeze({ accepted: false, code: "TEXT_OCCURRENCE_STYLE_UNAVAILABLE" });
      }
      const occurrenceIdentityDigest = sha256CanonicalJson({
        boringLogIdentity: document.boringLogIdentity,
        occurrenceNodeId: input.occurrenceNodeId,
      }).slice("sha256:".length);
      const authoredStyle = Object.freeze({
        fontFamilyId: input.fontFamilyId,
        fontSizeMpt: input.fontSizeMpt,
        fontWeight: input.fontWeight,
        lineHeightMpt: input.lineHeightMpt,
        letterSpacingMpt: input.letterSpacingMpt,
        wordSpacingMpt: input.wordSpacingMpt,
        paragraphSpacingMpt: input.paragraphSpacingMpt,
        color: input.color.toLowerCase(),
        textDecoration: input.textDecoration,
      });
      let authoredJob: BoringLogLayoutJobInput;
      if (input.applyScope === "named-style") {
        const occurrenceBinding = currentJob.template.bindings.some(
          ({ elementId, path }) =>
            elementId === input.occurrenceNodeId && path === "presentation.text-occurrence-style",
        );
        if (
          occurrenceBinding ||
          input.baseStyleId.startsWith("style-occurrence-") ||
          input.baseStyleId.startsWith("style-column-")
        ) {
          return Object.freeze({
            accepted: false,
            code: "TEXT_NAMED_STYLE_REQUIRES_INHERITED",
          });
        }
        const template = {
          ...currentJob.template,
          styles: currentJob.template.styles.map((style) =>
            style.id === input.baseStyleId
              ? Object.freeze({ id: style.id, ...authoredStyle })
              : style,
          ),
        };
        const namedStyleJob = validateBoringLogLayoutJobInput({
          ...currentJob,
          templateDigest: sha256CanonicalJson(template),
          template,
        });
        if (!namedStyleJob.accepted) {
          return Object.freeze({ accepted: false, code: "TEXT_NAMED_STYLE_INVALID" });
        }
        authoredJob = namedStyleJob.value;
      } else if (input.applyScope === "column-default") {
        const occurrenceBinding = currentJob.template.bindings.some(
          ({ elementId, path }) =>
            elementId === input.occurrenceNodeId && path === "presentation.text-occurrence-style",
        );
        if (columnId === null || occurrenceBinding) {
          return Object.freeze({
            accepted: false,
            code: "TEXT_COLUMN_STYLE_REQUIRES_INHERITED",
          });
        }
        const priorBinding = currentJob.template.bindings.find(
          ({ elementId, path }) =>
            elementId === columnId && path === "presentation.text-column-style",
        );
        const bindings = currentJob.template.bindings.filter(
          ({ elementId, path }) =>
            !(elementId === columnId && path === "presentation.text-column-style"),
        );
        const retainedStyleIds = new Set(bindings.map(({ styleId }) => styleId));
        const retainedStyles = currentJob.template.styles.filter(
          ({ id }) => id !== priorBinding?.styleId || retainedStyleIds.has(id),
        );
        const columnStyleDigest = sha256CanonicalJson({ columnId, style: authoredStyle }).slice(
          "sha256:".length,
          "sha256:".length + 24,
        );
        const columnStyleId = `style-column-${columnStyleDigest}`;
        if (retainedStyles.some(({ id }) => id === columnStyleId)) {
          return Object.freeze({ accepted: false, code: "TEXT_COLUMN_STYLE_COLLISION" });
        }
        const styles = [...retainedStyles, Object.freeze({ id: columnStyleId, ...authoredStyle })];
        bindings.push(
          Object.freeze({
            elementId: columnId,
            path: "presentation.text-column-style",
            styleId: columnStyleId,
          }),
        );
        const template = { ...currentJob.template, styles, bindings };
        const columnStyleJob = validateBoringLogLayoutJobInput({
          ...currentJob,
          templateDigest: sha256CanonicalJson(template),
          template,
        });
        if (!columnStyleJob.accepted) {
          return Object.freeze({ accepted: false, code: "TEXT_COLUMN_STYLE_INVALID" });
        }
        authoredJob = columnStyleJob.value;
      } else if (input.applyScope === "all-selected") {
        const authored = applyBoringLogTextOccurrenceStyles(
          currentJob,
          input.targets.map((target) => {
            const targetIdentityDigest = sha256CanonicalJson({
              boringLogIdentity: document.boringLogIdentity,
              occurrenceNodeId: target.occurrenceNodeId,
            }).slice("sha256:".length);
            return {
              contractVersion: 1,
              schemaVersion: "rsrender.boring-log-text-occurrence-style-override.v1",
              kind: "boring-log.text-occurrence-style-override",
              ownerDocumentIdentity: documentIdentity,
              boringLogIdentity: document.boringLogIdentity,
              overrideIdentity: `urn:rsrender:text-style-override:${targetIdentityDigest}`,
              overrideRevision: input.expectedWorkingRevision + 1,
              scope: "occurrence",
              occurrenceNodeId: target.occurrenceNodeId,
              semanticId: target.semanticId,
              baseStyleId: target.baseStyleId,
              style: authoredStyle,
              locked: false,
            } as const;
          }),
          [],
        );
        if (!authored.accepted) {
          return Object.freeze({ accepted: false, code: authored.code });
        }
        authoredJob = authored.job;
      } else {
        const authored = applyBoringLogTextOccurrenceStyles(
          currentJob,
          [
            {
              contractVersion: 1,
              schemaVersion: "rsrender.boring-log-text-occurrence-style-override.v1",
              kind: "boring-log.text-occurrence-style-override",
              ownerDocumentIdentity: documentIdentity,
              boringLogIdentity: document.boringLogIdentity,
              overrideIdentity: `urn:rsrender:text-style-override:${occurrenceIdentityDigest}`,
              overrideRevision: input.expectedWorkingRevision + 1,
              scope: "occurrence",
              occurrenceNodeId: input.occurrenceNodeId,
              semanticId: input.semanticId,
              baseStyleId: input.baseStyleId,
              style: authoredStyle,
              locked: input.locked,
            },
          ],
          [
            {
              contractVersion: 1,
              schemaVersion: "rsrender.boring-log-text-occurrence-layout-override.v1",
              kind: "boring-log.text-occurrence-layout-override",
              ownerDocumentIdentity: documentIdentity,
              boringLogIdentity: document.boringLogIdentity,
              overrideIdentity: `urn:rsrender:text-layout-override:${occurrenceIdentityDigest}`,
              overrideRevision: input.expectedWorkingRevision + 1,
              scope: "occurrence",
              occurrenceNodeId: input.occurrenceNodeId,
              semanticId: input.semanticId,
              layout: { ...input.layout, locked: input.locked },
            },
          ],
        );
        if (!authored.accepted) {
          return Object.freeze({ accepted: false, code: authored.code });
        }
        authoredJob = authored.job;
      }
      textStyleCommandSequence += 1;
      const committed = await commitEmbeddedTemplateReplacement(source.service, {
        requestId: `urn:rsrender:bld-037:request:text-${input.applyScope}:${textStyleCommandSequence}`,
        documentId: documentIdentity,
        ownerGeneration: hosted.ownerGeneration,
        expectedWorkingRevision: input.expectedWorkingRevision,
        explorationIdentity: document.explorationIdentity,
        expectedEffectiveContentDigest: representation.effectiveContentDigest,
        replacementEffectiveContentDigest: authoredJob.templateDigest,
        reason:
          input.applyScope === "named-style"
            ? "Set template-local named text style in Boring Log Studio"
            : input.applyScope === "column-default"
              ? `Set ${columnId ?? "Log Column"} text style in Boring Log Studio`
              : input.applyScope === "all-selected"
                ? "Set typography for selected text occurrences in Boring Log Studio"
                : "Set text occurrence style in Boring Log Studio",
      });
      if (!committed.accepted) return committed;
      retainedLayoutJobs.set(
        `${document.boringLogIdentity}\u0000${authoredJob.templateDigest}`,
        authoredJob,
      );
      projectionCache.clear();
      return Object.freeze({
        accepted: true,
        code:
          input.applyScope === "named-style"
            ? "TEXT_NAMED_STYLE_SET"
            : input.applyScope === "column-default"
              ? "TEXT_COLUMN_STYLE_SET"
              : input.applyScope === "all-selected"
                ? "TEXT_SELECTED_STYLES_SET"
                : "TEXT_OCCURRENCE_STYLE_SET",
        applyScope: input.applyScope,
        targetCount: input.targets.length,
        workingRevision: committed.workingRevision,
        dirty: committed.dirty,
        canUndo: committed.canUndo,
        canRedo: committed.canRedo,
        occurrenceNodeId: input.occurrenceNodeId,
        effectiveStyleId:
          input.applyScope === "named-style"
            ? input.baseStyleId
            : input.applyScope === "column-default"
              ? authoredJob.template.bindings.find(
                  ({ elementId, path }) =>
                    elementId === columnId && path === "presentation.text-column-style",
                )?.styleId
              : authoredJob.template.bindings.find(
                  ({ elementId, path }) =>
                    elementId === input.occurrenceNodeId &&
                    path === "presentation.text-occurrence-style",
                )?.styleId,
      });
    };
    const handleTextOccurrencePresentationReset = async (
      input: BoringLogStudioTextOccurrencePresentationResetInput,
    ) => {
      const captured = await captureOverrideRenderDatasetWorkingState(source.service);
      if (captured === null) {
        return Object.freeze({ accepted: false, code: "PROJECT_STATE_UNAVAILABLE" });
      }
      if (captured.project.workingRevision !== input.expectedWorkingRevision) {
        return Object.freeze({ accepted: false, code: "PROJECT_WORKING_REVISION_STALE" });
      }
      const document = activeDocument();
      const currentJob = effectiveLayoutJob(document, captured.project.aggregate);
      if (currentJob === null) {
        return Object.freeze({ accepted: false, code: "TEXT_OCCURRENCE_RESET_UNAVAILABLE" });
      }
      const membership = captured.project.aggregate.logSet.memberships.find(
        ({ sourceExplorationIdentity }) =>
          sourceExplorationIdentity === document.explorationIdentity,
      );
      const assignment = captured.project.aggregate.logSet.templateAssignments.find(
        ({ scope }) =>
          membership !== undefined &&
          scope.kind === "exploration" &&
          scope.targetIdentity === membership.membershipIdentity,
      );
      const representation = captured.project.aggregate.logSet.embeddedTemplateRepresentations.find(
        ({ embeddedTemplateRepresentationIdentity }) =>
          embeddedTemplateRepresentationIdentity ===
          assignment?.embeddedTemplateRepresentationIdentity,
      );
      if (representation === undefined) {
        return Object.freeze({ accepted: false, code: "TEXT_OCCURRENCE_RESET_UNAVAILABLE" });
      }
      const reset = clearBoringLogTextOccurrencePresentation(
        currentJob,
        input.occurrenceNodeId,
        input.semanticId,
      );
      if (!reset.accepted) return Object.freeze({ accepted: false, code: reset.code });
      textPresentationResetCommandSequence += 1;
      const committed = await commitEmbeddedTemplateReplacement(source.service, {
        requestId: `urn:rsrender:bld-037:request:text-occurrence-reset:${textPresentationResetCommandSequence}`,
        documentId: documentIdentity,
        ownerGeneration: hosted.ownerGeneration,
        expectedWorkingRevision: input.expectedWorkingRevision,
        explorationIdentity: document.explorationIdentity,
        expectedEffectiveContentDigest: representation.effectiveContentDigest,
        replacementEffectiveContentDigest: reset.job.templateDigest,
        reason: "Reset text occurrence presentation to inherited in Boring Log Studio",
      });
      if (!committed.accepted) return committed;
      retainedLayoutJobs.set(
        `${document.boringLogIdentity}\u0000${reset.job.templateDigest}`,
        reset.job,
      );
      projectionCache.clear();
      return Object.freeze({
        accepted: true,
        code: "TEXT_OCCURRENCE_PRESENTATION_RESET",
        workingRevision: committed.workingRevision,
        dirty: committed.dirty,
        canUndo: committed.canUndo,
        canRedo: committed.canRedo,
        occurrenceNodeId: input.occurrenceNodeId,
        removedStyle: reset.removedStyle,
        removedLayout: reset.removedLayout,
      });
    };
    const route = new BoringLogStudioRouteBroker({
      expectedWindow: window,
      expectedWebContents: window.webContents,
      documentIdentity,
      ownerGeneration: hosted.ownerGeneration,
      createCapability: () => randomBytes(32).toString("hex"),
      getProjection: getStudioProjection,
      lifecycle: handleLifecycle,
      setTextOccurrenceStyle: handleTextOccurrenceStyle,
      resetTextOccurrencePresentation: handleTextOccurrencePresentationReset,
    });
    studioBroker = route;
    ipcMain.handle(BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL, (event) =>
      route.bootstrap(routeContext(window, event)),
    );
    ipcMain.handle(BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL, (event, input: unknown) =>
      route.getProjection(routeContext(window, event), input),
    );
    ipcMain.handle(BORING_LOG_STUDIO_LIFECYCLE_CHANNEL, (event, input: unknown) =>
      route.lifecycle(routeContext(window, event), input),
    );
    ipcMain.handle(BORING_LOG_STUDIO_SET_TEXT_OCCURRENCE_STYLE_CHANNEL, (event, input: unknown) =>
      route.setTextOccurrenceStyle(routeContext(window, event), input),
    );
    ipcMain.handle(
      BORING_LOG_STUDIO_RESET_TEXT_OCCURRENCE_PRESENTATION_CHANNEL,
      (event, input: unknown) =>
        route.resetTextOccurrencePresentation(routeContext(window, event), input),
    );
    let closeAllowed = false;
    let closePromptInFlight = false;
    window.on("close", (event) => {
      if (closeAllowed || probeMode) return;
      event.preventDefault();
      if (closePromptInFlight) return;
      closePromptInFlight = true;
      void (async () => {
        try {
          const current = await projectState();
          if (current === null) return;
          if (!current.dirty) {
            closeAllowed = true;
            window.close();
            return;
          }
          const choice = await dialog.showMessageBox(window, {
            type: "warning",
            title: "Unsaved Log Project changes",
            message: "Save changes before closing RSrender?",
            detail: "Unsaved project edits will be lost if you continue without saving.",
            buttons: ["Save", "Don't Save", "Cancel"],
            defaultId: 0,
            cancelId: 2,
            noLink: true,
          });
          if (choice.response === 2) return;
          if (choice.response === 0) {
            const saved = await performProjectSave(current.workingRevision, false);
            if (!saved.accepted) return;
          }
          closeAllowed = true;
          window.close();
        } finally {
          closePromptInFlight = false;
        }
      })();
    });
    const publicationRoute = new BoringLogPdfPublicationRouteBroker({
      expectedWindow: window,
      expectedWebContents: window.webContents,
      documentIdentity,
      ownerGeneration: hosted.ownerGeneration,
      createCapability: () => randomBytes(32).toString("hex"),
      exportPdf: async ({ expectedWorkingRevision, expectedSceneInputDigest }) => {
        const current = [...projectionCache.values()].find(
          (projection) =>
            projection.workingRevision === expectedWorkingRevision &&
            projection.scene.inputDigest === expectedSceneInputDigest,
        );
        if (current === undefined) {
          return Object.freeze({ accepted: false, code: "EXPORT_STALE_SCENE" as const });
        }
        return publishBoringLogPdf({
          scene: current.scene,
          workingRevision: current.workingRevision,
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
  window.webContents.on("render-process-gone", (_event, details) => {
    if (probeMode) {
      probeFailure = `RENDER_PROCESS_GONE:${details.reason}:${details.exitCode}`.slice(0, 256);
    }
    rotate();
  });
  window.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
      if (probeMode && isMainFrame) {
        probeFailure = `DID_FAIL_LOAD:${errorCode}:${errorDescription}:${validatedUrl}`.slice(
          0,
          256,
        );
      }
    },
  );
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
    .catch((error: unknown) => {
      if (probeMode && probeFailure === "UNCLASSIFIED") {
        probeFailure =
          error instanceof Error
            ? `${error.name}:${error.message}`.slice(0, 256)
            : `THROWN:${String(error)}`.slice(0, 256);
      }
      return fail("SEMANTIC_EDITOR_HOST_UNAVAILABLE");
    });
}

declare global {
  var __RSRENDER_SEMANTIC_EDITOR_HTML__: string;
  var __RSRENDER_SEMANTIC_EDITOR_RENDERER_SHA256__: string;
  var __RSRENDER_WINDOW_TITLE__: string | undefined;
  var __RSRENDER_BORING_LOG_RUNTIME_INPUT_REQUIRED__: boolean | undefined;
}
