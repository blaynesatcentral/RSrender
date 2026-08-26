import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("BLD-063 owns one tokenized focus, control, wrapping, and motion contract", async () => {
  const stylesheet = await readFile(
    new URL("../packages/renderer-ui/src/boring-log-studio.css", import.meta.url),
    "utf8",
  );
  for (const token of [
    "--rs-font-ui",
    "--rs-text-xs",
    "--rs-brand-navy",
    "--rs-accent",
    "--rs-surface-panel",
    "--rs-border-strong",
    "--rs-danger-bg",
    "--rs-warning-bg",
    "--rs-success-bg",
    "--rs-info-bg",
    "--rs-focus-ring",
    "--rs-duration-fast",
  ]) {
    assert.match(stylesheet, new RegExp(`${token}:`, "u"));
  }
  assert.match(
    stylesheet,
    /button:focus-visible,[\s\S]*input:focus-visible,[\s\S]*select:focus-visible,[\s\S]*textarea:focus-visible,[\s\S]*summary:focus-visible,[\s\S]*\[tabindex\]:focus-visible\s*\{[^}]*box-shadow:\s*var\(--rs-focus-ring\)/u,
  );
  assert.match(
    stylesheet,
    /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\):not\(\[type="range"\]\):not\(\[type="color"\]\),[\s\S]*min-height:\s*28px/u,
  );
  assert.match(stylesheet, /input:invalid:not\(:focus\)[\s\S]*--rs-danger-border/u);
  assert.match(stylesheet, /input\[type="color"\][\s\S]*min-height:\s*32px/u);
  assert.match(
    stylesheet,
    /\.property-group label,[\s\S]*\.text-style-grid label\s*\{[^}]*overflow-wrap:\s*break-word[^}]*word-break:\s*normal/u,
  );
  assert.match(
    stylesheet,
    /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*--rs-duration-fast:\s*0ms;[\s\S]*--rs-duration-base:\s*0ms;/u,
  );
});
