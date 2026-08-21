import {
  BORING_LOG_MVP_BUNDLE_DIGEST,
  BORING_LOG_MVP_FIXTURE_DIGEST,
  BORING_LOG_MVP_ORACLE_DIGEST,
  BORING_LOG_MVP_TEMPLATE_DIGEST,
  validateBoringLogMvpFixtureBundle,
} from "../../packages/test-support/dist/index.js";

if (process.version !== "v24.18.1") {
  throw new Error("BLD-022 admitted runtime mismatch");
}

const result = validateBoringLogMvpFixtureBundle();
if (
  !result.accepted ||
  result.fixtureDigest !== BORING_LOG_MVP_FIXTURE_DIGEST ||
  result.templateDigest !== BORING_LOG_MVP_TEMPLATE_DIGEST ||
  result.oracleDigest !== BORING_LOG_MVP_ORACLE_DIGEST ||
  result.bundleDigest !== BORING_LOG_MVP_BUNDLE_DIGEST
) {
  throw new Error("BLD-022 frozen fixture vector mismatch");
}

process.stdout.write(
  `${JSON.stringify({
    schemaVersion: "rsrender.bld-022-vector.v1",
    node: process.version,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    fixtureDigest: result.fixtureDigest,
    templateDigest: result.templateDigest,
    oracleDigest: result.oracleDigest,
    bundleDigest: result.bundleDigest,
  })}\n`,
);
