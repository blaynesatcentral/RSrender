import { createHash } from "node:crypto";

export const rsLogProjectDataIngressRevision = "bld-045-rslog-project-data-ingress-v1" as const;
export const maximumRsLogProjectDataBytes = 16_777_216 as const;

export type RsLogProjectDataIngressRejectionCode =
  | "RSLOG_PROJECT_DATA_INPUT_WRONG_TYPE"
  | "RSLOG_PROJECT_DATA_INPUT_EMPTY"
  | "RSLOG_PROJECT_DATA_INPUT_TOO_LARGE"
  | "RSLOG_PROJECT_DATA_INPUT_INVALID_UTF8"
  | "RSLOG_PROJECT_DATA_INPUT_INVALID_JSON"
  | "RSLOG_PROJECT_DATA_TOP_LEVEL_UNSUPPORTED"
  | "RSLOG_PROJECT_DATA_SCHEMA_UNADMITTED";

export type RsLogProjectDataIngressResult = Readonly<{
  accepted: false;
  code: RsLogProjectDataIngressRejectionCode;
  byteLength?: number;
  sourceDigest?: `sha256:${string}`;
  topLevelKind?: "object" | "array";
  topLevelKeys?: readonly string[];
}>;

function rejected(
  code: RsLogProjectDataIngressRejectionCode,
  evidence: Omit<RsLogProjectDataIngressResult, "accepted" | "code"> = {},
): RsLogProjectDataIngressResult {
  return Object.freeze({ accepted: false, code, ...evidence });
}

function bytesFrom(input: unknown): Uint8Array | null {
  if (typeof input === "string") return new TextEncoder().encode(input);
  return input instanceof Uint8Array ? new Uint8Array(input) : null;
}

/**
 * Bounded local-file ingress for RSLog Project Data JSON.
 *
 * The vendor documents the export feature but not its positive JSON wire shape. Until an
 * authorized sanitized export is admitted, valid JSON is deliberately classified and rejected;
 * no guessed field is promoted into Source Snapshot or renderer data.
 */
export function inspectRsLogProjectDataJson(input: unknown): RsLogProjectDataIngressResult {
  try {
    const bytes = bytesFrom(input);
    if (bytes === null) return rejected("RSLOG_PROJECT_DATA_INPUT_WRONG_TYPE");
    if (bytes.byteLength === 0) return rejected("RSLOG_PROJECT_DATA_INPUT_EMPTY");
    if (bytes.byteLength > maximumRsLogProjectDataBytes) {
      return rejected("RSLOG_PROJECT_DATA_INPUT_TOO_LARGE");
    }
    const evidence = Object.freeze({
      byteLength: bytes.byteLength,
      sourceDigest: `sha256:${createHash("sha256").update(bytes).digest("hex")}` as const,
    });
    let source: string;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return rejected("RSLOG_PROJECT_DATA_INPUT_INVALID_UTF8", evidence);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(source) as unknown;
    } catch {
      return rejected("RSLOG_PROJECT_DATA_INPUT_INVALID_JSON", evidence);
    }
    if (typeof parsed !== "object" || parsed === null) {
      return rejected("RSLOG_PROJECT_DATA_TOP_LEVEL_UNSUPPORTED", evidence);
    }
    const topLevelKind = Array.isArray(parsed) ? "array" : "object";
    const topLevelKeys = Object.freeze(
      (Array.isArray(parsed) ? [] : Object.keys(parsed)).sort().slice(0, 128),
    );
    return rejected("RSLOG_PROJECT_DATA_SCHEMA_UNADMITTED", {
      ...evidence,
      topLevelKind,
      topLevelKeys,
    });
  } catch {
    return rejected("RSLOG_PROJECT_DATA_INPUT_WRONG_TYPE");
  }
}
