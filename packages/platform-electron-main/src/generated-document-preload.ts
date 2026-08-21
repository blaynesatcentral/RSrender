import { documentPreloadBundleTemplate } from "./document-preload-bundle.js";

export const generatedDocumentPreloadRevision = "bld-020-generated-document-preload-v1" as const;

const placeholder = 'Number("__RSRENDER_INITIAL_SEQUENCE_LITERAL__")';

function generateSource(initialSequence: number): string {
  const replacement = `Number(${JSON.stringify(String(initialSequence))})`;
  const source = documentPreloadBundleTemplate.replace(placeholder, replacement);
  if (
    source === documentPreloadBundleTemplate ||
    source.includes("__RSRENDER_INITIAL_SEQUENCE_LITERAL__")
  ) {
    throw new Error("DOCUMENT_PRELOAD_BUNDLE_PLACEHOLDER_INVALID");
  }
  return source;
}

export function generateDocumentPreloadSource(): string {
  return generateSource(0);
}

export function generateDocumentPreloadQualificationSource(initialSequence: unknown): string {
  if (
    typeof initialSequence !== "number" ||
    !Number.isSafeInteger(initialSequence) ||
    initialSequence < 0
  ) {
    throw new Error("QUALIFICATION_SEQUENCE_INVALID");
  }
  return generateSource(initialSequence);
}
