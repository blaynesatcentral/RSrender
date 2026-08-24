import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalizeJson } from "../packages/contracts/dist/index.js";
import { inspectBoringLogPdfPackage } from "./inspect-boring-log-pdf-package.mjs";
import { runPackaged } from "./shell-run-bld026.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(root, ".tmp", "bld-044-pdf-package");
const evidencePath = path.join(root, "artifacts", "bld-044-pdf-package-evidence.json");
const pdfPath = path.join(outputRoot, "Selected Log Set Proof.pdf");

export async function runBoringLogPdfPackageQualification({ record = false } = {}) {
  await mkdir(outputRoot, { recursive: true });
  await rm(pdfPath, { force: true });
  process.env.RSRENDER_BORING_LOG_PACKAGE_LABEL = `bld-044-pdf-package-${process.pid}`;
  const { packageBoringLogEditor } = await import(
    `${pathToFileURL(path.join(root, "tooling", "shell-package-bld026.mjs")).href}?bld044=${Date.now()}`
  );
  const packageResult = await packageBoringLogEditor();
  const run = await runPackaged(packageResult, 1, {
    profileLabel: `rsrender-bld044-pdf-package-${process.pid}`,
    probeArgument: "--rsrender-bld044-probe",
    profileArgumentPrefix: "--rsrender-bld027-profile=",
    timeoutMs: 600_000,
    extraArguments: [`--rsrender-bld027-output=${pdfPath}`],
  });
  const publication = run.result.publication;
  const expectedOrder = ["urn:rsrender:boring-log:test-02", "urn:rsrender:boring-log:test-01"];
  if (
    run.result.schema !== "rsrender.bld044.pdf-package-probe.v1" ||
    run.result.result !== "PASS" ||
    run.process.exitCode !== 0 ||
    run.process.timedOut ||
    run.process.stderrBytes !== 0 ||
    run.process.after !== 0 ||
    !run.process.profileRemoved ||
    publication?.result !== "EXPORT_VERIFIED_SUCCESS" ||
    publication?.destinationPath !== pdfPath ||
    publication?.pageCount !== 2 ||
    JSON.stringify(publication?.orderedBoringLogIdentities) !== JSON.stringify(expectedOrder)
  ) {
    throw new Error(`BLD044_PACKAGED_PDF_PACKAGE_INVALID:${JSON.stringify(run)}`);
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
  const evidence = Object.freeze({
    schema: "rsrender.bld044.pdf-package-evidence.v1",
    ticket: "BLD-044 / GitHub #88",
    result: "PASS",
    package: packageResult,
    run,
    publication: Object.freeze({
      orderedBoringLogIdentities: publication.orderedBoringLogIdentities,
      pageCount: publication.pageCount,
      selectionDigest: publication.selectionDigest,
      packageCandidateDigest: publication.packageCandidateDigest,
      aggregateSceneDigest: publication.sceneDigest,
      aggregateProjectionDigest: publication.projectionDigest,
      pdfDigest: publication.pdfDigest,
      pdfBytes: publication.pdfBytes,
    }),
    inspection,
    pdf: Object.freeze({
      relativePath: path.relative(root, pdfPath).replaceAll("\\", "/"),
      bytes: (await stat(pdfPath)).size,
    }),
    claims: Object.freeze({
      allLoadedLogsSelectedByDefault: true,
      emptySelectionBlocked: true,
      selectionRestoredBySelectAll: true,
      publicationOrderIndependentOfActiveCanvas: true,
      sameRevisionSceneSet: true,
      onePdfPackageNotConcatenatedPdfs: true,
      normalizedPageOwnershipOrderAndSize: true,
      embeddedUnicodeFonts: true,
      noRasterImages: true,
      packagedProcessCleanup: true,
    }),
  });
  if (record) {
    await mkdir(path.dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, `${canonicalizeJson(evidence)}\n`, "utf8");
  }
  return evidence;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const result = await runBoringLogPdfPackageQualification({
    record: process.argv.includes("--record"),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  await access(pdfPath);
}
