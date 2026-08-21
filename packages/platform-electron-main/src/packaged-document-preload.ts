import { createHash } from "node:crypto";

import { generateDocumentPreloadSource } from "./generated-document-preload.js";

export const packagedDocumentPreloadRelativePath = "preload/document.cjs" as const;

export type PackagedDocumentPreloadVerification =
  | { readonly accepted: true; readonly sha256: string }
  | {
      readonly accepted: false;
      readonly code:
        "PACKAGED_DOCUMENT_PRELOAD_DIGEST_MISMATCH" | "PACKAGED_DOCUMENT_PRELOAD_MISSING";
    };

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function expectedDocumentPreloadSha256(): string {
  return digest(Buffer.from(generateDocumentPreloadSource(), "utf8"));
}

export function verifyPackagedDocumentPreload(bytes: unknown): PackagedDocumentPreloadVerification {
  if (!(bytes instanceof Uint8Array)) {
    return Object.freeze({ accepted: false, code: "PACKAGED_DOCUMENT_PRELOAD_MISSING" });
  }
  const actual = digest(bytes);
  if (actual !== expectedDocumentPreloadSha256()) {
    return Object.freeze({
      accepted: false,
      code: "PACKAGED_DOCUMENT_PRELOAD_DIGEST_MISMATCH",
    });
  }
  return Object.freeze({ accepted: true, sha256: actual });
}
