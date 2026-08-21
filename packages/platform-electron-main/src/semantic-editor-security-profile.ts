import { DOCUMENT_ROUTE_SECURITY_PROFILE } from "./document-security-profile.js";

export const SEMANTIC_EDITOR_SCRIPT_URL = "rsrender-shell://document/semantic-editor.js" as const;
export const BORING_LOG_STUDIO_STYLESHEET_URL =
  "rsrender-shell://document/boring-log-studio.css" as const;

export const SEMANTIC_EDITOR_SECURITY_PROFILE = Object.freeze({
  ...DOCUMENT_ROUTE_SECURITY_PROFILE,
  schema: "rsrender.semantic-editor-security-profile.v1",
  renderer: "exact-semantic-editor-script-only",
  scriptUrl: SEMANTIC_EDITOR_SCRIPT_URL,
  contentPolicy:
    "default-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self'; style-src-attr 'none'; img-src 'none'; connect-src 'none'; media-src 'none'; font-src 'none'; frame-src 'none'; child-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
} as const);

export type SemanticEditorSecurityProfile = typeof SEMANTIC_EDITOR_SECURITY_PROFILE;
