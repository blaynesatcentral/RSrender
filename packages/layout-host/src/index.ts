/** Stable marker for the accepted layout-host package boundary. */
export const packageBoundary = "@rsrender/layout-host" as const;

export {
  boringLogTextAuthorityRevision,
  measureBoringLogTextRequests,
} from "./boring-log-text-authority.js";
export type { BoringLogTextAuthorityResult } from "./boring-log-text-authority.js";

export {
  boringLogPublicationProjectionRevision,
  projectBoringLogSceneForPublication,
} from "./boring-log-publication-projection.js";
export type {
  BoringLogPublicationProjection,
  BoringLogPublicationProjectionManifest,
  BoringLogPublicationProjectionResult,
} from "./boring-log-publication-projection.js";
