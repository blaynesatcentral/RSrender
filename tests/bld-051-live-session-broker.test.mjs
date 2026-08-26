import assert from "node:assert/strict";
import test from "node:test";
import { URLSearchParams } from "node:url";
import { TextDecoder, TextEncoder } from "node:util";

import {
  maximumRsLogLiveResponseBytes,
  RSLOG_CLOUD_ORIGIN,
  RsLogLiveSessionBroker,
  rsLogLiveSessionBrokerRevision,
} from "../packages/platform-electron-main/dist/index.js";

const jsonResponse = (status, value) => ({
  status,
  mediaType: "application/json; charset=utf-8",
  body: new TextEncoder().encode(JSON.stringify(value)),
});

const tokenResponse = (accessToken = "access-secret", refreshToken = "refresh-secret") =>
  jsonResponse(200, {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: 3600,
  });

test("BLD-051 broker signs in without projecting or retaining secrets in public results", async () => {
  const requests = [];
  let now = Date.UTC(2026, 7, 25, 12, 0, 0);
  const broker = new RsLogLiveSessionBroker(
    async (request) => {
      requests.push(request);
      return tokenResponse("access-canary", "refresh-canary");
    },
    () => now,
  );

  assert.equal(rsLogLiveSessionBrokerRevision, "bld-051-live-session-broker-v1");
  const result = await broker.beginSignIn({
    company: "company-canary",
    username: "user-canary",
    password: "password-canary",
  });
  assert.deepEqual(result, {
    accepted: true,
    projection: { state: "signed-in", expiresAtUtc: "2026-08-25T13:00:00.000Z" },
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].url, `${RSLOG_CLOUD_ORIGIN}/api/connect/token`);
  assert.equal(requests[0].headers.authorization, undefined);
  const submitted = new URLSearchParams(new TextDecoder().decode(requests[0].body));
  assert.equal(submitted.get("company"), "company-canary");
  assert.equal(submitted.get("username"), "user-canary");
  assert.equal(submitted.get("password"), "password-canary");

  const publicText = JSON.stringify({ result, projection: broker.getProjection() });
  for (const secret of [
    "company-canary",
    "user-canary",
    "password-canary",
    "access-canary",
    "refresh-canary",
  ]) {
    assert.equal(publicText.includes(secret), false);
  }
  assert.deepEqual(broker.signOut(), { accepted: true, projection: { state: "signed-out" } });
  now += 1;
});

test("BLD-051 broker keeps password only through the documented one-shot MFA continuation", async () => {
  const requests = [];
  const broker = new RsLogLiveSessionBroker(async (request) => {
    requests.push(request);
    return request.url.endsWith("/token") ? jsonResponse(202, {}) : tokenResponse();
  });
  assert.deepEqual(
    await broker.beginSignIn({ company: "tenant", username: "operator", password: "pw" }),
    { accepted: true, projection: { state: "verification-required" } },
  );
  assert.deepEqual(await broker.submitVerificationCode({ twoFactorCode: "123456" }), {
    accepted: true,
    projection: {
      state: "signed-in",
      expiresAtUtc: broker.getProjection().expiresAtUtc,
    },
  });
  assert.equal(requests[1].url, `${RSLOG_CLOUD_ORIGIN}/api/connect/verify`);
  const submitted = new URLSearchParams(new TextDecoder().decode(requests[1].body));
  assert.deepEqual(Object.fromEntries(submitted), {
    company: "tenant",
    username: "operator",
    password: "pw",
    twoFactorCode: "123456",
  });
  assert.deepEqual(await broker.submitVerificationCode({ twoFactorCode: "654321" }), {
    accepted: false,
    code: "RSLOG_AUTH_FLOW_STATE_INVALID",
    projection: broker.getProjection(),
  });
});

test("BLD-051 read allowlist constructs only documented fixed-origin routes", async () => {
  const projectGuid = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
  const firstBoreholeGuid = "1a2b3c4d-0000-4000-8000-000000000001";
  const secondBoreholeGuid = "1a2b3c4d-0000-4000-8000-000000000002";
  const requests = [];
  const broker = new RsLogLiveSessionBroker(async (request) => {
    requests.push(request);
    return request.url.endsWith("/token") ? tokenResponse() : jsonResponse(200, { ok: true });
  });
  await broker.beginSignIn({ company: "tenant", username: "operator", password: "pw" });

  const cases = [
    [{ operationId: "rslog.projects.list" }, "/api/v1/projects", "GET"],
    [
      { operationId: "rslog.project.get", projectId: "project / one" },
      "/api/v1/project/project%20%2F%20one",
      "GET",
    ],
    [
      { operationId: "rslog.project.boreholes.list", projectId: "p-1" },
      "/api/v1/project/p-1/boreholes",
      "GET",
    ],
    [
      {
        operationId: "rslog.rsgeo.export",
        projectId: projectGuid,
        boreholeIds: [secondBoreholeGuid, firstBoreholeGuid],
        datasets: ["collar", "samples", "stratigraphy", "labResults"],
      },
      "/api/v3/export/rsgeo/data",
      "POST",
    ],
  ];
  for (const [spec, path, method] of cases) {
    const result = await broker.executeRead(spec);
    assert.equal(result.accepted, true);
    const request = requests.at(-1);
    assert.equal(request.url, `${RSLOG_CLOUD_ORIGIN}${path}`);
    assert.equal(request.method, method);
    assert.equal(request.headers.authorization, "Bearer access-secret");
  }
  const exportBody = JSON.parse(new TextDecoder().decode(requests.at(-1).body));
  assert.deepEqual(exportBody, {
    projectId: projectGuid,
    datasets: ["collar", "samples", "stratigraphy", "labResults"],
    options: {
      boreholeIds: [secondBoreholeGuid, firstBoreholeGuid],
      sampleTypeIds: [],
    },
  });

  const dotNetGuid = "cd4d34b8-0d0b-1ce6-4b2b-3a207932a127";
  const minimalExport = await broker.executeRead({
    operationId: "rslog.rsgeo.export",
    projectId: dotNetGuid,
    boreholeIds: null,
    datasets: null,
  });
  assert.equal(minimalExport.accepted, true);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(requests.at(-1).body)), {
    projectId: dotNetGuid,
  });

  for (const invalid of [
    { operationId: "rslog.projects.delete" },
    { operationId: "rslog.projects.list", url: "https://attacker.invalid" },
    { operationId: "rslog.project.get", projectId: "" },
    {
      operationId: "rslog.rsgeo.export",
      projectId: "p-1",
      boreholeIds: [],
      datasets: ["unknown"],
    },
  ]) {
    assert.deepEqual(await broker.executeRead(invalid), {
      accepted: false,
      code: "RSLOG_READ_INPUT_MALFORMED",
      operationId: invalid.operationId === "rslog.rsgeo.export" ? invalid.operationId : null,
    });
  }
});

test("BLD-051 broker refreshes and replays once, then clears repeated unauthorized state", async () => {
  const requests = [];
  let readCount = 0;
  const broker = new RsLogLiveSessionBroker(async (request) => {
    requests.push(request);
    if (request.url.endsWith("/token")) return tokenResponse("access-1", "refresh-1");
    if (request.url.endsWith("/refresh")) return tokenResponse("access-2", "refresh-2");
    readCount += 1;
    return readCount === 1
      ? jsonResponse(401, { error: "expired" })
      : jsonResponse(200, { projects: [] });
  });
  await broker.beginSignIn({ company: "tenant", username: "operator", password: "pw" });
  const result = await broker.executeRead({ operationId: "rslog.projects.list" });
  assert.equal(result.accepted, true);
  assert.deepEqual(
    requests.map((request) => new URL(request.url).pathname),
    ["/api/connect/token", "/api/v1/projects", "/api/connect/refresh", "/api/v1/projects"],
  );
  assert.equal(requests.at(-1).headers.authorization, "Bearer access-2");

  const terminal = new RsLogLiveSessionBroker(async (request) =>
    request.url.endsWith("/token") || request.url.endsWith("/refresh")
      ? tokenResponse()
      : jsonResponse(401, {}),
  );
  await terminal.beginSignIn({ company: "tenant", username: "operator", password: "pw" });
  assert.deepEqual(await terminal.executeRead({ operationId: "rslog.projects.list" }), {
    accepted: false,
    code: "RSLOG_READ_AUTHENTICATION_EXPIRED",
    operationId: "rslog.projects.list",
  });
  assert.deepEqual(terminal.getProjection(), { state: "signed-out" });
});

test("BLD-051 broker rejects malformed auth, provider failures, and oversized responses without source leakage", async () => {
  const malformed = new RsLogLiveSessionBroker(async () => tokenResponse());
  assert.equal(
    (await malformed.beginSignIn({ company: "tenant", username: "user", password: "" })).code,
    "RSLOG_AUTH_INPUT_MALFORMED",
  );
  assert.equal(
    (
      await malformed.beginSignIn({
        company: "tenant",
        username: "user",
        password: "x".repeat(4_097),
      })
    ).code,
    "RSLOG_AUTH_INPUT_TOO_LARGE",
  );

  const oversized = new RsLogLiveSessionBroker(async (request) =>
    request.url.endsWith("/token")
      ? tokenResponse()
      : {
          status: 200,
          mediaType: "application/json",
          body: new Uint8Array(maximumRsLogLiveResponseBytes + 1),
        },
  );
  await oversized.beginSignIn({ company: "tenant", username: "user", password: "pw" });
  assert.deepEqual(await oversized.executeRead({ operationId: "rslog.projects.list" }), {
    accepted: false,
    code: "RSLOG_READ_RESPONSE_TOO_LARGE",
    operationId: "rslog.projects.list",
  });

  const forbidden = new RsLogLiveSessionBroker(async (request) =>
    request.url.endsWith("/token")
      ? tokenResponse()
      : jsonResponse(403, { secret: "source-canary" }),
  );
  await forbidden.beginSignIn({ company: "tenant", username: "user", password: "pw" });
  const result = await forbidden.executeRead({ operationId: "rslog.projects.list" });
  assert.deepEqual(result, {
    accepted: false,
    code: "RSLOG_READ_PERMISSION_DENIED",
    operationId: "rslog.projects.list",
  });
  assert.equal(JSON.stringify(result).includes("source-canary"), false);
  assert.equal(forbidden.getProjection().state, "signed-in");
});
