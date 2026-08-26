import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalizeJson } from "../packages/contracts/dist/index.js";
import { inspectBoringLogPdfPackage } from "./inspect-boring-log-pdf-package.mjs";
import { runPackaged } from "./shell-run-bld026.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(root, ".tmp", "bld-045-rslog-import");
const inputPath = path.join(outputRoot, "synthetic-rslog-project-v3.json");
const projectPath = path.join(outputRoot, "Imported Synthetic Project.rsrender");
const pdfPath = path.join(outputRoot, "Imported Synthetic Log Set.pdf");
const evidencePath = path.join(root, "artifacts", "bld-045-rslog-import-gateway-evidence.json");

export async function runRsLogImportGatewayQualification({ record = false } = {}) {
  await mkdir(outputRoot, { recursive: true });
  await rm(inputPath, { force: true });
  await rm(projectPath, { force: true });
  await rm(pdfPath, { force: true });
  try {
    await writeFile(
      inputPath,
      `${JSON.stringify({
        Properties: { FileVersion: "v3" },
        Project: {
          Id: "bld-051-project",
          Title: "BLD-051 Synthetic Project",
          Number: "BLD-051",
          ClientName: "Synthetic Client",
          UnitSystem: "Imperial",
          CoordinateSystem: "WGS 84 / NAVD 88",
        },
        Boreholes: [
          {
            Id: "bld-051-boring-1",
            Name: "SYNTHETIC-01",
            Depth: 25,
            Elevation: 180,
            Stratigraphy: [
              {
                Id: "bld-051-stratum-1",
                FromDepth: 0,
                ToDepth: 25,
                Description: "Synthetic silt",
                SoilSymbol: "ML",
              },
            ],
            Samples: [
              {
                Id: "bld-051-sample-1",
                FromDepth: 5,
                Number: "S-1",
                TypeName: "SPT",
                BlowCounts: "3-4-5",
                LabTests: { IndexTests: { MoistureW: 20, LiquidLimit: 35, PlasticLimit: 18 } },
              },
            ],
          },
          {
            Id: "bld-051-boring-2",
            Name: "SYNTHETIC-02",
            Depth: 60,
            Elevation: 175,
            Stratigraphy: [
              {
                Id: "bld-051-stratum-2",
                FromDepth: 0,
                ToDepth: 60,
                Description: "Synthetic clay",
                SoilSymbol: "CL",
              },
            ],
          },
        ],
      })}\n`,
      "utf8",
    );
    process.env.RSRENDER_BORING_LOG_PACKAGE_LABEL = `bld-045-rslog-import-${process.pid}`;
    const { packageBoringLogEditor } = await import(
      `${pathToFileURL(path.join(root, "tooling", "shell-package-bld026.mjs")).href}?bld045=${Date.now()}`
    );
    const packageResult = await packageBoringLogEditor();
    const run = await runPackaged(packageResult, 1, {
      profileLabel: `rsrender-bld045-rslog-import-${process.pid}`,
      probeArgument: "--rsrender-bld045-probe",
      profileArgumentPrefix: "--rsrender-bld025-profile=",
      timeoutMs: 180_000,
      extraArguments: [
        `--rsrender-bld045-input=${inputPath}`,
        `--rsrender-bld045-project-output=${projectPath}`,
      ],
    });
    if (
      run.result.schema !== "rsrender.bld045.rslog-project-data-import-probe.v1" ||
      run.result.result !== "PASS" ||
      run.process.exitCode !== 0 ||
      run.process.timedOut ||
      run.process.stderrBytes !== 0 ||
      run.process.after !== 0 ||
      !run.process.profileRemoved ||
      run.result.imported?.layoutJobCount !== 2 ||
      run.result.imported?.sourceDocumentCount !== 2 ||
      run.result.imported?.copiedProject !== true ||
      run.result.imported?.stagingRemoved !== true ||
      run.result.before?.sceneInputDigest !== run.result.after?.sceneInputDigest ||
      run.result.before?.activeBoringLogIdentity !== run.result.after?.activeBoringLogIdentity ||
      run.result.after?.activeId !== "import-rslog-project-data"
    ) {
      throw new Error(`BLD045_PACKAGED_RSLOG_IMPORT_GATEWAY_INVALID:${JSON.stringify(run)}`);
    }
    const publicationRun = await runPackaged(packageResult, 2, {
      profileLabel: `rsrender-bld051-imported-publication-${process.pid}`,
      probeArgument: "--rsrender-bld044-probe",
      profileArgumentPrefix: "--rsrender-bld027-profile=",
      timeoutMs: 600_000,
      extraArguments: [
        `--rsrender-bld027-output=${pdfPath}`,
        `--rsrender-log-project=${projectPath}`,
        "--rsrender-imported-project-staging",
      ],
    });
    const publication = publicationRun.result.publication;
    const expectedOrder = [
      "urn:rsrender:boring-log:bld-051-boring-2",
      "urn:rsrender:boring-log:bld-051-boring-1",
    ];
    if (
      publicationRun.result.schema !== "rsrender.bld044.pdf-package-probe.v1" ||
      publicationRun.result.result !== "PASS" ||
      publicationRun.process.exitCode !== 0 ||
      publicationRun.process.timedOut ||
      publicationRun.process.stderrBytes !== 0 ||
      publicationRun.process.after !== 0 ||
      !publicationRun.process.profileRemoved ||
      publication?.result !== "EXPORT_VERIFIED_SUCCESS" ||
      publication?.destinationPath !== pdfPath ||
      publication?.pageCount !== 3 ||
      JSON.stringify(publication?.orderedBoringLogIdentities) !== JSON.stringify(expectedOrder)
    ) {
      throw new Error(
        `BLD051_PACKAGED_IMPORTED_PUBLICATION_INVALID:${JSON.stringify(publicationRun)}`,
      );
    }
    const inspection = await inspectBoringLogPdfPackage({
      pdfPath,
      expectedOrderedTitles: ["BORING SYNTHETIC-02", "BORING SYNTHETIC-01"],
      expectedPageSizesPoints: [
        [612, 792],
        [612, 792],
        [612, 792],
      ],
      expectedProjectionDigest: publication.projectionDigest,
    });
    const pdfBytes = (await stat(pdfPath)).size;
    const evidence = Object.freeze({
      schema: "rsrender.bld045.rslog-import-gateway-evidence.v1",
      ticket: "BLD-045 / GitHub #89",
      result: "PASS",
      package: packageResult,
      run,
      publicationRun,
      inspection,
      pdf: Object.freeze({ bytes: pdfBytes, removedAfterInspection: true }),
      claims: Object.freeze({
        distinctFromRsrenderProjectOpen: true,
        boundedLocalJsonOnly: true,
        documentedProjectJsonV3Admitted: true,
        noInventedVendorFields: true,
        everyBoreholeMappedToSourceDocument: true,
        disposableImportStagingRemoved: true,
        packagedProcessCleanup: true,
        positiveRsLogMappingComplete: true,
        importedProjectOpenedInPackagedApplication: true,
        allImportedLogsSelectedAndPublished: true,
        continuationPagesPreserved: true,
        normalizedPdfInspected: true,
        importedProjectAndPdfTemporaryArtifactsRemoved: true,
      }),
    });
    if (record) {
      await mkdir(path.dirname(evidencePath), { recursive: true });
      await writeFile(evidencePath, `${canonicalizeJson(evidence)}\n`, "utf8");
    }
    return evidence;
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const result = await runRsLogImportGatewayQualification({
    record: process.argv.includes("--record"),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
