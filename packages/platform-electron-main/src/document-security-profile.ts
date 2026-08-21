import {
  DOCUMENT_BOOTSTRAP_CHANNEL,
  DOCUMENT_GET_PROJECTION_CHANNEL,
  DOCUMENT_REDO_CHANNEL,
  DOCUMENT_ROUTE_URL,
  DOCUMENT_SET_DISPLAY_VALUE_CHANNEL,
  DOCUMENT_UNDO_CHANNEL,
} from "./document-route-broker.js";

export const DOCUMENT_ROUTE_SECURITY_PROFILE = Object.freeze({
  schema: "rsrender.document-route-security-profile.v1",
  electronVersion: "43.4.0",
  url: DOCUMENT_ROUTE_URL,
  partition: "rsrender-document",
  persistence: "memory-only",
  preload: "generated-document-route-only",
  ipcChannels: Object.freeze([
    DOCUMENT_BOOTSTRAP_CHANNEL,
    DOCUMENT_GET_PROJECTION_CHANNEL,
    DOCUMENT_SET_DISPLAY_VALUE_CHANNEL,
    DOCUMENT_UNDO_CHANNEL,
    DOCUMENT_REDO_CHANNEL,
  ] as const),
  rendererCapabilities: Object.freeze([
    "rsrender.document.getProjection",
    "rsrender.document.setDisplayValue",
    "rsrender.document.undo",
    "rsrender.document.redo",
  ] as const),
  webPreferences: Object.freeze({
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
  }),
  contentPolicy:
    "default-src 'none'; script-src 'none'; style-src 'none'; img-src 'none'; connect-src 'none'; media-src 'none'; font-src 'none'; frame-src 'none'; child-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
  navigation: "exact-document-route-only",
  windows: "deny-all",
  permissions: "deny-all",
  downloads: "deny-all",
  rendererNetwork: "deny-all",
} as const);

export type DocumentRouteSecurityProfile = typeof DOCUMENT_ROUTE_SECURITY_PROFILE;
