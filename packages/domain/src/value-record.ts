/** Adapter-neutral domain contract for orthogonal value and provenance state. */
export const domainValueRecordVersion = 1 as const;

export type DomainValueRejectionCode =
  | "DOMAIN_VALUE_MALFORMED"
  | "DOMAIN_VALUE_MISSING_FIELD"
  | "DOMAIN_VALUE_EXTRA_FIELD"
  | "DOMAIN_VALUE_WRONG_TYPE"
  | "DOMAIN_VALUE_UNKNOWN_TAG"
  | "DOMAIN_VALUE_UNSUPPORTED_VERSION"
  | "DOMAIN_VALUE_INVALID_COMBINATION";

export type ContentState =
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
      readonly rawDigest: string;
    };

export type AssociationState =
  | { readonly state: "resolved"; readonly targetIdentity: string }
  | { readonly state: "unmatched" }
  | { readonly state: "ambiguous"; readonly candidateTargetIdentities: readonly string[] }
  | { readonly state: "not-applicable" };

export type FinalityState =
  | { readonly state: "final" }
  | { readonly state: "nonfinal" }
  | { readonly state: "unknown" }
  | { readonly state: "not-applicable" };

export type EligibilityReasonCode =
  | "content"
  | "association"
  | "finality"
  | "unit"
  | "relationship"
  | "duplicate"
  | "rights"
  | "policy";

export type EligibilityResult =
  | { readonly state: "eligible"; readonly reasonCodes: readonly [] }
  | {
      readonly state: "blocked" | "metadata-only";
      readonly reasonCodes: readonly EligibilityReasonCode[];
    };

export type UnitState =
  | { readonly state: "not-applicable" }
  | { readonly state: "specified"; readonly quantity: string; readonly symbol: string }
  | { readonly state: "unsupported"; readonly originalUnit: string };

export type ProvenanceTransformation =
  | { readonly kind: "mapping"; readonly ruleId: string; readonly ruleVersion: number }
  | {
      readonly kind: "unit-conversion";
      readonly ruleId: string;
      readonly ruleVersion: number;
      readonly unitBefore: string;
      readonly unitAfter: string;
      readonly roundingMode: string;
    };

type ProvenanceBasis = {
  readonly basisCodes: readonly string[];
  readonly transformations: readonly ProvenanceTransformation[];
};

export type ValueProvenance =
  | (ProvenanceBasis & {
      readonly provenanceClass: "source";
      readonly sourceContextIdentity: string;
      readonly entityIdentity: string;
      readonly fieldIdentity: string;
      readonly adapterId: string;
      readonly adapterContractVersion: number;
      readonly retrievedAtUtc: string;
      readonly mappingRuleId: string;
      readonly mappingRuleVersion: number;
    })
  | (ProvenanceBasis & {
      readonly provenanceClass: "supplemental";
      readonly supplementalSourceIdentity: string;
      readonly supplementalRecordIdentity: string;
      readonly inputArtifactDigest: string;
      readonly parserId: string;
      readonly parserContractVersion: number;
      readonly attachedAtUtc: string;
      readonly mappingRuleId: string;
      readonly mappingRuleVersion: number;
    })
  | (ProvenanceBasis & {
      readonly provenanceClass: "override";
      readonly presentationOverrideIdentity: string;
      readonly sourceFieldIdentity: string;
      readonly expectedSourceValueDigest: string;
      readonly overrideRevision: number;
      readonly recordedAtUtc: string;
    })
  | (ProvenanceBasis & {
      readonly provenanceClass: "resolution";
      readonly sourceResolutionDecisionIdentity: string;
      readonly conflictIdentity: string;
      readonly competingInputRevisionDigests: readonly string[];
      readonly decisionRevision: number;
      readonly recordedAtUtc: string;
    })
  | (ProvenanceBasis & {
      readonly provenanceClass: "derived";
      readonly derivationRuleId: string;
      readonly derivationRuleVersion: number;
      readonly inputProvenanceDigests: readonly string[];
      readonly recordedAtUtc: string;
    });

export interface DomainValueRecord {
  readonly recordVersion: 1;
  readonly content: ContentState;
  readonly association: AssociationState;
  readonly finality: FinalityState;
  readonly eligibility: EligibilityResult;
  readonly unit: UnitState;
  readonly provenance: ValueProvenance;
}

export type DomainValueDecodeResult =
  | { readonly accepted: true; readonly value: DomainValueRecord }
  | { readonly accepted: false; readonly code: DomainValueRejectionCode };

export type DomainValueEncodeResult =
  | { readonly accepted: true; readonly json: string }
  | { readonly accepted: false; readonly code: DomainValueRejectionCode };

class ParseFailure extends Error {
  readonly code: DomainValueRejectionCode;

  constructor(code: DomainValueRejectionCode) {
    super(code);
    this.name = "ParseFailure";
    this.code = code;
  }
}

type DataRecord = Readonly<Record<string, unknown>>;

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const UTC_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const ELIGIBILITY_REASONS = new Set<EligibilityReasonCode>([
  "content",
  "association",
  "finality",
  "unit",
  "relationship",
  "duplicate",
  "rights",
  "policy",
]);

function fail(code: DomainValueRejectionCode): never {
  throw new ParseFailure(code);
}

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function readRecord(input: unknown): DataRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("DOMAIN_VALUE_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("DOMAIN_VALUE_MALFORMED");
  }
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return fail("DOMAIN_VALUE_EXTRA_FIELD");
    if (!isWellFormedUnicode(key)) return fail("DOMAIN_VALUE_MALFORMED");
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("DOMAIN_VALUE_MALFORMED");
    }
    result[key] = descriptor.value;
  }
  return result;
}

function requireFields(record: DataRecord, fields: readonly string[]): void {
  if (fields.some((field) => !Object.hasOwn(record, field))) {
    return fail("DOMAIN_VALUE_MISSING_FIELD");
  }
  if (Object.keys(record).some((field) => !fields.includes(field))) {
    return fail("DOMAIN_VALUE_EXTRA_FIELD");
  }
}

function readTag(record: DataRecord, field: string): string {
  const value = record[field];
  if (typeof value !== "string") return fail("DOMAIN_VALUE_WRONG_TYPE");
  return value;
}

function readText(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || !isWellFormedUnicode(value)) {
    return fail("DOMAIN_VALUE_WRONG_TYPE");
  }
  return value;
}

function readSafeInteger(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    Object.is(value, -0)
  ) {
    return fail("DOMAIN_VALUE_WRONG_TYPE");
  }
  return value;
}

function readDigest(value: unknown): string {
  const digest = readText(value);
  if (!SHA256_PATTERN.test(digest)) return fail("DOMAIN_VALUE_WRONG_TYPE");
  return digest;
}

function readInstant(value: unknown): string {
  const instant = readText(value);
  let normalized: string;
  try {
    normalized = new Date(instant).toISOString();
  } catch {
    return fail("DOMAIN_VALUE_WRONG_TYPE");
  }
  if (!UTC_INSTANT_PATTERN.test(instant) || normalized !== instant) {
    return fail("DOMAIN_VALUE_WRONG_TYPE");
  }
  return instant;
}

function readArray(input: unknown): readonly unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
    return fail("DOMAIN_VALUE_WRONG_TYPE");
  }
  const allowed = new Set<string>(["length"]);
  const result: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const key = String(index);
    allowed.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("DOMAIN_VALUE_MALFORMED");
    }
    result.push(descriptor.value);
  }
  if (Reflect.ownKeys(input).some((key) => typeof key !== "string" || !allowed.has(key))) {
    return fail("DOMAIN_VALUE_EXTRA_FIELD");
  }
  return result;
}

function readTextArray(input: unknown, minimum: number): readonly string[] {
  const values = readArray(input).map(readText);
  if (values.length < minimum || new Set(values).size !== values.length) {
    return fail("DOMAIN_VALUE_INVALID_COMBINATION");
  }
  return Object.freeze(values);
}

function readDigestArray(input: unknown, minimum: number): readonly string[] {
  const values = readArray(input).map(readDigest);
  if (values.length < minimum || new Set(values).size !== values.length) {
    return fail("DOMAIN_VALUE_INVALID_COMBINATION");
  }
  return Object.freeze(values);
}

function parseContent(input: unknown): ContentState {
  const record = readRecord(input);
  if (!Object.hasOwn(record, "kind")) return fail("DOMAIN_VALUE_MISSING_FIELD");
  const kind = readTag(record, "kind");
  if (["absent", "null", "empty-string", "empty-collection"].includes(kind)) {
    requireFields(record, ["kind"]);
    return Object.freeze({ kind }) as ContentState;
  }
  if (kind === "zero") {
    requireFields(record, ["kind", "value", "originalRepresentation"]);
    if (!Object.is(record["value"], 0)) return fail("DOMAIN_VALUE_INVALID_COMBINATION");
    return Object.freeze({
      kind,
      value: 0 as const,
      originalRepresentation: readText(record["originalRepresentation"]),
    });
  }
  if (kind === "value") {
    requireFields(record, ["kind", "value", "originalRepresentation"]);
    const value = record["value"];
    if (!(
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value) && value !== 0) ||
      (typeof value === "string" && value.length > 0 && isWellFormedUnicode(value))
    )) {
      return fail("DOMAIN_VALUE_INVALID_COMBINATION");
    }
    return Object.freeze({
      kind,
      value,
      originalRepresentation: readText(record["originalRepresentation"]),
    });
  }
  if (kind === "not-available") {
    requireFields(record, ["kind", "statusCode"]);
    return Object.freeze({ kind, statusCode: readText(record["statusCode"]) });
  }
  if (kind === "not-permitted") {
    requireFields(record, ["kind", "denialCode"]);
    return Object.freeze({ kind, denialCode: readText(record["denialCode"]) });
  }
  if (kind === "malformed") {
    requireFields(record, ["kind", "safeRawRepresentation", "rawDigest"]);
    return Object.freeze({
      kind,
      safeRawRepresentation: readText(record["safeRawRepresentation"]),
      rawDigest: readDigest(record["rawDigest"]),
    });
  }
  return fail("DOMAIN_VALUE_UNKNOWN_TAG");
}

function parseAssociation(input: unknown): AssociationState {
  const record = readRecord(input);
  if (!Object.hasOwn(record, "state")) return fail("DOMAIN_VALUE_MISSING_FIELD");
  const state = readTag(record, "state");
  if (state === "resolved") {
    requireFields(record, ["state", "targetIdentity"]);
    return Object.freeze({ state, targetIdentity: readText(record["targetIdentity"]) });
  }
  if (state === "unmatched" || state === "not-applicable") {
    requireFields(record, ["state"]);
    return Object.freeze({ state });
  }
  if (state === "ambiguous") {
    requireFields(record, ["state", "candidateTargetIdentities"]);
    return Object.freeze({
      state,
      candidateTargetIdentities: readTextArray(record["candidateTargetIdentities"], 2),
    });
  }
  return fail("DOMAIN_VALUE_UNKNOWN_TAG");
}

function parseFinality(input: unknown): FinalityState {
  const record = readRecord(input);
  requireFields(record, ["state"]);
  const state = readTag(record, "state");
  if (!["final", "nonfinal", "unknown", "not-applicable"].includes(state)) {
    return fail("DOMAIN_VALUE_UNKNOWN_TAG");
  }
  return Object.freeze({ state }) as FinalityState;
}

function parseEligibility(input: unknown): EligibilityResult {
  const record = readRecord(input);
  requireFields(record, ["state", "reasonCodes"]);
  const state = readTag(record, "state");
  if (!["eligible", "blocked", "metadata-only"].includes(state)) {
    return fail("DOMAIN_VALUE_UNKNOWN_TAG");
  }
  const reasonCodes = readArray(record["reasonCodes"]).map((value) => {
    const reason = readText(value);
    if (!ELIGIBILITY_REASONS.has(reason as EligibilityReasonCode)) {
      return fail("DOMAIN_VALUE_UNKNOWN_TAG");
    }
    return reason as EligibilityReasonCode;
  });
  if (new Set(reasonCodes).size !== reasonCodes.length) {
    return fail("DOMAIN_VALUE_INVALID_COMBINATION");
  }
  if ((state === "eligible") !== (reasonCodes.length === 0)) {
    return fail("DOMAIN_VALUE_INVALID_COMBINATION");
  }
  return Object.freeze({ state, reasonCodes: Object.freeze(reasonCodes) }) as EligibilityResult;
}

function parseUnit(input: unknown): UnitState {
  const record = readRecord(input);
  if (!Object.hasOwn(record, "state")) return fail("DOMAIN_VALUE_MISSING_FIELD");
  const state = readTag(record, "state");
  if (state === "not-applicable") {
    requireFields(record, ["state"]);
    return Object.freeze({ state });
  }
  if (state === "specified") {
    requireFields(record, ["state", "quantity", "symbol"]);
    return Object.freeze({
      state,
      quantity: readText(record["quantity"]),
      symbol: readText(record["symbol"]),
    });
  }
  if (state === "unsupported") {
    requireFields(record, ["state", "originalUnit"]);
    return Object.freeze({ state, originalUnit: readText(record["originalUnit"]) });
  }
  return fail("DOMAIN_VALUE_UNKNOWN_TAG");
}

function parseTransformations(input: unknown): readonly ProvenanceTransformation[] {
  const transformations = readArray(input).map((item) => {
    const record = readRecord(item);
    if (!Object.hasOwn(record, "kind")) return fail("DOMAIN_VALUE_MISSING_FIELD");
    const kind = readTag(record, "kind");
    if (kind === "mapping") {
      requireFields(record, ["kind", "ruleId", "ruleVersion"]);
      return Object.freeze({
        kind,
        ruleId: readText(record["ruleId"]),
        ruleVersion: readSafeInteger(record["ruleVersion"]),
      });
    }
    if (kind === "unit-conversion") {
      requireFields(record, [
        "kind",
        "ruleId",
        "ruleVersion",
        "unitBefore",
        "unitAfter",
        "roundingMode",
      ]);
      return Object.freeze({
        kind,
        ruleId: readText(record["ruleId"]),
        ruleVersion: readSafeInteger(record["ruleVersion"]),
        unitBefore: readText(record["unitBefore"]),
        unitAfter: readText(record["unitAfter"]),
        roundingMode: readText(record["roundingMode"]),
      });
    }
    return fail("DOMAIN_VALUE_UNKNOWN_TAG");
  });
  return Object.freeze(transformations);
}

function parseProvenanceBasis(record: DataRecord): ProvenanceBasis {
  return {
    basisCodes: readTextArray(record["basisCodes"], 0),
    transformations: parseTransformations(record["transformations"]),
  };
}

function parseProvenance(input: unknown): ValueProvenance {
  const record = readRecord(input);
  if (!Object.hasOwn(record, "provenanceClass")) return fail("DOMAIN_VALUE_MISSING_FIELD");
  const provenanceClass = readTag(record, "provenanceClass");
  const common = ["provenanceClass", "basisCodes", "transformations"];
  if (provenanceClass === "source") {
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
      provenanceClass,
      sourceContextIdentity: readText(record["sourceContextIdentity"]),
      entityIdentity: readText(record["entityIdentity"]),
      fieldIdentity: readText(record["fieldIdentity"]),
      adapterId: readText(record["adapterId"]),
      adapterContractVersion: readSafeInteger(record["adapterContractVersion"]),
      retrievedAtUtc: readInstant(record["retrievedAtUtc"]),
      mappingRuleId: readText(record["mappingRuleId"]),
      mappingRuleVersion: readSafeInteger(record["mappingRuleVersion"]),
      ...parseProvenanceBasis(record),
    });
  }
  if (provenanceClass === "supplemental") {
    requireFields(record, [
      ...common,
      "supplementalSourceIdentity",
      "supplementalRecordIdentity",
      "inputArtifactDigest",
      "parserId",
      "parserContractVersion",
      "attachedAtUtc",
      "mappingRuleId",
      "mappingRuleVersion",
    ]);
    return Object.freeze({
      provenanceClass,
      supplementalSourceIdentity: readText(record["supplementalSourceIdentity"]),
      supplementalRecordIdentity: readText(record["supplementalRecordIdentity"]),
      inputArtifactDigest: readDigest(record["inputArtifactDigest"]),
      parserId: readText(record["parserId"]),
      parserContractVersion: readSafeInteger(record["parserContractVersion"]),
      attachedAtUtc: readInstant(record["attachedAtUtc"]),
      mappingRuleId: readText(record["mappingRuleId"]),
      mappingRuleVersion: readSafeInteger(record["mappingRuleVersion"]),
      ...parseProvenanceBasis(record),
    });
  }
  if (provenanceClass === "override") {
    requireFields(record, [
      ...common,
      "presentationOverrideIdentity",
      "sourceFieldIdentity",
      "expectedSourceValueDigest",
      "overrideRevision",
      "recordedAtUtc",
    ]);
    return Object.freeze({
      provenanceClass,
      presentationOverrideIdentity: readText(record["presentationOverrideIdentity"]),
      sourceFieldIdentity: readText(record["sourceFieldIdentity"]),
      expectedSourceValueDigest: readDigest(record["expectedSourceValueDigest"]),
      overrideRevision: readSafeInteger(record["overrideRevision"]),
      recordedAtUtc: readInstant(record["recordedAtUtc"]),
      ...parseProvenanceBasis(record),
    });
  }
  if (provenanceClass === "resolution") {
    requireFields(record, [
      ...common,
      "sourceResolutionDecisionIdentity",
      "conflictIdentity",
      "competingInputRevisionDigests",
      "decisionRevision",
      "recordedAtUtc",
    ]);
    return Object.freeze({
      provenanceClass,
      sourceResolutionDecisionIdentity: readText(record["sourceResolutionDecisionIdentity"]),
      conflictIdentity: readText(record["conflictIdentity"]),
      competingInputRevisionDigests: readDigestArray(record["competingInputRevisionDigests"], 2),
      decisionRevision: readSafeInteger(record["decisionRevision"]),
      recordedAtUtc: readInstant(record["recordedAtUtc"]),
      ...parseProvenanceBasis(record),
    });
  }
  if (provenanceClass === "derived") {
    requireFields(record, [
      ...common,
      "derivationRuleId",
      "derivationRuleVersion",
      "inputProvenanceDigests",
      "recordedAtUtc",
    ]);
    return Object.freeze({
      provenanceClass,
      derivationRuleId: readText(record["derivationRuleId"]),
      derivationRuleVersion: readSafeInteger(record["derivationRuleVersion"]),
      inputProvenanceDigests: readDigestArray(record["inputProvenanceDigests"], 1),
      recordedAtUtc: readInstant(record["recordedAtUtc"]),
      ...parseProvenanceBasis(record),
    });
  }
  return fail("DOMAIN_VALUE_UNKNOWN_TAG");
}

function checkEligibilityCombination(
  content: ContentState,
  association: AssociationState,
  finality: FinalityState,
  eligibility: EligibilityResult,
  unit: UnitState,
): void {
  const requiredReasons = new Set<EligibilityReasonCode>();
  if (content.kind !== "zero" && content.kind !== "value") requiredReasons.add("content");
  if (association.state === "unmatched" || association.state === "ambiguous") {
    requiredReasons.add("association");
  }
  if (finality.state === "nonfinal" || finality.state === "unknown") {
    requiredReasons.add("finality");
  }
  if (unit.state === "unsupported") requiredReasons.add("unit");

  if (eligibility.state === "eligible" && requiredReasons.size > 0) {
    return fail("DOMAIN_VALUE_INVALID_COMBINATION");
  }
  if (
    eligibility.state !== "eligible" &&
    [...requiredReasons].some((reason) => !eligibility.reasonCodes.includes(reason))
  ) {
    return fail("DOMAIN_VALUE_INVALID_COMBINATION");
  }
}

function decodeUnchecked(input: unknown): DomainValueRecord {
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
  if (typeof record["recordVersion"] !== "number") return fail("DOMAIN_VALUE_WRONG_TYPE");
  if (record["recordVersion"] !== domainValueRecordVersion) {
    return fail("DOMAIN_VALUE_UNSUPPORTED_VERSION");
  }
  const content = parseContent(record["content"]);
  const association = parseAssociation(record["association"]);
  const finality = parseFinality(record["finality"]);
  const eligibility = parseEligibility(record["eligibility"]);
  const unit = parseUnit(record["unit"]);
  const provenance = parseProvenance(record["provenance"]);
  checkEligibilityCombination(content, association, finality, eligibility, unit);
  return Object.freeze({
    recordVersion: domainValueRecordVersion,
    content,
    association,
    finality,
    eligibility,
    unit,
    provenance,
  });
}

function rejected(code: DomainValueRejectionCode): DomainValueDecodeResult {
  return Object.freeze({ accepted: false, code });
}

/** Total, nonthrowing validation that returns a deeply detached frozen record. */
export function decodeDomainValueRecord(input: unknown): DomainValueDecodeResult {
  try {
    return Object.freeze({ accepted: true, value: decodeUnchecked(input) });
  } catch (error) {
    return rejected(error instanceof ParseFailure ? error.code : "DOMAIN_VALUE_MALFORMED");
  }
}

/** Deterministic JSON encoding is available only after the same strict runtime validation. */
export function encodeDomainValueRecord(input: unknown): DomainValueEncodeResult {
  const decoded = decodeDomainValueRecord(input);
  if (!decoded.accepted) return decoded;
  return Object.freeze({ accepted: true, json: JSON.stringify(decoded.value) });
}

/** Exact semantic equality over the normalized, versioned record encoding. */
export function domainValueRecordsEqual(left: unknown, right: unknown): boolean {
  const leftEncoded = encodeDomainValueRecord(left);
  const rightEncoded = encodeDomainValueRecord(right);
  return leftEncoded.accepted && rightEncoded.accepted && leftEncoded.json === rightEncoded.json;
}
