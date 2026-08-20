import {
  decodeOverrideRenderDatasetEvent,
  decodeOverrideRenderDatasetProjection,
  decodeOverrideRenderDatasetQueryResult,
  type EventSequence,
  type OverrideRenderDatasetEvent,
  type OverrideRenderDatasetProjection,
  type OwnerGeneration,
  type WorkingRevision,
} from "@rsrender/contracts";

export const overrideRenderDatasetProjectionReplicaRevision =
  "bld-019-override-render-dataset-replica-v1" as const;

export type OverrideRenderDatasetProjectionReplicaDiscardReason =
  | "BASE_WORKING_REVISION_MISMATCH"
  | "BEFORE_AGGREGATE_DIGEST_MISMATCH"
  | "DOCUMENT_IDENTITY_CHANGED"
  | "EVENT_SEQUENCE_GAP"
  | "INVALID_REPLICA_STATE"
  | "NO_PROJECTION"
  | "OWNER_GENERATION_CHANGED"
  | "SOURCE_SNAPSHOT_CHANGED"
  | "UNKNOWN_OR_MALFORMED_EVENT";

export interface OverrideRenderDatasetProjectionReplicaState {
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly workingRevision: WorkingRevision;
  readonly eventSequence: EventSequence;
  readonly projection: OverrideRenderDatasetProjection;
}

export type OverrideRenderDatasetProjectionReplicaCreationResult =
  | { readonly accepted: true; readonly state: OverrideRenderDatasetProjectionReplicaState }
  | { readonly accepted: false; readonly code: "PROJECTION_RESULT_INVALID" };

export type OverrideRenderDatasetProjectionReplicaAdvanceResult =
  | {
      readonly action: "applied";
      readonly state: OverrideRenderDatasetProjectionReplicaState;
      readonly event: OverrideRenderDatasetEvent;
    }
  | {
      readonly action: "discard-and-refetch";
      readonly reason: OverrideRenderDatasetProjectionReplicaDiscardReason;
      readonly discardedState: null;
    };

function discard(
  reason: OverrideRenderDatasetProjectionReplicaDiscardReason,
): OverrideRenderDatasetProjectionReplicaAdvanceResult {
  return Object.freeze({ action: "discard-and-refetch", reason, discardedState: null });
}

function normalizedState(input: unknown): OverrideRenderDatasetProjectionReplicaState | null {
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
    const prototype = Object.getPrototypeOf(input) as unknown;
    if (prototype !== Object.prototype && prototype !== null) return null;
    const fields = [
      "documentId",
      "ownerGeneration",
      "workingRevision",
      "eventSequence",
      "projection",
    ];
    const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of Reflect.ownKeys(input)) {
      if (typeof key !== "string" || !fields.includes(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
      copy[key] = descriptor.value;
    }
    if (fields.some((field) => !Object.hasOwn(copy, field))) return null;
    const projection = decodeOverrideRenderDatasetProjection(copy["projection"]);
    if (!projection.accepted) return null;
    if (
      copy["documentId"] !== projection.value.documentId ||
      copy["ownerGeneration"] !== projection.value.ownerGeneration ||
      copy["workingRevision"] !== projection.value.workingRevision ||
      copy["eventSequence"] !== projection.value.eventSequence
    ) {
      return null;
    }
    return Object.freeze({
      documentId: projection.value.documentId,
      ownerGeneration: projection.value.ownerGeneration,
      workingRevision: projection.value.workingRevision,
      eventSequence: projection.value.eventSequence,
      projection: projection.value,
    });
  } catch {
    return null;
  }
}

export function createOverrideRenderDatasetProjectionReplica(
  input: unknown,
): OverrideRenderDatasetProjectionReplicaCreationResult {
  try {
    const result = decodeOverrideRenderDatasetQueryResult(input);
    if (!result.accepted || result.value.kind !== "render-dataset.projection.result") {
      return Object.freeze({ accepted: false, code: "PROJECTION_RESULT_INVALID" });
    }
    const state = normalizedState({
      documentId: result.value.documentId,
      ownerGeneration: result.value.ownerGeneration,
      workingRevision: result.value.workingRevision,
      eventSequence: result.value.eventSequence,
      projection: result.value.projection,
    });
    return state === null
      ? Object.freeze({ accepted: false, code: "PROJECTION_RESULT_INVALID" })
      : Object.freeze({ accepted: true, state });
  } catch {
    return Object.freeze({ accepted: false, code: "PROJECTION_RESULT_INVALID" });
  }
}

export function advanceOverrideRenderDatasetProjectionReplica(
  stateInput: unknown,
  eventInput: unknown,
): OverrideRenderDatasetProjectionReplicaAdvanceResult {
  if (stateInput === null) return discard("NO_PROJECTION");
  const state = normalizedState(stateInput);
  if (state === null) return discard("INVALID_REPLICA_STATE");
  const event = decodeOverrideRenderDatasetEvent(eventInput);
  if (!event.accepted) return discard("UNKNOWN_OR_MALFORMED_EVENT");
  if (event.value.documentId !== state.documentId) return discard("DOCUMENT_IDENTITY_CHANGED");
  if (event.value.ownerGeneration !== state.ownerGeneration) {
    return discard("OWNER_GENERATION_CHANGED");
  }
  if (event.value.eventSequence !== state.eventSequence + 1) return discard("EVENT_SEQUENCE_GAP");
  if (event.value.baseWorkingRevision !== state.workingRevision) {
    return discard("BASE_WORKING_REVISION_MISMATCH");
  }
  if (event.value.beforeAggregateDigest !== state.projection.aggregateDigest) {
    return discard("BEFORE_AGGREGATE_DIGEST_MISMATCH");
  }
  if (
    event.value.projection.sourceSnapshotIdentity !== state.projection.sourceSnapshotIdentity ||
    event.value.projection.sourceSnapshotLogicalDigest !==
      state.projection.sourceSnapshotLogicalDigest ||
    event.value.projection.sourceSnapshotEncodingDigest !==
      state.projection.sourceSnapshotEncodingDigest
  ) {
    return discard("SOURCE_SNAPSHOT_CHANGED");
  }
  const next = normalizedState({
    documentId: event.value.documentId,
    ownerGeneration: event.value.ownerGeneration,
    workingRevision: event.value.resultingWorkingRevision,
    eventSequence: event.value.eventSequence,
    projection: event.value.projection,
  });
  if (next === null) return discard("UNKNOWN_OR_MALFORMED_EVENT");
  return Object.freeze({ action: "applied", state: next, event: event.value });
}
