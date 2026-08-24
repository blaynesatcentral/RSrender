import { createHash } from "node:crypto";
import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalizeJson } from "../packages/contracts/dist/index.js";
import { openLogProjectFile } from "../packages/platform-electron-main/dist/index.js";
import { runPackaged } from "./shell-run-bld026.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(root, ".tmp", "bld-040-authoring-surface");
const evidencePath = path.join(root, "artifacts", "bld-040-authoring-surface-evidence.json");
const failurePath = path.join(outputRoot, "last-packaged-probe-failure.json");
const projectPath = path.join(outputRoot, "Packaged Authoring Surface Proof.rsrender");
const projectLockPath = path.join(
  outputRoot,
  `.rsrender-${createHash("sha256").update(projectPath.toLowerCase(), "utf8").digest("hex").slice(0, 24)}.save.lock`,
);
const pdfPath = path.join(outputRoot, "Authoring Surface Proof.pdf");

export async function runAuthoringSurfaceQualification({ record = false } = {}) {
  await mkdir(outputRoot, { recursive: true });
  await rm(projectPath, { force: true });
  await rm(projectLockPath, { force: true });
  await rm(pdfPath, { force: true });
  await rm(failurePath, { force: true });
  process.env.RSRENDER_BORING_LOG_PACKAGE_LABEL = `bld-040-authoring-surface-${process.pid}`;
  const { packageBoringLogEditor } = await import(
    `${pathToFileURL(path.join(root, "tooling", "shell-package-bld026.mjs")).href}?bld040=${Date.now()}`
  );
  const packageResult = await packageBoringLogEditor();
  const run = await runPackaged(packageResult, 1, {
    profileLabel: `rsrender-bld040-authoring-surface-${process.pid}`,
    probeArgument: "--rsrender-bld040-probe",
    profileArgumentPrefix: "--rsrender-bld025-profile=",
    timeoutMs: 600_000,
    extraArguments: [
      `--rsrender-bld027-output=${pdfPath}`,
      `--rsrender-bld035-output=${projectPath}`,
    ],
  });
  const authoring = run.result.authoringSurface;
  if (
    run.result.schema !== "rsrender.bld040.authoring-surface-probe.v1" ||
    run.result.result !== "PASS" ||
    run.process.exitCode !== 0 ||
    run.process.timedOut ||
    run.process.stderrBytes !== 0 ||
    run.process.after !== 0 ||
    !run.process.profileRemoved ||
    authoring?.grouped?.childIds?.length !== 2 ||
    authoring?.grouped?.contentsGroup !== true ||
    authoring?.duplicated?.cloneIds?.length !== 2 ||
    authoring?.duplicated?.selectedCount !== 2 ||
    authoring?.cut?.hiddenCount !== 2 ||
    authoring?.cut?.paintedCount !== 0 ||
    authoring?.pasted?.cloneCount !== 4 ||
    authoring?.pasted?.selectedIds?.length !== 2 ||
    run.result.publication?.result !== "EXPORT_VERIFIED_SUCCESS"
  ) {
    await writeFile(failurePath, `${JSON.stringify(run, null, 2)}\n`, "utf8");
    throw new Error(`BLD040_PACKAGED_PROBE_INVALID:${JSON.stringify(run)}`);
  }
  const reopened = await openLogProjectFile(projectPath);
  if (!reopened.accepted) throw new Error(`BLD040_PROJECT_REOPEN_INVALID:${reopened.code}`);
  const authoredJob = reopened.value.project.layoutJobs.find(
    ({ template }) =>
      (template.textOccurrenceClones?.length ?? 0) === 4 &&
      (template.textOccurrenceGroups?.length ?? 0) === 1,
  );
  if (authoredJob === undefined) throw new Error("BLD040_PROJECT_AUTHORING_CONTENT_INVALID");

  const evidence = Object.freeze({
    schema: "rsrender.bld040.authoring-surface-evidence.v1",
    ticket: "BLD-040 / GitHub #84",
    result: "PASS",
    package: packageResult,
    run,
    project: Object.freeze({
      relativePath: path.relative(root, projectPath).replaceAll("\\", "/"),
      bytes: (await stat(projectPath)).size,
      authoritativeDigest: reopened.value.project.authoritativeDigest,
      cloneCount: authoredJob.template.textOccurrenceClones?.length,
      groupCount: authoredJob.template.textOccurrenceGroups?.length,
    }),
    pdf: Object.freeze({
      relativePath: path.relative(root, pdfPath).replaceAll("\\", "/"),
      bytes: (await stat(pdfPath)).size,
      pdfDigest: run.result.publication.pdfDigest,
      sceneDigest: run.result.publication.sceneDigest,
      projectionDigest: run.result.publication.projectionDigest,
    }),
    claims: Object.freeze({
      ribbonContextAndKeyboardParity: true,
      duplicateCutPasteDeleteRecovery: true,
      groupUngroupHistory: true,
      contentsHierarchySynchronized: true,
      saveReopenRetainsClonesAndGroups: true,
      sameScenePdfExportAfterAuthoring: true,
    }),
  });
  const canonical = `${canonicalizeJson(evidence)}\n`;
  if (record) {
    await mkdir(path.dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, canonical, "utf8");
  }
  return Object.freeze({
    ...evidence,
    evidenceSha256: `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`,
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
      await runAuthoringSurfaceQualification({ record: process.argv.includes("--record") }),
    ),
  );
}
