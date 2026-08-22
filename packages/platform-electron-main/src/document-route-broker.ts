import {
  applicationRequestIdentityCodec,
  type ApplicationRequestIdentity,
} from "@rsrender/contracts";

import type { DocumentSessionInvocationResult } from "./document-session.js";
import { DocumentSession } from "./document-session.js";
import { DOCUMENT_ROUTE_URL } from "./document-route-contract.js";

export {
  DOCUMENT_BOOTSTRAP_CHANNEL,
  DOCUMENT_GET_PROJECTION_CHANNEL,
  DOCUMENT_REDO_CHANNEL,
  DOCUMENT_ROUTE_URL,
  DOCUMENT_SET_DISPLAY_VALUE_CHANNEL,
  DOCUMENT_UNDO_CHANNEL,
  documentRouteTransportRevision,
} from "./document-route-contract.js";

export const DOCUMENT_ROUTE_INPUT_LIMITS = Object.freeze({
  maximumUtf8Bytes: 65_536,
  maximumDepth: 32,
  maximumNodes: 4_096,
  maximumContainerEntries: 256,
  maximumStringUtf8Bytes: 16_384,
} as const);
export const DOCUMENT_ROUTE_RESULT_LIMITS = Object.freeze({
  maximumUtf8Bytes: 4_194_304,
  maximumDepth: 64,
  maximumNodes: 65_536,
  maximumContainerEntries: 65_536,
  maximumStringUtf8Bytes: 1_048_576,
} as const);

export type DocumentRouteOperation = "getProjection" | "setDisplayValue" | "undo" | "redo";

export type DocumentRouteTransportRejectionCode =
  | "BOOTSTRAP_ALREADY_ISSUED"
  | "CAPABILITY_INVALID"
  | "CAPABILITY_STALE"
  | "CROSS_WINDOW"
  | "DOCUMENT_OWNER_INVALID"
  | "FRAME_INVALID"
  | "GENERATION_INVALID"
  | "OPERATION_IN_FLIGHT"
  | "ORIGIN_ROUTE_INVALID"
  | "PAGE_ARGUMENT_INVALID"
  | "REQUEST_ID_INVALID"
  | "SEQUENCE_EXHAUSTED"
  | "SEQUENCE_INVALID"
  | "SEQUENCE_REPLAYED"
  | "SENDER_INVALID"
  | "SESSION_CLOSED"
  | "SESSION_RESULT_INVALID"
  | "TRANSPORT_MALFORMED"
  | "TRANSPORT_UNSUPPORTED_VERSION"
  | "WINDOW_NOT_LIVE";

export interface DocumentRouteContext {
  readonly window: object | null;
  readonly webContents: object;
  readonly frame: object | null;
  readonly mainFrame: object | null;
  readonly url: string;
  readonly windowLive: boolean;
  readonly webContentsLive: boolean;
}

export type DocumentRouteBootstrapResult =
  | {
      readonly accepted: true;
      readonly transportVersion: 1;
      readonly generation: number;
      readonly capability: string;
      readonly documentIdentity: string;
      readonly documentOwnerIdentity: string;
      readonly ownerGeneration: number;
    }
  | { readonly accepted: false; readonly code: DocumentRouteTransportRejectionCode };

export type DocumentRouteTransportResult =
  | {
      readonly accepted: true;
      readonly transportVersion: 1;
      readonly generation: number;
      readonly sequence: number;
      readonly requestId: ApplicationRequestIdentity;
      readonly result: Extract<
        DocumentSessionInvocationResult,
        { readonly accepted: true }
      >["result"];
    }
  | { readonly accepted: false; readonly code: DocumentRouteTransportRejectionCode };

export type DocumentRouteBrokerCreationResult =
  | { readonly accepted: true; readonly broker: DocumentRouteBroker }
  | { readonly accepted: false; readonly code: "BROKER_CONFIGURATION_INVALID" };

type Binding = {
  readonly capability: string;
  readonly generation: number;
  readonly frame: object;
  readonly documentIdentity: string;
  readonly documentOwnerIdentity: string;
  readonly ownerGeneration: number;
  nextSequence: number;
  inFlight: boolean;
};

type DataRecord = Readonly<Record<string, unknown>>;

function rejection(code: DocumentRouteTransportRejectionCode): DocumentRouteTransportResult {
  return Object.freeze({ accepted: false, code });
}

function ownDataRecord(input: unknown, fields: readonly string[]): DataRecord | null {
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
    const entries: Array<readonly [string, unknown]> = [];
    for (const field of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(input, field);
      if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable)
        return null;
      entries.push([field, descriptor.value]);
    }
    return Object.freeze(Object.fromEntries(entries));
  } catch {
    return null;
  }
}

function ownDataValue(input: unknown, field: string): unknown {
  try {
    if (typeof input !== "object" || input === null) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    return descriptor !== undefined && "value" in descriptor && descriptor.enumerable
      ? descriptor.value
      : undefined;
  } catch {
    return undefined;
  }
}

function parseContext(input: unknown): DocumentRouteContext | null {
  const record = ownDataRecord(input, [
    "window",
    "webContents",
    "frame",
    "mainFrame",
    "url",
    "windowLive",
    "webContentsLive",
  ]);
  if (
    record === null ||
    (record["window"] !== null && typeof record["window"] !== "object") ||
    typeof record["webContents"] !== "object" ||
    record["webContents"] === null ||
    (record["frame"] !== null && typeof record["frame"] !== "object") ||
    (record["mainFrame"] !== null && typeof record["mainFrame"] !== "object") ||
    typeof record["url"] !== "string" ||
    typeof record["windowLive"] !== "boolean" ||
    typeof record["webContentsLive"] !== "boolean"
  ) {
    return null;
  }
  return Object.freeze({
    window: record["window"],
    webContents: record["webContents"],
    frame: record["frame"],
    mainFrame: record["mainFrame"],
    url: record["url"],
    windowLive: record["windowLive"],
    webContentsLive: record["webContentsLive"],
  });
}

function isPositiveSafeInteger(input: unknown): input is number {
  return (
    typeof input === "number" && Number.isSafeInteger(input) && input > 0 && !Object.is(input, -0)
  );
}

function isCapability(input: unknown): input is string {
  return typeof input === "string" && /^[0-9a-f]{64}$/u.test(input);
}

function wellFormedUnicode(input: string): boolean {
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const following = input.charCodeAt(index + 1);
      if (!(following >= 0xdc00 && following <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

type BoundedGraphResult =
  { readonly accepted: true; readonly value: unknown } | { readonly accepted: false };

function boundedOwnDataGraph(
  input: unknown,
  limits: {
    readonly maximumUtf8Bytes: number;
    readonly maximumDepth: number;
    readonly maximumNodes: number;
    readonly maximumContainerEntries: number;
    readonly maximumStringUtf8Bytes: number;
  },
): BoundedGraphResult {
  try {
    const encoder = new TextEncoder();
    const ancestors = new Set<object>();
    let nodes = 0;
    const clone = (value: unknown, depth: number): unknown => {
      if (depth > limits.maximumDepth) throw new Error("DEPTH");
      nodes += 1;
      if (nodes > limits.maximumNodes) throw new Error("NODES");
      if (value === null || typeof value === "boolean") return value;
      if (typeof value === "number") {
        if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error("NUMBER");
        return value;
      }
      if (typeof value === "string") {
        if (!wellFormedUnicode(value)) throw new Error("UNICODE");
        const stringBytes = encoder.encode(value).byteLength;
        if (stringBytes > limits.maximumStringUtf8Bytes) throw new Error("STRING");
        return value;
      }
      if (typeof value === "object") {
        if (ancestors.has(value)) throw new Error("CYCLE");
        ancestors.add(value);
        const prototype = Object.getPrototypeOf(value) as unknown;
        if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
          throw new Error("PROTOTYPE");
        }
        const keys = Reflect.ownKeys(value);
        const entryCount = Array.isArray(value) ? keys.length - 1 : keys.length;
        if (entryCount > limits.maximumContainerEntries) throw new Error("ENTRIES");
        if (keys.some((key) => typeof key !== "string")) throw new Error("SYMBOL");
        const stringKeys = keys as string[];
        if (Array.isArray(value)) {
          if (stringKeys.some((key) => key !== "length" && !/^(0|[1-9][0-9]*)$/u.test(key)))
            throw new Error("ARRAY_KEY");
          if (value.length > limits.maximumContainerEntries) throw new Error("ARRAY_LENGTH");
          const output: unknown[] = [];
          for (let index = 0; index < value.length; index += 1) {
            const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
            if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
              throw new Error("ARRAY_DESCRIPTOR");
            }
            output.push(clone(descriptor.value, depth + 1));
          }
          ancestors.delete(value);
          return Object.freeze(output);
        }
        const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
        for (const key of stringKeys) {
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable)
            throw new Error("DESCRIPTOR");
          if (!wellFormedUnicode(key)) throw new Error("KEY_UNICODE");
          const keyBytes = encoder.encode(key).byteLength;
          if (keyBytes > limits.maximumStringUtf8Bytes) throw new Error("KEY");
          output[key] = clone(descriptor.value, depth + 1);
        }
        ancestors.delete(value);
        return Object.freeze(output);
      }
      throw new Error("TYPE");
    };
    const value = clone(input, 0);
    const serialized = JSON.stringify(value);
    return typeof serialized === "string" &&
      encoder.encode(serialized).byteLength <= limits.maximumUtf8Bytes
      ? Object.freeze({ accepted: true, value })
      : Object.freeze({ accepted: false });
  } catch {
    return Object.freeze({ accepted: false });
  }
}

function exactDocumentRouteUrl(input: string): boolean {
  return input === DOCUMENT_ROUTE_URL;
}

export class DocumentRouteBroker {
  readonly #expectedWindow: object;
  readonly #expectedWebContents: object;
  readonly #session: DocumentSession;
  readonly #createCapability: () => string;
  readonly #createRequestId: (input: {
    readonly operation: DocumentRouteOperation;
    readonly generation: number;
    readonly sequence: number;
  }) => unknown;
  #generation = 0;
  #binding: Binding | null = null;
  #bootstrapReserved = false;
  #lifecycleEpoch = 1;

  private constructor(input: {
    readonly expectedWindow: object;
    readonly expectedWebContents: object;
    readonly session: DocumentSession;
    readonly createCapability: () => string;
    readonly createRequestId: (input: {
      readonly operation: DocumentRouteOperation;
      readonly generation: number;
      readonly sequence: number;
    }) => unknown;
  }) {
    this.#expectedWindow = input.expectedWindow;
    this.#expectedWebContents = input.expectedWebContents;
    this.#session = input.session;
    this.#createCapability = input.createCapability;
    this.#createRequestId = input.createRequestId;
  }

  static create(input: unknown): DocumentRouteBrokerCreationResult {
    const record = ownDataRecord(input, [
      "expectedWindow",
      "expectedWebContents",
      "session",
      "createCapability",
      "createRequestId",
    ]);
    if (
      record === null ||
      typeof record["expectedWindow"] !== "object" ||
      record["expectedWindow"] === null ||
      typeof record["expectedWebContents"] !== "object" ||
      record["expectedWebContents"] === null ||
      !(record["session"] instanceof DocumentSession) ||
      typeof record["createCapability"] !== "function" ||
      typeof record["createRequestId"] !== "function"
    ) {
      return Object.freeze({ accepted: false, code: "BROKER_CONFIGURATION_INVALID" });
    }
    const createCapability = record["createCapability"] as () => string;
    const createRequestId = record["createRequestId"] as (input: {
      readonly operation: DocumentRouteOperation;
      readonly generation: number;
      readonly sequence: number;
    }) => unknown;
    return Object.freeze({
      accepted: true,
      broker: new DocumentRouteBroker({
        expectedWindow: record["expectedWindow"],
        expectedWebContents: record["expectedWebContents"],
        session: record["session"],
        createCapability: () => createCapability(),
        createRequestId: (value) => createRequestId(value),
      }),
    });
  }

  public bootstrap(contextInput: unknown): DocumentRouteBootstrapResult {
    const context = parseContext(contextInput);
    if (context === null) return Object.freeze({ accepted: false, code: "WINDOW_NOT_LIVE" });
    const contextFailure = this.#validateContext(context, null);
    if (contextFailure !== null) return Object.freeze({ accepted: false, code: contextFailure });
    if (this.#binding !== null || this.#bootstrapReserved) {
      return Object.freeze({ accepted: false, code: "BOOTSTRAP_ALREADY_ISSUED" });
    }
    if (context.frame === null) return Object.freeze({ accepted: false, code: "FRAME_INVALID" });
    const session = this.#session.snapshot();
    if (session.closed) return Object.freeze({ accepted: false, code: "SESSION_CLOSED" });
    if (this.#generation >= Number.MAX_SAFE_INTEGER) {
      return Object.freeze({ accepted: false, code: "GENERATION_INVALID" });
    }
    const lifecycleEpoch = this.#lifecycleEpoch;
    this.#bootstrapReserved = true;
    let capability: string;
    try {
      capability = this.#createCapability();
    } catch {
      this.#bootstrapReserved = false;
      return Object.freeze({ accepted: false, code: "CAPABILITY_INVALID" });
    }
    this.#bootstrapReserved = false;
    if (
      this.#binding !== null ||
      this.#lifecycleEpoch !== lifecycleEpoch ||
      this.#session.snapshot().closed
    ) {
      return Object.freeze({ accepted: false, code: "CAPABILITY_STALE" });
    }
    if (!isCapability(capability)) {
      return Object.freeze({ accepted: false, code: "CAPABILITY_INVALID" });
    }
    this.#generation += 1;
    this.#binding = {
      capability,
      generation: this.#generation,
      frame: context.frame,
      documentIdentity: session.documentIdentity,
      documentOwnerIdentity: session.documentOwnerIdentity,
      ownerGeneration: session.ownerGeneration,
      nextSequence: 1,
      inFlight: false,
    };
    return Object.freeze({
      accepted: true,
      transportVersion: 1,
      generation: this.#generation,
      capability,
      documentIdentity: session.documentIdentity,
      documentOwnerIdentity: session.documentOwnerIdentity,
      ownerGeneration: session.ownerGeneration,
    });
  }

  public invalidate(): void {
    this.#binding = null;
    this.#lifecycleEpoch += 1;
  }

  public closeSession(): void {
    this.invalidate();
    this.#session.close();
  }

  public getProjection(context: unknown, input: unknown): Promise<DocumentRouteTransportResult> {
    return this.#invoke("getProjection", context, input);
  }

  public setDisplayValue(context: unknown, input: unknown): Promise<DocumentRouteTransportResult> {
    return this.#invoke("setDisplayValue", context, input);
  }

  public undo(context: unknown, input: unknown): Promise<DocumentRouteTransportResult> {
    return this.#invoke("undo", context, input);
  }

  public redo(context: unknown, input: unknown): Promise<DocumentRouteTransportResult> {
    return this.#invoke("redo", context, input);
  }

  async #invoke(
    operation: DocumentRouteOperation,
    contextInput: unknown,
    input: unknown,
  ): Promise<DocumentRouteTransportResult> {
    const context = parseContext(contextInput);
    if (context === null) return rejection("WINDOW_NOT_LIVE");
    const binding = this.#binding;
    const contextFailure = this.#validateContext(context, binding?.frame ?? null);
    if (contextFailure !== null) return rejection(contextFailure);
    if (binding === null) return rejection("CAPABILITY_STALE");
    const session = this.#session.snapshot();
    if (session.closed) return rejection("SESSION_CLOSED");
    if (
      session.documentIdentity !== binding.documentIdentity ||
      session.documentOwnerIdentity !== binding.documentOwnerIdentity ||
      session.ownerGeneration !== binding.ownerGeneration
    ) {
      return rejection("DOCUMENT_OWNER_INVALID");
    }
    if (ownDataValue(input, "documentIdentity") !== binding.documentIdentity) {
      return rejection("DOCUMENT_OWNER_INVALID");
    }
    if (
      ownDataValue(input, "documentOwnerIdentity") !== binding.documentOwnerIdentity ||
      ownDataValue(input, "ownerGeneration") !== binding.ownerGeneration
    ) {
      return rejection("DOCUMENT_OWNER_INVALID");
    }
    if (ownDataValue(input, "generation") !== binding.generation) {
      return rejection("GENERATION_INVALID");
    }
    if (ownDataValue(input, "capability") !== binding.capability) {
      return rejection("CAPABILITY_INVALID");
    }
    const record = ownDataRecord(input, [
      "transportVersion",
      "capability",
      "generation",
      "sequence",
      "documentIdentity",
      "documentOwnerIdentity",
      "ownerGeneration",
      "args",
    ]);
    if (record === null) return rejection("TRANSPORT_MALFORMED");
    if (record["transportVersion"] !== 1) return rejection("TRANSPORT_UNSUPPORTED_VERSION");
    if (!isPositiveSafeInteger(record["sequence"])) return rejection("SEQUENCE_INVALID");
    if (record["sequence"] !== binding.nextSequence) return rejection("SEQUENCE_REPLAYED");
    if (binding.nextSequence >= Number.MAX_SAFE_INTEGER) return rejection("SEQUENCE_EXHAUSTED");
    if (binding.inFlight) return rejection("OPERATION_IN_FLIGHT");
    const detachedArgs = boundedOwnDataGraph(record["args"], DOCUMENT_ROUTE_INPUT_LIMITS);
    if (!detachedArgs.accepted) {
      return rejection("PAGE_ARGUMENT_INVALID");
    }
    binding.inFlight = true;
    let requestId: ApplicationRequestIdentity | null;
    try {
      const candidate = this.#createRequestId({
        operation,
        generation: binding.generation,
        sequence: binding.nextSequence,
      });
      requestId = applicationRequestIdentityCodec.is(candidate) ? candidate : null;
    } catch {
      binding.inFlight = false;
      return rejection("REQUEST_ID_INVALID");
    }
    if (requestId === null) {
      binding.inFlight = false;
      return rejection("REQUEST_ID_INVALID");
    }
    if (this.#binding !== binding || this.#session.snapshot().closed) {
      binding.inFlight = false;
      return rejection("CAPABILITY_STALE");
    }
    const acceptedSequence = binding.nextSequence;
    binding.nextSequence += 1;
    let invoked: DocumentSessionInvocationResult;
    try {
      invoked = await this.#invokeSession(operation, requestId, detachedArgs.value);
    } catch {
      invoked = Object.freeze({ accepted: false, code: "DOCUMENT_SESSION_RESULT_INVALID" });
    } finally {
      binding.inFlight = false;
    }
    if (this.#binding !== binding) return rejection("CAPABILITY_STALE");
    const latest = this.#session.snapshot();
    if (
      latest.closed ||
      latest.documentIdentity !== binding.documentIdentity ||
      latest.documentOwnerIdentity !== binding.documentOwnerIdentity ||
      latest.ownerGeneration !== binding.ownerGeneration
    ) {
      return rejection("DOCUMENT_OWNER_INVALID");
    }
    if (!invoked.accepted) {
      return rejection(
        invoked.code === "DOCUMENT_SESSION_INPUT_INVALID"
          ? "PAGE_ARGUMENT_INVALID"
          : invoked.code === "DOCUMENT_SESSION_CLOSED"
            ? "SESSION_CLOSED"
            : invoked.code === "DOCUMENT_SESSION_REQUEST_IN_FLIGHT"
              ? "OPERATION_IN_FLIGHT"
              : "SESSION_RESULT_INVALID",
      );
    }
    const detachedResult = boundedOwnDataGraph(invoked.result, DOCUMENT_ROUTE_RESULT_LIMITS);
    if (!detachedResult.accepted) {
      return rejection("SESSION_RESULT_INVALID");
    }
    return Object.freeze({
      accepted: true,
      transportVersion: 1,
      generation: binding.generation,
      sequence: acceptedSequence,
      requestId,
      result: detachedResult.value as Extract<
        DocumentSessionInvocationResult,
        { readonly accepted: true }
      >["result"],
    });
  }

  #invokeSession(
    operation: DocumentRouteOperation,
    requestId: ApplicationRequestIdentity,
    args: unknown,
  ): Promise<DocumentSessionInvocationResult> {
    if (operation === "getProjection") return this.#session.getProjection(requestId, args);
    if (operation === "setDisplayValue") return this.#session.setDisplayValue(requestId, args);
    if (operation === "undo") return this.#session.undo(requestId, args);
    return this.#session.redo(requestId, args);
  }

  #validateContext(
    context: DocumentRouteContext,
    boundFrame: object | null,
  ): DocumentRouteTransportRejectionCode | null {
    if (!context.windowLive || !context.webContentsLive) return "WINDOW_NOT_LIVE";
    if (context.window !== this.#expectedWindow) return "CROSS_WINDOW";
    if (context.webContents !== this.#expectedWebContents) return "SENDER_INVALID";
    if (context.frame === null || context.frame !== context.mainFrame) return "FRAME_INVALID";
    if (boundFrame !== null && context.frame !== boundFrame) return "FRAME_INVALID";
    if (!exactDocumentRouteUrl(context.url)) return "ORIGIN_ROUTE_INVALID";
    return null;
  }
}

export function createDocumentRouteBroker(input: unknown): DocumentRouteBrokerCreationResult {
  try {
    return DocumentRouteBroker.create(input);
  } catch {
    return Object.freeze({ accepted: false, code: "BROKER_CONFIGURATION_INVALID" });
  }
}
