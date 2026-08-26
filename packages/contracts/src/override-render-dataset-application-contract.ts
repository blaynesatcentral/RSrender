import { canonicalizeJson, type CanonicalJsonValue } from "./canonical-json.js";
import {
  applicationRequestIdentityCodec,
  isEventSequence,
  isOwnerGeneration,
  isWorkingRevision,
  type ApplicationRequestIdentity,
  type EventSequence,
  type OwnerGeneration,
  type WorkingRevision,
} from "./application-service-contract.js";
import {
  historyEntryIdentityCodec,
  isDurableRevision,
  type DurableRevision,
  type HistoryEntryIdentity,
  type HistoryOperation,
} from "./history-core-contract.js";
import { parseOpaqueIdentity } from "./identity.js";
import { isSha256Digest, sha256Utf8, type Sha256Digest } from "./sha256.js";

export const maximumOverrideRenderDatasetProjectionOverrides = 256 as const;
import { isWellFormedUnicode } from "./unicode.js";

export const overrideRenderDatasetApplicationContractVersion = 1 as const;
export const overrideRenderDatasetApplicationContractRevision =
  "bld-019-override-render-dataset-application-v1" as const;
export const setDisplayValueOverrideCommandId = "presentation-override.set-display-value" as const;
export const revertDisplayValueOverrideCommandId =
  "presentation-override.revert-display-value" as const;
export const overrideRenderDatasetQueryKind = "render-dataset.get" as const;
export const overrideRenderDatasetProjectionKind = "render-dataset.projection" as const;
export const overrideRenderDatasetEventKind = "render-dataset.projected" as const;

export type OverrideRenderDatasetCommandId =
  | typeof setDisplayValueOverrideCommandId
  | typeof revertDisplayValueOverrideCommandId
  | "history.undo"
  | "history.redo";

export type OverrideRenderDatasetContractRejectionCode =
  | "OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH"
  | "OVERRIDE_RENDER_CONTRACT_DUPLICATE_VALUE"
  | "OVERRIDE_RENDER_CONTRACT_EXTRA_FIELD"
  | "OVERRIDE_RENDER_CONTRACT_MALFORMED"
  | "OVERRIDE_RENDER_CONTRACT_MISSING_FIELD"
  | "OVERRIDE_RENDER_CONTRACT_ORDER_MISMATCH"
  | "OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG"
  | "OVERRIDE_RENDER_CONTRACT_UNSUPPORTED_VERSION"
  | "OVERRIDE_RENDER_CONTRACT_WRONG_TYPE";

export type OverrideRenderDatasetContractResult<Value> =
  | { readonly accepted: true; readonly value: Value }
  | { readonly accepted: false; readonly code: OverrideRenderDatasetContractRejectionCode };

export type OverrideRenderDatasetEncodeResult<Value> =
  | {
      readonly accepted: true;
      readonly value: Value;
      readonly canonicalJson: string;
      readonly digest: Sha256Digest;
    }
  | { readonly accepted: false; readonly code: OverrideRenderDatasetContractRejectionCode };

export type OverrideValueType =
  | "absent"
  | "null"
  | "empty-string"
  | "empty-collection"
  | "zero"
  | "boolean"
  | "number"
  | "string"
  | "not-available"
  | "not-permitted"
  | "malformed";

export type OverrideRenderContentState =
  | { readonly kind: "absent" }
  | { readonly kind: "null" }
  | { readonly kind: "empty-string" }
  | { readonly kind: "empty-collection" }
  | { readonly kind: "zero"; readonly value: 0; readonly originalRepresentation: string }
  | {
      readonly kind: "value";
      readonly value: boolean | number | string;
      readonly originalRepresentation: string;
    }
  | { readonly kind: "not-available"; readonly statusCode: string }
  | { readonly kind: "not-permitted"; readonly denialCode: string }
  | {
      readonly kind: "malformed";
      readonly safeRawRepresentation: string;
      readonly rawDigest: Sha256Digest;
    };

export type OverrideRenderAssociationState =
  | { readonly state: "resolved"; readonly targetIdentity: string }
  | { readonly state: "unmatched" }
  | { readonly state: "ambiguous"; readonly candidateTargetIdentities: readonly string[] }
  | { readonly state: "not-applicable" };

export type OverrideRenderFinalityState = {
  readonly state: "final" | "nonfinal" | "unknown" | "not-applicable";
};

export type OverrideRenderEligibilityReason =
  | "content"
  | "association"
  | "finality"
  | "unit"
  | "relationship"
  | "duplicate"
  | "rights"
  | "policy";

export type OverrideRenderEligibilityState =
  | { readonly state: "eligible"; readonly reasonCodes: readonly [] }
  | {
      readonly state: "blocked" | "metadata-only";
      readonly reasonCodes: readonly OverrideRenderEligibilityReason[];
    };

export type OverrideRenderUnitState =
  | { readonly state: "not-applicable" }
  | { readonly state: "specified"; readonly quantity: string; readonly symbol: string }
  | { readonly state: "unsupported"; readonly originalUnit: string };

export type OverrideRenderProvenanceTransformation =
  | { readonly kind: "mapping"; readonly ruleId: string; readonly ruleVersion: number }
  | {
      readonly kind: "unit-conversion";
      readonly ruleId: string;
      readonly ruleVersion: number;
      readonly unitBefore: string;
      readonly unitAfter: string;
      readonly roundingMode: string;
    };

export type OverrideRenderValueProvenance =
  | {
      readonly provenanceClass: "source";
      readonly sourceContextIdentity: string;
      readonly entityIdentity: string;
      readonly fieldIdentity: string;
      readonly adapterId: string;
      readonly adapterContractVersion: number;
      readonly retrievedAtUtc: string;
      readonly mappingRuleId: string;
      readonly mappingRuleVersion: number;
      readonly basisCodes: readonly string[];
      readonly transformations: readonly OverrideRenderProvenanceTransformation[];
    }
  | {
      readonly provenanceClass: "override";
      readonly presentationOverrideIdentity: string;
      readonly sourceFieldIdentity: string;
      readonly expectedSourceValueDigest: Sha256Digest;
      readonly overrideRevision: number;
      readonly recordedAtUtc: string;
      readonly basisCodes: readonly string[];
      readonly transformations: readonly OverrideRenderProvenanceTransformation[];
    };

export interface SetDisplayValueOverrideCommand {
  readonly contractVersion: 1;
  readonly messageType: "command";
  readonly scope: "document-domain";
  readonly kind: "presentation-override.set-display-value";
  readonly requestId: ApplicationRequestIdentity;
  readonly commandId: "presentation-override.set-display-value";
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly expectedWorkingRevision: WorkingRevision;
  readonly payload: {
    readonly localOverrideIdentity: string;
    readonly targetSourceFieldIdentity: string;
    readonly expectedSourceValueDigest: Sha256Digest;
    readonly expectedSourceValueType: OverrideValueType;
    readonly expectedSourceUnit: OverrideRenderUnitState;
    readonly replacementContent: OverrideRenderContentState;
    readonly replacementUnit: OverrideRenderUnitState;
    readonly reason: string;
    readonly authorIdentity: string | null;
    readonly recordedAtUtc: string;
  };
}

export interface RevertDisplayValueOverrideCommand {
  readonly contractVersion: 1;
  readonly messageType: "command";
  readonly scope: "document-domain";
  readonly kind: "presentation-override.revert-display-value";
  readonly requestId: ApplicationRequestIdentity;
  readonly commandId: "presentation-override.revert-display-value";
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly expectedWorkingRevision: WorkingRevision;
  readonly payload: {
    readonly localOverrideIdentity: string;
    readonly targetSourceFieldIdentity: string;
    readonly expectedOverrideRevision: number;
  };
}

export interface OverrideHistoryNavigationCommand {
  readonly contractVersion: 1;
  readonly messageType: "command";
  readonly scope: "document-domain";
  readonly kind: "history.undo" | "history.redo";
  readonly requestId: ApplicationRequestIdentity;
  readonly commandId: "history.undo" | "history.redo";
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly expectedWorkingRevision: WorkingRevision;
  readonly payload: null;
}

export type OverrideRenderDatasetCommand =
  | SetDisplayValueOverrideCommand
  | RevertDisplayValueOverrideCommand
  | OverrideHistoryNavigationCommand;

export interface OverrideRenderDatasetQuery {
  readonly contractVersion: 1;
  readonly messageType: "query";
  readonly scope: "document-domain";
  readonly kind: "render-dataset.get";
  readonly requestId: ApplicationRequestIdentity;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly minimumWorkingRevision: WorkingRevision | null;
}

export interface OverrideRenderDomainValueProjection {
  readonly valueType: OverrideValueType;
  readonly contentState: OverrideRenderContentState["kind"];
  readonly content: OverrideRenderContentState;
  readonly association: OverrideRenderAssociationState;
  readonly finality: OverrideRenderFinalityState;
  readonly eligibility: OverrideRenderEligibilityState;
  readonly unit: OverrideRenderUnitState;
  readonly provenance: OverrideRenderValueProvenance;
  readonly canonicalJson: string;
  readonly digest: Sha256Digest;
}

export interface OverrideRenderValueProjection {
  readonly sourceFieldIdentity: string;
  readonly sourceEntityIdentity: string;
  readonly fieldPath: string;
  readonly sourceBaselineValueDigest: Sha256Digest;
  readonly sourceOriginal: OverrideRenderDomainValueProjection;
  readonly effectiveDisplay: OverrideRenderDomainValueProjection;
  readonly application:
    | { readonly kind: "source" }
    | {
        readonly kind: "display-value-override";
        readonly presentationOverrideIdentity: string;
      };
}

export interface OverrideStateProjection {
  readonly presentationOverrideIdentity: string;
  readonly localOverrideIdentity: string;
  readonly targetSourceContextIdentity: string;
  readonly targetSourceEntityIdentity: string;
  readonly targetSourceFieldIdentity: string;
  readonly expectedSourceValueDigest: Sha256Digest;
  readonly expectedSourceValueType: OverrideValueType;
  readonly expectedSourceUnit: OverrideRenderUnitState;
  readonly replacementValue: OverrideRenderDomainValueProjection;
  readonly overrideRevision: number;
  readonly enabled: boolean;
  readonly reason: string;
  readonly authorIdentity: string | null;
  readonly recordedAtUtc: string;
}

export interface OverrideRenderDatasetProjection {
  readonly projectionVersion: 1;
  readonly projectionKind: "render-dataset.projection";
  readonly projectionIdentity: string;
  readonly projectionDigest: Sha256Digest;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly workingRevision: WorkingRevision;
  readonly durableRevision: DurableRevision;
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly eventSequence: EventSequence;
  readonly aggregateDigest: Sha256Digest;
  readonly sourceSnapshotIdentity: string;
  readonly sourceSnapshotLogicalDigest: Sha256Digest;
  readonly sourceSnapshotEncodingDigest: Sha256Digest;
  readonly sourceContextIdentity: string;
  readonly sourceProjectIdentity: string;
  readonly presentationOverrideState: "empty" | "current";
  readonly presentationOverrideProjectRevision: number;
  readonly presentationOverrideRevisionIdentity: string;
  readonly presentationOverrideContentDigest: Sha256Digest;
  readonly presentationOverrideCollectionIdentity: string | null;
  readonly presentationOverrideCollectionRevision: number | null;
  readonly presentationOverrideCollectionDigest: Sha256Digest | null;
  readonly presentationOverrideCollectionCanonicalJson: string | null;
  readonly presentationOverrideCollectionEncodingDigest: Sha256Digest | null;
  readonly datasetIdentity: string;
  readonly datasetLogicalDigest: Sha256Digest;
  readonly datasetCanonicalJson: string;
  readonly datasetEncodingDigest: Sha256Digest;
  readonly overrides: readonly OverrideStateProjection[];
  readonly values: readonly OverrideRenderValueProjection[];
  readonly diagnosticFacts: readonly OverrideRenderDiagnosticFactProjection[];
  readonly diagnosticFactsDigest: Sha256Digest;
}

export interface OverrideRenderDiagnosticFactProjection {
  readonly factVersion: 1;
  readonly code: string;
  readonly category: string;
  readonly affected: {
    readonly identityKind: string;
    readonly identity: string;
    readonly path?: string;
  };
  readonly cause: { readonly causeKey: string; readonly evidenceClass: string };
  readonly consequence: string;
  readonly input: { readonly revision: string; readonly digest: Sha256Digest };
  readonly remediationActionIds: readonly string[];
  readonly diagnosticIdentity: Sha256Digest;
  readonly orderingKey: readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    Sha256Digest,
    Sha256Digest,
    Sha256Digest,
  ];
}

export type OverrideRenderDatasetProjectionDraft = Omit<
  OverrideRenderDatasetProjection,
  "projectionIdentity" | "projectionDigest"
>;

export type OverrideRenderDatasetRejectionReason =
  | "CAPACITY_EXHAUSTED"
  | "CONTRACT_MALFORMED"
  | "CONTRACT_UNSUPPORTED_VERSION"
  | "DOCUMENT_IDENTITY_MISMATCH"
  | "DOMAIN_PRECONDITION_FAILED"
  | "INTERNAL_STATE_INVALID"
  | "INVALID_BASELINE"
  | "INVALID_RATIONALE"
  | "INVALID_UNIT"
  | "INVALID_VALUE_TYPE"
  | "MINIMUM_WORKING_REVISION_UNAVAILABLE"
  | "NOTHING_TO_REDO"
  | "NOTHING_TO_UNDO"
  | "OWNER_GENERATION_MISMATCH"
  | "PROJECTION_ASSEMBLY_FAILED"
  | "REQUEST_ID_REUSE_MISMATCH"
  | "STALE_WORKING_REVISION"
  | "TARGET_NOT_FOUND"
  | "UNKNOWN_COMMAND"
  | "UNKNOWN_QUERY"
  | "UNSUPPORTED_CURRENT_INPUT";

export interface OverrideRenderDatasetRejectedResult {
  readonly contractVersion: 1;
  readonly messageType: "command-result" | "query-result";
  readonly kind: "override-render-dataset.rejected";
  readonly requestId: ApplicationRequestIdentity | null;
  readonly reason: OverrideRenderDatasetRejectionReason;
  readonly changed: false;
  readonly safeActions: readonly [];
}

export interface OverrideRenderDatasetEvent {
  readonly contractVersion: 1;
  readonly messageType: "event";
  readonly kind: "render-dataset.projected";
  readonly sourceRequestId: ApplicationRequestIdentity;
  readonly commandId: OverrideRenderDatasetCommandId;
  readonly operation: HistoryOperation;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly eventSequence: EventSequence;
  readonly baseWorkingRevision: WorkingRevision;
  readonly resultingWorkingRevision: WorkingRevision;
  readonly historyEntryIdentity: HistoryEntryIdentity;
  readonly beforeAggregateDigest: Sha256Digest;
  readonly afterAggregateDigest: Sha256Digest;
  readonly projection: OverrideRenderDatasetProjection;
}

export interface OverrideRenderDatasetCommittedResult {
  readonly contractVersion: 1;
  readonly messageType: "command-result";
  readonly kind: "override-render-dataset.committed";
  readonly requestId: ApplicationRequestIdentity;
  readonly commandId: OverrideRenderDatasetCommandId;
  readonly operation: HistoryOperation;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly previousWorkingRevision: WorkingRevision;
  readonly workingRevision: WorkingRevision;
  readonly durableRevision: DurableRevision;
  readonly historyEntryIdentity: HistoryEntryIdentity;
  readonly aggregateDigest: Sha256Digest;
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly eventSequence: EventSequence;
  readonly projection: OverrideRenderDatasetProjection;
  readonly event: OverrideRenderDatasetEvent;
  readonly changed: true;
}

export type OverrideRenderDatasetCommandResult =
  OverrideRenderDatasetCommittedResult | OverrideRenderDatasetRejectedResult;

export interface OverrideRenderDatasetProjectionResult {
  readonly contractVersion: 1;
  readonly messageType: "query-result";
  readonly kind: "render-dataset.projection.result";
  readonly requestId: ApplicationRequestIdentity;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly workingRevision: WorkingRevision;
  readonly durableRevision: DurableRevision;
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly eventSequence: EventSequence;
  readonly projection: OverrideRenderDatasetProjection;
}

export type OverrideRenderDatasetQueryResult =
  OverrideRenderDatasetProjectionResult | OverrideRenderDatasetRejectedResult;

type DataRecord = Readonly<Record<string, unknown>>;

class ContractFailure extends Error {
  public constructor(public readonly code: OverrideRenderDatasetContractRejectionCode) {
    super(code);
  }
}

function fail(code: OverrideRenderDatasetContractRejectionCode): never {
  throw new ContractFailure(code);
}

function readRecord(input: unknown): DataRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("OVERRIDE_RENDER_CONTRACT_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("OVERRIDE_RENDER_CONTRACT_MALFORMED");
  }
  const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return fail("OVERRIDE_RENDER_CONTRACT_MALFORMED");
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("OVERRIDE_RENDER_CONTRACT_MALFORMED");
    }
    copy[key] = descriptor.value;
  }
  return copy;
}

function requireFields(record: DataRecord, expected: readonly string[]): void {
  if (expected.some((field) => !Object.hasOwn(record, field))) {
    return fail("OVERRIDE_RENDER_CONTRACT_MISSING_FIELD");
  }
  if (Object.keys(record).some((field) => !expected.includes(field))) {
    return fail("OVERRIDE_RENDER_CONTRACT_EXTRA_FIELD");
  }
}

function readArray(input: unknown): readonly unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  const ownKeys = Reflect.ownKeys(input);
  if (
    ownKeys.some(
      (key) =>
        key !== "length" &&
        (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= input.length),
    )
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_MALFORMED");
  }
  const result: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("OVERRIDE_RENDER_CONTRACT_MALFORMED");
    }
    result.push(descriptor.value);
  }
  return Object.freeze(result);
}

function readText(input: unknown, allowEmpty = false): string {
  if (
    typeof input !== "string" ||
    (!allowEmpty && input.length === 0) ||
    !isWellFormedUnicode(input)
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return input;
}

function readIdentity(input: unknown): string {
  try {
    return parseOpaqueIdentity(input);
  } catch {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
}

function readRequestIdentity(input: unknown): ApplicationRequestIdentity {
  try {
    return applicationRequestIdentityCodec.parse(input);
  } catch {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
}

function readTimestamp(input: unknown): string {
  const value = readText(input);
  const instant = Date.parse(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) ||
    !Number.isFinite(instant) ||
    new Date(instant).toISOString() !== value
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return value;
}

const diagnosticAtomPattern = /^[A-Za-z][A-Za-z0-9]*(?:[._:/-][A-Za-z0-9]+)*$/u;
const diagnosticCategories = Object.freeze([
  "source",
  "data",
  "integrity",
  "template",
  "binding",
  "text",
  "layout",
  "font",
  "asset",
  "document",
  "publication",
  "export",
  "security",
  "recovery",
] as const);
const diagnosticConsequences = Object.freeze([
  "unavailable",
  "ignored",
  "fallback",
  "conflict",
  "candidate-ineligible",
  "render-ineligible",
  "export-policy-input",
] as const);

function isDiagnosticSafeText(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) as number;
    if (
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      (codePoint >= 0x202a && codePoint <= 0x202e) ||
      (codePoint >= 0x2066 && codePoint <= 0x2069) ||
      codePoint === 0xfeff ||
      (codePoint >= 0xfdd0 && codePoint <= 0xfdef) ||
      (codePoint & 0xffff) === 0xfffe ||
      (codePoint & 0xffff) === 0xffff
    ) {
      return false;
    }
  }
  return isWellFormedUnicode(value);
}

function readDiagnosticText(input: unknown): string {
  const value = readText(input);
  if (!isDiagnosticSafeText(value)) return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  return value;
}

function readCommandReason(input: unknown): string {
  const value = readText(input, true);
  if (!isDiagnosticSafeText(value)) return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  return value;
}

function readDiagnosticAtom(input: unknown): string {
  const value = readDiagnosticText(input);
  if (!diagnosticAtomPattern.test(value)) return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  return value;
}

function compareCodeUnits(left: string, right: string): -1 | 0 | 1 {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left.charCodeAt(index) !== right.charCodeAt(index)) {
      return left.charCodeAt(index) < right.charCodeAt(index) ? -1 : 1;
    }
  }
  return left.length === right.length ? 0 : left.length < right.length ? -1 : 1;
}

function compareStringTuples(left: readonly string[], right: readonly string[]): -1 | 0 | 1 {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const order = compareCodeUnits(left[index] as string, right[index] as string);
    if (order !== 0) return order;
  }
  return left.length === right.length ? 0 : left.length < right.length ? -1 : 1;
}

function readNonnegativeInteger(input: unknown): number {
  if (!Number.isSafeInteger(input) || (input as number) < 0) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return input as number;
}

function cloneJson(input: unknown, depth = 0): CanonicalJsonValue {
  if (depth > 64) return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  if (input === null || typeof input === "boolean" || typeof input === "string") {
    if (typeof input === "string" && !isWellFormedUnicode(input)) {
      return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
    }
    return input;
  }
  if (typeof input === "number") {
    if (!Number.isFinite(input) || Object.is(input, -0)) {
      return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
    }
    return input;
  }
  if (Array.isArray(input)) {
    return Object.freeze(readArray(input).map((entry) => cloneJson(entry, depth + 1)));
  }
  const record = readRecord(input);
  const result: Record<string, CanonicalJsonValue> = Object.create(null) as Record<
    string,
    CanonicalJsonValue
  >;
  for (const key of Object.keys(record).sort()) {
    if (!isWellFormedUnicode(key)) return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
    result[key] = cloneJson(record[key], depth + 1);
  }
  return Object.freeze(result);
}

const valueTypes = Object.freeze([
  "absent",
  "null",
  "empty-string",
  "empty-collection",
  "zero",
  "boolean",
  "number",
  "string",
  "not-available",
  "not-permitted",
  "malformed",
] as const);

function readValueType(input: unknown): OverrideValueType {
  if (!valueTypes.includes(input as OverrideValueType)) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return input as OverrideValueType;
}

function deriveValueType(content: CanonicalJsonValue): OverrideValueType {
  if (typeof content !== "object" || content === null || Array.isArray(content)) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  const record = content as Readonly<Record<string, CanonicalJsonValue>>;
  const kind = record["kind"];
  if (
    kind === "absent" ||
    kind === "null" ||
    kind === "empty-string" ||
    kind === "empty-collection"
  ) {
    if (Object.keys(record).length !== 1) return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
    return kind;
  }
  if (kind === "zero") {
    if (
      Object.keys(record).length !== 3 ||
      !Object.is(record["value"], 0) ||
      typeof record["originalRepresentation"] !== "string" ||
      record["originalRepresentation"].length === 0
    ) {
      return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
    }
    return "zero";
  }
  if (kind === "value") {
    const value = record["value"];
    if (
      Object.keys(record).length !== 3 ||
      (typeof value !== "boolean" && typeof value !== "number" && typeof value !== "string") ||
      (typeof value === "number" && (!Number.isFinite(value) || value === 0)) ||
      (typeof value === "string" && value.length === 0) ||
      typeof record["originalRepresentation"] !== "string" ||
      record["originalRepresentation"].length === 0
    ) {
      return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
    }
    return typeof value as "boolean" | "number" | "string";
  }
  if (kind === "not-available" || kind === "not-permitted") {
    const field = kind === "not-available" ? "statusCode" : "denialCode";
    if (
      Object.keys(record).length !== 2 ||
      typeof record[field] !== "string" ||
      record[field].length === 0
    ) {
      return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
    }
    return kind;
  }
  if (kind === "malformed") {
    if (
      Object.keys(record).length !== 3 ||
      typeof record["safeRawRepresentation"] !== "string" ||
      record["safeRawRepresentation"].length === 0 ||
      !isSha256Digest(record["rawDigest"])
    ) {
      return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
    }
    return "malformed";
  }
  return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
}

function positiveInteger(input: unknown): number {
  if (!Number.isSafeInteger(input) || (input as number) < 1 || Object.is(input, -0)) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return input as number;
}

function readUniqueTextArray(input: unknown, minimum: number): readonly string[] {
  const values = readArray(input).map((value) => readText(value));
  if (values.length < minimum || new Set(values).size !== values.length) {
    return fail("OVERRIDE_RENDER_CONTRACT_DUPLICATE_VALUE");
  }
  return Object.freeze(values);
}

function parseContentAxis(input: unknown): OverrideRenderContentState {
  const content = cloneJson(input);
  deriveValueType(content);
  return content as OverrideRenderContentState;
}

function parseAssociationAxis(input: unknown): OverrideRenderAssociationState {
  const record = readRecord(input);
  if (record["state"] === "resolved") {
    requireFields(record, ["state", "targetIdentity"]);
    return Object.freeze({ state: "resolved", targetIdentity: readText(record["targetIdentity"]) });
  }
  if (record["state"] === "unmatched" || record["state"] === "not-applicable") {
    requireFields(record, ["state"]);
    return Object.freeze({ state: record["state"] });
  }
  if (record["state"] === "ambiguous") {
    requireFields(record, ["state", "candidateTargetIdentities"]);
    return Object.freeze({
      state: "ambiguous",
      candidateTargetIdentities: readUniqueTextArray(record["candidateTargetIdentities"], 2),
    });
  }
  return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
}

function parseFinalityAxis(input: unknown): OverrideRenderFinalityState {
  const record = readRecord(input);
  requireFields(record, ["state"]);
  if (
    record["state"] !== "final" &&
    record["state"] !== "nonfinal" &&
    record["state"] !== "unknown" &&
    record["state"] !== "not-applicable"
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  return Object.freeze({ state: record["state"] });
}

const eligibilityReasons = Object.freeze([
  "content",
  "association",
  "finality",
  "unit",
  "relationship",
  "duplicate",
  "rights",
  "policy",
] as const);

function parseEligibilityAxis(input: unknown): OverrideRenderEligibilityState {
  const record = readRecord(input);
  requireFields(record, ["state", "reasonCodes"]);
  if (
    record["state"] !== "eligible" &&
    record["state"] !== "blocked" &&
    record["state"] !== "metadata-only"
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  const reasons = readArray(record["reasonCodes"]).map((reason) => {
    const value = readText(reason);
    return eligibilityReasons.includes(value as (typeof eligibilityReasons)[number])
      ? value
      : fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  });
  if (
    new Set(reasons).size !== reasons.length ||
    (record["state"] === "eligible") !== (reasons.length === 0)
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return Object.freeze({
    state: record["state"],
    reasonCodes: Object.freeze(reasons),
  }) as OverrideRenderEligibilityState;
}

function parseUnitAxis(input: unknown): OverrideRenderUnitState {
  const record = readRecord(input);
  if (record["state"] === "not-applicable") {
    requireFields(record, ["state"]);
    return Object.freeze({ state: "not-applicable" });
  }
  if (record["state"] === "specified") {
    requireFields(record, ["state", "quantity", "symbol"]);
    return Object.freeze({
      state: "specified",
      quantity: readText(record["quantity"]),
      symbol: readText(record["symbol"]),
    });
  }
  if (record["state"] === "unsupported") {
    requireFields(record, ["state", "originalUnit"]);
    return Object.freeze({ state: "unsupported", originalUnit: readText(record["originalUnit"]) });
  }
  return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
}

function parseTransformations(input: unknown): readonly OverrideRenderProvenanceTransformation[] {
  return Object.freeze(
    readArray(input).map((entry) => {
      const record = readRecord(entry);
      if (record["kind"] === "mapping") {
        requireFields(record, ["kind", "ruleId", "ruleVersion"]);
        return Object.freeze({
          kind: "mapping",
          ruleId: readText(record["ruleId"]),
          ruleVersion: positiveInteger(record["ruleVersion"]),
        });
      }
      if (record["kind"] === "unit-conversion") {
        requireFields(record, [
          "kind",
          "ruleId",
          "ruleVersion",
          "unitBefore",
          "unitAfter",
          "roundingMode",
        ]);
        return Object.freeze({
          kind: "unit-conversion",
          ruleId: readText(record["ruleId"]),
          ruleVersion: positiveInteger(record["ruleVersion"]),
          unitBefore: readText(record["unitBefore"]),
          unitAfter: readText(record["unitAfter"]),
          roundingMode: readText(record["roundingMode"]),
        });
      }
      return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
    }),
  );
}

function parseProvenanceAxis(input: unknown): OverrideRenderValueProvenance {
  const record = readRecord(input);
  const common = ["provenanceClass", "basisCodes", "transformations"];
  const basisCodes = readUniqueTextArray(record["basisCodes"], 0);
  const transformations = parseTransformations(record["transformations"]);
  if (record["provenanceClass"] === "source") {
    requireFields(record, [
      ...common,
      "sourceContextIdentity",
      "entityIdentity",
      "fieldIdentity",
      "adapterId",
      "adapterContractVersion",
      "retrievedAtUtc",
      "mappingRuleId",
      "mappingRuleVersion",
    ]);
    return Object.freeze({
      provenanceClass: "source",
      sourceContextIdentity: readText(record["sourceContextIdentity"]),
      entityIdentity: readText(record["entityIdentity"]),
      fieldIdentity: readText(record["fieldIdentity"]),
      adapterId: readText(record["adapterId"]),
      adapterContractVersion: positiveInteger(record["adapterContractVersion"]),
      retrievedAtUtc: readTimestamp(record["retrievedAtUtc"]),
      mappingRuleId: readText(record["mappingRuleId"]),
      mappingRuleVersion: positiveInteger(record["mappingRuleVersion"]),
      basisCodes,
      transformations,
    });
  }
  if (record["provenanceClass"] === "override") {
    requireFields(record, [
      ...common,
      "presentationOverrideIdentity",
      "sourceFieldIdentity",
      "expectedSourceValueDigest",
      "overrideRevision",
      "recordedAtUtc",
    ]);
    if (!isSha256Digest(record["expectedSourceValueDigest"])) {
      return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
    }
    return Object.freeze({
      provenanceClass: "override",
      presentationOverrideIdentity: readText(record["presentationOverrideIdentity"]),
      sourceFieldIdentity: readText(record["sourceFieldIdentity"]),
      expectedSourceValueDigest: record["expectedSourceValueDigest"],
      overrideRevision: positiveInteger(record["overrideRevision"]),
      recordedAtUtc: readTimestamp(record["recordedAtUtc"]),
      basisCodes,
      transformations,
    });
  }
  return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
}

function validateEligibilityCombination(
  content: OverrideRenderContentState,
  association: OverrideRenderAssociationState,
  finality: OverrideRenderFinalityState,
  eligibility: OverrideRenderEligibilityState,
  unit: OverrideRenderUnitState,
): void {
  const contentKind = content.kind;
  const associationState = association.state;
  const finalityState = finality.state;
  const eligibilityRecord = eligibility;
  const unitState = unit.state;
  const required = new Set<string>();
  if (contentKind !== "zero" && contentKind !== "value") required.add("content");
  if (associationState === "unmatched" || associationState === "ambiguous")
    required.add("association");
  if (finalityState === "nonfinal" || finalityState === "unknown") required.add("finality");
  if (unitState === "unsupported") required.add("unit");
  const reasons: readonly OverrideRenderEligibilityReason[] = eligibilityRecord.reasonCodes;
  if (
    (eligibilityRecord.state === "eligible" && required.size > 0) ||
    (eligibilityRecord.state !== "eligible" &&
      [...required].some((reason) => !reasons.includes(reason as OverrideRenderEligibilityReason)))
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
}

function parseCommonRequest(
  record: DataRecord,
  messageType: "command" | "query",
): {
  readonly requestId: ApplicationRequestIdentity;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
} {
  if (record["contractVersion"] !== 1) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNSUPPORTED_VERSION");
  }
  if (record["messageType"] !== messageType || record["scope"] !== "document-domain") {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  if (!isOwnerGeneration(record["ownerGeneration"])) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return Object.freeze({
    requestId: readRequestIdentity(record["requestId"]),
    documentId: readIdentity(record["documentId"]),
    ownerGeneration: record["ownerGeneration"],
  });
}

function parseSetCommand(record: DataRecord): SetDisplayValueOverrideCommand {
  requireFields(record, [
    "contractVersion",
    "messageType",
    "scope",
    "kind",
    "requestId",
    "commandId",
    "documentId",
    "ownerGeneration",
    "expectedWorkingRevision",
    "payload",
  ]);
  const common = parseCommonRequest(record, "command");
  if (
    record["kind"] !== setDisplayValueOverrideCommandId ||
    record["commandId"] !== setDisplayValueOverrideCommandId
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  if (!isWorkingRevision(record["expectedWorkingRevision"])) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  const payload = readRecord(record["payload"]);
  requireFields(payload, [
    "localOverrideIdentity",
    "targetSourceFieldIdentity",
    "expectedSourceValueDigest",
    "expectedSourceValueType",
    "expectedSourceUnit",
    "replacementContent",
    "replacementUnit",
    "reason",
    "authorIdentity",
    "recordedAtUtc",
  ]);
  if (!isSha256Digest(payload["expectedSourceValueDigest"])) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  const replacementContent = parseContentAxis(payload["replacementContent"]);
  const expectedSourceValueType = readValueType(payload["expectedSourceValueType"]);
  if (deriveValueType(replacementContent) !== expectedSourceValueType) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return Object.freeze({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: setDisplayValueOverrideCommandId,
    requestId: common.requestId,
    commandId: setDisplayValueOverrideCommandId,
    documentId: common.documentId,
    ownerGeneration: common.ownerGeneration,
    expectedWorkingRevision: record["expectedWorkingRevision"],
    payload: Object.freeze({
      localOverrideIdentity: readIdentity(payload["localOverrideIdentity"]),
      targetSourceFieldIdentity: readIdentity(payload["targetSourceFieldIdentity"]),
      expectedSourceValueDigest: payload["expectedSourceValueDigest"],
      expectedSourceValueType,
      expectedSourceUnit: parseUnitAxis(payload["expectedSourceUnit"]),
      replacementContent,
      replacementUnit: parseUnitAxis(payload["replacementUnit"]),
      reason: readCommandReason(payload["reason"]),
      authorIdentity:
        payload["authorIdentity"] === null ? null : readIdentity(payload["authorIdentity"]),
      recordedAtUtc: readTimestamp(payload["recordedAtUtc"]),
    }),
  });
}

function parseRevertCommand(record: DataRecord): RevertDisplayValueOverrideCommand {
  requireFields(record, [
    "contractVersion",
    "messageType",
    "scope",
    "kind",
    "requestId",
    "commandId",
    "documentId",
    "ownerGeneration",
    "expectedWorkingRevision",
    "payload",
  ]);
  const common = parseCommonRequest(record, "command");
  if (
    record["kind"] !== revertDisplayValueOverrideCommandId ||
    record["commandId"] !== revertDisplayValueOverrideCommandId
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  if (!isWorkingRevision(record["expectedWorkingRevision"])) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  const payload = readRecord(record["payload"]);
  requireFields(payload, [
    "localOverrideIdentity",
    "targetSourceFieldIdentity",
    "expectedOverrideRevision",
  ]);
  if (
    !Number.isSafeInteger(payload["expectedOverrideRevision"]) ||
    (payload["expectedOverrideRevision"] as number) < 1
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return Object.freeze({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: revertDisplayValueOverrideCommandId,
    requestId: common.requestId,
    commandId: revertDisplayValueOverrideCommandId,
    documentId: common.documentId,
    ownerGeneration: common.ownerGeneration,
    expectedWorkingRevision: record["expectedWorkingRevision"],
    payload: Object.freeze({
      localOverrideIdentity: readIdentity(payload["localOverrideIdentity"]),
      targetSourceFieldIdentity: readIdentity(payload["targetSourceFieldIdentity"]),
      expectedOverrideRevision: payload["expectedOverrideRevision"] as number,
    }),
  });
}

function parseNavigationCommand(record: DataRecord): OverrideHistoryNavigationCommand {
  requireFields(record, [
    "contractVersion",
    "messageType",
    "scope",
    "kind",
    "requestId",
    "commandId",
    "documentId",
    "ownerGeneration",
    "expectedWorkingRevision",
    "payload",
  ]);
  const common = parseCommonRequest(record, "command");
  if (
    (record["kind"] !== "history.undo" && record["kind"] !== "history.redo") ||
    record["commandId"] !== record["kind"] ||
    record["payload"] !== null
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  if (!isWorkingRevision(record["expectedWorkingRevision"])) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return Object.freeze({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: record["kind"],
    requestId: common.requestId,
    commandId: record["kind"],
    documentId: common.documentId,
    ownerGeneration: common.ownerGeneration,
    expectedWorkingRevision: record["expectedWorkingRevision"],
    payload: null,
  });
}

function parseCommand(input: unknown): OverrideRenderDatasetCommand {
  const record = readRecord(input);
  const kind = record["kind"];
  if (kind === setDisplayValueOverrideCommandId) return parseSetCommand(record);
  if (kind === revertDisplayValueOverrideCommandId) return parseRevertCommand(record);
  if (kind === "history.undo" || kind === "history.redo") return parseNavigationCommand(record);
  return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
}

function parseQuery(input: unknown): OverrideRenderDatasetQuery {
  const record = readRecord(input);
  requireFields(record, [
    "contractVersion",
    "messageType",
    "scope",
    "kind",
    "requestId",
    "documentId",
    "ownerGeneration",
    "minimumWorkingRevision",
  ]);
  const common = parseCommonRequest(record, "query");
  if (record["kind"] !== overrideRenderDatasetQueryKind) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  if (
    record["minimumWorkingRevision"] !== null &&
    !isWorkingRevision(record["minimumWorkingRevision"])
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return Object.freeze({
    contractVersion: 1,
    messageType: "query",
    scope: "document-domain",
    kind: overrideRenderDatasetQueryKind,
    requestId: common.requestId,
    documentId: common.documentId,
    ownerGeneration: common.ownerGeneration,
    minimumWorkingRevision: record["minimumWorkingRevision"],
  });
}

function result<Value>(operation: () => Value): OverrideRenderDatasetContractResult<Value> {
  try {
    return Object.freeze({ accepted: true, value: operation() });
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code: error instanceof ContractFailure ? error.code : "OVERRIDE_RENDER_CONTRACT_MALFORMED",
    });
  }
}

function encoded<Value>(operation: () => Value): OverrideRenderDatasetEncodeResult<Value> {
  const decoded = result(operation);
  if (!decoded.accepted) return decoded;
  const canonicalJson = canonicalizeJson(decoded.value);
  return Object.freeze({
    accepted: true,
    value: decoded.value,
    canonicalJson,
    digest: sha256Utf8(canonicalJson),
  });
}

export function decodeOverrideRenderDatasetCommand(
  input: unknown,
): OverrideRenderDatasetContractResult<OverrideRenderDatasetCommand> {
  return result(() => parseCommand(input));
}

export function encodeOverrideRenderDatasetCommand(
  input: unknown,
): OverrideRenderDatasetEncodeResult<OverrideRenderDatasetCommand> {
  return encoded(() => parseCommand(input));
}

export function canonicalOverrideRenderDatasetCommand(input: unknown): string | null {
  const encodedCommand = encodeOverrideRenderDatasetCommand(input);
  return encodedCommand.accepted ? encodedCommand.canonicalJson : null;
}

export function decodeOverrideRenderDatasetQuery(
  input: unknown,
): OverrideRenderDatasetContractResult<OverrideRenderDatasetQuery> {
  return result(() => parseQuery(input));
}

export function encodeOverrideRenderDatasetQuery(
  input: unknown,
): OverrideRenderDatasetEncodeResult<OverrideRenderDatasetQuery> {
  return encoded(() => parseQuery(input));
}

function parseCanonicalJson(input: unknown): {
  readonly json: string;
  readonly value: CanonicalJsonValue;
} {
  const json = readText(input, true);
  try {
    const value = cloneJson(JSON.parse(json) as unknown);
    if (canonicalizeJson(value) !== json) return fail("OVERRIDE_RENDER_CONTRACT_MALFORMED");
    return Object.freeze({ json, value });
  } catch (error) {
    if (error instanceof ContractFailure) throw error;
    return fail("OVERRIDE_RENDER_CONTRACT_MALFORMED");
  }
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  try {
    return canonicalizeJson(left) === canonicalizeJson(right);
  } catch {
    return false;
  }
}

function domainValueBasisFromJson(input: unknown): CanonicalJsonValue {
  const record = readRecord(input);
  requireFields(record, [
    "recordVersion",
    "content",
    "association",
    "finality",
    "eligibility",
    "unit",
    "provenance",
  ]);
  if (record["recordVersion"] !== 1) return fail("OVERRIDE_RENDER_CONTRACT_UNSUPPORTED_VERSION");
  const content = parseContentAxis(record["content"]);
  const association = parseAssociationAxis(record["association"]);
  const finality = parseFinalityAxis(record["finality"]);
  const eligibility = parseEligibilityAxis(record["eligibility"]);
  const unit = parseUnitAxis(record["unit"]);
  const provenance = parseProvenanceAxis(record["provenance"]);
  validateEligibilityCombination(content, association, finality, eligibility, unit);
  return Object.freeze({ content, association, finality, eligibility, unit, provenance });
}

function parseDomainValueProjection(input: unknown): OverrideRenderDomainValueProjection {
  const record = readRecord(input);
  requireFields(record, [
    "valueType",
    "contentState",
    "content",
    "association",
    "finality",
    "eligibility",
    "unit",
    "provenance",
    "canonicalJson",
    "digest",
  ]);
  const content = parseContentAxis(record["content"]);
  const association = parseAssociationAxis(record["association"]);
  const finality = parseFinalityAxis(record["finality"]);
  const eligibility = parseEligibilityAxis(record["eligibility"]);
  const unit = parseUnitAxis(record["unit"]);
  const provenance = parseProvenanceAxis(record["provenance"]);
  const contentState = readText(record["contentState"]);
  if (
    typeof content !== "object" ||
    content === null ||
    Array.isArray(content) ||
    (content as Readonly<Record<string, CanonicalJsonValue>>)["kind"] !== contentState
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  const basis = Object.freeze({ content, association, finality, eligibility, unit, provenance });
  const canonicalJson = canonicalizeJson(basis);
  const digest = sha256Utf8(canonicalJson);
  if (record["canonicalJson"] !== canonicalJson || record["digest"] !== digest) {
    return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
  }
  const derivedValueType = deriveValueType(content);
  validateEligibilityCombination(content, association, finality, eligibility, unit);
  if (readValueType(record["valueType"]) !== derivedValueType) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return Object.freeze({
    valueType: derivedValueType,
    contentState: content.kind,
    ...basis,
    canonicalJson,
    digest,
  });
}

function parseDiagnosticFact(input: unknown): OverrideRenderDiagnosticFactProjection {
  const record = readRecord(input);
  requireFields(record, [
    "factVersion",
    "code",
    "category",
    "affected",
    "cause",
    "consequence",
    "input",
    "remediationActionIds",
    "diagnosticIdentity",
    "orderingKey",
  ]);
  if (record["factVersion"] !== 1) return fail("OVERRIDE_RENDER_CONTRACT_UNSUPPORTED_VERSION");
  const affectedRecord = readRecord(record["affected"]);
  const hasPath = Object.hasOwn(affectedRecord, "path");
  requireFields(
    affectedRecord,
    hasPath ? ["identityKind", "identity", "path"] : ["identityKind", "identity"],
  );
  const affected = Object.freeze({
    identityKind: readDiagnosticAtom(affectedRecord["identityKind"]),
    identity: readDiagnosticText(affectedRecord["identity"]),
    ...(hasPath ? { path: readDiagnosticText(affectedRecord["path"]) } : {}),
  });
  const causeRecord = readRecord(record["cause"]);
  requireFields(causeRecord, ["causeKey", "evidenceClass"]);
  const cause = Object.freeze({
    causeKey: readDiagnosticAtom(causeRecord["causeKey"]),
    evidenceClass: readDiagnosticAtom(causeRecord["evidenceClass"]),
  });
  const inputRecord = readRecord(record["input"]);
  requireFields(inputRecord, ["revision", "digest"]);
  if (!isSha256Digest(inputRecord["digest"])) return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  const factInput = Object.freeze({
    revision: readDiagnosticText(inputRecord["revision"]),
    digest: inputRecord["digest"],
  });
  const remediationActionIds = readArray(record["remediationActionIds"]).map((value) =>
    readDiagnosticAtom(value),
  );
  if (
    remediationActionIds.length < 1 ||
    new Set(remediationActionIds).size !== remediationActionIds.length
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_DUPLICATE_VALUE");
  }
  const sortedActions = [...remediationActionIds].sort(compareCodeUnits);
  if (remediationActionIds.some((value, index) => value !== sortedActions[index])) {
    return fail("OVERRIDE_RENDER_CONTRACT_ORDER_MISMATCH");
  }
  const draft = Object.freeze({
    factVersion: 1 as const,
    code: readDiagnosticAtom(record["code"]),
    category: readDiagnosticAtom(record["category"]),
    affected,
    cause,
    consequence: readDiagnosticAtom(record["consequence"]),
    input: factInput,
    remediationActionIds: Object.freeze(remediationActionIds),
  });
  if (
    !diagnosticCategories.includes(draft.category as (typeof diagnosticCategories)[number]) ||
    !diagnosticConsequences.includes(draft.consequence as (typeof diagnosticConsequences)[number])
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  const identityBasis = hasPath
    ? {
        schema: "rsrender.diagnostic-fact-identity.v1",
        code: draft.code,
        affected,
        causeKey: cause.causeKey,
        inputRevision: factInput.revision,
      }
    : {
        schema: "rsrender.diagnostic-fact-identity.v1",
        code: draft.code,
        affected: { identityKind: affected.identityKind, identity: affected.identity },
        causeKey: cause.causeKey,
        inputRevision: factInput.revision,
      };
  const diagnosticIdentity = sha256Utf8(canonicalizeJson(identityBasis));
  if (record["diagnosticIdentity"] !== diagnosticIdentity) {
    return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
  }
  const factContentDigest = sha256Utf8(canonicalizeJson(draft));
  const expectedOrdering = Object.freeze([
    draft.category,
    draft.code,
    affected.identityKind,
    affected.identity,
    affected.path ?? "",
    cause.causeKey,
    factInput.revision,
    factInput.digest,
    diagnosticIdentity,
    factContentDigest,
  ] as const);
  const ordering = readArray(record["orderingKey"]);
  if (
    ordering.length !== expectedOrdering.length ||
    ordering.some((value, index) => value !== expectedOrdering[index])
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_ORDER_MISMATCH");
  }
  return Object.freeze({ ...draft, diagnosticIdentity, orderingKey: expectedOrdering });
}

function parseValueProjection(input: unknown): OverrideRenderValueProjection {
  const record = readRecord(input);
  requireFields(record, [
    "sourceFieldIdentity",
    "sourceEntityIdentity",
    "fieldPath",
    "sourceBaselineValueDigest",
    "sourceOriginal",
    "effectiveDisplay",
    "application",
  ]);
  const application = readRecord(record["application"]);
  let normalizedApplication: OverrideRenderValueProjection["application"];
  if (application["kind"] === "source") {
    requireFields(application, ["kind"]);
    normalizedApplication = Object.freeze({ kind: "source" });
  } else if (application["kind"] === "display-value-override") {
    requireFields(application, ["kind", "presentationOverrideIdentity"]);
    normalizedApplication = Object.freeze({
      kind: "display-value-override",
      presentationOverrideIdentity: readIdentity(application["presentationOverrideIdentity"]),
    });
  } else return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  const fieldPath = readText(record["fieldPath"]);
  if (
    !/^(?:mapped|extension):\/[A-Za-z0-9][A-Za-z0-9._~-]*(?:\/[A-Za-z0-9][A-Za-z0-9._~-]*)*$/u.test(
      fieldPath,
    )
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  const sourceOriginal = parseDomainValueProjection(record["sourceOriginal"]);
  const sourceBaselineValueDigest = sha256Utf8(
    canonicalizeJson({
      schema: "rsrender.source-baseline-value.v1",
      content: sourceOriginal.content,
      association: sourceOriginal.association,
      finality: sourceOriginal.finality,
      eligibility: sourceOriginal.eligibility,
      unit: sourceOriginal.unit,
    }),
  );
  if (
    !isSha256Digest(record["sourceBaselineValueDigest"]) ||
    record["sourceBaselineValueDigest"] !== sourceBaselineValueDigest
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
  }
  return Object.freeze({
    sourceFieldIdentity: readIdentity(record["sourceFieldIdentity"]),
    sourceEntityIdentity: readIdentity(record["sourceEntityIdentity"]),
    fieldPath,
    sourceBaselineValueDigest,
    sourceOriginal,
    effectiveDisplay: parseDomainValueProjection(record["effectiveDisplay"]),
    application: normalizedApplication,
  });
}

function parseOverrideState(input: unknown): OverrideStateProjection {
  const record = readRecord(input);
  requireFields(record, [
    "presentationOverrideIdentity",
    "localOverrideIdentity",
    "targetSourceContextIdentity",
    "targetSourceEntityIdentity",
    "targetSourceFieldIdentity",
    "expectedSourceValueDigest",
    "expectedSourceValueType",
    "expectedSourceUnit",
    "replacementValue",
    "overrideRevision",
    "enabled",
    "reason",
    "authorIdentity",
    "recordedAtUtc",
  ]);
  if (
    !isSha256Digest(record["expectedSourceValueDigest"]) ||
    typeof record["enabled"] !== "boolean"
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  const overrideRevision = readNonnegativeInteger(record["overrideRevision"]);
  if (overrideRevision < 1) return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  return Object.freeze({
    presentationOverrideIdentity: readIdentity(record["presentationOverrideIdentity"]),
    localOverrideIdentity: readIdentity(record["localOverrideIdentity"]),
    targetSourceContextIdentity: readIdentity(record["targetSourceContextIdentity"]),
    targetSourceEntityIdentity: readIdentity(record["targetSourceEntityIdentity"]),
    targetSourceFieldIdentity: readIdentity(record["targetSourceFieldIdentity"]),
    expectedSourceValueDigest: record["expectedSourceValueDigest"],
    expectedSourceValueType: readValueType(record["expectedSourceValueType"]),
    expectedSourceUnit: parseUnitAxis(record["expectedSourceUnit"]),
    replacementValue: parseDomainValueProjection(record["replacementValue"]),
    overrideRevision,
    enabled: record["enabled"],
    reason: readText(record["reason"]),
    authorIdentity:
      record["authorIdentity"] === null ? null : readIdentity(record["authorIdentity"]),
    recordedAtUtc: readTimestamp(record["recordedAtUtc"]),
  });
}

const projectionFields = Object.freeze([
  "projectionVersion",
  "projectionKind",
  "projectionIdentity",
  "projectionDigest",
  "documentId",
  "ownerGeneration",
  "workingRevision",
  "durableRevision",
  "dirty",
  "canUndo",
  "canRedo",
  "eventSequence",
  "aggregateDigest",
  "sourceSnapshotIdentity",
  "sourceSnapshotLogicalDigest",
  "sourceSnapshotEncodingDigest",
  "sourceContextIdentity",
  "sourceProjectIdentity",
  "presentationOverrideState",
  "presentationOverrideProjectRevision",
  "presentationOverrideRevisionIdentity",
  "presentationOverrideContentDigest",
  "presentationOverrideCollectionIdentity",
  "presentationOverrideCollectionRevision",
  "presentationOverrideCollectionDigest",
  "presentationOverrideCollectionCanonicalJson",
  "presentationOverrideCollectionEncodingDigest",
  "datasetIdentity",
  "datasetLogicalDigest",
  "datasetCanonicalJson",
  "datasetEncodingDigest",
  "overrides",
  "values",
  "diagnosticFacts",
  "diagnosticFactsDigest",
] as const);

function projectionIdentityFor(digest: Sha256Digest): string {
  return readIdentity(
    `urn:rsrender:override-render-dataset-projection:${digest.slice("sha256:".length)}`,
  );
}

function parseProjection(input: unknown, derivedFields: boolean): OverrideRenderDatasetProjection {
  const record = readRecord(input);
  requireFields(
    record,
    derivedFields
      ? projectionFields
      : projectionFields.filter(
          (field) => field !== "projectionIdentity" && field !== "projectionDigest",
        ),
  );
  if (record["projectionVersion"] !== 1) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNSUPPORTED_VERSION");
  }
  if (record["projectionKind"] !== overrideRenderDatasetProjectionKind) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  if (
    !isOwnerGeneration(record["ownerGeneration"]) ||
    !isWorkingRevision(record["workingRevision"]) ||
    !isDurableRevision(record["durableRevision"]) ||
    !isEventSequence(record["eventSequence"]) ||
    typeof record["dirty"] !== "boolean" ||
    typeof record["canUndo"] !== "boolean" ||
    typeof record["canRedo"] !== "boolean"
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  for (const field of [
    "aggregateDigest",
    "sourceSnapshotLogicalDigest",
    "sourceSnapshotEncodingDigest",
    "presentationOverrideContentDigest",
    "datasetLogicalDigest",
    "datasetEncodingDigest",
    "diagnosticFactsDigest",
  ] as const) {
    if (!isSha256Digest(record[field])) return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  if (
    record["presentationOverrideState"] !== "empty" &&
    record["presentationOverrideState"] !== "current"
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  const projectRevision = readNonnegativeInteger(record["presentationOverrideProjectRevision"]);
  const collectionRevision =
    record["presentationOverrideCollectionRevision"] === null
      ? null
      : readNonnegativeInteger(record["presentationOverrideCollectionRevision"]);
  const collectionIdentity =
    record["presentationOverrideCollectionIdentity"] === null
      ? null
      : readIdentity(record["presentationOverrideCollectionIdentity"]);
  const collectionDigest =
    record["presentationOverrideCollectionDigest"] === null
      ? null
      : isSha256Digest(record["presentationOverrideCollectionDigest"])
        ? record["presentationOverrideCollectionDigest"]
        : fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  const collectionCanonical =
    record["presentationOverrideCollectionCanonicalJson"] === null
      ? null
      : parseCanonicalJson(record["presentationOverrideCollectionCanonicalJson"]);
  const collectionEncodingDigest =
    record["presentationOverrideCollectionEncodingDigest"] === null
      ? null
      : isSha256Digest(record["presentationOverrideCollectionEncodingDigest"])
        ? record["presentationOverrideCollectionEncodingDigest"]
        : fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  if (
    (record["presentationOverrideState"] === "empty" &&
      (projectRevision !== 0 ||
        collectionRevision !== null ||
        collectionIdentity !== null ||
        collectionDigest !== null ||
        collectionCanonical !== null ||
        collectionEncodingDigest !== null)) ||
    (record["presentationOverrideState"] === "current" &&
      (projectRevision < 1 ||
        collectionRevision !== projectRevision ||
        collectionIdentity === null ||
        collectionDigest === null ||
        collectionCanonical === null ||
        collectionEncodingDigest === null))
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  const expectedPresentationRevisionDigest = sha256Utf8(
    canonicalizeJson({
      schema: "rsrender.project-input-revision-identity.v1",
      ownerDocumentIdentity: record["documentId"],
      collectionKind: "presentation-overrides",
      projectRevision,
    }),
  );
  const expectedPresentationRevisionIdentity = `urn:rsrender:project-input-revision:${expectedPresentationRevisionDigest.slice("sha256:".length)}`;
  const expectedPresentationContentDigest =
    record["presentationOverrideState"] === "empty"
      ? sha256Utf8(
          canonicalizeJson({
            schema: "rsrender.project-input-empty.v1",
            collectionKind: "presentation-overrides",
            items: [],
          }),
        )
      : collectionDigest;
  if (
    record["presentationOverrideRevisionIdentity"] !== expectedPresentationRevisionIdentity ||
    record["presentationOverrideContentDigest"] !== expectedPresentationContentDigest
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
  }
  const datasetCanonical = parseCanonicalJson(record["datasetCanonicalJson"]);
  if (record["datasetEncodingDigest"] !== sha256Utf8(datasetCanonical.json)) {
    return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
  }
  const overrides = readArray(record["overrides"]).map(parseOverrideState);
  if (overrides.length > maximumOverrideRenderDatasetProjectionOverrides) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  const values = readArray(record["values"]).map(parseValueProjection);
  if (new Set(values.map((value) => value.sourceFieldIdentity)).size !== values.length) {
    return fail("OVERRIDE_RENDER_CONTRACT_DUPLICATE_VALUE");
  }
  const sortedValues = [...values].sort((left, right) =>
    compareCodeUnits(left.sourceFieldIdentity, right.sourceFieldIdentity),
  );
  if (
    values.some(
      (value, index) => value.sourceFieldIdentity !== sortedValues[index]?.sourceFieldIdentity,
    )
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_ORDER_MISMATCH");
  }
  const diagnosticFacts = readArray(record["diagnosticFacts"]).map(parseDiagnosticFact);
  if (
    new Set(diagnosticFacts.map((fact) => fact.diagnosticIdentity)).size !== diagnosticFacts.length
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_DUPLICATE_VALUE");
  }
  const sortedFacts = [...diagnosticFacts].sort((left, right) =>
    compareStringTuples(left.orderingKey, right.orderingKey),
  );
  if (
    diagnosticFacts.some(
      (fact, index) => fact.diagnosticIdentity !== sortedFacts[index]?.diagnosticIdentity,
    )
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_ORDER_MISMATCH");
  }
  if (record["diagnosticFactsDigest"] !== sha256Utf8(canonicalizeJson(diagnosticFacts))) {
    return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
  }
  if (
    record["dirty"] !==
    (Number(record["workingRevision"]) !== Number(record["durableRevision"]))
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  if (
    (collectionCanonical === null) !== (collectionEncodingDigest === null) ||
    (collectionCanonical !== null &&
      collectionEncodingDigest !== sha256Utf8(collectionCanonical.json))
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
  }
  const dataset = readRecord(datasetCanonical.value);
  requireFields(dataset, [
    "datasetVersion",
    "datasetIdentity",
    "logicalDigest",
    "projectionContractVersion",
    "ownerDocumentIdentity",
    "sourceSnapshotIdentity",
    "sourceSnapshotLogicalDigest",
    "sourceSnapshotEncodingDigest",
    "sourceContextIdentity",
    "sourceProjectIdentity",
    "presentationOverrideState",
    "presentationOverrideProjectRevision",
    "presentationOverrideRevisionIdentity",
    "presentationOverrideContentDigest",
    "presentationOverrideCollectionIdentity",
    "presentationOverrideCollectionRevision",
    "presentationOverrideCollectionDigest",
    "supplementalSourcesEmptyRevisionIdentity",
    "supplementalSourcesEmptyContentDigest",
    "sourceResolutionDecisionsEmptyRevisionIdentity",
    "sourceResolutionDecisionsEmptyContentDigest",
    "sourceExtensionBindingsEmptyRevisionIdentity",
    "sourceExtensionBindingsEmptyContentDigest",
    "values",
    "diagnostics",
  ]);
  if (
    dataset["datasetVersion"] !== 1 ||
    dataset["projectionContractVersion"] !== "bld-017-bounded-override-render-dataset-v1" ||
    dataset["datasetIdentity"] !== record["datasetIdentity"] ||
    dataset["logicalDigest"] !== record["datasetLogicalDigest"] ||
    dataset["ownerDocumentIdentity"] !== record["documentId"] ||
    dataset["sourceSnapshotIdentity"] !== record["sourceSnapshotIdentity"] ||
    dataset["sourceSnapshotLogicalDigest"] !== record["sourceSnapshotLogicalDigest"] ||
    dataset["sourceSnapshotEncodingDigest"] !== record["sourceSnapshotEncodingDigest"] ||
    dataset["sourceContextIdentity"] !== record["sourceContextIdentity"] ||
    dataset["sourceProjectIdentity"] !== record["sourceProjectIdentity"] ||
    dataset["presentationOverrideState"] !== record["presentationOverrideState"] ||
    dataset["presentationOverrideProjectRevision"] !== projectRevision ||
    dataset["presentationOverrideRevisionIdentity"] !==
      record["presentationOverrideRevisionIdentity"] ||
    dataset["presentationOverrideContentDigest"] !== record["presentationOverrideContentDigest"] ||
    dataset["presentationOverrideCollectionIdentity"] !== collectionIdentity ||
    dataset["presentationOverrideCollectionRevision"] !== collectionRevision ||
    dataset["presentationOverrideCollectionDigest"] !== collectionDigest ||
    !canonicalEqual(dataset["diagnostics"], diagnosticFacts)
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
  }
  const datasetBody: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const [key, value] of Object.entries(dataset)) {
    if (key !== "datasetIdentity" && key !== "logicalDigest") datasetBody[key] = value;
  }
  const expectedDatasetDigest = sha256Utf8(canonicalizeJson(datasetBody));
  const expectedDatasetIdentity = `urn:rsrender:bounded-override-render-dataset:${expectedDatasetDigest.slice("sha256:".length)}`;
  if (
    dataset["logicalDigest"] !== expectedDatasetDigest ||
    dataset["datasetIdentity"] !== expectedDatasetIdentity
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
  }
  const datasetValues = readArray(dataset["values"]);
  if (datasetValues.length !== values.length) return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  for (let index = 0; index < datasetValues.length; index += 1) {
    const rawValue = readRecord(datasetValues[index]);
    requireFields(rawValue, [
      "sourceFieldIdentity",
      "sourceEntityIdentity",
      "fieldPath",
      "sourceOriginalValue",
      "effectiveDisplayValue",
      "application",
    ]);
    const value = values[index];
    if (
      value === undefined ||
      rawValue["sourceFieldIdentity"] !== value.sourceFieldIdentity ||
      rawValue["sourceEntityIdentity"] !== value.sourceEntityIdentity ||
      rawValue["fieldPath"] !== value.fieldPath ||
      value.sourceOriginal.canonicalJson !==
        canonicalizeJson(domainValueBasisFromJson(rawValue["sourceOriginalValue"])) ||
      value.sourceBaselineValueDigest !==
        sha256Utf8(
          canonicalizeJson({
            schema: "rsrender.source-baseline-value.v1",
            content: value.sourceOriginal.content,
            association: value.sourceOriginal.association,
            finality: value.sourceOriginal.finality,
            eligibility: value.sourceOriginal.eligibility,
            unit: value.sourceOriginal.unit,
          }),
        ) ||
      value.effectiveDisplay.canonicalJson !==
        canonicalizeJson(domainValueBasisFromJson(rawValue["effectiveDisplayValue"])) ||
      !canonicalEqual(rawValue["application"], value.application)
    ) {
      return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
    }
  }
  if (collectionCanonical === null) {
    if (overrides.length !== 0) return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  } else {
    const collection = readRecord(collectionCanonical.value);
    requireFields(collection, [
      "collectionVersion",
      "collectionIdentity",
      "ownerDocumentIdentity",
      "projectRevision",
      "revisionIdentity",
      "logicalDigest",
      "items",
    ]);
    if (
      collection["collectionVersion"] !== 1 ||
      collection["collectionIdentity"] !== collectionIdentity ||
      collection["ownerDocumentIdentity"] !== record["documentId"] ||
      collection["projectRevision"] !== collectionRevision ||
      collection["revisionIdentity"] !== record["presentationOverrideRevisionIdentity"] ||
      collection["logicalDigest"] !== collectionDigest ||
      collection["logicalDigest"] !== record["presentationOverrideContentDigest"]
    ) {
      return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
    }
    const items = readArray(collection["items"]);
    if (items.length !== overrides.length) return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
    for (let index = 0; index < items.length; index += 1) {
      const item = readRecord(items[index]);
      requireFields(item, [
        "overrideVersion",
        "presentationOverrideIdentity",
        "ownerDocumentIdentity",
        "localOverrideIdentity",
        "targetSourceContextIdentity",
        "targetSourceEntityIdentity",
        "targetSourceFieldIdentity",
        "expectedSourceValueDigest",
        "expectedSourceValueType",
        "expectedSourceUnit",
        "replacementValue",
        "overrideRevision",
        "enabled",
        "reason",
        "authorIdentity",
        "recordedAtUtc",
      ]);
      const projected = overrides[index];
      const expectedItemIdentityDigest = sha256Utf8(
        canonicalizeJson({
          schema: "rsrender.presentation-override-identity.v1",
          ownerDocumentIdentity: record["documentId"],
          localOverrideIdentity: item["localOverrideIdentity"],
        }),
      );
      const expectedItemIdentity = `urn:rsrender:presentation-override:${expectedItemIdentityDigest.slice("sha256:".length)}`;
      if (
        projected === undefined ||
        item["overrideVersion"] !== 1 ||
        item["ownerDocumentIdentity"] !== record["documentId"] ||
        item["presentationOverrideIdentity"] !== expectedItemIdentity ||
        item["presentationOverrideIdentity"] !== projected.presentationOverrideIdentity ||
        item["localOverrideIdentity"] !== projected.localOverrideIdentity ||
        item["targetSourceContextIdentity"] !== projected.targetSourceContextIdentity ||
        item["targetSourceEntityIdentity"] !== projected.targetSourceEntityIdentity ||
        item["targetSourceFieldIdentity"] !== projected.targetSourceFieldIdentity ||
        item["expectedSourceValueDigest"] !== projected.expectedSourceValueDigest ||
        item["expectedSourceValueType"] !== projected.expectedSourceValueType ||
        !canonicalEqual(item["expectedSourceUnit"], projected.expectedSourceUnit) ||
        projected.replacementValue.canonicalJson !==
          canonicalizeJson(domainValueBasisFromJson(item["replacementValue"])) ||
        item["overrideRevision"] !== projected.overrideRevision ||
        item["enabled"] !== projected.enabled ||
        item["reason"] !== projected.reason ||
        item["authorIdentity"] !== projected.authorIdentity ||
        item["recordedAtUtc"] !== projected.recordedAtUtc
      ) {
        return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
      }
    }
    const expectedCollectionIdentityDigest = sha256Utf8(
      canonicalizeJson({
        schema: "rsrender.presentation-override-collection-identity.v1",
        ownerDocumentIdentity: record["documentId"],
      }),
    );
    const expectedCollectionIdentity = `urn:rsrender:presentation-override-collection:${expectedCollectionIdentityDigest.slice("sha256:".length)}`;
    const expectedRevisionIdentityDigest = sha256Utf8(
      canonicalizeJson({
        schema: "rsrender.project-input-revision-identity.v1",
        ownerDocumentIdentity: record["documentId"],
        collectionKind: "presentation-overrides",
        projectRevision: collectionRevision,
      }),
    );
    const expectedRevisionIdentity = `urn:rsrender:project-input-revision:${expectedRevisionIdentityDigest.slice("sha256:".length)}`;
    const expectedCollectionDigest = sha256Utf8(
      canonicalizeJson({
        schema: "bld-017-presentation-override-collection-v1",
        ownerDocumentIdentity: record["documentId"],
        projectRevision: collectionRevision,
        items,
      }),
    );
    if (
      collectionIdentity !== expectedCollectionIdentity ||
      record["presentationOverrideRevisionIdentity"] !== expectedRevisionIdentity ||
      collectionDigest !== expectedCollectionDigest
    ) {
      return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
    }
  }
  for (let index = 0; index < datasetValues.length; index += 1) {
    const raw = readRecord(datasetValues[index]);
    const value = values[index] as OverrideRenderValueProjection;
    const application = readRecord(raw["application"]);
    const sourceProvenance = readRecord(value.sourceOriginal.provenance);
    if (
      sourceProvenance["provenanceClass"] !== "source" ||
      sourceProvenance["sourceContextIdentity"] !== record["sourceContextIdentity"] ||
      sourceProvenance["entityIdentity"] !== value.sourceEntityIdentity ||
      sourceProvenance["fieldIdentity"] !== value.sourceFieldIdentity
    ) {
      return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
    }
    if (application["kind"] === "source") {
      requireFields(application, ["kind"]);
      if (value.sourceOriginal.canonicalJson !== value.effectiveDisplay.canonicalJson) {
        return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
      }
    } else if (application["kind"] === "display-value-override") {
      requireFields(application, ["kind", "presentationOverrideIdentity"]);
      const matching = overrides.find(
        (override) =>
          override.presentationOverrideIdentity === application["presentationOverrideIdentity"],
      );
      if (
        matching === undefined ||
        !matching.enabled ||
        matching.targetSourceFieldIdentity !== value.sourceFieldIdentity ||
        matching.replacementValue.canonicalJson !== value.effectiveDisplay.canonicalJson
      ) {
        return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
      }
    } else return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  const body: OverrideRenderDatasetProjectionDraft = Object.freeze({
    projectionVersion: 1,
    projectionKind: overrideRenderDatasetProjectionKind,
    documentId: readIdentity(record["documentId"]),
    ownerGeneration: record["ownerGeneration"],
    workingRevision: record["workingRevision"],
    durableRevision: record["durableRevision"],
    dirty: record["dirty"],
    canUndo: record["canUndo"],
    canRedo: record["canRedo"],
    eventSequence: record["eventSequence"],
    aggregateDigest: record["aggregateDigest"] as Sha256Digest,
    sourceSnapshotIdentity: readIdentity(record["sourceSnapshotIdentity"]),
    sourceSnapshotLogicalDigest: record["sourceSnapshotLogicalDigest"] as Sha256Digest,
    sourceSnapshotEncodingDigest: record["sourceSnapshotEncodingDigest"] as Sha256Digest,
    sourceContextIdentity: readIdentity(record["sourceContextIdentity"]),
    sourceProjectIdentity: readIdentity(record["sourceProjectIdentity"]),
    presentationOverrideState: record["presentationOverrideState"],
    presentationOverrideProjectRevision: projectRevision,
    presentationOverrideRevisionIdentity: readIdentity(
      record["presentationOverrideRevisionIdentity"],
    ),
    presentationOverrideContentDigest: record["presentationOverrideContentDigest"] as Sha256Digest,
    presentationOverrideCollectionIdentity: collectionIdentity,
    presentationOverrideCollectionRevision: collectionRevision,
    presentationOverrideCollectionDigest: collectionDigest,
    presentationOverrideCollectionCanonicalJson: collectionCanonical?.json ?? null,
    presentationOverrideCollectionEncodingDigest: collectionEncodingDigest,
    datasetIdentity: readIdentity(record["datasetIdentity"]),
    datasetLogicalDigest: record["datasetLogicalDigest"] as Sha256Digest,
    datasetCanonicalJson: datasetCanonical.json,
    datasetEncodingDigest: record["datasetEncodingDigest"] as Sha256Digest,
    overrides: Object.freeze(overrides),
    values: Object.freeze(values),
    diagnosticFacts: Object.freeze(diagnosticFacts),
    diagnosticFactsDigest: record["diagnosticFactsDigest"] as Sha256Digest,
  });
  const projectionDigest = sha256Utf8(canonicalizeJson(body));
  const projectionIdentity = projectionIdentityFor(projectionDigest);
  if (
    derivedFields &&
    (record["projectionDigest"] !== projectionDigest ||
      record["projectionIdentity"] !== projectionIdentity)
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_DIGEST_MISMATCH");
  }
  return Object.freeze({
    ...body,
    projectionIdentity,
    projectionDigest,
  });
}

const rejectionReasons = Object.freeze([
  "CAPACITY_EXHAUSTED",
  "CONTRACT_MALFORMED",
  "CONTRACT_UNSUPPORTED_VERSION",
  "DOCUMENT_IDENTITY_MISMATCH",
  "DOMAIN_PRECONDITION_FAILED",
  "INTERNAL_STATE_INVALID",
  "INVALID_BASELINE",
  "INVALID_RATIONALE",
  "INVALID_UNIT",
  "INVALID_VALUE_TYPE",
  "MINIMUM_WORKING_REVISION_UNAVAILABLE",
  "NOTHING_TO_REDO",
  "NOTHING_TO_UNDO",
  "OWNER_GENERATION_MISMATCH",
  "PROJECTION_ASSEMBLY_FAILED",
  "REQUEST_ID_REUSE_MISMATCH",
  "STALE_WORKING_REVISION",
  "TARGET_NOT_FOUND",
  "UNKNOWN_COMMAND",
  "UNKNOWN_QUERY",
  "UNSUPPORTED_CURRENT_INPUT",
] as const);

function parseRejectedResult(
  input: unknown,
  expectedMessageType: "command-result" | "query-result",
): OverrideRenderDatasetRejectedResult {
  const record = readRecord(input);
  requireFields(record, [
    "contractVersion",
    "messageType",
    "kind",
    "requestId",
    "reason",
    "changed",
    "safeActions",
  ]);
  if (record["contractVersion"] !== 1) return fail("OVERRIDE_RENDER_CONTRACT_UNSUPPORTED_VERSION");
  if (
    record["messageType"] !== expectedMessageType ||
    record["kind"] !== "override-render-dataset.rejected" ||
    record["changed"] !== false ||
    readArray(record["safeActions"]).length !== 0 ||
    !rejectionReasons.includes(record["reason"] as OverrideRenderDatasetRejectionReason)
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  return Object.freeze({
    contractVersion: 1,
    messageType: expectedMessageType,
    kind: "override-render-dataset.rejected",
    requestId: record["requestId"] === null ? null : readRequestIdentity(record["requestId"]),
    reason: record["reason"] as OverrideRenderDatasetRejectionReason,
    changed: false,
    safeActions: Object.freeze([] as const),
  });
}

function readCommandId(input: unknown): OverrideRenderDatasetCommandId {
  if (
    input !== setDisplayValueOverrideCommandId &&
    input !== revertDisplayValueOverrideCommandId &&
    input !== "history.undo" &&
    input !== "history.redo"
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  return input;
}

function readOperation(input: unknown): HistoryOperation {
  if (input !== "mutation" && input !== "undo" && input !== "redo") {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  return input;
}

function parseEvent(input: unknown): OverrideRenderDatasetEvent {
  const record = readRecord(input);
  requireFields(record, [
    "contractVersion",
    "messageType",
    "kind",
    "sourceRequestId",
    "commandId",
    "operation",
    "documentId",
    "ownerGeneration",
    "eventSequence",
    "baseWorkingRevision",
    "resultingWorkingRevision",
    "historyEntryIdentity",
    "beforeAggregateDigest",
    "afterAggregateDigest",
    "projection",
  ]);
  if (record["contractVersion"] !== 1) return fail("OVERRIDE_RENDER_CONTRACT_UNSUPPORTED_VERSION");
  if (record["messageType"] !== "event" || record["kind"] !== overrideRenderDatasetEventKind) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  if (
    !isOwnerGeneration(record["ownerGeneration"]) ||
    !isEventSequence(record["eventSequence"]) ||
    !isWorkingRevision(record["baseWorkingRevision"]) ||
    !isWorkingRevision(record["resultingWorkingRevision"]) ||
    record["resultingWorkingRevision"] !== record["baseWorkingRevision"] + 1 ||
    !historyEntryIdentityCodec.is(record["historyEntryIdentity"]) ||
    !isSha256Digest(record["beforeAggregateDigest"]) ||
    !isSha256Digest(record["afterAggregateDigest"])
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  const projection = parseProjection(record["projection"], true);
  const documentId = readIdentity(record["documentId"]);
  const commandId = readCommandId(record["commandId"]);
  const operation = readOperation(record["operation"]);
  if (
    (commandId === setDisplayValueOverrideCommandId && operation !== "mutation") ||
    (commandId === revertDisplayValueOverrideCommandId && operation !== "mutation") ||
    (commandId === "history.undo" && operation !== "undo") ||
    (commandId === "history.redo" && operation !== "redo") ||
    projection.documentId !== documentId ||
    projection.ownerGeneration !== record["ownerGeneration"] ||
    projection.workingRevision !== record["resultingWorkingRevision"] ||
    projection.eventSequence !== record["eventSequence"] ||
    projection.aggregateDigest !== record["afterAggregateDigest"]
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return Object.freeze({
    contractVersion: 1,
    messageType: "event",
    kind: overrideRenderDatasetEventKind,
    sourceRequestId: readRequestIdentity(record["sourceRequestId"]),
    commandId,
    operation,
    documentId,
    ownerGeneration: record["ownerGeneration"],
    eventSequence: record["eventSequence"],
    baseWorkingRevision: record["baseWorkingRevision"],
    resultingWorkingRevision: record["resultingWorkingRevision"],
    historyEntryIdentity: record["historyEntryIdentity"],
    beforeAggregateDigest: record["beforeAggregateDigest"],
    afterAggregateDigest: record["afterAggregateDigest"],
    projection,
  });
}

function parseCommittedResult(input: unknown): OverrideRenderDatasetCommittedResult {
  const record = readRecord(input);
  requireFields(record, [
    "contractVersion",
    "messageType",
    "kind",
    "requestId",
    "commandId",
    "operation",
    "documentId",
    "ownerGeneration",
    "previousWorkingRevision",
    "workingRevision",
    "durableRevision",
    "historyEntryIdentity",
    "aggregateDigest",
    "dirty",
    "canUndo",
    "canRedo",
    "eventSequence",
    "projection",
    "event",
    "changed",
  ]);
  if (record["contractVersion"] !== 1) return fail("OVERRIDE_RENDER_CONTRACT_UNSUPPORTED_VERSION");
  if (
    record["messageType"] !== "command-result" ||
    record["kind"] !== "override-render-dataset.committed" ||
    record["changed"] !== true ||
    !isOwnerGeneration(record["ownerGeneration"]) ||
    !isWorkingRevision(record["previousWorkingRevision"]) ||
    !isWorkingRevision(record["workingRevision"]) ||
    record["workingRevision"] !== record["previousWorkingRevision"] + 1 ||
    !isDurableRevision(record["durableRevision"]) ||
    !historyEntryIdentityCodec.is(record["historyEntryIdentity"]) ||
    !isSha256Digest(record["aggregateDigest"]) ||
    typeof record["dirty"] !== "boolean" ||
    typeof record["canUndo"] !== "boolean" ||
    typeof record["canRedo"] !== "boolean" ||
    !isEventSequence(record["eventSequence"])
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  const projection = parseProjection(record["projection"], true);
  const event = parseEvent(record["event"]);
  const requestId = readRequestIdentity(record["requestId"]);
  const commandId = readCommandId(record["commandId"]);
  const operation = readOperation(record["operation"]);
  const documentId = readIdentity(record["documentId"]);
  if (
    (commandId === setDisplayValueOverrideCommandId && operation !== "mutation") ||
    (commandId === revertDisplayValueOverrideCommandId && operation !== "mutation") ||
    (commandId === "history.undo" && operation !== "undo") ||
    (commandId === "history.redo" && operation !== "redo") ||
    projection.documentId !== documentId ||
    projection.workingRevision !== record["workingRevision"] ||
    projection.ownerGeneration !== record["ownerGeneration"] ||
    projection.durableRevision !== record["durableRevision"] ||
    projection.dirty !== record["dirty"] ||
    projection.canUndo !== record["canUndo"] ||
    projection.canRedo !== record["canRedo"] ||
    projection.eventSequence !== record["eventSequence"] ||
    projection.aggregateDigest !== record["aggregateDigest"] ||
    record["dirty"] !== (Number(record["workingRevision"]) !== Number(record["durableRevision"])) ||
    event.sourceRequestId !== requestId ||
    event.commandId !== commandId ||
    event.operation !== operation ||
    event.historyEntryIdentity !== record["historyEntryIdentity"] ||
    event.documentId !== documentId ||
    event.ownerGeneration !== record["ownerGeneration"] ||
    event.baseWorkingRevision !== record["previousWorkingRevision"] ||
    event.resultingWorkingRevision !== record["workingRevision"] ||
    event.eventSequence !== record["eventSequence"] ||
    event.afterAggregateDigest !== record["aggregateDigest"] ||
    canonicalizeJson(event.projection) !== canonicalizeJson(projection)
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return Object.freeze({
    contractVersion: 1,
    messageType: "command-result",
    kind: "override-render-dataset.committed",
    requestId,
    commandId,
    operation,
    documentId,
    ownerGeneration: record["ownerGeneration"],
    previousWorkingRevision: record["previousWorkingRevision"],
    workingRevision: record["workingRevision"],
    durableRevision: record["durableRevision"],
    historyEntryIdentity: record["historyEntryIdentity"],
    aggregateDigest: record["aggregateDigest"],
    dirty: record["dirty"],
    canUndo: record["canUndo"],
    canRedo: record["canRedo"],
    eventSequence: record["eventSequence"],
    projection,
    event,
    changed: true,
  });
}

function parseProjectionResult(input: unknown): OverrideRenderDatasetProjectionResult {
  const record = readRecord(input);
  requireFields(record, [
    "contractVersion",
    "messageType",
    "kind",
    "requestId",
    "documentId",
    "ownerGeneration",
    "workingRevision",
    "durableRevision",
    "dirty",
    "canUndo",
    "canRedo",
    "eventSequence",
    "projection",
  ]);
  if (record["contractVersion"] !== 1) return fail("OVERRIDE_RENDER_CONTRACT_UNSUPPORTED_VERSION");
  if (
    record["messageType"] !== "query-result" ||
    record["kind"] !== "render-dataset.projection.result" ||
    !isOwnerGeneration(record["ownerGeneration"]) ||
    !isWorkingRevision(record["workingRevision"]) ||
    !isDurableRevision(record["durableRevision"]) ||
    !isEventSequence(record["eventSequence"]) ||
    typeof record["dirty"] !== "boolean" ||
    typeof record["canUndo"] !== "boolean" ||
    typeof record["canRedo"] !== "boolean"
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_UNKNOWN_TAG");
  }
  const projection = parseProjection(record["projection"], true);
  const documentId = readIdentity(record["documentId"]);
  if (
    projection.documentId !== documentId ||
    projection.ownerGeneration !== record["ownerGeneration"] ||
    projection.workingRevision !== record["workingRevision"] ||
    projection.durableRevision !== record["durableRevision"] ||
    projection.dirty !== record["dirty"] ||
    projection.canUndo !== record["canUndo"] ||
    projection.canRedo !== record["canRedo"] ||
    projection.eventSequence !== record["eventSequence"] ||
    record["dirty"] !== (Number(record["workingRevision"]) !== Number(record["durableRevision"]))
  ) {
    return fail("OVERRIDE_RENDER_CONTRACT_WRONG_TYPE");
  }
  return Object.freeze({
    contractVersion: 1,
    messageType: "query-result",
    kind: "render-dataset.projection.result",
    requestId: readRequestIdentity(record["requestId"]),
    documentId,
    ownerGeneration: record["ownerGeneration"],
    workingRevision: record["workingRevision"],
    durableRevision: record["durableRevision"],
    dirty: record["dirty"],
    canUndo: record["canUndo"],
    canRedo: record["canRedo"],
    eventSequence: record["eventSequence"],
    projection,
  });
}

export function createOverrideRenderDatasetProjection(
  input: unknown,
): OverrideRenderDatasetContractResult<OverrideRenderDatasetProjection> {
  return result(() => parseProjection(input, false));
}

export function decodeOverrideRenderDatasetProjection(
  input: unknown,
): OverrideRenderDatasetContractResult<OverrideRenderDatasetProjection> {
  return result(() => parseProjection(input, true));
}

export function encodeOverrideRenderDatasetProjection(
  input: unknown,
): OverrideRenderDatasetEncodeResult<OverrideRenderDatasetProjection> {
  return encoded(() => parseProjection(input, true));
}

export function decodeOverrideRenderDatasetEvent(
  input: unknown,
): OverrideRenderDatasetContractResult<OverrideRenderDatasetEvent> {
  return result(() => parseEvent(input));
}

export function encodeOverrideRenderDatasetEvent(
  input: unknown,
): OverrideRenderDatasetEncodeResult<OverrideRenderDatasetEvent> {
  return encoded(() => parseEvent(input));
}

export function decodeOverrideRenderDatasetCommandResult(
  input: unknown,
): OverrideRenderDatasetContractResult<OverrideRenderDatasetCommandResult> {
  return result(() => {
    const record = readRecord(input);
    return record["kind"] === "override-render-dataset.rejected"
      ? parseRejectedResult(record, "command-result")
      : parseCommittedResult(record);
  });
}

export function encodeOverrideRenderDatasetCommandResult(
  input: unknown,
): OverrideRenderDatasetEncodeResult<OverrideRenderDatasetCommandResult> {
  return encoded(() => {
    const record = readRecord(input);
    return record["kind"] === "override-render-dataset.rejected"
      ? parseRejectedResult(record, "command-result")
      : parseCommittedResult(record);
  });
}

export function decodeOverrideRenderDatasetQueryResult(
  input: unknown,
): OverrideRenderDatasetContractResult<OverrideRenderDatasetQueryResult> {
  return result(() => {
    const record = readRecord(input);
    return record["kind"] === "override-render-dataset.rejected"
      ? parseRejectedResult(record, "query-result")
      : parseProjectionResult(record);
  });
}

export function encodeOverrideRenderDatasetQueryResult(
  input: unknown,
): OverrideRenderDatasetEncodeResult<OverrideRenderDatasetQueryResult> {
  return encoded(() => {
    const record = readRecord(input);
    return record["kind"] === "override-render-dataset.rejected"
      ? parseRejectedResult(record, "query-result")
      : parseProjectionResult(record);
  });
}
