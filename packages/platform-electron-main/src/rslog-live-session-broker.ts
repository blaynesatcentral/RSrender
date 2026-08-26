export const rsLogLiveSessionBrokerRevision = "bld-051-live-session-broker-v1" as const;

export const RSLOG_CLOUD_ORIGIN = "https://www.rslogonline.com" as const;
export const maximumRsLogLiveResponseBytes = 16_777_216 as const;

const maximumCompanyBytes = 512;
const maximumUsernameBytes = 1_024;
const maximumPasswordBytes = 4_096;
const maximumVerificationCodeBytes = 128;

export type RsLogLiveOperationId =
  | "rslog.projects.list"
  | "rslog.project.get"
  | "rslog.project.boreholes.list"
  | "rslog.rsgeo.export";

export type RsLogDatasetId =
  | "collar"
  | "samples"
  | "drillRuns"
  | "stratigraphy"
  | "boringDetails"
  | "piezometers"
  | "discontinuities"
  | "labResults";

export type RsLogHttpRequest = Readonly<{
  method: "GET" | "POST";
  url: string;
  headers: Readonly<Record<string, string>>;
  body: Uint8Array | null;
}>;

export type RsLogHttpResponse = Readonly<{
  status: number;
  mediaType: string;
  body: Uint8Array;
}>;

export type RsLogHttpTransport = (request: RsLogHttpRequest) => Promise<RsLogHttpResponse>;

export type RsLogHttpTransportFailureCode =
  | "RSLOG_HTTP_TRANSPORT_REQUEST_INVALID"
  | "RSLOG_HTTP_TRANSPORT_RESPONSE_INVALID"
  | "RSLOG_HTTP_TRANSPORT_RESPONSE_TOO_LARGE"
  | "RSLOG_HTTP_TRANSPORT_TIMEOUT"
  | "RSLOG_HTTP_TRANSPORT_NETWORK_FAILED";

export class RsLogHttpTransportFailure extends Error {
  constructor(readonly code: RsLogHttpTransportFailureCode) {
    super(code);
    this.name = "RsLogHttpTransportFailure";
  }
}

export type RsLogAuthProjection =
  | Readonly<{ state: "signed-out" }>
  | Readonly<{ state: "verification-required" }>
  | Readonly<{ state: "signed-in"; expiresAtUtc: string }>;

export type RsLogAuthFailureCode =
  | "RSLOG_AUTH_FLOW_STATE_INVALID"
  | "RSLOG_AUTH_INPUT_MALFORMED"
  | "RSLOG_AUTH_INPUT_TOO_LARGE"
  | "RSLOG_AUTH_TRANSPORT_FAILED"
  | "RSLOG_AUTH_RESPONSE_TOO_LARGE"
  | "RSLOG_AUTH_RESPONSE_INVALID"
  | "RSLOG_AUTH_REJECTED";

export type RsLogAuthActionResult =
  | Readonly<{ accepted: true; projection: RsLogAuthProjection }>
  | Readonly<{ accepted: false; code: RsLogAuthFailureCode; projection: RsLogAuthProjection }>;

export type RsLogReadFailureCode =
  | "RSLOG_READ_NOT_AUTHENTICATED"
  | "RSLOG_READ_INPUT_MALFORMED"
  | "RSLOG_READ_TRANSPORT_FAILED"
  | "RSLOG_READ_RESPONSE_TOO_LARGE"
  | "RSLOG_READ_RESPONSE_INVALID"
  | "RSLOG_READ_AUTHENTICATION_EXPIRED"
  | "RSLOG_READ_PERMISSION_DENIED"
  | "RSLOG_READ_PROJECT_NOT_FOUND"
  | "RSLOG_READ_PROVIDER_REJECTED";

export type RsLogReadResult =
  | Readonly<{
      accepted: true;
      operationId: RsLogLiveOperationId;
      mediaType: "application/json";
      body: Uint8Array;
    }>
  | Readonly<{
      accepted: false;
      code: RsLogReadFailureCode;
      operationId: RsLogLiveOperationId | null;
    }>;

export type RsLogReadRequestSpec =
  | Readonly<{ operationId: "rslog.projects.list" }>
  | Readonly<{ operationId: "rslog.project.get"; projectId: string }>
  | Readonly<{ operationId: "rslog.project.boreholes.list"; projectId: string }>
  | Readonly<{
      operationId: "rslog.rsgeo.export";
      projectId: string;
      boreholeIds: readonly string[] | null;
      datasets: readonly RsLogDatasetId[] | null;
    }>;

type Session = {
  company: string;
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
};

type PendingVerification = {
  company: string;
  username: string;
  password: string;
};

type AuthTokenEnvelope = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
};

class BrokerFailure extends Error {
  constructor(readonly code: RsLogAuthFailureCode) {
    super(code);
    this.name = "BrokerFailure";
  }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function plainRecord(input: unknown): Record<string, unknown> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) return null;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
  }
  return input as Record<string, unknown>;
}

function exactRecord(input: unknown, keys: readonly string[]): Record<string, unknown> | null {
  const record = plainRecord(input);
  if (!record) return null;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
    ? record
    : null;
}

function boundedText(input: unknown, maximumBytes: number): string {
  if (typeof input !== "string" || input.length === 0) {
    throw new BrokerFailure("RSLOG_AUTH_INPUT_MALFORMED");
  }
  if (byteLength(input) > maximumBytes) {
    throw new BrokerFailure("RSLOG_AUTH_INPUT_TOO_LARGE");
  }
  return input;
}

function validProviderIdentity(input: unknown): input is string {
  return (
    typeof input === "string" &&
    input.length > 0 &&
    byteLength(input) <= 2_048 &&
    !containsControlCharacter(input)
  );
}

function validProviderGuid(input: unknown): input is string {
  return (
    validProviderIdentity(input) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(input) &&
    input.toLowerCase() !== "00000000-0000-0000-0000-000000000000"
  );
}

function containsControlCharacter(input: string): boolean {
  for (const character of input) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 31 || codePoint === 127) return true;
  }
  return false;
}

function parseMediaType(input: string): string {
  return input.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function copyBoundedResponse(response: RsLogHttpResponse): RsLogHttpResponse {
  const record = exactRecord(response, ["status", "mediaType", "body"]);
  if (
    !record ||
    !Number.isSafeInteger(record["status"]) ||
    (record["status"] as number) < 100 ||
    (record["status"] as number) > 599 ||
    typeof record["mediaType"] !== "string" ||
    !(record["body"] instanceof Uint8Array)
  ) {
    throw new BrokerFailure("RSLOG_AUTH_RESPONSE_INVALID");
  }
  if (record["body"].byteLength > maximumRsLogLiveResponseBytes) {
    throw new BrokerFailure("RSLOG_AUTH_RESPONSE_TOO_LARGE");
  }
  return Object.freeze({
    status: record["status"] as number,
    mediaType: record["mediaType"],
    body: new Uint8Array(record["body"]),
  });
}

function parseTokenEnvelope(response: RsLogHttpResponse): AuthTokenEnvelope {
  if (response.status !== 200 || parseMediaType(response.mediaType) !== "application/json") {
    throw new BrokerFailure("RSLOG_AUTH_REJECTED");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(response.body)) as unknown;
  } catch {
    throw new BrokerFailure("RSLOG_AUTH_RESPONSE_INVALID");
  } finally {
    response.body.fill(0);
  }
  const record = plainRecord(parsed);
  const accessToken = record?.["access_token"];
  const refreshToken = record?.["refresh_token"];
  const tokenType = record?.["token_type"];
  const expiresIn = record?.["expires_in"];
  if (
    typeof accessToken !== "string" ||
    accessToken.length === 0 ||
    byteLength(accessToken) > 16_384 ||
    typeof refreshToken !== "string" ||
    refreshToken.length === 0 ||
    byteLength(refreshToken) > 16_384 ||
    typeof tokenType !== "string" ||
    tokenType.toLowerCase() !== "bearer" ||
    !Number.isSafeInteger(expiresIn) ||
    (expiresIn as number) <= 0 ||
    (expiresIn as number) > 31_536_000
  ) {
    throw new BrokerFailure("RSLOG_AUTH_RESPONSE_INVALID");
  }
  return {
    accessToken,
    refreshToken,
    expiresInSeconds: expiresIn as number,
  };
}

function formBody(fields: Readonly<Record<string, string>>): Uint8Array {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new TextEncoder().encode(form.toString());
}

function jsonBody(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

function authFailure(
  code: RsLogAuthFailureCode,
  projection: RsLogAuthProjection,
): RsLogAuthActionResult {
  return Object.freeze({ accepted: false, code, projection });
}

function readFailure(
  code: RsLogReadFailureCode,
  operationId: RsLogLiveOperationId | null,
): RsLogReadResult {
  return Object.freeze({ accepted: false, code, operationId });
}

export class RsLogLiveSessionBroker {
  readonly #transport: RsLogHttpTransport;
  readonly #now: () => number;
  #session: Session | null = null;
  #pendingVerification: PendingVerification | null = null;

  constructor(transport: RsLogHttpTransport, now: () => number = Date.now) {
    if (typeof transport !== "function" || typeof now !== "function") {
      throw new TypeError("RSLOG_LIVE_BROKER_DEPENDENCY_INVALID");
    }
    this.#transport = transport;
    this.#now = now;
  }

  getProjection(): RsLogAuthProjection {
    if (this.#session) {
      return Object.freeze({
        state: "signed-in",
        expiresAtUtc: new Date(this.#session.expiresAtMs).toISOString(),
      });
    }
    return Object.freeze({
      state: this.#pendingVerification ? "verification-required" : "signed-out",
    });
  }

  signOut(): RsLogAuthActionResult {
    this.#clear();
    return Object.freeze({ accepted: true, projection: this.getProjection() });
  }

  async beginSignIn(input: unknown): Promise<RsLogAuthActionResult> {
    if (this.#session || this.#pendingVerification) {
      return authFailure("RSLOG_AUTH_FLOW_STATE_INVALID", this.getProjection());
    }
    let company: string;
    let username: string;
    let password: string;
    try {
      const record = exactRecord(input, ["company", "username", "password"]);
      if (!record) throw new BrokerFailure("RSLOG_AUTH_INPUT_MALFORMED");
      company = boundedText(record["company"], maximumCompanyBytes);
      username = boundedText(record["username"], maximumUsernameBytes);
      password = boundedText(record["password"], maximumPasswordBytes);
    } catch (error) {
      return authFailure(this.#authCode(error), this.getProjection());
    }

    const body = formBody({ company, username, password });
    try {
      const response = await this.#request({
        method: "POST",
        path: "/api/connect/token",
        headers: Object.freeze({
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        }),
        body,
      });
      if (response.status === 202) {
        response.body.fill(0);
        this.#pendingVerification = { company, username, password };
        return Object.freeze({ accepted: true, projection: this.getProjection() });
      }
      this.#admitSession(company, parseTokenEnvelope(response));
      return Object.freeze({ accepted: true, projection: this.getProjection() });
    } catch (error) {
      this.#clear();
      return authFailure(this.#authCode(error), this.getProjection());
    } finally {
      body.fill(0);
    }
  }

  async submitVerificationCode(input: unknown): Promise<RsLogAuthActionResult> {
    const pending = this.#pendingVerification;
    if (!pending || this.#session) {
      return authFailure("RSLOG_AUTH_FLOW_STATE_INVALID", this.getProjection());
    }
    let code: string;
    try {
      const record = exactRecord(input, ["twoFactorCode"]);
      if (!record) throw new BrokerFailure("RSLOG_AUTH_INPUT_MALFORMED");
      code = boundedText(record["twoFactorCode"], maximumVerificationCodeBytes);
    } catch (error) {
      return authFailure(this.#authCode(error), this.getProjection());
    }
    const body = formBody({
      company: pending.company,
      username: pending.username,
      password: pending.password,
      twoFactorCode: code,
    });
    try {
      const response = await this.#request({
        method: "POST",
        path: "/api/connect/verify",
        headers: Object.freeze({
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        }),
        body,
      });
      this.#admitSession(pending.company, parseTokenEnvelope(response));
      return Object.freeze({ accepted: true, projection: this.getProjection() });
    } catch (error) {
      this.#clear();
      return authFailure(this.#authCode(error), this.getProjection());
    } finally {
      body.fill(0);
    }
  }

  async executeRead(input: unknown): Promise<RsLogReadResult> {
    const request = this.#buildReadRequest(input);
    if (!request.accepted) return request.result;
    if (!this.#session) {
      return readFailure("RSLOG_READ_NOT_AUTHENTICATED", request.operationId);
    }
    try {
      if (this.#now() >= this.#session.expiresAtMs) {
        const refreshed = await this.#refresh();
        if (!refreshed) {
          return readFailure("RSLOG_READ_AUTHENTICATION_EXPIRED", request.operationId);
        }
      }
      let response = await this.#authorizedRequest(request.request);
      if (response.status === 401) {
        response.body.fill(0);
        const refreshed = await this.#refresh();
        if (!refreshed) {
          return readFailure("RSLOG_READ_AUTHENTICATION_EXPIRED", request.operationId);
        }
        response = await this.#authorizedRequest(request.request);
        if (response.status === 401) {
          response.body.fill(0);
          this.#clear();
          return readFailure("RSLOG_READ_AUTHENTICATION_EXPIRED", request.operationId);
        }
      }
      if (response.status === 403) {
        response.body.fill(0);
        return readFailure("RSLOG_READ_PERMISSION_DENIED", request.operationId);
      }
      if (response.status === 404) {
        response.body.fill(0);
        return readFailure("RSLOG_READ_PROJECT_NOT_FOUND", request.operationId);
      }
      if (response.status !== 200) {
        response.body.fill(0);
        return readFailure("RSLOG_READ_PROVIDER_REJECTED", request.operationId);
      }
      if (parseMediaType(response.mediaType) !== "application/json") {
        response.body.fill(0);
        return readFailure("RSLOG_READ_RESPONSE_INVALID", request.operationId);
      }
      return Object.freeze({
        accepted: true,
        operationId: request.operationId,
        mediaType: "application/json",
        body: new Uint8Array(response.body),
      });
    } catch (error) {
      const code = this.#authCode(error);
      return readFailure(
        code === "RSLOG_AUTH_RESPONSE_TOO_LARGE"
          ? "RSLOG_READ_RESPONSE_TOO_LARGE"
          : code === "RSLOG_AUTH_RESPONSE_INVALID"
            ? "RSLOG_READ_RESPONSE_INVALID"
            : "RSLOG_READ_TRANSPORT_FAILED",
        request.operationId,
      );
    }
  }

  #buildReadRequest(input: unknown):
    | Readonly<{
        accepted: true;
        operationId: RsLogLiveOperationId;
        request: Readonly<{ method: "GET" | "POST"; path: string; body: Uint8Array | null }>;
      }>
    | Readonly<{ accepted: false; operationId: null; result: RsLogReadResult }> {
    const record = plainRecord(input);
    const operationId = record?.["operationId"];
    if (!record || typeof operationId !== "string") {
      return {
        accepted: false,
        operationId: null,
        result: readFailure("RSLOG_READ_INPUT_MALFORMED", null),
      };
    }
    if (operationId === "rslog.projects.list" && exactRecord(record, ["operationId"])) {
      return {
        accepted: true,
        operationId,
        request: { method: "GET", path: "/api/v1/projects", body: null },
      };
    }
    if (
      (operationId === "rslog.project.get" || operationId === "rslog.project.boreholes.list") &&
      exactRecord(record, ["operationId", "projectId"]) &&
      validProviderIdentity(record["projectId"])
    ) {
      const projectId = encodeURIComponent(record["projectId"]);
      return {
        accepted: true,
        operationId,
        request: {
          method: "GET",
          path:
            operationId === "rslog.project.get"
              ? `/api/v1/project/${projectId}`
              : `/api/v1/project/${projectId}/boreholes`,
          body: null,
        },
      };
    }
    if (
      operationId === "rslog.rsgeo.export" &&
      exactRecord(record, ["operationId", "projectId", "boreholeIds", "datasets"]) &&
      validProviderGuid(record["projectId"]) &&
      this.#validNullableIdentityList(record["boreholeIds"]) &&
      (record["boreholeIds"] === null || record["boreholeIds"].every(validProviderGuid)) &&
      this.#validNullableDatasetList(record["datasets"])
    ) {
      return {
        accepted: true,
        operationId,
        request: {
          method: "POST",
          path: "/api/v3/export/rsgeo/data",
          body: jsonBody(
            record["datasets"] === null && record["boreholeIds"] === null
              ? { projectId: record["projectId"] }
              : {
                  projectId: record["projectId"],
                  ...(record["datasets"] === null ? {} : { datasets: record["datasets"] }),
                  ...(record["boreholeIds"] === null
                    ? {}
                    : {
                        options: {
                          boreholeIds: record["boreholeIds"],
                          sampleTypeIds: [],
                        },
                      }),
                },
          ),
        },
      };
    }
    return {
      accepted: false,
      operationId: null,
      result: readFailure(
        "RSLOG_READ_INPUT_MALFORMED",
        operationId === "rslog.rsgeo.export" ? operationId : null,
      ),
    };
  }

  #validNullableIdentityList(input: unknown): input is readonly string[] | null {
    return (
      input === null ||
      (Array.isArray(input) &&
        input.length <= 10_000 &&
        input.every(validProviderIdentity) &&
        new Set(input).size === input.length)
    );
  }

  #validNullableDatasetList(input: unknown): input is readonly RsLogDatasetId[] | null {
    const allowed = new Set<RsLogDatasetId>([
      "collar",
      "samples",
      "drillRuns",
      "stratigraphy",
      "boringDetails",
      "piezometers",
      "discontinuities",
      "labResults",
    ]);
    return (
      input === null ||
      (Array.isArray(input) &&
        input.length <= allowed.size &&
        input.every((value) => typeof value === "string" && allowed.has(value as RsLogDatasetId)) &&
        new Set(input).size === input.length)
    );
  }

  async #authorizedRequest(
    request: Readonly<{ method: "GET" | "POST"; path: string; body: Uint8Array | null }>,
  ): Promise<RsLogHttpResponse> {
    const session = this.#session;
    if (!session) throw new BrokerFailure("RSLOG_AUTH_FLOW_STATE_INVALID");
    return this.#request({
      ...request,
      headers: Object.freeze({
        accept: "application/json",
        authorization: `Bearer ${session.accessToken}`,
        ...(request.body ? { "content-type": "application/json;charset=UTF-8" } : {}),
      }),
    });
  }

  async #refresh(): Promise<boolean> {
    const session = this.#session;
    if (!session) return false;
    const body = formBody({ company: session.company, refreshToken: session.refreshToken });
    try {
      const response = await this.#request({
        method: "POST",
        path: "/api/connect/refresh",
        headers: Object.freeze({
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        }),
        body,
      });
      this.#admitSession(session.company, parseTokenEnvelope(response));
      return true;
    } catch {
      this.#clear();
      return false;
    } finally {
      body.fill(0);
    }
  }

  async #request(
    input: Readonly<{
      method: "GET" | "POST";
      path: string;
      headers: Readonly<Record<string, string>>;
      body: Uint8Array | null;
    }>,
  ): Promise<RsLogHttpResponse> {
    let response: RsLogHttpResponse;
    try {
      response = await this.#transport(
        Object.freeze({
          method: input.method,
          url: `${RSLOG_CLOUD_ORIGIN}${input.path}`,
          headers: input.headers,
          body: input.body === null ? null : new Uint8Array(input.body),
        }),
      );
    } catch (error) {
      if (error instanceof RsLogHttpTransportFailure) {
        if (error.code === "RSLOG_HTTP_TRANSPORT_RESPONSE_TOO_LARGE") {
          throw new BrokerFailure("RSLOG_AUTH_RESPONSE_TOO_LARGE");
        }
        if (error.code === "RSLOG_HTTP_TRANSPORT_RESPONSE_INVALID") {
          throw new BrokerFailure("RSLOG_AUTH_RESPONSE_INVALID");
        }
      }
      throw new BrokerFailure("RSLOG_AUTH_TRANSPORT_FAILED");
    }
    return copyBoundedResponse(response);
  }

  #admitSession(company: string, envelope: AuthTokenEnvelope): void {
    this.#pendingVerification = null;
    this.#session = {
      company,
      accessToken: envelope.accessToken,
      refreshToken: envelope.refreshToken,
      expiresAtMs: this.#now() + envelope.expiresInSeconds * 1_000,
    };
  }

  #clear(): void {
    this.#pendingVerification = null;
    this.#session = null;
  }

  #authCode(error: unknown): RsLogAuthFailureCode {
    return error instanceof BrokerFailure ? error.code : "RSLOG_AUTH_TRANSPORT_FAILED";
  }
}
