import {
  canonicalizeJson,
  createOverrideRenderDatasetProjection,
  createProjectDomainEffect,
  decodeOverrideRenderDatasetCommand,
  decodeOverrideRenderDatasetCommandResult,
  decodeOverrideRenderDatasetQuery,
  decodeOverrideRenderDatasetQueryResult,
  encodeOverrideRenderDatasetCommand,
  historyRedoCommandId,
  historyUndoCommandId,
  maximumOverrideRenderDatasetProjectionOverrides,
  sha256Utf8,
  type CanonicalJsonValue,
  type OverrideRenderDatasetCommand,
  type OverrideRenderDatasetCommandId,
  type OverrideRenderDatasetCommandResult,
  type OverrideRenderDatasetCommittedResult,
  type OverrideRenderDatasetProjection,
  type OverrideRenderDatasetProjectionResult,
  type OverrideRenderDatasetQuery,
  type OverrideRenderDatasetQueryResult,
  type OverrideRenderDatasetRejectedResult,
  type OverrideRenderDatasetRejectionReason,
  type OverrideRenderAssociationState,
  type OverrideRenderContentState,
  type OverrideRenderDomainValueProjection,
  type OverrideRenderEligibilityState,
  type OverrideRenderFinalityState,
  type OverrideRenderUnitState,
  type OverrideRenderValueProjection,
  type OverrideRenderValueProvenance,
  type OverrideStateProjection,
  type Sha256Digest,
} from "@rsrender/contracts";
import {
  assembleBoundedOverrideRenderDataset,
  createDisplayValueOverride,
  createNextPresentationOverrideCollection,
  createPresentationOverrideCollection,
  createProjectInputRevisionHandle,
  decodePhase1LogProjectAggregate,
  decodePresentationOverrideCollection,
  derivePresentationOverrideIdentity,
  digestSourceBaselineValue,
  displayValueTypeOf,
  encodePhase1LogProjectAggregate,
  encodePresentationOverrideCollection,
  encodeSourceSnapshot,
  getProjectInputRevisionHandle,
  type DisplayValueOverride,
  type BoundedOverrideAssemblyResult,
  type DomainValueRecord,
  type Phase1LogProjectAggregate,
  type PresentationOverrideCollection,
  type ProjectInputRevisionHandle,
  type SourceFieldRecord,
  type SourceSnapshot,
} from "@rsrender/domain";
import {
  createInMemoryPhase1ProjectHistoryCore,
  markInMemoryPhase1ProjectHistoryCoreDurableRevision,
  type InMemoryPhase1ProjectHistoryCore,
} from "./in-memory-history-core.js";
import type {
  CapturedPhase1ProjectWorkingRevision,
  ProjectDomainHistoryCommittedResult,
  ProjectDomainHistorySnapshot,
} from "./project-domain-effect-state.js";

export const inMemoryOverrideRenderDatasetServiceRevision =
  "bld-019-in-memory-override-render-dataset-v1" as const;

export interface InMemoryOverrideRenderDatasetServiceCapacities {
  readonly replayEntries: number;
  readonly historyEntries: number;
  readonly commits: number;
  readonly events: number;
  readonly subscriptionBatch: number;
  readonly collectionEntries: number;
  readonly commandReplayEntries: number;
}

export interface InMemoryOverrideRenderDatasetService {
  readonly setDisplayValue: (input: unknown) => Promise<OverrideRenderDatasetCommandResult>;
  readonly undo: (input: unknown) => Promise<OverrideRenderDatasetCommandResult>;
  readonly redo: (input: unknown) => Promise<OverrideRenderDatasetCommandResult>;
  readonly getProjection: (input: unknown) => Promise<OverrideRenderDatasetQueryResult>;
}

export interface CapturedOverrideRenderDatasetWorkingState {
  readonly project: CapturedPhase1ProjectWorkingRevision;
  readonly presentationOverrideCollections: readonly PresentationOverrideCollection[];
}

export type OverrideRenderDatasetServiceInitializationResult =
  | { readonly accepted: true; readonly service: InMemoryOverrideRenderDatasetService }
  | {
      readonly accepted: false;
      readonly code:
        | "INITIAL_AGGREGATE_INVALID"
        | "INITIAL_CAPACITIES_INVALID"
        | "INITIAL_COLLECTION_INVALID"
        | "INITIAL_CONFIGURATION_MALFORMED"
        | "INITIAL_OWNER_GENERATION_INVALID";
    };

type RetainedCollection = {
  readonly logicalDigest: Sha256Digest;
  readonly canonicalJson: string;
  readonly encodingDigest: Sha256Digest;
  readonly value: PresentationOverrideCollection;
};

type ExternalReplayEntry = {
  readonly requestId: string;
  readonly commandDigest: Sha256Digest;
  readonly result: OverrideRenderDatasetCommandResult;
};

type WrapperState = {
  readonly collections: readonly RetainedCollection[];
  readonly replay: readonly ExternalReplayEntry[];
};

type Initialization = {
  readonly aggregate: Phase1LogProjectAggregate;
  readonly ownerGeneration: number;
  readonly capacities: InMemoryOverrideRenderDatasetServiceCapacities;
  readonly collections: readonly RetainedCollection[];
};

type DataRecord = Readonly<Record<string, unknown>>;

function ownDataRecord(input: unknown, fields: readonly string[]): DataRecord | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) return null;
  const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !fields.includes(key)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
    copy[key] = descriptor.value;
  }
  return fields.every((field) => Object.hasOwn(copy, field)) ? copy : null;
}

function ownArray(input: unknown): readonly unknown[] | null {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) return null;
  for (const key of Reflect.ownKeys(input)) {
    if (key === "length") continue;
    if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= input.length) {
      return null;
    }
  }
  const result: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
    result.push(descriptor.value);
  }
  return Object.freeze(result);
}

function positiveCapacity(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) > 0 ? (value as number) : null;
}

function parseCapacities(input: unknown): InMemoryOverrideRenderDatasetServiceCapacities | null {
  const fields = [
    "replayEntries",
    "historyEntries",
    "commits",
    "events",
    "subscriptionBatch",
    "collectionEntries",
    "commandReplayEntries",
  ] as const;
  const record = ownDataRecord(input, fields);
  if (record === null) return null;
  const parsed = Object.fromEntries(
    fields.map((field) => [field, positiveCapacity(record[field])]),
  ) as Record<(typeof fields)[number], number | null>;
  if (fields.some((field) => parsed[field] === null)) return null;
  return Object.freeze({
    replayEntries: parsed.replayEntries as number,
    historyEntries: parsed.historyEntries as number,
    commits: parsed.commits as number,
    events: parsed.events as number,
    subscriptionBatch: parsed.subscriptionBatch as number,
    collectionEntries: parsed.collectionEntries as number,
    commandReplayEntries: parsed.commandReplayEntries as number,
  });
}

function retainedCollection(input: unknown): RetainedCollection | null {
  const decoded = decodePresentationOverrideCollection(input);
  if (
    !decoded.accepted ||
    decoded.value.items.length > maximumOverrideRenderDatasetProjectionOverrides
  ) {
    return null;
  }
  const encoded = encodePresentationOverrideCollection(decoded.value);
  if (!encoded.accepted) return null;
  return Object.freeze({
    logicalDigest: decoded.value.logicalDigest,
    canonicalJson: encoded.canonicalJson,
    encodingDigest: encoded.digest,
    value: decoded.value,
  });
}

function parseInitialization(input: unknown):
  | { readonly accepted: true; readonly value: Initialization }
  | {
      readonly accepted: false;
      readonly code: Exclude<
        OverrideRenderDatasetServiceInitializationResult,
        { readonly accepted: true }
      >["code"];
    } {
  const record = ownDataRecord(input, [
    "aggregate",
    "ownerGeneration",
    "capacities",
    "presentationOverrideCollections",
  ]);
  if (record === null) {
    return Object.freeze({ accepted: false, code: "INITIAL_CONFIGURATION_MALFORMED" });
  }
  const aggregate = decodePhase1LogProjectAggregate(record["aggregate"]);
  if (!aggregate.accepted || aggregate.value.phase1Inputs.acceptedSourceSnapshot === null) {
    return Object.freeze({ accepted: false, code: "INITIAL_AGGREGATE_INVALID" });
  }
  if (
    !Number.isSafeInteger(record["ownerGeneration"]) ||
    (record["ownerGeneration"] as number) < 0
  ) {
    return Object.freeze({ accepted: false, code: "INITIAL_OWNER_GENERATION_INVALID" });
  }
  const capacities = parseCapacities(record["capacities"]);
  if (capacities === null) {
    return Object.freeze({ accepted: false, code: "INITIAL_CAPACITIES_INVALID" });
  }
  const suppliedCollections = ownArray(record["presentationOverrideCollections"]);
  if (suppliedCollections === null || suppliedCollections.length > 1) {
    return Object.freeze({ accepted: false, code: "INITIAL_COLLECTION_INVALID" });
  }
  const collections: RetainedCollection[] = [];
  for (const supplied of suppliedCollections) {
    const collection = retainedCollection(supplied);
    if (collection === null) {
      return Object.freeze({ accepted: false, code: "INITIAL_COLLECTION_INVALID" });
    }
    collections.push(collection);
  }
  const handle = getProjectInputRevisionHandle(aggregate.value, "presentation-overrides");
  if (!handle.accepted) {
    return Object.freeze({ accepted: false, code: "INITIAL_AGGREGATE_INVALID" });
  }
  if (
    (handle.value.state === "empty" && collections.length !== 0) ||
    (handle.value.state === "current" &&
      (collections.length !== 1 ||
        collections[0]?.logicalDigest !== handle.value.contentDigest ||
        collections[0]?.value.projectRevision !== handle.value.projectRevision ||
        collections[0]?.value.revisionIdentity !== handle.value.revisionIdentity))
  ) {
    return Object.freeze({ accepted: false, code: "INITIAL_COLLECTION_INVALID" });
  }
  if (collections.length > capacities.collectionEntries) {
    return Object.freeze({ accepted: false, code: "INITIAL_CAPACITIES_INVALID" });
  }
  return Object.freeze({
    accepted: true,
    value: Object.freeze({
      aggregate: aggregate.value,
      ownerGeneration: record["ownerGeneration"] as number,
      capacities,
      collections: Object.freeze(collections),
    }),
  });
}

function rejected(
  messageType: "command-result" | "query-result",
  requestId: string | null,
  reason: OverrideRenderDatasetRejectionReason,
): OverrideRenderDatasetRejectedResult {
  const decoded =
    messageType === "command-result"
      ? decodeOverrideRenderDatasetCommandResult({
          contractVersion: 1,
          messageType,
          kind: "override-render-dataset.rejected",
          requestId,
          reason,
          changed: false,
          safeActions: [],
        })
      : decodeOverrideRenderDatasetQueryResult({
          contractVersion: 1,
          messageType,
          kind: "override-render-dataset.rejected",
          requestId,
          reason,
          changed: false,
          safeActions: [],
        });
  if (!decoded.accepted || decoded.value.kind !== "override-render-dataset.rejected") {
    throw new Error("BLD-019 rejection invariant");
  }
  return decoded.value;
}

function mapHistoryReason(reason: string): OverrideRenderDatasetRejectionReason {
  if (reason === "CAPACITY_EXHAUSTED" || reason === "WORKING_REVISION_EXHAUSTED") {
    return "CAPACITY_EXHAUSTED";
  }
  if (reason === "DOCUMENT_IDENTITY_MISMATCH") return "DOCUMENT_IDENTITY_MISMATCH";
  if (reason === "OWNER_GENERATION_MISMATCH") return "OWNER_GENERATION_MISMATCH";
  if (reason === "REQUEST_ID_REUSE_MISMATCH") return "REQUEST_ID_REUSE_MISMATCH";
  if (reason === "STALE_WORKING_REVISION" || reason === "BEFORE_AGGREGATE_MISMATCH") {
    return "STALE_WORKING_REVISION";
  }
  if (reason === "NOTHING_TO_UNDO") return "NOTHING_TO_UNDO";
  if (reason === "NOTHING_TO_REDO") return "NOTHING_TO_REDO";
  return "INTERNAL_STATE_INVALID";
}

function mapOverrideFailure(code: string): OverrideRenderDatasetRejectionReason {
  if (code.includes("VALUE_TYPE")) return "INVALID_VALUE_TYPE";
  if (code.includes("UNIT")) return "INVALID_UNIT";
  if (code.includes("PROVENANCE") || code.includes("WRONG_TYPE")) {
    return "DOMAIN_PRECONDITION_FAILED";
  }
  return "DOMAIN_PRECONDITION_FAILED";
}

function mapAssemblyFailure(code: string): OverrideRenderDatasetRejectionReason {
  if (code.includes("STALE_BASELINE")) return "INVALID_BASELINE";
  if (code.includes("RETYPE")) return "INVALID_VALUE_TYPE";
  if (code.includes("UNIT")) return "INVALID_UNIT";
  if (code.includes("TARGET_DELETED")) return "TARGET_NOT_FOUND";
  if (code.includes("UNSUPPORTED")) return "UNSUPPORTED_CURRENT_INPUT";
  return "PROJECTION_ASSEMBLY_FAILED";
}

function commandIdentity(commandId: OverrideRenderDatasetCommandId): string {
  return `urn:rsrender:command:${commandId}`;
}

function jsonValue(input: unknown): CanonicalJsonValue {
  return JSON.parse(canonicalizeJson(input)) as CanonicalJsonValue;
}

function typedJsonValue<Value>(input: unknown): Value {
  return jsonValue(input) as unknown as Value;
}

function domainValueProjection(value: DomainValueRecord): OverrideRenderDomainValueProjection {
  const valueType = displayValueTypeOf(value);
  if (!valueType.accepted) throw new Error("BLD-019 value type invariant");
  const body = Object.freeze({
    content: typedJsonValue<OverrideRenderContentState>(value.content),
    association: typedJsonValue<OverrideRenderAssociationState>(value.association),
    finality: typedJsonValue<OverrideRenderFinalityState>(value.finality),
    eligibility: typedJsonValue<OverrideRenderEligibilityState>(value.eligibility),
    unit: typedJsonValue<OverrideRenderUnitState>(value.unit),
    provenance: typedJsonValue<OverrideRenderValueProvenance>(value.provenance),
  });
  const canonicalJson = canonicalizeJson(body);
  return Object.freeze({
    valueType: valueType.value,
    contentState: value.content.kind,
    ...body,
    canonicalJson,
    digest: sha256Utf8(canonicalJson),
  });
}

function overrideState(item: DisplayValueOverride): OverrideStateProjection {
  return Object.freeze({
    presentationOverrideIdentity: item.presentationOverrideIdentity,
    localOverrideIdentity: item.localOverrideIdentity,
    targetSourceContextIdentity: item.targetSourceContextIdentity,
    targetSourceEntityIdentity: item.targetSourceEntityIdentity,
    targetSourceFieldIdentity: item.targetSourceFieldIdentity,
    expectedSourceValueDigest: item.expectedSourceValueDigest,
    expectedSourceValueType: item.expectedSourceValueType,
    expectedSourceUnit: typedJsonValue<OverrideRenderUnitState>(item.expectedSourceUnit),
    replacementValue: domainValueProjection(item.replacementValue),
    overrideRevision: item.overrideRevision,
    enabled: item.enabled,
    reason: item.reason,
    authorIdentity: item.authorIdentity,
    recordedAtUtc: item.recordedAtUtc,
  });
}

function sourceFieldFor(
  snapshot: SourceSnapshot,
  sourceFieldIdentity: string,
): SourceFieldRecord | null {
  const records = [
    snapshot.sourceProject,
    ...snapshot.explorations,
    ...snapshot.strata,
    ...snapshot.samples,
    ...snapshot.fieldTests,
    ...snapshot.comments,
    ...snapshot.openHoleGroundwaterObservations,
    ...snapshot.lookups,
  ];
  for (const record of records) {
    for (const field of [
      ...record.fields,
      ...record.fieldTestColumns.map((column) => column.value),
    ]) {
      if (field.sourceFieldIdentity === sourceFieldIdentity) return field;
    }
  }
  return null;
}

function collectionFor(
  state: WrapperState,
  handle: ProjectInputRevisionHandle,
  ownerDocumentIdentity: string,
): PresentationOverrideCollection | null {
  if (handle.state === "empty") return null;
  const retained = state.collections.find(
    (candidate) => candidate.logicalDigest === handle.contentDigest,
  );
  if (
    retained === undefined ||
    retained.value.ownerDocumentIdentity !== ownerDocumentIdentity ||
    retained.value.projectRevision !== handle.projectRevision ||
    retained.value.revisionIdentity !== handle.revisionIdentity ||
    retained.value.logicalDigest !== handle.contentDigest
  ) {
    return null;
  }
  return retained.value;
}

function assembleFor(
  state: WrapperState,
  project: Phase1LogProjectAggregate,
): BoundedOverrideAssemblyResult {
  const sourceSnapshot = project.phase1Inputs.acceptedSourceSnapshot;
  const presentation = getProjectInputRevisionHandle(project, "presentation-overrides");
  const supplemental = getProjectInputRevisionHandle(project, "supplemental-sources");
  const resolutions = getProjectInputRevisionHandle(project, "source-resolution-decisions");
  const extensions = getProjectInputRevisionHandle(project, "source-extension-bindings");
  if (
    sourceSnapshot === null ||
    !presentation.accepted ||
    !supplemental.accepted ||
    !resolutions.accepted ||
    !extensions.accepted
  ) {
    return Object.freeze({
      assembled: false,
      code: "BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED",
      diagnostics: Object.freeze([]),
    });
  }
  const collection = collectionFor(state, presentation.value, project.documentIdentity);
  if (presentation.value.state === "current" && collection === null) {
    return Object.freeze({
      assembled: false,
      code: "BOUNDED_OVERRIDE_ASSEMBLY_PRESENTATION_HANDLE_MISMATCH",
      diagnostics: Object.freeze([]),
    });
  }
  return assembleBoundedOverrideRenderDataset({
    phase1Project: project,
    sourceSnapshot,
    presentationOverrides:
      collection === null
        ? { state: "empty", handle: presentation.value }
        : { state: "current", handle: presentation.value, collection },
    supplementalSourcesHandle: supplemental.value,
    sourceResolutionDecisionsHandle: resolutions.value,
    sourceExtensionBindingsHandle: extensions.value,
  });
}

function projectionFor(
  state: WrapperState,
  snapshot: ProjectDomainHistorySnapshot,
):
  | { readonly projected: true; readonly value: OverrideRenderDatasetProjection }
  | { readonly projected: false; readonly code: string } {
  const project = snapshot.aggregate;
  const sourceSnapshot = project.phase1Inputs.acceptedSourceSnapshot;
  if (sourceSnapshot === null) {
    return Object.freeze({ projected: false, code: "BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED" });
  }
  const presentation = getProjectInputRevisionHandle(project, "presentation-overrides");
  const supplemental = getProjectInputRevisionHandle(project, "supplemental-sources");
  const resolutions = getProjectInputRevisionHandle(project, "source-resolution-decisions");
  const extensions = getProjectInputRevisionHandle(project, "source-extension-bindings");
  if (
    !presentation.accepted ||
    !supplemental.accepted ||
    !resolutions.accepted ||
    !extensions.accepted
  ) {
    return Object.freeze({ projected: false, code: "BOUNDED_OVERRIDE_ASSEMBLY_MALFORMED" });
  }
  const collection = collectionFor(state, presentation.value, snapshot.documentId);
  if (presentation.value.state === "current" && collection === null) {
    return Object.freeze({
      projected: false,
      code: "BOUNDED_OVERRIDE_ASSEMBLY_PRESENTATION_HANDLE_MISMATCH",
    });
  }
  const assembly = assembleFor(state, project);
  if (!assembly.assembled) return Object.freeze({ projected: false, code: assembly.code });
  const datasetCanonicalJson = canonicalizeJson(assembly.value);
  const diagnostics = assembly.value.diagnostics.map((fact) => jsonValue(fact));
  const values: OverrideRenderValueProjection[] = [];
  for (const value of assembly.value.values) {
    const sourceBaselineValueDigest = digestSourceBaselineValue(value.sourceOriginalValue);
    if (!sourceBaselineValueDigest.accepted) {
      return Object.freeze({
        projected: false,
        code: "BLD019_SOURCE_BASELINE_DIGEST_INVALID",
      });
    }
    values.push(
      Object.freeze({
        sourceFieldIdentity: value.sourceFieldIdentity,
        sourceEntityIdentity: value.sourceEntityIdentity,
        fieldPath: value.fieldPath,
        sourceBaselineValueDigest: sourceBaselineValueDigest.value,
        sourceOriginal: domainValueProjection(value.sourceOriginalValue),
        effectiveDisplay: domainValueProjection(value.effectiveDisplayValue),
        application: value.application,
      }),
    );
  }
  const created = createOverrideRenderDatasetProjection({
    projectionVersion: 1,
    projectionKind: "render-dataset.projection",
    documentId: snapshot.documentId,
    ownerGeneration: snapshot.ownerGeneration,
    workingRevision: snapshot.workingRevision,
    durableRevision: snapshot.durableRevision,
    dirty: snapshot.dirty,
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
    eventSequence: snapshot.events.at(-1)?.eventSequence ?? 0,
    aggregateDigest: snapshot.aggregateDigest,
    sourceSnapshotIdentity: assembly.value.sourceSnapshotIdentity,
    sourceSnapshotLogicalDigest: assembly.value.sourceSnapshotLogicalDigest,
    sourceSnapshotEncodingDigest: assembly.value.sourceSnapshotEncodingDigest,
    sourceContextIdentity: assembly.value.sourceContextIdentity,
    sourceProjectIdentity: assembly.value.sourceProjectIdentity,
    presentationOverrideState: assembly.value.presentationOverrideState,
    presentationOverrideProjectRevision: assembly.value.presentationOverrideProjectRevision,
    presentationOverrideRevisionIdentity: assembly.value.presentationOverrideRevisionIdentity,
    presentationOverrideContentDigest: assembly.value.presentationOverrideContentDigest,
    presentationOverrideCollectionIdentity: assembly.value.presentationOverrideCollectionIdentity,
    presentationOverrideCollectionRevision: assembly.value.presentationOverrideCollectionRevision,
    presentationOverrideCollectionDigest: assembly.value.presentationOverrideCollectionDigest,
    presentationOverrideCollectionCanonicalJson:
      collection === null
        ? null
        : (state.collections.find(
            (candidate) => candidate.logicalDigest === collection.logicalDigest,
          )?.canonicalJson ?? null),
    presentationOverrideCollectionEncodingDigest:
      collection === null
        ? null
        : (state.collections.find(
            (candidate) => candidate.logicalDigest === collection.logicalDigest,
          )?.encodingDigest ?? null),
    datasetIdentity: assembly.value.datasetIdentity,
    datasetLogicalDigest: assembly.value.logicalDigest,
    datasetCanonicalJson,
    datasetEncodingDigest: sha256Utf8(datasetCanonicalJson),
    overrides: collection?.items.map(overrideState) ?? [],
    values,
    diagnosticFacts: diagnostics,
    diagnosticFactsDigest: sha256Utf8(canonicalizeJson(diagnostics)),
  });
  return created.accepted
    ? Object.freeze({ projected: true, value: created.value })
    : Object.freeze({ projected: false, code: "PROJECTION_CONTRACT_INVALID" });
}

function simulatedSnapshot(
  current: ProjectDomainHistorySnapshot,
  aggregate: Phase1LogProjectAggregate,
  committed: ProjectDomainHistoryCommittedResult,
): ProjectDomainHistorySnapshot {
  const encoded = encodePhase1LogProjectAggregate(aggregate);
  if (!encoded.accepted) throw new Error("BLD-019 aggregate simulation invariant");
  return Object.freeze({
    ...current,
    workingRevision: committed.workingRevision,
    durableRevision: committed.durableRevision,
    aggregate,
    aggregateCanonicalJson: encoded.canonicalJson,
    aggregateDigest: encoded.digest,
    dirty: committed.dirty,
    historyCursor: committed.historyCursor,
    historyLength: committed.historyLength,
    canUndo: committed.historyCursor > 0,
    canRedo: committed.historyCursor < committed.historyLength,
    events: Object.freeze([
      ...current.events,
      Object.freeze({
        eventSequence: committed.eventSequence,
        operation: committed.operation,
        sourceRequestId: committed.requestId,
        sourceCommandDigest: committed.sourceCommandDigest,
        historyEntryIdentity: committed.historyEntryIdentity,
        baseWorkingRevision: committed.previousWorkingRevision,
        resultingWorkingRevision: committed.workingRevision,
        aggregateDigest: committed.aggregateDigest,
        affectedIdentities: committed.affectedIdentities,
        invalidations: committed.invalidations,
        result: committed.eventResult,
      }),
    ]),
    commitCount: current.commitCount + 1,
  });
}

function externalCommitted(
  command: OverrideRenderDatasetCommand,
  generic: ProjectDomainHistoryCommittedResult,
  projection: OverrideRenderDatasetProjection,
  beforeAggregateDigest: Sha256Digest,
): OverrideRenderDatasetCommittedResult | null {
  const event = {
    contractVersion: 1,
    messageType: "event",
    kind: "render-dataset.projected",
    sourceRequestId: command.requestId,
    commandId: command.commandId,
    operation: generic.operation,
    documentId: generic.documentId,
    ownerGeneration: generic.ownerGeneration,
    eventSequence: generic.eventSequence,
    baseWorkingRevision: generic.previousWorkingRevision,
    resultingWorkingRevision: generic.workingRevision,
    historyEntryIdentity: generic.historyEntryIdentity,
    beforeAggregateDigest,
    afterAggregateDigest: generic.aggregateDigest,
    projection,
  } as const;
  const decoded = decodeOverrideRenderDatasetCommandResult({
    contractVersion: 1,
    messageType: "command-result",
    kind: "override-render-dataset.committed",
    requestId: command.requestId,
    commandId: command.commandId,
    operation: generic.operation,
    documentId: generic.documentId,
    ownerGeneration: generic.ownerGeneration,
    previousWorkingRevision: generic.previousWorkingRevision,
    workingRevision: generic.workingRevision,
    durableRevision: generic.durableRevision,
    historyEntryIdentity: generic.historyEntryIdentity,
    aggregateDigest: generic.aggregateDigest,
    dirty: generic.dirty,
    canUndo: projection.canUndo,
    canRedo: projection.canRedo,
    eventSequence: generic.eventSequence,
    projection,
    event,
    changed: true,
  });
  return decoded.accepted && decoded.value.kind === "override-render-dataset.committed"
    ? decoded.value
    : null;
}

class InMemoryOverrideRenderDatasetServiceImplementation implements InMemoryOverrideRenderDatasetService {
  readonly #core: InMemoryPhase1ProjectHistoryCore;
  readonly #capacities: InMemoryOverrideRenderDatasetServiceCapacities;
  #state: WrapperState;
  #tail: Promise<void> = Promise.resolve();

  public constructor(
    core: InMemoryPhase1ProjectHistoryCore,
    capacities: InMemoryOverrideRenderDatasetServiceCapacities,
    collections: readonly RetainedCollection[],
  ) {
    this.#core = core;
    this.#capacities = capacities;
    this.#state = Object.freeze({ collections, replay: Object.freeze([]) });
    Object.freeze(this);
  }

  public setDisplayValue(input: unknown): Promise<OverrideRenderDatasetCommandResult> {
    return this.#namedCommand(input, "presentation-override.set-display-value");
  }

  public undo(input: unknown): Promise<OverrideRenderDatasetCommandResult> {
    return this.#namedCommand(input, "history.undo");
  }

  public redo(input: unknown): Promise<OverrideRenderDatasetCommandResult> {
    return this.#namedCommand(input, "history.redo");
  }

  #namedCommand(
    input: unknown,
    expectedKind: OverrideRenderDatasetCommand["kind"],
  ): Promise<OverrideRenderDatasetCommandResult> {
    const decoded = decodeOverrideRenderDatasetCommand(input);
    const operation = async (): Promise<OverrideRenderDatasetCommandResult> => {
      await Promise.resolve();
      if (!decoded.accepted) {
        return rejected(
          "command-result",
          null,
          decoded.code === "OVERRIDE_RENDER_CONTRACT_UNSUPPORTED_VERSION"
            ? "CONTRACT_UNSUPPORTED_VERSION"
            : decoded.code === "OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG"
              ? "UNKNOWN_COMMAND"
              : "CONTRACT_MALFORMED",
        );
      }
      return decoded.value.kind === expectedKind
        ? this.#executeDecoded(decoded.value)
        : rejected("command-result", decoded.value.requestId, "UNKNOWN_COMMAND");
    };
    return this.#serialize(operation);
  }

  public getProjection(input: unknown): Promise<OverrideRenderDatasetQueryResult> {
    const decoded = decodeOverrideRenderDatasetQuery(input);
    const operation = async (): Promise<OverrideRenderDatasetQueryResult> => {
      await Promise.resolve();
      return decoded.accepted
        ? this.#queryDecoded(decoded.value)
        : rejected(
            "query-result",
            null,
            decoded.code === "OVERRIDE_RENDER_CONTRACT_UNSUPPORTED_VERSION"
              ? "CONTRACT_UNSUPPORTED_VERSION"
              : decoded.code === "OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG"
                ? "UNKNOWN_QUERY"
                : "CONTRACT_MALFORMED",
          );
    };
    return this.#serialize(operation);
  }

  public captureWorkingState(): Promise<CapturedOverrideRenderDatasetWorkingState> {
    return this.#serialize(() => {
      const project = this.#core.captureProjectWorkingRevision();
      const handle = getProjectInputRevisionHandle(project.aggregate, "presentation-overrides");
      const collections =
        handle.accepted && handle.value.state === "current"
          ? this.#state.collections
              .filter((entry) => entry.logicalDigest === handle.value.contentDigest)
              .map((entry) => entry.value)
          : [];
      return Promise.resolve(
        Object.freeze({
          project,
          presentationOverrideCollections: Object.freeze(collections),
        }),
      );
    });
  }

  public markDurable(capture: CapturedPhase1ProjectWorkingRevision): Promise<boolean> {
    return this.#serialize(() =>
      Promise.resolve(markInMemoryPhase1ProjectHistoryCoreDurableRevision(this.#core, capture)),
    );
  }

  #serialize<Result>(operation: () => Promise<Result>): Promise<Result> {
    const pending = this.#tail.then(operation, operation);
    this.#tail = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }

  #lookupReplay(
    command: OverrideRenderDatasetCommand,
    commandDigest: Sha256Digest,
  ): OverrideRenderDatasetCommandResult | null {
    const entry = this.#state.replay.find((candidate) => candidate.requestId === command.requestId);
    if (entry === undefined) return null;
    return entry.commandDigest === commandDigest
      ? entry.result
      : rejected("command-result", command.requestId, "REQUEST_ID_REUSE_MISMATCH");
  }

  #stateWithReplay(
    command: OverrideRenderDatasetCommand,
    commandDigest: Sha256Digest,
    result: OverrideRenderDatasetCommandResult,
    collections = this.#state.collections,
  ): WrapperState {
    return Object.freeze({
      collections,
      replay: Object.freeze([
        ...this.#state.replay,
        Object.freeze({ requestId: command.requestId, commandDigest, result }),
      ]),
    });
  }

  #retainedRejection(
    command: OverrideRenderDatasetCommand,
    commandDigest: Sha256Digest,
    reason: OverrideRenderDatasetRejectionReason,
  ): OverrideRenderDatasetRejectedResult {
    const result = rejected("command-result", command.requestId, reason);
    if (this.#state.replay.length < this.#capacities.commandReplayEntries) {
      this.#state = this.#stateWithReplay(command, commandDigest, result);
    }
    return result;
  }

  #executeDecoded(command: OverrideRenderDatasetCommand): OverrideRenderDatasetCommandResult {
    const encodedCommand = encodeOverrideRenderDatasetCommand(command);
    if (!encodedCommand.accepted) return rejected("command-result", null, "CONTRACT_MALFORMED");
    const replay = this.#lookupReplay(command, encodedCommand.digest);
    if (replay !== null) return replay;
    if (this.#state.replay.length >= this.#capacities.commandReplayEntries) {
      return rejected("command-result", command.requestId, "CAPACITY_EXHAUSTED");
    }
    const snapshot = this.#core.inspectProject();
    if (command.documentId !== snapshot.documentId) {
      return this.#retainedRejection(command, encodedCommand.digest, "DOCUMENT_IDENTITY_MISMATCH");
    }
    if (command.ownerGeneration !== snapshot.ownerGeneration) {
      return this.#retainedRejection(command, encodedCommand.digest, "OWNER_GENERATION_MISMATCH");
    }
    if (command.expectedWorkingRevision !== snapshot.workingRevision) {
      return this.#retainedRejection(command, encodedCommand.digest, "STALE_WORKING_REVISION");
    }
    const coreReplay = this.#core.lookupProjectSourceCommandReplay({
      requestId: command.requestId,
      sourceCommandDigest: encodedCommand.digest,
    });
    if (coreReplay.kind !== "miss") {
      return this.#retainedRejection(command, encodedCommand.digest, "INTERNAL_STATE_INVALID");
    }
    return command.kind === "presentation-override.set-display-value"
      ? this.#setDisplayValue(
          command,
          encodedCommand.canonicalJson,
          encodedCommand.digest,
          snapshot,
        )
      : this.#navigate(command, encodedCommand.digest, snapshot);
  }

  #setDisplayValue(
    command: Extract<
      OverrideRenderDatasetCommand,
      { readonly kind: "presentation-override.set-display-value" }
    >,
    canonicalCommand: string,
    commandDigest: Sha256Digest,
    snapshot: ProjectDomainHistorySnapshot,
  ): OverrideRenderDatasetCommandResult {
    if (command.payload.reason.trim().length === 0) {
      return this.#retainedRejection(command, commandDigest, "INVALID_RATIONALE");
    }
    if (snapshot.workingRevision === Number.MAX_SAFE_INTEGER) {
      return this.#retainedRejection(command, commandDigest, "CAPACITY_EXHAUSTED");
    }
    const presentationHandle = getProjectInputRevisionHandle(
      snapshot.aggregate,
      "presentation-overrides",
    );
    if (!presentationHandle.accepted) {
      return this.#retainedRejection(command, commandDigest, "INTERNAL_STATE_INVALID");
    }
    const previousCollection = collectionFor(
      this.#state,
      presentationHandle.value,
      snapshot.documentId,
    );
    if (presentationHandle.value.state === "current" && previousCollection === null) {
      return this.#retainedRejection(command, commandDigest, "INTERNAL_STATE_INVALID");
    }
    const derivedIdentity = derivePresentationOverrideIdentity({
      ownerDocumentIdentity: snapshot.documentId,
      localOverrideIdentity: command.payload.localOverrideIdentity,
    });
    if (!derivedIdentity.accepted) {
      return this.#retainedRejection(command, commandDigest, "DOMAIN_PRECONDITION_FAILED");
    }
    const prior = previousCollection?.items.find(
      (item) => item.presentationOverrideIdentity === derivedIdentity.value,
    );
    const overrideRevision = prior === undefined ? 1 : prior.overrideRevision + 1;
    const acceptedSourceSnapshot = snapshot.aggregate.phase1Inputs.acceptedSourceSnapshot;
    if (acceptedSourceSnapshot === null) {
      return this.#retainedRejection(command, commandDigest, "INTERNAL_STATE_INVALID");
    }
    const targetField = sourceFieldFor(
      acceptedSourceSnapshot,
      command.payload.targetSourceFieldIdentity,
    );
    if (targetField === null) {
      return this.#retainedRejection(command, commandDigest, "TARGET_NOT_FOUND");
    }
    if (
      prior !== undefined &&
      (prior.targetSourceContextIdentity !== targetField.sourceContextIdentity ||
        prior.targetSourceEntityIdentity !== targetField.sourceEntityIdentity ||
        prior.targetSourceFieldIdentity !== targetField.sourceFieldIdentity)
    ) {
      return this.#retainedRejection(command, commandDigest, "DOMAIN_PRECONDITION_FAILED");
    }
    const baselineDigest = digestSourceBaselineValue(targetField.value);
    if (
      !baselineDigest.accepted ||
      baselineDigest.value !== command.payload.expectedSourceValueDigest
    ) {
      return this.#retainedRejection(command, commandDigest, "INVALID_BASELINE");
    }
    const sourceValueType = displayValueTypeOf(targetField.value);
    if (
      !sourceValueType.accepted ||
      sourceValueType.value !== command.payload.expectedSourceValueType
    ) {
      return this.#retainedRejection(command, commandDigest, "INVALID_VALUE_TYPE");
    }
    if (
      canonicalizeJson(targetField.value.unit) !==
      canonicalizeJson(command.payload.expectedSourceUnit)
    ) {
      return this.#retainedRejection(command, commandDigest, "INVALID_UNIT");
    }
    const createdItem = createDisplayValueOverride({
      overrideVersion: 1,
      ownerDocumentIdentity: snapshot.documentId,
      localOverrideIdentity: command.payload.localOverrideIdentity,
      targetSourceContextIdentity: targetField.sourceContextIdentity,
      targetSourceEntityIdentity: targetField.sourceEntityIdentity,
      targetSourceFieldIdentity: command.payload.targetSourceFieldIdentity,
      expectedSourceValueDigest: command.payload.expectedSourceValueDigest,
      expectedSourceValueType: command.payload.expectedSourceValueType,
      expectedSourceUnit: command.payload.expectedSourceUnit,
      replacementValue: {
        recordVersion: 1,
        content: command.payload.replacementContent,
        association: targetField.value.association,
        finality: targetField.value.finality,
        eligibility: targetField.value.eligibility,
        unit: command.payload.replacementUnit,
        provenance: {
          provenanceClass: "override",
          presentationOverrideIdentity: derivedIdentity.value,
          sourceFieldIdentity: command.payload.targetSourceFieldIdentity,
          expectedSourceValueDigest: command.payload.expectedSourceValueDigest,
          overrideRevision,
          recordedAtUtc: command.payload.recordedAtUtc,
          basisCodes: ["presentation-override"],
          transformations: [],
        },
      },
      overrideRevision,
      enabled: true,
      reason: command.payload.reason,
      authorIdentity: command.payload.authorIdentity,
      recordedAtUtc: command.payload.recordedAtUtc,
    });
    if (!createdItem.accepted) {
      return this.#retainedRejection(command, commandDigest, mapOverrideFailure(createdItem.code));
    }
    const nextItems = Object.freeze(
      [
        ...(previousCollection?.items.filter(
          ({ presentationOverrideIdentity }) =>
            presentationOverrideIdentity !== createdItem.value.presentationOverrideIdentity,
        ) ?? []),
        createdItem.value,
      ].sort((left, right) =>
        left.targetSourceFieldIdentity === right.targetSourceFieldIdentity
          ? left.presentationOverrideIdentity < right.presentationOverrideIdentity
            ? -1
            : left.presentationOverrideIdentity > right.presentationOverrideIdentity
              ? 1
              : 0
          : left.targetSourceFieldIdentity < right.targetSourceFieldIdentity
            ? -1
            : 1,
      ),
    );
    const nextCollection =
      previousCollection === null
        ? createPresentationOverrideCollection({
            collectionVersion: 1,
            ownerDocumentIdentity: snapshot.documentId,
            projectRevision: 1,
            items: nextItems,
          })
        : createNextPresentationOverrideCollection({
            previousCollection,
            items: nextItems,
          });
    if (!nextCollection.accepted) {
      return this.#retainedRejection(
        command,
        commandDigest,
        mapOverrideFailure(nextCollection.code),
      );
    }
    const retained = retainedCollection(nextCollection.value);
    if (retained === null) {
      return this.#retainedRejection(command, commandDigest, "INTERNAL_STATE_INVALID");
    }
    const alreadyStored = this.#state.collections.some(
      (candidate) => candidate.logicalDigest === retained.logicalDigest,
    );
    if (!alreadyStored && this.#state.collections.length >= this.#capacities.collectionEntries) {
      return this.#retainedRejection(command, commandDigest, "CAPACITY_EXHAUSTED");
    }
    const nextHandle = createProjectInputRevisionHandle({
      collectionKind: "presentation-overrides",
      ownerDocumentIdentity: snapshot.documentId,
      state: "current",
      projectRevision: nextCollection.value.projectRevision,
      contentDigest: nextCollection.value.logicalDigest,
    });
    if (!nextHandle.accepted) {
      return this.#retainedRejection(command, commandDigest, "INTERNAL_STATE_INVALID");
    }
    const after = decodePhase1LogProjectAggregate({
      ...snapshot.aggregate,
      phase1Inputs: {
        acceptedSourceSnapshot: snapshot.aggregate.phase1Inputs.acceptedSourceSnapshot,
        revisionHandles: snapshot.aggregate.phase1Inputs.revisionHandles.map((handle) =>
          handle.collectionKind === "presentation-overrides" ? nextHandle.value : handle,
        ),
      },
    });
    if (!after.accepted) {
      return this.#retainedRejection(command, commandDigest, "INTERNAL_STATE_INVALID");
    }
    const beforeEncoded = encodePhase1LogProjectAggregate(snapshot.aggregate);
    const afterEncoded = encodePhase1LogProjectAggregate(after.value);
    const beforeSource = encodeSourceSnapshot(
      snapshot.aggregate.phase1Inputs.acceptedSourceSnapshot,
    );
    const afterSource = encodeSourceSnapshot(after.value.phase1Inputs.acceptedSourceSnapshot);
    if (
      !beforeEncoded.accepted ||
      !afterEncoded.accepted ||
      !beforeSource.accepted ||
      !afterSource.accepted ||
      beforeSource.canonicalJson !== afterSource.canonicalJson
    ) {
      return this.#retainedRejection(command, commandDigest, "INTERNAL_STATE_INVALID");
    }
    const nextCollections = alreadyStored
      ? this.#state.collections
      : Object.freeze([...this.#state.collections, retained]);
    const stagedState: WrapperState = Object.freeze({
      collections: nextCollections,
      replay: this.#state.replay,
    });
    const assemblyPreflight = assembleFor(stagedState, after.value);
    if (!assemblyPreflight.assembled) {
      return this.#retainedRejection(
        command,
        commandDigest,
        mapAssemblyFailure(assemblyPreflight.code),
      );
    }
    const eventPayload = canonicalizeJson({
      kind: "presentation-override.display-value-set",
      presentationOverrideIdentity: createdItem.value.presentationOverrideIdentity,
      presentationOverrideCollectionIdentity: nextCollection.value.collectionIdentity,
      presentationOverrideCollectionDigest: nextCollection.value.logicalDigest,
      targetSourceFieldIdentity: createdItem.value.targetSourceFieldIdentity,
    });
    const effect = createProjectDomainEffect({
      sourceRequestId: command.requestId,
      sourceCommandCanonicalJson: canonicalCommand,
      sourceCommandIdentity: commandIdentity(command.commandId),
      commandLabel: "Set display value",
      documentId: command.documentId,
      ownerGeneration: command.ownerGeneration,
      expectedWorkingRevision: command.expectedWorkingRevision,
      beforeAggregateCanonicalJson: beforeEncoded.canonicalJson,
      afterAggregateCanonicalJson: afterEncoded.canonicalJson,
      affectedIdentities: [
        createdItem.value.presentationOverrideIdentity,
        createdItem.value.targetSourceFieldIdentity,
        nextCollection.value.collectionIdentity,
        nextCollection.value.revisionIdentity,
      ].sort(),
      invalidations: ["urn:rsrender:projection:render-dataset"],
      eventResult: {
        resultCode: "presentation-override.display-value-set",
        canonicalPayload: eventPayload,
      },
    });
    if (!effect.accepted) {
      return this.#retainedRejection(command, commandDigest, "INTERNAL_STATE_INVALID");
    }
    const preparation = this.#core.prepareProjectDomainEffect(effect.value);
    if (preparation.kind !== "ready") {
      return this.#retainedRejection(
        command,
        commandDigest,
        preparation.result.kind === "project-domain-history.rejected"
          ? mapHistoryReason(preparation.result.reason)
          : "INTERNAL_STATE_INVALID",
      );
    }
    const projection = projectionFor(
      stagedState,
      simulatedSnapshot(snapshot, after.value, preparation.result),
    );
    if (!projection.projected) {
      return this.#retainedRejection(command, commandDigest, mapAssemblyFailure(projection.code));
    }
    const external = externalCommitted(
      command,
      preparation.result,
      projection.value,
      beforeEncoded.digest,
    );
    if (external === null) {
      return this.#retainedRejection(command, commandDigest, "INTERNAL_STATE_INVALID");
    }
    const candidateState = this.#stateWithReplay(command, commandDigest, external, nextCollections);
    const committed = this.#core.commitPreparedProjectDomainEffect(preparation.prepared);
    if (committed.kind === "project-domain-history.rejected") {
      return this.#retainedRejection(command, commandDigest, mapHistoryReason(committed.reason));
    }
    this.#state = candidateState;
    return external;
  }

  #navigate(
    command: Exclude<
      OverrideRenderDatasetCommand,
      { readonly kind: "presentation-override.set-display-value" }
    >,
    commandDigest: Sha256Digest,
    snapshot: ProjectDomainHistorySnapshot,
  ): OverrideRenderDatasetCommandResult {
    if (snapshot.workingRevision === Number.MAX_SAFE_INTEGER) {
      return this.#retainedRejection(command, commandDigest, "CAPACITY_EXHAUSTED");
    }
    const entry =
      command.kind === historyUndoCommandId
        ? snapshot.history[snapshot.historyCursor - 1]
        : snapshot.history[snapshot.historyCursor];
    if (entry === undefined) {
      return this.#retainedRejection(
        command,
        commandDigest,
        command.kind === historyUndoCommandId ? "NOTHING_TO_UNDO" : "NOTHING_TO_REDO",
      );
    }
    const resultingAggregate =
      command.kind === historyUndoCommandId ? entry.beforeAggregate : entry.afterAggregate;
    const predictedOperation = command.kind === historyUndoCommandId ? "undo" : "redo";
    const predictedCursor =
      command.kind === historyUndoCommandId
        ? snapshot.historyCursor - 1
        : snapshot.historyCursor + 1;
    const predicted: ProjectDomainHistoryCommittedResult = Object.freeze({
      contractVersion: 1,
      messageType: "command-result",
      kind: "project-domain-history.committed",
      requestId: command.requestId,
      sourceCommandDigest: commandDigest,
      sourceCommandIdentity: commandIdentity(command.commandId),
      operation: predictedOperation,
      documentId: snapshot.documentId,
      ownerGeneration: snapshot.ownerGeneration,
      previousWorkingRevision: snapshot.workingRevision,
      workingRevision: (snapshot.workingRevision +
        1) as ProjectDomainHistoryCommittedResult["workingRevision"],
      durableRevision: snapshot.durableRevision,
      historyEntryIdentity: entry.historyEntryIdentity,
      historyCursor: predictedCursor as ProjectDomainHistoryCommittedResult["historyCursor"],
      historyLength: snapshot.historyLength,
      aggregateDigest:
        command.kind === historyUndoCommandId
          ? entry.beforeAggregateDigest
          : entry.afterAggregateDigest,
      dirty: snapshot.workingRevision + 1 !== Number(snapshot.durableRevision),
      eventSequence: ((snapshot.events.at(-1)?.eventSequence ?? 0) +
        1) as ProjectDomainHistoryCommittedResult["eventSequence"],
      affectedIdentities: entry.effect.affectedIdentities,
      invalidations: entry.effect.invalidations,
      eventResult: entry.effect.eventResult,
      changed: true,
    });
    const projection = projectionFor(
      this.#state,
      simulatedSnapshot(snapshot, resultingAggregate, predicted),
    );
    if (!projection.projected) {
      return this.#retainedRejection(command, commandDigest, mapAssemblyFailure(projection.code));
    }
    const external = externalCommitted(
      command,
      predicted,
      projection.value,
      snapshot.aggregateDigest,
    );
    if (external === null) {
      return this.#retainedRejection(command, commandDigest, "INTERNAL_STATE_INVALID");
    }
    const candidateState = this.#stateWithReplay(command, commandDigest, external);
    const navigationCommand =
      command.kind === historyUndoCommandId
        ? Object.freeze({ ...command, kind: historyUndoCommandId, commandId: historyUndoCommandId })
        : Object.freeze({
            ...command,
            kind: historyRedoCommandId,
            commandId: historyRedoCommandId,
          });
    const generic = this.#core.executeProjectHistoryNavigation(navigationCommand);
    if (generic.kind === "project-domain-history.rejected") {
      return this.#retainedRejection(command, commandDigest, mapHistoryReason(generic.reason));
    }
    this.#state = candidateState;
    return external;
  }

  #queryDecoded(query: OverrideRenderDatasetQuery): OverrideRenderDatasetQueryResult {
    const snapshot = this.#core.inspectProject();
    if (query.documentId !== snapshot.documentId) {
      return rejected("query-result", query.requestId, "DOCUMENT_IDENTITY_MISMATCH");
    }
    if (query.ownerGeneration !== snapshot.ownerGeneration) {
      return rejected("query-result", query.requestId, "OWNER_GENERATION_MISMATCH");
    }
    if (
      query.minimumWorkingRevision !== null &&
      query.minimumWorkingRevision > snapshot.workingRevision
    ) {
      return rejected("query-result", query.requestId, "MINIMUM_WORKING_REVISION_UNAVAILABLE");
    }
    const projection = projectionFor(this.#state, snapshot);
    if (!projection.projected) {
      return rejected("query-result", query.requestId, mapAssemblyFailure(projection.code));
    }
    const result: OverrideRenderDatasetProjectionResult = Object.freeze({
      contractVersion: 1,
      messageType: "query-result",
      kind: "render-dataset.projection.result",
      requestId: query.requestId,
      documentId: snapshot.documentId,
      ownerGeneration: snapshot.ownerGeneration,
      workingRevision: snapshot.workingRevision,
      durableRevision: snapshot.durableRevision,
      dirty: snapshot.dirty,
      canUndo: snapshot.canUndo,
      canRedo: snapshot.canRedo,
      eventSequence: projection.value.eventSequence,
      projection: projection.value,
    });
    const decoded = decodeOverrideRenderDatasetQueryResult(result);
    return decoded.accepted
      ? decoded.value
      : rejected("query-result", query.requestId, "INTERNAL_STATE_INVALID");
  }
}

const persistenceAuthorities = new WeakMap<
  object,
  InMemoryOverrideRenderDatasetServiceImplementation
>();

export async function captureOverrideRenderDatasetWorkingState(
  service: InMemoryOverrideRenderDatasetService,
): Promise<CapturedOverrideRenderDatasetWorkingState | null> {
  return (await persistenceAuthorities.get(service)?.captureWorkingState()) ?? null;
}

export async function markOverrideRenderDatasetDurable(
  service: InMemoryOverrideRenderDatasetService,
  capture: CapturedPhase1ProjectWorkingRevision,
): Promise<boolean> {
  return (await persistenceAuthorities.get(service)?.markDurable(capture)) ?? false;
}

export function createInMemoryOverrideRenderDatasetService(
  input: unknown,
): OverrideRenderDatasetServiceInitializationResult {
  try {
    const parsed = parseInitialization(input);
    if (!parsed.accepted) return parsed;
    const core = createInMemoryPhase1ProjectHistoryCore({
      aggregate: parsed.value.aggregate,
      ownerGeneration: parsed.value.ownerGeneration,
      capacities: {
        replayEntries: parsed.value.capacities.replayEntries,
        historyEntries: parsed.value.capacities.historyEntries,
        commits: parsed.value.capacities.commits,
        events: parsed.value.capacities.events,
        subscriptionBatch: parsed.value.capacities.subscriptionBatch,
      },
    });
    if (!core.accepted) return core;
    const implementation = new InMemoryOverrideRenderDatasetServiceImplementation(
      core.core,
      parsed.value.capacities,
      parsed.value.collections,
    );
    const service: InMemoryOverrideRenderDatasetService = Object.freeze({
      setDisplayValue: Object.freeze((command: unknown) => implementation.setDisplayValue(command)),
      undo: Object.freeze((command: unknown) => implementation.undo(command)),
      redo: Object.freeze((command: unknown) => implementation.redo(command)),
      getProjection: Object.freeze((query: unknown) => implementation.getProjection(query)),
    });
    persistenceAuthorities.set(service, implementation);
    return Object.freeze({ accepted: true, service });
  } catch {
    return Object.freeze({ accepted: false, code: "INITIAL_CONFIGURATION_MALFORMED" });
  }
}
