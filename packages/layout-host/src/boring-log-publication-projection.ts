import {
  boringLogBorderDashMpt,
  resolveExactFontProjectionFace,
  rsrenderSansFontProjectionBindings,
  rsrenderSansPublicationFontResources,
  sha256CanonicalJson,
  validateFontProjectionBindingCatalog,
  validateFontProjectionFaceResources,
  validateResolvedBoringLogPageScene,
  type BoringLogSceneNode,
  type BoringLogTextMeasurementResult,
  type FontProjectionBindingCatalog,
  type FontProjectionFaceResource,
  type ResolvedBoringLogPageScene,
} from "@rsrender/contracts";

export const boringLogPublicationProjectionRevision = "bld-027-layout-host-publication-v1" as const;

export interface BoringLogPublicationProjectionManifest {
  readonly schema: "rsrender.boring-log-publication-projection-manifest.v1";
  readonly revision: typeof boringLogPublicationProjectionRevision;
  readonly sceneInputDigest: string;
  readonly sceneDigest: string;
  readonly pagePlanDigest: string;
  readonly pageId: string;
  readonly widthMpt: number;
  readonly heightMpt: number;
  readonly sceneNodeCount: number;
  readonly semanticElementCount: number;
  readonly textNodeCount: number;
  readonly textLineCount: number;
  readonly sourceRangeDigest: string;
  readonly semanticOrderDigest: string;
  readonly fontFaceDigests: readonly string[];
  readonly fontMetricsDigests: readonly string[];
  readonly fontFaceIds: readonly string[];
  readonly fontProjectionDigest: string;
  readonly pageCount?: number;
  readonly pageIds?: readonly string[];
  readonly pageSizes?: readonly Readonly<{ widthMpt: number; heightMpt: number }>[];
}

export interface BoringLogPublicationProjection {
  readonly schema: "rsrender.boring-log-publication-projection.v1";
  readonly manifest: BoringLogPublicationProjectionManifest;
  readonly projectionDigest: string;
  readonly documentTitle: string;
  readonly svgMarkup: string;
  readonly html: string;
  readonly fontFaceCss: string;
}

export interface BoringLogPublicationFontProjectionInput {
  readonly bindings: FontProjectionBindingCatalog;
  readonly resources: readonly FontProjectionFaceResource[];
}

export const rsrenderSansPublicationFontProjection: BoringLogPublicationFontProjectionInput =
  Object.freeze({
    bindings: rsrenderSansFontProjectionBindings,
    resources: rsrenderSansPublicationFontResources,
  });

export type BoringLogPublicationProjectionResult =
  | { readonly accepted: true; readonly projection: BoringLogPublicationProjection }
  | {
      readonly accepted: false;
      readonly code:
        | "BORING_LOG_PUBLICATION_SCENE_REJECTED"
        | "BORING_LOG_PUBLICATION_PAGE_MISSING"
        | "BORING_LOG_PUBLICATION_FONT_BINDING_REJECTED";
    };

interface ResolvedPublicationFace {
  readonly faceId: string;
  readonly cssFamilyName: string;
}

function cssString(value: string): string {
  return `"${value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("&", "\\26 ")
    .replaceAll("<", "\\3c ")
    .replaceAll(">", "\\3e ")
    .replaceAll("\n", "\\a ")
    .replaceAll("\r", "\\d ")}"`;
}

function resolvePublicationFonts(
  scene: ResolvedBoringLogPageScene,
  input: unknown,
):
  | Readonly<{
      readonly accepted: true;
      readonly byStyleId: ReadonlyMap<string, ResolvedPublicationFace>;
      readonly fontFaceCss: string;
      readonly fontFaceIds: readonly string[];
      readonly fontProjectionDigest: string;
    }>
  | Readonly<{ readonly accepted: false }> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return Object.freeze({ accepted: false });
  }
  const keys = Reflect.ownKeys(input);
  if (keys.length !== 2 || keys.some((key) => key !== "bindings" && key !== "resources")) {
    return Object.freeze({ accepted: false });
  }
  const bindingsDescriptor = Object.getOwnPropertyDescriptor(input, "bindings");
  const resourcesDescriptor = Object.getOwnPropertyDescriptor(input, "resources");
  if (
    !bindingsDescriptor?.enumerable ||
    !("value" in bindingsDescriptor) ||
    !resourcesDescriptor?.enumerable ||
    !("value" in resourcesDescriptor)
  ) {
    return Object.freeze({ accepted: false });
  }
  const catalog = validateFontProjectionBindingCatalog(bindingsDescriptor.value);
  if (!catalog.accepted) return Object.freeze({ accepted: false });
  const resources = validateFontProjectionFaceResources(resourcesDescriptor.value, catalog.value);
  if (!resources.accepted) return Object.freeze({ accepted: false });
  const resourceByFaceId = new Map(resources.value.map((resource) => [resource.faceId, resource]));
  const byStyleId = new Map<string, ResolvedPublicationFace>();
  const usedFaceIds = new Set<string>();
  for (const style of scene.resources.textStyles) {
    const resolved = resolveExactFontProjectionFace(
      catalog.value,
      style.fontFamilyId,
      style.fontStyle ?? "normal",
      style.fontWeight,
    );
    if (!resolved.accepted || !resourceByFaceId.has(resolved.face.faceId)) {
      return Object.freeze({ accepted: false });
    }
    usedFaceIds.add(resolved.face.faceId);
    byStyleId.set(
      style.id,
      Object.freeze({
        faceId: resolved.face.faceId,
        cssFamilyName: resolved.family.cssFamilyName,
      }),
    );
  }
  const fontFaceCss = catalog.value.faces
    .filter(({ faceId }) => usedFaceIds.has(faceId))
    .map((face) => {
      const family = catalog.value.families.find(({ familyId }) => familyId === face.familyId)!;
      const resource = resourceByFaceId.get(face.faceId)!;
      return `@font-face{font-family:${cssString(family.cssFamilyName)};src:url(${cssString(resource.resourceUrl)}) format(${cssString(resource.format)});font-style:${face.style};font-weight:${face.weight}}`;
    })
    .join("");
  const fontFaceIds = Object.freeze(
    catalog.value.faces.filter(({ faceId }) => usedFaceIds.has(faceId)).map(({ faceId }) => faceId),
  );
  const fontProjectionDigest = sha256CanonicalJson({
    bindings: catalog.value,
    resources: resources.value.filter(({ faceId }) => usedFaceIds.has(faceId)),
    fontFaceIds,
  });
  return Object.freeze({
    accepted: true,
    byStyleId,
    fontFaceCss,
    fontFaceIds,
    fontProjectionDigest,
  });
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function attribute(name: string, value: string | number): string {
  return ` ${name}="${escapeAttribute(String(value))}"`;
}

function textFrameBorderMarkup(
  node: Extract<BoringLogSceneNode, { readonly kind: "text" }>,
  frameTransform: string,
): string {
  const border = node.presentation?.frameBorder;
  if (border === undefined) return "";
  const dash = boringLogBorderDashMpt(border.linePattern);
  const dashAttribute =
    dash.length === 0 ? "" : attribute("stroke-dasharray", dash.map(points).join(" "));
  const common = `${attribute("data-text-frame-owner", node.id)}${attribute("data-semantic-id", node.semanticId)}${attribute("data-node-role", "text-presentation-frame-border")}${attribute("stroke", border.color)}${attribute("stroke-width", points(border.widthMpt))}${attribute("pointer-events", "none")}${dashAttribute}${frameTransform}`;
  const x1 = points(node.frame.xMpt);
  const x2 = points(node.frame.xMpt + node.frame.widthMpt);
  const y1 = points(node.frame.yMpt);
  const y2 = points(node.frame.yMpt + node.frame.heightMpt);
  return [
    border.top
      ? `<line${attribute("id", `${node.id}:presentation-frame:border-top`)}${common}${attribute("x1", x1)}${attribute("y1", y1)}${attribute("x2", x2)}${attribute("y2", y1)}/>`
      : "",
    border.right
      ? `<line${attribute("id", `${node.id}:presentation-frame:border-right`)}${common}${attribute("x1", x2)}${attribute("y1", y1)}${attribute("x2", x2)}${attribute("y2", y2)}/>`
      : "",
    border.bottom
      ? `<line${attribute("id", `${node.id}:presentation-frame:border-bottom`)}${common}${attribute("x1", x1)}${attribute("y1", y2)}${attribute("x2", x2)}${attribute("y2", y2)}/>`
      : "",
    border.left
      ? `<line${attribute("id", `${node.id}:presentation-frame:border-left`)}${common}${attribute("x1", x1)}${attribute("y1", y1)}${attribute("x2", x1)}${attribute("y2", y2)}/>`
      : "",
  ].join("");
}

function nodeAttributes(node: BoringLogSceneNode): string {
  const provenance = node.provenance === null ? "computed" : node.provenance.provenanceClass;
  return [
    attribute("id", node.id),
    attribute("data-semantic-id", node.semanticId),
    attribute("data-node-role", node.role),
    attribute("data-provenance", provenance),
    attribute("class", "scene-node"),
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
        return `<pattern${attribute("id", pattern.id)} patternUnits="userSpaceOnUse"${attribute("width", points(pattern.spacingMpt))}${attribute("height", points(pattern.spacingMpt))}><rect${attribute("width", points(pattern.spacingMpt))}${attribute("height", points(pattern.spacingMpt))}${attribute("fill", background)}/><path${attribute("d", `M 0 ${points(pattern.spacingMpt)} L ${points(pattern.spacingMpt)} 0`)}${attribute("stroke", foreground)}${attribute("stroke-width", points(pattern.strokeWidthMpt))} fill="none"/></pattern>`;
      }
      if (pattern.kind === "horizontal-dash") {
        const center = points(Math.round(pattern.spacingMpt / 2));
        return `<pattern${attribute("id", pattern.id)} patternUnits="userSpaceOnUse"${attribute("width", points(pattern.spacingMpt))}${attribute("height", points(pattern.spacingMpt))}><rect${attribute("width", points(pattern.spacingMpt))}${attribute("height", points(pattern.spacingMpt))}${attribute("fill", background)}/><path${attribute("d", `M 0 ${center} L ${points(pattern.markSizeMpt)} ${center}`)}${attribute("stroke", foreground)}${attribute("stroke-width", points(pattern.strokeWidthMpt))} fill="none"/></pattern>`;
      }
      const center = points(Math.round(pattern.spacingMpt / 2));
      return `<pattern${attribute("id", pattern.id)} patternUnits="userSpaceOnUse"${attribute("width", points(pattern.spacingMpt))}${attribute("height", points(pattern.spacingMpt))}><rect${attribute("width", points(pattern.spacingMpt))}${attribute("height", points(pattern.spacingMpt))}${attribute("fill", background)}/><circle${attribute("cx", center)}${attribute("cy", center)}${attribute("r", points(pattern.markSizeMpt))} fill="none"${attribute("stroke", foreground)}${attribute("stroke-width", points(pattern.strokeWidthMpt))}/></pattern>`;
    })
    .join("");
}

function renderNode(
  node: BoringLogSceneNode,
  nodes: ReadonlyMap<string, BoringLogSceneNode>,
  measurements: ReadonlyMap<string, BoringLogTextMeasurementResult>,
  scene: ResolvedBoringLogPageScene,
  fontFaces: ReadonlyMap<string, ResolvedPublicationFace>,
  stack: ReadonlySet<string>,
): string {
  if (stack.has(node.id)) return "";
  const nextStack = new Set(stack).add(node.id);
  const common = nodeAttributes(node);
  const tokens = scene.resources.visualTokens;
  const patternIds = new Set(scene.resources.patterns.map(({ id }) => id));
  if (node.kind === "group") {
    const children = node.childIds
      .map((id) => nodes.get(id))
      .filter((child): child is BoringLogSceneNode => child !== undefined)
      .map((child) => renderNode(child, nodes, measurements, scene, fontFaces, nextStack))
      .join("");
    return `<g${common}${attribute("aria-label", node.role)}>${children}</g>`;
  }
  if (node.kind === "rect") {
    return `<rect${common}${attribute("x", points(node.bounds.xMpt))}${attribute("y", points(node.bounds.yMpt))}${attribute("width", points(node.bounds.widthMpt))}${attribute("height", points(node.bounds.heightMpt))}${attribute("fill", tokenPaint(node.fillToken, tokens, patternIds))}${attribute("stroke", tokenPaint(node.strokeToken, tokens, patternIds))}${attribute("stroke-width", points(node.strokeWidthMpt))}/>`;
  }
  if (node.kind === "line") {
    const dash =
      node.dashMpt.length === 0
        ? ""
        : attribute("stroke-dasharray", node.dashMpt.map(points).join(" "));
    return `<line${common}${attribute("x1", points(node.from.xMpt))}${attribute("y1", points(node.from.yMpt))}${attribute("x2", points(node.to.xMpt))}${attribute("y2", points(node.to.yMpt))}${attribute("stroke", tokenPaint(node.strokeToken, tokens, patternIds))}${attribute("stroke-width", points(node.strokeWidthMpt))}${dash}/>`;
  }
  if (node.kind === "path") {
    const pathPoints = node.points
      .map(({ xMpt, yMpt }) => `${points(xMpt)},${points(yMpt)}`)
      .join(" ");
    const elementName = node.closed ? "polygon" : "polyline";
    const dash =
      node.dashMpt.length === 0
        ? ""
        : attribute("stroke-dasharray", node.dashMpt.map(points).join(" "));
    return `<${elementName}${common}${attribute("points", pathPoints)}${attribute("fill", tokenPaint(node.fillToken, tokens, patternIds))}${attribute("stroke", tokenPaint(node.strokeToken, tokens, patternIds))}${attribute("stroke-width", points(node.strokeWidthMpt))}${dash}/>`;
  }
  if (node.kind === "circle") {
    return `<circle${common}${attribute("cx", points(node.center.xMpt))}${attribute("cy", points(node.center.yMpt))}${attribute("r", points(node.radiusMpt))}${attribute("fill", tokenPaint(node.fillToken, tokens, patternIds))}${attribute("stroke", tokenPaint(node.strokeToken, tokens, patternIds))}${attribute("stroke-width", points(node.strokeWidthMpt))}/>`;
  }
  const measurement = measurements.get(node.measurementId);
  const style = scene.resources.textStyles.find(({ id }) => id === node.styleId);
  const fontFace = fontFaces.get(node.styleId);
  if (measurement === undefined || style === undefined || fontFace === undefined) return "";
  const presentation = node.presentation;
  if (presentation?.visible === false) return "";
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
      return `<tspan${attribute("x", points(node.frame.xMpt + padding.leftMpt + horizontalOffset + line.xMpt))}${attribute("y", points(node.frame.yMpt + padding.topMpt + verticalOffset + line.baselineMpt))}${attribute("data-source-start", line.sourceStartUtf16)}${attribute("data-source-end", line.sourceEndUtf16)}${attribute("data-advance-mpt", line.advanceMpt)}>${escapeText(line.text)}</tspan>`;
    })
    .join("");
  const presentationAttributes =
    presentation === undefined
      ? ""
      : `${attribute("data-frame-anchor", presentation.frameAnchor ?? "top-left")}${attribute("data-horizontal-alignment", presentation.horizontalAlignment)}${attribute("data-vertical-alignment", presentation.verticalAlignment)}${attribute("data-wrap-policy", presentation.wrapPolicy)}${attribute("data-overflow-policy", presentation.overflowPolicy)}${presentation.minimumFontSizeMpt === undefined ? "" : attribute("data-minimum-font-size-mpt", presentation.minimumFontSizeMpt)}${attribute("data-position-mode", presentation.positionMode)}${attribute("data-locked", String(presentation.locked))}${attribute("data-frame-x-mpt", node.frame.xMpt)}${attribute("data-frame-y-mpt", node.frame.yMpt)}${attribute("data-frame-width-mpt", node.frame.widthMpt)}${attribute("data-frame-height-mpt", node.frame.heightMpt)}${presentation.rotationMilliDegrees === 0 ? "" : attribute("transform", `rotate(${presentation.rotationMilliDegrees / 1_000} ${points(node.frame.xMpt + Math.round(node.frame.widthMpt / 2))} ${points(node.frame.yMpt + Math.round(node.frame.heightMpt / 2))})`)}`;
  const frameTransform =
    presentation === undefined || presentation.rotationMilliDegrees === 0
      ? ""
      : attribute(
          "transform",
          `rotate(${presentation.rotationMilliDegrees / 1_000} ${points(node.frame.xMpt + Math.round(node.frame.widthMpt / 2))} ${points(node.frame.yMpt + Math.round(node.frame.heightMpt / 2))})`,
        );
  const frameMarkup =
    presentation?.frameBorder === undefined
      ? presentation?.frameStrokeWidthMpt === undefined ||
        (presentation.frameFillColor === null && presentation.frameStrokeColor === null)
        ? ""
        : `<rect${attribute("id", `${node.id}:presentation-frame`)}${attribute("data-text-frame-owner", node.id)}${attribute("data-semantic-id", node.semanticId)}${attribute("data-node-role", "text-presentation-frame")}${attribute("x", points(node.frame.xMpt))}${attribute("y", points(node.frame.yMpt))}${attribute("width", points(node.frame.widthMpt))}${attribute("height", points(node.frame.heightMpt))}${attribute("fill", presentation.frameFillColor ?? "none")}${attribute("stroke", presentation.frameStrokeColor ?? "none")}${attribute("stroke-width", points(presentation.frameStrokeWidthMpt))}${attribute("pointer-events", "none")}${frameTransform}/>`
      : `${presentation.frameFillColor == null ? "" : `<rect${attribute("id", `${node.id}:presentation-frame`)}${attribute("data-text-frame-owner", node.id)}${attribute("data-semantic-id", node.semanticId)}${attribute("data-node-role", "text-presentation-frame")}${attribute("x", points(node.frame.xMpt))}${attribute("y", points(node.frame.yMpt))}${attribute("width", points(node.frame.widthMpt))}${attribute("height", points(node.frame.heightMpt))}${attribute("fill", presentation.frameFillColor)} stroke="none"${attribute("pointer-events", "none")}${frameTransform}/>`}${textFrameBorderMarkup(node, frameTransform)}`;
  return `${frameMarkup}<text${common}${attribute("font-family", fontFace.cssFamilyName)}${attribute("font-size", points(measurement.effectiveFontSizeMpt))}${attribute("font-style", style.fontStyle ?? "normal")}${attribute("font-weight", style.fontWeight)}${style.textDecoration === undefined || style.textDecoration === "none" ? "" : attribute("text-decoration", style.textDecoration)}${style.letterSpacingMpt === undefined ? "" : attribute("letter-spacing", points(style.letterSpacingMpt))}${style.wordSpacingMpt === undefined ? "" : attribute("word-spacing", points(style.wordSpacingMpt))}${attribute("fill", style.color)}${attribute("data-font-family-id", style.fontFamilyId)}${attribute("data-font-face-id", fontFace.faceId)}${attribute("data-font-style", style.fontStyle ?? "normal")}${attribute("data-text-decoration", style.textDecoration ?? "none")}${style.letterSpacingMpt === undefined ? "" : attribute("data-letter-spacing-mpt", style.letterSpacingMpt)}${style.wordSpacingMpt === undefined ? "" : attribute("data-word-spacing-mpt", style.wordSpacingMpt)}${style.paragraphSpacingMpt === undefined ? "" : attribute("data-paragraph-spacing-mpt", style.paragraphSpacingMpt)}${attribute("data-authored-font-size-mpt", style.fontSizeMpt)}${attribute("data-effective-font-size-mpt", measurement.effectiveFontSizeMpt)}${attribute("data-font-face-digest", measurement.fontFaceDigest)}${attribute("data-font-metrics-digest", measurement.fontMetricsDigest)}${attribute("data-measurement-id", node.measurementId)}${attribute("data-overflow", measurement.overflow)}${presentationAttributes}>${lines}</text>`;
}

function points(mpt: number): string {
  return Number.isInteger(mpt / 1_000) ? String(mpt / 1_000) : (mpt / 1_000).toFixed(3);
}

export function projectBoringLogSceneForPublication(
  input: unknown,
  fontProjectionInput: BoringLogPublicationFontProjectionInput = rsrenderSansPublicationFontProjection,
): BoringLogPublicationProjectionResult {
  const validated = validateResolvedBoringLogPageScene(input);
  if (!validated.accepted) {
    return Object.freeze({
      accepted: false,
      code: "BORING_LOG_PUBLICATION_SCENE_REJECTED",
    });
  }
  const scene = validated.value;
  const fontProjection = resolvePublicationFonts(scene, fontProjectionInput);
  if (!fontProjection.accepted) {
    return Object.freeze({
      accepted: false,
      code: "BORING_LOG_PUBLICATION_FONT_BINDING_REJECTED",
    });
  }
  if (scene.pages.length > 1) {
    const projections = scene.pages.map((scenePage) => {
      const plannedPage = scene.pagePlan.pages.find(({ pageId }) => pageId === scenePage.pageId)!;
      const pageScene = {
        ...scene,
        pagePlan: {
          ...scene.pagePlan,
          pages: [{ ...plannedPage, pageIndex: 0 }],
        },
        pages: [scenePage],
      };
      const projected = projectBoringLogSceneForPublication(pageScene, fontProjectionInput);
      if (!projected.accepted) throw new Error(projected.code);
      return projected.projection;
    });
    const first = scene.pages[0]!;
    const manifest = Object.freeze({
      ...projections[0]!.manifest,
      sceneDigest: sha256CanonicalJson(scene),
      pagePlanDigest: sha256CanonicalJson(scene.pagePlan),
      pageId: scene.pages[0]!.pageId,
      sceneNodeCount: scene.pages.reduce((total, page) => total + page.nodes.length, 0),
      semanticElementCount: scene.pages.reduce(
        (total, page) => total + page.semanticOrder.length,
        0,
      ),
      textNodeCount: projections.reduce(
        (total, projection) => total + projection.manifest.textNodeCount,
        0,
      ),
      textLineCount: projections.reduce(
        (total, projection) => total + projection.manifest.textLineCount,
        0,
      ),
      sourceRangeDigest: sha256CanonicalJson(
        projections.map(({ manifest }) => manifest.sourceRangeDigest),
      ),
      semanticOrderDigest: sha256CanonicalJson(
        projections.map(({ manifest }) => manifest.semanticOrderDigest),
      ),
      pageCount: scene.pages.length,
      pageIds: Object.freeze(scene.pages.map(({ pageId }) => pageId)),
      pageSizes: Object.freeze(
        scene.pages.map(({ widthMpt, heightMpt }) => Object.freeze({ widthMpt, heightMpt })),
      ),
    });
    const projectionDigest = sha256CanonicalJson(manifest);
    const documentTitle = `RSrender Boring Log | Scene ${manifest.sceneDigest} | Projection ${projectionDigest}`;
    const normalizedPageSvgMarkup = projections.map(({ svgMarkup }) =>
      svgMarkup
        .replace(
          /data-scene-digest="sha256:[0-9a-f]{64}"/u,
          `data-scene-digest="${manifest.sceneDigest}"`,
        )
        .replace(
          /data-projection-digest="sha256:[0-9a-f]{64}"/u,
          `data-projection-digest="${projectionDigest}"`,
        ),
    );
    const svgMarkup = normalizedPageSvgMarkup.join("");
    const pagesMarkup = normalizedPageSvgMarkup
      .map(
        (pageSvgMarkup, pageIndex) =>
          `<section class="publication-page" data-page-index="${pageIndex}">${pageSvgMarkup}</section>`,
      )
      .join("");
    const html = `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src 'self'"><meta name="rsrender-scene-digest" content="${escapeAttribute(manifest.sceneDigest)}"><meta name="rsrender-projection-digest" content="${escapeAttribute(projectionDigest)}"><title>${escapeText(documentTitle)}</title><style>${fontProjection.fontFaceCss}@page{size:${points(first.widthMpt)}pt ${points(first.heightMpt)}pt;margin:0}html,body{margin:0;padding:0;background:#fff}.publication-page{width:${points(first.widthMpt)}pt;height:${points(first.heightMpt)}pt;overflow:hidden;break-after:page;page-break-after:always}.publication-page:last-child{break-after:auto;page-break-after:auto}.publication-page svg{display:block;width:100%;height:100%}text,tspan{white-space:pre}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${pagesMarkup}</body></html>`;
    return Object.freeze({
      accepted: true,
      projection: Object.freeze({
        schema: "rsrender.boring-log-publication-projection.v1",
        manifest,
        projectionDigest,
        documentTitle,
        svgMarkup,
        html,
        fontFaceCss: fontProjection.fontFaceCss,
      }),
    });
  }
  const page = scene.pages[0];
  if (page === undefined) {
    return Object.freeze({
      accepted: false,
      code: "BORING_LOG_PUBLICATION_PAGE_MISSING",
    });
  }
  const nodes = new Map(page.nodes.map((node) => [node.id, node]));
  const root = nodes.get(page.rootNodeId);
  if (root === undefined) {
    return Object.freeze({
      accepted: false,
      code: "BORING_LOG_PUBLICATION_PAGE_MISSING",
    });
  }
  const measurements = new Map(scene.textResults.map((result) => [result.measurementId, result]));
  const textNodes = page.nodes.filter(
    (node): node is Extract<BoringLogSceneNode, { readonly kind: "text" }> => node.kind === "text",
  );
  const manifest = Object.freeze({
    schema: "rsrender.boring-log-publication-projection-manifest.v1" as const,
    revision: boringLogPublicationProjectionRevision,
    sceneInputDigest: scene.inputDigest,
    sceneDigest: sha256CanonicalJson(scene),
    pagePlanDigest: sha256CanonicalJson(scene.pagePlan),
    pageId: page.pageId,
    widthMpt: page.widthMpt,
    heightMpt: page.heightMpt,
    sceneNodeCount: page.nodes.length,
    semanticElementCount: page.semanticOrder.length,
    textNodeCount: textNodes.length,
    textLineCount: textNodes.reduce(
      (total, node) => total + (measurements.get(node.measurementId)?.lines.length ?? 0),
      0,
    ),
    sourceRangeDigest: sha256CanonicalJson(
      textNodes.map((node) => ({
        nodeId: node.id,
        measurementId: node.measurementId,
        lines: measurements.get(node.measurementId)?.lines.map((line) => ({
          text: line.text,
          sourceStartUtf16: line.sourceStartUtf16,
          sourceEndUtf16: line.sourceEndUtf16,
          xMpt: node.frame.xMpt + line.xMpt,
          baselineMpt: node.frame.yMpt + line.baselineMpt,
        })),
      })),
    ),
    semanticOrderDigest: sha256CanonicalJson(page.semanticOrder),
    fontFaceDigests: Object.freeze(
      [...new Set(scene.textResults.map(({ fontFaceDigest }) => fontFaceDigest))].sort(),
    ),
    fontMetricsDigests: Object.freeze(
      [...new Set(scene.textResults.map(({ fontMetricsDigest }) => fontMetricsDigest))].sort(),
    ),
    fontFaceIds: fontProjection.fontFaceIds,
    fontProjectionDigest: fontProjection.fontProjectionDigest,
  });
  const projectionDigest = sha256CanonicalJson(manifest);
  const documentTitle = `RSrender Boring Log | Scene ${manifest.sceneDigest} | Projection ${projectionDigest}`;
  const body = renderNode(root, nodes, measurements, scene, fontProjection.byStyleId, new Set());
  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg"${attribute("viewBox", `0 0 ${points(page.widthMpt)} ${points(page.heightMpt)}`)}${attribute("width", `${points(page.widthMpt)}pt`)}${attribute("height", `${points(page.heightMpt)}pt`)}${attribute("data-page-id", page.pageId)}${attribute("data-scene-input-digest", scene.inputDigest)}${attribute("data-scene-digest", manifest.sceneDigest)}${attribute("data-projection-digest", projectionDigest)} role="document" aria-label="Structured boring log page"><title>Structured boring log</title><desc>One-page vector boring log generated from structured RSrender data.</desc><defs>${renderPatterns(scene)}</defs>${body}</svg>`;
  const html = `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src 'self'"><meta name="rsrender-scene-digest" content="${escapeAttribute(manifest.sceneDigest)}"><meta name="rsrender-projection-digest" content="${escapeAttribute(projectionDigest)}"><title>${escapeText(documentTitle)}</title><style>${fontProjection.fontFaceCss}@page{size:${points(page.widthMpt)}pt ${points(page.heightMpt)}pt;margin:0}html,body{margin:0;padding:0;width:${points(page.widthMpt)}pt;height:${points(page.heightMpt)}pt;overflow:hidden;background:#fff}svg{display:block;width:${points(page.widthMpt)}pt;height:${points(page.heightMpt)}pt}text,tspan{white-space:pre}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${svgMarkup}</body></html>`;
  return Object.freeze({
    accepted: true,
    projection: Object.freeze({
      schema: "rsrender.boring-log-publication-projection.v1",
      manifest,
      projectionDigest,
      documentTitle,
      svgMarkup,
      html,
      fontFaceCss: fontProjection.fontFaceCss,
    }),
  });
}
