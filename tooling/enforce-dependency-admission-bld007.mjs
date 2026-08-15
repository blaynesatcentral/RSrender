import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  applyBld007DriftFixture,
  BLD007_POLICY,
  canonicalJson,
  enforceDependencyPolicy,
  loadBld007Inputs,
  prettyJson,
  sha256,
} from "./dependency-enforcement-bld007.mjs";

const root = path.resolve(import.meta.dirname, "..");
const writeArtifacts = process.argv.includes("--write");
const fixturePath = path.join(root, "tests/fixtures/bld-007-drift-fixtures.json");

export async function runBld007Enforcement() {
  const input = await loadBld007Inputs(root);
  const first = enforceDependencyPolicy(input);
  const freshRuns = [0, 1].map(() =>
    spawnSync(
      process.execPath,
      [path.join(root, "tooling", "enforce-dependency-admission-bld007.mjs"), "--snapshot"],
      { cwd: root, encoding: "utf8", windowsHide: true },
    ),
  );
  const freshSnapshots = freshRuns.map((run) => {
    try {
      return run.status === 0 ? JSON.parse(run.stdout.trim()) : null;
    } catch {
      return null;
    }
  });
  const deterministic =
    freshSnapshots.every(Boolean) &&
    canonicalJson(freshSnapshots[0]) === canonicalJson(freshSnapshots[1]);
  const fixtureDefinitions = JSON.parse(await readFile(fixturePath, "utf8"));
  const fixtureResults = fixtureDefinitions.map((fixture) => {
    const result = enforceDependencyPolicy(applyBld007DriftFixture(input, fixture.id));
    const codes = result.diagnostics.map((diagnostic) => diagnostic.code);
    return {
      id: fixture.id,
      expectedCode: fixture.expectedCode,
      result: result.result,
      observedCodes: codes,
      observedDiagnostics: result.diagnostics,
      expectedFailureObserved: result.result === "FAIL" && codes.includes(fixture.expectedCode),
    };
  });
  const fixturesPass = fixtureResults.every((fixture) => fixture.expectedFailureObserved);
  let result = first.result === "PASS" && deterministic && fixturesPass ? "PASS" : "FAIL";
  const generatedAtUtc = "2026-08-14T00:00:00.000Z";
  const sourceFiles = [
    "package.json",
    "package-lock.json",
    "docs/governance/bld-001-authority-approval-packet.md",
    "docs/governance/bld-001-internal-dependency-admission.json",
    "docs/governance/bld-007-workspace-topology-approvals.json",
    "docs/planning/evidence/bld-001-foundation-verification.md",
    "tooling/dependency-enforcement-bld007.mjs",
    "tooling/enforce-dependency-admission-bld007.mjs",
    "tests/bld-007-dependency-enforcement.test.mjs",
    "tests/fixtures/bld-007-drift-fixtures.json",
  ];
  const sourceDigests = Object.fromEntries(
    await Promise.all(
      sourceFiles.map(async (relativePath) => [
        relativePath,
        `sha256:${sha256(await readFile(path.join(root, relativePath)))}`,
      ]),
    ),
  );
  const evidence = {
    schema: "rsrender.bld007.enforcement-evidence.v0",
    ticket: "BLD-007 / GitHub #51",
    generatedAtUtc,
    result,
    acceptanceRowResult: "BLOCKED",
    scope: "continuous enforcement of the prior BLD-001 internal-only admission",
    acceptanceTrace: ["P07-harness-seam", "product-14", "product-21", "architecture-14"],
    cleanRuns: {
      repetitions: 2,
      deterministic,
      result: first.result,
      artifactDigests: first.artifactDigests,
      identityCount: first.inventories.custody.counts.admittedIdentities,
      dependencyEdgeCount: first.inventories.custody.counts.dependencyEdges,
      assetCount: first.inventories.assets.assets.length,
    },
    baseline: {
      bld001ProductionLockSha256: BLD007_POLICY.bld001ProductionLockSha256,
      implementationTopologyLockSha256:
        first.inventories.custody.inputDigests.implementationTopologyLockSha256,
      implementationTopologyAuthority: BLD007_POLICY.implementationTopologyAuthority,
      admittedExternalIdentityCount: BLD007_POLICY.productionIdentityCount,
      observedExternalIdentityCount: first.inventories.custody.counts.admittedIdentities,
      unexpectedExternalIdentityCount: 0,
      changedExternalSourceOrIntegrityCount: 0,
      workspacePackageCount: first.inventories.custody.counts.workspacePackageCount,
    },
    intentionalFailures: fixtureResults,
    sourceDigests,
    environment: {
      profile: "EP-PURE bounded enforcement harness",
      node: process.version.slice(1),
      npm: BLD007_POLICY.npmVersion,
      platform: "Windows-sanitized",
      architecture: process.arch,
    },
    privacy: {
      scanResult: "PENDING",
      classification: "REPOSITORY_SAFE_DEPENDENCY_METADATA",
      hostnameRetained: false,
      usernameRetained: false,
      absolutePathRetained: false,
      productionDataRetained: false,
      credentialsRetained: false,
      proprietaryAssetRetained: false,
    },
    rerunCommands: [
      "npm run dependency:enforce",
      "npm run dependency:test:drift",
      "npm run verify",
    ],
    invalidationTriggers: [
      "package.json or package-lock.json changes",
      "dependency version, graph, source, integrity, license, notice, signature, attestation, or lifecycle metadata changes",
      "BLD-001 authority, scope, admission, contribution policy, or production-lock evidence changes",
      "Node/npm/tooling version changes",
      "production asset, font, picture, icon, hatch, fixture, binary, or native module introduction",
      "public, external, commercial, sale, assignment, transfer, or buyer-transfer scope is proposed",
    ],
    nonclaims: [
      "This automation enforces prior BLD-001 decisions and cannot create an admission, exception, rights disposition, or approval.",
      "This is not complete release-level P07, legal approval, vulnerability remediation, external distribution, sale, or transfer acceptance.",
      "No Esri, Rocscience, RSLog, client, go-by, font, hatch, picture, icon, or other production asset entered the inventory.",
    ],
  };
  const evidenceTranscript = prettyJson(evidence);
  const evidencePrivacyPass =
    !/(?:^|["'\s])[A-Za-z]:[\\/]/u.test(evidenceTranscript) &&
    !/(?:authorization\s*:|bearer\s+[A-Za-z0-9._-]+|api[_-]?key\s*[:=])/iu.test(evidenceTranscript);
  evidence.privacy.scanResult = evidencePrivacyPass ? "PASS" : "FAIL";
  if (!evidencePrivacyPass) {
    result = "FAIL";
    evidence.result = "FAIL";
  }

  if (writeArtifacts) {
    await mkdir(path.join(root, "artifacts"), { recursive: true });
    const outputs = {
      "bld-007-sbom.spdx.json": first.artifacts.spdx,
      "bld-007-dependency-custody.json": first.artifacts.custody,
      "bld-007-asset-inventory.json": first.artifacts.assets,
      "bld-007-third-party-notices.txt": first.artifacts.notices,
      "bld-007-dependency-enforcement-evidence.json": prettyJson(evidence),
    };
    for (const [name, bytes] of Object.entries(outputs)) {
      await writeFile(path.join(root, "artifacts", name), bytes, "utf8");
    }
  }

  return { result, deterministic, fixturesPass, fixtureResults, evidence, clean: first };
}

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) {
  if (process.argv.includes("--snapshot")) {
    try {
      if (process.env.BLD007_TEST_INPUT_FAILURE === "1") throw new Error("fixture");
      const input = await loadBld007Inputs(root);
      const result = enforceDependencyPolicy(input);
      console.log(
        JSON.stringify({
          result: result.result,
          diagnostics: result.diagnostics,
          artifactDigests: result.artifactDigests,
        }),
      );
      process.exitCode = 0;
    } catch {
      console.log(
        JSON.stringify({
          result: "FAIL",
          diagnostics: [
            {
              code: "BLD007_SANITIZED_INPUT_FAILURE",
              subject: "input-load",
              consequence:
                "A required input could not be loaded or parsed; build and distribution stop.",
            },
          ],
          artifactDigests: {},
        }),
      );
      process.exitCode = 1;
    }
  } else {
    try {
      const result = await runBld007Enforcement();
      console.log(
        JSON.stringify({
          result: result.result,
          deterministic: result.deterministic,
          driftFixtures: `${result.fixtureResults.filter((fixture) => fixture.expectedFailureObserved).length}/${result.fixtureResults.length}`,
          artifactDigests: result.clean.artifactDigests,
          evidenceSha256: `sha256:${sha256(canonicalJson(result.evidence))}`,
        }),
      );
      if (result.result !== "PASS") {
        for (const diagnostic of result.clean.diagnostics)
          console.error(JSON.stringify(diagnostic));
        for (const fixture of result.fixtureResults.filter(
          (value) => !value.expectedFailureObserved,
        )) {
          console.error(JSON.stringify(fixture));
        }
        process.exitCode = 1;
      }
    } catch {
      console.error(
        JSON.stringify({
          code: "BLD007_SANITIZED_INPUT_FAILURE",
          subject: "input-load",
          consequence:
            "A required input could not be loaded or parsed; build and distribution stop.",
        }),
      );
      process.exitCode = 1;
    }
  }
}
