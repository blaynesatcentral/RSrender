export const CORPUS_MANIFEST_SCHEMA_VERSION = "rsrender.corpus-manifest.schema.v1" as const;
export const GOLDEN_LOG_CORPUS_VERSION = "rsrender.golden-log-corpus.v1" as const;

export const CORPUS_DIAGNOSTIC_CODES = Object.freeze({
  admissionDigestInvalid: "CORPUS.ADMISSION.DIGEST_INVALID",
  admissionDigestMismatch: "CORPUS.ADMISSION.DIGEST_MISMATCH",
  admissionDigestMissing: "CORPUS.ADMISSION.DIGEST_MISSING",
  admissionDuplicateIdentity: "CORPUS.ADMISSION.DUPLICATE_IDENTITY",
  admissionIdentityMismatch: "CORPUS.ADMISSION.IDENTITY_MISMATCH",
  admissionNotAdmitted: "CORPUS.ADMISSION.NOT_ADMITTED",
  fixtureDuplicateIdentity: "CORPUS.FIXTURE.DUPLICATE_IDENTITY",
  layerMismatch: "CORPUS.FIXTURE.LAYER_MISMATCH",
  manifestDigestInvalid: "CORPUS.MANIFEST.DIGEST_INVALID",
  manifestDigestMismatch: "CORPUS.MANIFEST.DIGEST_MISMATCH",
  manifestDigestMissing: "CORPUS.MANIFEST.DIGEST_MISSING",
  manifestJsonInvalid: "CORPUS.MANIFEST.JSON_INVALID",
  manifestMalformed: "CORPUS.MANIFEST.MALFORMED",
  nonrepresentativeRestrictionMissing: "CORPUS.FIXTURE.NONREPRESENTATIVE_REQUIRED",
  prohibitedOrigin: "CORPUS.FIXTURE.PROHIBITED_ORIGIN",
  repositoryNotApproved: "CORPUS.FIXTURE.REPOSITORY_NOT_APPROVED",
  requiredOracleMissing: "CORPUS.ORACLE.REQUIRED_MISSING",
  unsupportedVersion: "CORPUS.MANIFEST.UNSUPPORTED_VERSION",
} as const);

export type CorpusDiagnosticCode =
  (typeof CORPUS_DIAGNOSTIC_CODES)[keyof typeof CORPUS_DIAGNOSTIC_CODES];

export interface CorpusDiagnostic {
  readonly code: CorpusDiagnosticCode;
  readonly severity: "error";
  readonly affectedIdentity: string;
  readonly fieldPath: string;
  readonly cause: string;
  readonly consequence: string;
}

export interface CorpusManifestTextSource {
  /**
   * Supplies only the already-selected corpus manifest text. The reader has no
   * path, payload, network, package, or restricted-evidence capability.
   */
  readManifestText(): string | Promise<string>;
}

export type CorpusLayerClass =
  "source-snapshot-synthetic" | "render-dataset-synthetic" | "adapter-replay-approved";

export type CorpusAdmissionDisposition =
  | "admitted-canonical"
  | "admitted-stress-only"
  | "restricted-test-only"
  | "pending"
  | "quarantined"
  | "rejected";

export type CorpusOracleState =
  | "decided"
  | "representative-evidence-supported"
  | "representative-unresolved"
  | "evidence-gated"
  | "source-evidence-blocked"
  | "policy-owned"
  | "accepted-uncertainty"
  | "explicitly-deferred"
  | "out-of-scope";

export type DistributionDecision = "approved" | "not-approved" | "not-reviewed" | "not-applicable";

export interface CorpusOracleReference {
  readonly oracleId: string;
  readonly revision: number;
  readonly state: CorpusOracleState;
}

export interface CorpusPartMetadata {
  readonly partId: string;
  readonly mediaType: string;
  readonly semanticLayer: CorpusLayerClass;
  readonly byteLength: number;
  readonly digest: string;
}

export interface CorpusExpectedArtifactMetadata {
  readonly artifactId: string;
  readonly artifactType: string;
  readonly semanticLayer: string;
  readonly formatVersion: string;
  readonly digest: string;
  readonly oracleIds: readonly string[];
}

export interface CorpusAdmissionRecord {
  readonly recordId: string;
  readonly fixtureIdentity: string;
  readonly candidateDigest: string;
  readonly recordDigest: string;
  readonly disposition: CorpusAdmissionDisposition;
  readonly gates: Readonly<Record<string, "passed">>;
}

export interface CorpusFixtureMetadata {
  readonly corpusVersion: typeof GOLDEN_LOG_CORPUS_VERSION;
  readonly fixtureId: string;
  readonly fixtureRevision: number;
  readonly familyId: string;
  readonly title: string;
  readonly purpose: string;
  readonly originClass: string;
  readonly layerClass: CorpusLayerClass;
  readonly oracleStatus: {
    readonly aggregate: CorpusOracleState;
    readonly oracles: readonly CorpusOracleReference[];
  };
  readonly sourceContract: {
    readonly contractId: string;
    readonly schemaVersion: string;
    readonly origin: "synthetic" | "approved-replay";
    readonly captureDigest: string;
  };
  readonly identityRules: {
    readonly namespace: string;
    readonly parentRule: string;
    readonly orderingKeys: readonly string[];
    readonly duplicateIdentityIntent: "forbidden" | "deliberate-diagnostic";
  };
  readonly unitContext: Readonly<Record<string, string>>;
  readonly collectionManifest: readonly Readonly<Record<string, unknown>>[];
  readonly valueStates: readonly string[];
  readonly inputParts: readonly CorpusPartMetadata[];
  readonly expectedArtifacts: readonly CorpusExpectedArtifactMetadata[];
  readonly diagnostics: readonly Readonly<Record<string, unknown>>[];
  readonly workloadParameters: {
    readonly parameterSetId: string;
    readonly representativeLabelAllowed: false;
    readonly values: Readonly<Record<string, number>>;
  };
  readonly privacy: {
    readonly syntheticGenerationDeclared: true;
    readonly prohibitedContentScan: "passed";
    readonly mosaicRiskReview: "passed";
    readonly approvalReference: string;
  };
  readonly rights: {
    readonly repositoryUseStatus: "approved";
    readonly approvalReference: string;
    readonly assets: readonly Readonly<Record<string, unknown>>[];
  };
  readonly distributionClass: Readonly<Record<string, DistributionDecision>>;
  readonly integrityClass:
    "expected-valid" | "expected-diagnostic" | "expected-safe-rejection" | "stress-only";
  readonly admissionDisposition: CorpusAdmissionDisposition;
  readonly determinism: Readonly<Record<string, unknown>>;
  readonly dependencies: {
    readonly upstreamEvidence: readonly string[];
    readonly downstreamTickets: readonly string[];
  };
  readonly limitations: readonly string[];
  readonly admissionRecord: CorpusAdmissionRecord;
}

export interface AdmittedCorpusManifest {
  readonly schemaVersion: typeof CORPUS_MANIFEST_SCHEMA_VERSION;
  readonly corpusVersion: typeof GOLDEN_LOG_CORPUS_VERSION;
  readonly corpusRevision: number;
  readonly manifestDigest: string;
  readonly oracleRevisions: readonly CorpusOracleReference[];
  readonly representativeLabelAllowed: false;
  readonly fixtures: readonly CorpusFixtureMetadata[];
  readonly claimRestrictions: {
    readonly oracleId: "OA-REP-001";
    readonly syntheticCoverageOnly: true;
    readonly representativeClaimAllowed: false;
    readonly frequencyClaimAllowed: false;
    readonly supportedLimitClaimAllowed: false;
  };
}

export type CorpusManifestReadResult =
  | { readonly ok: true; readonly manifest: AdmittedCorpusManifest }
  | { readonly ok: false; readonly diagnostics: readonly CorpusDiagnostic[] };

type Schema =
  | { readonly kind: "array"; readonly item: Schema; readonly minLength?: number }
  | { readonly kind: "boolean"; readonly const?: boolean }
  | { readonly kind: "integer"; readonly minimum?: number }
  | { readonly kind: "number"; readonly minimum?: number }
  | {
      readonly kind: "object";
      readonly properties: Readonly<Record<string, Schema>>;
    }
  | { readonly kind: "record"; readonly value: Schema }
  | { readonly kind: "string"; readonly values?: readonly string[] };

const stringSchema: Schema = { kind: "string" };
const positiveIntegerSchema: Schema = { kind: "integer", minimum: 1 };
const nonnegativeIntegerSchema: Schema = { kind: "integer", minimum: 0 };
const digestSchema: Schema = { kind: "string" };

const oracleStates = Object.freeze([
  "decided",
  "representative-evidence-supported",
  "representative-unresolved",
  "evidence-gated",
  "source-evidence-blocked",
  "policy-owned",
  "accepted-uncertainty",
  "explicitly-deferred",
  "out-of-scope",
] as const);

const layerClasses = Object.freeze([
  "source-snapshot-synthetic",
  "render-dataset-synthetic",
  "adapter-replay-approved",
] as const);

const dispositions = Object.freeze([
  "admitted-canonical",
  "admitted-stress-only",
  "restricted-test-only",
  "pending",
  "quarantined",
  "rejected",
] as const);

const distributionDecisions = Object.freeze([
  "approved",
  "not-approved",
  "not-reviewed",
  "not-applicable",
] as const);

const requiredAdmissionGateNames = Object.freeze([
  "A1-synthetic-origin",
  "A2-prohibited-content-scan",
  "A3-mosaic-review",
  "A4-layer-eligibility",
  "A5-provenance-completeness",
  "A6-asset-rights",
  "A7-non-executable-content",
  "A8-integrity-resource-bounds",
  "A9-deterministic-rebuild",
  "A10-derivative-release",
] as const);

const oracleReferenceSchema: Schema = {
  kind: "object",
  properties: {
    oracleId: stringSchema,
    revision: positiveIntegerSchema,
    state: { kind: "string", values: oracleStates },
  },
};

const partSchema: Schema = {
  kind: "object",
  properties: {
    partId: stringSchema,
    mediaType: stringSchema,
    semanticLayer: { kind: "string", values: layerClasses },
    byteLength: nonnegativeIntegerSchema,
    digest: digestSchema,
  },
};

const expectedArtifactSchema: Schema = {
  kind: "object",
  properties: {
    artifactId: stringSchema,
    artifactType: stringSchema,
    semanticLayer: stringSchema,
    formatVersion: stringSchema,
    digest: digestSchema,
    oracleIds: { kind: "array", item: stringSchema, minLength: 1 },
  },
};

const expectedDiagnosticSchema: Schema = {
  kind: "object",
  properties: {
    code: stringSchema,
    severityState: stringSchema,
    affectedIdentity: stringSchema,
    cause: stringSchema,
    consequence: stringSchema,
    suppressionEligibilityState: stringSchema,
    owner: stringSchema,
  },
};

const collectionSchema: Schema = {
  kind: "object",
  properties: {
    collectionId: stringSchema,
    required: { kind: "boolean" },
    state: { kind: "string", values: ["success", "empty", "failed"] },
    recordCount: nonnegativeIntegerSchema,
    paginationState: stringSchema,
    failureClass: stringSchema,
  },
};

const rightsAssetSchema: Schema = {
  kind: "object",
  properties: {
    assetId: stringSchema,
    origin: stringSchema,
    author: stringSchema,
    producer: stringSchema,
    licenseSpdx: stringSchema,
    embeddingState: stringSchema,
    redistributionState: stringSchema,
    modificationState: stringSchema,
    digest: digestSchema,
    approvalReference: stringSchema,
    repositoryUseStatus: { kind: "string", values: ["approved"] },
  },
};

const fixtureSchema: Schema = {
  kind: "object",
  properties: {
    corpusVersion: stringSchema,
    fixtureId: stringSchema,
    fixtureRevision: positiveIntegerSchema,
    familyId: stringSchema,
    title: stringSchema,
    purpose: stringSchema,
    originClass: {
      kind: "string",
      values: [
        "independently-authored-synthetic",
        "deterministic-generator-output",
        "approved-open-licensed-asset",
        "restricted-approved-exception",
        "rejected",
      ],
    },
    layerClass: { kind: "string", values: layerClasses },
    oracleStatus: {
      kind: "object",
      properties: {
        aggregate: { kind: "string", values: oracleStates },
        oracles: { kind: "array", item: oracleReferenceSchema, minLength: 1 },
      },
    },
    sourceContract: {
      kind: "object",
      properties: {
        contractId: stringSchema,
        schemaVersion: stringSchema,
        origin: { kind: "string", values: ["synthetic", "approved-replay"] },
        captureDigest: stringSchema,
      },
    },
    identityRules: {
      kind: "object",
      properties: {
        namespace: stringSchema,
        parentRule: stringSchema,
        orderingKeys: { kind: "array", item: stringSchema },
        duplicateIdentityIntent: {
          kind: "string",
          values: ["forbidden", "deliberate-diagnostic"],
        },
      },
    },
    unitContext: {
      kind: "object",
      properties: {
        depth: stringSchema,
        length: stringSchema,
        pressure: stringSchema,
        percentage: stringSchema,
        elevation: stringSchema,
        coordinate: stringSchema,
        timeZone: stringSchema,
      },
    },
    collectionManifest: { kind: "array", item: collectionSchema },
    valueStates: {
      kind: "array",
      item: {
        kind: "string",
        values: [
          "absent",
          "null",
          "empty-string",
          "empty-array",
          "numeric-zero",
          "not_available",
          "not_permitted",
          "malformed",
        ],
      },
    },
    inputParts: { kind: "array", item: partSchema, minLength: 1 },
    expectedArtifacts: { kind: "array", item: expectedArtifactSchema, minLength: 1 },
    diagnostics: { kind: "array", item: expectedDiagnosticSchema },
    workloadParameters: {
      kind: "object",
      properties: {
        parameterSetId: stringSchema,
        representativeLabelAllowed: { kind: "boolean", const: false },
        values: { kind: "record", value: { kind: "number", minimum: 0 } },
      },
    },
    privacy: {
      kind: "object",
      properties: {
        syntheticGenerationDeclared: { kind: "boolean", const: true },
        prohibitedContentScan: { kind: "string", values: ["passed"] },
        mosaicRiskReview: { kind: "string", values: ["passed"] },
        approvalReference: stringSchema,
      },
    },
    rights: {
      kind: "object",
      properties: {
        repositoryUseStatus: { kind: "string", values: ["approved"] },
        approvalReference: stringSchema,
        assets: { kind: "array", item: rightsAssetSchema },
      },
    },
    distributionClass: {
      kind: "object",
      properties: {
        repository: { kind: "string", values: distributionDecisions },
        internalTest: { kind: "string", values: distributionDecisions },
        editableTemplateProject: { kind: "string", values: distributionDecisions },
        generatedPdf: { kind: "string", values: distributionDecisions },
        productBundle: { kind: "string", values: distributionDecisions },
        commercialDistribution: { kind: "string", values: distributionDecisions },
        buyerTransfer: { kind: "string", values: distributionDecisions },
      },
    },
    integrityClass: {
      kind: "string",
      values: ["expected-valid", "expected-diagnostic", "expected-safe-rejection", "stress-only"],
    },
    admissionDisposition: { kind: "string", values: dispositions },
    determinism: {
      kind: "object",
      properties: {
        canonicalization: { kind: "string", values: ["JCS"] },
        hashAlgorithm: { kind: "string", values: ["sha256"] },
        generatorVersion: stringSchema,
        seed: stringSchema,
        environmentSensitiveInputs: { kind: "array", item: stringSchema },
        claim: { kind: "string", values: ["semantic", "byte-and-semantic"] },
      },
    },
    dependencies: {
      kind: "object",
      properties: {
        upstreamEvidence: { kind: "array", item: stringSchema },
        downstreamTickets: { kind: "array", item: stringSchema },
      },
    },
    limitations: { kind: "array", item: stringSchema, minLength: 1 },
    admissionRecord: {
      kind: "object",
      properties: {
        recordId: stringSchema,
        fixtureIdentity: stringSchema,
        candidateDigest: digestSchema,
        recordDigest: digestSchema,
        disposition: { kind: "string", values: dispositions },
        gates: {
          kind: "object",
          properties: Object.fromEntries(
            requiredAdmissionGateNames.map((name) => [
              name,
              { kind: "string", values: ["passed"] },
            ]),
          ),
        },
      },
    },
  },
};

const manifestSchema: Schema = {
  kind: "object",
  properties: {
    schemaVersion: stringSchema,
    corpusVersion: stringSchema,
    corpusRevision: positiveIntegerSchema,
    manifestDigest: digestSchema,
    oracleRevisions: { kind: "array", item: oracleReferenceSchema, minLength: 2 },
    representativeLabelAllowed: { kind: "boolean", const: false },
    fixtures: { kind: "array", item: fixtureSchema, minLength: 1 },
  },
};

interface ValidationContext {
  readonly diagnostics: Map<string, CorpusDiagnostic>;
}

interface UntrustedRecord extends Record<string, unknown> {
  readonly admissionDisposition?: unknown;
  readonly admissionRecord?: unknown;
  readonly candidateDigest?: unknown;
  readonly digest?: unknown;
  readonly distributionClass?: unknown;
  readonly expectedArtifacts?: unknown;
  readonly familyId?: unknown;
  readonly fixtureId?: unknown;
  readonly fixtureIdentity?: unknown;
  readonly fixtureRevision?: unknown;
  readonly fixtures?: unknown;
  readonly inputParts?: unknown;
  readonly integrityClass?: unknown;
  readonly internalTest?: unknown;
  readonly layerClass?: unknown;
  readonly limitations?: unknown;
  readonly manifestDigest?: unknown;
  readonly mosaicRiskReview?: unknown;
  readonly oracleId?: unknown;
  readonly oracleRevisions?: unknown;
  readonly oracleStatus?: unknown;
  readonly oracles?: unknown;
  readonly origin?: unknown;
  readonly originClass?: unknown;
  readonly partId?: unknown;
  readonly privacy?: unknown;
  readonly prohibitedContentScan?: unknown;
  readonly recordDigest?: unknown;
  readonly recordId?: unknown;
  readonly repository?: unknown;
  readonly repositoryUseStatus?: unknown;
  readonly representativeLabelAllowed?: unknown;
  readonly rights?: unknown;
  readonly schemaVersion?: unknown;
  readonly semanticLayer?: unknown;
  readonly sourceContract?: unknown;
  readonly syntheticGenerationDeclared?: unknown;
  readonly workloadParameters?: unknown;
  readonly corpusVersion?: unknown;
  readonly disposition?: unknown;
}

function isRecord(value: unknown): value is UntrustedRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addDiagnostic(
  context: ValidationContext,
  code: CorpusDiagnosticCode,
  fieldPath: string,
  affectedIdentity: string,
  cause: string,
  consequence: string,
): void {
  const key = `${code}\u0000${fieldPath}\u0000${affectedIdentity}`;
  if (!context.diagnostics.has(key)) {
    context.diagnostics.set(
      key,
      Object.freeze({ code, severity: "error", affectedIdentity, fieldPath, cause, consequence }),
    );
  }
}

function digestCodeFor(path: string, missing: boolean): CorpusDiagnosticCode | undefined {
  if (path === "$.manifestDigest") {
    return missing
      ? CORPUS_DIAGNOSTIC_CODES.manifestDigestMissing
      : CORPUS_DIAGNOSTIC_CODES.manifestDigestInvalid;
  }
  if (
    path.endsWith(".admissionRecord.recordDigest") ||
    path.endsWith(".admissionRecord.candidateDigest")
  ) {
    return missing
      ? CORPUS_DIAGNOSTIC_CODES.admissionDigestMissing
      : CORPUS_DIAGNOSTIC_CODES.admissionDigestInvalid;
  }
  return undefined;
}

function validateSchema(
  value: unknown,
  schema: Schema,
  path: string,
  context: ValidationContext,
): void {
  switch (schema.kind) {
    case "array": {
      if (!Array.isArray(value)) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
          path,
          "corpus-manifest",
          "Required array metadata is absent or has the wrong type.",
          "The manifest is rejected before fixture metadata is admitted.",
        );
        return;
      }
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
          path,
          "corpus-manifest",
          "The metadata array does not contain the required minimum entries.",
          "The manifest is rejected before fixture metadata is admitted.",
        );
      }
      value.forEach((entry, index) =>
        validateSchema(entry, schema.item, `${path}[${index}]`, context),
      );
      return;
    }
    case "boolean": {
      if (typeof value !== "boolean" || (schema.const !== undefined && value !== schema.const)) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
          path,
          "corpus-manifest",
          "Required boolean metadata is absent, has the wrong type, or violates its fixed value.",
          "The manifest is rejected before fixture metadata is admitted.",
        );
      }
      return;
    }
    case "integer": {
      if (
        typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        (schema.minimum !== undefined && value < schema.minimum)
      ) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
          path,
          "corpus-manifest",
          "Required integer metadata is absent, unsafe, or outside its allowed range.",
          "The manifest is rejected before fixture metadata is admitted.",
        );
      }
      return;
    }
    case "number": {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        (schema.minimum !== undefined && value < schema.minimum)
      ) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
          path,
          "corpus-manifest",
          "Required numeric metadata is absent, non-finite, or outside its allowed range.",
          "The manifest is rejected before fixture metadata is admitted.",
        );
      }
      return;
    }
    case "object": {
      if (!isRecord(value)) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
          path,
          "corpus-manifest",
          "Required object metadata is absent or has the wrong type.",
          "The manifest is rejected before fixture metadata is admitted.",
        );
        return;
      }
      const expectedKeys = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(value)) {
        if (!expectedKeys.has(key)) {
          addDiagnostic(
            context,
            CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
            `${path}.${key}`,
            "corpus-manifest",
            "Undeclared metadata is not admitted by this schema version.",
            "The manifest is rejected; undeclared content is never materialized as fixture data.",
          );
        }
      }
      for (const [key, propertySchema] of Object.entries(schema.properties)) {
        const propertyPath = `${path}.${key}`;
        if (!Object.hasOwn(value, key)) {
          const digestCode = digestCodeFor(propertyPath, true);
          addDiagnostic(
            context,
            digestCode ?? CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
            propertyPath,
            "corpus-manifest",
            digestCode === undefined
              ? "Required metadata is missing."
              : "The required integrity digest is missing.",
            "The manifest is rejected before fixture metadata is admitted.",
          );
          continue;
        }
        validateSchema(value[key], propertySchema, propertyPath, context);
      }
      return;
    }
    case "record": {
      if (!isRecord(value)) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
          path,
          "corpus-manifest",
          "Required keyed metadata is absent or has the wrong type.",
          "The manifest is rejected before fixture metadata is admitted.",
        );
        return;
      }
      for (const [key, entry] of Object.entries(value)) {
        if (!/^[A-Za-z][A-Za-z0-9._-]*$/u.test(key)) {
          addDiagnostic(
            context,
            CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
            `${path}.${key}`,
            "corpus-manifest",
            "A keyed metadata name is outside the inert identifier grammar.",
            "The manifest is rejected before fixture metadata is admitted.",
          );
        }
        validateSchema(entry, schema.value, `${path}.${key}`, context);
      }
      return;
    }
    case "string": {
      const digestCode = digestCodeFor(path, false);
      if (typeof value !== "string" || value.length === 0) {
        addDiagnostic(
          context,
          digestCode ?? CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
          path,
          "corpus-manifest",
          digestCode === undefined
            ? "Required string metadata is absent or empty."
            : "The required integrity digest is absent or malformed.",
          "The manifest is rejected before fixture metadata is admitted.",
        );
        return;
      }
      if (schema.values !== undefined && !schema.values.includes(value)) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
          path,
          "corpus-manifest",
          "Metadata contains a value outside the controlled vocabulary.",
          "The manifest is rejected before fixture metadata is admitted.",
        );
      }
    }
  }
}

function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Non-finite numbers are not canonical JSON.");
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalize(entry)).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  }
  throw new TypeError("Only JSON values can be canonicalized.");
}

async function canonicalDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalize(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)]
    .map((octet) => octet.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}

function withoutKey(record: Record<string, unknown>, keyToOmit: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== keyToOmit));
}

/** Computes the algorithm-qualified digest over a manifest with `manifestDigest` omitted. */
export function computeCorpusManifestDigest(manifest: unknown): Promise<string> {
  if (!isRecord(manifest)) throw new TypeError("A corpus manifest must be an object.");
  return canonicalDigest(withoutKey(manifest, "manifestDigest"));
}

/** Computes the algorithm-qualified digest over an admission record with `recordDigest` omitted. */
export function computeCorpusAdmissionRecordDigest(record: unknown): Promise<string> {
  if (!isRecord(record)) throw new TypeError("A corpus admission record must be an object.");
  return canonicalDigest(withoutKey(record, "recordDigest"));
}

/** Computes the exact candidate digest over fixture metadata with `admissionRecord` omitted. */
export function computeCorpusFixtureCandidateDigest(fixture: unknown): Promise<string> {
  if (!isRecord(fixture)) throw new TypeError("Corpus fixture metadata must be an object.");
  return canonicalDigest(withoutKey(fixture, "admissionRecord"));
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value);
}

function fixtureIdentity(fixture: UntrustedRecord): string {
  const id = typeof fixture.fixtureId === "string" ? fixture.fixtureId : "unknown-fixture";
  const revision = Number.isSafeInteger(fixture.fixtureRevision)
    ? fixture.fixtureRevision
    : "unknown";
  return `${id}@r${String(revision)}`;
}

async function validateSemanticRules(
  manifest: UntrustedRecord,
  context: ValidationContext,
): Promise<void> {
  if (
    manifest.schemaVersion !== CORPUS_MANIFEST_SCHEMA_VERSION ||
    manifest.corpusVersion !== GOLDEN_LOG_CORPUS_VERSION
  ) {
    addDiagnostic(
      context,
      CORPUS_DIAGNOSTIC_CODES.unsupportedVersion,
      "$.schemaVersion",
      "corpus-manifest",
      "The schema or logical corpus version is not supported by this reader.",
      "The manifest is refused without admitting fixture metadata.",
    );
  }

  if (manifest.representativeLabelAllowed !== false) {
    addDiagnostic(
      context,
      CORPUS_DIAGNOSTIC_CODES.nonrepresentativeRestrictionMissing,
      "$.representativeLabelAllowed",
      "corpus-manifest",
      "OA-REP-001 requires the v1 corpus to forbid representative labels.",
      "The manifest is rejected rather than enabling a representative or supported-limit claim.",
    );
  }

  if (!isDigest(manifest.manifestDigest)) {
    if (Object.hasOwn(manifest, "manifestDigest")) {
      addDiagnostic(
        context,
        CORPUS_DIAGNOSTIC_CODES.manifestDigestInvalid,
        "$.manifestDigest",
        "corpus-manifest",
        "The manifest digest is not an algorithm-qualified lowercase SHA-256 value.",
        "The manifest is rejected before fixture metadata is admitted.",
      );
    }
  } else {
    try {
      if ((await computeCorpusManifestDigest(manifest)) !== manifest.manifestDigest) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.manifestDigestMismatch,
          "$.manifestDigest",
          "corpus-manifest",
          "The declared manifest digest does not match the canonical metadata.",
          "The manifest is rejected before fixture metadata is admitted.",
        );
      }
    } catch {
      addDiagnostic(
        context,
        CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
        "$",
        "corpus-manifest",
        "The manifest cannot be represented as canonical JSON.",
        "The manifest is rejected before fixture metadata is admitted.",
      );
    }
  }

  const requiredTopLevelOracles = new Set(["OA-GOLD-001", "OA-REP-001"]);
  if (Array.isArray(manifest.oracleRevisions)) {
    for (const oracle of manifest.oracleRevisions) {
      if (isRecord(oracle) && typeof oracle.oracleId === "string") {
        requiredTopLevelOracles.delete(oracle.oracleId);
      }
    }
  }
  for (const oracleId of requiredTopLevelOracles) {
    addDiagnostic(
      context,
      CORPUS_DIAGNOSTIC_CODES.requiredOracleMissing,
      "$.oracleRevisions",
      "corpus-manifest",
      `Required corpus oracle ${oracleId} is not declared.`,
      "The manifest cannot establish its golden-evidence and nonrepresentativeness restrictions.",
    );
  }

  if (!Array.isArray(manifest.fixtures)) return;
  const fixtureIdentities = new Set<string>();
  const admissionIdentities = new Set<string>();

  for (const [index, entry] of manifest.fixtures.entries()) {
    if (!isRecord(entry)) return;
    const identity = fixtureIdentity(entry);
    const path = `$.fixtures[${index}]`;

    if (fixtureIdentities.has(identity)) {
      addDiagnostic(
        context,
        CORPUS_DIAGNOSTIC_CODES.fixtureDuplicateIdentity,
        path,
        identity,
        "The fixture identity and revision occur more than once.",
        "The complete manifest is rejected; no first/last-entry precedence is applied.",
      );
    }
    fixtureIdentities.add(identity);

    if (
      entry.corpusVersion !== GOLDEN_LOG_CORPUS_VERSION ||
      typeof entry.fixtureId !== "string" ||
      !/^fx-(0[1-9]|1[0-4])(?:[ab])?-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.fixtureId) ||
      typeof entry.familyId !== "string" ||
      !/^FX-(0[1-9]|1[0-4])$/u.test(entry.familyId)
    ) {
      addDiagnostic(
        context,
        entry.corpusVersion === GOLDEN_LOG_CORPUS_VERSION
          ? CORPUS_DIAGNOSTIC_CODES.manifestMalformed
          : CORPUS_DIAGNOSTIC_CODES.unsupportedVersion,
        `${path}.fixtureId`,
        identity,
        "The v1 fixture or family identity is outside the accepted FX-01 through FX-14 grammar.",
        "The manifest is rejected before fixture metadata is admitted.",
      );
    } else {
      const fixtureFamilyNumber = /^fx-(\d{2})/u.exec(entry.fixtureId)?.[1];
      if (`FX-${fixtureFamilyNumber ?? ""}` !== entry.familyId) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.admissionIdentityMismatch,
          `${path}.familyId`,
          identity,
          "The fixture ID and family ID do not identify the same v1 family.",
          "The manifest is rejected instead of silently reassigning the fixture.",
        );
      }
    }

    if (
      entry.originClass !== "independently-authored-synthetic" &&
      entry.originClass !== "deterministic-generator-output"
    ) {
      addDiagnostic(
        context,
        CORPUS_DIAGNOSTIC_CODES.prohibitedOrigin,
        `${path}.originClass`,
        identity,
        "The candidate is not an independently synthetic repository-safe fixture origin.",
        "The candidate is rejected and no restricted, production-derived, or asset content is opened.",
      );
    }

    if (entry.layerClass === "adapter-replay-approved") {
      addDiagnostic(
        context,
        CORPUS_DIAGNOSTIC_CODES.layerMismatch,
        `${path}.layerClass`,
        identity,
        "No adapter replay has been admitted into the v1 repository-safe baseline.",
        "The candidate is rejected rather than implying positive source-contract evidence.",
      );
    }

    if (isRecord(entry.sourceContract)) {
      const expectedOrigin =
        entry.layerClass === "adapter-replay-approved" ? "approved-replay" : "synthetic";
      if (entry.sourceContract.origin !== expectedOrigin) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.layerMismatch,
          `${path}.sourceContract.origin`,
          identity,
          "The source-contract origin does not match the declared evidence layer.",
          "The candidate is rejected rather than broadening its evidence claim.",
        );
      }
    }

    if (Array.isArray(entry.inputParts)) {
      const partIdentities = new Set<string>();
      entry.inputParts.forEach((part, partIndex) => {
        if (!isRecord(part)) return;
        const partPath = `${path}.inputParts[${partIndex}]`;
        if (typeof part.partId === "string") {
          if (partIdentities.has(part.partId)) {
            addDiagnostic(
              context,
              CORPUS_DIAGNOSTIC_CODES.fixtureDuplicateIdentity,
              `${partPath}.partId`,
              identity,
              "An input-part identity occurs more than once within the fixture.",
              "The fixture is rejected; no duplicate-part precedence is applied.",
            );
          }
          partIdentities.add(part.partId);
        }
        if (part.semanticLayer !== entry.layerClass) {
          addDiagnostic(
            context,
            CORPUS_DIAGNOSTIC_CODES.layerMismatch,
            `${partPath}.semanticLayer`,
            identity,
            "An input part claims a different semantic layer than its fixture.",
            "The fixture is rejected rather than using one layer to prove another.",
          );
        }
        if (!isDigest(part.digest)) {
          addDiagnostic(
            context,
            CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
            `${partPath}.digest`,
            identity,
            "An input-part digest is not an algorithm-qualified lowercase SHA-256 value.",
            "The fixture is rejected before part metadata is returned.",
          );
        }
      });
    }

    if (Array.isArray(entry.expectedArtifacts)) {
      entry.expectedArtifacts.forEach((artifact, artifactIndex) => {
        if (isRecord(artifact) && !isDigest(artifact.digest)) {
          addDiagnostic(
            context,
            CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
            `${path}.expectedArtifacts[${artifactIndex}].digest`,
            identity,
            "An expected-artifact digest is not an algorithm-qualified lowercase SHA-256 value.",
            "The fixture is rejected before golden metadata is returned.",
          );
        }
      });
    }

    if (
      entry.admissionDisposition !== "admitted-canonical" &&
      entry.admissionDisposition !== "admitted-stress-only"
    ) {
      addDiagnostic(
        context,
        CORPUS_DIAGNOSTIC_CODES.admissionNotAdmitted,
        `${path}.admissionDisposition`,
        identity,
        "The exact fixture revision is prohibited, pending, quarantined, restricted, or rejected.",
        "The complete manifest is rejected and the candidate is not returned as golden metadata.",
      );
    }

    if (
      entry.admissionDisposition === "admitted-stress-only" &&
      (entry.familyId !== "FX-14" || entry.integrityClass !== "stress-only")
    ) {
      addDiagnostic(
        context,
        CORPUS_DIAGNOSTIC_CODES.admissionNotAdmitted,
        `${path}.admissionDisposition`,
        identity,
        "The stress-only disposition is declared outside the FX-14 stress family and integrity class.",
        "The candidate is rejected rather than broadening stress evidence into canonical truth.",
      );
    }

    if (
      !isRecord(entry.distributionClass) ||
      entry.distributionClass.repository !== "approved" ||
      entry.distributionClass.internalTest !== "approved" ||
      !isRecord(entry.privacy) ||
      entry.privacy.syntheticGenerationDeclared !== true ||
      entry.privacy.prohibitedContentScan !== "passed" ||
      entry.privacy.mosaicRiskReview !== "passed" ||
      !isRecord(entry.rights) ||
      entry.rights.repositoryUseStatus !== "approved"
    ) {
      addDiagnostic(
        context,
        CORPUS_DIAGNOSTIC_CODES.repositoryNotApproved,
        path,
        identity,
        "Repository/internal-test, privacy, provenance, or rights admission is not affirmatively approved.",
        "The complete manifest is rejected and the fixture metadata remains unavailable.",
      );
    }

    if (
      !isRecord(entry.workloadParameters) ||
      entry.workloadParameters.representativeLabelAllowed !== false ||
      !Array.isArray(entry.limitations) ||
      !entry.limitations.includes("OA-REP-001") ||
      !entry.limitations.includes("not-representative") ||
      !entry.limitations.includes("not-a-supported-limit")
    ) {
      addDiagnostic(
        context,
        CORPUS_DIAGNOSTIC_CODES.nonrepresentativeRestrictionMissing,
        `${path}.limitations`,
        identity,
        "The fixture does not retain all mandatory OA-REP-001 nonrepresentativeness restrictions.",
        "The fixture is rejected rather than supporting representative, frequency, or limit claims.",
      );
    }

    const fixtureOracles =
      isRecord(entry.oracleStatus) && Array.isArray(entry.oracleStatus.oracles)
        ? entry.oracleStatus.oracles
        : [];
    for (const requiredOracleId of ["OA-GOLD-001", "OA-REP-001"]) {
      if (
        !fixtureOracles.some((oracle) => isRecord(oracle) && oracle.oracleId === requiredOracleId)
      ) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.requiredOracleMissing,
          `${path}.oracleStatus.oracles`,
          identity,
          `Required fixture oracle ${requiredOracleId} is not declared.`,
          "The fixture cannot establish its evidence-layer or nonrepresentativeness restrictions.",
        );
      }
    }

    if (!isRecord(entry.admissionRecord)) return;
    const admission = entry.admissionRecord;
    if (typeof admission.recordId === "string") {
      if (admissionIdentities.has(admission.recordId)) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.admissionDuplicateIdentity,
          `${path}.admissionRecord.recordId`,
          identity,
          "The admission-record identity occurs more than once.",
          "The complete manifest is rejected; admission is never inferred by position.",
        );
      }
      admissionIdentities.add(admission.recordId);
    }

    if (
      admission.fixtureIdentity !== identity ||
      admission.disposition !== entry.admissionDisposition
    ) {
      addDiagnostic(
        context,
        CORPUS_DIAGNOSTIC_CODES.admissionIdentityMismatch,
        `${path}.admissionRecord`,
        identity,
        "The admission record does not identify the exact fixture revision and disposition.",
        "The fixture is rejected rather than inheriting another candidate's admission.",
      );
    }

    if (!isDigest(admission.candidateDigest)) {
      if (Object.hasOwn(admission, "candidateDigest")) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.admissionDigestInvalid,
          `${path}.admissionRecord.candidateDigest`,
          identity,
          "The exact-candidate digest is not an algorithm-qualified lowercase SHA-256 value.",
          "The fixture is rejected before admission metadata is returned.",
        );
      }
    } else {
      try {
        if ((await computeCorpusFixtureCandidateDigest(entry)) !== admission.candidateDigest) {
          addDiagnostic(
            context,
            CORPUS_DIAGNOSTIC_CODES.admissionDigestMismatch,
            `${path}.admissionRecord.candidateDigest`,
            identity,
            "The admission record does not bind the exact fixture candidate metadata.",
            "The fixture is rejected because admission cannot be inherited after a content change.",
          );
        }
      } catch {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
          path,
          identity,
          "The fixture candidate cannot be represented as canonical JSON.",
          "The fixture is rejected before admission metadata is returned.",
        );
      }
    }

    if (!isDigest(admission.recordDigest)) {
      if (Object.hasOwn(admission, "recordDigest")) {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.admissionDigestInvalid,
          `${path}.admissionRecord.recordDigest`,
          identity,
          "The admission-record digest is not an algorithm-qualified lowercase SHA-256 value.",
          "The fixture is rejected before admission metadata is returned.",
        );
      }
    } else {
      try {
        if ((await computeCorpusAdmissionRecordDigest(admission)) !== admission.recordDigest) {
          addDiagnostic(
            context,
            CORPUS_DIAGNOSTIC_CODES.admissionDigestMismatch,
            `${path}.admissionRecord.recordDigest`,
            identity,
            "The admission-record digest does not match its canonical metadata.",
            "The fixture is rejected rather than inheriting unverifiable admission.",
          );
        }
      } catch {
        addDiagnostic(
          context,
          CORPUS_DIAGNOSTIC_CODES.manifestMalformed,
          `${path}.admissionRecord`,
          identity,
          "The admission record cannot be represented as canonical JSON.",
          "The fixture is rejected before admission metadata is returned.",
        );
      }
    }
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function sortedDiagnostics(context: ValidationContext): readonly CorpusDiagnostic[] {
  return Object.freeze(
    [...context.diagnostics.values()].sort(
      (left, right) =>
        left.code.localeCompare(right.code) ||
        left.affectedIdentity.localeCompare(right.affectedIdentity) ||
        left.fieldPath.localeCompare(right.fieldPath),
    ),
  );
}

/**
 * Reads and validates one metadata-only corpus manifest. The only authority the
 * reader receives is `readManifestText`; it cannot open fixture parts, paths,
 * packages, production data, network resources, or restricted go-bys.
 */
export async function readAdmittedCorpusManifest(
  source: CorpusManifestTextSource,
): Promise<CorpusManifestReadResult> {
  const manifestText = await source.readManifestText();
  const context: ValidationContext = { diagnostics: new Map() };
  let parsed: unknown;

  try {
    parsed = JSON.parse(manifestText) as unknown;
  } catch {
    addDiagnostic(
      context,
      CORPUS_DIAGNOSTIC_CODES.manifestJsonInvalid,
      "$",
      "corpus-manifest",
      "The supplied manifest is not valid JSON.",
      "The input is rejected without reading any fixture or evidence payload.",
    );
    return deepFreeze({ ok: false, diagnostics: sortedDiagnostics(context) });
  }

  validateSchema(parsed, manifestSchema, "$", context);
  if (isRecord(parsed)) await validateSemanticRules(parsed, context);

  if (context.diagnostics.size > 0 || !isRecord(parsed)) {
    return deepFreeze({ ok: false, diagnostics: sortedDiagnostics(context) });
  }

  const admitted = {
    ...parsed,
    claimRestrictions: {
      oracleId: "OA-REP-001",
      syntheticCoverageOnly: true,
      representativeClaimAllowed: false,
      frequencyClaimAllowed: false,
      supportedLimitClaimAllowed: false,
    },
  } as unknown as AdmittedCorpusManifest;
  return deepFreeze({ ok: true, manifest: admitted });
}
