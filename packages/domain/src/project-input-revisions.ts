import {
  canonicalizeJson,
  defineOpaqueIdentityCodec,
  parseSha256Digest,
  sha256CanonicalJson,
  type OpaqueIdentity,
  type Sha256Digest,
} from "@rsrender/contracts";

import {
  createEmptyLogProject,
  decodeLogProjectAggregate,
  divergeEmbeddedTemplateRepresentation,
  documentIdentityCodec,
  evaluateCompleteTemplateAssignments,
  resolveEffectiveTemplateAssignment,
  replaceSharedEmbeddedTemplateRepresentation,
  type AggregateRejectionCode,
  type CompleteAssignmentEvaluationResult,
  type DocumentIdentity,
  type EffectiveAssignmentResult,
  type LogProjectAggregate,
  type LogSetComposition,
  type SourceContextIdentity,
  type SourceProjectIdentity,
} from "./aggregate-skeleton.js";
import {
  createDiagnosticFact,
  decodeDiagnosticFactSet,
  type DiagnosticFact,
} from "./diagnostic-fact.js";
import {
  decodeSourceSnapshot,
  type SourceSnapshot,
  type SourceSnapshotIdentity,
  type SourceSnapshotRejectionCode,
} from "./source-snapshot.js";

/** Additive Phase 1 expansion; the closed BLD-009 aggregate remains version 1. */
export const phase1LogProjectAggregateVersion = 2 as const;
export const phase1ProjectInputContractRevision = "bld-016-project-input-revisions-v1" as const;
export const projectInputRevisionHandleVersion = 1 as const;

export const PROJECT_INPUT_COLLECTION_KINDS = Object.freeze([
  "supplemental-sources",
  "presentation-overrides",
  "freeform-annotations",
  "source-resolution-decisions",
  "source-extension-bindings",
  "page-range-configuration",
  "data-track-configuration",
] as const);

export type ProjectInputCollectionKind = (typeof PROJECT_INPUT_COLLECTION_KINDS)[number];
export type ProjectInputRevisionIdentity = OpaqueIdentity<"ProjectInputRevisionIdentity">;

export const projectInputRevisionIdentityCodec = defineOpaqueIdentityCodec(
  "ProjectInputRevisionIdentity",
);

type Phase1ProjectSpecificRejectionCode =
  | "PHASE1_PROJECT_MALFORMED"
  | "PHASE1_PROJECT_MISSING_FIELD"
  | "PHASE1_PROJECT_EXTRA_FIELD"
  | "PHASE1_PROJECT_WRONG_TYPE"
  | "PHASE1_PROJECT_UNKNOWN_TAG"
  | "PHASE1_PROJECT_UNSUPPORTED_VERSION"
  | "PHASE1_PROJECT_CORE_INVALID"
  | "PHASE1_PROJECT_HANDLE_MISSING"
  | "PHASE1_PROJECT_HANDLE_DUPLICATE"
  | "PHASE1_PROJECT_HANDLE_KIND_INVALID"
  | "PHASE1_PROJECT_HANDLE_ORDER_MISMATCH"
  | "PHASE1_PROJECT_HANDLE_OWNER_MISMATCH"
  | "PHASE1_PROJECT_HANDLE_IDENTITY_MISMATCH"
  | "PHASE1_PROJECT_HANDLE_DIGEST_MISMATCH"
  | "PHASE1_PROJECT_HANDLE_STATE_INVALID"
  | "PHASE1_PROJECT_HANDLE_REVISION_INVALID"
  | "PHASE1_PROJECT_SNAPSHOT_CONTEXT_MISMATCH"
  | "PHASE1_PROJECT_SNAPSHOT_PROJECT_MISMATCH";

export type Phase1ProjectRejectionCode =
  Phase1ProjectSpecificRejectionCode | AggregateRejectionCode | SourceSnapshotRejectionCode;

export interface ProjectInputRevisionHandle<
  Kind extends ProjectInputCollectionKind = ProjectInputCollectionKind,
> {
  readonly handleVersion: 1;
  readonly collectionKind: Kind;
  readonly ownerDocumentIdentity: DocumentIdentity;
  readonly state: "empty" | "current";
  readonly projectRevision: number;
  readonly revisionIdentity: ProjectInputRevisionIdentity;
  readonly contentDigest: Sha256Digest;
}

export interface Phase1ProjectInputs {
  readonly acceptedSourceSnapshot: SourceSnapshot | null;
  readonly revisionHandles: readonly ProjectInputRevisionHandle[];
}

export interface Phase1LogProjectAggregate {
  readonly aggregateVersion: 2;
  readonly aggregateKind: "log-project";
  readonly documentIdentity: DocumentIdentity;
  readonly sourceContextIdentity: SourceContextIdentity;
  readonly sourceProjectIdentity: SourceProjectIdentity;
  readonly logSet: LogSetComposition;
  readonly phase1Inputs: Phase1ProjectInputs;
}

export type Phase1ProjectDecodeResult =
  | { readonly accepted: true; readonly value: Phase1LogProjectAggregate }
  | { readonly accepted: false; readonly code: Phase1ProjectRejectionCode };

export type Phase1ProjectEncodeResult =
  | {
      readonly accepted: true;
      readonly value: Phase1LogProjectAggregate;
      readonly canonicalJson: string;
      readonly digest: Sha256Digest;
    }
  | { readonly accepted: false; readonly code: Phase1ProjectRejectionCode };

export type ProjectInputRevisionDerivationResult =
  | { readonly accepted: true; readonly value: ProjectInputRevisionIdentity }
  | { readonly accepted: false; readonly code: Phase1ProjectRejectionCode };

export type ProjectInputRevisionHandleResult =
  | { readonly accepted: true; readonly value: ProjectInputRevisionHandle }
  | { readonly accepted: false; readonly code: Phase1ProjectRejectionCode };

export type ProjectInputContentDigestResult =
  | { readonly accepted: true; readonly value: Sha256Digest }
  | { readonly accepted: false; readonly code: Phase1ProjectRejectionCode };

export type ProjectInputRevisionLookupResult =
  | { readonly accepted: true; readonly value: ProjectInputRevisionHandle }
  | { readonly accepted: false; readonly code: Phase1ProjectRejectionCode };

export type Phase1ProjectCoreOperationResult =
  | { readonly accepted: true; readonly value: Phase1LogProjectAggregate }
  | {
      readonly accepted: false;
      readonly code: Phase1ProjectRejectionCode | AggregateRejectionCode;
    };

export type Phase1ProjectCompatibilityFailure = {
  readonly accepted: false;
  readonly code: Phase1ProjectRejectionCode;
};

export type Phase1EffectiveAssignmentResult =
  EffectiveAssignmentResult | Phase1ProjectCompatibilityFailure;

export type Phase1CompleteAssignmentEvaluationResult =
  CompleteAssignmentEvaluationResult | Phase1ProjectCompatibilityFailure;

export type Phase1ProjectMigrationResult =
  | {
      readonly migrated: true;
      readonly fromVersion: 1;
      readonly toVersion: 2;
      readonly value: Phase1LogProjectAggregate;
    }
  | { readonly migrated: false; readonly code: Phase1ProjectRejectionCode };

export type Phase1CompatibilityViewResult =
  | { readonly accepted: true; readonly value: LogProjectAggregate }
  | { readonly accepted: false; readonly code: Phase1ProjectRejectionCode };

export interface Phase1ProjectAvailability {
  readonly structuralAuthoring: "available";
  readonly sourceSnapshot: "present" | "absent";
  readonly templateAssignments: "complete" | "incomplete";
  readonly sourceMemberships: "available" | "unavailable";
  readonly evaluation: "unavailable" | "not-evaluated-by-bld-016";
  readonly publication: "unavailable" | "not-evaluated-by-bld-016";
  readonly diagnostics: readonly DiagnosticFact[];
}

export type Phase1ProjectAvailabilityResult =
  | { readonly accepted: true; readonly value: Phase1ProjectAvailability }
  | { readonly accepted: false; readonly code: Phase1ProjectRejectionCode };

type DataRecord = Readonly<Record<string, unknown>>;

class Phase1ProjectFailure extends Error {
  public readonly code: Phase1ProjectRejectionCode;

  public constructor(code: Phase1ProjectRejectionCode) {
    super(code);
    this.name = "Phase1ProjectFailure";
    this.code = code;
  }
}

function fail(code: Phase1ProjectRejectionCode): never {
  throw new Phase1ProjectFailure(code);
}

function readRecord(input: unknown): DataRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("PHASE1_PROJECT_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("PHASE1_PROJECT_MALFORMED");
  }
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return fail("PHASE1_PROJECT_EXTRA_FIELD");
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("PHASE1_PROJECT_MALFORMED");
    }
    result[key] = descriptor.value;
  }
  return result;
}

function requireFields(record: DataRecord, fields: readonly string[]): void {
  if (fields.some((field) => !Object.hasOwn(record, field))) {
    return fail("PHASE1_PROJECT_MISSING_FIELD");
  }
  if (Object.keys(record).some((field) => !fields.includes(field))) {
    return fail("PHASE1_PROJECT_EXTRA_FIELD");
  }
}

function readArray(input: unknown): readonly unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
    return fail("PHASE1_PROJECT_WRONG_TYPE");
  }
  const allowed = new Set<string>(["length"]);
  const values: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const key = String(index);
    allowed.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("PHASE1_PROJECT_MALFORMED");
    }
    values.push(descriptor.value);
  }
  if (Reflect.ownKeys(input).some((key) => typeof key !== "string" || !allowed.has(key))) {
    return fail("PHASE1_PROJECT_EXTRA_FIELD");
  }
  return values;
}

function readCollectionKind(input: unknown): ProjectInputCollectionKind {
  if (
    typeof input !== "string" ||
    !(PROJECT_INPUT_COLLECTION_KINDS as readonly string[]).includes(input)
  ) {
    return fail("PHASE1_PROJECT_HANDLE_KIND_INVALID");
  }
  return input as ProjectInputCollectionKind;
}

function readDigest(input: unknown): Sha256Digest {
  try {
    return parseSha256Digest(input);
  } catch {
    return fail("PHASE1_PROJECT_WRONG_TYPE");
  }
}

function readProjectRevision(input: unknown, allowZero: boolean): number {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    input < (allowZero ? 0 : 1) ||
    Object.is(input, -0)
  ) {
    return fail("PHASE1_PROJECT_HANDLE_REVISION_INVALID");
  }
  return input;
}

function revisionIdentityFor(
  ownerDocumentIdentity: DocumentIdentity,
  collectionKind: ProjectInputCollectionKind,
  projectRevision: number,
): ProjectInputRevisionIdentity {
  const digest = sha256CanonicalJson({
    schema: "rsrender.project-input-revision-identity.v1",
    ownerDocumentIdentity,
    collectionKind,
    projectRevision,
  });
  return projectInputRevisionIdentityCodec.parse(
    `urn:rsrender:project-input-revision:${digest.slice("sha256:".length)}`,
  );
}

export function deriveProjectInputRevisionIdentity(
  input: unknown,
): ProjectInputRevisionDerivationResult {
  try {
    const record = readRecord(input);
    requireFields(record, ["ownerDocumentIdentity", "collectionKind", "projectRevision"]);
    const ownerDocumentIdentity = documentIdentityCodec.parse(record["ownerDocumentIdentity"]);
    const collectionKind = readCollectionKind(record["collectionKind"]);
    const projectRevision = readProjectRevision(record["projectRevision"], true);
    return Object.freeze({
      accepted: true,
      value: revisionIdentityFor(ownerDocumentIdentity, collectionKind, projectRevision),
    });
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code: error instanceof Phase1ProjectFailure ? error.code : "PHASE1_PROJECT_WRONG_TYPE",
    });
  }
}

function emptyProjectInputContentDigestFor(
  collectionKind: ProjectInputCollectionKind,
): Sha256Digest {
  return sha256CanonicalJson({
    schema: "rsrender.project-input-empty.v1",
    collectionKind,
    items: [],
  });
}

export function deriveEmptyProjectInputContentDigest(
  collectionKind: unknown,
): ProjectInputContentDigestResult {
  try {
    return Object.freeze({
      accepted: true,
      value: emptyProjectInputContentDigestFor(readCollectionKind(collectionKind)),
    });
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code: error instanceof Phase1ProjectFailure ? error.code : "PHASE1_PROJECT_MALFORMED",
    });
  }
}

function parseHandle(
  input: unknown,
  ownerDocumentIdentity: DocumentIdentity,
): ProjectInputRevisionHandle {
  const record = readRecord(input);
  requireFields(record, [
    "handleVersion",
    "collectionKind",
    "ownerDocumentIdentity",
    "state",
    "projectRevision",
    "revisionIdentity",
    "contentDigest",
  ]);
  if (record["handleVersion"] !== projectInputRevisionHandleVersion) {
    return fail("PHASE1_PROJECT_UNSUPPORTED_VERSION");
  }
  if (record["ownerDocumentIdentity"] !== ownerDocumentIdentity) {
    return fail("PHASE1_PROJECT_HANDLE_OWNER_MISMATCH");
  }
  const collectionKind = readCollectionKind(record["collectionKind"]);
  const state = record["state"];
  if (state !== "empty" && state !== "current") {
    return fail("PHASE1_PROJECT_HANDLE_STATE_INVALID");
  }
  const projectRevision = readProjectRevision(record["projectRevision"], state === "empty");
  if ((state === "empty") !== (projectRevision === 0)) {
    return fail("PHASE1_PROJECT_HANDLE_STATE_INVALID");
  }
  const expectedIdentity = revisionIdentityFor(
    ownerDocumentIdentity,
    collectionKind,
    projectRevision,
  );
  if (record["revisionIdentity"] !== expectedIdentity) {
    return fail("PHASE1_PROJECT_HANDLE_IDENTITY_MISMATCH");
  }
  const contentDigest = readDigest(record["contentDigest"]);
  if (state === "empty" && contentDigest !== emptyProjectInputContentDigestFor(collectionKind)) {
    return fail("PHASE1_PROJECT_HANDLE_DIGEST_MISMATCH");
  }
  return Object.freeze({
    handleVersion: projectInputRevisionHandleVersion,
    collectionKind,
    ownerDocumentIdentity,
    state,
    projectRevision,
    revisionIdentity: expectedIdentity,
    contentDigest,
  });
}

export function createProjectInputRevisionHandle(input: unknown): ProjectInputRevisionHandleResult {
  try {
    const record = readRecord(input);
    requireFields(record, [
      "collectionKind",
      "ownerDocumentIdentity",
      "state",
      "projectRevision",
      "contentDigest",
    ]);
    const ownerDocumentIdentity = documentIdentityCodec.parse(record["ownerDocumentIdentity"]);
    const collectionKind = readCollectionKind(record["collectionKind"]);
    if (record["state"] !== "empty" && record["state"] !== "current") {
      return Object.freeze({ accepted: false, code: "PHASE1_PROJECT_HANDLE_STATE_INVALID" });
    }
    const state = record["state"];
    const projectRevision = readProjectRevision(record["projectRevision"], state === "empty");
    return Object.freeze({
      accepted: true,
      value: parseHandle(
        {
          handleVersion: projectInputRevisionHandleVersion,
          collectionKind,
          ownerDocumentIdentity,
          state,
          projectRevision,
          revisionIdentity: revisionIdentityFor(
            ownerDocumentIdentity,
            collectionKind,
            projectRevision,
          ),
          contentDigest: record["contentDigest"],
        },
        ownerDocumentIdentity,
      ),
    });
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code: error instanceof Phase1ProjectFailure ? error.code : "PHASE1_PROJECT_MALFORMED",
    });
  }
}

function emptyProjectInputRevisionHandleFor(
  ownerDocumentIdentity: DocumentIdentity,
  collectionKind: ProjectInputCollectionKind,
): ProjectInputRevisionHandle {
  return parseHandle(
    {
      handleVersion: projectInputRevisionHandleVersion,
      collectionKind,
      ownerDocumentIdentity,
      state: "empty",
      projectRevision: 0,
      revisionIdentity: revisionIdentityFor(ownerDocumentIdentity, collectionKind, 0),
      contentDigest: emptyProjectInputContentDigestFor(collectionKind),
    },
    ownerDocumentIdentity,
  );
}

export function createEmptyProjectInputRevisionHandle(
  ownerDocumentIdentity: unknown,
  collectionKind: unknown,
): ProjectInputRevisionHandleResult {
  try {
    const owner = documentIdentityCodec.parse(ownerDocumentIdentity);
    const kind = readCollectionKind(collectionKind);
    return Object.freeze({
      accepted: true,
      value: emptyProjectInputRevisionHandleFor(owner, kind),
    });
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code: error instanceof Phase1ProjectFailure ? error.code : "PHASE1_PROJECT_WRONG_TYPE",
    });
  }
}

function parseHandles(
  input: unknown,
  ownerDocumentIdentity: DocumentIdentity,
): readonly ProjectInputRevisionHandle[] {
  const handles = readArray(input).map((value) => parseHandle(value, ownerDocumentIdentity));
  const byKind = new Map<ProjectInputCollectionKind, ProjectInputRevisionHandle>();
  for (const handle of handles) {
    if (byKind.has(handle.collectionKind)) return fail("PHASE1_PROJECT_HANDLE_DUPLICATE");
    byKind.set(handle.collectionKind, handle);
  }
  if (
    handles.length !== PROJECT_INPUT_COLLECTION_KINDS.length ||
    PROJECT_INPUT_COLLECTION_KINDS.some((kind) => !byKind.has(kind))
  ) {
    return fail("PHASE1_PROJECT_HANDLE_MISSING");
  }
  if (
    handles.some((handle, index) => handle.collectionKind !== PROJECT_INPUT_COLLECTION_KINDS[index])
  ) {
    return fail("PHASE1_PROJECT_HANDLE_ORDER_MISMATCH");
  }
  return Object.freeze(handles);
}

function parsePhase1Inputs(input: unknown, core: LogProjectAggregate): Phase1ProjectInputs {
  const record = readRecord(input);
  requireFields(record, ["acceptedSourceSnapshot", "revisionHandles"]);
  let acceptedSourceSnapshot: SourceSnapshot | null = null;
  if (record["acceptedSourceSnapshot"] !== null) {
    const decoded = decodeSourceSnapshot(record["acceptedSourceSnapshot"]);
    if (!decoded.accepted) return fail(decoded.code);
    if (decoded.value.sourceContextIdentity !== core.sourceContextIdentity) {
      return fail("PHASE1_PROJECT_SNAPSHOT_CONTEXT_MISMATCH");
    }
    if (decoded.value.sourceProjectIdentity !== core.sourceProjectIdentity) {
      return fail("PHASE1_PROJECT_SNAPSHOT_PROJECT_MISMATCH");
    }
    acceptedSourceSnapshot = decoded.value;
  }
  return Object.freeze({
    acceptedSourceSnapshot,
    revisionHandles: parseHandles(record["revisionHandles"], core.documentIdentity),
  });
}

function coreInput(record: DataRecord): DataRecord {
  return {
    aggregateVersion: 1,
    aggregateKind: record["aggregateKind"],
    documentIdentity: record["documentIdentity"],
    sourceContextIdentity: record["sourceContextIdentity"],
    sourceProjectIdentity: record["sourceProjectIdentity"],
    logSet: record["logSet"],
  };
}

function parsePhase1Project(input: unknown): Phase1LogProjectAggregate {
  const record = readRecord(input);
  requireFields(record, [
    "aggregateVersion",
    "aggregateKind",
    "documentIdentity",
    "sourceContextIdentity",
    "sourceProjectIdentity",
    "logSet",
    "phase1Inputs",
  ]);
  if (record["aggregateVersion"] !== phase1LogProjectAggregateVersion) {
    return fail("PHASE1_PROJECT_UNSUPPORTED_VERSION");
  }
  if (record["aggregateKind"] !== "log-project") return fail("PHASE1_PROJECT_UNKNOWN_TAG");
  const core = decodeLogProjectAggregate(coreInput(record));
  if (!core.accepted) return fail(core.code);
  return Object.freeze({
    aggregateVersion: phase1LogProjectAggregateVersion,
    aggregateKind: "log-project",
    documentIdentity: core.value.documentIdentity,
    sourceContextIdentity: core.value.sourceContextIdentity,
    sourceProjectIdentity: core.value.sourceProjectIdentity,
    logSet: core.value.logSet,
    phase1Inputs: parsePhase1Inputs(record["phase1Inputs"], core.value),
  });
}

function rejected(code: Phase1ProjectRejectionCode): Phase1ProjectDecodeResult {
  return Object.freeze({ accepted: false, code });
}

export function decodePhase1LogProjectAggregate(input: unknown): Phase1ProjectDecodeResult {
  try {
    return Object.freeze({ accepted: true, value: parsePhase1Project(input) });
  } catch (error) {
    return rejected(
      error instanceof Phase1ProjectFailure ? error.code : "PHASE1_PROJECT_MALFORMED",
    );
  }
}

export function encodePhase1LogProjectAggregate(input: unknown): Phase1ProjectEncodeResult {
  const decoded = decodePhase1LogProjectAggregate(input);
  if (!decoded.accepted) return decoded;
  const canonicalJson = canonicalizeJson(decoded.value);
  return Object.freeze({
    accepted: true,
    value: decoded.value,
    canonicalJson,
    digest: sha256CanonicalJson(decoded.value),
  });
}

export function migrateLogProjectAggregateV1ToPhase1V2(
  input: unknown,
): Phase1ProjectMigrationResult {
  const core = decodeLogProjectAggregate(input);
  if (!core.accepted) {
    return Object.freeze({ migrated: false, code: core.code });
  }
  const migrated = decodePhase1LogProjectAggregate({
    aggregateVersion: phase1LogProjectAggregateVersion,
    aggregateKind: "log-project",
    documentIdentity: core.value.documentIdentity,
    sourceContextIdentity: core.value.sourceContextIdentity,
    sourceProjectIdentity: core.value.sourceProjectIdentity,
    logSet: core.value.logSet,
    phase1Inputs: {
      acceptedSourceSnapshot: null,
      revisionHandles: PROJECT_INPUT_COLLECTION_KINDS.map((kind) =>
        emptyProjectInputRevisionHandleFor(core.value.documentIdentity, kind),
      ),
    },
  });
  if (!migrated.accepted) return Object.freeze({ migrated: false, code: migrated.code });
  return Object.freeze({
    migrated: true,
    fromVersion: 1,
    toVersion: phase1LogProjectAggregateVersion,
    value: migrated.value,
  });
}

export function createEmptyPhase1LogProject(input: unknown): Phase1ProjectDecodeResult {
  try {
    const record = readRecord(input);
    requireFields(record, ["documentIdentity", "sourceContextIdentity", "sourceProjectIdentity"]);
    const core = createEmptyLogProject({
      documentIdentity: record["documentIdentity"],
      sourceContextIdentity: record["sourceContextIdentity"],
      sourceProjectIdentity: record["sourceProjectIdentity"],
    });
    if (!core.accepted) return rejected(core.code);
    const migrated = migrateLogProjectAggregateV1ToPhase1V2(core.value);
    return migrated.migrated
      ? Object.freeze({ accepted: true, value: migrated.value })
      : rejected(migrated.code);
  } catch (error) {
    return rejected(
      error instanceof Phase1ProjectFailure ? error.code : "PHASE1_PROJECT_MALFORMED",
    );
  }
}

export function toLogProjectAggregateV1CompatibilityView(
  input: unknown,
): Phase1CompatibilityViewResult {
  const decoded = decodePhase1LogProjectAggregate(input);
  if (!decoded.accepted) return decoded;
  const core = decodeLogProjectAggregate({
    aggregateVersion: 1,
    aggregateKind: "log-project",
    documentIdentity: decoded.value.documentIdentity,
    sourceContextIdentity: decoded.value.sourceContextIdentity,
    sourceProjectIdentity: decoded.value.sourceProjectIdentity,
    logSet: decoded.value.logSet,
  });
  return core.accepted
    ? Object.freeze({ accepted: true, value: core.value })
    : Object.freeze({ accepted: false, code: "PHASE1_PROJECT_CORE_INVALID" });
}

export function resolvePhase1EffectiveTemplateAssignment(
  input: unknown,
  membershipIdentity: unknown,
): Phase1EffectiveAssignmentResult {
  const view = toLogProjectAggregateV1CompatibilityView(input);
  return view.accepted
    ? resolveEffectiveTemplateAssignment(view.value, membershipIdentity)
    : Object.freeze({ accepted: false, code: view.code });
}

export function evaluatePhase1CompleteTemplateAssignments(
  input: unknown,
): Phase1CompleteAssignmentEvaluationResult {
  const view = toLogProjectAggregateV1CompatibilityView(input);
  return view.accepted
    ? evaluateCompleteTemplateAssignments(view.value)
    : Object.freeze({ accepted: false, code: view.code });
}

function rebuildWithCore(
  project: Phase1LogProjectAggregate,
  core: LogProjectAggregate,
): Phase1ProjectDecodeResult {
  return decodePhase1LogProjectAggregate({
    aggregateVersion: phase1LogProjectAggregateVersion,
    aggregateKind: "log-project",
    documentIdentity: core.documentIdentity,
    sourceContextIdentity: core.sourceContextIdentity,
    sourceProjectIdentity: core.sourceProjectIdentity,
    logSet: core.logSet,
    phase1Inputs: project.phase1Inputs,
  });
}

export function replacePhase1SharedEmbeddedTemplateRepresentation(
  input: unknown,
  replacement: unknown,
): Phase1ProjectCoreOperationResult {
  const decoded = decodePhase1LogProjectAggregate(input);
  if (!decoded.accepted) return decoded;
  try {
    const record = readRecord(replacement);
    requireFields(record, [
      "sourceEmbeddedTemplateRepresentationIdentity",
      "newEffectiveContentDigest",
    ]);
    const view = toLogProjectAggregateV1CompatibilityView(decoded.value);
    if (!view.accepted) return view;
    const replaced = replaceSharedEmbeddedTemplateRepresentation(view.value, {
      sourceEmbeddedTemplateRepresentationIdentity:
        record["sourceEmbeddedTemplateRepresentationIdentity"],
      newEffectiveContentDigest: record["newEffectiveContentDigest"],
    });
    if (!replaced.accepted) return replaced;
    return rebuildWithCore(decoded.value, replaced.value);
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code: error instanceof Phase1ProjectFailure ? error.code : "PHASE1_PROJECT_MALFORMED",
    });
  }
}

export function divergePhase1EmbeddedTemplateRepresentation(
  input: unknown,
  divergence: unknown,
): Phase1ProjectCoreOperationResult {
  const decoded = decodePhase1LogProjectAggregate(input);
  if (!decoded.accepted) return decoded;
  try {
    const record = readRecord(divergence);
    requireFields(record, [
      "sourceEmbeddedTemplateRepresentationIdentity",
      "newAdmittedTemplateIdentity",
      "newEffectiveContentDigest",
      "separationOperationIdentity",
      "assignmentIdentitiesToReassign",
    ]);
    const view = toLogProjectAggregateV1CompatibilityView(decoded.value);
    if (!view.accepted) return view;
    const diverged = divergeEmbeddedTemplateRepresentation(view.value, {
      sourceEmbeddedTemplateRepresentationIdentity:
        record["sourceEmbeddedTemplateRepresentationIdentity"],
      newAdmittedTemplateIdentity: record["newAdmittedTemplateIdentity"],
      newEffectiveContentDigest: record["newEffectiveContentDigest"],
      separationOperationIdentity: record["separationOperationIdentity"],
      assignmentIdentitiesToReassign: readArray(record["assignmentIdentitiesToReassign"]),
    });
    if (!diverged.accepted) return diverged;
    return rebuildWithCore(decoded.value, diverged.value);
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code: error instanceof Phase1ProjectFailure ? error.code : "PHASE1_PROJECT_MALFORMED",
    });
  }
}

export function getProjectInputRevisionHandle(
  input: unknown,
  collectionKind: unknown,
): ProjectInputRevisionLookupResult {
  const decoded = decodePhase1LogProjectAggregate(input);
  if (!decoded.accepted) return decoded;
  try {
    const kind = readCollectionKind(collectionKind);
    const handle = decoded.value.phase1Inputs.revisionHandles.find(
      (candidate) => candidate.collectionKind === kind,
    );
    return handle === undefined
      ? Object.freeze({ accepted: false, code: "PHASE1_PROJECT_HANDLE_MISSING" })
      : Object.freeze({ accepted: true, value: handle });
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code: error instanceof Phase1ProjectFailure ? error.code : "PHASE1_PROJECT_MALFORMED",
    });
  }
}

function makeAvailabilityFact(
  code: string,
  category: "source" | "template",
  identityKind: string,
  identity: string,
  causeKey: string,
  inputDigest: Sha256Digest,
): DiagnosticFact {
  const result = createDiagnosticFact({
    factVersion: 1,
    code,
    category,
    affected: { identityKind, identity },
    cause: { causeKey, evidenceClass: "domain-structure" },
    consequence: "unavailable",
    input: { revision: phase1ProjectInputContractRevision, digest: inputDigest },
    remediationActionIds: ["project.review-prerequisite"],
  });
  if (!result.accepted) return fail("PHASE1_PROJECT_MALFORMED");
  return result.value;
}

export function inspectPhase1ProjectAvailability(input: unknown): Phase1ProjectAvailabilityResult {
  const encoded = encodePhase1LogProjectAggregate(input);
  if (!encoded.accepted) return encoded;
  const project = encoded.value;
  const diagnostics: DiagnosticFact[] = [];
  const snapshot = project.phase1Inputs.acceptedSourceSnapshot;
  if (snapshot === null) {
    diagnostics.push(
      makeAvailabilityFact(
        "PROJECT.SOURCE_SNAPSHOT.ABSENT",
        "source",
        "DocumentIdentity",
        project.documentIdentity,
        "source-snapshot-absent",
        encoded.digest,
      ),
    );
  }
  const compatibilityView = toLogProjectAggregateV1CompatibilityView(project);
  if (!compatibilityView.accepted) {
    return Object.freeze({ accepted: false, code: compatibilityView.code });
  }
  const assignmentResult = evaluateCompleteTemplateAssignments(compatibilityView.value);
  if (!assignmentResult.complete) {
    diagnostics.push(
      makeAvailabilityFact(
        "TEMPLATE.ASSIGNMENT.MISSING",
        "template",
        "ExplorationMembershipIdentity",
        assignmentResult.membershipIdentity ?? project.documentIdentity,
        "effective-template-unavailable",
        encoded.digest,
      ),
    );
  }
  const snapshotExplorationIdentities = new Set<string>(
    snapshot?.explorations.map((record) => record.providerNativeIdentity) ?? [],
  );
  const unavailableMemberships =
    snapshot === null
      ? project.logSet.memberships
      : project.logSet.memberships.filter(
          (membership) => !snapshotExplorationIdentities.has(membership.sourceExplorationIdentity),
        );
  for (const membership of unavailableMemberships) {
    diagnostics.push(
      makeAvailabilityFact(
        "PROJECT.MEMBERSHIP.SOURCE_EXPLORATION_UNAVAILABLE",
        "source",
        "ExplorationMembershipIdentity",
        membership.membershipIdentity,
        "source-exploration-unavailable",
        encoded.digest,
      ),
    );
  }
  const facts = decodeDiagnosticFactSet(diagnostics);
  if (!facts.accepted) {
    return Object.freeze({ accepted: false, code: "PHASE1_PROJECT_MALFORMED" });
  }
  const prerequisiteUnavailable =
    snapshot === null || !assignmentResult.complete || unavailableMemberships.length > 0;
  return Object.freeze({
    accepted: true,
    value: Object.freeze({
      structuralAuthoring: "available",
      sourceSnapshot: snapshot === null ? "absent" : "present",
      templateAssignments: assignmentResult.complete ? "complete" : "incomplete",
      sourceMemberships: unavailableMemberships.length === 0 ? "available" : "unavailable",
      evaluation: prerequisiteUnavailable ? "unavailable" : "not-evaluated-by-bld-016",
      publication: prerequisiteUnavailable ? "unavailable" : "not-evaluated-by-bld-016",
      diagnostics: facts.value,
    }),
  });
}

export type Phase1AcceptedSnapshotIdentity = SourceSnapshotIdentity;
