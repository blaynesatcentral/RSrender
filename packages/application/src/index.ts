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
