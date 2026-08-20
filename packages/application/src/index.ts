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
} from "./project-domain-effect-state.js";
