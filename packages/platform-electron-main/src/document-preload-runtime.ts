import {
  decodeOverrideRenderDatasetCommand,
  decodeOverrideRenderDatasetCommandResult,
  decodeOverrideRenderDatasetQuery,
  decodeOverrideRenderDatasetQueryResult,
  type OverrideRenderDatasetCommandResult,
  type OverrideRenderDatasetQueryResult,
  type OverrideRenderDatasetRejectionReason,
  type OverrideHistoryNavigationCommand,
  type RevertDisplayValueOverrideCommand,
  type SetDisplayValueOverrideCommand,
} from "@rsrender/contracts";

import {
  DOCUMENT_BOOTSTRAP_CHANNEL,
  DOCUMENT_GET_PROJECTION_CHANNEL,
  DOCUMENT_REDO_CHANNEL,
  DOCUMENT_REVERT_DISPLAY_VALUE_CHANNEL,
  DOCUMENT_SET_DISPLAY_VALUE_CHANNEL,
  DOCUMENT_UNDO_CHANNEL,
} from "./document-route-contract.js";

declare const require: (name: "electron") => {
  readonly contextBridge: {
    readonly exposeInMainWorld: (name: string, value: unknown) => void;
  };
  readonly ipcRenderer: {
    readonly invoke: (channel: string, input?: unknown) => Promise<unknown>;
  };
};

const { contextBridge, ipcRenderer } = require("electron");
const unavailable = Object.freeze({ accepted: false, code: "DOCUMENT_ROUTE_UNAVAILABLE" } as const);
const dummyIdentity = "urn:rsrender:document-preload:validation";
const dummyRequestIdentity = "urn:rsrender:document-preload:validation-request";
const dummyRecordedAtUtc = "2000-01-01T00:00:00.000Z";

type Operation = "getProjection" | "setDisplayValue" | "revertDisplayValue" | "undo" | "redo";
type DataRecord = Readonly<Record<string, unknown>>;

function exactRecord(input: unknown, fields: readonly string[]): DataRecord | null {
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
    const prototype = Object.getPrototypeOf(input) as unknown;
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(input);
    if (
      keys.some((key) => typeof key !== "string" || !fields.includes(key)) ||
      fields.some((field) => !keys.includes(field))
    )
      return null;
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const field of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(input, field);
      if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable)
        return null;
      result[field] = descriptor.value;
    }
    return Object.freeze(result);
  } catch {
    return null;
  }
}

function boundedClone(input: unknown, result: boolean): unknown {
  const maximumBytes = result ? 4_194_304 : 65_536;
  const maximumDepth = result ? 64 : 32;
  const maximumNodes = result ? 65_536 : 4_096;
  const maximumEntries = result ? 65_536 : 256;
  const maximumStringBytes = result ? 1_048_576 : 16_384;
  try {
    let nodes = 0;
    const wellFormed = (value: string): boolean => {
      for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code >= 0xd800 && code <= 0xdbff) {
          const following = value.charCodeAt(index + 1);
          if (!(following >= 0xdc00 && following <= 0xdfff)) return false;
          index += 1;
        } else if (code >= 0xdc00 && code <= 0xdfff) return false;
      }
      return true;
    };
    const clone = (value: unknown, depth: number): unknown => {
      nodes += 1;
      if (nodes > maximumNodes || depth > maximumDepth) throw new Error("LIMIT");
      if (value === null || typeof value === "boolean") return value;
      if (typeof value === "string") {
        if (!wellFormed(value) || new TextEncoder().encode(value).byteLength > maximumStringBytes) {
          throw new Error("STRING");
        }
        return value;
      }
      if (typeof value === "number") {
        if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error("NUMBER");
        return value;
      }
      if (Array.isArray(value)) {
        if (value.length > maximumEntries) throw new Error("ENTRIES");
        const keys = Reflect.ownKeys(value);
        if (
          keys.some(
            (key) =>
              key !== "length" && (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/u.test(key)),
          )
        )
          throw new Error("ARRAY");
        const output: unknown[] = [];
        for (let index = 0; index < value.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
          if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
            throw new Error("ARRAY");
          }
          output.push(clone(descriptor.value, depth + 1));
        }
        return Object.freeze(output);
      }
      const record = exactRecord(value, Reflect.ownKeys(value as object).map(String));
      if (record === null || Object.keys(record).length > maximumEntries) throw new Error("RECORD");
      const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      for (const [key, entry] of Object.entries(record)) output[key] = clone(entry, depth + 1);
      return Object.freeze(output);
    };
    const cloned = clone(input, 0);
    const encoded = JSON.stringify(cloned);
    if (
      typeof encoded !== "string" ||
      new TextEncoder().encode(encoded).byteLength > maximumBytes
    ) {
      return null;
    }
    return cloned;
  } catch {
    return null;
  }
}

function pageArguments(operation: Operation, input: unknown): DataRecord | null {
  const detached = boundedClone(input, false);
  if (operation === "getProjection") {
    const record = exactRecord(detached, ["minimumWorkingRevision"]);
    if (record === null) return null;
    const decoded = decodeOverrideRenderDatasetQuery({
      contractVersion: 1,
      messageType: "query",
      scope: "document-domain",
      kind: "render-dataset.get",
      requestId: dummyRequestIdentity,
      documentId: dummyIdentity,
      ownerGeneration: 1,
      minimumWorkingRevision: record["minimumWorkingRevision"],
    });
    return decoded.accepted
      ? Object.freeze({ minimumWorkingRevision: decoded.value.minimumWorkingRevision })
      : null;
  }
  if (operation === "undo" || operation === "redo") {
    const record = exactRecord(detached, ["expectedWorkingRevision"]);
    if (record === null) return null;
    const kind = operation === "undo" ? "history.undo" : "history.redo";
    const decoded = decodeOverrideRenderDatasetCommand({
      contractVersion: 1,
      messageType: "command",
      scope: "document-domain",
      kind,
      requestId: dummyRequestIdentity,
      commandId: kind,
      documentId: dummyIdentity,
      ownerGeneration: 1,
      expectedWorkingRevision: record["expectedWorkingRevision"],
      payload: null,
    });
    return decoded.accepted
      ? Object.freeze({ expectedWorkingRevision: decoded.value.expectedWorkingRevision })
      : null;
  }
  if (operation === "revertDisplayValue") {
    const record = exactRecord(detached, [
      "expectedWorkingRevision",
      "localOverrideIdentity",
      "targetSourceFieldIdentity",
      "expectedOverrideRevision",
    ]);
    if (record === null) return null;
    const decoded = decodeOverrideRenderDatasetCommand({
      contractVersion: 1,
      messageType: "command",
      scope: "document-domain",
      kind: "presentation-override.revert-display-value",
      requestId: dummyRequestIdentity,
      commandId: "presentation-override.revert-display-value",
      documentId: dummyIdentity,
      ownerGeneration: 1,
      expectedWorkingRevision: record["expectedWorkingRevision"],
      payload: {
        localOverrideIdentity: record["localOverrideIdentity"],
        targetSourceFieldIdentity: record["targetSourceFieldIdentity"],
        expectedOverrideRevision: record["expectedOverrideRevision"],
      },
    });
    return decoded.accepted && decoded.value.kind === "presentation-override.revert-display-value"
      ? Object.freeze({
          expectedWorkingRevision: decoded.value.expectedWorkingRevision,
          localOverrideIdentity: decoded.value.payload.localOverrideIdentity,
          targetSourceFieldIdentity: decoded.value.payload.targetSourceFieldIdentity,
          expectedOverrideRevision: decoded.value.payload.expectedOverrideRevision,
        })
      : null;
  }
  const record = exactRecord(detached, [
    "expectedWorkingRevision",
    "localOverrideIdentity",
    "targetSourceFieldIdentity",
    "expectedSourceValueDigest",
    "expectedSourceValueType",
    "expectedSourceUnit",
    "replacementContent",
    "replacementUnit",
    "reason",
  ]);
  if (record === null) return null;
  const decoded = decodeOverrideRenderDatasetCommand({
    contractVersion: 1,
    messageType: "command",
    scope: "document-domain",
    kind: "presentation-override.set-display-value",
    requestId: dummyRequestIdentity,
    commandId: "presentation-override.set-display-value",
    documentId: dummyIdentity,
    ownerGeneration: 1,
    expectedWorkingRevision: record["expectedWorkingRevision"],
    payload: {
      localOverrideIdentity: record["localOverrideIdentity"],
      targetSourceFieldIdentity: record["targetSourceFieldIdentity"],
      expectedSourceValueDigest: record["expectedSourceValueDigest"],
      expectedSourceValueType: record["expectedSourceValueType"],
      expectedSourceUnit: record["expectedSourceUnit"],
      replacementContent: record["replacementContent"],
      replacementUnit: record["replacementUnit"],
      reason: record["reason"],
      authorIdentity: null,
      recordedAtUtc: dummyRecordedAtUtc,
    },
  });
  if (!decoded.accepted || decoded.value.kind !== "presentation-override.set-display-value") {
    return null;
  }
  return Object.freeze({
    expectedWorkingRevision: decoded.value.expectedWorkingRevision,
    localOverrideIdentity: decoded.value.payload.localOverrideIdentity,
    targetSourceFieldIdentity: decoded.value.payload.targetSourceFieldIdentity,
    expectedSourceValueDigest: decoded.value.payload.expectedSourceValueDigest,
    expectedSourceValueType: decoded.value.payload.expectedSourceValueType,
    expectedSourceUnit: decoded.value.payload.expectedSourceUnit,
    replacementContent: decoded.value.payload.replacementContent,
    replacementUnit: decoded.value.payload.replacementUnit,
    reason: decoded.value.payload.reason,
  });
}

const bootstrap = ipcRenderer
  .invoke(DOCUMENT_BOOTSTRAP_CHANNEL)
  .then((input) => {
    const record = exactRecord(input, [
      "accepted",
      "transportVersion",
      "generation",
      "capability",
      "documentIdentity",
      "documentOwnerIdentity",
      "ownerGeneration",
    ]);
    if (
      record === null ||
      record["accepted"] !== true ||
      record["transportVersion"] !== 1 ||
      !Number.isSafeInteger(record["generation"]) ||
      (record["generation"] as number) < 1 ||
      typeof record["capability"] !== "string" ||
      !/^[0-9a-f]{64}$/u.test(record["capability"]) ||
      typeof record["documentIdentity"] !== "string" ||
      typeof record["documentOwnerIdentity"] !== "string" ||
      !Number.isSafeInteger(record["ownerGeneration"]) ||
      (record["ownerGeneration"] as number) < 1
    )
      throw new Error("BOOTSTRAP");
    return Object.freeze({
      generation: record["generation"] as number,
      capability: record["capability"],
      documentIdentity: record["documentIdentity"],
      documentOwnerIdentity: record["documentOwnerIdentity"],
      ownerGeneration: record["ownerGeneration"] as number,
    });
  })
  .catch(() => null);

let sequence = Number("__RSRENDER_INITIAL_SEQUENCE_LITERAL__");
let inFlight = false;

function channelFor(operation: Operation): string {
  if (operation === "getProjection") return DOCUMENT_GET_PROJECTION_CHANNEL;
  if (operation === "setDisplayValue") return DOCUMENT_SET_DISPLAY_VALUE_CHANNEL;
  if (operation === "revertDisplayValue") return DOCUMENT_REVERT_DISPLAY_VALUE_CHANNEL;
  if (operation === "undo") return DOCUMENT_UNDO_CHANNEL;
  return DOCUMENT_REDO_CHANNEL;
}

async function call(operation: Operation, input: unknown, argumentCount: number): Promise<unknown> {
  if (argumentCount !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const args = pageArguments(operation, input);
  if (args === null) return unavailable;
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    let rawResponse: unknown;
    try {
      rawResponse = await ipcRenderer.invoke(channelFor(operation), {
        transportVersion: 1,
        capability: binding.capability,
        generation: binding.generation,
        sequence,
        documentIdentity: binding.documentIdentity,
        documentOwnerIdentity: binding.documentOwnerIdentity,
        ownerGeneration: binding.ownerGeneration,
        args,
      });
    } catch {
      return unavailable;
    }
    const response = exactRecord(rawResponse, [
      "accepted",
      "transportVersion",
      "generation",
      "sequence",
      "requestId",
      "result",
    ]);
    if (
      response === null ||
      response["accepted"] !== true ||
      response["transportVersion"] !== 1 ||
      response["generation"] !== binding.generation ||
      response["sequence"] !== sequence ||
      typeof response["requestId"] !== "string"
    )
      return unavailable;
    const detachedResult = boundedClone(response["result"], true);
    if (detachedResult === null) return unavailable;
    const decoded =
      operation === "getProjection"
        ? decodeOverrideRenderDatasetQueryResult(detachedResult)
        : decodeOverrideRenderDatasetCommandResult(detachedResult);
    if (!decoded.accepted || decoded.value.requestId !== response["requestId"]) return unavailable;
    if (decoded.value.kind === "override-render-dataset.rejected") {
      return Object.freeze({ accepted: false, code: decoded.value.reason });
    }
    if (
      decoded.value.documentId !== binding.documentIdentity ||
      decoded.value.ownerGeneration !== binding.ownerGeneration
    )
      return unavailable;
    if (operation === "getProjection") {
      if (decoded.value.kind !== "render-dataset.projection.result") return unavailable;
      if (
        args["minimumWorkingRevision"] !== null &&
        decoded.value.workingRevision < (args["minimumWorkingRevision"] as number)
      )
        return unavailable;
      return Object.freeze({
        accepted: true,
        kind: "projection",
        workingRevision: decoded.value.workingRevision,
        durableRevision: decoded.value.durableRevision,
        dirty: decoded.value.dirty,
        canUndo: decoded.value.canUndo,
        canRedo: decoded.value.canRedo,
        eventSequence: decoded.value.eventSequence,
        projection: decoded.value.projection,
      });
    }
    if (decoded.value.kind !== "override-render-dataset.committed") return unavailable;
    const expectedCommandId =
      operation === "setDisplayValue"
        ? "presentation-override.set-display-value"
        : operation === "revertDisplayValue"
          ? "presentation-override.revert-display-value"
          : operation === "undo"
            ? "history.undo"
            : "history.redo";
    const expectedOperation =
      operation === "setDisplayValue" || operation === "revertDisplayValue"
        ? "mutation"
        : operation === "undo"
          ? "undo"
          : "redo";
    return decoded.value.commandId === expectedCommandId &&
      decoded.value.operation === expectedOperation &&
      decoded.value.previousWorkingRevision === args["expectedWorkingRevision"] &&
      decoded.value.event.commandId === expectedCommandId &&
      decoded.value.event.operation === expectedOperation
      ? Object.freeze({
          accepted: true,
          kind: "committed",
          previousWorkingRevision: decoded.value.previousWorkingRevision,
          workingRevision: decoded.value.workingRevision,
          durableRevision: decoded.value.durableRevision,
          dirty: decoded.value.dirty,
          canUndo: decoded.value.canUndo,
          canRedo: decoded.value.canRedo,
          eventSequence: decoded.value.eventSequence,
          projection: decoded.value.projection,
          changed: true,
        })
      : unavailable;
  } finally {
    inFlight = false;
  }
}

const getProjection = Object.freeze(async function getProjection(input: unknown) {
  return call("getProjection", input, arguments.length);
});
const setDisplayValue = Object.freeze(async function setDisplayValue(input: unknown) {
  return call("setDisplayValue", input, arguments.length);
});
const revertDisplayValue = Object.freeze(async function revertDisplayValue(input: unknown) {
  return call("revertDisplayValue", input, arguments.length);
});
const undo = Object.freeze(async function undo(input: unknown) {
  return call("undo", input, arguments.length);
});
const redo = Object.freeze(async function redo(input: unknown) {
  return call("redo", input, arguments.length);
});
const documentApi = Object.freeze({
  getProjection,
  setDisplayValue,
  revertDisplayValue,
  undo,
  redo,
});

contextBridge.exposeInMainWorld("rsrender", Object.freeze({ document: documentApi }));

export type DocumentPreloadPublicResult =
  | Readonly<{
      readonly accepted: false;
      readonly code: OverrideRenderDatasetRejectionReason | "DOCUMENT_ROUTE_UNAVAILABLE";
    }>
  | Readonly<{
      readonly accepted: true;
      readonly kind: "projection";
      readonly workingRevision: number;
      readonly durableRevision: number;
      readonly dirty: boolean;
      readonly canUndo: boolean;
      readonly canRedo: boolean;
      readonly eventSequence: number;
      readonly projection: Extract<
        OverrideRenderDatasetQueryResult,
        { readonly kind: "render-dataset.projection.result" }
      >["projection"];
    }>
  | Readonly<{
      readonly accepted: true;
      readonly kind: "committed";
      readonly previousWorkingRevision: number;
      readonly workingRevision: number;
      readonly durableRevision: number;
      readonly dirty: boolean;
      readonly canUndo: boolean;
      readonly canRedo: boolean;
      readonly eventSequence: number;
      readonly projection: Extract<
        OverrideRenderDatasetCommandResult,
        { readonly kind: "override-render-dataset.committed" }
      >["projection"];
      readonly changed: true;
    }>;

export type DocumentPreloadProjectionInput = Readonly<{ minimumWorkingRevision: number | null }>;
export type DocumentPreloadSetDisplayValueInput = Readonly<
  Pick<SetDisplayValueOverrideCommand, "expectedWorkingRevision"> &
    Omit<SetDisplayValueOverrideCommand["payload"], "authorIdentity" | "recordedAtUtc">
>;
export type DocumentPreloadRevertDisplayValueInput = Readonly<
  Pick<RevertDisplayValueOverrideCommand, "expectedWorkingRevision"> &
    RevertDisplayValueOverrideCommand["payload"]
>;
export type DocumentPreloadHistoryInput = Readonly<
  Pick<OverrideHistoryNavigationCommand, "expectedWorkingRevision">
>;

export interface DocumentPreloadApi {
  readonly getProjection: (
    input: DocumentPreloadProjectionInput,
  ) => Promise<DocumentPreloadPublicResult>;
  readonly setDisplayValue: (
    input: DocumentPreloadSetDisplayValueInput,
  ) => Promise<DocumentPreloadPublicResult>;
  readonly revertDisplayValue: (
    input: DocumentPreloadRevertDisplayValueInput,
  ) => Promise<DocumentPreloadPublicResult>;
  readonly undo: (input: DocumentPreloadHistoryInput) => Promise<DocumentPreloadPublicResult>;
  readonly redo: (input: DocumentPreloadHistoryInput) => Promise<DocumentPreloadPublicResult>;
}
