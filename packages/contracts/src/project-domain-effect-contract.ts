import { canonicalizeJson, type CanonicalJsonValue } from "./canonical-json.js";
import {
  applicationRequestIdentityCodec,
  isOwnerGeneration,
  isWorkingRevision,
  type ApplicationRequestIdentity,
  type OwnerGeneration,
  type WorkingRevision,
} from "./application-service-contract.js";
import { defineOpaqueIdentityCodec, parseOpaqueIdentity, type OpaqueIdentity } from "./identity.js";
import { isSha256Digest, sha256Utf8, type Sha256Digest } from "./sha256.js";
import { isWellFormedUnicode } from "./unicode.js";

export const projectDomainEffectContractRevision = "bld-018-project-domain-effect-v1" as const;
export const projectDomainEffectContractVersion = 1 as const;

export type ProjectDomainEffectIdentity = OpaqueIdentity<"ProjectDomainEffectIdentity">;

export const projectDomainEffectIdentityCodec = defineOpaqueIdentityCodec(
  "ProjectDomainEffectIdentity",
);

export type ProjectDomainEffectContractRejectionCode =
  | "PROJECT_EFFECT_CONTRACT_DIGEST_MISMATCH"
  | "PROJECT_EFFECT_CONTRACT_DUPLICATE_VALUE"
  | "PROJECT_EFFECT_CONTRACT_EXTRA_FIELD"
  | "PROJECT_EFFECT_CONTRACT_IDENTITY_MISMATCH"
  | "PROJECT_EFFECT_CONTRACT_INVALID_COMBINATION"
  | "PROJECT_EFFECT_CONTRACT_MALFORMED"
  | "PROJECT_EFFECT_CONTRACT_MISSING_FIELD"
  | "PROJECT_EFFECT_CONTRACT_NONCANONICAL_JSON"
  | "PROJECT_EFFECT_CONTRACT_ORDER_MISMATCH"
  | "PROJECT_EFFECT_CONTRACT_UNKNOWN_TAG"
  | "PROJECT_EFFECT_CONTRACT_UNSUPPORTED_VERSION"
  | "PROJECT_EFFECT_CONTRACT_WRONG_TYPE";

export type ProjectDomainEffectDecodeResult<Value> =
  | { readonly accepted: true; readonly value: Value }
  | { readonly accepted: false; readonly code: ProjectDomainEffectContractRejectionCode };

export interface CanonicalAggregateBytes {
  readonly canonicalJson: string;
  readonly digest: Sha256Digest;
}

/** Declarative replacement only. This is data, never an executable callback or command. */
export interface ProjectAggregateApplicationPayload {
  readonly applicationVersion: 1;
  readonly kind: "phase1-project.aggregate.replace";
  readonly expectedAggregateDigest: Sha256Digest;
  readonly replacementAggregateCanonicalJson: string;
  readonly replacementAggregateDigest: Sha256Digest;
}

/** Inert semantic result bytes retained with the history event for downstream interpretation. */
export interface ProjectDomainEventResult {
  readonly eventResultVersion: 1;
  readonly kind: "project-domain-event-result";
  readonly resultCode: string;
  readonly canonicalPayload: string;
  readonly payloadDigest: Sha256Digest;
}

export interface ProjectDomainEffect {
  readonly contractVersion: 1;
  readonly kind: "project-domain-effect";
  readonly effectIdentity: ProjectDomainEffectIdentity;
  readonly sourceRequestId: ApplicationRequestIdentity;
  /** Inert canonical source-command bytes retained solely for audit/replay identity. */
  readonly sourceCommandCanonicalJson: string;
  readonly sourceCommandDigest: Sha256Digest;
  /** Display/audit metadata only; this value is not dispatchable. */
  readonly sourceCommandIdentity: string;
  /** Display/audit metadata only; this value is not dispatchable. */
  readonly commandLabel: string;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly expectedWorkingRevision: WorkingRevision;
  readonly beforeAggregate: CanonicalAggregateBytes;
  readonly afterAggregate: CanonicalAggregateBytes;
  readonly forwardApplication: ProjectAggregateApplicationPayload;
  readonly inverseApplication: ProjectAggregateApplicationPayload;
  readonly affectedIdentities: readonly string[];
  readonly invalidations: readonly string[];
  readonly eventResult: ProjectDomainEventResult;
}

export interface ProjectDomainEffectDraft {
  readonly sourceRequestId: ApplicationRequestIdentity;
  /** Inert canonical source-command bytes; this contract never dispatches them. */
  readonly sourceCommandCanonicalJson: string;
  readonly sourceCommandIdentity: string;
  readonly commandLabel: string;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly expectedWorkingRevision: WorkingRevision;
  readonly beforeAggregateCanonicalJson: string;
  readonly afterAggregateCanonicalJson: string;
  readonly affectedIdentities: readonly string[];
  readonly invalidations: readonly string[];
  readonly eventResult: {
    readonly resultCode: string;
    readonly canonicalPayload: string;
  };
}

export interface EncodedProjectDomainEffect {
  readonly canonicalJson: string;
  readonly digest: Sha256Digest;
}

type DataRecord = Readonly<Record<string, unknown>>;

class ValidationFailure extends Error {
  readonly code: ProjectDomainEffectContractRejectionCode;

  constructor(code: ProjectDomainEffectContractRejectionCode) {
    super(code);
    this.code = code;
  }
}

function fail(code: ProjectDomainEffectContractRejectionCode): never {
  throw new ValidationFailure(code);
}

function ownDataRecord(value: unknown): DataRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail("PROJECT_EFFECT_CONTRACT_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("PROJECT_EFFECT_CONTRACT_MALFORMED");
  }
  const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") return fail("PROJECT_EFFECT_CONTRACT_EXTRA_FIELD");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("PROJECT_EFFECT_CONTRACT_MALFORMED");
    }
    copy[key] = descriptor.value;
  }
  return copy;
}

function exactRecord(value: unknown, expected: readonly string[]): DataRecord {
  const record = ownDataRecord(value);
  for (const field of expected) {
    if (!Object.hasOwn(record, field)) return fail("PROJECT_EFFECT_CONTRACT_MISSING_FIELD");
  }
  for (const field of Object.keys(record)) {
    if (!expected.includes(field)) return fail("PROJECT_EFFECT_CONTRACT_EXTRA_FIELD");
  }
  return record;
}

function denseArray(value: unknown): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    return fail("PROJECT_EFFECT_CONTRACT_WRONG_TYPE");
  }
  const copy: unknown[] = [];
  const allowed = new Set<string>(["length"]);
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    allowed.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("PROJECT_EFFECT_CONTRACT_MALFORMED");
    }
    copy.push(descriptor.value);
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || !allowed.has(key))) {
    return fail("PROJECT_EFFECT_CONTRACT_EXTRA_FIELD");
  }
  return copy;
}

function nonemptyString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || !isWellFormedUnicode(value)) {
    return fail("PROJECT_EFFECT_CONTRACT_WRONG_TYPE");
  }
  return value;
}

function canonicalJsonBytes(value: unknown): CanonicalAggregateBytes {
  if (typeof value !== "string" || !isWellFormedUnicode(value)) {
    return fail("PROJECT_EFFECT_CONTRACT_WRONG_TYPE");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return fail("PROJECT_EFFECT_CONTRACT_NONCANONICAL_JSON");
  }
  let canonical: string;
  try {
    canonical = canonicalizeJson(parsed);
  } catch {
    return fail("PROJECT_EFFECT_CONTRACT_NONCANONICAL_JSON");
  }
  if (canonical !== value) return fail("PROJECT_EFFECT_CONTRACT_NONCANONICAL_JSON");
  return Object.freeze({ canonicalJson: canonical, digest: sha256Utf8(canonical) });
}

function canonicalStringArray(
  value: unknown,
  requireNonempty: boolean,
  identities: boolean,
): readonly string[] {
  const input = denseArray(value).map((entry) => {
    const parsed = nonemptyString(entry);
    return identities ? parseOpaqueIdentity(parsed) : parsed;
  });
  if (requireNonempty && input.length === 0) {
    return fail("PROJECT_EFFECT_CONTRACT_INVALID_COMBINATION");
  }
  const sorted = [...input].sort();
  if (sorted.some((entry, index) => entry !== input[index])) {
    return fail("PROJECT_EFFECT_CONTRACT_ORDER_MISMATCH");
  }
  if (sorted.some((entry, index) => index > 0 && entry === sorted[index - 1])) {
    return fail("PROJECT_EFFECT_CONTRACT_DUPLICATE_VALUE");
  }
  return Object.freeze(sorted);
}

function parseAggregate(value: unknown): CanonicalAggregateBytes {
  const record = exactRecord(value, ["canonicalJson", "digest"]);
  const bytes = canonicalJsonBytes(record["canonicalJson"]);
  if (!isSha256Digest(record["digest"])) return fail("PROJECT_EFFECT_CONTRACT_WRONG_TYPE");
  if (record["digest"] !== bytes.digest) return fail("PROJECT_EFFECT_CONTRACT_DIGEST_MISMATCH");
  return bytes;
}

function makeApplication(
  expected: CanonicalAggregateBytes,
  replacement: CanonicalAggregateBytes,
): ProjectAggregateApplicationPayload {
  return Object.freeze({
    applicationVersion: 1,
    kind: "phase1-project.aggregate.replace",
    expectedAggregateDigest: expected.digest,
    replacementAggregateCanonicalJson: replacement.canonicalJson,
    replacementAggregateDigest: replacement.digest,
  });
}

function parseApplication(
  value: unknown,
  expected: CanonicalAggregateBytes,
  replacement: CanonicalAggregateBytes,
): ProjectAggregateApplicationPayload {
  const record = exactRecord(value, [
    "applicationVersion",
    "kind",
    "expectedAggregateDigest",
    "replacementAggregateCanonicalJson",
    "replacementAggregateDigest",
  ]);
  if (record["applicationVersion"] !== 1) {
    return fail("PROJECT_EFFECT_CONTRACT_UNSUPPORTED_VERSION");
  }
  if (record["kind"] !== "phase1-project.aggregate.replace") {
    return fail("PROJECT_EFFECT_CONTRACT_UNKNOWN_TAG");
  }
  if (
    record["expectedAggregateDigest"] !== expected.digest ||
    record["replacementAggregateCanonicalJson"] !== replacement.canonicalJson ||
    record["replacementAggregateDigest"] !== replacement.digest
  ) {
    return fail("PROJECT_EFFECT_CONTRACT_INVALID_COMBINATION");
  }
  return makeApplication(expected, replacement);
}

function makeEventResult(resultCode: string, canonicalPayload: string): ProjectDomainEventResult {
  return Object.freeze({
    eventResultVersion: 1,
    kind: "project-domain-event-result",
    resultCode,
    canonicalPayload,
    payloadDigest: sha256Utf8(canonicalPayload),
  });
}

function parseEventResult(value: unknown): ProjectDomainEventResult {
  const record = exactRecord(value, [
    "eventResultVersion",
    "kind",
    "resultCode",
    "canonicalPayload",
    "payloadDigest",
  ]);
  if (record["eventResultVersion"] !== 1) {
    return fail("PROJECT_EFFECT_CONTRACT_UNSUPPORTED_VERSION");
  }
  if (record["kind"] !== "project-domain-event-result") {
    return fail("PROJECT_EFFECT_CONTRACT_UNKNOWN_TAG");
  }
  const payload = canonicalJsonBytes(record["canonicalPayload"]);
  if (!isSha256Digest(record["payloadDigest"])) {
    return fail("PROJECT_EFFECT_CONTRACT_WRONG_TYPE");
  }
  if (record["payloadDigest"] !== payload.digest) {
    return fail("PROJECT_EFFECT_CONTRACT_DIGEST_MISMATCH");
  }
  return makeEventResult(nonemptyString(record["resultCode"]), payload.canonicalJson);
}

function effectIdentityBasis(
  effect: Omit<ProjectDomainEffect, "effectIdentity">,
): CanonicalJsonValue {
  return effect as unknown as CanonicalJsonValue;
}

function deriveEffectIdentity(
  effect: Omit<ProjectDomainEffect, "effectIdentity">,
): ProjectDomainEffectIdentity {
  return parseOpaqueIdentity<"ProjectDomainEffectIdentity">(
    `urn:rsrender:project-domain-effect:${sha256Utf8(canonicalizeJson(effectIdentityBasis(effect)))}`,
  );
}

function makeEffect(input: {
  readonly sourceRequestId: ApplicationRequestIdentity;
  readonly sourceCommandCanonicalJson: string;
  readonly sourceCommandDigest: Sha256Digest;
  readonly sourceCommandIdentity: string;
  readonly commandLabel: string;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly expectedWorkingRevision: WorkingRevision;
  readonly beforeAggregate: CanonicalAggregateBytes;
  readonly afterAggregate: CanonicalAggregateBytes;
  readonly affectedIdentities: readonly string[];
  readonly invalidations: readonly string[];
  readonly eventResult: ProjectDomainEventResult;
}): ProjectDomainEffect {
  if (input.beforeAggregate.digest === input.afterAggregate.digest) {
    return fail("PROJECT_EFFECT_CONTRACT_INVALID_COMBINATION");
  }
  const basis = Object.freeze({
    contractVersion: 1,
    kind: "project-domain-effect",
    sourceRequestId: input.sourceRequestId,
    sourceCommandCanonicalJson: input.sourceCommandCanonicalJson,
    sourceCommandDigest: input.sourceCommandDigest,
    sourceCommandIdentity: input.sourceCommandIdentity,
    commandLabel: input.commandLabel,
    documentId: input.documentId,
    ownerGeneration: input.ownerGeneration,
    expectedWorkingRevision: input.expectedWorkingRevision,
    beforeAggregate: input.beforeAggregate,
    afterAggregate: input.afterAggregate,
    forwardApplication: makeApplication(input.beforeAggregate, input.afterAggregate),
    inverseApplication: makeApplication(input.afterAggregate, input.beforeAggregate),
    affectedIdentities: input.affectedIdentities,
    invalidations: input.invalidations,
    eventResult: input.eventResult,
  }) satisfies Omit<ProjectDomainEffect, "effectIdentity">;
  return Object.freeze({
    ...basis,
    effectIdentity: deriveEffectIdentity(basis),
  });
}

function parseDraft(input: unknown): ProjectDomainEffect {
  const record = exactRecord(input, [
    "sourceRequestId",
    "sourceCommandCanonicalJson",
    "sourceCommandIdentity",
    "commandLabel",
    "documentId",
    "ownerGeneration",
    "expectedWorkingRevision",
    "beforeAggregateCanonicalJson",
    "afterAggregateCanonicalJson",
    "affectedIdentities",
    "invalidations",
    "eventResult",
  ]);
  if (!applicationRequestIdentityCodec.is(record["sourceRequestId"])) {
    return fail("PROJECT_EFFECT_CONTRACT_WRONG_TYPE");
  }
  if (
    !isOwnerGeneration(record["ownerGeneration"]) ||
    !isWorkingRevision(record["expectedWorkingRevision"])
  ) {
    return fail("PROJECT_EFFECT_CONTRACT_WRONG_TYPE");
  }
  const event = exactRecord(record["eventResult"], ["resultCode", "canonicalPayload"]);
  const payload = canonicalJsonBytes(event["canonicalPayload"]);
  const sourceCommand = canonicalJsonBytes(record["sourceCommandCanonicalJson"]);
  return makeEffect({
    sourceRequestId: record["sourceRequestId"],
    sourceCommandCanonicalJson: sourceCommand.canonicalJson,
    sourceCommandDigest: sourceCommand.digest,
    sourceCommandIdentity: parseOpaqueIdentity(nonemptyString(record["sourceCommandIdentity"])),
    commandLabel: nonemptyString(record["commandLabel"]),
    documentId: parseOpaqueIdentity(nonemptyString(record["documentId"])),
    ownerGeneration: record["ownerGeneration"],
    expectedWorkingRevision: record["expectedWorkingRevision"],
    beforeAggregate: canonicalJsonBytes(record["beforeAggregateCanonicalJson"]),
    afterAggregate: canonicalJsonBytes(record["afterAggregateCanonicalJson"]),
    affectedIdentities: canonicalStringArray(record["affectedIdentities"], true, true),
    invalidations: canonicalStringArray(record["invalidations"], false, false),
    eventResult: makeEventResult(nonemptyString(event["resultCode"]), payload.canonicalJson),
  });
}

function parseEffect(input: unknown): ProjectDomainEffect {
  const record = exactRecord(input, [
    "contractVersion",
    "kind",
    "effectIdentity",
    "sourceRequestId",
    "sourceCommandCanonicalJson",
    "sourceCommandDigest",
    "sourceCommandIdentity",
    "commandLabel",
    "documentId",
    "ownerGeneration",
    "expectedWorkingRevision",
    "beforeAggregate",
    "afterAggregate",
    "forwardApplication",
    "inverseApplication",
    "affectedIdentities",
    "invalidations",
    "eventResult",
  ]);
  if (record["contractVersion"] !== 1) {
    return fail("PROJECT_EFFECT_CONTRACT_UNSUPPORTED_VERSION");
  }
  if (record["kind"] !== "project-domain-effect") {
    return fail("PROJECT_EFFECT_CONTRACT_UNKNOWN_TAG");
  }
  if (
    !projectDomainEffectIdentityCodec.is(record["effectIdentity"]) ||
    !applicationRequestIdentityCodec.is(record["sourceRequestId"]) ||
    !isSha256Digest(record["sourceCommandDigest"]) ||
    !isOwnerGeneration(record["ownerGeneration"]) ||
    !isWorkingRevision(record["expectedWorkingRevision"])
  ) {
    return fail("PROJECT_EFFECT_CONTRACT_WRONG_TYPE");
  }
  const before = parseAggregate(record["beforeAggregate"]);
  const after = parseAggregate(record["afterAggregate"]);
  const sourceCommand = canonicalJsonBytes(record["sourceCommandCanonicalJson"]);
  if (record["sourceCommandDigest"] !== sourceCommand.digest) {
    return fail("PROJECT_EFFECT_CONTRACT_DIGEST_MISMATCH");
  }
  if (before.digest === after.digest) return fail("PROJECT_EFFECT_CONTRACT_INVALID_COMBINATION");
  parseApplication(record["forwardApplication"], before, after);
  parseApplication(record["inverseApplication"], after, before);
  const parsed = makeEffect({
    sourceRequestId: record["sourceRequestId"],
    sourceCommandCanonicalJson: sourceCommand.canonicalJson,
    sourceCommandDigest: record["sourceCommandDigest"],
    sourceCommandIdentity: parseOpaqueIdentity(nonemptyString(record["sourceCommandIdentity"])),
    commandLabel: nonemptyString(record["commandLabel"]),
    documentId: parseOpaqueIdentity(nonemptyString(record["documentId"])),
    ownerGeneration: record["ownerGeneration"],
    expectedWorkingRevision: record["expectedWorkingRevision"],
    beforeAggregate: before,
    afterAggregate: after,
    affectedIdentities: canonicalStringArray(record["affectedIdentities"], true, true),
    invalidations: canonicalStringArray(record["invalidations"], false, false),
    eventResult: parseEventResult(record["eventResult"]),
  });
  if (record["effectIdentity"] !== parsed.effectIdentity) {
    return fail("PROJECT_EFFECT_CONTRACT_IDENTITY_MISMATCH");
  }
  return parsed;
}

function result<Value>(operation: () => Value): ProjectDomainEffectDecodeResult<Value> {
  try {
    return Object.freeze({ accepted: true, value: operation() });
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code: error instanceof ValidationFailure ? error.code : "PROJECT_EFFECT_CONTRACT_MALFORMED",
    });
  }
}

export function createProjectDomainEffect(
  draft: unknown,
): ProjectDomainEffectDecodeResult<ProjectDomainEffect> {
  return result(() => parseDraft(draft));
}

export function decodeProjectDomainEffect(
  input: unknown,
): ProjectDomainEffectDecodeResult<ProjectDomainEffect> {
  return result(() => parseEffect(input));
}

export function encodeProjectDomainEffect(
  input: unknown,
): ProjectDomainEffectDecodeResult<EncodedProjectDomainEffect> {
  return result(() => {
    const value = parseEffect(input);
    const canonicalJson = canonicalizeJson(value);
    return Object.freeze({ canonicalJson, digest: sha256Utf8(canonicalJson) });
  });
}
