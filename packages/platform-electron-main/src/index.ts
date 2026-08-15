export {
  EMPTY_SHELL_SECURITY_PROFILE,
  EMPTY_SHELL_URL,
  type EmptyShellSecurityProfile,
} from "./security-profile.js";
export {
  APPLICATION_START_URL,
  APPLICATION_VERSION_BOOTSTRAP_CHANNEL,
  APPLICATION_VERSION_QUERY_CHANNEL,
  ApplicationVersionRouteBroker,
  applicationVersionTransportRevision,
  buildApplicationVersionTransportRequest,
} from "./application-version-route-broker.js";
export type {
  ApplicationVersionBootstrapResult,
  ApplicationVersionRouteContext,
  ApplicationVersionTransportRejectionCode,
  ApplicationVersionTransportResult,
} from "./application-version-route-broker.js";
export {
  generateApplicationVersionPreloadSource,
  generateApplicationVersionPreloadQualificationSource,
  generatedApplicationVersionPreloadRevision,
} from "./generated-application-version-preload.js";
export {
  expectedApplicationVersionPreloadSha256,
  packagedApplicationVersionPreloadRelativePath,
  verifyPackagedApplicationVersionPreload,
} from "./packaged-application-version-preload.js";
export type { PackagedApplicationVersionPreloadVerification } from "./packaged-application-version-preload.js";

/** Stable marker for the accepted platform-electron-main package boundary. */
export const packageBoundary = "@rsrender/platform-electron-main" as const;
