import {
  contentText,
  dataRecord,
  provenanceText,
  unitText,
  validateReplacement,
  validateTargetSelection,
  type DataRecord,
} from "./semantic-override-editor-model.js";

type PublicResult = Readonly<Record<string, unknown>>;
type DocumentApi = Readonly<{
  getProjection(input: Readonly<{ minimumWorkingRevision: number | null }>): Promise<PublicResult>;
  setDisplayValue(input: DataRecord): Promise<PublicResult>;
  undo(input: Readonly<{ expectedWorkingRevision: number }>): Promise<PublicResult>;
  redo(input: Readonly<{ expectedWorkingRevision: number }>): Promise<PublicResult>;
}>;

declare global {
  interface Window {
    readonly rsrender?: Readonly<{ readonly document?: DocumentApi }>;
  }
}

const api = window.rsrender?.document;
const rows = new Map<string, HTMLTableRowElement>();
let currentResult: PublicResult | null = null;
let busy = false;

function element<ElementType extends HTMLElement>(id: string): ElementType {
  const value = document.getElementById(id);
  if (value === null) throw new Error(`Missing semantic editor element: ${id}`);
  return value as ElementType;
}

const rowContainer = element<HTMLTableSectionElement>("value-rows");
const workingRevision = element<HTMLOutputElement>("working-revision");
const durableRevision = element<HTMLOutputElement>("durable-revision");
const dirtyState = element<HTMLOutputElement>("dirty-state");
const historyState = element<HTMLOutputElement>("history-state");
const status = element<HTMLParagraphElement>("editor-status");
const formError = element<HTMLParagraphElement>("form-error");
const historyReason = element<HTMLParagraphElement>("history-reason");
const diagnostics = element<HTMLUListElement>("diagnostics");
const replacementInput = element<HTMLInputElement>("override-value");
const typeInput = element<HTMLInputElement>("expected-type");
const unitInput = element<HTMLInputElement>("expected-unit");
const reasonInput = element<HTMLTextAreaElement>("override-reason");
const applyButton = element<HTMLButtonElement>("apply-override");
const undoButton = element<HTMLButtonElement>("undo");
const redoButton = element<HTMLButtonElement>("redo");
const refetchButton = element<HTMLButtonElement>("refetch");
const form = element<HTMLFormElement>("override-form");

function setStatus(message: string): void {
  if (status.textContent !== message) status.textContent = message;
}

function selectedFieldIdentity(): string | null {
  const selected = [
    ...rowContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ].filter((checkbox) => checkbox.checked);
  return selected.length === 1 ? (selected[0]?.dataset["fieldIdentity"] ?? null) : null;
}

function projection(): DataRecord | null {
  return currentResult === null ? null : dataRecord(currentResult["projection"]);
}

function values(): readonly DataRecord[] {
  const candidate = projection()?.["values"];
  return Array.isArray(candidate)
    ? candidate.map(dataRecord).filter((value): value is DataRecord => value !== null)
    : [];
}

function currentTarget(): DataRecord | null {
  const identity = selectedFieldIdentity();
  return identity === null
    ? null
    : (values().find((value) => value["sourceFieldIdentity"] === identity) ?? null);
}

function cell(row: HTMLTableRowElement, index: number): HTMLTableCellElement {
  const result = row.cells.item(index);
  if (result === null) throw new Error("Missing semantic editor cell");
  return result;
}

function createRow(fieldIdentity: string): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.dataset["fieldIdentity"] = fieldIdentity;
  const selectionCell = document.createElement("td");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.dataset["fieldIdentity"] = fieldIdentity;
  checkbox.setAttribute("aria-label", `Select field ${fieldIdentity}`);
  checkbox.addEventListener("change", () => {
    formError.textContent = "";
    updateEditorInputs();
  });
  selectionCell.append(checkbox);
  row.append(selectionCell);
  for (let index = 0; index < 8; index += 1) row.append(document.createElement("td"));
  rowContainer.append(row);
  rows.set(fieldIdentity, row);
  return row;
}

function overrideReason(value: DataRecord): string {
  const application = dataRecord(value["application"]);
  if (application?.["kind"] !== "display-value-override") return "Inactive";
  const identity = application["presentationOverrideIdentity"];
  const overrideList = projection()?.["overrides"];
  if (!Array.isArray(overrideList)) return "Active";
  const match = overrideList
    .map(dataRecord)
    .filter((candidate): candidate is DataRecord => candidate !== null)
    .find((candidate) => candidate?.["presentationOverrideIdentity"] === identity);
  return match === undefined ? "Active" : `Active — ${String(match["reason"])}`;
}

function renderValues(): void {
  const visible = new Set<string>();
  for (const value of values()) {
    const identity = String(value["sourceFieldIdentity"]);
    visible.add(identity);
    const row = rows.get(identity) ?? createRow(identity);
    row.hidden = false;
    const original = dataRecord(value["sourceOriginal"]);
    const effective = dataRecord(value["effectiveDisplay"]);
    const eligibility = dataRecord(original?.["eligibility"]);
    const checkbox = cell(row, 0).querySelector<HTMLInputElement>("input");
    if (checkbox !== null) {
      checkbox.disabled = busy || eligibility?.["state"] !== "eligible";
      checkbox.setAttribute(
        "aria-description",
        eligibility?.["state"] === "eligible"
          ? "Eligible for a display value override"
          : `Ineligible: ${String(eligibility?.["reasonCodes"])}`,
      );
    }
    cell(row, 1).textContent = String(value["fieldPath"]);
    cell(row, 2).textContent = contentText(original?.["content"]);
    cell(row, 3).textContent = String(original?.["valueType"]);
    cell(row, 4).textContent = unitText(original?.["unit"]);
    cell(row, 5).textContent = provenanceText(original?.["provenance"]);
    cell(row, 6).textContent = contentText(effective?.["content"]);
    cell(row, 7).textContent = provenanceText(effective?.["provenance"]);
    cell(row, 8).textContent = overrideReason(value);
  }
  for (const [identity, row] of rows) if (!visible.has(identity)) row.hidden = true;
}

function updateEditorInputs(): void {
  const target = currentTarget();
  const original = dataRecord(target?.["sourceOriginal"]);
  typeInput.value = original === null ? "Select one field" : String(original["valueType"]);
  unitInput.value = original === null ? "Select one field" : unitText(original["unit"]);
  applyButton.disabled = busy;
}

function renderDiagnostics(): void {
  diagnostics.replaceChildren();
  const facts = projection()?.["diagnosticFacts"];
  if (!Array.isArray(facts) || facts.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No Diagnostic facts.";
    diagnostics.append(item);
    return;
  }
  for (const raw of facts) {
    const fact = dataRecord(raw);
    if (fact === null) continue;
    const item = document.createElement("li");
    const affected = dataRecord(fact["affected"]);
    item.textContent = `${String(fact["code"])} — ${String(affected?.["identity"])} — ${String(fact["consequence"])} — remediation: ${String(fact["remediationActionIds"])}`;
    diagnostics.append(item);
  }
}

function render(): void {
  if (currentResult === null) {
    workingRevision.textContent = "Refreshing";
    durableRevision.textContent = "Refreshing";
    dirtyState.textContent = "Refreshing";
    historyState.textContent = "Refreshing";
    undoButton.disabled = true;
    redoButton.disabled = true;
    applyButton.disabled = true;
    return;
  }
  workingRevision.textContent = String(currentResult["workingRevision"]);
  durableRevision.textContent = String(currentResult["durableRevision"]);
  dirtyState.textContent = currentResult["dirty"] === true ? "Yes" : "No";
  const canUndo = currentResult["canUndo"] === true;
  const canRedo = currentResult["canRedo"] === true;
  historyState.textContent = `Undo ${canUndo ? "available" : "unavailable"}; Redo ${canRedo ? "available" : "unavailable"}`;
  undoButton.disabled = busy || !canUndo;
  redoButton.disabled = busy || !canRedo;
  historyReason.textContent = `${canUndo ? "Undo is available." : "Nothing to undo."} ${canRedo ? "Redo is available." : "Nothing to redo."}`;
  renderValues();
  renderDiagnostics();
  updateEditorInputs();
}

function acceptedResult(input: unknown): input is PublicResult {
  const value = dataRecord(input);
  const projected = dataRecord(value?.["projection"]);
  return (
    value?.["accepted"] === true &&
    (value["kind"] === "projection" || value["kind"] === "committed") &&
    Number.isSafeInteger(value["workingRevision"]) &&
    projected !== null &&
    projected["workingRevision"] === value["workingRevision"] &&
    projected["durableRevision"] === value["durableRevision"] &&
    projected["dirty"] === value["dirty"] &&
    projected["canUndo"] === value["canUndo"] &&
    projected["canRedo"] === value["canRedo"] &&
    projected["eventSequence"] === value["eventSequence"]
  );
}

function rejectionMessage(input: unknown): string {
  const value = dataRecord(input);
  return value?.["accepted"] === false && typeof value["code"] === "string"
    ? `Request rejected: ${value["code"]}.`
    : "The document route is unavailable.";
}

async function refetch(
  minimumWorkingRevision: number | null,
  announcement: string,
): Promise<boolean> {
  if (api === undefined) {
    setStatus("The document route is unavailable.");
    return false;
  }
  currentResult = null;
  render();
  const result = await api.getProjection({ minimumWorkingRevision });
  if (!acceptedResult(result) || result["kind"] !== "projection") {
    setStatus(rejectionMessage(result));
    return false;
  }
  currentResult = result;
  render();
  setStatus(announcement);
  return true;
}

async function command(
  operation: "set" | "undo" | "redo",
  execute: () => Promise<PublicResult>,
  focusId: string,
): Promise<void> {
  if (busy) return;
  busy = true;
  let restoreFocus = false;
  render();
  try {
    const result = await execute();
    if (!acceptedResult(result) || result["kind"] !== "committed") {
      setStatus(rejectionMessage(result));
      if (dataRecord(result)?.["code"] === "STALE_WORKING_REVISION") {
        await refetch(null, "Projection refreshed after a stale edit.");
      }
      return;
    }
    const revision = result["workingRevision"] as number;
    restoreFocus = await refetch(
      revision,
      `${operation === "set" ? "Override applied" : operation === "undo" ? "Undo complete" : "Redo complete"} at revision ${revision}.`,
    );
  } finally {
    busy = false;
    render();
    if (restoreFocus) {
      const preferred = element<HTMLElement>(focusId);
      if (!(preferred instanceof HTMLButtonElement) || !preferred.disabled) preferred.focus();
      else if (!undoButton.disabled) undoButton.focus();
      else if (!redoButton.disabled) redoButton.focus();
      else refetchButton.focus();
    }
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formError.textContent = "";
  const selected = [
    ...rowContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ].filter((checkbox) => checkbox.checked);
  const selectedTarget = validateTargetSelection(
    selected.length,
    dataRecord(currentTarget()?.["sourceOriginal"])?.["eligibility"] === undefined
      ? null
      : dataRecord(dataRecord(currentTarget()?.["sourceOriginal"])?.["eligibility"])?.["state"],
  );
  if (!selectedTarget.accepted && selectedTarget.code === "TARGET_COUNT_INVALID") {
    formError.textContent = selectedTarget.message;
    (
      selected[0] ?? rowContainer.querySelector<HTMLInputElement>('input[type="checkbox"]')
    )?.focus();
    return;
  }
  const target = currentTarget();
  const original = dataRecord(target?.["sourceOriginal"]);
  const eligibility = dataRecord(original?.["eligibility"]);
  if (
    target === null ||
    original === null ||
    eligibility?.["state"] !== "eligible" ||
    !selectedTarget.accepted
  ) {
    formError.textContent = selectedTarget.accepted
      ? "The selected field is not eligible for a Display Value Override."
      : selectedTarget.message;
    selected[0]?.focus();
    return;
  }
  const validation = validateReplacement(
    original["valueType"],
    replacementInput.value,
    reasonInput.value,
  );
  if (!validation.accepted) {
    formError.textContent = validation.message;
    element<HTMLElement>(validation.focusId).focus();
    return;
  }
  if (api === undefined || currentResult === null) return;
  void command(
    "set",
    () =>
      api.setDisplayValue(
        Object.freeze({
          expectedWorkingRevision: currentResult?.["workingRevision"],
          localOverrideIdentity: "urn:rsrender:bld-021:local-override:semantic-editor",
          targetSourceFieldIdentity: target["sourceFieldIdentity"],
          expectedSourceValueDigest: target["sourceBaselineValueDigest"],
          expectedSourceValueType: original["valueType"],
          expectedSourceUnit: original["unit"],
          replacementContent: validation.replacementContent,
          replacementUnit: original["unit"],
          reason: validation.reason,
        }),
      ),
    "override-value",
  );
});

undoButton.addEventListener("click", () => {
  if (api === undefined || currentResult === null) return;
  const expectedWorkingRevision = currentResult["workingRevision"] as number;
  void command("undo", () => api.undo({ expectedWorkingRevision }), "undo");
});

redoButton.addEventListener("click", () => {
  if (api === undefined || currentResult === null) return;
  const expectedWorkingRevision = currentResult["workingRevision"] as number;
  void command("redo", () => api.redo({ expectedWorkingRevision }), "redo");
});

refetchButton.addEventListener("click", () => {
  if (busy) return;
  busy = true;
  render();
  void refetch(null, "Full projection refreshed.").finally(() => {
    busy = false;
    render();
    refetchButton.focus();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const target = currentTarget();
  const effective = dataRecord(target?.["effectiveDisplay"]);
  replacementInput.value = effective === null ? "" : contentText(effective["content"]);
  reasonInput.value = "";
  formError.textContent = "Draft cleared; committed projection is unchanged.";
  replacementInput.focus();
});

void refetch(null, "Full projection loaded.");
