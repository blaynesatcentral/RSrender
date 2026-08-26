import {
  boringLogDynamicTextCatalog,
  parseDynamicTextTemplate,
  validateBoringLogLayoutJobInput,
  validateResolvedBoringLogPageScene,
  type BoringLogLayoutJobInput,
  type BoringLogSourceProvenance,
  type BoringLogValueProvenance,
  type DynamicTextVariableValue,
  type OverrideRenderContentState,
  type OverrideRenderDatasetProjection,
  type OverrideRenderDomainValueProjection,
  type OverrideRenderUnitState,
  type ResolvedBoringLogPageScene,
} from "@rsrender/contracts";
import type {
  SyntheticBoringLogEditableBinding,
  SyntheticBoringLogEditableProperty,
} from "@rsrender/application";
import {
  applyBoringLogTextMeasurements,
  boringLogDefaultColumnMinimumWidthMpt,
  prepareBoringLogLayout,
  resolveBoringLogDataLayerSymbology,
  resolveBoringLogLithologyAppearances,
  resolveBoringLogPageScene,
  type BoringLogLineSymbol,
  type BoringLogLayoutPreparation,
  type BoringLogPointSymbol,
} from "@rsrender/scene";
import { rsLogProviderAuthoringCatalog } from "@rsrender/source-contract";
import {
  projectBoringLogAttributeRecords,
  type BoringLogStudioAttributeRecord,
} from "./boring-log-attribute-record-projection.js";

export const boringLogStudioProjectionRevision = "bld-026-studio-projection-v1" as const;

export interface BoringLogStudioEditableValue {
  readonly semanticId: string;
  readonly property: SyntheticBoringLogEditableProperty;
  readonly sourceFieldIdentity: string;
  readonly sourceEntityIdentity: string;
  readonly sourceBaselineValueDigest: OverrideRenderDatasetProjection["values"][number]["sourceBaselineValueDigest"];
  readonly valueType: "string" | "number";
  readonly unit: OverrideRenderUnitState;
  readonly sourceOriginal: OverrideRenderDomainValueProjection;
  readonly effectiveDisplay: OverrideRenderDomainValueProjection;
  readonly application:
    | { readonly kind: "source" }
    | {
        readonly kind: "display-value-override";
        readonly presentationOverrideIdentity: string;
        readonly localOverrideIdentity: string;
        readonly overrideRevision: number;
      };
}

/** Human-facing values derived from the effective layout job. */
export interface BoringLogStudioDataSummary {
  readonly projectName: string;
  readonly groundElevationFt: number;
  readonly elevationDatum: string;
  readonly referenceStartFt: number;
  readonly referenceEndFt: number;
  readonly totalDepthFt: number;
  readonly completionDepthFt: number;
  readonly depthScaleMptPerFoot: number;
  readonly depthIntervalFt: number;
  readonly nValueGraphMaximum: number | null;
}

export interface BoringLogStudioPageSetup {
  readonly paperPreset: "letter" | "a4" | "custom";
  readonly orientation: "portrait" | "landscape";
  readonly widthMpt: number;
  readonly heightMpt: number;
  readonly marginsMpt: Readonly<{
    readonly topMpt: number;
    readonly rightMpt: number;
    readonly bottomMpt: number;
    readonly leftMpt: number;
  }>;
}

export interface BoringLogStudioDataLineSymbol extends BoringLogLineSymbol {
  readonly strokeColor: string;
}

export interface BoringLogStudioDataPointSymbol extends BoringLogPointSymbol {
  readonly fillColor: string | null;
  readonly strokeColor: string;
}

export interface BoringLogStudioDataLayerSymbologyState {
  readonly semanticId: string;
  readonly layerId: string;
  readonly label: string;
  readonly kind: "numeric-polyline" | "numeric-range";
  readonly source: "template-default" | "layer-override";
  readonly visible: boolean;
  readonly order: number;
  readonly line: BoringLogStudioDataLineSymbol | null;
  readonly point: BoringLogStudioDataPointSymbol | null;
  readonly range: Readonly<{
    readonly line: BoringLogStudioDataLineSymbol;
    readonly firstEndpoint: BoringLogStudioDataPointSymbol;
    readonly secondEndpoint: BoringLogStudioDataPointSymbol;
  }> | null;
  readonly legend: Readonly<{
    readonly visible: boolean;
    readonly effectiveVisible: boolean;
    readonly label: string;
  }>;
}

export interface BoringLogStudioProjection {
  readonly schema: "rsrender.boring-log-studio-projection.v2";
  readonly documentIdentity: string;
  readonly ownerGeneration: number;
  readonly workingRevision: number;
  readonly durableRevision: number;
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly dataSummary: BoringLogStudioDataSummary;
  readonly pageSetup: BoringLogStudioPageSetup;
  readonly attributeRecords: readonly BoringLogStudioAttributeRecord[];
  readonly editableValues: readonly BoringLogStudioEditableValue[];
  readonly guides: NonNullable<BoringLogLayoutJobInput["template"]["guides"]>;
  readonly columnResizeConstraints: readonly Readonly<{
    readonly columnId: string;
    readonly minimumWidthMpt: number;
    readonly widthPinned: boolean;
  }>[];
  readonly providerColumnCatalog: readonly BoringLogStudioProviderColumnField[];
  readonly regionResizeConstraints: Readonly<{
    readonly minimumHeaderHeightMpt: number;
    readonly minimumDepthBodyHeightMpt: number;
    readonly minimumFooterHeightMpt: number;
  }>;
  readonly textTemplateScopeSummary: Readonly<{
    readonly authoredStyleCount: number;
    readonly excludedOverrideStyleCount: number;
  }>;
  readonly lithologyAppearanceStates: readonly BoringLogStudioLithologyAppearanceState[];
  readonly lithologyPatternOptions: readonly Readonly<{
    readonly patternId: string;
    readonly kind: "line-hatch" | "horizontal-dash" | "dot-ring";
  }>[];
  readonly dataLayerSymbologyStates: readonly BoringLogStudioDataLayerSymbologyState[];
  readonly visualTokenOptions: readonly Readonly<{
    readonly tokenId: string;
    readonly color: string;
    readonly label: string;
  }>[];
  readonly textOccurrencePresentationStates: readonly BoringLogStudioTextOccurrencePresentationState[];
  readonly scene: ResolvedBoringLogPageScene;
}

export interface BoringLogStudioProviderColumnField {
  readonly fieldId: string;
  readonly label: string;
  readonly description: string;
  readonly valueType: "boolean" | "date" | "number" | "structured-text" | "text";
  readonly unit: string | null;
  readonly supportedTargetRoles: readonly (
    | "interval-text-column"
    | "lithology-pattern-column"
    | "numeric-value-column"
    | "point-text-column"
    | "remarks-column"
  )[];
  readonly availability: Readonly<{
    readonly state: "available" | "unavailable";
    readonly reason: string | null;
  }>;
}

export interface BoringLogStudioLithologyAppearanceState {
  readonly semanticId: string;
  readonly boringLogIdentity: string;
  readonly intervalId: string;
  readonly classification: string;
  readonly mappedClassificationKey: string;
  readonly sourceMaterialFillToken: string;
  readonly sourceMaterialFillColor: string;
  readonly sourcePatternId: string;
  readonly effectiveMaterialFillToken: string;
  readonly effectiveMaterialFillColor: string;
  readonly effectivePatternId: string;
  readonly materialFillApplication: "source" | "classification-default" | "interval-override";
  readonly patternApplication: "source" | "classification-default" | "interval-override";
}

export interface BoringLogStudioTextOccurrencePresentationState {
  readonly occurrenceNodeId: string;
  readonly semanticId: string;
  readonly typography: "inherited" | "occurrence";
  readonly layout: "inherited" | "occurrence";
}

export interface BoringLogStudioProjectionPreparation {
  readonly layout: BoringLogLayoutPreparation;
  readonly projection: Omit<
    BoringLogStudioProjection,
    "scene" | "textOccurrencePresentationStates"
  >;
  readonly provenanceEntries: readonly Readonly<{
    readonly key: string;
    readonly provenance: BoringLogValueProvenance;
  }>[];
  readonly textOccurrenceStyleEntries: readonly Readonly<{
    readonly nodeId: string;
    readonly styleId: string;
  }>[];
  readonly textOccurrencePresentationEntries: readonly Readonly<{
    readonly nodeId: string;
    readonly style: "inherited" | "occurrence";
    readonly layout: "inherited" | "occurrence";
  }>[];
}

export type BoringLogStudioProjectionPreparationResult =
  | { readonly accepted: true; readonly preparation: BoringLogStudioProjectionPreparation }
  | Exclude<BoringLogStudioProjectionResult, { readonly accepted: true }>;

export type BoringLogStudioProjectionResult =
  | { readonly accepted: true; readonly projection: BoringLogStudioProjection }
  | {
      readonly accepted: false;
      readonly code:
        | "BORING_LOG_STUDIO_CONFIGURATION_INVALID"
        | "BORING_LOG_STUDIO_EDITABLE_VALUE_INVALID"
        | "BORING_LOG_STUDIO_LAYOUT_REJECTED"
        | "BORING_LOG_STUDIO_TEXT_REJECTED"
        | "BORING_LOG_STUDIO_SCENE_REJECTED";
    };

function rejected(
  code: Exclude<BoringLogStudioProjectionResult, { readonly accepted: true }>["code"],
): Exclude<BoringLogStudioProjectionResult, { readonly accepted: true }> {
  return Object.freeze({ accepted: false, code });
}

function scalar(content: OverrideRenderContentState): string | number | null {
  if (content.kind === "value") {
    return typeof content.value === "string" || typeof content.value === "number"
      ? content.value
      : null;
  }
  if (content.kind === "zero") return 0;
  if (content.kind === "empty-string") return "";
  return null;
}

function runtimeArray(input: unknown): boolean {
  return Array.isArray(input);
}

function humanizeTokenId(tokenId: string): string {
  return tokenId
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/[-_]+/gu, " ")
    .replace(/^./u, (character) => character.toUpperCase());
}

function projectDataLineSymbol(
  symbol: BoringLogLineSymbol,
  visualTokens: Readonly<Record<string, string>>,
): BoringLogStudioDataLineSymbol {
  return Object.freeze({
    strokeToken: symbol.strokeToken,
    strokeColor: visualTokens[symbol.strokeToken]!,
    strokeWidthMpt: symbol.strokeWidthMpt,
    dashMpt: Object.freeze([...symbol.dashMpt]),
  });
}

function projectDataPointSymbol(
  symbol: BoringLogPointSymbol,
  visualTokens: Readonly<Record<string, string>>,
): BoringLogStudioDataPointSymbol {
  return Object.freeze({
    shape: symbol.shape,
    sizeMpt: symbol.sizeMpt,
    fillToken: symbol.fillToken,
    fillColor: symbol.fillToken === null ? null : visualTokens[symbol.fillToken]!,
    strokeToken: symbol.strokeToken,
    strokeColor: visualTokens[symbol.strokeToken]!,
    strokeWidthMpt: symbol.strokeWidthMpt,
  });
}

function projectPageSetup(template: BoringLogLayoutJobInput["template"]): BoringLogStudioPageSetup {
  const page = template.page;
  const preset =
    page.paperPreset ??
    ((page.widthMpt === 612_000 && page.heightMpt === 792_000) ||
    (page.widthMpt === 792_000 && page.heightMpt === 612_000)
      ? "letter"
      : (page.widthMpt === 595_276 && page.heightMpt === 841_890) ||
          (page.widthMpt === 841_890 && page.heightMpt === 595_276)
        ? "a4"
        : "custom");
  const minimumXMpt = Math.min(...template.regions.map(({ xMpt }) => xMpt));
  const maximumRightMpt = Math.max(
    ...template.regions.map(({ xMpt, widthMpt }) => xMpt + widthMpt),
  );
  const minimumYMpt = Math.min(...template.regions.map(({ yMpt }) => yMpt));
  const maximumBottomMpt = Math.max(
    ...template.regions.map(({ yMpt, heightMpt }) => yMpt + heightMpt),
  );
  const margins =
    page.marginsMpt ??
    Object.freeze({
      topMpt: minimumYMpt,
      rightMpt: page.widthMpt - maximumRightMpt,
      bottomMpt: page.heightMpt - maximumBottomMpt,
      leftMpt: minimumXMpt,
    });
  return Object.freeze({
    paperPreset: preset,
    orientation: page.orientation,
    widthMpt: page.widthMpt,
    heightMpt: page.heightMpt,
    marginsMpt: Object.freeze({ ...margins }),
  });
}

function sceneProvenance(
  projection: OverrideRenderDatasetProjection,
  value: OverrideRenderDatasetProjection["values"][number],
): BoringLogValueProvenance {
  const source = value.sourceOriginal.provenance;
  if (source.provenanceClass !== "source") throw new Error("SOURCE_PROVENANCE");
  const original = Object.freeze({
    provenanceClass: "source" as const,
    sourceContextIdentity: source.sourceContextIdentity,
    sourceProjectIdentity: projection.sourceProjectIdentity,
    sourceEntityIdentity: source.entityIdentity,
    sourceFieldIdentity: source.fieldIdentity,
    sourceContractRevision: "bld-026-synthetic-source-snapshot-v1",
  });
  const effective = value.effectiveDisplay.provenance;
  return effective.provenanceClass === "source"
    ? original
    : Object.freeze({
        provenanceClass: "effective-override" as const,
        original,
        overrideIdentity: effective.presentationOverrideIdentity,
        overrideRevision: effective.overrideRevision,
        transformation: "replace-display-value" as const,
      });
}

function sourceProvenance(provenance: BoringLogValueProvenance): BoringLogSourceProvenance {
  return provenance.provenanceClass === "source" ? provenance : provenance.original;
}

function hasDynamicTextToken(value: string): boolean {
  const parsed = parseDynamicTextTemplate(value);
  return parsed.accepted && parsed.value.some(({ kind }) => kind === "variable");
}

function dynamicTextValue(
  identifier: string,
  originalText: string,
  effectiveText: string,
  provenance: BoringLogSourceProvenance,
  workingRevision: number,
): DynamicTextVariableValue {
  const original = Object.freeze({ text: originalText, provenance });
  return Object.freeze({
    identifier,
    original,
    effective:
      originalText === effectiveText
        ? original
        : Object.freeze({
            text: effectiveText,
            provenance: Object.freeze({
              provenanceClass: "effective-override" as const,
              original: provenance,
              overrideIdentity: `urn:rsrender:dynamic-text:${identifier}`,
              overrideRevision: Math.max(1, workingRevision),
              transformation: "replace-display-value" as const,
            }),
          }),
  });
}

function boringLogDynamicTextValues(
  sourceJob: BoringLogLayoutJobInput,
  effectiveJob: BoringLogLayoutJobInput,
  workingRevision: number,
): readonly DynamicTextVariableValue[] {
  const source = sourceJob.document;
  const effective = effectiveJob.document;
  const provenance = sourceProvenance(source.metadata.provenance);
  const fields = [
    ["project_name", source.metadata.projectName, effective.metadata.projectName],
    ["project_number", source.metadata.projectNumber, effective.metadata.projectNumber],
    ["client_name", source.metadata.clientName, effective.metadata.clientName],
    ["project_location", source.metadata.location, effective.metadata.location],
    ["boring_name", source.metadata.documentTitle, effective.metadata.documentTitle],
    ["exploration_id", source.identity.explorationId, effective.identity.explorationId],
    ["coordinates", source.metadata.coordinates, effective.metadata.coordinates],
    ["coordinate_datum", source.metadata.coordinateDatum, effective.metadata.coordinateDatum],
    [
      "ground_elevation_ft",
      String(source.metadata.groundElevationFt),
      String(effective.metadata.groundElevationFt),
    ],
    ["elevation_datum", source.metadata.elevationDatum, effective.metadata.elevationDatum],
    [
      "total_depth_ft",
      String(source.metadata.totalDepthFt),
      String(effective.metadata.totalDepthFt),
    ],
    [
      "completion_depth_ft",
      String(source.metadata.completionDepthFt),
      String(effective.metadata.completionDepthFt),
    ],
    ["drilled_date", source.metadata.drilledDate, effective.metadata.drilledDate],
    ["boring_method", source.metadata.boringMethod, effective.metadata.boringMethod],
    ["hole_diameter", source.metadata.holeDiameter, effective.metadata.holeDiameter],
    ["rig_driller", source.metadata.rigDriller, effective.metadata.rigDriller],
    ["hammer_type", source.metadata.hammerType, effective.metadata.hammerType],
    ["hammer_drop", source.metadata.hammerDrop, effective.metadata.hammerDrop],
    ["hammer_efficiency", source.metadata.hammerEfficiency, effective.metadata.hammerEfficiency],
    ["logged_by", source.metadata.loggedBy, effective.metadata.loggedBy],
    ["checked_by", source.metadata.checkedBy, effective.metadata.checkedBy],
    [
      "groundwater_summary",
      source.metadata.groundwaterSummary,
      effective.metadata.groundwaterSummary,
    ],
    ["company_name", source.metadata.companyName, effective.metadata.companyName],
    [
      "company_contact",
      source.metadata.companyContactSubtitle,
      effective.metadata.companyContactSubtitle,
    ],
    ["sheet_label", source.metadata.sheetLabel, effective.metadata.sheetLabel],
  ] as const;
  return Object.freeze(
    fields.map(([identifier, originalText, effectiveText]) =>
      dynamicTextValue(identifier, originalText, effectiveText, provenance, workingRevision),
    ),
  );
}

function mergedBoringLogDynamicText(
  sourceJob: BoringLogLayoutJobInput,
  effectiveJob: BoringLogLayoutJobInput,
  workingRevision: number,
): Readonly<{
  readonly catalog: typeof boringLogDynamicTextCatalog;
  readonly values: readonly DynamicTextVariableValue[];
}> {
  const existing = sourceJob.dynamicText;
  const standardValues = boringLogDynamicTextValues(sourceJob, effectiveJob, workingRevision);
  if (existing === undefined) {
    return Object.freeze({ catalog: boringLogDynamicTextCatalog, values: standardValues });
  }
  const existingIdentifiers = new Set(
    existing.catalog.definitions.map(({ identifier }) => identifier),
  );
  const definitions = [
    ...existing.catalog.definitions,
    ...boringLogDynamicTextCatalog.definitions.filter(
      ({ identifier }) => !existingIdentifiers.has(identifier),
    ),
  ].map((definition, index) => Object.freeze({ ...definition, order: (index + 1) * 10 }));
  const existingValueIdentifiers = new Set(existing.values.map(({ identifier }) => identifier));
  return Object.freeze({
    catalog: Object.freeze({
      schemaVersion: boringLogDynamicTextCatalog.schemaVersion,
      definitions: Object.freeze(definitions),
    }),
    values: Object.freeze([
      ...existing.values,
      ...standardValues.filter(({ identifier }) => !existingValueIdentifiers.has(identifier)),
    ]),
  });
}

export function prepareBoringLogStudioProjection(
  input: Readonly<{
    readonly layoutJob: BoringLogLayoutJobInput;
    readonly bindings: readonly SyntheticBoringLogEditableBinding[];
    readonly dataset: OverrideRenderDatasetProjection;
  }>,
): BoringLogStudioProjectionPreparationResult {
  try {
    if (
      typeof input !== "object" ||
      input === null ||
      !runtimeArray(input.bindings) ||
      typeof input.dataset !== "object" ||
      input.dataset === null
    ) {
      return rejected("BORING_LOG_STUDIO_CONFIGURATION_INVALID");
    }
    const jobInput = validateBoringLogLayoutJobInput(input.layoutJob);
    if (!jobInput.accepted) return rejected("BORING_LOG_STUDIO_CONFIGURATION_INVALID");
    const valuesByIdentity = new Map(
      input.dataset.values.map((value) => [value.sourceFieldIdentity, value]),
    );
    let metadata = jobInput.value.document.metadata;
    let intervals = jobInput.value.document.lithologyIntervals;
    let samples = jobInput.value.document.samples;
    let remarks = jobInput.value.document.remarks;
    const template = jobInput.value.template;
    const provenanceByNode = new Map<string, BoringLogValueProvenance>();
    const setNodeProvenance = (
      semanticId: string,
      role: string,
      provenance: BoringLogValueProvenance,
    ): void => {
      provenanceByNode.set(`${semanticId}\u0000${role}`, provenance);
    };
    const editableValues: BoringLogStudioEditableValue[] = [];
    for (const binding of input.bindings) {
      const value = valuesByIdentity.get(binding.sourceFieldIdentity);
      if (value === undefined || value.sourceEntityIdentity !== binding.sourceEntityIdentity) {
        return rejected("BORING_LOG_STUDIO_EDITABLE_VALUE_INVALID");
      }
      const effective = scalar(value.effectiveDisplay.content);
      if (
        effective === null ||
        (binding.valueType === "string" && typeof effective !== "string") ||
        (binding.valueType === "number" && typeof effective !== "number")
      ) {
        return rejected("BORING_LOG_STUDIO_EDITABLE_VALUE_INVALID");
      }
      const provenance = sceneProvenance(input.dataset, value);
      if (binding.property === "project-name") {
        metadata = { ...metadata, projectName: effective as string, provenance };
        setNodeProvenance(binding.semanticId, "project-metadata-line", provenance);
      } else if (binding.property === "ground-elevation-ft") {
        metadata = { ...metadata, groundElevationFt: effective as number, provenance };
      } else if (binding.property === "elevation-datum") {
        metadata = { ...metadata, elevationDatum: effective as string, provenance };
      } else if (binding.property === "completion-depth-ft") {
        metadata = { ...metadata, completionDepthFt: effective as number, provenance };
      } else if (binding.property === "boring-title") {
        metadata = { ...metadata, documentTitle: effective as string, provenance };
        setNodeProvenance(binding.semanticId, "document-title", provenance);
      } else if (binding.property === "material-description") {
        const id = binding.semanticId.replace(/^lithology:/u, "");
        intervals = intervals.map((interval) =>
          interval.id === id
            ? { ...interval, description: effective as string, provenance }
            : interval,
        );
        setNodeProvenance(binding.semanticId, "material-description-interval", provenance);
      } else if (binding.property === "sample-recovery") {
        const id = binding.semanticId.replace(/^sample:/u, "");
        samples = samples.map((sample) =>
          sample.id === id
            ? { ...sample, recoveryPercent: effective as number, provenance }
            : sample,
        );
        setNodeProvenance(binding.semanticId, "sample-recovery", provenance);
      } else if (binding.property === "remark-text") {
        const id = binding.semanticId.replace(/^remark:/u, "");
        remarks = remarks.map((remark) =>
          remark.id === id ? { ...remark, text: effective as string } : remark,
        );
        setNodeProvenance(binding.semanticId, "remark-interval", provenance);
      } else if (binding.property === "lithology-pattern-style") {
        const pattern = effective as string;
        if (
          ![
            "reference-varied-patterns",
            "silt-horizontal-dash",
            "sand-dot-ring",
            "gravel-dot-ring",
          ].includes(pattern)
        ) {
          return rejected("BORING_LOG_STUDIO_EDITABLE_VALUE_INVALID");
        }
        if (pattern !== "reference-varied-patterns") {
          intervals = intervals.map((interval) => ({ ...interval, patternId: pattern }));
          for (const interval of intervals) {
            setNodeProvenance(`lithology:${interval.id}`, "lithology-pattern-interval", provenance);
          }
        }
      } else if (binding.property === "description-column-width-mpt") {
        if (!Number.isSafeInteger(effective)) {
          return rejected("BORING_LOG_STUDIO_EDITABLE_VALUE_INVALID");
        }
        // Retain the historic source field for source-original compatibility only. Production
        // geometry is owned by the embedded template and the BLD-039 divider command.
      } else {
        return rejected("BORING_LOG_STUDIO_CONFIGURATION_INVALID");
      }
      let application: BoringLogStudioEditableValue["application"];
      if (value.application.kind === "source") {
        application = value.application;
      } else {
        const presentationOverrideIdentity = value.application.presentationOverrideIdentity;
        const override = input.dataset.overrides.find(
          (candidate) =>
            candidate.presentationOverrideIdentity === presentationOverrideIdentity &&
            candidate.targetSourceFieldIdentity === value.sourceFieldIdentity,
        );
        if (override === undefined) {
          return rejected("BORING_LOG_STUDIO_EDITABLE_VALUE_INVALID");
        }
        application = Object.freeze({
          kind: "display-value-override" as const,
          presentationOverrideIdentity: override.presentationOverrideIdentity,
          localOverrideIdentity: override.localOverrideIdentity,
          overrideRevision: override.overrideRevision,
        });
      }
      editableValues.push(
        Object.freeze({
          semanticId: binding.semanticId,
          property: binding.property,
          sourceFieldIdentity: binding.sourceFieldIdentity,
          sourceEntityIdentity: binding.sourceEntityIdentity,
          sourceBaselineValueDigest: value.sourceBaselineValueDigest,
          valueType: binding.valueType,
          unit: binding.unit,
          sourceOriginal: value.sourceOriginal,
          effectiveDisplay: value.effectiveDisplay,
          application,
        }),
      );
    }
    const dynamicTextElementIds = new Set<string>(jobInput.value.dynamicText?.elementIds ?? []);
    for (const editable of editableValues) {
      if (
        editable.application.kind !== "display-value-override" ||
        editable.valueType !== "string"
      ) {
        continue;
      }
      const effectiveText = scalar(editable.effectiveDisplay.content);
      if (typeof effectiveText !== "string" || !hasDynamicTextToken(effectiveText)) continue;
      if (editable.property === "project-name") {
        dynamicTextElementIds.add("node:header-project-metadata:2:value");
      } else if (editable.property === "boring-title") {
        dynamicTextElementIds.add("node:header-title");
      } else if (editable.property === "material-description") {
        dynamicTextElementIds.add(
          `node:lithology:${editable.semanticId.replace(/^lithology:/u, "")}:description`,
        );
      } else if (editable.property === "remark-text") {
        dynamicTextElementIds.add(`node:remark:${editable.semanticId.replace(/^remark:/u, "")}`);
      }
    }
    for (const column of template.columns) {
      if (column.heading !== undefined && hasDynamicTextToken(column.heading)) {
        dynamicTextElementIds.add(`node:${column.id}:heading`);
      }
    }
    const effectiveDocument = {
      ...jobInput.value.document,
      metadata,
      lithologyIntervals: intervals,
      samples,
      remarks,
    };
    const effectiveJobWithoutDynamicText: BoringLogLayoutJobInput = {
      ...jobInput.value,
      inputRevision: jobInput.value.inputRevision + input.dataset.workingRevision,
      document: effectiveDocument,
      template,
    };
    const dynamicText = mergedBoringLogDynamicText(
      jobInput.value,
      effectiveJobWithoutDynamicText,
      input.dataset.workingRevision,
    );
    const effectiveJobCandidate: BoringLogLayoutJobInput = {
      ...effectiveJobWithoutDynamicText,
      ...(dynamicTextElementIds.size === 0
        ? {}
        : {
            dynamicText: {
              catalog: dynamicText.catalog,
              values: dynamicText.values,
              elementIds: Object.freeze([...dynamicTextElementIds]),
            },
          }),
    };
    const effectiveJob = validateBoringLogLayoutJobInput(effectiveJobCandidate);
    if (!effectiveJob.accepted) return rejected("BORING_LOG_STUDIO_LAYOUT_REJECTED");
    const resolvedEffectiveDocument = effectiveJob.value.document;
    const effectiveMetadata = resolvedEffectiveDocument.metadata;
    const effectiveReferenceDepthRange = resolvedEffectiveDocument.referenceDepthRange;
    const effectiveDepthTransform = effectiveJob.value.template.depthTransform;
    const nValueAxis = effectiveDocument.dataTrack.axes.find(({ id }) => id === "axis-n-value");
    const dataSummary: BoringLogStudioDataSummary = Object.freeze({
      projectName: effectiveMetadata.projectName,
      groundElevationFt: effectiveMetadata.groundElevationFt,
      elevationDatum: effectiveMetadata.elevationDatum,
      referenceStartFt: effectiveReferenceDepthRange.startFt,
      referenceEndFt: effectiveReferenceDepthRange.endFt,
      totalDepthFt: effectiveMetadata.totalDepthFt,
      completionDepthFt: effectiveMetadata.completionDepthFt,
      depthScaleMptPerFoot: effectiveDepthTransform.mptPerFoot,
      depthIntervalFt: effectiveDepthTransform.depthEndFt - effectiveDepthTransform.depthStartFt,
      nValueGraphMaximum: nValueAxis?.maximum ?? null,
    });
    const attributeRecords = projectBoringLogAttributeRecords({
      sourceDocument: jobInput.value.document,
      effectiveDocument: resolvedEffectiveDocument,
      editableValues,
    });
    const prepared = prepareBoringLogLayout(effectiveJob.value);
    if (!prepared.accepted) return rejected("BORING_LOG_STUDIO_LAYOUT_REJECTED");
    const lithologyAppearanceStates = resolveBoringLogLithologyAppearances(effectiveJob.value).map(
      (appearance) => {
        const interval = effectiveJob.value.document.lithologyIntervals.find(
          ({ id }) => id === appearance.intervalId,
        )!;
        return Object.freeze({
          semanticId: `lithology:${appearance.intervalId}`,
          boringLogIdentity: appearance.boringLogIdentity,
          intervalId: appearance.intervalId,
          classification: interval.classification,
          mappedClassificationKey: appearance.mappedClassificationKey,
          sourceMaterialFillToken: appearance.sourceMaterialFillToken,
          sourceMaterialFillColor:
            effectiveJob.value.template.visualTokens[appearance.sourceMaterialFillToken]!,
          sourcePatternId: appearance.sourcePatternId,
          effectiveMaterialFillToken: appearance.materialFillToken,
          effectiveMaterialFillColor:
            effectiveJob.value.template.visualTokens[appearance.materialFillToken]!,
          effectivePatternId: appearance.patternId,
          materialFillApplication: appearance.materialFillApplication.kind,
          patternApplication: appearance.patternApplication.kind,
        });
      },
    );
    const visualTokens = effectiveJob.value.template.visualTokens;
    const visualTokenIds = Object.keys(visualTokens);
    const dataLayerSymbologyStates = effectiveDocument.dataTrack.layers.map((layer) => {
      const legacyLegendSymbol =
        layer.kind === "numeric-range"
          ? "open-circle-range"
          : layer.glyph === "filled-square"
            ? "filled-square-line"
            : "open-triangle-line";
      const legacyLegendItem = effectiveDocument.legend.find(
        ({ symbol }) => symbol === legacyLegendSymbol,
      );
      const persistedOverride = effectiveJob.value.template.dataLayerSymbologyOverrides?.find(
        ({ layerId }) => layerId === layer.id,
      );
      const resolved = resolveBoringLogDataLayerSymbology({
        layer,
        legendLabel: legacyLegendItem?.label ?? layer.id,
        visualTokenIds,
        ...(persistedOverride === undefined ? {} : { override: persistedOverride }),
      });
      if (!resolved.accepted) throw new Error(resolved.code);
      const symbology = resolved.value;
      return Object.freeze({
        semanticId: `data-layer:${layer.id}`,
        layerId: layer.id,
        label: symbology.legend.label,
        kind: layer.kind,
        source: symbology.source,
        visible: symbology.visible,
        order: symbology.order,
        line: symbology.line === null ? null : projectDataLineSymbol(symbology.line, visualTokens),
        point:
          symbology.point === null ? null : projectDataPointSymbol(symbology.point, visualTokens),
        range:
          symbology.range === null
            ? null
            : Object.freeze({
                line: projectDataLineSymbol(symbology.range.line, visualTokens),
                firstEndpoint: projectDataPointSymbol(symbology.range.firstEndpoint, visualTokens),
                secondEndpoint: projectDataPointSymbol(
                  symbology.range.secondEndpoint,
                  visualTokens,
                ),
              }),
        legend: Object.freeze({
          visible: persistedOverride?.legend.visible ?? true,
          effectiveVisible: symbology.legend.visible,
          label: symbology.legend.label,
        }),
      });
    });
    const excludedOverrideStyleIds = new Set(
      effectiveJob.value.template.bindings
        .filter(
          ({ path }) =>
            path === "presentation.text-occurrence-style" ||
            path === "presentation.text-column-style",
        )
        .map(({ styleId }) => styleId),
    );
    return Object.freeze({
      accepted: true as const,
      preparation: Object.freeze({
        layout: prepared.value,
        projection: Object.freeze({
          schema: "rsrender.boring-log-studio-projection.v2" as const,
          documentIdentity: input.dataset.documentId,
          ownerGeneration: input.dataset.ownerGeneration,
          workingRevision: input.dataset.workingRevision,
          durableRevision: input.dataset.durableRevision,
          dirty: input.dataset.dirty,
          canUndo: input.dataset.canUndo,
          canRedo: input.dataset.canRedo,
          dataSummary,
          pageSetup: projectPageSetup(effectiveJob.value.template),
          attributeRecords,
          editableValues: Object.freeze(editableValues),
          guides: Object.freeze([...(effectiveJob.value.template.guides ?? [])]),
          columnResizeConstraints: Object.freeze(
            effectiveJob.value.template.columns.map((column) =>
              Object.freeze({
                columnId: column.id,
                minimumWidthMpt: boringLogDefaultColumnMinimumWidthMpt(column.role),
                widthPinned: false,
              }),
            ),
          ),
          providerColumnCatalog: Object.freeze(
            rsLogProviderAuthoringCatalog.fields.map((field) =>
              Object.freeze({
                fieldId: field.fieldId,
                label: field.label,
                description: field.description,
                valueType: field.valueType,
                unit: field.unit,
                supportedTargetRoles: Object.freeze(
                  field.supportedTargetRoles.filter(
                    (
                      role,
                    ): role is BoringLogStudioProviderColumnField["supportedTargetRoles"][number] =>
                      [
                        "interval-text-column",
                        "lithology-pattern-column",
                        "numeric-value-column",
                        "point-text-column",
                        "remarks-column",
                      ].includes(role),
                  ),
                ),
                availability: Object.freeze({
                  state: field.availability.state,
                  reason: field.availability.reason,
                }),
              }),
            ),
          ),
          regionResizeConstraints: Object.freeze({
            minimumHeaderHeightMpt: 60_000,
            minimumDepthBodyHeightMpt: 300_000,
            minimumFooterHeightMpt: 72_000,
          }),
          textTemplateScopeSummary: Object.freeze({
            authoredStyleCount: effectiveJob.value.template.styles.filter(
              ({ id }) => !excludedOverrideStyleIds.has(id),
            ).length,
            excludedOverrideStyleCount: effectiveJob.value.template.styles.filter(({ id }) =>
              excludedOverrideStyleIds.has(id),
            ).length,
          }),
          lithologyAppearanceStates: Object.freeze(lithologyAppearanceStates),
          lithologyPatternOptions: Object.freeze(
            effectiveJob.value.template.vectorPatterns.map(({ id, kind }) =>
              Object.freeze({ patternId: id, kind }),
            ),
          ),
          dataLayerSymbologyStates: Object.freeze(dataLayerSymbologyStates),
          visualTokenOptions: Object.freeze(
            Object.entries(visualTokens)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([tokenId, color]) =>
                Object.freeze({ tokenId, color, label: humanizeTokenId(tokenId) }),
              ),
          ),
        }),
        provenanceEntries: Object.freeze(
          [...provenanceByNode.entries()].map(([key, provenance]) =>
            Object.freeze({ key, provenance }),
          ),
        ),
        textOccurrenceStyleEntries: Object.freeze(
          effectiveJob.value.template.bindings
            .filter(({ path }) => path === "presentation.text-occurrence-style")
            .map(({ elementId, styleId }) => Object.freeze({ nodeId: elementId, styleId })),
        ),
        textOccurrencePresentationEntries: Object.freeze(
          [
            ...new Set(
              effectiveJob.value.template.bindings
                .filter(({ path }) =>
                  [
                    "presentation.text-occurrence-style",
                    "presentation.text-occurrence-layout",
                  ].includes(path),
                )
                .map(({ elementId }) => elementId),
            ),
          ]
            .sort()
            .map((nodeId) =>
              Object.freeze({
                nodeId,
                style: effectiveJob.value.template.bindings.some(
                  ({ elementId, path }) =>
                    elementId === nodeId && path === "presentation.text-occurrence-style",
                )
                  ? ("occurrence" as const)
                  : ("inherited" as const),
                layout: effectiveJob.value.template.bindings.some(
                  ({ elementId, path }) =>
                    elementId === nodeId && path === "presentation.text-occurrence-layout",
                )
                  ? ("occurrence" as const)
                  : ("inherited" as const),
              }),
            ),
        ),
      }),
    });
  } catch {
    return rejected("BORING_LOG_STUDIO_CONFIGURATION_INVALID");
  }
}

export function completeBoringLogStudioProjection(
  preparation: BoringLogStudioProjectionPreparation,
  textResults: unknown,
): BoringLogStudioProjectionResult {
  try {
    const resolved = resolveBoringLogPageScene(preparation.layout, textResults);
    if (!resolved.accepted) return rejected("BORING_LOG_STUDIO_SCENE_REJECTED");
    const gated = applyBoringLogTextMeasurements(resolved.value, textResults);
    if (!gated.accepted) return rejected("BORING_LOG_STUDIO_TEXT_REJECTED");
    const provenanceByNode = new Map(
      preparation.provenanceEntries.map(({ key, provenance }) => [key, provenance]),
    );
    const occurrenceStyles = new Map(
      preparation.textOccurrenceStyleEntries.map(({ nodeId, styleId }) => [nodeId, styleId]),
    );
    const sceneWithExactProvenance = {
      ...gated.scene,
      pages: gated.scene.pages.map((page) => ({
        ...page,
        nodes: page.nodes.map((node) => {
          const valueProvenance =
            provenanceByNode.get(`${node.semanticId}\u0000${node.role}`) ??
            provenanceByNode.get(`${node.semanticId}\u0000*`) ??
            node.provenance;
          const styleOverrideIdentity = occurrenceStyles.get(node.id);
          return {
            ...node,
            provenance:
              styleOverrideIdentity !== undefined && valueProvenance?.provenanceClass === "source"
                ? Object.freeze({
                    provenanceClass: "effective-override" as const,
                    original: valueProvenance,
                    overrideIdentity: styleOverrideIdentity,
                    overrideRevision: 1,
                    transformation: "replace-style-token" as const,
                  })
                : valueProvenance,
          };
        }),
      })),
    };
    const scene = validateResolvedBoringLogPageScene(sceneWithExactProvenance);
    if (!scene.accepted) return rejected("BORING_LOG_STUDIO_SCENE_REJECTED");
    const presentationByNode = new Map(
      preparation.textOccurrencePresentationEntries.map((entry) => [entry.nodeId, entry]),
    );
    const textOccurrencePresentationStates = scene.value.pages
      .flatMap(({ nodes }) => nodes)
      .filter((node) => node.kind === "text")
      .map((node) => {
        const entry = presentationByNode.get(node.id);
        return Object.freeze({
          occurrenceNodeId: node.id,
          semanticId: node.semanticId,
          typography: entry?.style ?? ("inherited" as const),
          layout: entry?.layout ?? ("inherited" as const),
        });
      });
    return Object.freeze({
      accepted: true,
      projection: Object.freeze({
        ...preparation.projection,
        textOccurrencePresentationStates: Object.freeze(textOccurrencePresentationStates),
        scene: scene.value,
      }),
    });
  } catch {
    return rejected("BORING_LOG_STUDIO_CONFIGURATION_INVALID");
  }
}
