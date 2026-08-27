import { isWellFormedUnicode, validateResolvedBoringLogPageScene } from "@rsrender/contracts";

import {
  BORING_LOG_STUDIO_ADD_PROVIDER_COLUMN_CHANNEL,
  BORING_LOG_STUDIO_BOOTSTRAP_CHANNEL,
  BORING_LOG_STUDIO_ARRANGE_TEXT_OCCURRENCES_CHANNEL,
  BORING_LOG_STUDIO_MUTATE_TEXT_OCCURRENCES_CHANNEL,
  BORING_LOG_STUDIO_GET_PROJECTION_CHANNEL,
  BORING_LOG_STUDIO_LIFECYCLE_CHANNEL,
  BORING_LOG_STUDIO_RESET_TEXT_OCCURRENCE_PRESENTATION_CHANNEL,
  BORING_LOG_STUDIO_SET_COLUMN_DIVIDER_CHANNEL,
  BORING_LOG_STUDIO_SET_COLUMN_HEADING_CHANNEL,
  BORING_LOG_STUDIO_SET_DATA_LAYER_SYMBOLOGY_CHANNEL,
  BORING_LOG_STUDIO_SET_LITHOLOGY_APPEARANCE_CHANNEL,
  BORING_LOG_STUDIO_SET_REGION_BOUNDARY_CHANNEL,
  BORING_LOG_STUDIO_SET_DATA_DEPTH_CONFIGURATION_CHANNEL,
  BORING_LOG_STUDIO_SET_PAGE_GUIDES_CHANNEL,
  BORING_LOG_STUDIO_SET_PAGE_SETUP_CHANNEL,
  BORING_LOG_STUDIO_SET_TEXT_OCCURRENCE_STYLE_CHANNEL,
} from "./boring-log-studio-route-contract.js";
import {
  BORING_LOG_PUBLICATION_BOOTSTRAP_CHANNEL,
  BORING_LOG_PUBLICATION_EXPORT_CHANNEL,
  type BoringLogPublicationIntent,
  type BoringLogPublicationOutcome,
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

function validBorderStyle(input: unknown): boolean {
  const border = exactRecord(input, [
    "top",
    "right",
    "bottom",
    "left",
    "color",
    "widthMpt",
    "linePattern",
  ]);
  return (
    border !== null &&
    ["top", "right", "bottom", "left"].every((edge) => typeof border[edge] === "boolean") &&
    typeof border["color"] === "string" &&
    /^#[0-9a-f]{6}$/iu.test(border["color"]) &&
    isNonnegativeSafeInteger(border["widthMpt"]) &&
    border["widthMpt"] <= 12_000 &&
    ["solid", "dashed", "dotted", "dash-dot"].includes(String(border["linePattern"]))
  );
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

function boundedText(input: unknown, maximumLength = 2_048): input is string {
  return (
    typeof input === "string" &&
    input.length >= 1 &&
    input.length <= maximumLength &&
    isWellFormedUnicode(input)
  );
}

function validProjectedDataLineSymbol(
  input: unknown,
  tokens: ReadonlyMap<string, string>,
): boolean {
  const line = exactRecord(input, ["strokeToken", "strokeColor", "strokeWidthMpt", "dashMpt"]);
  if (line === null || !Array.isArray(line["dashMpt"])) return false;
  const token = line["strokeToken"];
  const dash = line["dashMpt"];
  return (
    boundedText(token, 128) &&
    line["strokeColor"] === tokens.get(token) &&
    isPositiveSafeInteger(line["strokeWidthMpt"]) &&
    line["strokeWidthMpt"] >= 100 &&
    line["strokeWidthMpt"] <= 12_000 &&
    dash.length <= 8 &&
    dash.length % 2 === 0 &&
    Object.keys(dash).length === dash.length &&
    dash.every((entry) => isPositiveSafeInteger(entry) && entry <= 72_000)
  );
}

function validProjectedDataPointSymbol(
  input: unknown,
  tokens: ReadonlyMap<string, string>,
): boolean {
  const point = exactRecord(input, [
    "shape",
    "sizeMpt",
    "fillToken",
    "fillColor",
    "strokeToken",
    "strokeColor",
    "strokeWidthMpt",
  ]);
  if (point === null) return false;
  const fillToken = point["fillToken"];
  const strokeToken = point["strokeToken"];
  return (
    ["square", "triangle", "circle"].includes(String(point["shape"])) &&
    isPositiveSafeInteger(point["sizeMpt"]) &&
    point["sizeMpt"] >= 1_000 &&
    point["sizeMpt"] <= 24_000 &&
    ((fillToken === null && point["fillColor"] === null) ||
      (boundedText(fillToken, 128) && point["fillColor"] === tokens.get(fillToken))) &&
    boundedText(strokeToken, 128) &&
    point["strokeColor"] === tokens.get(strokeToken) &&
    isPositiveSafeInteger(point["strokeWidthMpt"]) &&
    point["strokeWidthMpt"] >= 100 &&
    point["strokeWidthMpt"] <= 12_000
  );
}

function validAttributeSourceProvenance(input: unknown): DataRecord | null {
  const provenance = exactRecord(input, [
    "provenanceClass",
    "sourceContextIdentity",
    "sourceProjectIdentity",
    "sourceEntityIdentity",
    "sourceFieldIdentity",
    "sourceContractRevision",
  ]);
  if (
    provenance === null ||
    provenance["provenanceClass"] !== "source" ||
    !boundedText(provenance["sourceContextIdentity"]) ||
    !boundedText(provenance["sourceProjectIdentity"]) ||
    !boundedText(provenance["sourceEntityIdentity"]) ||
    !boundedText(provenance["sourceFieldIdentity"]) ||
    !boundedText(provenance["sourceContractRevision"], 256)
  ) {
    return null;
  }
  return provenance;
}

function sameAttributeSourceProvenance(left: DataRecord, right: DataRecord): boolean {
  return [
    "sourceContextIdentity",
    "sourceProjectIdentity",
    "sourceEntityIdentity",
    "sourceFieldIdentity",
    "sourceContractRevision",
  ].every((key) => left[key] === right[key]);
}

function validAttributeEffectiveProvenance(input: unknown, original: DataRecord | null): boolean {
  const source = validAttributeSourceProvenance(input);
  if (source !== null) return original === null || sameAttributeSourceProvenance(source, original);
  const effective = exactRecord(input, [
    "provenanceClass",
    "original",
    "overrideIdentity",
    "overrideRevision",
    "transformation",
  ]);
  if (effective === null || effective["provenanceClass"] !== "effective-override") return false;
  const effectiveOriginal = validAttributeSourceProvenance(effective["original"]);
  return (
    effectiveOriginal !== null &&
    original !== null &&
    sameAttributeSourceProvenance(effectiveOriginal, original) &&
    boundedText(effective["overrideIdentity"]) &&
    isNonnegativeSafeInteger(effective["overrideRevision"]) &&
    ["replace-display-value", "replace-style-token", "replace-layout-value"].includes(
      String(effective["transformation"]),
    )
  );
}

function validAttributeScalar(input: unknown, valueType: "string" | "number" | "boolean"): boolean {
  if (input === null) return true;
  if (valueType === "string") {
    return typeof input === "string" && input.length <= 65_536 && isWellFormedUnicode(input);
  }
  if (valueType === "number") return typeof input === "number" && Number.isFinite(input);
  return typeof input === "boolean";
}

function isAttributeValueType(input: unknown): input is "string" | "number" | "boolean" {
  return input === "string" || input === "number" || input === "boolean";
}

function validAttributeRecords(input: unknown): readonly string[] | null {
  if (!Array.isArray(input) || input.length > 4_096) return null;
  const recordIdentities = new Set<string>();
  const semanticIds: string[] = [];
  for (const inputRecord of input) {
    const record = exactRecord(inputRecord, [
      "recordIdentity",
      "recordKind",
      "semanticId",
      "boringLogIdentity",
      "explorationIdentity",
      "sourceEntityIdentity",
      "depth",
      "label",
      "fields",
    ]);
    const kind = record?.["recordKind"];
    const identityKind =
      kind === "lithology-interval"
        ? "lithology"
        : kind === "sample"
          ? "sample"
          : kind === "plotted-observation"
            ? "observation"
            : kind === "remark"
              ? "remark"
              : null;
    const semanticPrefix =
      kind === "lithology-interval"
        ? "lithology:"
        : kind === "sample"
          ? "sample:"
          : kind === "plotted-observation"
            ? "data-layer:"
            : kind === "remark"
              ? "remark:"
              : null;
    if (
      record === null ||
      identityKind === null ||
      semanticPrefix === null ||
      !boundedText(record["recordIdentity"]) ||
      !record["recordIdentity"].startsWith(`attribute:${identityKind}:`) ||
      recordIdentities.has(record["recordIdentity"]) ||
      !boundedText(record["semanticId"]) ||
      !record["semanticId"].startsWith(semanticPrefix) ||
      !boundedText(record["boringLogIdentity"]) ||
      !boundedText(record["explorationIdentity"]) ||
      !boundedText(record["sourceEntityIdentity"]) ||
      !boundedText(record["label"], 1_024) ||
      !Array.isArray(record["fields"]) ||
      record["fields"].length < 1 ||
      record["fields"].length > 32
    ) {
      return null;
    }
    const depth = exactRecord(record["depth"], ["fromFt", "toFt"]);
    if (
      depth === null ||
      typeof depth["fromFt"] !== "number" ||
      !Number.isFinite(depth["fromFt"]) ||
      depth["fromFt"] < 0 ||
      typeof depth["toFt"] !== "number" ||
      !Number.isFinite(depth["toFt"]) ||
      depth["toFt"] < depth["fromFt"]
    ) {
      return null;
    }
    const recordIdentity = record["recordIdentity"];
    const fieldIdentities = new Set<string>();
    const fieldKeys = new Set<string>();
    for (const inputField of record["fields"]) {
      const field = exactRecord(inputField, [
        "fieldIdentity",
        "key",
        "label",
        "valueType",
        "unit",
        "sourceOriginal",
        "effectiveDisplay",
        "editability",
        "provenance",
      ]);
      const valueType = field?.["valueType"];
      if (
        field === null ||
        !boundedText(field["fieldIdentity"]) ||
        !field["fieldIdentity"].startsWith(`${recordIdentity}:field:`) ||
        fieldIdentities.has(field["fieldIdentity"]) ||
        !boundedText(field["key"], 128) ||
        fieldKeys.has(field["key"]) ||
        !boundedText(field["label"], 512) ||
        !isAttributeValueType(valueType) ||
        (field["unit"] !== null && !boundedText(field["unit"], 128))
      ) {
        return null;
      }
      if (
        !validAttributeScalar(field["sourceOriginal"], valueType) ||
        !validAttributeScalar(field["effectiveDisplay"], valueType)
      ) {
        return null;
      }
      const editabilityKind =
        typeof field["editability"] === "object" && field["editability"] !== null
          ? (field["editability"] as DataRecord)["kind"]
          : null;
      const editability =
        editabilityKind === "read-only-source"
          ? exactRecord(field["editability"], ["kind"])
          : editabilityKind === "display-value-override"
            ? exactRecord(field["editability"], ["kind", "property"])
            : null;
      if (editability === null) return null;
      if (editabilityKind === "display-value-override") {
        const property = editability["property"];
        const admitted =
          (kind === "lithology-interval" &&
            field["key"] === "description" &&
            property === "material-description") ||
          (kind === "sample" &&
            field["key"] === "recovery-percent" &&
            property === "sample-recovery") ||
          (kind === "remark" && field["key"] === "text" && property === "remark-text");
        if (!admitted || valueType === "boolean") return null;
      }
      const provenance = exactRecord(field["provenance"], ["sourceOriginal", "effective"]);
      if (provenance === null) return null;
      const originalProvenance =
        provenance["sourceOriginal"] === null
          ? null
          : validAttributeSourceProvenance(provenance["sourceOriginal"]);
      if (
        (provenance["sourceOriginal"] !== null && originalProvenance === null) ||
        (provenance["effective"] !== null &&
          !validAttributeEffectiveProvenance(provenance["effective"], originalProvenance))
      ) {
        return null;
      }
      fieldIdentities.add(field["fieldIdentity"]);
      fieldKeys.add(field["key"]);
    }
    recordIdentities.add(recordIdentity);
    semanticIds.push(record["semanticId"]);
  }
  return Object.freeze(semanticIds);
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
    "dataSummary",
    "pageSetup",
    "editableValues",
    "attributeRecords",
    "guides",
    "columnResizeConstraints",
    "providerColumnCatalog",
    "regionResizeConstraints",
    "textTemplateScopeSummary",
    "lithologyAppearanceStates",
    "lithologyPatternOptions",
    "dataLayerSymbologyStates",
    "visualTokenOptions",
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
    typeof projection["dataSummary"] !== "object" ||
    projection["dataSummary"] === null ||
    typeof projection["pageSetup"] !== "object" ||
    projection["pageSetup"] === null ||
    !Array.isArray(projection["editableValues"]) ||
    projection["editableValues"].length > 256 ||
    !Array.isArray(projection["attributeRecords"]) ||
    projection["attributeRecords"].length > 4_096 ||
    !Array.isArray(projection["guides"]) ||
    projection["guides"].length > 128 ||
    !Array.isArray(projection["columnResizeConstraints"]) ||
    projection["columnResizeConstraints"].length > 64 ||
    !Array.isArray(projection["providerColumnCatalog"]) ||
    projection["providerColumnCatalog"].length > 256 ||
    typeof projection["regionResizeConstraints"] !== "object" ||
    projection["regionResizeConstraints"] === null ||
    typeof projection["textTemplateScopeSummary"] !== "object" ||
    projection["textTemplateScopeSummary"] === null ||
    !Array.isArray(projection["lithologyAppearanceStates"]) ||
    projection["lithologyAppearanceStates"].length > 256 ||
    !Array.isArray(projection["lithologyPatternOptions"]) ||
    projection["lithologyPatternOptions"].length > 64 ||
    !Array.isArray(projection["dataLayerSymbologyStates"]) ||
    projection["dataLayerSymbologyStates"].length > 64 ||
    !Array.isArray(projection["visualTokenOptions"]) ||
    projection["visualTokenOptions"].length < 1 ||
    projection["visualTokenOptions"].length > 256 ||
    !Array.isArray(projection["textOccurrencePresentationStates"]) ||
    projection["textOccurrencePresentationStates"].length > 512
  ) {
    return null;
  }
  const attributeSemanticIds = validAttributeRecords(projection["attributeRecords"]);
  if (attributeSemanticIds === null) return null;
  const dataSummary = exactRecord(projection["dataSummary"], [
    "projectName",
    "groundElevationFt",
    "elevationDatum",
    "referenceStartFt",
    "referenceEndFt",
    "totalDepthFt",
    "completionDepthFt",
    "depthScaleMptPerFoot",
    "depthIntervalFt",
    "nValueGraphMaximum",
  ]);
  const summaryText = (value: unknown): value is string =>
    typeof value === "string" && value.length >= 1 && value.length <= 512;
  const summaryFinite = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);
  if (
    dataSummary === null ||
    !summaryText(dataSummary["projectName"]) ||
    !summaryFinite(dataSummary["groundElevationFt"]) ||
    !summaryText(dataSummary["elevationDatum"]) ||
    !summaryFinite(dataSummary["referenceStartFt"]) ||
    !summaryFinite(dataSummary["referenceEndFt"]) ||
    dataSummary["referenceStartFt"] < 0 ||
    dataSummary["referenceEndFt"] <= dataSummary["referenceStartFt"] ||
    !summaryFinite(dataSummary["totalDepthFt"]) ||
    dataSummary["totalDepthFt"] <= 0 ||
    dataSummary["referenceEndFt"] !== dataSummary["totalDepthFt"] ||
    !summaryFinite(dataSummary["completionDepthFt"]) ||
    dataSummary["completionDepthFt"] < 0 ||
    dataSummary["completionDepthFt"] > dataSummary["totalDepthFt"] ||
    !isPositiveSafeInteger(dataSummary["depthScaleMptPerFoot"]) ||
    !summaryFinite(dataSummary["depthIntervalFt"]) ||
    dataSummary["depthIntervalFt"] <= 0 ||
    dataSummary["depthIntervalFt"] !==
      dataSummary["referenceEndFt"] - dataSummary["referenceStartFt"] ||
    (dataSummary["nValueGraphMaximum"] !== null &&
      (!isPositiveSafeInteger(dataSummary["nValueGraphMaximum"]) ||
        dataSummary["nValueGraphMaximum"] > 1_000))
  ) {
    return null;
  }
  const scene = validateResolvedBoringLogPageScene(projection["scene"]);
  if (!scene.accepted) return null;
  const scenePage = scene.value.pages[0];
  const plannedPage =
    scenePage !== undefined
      ? scene.value.pagePlan.pages.find(({ pageId }) => pageId === scenePage.pageId)
      : undefined;
  if (scenePage === undefined || plannedPage === undefined) return null;
  const pageSetup = exactRecord(projection["pageSetup"], [
    "paperPreset",
    "orientation",
    "widthMpt",
    "heightMpt",
    "marginsMpt",
  ]);
  const margins =
    pageSetup === null
      ? null
      : exactRecord(pageSetup["marginsMpt"], ["topMpt", "rightMpt", "bottomMpt", "leftMpt"]);
  if (
    pageSetup === null ||
    margins === null ||
    !["letter", "a4", "custom"].includes(String(pageSetup["paperPreset"])) ||
    !["portrait", "landscape"].includes(String(pageSetup["orientation"])) ||
    !isPositiveSafeInteger(pageSetup["widthMpt"]) ||
    !isPositiveSafeInteger(pageSetup["heightMpt"]) ||
    pageSetup["widthMpt"] !== scenePage.widthMpt ||
    pageSetup["heightMpt"] !== scenePage.heightMpt ||
    ["topMpt", "rightMpt", "bottomMpt", "leftMpt"].some(
      (field) => !isNonnegativeSafeInteger(margins[field]),
    ) ||
    (margins["leftMpt"] as number) + (margins["rightMpt"] as number) >= pageSetup["widthMpt"] ||
    (margins["topMpt"] as number) + (margins["bottomMpt"] as number) >= pageSetup["heightMpt"]
  ) {
    return null;
  }
  const sceneSemanticIds = new Set(
    scene.value.pages.flatMap(({ nodes }) => nodes.map(({ semanticId }) => semanticId)),
  );
  if (attributeSemanticIds.some((semanticId) => !sceneSemanticIds.has(semanticId))) return null;
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
  const providerFieldIds = new Set<string>();
  for (const inputField of projection["providerColumnCatalog"]) {
    const field = exactRecord(inputField, [
      "fieldId",
      "label",
      "description",
      "valueType",
      "unit",
      "supportedTargetRoles",
      "availability",
    ]);
    const availability =
      field === null ? null : exactRecord(field["availability"], ["state", "reason"]);
    if (
      field === null ||
      availability === null ||
      typeof field["fieldId"] !== "string" ||
      field["fieldId"].length < 1 ||
      field["fieldId"].length > 256 ||
      providerFieldIds.has(field["fieldId"]) ||
      typeof field["label"] !== "string" ||
      field["label"].length < 1 ||
      field["label"].length > 256 ||
      typeof field["description"] !== "string" ||
      field["description"].length < 1 ||
      field["description"].length > 1_024 ||
      !["boolean", "date", "number", "structured-text", "text"].includes(
        String(field["valueType"]),
      ) ||
      (field["unit"] !== null &&
        (typeof field["unit"] !== "string" || field["unit"].length > 128)) ||
      !Array.isArray(field["supportedTargetRoles"]) ||
      field["supportedTargetRoles"].length > 5 ||
      field["supportedTargetRoles"].some(
        (role) =>
          ![
            "interval-text-column",
            "lithology-pattern-column",
            "numeric-value-column",
            "point-text-column",
            "remarks-column",
          ].includes(String(role)),
      ) ||
      !["available", "unavailable"].includes(String(availability["state"])) ||
      (availability["reason"] !== null &&
        (typeof availability["reason"] !== "string" || availability["reason"].length > 1_024))
    ) {
      return null;
    }
    providerFieldIds.add(field["fieldId"]);
  }
  const regionResizeConstraints = exactRecord(projection["regionResizeConstraints"], [
    "minimumHeaderHeightMpt",
    "minimumDepthBodyHeightMpt",
    "minimumFooterHeightMpt",
  ]);
  if (
    regionResizeConstraints === null ||
    !isPositiveSafeInteger(regionResizeConstraints["minimumHeaderHeightMpt"]) ||
    !isPositiveSafeInteger(regionResizeConstraints["minimumDepthBodyHeightMpt"]) ||
    !isPositiveSafeInteger(regionResizeConstraints["minimumFooterHeightMpt"])
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
  const patternIds = new Set<string>();
  for (const inputOption of projection["lithologyPatternOptions"]) {
    const option = exactRecord(inputOption, ["patternId", "kind"]);
    if (
      option === null ||
      typeof option["patternId"] !== "string" ||
      option["patternId"].length < 1 ||
      option["patternId"].length > 512 ||
      !["line-hatch", "horizontal-dash", "dot-ring"].includes(String(option["kind"])) ||
      patternIds.has(option["patternId"])
    ) {
      return null;
    }
    patternIds.add(option["patternId"]);
  }
  const lithologyStateIds = new Set<string>();
  for (const inputState of projection["lithologyAppearanceStates"]) {
    const state = exactRecord(inputState, [
      "semanticId",
      "boringLogIdentity",
      "intervalId",
      "classification",
      "mappedClassificationKey",
      "sourceMaterialFillToken",
      "sourceMaterialFillColor",
      "sourcePatternId",
      "effectiveMaterialFillToken",
      "effectiveMaterialFillColor",
      "effectivePatternId",
      "materialFillApplication",
      "patternApplication",
    ]);
    const boundedText = (value: unknown): value is string =>
      typeof value === "string" && value.length >= 1 && value.length <= 512;
    if (
      state === null ||
      !boundedText(state["semanticId"]) ||
      !boundedText(state["boringLogIdentity"]) ||
      !boundedText(state["intervalId"]) ||
      !boundedText(state["classification"]) ||
      !boundedText(state["mappedClassificationKey"]) ||
      !boundedText(state["sourceMaterialFillToken"]) ||
      typeof state["sourceMaterialFillColor"] !== "string" ||
      !/^#[0-9a-f]{6}$/u.test(state["sourceMaterialFillColor"]) ||
      !boundedText(state["sourcePatternId"]) ||
      !boundedText(state["effectiveMaterialFillToken"]) ||
      typeof state["effectiveMaterialFillColor"] !== "string" ||
      !/^#[0-9a-f]{6}$/u.test(state["effectiveMaterialFillColor"]) ||
      !boundedText(state["effectivePatternId"]) ||
      !["source", "classification-default", "interval-override"].includes(
        String(state["materialFillApplication"]),
      ) ||
      !["source", "classification-default", "interval-override"].includes(
        String(state["patternApplication"]),
      ) ||
      !patternIds.has(state["sourcePatternId"]) ||
      !patternIds.has(state["effectivePatternId"]) ||
      lithologyStateIds.has(state["semanticId"])
    ) {
      return null;
    }
    lithologyStateIds.add(state["semanticId"]);
  }
  const visualTokens = new Map<string, string>();
  for (const inputOption of projection["visualTokenOptions"]) {
    const option = exactRecord(inputOption, ["tokenId", "color", "label"]);
    if (
      option === null ||
      !boundedText(option["tokenId"], 128) ||
      typeof option["color"] !== "string" ||
      !/^#[0-9a-f]{6}$/u.test(option["color"]) ||
      !boundedText(option["label"], 256) ||
      visualTokens.has(option["tokenId"])
    ) {
      return null;
    }
    visualTokens.set(option["tokenId"], option["color"]);
  }
  const dataLayerIds = new Set<string>();
  for (const inputState of projection["dataLayerSymbologyStates"]) {
    const state = exactRecord(inputState, [
      "semanticId",
      "layerId",
      "label",
      "kind",
      "source",
      "visible",
      "order",
      "line",
      "point",
      "range",
      "legend",
    ]);
    if (state === null) return null;
    const legend = exactRecord(state["legend"], ["visible", "effectiveVisible", "label"]);
    const range =
      state["range"] === null
        ? null
        : exactRecord(state["range"], ["line", "firstEndpoint", "secondEndpoint"]);
    const kind = state["kind"];
    const topologyMatches =
      kind === "numeric-polyline"
        ? state["range"] === null &&
          validProjectedDataLineSymbol(state["line"], visualTokens) &&
          validProjectedDataPointSymbol(state["point"], visualTokens)
        : kind === "numeric-range" &&
          state["line"] === null &&
          state["point"] === null &&
          range !== null &&
          validProjectedDataLineSymbol(range["line"], visualTokens) &&
          validProjectedDataPointSymbol(range["firstEndpoint"], visualTokens) &&
          validProjectedDataPointSymbol(range["secondEndpoint"], visualTokens);
    if (
      !boundedText(state["semanticId"], 640) ||
      !boundedText(state["layerId"], 512) ||
      state["semanticId"] !== `data-layer:${state["layerId"]}` ||
      !boundedText(state["label"], 256) ||
      !["template-default", "layer-override"].includes(String(state["source"])) ||
      typeof state["visible"] !== "boolean" ||
      !isNonnegativeSafeInteger(state["order"]) ||
      state["order"] > 255 ||
      !topologyMatches ||
      legend === null ||
      typeof legend["visible"] !== "boolean" ||
      typeof legend["effectiveVisible"] !== "boolean" ||
      legend["effectiveVisible"] !== (state["visible"] && legend["visible"]) ||
      !boundedText(legend["label"], 256) ||
      legend["label"] !== state["label"] ||
      dataLayerIds.has(state["layerId"])
    ) {
      return null;
    }
    dataLayerIds.add(state["layerId"]);
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
    const applicationKind =
      typeof value["application"] === "object" && value["application"] !== null
        ? (value["application"] as DataRecord)["kind"]
        : null;
    const application =
      applicationKind === "source"
        ? exactRecord(value["application"], ["kind"])
        : applicationKind === "display-value-override"
          ? exactRecord(value["application"], [
              "kind",
              "presentationOverrideIdentity",
              "localOverrideIdentity",
              "overrideRevision",
            ])
          : null;
    if (
      application === null ||
      (applicationKind === "display-value-override" &&
        (!boundedText(application["presentationOverrideIdentity"], 512) ||
          !boundedText(application["localOverrideIdentity"], 512) ||
          !isPositiveSafeInteger(application["overrideRevision"])))
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
      "connect-rslog",
      "import-rslog-project-data",
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
  const hasFontStyle =
    typeof input === "object" && input !== null && Object.hasOwn(input, "fontStyle");
  const args = exactRecord(input, [
    "expectedWorkingRevision",
    "applyScope",
    ...(hasPropertyMask ? ["propertyMask"] : []),
    "occurrenceNodeId",
    "semanticId",
    "baseStyleId",
    "targets",
    "fontFamilyId",
    ...(hasFontStyle ? ["fontStyle"] : []),
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
  const hasFrameBorder =
    args !== null &&
    typeof args["layout"] === "object" &&
    args["layout"] !== null &&
    Object.hasOwn(args["layout"], "frameBorder");
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
          ...(hasFrameBorder ? ["frameBorder"] : []),
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
        args["propertyMask"].length > 10 ||
        args["propertyMask"].some(
          (property) =>
            ![
              "fontFamilyId",
              "fontStyle",
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
    (hasFontStyle && !["normal", "italic"].includes(String(args["fontStyle"]))) ||
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
    (hasFrameBorder && !validBorderStyle(layout["frameBorder"])) ||
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

const setPageSetup = Object.freeze(async function setPageSetup(input: unknown) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const args = exactRecord(input, [
    "expectedWorkingRevision",
    "paperPreset",
    "orientation",
    "widthMpt",
    "heightMpt",
    "marginsMpt",
  ]);
  const margins =
    args === null
      ? null
      : exactRecord(args["marginsMpt"], ["topMpt", "rightMpt", "bottomMpt", "leftMpt"]);
  if (
    args === null ||
    margins === null ||
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
    !["letter", "a4", "custom"].includes(String(args["paperPreset"])) ||
    !["portrait", "landscape"].includes(String(args["orientation"])) ||
    !isNonnegativeSafeInteger(args["widthMpt"]) ||
    args["widthMpt"] < 216_000 ||
    args["widthMpt"] > 2_000_000 ||
    !isNonnegativeSafeInteger(args["heightMpt"]) ||
    args["heightMpt"] < 216_000 ||
    args["heightMpt"] > 2_000_000 ||
    (args["orientation"] === "portrait" && args["widthMpt"] > args["heightMpt"]) ||
    (args["orientation"] === "landscape" && args["widthMpt"] < args["heightMpt"]) ||
    (args["paperPreset"] === "letter" &&
      (args["widthMpt"] !== (args["orientation"] === "portrait" ? 612_000 : 792_000) ||
        args["heightMpt"] !== (args["orientation"] === "portrait" ? 792_000 : 612_000))) ||
    (args["paperPreset"] === "a4" &&
      (args["widthMpt"] !== (args["orientation"] === "portrait" ? 595_276 : 841_890) ||
        args["heightMpt"] !== (args["orientation"] === "portrait" ? 841_890 : 595_276))) ||
    ["topMpt", "rightMpt", "bottomMpt", "leftMpt"].some(
      (field) => !isNonnegativeSafeInteger(margins[field]) || margins[field] > 2_000_000,
    ) ||
    (margins["leftMpt"] as number) + (margins["rightMpt"] as number) >= args["widthMpt"] ||
    (margins["topMpt"] as number) + (margins["bottomMpt"] as number) >= args["heightMpt"]
  ) {
    return unavailable;
  }
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_SET_PAGE_SETUP_CHANNEL, {
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

const addProviderColumn = Object.freeze(async function addProviderColumn(input: unknown) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const args = exactRecord(input, [
    "expectedWorkingRevision",
    "fieldId",
    "targetRole",
    "referenceColumnId",
    "side",
  ]);
  if (
    args === null ||
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
    typeof args["fieldId"] !== "string" ||
    args["fieldId"].length < 1 ||
    args["fieldId"].length > 256 ||
    ![
      "interval-text-column",
      "lithology-pattern-column",
      "numeric-value-column",
      "point-text-column",
      "remarks-column",
    ].includes(String(args["targetRole"])) ||
    (args["referenceColumnId"] !== null &&
      (typeof args["referenceColumnId"] !== "string" ||
        args["referenceColumnId"].length < 1 ||
        args["referenceColumnId"].length > 128)) ||
    !["before", "after"].includes(String(args["side"]))
  ) {
    return unavailable;
  }
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_ADD_PROVIDER_COLUMN_CHANNEL, {
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

const setColumnHeading = Object.freeze(async function setColumnHeading(input: unknown) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const args = exactRecord(input, ["expectedWorkingRevision", "columnId", "heading"]);
  if (
    args === null ||
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
    typeof args["columnId"] !== "string" ||
    !/^[a-z0-9][a-z0-9-]{0,127}$/u.test(args["columnId"]) ||
    typeof args["heading"] !== "string" ||
    args["heading"].trim().length < 1 ||
    args["heading"].length > 80 ||
    !isWellFormedUnicode(args["heading"])
  ) {
    return unavailable;
  }
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_SET_COLUMN_HEADING_CHANNEL, {
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

const setRegionBoundary = Object.freeze(async function setRegionBoundary(input: unknown) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const hasBorderModeFields =
    typeof input === "object" &&
    input !== null &&
    Object.hasOwn(input, "regionId") &&
    Object.hasOwn(input, "border");
  const args = exactRecord(input, [
    "expectedWorkingRevision",
    "boundary",
    "requestedBoundaryYMpt",
    ...(hasBorderModeFields ? ["regionId", "border"] : []),
  ]);
  const resizeMode =
    args !== null &&
    ["header-depth", "depth-footer"].includes(String(args["boundary"])) &&
    isNonnegativeSafeInteger(args["requestedBoundaryYMpt"]) &&
    (!hasBorderModeFields || (args["regionId"] === null && args["border"] === null));
  const borderMode =
    args !== null &&
    hasBorderModeFields &&
    args["boundary"] === null &&
    args["requestedBoundaryYMpt"] === null &&
    typeof args["regionId"] === "string" &&
    args["regionId"].length > 0 &&
    args["regionId"].length <= 512 &&
    validBorderStyle(args["border"]);
  if (
    args === null ||
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
    (!resizeMode && !borderMode)
  ) {
    return unavailable;
  }
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_SET_REGION_BOUNDARY_CHANNEL, {
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

const setDataDepthConfiguration = Object.freeze(async function setDataDepthConfiguration(
  input: unknown,
) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const args = exactRecord(input, [
    "expectedWorkingRevision",
    "startDepthFt",
    "totalDepthFt",
    "intervalFt",
    "mptPerFoot",
    "nValueGraphMaximum",
  ]);
  if (
    args === null ||
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
    typeof args["startDepthFt"] !== "number" ||
    !Number.isFinite(args["startDepthFt"]) ||
    args["startDepthFt"] < 0 ||
    typeof args["totalDepthFt"] !== "number" ||
    !Number.isFinite(args["totalDepthFt"]) ||
    args["totalDepthFt"] <= args["startDepthFt"] ||
    typeof args["intervalFt"] !== "number" ||
    !Number.isFinite(args["intervalFt"]) ||
    args["intervalFt"] !== args["totalDepthFt"] - args["startDepthFt"] ||
    !isPositiveSafeInteger(args["mptPerFoot"]) ||
    (args["nValueGraphMaximum"] !== null &&
      (!isPositiveSafeInteger(args["nValueGraphMaximum"]) || args["nValueGraphMaximum"] > 1_000))
  )
    return unavailable;
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_SET_DATA_DEPTH_CONFIGURATION_CHANNEL, {
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

const setLithologyAppearance = Object.freeze(async function setLithologyAppearance(input: unknown) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const args = exactRecord(input, [
    "expectedWorkingRevision",
    "boringLogIdentity",
    "intervalId",
    "applyScope",
    "materialFillColor",
    "patternId",
  ]);
  const boundedIdentity = (value: unknown): value is string =>
    typeof value === "string" && value.length >= 1 && value.length <= 512;
  const materialFillColor = args?.["materialFillColor"];
  const patternId = args?.["patternId"];
  if (
    args === null ||
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
    !boundedIdentity(args["boringLogIdentity"]) ||
    !boundedIdentity(args["intervalId"]) ||
    !["interval", "classification-default"].includes(String(args["applyScope"])) ||
    (materialFillColor !== null &&
      (typeof materialFillColor !== "string" || !/^#[0-9a-f]{6}$/u.test(materialFillColor))) ||
    (patternId !== null && !boundedIdentity(patternId)) ||
    (materialFillColor === null && patternId === null)
  ) {
    return unavailable;
  }
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_SET_LITHOLOGY_APPEARANCE_CHANNEL, {
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

const setDataLayerSymbology = Object.freeze(async function setDataLayerSymbology(input: unknown) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const args = exactRecord(input, [
    "expectedWorkingRevision",
    "layerId",
    "applyScope",
    "visible",
    "order",
    "line",
    "point",
    "range",
    "legend",
  ]);
  const validToken = (value: unknown): value is string => boundedText(value, 128);
  const validLine = (value: unknown): boolean => {
    const line = exactRecord(value, ["strokeToken", "strokeWidthMpt", "dashMpt"]);
    const dash = line?.["dashMpt"];
    return (
      line !== null &&
      validToken(line["strokeToken"]) &&
      Number.isSafeInteger(line["strokeWidthMpt"]) &&
      (line["strokeWidthMpt"] as number) >= 100 &&
      (line["strokeWidthMpt"] as number) <= 12_000 &&
      Array.isArray(dash) &&
      dash.length <= 8 &&
      dash.length % 2 === 0 &&
      Object.keys(dash).length === dash.length &&
      dash.every((entry) => isPositiveSafeInteger(entry) && entry <= 72_000)
    );
  };
  const validPoint = (value: unknown): boolean => {
    const point = exactRecord(value, [
      "shape",
      "sizeMpt",
      "fillToken",
      "strokeToken",
      "strokeWidthMpt",
    ]);
    return (
      point !== null &&
      ["square", "triangle", "circle"].includes(String(point["shape"])) &&
      isPositiveSafeInteger(point["sizeMpt"]) &&
      point["sizeMpt"] >= 1_000 &&
      point["sizeMpt"] <= 24_000 &&
      (point["fillToken"] === null || validToken(point["fillToken"])) &&
      validToken(point["strokeToken"]) &&
      isPositiveSafeInteger(point["strokeWidthMpt"]) &&
      point["strokeWidthMpt"] >= 100 &&
      point["strokeWidthMpt"] <= 12_000
    );
  };
  const range =
    args === null ? null : exactRecord(args["range"], ["line", "firstEndpoint", "secondEndpoint"]);
  const legend = args === null ? null : exactRecord(args["legend"], ["visible", "label"]);
  const topologyMatches =
    args !== null &&
    ((args["range"] === null && validLine(args["line"]) && validPoint(args["point"])) ||
      (args["line"] === null &&
        args["point"] === null &&
        range !== null &&
        validLine(range["line"]) &&
        validPoint(range["firstEndpoint"]) &&
        validPoint(range["secondEndpoint"])));
  if (
    args === null ||
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
    !boundedText(args["layerId"], 512) ||
    !["layer", "project-default"].includes(String(args["applyScope"])) ||
    typeof args["visible"] !== "boolean" ||
    !isNonnegativeSafeInteger(args["order"]) ||
    args["order"] > 255 ||
    !topologyMatches ||
    legend === null ||
    typeof legend["visible"] !== "boolean" ||
    !boundedText(legend["label"], 256)
  ) {
    return unavailable;
  }
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_SET_DATA_LAYER_SYMBOLOGY_CHANNEL, {
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

const arrangeTextOccurrences = Object.freeze(async function arrangeTextOccurrences(input: unknown) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const args = exactRecord(input, [
    "expectedWorkingRevision",
    "keyElementId",
    "occurrenceNodeIds",
    "operation",
  ]);
  const operationRecord =
    args !== null && typeof args["operation"] === "object" && args["operation"] !== null
      ? (args["operation"] as DataRecord)
      : null;
  const kind = operationRecord?.["kind"];
  const operation =
    kind === "nudge"
      ? exactRecord(operationRecord, ["kind", "deltaXMpt", "deltaYMpt"])
      : kind === "align"
        ? exactRecord(operationRecord, ["kind", "alignment"])
        : kind === "match-size"
          ? exactRecord(operationRecord, ["kind", "dimension"])
          : kind === "distribute"
            ? exactRecord(operationRecord, ["kind", "distribution"])
            : null;
  const nodeIds = args?.["occurrenceNodeIds"];
  if (
    args === null ||
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
    typeof args["keyElementId"] !== "string" ||
    args["keyElementId"].length < 1 ||
    args["keyElementId"].length > 512 ||
    !Array.isArray(nodeIds) ||
    nodeIds.length < 1 ||
    nodeIds.length > 256 ||
    nodeIds.some(
      (nodeId) => typeof nodeId !== "string" || nodeId.length < 1 || nodeId.length > 512,
    ) ||
    new Set(nodeIds).size !== nodeIds.length ||
    !nodeIds.includes(args["keyElementId"]) ||
    operation === null ||
    (kind === "nudge" &&
      (!Number.isSafeInteger(operation["deltaXMpt"]) ||
        !Number.isSafeInteger(operation["deltaYMpt"]))) ||
    (kind === "align" &&
      !["left", "horizontal-center", "right", "top", "vertical-center", "bottom"].includes(
        String(operation["alignment"]),
      )) ||
    (kind === "match-size" &&
      !["width", "height", "both"].includes(String(operation["dimension"]))) ||
    (kind === "distribute" &&
      !["horizontal-gaps", "vertical-gaps", "horizontal-centers", "vertical-centers"].includes(
        String(operation["distribution"]),
      ))
  ) {
    return unavailable;
  }
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_ARRANGE_TEXT_OCCURRENCES_CHANNEL, {
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

const mutateTextOccurrences = Object.freeze(async function mutateTextOccurrences(input: unknown) {
  if (arguments.length !== 1 || inFlight || sequence >= Number.MAX_SAFE_INTEGER) return unavailable;
  const args = exactRecord(input, ["expectedWorkingRevision", "occurrenceNodeIds", "mutation"]);
  const mutationRecord =
    args !== null && typeof args["mutation"] === "object" && args["mutation"] !== null
      ? (args["mutation"] as DataRecord)
      : null;
  const kind = mutationRecord?.["kind"];
  const mutation =
    kind === "set-visible"
      ? exactRecord(mutationRecord, ["kind", "visible"])
      : kind === "set-locked"
        ? exactRecord(mutationRecord, ["kind", "locked"])
        : kind === "duplicate"
          ? exactRecord(mutationRecord, ["kind", "offsetXMpt", "offsetYMpt"])
          : kind === "group" || kind === "ungroup"
            ? exactRecord(mutationRecord, ["kind"])
            : kind === "reorder"
              ? exactRecord(mutationRecord, ["kind", "placement"])
              : null;
  const nodeIds = args?.["occurrenceNodeIds"];
  if (
    args === null ||
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
    !Array.isArray(nodeIds) ||
    nodeIds.length < 1 ||
    nodeIds.length > 256 ||
    nodeIds.some(
      (nodeId) => typeof nodeId !== "string" || nodeId.length < 1 || nodeId.length > 512,
    ) ||
    new Set(nodeIds).size !== nodeIds.length ||
    mutation === null ||
    (kind === "set-visible" && typeof mutation["visible"] !== "boolean") ||
    (kind === "set-locked" && typeof mutation["locked"] !== "boolean") ||
    (kind === "duplicate" &&
      (!Number.isSafeInteger(mutation["offsetXMpt"]) ||
        !Number.isSafeInteger(mutation["offsetYMpt"]) ||
        Math.abs(mutation["offsetXMpt"] as number) > 792_000 ||
        Math.abs(mutation["offsetYMpt"] as number) > 1_224_000)) ||
    (kind === "reorder" &&
      !["front", "forward", "backward", "back"].includes(String(mutation["placement"])))
  ) {
    return unavailable;
  }
  inFlight = true;
  try {
    const binding = await bootstrap;
    if (binding === null) return unavailable;
    sequence += 1;
    const response = exactRecord(
      await ipcRenderer.invoke(BORING_LOG_STUDIO_MUTATE_TEXT_OCCURRENCES_CHANNEL, {
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
    setPageSetup,
    setColumnDivider,
    addProviderColumn,
    setColumnHeading,
    setRegionBoundary,
    setDataDepthConfiguration,
    setLithologyAppearance,
    setDataLayerSymbology,
    arrangeTextOccurrences,
    mutateTextOccurrences,
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
      record["transportVersion"] !== 2 ||
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

function isWellFormedIdentity(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 512) return false;
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

function hasExactPublicationArrayKeys(input: readonly unknown[]): boolean {
  const keys = Reflect.ownKeys(input);
  if (keys.length !== input.length + 1 || !keys.includes("length")) return false;
  return keys.every(
    (key) =>
      key === "length" ||
      (typeof key === "string" && /^(0|[1-9][0-9]*)$/u.test(key) && Number(key) < input.length),
  );
}

function strictPublicationIdentityList(input: unknown): readonly string[] | null {
  try {
    if (
      !Array.isArray(input) ||
      input.length < 1 ||
      input.length > 64 ||
      !hasExactPublicationArrayKeys(input)
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
        !isWellFormedIdentity(descriptor.value)
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

function validPublicationDigest(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value);
}

function validPublicationPageManifest(
  input: unknown,
  orderedBoringLogIdentities: readonly string[],
  pageCount: number,
): boolean {
  if (!Array.isArray(input) || input.length !== pageCount || !hasExactPublicationArrayKeys(input)) {
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
      !isWellFormedIdentity(page["boringLogIdentity"]) ||
      !orderedBoringLogIdentities.includes(page["boringLogIdentity"]) ||
      !isWellFormedIdentity(page["explorationIdentity"]) ||
      !isPositiveSafeInteger(page["sourceOrdinal"]) ||
      page["sourceOrdinal"] > 64 ||
      !isNonnegativeSafeInteger(page["boringPageIndex"]) ||
      !isWellFormedIdentity(page["pageId"]) ||
      pageIds.has(page["pageId"]) ||
      !isPositiveSafeInteger(page["widthMpt"]) ||
      !isPositiveSafeInteger(page["heightMpt"]) ||
      !validPublicationDigest(page["sceneInputDigest"])
    ) {
      return false;
    }
    const boringLogIdentity = page["boringLogIdentity"];
    const explorationIdentity = page["explorationIdentity"];
    const sourceOrdinal = page["sourceOrdinal"];
    const boringPageIndex = page["boringPageIndex"];
    if (
      (explorationByBoring.has(boringLogIdentity) &&
        explorationByBoring.get(boringLogIdentity) !== explorationIdentity) ||
      (sourceOrdinalByBoring.has(boringLogIdentity) &&
        sourceOrdinalByBoring.get(boringLogIdentity) !== sourceOrdinal) ||
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

const exportPdf = Object.freeze(async function exportPdf(input: unknown) {
  if (
    arguments.length !== 1 ||
    publicationInFlight ||
    publicationSequence >= Number.MAX_SAFE_INTEGER
  ) {
    return publicationUnavailable;
  }
  const args = exactRecord(input, ["expectedWorkingRevision", "orderedBoringLogIdentities"]);
  const orderedBoringLogIdentities =
    args === null ? null : strictPublicationIdentityList(args["orderedBoringLogIdentities"]);
  if (
    args === null ||
    !isNonnegativeSafeInteger(args["expectedWorkingRevision"]) ||
    orderedBoringLogIdentities === null
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
        transportVersion: 2,
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
      response["transportVersion"] !== 2 ||
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
    ]);
    if (
      success === null ||
      success["accepted"] !== true ||
      success["code"] !== "EXPORT_VERIFIED_SUCCESS" ||
      success["workingRevision"] !== args["expectedWorkingRevision"] ||
      !validPublicationDigest(success["packageCandidateDigest"]) ||
      !validPublicationDigest(success["selectionDigest"]) ||
      !validPublicationDigest(success["aggregateSceneDigest"]) ||
      !validPublicationDigest(success["aggregateProjectionDigest"]) ||
      !validPublicationDigest(success["pdfDigest"]) ||
      !Number.isSafeInteger(success["pdfBytes"]) ||
      (success["pdfBytes"] as number) < 1 ||
      !isPositiveSafeInteger(success["pageCount"]) ||
      typeof success["destinationPath"] !== "string" ||
      success["destinationPath"].length < 1 ||
      success["destinationPath"].length > 1_024 ||
      success["taggedPdfTarget"] !== true ||
      success["vectorTextTarget"] !== true
    ) {
      return publicationUnavailable;
    }
    const returnedBoringLogIdentities = strictPublicationIdentityList(
      success["orderedBoringLogIdentities"],
    );
    if (
      returnedBoringLogIdentities === null ||
      returnedBoringLogIdentities.length !== orderedBoringLogIdentities.length ||
      returnedBoringLogIdentities.some(
        (boringLogIdentity, index) => boringLogIdentity !== orderedBoringLogIdentities[index],
      ) ||
      !validPublicationPageManifest(
        success["pageManifest"],
        returnedBoringLogIdentities,
        success["pageCount"],
      )
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
      | "connect-rslog"
      | "import-rslog-project-data"
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
      | "fontStyle"
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
    readonly fontStyle?: "normal" | "italic";
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
      readonly frameBorder?: Readonly<{
        readonly top: boolean;
        readonly right: boolean;
        readonly bottom: boolean;
        readonly left: boolean;
        readonly color: string;
        readonly widthMpt: number;
        readonly linePattern: "solid" | "dashed" | "dotted" | "dash-dot";
      }>;
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
  readonly setPageSetup: (input: {
    readonly expectedWorkingRevision: number;
    readonly paperPreset: "letter" | "a4" | "custom";
    readonly orientation: "portrait" | "landscape";
    readonly widthMpt: number;
    readonly heightMpt: number;
    readonly marginsMpt: Readonly<{
      readonly topMpt: number;
      readonly rightMpt: number;
      readonly bottomMpt: number;
      readonly leftMpt: number;
    }>;
  }) => Promise<unknown>;
  readonly setColumnDivider: (input: {
    readonly expectedWorkingRevision: number;
    readonly dividerAfterColumnId: string;
    readonly requestedDividerXMpt: number;
    readonly resizeMode: "adjacent-pair" | "push-following-columns";
  }) => Promise<unknown>;
  readonly addProviderColumn: (input: {
    readonly expectedWorkingRevision: number;
    readonly fieldId: string;
    readonly targetRole:
      | "interval-text-column"
      | "lithology-pattern-column"
      | "numeric-value-column"
      | "point-text-column"
      | "remarks-column";
    readonly referenceColumnId: string | null;
    readonly side: "before" | "after";
  }) => Promise<unknown>;
  readonly setColumnHeading: (input: {
    readonly expectedWorkingRevision: number;
    readonly columnId: string;
    readonly heading: string;
  }) => Promise<unknown>;
  readonly setRegionBoundary: (input: {
    readonly expectedWorkingRevision: number;
    readonly boundary: "header-depth" | "depth-footer" | null;
    readonly requestedBoundaryYMpt: number | null;
    readonly regionId: string | null;
    readonly border: Readonly<{
      readonly top: boolean;
      readonly right: boolean;
      readonly bottom: boolean;
      readonly left: boolean;
      readonly color: string;
      readonly widthMpt: number;
      readonly linePattern: "solid" | "dashed" | "dotted" | "dash-dot";
    }> | null;
  }) => Promise<unknown>;
  readonly setDataDepthConfiguration: (input: {
    readonly expectedWorkingRevision: number;
    readonly startDepthFt: number;
    readonly totalDepthFt: number;
    readonly intervalFt: number;
    readonly mptPerFoot: number;
    readonly nValueGraphMaximum: number | null;
  }) => Promise<unknown>;
  readonly setLithologyAppearance: (input: {
    readonly expectedWorkingRevision: number;
    readonly boringLogIdentity: string;
    readonly intervalId: string;
    readonly applyScope: "interval" | "classification-default";
    readonly materialFillColor: string | null;
    readonly patternId: string | null;
  }) => Promise<unknown>;
  readonly setDataLayerSymbology: (input: {
    readonly expectedWorkingRevision: number;
    readonly layerId: string;
    readonly applyScope: "layer" | "project-default";
    readonly visible: boolean;
    readonly order: number;
    readonly line: Readonly<{
      readonly strokeToken: string;
      readonly strokeWidthMpt: number;
      readonly dashMpt: readonly number[];
    }> | null;
    readonly point: Readonly<{
      readonly shape: "square" | "triangle" | "circle";
      readonly sizeMpt: number;
      readonly fillToken: string | null;
      readonly strokeToken: string;
      readonly strokeWidthMpt: number;
    }> | null;
    readonly range: Readonly<{
      readonly line: Readonly<{
        readonly strokeToken: string;
        readonly strokeWidthMpt: number;
        readonly dashMpt: readonly number[];
      }>;
      readonly firstEndpoint: Readonly<{
        readonly shape: "square" | "triangle" | "circle";
        readonly sizeMpt: number;
        readonly fillToken: string | null;
        readonly strokeToken: string;
        readonly strokeWidthMpt: number;
      }>;
      readonly secondEndpoint: Readonly<{
        readonly shape: "square" | "triangle" | "circle";
        readonly sizeMpt: number;
        readonly fillToken: string | null;
        readonly strokeToken: string;
        readonly strokeWidthMpt: number;
      }>;
    }> | null;
    readonly legend: Readonly<{ readonly visible: boolean; readonly label: string }>;
  }) => Promise<unknown>;
  readonly arrangeTextOccurrences: (input: {
    readonly expectedWorkingRevision: number;
    readonly keyElementId: string;
    readonly occurrenceNodeIds: readonly string[];
    readonly operation:
      | Readonly<{
          readonly kind: "nudge";
          readonly deltaXMpt: number;
          readonly deltaYMpt: number;
        }>
      | Readonly<{
          readonly kind: "align";
          readonly alignment:
            "left" | "horizontal-center" | "right" | "top" | "vertical-center" | "bottom";
        }>
      | Readonly<{
          readonly kind: "match-size";
          readonly dimension: "width" | "height" | "both";
        }>
      | Readonly<{
          readonly kind: "distribute";
          readonly distribution:
            "horizontal-gaps" | "vertical-gaps" | "horizontal-centers" | "vertical-centers";
        }>;
  }) => Promise<unknown>;
  readonly mutateTextOccurrences: (input: {
    readonly expectedWorkingRevision: number;
    readonly occurrenceNodeIds: readonly string[];
    readonly mutation:
      | Readonly<{ readonly kind: "set-visible"; readonly visible: boolean }>
      | Readonly<{ readonly kind: "set-locked"; readonly locked: boolean }>
      | Readonly<{
          readonly kind: "duplicate";
          readonly offsetXMpt: number;
          readonly offsetYMpt: number;
        }>
      | Readonly<{ readonly kind: "group" | "ungroup" }>
      | Readonly<{
          readonly kind: "reorder";
          readonly placement: "front" | "forward" | "backward" | "back";
        }>;
  }) => Promise<unknown>;
}

export interface BoringLogPublicationPreloadApi {
  readonly exportPdf: (input: BoringLogPublicationIntent) => Promise<
    | { readonly accepted: false; readonly code: string }
    | {
        readonly accepted: true;
        readonly result: Extract<BoringLogPublicationOutcome, { readonly accepted: true }>;
      }
  >;
}
