import {
  sha256CanonicalJson,
  validateBoringLogTemplateInput,
  type BoringLogColumnInput,
  type BoringLogProviderAuthoringBindingInput,
  type BoringLogProviderAuthoringTargetRole,
  type BoringLogTemplateHierarchyNode,
  type BoringLogTemplateInput,
  type Mpt,
} from "@rsrender/contracts";

import type { BoringLogColumnResizeConstraint } from "./boring-log-column-resize.js";

export const boringLogAddColumnRevision = "bld-057-add-log-column-v1" as const;
export const boringLogMaximumColumnCount = 64 as const;

export interface BoringLogAddProviderColumnInput {
  readonly template: BoringLogTemplateInput;
  /** Source-contract-owned, value-free catalog. Scene never imports a provider adapter. */
  readonly providerCatalog: unknown;
  /** Exact binding returned by the provider catalog authority. */
  readonly providerBinding: unknown;
  readonly column: Readonly<{
    readonly id: string;
    readonly heading: string;
    readonly styleId: string;
    readonly widthMpt: number;
    readonly minimumWidthMpt: number;
  }>;
  readonly placement: Readonly<{
    readonly referenceColumnId: string;
    readonly side: "before" | "after";
    /** Existing column that contributes the physical width for this insertion. */
    readonly resizeDonorColumnId: string;
  }>;
  readonly constraints: readonly BoringLogColumnResizeConstraint[];
}

export type BoringLogAddProviderColumnRejectionCode =
  | "ADD_COLUMN_ARGUMENT_INVALID"
  | "ADD_COLUMN_TEMPLATE_INVALID"
  | "ADD_COLUMN_PROVIDER_CATALOG_INVALID"
  | "ADD_COLUMN_PROVIDER_BINDING_UNAVAILABLE"
  | "ADD_COLUMN_TARGET_ROLE_UNSUPPORTED"
  | "ADD_COLUMN_IDENTITY_COLLISION"
  | "ADD_COLUMN_CAPACITY_EXHAUSTED"
  | "ADD_COLUMN_PLACEMENT_INVALID"
  | "ADD_COLUMN_HIERARCHY_INVALID"
  | "ADD_COLUMN_CONSTRAINT_INVALID"
  | "ADD_COLUMN_RESIZE_PINNED"
  | "ADD_COLUMN_GEOMETRY_COLLISION";

export type BoringLogAddProviderColumnResult =
  | Readonly<{
      readonly accepted: true;
      readonly code: "ADD_COLUMN_COMMITTED";
      readonly changed: true;
      readonly template: BoringLogTemplateInput;
      readonly addedColumn: BoringLogColumnInput;
      readonly providerBinding: BoringLogProviderAuthoringBindingInput;
      readonly insertionIndex: number;
      readonly resizeDonorColumnId: string;
      readonly affectedColumnIds: readonly string[];
      readonly conservedLeftMpt: number;
      readonly conservedRightMpt: number;
    }>
  | Readonly<{
      readonly accepted: false;
      readonly code: BoringLogAddProviderColumnRejectionCode;
    }>;

type DataRecord = Record<string, unknown>;

const providerColumnRoles: readonly BoringLogProviderAuthoringTargetRole[] = Object.freeze([
  "interval-text-column",
  "lithology-pattern-column",
  "numeric-value-column",
  "point-text-column",
  "remarks-column",
]);

function rejected(code: BoringLogAddProviderColumnRejectionCode): BoringLogAddProviderColumnResult {
  return Object.freeze({ accepted: false, code });
}

function exactRecord(input: unknown, keys: readonly string[]): DataRecord | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) return null;
  const ownKeys = Reflect.ownKeys(input);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))
  ) {
    return null;
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) return null;
  }
  return input as DataRecord;
}

function denseArray(input: unknown): readonly unknown[] | null {
  if (!Array.isArray(input) || Reflect.ownKeys(input).length !== input.length + 1) return null;
  const values: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) return null;
    values.push(descriptor.value as unknown);
  }
  return Object.freeze(values);
}

function boundedText(input: unknown, maximum = 512): input is string {
  return typeof input === "string" && input.length > 0 && input.length <= maximum;
}

function exactConstraint(input: unknown): input is BoringLogColumnResizeConstraint {
  const value = exactRecord(input, ["columnId", "minimumWidthMpt", "widthPinned"]);
  return (
    value !== null &&
    boundedText(value["columnId"]) &&
    Number.isSafeInteger(value["minimumWidthMpt"]) &&
    (value["minimumWidthMpt"] as number) > 0 &&
    typeof value["widthPinned"] === "boolean"
  );
}

function hierarchyIdentityInventory(node: BoringLogTemplateHierarchyNode): readonly string[] {
  return Object.freeze([
    node.id,
    ...node.children.flatMap((child) =>
      typeof child === "string" ? [child] : hierarchyIdentityInventory(child),
    ),
  ]);
}

function directChildIdentity(child: string | BoringLogTemplateHierarchyNode): string {
  return typeof child === "string" ? child : child.id;
}

function findHierarchyNode(
  node: BoringLogTemplateHierarchyNode,
  id: string,
): BoringLogTemplateHierarchyNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    if (typeof child === "string") continue;
    const found = findHierarchyNode(child, id);
    if (found !== null) return found;
  }
  return null;
}

function replaceHierarchyNode(
  node: BoringLogTemplateHierarchyNode,
  id: string,
  replacement: BoringLogTemplateHierarchyNode,
): BoringLogTemplateHierarchyNode {
  if (node.id === id) return replacement;
  return Object.freeze({
    ...node,
    children: Object.freeze(
      node.children.map((child) =>
        typeof child === "string" ? child : replaceHierarchyNode(child, id, replacement),
      ),
    ),
  });
}

function resolveExactAvailableBinding(
  catalogInput: unknown,
  bindingInput: unknown,
):
  | Readonly<{
      readonly accepted: true;
      readonly binding: Omit<BoringLogProviderAuthoringBindingInput, "elementId">;
    }>
  | Readonly<{ readonly accepted: false; readonly code: BoringLogAddProviderColumnRejectionCode }> {
  const catalog = exactRecord(catalogInput, [
    "contractVersion",
    "schemaVersion",
    "kind",
    "providerId",
    "catalogRevision",
    "fields",
  ]);
  const fields = catalog === null ? null : denseArray(catalog["fields"]);
  if (
    catalog === null ||
    catalog["contractVersion"] !== 1 ||
    catalog["schemaVersion"] !== "rsrender.provider-authoring-catalog/1" ||
    catalog["kind"] !== "provider-authoring-catalog" ||
    !boundedText(catalog["providerId"], 128) ||
    !boundedText(catalog["catalogRevision"], 256) ||
    fields === null ||
    fields.length > 256
  ) {
    return Object.freeze({ accepted: false, code: "ADD_COLUMN_PROVIDER_CATALOG_INVALID" });
  }
  const binding = exactRecord(bindingInput, [
    "contractVersion",
    "providerId",
    "catalogRevision",
    "fieldId",
    "targetRole",
    "root",
    "recordScope",
    "sourcePath",
    "cardinality",
    "valueType",
    "unit",
    "depth",
    "provenance",
  ]);
  if (binding === null || !boundedText(binding["fieldId"], 512)) {
    return Object.freeze({ accepted: false, code: "ADD_COLUMN_PROVIDER_BINDING_UNAVAILABLE" });
  }
  const matchingFields = fields
    .map((candidate) =>
      exactRecord(candidate, [
        "fieldId",
        "label",
        "description",
        "valueType",
        "unit",
        "binding",
        "supportedTargetRoles",
        "availability",
        "provenance",
      ]),
    )
    .filter((candidate) => candidate?.["fieldId"] === binding["fieldId"]);
  const field = matchingFields[0];
  if (matchingFields.length !== 1 || field === undefined || field === null) {
    return Object.freeze({ accepted: false, code: "ADD_COLUMN_PROVIDER_BINDING_UNAVAILABLE" });
  }
  const fieldBinding = exactRecord(field["binding"], [
    "root",
    "recordScope",
    "sourcePath",
    "cardinality",
    "depth",
  ]);
  const availability = exactRecord(field["availability"], [
    "state",
    "admission",
    "collectionRequirement",
    "diagnosticCode",
    "reason",
  ]);
  const supportedRoles = denseArray(field["supportedTargetRoles"]);
  const fieldDepth =
    fieldBinding === null
      ? null
      : exactRecord(fieldBinding["depth"], ["kind", "fromPath", "toPath"]);
  const fieldProvenance = exactRecord(field["provenance"], [
    "sourceClass",
    "providerId",
    "mappingRevision",
    "sourceOriginalRetained",
    "effectiveOverrideSeparate",
  ]);
  const bindingDepth = exactRecord(binding["depth"], ["kind", "fromPath", "toPath"]);
  const bindingProvenance = exactRecord(binding["provenance"], [
    "sourceClass",
    "providerId",
    "mappingRevision",
    "sourceOriginalRetained",
    "effectiveOverrideSeparate",
  ]);
  if (
    fieldBinding === null ||
    fieldDepth === null ||
    fieldProvenance === null ||
    bindingDepth === null ||
    bindingProvenance === null ||
    availability === null ||
    availability["state"] !== "available" ||
    availability["admission"] !== "typed-source-mapping" ||
    availability["collectionRequirement"] !== "required-when-bound" ||
    availability["diagnosticCode"] !== null ||
    availability["reason"] !== null ||
    supportedRoles === null ||
    supportedRoles.length < 1 ||
    new Set(supportedRoles).size !== supportedRoles.length ||
    !supportedRoles.every(
      (role) =>
        typeof role === "string" &&
        [
          "data-track-event",
          "data-track-polyline",
          "interval-text-column",
          "lithology-pattern-column",
          "numeric-value-column",
          "point-text-column",
          "remarks-column",
        ].includes(role),
    ) ||
    !boundedText(field["label"], 256) ||
    !boundedText(field["description"], 2_048) ||
    !["boolean", "date", "number", "structured-text", "text"].includes(
      String(field["valueType"]),
    ) ||
    (field["unit"] !== null && !boundedText(field["unit"], 128)) ||
    fieldBinding["root"] !== "render-dataset" ||
    fieldBinding["cardinality"] !== "one-per-record" ||
    !boundedText(fieldBinding["recordScope"], 128) ||
    !boundedText(fieldBinding["sourcePath"], 512) ||
    !["interval", "point"].includes(String(fieldDepth["kind"])) ||
    !boundedText(fieldDepth["fromPath"], 512) ||
    (fieldDepth["toPath"] !== null && !boundedText(fieldDepth["toPath"], 512)) ||
    (fieldDepth["kind"] === "point" && fieldDepth["toPath"] !== null) ||
    (fieldDepth["kind"] === "interval" && fieldDepth["toPath"] === null) ||
    fieldProvenance["sourceClass"] !== "provider-source" ||
    fieldProvenance["providerId"] !== catalog["providerId"] ||
    fieldProvenance["mappingRevision"] !== catalog["catalogRevision"] ||
    fieldProvenance["sourceOriginalRetained"] !== true ||
    fieldProvenance["effectiveOverrideSeparate"] !== true ||
    !supportedRoles.includes(binding["targetRole"])
  ) {
    return Object.freeze({ accepted: false, code: "ADD_COLUMN_PROVIDER_BINDING_UNAVAILABLE" });
  }
  if (
    !providerColumnRoles.includes(binding["targetRole"] as BoringLogProviderAuthoringTargetRole)
  ) {
    return Object.freeze({ accepted: false, code: "ADD_COLUMN_TARGET_ROLE_UNSUPPORTED" });
  }
  const expected = Object.freeze({
    contractVersion: 1 as const,
    providerId: catalog["providerId"],
    catalogRevision: catalog["catalogRevision"],
    fieldId: field["fieldId"],
    targetRole: binding["targetRole"],
    root: fieldBinding["root"],
    recordScope: fieldBinding["recordScope"],
    sourcePath: fieldBinding["sourcePath"],
    cardinality: fieldBinding["cardinality"],
    valueType: field["valueType"],
    unit: field["unit"],
    depth: fieldBinding["depth"],
    provenance: field["provenance"],
  });
  try {
    if (sha256CanonicalJson(binding) !== sha256CanonicalJson(expected)) {
      return Object.freeze({ accepted: false, code: "ADD_COLUMN_PROVIDER_BINDING_UNAVAILABLE" });
    }
  } catch {
    return Object.freeze({ accepted: false, code: "ADD_COLUMN_PROVIDER_BINDING_UNAVAILABLE" });
  }
  return Object.freeze({
    accepted: true,
    binding: expected as unknown as Omit<BoringLogProviderAuthoringBindingInput, "elementId">,
  });
}

/**
 * Pure Add Log Column authority. It conserves the current column span by shrinking one explicit,
 * unpinned donor; it never invents provider paths, overlays columns, or extends page geometry.
 */
export function addProviderBoundBoringLogColumn(input: unknown): BoringLogAddProviderColumnResult {
  try {
    const request = exactRecord(input, [
      "template",
      "providerCatalog",
      "providerBinding",
      "column",
      "placement",
      "constraints",
    ]);
    if (request === null) return rejected("ADD_COLUMN_ARGUMENT_INVALID");
    const validatedTemplate = validateBoringLogTemplateInput(request["template"]);
    if (!validatedTemplate.accepted) return rejected("ADD_COLUMN_TEMPLATE_INVALID");
    const template = validatedTemplate.value;
    if (template.columns.length >= boringLogMaximumColumnCount) {
      return rejected("ADD_COLUMN_CAPACITY_EXHAUSTED");
    }
    const columnInput = exactRecord(request["column"], [
      "id",
      "heading",
      "styleId",
      "widthMpt",
      "minimumWidthMpt",
    ]);
    const placement = exactRecord(request["placement"], [
      "referenceColumnId",
      "side",
      "resizeDonorColumnId",
    ]);
    const constraintsInput = denseArray(request["constraints"]);
    if (
      columnInput === null ||
      placement === null ||
      constraintsInput === null ||
      !boundedText(columnInput["id"]) ||
      !boundedText(columnInput["heading"]) ||
      !boundedText(columnInput["styleId"]) ||
      !Number.isSafeInteger(columnInput["widthMpt"]) ||
      (columnInput["widthMpt"] as number) <= 0 ||
      !Number.isSafeInteger(columnInput["minimumWidthMpt"]) ||
      (columnInput["minimumWidthMpt"] as number) <= 0 ||
      (columnInput["widthMpt"] as number) < (columnInput["minimumWidthMpt"] as number) ||
      !boundedText(placement["referenceColumnId"]) ||
      !["before", "after"].includes(String(placement["side"])) ||
      !boundedText(placement["resizeDonorColumnId"]) ||
      !constraintsInput.every(exactConstraint)
    ) {
      return rejected("ADD_COLUMN_ARGUMENT_INVALID");
    }
    if (!template.styles.some(({ id }) => id === columnInput["styleId"])) {
      return rejected("ADD_COLUMN_CONSTRAINT_INVALID");
    }
    const exactBinding = resolveExactAvailableBinding(
      request["providerCatalog"],
      request["providerBinding"],
    );
    if (!exactBinding.accepted) return exactBinding;
    const resolvedBinding = exactBinding.binding;
    const targetRole = resolvedBinding.targetRole;
    const sourcePath = resolvedBinding.sourcePath;
    const columnId = columnInput["id"];
    const elementId = `${columnId}:provider-value`;
    const identityInventory = hierarchyIdentityInventory(template.hierarchy);
    if (
      template.columns.some(({ id }) => id === columnId) ||
      identityInventory.includes(columnId) ||
      identityInventory.includes(elementId) ||
      template.bindings.some(({ elementId: candidate }) => candidate === elementId) ||
      template.providerAuthoringBindings?.some(
        ({ elementId: candidate }) => candidate === elementId,
      )
    ) {
      return rejected("ADD_COLUMN_IDENTITY_COLLISION");
    }
    const referenceIndex = template.columns.findIndex(
      ({ id }) => id === placement["referenceColumnId"],
    );
    const donorIndex = template.columns.findIndex(
      ({ id }) => id === placement["resizeDonorColumnId"],
    );
    if (referenceIndex < 0 || donorIndex < 0) return rejected("ADD_COLUMN_PLACEMENT_INVALID");
    const constraints = constraintsInput;
    const constraintByColumn = new Map(
      constraints.map((constraint) => [constraint.columnId, constraint] as const),
    );
    if (
      constraintByColumn.size !== constraints.length ||
      constraints.length !== template.columns.length ||
      template.columns.some((column) => {
        const constraint = constraintByColumn.get(column.id);
        return constraint === undefined || constraint.minimumWidthMpt > column.widthMpt;
      })
    ) {
      return rejected("ADD_COLUMN_CONSTRAINT_INVALID");
    }
    const donor = template.columns[donorIndex];
    if (donor === undefined) return rejected("ADD_COLUMN_PLACEMENT_INVALID");
    const donorConstraint = constraintByColumn.get(donor.id);
    if (donorConstraint === undefined) return rejected("ADD_COLUMN_CONSTRAINT_INVALID");
    if (donorConstraint.widthPinned) return rejected("ADD_COLUMN_RESIZE_PINNED");
    const widthMpt = columnInput["widthMpt"] as number;
    if (donor.widthMpt - widthMpt < donorConstraint.minimumWidthMpt) {
      return rejected("ADD_COLUMN_CONSTRAINT_INVALID");
    }
    const depthRegion = template.regions.find(({ id }) => id === template.depthTransform.regionId);
    if (depthRegion === undefined || depthRegion.role !== "depth-body") {
      return rejected("ADD_COLUMN_HIERARCHY_INVALID");
    }
    const depthHierarchy = findHierarchyNode(template.hierarchy, depthRegion.id);
    const hierarchyOrder = depthHierarchy?.children.map(directChildIdentity);
    if (
      depthHierarchy === null ||
      depthHierarchy === undefined ||
      hierarchyOrder === undefined ||
      hierarchyOrder.length !== template.columns.length ||
      hierarchyOrder.some((id, index) => {
        const column = template.columns[index];
        return column === undefined || id !== column.id;
      })
    ) {
      return rejected("ADD_COLUMN_HIERARCHY_INVALID");
    }
    const insertionIndex = referenceIndex + (placement["side"] === "after" ? 1 : 0);
    const draftColumns: Array<{
      id: string;
      role: string;
      xMpt: number;
      widthMpt: number;
      heading?: string;
    }> = template.columns.map((column) =>
      column.id === donor.id ? { ...column, widthMpt: column.widthMpt - widthMpt } : { ...column },
    );
    draftColumns.splice(insertionIndex, 0, {
      id: columnId,
      role: targetRole,
      xMpt: 0,
      widthMpt,
      heading: columnInput["heading"],
    });
    const firstColumn = template.columns[0];
    const lastColumn = template.columns.at(-1);
    if (firstColumn === undefined || lastColumn === undefined) {
      return rejected("ADD_COLUMN_PLACEMENT_INVALID");
    }
    const conservedLeftMpt = firstColumn.xMpt;
    const conservedRightMpt = lastColumn.xMpt + lastColumn.widthMpt;
    let cursor: number = conservedLeftMpt;
    const columns = Object.freeze(
      draftColumns.map((column) => {
        const result = Object.freeze({ ...column, xMpt: cursor as Mpt });
        cursor += column.widthMpt;
        return result;
      }),
    );
    if (
      cursor !== conservedRightMpt ||
      conservedLeftMpt < depthRegion.xMpt ||
      conservedRightMpt > depthRegion.xMpt + depthRegion.widthMpt
    ) {
      return rejected("ADD_COLUMN_GEOMETRY_COLLISION");
    }
    const hierarchyNode = Object.freeze({
      id: columnId,
      role: "log-column",
      children: Object.freeze([
        Object.freeze({
          id: elementId,
          role: targetRole,
          children: Object.freeze([]),
        }),
      ]),
    });
    const depthChildren = [...depthHierarchy.children];
    depthChildren.splice(insertionIndex, 0, hierarchyNode);
    const hierarchy = replaceHierarchyNode(
      template.hierarchy,
      depthHierarchy.id,
      Object.freeze({ ...depthHierarchy, children: Object.freeze(depthChildren) }),
    );
    if (template.templateRevision >= Number.MAX_SAFE_INTEGER) {
      return rejected("ADD_COLUMN_CAPACITY_EXHAUSTED");
    }
    const providerBinding: BoringLogProviderAuthoringBindingInput = Object.freeze({
      elementId,
      ...resolvedBinding,
    });
    const candidate = {
      ...template,
      templateRevision: template.templateRevision + 1,
      columns,
      hierarchy,
      bindings: Object.freeze([
        ...template.bindings,
        Object.freeze({
          elementId,
          path: sourcePath,
          styleId: columnInput["styleId"],
        }),
      ]),
      providerAuthoringBindings: Object.freeze([
        ...(template.providerAuthoringBindings ?? []),
        providerBinding,
      ]),
    };
    const validatedCandidate = validateBoringLogTemplateInput(candidate);
    if (!validatedCandidate.accepted) return rejected("ADD_COLUMN_GEOMETRY_COLLISION");
    const priorColumns = new Map(template.columns.map((column) => [column.id, column] as const));
    const affectedColumnIds = validatedCandidate.value.columns
      .filter((column) => {
        const prior = priorColumns.get(column.id);
        if (prior === undefined) return true;
        return prior.xMpt !== column.xMpt || prior.widthMpt !== column.widthMpt;
      })
      .map(({ id }) => id);
    const addedColumn = validatedCandidate.value.columns[insertionIndex];
    if (addedColumn === undefined) return rejected("ADD_COLUMN_HIERARCHY_INVALID");
    return Object.freeze({
      accepted: true,
      code: "ADD_COLUMN_COMMITTED",
      changed: true,
      template: validatedCandidate.value,
      addedColumn,
      providerBinding,
      insertionIndex,
      resizeDonorColumnId: donor.id,
      affectedColumnIds: Object.freeze(affectedColumnIds),
      conservedLeftMpt,
      conservedRightMpt,
    });
  } catch {
    return rejected("ADD_COLUMN_ARGUMENT_INVALID");
  }
}
