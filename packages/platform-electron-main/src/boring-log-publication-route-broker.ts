import { DOCUMENT_ROUTE_URL } from "./document-route-contract.js";
import type { DocumentRouteContext } from "./document-route-broker.js";
import type {
  BoringLogPublicationIntent,
  BoringLogPublicationOutcome,
} from "./boring-log-publication-route-contract.js";

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
      readonly transportVersion: 2;
      readonly generation: number;
      readonly capability: string;
      readonly documentIdentity: string;
      readonly ownerGeneration: number;
    }
  | { readonly accepted: false; readonly code: BoringLogPublicationRouteRejectionCode };

export type BoringLogPublicationRouteResult =
  | {
      readonly accepted: true;
      readonly transportVersion: 2;
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

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const following = value.charCodeAt(index + 1);
      if (!(following >= 0xdc00 && following <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function validIdentity(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 512 &&
    isWellFormedUnicode(value)
  );
}

function hasExactArrayKeys(input: readonly unknown[]): boolean {
  const keys = Reflect.ownKeys(input);
  if (keys.length !== input.length + 1 || !keys.includes("length")) return false;
  return keys.every(
    (key) =>
      key === "length" ||
      (typeof key === "string" && /^(0|[1-9][0-9]*)$/u.test(key) && Number(key) < input.length),
  );
}

function strictIdentityList(input: unknown): readonly string[] | null {
  try {
    if (
      !Array.isArray(input) ||
      input.length < 1 ||
      input.length > 64 ||
      !hasExactArrayKeys(input)
    ) {
      return null;
    }
    const result: string[] = [];
    for (let index = 0; index < input.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        !descriptor.enumerable ||
        !validIdentity(descriptor.value)
      ) {
        return null;
      }
      result.push(descriptor.value);
    }
    return new Set(result).size === result.length ? Object.freeze(result) : null;
  } catch {
    return null;
  }
}

function validPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function validNonnegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function validPageManifest(
  input: unknown,
  orderedBoringLogIdentities: readonly string[],
  pageCount: number,
): boolean {
  if (!Array.isArray(input) || input.length !== pageCount || !hasExactArrayKeys(input)) {
    return false;
  }
  const observedBoringOrder: string[] = [];
  const pageIds = new Set<string>();
  const explorationByBoring = new Map<string, string>();
  const sourceOrdinalByBoring = new Map<string, number>();
  const nextPageIndexByBoring = new Map<string, number>();
  for (let packagePageIndex = 0; packagePageIndex < input.length; packagePageIndex += 1) {
    const page = exactRecord(input[packagePageIndex], [
      "packagePageIndex",
      "boringLogIdentity",
      "explorationIdentity",
      "sourceOrdinal",
      "boringPageIndex",
      "pageId",
      "widthMpt",
      "heightMpt",
      "sceneInputDigest",
    ]);
    if (
      page === null ||
      page["packagePageIndex"] !== packagePageIndex ||
      !validIdentity(page["boringLogIdentity"]) ||
      !orderedBoringLogIdentities.includes(page["boringLogIdentity"]) ||
      !validIdentity(page["explorationIdentity"]) ||
      !validPositiveSafeInteger(page["sourceOrdinal"]) ||
      page["sourceOrdinal"] > 64 ||
      !validNonnegativeSafeInteger(page["boringPageIndex"]) ||
      !validIdentity(page["pageId"]) ||
      pageIds.has(page["pageId"]) ||
      !validPositiveSafeInteger(page["widthMpt"]) ||
      !validPositiveSafeInteger(page["heightMpt"]) ||
      !validDigest(page["sceneInputDigest"])
    ) {
      return false;
    }
    const boringLogIdentity = page["boringLogIdentity"];
    const explorationIdentity = page["explorationIdentity"];
    const sourceOrdinal = page["sourceOrdinal"];
    const boringPageIndex = page["boringPageIndex"];
    const priorExploration = explorationByBoring.get(boringLogIdentity);
    const priorSourceOrdinal = sourceOrdinalByBoring.get(boringLogIdentity);
    if (
      (priorExploration !== undefined && priorExploration !== explorationIdentity) ||
      (priorSourceOrdinal !== undefined && priorSourceOrdinal !== sourceOrdinal) ||
      boringPageIndex !== (nextPageIndexByBoring.get(boringLogIdentity) ?? 0)
    ) {
      return false;
    }
    if (observedBoringOrder.at(-1) !== boringLogIdentity) {
      if (observedBoringOrder.includes(boringLogIdentity)) return false;
      observedBoringOrder.push(boringLogIdentity);
    }
    explorationByBoring.set(boringLogIdentity, explorationIdentity);
    sourceOrdinalByBoring.set(boringLogIdentity, sourceOrdinal);
    nextPageIndexByBoring.set(boringLogIdentity, boringPageIndex + 1);
    pageIds.add(page["pageId"]);
  }
  return (
    observedBoringOrder.length === orderedBoringLogIdentities.length &&
    observedBoringOrder.every(
      (boringLogIdentity, index) => boringLogIdentity === orderedBoringLogIdentities[index],
    ) &&
    new Set(explorationByBoring.values()).size === explorationByBoring.size &&
    new Set(sourceOrdinalByBoring.values()).size === sourceOrdinalByBoring.size
  );
}

function validOutcome(
  input: unknown,
  expectedWorkingRevision: number,
  expectedBoringLogIdentities: readonly string[],
): input is BoringLogPublicationOutcome {
  const tagged = exactRecord(
    input,
    exactRecord(input, ["accepted", "code"]) === null
      ? [
          "accepted",
          "code",
          "workingRevision",
          "packageCandidateDigest",
          "selectionDigest",
          "orderedBoringLogIdentities",
          "pageManifest",
          "aggregateSceneDigest",
          "aggregateProjectionDigest",
          "pdfDigest",
          "pdfBytes",
          "pageCount",
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
      "EXPORT_PREFLIGHT_BLOCKED",
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
    tagged["workingRevision"] !== expectedWorkingRevision ||
    !validDigest(tagged["packageCandidateDigest"]) ||
    !validDigest(tagged["selectionDigest"]) ||
    !validDigest(tagged["aggregateSceneDigest"]) ||
    !validDigest(tagged["aggregateProjectionDigest"]) ||
    !validDigest(tagged["pdfDigest"]) ||
    !Number.isSafeInteger(tagged["pdfBytes"]) ||
    (tagged["pdfBytes"] as number) < 1 ||
    (tagged["pdfBytes"] as number) > 52_428_800 ||
    !Number.isSafeInteger(tagged["pageCount"]) ||
    (tagged["pageCount"] as number) < 1 ||
    typeof tagged["destinationPath"] !== "string" ||
    tagged["destinationPath"].length < 1 ||
    tagged["destinationPath"].length > 1_024 ||
    tagged["taggedPdfTarget"] !== true ||
    tagged["vectorTextTarget"] !== true
  ) {
    return false;
  }
  const orderedBoringLogIdentities = strictIdentityList(tagged["orderedBoringLogIdentities"]);
  return (
    orderedBoringLogIdentities !== null &&
    orderedBoringLogIdentities.length === expectedBoringLogIdentities.length &&
    orderedBoringLogIdentities.every(
      (boringLogIdentity, index) => boringLogIdentity === expectedBoringLogIdentities[index],
    ) &&
    validPageManifest(
      tagged["pageManifest"],
      orderedBoringLogIdentities,
      tagged["pageCount"] as number,
    )
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
  readonly #exportPdf: (input: BoringLogPublicationIntent) => Promise<BoringLogPublicationOutcome>;
  #generation = 0;
  #binding: Binding | null = null;

  public constructor(input: {
    readonly expectedWindow: object;
    readonly expectedWebContents: object;
    readonly documentIdentity: string;
    readonly ownerGeneration: number;
    readonly createCapability: () => string;
    readonly exportPdf: (input: BoringLogPublicationIntent) => Promise<BoringLogPublicationOutcome>;
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
      transportVersion: 2,
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
    if (request === null || request["transportVersion"] !== 2) {
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
      "orderedBoringLogIdentities",
    ]);
    const orderedBoringLogIdentities =
      args === null ? null : strictIdentityList(args["orderedBoringLogIdentities"]);
    if (
      args === null ||
      !Number.isSafeInteger(args["expectedWorkingRevision"]) ||
      (args["expectedWorkingRevision"] as number) < 0 ||
      orderedBoringLogIdentities === null
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
        orderedBoringLogIdentities,
      });
    } catch {
      return rejected("PUBLICATION_ROUTE_RESULT_INVALID");
    } finally {
      binding.inFlight = false;
    }
    if (
      this.#binding !== binding ||
      !validOutcome(result, args["expectedWorkingRevision"] as number, orderedBoringLogIdentities)
    ) {
      return rejected("PUBLICATION_ROUTE_RESULT_INVALID");
    }
    return Object.freeze({
      accepted: true,
      transportVersion: 2,
      generation: binding.generation,
      sequence,
      result,
    });
  }
}
