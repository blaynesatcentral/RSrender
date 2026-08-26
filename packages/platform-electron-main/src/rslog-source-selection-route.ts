export const rsLogSourceSelectionRouteRevision = "bld-051-source-selection-route-v1" as const;

export const RSLOG_SOURCE_SELECTION_URL =
  "rsrender-shell://rslog-source-selection/index.html" as const;
export const RSLOG_SOURCE_SELECTION_STYLESHEET_URL =
  "rsrender-shell://rslog-source-selection/source-selection.css" as const;
export const RSLOG_SOURCE_SELECTION_BOOTSTRAP_CHANNEL =
  "rsrender:rslog-source-selection:bootstrap" as const;
export const RSLOG_SOURCE_SELECTION_SUBMIT_CHANNEL =
  "rsrender:rslog-source-selection:submit" as const;
export const RSLOG_SOURCE_SELECTION_CANCEL_CHANNEL =
  "rsrender:rslog-source-selection:cancel" as const;

export type RsLogSourceSelectionMode = "project" | "explorations";

export type RsLogSourceSelectionOption = Readonly<{
  id: string;
  label: string;
  description: string;
}>;

export type RsLogSourceSelectionContext = Readonly<{
  senderId: number;
  frameUrl: string;
  isMainFrame: boolean;
}>;

export type RsLogSourceSelectionBootstrapResult =
  | Readonly<{
      accepted: true;
      mode: RsLogSourceSelectionMode;
      capability: string;
      options: readonly RsLogSourceSelectionOption[];
    }>
  | Readonly<{ accepted: false; code: "RSLOG_SOURCE_SELECTION_UNAVAILABLE" }>;

export type RsLogSourceSelectionResult =
  | Readonly<{ accepted: true; selectedIds: readonly string[] }>
  | Readonly<{
      accepted: false;
      code: "RSLOG_SOURCE_SELECTION_UNAVAILABLE" | "RSLOG_SOURCE_SELECTION_CANCELED";
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

function exactRecord(input: unknown, keys: readonly string[]): Record<string, unknown> | null {
  const record = plainRecord(input);
  if (record === null) return null;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
    ? record
    : null;
}

function safeText(input: unknown, maximumBytes: number): input is string {
  if (typeof input !== "string" || input.length < 1) return false;
  if (new TextEncoder().encode(input).byteLength > maximumBytes) return false;
  for (const character of input) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 31 || codePoint === 127) return false;
  }
  return true;
}

function copyOptions(input: readonly RsLogSourceSelectionOption[]) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 256) {
    throw new TypeError("RSLOG_SOURCE_SELECTION_OPTIONS_INVALID");
  }
  const options = input.map((candidate) => {
    const option = exactRecord(candidate, ["id", "label", "description"]);
    if (
      option === null ||
      !safeText(option["id"], 2_048) ||
      !safeText(option["label"], 4_096) ||
      (option["description"] !== "" && !safeText(option["description"], 8_192))
    ) {
      throw new TypeError("RSLOG_SOURCE_SELECTION_OPTIONS_INVALID");
    }
    return Object.freeze({
      id: option["id"],
      label: option["label"],
      description: option["description"],
    });
  });
  if (new Set(options.map(({ id }) => id)).size !== options.length) {
    throw new TypeError("RSLOG_SOURCE_SELECTION_OPTIONS_INVALID");
  }
  return Object.freeze(options);
}

export class RsLogSourceSelectionRouteBroker {
  readonly #mode: RsLogSourceSelectionMode;
  readonly #expectedSenderId: number;
  readonly #capability: string;
  readonly #options: readonly RsLogSourceSelectionOption[];
  readonly #optionIds: ReadonlySet<string>;
  #bootstrapped = false;
  #consumed = false;

  constructor(
    input: Readonly<{
      mode: RsLogSourceSelectionMode;
      expectedSenderId: number;
      capability: string;
      options: readonly RsLogSourceSelectionOption[];
    }>,
  ) {
    if (
      !["project", "explorations"].includes(input.mode) ||
      !Number.isSafeInteger(input.expectedSenderId) ||
      input.expectedSenderId < 1 ||
      typeof input.capability !== "string" ||
      !/^[0-9a-f]{64}$/u.test(input.capability)
    ) {
      throw new TypeError("RSLOG_SOURCE_SELECTION_ROUTE_INPUT_INVALID");
    }
    this.#mode = input.mode;
    this.#expectedSenderId = input.expectedSenderId;
    this.#capability = input.capability;
    this.#options = copyOptions(input.options);
    this.#optionIds = new Set(this.#options.map(({ id }) => id));
  }

  bootstrap(context: RsLogSourceSelectionContext): RsLogSourceSelectionBootstrapResult {
    if (!this.#validContext(context) || this.#bootstrapped || this.#consumed) {
      return Object.freeze({ accepted: false, code: "RSLOG_SOURCE_SELECTION_UNAVAILABLE" });
    }
    this.#bootstrapped = true;
    return Object.freeze({
      accepted: true,
      mode: this.#mode,
      capability: this.#capability,
      options: this.#options,
    });
  }

  submit(context: RsLogSourceSelectionContext, input: unknown): RsLogSourceSelectionResult {
    const routeInput = this.#consume(context, input);
    if (routeInput === null) {
      return Object.freeze({ accepted: false, code: "RSLOG_SOURCE_SELECTION_UNAVAILABLE" });
    }
    const payload = exactRecord(routeInput["payload"], ["selectedIds"]);
    const selectedIds = payload?.["selectedIds"];
    if (
      !Array.isArray(selectedIds) ||
      selectedIds.length < 1 ||
      selectedIds.length > this.#options.length ||
      (this.#mode === "project" && selectedIds.length !== 1)
    ) {
      return Object.freeze({ accepted: false, code: "RSLOG_SOURCE_SELECTION_UNAVAILABLE" });
    }
    const admittedSelectedIds: string[] = [];
    for (const selectedId of selectedIds as readonly unknown[]) {
      if (typeof selectedId !== "string" || !this.#optionIds.has(selectedId)) {
        return Object.freeze({ accepted: false, code: "RSLOG_SOURCE_SELECTION_UNAVAILABLE" });
      }
      admittedSelectedIds.push(selectedId);
    }
    if (new Set(admittedSelectedIds).size !== admittedSelectedIds.length) {
      return Object.freeze({ accepted: false, code: "RSLOG_SOURCE_SELECTION_UNAVAILABLE" });
    }
    return Object.freeze({
      accepted: true,
      selectedIds: Object.freeze(admittedSelectedIds),
    });
  }

  cancel(context: RsLogSourceSelectionContext, input: unknown): RsLogSourceSelectionResult {
    const routeInput = this.#consume(context, input);
    if (routeInput === null || exactRecord(routeInput["payload"], []) === null) {
      return Object.freeze({ accepted: false, code: "RSLOG_SOURCE_SELECTION_UNAVAILABLE" });
    }
    return Object.freeze({ accepted: false, code: "RSLOG_SOURCE_SELECTION_CANCELED" });
  }

  invalidate(): void {
    this.#consumed = true;
  }

  #consume(context: RsLogSourceSelectionContext, input: unknown): Record<string, unknown> | null {
    const routeInput = exactRecord(input, ["capability", "payload"]);
    if (
      !this.#validContext(context) ||
      !this.#bootstrapped ||
      this.#consumed ||
      routeInput?.["capability"] !== this.#capability
    ) {
      return null;
    }
    this.#consumed = true;
    return routeInput;
  }

  #validContext(context: RsLogSourceSelectionContext): boolean {
    return (
      context.senderId === this.#expectedSenderId &&
      context.frameUrl === RSLOG_SOURCE_SELECTION_URL &&
      context.isMainFrame
    );
  }
}

export function createRsLogSourceSelectionHtml(): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Choose RSLog source</title><link rel="stylesheet" href="${RSLOG_SOURCE_SELECTION_STYLESHEET_URL}"></head>
<body><main><header><div class="mark" aria-hidden="true">R</div><div><h1 id="selection-title">Choose RSLog source</h1><p id="selection-help"></p></div></header><form id="selection-form"><div id="selection-actions" hidden><button id="select-all" type="button">Select all</button><button id="clear-all" type="button">Clear</button></div><fieldset id="selection-options" aria-describedby="selection-help"></fieldset><p id="selection-status" role="status" aria-live="polite"></p><footer><button id="cancel" type="button">Cancel</button><button id="submit" type="submit">Continue</button></footer></form></main></body>
</html>`;
}

export const RSLOG_SOURCE_SELECTION_STYLESHEET = `
:root{color-scheme:light;font-family:"Segoe UI",Arial,sans-serif;background:#eef2f5;color:#17202a}*{box-sizing:border-box}body{margin:0;min-width:480px}main{padding:22px;height:100vh;display:grid;grid-template-rows:auto minmax(0,1fr);gap:16px}header{display:flex;gap:14px;align-items:center}.mark{display:grid;place-items:center;width:44px;height:44px;border-radius:8px;background:#1261a0;color:white;font-weight:700;font-size:24px}h1{font-size:20px;margin:0 0 4px}p{font-size:13px;line-height:1.4;margin:0;color:#4b5965}form{min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;gap:10px}#selection-actions{display:flex;gap:6px}fieldset{min-width:0;margin:0;padding:6px;border:1px solid #aab4bd;border-radius:4px;background:white;overflow:auto}.option{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;padding:9px;border-radius:3px}.option:hover{background:#edf5fb}.option input{margin-top:3px}.option strong,.option small{display:block;overflow-wrap:anywhere}.option strong{font-size:13px}.option small{margin-top:2px;color:#596773;font-size:12px;line-height:1.35}#selection-status{min-height:18px;color:#9a3412}footer{display:flex;justify-content:flex-end;gap:8px}button{min-width:84px;min-height:34px;border:1px solid #687782;border-radius:3px;background:#fff;color:#17202a;font-weight:600}#submit{background:#1769aa;border-color:#1769aa;color:#fff}button:disabled{opacity:.6}
`;
