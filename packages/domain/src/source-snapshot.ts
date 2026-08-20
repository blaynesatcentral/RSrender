import {
  canonicalizeJson,
  defineOpaqueIdentityCodec,
  isSha256Digest,
  sha256CanonicalJson,
  sha256Utf8,
  type CanonicalJsonValue,
  type OpaqueIdentity,
  type OpaqueIdentityCodec,
  type Sha256Digest,
} from "@rsrender/contracts";

import { decodeDomainValueRecord, type DomainValueRecord } from "./value-record.js";
import {
  createDiagnosticFact,
  decodeDiagnosticFactSet,
  type DiagnosticFact,
} from "./diagnostic-fact.js";
import {
  sourceExplorationIdentityCodec,
  sourceProjectIdentityCodec,
  type SourceContextIdentity,
  type SourceExplorationIdentity,
  type SourceProjectIdentity,
} from "./aggregate-skeleton.js";

/** Immutable source-only acceptance boundary introduced by BLD-015. */
export const sourceSnapshotContractRevision = "bld-015-source-snapshot-v1" as const;
export const sourceSnapshotVersion = 1 as const;
export const sourceRecordVersion = 1 as const;
export const sourceFieldRecordVersion = 1 as const;
export const sourceExtensionManifestVersion = 1 as const;
export const sourceExtensionObservationVersion = 1 as const;
export const sourceLookupReferenceVersion = 1 as const;
export const sourceFieldTestColumnVersion = 1 as const;

/*
 * Fail-closed safety limits for the deliberately bounded inert-extension envelope. They are not
 * workload, provider, package, or renderer limits and make no claim about production sizing.
 */
export const SOURCE_EXTENSION_MAX_DEPTH = 8 as const;
export const SOURCE_EXTENSION_MAX_NODES = 256 as const;
export const SOURCE_EXTENSION_MAX_CANONICAL_BYTES = 16_384 as const;

export const SOURCE_MAPPED_FIELD_PATHS = Object.freeze({
  projectName: "mapped:/name",
  explorationName: "mapped:/name",
  explorationTotalDepth: "mapped:/totalDepth",
  intervalStartDepth: "mapped:/startDepth",
  intervalEndDepth: "mapped:/endDepth",
  stratumDescription: "mapped:/description",
  stratumSymbolLookup: "mapped:/symbolLookupIdentity",
  sampleNumber: "mapped:/sampleNumber",
  sampleType: "mapped:/sampleType",
  sampleRecovery: "mapped:/recovery",
  fieldTestType: "mapped:/testType",
  commentText: "mapped:/text",
  commentStatus: "mapped:/status",
  groundwaterObservationKind: "mapped:/observationKind",
  groundwaterObservationStatus: "mapped:/observationStatus",
  groundwaterDepth: "mapped:/depth",
  groundwaterElevation: "mapped:/elevation",
  lookupFamily: "mapped:/lookupFamily",
  lookupName: "mapped:/name",
  lookupCode: "mapped:/code",
} as const);

export const OPEN_HOLE_GROUNDWATER_KINDS = Object.freeze([
  "during-drilling",
  "short-term-after",
  "long-term-after",
] as const);
export const OPEN_HOLE_GROUNDWATER_STATUSES = Object.freeze([
  "measured",
  "dry",
  "not-measured",
  "unavailable",
  "malformed",
] as const);

export type OpenHoleGroundwaterKind = (typeof OPEN_HOLE_GROUNDWATER_KINDS)[number];
export type OpenHoleGroundwaterStatus = (typeof OPEN_HOLE_GROUNDWATER_STATUSES)[number];

export const FIELD_TEST_PARSER_STATES = Object.freeze([
  "parsed",
  "unrecognized",
  "malformed",
  "source-evidence-blocked",
] as const);
export type FieldTestParserState = (typeof FIELD_TEST_PARSER_STATES)[number];

export const SOURCE_RECORD_FAMILY_RULES = Object.freeze({
  "source-project": Object.freeze({
    parentKind: "none",
    relatedKinds: Object.freeze([]),
    requiredFieldPaths: Object.freeze([SOURCE_MAPPED_FIELD_PATHS.projectName]),
    allowedFieldPaths: Object.freeze([SOURCE_MAPPED_FIELD_PATHS.projectName]),
  }),
  exploration: Object.freeze({
    parentKind: "source-project",
    relatedKinds: Object.freeze([]),
    requiredFieldPaths: Object.freeze([SOURCE_MAPPED_FIELD_PATHS.explorationName]),
    allowedFieldPaths: Object.freeze([
      SOURCE_MAPPED_FIELD_PATHS.explorationName,
      SOURCE_MAPPED_FIELD_PATHS.explorationTotalDepth,
    ]),
  }),
  stratum: Object.freeze({
    parentKind: "exploration",
    relatedKinds: Object.freeze([]),
    requiredFieldPaths: Object.freeze([
      SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
      SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
      SOURCE_MAPPED_FIELD_PATHS.stratumDescription,
    ]),
    allowedFieldPaths: Object.freeze([
      SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
      SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
      SOURCE_MAPPED_FIELD_PATHS.stratumDescription,
      SOURCE_MAPPED_FIELD_PATHS.stratumSymbolLookup,
    ]),
  }),
  sample: Object.freeze({
    parentKind: "exploration",
    relatedKinds: Object.freeze([]),
    requiredFieldPaths: Object.freeze([
      SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
      SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
    ]),
    allowedFieldPaths: Object.freeze([
      SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
      SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
      SOURCE_MAPPED_FIELD_PATHS.sampleNumber,
      SOURCE_MAPPED_FIELD_PATHS.sampleType,
      SOURCE_MAPPED_FIELD_PATHS.sampleRecovery,
    ]),
  }),
  "field-test": Object.freeze({
    parentKind: "exploration",
    relatedKinds: Object.freeze(["sample"]),
    requiredFieldPaths: Object.freeze([SOURCE_MAPPED_FIELD_PATHS.fieldTestType]),
    allowedFieldPaths: Object.freeze([SOURCE_MAPPED_FIELD_PATHS.fieldTestType]),
  }),
  comment: Object.freeze({
    parentKind: "exploration",
    relatedKinds: Object.freeze(["stratum", "sample", "field-test"]),
    requiredFieldPaths: Object.freeze([SOURCE_MAPPED_FIELD_PATHS.commentText]),
    allowedFieldPaths: Object.freeze([
      SOURCE_MAPPED_FIELD_PATHS.commentText,
      SOURCE_MAPPED_FIELD_PATHS.commentStatus,
      SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
      SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
    ]),
  }),
  "open-hole-groundwater-observation": Object.freeze({
    parentKind: "exploration",
    relatedKinds: Object.freeze([]),
    requiredFieldPaths: Object.freeze([
      SOURCE_MAPPED_FIELD_PATHS.groundwaterObservationKind,
      SOURCE_MAPPED_FIELD_PATHS.groundwaterObservationStatus,
      SOURCE_MAPPED_FIELD_PATHS.groundwaterDepth,
      SOURCE_MAPPED_FIELD_PATHS.groundwaterElevation,
    ]),
    allowedFieldPaths: Object.freeze([
      SOURCE_MAPPED_FIELD_PATHS.groundwaterObservationKind,
      SOURCE_MAPPED_FIELD_PATHS.groundwaterObservationStatus,
      SOURCE_MAPPED_FIELD_PATHS.groundwaterDepth,
      SOURCE_MAPPED_FIELD_PATHS.groundwaterElevation,
    ]),
  }),
  lookup: Object.freeze({
    parentKind: "source-project",
    relatedKinds: Object.freeze([]),
    requiredFieldPaths: Object.freeze([
      SOURCE_MAPPED_FIELD_PATHS.lookupFamily,
      SOURCE_MAPPED_FIELD_PATHS.lookupName,
    ]),
    allowedFieldPaths: Object.freeze([
      SOURCE_MAPPED_FIELD_PATHS.lookupFamily,
      SOURCE_MAPPED_FIELD_PATHS.lookupName,
      SOURCE_MAPPED_FIELD_PATHS.lookupCode,
    ]),
  }),
} as const);

export const SOURCE_ENTITY_KINDS = Object.freeze([
  "source-project",
  "exploration",
  "stratum",
  "sample",
  "field-test",
  "comment",
  "open-hole-groundwater-observation",
  "lookup",
] as const);

export type SourceEntityKind = (typeof SOURCE_ENTITY_KINDS)[number];
export type SourceEntityIdentity = OpaqueIdentity<"SourceEntityIdentity">;
export type SourceFieldIdentity = OpaqueIdentity<"SourceFieldIdentity">;
export type SourceCandidateIdentity = OpaqueIdentity<"SourceCandidateIdentity">;
export type SourceSnapshotIdentity = OpaqueIdentity<"SourceSnapshotIdentity">;
export type SourceExtensionManifestEntryIdentity =
  OpaqueIdentity<"SourceExtensionManifestEntryIdentity">;

export const sourceEntityIdentityCodec = defineOpaqueIdentityCodec("SourceEntityIdentity");
export const sourceFieldIdentityCodec = defineOpaqueIdentityCodec("SourceFieldIdentity");
export const sourceCandidateIdentityCodec = defineOpaqueIdentityCodec("SourceCandidateIdentity");
export const sourceSnapshotIdentityCodec = defineOpaqueIdentityCodec("SourceSnapshotIdentity");
export const sourceExtensionManifestEntryIdentityCodec = defineOpaqueIdentityCodec(
  "SourceExtensionManifestEntryIdentity",
);

export type SourceIdentityDerivationResult<Value> =
  | { readonly accepted: true; readonly value: Value }
  | { readonly accepted: false; readonly code: SourceSnapshotRejectionCode };

export type SourceSnapshotRejectionCode =
  | "SOURCE_SNAPSHOT_MALFORMED"
  | "SOURCE_SNAPSHOT_MISSING_FIELD"
  | "SOURCE_SNAPSHOT_EXTRA_FIELD"
  | "SOURCE_SNAPSHOT_WRONG_TYPE"
  | "SOURCE_SNAPSHOT_UNKNOWN_TAG"
  | "SOURCE_SNAPSHOT_UNSUPPORTED_VERSION"
  | "SOURCE_SNAPSHOT_UNSAFE_UNICODE"
  | "SOURCE_SNAPSHOT_INVALID_IDENTITY"
  | "SOURCE_SNAPSHOT_IDENTITY_MISMATCH"
  | "SOURCE_SNAPSHOT_DIGEST_MISMATCH"
  | "SOURCE_SNAPSHOT_ORDER_MISMATCH"
  | "SOURCE_SNAPSHOT_DUPLICATE_IDENTITY"
  | "SOURCE_SNAPSHOT_CROSS_CONTEXT"
  | "SOURCE_SNAPSHOT_WRONG_KIND"
  | "SOURCE_SNAPSHOT_MISSING_PARENT"
  | "SOURCE_SNAPSHOT_INVALID_CARDINALITY"
  | "SOURCE_SNAPSHOT_INVALID_RELATIONSHIP"
  | "SOURCE_SNAPSHOT_INVALID_INTERVAL"
  | "SOURCE_SNAPSHOT_INVALID_VALUE"
  | "SOURCE_SNAPSHOT_INVALID_UNIT"
  | "SOURCE_SNAPSHOT_EXTENSION_LIMIT"
  | "SOURCE_SNAPSHOT_POSITIVE_CAPABILITY_BLOCKED"
  | "SOURCE_SNAPSHOT_DIAGNOSTIC_MISMATCH";

export interface SourceFieldRecordDraft {
  readonly fieldVersion: 1;
  readonly sourceContextIdentity: SourceContextIdentity;
  readonly sourceEntityIdentity: SourceEntityIdentity;
  readonly fieldPath: string;
  readonly value: DomainValueRecord;
}

export interface SourceFieldRecord extends SourceFieldRecordDraft {
  readonly sourceFieldIdentity: SourceFieldIdentity;
  readonly logicalDigest: Sha256Digest;
}

export type SourceExtensionJsonKind = "null" | "boolean" | "number" | "string" | "array" | "object";

export type SourceExtensionDeclaration = "contract" | "schema" | "runtime-present";

export interface SourceExtensionManifestEntryDraft {
  readonly manifestVersion: 1;
  readonly entityKind: SourceEntityKind;
  readonly fieldPath: string;
  readonly expectedJsonKind: SourceExtensionJsonKind;
  readonly declaration: SourceExtensionDeclaration;
}

export interface SourceExtensionManifestEntry extends SourceExtensionManifestEntryDraft {
  readonly manifestEntryIdentity: SourceExtensionManifestEntryIdentity;
  readonly logicalDigest: Sha256Digest;
}

export type SourceExtensionContent =
  | { readonly kind: "absent" }
  | { readonly kind: "present-null" }
  | { readonly kind: "present-value"; readonly value: CanonicalJsonValue };

export interface SourceExtensionObservationDraft {
  readonly observationVersion: 1;
  readonly sourceContextIdentity: SourceContextIdentity;
  readonly sourceEntityIdentity: SourceEntityIdentity;
  readonly manifestEntryIdentity: SourceExtensionManifestEntryIdentity;
  readonly fieldPath: string;
  readonly jsonKind: SourceExtensionJsonKind;
  readonly content: SourceExtensionContent;
  readonly value: DomainValueRecord;
}

export interface SourceExtensionObservation extends SourceExtensionObservationDraft {
  readonly sourceFieldIdentity: SourceFieldIdentity;
  readonly logicalDigest: Sha256Digest;
}

export interface SourceLookupReference {
  readonly referenceVersion: 1;
  readonly sourceContextIdentity: SourceContextIdentity;
  readonly lookupFamily: string;
  readonly providerNativeLookupIdentity: string;
  readonly lookupEntityIdentity: SourceEntityIdentity;
}

export interface SourceFieldTestColumnDraft {
  readonly columnVersion: 1;
  readonly sourceContextIdentity: SourceContextIdentity;
  readonly fieldTestEntityIdentity: SourceEntityIdentity;
  readonly columnIdentity: string;
  readonly columnName: string;
  readonly unitSymbol: string;
  readonly sourceOrder: number | null;
  readonly rawStructuredRepresentation: string;
  readonly rawDigest: Sha256Digest;
  readonly parserState: FieldTestParserState;
  readonly value: SourceFieldRecord;
}

export interface SourceFieldTestColumn extends SourceFieldTestColumnDraft {
  readonly logicalDigest: Sha256Digest;
}

export interface SourceRecordDraft {
  readonly recordVersion: 1;
  readonly entityKind: SourceEntityKind;
  readonly sourceContextIdentity: SourceContextIdentity;
  readonly providerNativeIdentity: string;
  readonly parentEntityIdentity: SourceEntityIdentity | null;
  readonly relatedEntityIdentity: SourceEntityIdentity | null;
  /** Exact source-supplied order, or null when the source supplied no order. */
  readonly sourceOrder: number | null;
  readonly fields: readonly SourceFieldRecord[];
  readonly lookupReferences: readonly SourceLookupReference[];
  readonly fieldTestColumns: readonly SourceFieldTestColumn[];
  readonly extensionObservations: readonly SourceExtensionObservation[];
}

export interface SourceRecord extends SourceRecordDraft {
  readonly sourceEntityIdentity: SourceEntityIdentity;
  readonly logicalDigest: Sha256Digest;
}

type SourceRecordOfKind<Kind extends SourceEntityKind> = Omit<SourceRecord, "entityKind"> & {
  readonly entityKind: Kind;
};

export type SourceProjectRecord = Omit<
  SourceRecordOfKind<"source-project">,
  "parentEntityIdentity" | "relatedEntityIdentity"
> & {
  readonly parentEntityIdentity: null;
  readonly relatedEntityIdentity: null;
};
export type SourceExplorationRecord = Omit<
  SourceRecordOfKind<"exploration">,
  "relatedEntityIdentity"
> & {
  readonly parentEntityIdentity: SourceEntityIdentity;
  readonly relatedEntityIdentity: null;
};
export type SourceStratumRecord = Omit<SourceRecordOfKind<"stratum">, "relatedEntityIdentity"> & {
  readonly parentEntityIdentity: SourceEntityIdentity;
  readonly relatedEntityIdentity: null;
};
export type SourceSampleRecord = Omit<SourceRecordOfKind<"sample">, "relatedEntityIdentity"> & {
  readonly parentEntityIdentity: SourceEntityIdentity;
  readonly relatedEntityIdentity: null;
};
export type SourceFieldTestRecord = SourceRecordOfKind<"field-test"> & {
  readonly parentEntityIdentity: SourceEntityIdentity;
  readonly relatedEntityIdentity: SourceEntityIdentity | null;
  readonly fieldTestColumns: readonly SourceFieldTestColumn[];
};
export type SourceCommentRecord = SourceRecordOfKind<"comment"> & {
  readonly parentEntityIdentity: SourceEntityIdentity;
  readonly relatedEntityIdentity: SourceEntityIdentity | null;
};
export type SourceOpenHoleGroundwaterRecord = Omit<
  SourceRecordOfKind<"open-hole-groundwater-observation">,
  "relatedEntityIdentity"
> & {
  readonly parentEntityIdentity: SourceEntityIdentity;
  readonly relatedEntityIdentity: null;
};
export type SourceLookupRecord = Omit<SourceRecordOfKind<"lookup">, "relatedEntityIdentity"> & {
  readonly parentEntityIdentity: SourceEntityIdentity;
  readonly relatedEntityIdentity: null;
};

export type SourceRecordFamily =
  | SourceProjectRecord
  | SourceExplorationRecord
  | SourceStratumRecord
  | SourceSampleRecord
  | SourceFieldTestRecord
  | SourceCommentRecord
  | SourceOpenHoleGroundwaterRecord
  | SourceLookupRecord;

export type SourceRecordDecodeResult =
  | { readonly accepted: true; readonly value: SourceRecordFamily }
  | { readonly accepted: false; readonly code: SourceSnapshotRejectionCode };

export type SourceRecordEncodeResult =
  | {
      readonly accepted: true;
      readonly value: SourceRecordFamily;
      readonly canonicalJson: string;
      readonly digest: Sha256Digest;
    }
  | { readonly accepted: false; readonly code: SourceSnapshotRejectionCode };

export type SourceExtensionManifestEntryDecodeResult =
  | { readonly accepted: true; readonly value: SourceExtensionManifestEntry }
  | { readonly accepted: false; readonly code: SourceSnapshotRejectionCode };

export type SourceExtensionObservationDecodeResult =
  | { readonly accepted: true; readonly value: SourceExtensionObservation }
  | { readonly accepted: false; readonly code: SourceSnapshotRejectionCode };

export type SourceFieldTestColumnDecodeResult =
  | { readonly accepted: true; readonly value: SourceFieldTestColumn }
  | { readonly accepted: false; readonly code: SourceSnapshotRejectionCode };

export type SourceSnapshotComponentEncodeResult<Value> =
  | {
      readonly accepted: true;
      readonly value: Value;
      readonly canonicalJson: string;
      readonly digest: Sha256Digest;
    }
  | { readonly accepted: false; readonly code: SourceSnapshotRejectionCode };

export type SourceLookupReferenceDecodeResult =
  | { readonly accepted: true; readonly value: SourceLookupReference }
  | { readonly accepted: false; readonly code: SourceSnapshotRejectionCode };

export const SOURCE_EVIDENCE_BLOCKED_CAPABILITY_IDS = Object.freeze([
  "piezometer-well-series",
  "drilling-detail-and-run",
  "interim-variation",
  "laboratory-api",
  "vendor-hatch-binary",
  "sample-blow-counts-mapping",
] as const);

export type SourceEvidenceBlockedCapabilityId =
  (typeof SOURCE_EVIDENCE_BLOCKED_CAPABILITY_IDS)[number];

export interface SourceEvidenceBlockedCapability {
  readonly capabilityId: SourceEvidenceBlockedCapabilityId;
  readonly disposition: "source-evidence-blocked";
  readonly positiveRecordCount: 0;
  readonly authorityIssue: "#43";
}

export interface SourceSnapshotDraft {
  readonly snapshotVersion: 1;
  readonly sourceContextIdentity: SourceContextIdentity;
  readonly sourceProjectIdentity: SourceProjectIdentity;
  readonly candidateIdentity: SourceCandidateIdentity;
  readonly acceptedAtUtc: string;
  readonly adapterId: string;
  readonly adapterContractVersion: number;
  readonly providerOrganizationIdentity: string;
  readonly providerAccountScopeIdentity: string;
  readonly mappingContractId: string;
  readonly mappingContractVersion: number;
  readonly sourceProject: SourceProjectRecord;
  readonly explorations: readonly SourceExplorationRecord[];
  readonly strata: readonly SourceStratumRecord[];
  readonly samples: readonly SourceSampleRecord[];
  readonly fieldTests: readonly SourceFieldTestRecord[];
  readonly comments: readonly SourceCommentRecord[];
  readonly openHoleGroundwaterObservations: readonly SourceOpenHoleGroundwaterRecord[];
  readonly lookups: readonly SourceLookupRecord[];
  readonly extensionManifest: readonly SourceExtensionManifestEntry[];
  readonly sourceDiagnostics: readonly DiagnosticFact[];
}

export interface SourceSnapshot extends SourceSnapshotDraft {
  readonly blockedCapabilities: readonly SourceEvidenceBlockedCapability[];
  readonly diagnostics: readonly DiagnosticFact[];
  readonly logicalDigest: Sha256Digest;
  readonly snapshotIdentity: SourceSnapshotIdentity;
}

export type SourceSnapshotDecodeResult =
  | { readonly accepted: true; readonly value: SourceSnapshot }
  | { readonly accepted: false; readonly code: SourceSnapshotRejectionCode };

export type SourceSnapshotEncodeResult =
  | {
      readonly accepted: true;
      readonly value: SourceSnapshot;
      readonly canonicalJson: string;
      readonly digest: Sha256Digest;
    }
  | { readonly accepted: false; readonly code: SourceSnapshotRejectionCode };

export type SourceFieldRecordDecodeResult =
  | { readonly accepted: true; readonly value: SourceFieldRecord }
  | { readonly accepted: false; readonly code: SourceSnapshotRejectionCode };

export type SourceFieldRecordEncodeResult =
  | {
      readonly accepted: true;
      readonly value: SourceFieldRecord;
      readonly canonicalJson: string;
      readonly digest: Sha256Digest;
    }
  | { readonly accepted: false; readonly code: SourceSnapshotRejectionCode };

type DataRecord = Readonly<Record<string, unknown>>;

class ParseFailure extends Error {
  readonly code: SourceSnapshotRejectionCode;

  constructor(code: SourceSnapshotRejectionCode) {
    super(code);
    this.name = "ParseFailure";
    this.code = code;
  }
}

const FIELD_PATH_PATTERN =
  /^(?:mapped|extension):\/[A-Za-z0-9][A-Za-z0-9._~-]*(?:\/[A-Za-z0-9][A-Za-z0-9._~-]*)*$/u;

function fail(code: SourceSnapshotRejectionCode): never {
  throw new ParseFailure(code);
}

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const first = value.charCodeAt(index);
    if (first >= 0xd800 && first <= 0xdbff) {
      const second = value.charCodeAt(index + 1);
      if (!(second >= 0xdc00 && second <= 0xdfff)) return false;
      index += 1;
    } else if (first >= 0xdc00 && first <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function readRecord(input: unknown): DataRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("SOURCE_SNAPSHOT_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("SOURCE_SNAPSHOT_MALFORMED");
  }
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return fail("SOURCE_SNAPSHOT_EXTRA_FIELD");
    if (!isWellFormedUnicode(key)) return fail("SOURCE_SNAPSHOT_UNSAFE_UNICODE");
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("SOURCE_SNAPSHOT_MALFORMED");
    }
    result[key] = descriptor.value;
  }
  return result;
}

function requireFields(record: DataRecord, fields: readonly string[]): void {
  if (fields.some((field) => !Object.hasOwn(record, field))) {
    return fail("SOURCE_SNAPSHOT_MISSING_FIELD");
  }
  if (Object.keys(record).some((field) => !fields.includes(field))) {
    return fail("SOURCE_SNAPSHOT_EXTRA_FIELD");
  }
}

function readArray(input: unknown): readonly unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
    return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
  }
  const allowed = new Set<string>(["length"]);
  const result: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const key = String(index);
    allowed.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("SOURCE_SNAPSHOT_MALFORMED");
    }
    result.push(descriptor.value);
  }
  if (Reflect.ownKeys(input).some((key) => typeof key !== "string" || !allowed.has(key))) {
    return fail("SOURCE_SNAPSHOT_EXTRA_FIELD");
  }
  return result;
}

function readText(input: unknown): string {
  if (typeof input !== "string" || input.length === 0) {
    return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
  }
  if (!isWellFormedUnicode(input)) return fail("SOURCE_SNAPSHOT_UNSAFE_UNICODE");
  return input;
}

function readFieldPath(input: unknown): string {
  const value = readText(input);
  if (!FIELD_PATH_PATTERN.test(value)) return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  return value;
}

function readEntityKind(input: unknown): SourceEntityKind {
  const value = readText(input);
  if (!(SOURCE_ENTITY_KINDS as readonly string[]).includes(value)) {
    return fail("SOURCE_SNAPSHOT_UNKNOWN_TAG");
  }
  return value as SourceEntityKind;
}

function readNonnegativeSafeInteger(input: unknown): number {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    input < 0 ||
    Object.is(input, -0)
  ) {
    return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
  }
  return input;
}

function readPositiveSafeInteger(input: unknown): number {
  const value = readNonnegativeSafeInteger(input);
  if (value === 0) return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
  return value;
}

function readNullableOrder(input: unknown): number | null {
  return input === null ? null : readNonnegativeSafeInteger(input);
}

function readNullableIdentity<Kind extends string>(
  input: unknown,
  codec: OpaqueIdentityCodec<Kind>,
): OpaqueIdentity<Kind> | null {
  return input === null ? null : readIdentity(input, codec);
}

function compareCodeUnits(left: string, right: string): number {
  const commonLength = Math.min(left.length, right.length);
  for (let index = 0; index < commonLength; index += 1) {
    const difference = left.charCodeAt(index) - right.charCodeAt(index);
    if (difference !== 0) return difference < 0 ? -1 : 1;
  }
  return left.length === right.length ? 0 : left.length < right.length ? -1 : 1;
}

function compareSourceFields(left: SourceFieldRecord, right: SourceFieldRecord): number {
  return compareCodeUnits(left.fieldPath, right.fieldPath);
}

function compareExtensionObservations(
  left: SourceExtensionObservation,
  right: SourceExtensionObservation,
): number {
  return compareCodeUnits(left.fieldPath, right.fieldPath);
}

function ensureCanonicalOrder<T>(
  supplied: readonly T[],
  sorted: readonly T[],
  identity: (value: T) => string,
): void {
  if (supplied.some((value, index) => identity(value) !== identity(sorted[index] as T))) {
    return fail("SOURCE_SNAPSHOT_ORDER_MISMATCH");
  }
}

function readIdentity<Kind extends string>(
  input: unknown,
  codec: OpaqueIdentityCodec<Kind>,
): OpaqueIdentity<Kind> {
  try {
    return codec.parse(input);
  } catch {
    return fail("SOURCE_SNAPSHOT_INVALID_IDENTITY");
  }
}

function readDigest(input: unknown): Sha256Digest {
  if (!isSha256Digest(input)) return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
  return input;
}

function jsonKindOf(value: CanonicalJsonValue): SourceExtensionJsonKind {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as "boolean" | "number" | "string" | "object";
}

function parseBoundedCanonicalJson(
  input: unknown,
  state: { nodes: number },
  depth = 0,
): CanonicalJsonValue {
  if (depth > SOURCE_EXTENSION_MAX_DEPTH) {
    return fail("SOURCE_SNAPSHOT_EXTENSION_LIMIT");
  }
  state.nodes += 1;
  if (state.nodes > SOURCE_EXTENSION_MAX_NODES) {
    return fail("SOURCE_SNAPSHOT_EXTENSION_LIMIT");
  }
  if (input === null || typeof input === "boolean") return input;
  if (typeof input === "number") {
    if (!Number.isFinite(input) || Object.is(input, -0)) {
      return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
    }
    return input;
  }
  if (typeof input === "string") {
    if (!isWellFormedUnicode(input)) return fail("SOURCE_SNAPSHOT_UNSAFE_UNICODE");
    return input;
  }
  if (Array.isArray(input)) {
    return Object.freeze(
      readArray(input).map((value) => parseBoundedCanonicalJson(value, state, depth + 1)),
    );
  }
  const record = readRecord(input);
  const result: Record<string, CanonicalJsonValue> = Object.create(null) as Record<
    string,
    CanonicalJsonValue
  >;
  for (const key of Object.keys(record).sort(compareCodeUnits)) {
    result[key] = parseBoundedCanonicalJson(record[key], state, depth + 1);
  }
  return Object.freeze(result);
}

function readBoundedCanonicalJson(input: unknown): CanonicalJsonValue {
  const value = parseBoundedCanonicalJson(input, { nodes: 0 });
  const byteLength = new TextEncoder().encode(canonicalizeJson(value)).byteLength;
  if (byteLength > SOURCE_EXTENSION_MAX_CANONICAL_BYTES) {
    return fail("SOURCE_SNAPSHOT_EXTENSION_LIMIT");
  }
  return value;
}

function expectedDomainContentForExtension(
  content: SourceExtensionContent,
): Readonly<Record<string, unknown>> {
  if (content.kind === "absent") return Object.freeze({ kind: "absent" });
  if (content.kind === "present-null") return Object.freeze({ kind: "null" });
  const value = content.value;
  if (typeof value === "string") {
    return value.length === 0
      ? Object.freeze({ kind: "empty-string" })
      : Object.freeze({ kind: "value", value, originalRepresentation: value });
  }
  if (typeof value === "number") {
    const originalRepresentation = String(value);
    return value === 0
      ? Object.freeze({ kind: "zero", value: 0, originalRepresentation })
      : Object.freeze({ kind: "value", value, originalRepresentation });
  }
  if (typeof value === "boolean") {
    return Object.freeze({ kind: "value", value, originalRepresentation: String(value) });
  }
  if (Array.isArray(value) && value.length === 0) {
    return Object.freeze({ kind: "empty-collection" });
  }
  const canonical = canonicalizeJson(value);
  return Object.freeze({ kind: "value", value: canonical, originalRepresentation: canonical });
}

function domainContentMatchesExtension(
  value: DomainValueRecord,
  content: SourceExtensionContent,
): boolean {
  return (
    canonicalizeJson(value.content) === canonicalizeJson(expectedDomainContentForExtension(content))
  );
}

function rejected(code: SourceSnapshotRejectionCode): Readonly<{
  accepted: false;
  code: SourceSnapshotRejectionCode;
}> {
  return Object.freeze({ accepted: false, code });
}

function normalizeFailure(error: unknown): SourceSnapshotRejectionCode {
  return error instanceof ParseFailure ? error.code : "SOURCE_SNAPSHOT_MALFORMED";
}

function deriveIdentity<Kind extends string>(
  codec: OpaqueIdentityCodec<Kind>,
  prefix: string,
  basis: Readonly<Record<string, unknown>>,
): OpaqueIdentity<Kind> {
  return codec.parse(`urn:rsrender:${prefix}:${sha256CanonicalJson(basis)}`);
}

function deriveSourceEntityIdentityValue(
  sourceContextIdentity: SourceContextIdentity,
  entityKind: SourceEntityKind,
  providerNativeIdentity: string,
): SourceEntityIdentity {
  const context = readIdentity(
    sourceContextIdentity,
    defineOpaqueIdentityCodec("SourceContextIdentity"),
  );
  if (!(SOURCE_ENTITY_KINDS as readonly string[]).includes(entityKind)) {
    return fail("SOURCE_SNAPSHOT_UNKNOWN_TAG");
  }
  const nativeIdentity = readText(providerNativeIdentity);
  return deriveIdentity(sourceEntityIdentityCodec, "source-entity", {
    schema: "rsrender.source-entity-identity.v1",
    sourceContextIdentity: context,
    entityKind,
    providerNativeIdentity: nativeIdentity,
  });
}

function deriveSourceContextIdentityValue(input: {
  readonly adapterId: string;
  readonly providerOrganizationIdentity: string;
  readonly providerAccountScopeIdentity: string;
  readonly sourceProjectIdentity: SourceProjectIdentity;
}): SourceContextIdentity {
  return defineOpaqueIdentityCodec("SourceContextIdentity").parse(
    `urn:rsrender:source-context:${sha256CanonicalJson({
      schema: "rsrender.source-context-identity.v1",
      adapterId: input.adapterId,
      providerOrganizationIdentity: input.providerOrganizationIdentity,
      providerAccountScopeIdentity: input.providerAccountScopeIdentity,
      sourceProjectIdentity: input.sourceProjectIdentity,
    })}`,
  );
}

/** Adapter-neutral, credential-free Source Context Identity derivation. */
export function deriveSourceContextIdentity(
  input: unknown,
): SourceIdentityDerivationResult<SourceContextIdentity> {
  try {
    const record = readRecord(input);
    requireFields(record, [
      "adapterId",
      "providerOrganizationIdentity",
      "providerAccountScopeIdentity",
      "sourceProjectIdentity",
    ]);
    return Object.freeze({
      accepted: true,
      value: deriveSourceContextIdentityValue({
        adapterId: readText(record["adapterId"]),
        providerOrganizationIdentity: readText(record["providerOrganizationIdentity"]),
        providerAccountScopeIdentity: readText(record["providerAccountScopeIdentity"]),
        sourceProjectIdentity: readIdentity(
          record["sourceProjectIdentity"],
          sourceProjectIdentityCodec,
        ),
      }),
    });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

/** Total public derivation boundary; malformed hostile input is a typed rejection. */
export function deriveSourceEntityIdentity(
  input: unknown,
): SourceIdentityDerivationResult<SourceEntityIdentity> {
  try {
    const record = readRecord(input);
    requireFields(record, ["sourceContextIdentity", "entityKind", "providerNativeIdentity"]);
    return Object.freeze({
      accepted: true,
      value: deriveSourceEntityIdentityValue(
        readIdentity(
          record["sourceContextIdentity"],
          defineOpaqueIdentityCodec("SourceContextIdentity"),
        ),
        readEntityKind(record["entityKind"]),
        readText(record["providerNativeIdentity"]),
      ),
    });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

function deriveSourceFieldIdentityValue(
  sourceEntityIdentity: SourceEntityIdentity,
  fieldPath: string,
): SourceFieldIdentity {
  const entityIdentity = readIdentity(sourceEntityIdentity, sourceEntityIdentityCodec);
  const canonicalFieldPath = readFieldPath(fieldPath);
  return deriveIdentity(sourceFieldIdentityCodec, "source-field", {
    schema: "rsrender.source-field-identity.v1",
    sourceEntityIdentity: entityIdentity,
    fieldPath: canonicalFieldPath,
  });
}

/** Total public field-identity derivation; mapped and extension paths remain separate codecs. */
export function deriveSourceFieldIdentity(
  input: unknown,
): SourceIdentityDerivationResult<SourceFieldIdentity> {
  try {
    const record = readRecord(input);
    requireFields(record, ["sourceEntityIdentity", "fieldPath"]);
    return Object.freeze({
      accepted: true,
      value: deriveSourceFieldIdentityValue(
        readIdentity(record["sourceEntityIdentity"], sourceEntityIdentityCodec),
        readFieldPath(record["fieldPath"]),
      ),
    });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

function parseSourceValue(
  input: unknown,
  expected: {
    readonly sourceContextIdentity: SourceContextIdentity;
    readonly sourceEntityIdentity: SourceEntityIdentity;
    readonly sourceFieldIdentity: SourceFieldIdentity;
  },
): DomainValueRecord {
  const decoded = decodeDomainValueRecord(input);
  if (!decoded.accepted) return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  const provenance = decoded.value.provenance;
  if (provenance.provenanceClass !== "source") {
    return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  }
  if (provenance.sourceContextIdentity !== expected.sourceContextIdentity) {
    return fail("SOURCE_SNAPSHOT_CROSS_CONTEXT");
  }
  if (
    provenance.entityIdentity !== expected.sourceEntityIdentity ||
    provenance.fieldIdentity !== expected.sourceFieldIdentity
  ) {
    return fail("SOURCE_SNAPSHOT_IDENTITY_MISMATCH");
  }
  return decoded.value;
}

function makeSourceFieldRecord(draft: SourceFieldRecordDraft): SourceFieldRecord {
  const sourceFieldIdentity = deriveSourceFieldIdentityValue(
    draft.sourceEntityIdentity,
    draft.fieldPath,
  );
  const value = parseSourceValue(draft.value, {
    sourceContextIdentity: draft.sourceContextIdentity,
    sourceEntityIdentity: draft.sourceEntityIdentity,
    sourceFieldIdentity,
  });
  const normalized = Object.freeze({ ...draft, value });
  return Object.freeze({
    ...normalized,
    sourceFieldIdentity,
    logicalDigest: sha256CanonicalJson(normalized),
  });
}

function parseSourceFieldDraft(input: unknown): SourceFieldRecordDraft {
  const record = readRecord(input);
  requireFields(record, [
    "fieldVersion",
    "sourceContextIdentity",
    "sourceEntityIdentity",
    "fieldPath",
    "value",
  ]);
  if (record["fieldVersion"] !== sourceFieldRecordVersion) {
    if (typeof record["fieldVersion"] !== "number") return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
    return fail("SOURCE_SNAPSHOT_UNSUPPORTED_VERSION");
  }
  const sourceContextIdentity = readIdentity(
    record["sourceContextIdentity"],
    defineOpaqueIdentityCodec("SourceContextIdentity"),
  );
  const sourceEntityIdentity = readIdentity(
    record["sourceEntityIdentity"],
    sourceEntityIdentityCodec,
  );
  const fieldPath = readFieldPath(record["fieldPath"]);
  if (!fieldPath.startsWith("mapped:/")) return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  const sourceFieldIdentity = deriveSourceFieldIdentityValue(sourceEntityIdentity, fieldPath);
  return Object.freeze({
    fieldVersion: sourceFieldRecordVersion,
    sourceContextIdentity,
    sourceEntityIdentity,
    fieldPath,
    value: parseSourceValue(record["value"], {
      sourceContextIdentity,
      sourceEntityIdentity,
      sourceFieldIdentity,
    }),
  });
}

function parseSourceFieldRecord(input: unknown): SourceFieldRecord {
  const record = readRecord(input);
  requireFields(record, [
    "fieldVersion",
    "sourceContextIdentity",
    "sourceEntityIdentity",
    "fieldPath",
    "value",
    "sourceFieldIdentity",
    "logicalDigest",
  ]);
  const expected = makeSourceFieldRecord(
    parseSourceFieldDraft({
      fieldVersion: record["fieldVersion"],
      sourceContextIdentity: record["sourceContextIdentity"],
      sourceEntityIdentity: record["sourceEntityIdentity"],
      fieldPath: record["fieldPath"],
      value: record["value"],
    }),
  );
  if (
    readIdentity(record["sourceFieldIdentity"], sourceFieldIdentityCodec) !==
    expected.sourceFieldIdentity
  ) {
    return fail("SOURCE_SNAPSHOT_IDENTITY_MISMATCH");
  }
  if (readDigest(record["logicalDigest"]) !== expected.logicalDigest) {
    return fail("SOURCE_SNAPSHOT_DIGEST_MISMATCH");
  }
  return expected;
}

/** Producer codec. Identity and digest are always derived from exact source fact fields. */
export function createSourceFieldRecord(input: unknown): SourceFieldRecordDecodeResult {
  try {
    return Object.freeze({
      accepted: true,
      value: makeSourceFieldRecord(parseSourceFieldDraft(input)),
    });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

/** Strict persisted-boundary codec that independently verifies identity and logical digest. */
export function decodeSourceFieldRecord(input: unknown): SourceFieldRecordDecodeResult {
  try {
    return Object.freeze({ accepted: true, value: parseSourceFieldRecord(input) });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

export function encodeSourceFieldRecord(input: unknown): SourceFieldRecordEncodeResult {
  const decoded = decodeSourceFieldRecord(input);
  if (!decoded.accepted) return decoded;
  const canonicalJson = canonicalizeJson(decoded.value);
  return Object.freeze({
    accepted: true,
    value: decoded.value,
    canonicalJson,
    digest: sha256CanonicalJson(decoded.value),
  });
}

function readExtensionJsonKind(input: unknown): SourceExtensionJsonKind {
  const value = readText(input);
  if (!["null", "boolean", "number", "string", "array", "object"].includes(value)) {
    return fail("SOURCE_SNAPSHOT_UNKNOWN_TAG");
  }
  return value as SourceExtensionJsonKind;
}

function readExtensionDeclaration(input: unknown): SourceExtensionDeclaration {
  const value = readText(input);
  if (!["contract", "schema", "runtime-present"].includes(value)) {
    return fail("SOURCE_SNAPSHOT_UNKNOWN_TAG");
  }
  return value as SourceExtensionDeclaration;
}

function deriveSourceExtensionManifestEntryIdentityValue(
  entityKind: SourceEntityKind,
  fieldPath: string,
): SourceExtensionManifestEntryIdentity {
  const kind = readEntityKind(entityKind);
  const path = readFieldPath(fieldPath);
  if (!path.startsWith("extension:/")) return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  return deriveIdentity(sourceExtensionManifestEntryIdentityCodec, "source-extension-manifest", {
    schema: "rsrender.source-extension-manifest-entry-identity.v1",
    entityKind: kind,
    fieldPath: path,
  });
}

export function deriveSourceExtensionManifestEntryIdentity(
  input: unknown,
): SourceIdentityDerivationResult<SourceExtensionManifestEntryIdentity> {
  try {
    const record = readRecord(input);
    requireFields(record, ["entityKind", "fieldPath"]);
    return Object.freeze({
      accepted: true,
      value: deriveSourceExtensionManifestEntryIdentityValue(
        readEntityKind(record["entityKind"]),
        readFieldPath(record["fieldPath"]),
      ),
    });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

function parseManifestDraft(input: unknown): SourceExtensionManifestEntryDraft {
  const record = readRecord(input);
  requireFields(record, [
    "manifestVersion",
    "entityKind",
    "fieldPath",
    "expectedJsonKind",
    "declaration",
  ]);
  if (record["manifestVersion"] !== sourceExtensionManifestVersion) {
    if (typeof record["manifestVersion"] !== "number") {
      return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
    }
    return fail("SOURCE_SNAPSHOT_UNSUPPORTED_VERSION");
  }
  const fieldPath = readFieldPath(record["fieldPath"]);
  if (!fieldPath.startsWith("extension:/")) return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  return Object.freeze({
    manifestVersion: sourceExtensionManifestVersion,
    entityKind: readEntityKind(record["entityKind"]),
    fieldPath,
    expectedJsonKind: readExtensionJsonKind(record["expectedJsonKind"]),
    declaration: readExtensionDeclaration(record["declaration"]),
  });
}

function makeManifestEntry(draft: SourceExtensionManifestEntryDraft): SourceExtensionManifestEntry {
  const normalized = Object.freeze({ ...draft });
  return Object.freeze({
    ...normalized,
    manifestEntryIdentity: deriveSourceExtensionManifestEntryIdentityValue(
      draft.entityKind,
      draft.fieldPath,
    ),
    logicalDigest: sha256CanonicalJson(normalized),
  });
}

function parseManifestEntry(input: unknown): SourceExtensionManifestEntry {
  const record = readRecord(input);
  requireFields(record, [
    "manifestVersion",
    "entityKind",
    "fieldPath",
    "expectedJsonKind",
    "declaration",
    "manifestEntryIdentity",
    "logicalDigest",
  ]);
  const expected = makeManifestEntry(
    parseManifestDraft({
      manifestVersion: record["manifestVersion"],
      entityKind: record["entityKind"],
      fieldPath: record["fieldPath"],
      expectedJsonKind: record["expectedJsonKind"],
      declaration: record["declaration"],
    }),
  );
  if (
    readIdentity(record["manifestEntryIdentity"], sourceExtensionManifestEntryIdentityCodec) !==
    expected.manifestEntryIdentity
  ) {
    return fail("SOURCE_SNAPSHOT_IDENTITY_MISMATCH");
  }
  if (readDigest(record["logicalDigest"]) !== expected.logicalDigest) {
    return fail("SOURCE_SNAPSHOT_DIGEST_MISMATCH");
  }
  return expected;
}

export function createSourceExtensionManifestEntry(
  input: unknown,
): SourceExtensionManifestEntryDecodeResult {
  try {
    return Object.freeze({ accepted: true, value: makeManifestEntry(parseManifestDraft(input)) });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

export function decodeSourceExtensionManifestEntry(
  input: unknown,
): SourceExtensionManifestEntryDecodeResult {
  try {
    return Object.freeze({ accepted: true, value: parseManifestEntry(input) });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

export function encodeSourceExtensionManifestEntry(
  input: unknown,
): SourceSnapshotComponentEncodeResult<SourceExtensionManifestEntry> {
  const decoded = decodeSourceExtensionManifestEntry(input);
  if (!decoded.accepted) return decoded;
  const canonicalJson = canonicalizeJson(decoded.value);
  return Object.freeze({
    accepted: true,
    value: decoded.value,
    canonicalJson,
    digest: sha256CanonicalJson(decoded.value),
  });
}

function parseExtensionContent(input: unknown): SourceExtensionContent {
  const record = readRecord(input);
  if (!Object.hasOwn(record, "kind")) return fail("SOURCE_SNAPSHOT_MISSING_FIELD");
  const kind = readText(record["kind"]);
  if (kind === "absent" || kind === "present-null") {
    requireFields(record, ["kind"]);
    return Object.freeze({ kind });
  }
  if (kind === "present-value") {
    requireFields(record, ["kind", "value"]);
    const value = readBoundedCanonicalJson(record["value"]);
    if (value === null) return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
    return Object.freeze({ kind, value });
  }
  return fail("SOURCE_SNAPSHOT_UNKNOWN_TAG");
}

function parseExtensionObservationDraft(input: unknown): SourceExtensionObservationDraft {
  const record = readRecord(input);
  requireFields(record, [
    "observationVersion",
    "sourceContextIdentity",
    "sourceEntityIdentity",
    "manifestEntryIdentity",
    "fieldPath",
    "jsonKind",
    "content",
    "value",
  ]);
  if (record["observationVersion"] !== sourceExtensionObservationVersion) {
    if (typeof record["observationVersion"] !== "number") {
      return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
    }
    return fail("SOURCE_SNAPSHOT_UNSUPPORTED_VERSION");
  }
  const sourceContextIdentity = readIdentity(
    record["sourceContextIdentity"],
    defineOpaqueIdentityCodec("SourceContextIdentity"),
  );
  const sourceEntityIdentity = readIdentity(
    record["sourceEntityIdentity"],
    sourceEntityIdentityCodec,
  );
  const manifestEntryIdentity = readIdentity(
    record["manifestEntryIdentity"],
    sourceExtensionManifestEntryIdentityCodec,
  );
  const fieldPath = readFieldPath(record["fieldPath"]);
  if (!fieldPath.startsWith("extension:/")) return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  const jsonKind = readExtensionJsonKind(record["jsonKind"]);
  const content = parseExtensionContent(record["content"]);
  if (content.kind === "present-null" && jsonKind !== "null") {
    return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  }
  if (content.kind === "present-value" && jsonKindOf(content.value) !== jsonKind) {
    return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  }
  const sourceFieldIdentity = deriveSourceFieldIdentityValue(sourceEntityIdentity, fieldPath);
  const value = parseSourceValue(record["value"], {
    sourceContextIdentity,
    sourceEntityIdentity,
    sourceFieldIdentity,
  });
  if (!domainContentMatchesExtension(value, content)) {
    return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  }
  if (value.unit.state !== "not-applicable") {
    return fail("SOURCE_SNAPSHOT_INVALID_UNIT");
  }
  return Object.freeze({
    observationVersion: sourceExtensionObservationVersion,
    sourceContextIdentity,
    sourceEntityIdentity,
    manifestEntryIdentity,
    fieldPath,
    jsonKind,
    content,
    value,
  });
}

function makeExtensionObservation(
  draft: SourceExtensionObservationDraft,
): SourceExtensionObservation {
  const sourceFieldIdentity = deriveSourceFieldIdentityValue(
    draft.sourceEntityIdentity,
    draft.fieldPath,
  );
  const normalized = Object.freeze({ ...draft });
  return Object.freeze({
    ...normalized,
    sourceFieldIdentity,
    logicalDigest: sha256CanonicalJson(normalized),
  });
}

function parseExtensionObservation(input: unknown): SourceExtensionObservation {
  const record = readRecord(input);
  requireFields(record, [
    "observationVersion",
    "sourceContextIdentity",
    "sourceEntityIdentity",
    "manifestEntryIdentity",
    "fieldPath",
    "jsonKind",
    "content",
    "value",
    "sourceFieldIdentity",
    "logicalDigest",
  ]);
  const expected = makeExtensionObservation(
    parseExtensionObservationDraft({
      observationVersion: record["observationVersion"],
      sourceContextIdentity: record["sourceContextIdentity"],
      sourceEntityIdentity: record["sourceEntityIdentity"],
      manifestEntryIdentity: record["manifestEntryIdentity"],
      fieldPath: record["fieldPath"],
      jsonKind: record["jsonKind"],
      content: record["content"],
      value: record["value"],
    }),
  );
  if (
    readIdentity(record["sourceFieldIdentity"], sourceFieldIdentityCodec) !==
    expected.sourceFieldIdentity
  ) {
    return fail("SOURCE_SNAPSHOT_IDENTITY_MISMATCH");
  }
  if (readDigest(record["logicalDigest"]) !== expected.logicalDigest) {
    return fail("SOURCE_SNAPSHOT_DIGEST_MISMATCH");
  }
  return expected;
}

export function createSourceExtensionObservation(
  input: unknown,
): SourceExtensionObservationDecodeResult {
  try {
    return Object.freeze({
      accepted: true,
      value: makeExtensionObservation(parseExtensionObservationDraft(input)),
    });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

export function decodeSourceExtensionObservation(
  input: unknown,
): SourceExtensionObservationDecodeResult {
  try {
    return Object.freeze({ accepted: true, value: parseExtensionObservation(input) });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

export function encodeSourceExtensionObservation(
  input: unknown,
): SourceSnapshotComponentEncodeResult<SourceExtensionObservation> {
  const decoded = decodeSourceExtensionObservation(input);
  if (!decoded.accepted) return decoded;
  const canonicalJson = canonicalizeJson(decoded.value);
  return Object.freeze({
    accepted: true,
    value: decoded.value,
    canonicalJson,
    digest: sha256CanonicalJson(decoded.value),
  });
}

function parseSourceFieldArray(
  input: unknown,
  requireCanonical: boolean,
): readonly SourceFieldRecord[] {
  const supplied = readArray(input).map(parseSourceFieldRecord);
  const identities = new Set<SourceFieldIdentity>();
  for (const field of supplied) {
    if (identities.has(field.sourceFieldIdentity)) {
      return fail("SOURCE_SNAPSHOT_DUPLICATE_IDENTITY");
    }
    identities.add(field.sourceFieldIdentity);
    if (!field.fieldPath.startsWith("mapped:/")) {
      return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
    }
  }
  const sorted = [...supplied].sort(compareSourceFields);
  if (requireCanonical)
    ensureCanonicalOrder(supplied, sorted, (field) => field.sourceFieldIdentity);
  return Object.freeze(sorted);
}

function parseExtensionObservationArray(
  input: unknown,
  requireCanonical: boolean,
): readonly SourceExtensionObservation[] {
  const supplied = readArray(input).map(parseExtensionObservation);
  const identities = new Set<SourceFieldIdentity>();
  for (const observation of supplied) {
    if (identities.has(observation.sourceFieldIdentity)) {
      return fail("SOURCE_SNAPSHOT_DUPLICATE_IDENTITY");
    }
    identities.add(observation.sourceFieldIdentity);
  }
  const sorted = [...supplied].sort(compareExtensionObservations);
  if (requireCanonical) {
    ensureCanonicalOrder(supplied, sorted, (observation) => observation.sourceFieldIdentity);
  }
  return Object.freeze(sorted);
}

function fieldByPath(
  fields: readonly SourceFieldRecord[],
  fieldPath: string,
): SourceFieldRecord | undefined {
  return fields.find((field) => field.fieldPath === fieldPath);
}

function contentString(field: SourceFieldRecord): string | null {
  return field.value.content.kind === "value" && typeof field.value.content.value === "string"
    ? field.value.content.value
    : null;
}

function isNumericContent(field: SourceFieldRecord): boolean {
  return (
    field.value.content.kind === "zero" ||
    (field.value.content.kind === "value" && typeof field.value.content.value === "number")
  );
}

function validateGroundwaterSemantics(fields: readonly SourceFieldRecord[]): void {
  const kindField = fieldByPath(fields, SOURCE_MAPPED_FIELD_PATHS.groundwaterObservationKind);
  const statusField = fieldByPath(fields, SOURCE_MAPPED_FIELD_PATHS.groundwaterObservationStatus);
  const depthField = fieldByPath(fields, SOURCE_MAPPED_FIELD_PATHS.groundwaterDepth);
  const elevationField = fieldByPath(fields, SOURCE_MAPPED_FIELD_PATHS.groundwaterElevation);
  if (!kindField || !statusField || !depthField || !elevationField) {
    return fail("SOURCE_SNAPSHOT_INVALID_CARDINALITY");
  }
  const kind = contentString(kindField);
  const status = contentString(statusField);
  if (!kind || !(OPEN_HOLE_GROUNDWATER_KINDS as readonly string[]).includes(kind)) {
    return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  }
  if (!status || !(OPEN_HOLE_GROUNDWATER_STATUSES as readonly string[]).includes(status)) {
    return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  }
  if (
    kindField.value.unit.state !== "not-applicable" ||
    statusField.value.unit.state !== "not-applicable"
  ) {
    return fail("SOURCE_SNAPSHOT_INVALID_UNIT");
  }
  if (status === "measured") {
    if (!isNumericContent(depthField)) return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
    if (
      depthField.value.unit.state !== "specified" ||
      depthField.value.unit.quantity !== "length"
    ) {
      return fail("SOURCE_SNAPSHOT_INVALID_UNIT");
    }
    if (isNumericContent(elevationField)) {
      if (
        elevationField.value.unit.state !== "specified" ||
        elevationField.value.unit.quantity !== "length"
      ) {
        return fail("SOURCE_SNAPSHOT_INVALID_UNIT");
      }
    } else if (elevationField.value.content.kind !== "not-available") {
      return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
    }
    return;
  }
  if (status === "malformed") {
    if (depthField.value.content.kind !== "malformed") {
      return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
    }
    return;
  }
  if (
    depthField.value.content.kind !== "not-available" ||
    depthField.value.content.statusCode !== status
  ) {
    return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  }
  if (
    elevationField.value.content.kind !== "not-available" ||
    (elevationField.value.content.statusCode === "dry" && status !== "dry")
  ) {
    return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  }
}

function validateIntrinsicRecordFamily(
  entityKind: SourceEntityKind,
  providerNativeIdentity: string,
  parentEntityIdentity: SourceEntityIdentity | null,
  relatedEntityIdentity: SourceEntityIdentity | null,
  fields: readonly SourceFieldRecord[],
): void {
  const rules = SOURCE_RECORD_FAMILY_RULES[entityKind];
  if ((rules.parentKind === "none") !== (parentEntityIdentity === null)) {
    return fail("SOURCE_SNAPSHOT_INVALID_RELATIONSHIP");
  }
  if (rules.relatedKinds.length === 0 && relatedEntityIdentity !== null) {
    return fail("SOURCE_SNAPSHOT_INVALID_RELATIONSHIP");
  }
  const paths = new Set(fields.map((field) => field.fieldPath));
  if (rules.requiredFieldPaths.some((path) => !paths.has(path))) {
    return fail("SOURCE_SNAPSHOT_INVALID_CARDINALITY");
  }
  if (fields.some((field) => !rules.allowedFieldPaths.includes(field.fieldPath as never))) {
    return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  }
  if (entityKind === "source-project") {
    readIdentity(providerNativeIdentity, sourceProjectIdentityCodec);
  } else if (entityKind === "exploration") {
    readIdentity(providerNativeIdentity, sourceExplorationIdentityCodec);
  }
  if (entityKind === "open-hole-groundwater-observation") {
    validateGroundwaterSemantics(fields);
  }
}

function parseLookupReference(input: unknown): SourceLookupReference {
  const record = readRecord(input);
  requireFields(record, [
    "referenceVersion",
    "sourceContextIdentity",
    "lookupFamily",
    "providerNativeLookupIdentity",
    "lookupEntityIdentity",
  ]);
  if (record["referenceVersion"] !== sourceLookupReferenceVersion) {
    if (typeof record["referenceVersion"] !== "number") {
      return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
    }
    return fail("SOURCE_SNAPSHOT_UNSUPPORTED_VERSION");
  }
  const sourceContextIdentity = readIdentity(
    record["sourceContextIdentity"],
    defineOpaqueIdentityCodec("SourceContextIdentity"),
  );
  const providerNativeLookupIdentity = readText(record["providerNativeLookupIdentity"]);
  const lookupEntityIdentity = readIdentity(
    record["lookupEntityIdentity"],
    sourceEntityIdentityCodec,
  );
  if (
    lookupEntityIdentity !==
    deriveSourceEntityIdentityValue(sourceContextIdentity, "lookup", providerNativeLookupIdentity)
  ) {
    return fail("SOURCE_SNAPSHOT_IDENTITY_MISMATCH");
  }
  return Object.freeze({
    referenceVersion: sourceLookupReferenceVersion,
    sourceContextIdentity,
    lookupFamily: readText(record["lookupFamily"]),
    providerNativeLookupIdentity,
    lookupEntityIdentity,
  });
}

export function createSourceLookupReference(input: unknown): SourceLookupReferenceDecodeResult {
  try {
    return Object.freeze({ accepted: true, value: parseLookupReference(input) });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

export function decodeSourceLookupReference(input: unknown): SourceLookupReferenceDecodeResult {
  return createSourceLookupReference(input);
}

export function encodeSourceLookupReference(
  input: unknown,
): SourceSnapshotComponentEncodeResult<SourceLookupReference> {
  const decoded = decodeSourceLookupReference(input);
  if (!decoded.accepted) return decoded;
  const canonicalJson = canonicalizeJson(decoded.value);
  return Object.freeze({
    accepted: true,
    value: decoded.value,
    canonicalJson,
    digest: sha256CanonicalJson(decoded.value),
  });
}

function compareLookupReferences(
  left: SourceLookupReference,
  right: SourceLookupReference,
): number {
  const family = compareCodeUnits(left.lookupFamily, right.lookupFamily);
  return family !== 0
    ? family
    : compareCodeUnits(left.lookupEntityIdentity, right.lookupEntityIdentity);
}

function parseLookupReferenceArray(
  input: unknown,
  requireCanonical: boolean,
): readonly SourceLookupReference[] {
  const supplied = readArray(input).map(parseLookupReference);
  const keys = supplied.map(
    (reference) => `${reference.lookupFamily}\u0000${reference.lookupEntityIdentity}`,
  );
  if (new Set(keys).size !== keys.length) return fail("SOURCE_SNAPSHOT_DUPLICATE_IDENTITY");
  const sorted = [...supplied].sort(compareLookupReferences);
  if (requireCanonical) {
    ensureCanonicalOrder(
      supplied,
      sorted,
      (reference) => `${reference.lookupFamily}\u0000${reference.lookupEntityIdentity}`,
    );
  }
  return Object.freeze(sorted);
}

function fieldTestColumnPath(columnIdentity: string): string {
  const digest = sha256CanonicalJson({
    schema: "rsrender.field-test-column-field-path.v1",
    columnIdentity,
  }).slice("sha256:".length);
  return `mapped:/columns/${digest}/value`;
}

export function deriveSourceFieldTestColumnFieldPath(
  input: unknown,
): SourceIdentityDerivationResult<string> {
  try {
    const record = readRecord(input);
    requireFields(record, ["columnIdentity"]);
    return Object.freeze({
      accepted: true,
      value: fieldTestColumnPath(readText(record["columnIdentity"])),
    });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

function parseFieldTestColumnDraft(input: unknown): SourceFieldTestColumnDraft {
  const record = readRecord(input);
  requireFields(record, [
    "columnVersion",
    "sourceContextIdentity",
    "fieldTestEntityIdentity",
    "columnIdentity",
    "columnName",
    "unitSymbol",
    "sourceOrder",
    "rawStructuredRepresentation",
    "rawDigest",
    "parserState",
    "value",
  ]);
  if (record["columnVersion"] !== sourceFieldTestColumnVersion) {
    if (typeof record["columnVersion"] !== "number") {
      return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
    }
    return fail("SOURCE_SNAPSHOT_UNSUPPORTED_VERSION");
  }
  const sourceContextIdentity = readIdentity(
    record["sourceContextIdentity"],
    defineOpaqueIdentityCodec("SourceContextIdentity"),
  );
  const fieldTestEntityIdentity = readIdentity(
    record["fieldTestEntityIdentity"],
    sourceEntityIdentityCodec,
  );
  const columnIdentity = readText(record["columnIdentity"]);
  const columnName = readText(record["columnName"]);
  const unitSymbol = readText(record["unitSymbol"]);
  const rawStructuredRepresentation = readText(record["rawStructuredRepresentation"]);
  const rawDigest = readDigest(record["rawDigest"]);
  if (rawDigest !== sha256Utf8(rawStructuredRepresentation)) {
    return fail("SOURCE_SNAPSHOT_DIGEST_MISMATCH");
  }
  const parserState = readText(record["parserState"]);
  if (!(FIELD_TEST_PARSER_STATES as readonly string[]).includes(parserState)) {
    return fail("SOURCE_SNAPSHOT_UNKNOWN_TAG");
  }
  const value = parseSourceFieldRecord(record["value"]);
  if (
    value.sourceContextIdentity !== sourceContextIdentity ||
    value.sourceEntityIdentity !== fieldTestEntityIdentity ||
    value.fieldPath !== fieldTestColumnPath(columnIdentity)
  ) {
    return fail("SOURCE_SNAPSHOT_IDENTITY_MISMATCH");
  }
  if (
    isNumericContent(value) &&
    (value.value.unit.state !== "specified" || value.value.unit.symbol !== unitSymbol)
  ) {
    return fail("SOURCE_SNAPSHOT_INVALID_UNIT");
  }
  if (
    (parserState === "unrecognized" || parserState === "source-evidence-blocked") &&
    value.value.eligibility.state === "eligible"
  ) {
    return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  }
  if (
    parserState === "malformed" &&
    (value.value.content.kind !== "malformed" || value.value.eligibility.state === "eligible")
  ) {
    return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
  }
  return Object.freeze({
    columnVersion: sourceFieldTestColumnVersion,
    sourceContextIdentity,
    fieldTestEntityIdentity,
    columnIdentity,
    columnName,
    unitSymbol,
    sourceOrder: readNullableOrder(record["sourceOrder"]),
    rawStructuredRepresentation,
    rawDigest,
    parserState: parserState as FieldTestParserState,
    value,
  });
}

function makeFieldTestColumn(draft: SourceFieldTestColumnDraft): SourceFieldTestColumn {
  const normalized = Object.freeze({ ...draft });
  return Object.freeze({ ...normalized, logicalDigest: sha256CanonicalJson(normalized) });
}

function parseFieldTestColumn(input: unknown): SourceFieldTestColumn {
  const record = readRecord(input);
  requireFields(record, [
    "columnVersion",
    "sourceContextIdentity",
    "fieldTestEntityIdentity",
    "columnIdentity",
    "columnName",
    "unitSymbol",
    "sourceOrder",
    "rawStructuredRepresentation",
    "rawDigest",
    "parserState",
    "value",
    "logicalDigest",
  ]);
  const expected = makeFieldTestColumn(
    parseFieldTestColumnDraft({
      columnVersion: record["columnVersion"],
      sourceContextIdentity: record["sourceContextIdentity"],
      fieldTestEntityIdentity: record["fieldTestEntityIdentity"],
      columnIdentity: record["columnIdentity"],
      columnName: record["columnName"],
      unitSymbol: record["unitSymbol"],
      sourceOrder: record["sourceOrder"],
      rawStructuredRepresentation: record["rawStructuredRepresentation"],
      rawDigest: record["rawDigest"],
      parserState: record["parserState"],
      value: record["value"],
    }),
  );
  if (readDigest(record["logicalDigest"]) !== expected.logicalDigest) {
    return fail("SOURCE_SNAPSHOT_DIGEST_MISMATCH");
  }
  return expected;
}

function compareFieldTestColumns(
  left: SourceFieldTestColumn,
  right: SourceFieldTestColumn,
): number {
  const leftOrder = left.sourceOrder ?? Number.POSITIVE_INFINITY;
  const rightOrder = right.sourceOrder ?? Number.POSITIVE_INFINITY;
  return leftOrder !== rightOrder
    ? leftOrder < rightOrder
      ? -1
      : 1
    : compareCodeUnits(left.columnIdentity, right.columnIdentity);
}

function parseFieldTestColumnArray(
  input: unknown,
  requireCanonical: boolean,
): readonly SourceFieldTestColumn[] {
  const supplied = readArray(input).map(parseFieldTestColumn);
  if (new Set(supplied.map((column) => column.columnIdentity)).size !== supplied.length) {
    return fail("SOURCE_SNAPSHOT_DUPLICATE_IDENTITY");
  }
  const sorted = [...supplied].sort(compareFieldTestColumns);
  if (requireCanonical) {
    ensureCanonicalOrder(supplied, sorted, (column) => column.columnIdentity);
  }
  return Object.freeze(sorted);
}

export function createSourceFieldTestColumn(input: unknown): SourceFieldTestColumnDecodeResult {
  try {
    return Object.freeze({
      accepted: true,
      value: makeFieldTestColumn(parseFieldTestColumnDraft(input)),
    });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

export function decodeSourceFieldTestColumn(input: unknown): SourceFieldTestColumnDecodeResult {
  try {
    return Object.freeze({ accepted: true, value: parseFieldTestColumn(input) });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

export function encodeSourceFieldTestColumn(
  input: unknown,
): SourceSnapshotComponentEncodeResult<SourceFieldTestColumn> {
  const decoded = decodeSourceFieldTestColumn(input);
  if (!decoded.accepted) return decoded;
  const canonicalJson = canonicalizeJson(decoded.value);
  return Object.freeze({
    accepted: true,
    value: decoded.value,
    canonicalJson,
    digest: sha256CanonicalJson(decoded.value),
  });
}

function parseSourceRecordDraft(input: unknown, requireCanonical: boolean): SourceRecordDraft {
  const record = readRecord(input);
  requireFields(record, [
    "recordVersion",
    "entityKind",
    "sourceContextIdentity",
    "providerNativeIdentity",
    "parentEntityIdentity",
    "relatedEntityIdentity",
    "sourceOrder",
    "fields",
    "lookupReferences",
    "fieldTestColumns",
    "extensionObservations",
  ]);
  if (record["recordVersion"] !== sourceRecordVersion) {
    if (typeof record["recordVersion"] !== "number") return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
    return fail("SOURCE_SNAPSHOT_UNSUPPORTED_VERSION");
  }
  const sourceContextIdentity = readIdentity(
    record["sourceContextIdentity"],
    defineOpaqueIdentityCodec("SourceContextIdentity"),
  );
  const entityKind = readEntityKind(record["entityKind"]);
  const providerNativeIdentity = readText(record["providerNativeIdentity"]);
  const sourceEntityIdentity = deriveSourceEntityIdentityValue(
    sourceContextIdentity,
    entityKind,
    providerNativeIdentity,
  );
  const fields = parseSourceFieldArray(record["fields"], requireCanonical);
  const extensionObservations = parseExtensionObservationArray(
    record["extensionObservations"],
    requireCanonical,
  );
  const lookupReferences = parseLookupReferenceArray(record["lookupReferences"], requireCanonical);
  const fieldTestColumns = parseFieldTestColumnArray(record["fieldTestColumns"], requireCanonical);
  for (const value of [...fields, ...extensionObservations]) {
    if (
      value.sourceContextIdentity !== sourceContextIdentity ||
      value.sourceEntityIdentity !== sourceEntityIdentity
    ) {
      return fail("SOURCE_SNAPSHOT_CROSS_CONTEXT");
    }
  }
  const allFieldIdentities = [...fields, ...extensionObservations].map(
    (value) => value.sourceFieldIdentity,
  );
  if (new Set(allFieldIdentities).size !== allFieldIdentities.length) {
    return fail("SOURCE_SNAPSHOT_DUPLICATE_IDENTITY");
  }
  const parentEntityIdentity = readNullableIdentity(
    record["parentEntityIdentity"],
    sourceEntityIdentityCodec,
  );
  const relatedEntityIdentity = readNullableIdentity(
    record["relatedEntityIdentity"],
    sourceEntityIdentityCodec,
  );
  validateIntrinsicRecordFamily(
    entityKind,
    providerNativeIdentity,
    parentEntityIdentity,
    relatedEntityIdentity,
    fields,
  );
  if ((entityKind === "field-test") !== fieldTestColumns.length > 0) {
    return fail("SOURCE_SNAPSHOT_INVALID_CARDINALITY");
  }
  for (const column of fieldTestColumns) {
    if (
      column.sourceContextIdentity !== sourceContextIdentity ||
      column.fieldTestEntityIdentity !== sourceEntityIdentity
    ) {
      return fail("SOURCE_SNAPSHOT_CROSS_CONTEXT");
    }
  }
  if (
    lookupReferences.some((reference) => reference.sourceContextIdentity !== sourceContextIdentity)
  ) {
    return fail("SOURCE_SNAPSHOT_CROSS_CONTEXT");
  }
  return Object.freeze({
    recordVersion: sourceRecordVersion,
    entityKind,
    sourceContextIdentity,
    providerNativeIdentity,
    parentEntityIdentity,
    relatedEntityIdentity,
    sourceOrder: readNullableOrder(record["sourceOrder"]),
    fields,
    lookupReferences,
    fieldTestColumns,
    extensionObservations,
  });
}

function makeSourceRecord(draft: SourceRecordDraft): SourceRecord {
  const sourceEntityIdentity = deriveSourceEntityIdentityValue(
    draft.sourceContextIdentity,
    draft.entityKind,
    draft.providerNativeIdentity,
  );
  const normalized = Object.freeze({ ...draft });
  return Object.freeze({
    ...normalized,
    sourceEntityIdentity,
    logicalDigest: sha256CanonicalJson(normalized),
  });
}

function parseSourceRecord(input: unknown): SourceRecord {
  const record = readRecord(input);
  requireFields(record, [
    "recordVersion",
    "entityKind",
    "sourceContextIdentity",
    "providerNativeIdentity",
    "parentEntityIdentity",
    "relatedEntityIdentity",
    "sourceOrder",
    "fields",
    "lookupReferences",
    "fieldTestColumns",
    "extensionObservations",
    "sourceEntityIdentity",
    "logicalDigest",
  ]);
  const expected = makeSourceRecord(
    parseSourceRecordDraft(
      {
        recordVersion: record["recordVersion"],
        entityKind: record["entityKind"],
        sourceContextIdentity: record["sourceContextIdentity"],
        providerNativeIdentity: record["providerNativeIdentity"],
        parentEntityIdentity: record["parentEntityIdentity"],
        relatedEntityIdentity: record["relatedEntityIdentity"],
        sourceOrder: record["sourceOrder"],
        fields: record["fields"],
        lookupReferences: record["lookupReferences"],
        fieldTestColumns: record["fieldTestColumns"],
        extensionObservations: record["extensionObservations"],
      },
      true,
    ),
  );
  if (
    readIdentity(record["sourceEntityIdentity"], sourceEntityIdentityCodec) !==
    expected.sourceEntityIdentity
  ) {
    return fail("SOURCE_SNAPSHOT_IDENTITY_MISMATCH");
  }
  if (readDigest(record["logicalDigest"]) !== expected.logicalDigest) {
    return fail("SOURCE_SNAPSHOT_DIGEST_MISMATCH");
  }
  return expected;
}

export function createSourceRecord(input: unknown): SourceRecordDecodeResult {
  try {
    const value = makeSourceRecord(parseSourceRecordDraft(input, false));
    return Object.freeze({
      accepted: true,
      value: value as SourceRecordFamily,
    });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

export function decodeSourceRecord(input: unknown): SourceRecordDecodeResult {
  try {
    return Object.freeze({
      accepted: true,
      value: parseSourceRecord(input) as SourceRecordFamily,
    });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

export function encodeSourceRecord(input: unknown): SourceRecordEncodeResult {
  const decoded = decodeSourceRecord(input);
  if (!decoded.accepted) return decoded;
  const canonicalJson = canonicalizeJson(decoded.value);
  return Object.freeze({
    accepted: true,
    value: decoded.value,
    canonicalJson,
    digest: sha256CanonicalJson(decoded.value),
  });
}

function recordDepth(record: SourceRecord, fieldPath: string): number | null {
  const field = fieldByPath(record.fields, fieldPath);
  if (!field) return null;
  if (field.value.content.kind === "zero") return 0;
  return field.value.content.kind === "value" && typeof field.value.content.value === "number"
    ? field.value.content.value
    : null;
}

function recordComparableDepth(
  record: SourceRecord,
  fieldPath: string,
): { readonly value: number; readonly unitSymbol: string } | null {
  const field = fieldByPath(record.fields, fieldPath);
  const value = recordDepth(record, fieldPath);
  if (
    !field ||
    value === null ||
    field.value.unit.state !== "specified" ||
    field.value.unit.quantity !== "length"
  ) {
    return null;
  }
  return Object.freeze({ value, unitSymbol: field.value.unit.symbol });
}

function compareSourceRecords(left: SourceRecord, right: SourceRecord): number {
  const leftStart =
    recordComparableDepth(left, SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth) ??
    recordComparableDepth(left, SOURCE_MAPPED_FIELD_PATHS.groundwaterDepth);
  const rightStart =
    recordComparableDepth(right, SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth) ??
    recordComparableDepth(right, SOURCE_MAPPED_FIELD_PATHS.groundwaterDepth);
  if (
    leftStart &&
    rightStart &&
    leftStart.unitSymbol === rightStart.unitSymbol &&
    leftStart.value !== rightStart.value
  ) {
    return leftStart.value < rightStart.value ? -1 : 1;
  }
  const leftEnd = recordComparableDepth(left, SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth);
  const rightEnd = recordComparableDepth(right, SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth);
  if (
    leftEnd &&
    rightEnd &&
    leftEnd.unitSymbol === rightEnd.unitSymbol &&
    leftEnd.value !== rightEnd.value
  ) {
    return leftEnd.value < rightEnd.value ? -1 : 1;
  }
  const leftOrder = left.sourceOrder ?? Number.POSITIVE_INFINITY;
  const rightOrder = right.sourceOrder ?? Number.POSITIVE_INFINITY;
  if (leftOrder !== rightOrder) return leftOrder < rightOrder ? -1 : 1;
  return compareCodeUnits(left.sourceEntityIdentity, right.sourceEntityIdentity);
}

type SourceRecordForKind<Kind extends SourceEntityKind> = Extract<
  SourceRecordFamily,
  { readonly entityKind: Kind }
>;

function parseRecordForKind<Kind extends SourceEntityKind>(
  input: unknown,
  entityKind: Kind,
): SourceRecordForKind<Kind> {
  const record = parseSourceRecord(input);
  if (record.entityKind !== entityKind) return fail("SOURCE_SNAPSHOT_WRONG_KIND");
  return record as SourceRecordForKind<Kind>;
}

function parseRecordFamilyArray<Kind extends SourceEntityKind>(
  input: unknown,
  entityKind: Kind,
  requireCanonical: boolean,
): readonly SourceRecordForKind<Kind>[] {
  const supplied = readArray(input).map((value) => parseRecordForKind(value, entityKind));
  if (new Set(supplied.map((record) => record.sourceEntityIdentity)).size !== supplied.length) {
    return fail("SOURCE_SNAPSHOT_DUPLICATE_IDENTITY");
  }
  const sorted = [...supplied].sort(compareSourceRecords);
  if (requireCanonical) {
    ensureCanonicalOrder(supplied, sorted, (record) => record.sourceEntityIdentity);
  }
  return Object.freeze(sorted);
}

function compareManifestEntries(
  left: SourceExtensionManifestEntry,
  right: SourceExtensionManifestEntry,
): number {
  const kind = compareCodeUnits(left.entityKind, right.entityKind);
  return kind !== 0 ? kind : compareCodeUnits(left.fieldPath, right.fieldPath);
}

function parseManifestArray(
  input: unknown,
  requireCanonical: boolean,
): readonly SourceExtensionManifestEntry[] {
  const supplied = readArray(input).map(parseManifestEntry);
  if (new Set(supplied.map((entry) => entry.manifestEntryIdentity)).size !== supplied.length) {
    return fail("SOURCE_SNAPSHOT_DUPLICATE_IDENTITY");
  }
  const sorted = [...supplied].sort(compareManifestEntries);
  if (requireCanonical) {
    ensureCanonicalOrder(supplied, sorted, (entry) => entry.manifestEntryIdentity);
  }
  return Object.freeze(sorted);
}

function parseDiagnosticArray(
  input: unknown,
  requireCanonical: boolean,
): readonly DiagnosticFact[] {
  const supplied = readArray(input);
  const decoded = decodeDiagnosticFactSet(supplied);
  if (!decoded.accepted) return fail("SOURCE_SNAPSHOT_DIAGNOSTIC_MISMATCH");
  if (requireCanonical) {
    ensureCanonicalOrder(
      supplied as readonly DiagnosticFact[],
      decoded.value,
      (diagnostic) => diagnostic.diagnosticIdentity,
    );
  }
  return decoded.value;
}

function readUtcInstant(input: unknown): string {
  const value = readText(input);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
  }
  try {
    if (new Date(value).toISOString() !== value) return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
  } catch {
    return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
  }
  return value;
}

function blockedCapabilityInventory(): readonly SourceEvidenceBlockedCapability[] {
  return Object.freeze(
    SOURCE_EVIDENCE_BLOCKED_CAPABILITY_IDS.map((capabilityId) =>
      Object.freeze({
        capabilityId,
        disposition: "source-evidence-blocked" as const,
        positiveRecordCount: 0 as const,
        authorityIssue: "#43" as const,
      }),
    ),
  );
}

function allSnapshotRecords(draft: SourceSnapshotDraft): readonly SourceRecord[] {
  return Object.freeze([
    draft.sourceProject,
    ...draft.explorations,
    ...draft.strata,
    ...draft.samples,
    ...draft.fieldTests,
    ...draft.comments,
    ...draft.openHoleGroundwaterObservations,
    ...draft.lookups,
  ]);
}

function validateSnapshotRelationships(draft: SourceSnapshotDraft): void {
  const records = allSnapshotRecords(draft);
  if (new Set(records.map((record) => record.sourceEntityIdentity)).size !== records.length) {
    return fail("SOURCE_SNAPSHOT_DUPLICATE_IDENTITY");
  }
  if (records.some((record) => record.sourceContextIdentity !== draft.sourceContextIdentity)) {
    return fail("SOURCE_SNAPSHOT_CROSS_CONTEXT");
  }
  for (const record of records) {
    const values = [
      ...record.fields.map((field) => field.value),
      ...record.extensionObservations.map((observation) => observation.value),
      ...record.fieldTestColumns.map((column) => column.value.value),
    ];
    if (
      values.some(
        (value) =>
          value.provenance.provenanceClass !== "source" ||
          value.provenance.adapterId !== draft.adapterId ||
          value.provenance.adapterContractVersion !== draft.adapterContractVersion,
      )
    ) {
      return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
    }
  }
  if (
    draft.sourceProject.entityKind !== "source-project" ||
    draft.sourceProject.providerNativeIdentity !== draft.sourceProjectIdentity ||
    draft.sourceProject.parentEntityIdentity !== null ||
    draft.sourceProject.relatedEntityIdentity !== null
  ) {
    return fail("SOURCE_SNAPSHOT_WRONG_KIND");
  }
  const projectEntityIdentity = draft.sourceProject.sourceEntityIdentity;
  const explorationByIdentity = new Map(
    draft.explorations.map((record) => [record.sourceEntityIdentity, record]),
  );
  for (const exploration of draft.explorations) {
    if (
      exploration.parentEntityIdentity !== projectEntityIdentity ||
      exploration.relatedEntityIdentity !== null
    ) {
      return fail("SOURCE_SNAPSHOT_MISSING_PARENT");
    }
    readIdentity(exploration.providerNativeIdentity, sourceExplorationIdentityCodec);
  }
  const childFamilies = [
    draft.strata,
    draft.samples,
    draft.fieldTests,
    draft.comments,
    draft.openHoleGroundwaterObservations,
  ] as const;
  for (const family of childFamilies) {
    for (const record of family) {
      if (
        record.parentEntityIdentity === null ||
        !explorationByIdentity.has(record.parentEntityIdentity)
      ) {
        return fail("SOURCE_SNAPSHOT_MISSING_PARENT");
      }
    }
  }
  const byIdentity = new Map(records.map((record) => [record.sourceEntityIdentity, record]));
  for (const record of [...draft.fieldTests, ...draft.comments]) {
    if (record.relatedEntityIdentity === null) continue;
    const related = byIdentity.get(record.relatedEntityIdentity);
    if (!related) return fail("SOURCE_SNAPSHOT_MISSING_PARENT");
    const allowed = SOURCE_RECORD_FAMILY_RULES[record.entityKind].relatedKinds;
    if (!allowed.includes(related.entityKind)) return fail("SOURCE_SNAPSHOT_WRONG_KIND");
    if (related.parentEntityIdentity !== record.parentEntityIdentity) {
      return fail("SOURCE_SNAPSHOT_INVALID_RELATIONSHIP");
    }
  }
  for (const lookup of draft.lookups) {
    if (
      lookup.parentEntityIdentity !== projectEntityIdentity ||
      lookup.relatedEntityIdentity !== null
    ) {
      return fail("SOURCE_SNAPSHOT_MISSING_PARENT");
    }
  }
  for (const record of records) {
    for (const reference of record.lookupReferences) {
      const target = byIdentity.get(reference.lookupEntityIdentity);
      if (!target) continue;
      if (target.entityKind !== "lookup") return fail("SOURCE_SNAPSHOT_WRONG_KIND");
      const familyField = fieldByPath(target.fields, SOURCE_MAPPED_FIELD_PATHS.lookupFamily);
      if (!familyField || contentString(familyField) !== reference.lookupFamily) {
        return fail("SOURCE_SNAPSHOT_INVALID_RELATIONSHIP");
      }
    }
  }
}

function validateSnapshotExtensions(draft: SourceSnapshotDraft): void {
  const manifestByIdentity = new Map(
    draft.extensionManifest.map((entry) => [entry.manifestEntryIdentity, entry]),
  );
  const records = allSnapshotRecords(draft);
  for (const record of records) {
    const observed = new Set<string>();
    for (const observation of record.extensionObservations) {
      const entry = manifestByIdentity.get(observation.manifestEntryIdentity);
      if (!entry) return fail("SOURCE_SNAPSHOT_INVALID_RELATIONSHIP");
      if (entry.entityKind !== record.entityKind || entry.fieldPath !== observation.fieldPath) {
        return fail("SOURCE_SNAPSHOT_WRONG_KIND");
      }
      if (observation.content.kind === "absent" && entry.declaration === "runtime-present") {
        return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
      }
      if (
        observation.content.kind === "present-value" &&
        observation.jsonKind !== entry.expectedJsonKind
      ) {
        return fail("SOURCE_SNAPSHOT_INVALID_VALUE");
      }
      observed.add(entry.manifestEntryIdentity);
    }
    for (const entry of draft.extensionManifest) {
      if (
        entry.entityKind === record.entityKind &&
        entry.declaration !== "runtime-present" &&
        !observed.has(entry.manifestEntryIdentity)
      ) {
        return fail("SOURCE_SNAPSHOT_INVALID_CARDINALITY");
      }
    }
  }
  for (const entry of draft.extensionManifest) {
    if (
      entry.declaration === "runtime-present" &&
      !records.some((record) =>
        record.extensionObservations.some(
          (observation) => observation.manifestEntryIdentity === entry.manifestEntryIdentity,
        ),
      )
    ) {
      return fail("SOURCE_SNAPSHOT_INVALID_CARDINALITY");
    }
  }
}

function numericFieldState(
  record: SourceRecord,
  fieldPath: string,
): {
  readonly field: SourceFieldRecord;
  readonly value: number | null;
  readonly validLengthUnit: boolean;
  readonly unitSymbol: string | null;
} | null {
  const field = fieldByPath(record.fields, fieldPath);
  if (!field) return null;
  const value =
    field.value.content.kind === "zero"
      ? 0
      : field.value.content.kind === "value" && typeof field.value.content.value === "number"
        ? field.value.content.value
        : null;
  const validLengthUnit =
    field.value.unit.state === "specified" && field.value.unit.quantity === "length";
  return Object.freeze({
    field,
    value,
    validLengthUnit,
    unitSymbol: field.value.unit.state === "specified" ? field.value.unit.symbol : null,
  });
}

function makeSourceDiagnostic(
  candidateIdentity: SourceCandidateIdentity,
  record: SourceRecord,
  code: string,
  causeKey: string,
  fieldPath?: string,
): DiagnosticFact {
  const created = createDiagnosticFact({
    factVersion: 1,
    code,
    category: "source",
    affected: fieldPath
      ? {
          identityKind: "source.entity",
          identity: record.sourceEntityIdentity,
          path: fieldPath,
        }
      : { identityKind: "source.entity", identity: record.sourceEntityIdentity },
    cause: { causeKey, evidenceClass: "source.snapshot.validation" },
    consequence: "candidate-ineligible",
    input: { revision: candidateIdentity, digest: record.logicalDigest },
    remediationActionIds: ["inspect.source", "refresh.source"],
  });
  if (!created.accepted) return fail("SOURCE_SNAPSHOT_DIAGNOSTIC_MISMATCH");
  return created.value;
}

function deriveIntervalDiagnostics(draft: SourceSnapshotDraft): readonly DiagnosticFact[] {
  const diagnostics: DiagnosticFact[] = [];
  const explorationTotalDepth = new Map<
    SourceEntityIdentity,
    ReturnType<typeof numericFieldState>
  >();
  for (const exploration of draft.explorations) {
    explorationTotalDepth.set(
      exploration.sourceEntityIdentity,
      numericFieldState(exploration, SOURCE_MAPPED_FIELD_PATHS.explorationTotalDepth),
    );
  }
  for (const record of [...draft.strata, ...draft.samples]) {
    const start = numericFieldState(record, SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth);
    const end = numericFieldState(record, SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth);
    if (!start || start.value === null) {
      diagnostics.push(
        makeSourceDiagnostic(
          draft.candidateIdentity,
          record,
          "SOURCE_INTERVAL_START_INVALID",
          "source.interval.start_invalid",
          SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
        ),
      );
      continue;
    }
    if (!start.validLengthUnit) {
      diagnostics.push(
        makeSourceDiagnostic(
          draft.candidateIdentity,
          record,
          "SOURCE_INTERVAL_UNIT_INVALID",
          "source.interval.unit_invalid",
          SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
        ),
      );
    }
    if (start.value < 0) {
      diagnostics.push(
        makeSourceDiagnostic(
          draft.candidateIdentity,
          record,
          "SOURCE_INTERVAL_NEGATIVE",
          "source.interval.negative",
          SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth,
        ),
      );
    }
    const sampleEndMayBeAbsent =
      record.entityKind === "sample" &&
      end !== null &&
      ["absent", "null"].includes(end.field.value.content.kind);
    if (!end || (end.value === null && !sampleEndMayBeAbsent)) {
      diagnostics.push(
        makeSourceDiagnostic(
          draft.candidateIdentity,
          record,
          "SOURCE_INTERVAL_END_INVALID",
          "source.interval.end_invalid",
          SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
        ),
      );
      continue;
    }
    if (end.value === null) continue;
    if (!end.validLengthUnit || start.unitSymbol !== end.unitSymbol) {
      diagnostics.push(
        makeSourceDiagnostic(
          draft.candidateIdentity,
          record,
          "SOURCE_INTERVAL_UNIT_INVALID",
          "source.interval.unit_invalid",
          SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
        ),
      );
    }
    if (end.value < 0) {
      diagnostics.push(
        makeSourceDiagnostic(
          draft.candidateIdentity,
          record,
          "SOURCE_INTERVAL_NEGATIVE",
          "source.interval.negative",
          SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth,
        ),
      );
    }
    const comparable =
      start.validLengthUnit && end.validLengthUnit && start.unitSymbol === end.unitSymbol;
    if (comparable && end.value < start.value) {
      diagnostics.push(
        makeSourceDiagnostic(
          draft.candidateIdentity,
          record,
          "SOURCE_INTERVAL_REVERSED",
          "source.interval.reversed",
        ),
      );
    } else if (comparable && record.entityKind === "stratum" && end.value === start.value) {
      diagnostics.push(
        makeSourceDiagnostic(
          draft.candidateIdentity,
          record,
          "SOURCE_INTERVAL_ZERO_LENGTH",
          "source.interval.zero_length",
        ),
      );
    }
    const total =
      record.parentEntityIdentity === null
        ? null
        : (explorationTotalDepth.get(record.parentEntityIdentity) ?? null);
    if (
      total &&
      total.value !== null &&
      total.validLengthUnit &&
      comparable &&
      total.unitSymbol === start.unitSymbol &&
      (start.value > total.value || end.value > total.value)
    ) {
      diagnostics.push(
        makeSourceDiagnostic(
          draft.candidateIdentity,
          record,
          "SOURCE_INTERVAL_OUT_OF_EXPLORATION",
          "source.interval.out_of_exploration",
        ),
      );
    }
  }
  for (const exploration of draft.explorations) {
    const strataByUnit = new Map<
      string,
      {
        readonly record: SourceStratumRecord;
        readonly start: NonNullable<ReturnType<typeof numericFieldState>>;
        readonly end: NonNullable<ReturnType<typeof numericFieldState>>;
      }[]
    >();
    const comparableStrata = draft.strata
      .filter((record) => record.parentEntityIdentity === exploration.sourceEntityIdentity)
      .map((record) => ({
        record,
        start: numericFieldState(record, SOURCE_MAPPED_FIELD_PATHS.intervalStartDepth),
        end: numericFieldState(record, SOURCE_MAPPED_FIELD_PATHS.intervalEndDepth),
      }))
      .filter(
        (item) =>
          item.start?.value !== null &&
          item.end?.value !== null &&
          item.start?.validLengthUnit === true &&
          item.end?.validLengthUnit === true &&
          item.start.unitSymbol === item.end.unitSymbol,
      ) as {
      readonly record: SourceStratumRecord;
      readonly start: NonNullable<ReturnType<typeof numericFieldState>>;
      readonly end: NonNullable<ReturnType<typeof numericFieldState>>;
    }[];
    for (const item of comparableStrata) {
      const unitSymbol = item.start.unitSymbol;
      if (unitSymbol === null) continue;
      const group = strataByUnit.get(unitSymbol) ?? [];
      group.push(item);
      strataByUnit.set(unitSymbol, group);
    }
    for (const unitSymbol of [...strataByUnit.keys()].sort(compareCodeUnits)) {
      const strata = strataByUnit.get(unitSymbol);
      if (!strata) continue;
      strata.sort((left, right) => {
        const leftStart = left.start.value;
        const rightStart = right.start.value;
        if (leftStart === null || rightStart === null) {
          return compareCodeUnits(
            left.record.sourceEntityIdentity,
            right.record.sourceEntityIdentity,
          );
        }
        return leftStart === rightStart
          ? compareCodeUnits(left.record.sourceEntityIdentity, right.record.sourceEntityIdentity)
          : leftStart < rightStart
            ? -1
            : 1;
      });
      for (let index = 1; index < strata.length; index += 1) {
        const previous = strata[index - 1];
        const current = strata[index];
        if (!previous || !current || previous.end.value === null || current.start.value === null) {
          continue;
        }
        if (current.start.value < previous.end.value) {
          diagnostics.push(
            makeSourceDiagnostic(
              draft.candidateIdentity,
              current.record,
              "SOURCE_STRATA_OVERLAP",
              "source.strata.overlap",
            ),
          );
        } else if (current.start.value > previous.end.value) {
          diagnostics.push(
            makeSourceDiagnostic(
              draft.candidateIdentity,
              current.record,
              "SOURCE_STRATA_GAP",
              "source.strata.gap",
            ),
          );
        }
      }
    }
  }
  return Object.freeze(diagnostics);
}

function deriveRelationshipDiagnostics(draft: SourceSnapshotDraft): readonly DiagnosticFact[] {
  const diagnostics: DiagnosticFact[] = [];
  const lookupIdentities = new Set(draft.lookups.map((lookup) => lookup.sourceEntityIdentity));
  for (const record of allSnapshotRecords(draft)) {
    for (const reference of record.lookupReferences) {
      if (lookupIdentities.has(reference.lookupEntityIdentity)) continue;
      const suffix = sha256CanonicalJson({
        lookupFamily: reference.lookupFamily,
        providerNativeLookupIdentity: reference.providerNativeLookupIdentity,
      }).slice("sha256:".length);
      diagnostics.push(
        makeSourceDiagnostic(
          draft.candidateIdentity,
          record,
          "SOURCE_LOOKUP_UNRESOLVED",
          `source.lookup.unresolved.${suffix}`,
        ),
      );
    }
  }
  return Object.freeze(diagnostics);
}

function mergeDiagnostics(
  sourceDiagnostics: readonly DiagnosticFact[],
  derivedDiagnostics: readonly DiagnosticFact[],
): readonly DiagnosticFact[] {
  const byIdentity = new Map<string, DiagnosticFact>();
  for (const diagnostic of [...sourceDiagnostics, ...derivedDiagnostics]) {
    const prior = byIdentity.get(diagnostic.diagnosticIdentity);
    if (prior) return fail("SOURCE_SNAPSHOT_DIAGNOSTIC_MISMATCH");
    byIdentity.set(diagnostic.diagnosticIdentity, diagnostic);
  }
  const decoded = decodeDiagnosticFactSet([...byIdentity.values()]);
  if (!decoded.accepted) return fail("SOURCE_SNAPSHOT_DIAGNOSTIC_MISMATCH");
  return decoded.value;
}

function validateSourceDiagnosticScope(draft: SourceSnapshotDraft): void {
  const allowedIdentities = new Set<string>([
    draft.sourceContextIdentity,
    draft.sourceProjectIdentity,
    draft.candidateIdentity,
  ]);
  for (const record of allSnapshotRecords(draft)) {
    allowedIdentities.add(record.sourceEntityIdentity);
    for (const field of record.fields) allowedIdentities.add(field.sourceFieldIdentity);
    for (const observation of record.extensionObservations) {
      allowedIdentities.add(observation.sourceFieldIdentity);
    }
    for (const column of record.fieldTestColumns) {
      allowedIdentities.add(column.value.sourceFieldIdentity);
    }
  }
  for (const diagnostic of draft.sourceDiagnostics) {
    if (
      !["source", "data", "integrity"].includes(diagnostic.category) ||
      !allowedIdentities.has(diagnostic.affected.identity) ||
      diagnostic.input.revision !== draft.candidateIdentity
    ) {
      return fail("SOURCE_SNAPSHOT_DIAGNOSTIC_MISMATCH");
    }
  }
}

function parseSourceSnapshotDraft(input: unknown, requireCanonical: boolean): SourceSnapshotDraft {
  const record = readRecord(input);
  requireFields(record, [
    "snapshotVersion",
    "sourceContextIdentity",
    "sourceProjectIdentity",
    "candidateIdentity",
    "acceptedAtUtc",
    "adapterId",
    "adapterContractVersion",
    "providerOrganizationIdentity",
    "providerAccountScopeIdentity",
    "mappingContractId",
    "mappingContractVersion",
    "sourceProject",
    "explorations",
    "strata",
    "samples",
    "fieldTests",
    "comments",
    "openHoleGroundwaterObservations",
    "lookups",
    "extensionManifest",
    "sourceDiagnostics",
  ]);
  if (record["snapshotVersion"] !== sourceSnapshotVersion) {
    if (typeof record["snapshotVersion"] !== "number") return fail("SOURCE_SNAPSHOT_WRONG_TYPE");
    return fail("SOURCE_SNAPSHOT_UNSUPPORTED_VERSION");
  }
  const draft = Object.freeze({
    snapshotVersion: sourceSnapshotVersion,
    sourceContextIdentity: readIdentity(
      record["sourceContextIdentity"],
      defineOpaqueIdentityCodec("SourceContextIdentity"),
    ),
    sourceProjectIdentity: readIdentity(
      record["sourceProjectIdentity"],
      sourceProjectIdentityCodec,
    ),
    candidateIdentity: readIdentity(record["candidateIdentity"], sourceCandidateIdentityCodec),
    acceptedAtUtc: readUtcInstant(record["acceptedAtUtc"]),
    adapterId: readText(record["adapterId"]),
    adapterContractVersion: readPositiveSafeInteger(record["adapterContractVersion"]),
    providerOrganizationIdentity: readText(record["providerOrganizationIdentity"]),
    providerAccountScopeIdentity: readText(record["providerAccountScopeIdentity"]),
    mappingContractId: readText(record["mappingContractId"]),
    mappingContractVersion: readPositiveSafeInteger(record["mappingContractVersion"]),
    sourceProject: parseRecordForKind(record["sourceProject"], "source-project"),
    explorations: parseRecordFamilyArray(record["explorations"], "exploration", requireCanonical),
    strata: parseRecordFamilyArray(record["strata"], "stratum", requireCanonical),
    samples: parseRecordFamilyArray(record["samples"], "sample", requireCanonical),
    fieldTests: parseRecordFamilyArray(record["fieldTests"], "field-test", requireCanonical),
    comments: parseRecordFamilyArray(record["comments"], "comment", requireCanonical),
    openHoleGroundwaterObservations: parseRecordFamilyArray(
      record["openHoleGroundwaterObservations"],
      "open-hole-groundwater-observation",
      requireCanonical,
    ),
    lookups: parseRecordFamilyArray(record["lookups"], "lookup", requireCanonical),
    extensionManifest: parseManifestArray(record["extensionManifest"], requireCanonical),
    sourceDiagnostics: parseDiagnosticArray(record["sourceDiagnostics"], requireCanonical),
  });
  if (
    draft.sourceContextIdentity !==
    deriveSourceContextIdentityValue({
      adapterId: draft.adapterId,
      providerOrganizationIdentity: draft.providerOrganizationIdentity,
      providerAccountScopeIdentity: draft.providerAccountScopeIdentity,
      sourceProjectIdentity: draft.sourceProjectIdentity,
    })
  ) {
    return fail("SOURCE_SNAPSHOT_IDENTITY_MISMATCH");
  }
  validateSnapshotRelationships(draft);
  validateSnapshotExtensions(draft);
  validateSourceDiagnosticScope(draft);
  return draft;
}

function deriveSourceSnapshotIdentityValue(
  candidateIdentity: SourceCandidateIdentity,
  logicalDigest: Sha256Digest,
): SourceSnapshotIdentity {
  const candidate = readIdentity(candidateIdentity, sourceCandidateIdentityCodec);
  const digest = readDigest(logicalDigest);
  return deriveIdentity(sourceSnapshotIdentityCodec, "source-snapshot", {
    schema: "rsrender.source-snapshot-identity.v1",
    candidateIdentity: candidate,
    logicalDigest: digest,
  });
}

export function deriveSourceSnapshotIdentity(
  input: unknown,
): SourceIdentityDerivationResult<SourceSnapshotIdentity> {
  try {
    const record = readRecord(input);
    requireFields(record, ["candidateIdentity", "logicalDigest"]);
    return Object.freeze({
      accepted: true,
      value: deriveSourceSnapshotIdentityValue(
        readIdentity(record["candidateIdentity"], sourceCandidateIdentityCodec),
        readDigest(record["logicalDigest"]),
      ),
    });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

function makeSourceSnapshot(draft: SourceSnapshotDraft): SourceSnapshot {
  const blockedCapabilities = blockedCapabilityInventory();
  const diagnostics = mergeDiagnostics(draft.sourceDiagnostics, [
    ...deriveIntervalDiagnostics(draft),
    ...deriveRelationshipDiagnostics(draft),
  ]);
  // Acceptance time is custody metadata, not source logical content. Candidate identity still
  // scopes the completed retrieval; derived digest/identity fields are necessarily excluded.
  const logicalBasis = Object.freeze({
    snapshotVersion: draft.snapshotVersion,
    sourceContextIdentity: draft.sourceContextIdentity,
    sourceProjectIdentity: draft.sourceProjectIdentity,
    candidateIdentity: draft.candidateIdentity,
    adapterId: draft.adapterId,
    adapterContractVersion: draft.adapterContractVersion,
    providerOrganizationIdentity: draft.providerOrganizationIdentity,
    providerAccountScopeIdentity: draft.providerAccountScopeIdentity,
    mappingContractId: draft.mappingContractId,
    mappingContractVersion: draft.mappingContractVersion,
    sourceProject: draft.sourceProject,
    explorations: draft.explorations,
    strata: draft.strata,
    samples: draft.samples,
    fieldTests: draft.fieldTests,
    comments: draft.comments,
    openHoleGroundwaterObservations: draft.openHoleGroundwaterObservations,
    lookups: draft.lookups,
    extensionManifest: draft.extensionManifest,
    sourceDiagnostics: draft.sourceDiagnostics,
    blockedCapabilities,
    diagnostics,
  });
  const logicalDigest = sha256CanonicalJson(logicalBasis);
  return Object.freeze({
    ...draft,
    blockedCapabilities,
    diagnostics,
    logicalDigest,
    snapshotIdentity: deriveSourceSnapshotIdentityValue(draft.candidateIdentity, logicalDigest),
  });
}

function parseBlockedCapabilityInventory(
  input: unknown,
): readonly SourceEvidenceBlockedCapability[] {
  const supplied = readArray(input).map((value) => {
    const record = readRecord(value);
    requireFields(record, ["capabilityId", "disposition", "positiveRecordCount", "authorityIssue"]);
    return Object.freeze({
      capabilityId: readText(record["capabilityId"]),
      disposition: readText(record["disposition"]),
      positiveRecordCount: record["positiveRecordCount"],
      authorityIssue: readText(record["authorityIssue"]),
    });
  });
  const expected = blockedCapabilityInventory();
  if (canonicalizeJson(supplied) !== canonicalizeJson(expected)) {
    return fail("SOURCE_SNAPSHOT_POSITIVE_CAPABILITY_BLOCKED");
  }
  return expected;
}

function parseSourceSnapshot(input: unknown): SourceSnapshot {
  const record = readRecord(input);
  requireFields(record, [
    "snapshotVersion",
    "sourceContextIdentity",
    "sourceProjectIdentity",
    "candidateIdentity",
    "acceptedAtUtc",
    "adapterId",
    "adapterContractVersion",
    "providerOrganizationIdentity",
    "providerAccountScopeIdentity",
    "mappingContractId",
    "mappingContractVersion",
    "sourceProject",
    "explorations",
    "strata",
    "samples",
    "fieldTests",
    "comments",
    "openHoleGroundwaterObservations",
    "lookups",
    "extensionManifest",
    "sourceDiagnostics",
    "blockedCapabilities",
    "diagnostics",
    "logicalDigest",
    "snapshotIdentity",
  ]);
  const draft = parseSourceSnapshotDraft(
    {
      snapshotVersion: record["snapshotVersion"],
      sourceContextIdentity: record["sourceContextIdentity"],
      sourceProjectIdentity: record["sourceProjectIdentity"],
      candidateIdentity: record["candidateIdentity"],
      acceptedAtUtc: record["acceptedAtUtc"],
      adapterId: record["adapterId"],
      adapterContractVersion: record["adapterContractVersion"],
      providerOrganizationIdentity: record["providerOrganizationIdentity"],
      providerAccountScopeIdentity: record["providerAccountScopeIdentity"],
      mappingContractId: record["mappingContractId"],
      mappingContractVersion: record["mappingContractVersion"],
      sourceProject: record["sourceProject"],
      explorations: record["explorations"],
      strata: record["strata"],
      samples: record["samples"],
      fieldTests: record["fieldTests"],
      comments: record["comments"],
      openHoleGroundwaterObservations: record["openHoleGroundwaterObservations"],
      lookups: record["lookups"],
      extensionManifest: record["extensionManifest"],
      sourceDiagnostics: record["sourceDiagnostics"],
    },
    true,
  );
  const expected = makeSourceSnapshot(draft);
  parseBlockedCapabilityInventory(record["blockedCapabilities"]);
  const suppliedDiagnostics = parseDiagnosticArray(record["diagnostics"], true);
  if (canonicalizeJson(suppliedDiagnostics) !== canonicalizeJson(expected.diagnostics)) {
    return fail("SOURCE_SNAPSHOT_DIAGNOSTIC_MISMATCH");
  }
  if (readDigest(record["logicalDigest"]) !== expected.logicalDigest) {
    return fail("SOURCE_SNAPSHOT_DIGEST_MISMATCH");
  }
  if (
    readIdentity(record["snapshotIdentity"], sourceSnapshotIdentityCodec) !==
    expected.snapshotIdentity
  ) {
    return fail("SOURCE_SNAPSHOT_IDENTITY_MISMATCH");
  }
  return expected;
}

/** Producer codec for one immutable accepted, source-only Snapshot. */
export function createSourceSnapshot(input: unknown): SourceSnapshotDecodeResult {
  try {
    return Object.freeze({
      accepted: true,
      value: makeSourceSnapshot(parseSourceSnapshotDraft(input, false)),
    });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

/** Persisted-boundary codec that checks ordering, diagnostics, identity, and logical digest. */
export function decodeSourceSnapshot(input: unknown): SourceSnapshotDecodeResult {
  try {
    return Object.freeze({ accepted: true, value: parseSourceSnapshot(input) });
  } catch (error) {
    return rejected(normalizeFailure(error));
  }
}

export function encodeSourceSnapshot(input: unknown): SourceSnapshotEncodeResult {
  const decoded = decodeSourceSnapshot(input);
  if (!decoded.accepted) return decoded;
  const canonicalJson = canonicalizeJson(decoded.value);
  return Object.freeze({
    accepted: true,
    value: decoded.value,
    canonicalJson,
    digest: sha256CanonicalJson(decoded.value),
  });
}

// These imports are intentionally referenced in the public record-family declarations added below.
export type SourceSnapshotProjectIdentity = SourceProjectIdentity;
export type SourceSnapshotExplorationIdentity = SourceExplorationIdentity;
