import type {
  BoringLogSceneNode,
  BoringLogValueProvenance,
  ResolvedBoringLogPageScene,
} from "@rsrender/contracts";

import { projectBoringLogSceneToSvg } from "./boring-log-svg-projection.js";

type TreeItem = Readonly<{
  readonly semanticId: string;
  readonly label: string;
  readonly level: number;
  readonly icon: string;
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

function semanticTree(scene: ResolvedBoringLogPageScene): readonly TreeItem[] {
  const page = scene.pages[0]!;
  const items: TreeItem[] = [
    { semanticId: "page-root", label: "Boring Log — Page 1", level: 1, icon: "▱" },
  ];
  const groups = [
    ["region-header", "Header & project metadata", "▤"],
    ["region-depth-body", "Depth log body", "▥"],
    ["region-footer", "Legend, notes & approval", "▧"],
  ] as const;
  for (const [semanticId, label, icon] of groups) {
    items.push({ semanticId, label, level: 2, icon });
    if (semanticId === "region-depth-body") {
      for (const column of scene.pagePlan.pages[0]!.columns) {
        items.push({
          semanticId: column.id,
          label: humanize(column.role),
          level: 3,
          icon: column.role === "lithology-pattern" ? "▨" : "│",
        });
      }
    }
  }
  const represented = new Set(items.map(({ semanticId }) => semanticId));
  for (const semanticId of page.semanticOrder) {
    if (represented.has(semanticId)) continue;
    const node = page.nodes.find((candidate) => candidate.semanticId === semanticId);
    if (node === undefined || !/^(?:lithology|sample|remark|data-layer):/u.test(semanticId))
      continue;
    items.push({ semanticId, label: humanize(semanticId), level: 3, icon: "·" });
    represented.add(semanticId);
  }
  return Object.freeze(items);
}

function sceneFromDocument(): unknown {
  const source = element<HTMLScriptElement>("resolved-page-scene").textContent;
  if (source === null || source.length === 0) throw new Error("Resolved scene data is missing");
  return JSON.parse(source) as unknown;
}

const initialProjection = projectBoringLogSceneToSvg(sceneFromDocument());
if (!initialProjection.accepted) {
  throw new Error(`${initialProjection.code}: ${initialProjection.detail}`);
}

const scene = initialProjection.scene;
const page = scene.pages[0]!;
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
const propertyBounds = element<HTMLElement>("property-bounds");
const propertyProvenance = element<HTMLElement>("property-provenance");
const selectionStatus = element<HTMLElement>("selection-status");
const diagnosticsList = element<HTMLUListElement>("diagnostics-list");
const diagnosticBadge = element<HTMLElement>("diagnostic-badge");
const status = element<HTMLParagraphElement>("editor-status");
const sceneSummary = element<HTMLElement>("scene-summary");
const zoom = element<HTMLInputElement>("zoom");
const zoomValue = element<HTMLOutputElement>("zoom-value");
const canvasScale = element<HTMLOutputElement>("canvas-scale");
let selectedSemanticId: string | null = null;

function installSvg(): void {
  const projection = projectBoringLogSceneToSvg(scene, selectedSemanticId);
  if (!projection.accepted) throw new Error(projection.detail);
  const parsed = new DOMParser().parseFromString(projection.markup, "image/svg+xml");
  if (parsed.querySelector("parsererror") !== null) throw new Error("SVG projection parse failed");
  pageHost.replaceChildren(document.importNode(parsed.documentElement, true));
  pageHost.setAttribute("aria-busy", "false");
}

function renderTree(): void {
  const query = filter.value.trim().toLocaleLowerCase();
  tree.replaceChildren();
  for (const item of semanticTree(scene)) {
    if (query.length > 0 && !item.label.toLocaleLowerCase().includes(query)) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tree-row tree-level-${item.level}${item.semanticId === selectedSemanticId ? " is-selected" : ""}`;
    button.setAttribute("role", "treeitem");
    button.setAttribute("aria-level", String(item.level));
    button.setAttribute("aria-selected", String(item.semanticId === selectedSemanticId));
    button.dataset["semanticId"] = item.semanticId;
    const chevron = document.createElement("span");
    chevron.className = "chevron";
    chevron.textContent = item.level < 3 ? "⌄" : "";
    const icon = document.createElement("span");
    icon.className = "layer-icon";
    icon.textContent = item.icon;
    const label = document.createElement("span");
    label.className = "layer-label";
    label.textContent = item.label;
    button.append(chevron, icon, label);
    button.addEventListener("click", () => select(item.semanticId));
    tree.append(button);
  }
}

function select(semanticId: string): void {
  selectedSemanticId = semanticId;
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
  propertyContent.value = nodes
    .filter(
      (node): node is Extract<BoringLogSceneNode, { readonly kind: "text" }> =>
        node.kind === "text",
    )
    .map(({ content }) => content)
    .join("\n");
  propertyBounds.textContent = boundsText(nodes);
  propertyProvenance.textContent = provenanceText(representative.provenance);
  selectionStatus.textContent = `${humanize(semanticId)} · ${nodes.length} scene node${nodes.length === 1 ? "" : "s"}`;
  status.textContent = `Selected ${semanticId}. Canvas, Contents, and Properties synchronized.`;
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

installSvg();
renderTree();
renderDiagnostics();
applyZoom(80);
sceneSummary.textContent = `${page.nodes.length} vector nodes · ${page.semanticOrder.length} semantic elements · ${scene.diagnostics.length} diagnostics`;
status.textContent = "Structured boring log scene rendered as semantic SVG.";
