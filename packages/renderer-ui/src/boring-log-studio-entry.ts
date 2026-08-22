import type {
  BoringLogSceneNode,
  BoringLogValueProvenance,
  OverrideRenderContentState,
  OverrideRenderDomainValueProjection,
  OverrideRenderUnitState,
  ResolvedBoringLogPageScene,
} from "@rsrender/contracts";

import { projectBoringLogSceneToSvg } from "./boring-log-svg-projection.js";
import {
  buildBoringLogStudioTree,
  visibleBoringLogStudioTreeItems,
} from "./boring-log-studio-tree.js";

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

type StudioApis = Readonly<{
  readonly studio: {
    readonly getProjection: (input: {
      readonly minimumWorkingRevision: number | null;
    }) => Promise<
      | { readonly accepted: false; readonly code: string }
      | { readonly accepted: true; readonly projection: StudioProjection }
    >;
  };
  readonly document: {
    readonly setDisplayValue: (input: unknown) => Promise<CommandResult>;
    readonly undo: (input: { readonly expectedWorkingRevision: number }) => Promise<CommandResult>;
    readonly redo: (input: { readonly expectedWorkingRevision: number }) => Promise<CommandResult>;
  };
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
  const tree = element<HTMLDivElement>("contents-tree");
  const filter = element<HTMLInputElement>("contents-filter");
  const emptySelection = element<HTMLElement>("selection-empty");
  const selectionProperties = element<HTMLElement>("selection-properties");
  const selectionName = element<HTMLElement>("selection-name");
  const selectionRole = element<HTMLElement>("selection-role");
  const selectionProvenance = element<HTMLElement>("selection-provenance");
  const propertySemanticId = element<HTMLElement>("property-semantic-id");
  const propertyRole = element<HTMLElement>("property-role");
  const propertyNodeCount = element<HTMLElement>("property-node-count");
  const propertyContent = element<HTMLTextAreaElement>("property-content");
  const applyProperty = element<HTMLButtonElement>("apply-property");
  const propertyHelp = element<HTMLElement>("property-help");
  const propertyBounds = element<HTMLElement>("property-bounds");
  const propertyProvenance = element<HTMLElement>("property-provenance");
  const propertySourceOriginal = element<HTMLElement>("property-source-original");
  const propertyEffectiveValue = element<HTMLElement>("property-effective-value");
  const selectionStatus = element<HTMLElement>("selection-status");
  const diagnosticsList = element<HTMLUListElement>("diagnostics-list");
  const diagnosticBadge = element<HTMLElement>("diagnostic-badge");
  const propertiesScroll = element<HTMLElement>("properties-scroll");
  const propertyElementPanel = element<HTMLElement>("property-element-panel");
  const propertyDiagnosticsPanel = element<HTMLElement>("property-diagnostics-panel");
  const propertyElementTab = element<HTMLButtonElement>("property-tab-element");
  const propertyDiagnosticsTab = element<HTMLButtonElement>("property-tab-diagnostics");
  const status = element<HTMLParagraphElement>("editor-status");
  const sceneSummary = element<HTMLElement>("scene-summary");
  const zoom = element<HTMLInputElement>("zoom");
  const zoomValue = element<HTMLOutputElement>("zoom-value");
  const canvasScale = element<HTMLOutputElement>("canvas-scale");
  const undoButton = element<HTMLButtonElement>("undo");
  const redoButton = element<HTMLButtonElement>("redo");
  const exportPdfButton = element<HTMLButtonElement>("export-pdf");
  let selectedSemanticId: string | null = null;
  let studioProjection: StudioProjection | null = bootstrapProjection;
  const collapsedTreeItems = new Set<string>();

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
  }

  function installSvg(): void {
    const projection = projectBoringLogSceneToSvg(scene, selectedSemanticId);
    if (!projection.accepted) throw new Error(projection.detail);
    const parsed = new DOMParser().parseFromString(projection.markup, "image/svg+xml");
    if (parsed.querySelector("parsererror") !== null)
      throw new Error("SVG projection parse failed");
    pageHost.replaceChildren(document.importNode(parsed.documentElement, true));
    pageHost.setAttribute("aria-busy", "false");
  }

  function renderTree(): void {
    tree.replaceChildren();
    const items = buildBoringLogStudioTree(scene);
    for (const item of visibleBoringLogStudioTreeItems(items, collapsedTreeItems, filter.value)) {
      const row = document.createElement("div");
      row.className = `tree-row tree-level-${item.level}${item.semanticId === selectedSemanticId ? " is-selected" : ""}`;
      row.setAttribute("role", "treeitem");
      row.setAttribute("aria-level", String(item.level));
      row.setAttribute("aria-selected", String(item.semanticId === selectedSemanticId));
      if (item.hasChildren) {
        row.setAttribute("aria-expanded", String(!collapsedTreeItems.has(item.semanticId)));
      }
      row.dataset["semanticId"] = item.semanticId;
      const chevron = document.createElement("span");
      chevron.className = "chevron";
      const disclosure = document.createElement("button");
      disclosure.type = "button";
      disclosure.className = "tree-disclosure";
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
      selectButton.append(icon, label);
      selectButton.addEventListener("click", () => select(item.semanticId));
      row.append(chevron, selectButton);
      tree.append(row);
    }
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

  function select(semanticId: string): void {
    selectedSemanticId = semanticId;
    showPropertyPanel("element");
    const nodes = page.nodes.filter((node) => node.semanticId === semanticId);
    const representative = nodes.find((node) => node.kind === "text") ?? nodes[0];
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
    propertyRole.textContent = representative.role;
    propertyNodeCount.textContent = String(nodes.length);
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
    propertyBounds.textContent = boundsText(nodes);
    propertyProvenance.textContent = provenanceText(representative.provenance);
    propertySourceOriginal.textContent =
      sourceOriginal === null ? "Computed" : String(sourceOriginal);
    propertyEffectiveValue.textContent = effective === null ? "Computed" : String(effective);
    selectionStatus.textContent = `${humanize(semanticId)} · ${nodes.length} scene node${nodes.length === 1 ? "" : "s"}`;
    status.textContent = `Selected ${semanticId}. Canvas, Contents, and Properties synchronized.`;
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
      select(selectedSemanticId);
    }
    updateHistoryControls();
    sceneSummary.textContent = `${page.nodes.length} vector nodes · ${page.semanticOrder.length} semantic elements · ${scene.diagnostics.length} diagnostics`;
    status.textContent = successStatus;
    return true;
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
      (!Number.isSafeInteger(value) || value < 100_000 || value > 175_000)
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
            ? "Column width must be an integer from 100000 through 175000 mpt."
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
    await refreshStudioProjection(
      result.workingRevision,
      `${humanize(editable.property)} applied at revision ${result.workingRevision}.`,
    );
    propertyContent.focus();
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
    await refreshStudioProjection(
      result.workingRevision,
      `${humanize(operation)} completed at revision ${result.workingRevision}.`,
    );
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

  function applyZoom(value: number): void {
    const bounded = Math.min(160, Math.max(40, Math.round(value / 10) * 10));
    zoom.value = String(bounded);
    zoomValue.value = `${bounded}%`;
    zoomValue.textContent = `${bounded}%`;
    canvasScale.value = `${bounded}%`;
    canvasScale.textContent = `${bounded}%`;
    pageShadow.className = `page-shadow zoom-${bounded}`;
  }

  pageHost.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const semantic = target.closest<SVGElement>("[data-semantic-id]")?.dataset["semanticId"];
    if (semantic !== undefined) select(semantic);
  });
  filter.addEventListener("input", renderTree);
  for (const tab of document.querySelectorAll<HTMLButtonElement>("[data-ribbon-tab]")) {
    tab.addEventListener("click", () => activateRibbonTab(tab.dataset["ribbonTab"] ?? "home"));
  }
  propertyElementTab.addEventListener("click", () => showPropertyPanel("element"));
  propertyDiagnosticsTab.addEventListener("click", () => showPropertyPanel("diagnostics"));
  element<HTMLButtonElement>("select-page").addEventListener("click", () => select("page-root"));
  element<HTMLButtonElement>("select-body").addEventListener("click", () =>
    select("region-depth-body"),
  );
  element<HTMLButtonElement>("inspect-samples").addEventListener("click", () =>
    select("column-sample"),
  );
  element<HTMLButtonElement>("inspect-track").addEventListener("click", () =>
    select("column-data-track"),
  );
  element<HTMLButtonElement>("show-diagnostics").addEventListener("click", () =>
    showPropertyPanel("diagnostics"),
  );
  zoom.addEventListener("input", () => applyZoom(Number(zoom.value)));
  element<HTMLButtonElement>("zoom-out").addEventListener("click", () =>
    applyZoom(Number(zoom.value) - 10),
  );
  element<HTMLButtonElement>("zoom-in").addEventListener("click", () =>
    applyZoom(Number(zoom.value) + 10),
  );
  element<HTMLButtonElement>("actual-size").addEventListener("click", () => applyZoom(100));
  element<HTMLButtonElement>("fit-page").addEventListener("click", () => applyZoom(80));
  element<HTMLButtonElement>("validate-document").addEventListener("click", () => {
    status.textContent = `${page.nodes.length} ordered scene nodes validated; ${scene.diagnostics.length} diagnostics visible.`;
  });
  applyProperty.addEventListener("click", () => void applySelectedProperty());
  undoButton.addEventListener("click", () => void navigateHistory("undo"));
  redoButton.addEventListener("click", () => void navigateHistory("redo"));
  exportPdfButton.addEventListener("click", () => void exportPdf());

  installSvg();
  renderTree();
  renderDiagnostics();
  applyZoom(80);
  sceneSummary.textContent = `${page.nodes.length} vector nodes · ${page.semanticOrder.length} semantic elements · ${scene.diagnostics.length} diagnostics`;
  status.textContent = "Structured boring log scene rendered as semantic SVG.";
  if (studioProjection === null) {
    void refreshStudioProjection(
      null,
      "Editable structured boring log scene loaded from main authority.",
    );
  } else {
    updateHistoryControls();
    status.textContent = "Editable structured boring log scene loaded from main authority.";
  }
}

void main().catch((error: unknown) => {
  const status = document.getElementById("editor-status");
  if (status !== null) {
    status.textContent = error instanceof Error ? error.message : "Studio startup failed.";
  }
});
