import type { BoringLogDataLayerInput, Mpt } from "@rsrender/contracts";

export const boringLogDataLayerSymbologyRevision = "bld-050-data-layer-symbology-v1" as const;

export type BoringLogPointShape = "square" | "triangle" | "circle";

export interface BoringLogLineSymbol {
  readonly strokeToken: string;
  readonly strokeWidthMpt: Mpt;
  readonly dashMpt: readonly Mpt[];
}

export interface BoringLogPointSymbol {
  readonly shape: BoringLogPointShape;
  readonly sizeMpt: Mpt;
  readonly fillToken: string | null;
  readonly strokeToken: string;
  readonly strokeWidthMpt: Mpt;
}

export interface BoringLogRangeSymbol {
  readonly line: BoringLogLineSymbol;
  readonly firstEndpoint: BoringLogPointSymbol;
  readonly secondEndpoint: BoringLogPointSymbol;
}

export interface BoringLogDataLayerSymbologyOverride {
  readonly layerId: string;
  readonly visible: boolean;
  readonly order: number;
  readonly line: BoringLogLineSymbol | null;
  readonly point: BoringLogPointSymbol | null;
  readonly range: BoringLogRangeSymbol | null;
  readonly legend: Readonly<{ readonly visible: boolean; readonly label: string }>;
}

export interface BoringLogResolvedDataLayerSymbology extends BoringLogDataLayerSymbologyOverride {
  readonly source: "template-default" | "layer-override";
  readonly kind: BoringLogDataLayerInput["kind"];
  readonly legend: Readonly<{
    readonly visible: boolean;
    readonly label: string;
    readonly line: BoringLogLineSymbol | null;
    readonly point: BoringLogPointSymbol | null;
    readonly range: BoringLogRangeSymbol | null;
  }>;
}

export type BoringLogDataLayerSymbologyResult =
  | Readonly<{ readonly accepted: true; readonly value: BoringLogResolvedDataLayerSymbology }>
  | Readonly<{
      readonly accepted: false;
      readonly code:
        | "DATA_LAYER_SYMBOLOGY_ARGUMENT_INVALID"
        | "DATA_LAYER_SYMBOLOGY_KIND_MISMATCH"
        | "DATA_LAYER_SYMBOLOGY_TOKEN_UNKNOWN";
    }>;

function asMpt(value: number): Mpt {
  return value as Mpt;
}

function line(
  strokeToken: string,
  strokeWidthMpt: number,
  dashMpt: readonly number[] = [],
): BoringLogLineSymbol {
  return Object.freeze({
    strokeToken,
    strokeWidthMpt: asMpt(strokeWidthMpt),
    dashMpt: Object.freeze(dashMpt.map(asMpt)),
  });
}

function point(
  shape: BoringLogPointShape,
  sizeMpt: number,
  fillToken: string | null,
  strokeToken: string,
  strokeWidthMpt: number,
): BoringLogPointSymbol {
  return Object.freeze({
    shape,
    sizeMpt: asMpt(sizeMpt),
    fillToken,
    strokeToken,
    strokeWidthMpt: asMpt(strokeWidthMpt),
  });
}

function defaults(
  layer: BoringLogDataLayerInput,
  legendLabel: string,
): BoringLogDataLayerSymbologyOverride {
  if (layer.kind === "numeric-range") {
    const rangeLine = line("plasticityTrack", 500);
    const range = Object.freeze({
      line: rangeLine,
      firstEndpoint: point("circle", 3_500, "pageFill", "plasticityTrack", 500),
      secondEndpoint: point("circle", 3_500, "plasticityTrack", "plasticityTrack", 500),
    });
    return Object.freeze({
      layerId: layer.id,
      visible: true,
      order: 0,
      line: null,
      point: null,
      range,
      legend: Object.freeze({ visible: true, label: legendLabel }),
    });
  }
  const filledSquare = layer.glyph === "filled-square";
  const strokeToken = filledSquare ? "nTrack" : "moistureTrack";
  return Object.freeze({
    layerId: layer.id,
    visible: true,
    order: 0,
    line: line(strokeToken, filledSquare ? 650 : 500, filledSquare ? [] : [3_000, 2_000]),
    point: filledSquare
      ? point("square", 3_000, "nTrack", "ink", 500)
      : point("triangle", 4_000, "pageFill", "moistureTrack", 650),
    range: null,
    legend: Object.freeze({ visible: true, label: legendLabel }),
  });
}

function validLine(value: BoringLogLineSymbol | null, tokens: ReadonlySet<string>): boolean {
  return (
    value !== null &&
    tokens.has(value.strokeToken) &&
    Number.isSafeInteger(value.strokeWidthMpt) &&
    value.strokeWidthMpt >= 100 &&
    value.strokeWidthMpt <= 12_000 &&
    Array.isArray(value.dashMpt) &&
    value.dashMpt.length <= 8 &&
    value.dashMpt.length % 2 === 0 &&
    value.dashMpt.every((dash) => Number.isSafeInteger(dash) && dash > 0 && dash <= 72_000)
  );
}

function validPoint(value: BoringLogPointSymbol | null, tokens: ReadonlySet<string>): boolean {
  return (
    value !== null &&
    ["square", "triangle", "circle"].includes(value.shape) &&
    Number.isSafeInteger(value.sizeMpt) &&
    value.sizeMpt >= 1_000 &&
    value.sizeMpt <= 24_000 &&
    (value.fillToken === null || tokens.has(value.fillToken)) &&
    tokens.has(value.strokeToken) &&
    Number.isSafeInteger(value.strokeWidthMpt) &&
    value.strokeWidthMpt >= 100 &&
    value.strokeWidthMpt <= 12_000
  );
}

function detachedLine(value: BoringLogLineSymbol): BoringLogLineSymbol {
  return line(value.strokeToken, value.strokeWidthMpt, value.dashMpt);
}

function detachedPoint(value: BoringLogPointSymbol): BoringLogPointSymbol {
  return point(
    value.shape,
    value.sizeMpt,
    value.fillToken,
    value.strokeToken,
    value.strokeWidthMpt,
  );
}

export function resolveBoringLogDataLayerSymbology(
  input: Readonly<{
    readonly layer: BoringLogDataLayerInput;
    readonly legendLabel: string;
    readonly visualTokenIds: readonly string[];
    readonly override?: BoringLogDataLayerSymbologyOverride;
  }>,
): BoringLogDataLayerSymbologyResult {
  try {
    if (
      typeof input !== "object" ||
      input === null ||
      typeof input.layer !== "object" ||
      input.layer === null ||
      !["numeric-polyline", "numeric-range"].includes(input.layer.kind) ||
      typeof input.layer.id !== "string" ||
      input.layer.id.length === 0 ||
      typeof input.legendLabel !== "string" ||
      input.legendLabel.length === 0 ||
      input.legendLabel.length > 256 ||
      !Array.isArray(input.visualTokenIds) ||
      input.visualTokenIds.length === 0 ||
      input.visualTokenIds.some((token) => typeof token !== "string" || token.length === 0)
    ) {
      return Object.freeze({ accepted: false, code: "DATA_LAYER_SYMBOLOGY_ARGUMENT_INVALID" });
    }
    const tokens = new Set(input.visualTokenIds);
    const candidate = input.override ?? defaults(input.layer, input.legendLabel);
    if (
      candidate.layerId !== input.layer.id ||
      typeof candidate.visible !== "boolean" ||
      !Number.isSafeInteger(candidate.order) ||
      candidate.order < 0 ||
      candidate.order > 255 ||
      typeof candidate.legend !== "object" ||
      candidate.legend === null ||
      typeof candidate.legend.visible !== "boolean" ||
      typeof candidate.legend.label !== "string" ||
      candidate.legend.label.length === 0 ||
      candidate.legend.label.length > 256
    ) {
      return Object.freeze({ accepted: false, code: "DATA_LAYER_SYMBOLOGY_ARGUMENT_INVALID" });
    }
    const kindMatches =
      input.layer.kind === "numeric-polyline"
        ? candidate.range === null &&
          validLine(candidate.line, tokens) &&
          validPoint(candidate.point, tokens)
        : candidate.line === null &&
          candidate.point === null &&
          candidate.range !== null &&
          validLine(candidate.range.line, tokens) &&
          validPoint(candidate.range.firstEndpoint, tokens) &&
          validPoint(candidate.range.secondEndpoint, tokens);
    if (!kindMatches) {
      const referencedTokens = JSON.stringify(candidate);
      const unknownToken = [...referencedTokens.matchAll(/"(?:fillToken|strokeToken)":"([^"]+)"/gu)]
        .map((match) => match[1])
        .some((token) => !tokens.has(token));
      return Object.freeze({
        accepted: false,
        code: unknownToken
          ? "DATA_LAYER_SYMBOLOGY_TOKEN_UNKNOWN"
          : "DATA_LAYER_SYMBOLOGY_KIND_MISMATCH",
      });
    }
    const resolvedLine = candidate.line === null ? null : detachedLine(candidate.line);
    const resolvedPoint = candidate.point === null ? null : detachedPoint(candidate.point);
    const resolvedRange =
      candidate.range === null
        ? null
        : Object.freeze({
            line: detachedLine(candidate.range.line),
            firstEndpoint: detachedPoint(candidate.range.firstEndpoint),
            secondEndpoint: detachedPoint(candidate.range.secondEndpoint),
          });
    const legend = Object.freeze({
      visible: candidate.legend.visible && candidate.visible,
      label: candidate.legend.label,
      line: resolvedLine,
      point: resolvedPoint,
      range: resolvedRange,
    });
    return Object.freeze({
      accepted: true,
      value: Object.freeze({
        layerId: candidate.layerId,
        kind: input.layer.kind,
        source: input.override === undefined ? "template-default" : "layer-override",
        visible: candidate.visible,
        order: candidate.order,
        line: resolvedLine,
        point: resolvedPoint,
        range: resolvedRange,
        legend,
      }),
    });
  } catch {
    return Object.freeze({ accepted: false, code: "DATA_LAYER_SYMBOLOGY_ARGUMENT_INVALID" });
  }
}
