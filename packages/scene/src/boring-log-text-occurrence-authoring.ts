import {
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
  validateBoringLogTextOccurrenceStyleOverride,
  type BoringLogLayoutJobInput,
  type BoringLogTextOccurrenceStyleOverride,
} from "@rsrender/contracts";

import {
  prepareBoringLogLayout,
  type BoringLogLayoutEngineResult,
  type BoringLogLayoutPreparation,
} from "./boring-log-layout-engine.js";

export const boringLogTextOccurrenceAuthoringRevision =
  "bld-037-text-occurrence-authoring-v1" as const;

export type BoringLogTextOccurrenceAuthoringResult =
  | {
      readonly accepted: true;
      readonly job: BoringLogLayoutJobInput;
      readonly overrides: readonly BoringLogTextOccurrenceStyleOverride[];
    }
  | {
      readonly accepted: false;
      readonly code:
        | "BORING_LOG_TEXT_OCCURRENCE_JOB_REJECTED"
        | "BORING_LOG_TEXT_OCCURRENCE_OVERRIDE_REJECTED"
        | "BORING_LOG_TEXT_OCCURRENCE_DUPLICATE"
        | "BORING_LOG_TEXT_OCCURRENCE_SCOPE_MISMATCH"
        | "BORING_LOG_TEXT_OCCURRENCE_BASE_STYLE_MISSING"
        | "BORING_LOG_TEXT_OCCURRENCE_STYLE_COLLISION";
    };

function rejected(
  code: Exclude<BoringLogTextOccurrenceAuthoringResult, { readonly accepted: true }>["code"],
): Exclude<BoringLogTextOccurrenceAuthoringResult, { readonly accepted: true }> {
  return Object.freeze({ accepted: false, code });
}

export function applyBoringLogTextOccurrenceStyles(
  jobInput: unknown,
  overrideInputs: unknown,
): BoringLogTextOccurrenceAuthoringResult {
  const job = validateBoringLogLayoutJobInput(jobInput);
  if (!job.accepted) return rejected("BORING_LOG_TEXT_OCCURRENCE_JOB_REJECTED");
  if (!Array.isArray(overrideInputs)) {
    return rejected("BORING_LOG_TEXT_OCCURRENCE_OVERRIDE_REJECTED");
  }
  const overrides: BoringLogTextOccurrenceStyleOverride[] = [];
  for (const input of overrideInputs) {
    const decoded = validateBoringLogTextOccurrenceStyleOverride(input);
    if (!decoded.accepted) return rejected("BORING_LOG_TEXT_OCCURRENCE_OVERRIDE_REJECTED");
    if (decoded.value.boringLogIdentity !== job.value.document.identity.boringLogId) {
      return rejected("BORING_LOG_TEXT_OCCURRENCE_SCOPE_MISMATCH");
    }
    overrides.push(decoded.value);
  }
  overrides.sort((left, right) => left.occurrenceNodeId.localeCompare(right.occurrenceNodeId));
  if (
    new Set(overrides.map(({ occurrenceNodeId }) => occurrenceNodeId)).size !== overrides.length
  ) {
    return rejected("BORING_LOG_TEXT_OCCURRENCE_DUPLICATE");
  }
  const targetNodeIds = new Set(overrides.map(({ occurrenceNodeId }) => occurrenceNodeId));
  const replacedStyleIds = new Set(
    job.value.template.bindings
      .filter(
        ({ elementId, path }) =>
          path === "presentation.text-occurrence-style" && targetNodeIds.has(elementId),
      )
      .map(({ styleId }) => styleId),
  );
  const bindings = job.value.template.bindings.filter(
    ({ elementId, path }) =>
      path !== "presentation.text-occurrence-style" || !targetNodeIds.has(elementId),
  );
  const retainedStyleIds = new Set(bindings.map(({ styleId }) => styleId));
  const styles = job.value.template.styles.filter(
    ({ id }) => !replacedStyleIds.has(id) || retainedStyleIds.has(id),
  );
  for (const override of overrides) {
    if (!job.value.template.styles.some(({ id }) => id === override.baseStyleId)) {
      return rejected("BORING_LOG_TEXT_OCCURRENCE_BASE_STYLE_MISSING");
    }
    const digest = sha256CanonicalJson(override).slice("sha256:".length, "sha256:".length + 24);
    const styleId = `style-occurrence-${digest}`;
    if (styles.some(({ id }) => id === styleId)) {
      return rejected("BORING_LOG_TEXT_OCCURRENCE_STYLE_COLLISION");
    }
    styles.push(Object.freeze({ id: styleId, ...override.style }));
    bindings.push(
      Object.freeze({
        elementId: override.occurrenceNodeId,
        path: "presentation.text-occurrence-style",
        styleId,
      }),
    );
  }
  const effectiveTemplate = { ...job.value.template, styles, bindings };
  const effective = validateBoringLogLayoutJobInput({
    ...job.value,
    templateDigest: sha256CanonicalJson(effectiveTemplate),
    template: effectiveTemplate,
  });
  return effective.accepted
    ? Object.freeze({ accepted: true, job: effective.value, overrides: Object.freeze(overrides) })
    : rejected("BORING_LOG_TEXT_OCCURRENCE_JOB_REJECTED");
}

export function prepareBoringLogLayoutWithTextOccurrenceStyles(
  jobInput: unknown,
  overrideInputs: unknown,
): BoringLogLayoutEngineResult<BoringLogLayoutPreparation> {
  const authored = applyBoringLogTextOccurrenceStyles(jobInput, overrideInputs);
  if (!authored.accepted) {
    return Object.freeze({
      accepted: false,
      code: "BORING_LOG_LAYOUT_INPUT_REJECTED",
      contractCode: authored.code,
    });
  }
  const prepared = prepareBoringLogLayout(authored.job);
  if (!prepared.accepted) return prepared;
  const measurementIds = new Set(
    prepared.value.textRequests.map(({ measurementId }) => measurementId),
  );
  for (const override of authored.overrides) {
    if (!measurementIds.has(`measure:${override.occurrenceNodeId}`)) {
      return Object.freeze({
        accepted: false,
        code: "BORING_LOG_LAYOUT_INPUT_REJECTED",
        contractCode: "BORING_LOG_TEXT_OCCURRENCE_NOT_FOUND",
      });
    }
  }
  return prepared;
}
