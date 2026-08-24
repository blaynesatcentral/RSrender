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
  readonly applyScope:
    "occurrence" | "all-selected" | "column-default" | "named-style" | "template-default";
  readonly propertyMask?: readonly (
    | "fontFamilyId"
    | "fontSizeMpt"
    | "fontWeight"
    | "lineHeightMpt"
    | "letterSpacingMpt"
    | "wordSpacingMpt"
    | "paragraphSpacingMpt"
    | "color"
    | "textDecoration"
  )[];
  readonly occurrenceNodeId: string;
  readonly semanticId: string;
  readonly baseStyleId: string;
  readonly targets: readonly Readonly<{
    readonly occurrenceNodeId: string;
    readonly semanticId: string;
    readonly baseStyleId: string;
  }>[];
  readonly fontFamilyId: string;
  readonly fontSizeMpt: number;
  readonly fontWeight: number;
  readonly lineHeightMpt: number;
  readonly letterSpacingMpt: number;
  readonly wordSpacingMpt: number;
  readonly paragraphSpacingMpt: number;
  readonly color: string;
  readonly textDecoration: "none" | "underline" | "line-through" | "underline line-through";
  readonly layout: {
    readonly frame: {
      readonly xMpt: number;
      readonly yMpt: number;
      readonly widthMpt: number;
      readonly heightMpt: number;
    };
    readonly frameAnchor:
      | "top-left"
      | "top-center"
      | "top-right"
      | "center-left"
      | "center"
      | "center-right"
      | "bottom-left"
      | "bottom-center"
      | "bottom-right";
    readonly paddingMpt: {
      readonly topMpt: number;
      readonly rightMpt: number;
      readonly bottomMpt: number;
      readonly leftMpt: number;
    };
    readonly horizontalAlignment: "start" | "center" | "end";
    readonly verticalAlignment: "top" | "middle" | "bottom";
    readonly wrapPolicy: "word-v1" | "no-wrap";
    readonly overflowPolicy: "clip-with-diagnostic" | "shrink-to-minimum";
    readonly minimumFontSizeMpt?: number;
    readonly frameFillColor: string | null;
    readonly frameStrokeColor: string | null;
    readonly frameStrokeWidthMpt: number;
    readonly rotationMilliDegrees: number;
    readonly positionMode: "depth-bound" | "free";
  };
  readonly locked: boolean;
}

export interface BoringLogStudioTextOccurrencePresentationResetInput {
  readonly expectedWorkingRevision: number;
  readonly occurrenceNodeId: string;
  readonly semanticId: string;
}

export interface BoringLogStudioPageGuidesInput {
  readonly expectedWorkingRevision: number;
  readonly mutation:
    | Readonly<{
        readonly kind: "add";
        readonly orientation: "horizontal" | "vertical";
        readonly positionMpt: number;
      }>
    | Readonly<{ readonly kind: "move"; readonly guideId: string; readonly positionMpt: number }>
    | Readonly<{ readonly kind: "delete"; readonly guideId: string }>
    | Readonly<{ readonly kind: "set-locked"; readonly guideId: string; readonly locked: boolean }>;
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
  readonly #resetTextOccurrencePresentation: (
    input: BoringLogStudioTextOccurrencePresentationResetInput,
  ) => Promise<unknown>;
  readonly #setPageGuides: (input: BoringLogStudioPageGuidesInput) => Promise<unknown>;
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
    readonly resetTextOccurrencePresentation?: (
      input: BoringLogStudioTextOccurrencePresentationResetInput,
    ) => Promise<unknown>;
    readonly setPageGuides?: (input: BoringLogStudioPageGuidesInput) => Promise<unknown>;
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
    this.#resetTextOccurrencePresentation =
      input.resetTextOccurrencePresentation ??
      (() =>
        Promise.resolve(
          Object.freeze({ accepted: false, code: "TEXT_OCCURRENCE_RESET_UNAVAILABLE" }),
        ));
    this.#setPageGuides =
      input.setPageGuides ??
      (() => Promise.resolve(Object.freeze({ accepted: false, code: "PAGE_GUIDES_UNAVAILABLE" })));
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
    const requestArgs = request["args"];
    const hasPropertyMask =
      typeof requestArgs === "object" &&
      requestArgs !== null &&
      Object.hasOwn(requestArgs, "propertyMask");
    const args = exactRecord(requestArgs, [
      "expectedWorkingRevision",
      "applyScope",
      ...(hasPropertyMask ? ["propertyMask"] : []),
      "occurrenceNodeId",
      "semanticId",
      "baseStyleId",
      "targets",
      "fontFamilyId",
      "fontSizeMpt",
      "fontWeight",
      "lineHeightMpt",
      "letterSpacingMpt",
      "wordSpacingMpt",
      "paragraphSpacingMpt",
      "color",
      "textDecoration",
      "layout",
      "locked",
    ]);
    const hasMinimumFontSize =
      args !== null &&
      typeof args["layout"] === "object" &&
      args["layout"] !== null &&
      Object.hasOwn(args["layout"], "minimumFontSizeMpt");
    const layout =
      args === null
        ? null
        : exactRecord(args["layout"], [
            "frame",
            "frameAnchor",
            "paddingMpt",
            "horizontalAlignment",
            "verticalAlignment",
            "wrapPolicy",
            "overflowPolicy",
            ...(hasMinimumFontSize ? ["minimumFontSizeMpt"] : []),
            "frameFillColor",
            "frameStrokeColor",
            "frameStrokeWidthMpt",
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
    const targets =
      args !== null && Array.isArray(args["targets"])
        ? args["targets"].map((target) =>
            exactRecord(target, ["occurrenceNodeId", "semanticId", "baseStyleId"]),
          )
        : null;
    if (
      args === null ||
      !Number.isSafeInteger(args["expectedWorkingRevision"]) ||
      (args["expectedWorkingRevision"] as number) < 0 ||
      !["occurrence", "all-selected", "column-default", "named-style", "template-default"].includes(
        String(args["applyScope"]),
      ) ||
      (args["applyScope"] === "template-default" &&
        (!Array.isArray(args["propertyMask"]) ||
          args["propertyMask"].length < 1 ||
          args["propertyMask"].length > 9 ||
          args["propertyMask"].some(
            (property) =>
              ![
                "fontFamilyId",
                "fontSizeMpt",
                "fontWeight",
                "lineHeightMpt",
                "letterSpacingMpt",
                "wordSpacingMpt",
                "paragraphSpacingMpt",
                "color",
                "textDecoration",
              ].includes(String(property)),
          ) ||
          new Set(args["propertyMask"]).size !== args["propertyMask"].length)) ||
      (args["applyScope"] !== "template-default" && hasPropertyMask) ||
      !boundedText(args["occurrenceNodeId"]) ||
      !boundedText(args["semanticId"]) ||
      !boundedText(args["baseStyleId"]) ||
      targets === null ||
      targets.length < 1 ||
      targets.length > 64 ||
      targets.some(
        (target) =>
          target === null ||
          !boundedText(target["occurrenceNodeId"]) ||
          !boundedText(target["semanticId"]) ||
          !boundedText(target["baseStyleId"]),
      ) ||
      new Set(targets.map((target) => target!["occurrenceNodeId"])).size !== targets.length ||
      targets[0]?.["occurrenceNodeId"] !== args["occurrenceNodeId"] ||
      targets[0]?.["semanticId"] !== args["semanticId"] ||
      targets[0]?.["baseStyleId"] !== args["baseStyleId"] ||
      (args["applyScope"] === "all-selected" && targets.length < 2) ||
      (args["applyScope"] !== "all-selected" && targets.length !== 1) ||
      !boundedText(args["fontFamilyId"]) ||
      !Number.isSafeInteger(args["fontSizeMpt"]) ||
      (args["fontSizeMpt"] as number) < 1 ||
      ![400, 700].includes(Number(args["fontWeight"])) ||
      !Number.isSafeInteger(args["lineHeightMpt"]) ||
      (args["lineHeightMpt"] as number) < 1 ||
      !Number.isSafeInteger(args["letterSpacingMpt"]) ||
      (args["letterSpacingMpt"] as number) < -2_000 ||
      (args["letterSpacingMpt"] as number) > 12_000 ||
      !Number.isSafeInteger(args["wordSpacingMpt"]) ||
      (args["wordSpacingMpt"] as number) < -2_000 ||
      (args["wordSpacingMpt"] as number) > 24_000 ||
      !Number.isSafeInteger(args["paragraphSpacingMpt"]) ||
      (args["paragraphSpacingMpt"] as number) < 0 ||
      (args["paragraphSpacingMpt"] as number) > 72_000 ||
      !boundedText(args["color"]) ||
      !["none", "underline", "line-through", "underline line-through"].includes(
        String(args["textDecoration"]),
      ) ||
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
      ![
        "top-left",
        "top-center",
        "top-right",
        "center-left",
        "center",
        "center-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ].includes(String(layout["frameAnchor"])) ||
      !["start", "center", "end"].includes(String(layout["horizontalAlignment"])) ||
      !["top", "middle", "bottom"].includes(String(layout["verticalAlignment"])) ||
      !["word-v1", "no-wrap"].includes(String(layout["wrapPolicy"])) ||
      !["clip-with-diagnostic", "shrink-to-minimum"].includes(String(layout["overflowPolicy"])) ||
      (layout["overflowPolicy"] === "shrink-to-minimum" && !hasMinimumFontSize) ||
      (hasMinimumFontSize &&
        (!Number.isSafeInteger(layout["minimumFontSizeMpt"]) ||
          (layout["minimumFontSizeMpt"] as number) < 1 ||
          (layout["minimumFontSizeMpt"] as number) > (args["fontSizeMpt"] as number))) ||
      (layout["frameFillColor"] !== null &&
        (typeof layout["frameFillColor"] !== "string" ||
          !/^#[0-9a-f]{6}$/iu.test(layout["frameFillColor"]))) ||
      (layout["frameStrokeColor"] !== null &&
        (typeof layout["frameStrokeColor"] !== "string" ||
          !/^#[0-9a-f]{6}$/iu.test(layout["frameStrokeColor"]))) ||
      !Number.isSafeInteger(layout["frameStrokeWidthMpt"]) ||
      (layout["frameStrokeWidthMpt"] as number) < 0 ||
      (layout["frameStrokeWidthMpt"] as number) > 12_000 ||
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

  public async resetTextOccurrencePresentation(
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
    ]);
    const boundedText = (value: unknown): value is string =>
      typeof value === "string" && value.length > 0 && value.length <= 512;
    if (
      args === null ||
      !Number.isSafeInteger(args["expectedWorkingRevision"]) ||
      (args["expectedWorkingRevision"] as number) < 0 ||
      !boundedText(args["occurrenceNodeId"]) ||
      !boundedText(args["semanticId"])
    ) {
      return lifecycleRejected("STUDIO_ROUTE_ARGUMENT_INVALID");
    }
    if (binding.inFlight) return lifecycleRejected("STUDIO_ROUTE_IN_FLIGHT");
    binding.inFlight = true;
    const sequence = binding.nextSequence;
    binding.nextSequence += 1;
    try {
      const result = await this.#resetTextOccurrencePresentation(
        args as unknown as BoringLogStudioTextOccurrencePresentationResetInput,
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

  public async setPageGuides(
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
    const args = exactRecord(request["args"], ["expectedWorkingRevision", "mutation"]);
    const mutationRecord =
      args === null || typeof args["mutation"] !== "object" || args["mutation"] === null
        ? null
        : (args["mutation"] as DataRecord);
    const mutationKind = mutationRecord?.["kind"];
    const mutation =
      mutationKind === "add"
        ? exactRecord(mutationRecord, ["kind", "orientation", "positionMpt"])
        : mutationKind === "move"
          ? exactRecord(mutationRecord, ["kind", "guideId", "positionMpt"])
          : mutationKind === "delete"
            ? exactRecord(mutationRecord, ["kind", "guideId"])
            : mutationKind === "set-locked"
              ? exactRecord(mutationRecord, ["kind", "guideId", "locked"])
              : null;
    const boundedGuideId =
      mutation !== null &&
      typeof mutation["guideId"] === "string" &&
      mutation["guideId"].length >= 1 &&
      mutation["guideId"].length <= 128;
    if (
      args === null ||
      !Number.isSafeInteger(args["expectedWorkingRevision"]) ||
      (args["expectedWorkingRevision"] as number) < 0 ||
      mutation === null ||
      (mutationKind === "add" &&
        (!["horizontal", "vertical"].includes(String(mutation["orientation"])) ||
          !Number.isSafeInteger(mutation["positionMpt"]) ||
          (mutation["positionMpt"] as number) < 0)) ||
      (mutationKind === "move" &&
        (!boundedGuideId ||
          !Number.isSafeInteger(mutation["positionMpt"]) ||
          (mutation["positionMpt"] as number) < 0)) ||
      ((mutationKind === "delete" || mutationKind === "set-locked") && !boundedGuideId) ||
      (mutationKind === "set-locked" && typeof mutation["locked"] !== "boolean")
    ) {
      return lifecycleRejected("STUDIO_ROUTE_ARGUMENT_INVALID");
    }
    if (binding.inFlight) return lifecycleRejected("STUDIO_ROUTE_IN_FLIGHT");
    binding.inFlight = true;
    const sequence = binding.nextSequence;
    binding.nextSequence += 1;
    try {
      const result = await this.#setPageGuides(args as unknown as BoringLogStudioPageGuidesInput);
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
