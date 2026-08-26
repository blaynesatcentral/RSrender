/** Stable marker for the accepted source-contract package boundary. */
export const packageBoundary = "@rsrender/source-contract" as const;

export {
  createRsLogProviderAuthoringBinding,
  providerAuthoringCatalogSchemaVersion,
  resolveRsLogProviderAuthoringField,
  rsLogProviderAuthoringCatalog,
  rsLogProviderAuthoringCatalogRevision,
} from "./provider-authoring-catalog.js";
export type {
  CreateProviderAuthoringBindingResult,
  ProviderAuthoringCatalog,
  ProviderAuthoringCatalogRejectionCode,
  ProviderAuthoringDepthBinding,
  ProviderAuthoringFieldAvailability,
  ProviderAuthoringFieldBinding,
  ProviderAuthoringFieldBindingDefinition,
  ProviderAuthoringFieldDefinition,
  ProviderAuthoringFieldProvenance,
  ProviderAuthoringRecordScope,
  ProviderAuthoringTargetRole,
  ProviderAuthoringValueType,
  ResolveProviderAuthoringFieldResult,
} from "./provider-authoring-catalog.js";
