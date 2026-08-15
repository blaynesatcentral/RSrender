import { canonicalizeJson, sha256Utf8 } from "../../packages/contracts/dist/index.js";

import {
  historyCore,
  historySnapshotSummary,
  makeHistoryMutation,
  makeHistoryRedo,
  makeHistoryUndo,
} from "./bld-011-fixtures.mjs";
import { runHistoryPropertyModel } from "./bld-011-property-model.mjs";

const core = historyCore();
const results = [];
results.push(await core.execute(makeHistoryMutation()));
results.push(await core.execute(makeHistoryUndo()));
results.push(await core.execute(makeHistoryRedo()));
results.push(
  await core.execute(
    makeHistoryMutation({
      requestId: "urn:test:bld-011:request:mutation:2",
      expectedWorkingRevision: 3,
      newContentDigest: sha256Utf8("bld-011-mutation-2"),
    }),
  ),
);

const fixedTranscript = canonicalizeJson({ results, snapshot: historySnapshotSummary(core) });
const propertyRuns = [];
for (let repetition = 1; repetition <= 2; repetition += 1) {
  propertyRuns.push({ repetition, ...(await runHistoryPropertyModel()) });
}
const output = {
  result: "PASS",
  executionProfile: {
    locale: new Intl.DateTimeFormat("en-US").resolvedOptions().locale,
    timeZone: new Intl.DateTimeFormat("en-US", { timeZone: "UTC" }).resolvedOptions().timeZone,
  },
  fixedTranscriptDigest: sha256Utf8(fixedTranscript),
  propertyRuns,
};
process.stdout.write(
  `${JSON.stringify({ ...output, digest: sha256Utf8(canonicalizeJson(output)) })}\n`,
);
