import { createHash } from "node:crypto";

import { SEMANTIC_EDITOR_SCRIPT_URL } from "./semantic-editor-security-profile.js";

export const packagedSemanticEditorRendererRelativePath = "renderer/semantic-editor.js" as const;
export const semanticEditorBundleMarker = "rsrender.semantic-editor.bundle.v1" as const;

export type PackagedSemanticEditorRendererVerification =
  | Readonly<{ accepted: false; code: "SEMANTIC_EDITOR_RENDERER_UNAVAILABLE" }>
  | Readonly<{
      accepted: true;
      sha256: string;
      bytes: number;
      route: typeof SEMANTIC_EDITOR_SCRIPT_URL;
    }>;

export function verifyPackagedSemanticEditorRenderer(
  input: Uint8Array | null,
  expectedSha256: unknown,
): PackagedSemanticEditorRendererVerification {
  try {
    if (
      !(input instanceof Uint8Array) ||
      typeof expectedSha256 !== "string" ||
      !/^[0-9a-f]{64}$/u.test(expectedSha256)
    ) {
      return Object.freeze({ accepted: false, code: "SEMANTIC_EDITOR_RENDERER_UNAVAILABLE" });
    }
    const sha256 = createHash("sha256").update(input).digest("hex");
    const source = new TextDecoder("utf-8", { fatal: true }).decode(input);
    const capabilitySource = source.replaceAll("http://www.w3.org/2000/svg", "");
    if (
      sha256 !== expectedSha256 ||
      !source.startsWith(`/* ${semanticEditorBundleMarker} */\n`) ||
      source.includes("//# sourceMappingURL=") ||
      source.includes("eval(") ||
      source.includes("new Function(") ||
      capabilitySource.includes("http://") ||
      capabilitySource.includes("https://")
    ) {
      return Object.freeze({ accepted: false, code: "SEMANTIC_EDITOR_RENDERER_UNAVAILABLE" });
    }
    return Object.freeze({
      accepted: true,
      sha256,
      bytes: input.byteLength,
      route: SEMANTIC_EDITOR_SCRIPT_URL,
    });
  } catch {
    return Object.freeze({ accepted: false, code: "SEMANTIC_EDITOR_RENDERER_UNAVAILABLE" });
  }
}
