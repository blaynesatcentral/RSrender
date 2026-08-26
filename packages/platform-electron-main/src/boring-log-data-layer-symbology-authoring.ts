import {
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
  type BoringLogDataLayerSymbologyOverrideInput,
  type BoringLogLayoutJobInput,
  type Mpt,
} from "@rsrender/contracts";

export interface BoringLogDataLayerSymbologyAuthoringInput {
  readonly layerId: string;
  readonly expectedKind: "numeric-polyline" | "numeric-range";
  readonly visible: boolean;
  readonly order: number;
  readonly line: Readonly<{
    readonly strokeToken: string;
    readonly strokeWidthMpt: number;
    readonly dashMpt: readonly number[];
  }> | null;
  readonly point: Readonly<{
    readonly shape: "square" | "triangle" | "circle";
    readonly sizeMpt: number;
    readonly fillToken: string | null;
    readonly strokeToken: string;
    readonly strokeWidthMpt: number;
  }> | null;
  readonly range: Readonly<{
    readonly line: NonNullable<BoringLogDataLayerSymbologyAuthoringInput["line"]>;
    readonly firstEndpoint: NonNullable<BoringLogDataLayerSymbologyAuthoringInput["point"]>;
    readonly secondEndpoint: NonNullable<BoringLogDataLayerSymbologyAuthoringInput["point"]>;
  }> | null;
  readonly legend: Readonly<{ readonly visible: boolean; readonly label: string }>;
  readonly overrideIdentity: string;
}

export type BoringLogDataLayerSymbologyAuthoringResult =
  | Readonly<{
      readonly accepted: true;
      readonly layoutJob: BoringLogLayoutJobInput;
      readonly override: BoringLogDataLayerSymbologyOverrideInput;
    }>
  | Readonly<{
      readonly accepted: false;
      readonly code:
        | "DATA_LAYER_SYMBOLOGY_LAYER_MISSING"
        | "DATA_LAYER_SYMBOLOGY_KIND_MISMATCH"
        | "DATA_LAYER_SYMBOLOGY_TOKEN_UNKNOWN"
        | "DATA_LAYER_SYMBOLOGY_LAYOUT_INVALID"
        | "DATA_LAYER_SYMBOLOGY_NO_CHANGE";
    }>;

export function authorBoringLogDataLayerSymbology(
  job: BoringLogLayoutJobInput,
  input: BoringLogDataLayerSymbologyAuthoringInput,
): BoringLogDataLayerSymbologyAuthoringResult {
  const layer = job.document.dataTrack.layers.find(({ id }) => id === input.layerId);
  if (layer === undefined) {
    return Object.freeze({ accepted: false, code: "DATA_LAYER_SYMBOLOGY_LAYER_MISSING" });
  }
  const topologyMatches =
    layer.kind === input.expectedKind &&
    (layer.kind === "numeric-polyline"
      ? input.line !== null && input.point !== null && input.range === null
      : input.line === null && input.point === null && input.range !== null);
  if (!topologyMatches) {
    return Object.freeze({ accepted: false, code: "DATA_LAYER_SYMBOLOGY_KIND_MISMATCH" });
  }
  const tokenIds = new Set(Object.keys(job.template.visualTokens));
  const referencedTokens = [
    input.line?.strokeToken,
    input.point?.fillToken,
    input.point?.strokeToken,
    input.range?.line.strokeToken,
    input.range?.firstEndpoint.fillToken,
    input.range?.firstEndpoint.strokeToken,
    input.range?.secondEndpoint.fillToken,
    input.range?.secondEndpoint.strokeToken,
  ].filter((token): token is string => token !== undefined && token !== null);
  if (referencedTokens.some((token) => !tokenIds.has(token))) {
    return Object.freeze({ accepted: false, code: "DATA_LAYER_SYMBOLOGY_TOKEN_UNKNOWN" });
  }
  const prior = job.template.dataLayerSymbologyOverrides?.find(
    ({ layerId }) => layerId === layer.id,
  );
  const line = (value: NonNullable<typeof input.line>) =>
    Object.freeze({
      strokeToken: value.strokeToken,
      strokeWidthMpt: value.strokeWidthMpt as Mpt,
      dashMpt: Object.freeze(value.dashMpt.map((dash) => dash as Mpt)),
    });
  const point = (value: NonNullable<typeof input.point>) =>
    Object.freeze({
      shape: value.shape,
      sizeMpt: value.sizeMpt as Mpt,
      fillToken: value.fillToken,
      strokeToken: value.strokeToken,
      strokeWidthMpt: value.strokeWidthMpt as Mpt,
    });
  const override: BoringLogDataLayerSymbologyOverrideInput = Object.freeze({
    layerId: layer.id,
    kind: layer.kind,
    visible: input.visible,
    order: input.order,
    line: input.line === null ? null : line(input.line),
    point: input.point === null ? null : point(input.point),
    range:
      input.range === null
        ? null
        : Object.freeze({
            line: line(input.range.line),
            firstEndpoint: point(input.range.firstEndpoint),
            secondEndpoint: point(input.range.secondEndpoint),
          }),
    legend: Object.freeze({ ...input.legend }),
    overrideIdentity: input.overrideIdentity,
    overrideRevision: (prior?.overrideRevision ?? 0) + 1,
  });
  const overrides = [
    ...(job.template.dataLayerSymbologyOverrides ?? []).filter(
      ({ layerId }) => layerId !== layer.id,
    ),
    override,
  ].sort((left, right) => left.layerId.localeCompare(right.layerId));
  const template = Object.freeze({
    ...job.template,
    dataLayerSymbologyOverrides: Object.freeze(overrides),
  });
  const authored = validateBoringLogLayoutJobInput({
    ...job,
    templateDigest: sha256CanonicalJson(template),
    template,
  });
  if (!authored.accepted) {
    return Object.freeze({ accepted: false, code: "DATA_LAYER_SYMBOLOGY_LAYOUT_INVALID" });
  }
  if (authored.value.templateDigest === job.templateDigest) {
    return Object.freeze({ accepted: false, code: "DATA_LAYER_SYMBOLOGY_NO_CHANGE" });
  }
  return Object.freeze({ accepted: true, layoutJob: authored.value, override });
}
