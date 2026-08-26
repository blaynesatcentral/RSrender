export const studioPaneLimits = Object.freeze({
  splitterWidth: 6,
  minimumCanvasWidth: 320,
  contents: Object.freeze({ minimum: 180, maximum: 480, default: 244 }),
  properties: Object.freeze({ minimum: 240, maximum: 560, default: 292 }),
});

export type StudioPaneResizeTarget = "contents" | "properties" | "viewport";

export type StudioPaneWidths = Readonly<{
  contentsWidth: number;
  canvasWidth: number;
  propertiesWidth: number;
}>;

export type StudioViewportMetrics = Readonly<{
  /** Renderer-reported CSS viewport width. */
  innerWidth: number;
  /** Renderer-reported display scale. */
  devicePixelRatio: number;
  /** Renderer-reported available screen width, in CSS pixels. */
  availableScreenWidth: number;
}>;

function finiteInteger(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Converts an Electron/native physical-size mismatch into the width that is
 * actually visible to the renderer. Electron's Win32 SetWindowPos path can
 * leave innerWidth in physical pixels while devicePixelRatio remains > 1.
 * A correctly reported CSS viewport is left unchanged. Some Win32/Electron
 * The 32px allowance absorbs window-frame rounding. A larger available screen
 * alone is not evidence of a unit split: treating an ordinary maximized CSS
 * viewport that way causes the workspace to remain artificially narrow after
 * the native window grows.
 */
export function resolveStudioEffectiveViewportWidth(input: StudioViewportMetrics): number {
  const innerWidth = Math.max(1, finiteInteger(input.innerWidth, 1));
  const devicePixelRatio = Math.max(1, input.devicePixelRatio || 1);
  const availableScreenWidth = Math.max(0, finiteInteger(input.availableScreenWidth, 0));
  const nativeSizingMismatch =
    devicePixelRatio > 1 && availableScreenWidth > 0 && innerWidth > availableScreenWidth + 32;
  return nativeSizingMismatch ? Math.max(1, Math.floor(innerWidth / devicePixelRatio)) : innerWidth;
}

export function resolveStudioPaneWidths(input: {
  readonly workspaceWidth: number;
  readonly requestedContentsWidth: number;
  readonly requestedPropertiesWidth: number;
  readonly resizeTarget: StudioPaneResizeTarget;
}): StudioPaneWidths {
  const workspaceWidth = Math.max(
    studioPaneLimits.minimumCanvasWidth +
      studioPaneLimits.contents.minimum +
      studioPaneLimits.properties.minimum +
      studioPaneLimits.splitterWidth * 2,
    finiteInteger(input.workspaceWidth, 0),
  );
  const availableWidth = workspaceWidth - studioPaneLimits.splitterWidth * 2;
  const maximumSidePaneTotal = availableWidth - studioPaneLimits.minimumCanvasWidth;
  let contentsWidth = clamp(
    finiteInteger(input.requestedContentsWidth, studioPaneLimits.contents.default),
    studioPaneLimits.contents.minimum,
    studioPaneLimits.contents.maximum,
  );
  let propertiesWidth = clamp(
    finiteInteger(input.requestedPropertiesWidth, studioPaneLimits.properties.default),
    studioPaneLimits.properties.minimum,
    studioPaneLimits.properties.maximum,
  );

  let excess = Math.max(0, contentsWidth + propertiesWidth - maximumSidePaneTotal);
  const reductionOrder =
    input.resizeTarget === "contents"
      ? (["contents", "properties"] as const)
      : (["properties", "contents"] as const);
  for (const pane of reductionOrder) {
    if (excess === 0) break;
    const current = pane === "contents" ? contentsWidth : propertiesWidth;
    const minimum =
      pane === "contents" ? studioPaneLimits.contents.minimum : studioPaneLimits.properties.minimum;
    const reduction = Math.min(excess, current - minimum);
    if (pane === "contents") contentsWidth -= reduction;
    else propertiesWidth -= reduction;
    excess -= reduction;
  }

  return Object.freeze({
    contentsWidth,
    canvasWidth: availableWidth - contentsWidth - propertiesWidth,
    propertiesWidth,
  });
}

export type StudioContextMenuPosition = Readonly<{ left: number; top: number }>;

export function resolveStudioContextMenuPosition(input: {
  readonly clientX: number;
  readonly clientY: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly menuWidth: number;
  readonly menuHeight: number;
  readonly inset?: number;
}): StudioContextMenuPosition {
  const inset = Math.max(0, finiteInteger(input.inset ?? 8, 8));
  const viewportWidth = Math.max(1, finiteInteger(input.viewportWidth, 1));
  const viewportHeight = Math.max(1, finiteInteger(input.viewportHeight, 1));
  const menuWidth = Math.max(1, finiteInteger(input.menuWidth, 1));
  const menuHeight = Math.max(1, finiteInteger(input.menuHeight, 1));
  const maximumLeft = Math.max(inset, viewportWidth - menuWidth - inset);
  const maximumTop = Math.max(inset, viewportHeight - menuHeight - inset);
  return Object.freeze({
    left: clamp(finiteInteger(input.clientX, inset), inset, maximumLeft),
    top: clamp(finiteInteger(input.clientY, inset), inset, maximumTop),
  });
}
