import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { TextEncoder } from "node:util";

import {
  createRsLogAuthEntryHtml,
  generateRsLogAuthEntryPreloadSource,
  RSLOG_AUTH_ENTRY_URL,
  RsLogAuthEntryRouteBroker,
  RsLogLiveSessionBroker,
  rsLogAuthEntryRouteRevision,
} from "../packages/platform-electron-main/dist/index.js";

const tokenResponse = {
  status: 200,
  mediaType: "application/json",
  body: new TextEncoder().encode(
    JSON.stringify({
      access_token: "access-canary",
      refresh_token: "refresh-canary",
      token_type: "Bearer",
      expires_in: 3600,
    }),
  ),
};
const context = { senderId: 42, frameUrl: RSLOG_AUTH_ENTRY_URL, isMainFrame: true };
const capability = "a".repeat(64);

test("BLD-051 Auth Entry accepts one exact password submission and projects no secret", async () => {
  const requests = [];
  const sessionBroker = new RsLogLiveSessionBroker(async (request) => {
    requests.push(request);
    return tokenResponse;
  });
  const route = new RsLogAuthEntryRouteBroker({
    mode: "password",
    expectedSenderId: 42,
    capability,
    sessionBroker,
  });
  assert.equal(rsLogAuthEntryRouteRevision, "bld-051-auth-entry-route-v1");
  assert.deepEqual(route.bootstrap(context), { accepted: true, mode: "password", capability });
  assert.deepEqual(route.bootstrap(context), {
    accepted: false,
    code: "RSLOG_AUTH_ENTRY_UNAVAILABLE",
  });
  const result = await route.submit(context, {
    capability,
    payload: { company: "company-canary", username: "user-canary", password: "password-canary" },
  });
  assert.equal(result.accepted, true);
  assert.equal(result.projection.state, "signed-in");
  const publicText = JSON.stringify(result);
  for (const secret of [
    "company-canary",
    "user-canary",
    "password-canary",
    "access-canary",
    "refresh-canary",
  ]) {
    assert.equal(publicText.includes(secret), false);
  }
  assert.equal(requests.length, 1);
  assert.equal(
    (
      await route.submit(context, {
        capability,
        payload: { company: "again", username: "again", password: "again" },
      })
    ).code,
    "RSLOG_AUTH_ENTRY_UNAVAILABLE",
  );
});

test("BLD-051 Auth Entry rejects wrong sender/frame/capability and consumes malformed one-shot payload", async () => {
  let requests = 0;
  const sessionBroker = new RsLogLiveSessionBroker(async () => {
    requests += 1;
    return tokenResponse;
  });
  for (const invalidContext of [
    { ...context, senderId: 43 },
    { ...context, frameUrl: "rsrender-shell://document/index.html" },
    { ...context, isMainFrame: false },
  ]) {
    const route = new RsLogAuthEntryRouteBroker({
      mode: "password",
      expectedSenderId: 42,
      capability,
      sessionBroker,
    });
    assert.equal(route.bootstrap(invalidContext).accepted, false);
  }
  const route = new RsLogAuthEntryRouteBroker({
    mode: "password",
    expectedSenderId: 42,
    capability,
    sessionBroker,
  });
  assert.equal(route.bootstrap(context).accepted, true);
  assert.equal(
    (await route.submit(context, { capability: "b".repeat(64), payload: {} })).code,
    "RSLOG_AUTH_ENTRY_UNAVAILABLE",
  );
  assert.equal(
    (await route.submit(context, { capability, payload: { company: "x" } })).code,
    "RSLOG_AUTH_ENTRY_UNAVAILABLE",
  );
  assert.equal(requests, 0);
});

test("BLD-051 Auth Entry cancel clears pending MFA and preload is narrow/secret-clearing", async () => {
  const sessionBroker = new RsLogLiveSessionBroker(async () => ({
    status: 202,
    mediaType: "application/json",
    body: new Uint8Array(),
  }));
  const passwordRoute = new RsLogAuthEntryRouteBroker({
    mode: "password",
    expectedSenderId: 42,
    capability,
    sessionBroker,
  });
  passwordRoute.bootstrap(context);
  assert.equal(
    (
      await passwordRoute.submit(context, {
        capability,
        payload: { company: "tenant", username: "user", password: "pw" },
      })
    ).projection.state,
    "verification-required",
  );
  const verificationRoute = new RsLogAuthEntryRouteBroker({
    mode: "verification-code",
    expectedSenderId: 42,
    capability: "c".repeat(64),
    sessionBroker,
  });
  verificationRoute.bootstrap(context);
  assert.deepEqual(verificationRoute.cancel(context, { capability: "c".repeat(64), payload: {} }), {
    accepted: true,
    projection: { state: "signed-out" },
  });

  const html = createRsLogAuthEntryHtml();
  const preload = generateRsLogAuthEntryPreloadSource();
  assert.match(html, /Company code/u);
  assert.match(html, /autocomplete="current-password"/u);
  assert.match(html, /autocomplete="one-time-code"/u);
  assert.match(preload, /clearSecrets/u);
  assert.match(preload, /pagehide/u);
  assert.doesNotMatch(
    preload,
    /contextBridge|exposeInMainWorld|fetch\(|XMLHttpRequest|localStorage|sessionStorage/u,
  );
  assert.doesNotMatch(preload, /access[_-]?token|refresh[_-]?token|authorization/iu);
});

test("BLD-051 Studio wires Auth Entry as a short-lived modal and packages its dedicated preload", async () => {
  const [main, route, renderer, preloadRuntime, packager] = await Promise.all(
    [
      "packages/platform-electron-main/src/semantic-editor-main.ts",
      "packages/platform-electron-main/src/boring-log-studio-route-broker.ts",
      "packages/renderer-ui/src/boring-log-studio-entry.ts",
      "packages/platform-electron-main/src/boring-log-studio-preload-runtime.ts",
      "tooling/shell-package-bld026.mjs",
    ].map((file) => readFile(new URL(`../${file}`, import.meta.url), "utf8")),
  );
  for (const source of [main, route, renderer, preloadRuntime]) {
    assert.match(source, /connect-rslog/u);
  }
  assert.match(main, /modal: true/u);
  assert.match(main, /session\.fromPartition\(partition, \{ cache: false \}\)/u);
  assert.match(main, /RSLOG_AUTH_ENTRY_URL/u);
  assert.match(main, /clearStorageData/u);
  assert.match(main, /clearCache/u);
  assert.match(main, /setWindowOpenHandler/u);
  assert.match(main, /setPermissionRequestHandler/u);
  assert.match(main, /createRsLogNodeFetchTransport/u);
  assert.match(packager, /rslog-auth-entry\.cjs/u);
  assert.match(packager, /generateRsLogAuthEntryPreloadSource/u);
  assert.doesNotMatch(main, /process\.env\[[^\]]*(?:password|token|credential)/iu);
  assert.doesNotMatch(main, /process\.argv[\s\S]{0,200}(?:password|token|credential)/iu);
});

test("BLD-051 live project import atomically replaces the active runtime in the same window", async () => {
  const main = await readFile(
    new URL("../packages/platform-electron-main/src/semantic-editor-main.ts", import.meta.url),
    "utf8",
  );
  const liveImport = main.slice(
    main.indexOf('if (operation === "connect-rslog")'),
    main.indexOf('if (operation === "import-rslog-project-data")'),
  );
  assert.match(liveImport, /replaceActiveProjectRuntime/u);
  assert.match(liveImport, /RSLOG_LIVE_PROJECT_IMPORTED/u);
  assert.doesNotMatch(liveImport, /app\.relaunch|app\.exit/u);
  const jsonImport = main.slice(
    main.indexOf('if (operation === "import-rslog-project-data")'),
    main.indexOf(
      "\n      if (current.dirty)",
      main.indexOf('if (operation === "import-rslog-project-data")'),
    ),
  );
  assert.match(jsonImport, /replaceActiveProjectRuntime/u);
  assert.match(jsonImport, /RSLOG_PROJECT_DATA_IMPORTED/u);
  assert.doesNotMatch(jsonImport, /app\.relaunch|app\.exit/u);
  assert.match(main, /sessionHost\.replace/u);
  assert.match(main, /installStudioRouteBroker/u);
  assert.match(main, /installPublicationRouteBroker/u);
  assert.match(main, /window\.loadURL\(DOCUMENT_ROUTE_URL\)/u);
  assert.match(main, /rslog-\(\?:import\|live\)/u);
});
