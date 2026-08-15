import { signedEvidence } from "./bld-005-evidence-fixture.mjs";

const result = await signedEvidence("METHOD_NOT_RUN");
process.stdout.write(`${result.manifest.inventoryDigest}\n`);
