import { createHash } from "node:crypto";

import {
  applicationRequestIdentityCodec,
  decodeOverrideRenderDatasetCommand,
  decodeOverrideRenderDatasetCommandResult,
  decodeOverrideRenderDatasetQuery,
  decodeOverrideRenderDatasetQueryResult,
  isOwnerGeneration,
  parseOpaqueIdentity,
  type ApplicationRequestIdentity,
  type OverrideHistoryNavigationCommand,
  type RevertDisplayValueOverrideCommand,
  type OverrideRenderDatasetCommandResult,
  type OverrideRenderDatasetProjection,
  type OverrideRenderDatasetQueryResult,
  type SetDisplayValueOverrideCommand,
} from "@rsrender/contracts";
import type { InMemoryOverrideRenderDatasetService } from "@rsrender/application";

export const documentSessionRevision = "bld-020-document-session-v1" as const;
export type DocumentOwnerIdentity = string & { readonly __documentOwnerIdentity: unique symbol };
export type DocumentOwnerIdentityResult =
  | { readonly accepted: true; readonly value: DocumentOwnerIdentity }
  | { readonly accepted: false; readonly code: "DOCUMENT_OWNER_IDENTITY_INVALID" };

export type DocumentSessionFailureCode =
  | "DOCUMENT_SESSION_CLOSED"
  | "DOCUMENT_SESSION_CONFIGURATION_INVALID"
  | "DOCUMENT_SESSION_INPUT_INVALID"
  | "DOCUMENT_SESSION_REQUEST_IN_FLIGHT"
  | "DOCUMENT_SESSION_RESULT_INVALID"
  | "DOCUMENT_SESSION_TIME_INVALID";

export type DocumentSessionInvocationResult =
  | {
      readonly accepted: true;
      readonly result: OverrideRenderDatasetCommandResult | OverrideRenderDatasetQueryResult;
    }
  | { readonly accepted: false; readonly code: DocumentSessionFailureCode };

export type DocumentSessionCreationResult =
  | { readonly accepted: true; readonly session: DocumentSession }
  | { readonly accepted: false; readonly code: DocumentSessionFailureCode };

export type DocumentSessionSetDisplayValueInput = Readonly<
  Pick<SetDisplayValueOverrideCommand, "expectedWorkingRevision"> &
    Omit<SetDisplayValueOverrideCommand["payload"], "authorIdentity" | "recordedAtUtc">
>;

export type DocumentSessionRevertDisplayValueInput = Readonly<
  Pick<RevertDisplayValueOverrideCommand, "expectedWorkingRevision"> &
    RevertDisplayValueOverrideCommand["payload"]
>;

export type DocumentSessionHistoryInput = Readonly<
  Pick<OverrideHistoryNavigationCommand, "expectedWorkingRevision">
>;

export type DocumentSessionProjectionInput = Readonly<{
  minimumWorkingRevision: number | null;
}>;

export interface DocumentSessionSnapshot {
  readonly documentIdentity: string;
  readonly documentOwnerIdentity: string;
  readonly ownerGeneration: number;
  readonly workingRevision: number;
  readonly durableRevision: number;
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly eventSequence: number;
  readonly historyAuthority: "application-core";
  readonly closed: boolean;
}

type DataRecord = Readonly<Record<string, unknown>>;

function wellFormedUnicode(input: string): boolean {
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const following = input.charCodeAt(index + 1);
      if (!(following >= 0xdc00 && following <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}

export function parseDocumentOwnerIdentity(input: unknown): DocumentOwnerIdentityResult {
  return typeof input === "string" && /^urn:rsrender:document-owner:v1:[0-9a-f]{64}$/u.test(input)
    ? Object.freeze({ accepted: true, value: input as DocumentOwnerIdentity })
    : Object.freeze({ accepted: false, code: "DOCUMENT_OWNER_IDENTITY_INVALID" });
}

export function createDocumentOwnerIdentity(input: unknown): DocumentOwnerIdentityResult {
  if (
    typeof input !== "string" ||
    input.length === 0 ||
    !wellFormedUnicode(input) ||
    new TextEncoder().encode(input).byteLength > 1_024
  ) {
    return Object.freeze({ accepted: false, code: "DOCUMENT_OWNER_IDENTITY_INVALID" });
  }
  const digest = createHash("sha256").update(Buffer.from(input, "utf8")).digest("hex");
  return parseDocumentOwnerIdentity(`urn:rsrender:document-owner:v1:${digest}`);
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

function exactService(input: unknown): InMemoryOverrideRenderDatasetService | null {
  const record = ownDataRecord(input, [
    "setDisplayValue",
    "revertDisplayValue",
    "undo",
    "redo",
    "getProjection",
  ]);
  const legacyRecord =
    record === null
      ? ownDataRecord(input, ["setDisplayValue", "undo", "redo", "getProjection"])
      : null;
  const serviceRecord = record ?? legacyRecord;
  if (serviceRecord === null) return null;
  if (!(
    typeof serviceRecord["setDisplayValue"] === "function" &&
    (serviceRecord["revertDisplayValue"] === undefined ||
      typeof serviceRecord["revertDisplayValue"] === "function") &&
    typeof serviceRecord["undo"] === "function" &&
    typeof serviceRecord["redo"] === "function" &&
    typeof serviceRecord["getProjection"] === "function"
  ))
    return null;
  const setDisplayValue = serviceRecord["setDisplayValue"] as (
    value: unknown,
  ) => Promise<OverrideRenderDatasetCommandResult>;
  const revertDisplayValue = serviceRecord["revertDisplayValue"] as
    ((value: unknown) => Promise<OverrideRenderDatasetCommandResult>) | undefined;
  const undo = serviceRecord["undo"] as (
    value: unknown,
  ) => Promise<OverrideRenderDatasetCommandResult>;
  const redo = serviceRecord["redo"] as (
    value: unknown,
  ) => Promise<OverrideRenderDatasetCommandResult>;
  const getProjection = serviceRecord["getProjection"] as (
    value: unknown,
  ) => Promise<OverrideRenderDatasetQueryResult>;
  return Object.freeze({
    setDisplayValue: (value: unknown) => setDisplayValue(value),
    revertDisplayValue: (value: unknown) =>
      revertDisplayValue === undefined
        ? Promise.reject(new Error("REVERT_DISPLAY_VALUE_UNAVAILABLE"))
        : revertDisplayValue(value),
    undo: (value: unknown) => undo(value),
    redo: (value: unknown) => redo(value),
    getProjection: (value: unknown) => getProjection(value),
  });
}

function validUtc(input: unknown): input is string {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(input))
    return false;
  const instant = Date.parse(input);
  return Number.isFinite(instant) && new Date(instant).toISOString() === input;
}

function requestIdentity(input: unknown): ApplicationRequestIdentity | null {
  return applicationRequestIdentityCodec.is(input) ? input : null;
}

function invocationFailure(code: DocumentSessionFailureCode): DocumentSessionInvocationResult {
  return Object.freeze({ accepted: false, code });
}

export class DocumentSession {
  readonly #documentIdentity: string;
  readonly #documentOwnerIdentity: string;
  readonly #ownerGeneration: number;
  readonly #service: InMemoryOverrideRenderDatasetService;
  readonly #clock: () => string;
  #projection: OverrideRenderDatasetProjection;
  #closed = false;
  #inFlight = false;
  #lifecycleEpoch = 1;

  private constructor(input: {
    readonly documentIdentity: string;
    readonly documentOwnerIdentity: string;
    readonly ownerGeneration: number;
    readonly service: InMemoryOverrideRenderDatasetService;
    readonly clock: () => string;
    readonly projection: OverrideRenderDatasetProjection;
  }) {
    this.#documentIdentity = input.documentIdentity;
    this.#documentOwnerIdentity = input.documentOwnerIdentity;
    this.#ownerGeneration = input.ownerGeneration;
    this.#service = input.service;
    this.#clock = input.clock;
    this.#projection = input.projection;
    Object.freeze(this);
  }

  static async create(input: unknown): Promise<DocumentSessionCreationResult> {
    const record = ownDataRecord(input, [
      "documentIdentity",
      "documentOwnerIdentity",
      "ownerGeneration",
      "service",
      "initialRequestId",
      "clock",
    ]);
    if (record === null) {
      return Object.freeze({ accepted: false, code: "DOCUMENT_SESSION_CONFIGURATION_INVALID" });
    }
    let documentIdentity: string;
    let documentOwnerIdentity: string;
    try {
      documentIdentity = parseOpaqueIdentity<"DocumentIdentity">(record["documentIdentity"]);
      const owner = parseDocumentOwnerIdentity(record["documentOwnerIdentity"]);
      if (!owner.accepted) throw new Error(owner.code);
      documentOwnerIdentity = owner.value;
    } catch {
      return Object.freeze({ accepted: false, code: "DOCUMENT_SESSION_CONFIGURATION_INVALID" });
    }
    if (
      documentOwnerIdentity === documentIdentity ||
      documentIdentity.startsWith("urn:rsrender:document-owner:v1:")
    ) {
      return Object.freeze({ accepted: false, code: "DOCUMENT_SESSION_CONFIGURATION_INVALID" });
    }
    const service = exactService(record["service"]);
    const initialRequestId = requestIdentity(record["initialRequestId"]);
    const ownerGeneration = record["ownerGeneration"];
    const clock = record["clock"];
    if (
      service === null ||
      initialRequestId === null ||
      !isOwnerGeneration(ownerGeneration) ||
      ownerGeneration < 1 ||
      typeof clock !== "function"
    ) {
      return Object.freeze({ accepted: false, code: "DOCUMENT_SESSION_CONFIGURATION_INVALID" });
    }
    const query = decodeOverrideRenderDatasetQuery({
      contractVersion: 1,
      messageType: "query",
      scope: "document-domain",
      kind: "render-dataset.get",
      requestId: initialRequestId,
      documentId: documentIdentity,
      ownerGeneration,
      minimumWorkingRevision: null,
    });
    if (!query.accepted) {
      return Object.freeze({ accepted: false, code: "DOCUMENT_SESSION_CONFIGURATION_INVALID" });
    }
    let rawResult: unknown;
    try {
      rawResult = await service.getProjection(query.value);
    } catch {
      return Object.freeze({ accepted: false, code: "DOCUMENT_SESSION_RESULT_INVALID" });
    }
    const decoded = decodeOverrideRenderDatasetQueryResult(rawResult);
    if (
      !decoded.accepted ||
      decoded.value.kind !== "render-dataset.projection.result" ||
      decoded.value.requestId !== initialRequestId ||
      decoded.value.documentId !== documentIdentity ||
      decoded.value.ownerGeneration !== ownerGeneration
    ) {
      return Object.freeze({ accepted: false, code: "DOCUMENT_SESSION_RESULT_INVALID" });
    }
    return Object.freeze({
      accepted: true,
      session: new DocumentSession({
        documentIdentity,
        documentOwnerIdentity,
        ownerGeneration,
        service,
        clock: clock as () => string,
        projection: decoded.value.projection,
      }),
    });
  }

  public snapshot(): DocumentSessionSnapshot {
    const projection = this.#projection;
    return Object.freeze({
      documentIdentity: this.#documentIdentity,
      documentOwnerIdentity: this.#documentOwnerIdentity,
      ownerGeneration: this.#ownerGeneration,
      workingRevision: projection.workingRevision,
      durableRevision: projection.durableRevision,
      dirty: projection.dirty,
      canUndo: projection.canUndo,
      canRedo: projection.canRedo,
      eventSequence: projection.eventSequence,
      historyAuthority: "application-core",
      closed: this.#closed,
    });
  }

  public close(): void {
    if (!this.#closed) {
      this.#closed = true;
      this.#lifecycleEpoch += 1;
    }
  }

  public async getProjection(
    requestIdInput: unknown,
    input: unknown,
  ): Promise<DocumentSessionInvocationResult> {
    const preflight = this.#preflight();
    if (preflight !== null) return preflight;
    const record = ownDataRecord(input, ["minimumWorkingRevision"]);
    const requestId = requestIdentity(requestIdInput);
    if (record === null || requestId === null)
      return invocationFailure("DOCUMENT_SESSION_INPUT_INVALID");
    const query = decodeOverrideRenderDatasetQuery({
      contractVersion: 1,
      messageType: "query",
      scope: "document-domain",
      kind: "render-dataset.get",
      requestId,
      documentId: this.#documentIdentity,
      ownerGeneration: this.#ownerGeneration,
      minimumWorkingRevision: record["minimumWorkingRevision"],
    });
    if (!query.accepted) return invocationFailure("DOCUMENT_SESSION_INPUT_INVALID");
    return this.#invoke(
      "getProjection",
      requestId,
      query.value.minimumWorkingRevision,
      null,
      null,
      () => this.#service.getProjection(query.value),
    );
  }

  public async setDisplayValue(
    requestIdInput: unknown,
    input: unknown,
  ): Promise<DocumentSessionInvocationResult> {
    const preflight = this.#preflight();
    if (preflight !== null) return preflight;
    const fields = [
      "expectedWorkingRevision",
      "localOverrideIdentity",
      "targetSourceFieldIdentity",
      "expectedSourceValueDigest",
      "expectedSourceValueType",
      "expectedSourceUnit",
      "replacementContent",
      "replacementUnit",
      "reason",
    ] as const;
    const record = ownDataRecord(input, fields);
    const requestId = requestIdentity(requestIdInput);
    if (record === null || requestId === null)
      return invocationFailure("DOCUMENT_SESSION_INPUT_INVALID");
    let recordedAtUtc: string;
    try {
      recordedAtUtc = this.#clock();
    } catch {
      return invocationFailure("DOCUMENT_SESSION_TIME_INVALID");
    }
    if (!validUtc(recordedAtUtc)) return invocationFailure("DOCUMENT_SESSION_TIME_INVALID");
    const command = decodeOverrideRenderDatasetCommand({
      contractVersion: 1,
      messageType: "command",
      scope: "document-domain",
      kind: "presentation-override.set-display-value",
      requestId,
      commandId: "presentation-override.set-display-value",
      documentId: this.#documentIdentity,
      ownerGeneration: this.#ownerGeneration,
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
        recordedAtUtc,
      },
    });
    if (!command.accepted || command.value.kind !== "presentation-override.set-display-value") {
      return invocationFailure("DOCUMENT_SESSION_INPUT_INVALID");
    }
    return this.#invoke(
      "command",
      requestId,
      command.value.expectedWorkingRevision,
      "presentation-override.set-display-value",
      "mutation",
      () => this.#service.setDisplayValue(command.value),
    );
  }

  public async revertDisplayValue(
    requestIdInput: unknown,
    input: unknown,
  ): Promise<DocumentSessionInvocationResult> {
    const preflight = this.#preflight();
    if (preflight !== null) return preflight;
    const record = ownDataRecord(input, [
      "expectedWorkingRevision",
      "localOverrideIdentity",
      "targetSourceFieldIdentity",
      "expectedOverrideRevision",
    ]);
    const requestId = requestIdentity(requestIdInput);
    if (record === null || requestId === null)
      return invocationFailure("DOCUMENT_SESSION_INPUT_INVALID");
    const command = decodeOverrideRenderDatasetCommand({
      contractVersion: 1,
      messageType: "command",
      scope: "document-domain",
      kind: "presentation-override.revert-display-value",
      requestId,
      commandId: "presentation-override.revert-display-value",
      documentId: this.#documentIdentity,
      ownerGeneration: this.#ownerGeneration,
      expectedWorkingRevision: record["expectedWorkingRevision"],
      payload: {
        localOverrideIdentity: record["localOverrideIdentity"],
        targetSourceFieldIdentity: record["targetSourceFieldIdentity"],
        expectedOverrideRevision: record["expectedOverrideRevision"],
      },
    });
    if (!command.accepted || command.value.kind !== "presentation-override.revert-display-value") {
      return invocationFailure("DOCUMENT_SESSION_INPUT_INVALID");
    }
    return this.#invoke(
      "command",
      requestId,
      command.value.expectedWorkingRevision,
      "presentation-override.revert-display-value",
      "mutation",
      () => this.#service.revertDisplayValue(command.value),
    );
  }

  public undo(requestId: unknown, input: unknown): Promise<DocumentSessionInvocationResult> {
    return this.#navigate("history.undo", requestId, input);
  }

  public redo(requestId: unknown, input: unknown): Promise<DocumentSessionInvocationResult> {
    return this.#navigate("history.redo", requestId, input);
  }

  async #navigate(
    kind: "history.undo" | "history.redo",
    requestIdInput: unknown,
    input: unknown,
  ): Promise<DocumentSessionInvocationResult> {
    const preflight = this.#preflight();
    if (preflight !== null) return preflight;
    const record = ownDataRecord(input, ["expectedWorkingRevision"]);
    const requestId = requestIdentity(requestIdInput);
    if (record === null || requestId === null)
      return invocationFailure("DOCUMENT_SESSION_INPUT_INVALID");
    const command = decodeOverrideRenderDatasetCommand({
      contractVersion: 1,
      messageType: "command",
      scope: "document-domain",
      kind,
      requestId,
      commandId: kind,
      documentId: this.#documentIdentity,
      ownerGeneration: this.#ownerGeneration,
      expectedWorkingRevision: record["expectedWorkingRevision"],
      payload: null,
    });
    if (!command.accepted || command.value.kind !== kind) {
      return invocationFailure("DOCUMENT_SESSION_INPUT_INVALID");
    }
    return this.#invoke(
      "command",
      requestId,
      command.value.expectedWorkingRevision,
      kind,
      kind === "history.undo" ? "undo" : "redo",
      () =>
        kind === "history.undo"
          ? this.#service.undo(command.value)
          : this.#service.redo(command.value),
    );
  }

  #preflight(): DocumentSessionInvocationResult | null {
    if (this.#closed) return invocationFailure("DOCUMENT_SESSION_CLOSED");
    if (this.#inFlight) return invocationFailure("DOCUMENT_SESSION_REQUEST_IN_FLIGHT");
    return null;
  }

  async #invoke(
    kind: "command" | "getProjection",
    requestId: ApplicationRequestIdentity,
    expectedRevision: number | null,
    expectedCommandId:
      | "presentation-override.set-display-value"
      | "presentation-override.revert-display-value"
      | "history.undo"
      | "history.redo"
      | null,
    expectedOperation: "mutation" | "undo" | "redo" | null,
    operation: () => Promise<unknown>,
  ): Promise<DocumentSessionInvocationResult> {
    if (this.#closed) return invocationFailure("DOCUMENT_SESSION_CLOSED");
    if (this.#inFlight) return invocationFailure("DOCUMENT_SESSION_REQUEST_IN_FLIGHT");
    const epoch = this.#lifecycleEpoch;
    this.#inFlight = true;
    let raw: unknown;
    try {
      raw = await operation();
    } catch {
      return invocationFailure("DOCUMENT_SESSION_RESULT_INVALID");
    } finally {
      this.#inFlight = false;
    }
    if (this.#closed || this.#lifecycleEpoch !== epoch) {
      return invocationFailure("DOCUMENT_SESSION_CLOSED");
    }
    const decoded =
      kind === "getProjection"
        ? decodeOverrideRenderDatasetQueryResult(raw)
        : decodeOverrideRenderDatasetCommandResult(raw);
    if (!decoded.accepted || decoded.value.requestId !== requestId) {
      return invocationFailure("DOCUMENT_SESSION_RESULT_INVALID");
    }
    if (decoded.value.kind === "override-render-dataset.rejected") {
      return Object.freeze({ accepted: true, result: decoded.value });
    }
    if (
      decoded.value.documentId !== this.#documentIdentity ||
      decoded.value.ownerGeneration !== this.#ownerGeneration ||
      (kind === "command" &&
        (decoded.value.kind !== "override-render-dataset.committed" ||
          decoded.value.previousWorkingRevision !== expectedRevision ||
          decoded.value.commandId !== expectedCommandId ||
          decoded.value.operation !== expectedOperation ||
          decoded.value.event.commandId !== expectedCommandId ||
          decoded.value.event.operation !== expectedOperation ||
          decoded.value.event.sourceRequestId !== requestId)) ||
      (kind === "getProjection" &&
        (decoded.value.kind !== "render-dataset.projection.result" ||
          (expectedRevision !== null && decoded.value.workingRevision < expectedRevision)))
    ) {
      return invocationFailure("DOCUMENT_SESSION_RESULT_INVALID");
    }
    this.#projection = decoded.value.projection;
    return Object.freeze({ accepted: true, result: decoded.value });
  }
}

export async function createDocumentSession(
  input: unknown,
): Promise<DocumentSessionCreationResult> {
  try {
    return await DocumentSession.create(input);
  } catch {
    return Object.freeze({ accepted: false, code: "DOCUMENT_SESSION_CONFIGURATION_INVALID" });
  }
}
