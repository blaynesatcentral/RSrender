import { boringLogTextColumnSemanticId } from "@rsrender/contracts";
import type {
  BoringLogSceneNode,
  BoringLogTextFrameAnchor,
  BoringLogValueProvenance,
  OverrideRenderContentState,
  OverrideRenderDomainValueProjection,
  OverrideRenderUnitState,
  ResolvedBoringLogPageScene,
} from "@rsrender/contracts";

type TextFrame = Readonly<{
  xMpt: number;
  yMpt: number;
  widthMpt: number;
  heightMpt: number;
}>;

type PageGuide = Readonly<{
  readonly id: string;
  readonly orientation: "horizontal" | "vertical";
  readonly positionMpt: number;
  readonly locked: boolean;
}>;

type PageGuideMutation =
  | Readonly<{
      readonly kind: "add";
      readonly orientation: "horizontal" | "vertical";
      readonly positionMpt: number;
    }>
  | Readonly<{ readonly kind: "move"; readonly guideId: string; readonly positionMpt: number }>
  | Readonly<{ readonly kind: "delete"; readonly guideId: string }>
  | Readonly<{ readonly kind: "set-locked"; readonly guideId: string; readonly locked: boolean }>;

type ColumnResizeMode = "adjacent-pair" | "push-following-columns";
type RegionBoundary = "header-depth" | "depth-footer";

type TextTemplateProperty =
  | "fontFamilyId"
  | "fontSizeMpt"
  | "fontWeight"
  | "lineHeightMpt"
  | "letterSpacingMpt"
  | "wordSpacingMpt"
  | "paragraphSpacingMpt"
  | "color"
  | "textDecoration";

function frameAnchorPoint(frame: TextFrame, anchor: BoringLogTextFrameAnchor) {
  const horizontal = anchor.endsWith("left")
    ? 0
    : anchor.endsWith("right")
      ? frame.widthMpt
      : Math.round(frame.widthMpt / 2);
  const vertical = anchor.startsWith("top")
    ? 0
    : anchor.startsWith("bottom")
      ? frame.heightMpt
      : Math.round(frame.heightMpt / 2);
  return Object.freeze({ xMpt: frame.xMpt + horizontal, yMpt: frame.yMpt + vertical });
}

function frameFromAnchor(
  point: Readonly<{ xMpt: number; yMpt: number }>,
  widthMpt: number,
  heightMpt: number,
  anchor: BoringLogTextFrameAnchor,
): TextFrame {
  const horizontal = anchor.endsWith("left")
    ? 0
    : anchor.endsWith("right")
      ? widthMpt
      : Math.round(widthMpt / 2);
  const vertical = anchor.startsWith("top")
    ? 0
    : anchor.startsWith("bottom")
      ? heightMpt
      : Math.round(heightMpt / 2);
  return Object.freeze({
    xMpt: point.xMpt - horizontal,
    yMpt: point.yMpt - vertical,
    widthMpt,
    heightMpt,
  });
}

import { projectBoringLogSceneToSvg } from "./boring-log-svg-projection.js";
import {
  buildBoringLogStudioTree,
  visibleBoringLogStudioTreeItems,
} from "./boring-log-studio-tree.js";
import {
  nearestBoringLogDirectManipulationResizeHandle,
  resolveBoringLogDirectManipulationFrame,
  snapBoringLogDirectManipulationFrame,
  type BoringLogDirectManipulationHandle,
  type BoringLogSnapTarget,
  type BoringLogSnapTargetKind,
} from "./boring-log-direct-manipulation.js";
import { findCollisionFreeTextDuplicateOffset } from "./boring-log-authoring-placement.js";
import {
  resolveStudioContextMenuPosition,
  resolveStudioPaneWidths,
  studioPaneLimits,
  type StudioPaneResizeTarget,
} from "./boring-log-studio-viewport.js";

type EditableValue = Readonly<{
  readonly semanticId: string;
  readonly property: string;
  readonly sourceFieldIdentity: string;
  readonly sourceEntityIdentity: string;
  readonly sourceBaselineValueDigest: string;
  readonly valueType: "string" | "number";
  readonly unit: OverrideRenderUnitState;
  readonly sourceOriginal: OverrideRenderDomainValueProjection;
  readonly effectiveDisplay: OverrideRenderDomainValueProjection;
  readonly application:
    | { readonly kind: "source" }
    | {
        readonly kind: "display-value-override";
        readonly presentationOverrideIdentity: string;
      };
}>;

type StudioProjection = Readonly<{
  readonly workingRevision: number;
  readonly durableRevision: number;
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly editableValues: readonly EditableValue[];
  readonly guides: readonly PageGuide[];
  readonly columnResizeConstraints: readonly Readonly<{
    readonly columnId: string;
    readonly minimumWidthMpt: number;
    readonly widthPinned: boolean;
  }>[];
  readonly regionResizeConstraints: Readonly<{
    readonly minimumHeaderHeightMpt: number;
    readonly minimumDepthBodyHeightMpt: number;
    readonly minimumFooterHeightMpt: number;
  }>;
  readonly textTemplateScopeSummary: Readonly<{
    readonly authoredStyleCount: number;
    readonly excludedOverrideStyleCount: number;
  }>;
  readonly lithologyAppearanceStates: readonly Readonly<{
    readonly semanticId: string;
    readonly boringLogIdentity: string;
    readonly intervalId: string;
    readonly classification: string;
    readonly mappedClassificationKey: string;
    readonly sourceMaterialFillToken: string;
    readonly sourceMaterialFillColor: string;
    readonly sourcePatternId: string;
    readonly effectiveMaterialFillToken: string;
    readonly effectiveMaterialFillColor: string;
    readonly effectivePatternId: string;
    readonly materialFillApplication: "source" | "classification-default" | "interval-override";
    readonly patternApplication: "source" | "classification-default" | "interval-override";
  }>[];
  readonly lithologyPatternOptions: readonly Readonly<{
    readonly patternId: string;
    readonly kind: "line-hatch" | "horizontal-dash" | "dot-ring";
  }>[];
  readonly textOccurrencePresentationStates: readonly Readonly<{
    readonly occurrenceNodeId: string;
    readonly semanticId: string;
    readonly typography: "inherited" | "occurrence";
    readonly layout: "inherited" | "occurrence";
  }>[];
  readonly scene: ResolvedBoringLogPageScene;
}>;

type CommandResult = Readonly<{
  readonly accepted: boolean;
  readonly code?: string;
  readonly workingRevision?: number;
  readonly pageCount?: number;
  readonly createdOccurrenceNodeIds?: readonly string[];
  readonly createdGroupNodeId?: string;
  readonly affectedOccurrenceNodeIds?: readonly string[];
  readonly affectedBoringLogCount?: number;
  readonly mappedClassificationKey?: string;
}>;

type TextArrangementOperation =
  | Readonly<{ readonly kind: "nudge"; readonly deltaXMpt: number; readonly deltaYMpt: number }>
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

type TextAuthoringMutation =
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

type PublicationResult =
  | Readonly<{ accepted: false; code: string }>
  | Readonly<{
      accepted: true;
      result: Readonly<{
        code: "EXPORT_VERIFIED_SUCCESS";
        workingRevision: number;
        packageCandidateDigest: string;
        selectionDigest: string;
        orderedBoringLogIdentities: readonly string[];
        aggregateSceneDigest: string;
        aggregateProjectionDigest: string;
        pdfDigest: string;
        pdfBytes: number;
        pageCount: number;
        destinationPath: string;
      }>;
    }>;

type LifecycleOperation =
  | "get-state"
  | "new-project"
  | "open-project"
  | "import-rslog-project-data"
  | "save-project"
  | "save-project-as"
  | "first-boring"
  | "previous-boring"
  | "next-boring"
  | "last-boring";

type StudioApis = Readonly<{
  readonly studio: {
    readonly getProjection: (input: {
      readonly minimumWorkingRevision: number | null;
      readonly preview?: Readonly<{
        readonly expectedWorkingRevision: number;
        readonly occurrenceNodeId: string;
        readonly semanticId: string;
        readonly frame: TextFrame;
      }>;
    }) => Promise<
      | { readonly accepted: false; readonly code: string }
      | { readonly accepted: true; readonly projection: StudioProjection }
    >;
    readonly lifecycle: (input: {
      readonly operation: LifecycleOperation;
      readonly expectedWorkingRevision: number | null;
    }) => Promise<unknown>;
    readonly setLithologyAppearance: (input: {
      readonly expectedWorkingRevision: number;
      readonly boringLogIdentity: string;
      readonly intervalId: string;
      readonly applyScope: "interval" | "classification-default";
      readonly materialFillColor: string | null;
      readonly patternId: string | null;
    }) => Promise<CommandResult>;
    readonly setTextOccurrenceStyle: (input: {
      readonly expectedWorkingRevision: number;
      readonly applyScope:
        "occurrence" | "all-selected" | "column-default" | "named-style" | "template-default";
      readonly propertyMask?: readonly TextTemplateProperty[];
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
        readonly frameAnchor: BoringLogTextFrameAnchor;
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
    }) => Promise<unknown>;
    readonly resetTextOccurrencePresentation: (input: {
      readonly expectedWorkingRevision: number;
      readonly occurrenceNodeId: string;
      readonly semanticId: string;
    }) => Promise<unknown>;
    readonly setPageGuides: (input: {
      readonly expectedWorkingRevision: number;
      readonly mutation: PageGuideMutation;
    }) => Promise<CommandResult>;
    readonly setColumnDivider: (input: {
      readonly expectedWorkingRevision: number;
      readonly dividerAfterColumnId: string;
      readonly requestedDividerXMpt: number;
      readonly resizeMode: ColumnResizeMode;
    }) => Promise<CommandResult>;
    readonly setRegionBoundary: (input: {
      readonly expectedWorkingRevision: number;
      readonly boundary: RegionBoundary;
      readonly requestedBoundaryYMpt: number;
    }) => Promise<CommandResult>;
    readonly arrangeTextOccurrences: (input: {
      readonly expectedWorkingRevision: number;
      readonly keyElementId: string;
      readonly occurrenceNodeIds: readonly string[];
      readonly operation: TextArrangementOperation;
    }) => Promise<CommandResult>;
    readonly mutateTextOccurrences: (input: {
      readonly expectedWorkingRevision: number;
      readonly occurrenceNodeIds: readonly string[];
      readonly mutation: TextAuthoringMutation;
    }) => Promise<CommandResult>;
  };
  readonly document: {
    readonly setDisplayValue: (input: unknown) => Promise<CommandResult>;
    readonly undo: (input: { readonly expectedWorkingRevision: number }) => Promise<CommandResult>;
    readonly redo: (input: { readonly expectedWorkingRevision: number }) => Promise<CommandResult>;
  };
}>;

type LifecycleState = Readonly<{
  documentIdentity: string;
  displayName: string;
  displayPath: string | null;
  authoritativeFileBound: boolean;
  readOnly: boolean;
  storageStatus: "untargeted" | "supported-local-fixed-ntfs";
  workingRevision: number;
  durableRevision: number;
  dirty: boolean;
  activeBoringLogIdentity: string;
  activeExplorationIdentity: string;
  activeOrdinal: number;
  boringLogs: readonly Readonly<{
    boringLogIdentity: string;
    explorationIdentity: string;
    displayName: string;
    ordinal: number;
    warningCount: number;
    hasOverrides: boolean;
  }>[];
}>;

type PublicationApi = Readonly<{
  exportPdf: (input: {
    readonly expectedWorkingRevision: number;
    readonly orderedBoringLogIdentities: readonly string[];
  }) => Promise<PublicationResult>;
}>;

function element<ElementType extends Element>(id: string): ElementType {
  const value = document.getElementById(id);
  if (value === null) throw new Error(`Missing Boring Log Studio element: ${id}`);
  return value as unknown as ElementType;
}

function humanize(value: string): string {
  return value.replaceAll("-", " ").replace(/\b\w/gu, (character) => character.toUpperCase());
}

function provenanceText(provenance: BoringLogValueProvenance | null): string {
  if (provenance === null) return "Computed by the frozen page plan";
  if (provenance.provenanceClass === "source") {
    return `Source original · ${provenance.sourceEntityIdentity} · ${provenance.sourceFieldIdentity}`;
  }
  return `Effective override · ${provenance.overrideIdentity} · original ${provenance.original.sourceFieldIdentity}`;
}

function boundsText(nodes: readonly BoringLogSceneNode[]): string {
  const bounded = nodes.find((node) => node.kind === "group" || node.kind === "rect");
  if (bounded?.kind === "group" || bounded?.kind === "rect") {
    const { xMpt, yMpt, widthMpt, heightMpt } = bounded.bounds;
    return `${xMpt}, ${yMpt} · ${widthMpt} × ${heightMpt} mpt`;
  }
  const line = nodes.find((node) => node.kind === "line");
  if (line?.kind === "line") {
    return `${line.from.xMpt}, ${line.from.yMpt} → ${line.to.xMpt}, ${line.to.yMpt} mpt`;
  }
  const text = nodes.find((node) => node.kind === "text");
  if (text?.kind === "text") {
    return `${text.frame.xMpt}, ${text.frame.yMpt} · ${text.frame.widthMpt} × ${text.frame.heightMpt} mpt`;
  }
  return "Vector geometry";
}

function sceneFromDocument(): unknown {
  const source = element<HTMLScriptElement>("resolved-page-scene").textContent;
  if (source === null || source.length === 0) throw new Error("Resolved scene data is missing");
  return JSON.parse(source) as unknown;
}

async function main(): Promise<void> {
  let bootstrapProjection: StudioProjection | null = null;
  let initialScene = sceneFromDocument();
  if (initialScene === null) {
    const apis = studioApis();
    if (apis === null) throw new Error("Studio projection authority is unavailable");
    const response = await apis.studio.getProjection({ minimumWorkingRevision: null });
    if (!response.accepted) throw new Error(`Studio projection rejected: ${response.code}`);
    bootstrapProjection = response.projection;
    initialScene = response.projection.scene;
  }
  const initialProjection = projectBoringLogSceneToSvg(initialScene);
  if (!initialProjection.accepted) {
    throw new Error(`${initialProjection.code}: ${initialProjection.detail}`);
  }

  let scene = initialProjection.scene;
  let page = scene.pages[0]!;
  const pageHost = element<HTMLDivElement>("svg-page");
  const pageShadow = element<HTMLDivElement>("page-shadow");
  const pageGuidesHost = element<SVGSVGElement>("page-guides");
  const horizontalRuler = element<SVGSVGElement>("horizontal-ruler");
  const verticalRuler = element<SVGSVGElement>("vertical-ruler");
  const canvasStage = element<HTMLDivElement>("canvas-stage");
  const ribbonQuery = document.querySelector<HTMLElement>(".ribbon");
  if (ribbonQuery === null) throw new Error("Studio ribbon is unavailable");
  const ribbon: HTMLElement = ribbonQuery;
  const workspaceQuery = document.querySelector<HTMLElement>(".workspace");
  if (workspaceQuery === null) throw new Error("Studio workspace is unavailable");
  const workspace: HTMLElement = workspaceQuery;
  const contentsPaneQuery = document.querySelector<HTMLElement>(".contents-pane");
  if (contentsPaneQuery === null) throw new Error("Contents pane is unavailable");
  const contentsPane: HTMLElement = contentsPaneQuery;
  const propertiesPaneQuery = document.querySelector<HTMLElement>(".properties-pane");
  if (propertiesPaneQuery === null) throw new Error("Properties pane is unavailable");
  const propertiesPane: HTMLElement = propertiesPaneQuery;
  const contentsSplitter = element<HTMLElement>("contents-splitter");
  const propertiesSplitter = element<HTMLElement>("properties-splitter");
  const tree = element<HTMLDivElement>("contents-tree");
  const filter = element<HTMLInputElement>("contents-filter");
  const contentsOptions = element<HTMLButtonElement>("contents-options");
  const contentsModeDrawing = element<HTMLButtonElement>("contents-mode-drawing");
  const contentsModeSource = element<HTMLButtonElement>("contents-mode-source");
  const emptySelection = element<HTMLElement>("selection-empty");
  const selectionProperties = element<HTMLElement>("selection-properties");
  const selectionName = element<HTMLElement>("selection-name");
  const selectionRole = element<HTMLElement>("selection-role");
  const selectionProvenance = element<HTMLElement>("selection-provenance");
  const propertySemanticId = element<HTMLElement>("property-semantic-id");
  const propertyNodeId = element<HTMLElement>("property-node-id");
  const propertyRole = element<HTMLElement>("property-role");
  const propertyNodeCount = element<HTMLElement>("property-node-count");
  const propertyContent = element<HTMLTextAreaElement>("property-content");
  const applyProperty = element<HTMLButtonElement>("apply-property");
  const propertyHelp = element<HTMLElement>("property-help");
  const propertyBounds = element<HTMLElement>("property-bounds");
  const propertyProvenance = element<HTMLElement>("property-provenance");
  const propertySourceOriginal = element<HTMLElement>("property-source-original");
  const propertyEffectiveValue = element<HTMLElement>("property-effective-value");
  const regionResizeProperties = element<HTMLDetailsElement>("region-resize-properties");
  const regionHeight = element<HTMLInputElement>("region-height");
  const applyRegionHeight = element<HTMLButtonElement>("apply-region-height");
  const regionMinimumHeight = element<HTMLElement>("region-minimum-height");
  const regionDepthScale = element<HTMLElement>("region-depth-scale");
  const regionPagination = element<HTMLElement>("region-pagination");
  const columnResizeProperties = element<HTMLDetailsElement>("column-resize-properties");
  const columnWidth = element<HTMLInputElement>("column-width");
  const columnResizeMode = element<HTMLSelectElement>("column-resize-mode");
  const applyColumnWidth = element<HTMLButtonElement>("apply-column-width");
  const columnMinimumWidth = element<HTMLElement>("column-minimum-width");
  const columnResizeAffected = element<HTMLElement>("column-resize-affected");
  const lithologyAppearanceProperties = element<HTMLDetailsElement>(
    "lithology-appearance-properties",
  );
  const lithologyClassification = element<HTMLElement>("lithology-classification");
  const lithologyMappedKey = element<HTMLElement>("lithology-mapped-key");
  const lithologyFillColor = element<HTMLInputElement>("lithology-fill-color");
  const lithologyPattern = element<HTMLSelectElement>("lithology-pattern");
  const applyLithologyInterval = element<HTMLButtonElement>("apply-lithology-interval");
  const setLithologyDefault = element<HTMLButtonElement>("set-lithology-default");
  const lithologyFillScope = element<HTMLElement>("lithology-fill-scope");
  const lithologyPatternScope = element<HTMLElement>("lithology-pattern-scope");
  const lithologyAppearanceHelp = element<HTMLElement>("lithology-appearance-help");
  const textStyleProperties = element<HTMLDetailsElement>("text-style-properties");
  const textLayoutProperties = element<HTMLDetailsElement>("text-layout-properties");
  const textFontFamily = element<HTMLSelectElement>("text-font-family");
  const textFontSize = element<HTMLInputElement>("text-font-size");
  const textFontWeight = element<HTMLSelectElement>("text-font-weight");
  const textDecoration = element<HTMLSelectElement>("text-decoration");
  const textLineHeight = element<HTMLInputElement>("text-line-height");
  const textLetterSpacing = element<HTMLInputElement>("text-letter-spacing");
  const textWordSpacing = element<HTMLInputElement>("text-word-spacing");
  const textParagraphSpacing = element<HTMLInputElement>("text-paragraph-spacing");
  const textColor = element<HTMLInputElement>("text-color");
  const textStyleScope = element<HTMLSelectElement>("text-style-scope");
  const textAllSelectedScope = element<HTMLOptionElement>("text-all-selected-scope");
  const textColumnDefaultScope = element<HTMLOptionElement>("text-column-default-scope");
  const textNamedStyleScope = element<HTMLOptionElement>("text-named-style-scope");
  const textTemplateDefaultScope = element<HTMLOptionElement>("text-template-default-scope");
  const textFrameX = element<HTMLInputElement>("text-frame-x");
  const textFrameY = element<HTMLInputElement>("text-frame-y");
  const textFrameAnchor = element<HTMLSelectElement>("text-frame-anchor");
  const textFrameWidth = element<HTMLInputElement>("text-frame-width");
  const textFrameHeight = element<HTMLInputElement>("text-frame-height");
  const textHorizontalAlignment = element<HTMLSelectElement>("text-horizontal-alignment");
  const textVerticalAlignment = element<HTMLSelectElement>("text-vertical-alignment");
  const textWrapPolicy = element<HTMLSelectElement>("text-wrap-policy");
  const textOverflowPolicy = element<HTMLSelectElement>("text-overflow-policy");
  const textMinimumFontSize = element<HTMLInputElement>("text-minimum-font-size");
  const textRotation = element<HTMLInputElement>("text-rotation");
  const textPaddingTop = element<HTMLInputElement>("text-padding-top");
  const textPaddingRight = element<HTMLInputElement>("text-padding-right");
  const textPaddingBottom = element<HTMLInputElement>("text-padding-bottom");
  const textPaddingLeft = element<HTMLInputElement>("text-padding-left");
  const textFrameFillEnabled = element<HTMLInputElement>("text-frame-fill-enabled");
  const textFrameFillColor = element<HTMLInputElement>("text-frame-fill-color");
  const textFrameStrokeEnabled = element<HTMLInputElement>("text-frame-stroke-enabled");
  const textFrameStrokeColor = element<HTMLInputElement>("text-frame-stroke-color");
  const textFrameStrokeWidth = element<HTMLInputElement>("text-frame-stroke-width");
  const textPositionMode = element<HTMLSelectElement>("text-position-mode");
  const detachTextAnnotation = element<HTMLButtonElement>("detach-text-annotation");
  const textLocked = element<HTMLInputElement>("text-locked");
  const applyTextStyle = element<HTMLButtonElement>("apply-text-style");
  const textStyleHelp = element<HTMLElement>("text-style-help");
  const textInheritanceProperties = element<HTMLDetailsElement>("text-inheritance-properties");
  const textStyleInheritance = element<HTMLElement>("text-style-inheritance");
  const textLayoutInheritance = element<HTMLElement>("text-layout-inheritance");
  const resetTextPresentation = element<HTMLButtonElement>("reset-text-presentation");
  const selectionStatus = element<HTMLElement>("selection-status");
  const diagnosticsList = element<HTMLUListElement>("diagnostics-list");
  const diagnosticBadge = element<HTMLElement>("diagnostic-badge");
  const propertiesScroll = element<HTMLElement>("properties-scroll");
  const propertyElementPanel = element<HTMLElement>("property-element-panel");
  const propertyDiagnosticsPanel = element<HTMLElement>("property-diagnostics-panel");
  const propertyElementTab = element<HTMLButtonElement>("property-tab-element");
  const propertyDiagnosticsTab = element<HTMLButtonElement>("property-tab-diagnostics");
  const propertiesOptions = element<HTMLButtonElement>("properties-options");
  const canvasContextMenu = element<HTMLDivElement>("canvas-context-menu");
  const contextProperties = element<HTMLButtonElement>("context-properties");
  const arrangementButtons = Object.freeze({
    alignLeft: [
      element<HTMLButtonElement>("align-left"),
      element<HTMLButtonElement>("context-align-left"),
    ],
    alignCenter: [
      element<HTMLButtonElement>("align-center"),
      element<HTMLButtonElement>("context-align-center"),
    ],
    alignRight: [
      element<HTMLButtonElement>("align-right"),
      element<HTMLButtonElement>("context-align-right"),
    ],
    alignTop: [
      element<HTMLButtonElement>("align-top"),
      element<HTMLButtonElement>("context-align-top"),
    ],
    alignMiddle: [
      element<HTMLButtonElement>("align-middle"),
      element<HTMLButtonElement>("context-align-middle"),
    ],
    alignBottom: [
      element<HTMLButtonElement>("align-bottom"),
      element<HTMLButtonElement>("context-align-bottom"),
    ],
    matchWidth: [
      element<HTMLButtonElement>("match-width"),
      element<HTMLButtonElement>("context-match-width"),
    ],
    matchHeight: [
      element<HTMLButtonElement>("match-height"),
      element<HTMLButtonElement>("context-match-height"),
    ],
    matchBoth: [
      element<HTMLButtonElement>("match-both"),
      element<HTMLButtonElement>("context-match-both"),
    ],
    distributeHorizontal: [
      element<HTMLButtonElement>("distribute-horizontal"),
      element<HTMLButtonElement>("context-distribute-horizontal"),
    ],
    distributeVertical: [
      element<HTMLButtonElement>("distribute-vertical"),
      element<HTMLButtonElement>("context-distribute-vertical"),
    ],
  });
  const authoringButtons = Object.freeze([
    element<HTMLButtonElement>("duplicate-selection"),
    element<HTMLButtonElement>("cut-selection"),
    element<HTMLButtonElement>("delete-selection"),
    element<HTMLButtonElement>("context-duplicate-selection"),
    element<HTMLButtonElement>("context-cut-selection"),
    element<HTMLButtonElement>("context-delete-selection"),
    element<HTMLButtonElement>("show-selection"),
    element<HTMLButtonElement>("hide-selection"),
    element<HTMLButtonElement>("lock-selection"),
    element<HTMLButtonElement>("unlock-selection"),
    element<HTMLButtonElement>("bring-front"),
    element<HTMLButtonElement>("bring-forward"),
    element<HTMLButtonElement>("send-backward"),
    element<HTMLButtonElement>("send-back"),
    element<HTMLButtonElement>("context-hide-selection"),
    element<HTMLButtonElement>("context-lock-selection"),
    element<HTMLButtonElement>("context-bring-front"),
    element<HTMLButtonElement>("context-send-back"),
  ]);
  const copyButtons = Object.freeze([
    element<HTMLButtonElement>("copy-selection"),
    element<HTMLButtonElement>("context-copy-selection"),
  ]);
  const pasteButtons = Object.freeze([
    element<HTMLButtonElement>("paste-selection"),
    element<HTMLButtonElement>("context-paste-selection"),
  ]);
  const groupButtons = Object.freeze([
    element<HTMLButtonElement>("group-selection"),
    element<HTMLButtonElement>("context-group-selection"),
  ]);
  const ungroupButtons = Object.freeze([
    element<HTMLButtonElement>("ungroup-selection"),
    element<HTMLButtonElement>("context-ungroup-selection"),
  ]);
  const status = element<HTMLParagraphElement>("editor-status");
  const sceneSummary = element<HTMLElement>("scene-summary");
  const documentState = element<HTMLElement>("document-state");
  const documentName = element<HTMLElement>("document-name");
  const documentStateDot = element<HTMLElement>("document-state-dot");
  const documentReadiness = element<HTMLElement>("document-readiness");
  const zoom = element<HTMLInputElement>("zoom");
  const zoomValue = element<HTMLOutputElement>("zoom-value");
  const canvasScale = element<HTMLOutputElement>("canvas-scale");
  const undoButton = element<HTMLButtonElement>("undo");
  const redoButton = element<HTMLButtonElement>("redo");
  const exportPdfButton = element<HTMLButtonElement>("export-pdf");
  const publicationPackagePanel = element<HTMLElement>("publication-package-panel");
  const publicationSelectionSummary = element<HTMLOutputElement>("publication-selection-summary");
  const publicationLogList = element<HTMLOListElement>("publication-log-list");
  const publicationMoveUp = element<HTMLButtonElement>("publication-move-up");
  const publicationMoveDown = element<HTMLButtonElement>("publication-move-down");
  const validateButton = element<HTMLButtonElement>("validate-document");
  const selectToolButton = element<HTMLButtonElement>("select-tool");
  const panToolButton = element<HTMLButtonElement>("pan-tool");
  const smartSnapButton = element<HTMLButtonElement>("toggle-smart-snap");
  const gridSnapButton = element<HTMLButtonElement>("toggle-grid-snap");
  const boringSelector = element<HTMLInputElement>("boring-selector");
  const boringOptions = element<HTMLDataListElement>("boring-options");
  const boringPosition = element<HTMLOutputElement>("boring-position");
  const boringIndicators = element<HTMLElement>("boring-indicators");
  const firstBoringButton = element<HTMLButtonElement>("first-boring");
  const previousBoringButton = element<HTMLButtonElement>("previous-boring");
  const nextBoringButton = element<HTMLButtonElement>("next-boring");
  const lastBoringButton = element<HTMLButtonElement>("last-boring");
  let selectedSemanticId: string | null = null;
  let selectedSceneNodeId: string | null = null;
  const selectedTextNodeIds = new Set<string>();
  let textClipboardNodeIds: readonly string[] = Object.freeze([]);
  let textClipboardBoringLogIdentity: string | null = null;
  const templateTextPropertyMask = new Set<TextTemplateProperty>();
  let currentTextFrameAnchor: BoringLogTextFrameAnchor = "top-left";
  let selectedLithologyInitialColor: string | null = null;
  let selectedLithologyInitialPatternId: string | null = null;
  let studioProjection: StudioProjection | null = bootstrapProjection;
  let lifecycleState: LifecycleState | null = null;
  let lifecycleRefreshPromise: Promise<boolean> | null = null;
  let publicationDocumentIdentity: string | null = null;
  let publicationOrder: string[] = [];
  const publicationIncluded = new Set<string>();
  let publicationKeyIdentity: string | null = null;
  const selectionByBoring = new Map<
    string,
    Readonly<{
      readonly semanticId: string;
      readonly nodeId: string | null;
      readonly textNodeIds: readonly string[];
    }> | null
  >();
  const collapsedTreeItems = new Set<string>();
  let contentsMode: "drawing" | "source" = "drawing";
  let interactionMode: "select" | "pan" = "select";
  let zoomMode: "fit" | "manual" = "manual";
  let panGesture:
    | Readonly<{
        pointerId: number;
        clientX: number;
        clientY: number;
        scrollLeft: number;
        scrollTop: number;
      }>
    | undefined;
  let paneResizeGesture:
    | Readonly<{
        pointerId: number;
        resizeTarget: Exclude<StudioPaneResizeTarget, "viewport">;
        startClientX: number;
        contentsWidth: number;
        propertiesWidth: number;
      }>
    | undefined;
  let contentsPaneWidth: number = studioPaneLimits.contents.default;
  let propertiesPaneWidth: number = studioPaneLimits.properties.default;
  let pinchZoomAccumulator = 0;
  let directManipulationGesture:
    | {
        readonly pointerId: number;
        readonly nodeId: string;
        readonly semanticId: string;
        readonly handle: BoringLogDirectManipulationHandle;
        readonly startPoint: Readonly<{ xMpt: number; yMpt: number }>;
        readonly originalFrame: TextFrame;
        previewFrame: TextFrame;
        readonly positionMode: "depth-bound" | "free";
        readonly minimumWidthMpt: number;
        readonly minimumHeightMpt: number;
        readonly snapTargets: Readonly<{
          readonly x: readonly BoringLogSnapTarget[];
          readonly y: readonly BoringLogSnapTarget[];
        }>;
        readonly baselineOffsetsYMpt: readonly number[];
        readonly originalTransform: string | null;
        readonly originalFrameTransform: string | null;
      }
    | undefined;
  let marqueeGesture:
    | {
        readonly pointerId: number;
        readonly start: Readonly<{ xMpt: number; yMpt: number }>;
        current: Readonly<{ xMpt: number; yMpt: number }>;
        readonly additive: boolean;
      }
    | undefined;
  let pageGuideGesture:
    | {
        readonly pointerId: number;
        readonly guideId: string | null;
        readonly orientation: "horizontal" | "vertical";
        readonly originalPositionMpt: number;
        previewPositionMpt: number;
        readonly locked: boolean;
      }
    | undefined;
  let columnDividerGesture:
    | {
        readonly pointerId: number;
        readonly leftColumnId: string;
        readonly rightColumnId: string;
        readonly leftXMpt: number;
        readonly conservedEndMpt: number;
        readonly resizeMode: ColumnResizeMode;
        readonly affectedColumns: readonly Readonly<{
          readonly id: string;
          readonly xMpt: number;
          readonly widthMpt: number;
        }>[];
        readonly originalDividerXMpt: number;
        readonly minimumDividerXMpt: number;
        readonly maximumDividerXMpt: number;
        previewDividerXMpt: number;
      }
    | undefined;
  let regionBoundaryGesture:
    | {
        readonly pointerId: number;
        readonly boundary: RegionBoundary;
        readonly originalBoundaryYMpt: number;
        readonly minimumBoundaryYMpt: number;
        readonly maximumBoundaryYMpt: number;
        previewBoundaryYMpt: number;
      }
    | undefined;
  let suppressCanvasClick = false;
  let smartSnapEnabled = true;
  let gridSnapEnabled = false;
  let liveReflowPreviewTimer: number | undefined;
  let liveReflowPreviewFrame: TextFrame | undefined;
  let liveReflowPreviewInFlight: Promise<void> | null = null;
  let pendingKeyboardNudge:
    | {
        readonly expectedWorkingRevision: number;
        readonly keyElementId: string;
        readonly occurrenceNodeIds: readonly string[];
        deltaXMpt: number;
        deltaYMpt: number;
        timer: number;
      }
    | undefined;
  let keyboardNudgeCommitInFlight = false;

  function studioApis(): StudioApis | null {
    const world = globalThis as typeof globalThis & {
      readonly rsrender?: StudioApis;
      readonly rsrenderStudio?: StudioApis["studio"];
    };
    return world.rsrender !== undefined && world.rsrenderStudio !== undefined
      ? Object.freeze({ document: world.rsrender.document, studio: world.rsrenderStudio })
      : null;
  }

  function publicationApi(): PublicationApi | null {
    return (
      (globalThis as typeof globalThis & { readonly rsrenderPublication?: PublicationApi })
        .rsrenderPublication ?? null
    );
  }

  function contentValue(content: OverrideRenderContentState): string | number | null {
    if (content.kind === "value") {
      return typeof content.value === "string" || typeof content.value === "number"
        ? content.value
        : null;
    }
    if (content.kind === "zero") return 0;
    if (content.kind === "empty-string") return "";
    return null;
  }

  function editableFor(semanticId: string): EditableValue | null {
    return (
      studioProjection?.editableValues.find((value) => value.semanticId === semanticId) ?? null
    );
  }

  function orderedPublicationSelection(): readonly string[] {
    return Object.freeze(
      publicationOrder.filter((boringLogIdentity) => publicationIncluded.has(boringLogIdentity)),
    );
  }

  function renderPublicationInventory(): void {
    const state = lifecycleState;
    if (state === null) {
      publicationLogList.replaceChildren();
      publicationSelectionSummary.value = "0 of 0 logs selected";
      publicationSelectionSummary.textContent = publicationSelectionSummary.value;
      publicationMoveUp.disabled = true;
      publicationMoveDown.disabled = true;
      return;
    }
    const boringByIdentity = new Map(
      state.boringLogs.map((boring) => [boring.boringLogIdentity, boring]),
    );
    publicationLogList.replaceChildren(
      ...publicationOrder.map((boringLogIdentity, packageIndex) => {
        const boring = boringByIdentity.get(boringLogIdentity)!;
        const item = document.createElement("li");
        item.dataset["publicationBoringLogIdentity"] = boringLogIdentity;
        item.dataset["packageIndex"] = String(packageIndex);
        item.classList.toggle("is-package-key", publicationKeyIdentity === boringLogIdentity);
        const included = document.createElement("input");
        included.type = "checkbox";
        included.checked = publicationIncluded.has(boringLogIdentity);
        included.setAttribute("aria-label", `Include ${boring.displayName} in PDF package`);
        included.addEventListener("change", () => {
          if (included.checked) publicationIncluded.add(boringLogIdentity);
          else publicationIncluded.delete(boringLogIdentity);
          publicationKeyIdentity = boringLogIdentity;
          renderPublicationInventory();
          updateHistoryControls();
          status.textContent = `${orderedPublicationSelection().length} Boring Log${orderedPublicationSelection().length === 1 ? "" : "s"} selected for one PDF package.`;
        });
        const choose = document.createElement("button");
        choose.type = "button";
        choose.dataset["publicationSelectIdentity"] = boringLogIdentity;
        choose.setAttribute("aria-label", `Select ${boring.displayName} for package ordering`);
        const name = document.createElement("strong");
        name.textContent = `${packageIndex + 1}. ${boring.displayName}`;
        const identity = document.createElement("small");
        identity.textContent = boring.explorationIdentity;
        choose.append(name, identity);
        choose.addEventListener("click", () => {
          publicationKeyIdentity = boringLogIdentity;
          renderPublicationInventory();
        });
        const stateLabel = document.createElement("span");
        stateLabel.className = "publication-log-state";
        stateLabel.textContent = `${boring.warningCount === 0 ? "Ready" : `${boring.warningCount} warning${boring.warningCount === 1 ? "" : "s"}`} · ${boring.hasOverrides ? "Edited" : "Source"}`;
        item.append(included, choose, stateLabel);
        return item;
      }),
    );
    const selected = orderedPublicationSelection();
    publicationSelectionSummary.value = `${selected.length} of ${publicationOrder.length} logs selected`;
    publicationSelectionSummary.textContent = publicationSelectionSummary.value;
    publicationSelectionSummary.dataset["orderedBoringLogIdentities"] = JSON.stringify(selected);
    const keyIndex =
      publicationKeyIdentity === null ? -1 : publicationOrder.indexOf(publicationKeyIdentity);
    publicationMoveUp.disabled = keyIndex <= 0;
    publicationMoveDown.disabled = keyIndex < 0 || keyIndex >= publicationOrder.length - 1;
  }

  function installPublicationInventory(next: LifecycleState): void {
    const canonicalOrder = next.boringLogs.map(({ boringLogIdentity }) => boringLogIdentity);
    if (publicationDocumentIdentity !== next.documentIdentity) {
      publicationDocumentIdentity = next.documentIdentity;
      publicationOrder = [...canonicalOrder];
      publicationIncluded.clear();
      for (const identity of canonicalOrder) publicationIncluded.add(identity);
      publicationKeyIdentity = canonicalOrder[0] ?? null;
    } else {
      const allowed = new Set(canonicalOrder);
      publicationOrder = publicationOrder.filter((identity) => allowed.has(identity));
      for (const identity of canonicalOrder) {
        if (!publicationOrder.includes(identity)) {
          publicationOrder.push(identity);
          publicationIncluded.add(identity);
        }
      }
      for (const identity of [...publicationIncluded]) {
        if (!allowed.has(identity)) publicationIncluded.delete(identity);
      }
      if (publicationKeyIdentity === null || !allowed.has(publicationKeyIdentity)) {
        publicationKeyIdentity = publicationOrder[0] ?? null;
      }
    }
    renderPublicationInventory();
  }

  function movePublicationKey(delta: -1 | 1): void {
    if (publicationKeyIdentity === null) return;
    const from = publicationOrder.indexOf(publicationKeyIdentity);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= publicationOrder.length) return;
    const [moved] = publicationOrder.splice(from, 1);
    publicationOrder.splice(to, 0, moved!);
    renderPublicationInventory();
    status.textContent = `PDF package order updated; ${lifecycleState?.activeBoringLogIdentity === publicationKeyIdentity ? "the active Canvas stayed on this Boring Log" : "the active Canvas was unchanged"}.`;
  }

  function updateHistoryControls(): void {
    const lifecycleRefreshPending = lifecycleRefreshPromise !== null;
    undoButton.disabled = lifecycleRefreshPending || studioProjection?.canUndo !== true;
    redoButton.disabled = lifecycleRefreshPending || studioProjection?.canRedo !== true;
    exportPdfButton.disabled =
      studioProjection === null || publicationApi() === null || publicationIncluded.size === 0;
    validateButton.disabled = studioProjection === null;
    const dirty = studioProjection?.dirty === true;
    documentState.textContent = dirty ? "Unsaved changes" : "Clean";
    documentStateDot.classList.toggle("is-dirty", dirty);
    documentReadiness.textContent = dirty ? "● Modified" : "● Ready";
    documentReadiness.classList.toggle("is-dirty", dirty);
    element<HTMLButtonElement>("save-project").disabled = studioProjection === null;
    element<HTMLButtonElement>("save-project-as").disabled = studioProjection === null;
  }

  function decodedLifecycleResult(input: unknown): {
    readonly accepted: boolean;
    readonly code: string;
    readonly state: LifecycleState | null;
  } | null {
    if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
    const value = input as Record<string, unknown>;
    if (typeof value["accepted"] !== "boolean" || typeof value["code"] !== "string") return null;
    const inputState = value["state"];
    if (inputState === null)
      return { accepted: value["accepted"], code: value["code"], state: null };
    if (typeof inputState !== "object" || Array.isArray(inputState)) return null;
    const state = inputState as Record<string, unknown>;
    if (
      typeof state["documentIdentity"] !== "string" ||
      typeof state["displayName"] !== "string" ||
      !(state["displayPath"] === null || typeof state["displayPath"] === "string") ||
      typeof state["authoritativeFileBound"] !== "boolean" ||
      typeof state["readOnly"] !== "boolean" ||
      !(
        state["storageStatus"] === "untargeted" ||
        state["storageStatus"] === "supported-local-fixed-ntfs"
      ) ||
      !Number.isSafeInteger(state["workingRevision"]) ||
      !Number.isSafeInteger(state["durableRevision"]) ||
      typeof state["dirty"] !== "boolean" ||
      typeof state["activeBoringLogIdentity"] !== "string" ||
      typeof state["activeExplorationIdentity"] !== "string" ||
      !Number.isSafeInteger(state["activeOrdinal"]) ||
      !Array.isArray(state["boringLogs"]) ||
      state["boringLogs"].length < 1 ||
      state["boringLogs"].length > 64 ||
      state["boringLogs"].some((input) => {
        if (typeof input !== "object" || input === null || Array.isArray(input)) return true;
        const boring = input as Record<string, unknown>;
        return (
          typeof boring["boringLogIdentity"] !== "string" ||
          typeof boring["explorationIdentity"] !== "string" ||
          typeof boring["displayName"] !== "string" ||
          !Number.isSafeInteger(boring["ordinal"]) ||
          typeof boring["warningCount"] !== "number" ||
          !Number.isSafeInteger(boring["warningCount"]) ||
          boring["warningCount"] < 0 ||
          typeof boring["hasOverrides"] !== "boolean"
        );
      })
    )
      return null;
    return {
      accepted: value["accepted"],
      code: value["code"],
      state: state as unknown as LifecycleState,
    };
  }

  function installLifecycleState(next: LifecycleState): void {
    lifecycleState = next;
    installPublicationInventory(next);
    documentName.textContent = next.displayName;
    documentName.title = next.displayPath ?? "This project has not been saved yet.";
    document.body.dataset["authoritativeFileBound"] = String(next.authoritativeFileBound);
    document.body.dataset["projectStorageStatus"] = next.storageStatus;
    document.body.dataset["activeBoringLogIdentity"] = next.activeBoringLogIdentity;
    boringOptions.replaceChildren(
      ...next.boringLogs.map((boring) => {
        const option = document.createElement("option");
        option.value = `${boring.ordinal}. ${boring.displayName}`;
        option.label = boring.explorationIdentity;
        return option;
      }),
    );
    const active = next.boringLogs.find(
      ({ boringLogIdentity }) => boringLogIdentity === next.activeBoringLogIdentity,
    );
    if (active === undefined) throw new Error("Active Boring Log is absent from project state");
    boringSelector.value = `${active.ordinal}. ${active.displayName}`;
    boringPosition.value = `Boring ${active.ordinal} of ${next.boringLogs.length}`;
    boringIndicators.textContent = `${active.warningCount === 0 ? "No warnings" : `${active.warningCount} warning${active.warningCount === 1 ? "" : "s"}`} · ${active.hasOverrides ? "Has overrides" : "Source original"}`;
    firstBoringButton.disabled = active.ordinal === 1;
    previousBoringButton.disabled = active.ordinal === 1;
    nextBoringButton.disabled = active.ordinal === next.boringLogs.length;
    lastBoringButton.disabled = active.ordinal === next.boringLogs.length;
    updateArrangementControls();
    element<HTMLElement>("canvas-title").textContent = `${active.displayName} — Page 1`;
    element<HTMLElement>("page-status").textContent =
      `Boring ${active.ordinal} of ${next.boringLogs.length} · Page 1 of 1`;
    updateHistoryControls();
  }

  async function refreshLifecycleStateSilently(): Promise<boolean> {
    if (lifecycleRefreshPromise !== null) return lifecycleRefreshPromise;
    const pending = (async (): Promise<boolean> => {
      const apis = studioApis();
      if (apis === null) return false;
      const result = decodedLifecycleResult(
        await apis.studio.lifecycle({ operation: "get-state", expectedWorkingRevision: null }),
      );
      if (result === null || !result.accepted || result.state === null) return false;
      installLifecycleState(result.state);
      return true;
    })();
    lifecycleRefreshPromise = pending;
    updateHistoryControls();
    try {
      return await pending;
    } finally {
      if (lifecycleRefreshPromise === pending) lifecycleRefreshPromise = null;
      updateHistoryControls();
    }
  }

  async function invokeLifecycle(operation: LifecycleOperation): Promise<void> {
    const apis = studioApis();
    if (apis === null) return;
    if (operation !== "get-state" && pendingKeyboardNudge !== undefined) {
      await flushKeyboardNudge();
    }
    const navigation = ["first-boring", "previous-boring", "next-boring", "last-boring"].includes(
      operation,
    );
    const priorBoringIdentity = lifecycleState?.activeBoringLogIdentity ?? null;
    if (navigation && priorBoringIdentity !== null) {
      selectionByBoring.set(
        priorBoringIdentity,
        selectedSemanticId === null
          ? null
          : Object.freeze({
              semanticId: selectedSemanticId,
              nodeId: selectedSceneNodeId,
              textNodeIds: Object.freeze([...selectedTextNodeIds]),
            }),
      );
    }
    const expected = operation === "get-state" ? null : (studioProjection?.workingRevision ?? null);
    status.textContent = `${humanize(operation)}…`;
    const result = decodedLifecycleResult(
      await apis.studio.lifecycle({ operation, expectedWorkingRevision: expected }),
    );
    if (result === null) {
      status.textContent = `${humanize(operation)} route returned an invalid result.`;
      return;
    }
    if (result.state !== null) installLifecycleState(result.state);
    if (!result.accepted) {
      status.textContent = result.code.endsWith("_CANCELED")
        ? `${humanize(operation)} canceled; the current project is unchanged.`
        : result.code === "RSLOG_PROJECT_DATA_SCHEMA_UNADMITTED"
          ? "RSLog Project Data JSON was valid, but its vendor export schema has not been admitted yet. The current project is unchanged."
          : `${humanize(operation)} failed: ${result.code}`;
      return;
    }
    if (result.code === "PROJECT_SAVE_VERIFIED") {
      await refreshStudioProjection(
        result.state?.workingRevision ?? null,
        `Project saved and reopened successfully${result.state?.displayPath === null ? "." : `: ${result.state?.displayPath}`}`,
      );
      return;
    }
    if (result.code === "PROJECT_BORING_CHANGED" && result.state !== null) {
      const selection = selectionByBoring.get(result.state.activeBoringLogIdentity) ?? null;
      selectedSemanticId = selection?.semanticId ?? null;
      selectedSceneNodeId = selection?.nodeId ?? null;
      selectedTextNodeIds.clear();
      for (const nodeId of selection?.textNodeIds ?? []) selectedTextNodeIds.add(nodeId);
      await refreshStudioProjection(
        result.state.workingRevision,
        `${boringPosition.value}: ${boringSelector.value}`,
      );
      boringSelector.blur();
      return;
    }
    status.textContent =
      result.code === "PROJECT_STATE_READY"
        ? `${result.state?.authoritativeFileBound === true ? "Saved Log Project" : "Untitled Log Project"} ready.`
        : result.code.includes("RESTARTING")
          ? "Switching Log Projects…"
          : humanize(result.code);
  }

  function installSvg(): void {
    const pageElements = scene.pages.map((scenePage, pageIndex) => {
      const projection = projectBoringLogSceneToSvg(scene, selectedSemanticId, scenePage.pageId);
      if (!projection.accepted) throw new Error(projection.detail);
      const parsed = new DOMParser().parseFromString(projection.markup, "image/svg+xml");
      if (parsed.querySelector("parsererror") !== null)
        throw new Error("SVG projection parse failed");
      const svg = document.importNode(parsed.documentElement, true);
      svg.classList.add("resolved-page");
      svg.setAttribute("data-page-index", String(pageIndex));
      svg.setAttribute(
        "aria-label",
        `Structured boring log page ${pageIndex + 1} of ${scene.pages.length}`,
      );
      return svg;
    });
    pageHost.replaceChildren(...pageElements);
    element<HTMLElement>("page-status").textContent =
      `${scene.pages.length} page${scene.pages.length === 1 ? "" : "s"} in active Boring Log`;
    const activeBoringDisplayName = lifecycleState?.boringLogs.find(
      ({ boringLogIdentity }) => boringLogIdentity === lifecycleState?.activeBoringLogIdentity,
    )?.displayName;
    element<HTMLElement>("canvas-title").textContent =
      `${activeBoringDisplayName ?? "Boring Log"} - ${scene.pages.length} page${scene.pages.length === 1 ? "" : "s"}`;
    sceneSummary.textContent = `${scene.pages.length} page${scene.pages.length === 1 ? "" : "s"} - ${scene.pages.reduce((total, scenePage) => total + scenePage.nodes.length, 0)} vector nodes - ${scene.diagnostics.length} diagnostics`;
    if (selectedSceneNodeId !== null || selectedTextNodeIds.size > 0) {
      for (const selected of pageHost.querySelectorAll<SVGElement>(".scene-node.is-selected")) {
        selected.classList.remove("is-selected");
      }
      for (const occurrence of pageHost.querySelectorAll<SVGElement>("[data-node-id]")) {
        if (selectedTextNodeIds.has(occurrence.dataset["nodeId"] ?? "")) {
          occurrence.classList.add("is-selected");
        }
        if (occurrence.dataset["nodeId"] === selectedSceneNodeId) {
          occurrence.classList.add("is-key-element");
        }
      }
      if (selectedTextNodeIds.size === 0) {
        const occurrence = [...pageHost.querySelectorAll<SVGElement>("[data-node-id]")].find(
          (candidate) => candidate.dataset["nodeId"] === selectedSceneNodeId,
        );
        occurrence?.classList.add("is-selected");
      }
    }
    installRegionBoundaryControls();
    installColumnDividerControls();
    installDirectManipulationOverlay();
    renderPageRulers();
    renderPageGuides();
    pageHost.setAttribute("aria-busy", "false");
  }

  const directHandleCenters = (
    frame: TextFrame,
  ): Readonly<
    Record<Exclude<BoringLogDirectManipulationHandle, "move">, readonly [number, number]>
  > =>
    Object.freeze({
      "north-west": [frame.xMpt, frame.yMpt],
      north: [frame.xMpt + Math.round(frame.widthMpt / 2), frame.yMpt],
      "north-east": [frame.xMpt + frame.widthMpt, frame.yMpt],
      east: [frame.xMpt + frame.widthMpt, frame.yMpt + Math.round(frame.heightMpt / 2)],
      "south-east": [frame.xMpt + frame.widthMpt, frame.yMpt + frame.heightMpt],
      south: [frame.xMpt + Math.round(frame.widthMpt / 2), frame.yMpt + frame.heightMpt],
      "south-west": [frame.xMpt, frame.yMpt + frame.heightMpt],
      west: [frame.xMpt, frame.yMpt + Math.round(frame.heightMpt / 2)],
    });

  function installDirectManipulationOverlay(): void {
    const svg = pageHost.querySelector<SVGSVGElement>("svg");
    if (svg === null || interactionMode !== "select" || selectedSceneNodeId === null) return;
    const node = page.nodes.find(
      (candidate): candidate is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
        candidate.id === selectedSceneNodeId && candidate.kind === "text",
    );
    if (node === undefined || node.presentation?.visible === false) return;
    const namespace = "http://www.w3.org/2000/svg";
    const locked = node.presentation?.locked ?? false;
    const positionMode = node.presentation?.positionMode ?? "depth-bound";
    const group = document.createElementNS(namespace, "g");
    group.id = "direct-manipulation-overlay";
    group.dataset["nodeId"] = node.id;
    group.dataset["semanticId"] = node.semanticId;
    group.dataset["positionMode"] = positionMode;
    group.dataset["locked"] = String(locked);
    group.setAttribute("aria-label", `Canvas geometry controls for ${node.id}`);
    const moveTarget = document.createElementNS(namespace, "rect");
    moveTarget.id = "direct-manipulation-move";
    moveTarget.classList.add("direct-manipulation-move-target");
    moveTarget.dataset["directManipulationHandle"] = "move";
    moveTarget.setAttribute("x", String(node.frame.xMpt));
    moveTarget.setAttribute("y", String(node.frame.yMpt));
    moveTarget.setAttribute("width", String(node.frame.widthMpt));
    moveTarget.setAttribute("height", String(node.frame.heightMpt));
    moveTarget.setAttribute("role", "button");
    moveTarget.setAttribute("tabindex", "0");
    moveTarget.setAttribute("aria-disabled", String(locked));
    moveTarget.setAttribute(
      "aria-label",
      positionMode === "free"
        ? "Move selected text frame"
        : "Move selected depth-bound text frame horizontally",
    );
    const outline = document.createElementNS(namespace, "rect");
    outline.id = "direct-manipulation-frame";
    outline.classList.add("direct-manipulation-frame");
    outline.setAttribute("x", String(node.frame.xMpt));
    outline.setAttribute("y", String(node.frame.yMpt));
    outline.setAttribute("width", String(node.frame.widthMpt));
    outline.setAttribute("height", String(node.frame.heightMpt));
    group.append(moveTarget, outline);
    const handleSizeMpt = 8_000;
    for (const [handle, [xMpt, yMpt]] of Object.entries(directHandleCenters(node.frame)) as Array<
      readonly [Exclude<BoringLogDirectManipulationHandle, "move">, readonly [number, number]]
    >) {
      const control = document.createElementNS(namespace, "rect");
      control.classList.add("direct-manipulation-handle");
      control.dataset["directManipulationHandle"] = handle;
      control.setAttribute("x", String(xMpt - Math.round(handleSizeMpt / 2)));
      control.setAttribute("y", String(yMpt - Math.round(handleSizeMpt / 2)));
      control.setAttribute("width", String(handleSizeMpt));
      control.setAttribute("height", String(handleSizeMpt));
      control.setAttribute("role", "button");
      control.setAttribute("tabindex", "0");
      control.setAttribute("aria-disabled", String(locked));
      control.setAttribute("aria-label", `Resize selected text frame from ${humanize(handle)}`);
      group.append(control);
    }
    const moveControl = document.createElementNS(namespace, "rect");
    const moveCenterYMpt =
      node.frame.yMpt >= 14_000
        ? node.frame.yMpt - 12_000
        : node.frame.yMpt + node.frame.heightMpt + 12_000;
    moveControl.id = "direct-manipulation-move-control";
    moveControl.classList.add("direct-manipulation-move-control");
    moveControl.dataset["directManipulationHandle"] = "move";
    moveControl.setAttribute(
      "x",
      String(node.frame.xMpt + Math.round(node.frame.widthMpt / 2) - 4_000),
    );
    moveControl.setAttribute("y", String(moveCenterYMpt - 4_000));
    moveControl.setAttribute("width", "8000");
    moveControl.setAttribute("height", "8000");
    moveControl.setAttribute("role", "button");
    moveControl.setAttribute("tabindex", "0");
    moveControl.setAttribute("aria-disabled", String(locked));
    moveControl.setAttribute(
      "aria-label",
      positionMode === "free"
        ? "Move selected text frame"
        : "Move selected depth-bound text frame horizontally",
    );
    group.append(moveControl);
    svg.append(group);
  }

  function installColumnDividerControls(): void {
    const svg = pageHost.querySelector<SVGSVGElement>("svg");
    const plannedPage = scene.pagePlan.pages.find(({ pageId }) => pageId === page.pageId);
    const depthBody = plannedPage?.regions.find(({ role }) => role === "depth-body");
    if (svg === null || plannedPage === undefined || depthBody === undefined) return;
    const namespace = "http://www.w3.org/2000/svg";
    const group = document.createElementNS(namespace, "g");
    group.id = "column-divider-controls";
    group.setAttribute("aria-label", "Log Column divider controls");
    plannedPage.columns.slice(0, -1).forEach((column, index) => {
      const right = plannedPage.columns[index + 1]!;
      const xMpt = column.xMpt + column.widthMpt;
      const line = document.createElementNS(namespace, "line");
      line.classList.add("column-divider-line");
      line.setAttribute("x1", String(xMpt));
      line.setAttribute("x2", String(xMpt));
      line.setAttribute("y1", String(depthBody.yMpt));
      line.setAttribute("y2", String(depthBody.yMpt + depthBody.heightMpt));
      const control = document.createElementNS(namespace, "rect");
      control.classList.add("column-divider-control");
      control.dataset["dividerAfterColumnId"] = column.id;
      control.dataset["rightColumnId"] = right.id;
      control.setAttribute("x", String(xMpt - 4_000));
      control.setAttribute("y", String(depthBody.yMpt));
      control.setAttribute("width", "8000");
      control.setAttribute("height", String(depthBody.heightMpt));
      control.setAttribute("role", "separator");
      control.setAttribute("aria-orientation", "vertical");
      control.setAttribute("aria-label", `Resize ${column.id} and ${right.id}`);
      control.setAttribute("aria-valuenow", String(xMpt));
      control.setAttribute("tabindex", "0");
      group.append(line, control);
    });
    svg.append(group);
  }

  function regionBoundaryOutcome(boundary: RegionBoundary, requestedYMpt: number) {
    const plannedPage = scene.pagePlan.pages.find(({ pageId }) => pageId === page.pageId)!;
    const header = plannedPage.regions.find(({ role }) => role === "header")!;
    const depthBody = plannedPage.regions.find(({ role }) => role === "depth-body")!;
    const footer = plannedPage.regions.find(({ role }) => role === "footer")!;
    const constraints = studioProjection!.regionResizeConstraints;
    const headerGapMpt = depthBody.yMpt - (header.yMpt + header.heightMpt);
    const footerEndMpt = footer.yMpt + footer.heightMpt;
    const minimumYMpt =
      boundary === "header-depth"
        ? header.yMpt + constraints.minimumHeaderHeightMpt + headerGapMpt
        : depthBody.yMpt + constraints.minimumDepthBodyHeightMpt;
    const maximumYMpt =
      boundary === "header-depth"
        ? footer.yMpt - constraints.minimumDepthBodyHeightMpt
        : footerEndMpt - constraints.minimumFooterHeightMpt;
    const effectiveYMpt = Math.min(maximumYMpt, Math.max(minimumYMpt, requestedYMpt));
    const nextDepthY = boundary === "header-depth" ? effectiveYMpt : depthBody.yMpt;
    const nextDepthEnd = boundary === "depth-footer" ? effectiveYMpt : footer.yMpt;
    const yStartMpt = nextDepthY + (plannedPage.depthTransform.yStartMpt - depthBody.yMpt);
    const availablePlotHeightMpt = Math.max(1, nextDepthEnd - yStartMpt);
    const requiredPlotHeightMpt =
      (plannedPage.depthTransform.depthEndFt - plannedPage.depthTransform.depthStartFt) *
      plannedPage.depthTransform.mptPerFoot;
    return Object.freeze({
      effectiveYMpt,
      minimumYMpt,
      maximumYMpt,
      pageCount: Math.max(1, Math.ceil(requiredPlotHeightMpt / availablePlotHeightMpt)),
      repaginationRequired: availablePlotHeightMpt < requiredPlotHeightMpt,
    });
  }

  function installRegionBoundaryControls(): void {
    const svg = pageHost.querySelector<SVGSVGElement>("svg");
    const plannedPage = scene.pagePlan.pages.find(({ pageId }) => pageId === page.pageId);
    const depthBody = plannedPage?.regions.find(({ role }) => role === "depth-body");
    const footer = plannedPage?.regions.find(({ role }) => role === "footer");
    if (
      svg === null ||
      plannedPage === undefined ||
      depthBody === undefined ||
      footer === undefined
    )
      return;
    const namespace = "http://www.w3.org/2000/svg";
    const group = document.createElementNS(namespace, "g");
    group.id = "region-boundary-controls";
    for (const [boundary, yMpt] of [
      ["header-depth", depthBody.yMpt],
      ["depth-footer", footer.yMpt],
    ] as const) {
      const line = document.createElementNS(namespace, "line");
      line.classList.add("region-boundary-line");
      line.setAttribute("x1", String(depthBody.xMpt));
      line.setAttribute("x2", String(depthBody.xMpt + depthBody.widthMpt));
      line.setAttribute("y1", String(yMpt));
      line.setAttribute("y2", String(yMpt));
      const control = document.createElementNS(namespace, "rect");
      control.classList.add("region-boundary-control");
      control.dataset["regionBoundary"] = boundary;
      control.setAttribute("x", String(depthBody.xMpt));
      control.setAttribute("y", String(yMpt - 4_000));
      control.setAttribute("width", String(depthBody.widthMpt));
      control.setAttribute("height", "8000");
      control.setAttribute("role", "separator");
      control.setAttribute("aria-orientation", "horizontal");
      control.setAttribute("aria-label", `Resize ${boundary} Page Region boundary`);
      control.setAttribute("aria-valuenow", String(yMpt));
      control.setAttribute("tabindex", "0");
      group.append(line, control);
    }
    svg.append(group);
  }

  function previewColumnDivider(): void {
    const gesture = columnDividerGesture;
    const group = pageHost.querySelector<SVGGElement>("#column-divider-controls");
    if (gesture === undefined || group === null) return;
    group.querySelectorAll(".column-divider-preview").forEach((element) => element.remove());
    const namespace = "http://www.w3.org/2000/svg";
    const plannedPage = scene.pagePlan.pages.find(({ pageId }) => pageId === page.pageId);
    const depthBody = plannedPage?.regions.find(({ role }) => role === "depth-body");
    if (depthBody === undefined) return;
    const deltaMpt = gesture.previewDividerXMpt - gesture.originalDividerXMpt;
    const previewColumns = gesture.affectedColumns.map((column, index) =>
      index === 0
        ? Object.freeze({ xMpt: column.xMpt, widthMpt: column.widthMpt + deltaMpt })
        : Object.freeze({
            xMpt: column.xMpt + deltaMpt,
            widthMpt:
              gesture.resizeMode === "push-following-columns" &&
              index < gesture.affectedColumns.length - 1
                ? column.widthMpt
                : column.widthMpt - deltaMpt,
          }),
    );
    for (const { xMpt, widthMpt } of previewColumns) {
      const preview = document.createElementNS(namespace, "rect");
      preview.classList.add("column-divider-preview");
      preview.setAttribute("x", String(xMpt));
      preview.setAttribute("y", String(depthBody.yMpt));
      preview.setAttribute("width", String(widthMpt));
      preview.setAttribute("height", String(depthBody.heightMpt));
      group.prepend(preview);
    }
    const control = group.querySelector<SVGRectElement>(
      `[data-divider-after-column-id="${CSS.escape(gesture.leftColumnId)}"]`,
    );
    const line = control?.previousElementSibling;
    control?.setAttribute("x", String(gesture.previewDividerXMpt - 4_000));
    control?.setAttribute("aria-valuenow", String(gesture.previewDividerXMpt));
    line?.setAttribute("x1", String(gesture.previewDividerXMpt));
    line?.setAttribute("x2", String(gesture.previewDividerXMpt));
    const modeLabel = gesture.resizeMode === "adjacent-pair" ? "adjacent pair" : "push following";
    status.textContent = `Column preview (${modeLabel}): ${previewColumns.map(({ widthMpt }, index) => `${gesture.affectedColumns[index]!.id} ${widthMpt / 1_000} pt`).join(" · ")}. The ${((gesture.conservedEndMpt - gesture.leftXMpt) / 1_000).toFixed(0)} pt affected span is conserved; release commits one Undo item and Esc cancels.`;
  }

  function beginColumnDividerGesture(event: PointerEvent, leftColumnId: string): void {
    if (
      event.button !== 0 ||
      interactionMode !== "select" ||
      columnDividerGesture !== undefined ||
      lifecycleState?.readOnly === true ||
      studioProjection === null
    ) {
      return;
    }
    const plannedPage = scene.pagePlan.pages.find(({ pageId }) => pageId === page.pageId);
    const leftIndex = plannedPage?.columns.findIndex(({ id }) => id === leftColumnId) ?? -1;
    if (plannedPage === undefined || leftIndex < 0 || leftIndex >= plannedPage.columns.length - 1)
      return;
    const left = plannedPage.columns[leftIndex]!;
    const right = plannedPage.columns[leftIndex + 1]!;
    const resizeMode: ColumnResizeMode =
      columnResizeMode.value === "push-following-columns"
        ? "push-following-columns"
        : "adjacent-pair";
    const affectedColumns = plannedPage.columns.slice(
      leftIndex,
      resizeMode === "adjacent-pair" ? leftIndex + 2 : undefined,
    );
    const terminal = affectedColumns[affectedColumns.length - 1]!;
    const leftConstraint = studioProjection.columnResizeConstraints.find(
      ({ columnId }) => columnId === left.id,
    );
    const terminalConstraint = studioProjection.columnResizeConstraints.find(
      ({ columnId }) => columnId === terminal.id,
    );
    if (
      leftConstraint === undefined ||
      terminalConstraint === undefined ||
      leftConstraint.widthPinned ||
      terminalConstraint.widthPinned
    ) {
      status.textContent = "This column divider is pinned and cannot be dragged.";
      return;
    }
    const originalDividerXMpt = left.xMpt + left.widthMpt;
    columnDividerGesture = {
      pointerId: event.pointerId,
      leftColumnId: left.id,
      rightColumnId: right.id,
      leftXMpt: left.xMpt,
      conservedEndMpt: terminal.xMpt + terminal.widthMpt,
      resizeMode,
      affectedColumns: Object.freeze(
        affectedColumns.map(({ id, xMpt, widthMpt }) => Object.freeze({ id, xMpt, widthMpt })),
      ),
      originalDividerXMpt,
      minimumDividerXMpt: left.xMpt + leftConstraint.minimumWidthMpt,
      maximumDividerXMpt:
        originalDividerXMpt + terminal.widthMpt - terminalConstraint.minimumWidthMpt,
      previewDividerXMpt: originalDividerXMpt,
    };
    pageHost.setPointerCapture(event.pointerId);
    canvasStage.dataset["columnDividerAfter"] = left.id;
    event.preventDefault();
    event.stopPropagation();
  }

  function updateColumnDividerGesture(event: PointerEvent): void {
    const gesture = columnDividerGesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    const point = pointerPagePoint(event);
    if (point === null) return;
    gesture.previewDividerXMpt = Math.min(
      gesture.maximumDividerXMpt,
      Math.max(gesture.minimumDividerXMpt, point.xMpt),
    );
    previewColumnDivider();
    event.preventDefault();
  }

  function cancelColumnDividerGesture(): void {
    const gesture = columnDividerGesture;
    if (gesture === undefined) return;
    if (pageHost.hasPointerCapture(gesture.pointerId))
      pageHost.releasePointerCapture(gesture.pointerId);
    columnDividerGesture = undefined;
    Reflect.deleteProperty(canvasStage.dataset, "columnDividerAfter");
    installSvg();
    status.textContent = `Column divider gesture canceled for ${gesture.leftColumnId}; history and template geometry were unchanged.`;
  }

  async function commitColumnDivider(
    leftColumnId: string,
    dividerXMpt: number,
    resizeMode: ColumnResizeMode,
    successStatus?: (workingRevision: number) => string,
  ): Promise<boolean> {
    const apis = studioApis();
    if (apis === null || studioProjection === null) return false;
    const result = await apis.studio.setColumnDivider({
      expectedWorkingRevision: studioProjection.workingRevision,
      dividerAfterColumnId: leftColumnId,
      requestedDividerXMpt: dividerXMpt,
      resizeMode,
    });
    if (!result.accepted || result.workingRevision === undefined) {
      status.textContent = `Column divider command failed: ${result.code ?? "COLUMN_DIVIDER_UNAVAILABLE"}`;
      installSvg();
      return false;
    }
    return refreshStudioProjection(
      result.workingRevision,
      successStatus?.(result.workingRevision) ??
        `Column divider committed at revision ${result.workingRevision}; ${resizeMode === "adjacent-pair" ? "the adjacent pair" : "the pushed suffix"} was conserved through shared history.`,
    );
  }

  function selectedPlannedColumn():
    | Readonly<{
        readonly columns: ResolvedBoringLogPageScene["pagePlan"]["pages"][number]["columns"];
        readonly index: number;
      }>
    | undefined {
    if (selectedSemanticId === null) return undefined;
    const plannedPage = scene.pagePlan.pages.find(({ pageId }) => pageId === page.pageId);
    const index = plannedPage?.columns.findIndex(({ id }) => id === selectedSemanticId) ?? -1;
    return plannedPage === undefined || index < 0
      ? undefined
      : Object.freeze({ columns: plannedPage.columns, index });
  }

  function updateColumnResizePropertySummary(): void {
    const selected = selectedPlannedColumn();
    if (selected === undefined) return;
    const mode: ColumnResizeMode =
      columnResizeMode.value === "push-following-columns"
        ? "push-following-columns"
        : "adjacent-pair";
    const affected =
      selected.index === selected.columns.length - 1
        ? selected.columns.slice(-2)
        : selected.columns.slice(
            selected.index,
            mode === "adjacent-pair" ? selected.index + 2 : undefined,
          );
    columnResizeAffected.textContent = affected.map(({ id }) => humanize(id)).join(" → ");
  }

  async function applySelectedColumnWidthMpt(
    requestedWidthMpt: number,
    legacyDescriptionControl = false,
  ): Promise<boolean> {
    const selected = selectedPlannedColumn();
    if (
      selected === undefined ||
      !Number.isSafeInteger(requestedWidthMpt) ||
      requestedWidthMpt <= 0
    ) {
      status.textContent = "Column width must be a positive whole number of mpt.";
      return false;
    }
    const selectedColumn = selected.columns[selected.index]!;
    const selectedIsLast = selected.index === selected.columns.length - 1;
    const left = selectedIsLast ? selected.columns[selected.index - 1]! : selectedColumn;
    const requestedDividerXMpt = selectedIsLast
      ? selectedColumn.xMpt + selectedColumn.widthMpt - requestedWidthMpt
      : selectedColumn.xMpt + requestedWidthMpt;
    const mode: ColumnResizeMode =
      selectedIsLast || columnResizeMode.value !== "push-following-columns"
        ? "adjacent-pair"
        : "push-following-columns";
    applyColumnWidth.disabled = true;
    const committed = await commitColumnDivider(
      left.id,
      requestedDividerXMpt,
      mode,
      (workingRevision) =>
        legacyDescriptionControl
          ? `Description Column Width Mpt applied at revision ${workingRevision}.`
          : `${humanize(selectedColumn.id)} width applied at revision ${workingRevision} using ${mode}.`,
    );
    applyColumnWidth.disabled = false;
    return committed;
  }

  async function applySelectedRegionHeightMpt(requestedHeightMpt: number): Promise<boolean> {
    if (
      selectedSemanticId === null ||
      !Number.isSafeInteger(requestedHeightMpt) ||
      requestedHeightMpt <= 0
    )
      return false;
    const plannedPage = scene.pagePlan.pages.find(({ pageId }) => pageId === page.pageId);
    const header = plannedPage?.regions.find(({ role }) => role === "header");
    const depthBody = plannedPage?.regions.find(({ role }) => role === "depth-body");
    const footer = plannedPage?.regions.find(({ role }) => role === "footer");
    if (
      plannedPage === undefined ||
      header === undefined ||
      depthBody === undefined ||
      footer === undefined
    )
      return false;
    const headerGapMpt = depthBody.yMpt - (header.yMpt + header.heightMpt);
    const boundary: RegionBoundary =
      selectedSemanticId === header.id ? "header-depth" : "depth-footer";
    if (selectedSemanticId !== header.id && selectedSemanticId !== footer.id) return false;
    const requestedBoundaryYMpt =
      boundary === "header-depth"
        ? header.yMpt + requestedHeightMpt + headerGapMpt
        : footer.yMpt + footer.heightMpt - requestedHeightMpt;
    applyRegionHeight.disabled = true;
    const committed = await commitRegionBoundary(boundary, requestedBoundaryYMpt);
    applyRegionHeight.disabled = false;
    return committed;
  }

  async function finishColumnDividerGesture(event: PointerEvent): Promise<void> {
    const gesture = columnDividerGesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    if (pageHost.hasPointerCapture(event.pointerId))
      pageHost.releasePointerCapture(event.pointerId);
    columnDividerGesture = undefined;
    Reflect.deleteProperty(canvasStage.dataset, "columnDividerAfter");
    event.preventDefault();
    event.stopPropagation();
    if (gesture.previewDividerXMpt === gesture.originalDividerXMpt) {
      installSvg();
      status.textContent =
        "Column divider ended without a geometry change; no history item was created.";
      return;
    }
    await commitColumnDivider(gesture.leftColumnId, gesture.previewDividerXMpt, gesture.resizeMode);
  }

  function beginRegionBoundaryGesture(event: PointerEvent, boundary: RegionBoundary): void {
    if (
      event.button !== 0 ||
      interactionMode !== "select" ||
      regionBoundaryGesture !== undefined ||
      lifecycleState?.readOnly === true ||
      studioProjection === null
    )
      return;
    const control =
      event.target instanceof Element
        ? event.target.closest<SVGElement>(".region-boundary-control")
        : null;
    const originalBoundaryYMpt = Number(control?.getAttribute("aria-valuenow"));
    const outcome = regionBoundaryOutcome(boundary, originalBoundaryYMpt);
    regionBoundaryGesture = {
      pointerId: event.pointerId,
      boundary,
      originalBoundaryYMpt,
      minimumBoundaryYMpt: outcome.minimumYMpt,
      maximumBoundaryYMpt: outcome.maximumYMpt,
      previewBoundaryYMpt: originalBoundaryYMpt,
    };
    pageHost.setPointerCapture(event.pointerId);
    canvasStage.dataset["regionBoundary"] = boundary;
    event.preventDefault();
    event.stopPropagation();
  }

  function updateRegionBoundaryGesture(event: PointerEvent): void {
    const gesture = regionBoundaryGesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    const point = pointerPagePoint(event);
    if (point === null) return;
    gesture.previewBoundaryYMpt = Math.min(
      gesture.maximumBoundaryYMpt,
      Math.max(gesture.minimumBoundaryYMpt, point.yMpt),
    );
    const outcome = regionBoundaryOutcome(gesture.boundary, gesture.previewBoundaryYMpt);
    const control = pageHost.querySelector<SVGRectElement>(
      `[data-region-boundary="${gesture.boundary}"]`,
    );
    const line = control?.previousElementSibling;
    control?.setAttribute("y", String(outcome.effectiveYMpt - 4_000));
    control?.setAttribute("aria-valuenow", String(outcome.effectiveYMpt));
    line?.setAttribute("y1", String(outcome.effectiveYMpt));
    line?.setAttribute("y2", String(outcome.effectiveYMpt));
    canvasStage.dataset["regionPreviewPages"] = String(outcome.pageCount);
    status.textContent = outcome.repaginationRequired
      ? `Region preview: ${gesture.boundary} at ${outcome.effectiveYMpt / 1_000} pt creates ${outcome.pageCount} pages at the fixed depth scale; release commits one Undo item and Esc cancels.`
      : `Region preview: ${gesture.boundary} at ${outcome.effectiveYMpt / 1_000} pt fits 1 page at the fixed depth scale; release commits one Undo item and Esc cancels.`;
    event.preventDefault();
  }

  function cancelRegionBoundaryGesture(): void {
    const gesture = regionBoundaryGesture;
    if (gesture === undefined) return;
    if (pageHost.hasPointerCapture(gesture.pointerId))
      pageHost.releasePointerCapture(gesture.pointerId);
    regionBoundaryGesture = undefined;
    Reflect.deleteProperty(canvasStage.dataset, "regionBoundary");
    Reflect.deleteProperty(canvasStage.dataset, "regionPreviewPages");
    installSvg();
    status.textContent = `Page Region gesture canceled for ${gesture.boundary}; history and template geometry were unchanged.`;
  }

  async function commitRegionBoundary(
    boundary: RegionBoundary,
    requestedBoundaryYMpt: number,
  ): Promise<boolean> {
    const apis = studioApis();
    if (apis === null || studioProjection === null) return false;
    const result = await apis.studio.setRegionBoundary({
      expectedWorkingRevision: studioProjection.workingRevision,
      boundary,
      requestedBoundaryYMpt,
    });
    if (!result.accepted || result.workingRevision === undefined) {
      status.textContent = `Page Region command failed: ${result.code ?? "REGION_BOUNDARY_UNAVAILABLE"}`;
      installSvg();
      return false;
    }
    return refreshStudioProjection(
      result.workingRevision,
      `Page Region boundary committed at revision ${result.workingRevision}; ${result.pageCount ?? 1} page${result.pageCount === 1 ? "" : "s"} now preserve the fixed depth scale.`,
    );
  }

  async function finishRegionBoundaryGesture(event: PointerEvent): Promise<void> {
    const gesture = regionBoundaryGesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    if (pageHost.hasPointerCapture(event.pointerId))
      pageHost.releasePointerCapture(event.pointerId);
    regionBoundaryGesture = undefined;
    Reflect.deleteProperty(canvasStage.dataset, "regionBoundary");
    Reflect.deleteProperty(canvasStage.dataset, "regionPreviewPages");
    event.preventDefault();
    event.stopPropagation();
    if (gesture.previewBoundaryYMpt === gesture.originalBoundaryYMpt) {
      installSvg();
      status.textContent = "Page Region boundary ended unchanged; no history item was created.";
      return;
    }
    await commitRegionBoundary(gesture.boundary, gesture.previewBoundaryYMpt);
  }

  function pointerPagePoint(event: PointerEvent): Readonly<{ xMpt: number; yMpt: number }> | null {
    const svg = pageHost.querySelector<SVGSVGElement>("svg");
    if (svg === null) return null;
    const transform = svg.getScreenCTM();
    if (transform === null || !Number.isFinite(transform.a)) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const pagePoint = point.matrixTransform(transform.inverse());
    return Object.freeze({ xMpt: Math.round(pagePoint.x), yMpt: Math.round(pagePoint.y) });
  }

  function installOrderedTextSelection(
    occurrenceNodeIds: readonly string[],
    keyElementId: string,
    announcement: string,
  ): void {
    const key = page.nodes.find(
      (node): node is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
        node.kind === "text" && node.id === keyElementId,
    );
    if (key === undefined || occurrenceNodeIds.length === 0) {
      clearSelection();
      return;
    }
    select(key.semanticId, key.id);
    selectedTextNodeIds.clear();
    for (const occurrenceNodeId of occurrenceNodeIds) selectedTextNodeIds.add(occurrenceNodeId);
    selectedSemanticId = key.semanticId;
    selectedSceneNodeId = key.id;
    installSvg();
    renderTree();
    updateArrangementControls();
    selectionName.textContent = `${occurrenceNodeIds.length} text elements`;
    propertySemanticId.textContent =
      occurrenceNodeIds.length > 1 ? "Mixed selection" : key.semanticId;
    propertyBounds.textContent =
      occurrenceNodeIds.length > 1
        ? `${occurrenceNodeIds.length} independent text frames; Properties values follow the Key Element`
        : boundsText([key]);
    selectionStatus.textContent = `${occurrenceNodeIds.length} text occurrence${occurrenceNodeIds.length === 1 ? "" : "s"}; Key Element ${key.id}`;
    status.textContent = announcement;
  }

  function marqueeBounds(): TextFrame | null {
    const gesture = marqueeGesture;
    if (gesture === undefined) return null;
    const xMpt = Math.min(gesture.start.xMpt, gesture.current.xMpt);
    const yMpt = Math.min(gesture.start.yMpt, gesture.current.yMpt);
    return Object.freeze({
      xMpt,
      yMpt,
      widthMpt: Math.max(1, Math.abs(gesture.current.xMpt - gesture.start.xMpt)),
      heightMpt: Math.max(1, Math.abs(gesture.current.yMpt - gesture.start.yMpt)),
    });
  }

  function renderMarquee(): void {
    const svg = pageHost.querySelector<SVGSVGElement>("svg");
    const bounds = marqueeBounds();
    if (svg === null || bounds === null) return;
    let rectangle = svg.querySelector<SVGRectElement>("#canvas-marquee-selection");
    if (rectangle === null) {
      rectangle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rectangle.id = "canvas-marquee-selection";
      rectangle.classList.add("canvas-marquee-selection");
      rectangle.setAttribute("aria-hidden", "true");
      svg.append(rectangle);
    }
    rectangle.setAttribute("x", String(bounds.xMpt));
    rectangle.setAttribute("y", String(bounds.yMpt));
    rectangle.setAttribute("width", String(bounds.widthMpt));
    rectangle.setAttribute("height", String(bounds.heightMpt));
  }

  function beginMarquee(event: PointerEvent): void {
    if (event.button !== 0 || interactionMode !== "select" || marqueeGesture !== undefined) return;
    const target = event.target;
    if (
      !(target instanceof Element) ||
      target.closest("svg") === null ||
      target.closest("svg") !== pageHost.querySelector("svg")
    )
      return;
    if (
      target.closest(
        "[data-node-id], [data-direct-manipulation-handle], [data-divider-after-column-id], [data-region-boundary]",
      ) !== null
    )
      return;
    const point = pointerPagePoint(event);
    if (point === null) return;
    marqueeGesture = {
      pointerId: event.pointerId,
      start: point,
      current: point,
      additive: event.shiftKey || event.ctrlKey || event.metaKey,
    };
    pageHost.setPointerCapture(event.pointerId);
    canvasStage.classList.add("is-marquee-selecting");
    renderMarquee();
    event.preventDefault();
  }

  function updateMarquee(event: PointerEvent): void {
    if (marqueeGesture?.pointerId !== event.pointerId) return;
    const point = pointerPagePoint(event);
    if (point === null) return;
    marqueeGesture.current = point;
    renderMarquee();
    const bounds = marqueeBounds()!;
    status.textContent = `Marquee ${bounds.widthMpt} × ${bounds.heightMpt} mpt; release selects unlocked text occurrences.`;
  }

  function finishMarquee(event: PointerEvent): void {
    const gesture = marqueeGesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    const bounds = marqueeBounds();
    marqueeGesture = undefined;
    pageHost.querySelector("#canvas-marquee-selection")?.remove();
    canvasStage.classList.remove("is-marquee-selecting");
    if (pageHost.hasPointerCapture(event.pointerId))
      pageHost.releasePointerCapture(event.pointerId);
    suppressCanvasClick = true;
    event.preventDefault();
    if (bounds === null || bounds.widthMpt < 2_000 || bounds.heightMpt < 2_000) {
      if (!gesture.additive) clearSelection();
      return;
    }
    const hitIds = page.nodes
      .filter(
        (node): node is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
          node.kind === "text" &&
          node.presentation?.locked !== true &&
          node.presentation?.visible !== false &&
          node.frame.xMpt < bounds.xMpt + bounds.widthMpt &&
          node.frame.xMpt + node.frame.widthMpt > bounds.xMpt &&
          node.frame.yMpt < bounds.yMpt + bounds.heightMpt &&
          node.frame.yMpt + node.frame.heightMpt > bounds.yMpt,
      )
      .map(({ id }) => id);
    const nextIds = gesture.additive ? [...selectedTextNodeIds] : [];
    for (const hitId of hitIds) {
      const existingIndex = nextIds.indexOf(hitId);
      if (gesture.additive && existingIndex >= 0) nextIds.splice(existingIndex, 1);
      else nextIds.push(hitId);
    }
    const keyElementId = nextIds.at(-1);
    if (keyElementId === undefined) {
      clearSelection();
      return;
    }
    installOrderedTextSelection(
      nextIds,
      keyElementId,
      `${nextIds.length} unlocked text occurrence${nextIds.length === 1 ? "" : "s"} selected by marquee; the orange occurrence is the Key Element.`,
    );
  }

  function cancelMarquee(): void {
    const gesture = marqueeGesture;
    if (gesture === undefined) return;
    if (pageHost.hasPointerCapture(gesture.pointerId))
      pageHost.releasePointerCapture(gesture.pointerId);
    marqueeGesture = undefined;
    pageHost.querySelector("#canvas-marquee-selection")?.remove();
    canvasStage.classList.remove("is-marquee-selecting");
    status.textContent = "Marquee selection canceled.";
  }

  function renderPageRulers(): void {
    const render = (host: SVGSVGElement, extentMpt: number): void => {
      host.replaceChildren();
      const horizontal = host === horizontalRuler;
      host.setAttribute(
        "viewBox",
        horizontal ? `0 0 ${extentMpt} 21000` : `0 0 21000 ${extentMpt}`,
      );
      for (let positionMpt = 0; positionMpt <= extentMpt; positionMpt += 72_000) {
        const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
        tick.setAttribute("class", "ruler-tick");
        tick.setAttribute("x1", String(horizontal ? positionMpt : 11_000));
        tick.setAttribute("x2", String(horizontal ? positionMpt : 21_000));
        tick.setAttribute("y1", String(horizontal ? 11_000 : positionMpt));
        tick.setAttribute("y2", String(horizontal ? 21_000 : positionMpt));
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("class", "ruler-label");
        label.setAttribute("x", String(horizontal ? positionMpt + 2_000 : 2_000));
        label.setAttribute("y", String(horizontal ? 9_000 : positionMpt + 9_000));
        label.textContent = String(positionMpt / 72_000);
        host.append(tick, label);
      }
    };
    render(horizontalRuler, page.widthMpt);
    render(verticalRuler, page.heightMpt);
  }

  function renderPageGuides(): void {
    const projectedGuides = studioProjection?.guides ?? [];
    const gesture = pageGuideGesture;
    const guides = projectedGuides.map((guide) =>
      guide.id === gesture?.guideId
        ? Object.freeze({ ...guide, positionMpt: gesture.previewPositionMpt })
        : guide,
    );
    if (gesture?.guideId === null) {
      guides.push(
        Object.freeze({
          id: "preview-guide",
          orientation: gesture.orientation,
          positionMpt: gesture.previewPositionMpt,
          locked: false,
        }),
      );
    }
    pageGuidesHost.replaceChildren();
    pageGuidesHost.setAttribute("viewBox", `0 0 ${page.widthMpt} ${page.heightMpt}`);
    for (const guide of guides) {
      const control = document.createElementNS("http://www.w3.org/2000/svg", "g");
      control.setAttribute(
        "class",
        `page-guide ${guide.orientation}${guide.id === "preview-guide" ? " is-preview" : ""}`,
      );
      control.dataset["guideId"] = guide.id;
      control.dataset["locked"] = String(guide.locked);
      control.setAttribute("role", "button");
      control.setAttribute("tabindex", "0");
      control.setAttribute(
        "aria-label",
        `${humanize(guide.orientation)} guide at ${(guide.positionMpt / 1_000).toFixed(1)} points${guide.locked ? ", locked" : ""}`,
      );
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${guide.locked ? "Locked · right-click to unlock" : "Drag to move · right-click to lock"} · double-click to delete`;
      const visible = document.createElementNS("http://www.w3.org/2000/svg", "line");
      visible.setAttribute("class", "page-guide-line");
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "line");
      hit.setAttribute("class", "page-guide-hit");
      for (const line of [visible, hit]) {
        line.setAttribute("x1", String(guide.orientation === "vertical" ? guide.positionMpt : 0));
        line.setAttribute(
          "x2",
          String(guide.orientation === "vertical" ? guide.positionMpt : page.widthMpt),
        );
        line.setAttribute("y1", String(guide.orientation === "horizontal" ? guide.positionMpt : 0));
        line.setAttribute(
          "y2",
          String(guide.orientation === "horizontal" ? guide.positionMpt : page.heightMpt),
        );
      }
      control.append(title, visible, hit);
      pageGuidesHost.append(control);
    }
    pageGuidesHost.dataset["guideCount"] = String(projectedGuides.length);
  }

  async function mutatePageGuide(mutation: PageGuideMutation): Promise<boolean> {
    const apis = studioApis();
    if (apis === null || studioProjection === null || lifecycleState?.readOnly === true) {
      status.textContent = "Page guide editing is unavailable for this Log Project.";
      return false;
    }
    const result = await apis.studio.setPageGuides({
      expectedWorkingRevision: studioProjection.workingRevision,
      mutation,
    });
    if (!result.accepted || result.workingRevision === undefined) {
      status.textContent = `Page guide command failed: ${result.code ?? "PAGE_GUIDES_UNAVAILABLE"}`;
      renderPageGuides();
      return false;
    }
    return refreshStudioProjection(
      result.workingRevision,
      `${mutation.kind === "set-locked" ? "Guide lock" : humanize(mutation.kind)} committed for this boring at revision ${result.workingRevision}.`,
    );
  }

  function guidePosition(
    event: PointerEvent,
    orientation: "horizontal" | "vertical",
  ): number | null {
    const point = pointerPagePoint(event);
    if (point === null) return null;
    const maximum = orientation === "vertical" ? page.widthMpt : page.heightMpt;
    return Math.max(0, Math.min(maximum, orientation === "vertical" ? point.xMpt : point.yMpt));
  }

  function beginPageGuideGesture(
    event: PointerEvent,
    orientation: "horizontal" | "vertical",
    guide: PageGuide | null,
  ): void {
    if (
      event.button !== 0 ||
      pageGuideGesture !== undefined ||
      lifecycleState?.readOnly === true ||
      guide?.locked === true
    ) {
      if (guide?.locked === true) {
        status.textContent = "This guide is locked. Right-click it to unlock before dragging.";
      }
      return;
    }
    const positionMpt = guidePosition(event, orientation);
    if (positionMpt === null) return;
    pageGuideGesture = {
      pointerId: event.pointerId,
      guideId: guide?.id ?? null,
      orientation,
      originalPositionMpt: guide?.positionMpt ?? positionMpt,
      previewPositionMpt: positionMpt,
      locked: guide?.locked ?? false,
    };
    pageShadow.setPointerCapture(event.pointerId);
    renderPageGuides();
    event.preventDefault();
    event.stopPropagation();
    status.textContent = `${humanize(orientation)} guide gesture active. Release commits one Undo/Redo step; Alt bypasses snapping; Esc cancels.`;
  }

  function updatePageGuideGesture(event: PointerEvent): void {
    const gesture = pageGuideGesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    const unsnapped = guidePosition(event, gesture.orientation);
    if (unsnapped === null) return;
    let positionMpt = unsnapped;
    if (!event.altKey && (smartSnapEnabled || gridSnapEnabled)) {
      const svg = pageHost.querySelector<SVGSVGElement>("svg");
      const transform = svg?.getScreenCTM();
      const thresholdMpt =
        transform === null || transform === undefined
          ? 6_000
          : Math.max(1, Math.round(6 / Math.max(Math.abs(transform.a), Math.abs(transform.d))));
      const targets = currentSnapTargets(gesture.guideId);
      const axisTargets = gesture.orientation === "vertical" ? targets.x : targets.y;
      const nearest = axisTargets
        .map(({ positionMpt: targetMpt }) => ({
          targetMpt,
          distanceMpt: Math.abs(targetMpt - unsnapped),
        }))
        .filter(({ distanceMpt }) => distanceMpt <= thresholdMpt)
        .sort(
          (left, right) => left.distanceMpt - right.distanceMpt || left.targetMpt - right.targetMpt,
        )[0];
      if (nearest !== undefined) positionMpt = nearest.targetMpt;
    }
    gesture.previewPositionMpt = positionMpt;
    renderPageGuides();
    status.textContent = `${humanize(gesture.orientation)} guide preview ${(positionMpt / 1_000).toFixed(1)} pt${event.altKey ? " · snapping bypassed" : ""}. Release to commit.`;
    event.preventDefault();
  }

  function cancelPageGuideGesture(): void {
    const gesture = pageGuideGesture;
    if (gesture === undefined) return;
    if (pageShadow.hasPointerCapture(gesture.pointerId)) {
      pageShadow.releasePointerCapture(gesture.pointerId);
    }
    pageGuideGesture = undefined;
    renderPageGuides();
    status.textContent = "Guide gesture canceled; document history was unchanged.";
  }

  async function finishPageGuideGesture(event: PointerEvent): Promise<void> {
    const gesture = pageGuideGesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    if (pageShadow.hasPointerCapture(event.pointerId))
      pageShadow.releasePointerCapture(event.pointerId);
    pageGuideGesture = undefined;
    event.preventDefault();
    if (gesture.guideId !== null && gesture.previewPositionMpt === gesture.originalPositionMpt) {
      renderPageGuides();
      status.textContent =
        "Guide gesture ended without a position change; no history item was created.";
      return;
    }
    await mutatePageGuide(
      gesture.guideId === null
        ? {
            kind: "add",
            orientation: gesture.orientation,
            positionMpt: gesture.previewPositionMpt,
          }
        : { kind: "move", guideId: gesture.guideId, positionMpt: gesture.previewPositionMpt },
    );
  }

  function syncTextFrameInputs(frame: TextFrame): void {
    const anchorPoint = frameAnchorPoint(frame, currentTextFrameAnchor);
    textFrameX.value = String(anchorPoint.xMpt / 1_000);
    textFrameY.value = String(anchorPoint.yMpt / 1_000);
    textFrameWidth.value = String(frame.widthMpt / 1_000);
    textFrameHeight.value = String(frame.heightMpt / 1_000);
    propertyBounds.textContent = `${(frame.xMpt / 1_000).toFixed(1)}, ${(frame.yMpt / 1_000).toFixed(1)} Â· ${(frame.widthMpt / 1_000).toFixed(1)} Ã— ${(frame.heightMpt / 1_000).toFixed(1)} pt`;
  }

  function textBaselineYMpt(
    node: Extract<BoringLogSceneNode, { kind: "text" }>,
  ): readonly number[] {
    const measurement = scene.textResults.find(
      ({ measurementId }) => measurementId === node.measurementId,
    );
    if (measurement === undefined) return Object.freeze([]);
    const padding = node.presentation?.paddingMpt ?? {
      topMpt: 0,
      rightMpt: 0,
      bottomMpt: 0,
      leftMpt: 0,
    };
    const innerHeight = node.frame.heightMpt - padding.topMpt - padding.bottomMpt;
    const verticalOffset =
      node.presentation?.verticalAlignment === "middle"
        ? Math.round((innerHeight - measurement.logicalBounds.heightMpt) / 2)
        : node.presentation?.verticalAlignment === "bottom"
          ? innerHeight - measurement.logicalBounds.heightMpt
          : 0;
    return Object.freeze(
      measurement.lines.map(
        ({ baselineMpt }) => node.frame.yMpt + padding.topMpt + verticalOffset + baselineMpt,
      ),
    );
  }

  function currentSnapTargets(
    excludedGuideId: string | null = null,
  ): Readonly<{ x: readonly BoringLogSnapTarget[]; y: readonly BoringLogSnapTarget[] }> {
    const x = new Map<string, BoringLogSnapTarget>();
    const y = new Map<string, BoringLogSnapTarget>();
    const add = (
      target: Map<string, BoringLogSnapTarget>,
      positionMpt: number,
      kind: BoringLogSnapTargetKind,
    ): void => {
      if (!Number.isSafeInteger(positionMpt)) return;
      target.set(`${positionMpt}:${kind}`, Object.freeze({ positionMpt, kind }));
    };
    for (const positionMpt of [0, Math.round(page.widthMpt / 2), page.widthMpt]) {
      add(x, positionMpt, "page");
    }
    for (const positionMpt of [0, Math.round(page.heightMpt / 2), page.heightMpt]) {
      add(y, positionMpt, "page");
    }
    if (smartSnapEnabled) {
      for (const guide of studioProjection?.guides ?? []) {
        if (guide.id === excludedGuideId) continue;
        add(guide.orientation === "vertical" ? x : y, guide.positionMpt, "guide");
      }
      const plannedPage = scene.pagePlan.pages.find(({ pageId }) => pageId === page.pageId);
      for (const region of plannedPage?.regions ?? []) {
        for (const positionMpt of [
          region.xMpt,
          region.xMpt + Math.round(region.widthMpt / 2),
          region.xMpt + region.widthMpt,
        ]) {
          add(x, positionMpt, "region");
        }
        for (const positionMpt of [
          region.yMpt,
          region.yMpt + Math.round(region.heightMpt / 2),
          region.yMpt + region.heightMpt,
        ]) {
          add(y, positionMpt, "region");
        }
      }
      const depthTransform = plannedPage?.depthTransform;
      if (depthTransform !== undefined) {
        for (
          let depthFt = Math.ceil(depthTransform.depthStartFt);
          depthFt <= Math.floor(depthTransform.depthEndFt);
          depthFt += 1
        ) {
          add(
            y,
            depthTransform.yStartMpt +
              Math.round((depthFt - depthTransform.depthStartFt) * depthTransform.mptPerFoot),
            "depth",
          );
        }
      }
      for (const textNode of page.nodes.filter(
        (node): node is Extract<BoringLogSceneNode, { kind: "text" }> =>
          node.kind === "text" && node.id !== selectedSceneNodeId,
      )) {
        for (const positionMpt of textBaselineYMpt(textNode)) add(y, positionMpt, "baseline");
      }
      for (const candidate of pageHost.querySelectorAll<SVGGraphicsElement>(".scene-node")) {
        if (candidate.dataset["nodeId"] === selectedSceneNodeId) continue;
        try {
          const bounds = candidate.getBBox();
          for (const value of [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width]) {
            if (Number.isFinite(value)) add(x, Math.round(value), "peer");
          }
          for (const value of [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height]) {
            if (Number.isFinite(value)) add(y, Math.round(value), "peer");
          }
        } catch {
          // A non-rendered semantic node is not a snap target.
        }
      }
    }
    if (gridSnapEnabled) {
      for (let value = 0; value <= page.widthMpt; value += 1_000) add(x, value, "grid");
      for (let value = 0; value <= page.heightMpt; value += 1_000) add(y, value, "grid");
    }
    const priorities: Readonly<Record<BoringLogSnapTargetKind, number>> = Object.freeze({
      guide: 0,
      baseline: 1,
      depth: 2,
      region: 3,
      page: 4,
      peer: 5,
      grid: 6,
    });
    const ordered = (values: Map<string, BoringLogSnapTarget>) =>
      Object.freeze(
        [...values.values()].sort(
          (left, right) =>
            left.positionMpt - right.positionMpt || priorities[left.kind] - priorities[right.kind],
        ),
      );
    return Object.freeze({
      x: ordered(x),
      y: ordered(y),
    });
  }

  function previewDirectManipulationFrame(
    frame: TextFrame,
    snap: Readonly<{
      snapXMpt: number | null;
      snapYMpt: number | null;
      snapXKind: BoringLogSnapTargetKind | null;
      snapYKind: BoringLogSnapTargetKind | null;
    }> = {
      snapXMpt: null,
      snapYMpt: null,
      snapXKind: null,
      snapYKind: null,
    },
  ): void {
    const gesture = directManipulationGesture;
    if (gesture === undefined) return;
    gesture.previewFrame = frame;
    syncTextFrameInputs(frame);
    const outline = pageHost.querySelector<SVGRectElement>("#direct-manipulation-frame");
    const moveTarget = pageHost.querySelector<SVGRectElement>("#direct-manipulation-move");
    for (const element of [outline, moveTarget]) {
      element?.setAttribute("x", String(frame.xMpt));
      element?.setAttribute("y", String(frame.yMpt));
      element?.setAttribute("width", String(frame.widthMpt));
      element?.setAttribute("height", String(frame.heightMpt));
    }
    const handles = directHandleCenters(frame);
    for (const control of pageHost.querySelectorAll<SVGRectElement>(
      "[data-direct-manipulation-handle]:not([data-direct-manipulation-handle='move'])",
    )) {
      const handle = control.dataset["directManipulationHandle"] as Exclude<
        BoringLogDirectManipulationHandle,
        "move"
      >;
      const center = handles[handle];
      const widthMpt = Number(control.getAttribute("width"));
      control.setAttribute("x", String(center[0] - Math.round(widthMpt / 2)));
      control.setAttribute("y", String(center[1] - Math.round(widthMpt / 2)));
    }
    const moveControl = pageHost.querySelector<SVGRectElement>("#direct-manipulation-move-control");
    const moveCenterYMpt =
      frame.yMpt >= 14_000 ? frame.yMpt - 12_000 : frame.yMpt + frame.heightMpt + 12_000;
    moveControl?.setAttribute("x", String(frame.xMpt + Math.round(frame.widthMpt / 2) - 4_000));
    moveControl?.setAttribute("y", String(moveCenterYMpt - 4_000));
    const text = pageHost.querySelector<SVGTextElement>(`#${CSS.escape(gesture.nodeId)}`);
    const presentationFrame = pageHost.querySelector<SVGRectElement>(
      `#${CSS.escape(`${gesture.nodeId}:presentation-frame`)}`,
    );
    const deltaX = frame.xMpt - gesture.originalFrame.xMpt;
    const deltaY = frame.yMpt - gesture.originalFrame.yMpt;
    if (text !== null && gesture.handle === "move") {
      text.setAttribute(
        "transform",
        `translate(${deltaX} ${deltaY})${gesture.originalTransform === null ? "" : ` ${gesture.originalTransform}`}`,
      );
    }
    if (presentationFrame !== null) {
      presentationFrame.setAttribute("x", String(frame.xMpt));
      presentationFrame.setAttribute("y", String(frame.yMpt));
      presentationFrame.setAttribute("width", String(frame.widthMpt));
      presentationFrame.setAttribute("height", String(frame.heightMpt));
      if (gesture.handle === "move") {
        presentationFrame.setAttribute("transform", gesture.originalFrameTransform ?? "");
      }
    }
    const overlay = pageHost.querySelector<SVGGElement>("#direct-manipulation-overlay");
    overlay?.querySelectorAll(".direct-snap-feedback").forEach((candidate) => candidate.remove());
    const namespace = "http://www.w3.org/2000/svg";
    if (overlay !== null && snap.snapXMpt !== null) {
      const line = document.createElementNS(namespace, "line");
      line.classList.add("direct-snap-feedback");
      line.setAttribute("x1", String(snap.snapXMpt));
      line.setAttribute("x2", String(snap.snapXMpt));
      line.setAttribute("y1", "0");
      line.setAttribute("y2", String(page.heightMpt));
      line.dataset["snapKind"] = snap.snapXKind ?? "unknown";
      overlay.prepend(line);
    }
    if (overlay !== null && snap.snapYMpt !== null) {
      const line = document.createElementNS(namespace, "line");
      line.classList.add("direct-snap-feedback");
      line.setAttribute("x1", "0");
      line.setAttribute("x2", String(page.widthMpt));
      line.setAttribute("y1", String(snap.snapYMpt));
      line.setAttribute("y2", String(snap.snapYMpt));
      line.dataset["snapKind"] = snap.snapYKind ?? "unknown";
      overlay.prepend(line);
    }
    const snapStatus =
      snap.snapXMpt === null && snap.snapYMpt === null
        ? ""
        : ` Snapped${snap.snapXMpt === null ? "" : ` X ${snap.snapXKind ?? "target"} ${snap.snapXMpt} mpt`}${snap.snapYMpt === null ? "" : ` Y ${snap.snapYKind ?? "target"} ${snap.snapYMpt} mpt`}; hold Alt to bypass.`;
    status.textContent = `Canvas preview ${Math.round(frame.xMpt)} / ${Math.round(frame.yMpt)} / ${Math.round(frame.widthMpt)} / ${Math.round(frame.heightMpt)} mpt.${snapStatus} Release to commit and reflow; Esc cancels.`;
  }

  function installLiveReflowPreview(
    previewScene: ResolvedBoringLogPageScene,
    occurrenceNodeId: string,
  ): void {
    const projection = projectBoringLogSceneToSvg(previewScene, selectedSemanticId);
    if (!projection.accepted) return;
    const parsed = new DOMParser().parseFromString(projection.markup, "image/svg+xml");
    if (parsed.querySelector("parsererror") !== null) return;
    const escapedNodeId = CSS.escape(occurrenceNodeId);
    const nextText = parsed.querySelector<SVGTextElement>(`#${escapedNodeId}`);
    const currentText = pageHost.querySelector<SVGTextElement>(`#${escapedNodeId}`);
    if (nextText === null || currentText === null) return;
    const importedText = document.importNode(nextText, true);
    if (selectedTextNodeIds.has(occurrenceNodeId) || selectedSceneNodeId === occurrenceNodeId) {
      importedText.classList.add("is-selected");
    }
    const frameId = `${occurrenceNodeId}:presentation-frame`;
    const nextFrame = parsed.querySelector<SVGRectElement>(`#${CSS.escape(frameId)}`);
    const currentFrame = pageHost.querySelector<SVGRectElement>(`#${CSS.escape(frameId)}`);
    if (nextFrame === null) currentFrame?.remove();
    else if (currentFrame === null) {
      currentText.before(document.importNode(nextFrame, true));
    } else currentFrame.replaceWith(document.importNode(nextFrame, true));
    currentText.replaceWith(importedText);
    const lineCount = importedText.querySelectorAll("tspan").length;
    canvasStage.dataset["liveReflowPreview"] = "true";
    canvasStage.dataset["liveReflowLineCount"] = String(lineCount);
  }

  async function runLiveReflowPreview(): Promise<void> {
    if (liveReflowPreviewInFlight !== null) return liveReflowPreviewInFlight;
    const gesture = directManipulationGesture;
    const frame = liveReflowPreviewFrame;
    liveReflowPreviewFrame = undefined;
    if (gesture === undefined || frame === undefined || studioProjection === null) return;
    const promise = (async () => {
      const apis = studioApis();
      if (apis === null) return;
      const response = await apis.studio.getProjection({
        minimumWorkingRevision: studioProjection.workingRevision,
        preview: {
          expectedWorkingRevision: studioProjection.workingRevision,
          occurrenceNodeId: gesture.nodeId,
          semanticId: gesture.semanticId,
          frame,
        },
      });
      if (
        response.accepted &&
        directManipulationGesture === gesture &&
        gesture.previewFrame.xMpt === frame.xMpt &&
        gesture.previewFrame.yMpt === frame.yMpt &&
        gesture.previewFrame.widthMpt === frame.widthMpt &&
        gesture.previewFrame.heightMpt === frame.heightMpt
      ) {
        installLiveReflowPreview(response.projection.scene, gesture.nodeId);
      }
    })().finally(() => {
      liveReflowPreviewInFlight = null;
      if (liveReflowPreviewFrame !== undefined && directManipulationGesture !== undefined) {
        liveReflowPreviewTimer = window.setTimeout(() => {
          liveReflowPreviewTimer = undefined;
          void runLiveReflowPreview();
        }, 80);
      }
    });
    liveReflowPreviewInFlight = promise;
    return promise;
  }

  function scheduleLiveReflowPreview(frame: TextFrame): void {
    liveReflowPreviewFrame = frame;
    if (liveReflowPreviewTimer !== undefined || liveReflowPreviewInFlight !== null) return;
    liveReflowPreviewTimer = window.setTimeout(() => {
      liveReflowPreviewTimer = undefined;
      void runLiveReflowPreview();
    }, 80);
  }

  async function flushLiveReflowPreview(): Promise<void> {
    if (liveReflowPreviewTimer !== undefined) {
      window.clearTimeout(liveReflowPreviewTimer);
      liveReflowPreviewTimer = undefined;
      await runLiveReflowPreview();
    }
    if (liveReflowPreviewInFlight !== null) await liveReflowPreviewInFlight;
  }

  function clearLiveReflowPreview(): void {
    if (liveReflowPreviewTimer !== undefined) window.clearTimeout(liveReflowPreviewTimer);
    liveReflowPreviewTimer = undefined;
    liveReflowPreviewFrame = undefined;
    Reflect.deleteProperty(canvasStage.dataset, "liveReflowPreview");
    Reflect.deleteProperty(canvasStage.dataset, "liveReflowLineCount");
  }

  function renderTree(): void {
    tree.replaceChildren();
    const items = buildBoringLogStudioTree(scene);
    const visibleItems = visibleBoringLogStudioTreeItems(items, collapsedTreeItems, filter.value);
    const sourceSemanticIds = new Set(
      page.nodes.filter((node) => node.provenance !== null).map(({ semanticId }) => semanticId),
    );
    const selectedSemanticIds = new Set(
      page.nodes
        .filter(({ id }) => selectedTextNodeIds.has(id))
        .map(({ semanticId }) => semanticId),
    );
    for (const groupNode of page.nodes.filter(
      (node): node is Extract<BoringLogSceneNode, { readonly kind: "group" }> =>
        node.kind === "group" && node.role === "user-text-group",
    )) {
      if (
        groupNode.childIds.length > 0 &&
        groupNode.childIds.every((childId) => selectedTextNodeIds.has(childId))
      ) {
        selectedSemanticIds.add(groupNode.semanticId);
      }
    }
    if (selectedSemanticId !== null) selectedSemanticIds.add(selectedSemanticId);
    if (contentsMode === "source") {
      const byId = new Map(items.map((item) => [item.semanticId, item]));
      for (const semanticId of [...sourceSemanticIds]) {
        let parentId = byId.get(semanticId)?.parentSemanticId ?? null;
        while (parentId !== null) {
          sourceSemanticIds.add(parentId);
          parentId = byId.get(parentId)?.parentSemanticId ?? null;
        }
      }
    }
    for (const item of visibleItems) {
      if (contentsMode === "source" && !sourceSemanticIds.has(item.semanticId)) continue;
      const row = document.createElement("div");
      row.className = `tree-row tree-level-${item.level}${selectedSemanticIds.has(item.semanticId) ? " is-selected" : ""}`;
      row.setAttribute("role", "treeitem");
      row.setAttribute("aria-level", String(item.level));
      row.setAttribute("aria-selected", String(selectedSemanticIds.has(item.semanticId)));
      if (item.hasChildren) {
        row.setAttribute("aria-expanded", String(!collapsedTreeItems.has(item.semanticId)));
      }
      row.dataset["semanticId"] = item.semanticId;
      const chevron = document.createElement("span");
      chevron.className = "chevron";
      const disclosure = document.createElement("button");
      disclosure.type = "button";
      disclosure.className = "tree-disclosure";
      disclosure.dataset["commandOwned"] = "tree-disclosure";
      disclosure.disabled = !item.hasChildren;
      disclosure.textContent = item.hasChildren
        ? collapsedTreeItems.has(item.semanticId)
          ? "▸"
          : "▾"
        : "";
      disclosure.setAttribute(
        "aria-label",
        `${collapsedTreeItems.has(item.semanticId) ? "Expand" : "Collapse"} ${item.label}`,
      );
      disclosure.addEventListener("click", () => {
        if (collapsedTreeItems.has(item.semanticId)) collapsedTreeItems.delete(item.semanticId);
        else collapsedTreeItems.add(item.semanticId);
        updateContentsOptions();
        renderTree();
      });
      chevron.append(disclosure);
      const icon = document.createElement("span");
      icon.className = "layer-icon";
      icon.textContent = item.icon;
      const label = document.createElement("span");
      label.className = "layer-label";
      label.textContent = item.label;
      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = "tree-select";
      selectButton.dataset["commandOwned"] = "tree-select";
      selectButton.append(icon, label);
      const exactTextNodes = page.nodes.filter(
        (node): node is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
          node.semanticId === item.semanticId && node.kind === "text",
      );
      const exactGroupNode = page.nodes.find(
        (node): node is Extract<BoringLogSceneNode, { readonly kind: "group" }> =>
          node.kind === "group" &&
          node.role === "user-text-group" &&
          node.semanticId === item.semanticId,
      );
      const groupedTextNodes = (exactGroupNode?.childIds ?? [])
        .map((childId) => page.nodes.find(({ id }) => id === childId))
        .filter(
          (node): node is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
            node?.kind === "text",
        );
      selectButton.addEventListener("click", (event) => {
        if (exactGroupNode !== undefined && groupedTextNodes.length > 0) {
          const additive = event.shiftKey || event.ctrlKey || event.metaKey;
          const nextIds = new Set(additive ? selectedTextNodeIds : []);
          const remove = additive && groupedTextNodes.every(({ id }) => nextIds.has(id));
          for (const { id } of groupedTextNodes) {
            if (remove) nextIds.delete(id);
            else nextIds.add(id);
          }
          const keyNodeId = [...nextIds].at(-1);
          const keyNode = page.nodes.find(
            (node): node is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
              node.kind === "text" && node.id === keyNodeId,
          );
          if (keyNode === undefined) {
            clearSelection();
            return;
          }
          select(keyNode.semanticId, keyNode.id);
          selectedTextNodeIds.clear();
          for (const nodeId of nextIds) selectedTextNodeIds.add(nodeId);
          selectedSemanticId = keyNode.semanticId;
          selectedSceneNodeId = keyNode.id;
          installSvg();
          renderTree();
          updateArrangementControls();
          selectionName.textContent = `${nextIds.size} text elements`;
          propertySemanticId.textContent =
            nextIds.size > 1 ? "Mixed selection" : keyNode.semanticId;
          selectionStatus.textContent = `${nextIds.size} grouped text occurrence${nextIds.size === 1 ? "" : "s"}; Key Element ${keyNode.id}`;
          status.textContent = `${humanize(exactGroupNode.semanticId)} selected from Contents.`;
          return;
        }
        select(
          item.semanticId,
          exactTextNodes.length === 1 ? exactTextNodes[0]!.id : null,
          event.shiftKey || event.ctrlKey || event.metaKey,
        );
      });
      row.append(chevron, selectButton);
      if (exactTextNodes.length === 1) {
        const exact = exactTextNodes[0]!;
        const visibility = document.createElement("button");
        visibility.type = "button";
        visibility.className = "tree-state-command";
        visibility.dataset["commandOwned"] = "tree-visibility";
        visibility.textContent = exact.presentation?.visible === false ? "○" : "●";
        visibility.title = exact.presentation?.visible === false ? "Show element" : "Hide element";
        visibility.setAttribute("aria-label", `${visibility.title}: ${item.label}`);
        visibility.addEventListener("click", (event) => {
          event.stopPropagation();
          void mutateSelectedText(
            { kind: "set-visible", visible: exact.presentation?.visible === false },
            "contents",
            [exact.id],
          );
        });
        const lock = document.createElement("button");
        lock.type = "button";
        lock.className = "tree-state-command";
        lock.dataset["commandOwned"] = "tree-lock";
        lock.textContent = exact.presentation?.locked === true ? "🔒" : "🔓";
        lock.title = exact.presentation?.locked === true ? "Unlock element" : "Lock element";
        lock.setAttribute("aria-label", `${lock.title}: ${item.label}`);
        lock.addEventListener("click", (event) => {
          event.stopPropagation();
          void mutateSelectedText(
            { kind: "set-locked", locked: exact.presentation?.locked !== true },
            "contents",
            [exact.id],
          );
        });
        row.classList.toggle("is-hidden-element", exact.presentation?.visible === false);
        row.classList.toggle("is-locked-element", exact.presentation?.locked === true);
        row.append(visibility, lock);
      }
      tree.append(row);
    }
    tree.dataset["displayMode"] = contentsMode;
  }

  function updateContentsOptions(): void {
    const hasCollapsedGroups = collapsedTreeItems.size > 0;
    contentsOptions.textContent = hasCollapsedGroups ? "+" : "−";
    contentsOptions.title = hasCollapsedGroups ? "Expand all" : "Collapse all";
    contentsOptions.setAttribute(
      "aria-label",
      `${hasCollapsedGroups ? "Expand" : "Collapse"} all Contents groups`,
    );
  }

  function toggleAllContentsGroups(): void {
    if (collapsedTreeItems.size > 0) {
      collapsedTreeItems.clear();
      status.textContent = "All Contents groups expanded.";
    } else {
      for (const item of buildBoringLogStudioTree(scene)) {
        if (item.hasChildren) collapsedTreeItems.add(item.semanticId);
      }
      status.textContent = "All Contents groups collapsed.";
    }
    updateContentsOptions();
    renderTree();
  }

  function setContentsMode(mode: "drawing" | "source"): void {
    contentsMode = mode;
    const source = mode === "source";
    contentsModeDrawing.classList.toggle("is-active", !source);
    contentsModeSource.classList.toggle("is-active", source);
    contentsModeDrawing.setAttribute("aria-pressed", String(!source));
    contentsModeSource.setAttribute("aria-pressed", String(source));
    renderTree();
    status.textContent = source
      ? "Contents shows source-backed and overridden elements with their hierarchy."
      : "Contents shows the complete page drawing order.";
  }

  function toggleAllPropertyGroups(): void {
    const groups = [...document.querySelectorAll<HTMLDetailsElement>(".property-group")];
    const close = groups.some(({ open }) => open);
    for (const group of groups) group.open = !close;
    propertiesOptions.textContent = close ? "+" : "−";
    propertiesOptions.title = close ? "Expand all" : "Collapse all";
    propertiesOptions.setAttribute(
      "aria-label",
      `${close ? "Expand" : "Collapse"} all Properties groups`,
    );
    status.textContent = `All Properties groups ${close ? "collapsed" : "expanded"}.`;
  }

  function setInteractionMode(mode: "select" | "pan"): void {
    interactionMode = mode;
    const pan = mode === "pan";
    selectToolButton.classList.toggle("is-active", !pan);
    panToolButton.classList.toggle("is-active", pan);
    selectToolButton.setAttribute("aria-pressed", String(!pan));
    panToolButton.setAttribute("aria-pressed", String(pan));
    canvasStage.classList.toggle("is-pan-mode", pan);
    canvasStage.dataset["interactionMode"] = mode;
    status.textContent = pan
      ? "Pan tool active. Drag the Canvas to move the page."
      : "Select tool active. Choose an element on the Canvas or in Contents.";
  }

  function toggleSnapping(kind: "smart" | "grid"): void {
    if (kind === "smart") smartSnapEnabled = !smartSnapEnabled;
    else gridSnapEnabled = !gridSnapEnabled;
    smartSnapButton.classList.toggle("is-active", smartSnapEnabled);
    gridSnapButton.classList.toggle("is-active", gridSnapEnabled);
    smartSnapButton.setAttribute("aria-pressed", String(smartSnapEnabled));
    gridSnapButton.setAttribute("aria-pressed", String(gridSnapEnabled));
    status.textContent = `Snapping: smart ${smartSnapEnabled ? "on" : "off"}, 1 pt grid ${gridSnapEnabled ? "on" : "off"}. Hold Alt during a gesture to bypass all snapping.`;
  }

  function addPageGuide(orientation: "horizontal" | "vertical"): void {
    const maximum = orientation === "vertical" ? page.widthMpt : page.heightMpt;
    const occupied = new Set(
      (studioProjection?.guides ?? [])
        .filter((guide) => guide.orientation === orientation)
        .map(({ positionMpt }) => positionMpt),
    );
    const preferred = [1 / 2, 1 / 3, 2 / 3, 1 / 4, 3 / 4]
      .map((ratio) => Math.round(maximum * ratio))
      .find((positionMpt) => !occupied.has(positionMpt));
    if (preferred === undefined) {
      status.textContent = `No unused default ${orientation} guide position is available; drag from the ruler.`;
      return;
    }
    void mutatePageGuide({ kind: "add", orientation, positionMpt: preferred });
  }

  function showPropertyPanel(panel: "element" | "diagnostics"): void {
    const showElement = panel === "element";
    propertyElementPanel.hidden = !showElement;
    propertyDiagnosticsPanel.hidden = showElement;
    propertyElementTab.classList.toggle("is-active", showElement);
    propertyDiagnosticsTab.classList.toggle("is-active", !showElement);
    propertyElementTab.setAttribute("aria-selected", String(showElement));
    propertyDiagnosticsTab.setAttribute("aria-selected", String(!showElement));
    propertiesScroll.scrollTo({ top: 0, behavior: "auto" });
  }

  function hideCanvasContextMenu(): void {
    canvasContextMenu.hidden = true;
  }

  function openCanvasContextMenu(clientX: number, clientY: number): void {
    canvasContextMenu.hidden = false;
    canvasContextMenu.style.left = "0px";
    canvasContextMenu.style.top = "0px";
    const bounds = canvasContextMenu.getBoundingClientRect();
    const position = resolveStudioContextMenuPosition({
      clientX,
      clientY,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      menuWidth: bounds.width,
      menuHeight: bounds.height,
    });
    canvasContextMenu.style.left = `${position.left}px`;
    canvasContextMenu.style.top = `${position.top}px`;
    contextProperties.focus();
  }

  function focusSelectedProperties(): void {
    hideCanvasContextMenu();
    showPropertyPanel("element");
    propertiesScroll.focus();
    status.textContent =
      selectedSceneNodeId === null
        ? "Properties opened for the selected element."
        : `Properties opened for exact occurrence ${selectedSceneNodeId}.`;
  }

  function updateArrangementControls(): void {
    const selectionCount = selectedTextNodeIds.size;
    const unavailable =
      studioProjection === null || lifecycleState?.readOnly === true || selectionCount < 2;
    const pairReason =
      lifecycleState?.readOnly === true
        ? "The Log Project is read-only"
        : studioProjection === null
          ? "The document projection is unavailable"
          : selectionCount < 2
            ? "Select at least two text elements; the last selected is the Key Element"
            : "Arrange selected text elements relative to the Key Element";
    for (const buttons of [
      arrangementButtons.alignLeft,
      arrangementButtons.alignCenter,
      arrangementButtons.alignRight,
      arrangementButtons.matchWidth,
      arrangementButtons.matchHeight,
      arrangementButtons.matchBoth,
    ]) {
      for (const button of buttons) {
        button.disabled = unavailable;
        button.title = pairReason;
        button.setAttribute("aria-disabled", String(unavailable));
      }
    }
    const depthBoundSelection = page.nodes.some(
      (node) =>
        node.kind === "text" &&
        selectedTextNodeIds.has(node.id) &&
        (node.presentation?.positionMode ?? "depth-bound") === "depth-bound",
    );
    const verticalUnavailable = unavailable || depthBoundSelection;
    const verticalReason = depthBoundSelection
      ? "Detach all selected depth-bound text as free annotations before changing vertical position"
      : pairReason;
    for (const buttons of [
      arrangementButtons.alignTop,
      arrangementButtons.alignMiddle,
      arrangementButtons.alignBottom,
    ]) {
      for (const button of buttons) {
        button.disabled = verticalUnavailable;
        button.title = verticalReason;
        button.setAttribute("aria-disabled", String(verticalUnavailable));
      }
    }
    const distributeUnavailable = unavailable || selectionCount < 3;
    const distributeReason =
      selectionCount < 3
        ? "Select at least three text elements to distribute equal gaps"
        : pairReason;
    for (const button of arrangementButtons.distributeHorizontal) {
      button.disabled = distributeUnavailable;
      button.title = distributeReason;
      button.setAttribute("aria-disabled", String(distributeUnavailable));
    }
    const verticalDistributeUnavailable = distributeUnavailable || depthBoundSelection;
    for (const button of arrangementButtons.distributeVertical) {
      button.disabled = verticalDistributeUnavailable;
      button.title = depthBoundSelection ? verticalReason : distributeReason;
      button.setAttribute("aria-disabled", String(verticalDistributeUnavailable));
    }
    const authoringUnavailable =
      studioProjection === null || lifecycleState?.readOnly === true || selectionCount < 1;
    const authoringReason =
      lifecycleState?.readOnly === true
        ? "The Log Project is read-only"
        : studioProjection === null
          ? "The document projection is unavailable"
          : selectionCount < 1
            ? "Select one or more exact text elements"
            : "Apply to the ordered text selection in one history command";
    for (const button of authoringButtons) {
      button.disabled = authoringUnavailable;
      button.title = authoringReason;
      button.setAttribute("aria-disabled", String(authoringUnavailable));
    }
    const copyUnavailable = studioProjection === null || selectionCount < 1;
    for (const button of copyButtons) {
      button.disabled = copyUnavailable;
      button.title = copyUnavailable
        ? "Select one or more exact text elements"
        : `Copy ${selectionCount} text occurrence${selectionCount === 1 ? "" : "s"} to the layout clipboard`;
      button.setAttribute("aria-disabled", String(copyUnavailable));
    }
    const pasteUnavailable =
      studioProjection === null ||
      lifecycleState?.readOnly === true ||
      textClipboardNodeIds.length === 0 ||
      textClipboardBoringLogIdentity !== lifecycleState?.activeBoringLogIdentity;
    for (const button of pasteButtons) {
      button.disabled = pasteUnavailable;
      button.title =
        textClipboardNodeIds.length === 0
          ? "Copy or cut text elements before pasting"
          : textClipboardBoringLogIdentity !== lifecycleState?.activeBoringLogIdentity
            ? "The layout clipboard belongs to another Boring Log"
            : lifecycleState?.readOnly === true
              ? "The Log Project is read-only"
              : `Paste ${textClipboardNodeIds.length} copied text occurrence${textClipboardNodeIds.length === 1 ? "" : "s"}`;
      button.setAttribute("aria-disabled", String(pasteUnavailable));
    }
    const selectedNodes = page.nodes.filter(
      (node): node is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
        node.kind === "text" && selectedTextNodeIds.has(node.id),
    );
    const selectedParentIds = new Set(selectedNodes.map(({ parentId }) => parentId));
    const selectedParent = page.nodes.find(({ id }) => id === selectedNodes[0]?.parentId);
    const groupUnavailable =
      authoringUnavailable ||
      selectionCount < 2 ||
      selectedParentIds.size !== 1 ||
      selectedParent?.role === "user-text-group";
    const groupReason =
      selectionCount < 2
        ? "Select at least two text elements to group"
        : selectedParentIds.size !== 1
          ? "Grouping requires sibling text elements under the same Contents parent"
          : selectedParent?.role === "user-text-group"
            ? "The selected text is already grouped"
            : authoringReason;
    for (const button of groupButtons) {
      button.disabled = groupUnavailable;
      button.title = groupReason;
      button.setAttribute("aria-disabled", String(groupUnavailable));
    }
    const ungroupable =
      selectedNodes.length > 0 &&
      selectedNodes.every(({ parentId }) =>
        page.nodes.some(
          (candidate) =>
            candidate.kind === "group" &&
            candidate.id === parentId &&
            candidate.role === "user-text-group",
        ),
      );
    const ungroupUnavailable = authoringUnavailable || !ungroupable;
    for (const button of ungroupButtons) {
      button.disabled = ungroupUnavailable;
      button.title = ungroupable
        ? authoringReason
        : "Select text belonging to one or more authored groups";
      button.setAttribute("aria-disabled", String(ungroupUnavailable));
    }
  }

  async function mutateSelectedText(
    mutation: TextAuthoringMutation,
    commandSource: "keyboard" | "ribbon" | "context-menu" | "contents",
    explicitOccurrenceNodeIds?: readonly string[],
  ): Promise<void> {
    if (pendingKeyboardNudge !== undefined) await flushKeyboardNudge();
    const apis = studioApis();
    const occurrenceNodeIds = explicitOccurrenceNodeIds ?? [...selectedTextNodeIds];
    if (apis === null || studioProjection === null || occurrenceNodeIds.length === 0) {
      status.textContent = "Select one or more exact text elements before authoring.";
      return;
    }
    if (lifecycleState?.readOnly === true) {
      status.textContent = "This Log Project is read-only; authoring commands are unavailable.";
      return;
    }
    hideCanvasContextMenu();
    status.textContent = `${humanize(mutation.kind)} from ${commandSource}…`;
    const response = await apis.studio.mutateTextOccurrences({
      expectedWorkingRevision: studioProjection.workingRevision,
      occurrenceNodeIds,
      mutation,
    });
    if (!response.accepted || response.workingRevision === undefined) {
      status.textContent = `Authoring rejected: ${humanize(response.code ?? "unknown")}.`;
      return;
    }
    if (response.code === "TEXT_AUTHORING_UNCHANGED") {
      status.textContent =
        "The requested authoring state was already effective; history was unchanged.";
      return;
    }
    const successStatus = `${humanize(mutation.kind)} applied to ${occurrenceNodeIds.length} text occurrence${occurrenceNodeIds.length === 1 ? "" : "s"} from ${commandSource}; Undo restores the prior state.`;
    const refreshed = await refreshStudioProjection(response.workingRevision, successStatus);
    if (
      refreshed &&
      mutation.kind === "duplicate" &&
      response.createdOccurrenceNodeIds !== undefined &&
      response.createdOccurrenceNodeIds.length > 0
    ) {
      const createdNodes = response.createdOccurrenceNodeIds
        .map((nodeId) => page.nodes.find((node) => node.kind === "text" && node.id === nodeId))
        .filter(
          (node): node is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
            node?.kind === "text",
        );
      const keyElement = createdNodes.at(-1);
      if (keyElement !== undefined) {
        select(keyElement.semanticId, keyElement.id);
        selectedTextNodeIds.clear();
        for (const node of createdNodes) selectedTextNodeIds.add(node.id);
        selectedSemanticId = keyElement.semanticId;
        selectedSceneNodeId = keyElement.id;
        installSvg();
        renderTree();
        updateArrangementControls();
        status.textContent = `${createdNodes.length} duplicated text occurrence${createdNodes.length === 1 ? "" : "s"} selected; drag, resize, format, or Undo.`;
      }
    }
  }

  function copySelectedText(commandSource: "keyboard" | "ribbon" | "context-menu"): void {
    const copied = [...selectedTextNodeIds].filter((nodeId) =>
      page.nodes.some((node) => node.kind === "text" && node.id === nodeId),
    );
    if (copied.length === 0) {
      status.textContent = "Select one or more exact text elements before copying.";
      return;
    }
    textClipboardNodeIds = Object.freeze(copied);
    textClipboardBoringLogIdentity = lifecycleState?.activeBoringLogIdentity ?? null;
    hideCanvasContextMenu();
    updateArrangementControls();
    status.textContent = `${copied.length} text occurrence${copied.length === 1 ? "" : "s"} copied to the layout clipboard from ${commandSource}.`;
  }

  async function cutSelectedText(
    commandSource: "keyboard" | "ribbon" | "context-menu",
  ): Promise<void> {
    copySelectedText(commandSource);
    if (textClipboardNodeIds.length === 0) return;
    await mutateSelectedText(
      { kind: "set-visible", visible: false },
      commandSource,
      textClipboardNodeIds,
    );
  }

  function duplicateMutationFor(
    occurrenceNodeIds: readonly string[],
  ): Extract<TextAuthoringMutation, { readonly kind: "duplicate" }> | null {
    if (studioProjection === null) return null;
    const offset = findCollisionFreeTextDuplicateOffset(
      studioProjection.scene,
      page.pageId,
      occurrenceNodeIds,
    );
    return offset === null ? null : Object.freeze({ kind: "duplicate", ...offset });
  }

  function duplicateSelectedText(
    commandSource: "keyboard" | "ribbon" | "context-menu",
    occurrenceNodeIds: readonly string[] = [...selectedTextNodeIds],
  ): void {
    const mutation = duplicateMutationFor(occurrenceNodeIds);
    if (mutation === null) {
      status.textContent =
        "Duplicate needs a collision-free location on this page; move or resize the selected text first.";
      return;
    }
    void mutateSelectedText(mutation, commandSource, occurrenceNodeIds);
  }

  function pasteCopiedText(commandSource: "keyboard" | "ribbon" | "context-menu"): void {
    if (
      textClipboardNodeIds.length === 0 ||
      textClipboardBoringLogIdentity !== lifecycleState?.activeBoringLogIdentity
    ) {
      status.textContent =
        textClipboardNodeIds.length === 0
          ? "The layout clipboard is empty."
          : "The layout clipboard belongs to another Boring Log; switch back or copy here.";
      return;
    }
    duplicateSelectedText(commandSource, textClipboardNodeIds);
  }

  async function arrangeSelectedText(
    operation: TextArrangementOperation,
    commandSource: "keyboard" | "ribbon" | "context-menu",
    selectionSnapshot?: Readonly<{
      readonly expectedWorkingRevision: number;
      readonly keyElementId: string;
      readonly occurrenceNodeIds: readonly string[];
    }>,
  ): Promise<void> {
    if (commandSource !== "keyboard" && pendingKeyboardNudge !== undefined) {
      await flushKeyboardNudge();
    }
    const apis = studioApis();
    const keyElementId = selectionSnapshot?.keyElementId ?? selectedSceneNodeId;
    const occurrenceNodeIds = selectionSnapshot?.occurrenceNodeIds ?? [...selectedTextNodeIds];
    const expectedWorkingRevision =
      selectionSnapshot?.expectedWorkingRevision ?? studioProjection?.workingRevision;
    if (
      apis === null ||
      studioProjection === null ||
      keyElementId === null ||
      expectedWorkingRevision === undefined ||
      !occurrenceNodeIds.includes(keyElementId)
    ) {
      status.textContent = "Arrangement is unavailable until an exact text selection is active.";
      return;
    }
    if (lifecycleState?.readOnly === true) {
      status.textContent = "This Log Project is read-only; arrangement commands are unavailable.";
      return;
    }
    status.textContent = `${humanize(operation.kind)} from ${commandSource}…`;
    const response = await apis.studio.arrangeTextOccurrences({
      expectedWorkingRevision,
      keyElementId,
      occurrenceNodeIds,
      operation,
    });
    if (!response.accepted || response.workingRevision === undefined) {
      status.textContent = `Arrangement rejected: ${humanize(response.code ?? "unknown")}.`;
      return;
    }
    const unchanged = response.code === "ARRANGEMENT_UNCHANGED";
    if (unchanged) {
      status.textContent = "Arrangement produced no geometry change; history was not modified.";
      return;
    }
    await refreshStudioProjection(
      response.workingRevision,
      `${occurrenceNodeIds.length} selected text element${occurrenceNodeIds.length === 1 ? "" : "s"} arranged from ${commandSource}; Undo restores the prior geometry.`,
    );
  }

  function clearKeyboardNudgePreview(): void {
    pageHost.querySelector("#keyboard-nudge-preview")?.remove();
    Reflect.deleteProperty(canvasStage.dataset, "keyboardNudgePending");
  }

  function renderKeyboardNudgePreview(): void {
    const pending = pendingKeyboardNudge;
    const svg = pageHost.querySelector<SVGSVGElement>("svg");
    if (pending === undefined || svg === null) return;
    svg.querySelector("#keyboard-nudge-preview")?.remove();
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.id = "keyboard-nudge-preview";
    group.setAttribute("aria-hidden", "true");
    for (const occurrenceNodeId of pending.occurrenceNodeIds) {
      const node = page.nodes.find(
        (candidate): candidate is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
          candidate.kind === "text" && candidate.id === occurrenceNodeId,
      );
      if (node === undefined) continue;
      const rectangle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rectangle.classList.add("keyboard-nudge-preview-frame");
      rectangle.setAttribute("x", String(node.frame.xMpt + pending.deltaXMpt));
      rectangle.setAttribute("y", String(node.frame.yMpt + pending.deltaYMpt));
      rectangle.setAttribute("width", String(node.frame.widthMpt));
      rectangle.setAttribute("height", String(node.frame.heightMpt));
      group.append(rectangle);
    }
    svg.append(group);
    canvasStage.dataset["keyboardNudgePending"] = "true";
  }

  async function flushKeyboardNudge(): Promise<void> {
    const pending = pendingKeyboardNudge;
    if (pending === undefined) return;
    window.clearTimeout(pending.timer);
    pendingKeyboardNudge = undefined;
    clearKeyboardNudgePreview();
    keyboardNudgeCommitInFlight = true;
    try {
      await arrangeSelectedText(
        { kind: "nudge", deltaXMpt: pending.deltaXMpt, deltaYMpt: pending.deltaYMpt },
        "keyboard",
        pending,
      );
    } finally {
      keyboardNudgeCommitInFlight = false;
    }
  }

  function cancelKeyboardNudge(): void {
    const pending = pendingKeyboardNudge;
    if (pending === undefined) return;
    window.clearTimeout(pending.timer);
    pendingKeyboardNudge = undefined;
    clearKeyboardNudgePreview();
    status.textContent = "Pending keyboard nudge canceled; history and geometry are unchanged.";
  }

  function queueKeyboardNudge(deltaXMpt: number, deltaYMpt: number): void {
    if (keyboardNudgeCommitInFlight) {
      status.textContent = "The prior coalesced keyboard nudge is still committing.";
      return;
    }
    if (studioProjection === null || selectedSceneNodeId === null || selectedTextNodeIds.size === 0)
      return;
    const occurrenceNodeIds = [...selectedTextNodeIds];
    const selectedNodes = occurrenceNodeIds.map((occurrenceNodeId) =>
      page.nodes.find(
        (candidate): candidate is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
          candidate.kind === "text" && candidate.id === occurrenceNodeId,
      ),
    );
    if (selectedNodes.some((node) => node === undefined || node.presentation?.locked === true)) {
      status.textContent =
        "Keyboard nudge is unavailable because the selection contains a locked text frame.";
      return;
    }
    if (
      deltaYMpt !== 0 &&
      selectedNodes.some(
        (node) => (node?.presentation?.positionMode ?? "depth-bound") === "depth-bound",
      )
    ) {
      status.textContent =
        "Vertical nudge is unavailable for depth-bound text. Detach the annotation in Properties first.";
      return;
    }
    const pending = pendingKeyboardNudge;
    const sameSelection =
      pending !== undefined &&
      pending.expectedWorkingRevision === studioProjection.workingRevision &&
      pending.keyElementId === selectedSceneNodeId &&
      pending.occurrenceNodeIds.length === occurrenceNodeIds.length &&
      pending.occurrenceNodeIds.every(
        (occurrenceNodeId, index) => occurrenceNodeId === occurrenceNodeIds[index],
      );
    if (pending !== undefined && !sameSelection) {
      void flushKeyboardNudge();
      status.textContent =
        "The prior keyboard nudge is committing before a new selection can move.";
      return;
    }
    const totalXMpt = (pending?.deltaXMpt ?? 0) + deltaXMpt;
    const totalYMpt = (pending?.deltaYMpt ?? 0) + deltaYMpt;
    if (
      selectedNodes.some(
        (node) =>
          node !== undefined &&
          (node.frame.xMpt + totalXMpt < 0 ||
            node.frame.yMpt + totalYMpt < 0 ||
            node.frame.xMpt + node.frame.widthMpt + totalXMpt > page.widthMpt ||
            node.frame.yMpt + node.frame.heightMpt + totalYMpt > page.heightMpt),
      )
    ) {
      status.textContent = "Keyboard nudge stopped at the page boundary.";
      return;
    }
    if (pending !== undefined) window.clearTimeout(pending.timer);
    const next = {
      expectedWorkingRevision: studioProjection.workingRevision,
      keyElementId: selectedSceneNodeId,
      occurrenceNodeIds: Object.freeze(occurrenceNodeIds),
      deltaXMpt: totalXMpt,
      deltaYMpt: totalYMpt,
      timer: 0,
    };
    next.timer = window.setTimeout(() => void flushKeyboardNudge(), 220);
    pendingKeyboardNudge = next;
    renderKeyboardNudgePreview();
    status.textContent = `Keyboard nudge preview ${(totalXMpt / 1_000).toFixed(1)} pt X, ${(totalYMpt / 1_000).toFixed(1)} pt Y; repeated keys coalesce into one Undo step after 220 ms idle. Esc cancels.`;
  }

  function activateRibbonTab(tabId: string): void {
    const tabs = [...document.querySelectorAll<HTMLButtonElement>("[data-ribbon-tab]")];
    const panels = [...document.querySelectorAll<HTMLElement>("[data-ribbon-panel]")];
    const activeTab = tabs.find((tab) => tab.dataset["ribbonTab"] === tabId);
    if (activeTab === undefined) return;
    for (const tab of tabs) {
      const active = tab === activeTab;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    }
    for (const panel of panels) panel.hidden = panel.dataset["ribbonPanel"] !== tabId;
    const ribbon = element<HTMLElement>("ribbon");
    ribbon.setAttribute("aria-labelledby", activeTab.id);
    ribbon.setAttribute("aria-label", `${activeTab.textContent?.trim() ?? tabId} commands`);
    publicationPackagePanel.hidden = tabId !== "publish";
    if (tabId === "publish") renderPublicationInventory();
    status.textContent = `${activeTab.textContent?.trim() ?? tabId} commands active.`;
  }

  function select(
    semanticId: string,
    nodeId: string | null = null,
    additiveTextSelection = false,
  ): void {
    if (pendingKeyboardNudge !== undefined) void flushKeyboardNudge();
    showPropertyPanel("element");
    columnResizeProperties.hidden = true;
    regionResizeProperties.hidden = true;
    const requestedNodes = page.nodes.filter((node) => node.semanticId === semanticId);
    const requestedRepresentative =
      (nodeId === null ? undefined : requestedNodes.find((node) => node.id === nodeId)) ??
      requestedNodes.find((node) => node.kind === "text") ??
      requestedNodes[0];
    const exactTextNode =
      requestedRepresentative?.kind === "text" && requestedRepresentative.id === nodeId
        ? requestedRepresentative
        : undefined;
    if (additiveTextSelection && exactTextNode !== undefined) {
      if (selectedTextNodeIds.has(exactTextNode.id)) selectedTextNodeIds.delete(exactTextNode.id);
      else selectedTextNodeIds.add(exactTextNode.id);
      selectedSceneNodeId = [...selectedTextNodeIds].at(-1) ?? null;
      selectedSemanticId =
        page.nodes.find(({ id }) => id === selectedSceneNodeId)?.semanticId ?? semanticId;
    } else {
      selectedTextNodeIds.clear();
      if (exactTextNode !== undefined) {
        selectedTextNodeIds.add(exactTextNode.id);
        selectedSceneNodeId = exactTextNode.id;
      } else selectedSceneNodeId = nodeId;
      selectedSemanticId = semanticId;
    }
    if (additiveTextSelection && exactTextNode !== undefined && selectedTextNodeIds.size === 0) {
      selectedSemanticId = null;
      selectedSceneNodeId = null;
      installSvg();
      renderTree();
      updateArrangementControls();
      emptySelection.hidden = false;
      selectionProperties.hidden = true;
      selectionStatus.textContent = "No selection";
      status.textContent = "Selection cleared.";
      return;
    }
    if (
      nodeId === null &&
      requestedRepresentative?.kind === "text" &&
      requestedNodes.filter((node) => node.kind === "text").length === 1
    ) {
      selectedSceneNodeId = requestedRepresentative.id;
      selectedTextNodeIds.add(requestedRepresentative.id);
    }
    const effectiveSemanticId = selectedSemanticId ?? semanticId;
    const nodes = page.nodes.filter((node) => node.semanticId === effectiveSemanticId);
    const representative =
      (selectedSceneNodeId === null
        ? undefined
        : nodes.find((node) => node.id === selectedSceneNodeId)) ??
      nodes.find((node) => node.kind === "text") ??
      nodes[0];
    installSvg();
    renderTree();
    updateArrangementControls();
    if (representative === undefined) {
      emptySelection.hidden = false;
      selectionProperties.hidden = true;
      selectionStatus.textContent = effectiveSemanticId;
      return;
    }
    emptySelection.hidden = true;
    selectionProperties.hidden = false;
    selectionName.textContent =
      selectedTextNodeIds.size > 1
        ? `${selectedTextNodeIds.size} text elements`
        : humanize(effectiveSemanticId);
    selectionRole.textContent = humanize(representative.role);
    selectionProvenance.textContent =
      representative.provenance?.provenanceClass === "effective-override"
        ? "Effective override"
        : representative.provenance?.provenanceClass === "source"
          ? "Source original"
          : "Computed layout";
    propertySemanticId.textContent =
      selectedTextNodeIds.size > 1 ? "Mixed selection" : effectiveSemanticId;
    propertyNodeId.textContent = representative.id;
    propertyRole.textContent = representative.role;
    propertyNodeCount.textContent = String(nodes.length);
    const plannedPage = scene.pagePlan.pages.find(({ pageId }) => pageId === page.pageId);
    const selectedColumn = plannedPage?.columns.find(({ id }) => id === effectiveSemanticId);
    const selectedRegion = plannedPage?.regions.find(({ id }) => id === effectiveSemanticId);
    const columnConstraint = studioProjection?.columnResizeConstraints.find(
      ({ columnId }) => columnId === selectedColumn?.id,
    );
    columnResizeProperties.hidden = selectedColumn === undefined;
    if (selectedColumn !== undefined && columnConstraint !== undefined) {
      columnWidth.value = String(selectedColumn.widthMpt / 1_000);
      columnWidth.min = String(columnConstraint.minimumWidthMpt / 1_000);
      columnMinimumWidth.textContent = `${columnConstraint.minimumWidthMpt / 1_000} pt${columnConstraint.widthPinned ? " · width pinned" : ""}`;
      applyColumnWidth.disabled =
        columnConstraint.widthPinned ||
        studioProjection === null ||
        lifecycleState?.readOnly === true;
      updateColumnResizePropertySummary();
    }
    if (
      plannedPage !== undefined &&
      selectedRegion !== undefined &&
      (selectedRegion.role === "header" || selectedRegion.role === "footer") &&
      studioProjection !== null
    ) {
      const minimumHeightMpt =
        selectedRegion.role === "header"
          ? studioProjection.regionResizeConstraints.minimumHeaderHeightMpt
          : studioProjection.regionResizeConstraints.minimumFooterHeightMpt;
      regionResizeProperties.hidden = false;
      regionHeight.value = String(selectedRegion.heightMpt / 1_000);
      regionHeight.min = String(minimumHeightMpt / 1_000);
      regionMinimumHeight.textContent = `${minimumHeightMpt / 1_000} pt`;
      regionDepthScale.textContent = `${plannedPage.depthTransform.mptPerFoot} mpt/ft (fixed)`;
      regionPagination.textContent = `${plannedPage.depthRange.endFt - plannedPage.depthRange.startFt} ft · 1 page`;
      applyRegionHeight.disabled = lifecycleState?.readOnly === true;
    }
    const lithologyMatch = /^lithology:([^:]+)/u.exec(effectiveSemanticId);
    const lithologyState =
      lithologyMatch === null
        ? undefined
        : studioProjection?.lithologyAppearanceStates.find(
            ({ intervalId }) => intervalId === lithologyMatch[1],
          );
    lithologyAppearanceProperties.hidden = lithologyState === undefined;
    selectedLithologyInitialColor = lithologyState?.effectiveMaterialFillColor ?? null;
    selectedLithologyInitialPatternId = lithologyState?.effectivePatternId ?? null;
    if (lithologyState !== undefined && studioProjection !== null) {
      lithologyClassification.textContent = lithologyState.classification;
      lithologyMappedKey.textContent = lithologyState.mappedClassificationKey;
      lithologyFillColor.value = /^#[0-9a-f]{6}$/iu.test(lithologyState.effectiveMaterialFillColor)
        ? lithologyState.effectiveMaterialFillColor
        : "#ffffff";
      lithologyPattern.replaceChildren(
        ...studioProjection.lithologyPatternOptions.map(({ patternId, kind }) => {
          const option = document.createElement("option");
          option.value = patternId;
          option.textContent = `${humanize(patternId)} · ${humanize(kind)}`;
          return option;
        }),
      );
      lithologyPattern.value = lithologyState.effectivePatternId;
      lithologyFillScope.textContent = humanize(lithologyState.materialFillApplication);
      lithologyPatternScope.textContent = humanize(lithologyState.patternApplication);
      applyLithologyInterval.disabled = lifecycleState?.readOnly === true;
      setLithologyDefault.disabled = lifecycleState?.readOnly === true;
      lithologyAppearanceHelp.textContent = `${lithologyState.mappedClassificationKey}: interval changes affect only ${lithologyState.intervalId}. Set as default applies changed properties across all project borings. Explicit interval values remain higher precedence.`;
    }
    const textStyle =
      representative.kind === "text"
        ? scene.resources.textStyles.find(({ id }) => id === representative.styleId)
        : undefined;
    textStyleProperties.hidden = textStyle === undefined;
    textLayoutProperties.hidden = textStyle === undefined;
    textInheritanceProperties.hidden = textStyle === undefined;
    if (textStyle !== undefined && representative.kind === "text") {
      templateTextPropertyMask.clear();
      textFontFamily.value = textStyle.fontFamilyId;
      textFontSize.value = String(textStyle.fontSizeMpt / 1_000);
      textFontWeight.value = String(textStyle.fontWeight);
      textDecoration.value = textStyle.textDecoration ?? "none";
      textLineHeight.value = String(textStyle.lineHeightMpt / 1_000);
      textLetterSpacing.value = String((textStyle.letterSpacingMpt ?? 0) / 1_000);
      textWordSpacing.value = String((textStyle.wordSpacingMpt ?? 0) / 1_000);
      textParagraphSpacing.value = String((textStyle.paragraphSpacingMpt ?? 0) / 1_000);
      textColor.value = /^#[0-9a-f]{6}$/iu.test(textStyle.color) ? textStyle.color : "#111827";
      const presentation = representative.presentation;
      const request = scene.textRequests.find(
        ({ measurementId }) => measurementId === representative.measurementId,
      );
      const measurement = scene.textResults.find(
        ({ measurementId }) => measurementId === representative.measurementId,
      );
      currentTextFrameAnchor = presentation?.frameAnchor ?? "top-left";
      textFrameAnchor.value = currentTextFrameAnchor;
      const anchorPoint = frameAnchorPoint(representative.frame, currentTextFrameAnchor);
      textFrameX.value = String(anchorPoint.xMpt / 1_000);
      textFrameY.value = String(anchorPoint.yMpt / 1_000);
      textFrameWidth.value = String(representative.frame.widthMpt / 1_000);
      textFrameHeight.value = String(representative.frame.heightMpt / 1_000);
      textHorizontalAlignment.value = presentation?.horizontalAlignment ?? "start";
      textVerticalAlignment.value = presentation?.verticalAlignment ?? "top";
      textWrapPolicy.value = presentation?.wrapPolicy ?? request?.wrapPolicy ?? "word-v1";
      textOverflowPolicy.value = presentation?.overflowPolicy ?? "clip-with-diagnostic";
      textMinimumFontSize.value = String(
        (presentation?.minimumFontSizeMpt ?? textStyle.fontSizeMpt) / 1_000,
      );
      textMinimumFontSize.disabled = textOverflowPolicy.value !== "shrink-to-minimum";
      textStyleHelp.textContent =
        measurement === undefined
          ? "Text fit has not been measured."
          : `Authored ${(textStyle.fontSizeMpt / 1_000).toFixed(1)} pt · effective ${(measurement.effectiveFontSizeMpt / 1_000).toFixed(1)} pt · ${measurement.overflow === "none" ? "fits" : `${measurement.overflow}; export blocked`}. Changes apply to this exact occurrence.`;
      textRotation.value = String((presentation?.rotationMilliDegrees ?? 0) / 1_000);
      textPaddingTop.value = String((presentation?.paddingMpt.topMpt ?? 0) / 1_000);
      textPaddingRight.value = String((presentation?.paddingMpt.rightMpt ?? 0) / 1_000);
      textPaddingBottom.value = String((presentation?.paddingMpt.bottomMpt ?? 0) / 1_000);
      textPaddingLeft.value = String((presentation?.paddingMpt.leftMpt ?? 0) / 1_000);
      textFrameFillEnabled.checked = presentation?.frameFillColor != null;
      textFrameFillColor.value = /^#[0-9a-f]{6}$/iu.test(presentation?.frameFillColor ?? "")
        ? presentation!.frameFillColor!
        : "#fff4cc";
      textFrameFillColor.disabled = !textFrameFillEnabled.checked;
      textFrameStrokeEnabled.checked = presentation?.frameStrokeColor != null;
      textFrameStrokeColor.value = /^#[0-9a-f]{6}$/iu.test(presentation?.frameStrokeColor ?? "")
        ? presentation!.frameStrokeColor!
        : "#b42318";
      textFrameStrokeColor.disabled = !textFrameStrokeEnabled.checked;
      textFrameStrokeWidth.value = String((presentation?.frameStrokeWidthMpt ?? 500) / 1_000);
      textFrameStrokeWidth.disabled = !textFrameStrokeEnabled.checked;
      textPositionMode.value = presentation?.positionMode ?? "depth-bound";
      textFrameY.readOnly = textPositionMode.value !== "free";
      detachTextAnnotation.disabled =
        textPositionMode.value === "free" ||
        selectedSceneNodeId === null ||
        studioProjection === null ||
        lifecycleState?.readOnly === true;
      textLocked.checked = presentation?.locked ?? false;
      const presentationState = studioProjection?.textOccurrencePresentationStates.find(
        ({ occurrenceNodeId }) => occurrenceNodeId === representative.id,
      );
      const inheritedStyle = presentationState?.typography !== "occurrence";
      const inheritedLayout = presentationState?.layout !== "occurrence";
      const columnId = boringLogTextColumnSemanticId(representative);
      textAllSelectedScope.disabled = selectedTextNodeIds.size < 2;
      textColumnDefaultScope.disabled = !inheritedStyle || columnId === null;
      textNamedStyleScope.disabled =
        !inheritedStyle || representative.styleId.startsWith("style-column-");
      textTemplateDefaultScope.disabled = !inheritedStyle;
      if (selectedTextNodeIds.size < 2 && textStyleScope.value === "all-selected") {
        textStyleScope.value = "occurrence";
      }
      if (
        (!inheritedStyle || representative.styleId.startsWith("style-column-")) &&
        textStyleScope.value === "named-style"
      ) {
        textStyleScope.value = "occurrence";
      }
      if ((!inheritedStyle || columnId === null) && textStyleScope.value === "column-default") {
        textStyleScope.value = "occurrence";
      }
      if (!inheritedStyle && textStyleScope.value === "template-default") {
        textStyleScope.value = "occurrence";
      }
      textStyleInheritance.textContent = inheritedStyle ? "Inherited" : "This occurrence";
      textLayoutInheritance.textContent = inheritedLayout ? "Inherited" : "This occurrence";
      resetTextPresentation.disabled =
        selectedSceneNodeId === null ||
        studioProjection === null ||
        lifecycleState?.readOnly === true ||
        (inheritedStyle && inheritedLayout);
      applyTextStyle.disabled = selectedSceneNodeId === null || studioProjection === null;
      textStyleHelp.textContent = `${textStyleHelp.textContent} This occurrence · inherited values resolve into a project-owned template override · edits use document history.`;
      if (textStyleScope.value === "template-default") updateTextStyleScopeHelp();
    }
    const editable = editableFor(effectiveSemanticId);
    const legacyColumnWidth = editable?.property === "description-column-width-mpt";
    const effective = legacyColumnWidth
      ? (selectedColumn?.widthMpt ?? null)
      : editable === null
        ? null
        : contentValue(editable.effectiveDisplay.content);
    const sourceOriginal = editable === null ? null : contentValue(editable.sourceOriginal.content);
    propertyContent.value =
      effective === null
        ? nodes
            .filter(
              (node): node is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
                node.kind === "text",
            )
            .map(({ content }) => content)
            .join("\n")
        : String(effective);
    propertyContent.readOnly = editable === null;
    applyProperty.disabled = editable === null;
    propertyHelp.textContent =
      editable === null
        ? "This element is computed or read-only."
        : legacyColumnWidth
          ? "Historic source-original width · edits now route through embedded-template divider history."
          : `${humanize(editable.property)} · ${editable.valueType} · edits route through document history.`;
    propertyBounds.textContent = boundsText([representative]);
    propertyProvenance.textContent = provenanceText(representative.provenance);
    propertySourceOriginal.textContent =
      sourceOriginal === null ? "Computed" : String(sourceOriginal);
    propertyEffectiveValue.textContent = effective === null ? "Computed" : String(effective);
    selectionStatus.textContent = `${humanize(effectiveSemanticId)} · ${representative.id}`;
    if (selectedTextNodeIds.size > 1) {
      selectionStatus.textContent = `${selectedTextNodeIds.size} text occurrences; primary ${representative.id}`;
    }
    status.textContent =
      selectedTextNodeIds.size > 1
        ? `${selectedTextNodeIds.size} exact text occurrences selected. Shift-click toggles membership; the orange occurrence is the Key Element.`
        : `Selected exact occurrence ${representative.id}. Canvas, Contents, and Properties synchronized.`;
  }

  function clearSelection(): void {
    selectedSemanticId = null;
    selectedSceneNodeId = null;
    selectedTextNodeIds.clear();
    installSvg();
    renderTree();
    updateArrangementControls();
    emptySelection.hidden = false;
    selectionProperties.hidden = true;
    selectionStatus.textContent = "No selection";
    status.textContent = "Selection cleared.";
  }

  function selectAllTextOccurrences(): void {
    const textNodes = page.nodes.filter(
      (node): node is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
        node.kind === "text",
    );
    const key = textNodes.at(-1);
    if (key === undefined) return;
    select(key.semanticId, key.id);
    selectedTextNodeIds.clear();
    for (const node of textNodes) selectedTextNodeIds.add(node.id);
    selectedSemanticId = key.semanticId;
    selectedSceneNodeId = key.id;
    installSvg();
    renderTree();
    updateArrangementControls();
    selectionName.textContent = `${textNodes.length} text elements`;
    propertySemanticId.textContent = "Mixed selection";
    selectionStatus.textContent = `${textNodes.length} text occurrences; Key Element ${key.id}`;
    status.textContent = `${textNodes.length} text occurrences selected on the active page; the orange occurrence is the Key Element.`;
  }

  async function refreshStudioProjection(
    minimumWorkingRevision: number | null,
    successStatus: string,
  ): Promise<boolean> {
    const apis = studioApis();
    if (apis === null) return false;
    const result = await apis.studio.getProjection({ minimumWorkingRevision });
    if (!result.accepted) {
      status.textContent = `Studio scene refresh failed: ${result.code}`;
      return false;
    }
    studioProjection = result.projection;
    scene = result.projection.scene;
    page = scene.pages[0]!;
    renderDiagnostics();
    if (selectedSemanticId === null) {
      installSvg();
      renderTree();
    } else {
      const priorTextNodeIds = [...selectedTextNodeIds];
      select(selectedSemanticId, selectedSceneNodeId);
      for (const nodeId of priorTextNodeIds) {
        if (page.nodes.some((node) => node.id === nodeId && node.kind === "text")) {
          selectedTextNodeIds.add(nodeId);
        }
      }
      textAllSelectedScope.disabled = selectedTextNodeIds.size < 2;
      updateArrangementControls();
      installSvg();
      renderTree();
    }
    updateHistoryControls();
    sceneSummary.textContent = `${page.nodes.length} vector nodes · ${page.semanticOrder.length} semantic elements · ${scene.diagnostics.length} diagnostics`;
    sceneSummary.textContent = `${scene.pages.length} page${scene.pages.length === 1 ? "" : "s"} - ${scene.pages.reduce((total, scenePage) => total + scenePage.nodes.length, 0)} vector nodes - ${scene.diagnostics.length} diagnostics`;
    status.textContent = successStatus;
    return true;
  }

  async function validateDocument(): Promise<void> {
    if (studioProjection === null || validateButton.disabled) return;
    validateButton.disabled = true;
    validateButton.removeAttribute("data-result");
    status.textContent = `Validating revision ${studioProjection.workingRevision} through scene authority…`;
    const revision = studioProjection.workingRevision;
    const refreshed = await refreshStudioProjection(revision, "Validation refreshed.");
    if (!refreshed || studioProjection === null) {
      validateButton.dataset["result"] = "VALIDATION_REJECTED";
      validateButton.disabled = false;
      return;
    }
    const errorCount = scene.diagnostics.filter(({ severity }) => severity === "error").length;
    showPropertyPanel("diagnostics");
    validateButton.dataset["result"] = errorCount === 0 ? "VALIDATION_PASS" : "VALIDATION_ERRORS";
    status.textContent = `Validation ${errorCount === 0 ? "passed" : "found errors"} at revision ${studioProjection.workingRevision}: ${errorCount} error${errorCount === 1 ? "" : "s"}, ${scene.diagnostics.length} diagnostic${scene.diagnostics.length === 1 ? "" : "s"}.`;
    validateButton.disabled = false;
    validateButton.focus();
  }

  function replacementContent(
    editable: EditableValue,
    raw: string,
  ): OverrideRenderContentState | null {
    if (editable.valueType === "string") {
      if (
        editable.property === "lithology-pattern-style" &&
        !["silt-horizontal-dash", "sand-dot-ring", "gravel-dot-ring"].includes(raw)
      ) {
        return null;
      }
      return raw.length === 0
        ? { kind: "empty-string" }
        : { kind: "value", value: raw, originalRepresentation: raw };
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;
    if (editable.property === "sample-recovery" && (value < 0 || value > 100)) return null;
    if (
      editable.property === "description-column-width-mpt" &&
      (!Number.isSafeInteger(value) || value < 100_000 || value > 230_000)
    ) {
      return null;
    }
    return value === 0
      ? { kind: "zero", value: 0, originalRepresentation: raw }
      : { kind: "value", value, originalRepresentation: raw };
  }

  async function applySelectedLithologyAppearance(
    applyScope: "interval" | "classification-default",
  ): Promise<void> {
    const apis = studioApis();
    const intervalId =
      selectedSemanticId === null ? null : /^lithology:([^:]+)/u.exec(selectedSemanticId)?.[1];
    const appearance = studioProjection?.lithologyAppearanceStates.find(
      (candidate) => candidate.intervalId === intervalId,
    );
    if (
      apis === null ||
      studioProjection === null ||
      appearance === undefined ||
      intervalId === null ||
      intervalId === undefined
    ) {
      return;
    }
    const color = lithologyFillColor.value.toLowerCase();
    const patternId = lithologyPattern.value;
    const colorChanged = color !== selectedLithologyInitialColor;
    const patternChanged = patternId !== selectedLithologyInitialPatternId;
    if (applyScope === "interval" && !colorChanged && !patternChanged) {
      status.textContent = "Choose a different lithology color or vector pattern first.";
      lithologyFillColor.focus();
      return;
    }
    const promoteEffective =
      applyScope === "classification-default" && !colorChanged && !patternChanged;
    const materialFillColor = colorChanged || promoteEffective ? color : null;
    const authoredPatternId = patternChanged || promoteEffective ? patternId : null;
    applyLithologyInterval.disabled = true;
    setLithologyDefault.disabled = true;
    status.textContent =
      applyScope === "interval"
        ? `Applying appearance to ${appearance.intervalId}…`
        : `Setting ${appearance.mappedClassificationKey} default across all project borings…`;
    const result = await apis.studio.setLithologyAppearance({
      expectedWorkingRevision: studioProjection.workingRevision,
      boringLogIdentity: appearance.boringLogIdentity,
      intervalId: appearance.intervalId,
      applyScope,
      materialFillColor,
      patternId: authoredPatternId,
    });
    if (!result.accepted || result.workingRevision === undefined) {
      applyLithologyInterval.disabled = lifecycleState?.readOnly === true;
      setLithologyDefault.disabled = lifecycleState?.readOnly === true;
      status.textContent = `Lithology appearance rejected${result.code === undefined ? "." : `: ${result.code}`}`;
      return;
    }
    const affected = result.affectedBoringLogCount ?? 1;
    const refreshed = await refreshStudioProjection(
      result.workingRevision,
      applyScope === "interval"
        ? `${appearance.intervalId} appearance applied at revision ${result.workingRevision}.`
        : `${appearance.mappedClassificationKey} default applied to ${affected} boring log${affected === 1 ? "" : "s"} at revision ${result.workingRevision}.`,
    );
    if (refreshed) await refreshLifecycleStateSilently();
    lithologyFillColor.focus();
  }

  async function applySelectedProperty(): Promise<void> {
    const apis = studioApis();
    const editable = selectedSemanticId === null ? null : editableFor(selectedSemanticId);
    if (apis === null || editable === null || studioProjection === null) return;
    const replacement = replacementContent(editable, propertyContent.value);
    if (replacement === null) {
      status.textContent =
        editable.property === "sample-recovery"
          ? "Recovery must be a number from 0 through 100."
          : editable.property === "description-column-width-mpt"
            ? "Column width must be an integer from 100000 through 230000 mpt."
            : editable.property === "lithology-pattern-style"
              ? "Choose silt-horizontal-dash, sand-dot-ring, or gravel-dot-ring."
              : "Enter a valid property value.";
      propertyContent.focus();
      return;
    }
    if (editable.property === "description-column-width-mpt") {
      applyProperty.disabled = true;
      const applied = await applySelectedColumnWidthMpt(Number(propertyContent.value), true);
      applyProperty.disabled = false;
      if (applied) await refreshLifecycleStateSilently();
      propertyContent.focus();
      return;
    }
    applyProperty.disabled = true;
    status.textContent = `Applying ${humanize(editable.property)}…`;
    const result = await apis.document.setDisplayValue({
      expectedWorkingRevision: studioProjection.workingRevision,
      localOverrideIdentity: `urn:rsrender:bld-026:local-override:${editable.sourceFieldIdentity}`,
      targetSourceFieldIdentity: editable.sourceFieldIdentity,
      expectedSourceValueDigest: editable.sourceBaselineValueDigest,
      expectedSourceValueType: editable.sourceOriginal.valueType,
      expectedSourceUnit: editable.sourceOriginal.unit,
      replacementContent: replacement,
      replacementUnit: editable.unit,
      reason: "Edited in RSrender Boring Log Studio",
    });
    if (!result.accepted || result.workingRevision === undefined) {
      applyProperty.disabled = false;
      status.textContent = `Property edit rejected${result.code === undefined ? "." : `: ${result.code}`}`;
      return;
    }
    const refreshed = await refreshStudioProjection(
      result.workingRevision,
      `${humanize(editable.property)} applied at revision ${result.workingRevision}.`,
    );
    if (refreshed) await refreshLifecycleStateSilently();
    propertyContent.focus();
  }

  async function applySelectedTextStyle(
    origin: "properties" | "canvas" = "properties",
  ): Promise<boolean> {
    const apis = studioApis();
    const node =
      selectedSceneNodeId === null
        ? undefined
        : page.nodes.find(
            (candidate): candidate is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
              candidate.id === selectedSceneNodeId && candidate.kind === "text",
          );
    const style =
      node === undefined
        ? undefined
        : scene.resources.textStyles.find(({ id }) => id === node.styleId);
    if (apis === null || studioProjection === null || node === undefined || style === undefined) {
      status.textContent = "Select one exact text occurrence before applying text properties.";
      return false;
    }
    const applyScope = textStyleScope.value as
      "occurrence" | "all-selected" | "column-default" | "named-style" | "template-default";
    const templatePropertyOrder: readonly TextTemplateProperty[] = [
      "fontFamilyId",
      "fontSizeMpt",
      "fontWeight",
      "lineHeightMpt",
      "letterSpacingMpt",
      "wordSpacingMpt",
      "paragraphSpacingMpt",
      "color",
      "textDecoration",
    ];
    const propertyMask = templatePropertyOrder.filter((property) =>
      templateTextPropertyMask.has(property),
    );
    const selectedTargetNodes = [
      node,
      ...page.nodes.filter(
        (candidate): candidate is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
          candidate.kind === "text" &&
          candidate.id !== node.id &&
          selectedTextNodeIds.has(candidate.id),
      ),
    ];
    if (applyScope === "all-selected" && selectedTargetNodes.length < 2) {
      status.textContent =
        "Ctrl-click at least two exact text occurrences before applying to all selected.";
      textStyleScope.focus();
      return false;
    }
    const presentationState = studioProjection.textOccurrencePresentationStates.find(
      ({ occurrenceNodeId }) => occurrenceNodeId === node.id,
    );
    if (
      (applyScope === "named-style" ||
        applyScope === "column-default" ||
        applyScope === "template-default") &&
      presentationState?.typography === "occurrence"
    ) {
      status.textContent =
        "Reset this occurrence to inherited typography before changing its broader default.";
      textStyleScope.focus();
      return false;
    }
    if (applyScope === "template-default" && propertyMask.length === 0) {
      status.textContent =
        "Change at least one typography control before applying it to the embedded template.";
      textStyleScope.focus();
      return false;
    }
    const columnId = boringLogTextColumnSemanticId(node);
    if (applyScope === "column-default" && columnId === null) {
      status.textContent = "This text occurrence does not belong to a Log Column.";
      textStyleScope.focus();
      return false;
    }
    const fontSizeMpt = Math.round(Number(textFontSize.value) * 1_000);
    const fontWeight = Number(textFontWeight.value);
    const lineHeightMpt = Math.round(Number(textLineHeight.value) * 1_000);
    const letterSpacingMpt = Math.round(Number(textLetterSpacing.value) * 1_000);
    const wordSpacingMpt = Math.round(Number(textWordSpacing.value) * 1_000);
    const paragraphSpacingMpt = Math.round(Number(textParagraphSpacing.value) * 1_000);
    const minimumFontSizeMpt = Math.round(Number(textMinimumFontSize.value) * 1_000);
    const frameAnchor = textFrameAnchor.value as BoringLogTextFrameAnchor;
    const frame = frameFromAnchor(
      {
        xMpt: Math.round(Number(textFrameX.value) * 1_000),
        yMpt: Math.round(Number(textFrameY.value) * 1_000),
      },
      Math.round(Number(textFrameWidth.value) * 1_000),
      Math.round(Number(textFrameHeight.value) * 1_000),
      frameAnchor,
    );
    const paddingMpt = {
      topMpt: Math.round(Number(textPaddingTop.value) * 1_000),
      rightMpt: Math.round(Number(textPaddingRight.value) * 1_000),
      bottomMpt: Math.round(Number(textPaddingBottom.value) * 1_000),
      leftMpt: Math.round(Number(textPaddingLeft.value) * 1_000),
    };
    const rotationMilliDegrees = Math.round(Number(textRotation.value) * 1_000);
    const frameStrokeWidthMpt = Math.round(Number(textFrameStrokeWidth.value) * 1_000);
    const positionMode = textPositionMode.value as "depth-bound" | "free";
    if (
      !Number.isSafeInteger(fontSizeMpt) ||
      fontSizeMpt < 4_000 ||
      fontSizeMpt > 48_000 ||
      ![400, 700].includes(fontWeight) ||
      !Number.isSafeInteger(lineHeightMpt) ||
      lineHeightMpt < fontSizeMpt ||
      lineHeightMpt > 72_000 ||
      !Number.isSafeInteger(letterSpacingMpt) ||
      letterSpacingMpt < -2_000 ||
      letterSpacingMpt > 12_000 ||
      !Number.isSafeInteger(wordSpacingMpt) ||
      wordSpacingMpt < -2_000 ||
      wordSpacingMpt > 24_000 ||
      !Number.isSafeInteger(paragraphSpacingMpt) ||
      paragraphSpacingMpt < 0 ||
      paragraphSpacingMpt > 72_000 ||
      !Number.isSafeInteger(minimumFontSizeMpt) ||
      minimumFontSizeMpt < 4_000 ||
      minimumFontSizeMpt > fontSizeMpt ||
      !/^#[0-9a-f]{6}$/iu.test(textColor.value) ||
      !Object.values(frame).every(Number.isSafeInteger) ||
      frame.xMpt < 0 ||
      frame.yMpt < 0 ||
      (positionMode === "depth-bound" && frame.yMpt !== node.frame.yMpt) ||
      frame.widthMpt < 1_000 ||
      frame.heightMpt < 1_000 ||
      frame.xMpt + frame.widthMpt > page.widthMpt ||
      frame.yMpt + frame.heightMpt > page.heightMpt ||
      !Object.values(paddingMpt).every(Number.isSafeInteger) ||
      Object.values(paddingMpt).some((value) => value < 0) ||
      paddingMpt.leftMpt + paddingMpt.rightMpt >= frame.widthMpt ||
      paddingMpt.topMpt + paddingMpt.bottomMpt >= frame.heightMpt ||
      !Number.isSafeInteger(rotationMilliDegrees) ||
      rotationMilliDegrees < -180_000 ||
      rotationMilliDegrees > 180_000 ||
      !Number.isSafeInteger(frameStrokeWidthMpt) ||
      frameStrokeWidthMpt < 0 ||
      frameStrokeWidthMpt > 12_000 ||
      !/^#[0-9a-f]{6}$/iu.test(textFrameFillColor.value) ||
      !/^#[0-9a-f]{6}$/iu.test(textFrameStrokeColor.value)
    ) {
      status.textContent =
        "Text properties require valid typography, positive in-page frame geometry, a bound Y unless explicitly detached, and padding smaller than the frame.";
      textFontSize.focus();
      return false;
    }
    applyTextStyle.disabled = true;
    status.textContent = `Applying text properties to ${node.id}…`;
    if (applyScope === "named-style") {
      status.textContent = `Applying typography to named style ${style.id}...`;
    } else if (applyScope === "template-default") {
      const summary = studioProjection.textTemplateScopeSummary;
      status.textContent = `Applying ${propertyMask.length} changed typography ${propertyMask.length === 1 ? "property" : "properties"} to ${summary.authoredStyleCount} embedded-template styles; preserving ${summary.excludedOverrideStyleCount} override styles...`;
    } else if (applyScope === "column-default") {
      status.textContent = `Applying typography to ${columnId}...`;
    } else if (applyScope === "all-selected") {
      status.textContent = `Applying typography to ${selectedTargetNodes.length} selected occurrences...`;
    }
    const targets = (applyScope === "all-selected" ? selectedTargetNodes : [node]).map(
      (target) => ({
        occurrenceNodeId: target.id,
        semanticId: target.semanticId,
        baseStyleId: target.styleId,
      }),
    );
    const raw = await apis.studio.setTextOccurrenceStyle({
      expectedWorkingRevision: studioProjection.workingRevision,
      applyScope,
      ...(applyScope === "template-default" ? { propertyMask } : {}),
      occurrenceNodeId: node.id,
      semanticId: node.semanticId,
      baseStyleId: node.styleId,
      targets,
      fontFamilyId: textFontFamily.value,
      fontSizeMpt,
      fontWeight,
      lineHeightMpt,
      letterSpacingMpt,
      wordSpacingMpt,
      paragraphSpacingMpt,
      color: textColor.value,
      textDecoration: textDecoration.value as
        "none" | "underline" | "line-through" | "underline line-through",
      layout: {
        frame,
        frameAnchor,
        paddingMpt,
        horizontalAlignment: textHorizontalAlignment.value as "start" | "center" | "end",
        verticalAlignment: textVerticalAlignment.value as "top" | "middle" | "bottom",
        wrapPolicy: textWrapPolicy.value as "word-v1" | "no-wrap",
        overflowPolicy: textOverflowPolicy.value as "clip-with-diagnostic" | "shrink-to-minimum",
        ...(textOverflowPolicy.value === "shrink-to-minimum" ? { minimumFontSizeMpt } : {}),
        frameFillColor: textFrameFillEnabled.checked ? textFrameFillColor.value : null,
        frameStrokeColor: textFrameStrokeEnabled.checked ? textFrameStrokeColor.value : null,
        frameStrokeWidthMpt,
        rotationMilliDegrees,
        positionMode,
      },
      locked: textLocked.checked,
    });
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      applyTextStyle.disabled = false;
      status.textContent = "Text property command returned an invalid result.";
      return false;
    }
    const result = raw as Record<string, unknown>;
    if (
      result["accepted"] !== true ||
      !Number.isSafeInteger(result["workingRevision"]) ||
      (applyScope === "template-default" &&
        (!Number.isSafeInteger(result["affectedStyleCount"]) ||
          !Number.isSafeInteger(result["excludedStyleCount"])))
    ) {
      applyTextStyle.disabled = false;
      status.textContent = `Text property edit rejected${typeof result["code"] === "string" ? `: ${result["code"]}` : "."}`;
      return false;
    }
    const refreshed = await refreshStudioProjection(
      result["workingRevision"] as number,
      applyScope === "template-default"
        ? `Changed typography applied to ${String(result["affectedStyleCount"])} embedded-template styles at revision ${String(result["workingRevision"])}; ${String(result["excludedStyleCount"])} occurrence/column override styles were preserved.`
        : applyScope === "named-style"
          ? `Named style ${style.id} typography updated at revision ${String(result["workingRevision"])}; occurrence geometry was unchanged.`
          : applyScope === "column-default"
            ? `${columnId} typography default updated at revision ${String(result["workingRevision"])}; occurrence overrides and geometry were unchanged.`
            : applyScope === "all-selected"
              ? `Typography applied to ${targets.length} selected occurrences at revision ${String(result["workingRevision"])}; their geometry was unchanged.`
              : origin === "canvas"
                ? `Canvas geometry committed for ${node.id} at revision ${String(result["workingRevision"])}; text was reflowed by the shared layout authority.`
                : `Text properties applied to ${node.id} at revision ${String(result["workingRevision"])}.`,
    );
    if (refreshed) await refreshLifecycleStateSilently();
    applyTextStyle.disabled = false;
    if (origin === "properties") textFontSize.focus();
    return true;
  }

  async function detachSelectedTextAsAnnotation(): Promise<void> {
    if (
      selectedSceneNodeId === null ||
      studioProjection === null ||
      lifecycleState?.readOnly === true ||
      textPositionMode.value === "free"
    ) {
      status.textContent = "Select one editable depth-bound text occurrence before detaching.";
      return;
    }
    detachTextAnnotation.disabled = true;
    textPositionMode.value = "free";
    textFrameY.readOnly = false;
    status.textContent = `Detaching ${selectedSceneNodeId} as a free annotationâ€¦`;
    if (!(await applySelectedTextStyle())) {
      textPositionMode.value = "depth-bound";
      textFrameY.readOnly = true;
      detachTextAnnotation.disabled = false;
    }
  }

  async function resetSelectedTextPresentation(): Promise<void> {
    const apis = studioApis();
    const node =
      selectedSceneNodeId === null
        ? undefined
        : page.nodes.find(
            (candidate): candidate is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
              candidate.id === selectedSceneNodeId && candidate.kind === "text",
          );
    const state = studioProjection?.textOccurrencePresentationStates.find(
      ({ occurrenceNodeId }) => occurrenceNodeId === node?.id,
    );
    if (
      apis === null ||
      studioProjection === null ||
      node === undefined ||
      state === undefined ||
      (state.typography === "inherited" && state.layout === "inherited")
    ) {
      status.textContent = "The selected text occurrence already uses inherited presentation.";
      return;
    }
    resetTextPresentation.disabled = true;
    status.textContent = `Resetting ${node.id} to inherited presentation…`;
    const raw = await apis.studio.resetTextOccurrencePresentation({
      expectedWorkingRevision: studioProjection.workingRevision,
      occurrenceNodeId: node.id,
      semanticId: node.semanticId,
    });
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      resetTextPresentation.disabled = false;
      status.textContent = "Reset to inherited returned an invalid result.";
      return;
    }
    const result = raw as Record<string, unknown>;
    if (result["accepted"] !== true || !Number.isSafeInteger(result["workingRevision"])) {
      resetTextPresentation.disabled = false;
      status.textContent = `Reset to inherited rejected${typeof result["code"] === "string" ? `: ${result["code"]}` : "."}`;
      return;
    }
    const refreshed = await refreshStudioProjection(
      result["workingRevision"] as number,
      `Presentation reset to inherited for ${node.id} at revision ${String(result["workingRevision"])}.`,
    );
    if (refreshed) await refreshLifecycleStateSilently();
  }

  async function navigateHistory(operation: "undo" | "redo"): Promise<void> {
    const apis = studioApis();
    if (apis === null || studioProjection === null) return;
    if (pendingKeyboardNudge !== undefined) await flushKeyboardNudge();
    if (studioProjection === null) return;
    const result = await apis.document[operation]({
      expectedWorkingRevision: studioProjection.workingRevision,
    });
    if (!result.accepted || result.workingRevision === undefined) {
      status.textContent = `${humanize(operation)} rejected${result.code === undefined ? "." : `: ${result.code}`}`;
      return;
    }
    const refreshed = await refreshStudioProjection(
      result.workingRevision,
      `${humanize(operation)} completed at revision ${result.workingRevision}.`,
    );
    if (refreshed) await refreshLifecycleStateSilently();
    (operation === "undo" ? undoButton : redoButton).focus();
  }

  async function exportPdf(): Promise<void> {
    if (pendingKeyboardNudge !== undefined) await flushKeyboardNudge();
    const api = publicationApi();
    if (api === null || studioProjection === null || exportPdfButton.disabled) return;
    const orderedBoringLogIdentities = orderedPublicationSelection();
    if (orderedBoringLogIdentities.length === 0) {
      status.textContent = "Select at least one Boring Log before exporting a PDF package.";
      renderPublicationInventory();
      return;
    }
    exportPdfButton.disabled = true;
    exportPdfButton.removeAttribute("data-result");
    status.textContent = `Freezing ${orderedBoringLogIdentities.length} structured Boring Log scene${orderedBoringLogIdentities.length === 1 ? "" : "s"} for one PDF package…`;
    const result = await api.exportPdf({
      expectedWorkingRevision: studioProjection.workingRevision,
      orderedBoringLogIdentities,
    });
    if (!result.accepted) {
      status.textContent =
        result.code === "EXPORT_CANCELLED"
          ? "PDF export cancelled; the document is unchanged."
          : `PDF export failed: ${result.code}`;
      exportPdfButton.dataset["result"] = result.code;
      exportPdfButton.disabled = false;
      exportPdfButton.focus();
      return;
    }
    exportPdfButton.dataset["result"] = result.result.code;
    exportPdfButton.dataset["destinationPath"] = result.result.destinationPath;
    exportPdfButton.dataset["pdfDigest"] = result.result.pdfDigest;
    exportPdfButton.dataset["sceneDigest"] = result.result.aggregateSceneDigest;
    exportPdfButton.dataset["projectionDigest"] = result.result.aggregateProjectionDigest;
    exportPdfButton.dataset["packageCandidateDigest"] = result.result.packageCandidateDigest;
    exportPdfButton.dataset["selectionDigest"] = result.result.selectionDigest;
    exportPdfButton.dataset["orderedBoringLogIdentities"] = JSON.stringify(
      result.result.orderedBoringLogIdentities,
    );
    exportPdfButton.dataset["pdfBytes"] = String(result.result.pdfBytes);
    exportPdfButton.dataset["pageCount"] = String(result.result.pageCount);
    publicationSelectionSummary.value = `${result.result.orderedBoringLogIdentities.length} logs · ${result.result.pageCount} PDF pages`;
    publicationSelectionSummary.textContent = publicationSelectionSummary.value;
    status.textContent = `PDF exported and reopened successfully: ${result.result.destinationPath} · one package, ${result.result.orderedBoringLogIdentities.length} Boring Log${result.result.orderedBoringLogIdentities.length === 1 ? "" : "s"}, ${result.result.pageCount} page${result.result.pageCount === 1 ? "" : "s"}`;
    exportPdfButton.disabled = false;
    exportPdfButton.focus();
  }

  function renderDiagnostics(): void {
    diagnosticsList.replaceChildren();
    diagnosticBadge.textContent = String(scene.diagnostics.length);
    if (scene.diagnostics.length === 0) {
      const item = document.createElement("li");
      item.className = "diagnostic-ok";
      item.textContent = "No layout diagnostics.";
      diagnosticsList.append(item);
      return;
    }
    for (const diagnostic of scene.diagnostics) {
      const item = document.createElement("li");
      item.textContent = `${diagnostic.severity.toUpperCase()} · ${diagnostic.code} · ${diagnostic.message}`;
      diagnosticsList.append(item);
    }
  }

  function applyPaneWidths(
    requestedContentsWidth: number,
    requestedPropertiesWidth: number,
    resizeTarget: StudioPaneResizeTarget,
  ): void {
    const resolved = resolveStudioPaneWidths({
      workspaceWidth: workspace.clientWidth,
      requestedContentsWidth,
      requestedPropertiesWidth,
      resizeTarget,
    });
    contentsPaneWidth = resolved.contentsWidth;
    propertiesPaneWidth = resolved.propertiesWidth;
    workspace.style.setProperty("--contents-pane-width", `${resolved.contentsWidth}px`);
    workspace.style.setProperty("--properties-pane-width", `${resolved.propertiesWidth}px`);
    contentsSplitter.setAttribute("aria-valuenow", String(resolved.contentsWidth));
    propertiesSplitter.setAttribute("aria-valuenow", String(resolved.propertiesWidth));
    canvasStage.dataset["viewportWidth"] = String(resolved.canvasWidth);
    if (zoomMode === "fit") requestAnimationFrame(fitPage);
  }

  function beginPaneResize(
    event: PointerEvent,
    resizeTarget: Exclude<StudioPaneResizeTarget, "viewport">,
  ): void {
    if (event.button !== 0 || paneResizeGesture !== undefined) return;
    const splitter = resizeTarget === "contents" ? contentsSplitter : propertiesSplitter;
    paneResizeGesture = Object.freeze({
      pointerId: event.pointerId,
      resizeTarget,
      startClientX: event.clientX,
      contentsWidth: contentsPane.getBoundingClientRect().width,
      propertiesWidth: propertiesPane.getBoundingClientRect().width,
    });
    splitter.setPointerCapture(event.pointerId);
    splitter.classList.add("is-resizing");
    workspace.classList.add("is-resizing-panes");
    event.preventDefault();
  }

  function updatePaneResize(event: PointerEvent): void {
    const gesture = paneResizeGesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    const delta = event.clientX - gesture.startClientX;
    applyPaneWidths(
      gesture.resizeTarget === "contents" ? gesture.contentsWidth + delta : gesture.contentsWidth,
      gesture.resizeTarget === "properties"
        ? gesture.propertiesWidth - delta
        : gesture.propertiesWidth,
      gesture.resizeTarget,
    );
    event.preventDefault();
  }

  function finishPaneResize(event: PointerEvent): void {
    const gesture = paneResizeGesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    const splitter = gesture.resizeTarget === "contents" ? contentsSplitter : propertiesSplitter;
    if (splitter.hasPointerCapture(event.pointerId))
      splitter.releasePointerCapture(event.pointerId);
    splitter.classList.remove("is-resizing");
    workspace.classList.remove("is-resizing-panes");
    paneResizeGesture = undefined;
    status.textContent = `Studio panes resized: Contents ${contentsPaneWidth}px, Properties ${propertiesPaneWidth}px.`;
  }

  function resizePaneFromKeyboard(
    event: KeyboardEvent,
    resizeTarget: Exclude<StudioPaneResizeTarget, "viewport">,
  ): void {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const step = event.shiftKey ? 40 : 10;
    applyPaneWidths(
      resizeTarget === "contents" ? contentsPaneWidth + direction * step : contentsPaneWidth,
      resizeTarget === "properties" ? propertiesPaneWidth - direction * step : propertiesPaneWidth,
      resizeTarget,
    );
    event.preventDefault();
    status.textContent = `Studio panes resized: Contents ${contentsPaneWidth}px, Properties ${propertiesPaneWidth}px.`;
  }

  function applyZoom(value: number, mode: "fit" | "manual" = "manual"): void {
    const bounded = Math.min(160, Math.max(40, Math.round(value / 10) * 10));
    zoomMode = mode;
    zoom.value = String(bounded);
    zoomValue.value = `${bounded}%`;
    zoomValue.textContent = `${bounded}%`;
    canvasScale.value = `${bounded}%`;
    canvasScale.textContent = `${bounded}%`;
    pageShadow.className = `page-shadow zoom-${bounded}`;
    pageShadow.dataset["zoomMode"] = mode;
  }

  function applyTouchpadPinchZoom(event: WheelEvent): void {
    if (!event.ctrlKey) {
      if (event.shiftKey && event.deltaX === 0 && event.deltaY !== 0) {
        canvasStage.scrollLeft += event.deltaY;
        event.preventDefault();
      }
      return;
    }
    if (event.deltaY === 0) return;
    event.preventDefault();
    pinchZoomAccumulator -= event.deltaY;
    if (Math.abs(pinchZoomAccumulator) < 12) return;
    const direction = pinchZoomAccumulator > 0 ? 1 : -1;
    pinchZoomAccumulator = 0;
    const current = Number(zoom.value);
    const next = Math.min(160, Math.max(40, current + direction * 10));
    if (next === current) return;
    const stageBounds = canvasStage.getBoundingClientRect();
    const localX = event.clientX - stageBounds.left;
    const localY = event.clientY - stageBounds.top;
    const focusX = (canvasStage.scrollLeft + localX) / Math.max(1, canvasStage.scrollWidth);
    const focusY = (canvasStage.scrollTop + localY) / Math.max(1, canvasStage.scrollHeight);
    applyZoom(next);
    requestAnimationFrame(() => {
      canvasStage.scrollLeft = focusX * canvasStage.scrollWidth - localX;
      canvasStage.scrollTop = focusY * canvasStage.scrollHeight - localY;
    });
    status.textContent = `Canvas zoomed to ${next}% with precision-touchpad pinch.`;
  }

  function fitPage(): void {
    const horizontalPadding = 56;
    const verticalPadding = 56;
    const pageWidth = pageShadow.offsetWidth;
    const pageHeight = pageShadow.offsetHeight;
    if (pageWidth <= 0 || pageHeight <= 0) {
      applyZoom(100, "fit");
      return;
    }
    const widthScale = (canvasStage.clientWidth - horizontalPadding) / pageWidth;
    const heightScale = (canvasStage.clientHeight - verticalPadding) / pageHeight;
    const fitPercent = Math.floor((Math.min(widthScale, heightScale) * 100) / 10) * 10;
    applyZoom(fitPercent, "fit");
    element<HTMLButtonElement>("fit-page").dataset["computedZoom"] = zoom.value;
    status.textContent = `Page fitted to the current Canvas at ${zoom.value}%.`;
  }

  function beginDirectManipulation(event: PointerEvent): void {
    if (
      interactionMode !== "select" ||
      event.button !== 0 ||
      directManipulationGesture !== undefined
    )
      return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest<SVGElement>("[data-direct-manipulation-handle]");
    const requestedHandle = control?.dataset["directManipulationHandle"] as
      BoringLogDirectManipulationHandle | undefined;
    if (control === null || requestedHandle === undefined || selectedSceneNodeId === null) return;
    const node = page.nodes.find(
      (candidate): candidate is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
        candidate.id === selectedSceneNodeId && candidate.kind === "text",
    );
    if (node === undefined) return;
    if (lifecycleState?.readOnly === true) {
      status.textContent = "This Log Project is read-only; canvas transforms are unavailable.";
      return;
    }
    if (node.presentation?.locked === true) {
      status.textContent =
        "This text frame is locked. Clear Lock canvas transforms in Properties first.";
      return;
    }
    const point = pointerPagePoint(event);
    if (point === null) {
      status.textContent = "Canvas coordinates are unavailable for this gesture.";
      return;
    }
    const handle =
      requestedHandle === "move"
        ? requestedHandle
        : nearestBoringLogDirectManipulationResizeHandle(node.frame, point);
    if (handle === null) return;
    const padding = node.presentation?.paddingMpt ?? {
      topMpt: 0,
      rightMpt: 0,
      bottomMpt: 0,
      leftMpt: 0,
    };
    const presentationFrame = pageHost.querySelector<SVGRectElement>(
      `#${CSS.escape(`${node.id}:presentation-frame`)}`,
    );
    clearLiveReflowPreview();
    directManipulationGesture = {
      pointerId: event.pointerId,
      nodeId: node.id,
      semanticId: node.semanticId,
      handle,
      startPoint: point,
      originalFrame: node.frame,
      previewFrame: node.frame,
      positionMode: node.presentation?.positionMode ?? "depth-bound",
      minimumWidthMpt: Math.max(1_000, padding.leftMpt + padding.rightMpt + 1_000),
      minimumHeightMpt: Math.max(1_000, padding.topMpt + padding.bottomMpt + 1_000),
      snapTargets: currentSnapTargets(),
      baselineOffsetsYMpt: Object.freeze(
        textBaselineYMpt(node).map((baselineMpt) => baselineMpt - node.frame.yMpt),
      ),
      originalTransform:
        pageHost
          .querySelector<SVGTextElement>(`#${CSS.escape(node.id)}`)
          ?.getAttribute("transform") ?? null,
      originalFrameTransform: presentationFrame?.getAttribute("transform") ?? null,
    };
    pageHost.setPointerCapture(event.pointerId);
    canvasStage.classList.add("is-direct-manipulating");
    canvasStage.dataset["directManipulationHandle"] = handle;
    event.preventDefault();
    event.stopPropagation();
    status.textContent = `${humanize(handle)} gesture active for ${node.id}. Geometry is integer mpt; release commits one Undo/Redo step and Esc cancels.`;
  }

  function updateDirectManipulation(event: PointerEvent): void {
    const gesture = directManipulationGesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    const point = pointerPagePoint(event);
    if (point === null) return;
    const resolved = resolveBoringLogDirectManipulationFrame({
      original: gesture.originalFrame,
      handle: gesture.handle,
      deltaXMpt: point.xMpt - gesture.startPoint.xMpt,
      deltaYMpt: point.yMpt - gesture.startPoint.yMpt,
      pageWidthMpt: page.widthMpt,
      pageHeightMpt: page.heightMpt,
      minimumWidthMpt: gesture.minimumWidthMpt,
      minimumHeightMpt: gesture.minimumHeightMpt,
      positionMode: gesture.positionMode,
    });
    if (!resolved.accepted) return;
    const svg = pageHost.querySelector<SVGSVGElement>("svg");
    const transform = svg?.getScreenCTM();
    const thresholdMpt =
      transform === null || transform === undefined
        ? 6_000
        : Math.max(1, Math.round(6 / Math.max(Math.abs(transform.a), Math.abs(transform.d))));
    const snapped = snapBoringLogDirectManipulationFrame({
      frame: resolved.frame,
      handle: gesture.handle,
      xTargets: smartSnapEnabled || gridSnapEnabled ? gesture.snapTargets.x : [],
      yTargets:
        (smartSnapEnabled || gridSnapEnabled) &&
        (gesture.positionMode !== "depth-bound" || gesture.handle !== "move")
          ? gesture.snapTargets.y
          : [],
      baselineOffsetsYMpt: gesture.baselineOffsetsYMpt,
      thresholdMpt,
      pageWidthMpt: page.widthMpt,
      pageHeightMpt: page.heightMpt,
      bypass: event.altKey,
    });
    previewDirectManipulationFrame(snapped.frame, snapped);
    if (gesture.handle !== "move") scheduleLiveReflowPreview(snapped.frame);
    event.preventDefault();
  }

  function releaseDirectManipulationCapture(pointerId: number): void {
    if (pageHost.hasPointerCapture(pointerId)) pageHost.releasePointerCapture(pointerId);
    canvasStage.classList.remove("is-direct-manipulating");
    Reflect.deleteProperty(canvasStage.dataset, "directManipulationHandle");
  }

  function cancelDirectManipulation(): void {
    const gesture = directManipulationGesture;
    if (gesture === undefined) return;
    releaseDirectManipulationCapture(gesture.pointerId);
    directManipulationGesture = undefined;
    clearLiveReflowPreview();
    suppressCanvasClick = true;
    installSvg();
    syncTextFrameInputs(gesture.originalFrame);
    status.textContent = `Canvas gesture canceled for ${gesture.nodeId}; document history and scene authority were unchanged.`;
  }

  async function finishDirectManipulation(event: PointerEvent): Promise<void> {
    const gesture = directManipulationGesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    releaseDirectManipulationCapture(gesture.pointerId);
    await flushLiveReflowPreview();
    directManipulationGesture = undefined;
    clearLiveReflowPreview();
    suppressCanvasClick = true;
    event.preventDefault();
    event.stopPropagation();
    if (
      gesture.previewFrame.xMpt === gesture.originalFrame.xMpt &&
      gesture.previewFrame.yMpt === gesture.originalFrame.yMpt &&
      gesture.previewFrame.widthMpt === gesture.originalFrame.widthMpt &&
      gesture.previewFrame.heightMpt === gesture.originalFrame.heightMpt
    ) {
      installSvg();
      syncTextFrameInputs(gesture.originalFrame);
      status.textContent =
        "Canvas gesture ended without a geometry change; no history item was created.";
      return;
    }
    syncTextFrameInputs(gesture.previewFrame);
    textStyleScope.value = "occurrence";
    await applySelectedTextStyle("canvas");
  }

  pageHost.addEventListener("pointerdown", beginDirectManipulation);
  pageHost.addEventListener("pointermove", updateDirectManipulation);
  pageHost.addEventListener("pointerup", (event) => void finishDirectManipulation(event));
  pageHost.addEventListener("pointercancel", () => cancelDirectManipulation());
  pageHost.addEventListener("pointerdown", beginMarquee);
  pageHost.addEventListener("pointermove", updateMarquee);
  pageHost.addEventListener("pointerup", finishMarquee);
  pageHost.addEventListener("pointercancel", cancelMarquee);
  pageHost.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const boundary =
      target.closest<SVGElement>("[data-region-boundary]")?.dataset["regionBoundary"];
    if (boundary === "header-depth" || boundary === "depth-footer") {
      beginRegionBoundaryGesture(event, boundary);
    }
  });
  pageHost.addEventListener("pointermove", updateRegionBoundaryGesture);
  pageHost.addEventListener("pointerup", (event) => void finishRegionBoundaryGesture(event));
  pageHost.addEventListener("pointercancel", cancelRegionBoundaryGesture);
  pageHost.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const leftColumnId = target.closest<SVGElement>("[data-divider-after-column-id]")?.dataset[
      "dividerAfterColumnId"
    ];
    if (leftColumnId !== undefined) beginColumnDividerGesture(event, leftColumnId);
  });
  pageHost.addEventListener("pointermove", updateColumnDividerGesture);
  pageHost.addEventListener("pointerup", (event) => void finishColumnDividerGesture(event));
  pageHost.addEventListener("pointercancel", cancelColumnDividerGesture);
  pageHost.addEventListener("keydown", (event) => {
    const regionControl =
      event.target instanceof Element
        ? event.target.closest<SVGElement>("[data-region-boundary]")
        : null;
    const regionBoundary = regionControl?.dataset["regionBoundary"];
    if (
      (regionBoundary === "header-depth" || regionBoundary === "depth-footer") &&
      regionControl !== null &&
      (event.key === "ArrowUp" || event.key === "ArrowDown")
    ) {
      const stepMpt = event.shiftKey ? 10_000 : 1_000;
      const requested =
        Number(regionControl.getAttribute("aria-valuenow")) +
        (event.key === "ArrowUp" ? -stepMpt : stepMpt);
      event.preventDefault();
      void commitRegionBoundary(regionBoundary, requested);
      return;
    }
    const divider =
      event.target instanceof Element
        ? event.target.closest<SVGElement>("[data-divider-after-column-id]")
        : null;
    const leftColumnId = divider?.dataset["dividerAfterColumnId"];
    if (
      leftColumnId !== undefined &&
      divider !== null &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
      studioProjection !== null
    ) {
      const stepMpt = event.shiftKey ? 10_000 : 1_000;
      const requested =
        Number(divider.getAttribute("aria-valuenow")) +
        (event.key === "ArrowLeft" ? -stepMpt : stepMpt);
      event.preventDefault();
      void commitColumnDivider(
        leftColumnId,
        requested,
        columnResizeMode.value === "push-following-columns"
          ? "push-following-columns"
          : "adjacent-pair",
      );
      return;
    }
    if (!event.key.startsWith("Arrow") || directManipulationGesture !== undefined) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest<SVGElement>("[data-direct-manipulation-handle]");
    const handle = control?.dataset["directManipulationHandle"] as
      BoringLogDirectManipulationHandle | undefined;
    if (handle === undefined || selectedSceneNodeId === null) return;
    const node = page.nodes.find(
      (candidate): candidate is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
        candidate.id === selectedSceneNodeId && candidate.kind === "text",
    );
    if (
      node === undefined ||
      node.presentation?.locked === true ||
      lifecycleState?.readOnly === true
    )
      return;
    const step = event.shiftKey ? 10_000 : 1_000;
    const deltaXMpt = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const deltaYMpt = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    const padding = node.presentation?.paddingMpt ?? {
      topMpt: 0,
      rightMpt: 0,
      bottomMpt: 0,
      leftMpt: 0,
    };
    const resolved = resolveBoringLogDirectManipulationFrame({
      original: node.frame,
      handle,
      deltaXMpt,
      deltaYMpt,
      pageWidthMpt: page.widthMpt,
      pageHeightMpt: page.heightMpt,
      minimumWidthMpt: Math.max(1_000, padding.leftMpt + padding.rightMpt + 1_000),
      minimumHeightMpt: Math.max(1_000, padding.topMpt + padding.bottomMpt + 1_000),
      positionMode: node.presentation?.positionMode ?? "depth-bound",
    });
    if (!resolved.accepted || !resolved.changed) return;
    event.preventDefault();
    syncTextFrameInputs(resolved.frame);
    textStyleScope.value = "occurrence";
    void applySelectedTextStyle("canvas");
  });
  pageHost.addEventListener("click", (event) => {
    if (suppressCanvasClick) {
      suppressCanvasClick = false;
      const target = event.target;
      if (target instanceof Element && target.closest("#direct-manipulation-overlay") !== null) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    hideCanvasContextMenu();
    if (interactionMode !== "select") return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const occurrence = target.closest<SVGElement>("[data-semantic-id][data-node-id]");
    const semantic = occurrence?.dataset["semanticId"];
    if (semantic !== undefined) {
      select(
        semantic,
        occurrence?.dataset["nodeId"] ?? null,
        event.shiftKey || event.ctrlKey || event.metaKey,
      );
    }
  });
  pageHost.addEventListener("contextmenu", (event) => {
    if (interactionMode !== "select") return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const occurrence = target.closest<SVGElement>("[data-semantic-id][data-node-id]");
    const semantic = occurrence?.dataset["semanticId"];
    const nodeId = occurrence?.dataset["nodeId"];
    if (semantic === undefined || nodeId === undefined) return;
    event.preventDefault();
    if (!selectedTextNodeIds.has(nodeId)) select(semantic, nodeId);
    openCanvasContextMenu(event.clientX, event.clientY);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!canvasContextMenu.hidden && !canvasContextMenu.contains(event.target as Node)) {
      hideCanvasContextMenu();
    }
  });
  horizontalRuler.addEventListener("pointerdown", (event) =>
    beginPageGuideGesture(event, "vertical", null),
  );
  verticalRuler.addEventListener("pointerdown", (event) =>
    beginPageGuideGesture(event, "horizontal", null),
  );
  horizontalRuler.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      addPageGuide("vertical");
    }
  });
  verticalRuler.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      addPageGuide("horizontal");
    }
  });
  pageGuidesHost.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest<SVGElement>(".page-guide[data-guide-id]");
    const guide = studioProjection?.guides.find(({ id }) => id === control?.dataset["guideId"]);
    if (guide !== undefined) beginPageGuideGesture(event, guide.orientation, guide);
  });
  pageGuidesHost.addEventListener("dblclick", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const guideId = target.closest<SVGElement>(".page-guide[data-guide-id]")?.dataset["guideId"];
    if (guideId === undefined) return;
    event.preventDefault();
    void mutatePageGuide({ kind: "delete", guideId });
  });
  pageGuidesHost.addEventListener("contextmenu", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const guideId = target.closest<SVGElement>(".page-guide[data-guide-id]")?.dataset["guideId"];
    const guide = studioProjection?.guides.find(({ id }) => id === guideId);
    if (guide === undefined) return;
    event.preventDefault();
    void mutatePageGuide({ kind: "set-locked", guideId: guide.id, locked: !guide.locked });
  });
  pageShadow.addEventListener("pointermove", updatePageGuideGesture);
  pageShadow.addEventListener("pointerup", (event) => void finishPageGuideGesture(event));
  pageShadow.addEventListener("pointercancel", cancelPageGuideGesture);
  canvasStage.addEventListener("pointerdown", (event) => {
    if (interactionMode !== "pan" || event.button !== 0) return;
    panGesture = Object.freeze({
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: canvasStage.scrollLeft,
      scrollTop: canvasStage.scrollTop,
    });
    canvasStage.setPointerCapture(event.pointerId);
    canvasStage.classList.add("is-panning");
    event.preventDefault();
  });
  canvasStage.addEventListener("pointermove", (event) => {
    if (panGesture?.pointerId !== event.pointerId) return;
    canvasStage.scrollLeft = panGesture.scrollLeft - (event.clientX - panGesture.clientX);
    canvasStage.scrollTop = panGesture.scrollTop - (event.clientY - panGesture.clientY);
  });
  const finishPan = (event: PointerEvent): void => {
    if (panGesture?.pointerId !== event.pointerId) return;
    panGesture = undefined;
    canvasStage.classList.remove("is-panning");
    if (canvasStage.hasPointerCapture(event.pointerId)) {
      canvasStage.releasePointerCapture(event.pointerId);
    }
  };
  canvasStage.addEventListener("pointerup", finishPan);
  canvasStage.addEventListener("pointercancel", finishPan);
  canvasStage.addEventListener("wheel", applyTouchpadPinchZoom, { passive: false });
  canvasStage.addEventListener("scroll", hideCanvasContextMenu, { passive: true });
  ribbon.addEventListener(
    "wheel",
    (event) => {
      if (
        event.ctrlKey ||
        event.deltaX !== 0 ||
        event.deltaY === 0 ||
        ribbon.scrollWidth <= ribbon.clientWidth
      )
        return;
      ribbon.scrollLeft += event.deltaY;
      event.preventDefault();
    },
    { passive: false },
  );
  const installPaneSplitter = (
    splitter: HTMLElement,
    resizeTarget: Exclude<StudioPaneResizeTarget, "viewport">,
  ): void => {
    splitter.addEventListener("pointerdown", (event) => beginPaneResize(event, resizeTarget));
    splitter.addEventListener("pointermove", updatePaneResize);
    splitter.addEventListener("pointerup", finishPaneResize);
    splitter.addEventListener("pointercancel", finishPaneResize);
    splitter.addEventListener("keydown", (event) => resizePaneFromKeyboard(event, resizeTarget));
    splitter.addEventListener("dblclick", () => {
      applyPaneWidths(
        resizeTarget === "contents" ? studioPaneLimits.contents.default : contentsPaneWidth,
        resizeTarget === "properties" ? studioPaneLimits.properties.default : propertiesPaneWidth,
        resizeTarget,
      );
      status.textContent = `${resizeTarget === "contents" ? "Contents" : "Properties"} pane reset to its default width.`;
    });
  };
  installPaneSplitter(contentsSplitter, "contents");
  installPaneSplitter(propertiesSplitter, "properties");
  filter.addEventListener("input", renderTree);
  zoom.addEventListener("input", () => applyZoom(Number(zoom.value)));

  const showDiagnostics = (): void => {
    showPropertyPanel("diagnostics");
    status.textContent = `${scene.diagnostics.length} current scene diagnostic${scene.diagnostics.length === 1 ? "" : "s"} shown.`;
  };
  const chooseBoringFromSelector = async (): Promise<void> => {
    const current = lifecycleState;
    if (current === null) return;
    const target = current.boringLogs.find(
      (boring) => `${boring.ordinal}. ${boring.displayName}` === boringSelector.value.trim(),
    );
    if (target === undefined) {
      status.textContent = "Choose a Boring Log from the project list.";
      return;
    }
    while (lifecycleState !== null && lifecycleState.activeOrdinal !== target.ordinal) {
      await invokeLifecycle(
        lifecycleState.activeOrdinal < target.ordinal ? "next-boring" : "previous-boring",
      );
    }
  };
  boringSelector.addEventListener("change", () => void chooseBoringFromSelector());
  textFrameAnchor.addEventListener("change", () => {
    const widthMpt = Math.round(Number(textFrameWidth.value) * 1_000);
    const heightMpt = Math.round(Number(textFrameHeight.value) * 1_000);
    const point = {
      xMpt: Math.round(Number(textFrameX.value) * 1_000),
      yMpt: Math.round(Number(textFrameY.value) * 1_000),
    };
    const frame = frameFromAnchor(point, widthMpt, heightMpt, currentTextFrameAnchor);
    currentTextFrameAnchor = textFrameAnchor.value as BoringLogTextFrameAnchor;
    const nextPoint = frameAnchorPoint(frame, currentTextFrameAnchor);
    textFrameX.value = String(nextPoint.xMpt / 1_000);
    textFrameY.value = String(nextPoint.yMpt / 1_000);
    status.textContent = `Frame anchor changed to ${humanize(currentTextFrameAnchor)}; frame bounds are unchanged until Apply.`;
  });
  const commandRegistry: Readonly<Record<string, () => void>> = Object.freeze({
    "ribbon-tab-home": () => activateRibbonTab("home"),
    "ribbon-tab-layout": () => activateRibbonTab("layout"),
    "ribbon-tab-data": () => activateRibbonTab("data"),
    "ribbon-tab-review": () => activateRibbonTab("review"),
    "ribbon-tab-publish": () => activateRibbonTab("publish"),
    "select-page": () => select("page-root"),
    "new-project": () => void invokeLifecycle("new-project"),
    "open-project": () => void invokeLifecycle("open-project"),
    "import-rslog-project-data": () => void invokeLifecycle("import-rslog-project-data"),
    "save-project": () => void invokeLifecycle("save-project"),
    "save-project-as": () => void invokeLifecycle("save-project-as"),
    "first-boring": () => void invokeLifecycle("first-boring"),
    "previous-boring": () => void invokeLifecycle("previous-boring"),
    "next-boring": () => void invokeLifecycle("next-boring"),
    "last-boring": () => void invokeLifecycle("last-boring"),
    "select-body": () => select("region-depth-body"),
    "copy-selection": () => copySelectedText("ribbon"),
    "cut-selection": () => void cutSelectedText("ribbon"),
    "paste-selection": () => pasteCopiedText("ribbon"),
    "duplicate-selection": () => duplicateSelectedText("ribbon"),
    "delete-selection": () =>
      void mutateSelectedText({ kind: "set-visible", visible: false }, "ribbon"),
    "group-selection": () => void mutateSelectedText({ kind: "group" }, "ribbon"),
    "ungroup-selection": () => void mutateSelectedText({ kind: "ungroup" }, "ribbon"),
    undo: () => void navigateHistory("undo"),
    redo: () => void navigateHistory("redo"),
    "fit-page": fitPage,
    "actual-size": () => {
      applyZoom(100);
      status.textContent = "Canvas set to actual 100% page size.";
    },
    "toggle-smart-snap": () => toggleSnapping("smart"),
    "toggle-grid-snap": () => toggleSnapping("grid"),
    "add-vertical-guide": () => addPageGuide("vertical"),
    "add-horizontal-guide": () => addPageGuide("horizontal"),
    "align-left": () => void arrangeSelectedText({ kind: "align", alignment: "left" }, "ribbon"),
    "align-center": () =>
      void arrangeSelectedText({ kind: "align", alignment: "horizontal-center" }, "ribbon"),
    "align-right": () => void arrangeSelectedText({ kind: "align", alignment: "right" }, "ribbon"),
    "align-top": () => void arrangeSelectedText({ kind: "align", alignment: "top" }, "ribbon"),
    "align-middle": () =>
      void arrangeSelectedText({ kind: "align", alignment: "vertical-center" }, "ribbon"),
    "align-bottom": () =>
      void arrangeSelectedText({ kind: "align", alignment: "bottom" }, "ribbon"),
    "match-width": () =>
      void arrangeSelectedText({ kind: "match-size", dimension: "width" }, "ribbon"),
    "match-height": () =>
      void arrangeSelectedText({ kind: "match-size", dimension: "height" }, "ribbon"),
    "match-both": () =>
      void arrangeSelectedText({ kind: "match-size", dimension: "both" }, "ribbon"),
    "distribute-horizontal": () =>
      void arrangeSelectedText({ kind: "distribute", distribution: "horizontal-gaps" }, "ribbon"),
    "distribute-vertical": () =>
      void arrangeSelectedText({ kind: "distribute", distribution: "vertical-gaps" }, "ribbon"),
    "show-selection": () =>
      void mutateSelectedText({ kind: "set-visible", visible: true }, "ribbon"),
    "hide-selection": () =>
      void mutateSelectedText({ kind: "set-visible", visible: false }, "ribbon"),
    "lock-selection": () => void mutateSelectedText({ kind: "set-locked", locked: true }, "ribbon"),
    "unlock-selection": () =>
      void mutateSelectedText({ kind: "set-locked", locked: false }, "ribbon"),
    "bring-front": () => void mutateSelectedText({ kind: "reorder", placement: "front" }, "ribbon"),
    "bring-forward": () =>
      void mutateSelectedText({ kind: "reorder", placement: "forward" }, "ribbon"),
    "send-backward": () =>
      void mutateSelectedText({ kind: "reorder", placement: "backward" }, "ribbon"),
    "send-back": () => void mutateSelectedText({ kind: "reorder", placement: "back" }, "ribbon"),
    "inspect-samples": () => select("column-sample"),
    "inspect-track": () => select("column-data-track"),
    "validate-document": () => void validateDocument(),
    "show-diagnostics": showDiagnostics,
    "publication-select-all": () => {
      for (const identity of publicationOrder) publicationIncluded.add(identity);
      renderPublicationInventory();
      updateHistoryControls();
      status.textContent = `All ${publicationOrder.length} Boring Logs selected for one PDF package.`;
    },
    "publication-clear": () => {
      publicationIncluded.clear();
      renderPublicationInventory();
      updateHistoryControls();
      status.textContent =
        "PDF package selection cleared; choose at least one Boring Log to export.";
    },
    "publication-project-order": () => {
      publicationOrder =
        lifecycleState?.boringLogs.map(({ boringLogIdentity }) => boringLogIdentity) ?? [];
      publicationKeyIdentity = publicationOrder[0] ?? null;
      renderPublicationInventory();
      status.textContent = "PDF package restored to project Boring Log order.";
    },
    "publication-move-up": () => movePublicationKey(-1),
    "publication-move-down": () => movePublicationKey(1),
    "export-pdf": () => void exportPdf(),
    "contents-options": toggleAllContentsGroups,
    "contents-mode-drawing": () => setContentsMode("drawing"),
    "contents-mode-source": () => setContentsMode("source"),
    "select-tool": () => setInteractionMode("select"),
    "pan-tool": () => setInteractionMode("pan"),
    "properties-options": toggleAllPropertyGroups,
    "property-tab-element": () => showPropertyPanel("element"),
    "property-tab-diagnostics": showDiagnostics,
    "context-properties": focusSelectedProperties,
    "context-copy-selection": () => copySelectedText("context-menu"),
    "context-cut-selection": () => void cutSelectedText("context-menu"),
    "context-paste-selection": () => pasteCopiedText("context-menu"),
    "context-duplicate-selection": () => duplicateSelectedText("context-menu"),
    "context-delete-selection": () =>
      void mutateSelectedText({ kind: "set-visible", visible: false }, "context-menu"),
    "context-group-selection": () => void mutateSelectedText({ kind: "group" }, "context-menu"),
    "context-ungroup-selection": () => void mutateSelectedText({ kind: "ungroup" }, "context-menu"),
    "context-align-left": () => {
      hideCanvasContextMenu();
      void arrangeSelectedText({ kind: "align", alignment: "left" }, "context-menu");
    },
    "context-align-center": () => {
      hideCanvasContextMenu();
      void arrangeSelectedText({ kind: "align", alignment: "horizontal-center" }, "context-menu");
    },
    "context-align-right": () => {
      hideCanvasContextMenu();
      void arrangeSelectedText({ kind: "align", alignment: "right" }, "context-menu");
    },
    "context-align-top": () => {
      hideCanvasContextMenu();
      void arrangeSelectedText({ kind: "align", alignment: "top" }, "context-menu");
    },
    "context-align-middle": () => {
      hideCanvasContextMenu();
      void arrangeSelectedText({ kind: "align", alignment: "vertical-center" }, "context-menu");
    },
    "context-align-bottom": () => {
      hideCanvasContextMenu();
      void arrangeSelectedText({ kind: "align", alignment: "bottom" }, "context-menu");
    },
    "context-match-width": () => {
      hideCanvasContextMenu();
      void arrangeSelectedText({ kind: "match-size", dimension: "width" }, "context-menu");
    },
    "context-match-height": () => {
      hideCanvasContextMenu();
      void arrangeSelectedText({ kind: "match-size", dimension: "height" }, "context-menu");
    },
    "context-match-both": () => {
      hideCanvasContextMenu();
      void arrangeSelectedText({ kind: "match-size", dimension: "both" }, "context-menu");
    },
    "context-distribute-horizontal": () => {
      hideCanvasContextMenu();
      void arrangeSelectedText(
        { kind: "distribute", distribution: "horizontal-gaps" },
        "context-menu",
      );
    },
    "context-distribute-vertical": () => {
      hideCanvasContextMenu();
      void arrangeSelectedText(
        { kind: "distribute", distribution: "vertical-gaps" },
        "context-menu",
      );
    },
    "context-hide-selection": () =>
      void mutateSelectedText({ kind: "set-visible", visible: false }, "context-menu"),
    "context-lock-selection": () =>
      void mutateSelectedText({ kind: "set-locked", locked: true }, "context-menu"),
    "context-bring-front": () =>
      void mutateSelectedText({ kind: "reorder", placement: "front" }, "context-menu"),
    "context-send-back": () =>
      void mutateSelectedText({ kind: "reorder", placement: "back" }, "context-menu"),
    "apply-property": () => void applySelectedProperty(),
    "apply-lithology-interval": () => void applySelectedLithologyAppearance("interval"),
    "set-lithology-default": () => void applySelectedLithologyAppearance("classification-default"),
    "apply-column-width": () => {
      const requestedWidthMpt = Math.round(Number(columnWidth.value) * 1_000);
      void applySelectedColumnWidthMpt(requestedWidthMpt);
    },
    "apply-region-height": () => {
      void applySelectedRegionHeightMpt(Math.round(Number(regionHeight.value) * 1_000));
    },
    "apply-text-style": () => void applySelectedTextStyle(),
    "detach-text-annotation": () => void detachSelectedTextAsAnnotation(),
    "reset-text-presentation": () => void resetSelectedTextPresentation(),
    "zoom-out": () => applyZoom(Number(zoom.value) - 10),
    "zoom-in": () => applyZoom(Number(zoom.value) + 10),
  });
  for (const [id, handler] of Object.entries(commandRegistry)) {
    const button = element<HTMLButtonElement>(id);
    button.dataset["commandOwned"] = "true";
    button.addEventListener("click", handler);
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("button[id]")) {
    if (button.dataset["commandOwned"] !== "true") {
      throw new Error(`Unowned Boring Log Studio command: ${button.id}`);
    }
  }
  document.body.dataset["ownedCommandCount"] = String(Object.keys(commandRegistry).length);
  textOverflowPolicy.addEventListener("change", () => {
    textMinimumFontSize.disabled = textOverflowPolicy.value !== "shrink-to-minimum";
  });
  columnResizeMode.addEventListener("change", () => {
    updateColumnResizePropertySummary();
    status.textContent = `Log Column divider behavior set to ${humanize(columnResizeMode.value)} for the next Canvas or numeric edit.`;
  });
  function updateTextStyleScopeHelp(): void {
    const summary = studioProjection?.textTemplateScopeSummary;
    const changed = templateTextPropertyMask.size;
    textStyleHelp.textContent =
      textStyleScope.value === "named-style"
        ? "Named style default updates template-local typography for inherited occurrences. Occurrence geometry, layout, and existing overrides are unchanged."
        : textStyleScope.value === "template-default"
          ? summary === undefined
            ? "Embedded-template scope is unavailable until the document projection is ready."
            : `Template default applies only the ${changed} changed typography ${changed === 1 ? "property" : "properties"} to ${summary.authoredStyleCount} base styles in this project's embedded template. ${summary.excludedOverrideStyleCount} occurrence/column override styles stay unchanged; title/body/footer differences stay intact unless you change those properties.`
          : textStyleScope.value === "column-default"
            ? "Log Column default updates inherited text in this column through a template-local renderer binding. Occurrence overrides and geometry are unchanged."
            : textStyleScope.value === "all-selected"
              ? `All selected applies typography to ${selectedTextNodeIds.size} exact text occurrences in one history command. Their frames, positions, and locks are unchanged.`
              : "This occurrence receives project-owned typography and layout overrides through document history.";
  }
  textStyleScope.addEventListener("change", () => {
    updateTextStyleScopeHelp();
  });
  const markTemplateProperties = (...properties: readonly TextTemplateProperty[]): void => {
    for (const property of properties) templateTextPropertyMask.add(property);
    if (textStyleScope.value === "template-default") updateTextStyleScopeHelp();
  };
  textFontFamily.addEventListener("change", () => markTemplateProperties("fontFamilyId"));
  textFontSize.addEventListener("input", () =>
    markTemplateProperties("fontSizeMpt", "lineHeightMpt"),
  );
  textFontWeight.addEventListener("change", () => markTemplateProperties("fontWeight"));
  textDecoration.addEventListener("change", () => markTemplateProperties("textDecoration"));
  textLineHeight.addEventListener("input", () =>
    markTemplateProperties("fontSizeMpt", "lineHeightMpt"),
  );
  textLetterSpacing.addEventListener("input", () => markTemplateProperties("letterSpacingMpt"));
  textWordSpacing.addEventListener("input", () => markTemplateProperties("wordSpacingMpt"));
  textParagraphSpacing.addEventListener("input", () =>
    markTemplateProperties("paragraphSpacingMpt"),
  );
  textColor.addEventListener("input", () => markTemplateProperties("color"));
  textFrameFillEnabled.addEventListener("change", () => {
    textFrameFillColor.disabled = !textFrameFillEnabled.checked;
  });
  textFrameStrokeEnabled.addEventListener("change", () => {
    textFrameStrokeColor.disabled = !textFrameStrokeEnabled.checked;
    textFrameStrokeWidth.disabled = !textFrameStrokeEnabled.checked;
  });
  window.addEventListener("resize", () => {
    hideCanvasContextMenu();
    applyPaneWidths(contentsPaneWidth, propertiesPaneWidth, "viewport");
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && pendingKeyboardNudge !== undefined) {
      event.preventDefault();
      cancelKeyboardNudge();
      return;
    }
    if (event.key === "Escape" && marqueeGesture !== undefined) {
      event.preventDefault();
      cancelMarquee();
      return;
    }
    if (event.key === "Escape" && regionBoundaryGesture !== undefined) {
      event.preventDefault();
      cancelRegionBoundaryGesture();
      return;
    }
    if (event.key === "Escape" && columnDividerGesture !== undefined) {
      event.preventDefault();
      cancelColumnDividerGesture();
      return;
    }
    if (event.key === "Escape" && pageGuideGesture !== undefined) {
      event.preventDefault();
      cancelPageGuideGesture();
      return;
    }
    if (event.key === "Escape" && directManipulationGesture !== undefined) {
      event.preventDefault();
      cancelDirectManipulation();
      return;
    }
    if (event.key === "Escape" && !canvasContextMenu.hidden) {
      event.preventDefault();
      hideCanvasContextMenu();
      return;
    }
    const editableTarget =
      event.target instanceof HTMLElement &&
      (event.target.isContentEditable ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement);
    if (
      event.key === "Escape" &&
      !editableTarget &&
      (selectedSceneNodeId !== null || selectedTextNodeIds.size > 0)
    ) {
      event.preventDefault();
      clearSelection();
      return;
    }
    if (
      !event.defaultPrevented &&
      !editableTarget &&
      !event.ctrlKey &&
      !event.metaKey &&
      event.key.startsWith("Arrow") &&
      selectedTextNodeIds.size > 0
    ) {
      const stepMpt = event.altKey ? 100 : event.shiftKey ? 10_000 : 1_000;
      const deltaXMpt =
        event.key === "ArrowLeft" ? -stepMpt : event.key === "ArrowRight" ? stepMpt : 0;
      const deltaYMpt =
        event.key === "ArrowUp" ? -stepMpt : event.key === "ArrowDown" ? stepMpt : 0;
      event.preventDefault();
      queueKeyboardNudge(deltaXMpt, deltaYMpt);
      return;
    }
    if (!event.defaultPrevented && !editableTarget && event.key === "Delete") {
      event.preventDefault();
      void mutateSelectedText({ kind: "set-visible", visible: false }, "keyboard");
      return;
    }
    if (!event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "a" && !editableTarget) {
      event.preventDefault();
      selectAllTextOccurrences();
      return;
    }
    if (key === "c" && !editableTarget) {
      event.preventDefault();
      copySelectedText("keyboard");
      return;
    }
    if (key === "x" && !editableTarget) {
      event.preventDefault();
      void cutSelectedText("keyboard");
      return;
    }
    if (key === "v" && !editableTarget) {
      event.preventDefault();
      pasteCopiedText("keyboard");
      return;
    }
    if (key === "d" && !editableTarget) {
      event.preventDefault();
      duplicateSelectedText("keyboard");
      return;
    }
    if (key === "g" && !editableTarget) {
      event.preventDefault();
      void mutateSelectedText({ kind: event.shiftKey ? "ungroup" : "group" }, "keyboard");
      return;
    }
    if (key === "z" || key === "y") {
      event.preventDefault();
      void navigateHistory(key === "y" || event.shiftKey ? "redo" : "undo");
      return;
    }
    if ((key === "]" || key === "[") && !editableTarget) {
      event.preventDefault();
      const placement =
        key === "]" ? (event.shiftKey ? "front" : "forward") : event.shiftKey ? "back" : "backward";
      void mutateSelectedText({ kind: "reorder", placement }, "keyboard");
      return;
    }
    if (key === "pageup" || key === "pagedown") {
      event.preventDefault();
      void invokeLifecycle(
        key === "pageup"
          ? event.shiftKey
            ? "first-boring"
            : "previous-boring"
          : event.shiftKey
            ? "last-boring"
            : "next-boring",
      );
      return;
    }
    const operation =
      key === "n"
        ? "new-project"
        : key === "o"
          ? "open-project"
          : key === "s" && event.shiftKey
            ? "save-project-as"
            : key === "s"
              ? "save-project"
              : null;
    if (operation === null) return;
    event.preventDefault();
    void invokeLifecycle(operation);
  });

  installSvg();
  applyPaneWidths(contentsPaneWidth, propertiesPaneWidth, "viewport");
  renderTree();
  renderDiagnostics();
  updateContentsOptions();
  setInteractionMode("select");
  fitPage();
  sceneSummary.textContent = `${page.nodes.length} vector nodes · ${page.semanticOrder.length} semantic elements · ${scene.diagnostics.length} diagnostics`;
  sceneSummary.textContent = `${scene.pages.length} page${scene.pages.length === 1 ? "" : "s"} - ${scene.pages.reduce((total, scenePage) => total + scenePage.nodes.length, 0)} vector nodes - ${scene.diagnostics.length} diagnostics`;
  status.textContent = "Structured boring log scene rendered as semantic SVG.";
  if (studioProjection === null) {
    await refreshStudioProjection(
      null,
      "Editable structured boring log scene loaded from main authority.",
    );
  } else {
    updateHistoryControls();
    status.textContent = "Editable structured boring log scene loaded from main authority.";
  }
  await invokeLifecycle("get-state");
}

void main().catch((error: unknown) => {
  const status = document.getElementById("editor-status");
  if (status !== null) {
    status.textContent = error instanceof Error ? error.message : "Studio startup failed.";
  }
});
