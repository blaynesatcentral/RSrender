import {
  canonicalizeJson,
  isSha256Digest,
  sha256CanonicalJson,
  sha256Utf8,
} from "@rsrender/contracts";

import { EVIDENCE_RESULT_STATES, type EvidenceResultState } from "./evidence-manifest.js";

export const AGGREGATE_EVIDENCE_INDEX_SCHEMA_VERSION =
  "rsrender.aggregate-evidence-index.v1" as const;

export const AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES = Object.freeze({
  digestInvalid: "EVIDENCE_INDEX.DIGEST.INVALID",
  digestMismatch: "EVIDENCE_INDEX.DIGEST.MISMATCH",
  duplicateIdentity: "EVIDENCE_INDEX.IDENTITY.DUPLICATE",
  fixtureLinkInvalid: "EVIDENCE_INDEX.FIXTURE_LINK.INVALID",
  jsonInvalid: "EVIDENCE_INDEX.JSON.INVALID",
  malformed: "EVIDENCE_INDEX.MANIFEST.MALFORMED",
  nonclaimLinkInvalid: "EVIDENCE_INDEX.NONCLAIM_LINK.INVALID",
  oracleLinkInvalid: "EVIDENCE_INDEX.ORACLE_LINK.INVALID",
  requiredAuthorityMissing: "EVIDENCE_INDEX.AUTHORITY.REQUIRED_MISSING",
  requirementLinkInvalid: "EVIDENCE_INDEX.REQUIREMENT_LINK.INVALID",
  resultLinkInvalid: "EVIDENCE_INDEX.RESULT_LINK.INVALID",
  revisionLinkInvalid: "EVIDENCE_INDEX.REVISION_LINK.INVALID",
  sourceDigestMismatch: "EVIDENCE_INDEX.SOURCE.DIGEST_MISMATCH",
  sourceJsonInvalid: "EVIDENCE_INDEX.SOURCE.JSON_INVALID",
  sourceMissing: "EVIDENCE_INDEX.SOURCE.MISSING",
  sourcePointerInvalid: "EVIDENCE_INDEX.SOURCE.POINTER_INVALID",
  sourceSchemaInvalid: "EVIDENCE_INDEX.SOURCE.SCHEMA_INVALID",
  ticketSetInvalid: "EVIDENCE_INDEX.TICKET_SET.INVALID",
  unknownResultState: "EVIDENCE_INDEX.RESULT.UNKNOWN_STATE",
  unsupportedVersion: "EVIDENCE_INDEX.MANIFEST.UNSUPPORTED_VERSION",
} as const);

export type AggregateEvidenceIndexDiagnosticCode =
  (typeof AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES)[keyof typeof AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES];

export interface AggregateEvidenceIndexDiagnostic {
  readonly code: AggregateEvidenceIndexDiagnosticCode;
  readonly path: string;
  readonly cause: string;
  readonly consequence: string;
}

export interface AggregateEvidenceManifestSource {
  /** Supplies only a selected, repository-safe evidence manifest. */
  readSourceManifest(path: string): string | Promise<string>;
}

export interface AggregateEvidenceIndexDraft {
  readonly schemaVersion: typeof AGGREGATE_EVIDENCE_INDEX_SCHEMA_VERSION;
  readonly indexId: "BLD-013-EVIDENCE-INDEX";
  readonly indexRevision: 1;
  readonly purpose: "traceability-and-referential-integrity-only";
  readonly entries: readonly AggregateEvidenceIndexEntry[];
  readonly nonclaims: readonly string[];
}

export interface AggregateEvidenceIndex extends AggregateEvidenceIndexDraft {
  readonly inventoryDigest: string;
}

export interface AggregateEvidenceIndexEntry {
  readonly entryId: string;
  readonly ticketId: string;
  readonly sourceManifest: {
    readonly manifestIdentity: string;
    readonly path: string;
    readonly digest: string;
    readonly ticketPointer: string;
    readonly schemaPointer: string;
    readonly schema: string;
    readonly resultPointer: string;
    readonly resultState: EvidenceResultState;
    readonly failuresPointer: string;
    readonly failuresDigest: string;
    readonly nonclaimsPointer: string;
    readonly nonclaimsDigest: string;
  };
  readonly requirementLinks: readonly {
    readonly requirementId: string;
    readonly sourcePointer: string;
  }[];
  readonly authorityLinks: readonly {
    readonly authorityId: "OA-GOLD-001" | "OA-REP-001";
    readonly linkage: "legacy-trace-addendum";
    readonly authorityReference: string;
    readonly sourceManifestDigest: string;
    readonly sourcePointers: readonly string[];
    readonly sourceEvidenceDigest: string;
    readonly noninterpretation: "linkage-metadata-only";
  }[];
  readonly fixtureDisposition: "source-recorded-fixtures" | "legacy-no-source-fixture-recorded";
  readonly fixtureLinks: readonly {
    readonly fixtureIdentity: string;
    readonly fixtureRevision: string;
    readonly digest: string;
    readonly digestScope: "single-fixture" | "combined-fixture-helper" | "content-addressed-legacy";
    readonly linkage:
      "source-recorded" | "source-recorded-combined" | "legacy-no-source-fixture-recorded";
    readonly identityPointer: string;
    readonly revisionPointer: string;
    readonly digestPointer: string;
  }[];
  readonly oracleLink: {
    readonly oracleId: string;
    readonly version: string;
    readonly method: string;
    readonly tolerance: string;
    readonly versionPointer: string;
    readonly methodPointer: string;
    readonly tolerancePointer: string;
  };
  readonly revisionLinks: readonly {
    readonly revisionId: string;
    readonly revision: string;
    readonly sourcePointer: string;
    readonly linkage: "source-recorded" | "content-addressed-source";
  }[];
}

export type AggregateEvidenceIndexResult =
  | { readonly ok: true; readonly index: AggregateEvidenceIndex; readonly canonicalJson: string }
  | { readonly ok: false; readonly diagnostics: readonly AggregateEvidenceIndexDiagnostic[] };

const expectedTickets = Object.freeze([
  "BLD-008",
  "BLD-009",
  "BLD-010",
  "BLD-011",
  "BLD-012",
] as const);

const expectedSources: Readonly<
  Record<string, { readonly path: string; readonly digest: string }>
> = Object.freeze({
  "BLD-008": Object.freeze({
    path: "artifacts/bld-008-domain-value-evidence.json",
    digest: "sha256:9e37f13664148802273e4da72384bf652b371c7f59c8e482c25062ffd3dc2b71",
  }),
  "BLD-009": Object.freeze({
    path: "artifacts/bld-009-aggregate-skeleton-evidence.json",
    digest: "sha256:a260e4dbb48824f8e68e82cdf42444eb2163e2df85f4601c003a90160a6edcd9",
  }),
  "BLD-010": Object.freeze({
    path: "artifacts/bld-010-application-service-evidence.json",
    digest: "sha256:3c701cac4638747579903c26a8f24252dea02e18e7e66d7eb1438d2ac52df616",
  }),
  "BLD-011": Object.freeze({
    path: "artifacts/bld-011-history-core-evidence.json",
    digest: "sha256:88c8b07ffed84911bc4dfe32be4bdd8cd2adc796e491983de213c2f877e3f1d8",
  }),
  "BLD-012": Object.freeze({
    path: "artifacts/bld-012-application-version-evidence.json",
    digest: "sha256:1f765ff56f8ea20dbd4ad3ff81bd94eac2fa9a7c5e7319dfe798b1037f774dbb",
  }),
});

const allowedSourceSchemas = new Set([
  "rsrender.bld-evidence.v0",
  "rsrender.bld012.application-version-evidence.v0",
]);

const ticketAuthority = Object.freeze({
  "BLD-008": {
    sourceTicketLiteral: "BLD-008",
    schema: "rsrender.bld-evidence.v0",
    resultPointer: "/result",
    failuresPointer: "/oracle/failures",
    nonclaimsPointer: "/limitations",
    requirementPointer: "/authority/requirements",
    requirements: ["PI-05", "PI-19", "D02", "D03", "OA-VAL-001", "OA-PROV-001"],
    oracleBase: "/oracle/comparison",
    fixtures: [
      [
        "/authority/fixtureRevisions/0",
        "/authority/fixtureRevisions/0",
        "/artifacts/3/sha256",
        "source-recorded-combined",
        "combined-fixture-helper",
      ],
      [
        "/authority/fixtureRevisions/1",
        "/authority/fixtureRevisions/1",
        "/artifacts/3/sha256",
        "source-recorded-combined",
        "combined-fixture-helper",
      ],
    ],
    fixtureDisposition: "source-recorded-fixtures",
    revisions: [["domain-value-record", "/artifacts/1/sha256", "content-addressed-source"]],
    legacyAuthorities: {
      "OA-GOLD-001": [
        "/authority/corpusVersion",
        "/authority/fixtureRevisions",
        "/oracle/comparison",
        "/environment",
        "/custody",
      ],
      "OA-REP-001": ["/custody/classification", "/limitations"],
    },
  },
  "BLD-009": {
    sourceTicketLiteral: "BLD-009",
    schema: "rsrender.bld-evidence.v0",
    resultPointer: "/result",
    failuresPointer: "/oracle/failures",
    nonclaimsPointer: "/limitations",
    requirementPointer: "/authority/requirements",
    requirements: [
      "PI-02",
      "PI-06",
      "PI-07",
      "PI-08",
      "D01",
      "OA-ID-001",
      "OA-GOLD-001",
      "OA-REP-001",
    ],
    oracleBase: "/oracle/comparison",
    fixtures: [0, 1, 2, 3].map((index) => [
      `/authority/fixtureRevisions/${String(index)}`,
      `/authority/fixtureRevisions/${String(index)}`,
      "/artifacts/4/sha256",
      "source-recorded-combined",
      "combined-fixture-helper",
    ]),
    fixtureDisposition: "source-recorded-fixtures",
    revisions: [
      ["log-template-project-aggregate", "/artifacts/0/sha256", "content-addressed-source"],
    ],
    legacyAuthorities: {},
  },
  "BLD-010": {
    sourceTicketLiteral: "BLD-010",
    schema: "rsrender.bld-evidence.v0",
    resultPointer: "/result",
    failuresPointer: "/oracle/failures",
    nonclaimsPointer: "/limitations",
    requirementPointer: "/authority/requirements",
    requirements: ["PI-20", "D04", "architecture-6", "ADR-0008"],
    oracleBase: "/oracle/comparison",
    fixtures: [],
    fixtureDisposition: "legacy-no-source-fixture-recorded",
    revisions: [
      [
        "application-service-contract",
        "/contract/applicationServiceContractRevision",
        "source-recorded",
      ],
      [
        "in-memory-application-service",
        "/contract/inMemoryApplicationServiceRevision",
        "source-recorded",
      ],
    ],
    legacyAuthorities: {
      "OA-GOLD-001": [
        "/artifacts/6/path",
        "/artifacts/6/sha256",
        "/oracle/comparison",
        "/environment",
        "/custody",
      ],
      "OA-REP-001": ["/custody/classification", "/limitations/0"],
    },
  },
  "BLD-011": {
    sourceTicketLiteral: "BLD-011",
    schema: "rsrender.bld-evidence.v0",
    resultPointer: "/result",
    failuresPointer: "/oracle/failures",
    nonclaimsPointer: "/limitations",
    requirementPointer: "/authority/requirements",
    requirements: [
      "AC-001-bounded-revision-history-seam",
      "OA-GOLD-001",
      "OA-REP-001",
      "architecture-5",
      "architecture-6",
      "ADR-0001",
      "D04",
      "E03-pure-captured-revision-seam",
    ],
    oracleBase: "/oracle/comparison",
    fixtures: [
      [
        "/oracle/fixture/identity",
        "/oracle/fixture/revision",
        "/oracle/fixture/sha256",
        "source-recorded",
        "single-fixture",
      ],
      [
        "/oracle/propertyOracle/identity",
        "/oracle/propertyOracle/revision",
        "/oracle/propertyOracle/sha256",
        "source-recorded",
        "single-fixture",
      ],
    ],
    fixtureDisposition: "source-recorded-fixtures",
    revisions: [
      ["history-core-contract", "/contract/historyCoreContractRevision", "source-recorded"],
      ["in-memory-history-core", "/contract/inMemoryHistoryCoreRevision", "source-recorded"],
      ["history-reducer", "/contract/reducerRevision", "source-recorded"],
      ["history", "/contract/historyRevision", "source-recorded"],
    ],
    legacyAuthorities: {},
  },
  "BLD-012": {
    sourceTicketLiteral: "BLD-012 / GitHub #56",
    schema: "rsrender.bld012.application-version-evidence.v0",
    resultPointer: "/sourceResult/state",
    failuresPointer: "/oracle/failures",
    nonclaimsPointer: "/nonClaims",
    requirementPointer: "/trace",
    requirements: ["PI-16", "PI-20", "P06-bounded-seam", "OA-GOLD-001", "OA-REP-001"],
    oracleBase: "/oracle",
    fixtures: [
      [
        "/fixture/identity",
        "/fixture/revision",
        "/fixture/sha256",
        "source-recorded",
        "single-fixture",
      ],
    ],
    fixtureDisposition: "source-recorded-fixtures",
    revisions: [
      ["application-version-contract", "/revisions/applicationVersionContract", "source-recorded"],
      ["application-version-handler", "/revisions/applicationVersionHandler", "source-recorded"],
      [
        "application-version-transport",
        "/revisions/applicationVersionTransport",
        "source-recorded",
      ],
      ["generated-preload", "/revisions/generatedPreload", "source-recorded"],
    ],
    legacyAuthorities: {},
  },
} as const);

const legacyAuthorityReferences = Object.freeze({
  "BLD-008":
    "GitHub #52; docs/planning/specifications/rsrender-phased-implementation-roadmap.md#93-next-frontier-unlocked-by-the-initial-parallel-tickets; docs/planning/specifications/rsrender-acceptance-strategy.md#81-evidence-manifest; docs/planning/specifications/sanitized-example-dataset-golden-log-corpus.md#mandatory-cross-cutting-oracle-atoms",
  "BLD-010":
    "GitHub #54; docs/planning/specifications/rsrender-phased-implementation-roadmap.md#93-next-frontier-unlocked-by-the-initial-parallel-tickets; docs/planning/specifications/rsrender-acceptance-strategy.md#81-evidence-manifest; docs/planning/specifications/sanitized-example-dataset-golden-log-corpus.md#mandatory-cross-cutting-oracle-atoms",
});

const requiredNonclaims = new Set([
  "Traceability and referential-integrity result only; not aggregate acceptance or release readiness.",
  "Source manifests were not rerun, rewritten, reinterpreted, or promoted.",
  "All linked fixtures and vectors remain synthetic and nonrepresentative.",
]);

type JsonRecord = Record<string, unknown>;

function diagnostic(
  code: AggregateEvidenceIndexDiagnosticCode,
  path: string,
  cause: string,
): AggregateEvidenceIndexDiagnostic {
  return {
    code,
    path,
    cause,
    consequence: "The aggregate evidence index is invalid and makes no traceability claim.",
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(record: JsonRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isTextArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isText);
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const item of Object.values(value as JsonRecord)) freezeDeep(item);
    Object.freeze(value);
  }
  return value;
}

function pointerValue(
  root: unknown,
  pointer: string,
): { ok: true; value: unknown } | { ok: false } {
  if (!pointer.startsWith("/")) return { ok: false };
  let current = root;
  for (const encoded of pointer.slice(1).split("/")) {
    const segment = encoded.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current)) {
      if (!/^(0|[1-9][0-9]*)$/u.test(segment)) return { ok: false };
      const index = Number(segment);
      if (!Number.isSafeInteger(index) || index >= current.length) return { ok: false };
      current = current[index];
      continue;
    }
    if (!isRecord(current) || !Object.hasOwn(current, segment)) return { ok: false };
    current = current[segment];
  }
  return { ok: true, value: current };
}

function normalizedDigest(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const qualified = value.startsWith("sha256:") ? value : `sha256:${value}`;
  return isSha256Digest(qualified) ? qualified : null;
}

const sourceDigestCache = new WeakMap<
  AggregateEvidenceManifestSource,
  Map<string, { readonly text: string; readonly digest: string }>
>();

function sameStrings(actual: readonly string[], expected: readonly string[]): boolean {
  return (
    actual.length === expected.length && actual.every((value, index) => value === expected[index])
  );
}

function shapeDiagnostics(input: unknown): AggregateEvidenceIndexDiagnostic[] {
  const malformed = () => [
    diagnostic(
      AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.malformed,
      "$",
      "The index does not match the closed aggregate evidence index schema.",
    ),
  ];
  if (!isRecord(input)) return malformed();
  if (
    !exactKeys(input, [
      "schemaVersion",
      "indexId",
      "indexRevision",
      "purpose",
      "entries",
      "nonclaims",
      "inventoryDigest",
    ]) ||
    input["schemaVersion"] !== AGGREGATE_EVIDENCE_INDEX_SCHEMA_VERSION ||
    input["indexId"] !== "BLD-013-EVIDENCE-INDEX" ||
    input["indexRevision"] !== 1 ||
    input["purpose"] !== "traceability-and-referential-integrity-only" ||
    !Array.isArray(input["entries"]) ||
    !isTextArray(input["nonclaims"]) ||
    !isText(input["inventoryDigest"])
  )
    return malformed();

  for (const entry of input["entries"]) {
    if (
      !isRecord(entry) ||
      !exactKeys(entry, [
        "entryId",
        "ticketId",
        "sourceManifest",
        "requirementLinks",
        "authorityLinks",
        "fixtureDisposition",
        "fixtureLinks",
        "oracleLink",
        "revisionLinks",
      ]) ||
      !isText(entry["entryId"]) ||
      !isText(entry["ticketId"]) ||
      !isRecord(entry["sourceManifest"]) ||
      !Array.isArray(entry["requirementLinks"]) ||
      !Array.isArray(entry["authorityLinks"]) ||
      (entry["fixtureDisposition"] !== "source-recorded-fixtures" &&
        entry["fixtureDisposition"] !== "legacy-no-source-fixture-recorded") ||
      !Array.isArray(entry["fixtureLinks"]) ||
      !isRecord(entry["oracleLink"]) ||
      !Array.isArray(entry["revisionLinks"])
    )
      return malformed();
    const source = entry["sourceManifest"];
    if (
      !exactKeys(source, [
        "manifestIdentity",
        "path",
        "digest",
        "ticketPointer",
        "schemaPointer",
        "schema",
        "resultPointer",
        "resultState",
        "failuresPointer",
        "failuresDigest",
        "nonclaimsPointer",
        "nonclaimsDigest",
      ]) ||
      Object.values(source).some((value) => !isText(value))
    )
      return malformed();
    for (const link of entry["requirementLinks"]) {
      if (
        !isRecord(link) ||
        !exactKeys(link, ["requirementId", "sourcePointer"]) ||
        !isText(link["requirementId"]) ||
        !isText(link["sourcePointer"])
      )
        return malformed();
    }
    for (const link of entry["authorityLinks"]) {
      if (
        !isRecord(link) ||
        !exactKeys(link, [
          "authorityId",
          "linkage",
          "authorityReference",
          "sourceManifestDigest",
          "sourcePointers",
          "sourceEvidenceDigest",
          "noninterpretation",
        ]) ||
        !isText(link["authorityId"]) ||
        link["linkage"] !== "legacy-trace-addendum" ||
        !isText(link["authorityReference"]) ||
        !isText(link["sourceManifestDigest"]) ||
        !isTextArray(link["sourcePointers"]) ||
        !isText(link["sourceEvidenceDigest"]) ||
        link["noninterpretation"] !== "linkage-metadata-only"
      )
        return malformed();
    }
    for (const link of entry["fixtureLinks"]) {
      if (
        !isRecord(link) ||
        !exactKeys(link, [
          "fixtureIdentity",
          "fixtureRevision",
          "digest",
          "digestScope",
          "linkage",
          "identityPointer",
          "revisionPointer",
          "digestPointer",
        ]) ||
        Object.values(link).some((value) => !isText(value))
      )
        return malformed();
    }
    const oracle = entry["oracleLink"];
    if (
      !exactKeys(oracle, [
        "oracleId",
        "version",
        "method",
        "tolerance",
        "versionPointer",
        "methodPointer",
        "tolerancePointer",
      ]) ||
      Object.values(oracle).some((value) => !isText(value))
    )
      return malformed();
    for (const link of entry["revisionLinks"]) {
      if (
        !isRecord(link) ||
        !exactKeys(link, ["revisionId", "revision", "sourcePointer", "linkage"]) ||
        Object.values(link).some((value) => !isText(value))
      )
        return malformed();
    }
  }
  return [];
}

async function validateSources(
  index: AggregateEvidenceIndex,
  source: AggregateEvidenceManifestSource,
): Promise<AggregateEvidenceIndexDiagnostic[]> {
  const diagnostics: AggregateEvidenceIndexDiagnostic[] = [];
  const entries = index.entries;
  const ticketIds = entries.map(({ ticketId }) => ticketId);
  const identities = entries.flatMap(({ entryId, sourceManifest }) => [
    entryId,
    sourceManifest.manifestIdentity,
  ]);
  if (
    new Set(ticketIds).size !== ticketIds.length ||
    expectedTickets.some((ticket, position) => ticketIds[position] !== ticket)
  ) {
    diagnostics.push(
      diagnostic(
        AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.ticketSetInvalid,
        "$.entries",
        "Exactly one ordered entry for each BLD-008 through BLD-012 ticket is required.",
      ),
    );
  }
  if (new Set(identities).size !== identities.length) {
    diagnostics.push(
      diagnostic(
        AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.duplicateIdentity,
        "$.entries",
        "Entry and manifest identities must be globally unique.",
      ),
    );
  }
  if (
    requiredNonclaims.size !== index.nonclaims.length ||
    [...requiredNonclaims].some((item) => !index.nonclaims.includes(item))
  ) {
    diagnostics.push(
      diagnostic(
        AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.nonclaimLinkInvalid,
        "$.nonclaims",
        "The three bounded BLD-013 nonclaims must be retained exactly.",
      ),
    );
  }

  for (const [entryIndex, entry] of entries.entries()) {
    const entryPath = `$.entries[${String(entryIndex)}]`;
    const manifestLink = entry.sourceManifest;
    const expectedSource = expectedSources[entry.ticketId];
    if (!expectedSource || expectedSource.path !== manifestLink.path) {
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.sourceMissing,
          `${entryPath}.sourceManifest.path`,
          "The ticket does not select its one admitted repository evidence manifest.",
        ),
      );
      continue;
    }
    if (entry.entryId !== `BLD-013-ENTRY-${entry.ticketId}`) {
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.duplicateIdentity,
          `${entryPath}.entryId`,
          "The entry identity is not the exact deterministic identity frozen for its ticket.",
        ),
      );
    }
    if (manifestLink.digest !== expectedSource.digest) {
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.sourceDigestMismatch,
          `${entryPath}.sourceManifest.digest`,
          "The source manifest digest differs from the frozen close-time inventory.",
        ),
      );
      continue;
    }
    if (
      !isSha256Digest(manifestLink.digest) ||
      manifestLink.manifestIdentity !== `${manifestLink.path}@${manifestLink.digest}`
    ) {
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.digestInvalid,
          `${entryPath}.sourceManifest`,
          "The source manifest identity must be its exact path plus algorithm-qualified digest.",
        ),
      );
      continue;
    }
    let text: string;
    try {
      const selected = await source.readSourceManifest(manifestLink.path);
      if (typeof selected !== "string") {
        diagnostics.push(
          diagnostic(
            AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.sourceJsonInvalid,
            `${entryPath}.sourceManifest.path`,
            "The source supplied a non-text value.",
          ),
        );
        continue;
      }
      text = selected;
    } catch {
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.sourceMissing,
          `${entryPath}.sourceManifest.path`,
          "The selected source manifest could not be read.",
        ),
      );
      continue;
    }
    let actualSourceDigest: string;
    const cached = sourceDigestCache.get(source)?.get(manifestLink.path);
    try {
      actualSourceDigest = cached?.text === text ? cached.digest : sha256Utf8(text);
    } catch {
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.sourceJsonInvalid,
          `${entryPath}.sourceManifest.path`,
          "The source text contains an invalid Unicode scalar sequence.",
        ),
      );
      continue;
    }
    if (actualSourceDigest !== manifestLink.digest) {
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.sourceDigestMismatch,
          `${entryPath}.sourceManifest.digest`,
          "The retained source bytes do not match the indexed digest.",
        ),
      );
      continue;
    }
    let sourceCache = sourceDigestCache.get(source);
    if (!sourceCache) {
      sourceCache = new Map();
      sourceDigestCache.set(source, sourceCache);
    }
    sourceCache.set(manifestLink.path, { text, digest: actualSourceDigest });
    let manifest: unknown;
    try {
      manifest = JSON.parse(text) as unknown;
    } catch {
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.sourceJsonInvalid,
          `${entryPath}.sourceManifest.path`,
          "The digest-matched source manifest is not JSON.",
        ),
      );
      continue;
    }
    const read = (pointer: string, field: string): unknown => {
      const result = pointerValue(manifest, pointer);
      if (!result.ok)
        diagnostics.push(
          diagnostic(
            AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.sourcePointerInvalid,
            `${entryPath}.${field}`,
            `Source pointer ${pointer} does not resolve.`,
          ),
        );
      return result.ok ? result.value : undefined;
    };

    const authority = ticketAuthority[entry.ticketId as keyof typeof ticketAuthority];
    if (!authority) continue;
    if (
      manifestLink.ticketPointer !== "/ticket" ||
      manifestLink.schemaPointer !== "/schema" ||
      manifestLink.schema !== authority.schema ||
      manifestLink.resultPointer !== authority.resultPointer ||
      manifestLink.failuresPointer !== authority.failuresPointer ||
      manifestLink.nonclaimsPointer !== authority.nonclaimsPointer
    )
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.sourcePointerInvalid,
          `${entryPath}.sourceManifest`,
          "The ticket's frozen source pointer/schema authority table does not match.",
        ),
      );
    const sourceTicket = read(manifestLink.ticketPointer, "sourceManifest.ticketPointer");
    if (sourceTicket !== authority.sourceTicketLiteral)
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.ticketSetInvalid,
          `${entryPath}.sourceManifest.ticketPointer`,
          "The source ticket literal does not exactly match its frozen authority value.",
        ),
      );
    const sourceSchema = read(manifestLink.schemaPointer, "sourceManifest.schemaPointer");
    if (sourceSchema !== manifestLink.schema || !allowedSourceSchemas.has(manifestLink.schema))
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.sourceSchemaInvalid,
          `${entryPath}.sourceManifest.schema`,
          "The source schema link is wrong or unsupported.",
        ),
      );
    const sourceResult = read(manifestLink.resultPointer, "sourceManifest.resultPointer");
    if (
      !EVIDENCE_RESULT_STATES.includes(manifestLink.resultState) ||
      !EVIDENCE_RESULT_STATES.includes(sourceResult as EvidenceResultState)
    )
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.unknownResultState,
          `${entryPath}.sourceManifest.resultState`,
          "The source or indexed result is outside the closed evidence result vocabulary.",
        ),
      );
    else if (sourceResult !== manifestLink.resultState)
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.resultLinkInvalid,
          `${entryPath}.sourceManifest.resultState`,
          "The indexed result differs from the immutable source result.",
        ),
      );
    const sourceFailures = read(manifestLink.failuresPointer, "sourceManifest.failuresPointer");
    if (
      !Array.isArray(sourceFailures) ||
      sha256CanonicalJson(sourceFailures) !== manifestLink.failuresDigest
    )
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.resultLinkInvalid,
          `${entryPath}.sourceManifest.failuresDigest`,
          "Retained failure references do not match the exact source failures array.",
        ),
      );
    const sourceNonclaims = read(manifestLink.nonclaimsPointer, "sourceManifest.nonclaimsPointer");
    if (
      !Array.isArray(sourceNonclaims) ||
      sha256CanonicalJson(sourceNonclaims) !== manifestLink.nonclaimsDigest
    )
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.nonclaimLinkInvalid,
          `${entryPath}.sourceManifest.nonclaimsDigest`,
          "Indexed nonclaims do not match the exact source nonclaims array.",
        ),
      );

    const traced = new Set<string>();
    const actualRequirementIds = entry.requirementLinks.map(({ requirementId }) => requirementId);
    if (
      !sameStrings(actualRequirementIds, authority.requirements) ||
      entry.requirementLinks.some(
        ({ sourcePointer }) => sourcePointer !== authority.requirementPointer,
      )
    )
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.requirementLinkInvalid,
          `${entryPath}.requirementLinks`,
          "The final product/invariant/acceptance trace differs from the frozen ticket authority table.",
        ),
      );
    for (const [linkIndex, link] of entry.requirementLinks.entries()) {
      const linked = read(
        link.sourcePointer,
        `requirementLinks[${String(linkIndex)}].sourcePointer`,
      );
      if (!Array.isArray(linked) || !linked.includes(link.requirementId))
        diagnostics.push(
          diagnostic(
            AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.requirementLinkInvalid,
            `${entryPath}.requirementLinks[${String(linkIndex)}]`,
            "The requirement ID is not present at its source pointer.",
          ),
        );
      else traced.add(link.requirementId);
    }

    const requiredLegacyTicket = entry.ticketId === "BLD-008" || entry.ticketId === "BLD-010";
    const authorityIds = entry.authorityLinks.map(({ authorityId }) => authorityId);
    const correctAuthoritySet =
      authorityIds.length === 2 &&
      authorityIds.includes("OA-GOLD-001") &&
      authorityIds.includes("OA-REP-001");
    if (
      (requiredLegacyTicket && !correctAuthoritySet) ||
      (!requiredLegacyTicket && authorityIds.length !== 0)
    )
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.requiredAuthorityMissing,
          `${entryPath}.authorityLinks`,
          "Legacy OA addenda are required only, and exactly, for BLD-008 and BLD-010.",
        ),
      );
    for (const [linkIndex, link] of entry.authorityLinks.entries()) {
      const authorityPointers = authority.legacyAuthorities[
        link.authorityId as keyof typeof authority.legacyAuthorities
      ] as readonly string[] | undefined;
      const reference =
        legacyAuthorityReferences[entry.ticketId as keyof typeof legacyAuthorityReferences];
      if (
        link.sourceManifestDigest !== manifestLink.digest ||
        !isSha256Digest(link.sourceEvidenceDigest) ||
        link.authorityReference !== reference ||
        !authorityPointers ||
        authorityPointers.length === 0 ||
        !sameStrings(link.sourcePointers, authorityPointers)
      )
        diagnostics.push(
          diagnostic(
            AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.requiredAuthorityMissing,
            `${entryPath}.authorityLinks[${String(linkIndex)}]`,
            "The authority addendum is not an exact immutable link to the controlled source pointers and final corpus authority.",
          ),
        );
      const values = link.sourcePointers.map((pointer, pointerIndex) =>
        read(
          pointer,
          `authorityLinks[${String(linkIndex)}].sourcePointers[${String(pointerIndex)}]`,
        ),
      );
      if (
        values.some((value) => value === undefined) ||
        sha256CanonicalJson(values) !== link.sourceEvidenceDigest
      )
        diagnostics.push(
          diagnostic(
            AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.requiredAuthorityMissing,
            `${entryPath}.authorityLinks[${String(linkIndex)}].sourceEvidenceDigest`,
            "The addendum source-field digest does not match.",
          ),
        );
      traced.add(link.authorityId);
    }
    for (const required of ["OA-GOLD-001", "OA-REP-001"])
      if (!traced.has(required))
        diagnostics.push(
          diagnostic(
            AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.requiredAuthorityMissing,
            `${entryPath}.requirementLinks`,
            `${required} is not traceable without changing the source result.`,
          ),
        );

    if (
      entry.fixtureDisposition !== authority.fixtureDisposition ||
      entry.fixtureLinks.length !== authority.fixtures.length ||
      entry.fixtureLinks.some((link, index) => {
        const expected = authority.fixtures[index];
        return (
          !expected ||
          link.identityPointer !== expected[0] ||
          link.revisionPointer !== expected[1] ||
          link.digestPointer !== expected[2] ||
          link.linkage !== expected[3] ||
          link.digestScope !== expected[4]
        );
      })
    )
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.fixtureLinkInvalid,
          `${entryPath}.fixtureLinks`,
          "Fixture links or exact no-source-fixture disposition differ from the frozen per-ticket table.",
        ),
      );
    for (const [linkIndex, link] of entry.fixtureLinks.entries()) {
      const identityValue = read(
        link.identityPointer,
        `fixtureLinks[${String(linkIndex)}].identityPointer`,
      );
      const revisionValue = read(
        link.revisionPointer,
        `fixtureLinks[${String(linkIndex)}].revisionPointer`,
      );
      const digestValue = read(
        link.digestPointer,
        `fixtureLinks[${String(linkIndex)}].digestPointer`,
      );
      const digest = normalizedDigest(digestValue);
      let valid = digest === link.digest && isSha256Digest(link.digest);
      if (link.linkage === "source-recorded")
        valid &&=
          identityValue === link.fixtureIdentity &&
          String(revisionValue) === link.fixtureRevision &&
          link.digestScope === "single-fixture";
      else if (link.linkage === "source-recorded-combined")
        valid &&=
          typeof revisionValue === "string" &&
          revisionValue === link.fixtureRevision &&
          revisionValue.startsWith(`${link.fixtureIdentity}:`) &&
          link.digestScope === "combined-fixture-helper";
      else if (link.linkage === "legacy-no-source-fixture-recorded")
        valid &&=
          identityValue === link.fixtureIdentity &&
          link.fixtureRevision === "NOT_RECORDED_IN_SOURCE" &&
          normalizedDigest(revisionValue) === link.digest &&
          link.digestScope === "content-addressed-legacy" &&
          entry.ticketId === "BLD-010";
      else valid = false;
      if (!valid)
        diagnostics.push(
          diagnostic(
            AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.fixtureLinkInvalid,
            `${entryPath}.fixtureLinks[${String(linkIndex)}]`,
            "Fixture identity, revision, digest, scope, or legacy linkage differs from the source.",
          ),
        );
    }

    const oracle = entry.oracleLink;
    if (
      oracle.versionPointer !== `${authority.oracleBase}/version` ||
      oracle.methodPointer !== `${authority.oracleBase}/method` ||
      oracle.tolerancePointer !== `${authority.oracleBase}/tolerance`
    )
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.oracleLinkInvalid,
          `${entryPath}.oracleLink`,
          "Oracle pointers differ from the frozen per-ticket authority table.",
        ),
      );
    if (
      read(oracle.versionPointer, "oracleLink.versionPointer") !== oracle.version ||
      read(oracle.methodPointer, "oracleLink.methodPointer") !== oracle.method ||
      read(oracle.tolerancePointer, "oracleLink.tolerancePointer") !== oracle.tolerance ||
      oracle.oracleId !== oracle.version ||
      oracle.tolerance !== "exact"
    )
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.oracleLinkInvalid,
          `${entryPath}.oracleLink`,
          "The exact comparison oracle linkage differs from source.",
        ),
      );
    if (
      entry.revisionLinks.length !== authority.revisions.length ||
      entry.revisionLinks.some((link, index) => {
        const expected = authority.revisions[index];
        return (
          !expected ||
          link.revisionId !== expected[0] ||
          link.sourcePointer !== expected[1] ||
          link.linkage !== expected[2]
        );
      })
    )
      diagnostics.push(
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.revisionLinkInvalid,
          `${entryPath}.revisionLinks`,
          "Contract/schema/implementation revision links differ from the frozen ticket authority table.",
        ),
      );
    for (const [linkIndex, link] of entry.revisionLinks.entries()) {
      const value = read(link.sourcePointer, `revisionLinks[${String(linkIndex)}].sourcePointer`);
      const valid =
        link.linkage === "source-recorded"
          ? value === link.revision
          : normalizedDigest(value) !== null &&
            link.revision === `content-addressed:${normalizedDigest(value)}`;
      if (!valid)
        diagnostics.push(
          diagnostic(
            AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.revisionLinkInvalid,
            `${entryPath}.revisionLinks[${String(linkIndex)}]`,
            "The revision link differs from the exact source value.",
          ),
        );
    }
  }
  return diagnostics;
}

async function validateIndex(
  input: unknown,
  source: AggregateEvidenceManifestSource,
): Promise<AggregateEvidenceIndexResult> {
  const diagnostics = shapeDiagnostics(input);
  if (diagnostics.length > 0) return { ok: false, diagnostics: freezeDeep(diagnostics) };
  const index = input as AggregateEvidenceIndex;
  if (!isSha256Digest(index.inventoryDigest))
    return {
      ok: false,
      diagnostics: freezeDeep([
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.digestInvalid,
          "$.inventoryDigest",
          "The inventory digest is not an algorithm-qualified SHA-256 digest.",
        ),
      ]),
    };
  const draft = Object.fromEntries(
    Object.entries(index).filter(([key]) => key !== "inventoryDigest"),
  );
  const expectedDigest = sha256CanonicalJson(draft);
  if (expectedDigest !== index.inventoryDigest)
    return {
      ok: false,
      diagnostics: freezeDeep([
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.digestMismatch,
          "$.inventoryDigest",
          "The inventory digest does not match the canonical index body.",
        ),
      ]),
    };
  const sourceDiagnostics = await validateSources(index, source);
  if (sourceDiagnostics.length > 0)
    return { ok: false, diagnostics: freezeDeep(sourceDiagnostics) };
  const frozen = freezeDeep(index);
  return { ok: true, index: frozen, canonicalJson: canonicalizeJson(frozen) };
}

export async function writeAggregateEvidenceIndex(
  draft: unknown,
  source: AggregateEvidenceManifestSource,
): Promise<AggregateEvidenceIndexResult> {
  let normalized: AggregateEvidenceIndexDraft;
  try {
    normalized = JSON.parse(canonicalizeJson(draft)) as AggregateEvidenceIndexDraft;
  } catch {
    return {
      ok: false,
      diagnostics: freezeDeep([
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.malformed,
          "$",
          "The draft is not closed canonical JSON.",
        ),
      ]),
    };
  }
  const index = { ...normalized, inventoryDigest: sha256CanonicalJson(normalized) };
  return validateIndex(index, source);
}

export async function readAggregateEvidenceIndex(
  text: unknown,
  source: AggregateEvidenceManifestSource,
): Promise<AggregateEvidenceIndexResult> {
  if (typeof text !== "string")
    return {
      ok: false,
      diagnostics: freezeDeep([
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.jsonInvalid,
          "$",
          "Index input must be JSON text.",
        ),
      ]),
    };
  let input: unknown;
  try {
    input = JSON.parse(text) as unknown;
  } catch {
    return {
      ok: false,
      diagnostics: freezeDeep([
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.jsonInvalid,
          "$",
          "Index input is not valid JSON.",
        ),
      ]),
    };
  }
  if (isRecord(input) && input["schemaVersion"] !== AGGREGATE_EVIDENCE_INDEX_SCHEMA_VERSION)
    return {
      ok: false,
      diagnostics: freezeDeep([
        diagnostic(
          AGGREGATE_EVIDENCE_INDEX_DIAGNOSTIC_CODES.unsupportedVersion,
          "$.schemaVersion",
          "The aggregate evidence index schema version is unsupported.",
        ),
      ]),
    };
  return validateIndex(input, source);
}
