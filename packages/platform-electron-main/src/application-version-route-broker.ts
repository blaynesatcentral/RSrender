import {
  createApplicationVersionQuery,
  validateApplicationVersionQuery,
  validateApplicationVersionResult,
} from "@rsrender/contracts";
import type { ApplicationVersionQuery, ApplicationVersionResult } from "@rsrender/contracts";
import type { ApplicationVersionQueryPort } from "@rsrender/application";

export const applicationVersionTransportRevision = "bld-012-v1" as const;
export const APPLICATION_VERSION_BOOTSTRAP_CHANNEL =
  "rsrender:application-version:bootstrap:v1" as const;
export const APPLICATION_VERSION_QUERY_CHANNEL = "rsrender:application-version:query:v1" as const;
export const APPLICATION_START_URL = "rsrender-shell://app/index.html" as const;

export type ApplicationVersionTransportRejectionCode =
  | "BOOTSTRAP_ALREADY_ISSUED"
  | "CAPABILITY_INVALID"
  | "CAPABILITY_STALE"
  | "CROSS_WINDOW"
  | "FRAME_INVALID"
  | "GENERATION_INVALID"
  | "ORIGIN_ROUTE_INVALID"
  | "QUERY_IN_FLIGHT"
  | "QUERY_SCHEMA_INVALID"
  | "SENDER_INVALID"
  | "SEQUENCE_INVALID"
  | "SEQUENCE_EXHAUSTED"
  | "SEQUENCE_REPLAYED"
  | "SERVICE_RESULT_INVALID"
  | "TRANSPORT_MALFORMED"
  | "TRANSPORT_UNSUPPORTED_VERSION"
  | "WINDOW_NOT_LIVE";

export interface ApplicationVersionRouteContext {
  readonly window: object | null;
  readonly webContents: object;
  readonly frame: object | null;
  readonly mainFrame: object | null;
  readonly url: string;
  readonly windowLive: boolean;
  readonly webContentsLive: boolean;
}

export type ApplicationVersionBootstrapResult =
  | {
      readonly accepted: true;
      readonly transportVersion: 1;
      readonly generation: number;
      readonly capability: string;
    }
  | {
      readonly accepted: false;
      readonly code: ApplicationVersionTransportRejectionCode;
    };

export type ApplicationVersionTransportResult =
  | {
      readonly accepted: true;
      readonly transportVersion: 1;
      readonly generation: number;
      readonly sequence: number;
      readonly result: ApplicationVersionResult;
    }
  | {
      readonly accepted: false;
      readonly code: ApplicationVersionTransportRejectionCode;
    };

type Binding = {
  readonly capability: string;
  readonly generation: number;
  readonly frame: object;
  nextSequence: number;
  inFlight: boolean;
};

function ownDataRecord(
  input: unknown,
  fields: readonly string[],
): Readonly<Record<string, unknown>> | null {
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
    const prototype = Object.getPrototypeOf(input) as unknown;
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(input);
    if (
      keys.some((key) => typeof key !== "string" || !fields.includes(key)) ||
      fields.some((field) => !keys.includes(field))
    ) {
      return null;
    }
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const field of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(input, field);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
      result[field] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function ownDataValue(input: unknown, field: string): unknown {
  try {
    if (typeof input !== "object" || input === null) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    return descriptor?.enumerable === true && "value" in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

function rejection(
  code: ApplicationVersionTransportRejectionCode,
): Readonly<{ accepted: false; code: ApplicationVersionTransportRejectionCode }> {
  return Object.freeze({ accepted: false, code });
}

function exactApplicationStartUrl(input: string): boolean {
  try {
    const parsed = new URL(input);
    return (
      parsed.href === APPLICATION_START_URL &&
      parsed.protocol === "rsrender-shell:" &&
      parsed.hostname === "app" &&
      parsed.pathname === "/index.html" &&
      parsed.username === "" &&
      parsed.password === "" &&
      parsed.port === "" &&
      parsed.search === "" &&
      parsed.hash === ""
    );
  } catch {
    return false;
  }
}

function isCapability(input: unknown): input is string {
  return typeof input === "string" && /^[0-9a-f]{64}$/u.test(input);
}

function isPositiveSafeInteger(input: unknown): input is number {
  return typeof input === "number" && Number.isSafeInteger(input) && input > 0;
}

export class ApplicationVersionRouteBroker {
  readonly #expectedWindow: object;
  readonly #expectedWebContents: object;
  readonly #service: ApplicationVersionQueryPort;
  readonly #createCapability: () => string;
  readonly #initialSequence: number;
  #generation = 0;
  #binding: Binding | null = null;

  constructor(input: {
    readonly expectedWindow: object;
    readonly expectedWebContents: object;
    readonly service: ApplicationVersionQueryPort;
    readonly createCapability: () => string;
    readonly initialSequence?: number;
  }) {
    this.#expectedWindow = input.expectedWindow;
    this.#expectedWebContents = input.expectedWebContents;
    this.#service = input.service;
    this.#createCapability = input.createCapability;
    this.#initialSequence = input.initialSequence ?? 1;
    if (!isPositiveSafeInteger(this.#initialSequence)) {
      throw new Error("INITIAL_SEQUENCE_INVALID");
    }
  }

  bootstrap(context: ApplicationVersionRouteContext): ApplicationVersionBootstrapResult {
    const contextFailure = this.#validateContext(context, null);
    if (contextFailure !== null) return rejection(contextFailure);
    if (this.#binding !== null) return rejection("BOOTSTRAP_ALREADY_ISSUED");
    if (context.frame === null) return rejection("FRAME_INVALID");
    const capability = this.#createCapability();
    if (!isCapability(capability)) return rejection("CAPABILITY_INVALID");
    if (this.#generation >= Number.MAX_SAFE_INTEGER) return rejection("GENERATION_INVALID");
    this.#generation += 1;
    this.#binding = {
      capability,
      generation: this.#generation,
      frame: context.frame,
      nextSequence: this.#initialSequence,
      inFlight: false,
    };
    return Object.freeze({
      accepted: true,
      transportVersion: 1,
      generation: this.#generation,
      capability,
    });
  }

  invalidate(): void {
    this.#binding = null;
  }

  async qualifyBoundNegativeMatrix(
    context: ApplicationVersionRouteContext,
    alternate: { readonly window: object; readonly webContents: object; readonly frame: object },
  ): Promise<readonly Readonly<{ id: string; code: ApplicationVersionTransportRejectionCode }>[]> {
    const binding = this.#binding;
    if (binding === null)
      return Object.freeze([{ id: "matrix-binding", code: "CAPABILITY_STALE" }]);
    const queryResult = createApplicationVersionQuery("urn:rsrender:bld-012:packaged-matrix");
    if (!queryResult.accepted) throw new Error("PACKAGED_MATRIX_QUERY_INVARIANT");
    const exact = buildApplicationVersionTransportRequest({
      capability: binding.capability,
      generation: binding.generation,
      sequence: binding.nextSequence,
      query: queryResult.value,
    });
    const cases: readonly Readonly<{
      id: string;
      context: ApplicationVersionRouteContext;
      input: unknown;
    }>[] = [
      {
        id: "REPLAY",
        context,
        input: { ...exact, sequence: binding.nextSequence - 1 },
      },
      { id: "MALFORMED_RAW_ENVELOPE", context, input: { ...exact, extra: true } },
      {
        id: "CROSS_WINDOW",
        context: {
          ...context,
          window: alternate.window,
          webContents: alternate.webContents,
          frame: alternate.frame,
          mainFrame: alternate.frame,
        },
        input: exact,
      },
      {
        id: "CROSS_SENDER",
        context: { ...context, webContents: alternate.webContents },
        input: exact,
      },
      {
        id: "CHILD_OR_UNBOUND_FRAME",
        context: { ...context, frame: alternate.frame },
        input: exact,
      },
      {
        id: "CROSS_ROUTE_QUERY",
        context: { ...context, url: `${APPLICATION_START_URL}?unexpected=1` },
        input: exact,
      },
      {
        id: "CROSS_ROUTE_FRAGMENT",
        context: { ...context, url: `${APPLICATION_START_URL}#unexpected` },
        input: exact,
      },
      { id: "CAPABILITY", context, input: { ...exact, capability: "b".repeat(64) } },
      { id: "GENERATION", context, input: { ...exact, generation: binding.generation + 1 } },
      {
        id: "QUERY_SCHEMA",
        context,
        input: { ...exact, query: { ...queryResult.value, extra: true } },
      },
    ];
    const results = [];
    for (const item of cases) {
      const result = await this.handle(item.context, item.input);
      if (result.accepted) throw new Error(`PACKAGED_MATRIX_UNEXPECTED_ACCEPT:${item.id}`);
      results.push(Object.freeze({ id: item.id, code: result.code }));
    }
    return Object.freeze(results);
  }

  async handle(
    context: ApplicationVersionRouteContext,
    input: unknown,
  ): Promise<ApplicationVersionTransportResult> {
    const binding = this.#binding;
    if (binding === null) return rejection("CAPABILITY_STALE");
    const contextFailure = this.#validateContext(context, binding.frame);
    if (contextFailure !== null) return rejection(contextFailure);

    const capability = ownDataValue(input, "capability");
    if (capability !== binding.capability) return rejection("CAPABILITY_INVALID");
    const generation = ownDataValue(input, "generation");
    if (generation !== binding.generation) return rejection("GENERATION_INVALID");

    const record = ownDataRecord(input, [
      "transportVersion",
      "messageType",
      "capability",
      "generation",
      "sequence",
      "query",
    ]);
    if (record === null) return rejection("TRANSPORT_MALFORMED");
    if (record["transportVersion"] !== 1) {
      return rejection("TRANSPORT_UNSUPPORTED_VERSION");
    }
    if (record["messageType"] !== "application-version-query") {
      return rejection("TRANSPORT_MALFORMED");
    }
    if (!isPositiveSafeInteger(record["sequence"])) return rejection("SEQUENCE_INVALID");
    if (record["sequence"] !== binding.nextSequence) return rejection("SEQUENCE_REPLAYED");
    if (binding.nextSequence >= Number.MAX_SAFE_INTEGER) {
      return rejection("SEQUENCE_EXHAUSTED");
    }
    if (binding.inFlight) return rejection("QUERY_IN_FLIGHT");
    const query = validateApplicationVersionQuery(record["query"]);
    if (!query.accepted) return rejection("QUERY_SCHEMA_INVALID");

    const acceptedSequence = binding.nextSequence;
    binding.nextSequence += 1;
    binding.inFlight = true;
    let rawResult: unknown;
    try {
      rawResult = await this.#service.query(query.value);
    } catch {
      return rejection("SERVICE_RESULT_INVALID");
    } finally {
      binding.inFlight = false;
    }
    if (this.#binding !== binding) return rejection("CAPABILITY_STALE");
    const result = validateApplicationVersionResult(rawResult);
    if (!result.accepted || result.value.requestId !== query.value.requestId) {
      return rejection("SERVICE_RESULT_INVALID");
    }
    return Object.freeze({
      accepted: true,
      transportVersion: 1,
      generation: binding.generation,
      sequence: acceptedSequence,
      result: result.value,
    });
  }

  #validateContext(
    context: ApplicationVersionRouteContext,
    boundFrame: object | null,
  ): ApplicationVersionTransportRejectionCode | null {
    if (!context.windowLive || !context.webContentsLive) return "WINDOW_NOT_LIVE";
    if (context.window !== this.#expectedWindow) return "CROSS_WINDOW";
    if (context.webContents !== this.#expectedWebContents) return "SENDER_INVALID";
    if (context.frame === null || context.frame !== context.mainFrame) return "FRAME_INVALID";
    if (boundFrame !== null && context.frame !== boundFrame) return "FRAME_INVALID";
    if (!exactApplicationStartUrl(context.url)) return "ORIGIN_ROUTE_INVALID";
    return null;
  }
}

export function buildApplicationVersionTransportRequest(input: {
  readonly capability: string;
  readonly generation: number;
  readonly sequence: number;
  readonly query: ApplicationVersionQuery;
}): Readonly<Record<string, unknown>> {
  return Object.freeze({
    transportVersion: 1,
    messageType: "application-version-query",
    capability: input.capability,
    generation: input.generation,
    sequence: input.sequence,
    query: input.query,
  });
}
