export const EMPTY_SHELL_URL = "rsrender-shell://app/index.html" as const;

export const EMPTY_SHELL_SECURITY_PROFILE = Object.freeze({
  schema: "rsrender.empty-shell-security-profile.v0",
  electronVersion: "43.4.0",
  partition: "rsrender-shell",
  persistence: "memory-only",
  preload: "generated-application-version-only",
  ipcChannels: Object.freeze([
    "rsrender:application-version:bootstrap:v1",
    "rsrender:application-version:query:v1",
  ] as const),
  rendererCapabilities: Object.freeze(["rsrender.application.getVersion"] as const),
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
  navigation: "exact-shell-url-only",
  windows: "deny-all",
  permissions: "deny-all",
  downloads: "deny-all",
  rendererNetwork: "deny-all",
} as const);

export type EmptyShellSecurityProfile = typeof EMPTY_SHELL_SECURITY_PROFILE;
