import {
  applicationRequestIdentityCodec,
  canonicalHistoryCoreCommand,
  capturedRevisionIdentityCodec,
  historyCoreContractVersion,
  historyEntryIdentityCodec,
  historyRedoCommandId,
  historyUndoCommandId,
  parseDurableRevision,
  parseHistoryCursor,
  parseWorkingRevision,
  sha256CanonicalJson,
  validateHistoryCoreCommand,
} from "@rsrender/contracts";
import type {
  ApplicationRequestIdentity,
  CapturedRevisionIdentity,
  DurableRevision,
  HistoryCoreCommand,
  HistoryCoreCommandResult,
  HistoryCoreCommittedResult,
  HistoryCoreRejectedResult,
  HistoryCoreRejectionReason,
  HistoryCursor,
  HistoryEntryIdentity,
  HistoryOperation,
  OwnerGeneration,
  SyntheticReplaceTemplateContentCommand,
  WorkingRevision,
} from "@rsrender/contracts";
import type { Sha256Digest } from "@rsrender/contracts";
import { decodeLogTemplateAggregate } from "@rsrender/domain";
import type { LogTemplateAggregate } from "@rsrender/domain";

import {
  createInMemoryApplicationService,
  type InMemoryApplicationService,
} from "./in-memory-application-service.js";

export const inMemoryHistoryCoreRevision = "bld-011-v1" as const;

export interface InMemoryHistoryCoreCapacities {
  readonly replayEntries: number;
  readonly historyEntries: number;
  readonly commits: number;
  readonly events: number;
  readonly subscriptionBatch: number;
}

export interface HistoryEntry {
  readonly historyEntryIdentity: HistoryEntryIdentity;
  readonly label: "Replace template content";
  readonly commandId: "synthetic.template-content.replace";
  readonly sourceRequestId: ApplicationRequestIdentity;
  readonly createdBeforeWorkingRevision: WorkingRevision;
  readonly createdAfterWorkingRevision: WorkingRevision;
  readonly beforeAggregateDigest: Sha256Digest;
  readonly afterAggregateDigest: Sha256Digest;
  readonly beforeAggregate: LogTemplateAggregate;
  readonly afterAggregate: LogTemplateAggregate;
  readonly forwardCommand: SyntheticReplaceTemplateContentCommand;
}

export interface CapturedWorkingRevision {
  readonly capturedRevisionIdentity: CapturedRevisionIdentity;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly workingRevision: WorkingRevision;
  readonly aggregateDigest: Sha256Digest;
  readonly aggregate: LogTemplateAggregate;
}

export interface InMemoryHistoryCoreSnapshot {
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly workingRevision: WorkingRevision;
  readonly durableRevision: DurableRevision;
  readonly durableAggregateDigest: Sha256Digest;
  readonly aggregate: LogTemplateAggregate;
  readonly aggregateDigest: Sha256Digest;
  readonly dirty: boolean;
  readonly historyCursor: HistoryCursor;
  readonly historyLength: HistoryCursor;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly history: readonly HistoryEntry[];
  readonly replayEntryCount: number;
  readonly executionTranscriptCount: number;
}

export interface InMemoryHistoryCore {
  readonly execute: (command: HistoryCoreCommand) => Promise<HistoryCoreCommandResult>;
  readonly captureWorkingRevision: () => CapturedWorkingRevision;
  readonly inspect: () => InMemoryHistoryCoreSnapshot;
}

export type HistoryCoreInitializationResult =
  | { readonly accepted: true; readonly core: InMemoryHistoryCore }
  | {
      readonly accepted: false;
      readonly code:
        | "INITIAL_AGGREGATE_INVALID"
        | "INITIAL_CAPACITIES_INVALID"
        | "INITIAL_CONFIGURATION_MALFORMED"
        | "INITIAL_OWNER_GENERATION_INVALID";
    };

type ReplayEntry = {
  readonly canonicalCommand: string;
  readonly result: HistoryCoreCommandResult;
};

type DataRecord = Readonly<Record<string, unknown>>;

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

function parseCapacities(input: unknown): InMemoryHistoryCoreCapacities | null {
  const record = ownDataRecord(input, [
    "replayEntries",
    "historyEntries",
    "commits",
    "events",
    "subscriptionBatch",
  ]);
  if (record === null) return null;
  if (
    !isPositiveSafeInteger(record["replayEntries"]) ||
    !isPositiveSafeInteger(record["historyEntries"]) ||
    !isPositiveSafeInteger(record["commits"]) ||
    !isPositiveSafeInteger(record["events"]) ||
    !isPositiveSafeInteger(record["subscriptionBatch"])
  ) {
    return null;
  }
  return Object.freeze({
    replayEntries: record["replayEntries"],
    historyEntries: record["historyEntries"],
    commits: record["commits"],
    events: record["events"],
    subscriptionBatch: record["subscriptionBatch"],
  });
}

function rejected(
  requestId: ApplicationRequestIdentity | null,
  reason: HistoryCoreRejectionReason,
): HistoryCoreRejectedResult {
  return Object.freeze({
    contractVersion: historyCoreContractVersion,
    messageType: "command-result",
    kind: "history.rejected",
    requestId,
    reason,
    changed: false,
    safeActions: Object.freeze([] as const),
  });
}

function historyEntryIdentity(input: {
  readonly command: SyntheticReplaceTemplateContentCommand;
  readonly beforeWorkingRevision: WorkingRevision;
  readonly afterWorkingRevision: WorkingRevision;
  readonly beforeAggregateDigest: Sha256Digest;
  readonly afterAggregateDigest: Sha256Digest;
}): HistoryEntryIdentity {
  const digest = sha256CanonicalJson({
    commandId: input.command.commandId,
    sourceRequestId: input.command.requestId,
    documentId: input.command.documentId,
    ownerGeneration: input.command.ownerGeneration,
    beforeWorkingRevision: input.beforeWorkingRevision,
    afterWorkingRevision: input.afterWorkingRevision,
    beforeAggregateDigest: input.beforeAggregateDigest,
    afterAggregateDigest: input.afterAggregateDigest,
  });
  return historyEntryIdentityCodec.parse(
    `urn:rsrender:history-entry:${digest.slice("sha256:".length)}`,
  );
}

function delegateRequestIdentity(
  command: HistoryCoreCommand,
  operation: "undo" | "redo",
  entry: HistoryEntry,
): ApplicationRequestIdentity {
  const digest = sha256CanonicalJson({
    operation,
    sourceRequestId: command.requestId,
    historyEntryIdentity: entry.historyEntryIdentity,
    expectedWorkingRevision: command.expectedWorkingRevision,
  });
  return applicationRequestIdentityCodec.parse(
    `urn:rsrender:bld-011:delegate:${digest.slice("sha256:".length)}`,
  );
}

function mapDomainRejection(reason: string): HistoryCoreRejectionReason {
  if (reason === "CAPACITY_EXHAUSTED") return "CAPACITY_EXHAUSTED";
  if (reason === "DOCUMENT_IDENTITY_MISMATCH") return "DOCUMENT_IDENTITY_MISMATCH";
  if (reason === "OWNER_GENERATION_MISMATCH") return "OWNER_GENERATION_MISMATCH";
  if (reason === "STALE_WORKING_REVISION") return "STALE_WORKING_REVISION";
  if (reason === "REQUEST_ID_REUSE_MISMATCH") return "REQUEST_ID_REUSE_MISMATCH";
  return "DOMAIN_PRECONDITION_FAILED";
}

function contractReason(code: string): HistoryCoreRejectionReason {
  if (code === "HISTORY_CONTRACT_UNSUPPORTED_VERSION") {
    return "CONTRACT_UNSUPPORTED_VERSION";
  }
  if (code === "HISTORY_CONTRACT_UNKNOWN_TAG") return "UNKNOWN_COMMAND";
  return "CONTRACT_MALFORMED";
}

function historyInvariantFailure(): never {
  throw new Error("BLD011_HISTORY_INTEGRITY_INVARIANT");
}

class InMemoryHistoryCoreImplementation implements InMemoryHistoryCore {
  readonly #service: InMemoryApplicationService;
  readonly #capacities: InMemoryHistoryCoreCapacities;
  readonly #durableRevision = parseDurableRevision(0);
  readonly #durableAggregateDigest: Sha256Digest;
  readonly #replayEntries = new Map<ApplicationRequestIdentity, ReplayEntry>();
  #history: readonly HistoryEntry[] = Object.freeze([]);
  #historyCursor = parseHistoryCursor(0);
  #tail: Promise<void> = Promise.resolve();

  constructor(service: InMemoryApplicationService, capacities: InMemoryHistoryCoreCapacities) {
    this.#service = service;
    this.#capacities = capacities;
    this.#durableAggregateDigest = sha256CanonicalJson(service.inspect().aggregate);
  }

  execute(input: unknown): Promise<HistoryCoreCommandResult> {
    const validation = validateHistoryCoreCommand(input);
    if (!validation.accepted) {
      return Promise.resolve(rejected(null, contractReason(validation.code)));
    }
    const command = validation.value;
    const run = this.#tail.then(() => this.#executeSerial(command));
    this.#tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  captureWorkingRevision(): CapturedWorkingRevision {
    const snapshot = this.#service.inspect();
    const aggregateDigest = sha256CanonicalJson(snapshot.aggregate);
    const captureDigest = sha256CanonicalJson({
      documentId: snapshot.documentId,
      ownerGeneration: snapshot.ownerGeneration,
      workingRevision: snapshot.workingRevision,
      aggregateDigest,
    });
    return Object.freeze({
      capturedRevisionIdentity: capturedRevisionIdentityCodec.parse(
        `urn:rsrender:captured-revision:${captureDigest.slice("sha256:".length)}`,
      ),
      documentId: snapshot.documentId,
      ownerGeneration: snapshot.ownerGeneration,
      workingRevision: snapshot.workingRevision,
      aggregateDigest,
      aggregate: snapshot.aggregate,
    });
  }

  inspect(): InMemoryHistoryCoreSnapshot {
    const snapshot = this.#service.inspect();
    const aggregateDigest = sha256CanonicalJson(snapshot.aggregate);
    return Object.freeze({
      documentId: snapshot.documentId,
      ownerGeneration: snapshot.ownerGeneration,
      workingRevision: snapshot.workingRevision,
      durableRevision: this.#durableRevision,
      durableAggregateDigest: this.#durableAggregateDigest,
      aggregate: snapshot.aggregate,
      aggregateDigest,
      dirty: Number(snapshot.workingRevision) !== Number(this.#durableRevision),
      historyCursor: this.#historyCursor,
      historyLength: parseHistoryCursor(this.#history.length),
      canUndo: this.#historyCursor > 0,
      canRedo: this.#historyCursor < this.#history.length,
      history: this.#history,
      replayEntryCount: this.#replayEntries.size,
      executionTranscriptCount: snapshot.commits.length,
    });
  }

  async #executeSerial(command: HistoryCoreCommand): Promise<HistoryCoreCommandResult> {
    const canonicalCommand = canonicalHistoryCoreCommand(command);
    const prior = this.#replayEntries.get(command.requestId);
    if (prior !== undefined) {
      return prior.canonicalCommand === canonicalCommand
        ? prior.result
        : rejected(command.requestId, "REQUEST_ID_REUSE_MISMATCH");
    }
    if (this.#replayEntries.size >= this.#capacities.replayEntries) {
      return rejected(command.requestId, "CAPACITY_EXHAUSTED");
    }
    const snapshot = this.#service.inspect();
    let result: HistoryCoreCommandResult;
    if (command.documentId !== snapshot.documentId) {
      result = rejected(command.requestId, "DOCUMENT_IDENTITY_MISMATCH");
    } else if (command.ownerGeneration !== snapshot.ownerGeneration) {
      result = rejected(command.requestId, "OWNER_GENERATION_MISMATCH");
    } else if (command.expectedWorkingRevision !== snapshot.workingRevision) {
      result = rejected(command.requestId, "STALE_WORKING_REVISION");
    } else if (command.kind === historyUndoCommandId) {
      result = await this.#undo(command);
    } else if (command.kind === historyRedoCommandId) {
      result = await this.#redo(command);
    } else {
      result = await this.#mutate(command);
    }
    this.#replayEntries.set(command.requestId, Object.freeze({ canonicalCommand, result }));
    return result;
  }

  async #mutate(
    command: SyntheticReplaceTemplateContentCommand,
  ): Promise<HistoryCoreCommandResult> {
    const before = this.#service.inspect();
    const nextHistoryLength = this.#historyCursor + 1;
    if (nextHistoryLength > this.#capacities.historyEntries) {
      return rejected(command.requestId, "CAPACITY_EXHAUSTED");
    }
    if (before.workingRevision >= Number.MAX_SAFE_INTEGER) {
      return rejected(command.requestId, "DOMAIN_PRECONDITION_FAILED");
    }
    const expectedAfter = decodeLogTemplateAggregate({
      ...before.aggregate,
      currentContentDigest: command.payload.newContentDigest,
    });
    if (!expectedAfter.accepted) {
      return rejected(command.requestId, "DOMAIN_PRECONDITION_FAILED");
    }
    const nextWorkingRevision = parseWorkingRevision(before.workingRevision + 1);
    const beforeDigest = sha256CanonicalJson(before.aggregate);
    const afterDigest = sha256CanonicalJson(expectedAfter.value);
    const entry: HistoryEntry = Object.freeze({
      historyEntryIdentity: historyEntryIdentity({
        command,
        beforeWorkingRevision: before.workingRevision,
        afterWorkingRevision: nextWorkingRevision,
        beforeAggregateDigest: beforeDigest,
        afterAggregateDigest: afterDigest,
      }),
      label: "Replace template content",
      commandId: command.commandId,
      sourceRequestId: command.requestId,
      createdBeforeWorkingRevision: before.workingRevision,
      createdAfterWorkingRevision: nextWorkingRevision,
      beforeAggregateDigest: beforeDigest,
      afterAggregateDigest: afterDigest,
      beforeAggregate: before.aggregate,
      afterAggregate: expectedAfter.value,
      forwardCommand: command,
    });
    const nextHistory = Object.freeze([...this.#history.slice(0, this.#historyCursor), entry]);
    const nextCursor = parseHistoryCursor(nextHistoryLength);
    const committed = this.#prepareCommitted(
      command,
      "mutation",
      entry,
      before.workingRevision,
      nextWorkingRevision,
      nextCursor,
      nextCursor,
      afterDigest,
    );
    const domainResult = await this.#service.execute(command);
    if (domainResult.kind !== "domainCommitted") {
      return rejected(command.requestId, mapDomainRejection(domainResult.reason));
    }
    this.#history = nextHistory;
    this.#historyCursor = nextCursor;
    return committed;
  }

  async #undo(command: HistoryCoreCommand): Promise<HistoryCoreCommandResult> {
    if (this.#historyCursor === 0) return rejected(command.requestId, "NOTHING_TO_UNDO");
    const entry = this.#history[this.#historyCursor - 1];
    if (entry === undefined) return historyInvariantFailure();
    const before = this.#service.inspect();
    if (sha256CanonicalJson(before.aggregate) !== entry.afterAggregateDigest) {
      return historyInvariantFailure();
    }
    if (before.workingRevision >= Number.MAX_SAFE_INTEGER) {
      return rejected(command.requestId, "DOMAIN_PRECONDITION_FAILED");
    }
    const nextWorkingRevision = parseWorkingRevision(before.workingRevision + 1);
    const nextCursor = parseHistoryCursor(this.#historyCursor - 1);
    const delegate: SyntheticReplaceTemplateContentCommand = Object.freeze({
      contractVersion: 1,
      messageType: "command",
      scope: "document-domain",
      kind: "synthetic.template-content.replace",
      requestId: delegateRequestIdentity(command, "undo", entry),
      commandId: "synthetic.template-content.replace",
      documentId: command.documentId,
      ownerGeneration: command.ownerGeneration,
      expectedWorkingRevision: command.expectedWorkingRevision,
      payload: Object.freeze({ newContentDigest: entry.beforeAggregate.currentContentDigest }),
    });
    const committed = this.#prepareCommitted(
      command,
      "undo",
      entry,
      before.workingRevision,
      nextWorkingRevision,
      nextCursor,
      parseHistoryCursor(this.#history.length),
      entry.beforeAggregateDigest,
    );
    const domainResult = await this.#service.execute(delegate);
    if (domainResult.kind !== "domainCommitted") {
      return rejected(command.requestId, mapDomainRejection(domainResult.reason));
    }
    this.#historyCursor = nextCursor;
    return committed;
  }

  async #redo(command: HistoryCoreCommand): Promise<HistoryCoreCommandResult> {
    if (this.#historyCursor >= this.#history.length) {
      return rejected(command.requestId, "NOTHING_TO_REDO");
    }
    const entry = this.#history[this.#historyCursor];
    if (entry === undefined) return historyInvariantFailure();
    const before = this.#service.inspect();
    if (sha256CanonicalJson(before.aggregate) !== entry.beforeAggregateDigest) {
      return historyInvariantFailure();
    }
    if (before.workingRevision >= Number.MAX_SAFE_INTEGER) {
      return rejected(command.requestId, "DOMAIN_PRECONDITION_FAILED");
    }
    const nextWorkingRevision = parseWorkingRevision(before.workingRevision + 1);
    const nextCursor = parseHistoryCursor(this.#historyCursor + 1);
    const delegate: SyntheticReplaceTemplateContentCommand = Object.freeze({
      contractVersion: 1,
      messageType: "command",
      scope: "document-domain",
      kind: "synthetic.template-content.replace",
      requestId: delegateRequestIdentity(command, "redo", entry),
      commandId: "synthetic.template-content.replace",
      documentId: command.documentId,
      ownerGeneration: command.ownerGeneration,
      expectedWorkingRevision: command.expectedWorkingRevision,
      payload: Object.freeze({ newContentDigest: entry.afterAggregate.currentContentDigest }),
    });
    const committed = this.#prepareCommitted(
      command,
      "redo",
      entry,
      before.workingRevision,
      nextWorkingRevision,
      nextCursor,
      parseHistoryCursor(this.#history.length),
      entry.afterAggregateDigest,
    );
    const domainResult = await this.#service.execute(delegate);
    if (domainResult.kind !== "domainCommitted") {
      return rejected(command.requestId, mapDomainRejection(domainResult.reason));
    }
    this.#historyCursor = nextCursor;
    return committed;
  }

  #prepareCommitted(
    command: HistoryCoreCommand,
    operation: HistoryOperation,
    entry: HistoryEntry,
    previousWorkingRevision: WorkingRevision,
    workingRevision: WorkingRevision,
    historyCursor: HistoryCursor,
    historyLength: HistoryCursor,
    aggregateDigest: Sha256Digest,
  ): HistoryCoreCommittedResult {
    return Object.freeze({
      contractVersion: historyCoreContractVersion,
      messageType: "command-result",
      kind: "history.committed",
      requestId: command.requestId,
      commandId: command.commandId,
      operation,
      documentId: command.documentId,
      ownerGeneration: command.ownerGeneration,
      previousWorkingRevision,
      workingRevision,
      durableRevision: this.#durableRevision,
      historyEntryIdentity: entry.historyEntryIdentity,
      historyCursor,
      historyLength,
      aggregateDigest,
      dirty: Number(workingRevision) !== Number(this.#durableRevision),
      changed: true,
    });
  }
}

export function createInMemoryHistoryCore(input: unknown): HistoryCoreInitializationResult {
  const configuration = ownDataRecord(input, ["aggregate", "ownerGeneration", "capacities"]);
  if (configuration === null) {
    return Object.freeze({ accepted: false, code: "INITIAL_CONFIGURATION_MALFORMED" });
  }
  const capacities = parseCapacities(configuration["capacities"]);
  if (capacities === null) {
    return Object.freeze({ accepted: false, code: "INITIAL_CAPACITIES_INVALID" });
  }
  const serviceResult = createInMemoryApplicationService({
    aggregate: configuration["aggregate"],
    ownerGeneration: configuration["ownerGeneration"],
    capacities: {
      replayEntries: capacities.replayEntries,
      commits: capacities.commits,
      events: capacities.events,
      subscriptionBatch: capacities.subscriptionBatch,
    },
  });
  if (!serviceResult.accepted) {
    if (serviceResult.code === "INITIAL_AGGREGATE_INVALID") {
      return Object.freeze({ accepted: false, code: "INITIAL_AGGREGATE_INVALID" });
    }
    if (serviceResult.code === "INITIAL_OWNER_GENERATION_INVALID") {
      return Object.freeze({ accepted: false, code: "INITIAL_OWNER_GENERATION_INVALID" });
    }
    return Object.freeze({ accepted: false, code: "INITIAL_CONFIGURATION_MALFORMED" });
  }
  return Object.freeze({
    accepted: true,
    core: new InMemoryHistoryCoreImplementation(serviceResult.service, capacities),
  });
}
