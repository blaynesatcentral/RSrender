import {
  applicationRequestIdentityCodec,
  applicationServiceContractVersion,
  canonicalApplicationServiceRequest,
  parseEventSequence,
  parseOwnerGeneration,
  parseWorkingRevision,
  syntheticCommitIdentityCodec,
  syntheticReplaceTemplateContentCommandId,
  syntheticTemplateProjectionKind,
  validateApplicationServiceCommand,
  validateApplicationServiceMessage,
  validateApplicationServiceQuery,
  validateApplicationServiceSubscriptionRequest,
} from "@rsrender/contracts";
import type {
  ApplicationRequestIdentity,
  ApplicationServiceCommand,
  ApplicationServiceCommandResult,
  ApplicationServiceEvent,
  ApplicationServiceQuery,
  ApplicationServiceQueryResult,
  ApplicationServiceRejectionReason,
  ApplicationServiceRejectedResult,
  ApplicationServiceSubscriptionRequest,
  EventSequence,
  OwnerGeneration,
  SyntheticCommitIdentity,
  SyntheticDomainCommittedResult,
  SyntheticTemplateContentReplacedEvent,
  SyntheticTemplateProjection,
  WorkingRevision,
} from "@rsrender/contracts";
import { canonicalizeJson, sha256CanonicalJson } from "@rsrender/contracts";
import { decodeLogTemplateAggregate } from "@rsrender/domain";
import type { LogTemplateAggregate } from "@rsrender/domain";
import type { Sha256Digest } from "@rsrender/contracts";

export const inMemoryApplicationServiceRevision = "bld-010-v1" as const;

export interface ApplicationServicePort {
  readonly execute: (
    command: ApplicationServiceCommand,
  ) => Promise<ApplicationServiceCommandResult>;
  readonly query: (query: ApplicationServiceQuery) => Promise<ApplicationServiceQueryResult>;
  readonly subscribe: (
    request: ApplicationServiceSubscriptionRequest,
  ) => AsyncIterable<ApplicationServiceEvent>;
}

export interface InMemoryApplicationService extends ApplicationServicePort {
  readonly inspect: () => InMemoryApplicationServiceSnapshot;
}

export interface InMemoryApplicationServiceCapacities {
  readonly replayEntries: number;
  readonly commits: number;
  readonly events: number;
  readonly subscriptionBatch: number;
}

export interface SyntheticCommitRecord {
  readonly commitIdentity: SyntheticCommitIdentity;
  readonly sourceRequestId: ApplicationRequestIdentity;
  readonly commandId: "synthetic.template-content.replace";
  readonly beforeWorkingRevision: WorkingRevision;
  readonly afterWorkingRevision: WorkingRevision;
  readonly beforeAggregateDigest: Sha256Digest;
  readonly afterAggregateDigest: Sha256Digest;
  readonly beforeAggregate: LogTemplateAggregate;
  readonly afterAggregate: LogTemplateAggregate;
}

export interface InMemoryApplicationServiceSnapshot {
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly workingRevision: WorkingRevision;
  readonly eventSequence: EventSequence;
  readonly aggregate: LogTemplateAggregate;
  readonly commits: readonly SyntheticCommitRecord[];
  readonly retainedEvents: readonly ApplicationServiceEvent[];
  readonly replayEntryCount: number;
}

export type ApplicationServiceInitializationResult =
  | { readonly accepted: true; readonly service: InMemoryApplicationService }
  | {
      readonly accepted: false;
      readonly code:
        | "INITIAL_AGGREGATE_INVALID"
        | "INITIAL_CAPACITIES_INVALID"
        | "INITIAL_CONFIGURATION_MALFORMED"
        | "INITIAL_OWNER_GENERATION_INVALID";
    };

type ReplayEntry = {
  readonly canonicalRequest: string;
  readonly result: ApplicationServiceCommandResult;
};

export type ProjectionReplicaDiscardReason =
  | "AFTER_AGGREGATE_DIGEST_MISMATCH"
  | "BASE_WORKING_REVISION_MISMATCH"
  | "BEFORE_AGGREGATE_DIGEST_MISMATCH"
  | "COMMIT_IDENTITY_MISMATCH"
  | "DOCUMENT_IDENTITY_CHANGED"
  | "EVENT_SEQUENCE_GAP"
  | "INVALID_REPLICA_STATE"
  | "NO_PROJECTION"
  | "OWNER_GENERATION_CHANGED"
  | "PROJECTION_AGGREGATE_DIGEST_INVALID"
  | "PROJECTION_IDENTITY_CHANGED"
  | "RESULTING_WORKING_REVISION_MISMATCH"
  | "UNKNOWN_OR_MALFORMED_EVENT";

export interface ProjectionReplicaState {
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly workingRevision: WorkingRevision;
  readonly eventSequence: EventSequence;
  readonly projection: SyntheticTemplateProjection;
}

export type ProjectionReplicaAdvanceResult =
  | { readonly action: "applied"; readonly state: ProjectionReplicaState }
  | {
      readonly action: "discard-and-refetch";
      readonly reason: ProjectionReplicaDiscardReason;
      readonly discardedState: null;
    };

export type ProjectionReplicaCreationResult =
  | { readonly accepted: true; readonly state: ProjectionReplicaState }
  | {
      readonly accepted: false;
      readonly code: "PROJECTION_AGGREGATE_DIGEST_INVALID" | "PROJECTION_RESULT_INVALID";
    };

export type SubscriptionFailureCode =
  | "CONTRACT_MALFORMED"
  | "CONTRACT_UNSUPPORTED_VERSION"
  | "DOCUMENT_IDENTITY_MISMATCH"
  | "EVENT_SEQUENCE_AHEAD"
  | "OWNER_GENERATION_MISMATCH"
  | "SUBSCRIPTION_BATCH_CAPACITY_EXCEEDED";

export class ApplicationServiceSubscriptionError extends Error {
  readonly code: SubscriptionFailureCode;

  constructor(code: SubscriptionFailureCode) {
    super(code);
    this.name = "ApplicationServiceSubscriptionError";
    this.code = code;
  }
}

function rejected(
  messageType: "command-result" | "query-result",
  requestId: ApplicationRequestIdentity | null,
  reason: ApplicationServiceRejectionReason,
): ApplicationServiceRejectedResult {
  return Object.freeze({
    contractVersion: applicationServiceContractVersion,
    messageType,
    kind: "rejected",
    requestId,
    reason,
    changed: false,
    safeActions: Object.freeze([] as const),
  });
}

function detachedRequestIdentity(input: unknown): ApplicationRequestIdentity | null {
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, "requestId");
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
    return applicationRequestIdentityCodec.parse(descriptor.value);
  } catch {
    return null;
  }
}

function canonicalFingerprint(input: unknown): string | null {
  try {
    return canonicalizeJson(input);
  } catch {
    return null;
  }
}

function contractReason(code: string): ApplicationServiceRejectionReason {
  if (code === "APPLICATION_CONTRACT_UNSUPPORTED_VERSION") {
    return "CONTRACT_UNSUPPORTED_VERSION";
  }
  if (code === "APPLICATION_CONTRACT_UNKNOWN_TAG") return "UNKNOWN_COMMAND";
  return "CONTRACT_MALFORMED";
}

function queryContractReason(code: string): ApplicationServiceRejectionReason {
  if (code === "APPLICATION_CONTRACT_UNSUPPORTED_VERSION") {
    return "CONTRACT_UNSUPPORTED_VERSION";
  }
  if (code === "APPLICATION_CONTRACT_UNKNOWN_TAG") return "UNKNOWN_QUERY";
  return "CONTRACT_MALFORMED";
}

function projection(aggregate: LogTemplateAggregate): SyntheticTemplateProjection {
  return Object.freeze({
    projectionVersion: 1,
    projectionKind: syntheticTemplateProjectionKind,
    documentId: aggregate.documentIdentity,
    aggregateVersion: aggregate.aggregateVersion,
    aggregateKind: aggregate.aggregateKind,
    templateIdentity: aggregate.templateIdentity,
    currentContentDigest: aggregate.currentContentDigest,
    aggregateDigest: sha256CanonicalJson(aggregate),
  });
}

function projectionAggregateDigest(value: SyntheticTemplateProjection): Sha256Digest {
  return sha256CanonicalJson({
    aggregateKind: value.aggregateKind,
    aggregateVersion: value.aggregateVersion,
    currentContentDigest: value.currentContentDigest,
    documentIdentity: value.documentId,
    templateIdentity: value.templateIdentity,
  });
}

function nextSafeInteger(value: number): number | null {
  return value < Number.MAX_SAFE_INTEGER ? value + 1 : null;
}

function commitIdentityFor(input: {
  readonly commandId: "synthetic.template-content.replace";
  readonly documentId: string;
  readonly requestId: ApplicationRequestIdentity;
  readonly resultingWorkingRevision: WorkingRevision;
  readonly beforeAggregateDigest: Sha256Digest;
  readonly afterAggregateDigest: Sha256Digest;
}): SyntheticCommitIdentity {
  const digest = sha256CanonicalJson({
    commandId: input.commandId,
    documentId: input.documentId,
    requestId: input.requestId,
    resultingWorkingRevision: input.resultingWorkingRevision,
    beforeAggregateDigest: input.beforeAggregateDigest,
    afterAggregateDigest: input.afterAggregateDigest,
  });
  return syntheticCommitIdentityCodec.parse(
    `urn:rsrender:synthetic-commit:${digest.slice("sha256:".length)}`,
  );
}

async function* snapshotEvents(
  events: readonly ApplicationServiceEvent[],
): AsyncIterable<ApplicationServiceEvent> {
  await Promise.resolve();
  for (const event of events) yield event;
}

class InMemoryApplicationServiceImplementation implements InMemoryApplicationService {
  #aggregate: LogTemplateAggregate;
  readonly #ownerGeneration: OwnerGeneration;
  readonly #capacities: InMemoryApplicationServiceCapacities;
  #workingRevision = parseWorkingRevision(0);
  #eventSequence = parseEventSequence(0);
  readonly #replayEntries = new Map<ApplicationRequestIdentity, ReplayEntry>();
  readonly #commits: SyntheticCommitRecord[] = [];
  readonly #events: ApplicationServiceEvent[] = [];

  constructor(
    aggregate: LogTemplateAggregate,
    ownerGeneration: OwnerGeneration,
    capacities: InMemoryApplicationServiceCapacities,
  ) {
    this.#aggregate = aggregate;
    this.#ownerGeneration = ownerGeneration;
    this.#capacities = capacities;
  }

  async execute(input: unknown): Promise<ApplicationServiceCommandResult> {
    await Promise.resolve();
    const requestId = detachedRequestIdentity(input);
    const fingerprint = canonicalFingerprint(input);
    if (requestId !== null) {
      const prior = this.#replayEntries.get(requestId);
      if (prior !== undefined) {
        return fingerprint !== null && fingerprint === prior.canonicalRequest
          ? prior.result
          : rejected("command-result", requestId, "REQUEST_ID_REUSE_MISMATCH");
      }
    }

    const validation = validateApplicationServiceCommand(input);
    if (!validation.accepted) {
      const result = rejected("command-result", requestId, contractReason(validation.code));
      this.#rememberReplay(requestId, fingerprint, result);
      return result;
    }
    const command = validation.value;
    const canonicalRequest = canonicalApplicationServiceRequest(command);
    if (this.#replayEntries.size >= this.#capacities.replayEntries) {
      return rejected("command-result", command.requestId, "CAPACITY_EXHAUSTED");
    }
    const result = this.#executeValidated(command);
    this.#rememberReplay(command.requestId, canonicalRequest, result);
    return result;
  }

  async query(input: unknown): Promise<ApplicationServiceQueryResult> {
    await Promise.resolve();
    const requestId = detachedRequestIdentity(input);
    const validation = validateApplicationServiceQuery(input);
    if (!validation.accepted) {
      return rejected("query-result", requestId, queryContractReason(validation.code));
    }
    const query = validation.value;
    if (query.documentId !== this.#aggregate.documentIdentity) {
      return rejected("query-result", query.requestId, "DOCUMENT_IDENTITY_MISMATCH");
    }
    if (query.ownerGeneration !== this.#ownerGeneration) {
      return rejected("query-result", query.requestId, "OWNER_GENERATION_MISMATCH");
    }
    if (
      query.minimumWorkingRevision !== null &&
      query.minimumWorkingRevision > this.#workingRevision
    ) {
      return rejected("query-result", query.requestId, "MINIMUM_WORKING_REVISION_UNAVAILABLE");
    }
    return Object.freeze({
      contractVersion: applicationServiceContractVersion,
      messageType: "query-result",
      kind: "synthetic.template.projection.result",
      requestId: query.requestId,
      documentId: this.#aggregate.documentIdentity,
      ownerGeneration: this.#ownerGeneration,
      workingRevision: this.#workingRevision,
      eventSequence: this.#eventSequence,
      projection: projection(this.#aggregate),
    });
  }

  subscribe(input: unknown): AsyncIterable<ApplicationServiceEvent> {
    const validation = validateApplicationServiceSubscriptionRequest(input);
    if (!validation.accepted) {
      throw new ApplicationServiceSubscriptionError(
        validation.code === "APPLICATION_CONTRACT_UNSUPPORTED_VERSION"
          ? "CONTRACT_UNSUPPORTED_VERSION"
          : "CONTRACT_MALFORMED",
      );
    }
    const request = validation.value;
    if (request.documentId !== this.#aggregate.documentIdentity) {
      throw new ApplicationServiceSubscriptionError("DOCUMENT_IDENTITY_MISMATCH");
    }
    if (request.ownerGeneration !== this.#ownerGeneration) {
      throw new ApplicationServiceSubscriptionError("OWNER_GENERATION_MISMATCH");
    }
    if (request.afterEventSequence > this.#eventSequence) {
      throw new ApplicationServiceSubscriptionError("EVENT_SEQUENCE_AHEAD");
    }
    const events = this.#events.filter((event) => event.eventSequence > request.afterEventSequence);
    if (events.length > this.#capacities.subscriptionBatch) {
      throw new ApplicationServiceSubscriptionError("SUBSCRIPTION_BATCH_CAPACITY_EXCEEDED");
    }
    return snapshotEvents(Object.freeze(events));
  }

  inspect(): InMemoryApplicationServiceSnapshot {
    return Object.freeze({
      documentId: this.#aggregate.documentIdentity,
      ownerGeneration: this.#ownerGeneration,
      workingRevision: this.#workingRevision,
      eventSequence: this.#eventSequence,
      aggregate: this.#aggregate,
      commits: Object.freeze([...this.#commits]),
      retainedEvents: Object.freeze([...this.#events]),
      replayEntryCount: this.#replayEntries.size,
    });
  }

  #rememberReplay(
    requestId: ApplicationRequestIdentity | null,
    canonicalRequest: string | null,
    result: ApplicationServiceCommandResult,
  ): void {
    if (requestId === null || canonicalRequest === null) return;
    if (this.#replayEntries.size >= this.#capacities.replayEntries) return;
    this.#replayEntries.set(requestId, Object.freeze({ canonicalRequest, result }));
  }

  #executeValidated(command: ApplicationServiceCommand): ApplicationServiceCommandResult {
    if (command.documentId !== this.#aggregate.documentIdentity) {
      return rejected("command-result", command.requestId, "DOCUMENT_IDENTITY_MISMATCH");
    }
    if (command.ownerGeneration !== this.#ownerGeneration) {
      return rejected("command-result", command.requestId, "OWNER_GENERATION_MISMATCH");
    }
    if (command.expectedWorkingRevision !== this.#workingRevision) {
      return rejected("command-result", command.requestId, "STALE_WORKING_REVISION");
    }
    if (command.payload.newContentDigest === this.#aggregate.currentContentDigest) {
      return rejected("command-result", command.requestId, "INVALID_PRECONDITION");
    }
    if (
      this.#commits.length >= this.#capacities.commits ||
      this.#events.length >= this.#capacities.events
    ) {
      return rejected("command-result", command.requestId, "CAPACITY_EXHAUSTED");
    }
    const nextRevisionValue = nextSafeInteger(this.#workingRevision);
    const nextSequenceValue = nextSafeInteger(this.#eventSequence);
    if (nextRevisionValue === null || nextSequenceValue === null) {
      return rejected("command-result", command.requestId, "INVALID_PRECONDITION");
    }

    const replacement = decodeLogTemplateAggregate({
      ...this.#aggregate,
      currentContentDigest: command.payload.newContentDigest,
    });
    if (!replacement.accepted) {
      return rejected("command-result", command.requestId, "INVALID_PRECONDITION");
    }

    const beforeAggregate = this.#aggregate;
    const afterAggregate = replacement.value;
    const beforeAggregateDigest = sha256CanonicalJson(beforeAggregate);
    const afterAggregateDigest = sha256CanonicalJson(afterAggregate);
    const previousWorkingRevision = this.#workingRevision;
    const workingRevision = parseWorkingRevision(nextRevisionValue);
    const eventSequence = parseEventSequence(nextSequenceValue);
    const commitIdentity = commitIdentityFor({
      commandId: command.commandId,
      documentId: command.documentId,
      requestId: command.requestId,
      resultingWorkingRevision: workingRevision,
      beforeAggregateDigest,
      afterAggregateDigest,
    });
    const nextProjection = projection(afterAggregate);
    const commit = Object.freeze({
      commitIdentity,
      sourceRequestId: command.requestId,
      commandId: syntheticReplaceTemplateContentCommandId,
      beforeWorkingRevision: previousWorkingRevision,
      afterWorkingRevision: workingRevision,
      beforeAggregateDigest,
      afterAggregateDigest,
      beforeAggregate,
      afterAggregate,
    }) satisfies SyntheticCommitRecord;
    const event = Object.freeze({
      contractVersion: applicationServiceContractVersion,
      messageType: "event",
      kind: "synthetic.template-content.replaced",
      sourceRequestId: command.requestId,
      commandId: syntheticReplaceTemplateContentCommandId,
      documentId: command.documentId,
      ownerGeneration: this.#ownerGeneration,
      eventSequence,
      baseWorkingRevision: previousWorkingRevision,
      resultingWorkingRevision: workingRevision,
      commitIdentity,
      beforeAggregateDigest,
      afterAggregateDigest,
      projection: nextProjection,
    }) satisfies SyntheticTemplateContentReplacedEvent;
    const result = Object.freeze({
      contractVersion: applicationServiceContractVersion,
      messageType: "command-result",
      kind: "domainCommitted",
      requestId: command.requestId,
      commandId: syntheticReplaceTemplateContentCommandId,
      documentId: command.documentId,
      ownerGeneration: this.#ownerGeneration,
      previousWorkingRevision,
      workingRevision,
      commitIdentity,
      beforeAggregateDigest,
      afterAggregateDigest,
      eventSequence,
      affectedProjectionKinds: Object.freeze([syntheticTemplateProjectionKind] as const),
      diagnostics: Object.freeze([] as const),
    }) satisfies SyntheticDomainCommittedResult;

    // One synchronous commit boundary: authoritative state first, then one transcript and event.
    this.#aggregate = afterAggregate;
    this.#workingRevision = workingRevision;
    this.#eventSequence = eventSequence;
    this.#commits.push(commit);
    this.#events.push(event);
    return result;
  }
}

function ownDataRecord(
  input: unknown,
  expectedFields: readonly string[],
): Readonly<Record<string, unknown>> | null {
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
    const prototype = Object.getPrototypeOf(input) as unknown;
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(input);
    if (
      keys.some((key) => typeof key !== "string" || !expectedFields.includes(key)) ||
      expectedFields.some((field) => !keys.includes(field))
    ) {
      return null;
    }
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const field of expectedFields) {
      const descriptor = Object.getOwnPropertyDescriptor(input, field);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
      result[field] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function parseCapacities(input: unknown): InMemoryApplicationServiceCapacities | null {
  const record = ownDataRecord(input, ["replayEntries", "commits", "events", "subscriptionBatch"]);
  if (record === null) return null;
  const values = [
    record["replayEntries"],
    record["commits"],
    record["events"],
    record["subscriptionBatch"],
  ];
  if (
    values.some((value) => typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
  ) {
    return null;
  }
  return Object.freeze({
    replayEntries: record["replayEntries"] as number,
    commits: record["commits"] as number,
    events: record["events"] as number,
    subscriptionBatch: record["subscriptionBatch"] as number,
  });
}

export function createInMemoryApplicationService(
  input: unknown,
): ApplicationServiceInitializationResult {
  const configuration = ownDataRecord(input, ["aggregate", "ownerGeneration", "capacities"]);
  if (configuration === null) {
    return Object.freeze({ accepted: false, code: "INITIAL_CONFIGURATION_MALFORMED" });
  }
  const aggregate = decodeLogTemplateAggregate(configuration["aggregate"]);
  if (!aggregate.accepted) {
    return Object.freeze({ accepted: false, code: "INITIAL_AGGREGATE_INVALID" });
  }
  const capacities = parseCapacities(configuration["capacities"]);
  if (capacities === null) {
    return Object.freeze({ accepted: false, code: "INITIAL_CAPACITIES_INVALID" });
  }
  try {
    const ownerGeneration = parseOwnerGeneration(configuration["ownerGeneration"]);
    return Object.freeze({
      accepted: true,
      service: new InMemoryApplicationServiceImplementation(
        aggregate.value,
        ownerGeneration,
        capacities,
      ),
    });
  } catch {
    return Object.freeze({ accepted: false, code: "INITIAL_OWNER_GENERATION_INVALID" });
  }
}

export function createProjectionReplica(input: unknown): ProjectionReplicaCreationResult {
  const validation = validateApplicationServiceMessage(input);
  if (
    !validation.accepted ||
    validation.value.messageType !== "query-result" ||
    validation.value.kind !== "synthetic.template.projection.result" ||
    validation.value.documentId !== validation.value.projection.documentId
  ) {
    return Object.freeze({ accepted: false, code: "PROJECTION_RESULT_INVALID" });
  }
  const result = validation.value;
  if (result.projection.aggregateDigest !== projectionAggregateDigest(result.projection)) {
    return Object.freeze({
      accepted: false,
      code: "PROJECTION_AGGREGATE_DIGEST_INVALID",
    });
  }
  return Object.freeze({
    accepted: true,
    state: Object.freeze({
      documentId: result.documentId,
      ownerGeneration: result.ownerGeneration,
      workingRevision: result.workingRevision,
      eventSequence: result.eventSequence,
      projection: result.projection,
    }),
  });
}

function discard(reason: ProjectionReplicaDiscardReason): ProjectionReplicaAdvanceResult {
  return Object.freeze({ action: "discard-and-refetch", reason, discardedState: null });
}

/** Pure renderer-replica rule: any untrusted gap or mismatch discards local state for full query. */
export function advanceProjectionReplica(
  state: unknown,
  input: unknown,
): ProjectionReplicaAdvanceResult {
  if (state === null) return discard("NO_PROJECTION");
  const stateRecord = ownDataRecord(state, [
    "documentId",
    "ownerGeneration",
    "workingRevision",
    "eventSequence",
    "projection",
  ]);
  if (stateRecord === null) return discard("INVALID_REPLICA_STATE");
  const normalizedStateResult = createProjectionReplica({
    contractVersion: applicationServiceContractVersion,
    messageType: "query-result",
    kind: "synthetic.template.projection.result",
    requestId: "urn:rsrender:projection-replica-validation",
    documentId: stateRecord["documentId"],
    ownerGeneration: stateRecord["ownerGeneration"],
    workingRevision: stateRecord["workingRevision"],
    eventSequence: stateRecord["eventSequence"],
    projection: stateRecord["projection"],
  });
  if (!normalizedStateResult.accepted) return discard("INVALID_REPLICA_STATE");
  const normalizedState = normalizedStateResult.state;
  const validation = validateApplicationServiceMessage(input);
  if (
    !validation.accepted ||
    validation.value.messageType !== "event" ||
    validation.value.kind !== "synthetic.template-content.replaced"
  ) {
    return discard("UNKNOWN_OR_MALFORMED_EVENT");
  }
  const event = validation.value;
  if (event.documentId !== normalizedState.documentId) {
    return discard("DOCUMENT_IDENTITY_CHANGED");
  }
  if (event.ownerGeneration !== normalizedState.ownerGeneration) {
    return discard("OWNER_GENERATION_CHANGED");
  }
  if (event.eventSequence !== normalizedState.eventSequence + 1) {
    return discard("EVENT_SEQUENCE_GAP");
  }
  if (event.baseWorkingRevision !== normalizedState.workingRevision) {
    return discard("BASE_WORKING_REVISION_MISMATCH");
  }
  if (event.resultingWorkingRevision !== normalizedState.workingRevision + 1) {
    return discard("RESULTING_WORKING_REVISION_MISMATCH");
  }
  if (
    event.projection.documentId !== event.documentId ||
    event.projection.templateIdentity !== normalizedState.projection.templateIdentity ||
    event.projection.aggregateVersion !== normalizedState.projection.aggregateVersion ||
    event.projection.aggregateKind !== normalizedState.projection.aggregateKind ||
    event.projection.projectionVersion !== normalizedState.projection.projectionVersion ||
    event.projection.projectionKind !== normalizedState.projection.projectionKind
  ) {
    return discard("PROJECTION_IDENTITY_CHANGED");
  }
  if (event.projection.aggregateDigest !== projectionAggregateDigest(event.projection)) {
    return discard("PROJECTION_AGGREGATE_DIGEST_INVALID");
  }
  if (event.beforeAggregateDigest !== normalizedState.projection.aggregateDigest) {
    return discard("BEFORE_AGGREGATE_DIGEST_MISMATCH");
  }
  if (event.afterAggregateDigest !== event.projection.aggregateDigest) {
    return discard("AFTER_AGGREGATE_DIGEST_MISMATCH");
  }
  const expectedCommitIdentity = commitIdentityFor({
    commandId: event.commandId,
    documentId: event.documentId,
    requestId: event.sourceRequestId,
    resultingWorkingRevision: event.resultingWorkingRevision,
    beforeAggregateDigest: event.beforeAggregateDigest,
    afterAggregateDigest: event.afterAggregateDigest,
  });
  if (event.commitIdentity !== expectedCommitIdentity) {
    return discard("COMMIT_IDENTITY_MISMATCH");
  }
  return Object.freeze({
    action: "applied",
    state: Object.freeze({
      documentId: normalizedState.documentId,
      ownerGeneration: normalizedState.ownerGeneration,
      workingRevision: event.resultingWorkingRevision,
      eventSequence: event.eventSequence,
      projection: event.projection,
    }),
  });
}
