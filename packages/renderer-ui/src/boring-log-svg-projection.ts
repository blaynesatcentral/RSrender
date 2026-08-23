import {
  validateResolvedBoringLogPageScene,
  type BoringLogSceneNode,
  type BoringLogTextMeasurementResult,
  type ResolvedBoringLogPageScene,
} from "@rsrender/contracts";

export const boringLogSvgProjectionRevision = "bld-025-svg-projection-v1" as const;

export type BoringLogSvgProjectionResult =
  | Readonly<{
      readonly accepted: true;
      readonly scene: ResolvedBoringLogPageScene;
      readonly markup: string;
      readonly pageId: string;
      readonly semanticElementCount: number;
    }>
  | Readonly<{
      readonly accepted: false;
      readonly code: "BORING_LOG_SVG_SCENE_REJECTED" | "BORING_LOG_SVG_PAGE_MISSING";
      readonly detail: string;
    }>;

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function attribute(name: string, value: string | number): string {
  return ` ${name}="${escapeAttribute(String(value))}"`;
}

function semanticAttributes(node: BoringLogSceneNode, selectedSemanticId: string | null): string {
  const provenance = node.provenance === null ? "computed" : node.provenance.provenanceClass;
  return [
    attribute("id", node.id),
    attribute("data-node-id", node.id),
    attribute("data-semantic-id", node.semanticId),
    attribute("data-node-role", node.role),
    attribute("data-provenance", provenance),
    attribute(
      "class",
      node.semanticId === selectedSemanticId ? "scene-node is-selected" : "scene-node",
    ),
  ].join("");
}

function tokenPaint(
  token: string | null,
  tokens: Readonly<Record<string, string>>,
  patternIds: ReadonlySet<string>,
): string {
  if (token === null) return "none";
  if (patternIds.has(token)) return `url(#${escapeAttribute(token)})`;
  return tokens[token] ?? token;
}

function renderPatterns(scene: ResolvedBoringLogPageScene): string {
  const tokens = scene.resources.visualTokens;
  return scene.resources.patterns
    .map((pattern) => {
      const foreground = tokenPaint(pattern.foregroundToken, tokens, new Set());
      const background = tokenPaint(pattern.backgroundToken, tokens, new Set());
      if (pattern.kind === "line-hatch") {
        return `<pattern${attribute("id", pattern.id)} patternUnits="userSpaceOnUse"${attribute("width", pattern.spacingMpt)}${attribute("height", pattern.spacingMpt)}><rect${attribute("width", pattern.spacingMpt)}${attribute("height", pattern.spacingMpt)}${attribute("fill", background)}/><path${attribute("d", `M 0 ${pattern.spacingMpt} L ${pattern.spacingMpt} 0`)}${attribute("stroke", foreground)}${attribute("stroke-width", pattern.strokeWidthMpt)} fill="none"/></pattern>`;
      }
      if (pattern.kind === "horizontal-dash") {
        const center = Math.round(pattern.spacingMpt / 2);
        return `<pattern${attribute("id", pattern.id)} patternUnits="userSpaceOnUse"${attribute("width", pattern.spacingMpt)}${attribute("height", pattern.spacingMpt)}><rect${attribute("width", pattern.spacingMpt)}${attribute("height", pattern.spacingMpt)}${attribute("fill", background)}/><path${attribute("d", `M 0 ${center} L ${pattern.markSizeMpt} ${center}`)}${attribute("stroke", foreground)}${attribute("stroke-width", pattern.strokeWidthMpt)} fill="none"/></pattern>`;
      }
      const center = Math.round(pattern.spacingMpt / 2);
      return `<pattern${attribute("id", pattern.id)} patternUnits="userSpaceOnUse"${attribute("width", pattern.spacingMpt)}${attribute("height", pattern.spacingMpt)}><rect${attribute("width", pattern.spacingMpt)}${attribute("height", pattern.spacingMpt)}${attribute("fill", background)}/><circle${attribute("cx", center)}${attribute("cy", center)}${attribute("r", pattern.markSizeMpt)} fill="none"${attribute("stroke", foreground)}${attribute("stroke-width", pattern.strokeWidthMpt)}/></pattern>`;
    })
    .join("");
}

function renderNode(
  node: BoringLogSceneNode,
  nodes: ReadonlyMap<string, BoringLogSceneNode>,
  measurements: ReadonlyMap<string, BoringLogTextMeasurementResult>,
  scene: ResolvedBoringLogPageScene,
  selectedSemanticId: string | null,
  stack: ReadonlySet<string>,
): string {
  if (stack.has(node.id)) return "";
  const nextStack = new Set(stack).add(node.id);
  const common = semanticAttributes(node, selectedSemanticId);
  const tokens = scene.resources.visualTokens;
  const patternIds = new Set(scene.resources.patterns.map(({ id }) => id));
  if (node.kind === "group") {
    const children = node.childIds
      .map((id) => nodes.get(id))
      .filter((child): child is BoringLogSceneNode => child !== undefined)
      .map((child) => renderNode(child, nodes, measurements, scene, selectedSemanticId, nextStack))
      .join("");
    return `<g${common}${attribute("aria-label", node.role)}>${children}</g>`;
  }
  if (node.kind === "rect") {
    return `<rect${common}${attribute("x", node.bounds.xMpt)}${attribute("y", node.bounds.yMpt)}${attribute("width", node.bounds.widthMpt)}${attribute("height", node.bounds.heightMpt)}${attribute("fill", tokenPaint(node.fillToken, tokens, patternIds))}${attribute("stroke", tokenPaint(node.strokeToken, tokens, patternIds))}${attribute("stroke-width", node.strokeWidthMpt)}/>`;
  }
  if (node.kind === "line") {
    const dash =
      node.dashMpt.length === 0 ? "" : attribute("stroke-dasharray", node.dashMpt.join(" "));
    return `<line${common}${attribute("x1", node.from.xMpt)}${attribute("y1", node.from.yMpt)}${attribute("x2", node.to.xMpt)}${attribute("y2", node.to.yMpt)}${attribute("stroke", tokenPaint(node.strokeToken, tokens, patternIds))}${attribute("stroke-width", node.strokeWidthMpt)}${dash}/>`;
  }
  if (node.kind === "path") {
    const points = node.points.map(({ xMpt, yMpt }) => `${xMpt},${yMpt}`).join(" ");
    const elementName = node.closed ? "polygon" : "polyline";
    const dash =
      node.dashMpt.length === 0 ? "" : attribute("stroke-dasharray", node.dashMpt.join(" "));
    return `<${elementName}${common}${attribute("points", points)}${attribute("fill", tokenPaint(node.fillToken, tokens, patternIds))}${attribute("stroke", tokenPaint(node.strokeToken, tokens, patternIds))}${attribute("stroke-width", node.strokeWidthMpt)}${dash}/>`;
  }
  if (node.kind === "circle") {
    return `<circle${common}${attribute("cx", node.center.xMpt)}${attribute("cy", node.center.yMpt)}${attribute("r", node.radiusMpt)}${attribute("fill", tokenPaint(node.fillToken, tokens, patternIds))}${attribute("stroke", tokenPaint(node.strokeToken, tokens, patternIds))}${attribute("stroke-width", node.strokeWidthMpt)}/>`;
  }
  const measurement = measurements.get(node.measurementId);
  const style = scene.resources.textStyles.find(({ id }) => id === node.styleId);
  if (measurement === undefined || style === undefined) return "";
  const presentation = node.presentation;
  const padding = presentation?.paddingMpt ?? {
    topMpt: 0,
    rightMpt: 0,
    bottomMpt: 0,
    leftMpt: 0,
  };
  const innerWidth = node.frame.widthMpt - padding.leftMpt - padding.rightMpt;
  const innerHeight = node.frame.heightMpt - padding.topMpt - padding.bottomMpt;
  const verticalOffset =
    presentation?.verticalAlignment === "middle"
      ? Math.round((innerHeight - measurement.logicalBounds.heightMpt) / 2)
      : presentation?.verticalAlignment === "bottom"
        ? innerHeight - measurement.logicalBounds.heightMpt
        : 0;
  const lines = measurement.lines
    .map((line) => {
      const horizontalOffset =
        presentation?.horizontalAlignment === "center"
          ? Math.round((innerWidth - line.advanceMpt) / 2)
          : presentation?.horizontalAlignment === "end"
            ? innerWidth - line.advanceMpt
            : 0;
      return `<tspan${attribute("x", node.frame.xMpt + padding.leftMpt + horizontalOffset + line.xMpt)}${attribute("y", node.frame.yMpt + padding.topMpt + verticalOffset + line.baselineMpt)}${attribute("data-source-start", line.sourceStartUtf16)}${attribute("data-source-end", line.sourceEndUtf16)}${attribute("data-advance-mpt", line.advanceMpt)}>${escapeText(line.text)}</tspan>`;
    })
    .join("");
  const presentationAttributes =
    presentation === undefined
      ? ""
      : `${attribute("data-frame-anchor", presentation.frameAnchor ?? "top-left")}${attribute("data-horizontal-alignment", presentation.horizontalAlignment)}${attribute("data-vertical-alignment", presentation.verticalAlignment)}${attribute("data-wrap-policy", presentation.wrapPolicy)}${attribute("data-overflow-policy", presentation.overflowPolicy)}${presentation.minimumFontSizeMpt === undefined ? "" : attribute("data-minimum-font-size-mpt", presentation.minimumFontSizeMpt)}${attribute("data-position-mode", presentation.positionMode)}${attribute("data-locked", String(presentation.locked))}${attribute("data-frame-x-mpt", node.frame.xMpt)}${attribute("data-frame-y-mpt", node.frame.yMpt)}${attribute("data-frame-width-mpt", node.frame.widthMpt)}${attribute("data-frame-height-mpt", node.frame.heightMpt)}${presentation.rotationMilliDegrees === 0 ? "" : attribute("transform", `rotate(${presentation.rotationMilliDegrees / 1_000} ${node.frame.xMpt + Math.round(node.frame.widthMpt / 2)} ${node.frame.yMpt + Math.round(node.frame.heightMpt / 2)})`)}`;
  const frameTransform =
    presentation === undefined || presentation.rotationMilliDegrees === 0
      ? ""
      : attribute(
          "transform",
          `rotate(${presentation.rotationMilliDegrees / 1_000} ${node.frame.xMpt + Math.round(node.frame.widthMpt / 2)} ${node.frame.yMpt + Math.round(node.frame.heightMpt / 2)})`,
        );
  const frameMarkup =
    presentation?.frameStrokeWidthMpt === undefined ||
    (presentation.frameFillColor === null && presentation.frameStrokeColor === null)
      ? ""
      : `<rect${attribute("id", `${node.id}:presentation-frame`)}${attribute("data-text-frame-owner", node.id)}${attribute("data-semantic-id", node.semanticId)}${attribute("data-node-role", "text-presentation-frame")}${attribute("x", node.frame.xMpt)}${attribute("y", node.frame.yMpt)}${attribute("width", node.frame.widthMpt)}${attribute("height", node.frame.heightMpt)}${attribute("fill", presentation.frameFillColor ?? "none")}${attribute("stroke", presentation.frameStrokeColor ?? "none")}${attribute("stroke-width", presentation.frameStrokeWidthMpt)}${attribute("pointer-events", "none")}${frameTransform}/>`;
  return `${frameMarkup}<text${common}${attribute("font-family", "RSrender Qualified Arial")}${attribute("font-size", measurement.effectiveFontSizeMpt)}${attribute("font-weight", style.fontWeight)}${style.textDecoration === undefined || style.textDecoration === "none" ? "" : attribute("text-decoration", style.textDecoration)}${style.letterSpacingMpt === undefined ? "" : attribute("letter-spacing", style.letterSpacingMpt)}${style.wordSpacingMpt === undefined ? "" : attribute("word-spacing", style.wordSpacingMpt)}${attribute("fill", style.color)}${attribute("data-font-family-id", style.fontFamilyId)}${attribute("data-text-decoration", style.textDecoration ?? "none")}${style.letterSpacingMpt === undefined ? "" : attribute("data-letter-spacing-mpt", style.letterSpacingMpt)}${style.wordSpacingMpt === undefined ? "" : attribute("data-word-spacing-mpt", style.wordSpacingMpt)}${style.paragraphSpacingMpt === undefined ? "" : attribute("data-paragraph-spacing-mpt", style.paragraphSpacingMpt)}${attribute("data-authored-font-size-mpt", style.fontSizeMpt)}${attribute("data-effective-font-size-mpt", measurement.effectiveFontSizeMpt)}${attribute("data-font-face-digest", measurement.fontFaceDigest)}${attribute("data-font-metrics-digest", measurement.fontMetricsDigest)}${attribute("data-measurement-id", node.measurementId)}${attribute("data-overflow", measurement.overflow)}${presentationAttributes}>${lines}</text>`;
}

export function projectBoringLogSceneToSvg(
  input: unknown,
  selectedSemanticId: string | null = null,
): BoringLogSvgProjectionResult {
  const validated = validateResolvedBoringLogPageScene(input);
  if (!validated.accepted) {
    return Object.freeze({
      accepted: false,
      code: "BORING_LOG_SVG_SCENE_REJECTED",
      detail: validated.code,
    });
  }
  const scene = validated.value;
  const page = scene.pages[0];
  if (page === undefined) {
    return Object.freeze({
      accepted: false,
      code: "BORING_LOG_SVG_PAGE_MISSING",
      detail: "Resolved scene has no page",
    });
  }
  const nodes = new Map(page.nodes.map((node) => [node.id, node]));
  const measurements = new Map(scene.textResults.map((result) => [result.measurementId, result]));
  const root = nodes.get(page.rootNodeId);
  if (root === undefined) {
    return Object.freeze({
      accepted: false,
      code: "BORING_LOG_SVG_PAGE_MISSING",
      detail: "Resolved scene root is missing",
    });
  }
  const body = renderNode(root, nodes, measurements, scene, selectedSemanticId, new Set());
  const markup = `<svg xmlns="http://www.w3.org/2000/svg"${attribute("viewBox", `0 0 ${page.widthMpt} ${page.heightMpt}`)}${attribute("data-page-id", page.pageId)}${attribute("data-scene-input-digest", scene.inputDigest)} role="document" aria-label="Structured boring log page"><defs>${renderPatterns(scene)}</defs>${body}</svg>`;
  return Object.freeze({
    accepted: true,
    scene,
    markup,
    pageId: page.pageId,
    semanticElementCount: page.nodes.length,
  });
}
