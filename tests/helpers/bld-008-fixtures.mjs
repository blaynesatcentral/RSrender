const digest = (character) => `sha256:${character.repeat(64)}`;
const at = "2026-08-14T12:00:00.000Z";

const basis = () => ({ basisCodes: ["synthetic-admitted"], transformations: [] });

export const provenanceFixtures = Object.freeze([
  Object.freeze({
    provenanceClass: "source",
    sourceContextIdentity: "source-context:synthetic",
    entityIdentity: "sample:synthetic-1",
    fieldIdentity: "sample:synthetic-1:moisture",
    adapterId: "synthetic-source-adapter",
    adapterContractVersion: 1,
    retrievedAtUtc: at,
    mappingRuleId: "synthetic-source-field",
    mappingRuleVersion: 1,
    ...basis(),
  }),
  Object.freeze({
    provenanceClass: "supplemental",
    supplementalSourceIdentity: "supplemental:synthetic-lab",
    supplementalRecordIdentity: "supplemental:synthetic-lab:row-1",
    inputArtifactDigest: digest("1"),
    parserId: "adapter-neutral-synthetic-parser",
    parserContractVersion: 1,
    attachedAtUtc: at,
    mappingRuleId: "synthetic-lab-field",
    mappingRuleVersion: 1,
    ...basis(),
  }),
  Object.freeze({
    provenanceClass: "override",
    presentationOverrideIdentity: "override:synthetic-1",
    sourceFieldIdentity: "sample:synthetic-1:moisture",
    expectedSourceValueDigest: digest("2"),
    overrideRevision: 1,
    recordedAtUtc: at,
    ...basis(),
  }),
  Object.freeze({
    provenanceClass: "resolution",
    sourceResolutionDecisionIdentity: "resolution:synthetic-1",
    conflictIdentity: "conflict:synthetic-1",
    competingInputRevisionDigests: [digest("3"), digest("4")],
    decisionRevision: 1,
    recordedAtUtc: at,
    ...basis(),
  }),
  Object.freeze({
    provenanceClass: "derived",
    derivationRuleId: "presentation-connector",
    derivationRuleVersion: 1,
    inputProvenanceDigests: [digest("5"), digest("6")],
    recordedAtUtc: at,
    ...basis(),
  }),
]);

export function makeRecord(overrides = {}) {
  return {
    recordVersion: 1,
    content: { kind: "zero", value: 0, originalRepresentation: "0" },
    association: { state: "resolved", targetIdentity: "sample:synthetic-1" },
    finality: { state: "final" },
    eligibility: { state: "eligible", reasonCodes: [] },
    unit: { state: "specified", quantity: "ratio", symbol: "%" },
    provenance: provenanceFixtures[0],
    ...overrides,
  };
}

export const fx04Revision = "FX-04:sparse-missing@r1";
export const fx04BoundaryRecords = Object.freeze([
  makeRecord({
    content: { kind: "absent" },
    eligibility: { state: "blocked", reasonCodes: ["content"] },
  }),
  makeRecord({
    content: { kind: "null" },
    eligibility: { state: "blocked", reasonCodes: ["content"] },
  }),
  makeRecord({
    content: { kind: "empty-string" },
    eligibility: { state: "metadata-only", reasonCodes: ["content"] },
  }),
  makeRecord({
    content: { kind: "empty-collection" },
    eligibility: { state: "blocked", reasonCodes: ["content"] },
  }),
  makeRecord(),
  makeRecord({
    content: { kind: "value", value: 12.5, originalRepresentation: "12.50" },
  }),
  makeRecord({
    content: { kind: "not-available", statusCode: "not-measured" },
    eligibility: { state: "metadata-only", reasonCodes: ["content"] },
  }),
  makeRecord({
    content: { kind: "not-permitted", denialCode: "policy-denied" },
    eligibility: { state: "blocked", reasonCodes: ["content", "rights"] },
  }),
  makeRecord({
    content: {
      kind: "malformed",
      safeRawRepresentation: "unparsed-synthetic-value",
      rawDigest: digest("7"),
    },
    eligibility: { state: "blocked", reasonCodes: ["content"] },
  }),
]);

export const fx12Revision = "FX-12:lab-supplemental@r1-adapter-neutral";
export const fx12BoundaryRecords = Object.freeze([
  makeRecord({
    content: { kind: "empty-string" },
    eligibility: { state: "metadata-only", reasonCodes: ["content"] },
    provenance: provenanceFixtures[1],
  }),
  makeRecord({ provenance: provenanceFixtures[1] }),
  makeRecord({
    content: { kind: "value", value: 18.25, originalRepresentation: "18.25" },
    provenance: provenanceFixtures[1],
  }),
  makeRecord({
    content: { kind: "value", value: 22, originalRepresentation: "22" },
    finality: { state: "nonfinal" },
    eligibility: { state: "metadata-only", reasonCodes: ["finality"] },
    provenance: provenanceFixtures[1],
  }),
  makeRecord({
    content: { kind: "value", value: 24, originalRepresentation: "24" },
    association: {
      state: "ambiguous",
      candidateTargetIdentities: ["sample:synthetic-1", "sample:synthetic-2"],
    },
    eligibility: { state: "blocked", reasonCodes: ["association", "duplicate"] },
    provenance: provenanceFixtures[1],
  }),
  makeRecord({
    content: { kind: "value", value: 31, originalRepresentation: "31" },
    unit: { state: "unsupported", originalUnit: "synthetic-unit" },
    eligibility: { state: "blocked", reasonCodes: ["unit"] },
    provenance: provenanceFixtures[1],
  }),
  makeRecord({
    content: { kind: "value", value: 16, originalRepresentation: "16" },
    association: { state: "unmatched" },
    eligibility: { state: "blocked", reasonCodes: ["association"] },
    provenance: provenanceFixtures[1],
  }),
  makeRecord({
    content: { kind: "value", value: 17, originalRepresentation: "17" },
    association: {
      state: "ambiguous",
      candidateTargetIdentities: ["sample:synthetic-3", "sample:synthetic-4"],
    },
    eligibility: { state: "blocked", reasonCodes: ["association"] },
    provenance: provenanceFixtures[1],
  }),
]);
