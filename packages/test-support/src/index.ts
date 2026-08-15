/** Stable marker for the accepted test-support package boundary. */
export const packageBoundary = "@rsrender/test-support" as const;

export {
  computeCorpusAdmissionRecordDigest,
  computeCorpusFixtureCandidateDigest,
  computeCorpusManifestDigest,
  CORPUS_DIAGNOSTIC_CODES,
  CORPUS_MANIFEST_SCHEMA_VERSION,
  GOLDEN_LOG_CORPUS_VERSION,
  readAdmittedCorpusManifest,
} from "./corpus-manifest.js";

export type {
  AdmittedCorpusManifest,
  CorpusAdmissionDisposition,
  CorpusAdmissionRecord,
  CorpusDiagnostic,
  CorpusDiagnosticCode,
  CorpusExpectedArtifactMetadata,
  CorpusFixtureMetadata,
  CorpusLayerClass,
  CorpusManifestReadResult,
  CorpusManifestTextSource,
  CorpusOracleReference,
  CorpusOracleState,
  CorpusPartMetadata,
  DistributionDecision,
} from "./corpus-manifest.js";

export {
  computeEvidenceInventoryDigest,
  EVIDENCE_DIAGNOSTIC_CODES,
  EVIDENCE_MANIFEST_SCHEMA_VERSION,
  EVIDENCE_RESULT_STATES,
  evidenceResultSatisfiesRequiredClass,
  readEvidenceManifest,
  writeEvidenceManifest,
} from "./evidence-manifest.js";

export type {
  EvidenceDecisionClass,
  EvidenceDiagnosticCode,
  EvidenceDigestReference,
  EvidenceManifest,
  EvidenceManifestDiagnostic,
  EvidenceManifestDraft,
  EvidenceManifestReadResult,
  EvidenceManifestWriteResult,
  EvidenceReleaseContribution,
  EvidenceResultRecord,
  EvidenceResultState,
} from "./evidence-manifest.js";

export {
  AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES,
  AGGREGATE_EVIDENCE_INDEX_SCHEMA_VERSION,
  readAggregateEvidenceIndex,
  writeAggregateEvidenceIndex,
} from "./aggregate-evidence-index.js";

export type {
  AggregateEvidenceIndex,
  AggregateEvidenceIndexDiagnostic,
  AggregateEvidenceIndexDiagnosticCode,
  AggregateEvidenceIndexDraft,
  AggregateEvidenceIndexEntry,
  AggregateEvidenceIndexResult,
  AggregateEvidenceManifestSource,
} from "./aggregate-evidence-index.js";
