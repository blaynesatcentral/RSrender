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
  resolveBoringLogDirectManipulationFrame,
  snapBoringLogDirectManipulationFrame,
  type BoringLogDirectManipulationHandle,
} from "./boring-log-direct-manipulation.js";

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
  readonly textTemplateScopeSummary: Readonly<{
    readonly authoredStyleCount: number;
    readonly excludedOverrideStyleCount: number;
  }>;
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
}>;

type PublicationResult =
  | Readonly<{ accepted: false; code: string }>
  | Readonly<{
      accepted: true;
      result: Readonly<{
        code: "EXPORT_VERIFIED_SUCCESS";
        workingRevision: number;
        sceneInputDigest: string;
        sceneDigest: string;
        projectionDigest: string;
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
    }) => Promise<
      | { readonly accepted: false; readonly code: string }
      | { readonly accepted: true; readonly projection: StudioProjection }
    >;
    readonly lifecycle: (input: {
      readonly operation: LifecycleOperation;
      readonly expectedWorkingRevision: number | null;
    }) => Promise<unknown>;
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
    readonly expectedSceneInputDigest: string;
  }) => Promise<PublicationResult>;
}>;

function element<ElementType extends HTMLElement>(id: string): ElementType {
  const value = document.getElementById(id);
  if (value === null) throw new Error(`Missing Boring Log Studio element: ${id}`);
  return value as ElementType;
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
  const canvasStage = element<HTMLDivElement>("canvas-stage");
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
  const templateTextPropertyMask = new Set<TextTemplateProperty>();
  let currentTextFrameAnchor: BoringLogTextFrameAnchor = "top-left";
  let studioProjection: StudioProjection | null = bootstrapProjection;
  let lifecycleState: LifecycleState | null = null;
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
          readonly xMpt: readonly number[];
          readonly yMpt: readonly number[];
        }>;
        readonly originalTransform: string | null;
        readonly originalFrameTransform: string | null;
      }
    | undefined;
  let suppressCanvasClick = false;
  let smartSnapEnabled = true;
  let gridSnapEnabled = false;

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

  function updateHistoryControls(): void {
    undoButton.disabled = studioProjection?.canUndo !== true;
    redoButton.disabled = studioProjection?.canRedo !== true;
    exportPdfButton.disabled = studioProjection === null || publicationApi() === null;
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
    element<HTMLElement>("canvas-title").textContent = `${active.displayName} — Page 1`;
    element<HTMLElement>("page-status").textContent =
      `Boring ${active.ordinal} of ${next.boringLogs.length} · Page 1 of 1`;
  }

  async function refreshLifecycleStateSilently(): Promise<boolean> {
    const apis = studioApis();
    if (apis === null) return false;
    const result = decodedLifecycleResult(
      await apis.studio.lifecycle({ operation: "get-state", expectedWorkingRevision: null }),
    );
    if (result === null || !result.accepted || result.state === null) return false;
    installLifecycleState(result.state);
    return true;
  }

  async function invokeLifecycle(operation: LifecycleOperation): Promise<void> {
    const apis = studioApis();
    if (apis === null) return;
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
    const projection = projectBoringLogSceneToSvg(scene, selectedSemanticId);
    if (!projection.accepted) throw new Error(projection.detail);
    const parsed = new DOMParser().parseFromString(projection.markup, "image/svg+xml");
    if (parsed.querySelector("parsererror") !== null)
      throw new Error("SVG projection parse failed");
    pageHost.replaceChildren(document.importNode(parsed.documentElement, true));
    if (selectedSceneNodeId !== null || selectedTextNodeIds.size > 0) {
      for (const selected of pageHost.querySelectorAll<SVGElement>(".scene-node.is-selected")) {
        selected.classList.remove("is-selected");
      }
      for (const occurrence of pageHost.querySelectorAll<SVGElement>("[data-node-id]")) {
        if (selectedTextNodeIds.has(occurrence.dataset["nodeId"] ?? "")) {
          occurrence.classList.add("is-selected");
        }
      }
      if (selectedTextNodeIds.size === 0) {
        const occurrence = [...pageHost.querySelectorAll<SVGElement>("[data-node-id]")].find(
          (candidate) => candidate.dataset["nodeId"] === selectedSceneNodeId,
        );
        occurrence?.classList.add("is-selected");
      }
    }
    installDirectManipulationOverlay();
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
    if (node === undefined) return;
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

  function syncTextFrameInputs(frame: TextFrame): void {
    const anchorPoint = frameAnchorPoint(frame, currentTextFrameAnchor);
    textFrameX.value = String(anchorPoint.xMpt / 1_000);
    textFrameY.value = String(anchorPoint.yMpt / 1_000);
    textFrameWidth.value = String(frame.widthMpt / 1_000);
    textFrameHeight.value = String(frame.heightMpt / 1_000);
    propertyBounds.textContent = `${(frame.xMpt / 1_000).toFixed(1)}, ${(frame.yMpt / 1_000).toFixed(1)} Â· ${(frame.widthMpt / 1_000).toFixed(1)} Ã— ${(frame.heightMpt / 1_000).toFixed(1)} pt`;
  }

  function currentSnapTargets(): Readonly<{ xMpt: readonly number[]; yMpt: readonly number[] }> {
    const xMpt = new Set<number>([0, Math.round(page.widthMpt / 2), page.widthMpt]);
    const yMpt = new Set<number>([0, Math.round(page.heightMpt / 2), page.heightMpt]);
    if (smartSnapEnabled) {
      for (const candidate of pageHost.querySelectorAll<SVGGraphicsElement>(".scene-node")) {
        if (candidate.dataset["nodeId"] === selectedSceneNodeId) continue;
        try {
          const bounds = candidate.getBBox();
          for (const value of [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width]) {
            if (Number.isFinite(value)) xMpt.add(Math.round(value));
          }
          for (const value of [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height]) {
            if (Number.isFinite(value)) yMpt.add(Math.round(value));
          }
        } catch {
          // A non-rendered semantic node is not a snap target.
        }
      }
    }
    if (gridSnapEnabled) {
      for (let value = 0; value <= page.widthMpt; value += 1_000) xMpt.add(value);
      for (let value = 0; value <= page.heightMpt; value += 1_000) yMpt.add(value);
    }
    return Object.freeze({
      xMpt: Object.freeze([...xMpt].sort((left, right) => left - right)),
      yMpt: Object.freeze([...yMpt].sort((left, right) => left - right)),
    });
  }

  function previewDirectManipulationFrame(
    frame: TextFrame,
    snap: Readonly<{ snapXMpt: number | null; snapYMpt: number | null }> = {
      snapXMpt: null,
      snapYMpt: null,
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
      overlay.prepend(line);
    }
    if (overlay !== null && snap.snapYMpt !== null) {
      const line = document.createElementNS(namespace, "line");
      line.classList.add("direct-snap-feedback");
      line.setAttribute("x1", "0");
      line.setAttribute("x2", String(page.widthMpt));
      line.setAttribute("y1", String(snap.snapYMpt));
      line.setAttribute("y2", String(snap.snapYMpt));
      overlay.prepend(line);
    }
    const snapStatus =
      snap.snapXMpt === null && snap.snapYMpt === null
        ? ""
        : ` Snapped${snap.snapXMpt === null ? "" : ` X ${snap.snapXMpt} mpt`}${snap.snapYMpt === null ? "" : ` Y ${snap.snapYMpt} mpt`}; hold Alt to bypass.`;
    status.textContent = `Canvas preview ${Math.round(frame.xMpt)} / ${Math.round(frame.yMpt)} / ${Math.round(frame.widthMpt)} / ${Math.round(frame.heightMpt)} mpt.${snapStatus} Release to commit and reflow; Esc cancels.`;
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
      selectButton.addEventListener("click", () => select(item.semanticId));
      row.append(chevron, selectButton);
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

  function openCanvasContextMenu(): void {
    canvasContextMenu.hidden = false;
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
    status.textContent = `${activeTab.textContent?.trim() ?? tabId} commands active.`;
  }

  function select(
    semanticId: string,
    nodeId: string | null = null,
    additiveTextSelection = false,
  ): void {
    selectedSemanticId = semanticId;
    selectedSceneNodeId = nodeId;
    showPropertyPanel("element");
    const nodes = page.nodes.filter((node) => node.semanticId === semanticId);
    const representative =
      (nodeId === null ? undefined : nodes.find((node) => node.id === nodeId)) ??
      nodes.find((node) => node.kind === "text") ??
      nodes[0];
    const exactTextNode =
      representative?.kind === "text" && representative.id === nodeId ? representative : undefined;
    if (additiveTextSelection && exactTextNode !== undefined) {
      selectedTextNodeIds.add(exactTextNode.id);
    } else {
      selectedTextNodeIds.clear();
      if (exactTextNode !== undefined) selectedTextNodeIds.add(exactTextNode.id);
    }
    if (
      nodeId === null &&
      representative?.kind === "text" &&
      nodes.filter((node) => node.kind === "text").length === 1
    ) {
      selectedSceneNodeId = representative.id;
      selectedTextNodeIds.add(representative.id);
    }
    installSvg();
    renderTree();
    if (representative === undefined) {
      emptySelection.hidden = false;
      selectionProperties.hidden = true;
      selectionStatus.textContent = semanticId;
      return;
    }
    emptySelection.hidden = true;
    selectionProperties.hidden = false;
    selectionName.textContent = humanize(semanticId);
    selectionRole.textContent = humanize(representative.role);
    selectionProvenance.textContent =
      representative.provenance?.provenanceClass === "effective-override"
        ? "Effective override"
        : representative.provenance?.provenanceClass === "source"
          ? "Source original"
          : "Computed layout";
    propertySemanticId.textContent = semanticId;
    propertyNodeId.textContent = representative.id;
    propertyRole.textContent = representative.role;
    propertyNodeCount.textContent = String(nodes.length);
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
    const editable = editableFor(semanticId);
    const effective = editable === null ? null : contentValue(editable.effectiveDisplay.content);
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
        : `${humanize(editable.property)} · ${editable.valueType} · edits route through document history.`;
    propertyBounds.textContent = boundsText([representative]);
    propertyProvenance.textContent = provenanceText(representative.provenance);
    propertySourceOriginal.textContent =
      sourceOriginal === null ? "Computed" : String(sourceOriginal);
    propertyEffectiveValue.textContent = effective === null ? "Computed" : String(effective);
    selectionStatus.textContent = `${humanize(semanticId)} · ${representative.id}`;
    if (selectedTextNodeIds.size > 1) {
      selectionStatus.textContent = `${selectedTextNodeIds.size} text occurrences; primary ${representative.id}`;
    }
    status.textContent =
      selectedTextNodeIds.size > 1
        ? `${selectedTextNodeIds.size} exact text occurrences selected. Ctrl-click adds another; Properties shows the primary occurrence.`
        : `Selected exact occurrence ${representative.id}. Canvas, Contents, and Properties synchronized.`;
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
      installSvg();
      renderTree();
    }
    updateHistoryControls();
    sceneSummary.textContent = `${page.nodes.length} vector nodes · ${page.semanticOrder.length} semantic elements · ${scene.diagnostics.length} diagnostics`;
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
    const api = publicationApi();
    if (api === null || studioProjection === null || exportPdfButton.disabled) return;
    exportPdfButton.disabled = true;
    exportPdfButton.removeAttribute("data-result");
    status.textContent = "Exporting fixed structured scene to PDFâ€¦";
    const result = await api.exportPdf({
      expectedWorkingRevision: studioProjection.workingRevision,
      expectedSceneInputDigest: studioProjection.scene.inputDigest,
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
    exportPdfButton.dataset["sceneDigest"] = result.result.sceneDigest;
    exportPdfButton.dataset["projectionDigest"] = result.result.projectionDigest;
    exportPdfButton.dataset["pdfBytes"] = String(result.result.pdfBytes);
    status.textContent = `PDF exported and reopened successfully: ${result.result.destinationPath}`;
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
    const handle = control?.dataset["directManipulationHandle"] as
      BoringLogDirectManipulationHandle | undefined;
    if (control === null || handle === undefined || selectedSceneNodeId === null) return;
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
    const padding = node.presentation?.paddingMpt ?? {
      topMpt: 0,
      rightMpt: 0,
      bottomMpt: 0,
      leftMpt: 0,
    };
    const presentationFrame = pageHost.querySelector<SVGRectElement>(
      `#${CSS.escape(`${node.id}:presentation-frame`)}`,
    );
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
      xTargetsMpt: smartSnapEnabled || gridSnapEnabled ? gesture.snapTargets.xMpt : [],
      yTargetsMpt:
        (smartSnapEnabled || gridSnapEnabled) && gesture.positionMode !== "depth-bound"
          ? gesture.snapTargets.yMpt
          : [],
      thresholdMpt,
      pageWidthMpt: page.widthMpt,
      pageHeightMpt: page.heightMpt,
      bypass: event.altKey,
    });
    previewDirectManipulationFrame(snapped.frame, snapped);
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
    suppressCanvasClick = true;
    installSvg();
    syncTextFrameInputs(gesture.originalFrame);
    status.textContent = `Canvas gesture canceled for ${gesture.nodeId}; document history and scene authority were unchanged.`;
  }

  async function finishDirectManipulation(event: PointerEvent): Promise<void> {
    const gesture = directManipulationGesture;
    if (gesture === undefined || gesture.pointerId !== event.pointerId) return;
    releaseDirectManipulationCapture(gesture.pointerId);
    directManipulationGesture = undefined;
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
  pageHost.addEventListener("keydown", (event) => {
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
      select(semantic, occurrence?.dataset["nodeId"] ?? null, event.ctrlKey || event.metaKey);
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
    select(semantic, nodeId, selectedTextNodeIds.has(nodeId));
    openCanvasContextMenu();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!canvasContextMenu.hidden && !canvasContextMenu.contains(event.target as Node)) {
      hideCanvasContextMenu();
    }
  });
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
    "save-project": () => void invokeLifecycle("save-project"),
    "save-project-as": () => void invokeLifecycle("save-project-as"),
    "first-boring": () => void invokeLifecycle("first-boring"),
    "previous-boring": () => void invokeLifecycle("previous-boring"),
    "next-boring": () => void invokeLifecycle("next-boring"),
    "last-boring": () => void invokeLifecycle("last-boring"),
    "select-body": () => select("region-depth-body"),
    undo: () => void navigateHistory("undo"),
    redo: () => void navigateHistory("redo"),
    "fit-page": fitPage,
    "actual-size": () => {
      applyZoom(100);
      status.textContent = "Canvas set to actual 100% page size.";
    },
    "toggle-smart-snap": () => toggleSnapping("smart"),
    "toggle-grid-snap": () => toggleSnapping("grid"),
    "inspect-samples": () => select("column-sample"),
    "inspect-track": () => select("column-data-track"),
    "validate-document": () => void validateDocument(),
    "show-diagnostics": showDiagnostics,
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
    "apply-property": () => void applySelectedProperty(),
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
    if (zoomMode === "fit") requestAnimationFrame(fitPage);
  });
  window.addEventListener("keydown", (event) => {
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
    if (!event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
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
  renderTree();
  renderDiagnostics();
  updateContentsOptions();
  setInteractionMode("select");
  fitPage();
  sceneSummary.textContent = `${page.nodes.length} vector nodes · ${page.semanticOrder.length} semantic elements · ${scene.diagnostics.length} diagnostics`;
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
