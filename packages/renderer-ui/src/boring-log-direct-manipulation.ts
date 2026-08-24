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

export type BoringLogSnapTargetKind =
  "page" | "guide" | "region" | "depth" | "baseline" | "peer" | "grid";

export type BoringLogSnapTarget = Readonly<{
  positionMpt: number;
  kind: BoringLogSnapTargetKind;
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

export type BoringLogSnapResult = Readonly<{
  frame: BoringLogDirectManipulationFrame;
  snapXMpt: number | null;
  snapYMpt: number | null;
  snapXKind: BoringLogSnapTargetKind | null;
  snapYKind: BoringLogSnapTargetKind | null;
}>;

export function nearestBoringLogDirectManipulationResizeHandle(
  frame: BoringLogDirectManipulationFrame,
  point: Readonly<{ xMpt: number; yMpt: number }>,
): Exclude<BoringLogDirectManipulationHandle, "move"> | null {
  if (
    !exactFrame(frame) ||
    typeof point !== "object" ||
    point === null ||
    !Number.isSafeInteger(point.xMpt) ||
    !Number.isSafeInteger(point.yMpt)
  ) {
    return null;
  }
  const centers = Object.freeze({
    "north-west": Object.freeze({ xMpt: frame.xMpt, yMpt: frame.yMpt }),
    north: Object.freeze({
      xMpt: frame.xMpt + Math.round(frame.widthMpt / 2),
      yMpt: frame.yMpt,
    }),
    "north-east": Object.freeze({
      xMpt: frame.xMpt + frame.widthMpt,
      yMpt: frame.yMpt,
    }),
    east: Object.freeze({
      xMpt: frame.xMpt + frame.widthMpt,
      yMpt: frame.yMpt + Math.round(frame.heightMpt / 2),
    }),
    "south-east": Object.freeze({
      xMpt: frame.xMpt + frame.widthMpt,
      yMpt: frame.yMpt + frame.heightMpt,
    }),
    south: Object.freeze({
      xMpt: frame.xMpt + Math.round(frame.widthMpt / 2),
      yMpt: frame.yMpt + frame.heightMpt,
    }),
    "south-west": Object.freeze({
      xMpt: frame.xMpt,
      yMpt: frame.yMpt + frame.heightMpt,
    }),
    west: Object.freeze({
      xMpt: frame.xMpt,
      yMpt: frame.yMpt + Math.round(frame.heightMpt / 2),
    }),
  });
  let nearest: Exclude<BoringLogDirectManipulationHandle, "move"> | null = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;
  for (const [handle, center] of Object.entries(centers) as Array<
    readonly [
      Exclude<BoringLogDirectManipulationHandle, "move">,
      Readonly<{ xMpt: number; yMpt: number }>,
    ]
  >) {
    const deltaX = point.xMpt - center.xMpt;
    const deltaY = point.yMpt - center.yMpt;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    if (distanceSquared < nearestDistanceSquared) {
      nearest = handle;
      nearestDistanceSquared = distanceSquared;
    }
  }
  return nearest;
}

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
const snapTargetKinds: readonly BoringLogSnapTargetKind[] = [
  "page",
  "guide",
  "region",
  "depth",
  "baseline",
  "peer",
  "grid",
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

function exactSnapTargets(input: unknown): input is readonly BoringLogSnapTarget[] {
  return (
    Array.isArray(input) &&
    input.every(
      (target: unknown) =>
        typeof target === "object" &&
        target !== null &&
        !Array.isArray(target) &&
        Reflect.ownKeys(target).length === 2 &&
        Number.isSafeInteger((target as BoringLogSnapTarget).positionMpt) &&
        (target as BoringLogSnapTarget).positionMpt >= 0 &&
        snapTargetKinds.includes((target as BoringLogSnapTarget).kind),
    )
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

function closestSnap(
  candidates: readonly Readonly<{ positionMpt: number; kind: "frame" | "baseline" }>[],
  targets: readonly BoringLogSnapTarget[],
  thresholdMpt: number,
): Readonly<{
  deltaMpt: number;
  targetMpt: number;
  targetKind: BoringLogSnapTargetKind;
}> | null {
  const priorities: Readonly<Record<BoringLogSnapTargetKind, number>> = Object.freeze({
    guide: 0,
    baseline: 1,
    depth: 2,
    region: 3,
    page: 4,
    peer: 5,
    grid: 6,
  });
  let best: Readonly<{
    deltaMpt: number;
    targetMpt: number;
    targetKind: BoringLogSnapTargetKind;
  }> | null = null;
  for (const candidate of candidates) {
    for (const target of targets) {
      if (target.kind === "baseline" && candidate.kind !== "baseline") continue;
      const deltaMpt = target.positionMpt - candidate.positionMpt;
      if (Math.abs(deltaMpt) > thresholdMpt) continue;
      if (
        best === null ||
        Math.abs(deltaMpt) < Math.abs(best.deltaMpt) ||
        (Math.abs(deltaMpt) === Math.abs(best.deltaMpt) &&
          (target.positionMpt < best.targetMpt ||
            (target.positionMpt === best.targetMpt &&
              priorities[target.kind] < priorities[best.targetKind])))
      ) {
        best = Object.freeze({
          deltaMpt,
          targetMpt: target.positionMpt,
          targetKind: target.kind,
        });
      }
    }
  }
  return best;
}

export function snapBoringLogDirectManipulationFrame(input: {
  readonly frame: BoringLogDirectManipulationFrame;
  readonly handle: BoringLogDirectManipulationHandle;
  readonly xTargets: readonly BoringLogSnapTarget[];
  readonly yTargets: readonly BoringLogSnapTarget[];
  readonly baselineOffsetsYMpt?: readonly number[];
  readonly thresholdMpt: number;
  readonly pageWidthMpt: number;
  readonly pageHeightMpt: number;
  readonly bypass: boolean;
}): BoringLogSnapResult {
  if (
    input.bypass ||
    !Number.isSafeInteger(input.thresholdMpt) ||
    input.thresholdMpt < 0 ||
    !exactFrame(input.frame) ||
    !exactSnapTargets(input.xTargets) ||
    !exactSnapTargets(input.yTargets) ||
    !Array.isArray(input.baselineOffsetsYMpt ?? []) ||
    !(input.baselineOffsetsYMpt ?? []).every(
      (offsetMpt) => Number.isSafeInteger(offsetMpt) && offsetMpt >= 0,
    )
  ) {
    return Object.freeze({
      frame: input.frame,
      snapXMpt: null,
      snapYMpt: null,
      snapXKind: null,
      snapYKind: null,
    });
  }
  const frame = input.frame;
  const horizontalCandidates =
    input.handle === "move"
      ? [frame.xMpt, frame.xMpt + Math.round(frame.widthMpt / 2), frame.xMpt + frame.widthMpt].map(
          (positionMpt) => Object.freeze({ positionMpt, kind: "frame" as const }),
        )
      : input.handle.endsWith("west") || input.handle === "west"
        ? [Object.freeze({ positionMpt: frame.xMpt, kind: "frame" as const })]
        : input.handle.endsWith("east") || input.handle === "east"
          ? [
              Object.freeze({
                positionMpt: frame.xMpt + frame.widthMpt,
                kind: "frame" as const,
              }),
            ]
          : [];
  const verticalCandidates: Readonly<
    Readonly<{ positionMpt: number; kind: "frame" | "baseline" }>[]
  > =
    input.handle === "move"
      ? [
          ...[
            frame.yMpt,
            frame.yMpt + Math.round(frame.heightMpt / 2),
            frame.yMpt + frame.heightMpt,
          ].map((positionMpt) => Object.freeze({ positionMpt, kind: "frame" as const })),
          ...(input.baselineOffsetsYMpt ?? []).map((offsetMpt) =>
            Object.freeze({ positionMpt: frame.yMpt + offsetMpt, kind: "baseline" as const }),
          ),
        ]
      : input.handle.startsWith("north") || input.handle === "north"
        ? [Object.freeze({ positionMpt: frame.yMpt, kind: "frame" as const })]
        : input.handle.startsWith("south") || input.handle === "south"
          ? [
              Object.freeze({
                positionMpt: frame.yMpt + frame.heightMpt,
                kind: "frame" as const,
              }),
            ]
          : [];
  const xSnap = closestSnap(horizontalCandidates, input.xTargets, input.thresholdMpt);
  const ySnap = closestSnap(verticalCandidates, input.yTargets, input.thresholdMpt);
  let xMpt = frame.xMpt;
  let yMpt = frame.yMpt;
  let widthMpt = frame.widthMpt;
  let heightMpt = frame.heightMpt;
  if (xSnap !== null) {
    if (input.handle === "move") xMpt += xSnap.deltaMpt;
    else if (input.handle.endsWith("west") || input.handle === "west") {
      xMpt += xSnap.deltaMpt;
      widthMpt -= xSnap.deltaMpt;
    } else widthMpt += xSnap.deltaMpt;
  }
  if (ySnap !== null) {
    if (input.handle === "move") yMpt += ySnap.deltaMpt;
    else if (input.handle.startsWith("north") || input.handle === "north") {
      yMpt += ySnap.deltaMpt;
      heightMpt -= ySnap.deltaMpt;
    } else heightMpt += ySnap.deltaMpt;
  }
  const snapped = Object.freeze({ xMpt, yMpt, widthMpt, heightMpt });
  const valid =
    widthMpt > 0 &&
    heightMpt > 0 &&
    xMpt >= 0 &&
    yMpt >= 0 &&
    xMpt + widthMpt <= input.pageWidthMpt &&
    yMpt + heightMpt <= input.pageHeightMpt;
  return Object.freeze({
    frame: valid ? snapped : frame,
    snapXMpt: valid ? (xSnap?.targetMpt ?? null) : null,
    snapYMpt: valid ? (ySnap?.targetMpt ?? null) : null,
    snapXKind: valid ? (xSnap?.targetKind ?? null) : null,
    snapYKind: valid ? (ySnap?.targetKind ?? null) : null,
  });
}
