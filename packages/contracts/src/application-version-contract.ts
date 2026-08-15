import { applicationRequestIdentityCodec } from "./application-service-contract.js";
import type { ApplicationRequestIdentity } from "./application-service-contract.js";

export const applicationVersionContractRevision = "bld-012-v1" as const;
export const applicationVersionContractVersion = 1 as const;
export const applicationVersionQueryKind = "application.version" as const;
export const applicationVersionResultKind = "application.version.result" as const;

export type ApplicationVersion = string & { readonly __applicationVersion: unique symbol };

export interface ApplicationVersionQuery {
  readonly contractVersion: 1;
  readonly messageType: "query";
  readonly kind: "application.version";
  readonly scope: "application";
  readonly requestId: ApplicationRequestIdentity;
}

export interface ApplicationVersionResult {
  readonly contractVersion: 1;
  readonly messageType: "query-result";
  readonly kind: "application.version.result";
  readonly requestId: ApplicationRequestIdentity;
  readonly version: ApplicationVersion;
}

export type ApplicationVersionContractCode =
  | "APPLICATION_VERSION_CONTRACT_MALFORMED"
  | "APPLICATION_VERSION_CONTRACT_UNSUPPORTED_VERSION"
  | "APPLICATION_VERSION_INVALID";

export type ApplicationVersionValidationResult<T> =
  | { readonly accepted: true; readonly value: T }
  | { readonly accepted: false; readonly code: ApplicationVersionContractCode };

const semanticVersion =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;

function ownDataRecord(
  input: unknown,
  fields: readonly string[],
): Readonly<Record<string, unknown>> | null {
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
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
      result[field] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function rejected<T>(code: ApplicationVersionContractCode): ApplicationVersionValidationResult<T> {
  return Object.freeze({ accepted: false, code });
}

export function isApplicationVersion(input: unknown): input is ApplicationVersion {
  return (
    typeof input === "string" &&
    input.length >= 1 &&
    input.length <= 128 &&
    semanticVersion.test(input)
  );
}

export function parseApplicationVersion(input: unknown): ApplicationVersion {
  if (!isApplicationVersion(input)) throw new Error("APPLICATION_VERSION_INVALID");
  return input;
}

export function createApplicationVersionQuery(
  requestId: unknown,
): ApplicationVersionValidationResult<ApplicationVersionQuery> {
  try {
    return Object.freeze({
      accepted: true,
      value: Object.freeze({
        contractVersion: applicationVersionContractVersion,
        messageType: "query",
        kind: applicationVersionQueryKind,
        scope: "application",
        requestId: applicationRequestIdentityCodec.parse(requestId),
      }),
    });
  } catch {
    return rejected("APPLICATION_VERSION_CONTRACT_MALFORMED");
  }
}

export function validateApplicationVersionQuery(
  input: unknown,
): ApplicationVersionValidationResult<ApplicationVersionQuery> {
  const record = ownDataRecord(input, [
    "contractVersion",
    "messageType",
    "kind",
    "scope",
    "requestId",
  ]);
  if (record === null) return rejected("APPLICATION_VERSION_CONTRACT_MALFORMED");
  if (record["contractVersion"] !== applicationVersionContractVersion) {
    return rejected("APPLICATION_VERSION_CONTRACT_UNSUPPORTED_VERSION");
  }
  if (
    record["messageType"] !== "query" ||
    record["kind"] !== applicationVersionQueryKind ||
    record["scope"] !== "application"
  ) {
    return rejected("APPLICATION_VERSION_CONTRACT_MALFORMED");
  }
  return createApplicationVersionQuery(record["requestId"]);
}

export function createApplicationVersionResult(input: {
  readonly requestId: unknown;
  readonly version: unknown;
}): ApplicationVersionValidationResult<ApplicationVersionResult> {
  try {
    return Object.freeze({
      accepted: true,
      value: Object.freeze({
        contractVersion: applicationVersionContractVersion,
        messageType: "query-result",
        kind: applicationVersionResultKind,
        requestId: applicationRequestIdentityCodec.parse(input.requestId),
        version: parseApplicationVersion(input.version),
      }),
    });
  } catch {
    return rejected("APPLICATION_VERSION_INVALID");
  }
}

export function validateApplicationVersionResult(
  input: unknown,
): ApplicationVersionValidationResult<ApplicationVersionResult> {
  const record = ownDataRecord(input, [
    "contractVersion",
    "messageType",
    "kind",
    "requestId",
    "version",
  ]);
  if (record === null) return rejected("APPLICATION_VERSION_CONTRACT_MALFORMED");
  if (record["contractVersion"] !== applicationVersionContractVersion) {
    return rejected("APPLICATION_VERSION_CONTRACT_UNSUPPORTED_VERSION");
  }
  if (record["messageType"] !== "query-result" || record["kind"] !== applicationVersionResultKind) {
    return rejected("APPLICATION_VERSION_CONTRACT_MALFORMED");
  }
  return createApplicationVersionResult({
    requestId: record["requestId"],
    version: record["version"],
  });
}
