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
export {
  boringLogDefaultColumnMinimumWidthMpt,
  boringLogColumnResizeRevision,
  resizeAdjacentBoringLogColumns,
  resizeBoringLogColumns,
} from "./boring-log-column-resize.js";
export type {
  BoringLogAdjacentColumnResizeResult,
  BoringLogColumnResizeConstraint,
  BoringLogColumnResizeMode,
} from "./boring-log-column-resize.js";
export {
  boringLogRegionResizeRevision,
  resizeBoringLogPageRegions,
} from "./boring-log-region-resize.js";
export type {
  BoringLogRegionBoundary,
  BoringLogRegionResizeResult,
} from "./boring-log-region-resize.js";
export {
  applyBoringLogPageSetup,
  boringLogPageSetupRevision,
  boringLogPaperPresetsMpt,
} from "./boring-log-page-setup.js";
export {
  boringLogDataLayerSymbologyRevision,
  resolveBoringLogDataLayerSymbology,
} from "./boring-log-data-layer-symbology.js";
export type {
  BoringLogDataLayerSymbologyOverride,
  BoringLogDataLayerSymbologyResult,
  BoringLogLineSymbol,
  BoringLogPointShape,
  BoringLogPointSymbol,
  BoringLogRangeSymbol,
  BoringLogResolvedDataLayerSymbology,
} from "./boring-log-data-layer-symbology.js";
export type { BoringLogPageSetupInput, BoringLogPageSetupResult } from "./boring-log-page-setup.js";
export {
  boringLogContinuationPagesRevision,
  planBoringLogContinuationPages,
} from "./boring-log-continuation-pages.js";
export {
  boringLogLithologyAppearanceRevision,
  resolveBoringLogLithologyAppearance,
  resolveBoringLogLithologyAppearances,
  resolveBoringLogLithologyPatternResources,
} from "./boring-log-lithology-appearance.js";
export type {
  BoringLogLithologyAppearanceApplication,
  ResolvedBoringLogLithologyAppearance,
} from "./boring-log-lithology-appearance.js";
export type {
  BoringLogContinuationPage,
  BoringLogContinuationPagesResult,
} from "./boring-log-continuation-pages.js";
export {
  arrangeBoringLogTextOccurrences,
  boringLogArrangementRevision,
} from "./boring-log-arrangement.js";
export {
  addProviderBoundBoringLogColumn,
  boringLogAddColumnRevision,
  boringLogMaximumColumnCount,
} from "./boring-log-add-column.js";
export type {
  BoringLogAddProviderColumnInput,
  BoringLogAddProviderColumnRejectionCode,
  BoringLogAddProviderColumnResult,
} from "./boring-log-add-column.js";
export type {
  BoringLogArrangementFrame,
  BoringLogArrangementItem,
  BoringLogArrangementOperation,
  BoringLogArrangementResult,
} from "./boring-log-arrangement.js";
export type {
  BoringLogTemplateTextProperty,
  BoringLogTemplateTextStyleResult,
  BoringLogTextOccurrenceAuthoringResult,
  BoringLogTextOccurrencePresentationResetResult,
} from "./boring-log-text-occurrence-authoring.js";
