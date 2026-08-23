/** Stable marker for the accepted scene package boundary. */
export const packageBoundary = "@rsrender/scene" as const;

export {
  boringLogLayoutEngineRevision,
  prepareBoringLogLayout,
  resolveBoringLogPageScene,
} from "./boring-log-layout-engine.js";
export type {
  BoringLogLayoutEngineRejectionCode,
  BoringLogLayoutEngineResult,
  BoringLogLayoutPreparation,
} from "./boring-log-layout-engine.js";
export {
  applyBoringLogTextMeasurements,
  boringLogTextResolutionRevision,
} from "./boring-log-text-resolution.js";
export type { BoringLogTextResolutionResult } from "./boring-log-text-resolution.js";
export {
  applyBoringLogTemplateTextStyleProperties,
  applyBoringLogTextOccurrenceStyles,
  boringLogTextOccurrenceAuthoringRevision,
  clearBoringLogTextOccurrencePresentation,
  prepareBoringLogLayoutWithTextOccurrenceStyles,
} from "./boring-log-text-occurrence-authoring.js";
export type {
  BoringLogTemplateTextProperty,
  BoringLogTemplateTextStyleResult,
  BoringLogTextOccurrenceAuthoringResult,
  BoringLogTextOccurrencePresentationResetResult,
} from "./boring-log-text-occurrence-authoring.js";
