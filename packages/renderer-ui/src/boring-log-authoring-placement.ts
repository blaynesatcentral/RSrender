import type { BoringLogSceneNode, ResolvedBoringLogPageScene } from "@rsrender/contracts";

export type BoringLogDuplicateOffset = Readonly<{
  readonly offsetXMpt: number;
  readonly offsetYMpt: number;
}>;

type Rectangle = Readonly<{
  readonly xMpt: number;
  readonly yMpt: number;
  readonly widthMpt: number;
  readonly heightMpt: number;
}>;

type TextNode = Extract<BoringLogSceneNode, { readonly kind: "text" }>;

function isVisibleTextNode(node: BoringLogSceneNode): node is TextNode {
  return node.kind === "text" && node.presentation?.visible !== false;
}

function overlaps(left: Rectangle, right: Rectangle): boolean {
  return (
    Math.min(left.xMpt + left.widthMpt, right.xMpt + right.widthMpt) >
      Math.max(left.xMpt, right.xMpt) &&
    Math.min(left.yMpt + left.heightMpt, right.yMpt + right.heightMpt) >
      Math.max(left.yMpt, right.yMpt)
  );
}

function firstGridValue(minimum: number, stepMpt: number): number {
  return Math.ceil(minimum / stepMpt) * stepMpt;
}

/** Finds the nearest deterministic translation whose cloned text ink remains publishable. */
export function findCollisionFreeTextDuplicateOffset(
  scene: ResolvedBoringLogPageScene,
  pageId: string,
  occurrenceNodeIds: readonly string[],
  stepMpt = 10_000,
): BoringLogDuplicateOffset | null {
  if (!Number.isSafeInteger(stepMpt) || stepMpt <= 0 || occurrenceNodeIds.length === 0) return null;
  const page = scene.pages.find((candidate) => candidate.pageId === pageId);
  if (page === undefined) return null;
  const selectedIds = new Set(occurrenceNodeIds);
  if (selectedIds.size !== occurrenceNodeIds.length) return null;
  const results = new Map(scene.textResults.map((result) => [result.measurementId, result]));
  const selected = page.nodes.filter(
    (node): node is TextNode => isVisibleTextNode(node) && selectedIds.has(node.id),
  );
  if (selected.length !== selectedIds.size) return null;

  const inkFor = (node: TextNode): Rectangle | null => {
    const result = results.get(node.measurementId);
    return result === undefined
      ? null
      : Object.freeze({
          xMpt: node.frame.xMpt + result.inkBounds.xMpt,
          yMpt: node.frame.yMpt + result.inkBounds.yMpt,
          widthMpt: result.inkBounds.widthMpt,
          heightMpt: result.inkBounds.heightMpt,
        });
  };
  const selectedInk = selected.map(inkFor);
  if (selectedInk.some((rectangle) => rectangle === null)) return null;
  const existingInk = page.nodes
    .filter(isVisibleTextNode)
    .map(inkFor)
    .filter((rectangle): rectangle is Rectangle => rectangle !== null);

  const minimumX = Math.min(...selected.map(({ frame }) => frame.xMpt));
  const minimumY = Math.min(...selected.map(({ frame }) => frame.yMpt));
  const maximumX = Math.max(...selected.map(({ frame }) => frame.xMpt + frame.widthMpt));
  const maximumY = Math.max(...selected.map(({ frame }) => frame.yMpt + frame.heightMpt));
  const candidates: BoringLogDuplicateOffset[] = [];
  for (
    let offsetXMpt = firstGridValue(-minimumX, stepMpt);
    offsetXMpt <= page.widthMpt - maximumX;
    offsetXMpt += stepMpt
  ) {
    for (
      let offsetYMpt = firstGridValue(-minimumY, stepMpt);
      offsetYMpt <= page.heightMpt - maximumY;
      offsetYMpt += stepMpt
    ) {
      if (offsetXMpt === 0 && offsetYMpt === 0) continue;
      candidates.push(Object.freeze({ offsetXMpt, offsetYMpt }));
    }
  }
  candidates.sort((left, right) => {
    const leftDistance = left.offsetXMpt ** 2 + left.offsetYMpt ** 2;
    const rightDistance = right.offsetXMpt ** 2 + right.offsetYMpt ** 2;
    return (
      leftDistance - rightDistance ||
      Number(right.offsetYMpt >= 0) - Number(left.offsetYMpt >= 0) ||
      Number(right.offsetXMpt >= 0) - Number(left.offsetXMpt >= 0) ||
      left.offsetYMpt - right.offsetYMpt ||
      left.offsetXMpt - right.offsetXMpt
    );
  });

  for (const candidate of candidates) {
    const translated = (selectedInk as readonly Rectangle[]).map((rectangle) =>
      Object.freeze({
        ...rectangle,
        xMpt: rectangle.xMpt + candidate.offsetXMpt,
        yMpt: rectangle.yMpt + candidate.offsetYMpt,
      }),
    );
    if (
      translated.some((rectangle) => existingInk.some((existing) => overlaps(rectangle, existing)))
    ) {
      continue;
    }
    if (
      translated.some((rectangle, index) =>
        translated.slice(index + 1).some((other) => overlaps(rectangle, other)),
      )
    ) {
      continue;
    }
    return candidate;
  }
  return null;
}
