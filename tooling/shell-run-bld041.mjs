import { createHash } from "node:crypto";
import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalizeJson } from "../packages/contracts/dist/index.js";
import { openLogProjectFile } from "../packages/platform-electron-main/dist/index.js";
import { inspectBoringLogPdfPackage } from "./inspect-boring-log-pdf-package.mjs";
import { runPackaged } from "./shell-run-bld026.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(root, ".tmp", "bld-041-integrated-beta");
const evidencePath = path.join(root, "artifacts", "bld-041-integrated-beta-evidence.json");
const checkpointPath = path.join(outputRoot, "qualification-checkpoint.json");
const currentRunCheckpointPath = path.join(outputRoot, "qualification-current-run.json");
const projectOrderTitles = Object.freeze(["BORING LOG TEST-01", "BORING LOG TEST-02"]);
const directPageSizesPoints = Object.freeze([
  Object.freeze([612, 792]),
  Object.freeze([612, 792]),
  Object.freeze([612, 792]),
]);
const authoringPageSizesPoints = Object.freeze([
  Object.freeze([612, 792]),
  Object.freeze([612, 792]),
]);

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function writeCheckpoint(packageResult, sessions) {
  await writeFile(
    checkpointPath,
    `${canonicalizeJson({
      schema: "rsrender.bld041.qualification-checkpoint.v1",
      package: packageResult,
      completedSessionRoles: sessions.map(({ role }) => role),
      sessions,
    })}\n`,
    "utf8",
  );
}

async function writeCurrentRunCheckpoint(role, run) {
  await writeFile(
    currentRunCheckpointPath,
    `${canonicalizeJson({
      schema: "rsrender.bld041.current-run-checkpoint.v1",
      role,
      run,
    })}\n`,
    "utf8",
  );
}

async function runDirectSession(packageResult) {
  const projectPath = path.join(outputRoot, "Fresh Session 1 Direct.rsrender");
  const pdfPath = path.join(outputRoot, "Fresh Session 1 Direct.pdf");
  await rm(projectPath, { force: true });
  await rm(pdfPath, { force: true });
  const run = await runPackaged(packageResult, 1, {
    profileLabel: `rsrender-bld041-direct-${process.pid}`,
    probeArgument: "--rsrender-bld038-probe",
    profileArgumentPrefix: "--rsrender-bld027-profile=",
    timeoutMs: 1_800_000,
    extraArguments: [
      "--rsrender-bld041-reliable-activation",
      `--rsrender-bld027-output=${pdfPath}`,
      `--rsrender-bld035-output=${projectPath}`,
    ],
  });
  await writeCurrentRunCheckpoint("direct-rich-editing", run);
  const direct = run.result.directManipulation;
  if (
    run.result.schema !== "rsrender.bld038.direct-manipulation-probe.v1" ||
    run.result.result !== "PASS" ||
    run.process.exitCode !== 0 ||
    run.process.timedOut ||
    run.process.stderrBytes !== 0 ||
    run.process.after !== 0 ||
    !run.process.profileRemoved ||
    run.result.initial?.panes !== 3 ||
    run.result.initial?.raster !== 0 ||
    run.result.boringNavigation?.before?.active !== "urn:rsrender:boring-log:test-01" ||
    run.result.textOccurrenceStyle?.applied?.fontSize !== "9000" ||
    run.result.textOccurrenceStyle?.applied?.fontWeight !== "700" ||
    direct?.before?.handleCount !== 8 ||
    direct?.livePreview?.liveReflowPreview !== "true" ||
    direct?.pageGuides?.deleteUndo?.guides?.length !== 1 ||
    run.result.publication?.result !== "EXPORT_VERIFIED_SUCCESS" ||
    run.result.publication?.pageCount !== 3 ||
    path.resolve(run.result.publication?.destinationPath ?? "") !== path.resolve(pdfPath) ||
    run.result.persistence?.saved?.code !== "PROJECT_SAVE_VERIFIED"
  ) {
    throw new Error("BLD041_DIRECT_SESSION_INVALID; inspect qualification-current-run.json");
  }
  const reopened = await openLogProjectFile(projectPath);
  const firstJob = reopened.accepted
    ? reopened.value.project.layoutJobs.find(
        ({ document }) => document.identity.boringLogId === "urn:rsrender:boring-log:test-01",
      )
    : undefined;
  if (
    !reopened.accepted ||
    reopened.value.readOnly ||
    reopened.value.project.layoutJobs.length !== 2 ||
    firstJob?.template.guides?.length !== 1
  ) {
    throw new Error("BLD041_DIRECT_PROJECT_REOPEN_INVALID");
  }
  const inspection = await inspectBoringLogPdfPackage({
    pdfPath,
    expectedOrderedTitles: projectOrderTitles,
    expectedPageSizesPoints: directPageSizesPoints,
    expectedProjectionDigest: run.result.publication.projectionDigest,
  });
  return Object.freeze({
    role: "direct-rich-editing",
    run,
    project: Object.freeze({
      relativePath: path.relative(root, projectPath).replaceAll("\\", "/"),
      bytes: (await stat(projectPath)).size,
      authoritativeDigest: reopened.value.project.authoritativeDigest,
      layoutJobCount: reopened.value.project.layoutJobs.length,
      guideCount: firstJob.template.guides.length,
    }),
    pdf: Object.freeze({
      relativePath: path.relative(root, pdfPath).replaceAll("\\", "/"),
      bytes: (await stat(pdfPath)).size,
      sceneDigest: run.result.publication.sceneDigest,
      projectionDigest: run.result.publication.projectionDigest,
      pdfDigest: run.result.publication.pdfDigest,
    }),
    inspection,
  });
}

async function runAuthoringSession(packageResult) {
  const projectPath = path.join(outputRoot, "Fresh Session 2 Authoring.rsrender");
  const pdfPath = path.join(outputRoot, "Fresh Session 2 Authoring.pdf");
  await rm(projectPath, { force: true });
  await rm(pdfPath, { force: true });
  const run = await runPackaged(packageResult, 2, {
    profileLabel: `rsrender-bld041-authoring-${process.pid}`,
    probeArgument: "--rsrender-bld040-probe",
    profileArgumentPrefix: "--rsrender-bld025-profile=",
    timeoutMs: 900_000,
    extraArguments: [
      "--rsrender-bld041-reliable-activation",
      `--rsrender-bld027-output=${pdfPath}`,
      `--rsrender-bld035-output=${projectPath}`,
    ],
  });
  await writeCurrentRunCheckpoint("professional-authoring", run);
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
    authoring?.cut?.hiddenCount !== 2 ||
    authoring?.pasted?.cloneCount !== 4 ||
    run.result.publication?.result !== "EXPORT_VERIFIED_SUCCESS" ||
    run.result.publication?.pageCount !== 2
  ) {
    throw new Error("BLD041_AUTHORING_SESSION_INVALID; inspect qualification-current-run.json");
  }
  const reopened = await openLogProjectFile(projectPath);
  const firstJob = reopened.accepted
    ? reopened.value.project.layoutJobs.find(
        ({ template }) =>
          template.textOccurrenceClones?.length === 4 &&
          template.textOccurrenceGroups?.length === 1,
      )
    : undefined;
  if (!reopened.accepted || reopened.value.readOnly || firstJob === undefined) {
    throw new Error("BLD041_AUTHORING_PROJECT_REOPEN_INVALID");
  }
  const inspection = await inspectBoringLogPdfPackage({
    pdfPath,
    expectedOrderedTitles: projectOrderTitles,
    expectedPageSizesPoints: authoringPageSizesPoints,
    expectedProjectionDigest: run.result.publication.projectionDigest,
  });
  return Object.freeze({
    role: "professional-authoring",
    run,
    project: Object.freeze({
      relativePath: path.relative(root, projectPath).replaceAll("\\", "/"),
      bytes: (await stat(projectPath)).size,
      authoritativeDigest: reopened.value.project.authoritativeDigest,
      cloneCount: firstJob.template.textOccurrenceClones.length,
      groupCount: firstJob.template.textOccurrenceGroups.length,
    }),
    pdf: Object.freeze({
      relativePath: path.relative(root, pdfPath).replaceAll("\\", "/"),
      bytes: (await stat(pdfPath)).size,
      sceneDigest: run.result.publication.sceneDigest,
      projectionDigest: run.result.publication.projectionDigest,
      pdfDigest: run.result.publication.pdfDigest,
    }),
    inspection,
  });
}

async function runPackagePublicationSession(packageResult) {
  const pdfPath = path.join(outputRoot, "Fresh Session 3 Ordered Log Set.pdf");
  await rm(pdfPath, { force: true });
  const run = await runPackaged(packageResult, 3, {
    profileLabel: `rsrender-bld041-package-${process.pid}`,
    probeArgument: "--rsrender-bld044-probe",
    profileArgumentPrefix: "--rsrender-bld027-profile=",
    timeoutMs: 900_000,
    extraArguments: [
      "--rsrender-bld041-reliable-activation",
      `--rsrender-bld027-output=${pdfPath}`,
    ],
  });
  await writeCurrentRunCheckpoint("ordered-log-set-publication", run);
  const publication = run.result.publication;
  if (
    run.result.schema !== "rsrender.bld044.pdf-package-probe.v1" ||
    run.result.result !== "PASS" ||
    run.process.exitCode !== 0 ||
    run.process.timedOut ||
    run.process.stderrBytes !== 0 ||
    run.process.after !== 0 ||
    !run.process.profileRemoved ||
    publication?.result !== "EXPORT_VERIFIED_SUCCESS" ||
    publication?.pageCount !== 2 ||
    JSON.stringify(publication?.orderedBoringLogIdentities) !==
      '["urn:rsrender:boring-log:test-02","urn:rsrender:boring-log:test-01"]'
  ) {
    throw new Error("BLD041_PACKAGE_SESSION_INVALID; inspect qualification-current-run.json");
  }
  const inspection = await inspectBoringLogPdfPackage({
    pdfPath,
    expectedOrderedTitles: ["BORING LOG TEST-02", "BORING LOG TEST-01"],
    expectedPageSizesPoints: [
      [612, 792],
      [612, 792],
    ],
    expectedProjectionDigest: publication.projectionDigest,
  });
  return Object.freeze({
    role: "ordered-log-set-publication",
    run,
    pdf: Object.freeze({
      relativePath: path.relative(root, pdfPath).replaceAll("\\", "/"),
      bytes: (await stat(pdfPath)).size,
      pageCount: publication.pageCount,
      orderedBoringLogIdentities: publication.orderedBoringLogIdentities,
      sceneDigest: publication.sceneDigest,
      projectionDigest: publication.projectionDigest,
      pdfDigest: publication.pdfDigest,
    }),
    inspection,
  });
}

export async function runIntegratedBetaQualification({ record = false } = {}) {
  await mkdir(outputRoot, { recursive: true });
  await rm(checkpointPath, { force: true });
  await rm(currentRunCheckpointPath, { force: true });
  process.env.RSRENDER_BORING_LOG_PACKAGE_LABEL = `bld-041-integrated-beta-${process.pid}`;
  const { packageBoringLogEditor } = await import(
    `${pathToFileURL(path.join(root, "tooling", "shell-package-bld026.mjs")).href}?bld041=${Date.now()}`
  );
  const packageResult = await packageBoringLogEditor();
  const completedSessions = [];
  completedSessions.push(await runDirectSession(packageResult));
  await writeCheckpoint(packageResult, completedSessions);
  completedSessions.push(await runAuthoringSession(packageResult));
  await writeCheckpoint(packageResult, completedSessions);
  completedSessions.push(await runPackagePublicationSession(packageResult));
  await writeCheckpoint(packageResult, completedSessions);
  const sessions = Object.freeze(completedSessions);
  const evidence = Object.freeze({
    schema: "rsrender.bld041.integrated-beta-evidence.v1",
    ticket: "BLD-041 / GitHub #85",
    result: "PASS",
    package: packageResult,
    sessions,
    claims: Object.freeze({
      onePackagedExecutableThreeFreshSessions: true,
      projectNewSaveAsSaveReopen: true,
      multiBoringNavigationAndIsolation: true,
      exactOccurrenceSelectionAndRichProperties: true,
      directMoveResizeGuidesSnappingAndCancellation: true,
      arrangementClipboardGroupingAndKeyboardHistory: true,
      orderedMultiLogPdfPackage: true,
      canonicalProjectRoundTrip: true,
      sameResolvedSceneScreenAndPdf: true,
      normalizedTaggedVectorPdf: true,
      rasterShortcut: false,
      exactProcessAndProfileCleanup: true,
      productOwnerPersonalOperation: false,
      admittedMultipleFontFamilies: false,
      admittedRsLogPositiveSchema: false,
    }),
  });
  const canonical = `${canonicalizeJson(evidence)}\n`;
  if (record) {
    await mkdir(path.dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, canonical, "utf8");
  }
  return Object.freeze({
    ...evidence,
    evidenceSha256: sha256(Buffer.from(canonical, "utf8")),
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
  const result = await runIntegratedBetaQualification({
    record: process.argv.includes("--record"),
  });
  console.log(
    JSON.stringify({
      schema: result.schema,
      result: result.result,
      evidenceSha256: result.evidenceSha256,
      evidenceRecorded: result.evidenceRecorded,
      packagedExecutable: result.package.paths.packagedExecutable,
      sessions: result.sessions.map(({ role, run, inspection }) => ({
        role,
        durationMs: run.durationMs,
        process: run.process,
        inspectedPageCount: inspection.pageCount,
      })),
    }),
  );
}
