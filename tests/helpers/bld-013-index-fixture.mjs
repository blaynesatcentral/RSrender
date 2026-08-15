import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";

import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";

export const sourceManifestInventory = Object.freeze({
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

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

function at(root, pointer) {
  let value = root;
  for (const encoded of pointer.slice(1).split("/")) {
    const segment = encoded.replaceAll("~1", "/").replaceAll("~0", "~");
    value = Array.isArray(value) ? value[Number(segment)] : value[segment];
  }
  return value;
}

function qualify(value) {
  return value.startsWith("sha256:") ? value : `sha256:${value}`;
}

export async function loadBld013Sources() {
  const textByPath = new Map();
  const jsonByTicket = new Map();
  for (const [ticket, inventory] of Object.entries(sourceManifestInventory)) {
    const text = await readFile(new URL(`../../${inventory.path}`, import.meta.url), "utf8");
    textByPath.set(inventory.path, text);
    jsonByTicket.set(ticket, JSON.parse(text));
  }
  return {
    jsonByTicket,
    source: Object.freeze({
      async readSourceManifest(path) {
        if (!textByPath.has(path)) throw new Error("SOURCE_NOT_SELECTED");
        return textByPath.get(path);
      },
    }),
    textByPath,
  };
}

function requirementLinks(ids, pointer) {
  return ids.map((requirementId) => ({ requirementId, sourcePointer: pointer }));
}

function sourceManifest(ticketId, source, overrides = {}) {
  const inventory = sourceManifestInventory[ticketId];
  const failuresPointer = overrides.failuresPointer ?? "/oracle/failures";
  const nonclaimsPointer = overrides.nonclaimsPointer ?? "/limitations";
  return {
    manifestIdentity: `${inventory.path}@${inventory.digest}`,
    path: inventory.path,
    digest: inventory.digest,
    ticketPointer: "/ticket",
    schemaPointer: "/schema",
    schema: source.schema,
    resultPointer: overrides.resultPointer ?? "/result",
    resultState: at(source, overrides.resultPointer ?? "/result"),
    failuresPointer,
    failuresDigest: sha256CanonicalJson(at(source, failuresPointer)),
    nonclaimsPointer,
    nonclaimsDigest: sha256CanonicalJson(at(source, nonclaimsPointer)),
  };
}

function authorityLink(ticketId, source, authorityId, sourcePointers, ticketNumber) {
  return {
    authorityId,
    linkage: "legacy-trace-addendum",
    authorityReference: `GitHub #${ticketNumber}; docs/planning/specifications/rsrender-phased-implementation-roadmap.md#93-next-frontier-unlocked-by-the-initial-parallel-tickets; docs/planning/specifications/rsrender-acceptance-strategy.md#81-evidence-manifest; docs/planning/specifications/sanitized-example-dataset-golden-log-corpus.md#mandatory-cross-cutting-oracle-atoms`,
    sourceManifestDigest: sourceManifestInventory[ticketId].digest,
    sourcePointers,
    sourceEvidenceDigest: sha256CanonicalJson(sourcePointers.map((pointer) => at(source, pointer))),
    noninterpretation: "linkage-metadata-only",
  };
}

function combinedFixture(source, revisionPointer, digestPointer) {
  const revision = at(source, revisionPointer);
  return {
    fixtureIdentity: revision.slice(0, revision.indexOf(":")),
    fixtureRevision: revision,
    digest: qualify(at(source, digestPointer)),
    digestScope: "combined-fixture-helper",
    linkage: "source-recorded-combined",
    identityPointer: revisionPointer,
    revisionPointer,
    digestPointer,
  };
}

function recordedFixture(source, identityPointer, revisionPointer, digestPointer) {
  return {
    fixtureIdentity: at(source, identityPointer),
    fixtureRevision: String(at(source, revisionPointer)),
    digest: qualify(at(source, digestPointer)),
    digestScope: "single-fixture",
    linkage: "source-recorded",
    identityPointer,
    revisionPointer,
    digestPointer,
  };
}

function oracleLink(source, base) {
  return {
    oracleId: at(source, `${base}/version`),
    version: at(source, `${base}/version`),
    method: at(source, `${base}/method`),
    tolerance: at(source, `${base}/tolerance`),
    versionPointer: `${base}/version`,
    methodPointer: `${base}/method`,
    tolerancePointer: `${base}/tolerance`,
  };
}

function contentRevision(source, revisionId, pointer) {
  return {
    revisionId,
    revision: `content-addressed:${qualify(at(source, pointer))}`,
    sourcePointer: pointer,
    linkage: "content-addressed-source",
  };
}

function recordedRevision(source, revisionId, pointer) {
  return {
    revisionId,
    revision: at(source, pointer),
    sourcePointer: pointer,
    linkage: "source-recorded",
  };
}

export async function bld013IndexDraft() {
  const { jsonByTicket, source } = await loadBld013Sources();
  const b8 = jsonByTicket.get("BLD-008");
  const b9 = jsonByTicket.get("BLD-009");
  const b10 = jsonByTicket.get("BLD-010");
  const b11 = jsonByTicket.get("BLD-011");
  const b12 = jsonByTicket.get("BLD-012");

  return {
    draft: {
      schemaVersion: "rsrender.aggregate-evidence-index.v1",
      indexId: "BLD-013-EVIDENCE-INDEX",
      indexRevision: 1,
      purpose: "traceability-and-referential-integrity-only",
      entries: [
        {
          entryId: "BLD-013-ENTRY-BLD-008",
          ticketId: "BLD-008",
          sourceManifest: sourceManifest("BLD-008", b8),
          requirementLinks: requirementLinks(b8.authority.requirements, "/authority/requirements"),
          authorityLinks: [
            authorityLink(
              "BLD-008",
              b8,
              "OA-GOLD-001",
              [
                "/authority/corpusVersion",
                "/authority/fixtureRevisions",
                "/oracle/comparison",
                "/environment",
                "/custody",
              ],
              52,
            ),
            authorityLink(
              "BLD-008",
              b8,
              "OA-REP-001",
              ["/custody/classification", "/limitations"],
              52,
            ),
          ],
          fixtureDisposition: "source-recorded-fixtures",
          fixtureLinks: b8.authority.fixtureRevisions.map((_, index) =>
            combinedFixture(b8, `/authority/fixtureRevisions/${index}`, "/artifacts/3/sha256"),
          ),
          oracleLink: oracleLink(b8, "/oracle/comparison"),
          revisionLinks: [contentRevision(b8, "domain-value-record", "/artifacts/1/sha256")],
        },
        {
          entryId: "BLD-013-ENTRY-BLD-009",
          ticketId: "BLD-009",
          sourceManifest: sourceManifest("BLD-009", b9),
          requirementLinks: requirementLinks(b9.authority.requirements, "/authority/requirements"),
          authorityLinks: [],
          fixtureDisposition: "source-recorded-fixtures",
          fixtureLinks: b9.authority.fixtureRevisions.map((_, index) =>
            combinedFixture(b9, `/authority/fixtureRevisions/${index}`, "/artifacts/4/sha256"),
          ),
          oracleLink: oracleLink(b9, "/oracle/comparison"),
          revisionLinks: [
            contentRevision(b9, "log-template-project-aggregate", "/artifacts/0/sha256"),
          ],
        },
        {
          entryId: "BLD-013-ENTRY-BLD-010",
          ticketId: "BLD-010",
          sourceManifest: sourceManifest("BLD-010", b10),
          requirementLinks: requirementLinks(b10.authority.requirements, "/authority/requirements"),
          authorityLinks: [
            authorityLink(
              "BLD-010",
              b10,
              "OA-GOLD-001",
              [
                "/artifacts/6/path",
                "/artifacts/6/sha256",
                "/oracle/comparison",
                "/environment",
                "/custody",
              ],
              54,
            ),
            authorityLink(
              "BLD-010",
              b10,
              "OA-REP-001",
              ["/custody/classification", "/limitations/0"],
              54,
            ),
          ],
          fixtureDisposition: "legacy-no-source-fixture-recorded",
          fixtureLinks: [],
          oracleLink: oracleLink(b10, "/oracle/comparison"),
          revisionLinks: [
            recordedRevision(
              b10,
              "application-service-contract",
              "/contract/applicationServiceContractRevision",
            ),
            recordedRevision(
              b10,
              "in-memory-application-service",
              "/contract/inMemoryApplicationServiceRevision",
            ),
          ],
        },
        {
          entryId: "BLD-013-ENTRY-BLD-011",
          ticketId: "BLD-011",
          sourceManifest: sourceManifest("BLD-011", b11),
          requirementLinks: requirementLinks(b11.authority.requirements, "/authority/requirements"),
          authorityLinks: [],
          fixtureDisposition: "source-recorded-fixtures",
          fixtureLinks: [
            recordedFixture(
              b11,
              "/oracle/fixture/identity",
              "/oracle/fixture/revision",
              "/oracle/fixture/sha256",
            ),
            recordedFixture(
              b11,
              "/oracle/propertyOracle/identity",
              "/oracle/propertyOracle/revision",
              "/oracle/propertyOracle/sha256",
            ),
          ],
          oracleLink: oracleLink(b11, "/oracle/comparison"),
          revisionLinks: [
            recordedRevision(b11, "history-core-contract", "/contract/historyCoreContractRevision"),
            recordedRevision(
              b11,
              "in-memory-history-core",
              "/contract/inMemoryHistoryCoreRevision",
            ),
            recordedRevision(b11, "history-reducer", "/contract/reducerRevision"),
            recordedRevision(b11, "history", "/contract/historyRevision"),
          ],
        },
        {
          entryId: "BLD-013-ENTRY-BLD-012",
          ticketId: "BLD-012",
          sourceManifest: sourceManifest("BLD-012", b12, {
            resultPointer: "/sourceResult/state",
            failuresPointer: "/oracle/failures",
            nonclaimsPointer: "/nonClaims",
          }),
          requirementLinks: requirementLinks(b12.trace, "/trace"),
          authorityLinks: [],
          fixtureDisposition: "source-recorded-fixtures",
          fixtureLinks: [
            recordedFixture(b12, "/fixture/identity", "/fixture/revision", "/fixture/sha256"),
          ],
          oracleLink: oracleLink(b12, "/oracle"),
          revisionLinks: [
            recordedRevision(
              b12,
              "application-version-contract",
              "/revisions/applicationVersionContract",
            ),
            recordedRevision(
              b12,
              "application-version-handler",
              "/revisions/applicationVersionHandler",
            ),
            recordedRevision(
              b12,
              "application-version-transport",
              "/revisions/applicationVersionTransport",
            ),
            recordedRevision(b12, "generated-preload", "/revisions/generatedPreload"),
          ],
        },
      ],
      nonclaims: [
        "Traceability and referential-integrity result only; not aggregate acceptance or release readiness.",
        "Source manifests were not rerun, rewritten, reinterpreted, or promoted.",
        "All linked fixtures and vectors remain synthetic and nonrepresentative.",
      ],
    },
    source,
  };
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export const bld013RepoRoot = repoRoot;
