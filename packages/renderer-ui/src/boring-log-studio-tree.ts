import type { ResolvedBoringLogPageScene } from "@rsrender/contracts";

export type BoringLogStudioTreeItem = Readonly<{
  readonly semanticId: string;
  readonly parentSemanticId: string | null;
  readonly label: string;
  readonly level: number;
  readonly icon: string;
  readonly hasChildren: boolean;
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
): readonly BoringLogStudioTreeItem[] {
  const page = scene.pages[0]!;
  const pagePlan = scene.pagePlan.pages[0]!;
  const extras = new Map<string, { semanticId: string; label: string; icon: string }[]>();
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
    const sceneParent =
      node?.id.startsWith("node:clone:") === true
        ? page.nodes.find(({ id }) => id === node.parentId)?.semanticId
        : undefined;
    const parent = extraParent(semanticId) ?? sceneParent ?? null;
    if (node === undefined || parent === null) continue;
    const children = extras.get(parent) ?? [];
    children.push({
      semanticId,
      label: node.id.startsWith("node:clone:")
        ? `${humanize(node.role)} (Copy)`
        : humanize(semanticId),
      icon: "·",
    });
    extras.set(parent, children);
    represented.add(semanticId);
  }

  const mutable: Omit<BoringLogStudioTreeItem, "hasChildren">[] = [
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
  for (const child of extras.get("region-header") ?? []) {
    mutable.push({ ...child, parentSemanticId: "region-header", level: 3 });
  }
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
    for (const child of extras.get(column.id) ?? []) {
      mutable.push({ ...child, parentSemanticId: column.id, level: 4 });
    }
  }
  mutable.push({
    semanticId: "region-footer",
    parentSemanticId: "page-root",
    label: "Legend, notes & approval",
    level: 2,
    icon: "▧",
  });
  for (const child of extras.get("region-footer") ?? []) {
    mutable.push({ ...child, parentSemanticId: "region-footer", level: 3 });
  }
  const parentIds = new Set(
    mutable.flatMap(({ parentSemanticId }) =>
      parentSemanticId === null ? [] : [parentSemanticId],
    ),
  );
  return Object.freeze(
    mutable.map((item) => Object.freeze({ ...item, hasChildren: parentIds.has(item.semanticId) })),
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
