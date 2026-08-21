import type { InMemoryOverrideRenderDatasetService } from "@rsrender/application";

import {
  createDocumentOwnerIdentity,
  createDocumentSession,
  type DocumentSession,
  type DocumentSessionFailureCode,
} from "./document-session.js";

export const documentSessionHostRevision = "bld-020-document-session-host-v1" as const;

export type DocumentSessionHostReplaceResult =
  | {
      readonly accepted: true;
      readonly session: DocumentSession;
      readonly ownerGeneration: number;
      readonly replaced: boolean;
    }
  | {
      readonly accepted: false;
      readonly code:
        DocumentSessionFailureCode | "DOCUMENT_OWNER_IDENTITY_INVALID" | "OWNER_GENERATION_INVALID";
    };

export interface DocumentSessionHostSnapshot {
  readonly ownerGeneration: number;
  readonly hasSession: boolean;
  readonly documentIdentity: string | null;
  readonly documentOwnerIdentity: string | null;
  readonly closed: boolean;
}

function exactRecord(
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
    )
      return null;
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const field of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(input, field);
      if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable)
        return null;
      output[field] = descriptor.value;
    }
    return Object.freeze(output);
  } catch {
    return null;
  }
}

export class DocumentSessionHost {
  #ownerGeneration = 0;
  #session: DocumentSession | null = null;
  #closed = false;
  #replaceReserved = false;

  public snapshot(): DocumentSessionHostSnapshot {
    const current = this.#session?.snapshot() ?? null;
    return Object.freeze({
      ownerGeneration: this.#ownerGeneration,
      hasSession: current !== null,
      documentIdentity: current?.documentIdentity ?? null,
      documentOwnerIdentity: current?.documentOwnerIdentity ?? null,
      closed: this.#closed,
    });
  }

  public current(): DocumentSession | null {
    return this.#session;
  }

  public async replace(input: unknown): Promise<DocumentSessionHostReplaceResult> {
    if (this.#closed || this.#replaceReserved || this.#ownerGeneration >= Number.MAX_SAFE_INTEGER) {
      return Object.freeze({ accepted: false, code: "OWNER_GENERATION_INVALID" });
    }
    const record = exactRecord(input, [
      "documentIdentity",
      "service",
      "initialRequestId",
      "clock",
      "ownerNonce",
    ]);
    if (
      record === null ||
      typeof record["documentIdentity"] !== "string" ||
      typeof record["service"] !== "object" ||
      record["service"] === null ||
      typeof record["clock"] !== "function" ||
      typeof record["ownerNonce"] !== "string"
    ) {
      return Object.freeze({ accepted: false, code: "DOCUMENT_SESSION_CONFIGURATION_INVALID" });
    }
    const nextGeneration = this.#ownerGeneration + 1;
    const owner = createDocumentOwnerIdentity(
      `${record["ownerNonce"]}:${record["documentIdentity"]}:${nextGeneration}`,
    );
    if (!owner.accepted) return owner;
    this.#replaceReserved = true;
    let created;
    try {
      created = await createDocumentSession({
        documentIdentity: record["documentIdentity"],
        documentOwnerIdentity: owner.value,
        ownerGeneration: nextGeneration,
        service: record["service"] as InMemoryOverrideRenderDatasetService,
        initialRequestId: record["initialRequestId"],
        clock: record["clock"],
      });
    } finally {
      this.#replaceReserved = false;
    }
    if (!created.accepted) return created;
    if (this.#closed || this.#ownerGeneration + 1 !== nextGeneration) {
      created.session.close();
      return Object.freeze({ accepted: false, code: "OWNER_GENERATION_INVALID" });
    }
    const prior = this.#session;
    this.#session = created.session;
    this.#ownerGeneration = nextGeneration;
    prior?.close();
    return Object.freeze({
      accepted: true,
      session: created.session,
      ownerGeneration: nextGeneration,
      replaced: prior !== null,
    });
  }

  public close(): void {
    if (this.#closed) return;
    this.#closed = true;
    const prior = this.#session;
    this.#session = null;
    prior?.close();
  }
}
