import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalizeJson } from "../packages/contracts/dist/index.js";
import { runPackaged } from "./shell-run-bld026.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(root, ".tmp", "bld-045-rslog-import");
const inputPath = path.join(outputRoot, "synthetic-unadmitted-rslog-project-data.json");
const evidencePath = path.join(root, "artifacts", "bld-045-rslog-import-gateway-evidence.json");

export async function runRsLogImportGatewayQualification({ record = false } = {}) {
  await mkdir(outputRoot, { recursive: true });
  await rm(inputPath, { force: true });
  await writeFile(
    inputPath,
    `${JSON.stringify({ project: { title: "Synthetic" }, testHoles: [{ name: "SYNTHETIC-01" }, { name: "SYNTHETIC-02" }] })}\n`,
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
    extraArguments: [`--rsrender-bld045-input=${inputPath}`],
  });
  if (
    run.result.schema !== "rsrender.bld045.rslog-project-data-import-probe.v1" ||
    run.result.result !== "PASS" ||
    run.process.exitCode !== 0 ||
    run.process.timedOut ||
    run.process.stderrBytes !== 0 ||
    run.process.after !== 0 ||
    !run.process.profileRemoved ||
    run.result.before?.sceneInputDigest !== run.result.after?.sceneInputDigest ||
    run.result.before?.activeBoringLogIdentity !== run.result.after?.activeBoringLogIdentity ||
    run.result.after?.activeId !== "import-rslog-project-data"
  ) {
    throw new Error(`BLD045_PACKAGED_RSLOG_IMPORT_GATEWAY_INVALID:${JSON.stringify(run)}`);
  }
  const evidence = Object.freeze({
    schema: "rsrender.bld045.rslog-import-gateway-evidence.v1",
    ticket: "BLD-045 / GitHub #89",
    result: "PASS",
    package: packageResult,
    run,
    claims: Object.freeze({
      distinctFromRsrenderProjectOpen: true,
      boundedLocalJsonOnly: true,
      validJsonDoesNotImplyAdmittedSchema: true,
      noInventedVendorFields: true,
      currentProjectUnchangedOnBlockedSchema: true,
      explicitUserVisibleDiagnostic: true,
      packagedProcessCleanup: true,
      positiveRsLogMappingComplete: false,
    }),
  });
  if (record) {
    await mkdir(path.dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, `${canonicalizeJson(evidence)}\n`, "utf8");
  }
  return evidence;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const result = await runRsLogImportGatewayQualification({
    record: process.argv.includes("--record"),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
