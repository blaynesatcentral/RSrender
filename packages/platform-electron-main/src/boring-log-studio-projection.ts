import {
  validateBoringLogLayoutJobInput,
  validateResolvedBoringLogPageScene,
  type BoringLogLayoutJobInput,
  type BoringLogValueProvenance,
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
  resolveBoringLogPageScene,
  type BoringLogLayoutPreparation,
} from "@rsrender/scene";

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
      };
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
  readonly editableValues: readonly BoringLogStudioEditableValue[];
  readonly guides: NonNullable<BoringLogLayoutJobInput["template"]["guides"]>;
  readonly columnResizeConstraints: readonly Readonly<{
    readonly columnId: string;
    readonly minimumWidthMpt: number;
    readonly widthPinned: boolean;
  }>[];
  readonly textTemplateScopeSummary: Readonly<{
    readonly authoredStyleCount: number;
    readonly excludedOverrideStyleCount: number;
  }>;
  readonly textOccurrencePresentationStates: readonly BoringLogStudioTextOccurrencePresentationState[];
  readonly scene: ResolvedBoringLogPageScene;
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
    let template = jobInput.value.template;
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
        setNodeProvenance(binding.semanticId, "*", provenance);
        if (pattern !== "reference-varied-patterns") {
          intervals = intervals.map((interval) => ({ ...interval, patternId: pattern }));
          for (const interval of intervals) {
            setNodeProvenance(`lithology:${interval.id}`, "lithology-pattern-interval", provenance);
          }
        }
      } else {
        const widthMpt = effective as number;
        if (!Number.isSafeInteger(widthMpt) || widthMpt < 100_000 || widthMpt > 230_000) {
          return rejected("BORING_LOG_STUDIO_EDITABLE_VALUE_INVALID");
        }
        const original = template.columns.find(({ role }) => role === "material-description");
        if (original === undefined) return rejected("BORING_LOG_STUDIO_LAYOUT_REJECTED");
        const delta = widthMpt - original.widthMpt;
        template = {
          ...template,
          columns: template.columns.map((column) => {
            if (column.role === "material-description") {
              return { ...column, widthMpt: widthMpt as typeof column.widthMpt };
            }
            if (column.role === "remarks") {
              return {
                ...column,
                xMpt: (column.xMpt + delta) as typeof column.xMpt,
                widthMpt: (column.widthMpt - delta) as typeof column.widthMpt,
              };
            }
            return column.xMpt > original.xMpt
              ? { ...column, xMpt: (column.xMpt + delta) as typeof column.xMpt }
              : column;
          }),
        };
        setNodeProvenance(binding.semanticId, "*", provenance);
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
          application: value.application,
        }),
      );
    }
    const effectiveJob = validateBoringLogLayoutJobInput({
      ...jobInput.value,
      inputRevision: jobInput.value.inputRevision + input.dataset.workingRevision,
      document: {
        ...jobInput.value.document,
        metadata,
        lithologyIntervals: intervals,
        samples,
        remarks,
      },
      template,
    });
    if (!effectiveJob.accepted) return rejected("BORING_LOG_STUDIO_LAYOUT_REJECTED");
    const prepared = prepareBoringLogLayout(effectiveJob.value);
    if (!prepared.accepted) return rejected("BORING_LOG_STUDIO_LAYOUT_REJECTED");
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
          textTemplateScopeSummary: Object.freeze({
            authoredStyleCount: effectiveJob.value.template.styles.filter(
              ({ id }) => !excludedOverrideStyleIds.has(id),
            ).length,
            excludedOverrideStyleCount: effectiveJob.value.template.styles.filter(({ id }) =>
              excludedOverrideStyleIds.has(id),
            ).length,
          }),
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
