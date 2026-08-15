import { createHash } from "node:crypto";

import { validateExampleBoundaryMessage } from "../../packages/contracts/dist/runtime-contract.js";

const vectors = [
  {
    contractVersion: 1,
    messageType: "command",
    kind: "example.noop",
    requestId: "fresh-command",
    scope: "application",
    payload: null,
  },
  {
    contractVersion: 1,
    messageType: "query",
    kind: "example.contract-version",
    requestId: "fresh-query",
    scope: "application",
  },
  {
    contractVersion: 1,
    messageType: "command-result",
    kind: "example.noop.completed",
    requestId: "fresh-command",
    changed: false,
  },
  {
    contractVersion: 1,
    messageType: "query-result",
    kind: "example.contract-version.result",
    requestId: "fresh-query",
    value: 1,
  },
  {
    contractVersion: 1,
    messageType: "event",
    kind: "example.observed",
    eventSequence: 42,
    changed: false,
  },
  {
    contractVersion: 2,
    messageType: "command",
    kind: "example.noop",
    requestId: "rejected",
    scope: "application",
    payload: null,
  },
];

const results = vectors.map((vector) => validateExampleBoundaryMessage(vector));
const canonical = JSON.stringify(results);
console.log(
  JSON.stringify({
    digest: createHash("sha256").update(canonical, "utf8").digest("hex"),
    locale: new Intl.Locale("en-US").toString(),
    timeZone: new Intl.DateTimeFormat("en-US", { timeZone: "UTC" }).resolvedOptions().timeZone,
  }),
);
