import {
  sha256CanonicalJson,
  validateBoringLogLayoutJobInput,
  validateBoringLogTextOccurrenceLayoutOverride,
  validateBoringLogTextOccurrenceStyleOverride,
  type BoringLogLayoutJobInput,
  type BoringLogTextStyleInput,
  type BoringLogTextOccurrenceLayoutOverride,
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
      readonly layoutOverrides: readonly BoringLogTextOccurrenceLayoutOverride[];
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

export type BoringLogTextOccurrencePresentationResetResult =
  | {
      readonly accepted: true;
      readonly job: BoringLogLayoutJobInput;
      readonly removedStyle: boolean;
      readonly removedLayout: boolean;
    }
  | {
      readonly accepted: false;
      readonly code:
        | "BORING_LOG_TEXT_OCCURRENCE_JOB_REJECTED"
        | "BORING_LOG_TEXT_OCCURRENCE_NOT_FOUND"
        | "BORING_LOG_TEXT_OCCURRENCE_SCOPE_MISMATCH"
        | "BORING_LOG_TEXT_OCCURRENCE_ALREADY_INHERITED";
    };

export type BoringLogTemplateTextProperty = Exclude<keyof BoringLogTextStyleInput, "id">;

export type BoringLogTemplateTextStyleResult =
  | {
      readonly accepted: true;
      readonly job: BoringLogLayoutJobInput;
      readonly affectedStyleCount: number;
      readonly excludedStyleCount: number;
    }
  | {
      readonly accepted: false;
      readonly code:
        | "BORING_LOG_TEMPLATE_TEXT_JOB_REJECTED"
        | "BORING_LOG_TEMPLATE_TEXT_STYLE_REJECTED"
        | "BORING_LOG_TEMPLATE_TEXT_PROPERTY_MASK_REJECTED"
        | "BORING_LOG_TEMPLATE_TEXT_NO_CHANGE";
    };

function rejected(
  code: Exclude<BoringLogTextOccurrenceAuthoringResult, { readonly accepted: true }>["code"],
): Exclude<BoringLogTextOccurrenceAuthoringResult, { readonly accepted: true }> {
  return Object.freeze({ accepted: false, code });
}

function resetRejected(
  code: Exclude<
    BoringLogTextOccurrencePresentationResetResult,
    { readonly accepted: true }
  >["code"],
): Exclude<BoringLogTextOccurrencePresentationResetResult, { readonly accepted: true }> {
  return Object.freeze({ accepted: false, code });
}

function templateTextRejected(
  code: Exclude<BoringLogTemplateTextStyleResult, { readonly accepted: true }>["code"],
): Exclude<BoringLogTemplateTextStyleResult, { readonly accepted: true }> {
  return Object.freeze({ accepted: false, code });
}

const templateTextProperties: readonly BoringLogTemplateTextProperty[] = Object.freeze([
  "fontFamilyId",
  "fontStyle",
  "fontSizeMpt",
  "fontWeight",
  "lineHeightMpt",
  "letterSpacingMpt",
  "wordSpacingMpt",
  "paragraphSpacingMpt",
  "color",
  "textDecoration",
]);
const requiredTemplateTextProperties = templateTextProperties.filter(
  (property) => property !== "fontStyle",
);

export function applyBoringLogTemplateTextStyleProperties(
  jobInput: unknown,
  styleInput: unknown,
  propertyMaskInput: unknown,
): BoringLogTemplateTextStyleResult {
  const job = validateBoringLogLayoutJobInput(jobInput);
  if (!job.accepted) return templateTextRejected("BORING_LOG_TEMPLATE_TEXT_JOB_REJECTED");
  if (
    typeof styleInput !== "object" ||
    styleInput === null ||
    Array.isArray(styleInput) ||
    Reflect.ownKeys(styleInput).some(
      (key) => typeof key !== "string" || !templateTextProperties.includes(key as never),
    ) ||
    requiredTemplateTextProperties.some((property) => !Object.hasOwn(styleInput, property))
  ) {
    return templateTextRejected("BORING_LOG_TEMPLATE_TEXT_STYLE_REJECTED");
  }
  if (
    !Array.isArray(propertyMaskInput) ||
    propertyMaskInput.length < 1 ||
    propertyMaskInput.length > templateTextProperties.length ||
    propertyMaskInput.some(
      (property) =>
        typeof property !== "string" ||
        !templateTextProperties.includes(property as BoringLogTemplateTextProperty),
    ) ||
    new Set(propertyMaskInput).size !== propertyMaskInput.length ||
    propertyMaskInput.includes("fontSizeMpt") !== propertyMaskInput.includes("lineHeightMpt")
  ) {
    return templateTextRejected("BORING_LOG_TEMPLATE_TEXT_PROPERTY_MASK_REJECTED");
  }
  const propertyMask = propertyMaskInput as readonly BoringLogTemplateTextProperty[];
  const style = styleInput as Readonly<Record<BoringLogTemplateTextProperty, unknown>>;
  const excludedStyleIds = new Set(
    job.value.template.bindings
      .filter(
        ({ path }) =>
          path === "presentation.text-occurrence-style" ||
          path === "presentation.text-column-style",
      )
      .map(({ styleId }) => styleId),
  );
  const styles = job.value.template.styles.map((candidate) => {
    if (excludedStyleIds.has(candidate.id)) return candidate;
    return Object.freeze({
      ...candidate,
      ...Object.fromEntries(propertyMask.map((property) => [property, style[property]] as const)),
    });
  });
  const template = { ...job.value.template, styles };
  const effective = validateBoringLogLayoutJobInput({
    ...job.value,
    templateDigest: sha256CanonicalJson(template),
    template,
  });
  if (!effective.accepted) {
    return templateTextRejected("BORING_LOG_TEMPLATE_TEXT_STYLE_REJECTED");
  }
  if (effective.value.templateDigest === job.value.templateDigest) {
    return templateTextRejected("BORING_LOG_TEMPLATE_TEXT_NO_CHANGE");
  }
  return Object.freeze({
    accepted: true,
    job: effective.value,
    affectedStyleCount: styles.length - excludedStyleIds.size,
    excludedStyleCount: excludedStyleIds.size,
  });
}

export function clearBoringLogTextOccurrencePresentation(
  jobInput: unknown,
  occurrenceNodeId: unknown,
  semanticId: unknown,
): BoringLogTextOccurrencePresentationResetResult {
  const job = validateBoringLogLayoutJobInput(jobInput);
  if (!job.accepted) return resetRejected("BORING_LOG_TEXT_OCCURRENCE_JOB_REJECTED");
  if (
    typeof occurrenceNodeId !== "string" ||
    occurrenceNodeId.length === 0 ||
    occurrenceNodeId.length > 512 ||
    typeof semanticId !== "string" ||
    semanticId.length === 0 ||
    semanticId.length > 512
  ) {
    return resetRejected("BORING_LOG_TEXT_OCCURRENCE_NOT_FOUND");
  }
  const prepared = prepareBoringLogLayout(job.value);
  if (!prepared.accepted) return resetRejected("BORING_LOG_TEXT_OCCURRENCE_JOB_REJECTED");
  const request = prepared.value.textRequests.find(
    ({ measurementId }) => measurementId === `measure:${occurrenceNodeId}`,
  );
  if (request === undefined) return resetRejected("BORING_LOG_TEXT_OCCURRENCE_NOT_FOUND");
  if (request.sourceIdentity !== semanticId) {
    return resetRejected("BORING_LOG_TEXT_OCCURRENCE_SCOPE_MISMATCH");
  }
  const removablePaths = new Set([
    "presentation.text-occurrence-style",
    "presentation.text-occurrence-layout",
  ]);
  const removedBindings = job.value.template.bindings.filter(
    ({ elementId, path }) => elementId === occurrenceNodeId && removablePaths.has(path),
  );
  if (removedBindings.length === 0) {
    return resetRejected("BORING_LOG_TEXT_OCCURRENCE_ALREADY_INHERITED");
  }
  const bindings = job.value.template.bindings.filter(
    ({ elementId, path }) => !(elementId === occurrenceNodeId && removablePaths.has(path)),
  );
  const retainedResourceIds = new Set(bindings.map(({ styleId }) => styleId));
  const removedStyleIds = new Set(
    removedBindings
      .filter(({ path }) => path === "presentation.text-occurrence-style")
      .map(({ styleId }) => styleId),
  );
  const removedLayoutIds = new Set(
    removedBindings
      .filter(({ path }) => path === "presentation.text-occurrence-layout")
      .map(({ styleId }) => styleId),
  );
  const occurrenceLayouts = (job.value.template.occurrenceLayouts ?? []).filter(
    ({ id }) =>
      !removedLayoutIds.has(id) ||
      retainedResourceIds.has(id) ||
      !id.startsWith("layout-occurrence-"),
  );
  const template = {
    ...job.value.template,
    styles: job.value.template.styles.filter(
      ({ id }) =>
        !removedStyleIds.has(id) ||
        retainedResourceIds.has(id) ||
        !id.startsWith("style-occurrence-"),
    ),
    occurrenceLayouts,
    bindings,
  };
  if (occurrenceLayouts.length === 0) Reflect.deleteProperty(template, "occurrenceLayouts");
  const effective = validateBoringLogLayoutJobInput({
    ...job.value,
    templateDigest: sha256CanonicalJson(template),
    template,
  });
  return effective.accepted
    ? Object.freeze({
        accepted: true,
        job: effective.value,
        removedStyle: removedStyleIds.size > 0,
        removedLayout: removedLayoutIds.size > 0,
      })
    : resetRejected("BORING_LOG_TEXT_OCCURRENCE_JOB_REJECTED");
}

export function applyBoringLogTextOccurrenceStyles(
  jobInput: unknown,
  overrideInputs: unknown,
  layoutOverrideInputs: unknown = [],
): BoringLogTextOccurrenceAuthoringResult {
  const job = validateBoringLogLayoutJobInput(jobInput);
  if (!job.accepted) return rejected("BORING_LOG_TEXT_OCCURRENCE_JOB_REJECTED");
  if (!Array.isArray(overrideInputs) || !Array.isArray(layoutOverrideInputs)) {
    return rejected("BORING_LOG_TEXT_OCCURRENCE_OVERRIDE_REJECTED");
  }
  const layoutOverrides: BoringLogTextOccurrenceLayoutOverride[] = [];
  for (const input of layoutOverrideInputs) {
    const decoded = validateBoringLogTextOccurrenceLayoutOverride(input);
    if (!decoded.accepted) return rejected("BORING_LOG_TEXT_OCCURRENCE_OVERRIDE_REJECTED");
    if (decoded.value.boringLogIdentity !== job.value.document.identity.boringLogId) {
      return rejected("BORING_LOG_TEXT_OCCURRENCE_SCOPE_MISMATCH");
    }
    layoutOverrides.push(decoded.value);
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
    new Set(overrides.map(({ occurrenceNodeId }) => occurrenceNodeId)).size !== overrides.length ||
    new Set(layoutOverrides.map(({ occurrenceNodeId }) => occurrenceNodeId)).size !==
      layoutOverrides.length
  ) {
    return rejected("BORING_LOG_TEXT_OCCURRENCE_DUPLICATE");
  }
  layoutOverrides.sort((left, right) =>
    left.occurrenceNodeId.localeCompare(right.occurrenceNodeId),
  );
  const styleTargetNodeIds = new Set(overrides.map(({ occurrenceNodeId }) => occurrenceNodeId));
  const layoutTargetNodeIds = new Set(
    layoutOverrides.map(({ occurrenceNodeId }) => occurrenceNodeId),
  );
  const replacedStyleIds = new Set(
    job.value.template.bindings
      .filter(
        ({ elementId, path }) =>
          path === "presentation.text-occurrence-style" && styleTargetNodeIds.has(elementId),
      )
      .map(({ styleId }) => styleId),
  );
  const replacedLayoutIds = new Set(
    job.value.template.bindings
      .filter(
        ({ elementId, path }) =>
          path === "presentation.text-occurrence-layout" && layoutTargetNodeIds.has(elementId),
      )
      .map(({ styleId }) => styleId),
  );
  const bindings = job.value.template.bindings.filter(
    ({ elementId, path }) =>
      !(
        (path === "presentation.text-occurrence-style" && styleTargetNodeIds.has(elementId)) ||
        (path === "presentation.text-occurrence-layout" && layoutTargetNodeIds.has(elementId))
      ),
  );
  const retainedStyleIds = new Set(bindings.map(({ styleId }) => styleId));
  const styles = job.value.template.styles.filter(
    ({ id }) => !replacedStyleIds.has(id) || retainedStyleIds.has(id),
  );
  const retainedLayoutIds = new Set(
    bindings
      .filter(({ path }) => path === "presentation.text-occurrence-layout")
      .map(({ styleId }) => styleId),
  );
  const occurrenceLayouts = (job.value.template.occurrenceLayouts ?? []).filter(
    ({ id }) => !replacedLayoutIds.has(id) || retainedLayoutIds.has(id),
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
  for (const override of layoutOverrides) {
    const digest = sha256CanonicalJson(override).slice("sha256:".length, "sha256:".length + 24);
    const layoutId = `layout-occurrence-${digest}`;
    if (occurrenceLayouts.some(({ id }) => id === layoutId)) {
      return rejected("BORING_LOG_TEXT_OCCURRENCE_STYLE_COLLISION");
    }
    occurrenceLayouts.push(Object.freeze({ id: layoutId, ...override.layout }));
    bindings.push(
      Object.freeze({
        elementId: override.occurrenceNodeId,
        path: "presentation.text-occurrence-layout",
        styleId: layoutId,
      }),
    );
  }
  const effectiveTemplate = {
    ...job.value.template,
    styles,
    occurrenceLayouts,
    bindings,
  };
  const effective = validateBoringLogLayoutJobInput({
    ...job.value,
    templateDigest: sha256CanonicalJson(effectiveTemplate),
    template: effectiveTemplate,
  });
  return effective.accepted
    ? Object.freeze({
        accepted: true,
        job: effective.value,
        overrides: Object.freeze(overrides),
        layoutOverrides: Object.freeze(layoutOverrides),
      })
    : rejected("BORING_LOG_TEXT_OCCURRENCE_JOB_REJECTED");
}

export function prepareBoringLogLayoutWithTextOccurrenceStyles(
  jobInput: unknown,
  overrideInputs: unknown,
  layoutOverrideInputs: unknown = [],
): BoringLogLayoutEngineResult<BoringLogLayoutPreparation> {
  const authored = applyBoringLogTextOccurrenceStyles(
    jobInput,
    overrideInputs,
    layoutOverrideInputs,
  );
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
  for (const override of authored.layoutOverrides) {
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
