import type { BoringLogColumnInput } from "@rsrender/contracts";

export const boringLogColumnResizeRevision = "bld-039-column-resize-v1" as const;

export type BoringLogColumnResizeMode = "adjacent-pair" | "push-following-columns";

export function boringLogDefaultColumnMinimumWidthMpt(role: string): number {
  const minimums: Readonly<Record<string, number>> = Object.freeze({
    elevation: 18_000,
    "elevation-ruler": 18_000,
    depth: 18_000,
    "depth-ruler": 18_000,
    lithology: 18_000,
    "lithology-pattern": 18_000,
    "material-description": 80_000,
    sample: 20_000,
    recovery: 18_000,
    blows: 24_000,
    "n-value": 16_000,
    "penetration-moisture-plasticity": 60_000,
    remarks: 50_000,
  });
  return typeof role === "string" && role.length > 0 ? (minimums[role] ?? 12_000) : 12_000;
}

export interface BoringLogColumnResizeConstraint {
  readonly columnId: string;
  readonly minimumWidthMpt: number;
  readonly widthPinned: boolean;
}

export type BoringLogAdjacentColumnResizeResult =
  | Readonly<{
      accepted: true;
      changed: boolean;
      resizeMode: BoringLogColumnResizeMode;
      columns: readonly BoringLogColumnInput[];
      leftColumnId: string;
      rightColumnId: string;
      terminalColumnId: string;
      affectedColumnIds: readonly string[];
      originalDividerXMpt: number;
      requestedDividerXMpt: number;
      effectiveDividerXMpt: number;
      clamped: boolean;
      conservedWidthMpt: number;
      leftMinimumReached: boolean;
      rightMinimumReached: boolean;
    }>
  | Readonly<{
      accepted: false;
      code:
        | "COLUMN_RESIZE_ARGUMENT_INVALID"
        | "COLUMN_RESIZE_ORDER_INVALID"
        | "COLUMN_RESIZE_DIVIDER_NOT_FOUND"
        | "COLUMN_RESIZE_CONSTRAINT_INVALID"
        | "COLUMN_RESIZE_PINNED";
    }>;

function rejected(
  code: Extract<BoringLogAdjacentColumnResizeResult, { readonly accepted: false }>["code"],
): BoringLogAdjacentColumnResizeResult {
  return Object.freeze({ accepted: false, code });
}

function exactColumn(input: unknown): input is BoringLogColumnInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const value = input as Readonly<Record<string, unknown>>;
  return (
    Reflect.ownKeys(value).length === 4 &&
    typeof value["id"] === "string" &&
    value["id"].length > 0 &&
    typeof value["role"] === "string" &&
    value["role"].length > 0 &&
    Number.isSafeInteger(value["xMpt"]) &&
    (value["xMpt"] as number) >= 0 &&
    Number.isSafeInteger(value["widthMpt"]) &&
    (value["widthMpt"] as number) > 0
  );
}

function exactConstraint(input: unknown): input is BoringLogColumnResizeConstraint {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const value = input as Readonly<Record<string, unknown>>;
  return (
    Reflect.ownKeys(value).length === 3 &&
    typeof value["columnId"] === "string" &&
    value["columnId"].length > 0 &&
    Number.isSafeInteger(value["minimumWidthMpt"]) &&
    (value["minimumWidthMpt"] as number) > 0 &&
    typeof value["widthPinned"] === "boolean"
  );
}

export function resizeBoringLogColumns(
  input: Readonly<{
    readonly columns: readonly BoringLogColumnInput[];
    readonly constraints: readonly BoringLogColumnResizeConstraint[];
    readonly dividerAfterColumnId: string;
    readonly requestedDividerXMpt: number;
    readonly resizeMode: BoringLogColumnResizeMode;
  }>,
): BoringLogAdjacentColumnResizeResult {
  try {
    if (
      typeof input !== "object" ||
      input === null ||
      !Array.isArray(input.columns) ||
      input.columns.length < 2 ||
      !input.columns.every(exactColumn) ||
      !Array.isArray(input.constraints) ||
      !input.constraints.every(exactConstraint) ||
      typeof input.dividerAfterColumnId !== "string" ||
      input.dividerAfterColumnId.length === 0 ||
      !Number.isSafeInteger(input.requestedDividerXMpt) ||
      !["adjacent-pair", "push-following-columns"].includes(input.resizeMode)
    ) {
      return rejected("COLUMN_RESIZE_ARGUMENT_INVALID");
    }
    const columnIds = input.columns.map(({ id }) => id);
    if (
      new Set(columnIds).size !== columnIds.length ||
      input.columns.some(
        (column, index) =>
          index > 0 &&
          input.columns[index - 1]!.xMpt + input.columns[index - 1]!.widthMpt !== column.xMpt,
      )
    ) {
      return rejected("COLUMN_RESIZE_ORDER_INVALID");
    }
    const constraints = new Map(
      input.constraints.map((constraint) => [constraint.columnId, constraint] as const),
    );
    if (
      constraints.size !== input.constraints.length ||
      constraints.size !== input.columns.length ||
      columnIds.some((id) => !constraints.has(id)) ||
      input.constraints.some(
        (constraint) =>
          !columnIds.includes(constraint.columnId) ||
          constraint.minimumWidthMpt >
            input.columns.find(({ id }) => id === constraint.columnId)!.widthMpt,
      )
    ) {
      return rejected("COLUMN_RESIZE_CONSTRAINT_INVALID");
    }
    const leftIndex = input.columns.findIndex(({ id }) => id === input.dividerAfterColumnId);
    if (leftIndex < 0 || leftIndex >= input.columns.length - 1) {
      return rejected("COLUMN_RESIZE_DIVIDER_NOT_FOUND");
    }
    const left = input.columns[leftIndex]!;
    const right = input.columns[leftIndex + 1]!;
    const terminal =
      input.resizeMode === "adjacent-pair" ? right : input.columns[input.columns.length - 1]!;
    const leftConstraint = constraints.get(left.id)!;
    const terminalConstraint = constraints.get(terminal.id)!;
    const originalDividerXMpt = right.xMpt;
    if (
      input.requestedDividerXMpt !== originalDividerXMpt &&
      (leftConstraint.widthPinned || terminalConstraint.widthPinned)
    ) {
      return rejected("COLUMN_RESIZE_PINNED");
    }
    const conservedEndMpt = terminal.xMpt + terminal.widthMpt;
    const minimumDividerXMpt = left.xMpt + leftConstraint.minimumWidthMpt;
    const maximumDividerXMpt =
      originalDividerXMpt + terminal.widthMpt - terminalConstraint.minimumWidthMpt;
    const effectiveDividerXMpt = Math.min(
      maximumDividerXMpt,
      Math.max(minimumDividerXMpt, input.requestedDividerXMpt),
    );
    const deltaMpt = effectiveDividerXMpt - originalDividerXMpt;
    const columns = input.columns.map((column, index) => {
      if (index === leftIndex) {
        return Object.freeze({
          ...column,
          widthMpt: effectiveDividerXMpt - left.xMpt,
        }) as BoringLogColumnInput;
      }
      if (input.resizeMode === "adjacent-pair" && index === leftIndex + 1) {
        return Object.freeze({
          ...column,
          xMpt: effectiveDividerXMpt,
          widthMpt: conservedEndMpt - effectiveDividerXMpt,
        }) as BoringLogColumnInput;
      }
      if (input.resizeMode === "push-following-columns" && index > leftIndex) {
        return Object.freeze({
          ...column,
          xMpt: column.xMpt + deltaMpt,
          widthMpt:
            index === input.columns.length - 1 ? column.widthMpt - deltaMpt : column.widthMpt,
        }) as BoringLogColumnInput;
      }
      return Object.freeze({ ...column });
    });
    const affectedColumnIds = input.columns
      .slice(leftIndex, input.resizeMode === "adjacent-pair" ? leftIndex + 2 : undefined)
      .map(({ id }) => id);
    return Object.freeze({
      accepted: true,
      changed: effectiveDividerXMpt !== originalDividerXMpt,
      resizeMode: input.resizeMode,
      columns: Object.freeze(columns),
      leftColumnId: left.id,
      rightColumnId: right.id,
      terminalColumnId: terminal.id,
      affectedColumnIds: Object.freeze(affectedColumnIds),
      originalDividerXMpt,
      requestedDividerXMpt: input.requestedDividerXMpt,
      effectiveDividerXMpt,
      clamped: effectiveDividerXMpt !== input.requestedDividerXMpt,
      conservedWidthMpt: conservedEndMpt - left.xMpt,
      leftMinimumReached: effectiveDividerXMpt === minimumDividerXMpt,
      rightMinimumReached: effectiveDividerXMpt === maximumDividerXMpt,
    });
  } catch {
    return rejected("COLUMN_RESIZE_ARGUMENT_INVALID");
  }
}

export function resizeAdjacentBoringLogColumns(
  input: Readonly<{
    readonly columns: readonly BoringLogColumnInput[];
    readonly constraints: readonly BoringLogColumnResizeConstraint[];
    readonly dividerAfterColumnId: string;
    readonly requestedDividerXMpt: number;
  }>,
): BoringLogAdjacentColumnResizeResult {
  return resizeBoringLogColumns({ ...input, resizeMode: "adjacent-pair" });
}
