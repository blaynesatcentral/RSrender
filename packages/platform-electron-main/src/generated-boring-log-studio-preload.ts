import { boringLogStudioPreloadBundleTemplate } from "./boring-log-studio-preload-bundle.js";

export const generatedBoringLogStudioPreloadRevision =
  "bld-027-generated-studio-publication-preload-v1" as const;

function replaceOne(source: string, placeholder: string, value: number): string {
  const replacement = `Number(${JSON.stringify(String(value))})`;
  const result = source.replace(`Number("${placeholder}")`, replacement);
  if (result === source || result.includes(placeholder)) {
    throw new Error("STUDIO_PRELOAD_BUNDLE_PLACEHOLDER_INVALID");
  }
  return result;
}

export function generateBoringLogStudioPreloadSource(): string {
  return replaceOne(
    replaceOne(
      replaceOne(boringLogStudioPreloadBundleTemplate, "__RSRENDER_INITIAL_SEQUENCE_LITERAL__", 0),
      "__RSRENDER_STUDIO_INITIAL_SEQUENCE_LITERAL__",
      0,
    ),
    "__RSRENDER_PUBLICATION_INITIAL_SEQUENCE_LITERAL__",
    0,
  );
}
