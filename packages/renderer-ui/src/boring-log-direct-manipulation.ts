export type BoringLogDirectManipulationHandle =
  | "move"
  | "north-west"
  | "north"
  | "north-east"
  | "east"
  | "south-east"
  | "south"
  | "south-west"
  | "west";

export type BoringLogDirectManipulationFrame = Readonly<{
  xMpt: number;
  yMpt: number;
  widthMpt: number;
  heightMpt: number;
}>;

export type BoringLogDirectManipulationResult =
  | Readonly<{
      accepted: true;
      frame: BoringLogDirectManipulationFrame;
      changed: boolean;
      yConstrained: boolean;
    }>
  | Readonly<{
      accepted: false;
      code: "DIRECT_MANIPULATION_ARGUMENT_INVALID";
    }>;

const handles: readonly BoringLogDirectManipulationHandle[] = [
  "move",
  "north-west",
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
];

function bounded(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function exactFrame(input: unknown): input is BoringLogDirectManipulationFrame {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const value = input as Readonly<Record<string, unknown>>;
  return (
    Reflect.ownKeys(value).length === 4 &&
    ["xMpt", "yMpt", "widthMpt", "heightMpt"].every(
      (key) => Number.isSafeInteger(value[key]) && (value[key] as number) >= 0,
    ) &&
    (value["widthMpt"] as number) > 0 &&
    (value["heightMpt"] as number) > 0
  );
}

export function resolveBoringLogDirectManipulationFrame(input: {
  readonly original: BoringLogDirectManipulationFrame;
  readonly handle: BoringLogDirectManipulationHandle;
  readonly deltaXMpt: number;
  readonly deltaYMpt: number;
  readonly pageWidthMpt: number;
  readonly pageHeightMpt: number;
  readonly minimumWidthMpt: number;
  readonly minimumHeightMpt: number;
  readonly positionMode: "depth-bound" | "free";
}): BoringLogDirectManipulationResult {
  if (
    typeof input !== "object" ||
    input === null ||
    !exactFrame(input.original) ||
    !handles.includes(input.handle) ||
    !Number.isSafeInteger(input.deltaXMpt) ||
    !Number.isSafeInteger(input.deltaYMpt) ||
    !Number.isSafeInteger(input.pageWidthMpt) ||
    !Number.isSafeInteger(input.pageHeightMpt) ||
    !Number.isSafeInteger(input.minimumWidthMpt) ||
    !Number.isSafeInteger(input.minimumHeightMpt) ||
    input.pageWidthMpt < 1 ||
    input.pageHeightMpt < 1 ||
    input.minimumWidthMpt < 1 ||
    input.minimumHeightMpt < 1 ||
    input.original.xMpt + input.original.widthMpt > input.pageWidthMpt ||
    input.original.yMpt + input.original.heightMpt > input.pageHeightMpt ||
    input.minimumWidthMpt > input.pageWidthMpt ||
    input.minimumHeightMpt > input.pageHeightMpt ||
    !["depth-bound", "free"].includes(input.positionMode)
  ) {
    return Object.freeze({ accepted: false, code: "DIRECT_MANIPULATION_ARGUMENT_INVALID" });
  }

  const original = input.original;
  if (input.handle === "move") {
    const frame = Object.freeze({
      xMpt: bounded(original.xMpt + input.deltaXMpt, 0, input.pageWidthMpt - original.widthMpt),
      yMpt:
        input.positionMode === "free"
          ? bounded(original.yMpt + input.deltaYMpt, 0, input.pageHeightMpt - original.heightMpt)
          : original.yMpt,
      widthMpt: original.widthMpt,
      heightMpt: original.heightMpt,
    });
    return Object.freeze({
      accepted: true,
      frame,
      changed:
        frame.xMpt !== original.xMpt ||
        frame.yMpt !== original.yMpt ||
        frame.widthMpt !== original.widthMpt ||
        frame.heightMpt !== original.heightMpt,
      yConstrained: input.positionMode === "depth-bound" && input.deltaYMpt !== 0,
    });
  }

  const west = input.handle.endsWith("west") || input.handle === "west";
  const east = input.handle.endsWith("east") || input.handle === "east";
  const north = input.handle.startsWith("north") || input.handle === "north";
  const south = input.handle.startsWith("south") || input.handle === "south";
  const originalRight = original.xMpt + original.widthMpt;
  const originalBottom = original.yMpt + original.heightMpt;
  const xMpt = west
    ? bounded(original.xMpt + input.deltaXMpt, 0, originalRight - input.minimumWidthMpt)
    : original.xMpt;
  const rightMpt = east
    ? bounded(originalRight + input.deltaXMpt, xMpt + input.minimumWidthMpt, input.pageWidthMpt)
    : originalRight;

  let yMpt = original.yMpt;
  let bottomMpt = originalBottom;
  if (input.positionMode === "free") {
    yMpt = north
      ? bounded(original.yMpt + input.deltaYMpt, 0, originalBottom - input.minimumHeightMpt)
      : original.yMpt;
    bottomMpt = south
      ? bounded(
          originalBottom + input.deltaYMpt,
          yMpt + input.minimumHeightMpt,
          input.pageHeightMpt,
        )
      : originalBottom;
  } else if (north || south) {
    const requestedHeight = north
      ? original.heightMpt - input.deltaYMpt
      : original.heightMpt + input.deltaYMpt;
    bottomMpt =
      original.yMpt +
      bounded(requestedHeight, input.minimumHeightMpt, input.pageHeightMpt - original.yMpt);
  }

  const frame = Object.freeze({
    xMpt,
    yMpt,
    widthMpt: rightMpt - xMpt,
    heightMpt: bottomMpt - yMpt,
  });
  return Object.freeze({
    accepted: true,
    frame,
    changed:
      frame.xMpt !== original.xMpt ||
      frame.yMpt !== original.yMpt ||
      frame.widthMpt !== original.widthMpt ||
      frame.heightMpt !== original.heightMpt,
    yConstrained: input.positionMode === "depth-bound" && (north || south),
  });
}
