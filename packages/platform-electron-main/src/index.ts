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
  DOCUMENT_REVERT_DISPLAY_VALUE_CHANNEL,
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
  DocumentSessionRevertDisplayValueInput,
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
  DocumentPreloadRevertDisplayValueInput,
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
  completeBoringLogStudioProjection,
  prepareBoringLogStudioProjection,
} from "./boring-log-studio-projection.js";
export {
  boringLogAttributeRecordProjectionRevision,
  projectBoringLogAttributeRecords,
} from "./boring-log-attribute-record-projection.js";
export type {
  BoringLogStudioAttributeField,
  BoringLogStudioAttributeRecord,
  BoringLogStudioAttributeRecordKind,
  BoringLogStudioAttributeScalar,
} from "./boring-log-attribute-record-projection.js";
export type {
  BoringLogStudioDataSummary,
  BoringLogStudioDataLayerSymbologyState,
  BoringLogStudioDataLineSymbol,
  BoringLogStudioDataPointSymbol,
  BoringLogStudioPageSetup,
  BoringLogStudioEditableValue,
  BoringLogStudioProjection,
  BoringLogStudioProjectionPreparation,
  BoringLogStudioProjectionPreparationResult,
  BoringLogStudioProjectionResult,
  BoringLogStudioTextOccurrencePresentationState,
} from "./boring-log-studio-projection.js";
export {
  BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL,
  BORING_LOG_STUDIO_ADD_PROVIDER_COLUMN_CHANNEL,
  BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL,
  BORING_LOG_STUDIO_LIFECYCLE_CHANNEL,
  BORING_LOG_STUDIO_RESET_TEXT_OCCURRENCE_PRESENTATION_CHANNEL,
  BORING_LOG_STUDIO_SET_COLUMN_DIVIDER_CHANNEL,
  BORING_LOG_STUDIO_SET_COLUMN_HEADING_CHANNEL,
  BORING_LOG_STUDIO_SET_DATA_LAYER_SYMBOLOGY_CHANNEL,
  BORING_LOG_STUDIO_SET_LITHOLOGY_APPEARANCE_CHANNEL,
  BORING_LOG_STUDIO_SET_REGION_BOUNDARY_CHANNEL,
  BORING_LOG_STUDIO_SET_PAGE_GUIDES_CHANNEL,
  BORING_LOG_STUDIO_SET_PAGE_SETUP_CHANNEL,
  BORING_LOG_STUDIO_SET_TEXT_OCCURRENCE_STYLE_CHANNEL,
  BORING_LOG_STUDIO_ARRANGE_TEXT_OCCURRENCES_CHANNEL,
  BORING_LOG_STUDIO_MUTATE_TEXT_OCCURRENCES_CHANNEL,
  BORING_LOG_STUDIO_SET_DATA_DEPTH_CONFIGURATION_CHANNEL,
  boringLogStudioRouteRevision,
} from "./boring-log-studio-route-contract.js";
export { BoringLogStudioRouteBroker } from "./boring-log-studio-route-broker.js";
export type {
  BoringLogStudioRouteBootstrapResult,
  BoringLogStudioRouteRejectionCode,
  BoringLogStudioRouteResult,
  BoringLogStudioLifecycleOperation,
  BoringLogStudioAddProviderColumnInput,
  BoringLogStudioColumnDividerInput,
  BoringLogStudioColumnHeadingInput,
  BoringLogStudioLithologyAppearanceInput,
  BoringLogStudioRegionBoundaryInput,
  BoringLogStudioDataDepthConfigurationInput,
  BoringLogStudioDataLayerSymbologyInput,
  BoringLogStudioPageGuidesInput,
  BoringLogStudioPageSetupInput,
  BoringLogStudioProjectionPreviewInput,
  BoringLogStudioTextOccurrencePresentationResetInput,
  BoringLogStudioTextOccurrenceStyleInput,
  BoringLogStudioArrangeTextOccurrencesInput,
  BoringLogStudioMutateTextOccurrencesInput,
  BoringLogStudioLifecycleResult,
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
export type {
  BoringLogPublicationIntent,
  BoringLogPublicationOutcome,
  BoringLogPublicationPageManifestEntry,
} from "./boring-log-publication-route-contract.js";
export { BoringLogPdfPublicationRouteBroker } from "./boring-log-publication-route-broker.js";
export type {
  BoringLogPublicationBootstrapResult,
  BoringLogPublicationRouteRejectionCode,
  BoringLogPublicationRouteResult,
} from "./boring-log-publication-route-broker.js";
export {
  boringLogPdfPackagePublicationRevision,
  boringLogPdfPublicationRevision,
  maximumBoringLogPdfBytes,
  publishBoringLogPdf,
  publishBoringLogPdfPackage,
  validBoringLogPdfEnvelope,
} from "./boring-log-pdf-publication.js";
export type {
  BoringLogPdfPackagePublicationInput,
  BoringLogPdfPublicationInput,
  BoringLogPdfRenderRequest,
} from "./boring-log-pdf-publication.js";
export {
  inspectRsLogProjectDataJson,
  maximumRsLogBoreholeCollectionItems,
  maximumRsLogProjectBoreholes,
  maximumRsLogProjectDataBytes,
  rsLogProjectDataIngressRevision,
} from "./rslog-project-data-ingress.js";
export type {
  RsLogProjectDataBorehole,
  RsLogProjectDataBoringMethod,
  RsLogProjectDataComment,
  RsLogProjectDataDocument,
  RsLogProjectDataIngressRejectionCode,
  RsLogProjectDataIngressResult,
  RsLogProjectDataSample,
  RsLogProjectDataStratigraphy,
} from "./rslog-project-data-ingress.js";
export {
  createRsLogProjectDataLayoutJobs,
  rsLogProjectDataLayoutJobRevision,
} from "./rslog-project-data-layout-job.js";
export type {
  RsLogProjectDataLayoutJobFailureCode,
  RsLogProjectDataLayoutJobResult,
} from "./rslog-project-data-layout-job.js";
export {
  maximumRsLogLiveResponseBytes,
  RSLOG_CLOUD_ORIGIN,
  RsLogLiveSessionBroker,
  rsLogLiveSessionBrokerRevision,
} from "./rslog-live-session-broker.js";
export type {
  RsLogAuthActionResult,
  RsLogAuthFailureCode,
  RsLogAuthProjection,
  RsLogDatasetId,
  RsLogHttpRequest,
  RsLogHttpResponse,
  RsLogHttpTransport,
  RsLogHttpTransportFailureCode,
  RsLogLiveOperationId,
  RsLogReadFailureCode,
  RsLogReadRequestSpec,
  RsLogReadResult,
} from "./rslog-live-session-broker.js";
export { RsLogHttpTransportFailure } from "./rslog-live-session-broker.js";
export {
  createRsLogNodeFetchTransport,
  defaultRsLogRequestTimeoutMs,
  maximumRsLogLiveRequestBytes,
  rsLogNodeFetchTransportRevision,
} from "./rslog-node-fetch-transport.js";
export type {
  RsLogFetchImplementation,
  RsLogNodeFetchTransportOptions,
} from "./rslog-node-fetch-transport.js";
export {
  createRsLogAuthEntryHtml,
  RSLOG_AUTH_ENTRY_BOOTSTRAP_CHANNEL,
  RSLOG_AUTH_ENTRY_CANCEL_CHANNEL,
  RSLOG_AUTH_ENTRY_STYLESHEET,
  RSLOG_AUTH_ENTRY_STYLESHEET_URL,
  RSLOG_AUTH_ENTRY_SUBMIT_CHANNEL,
  RSLOG_AUTH_ENTRY_URL,
  RsLogAuthEntryRouteBroker,
  rsLogAuthEntryRouteRevision,
} from "./rslog-auth-entry-route.js";
export type {
  RsLogAuthEntryBootstrapResult,
  RsLogAuthEntryContext,
  RsLogAuthEntryMode,
  RsLogAuthEntryResult,
} from "./rslog-auth-entry-route.js";
export {
  generateRsLogAuthEntryPreloadSource,
  generatedRsLogAuthEntryPreloadRevision,
} from "./generated-rslog-auth-entry-preload.js";
export {
  createRsLogSourceSelectionHtml,
  RSLOG_SOURCE_SELECTION_BOOTSTRAP_CHANNEL,
  RSLOG_SOURCE_SELECTION_CANCEL_CHANNEL,
  RSLOG_SOURCE_SELECTION_STYLESHEET,
  RSLOG_SOURCE_SELECTION_STYLESHEET_URL,
  RSLOG_SOURCE_SELECTION_SUBMIT_CHANNEL,
  RSLOG_SOURCE_SELECTION_URL,
  RsLogSourceSelectionRouteBroker,
  rsLogSourceSelectionRouteRevision,
} from "./rslog-source-selection-route.js";
export type {
  RsLogSourceSelectionBootstrapResult,
  RsLogSourceSelectionContext,
  RsLogSourceSelectionMode,
  RsLogSourceSelectionOption,
  RsLogSourceSelectionResult,
} from "./rslog-source-selection-route.js";
export {
  generateRsLogSourceSelectionPreloadSource,
  generatedRsLogSourceSelectionPreloadRevision,
} from "./generated-rslog-source-selection-preload.js";
export {
  inspectRsLogJsonShape,
  maximumRsLogJsonShapeDepth,
  maximumRsLogJsonShapeNodes,
  maximumRsLogJsonShapePaths,
  rsLogJsonShapeLedgerRevision,
} from "./rslog-json-shape-ledger.js";
export {
  inspectRsLogProjectCatalog,
  maximumRsLogProjectCatalogBytes,
  maximumRsLogProjectCatalogEntries,
  rsLogProjectCatalogIngressRevision,
} from "./rslog-project-catalog-ingress.js";
export type {
  RsLogProjectCatalogEntry,
  RsLogProjectCatalogIngressResult,
} from "./rslog-project-catalog-ingress.js";
export {
  inspectRsLogLiveBoreholeCatalog,
  inspectRsLogLiveProjectData,
  normalizeRsLogRichText,
  rsLogLiveProjectDataIngressRevision,
} from "./rslog-live-project-data-ingress.js";
export type {
  RsLogLiveBoreholeCatalogEntry,
  RsLogLiveBoreholeCatalogResult,
  RsLogLiveProjectDataIngressResult,
  RsLogLiveRsGeoResponse,
} from "./rslog-live-project-data-ingress.js";
export type {
  RsLogJsonShapeLedger,
  RsLogJsonShapeLedgerResult,
  RsLogJsonShapeObservation,
  RsLogJsonValueKind,
} from "./rslog-json-shape-ledger.js";
export {
  BORING_LOG_STUDIO_STYLESHEET_URL,
  SEMANTIC_EDITOR_SCRIPT_URL,
  SEMANTIC_EDITOR_SECURITY_PROFILE,
  type SemanticEditorSecurityProfile,
} from "./semantic-editor-security-profile.js";

/** Stable marker for the accepted platform-electron-main package boundary. */
export const packageBoundary = "@rsrender/platform-electron-main" as const;

export {
  boringLogDocumentIngressRevision,
  decodeBoringLogDocumentBundle,
  maximumBoringLogDocumentBundleBytes,
} from "./boring-log-document-ingress.js";
export {
  logProjectFileBrokerRevision,
  captureLogProjectFileBaseline,
  openLogProjectFile,
  saveLogProjectFile,
} from "./log-project-file-broker.js";
export type {
  LogProjectFileBaseline,
  LogProjectFileResult,
  OpenedLogProjectFile,
} from "./log-project-file-broker.js";
export type {
  BoringLogDocumentIngressRejectionCode,
  BoringLogDocumentIngressResult,
} from "./boring-log-document-ingress.js";
export {
  boringLogExampleDocumentRevision,
  boringLogExampleDocumentSource,
} from "./boring-log-example-document.js";
