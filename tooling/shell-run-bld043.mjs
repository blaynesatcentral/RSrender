import { createHash } from "node:crypto";
import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalizeJson } from "../packages/contracts/dist/index.js";
import { openLogProjectFile } from "../packages/platform-electron-main/dist/index.js";
import { runPackaged } from "./shell-run-bld026.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(root, ".tmp", "bld-043-lithology-appearance");
const evidencePath = path.join(root, "artifacts", "bld-043-lithology-appearance-evidence.json");
const projectPath = path.join(outputRoot, "Lithology Appearance Proof.rsrender");
const pdfPath = path.join(outputRoot, "Lithology Appearance Proof.pdf");

function fillColor(job, appearance) {
  return job?.template.visualTokens[appearance?.materialFillToken ?? ""] ?? null;
}

export async function runLithologyAppearanceQualification({ record = false } = {}) {
  await mkdir(outputRoot, { recursive: true });
  await rm(projectPath, { force: true });
  await rm(pdfPath, { force: true });
  process.env.RSRENDER_BORING_LOG_PACKAGE_LABEL = `bld-043-lithology-appearance-${process.pid}`;
  const { packageBoringLogEditor } = await import(
    `${pathToFileURL(path.join(root, "tooling", "shell-package-bld026.mjs")).href}?bld043=${Date.now()}`
  );
  const packageResult = await packageBoringLogEditor();
  const run = await runPackaged(packageResult, 1, {
    profileLabel: `rsrender-bld043-lithology-appearance-${process.pid}`,
    probeArgument: "--rsrender-bld043-probe",
    profileArgumentPrefix: "--rsrender-bld025-profile=",
    timeoutMs: 600_000,
    extraArguments: [
      `--rsrender-bld027-output=${pdfPath}`,
      `--rsrender-bld035-output=${projectPath}`,
    ],
  });
  const lithology = run.result.lithologyAppearance;
  const columnHeading = run.result.columnHeading;
  if (
    run.result.schema !== "rsrender.bld043.lithology-appearance-probe.v1" ||
    run.result.result !== "PASS" ||
    run.process.exitCode !== 0 ||
    run.process.timedOut ||
    run.process.stderrBytes !== 0 ||
    run.process.after !== 0 ||
    !run.process.profileRemoved ||
    lithology?.intervalApplied?.state?.effectiveMaterialFillColor !== "#7f1d1d" ||
    lithology?.intervalApplied?.state?.materialFillApplication !== "interval-override" ||
    lithology?.defaultApplied?.state?.effectiveMaterialFillColor !== "#a16207" ||
    lithology?.defaultApplied?.state?.materialFillApplication !== "classification-default" ||
    lithology?.defaultUndo?.state?.materialFillApplication !== "source" ||
    lithology?.defaultRedo?.state?.effectiveMaterialFillColor !== "#a16207" ||
    lithology?.overrideAfterDefault?.paintedFill !== "#7f1d1d" ||
    columnHeading?.before?.content !== "MATERIAL DESCRIPTION" ||
    columnHeading?.applied?.content !== "STRATUM DESCRIPTION" ||
    columnHeading?.undo?.content !== "MATERIAL DESCRIPTION" ||
    columnHeading?.redo?.content !== "STRATUM DESCRIPTION" ||
    run.result.publication?.result !== "EXPORT_VERIFIED_SUCCESS" ||
    run.result.persistence?.saved?.code !== "PROJECT_SAVE_VERIFIED"
  ) {
    throw new Error(`BLD043_PACKAGED_PROBE_INVALID:${JSON.stringify(run)}`);
  }
  const reopened = await openLogProjectFile(projectPath);
  if (!reopened.accepted) throw new Error(`BLD043_PROJECT_REOPEN_INVALID:${reopened.code}`);
  const first = reopened.value.project.layoutJobs.find(
    ({ document }) => document.identity.boringLogId === "urn:rsrender:boring-log:test-01",
  );
  const second = reopened.value.project.layoutJobs.find(
    ({ document }) => document.identity.boringLogId === "urn:rsrender:boring-log:test-02",
  );
  const firstDefault = first?.template.lithologyClassificationAppearanceDefaults?.find(
    ({ mappedClassificationKey }) => mappedClassificationKey === "ML",
  );
  const secondDefault = second?.template.lithologyClassificationAppearanceDefaults?.find(
    ({ mappedClassificationKey }) => mappedClassificationKey === "ML",
  );
  const secondOverride = second?.template.lithologyIntervalAppearanceOverrides?.find(
    ({ boringLogIdentity, intervalId }) =>
      boringLogIdentity === "urn:rsrender:boring-log:test-02" && intervalId === "b02-stratum-01",
  );
  if (
    fillColor(first, firstDefault) !== "#a16207" ||
    fillColor(second, secondDefault) !== "#a16207" ||
    fillColor(second, secondOverride) !== "#7f1d1d" ||
    second?.template.columns.find(({ id }) => id === "column-description")?.heading !==
      "STRATUM DESCRIPTION"
  ) {
    throw new Error("BLD043_REOPENED_APPEARANCE_INVALID");
  }
  const evidence = Object.freeze({
    schema: "rsrender.bld043.lithology-appearance-evidence.v1",
    ticket: "BLD-043 / GitHub #87",
    result: "PASS",
    package: packageResult,
    run,
    project: Object.freeze({
      relativePath: path.relative(root, projectPath).replaceAll("\\", "/"),
      bytes: (await stat(projectPath)).size,
      authoritativeDigest: reopened.value.project.authoritativeDigest,
      firstDefaultColor: fillColor(first, firstDefault),
      secondDefaultColor: fillColor(second, secondDefault),
      secondIntervalOverrideColor: fillColor(second, secondOverride),
      secondDescriptionColumnHeading: second?.template.columns.find(
        ({ id }) => id === "column-description",
      )?.heading,
    }),
    pdf: Object.freeze({
      relativePath: path.relative(root, pdfPath).replaceAll("\\", "/"),
      bytes: (await stat(pdfPath)).size,
      pdfDigest: run.result.publication.pdfDigest,
      sceneDigest: run.result.publication.sceneDigest,
      projectionDigest: run.result.publication.projectionDigest,
    }),
    claims: Object.freeze({
      exactStratumProperties: true,
      intervalAppearanceUndoable: true,
      classificationDefaultAtomicAcrossBorings: true,
      explicitIntervalOverrideWins: true,
      saveReopenRetainsAppearanceAuthority: true,
      sameScenePdfExportAfterAppearanceAuthoring: true,
      columnHeadingEditingUndoRedo: true,
      saveReopenRetainsColumnHeading: true,
      sameScenePdfExportAfterColumnHeadingAuthoring: true,
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
      await runLithologyAppearanceQualification({ record: process.argv.includes("--record") }),
    ),
  );
}
