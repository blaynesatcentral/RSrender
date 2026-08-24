export const boringLogArrangementRevision = "bld-040-arrangement-v1" as const;

export interface BoringLogArrangementFrame {
  readonly xMpt: number;
  readonly yMpt: number;
  readonly widthMpt: number;
  readonly heightMpt: number;
}

export interface BoringLogArrangementItem {
  readonly occurrenceNodeId: string;
  readonly semanticId: string;
  readonly frame: BoringLogArrangementFrame;
  readonly locked: boolean;
  readonly positionMode: "depth-bound" | "free";
}

export type BoringLogArrangementOperation =
  | Readonly<{ readonly kind: "nudge"; readonly deltaXMpt: number; readonly deltaYMpt: number }>
  | Readonly<{
      readonly kind: "align";
      readonly alignment:
        "left" | "horizontal-center" | "right" | "top" | "vertical-center" | "bottom";
    }>
  | Readonly<{
      readonly kind: "match-size";
      readonly dimension: "width" | "height" | "both";
    }>
  | Readonly<{
      readonly kind: "distribute";
      readonly distribution:
        "horizontal-gaps" | "vertical-gaps" | "horizontal-centers" | "vertical-centers";
    }>;

export type BoringLogArrangementResult =
  | Readonly<{
      readonly accepted: true;
      readonly changed: boolean;
      readonly operation: BoringLogArrangementOperation;
      readonly keyElementId: string;
      readonly items: readonly BoringLogArrangementItem[];
      readonly affectedOccurrenceNodeIds: readonly string[];
      readonly excludedLockedOccurrenceNodeIds: readonly string[];
    }>
  | Readonly<{
      readonly accepted: false;
      readonly code:
        | "ARRANGEMENT_ARGUMENT_INVALID"
        | "ARRANGEMENT_SELECTION_INVALID"
        | "ARRANGEMENT_KEY_ELEMENT_INVALID"
        | "ARRANGEMENT_LOCKED"
        | "ARRANGEMENT_DEPTH_BOUND"
        | "ARRANGEMENT_INSUFFICIENT_ITEMS"
        | "ARRANGEMENT_INSUFFICIENT_SPAN"
        | "ARRANGEMENT_PAGE_BOUNDS";
    }>;

type DataRecord = Readonly<Record<string, unknown>>;

function rejected(
  code: Extract<BoringLogArrangementResult, { readonly accepted: false }>["code"],
): BoringLogArrangementResult {
  return Object.freeze({ accepted: false, code });
}

function exactRecord(input: unknown, fields: readonly string[]): DataRecord | null {
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
    const prototype = Object.getPrototypeOf(input) as unknown;
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(input);
    if (
      keys.some((key) => typeof key !== "string" || !fields.includes(key)) ||
      fields.some((field) => !keys.includes(field))
    ) {
      return null;
    }
    const entries: Array<readonly [string, unknown]> = [];
    for (const field of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(input, field);
      if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
        return null;
      }
      entries.push([field, descriptor.value]);
    }
    return Object.freeze(Object.fromEntries(entries));
  } catch {
    return null;
  }
}

function positiveMpt(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function coordinateMpt(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function signedMpt(value: unknown): value is number {
  return Number.isSafeInteger(value);
}

function boundedIdentity(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 512;
}

function parseFrame(input: unknown): BoringLogArrangementFrame | null {
  const frame = exactRecord(input, ["xMpt", "yMpt", "widthMpt", "heightMpt"]);
  if (
    frame === null ||
    !coordinateMpt(frame["xMpt"]) ||
    !coordinateMpt(frame["yMpt"]) ||
    !positiveMpt(frame["widthMpt"]) ||
    !positiveMpt(frame["heightMpt"])
  ) {
    return null;
  }
  return Object.freeze({
    xMpt: frame["xMpt"],
    yMpt: frame["yMpt"],
    widthMpt: frame["widthMpt"],
    heightMpt: frame["heightMpt"],
  });
}

function parseItem(input: unknown): BoringLogArrangementItem | null {
  const item = exactRecord(input, [
    "occurrenceNodeId",
    "semanticId",
    "frame",
    "locked",
    "positionMode",
  ]);
  const frame = item === null ? null : parseFrame(item["frame"]);
  if (
    item === null ||
    frame === null ||
    !boundedIdentity(item["occurrenceNodeId"]) ||
    !boundedIdentity(item["semanticId"]) ||
    typeof item["locked"] !== "boolean" ||
    !["depth-bound", "free"].includes(String(item["positionMode"]))
  ) {
    return null;
  }
  return Object.freeze({
    occurrenceNodeId: item["occurrenceNodeId"],
    semanticId: item["semanticId"],
    frame,
    locked: item["locked"],
    positionMode: item["positionMode"] as "depth-bound" | "free",
  });
}

function parseOperation(input: unknown): BoringLogArrangementOperation | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const kindDescriptor = Object.getOwnPropertyDescriptor(input, "kind");
  if (kindDescriptor === undefined || !("value" in kindDescriptor) || !kindDescriptor.enumerable) {
    return null;
  }
  const kind: unknown = kindDescriptor.value as unknown;
  if (kind === "nudge") {
    const operation = exactRecord(input, ["kind", "deltaXMpt", "deltaYMpt"]);
    return operation !== null &&
      signedMpt(operation["deltaXMpt"]) &&
      signedMpt(operation["deltaYMpt"])
      ? Object.freeze({
          kind,
          deltaXMpt: operation["deltaXMpt"],
          deltaYMpt: operation["deltaYMpt"],
        })
      : null;
  }
  if (kind === "align") {
    const operation = exactRecord(input, ["kind", "alignment"]);
    return operation !== null &&
      ["left", "horizontal-center", "right", "top", "vertical-center", "bottom"].includes(
        String(operation["alignment"]),
      )
      ? Object.freeze({
          kind,
          alignment: operation["alignment"] as Extract<
            BoringLogArrangementOperation,
            { readonly kind: "align" }
          >["alignment"],
        })
      : null;
  }
  if (kind === "match-size") {
    const operation = exactRecord(input, ["kind", "dimension"]);
    return operation !== null &&
      ["width", "height", "both"].includes(String(operation["dimension"]))
      ? Object.freeze({
          kind,
          dimension: operation["dimension"] as Extract<
            BoringLogArrangementOperation,
            { readonly kind: "match-size" }
          >["dimension"],
        })
      : null;
  }
  if (kind === "distribute") {
    const operation = exactRecord(input, ["kind", "distribution"]);
    return operation !== null &&
      ["horizontal-gaps", "vertical-gaps", "horizontal-centers", "vertical-centers"].includes(
        String(operation["distribution"]),
      )
      ? Object.freeze({
          kind,
          distribution: operation["distribution"] as Extract<
            BoringLogArrangementOperation,
            { readonly kind: "distribute" }
          >["distribution"],
        })
      : null;
  }
  return null;
}

function sameFrame(left: BoringLogArrangementFrame, right: BoringLogArrangementFrame): boolean {
  return (
    left.xMpt === right.xMpt &&
    left.yMpt === right.yMpt &&
    left.widthMpt === right.widthMpt &&
    left.heightMpt === right.heightMpt
  );
}

function pageBounded(
  frame: BoringLogArrangementFrame,
  pageWidthMpt: number,
  pageHeightMpt: number,
): boolean {
  return (
    coordinateMpt(frame.xMpt) &&
    coordinateMpt(frame.yMpt) &&
    positiveMpt(frame.widthMpt) &&
    positiveMpt(frame.heightMpt) &&
    frame.xMpt + frame.widthMpt <= pageWidthMpt &&
    frame.yMpt + frame.heightMpt <= pageHeightMpt
  );
}

function withFrame(
  item: BoringLogArrangementItem,
  frame: BoringLogArrangementFrame,
): BoringLogArrangementItem {
  return Object.freeze({ ...item, frame: Object.freeze(frame) });
}

/** Pure integer-mpt authority shared by keyboard, ribbon, context-menu, and Canvas arrangement. */
export function arrangeBoringLogTextOccurrences(input: unknown): BoringLogArrangementResult {
  try {
    const value = exactRecord(input, [
      "pageWidthMpt",
      "pageHeightMpt",
      "keyElementId",
      "items",
      "operation",
    ]);
    const operation = value === null ? null : parseOperation(value["operation"]);
    if (
      value === null ||
      operation === null ||
      !positiveMpt(value["pageWidthMpt"]) ||
      !positiveMpt(value["pageHeightMpt"]) ||
      !boundedIdentity(value["keyElementId"]) ||
      !Array.isArray(value["items"]) ||
      value["items"].length < 1 ||
      value["items"].length > 256
    ) {
      return rejected("ARRANGEMENT_ARGUMENT_INVALID");
    }
    const items = value["items"].map(parseItem);
    if (items.some((item) => item === null)) {
      return rejected("ARRANGEMENT_ARGUMENT_INVALID");
    }
    const parsedItems = items as readonly BoringLogArrangementItem[];
    const itemIds = parsedItems.map(({ occurrenceNodeId }) => occurrenceNodeId);
    if (
      new Set(itemIds).size !== itemIds.length ||
      parsedItems.some(
        ({ frame }) =>
          !pageBounded(frame, value["pageWidthMpt"] as number, value["pageHeightMpt"] as number),
      )
    ) {
      return rejected("ARRANGEMENT_SELECTION_INVALID");
    }
    const key = parsedItems.find(
      ({ occurrenceNodeId }) => occurrenceNodeId === value["keyElementId"],
    );
    if (key === undefined) return rejected("ARRANGEMENT_KEY_ELEMENT_INVALID");

    const excludedLockedOccurrenceNodeIds = parsedItems
      .filter(({ locked, occurrenceNodeId }) => locked && occurrenceNodeId !== key.occurrenceNodeId)
      .map(({ occurrenceNodeId }) => occurrenceNodeId);
    const proposed = new Map(parsedItems.map((item) => [item.occurrenceNodeId, item] as const));

    if (operation.kind === "nudge") {
      if (parsedItems.some(({ locked }) => locked)) return rejected("ARRANGEMENT_LOCKED");
      if (
        operation.deltaYMpt !== 0 &&
        parsedItems.some(({ positionMode }) => positionMode === "depth-bound")
      ) {
        return rejected("ARRANGEMENT_DEPTH_BOUND");
      }
      for (const item of parsedItems) {
        proposed.set(
          item.occurrenceNodeId,
          withFrame(item, {
            ...item.frame,
            xMpt: item.frame.xMpt + operation.deltaXMpt,
            yMpt: item.frame.yMpt + operation.deltaYMpt,
          }),
        );
      }
    } else if (operation.kind === "align" || operation.kind === "match-size") {
      if (parsedItems.length < 2) return rejected("ARRANGEMENT_INSUFFICIENT_ITEMS");
      const movable = parsedItems.filter(
        ({ occurrenceNodeId, locked }) => occurrenceNodeId !== key.occurrenceNodeId && !locked,
      );
      if (movable.length === 0) return rejected("ARRANGEMENT_LOCKED");
      for (const item of movable) {
        let frame: BoringLogArrangementFrame = item.frame;
        if (operation.kind === "align") {
          const vertical = ["top", "vertical-center", "bottom"].includes(operation.alignment);
          if (vertical && item.positionMode === "depth-bound") {
            return rejected("ARRANGEMENT_DEPTH_BOUND");
          }
          const xMpt =
            operation.alignment === "left"
              ? key.frame.xMpt
              : operation.alignment === "horizontal-center"
                ? Math.round(key.frame.xMpt + key.frame.widthMpt / 2 - item.frame.widthMpt / 2)
                : operation.alignment === "right"
                  ? key.frame.xMpt + key.frame.widthMpt - item.frame.widthMpt
                  : item.frame.xMpt;
          const yMpt =
            operation.alignment === "top"
              ? key.frame.yMpt
              : operation.alignment === "vertical-center"
                ? Math.round(key.frame.yMpt + key.frame.heightMpt / 2 - item.frame.heightMpt / 2)
                : operation.alignment === "bottom"
                  ? key.frame.yMpt + key.frame.heightMpt - item.frame.heightMpt
                  : item.frame.yMpt;
          frame = Object.freeze({ ...item.frame, xMpt, yMpt });
        } else {
          frame = Object.freeze({
            ...item.frame,
            widthMpt:
              operation.dimension === "width" || operation.dimension === "both"
                ? key.frame.widthMpt
                : item.frame.widthMpt,
            heightMpt:
              operation.dimension === "height" || operation.dimension === "both"
                ? key.frame.heightMpt
                : item.frame.heightMpt,
          });
        }
        proposed.set(item.occurrenceNodeId, withFrame(item, frame));
      }
    } else {
      const eligible = parsedItems.filter(({ locked }) => !locked);
      if (eligible.length < 3) return rejected("ARRANGEMENT_INSUFFICIENT_ITEMS");
      const horizontal = operation.distribution.startsWith("horizontal");
      const byAxis = [...eligible].sort((left, right) => {
        const leftCoordinate = horizontal ? left.frame.xMpt : left.frame.yMpt;
        const rightCoordinate = horizontal ? right.frame.xMpt : right.frame.yMpt;
        return (
          leftCoordinate - rightCoordinate ||
          left.occurrenceNodeId.localeCompare(right.occurrenceNodeId, "en-US")
        );
      });
      const first = byAxis[0]!;
      const last = byAxis.at(-1)!;
      if (operation.distribution.endsWith("gaps")) {
        const firstStart = horizontal ? first.frame.xMpt : first.frame.yMpt;
        const lastEnd = horizontal
          ? last.frame.xMpt + last.frame.widthMpt
          : last.frame.yMpt + last.frame.heightMpt;
        const occupied = byAxis.reduce(
          (total, item) => total + (horizontal ? item.frame.widthMpt : item.frame.heightMpt),
          0,
        );
        const availableGap = lastEnd - firstStart - occupied;
        if (availableGap < 0) return rejected("ARRANGEMENT_INSUFFICIENT_SPAN");
        let occupiedBefore = horizontal ? first.frame.widthMpt : first.frame.heightMpt;
        for (let index = 1; index < byAxis.length - 1; index += 1) {
          const item = byAxis[index]!;
          const coordinate = Math.round(
            firstStart + occupiedBefore + (availableGap * index) / (byAxis.length - 1),
          );
          const frame = horizontal
            ? { ...item.frame, xMpt: coordinate }
            : { ...item.frame, yMpt: coordinate };
          if (
            !horizontal &&
            item.positionMode === "depth-bound" &&
            coordinate !== item.frame.yMpt
          ) {
            return rejected("ARRANGEMENT_DEPTH_BOUND");
          }
          proposed.set(item.occurrenceNodeId, withFrame(item, frame));
          occupiedBefore += horizontal ? item.frame.widthMpt : item.frame.heightMpt;
        }
      } else {
        const firstCenter = horizontal
          ? first.frame.xMpt + first.frame.widthMpt / 2
          : first.frame.yMpt + first.frame.heightMpt / 2;
        const lastCenter = horizontal
          ? last.frame.xMpt + last.frame.widthMpt / 2
          : last.frame.yMpt + last.frame.heightMpt / 2;
        if (lastCenter <= firstCenter) return rejected("ARRANGEMENT_INSUFFICIENT_SPAN");
        for (let index = 1; index < byAxis.length - 1; index += 1) {
          const item = byAxis[index]!;
          const center = firstCenter + ((lastCenter - firstCenter) * index) / (byAxis.length - 1);
          const coordinate = Math.round(
            center - (horizontal ? item.frame.widthMpt : item.frame.heightMpt) / 2,
          );
          const frame = horizontal
            ? { ...item.frame, xMpt: coordinate }
            : { ...item.frame, yMpt: coordinate };
          if (
            !horizontal &&
            item.positionMode === "depth-bound" &&
            coordinate !== item.frame.yMpt
          ) {
            return rejected("ARRANGEMENT_DEPTH_BOUND");
          }
          proposed.set(item.occurrenceNodeId, withFrame(item, frame));
        }
      }
    }

    const arranged = parsedItems.map((item) => proposed.get(item.occurrenceNodeId)!);
    if (
      arranged.some(
        ({ frame }) =>
          !pageBounded(frame, value["pageWidthMpt"] as number, value["pageHeightMpt"] as number),
      )
    ) {
      return rejected("ARRANGEMENT_PAGE_BOUNDS");
    }
    const affectedOccurrenceNodeIds = arranged
      .filter((item, index) => !sameFrame(item.frame, parsedItems[index]!.frame))
      .map(({ occurrenceNodeId }) => occurrenceNodeId);
    return Object.freeze({
      accepted: true,
      changed: affectedOccurrenceNodeIds.length > 0,
      operation,
      keyElementId: key.occurrenceNodeId,
      items: Object.freeze(arranged),
      affectedOccurrenceNodeIds: Object.freeze(affectedOccurrenceNodeIds),
      excludedLockedOccurrenceNodeIds: Object.freeze(excludedLockedOccurrenceNodeIds),
    });
  } catch {
    return rejected("ARRANGEMENT_ARGUMENT_INVALID");
  }
}
