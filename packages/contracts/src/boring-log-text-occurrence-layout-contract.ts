import { isMpt, type Mpt } from "./physical-length.js";
import type {
  BoringLogBorderStyleInput,
  BoringLogTextOccurrenceLayoutInput,
} from "./boring-log-render-contract.js";

export const boringLogTextOccurrenceLayoutOverrideSchemaVersion =
  "rsrender.boring-log-text-occurrence-layout-override.v1" as const;

export interface BoringLogTextOccurrenceLayoutOverride {
  readonly contractVersion: 1;
  readonly schemaVersion: typeof boringLogTextOccurrenceLayoutOverrideSchemaVersion;
  readonly kind: "boring-log.text-occurrence-layout-override";
  readonly ownerDocumentIdentity: string;
  readonly boringLogIdentity: string;
  readonly overrideIdentity: string;
  readonly overrideRevision: number;
  readonly scope: "occurrence";
  readonly occurrenceNodeId: string;
  readonly semanticId: string;
  readonly layout: Omit<BoringLogTextOccurrenceLayoutInput, "id">;
}

export type BoringLogTextOccurrenceLayoutOverrideResult =
  | { readonly accepted: true; readonly value: BoringLogTextOccurrenceLayoutOverride }
  | {
      readonly accepted: false;
      readonly code:
        | "BORING_LOG_TEXT_LAYOUT_OVERRIDE_MALFORMED"
        | "BORING_LOG_TEXT_LAYOUT_OVERRIDE_EXTRA_FIELD"
        | "BORING_LOG_TEXT_LAYOUT_OVERRIDE_MISSING_FIELD"
        | "BORING_LOG_TEXT_LAYOUT_OVERRIDE_WRONG_TYPE"
        | "BORING_LOG_TEXT_LAYOUT_OVERRIDE_UNSUPPORTED_VERSION";
    };

type RejectionCode = Exclude<
  BoringLogTextOccurrenceLayoutOverrideResult,
  { readonly accepted: true }
>["code"];

class LayoutFailure extends Error {
  public constructor(public readonly code: RejectionCode) {
    super(code);
  }
}

function fail(code: RejectionCode): never {
  throw new LayoutFailure(code);
}

function record(input: unknown, fields: readonly string[]): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("BORING_LOG_TEXT_LAYOUT_OVERRIDE_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("BORING_LOG_TEXT_LAYOUT_OVERRIDE_MALFORMED");
  }
  const keys = Reflect.ownKeys(input);
  if (keys.some((key) => typeof key !== "string" || !fields.includes(key))) {
    return fail("BORING_LOG_TEXT_LAYOUT_OVERRIDE_EXTRA_FIELD");
  }
  if (fields.some((field) => !Object.hasOwn(input, field))) {
    return fail("BORING_LOG_TEXT_LAYOUT_OVERRIDE_MISSING_FIELD");
  }
  return input as Readonly<Record<string, unknown>>;
}

function text(input: unknown): string {
  if (typeof input !== "string" || input.length < 1 || input.length > 512) {
    return fail("BORING_LOG_TEXT_LAYOUT_OVERRIDE_WRONG_TYPE");
  }
  return input;
}

function nullableText(input: unknown): string | null {
  return input === null ? null : text(input);
}

function nonnegativeMpt(input: unknown): Mpt {
  if (!isMpt(input) || input < 0) return fail("BORING_LOG_TEXT_LAYOUT_OVERRIDE_WRONG_TYPE");
  return input;
}

function positiveMpt(input: unknown): Mpt {
  if (!isMpt(input) || input <= 0) return fail("BORING_LOG_TEXT_LAYOUT_OVERRIDE_WRONG_TYPE");
  return input;
}

function borderStyle(input: unknown): BoringLogBorderStyleInput {
  const value = record(input, [
    "top",
    "right",
    "bottom",
    "left",
    "color",
    "widthMpt",
    "linePattern",
  ]);
  const widthMpt = nonnegativeMpt(value["widthMpt"]);
  if (
    ["top", "right", "bottom", "left"].some((edge) => typeof value[edge] !== "boolean") ||
    typeof value["color"] !== "string" ||
    !/^#[0-9a-f]{6}$/iu.test(value["color"]) ||
    widthMpt > 12_000 ||
    !["solid", "dashed", "dotted", "dash-dot"].includes(String(value["linePattern"]))
  ) {
    return fail("BORING_LOG_TEXT_LAYOUT_OVERRIDE_WRONG_TYPE");
  }
  return Object.freeze({
    top: value["top"] as boolean,
    right: value["right"] as boolean,
    bottom: value["bottom"] as boolean,
    left: value["left"] as boolean,
    color: value["color"],
    widthMpt,
    linePattern: value["linePattern"] as BoringLogBorderStyleInput["linePattern"],
  });
}

export function validateBoringLogTextOccurrenceLayoutOverride(
  input: unknown,
): BoringLogTextOccurrenceLayoutOverrideResult {
  try {
    const value = record(input, [
      "contractVersion",
      "schemaVersion",
      "kind",
      "ownerDocumentIdentity",
      "boringLogIdentity",
      "overrideIdentity",
      "overrideRevision",
      "scope",
      "occurrenceNodeId",
      "semanticId",
      "layout",
    ]);
    if (
      value["contractVersion"] !== 1 ||
      value["schemaVersion"] !== boringLogTextOccurrenceLayoutOverrideSchemaVersion ||
      value["kind"] !== "boring-log.text-occurrence-layout-override" ||
      value["scope"] !== "occurrence"
    ) {
      return fail("BORING_LOG_TEXT_LAYOUT_OVERRIDE_UNSUPPORTED_VERSION");
    }
    if (
      !Number.isSafeInteger(value["overrideRevision"]) ||
      (value["overrideRevision"] as number) < 1
    ) {
      return fail("BORING_LOG_TEXT_LAYOUT_OVERRIDE_WRONG_TYPE");
    }
    const hasFrameAnchor =
      typeof value["layout"] === "object" &&
      value["layout"] !== null &&
      Object.hasOwn(value["layout"], "frameAnchor");
    const hasMinimumFontSize =
      typeof value["layout"] === "object" &&
      value["layout"] !== null &&
      Object.hasOwn(value["layout"], "minimumFontSizeMpt");
    const hasFrameStyle =
      typeof value["layout"] === "object" &&
      value["layout"] !== null &&
      ["frameFillColor", "frameStrokeColor", "frameStrokeWidthMpt"].some((key) =>
        Object.hasOwn(value["layout"] as object, key),
      );
    const hasVisible =
      typeof value["layout"] === "object" &&
      value["layout"] !== null &&
      Object.hasOwn(value["layout"], "visible");
    const hasFrameBorder =
      typeof value["layout"] === "object" &&
      value["layout"] !== null &&
      Object.hasOwn(value["layout"], "frameBorder");
    const hasDrawingOrderOffset =
      typeof value["layout"] === "object" &&
      value["layout"] !== null &&
      Object.hasOwn(value["layout"], "drawingOrderOffset");
    const layout = record(value["layout"], [
      "frame",
      ...(hasFrameAnchor ? ["frameAnchor"] : []),
      "paddingMpt",
      "horizontalAlignment",
      "verticalAlignment",
      "wrapPolicy",
      "overflowPolicy",
      ...(hasMinimumFontSize ? ["minimumFontSizeMpt"] : []),
      ...(hasFrameStyle ? ["frameFillColor", "frameStrokeColor", "frameStrokeWidthMpt"] : []),
      ...(hasFrameBorder ? ["frameBorder"] : []),
      "rotationMilliDegrees",
      "positionMode",
      "locked",
      ...(hasVisible ? ["visible"] : []),
      ...(hasDrawingOrderOffset ? ["drawingOrderOffset"] : []),
    ]);
    const frame = record(layout["frame"], ["xMpt", "yMpt", "widthMpt", "heightMpt"]);
    const padding = record(layout["paddingMpt"], ["topMpt", "rightMpt", "bottomMpt", "leftMpt"]);
    const decodedFrame = Object.freeze({
      xMpt: nonnegativeMpt(frame["xMpt"]),
      yMpt: nonnegativeMpt(frame["yMpt"]),
      widthMpt: positiveMpt(frame["widthMpt"]),
      heightMpt: positiveMpt(frame["heightMpt"]),
    });
    const decodedPadding = Object.freeze({
      topMpt: nonnegativeMpt(padding["topMpt"]),
      rightMpt: nonnegativeMpt(padding["rightMpt"]),
      bottomMpt: nonnegativeMpt(padding["bottomMpt"]),
      leftMpt: nonnegativeMpt(padding["leftMpt"]),
    });
    if (
      decodedPadding.leftMpt + decodedPadding.rightMpt >= decodedFrame.widthMpt ||
      decodedPadding.topMpt + decodedPadding.bottomMpt >= decodedFrame.heightMpt
    ) {
      return fail("BORING_LOG_TEXT_LAYOUT_OVERRIDE_WRONG_TYPE");
    }
    const horizontalAlignment = layout["horizontalAlignment"];
    const verticalAlignment = layout["verticalAlignment"];
    const frameAnchor = hasFrameAnchor ? layout["frameAnchor"] : "top-left";
    const wrapPolicy = layout["wrapPolicy"];
    const overflowPolicy = layout["overflowPolicy"];
    const rotationMilliDegrees = layout["rotationMilliDegrees"];
    const positionMode = layout["positionMode"];
    const frameFillColor = hasFrameStyle ? nullableText(layout["frameFillColor"]) : null;
    const frameStrokeColor = hasFrameStyle ? nullableText(layout["frameStrokeColor"]) : null;
    const frameStrokeWidthMpt = hasFrameStyle
      ? nonnegativeMpt(layout["frameStrokeWidthMpt"])
      : null;
    const frameBorder = hasFrameBorder ? borderStyle(layout["frameBorder"]) : null;
    if (
      !(
        horizontalAlignment === "start" ||
        horizontalAlignment === "center" ||
        horizontalAlignment === "end"
      ) ||
      !(
        verticalAlignment === "top" ||
        verticalAlignment === "middle" ||
        verticalAlignment === "bottom"
      ) ||
      !(
        frameAnchor === "top-left" ||
        frameAnchor === "top-center" ||
        frameAnchor === "top-right" ||
        frameAnchor === "center-left" ||
        frameAnchor === "center" ||
        frameAnchor === "center-right" ||
        frameAnchor === "bottom-left" ||
        frameAnchor === "bottom-center" ||
        frameAnchor === "bottom-right"
      ) ||
      !(wrapPolicy === "word-v1" || wrapPolicy === "no-wrap") ||
      !(overflowPolicy === "clip-with-diagnostic" || overflowPolicy === "shrink-to-minimum") ||
      (overflowPolicy === "shrink-to-minimum" && !hasMinimumFontSize) ||
      !Number.isSafeInteger(rotationMilliDegrees) ||
      (rotationMilliDegrees as number) < -180_000 ||
      (rotationMilliDegrees as number) > 180_000 ||
      !(positionMode === "depth-bound" || positionMode === "free") ||
      typeof layout["locked"] !== "boolean" ||
      (hasVisible && typeof layout["visible"] !== "boolean") ||
      (hasDrawingOrderOffset &&
        (!Number.isSafeInteger(layout["drawingOrderOffset"]) ||
          Math.abs(layout["drawingOrderOffset"] as number) > 1_000_000))
    ) {
      return fail("BORING_LOG_TEXT_LAYOUT_OVERRIDE_WRONG_TYPE");
    }
    return Object.freeze({
      accepted: true,
      value: Object.freeze({
        contractVersion: 1,
        schemaVersion: boringLogTextOccurrenceLayoutOverrideSchemaVersion,
        kind: "boring-log.text-occurrence-layout-override",
        ownerDocumentIdentity: text(value["ownerDocumentIdentity"]),
        boringLogIdentity: text(value["boringLogIdentity"]),
        overrideIdentity: text(value["overrideIdentity"]),
        overrideRevision: value["overrideRevision"] as number,
        scope: "occurrence",
        occurrenceNodeId: text(value["occurrenceNodeId"]),
        semanticId: text(value["semanticId"]),
        layout: Object.freeze({
          frame: decodedFrame,
          frameAnchor,
          paddingMpt: decodedPadding,
          horizontalAlignment,
          verticalAlignment,
          wrapPolicy,
          overflowPolicy,
          ...(hasMinimumFontSize
            ? { minimumFontSizeMpt: positiveMpt(layout["minimumFontSizeMpt"]) }
            : {}),
          ...(hasFrameStyle
            ? { frameFillColor, frameStrokeColor, frameStrokeWidthMpt: frameStrokeWidthMpt! }
            : {}),
          ...(hasFrameBorder ? { frameBorder: frameBorder! } : {}),
          rotationMilliDegrees: rotationMilliDegrees as number,
          positionMode,
          locked: layout["locked"],
          ...(hasVisible ? { visible: layout["visible"] as boolean } : {}),
          ...(hasDrawingOrderOffset
            ? { drawingOrderOffset: layout["drawingOrderOffset"] as number }
            : {}),
        }),
      }),
    });
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code:
        error instanceof LayoutFailure ? error.code : "BORING_LOG_TEXT_LAYOUT_OVERRIDE_MALFORMED",
    });
  }
}
