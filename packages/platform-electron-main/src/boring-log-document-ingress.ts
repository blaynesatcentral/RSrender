import {
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
  type BoringLogLayoutJobInput,
  type Sha256Digest,
} from "@rsrender/contracts";

export const boringLogDocumentIngressRevision = "bld-032-runtime-ingress-v1" as const;
export const maximumBoringLogDocumentBundleBytes = 524_288 as const;

export type BoringLogDocumentIngressRejectionCode =
  | "BORING_LOG_DOCUMENT_INPUT_WRONG_TYPE"
  | "BORING_LOG_DOCUMENT_INPUT_EMPTY"
  | "BORING_LOG_DOCUMENT_INPUT_TOO_LARGE"
  | "BORING_LOG_DOCUMENT_INPUT_INVALID_UTF8"
  | "BORING_LOG_DOCUMENT_INPUT_INVALID_JSON"
  | "BORING_LOG_DOCUMENT_INPUT_CONTRACT_REJECTED"
  | "BORING_LOG_DOCUMENT_INPUT_DIGEST_MISMATCH";

export type BoringLogDocumentIngressResult =
  | {
      readonly accepted: true;
      readonly layoutJob: BoringLogLayoutJobInput;
      readonly canonicalDigest: Sha256Digest;
      readonly byteLength: number;
    }
  | {
      readonly accepted: false;
      readonly code: BoringLogDocumentIngressRejectionCode;
    };

function rejected(code: BoringLogDocumentIngressRejectionCode): BoringLogDocumentIngressResult {
  return Object.freeze({ accepted: false, code });
}

function bytesFrom(input: unknown): Uint8Array | null {
  if (typeof input === "string") return new TextEncoder().encode(input);
  if (!(input instanceof Uint8Array)) return null;
  return new Uint8Array(input);
}

/** Main-owned, bounded runtime decoder for a structured document/template bundle. */
export function decodeBoringLogDocumentBundle(input: unknown): BoringLogDocumentIngressResult {
  try {
    const bytes = bytesFrom(input);
    if (bytes === null) return rejected("BORING_LOG_DOCUMENT_INPUT_WRONG_TYPE");
    if (bytes.byteLength === 0) return rejected("BORING_LOG_DOCUMENT_INPUT_EMPTY");
    if (bytes.byteLength > maximumBoringLogDocumentBundleBytes) {
      return rejected("BORING_LOG_DOCUMENT_INPUT_TOO_LARGE");
    }
    let source: string;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return rejected("BORING_LOG_DOCUMENT_INPUT_INVALID_UTF8");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(source) as unknown;
    } catch {
      return rejected("BORING_LOG_DOCUMENT_INPUT_INVALID_JSON");
    }
    const validated = validateBoringLogLayoutJobInput(parsed);
    if (!validated.accepted) {
      return rejected("BORING_LOG_DOCUMENT_INPUT_CONTRACT_REJECTED");
    }
    if (
      sha256CanonicalJson(validated.value.document) !== validated.value.fixtureDigest ||
      sha256CanonicalJson(validated.value.template) !== validated.value.templateDigest
    ) {
      return rejected("BORING_LOG_DOCUMENT_INPUT_DIGEST_MISMATCH");
    }
    return Object.freeze({
      accepted: true,
      layoutJob: validated.value,
      canonicalDigest: sha256CanonicalJson(validated.value),
      byteLength: bytes.byteLength,
    });
  } catch {
    return rejected("BORING_LOG_DOCUMENT_INPUT_WRONG_TYPE");
  }
}
