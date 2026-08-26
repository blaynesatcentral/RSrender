import assert from "node:assert/strict";
import test from "node:test";
import { TextDecoder } from "node:util";

import {
  createRsLogNodeFetchTransport,
  maximumRsLogLiveResponseBytes,
  RSLOG_CLOUD_ORIGIN,
  RsLogHttpTransportFailure,
  RsLogLiveSessionBroker,
  rsLogNodeFetchTransportRevision,
} from "../packages/platform-electron-main/dist/index.js";

const tokenResponse = () =>
  new globalThis.Response(
    JSON.stringify({
      access_token: "access-token",
      refresh_token: "refresh-token",
      token_type: "Bearer",
      expires_in: 3600,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

test("BLD-051 concrete transport performs fixed-origin broker requests without redirects or ambient credentials", async () => {
  const calls = [];
  const transport = createRsLogNodeFetchTransport({
    fetchImplementation: async (input, init) => {
      calls.push({ input, init });
      return input.endsWith("/token")
        ? tokenResponse()
        : new globalThis.Response('{"projects":[]}', {
            status: 200,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
    },
  });
  const broker = new RsLogLiveSessionBroker(transport);
  assert.equal(rsLogNodeFetchTransportRevision, "bld-051-node-fetch-transport-v1");
  assert.equal(
    (await broker.beginSignIn({ company: "tenant", username: "operator", password: "secret" }))
      .accepted,
    true,
  );
  const result = await broker.executeRead({ operationId: "rslog.projects.list" });
  assert.equal(result.accepted, true);
  assert.equal(new TextDecoder().decode(result.body), '{"projects":[]}');
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.input.startsWith(RSLOG_CLOUD_ORIGIN), true);
    assert.equal(call.init.redirect, "error");
    assert.equal(call.init.credentials, "omit");
    assert.equal(call.init.cache, "no-store");
    assert.equal(call.init.referrerPolicy, "no-referrer");
    assert.equal(call.init.signal instanceof globalThis.AbortSignal, true);
  }
});

test("BLD-051 concrete transport rejects arbitrary origins, routes, methods, headers, query strings, and bodies before fetch", async () => {
  let calls = 0;
  const transport = createRsLogNodeFetchTransport({
    fetchImplementation: async () => {
      calls += 1;
      return new globalThis.Response("{}");
    },
  });
  const validHeaders = { accept: "application/json", authorization: "Bearer token" };
  const forged = [
    {
      method: "GET",
      url: "https://attacker.invalid/api/v1/projects",
      headers: validHeaders,
      body: null,
    },
    {
      method: "DELETE",
      url: `${RSLOG_CLOUD_ORIGIN}/api/v1/projects`,
      headers: validHeaders,
      body: null,
    },
    {
      method: "GET",
      url: `${RSLOG_CLOUD_ORIGIN}/api/v1/projects?all=true`,
      headers: validHeaders,
      body: null,
    },
    { method: "GET", url: `${RSLOG_CLOUD_ORIGIN}/api/v1/users`, headers: validHeaders, body: null },
    {
      method: "GET",
      url: `${RSLOG_CLOUD_ORIGIN}/api/v1/projects`,
      headers: { ...validHeaders, "x-extra": "no" },
      body: null,
    },
    {
      method: "GET",
      url: `${RSLOG_CLOUD_ORIGIN}/api/v1/projects`,
      headers: validHeaders,
      body: new Uint8Array([1]),
    },
  ];
  for (const request of forged) {
    await assert.rejects(
      transport(request),
      (error) =>
        error instanceof RsLogHttpTransportFailure &&
        error.code === "RSLOG_HTTP_TRANSPORT_REQUEST_INVALID",
    );
  }
  assert.equal(calls, 0);
});

test("BLD-051 concrete transport enforces declared response ceiling and timeout", async () => {
  const oversized = createRsLogNodeFetchTransport({
    fetchImplementation: async () =>
      new globalThis.Response("", {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-length": String(maximumRsLogLiveResponseBytes + 1),
        },
      }),
  });
  await assert.rejects(
    oversized({
      method: "GET",
      url: `${RSLOG_CLOUD_ORIGIN}/api/v1/projects`,
      headers: { accept: "application/json", authorization: "Bearer token" },
      body: null,
    }),
    (error) =>
      error instanceof RsLogHttpTransportFailure &&
      error.code === "RSLOG_HTTP_TRANSPORT_RESPONSE_TOO_LARGE",
  );

  const timedOut = createRsLogNodeFetchTransport({
    timeoutMs: 1,
    fetchImplementation: async (_input, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }),
  });
  await assert.rejects(
    timedOut({
      method: "GET",
      url: `${RSLOG_CLOUD_ORIGIN}/api/v1/projects`,
      headers: { accept: "application/json", authorization: "Bearer token" },
      body: null,
    }),
    (error) =>
      error instanceof RsLogHttpTransportFailure && error.code === "RSLOG_HTTP_TRANSPORT_TIMEOUT",
  );
});
