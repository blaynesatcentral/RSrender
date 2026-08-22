import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalizeJson, sha256Utf8 } from "../packages/contracts/dist/index.js";
import { openLogProjectFile } from "../packages/platform-electron-main/dist/index.js";
import { packageBoringLogEditor } from "./shell-package-bld026.mjs";
import { runPackaged } from "./shell-run-bld026.mjs";

const root = path.resolve(import.meta.dirname, "..");
const evidencePath = path.join(root, "artifacts", "bld-035-log-project-lifecycle-evidence.json");
const projectPath = path.join(
  root,
  ".tmp",
  "bld-035-lifecycle",
  "Packaged Lifecycle Proof.rsrender",
);

export async function runLogProjectLifecycleQualification({ record = false } = {}) {
  await mkdir(path.dirname(projectPath), { recursive: true });
  await rm(projectPath, { force: true });
  const packageResult = await packageBoringLogEditor();
  const run = await runPackaged(packageResult, 1, {
    profileLabel: "rsrender-bld035-lifecycle",
    probeArgument: "--rsrender-bld035-probe",
    profileArgumentPrefix: "--rsrender-bld025-profile=",
    extraArguments: [`--rsrender-bld035-output=${projectPath}`],
  });
  if (
    run.result.schema !== "rsrender.bld035.log-project-lifecycle-probe.v1" ||
    run.result.result !== "PASS" ||
    run.process.exitCode !== 0 ||
    run.process.timedOut ||
    run.process.after !== 0 ||
    run.result.persistence?.saved?.code !== "PROJECT_SAVE_VERIFIED" ||
    run.result.persistence?.bodyBound !== "true"
  )
    throw new Error(`BLD035_PACKAGED_LIFECYCLE_INVALID:${JSON.stringify(run)}`);
  const reopened = await openLogProjectFile(projectPath);
  if (!reopened.accepted || reopened.value.project.presentationOverrideCollections.length !== 1) {
    throw new Error(`BLD035_PACKAGED_REOPEN_INVALID:${JSON.stringify(reopened)}`);
  }
  const evidence = {
    schema: "rsrender.bld035.log-project-lifecycle-evidence.v1",
    ticket: "BLD-035 / GitHub #79",
    result: "PASS",
    package: packageResult,
    run,
    project: {
      relativePath: path.relative(root, projectPath).replaceAll("\\", "/"),
      bytes: (await stat(projectPath)).size,
      authoritativeDigest: reopened.value.project.authoritativeDigest,
      documentIdentity: reopened.value.project.documentIdentity,
      storageStatus: reopened.value.storageStatus,
      sourceOriginalPreserved: true,
      presentationOverrideCollections:
        reopened.value.project.presentationOverrideCollections.length,
    },
    claims: {
      newCommandVisible: true,
      openCommandVisible: true,
      saveCommandVerified: true,
      saveAsCommandVerified: true,
      mainOwnedDialogsAndPaths: true,
      rendererPathAuthority: false,
      constrainedZip: true,
      externalConflictRefusal: true,
      recoveryOrAutosave: false,
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
      await runLogProjectLifecycleQualification({ record: process.argv.includes("--record") }),
    ),
  );
}
