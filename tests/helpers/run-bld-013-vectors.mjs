import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";
import { writeAggregateEvidenceIndex } from "../../packages/test-support/dist/index.js";
import { bld013IndexDraft } from "./bld-013-index-fixture.mjs";
import { runBld013PropertyModel } from "./bld-013-property-model.mjs";

const nodeExecutableIdentity = "node@24.18.1";
const nodeExecutableSha256 =
  "sha256:ac51903c4c111815d52280b1fdcc8da067cbb37e2fe1a765097b85c3292c8582";
if (process.version !== "v24.18.1") throw new Error(`Unexpected Node runtime ${process.version}`);
const observedNodeExecutableSha256 = await new Promise((resolve, reject) => {
  const hash = createHash("sha256");
  const stream = createReadStream(process.execPath);
  stream.on("data", (chunk) => hash.update(chunk));
  stream.on("error", reject);
  stream.on("end", () => resolve(`sha256:${hash.digest("hex")}`));
});
if (observedNodeExecutableSha256 !== nodeExecutableSha256) {
  throw new Error("Pinned Node executable digest differs from admitted custody");
}

const { draft, source } = await bld013IndexDraft();
const index = await writeAggregateEvidenceIndex(draft, source);
if (!index.ok) throw new Error(JSON.stringify(index.diagnostics));
const propertyRuns = [];
for (let repetition = 1; repetition <= 2; repetition += 1) {
  const property = await runBld013PropertyModel();
  const run = {
    repetition,
    result: "PASS",
    indexDigest: index.index.inventoryDigest,
    propertyDigest: property.digest,
    property,
  };
  propertyRuns.push({ ...run, runDigest: sha256CanonicalJson(run) });
}
const transcript = {
  result: "PASS",
  locale: Intl.DateTimeFormat().resolvedOptions().locale,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  runtime: {
    nodeVersion: process.version,
    nodeExecutableIdentity,
    nodeExecutableSha256: observedNodeExecutableSha256,
    custodyReference: "artifacts/bld-007-dependency-custody.json#/exactToolchainCustody/1",
  },
  indexDigest: index.index.inventoryDigest,
  sourceDigests: index.index.entries.map(({ ticketId, sourceManifest }) => ({
    ticketId,
    digest: sourceManifest.digest,
  })),
  propertyRuns,
  aggregateAcceptanceClaim: false,
  sourceTestsExecuted: false,
};
process.stdout.write(
  `${JSON.stringify({ ...transcript, transcriptDigest: sha256CanonicalJson(transcript) })}\n`,
);
