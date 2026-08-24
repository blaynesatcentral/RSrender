import { validateResolvedBoringLogPageScene } from "@rsrender/contracts";

import {
  BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL,
  BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL,
  BORING_LOG_STUDIO_LIFECYCLE_CHANNEL,
  BORING_LOG_STUDIO_RESET_TEXT_OCCURRENCE_PRESENTATION_CHANNEL,
  BORING_LOG_STUDIO_SET_COLUMN_DIVIDER_CHANNEL,
  BORING_LOG_STUDIO_SET_PAGE_GUIDES_CHANNEL,
  BORING_LOG_STUDIO_SET_TEXT_OCCURRENCE_STYLE_CHANNEL,
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
    "guides",
    "columnResizeConstraints",
    "textTemplateScopeSummary",
    "textOccurrencePresentationStates",
    "scene",
  ]);
  if (
    projection === null ||
    projection["schema"] !== "rsrender.boring-log-studio-projection.v2" ||
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
    projection["editableValues"].length > 256 ||
    !Array.isArray(projection["guides"]) ||
    projection["guides"].length > 128 ||
    !Array.isArray(projection["columnResizeConstraints"]) ||
    projection["columnResizeConstraints"].length > 64 ||
    typeof projection["textTemplateScopeSummary"] !== "object" ||
    projection["textTemplateScopeSummary"] === null ||
    !Array.isArray(projection["textOccurrencePresentationStates"]) ||
    projection["textOccurrencePresentationStates"].length > 512
  ) {
    return null;
  }
  const scene = validateResolvedBoringLogPageScene(projection["scene"]);
  const scenePage = scene.accepted ? scene.value.pages[0] : undefined;
  const plannedPage =
    scene.accepted && scenePage !== undefined
      ? scene.value.pagePlan.pages.find(({ pageId }) => pageId === scenePage.pageId)
      : undefined;
  if (scenePage === undefined || plannedPage === undefined) return null;
  const guideIds = new Set<string>();
  const guideCoordinates = new Set<string>();
  for (const inputGuide of projection["guides"]) {
    const guide = exactRecord(inputGuide, ["id", "orientation", "positionMpt", "locked"]);
    if (
      guide === null ||
      typeof guide["id"] !== "string" ||
      guide["id"].length < 1 ||
      guide["id"].length > 128 ||
      !["horizontal", "vertical"].includes(String(guide["orientation"])) ||
      !isNonnegativeSafeInteger(guide["positionMpt"]) ||
      guide["positionMpt"] >
        (guide["orientation"] === "vertical" ? scenePage.widthMpt : scenePage.heightMpt) ||
      typeof guide["locked"] !== "boolean"
    ) {
      return null;
    }
    const coordinate = `${String(guide["orientation"])}\u0000${String(guide["positionMpt"])}`;
    if (guideIds.has(guide["id"]) || guideCoordinates.has(coordinate)) return null;
    guideIds.add(guide["id"]);
    guideCoordinates.add(coordinate);
  }
  const constrainedColumnIds = new Set<string>();
  for (const inputConstraint of projection["columnResizeConstraints"]) {
    const constraint = exactRecord(inputConstraint, ["columnId", "minimumWidthMpt", "widthPinned"]);
    if (
      constraint === null ||
      typeof constraint["columnId"] !== "string" ||
      constraint["columnId"].length < 1 ||
      constraint["columnId"].length > 128 ||
      !isPositiveSafeInteger(constraint["minimumWidthMpt"]) ||
      typeof constraint["widthPinned"] !== "boolean" ||
      constrainedColumnIds.has(constraint["columnId"])
    ) {
      return null;
    }
    constrainedColumnIds.add(constraint["columnId"]);
  }
  if (
    constrainedColumnIds.size !== plannedPage.columns.length ||
    plannedPage.columns.some(({ id }) => !constrainedColumnIds.has(id))
  ) {
    return null;
  }
  const textTemplateScopeSummary = exactRecord(projection["textTemplateScopeSummary"], [
    "authoredStyleCount",
    "excludedOverrideStyleCount",
  ]);
  if (
    textTemplateScopeSummary === null ||
    !isNonnegativeSafeInteger(textTemplateScopeSummary["authoredStyleCount"]) ||
    !isNonnegativeSafeInteger(textTemplateScopeSummary["excludedOverrideStyleCount"]) ||
    textTemplateScopeSummary["authoredStyleCount"] > 512 ||
    textTemplateScopeSummary["excludedOverrideStyleCount"] > 512
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
  for (const inputState of projection["textOccurrencePresentationStates"]) {
    const state = exactRecord(inputState, [
      "occurrenceNodeId",
      "semanticId",
      "typography",
      "layout",
    ]);
    if (
      state === null ||
      typeof state["occurrenceNodeId"] !== "string" ||
      state["occurrenceNodeId"].length < 1 ||
      state["occurrenceNodeId"].length > 512 ||
      typeof state["semanticId"] !== "string" ||
      state["semanticId"].length < 1 ||
      state["semanticId"].length > 512 ||
      !["inherited", "occurrence"].includes(String(state["typography"])) ||
      !["inherited", "occurrence"].includes(String(state["layout"]))
    ) {
      return null;
    }
  }
  return projection;
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
  const hasPreview = typeof input === "object" && input !== null && Object.hasOwn(input, "preview");
  const args = exactRecord(input, ["minimumWorkingRevision", ...(hasPreview ? ["preview"] : [])]);
  const minimum = args?.["minimumWorkingRevision"];
  const previewRecord =
    args === null || !hasPreview
      ? null
      : exactRecord(args["preview"], [
          "expectedWorkingRevision",
          "occurrenceNodeId",
          "semanticId",
          "frame",
        ]);
  const frame =
    previewRecord === null
      ? null
      : exactRecord(previewRecord["frame"], ["xMpt", "yMpt", "widthMpt", "heightMpt"]);
  const boundedText = (value: unknown) =>
    typeof value === "string" && value.length >= 1 && value.length <= 512;
  const validPreview =
    previewRecord !== null &&
    frame !== null &&
    isNonnegativeSafeInteger(previewRecord["expectedWorkingRevision"]) &&
    previewRecord["expectedWorkingRevision"] === minimum &&
    boundedText(previewRecord["occurrenceNodeId"]) &&
    boundedText(previewRecord["semanticId"]) &&
    Object.values(frame).every(isNonnegativeSafeInteger) &&
    isPositiveSafeInteger(frame["widthMpt"]) &&
    isPositiveSafeInteger(frame["heightMpt"]);
  if (
    args === null ||
    (minimum !== null && !isNonnegativeSafeInteger(minimum)) ||
    (hasPreview && !validPreview)
  ) {
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
        args,
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

const setTextOccurrenceStyle = Object.freeze(async function setTextOccurrenceStyle(input: unknown) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const hasPropertyMask =
    typeof input === "object" && input !== null && Object.hasOwn(input, "propertyMask");
  const args = exactRecord(input, [
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
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
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
    !isPositiveSafeInteger(args["fontSizeMpt"]) ||
    ![400, 700].includes(Number(args["fontWeight"])) ||
    !isPositiveSafeInteger(args["lineHeightMpt"]) ||
    !Number.isSafeInteger(args["letterSpacingMpt"]) ||
    Number(args["letterSpacingMpt"]) < -2_000 ||
    Number(args["letterSpacingMpt"]) > 12_000 ||
    !Number.isSafeInteger(args["wordSpacingMpt"]) ||
    Number(args["wordSpacingMpt"]) < -2_000 ||
    Number(args["wordSpacingMpt"]) > 24_000 ||
    !isNonnegativeSafeInteger(args["paragraphSpacingMpt"]) ||
    Number(args["paragraphSpacingMpt"]) > 72_000 ||
    !boundedText(args["color"]) ||
    !["none", "underline", "line-through", "underline line-through"].includes(
      String(args["textDecoration"]),
    ) ||
    layout === null ||
    frame === null ||
    padding === null ||
    !Object.values(frame).every(isNonnegativeSafeInteger) ||
    !isPositiveSafeInteger(frame["widthMpt"]) ||
    !isPositiveSafeInteger(frame["heightMpt"]) ||
    !Object.values(padding).every(isNonnegativeSafeInteger) ||
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
      (!isPositiveSafeInteger(layout["minimumFontSizeMpt"]) ||
        layout["minimumFontSizeMpt"] > args["fontSizeMpt"])) ||
    (layout["frameFillColor"] !== null &&
      (typeof layout["frameFillColor"] !== "string" ||
        !/^#[0-9a-f]{6}$/iu.test(layout["frameFillColor"]))) ||
    (layout["frameStrokeColor"] !== null &&
      (typeof layout["frameStrokeColor"] !== "string" ||
        !/^#[0-9a-f]{6}$/iu.test(layout["frameStrokeColor"]))) ||
    !isNonnegativeSafeInteger(layout["frameStrokeWidthMpt"]) ||
    layout["frameStrokeWidthMpt"] > 12_000 ||
    !Number.isSafeInteger(layout["rotationMilliDegrees"]) ||
    (layout["rotationMilliDegrees"] as number) < -180_000 ||
    (layout["rotationMilliDegrees"] as number) > 180_000 ||
    !["depth-bound", "free"].includes(String(layout["positionMode"])) ||
    typeof args["locked"] !== "boolean"
  ) {
    return unavailable;
  }
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_SET_TEXT_OCCURRENCE_STYLE_CHANNEL, {
        transportVersion: 1,
        capability: binding.capability,
        generation: binding.generation,
        sequence,
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
      response["sequence"] !== sequence
    ) {
      return unavailable;
    }
    const detached = boundedClone(response["result"]);
    return detached === null ? unavailable : detached;
  } catch {
    return unavailable;
  } finally {
    inFlight = false;
  }
});

const resetTextOccurrencePresentation = Object.freeze(
  async function resetTextOccurrencePresentation(input: unknown) {
    if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER)
      return unavailable;
    const args = exactRecord(input, ["expectedWorkingRevision", "occurrenceNodeId", "semanticId"]);
    const boundedText = (value: unknown): value is string =>
      typeof value === "string" && value.length > 0 && value.length <= 512;
    if (
      args === null ||
      !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
      !boundedText(args["occurrenceNodeId"]) ||
      !boundedText(args["semanticId"])
    ) {
      return unavailable;
    }
    inFlight = true;
    try {
      const binding = await bootstrap;
      if (binding === null) return unavailable;
      sequence += 1;
      const response = exactRecord(
        await ipcRenderer.invoke(BORING_LOG_STUDIO_RESET_TEXT_OCCURRENCE_PRESENTATION_CHANNEL, {
          transportVersion: 1,
          capability: binding.capability,
          generation: binding.generation,
          sequence,
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
        response["sequence"] !== sequence
      ) {
        return unavailable;
      }
      const detached = boundedClone(response["result"]);
      return detached === null ? unavailable : detached;
    } catch {
      return unavailable;
    } finally {
      inFlight = false;
    }
  },
);

const setPageGuides = Object.freeze(async function setPageGuides(input: unknown) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const args = exactRecord(input, ["expectedWorkingRevision", "mutation"]);
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
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
    mutation === null ||
    (mutationKind === "add" &&
      (!["horizontal", "vertical"].includes(String(mutation["orientation"])) ||
        !isNonnegativeSafeInteger(mutation["positionMpt"]))) ||
    (mutationKind === "move" &&
      (!boundedGuideId || !isNonnegativeSafeInteger(mutation["positionMpt"]))) ||
    ((mutationKind === "delete" || mutationKind === "set-locked") && !boundedGuideId) ||
    (mutationKind === "set-locked" && typeof mutation["locked"] !== "boolean")
  ) {
    return unavailable;
  }
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_SET_PAGE_GUIDES_CHANNEL, {
        transportVersion: 1,
        capability: binding.capability,
        generation: binding.generation,
        sequence,
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
      response["sequence"] !== sequence
    ) {
      return unavailable;
    }
    const detached = boundedClone(response["result"]);
    return detached === null ? unavailable : detached;
  } catch {
    return unavailable;
  } finally {
    inFlight = false;
  }
});

const setColumnDivider = Object.freeze(async function setColumnDivider(input: unknown) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const args = exactRecord(input, [
    "expectedWorkingRevision",
    "dividerAfterColumnId",
    "requestedDividerXMpt",
    "resizeMode",
  ]);
  if (
    args === null ||
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
    typeof args["dividerAfterColumnId"] !== "string" ||
    args["dividerAfterColumnId"].length < 1 ||
    args["dividerAfterColumnId"].length > 128 ||
    !isNonnegativeSafeInteger(args["requestedDividerXMpt"]) ||
    !["adjacent-pair", "push-following-columns"].includes(String(args["resizeMode"]))
  ) {
    return unavailable;
  }
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_SET_COLUMN_DIVIDER_CHANNEL, {
        transportVersion: 1,
        capability: binding.capability,
        generation: binding.generation,
        sequence,
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
      response["sequence"] !== sequence
    ) {
      return unavailable;
    }
    const detached = boundedClone(response["result"]);
    return detached === null ? unavailable : detached;
  } catch {
    return unavailable;
  } finally {
    inFlight = false;
  }
});

contextBridge.exposeInMainWorld(
  "rsrenderStudio",
  Object.freeze({
    getProjection,
    lifecycle,
    setTextOccurrenceStyle,
    resetTextOccurrencePresentation,
    setPageGuides,
    setColumnDivider,
  }),
);

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
  readonly getProjection: (input: {
    readonly minimumWorkingRevision: number | null;
    readonly preview?: Readonly<{
      readonly expectedWorkingRevision: number;
      readonly occurrenceNodeId: string;
      readonly semanticId: string;
      readonly frame: Readonly<{
        readonly xMpt: number;
        readonly yMpt: number;
        readonly widthMpt: number;
        readonly heightMpt: number;
      }>;
    }>;
  }) => Promise<
    | { readonly accepted: false; readonly code: "STUDIO_ROUTE_UNAVAILABLE" }
    | {
        readonly accepted: true;
        readonly projection: Readonly<Record<string, unknown>>;
      }
  >;
  readonly lifecycle: (input: {
    readonly operation:
      | "get-state"
      | "new-project"
      | "open-project"
      | "save-project"
      | "save-project-as"
      | "first-boring"
      | "previous-boring"
      | "next-boring"
      | "last-boring";
    readonly expectedWorkingRevision: number | null;
  }) => Promise<unknown>;
  readonly setTextOccurrenceStyle: (input: {
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
      readonly overflowPolicy: "clip-with-diagnostic";
      readonly frameFillColor: string | null;
      readonly frameStrokeColor: string | null;
      readonly frameStrokeWidthMpt: number;
      readonly rotationMilliDegrees: number;
      readonly positionMode: "depth-bound" | "free";
    };
    readonly locked: boolean;
  }) => Promise<unknown>;
  readonly resetTextOccurrencePresentation: (input: {
    readonly expectedWorkingRevision: number;
    readonly occurrenceNodeId: string;
    readonly semanticId: string;
  }) => Promise<unknown>;
  readonly setPageGuides: (input: {
    readonly expectedWorkingRevision: number;
    readonly mutation:
      | Readonly<{
          readonly kind: "add";
          readonly orientation: "horizontal" | "vertical";
          readonly positionMpt: number;
        }>
      | Readonly<{
          readonly kind: "move";
          readonly guideId: string;
          readonly positionMpt: number;
        }>
      | Readonly<{ readonly kind: "delete"; readonly guideId: string }>
      | Readonly<{
          readonly kind: "set-locked";
          readonly guideId: string;
          readonly locked: boolean;
        }>;
  }) => Promise<unknown>;
  readonly setColumnDivider: (input: {
    readonly expectedWorkingRevision: number;
    readonly dividerAfterColumnId: string;
    readonly requestedDividerXMpt: number;
    readonly resizeMode: "adjacent-pair" | "push-following-columns";
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
