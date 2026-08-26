import type { ResolvedBoringLogPageScene } from "@rsrender/contracts";

export type BoringLogStudioTreeItem = Readonly<{
  readonly semanticId: string;
  readonly parentSemanticId: string | null;
  readonly label: string;
  readonly level: number;
  readonly icon: string;
  readonly hidden: boolean;
  readonly hasChildren: boolean;
}>;

export type BoringLogStudioTreeDataLayer = Readonly<{
  readonly semanticId: string;
  readonly label: string;
  readonly visible: boolean;
}>;

function humanize(value: string): string {
  return value
    .replaceAll(":", " · ")
    .replaceAll("-", " ")
    .replace(/\b\w/gu, (character) => character.toUpperCase());
}

const uscsMaterialLabels: Readonly<Record<string, string>> = Object.freeze({
  CH: "Fat clay (CH)",
  CL: "Lean clay (CL)",
  GC: "Clayey gravel (GC)",
  GM: "Silty gravel (GM)",
  GP: "Poorly graded gravel (GP)",
  GW: "Well graded gravel (GW)",
  MH: "Elastic silt (MH)",
  ML: "Silt (ML)",
  OH: "Organic soil (OH)",
  OL: "Organic soil (OL)",
  PT: "Peat (PT)",
  SC: "Clayey sand (SC)",
  SM: "Silty sand (SM)",
  SP: "Poorly graded sand (SP)",
  SW: "Well graded sand (SW)",
});

function compactLabel(value: string, maximum = 64): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  return normalized.length <= maximum
    ? normalized
    : `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}

function textForRole(
  scene: ResolvedBoringLogPageScene,
  semanticId: string,
  role: string,
): string | null {
  const node = scene.pages[0]?.nodes.find(
    (candidate) =>
      candidate.semanticId === semanticId && candidate.kind === "text" && candidate.role === role,
  );
  return node?.kind === "text" ? node.content : null;
}

function sampleLabel(scene: ResolvedBoringLogPageScene, sampleKey: string): string {
  return textForRole(scene, `sample:${sampleKey}`, "sample-label") ?? humanize(sampleKey);
}

function ordinalFromKey(key: string): string {
  const match = /(\d+)$/u.exec(key);
  return match === null ? humanize(key) : String(Number.parseInt(match[1]!, 10));
}

export function boringLogStudioElementLabel(
  scene: ResolvedBoringLogPageScene,
  semanticId: string,
): string {
  if (semanticId.startsWith("sample:")) {
    return `Sample ${sampleLabel(scene, semanticId.slice("sample:".length))}`;
  }
  if (semanticId.startsWith("remark:")) {
    const content = textForRole(scene, semanticId, "remark-interval");
    return content === null
      ? `Remark ${ordinalFromKey(semanticId)}`
      : `Remark — ${compactLabel(content)}`;
  }
  if (semanticId.startsWith("lithology:")) {
    const [, stratumKey = semanticId, transition, transitionIndex] = semanticId.split(":");
    const ordinal = ordinalFromKey(stratumKey);
    if (transition === "transition") {
      const content = textForRole(scene, semanticId, "material-transition-text");
      return content === null
        ? `Stratum ${ordinal} note ${transitionIndex ?? ""}`.trim()
        : `Stratum ${ordinal} note — ${compactLabel(content)}`;
    }
    const content = textForRole(scene, semanticId, "material-description-interval") ?? "";
    const uscsCode = /\(([A-Z]{2}(?:-[A-Z]{2})?)\)/u.exec(content)?.[1];
    const material =
      uscsCode === undefined
        ? compactLabel(content, 42)
        : (uscsMaterialLabels[uscsCode] ?? uscsCode);
    return material.length === 0 ? `Stratum ${ordinal}` : `Stratum ${ordinal} — ${material}`;
  }
  if (semanticId.startsWith("data-layer:")) {
    const [layerKey = "data", observationKey] = semanticId.slice("data-layer:".length).split(":");
    const layerLabel =
      layerKey === "layer-n-value"
        ? "N value"
        : layerKey === "layer-moisture"
          ? "Moisture"
          : layerKey === "layer-plasticity-range"
            ? "Plasticity range"
            : humanize(layerKey.replace(/^layer-/u, ""));
    return observationKey === undefined
      ? layerLabel
      : `${layerLabel} — ${sampleLabel(scene, observationKey)}`;
  }
  return humanize(semanticId);
}

function extraParent(semanticId: string): string | null {
  if (semanticId.startsWith("sample:")) return "column-sample";
  if (semanticId.startsWith("remark:")) return "column-remarks";
  if (semanticId.startsWith("data-layer:")) return "column-data-track";
  if (semanticId.startsWith("lithology:")) return "column-description";
  return null;
}

export function buildBoringLogStudioTree(
  scene: ResolvedBoringLogPageScene,
  dataLayers: readonly BoringLogStudioTreeDataLayer[] = [],
): readonly BoringLogStudioTreeItem[] {
  const page = scene.pages[0]!;
  const pagePlan = scene.pagePlan.pages[0]!;
  const extras = new Map<
    string,
    { semanticId: string; label: string; icon: string; hidden: boolean }[]
  >();
  const represented = new Set([
    "page-root",
    "region-header",
    "region-depth-body",
    "region-footer",
    ...pagePlan.columns.map(({ id }) => id),
  ]);
  for (const semanticId of page.semanticOrder) {
    if (represented.has(semanticId)) continue;
    const node = page.nodes.find((candidate) => candidate.semanticId === semanticId);
    const sceneParentNode = page.nodes.find(({ id }) => id === node?.parentId);
    const authoredParent =
      node?.role === "user-text-group" || sceneParentNode?.role === "user-text-group"
        ? sceneParentNode?.semanticId
        : node?.id.startsWith("node:clone:") === true
          ? sceneParentNode?.semanticId
          : undefined;
    const parent = authoredParent ?? extraParent(semanticId) ?? null;
    if (node === undefined || parent === null) continue;
    const children = extras.get(parent) ?? [];
    children.push({
      semanticId,
      label: node.id.startsWith("node:clone:")
        ? `${humanize(node.role)} (Copy)`
        : boringLogStudioElementLabel(scene, semanticId),
      icon: "·",
      hidden: false,
    });
    extras.set(parent, children);
    represented.add(semanticId);
  }

  for (const dataLayer of dataLayers) {
    const parentSemanticId = "column-data-track";
    const children = extras.get(parentSemanticId) ?? [];
    const existingIndex = children.findIndex(
      ({ semanticId }) => semanticId === dataLayer.semanticId,
    );
    const item = {
      semanticId: dataLayer.semanticId,
      label: dataLayer.label,
      icon: "·",
      hidden: !dataLayer.visible,
    };
    if (existingIndex < 0) children.push(item);
    else children[existingIndex] = item;
    extras.set(parentSemanticId, children);
    represented.add(dataLayer.semanticId);
  }

  const mutable: Array<
    Omit<BoringLogStudioTreeItem, "hasChildren" | "hidden"> & { readonly hidden?: boolean }
  > = [
    {
      semanticId: "page-root",
      parentSemanticId: null,
      label: "Boring Log - Page 1",
      level: 1,
      icon: "▱",
    },
    {
      semanticId: "region-header",
      parentSemanticId: "page-root",
      label: "Header & project metadata",
      level: 2,
      icon: "▤",
    },
  ];
  const appendExtraChildren = (parentSemanticId: string, level: number): void => {
    for (const child of extras.get(parentSemanticId) ?? []) {
      mutable.push({ ...child, parentSemanticId, level });
      appendExtraChildren(child.semanticId, level + 1);
    }
  };
  appendExtraChildren("region-header", 3);
  mutable.push({
    semanticId: "region-depth-body",
    parentSemanticId: "page-root",
    label: "Depth log body",
    level: 2,
    icon: "▥",
  });
  for (const column of pagePlan.columns) {
    mutable.push({
      semanticId: column.id,
      parentSemanticId: "region-depth-body",
      label: humanize(column.role),
      level: 3,
      icon: column.role === "lithology-pattern" ? "▨" : "│",
    });
    appendExtraChildren(column.id, 4);
  }
  mutable.push({
    semanticId: "region-footer",
    parentSemanticId: "page-root",
    label: "Legend, notes & approval",
    level: 2,
    icon: "▧",
  });
  appendExtraChildren("region-footer", 3);
  const parentIds = new Set(
    mutable.flatMap(({ parentSemanticId }) =>
      parentSemanticId === null ? [] : [parentSemanticId],
    ),
  );
  return Object.freeze(
    mutable.map((item) =>
      Object.freeze({
        ...item,
        hidden: item.hidden === true,
        hasChildren: parentIds.has(item.semanticId),
      }),
    ),
  );
}

export function visibleBoringLogStudioTreeItems(
  items: readonly BoringLogStudioTreeItem[],
  collapsed: ReadonlySet<string>,
  rawQuery: string,
): readonly BoringLogStudioTreeItem[] {
  const byId = new Map(items.map((item) => [item.semanticId, item]));
  const query = rawQuery.trim().toLocaleLowerCase();
  if (query.length > 0) {
    const retained = new Set<string>();
    for (const item of items) {
      const label = item.label.toLocaleLowerCase();
      const matchIndex = label.indexOf(query);
      if (matchIndex < 0) continue;
      const followingCharacter = label[matchIndex + query.length];
      if (
        /\d$/u.test(query) &&
        followingCharacter !== undefined &&
        /\d/u.test(followingCharacter)
      ) {
        continue;
      }
      let cursor: BoringLogStudioTreeItem | undefined = item;
      while (cursor !== undefined) {
        retained.add(cursor.semanticId);
        cursor = cursor.parentSemanticId === null ? undefined : byId.get(cursor.parentSemanticId);
      }
    }
    return Object.freeze(items.filter((item) => retained.has(item.semanticId)));
  }
  return Object.freeze(
    items.filter((item) => {
      let parentId = item.parentSemanticId;
      while (parentId !== null) {
        if (collapsed.has(parentId)) return false;
        parentId = byId.get(parentId)?.parentSemanticId ?? null;
      }
      return true;
    }),
  );
}
