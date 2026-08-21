import { DOCUMENT_ROUTE_URL } from "./document-route-contract.js";
import type { DocumentRouteContext } from "./document-route-broker.js";
import type { BoringLogPublicationOutcome } from "./boring-log-publication-route-contract.js";

export type BoringLogPublicationRouteRejectionCode =
  | "PUBLICATION_ROUTE_UNAVAILABLE"
  | "PUBLICATION_ROUTE_CONTEXT_INVALID"
  | "PUBLICATION_ROUTE_CAPABILITY_INVALID"
  | "PUBLICATION_ROUTE_GENERATION_INVALID"
  | "PUBLICATION_ROUTE_SEQUENCE_INVALID"
  | "PUBLICATION_ROUTE_DOCUMENT_INVALID"
  | "PUBLICATION_ROUTE_ARGUMENT_INVALID"
  | "PUBLICATION_ROUTE_IN_FLIGHT"
  | "PUBLICATION_ROUTE_RESULT_INVALID";

export type BoringLogPublicationBootstrapResult =
  | {
      readonly accepted: true;
      readonly transportVersion: 1;
      readonly generation: number;
      readonly capability: string;
      readonly documentIdentity: string;
      readonly ownerGeneration: number;
    }
  | { readonly accepted: false; readonly code: BoringLogPublicationRouteRejectionCode };

export type BoringLogPublicationRouteResult =
  | {
      readonly accepted: true;
      readonly transportVersion: 1;
      readonly generation: number;
      readonly sequence: number;
      readonly result: BoringLogPublicationOutcome;
    }
  | { readonly accepted: false; readonly code: BoringLogPublicationRouteRejectionCode };

type DataRecord = Readonly<Record<string, unknown>>;
type Binding = {
  readonly capability: string;
  readonly generation: number;
  readonly frame: object;
  nextSequence: number;
  inFlight: boolean;
};

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
    return Object.freeze(
      Object.fromEntries(
        fields.map((field) => {
          const descriptor = Object.getOwnPropertyDescriptor(input, field);
          if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
            throw new Error("FIELD");
          }
          return [field, descriptor.value];
        }),
      ),
    );
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

function validDigest(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value);
}

function validOutcome(input: unknown): input is BoringLogPublicationOutcome {
  const tagged = exactRecord(
    input,
    exactRecord(input, ["accepted", "code"]) === null
      ? [
          "accepted",
          "code",
          "workingRevision",
          "sceneInputDigest",
          "sceneDigest",
          "projectionDigest",
          "pdfDigest",
          "pdfBytes",
          "pageCount",
          "pageSizes",
          "destinationPath",
          "taggedPdfTarget",
          "vectorTextTarget",
        ]
      : ["accepted", "code"],
  );
  if (tagged === null) return false;
  if (tagged["accepted"] === false) {
    return [
      "EXPORT_CANCELLED",
      "EXPORT_STALE_SCENE",
      "EXPORT_PROJECTION_REJECTED",
      "EXPORT_LAYOUT_HOST_FAILED",
      "EXPORT_PDF_ENVELOPE_INVALID",
      "EXPORT_DESTINATION_EXISTS",
      "EXPORT_DESTINATION_FAILED",
      "EXPORT_FINAL_VERIFY_FAILED",
    ].includes(String(tagged["code"]));
  }
  if (
    tagged["accepted"] !== true ||
    tagged["code"] !== "EXPORT_VERIFIED_SUCCESS" ||
    !Number.isSafeInteger(tagged["workingRevision"]) ||
    (tagged["workingRevision"] as number) < 0 ||
    !validDigest(tagged["sceneInputDigest"]) ||
    !validDigest(tagged["sceneDigest"]) ||
    !validDigest(tagged["projectionDigest"]) ||
    !validDigest(tagged["pdfDigest"]) ||
    !Number.isSafeInteger(tagged["pdfBytes"]) ||
    (tagged["pdfBytes"] as number) < 1 ||
    (tagged["pdfBytes"] as number) > 52_428_800 ||
    tagged["pageCount"] !== 1 ||
    !Array.isArray(tagged["pageSizes"]) ||
    tagged["pageSizes"].length !== 1 ||
    typeof tagged["destinationPath"] !== "string" ||
    tagged["destinationPath"].length < 1 ||
    tagged["destinationPath"].length > 1_024 ||
    tagged["taggedPdfTarget"] !== true ||
    tagged["vectorTextTarget"] !== true
  ) {
    return false;
  }
  const size = exactRecord(tagged["pageSizes"][0], ["widthMpt", "heightMpt"]);
  return (
    size !== null &&
    Number.isSafeInteger(size["widthMpt"]) &&
    (size["widthMpt"] as number) > 0 &&
    Number.isSafeInteger(size["heightMpt"]) &&
    (size["heightMpt"] as number) > 0
  );
}

function rejected(code: BoringLogPublicationRouteRejectionCode): BoringLogPublicationRouteResult {
  return Object.freeze({ accepted: false, code });
}

export class BoringLogPdfPublicationRouteBroker {
  readonly #expectedWindow: object;
  readonly #expectedWebContents: object;
  readonly #documentIdentity: string;
  readonly #ownerGeneration: number;
  readonly #createCapability: () => string;
  readonly #exportPdf: (input: {
    readonly expectedWorkingRevision: number;
    readonly expectedSceneInputDigest: string;
  }) => Promise<BoringLogPublicationOutcome>;
  #generation = 0;
  #binding: Binding | null = null;

  public constructor(input: {
    readonly expectedWindow: object;
    readonly expectedWebContents: object;
    readonly documentIdentity: string;
    readonly ownerGeneration: number;
    readonly createCapability: () => string;
    readonly exportPdf: (input: {
      readonly expectedWorkingRevision: number;
      readonly expectedSceneInputDigest: string;
    }) => Promise<BoringLogPublicationOutcome>;
  }) {
    this.#expectedWindow = input.expectedWindow;
    this.#expectedWebContents = input.expectedWebContents;
    this.#documentIdentity = input.documentIdentity;
    this.#ownerGeneration = input.ownerGeneration;
    this.#createCapability = input.createCapability;
    this.#exportPdf = input.exportPdf;
  }

  public bootstrap(context: DocumentRouteContext): BoringLogPublicationBootstrapResult {
    if (!validContext(context, this.#expectedWindow, this.#expectedWebContents, null)) {
      return Object.freeze({ accepted: false, code: "PUBLICATION_ROUTE_CONTEXT_INVALID" });
    }
    if (
      this.#binding !== null ||
      context.frame === null ||
      this.#generation >= Number.MAX_SAFE_INTEGER
    ) {
      return Object.freeze({ accepted: false, code: "PUBLICATION_ROUTE_UNAVAILABLE" });
    }
    let capability: string;
    try {
      capability = this.#createCapability();
    } catch {
      return Object.freeze({ accepted: false, code: "PUBLICATION_ROUTE_CAPABILITY_INVALID" });
    }
    if (!/^[0-9a-f]{64}$/u.test(capability)) {
      return Object.freeze({ accepted: false, code: "PUBLICATION_ROUTE_CAPABILITY_INVALID" });
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

  public async exportPdf(
    context: DocumentRouteContext,
    input: unknown,
  ): Promise<BoringLogPublicationRouteResult> {
    const binding = this.#binding;
    if (
      !validContext(
        context,
        this.#expectedWindow,
        this.#expectedWebContents,
        binding?.frame ?? null,
      )
    ) {
      return rejected("PUBLICATION_ROUTE_CONTEXT_INVALID");
    }
    if (binding === null) return rejected("PUBLICATION_ROUTE_UNAVAILABLE");
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
      return rejected("PUBLICATION_ROUTE_ARGUMENT_INVALID");
    }
    if (request["capability"] !== binding.capability) {
      return rejected("PUBLICATION_ROUTE_CAPABILITY_INVALID");
    }
    if (request["generation"] !== binding.generation) {
      return rejected("PUBLICATION_ROUTE_GENERATION_INVALID");
    }
    if (
      request["documentIdentity"] !== this.#documentIdentity ||
      request["ownerGeneration"] !== this.#ownerGeneration
    ) {
      return rejected("PUBLICATION_ROUTE_DOCUMENT_INVALID");
    }
    if (
      !Number.isSafeInteger(request["sequence"]) ||
      request["sequence"] !== binding.nextSequence ||
      binding.nextSequence >= Number.MAX_SAFE_INTEGER
    ) {
      return rejected("PUBLICATION_ROUTE_SEQUENCE_INVALID");
    }
    const args = exactRecord(request["args"], [
      "expectedWorkingRevision",
      "expectedSceneInputDigest",
    ]);
    if (
      args === null ||
      !Number.isSafeInteger(args["expectedWorkingRevision"]) ||
      (args["expectedWorkingRevision"] as number) < 0 ||
      !validDigest(args["expectedSceneInputDigest"])
    ) {
      return rejected("PUBLICATION_ROUTE_ARGUMENT_INVALID");
    }
    if (binding.inFlight) return rejected("PUBLICATION_ROUTE_IN_FLIGHT");
    binding.inFlight = true;
    const sequence = binding.nextSequence;
    binding.nextSequence += 1;
    let result: BoringLogPublicationOutcome;
    try {
      result = await this.#exportPdf({
        expectedWorkingRevision: args["expectedWorkingRevision"] as number,
        expectedSceneInputDigest: args["expectedSceneInputDigest"],
      });
    } catch {
      return rejected("PUBLICATION_ROUTE_RESULT_INVALID");
    } finally {
      binding.inFlight = false;
    }
    if (this.#binding !== binding || !validOutcome(result)) {
      return rejected("PUBLICATION_ROUTE_RESULT_INVALID");
    }
    return Object.freeze({
      accepted: true,
      transportVersion: 1,
      generation: binding.generation,
      sequence,
      result,
    });
  }
}
