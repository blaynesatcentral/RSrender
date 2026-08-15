export const EVIDENCE_MANIFEST_SCHEMA_VERSION = "rsrender.evidence-manifest.v1" as const;

export const EVIDENCE_RESULT_STATES = Object.freeze([
  "METHOD_NOT_RUN",
  "BLOCKED",
  "PASS",
  "FAIL",
  "INVALID",
  "APPROVED",
  "NOT_APPROVED",
] as const);

export type EvidenceResultState = (typeof EVIDENCE_RESULT_STATES)[number];
export type EvidenceDecisionClass = "technical" | "organizational";
export type EvidenceReleaseContribution = "technical-pass" | "organizational-approval" | "none";

export const EVIDENCE_DIAGNOSTIC_CODES = Object.freeze({
  custodyProhibited: "EVIDENCE.CUSTODY.PROHIBITED",
  digestInvalid: "EVIDENCE.MANIFEST.DIGEST_INVALID",
  digestMismatch: "EVIDENCE.MANIFEST.DIGEST_MISMATCH",
  digestMissing: "EVIDENCE.MANIFEST.DIGEST_MISSING",
  jsonInvalid: "EVIDENCE.MANIFEST.JSON_INVALID",
  malformed: "EVIDENCE.MANIFEST.MALFORMED",
  requiredFieldMissing: "EVIDENCE.MANIFEST.REQUIRED_FIELD_MISSING",
  resultSemantics: "EVIDENCE.RESULT.SEMANTICS_INVALID",
  unknownField: "EVIDENCE.MANIFEST.UNKNOWN_FIELD",
  unsupportedVersion: "EVIDENCE.MANIFEST.UNSUPPORTED_VERSION",
  privacyProhibitedField: "EVIDENCE.PRIVACY.PROHIBITED_FIELD",
  privacyProhibitedValue: "EVIDENCE.PRIVACY.PROHIBITED_VALUE",
  wrongType: "EVIDENCE.MANIFEST.WRONG_TYPE",
} as const);

export type EvidenceDiagnosticCode =
  (typeof EVIDENCE_DIAGNOSTIC_CODES)[keyof typeof EVIDENCE_DIAGNOSTIC_CODES];

export interface EvidenceManifestDiagnostic {
  readonly code: EvidenceDiagnosticCode;
  readonly path: string;
  readonly cause: string;
  readonly consequence: string;
}

export interface EvidenceResultRecord {
  readonly state: EvidenceResultState;
  readonly decisionClass: EvidenceDecisionClass;
  readonly releaseContribution: EvidenceReleaseContribution;
  readonly methodDefined: boolean;
  readonly qualifyingEvidenceExecuted: boolean;
  readonly requiredRepetitions: number;
  readonly completedRepetitions: number;
  readonly blockers: readonly string[];
  readonly repetitions: readonly {
    readonly repetitionId: string;
    readonly state: "PASS" | "FAIL" | "INVALID";
    readonly artifactRefs: readonly string[];
  }[];
  readonly failures: readonly {
    readonly code: string;
    readonly repetitionId: string;
    readonly oracleId: string;
    readonly consequence: string;
  }[];
  readonly invalidationReasons: readonly string[];
  readonly organizationalDecision: null | {
    readonly disposition: "APPROVED" | "NOT_APPROVED";
    readonly accountableFunction: string;
    readonly decisionDateUtc: string;
    readonly scopeReferences: readonly string[];
    readonly conditions: readonly string[];
    readonly expiryOrReviewTrigger: string;
    readonly evidenceLocationReference: string;
  };
}

export interface EvidenceManifestDraft {
  readonly schemaVersion: typeof EVIDENCE_MANIFEST_SCHEMA_VERSION;
  readonly manifestId: string;
  readonly manifestRevision: number;
  readonly evidencePurpose: "acceptance-row" | "writer-validator-test";
  readonly row: {
    readonly matrixRowId: string;
    readonly matrixRevision: number;
    readonly productSpecificationSections: readonly string[];
    readonly acceptanceCriteriaIds: readonly string[];
    readonly verificationClasses: readonly ("EQ" | "PROP" | "TOL" | "HUM" | "ORG" | "REL")[];
    readonly acceptanceOwner: string;
  };
  readonly fixtureEvidence: readonly {
    readonly corpusVersion: string;
    readonly fixtureId: string;
    readonly fixtureRevision: number;
    readonly fixtureDigest: string;
    readonly semanticLayer: string;
    readonly oracleId: string;
    readonly oracleRevision: number;
    readonly provenanceState: string;
    readonly admissionState: string;
    readonly rightsState: string;
  }[];
  readonly componentDigests: Readonly<Record<string, EvidenceDigestReference>>;
  readonly environment: {
    readonly profileId: string;
    readonly executionProfile: string;
    readonly osFamily: string;
    readonly osBuildClass: string;
    readonly architecture: string;
    readonly hardwareClass: string;
    readonly storageClass: string;
    readonly displayClass: string;
    readonly assistiveTechnology: readonly string[];
    readonly locale: string;
    readonly timeZone: string;
    readonly softwareVersions: Readonly<Record<string, string>>;
  };
  readonly execution: {
    readonly startUtc: string;
    readonly endUtc: string;
    readonly repetitions: number;
    readonly warmups: number;
    readonly seeds: readonly string[];
    readonly injectedFaults: readonly string[];
    readonly exclusions: readonly {
      readonly exclusionId: string;
      readonly validityRule: string;
    }[];
  };
  readonly artifacts: readonly {
    readonly artifactId: string;
    readonly artifactKind: "raw" | "normalized";
    readonly mediaType: string;
    readonly digest: EvidenceDigestReference;
    readonly custodyClass: "repository-safe" | "controlled-local" | "restricted";
    readonly locationKind: "repository-relative" | "controlled-reference" | "not-collected";
    readonly locationReference: string;
  }[];
  readonly comparison: {
    readonly method: string;
    readonly version: string;
    readonly tolerance: string;
  };
  readonly result: EvidenceResultRecord;
  readonly evidenceGrade: "G1" | "G2" | "G3" | "G4" | "G5" | "G6";
  readonly executorRoleCategory: string;
  readonly observerRoleCategory: string;
  readonly approvalOrConsentReference: string;
  readonly privacy: {
    readonly privacyClass: string;
    readonly prohibitedContentScan: "passed";
    readonly rawLocation: {
      readonly state: "not-collected" | "controlled-reference";
      readonly reference: string;
    };
  };
  readonly retention: {
    readonly retentionRule: string;
    readonly deletionRule: string;
    readonly ownerFunction: string;
  };
  readonly nonclaims: readonly string[];
  readonly rerunTriggers: readonly string[];
}

export interface EvidenceDigestReference {
  readonly identity: string;
  readonly state: "present" | "not-applicable";
  readonly digest: string;
  readonly reason: string;
}

export interface EvidenceManifest extends EvidenceManifestDraft {
  readonly inventoryDigest: string;
}

export type EvidenceManifestWriteResult =
  | {
      readonly ok: true;
      readonly manifest: EvidenceManifest;
      readonly canonicalJson: string;
    }
  | { readonly ok: false; readonly diagnostics: readonly EvidenceManifestDiagnostic[] };

export type EvidenceManifestReadResult = EvidenceManifestWriteResult;

type Schema =
  | { readonly kind: "array"; readonly item: Schema; readonly minLength?: number }
  | { readonly kind: "boolean" }
  | { readonly kind: "integer"; readonly minimum?: number }
  | { readonly kind: "literal"; readonly value: null }
  | { readonly kind: "object"; readonly properties: Readonly<Record<string, Schema>> }
  | { readonly kind: "oneOf"; readonly alternatives: readonly Schema[] }
  | { readonly kind: "record"; readonly value: Schema; readonly minKeys?: number }
  | { readonly kind: "string"; readonly values?: readonly string[] };

const text: Schema = { kind: "string" };
const integer: Schema = { kind: "integer", minimum: 0 };
const positiveInteger: Schema = { kind: "integer", minimum: 1 };
const textArray: Schema = { kind: "array", item: text };
const nonemptyTextArray: Schema = { kind: "array", item: text, minLength: 1 };

const digestReferenceSchema: Schema = {
  kind: "object",
  properties: {
    identity: text,
    state: { kind: "string", values: ["present", "not-applicable"] },
    digest: text,
    reason: text,
  },
};

const resultSchema: Schema = {
  kind: "object",
  properties: {
    state: { kind: "string", values: EVIDENCE_RESULT_STATES },
    decisionClass: { kind: "string", values: ["technical", "organizational"] },
    releaseContribution: {
      kind: "string",
      values: ["technical-pass", "organizational-approval", "none"],
    },
    methodDefined: { kind: "boolean" },
    qualifyingEvidenceExecuted: { kind: "boolean" },
    requiredRepetitions: integer,
    completedRepetitions: integer,
    blockers: textArray,
    repetitions: {
      kind: "array",
      item: {
        kind: "object",
        properties: {
          repetitionId: text,
          state: { kind: "string", values: ["PASS", "FAIL", "INVALID"] },
          artifactRefs: textArray,
        },
      },
    },
    failures: {
      kind: "array",
      item: {
        kind: "object",
        properties: {
          code: text,
          repetitionId: text,
          oracleId: text,
          consequence: text,
        },
      },
    },
    invalidationReasons: textArray,
    organizationalDecision: {
      kind: "oneOf",
      alternatives: [
        { kind: "literal", value: null },
        {
          kind: "object",
          properties: {
            disposition: { kind: "string", values: ["APPROVED", "NOT_APPROVED"] },
            accountableFunction: text,
            decisionDateUtc: text,
            scopeReferences: nonemptyTextArray,
            conditions: textArray,
            expiryOrReviewTrigger: text,
            evidenceLocationReference: text,
          },
        },
      ],
    },
  },
};

const draftProperties: Readonly<Record<string, Schema>> = {
  schemaVersion: text,
  manifestId: text,
  manifestRevision: positiveInteger,
  evidencePurpose: {
    kind: "string",
    values: ["acceptance-row", "writer-validator-test"],
  },
  row: {
    kind: "object",
    properties: {
      matrixRowId: text,
      matrixRevision: positiveInteger,
      productSpecificationSections: nonemptyTextArray,
      acceptanceCriteriaIds: nonemptyTextArray,
      verificationClasses: {
        kind: "array",
        item: { kind: "string", values: ["EQ", "PROP", "TOL", "HUM", "ORG", "REL"] },
        minLength: 1,
      },
      acceptanceOwner: text,
    },
  },
  fixtureEvidence: {
    kind: "array",
    minLength: 1,
    item: {
      kind: "object",
      properties: {
        corpusVersion: text,
        fixtureId: text,
        fixtureRevision: positiveInteger,
        fixtureDigest: text,
        semanticLayer: text,
        oracleId: text,
        oracleRevision: positiveInteger,
        provenanceState: text,
        admissionState: text,
        rightsState: text,
      },
    },
  },
  componentDigests: {
    kind: "object",
    properties: {
      applicationBinary: digestReferenceSchema,
      dependencyLock: digestReferenceSchema,
      sbom: digestReferenceSchema,
      harness: digestReferenceSchema,
      schema: digestReferenceSchema,
      migration: digestReferenceSchema,
      commandContract: digestReferenceSchema,
      sceneEngine: digestReferenceSchema,
      electron: digestReferenceSchema,
      chromium: digestReferenceSchema,
      node: digestReferenceSchema,
      fonts: digestReferenceSchema,
      assets: digestReferenceSchema,
    },
  },
  environment: {
    kind: "object",
    properties: {
      profileId: text,
      executionProfile: text,
      osFamily: text,
      osBuildClass: text,
      architecture: text,
      hardwareClass: text,
      storageClass: text,
      displayClass: text,
      assistiveTechnology: textArray,
      locale: text,
      timeZone: text,
      softwareVersions: { kind: "record", value: text, minKeys: 1 },
    },
  },
  execution: {
    kind: "object",
    properties: {
      startUtc: text,
      endUtc: text,
      repetitions: integer,
      warmups: integer,
      seeds: textArray,
      injectedFaults: textArray,
      exclusions: {
        kind: "array",
        item: {
          kind: "object",
          properties: { exclusionId: text, validityRule: text },
        },
      },
    },
  },
  artifacts: {
    kind: "array",
    minLength: 2,
    item: {
      kind: "object",
      properties: {
        artifactId: text,
        artifactKind: { kind: "string", values: ["raw", "normalized"] },
        mediaType: text,
        digest: digestReferenceSchema,
        custodyClass: {
          kind: "string",
          values: ["repository-safe", "controlled-local", "restricted"],
        },
        locationKind: {
          kind: "string",
          values: ["repository-relative", "controlled-reference", "not-collected"],
        },
        locationReference: text,
      },
    },
  },
  comparison: {
    kind: "object",
    properties: { method: text, version: text, tolerance: text },
  },
  result: resultSchema,
  evidenceGrade: { kind: "string", values: ["G1", "G2", "G3", "G4", "G5", "G6"] },
  executorRoleCategory: text,
  observerRoleCategory: text,
  approvalOrConsentReference: text,
  privacy: {
    kind: "object",
    properties: {
      privacyClass: text,
      prohibitedContentScan: { kind: "string", values: ["passed"] },
      rawLocation: {
        kind: "object",
        properties: {
          state: { kind: "string", values: ["not-collected", "controlled-reference"] },
          reference: text,
        },
      },
    },
  },
  retention: {
    kind: "object",
    properties: {
      retentionRule: text,
      deletionRule: text,
      ownerFunction: text,
    },
  },
  nonclaims: nonemptyTextArray,
  rerunTriggers: nonemptyTextArray,
};

const draftSchema: Schema = { kind: "object", properties: draftProperties };
const manifestSchema: Schema = {
  kind: "object",
  properties: { ...draftProperties, inventoryDigest: text },
};

interface ValidationContext {
  readonly diagnostics: Map<string, EvidenceManifestDiagnostic>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function diagnose(
  context: ValidationContext,
  code: EvidenceDiagnosticCode,
  path: string,
  cause: string,
  consequence: string,
): void {
  const key = `${code}\u0000${path}`;
  if (!context.diagnostics.has(key)) {
    context.diagnostics.set(key, Object.freeze({ code, path, cause, consequence }));
  }
}

function validateSchema(
  value: unknown,
  schema: Schema,
  path: string,
  context: ValidationContext,
): void {
  switch (schema.kind) {
    case "array":
      if (!Array.isArray(value)) {
        diagnose(
          context,
          EVIDENCE_DIAGNOSTIC_CODES.wrongType,
          path,
          "Required evidence metadata is not an array.",
          "The evidence manifest is rejected.",
        );
        return;
      }
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        diagnose(
          context,
          EVIDENCE_DIAGNOSTIC_CODES.malformed,
          path,
          "The evidence array is missing required entries.",
          "The evidence manifest is rejected.",
        );
      }
      value.forEach((entry, index) =>
        validateSchema(entry, schema.item, `${path}[${index}]`, context),
      );
      return;
    case "boolean":
      if (typeof value !== "boolean") {
        diagnose(
          context,
          EVIDENCE_DIAGNOSTIC_CODES.wrongType,
          path,
          "Required evidence metadata is not boolean.",
          "The evidence manifest is rejected.",
        );
      }
      return;
    case "integer":
      if (
        !Number.isSafeInteger(value) ||
        (schema.minimum !== undefined && Number(value) < schema.minimum)
      ) {
        diagnose(
          context,
          EVIDENCE_DIAGNOSTIC_CODES.wrongType,
          path,
          "Required evidence metadata is not a safe integer in range.",
          "The evidence manifest is rejected.",
        );
      }
      return;
    case "literal":
      if (value !== schema.value) {
        diagnose(
          context,
          EVIDENCE_DIAGNOSTIC_CODES.wrongType,
          path,
          "Evidence metadata violates a required literal value.",
          "The evidence manifest is rejected.",
        );
      }
      return;
    case "object": {
      if (!isRecord(value)) {
        diagnose(
          context,
          EVIDENCE_DIAGNOSTIC_CODES.wrongType,
          path,
          "Required evidence metadata is not an object.",
          "The evidence manifest is rejected.",
        );
        return;
      }
      const expected = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(value)) {
        if (!expected.has(key)) {
          diagnose(
            context,
            EVIDENCE_DIAGNOSTIC_CODES.unknownField,
            `${path}.${key}`,
            "The field is not declared by this evidence schema version.",
            "The evidence manifest is rejected without retaining the unknown value.",
          );
        }
      }
      for (const [key, childSchema] of Object.entries(schema.properties)) {
        if (!Object.hasOwn(value, key)) {
          diagnose(
            context,
            key === "inventoryDigest"
              ? EVIDENCE_DIAGNOSTIC_CODES.digestMissing
              : EVIDENCE_DIAGNOSTIC_CODES.requiredFieldMissing,
            `${path}.${key}`,
            "Required evidence metadata is missing.",
            "The evidence manifest is rejected.",
          );
        } else {
          validateSchema(value[key], childSchema, `${path}.${key}`, context);
        }
      }
      return;
    }
    case "oneOf": {
      const candidates = schema.alternatives.map((): ValidationContext => ({
        diagnostics: new Map(),
      }));
      schema.alternatives.forEach((alternative, index) =>
        validateSchema(value, alternative, path, candidates[index]!),
      );
      if (!candidates.some((candidate) => candidate.diagnostics.size === 0)) {
        diagnose(
          context,
          EVIDENCE_DIAGNOSTIC_CODES.wrongType,
          path,
          "Evidence metadata does not match any permitted shape.",
          "The evidence manifest is rejected.",
        );
      }
      return;
    }
    case "record":
      if (!isRecord(value)) {
        diagnose(
          context,
          EVIDENCE_DIAGNOSTIC_CODES.wrongType,
          path,
          "Required keyed evidence metadata is not an object.",
          "The evidence manifest is rejected.",
        );
        return;
      }
      if (schema.minKeys !== undefined && Object.keys(value).length < schema.minKeys) {
        diagnose(
          context,
          EVIDENCE_DIAGNOSTIC_CODES.malformed,
          path,
          "The keyed evidence inventory is incomplete.",
          "The evidence manifest is rejected.",
        );
      }
      for (const [key, child] of Object.entries(value)) {
        if (!/^[A-Za-z][A-Za-z0-9._-]*$/u.test(key)) {
          diagnose(
            context,
            EVIDENCE_DIAGNOSTIC_CODES.malformed,
            `${path}.${key}`,
            "The keyed evidence identity is outside the inert identifier grammar.",
            "The evidence manifest is rejected.",
          );
        }
        validateSchema(child, schema.value, `${path}.${key}`, context);
      }
      return;
    case "string":
      if (typeof value !== "string" || value.length === 0) {
        diagnose(
          context,
          EVIDENCE_DIAGNOSTIC_CODES.wrongType,
          path,
          "Required evidence metadata is not a nonempty string.",
          "The evidence manifest is rejected.",
        );
      } else if (schema.values !== undefined && !schema.values.includes(value)) {
        diagnose(
          context,
          EVIDENCE_DIAGNOSTIC_CODES.malformed,
          path,
          "Evidence metadata is outside the controlled vocabulary.",
          "The evidence manifest is rejected.",
        );
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
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  }
  throw new TypeError("Only JSON values can be canonicalized.");
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(digest)]
    .map((octet) => octet.toString(16).padStart(2, "0"))
    .join("")}`;
}

function isDigest(value: string): boolean {
  return /^sha256:[0-9a-f]{64}$/u.test(value);
}

function withoutInventoryDigest(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "inventoryDigest"));
}

export async function computeEvidenceInventoryDigest(value: unknown): Promise<string> {
  if (!isRecord(value)) throw new TypeError("Evidence manifest metadata must be an object.");
  return sha256(canonicalize(withoutInventoryDigest(value)));
}

const prohibitedFieldNames = new Set([
  "credential",
  "credentials",
  "hostname",
  "hostName",
  "internalPath",
  "networkDetails",
  "password",
  "rawEvidencePath",
  "secret",
  "serial",
  "serialNumber",
  "tenant",
  "tenantId",
  "token",
  "username",
  "userName",
]);

function scanPrivacy(value: unknown, path: string, context: ValidationContext): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanPrivacy(entry, `${path}[${index}]`, context));
    return;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (prohibitedFieldNames.has(key)) {
        diagnose(
          context,
          EVIDENCE_DIAGNOSTIC_CODES.privacyProhibitedField,
          `${path}.${key}`,
          "A prohibited host, user, path, tenant, serial, credential, token, or secret field is present.",
          "The repository-safe evidence manifest is rejected without retaining the value.",
        );
      }
      scanPrivacy(child, `${path}.${key}`, context);
    }
    return;
  }
  if (
    typeof value === "string" &&
    (/^[A-Za-z]:[\\/]/u.test(value) ||
      /^\\\\/u.test(value) ||
      /^\/(?:home|Users|var|tmp)\//u.test(value) ||
      /\bBearer\s+[A-Za-z0-9._~-]+/iu.test(value) ||
      /\b(?:password|token|secret)\s*=/iu.test(value) ||
      /\bsk-[A-Za-z0-9_-]{8,}/u.test(value))
  ) {
    diagnose(
      context,
      EVIDENCE_DIAGNOSTIC_CODES.privacyProhibitedValue,
      path,
      "A value resembles an internal path or secret-bearing value.",
      "The repository-safe evidence manifest is rejected without returning the value.",
    );
  }
}

function validateDigestReference(
  reference: EvidenceDigestReference,
  path: string,
  context: ValidationContext,
): void {
  if (reference.state === "present") {
    if (!isDigest(reference.digest) || reference.reason !== "not-applicable") {
      diagnose(
        context,
        EVIDENCE_DIAGNOSTIC_CODES.digestInvalid,
        path,
        "A present component or artifact must have an exact lowercase SHA-256 digest and no absence reason.",
        "The evidence manifest is rejected.",
      );
    }
  } else if (reference.digest !== "not-applicable" || reference.reason === "not-applicable") {
    diagnose(
      context,
      EVIDENCE_DIAGNOSTIC_CODES.digestInvalid,
      path,
      "A not-applicable component or artifact must carry an explicit reason and no synthetic digest.",
      "The evidence manifest is rejected.",
    );
  }
}

function validateResultSemantics(result: EvidenceResultRecord, context: ValidationContext): void {
  const invalid = (cause: string): void =>
    diagnose(
      context,
      EVIDENCE_DIAGNOSTIC_CODES.resultSemantics,
      "$.result",
      cause,
      "The state cannot contribute to an acceptance or release aggregation.",
    );
  const technical = ["METHOD_NOT_RUN", "BLOCKED", "PASS", "FAIL", "INVALID"].includes(result.state);
  if (technical !== (result.decisionClass === "technical"))
    invalid("The result state and technical/organizational decision class disagree.");
  const expectedContribution: EvidenceReleaseContribution =
    result.state === "PASS"
      ? "technical-pass"
      : result.state === "APPROVED"
        ? "organizational-approval"
        : "none";
  if (result.releaseContribution !== expectedContribution)
    invalid(
      "Only PASS contributes a technical pass and only APPROVED contributes organizational approval.",
    );
  if (!result.methodDefined)
    invalid("Every result state must retain its finite technical or organizational method.");

  if (result.state === "METHOD_NOT_RUN") {
    if (
      result.qualifyingEvidenceExecuted ||
      result.completedRepetitions !== 0 ||
      result.repetitions.length !== 0 ||
      result.blockers.length !== 0 ||
      result.failures.length !== 0 ||
      result.invalidationReasons.length !== 0 ||
      result.organizationalDecision !== null ||
      result.requiredRepetitions < 1
    )
      invalid(
        "METHOD_NOT_RUN requires a finite planned repetition count and no execution, blocker, failure, invalidation, or organizational decision.",
      );
  } else if (result.state === "BLOCKED") {
    if (
      result.qualifyingEvidenceExecuted ||
      result.completedRepetitions !== 0 ||
      result.repetitions.length !== 0 ||
      result.blockers.length === 0 ||
      result.failures.length !== 0 ||
      result.invalidationReasons.length !== 0 ||
      result.organizationalDecision !== null ||
      result.requiredRepetitions < 1
    )
      invalid("BLOCKED requires named prerequisites and no qualifying execution or decision.");
  } else if (result.state === "PASS") {
    if (
      !result.qualifyingEvidenceExecuted ||
      result.requiredRepetitions < 1 ||
      result.completedRepetitions !== result.requiredRepetitions ||
      result.repetitions.length !== result.requiredRepetitions ||
      result.repetitions.some(({ state }) => state !== "PASS") ||
      result.blockers.length !== 0 ||
      result.failures.length !== 0 ||
      result.invalidationReasons.length !== 0 ||
      result.organizationalDecision !== null
    )
      invalid(
        "PASS requires every planned repetition to pass with no blocker, failure, invalidation, or organizational substitution.",
      );
  } else if (result.state === "FAIL") {
    if (
      !result.qualifyingEvidenceExecuted ||
      result.completedRepetitions < 1 ||
      result.completedRepetitions !== result.repetitions.length ||
      !result.repetitions.some(({ state }) => state === "FAIL") ||
      result.failures.length === 0 ||
      result.blockers.length !== 0 ||
      result.invalidationReasons.length !== 0 ||
      result.organizationalDecision !== null
    )
      invalid(
        "FAIL requires at least one mandatory failed repetition and retained failure details.",
      );
  } else if (result.state === "INVALID") {
    if (
      !result.qualifyingEvidenceExecuted ||
      result.completedRepetitions < 1 ||
      result.completedRepetitions !== result.repetitions.length ||
      !result.repetitions.some(({ state }) => state === "INVALID") ||
      result.invalidationReasons.length === 0 ||
      result.blockers.length !== 0 ||
      result.organizationalDecision !== null
    )
      invalid(
        "INVALID requires an executed observation, an invalid repetition, and a named invalidation reason; it cannot be relabeled pass/fail.",
      );
  } else {
    if (
      result.qualifyingEvidenceExecuted !== true ||
      result.requiredRepetitions !== 0 ||
      result.completedRepetitions !== 0 ||
      result.repetitions.length !== 0 ||
      result.blockers.length !== 0 ||
      result.failures.length !== 0 ||
      result.invalidationReasons.length !== 0 ||
      result.organizationalDecision === null ||
      result.organizationalDecision.disposition !== result.state
    )
      invalid(
        "APPROVED/NOT_APPROVED require an exact accountable organizational decision and no technical repetition substitution.",
      );
  }
}

function validateSemantics(draft: EvidenceManifestDraft, context: ValidationContext): void {
  if (draft.schemaVersion !== EVIDENCE_MANIFEST_SCHEMA_VERSION) {
    diagnose(
      context,
      EVIDENCE_DIAGNOSTIC_CODES.unsupportedVersion,
      "$.schemaVersion",
      "The evidence schema version is unsupported.",
      "The evidence manifest is rejected without reinterpretation.",
    );
  }
  if (
    draft.evidencePurpose === "writer-validator-test" &&
    !draft.row.matrixRowId.startsWith("TEST-BLD005-")
  ) {
    diagnose(
      context,
      EVIDENCE_DIAGNOSTIC_CODES.resultSemantics,
      "$.row.matrixRowId",
      "Writer/validator test evidence must use a non-product TEST-BLD005 identity.",
      "No current acceptance row is represented as executed or changed.",
    );
  }
  if (
    draft.evidencePurpose === "writer-validator-test" &&
    (!draft.nonclaims.includes("not-product-row-evidence") ||
      !draft.nonclaims.includes("not-an-acceptance-or-release-claim"))
  ) {
    diagnose(
      context,
      EVIDENCE_DIAGNOSTIC_CODES.resultSemantics,
      "$.nonclaims",
      "Writer/validator test evidence lacks its mandatory product-row and release nonclaims.",
      "No current acceptance row is represented as executed, approved, or release-ready.",
    );
  }
  const fixtureKeys = new Set<string>();
  for (const [index, fixture] of draft.fixtureEvidence.entries()) {
    const key = `${fixture.fixtureId}@${String(fixture.fixtureRevision)}:${fixture.oracleId}@${String(fixture.oracleRevision)}:${fixture.semanticLayer}`;
    if (fixtureKeys.has(key)) {
      diagnose(
        context,
        EVIDENCE_DIAGNOSTIC_CODES.malformed,
        `$.fixtureEvidence[${index}]`,
        "The exact fixture/oracle/layer evidence identity is duplicated.",
        "The evidence manifest is rejected without precedence.",
      );
    }
    fixtureKeys.add(key);
    if (!isDigest(fixture.fixtureDigest)) {
      diagnose(
        context,
        EVIDENCE_DIAGNOSTIC_CODES.digestInvalid,
        `$.fixtureEvidence[${index}].fixtureDigest`,
        "The fixture digest is not an algorithm-qualified lowercase SHA-256 value.",
        "The evidence manifest is rejected.",
      );
    }
  }
  if (!draft.fixtureEvidence.some(({ oracleId }) => oracleId === "OA-GOLD-001")) {
    diagnose(
      context,
      EVIDENCE_DIAGNOSTIC_CODES.requiredFieldMissing,
      "$.fixtureEvidence",
      "OA-GOLD-001 is required in every evidence manifest.",
      "The manifest cannot establish its exact fixture/oracle/layer evidence identity.",
    );
  }
  const requiredComponents = [
    "applicationBinary",
    "dependencyLock",
    "sbom",
    "harness",
    "schema",
    "migration",
    "commandContract",
    "sceneEngine",
    "electron",
    "chromium",
    "node",
    "fonts",
    "assets",
  ];
  for (const key of requiredComponents) {
    if (!Object.hasOwn(draft.componentDigests, key)) {
      diagnose(
        context,
        EVIDENCE_DIAGNOSTIC_CODES.requiredFieldMissing,
        `$.componentDigests.${key}`,
        "A required §8.1 component digest state is missing.",
        "The evidence manifest is rejected.",
      );
    }
  }
  for (const [key, reference] of Object.entries(draft.componentDigests))
    validateDigestReference(reference, `$.componentDigests.${key}`, context);
  const artifactIds = new Set<string>();
  const artifactKinds = new Set<string>();
  for (const [index, artifact] of draft.artifacts.entries()) {
    if (artifactIds.has(artifact.artifactId))
      diagnose(
        context,
        EVIDENCE_DIAGNOSTIC_CODES.malformed,
        `$.artifacts[${index}].artifactId`,
        "An artifact identity is duplicated.",
        "The evidence manifest is rejected without precedence.",
      );
    artifactIds.add(artifact.artifactId);
    artifactKinds.add(artifact.artifactKind);
    validateDigestReference(artifact.digest, `$.artifacts[${index}].digest`, context);
    if (
      (artifact.custodyClass === "controlled-local" || artifact.custodyClass === "restricted") &&
      artifact.locationKind === "repository-relative"
    ) {
      diagnose(
        context,
        EVIDENCE_DIAGNOSTIC_CODES.custodyProhibited,
        `$.artifacts[${index}].locationKind`,
        "Controlled or restricted raw custody cannot be represented as a repository path.",
        "The evidence manifest is rejected and no raw content is opened.",
      );
    }
  }
  if (!artifactKinds.has("raw") || !artifactKinds.has("normalized"))
    diagnose(
      context,
      EVIDENCE_DIAGNOSTIC_CODES.requiredFieldMissing,
      "$.artifacts",
      "Both raw and normalized artifact inventory roles must be explicit, including not-collected states.",
      "The evidence manifest is rejected.",
    );
  for (const repetition of draft.result.repetitions) {
    if (repetition.artifactRefs.some((reference) => !artifactIds.has(reference)))
      diagnose(
        context,
        EVIDENCE_DIAGNOSTIC_CODES.malformed,
        "$.result.repetitions",
        "A repetition references an unknown artifact identity.",
        "The evidence manifest is rejected.",
      );
  }
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(draft.execution.startUtc) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(draft.execution.endUtc) ||
    Date.parse(draft.execution.endUtc) < Date.parse(draft.execution.startUtc)
  )
    diagnose(
      context,
      EVIDENCE_DIAGNOSTIC_CODES.malformed,
      "$.execution",
      "Execution timestamps must be exact UTC and ordered.",
      "The evidence manifest is rejected.",
    );
  const expectedExecutionRepetitions =
    draft.result.decisionClass === "technical" ? draft.result.requiredRepetitions : 0;
  if (draft.execution.repetitions !== expectedExecutionRepetitions) {
    diagnose(
      context,
      EVIDENCE_DIAGNOSTIC_CODES.resultSemantics,
      "$.execution.repetitions",
      "The execution plan and result record disagree on required repetitions.",
      "The result cannot be aggregated or reinterpreted.",
    );
  }
  if (
    draft.result.organizationalDecision !== null &&
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(
      draft.result.organizationalDecision.decisionDateUtc,
    )
  ) {
    diagnose(
      context,
      EVIDENCE_DIAGNOSTIC_CODES.resultSemantics,
      "$.result.organizationalDecision.decisionDateUtc",
      "An organizational disposition requires an exact UTC decision date.",
      "The disposition cannot contribute organizational approval.",
    );
  }
  if (
    draft.privacy.rawLocation.state === "not-collected" &&
    draft.privacy.rawLocation.reference !== "not-applicable"
  )
    diagnose(
      context,
      EVIDENCE_DIAGNOSTIC_CODES.custodyProhibited,
      "$.privacy.rawLocation",
      "A not-collected raw location must not name a location.",
      "The evidence manifest is rejected.",
    );
  validateResultSemantics(draft.result, context);
}

function sortedDiagnostics(context: ValidationContext): readonly EvidenceManifestDiagnostic[] {
  return Object.freeze(
    [...context.diagnostics.values()].sort(
      (left, right) => left.code.localeCompare(right.code) || left.path.localeCompare(right.path),
    ),
  );
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function validateDraft(value: unknown): ValidationContext {
  const context: ValidationContext = { diagnostics: new Map() };
  scanPrivacy(value, "$", context);
  validateSchema(value, draftSchema, "$", context);
  if (context.diagnostics.size === 0) validateSemantics(value as EvidenceManifestDraft, context);
  return context;
}

export async function writeEvidenceManifest(draft: unknown): Promise<EvidenceManifestWriteResult> {
  const context = validateDraft(draft);
  if (context.diagnostics.size > 0 || !isRecord(draft))
    return deepFreeze({ ok: false, diagnostics: sortedDiagnostics(context) });
  const manifest = {
    ...draft,
    inventoryDigest: await computeEvidenceInventoryDigest(draft),
  } as unknown as EvidenceManifest;
  return deepFreeze({ ok: true, manifest, canonicalJson: canonicalize(manifest) });
}

export async function readEvidenceManifest(
  manifestText: string,
): Promise<EvidenceManifestReadResult> {
  const context: ValidationContext = { diagnostics: new Map() };
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestText) as unknown;
  } catch {
    diagnose(
      context,
      EVIDENCE_DIAGNOSTIC_CODES.jsonInvalid,
      "$",
      "The supplied evidence manifest is not valid JSON.",
      "The evidence manifest is rejected without reinterpretation.",
    );
    return deepFreeze({ ok: false, diagnostics: sortedDiagnostics(context) });
  }
  scanPrivacy(parsed, "$", context);
  validateSchema(parsed, manifestSchema, "$", context);
  if (context.diagnostics.size === 0 && isRecord(parsed)) {
    const draft = withoutInventoryDigest(parsed) as unknown as EvidenceManifestDraft;
    validateSemantics(draft, context);
    const declaredDigest = parsed["inventoryDigest"];
    if (typeof declaredDigest !== "string" || !isDigest(declaredDigest)) {
      diagnose(
        context,
        EVIDENCE_DIAGNOSTIC_CODES.digestInvalid,
        "$.inventoryDigest",
        "The evidence inventory digest is not an algorithm-qualified lowercase SHA-256 value.",
        "The evidence manifest is rejected.",
      );
    } else if ((await computeEvidenceInventoryDigest(parsed)) !== declaredDigest) {
      diagnose(
        context,
        EVIDENCE_DIAGNOSTIC_CODES.digestMismatch,
        "$.inventoryDigest",
        "The evidence inventory digest does not match the canonical immutable inventory.",
        "The evidence manifest is rejected without accepting altered results.",
      );
    }
  }
  if (context.diagnostics.size > 0 || !isRecord(parsed))
    return deepFreeze({ ok: false, diagnostics: sortedDiagnostics(context) });
  const manifest = parsed as unknown as EvidenceManifest;
  return deepFreeze({ ok: true, manifest, canonicalJson: canonicalize(manifest) });
}

export function evidenceResultSatisfiesRequiredClass(
  result: EvidenceResultRecord,
  requiredClass: EvidenceDecisionClass,
): boolean {
  return requiredClass === "technical"
    ? result.state === "PASS" && result.releaseContribution === "technical-pass"
    : result.state === "APPROVED" && result.releaseContribution === "organizational-approval";
}
