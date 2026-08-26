import type {
  RsLogAuthFailureCode,
  RsLogAuthProjection,
  RsLogLiveSessionBroker,
} from "./rslog-live-session-broker.js";

export const rsLogAuthEntryRouteRevision = "bld-051-auth-entry-route-v1" as const;
export const RSLOG_AUTH_ENTRY_URL = "rsrender-shell://auth-entry/index.html" as const;
export const RSLOG_AUTH_ENTRY_STYLESHEET_URL =
  "rsrender-shell://auth-entry/auth-entry.css" as const;
export const RSLOG_AUTH_ENTRY_BOOTSTRAP_CHANNEL = "rsrender:rslog-auth-entry:bootstrap" as const;
export const RSLOG_AUTH_ENTRY_SUBMIT_CHANNEL = "rsrender:rslog-auth-entry:submit" as const;
export const RSLOG_AUTH_ENTRY_CANCEL_CHANNEL = "rsrender:rslog-auth-entry:cancel" as const;

export type RsLogAuthEntryMode = "password" | "verification-code";

export type RsLogAuthEntryContext = Readonly<{
  senderId: number;
  frameUrl: string;
  isMainFrame: boolean;
}>;

export type RsLogAuthEntryBootstrapResult =
  | Readonly<{
      accepted: true;
      mode: RsLogAuthEntryMode;
      capability: string;
    }>
  | Readonly<{ accepted: false; code: "RSLOG_AUTH_ENTRY_UNAVAILABLE" }>;

export type RsLogAuthEntryResult =
  | Readonly<{ accepted: true; projection: RsLogAuthProjection }>
  | Readonly<{
      accepted: false;
      code: RsLogAuthFailureCode | "RSLOG_AUTH_ENTRY_UNAVAILABLE";
      projection: RsLogAuthProjection;
    }>;

type RouteInput = Readonly<{
  capability: string;
  payload: unknown;
}>;

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

function unavailable(projection: RsLogAuthProjection): RsLogAuthEntryResult {
  return Object.freeze({
    accepted: false,
    code: "RSLOG_AUTH_ENTRY_UNAVAILABLE",
    projection,
  });
}

export class RsLogAuthEntryRouteBroker {
  readonly #mode: RsLogAuthEntryMode;
  readonly #expectedSenderId: number;
  readonly #capability: string;
  readonly #sessionBroker: RsLogLiveSessionBroker;
  #bootstrapped = false;
  #consumed = false;

  constructor(
    input: Readonly<{
      mode: RsLogAuthEntryMode;
      expectedSenderId: number;
      capability: string;
      sessionBroker: RsLogLiveSessionBroker;
    }>,
  ) {
    if (
      !["password", "verification-code"].includes(input.mode) ||
      !Number.isSafeInteger(input.expectedSenderId) ||
      input.expectedSenderId < 1 ||
      typeof input.capability !== "string" ||
      !/^[0-9a-f]{64}$/u.test(input.capability)
    ) {
      throw new TypeError("RSLOG_AUTH_ENTRY_ROUTE_INPUT_INVALID");
    }
    this.#mode = input.mode;
    this.#expectedSenderId = input.expectedSenderId;
    this.#capability = input.capability;
    this.#sessionBroker = input.sessionBroker;
  }

  bootstrap(context: RsLogAuthEntryContext): RsLogAuthEntryBootstrapResult {
    if (!this.#validContext(context) || this.#bootstrapped || this.#consumed) {
      return Object.freeze({ accepted: false, code: "RSLOG_AUTH_ENTRY_UNAVAILABLE" });
    }
    this.#bootstrapped = true;
    return Object.freeze({ accepted: true, mode: this.#mode, capability: this.#capability });
  }

  async submit(context: RsLogAuthEntryContext, input: unknown): Promise<RsLogAuthEntryResult> {
    const projection = this.#sessionBroker.getProjection();
    if (!this.#consume(context, input)) return unavailable(projection);
    const routeInput = exactRecord(input, ["capability", "payload"]) as RouteInput;
    const payload =
      this.#mode === "password"
        ? exactRecord(routeInput.payload, ["company", "username", "password"])
        : exactRecord(routeInput.payload, ["twoFactorCode"]);
    if (!payload) return unavailable(this.#sessionBroker.getProjection());
    const result =
      this.#mode === "password"
        ? await this.#sessionBroker.beginSignIn(payload)
        : await this.#sessionBroker.submitVerificationCode(payload);
    return result.accepted
      ? Object.freeze({ accepted: true, projection: result.projection })
      : Object.freeze({
          accepted: false,
          code: result.code,
          projection: result.projection,
        });
  }

  cancel(context: RsLogAuthEntryContext, input: unknown): RsLogAuthEntryResult {
    const projection = this.#sessionBroker.getProjection();
    if (!this.#consume(context, input)) return unavailable(projection);
    const routeInput = exactRecord(input, ["capability", "payload"]);
    if (!routeInput || exactRecord(routeInput["payload"], []) === null) {
      return unavailable(this.#sessionBroker.getProjection());
    }
    return this.#sessionBroker.signOut();
  }

  invalidate(): void {
    this.#consumed = true;
  }

  #consume(context: RsLogAuthEntryContext, input: unknown): boolean {
    const record = exactRecord(input, ["capability", "payload"]);
    if (
      !this.#validContext(context) ||
      !this.#bootstrapped ||
      this.#consumed ||
      record?.["capability"] !== this.#capability
    ) {
      return false;
    }
    this.#consumed = true;
    return true;
  }

  #validContext(context: RsLogAuthEntryContext): boolean {
    return (
      context.senderId === this.#expectedSenderId &&
      context.frameUrl === RSLOG_AUTH_ENTRY_URL &&
      context.isMainFrame
    );
  }
}

export function createRsLogAuthEntryHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Connect to RSLog</title>
  <link rel="stylesheet" href="${RSLOG_AUTH_ENTRY_STYLESHEET_URL}">
</head>
<body>
  <main>
    <header><div class="mark" aria-hidden="true">R</div><div><h1 id="auth-title">Connect to RSLog</h1><p id="auth-help">Credentials stay in this application session and are never saved in a Log Project.</p></div></header>
    <form id="auth-form" autocomplete="off">
      <section id="password-fields">
        <label>Company code<input id="company" name="company" type="text" maxlength="512" autocomplete="organization" required></label>
        <label>Username<input id="username" name="username" type="text" maxlength="1024" autocomplete="username" required></label>
        <label>Password<input id="password" name="password" type="password" maxlength="4096" autocomplete="current-password" required></label>
      </section>
      <section id="verification-fields" hidden>
        <label>Verification code<input id="two-factor-code" name="twoFactorCode" type="text" inputmode="numeric" maxlength="128" autocomplete="one-time-code"></label>
      </section>
      <p id="auth-status" role="status" aria-live="polite"></p>
      <footer><button id="cancel" type="button">Cancel</button><button id="submit" type="submit">Connect</button></footer>
    </form>
  </main>
</body>
</html>`;
}

export const RSLOG_AUTH_ENTRY_STYLESHEET = `
:root{color-scheme:light;font-family:"Segoe UI",Arial,sans-serif;background:#eef2f5;color:#17202a}
*{box-sizing:border-box}body{margin:0;min-width:420px}main{padding:24px}header{display:flex;gap:14px;align-items:center;margin-bottom:20px}.mark{display:grid;place-items:center;width:44px;height:44px;border-radius:8px;background:#1261a0;color:white;font-weight:700;font-size:24px}h1{font-size:20px;margin:0 0 4px}p{font-size:13px;line-height:1.4;margin:0;color:#4b5965}form{display:grid;gap:16px}section{display:grid;gap:12px}label{display:grid;gap:5px;font-size:12px;font-weight:600}input{width:100%;min-height:34px;padding:6px 9px;border:1px solid #8996a3;border-radius:3px;background:white;color:#17202a;font:14px "Segoe UI",Arial,sans-serif}input:focus{outline:2px solid #2f80c9;outline-offset:1px}#auth-status{min-height:18px;color:#9a3412}footer{display:flex;justify-content:flex-end;gap:8px}button{min-width:88px;min-height:34px;border:1px solid #687782;border-radius:3px;background:#fff;color:#17202a;font-weight:600}#submit{background:#1769aa;border-color:#1769aa;color:#fff}button:disabled{opacity:.6}
`;
