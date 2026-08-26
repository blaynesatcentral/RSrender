/**
 * Value-free authoring metadata for source-backed Log Columns and Data Layers.
 *
 * Source paths name RSrender's normalized Render Dataset surface. They are not RSLog wire paths,
 * URLs, expressions, or executable selectors. Adding a path is therefore an explicit source-
 * contract admission, not something a live payload may do implicitly.
 */

export const providerAuthoringCatalogSchemaVersion =
  "rsrender.provider-authoring-catalog/1" as const;
export const rsLogProviderAuthoringCatalogRevision = "rslog-provider-authoring-catalog-v1" as const;

export type ProviderAuthoringValueType = "boolean" | "date" | "number" | "structured-text" | "text";

export type ProviderAuthoringTargetRole =
  | "data-track-event"
  | "data-track-polyline"
  | "interval-text-column"
  | "lithology-pattern-column"
  | "numeric-value-column"
  | "point-text-column"
  | "remarks-column";

export type ProviderAuthoringRecordScope =
  "boring-method" | "comment" | "field-test" | "sample" | "stratum";

export interface ProviderAuthoringDepthBinding {
  readonly kind: "interval" | "point";
  readonly fromPath: string;
  readonly toPath: string | null;
}

export interface ProviderAuthoringFieldBindingDefinition {
  readonly root: "render-dataset";
  readonly recordScope: ProviderAuthoringRecordScope;
  readonly sourcePath: string;
  readonly cardinality: "one-per-record";
  readonly depth: ProviderAuthoringDepthBinding;
}

export interface ProviderAuthoringFieldAvailability {
  readonly state: "available" | "unavailable";
  readonly admission: "typed-source-mapping" | "mapping-evidence-required";
  readonly collectionRequirement: "required-when-bound";
  readonly diagnosticCode: "PROVIDER_AUTHORING_SOURCE_MAPPING_UNADMITTED" | null;
  readonly reason: string | null;
}

export interface ProviderAuthoringFieldProvenance {
  readonly sourceClass: "provider-source";
  readonly providerId: "rslog";
  readonly mappingRevision: typeof rsLogProviderAuthoringCatalogRevision;
  readonly sourceOriginalRetained: true;
  readonly effectiveOverrideSeparate: true;
}

export interface ProviderAuthoringFieldDefinition {
  readonly fieldId: string;
  readonly label: string;
  readonly description: string;
  readonly valueType: ProviderAuthoringValueType;
  readonly unit: string | null;
  readonly binding: ProviderAuthoringFieldBindingDefinition;
  readonly supportedTargetRoles: readonly ProviderAuthoringTargetRole[];
  readonly availability: ProviderAuthoringFieldAvailability;
  readonly provenance: ProviderAuthoringFieldProvenance;
}

export interface ProviderAuthoringCatalog {
  readonly contractVersion: 1;
  readonly schemaVersion: typeof providerAuthoringCatalogSchemaVersion;
  readonly kind: "provider-authoring-catalog";
  readonly providerId: "rslog";
  readonly catalogRevision: typeof rsLogProviderAuthoringCatalogRevision;
  readonly fields: readonly ProviderAuthoringFieldDefinition[];
}

export type ProviderAuthoringCatalogRejectionCode =
  | "PROVIDER_AUTHORING_BINDING_WRONG_TYPE"
  | "PROVIDER_AUTHORING_BINDING_MISSING_FIELD"
  | "PROVIDER_AUTHORING_BINDING_EXTRA_FIELD"
  | "PROVIDER_AUTHORING_PROVIDER_UNSUPPORTED"
  | "PROVIDER_AUTHORING_CATALOG_REVISION_UNSUPPORTED"
  | "PROVIDER_AUTHORING_FIELD_UNADMITTED"
  | "PROVIDER_AUTHORING_FIELD_UNAVAILABLE"
  | "PROVIDER_AUTHORING_SOURCE_PATH_UNADMITTED"
  | "PROVIDER_AUTHORING_FIELD_PATH_MISMATCH"
  | "PROVIDER_AUTHORING_TARGET_ROLE_UNSUPPORTED";

export interface ProviderAuthoringFieldBinding {
  readonly contractVersion: 1;
  readonly providerId: "rslog";
  readonly catalogRevision: typeof rsLogProviderAuthoringCatalogRevision;
  readonly fieldId: string;
  readonly targetRole: ProviderAuthoringTargetRole;
  readonly root: "render-dataset";
  readonly recordScope: ProviderAuthoringRecordScope;
  readonly sourcePath: string;
  readonly cardinality: "one-per-record";
  readonly valueType: ProviderAuthoringValueType;
  readonly unit: string | null;
  readonly depth: ProviderAuthoringDepthBinding;
  readonly provenance: ProviderAuthoringFieldProvenance;
}

export type ResolveProviderAuthoringFieldResult =
  | Readonly<{
      readonly accepted: true;
      readonly code: "PROVIDER_AUTHORING_FIELD_RESOLVED";
      readonly field: ProviderAuthoringFieldDefinition;
    }>
  | Readonly<{
      readonly accepted: false;
      readonly code: "PROVIDER_AUTHORING_SOURCE_PATH_UNADMITTED";
    }>;

export type CreateProviderAuthoringBindingResult =
  | Readonly<{
      readonly accepted: true;
      readonly code: "PROVIDER_AUTHORING_BINDING_CREATED";
      readonly binding: ProviderAuthoringFieldBinding;
    }>
  | Readonly<{
      readonly accepted: false;
      readonly code: ProviderAuthoringCatalogRejectionCode;
    }>;

const available: ProviderAuthoringFieldAvailability = Object.freeze({
  state: "available",
  admission: "typed-source-mapping",
  collectionRequirement: "required-when-bound",
  diagnosticCode: null,
  reason: null,
});

const blockedSampleBlowNotation: ProviderAuthoringFieldAvailability = Object.freeze({
  state: "unavailable",
  admission: "mapping-evidence-required",
  collectionRequirement: "required-when-bound",
  diagnosticCode: "PROVIDER_AUTHORING_SOURCE_MAPPING_UNADMITTED",
  reason:
    "Sample blowCounts fallback semantics remain unavailable until an exact versioned mapping is admitted.",
});

const blockedRsLogLaboratoryValue: ProviderAuthoringFieldAvailability = Object.freeze({
  state: "unavailable",
  admission: "mapping-evidence-required",
  collectionRequirement: "required-when-bound",
  diagnosticCode: "PROVIDER_AUTHORING_SOURCE_MAPPING_UNADMITTED",
  reason:
    "The positive RSLog laboratory/index-test source mapping remains evidence-blocked; an admitted Supplemental Source may provide this semantic value separately.",
});

const provenance: ProviderAuthoringFieldProvenance = Object.freeze({
  sourceClass: "provider-source",
  providerId: "rslog",
  mappingRevision: rsLogProviderAuthoringCatalogRevision,
  sourceOriginalRetained: true,
  effectiveOverrideSeparate: true,
});

const intervalDepth = (scope: string): ProviderAuthoringDepthBinding =>
  Object.freeze({
    kind: "interval",
    fromPath: `exploration.${scope}[].fromDepth`,
    toPath: `exploration.${scope}[].toDepth`,
  });

const pointDepth = (scope: string): ProviderAuthoringDepthBinding =>
  Object.freeze({
    kind: "point",
    fromPath: `exploration.${scope}[].fromDepth`,
    toPath: null,
  });

type FieldDraft = Readonly<{
  fieldId: string;
  label: string;
  description: string;
  valueType: ProviderAuthoringValueType;
  unit: string | null;
  recordScope: ProviderAuthoringRecordScope;
  sourcePath: string;
  depth: ProviderAuthoringDepthBinding;
  supportedTargetRoles: readonly ProviderAuthoringTargetRole[];
  availability?: ProviderAuthoringFieldAvailability;
}>;

function field(input: FieldDraft): ProviderAuthoringFieldDefinition {
  return Object.freeze({
    fieldId: input.fieldId,
    label: input.label,
    description: input.description,
    valueType: input.valueType,
    unit: input.unit,
    binding: Object.freeze({
      root: "render-dataset" as const,
      recordScope: input.recordScope,
      sourcePath: input.sourcePath,
      cardinality: "one-per-record" as const,
      depth: input.depth,
    }),
    supportedTargetRoles: Object.freeze([...input.supportedTargetRoles]),
    availability: input.availability ?? available,
    provenance,
  });
}

const fields = Object.freeze([
  field({
    fieldId: "rslog.stratum.title",
    label: "Stratum title",
    description: "Provider-supplied title for a depth interval.",
    valueType: "text",
    unit: null,
    recordScope: "stratum",
    sourcePath: "exploration.strata[].title",
    depth: intervalDepth("strata"),
    supportedTargetRoles: ["interval-text-column"],
  }),
  field({
    fieldId: "rslog.stratum.description",
    label: "Material description",
    description: "Provider-supplied material description for a depth interval.",
    valueType: "text",
    unit: null,
    recordScope: "stratum",
    sourcePath: "exploration.strata[].description",
    depth: intervalDepth("strata"),
    supportedTargetRoles: ["interval-text-column"],
  }),
  field({
    fieldId: "rslog.stratum.soil-symbol",
    label: "Mapped soil type",
    description:
      "Typed soil-symbol identity. It does not admit or substitute vendor hatch artwork.",
    valueType: "text",
    unit: null,
    recordScope: "stratum",
    sourcePath: "exploration.strata[].soilSymbol",
    depth: intervalDepth("strata"),
    supportedTargetRoles: ["lithology-pattern-column", "interval-text-column"],
  }),
  field({
    fieldId: "rslog.sample.number",
    label: "Sample number",
    description: "Provider-supplied sample label or number.",
    valueType: "text",
    unit: null,
    recordScope: "sample",
    sourcePath: "exploration.samples[].number",
    depth: pointDepth("samples"),
    supportedTargetRoles: ["point-text-column"],
  }),
  field({
    fieldId: "rslog.sample.type-name",
    label: "Sample type",
    description: "Resolved provider sample-type display name.",
    valueType: "text",
    unit: null,
    recordScope: "sample",
    sourcePath: "exploration.samples[].typeName",
    depth: pointDepth("samples"),
    supportedTargetRoles: ["point-text-column"],
  }),
  field({
    fieldId: "rslog.sample.recovery-percent",
    label: "Recovery",
    description: "Provider-supplied sample recovery percentage.",
    valueType: "number",
    unit: "%",
    recordScope: "sample",
    sourcePath: "exploration.samples[].recoveryPercent",
    depth: pointDepth("samples"),
    supportedTargetRoles: ["numeric-value-column", "data-track-polyline"],
  }),
  field({
    fieldId: "rslog.sample.blow-count-notation",
    label: "Blows / penetration",
    description:
      "Sample compatibility notation retained for review; it is distinct from an admitted typed field-test reporting value.",
    valueType: "structured-text",
    unit: null,
    recordScope: "sample",
    sourcePath: "exploration.samples[].blowCounts",
    depth: pointDepth("samples"),
    supportedTargetRoles: ["point-text-column"],
    availability: blockedSampleBlowNotation,
  }),
  field({
    fieldId: "rslog.sample.n-value",
    label: "N-value",
    description:
      "Source-supplied N-value retained on the normalized sample projection with field-test provenance.",
    valueType: "number",
    unit: "blows/ft",
    recordScope: "sample",
    sourcePath: "exploration.samples[].nValue",
    depth: pointDepth("samples"),
    supportedTargetRoles: ["numeric-value-column", "data-track-polyline"],
  }),
  field({
    fieldId: "rslog.sample.n60",
    label: "N60",
    description:
      "Source-supplied N60 retained on the normalized sample projection with field-test provenance.",
    valueType: "number",
    unit: "blows/ft",
    recordScope: "sample",
    sourcePath: "exploration.samples[].n60",
    depth: pointDepth("samples"),
    supportedTargetRoles: ["numeric-value-column", "data-track-polyline"],
  }),
  field({
    fieldId: "rslog.sample.refusal",
    label: "Sampler refusal",
    description:
      "Source-supplied or admitted parsed refusal state retained on the normalized sample projection.",
    valueType: "boolean",
    unit: null,
    recordScope: "sample",
    sourcePath: "exploration.samples[].refusal",
    depth: pointDepth("samples"),
    supportedTargetRoles: ["point-text-column", "data-track-event"],
  }),
  field({
    fieldId: "rslog.sample.moisture-content",
    label: "Moisture content",
    description: "Moisture-content semantic choice for a sample.",
    valueType: "number",
    unit: "%",
    recordScope: "sample",
    sourcePath: "exploration.samples[].moistureContent",
    depth: pointDepth("samples"),
    supportedTargetRoles: ["numeric-value-column", "data-track-polyline"],
    availability: blockedRsLogLaboratoryValue,
  }),
  field({
    fieldId: "rslog.sample.moisture-w",
    label: "Water content (index test)",
    description: "Index-test water-content semantic choice for a sample.",
    valueType: "number",
    unit: "%",
    recordScope: "sample",
    sourcePath: "exploration.samples[].moistureW",
    depth: pointDepth("samples"),
    supportedTargetRoles: ["numeric-value-column", "data-track-polyline"],
    availability: blockedRsLogLaboratoryValue,
  }),
  field({
    fieldId: "rslog.sample.liquid-limit",
    label: "Liquid limit",
    description: "Liquid-limit semantic choice for a sample.",
    valueType: "number",
    unit: "%",
    recordScope: "sample",
    sourcePath: "exploration.samples[].liquidLimit",
    depth: pointDepth("samples"),
    supportedTargetRoles: ["numeric-value-column", "data-track-polyline"],
    availability: blockedRsLogLaboratoryValue,
  }),
  field({
    fieldId: "rslog.sample.plastic-limit",
    label: "Plastic limit",
    description: "Plastic-limit semantic choice for a sample.",
    valueType: "number",
    unit: "%",
    recordScope: "sample",
    sourcePath: "exploration.samples[].plasticLimit",
    depth: pointDepth("samples"),
    supportedTargetRoles: ["numeric-value-column", "data-track-polyline"],
    availability: blockedRsLogLaboratoryValue,
  }),
  field({
    fieldId: "rslog.sample.plastic-index",
    label: "Plasticity index",
    description: "Plasticity-index semantic choice for a sample.",
    valueType: "number",
    unit: "%",
    recordScope: "sample",
    sourcePath: "exploration.samples[].plasticIndex",
    depth: pointDepth("samples"),
    supportedTargetRoles: ["numeric-value-column", "data-track-polyline"],
    availability: blockedRsLogLaboratoryValue,
  }),
  field({
    fieldId: "rslog.field-test.reporting-value",
    label: "Blows / penetration",
    description:
      "Typed field-test reporting value, including admitted refusal notation; not the blocked sample blowCounts fallback.",
    valueType: "structured-text",
    unit: null,
    recordScope: "field-test",
    sourcePath: "exploration.fieldTests[].reportingValue",
    depth: pointDepth("fieldTests"),
    supportedTargetRoles: ["point-text-column"],
  }),
  field({
    fieldId: "rslog.field-test.n-value",
    label: "N-value",
    description: "Source-supplied N-value from an admitted field-test column.",
    valueType: "number",
    unit: "blows/ft",
    recordScope: "field-test",
    sourcePath: "exploration.fieldTests[].nValue",
    depth: pointDepth("fieldTests"),
    supportedTargetRoles: ["numeric-value-column", "data-track-polyline"],
  }),
  field({
    fieldId: "rslog.field-test.n60",
    label: "N60",
    description: "Source-supplied N60 value from an admitted field-test column.",
    valueType: "number",
    unit: "blows/ft",
    recordScope: "field-test",
    sourcePath: "exploration.fieldTests[].n60",
    depth: pointDepth("fieldTests"),
    supportedTargetRoles: ["numeric-value-column", "data-track-polyline"],
  }),
  field({
    fieldId: "rslog.field-test.refusal",
    label: "Sampler refusal",
    description: "Source-supplied or admitted parsed refusal state for a field test.",
    valueType: "boolean",
    unit: null,
    recordScope: "field-test",
    sourcePath: "exploration.fieldTests[].refusal",
    depth: pointDepth("fieldTests"),
    supportedTargetRoles: ["point-text-column", "data-track-event"],
  }),
  field({
    fieldId: "rslog.comment.description",
    label: "Remarks and field notes",
    description: "Provider-supplied comment text at its exact source depth.",
    valueType: "text",
    unit: null,
    recordScope: "comment",
    sourcePath: "exploration.comments[].description",
    depth: pointDepth("comments"),
    supportedTargetRoles: ["remarks-column", "point-text-column"],
  }),
  field({
    fieldId: "rslog.boring-method.drill-method",
    label: "Drilling method",
    description: "Provider-supplied drilling method for an interval.",
    valueType: "text",
    unit: null,
    recordScope: "boring-method",
    sourcePath: "exploration.boringMethods[].drillMethod",
    depth: intervalDepth("boringMethods"),
    supportedTargetRoles: ["interval-text-column"],
  }),
  field({
    fieldId: "rslog.boring-method.rig-model",
    label: "Drill rig",
    description: "Provider-supplied drill-rig model for an interval.",
    valueType: "text",
    unit: null,
    recordScope: "boring-method",
    sourcePath: "exploration.boringMethods[].drillRigModel",
    depth: intervalDepth("boringMethods"),
    supportedTargetRoles: ["interval-text-column"],
  }),
  field({
    fieldId: "rslog.boring-method.hole-diameter",
    label: "Hole diameter",
    description: "Provider-supplied borehole diameter for a drilling interval.",
    valueType: "number",
    unit: "project-length",
    recordScope: "boring-method",
    sourcePath: "exploration.boringMethods[].holeDiameter",
    depth: intervalDepth("boringMethods"),
    supportedTargetRoles: ["numeric-value-column", "interval-text-column"],
  }),
  field({
    fieldId: "rslog.boring-method.date",
    label: "Drilling date",
    description: "Provider-supplied date for a drilling interval.",
    valueType: "date",
    unit: null,
    recordScope: "boring-method",
    sourcePath: "exploration.boringMethods[].date",
    depth: intervalDepth("boringMethods"),
    supportedTargetRoles: ["interval-text-column"],
  }),
  field({
    fieldId: "rslog.boring-method.notes",
    label: "Drilling notes",
    description: "Provider-supplied drilling notes for an interval.",
    valueType: "text",
    unit: null,
    recordScope: "boring-method",
    sourcePath: "exploration.boringMethods[].notes",
    depth: intervalDepth("boringMethods"),
    supportedTargetRoles: ["interval-text-column", "remarks-column"],
  }),
]);

export const rsLogProviderAuthoringCatalog: ProviderAuthoringCatalog = Object.freeze({
  contractVersion: 1,
  schemaVersion: providerAuthoringCatalogSchemaVersion,
  kind: "provider-authoring-catalog",
  providerId: "rslog",
  catalogRevision: rsLogProviderAuthoringCatalogRevision,
  fields,
});

const fieldById = new Map(fields.map((candidate) => [candidate.fieldId, candidate]));
const fieldBySourcePath = new Map(
  fields.map((candidate) => [candidate.binding.sourcePath, candidate]),
);

function isDataObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function hasDataProperty(input: Record<string, unknown>, key: string): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  return descriptor !== undefined && Object.hasOwn(descriptor, "value");
}

function rejected(
  code: ProviderAuthoringCatalogRejectionCode,
): CreateProviderAuthoringBindingResult {
  return Object.freeze({ accepted: false, code });
}

/** Resolves only an exact admitted normalized source path. Unknown wire or extension paths fail. */
export function resolveRsLogProviderAuthoringField(
  sourcePath: unknown,
): ResolveProviderAuthoringFieldResult {
  if (typeof sourcePath !== "string") {
    return Object.freeze({
      accepted: false,
      code: "PROVIDER_AUTHORING_SOURCE_PATH_UNADMITTED",
    });
  }
  const candidate = fieldBySourcePath.get(sourcePath);
  return candidate === undefined
    ? Object.freeze({
        accepted: false,
        code: "PROVIDER_AUTHORING_SOURCE_PATH_UNADMITTED" as const,
      })
    : Object.freeze({
        accepted: true,
        code: "PROVIDER_AUTHORING_FIELD_RESOLVED" as const,
        field: candidate,
      });
}

/**
 * Creates a renderer-neutral binding payload suitable for a later history-owned Add Column/Data
 * Layer command. The request may identify only an entry and target role already admitted by this
 * exact catalog revision.
 */
export function createRsLogProviderAuthoringBinding(
  input: unknown,
): CreateProviderAuthoringBindingResult {
  if (!isDataObject(input)) return rejected("PROVIDER_AUTHORING_BINDING_WRONG_TYPE");
  const required = [
    "contractVersion",
    "providerId",
    "catalogRevision",
    "fieldId",
    "sourcePath",
    "targetRole",
  ] as const;
  for (const key of required) {
    if (!hasDataProperty(input, key)) {
      return rejected("PROVIDER_AUTHORING_BINDING_MISSING_FIELD");
    }
  }
  if (Object.keys(input).some((key) => !required.includes(key as (typeof required)[number]))) {
    return rejected("PROVIDER_AUTHORING_BINDING_EXTRA_FIELD");
  }
  if (
    input["contractVersion"] !== 1 ||
    typeof input["providerId"] !== "string" ||
    typeof input["catalogRevision"] !== "string" ||
    typeof input["fieldId"] !== "string" ||
    typeof input["sourcePath"] !== "string" ||
    typeof input["targetRole"] !== "string"
  ) {
    return rejected("PROVIDER_AUTHORING_BINDING_WRONG_TYPE");
  }
  if (input["providerId"] !== "rslog") {
    return rejected("PROVIDER_AUTHORING_PROVIDER_UNSUPPORTED");
  }
  if (input["catalogRevision"] !== rsLogProviderAuthoringCatalogRevision) {
    return rejected("PROVIDER_AUTHORING_CATALOG_REVISION_UNSUPPORTED");
  }
  const byPath = fieldBySourcePath.get(input["sourcePath"]);
  if (byPath === undefined) {
    return rejected("PROVIDER_AUTHORING_SOURCE_PATH_UNADMITTED");
  }
  const byId = fieldById.get(input["fieldId"]);
  if (byId === undefined) return rejected("PROVIDER_AUTHORING_FIELD_UNADMITTED");
  if (byId !== byPath) return rejected("PROVIDER_AUTHORING_FIELD_PATH_MISMATCH");
  if (byId.availability.state !== "available") {
    return rejected("PROVIDER_AUTHORING_FIELD_UNAVAILABLE");
  }
  if (!byId.supportedTargetRoles.includes(input["targetRole"] as ProviderAuthoringTargetRole)) {
    return rejected("PROVIDER_AUTHORING_TARGET_ROLE_UNSUPPORTED");
  }
  return Object.freeze({
    accepted: true,
    code: "PROVIDER_AUTHORING_BINDING_CREATED",
    binding: Object.freeze({
      contractVersion: 1,
      providerId: "rslog",
      catalogRevision: rsLogProviderAuthoringCatalogRevision,
      fieldId: byId.fieldId,
      targetRole: input["targetRole"] as ProviderAuthoringTargetRole,
      root: byId.binding.root,
      recordScope: byId.binding.recordScope,
      sourcePath: byId.binding.sourcePath,
      cardinality: byId.binding.cardinality,
      valueType: byId.valueType,
      unit: byId.unit,
      depth: byId.binding.depth,
      provenance: byId.provenance,
    }),
  });
}
