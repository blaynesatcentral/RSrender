/** Stable marker for the accepted application package boundary. */
export const packageBoundary = "@rsrender/application" as const;

export {
  advanceProjectionReplica,
  ApplicationServiceSubscriptionError,
  createInMemoryApplicationService,
  createProjectionReplica,
  inMemoryApplicationServiceRevision,
} from "./in-memory-application-service.js";
export type {
  ApplicationServiceInitializationResult,
  ApplicationServicePort,
  InMemoryApplicationService,
  InMemoryApplicationServiceCapacities,
  InMemoryApplicationServiceSnapshot,
  ProjectionReplicaAdvanceResult,
  ProjectionReplicaCreationResult,
  ProjectionReplicaDiscardReason,
  ProjectionReplicaState,
  SubscriptionFailureCode,
  SyntheticCommitRecord,
} from "./in-memory-application-service.js";

export {
  applicationVersionQueryHandlerRevision,
  createApplicationVersionQueryHandler,
} from "./application-version-query-handler.js";
export type {
  ApplicationVersionQueryHandlerCreationResult,
  ApplicationVersionQueryHandlerResult,
  ApplicationVersionQueryPort,
} from "./application-version-query-handler.js";

export {
  createInMemoryHistoryCore,
  createInMemoryPhase1ProjectHistoryCore,
  inMemoryHistoryCoreRevision,
  markInMemoryPhase1ProjectHistoryCoreDurableRevision,
} from "./in-memory-history-core.js";
export type {
  CapturedWorkingRevision,
  HistoryCoreInitializationResult,
  HistoryEntry,
  InMemoryHistoryCore,
  InMemoryHistoryCoreCapacities,
  InMemoryHistoryCoreSnapshot,
  InMemoryPhase1ProjectHistoryCore,
  Phase1ProjectHistoryCoreInitializationResult,
} from "./in-memory-history-core.js";

export type {
  CapturedPhase1ProjectWorkingRevision,
  PreparedProjectDomainEffectTransition,
  ProjectDomainEffectPreparationResult,
  ProjectDomainHistoryCommandResult,
  ProjectDomainHistoryCommittedResult,
  ProjectDomainHistoryEvent,
  ProjectDomainHistoryNavigationCommand,
  ProjectDomainHistoryRejectedResult,
  ProjectDomainHistoryRejectionReason,
  ProjectDomainHistorySnapshot,
  ProjectSourceCommandReplayLookupResult,
  MarkPhase1ProjectDurableRevisionResult,
} from "./project-domain-effect-state.js";

export {
  createInMemoryOverrideRenderDatasetService,
  captureOverrideRenderDatasetWorkingState,
  commitEmbeddedTemplateReplacement,
  commitEmbeddedTemplateReplacementBatch,
  dataLayerSymbologyProjectDefaultBatchOperationIdentity,
  dataLayerSymbologyProjectDefaultBatchOperationLabel,
  inMemoryOverrideRenderDatasetServiceRevision,
  lithologyClassificationDefaultBatchOperationIdentity,
  lithologyClassificationDefaultBatchOperationLabel,
  markOverrideRenderDatasetDurable,
} from "./in-memory-override-render-dataset-service.js";
export type {
  EmbeddedTemplateReplacementBatchCommitResult,
  EmbeddedTemplateReplacementCommitResult,
} from "./in-memory-override-render-dataset-service.js";

export {
  advanceOverrideRenderDatasetProjectionReplica,
  createOverrideRenderDatasetProjectionReplica,
  overrideRenderDatasetProjectionReplicaRevision,
} from "./override-render-dataset-projection-replica.js";
export type {
  OverrideRenderDatasetProjectionReplicaAdvanceResult,
  OverrideRenderDatasetProjectionReplicaCreationResult,
  OverrideRenderDatasetProjectionReplicaDiscardReason,
  OverrideRenderDatasetProjectionReplicaState,
} from "./override-render-dataset-projection-replica.js";
export type {
  InMemoryOverrideRenderDatasetService,
  InMemoryOverrideRenderDatasetServiceCapacities,
  CapturedOverrideRenderDatasetWorkingState,
  OverrideRenderDatasetServiceInitializationResult,
} from "./in-memory-override-render-dataset-service.js";

export {
  createSyntheticOverrideRenderDatasetSession,
  syntheticOverrideRenderDatasetSessionCapacities,
  syntheticOverrideRenderDatasetSessionRevision,
} from "./synthetic-override-render-dataset-session.js";
export {
  createSyntheticBoringLogOverrideSession,
  createPersistedBoringLogOverrideSession,
  syntheticBoringLogOverrideSessionCapacities,
  syntheticBoringLogOverrideSessionRevision,
  type SyntheticBoringLogEditableBinding,
  type SyntheticBoringLogEditableProperty,
  type SyntheticBoringLogOverrideSession,
  type SyntheticBoringLogOverrideSessionCreationResult,
} from "./synthetic-boring-log-override-session.js";
export {
  createPersistedBoringLogProjectSession,
  createSyntheticBoringLogProjectSession,
  syntheticBoringLogProjectSessionRevision,
  type SyntheticBoringLogProjectDocument,
  type SyntheticBoringLogProjectSession,
  type SyntheticBoringLogProjectSessionCreationResult,
} from "./synthetic-boring-log-project-session.js";
export type {
  SyntheticOverrideRenderDatasetSession,
  SyntheticOverrideRenderDatasetSessionCreationResult,
} from "./synthetic-override-render-dataset-session.js";
