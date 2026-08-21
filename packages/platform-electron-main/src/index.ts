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

export {
  DOCUMENT_BOOTSTRAP_CHANNEL,
  DOCUMENT_GET_PROJECTION_CHANNEL,
  DOCUMENT_REDO_CHANNEL,
  DOCUMENT_ROUTE_URL,
  DOCUMENT_SET_DISPLAY_VALUE_CHANNEL,
  DOCUMENT_UNDO_CHANNEL,
  documentRouteTransportRevision,
} from "./document-route-contract.js";
export {
  DOCUMENT_ROUTE_INPUT_LIMITS,
  DOCUMENT_ROUTE_RESULT_LIMITS,
  DocumentRouteBroker,
  createDocumentRouteBroker,
} from "./document-route-broker.js";
export type {
  DocumentRouteBootstrapResult,
  DocumentRouteBrokerCreationResult,
  DocumentRouteContext,
  DocumentRouteOperation,
  DocumentRouteTransportRejectionCode,
  DocumentRouteTransportResult,
} from "./document-route-broker.js";
export {
  createDocumentOwnerIdentity,
  createDocumentSession,
  documentSessionRevision,
  parseDocumentOwnerIdentity,
} from "./document-session.js";
export { DocumentSessionHost, documentSessionHostRevision } from "./document-session-host.js";
export type {
  DocumentSessionHostReplaceResult,
  DocumentSessionHostSnapshot,
} from "./document-session-host.js";
export type {
  DocumentOwnerIdentity,
  DocumentOwnerIdentityResult,
  DocumentSessionCreationResult,
  DocumentSessionFailureCode,
  DocumentSessionHistoryInput,
  DocumentSessionInvocationResult,
  DocumentSessionProjectionInput,
  DocumentSessionSetDisplayValueInput,
  DocumentSessionSnapshot,
} from "./document-session.js";
export {
  DOCUMENT_ROUTE_SECURITY_PROFILE,
  type DocumentRouteSecurityProfile,
} from "./document-security-profile.js";
export {
  generateDocumentPreloadQualificationSource,
  generateDocumentPreloadSource,
  generatedDocumentPreloadRevision,
} from "./generated-document-preload.js";
export {
  expectedDocumentPreloadSha256,
  packagedDocumentPreloadRelativePath,
  verifyPackagedDocumentPreload,
} from "./packaged-document-preload.js";
export type {
  DocumentPreloadApi,
  DocumentPreloadHistoryInput,
  DocumentPreloadProjectionInput,
  DocumentPreloadPublicResult,
  DocumentPreloadSetDisplayValueInput,
} from "./document-preload-runtime.js";
export type { PackagedDocumentPreloadVerification } from "./packaged-document-preload.js";
export {
  packagedSemanticEditorRendererRelativePath,
  semanticEditorBundleMarker,
  verifyPackagedSemanticEditorRenderer,
} from "./packaged-semantic-editor-renderer.js";
export type { PackagedSemanticEditorRendererVerification } from "./packaged-semantic-editor-renderer.js";
export {
  boringLogStudioProjectionRevision,
  resolveBoringLogStudioProjection,
} from "./boring-log-studio-projection.js";
export type {
  BoringLogStudioEditableValue,
  BoringLogStudioProjection,
  BoringLogStudioProjectionResult,
} from "./boring-log-studio-projection.js";
export {
  BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL,
  BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL,
  boringLogStudioRouteRevision,
} from "./boring-log-studio-route-contract.js";
export { BoringLogStudioRouteBroker } from "./boring-log-studio-route-broker.js";
export type {
  BoringLogStudioRouteBootstrapResult,
  BoringLogStudioRouteRejectionCode,
  BoringLogStudioRouteResult,
} from "./boring-log-studio-route-broker.js";
export {
  generateBoringLogStudioPreloadSource,
  generatedBoringLogStudioPreloadRevision,
} from "./generated-boring-log-studio-preload.js";
export {
  expectedBoringLogStudioPreloadSha256,
  packagedBoringLogStudioPreloadRelativePath,
  verifyPackagedBoringLogStudioPreload,
} from "./packaged-boring-log-studio-preload.js";
export type {
  BoringLogPublicationPreloadApi,
  BoringLogStudioPreloadApi,
} from "./boring-log-studio-preload-runtime.js";
export {
  BORING_LOG_PUBLICATION_BOOTSTRAP_CHANNEL,
  BORING_LOG_PUBLICATION_EXPORT_CHANNEL,
  boringLogPublicationRouteRevision,
} from "./boring-log-publication-route-contract.js";
export type { BoringLogPublicationOutcome } from "./boring-log-publication-route-contract.js";
export { BoringLogPdfPublicationRouteBroker } from "./boring-log-publication-route-broker.js";
export type {
  BoringLogPublicationBootstrapResult,
  BoringLogPublicationRouteRejectionCode,
  BoringLogPublicationRouteResult,
} from "./boring-log-publication-route-broker.js";
export {
  boringLogPdfPublicationRevision,
  maximumBoringLogPdfBytes,
  publishBoringLogPdf,
  validBoringLogPdfEnvelope,
} from "./boring-log-pdf-publication.js";
export type {
  BoringLogPdfPublicationInput,
  BoringLogPdfRenderRequest,
} from "./boring-log-pdf-publication.js";
export {
  BORING_LOG_STUDIO_STYLESHEET_URL,
  SEMANTIC_EDITOR_SCRIPT_URL,
  SEMANTIC_EDITOR_SECURITY_PROFILE,
  type SemanticEditorSecurityProfile,
} from "./semantic-editor-security-profile.js";

/** Stable marker for the accepted platform-electron-main package boundary. */
export const packageBoundary = "@rsrender/platform-electron-main" as const;
