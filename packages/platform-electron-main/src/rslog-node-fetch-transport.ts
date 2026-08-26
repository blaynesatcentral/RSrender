import {
  maximumRsLogLiveResponseBytes,
  RSLOG_CLOUD_ORIGIN,
  RsLogHttpTransportFailure,
  type RsLogHttpRequest,
  type RsLogHttpResponse,
  type RsLogHttpTransport,
} from "./rslog-live-session-broker.js";

export const rsLogNodeFetchTransportRevision = "bld-051-node-fetch-transport-v1" as const;
export const defaultRsLogRequestTimeoutMs = 30_000 as const;
export const maximumRsLogLiveRequestBytes = 2_097_152 as const;

export type RsLogFetchImplementation = (input: string, init: RequestInit) => Promise<Response>;

export type RsLogNodeFetchTransportOptions = Readonly<{
  fetchImplementation?: RsLogFetchImplementation;
  timeoutMs?: number;
}>;

const routeRules = Object.freeze([
  Object.freeze({ method: "POST", pattern: /^\/api\/connect\/(?:token|verify|refresh)$/u }),
  Object.freeze({ method: "GET", pattern: /^\/api\/v1\/projects$/u }),
  Object.freeze({ method: "GET", pattern: /^\/api\/v1\/project\/[^/]+(?:\/boreholes)?$/u }),
  Object.freeze({ method: "POST", pattern: /^\/api\/v3\/export\/rsgeo\/data$/u }),
] as const);

function failure(code: ConstructorParameters<typeof RsLogHttpTransportFailure>[0]): never {
  throw new RsLogHttpTransportFailure(code);
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

function exactRecord(
  input: unknown,
  expectedKeys: readonly string[],
): Record<string, unknown> | null {
  const record = plainRecord(input);
  if (!record) return null;
  const actual = Object.keys(record).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
    ? record
    : null;
}

function validateHeaders(
  input: unknown,
  method: "GET" | "POST",
  path: string,
): Readonly<Record<string, string>> {
  const headers = plainRecord(input);
  if (!headers) return failure("RSLOG_HTTP_TRANSPORT_REQUEST_INVALID");
  const isAuth = path.startsWith("/api/connect/");
  const expectsAuthorization = !isAuth;
  const expectsContentType = method === "POST";
  const expectedKeys = [
    "accept",
    ...(expectsAuthorization ? ["authorization"] : []),
    ...(expectsContentType ? ["content-type"] : []),
  ].sort();
  const actualKeys = Object.keys(headers).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    !actualKeys.every((key, index) => key === expectedKeys[index]) ||
    headers["accept"] !== "application/json"
  ) {
    return failure("RSLOG_HTTP_TRANSPORT_REQUEST_INVALID");
  }
  if (
    expectsAuthorization &&
    (typeof headers["authorization"] !== "string" ||
      !validAuthorizationHeader(headers["authorization"]))
  ) {
    return failure("RSLOG_HTTP_TRANSPORT_REQUEST_INVALID");
  }
  const expectedContentType = isAuth
    ? "application/x-www-form-urlencoded;charset=UTF-8"
    : "application/json;charset=UTF-8";
  if (expectsContentType && headers["content-type"] !== expectedContentType) {
    return failure("RSLOG_HTTP_TRANSPORT_REQUEST_INVALID");
  }
  return Object.freeze(Object.fromEntries(actualKeys.map((key) => [key, headers[key] as string])));
}

function validAuthorizationHeader(input: string): boolean {
  if (!input.startsWith("Bearer ")) return false;
  const token = input.slice("Bearer ".length);
  if (token.length < 1 || token.length > 16_384) return false;
  for (const character of token) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 32 || codePoint === 127) return false;
  }
  return true;
}

function validateRequest(input: unknown): RsLogHttpRequest {
  const request = exactRecord(input, ["method", "url", "headers", "body"]);
  if (
    !request ||
    (request["method"] !== "GET" && request["method"] !== "POST") ||
    typeof request["url"] !== "string" ||
    !(request["body"] === null || request["body"] instanceof Uint8Array)
  ) {
    return failure("RSLOG_HTTP_TRANSPORT_REQUEST_INVALID");
  }
  let url: URL;
  try {
    url = new URL(request["url"]);
  } catch {
    return failure("RSLOG_HTTP_TRANSPORT_REQUEST_INVALID");
  }
  const method = request["method"];
  if (
    url.origin !== RSLOG_CLOUD_ORIGIN ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    !routeRules.some((rule) => rule.method === method && rule.pattern.test(url.pathname))
  ) {
    return failure("RSLOG_HTTP_TRANSPORT_REQUEST_INVALID");
  }
  const body = request["body"];
  if (
    (method === "GET" && body !== null) ||
    (method === "POST" && body === null) ||
    (body?.byteLength ?? 0) > maximumRsLogLiveRequestBytes
  ) {
    return failure("RSLOG_HTTP_TRANSPORT_REQUEST_INVALID");
  }
  return Object.freeze({
    method,
    url: url.href,
    headers: validateHeaders(request["headers"], method, url.pathname),
    body: body === null ? null : new Uint8Array(body),
  });
}

async function readBoundedResponse(response: Response): Promise<Uint8Array> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^(?:0|[1-9][0-9]*)$/u.test(declaredLength)) {
      return failure("RSLOG_HTTP_TRANSPORT_RESPONSE_INVALID");
    }
    const bytes = Number(declaredLength);
    if (!Number.isSafeInteger(bytes)) {
      return failure("RSLOG_HTTP_TRANSPORT_RESPONSE_INVALID");
    }
    if (bytes > maximumRsLogLiveResponseBytes) {
      await response.body?.cancel();
      return failure("RSLOG_HTTP_TRANSPORT_RESPONSE_TOO_LARGE");
    }
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maximumRsLogLiveResponseBytes) {
        await reader.cancel();
        return failure("RSLOG_HTTP_TRANSPORT_RESPONSE_TOO_LARGE");
      }
      chunks.push(new Uint8Array(next.value));
    }
  } catch (error) {
    if (error instanceof RsLogHttpTransportFailure) throw error;
    return failure("RSLOG_HTTP_TRANSPORT_NETWORK_FAILED");
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function createRsLogNodeFetchTransport(
  options: RsLogNodeFetchTransportOptions = {},
): RsLogHttpTransport {
  const fetchImplementation = options.fetchImplementation ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? defaultRsLogRequestTimeoutMs;
  if (
    typeof fetchImplementation !== "function" ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 120_000
  ) {
    throw new TypeError("RSLOG_NODE_FETCH_TRANSPORT_OPTIONS_INVALID");
  }
  return async (untrustedRequest: RsLogHttpRequest): Promise<RsLogHttpResponse> => {
    const request = validateRequest(untrustedRequest);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response: Response;
      try {
        response = await fetchImplementation(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body === null ? null : Uint8Array.from(request.body).buffer,
          redirect: "error",
          credentials: "omit",
          cache: "no-store",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted) return failure("RSLOG_HTTP_TRANSPORT_TIMEOUT");
        if (error instanceof RsLogHttpTransportFailure) throw error;
        return failure("RSLOG_HTTP_TRANSPORT_NETWORK_FAILED");
      }
      if (!(response instanceof Response)) {
        return failure("RSLOG_HTTP_TRANSPORT_RESPONSE_INVALID");
      }
      const mediaType = response.headers.get("content-type") ?? "";
      return Object.freeze({
        status: response.status,
        mediaType,
        body: await readBoundedResponse(response),
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}
