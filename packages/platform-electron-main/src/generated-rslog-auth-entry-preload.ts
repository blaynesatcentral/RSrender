import {
  RSLOG_AUTH_ENTRY_BOOTSTRAP_CHANNEL,
  RSLOG_AUTH_ENTRY_CANCEL_CHANNEL,
  RSLOG_AUTH_ENTRY_SUBMIT_CHANNEL,
} from "./rslog-auth-entry-route.js";

export const generatedRsLogAuthEntryPreloadRevision =
  "bld-051-generated-auth-entry-preload-v1" as const;

export function generateRsLogAuthEntryPreloadSource(): string {
  return `"use strict";
const { ipcRenderer } = require("electron");
const BOOTSTRAP = ${JSON.stringify(RSLOG_AUTH_ENTRY_BOOTSTRAP_CHANNEL)};
const SUBMIT = ${JSON.stringify(RSLOG_AUTH_ENTRY_SUBMIT_CHANNEL)};
const CANCEL = ${JSON.stringify(RSLOG_AUTH_ENTRY_CANCEL_CHANNEL)};
let consumed = false;
function text(id) { const element = document.getElementById(id); return element instanceof HTMLInputElement ? element.value : ""; }
function clearSecrets() { for (const id of ["password", "two-factor-code"]) { const element = document.getElementById(id); if (element instanceof HTMLInputElement) element.value = ""; } }
function disableForm(message) { consumed = true; const submit = document.getElementById("submit"); const cancel = document.getElementById("cancel"); if (submit instanceof HTMLButtonElement) submit.disabled = true; if (cancel instanceof HTMLButtonElement) cancel.disabled = true; const status = document.getElementById("auth-status"); if (status) status.textContent = message; }
window.addEventListener("DOMContentLoaded", async () => {
  let binding = null;
  try { binding = await ipcRenderer.invoke(BOOTSTRAP); } catch { binding = null; }
  if (!binding || binding.accepted !== true || !["password", "verification-code"].includes(binding.mode) || typeof binding.capability !== "string" || !/^[0-9a-f]{64}$/.test(binding.capability)) { disableForm("RSLog sign-in is unavailable."); clearSecrets(); return; }
  const passwordFields = document.getElementById("password-fields"); const verificationFields = document.getElementById("verification-fields"); const submit = document.getElementById("submit"); const title = document.getElementById("auth-title");
  if (binding.mode === "verification-code") { if (passwordFields) passwordFields.hidden = true; if (verificationFields) verificationFields.hidden = false; if (submit) submit.textContent = "Verify"; if (title) title.textContent = "Verify RSLog sign-in"; document.getElementById("two-factor-code")?.focus(); } else { document.getElementById("company")?.focus(); }
  document.getElementById("auth-form")?.addEventListener("submit", async (event) => { event.preventDefault(); if (consumed) return; const payload = binding.mode === "password" ? { company: text("company"), username: text("username"), password: text("password") } : { twoFactorCode: text("two-factor-code") }; clearSecrets(); disableForm("Connecting…"); try { await ipcRenderer.invoke(SUBMIT, { capability: binding.capability, payload }); } catch { const status = document.getElementById("auth-status"); if (status) status.textContent = "RSLog sign-in failed."; } });
  document.getElementById("cancel")?.addEventListener("click", async () => { if (consumed) return; clearSecrets(); disableForm("Canceling…"); try { await ipcRenderer.invoke(CANCEL, { capability: binding.capability, payload: {} }); } catch {} });
  window.addEventListener("pagehide", clearSecrets, { once: true });
});
`;
}
