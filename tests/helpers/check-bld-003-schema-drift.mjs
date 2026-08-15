import { readFile } from "node:fs/promises";

import { assertContractSchemaParity } from "../../packages/contracts/dist/runtime-contract.js";

const manifestPath = process.argv[2];
if (!manifestPath) throw new Error("DRIFT_FIXTURE_REQUIRED");

const typeManifest = JSON.parse(await readFile(manifestPath, "utf8"));
try {
  assertContractSchemaParity(typeManifest);
  console.log("CONTRACT_SCHEMA_PARITY_PASS");
} catch (error) {
  if (error instanceof Error && error.message === "CONTRACT_SCHEMA_DRIFT") {
    console.log("CONTRACT_SCHEMA_DRIFT");
    process.exitCode = 1;
  } else {
    throw error;
  }
}
