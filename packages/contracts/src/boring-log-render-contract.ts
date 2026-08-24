import { isMpt } from "./physical-length.js";
import { isSha256Digest } from "./sha256.js";
import { isWellFormedUnicode } from "./unicode.js";
import type { Mpt } from "./physical-length.js";
import type { Sha256Digest } from "./sha256.js";

export const boringLogRenderContractVersion = 1 as const;
export const boringLogRenderContractRevision = "bld-023-v1" as const;

export function boringLogTextColumnSemanticId(
  node: Readonly<{ readonly semanticId: string; readonly role: string }>,
): string | null {
  if (node.role === "log-column-heading" && node.semanticId.startsWith("column-")) {
    return node.semanticId;
  }
  const columnByRole: Readonly<Record<string, string>> = Object.freeze({
    "elevation-label": "column-elevation",
    "depth-label": "column-depth",
    "material-description-interval": "column-description",
    "material-transition-text": "column-description",
    "log-completion-note": "column-description",
    "sample-label": "column-sample",
    "sample-recovery": "column-recovery",
    "sample-blows": "column-blows",
    "sample-n-value": "column-n-value",
    "data-axis-grid-label": "column-data-track",
    "remark-interval": "column-remarks",
  });
  return columnByRole[node.role] ?? null;
}
export const boringLogLayoutJobSchemaVersion = "rsrender.boring-log-layout-job.v1" as const;
export const boringLogPagePlanSchemaVersion = "rsrender.boring-log-page-plan.v1" as const;
export const resolvedBoringLogPageSceneSchemaVersion =
  "rsrender.resolved-boring-log-page-scene.v1" as const;

export type BoringLogRenderContractRejectionCode =
  | "BORING_LOG_CONTRACT_MALFORMED"
  | "BORING_LOG_CONTRACT_EXTRA_FIELD"
  | "BORING_LOG_CONTRACT_MISSING_FIELD"
  | "BORING_LOG_CONTRACT_WRONG_TYPE"
  | "BORING_LOG_CONTRACT_UNSUPPORTED_VERSION"
  | "BORING_LOG_CONTRACT_DUPLICATE_IDENTITY"
  | "BORING_LOG_CONTRACT_BROKEN_REFERENCE"
  | "BORING_LOG_CONTRACT_INVALID_GEOMETRY"
  | "BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE"
  | "BORING_LOG_CONTRACT_INVALID_ORDER"
  | "BORING_LOG_CONTRACT_INCOMPATIBLE_AXIS"
  | "BORING_LOG_CONTRACT_FORBIDDEN_RASTER";

export interface MptPoint {
  readonly xMpt: Mpt;
  readonly yMpt: Mpt;
}

export interface MptRect extends MptPoint {
  readonly widthMpt: Mpt;
  readonly heightMpt: Mpt;
}

export interface BoringLogDepthRange {
  readonly startFt: number;
  readonly endFt: number;
  readonly terminalInclusive: boolean;
}

export interface BoringLogSourceProvenance {
  readonly provenanceClass: "source";
  readonly sourceContextIdentity: string;
  readonly sourceProjectIdentity: string;
  readonly sourceEntityIdentity: string;
  readonly sourceFieldIdentity: string;
  readonly sourceContractRevision: string;
}

export interface BoringLogEffectiveOverrideProvenance {
  readonly provenanceClass: "effective-override";
  readonly original: BoringLogSourceProvenance;
  readonly overrideIdentity: string;
  readonly overrideRevision: number;
  readonly transformation: "replace-display-value" | "replace-style-token" | "replace-layout-value";
}

export type BoringLogValueProvenance =
  BoringLogSourceProvenance | BoringLogEffectiveOverrideProvenance;

export interface BoringLogTextStyleInput {
  readonly id: string;
  readonly fontFamilyId: string;
  readonly fontSizeMpt: Mpt;
  readonly fontWeight: number;
  readonly lineHeightMpt: Mpt;
  /** Absent only in legacy v1 resources, where zero is the exact default. */
  readonly letterSpacingMpt?: Mpt;
  /** Absent only in legacy v1 resources, where zero is the exact default. */
  readonly wordSpacingMpt?: Mpt;
  /** Added after an explicit paragraph break; absent legacy value is zero. */
  readonly paragraphSpacingMpt?: Mpt;
  readonly color: string;
  /** Absent only in legacy v1 resources, where none is the exact default. */
  readonly textDecoration?: "none" | "underline" | "line-through" | "underline line-through";
}

export type BoringLogTextFrameAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface BoringLogTextOccurrenceLayoutInput {
  readonly id: string;
  readonly frame: MptRect;
  /** Absent only in legacy v1 projects, where top-left is the exact default. */
  readonly frameAnchor?: BoringLogTextFrameAnchor;
  readonly paddingMpt: {
    readonly topMpt: Mpt;
    readonly rightMpt: Mpt;
    readonly bottomMpt: Mpt;
    readonly leftMpt: Mpt;
  };
  readonly horizontalAlignment: "start" | "center" | "end";
  readonly verticalAlignment: "top" | "middle" | "bottom";
  readonly wrapPolicy: "word-v1" | "no-wrap";
  readonly overflowPolicy: "clip-with-diagnostic" | "shrink-to-minimum";
  /** Required for shrink-to-minimum; absent only for legacy clip-only layouts. */
  readonly minimumFontSizeMpt?: Mpt;
  /** All three frame-style fields are absent in legacy v1 layouts, meaning no visible frame. */
  readonly frameFillColor?: string | null;
  readonly frameStrokeColor?: string | null;
  readonly frameStrokeWidthMpt?: Mpt;
  readonly rotationMilliDegrees: number;
  readonly positionMode: "depth-bound" | "free";
  readonly locked: boolean;
  /** Absent in legacy projects and equivalent to visible. */
  readonly visible?: boolean;
  /** Signed stable sibling-order bias; absent in legacy projects and equivalent to zero. */
  readonly drawingOrderOffset?: number;
}

export interface BoringLogTemplateRegionInput extends MptRect {
  readonly id: string;
  readonly role: "header" | "depth-body" | "footer";
}

export interface BoringLogColumnInput {
  readonly id: string;
  readonly role: string;
  readonly xMpt: Mpt;
  readonly widthMpt: Mpt;
}

export interface BoringLogPageGuideInput {
  readonly id: string;
  readonly orientation: "horizontal" | "vertical";
  readonly positionMpt: Mpt;
  readonly locked: boolean;
}

export interface BoringLogTextOccurrenceCloneInput {
  readonly cloneNodeId: string;
  readonly sourceOccurrenceNodeId: string;
  readonly semanticId: string;
  readonly offsetXMpt: Mpt;
  readonly offsetYMpt: Mpt;
}

export interface BoringLogDepthTransformInput {
  readonly regionId: string;
  readonly depthStartFt: number;
  readonly depthEndFt: number;
  readonly yStartMpt: Mpt;
  readonly yEndMpt: Mpt;
  readonly mptPerFoot: Mpt;
}

export interface BoringLogTemplateHierarchyNode {
  readonly id: string;
  readonly role: string;
  readonly children: readonly (string | BoringLogTemplateHierarchyNode)[];
}

export interface BoringLogTemplateBindingInput {
  readonly elementId: string;
  readonly path: string;
  readonly styleId: string;
}

export interface BoringLogTemplateInput {
  readonly schemaVersion: "rsrender.boring-log-mvp-template.v1";
  readonly templateId: string;
  readonly templateRevision: number;
  readonly physicalUnits: "mpt";
  readonly page: {
    readonly widthMpt: Mpt;
    readonly heightMpt: Mpt;
    readonly orientation: "portrait" | "landscape";
  };
  readonly regions: readonly BoringLogTemplateRegionInput[];
  readonly depthTransform: BoringLogDepthTransformInput;
  /** Present only when the fixed-scale transform continues across physical pages. */
  readonly pagination?: {
    readonly policy: "fixed-scale-continuation-v1";
    readonly yEndLimitMpt: Mpt;
  };
  readonly columns: readonly BoringLogColumnInput[];
  readonly styles: readonly BoringLogTextStyleInput[];
  readonly occurrenceLayouts?: readonly BoringLogTextOccurrenceLayoutInput[];
  /** Persisted structured duplicates; each clone receives its own measurement and scene identity. */
  readonly textOccurrenceClones?: readonly BoringLogTextOccurrenceCloneInput[];
  /** Nonprinting layout guides. Absent in legacy v1 templates. */
  readonly guides?: readonly BoringLogPageGuideInput[];
  readonly hierarchy: BoringLogTemplateHierarchyNode;
  readonly bindings: readonly BoringLogTemplateBindingInput[];
  readonly visualTokens: Readonly<Record<string, string>>;
}

export interface BoringLogDataAxisInput {
  readonly id: string;
  readonly quantity: string;
  readonly unit: string;
  readonly minimum: number;
  readonly maximum: number;
}

export interface BoringLogNumericPolylineLayerInput {
  readonly id: string;
  readonly kind: "numeric-polyline";
  readonly axisId: string;
  readonly glyph: string;
  readonly values: readonly (readonly [sampleId: string, value: number])[];
  readonly provenance: BoringLogValueProvenance;
}

export interface BoringLogNumericRangeLayerInput {
  readonly id: string;
  readonly kind: "numeric-range";
  readonly axisId: string;
  readonly glyph: string;
  readonly values: readonly (readonly [sampleId: string, upper: number, lower: number])[];
  readonly provenance: BoringLogValueProvenance;
}

export type BoringLogDataLayerInput =
  BoringLogNumericPolylineLayerInput | BoringLogNumericRangeLayerInput;

export interface BoringLogMetadataInput {
  readonly companyName: string;
  readonly companyContactSubtitle: string;
  readonly documentTitle: string;
  readonly sheetLabel: string;
  readonly clientName: string;
  readonly projectName: string;
  readonly projectNumber: string;
  readonly location: string;
  readonly coordinates: string;
  readonly coordinateDatum: string;
  readonly groundElevationFt: number;
  readonly elevationDatum: string;
  readonly totalDepthFt: number;
  readonly completionDepthFt: number;
  readonly drilledDate: string;
  readonly boringMethod: string;
  readonly holeDiameter: string;
  readonly rigDriller: string;
  readonly hammerType: string;
  readonly hammerDrop: string;
  readonly hammerEfficiency: string;
  readonly loggedBy: string;
  readonly checkedBy: string;
  readonly groundwaterSummary: string;
  readonly provenance: BoringLogValueProvenance;
}

export interface BoringLogLithologyTransitionInput {
  readonly depthFt: number;
  readonly text: string;
}

export interface BoringLogLithologyIntervalInput {
  readonly id: string;
  readonly depthFromFt: number;
  readonly depthToFt: number;
  readonly classification: string;
  readonly patternId: string;
  readonly materialFillToken: string;
  readonly description: string;
  readonly transitions: readonly BoringLogLithologyTransitionInput[];
  readonly boundaryKind: "observed" | "gradational";
  readonly provenance: BoringLogValueProvenance;
}

export interface BoringLogSampleInput {
  readonly id: string;
  readonly label: string;
  readonly depthFt: number;
  readonly symbol: string;
  readonly recoveryPercent: number;
  readonly blowIncrements: readonly {
    readonly blows: number;
    readonly penetrationInches: number;
  }[];
  readonly nValue: number | null;
  readonly refusal: boolean;
  readonly provenance: BoringLogValueProvenance;
}

export interface BoringLogRemarkInput {
  readonly id: string;
  readonly depthFromFt: number;
  readonly depthToFt: number;
  readonly text: string;
}

export interface BoringLogLegendInput {
  readonly id: string;
  readonly label: string;
  readonly symbol: string;
}

export interface BoringLogApprovalInput {
  readonly heading: string;
  readonly sealPlaceholder: string;
  readonly reviewerName: string;
  readonly reviewedDate: string;
}

export interface BoringLogDocumentInput {
  readonly schemaVersion: "rsrender.boring-log-mvp-fixture.v1";
  readonly fixtureId: string;
  readonly fixtureRevision: number;
  readonly evidenceClass: "synthetic-coverage-only";
  readonly representativeClaimAllowed: false;
  readonly publicationEligibility: "example-dataset-only";
  readonly identity: Readonly<Record<"boringLogId" | "explorationId" | "pageId", string>>;
  readonly metadata: BoringLogMetadataInput;
  readonly referenceDepthRange: BoringLogDepthRange;
  readonly lithologyIntervals: readonly BoringLogLithologyIntervalInput[];
  readonly samples: readonly BoringLogSampleInput[];
  readonly dataTrack: {
    readonly id: string;
    readonly depthRange: { readonly startFt: number; readonly endFt: number };
    readonly axes: readonly BoringLogDataAxisInput[];
    readonly layers: readonly BoringLogDataLayerInput[];
  };
  readonly remarks: readonly BoringLogRemarkInput[];
  readonly legend: readonly BoringLogLegendInput[];
  readonly notes: readonly string[];
  readonly approval: BoringLogApprovalInput;
}

export interface BoringLogLayoutJobInput {
  readonly contractVersion: 1;
  readonly schemaVersion: "rsrender.boring-log-layout-job.v1";
  readonly kind: "boring-log.layout-job";
  readonly jobId: string;
  readonly inputRevision: number;
  readonly fixtureDigest: Sha256Digest;
  readonly templateDigest: Sha256Digest;
  readonly document: BoringLogDocumentInput;
  readonly template: BoringLogTemplateInput;
}

export interface BoringLogPlannedRegion extends MptRect {
  readonly id: string;
  readonly role: string;
}

export interface BoringLogPlannedColumn {
  readonly id: string;
  readonly role: string;
  readonly xMpt: Mpt;
  readonly widthMpt: Mpt;
}

export interface BoringLogPlannedPage {
  readonly pageId: string;
  readonly pageIndex: number;
  readonly widthMpt: Mpt;
  readonly heightMpt: Mpt;
  readonly depthRange: BoringLogDepthRange;
  readonly depthTransform: BoringLogDepthTransformInput;
  readonly regions: readonly BoringLogPlannedRegion[];
  readonly columns: readonly BoringLogPlannedColumn[];
  readonly semanticOrder: readonly string[];
}

export interface BoringLogPagePlan {
  readonly contractVersion: 1;
  readonly schemaVersion: "rsrender.boring-log-page-plan.v1";
  readonly kind: "boring-log.page-plan";
  readonly jobId: string;
  readonly inputDigest: Sha256Digest;
  readonly pages: readonly BoringLogPlannedPage[];
  readonly overflow: "none" | "continued" | "clipped-with-diagnostic";
  readonly diagnostics: readonly BoringLogRenderDiagnostic[];
}

export interface BoringLogTextMeasurementRequest {
  readonly measurementId: string;
  readonly text: string;
  readonly sourceIdentity: string;
  readonly sourceStartUtf16: number;
  readonly sourceEndUtf16: number;
  readonly fontFamilyId: string;
  readonly fontSizeMpt: Mpt;
  readonly fontWeight: number;
  readonly lineHeightMpt: Mpt;
  readonly letterSpacingMpt?: Mpt;
  readonly wordSpacingMpt?: Mpt;
  readonly paragraphSpacingMpt?: Mpt;
  readonly maximumWidthMpt: Mpt;
  readonly maximumHeightMpt: Mpt;
  readonly maximumLines: number;
  readonly wrapPolicy: "word-v1" | "no-wrap";
  readonly overflowPolicy: "clip-with-diagnostic" | "shrink-to-minimum";
  readonly minimumFontSizeMpt: Mpt;
}

export interface BoringLogResolvedTextLine {
  readonly text: string;
  readonly sourceStartUtf16: number;
  readonly sourceEndUtf16: number;
  readonly xMpt: Mpt;
  readonly baselineMpt: Mpt;
  readonly advanceMpt: Mpt;
}

export interface BoringLogTextMeasurementResult {
  readonly measurementId: string;
  readonly fontFaceDigest: Sha256Digest;
  readonly fontMetricsDigest: Sha256Digest;
  readonly logicalBounds: MptRect;
  readonly inkBounds: MptRect;
  readonly lines: readonly BoringLogResolvedTextLine[];
  readonly overflow: "none" | "ellipsized" | "clipped" | "continued";
  readonly effectiveFontSizeMpt: Mpt;
  readonly effectiveLineHeightMpt: Mpt;
}

interface BoringLogSceneNodeBase {
  readonly id: string;
  readonly semanticId: string;
  readonly parentId: string | null;
  readonly role: string;
  readonly order: number;
  readonly provenance: BoringLogValueProvenance | null;
}

export interface BoringLogSceneGroupNode extends BoringLogSceneNodeBase {
  readonly kind: "group";
  readonly bounds: MptRect;
  readonly childIds: readonly string[];
}

export interface BoringLogSceneRectNode extends BoringLogSceneNodeBase {
  readonly kind: "rect";
  readonly bounds: MptRect;
  readonly fillToken: string | null;
  readonly strokeToken: string | null;
  readonly strokeWidthMpt: Mpt;
}

export interface BoringLogSceneLineNode extends BoringLogSceneNodeBase {
  readonly kind: "line";
  readonly from: MptPoint;
  readonly to: MptPoint;
  readonly strokeToken: string;
  readonly strokeWidthMpt: Mpt;
  readonly dashMpt: readonly Mpt[];
}

export interface BoringLogScenePathNode extends BoringLogSceneNodeBase {
  readonly kind: "path";
  readonly points: readonly MptPoint[];
  readonly closed: boolean;
  readonly fillToken: string | null;
  readonly strokeToken: string | null;
  readonly strokeWidthMpt: Mpt;
  readonly dashMpt: readonly Mpt[];
}

export interface BoringLogSceneCircleNode extends BoringLogSceneNodeBase {
  readonly kind: "circle";
  readonly center: MptPoint;
  readonly radiusMpt: Mpt;
  readonly fillToken: string | null;
  readonly strokeToken: string | null;
  readonly strokeWidthMpt: Mpt;
}

export interface BoringLogSceneTextNode extends BoringLogSceneNodeBase {
  readonly kind: "text";
  readonly measurementId: string;
  readonly styleId: string;
  readonly content: string;
  readonly frame: MptRect;
  readonly presentation?: Omit<BoringLogTextOccurrenceLayoutInput, "id" | "frame">;
}

export type BoringLogSceneNode =
  | BoringLogSceneGroupNode
  | BoringLogSceneRectNode
  | BoringLogSceneLineNode
  | BoringLogScenePathNode
  | BoringLogSceneCircleNode
  | BoringLogSceneTextNode;

export interface BoringLogRenderDiagnostic {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
  readonly semanticId: string | null;
}

export interface BoringLogVectorPatternResource {
  readonly id: string;
  readonly kind: "line-hatch" | "horizontal-dash" | "dot-ring";
  readonly foregroundToken: string;
  readonly backgroundToken: string;
  readonly spacingMpt: Mpt;
  readonly markSizeMpt: Mpt;
  readonly strokeWidthMpt: Mpt;
}

export interface BoringLogSceneResources {
  readonly visualTokens: Readonly<Record<string, string>>;
  readonly textStyles: readonly BoringLogTextStyleInput[];
  readonly patterns: readonly BoringLogVectorPatternResource[];
}

export interface ResolvedBoringLogPageScene {
  readonly contractVersion: 1;
  readonly schemaVersion: "rsrender.resolved-boring-log-page-scene.v1";
  readonly kind: "boring-log.resolved-page-scene";
  readonly jobId: string;
  readonly inputDigest: Sha256Digest;
  readonly pagePlan: BoringLogPagePlan;
  readonly textRequests: readonly BoringLogTextMeasurementRequest[];
  readonly textResults: readonly BoringLogTextMeasurementResult[];
  readonly resources: BoringLogSceneResources;
  readonly pages: readonly {
    readonly pageId: string;
    readonly widthMpt: Mpt;
    readonly heightMpt: Mpt;
    readonly rootNodeId: string;
    readonly semanticOrder: readonly string[];
    readonly nodes: readonly BoringLogSceneNode[];
  }[];
  readonly diagnostics: readonly BoringLogRenderDiagnostic[];
}

export type BoringLogRenderContractResult<Value> =
  | { readonly accepted: true; readonly value: Value }
  | { readonly accepted: false; readonly code: BoringLogRenderContractRejectionCode };

class ContractFailure extends Error {
  public constructor(public readonly code: BoringLogRenderContractRejectionCode) {
    super(code);
  }
}

type DataRecord = Record<string, unknown>;

function fail(code: BoringLogRenderContractRejectionCode): never {
  throw new ContractFailure(code);
}

function record(input: unknown, keys: readonly string[]): DataRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("BORING_LOG_CONTRACT_MALFORMED");
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("BORING_LOG_CONTRACT_MALFORMED");
  }
  const ownKeys = Reflect.ownKeys(input);
  if (ownKeys.some((key) => typeof key !== "string")) {
    return fail("BORING_LOG_CONTRACT_EXTRA_FIELD");
  }
  for (const key of ownKeys as string[]) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      return fail("BORING_LOG_CONTRACT_MALFORMED");
    }
    if (!keys.includes(key)) return fail("BORING_LOG_CONTRACT_EXTRA_FIELD");
  }
  if (keys.some((key) => !Object.hasOwn(input, key))) {
    return fail("BORING_LOG_CONTRACT_MISSING_FIELD");
  }
  return input as DataRecord;
}

function array(input: unknown): readonly unknown[] {
  if (!Array.isArray(input)) return fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  return input;
}

function textValue(input: unknown, allowEmpty = false): string {
  if (
    typeof input !== "string" ||
    (!allowEmpty && input.length === 0) ||
    !isWellFormedUnicode(input)
  ) {
    return fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
  return input;
}

function finite(input: unknown): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
  return input;
}

function nonnegativeInteger(input: unknown): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < 0) {
    return fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
  return input;
}

function mpt(input: unknown): Mpt {
  if (!isMpt(input)) return fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
  return input;
}

function literal<Value extends string | number | boolean>(input: unknown, value: Value): Value {
  if (!Object.is(input, value)) return fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  return value;
}

function nullableText(input: unknown): string | null {
  return input === null ? null : textValue(input);
}

function validatePoint(input: unknown): void {
  const value = record(input, ["xMpt", "yMpt"]);
  mpt(value["xMpt"]);
  mpt(value["yMpt"]);
}

function validateRect(input: unknown): void {
  const value = record(input, ["xMpt", "yMpt", "widthMpt", "heightMpt"]);
  mpt(value["xMpt"]);
  mpt(value["yMpt"]);
  if (mpt(value["widthMpt"]) < 0 || mpt(value["heightMpt"]) < 0) {
    fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
  }
}

function validateProvenance(input: unknown): void {
  const tagged = recordWithTag(input, "provenanceClass");
  if (tagged.tag === "source") {
    const value = record(input, [
      "provenanceClass",
      "sourceContextIdentity",
      "sourceProjectIdentity",
      "sourceEntityIdentity",
      "sourceFieldIdentity",
      "sourceContractRevision",
    ]);
    for (const key of Object.keys(value).filter((key) => key !== "provenanceClass")) {
      textValue(value[key]);
    }
    return;
  }
  if (tagged.tag === "effective-override") {
    const value = record(input, [
      "provenanceClass",
      "original",
      "overrideIdentity",
      "overrideRevision",
      "transformation",
    ]);
    validateProvenance(value["original"]);
    if ((value["original"] as DataRecord)["provenanceClass"] !== "source") {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    textValue(value["overrideIdentity"]);
    nonnegativeInteger(value["overrideRevision"]);
    if (
      !["replace-display-value", "replace-style-token", "replace-layout-value"].includes(
        textValue(value["transformation"]),
      )
    ) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    return;
  }
  fail("BORING_LOG_CONTRACT_WRONG_TYPE");
}

function recordWithTag(input: unknown, tagName: string): { record: DataRecord; tag: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("BORING_LOG_CONTRACT_MALFORMED");
  }
  const value = input as DataRecord;
  if (!Object.hasOwn(value, tagName)) return fail("BORING_LOG_CONTRACT_MISSING_FIELD");
  return { record: value, tag: textValue(value[tagName]) };
}

function validateStringMap(input: unknown): void {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) fail("BORING_LOG_CONTRACT_MALFORMED");
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") fail("BORING_LOG_CONTRACT_EXTRA_FIELD");
    textValue(key);
    textValue((input as DataRecord)[key]);
  }
}

function assertNoForbiddenRaster(input: unknown): void {
  if (Array.isArray(input)) {
    for (const child of input) assertNoForbiddenRaster(child);
    return;
  }
  if (typeof input !== "object" || input === null) return;
  for (const [key, child] of Object.entries(input)) {
    if (/(?:image|raster|screenshot|dataurl|href|src)/iu.test(key)) {
      fail("BORING_LOG_CONTRACT_FORBIDDEN_RASTER");
    }
    if (
      typeof child === "string" &&
      /(?:data:image\/|\.png(?:$|[?#])|\.jpe?g(?:$|[?#])|\.webp(?:$|[?#]))/iu.test(child)
    ) {
      fail("BORING_LOG_CONTRACT_FORBIDDEN_RASTER");
    }
    assertNoForbiddenRaster(child);
  }
}

function unique(values: readonly string[]): void {
  if (new Set(values).size !== values.length) fail("BORING_LOG_CONTRACT_DUPLICATE_IDENTITY");
}

function validateDepthRange(input: unknown, terminalRequired: boolean): void {
  const keys = terminalRequired ? ["startFt", "endFt", "terminalInclusive"] : ["startFt", "endFt"];
  const value = record(input, keys);
  const start = finite(value["startFt"]);
  const end = finite(value["endFt"]);
  if (terminalRequired && typeof value["terminalInclusive"] !== "boolean") {
    fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
  if (start < 0 || end <= start) fail("BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE");
}

function validateTemplateHierarchy(input: unknown, ids: string[], leafIds: string[]): void {
  const value = record(input, ["id", "role", "children"]);
  ids.push(textValue(value["id"]));
  textValue(value["role"]);
  for (const child of array(value["children"])) {
    if (typeof child === "string") leafIds.push(textValue(child));
    else validateTemplateHierarchy(child, ids, leafIds);
  }
}

function validateTemplate(input: unknown): void {
  const hasOccurrenceLayouts =
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    Object.hasOwn(input, "occurrenceLayouts");
  const hasGuides =
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    Object.hasOwn(input, "guides");
  const hasTextOccurrenceClones =
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    Object.hasOwn(input, "textOccurrenceClones");
  const hasPagination =
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    Object.hasOwn(input, "pagination");
  const value = record(input, [
    "schemaVersion",
    "templateId",
    "templateRevision",
    "physicalUnits",
    "page",
    "regions",
    "depthTransform",
    ...(hasPagination ? ["pagination"] : []),
    "columns",
    "styles",
    ...(hasOccurrenceLayouts ? ["occurrenceLayouts"] : []),
    ...(hasTextOccurrenceClones ? ["textOccurrenceClones"] : []),
    ...(hasGuides ? ["guides"] : []),
    "hierarchy",
    "bindings",
    "visualTokens",
  ]);
  literal(value["schemaVersion"], "rsrender.boring-log-mvp-template.v1");
  textValue(value["templateId"]);
  nonnegativeInteger(value["templateRevision"]);
  literal(value["physicalUnits"], "mpt");
  const page = record(value["page"], ["widthMpt", "heightMpt", "orientation"]);
  const pageWidth = mpt(page["widthMpt"]);
  const pageHeight = mpt(page["heightMpt"]);
  if (pageWidth <= 0 || pageHeight <= 0) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
  if (!["portrait", "landscape"].includes(textValue(page["orientation"]))) {
    fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
  const regionIds: string[] = [];
  for (const regionInput of array(value["regions"])) {
    const region = record(regionInput, ["id", "role", "xMpt", "yMpt", "widthMpt", "heightMpt"]);
    regionIds.push(textValue(region["id"]));
    if (!["header", "depth-body", "footer"].includes(textValue(region["role"]))) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    const x = mpt(region["xMpt"]);
    const y = mpt(region["yMpt"]);
    const width = mpt(region["widthMpt"]);
    const height = mpt(region["heightMpt"]);
    if (
      width <= 0 ||
      height <= 0 ||
      x < 0 ||
      y < 0 ||
      x + width > pageWidth ||
      y + height > pageHeight
    ) {
      fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    }
  }
  unique(regionIds);
  const transform = record(value["depthTransform"], [
    "regionId",
    "depthStartFt",
    "depthEndFt",
    "yStartMpt",
    "yEndMpt",
    "mptPerFoot",
  ]);
  if (!regionIds.includes(textValue(transform["regionId"])))
    fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
  const depthStart = finite(transform["depthStartFt"]);
  const depthEnd = finite(transform["depthEndFt"]);
  const yStart = mpt(transform["yStartMpt"]);
  const yEnd = mpt(transform["yEndMpt"]);
  const scale = mpt(transform["mptPerFoot"]);
  if (depthStart < 0 || depthEnd <= depthStart || yEnd <= yStart || scale <= 0) {
    fail("BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE");
  }
  if (Math.abs(yStart + (depthEnd - depthStart) * scale - yEnd) > 1) {
    fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
  }
  const depthBody = (value["regions"] as readonly DataRecord[]).find(
    (region) => region["role"] === "depth-body",
  );
  if (depthBody === undefined) fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
  const depthBodyEnd = (depthBody["yMpt"] as number) + (depthBody["heightMpt"] as number);
  if (hasPagination) {
    const pagination = record(value["pagination"], ["policy", "yEndLimitMpt"]);
    literal(pagination["policy"], "fixed-scale-continuation-v1");
    const yEndLimit = mpt(pagination["yEndLimitMpt"]);
    if (yEndLimit <= yStart || yEndLimit > depthBodyEnd || yEnd <= yEndLimit) {
      fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    }
  } else if (yEnd > depthBodyEnd) {
    fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
  }
  const columnIds: string[] = [];
  let priorEdge: number | undefined;
  for (const columnInput of array(value["columns"])) {
    const column = record(columnInput, ["id", "role", "xMpt", "widthMpt"]);
    columnIds.push(textValue(column["id"]));
    textValue(column["role"]);
    const x = mpt(column["xMpt"]);
    const width = mpt(column["widthMpt"]);
    if (width <= 0 || x < 0 || x + width > pageWidth) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    if (priorEdge !== undefined && x !== priorEdge) fail("BORING_LOG_CONTRACT_INVALID_ORDER");
    priorEdge = x + width;
  }
  unique(columnIds);
  const guideIds: string[] = [];
  const guideCoordinates: string[] = [];
  const guides = hasGuides ? array(value["guides"]) : [];
  if (guides.length > 128) fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  for (const guideInput of guides) {
    const guide = record(guideInput, ["id", "orientation", "positionMpt", "locked"]);
    guideIds.push(textValue(guide["id"]));
    const orientation = textValue(guide["orientation"]);
    if (!["horizontal", "vertical"].includes(orientation)) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    const position = mpt(guide["positionMpt"]);
    guideCoordinates.push(`${orientation}\u0000${position}`);
    const maximum = orientation === "vertical" ? pageWidth : pageHeight;
    if (position < 0 || position > maximum) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    if (typeof guide["locked"] !== "boolean") fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
  unique(guideIds);
  unique(guideCoordinates);
  const styleIds: string[] = [];
  for (const styleInput of array(value["styles"])) {
    const hasTextDecoration = Object.hasOwn(styleInput as object, "textDecoration");
    const hasLetterSpacing = Object.hasOwn(styleInput as object, "letterSpacingMpt");
    const hasWordSpacing = Object.hasOwn(styleInput as object, "wordSpacingMpt");
    const hasParagraphSpacing = Object.hasOwn(styleInput as object, "paragraphSpacingMpt");
    const style = record(styleInput, [
      "id",
      "fontFamilyId",
      "fontSizeMpt",
      "fontWeight",
      "lineHeightMpt",
      ...(hasLetterSpacing ? ["letterSpacingMpt"] : []),
      ...(hasWordSpacing ? ["wordSpacingMpt"] : []),
      ...(hasParagraphSpacing ? ["paragraphSpacingMpt"] : []),
      "color",
      ...(hasTextDecoration ? ["textDecoration"] : []),
    ]);
    styleIds.push(textValue(style["id"]));
    textValue(style["fontFamilyId"]);
    if (mpt(style["fontSizeMpt"]) <= 0 || mpt(style["lineHeightMpt"]) <= 0) {
      fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    }
    const weight = nonnegativeInteger(style["fontWeight"]);
    if (weight < 1 || weight > 1000) fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    if (hasLetterSpacing) mpt(style["letterSpacingMpt"]);
    if (hasWordSpacing) mpt(style["wordSpacingMpt"]);
    if (hasParagraphSpacing && mpt(style["paragraphSpacingMpt"]) < 0)
      fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    textValue(style["color"]);
    if (
      hasTextDecoration &&
      !["none", "underline", "line-through", "underline line-through"].includes(
        textValue(style["textDecoration"]),
      )
    )
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
  unique(styleIds);
  const occurrenceLayoutIds: string[] = [];
  for (const layoutInput of hasOccurrenceLayouts ? array(value["occurrenceLayouts"]) : []) {
    const hasFrameAnchor = Object.hasOwn(layoutInput as object, "frameAnchor");
    const hasMinimumFontSize = Object.hasOwn(layoutInput as object, "minimumFontSizeMpt");
    const hasFrameStyle = ["frameFillColor", "frameStrokeColor", "frameStrokeWidthMpt"].some(
      (key) => Object.hasOwn(layoutInput as object, key),
    );
    const hasVisible = Object.hasOwn(layoutInput as object, "visible");
    const hasDrawingOrderOffset = Object.hasOwn(layoutInput as object, "drawingOrderOffset");
    const layout = record(layoutInput, [
      "id",
      "frame",
      ...(hasFrameAnchor ? ["frameAnchor"] : []),
      "paddingMpt",
      "horizontalAlignment",
      "verticalAlignment",
      "wrapPolicy",
      "overflowPolicy",
      ...(hasMinimumFontSize ? ["minimumFontSizeMpt"] : []),
      ...(hasFrameStyle ? ["frameFillColor", "frameStrokeColor", "frameStrokeWidthMpt"] : []),
      "rotationMilliDegrees",
      "positionMode",
      "locked",
      ...(hasVisible ? ["visible"] : []),
      ...(hasDrawingOrderOffset ? ["drawingOrderOffset"] : []),
    ]);
    occurrenceLayoutIds.push(textValue(layout["id"]));
    validateRect(layout["frame"]);
    if (
      hasFrameAnchor &&
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
      ].includes(textValue(layout["frameAnchor"]))
    ) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    if (hasFrameStyle) {
      nullableText(layout["frameFillColor"]);
      nullableText(layout["frameStrokeColor"]);
      if (mpt(layout["frameStrokeWidthMpt"]) < 0) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    }
    const padding = record(layout["paddingMpt"], ["topMpt", "rightMpt", "bottomMpt", "leftMpt"]);
    for (const side of ["topMpt", "rightMpt", "bottomMpt", "leftMpt"] as const) {
      if (mpt(padding[side]) < 0) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    }
    if (!["start", "center", "end"].includes(textValue(layout["horizontalAlignment"]))) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    if (!["top", "middle", "bottom"].includes(textValue(layout["verticalAlignment"]))) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    if (!["word-v1", "no-wrap"].includes(textValue(layout["wrapPolicy"]))) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    const overflowPolicy = textValue(layout["overflowPolicy"]);
    if (!["clip-with-diagnostic", "shrink-to-minimum"].includes(overflowPolicy)) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    if (
      (overflowPolicy === "shrink-to-minimum" && !hasMinimumFontSize) ||
      (hasMinimumFontSize && mpt(layout["minimumFontSizeMpt"]) <= 0)
    ) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    const rotation = finite(layout["rotationMilliDegrees"]);
    if (!Number.isSafeInteger(rotation) || rotation < -180_000 || rotation > 180_000) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    if (!["depth-bound", "free"].includes(textValue(layout["positionMode"]))) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    if (typeof layout["locked"] !== "boolean") fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    if (hasVisible && typeof layout["visible"] !== "boolean")
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    if (
      hasDrawingOrderOffset &&
      (!Number.isSafeInteger(layout["drawingOrderOffset"]) ||
        Math.abs(layout["drawingOrderOffset"] as number) > 1_000_000)
    )
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    const frame = layout["frame"] as Readonly<Record<string, number>>;
    if (
      (padding["leftMpt"] as number) + (padding["rightMpt"] as number) >= frame["widthMpt"]! ||
      (padding["topMpt"] as number) + (padding["bottomMpt"] as number) >= frame["heightMpt"]!
    ) {
      fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    }
  }
  unique(occurrenceLayoutIds);
  const cloneNodeIds: string[] = [];
  for (const cloneInput of hasTextOccurrenceClones ? array(value["textOccurrenceClones"]) : []) {
    const clone = record(cloneInput, [
      "cloneNodeId",
      "sourceOccurrenceNodeId",
      "semanticId",
      "offsetXMpt",
      "offsetYMpt",
    ]);
    const cloneNodeId = textValue(clone["cloneNodeId"]);
    const sourceOccurrenceNodeId = textValue(clone["sourceOccurrenceNodeId"]);
    cloneNodeIds.push(cloneNodeId);
    if (
      !cloneNodeId.startsWith("node:clone:") ||
      !sourceOccurrenceNodeId.startsWith("node:") ||
      cloneNodeId === sourceOccurrenceNodeId
    )
      fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
    textValue(clone["semanticId"]);
    const offsetXMpt = mpt(clone["offsetXMpt"]);
    const offsetYMpt = mpt(clone["offsetYMpt"]);
    if (Math.abs(offsetXMpt) > pageWidth || Math.abs(offsetYMpt) > pageHeight)
      fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
  }
  if (cloneNodeIds.length > 128) fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  unique(cloneNodeIds);
  const hierarchyIds: string[] = [];
  const leafIds: string[] = [];
  validateTemplateHierarchy(value["hierarchy"], hierarchyIds, leafIds);
  unique([...hierarchyIds, ...leafIds]);
  const semanticIds = new Set([...hierarchyIds, ...leafIds]);
  const occurrenceBindingIds: string[] = [];
  for (const bindingInput of array(value["bindings"])) {
    const binding = record(bindingInput, ["elementId", "path", "styleId"]);
    const elementId = textValue(binding["elementId"]);
    const path = textValue(binding["path"]);
    const occurrenceStyleBinding =
      path === "presentation.text-occurrence-style" && elementId.startsWith("node:");
    const occurrenceLayoutBinding =
      path === "presentation.text-occurrence-layout" && elementId.startsWith("node:");
    const columnStyleBinding = path === "presentation.text-column-style";
    if (columnStyleBinding && !columnIds.includes(elementId)) {
      fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
    }
    if (!semanticIds.has(elementId) && !occurrenceStyleBinding && !occurrenceLayoutBinding)
      fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
    if (occurrenceStyleBinding || occurrenceLayoutBinding || columnStyleBinding) {
      occurrenceBindingIds.push(`${path}\u0000${elementId}`);
    }
    const resourceId = textValue(binding["styleId"]);
    if (
      (occurrenceLayoutBinding && !occurrenceLayoutIds.includes(resourceId)) ||
      (!occurrenceLayoutBinding && !styleIds.includes(resourceId))
    )
      fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
  }
  unique(occurrenceBindingIds);
  validateStringMap(value["visualTokens"]);
  assertNoForbiddenRaster(value);
}

function validateDocument(input: unknown): void {
  const value = record(input, [
    "schemaVersion",
    "fixtureId",
    "fixtureRevision",
    "evidenceClass",
    "representativeClaimAllowed",
    "publicationEligibility",
    "identity",
    "metadata",
    "referenceDepthRange",
    "lithologyIntervals",
    "samples",
    "dataTrack",
    "remarks",
    "legend",
    "notes",
    "approval",
  ]);
  literal(value["schemaVersion"], "rsrender.boring-log-mvp-fixture.v1");
  textValue(value["fixtureId"]);
  nonnegativeInteger(value["fixtureRevision"]);
  literal(value["evidenceClass"], "synthetic-coverage-only");
  literal(value["representativeClaimAllowed"], false);
  literal(value["publicationEligibility"], "example-dataset-only");
  const identity = record(value["identity"], ["boringLogId", "explorationId", "pageId"]);
  for (const item of Object.values(identity)) textValue(item);
  const metadata = record(value["metadata"], [
    "companyName",
    "companyContactSubtitle",
    "documentTitle",
    "sheetLabel",
    "clientName",
    "projectName",
    "projectNumber",
    "location",
    "coordinates",
    "coordinateDatum",
    "groundElevationFt",
    "elevationDatum",
    "totalDepthFt",
    "completionDepthFt",
    "drilledDate",
    "boringMethod",
    "holeDiameter",
    "rigDriller",
    "hammerType",
    "hammerDrop",
    "hammerEfficiency",
    "loggedBy",
    "checkedBy",
    "groundwaterSummary",
    "provenance",
  ]);
  for (const key of [
    "companyName",
    "companyContactSubtitle",
    "documentTitle",
    "sheetLabel",
    "clientName",
    "projectName",
    "projectNumber",
    "location",
    "coordinates",
    "coordinateDatum",
    "elevationDatum",
    "drilledDate",
    "boringMethod",
    "holeDiameter",
    "rigDriller",
    "hammerType",
    "hammerDrop",
    "hammerEfficiency",
    "loggedBy",
    "checkedBy",
    "groundwaterSummary",
  ]) {
    textValue(metadata[key]);
  }
  validateProvenance(metadata["provenance"]);
  const totalDepth = finite(metadata["totalDepthFt"]);
  finite(metadata["groundElevationFt"]);
  const completionDepth = finite(metadata["completionDepthFt"]);
  if (completionDepth < 0 || completionDepth > totalDepth) {
    fail("BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE");
  }
  validateDepthRange(value["referenceDepthRange"], true);
  const depthRange = value["referenceDepthRange"] as DataRecord;
  if (depthRange["endFt"] !== totalDepth) fail("BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE");
  const intervalIds: string[] = [];
  let previousEnd = finite(depthRange["startFt"]);
  for (const intervalInput of array(value["lithologyIntervals"])) {
    const interval = record(intervalInput, [
      "id",
      "depthFromFt",
      "depthToFt",
      "classification",
      "patternId",
      "materialFillToken",
      "description",
      "transitions",
      "boundaryKind",
      "provenance",
    ]);
    intervalIds.push(textValue(interval["id"]));
    const from = finite(interval["depthFromFt"]);
    const to = finite(interval["depthToFt"]);
    if (from !== previousEnd || to <= from || to > totalDepth)
      fail("BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE");
    previousEnd = to;
    textValue(interval["classification"]);
    textValue(interval["patternId"]);
    textValue(interval["materialFillToken"]);
    textValue(interval["description"]);
    for (const transitionInput of array(interval["transitions"])) {
      const transition = record(transitionInput, ["depthFt", "text"]);
      const depth = finite(transition["depthFt"]);
      if (depth < from || depth >= to) fail("BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE");
      textValue(transition["text"]);
    }
    if (!["observed", "gradational"].includes(textValue(interval["boundaryKind"]))) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    validateProvenance(interval["provenance"]);
  }
  unique(intervalIds);
  if (previousEnd !== totalDepth) fail("BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE");
  const sampleIds: string[] = [];
  let previousSampleDepth = -Infinity;
  for (const sampleInput of array(value["samples"])) {
    const sample = record(sampleInput, [
      "id",
      "label",
      "depthFt",
      "symbol",
      "recoveryPercent",
      "blowIncrements",
      "nValue",
      "refusal",
      "provenance",
    ]);
    sampleIds.push(textValue(sample["id"]));
    textValue(sample["label"]);
    textValue(sample["symbol"]);
    const depth = finite(sample["depthFt"]);
    if (depth < 0 || depth > totalDepth || depth < previousSampleDepth)
      fail("BORING_LOG_CONTRACT_INVALID_ORDER");
    previousSampleDepth = depth;
    const recovery = finite(sample["recoveryPercent"]);
    if (recovery < 0 || recovery > 100) fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    const increments = array(sample["blowIncrements"]);
    if (increments.length < 1 || increments.length > 3) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    for (const incrementInput of increments) {
      const increment = record(incrementInput, ["blows", "penetrationInches"]);
      nonnegativeInteger(increment["blows"]);
      const penetrationInches = finite(increment["penetrationInches"]);
      if (penetrationInches <= 0 || penetrationInches > 6) {
        fail("BORING_LOG_CONTRACT_WRONG_TYPE");
      }
    }
    if (typeof sample["refusal"] !== "boolean") fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    if (sample["nValue"] === null) {
      if (sample["refusal"] !== true) fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    } else {
      nonnegativeInteger(sample["nValue"]);
      if (sample["refusal"] !== false) fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    validateProvenance(sample["provenance"]);
  }
  unique(sampleIds);
  const track = record(value["dataTrack"], ["id", "depthRange", "axes", "layers"]);
  textValue(track["id"]);
  validateDepthRange(track["depthRange"], false);
  const trackRange = track["depthRange"] as DataRecord;
  if (
    trackRange["startFt"] !== depthRange["startFt"] ||
    trackRange["endFt"] !== depthRange["endFt"]
  ) {
    fail("BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE");
  }
  const axes = new Map<
    string,
    { quantity: string; unit: string; minimum: number; maximum: number }
  >();
  for (const axisInput of array(track["axes"])) {
    const axis = record(axisInput, ["id", "quantity", "unit", "minimum", "maximum"]);
    const id = textValue(axis["id"]);
    if (axes.has(id)) fail("BORING_LOG_CONTRACT_DUPLICATE_IDENTITY");
    const minimum = finite(axis["minimum"]);
    const maximum = finite(axis["maximum"]);
    if (maximum <= minimum) fail("BORING_LOG_CONTRACT_INCOMPATIBLE_AXIS");
    axes.set(id, {
      quantity: textValue(axis["quantity"]),
      unit: textValue(axis["unit"]),
      minimum,
      maximum,
    });
  }
  const layerIds: string[] = [];
  for (const layerInput of array(track["layers"])) {
    const tagged = recordWithTag(layerInput, "kind");
    const tupleLength =
      tagged.tag === "numeric-polyline" ? 2 : tagged.tag === "numeric-range" ? 3 : 0;
    if (tupleLength === 0) fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    const layer = record(layerInput, ["id", "kind", "axisId", "glyph", "values", "provenance"]);
    layerIds.push(textValue(layer["id"]));
    const axis = axes.get(textValue(layer["axisId"]));
    if (!axis) fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
    const compatibleUnit =
      (axis.quantity === "spt-n-value" && axis.unit === "blows-per-foot") ||
      (axis.quantity === "water-content-percent" && axis.unit === "percent");
    if (!compatibleUnit || (tupleLength === 3 && axis.quantity !== "water-content-percent")) {
      fail("BORING_LOG_CONTRACT_INCOMPATIBLE_AXIS");
    }
    textValue(layer["glyph"]);
    for (const tupleInput of array(layer["values"])) {
      const tuple = array(tupleInput);
      if (tuple.length !== tupleLength) fail("BORING_LOG_CONTRACT_WRONG_TYPE");
      if (!sampleIds.includes(textValue(tuple[0]))) fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
      for (const entry of tuple.slice(1)) {
        const number = finite(entry);
        if (number < axis.minimum || number > axis.maximum)
          fail("BORING_LOG_CONTRACT_INCOMPATIBLE_AXIS");
      }
    }
    validateProvenance(layer["provenance"]);
  }
  unique(layerIds);
  const remarkIds: string[] = [];
  for (const remarkInput of array(value["remarks"])) {
    const remark = record(remarkInput, ["id", "depthFromFt", "depthToFt", "text"]);
    remarkIds.push(textValue(remark["id"]));
    const from = finite(remark["depthFromFt"]);
    const to = finite(remark["depthToFt"]);
    if (from < 0 || to <= from || to > totalDepth) fail("BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE");
    textValue(remark["text"]);
  }
  unique(remarkIds);
  const legendIds: string[] = [];
  for (const legendInput of array(value["legend"])) {
    const legend = record(legendInput, ["id", "label", "symbol"]);
    legendIds.push(textValue(legend["id"]));
    textValue(legend["label"]);
    textValue(legend["symbol"]);
  }
  unique(legendIds);
  for (const note of array(value["notes"])) textValue(note);
  const approval = record(value["approval"], [
    "heading",
    "sealPlaceholder",
    "reviewerName",
    "reviewedDate",
  ]);
  for (const item of Object.values(approval)) textValue(item);
  assertNoForbiddenRaster(value);
}

function validateDiagnostic(input: unknown): void {
  const value = record(input, ["code", "severity", "message", "semanticId"]);
  textValue(value["code"]);
  if (!["info", "warning", "error"].includes(textValue(value["severity"])))
    fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  textValue(value["message"]);
  nullableText(value["semanticId"]);
}

function validateDepthTransform(input: unknown, regionIds: readonly string[]): void {
  const value = record(input, [
    "regionId",
    "depthStartFt",
    "depthEndFt",
    "yStartMpt",
    "yEndMpt",
    "mptPerFoot",
  ]);
  if (!regionIds.includes(textValue(value["regionId"])))
    fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
  const start = finite(value["depthStartFt"]);
  const end = finite(value["depthEndFt"]);
  const yStart = mpt(value["yStartMpt"]);
  const yEnd = mpt(value["yEndMpt"]);
  if (start < 0 || end <= start || yEnd <= yStart || mpt(value["mptPerFoot"]) <= 0) {
    fail("BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE");
  }
}

function validatePagePlanUnchecked(input: unknown): void {
  const value = record(input, [
    "contractVersion",
    "schemaVersion",
    "kind",
    "jobId",
    "inputDigest",
    "pages",
    "overflow",
    "diagnostics",
  ]);
  if (value["contractVersion"] !== 1) fail("BORING_LOG_CONTRACT_UNSUPPORTED_VERSION");
  literal(value["schemaVersion"], boringLogPagePlanSchemaVersion);
  literal(value["kind"], "boring-log.page-plan");
  textValue(value["jobId"]);
  if (!isSha256Digest(value["inputDigest"])) fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  const pageIds: string[] = [];
  let expectedPageIndex = 0;
  for (const pageInput of array(value["pages"])) {
    const page = record(pageInput, [
      "pageId",
      "pageIndex",
      "widthMpt",
      "heightMpt",
      "depthRange",
      "depthTransform",
      "regions",
      "columns",
      "semanticOrder",
    ]);
    pageIds.push(textValue(page["pageId"]));
    if (nonnegativeInteger(page["pageIndex"]) !== expectedPageIndex)
      fail("BORING_LOG_CONTRACT_INVALID_ORDER");
    expectedPageIndex += 1;
    const width = mpt(page["widthMpt"]);
    const height = mpt(page["heightMpt"]);
    if (width <= 0 || height <= 0) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    validateDepthRange(page["depthRange"], true);
    const plannedDepthRange = page["depthRange"] as DataRecord;
    const regionIds: string[] = [];
    for (const regionInput of array(page["regions"])) {
      const region = record(regionInput, ["id", "role", "xMpt", "yMpt", "widthMpt", "heightMpt"]);
      regionIds.push(textValue(region["id"]));
      textValue(region["role"]);
      const x = mpt(region["xMpt"]);
      const y = mpt(region["yMpt"]);
      const regionWidth = mpt(region["widthMpt"]);
      const regionHeight = mpt(region["heightMpt"]);
      if (
        x < 0 ||
        y < 0 ||
        regionWidth <= 0 ||
        regionHeight <= 0 ||
        x + regionWidth > width ||
        y + regionHeight > height
      ) {
        fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
      }
    }
    unique(regionIds);
    validateDepthTransform(page["depthTransform"], regionIds);
    const plannedDepthTransform = page["depthTransform"] as DataRecord;
    if (
      plannedDepthRange["startFt"] !== plannedDepthTransform["depthStartFt"] ||
      plannedDepthRange["endFt"] !== plannedDepthTransform["depthEndFt"]
    ) {
      fail("BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE");
    }
    const columnIds: string[] = [];
    let priorEdge: number | undefined;
    for (const columnInput of array(page["columns"])) {
      const column = record(columnInput, ["id", "role", "xMpt", "widthMpt"]);
      columnIds.push(textValue(column["id"]));
      textValue(column["role"]);
      const x = mpt(column["xMpt"]);
      const columnWidth = mpt(column["widthMpt"]);
      if (columnWidth <= 0 || x < 0 || x + columnWidth > width)
        fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
      if (priorEdge !== undefined && x !== priorEdge) fail("BORING_LOG_CONTRACT_INVALID_ORDER");
      priorEdge = x + columnWidth;
    }
    unique(columnIds);
    const order = array(page["semanticOrder"]).map((item) => textValue(item));
    unique(order);
    if ([...regionIds, ...columnIds].some((semanticId) => !order.includes(semanticId))) {
      fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
    }
  }
  unique(pageIds);
  if (pageIds.length === 0) fail("BORING_LOG_CONTRACT_MISSING_FIELD");
  if (!["none", "continued", "clipped-with-diagnostic"].includes(textValue(value["overflow"]))) {
    fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
  for (const diagnostic of array(value["diagnostics"])) validateDiagnostic(diagnostic);
}

function validateTextRequest(input: unknown): void {
  const hasLetterSpacing =
    typeof input === "object" && input !== null && Object.hasOwn(input, "letterSpacingMpt");
  const hasWordSpacing =
    typeof input === "object" && input !== null && Object.hasOwn(input, "wordSpacingMpt");
  const hasParagraphSpacing =
    typeof input === "object" && input !== null && Object.hasOwn(input, "paragraphSpacingMpt");
  const value = record(input, [
    "measurementId",
    "text",
    "sourceIdentity",
    "sourceStartUtf16",
    "sourceEndUtf16",
    "fontFamilyId",
    "fontSizeMpt",
    "fontWeight",
    "lineHeightMpt",
    ...(hasLetterSpacing ? ["letterSpacingMpt"] : []),
    ...(hasWordSpacing ? ["wordSpacingMpt"] : []),
    ...(hasParagraphSpacing ? ["paragraphSpacingMpt"] : []),
    "maximumWidthMpt",
    "maximumHeightMpt",
    "maximumLines",
    "wrapPolicy",
    "overflowPolicy",
    "minimumFontSizeMpt",
  ]);
  textValue(value["measurementId"]);
  const content = textValue(value["text"], true);
  textValue(value["sourceIdentity"]);
  const start = nonnegativeInteger(value["sourceStartUtf16"]);
  const end = nonnegativeInteger(value["sourceEndUtf16"]);
  if (end < start || end - start !== content.length) fail("BORING_LOG_CONTRACT_INVALID_ORDER");
  textValue(value["fontFamilyId"]);
  if (
    mpt(value["fontSizeMpt"]) <= 0 ||
    mpt(value["lineHeightMpt"]) <= 0 ||
    mpt(value["maximumWidthMpt"]) <= 0 ||
    mpt(value["maximumHeightMpt"]) <= 0 ||
    mpt(value["minimumFontSizeMpt"]) <= 0 ||
    mpt(value["minimumFontSizeMpt"]) > mpt(value["fontSizeMpt"])
  ) {
    fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
  }
  const weight = nonnegativeInteger(value["fontWeight"]);
  if (weight < 1 || weight > 1000 || nonnegativeInteger(value["maximumLines"]) < 1) {
    fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
  if (hasLetterSpacing) mpt(value["letterSpacingMpt"]);
  if (hasWordSpacing) mpt(value["wordSpacingMpt"]);
  if (hasParagraphSpacing && mpt(value["paragraphSpacingMpt"]) < 0)
    fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
  if (!["word-v1", "no-wrap"].includes(textValue(value["wrapPolicy"])))
    fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  if (!["clip-with-diagnostic", "shrink-to-minimum"].includes(textValue(value["overflowPolicy"])))
    fail("BORING_LOG_CONTRACT_WRONG_TYPE");
}

function validateTextResult(input: unknown): void {
  const value = record(input, [
    "measurementId",
    "fontFaceDigest",
    "fontMetricsDigest",
    "logicalBounds",
    "inkBounds",
    "lines",
    "overflow",
    "effectiveFontSizeMpt",
    "effectiveLineHeightMpt",
  ]);
  textValue(value["measurementId"]);
  if (!isSha256Digest(value["fontFaceDigest"]) || !isSha256Digest(value["fontMetricsDigest"])) {
    fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
  validateRect(value["logicalBounds"]);
  validateRect(value["inkBounds"]);
  let priorEnd = -1;
  for (const lineInput of array(value["lines"])) {
    const line = record(lineInput, [
      "text",
      "sourceStartUtf16",
      "sourceEndUtf16",
      "xMpt",
      "baselineMpt",
      "advanceMpt",
    ]);
    textValue(line["text"], true);
    const start = nonnegativeInteger(line["sourceStartUtf16"]);
    const end = nonnegativeInteger(line["sourceEndUtf16"]);
    if (end < start || start < priorEnd) fail("BORING_LOG_CONTRACT_INVALID_ORDER");
    priorEnd = end;
    mpt(line["xMpt"]);
    mpt(line["baselineMpt"]);
    if (mpt(line["advanceMpt"]) < 0) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
  }
  if (!["none", "ellipsized", "clipped", "continued"].includes(textValue(value["overflow"]))) {
    fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
  if (mpt(value["effectiveFontSizeMpt"]) <= 0 || mpt(value["effectiveLineHeightMpt"]) <= 0) {
    fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
}

function validateSceneNode(input: unknown): {
  id: string;
  semanticId: string;
  parentId: string | null;
  measurementId?: string;
  styleId?: string;
  content?: string;
} {
  const tagged = recordWithTag(input, "kind");
  const baseKeys = ["id", "kind", "semanticId", "parentId", "role", "order", "provenance"];
  const extraByKind: Readonly<Record<string, readonly string[]>> = {
    group: ["bounds", "childIds"],
    rect: ["bounds", "fillToken", "strokeToken", "strokeWidthMpt"],
    line: ["from", "to", "strokeToken", "strokeWidthMpt", "dashMpt"],
    path: ["points", "closed", "fillToken", "strokeToken", "strokeWidthMpt", "dashMpt"],
    circle: ["center", "radiusMpt", "fillToken", "strokeToken", "strokeWidthMpt"],
    text: [
      "measurementId",
      "styleId",
      "content",
      "frame",
      ...(typeof input === "object" &&
      input !== null &&
      !Array.isArray(input) &&
      Object.hasOwn(input, "presentation")
        ? ["presentation"]
        : []),
    ],
  };
  const extras = extraByKind[tagged.tag];
  if (!extras) fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  const value = record(input, [...baseKeys, ...extras]);
  const id = textValue(value["id"]);
  const semanticId = textValue(value["semanticId"]);
  const parentId = nullableText(value["parentId"]);
  textValue(value["role"]);
  nonnegativeInteger(value["order"]);
  if (value["provenance"] !== null) validateProvenance(value["provenance"]);
  if (tagged.tag === "group") {
    validateRect(value["bounds"]);
    for (const child of array(value["childIds"])) textValue(child);
  } else if (tagged.tag === "rect") {
    validateRect(value["bounds"]);
    nullableText(value["fillToken"]);
    nullableText(value["strokeToken"]);
    if (mpt(value["strokeWidthMpt"]) < 0) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
  } else if (tagged.tag === "line") {
    validatePoint(value["from"]);
    validatePoint(value["to"]);
    textValue(value["strokeToken"]);
    if (mpt(value["strokeWidthMpt"]) < 0) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    for (const dash of array(value["dashMpt"]))
      if (mpt(dash) <= 0) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
  } else if (tagged.tag === "path") {
    const points = array(value["points"]);
    if (points.length < 2) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    for (const point of points) validatePoint(point);
    if (typeof value["closed"] !== "boolean") fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    nullableText(value["fillToken"]);
    nullableText(value["strokeToken"]);
    if (mpt(value["strokeWidthMpt"]) < 0) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    for (const dash of array(value["dashMpt"]))
      if (mpt(dash) <= 0) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
  } else if (tagged.tag === "circle") {
    validatePoint(value["center"]);
    if (mpt(value["radiusMpt"]) <= 0 || mpt(value["strokeWidthMpt"]) < 0) {
      fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    }
    nullableText(value["fillToken"]);
    nullableText(value["strokeToken"]);
  } else {
    const measurementId = textValue(value["measurementId"]);
    const styleId = textValue(value["styleId"]);
    const content = textValue(value["content"], true);
    validateRect(value["frame"]);
    if (Object.hasOwn(value, "presentation")) {
      const hasFrameAnchor = Object.hasOwn(value["presentation"] as object, "frameAnchor");
      const hasMinimumFontSize = Object.hasOwn(
        value["presentation"] as object,
        "minimumFontSizeMpt",
      );
      const hasFrameStyle = ["frameFillColor", "frameStrokeColor", "frameStrokeWidthMpt"].some(
        (key) => Object.hasOwn(value["presentation"] as object, key),
      );
      const hasVisible = Object.hasOwn(value["presentation"] as object, "visible");
      const hasDrawingOrderOffset = Object.hasOwn(
        value["presentation"] as object,
        "drawingOrderOffset",
      );
      const presentation = record(value["presentation"], [
        "paddingMpt",
        ...(hasFrameAnchor ? ["frameAnchor"] : []),
        "horizontalAlignment",
        "verticalAlignment",
        "wrapPolicy",
        "overflowPolicy",
        ...(hasMinimumFontSize ? ["minimumFontSizeMpt"] : []),
        ...(hasFrameStyle ? ["frameFillColor", "frameStrokeColor", "frameStrokeWidthMpt"] : []),
        "rotationMilliDegrees",
        "positionMode",
        "locked",
        ...(hasVisible ? ["visible"] : []),
        ...(hasDrawingOrderOffset ? ["drawingOrderOffset"] : []),
      ]);
      const padding = record(presentation["paddingMpt"], [
        "topMpt",
        "rightMpt",
        "bottomMpt",
        "leftMpt",
      ]);
      for (const side of ["topMpt", "rightMpt", "bottomMpt", "leftMpt"] as const) {
        if (mpt(padding[side]) < 0) fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
      }
      if (
        hasFrameAnchor &&
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
        ].includes(textValue(presentation["frameAnchor"]))
      ) {
        fail("BORING_LOG_CONTRACT_WRONG_TYPE");
        if (hasFrameStyle) {
          nullableText(presentation["frameFillColor"]);
          nullableText(presentation["frameStrokeColor"]);
          if (mpt(presentation["frameStrokeWidthMpt"]) < 0)
            fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
        }
      }
      if (!["start", "center", "end"].includes(textValue(presentation["horizontalAlignment"])))
        fail("BORING_LOG_CONTRACT_WRONG_TYPE");
      if (!["top", "middle", "bottom"].includes(textValue(presentation["verticalAlignment"])))
        fail("BORING_LOG_CONTRACT_WRONG_TYPE");
      if (!["word-v1", "no-wrap"].includes(textValue(presentation["wrapPolicy"])))
        fail("BORING_LOG_CONTRACT_WRONG_TYPE");
      const overflowPolicy = textValue(presentation["overflowPolicy"]);
      if (!["clip-with-diagnostic", "shrink-to-minimum"].includes(overflowPolicy))
        fail("BORING_LOG_CONTRACT_WRONG_TYPE");
      if (
        (overflowPolicy === "shrink-to-minimum" && !hasMinimumFontSize) ||
        (hasMinimumFontSize && mpt(presentation["minimumFontSizeMpt"]) <= 0)
      )
        fail("BORING_LOG_CONTRACT_WRONG_TYPE");
      const rotation = finite(presentation["rotationMilliDegrees"]);
      if (!Number.isSafeInteger(rotation) || rotation < -180_000 || rotation > 180_000)
        fail("BORING_LOG_CONTRACT_WRONG_TYPE");
      if (!["depth-bound", "free"].includes(textValue(presentation["positionMode"])))
        fail("BORING_LOG_CONTRACT_WRONG_TYPE");
      if (typeof presentation["locked"] !== "boolean") fail("BORING_LOG_CONTRACT_WRONG_TYPE");
      if (hasVisible && typeof presentation["visible"] !== "boolean")
        fail("BORING_LOG_CONTRACT_WRONG_TYPE");
      if (
        hasDrawingOrderOffset &&
        (!Number.isSafeInteger(presentation["drawingOrderOffset"]) ||
          Math.abs(presentation["drawingOrderOffset"] as number) > 1_000_000)
      )
        fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    return { id, semanticId, parentId, measurementId, styleId, content };
  }
  return { id, semanticId, parentId };
}

function validateSceneUnchecked(input: unknown): void {
  const value = record(input, [
    "contractVersion",
    "schemaVersion",
    "kind",
    "jobId",
    "inputDigest",
    "pagePlan",
    "textRequests",
    "textResults",
    "resources",
    "pages",
    "diagnostics",
  ]);
  if (value["contractVersion"] !== 1) fail("BORING_LOG_CONTRACT_UNSUPPORTED_VERSION");
  literal(value["schemaVersion"], resolvedBoringLogPageSceneSchemaVersion);
  literal(value["kind"], "boring-log.resolved-page-scene");
  const jobId = textValue(value["jobId"]);
  if (!isSha256Digest(value["inputDigest"])) fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  validatePagePlanUnchecked(value["pagePlan"]);
  const plan = value["pagePlan"] as DataRecord;
  if (plan["jobId"] !== jobId || plan["inputDigest"] !== value["inputDigest"]) {
    fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
  }
  const requestIds: string[] = [];
  const requestsById = new Map<string, DataRecord>();
  for (const request of array(value["textRequests"])) {
    validateTextRequest(request);
    const requestRecord = request as DataRecord;
    const measurementId = requestRecord["measurementId"] as string;
    requestIds.push(measurementId);
    requestsById.set(measurementId, requestRecord);
  }
  unique(requestIds);
  const resultIds: string[] = [];
  for (const result of array(value["textResults"])) {
    validateTextResult(result);
    const resultRecord = result as DataRecord;
    const measurementId = resultRecord["measurementId"] as string;
    resultIds.push(measurementId);
    const request = requestsById.get(measurementId);
    if (!request) fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
    const requestStart = request["sourceStartUtf16"] as number;
    const requestEnd = request["sourceEndUtf16"] as number;
    const requestText = request["text"] as string;
    const effectiveFontSizeMpt = resultRecord["effectiveFontSizeMpt"] as number;
    const effectiveLineHeightMpt = resultRecord["effectiveLineHeightMpt"] as number;
    if (
      effectiveFontSizeMpt < (request["minimumFontSizeMpt"] as number) ||
      effectiveFontSizeMpt > (request["fontSizeMpt"] as number) ||
      effectiveLineHeightMpt < effectiveFontSizeMpt ||
      effectiveLineHeightMpt > (request["lineHeightMpt"] as number) ||
      (request["overflowPolicy"] === "clip-with-diagnostic" &&
        (effectiveFontSizeMpt !== request["fontSizeMpt"] ||
          effectiveLineHeightMpt !== request["lineHeightMpt"]))
    ) {
      fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    }
    for (const line of resultRecord["lines"] as readonly DataRecord[]) {
      const lineStart = line["sourceStartUtf16"] as number;
      const lineEnd = line["sourceEndUtf16"] as number;
      if (
        lineStart < requestStart ||
        lineEnd > requestEnd ||
        requestText.slice(lineStart - requestStart, lineEnd - requestStart) !== line["text"]
      ) {
        fail("BORING_LOG_CONTRACT_INVALID_ORDER");
      }
    }
  }
  unique(resultIds);
  if (requestIds.length !== resultIds.length || requestIds.some((id) => !resultIds.includes(id))) {
    fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
  }
  const resources = record(value["resources"], ["visualTokens", "textStyles", "patterns"]);
  validateStringMap(resources["visualTokens"]);
  const styleIds: string[] = [];
  for (const styleInput of array(resources["textStyles"])) {
    const hasTextDecoration = Object.hasOwn(styleInput as object, "textDecoration");
    const hasLetterSpacing = Object.hasOwn(styleInput as object, "letterSpacingMpt");
    const hasWordSpacing = Object.hasOwn(styleInput as object, "wordSpacingMpt");
    const hasParagraphSpacing = Object.hasOwn(styleInput as object, "paragraphSpacingMpt");
    const style = record(styleInput, [
      "id",
      "fontFamilyId",
      "fontSizeMpt",
      "fontWeight",
      "lineHeightMpt",
      ...(hasLetterSpacing ? ["letterSpacingMpt"] : []),
      ...(hasWordSpacing ? ["wordSpacingMpt"] : []),
      ...(hasParagraphSpacing ? ["paragraphSpacingMpt"] : []),
      "color",
      ...(hasTextDecoration ? ["textDecoration"] : []),
    ]);
    styleIds.push(textValue(style["id"]));
    textValue(style["fontFamilyId"]);
    if (mpt(style["fontSizeMpt"]) <= 0 || mpt(style["lineHeightMpt"]) <= 0) {
      fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    }
    nonnegativeInteger(style["fontWeight"]);
    if (hasLetterSpacing) mpt(style["letterSpacingMpt"]);
    if (hasWordSpacing) mpt(style["wordSpacingMpt"]);
    if (hasParagraphSpacing && mpt(style["paragraphSpacingMpt"]) < 0)
      fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    textValue(style["color"]);
    if (
      hasTextDecoration &&
      !["none", "underline", "line-through", "underline line-through"].includes(
        textValue(style["textDecoration"]),
      )
    )
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
  }
  unique(styleIds);
  const patternIds: string[] = [];
  for (const patternInput of array(resources["patterns"])) {
    const pattern = record(patternInput, [
      "id",
      "kind",
      "foregroundToken",
      "backgroundToken",
      "spacingMpt",
      "markSizeMpt",
      "strokeWidthMpt",
    ]);
    patternIds.push(textValue(pattern["id"]));
    if (!["line-hatch", "horizontal-dash", "dot-ring"].includes(textValue(pattern["kind"]))) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    textValue(pattern["foregroundToken"]);
    textValue(pattern["backgroundToken"]);
    if (
      mpt(pattern["spacingMpt"]) <= 0 ||
      mpt(pattern["markSizeMpt"]) <= 0 ||
      mpt(pattern["strokeWidthMpt"]) <= 0
    ) {
      fail("BORING_LOG_CONTRACT_INVALID_GEOMETRY");
    }
  }
  unique(patternIds);
  const plannedPages = array(plan["pages"]) as readonly DataRecord[];
  const scenePageIds: string[] = [];
  for (const pageInput of array(value["pages"])) {
    const page = record(pageInput, [
      "pageId",
      "widthMpt",
      "heightMpt",
      "rootNodeId",
      "semanticOrder",
      "nodes",
    ]);
    const pageId = textValue(page["pageId"]);
    scenePageIds.push(pageId);
    const planned = plannedPages.find((candidate) => candidate["pageId"] === pageId);
    if (
      !planned ||
      planned["widthMpt"] !== page["widthMpt"] ||
      planned["heightMpt"] !== page["heightMpt"]
    ) {
      fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
    }
    mpt(page["widthMpt"]);
    mpt(page["heightMpt"]);
    const rootNodeId = textValue(page["rootNodeId"]);
    const semanticOrder = array(page["semanticOrder"]).map((item) => textValue(item));
    unique(semanticOrder);
    const nodes = array(page["nodes"]).map((node) => validateSceneNode(node));
    const nodeIds = nodes.map(({ id }) => id);
    unique(nodeIds);
    if (!nodeIds.includes(rootNodeId)) fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
    const rootNodes = nodes.filter(({ parentId }) => parentId === null);
    if (rootNodes.length !== 1 || rootNodes[0]?.id !== rootNodeId) {
      fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
    }
    const emittedSemanticOrder = nodes
      .map(({ semanticId }) => semanticId)
      .filter((semanticId, index, all) => all.indexOf(semanticId) === index);
    if (
      emittedSemanticOrder.length !== semanticOrder.length ||
      emittedSemanticOrder.some((semanticId, index) => semanticOrder[index] !== semanticId)
    ) {
      fail("BORING_LOG_CONTRACT_INVALID_ORDER");
    }
    const plannedSemanticOrder = planned["semanticOrder"] as readonly string[];
    if (semanticOrder.some((semanticId) => !plannedSemanticOrder.includes(semanticId))) {
      fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
    }
    for (const node of nodes) {
      if (node.parentId !== null && !nodeIds.includes(node.parentId))
        fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
      if (node.measurementId !== undefined && !resultIds.includes(node.measurementId)) {
        fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
      }
      if (node.measurementId !== undefined) {
        const request = requestsById.get(node.measurementId);
        if (
          !request ||
          request["text"] !== node.content ||
          !styleIds.includes(node.styleId ?? "")
        ) {
          fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
        }
      }
    }
    const nodeRecords = page["nodes"] as readonly DataRecord[];
    for (const node of nodeRecords.filter((candidate) => candidate["kind"] === "group")) {
      for (const childId of node["childIds"] as readonly string[]) {
        const child = nodeRecords.find((candidate) => candidate["id"] === childId);
        if (!child || child["parentId"] !== node["id"])
          fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
      }
    }
    for (const node of nodeRecords.filter((candidate) => candidate["parentId"] !== null)) {
      const parent = nodeRecords.find((candidate) => candidate["id"] === node["parentId"]);
      if (
        !parent ||
        parent["kind"] !== "group" ||
        !(parent["childIds"] as readonly string[]).includes(node["id"] as string)
      ) {
        fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
      }
    }
    const visualTokenIds = Object.keys(resources["visualTokens"] as DataRecord);
    const paintTokenIds = new Set([...visualTokenIds, ...patternIds]);
    for (const node of nodeRecords) {
      for (const key of ["fillToken", "strokeToken"] as const) {
        const token = node[key];
        if (token !== undefined && token !== null && !paintTokenIds.has(token as string)) {
          fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
        }
      }
    }
    const orders = nodeRecords.map((node) => node["order"] as number);
    if (new Set(orders).size !== orders.length || orders.some((order, index) => order !== index)) {
      fail("BORING_LOG_CONTRACT_INVALID_ORDER");
    }
  }
  unique(scenePageIds);
  const plannedPageIds = plannedPages.map((page) => page["pageId"] as string);
  if (
    scenePageIds.length !== plannedPageIds.length ||
    scenePageIds.some((id) => !plannedPageIds.includes(id))
  ) {
    fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
  }
  for (const diagnostic of array(value["diagnostics"])) validateDiagnostic(diagnostic);
  assertNoForbiddenRaster(value);
}

function detachedFrozen<Value>(input: Value): Value {
  if (Array.isArray(input)) {
    const items = input as readonly unknown[];
    return Object.freeze(items.map((item) => detachedFrozen(item))) as Value;
  }
  if (typeof input === "object" && input !== null) {
    return Object.freeze(
      Object.fromEntries(Object.entries(input).map(([key, value]) => [key, detachedFrozen(value)])),
    ) as Value;
  }
  return input;
}

function validate<Value>(
  input: unknown,
  validator: (value: unknown) => void,
): BoringLogRenderContractResult<Value> {
  try {
    validator(input);
    return Object.freeze({ accepted: true, value: detachedFrozen(input as Value) });
  } catch (error) {
    return Object.freeze({
      accepted: false,
      code: error instanceof ContractFailure ? error.code : "BORING_LOG_CONTRACT_MALFORMED",
    });
  }
}

/** Strictly validates and detaches a structured boring-log layout job. */
export function validateBoringLogLayoutJobInput(
  input: unknown,
): BoringLogRenderContractResult<BoringLogLayoutJobInput> {
  return validate(input, (candidate) => {
    const value = record(candidate, [
      "contractVersion",
      "schemaVersion",
      "kind",
      "jobId",
      "inputRevision",
      "fixtureDigest",
      "templateDigest",
      "document",
      "template",
    ]);
    if (value["contractVersion"] !== boringLogRenderContractVersion) {
      fail("BORING_LOG_CONTRACT_UNSUPPORTED_VERSION");
    }
    assertNoForbiddenRaster(value);
    literal(value["schemaVersion"], boringLogLayoutJobSchemaVersion);
    literal(value["kind"], "boring-log.layout-job");
    textValue(value["jobId"]);
    nonnegativeInteger(value["inputRevision"]);
    if (!isSha256Digest(value["fixtureDigest"]) || !isSha256Digest(value["templateDigest"])) {
      fail("BORING_LOG_CONTRACT_WRONG_TYPE");
    }
    validateDocument(value["document"]);
    validateTemplate(value["template"]);
    const document = value["document"] as DataRecord;
    const template = value["template"] as DataRecord;
    const documentRange = document["referenceDepthRange"] as DataRecord;
    const transform = template["depthTransform"] as DataRecord;
    if (
      documentRange["startFt"] !== transform["depthStartFt"] ||
      documentRange["endFt"] !== transform["depthEndFt"]
    ) {
      fail("BORING_LOG_CONTRACT_INVALID_DEPTH_RANGE");
    }
    const visualTokens = template["visualTokens"] as DataRecord;
    for (const intervalInput of document["lithologyIntervals"] as readonly unknown[]) {
      const interval = intervalInput as DataRecord;
      if (!Object.hasOwn(visualTokens, interval["materialFillToken"] as PropertyKey)) {
        fail("BORING_LOG_CONTRACT_BROKEN_REFERENCE");
      }
    }
  });
}

/** Strictly validates and detaches a renderer-neutral Page Plan. */
export function validateBoringLogPagePlan(
  input: unknown,
): BoringLogRenderContractResult<BoringLogPagePlan> {
  return validate(input, validatePagePlanUnchecked);
}

/** Strictly validates and detaches the common screen/PDF Resolved Page Scene. */
export function validateResolvedBoringLogPageScene(
  input: unknown,
): BoringLogRenderContractResult<ResolvedBoringLogPageScene> {
  return validate(input, validateSceneUnchecked);
}
