import {
  RSLOG_SOURCE_SELECTION_BOOTSTRAP_CHANNEL,
  RSLOG_SOURCE_SELECTION_CANCEL_CHANNEL,
  RSLOG_SOURCE_SELECTION_SUBMIT_CHANNEL,
} from "./rslog-source-selection-route.js";

export const generatedRsLogSourceSelectionPreloadRevision =
  "bld-051-generated-source-selection-preload-v1" as const;

export function generateRsLogSourceSelectionPreloadSource(): string {
  return `"use strict";
const { ipcRenderer } = require("electron");
const BOOTSTRAP = ${JSON.stringify(RSLOG_SOURCE_SELECTION_BOOTSTRAP_CHANNEL)};
const SUBMIT = ${JSON.stringify(RSLOG_SOURCE_SELECTION_SUBMIT_CHANNEL)};
const CANCEL = ${JSON.stringify(RSLOG_SOURCE_SELECTION_CANCEL_CHANNEL)};
let consumed = false;
function disable(message) { consumed = true; for (const id of ["submit", "cancel", "select-all", "clear-all"]) { const button = document.getElementById(id); if (button instanceof HTMLButtonElement) button.disabled = true; } const status = document.getElementById("selection-status"); if (status) status.textContent = message; }
function selectedIds() { return [...document.querySelectorAll('#selection-options input:checked')].map((input) => input instanceof HTMLInputElement ? input.value : "").filter(Boolean); }
window.addEventListener("DOMContentLoaded", async () => {
  let binding = null; try { binding = await ipcRenderer.invoke(BOOTSTRAP); } catch { binding = null; }
  if (!binding || binding.accepted !== true || !["project", "explorations"].includes(binding.mode) || typeof binding.capability !== "string" || !/^[0-9a-f]{64}$/.test(binding.capability) || !Array.isArray(binding.options)) { disable("RSLog source selection is unavailable."); return; }
  const multiple = binding.mode === "explorations"; const title = document.getElementById("selection-title"); const help = document.getElementById("selection-help"); const actions = document.getElementById("selection-actions"); const fieldset = document.getElementById("selection-options");
  if (title) title.textContent = multiple ? "Choose explorations" : "Choose a Source Project"; if (help) help.textContent = multiple ? "All explorations are selected by default. Clear any you do not want to import." : "Choose the exact RSLog project to retrieve."; if (actions) actions.hidden = !multiple;
  for (const [index, option] of binding.options.entries()) { if (!option || typeof option.id !== "string" || typeof option.label !== "string" || typeof option.description !== "string") { disable("RSLog source selection is unavailable."); return; } const label = document.createElement("label"); label.className = "option"; const input = document.createElement("input"); input.type = multiple ? "checkbox" : "radio"; input.name = "source-option"; input.value = option.id; input.checked = multiple || index === 0; const copy = document.createElement("span"); const strong = document.createElement("strong"); strong.textContent = option.label; const small = document.createElement("small"); small.textContent = option.description; copy.append(strong, small); label.append(input, copy); fieldset?.append(label); }
  document.getElementById("select-all")?.addEventListener("click", () => document.querySelectorAll('#selection-options input[type="checkbox"]').forEach((input) => { if (input instanceof HTMLInputElement) input.checked = true; }));
  document.getElementById("clear-all")?.addEventListener("click", () => document.querySelectorAll('#selection-options input[type="checkbox"]').forEach((input) => { if (input instanceof HTMLInputElement) input.checked = false; }));
  document.getElementById("selection-form")?.addEventListener("submit", async (event) => { event.preventDefault(); if (consumed) return; const ids = selectedIds(); if (ids.length < 1) { const status = document.getElementById("selection-status"); if (status) status.textContent = "Select at least one item."; return; } disable("Loadingâ€¦"); try { await ipcRenderer.invoke(SUBMIT, { capability: binding.capability, payload: { selectedIds: ids } }); } catch {} });
  document.getElementById("cancel")?.addEventListener("click", async () => { if (consumed) return; disable("Cancelingâ€¦"); try { await ipcRenderer.invoke(CANCEL, { capability: binding.capability, payload: {} }); } catch {} });
});
`;
}
