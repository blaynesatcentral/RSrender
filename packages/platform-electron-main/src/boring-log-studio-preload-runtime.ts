import { validateResolvedBoringLogPageScene } from "@rsrender/contracts";

import {
  BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL,
  BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL,
  BORING_LOG_STUDIO_LIFECYCLE_CHANNEL,
} from "./boring-log-studio-route-contract.js";
import {
  BORING_LOG_PUBLICATION_BOOTSTRAP_CHANNEL,
  BORING_LOG_PUBLICATION_EXPORT_CHANNEL,
} from "./boring-log-publication-route-contract.js";
import "./document-preload-runtime.js";

declare const require: (name: "electron") => {
  readonly contextBridge: {
    readonly exposeInMainWorld: (name: string, value: unknown) => void;
  };
  readonly ipcRenderer: {
    readonly invoke: (channel: string, input?: unknown) => Promise<unknown>;
  };
};

const { contextBridge, ipcRenderer } = require("electron");
const unavailable = Object.freeze({ accepted: false, code: "STUDIO_ROUTE_UNAVAILABLE" } as const);
type DataRecord = Readonly<Record<string, unknown>>;

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

function isNonnegativeSafeInteger(input: unknown): input is number {
  return typeof input === "number" && Number.isSafeInteger(input) && input >= 0;
}

function isPositiveSafeInteger(input: unknown): input is number {
  return isNonnegativeSafeInteger(input) && input > 0;
}

function boundedClone(input: unknown): unknown {
  try {
    const serialized = JSON.stringify(input);
    if (
      typeof serialized !== "string" ||
      new TextEncoder().encode(serialized).byteLength > 1_048_576
    ) {
      return null;
    }
    return JSON.parse(serialized) as unknown;
  } catch {
    return null;
  }
}

function validProjection(input: unknown, documentIdentity: string, ownerGeneration: number) {
  const projection = exactRecord(input, [
    "schema",
    "documentIdentity",
    "ownerGeneration",
    "workingRevision",
    "durableRevision",
    "dirty",
    "canUndo",
    "canRedo",
    "editableValues",
    "scene",
  ]);
  if (
    projection === null ||
    projection["schema"] !== "rsrender.boring-log-studio-projection.v1" ||
    projection["documentIdentity"] !== documentIdentity ||
    projection["ownerGeneration"] !== ownerGeneration ||
    !Number.isSafeInteger(projection["workingRevision"]) ||
    (projection["workingRevision"] as number) < 0 ||
    !Number.isSafeInteger(projection["durableRevision"]) ||
    (projection["durableRevision"] as number) < 0 ||
    typeof projection["dirty"] !== "boolean" ||
    typeof projection["canUndo"] !== "boolean" ||
    typeof projection["canRedo"] !== "boolean" ||
    !Array.isArray(projection["editableValues"]) ||
    projection["editableValues"].length > 256
  ) {
    return null;
  }
  for (const inputValue of projection["editableValues"]) {
    const value = exactRecord(inputValue, [
      "semanticId",
      "property",
      "sourceFieldIdentity",
      "sourceEntityIdentity",
      "sourceBaselineValueDigest",
      "valueType",
      "unit",
      "sourceOriginal",
      "effectiveDisplay",
      "application",
    ]);
    if (
      value === null ||
      typeof value["semanticId"] !== "string" ||
      typeof value["property"] !== "string" ||
      typeof value["sourceFieldIdentity"] !== "string" ||
      typeof value["sourceEntityIdentity"] !== "string" ||
      typeof value["sourceBaselineValueDigest"] !== "string" ||
      !/^sha256:[0-9a-f]{64}$/u.test(value["sourceBaselineValueDigest"]) ||
      !(value["valueType"] === "string" || value["valueType"] === "number") ||
      typeof value["sourceOriginal"] !== "object" ||
      value["sourceOriginal"] === null ||
      typeof value["effectiveDisplay"] !== "object" ||
      value["effectiveDisplay"] === null
    ) {
      return null;
    }
  }
  const scene = validateResolvedBoringLogPageScene(projection["scene"]);
  return scene.accepted ? projection : null;
}

const bootstrap = ipcRenderer
  .invoke(BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL)
  .then((input) => {
    const record = exactRecord(input, [
      "accepted",
      "transportVersion",
      "generation",
      "capability",
      "documentIdentity",
      "ownerGeneration",
    ]);
    if (
      record === null ||
      record["accepted"] !== true ||
      record["transportVersion"] !== 1 ||
      !isPositiveSafeInteger(record["generation"]) ||
      typeof record["capability"] !== "string" ||
      !/^[0-9a-f]{64}$/u.test(record["capability"]) ||
      typeof record["documentIdentity"] !== "string" ||
      !isPositiveSafeInteger(record["ownerGeneration"])
    ) {
      throw new Error("BOOTSTRAP");
    }
    return Object.freeze({
      generation: record["generation"],
      capability: record["capability"],
      documentIdentity: record["documentIdentity"],
      ownerGeneration: record["ownerGeneration"],
    });
  })
  .catch(() => null);

let sequence = Number("__RSRENDER_STUDIO_INITIAL_SEQUENCE_LITERAL__");
let inFlight = false;

const getProjection = Object.freeze(async function getProjection(input: unknown) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) {
    return unavailable;
  }
  const args = exactRecord(input, ["minimumWorkingRevision"]);
  const minimum = args?.["minimumWorkingRevision"];
  if (args === null || (minimum !== null && !isNonnegativeSafeInteger(minimum))) {
    return unavailable;
  }
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL, {
        transportVersion: 1,
        capability: binding.capability,
        generation: binding.generation,
        sequence,
        documentIdentity: binding.documentIdentity,
        ownerGeneration: binding.ownerGeneration,
        args: { minimumWorkingRevision: minimum },
      }),
      ["accepted", "transportVersion", "generation", "sequence", "projection"],
    );
    if (
      response === null ||
      response["accepted"] !== true ||
      response["transportVersion"] !== 1 ||
      response["generation"] !== binding.generation ||
      response["sequence"] !== sequence
    ) {
      return unavailable;
    }
    const detached = boundedClone(response["projection"]);
    const projection = validProjection(detached, binding.documentIdentity, binding.ownerGeneration);
    if (
      projection === null ||
      (minimum !== null && (projection["workingRevision"] as number) < minimum)
    ) {
      return unavailable;
    }
    return Object.freeze({ accepted: true, projection });
  } catch {
    return unavailable;
  } finally {
    inFlight = false;
  }
});

const lifecycle = Object.freeze(async function lifecycle(input: unknown) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const args = exactRecord(input, ["operation", "expectedWorkingRevision"]);
  const operation = args?.["operation"];
  const expected = args?.["expectedWorkingRevision"];
  if (
    args === null ||
    !["get-state", "new-project", "open-project", "save-project", "save-project-as"].includes(
      String(operation),
    ) ||
    (expected !== null && !isNonnegativeSafeInteger(expected))
  )
    return unavailable;
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_LIFECYCLE_CHANNEL, {
        transportVersion: 1,
        capability: binding.capability,
        generation: binding.generation,
        sequence,
        documentIdentity: binding.documentIdentity,
        ownerGeneration: binding.ownerGeneration,
        args: { operation, expectedWorkingRevision: expected },
      }),
      ["accepted", "transportVersion", "generation", "sequence", "result"],
    );
    if (
      response === null ||
      response["accepted"] !== true ||
      response["transportVersion"] !== 1 ||
      response["generation"] !== binding.generation ||
      response["sequence"] !== sequence
    )
      return unavailable;
    const detached = boundedClone(response["result"]);
    return detached === null ? unavailable : detached;
  } catch {
    return unavailable;
  } finally {
    inFlight = false;
  }
});

contextBridge.exposeInMainWorld("rsrenderStudio", Object.freeze({ getProjection, lifecycle }));

const publicationUnavailable = Object.freeze({
  accepted: false,
  code: "PUBLICATION_ROUTE_UNAVAILABLE",
});

const publicationBootstrap = ipcRenderer
  .invoke(BORING_LOG_PUBLICATION_BOOTSTRAP_CHANNEL)
  .then((input) => {
    const record = exactRecord(input, [
      "accepted",
      "transportVersion",
      "generation",
      "capability",
      "documentIdentity",
      "ownerGeneration",
    ]);
    if (
      record === null ||
      record["accepted"] !== true ||
      record["transportVersion"] !== 1 ||
      !isPositiveSafeInteger(record["generation"]) ||
      typeof record["capability"] !== "string" ||
      !/^[0-9a-f]{64}$/u.test(record["capability"]) ||
      typeof record["documentIdentity"] !== "string" ||
      !isPositiveSafeInteger(record["ownerGeneration"])
    ) {
      throw new Error("PUBLICATION_BOOTSTRAP");
    }
    return Object.freeze({
      generation: record["generation"],
      capability: record["capability"],
      documentIdentity: record["documentIdentity"],
      ownerGeneration: record["ownerGeneration"],
    });
  })
  .catch(() => null);

let publicationSequence = Number("__RSRENDER_PUBLICATION_INITIAL_SEQUENCE_LITERAL__");
let publicationInFlight = false;

const exportPdf = Object.freeze(async function exportPdf(input: unknown) {
  if (
    arguments.length !== 1 ||
    publicationInFlight ||
    publicationSequence >= Number.MAX_SAFE_INTEGER
  ) {
    return publicationUnavailable;
  }
  const args = exactRecord(input, ["expectedWorkingRevision", "expectedSceneInputDigest"]);
  if (
    args === null ||
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
    typeof args["expectedSceneInputDigest"] !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(args["expectedSceneInputDigest"])
  ) {
    return publicationUnavailable;
  }
  publicationInFlight = true;
  try {
    const binding = await publicationBootstrap;
    if (binding === null) return publicationUnavailable;
    publicationSequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_PUBLICATION_EXPORT_CHANNEL, {
        transportVersion: 1,
        capability: binding.capability,
        generation: binding.generation,
        sequence: publicationSequence,
        documentIdentity: binding.documentIdentity,
        ownerGeneration: binding.ownerGeneration,
        args,
      }),
      ["accepted", "transportVersion", "generation", "sequence", "result"],
    );
    if (
      response === null ||
      response["accepted"] !== true ||
      response["transportVersion"] !== 1 ||
      response["generation"] !== binding.generation ||
      response["sequence"] !== publicationSequence
    ) {
      return publicationUnavailable;
    }
    const detached = boundedClone(response["result"]);
    const failure = exactRecord(detached, ["accepted", "code"]);
    if (failure !== null && failure["accepted"] === false && typeof failure["code"] === "string") {
      return Object.freeze({ accepted: false, code: failure["code"] });
    }
    const success = exactRecord(detached, [
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
    ]);
    if (
      success === null ||
      success["accepted"] !== true ||
      success["code"] !== "EXPORT_VERIFIED_SUCCESS" ||
      success["workingRevision"] !== args["expectedWorkingRevision"] ||
      success["sceneInputDigest"] !== args["expectedSceneInputDigest"] ||
      typeof success["sceneDigest"] !== "string" ||
      !/^sha256:[0-9a-f]{64}$/u.test(success["sceneDigest"]) ||
      typeof success["projectionDigest"] !== "string" ||
      !/^sha256:[0-9a-f]{64}$/u.test(success["projectionDigest"]) ||
      typeof success["pdfDigest"] !== "string" ||
      !/^sha256:[0-9a-f]{64}$/u.test(success["pdfDigest"]) ||
      !Number.isSafeInteger(success["pdfBytes"]) ||
      (success["pdfBytes"] as number) < 1 ||
      success["pageCount"] !== 1 ||
      !Array.isArray(success["pageSizes"]) ||
      success["pageSizes"].length !== 1 ||
      typeof success["destinationPath"] !== "string" ||
      success["destinationPath"].length < 1 ||
      success["destinationPath"].length > 1_024 ||
      success["taggedPdfTarget"] !== true ||
      success["vectorTextTarget"] !== true
    ) {
      return publicationUnavailable;
    }
    const size = exactRecord(success["pageSizes"][0], ["widthMpt", "heightMpt"]);
    if (
      size === null ||
      !isPositiveSafeInteger(size["widthMpt"]) ||
      !isPositiveSafeInteger(size["heightMpt"])
    ) {
      return publicationUnavailable;
    }
    return Object.freeze({ accepted: true, result: success });
  } catch {
    return publicationUnavailable;
  } finally {
    publicationInFlight = false;
  }
});

contextBridge.exposeInMainWorld("rsrenderPublication", Object.freeze({ exportPdf }));

export interface BoringLogStudioPreloadApi {
  readonly getProjection: (input: { readonly minimumWorkingRevision: number | null }) => Promise<
    | { readonly accepted: false; readonly code: "STUDIO_ROUTE_UNAVAILABLE" }
    | {
        readonly accepted: true;
        readonly projection: Readonly<Record<string, unknown>>;
      }
  >;
  readonly lifecycle: (input: {
    readonly operation:
      "get-state" | "new-project" | "open-project" | "save-project" | "save-project-as";
    readonly expectedWorkingRevision: number | null;
  }) => Promise<unknown>;
}

export interface BoringLogPublicationPreloadApi {
  readonly exportPdf: (input: {
    readonly expectedWorkingRevision: number;
    readonly expectedSceneInputDigest: string;
  }) => Promise<
    | { readonly accepted: false; readonly code: string }
    | { readonly accepted: true; readonly result: Readonly<Record<string, unknown>> }
  >;
}
