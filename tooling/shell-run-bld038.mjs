import { createHash } from "node:crypto";
import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalizeJson } from "../packages/contracts/dist/index.js";
import { openLogProjectFile } from "../packages/platform-electron-main/dist/index.js";
import { runPackaged } from "./shell-run-bld026.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(root, ".tmp", "bld-038-direct-manipulation");
const evidencePath = path.join(root, "artifacts", "bld-038-direct-manipulation-evidence.json");
const projectPath = path.join(outputRoot, "Packaged Direct Manipulation Proof.rsrender");
const projectLockPath = path.join(
  outputRoot,
  `.rsrender-${createHash("sha256").update(projectPath.toLowerCase(), "utf8").digest("hex").slice(0, 24)}.save.lock`,
);
const pdfPath = path.join(outputRoot, "Direct Manipulation Proof.pdf");
const targetNodeId = "node:lithology:stratum-01:transition:2:text";

function sameFrame(left, right) {
  return (
    typeof left === "object" &&
    left !== null &&
    typeof right === "object" &&
    right !== null &&
    left.xMpt === right.xMpt &&
    left.yMpt === right.yMpt &&
    left.widthMpt === right.widthMpt &&
    left.heightMpt === right.heightMpt
  );
}

export async function runDirectManipulationQualification({ record = false } = {}) {
  await mkdir(outputRoot, { recursive: true });
  await rm(projectPath, { force: true });
  await rm(projectLockPath, { force: true });
  await rm(pdfPath, { force: true });
  process.env.RSRENDER_BORING_LOG_PACKAGE_LABEL = `bld-038-direct-manipulation-${process.pid}`;
  const { packageBoringLogEditor } = await import(
    `${pathToFileURL(path.join(root, "tooling", "shell-package-bld026.mjs")).href}?bld038=${Date.now()}`
  );
  const packageResult = await packageBoringLogEditor();
  const run = await runPackaged(packageResult, 1, {
    profileLabel: `rsrender-bld038-direct-manipulation-${process.pid}`,
    probeArgument: "--rsrender-bld038-probe",
    profileArgumentPrefix: "--rsrender-bld027-profile=",
    timeoutMs: 600_000,
    extraArguments: [
      `--rsrender-bld027-output=${pdfPath}`,
      `--rsrender-bld035-output=${projectPath}`,
    ],
  });
  const direct = run.result.directManipulation;
  const beforeFrame = direct?.before?.frame;
  const movedFrame = direct?.moved?.frame;
  const resizedFrame = direct?.resized?.frame;
  if (
    run.result.schema !== "rsrender.bld038.direct-manipulation-probe.v1" ||
    run.result.result !== "PASS" ||
    run.process.exitCode !== 0 ||
    run.process.timedOut ||
    run.process.stderrBytes !== 0 ||
    run.process.after !== 0 ||
    !run.process.profileRemoved ||
    direct?.before?.handleCount !== 8 ||
    direct?.before?.roleButtonCount !== 10 ||
    direct?.before?.interactionMode !== "select" ||
    direct?.before?.positionMode !== "depth-bound" ||
    direct?.before?.locked !== "false" ||
    direct?.moved?.workingRevision !== direct.before.workingRevision + 1 ||
    movedFrame?.xMpt === beforeFrame?.xMpt ||
    movedFrame?.yMpt !== beforeFrame?.yMpt ||
    movedFrame?.widthMpt !== beforeFrame?.widthMpt ||
    movedFrame?.heightMpt !== beforeFrame?.heightMpt ||
    !sameFrame(direct?.undo?.frame, beforeFrame) ||
    direct?.undo?.workingRevision !== direct.moved.workingRevision + 1 ||
    !sameFrame(direct?.redo?.frame, movedFrame) ||
    direct?.redo?.workingRevision !== direct.moved.workingRevision + 2 ||
    direct?.resized?.workingRevision !== direct.redo.workingRevision + 1 ||
    resizedFrame?.xMpt !== movedFrame?.xMpt ||
    resizedFrame?.yMpt !== movedFrame?.yMpt ||
    resizedFrame?.widthMpt === movedFrame?.widthMpt ||
    resizedFrame?.heightMpt !== movedFrame?.heightMpt ||
    direct?.canceled?.workingRevision !== direct.resized.workingRevision ||
    !sameFrame(direct?.canceled?.frame, resizedFrame) ||
    run.result.publication?.result !== "EXPORT_VERIFIED_SUCCESS" ||
    run.result.publication?.destinationPath !== pdfPath ||
    run.result.persistence?.saved?.code !== "PROJECT_SAVE_VERIFIED"
  ) {
    throw new Error(`BLD038_PACKAGED_DIRECT_MANIPULATION_INVALID:${JSON.stringify(run)}`);
  }

  const reopened = await openLogProjectFile(projectPath);
  if (!reopened.accepted) {
    throw new Error(`BLD038_PACKAGED_REOPEN_INVALID:${JSON.stringify(reopened)}`);
  }
  const layoutJob = reopened.value.project.layoutJobs.find(
    ({ document }) => document.identity.boringLogId === "urn:rsrender:boring-log:test-01",
  );
  const binding = layoutJob?.template.bindings.find(
    ({ elementId, path: bindingPath }) =>
      elementId === targetNodeId && bindingPath === "presentation.text-occurrence-layout",
  );
  const persistedLayout = layoutJob?.template.occurrenceLayouts?.find(
    ({ id }) => id === binding?.styleId,
  );
  if (
    layoutJob === undefined ||
    binding === undefined ||
    persistedLayout === undefined ||
    !sameFrame(persistedLayout.frame, resizedFrame) ||
    persistedLayout.positionMode !== "depth-bound"
  ) {
    throw new Error(
      `BLD038_PACKAGED_PROJECT_GEOMETRY_INVALID:${JSON.stringify({ binding, persistedLayout, resizedFrame })}`,
    );
  }

  const evidence = Object.freeze({
    schema: "rsrender.bld038.direct-manipulation-evidence.v1",
    ticket: "BLD-038 / GitHub #82",
    result: "PASS",
    package: packageResult,
    run,
    project: Object.freeze({
      relativePath: path.relative(root, projectPath).replaceAll("\\", "/"),
      bytes: (await stat(projectPath)).size,
      authoritativeDigest: reopened.value.project.authoritativeDigest,
      binding,
      persistedLayout,
    }),
    pdf: Object.freeze({
      relativePath: path.relative(root, pdfPath).replaceAll("\\", "/"),
      bytes: (await stat(pdfPath)).size,
      pdfDigest: run.result.publication.pdfDigest,
      sceneDigest: run.result.publication.sceneDigest,
      projectionDigest: run.result.publication.projectionDigest,
    }),
    claims: Object.freeze({
      accessibleSvgMoveAndEightResizeHandles: true,
      integerMptPointerGeometry: true,
      cssZoomAndDpiIndependentCoordinateTransform: true,
      depthBoundMoveRetainsY: true,
      oneGestureOneHistoryCommand: true,
      undoRedoRestoresExactFrame: true,
      escapeCancelMutatesNothing: true,
      lockGateImplemented: true,
      projectSaveReopenRetainsGeometry: true,
      sameResolvedScenePublishedAfterDirectManipulation: true,
      rasterOverlayCount: 0,
      guidesAndSnappingImplemented: false,
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
      await runDirectManipulationQualification({ record: process.argv.includes("--record") }),
    ),
  );
}
