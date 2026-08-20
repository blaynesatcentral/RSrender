/** Stable marker for the accepted contracts package boundary. */
export const packageBoundary = "@rsrender/contracts" as const;
/** Exact invalidation identity for the BLD-002 primitive contract. */
export const contractPrimitivesRevision = "bld-002-v1" as const;

export { canonicalizeJson, canonicalJsonUtf8Bytes } from "./canonical-json.js";
export type { CanonicalJsonPrimitive, CanonicalJsonValue } from "./canonical-json.js";
export { ContractPrimitiveError } from "./contract-primitive-error.js";
export type { ContractPrimitiveErrorCode } from "./contract-primitive-error.js";
export { defineOpaqueIdentityCodec, parseOpaqueIdentity } from "./identity.js";
export type { OpaqueIdentity, OpaqueIdentityCodec } from "./identity.js";
export {
  isMpt,
  isPhysicalUnit,
  MPT_PER_INCH,
  MPT_PER_POINT,
  MPT_ROUNDING_MODE,
  mptToPhysicalLength,
  parseMpt,
  PHYSICAL_UNITS,
  physicalLengthToMpt,
} from "./physical-length.js";
export type { Mpt, PhysicalUnit } from "./physical-length.js";
export {
  isSha256Digest,
  parseSha256Digest,
  SHA256_ALGORITHM,
  sha256Bytes,
  sha256CanonicalJson,
  sha256Utf8,
} from "./sha256.js";
export type { Sha256Digest } from "./sha256.js";
export {
  assertContractSchemaParity,
  contractManifestsAgree,
  contractTypeManifest,
  contractVersion,
  validateExampleBoundaryMessage,
} from "./runtime-contract.js";
export type {
  ContractRejectionCode,
  ContractValidationResult,
  ExampleBoundaryMessage,
  ExampleNoopCommand,
  ExampleNoopCompletedResult,
  ExampleObservedEvent,
  ExampleVersionQuery,
  ExampleVersionQueryResult,
} from "./runtime-contract.js";

export {
  applicationRequestIdentityCodec,
  applicationServiceContractRevision,
  applicationServiceContractVersion,
  applicationServiceSchemaManifest,
  canonicalApplicationServiceRequest,
  isEventSequence,
  isOwnerGeneration,
  isWorkingRevision,
  parseEventSequence,
  parseOwnerGeneration,
  parseWorkingRevision,
  syntheticCommitIdentityCodec,
  syntheticReplaceTemplateContentCommandId,
  syntheticTemplateProjectionKind,
  validateApplicationServiceCommand,
  validateApplicationServiceMessage,
  validateApplicationServiceQuery,
  validateApplicationServiceSubscriptionRequest,
} from "./application-service-contract.js";

export {
  applicationVersionContractRevision,
  applicationVersionContractVersion,
  applicationVersionQueryKind,
  applicationVersionResultKind,
  createApplicationVersionQuery,
  createApplicationVersionResult,
  isApplicationVersion,
  parseApplicationVersion,
  validateApplicationVersionQuery,
  validateApplicationVersionResult,
} from "./application-version-contract.js";
export type {
  ApplicationVersion,
  ApplicationVersionContractCode,
  ApplicationVersionQuery,
  ApplicationVersionResult,
  ApplicationVersionValidationResult,
} from "./application-version-contract.js";
export type {
  ApplicationRequestIdentity,
  ApplicationServiceCommand,
  ApplicationServiceCommandResult,
  ApplicationServiceContractRejectionCode,
  ApplicationServiceEvent,
  ApplicationServiceMessage,
  ApplicationServiceQuery,
  ApplicationServiceQueryResult,
  ApplicationServiceRejectionReason,
  ApplicationServiceRejectedResult,
  ApplicationServiceSubscriptionRequest,
  ApplicationServiceValidationResult,
  EventSequence,
  OwnerGeneration,
  SyntheticCommitIdentity,
  SyntheticDocumentEventsSubscriptionRequest,
  SyntheticDomainCommittedResult,
  SyntheticReplaceTemplateContentCommand,
  SyntheticTemplateContentReplacedEvent,
  SyntheticTemplateProjection,
  SyntheticTemplateProjectionQuery,
  SyntheticTemplateProjectionResult,
  WorkingRevision,
} from "./application-service-contract.js";

export {
  canonicalHistoryCoreCommand,
  capturedRevisionIdentityCodec,
  historyCoreContractRevision,
  historyCoreContractVersion,
  historyCoreSchemaManifest,
  historyEntryIdentityCodec,
  historyRedoCommandId,
  historyUndoCommandId,
  isDurableRevision,
  isHistoryCoreCommittedResult,
  isHistoryCoreRejectedResult,
  isHistoryCursor,
  parseDurableRevision,
  parseHistoryCursor,
  validateHistoryCoreCommand,
  validateHistoryCoreResult,
} from "./history-core-contract.js";

export {
  createProjectDomainEffect,
  decodeProjectDomainEffect,
  encodeProjectDomainEffect,
  projectDomainEffectContractRevision,
  projectDomainEffectContractVersion,
  projectDomainEffectIdentityCodec,
} from "./project-domain-effect-contract.js";
export type {
  CanonicalAggregateBytes,
  EncodedProjectDomainEffect,
  ProjectAggregateApplicationPayload,
  ProjectDomainEffect,
  ProjectDomainEffectContractRejectionCode,
  ProjectDomainEffectDecodeResult,
  ProjectDomainEffectDraft,
  ProjectDomainEffectIdentity,
  ProjectDomainEventResult,
} from "./project-domain-effect-contract.js";
export type {
  CapturedRevisionIdentity,
  DurableRevision,
  HistoryCoreCommand,
  HistoryCoreCommandResult,
  HistoryCoreCommittedResult,
  HistoryCoreContractRejectionCode,
  HistoryCoreRejectedResult,
  HistoryCoreRejectionReason,
  HistoryCoreValidationResult,
  HistoryCursor,
  HistoryEntryIdentity,
  HistoryOperation,
  HistoryRedoCommand,
  HistoryUndoCommand,
} from "./history-core-contract.js";
