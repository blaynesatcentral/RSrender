import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalizeJson } from "../packages/contracts/dist/index.js";
import {
  BORING_LOG_MVP_ORACLE_DIGEST,
  boringLogMvpOracle,
} from "../packages/test-support/dist/index.js";
import {
  BORING_LOG_REFERENCE_REGISTRATION,
  inspectPackagedBoringLogReferenceWitness,
} from "./inspect-boring-log-reference-fidelity.mjs";
import { packageReferenceQualifiedBoringLogMvp } from "./shell-package-bld030.mjs";
import { runPackaged } from "./shell-run-bld028.mjs";

const root = path.resolve(import.meta.dirname, "..");
const artifactPath = path.join(root, "artifacts", "bld-030-reference-fidelity-evidence.json");
const pdfDirectory = path.join(root, "tmp", "pdfs");
const finalPdfPath = path.join(root, "output", "pdf", "rsrender-boring-log-mvp.pdf");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireReferenceCoordinates(observedMpt, expectedPt, label) {
  if (!Array.isArray(observedMpt)) throw new Error(`BLD030_PDF_${label}_UNAVAILABLE`);
  const toleranceMpt = Math.round(BORING_LOG_REFERENCE_REGISTRATION.tolerancePt * 1_000);
  for (const coordinatePt of expectedPt) {
    const expectedMpt = Math.round(coordinatePt * 1_000);
    if (!observedMpt.some((actualMpt) => Math.abs(actualMpt - expectedMpt) <= toleranceMpt)) {
      throw new Error(`BLD030_PDF_${label}_OUTSIDE_TOLERANCE:${coordinatePt}`);
    }
  }
}

async function sourceDigests() {
  const files = [
    "tooling/inspect-boring-log-reference-fidelity.mjs",
    "tooling/shell-package-bld030.mjs",
    "tooling/shell-run-bld030.mjs",
    "packages/platform-electron-main/src/semantic-editor-main.ts",
    "packages/renderer-ui/src/boring-log-svg-projection.ts",
    "packages/layout-host/src/boring-log-publication-projection.ts",
    "packages/scene/src/boring-log-layout-engine.ts",
    "packages/test-support/src/boring-log-mvp-fixture.ts",
  ];
  return Object.freeze(
    Object.fromEntries(
      await Promise.all(
        files.map(async (file) => [
          file,
          `sha256:${sha256(await readFile(path.join(root, file)))}`,
        ]),
      ),
    ),
  );
}

export async function runReferenceFidelityQualification({ record = false } = {}) {
  await mkdir(pdfDirectory, { recursive: true });
  await mkdir(path.dirname(finalPdfPath), { recursive: true });
  const packageResult = await packageReferenceQualifiedBoringLogMvp();
  const outputPaths = [
    path.join(pdfDirectory, "rsrender-boring-log-bld030-run-1.pdf"),
    path.join(pdfDirectory, "rsrender-boring-log-bld030-run-2.pdf"),
    finalPdfPath,
  ];
  const runs = [];
  for (let index = 1; index <= outputPaths.length; index += 1) {
    const packaged = await runPackaged(packageResult, `bld030-${index}`, outputPaths[index - 1]);
    const fidelity = inspectPackagedBoringLogReferenceWitness({
      witness: packaged.result.initial.reference,
      oracle: boringLogMvpOracle,
      sceneInputDigest: packaged.result.initial.pageDigest,
    });
    if (fidelity.result !== "PASS") {
      throw new Error(`BLD030_REFERENCE_FIDELITY_FAILED:${index}:${JSON.stringify(fidelity)}`);
    }
    requireReferenceCoordinates(
      packaged.inspection.vectorGeometry.verticalCoordinatesMpt,
      [
        ...BORING_LOG_REFERENCE_REGISTRATION.outerHorizontalRuleXPt,
        ...BORING_LOG_REFERENCE_REGISTRATION.internalVerticalRuleXPt,
        ...BORING_LOG_REFERENCE_REGISTRATION.plotGridXPt,
      ],
      "VERTICAL_X",
    );
    requireReferenceCoordinates(
      packaged.inspection.vectorGeometry.horizontalCoordinatesMpt,
      BORING_LOG_REFERENCE_REGISTRATION.majorHorizontalRuleYPt,
      "HORIZONTAL_Y",
    );
    runs.push(Object.freeze({ ...packaged, fidelity }));
  }
  const stable = {
    sceneDigest: new Set(runs.map(({ result }) => result.publication.sceneDigest)).size === 1,
    projectionDigest:
      new Set(runs.map(({ result }) => result.publication.projectionDigest)).size === 1,
    screenReferenceWitness:
      new Set(runs.map(({ fidelity }) => JSON.stringify(fidelity.summary))).size === 1,
    pdfStructure: runs.every(
      ({ inspection }) =>
        inspection.result === "PASS" &&
        inspection.images === 0 &&
        inspection.tagged === true &&
        inspection.pageCount === 1 &&
        inspection.text.coverage === 1,
    ),
    processCleanup: runs.every(({ process }) => process.after === 0 && process.profileRemoved),
  };
  if (Object.values(stable).some((accepted) => accepted !== true)) {
    throw new Error(`BLD030_CROSS_RUN_QUALIFICATION_FAILED:${JSON.stringify(stable)}`);
  }
  const evidence = Object.freeze({
    schema: "rsrender.bld030.reference-fidelity-evidence.v1",
    ticket: "BLD-030 / GitHub #74",
    result: "PASS",
    oracle: Object.freeze({
      digest: BORING_LOG_MVP_ORACLE_DIGEST,
      revision: boringLogMvpOracle.oracleRevision,
      referenceRegistration: BORING_LOG_REFERENCE_REGISTRATION,
      suppliedGoByUsedAsRuntimeInput: false,
      screenshotAloneSufficient: false,
    }),
    package: packageResult,
    productOwnerLaunchTarget: packageResult.productOwnerLaunchTarget,
    finalPdfPath,
    runs,
    stable,
    claims: Object.freeze({
      normalizedReferenceFidelityQualified: true,
      structuredSceneAuthority: true,
      semanticSvgProjection: true,
      sameScenePdfProjection: true,
      normalizedPdfInspection: true,
      rasterShortcut: false,
      productOwnerPersonallyOperated: false,
      broaderProgramComplete: false,
    }),
    sourceDigests: await sourceDigests(),
  });
  const canonical = `${canonicalizeJson(evidence)}\n`;
  if (record) await writeFile(artifactPath, canonical, "utf8");
  return Object.freeze({
    ...evidence,
    evidenceSha256: `sha256:${sha256(Buffer.from(canonical, "utf8"))}`,
  });
}

const invokedDirectly = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;
if (invokedDirectly) {
  console.log(
    JSON.stringify(
      await runReferenceFidelityQualification({ record: process.argv.includes("--record") }),
    ),
  );
}
