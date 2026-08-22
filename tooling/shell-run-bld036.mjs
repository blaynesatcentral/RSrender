import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalizeJson, sha256Utf8 } from "../packages/contracts/dist/index.js";
import { openLogProjectFile } from "../packages/platform-electron-main/dist/index.js";
import { packageBoringLogEditor } from "./shell-package-bld026.mjs";
import { runPackaged } from "./shell-run-bld026.mjs";

const root = path.resolve(import.meta.dirname, "..");
const evidencePath = path.join(root, "artifacts", "bld-036-multi-boring-navigation-evidence.json");
const projectPath = path.join(
  root,
  ".tmp",
  "bld-036-multi-boring",
  "Packaged Multi Boring Proof.rsrender",
);
const projectLockPath = path.join(
  path.dirname(projectPath),
  `.rsrender-${createHash("sha256").update(projectPath.toLowerCase(), "utf8").digest("hex").slice(0, 24)}.save.lock`,
);
const pdfPath = path.join(root, ".tmp", "bld-036-multi-boring", "Active Boring 2 Proof.pdf");

export async function runMultiBoringNavigationQualification({ record = false } = {}) {
  await mkdir(path.dirname(projectPath), { recursive: true });
  await rm(projectPath, { force: true });
  await rm(projectLockPath, { force: true });
  await rm(pdfPath, { force: true });
  const packageResult = await packageBoringLogEditor();
  const run = await runPackaged(packageResult, 1, {
    profileLabel: "rsrender-bld036-multi-boring",
    probeArgument: "--rsrender-bld036-probe",
    profileArgumentPrefix: "--rsrender-bld027-profile=",
    timeoutMs: 240_000,
    extraArguments: [
      `--rsrender-bld027-output=${pdfPath}`,
      `--rsrender-bld035-output=${projectPath}`,
    ],
  });
  const navigation = run.result.boringNavigation;
  if (
    run.result.schema !== "rsrender.bld036.multi-boring-navigation-probe.v1" ||
    run.result.result !== "PASS" ||
    run.process.exitCode !== 0 ||
    run.process.timedOut ||
    run.process.stderrBytes !== 0 ||
    run.process.after !== 0 ||
    !run.process.profileRemoved ||
    navigation?.before?.active !== "urn:rsrender:boring-log:test-01" ||
    navigation?.before?.position !== "Boring 1 of 2" ||
    navigation?.second?.workingRevision !== navigation.before.workingRevision + 1 ||
    navigation?.first?.workingRevision !== navigation.second.workingRevision ||
    navigation?.second?.effective !== "Second boring retained its own authored description." ||
    navigation?.first?.effective !== "First boring retained its own authored description." ||
    !navigation?.before?.indicator?.includes("Has overrides") ||
    !navigation?.second?.indicator?.includes("Has overrides") ||
    !navigation?.first?.indicator?.includes("Has overrides") ||
    run.result.publication?.result !== "EXPORT_VERIFIED_SUCCESS" ||
    run.result.publication?.destinationPath !== pdfPath ||
    run.result.publication?.activeBoringLogIdentity !== "urn:rsrender:boring-log:test-02" ||
    run.result.persistence?.saved?.code !== "PROJECT_SAVE_VERIFIED" ||
    run.result.persistence?.bodyBound !== "true"
  ) {
    throw new Error(`BLD036_PACKAGED_NAVIGATION_INVALID:${JSON.stringify(run)}`);
  }

  const reopened = await openLogProjectFile(projectPath);
  if (!reopened.accepted) {
    throw new Error(`BLD036_PACKAGED_REOPEN_INVALID:${JSON.stringify(reopened)}`);
  }
  const project = reopened.value.project;
  const explorationOrder = project.layoutJobs.map(
    ({ document }) => document.identity.explorationId,
  );
  const membershipOrder = project.projectAggregate.logSet.memberships.map(
    ({ sourceExplorationIdentity }) => sourceExplorationIdentity,
  );
  const sourceExplorations =
    project.projectAggregate.phase1Inputs.acceptedSourceSnapshot.explorations;
  const overrideItems = project.presentationOverrideCollections.flatMap(({ items }) => items);
  if (
    project.layoutJobs.length !== 2 ||
    JSON.stringify(explorationOrder) !== JSON.stringify(membershipOrder) ||
    sourceExplorations.length !== 2 ||
    project.presentationOverrideCollections.length !== 1 ||
    new Set(overrideItems.map(({ targetSourceEntityIdentity }) => targetSourceEntityIdentity))
      .size < 2
  ) {
    throw new Error(`BLD036_PACKAGED_PROJECT_INVALID:${JSON.stringify(project)}`);
  }

  const evidence = {
    schema: "rsrender.bld036.multi-boring-navigation-evidence.v1",
    ticket: "BLD-036 / GitHub #80",
    result: "PASS",
    package: packageResult,
    run,
    project: {
      relativePath: path.relative(root, projectPath).replaceAll("\\", "/"),
      bytes: (await stat(projectPath)).size,
      authoritativeDigest: project.authoritativeDigest,
      documentIdentity: project.documentIdentity,
      layoutJobs: project.layoutJobs.length,
      explorationOrder,
      logSetMemberships: membershipOrder.length,
      sourceExplorations: sourceExplorations.length,
      presentationOverrideCollections: project.presentationOverrideCollections.length,
      effectiveOverrideItems: overrideItems.filter(({ enabled }) => enabled).length,
      distinctOverrideEntities: new Set(
        overrideItems.map(({ targetSourceEntityIdentity }) => targetSourceEntityIdentity),
      ).size,
    },
    pdf: {
      relativePath: path.relative(root, pdfPath).replaceAll("\\", "/"),
      bytes: (await stat(pdfPath)).size,
      pdfDigest: run.result.publication.pdfDigest,
      sceneDigest: run.result.publication.sceneDigest,
      projectionDigest: run.result.publication.projectionDigest,
      activeBoringLogIdentity: run.result.publication.activeBoringLogIdentity,
    },
    claims: {
      oneSharedProjectAuthority: true,
      searchableBoringSelector: true,
      previousNextFirstLastNavigation: true,
      perBoringSelectionPreserved: true,
      perBoringOverridesIsolated: true,
      navigationDoesNotAdvanceHistory: true,
      multiBoringPackageReopened: true,
      activeBoringPdfExportVerified: true,
      exactTwoBoringPackagedSlice: true,
      stressResourceThresholds: false,
    },
  };
  const canonical = `${canonicalizeJson(evidence)}\n`;
  if (record) {
    await mkdir(path.dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, canonical, "utf8");
  }
  return Object.freeze({
    ...evidence,
    evidenceSha256: sha256Utf8(canonical),
    evidenceRecorded:
      record &&
      (await access(evidencePath).then(
        () => true,
        () => false,
      )),
  });
}

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) {
  console.log(
    JSON.stringify(
      await runMultiBoringNavigationQualification({
        record: process.argv.includes("--record"),
      }),
    ),
  );
}
