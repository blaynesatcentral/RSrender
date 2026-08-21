import { createHash } from "node:crypto";

import { generateBoringLogStudioPreloadSource } from "./generated-boring-log-studio-preload.js";

export const packagedBoringLogStudioPreloadRelativePath = "preload/boring-log-studio.cjs" as const;

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function expectedBoringLogStudioPreloadSha256(): string {
  return digest(Buffer.from(generateBoringLogStudioPreloadSource(), "utf8"));
}

export function verifyPackagedBoringLogStudioPreload(bytes: unknown):
  | { readonly accepted: true; readonly sha256: string }
  | {
      readonly accepted: false;
      readonly code: "PACKAGED_STUDIO_PRELOAD_MISSING" | "PACKAGED_STUDIO_PRELOAD_DIGEST_MISMATCH";
    } {
  if (!(bytes instanceof Uint8Array)) {
    return Object.freeze({ accepted: false, code: "PACKAGED_STUDIO_PRELOAD_MISSING" });
  }
  const actual = digest(bytes);
  return actual === expectedBoringLogStudioPreloadSha256()
    ? Object.freeze({ accepted: true, sha256: actual })
    : Object.freeze({ accepted: false, code: "PACKAGED_STUDIO_PRELOAD_DIGEST_MISMATCH" });
}
