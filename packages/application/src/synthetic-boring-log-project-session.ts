import {
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
  type BoringLogLayoutJobInput,
} from "@rsrender/contracts";
import {
  createEmptyPhase1LogProject,
  createSourceSnapshot,
  decodePhase1LogProjectAggregate,
  deriveEmbeddedTemplateRepresentationIdentity,
  deriveExplorationMembershipIdentity,
  deriveTemplateAssignmentIdentity,
  documentIdentityCodec,
  localAssignmentIdentityCodec,
  sourceExplorationIdentityCodec,
  templateIdentityCodec,
  type DocumentIdentity,
  type Phase1LogProjectAggregate,
  type PresentationOverrideCollection,
  type SourceRecordFamily,
  type SourceSnapshot,
} from "@rsrender/domain";

import {
  createInMemoryOverrideRenderDatasetService,
  type InMemoryOverrideRenderDatasetService,
} from "./in-memory-override-render-dataset-service.js";
import {
  buildSyntheticBoringLogSnapshot,
  syntheticBoringLogOverrideSessionCapacities,
  type SyntheticBoringLogEditableBinding,
} from "./synthetic-boring-log-override-session.js";

export const syntheticBoringLogProjectSessionRevision =
  "bld-036-synthetic-boring-log-project-session-v1" as const;

export interface SyntheticBoringLogProjectDocument {
  readonly boringLogIdentity: string;
  readonly explorationIdentity: string;
  readonly displayName: string;
  readonly ordinal: number;
  readonly warningCount: number;
  readonly layoutJob: BoringLogLayoutJobInput;
  readonly bindings: readonly SyntheticBoringLogEditableBinding[];
}

export interface SyntheticBoringLogProjectSession {
  readonly projectDocumentIdentity: DocumentIdentity;
  readonly ownerGeneration: number;
  readonly documents: readonly SyntheticBoringLogProjectDocument[];
  readonly service: InMemoryOverrideRenderDatasetService;
}

export type SyntheticBoringLogProjectSessionCreationResult =
  | { readonly accepted: true; readonly session: SyntheticBoringLogProjectSession }
  | {
      readonly accepted: false;
      readonly code:
        | "BORING_LOG_PROJECT_CONFIGURATION_MALFORMED"
        | "BORING_LOG_PROJECT_DOCUMENT_IDENTITY_INVALID"
        | "BORING_LOG_PROJECT_OWNER_GENERATION_INVALID"
        | "BORING_LOG_PROJECT_LAYOUT_JOB_INVALID"
        | "BORING_LOG_PROJECT_DUPLICATE_IDENTITY"
        | "BORING_LOG_PROJECT_SOURCE_SCOPE_MISMATCH"
        | "BORING_LOG_PROJECT_BOOTSTRAP_FAILED";
    };

type PreparedDocument = Readonly<{
  layoutJob: BoringLogLayoutJobInput;
  snapshot: SourceSnapshot;
  bindings: readonly SyntheticBoringLogEditableBinding[];
}>;

function rejected(
  code: Extract<SyntheticBoringLogProjectSessionCreationResult, { accepted: false }>["code"],
): SyntheticBoringLogProjectSessionCreationResult {
  return Object.freeze({ accepted: false, code });
}

function ownRecord(input: unknown): Readonly<Record<string, unknown>> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) return null;
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) return null;
    result[key] = descriptor.value;
  }
  return result;
}

function uniqueRecords(
  records: readonly SourceRecordFamily[],
): readonly SourceRecordFamily[] | null {
  const result = new Map<string, SourceRecordFamily>();
  for (const record of records) {
    const previous = result.get(record.sourceEntityIdentity);
    if (previous !== undefined && previous.logicalDigest !== record.logicalDigest) return null;
    result.set(record.sourceEntityIdentity, record);
  }
  return Object.freeze([...result.values()]);
}

function mergeSnapshots(documents: readonly PreparedDocument[]): SourceSnapshot | null {
  const first = documents[0]?.snapshot;
  if (first === undefined) return null;
  if (
    documents.some(
      ({ snapshot }) =>
        snapshot.sourceContextIdentity !== first.sourceContextIdentity ||
        snapshot.sourceProjectIdentity !== first.sourceProjectIdentity ||
        snapshot.sourceProject.logicalDigest !== first.sourceProject.logicalDigest,
    )
  ) {
    return null;
  }
  const families = [
    "explorations",
    "strata",
    "samples",
    "fieldTests",
    "comments",
    "openHoleGroundwaterObservations",
    "lookups",
  ] as const;
  const merged = Object.fromEntries(
    families.map((family) => [
      family,
      uniqueRecords(documents.flatMap(({ snapshot }) => [...snapshot[family]])),
    ]),
  ) as Record<(typeof families)[number], readonly SourceRecordFamily[] | null>;
  if (families.some((family) => merged[family] === null)) return null;
  const created = createSourceSnapshot({
    snapshotVersion: 1,
    sourceContextIdentity: first.sourceContextIdentity,
    sourceProjectIdentity: first.sourceProjectIdentity,
    candidateIdentity: `urn:rsrender:synthetic:boring-log-project-candidate:${sha256CanonicalJson(
      documents.map(({ layoutJob }) => layoutJob.document.identity.explorationId),
    ).slice("sha256:".length)}`,
    acceptedAtUtc: first.acceptedAtUtc,
    adapterId: first.adapterId,
    adapterContractVersion: first.adapterContractVersion,
    providerOrganizationIdentity: first.providerOrganizationIdentity,
    providerAccountScopeIdentity: first.providerAccountScopeIdentity,
    mappingContractId: first.mappingContractId,
    mappingContractVersion: first.mappingContractVersion,
    sourceProject: first.sourceProject,
    explorations: merged.explorations,
    strata: merged.strata,
    samples: merged.samples,
    fieldTests: merged.fieldTests,
    comments: merged.comments,
    openHoleGroundwaterObservations: merged.openHoleGroundwaterObservations,
    lookups: merged.lookups,
    extensionManifest: first.extensionManifest,
    sourceDiagnostics: Object.freeze(
      documents.flatMap(({ snapshot }) => [...snapshot.sourceDiagnostics]),
    ),
  });
  return created.accepted ? created.value : null;
}

function buildProjectAggregate(
  documentIdentity: DocumentIdentity,
  documents: readonly PreparedDocument[],
): Phase1LogProjectAggregate | null {
  const snapshot = mergeSnapshots(documents);
  if (snapshot === null) return null;
  const empty = createEmptyPhase1LogProject({
    documentIdentity,
    sourceContextIdentity: snapshot.sourceContextIdentity,
    sourceProjectIdentity: snapshot.sourceProjectIdentity,
  });
  if (!empty.accepted) return null;
  const memberships = documents.map(({ layoutJob }) => {
    const sourceExplorationIdentity = sourceExplorationIdentityCodec.parse(
      layoutJob.document.identity.explorationId,
    );
    return Object.freeze({
      membershipIdentity: deriveExplorationMembershipIdentity(
        documentIdentity,
        sourceExplorationIdentity,
      ),
      sourceExplorationIdentity,
      groupIdentity: null,
    });
  });
  const embeddedTemplateRepresentations = new Map<
    string,
    Readonly<{
      embeddedTemplateRepresentationIdentity: ReturnType<
        typeof deriveEmbeddedTemplateRepresentationIdentity
      >;
      admittedTemplateIdentity: ReturnType<typeof templateIdentityCodec.parse>;
      effectiveContentDigest: ReturnType<typeof sha256CanonicalJson>;
      origin: Readonly<{ kind: "admitted-template" }>;
    }>
  >();
  const templateAssignments = documents.map(({ layoutJob }, index) => {
    const membership = memberships[index]!;
    const admittedTemplateIdentity = templateIdentityCodec.parse(layoutJob.template.templateId);
    const effectiveContentDigest = sha256CanonicalJson(layoutJob.template);
    const embeddedTemplateRepresentationIdentity = deriveEmbeddedTemplateRepresentationIdentity(
      documentIdentity,
      admittedTemplateIdentity,
      effectiveContentDigest,
    );
    embeddedTemplateRepresentations.set(
      embeddedTemplateRepresentationIdentity,
      Object.freeze({
        embeddedTemplateRepresentationIdentity,
        admittedTemplateIdentity,
        effectiveContentDigest,
        origin: Object.freeze({ kind: "admitted-template" as const }),
      }),
    );
    const localAssignmentIdentity = localAssignmentIdentityCodec.parse(
      `urn:rsrender:local-template-assignment:${layoutJob.document.identity.boringLogId}`,
    );
    const scope = Object.freeze({
      kind: "exploration" as const,
      targetIdentity: membership.membershipIdentity,
    });
    return Object.freeze({
      assignmentIdentity: deriveTemplateAssignmentIdentity(
        documentIdentity,
        localAssignmentIdentity,
        scope,
      ),
      localAssignmentIdentity,
      scope,
      embeddedTemplateRepresentationIdentity,
    });
  });
  const decoded = decodePhase1LogProjectAggregate({
    ...empty.value,
    logSet: {
      ...empty.value.logSet,
      memberships,
      embeddedTemplateRepresentations: [...embeddedTemplateRepresentations.values()],
      templateAssignments,
    },
    phase1Inputs: {
      acceptedSourceSnapshot: snapshot,
      revisionHandles: empty.value.phase1Inputs.revisionHandles,
    },
  });
  return decoded.accepted ? decoded.value : null;
}

function prepareDocuments(input: readonly unknown[]): readonly PreparedDocument[] | null {
  const documents: PreparedDocument[] = [];
  const boringLogIdentities = new Set<string>();
  const explorationIdentities = new Set<string>();
  for (const candidate of input) {
    const layoutJob = validateBoringLogLayoutJobInput(candidate);
    if (!layoutJob.accepted) return null;
    const boringLogIdentity = layoutJob.value.document.identity.boringLogId;
    const explorationIdentity = layoutJob.value.document.identity.explorationId;
    if (
      boringLogIdentities.has(boringLogIdentity) ||
      explorationIdentities.has(explorationIdentity)
    ) {
      return null;
    }
    const provenance = layoutJob.value.document.metadata.provenance;
    const sourceProjectIdentity =
      provenance.provenanceClass === "source"
        ? provenance.sourceProjectIdentity
        : provenance.original.sourceProjectIdentity;
    const prepared = buildSyntheticBoringLogSnapshot(layoutJob.value, sourceProjectIdentity);
    if (prepared === null) return null;
    boringLogIdentities.add(boringLogIdentity);
    explorationIdentities.add(explorationIdentity);
    documents.push(
      Object.freeze({
        layoutJob: layoutJob.value,
        snapshot: prepared.snapshot,
        bindings: prepared.bindings,
      }),
    );
  }
  return Object.freeze(documents);
}

function createSession(
  input: unknown,
  persisted: boolean,
): SyntheticBoringLogProjectSessionCreationResult {
  try {
    const record = ownRecord(input);
    const expectedFields = persisted
      ? [
          "projectDocumentIdentity",
          "ownerGeneration",
          "layoutJobs",
          "projectAggregate",
          "presentationOverrideCollections",
        ]
      : ["projectDocumentIdentity", "ownerGeneration", "layoutJobs"];
    if (
      record === null ||
      Reflect.ownKeys(record).length !== expectedFields.length ||
      expectedFields.some((field) => !(field in record)) ||
      !Array.isArray(record["layoutJobs"]) ||
      record["layoutJobs"].length < 1 ||
      record["layoutJobs"].length > 64
    ) {
      return rejected("BORING_LOG_PROJECT_CONFIGURATION_MALFORMED");
    }
    let projectDocumentIdentity: DocumentIdentity;
    try {
      projectDocumentIdentity = documentIdentityCodec.parse(record["projectDocumentIdentity"]);
    } catch {
      return rejected("BORING_LOG_PROJECT_DOCUMENT_IDENTITY_INVALID");
    }
    const ownerGeneration = record["ownerGeneration"];
    if (!Number.isSafeInteger(ownerGeneration) || (ownerGeneration as number) < 1) {
      return rejected("BORING_LOG_PROJECT_OWNER_GENERATION_INVALID");
    }
    const documents = prepareDocuments(record["layoutJobs"]);
    if (documents === null) return rejected("BORING_LOG_PROJECT_LAYOUT_JOB_INVALID");
    const scopes = documents.map(
      ({ snapshot }) => `${snapshot.sourceContextIdentity}\n${snapshot.sourceProjectIdentity}`,
    );
    if (new Set(scopes).size !== 1) {
      return rejected("BORING_LOG_PROJECT_SOURCE_SCOPE_MISMATCH");
    }
    let aggregate: Phase1LogProjectAggregate | null;
    let collections: readonly PresentationOverrideCollection[];
    if (persisted) {
      const decoded = decodePhase1LogProjectAggregate(record["projectAggregate"]);
      if (
        !decoded.accepted ||
        decoded.value.documentIdentity !== projectDocumentIdentity ||
        !Array.isArray(record["presentationOverrideCollections"])
      ) {
        return rejected("BORING_LOG_PROJECT_BOOTSTRAP_FAILED");
      }
      aggregate = decoded.value;
      collections = record[
        "presentationOverrideCollections"
      ] as readonly PresentationOverrideCollection[];
    } else {
      aggregate = buildProjectAggregate(projectDocumentIdentity, documents);
      collections = Object.freeze([]);
    }
    if (aggregate === null) return rejected("BORING_LOG_PROJECT_BOOTSTRAP_FAILED");
    const initialized = createInMemoryOverrideRenderDatasetService({
      aggregate,
      ownerGeneration,
      capacities: syntheticBoringLogOverrideSessionCapacities,
      presentationOverrideCollections: collections,
    });
    if (!initialized.accepted) return rejected("BORING_LOG_PROJECT_BOOTSTRAP_FAILED");
    return Object.freeze({
      accepted: true,
      session: Object.freeze({
        projectDocumentIdentity,
        ownerGeneration: ownerGeneration as number,
        documents: Object.freeze(
          documents.map(({ layoutJob, bindings }, index) =>
            Object.freeze({
              boringLogIdentity: layoutJob.document.identity.boringLogId,
              explorationIdentity: layoutJob.document.identity.explorationId,
              displayName: layoutJob.document.metadata.documentTitle,
              ordinal: index + 1,
              warningCount: 0,
              layoutJob,
              bindings,
            }),
          ),
        ),
        service: initialized.service,
      }),
    });
  } catch {
    return rejected("BORING_LOG_PROJECT_CONFIGURATION_MALFORMED");
  }
}

export function createSyntheticBoringLogProjectSession(
  input: unknown,
): SyntheticBoringLogProjectSessionCreationResult {
  return createSession(input, false);
}

export function createPersistedBoringLogProjectSession(
  input: unknown,
): SyntheticBoringLogProjectSessionCreationResult {
  return createSession(input, true);
}
