import { canonicalizeJson } from "./canonical-json.js";
import { defineOpaqueIdentityCodec, parseOpaqueIdentity } from "./identity.js";
import {
  applicationRequestIdentityCodec,
  applicationServiceContractVersion,
  isOwnerGeneration,
  isWorkingRevision,
  validateApplicationServiceCommand,
} from "./application-service-contract.js";
import { isSha256Digest } from "./sha256.js";
import type {
  ApplicationRequestIdentity,
  OwnerGeneration,
  SyntheticReplaceTemplateContentCommand,
  WorkingRevision,
} from "./application-service-contract.js";
import type { OpaqueIdentity } from "./identity.js";
import type { Sha256Digest } from "./sha256.js";

export const historyCoreContractRevision = "bld-011-v1" as const;
export const historyCoreContractVersion = 1 as const;
export const historyUndoCommandId = "history.undo" as const;
export const historyRedoCommandId = "history.redo" as const;

export type HistoryEntryIdentity = OpaqueIdentity<"HistoryEntryIdentity">;
export type CapturedRevisionIdentity = OpaqueIdentity<"CapturedRevisionIdentity">;
export type DurableRevision = number & { readonly __durableRevision: unique symbol };
export type HistoryCursor = number & { readonly __historyCursor: unique symbol };

export const historyEntryIdentityCodec = defineOpaqueIdentityCodec("HistoryEntryIdentity");
export const capturedRevisionIdentityCodec = defineOpaqueIdentityCodec("CapturedRevisionIdentity");

export interface HistoryUndoCommand {
  readonly contractVersion: 1;
  readonly messageType: "command";
  readonly scope: "document-domain";
  readonly kind: "history.undo";
  readonly requestId: ApplicationRequestIdentity;
  readonly commandId: "history.undo";
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly expectedWorkingRevision: WorkingRevision;
  readonly payload: null;
}

export interface HistoryRedoCommand {
  readonly contractVersion: 1;
  readonly messageType: "command";
  readonly scope: "document-domain";
  readonly kind: "history.redo";
  readonly requestId: ApplicationRequestIdentity;
  readonly commandId: "history.redo";
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly expectedWorkingRevision: WorkingRevision;
  readonly payload: null;
}

export type HistoryCoreCommand =
  SyntheticReplaceTemplateContentCommand | HistoryUndoCommand | HistoryRedoCommand;

export type HistoryOperation = "mutation" | "undo" | "redo";

export interface HistoryCoreCommittedResult {
  readonly contractVersion: 1;
  readonly messageType: "command-result";
  readonly kind: "history.committed";
  readonly requestId: ApplicationRequestIdentity;
  readonly commandId: "synthetic.template-content.replace" | "history.undo" | "history.redo";
  readonly operation: HistoryOperation;
  readonly documentId: string;
  readonly ownerGeneration: OwnerGeneration;
  readonly previousWorkingRevision: WorkingRevision;
  readonly workingRevision: WorkingRevision;
  readonly durableRevision: DurableRevision;
  readonly historyEntryIdentity: HistoryEntryIdentity;
  readonly historyCursor: HistoryCursor;
  readonly historyLength: HistoryCursor;
  readonly aggregateDigest: Sha256Digest;
  readonly dirty: boolean;
  readonly changed: true;
}

export type HistoryCoreRejectionReason =
  | "CAPACITY_EXHAUSTED"
  | "CONTRACT_MALFORMED"
  | "CONTRACT_UNSUPPORTED_VERSION"
  | "DOCUMENT_IDENTITY_MISMATCH"
  | "DOMAIN_PRECONDITION_FAILED"
  | "NOTHING_TO_REDO"
  | "NOTHING_TO_UNDO"
  | "OWNER_GENERATION_MISMATCH"
  | "REQUEST_ID_REUSE_MISMATCH"
  | "STALE_WORKING_REVISION"
  | "UNKNOWN_COMMAND";

export interface HistoryCoreRejectedResult {
  readonly contractVersion: 1;
  readonly messageType: "command-result";
  readonly kind: "history.rejected";
  readonly requestId: ApplicationRequestIdentity | null;
  readonly reason: HistoryCoreRejectionReason;
  readonly changed: false;
  readonly safeActions: readonly [];
}

export type HistoryCoreCommandResult = HistoryCoreCommittedResult | HistoryCoreRejectedResult;

export type HistoryCoreContractRejectionCode =
  | "HISTORY_CONTRACT_EXTRA_FIELD"
  | "HISTORY_CONTRACT_MALFORMED"
  | "HISTORY_CONTRACT_MISSING_FIELD"
  | "HISTORY_CONTRACT_UNKNOWN_TAG"
  | "HISTORY_CONTRACT_UNSUPPORTED_VERSION"
  | "HISTORY_CONTRACT_WRONG_TYPE";

export type HistoryCoreValidationResult<Value> =
  | { readonly accepted: true; readonly value: Value }
  | { readonly accepted: false; readonly code: HistoryCoreContractRejectionCode };

type DataRecord = Readonly<Record<string, unknown>>;

function reject<Value>(code: HistoryCoreContractRejectionCode): HistoryCoreValidationResult<Value> {
  return Object.freeze({ accepted: false, code });
}

function ownDataRecord(input: unknown): DataRecord | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) return null;
  const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
    copy[key] = descriptor.value;
  }
  return copy;
}

function hasExactKeys(record: DataRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((entry, index) => entry === sortedExpected[index])
  );
}

function isIdentity(value: unknown): value is string {
  try {
    parseOpaqueIdentity(value);
    return true;
  } catch {
    return false;
  }
}

function validateHistoryNavigationCommand(
  input: unknown,
): HistoryCoreValidationResult<HistoryUndoCommand | HistoryRedoCommand> {
  const record = ownDataRecord(input);
  if (record === null) return reject("HISTORY_CONTRACT_MALFORMED");
  const required = [
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
  ] as const;
  if (required.some((field) => !Object.hasOwn(record, field))) {
    return reject("HISTORY_CONTRACT_MISSING_FIELD");
  }
  if (!hasExactKeys(record, required)) return reject("HISTORY_CONTRACT_EXTRA_FIELD");
  if (typeof record["contractVersion"] !== "number") {
    return reject("HISTORY_CONTRACT_WRONG_TYPE");
  }
  if (record["contractVersion"] !== historyCoreContractVersion) {
    return reject("HISTORY_CONTRACT_UNSUPPORTED_VERSION");
  }
  const kind = record["kind"];
  if (kind !== historyUndoCommandId && kind !== historyRedoCommandId) {
    return reject("HISTORY_CONTRACT_UNKNOWN_TAG");
  }
  if (
    record["messageType"] !== "command" ||
    record["scope"] !== "document-domain" ||
    record["commandId"] !== kind ||
    !isIdentity(record["requestId"]) ||
    !isIdentity(record["documentId"]) ||
    !isOwnerGeneration(record["ownerGeneration"]) ||
    !isWorkingRevision(record["expectedWorkingRevision"]) ||
    record["payload"] !== null
  ) {
    return reject("HISTORY_CONTRACT_WRONG_TYPE");
  }
  const common = {
    contractVersion: historyCoreContractVersion,
    messageType: "command" as const,
    scope: "document-domain" as const,
    requestId: record["requestId"] as ApplicationRequestIdentity,
    documentId: record["documentId"],
    ownerGeneration: record["ownerGeneration"],
    expectedWorkingRevision: record["expectedWorkingRevision"],
    payload: null,
  };
  const value: HistoryUndoCommand | HistoryRedoCommand =
    kind === historyUndoCommandId
      ? Object.freeze({ ...common, kind, commandId: kind })
      : Object.freeze({ ...common, kind, commandId: kind });
  return Object.freeze({ accepted: true, value });
}

function mapApplicationContractCode(code: string): HistoryCoreContractRejectionCode {
  if (code === "APPLICATION_CONTRACT_EXTRA_FIELD") return "HISTORY_CONTRACT_EXTRA_FIELD";
  if (code === "APPLICATION_CONTRACT_MISSING_FIELD") return "HISTORY_CONTRACT_MISSING_FIELD";
  if (code === "APPLICATION_CONTRACT_UNSUPPORTED_VERSION") {
    return "HISTORY_CONTRACT_UNSUPPORTED_VERSION";
  }
  if (code === "APPLICATION_CONTRACT_UNKNOWN_TAG") return "HISTORY_CONTRACT_UNKNOWN_TAG";
  if (code === "APPLICATION_CONTRACT_WRONG_TYPE") return "HISTORY_CONTRACT_WRONG_TYPE";
  return "HISTORY_CONTRACT_MALFORMED";
}

export function validateHistoryCoreCommand(
  input: unknown,
): HistoryCoreValidationResult<HistoryCoreCommand> {
  try {
    const record = ownDataRecord(input);
    if (record === null) return reject("HISTORY_CONTRACT_MALFORMED");
    if (record["kind"] === historyUndoCommandId || record["kind"] === historyRedoCommandId) {
      return validateHistoryNavigationCommand(input);
    }
    const applicationResult = validateApplicationServiceCommand(input);
    if (!applicationResult.accepted)
      return reject(mapApplicationContractCode(applicationResult.code));
    if (applicationResult.value.contractVersion !== applicationServiceContractVersion) {
      return reject("HISTORY_CONTRACT_UNSUPPORTED_VERSION");
    }
    return Object.freeze({ accepted: true, value: applicationResult.value });
  } catch {
    return reject("HISTORY_CONTRACT_MALFORMED");
  }
}

export function canonicalHistoryCoreCommand(input: HistoryCoreCommand): string {
  return canonicalizeJson(input);
}

export function isDurableRevision(value: unknown): value is DurableRevision {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function parseDurableRevision(value: unknown): DurableRevision {
  if (!isDurableRevision(value)) throw new RangeError("DURABLE_REVISION_INVALID");
  return value;
}

export function isHistoryCursor(value: unknown): value is HistoryCursor {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function parseHistoryCursor(value: unknown): HistoryCursor {
  if (!isHistoryCursor(value)) throw new RangeError("HISTORY_CURSOR_INVALID");
  return value;
}

export const historyCoreSchemaManifest = Object.freeze({
  "command:synthetic.template-content.replace": Object.freeze([
    "commandId",
    "contractVersion",
    "documentId",
    "expectedWorkingRevision",
    "kind",
    "messageType",
    "ownerGeneration",
    "payload",
    "requestId",
    "scope",
  ]),
  "command:history.undo": Object.freeze([
    "commandId",
    "contractVersion",
    "documentId",
    "expectedWorkingRevision",
    "kind",
    "messageType",
    "ownerGeneration",
    "payload",
    "requestId",
    "scope",
  ]),
  "command:history.redo": Object.freeze([
    "commandId",
    "contractVersion",
    "documentId",
    "expectedWorkingRevision",
    "kind",
    "messageType",
    "ownerGeneration",
    "payload",
    "requestId",
    "scope",
  ]),
  "command-result:history.committed": Object.freeze([
    "aggregateDigest",
    "changed",
    "commandId",
    "contractVersion",
    "dirty",
    "documentId",
    "durableRevision",
    "historyCursor",
    "historyEntryIdentity",
    "historyLength",
    "kind",
    "messageType",
    "operation",
    "ownerGeneration",
    "previousWorkingRevision",
    "requestId",
    "workingRevision",
  ]),
  "command-result:history.rejected": Object.freeze([
    "changed",
    "contractVersion",
    "kind",
    "messageType",
    "reason",
    "requestId",
    "safeActions",
  ]),
});

export function isHistoryCoreCommittedResult(input: unknown): input is HistoryCoreCommittedResult {
  try {
    const record = ownDataRecord(input);
    if (record === null) return false;
    const expected = historyCoreSchemaManifest["command-result:history.committed"];
    const operationMatchesCommand =
      (record["operation"] === "mutation" &&
        record["commandId"] === "synthetic.template-content.replace") ||
      (record["operation"] === "undo" && record["commandId"] === historyUndoCommandId) ||
      (record["operation"] === "redo" && record["commandId"] === historyRedoCommandId);
    const revisionsArePossible =
      isWorkingRevision(record["previousWorkingRevision"]) &&
      isWorkingRevision(record["workingRevision"]) &&
      record["previousWorkingRevision"] < Number.MAX_SAFE_INTEGER &&
      record["workingRevision"] === record["previousWorkingRevision"] + 1 &&
      isDurableRevision(record["durableRevision"]) &&
      record["durableRevision"] <= record["previousWorkingRevision"];
    const cursorIsPossible =
      isHistoryCursor(record["historyCursor"]) &&
      isHistoryCursor(record["historyLength"]) &&
      record["historyCursor"] <= record["historyLength"] &&
      ((record["operation"] === "mutation" &&
        record["historyCursor"] > 0 &&
        record["historyCursor"] === record["historyLength"]) ||
        (record["operation"] === "undo" &&
          record["historyLength"] > 0 &&
          record["historyCursor"] < record["historyLength"]) ||
        (record["operation"] === "redo" && record["historyCursor"] > 0));
    return (
      hasExactKeys(record, expected) &&
      record["contractVersion"] === 1 &&
      record["messageType"] === "command-result" &&
      record["kind"] === "history.committed" &&
      applicationRequestIdentityCodec.is(record["requestId"]) &&
      (record["commandId"] === "synthetic.template-content.replace" ||
        record["commandId"] === historyUndoCommandId ||
        record["commandId"] === historyRedoCommandId) &&
      operationMatchesCommand &&
      isIdentity(record["documentId"]) &&
      isOwnerGeneration(record["ownerGeneration"]) &&
      revisionsArePossible &&
      historyEntryIdentityCodec.is(record["historyEntryIdentity"]) &&
      cursorIsPossible &&
      isSha256Digest(record["aggregateDigest"]) &&
      record["dirty"] ===
        (Number(record["workingRevision"]) !== Number(record["durableRevision"])) &&
      record["changed"] === true
    );
  } catch {
    return false;
  }
}

const historyCoreRejectionReasons = Object.freeze([
  "CAPACITY_EXHAUSTED",
  "CONTRACT_MALFORMED",
  "CONTRACT_UNSUPPORTED_VERSION",
  "DOCUMENT_IDENTITY_MISMATCH",
  "DOMAIN_PRECONDITION_FAILED",
  "NOTHING_TO_REDO",
  "NOTHING_TO_UNDO",
  "OWNER_GENERATION_MISMATCH",
  "REQUEST_ID_REUSE_MISMATCH",
  "STALE_WORKING_REVISION",
  "UNKNOWN_COMMAND",
] as const satisfies readonly HistoryCoreRejectionReason[]);

function isExactEmptyArray(input: unknown): input is readonly [] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) return false;
  return input.length === 0 && Reflect.ownKeys(input).every((key) => key === "length");
}

export function isHistoryCoreRejectedResult(input: unknown): input is HistoryCoreRejectedResult {
  try {
    const record = ownDataRecord(input);
    if (record === null) return false;
    return (
      hasExactKeys(record, historyCoreSchemaManifest["command-result:history.rejected"]) &&
      record["contractVersion"] === 1 &&
      record["messageType"] === "command-result" &&
      record["kind"] === "history.rejected" &&
      (record["requestId"] === null || applicationRequestIdentityCodec.is(record["requestId"])) &&
      historyCoreRejectionReasons.some((reason) => reason === record["reason"]) &&
      record["changed"] === false &&
      isExactEmptyArray(record["safeActions"])
    );
  } catch {
    return false;
  }
}

export function validateHistoryCoreResult(
  input: unknown,
): HistoryCoreValidationResult<HistoryCoreCommandResult> {
  if (isHistoryCoreCommittedResult(input)) {
    return Object.freeze({ accepted: true, value: Object.freeze({ ...input }) });
  }
  if (isHistoryCoreRejectedResult(input)) {
    return Object.freeze({
      accepted: true,
      value: Object.freeze({ ...input, safeActions: Object.freeze([] as const) }),
    });
  }
  return reject("HISTORY_CONTRACT_MALFORMED");
}
