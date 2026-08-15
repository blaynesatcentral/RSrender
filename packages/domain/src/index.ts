/** Stable marker for the accepted domain package boundary. */
export const packageBoundary = "@rsrender/domain" as const;

export {
  decodeDomainValueRecord,
  domainValueRecordsEqual,
  domainValueRecordVersion,
  encodeDomainValueRecord,
} from "./value-record.js";
export type {
  AssociationState,
  ContentState,
  DomainValueDecodeResult,
  DomainValueEncodeResult,
  DomainValueRecord,
  DomainValueRejectionCode,
  EligibilityReasonCode,
  EligibilityResult,
  FinalityState,
  ProvenanceTransformation,
  UnitState,
  ValueProvenance,
} from "./value-record.js";
