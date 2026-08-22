import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalizeJson, sha256Utf8 } from "../packages/contracts/dist/index.js";
import { openLogProjectFile } from "../packages/platform-electron-main/dist/index.js";
import { runPackaged } from "./shell-run-bld026.mjs";

const root = path.resolve(import.meta.dirname, "..");
const evidencePath = path.join(root, "artifacts", "bld-037-text-occurrence-style-evidence.json");
const projectPath = path.join(
  root,
  ".tmp",
  "bld-037-text-occurrence-style",
  "Packaged Text Occurrence Proof.rsrender",
);
const projectLockPath = path.join(
  path.dirname(projectPath),
  `.rsrender-${createHash("sha256").update(projectPath.toLowerCase(), "utf8").digest("hex").slice(0, 24)}.save.lock`,
);
const pdfPath = path.join(
  root,
  ".tmp",
  "bld-037-text-occurrence-style",
  "Text Occurrence Proof.pdf",
);
const targetNodeId = "node:lithology:stratum-01:transition:2:text";

export async function runTextOccurrenceStyleQualification({ record = false } = {}) {
  await mkdir(path.dirname(projectPath), { recursive: true });
  await rm(projectPath, { force: true });
  await rm(projectLockPath, { force: true });
  await rm(pdfPath, { force: true });
  process.env.RSRENDER_BORING_LOG_PACKAGE_LABEL = `bld-037-boring-log-editor-${process.pid}`;
  const { packageBoringLogEditor } = await import(
    `${pathToFileURL(path.join(root, "tooling", "shell-package-bld026.mjs")).href}?bld037=${Date.now()}`
  );
  const packageResult = await packageBoringLogEditor();
  const run = await runPackaged(packageResult, 1, {
    profileLabel: "rsrender-bld037-text-occurrence",
    probeArgument: "--rsrender-bld037-probe",
    profileArgumentPrefix: "--rsrender-bld027-profile=",
    timeoutMs: 240_000,
    extraArguments: [
      `--rsrender-bld027-output=${pdfPath}`,
      `--rsrender-bld035-output=${projectPath}`,
    ],
  });
  const style = run.result.textOccurrenceStyle;
  if (
    run.result.schema !== "rsrender.bld037.text-occurrence-style-probe.v1" ||
    run.result.result !== "PASS" ||
    run.process.exitCode !== 0 ||
    run.process.timedOut ||
    run.process.stderrBytes !== 0 ||
    run.process.after !== 0 ||
    !run.process.profileRemoved ||
    style?.before?.fontSize !== "5500" ||
    style?.before?.fontWeight !== "400" ||
    style?.before?.scope !== "occurrence" ||
    style?.applied?.workingRevision !== style.before.workingRevision + 1 ||
    style?.applied?.fontSize !== "9000" ||
    style?.applied?.fontWeight !== "700" ||
    style?.applied?.fill !== "#b42318" ||
    style?.applied?.frameX !== "125000" ||
    style?.applied?.frameWidth !== "150000" ||
    style?.applied?.horizontalAlignment !== "center" ||
    style?.applied?.verticalAlignment !== "middle" ||
    style?.applied?.wrapPolicy !== "no-wrap" ||
    style?.applied?.locked !== "true" ||
    style?.applied?.transform !== "rotate(5 200000 304338)" ||
    style?.applied?.sceneInputDigest === style.before.sceneInputDigest ||
    style?.undo?.fontSize !== "5500" ||
    style?.undo?.fontWeight !== "400" ||
    style?.undo?.frameX !== null ||
    style?.redo?.fontSize !== "9000" ||
    style?.redo?.fontWeight !== "700" ||
    style?.redo?.fill !== "#b42318" ||
    style?.redo?.frameX !== "125000" ||
    style?.redo?.horizontalAlignment !== "center" ||
    style?.redo?.locked !== "true" ||
    style?.redo?.sceneInputDigest === style.before.sceneInputDigest ||
    run.result.publication?.result !== "EXPORT_VERIFIED_SUCCESS" ||
    run.result.publication?.destinationPath !== pdfPath ||
    run.result.publication?.activeBoringLogIdentity !== "urn:rsrender:boring-log:test-01" ||
    run.result.persistence?.saved?.code !== "PROJECT_SAVE_VERIFIED" ||
    run.result.persistence?.bodyBound !== "true"
  ) {
    throw new Error(`BLD037_PACKAGED_TEXT_STYLE_INVALID:${JSON.stringify(run)}`);
  }

  const reopened = await openLogProjectFile(projectPath);
  if (!reopened.accepted) {
    throw new Error(`BLD037_PACKAGED_REOPEN_INVALID:${JSON.stringify(reopened)}`);
  }
  const layoutJob = reopened.value.project.layoutJobs.find(
    ({ document }) => document.identity.boringLogId === "urn:rsrender:boring-log:test-01",
  );
  const binding = layoutJob?.template.bindings.find(
    ({ elementId, path: bindingPath }) =>
      elementId === targetNodeId && bindingPath === "presentation.text-occurrence-style",
  );
  const persistedStyle = layoutJob?.template.styles.find(({ id }) => id === binding?.styleId);
  const layoutBinding = layoutJob?.template.bindings.find(
    ({ elementId, path: bindingPath }) =>
      elementId === targetNodeId && bindingPath === "presentation.text-occurrence-layout",
  );
  const persistedLayout = layoutJob?.template.occurrenceLayouts?.find(
    ({ id }) => id === layoutBinding?.styleId,
  );
  if (
    !layoutJob ||
    !binding ||
    persistedStyle?.fontSizeMpt !== 9_000 ||
    persistedStyle?.fontWeight !== 700 ||
    persistedStyle?.lineHeightMpt !== 11_000 ||
    persistedStyle?.color !== "#b42318" ||
    !layoutBinding ||
    persistedLayout?.frame.xMpt !== 125_000 ||
    persistedLayout?.frame.yMpt !== 293_338 ||
    persistedLayout?.frame.widthMpt !== 150_000 ||
    persistedLayout?.frame.heightMpt !== 22_000 ||
    persistedLayout?.paddingMpt.leftMpt !== 2_000 ||
    persistedLayout?.horizontalAlignment !== "center" ||
    persistedLayout?.verticalAlignment !== "middle" ||
    persistedLayout?.wrapPolicy !== "no-wrap" ||
    persistedLayout?.rotationMilliDegrees !== 5_000 ||
    persistedLayout?.positionMode !== "depth-bound" ||
    persistedLayout?.locked !== true
  ) {
    throw new Error(
      `BLD037_PACKAGED_PROJECT_STYLE_INVALID:${JSON.stringify({ binding, persistedStyle, layoutBinding, persistedLayout })}`,
    );
  }

  const evidence = {
    schema: "rsrender.bld037.text-occurrence-style-evidence.v1",
    ticket: "BLD-037 / GitHub #81",
    result: "PASS",
    package: packageResult,
    run,
    project: {
      relativePath: path.relative(root, projectPath).replaceAll("\\", "/"),
      bytes: (await stat(projectPath)).size,
      authoritativeDigest: reopened.value.project.authoritativeDigest,
      targetNodeId,
      styleId: binding.styleId,
      persistedStyle,
      layoutId: layoutBinding.styleId,
      persistedLayout,
    },
    pdf: {
      relativePath: path.relative(root, pdfPath).replaceAll("\\", "/"),
      bytes: (await stat(pdfPath)).size,
      pdfDigest: run.result.publication.pdfDigest,
      sceneDigest: run.result.publication.sceneDigest,
      projectionDigest: run.result.publication.projectionDigest,
    },
    claims: {
      exactOccurrenceContextSelection: true,
      rendererNeutralTypographyBeforeMeasurement: true,
      sharedHistoryUndoRedo: true,
      exactFrameAlignmentWrapRotationLock: true,
      projectSaveReopenRetainsStyle: true,
      screenAndPdfUseSameResolvedScene: true,
      fontAdmissionExpanded: false,
      directManipulationImplemented: false,
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
      await runTextOccurrenceStyleQualification({ record: process.argv.includes("--record") }),
    ),
  );
}
