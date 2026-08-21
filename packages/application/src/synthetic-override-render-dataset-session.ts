import {
  SOURCE_MAPPED_FIELD_PATHS,
  createEmptyPhase1LogProject,
  createSourceFieldRecord,
  createSourceRecord,
  createSourceSnapshot,
  decodePhase1LogProjectAggregate,
  deriveSourceContextIdentity,
  deriveSourceEntityIdentity,
  deriveSourceFieldIdentity,
  documentIdentityCodec,
  type DocumentIdentity,
  type DomainValueRecord,
  type Phase1LogProjectAggregate,
  type SourceContextIdentity,
  type SourceEntityIdentity,
  type SourceFieldRecord,
  type SourceSnapshot,
} from "@rsrender/domain";
import {
  createInMemoryOverrideRenderDatasetService,
  type InMemoryOverrideRenderDatasetService,
  type InMemoryOverrideRenderDatasetServiceCapacities,
} from "./in-memory-override-render-dataset-service.js";

export const syntheticOverrideRenderDatasetSessionRevision =
  "bld-020-synthetic-override-render-dataset-session-v1" as const;

export const syntheticOverrideRenderDatasetSessionCapacities: Readonly<InMemoryOverrideRenderDatasetServiceCapacities> =
  Object.freeze({
    replayEntries: 64,
    historyEntries: 64,
    commits: 64,
    events: 64,
    subscriptionBatch: 64,
    collectionEntries: 64,
    commandReplayEntries: 64,
  });

export interface SyntheticOverrideRenderDatasetSession {
  readonly documentIdentity: DocumentIdentity;
  readonly ownerGeneration: number;
  readonly service: InMemoryOverrideRenderDatasetService;
}

export type SyntheticOverrideRenderDatasetSessionCreationResult =
  | { readonly accepted: true; readonly session: SyntheticOverrideRenderDatasetSession }
  | {
      readonly accepted: false;
      readonly code:
        | "SYNTHETIC_SESSION_CONFIGURATION_MALFORMED"
        | "SYNTHETIC_SESSION_DOCUMENT_IDENTITY_INVALID"
        | "SYNTHETIC_SESSION_OWNER_GENERATION_INVALID"
        | "SYNTHETIC_SESSION_BOOTSTRAP_FAILED";
    };

type SyntheticSessionConfiguration = {
  readonly documentIdentity: DocumentIdentity;
  readonly ownerGeneration: number;
};

type DataRecord = Readonly<Record<string, unknown>>;

const SYNTHETIC_SOURCE_PROJECT_IDENTITY = "urn:rsrender:synthetic:source-project:document-session";
const SYNTHETIC_EXPLORATION_IDENTITY = "urn:rsrender:synthetic:exploration:document-session-001";
const SYNTHETIC_ADAPTER_ID = "rsrender.synthetic.read-only-adapter";
const SYNTHETIC_PROVIDER_ORGANIZATION_IDENTITY =
  "urn:rsrender:synthetic:provider-organization:repository-safe";
const SYNTHETIC_PROVIDER_ACCOUNT_SCOPE_IDENTITY =
  "urn:rsrender:synthetic:provider-account:repository-safe";
const SYNTHETIC_RETRIEVED_AT_UTC = "2026-08-20T19:00:00.000Z";

function rejected(
  code: Exclude<
    SyntheticOverrideRenderDatasetSessionCreationResult,
    { readonly accepted: true }
  >["code"],
): SyntheticOverrideRenderDatasetSessionCreationResult {
  return Object.freeze({ accepted: false, code });
}

function ownDataRecord(input: unknown, fields: readonly string[]): DataRecord | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) return null;
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !fields.includes(key)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
    result[key] = descriptor.value;
  }
  return fields.every((field) => Object.hasOwn(result, field)) ? result : null;
}

function parseConfiguration(input: unknown):
  | { readonly accepted: true; readonly value: SyntheticSessionConfiguration }
  | {
      readonly accepted: false;
      readonly result: SyntheticOverrideRenderDatasetSessionCreationResult;
    } {
  const record = ownDataRecord(input, ["documentIdentity", "ownerGeneration"]);
  if (record === null) {
    return Object.freeze({
      accepted: false,
      result: rejected("SYNTHETIC_SESSION_CONFIGURATION_MALFORMED"),
    });
  }
  let documentIdentity: DocumentIdentity;
  try {
    documentIdentity = documentIdentityCodec.parse(record["documentIdentity"]);
  } catch {
    return Object.freeze({
      accepted: false,
      result: rejected("SYNTHETIC_SESSION_DOCUMENT_IDENTITY_INVALID"),
    });
  }
  const ownerGeneration = record["ownerGeneration"];
  if (
    typeof ownerGeneration !== "number" ||
    !Number.isSafeInteger(ownerGeneration) ||
    ownerGeneration < 1 ||
    Object.is(ownerGeneration, -0)
  ) {
    return Object.freeze({
      accepted: false,
      result: rejected("SYNTHETIC_SESSION_OWNER_GENERATION_INVALID"),
    });
  }
  return Object.freeze({
    accepted: true,
    value: Object.freeze({ documentIdentity, ownerGeneration }),
  });
}

function sourceValue(
  sourceContextIdentity: SourceContextIdentity,
  sourceEntityIdentity: SourceEntityIdentity,
  sourceFieldIdentity: string,
  fieldPath: string,
  value: string,
): DomainValueRecord {
  return {
    recordVersion: 1,
    content: { kind: "value", value, originalRepresentation: value },
    association: { state: "not-applicable" },
    finality: { state: "not-applicable" },
    eligibility: { state: "eligible", reasonCodes: [] },
    unit: { state: "not-applicable" },
    provenance: {
      provenanceClass: "source",
      sourceContextIdentity,
      entityIdentity: sourceEntityIdentity,
      fieldIdentity: sourceFieldIdentity,
      adapterId: SYNTHETIC_ADAPTER_ID,
      adapterContractVersion: 1,
      retrievedAtUtc: SYNTHETIC_RETRIEVED_AT_UTC,
      mappingRuleId: `rsrender.synthetic.${fieldPath}`,
      mappingRuleVersion: 1,
      basisCodes: [],
      transformations: [],
    },
  };
}

function createNameField(
  sourceContextIdentity: SourceContextIdentity,
  sourceEntityIdentity: SourceEntityIdentity,
  value: string,
): SourceFieldRecord | null {
  const identity = deriveSourceFieldIdentity({
    sourceEntityIdentity,
    fieldPath: SOURCE_MAPPED_FIELD_PATHS.projectName,
  });
  if (!identity.accepted) return null;
  const field = createSourceFieldRecord({
    fieldVersion: 1,
    sourceContextIdentity,
    sourceEntityIdentity,
    fieldPath: SOURCE_MAPPED_FIELD_PATHS.projectName,
    value: sourceValue(
      sourceContextIdentity,
      sourceEntityIdentity,
      identity.value,
      SOURCE_MAPPED_FIELD_PATHS.projectName,
      value,
    ),
  });
  return field.accepted ? field.value : null;
}

function buildSyntheticSourceSnapshot(): SourceSnapshot | null {
  const context = deriveSourceContextIdentity({
    adapterId: SYNTHETIC_ADAPTER_ID,
    providerOrganizationIdentity: SYNTHETIC_PROVIDER_ORGANIZATION_IDENTITY,
    providerAccountScopeIdentity: SYNTHETIC_PROVIDER_ACCOUNT_SCOPE_IDENTITY,
    sourceProjectIdentity: SYNTHETIC_SOURCE_PROJECT_IDENTITY,
  });
  if (!context.accepted) return null;
  const projectEntity = deriveSourceEntityIdentity({
    sourceContextIdentity: context.value,
    entityKind: "source-project",
    providerNativeIdentity: SYNTHETIC_SOURCE_PROJECT_IDENTITY,
  });
  const explorationEntity = deriveSourceEntityIdentity({
    sourceContextIdentity: context.value,
    entityKind: "exploration",
    providerNativeIdentity: SYNTHETIC_EXPLORATION_IDENTITY,
  });
  if (!projectEntity.accepted || !explorationEntity.accepted) return null;
  const projectName = createNameField(
    context.value,
    projectEntity.value,
    "Synthetic Source Project",
  );
  const explorationName = createNameField(
    context.value,
    explorationEntity.value,
    "SYNTHETIC-EXPLORATION-001",
  );
  if (projectName === null || explorationName === null) return null;
  const sourceProject = createSourceRecord({
    recordVersion: 1,
    entityKind: "source-project",
    sourceContextIdentity: context.value,
    providerNativeIdentity: SYNTHETIC_SOURCE_PROJECT_IDENTITY,
    parentEntityIdentity: null,
    relatedEntityIdentity: null,
    sourceOrder: null,
    fields: [projectName],
    lookupReferences: [],
    fieldTestColumns: [],
    extensionObservations: [],
  });
  if (!sourceProject.accepted || sourceProject.value.entityKind !== "source-project") return null;
  const exploration = createSourceRecord({
    recordVersion: 1,
    entityKind: "exploration",
    sourceContextIdentity: context.value,
    providerNativeIdentity: SYNTHETIC_EXPLORATION_IDENTITY,
    parentEntityIdentity: sourceProject.value.sourceEntityIdentity,
    relatedEntityIdentity: null,
    sourceOrder: 1,
    fields: [explorationName],
    lookupReferences: [],
    fieldTestColumns: [],
    extensionObservations: [],
  });
  if (!exploration.accepted || exploration.value.entityKind !== "exploration") return null;
  const snapshot = createSourceSnapshot({
    snapshotVersion: 1,
    sourceContextIdentity: context.value,
    sourceProjectIdentity: SYNTHETIC_SOURCE_PROJECT_IDENTITY,
    candidateIdentity: "urn:rsrender:synthetic:source-candidate:document-session-r1",
    acceptedAtUtc: "2026-08-20T19:01:00.000Z",
    adapterId: SYNTHETIC_ADAPTER_ID,
    adapterContractVersion: 1,
    providerOrganizationIdentity: SYNTHETIC_PROVIDER_ORGANIZATION_IDENTITY,
    providerAccountScopeIdentity: SYNTHETIC_PROVIDER_ACCOUNT_SCOPE_IDENTITY,
    mappingContractId: "rsrender.synthetic.document-session.mapping",
    mappingContractVersion: 1,
    sourceProject: sourceProject.value,
    explorations: [exploration.value],
    strata: [],
    samples: [],
    fieldTests: [],
    comments: [],
    openHoleGroundwaterObservations: [],
    lookups: [],
    extensionManifest: [],
    sourceDiagnostics: [],
  });
  return snapshot.accepted ? snapshot.value : null;
}

function buildSyntheticAggregate(
  documentIdentity: DocumentIdentity,
  sourceSnapshot: SourceSnapshot,
): Phase1LogProjectAggregate | null {
  const empty = createEmptyPhase1LogProject({
    documentIdentity,
    sourceContextIdentity: sourceSnapshot.sourceContextIdentity,
    sourceProjectIdentity: sourceSnapshot.sourceProjectIdentity,
  });
  if (!empty.accepted) return null;
  const aggregate = decodePhase1LogProjectAggregate({
    ...empty.value,
    phase1Inputs: {
      acceptedSourceSnapshot: sourceSnapshot,
      revisionHandles: empty.value.phase1Inputs.revisionHandles,
    },
  });
  return aggregate.accepted ? aggregate.value : null;
}

export function createSyntheticOverrideRenderDatasetSession(
  input: unknown,
): SyntheticOverrideRenderDatasetSessionCreationResult {
  try {
    const configuration = parseConfiguration(input);
    if (!configuration.accepted) return configuration.result;
    const sourceSnapshot = buildSyntheticSourceSnapshot();
    if (sourceSnapshot === null) return rejected("SYNTHETIC_SESSION_BOOTSTRAP_FAILED");
    const aggregate = buildSyntheticAggregate(configuration.value.documentIdentity, sourceSnapshot);
    if (aggregate === null) return rejected("SYNTHETIC_SESSION_BOOTSTRAP_FAILED");
    const initialized = createInMemoryOverrideRenderDatasetService({
      aggregate,
      ownerGeneration: configuration.value.ownerGeneration,
      capacities: syntheticOverrideRenderDatasetSessionCapacities,
      presentationOverrideCollections: [],
    });
    if (!initialized.accepted) return rejected("SYNTHETIC_SESSION_BOOTSTRAP_FAILED");
    return Object.freeze({
      accepted: true,
      session: Object.freeze({
        documentIdentity: configuration.value.documentIdentity,
        ownerGeneration: configuration.value.ownerGeneration,
        service: initialized.service,
      }),
    });
  } catch {
    return rejected("SYNTHETIC_SESSION_CONFIGURATION_MALFORMED");
  }
}
