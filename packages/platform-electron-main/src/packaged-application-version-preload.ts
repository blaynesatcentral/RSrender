import { createHash } from "node:crypto";

import { generateApplicationVersionPreloadSource } from "./generated-application-version-preload.js";

export const packagedApplicationVersionPreloadRelativePath =
  "preload/application-version.cjs" as const;

export type PackagedApplicationVersionPreloadVerification =
  | { readonly accepted: true; readonly sha256: string }
  | {
      readonly accepted: false;
      readonly code: "PACKAGED_PRELOAD_DIGEST_MISMATCH" | "PACKAGED_PRELOAD_MISSING";
    };

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function expectedApplicationVersionPreloadSha256(): string {
  return digest(Buffer.from(generateApplicationVersionPreloadSource(), "utf8"));
}

export function verifyPackagedApplicationVersionPreload(
  bytes: unknown,
): PackagedApplicationVersionPreloadVerification {
  if (!(bytes instanceof Uint8Array)) {
    return Object.freeze({ accepted: false, code: "PACKAGED_PRELOAD_MISSING" });
  }
  const actual = digest(bytes);
  if (actual !== expectedApplicationVersionPreloadSha256()) {
    return Object.freeze({ accepted: false, code: "PACKAGED_PRELOAD_DIGEST_MISMATCH" });
  }
  return Object.freeze({ accepted: true, sha256: actual });
}
