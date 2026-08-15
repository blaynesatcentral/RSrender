import { canonicalizeJson } from "./canonical-json.js";
import { defineOpaqueIdentityCodec } from "./identity.js";
import { isSha256Digest } from "./sha256.js";
import { isWellFormedUnicode } from "./unicode.js";
import type { OpaqueIdentity } from "./identity.js";
import type { Sha256Digest } from "./sha256.js";

/** Exact invalidation identity for the first application-service boundary. */
export const applicationServiceContractRevision = "bld-010-v1" as const;
export const applicationServiceContractVersion = 1 as const;
export const syntheticReplaceTemplateContentCommandId =
  "synthetic.template-content.replace" as const;
export const syntheticTemplateProjectionKind = "synthetic.template.projection" as const;

export type ApplicationRequestIdentity = OpaqueIdentity<"ApplicationRequestIdentity">;
export type SyntheticCommitIdentity = OpaqueIdentity<"SyntheticCommitIdentity">;
export type WorkingRevision = number & { readonly __workingRevision: unique symbol };
export type EventSequence = number & { readonly __eventSequence: unique symbol };
export type OwnerGeneration = number & { readonly __ownerGeneration: unique symbol };

export const applicationRequestIdentityCodec = defineOpaqueIdentityCodec(
  "ApplicationRequestIdentity",
);
export const syntheticCommitIdentityCodec = defineOpaqueIdentityCodec("SyntheticCommitIdentity");

export type ApplicationServiceContractRejectionCode =
  | "APPLICATION_CONTRACT_EXTRA_FIELD"
  | "APPLICATION_CONTRACT_MALFORMED"
  | "APPLICATION_CONTRACT_MISSING_FIELD"
  | "APPLICATION_CONTRACT_UNKNOWN_TAG"
  | "APPLICATION_CONTRACT_UNSUPPORTED_VERSION"
  | "APPLICATION_CONTRACT_WRONG_TYPE";

export type ApplicationServiceRejectionReason =
  | "CAPACITY_EXHAUSTED"
  | "CONTRACT_MALFORMED"
  | "CONTRACT_UNSUPPORTED_VERSION"
  | "DOCUMENT_IDENTITY_MISMATCH"
  | "INVALID_PRECONDITION"
  | "MINIMUM_WORKING_REVISION_UNAVAILABLE"
  | "OWNER_GENERATION_MISMATCH"
  | "REQUEST_ID_REUSE_MISMATCH"
  | "STALE_WORKING_REVISION"
  | "UNKNOWN_COMMAND"
  | "UNKNOWN_QUERY";

export interface SyntheticReplaceTemplateContentCommand {
  readonly contractVersion: 1;
  readonly messageType: "command";
  readonly scope: "document-domain";
  readonly kind: "synthetic.template-content.replace";
  readonly requestId: ApplicationRequestIdentity;
  readonly commandId: "synthetic.template-content.replace";
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly expectedWorkingRevision: WorkingRevision;
  readonly payload: {
    readonly newContentDigest: Sha256Digest;
  };
}

export interface SyntheticTemplateProjectionQuery {
  readonly contractVersion: 1;
  readonly messageType: "query";
  readonly scope: "document-domain";
  readonly kind: "synthetic.template.projection";
  readonly requestId: ApplicationRequestIdentity;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly minimumWorkingRevision: WorkingRevision | null;
}

export interface SyntheticDocumentEventsSubscriptionRequest {
  readonly contractVersion: 1;
  readonly messageType: "subscription-request";
  readonly scope: "document-domain";
  readonly kind: "synthetic.document.events";
  readonly requestId: ApplicationRequestIdentity;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly afterEventSequence: EventSequence;
}

export interface SyntheticTemplateProjection {
  readonly projectionVersion: 1;
  readonly projectionKind: "synthetic.template.projection";
  readonly documentId: string;
  readonly aggregateVersion: 1;
  readonly aggregateKind: "log-template";
  readonly templateIdentity: string;
  readonly currentContentDigest: Sha256Digest;
  readonly aggregateDigest: Sha256Digest;
}

export interface SyntheticDomainCommittedResult {
  readonly contractVersion: 1;
  readonly messageType: "command-result";
  readonly kind: "domainCommitted";
  readonly requestId: ApplicationRequestIdentity;
  readonly commandId: "synthetic.template-content.replace";
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly previousWorkingRevision: WorkingRevision;
  readonly workingRevision: WorkingRevision;
  /** Bounded transcript/commit marker only; it is not an Undo history entry or inverse. */
  readonly commitIdentity: SyntheticCommitIdentity;
  readonly beforeAggregateDigest: Sha256Digest;
  readonly afterAggregateDigest: Sha256Digest;
  readonly eventSequence: EventSequence;
  readonly affectedProjectionKinds: readonly ["synthetic.template.projection"];
  readonly diagnostics: readonly [];
}

export interface ApplicationServiceRejectedResult {
  readonly contractVersion: 1;
  readonly messageType: "command-result" | "query-result";
  readonly kind: "rejected";
  readonly requestId: ApplicationRequestIdentity | null;
  readonly reason: ApplicationServiceRejectionReason;
  readonly changed: false;
  readonly safeActions: readonly [];
}

export interface SyntheticTemplateProjectionResult {
  readonly contractVersion: 1;
  readonly messageType: "query-result";
  readonly kind: "synthetic.template.projection.result";
  readonly requestId: ApplicationRequestIdentity;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly workingRevision: WorkingRevision;
  readonly eventSequence: EventSequence;
  readonly projection: SyntheticTemplateProjection;
}

export interface SyntheticTemplateContentReplacedEvent {
  readonly contractVersion: 1;
  readonly messageType: "event";
  readonly kind: "synthetic.template-content.replaced";
  readonly sourceRequestId: ApplicationRequestIdentity;
  readonly commandId: "synthetic.template-content.replace";
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly eventSequence: EventSequence;
  readonly baseWorkingRevision: WorkingRevision;
  readonly resultingWorkingRevision: WorkingRevision;
  readonly commitIdentity: SyntheticCommitIdentity;
  readonly beforeAggregateDigest: Sha256Digest;
  readonly afterAggregateDigest: Sha256Digest;
  readonly projection: SyntheticTemplateProjection;
}

export type ApplicationServiceCommand = SyntheticReplaceTemplateContentCommand;
export type ApplicationServiceQuery = SyntheticTemplateProjectionQuery;
export type ApplicationServiceSubscriptionRequest = SyntheticDocumentEventsSubscriptionRequest;
export type ApplicationServiceCommandResult =
  SyntheticDomainCommittedResult | ApplicationServiceRejectedResult;
export type ApplicationServiceQueryResult =
  SyntheticTemplateProjectionResult | ApplicationServiceRejectedResult;
export type ApplicationServiceEvent = SyntheticTemplateContentReplacedEvent;
export type ApplicationServiceMessage =
  | ApplicationServiceCommand
  | ApplicationServiceQuery
  | ApplicationServiceSubscriptionRequest
  | ApplicationServiceCommandResult
  | ApplicationServiceQueryResult
  | ApplicationServiceEvent;

export type ApplicationServiceValidationResult<Value> =
  | { readonly accepted: true; readonly value: Value }
  | { readonly accepted: false; readonly code: ApplicationServiceContractRejectionCode };

type Literal = null | boolean | number | string;
type RuntimeSchema =
  | { readonly type: "literal"; readonly value: Literal }
  | { readonly type: "one-of-literals"; readonly values: readonly Literal[] }
  | { readonly type: "identity" }
  | { readonly type: "nullable-identity" }
  | { readonly type: "nonnegative-safe-integer" }
  | { readonly type: "nullable-nonnegative-safe-integer" }
  | { readonly type: "sha256" }
  | { readonly type: "empty-array" }
  | { readonly type: "literal-array"; readonly values: readonly Literal[] }
  | { readonly type: "record"; readonly fields: Readonly<Record<string, RuntimeSchema>> };

type MessageSchema = { readonly fields: Readonly<Record<string, RuntimeSchema>> };

const literal = (value: Literal): RuntimeSchema => Object.freeze({ type: "literal", value });
const identity = Object.freeze({ type: "identity" }) satisfies RuntimeSchema;
const nullableIdentity = Object.freeze({ type: "nullable-identity" }) satisfies RuntimeSchema;
const integer = Object.freeze({ type: "nonnegative-safe-integer" }) satisfies RuntimeSchema;
const nullableInteger = Object.freeze({
  type: "nullable-nonnegative-safe-integer",
}) satisfies RuntimeSchema;
const sha256 = Object.freeze({ type: "sha256" }) satisfies RuntimeSchema;
const emptyArray = Object.freeze({ type: "empty-array" }) satisfies RuntimeSchema;
const rejectionReason = Object.freeze({
  type: "one-of-literals",
  values: Object.freeze([
    "CAPACITY_EXHAUSTED",
    "CONTRACT_MALFORMED",
    "CONTRACT_UNSUPPORTED_VERSION",
    "DOCUMENT_IDENTITY_MISMATCH",
    "INVALID_PRECONDITION",
    "MINIMUM_WORKING_REVISION_UNAVAILABLE",
    "OWNER_GENERATION_MISMATCH",
    "REQUEST_ID_REUSE_MISMATCH",
    "STALE_WORKING_REVISION",
    "UNKNOWN_COMMAND",
    "UNKNOWN_QUERY",
  ]),
}) satisfies RuntimeSchema;
const projectionSchema = Object.freeze({
  type: "record",
  fields: Object.freeze({
    projectionVersion: literal(1),
    projectionKind: literal(syntheticTemplateProjectionKind),
    documentId: identity,
    aggregateVersion: literal(1),
    aggregateKind: literal("log-template"),
    templateIdentity: identity,
    currentContentDigest: sha256,
    aggregateDigest: sha256,
  }),
}) satisfies RuntimeSchema;

/** Independently executable closed schemas; no DTO is accepted by TypeScript casting alone. */
const runtimeSchemas = Object.freeze({
  "command:synthetic.template-content.replace": {
    fields: {
      contractVersion: literal(1),
      messageType: literal("command"),
      scope: literal("document-domain"),
      kind: literal(syntheticReplaceTemplateContentCommandId),
      requestId: identity,
      commandId: literal(syntheticReplaceTemplateContentCommandId),
      documentId: identity,
      ownerGeneration: integer,
      expectedWorkingRevision: integer,
      payload: {
        type: "record",
        fields: { newContentDigest: sha256 },
      },
    },
  },
  "query:synthetic.template.projection": {
    fields: {
      contractVersion: literal(1),
      messageType: literal("query"),
      scope: literal("document-domain"),
      kind: literal(syntheticTemplateProjectionKind),
      requestId: identity,
      documentId: identity,
      ownerGeneration: integer,
      minimumWorkingRevision: nullableInteger,
    },
  },
  "subscription-request:synthetic.document.events": {
    fields: {
      contractVersion: literal(1),
      messageType: literal("subscription-request"),
      scope: literal("document-domain"),
      kind: literal("synthetic.document.events"),
      requestId: identity,
      documentId: identity,
      ownerGeneration: integer,
      afterEventSequence: integer,
    },
  },
  "command-result:domainCommitted": {
    fields: {
      contractVersion: literal(1),
      messageType: literal("command-result"),
      kind: literal("domainCommitted"),
      requestId: identity,
      commandId: literal(syntheticReplaceTemplateContentCommandId),
      documentId: identity,
      ownerGeneration: integer,
      previousWorkingRevision: integer,
      workingRevision: integer,
      commitIdentity: identity,
      beforeAggregateDigest: sha256,
      afterAggregateDigest: sha256,
      eventSequence: integer,
      affectedProjectionKinds: {
        type: "literal-array",
        values: [syntheticTemplateProjectionKind],
      },
      diagnostics: emptyArray,
    },
  },
  "command-result:rejected": {
    fields: {
      contractVersion: literal(1),
      messageType: literal("command-result"),
      kind: literal("rejected"),
      requestId: nullableIdentity,
      reason: rejectionReason,
      changed: literal(false),
      safeActions: emptyArray,
    },
  },
  "query-result:synthetic.template.projection.result": {
    fields: {
      contractVersion: literal(1),
      messageType: literal("query-result"),
      kind: literal("synthetic.template.projection.result"),
      requestId: identity,
      documentId: identity,
      ownerGeneration: integer,
      workingRevision: integer,
      eventSequence: integer,
      projection: projectionSchema,
    },
  },
  "query-result:rejected": {
    fields: {
      contractVersion: literal(1),
      messageType: literal("query-result"),
      kind: literal("rejected"),
      requestId: nullableIdentity,
      reason: rejectionReason,
      changed: literal(false),
      safeActions: emptyArray,
    },
  },
  "event:synthetic.template-content.replaced": {
    fields: {
      contractVersion: literal(1),
      messageType: literal("event"),
      kind: literal("synthetic.template-content.replaced"),
      sourceRequestId: identity,
      commandId: literal(syntheticReplaceTemplateContentCommandId),
      documentId: identity,
      ownerGeneration: integer,
      eventSequence: integer,
      baseWorkingRevision: integer,
      resultingWorkingRevision: integer,
      commitIdentity: identity,
      beforeAggregateDigest: sha256,
      afterAggregateDigest: sha256,
      projection: projectionSchema,
    },
  },
}) satisfies Readonly<Record<string, MessageSchema>>;

/** Field-level schema witness retained for exact drift evidence. */
export const applicationServiceSchemaManifest = Object.freeze(
  Object.fromEntries(
    Object.entries(runtimeSchemas).map(([variant, schema]) => [
      variant,
      Object.freeze(Object.keys(schema.fields).sort()),
    ]),
  ),
);

type DataRecord = Readonly<Record<string, unknown>>;

class ValidationFailure extends Error {
  readonly code: ApplicationServiceContractRejectionCode;

  constructor(code: ApplicationServiceContractRejectionCode) {
    super(code);
    this.code = code;
  }
}

function fail(code: ApplicationServiceContractRejectionCode): never {
  throw new ValidationFailure(code);
}

function record(value: unknown): DataRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail("APPLICATION_CONTRACT_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("APPLICATION_CONTRACT_MALFORMED");
  }
  const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") return fail("APPLICATION_CONTRACT_EXTRA_FIELD");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("APPLICATION_CONTRACT_MALFORMED");
    }
    copy[key] = descriptor.value;
  }
  return copy;
}

function denseArray(value: unknown): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    return fail("APPLICATION_CONTRACT_WRONG_TYPE");
  }
  const allowed = new Set<string>(["length"]);
  const copy: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    allowed.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      return fail("APPLICATION_CONTRACT_MALFORMED");
    }
    copy.push(descriptor.value);
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || !allowed.has(key))) {
    return fail("APPLICATION_CONTRACT_EXTRA_FIELD");
  }
  return copy;
}

function validateIdentity(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && isWellFormedUnicode(value);
}

export function isWorkingRevision(value: unknown): value is WorkingRevision {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function parseWorkingRevision(value: unknown): WorkingRevision {
  if (!isWorkingRevision(value)) throw new RangeError("WORKING_REVISION_INVALID");
  return value;
}

export function isEventSequence(value: unknown): value is EventSequence {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function parseEventSequence(value: unknown): EventSequence {
  if (!isEventSequence(value)) throw new RangeError("EVENT_SEQUENCE_INVALID");
  return value;
}

export function isOwnerGeneration(value: unknown): value is OwnerGeneration {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function parseOwnerGeneration(value: unknown): OwnerGeneration {
  if (!isOwnerGeneration(value)) throw new RangeError("OWNER_GENERATION_INVALID");
  return value;
}

function validateValue(value: unknown, schema: RuntimeSchema): unknown {
  if (schema.type === "literal") {
    if (!Object.is(value, schema.value)) return fail("APPLICATION_CONTRACT_WRONG_TYPE");
    return value;
  }
  if (schema.type === "one-of-literals") {
    if (!schema.values.some((candidate) => Object.is(candidate, value))) {
      return fail("APPLICATION_CONTRACT_WRONG_TYPE");
    }
    return value;
  }
  if (schema.type === "identity") {
    if (!validateIdentity(value)) return fail("APPLICATION_CONTRACT_WRONG_TYPE");
    return value;
  }
  if (schema.type === "nullable-identity") {
    if (value !== null && !validateIdentity(value)) {
      return fail("APPLICATION_CONTRACT_WRONG_TYPE");
    }
    return value;
  }
  if (schema.type === "nonnegative-safe-integer") {
    if (!isWorkingRevision(value)) return fail("APPLICATION_CONTRACT_WRONG_TYPE");
    return value;
  }
  if (schema.type === "nullable-nonnegative-safe-integer") {
    if (value !== null && !isWorkingRevision(value)) {
      return fail("APPLICATION_CONTRACT_WRONG_TYPE");
    }
    return value;
  }
  if (schema.type === "sha256") {
    if (!isSha256Digest(value)) return fail("APPLICATION_CONTRACT_WRONG_TYPE");
    return value;
  }
  if (schema.type === "empty-array") {
    const values = denseArray(value);
    if (values.length !== 0) return fail("APPLICATION_CONTRACT_WRONG_TYPE");
    return Object.freeze([]);
  }
  if (schema.type === "literal-array") {
    const values = denseArray(value);
    if (
      values.length !== schema.values.length ||
      values.some((entry, index) => !Object.is(entry, schema.values[index]))
    ) {
      return fail("APPLICATION_CONTRACT_WRONG_TYPE");
    }
    return Object.freeze([...values]);
  }
  return validateRecord(value, schema.fields);
}

function validateRecord(
  value: unknown,
  fields: Readonly<Record<string, RuntimeSchema>>,
): DataRecord {
  const input = record(value);
  const expected = Object.keys(fields);
  if (expected.some((field) => !Object.hasOwn(input, field))) {
    return fail("APPLICATION_CONTRACT_MISSING_FIELD");
  }
  if (Object.keys(input).some((field) => !Object.hasOwn(fields, field))) {
    return fail("APPLICATION_CONTRACT_EXTRA_FIELD");
  }
  return Object.freeze(
    Object.fromEntries(
      expected.map((field) => [field, validateValue(input[field], fields[field]!)]),
    ),
  );
}

function validateUnchecked(input: unknown): ApplicationServiceMessage {
  const inputRecord = record(input);
  if (
    !Object.hasOwn(inputRecord, "contractVersion") ||
    !Object.hasOwn(inputRecord, "messageType") ||
    !Object.hasOwn(inputRecord, "kind")
  ) {
    return fail("APPLICATION_CONTRACT_MISSING_FIELD");
  }
  if (typeof inputRecord["contractVersion"] !== "number") {
    return fail("APPLICATION_CONTRACT_WRONG_TYPE");
  }
  if (inputRecord["contractVersion"] !== applicationServiceContractVersion) {
    return fail("APPLICATION_CONTRACT_UNSUPPORTED_VERSION");
  }
  if (typeof inputRecord["messageType"] !== "string" || typeof inputRecord["kind"] !== "string") {
    return fail("APPLICATION_CONTRACT_WRONG_TYPE");
  }
  const variant = `${inputRecord["messageType"]}:${inputRecord["kind"]}`;
  const schema = runtimeSchemas[variant as keyof typeof runtimeSchemas] as
    MessageSchema | undefined;
  if (schema === undefined) return fail("APPLICATION_CONTRACT_UNKNOWN_TAG");
  return validateRecord(inputRecord, schema.fields) as unknown as ApplicationServiceMessage;
}

export function validateApplicationServiceMessage(
  input: unknown,
): ApplicationServiceValidationResult<ApplicationServiceMessage> {
  try {
    return Object.freeze({ accepted: true, value: validateUnchecked(input) });
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code: error instanceof ValidationFailure ? error.code : "APPLICATION_CONTRACT_MALFORMED",
    });
  }
}

function validateKind<Value extends ApplicationServiceMessage>(
  input: unknown,
  messageType: Value["messageType"],
): ApplicationServiceValidationResult<Value> {
  const result = validateApplicationServiceMessage(input);
  if (!result.accepted) return result;
  if (result.value.messageType !== messageType) {
    return Object.freeze({ accepted: false, code: "APPLICATION_CONTRACT_UNKNOWN_TAG" });
  }
  return result as ApplicationServiceValidationResult<Value>;
}

export const validateApplicationServiceCommand = (
  input: unknown,
): ApplicationServiceValidationResult<ApplicationServiceCommand> =>
  validateKind<ApplicationServiceCommand>(input, "command");

export const validateApplicationServiceQuery = (
  input: unknown,
): ApplicationServiceValidationResult<ApplicationServiceQuery> =>
  validateKind<ApplicationServiceQuery>(input, "query");

export const validateApplicationServiceSubscriptionRequest = (
  input: unknown,
): ApplicationServiceValidationResult<ApplicationServiceSubscriptionRequest> =>
  validateKind<ApplicationServiceSubscriptionRequest>(input, "subscription-request");

/** Canonical replay identity over the complete strict envelope, including scope/preconditions. */
export function canonicalApplicationServiceRequest(input: ApplicationServiceCommand): string {
  return canonicalizeJson(input);
}
