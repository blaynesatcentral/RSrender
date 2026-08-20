import {
  applicationRequestIdentityCodec,
  canonicalHistoryCoreCommand,
  capturedRevisionIdentityCodec,
  decodeProjectDomainEffect,
  historyEntryIdentityCodec,
  historyUndoCommandId,
  isOwnerGeneration,
  isSha256Digest,
  parseDurableRevision,
  parseEventSequence,
  parseHistoryCursor,
  parseWorkingRevision,
  sha256CanonicalJson,
  sha256Utf8,
  validateHistoryCoreCommand,
} from "@rsrender/contracts";
import type {
  ApplicationRequestIdentity,
  CapturedRevisionIdentity,
  DurableRevision,
  EventSequence,
  HistoryCursor,
  HistoryEntryIdentity,
  HistoryOperation,
  HistoryRedoCommand,
  HistoryUndoCommand,
  OwnerGeneration,
  ProjectDomainEffect,
  ProjectDomainEffectIdentity,
  ProjectDomainEventResult,
  Sha256Digest,
  WorkingRevision,
} from "@rsrender/contracts";
import { decodePhase1LogProjectAggregate, encodePhase1LogProjectAggregate } from "@rsrender/domain";
import type { Phase1LogProjectAggregate } from "@rsrender/domain";

export const projectDomainEffectStateRevision = "bld-018-project-history-state-v1" as const;

export interface ProjectDomainHistoryCapacities {
  readonly replayEntries: number;
  readonly historyEntries: number;
  readonly commits: number;
  readonly events: number;
}

export type ProjectDomainHistoryRejectionReason =
  | "AGGREGATE_CONTRACT_INVALID"
  | "BEFORE_AGGREGATE_MISMATCH"
  | "CAPACITY_EXHAUSTED"
  | "DOCUMENT_IDENTITY_MISMATCH"
  | "EFFECT_CONTRACT_INVALID"
  | "HISTORY_INVARIANT_VIOLATION"
  | "NOTHING_TO_REDO"
  | "NOTHING_TO_UNDO"
  | "OWNER_GENERATION_MISMATCH"
  | "PREPARED_STATE_MISMATCH"
  | "REQUEST_ID_REUSE_MISMATCH"
  | "STALE_WORKING_REVISION"
  | "UNKNOWN_HISTORY_OPERATION"
  | "WORKING_REVISION_EXHAUSTED";

export interface ProjectDomainHistoryRejectedResult {
  readonly contractVersion: 1;
  readonly messageType: "command-result";
  readonly kind: "project-domain-history.rejected";
  readonly requestId: ApplicationRequestIdentity | null;
  readonly reason: ProjectDomainHistoryRejectionReason;
  readonly changed: false;
  readonly safeActions: readonly [];
}

export interface ProjectDomainHistoryCommittedResult {
  readonly contractVersion: 1;
  readonly messageType: "command-result";
  readonly kind: "project-domain-history.committed";
  readonly requestId: ApplicationRequestIdentity;
  readonly sourceCommandDigest: Sha256Digest;
  /** Audit/display metadata only. It is never dispatched by this state machine. */
  readonly sourceCommandIdentity: string;
  readonly operation: HistoryOperation;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly previousWorkingRevision: WorkingRevision;
  readonly workingRevision: WorkingRevision;
  readonly durableRevision: DurableRevision;
  readonly historyEntryIdentity: HistoryEntryIdentity;
  readonly historyCursor: HistoryCursor;
  readonly historyLength: HistoryCursor;
  readonly aggregateDigest: Sha256Digest;
  readonly dirty: boolean;
  readonly eventSequence: EventSequence;
  readonly affectedIdentities: readonly string[];
  readonly invalidations: readonly string[];
  /** Inert, canonical result bytes; no code path dispatches resultCode or payload. */
  readonly eventResult: ProjectDomainEventResult;
  readonly changed: true;
}

export type ProjectDomainHistoryCommandResult =
  ProjectDomainHistoryCommittedResult | ProjectDomainHistoryRejectedResult;

export interface ProjectDomainHistoryEntry {
  readonly historyEntryIdentity: HistoryEntryIdentity;
  readonly label: string;
  readonly sourceCommandIdentity: string;
  readonly sourceRequestId: ApplicationRequestIdentity;
  readonly sourceCommandDigest: Sha256Digest;
  readonly effectIdentity: ProjectDomainEffectIdentity;
  readonly createdBeforeWorkingRevision: WorkingRevision;
  readonly createdAfterWorkingRevision: WorkingRevision;
  readonly beforeAggregateDigest: Sha256Digest;
  readonly afterAggregateDigest: Sha256Digest;
  readonly beforeAggregate: Phase1LogProjectAggregate;
  readonly afterAggregate: Phase1LogProjectAggregate;
  readonly effect: ProjectDomainEffect;
}

export interface ProjectDomainHistoryEvent {
  readonly eventSequence: EventSequence;
  readonly operation: HistoryOperation;
  readonly sourceRequestId: ApplicationRequestIdentity;
  readonly sourceCommandDigest: Sha256Digest;
  readonly historyEntryIdentity: HistoryEntryIdentity;
  readonly baseWorkingRevision: WorkingRevision;
  readonly resultingWorkingRevision: WorkingRevision;
  readonly aggregateDigest: Sha256Digest;
  readonly affectedIdentities: readonly string[];
  readonly invalidations: readonly string[];
  readonly result: ProjectDomainEventResult;
}

export interface ProjectDomainHistorySnapshot {
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly workingRevision: WorkingRevision;
  readonly durableRevision: DurableRevision;
  readonly durableAggregateDigest: Sha256Digest;
  readonly aggregate: Phase1LogProjectAggregate;
  readonly aggregateCanonicalJson: string;
  readonly aggregateDigest: Sha256Digest;
  readonly dirty: boolean;
  readonly historyCursor: HistoryCursor;
  readonly historyLength: HistoryCursor;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly history: readonly ProjectDomainHistoryEntry[];
  readonly events: readonly ProjectDomainHistoryEvent[];
  readonly replayEntryCount: number;
  readonly commitCount: number;
}

export interface CapturedPhase1ProjectWorkingRevision {
  readonly capturedRevisionIdentity: CapturedRevisionIdentity;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly workingRevision: WorkingRevision;
  readonly aggregateDigest: Sha256Digest;
  readonly aggregateCanonicalJson: string;
  readonly aggregate: Phase1LogProjectAggregate;
}

declare const projectHistoryStateBrand: unique symbol;
export interface Phase1ProjectHistoryState {
  readonly [projectHistoryStateBrand]: "Phase1ProjectHistoryState";
}

declare const preparedTransitionBrand: unique symbol;
export interface PreparedProjectDomainEffectTransition {
  readonly [preparedTransitionBrand]: "PreparedProjectDomainEffectTransition";
}

export type ProjectDomainEffectPreparationResult =
  | {
      readonly kind: "ready";
      readonly prepared: PreparedProjectDomainEffectTransition;
      readonly result: ProjectDomainHistoryCommittedResult;
    }
  | { readonly kind: "replayed"; readonly result: ProjectDomainHistoryCommandResult }
  | {
      readonly kind: "rejected";
      readonly prepared: PreparedProjectDomainEffectTransition | null;
      readonly result: ProjectDomainHistoryRejectedResult;
    };

export type ProjectDomainEffectCommitResult =
  | {
      readonly accepted: true;
      readonly state: Phase1ProjectHistoryState;
      readonly result: ProjectDomainHistoryCommandResult;
    }
  | {
      readonly accepted: false;
      readonly state: Phase1ProjectHistoryState | null;
      readonly result: ProjectDomainHistoryCommandResult;
    };

export type ProjectDomainHistoryNavigationCommand = HistoryUndoCommand | HistoryRedoCommand;

export type ProjectDomainHistoryNavigationResult =
  | {
      readonly accepted: true;
      readonly state: Phase1ProjectHistoryState;
      readonly result: ProjectDomainHistoryCommandResult;
    }
  | {
      readonly accepted: false;
      readonly state: Phase1ProjectHistoryState | null;
      readonly result: ProjectDomainHistoryCommandResult;
    };

export type ProjectSourceCommandReplayLookupResult =
  | { readonly kind: "miss" }
  | { readonly kind: "replayed"; readonly result: ProjectDomainHistoryCommandResult }
  | {
      readonly kind: "request-id-mismatch";
      readonly result: ProjectDomainHistoryRejectedResult;
    }
  | { readonly kind: "rejected"; readonly result: ProjectDomainHistoryRejectedResult };

export type Phase1ProjectHistoryInitializationResult =
  | { readonly accepted: true; readonly state: Phase1ProjectHistoryState }
  | {
      readonly accepted: false;
      readonly code:
        | "INITIAL_AGGREGATE_INVALID"
        | "INITIAL_CAPACITIES_INVALID"
        | "INITIAL_CONFIGURATION_MALFORMED"
        | "INITIAL_OWNER_GENERATION_INVALID";
    };

type ReplayEntry = {
  readonly requestId: ApplicationRequestIdentity;
  readonly sourceCommandDigest: Sha256Digest;
  readonly effectIdentity: ProjectDomainEffectIdentity | null;
  readonly result: ProjectDomainHistoryCommandResult;
};

type StateData = {
  readonly aggregate: Phase1LogProjectAggregate;
  readonly aggregateCanonicalJson: string;
  readonly aggregateDigest: Sha256Digest;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly workingRevision: WorkingRevision;
  readonly durableRevision: DurableRevision;
  readonly durableAggregateDigest: Sha256Digest;
  readonly capacities: ProjectDomainHistoryCapacities;
  readonly history: readonly ProjectDomainHistoryEntry[];
  readonly historyCursor: HistoryCursor;
  readonly replay: readonly ReplayEntry[];
  readonly events: readonly ProjectDomainHistoryEvent[];
  readonly commitCount: number;
};

type PreparedData = {
  readonly expectedState: Phase1ProjectHistoryState;
  readonly effect: ProjectDomainEffect;
  readonly result: ProjectDomainHistoryCommandResult;
};

type DataRecord = Readonly<Record<string, unknown>>;

const states = new WeakMap<object, StateData>();
const preparations = new WeakMap<object, PreparedData>();

function ownDataRecord(input: unknown, expected: readonly string[]): DataRecord | null {
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
    const prototype = Object.getPrototypeOf(input) as unknown;
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(input);
    if (
      keys.length !== expected.length ||
      keys.some((key) => typeof key !== "string" || !expected.includes(key))
    ) {
      return null;
    }
    const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      if (typeof key !== "string") return null;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
      copy[key] = descriptor.value;
    }
    return copy;
  } catch {
    return null;
  }
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function parseCapacities(input: unknown): ProjectDomainHistoryCapacities | null {
  const record = ownDataRecord(input, ["replayEntries", "historyEntries", "commits", "events"]);
  if (
    record === null ||
    !isPositiveSafeInteger(record["replayEntries"]) ||
    !isPositiveSafeInteger(record["historyEntries"]) ||
    !isPositiveSafeInteger(record["commits"]) ||
    !isPositiveSafeInteger(record["events"])
  ) {
    return null;
  }
  return Object.freeze({
    replayEntries: record["replayEntries"],
    historyEntries: record["historyEntries"],
    commits: record["commits"],
    events: record["events"],
  });
}

function dataFor(state: unknown): StateData | null {
  if (typeof state !== "object" || state === null) return null;
  return states.get(state) ?? null;
}

function preparedFor(value: unknown): PreparedData | null {
  if (typeof value !== "object" || value === null) return null;
  return preparations.get(value) ?? null;
}

function makeState(data: StateData): Phase1ProjectHistoryState {
  const token = Object.freeze({}) as Phase1ProjectHistoryState;
  states.set(token, Object.freeze(data));
  return token;
}

function makePrepared(data: PreparedData): PreparedProjectDomainEffectTransition {
  const token = Object.freeze({}) as PreparedProjectDomainEffectTransition;
  preparations.set(token, Object.freeze(data));
  return token;
}

function rejected(
  requestId: ApplicationRequestIdentity | null,
  reason: ProjectDomainHistoryRejectionReason,
): ProjectDomainHistoryRejectedResult {
  return Object.freeze({
    contractVersion: 1,
    messageType: "command-result",
    kind: "project-domain-history.rejected",
    requestId,
    reason,
    changed: false,
    safeActions: Object.freeze<[]>([]),
  });
}

function invariantRejected(): ProjectDomainHistoryRejectedResult {
  return rejected(null, "HISTORY_INVARIANT_VIOLATION");
}

function parseCanonicalAggregate(value: string):
  | {
      readonly accepted: true;
      readonly aggregate: Phase1LogProjectAggregate;
      readonly canonicalJson: string;
      readonly digest: Sha256Digest;
    }
  | { readonly accepted: false } {
  try {
    const parsed = JSON.parse(value) as unknown;
    const decoded = decodePhase1LogProjectAggregate(parsed);
    if (!decoded.accepted) return Object.freeze({ accepted: false });
    const encoded = encodePhase1LogProjectAggregate(decoded.value);
    if (!encoded.accepted || encoded.canonicalJson !== value) {
      return Object.freeze({ accepted: false });
    }
    return Object.freeze({
      accepted: true,
      aggregate: encoded.value,
      canonicalJson: encoded.canonicalJson,
      digest: encoded.digest,
    });
  } catch {
    return Object.freeze({ accepted: false });
  }
}

function validateEffectAggregates(effect: ProjectDomainEffect):
  | {
      readonly accepted: true;
      readonly before: ReturnType<typeof parseCanonicalAggregate> & { readonly accepted: true };
      readonly after: ReturnType<typeof parseCanonicalAggregate> & { readonly accepted: true };
    }
  | { readonly accepted: false; readonly reason: ProjectDomainHistoryRejectionReason } {
  const before = parseCanonicalAggregate(effect.beforeAggregate.canonicalJson);
  const after = parseCanonicalAggregate(effect.afterAggregate.canonicalJson);
  if (!before.accepted || !after.accepted) {
    return Object.freeze({ accepted: false, reason: "AGGREGATE_CONTRACT_INVALID" });
  }
  if (
    before.digest !== effect.beforeAggregate.digest ||
    after.digest !== effect.afterAggregate.digest ||
    effect.forwardApplication.expectedAggregateDigest !== before.digest ||
    effect.forwardApplication.replacementAggregateCanonicalJson !== after.canonicalJson ||
    effect.forwardApplication.replacementAggregateDigest !== after.digest ||
    effect.inverseApplication.expectedAggregateDigest !== after.digest ||
    effect.inverseApplication.replacementAggregateCanonicalJson !== before.canonicalJson ||
    effect.inverseApplication.replacementAggregateDigest !== before.digest
  ) {
    return Object.freeze({ accepted: false, reason: "AGGREGATE_CONTRACT_INVALID" });
  }
  if (
    before.aggregate.documentIdentity !== effect.documentId ||
    after.aggregate.documentIdentity !== effect.documentId ||
    before.aggregate.documentIdentity !== after.aggregate.documentIdentity ||
    before.aggregate.sourceContextIdentity !== after.aggregate.sourceContextIdentity ||
    before.aggregate.sourceProjectIdentity !== after.aggregate.sourceProjectIdentity
  ) {
    return Object.freeze({ accepted: false, reason: "DOCUMENT_IDENTITY_MISMATCH" });
  }
  return Object.freeze({ accepted: true, before, after });
}

function sourceCommandReplayLookup(
  data: StateData,
  requestId: ApplicationRequestIdentity,
  digest: Sha256Digest,
): ProjectSourceCommandReplayLookupResult {
  const entry = data.replay.find((candidate) => candidate.requestId === requestId);
  if (entry === undefined) return Object.freeze({ kind: "miss" });
  if (entry.sourceCommandDigest !== digest) {
    return Object.freeze({
      kind: "request-id-mismatch",
      result: rejected(requestId, "REQUEST_ID_REUSE_MISMATCH"),
    });
  }
  return Object.freeze({ kind: "replayed", result: entry.result });
}

function effectReplayLookup(
  data: StateData,
  effect: ProjectDomainEffect,
): ProjectSourceCommandReplayLookupResult {
  const entry = data.replay.find((candidate) => candidate.requestId === effect.sourceRequestId);
  if (entry === undefined) return Object.freeze({ kind: "miss" });
  if (
    entry.sourceCommandDigest !== effect.sourceCommandDigest ||
    entry.effectIdentity !== effect.effectIdentity
  ) {
    return Object.freeze({
      kind: "request-id-mismatch",
      result: rejected(effect.sourceRequestId, "REQUEST_ID_REUSE_MISMATCH"),
    });
  }
  return Object.freeze({ kind: "replayed", result: entry.result });
}

function replayOnlyState(
  state: StateData,
  requestId: ApplicationRequestIdentity,
  sourceCommandDigest: Sha256Digest,
  effectIdentity: ProjectDomainEffectIdentity | null,
  result: ProjectDomainHistoryCommandResult,
): Phase1ProjectHistoryState {
  return makeState({
    ...state,
    replay: Object.freeze([
      ...state.replay,
      Object.freeze({ requestId, sourceCommandDigest, effectIdentity, result }),
    ]),
  });
}

function preparedEffectRejection(
  state: Phase1ProjectHistoryState,
  data: StateData,
  effect: ProjectDomainEffect,
  reason: ProjectDomainHistoryRejectionReason,
): ProjectDomainEffectPreparationResult {
  const result = rejected(effect.sourceRequestId, reason);
  return Object.freeze({
    kind: "rejected",
    prepared:
      data.replay.length < data.capacities.replayEntries
        ? makePrepared({ expectedState: state, effect, result })
        : null,
    result,
  });
}

function deriveEntryIdentity(effect: ProjectDomainEffect): HistoryEntryIdentity {
  return historyEntryIdentityCodec.parse(
    `urn:rsrender:project-history-entry:${sha256CanonicalJson({
      effectIdentity: effect.effectIdentity,
      sourceRequestId: effect.sourceRequestId,
      sourceCommandDigest: effect.sourceCommandDigest,
    })}`,
  );
}

function committedResult(input: {
  readonly data: StateData;
  readonly requestId: ApplicationRequestIdentity;
  readonly sourceCommandDigest: Sha256Digest;
  readonly sourceCommandIdentity: string;
  readonly operation: HistoryOperation;
  readonly entry: ProjectDomainHistoryEntry;
  readonly previousWorkingRevision: WorkingRevision;
  readonly workingRevision: WorkingRevision;
  readonly cursor: HistoryCursor;
  readonly historyLength: HistoryCursor;
  readonly aggregateDigest: Sha256Digest;
  readonly eventSequence: EventSequence;
}): ProjectDomainHistoryCommittedResult {
  return Object.freeze({
    contractVersion: 1,
    messageType: "command-result",
    kind: "project-domain-history.committed",
    requestId: input.requestId,
    sourceCommandDigest: input.sourceCommandDigest,
    sourceCommandIdentity: input.sourceCommandIdentity,
    operation: input.operation,
    documentId: input.data.documentId,
    ownerGeneration: input.data.ownerGeneration,
    previousWorkingRevision: input.previousWorkingRevision,
    workingRevision: input.workingRevision,
    durableRevision: input.data.durableRevision,
    historyEntryIdentity: input.entry.historyEntryIdentity,
    historyCursor: input.cursor,
    historyLength: input.historyLength,
    aggregateDigest: input.aggregateDigest,
    dirty: Number(input.workingRevision) !== Number(input.data.durableRevision),
    eventSequence: input.eventSequence,
    affectedIdentities: input.entry.effect.affectedIdentities,
    invalidations: input.entry.effect.invalidations,
    eventResult: input.entry.effect.eventResult,
    changed: true,
  });
}

function transitionState(input: {
  readonly data: StateData;
  readonly aggregate: Phase1LogProjectAggregate;
  readonly aggregateCanonicalJson: string;
  readonly aggregateDigest: Sha256Digest;
  readonly workingRevision: WorkingRevision;
  readonly history: readonly ProjectDomainHistoryEntry[];
  readonly cursor: HistoryCursor;
  readonly requestId: ApplicationRequestIdentity;
  readonly sourceCommandDigest: Sha256Digest;
  readonly effectIdentity: ProjectDomainEffectIdentity | null;
  readonly result: ProjectDomainHistoryCommittedResult;
  readonly event: ProjectDomainHistoryEvent;
}): Phase1ProjectHistoryState {
  return makeState({
    ...input.data,
    aggregate: input.aggregate,
    aggregateCanonicalJson: input.aggregateCanonicalJson,
    aggregateDigest: input.aggregateDigest,
    workingRevision: input.workingRevision,
    history: Object.freeze([...input.history]),
    historyCursor: input.cursor,
    replay: Object.freeze([
      ...input.data.replay,
      Object.freeze({
        requestId: input.requestId,
        sourceCommandDigest: input.sourceCommandDigest,
        effectIdentity: input.effectIdentity,
        result: input.result,
      }),
    ]),
    events: Object.freeze([...input.data.events, input.event]),
    commitCount: input.data.commitCount + 1,
  });
}

export function createPhase1ProjectHistoryState(
  input: unknown,
): Phase1ProjectHistoryInitializationResult {
  const configuration = ownDataRecord(input, ["aggregate", "ownerGeneration", "capacities"]);
  if (configuration === null) {
    return Object.freeze({ accepted: false, code: "INITIAL_CONFIGURATION_MALFORMED" });
  }
  if (!isOwnerGeneration(configuration["ownerGeneration"])) {
    return Object.freeze({ accepted: false, code: "INITIAL_OWNER_GENERATION_INVALID" });
  }
  const capacities = parseCapacities(configuration["capacities"]);
  if (capacities === null) {
    return Object.freeze({ accepted: false, code: "INITIAL_CAPACITIES_INVALID" });
  }
  const aggregate = encodePhase1LogProjectAggregate(configuration["aggregate"]);
  if (!aggregate.accepted) {
    return Object.freeze({ accepted: false, code: "INITIAL_AGGREGATE_INVALID" });
  }
  return Object.freeze({
    accepted: true,
    state: makeState({
      aggregate: aggregate.value,
      aggregateCanonicalJson: aggregate.canonicalJson,
      aggregateDigest: aggregate.digest,
      documentId: aggregate.value.documentIdentity,
      ownerGeneration: configuration["ownerGeneration"],
      workingRevision: parseWorkingRevision(0),
      durableRevision: parseDurableRevision(0),
      durableAggregateDigest: aggregate.digest,
      capacities,
      history: Object.freeze([]),
      historyCursor: parseHistoryCursor(0),
      replay: Object.freeze([]),
      events: Object.freeze([]),
      commitCount: 0,
    }),
  });
}

/** Digest-only pre-reducer replay preflight; never used for full effect composition. */
export function lookupProjectSourceCommandReplay(
  state: unknown,
  input: unknown,
): ProjectSourceCommandReplayLookupResult {
  const data = dataFor(state);
  const record = ownDataRecord(input, ["requestId", "sourceCommandDigest"]);
  if (
    data === null ||
    record === null ||
    !applicationRequestIdentityCodec.is(record["requestId"]) ||
    !isSha256Digest(record["sourceCommandDigest"])
  ) {
    return Object.freeze({ kind: "rejected", result: invariantRejected() });
  }
  return sourceCommandReplayLookup(data, record["requestId"], record["sourceCommandDigest"]);
}

export function prepareProjectDomainEffectTransition(
  state: unknown,
  input: unknown,
): ProjectDomainEffectPreparationResult {
  const data = dataFor(state);
  if (data === null) {
    return Object.freeze({ kind: "rejected", prepared: null, result: invariantRejected() });
  }
  const decoded = decodeProjectDomainEffect(input);
  if (!decoded.accepted) {
    return Object.freeze({
      kind: "rejected",
      prepared: null,
      result: rejected(null, "EFFECT_CONTRACT_INVALID"),
    });
  }
  const effect = decoded.value;
  const replay = effectReplayLookup(data, effect);
  if (replay.kind === "replayed") {
    return Object.freeze({ kind: "replayed", result: replay.result });
  }
  if (replay.kind === "request-id-mismatch") {
    return Object.freeze({ kind: "rejected", prepared: null, result: replay.result });
  }
  const aggregates = validateEffectAggregates(effect);
  if (!aggregates.accepted) {
    return preparedEffectRejection(
      state as Phase1ProjectHistoryState,
      data,
      effect,
      aggregates.reason,
    );
  }
  if (data.replay.length >= data.capacities.replayEntries) {
    return Object.freeze({
      kind: "rejected",
      prepared: null,
      result: rejected(effect.sourceRequestId, "CAPACITY_EXHAUSTED"),
    });
  }
  if (effect.documentId !== data.documentId) {
    return preparedEffectRejection(
      state as Phase1ProjectHistoryState,
      data,
      effect,
      "DOCUMENT_IDENTITY_MISMATCH",
    );
  }
  if (effect.ownerGeneration !== data.ownerGeneration) {
    return preparedEffectRejection(
      state as Phase1ProjectHistoryState,
      data,
      effect,
      "OWNER_GENERATION_MISMATCH",
    );
  }
  if (effect.expectedWorkingRevision !== data.workingRevision) {
    return preparedEffectRejection(
      state as Phase1ProjectHistoryState,
      data,
      effect,
      "STALE_WORKING_REVISION",
    );
  }
  if (
    effect.beforeAggregate.digest !== data.aggregateDigest ||
    effect.beforeAggregate.canonicalJson !== data.aggregateCanonicalJson
  ) {
    return preparedEffectRejection(
      state as Phase1ProjectHistoryState,
      data,
      effect,
      "BEFORE_AGGREGATE_MISMATCH",
    );
  }
  const nextHistoryLength = Number(data.historyCursor) + 1;
  if (
    data.commitCount >= data.capacities.commits ||
    data.events.length >= data.capacities.events ||
    nextHistoryLength > data.capacities.historyEntries
  ) {
    return preparedEffectRejection(
      state as Phase1ProjectHistoryState,
      data,
      effect,
      "CAPACITY_EXHAUSTED",
    );
  }
  if (data.workingRevision >= Number.MAX_SAFE_INTEGER) {
    return preparedEffectRejection(
      state as Phase1ProjectHistoryState,
      data,
      effect,
      "WORKING_REVISION_EXHAUSTED",
    );
  }

  const workingRevision = parseWorkingRevision(data.workingRevision + 1);
  const cursor = parseHistoryCursor(nextHistoryLength);
  const entry = Object.freeze({
    historyEntryIdentity: deriveEntryIdentity(effect),
    label: effect.commandLabel,
    sourceCommandIdentity: effect.sourceCommandIdentity,
    sourceRequestId: effect.sourceRequestId,
    sourceCommandDigest: effect.sourceCommandDigest,
    effectIdentity: effect.effectIdentity,
    createdBeforeWorkingRevision: data.workingRevision,
    createdAfterWorkingRevision: workingRevision,
    beforeAggregateDigest: aggregates.before.digest,
    afterAggregateDigest: aggregates.after.digest,
    beforeAggregate: aggregates.before.aggregate,
    afterAggregate: aggregates.after.aggregate,
    effect,
  }) satisfies ProjectDomainHistoryEntry;
  const eventSequence = parseEventSequence(data.events.length + 1);
  const committed = committedResult({
    data,
    requestId: effect.sourceRequestId,
    sourceCommandDigest: effect.sourceCommandDigest,
    sourceCommandIdentity: effect.sourceCommandIdentity,
    operation: "mutation",
    entry,
    previousWorkingRevision: data.workingRevision,
    workingRevision,
    cursor,
    historyLength: cursor,
    aggregateDigest: aggregates.after.digest,
    eventSequence,
  });
  const prepared = makePrepared({
    expectedState: state as Phase1ProjectHistoryState,
    effect,
    result: committed,
  });
  return Object.freeze({ kind: "ready", prepared, result: committed });
}

export function commitPreparedProjectDomainEffectTransition(
  state: unknown,
  prepared: unknown,
): ProjectDomainEffectCommitResult {
  const data = dataFor(state);
  const preparation = preparedFor(prepared);
  if (data === null) {
    return Object.freeze({ accepted: false, state: null, result: invariantRejected() });
  }
  const current = state as Phase1ProjectHistoryState;
  if (preparation === null) {
    return Object.freeze({ accepted: false, state: current, result: invariantRejected() });
  }
  if (preparation.expectedState !== current) {
    return Object.freeze({
      accepted: false,
      state: current,
      result: rejected(preparation.effect.sourceRequestId, "PREPARED_STATE_MISMATCH"),
    });
  }
  const rechecked = prepareProjectDomainEffectTransition(current, preparation.effect);
  if (preparation.result.kind === "project-domain-history.rejected") {
    if (
      rechecked.kind !== "rejected" ||
      rechecked.prepared === null ||
      sha256CanonicalJson(rechecked.result) !== sha256CanonicalJson(preparation.result)
    ) {
      return Object.freeze({ accepted: false, state: current, result: invariantRejected() });
    }
    return Object.freeze({
      accepted: true,
      state: replayOnlyState(
        data,
        preparation.effect.sourceRequestId,
        preparation.effect.sourceCommandDigest,
        preparation.effect.effectIdentity,
        preparation.result,
      ),
      result: preparation.result,
    });
  }
  if (rechecked.kind !== "ready") {
    return Object.freeze({ accepted: false, state: current, result: rechecked.result });
  }
  const recheckedPreparation = preparedFor(rechecked.prepared);
  if (
    recheckedPreparation === null ||
    sha256CanonicalJson(rechecked.result) !== sha256CanonicalJson(preparation.result)
  ) {
    return Object.freeze({ accepted: false, state: current, result: invariantRejected() });
  }
  const aggregates = validateEffectAggregates(preparation.effect);
  if (!aggregates.accepted) {
    return Object.freeze({
      accepted: false,
      state: current,
      result: rejected(preparation.effect.sourceRequestId, aggregates.reason),
    });
  }
  const finalEntry = Object.freeze({
    historyEntryIdentity: deriveEntryIdentity(preparation.effect),
    label: preparation.effect.commandLabel,
    sourceCommandIdentity: preparation.effect.sourceCommandIdentity,
    sourceRequestId: preparation.effect.sourceRequestId,
    sourceCommandDigest: preparation.effect.sourceCommandDigest,
    effectIdentity: preparation.effect.effectIdentity,
    createdBeforeWorkingRevision: data.workingRevision,
    createdAfterWorkingRevision: parseWorkingRevision(data.workingRevision + 1),
    beforeAggregateDigest: aggregates.before.digest,
    afterAggregateDigest: aggregates.after.digest,
    beforeAggregate: aggregates.before.aggregate,
    afterAggregate: aggregates.after.aggregate,
    effect: preparation.effect,
  }) satisfies ProjectDomainHistoryEntry;
  const history = Object.freeze([...data.history.slice(0, data.historyCursor), finalEntry]);
  const workingRevision = parseWorkingRevision(data.workingRevision + 1);
  const cursor = parseHistoryCursor(data.historyCursor + 1);
  const eventSequence = parseEventSequence(data.events.length + 1);
  const result = committedResult({
    data,
    requestId: preparation.effect.sourceRequestId,
    sourceCommandDigest: preparation.effect.sourceCommandDigest,
    sourceCommandIdentity: preparation.effect.sourceCommandIdentity,
    operation: "mutation",
    entry: finalEntry,
    previousWorkingRevision: data.workingRevision,
    workingRevision,
    cursor,
    historyLength: cursor,
    aggregateDigest: aggregates.after.digest,
    eventSequence,
  });
  const event = Object.freeze({
    eventSequence,
    operation: "mutation",
    sourceRequestId: preparation.effect.sourceRequestId,
    sourceCommandDigest: preparation.effect.sourceCommandDigest,
    historyEntryIdentity: finalEntry.historyEntryIdentity,
    baseWorkingRevision: data.workingRevision,
    resultingWorkingRevision: workingRevision,
    aggregateDigest: aggregates.after.digest,
    affectedIdentities: preparation.effect.affectedIdentities,
    invalidations: preparation.effect.invalidations,
    result: preparation.effect.eventResult,
  }) satisfies ProjectDomainHistoryEvent;
  return Object.freeze({
    accepted: true,
    state: transitionState({
      data,
      aggregate: aggregates.after.aggregate,
      aggregateCanonicalJson: aggregates.after.canonicalJson,
      aggregateDigest: aggregates.after.digest,
      workingRevision,
      history,
      cursor,
      requestId: preparation.effect.sourceRequestId,
      sourceCommandDigest: preparation.effect.sourceCommandDigest,
      effectIdentity: preparation.effect.effectIdentity,
      result,
      event,
    }),
    result,
  });
}

function navigationRejection(
  current: Phase1ProjectHistoryState,
  data: StateData,
  command: ProjectDomainHistoryNavigationCommand,
  digest: Sha256Digest,
  reason: ProjectDomainHistoryRejectionReason,
): ProjectDomainHistoryNavigationResult {
  const result = rejected(command.requestId, reason);
  if (data.replay.length >= data.capacities.replayEntries) {
    return Object.freeze({ accepted: false, state: current, result });
  }
  return Object.freeze({
    accepted: true,
    state: replayOnlyState(data, command.requestId, digest, null, result),
    result,
  });
}

export function executeProjectDomainHistoryNavigation(
  state: unknown,
  input: unknown,
): ProjectDomainHistoryNavigationResult {
  const data = dataFor(state);
  if (data === null) {
    return Object.freeze({
      accepted: false,
      state: null,
      result: invariantRejected(),
    });
  }
  const current = state as Phase1ProjectHistoryState;
  const validated = validateHistoryCoreCommand(input);
  if (!validated.accepted || validated.value.commandId === "synthetic.template-content.replace") {
    return Object.freeze({
      accepted: false,
      state: current,
      result: rejected(null, "UNKNOWN_HISTORY_OPERATION"),
    });
  }
  const command = validated.value;
  const digest = sha256Utf8(canonicalHistoryCoreCommand(command));
  const replay = sourceCommandReplayLookup(data, command.requestId, digest);
  if (replay.kind === "replayed") {
    return Object.freeze({ accepted: false, state: current, result: replay.result });
  }
  if (replay.kind === "request-id-mismatch") {
    return Object.freeze({ accepted: false, state: current, result: replay.result });
  }
  if (data.replay.length >= data.capacities.replayEntries) {
    return Object.freeze({
      accepted: false,
      state: current,
      result: rejected(command.requestId, "CAPACITY_EXHAUSTED"),
    });
  }
  if (command.documentId !== data.documentId) {
    return navigationRejection(current, data, command, digest, "DOCUMENT_IDENTITY_MISMATCH");
  }
  if (command.ownerGeneration !== data.ownerGeneration) {
    return navigationRejection(current, data, command, digest, "OWNER_GENERATION_MISMATCH");
  }
  if (command.expectedWorkingRevision !== data.workingRevision) {
    return navigationRejection(current, data, command, digest, "STALE_WORKING_REVISION");
  }
  if (data.commitCount >= data.capacities.commits || data.events.length >= data.capacities.events) {
    return navigationRejection(current, data, command, digest, "CAPACITY_EXHAUSTED");
  }
  if (data.workingRevision >= Number.MAX_SAFE_INTEGER) {
    return navigationRejection(current, data, command, digest, "WORKING_REVISION_EXHAUSTED");
  }
  const undo = command.commandId === historyUndoCommandId;
  if (undo && data.historyCursor === 0) {
    return navigationRejection(current, data, command, digest, "NOTHING_TO_UNDO");
  }
  if (!undo && data.historyCursor >= data.history.length) {
    return navigationRejection(current, data, command, digest, "NOTHING_TO_REDO");
  }
  const entry = undo ? data.history[data.historyCursor - 1] : data.history[data.historyCursor];
  if (entry === undefined) {
    return Object.freeze({ accepted: false, state: current, result: invariantRejected() });
  }
  const expectedDigest = undo ? entry.afterAggregateDigest : entry.beforeAggregateDigest;
  if (expectedDigest !== data.aggregateDigest) {
    return Object.freeze({ accepted: false, state: current, result: invariantRejected() });
  }
  const aggregate = undo ? entry.beforeAggregate : entry.afterAggregate;
  const encoded = encodePhase1LogProjectAggregate(aggregate);
  if (!encoded.accepted) {
    return Object.freeze({ accepted: false, state: current, result: invariantRejected() });
  }
  const workingRevision = parseWorkingRevision(data.workingRevision + 1);
  const cursor = parseHistoryCursor(data.historyCursor + (undo ? -1 : 1));
  const eventSequence = parseEventSequence(data.events.length + 1);
  const operation: HistoryOperation = undo ? "undo" : "redo";
  const result = committedResult({
    data,
    requestId: command.requestId,
    sourceCommandDigest: digest,
    sourceCommandIdentity: command.commandId,
    operation,
    entry,
    previousWorkingRevision: data.workingRevision,
    workingRevision,
    cursor,
    historyLength: parseHistoryCursor(data.history.length),
    aggregateDigest: encoded.digest,
    eventSequence,
  });
  const event = Object.freeze({
    eventSequence,
    operation,
    sourceRequestId: command.requestId,
    sourceCommandDigest: digest,
    historyEntryIdentity: entry.historyEntryIdentity,
    baseWorkingRevision: data.workingRevision,
    resultingWorkingRevision: workingRevision,
    aggregateDigest: encoded.digest,
    affectedIdentities: entry.effect.affectedIdentities,
    invalidations: entry.effect.invalidations,
    result: entry.effect.eventResult,
  }) satisfies ProjectDomainHistoryEvent;
  return Object.freeze({
    accepted: true,
    state: transitionState({
      data,
      aggregate: encoded.value,
      aggregateCanonicalJson: encoded.canonicalJson,
      aggregateDigest: encoded.digest,
      workingRevision,
      history: data.history,
      cursor,
      requestId: command.requestId,
      sourceCommandDigest: digest,
      effectIdentity: null,
      result,
      event,
    }),
    result,
  });
}

export function inspectPhase1ProjectHistoryState(
  state: unknown,
): ProjectDomainHistorySnapshot | null {
  const data = dataFor(state);
  if (data === null) return null;
  return Object.freeze({
    documentId: data.documentId,
    ownerGeneration: data.ownerGeneration,
    workingRevision: data.workingRevision,
    durableRevision: data.durableRevision,
    durableAggregateDigest: data.durableAggregateDigest,
    aggregate: data.aggregate,
    aggregateCanonicalJson: data.aggregateCanonicalJson,
    aggregateDigest: data.aggregateDigest,
    dirty: Number(data.workingRevision) !== Number(data.durableRevision),
    historyCursor: data.historyCursor,
    historyLength: parseHistoryCursor(data.history.length),
    canUndo: data.historyCursor > 0,
    canRedo: data.historyCursor < data.history.length,
    history: data.history,
    events: data.events,
    replayEntryCount: data.replay.length,
    commitCount: data.commitCount,
  });
}

export function capturePhase1ProjectWorkingRevision(
  state: unknown,
): CapturedPhase1ProjectWorkingRevision | null {
  const data = dataFor(state);
  if (data === null) return null;
  const capturedRevisionIdentity = capturedRevisionIdentityCodec.parse(
    `urn:rsrender:captured-phase1-project:${sha256CanonicalJson({
      documentId: data.documentId,
      ownerGeneration: data.ownerGeneration,
      workingRevision: data.workingRevision,
      aggregateDigest: data.aggregateDigest,
    })}`,
  );
  return Object.freeze({
    capturedRevisionIdentity,
    documentId: data.documentId,
    ownerGeneration: data.ownerGeneration,
    workingRevision: data.workingRevision,
    aggregateDigest: data.aggregateDigest,
    aggregateCanonicalJson: data.aggregateCanonicalJson,
    aggregate: data.aggregate,
  });
}
