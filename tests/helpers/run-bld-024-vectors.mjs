import { sha256CanonicalJson } from "../../packages/contracts/dist/index.js";
import {
  prepareBoringLogLayout,
  resolveBoringLogPageScene,
} from "../../packages/scene/dist/index.js";
import {
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  boringLogMvpFixture,
  boringLogMvpTemplate,
} from "../../packages/test-support/dist/index.js";
import { deterministicTextResults } from "./bld-024-deterministic-text-authority.mjs";

const preparation = prepareBoringLogLayout({
  contractVersion: 1,
  schemaVersion: "rsrender.boring-log-layout-job.v1",
  kind: "boring-log.layout-job",
  jobId: "job:mvp-boring-log-test-01@r1",
  inputRevision: 1,
  fixtureDigest: BORING_LOG_MVP_FIXTURE_DIGEST,
  templateDigest: BORING_LOG_MVP_TEMPLATE_DIGEST,
  document: boringLogMvpFixture,
  template: boringLogMvpTemplate,
});
if (!preparation.accepted) throw new Error(JSON.stringify(preparation));

const textResults = deterministicTextResults(preparation.value.textRequests);
const result = resolveBoringLogPageScene(preparation.value, textResults);
if (!result.accepted) throw new Error(JSON.stringify(result));

process.stdout.write(
  `${JSON.stringify({
    node: process.version,
    pagePlanDigest: sha256CanonicalJson(result.value.pagePlan),
    sceneDigest: sha256CanonicalJson(result.value),
    textRequestCount: result.value.textRequests.length,
    semanticCount: result.value.pages[0].semanticOrder.length,
    nodeCount: result.value.pages[0].nodes.length,
    diagnosticCount: result.value.diagnostics.length,
  })}\n`,
);
