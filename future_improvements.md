# Future improvements

## Reduce UI authority coupling and change cost

The current desktop implementation has accumulated complexity that makes ordinary UI refinement disproportionately expensive:

- `packages/platform-electron-main/src/semantic-editor-main.ts` is approximately 9,403 lines.
- `packages/renderer-ui/src/boring-log-studio-entry.ts` is approximately 7,280 lines.
- Together, those two files contain roughly one fifth of the production code.
- Thirteen test files inspect CSS source text with regular expressions.
- Approximately 293 element IDs are effectively frozen as an application API.
- Approximately 410 packaged-probe assertions depend on literal `textContent` or similarly fragile presentation details.

The resulting problem is not merely file size. Behavior, transport, DOM structure, presentation text, packaging probes, and implementation text are coupled. A visual or interaction change therefore requires broad test rewrites even when the observable product contract has not changed.

### Desired direction

1. Split `semantic-editor-main.ts` into bounded main-process authorities:
   - application/window lifecycle;
   - secure protocol and asset serving;
   - Chromium text measurement;
   - publication/PDF hosting;
   - RSLog authentication and import orchestration;
   - packaged qualification drivers.
2. Split `boring-log-studio-entry.ts` by user-facing capability:
   - shell and pane layout;
   - selection synchronization;
   - Properties editors;
   - canvas navigation and direct manipulation;
   - attribute table;
   - publication workflow;
   - project lifecycle and RSLog import.
3. Replace raw element-ID coupling with a small typed semantic UI adapter. IDs may remain implementation details, while tests and packaged probes use stable actions and observations such as `selectOccurrence`, `setTypography`, `readSelection`, and `exportPackage`.
4. Replace CSS-source regular expressions with behavioral and computed-style assertions. Keep source-text checks only for security invariants that genuinely require static inspection.
5. Replace literal status-copy assertions with stable result codes plus separately tested accessible messages. Product wording should be editable without changing command semantics.
6. Move packaged probes behind reusable page objects and semantic probe helpers. One helper should own each selector and normalize DOM observations into a compact evidence record.
7. Prefer focused component/contract tests for most behavior, retaining a smaller set of packaged end-to-end tests for complete critical paths.

### Guardrails

- Preserve renderer-neutral Page Plan and Resolved Page Scene authority.
- Preserve the command/history boundary, source-original versus effective-override provenance, and current process/security boundaries.
- Refactor by vertical seam with characterization tests; do not replace the working application with a disconnected rewrite.
- Keep selectors required for accessibility or automation stable through the adapter, not by treating every DOM ID as public API.
- Do not weaken PDF, geometry, font, provenance, or package verification while reducing presentation coupling.

### Suggested sequence

1. Inventory the current main-process responsibilities, DOM selectors, CSS-regex assertions, and literal probe assertions.
2. Introduce typed page-object and probe-observation adapters without changing behavior.
3. Migrate packaged probes and browser-facing tests to those adapters.
4. Extract Chromium measurement and publication hosting from `semantic-editor-main.ts`.
5. Extract Properties, canvas interaction, attribute-table, and publication controllers from `boring-log-studio-entry.ts`.
6. Replace CSS-source assertions with computed-style or screenshot/geometry assertions where appropriate.
7. Add architectural size/coupling budgets to prevent the two files and selector surface from growing back.

### Completion indicators

- Neither oversized file is a cross-capability implementation hub.
- UI wording and internal DOM restructuring can change without rewriting unrelated behavioral tests.
- Packaged probes consume semantic actions/observations rather than scattered selectors and literal copy.
- CSS is tested primarily through computed behavior and visual geometry, not regex matching.
- The number of selectors treated as stable automation API is intentionally small, documented, and typed.
- A typical Properties or ribbon redesign affects its controller and focused tests, not dozens of unrelated package probes.
