import type { BoringLogStudioProjectionResult } from "./boring-log-studio-projection.js";
import { DOCUMENT_ROUTE_URL } from "./document-route-contract.js";
import type { DocumentRouteContext } from "./document-route-broker.js";

export type BoringLogStudioRouteRejectionCode =
  | "STUDIO_ROUTE_UNAVAILABLE"
  | "STUDIO_ROUTE_CONTEXT_INVALID"
  | "STUDIO_ROUTE_CAPABILITY_INVALID"
  | "STUDIO_ROUTE_GENERATION_INVALID"
  | "STUDIO_ROUTE_SEQUENCE_INVALID"
  | "STUDIO_ROUTE_DOCUMENT_INVALID"
  | "STUDIO_ROUTE_ARGUMENT_INVALID"
  | "STUDIO_ROUTE_IN_FLIGHT"
  | "STUDIO_ROUTE_RESULT_INVALID";

export type BoringLogStudioRouteBootstrapResult =
  | {
      readonly accepted: true;
      readonly transportVersion: 1;
      readonly generation: number;
      readonly capability: string;
      readonly documentIdentity: string;
      readonly ownerGeneration: number;
    }
  | { readonly accepted: false; readonly code: BoringLogStudioRouteRejectionCode };

export type BoringLogStudioRouteResult =
  | {
      readonly accepted: true;
      readonly transportVersion: 1;
      readonly generation: number;
      readonly sequence: number;
      readonly projection: Extract<
        BoringLogStudioProjectionResult,
        { readonly accepted: true }
      >["projection"];
    }
  | { readonly accepted: false; readonly code: BoringLogStudioRouteRejectionCode };

export type BoringLogStudioLifecycleOperation =
  | "get-state"
  | "new-project"
  | "open-project"
  | "save-project"
  | "save-project-as"
  | "first-boring"
  | "previous-boring"
  | "next-boring"
  | "last-boring";

export type BoringLogStudioLifecycleResult =
  | {
      readonly accepted: true;
      readonly transportVersion: 1;
      readonly generation: number;
      readonly sequence: number;
      readonly result: unknown;
    }
  | { readonly accepted: false; readonly code: BoringLogStudioRouteRejectionCode };

export interface BoringLogStudioTextOccurrenceStyleInput {
  readonly expectedWorkingRevision: number;
  readonly occurrenceNodeId: string;
  readonly semanticId: string;
  readonly baseStyleId: string;
  readonly fontFamilyId: string;
  readonly fontSizeMpt: number;
  readonly fontWeight: number;
  readonly lineHeightMpt: number;
  readonly color: string;
  readonly layout: {
    readonly frame: {
      readonly xMpt: number;
      readonly yMpt: number;
      readonly widthMpt: number;
      readonly heightMpt: number;
    };
    readonly paddingMpt: {
      readonly topMpt: number;
      readonly rightMpt: number;
      readonly bottomMpt: number;
      readonly leftMpt: number;
    };
    readonly horizontalAlignment: "start" | "center" | "end";
    readonly verticalAlignment: "top" | "middle" | "bottom";
    readonly wrapPolicy: "word-v1" | "no-wrap";
    readonly overflowPolicy: "clip-with-diagnostic";
    readonly rotationMilliDegrees: number;
    readonly positionMode: "depth-bound" | "free";
  };
  readonly locked: boolean;
}

type DataRecord = Readonly<Record<string, unknown>>;
type Binding = {
  readonly capability: string;
  readonly generation: number;
  readonly frame: object;
  nextSequence: number;
  inFlight: boolean;
};

function rejected(code: BoringLogStudioRouteRejectionCode): BoringLogStudioRouteResult {
  return Object.freeze({ accepted: false, code });
}

function lifecycleRejected(
  code: BoringLogStudioRouteRejectionCode,
): BoringLogStudioLifecycleResult {
  return Object.freeze({ accepted: false, code });
}

function exactRecord(input: unknown, fields: readonly string[]): DataRecord | null {
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
    const entries: Array<readonly [string, unknown]> = [];
    for (const field of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(input, field);
      if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable)
        return null;
      entries.push([field, descriptor.value]);
    }
    return Object.freeze(Object.fromEntries(entries));
  } catch {
    return null;
  }
}

function validContext(
  context: DocumentRouteContext,
  expectedWindow: object,
  expectedWebContents: object,
  boundFrame: object | null,
): boolean {
  return (
    context.windowLive &&
    context.webContentsLive &&
    context.window === expectedWindow &&
    context.webContents === expectedWebContents &&
    context.frame !== null &&
    context.frame === context.mainFrame &&
    (boundFrame === null || context.frame === boundFrame) &&
    context.url === DOCUMENT_ROUTE_URL
  );
}

function boundedProjection(input: unknown): boolean {
  try {
    const json = JSON.stringify(input);
    return (
      typeof json === "string" &&
      new TextEncoder().encode(json).byteLength <= 1_048_576 &&
      !json.includes('"kind":"image"') &&
      !json.includes('"kind":"raster"')
    );
  } catch {
    return false;
  }
}

export class BoringLogStudioRouteBroker {
  readonly #expectedWindow: object;
  readonly #expectedWebContents: object;
  readonly #documentIdentity: string;
  readonly #ownerGeneration: number;
  readonly #createCapability: () => string;
  readonly #getProjection: (
    minimumWorkingRevision: number | null,
  ) => Promise<BoringLogStudioProjectionResult>;
  readonly #lifecycle: (input: {
    readonly operation: BoringLogStudioLifecycleOperation;
    readonly expectedWorkingRevision: number | null;
  }) => Promise<unknown>;
  readonly #setTextOccurrenceStyle: (
    input: BoringLogStudioTextOccurrenceStyleInput,
  ) => Promise<unknown>;
  #generation = 0;
  #binding: Binding | null = null;

  public constructor(input: {
    readonly expectedWindow: object;
    readonly expectedWebContents: object;
    readonly documentIdentity: string;
    readonly ownerGeneration: number;
    readonly createCapability: () => string;
    readonly getProjection: (
      minimumWorkingRevision: number | null,
    ) => Promise<BoringLogStudioProjectionResult>;
    readonly lifecycle?: (input: {
      readonly operation: BoringLogStudioLifecycleOperation;
      readonly expectedWorkingRevision: number | null;
    }) => Promise<unknown>;
    readonly setTextOccurrenceStyle?: (
      input: BoringLogStudioTextOccurrenceStyleInput,
    ) => Promise<unknown>;
  }) {
    this.#expectedWindow = input.expectedWindow;
    this.#expectedWebContents = input.expectedWebContents;
    this.#documentIdentity = input.documentIdentity;
    this.#ownerGeneration = input.ownerGeneration;
    this.#createCapability = input.createCapability;
    this.#getProjection = input.getProjection;
    this.#lifecycle =
      input.lifecycle ??
      (() =>
        Promise.resolve(
          Object.freeze({
            accepted: false,
            code: "PROJECT_LIFECYCLE_UNAVAILABLE",
          }),
        ));
    this.#setTextOccurrenceStyle =
      input.setTextOccurrenceStyle ??
      (() =>
        Promise.resolve(
          Object.freeze({ accepted: false, code: "TEXT_OCCURRENCE_STYLE_UNAVAILABLE" }),
        ));
  }

  public bootstrap(context: DocumentRouteContext): BoringLogStudioRouteBootstrapResult {
    if (!validContext(context, this.#expectedWindow, this.#expectedWebContents, null)) {
      return Object.freeze({ accepted: false, code: "STUDIO_ROUTE_CONTEXT_INVALID" });
    }
    if (
      this.#binding !== null ||
      context.frame === null ||
      this.#generation >= Number.MAX_SAFE_INTEGER
    ) {
      return Object.freeze({ accepted: false, code: "STUDIO_ROUTE_UNAVAILABLE" });
    }
    let capability: string;
    try {
      capability = this.#createCapability();
    } catch {
      return Object.freeze({ accepted: false, code: "STUDIO_ROUTE_CAPABILITY_INVALID" });
    }
    if (!/^[0-9a-f]{64}$/u.test(capability)) {
      return Object.freeze({ accepted: false, code: "STUDIO_ROUTE_CAPABILITY_INVALID" });
    }
    this.#generation += 1;
    this.#binding = {
      capability,
      generation: this.#generation,
      frame: context.frame,
      nextSequence: 1,
      inFlight: false,
    };
    return Object.freeze({
      accepted: true,
      transportVersion: 1,
      generation: this.#generation,
      capability,
      documentIdentity: this.#documentIdentity,
      ownerGeneration: this.#ownerGeneration,
    });
  }

  public invalidate(): void {
    this.#binding = null;
  }

  public async getProjection(
    context: DocumentRouteContext,
    input: unknown,
  ): Promise<BoringLogStudioRouteResult> {
    const binding = this.#binding;
    if (
      !validContext(
        context,
        this.#expectedWindow,
        this.#expectedWebContents,
        binding?.frame ?? null,
      )
    ) {
      return rejected("STUDIO_ROUTE_CONTEXT_INVALID");
    }
    if (binding === null) return rejected("STUDIO_ROUTE_UNAVAILABLE");
    const request = exactRecord(input, [
      "transportVersion",
      "capability",
      "generation",
      "sequence",
      "documentIdentity",
      "ownerGeneration",
      "args",
    ]);
    if (request === null || request["transportVersion"] !== 1) {
      return rejected("STUDIO_ROUTE_ARGUMENT_INVALID");
    }
    if (request["capability"] !== binding.capability) {
      return rejected("STUDIO_ROUTE_CAPABILITY_INVALID");
    }
    if (request["generation"] !== binding.generation) {
      return rejected("STUDIO_ROUTE_GENERATION_INVALID");
    }
    if (
      request["documentIdentity"] !== this.#documentIdentity ||
      request["ownerGeneration"] !== this.#ownerGeneration
    ) {
      return rejected("STUDIO_ROUTE_DOCUMENT_INVALID");
    }
    if (
      !Number.isSafeInteger(request["sequence"]) ||
      (request["sequence"] as number) !== binding.nextSequence ||
      binding.nextSequence >= Number.MAX_SAFE_INTEGER
    ) {
      return rejected("STUDIO_ROUTE_SEQUENCE_INVALID");
    }
    const args = exactRecord(request["args"], ["minimumWorkingRevision"]);
    const minimum = args?.["minimumWorkingRevision"];
    if (
      args === null ||
      (minimum !== null &&
        (typeof minimum !== "number" || !Number.isSafeInteger(minimum) || minimum < 0))
    ) {
      return rejected("STUDIO_ROUTE_ARGUMENT_INVALID");
    }
    if (binding.inFlight) return rejected("STUDIO_ROUTE_IN_FLIGHT");
    binding.inFlight = true;
    const sequence = binding.nextSequence;
    binding.nextSequence += 1;
    let result: BoringLogStudioProjectionResult;
    try {
      result = await this.#getProjection(minimum);
    } catch {
      return rejected("STUDIO_ROUTE_RESULT_INVALID");
    } finally {
      binding.inFlight = false;
    }
    if (
      this.#binding !== binding ||
      !result.accepted ||
      result.projection.documentIdentity !== this.#documentIdentity ||
      result.projection.ownerGeneration !== this.#ownerGeneration ||
      (minimum !== null && result.projection.workingRevision < minimum) ||
      !boundedProjection(result.projection)
    ) {
      return rejected("STUDIO_ROUTE_RESULT_INVALID");
    }
    return Object.freeze({
      accepted: true,
      transportVersion: 1,
      generation: binding.generation,
      sequence,
      projection: result.projection,
    });
  }

  public async lifecycle(
    context: DocumentRouteContext,
    input: unknown,
  ): Promise<BoringLogStudioLifecycleResult> {
    const binding = this.#binding;
    if (
      !validContext(
        context,
        this.#expectedWindow,
        this.#expectedWebContents,
        binding?.frame ?? null,
      )
    ) {
      return lifecycleRejected("STUDIO_ROUTE_CONTEXT_INVALID");
    }
    if (binding === null) return lifecycleRejected("STUDIO_ROUTE_UNAVAILABLE");
    const request = exactRecord(input, [
      "transportVersion",
      "capability",
      "generation",
      "sequence",
      "documentIdentity",
      "ownerGeneration",
      "args",
    ]);
    if (
      request === null ||
      request["transportVersion"] !== 1 ||
      request["capability"] !== binding.capability ||
      request["generation"] !== binding.generation ||
      request["documentIdentity"] !== this.#documentIdentity ||
      request["ownerGeneration"] !== this.#ownerGeneration ||
      !Number.isSafeInteger(request["sequence"]) ||
      request["sequence"] !== binding.nextSequence ||
      binding.nextSequence >= Number.MAX_SAFE_INTEGER
    )
      return lifecycleRejected("STUDIO_ROUTE_ARGUMENT_INVALID");
    const args = exactRecord(request["args"], ["operation", "expectedWorkingRevision"]);
    const operation = args?.["operation"];
    const expected = args?.["expectedWorkingRevision"];
    if (
      args === null ||
      ![
        "get-state",
        "new-project",
        "open-project",
        "save-project",
        "save-project-as",
        "first-boring",
        "previous-boring",
        "next-boring",
        "last-boring",
      ].includes(String(operation)) ||
      (expected !== null &&
        (typeof expected !== "number" || !Number.isSafeInteger(expected) || expected < 0))
    )
      return lifecycleRejected("STUDIO_ROUTE_ARGUMENT_INVALID");
    if (binding.inFlight) return lifecycleRejected("STUDIO_ROUTE_IN_FLIGHT");
    binding.inFlight = true;
    const sequence = binding.nextSequence;
    binding.nextSequence += 1;
    try {
      const result = await this.#lifecycle({
        operation: operation as BoringLogStudioLifecycleOperation,
        expectedWorkingRevision: expected,
      });
      if (this.#binding !== binding || !boundedProjection(result))
        return lifecycleRejected("STUDIO_ROUTE_RESULT_INVALID");
      return Object.freeze({
        accepted: true,
        transportVersion: 1,
        generation: binding.generation,
        sequence,
        result,
      });
    } catch {
      return lifecycleRejected("STUDIO_ROUTE_RESULT_INVALID");
    } finally {
      binding.inFlight = false;
    }
  }

  public async setTextOccurrenceStyle(
    context: DocumentRouteContext,
    input: unknown,
  ): Promise<BoringLogStudioLifecycleResult> {
    const binding = this.#binding;
    if (
      !validContext(
        context,
        this.#expectedWindow,
        this.#expectedWebContents,
        binding?.frame ?? null,
      )
    ) {
      return lifecycleRejected("STUDIO_ROUTE_CONTEXT_INVALID");
    }
    if (binding === null) return lifecycleRejected("STUDIO_ROUTE_UNAVAILABLE");
    const request = exactRecord(input, [
      "transportVersion",
      "capability",
      "generation",
      "sequence",
      "documentIdentity",
      "ownerGeneration",
      "args",
    ]);
    if (
      request === null ||
      request["transportVersion"] !== 1 ||
      request["capability"] !== binding.capability ||
      request["generation"] !== binding.generation ||
      request["documentIdentity"] !== this.#documentIdentity ||
      request["ownerGeneration"] !== this.#ownerGeneration ||
      !Number.isSafeInteger(request["sequence"]) ||
      request["sequence"] !== binding.nextSequence ||
      binding.nextSequence >= Number.MAX_SAFE_INTEGER
    ) {
      return lifecycleRejected("STUDIO_ROUTE_ARGUMENT_INVALID");
    }
    const args = exactRecord(request["args"], [
      "expectedWorkingRevision",
      "occurrenceNodeId",
      "semanticId",
      "baseStyleId",
      "fontFamilyId",
      "fontSizeMpt",
      "fontWeight",
      "lineHeightMpt",
      "color",
      "layout",
      "locked",
    ]);
    const layout =
      args === null
        ? null
        : exactRecord(args["layout"], [
            "frame",
            "paddingMpt",
            "horizontalAlignment",
            "verticalAlignment",
            "wrapPolicy",
            "overflowPolicy",
            "rotationMilliDegrees",
            "positionMode",
          ]);
    const frame =
      layout === null
        ? null
        : exactRecord(layout["frame"], ["xMpt", "yMpt", "widthMpt", "heightMpt"]);
    const padding =
      layout === null
        ? null
        : exactRecord(layout["paddingMpt"], ["topMpt", "rightMpt", "bottomMpt", "leftMpt"]);
    const boundedText = (value: unknown): value is string =>
      typeof value === "string" && value.length > 0 && value.length <= 512;
    if (
      args === null ||
      !Number.isSafeInteger(args["expectedWorkingRevision"]) ||
      (args["expectedWorkingRevision"] as number) < 0 ||
      !boundedText(args["occurrenceNodeId"]) ||
      !boundedText(args["semanticId"]) ||
      !boundedText(args["baseStyleId"]) ||
      !boundedText(args["fontFamilyId"]) ||
      !Number.isSafeInteger(args["fontSizeMpt"]) ||
      (args["fontSizeMpt"] as number) < 1 ||
      !Number.isSafeInteger(args["fontWeight"]) ||
      (args["fontWeight"] as number) < 1 ||
      (args["fontWeight"] as number) > 1_000 ||
      !Number.isSafeInteger(args["lineHeightMpt"]) ||
      (args["lineHeightMpt"] as number) < 1 ||
      !boundedText(args["color"]) ||
      layout === null ||
      frame === null ||
      padding === null ||
      !Object.values(frame).every(
        (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0,
      ) ||
      (frame["widthMpt"] as number) < 1 ||
      (frame["heightMpt"] as number) < 1 ||
      !Object.values(padding).every(
        (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0,
      ) ||
      !["start", "center", "end"].includes(String(layout["horizontalAlignment"])) ||
      !["top", "middle", "bottom"].includes(String(layout["verticalAlignment"])) ||
      !["word-v1", "no-wrap"].includes(String(layout["wrapPolicy"])) ||
      layout["overflowPolicy"] !== "clip-with-diagnostic" ||
      !Number.isSafeInteger(layout["rotationMilliDegrees"]) ||
      (layout["rotationMilliDegrees"] as number) < -180_000 ||
      (layout["rotationMilliDegrees"] as number) > 180_000 ||
      !["depth-bound", "free"].includes(String(layout["positionMode"])) ||
      typeof args["locked"] !== "boolean"
    ) {
      return lifecycleRejected("STUDIO_ROUTE_ARGUMENT_INVALID");
    }
    if (binding.inFlight) return lifecycleRejected("STUDIO_ROUTE_IN_FLIGHT");
    binding.inFlight = true;
    const sequence = binding.nextSequence;
    binding.nextSequence += 1;
    try {
      const result = await this.#setTextOccurrenceStyle(
        args as unknown as BoringLogStudioTextOccurrenceStyleInput,
      );
      if (this.#binding !== binding || !boundedProjection(result)) {
        return lifecycleRejected("STUDIO_ROUTE_RESULT_INVALID");
      }
      return Object.freeze({
        accepted: true,
        transportVersion: 1,
        generation: binding.generation,
        sequence,
        result,
      });
    } catch {
      return lifecycleRejected("STUDIO_ROUTE_RESULT_INVALID");
    } finally {
      binding.inFlight = false;
    }
  }
}
