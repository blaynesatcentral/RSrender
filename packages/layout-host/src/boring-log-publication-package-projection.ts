import {
  parseOpaqueIdentity,
  sha256CanonicalJson,
  validateResolvedBoringLogPageScene,
  type ResolvedBoringLogPageScene,
} from "@rsrender/contracts";

import {
  projectBoringLogSceneForPublication,
  rsrenderSansPublicationFontProjection,
  type BoringLogPublicationFontProjectionInput,
} from "./boring-log-publication-projection.js";

export const boringLogPublicationPackageProjectionRevision =
  "bld-044-layout-host-publication-package-v1" as const;

export interface BoringLogPublicationSceneSetEntry {
  readonly boringLogIdentity: string;
  readonly explorationIdentity: string;
  readonly sourceOrdinal: number;
  readonly scene: ResolvedBoringLogPageScene;
}

export interface BoringLogPublicationSceneSet {
  readonly contractVersion: 1;
  readonly schemaVersion: "rsrender.boring-log-publication-scene-set.v1";
  readonly kind: "boring-log.publication-scene-set";
  readonly entries: readonly BoringLogPublicationSceneSetEntry[];
}

export interface BoringLogPublicationPackageEntryManifest {
  readonly boringLogIdentity: string;
  readonly explorationIdentity: string;
  readonly sourceOrdinal: number;
  readonly sceneInputDigest: string;
  readonly sceneDigest: string;
  readonly pagePlanDigest: string;
  readonly pageCount: number;
  readonly pageIds: readonly string[];
}

export interface BoringLogPublicationPackagePageManifest {
  readonly publicationPageIndex: number;
  readonly boringLogIdentity: string;
  readonly explorationIdentity: string;
  readonly sourceOrdinal: number;
  readonly sourcePageIndex: number;
  readonly pagePlanIndex: number;
  readonly pageId: string;
  readonly rootNodeId: string;
  readonly widthMpt: number;
  readonly heightMpt: number;
  readonly sceneInputDigest: string;
  readonly sceneDigest: string;
  readonly pageProjectionDigest: string;
  readonly sceneNodeCount: number;
  readonly semanticElementCount: number;
  readonly textNodeCount: number;
  readonly textLineCount: number;
  readonly domNamespace: string;
  readonly cssPageName: string;
}

export interface BoringLogPublicationPackageProjectionManifest {
  readonly schema: "rsrender.boring-log-publication-package-projection-manifest.v1";
  readonly revision: typeof boringLogPublicationPackageProjectionRevision;
  readonly entryCount: number;
  readonly pageCount: number;
  readonly entries: readonly BoringLogPublicationPackageEntryManifest[];
  readonly pages: readonly BoringLogPublicationPackagePageManifest[];
  readonly aggregateDigest: string;
}

export interface BoringLogPublicationPackageProjection {
  readonly schema: "rsrender.boring-log-publication-package-projection.v1";
  readonly manifest: BoringLogPublicationPackageProjectionManifest;
  readonly projectionDigest: string;
  readonly documentTitle: string;
  readonly svgMarkup: string;
  readonly html: string;
  readonly fontFaceCss: string;
}

export type BoringLogPublicationPackageProjectionResult =
  | {
      readonly accepted: true;
      readonly projection: BoringLogPublicationPackageProjection;
    }
  | {
      readonly accepted: false;
      readonly code:
        | "BORING_LOG_PUBLICATION_SCENE_SET_MALFORMED"
        | "BORING_LOG_PUBLICATION_SCENE_SET_DUPLICATE"
        | "BORING_LOG_PUBLICATION_SCENE_SET_SCENE_REJECTED"
        | "BORING_LOG_PUBLICATION_SCENE_SET_PAGE_REJECTED"
        | "BORING_LOG_PUBLICATION_SCENE_SET_DOM_COLLISION"
        | "BORING_LOG_PUBLICATION_SCENE_SET_FONT_BINDING_REJECTED";
    };

type DataRecord = Readonly<Record<string, unknown>>;

function rejected(
  code: Extract<BoringLogPublicationPackageProjectionResult, { accepted: false }>["code"],
): BoringLogPublicationPackageProjectionResult {
  return Object.freeze({ accepted: false, code });
}

function exactRecord(input: unknown, fields: readonly string[]): DataRecord | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) return null;
  const keys = Reflect.ownKeys(input);
  if (
    keys.length !== fields.length ||
    keys.some((key) => typeof key !== "string" || !fields.includes(key))
  ) {
    return null;
  }
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (!descriptor?.enumerable || !("value" in descriptor)) return null;
    result[field] = descriptor.value;
  }
  return result;
}

function escapedAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapedText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function points(mpt: number): string {
  return Number.isInteger(mpt / 1_000) ? String(mpt / 1_000) : (mpt / 1_000).toFixed(3);
}

function pageScene(
  scene: ResolvedBoringLogPageScene,
  pagePlanIndex: number,
): ResolvedBoringLogPageScene | null {
  const plannedPage = scene.pagePlan.pages[pagePlanIndex];
  if (plannedPage === undefined) return null;
  const resolvedPage = scene.pages.find(({ pageId }) => pageId === plannedPage.pageId);
  if (resolvedPage === undefined) return null;
  return {
    ...scene,
    pagePlan: {
      ...scene.pagePlan,
      pages: [{ ...plannedPage, pageIndex: 0 }],
    },
    pages: [resolvedPage],
  };
}

function namespaceSvg(
  svgMarkup: string,
  namespace: string,
  authoritativePageId: string,
): string | null {
  const sourceIds = [...svgMarkup.matchAll(/\sid="([^"]+)"/gu)].map((match) => match[1]!);
  if (new Set(sourceIds).size !== sourceIds.length) return null;
  const replacements = new Map<string, string>();
  sourceIds.forEach((sourceId, index) => {
    replacements.set(sourceId, `${namespace}-dom-${String(index + 1).padStart(4, "0")}`);
  });
  let namespaced = svgMarkup.replace(
    /\sid="([^"]+)"/gu,
    (_match, sourceId: string, offset: number) => {
      const replacement = replacements.get(sourceId);
      if (replacement === undefined) return _match;
      const elementStart = svgMarkup.lastIndexOf("<", offset);
      const elementEnd = svgMarkup.indexOf(">", offset);
      const openingElement =
        elementStart < 0 || elementEnd < 0 ? "" : svgMarkup.slice(elementStart, elementEnd + 1);
      const authority = openingElement.includes('class="scene-node"')
        ? ` data-authoritative-node-id="${sourceId}"`
        : openingElement.startsWith("<pattern")
          ? ` data-authoritative-resource-id="${sourceId}"`
          : "";
      return ` id="${replacement}" data-rsrender-original-dom-id="${sourceId}"${authority}`;
    },
  );
  let missingReference = false;
  namespaced = namespaced.replace(/url\(#([^)]*)\)/gu, (_match, sourceId: string) => {
    const replacement = replacements.get(sourceId);
    if (replacement === undefined) {
      missingReference = true;
      return _match;
    }
    return `url(#${replacement})`;
  });
  if (missingReference) return null;
  return namespaced.replace(
    /^<svg\b/u,
    `<svg id="${namespace}-page" data-rsrender-original-dom-id="${escapedAttribute(authoritativePageId)}" data-authoritative-page-id="${escapedAttribute(authoritativePageId)}"`,
  );
}

function parseSceneSet(input: unknown):
  | { readonly accepted: true; readonly value: BoringLogPublicationSceneSet }
  | {
      readonly accepted: false;
      readonly code: Extract<
        BoringLogPublicationPackageProjectionResult,
        { accepted: false }
      >["code"];
    } {
  const record = exactRecord(input, ["contractVersion", "schemaVersion", "kind", "entries"]);
  if (
    record === null ||
    record["contractVersion"] !== 1 ||
    record["schemaVersion"] !== "rsrender.boring-log-publication-scene-set.v1" ||
    record["kind"] !== "boring-log.publication-scene-set" ||
    !Array.isArray(record["entries"]) ||
    record["entries"].length < 1 ||
    record["entries"].length > 64
  ) {
    return Object.freeze({ accepted: false, code: "BORING_LOG_PUBLICATION_SCENE_SET_MALFORMED" });
  }
  const entries: BoringLogPublicationSceneSetEntry[] = [];
  const boringLogIdentities = new Set<string>();
  const explorationIdentities = new Set<string>();
  const sourceOrdinals = new Set<number>();
  for (const inputEntry of record["entries"]) {
    const entry = exactRecord(inputEntry, [
      "boringLogIdentity",
      "explorationIdentity",
      "sourceOrdinal",
      "scene",
    ]);
    if (entry === null) {
      return Object.freeze({ accepted: false, code: "BORING_LOG_PUBLICATION_SCENE_SET_MALFORMED" });
    }
    let boringLogIdentity: string;
    let explorationIdentity: string;
    try {
      boringLogIdentity = parseOpaqueIdentity(entry["boringLogIdentity"]);
      explorationIdentity = parseOpaqueIdentity(entry["explorationIdentity"]);
    } catch {
      return Object.freeze({ accepted: false, code: "BORING_LOG_PUBLICATION_SCENE_SET_MALFORMED" });
    }
    const sourceOrdinal = entry["sourceOrdinal"];
    if (
      !Number.isSafeInteger(sourceOrdinal) ||
      (sourceOrdinal as number) < 1 ||
      (sourceOrdinal as number) > 64
    ) {
      return Object.freeze({ accepted: false, code: "BORING_LOG_PUBLICATION_SCENE_SET_MALFORMED" });
    }
    if (
      boringLogIdentities.has(boringLogIdentity) ||
      explorationIdentities.has(explorationIdentity) ||
      sourceOrdinals.has(sourceOrdinal as number)
    ) {
      return Object.freeze({ accepted: false, code: "BORING_LOG_PUBLICATION_SCENE_SET_DUPLICATE" });
    }
    const scene = validateResolvedBoringLogPageScene(entry["scene"]);
    if (!scene.accepted) {
      return Object.freeze({
        accepted: false,
        code: "BORING_LOG_PUBLICATION_SCENE_SET_SCENE_REJECTED",
      });
    }
    boringLogIdentities.add(boringLogIdentity);
    explorationIdentities.add(explorationIdentity);
    sourceOrdinals.add(sourceOrdinal as number);
    entries.push(
      Object.freeze({
        boringLogIdentity,
        explorationIdentity,
        sourceOrdinal: sourceOrdinal as number,
        scene: scene.value,
      }),
    );
  }
  return Object.freeze({
    accepted: true,
    value: Object.freeze({
      contractVersion: 1,
      schemaVersion: "rsrender.boring-log-publication-scene-set.v1",
      kind: "boring-log.publication-scene-set",
      entries: Object.freeze(entries),
    }),
  });
}

export function projectBoringLogSceneSetForPublication(
  input: unknown,
  fontProjectionInput: BoringLogPublicationFontProjectionInput = rsrenderSansPublicationFontProjection,
): BoringLogPublicationPackageProjectionResult {
  const parsed = parseSceneSet(input);
  if (!parsed.accepted) return rejected(parsed.code);

  const entryManifests: BoringLogPublicationPackageEntryManifest[] = [];
  const pageManifests: BoringLogPublicationPackagePageManifest[] = [];
  const svgPages: string[] = [];
  const pageMarkup: string[] = [];
  const pageRules: string[] = [];
  const fontFaceRules = new Set<string>();
  for (const [entryIndex, entry] of parsed.value.entries.entries()) {
    const sceneDigest = sha256CanonicalJson(entry.scene);
    entryManifests.push(
      Object.freeze({
        boringLogIdentity: entry.boringLogIdentity,
        explorationIdentity: entry.explorationIdentity,
        sourceOrdinal: entry.sourceOrdinal,
        sceneInputDigest: entry.scene.inputDigest,
        sceneDigest,
        pagePlanDigest: sha256CanonicalJson(entry.scene.pagePlan),
        pageCount: entry.scene.pagePlan.pages.length,
        pageIds: Object.freeze(entry.scene.pagePlan.pages.map(({ pageId }) => pageId)),
      }),
    );
    for (const [pagePlanIndex, plannedPage] of entry.scene.pagePlan.pages.entries()) {
      const isolated = pageScene(entry.scene, pagePlanIndex);
      if (isolated === null) return rejected("BORING_LOG_PUBLICATION_SCENE_SET_PAGE_REJECTED");
      const projected = projectBoringLogSceneForPublication(isolated, fontProjectionInput);
      if (!projected.accepted) {
        if (projected.code === "BORING_LOG_PUBLICATION_FONT_BINDING_REJECTED") {
          return rejected("BORING_LOG_PUBLICATION_SCENE_SET_FONT_BINDING_REJECTED");
        }
        return rejected("BORING_LOG_PUBLICATION_SCENE_SET_PAGE_REJECTED");
      }
      fontFaceRules.add(projected.projection.fontFaceCss);
      const publicationPageIndex = pageManifests.length;
      const namespace = `rsrender-entry-${String(entryIndex + 1).padStart(2, "0")}-page-${String(pagePlanIndex + 1).padStart(3, "0")}`;
      const cssPageName = `rsrender_page_${String(publicationPageIndex + 1).padStart(4, "0")}`;
      const namespacedSvg = namespaceSvg(
        projected.projection.svgMarkup,
        namespace,
        plannedPage.pageId,
      );
      if (namespacedSvg === null) {
        return rejected("BORING_LOG_PUBLICATION_SCENE_SET_DOM_COLLISION");
      }
      const resolvedPage = isolated.pages[0]!;
      pageManifests.push(
        Object.freeze({
          publicationPageIndex,
          boringLogIdentity: entry.boringLogIdentity,
          explorationIdentity: entry.explorationIdentity,
          sourceOrdinal: entry.sourceOrdinal,
          sourcePageIndex: plannedPage.pageIndex,
          pagePlanIndex,
          pageId: plannedPage.pageId,
          rootNodeId: resolvedPage.rootNodeId,
          widthMpt: plannedPage.widthMpt,
          heightMpt: plannedPage.heightMpt,
          sceneInputDigest: entry.scene.inputDigest,
          sceneDigest,
          pageProjectionDigest: projected.projection.projectionDigest,
          sceneNodeCount: projected.projection.manifest.sceneNodeCount,
          semanticElementCount: projected.projection.manifest.semanticElementCount,
          textNodeCount: projected.projection.manifest.textNodeCount,
          textLineCount: projected.projection.manifest.textLineCount,
          domNamespace: namespace,
          cssPageName,
        }),
      );
      pageRules.push(
        `@page ${cssPageName}{size:${points(plannedPage.widthMpt)}pt ${points(plannedPage.heightMpt)}pt;margin:0}.${cssPageName}{page:${cssPageName};width:${points(plannedPage.widthMpt)}pt;height:${points(plannedPage.heightMpt)}pt}`,
      );
      pageMarkup.push(
        `<section id="${namespace}-section" class="publication-page ${cssPageName}" data-publication-page-index="${publicationPageIndex}" data-source-ordinal="${entry.sourceOrdinal}" data-boring-log-identity="${escapedAttribute(entry.boringLogIdentity)}" data-exploration-identity="${escapedAttribute(entry.explorationIdentity)}" data-authoritative-page-id="${escapedAttribute(plannedPage.pageId)}">${namespacedSvg}</section>`,
      );
      svgPages.push(namespacedSvg);
    }
  }

  const aggregateDigest = sha256CanonicalJson({
    revision: boringLogPublicationPackageProjectionRevision,
    entries: entryManifests,
    pages: pageManifests,
  });
  const manifest = Object.freeze({
    schema: "rsrender.boring-log-publication-package-projection-manifest.v1" as const,
    revision: boringLogPublicationPackageProjectionRevision,
    entryCount: entryManifests.length,
    pageCount: pageManifests.length,
    entries: Object.freeze(entryManifests),
    pages: Object.freeze(pageManifests),
    aggregateDigest,
  });
  const projectionDigest = sha256CanonicalJson(manifest);
  const documentTitle = `RSrender Log Set | ${entryManifests.length} Boring Logs | ${pageManifests.length} Pages | Projection ${projectionDigest}`;
  const svgMarkup = svgPages.join("");
  const fontFaceCss = [...fontFaceRules].join("");
  const html = `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src 'self'"><meta name="rsrender-aggregate-digest" content="${escapedAttribute(aggregateDigest)}"><meta name="rsrender-projection-digest" content="${escapedAttribute(projectionDigest)}"><title>${escapedText(documentTitle)}</title><style>${fontFaceCss}${pageRules.join("")}html,body{margin:0;padding:0;background:#fff}.publication-page{overflow:hidden;break-after:page;page-break-after:always}.publication-page:last-child{break-after:auto;page-break-after:auto}.publication-page svg{display:block;width:100%;height:100%}text,tspan{white-space:pre}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${pageMarkup.join("")}</body></html>`;
  return Object.freeze({
    accepted: true,
    projection: Object.freeze({
      schema: "rsrender.boring-log-publication-package-projection.v1",
      manifest,
      projectionDigest,
      documentTitle,
      svgMarkup,
      html,
      fontFaceCss,
    }),
  });
}
