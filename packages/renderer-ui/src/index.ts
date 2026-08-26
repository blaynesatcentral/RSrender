/** Stable marker for the accepted renderer-ui package boundary. */
export const packageBoundary = "@rsrender/renderer-ui" as const;

/**
 * The page remains inert markup. BLD-012 adds one isolated-preload application
 * version query without adding page script, remote resources, input, or state.
 */
export const inertShellHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>RSrender security shell</title>
</head>
<body>
  <main aria-label="Empty security shell">
    <h1>RSrender security shell</h1>
    <p>One read-only application version query is available.</p>
  </main>
</body>
</html>
`;

export {
  semanticEditorMaximumStringUtf8Bytes,
  semanticEditorRevision,
  validateReplacement,
  validateTargetSelection,
} from "./semantic-override-editor-model.js";
export {
  semanticEditorScriptUrl,
  semanticOverrideEditorHtml,
} from "./semantic-override-editor-route.js";
export {
  boringLogSvgProjectionRevision,
  projectBoringLogSceneToSvg,
  type BoringLogSvgProjectionResult,
} from "./boring-log-svg-projection.js";
export {
  boringLogStudioScriptUrl,
  boringLogStudioStylesheetUrl,
  createBoringLogStudioHtml,
} from "./boring-log-studio-route.js";
export {
  nearestBoringLogDirectManipulationResizeHandle,
  resolveBoringLogDirectManipulationFrame,
  snapBoringLogDirectManipulationFrame,
  type BoringLogDirectManipulationFrame,
  type BoringLogDirectManipulationHandle,
  type BoringLogDirectManipulationResult,
  type BoringLogSnapResult,
} from "./boring-log-direct-manipulation.js";
export {
  resolveStudioContextMenuPosition,
  resolveStudioEffectiveViewportWidth,
  resolveStudioPaneWidths,
  resolveStudioRibbonGroupPlacement,
  studioPaneLimits,
  type StudioContextMenuPosition,
  type StudioPaneResizeTarget,
  type StudioPaneWidths,
  type StudioRibbonGroupMetrics,
  type StudioRibbonPlacement,
  type StudioViewportMetrics,
} from "./boring-log-studio-viewport.js";
export {
  boringLogAttributeTableCorpusLimits,
  resolveBoringLogAttributeTableWindow,
  type BoringLogAttributeTableWindow,
} from "./boring-log-attribute-table-window.js";
