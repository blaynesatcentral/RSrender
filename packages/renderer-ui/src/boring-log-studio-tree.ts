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
  return value.replaceAll("-", " ").replace(/\b\w/gu, (character) => character.toUpperCase());
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
        : humanize(semanticId),
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
      if (!item.label.toLocaleLowerCase().includes(query)) continue;
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
