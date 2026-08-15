import { isWellFormedUnicode } from "./unicode.js";

/** The first independently executable cross-boundary contract version. */
export const contractVersion = 1 as const;

declare const exampleRequestIdBrand: unique symbol;
declare const exampleEventSequenceBrand: unique symbol;

export type ExampleRequestId = string & { readonly [exampleRequestIdBrand]: "ExampleRequestId" };
export type ExampleEventSequence = number & {
  readonly [exampleEventSequenceBrand]: "ExampleEventSequence";
};

export type ContractRejectionCode =
  | "CONTRACT_MALFORMED"
  | "CONTRACT_MISSING_FIELD"
  | "CONTRACT_EXTRA_FIELD"
  | "CONTRACT_WRONG_TYPE"
  | "CONTRACT_UNKNOWN_TAG"
  | "CONTRACT_UNSUPPORTED_VERSION"
  | "CONTRACT_SCHEMA_DRIFT";

export interface ExampleNoopCommand {
  readonly contractVersion: 1;
  readonly messageType: "command";
  readonly kind: "example.noop";
  readonly requestId: ExampleRequestId;
  readonly scope: "application";
  readonly payload: null;
}

export interface ExampleVersionQuery {
  readonly contractVersion: 1;
  readonly messageType: "query";
  readonly kind: "example.contract-version";
  readonly requestId: ExampleRequestId;
  readonly scope: "application";
}

export interface ExampleNoopCompletedResult {
  readonly contractVersion: 1;
  readonly messageType: "command-result";
  readonly kind: "example.noop.completed";
  readonly requestId: ExampleRequestId;
  readonly changed: false;
}

export interface ExampleVersionQueryResult {
  readonly contractVersion: 1;
  readonly messageType: "query-result";
  readonly kind: "example.contract-version.result";
  readonly requestId: ExampleRequestId;
  readonly value: 1;
}

export interface ExampleObservedEvent {
  readonly contractVersion: 1;
  readonly messageType: "event";
  readonly kind: "example.observed";
  readonly eventSequence: ExampleEventSequence;
  readonly changed: false;
}

export type ExampleBoundaryMessage =
  | ExampleNoopCommand
  | ExampleVersionQuery
  | ExampleNoopCompletedResult
  | ExampleVersionQueryResult
  | ExampleObservedEvent;

export type ContractValidationResult =
  | { readonly accepted: true; readonly value: ExampleBoundaryMessage }
  | { readonly accepted: false; readonly code: ContractRejectionCode };

type DescriptorFor<Value> = Value extends ExampleRequestId
  ? "nonempty-string"
  : Value extends ExampleEventSequence
    ? "nonnegative-safe-integer"
    : [Value] extends [null]
      ? "literal:null"
      : [Value] extends [false]
        ? "literal:boolean:false"
        : [Value] extends [1]
          ? "literal:number:1"
          : Value extends string
            ? `literal:string:${Value}`
            : never;

type TypeShape<Type> = { readonly [Field in keyof Type]-?: DescriptorFor<Type[Field]> };

export type ContractTypeManifest = {
  readonly "command:example.noop": TypeShape<ExampleNoopCommand>;
  readonly "query:example.contract-version": TypeShape<ExampleVersionQuery>;
  readonly "command-result:example.noop.completed": TypeShape<ExampleNoopCompletedResult>;
  readonly "query-result:example.contract-version.result": TypeShape<ExampleVersionQueryResult>;
  readonly "event:example.observed": TypeShape<ExampleObservedEvent>;
};

/**
 * Compile-time shape witness. Missing/extra fields or a changed TypeScript field category fail
 * `satisfies ContractTypeManifest`; the independently executable schemas below are compared to it.
 */
export const contractTypeManifest = {
  "command:example.noop": {
    contractVersion: "literal:number:1",
    messageType: "literal:string:command",
    kind: "literal:string:example.noop",
    requestId: "nonempty-string",
    scope: "literal:string:application",
    payload: "literal:null",
  },
  "query:example.contract-version": {
    contractVersion: "literal:number:1",
    messageType: "literal:string:query",
    kind: "literal:string:example.contract-version",
    requestId: "nonempty-string",
    scope: "literal:string:application",
  },
  "command-result:example.noop.completed": {
    contractVersion: "literal:number:1",
    messageType: "literal:string:command-result",
    kind: "literal:string:example.noop.completed",
    requestId: "nonempty-string",
    changed: "literal:boolean:false",
  },
  "query-result:example.contract-version.result": {
    contractVersion: "literal:number:1",
    messageType: "literal:string:query-result",
    kind: "literal:string:example.contract-version.result",
    requestId: "nonempty-string",
    value: "literal:number:1",
  },
  "event:example.observed": {
    contractVersion: "literal:number:1",
    messageType: "literal:string:event",
    kind: "literal:string:example.observed",
    eventSequence: "nonnegative-safe-integer",
    changed: "literal:boolean:false",
  },
} as const satisfies ContractTypeManifest;

type RuntimeFieldSchema =
  | { readonly type: "literal"; readonly value: null | boolean | number | string }
  | { readonly type: "nonempty-string" }
  | { readonly type: "nonnegative-safe-integer" };

type RuntimeMessageSchema = {
  readonly fields: Readonly<Record<string, RuntimeFieldSchema>>;
};

const runtimeSchemas = Object.freeze({
  "command:example.noop": {
    fields: {
      contractVersion: { type: "literal", value: 1 },
      messageType: { type: "literal", value: "command" },
      kind: { type: "literal", value: "example.noop" },
      requestId: { type: "nonempty-string" },
      scope: { type: "literal", value: "application" },
      payload: { type: "literal", value: null },
    },
  },
  "query:example.contract-version": {
    fields: {
      contractVersion: { type: "literal", value: 1 },
      messageType: { type: "literal", value: "query" },
      kind: { type: "literal", value: "example.contract-version" },
      requestId: { type: "nonempty-string" },
      scope: { type: "literal", value: "application" },
    },
  },
  "command-result:example.noop.completed": {
    fields: {
      contractVersion: { type: "literal", value: 1 },
      messageType: { type: "literal", value: "command-result" },
      kind: { type: "literal", value: "example.noop.completed" },
      requestId: { type: "nonempty-string" },
      changed: { type: "literal", value: false },
    },
  },
  "query-result:example.contract-version.result": {
    fields: {
      contractVersion: { type: "literal", value: 1 },
      messageType: { type: "literal", value: "query-result" },
      kind: { type: "literal", value: "example.contract-version.result" },
      requestId: { type: "nonempty-string" },
      value: { type: "literal", value: 1 },
    },
  },
  "event:example.observed": {
    fields: {
      contractVersion: { type: "literal", value: 1 },
      messageType: { type: "literal", value: "event" },
      kind: { type: "literal", value: "example.observed" },
      eventSequence: { type: "nonnegative-safe-integer" },
      changed: { type: "literal", value: false },
    },
  },
} as const satisfies Readonly<Record<string, RuntimeMessageSchema>>);

type ComparableManifest = Readonly<Record<string, Readonly<Record<string, string>>>>;

function descriptorText(schema: RuntimeFieldSchema): string {
  if (schema.type === "nonempty-string") return "nonempty-string";
  if (schema.type === "nonnegative-safe-integer") return "nonnegative-safe-integer";
  if (schema.value === null) return "literal:null";
  return `literal:${typeof schema.value}:${String(schema.value)}`;
}

const runtimeSchemaManifest: ComparableManifest = Object.fromEntries(
  Object.entries(runtimeSchemas).map(([variant, schema]) => [
    variant,
    Object.fromEntries(
      (Object.entries(schema.fields) as [string, RuntimeFieldSchema][]).map(
        ([field, fieldSchema]) => [field, descriptorText(fieldSchema)],
      ),
    ),
  ]),
);

function rejection(code: ContractRejectionCode): ContractValidationResult {
  return Object.freeze({ accepted: false, code });
}

function manifestRows(manifest: ComparableManifest): readonly string[] {
  return Object.entries(manifest)
    .flatMap(([variant, fields]) =>
      Object.entries(fields).map(([field, descriptor]) => `${variant}:${field}:${descriptor}`),
    )
    .sort();
}

export function contractManifestsAgree(
  typeManifest: ComparableManifest = contractTypeManifest,
  schemaManifest: ComparableManifest = runtimeSchemaManifest,
): boolean {
  try {
    const types = manifestRows(typeManifest);
    const schemas = manifestRows(schemaManifest);
    return (
      types.length === schemas.length && types.every((entry, index) => entry === schemas[index])
    );
  } catch {
    return false;
  }
}

export function assertContractSchemaParity(
  typeManifest?: ComparableManifest,
  schemaManifest?: ComparableManifest,
): void {
  if (!contractManifestsAgree(typeManifest, schemaManifest)) {
    throw new Error("CONTRACT_SCHEMA_DRIFT");
  }
}

type NormalizedRecord = Readonly<Record<string, unknown>>;

function normalizeOwnDataRecord(
  input: unknown,
):
  | { readonly accepted: true; readonly value: NormalizedRecord }
  | { readonly accepted: false; readonly code: ContractRejectionCode } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { accepted: false, code: "CONTRACT_MALFORMED" };
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return { accepted: false, code: "CONTRACT_MALFORMED" };
  }
  const normalized: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return { accepted: false, code: "CONTRACT_EXTRA_FIELD" };
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      return { accepted: false, code: "CONTRACT_MALFORMED" };
    }
    normalized[key] = descriptor.value;
  }
  return { accepted: true, value: normalized };
}

function validateField(value: unknown, schema: RuntimeFieldSchema): boolean {
  if (schema.type === "literal") return Object.is(value, schema.value);
  if (schema.type === "nonempty-string") {
    return typeof value === "string" && value.length > 0 && isWellFormedUnicode(value);
  }
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validateUnchecked(input: unknown): ContractValidationResult {
  if (!contractManifestsAgree()) return rejection("CONTRACT_SCHEMA_DRIFT");
  const normalized = normalizeOwnDataRecord(input);
  if (!normalized.accepted) return rejection(normalized.code);
  const record = normalized.value;

  if (!("contractVersion" in record) || !("messageType" in record) || !("kind" in record)) {
    return rejection("CONTRACT_MISSING_FIELD");
  }
  if (typeof record["contractVersion"] !== "number") return rejection("CONTRACT_WRONG_TYPE");
  if (record["contractVersion"] !== contractVersion) {
    return rejection("CONTRACT_UNSUPPORTED_VERSION");
  }
  if (typeof record["messageType"] !== "string" || typeof record["kind"] !== "string") {
    return rejection("CONTRACT_WRONG_TYPE");
  }

  const variant = `${record["messageType"]}:${record["kind"]}`;
  const schema = runtimeSchemas[variant as keyof typeof runtimeSchemas] as
    RuntimeMessageSchema | undefined;
  if (!schema) return rejection("CONTRACT_UNKNOWN_TAG");
  const expected = Object.keys(schema.fields);
  if (expected.some((field) => !(field in record))) return rejection("CONTRACT_MISSING_FIELD");
  if (Object.keys(record).some((field) => !Object.hasOwn(schema.fields, field))) {
    return rejection("CONTRACT_EXTRA_FIELD");
  }
  for (const [field, fieldSchema] of Object.entries(schema.fields)) {
    if (!validateField(record[field], fieldSchema)) return rejection("CONTRACT_WRONG_TYPE");
  }

  const accepted = Object.freeze(Object.fromEntries(Object.entries(record)));
  return { accepted: true, value: accepted as unknown as ExampleBoundaryMessage };
}

/** Strict, total, nonthrowing validation over unknown input. Accepted values are detached copies. */
export function validateExampleBoundaryMessage(input: unknown): ContractValidationResult {
  try {
    return validateUnchecked(input);
  } catch {
    return rejection("CONTRACT_MALFORMED");
  }
}
