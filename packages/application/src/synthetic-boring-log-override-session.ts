import { validateBoringLogLayoutJobInput, type BoringLogLayoutJobInput } from "@rsrender/contracts";
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

export const syntheticBoringLogOverrideSessionRevision =
  "bld-026-synthetic-boring-log-override-session-v1" as const;
export const syntheticBoringLogOverrideSessionCapacities: Readonly<InMemoryOverrideRenderDatasetServiceCapacities> =
  Object.freeze({
    replayEntries: 128,
    historyEntries: 128,
    commits: 128,
    events: 128,
    subscriptionBatch: 128,
    collectionEntries: 256,
    commandReplayEntries: 128,
  });

export type SyntheticBoringLogEditableProperty =
  | "project-name"
  | "boring-title"
  | "material-description"
  | "sample-recovery"
  | "remark-text"
  | "lithology-pattern-style"
  | "description-column-width-mpt";

export interface SyntheticBoringLogEditableBinding {
  readonly semanticId: string;
  readonly property: SyntheticBoringLogEditableProperty;
  readonly sourceFieldIdentity: string;
  readonly sourceEntityIdentity: string;
  readonly valueType: "string" | "number";
  readonly unit: DomainValueRecord["unit"];
}

export interface SyntheticBoringLogOverrideSession {
  readonly documentIdentity: DocumentIdentity;
  readonly ownerGeneration: number;
  readonly layoutJob: BoringLogLayoutJobInput;
  readonly bindings: readonly SyntheticBoringLogEditableBinding[];
  readonly service: InMemoryOverrideRenderDatasetService;
}

export type SyntheticBoringLogOverrideSessionCreationResult =
  | { readonly accepted: true; readonly session: SyntheticBoringLogOverrideSession }
  | {
      readonly accepted: false;
      readonly code:
        | "BORING_LOG_SESSION_CONFIGURATION_MALFORMED"
        | "BORING_LOG_SESSION_DOCUMENT_IDENTITY_INVALID"
        | "BORING_LOG_SESSION_OWNER_GENERATION_INVALID"
        | "BORING_LOG_SESSION_LAYOUT_JOB_INVALID"
        | "BORING_LOG_SESSION_BOOTSTRAP_FAILED";
    };

type DataRecord = Readonly<Record<string, unknown>>;
type EditableField = Readonly<{
  readonly field: SourceFieldRecord;
  readonly binding: SyntheticBoringLogEditableBinding;
}>;

const ADAPTER_ID = "rsrender.synthetic.boring-log.read-only-adapter";
const PROVIDER_ORGANIZATION_IDENTITY =
  "urn:rsrender:synthetic:provider-organization:boring-log-mvp";
const PROVIDER_ACCOUNT_SCOPE_IDENTITY = "urn:rsrender:synthetic:provider-account:boring-log-mvp";
const RETRIEVED_AT_UTC = "2026-08-21T20:30:00.000Z";
const acceptedAtUtc = "2026-08-21T20:31:00.000Z";
const noUnit = Object.freeze({ state: "not-applicable" } as const);
const feetUnit = Object.freeze({ state: "specified", quantity: "length", symbol: "ft" } as const);
const percentUnit = Object.freeze({ state: "specified", quantity: "ratio", symbol: "%" } as const);
const mptUnit = Object.freeze({ state: "specified", quantity: "length", symbol: "mpt" } as const);
const blockedEligibility = Object.freeze({ state: "blocked", reasonCodes: ["content"] } as const);

function rejected(
  code: Exclude<
    SyntheticBoringLogOverrideSessionCreationResult,
    { readonly accepted: true }
  >["code"],
): SyntheticBoringLogOverrideSessionCreationResult {
  return Object.freeze({ accepted: false, code });
}

function ownDataRecord(input: unknown, fields: readonly string[]): DataRecord | null {
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
    const prototype = Object.getPrototypeOf(input) as unknown;
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(input);
    if (
      keys.some((key) => typeof key !== "string" || !fields.includes(key)) ||
      fields.some((field) => !keys.includes(field))
    ) {
      return null;
    }
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const field of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(input, field);
      if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable)
        return null;
      result[field] = descriptor.value;
    }
    return Object.freeze(result);
  } catch {
    return null;
  }
}

function content(value: string | number): DomainValueRecord["content"] {
  if (typeof value === "string") {
    return value.length === 0
      ? { kind: "empty-string" }
      : { kind: "value", value, originalRepresentation: value };
  }
  return value === 0
    ? { kind: "zero", value: 0, originalRepresentation: "0" }
    : { kind: "value", value, originalRepresentation: String(value) };
}

function sourceValue(
  sourceContextIdentity: SourceContextIdentity,
  sourceEntityIdentity: SourceEntityIdentity,
  sourceFieldIdentity: string,
  fieldPath: string,
  value: string | number | null,
  unit: DomainValueRecord["unit"],
  editable: boolean,
): DomainValueRecord {
  return {
    recordVersion: 1,
    content: value === null ? { kind: "null" } : content(value),
    association: { state: "not-applicable" },
    finality: { state: "not-applicable" },
    eligibility: editable ? { state: "eligible", reasonCodes: [] } : blockedEligibility,
    unit,
    provenance: {
      provenanceClass: "source",
      sourceContextIdentity,
      entityIdentity: sourceEntityIdentity,
      fieldIdentity: sourceFieldIdentity,
      adapterId: ADAPTER_ID,
      adapterContractVersion: 1,
      retrievedAtUtc: RETRIEVED_AT_UTC,
      mappingRuleId: `rsrender.synthetic.boring-log.${fieldPath}`,
      mappingRuleVersion: 1,
      basisCodes: [],
      transformations: [],
    },
  };
}

function field(
  sourceContextIdentity: SourceContextIdentity,
  sourceEntityIdentity: SourceEntityIdentity,
  fieldPath: string,
  value: string | number | null,
  unit: DomainValueRecord["unit"],
  editable: boolean,
): SourceFieldRecord | null {
  const identity = deriveSourceFieldIdentity({ sourceEntityIdentity, fieldPath });
  if (!identity.accepted) return null;
  const result = createSourceFieldRecord({
    fieldVersion: 1,
    sourceContextIdentity,
    sourceEntityIdentity,
    fieldPath,
    value: sourceValue(
      sourceContextIdentity,
      sourceEntityIdentity,
      identity.value,
      fieldPath,
      value,
      unit,
      editable,
    ),
  });
  return result.accepted ? result.value : null;
}

function editableField(
  sourceContextIdentity: SourceContextIdentity,
  sourceEntityIdentity: SourceEntityIdentity,
  fieldPath: string,
  value: string | number,
  unit: DomainValueRecord["unit"],
  semanticId: string,
  property: SyntheticBoringLogEditableProperty,
): EditableField | null {
  const created = field(sourceContextIdentity, sourceEntityIdentity, fieldPath, value, unit, true);
  return created === null
    ? null
    : Object.freeze({
        field: created,
        binding: Object.freeze({
          semanticId,
          property,
          sourceFieldIdentity: created.sourceFieldIdentity,
          sourceEntityIdentity,
          valueType: typeof value === "string" ? "string" : "number",
          unit,
        }),
      });
}

function entity(
  sourceContextIdentity: SourceContextIdentity,
  entityKind: "source-project" | "exploration" | "stratum" | "sample" | "comment" | "lookup",
  providerNativeIdentity: string,
): SourceEntityIdentity | null {
  const result = deriveSourceEntityIdentity({
    sourceContextIdentity,
    entityKind,
    providerNativeIdentity,
  });
  return result.accepted ? result.value : null;
}

function buildSnapshot(job: BoringLogLayoutJobInput): Readonly<{
  readonly snapshot: SourceSnapshot;
  readonly bindings: readonly SyntheticBoringLogEditableBinding[];
}> | null {
  const document = job.document;
  const sourceProjectIdentity = `urn:rsrender:synthetic:boring-log-project:${document.fixtureId}`;
  const context = deriveSourceContextIdentity({
    adapterId: ADAPTER_ID,
    providerOrganizationIdentity: PROVIDER_ORGANIZATION_IDENTITY,
    providerAccountScopeIdentity: PROVIDER_ACCOUNT_SCOPE_IDENTITY,
    sourceProjectIdentity,
  });
  if (!context.accepted) return null;
  const projectIdentity = entity(context.value, "source-project", sourceProjectIdentity);
  const explorationIdentity = entity(context.value, "exploration", document.identity.explorationId);
  if (projectIdentity === null || explorationIdentity === null) return null;
  const projectName = editableField(
    context.value,
    projectIdentity,
    SOURCE_MAPPED_FIELD_PATHS.projectName,
    document.metadata.projectName,
    noUnit,
    "header-project-metadata",
    "project-name",
  );
  const boringTitle = editableField(
    context.value,
    explorationIdentity,
    SOURCE_MAPPED_FIELD_PATHS.explorationName,
    document.metadata.documentTitle,
    noUnit,
    "header-title",
    "boring-title",
  );
  const totalDepth = field(
    context.value,
    explorationIdentity,
    SOURCE_MAPPED_FIELD_PATHS.explorationTotalDepth,
    document.metadata.totalDepthFt,
    feetUnit,
    false,
  );
  if (projectName === null || boringTitle === null || totalDepth === null) return null;
  const project = createSourceRecord({
    recordVersion: 1,
    entityKind: "source-project",
    sourceContextIdentity: context.value,
    providerNativeIdentity: sourceProjectIdentity,
    parentEntityIdentity: null,
    relatedEntityIdentity: null,
    sourceOrder: null,
    fields: [projectName.field],
    lookupReferences: [],
    fieldTestColumns: [],
    extensionObservations: [],
  });
  const exploration = createSourceRecord({
    recordVersion: 1,
    entityKind: "exploration",
    sourceContextIdentity: context.value,
    providerNativeIdentity: document.identity.explorationId,
    parentEntityIdentity: projectIdentity,
    relatedEntityIdentity: null,
    sourceOrder: 1,
    fields: [boringTitle.field, totalDepth],
    lookupReferences: [],
    fieldTestColumns: [],
    extensionObservations: [],
  });
  if (!project.accepted || !exploration.accepted) return null;
  const bindings: SyntheticBoringLogEditableBinding[] = [projectName.binding, boringTitle.binding];
  const descriptionColumn = job.template.columns.find(
    ({ role }) => role === "material-description",
  );
  if (descriptionColumn === undefined) return null;
  const lookups = [];
  for (const specification of [
    {
      id: "template-lithology-pattern-style",
      family: "rsrender-template-style",
      name: "Lithology pattern style",
      value: "reference-varied-patterns",
      unit: noUnit,
      semanticId: "column-lithology",
      property: "lithology-pattern-style",
    },
    {
      id: "template-description-column-width",
      family: "rsrender-template-layout",
      name: "Material description column width",
      value: descriptionColumn.widthMpt,
      unit: mptUnit,
      semanticId: "column-description",
      property: "description-column-width-mpt",
    },
  ] as const) {
    const identity = entity(context.value, "lookup", specification.id);
    if (identity === null) return null;
    const family = field(
      context.value,
      identity,
      SOURCE_MAPPED_FIELD_PATHS.lookupFamily,
      specification.family,
      noUnit,
      false,
    );
    const name = field(
      context.value,
      identity,
      SOURCE_MAPPED_FIELD_PATHS.lookupName,
      specification.name,
      noUnit,
      false,
    );
    const code = editableField(
      context.value,
      identity,
      SOURCE_MAPPED_FIELD_PATHS.lookupCode,
      specification.value,
      specification.unit,
      specification.semanticId,
      specification.property,
    );
    if (family === null || name === null || code === null) return null;
    const record = createSourceRecord({
      recordVersion: 1,
      entityKind: "lookup",
      sourceContextIdentity: context.value,
      providerNativeIdentity: specification.id,
      parentEntityIdentity: projectIdentity,
      relatedEntityIdentity: null,
      sourceOrder: lookups.length + 1,
      fields: [family, name, code.field],
      lookupReferences: [],
      fieldTestColumns: [],
      extensionObservations: [],
    });
    if (!record.accepted) return null;
    lookups.push(record.value);
    bindings.push(code.binding);
  }
  const strata = [];
  for (const [index, interval] of document.lithologyIntervals.entries()) {
    const identity = entity(context.value, "stratum", interval.id);
    if (identity === null) return null;
    const start = field(
      context.value,
      identity,
      SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
      interval.depthFromFt,
      feetUnit,
      false,
    );
    const end = field(
      context.value,
      identity,
      SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
      interval.depthToFt,
      feetUnit,
      false,
    );
    const description = editableField(
      context.value,
      identity,
      SOURCE_MAPPED_FIELD_PATHS.stratumDescription,
      interval.description,
      noUnit,
      `lithology:${interval.id}`,
      "material-description",
    );
    if (start === null || end === null || description === null) return null;
    const record = createSourceRecord({
      recordVersion: 1,
      entityKind: "stratum",
      sourceContextIdentity: context.value,
      providerNativeIdentity: interval.id,
      parentEntityIdentity: explorationIdentity,
      relatedEntityIdentity: null,
      sourceOrder: index + 1,
      fields: [start, end, description.field],
      lookupReferences: [],
      fieldTestColumns: [],
      extensionObservations: [],
    });
    if (!record.accepted) return null;
    strata.push(record.value);
    bindings.push(description.binding);
  }
  const samples = [];
  for (const [index, sample] of document.samples.entries()) {
    const identity = entity(context.value, "sample", sample.id);
    if (identity === null) return null;
    const start = field(
      context.value,
      identity,
      SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
      sample.depthFt,
      feetUnit,
      false,
    );
    const end = field(
      context.value,
      identity,
      SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
      null,
      feetUnit,
      false,
    );
    const number = field(
      context.value,
      identity,
      SOURCE_MAPPED_FIELD_PATHS.sampleNumber,
      sample.label,
      noUnit,
      false,
    );
    const recovery = editableField(
      context.value,
      identity,
      SOURCE_MAPPED_FIELD_PATHS.sampleRecovery,
      sample.recoveryPercent,
      percentUnit,
      `sample:${sample.id}`,
      "sample-recovery",
    );
    if (start === null || end === null || number === null || recovery === null) return null;
    const record = createSourceRecord({
      recordVersion: 1,
      entityKind: "sample",
      sourceContextIdentity: context.value,
      providerNativeIdentity: sample.id,
      parentEntityIdentity: explorationIdentity,
      relatedEntityIdentity: null,
      sourceOrder: index + 1,
      fields: [start, end, number, recovery.field],
      lookupReferences: [],
      fieldTestColumns: [],
      extensionObservations: [],
    });
    if (!record.accepted) return null;
    samples.push(record.value);
    bindings.push(recovery.binding);
  }
  const comments = [];
  for (const [index, remark] of document.remarks.entries()) {
    const identity = entity(context.value, "comment", remark.id);
    if (identity === null) return null;
    const text = editableField(
      context.value,
      identity,
      SOURCE_MAPPED_FIELD_PATHS.commentText,
      remark.text,
      noUnit,
      `remark:${remark.id}`,
      "remark-text",
    );
    const start = field(
      context.value,
      identity,
      SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
      remark.depthFromFt,
      feetUnit,
      false,
    );
    const end = field(
      context.value,
      identity,
      SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
      remark.depthToFt,
      feetUnit,
      false,
    );
    if (text === null || start === null || end === null) return null;
    const record = createSourceRecord({
      recordVersion: 1,
      entityKind: "comment",
      sourceContextIdentity: context.value,
      providerNativeIdentity: remark.id,
      parentEntityIdentity: explorationIdentity,
      relatedEntityIdentity: null,
      sourceOrder: index + 1,
      fields: [text.field, start, end],
      lookupReferences: [],
      fieldTestColumns: [],
      extensionObservations: [],
    });
    if (!record.accepted) return null;
    comments.push(record.value);
    bindings.push(text.binding);
  }
  const snapshot = createSourceSnapshot({
    snapshotVersion: 1,
    sourceContextIdentity: context.value,
    sourceProjectIdentity,
    candidateIdentity: `urn:rsrender:synthetic:boring-log-candidate:${document.fixtureId}`,
    acceptedAtUtc,
    adapterId: ADAPTER_ID,
    adapterContractVersion: 1,
    providerOrganizationIdentity: PROVIDER_ORGANIZATION_IDENTITY,
    providerAccountScopeIdentity: PROVIDER_ACCOUNT_SCOPE_IDENTITY,
    mappingContractId: "rsrender.synthetic.boring-log.mapping",
    mappingContractVersion: 1,
    sourceProject: project.value,
    explorations: [exploration.value],
    strata,
    samples,
    fieldTests: [],
    comments,
    openHoleGroundwaterObservations: [],
    lookups,
    extensionManifest: [],
    sourceDiagnostics: [],
  });
  return snapshot.accepted
    ? Object.freeze({ snapshot: snapshot.value, bindings: Object.freeze(bindings) })
    : null;
}

function aggregate(
  documentIdentity: DocumentIdentity,
  snapshot: SourceSnapshot,
): Phase1LogProjectAggregate | null {
  const empty = createEmptyPhase1LogProject({
    documentIdentity,
    sourceContextIdentity: snapshot.sourceContextIdentity,
    sourceProjectIdentity: snapshot.sourceProjectIdentity,
  });
  if (!empty.accepted) return null;
  const result = decodePhase1LogProjectAggregate({
    ...empty.value,
    phase1Inputs: {
      acceptedSourceSnapshot: snapshot,
      revisionHandles: empty.value.phase1Inputs.revisionHandles,
    },
  });
  return result.accepted ? result.value : null;
}

export function createSyntheticBoringLogOverrideSession(
  input: unknown,
): SyntheticBoringLogOverrideSessionCreationResult {
  try {
    const record = ownDataRecord(input, ["documentIdentity", "ownerGeneration", "layoutJob"]);
    if (record === null) return rejected("BORING_LOG_SESSION_CONFIGURATION_MALFORMED");
    let documentIdentity: DocumentIdentity;
    try {
      documentIdentity = documentIdentityCodec.parse(record["documentIdentity"]);
    } catch {
      return rejected("BORING_LOG_SESSION_DOCUMENT_IDENTITY_INVALID");
    }
    const ownerGeneration = record["ownerGeneration"];
    if (
      typeof ownerGeneration !== "number" ||
      !Number.isSafeInteger(ownerGeneration) ||
      ownerGeneration < 1 ||
      Object.is(ownerGeneration, -0)
    ) {
      return rejected("BORING_LOG_SESSION_OWNER_GENERATION_INVALID");
    }
    const layoutJob = validateBoringLogLayoutJobInput(record["layoutJob"]);
    if (!layoutJob.accepted) return rejected("BORING_LOG_SESSION_LAYOUT_JOB_INVALID");
    const source = buildSnapshot(layoutJob.value);
    if (source === null) return rejected("BORING_LOG_SESSION_BOOTSTRAP_FAILED");
    const initialAggregate = aggregate(documentIdentity, source.snapshot);
    if (initialAggregate === null) return rejected("BORING_LOG_SESSION_BOOTSTRAP_FAILED");
    const initialized = createInMemoryOverrideRenderDatasetService({
      aggregate: initialAggregate,
      ownerGeneration,
      capacities: syntheticBoringLogOverrideSessionCapacities,
      presentationOverrideCollections: [],
    });
    if (!initialized.accepted) return rejected("BORING_LOG_SESSION_BOOTSTRAP_FAILED");
    return Object.freeze({
      accepted: true,
      session: Object.freeze({
        documentIdentity,
        ownerGeneration,
        layoutJob: layoutJob.value,
        bindings: source.bindings,
        service: initialized.service,
      }),
    });
  } catch {
    return rejected("BORING_LOG_SESSION_CONFIGURATION_MALFORMED");
  }
}
