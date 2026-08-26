import type {
  BoringLogDocumentInput,
  BoringLogSourceProvenance,
  BoringLogValueProvenance,
  OverrideRenderDomainValueProjection,
  OverrideRenderUnitState,
} from "@rsrender/contracts";
import type { SyntheticBoringLogEditableProperty } from "@rsrender/application";

export const boringLogAttributeRecordProjectionRevision =
  "bld-048-attribute-record-projection-v1" as const;

export type BoringLogStudioAttributeRecordKind =
  "lithology-interval" | "sample" | "plotted-observation" | "remark";

export type BoringLogStudioAttributeScalar = string | number | boolean | null;

export interface BoringLogStudioAttributeField {
  readonly fieldIdentity: string;
  readonly key: string;
  readonly label: string;
  readonly valueType: "string" | "number" | "boolean";
  readonly unit: string | null;
  readonly sourceOriginal: BoringLogStudioAttributeScalar;
  readonly effectiveDisplay: BoringLogStudioAttributeScalar;
  readonly editability:
    | { readonly kind: "read-only-source" }
    | {
        readonly kind: "display-value-override";
        readonly property: SyntheticBoringLogEditableProperty;
      };
  readonly provenance: Readonly<{
    readonly sourceOriginal: BoringLogSourceProvenance | null;
    readonly effective: BoringLogValueProvenance | null;
  }>;
}

export interface BoringLogStudioAttributeRecord {
  readonly recordIdentity: string;
  readonly recordKind: BoringLogStudioAttributeRecordKind;
  readonly semanticId: string;
  readonly boringLogIdentity: string;
  readonly explorationIdentity: string;
  readonly sourceEntityIdentity: string;
  readonly depth: Readonly<{
    readonly fromFt: number;
    readonly toFt: number;
  }>;
  readonly label: string;
  readonly fields: readonly BoringLogStudioAttributeField[];
}

interface AttributeEditableValue {
  readonly semanticId: string;
  readonly property: SyntheticBoringLogEditableProperty;
  readonly unit: OverrideRenderUnitState;
  readonly sourceOriginal: OverrideRenderDomainValueProjection;
  readonly effectiveDisplay: OverrideRenderDomainValueProjection;
}

type FieldInput = Readonly<{
  readonly key: string;
  readonly label: string;
  readonly valueType: "string" | "number" | "boolean";
  readonly unit?: string | null;
  readonly sourceOriginal: BoringLogStudioAttributeScalar;
  readonly effectiveDisplay: BoringLogStudioAttributeScalar;
  readonly sourceProvenance: BoringLogValueProvenance | null;
  readonly effectiveProvenance: BoringLogValueProvenance | null;
  readonly editable?: AttributeEditableValue;
}>;

function sourceProvenance(
  provenance: BoringLogValueProvenance | null,
): BoringLogSourceProvenance | null {
  if (provenance === null) return null;
  return provenance.provenanceClass === "source" ? provenance : provenance.original;
}

function scalar(
  content: OverrideRenderDomainValueProjection["content"],
): BoringLogStudioAttributeScalar {
  if (content.kind === "value") {
    return typeof content.value === "string" ||
      typeof content.value === "number" ||
      typeof content.value === "boolean"
      ? content.value
      : null;
  }
  if (content.kind === "zero") return 0;
  if (content.kind === "empty-string") return "";
  return null;
}

function field(recordIdentity: string, input: FieldInput): BoringLogStudioAttributeField {
  const source =
    input.editable === undefined
      ? input.sourceOriginal
      : scalar(input.editable.sourceOriginal.content);
  const effective =
    input.editable === undefined
      ? input.effectiveDisplay
      : scalar(input.editable.effectiveDisplay.content);
  const originalProvenance =
    sourceProvenance(input.effectiveProvenance) ?? sourceProvenance(input.sourceProvenance);
  return Object.freeze({
    fieldIdentity: `${recordIdentity}:field:${input.key}`,
    key: input.key,
    label: input.label,
    valueType: input.valueType,
    unit:
      input.editable === undefined
        ? (input.unit ?? null)
        : input.editable.unit.state === "specified"
          ? input.editable.unit.symbol
          : null,
    sourceOriginal: source,
    effectiveDisplay: effective,
    editability:
      input.editable === undefined
        ? Object.freeze({ kind: "read-only-source" as const })
        : Object.freeze({
            kind: "display-value-override" as const,
            property: input.editable.property,
          }),
    provenance: Object.freeze({
      sourceOriginal: originalProvenance,
      effective: input.effectiveProvenance,
    }),
  });
}

function record(
  input: Omit<BoringLogStudioAttributeRecord, "fields"> &
    Readonly<{ readonly fields: readonly FieldInput[] }>,
): BoringLogStudioAttributeRecord {
  return Object.freeze({
    ...input,
    depth: Object.freeze({ ...input.depth }),
    fields: Object.freeze(input.fields.map((candidate) => field(input.recordIdentity, candidate))),
  });
}

function recordIdentity(
  kind: "lithology" | "sample" | "observation" | "remark",
  boringLogIdentity: string,
  localIdentity: string,
): string {
  return `attribute:${kind}:${boringLogIdentity}:${localIdentity}`;
}

/**
 * Projects table/hover records from the exact validated source and effective documents used by
 * Studio scene preparation. It does not create a mutable table-owned or chart-owned data model.
 */
export function projectBoringLogAttributeRecords(
  input: Readonly<{
    readonly sourceDocument: BoringLogDocumentInput;
    readonly effectiveDocument: BoringLogDocumentInput;
    readonly editableValues: readonly AttributeEditableValue[];
  }>,
): readonly BoringLogStudioAttributeRecord[] {
  const source = input.sourceDocument;
  const effective = input.effectiveDocument;
  const boringLogIdentity = effective.identity.boringLogId;
  const explorationIdentity = effective.identity.explorationId;
  if (
    source.identity.boringLogId !== boringLogIdentity ||
    source.identity.explorationId !== explorationIdentity
  ) {
    throw new Error("BORING_LOG_ATTRIBUTE_IDENTITY_MISMATCH");
  }
  const editableBySemanticProperty = new Map(
    input.editableValues.map((value) => [`${value.semanticId}\u0000${value.property}`, value]),
  );
  const editable = (
    semanticId: string,
    property: SyntheticBoringLogEditableProperty,
  ): AttributeEditableValue | undefined =>
    editableBySemanticProperty.get(`${semanticId}\u0000${property}`);
  const sourceIntervals = new Map(source.lithologyIntervals.map((value) => [value.id, value]));
  const sourceSamples = new Map(source.samples.map((value) => [value.id, value]));
  const sourceRemarks = new Map(source.remarks.map((value) => [value.id, value]));
  const sourceLayers = new Map(source.dataTrack.layers.map((value) => [value.id, value]));
  const samples = new Map(effective.samples.map((value) => [value.id, value]));
  const axes = new Map(effective.dataTrack.axes.map((value) => [value.id, value]));
  const records: BoringLogStudioAttributeRecord[] = [];
  const documentSourceAuthority =
    sourceProvenance(effective.metadata.provenance) ?? sourceProvenance(source.metadata.provenance);

  for (const interval of effective.lithologyIntervals) {
    const original = sourceIntervals.get(interval.id);
    if (original === undefined) throw new Error("BORING_LOG_ATTRIBUTE_SOURCE_RECORD_MISSING");
    const semanticId = `lithology:${interval.id}`;
    const identity = recordIdentity("lithology", boringLogIdentity, interval.id);
    records.push(
      record({
        recordIdentity: identity,
        recordKind: "lithology-interval",
        semanticId,
        boringLogIdentity,
        explorationIdentity,
        sourceEntityIdentity:
          sourceProvenance(interval.provenance)?.sourceEntityIdentity ?? interval.id,
        depth: { fromFt: interval.depthFromFt, toFt: interval.depthToFt },
        label: `${interval.classification} · ${interval.depthFromFt}–${interval.depthToFt} ft`,
        fields: [
          {
            key: "depth-from-ft",
            label: "From depth",
            valueType: "number",
            unit: "ft",
            sourceOriginal: original.depthFromFt,
            effectiveDisplay: interval.depthFromFt,
            sourceProvenance: original.provenance,
            effectiveProvenance: interval.provenance,
          },
          {
            key: "depth-to-ft",
            label: "To depth",
            valueType: "number",
            unit: "ft",
            sourceOriginal: original.depthToFt,
            effectiveDisplay: interval.depthToFt,
            sourceProvenance: original.provenance,
            effectiveProvenance: interval.provenance,
          },
          {
            key: "classification",
            label: "Soil classification",
            valueType: "string",
            sourceOriginal: original.classification,
            effectiveDisplay: interval.classification,
            sourceProvenance: original.provenance,
            effectiveProvenance: interval.provenance,
          },
          {
            key: "mapped-classification",
            label: "Mapped soil type",
            valueType: "string",
            sourceOriginal: original.mappedClassificationKey,
            effectiveDisplay: interval.mappedClassificationKey,
            sourceProvenance: original.provenance,
            effectiveProvenance: interval.provenance,
          },
          {
            key: "description",
            label: "Material description",
            valueType: "string",
            sourceOriginal: original.description,
            effectiveDisplay: interval.description,
            sourceProvenance: original.provenance,
            effectiveProvenance: interval.provenance,
            ...(editable(semanticId, "material-description") === undefined
              ? {}
              : { editable: editable(semanticId, "material-description")! }),
          },
        ],
      }),
    );
  }

  for (const sample of effective.samples) {
    const original = sourceSamples.get(sample.id);
    if (original === undefined) throw new Error("BORING_LOG_ATTRIBUTE_SOURCE_RECORD_MISSING");
    const semanticId = `sample:${sample.id}`;
    const identity = recordIdentity("sample", boringLogIdentity, sample.id);
    records.push(
      record({
        recordIdentity: identity,
        recordKind: "sample",
        semanticId,
        boringLogIdentity,
        explorationIdentity,
        sourceEntityIdentity:
          sourceProvenance(sample.provenance)?.sourceEntityIdentity ?? sample.id,
        depth: { fromFt: sample.depthFt, toFt: sample.depthFt },
        label: `${sample.label} · ${sample.depthFt} ft`,
        fields: [
          {
            key: "label",
            label: "Sample",
            valueType: "string",
            sourceOriginal: original.label,
            effectiveDisplay: sample.label,
            sourceProvenance: original.provenance,
            effectiveProvenance: sample.provenance,
          },
          {
            key: "depth-ft",
            label: "Depth",
            valueType: "number",
            unit: "ft",
            sourceOriginal: original.depthFt,
            effectiveDisplay: sample.depthFt,
            sourceProvenance: original.provenance,
            effectiveProvenance: sample.provenance,
          },
          {
            key: "recovery-percent",
            label: "Recovery",
            valueType: "number",
            unit: "%",
            sourceOriginal: original.recoveryPercent,
            effectiveDisplay: sample.recoveryPercent,
            sourceProvenance: original.provenance,
            effectiveProvenance: sample.provenance,
            ...(editable(semanticId, "sample-recovery") === undefined
              ? {}
              : { editable: editable(semanticId, "sample-recovery")! }),
          },
          {
            key: "blows-per-increment",
            label: "Blows / increment",
            valueType: "string",
            unit: "blows",
            sourceOriginal: original.blowIncrements.map(({ blows }) => blows).join("-"),
            effectiveDisplay: sample.blowIncrements.map(({ blows }) => blows).join("-"),
            sourceProvenance: original.provenance,
            effectiveProvenance: sample.provenance,
          },
          {
            key: "n-value",
            label: "N-value",
            valueType: "number",
            unit: "blows/ft",
            sourceOriginal: original.nValue,
            effectiveDisplay: sample.nValue,
            sourceProvenance: original.provenance,
            effectiveProvenance: sample.provenance,
          },
          {
            key: "refusal",
            label: "Refusal",
            valueType: "boolean",
            sourceOriginal: original.refusal,
            effectiveDisplay: sample.refusal,
            sourceProvenance: original.provenance,
            effectiveProvenance: sample.provenance,
          },
        ],
      }),
    );
  }

  for (const layer of effective.dataTrack.layers) {
    const originalLayer = sourceLayers.get(layer.id);
    const axis = axes.get(layer.axisId);
    if (originalLayer === undefined || axis === undefined || originalLayer.kind !== layer.kind) {
      throw new Error("BORING_LOG_ATTRIBUTE_SOURCE_RECORD_MISSING");
    }
    const originalValues = new Map(originalLayer.values.map((value) => [value[0], value]));
    for (const value of layer.values) {
      const sample = samples.get(value[0]);
      const originalValue = originalValues.get(value[0]);
      if (sample === undefined || originalValue === undefined) {
        throw new Error("BORING_LOG_ATTRIBUTE_SOURCE_RECORD_MISSING");
      }
      const semanticId = `data-layer:${layer.id}:${value[0]}`;
      const identity = recordIdentity("observation", boringLogIdentity, `${layer.id}:${value[0]}`);
      const valueFields: FieldInput[] =
        layer.kind === "numeric-polyline" && originalLayer.kind === "numeric-polyline"
          ? [
              {
                key: "value",
                label: axis.quantity,
                valueType: "number",
                unit: axis.unit,
                sourceOriginal: originalValue[1],
                effectiveDisplay: value[1],
                sourceProvenance: originalLayer.provenance,
                effectiveProvenance: layer.provenance,
              },
            ]
          : layer.kind === "numeric-range" && originalLayer.kind === "numeric-range"
            ? [
                {
                  key: "upper-value",
                  label: `${axis.quantity} upper`,
                  valueType: "number",
                  unit: axis.unit,
                  sourceOriginal: originalValue[1],
                  effectiveDisplay: value[1],
                  sourceProvenance: originalLayer.provenance,
                  effectiveProvenance: layer.provenance,
                },
                {
                  key: "lower-value",
                  label: `${axis.quantity} lower`,
                  valueType: "number",
                  unit: axis.unit,
                  sourceOriginal: originalValue[2] as number,
                  effectiveDisplay: value[2] as number,
                  sourceProvenance: originalLayer.provenance,
                  effectiveProvenance: layer.provenance,
                },
              ]
            : [];
      records.push(
        record({
          recordIdentity: identity,
          recordKind: "plotted-observation",
          semanticId,
          boringLogIdentity,
          explorationIdentity,
          sourceEntityIdentity:
            sourceProvenance(originalLayer.provenance)?.sourceEntityIdentity ?? value[0],
          depth: { fromFt: sample.depthFt, toFt: sample.depthFt },
          label: `${axis.quantity} · ${sample.label} · ${sample.depthFt} ft`,
          fields: [
            {
              key: "series",
              label: "Series",
              valueType: "string",
              sourceOriginal: axis.quantity,
              effectiveDisplay: axis.quantity,
              sourceProvenance: originalLayer.provenance,
              effectiveProvenance: layer.provenance,
            },
            {
              key: "sample",
              label: "Sample",
              valueType: "string",
              sourceOriginal: sample.label,
              effectiveDisplay: sample.label,
              sourceProvenance: originalLayer.provenance,
              effectiveProvenance: layer.provenance,
            },
            {
              key: "depth-ft",
              label: "Depth",
              valueType: "number",
              unit: "ft",
              sourceOriginal: sample.depthFt,
              effectiveDisplay: sample.depthFt,
              sourceProvenance: originalLayer.provenance,
              effectiveProvenance: layer.provenance,
            },
            ...valueFields,
          ],
        }),
      );
    }
  }

  for (const remark of effective.remarks) {
    const original = sourceRemarks.get(remark.id);
    if (original === undefined) throw new Error("BORING_LOG_ATTRIBUTE_SOURCE_RECORD_MISSING");
    const semanticId = `remark:${remark.id}`;
    const remarkEditable = editable(semanticId, "remark-text");
    const remarkSourceProvenance =
      remarkEditable?.sourceOriginal.provenance.provenanceClass === "source"
        ? Object.freeze({
            provenanceClass: "source" as const,
            sourceContextIdentity: remarkEditable.sourceOriginal.provenance.sourceContextIdentity,
            sourceProjectIdentity: documentSourceAuthority?.sourceProjectIdentity ?? "",
            sourceEntityIdentity: remarkEditable.sourceOriginal.provenance.entityIdentity,
            sourceFieldIdentity: remarkEditable.sourceOriginal.provenance.fieldIdentity,
            sourceContractRevision: "bld-026-synthetic-source-snapshot-v1",
          })
        : null;
    const identity = recordIdentity("remark", boringLogIdentity, remark.id);
    records.push(
      record({
        recordIdentity: identity,
        recordKind: "remark",
        semanticId,
        boringLogIdentity,
        explorationIdentity,
        sourceEntityIdentity: remarkSourceProvenance?.sourceEntityIdentity ?? remark.id,
        depth: { fromFt: remark.depthFromFt, toFt: remark.depthToFt },
        label: `Remark · ${remark.depthFromFt}–${remark.depthToFt} ft`,
        fields: [
          {
            key: "depth-from-ft",
            label: "From depth",
            valueType: "number",
            unit: "ft",
            sourceOriginal: original.depthFromFt,
            effectiveDisplay: remark.depthFromFt,
            sourceProvenance: remarkSourceProvenance,
            effectiveProvenance: remarkSourceProvenance,
          },
          {
            key: "depth-to-ft",
            label: "To depth",
            valueType: "number",
            unit: "ft",
            sourceOriginal: original.depthToFt,
            effectiveDisplay: remark.depthToFt,
            sourceProvenance: remarkSourceProvenance,
            effectiveProvenance: remarkSourceProvenance,
          },
          {
            key: "text",
            label: "Remarks and field notes",
            valueType: "string",
            sourceOriginal: original.text,
            effectiveDisplay: remark.text,
            sourceProvenance: remarkSourceProvenance,
            effectiveProvenance:
              remarkEditable === undefined
                ? remarkSourceProvenance
                : remarkEditable.effectiveDisplay.provenance.provenanceClass === "source"
                  ? remarkSourceProvenance
                  : Object.freeze({
                      provenanceClass: "effective-override" as const,
                      original: remarkSourceProvenance!,
                      overrideIdentity:
                        remarkEditable.effectiveDisplay.provenance.presentationOverrideIdentity,
                      overrideRevision: remarkEditable.effectiveDisplay.provenance.overrideRevision,
                      transformation: "replace-display-value" as const,
                    }),
            ...(remarkEditable === undefined ? {} : { editable: remarkEditable }),
          },
        ],
      }),
    );
  }

  const identities = records.map(({ recordIdentity: identity }) => identity);
  if (new Set(identities).size !== identities.length) {
    throw new Error("BORING_LOG_ATTRIBUTE_DUPLICATE_IDENTITY");
  }
  return Object.freeze(records);
}
