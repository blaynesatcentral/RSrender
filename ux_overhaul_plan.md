# RSrender Boring Log Studio — UX & Presentation Overhaul

Tracking issue: [#100 — BLD-059](https://github.com/blaynesatcentral/RSrender/issues/100)

> **For the implementing agent.** This plan is the output of a UX/presentation review of the packaged app (source + live screenshots). It is **presentation only** — no new commands, no behavior changes, no renderer or PDF changes.
>
> **Read these before writing code, in this order:**
> 1. **Constraints** and **⚠ Test coupling** below — both contain hard blockers that will fail `npm run verify` if ignored (locked dependency graph; 293 frozen element IDs; ~410 packaged probes; 13 test files that regex the CSS *source text*).
> 2. `docs/planning/specifications/layout-studio-ux-specification.md` §8, §18, §19 — normative behavior. Its scope line explicitly excludes the *visual brand system*, so the look is ours to define; the behavior is not.
> 3. `CONTEXT.md` — the ubiquitous-language glossary. Domain nouns (Boring Log, Log Project, Key Element, Log Column, Page Region, Source Original) are locked, including the per-term *Avoid* lists. The microcopy pass in Phase 7 must not drift to synonyms.
>
> **Primary files:** `packages/renderer-ui/src/boring-log-studio.css` (1,722 lines), `boring-log-studio-route.ts` (the entire app chrome as one template literal), `boring-log-studio-entry.ts` (6,951 lines, all dynamic DOM).
>
> **Start with Phase 0.** The test suite is already red on one CSS-coupled assertion; establish a green baseline before changing anything visual.
>
> **Direction was chosen by the product owner** (see *Direction (confirmed)*): 2-tier ribbon, "refined technical" look built on the existing app-icon palette, full presentation overhaul including shell restructuring.

## Context

RSrender's Layout Studio is functionally deep and its *output* is excellent — `ai-generated-boring-log-design-render.png` is a restrained, precise, typographically disciplined engineering document. The application chrome around it does not meet that bar. Reviewing the live UI (`.tmp/luna-*.png` captures of the packaged app) alongside the source, the gap is entirely in the presentation layer, and parts of it are visibly broken, not merely unpolished.

**What the running app actually shows:**

- **The Data ribbon clips its own controls off-screen.** `.data-control-grid` is `repeat(8, minmax(86px, 1fr))` (688px min) sitting beside `.data-summary-group { min-width: 430px }`. In `luna-data-click.png` only 4 of 8 fields render; **Total depth, Completed, Scale, and the *Apply data* button are cut off the right edge and unreachable.** The group caption truncates mid-word.
- **Ribbon group captions print through the button labels.** `.ribbon-group small` is `position: absolute; bottom: 2px` beneath 56px buttons whose labels wrap. In `luna-layout-click.png`, "Align to Key Element" strikes through *Right / Top / Middle*; "Same size and distribute" strikes through *Both / Horizontal*; "Page view" strikes through *Fit Page / Actual*.
- **404px of chrome sits above the canvas** (40 titlebar + 34 tab strip + 220 ribbon + 42 boring nav + 34 canvas tab + 34 canvas toolbar) on a document-centric app. The page itself is additionally capped at `width: min(660px, 88%)`, so at 60% zoom the document — the product — occupies roughly a quarter of the window between two dead gray gutters. Zoom is reported twice, in `#canvas-scale` and `#zoom-value`.
- **The contents tree is unreadable.** `humanize()` (`boring-log-studio-tree.ts:19-21`) converts semantic IDs into user-facing labels, producing six consecutive rows reading `Lithology:Str…`, `Lithology:Stra…`, `Lithology:Stra…` — visually identical and indistinguishable — plus `Sample:Sample 01`. Every leaf shares the same `·` glyph.
- **Internal node IDs are displayed in the status bar.** `Lithology:Stratum 01 · node:lithology:stratum-01:description-fill`, `Column Lithology · node:column-lithology:frame`.
- **Errors are invisible.** `#editor-status` carries ~150 messages — every rejection, failure, progress and gesture-coaching string — and its rule is `position:absolute; width:1px; height:1px; clip-path: inset(50%)`. It is a screen-reader-only region. *`Page Setup failed: PAGE_SETUP_UNAVAILABLE`, `Column heading must contain 1 through 80 characters`, every "Esc cancels" hint — no sighted user ever sees any of it.* The app has no visible error surface and no toast, banner, or dialog anywhere.
- **The Smart Snap / 1 pt Grid toggles look identical on and off.** The markup ships `class="is-active"` and `aria-pressed`, but there is no `.ribbon-group button.is-active` rule and **zero `[aria-pressed]` selectors** in the stylesheet.

**What the source shows:**

- **No design system.** `boring-log-studio.css` (1,722 lines) declares **zero CSS custom properties** across **184 distinct hex colors / 263 occurrences** — including **37 distinct accent blues** all doing the job of "primary" (five different "active tab underline" blues, no two identical), ~18 near-identical border grays, three different `accent-color` values, and **12 box-shadows with zero repeats**. There is **no danger/error color in the stylesheet at all** — the UI has no vocabulary for failure.
- **Placeholder iconography.** Every icon is a Unicode character typed into markup — `＋ ▤ ⇄ ⇥ ▣ ▧ ▱ ▥ ⧉ ✂ ⧈ ⫰ ⌫ ↶ ↷ ⊹ ⊢ ⊡ ⊣ ◉ ⊘ 🔒 🔓 ⇧ ⇩ ⌁ ▦ ☑ ☐ ↖ ✋ ⌕ |◀ ▶|`. `🔒 ✂ ✋ ☑` render as **color emoji** beside monochrome neighbors (clearly visible as orange padlocks in the tree). Zoom uses `−` (U+2212) paired with `＋` (U+FF0B fullwidth). Glyphs collide: `▣` is **Save** *and* **Group**; `□` is **Ungroup**, **Fit Page** *and* **Match Both**; `↕` is **Vertical Guide**, **Project Order**, **Match Height** *and* **Distribute Vertical**.
- **Type too small, no scale, no rhythm.** 17 distinct sizes with no ratio (`8/9/10/11/12/13/15/16/18/20/34`), dominated by **11px (17×), 10px (15×), 9px (6×)** — 9px is used for *form field labels*. No `line-height` on `:root` or `body`, so 289 of 296 rules inherit UA default. 42 distinct padding values, 23 margins, 15 gaps, including every odd number 1–9. All hardcoded `px`, so the spec's own "UI reflows through actual 200% text" cannot hold.
- **Nothing moves.** Zero `transition`, zero `@keyframes`, zero `animation`. No `:active` rule anywhere — no press feedback in the entire app.
- **No focus system.** `:focus-visible` exists on 4 elements in 3 different colors. **Every one of the 54 `<input>` and 26 `<select>` elements has no `:focus` style whatsoever**, and `.search input { outline: 0 }` removes the native ring from the Contents filter with nothing replacing it.
- **A second window with no stylesheet.** `semantic-override-editor-route.ts` has no `<link rel="stylesheet">` — raw browser-default HTML, Times New Roman, `<br>`-based form layout.
- **Two more windows with their own near-miss palettes.** `rslog-auth-entry-route.ts:176-200` and `rslog-source-selection-route.ts:201-212` carry inline CSS with a *different* blue (`#1261a0` / `#1769aa`) and a *different* brand mark (`R`, not `RS`). Three stylesheets, three palettes, one product.
- **Copy written as specification prose**, with real defects: raw error codes (`COLUMN_DIVIDER_UNAVAILABLE`, `PAGE_GUIDES_UNAVAILABLE`, `STALE_WORKING_REVISION`), internal IDs (`Applying text properties to ${node.id}…`), the internal `mpt` unit surfaced where the UI elsewhere says `pt`, both *canceled* and *cancelled*, `…` and `...` on adjacent lines, and a **mojibake bug** at `entry.ts:5573` shipping `Detaching node:… as a free annotationâ€¦`. The OS window title is `"RSrender semantic override editor"` (`semantic-editor-main.ts:5632`) — **the taskbar shows the wrong product name.**
- **Unused brand.** `tooling/rsrender-app-icon.mjs` already contains a well-drawn SVG mark with a distinctive palette — deep navy `#17324d`, warm paper `#f8f5ee`, teal `#4f8e9d`, terracotta `#e07845`, amber `#f5bd45`. The titlebar ignores it and renders the literal text `RS` in a box.

**Intended outcome:** chrome as deliberate as the logs it renders — one coherent design system, original iconography, a readable type scale, calm motion, a visible feedback surface, and microcopy written for users. Presentation only: no new commands, no behavior changes.

## Direction (confirmed)

- **Ribbon:** proper 2-tier ribbon — large tiles for primary commands, stacked small rows for secondary, per-group overflow chevron, dense form grids moved into launched popovers. **~92px, never scrolls.**
- **Look:** *Refined technical.* Keep the Windows-desktop-tool character, rebuilt on the app icon's own palette. Dense, calm, precise — an engineering tool, not a web app.
- **Scope:** full presentation overhaul, including shell restructuring. **404px of chrome → 204px, giving the canvas ~200px back.**

## Constraints (verified, non-negotiable)

1. **No new dependencies — this is enforced, not advisory.** `docs/governance/bld-001-internal-dependency-admission.json` pins **156 production identities**; `tooling/verify-dependency-admission.mjs` throws `DEPENDENCY_ADMISSION_MISMATCH` on any identity/integrity/URL delta, and it runs inside `npm run verify`. Adding a workspace edge additionally requires named human approval in `bld-007-workspace-topology-approvals.json`. **No Tailwind, no icon package, no component library, no CSS tooling, no font package.** Hand-authored CSS and inline SVG only.
2. **No renderer network.** ADR-0008 — renderers have "no renderer network", denied navigation and permissions. No web fonts, no CDN assets. Stay on a system stack (`"Segoe UI Variable Text", "Segoe UI", system-ui, Arial, sans-serif`).
3. **Icons must be original work.** `docs/planning/research/ownership-licensing-clean-room-commercialization.md` prohibits "Copying, tracing, extracting… Esri or Rocscience code, **icons, cursors, screenshots**", and UX spec §1 states RSrender "does not copy Esri code, assets, strings, **icons**, formats, branding, interaction styling, or trade dress." Draw from scratch on a neutral geometric grid.
4. **The UX spec governs behavior, not looks.** `docs/planning/specifications/layout-studio-ux-specification.md` scope line: *"Not in scope: … visual brand system."* The visual system is ours to define. Its behavioral clauses are binding — and four are currently violated (see below). §22 forbids reinterpreting the interaction model, substituting a canvas framework, or adding context-only commands.
5. **Element IDs are the app's API.** `boring-log-studio-route.ts` emits **293 `id="…"` attributes**; `boring-log-studio-entry.ts` binds ~120 of them through `element<T>(id)` at line 551. `semantic-editor-main.ts` runs **~410 `querySelector`/`getElementById` probes** inside `executeJavaScript` packaged-qualification checks, several asserting **literal `textContent`** (e.g. `document.getElementById("editor-status")?.textContent === "Full projection loaded."`). **Freeze every `id`, `aria-*`, `.scene-node`, `.publication-page`, `.sr-only`, `.scene-data-hit-target`, and `data-node-role`.** Classes and within-region structure are free.
6. **Renderer ↔ document separation.** ADR-0007 — DOM/SVG are "disposable projections, never document truth"; a screenshot-only golden is rejected. Nothing here touches `packages/scene`, page geometry in `boring-log-svg-projection.ts`, or PDF output. `.scene-node` / `.direct-manipulation-*` / `.page-guide` rules live in page coordinate space (four-digit stroke widths are correct, not bugs) — restyle their *colors* from tokens, never their geometry.

## ⚠ Test coupling — read before starting

**The test suite asserts on CSS and HTML source text with regexes.** 13 files read `boring-log-studio.css` / `boring-log-studio-route.ts` verbatim:

```js
// tests/bld-053-responsive-shell.test.mjs
assert.match(stylesheet, /font-size:\s*clamp\(9px,/u);
assert.match(stylesheet, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(72px,\s*1fr\)\)/u);
// tests/bld-046-studio-viewport-controls.test.mjs
assert.match(stylesheet, /@container properties-pane \(max-width: 340px\)/u);
// tests/bld-031-studio-interactions.test.mjs
assert.match(html, /<details class="property-group"><summary>Advanced diagnostics<\/summary>/u);
```

Files to update in lockstep: `bld-025`, `bld-031`, `bld-034`, `bld-038-direct-manipulation`, `bld-038-page-guides`, `bld-039-column-resize`, `bld-039-region-resize`, `bld-040`, `bld-046`, `bld-047`, `bld-048`, `bld-049`, `bld-053`.

**The suite is already red.** `bld-046:162` asserts `.ribbon { overflow-x: auto }` while BLD-053 changed it to `hidden` and `bld-053` asserts the opposite — `bld-046` currently reports **4 pass / 1 fail**. Fix that contradiction first so there is a clean baseline to measure against.

**Recommendation:** as these assertions are touched, convert the brittle ones from *"this exact declaration exists"* to *"this token/behavior exists"* (e.g. assert `--rs-text-xs` is defined and referenced, not that a literal `clamp(9px,` string is present). Otherwise the next restyle re-breaks them.

---

## Phase 0 — Baseline

Fix the `bld-046` / `bld-053` `overflow-x` contradiction so `npm test` is green before any visual change lands. Capture reference screenshots of Home / Layout / Data / Review / Publish, the Properties pane populated, and the Attribute Table open, for before/after comparison.

## Phase 1 — Design tokens

**New file:** `packages/renderer-ui/src/design-tokens.css`, imported first from `boring-log-studio.css`.

Derive the palette from the existing app-icon mark in `tooling/rsrender-app-icon.mjs`. Product spec §14.3 requires branding be *configurable* — tokens satisfy that directly.

| Group | Tokens | Replaces |
|---|---|---|
| Neutrals | `--rs-gray-0…1000`, surfaced as `--rs-surface-{canvas,panel,raised,sunken}`, `--rs-border-{subtle,strong}` | ~18 border grays + 39 background values |
| Brand | navy ramp on `#17324d`; **one** `--rs-accent` (`#4f8e9d` teal) + `--rs-accent-hover` | **37 accent blues** |
| Semantic | `--rs-{danger,warning,success,info}` × `{bg,border,fg}` | 11 spellings of warning, 6 of success, **and a danger color that does not exist today** |
| Canvas overlay | `--rs-canvas-{selection,key-element}`, `--rs-canvas-snap-{baseline,depth,region,guide}` | `#007ac2 #e6007e #00856a #c85b00 #7c3aed #d97706` — kept mutually distinguishable, pulled onto the ramp so magenta/violet stop clashing |
| Type | `--rs-text-xs` (0.75rem) … `--rs-text-2xl`, in `rem`; `--rs-leading-{tight,normal,relaxed}`; `--rs-font-ui`, `--rs-font-numeric` | 17 ad-hoc sizes + 5 bespoke `clamp()`; **floor at 12px** — raise today's 8/9/10px tiers |
| Space | `--rs-space-1…8`, 4px-based | 42 paddings / 23 margins / 15 gaps |
| Radius / elevation | `--rs-radius-{sm,md,lg}`, `--rs-shadow-{1,2,3}` | 5 radii used interchangeably; 12 unrepeated shadows |
| Motion | `--rs-duration-{fast,base}`, `--rs-ease-standard`, zeroed under `@media (prefers-reduced-motion: reduce)` | nothing exists |
| Focus | one `--rs-focus-ring`, applied by a single `:focus-visible` rule | 3 inconsistent rings + 3 `outline: 0` removals |

Then sweep `boring-log-studio.css` substituting tokens throughout. Mechanical; changes no selector.

Also set `line-height` on `:root`, add `::selection`, `::placeholder`, and `caret-color`, and unify the three `accent-color` values to one.

## Phase 2 — Icon system

**New file:** `packages/renderer-ui/src/studio-icons.ts` — a frozen `Record<string, string>` of **originally drawn** inline SVG on a **16×16 grid, 1.5px stroke, `currentColor`, round caps**, matching the geometric-technical language of the app icon.

~55 icons across: file · clipboard · history · arrange (6 align + 3 match + 2 distribute) · order (4) · state (show/hide/lock/unlock) · view (fit/actual/select/pan/zoom) · data (samples/track/table) · review · publish · navigation (first/prev/next/last) · tree (page/region/column/lithology/sample/remark/data-layer/annotation) · utility (search/close/collapse/chevron).

**Resolve every collision** — Save ≠ Group; Fit Page ≠ Ungroup ≠ Match Both; Vertical Guide ≠ Project Order ≠ Match Height ≠ Distribute Vertical. Each of ~55 commands gets a unique, legible mark. No emoji.

Apply by replacing the glyph spans in `boring-log-studio-route.ts:37-54` and `:59-65,84,133`, and by feeding real icon names through `BoringLogStudioTreeItem.icon` (`boring-log-studio-tree.ts:99,106,121,129,138` and the `·` leaf at `:66,82`). Swap `.brand-mark`'s text `RS` (`route.ts:24`) for the real SVG mark, and replace the CSS-box `.page-icon` with a drawn glyph.

## Phase 3 — Shell restructure (404px → 204px)

| Band | Now | After |
|---|---|---|
| Titlebar | 40px | 40px — real mark; document name as `h1` at `--rs-text-base`; dirty state as **icon + text**, not the color-only `.saved-dot`; drop the hardcoded, never-updated `Structured scene · Page 1 of 1` |
| Ribbon tabs | 34px | 34px |
| Ribbon | **220px, scrolls, clips** | **92px, never scrolls** |
| Boring nav | 42px | ─┐ |
| Canvas tab | 34px | ├ **38px merged** |
| Canvas toolbar | 34px | ─┘ |
| **Total** | **404px** | **204px** |

**Ribbon (2-tier).** Large 56px tiles for primary commands; secondary commands as stacked 20px small rows with inline label; a per-group overflow chevron. Move `.page-setup-grid` (9 controls) and `.data-control-grid` (8 controls + Apply) — currently 10px inputs crammed into the ribbon, with the Data set clipping off-screen — into **launched popovers**, one ribbon button each. Fix `.ribbon-group small` so captions can never overlap labels (reserve the caption band in the group's grid rather than absolutely positioning it). Add the missing `.ribbon-group button.is-active` / `[aria-pressed="true"]` rules so Smart Snap and 1 pt Grid read as on/off, with a non-color cue.

**Merged canvas header (38px).** One strip: page title · boring first/prev/selector/next/last · position · Select/Pan · zoom. Delete the duplicate zoom readout — keep one. Drop the leading ordinal (`1. BORING LOG TEST-01`) from inside the search input.

**Canvas stage.** Remove the `width: min(660px, 88%)` cap so the page uses available width; keep `place-items: start center` and the 28px gutter.

**Status bar (28px).** The zoom slider is `height: 3px` and its buttons `width: 23px` with no height — both fail spec §18. Rebuild at ≥24px targets. **Stop printing raw node IDs** (`node:column-lithology:frame`) — show the human label only, with the ID behind Advanced diagnostics where it already lives.

**`.publication-package-panel`** is absolutely positioned at a magic `top: 198px` tied to the old ribbon height — anchor it to its trigger.

## Phase 4 — Visible feedback (highest leverage, smallest change)

`#editor-status` is `.sr-only` and carries ~150 messages including every error. **Keep it exactly as-is for screen readers** — it is asserted by packaged probes and by spec §18's announcement contract — and add a **visible status surface bound to the same writes**:

- A persistent status line in the merged canvas header for transient confirmations and gesture coaching (`Esc cancels`, `release commits one Undo step`).
- A transient inline banner, severity-colored from the new `--rs-danger` / `--rs-warning` tokens, for rejections and failures — dismissible, non-blocking, never a modal.
- A determinate progress treatment for PDF export.

Also add `:active` press feedback (currently zero rules) and `[aria-pressed]` styling (currently zero rules) app-wide.

## Phase 5 — Panels, inspector, controls

- **Properties pane.** Eight `<details … open>` render at once; *"Position & text frame"* alone holds ~22 controls in a 2-column 11px grid, and scrolling orphans fragments like a bare `applies to this depth interval` at the top of the viewport. Add the persistent scope header spec §8.1 already mandates, expand only the 2–3 sections relevant to the selection, remember per-type state.
- **Form controls.** Unify six treatments (`.page-setup-grid` 22px/10px, `.data-control-grid` 22px/10px, `.text-style-grid` 11px, `.property-group textarea`, `.attribute-table-header` 26px, `#boring-selector` 28px) into one spec at ≥28px height and 12px text, **with `:hover` / `:focus-visible` / `:disabled` / `:invalid` states on every input and select** — none have any today. Restore a focus ring to `.search input`. Style `<input type="color">`, which currently renders as a raw native swatch.
- **Buttons.** Three variants — primary, secondary, quiet — replacing the one-offs. Unify the five different disabled treatments (`opacity: 0.4` vs `0.45` on adjacent button sets; `cursor: not-allowed` on exactly one of five).
- **Context menu.** 23 flat `menuitem`s with 3 `<hr>`s in a scrolling 420px popup → submenus: Arrange ▸, Order ▸, State ▸.
- **Attribute table.** `#close-attribute-table` and `.attribute-table-go-to` occupy the **same grid area** separated by a hardcoded `margin-left: 62px` — give close its own column. Add visible sort indicators (only `cursor: pointer` signals sortability today). Fix `height: attr(data-height px)` at `:1340` — it has **no fallback**, so a missing attribute collapses the dock to `auto`; `entry.ts:6654` already sets `style.height` inline against it. Pick one mechanism.
- **Splitters.** Widen the 6px hit area to 8–10px with a transparent overlay, keeping the 1px visual seam.
- **Tree.** Replace the fixed `.tree-level-1..4` ladder (`7/22/37/52px`, nothing beyond depth 4) with a computed depth variable. Add `role="group"`, `aria-setsize`, `aria-posinset`.
- **Empty states.** `.empty-selection` uses a 34px `⌁` character as illustration — replace with drawn SVG, and give the diagnostics list, attribute table, and tree first-class empty states.

## Phase 6 — Motion

First motion in the app, all token-driven, all disabled under `prefers-reduced-motion` (spec §18: *"Reduced motion removes ornamental transitions but retains state-change cues"*).

- 120ms color/background transitions on buttons, tree rows, tabs, table rows.
- 180ms panel/popover entry (opacity + 4px translate) for the publication panel, ribbon popovers, context menu, hover card, and the new status banner.
- Consistent stroke weights on canvas selection / hover / key-element states.

## Phase 7 — Microcopy

Rewrite user-facing strings to product voice: second person, present tense, ≤2 lines, no internal jargon, no raw identifiers, no history bookkeeping.

| Now | Becomes |
|---|---|
| `Arrangement produced no geometry change; history was not modified.` | `Nothing to align — the selection is already aligned.` |
| `Column width must be an integer from 100000 through 230000 mpt.` | `Enter a width between 100 and 230 pt.` |
| `Choose silt-horizontal-dash, sand-dot-ring, or gravel-dot-ring.` | `Choose a hatch pattern.` |
| `Editable structured boring log scene loaded from main authority.` | `Boring log ready.` |
| `Page Setup failed: PAGE_SETUP_UNAVAILABLE. The document was not changed.` | `Couldn't apply page setup. Nothing was changed.` |
| `Guide gesture canceled; document history was unchanged.` | `Guide canceled.` |

Specific defects to fix:

- **Mojibake** at `entry.ts:5573` — ships `annotationâ€¦` (double-encoded ellipsis).
- **Dead string** — `sceneSummary.textContent` is set twice on consecutive lines at `entry.ts:4885/4886` and `6928/6929`; the better `·`-separated version is always overwritten.
- **Wrong window title** — `semantic-editor-main.ts:5632` sets `"RSrender semantic override editor"` on the window that loads the Studio; the taskbar shows the wrong product.
- Pick one of *canceled* / *cancelled*; one of `…` / `...` (both appear on adjacent lines at `entry.ts:5470-5479`).
- Stop surfacing `mpt` where the UI says `pt`; stop interpolating `node.id` into status text.
- Canvas title format is inconsistent — `BORING LOG TEST-01 — Page 1` vs `BORING LOG TEST-01 - 1 page`.
- Fix `Apply changes only the effective display value.` (`semantic-override-editor-route.ts:52`).
- **`humanize()` (`boring-log-studio-tree.ts:19-21`)** produces `Sample:Sample 01` and six identical truncated `Lithology:Str…` rows. Map record kinds to authored labels (`Sample S-1`, `Stratum 2 — Silt (ML)`).
- Trim the paragraph-length `.property-help` blocks (the Log Column geometry help is 38 words of spec prose) to one sentence, detail behind a disclosure.

**Every string change must be mirrored** in the `semantic-editor-main.ts` packaged probes that compare `textContent` literally.

## Phase 8 — Secondary windows & system integration

- **`semantic-override-editor-route.ts` has no stylesheet.** Link a shared `studio-base.css`, replace `<br>`-based form layout with the Phase 5 control spec.
- **Unify `rslog-auth-entry-route.ts` and `rslog-source-selection-route.ts`** onto the token layer — they carry inline CSS with a different blue (`#1261a0`/`#1769aa`) and a different `R` mark. One product, one palette, one mark.
- **`@media (forced-colors: active)`** — spec §18 requires acceptance against "actual Contrast Themes"; there is no `forced-colors` handling anywhere today. Selection, focus, lock, and diagnostic states must survive.
- **Dark theme** — not required by any spec clause. Once Phase 1 lands it is a `:root[data-theme="dark"]` block; note that `color-scheme: light` is currently hard-locked at `:2`. Recommend a follow-up, not a gate.

---

## Spec compliance this work fixes

`layout-studio-ux-specification.md` §18 is normative and violated in four places today:

1. *"never rely on colour alone"* — `.saved-dot` (dirty), `.status-ready` (readiness), `.tree-row.is-locked-element .layer-icon` (lock), and the invisible on/off state of the snap toggles. → **Phases 2, 3.**
2. *"UI reflows through actual 200% text"* — all type hardcoded `px`. → **Phase 1.**
3. *"Pointer targets, resize handles, and focus indicators remain usable"* — 3px slider, 23px buttons, 6px splitters, no focus ring on 80 form controls. → **Phases 3, 5.**
4. *"Reduced motion removes ornamental transitions but retains state-change cues"* — no motion, no reduced-motion handling. → **Phase 6.**

Product spec §15's *"no color-only state or transient-only error communication"* is also violated by the `.sr-only` status region → **Phase 4.**

**Logged, not in scope here** (feature gaps, not presentation gaps): spec §2.1 also requires a **main menu** (`Menu.setApplicationMenu(null)` at `semantic-editor-main.ts:5544` — there is none), **command search** (Ctrl+Shift+P), **document tabs**, a **Jobs surface**, **Recovery Review**, and a **start surface**; and states the command bar must *"never [be] the only route"* — today the ribbon is. Also the two-workspace Production / Advanced Design split does not exist. Worth separate tickets.

## Sequencing

Phases 1, 2, and 4 deliver most of the perceived quality jump, are independently shippable, and Phase 4 is the smallest change with the largest functional gain. Phase 3 is the largest structural edit — land it as one change so shell proportions stay coherent. Phases 5–8 are incremental.

## Files

| File | Change |
|---|---|
| `packages/renderer-ui/src/design-tokens.css` | **new** — token layer |
| `packages/renderer-ui/src/studio-icons.ts` | **new** — original inline SVG icon set |
| `packages/renderer-ui/src/boring-log-studio.css` | rewritten against tokens; ribbon tiers, merged header, control/motion/focus/forced-colors rules |
| `packages/renderer-ui/src/boring-log-studio-route.ts` | icon spans, brand mark, ribbon restructure, merged header, heading order (**293 ids unchanged**) |
| `packages/renderer-ui/src/boring-log-studio-tree.ts` | real icon names; authored labels replacing `humanize()` |
| `packages/renderer-ui/src/boring-log-studio-entry.ts` | visible status/banner surface; ribbon popover hosts; microcopy; mojibake + dead-string fixes |
| `packages/renderer-ui/src/semantic-override-editor-route.ts` | stylesheet + control markup |
| `packages/platform-electron-main/src/rslog-auth-entry-route.ts`, `rslog-source-selection-route.ts` | adopt tokens and the shared mark |
| `packages/platform-electron-main/src/semantic-editor-main.ts` | window title fix; update `textContent` probes for changed strings |
| `packages/renderer-ui/src/index.ts` | export new modules |
| `tooling/generate-boring-log-studio-preload-bundle.mjs` | include new CSS/TS in the bundle |
| `tests/bld-{025,031,034,038*,039*,040,046,047,048,049,053}.test.mjs` | update CSS/HTML source assertions; prefer token/behavior assertions over literal-declaration matches |

## Verification

1. **`npm test` green at Phase 0** before any visual change — resolves the pre-existing `bld-046` failure and establishes the baseline.
2. **`npm run verify`** — full gate. **`dependency:verify-admission` must pass unchanged**, proving the 156-identity graph is untouched.
3. **`npm run studio:package:bld049 && npm run studio:test:packaged:bld049`** plus the other `studio:test:packaged:*` variants — the ~410 packaged probes confirm no `id`, `aria-*`, or asserted-string regression.
4. **Visual diff against the Phase 0 reference screenshots** at 1920×1080 and 1366×768, for all five ribbon tabs: chrome height ≈204px, ribbon fits without scrolling, **no clipped controls on the Data tab**, no caption/label overlap on Layout.
5. **Windows display scaling 100 / 125 / 150 / 200%** and text scaling to 200% — reflow with no clipping (spec §18).
6. **Windows High Contrast** — selection, focus, lock, diagnostics remain distinguishable.
7. **Keyboard-only pass** — Tab through titlebar → ribbon tabs → ribbon → tree → canvas → properties → status bar; every stop shows one consistent focus ring, including the Contents filter that has none today.
8. **Error surface check** — force a failure (e.g. a column heading over 80 characters) and confirm it is now *visible*, not only announced.
9. **Reduced motion** toggled in Windows settings — transitions stop, state cues remain.
10. **PDF output byte-identical** to a pre-change publication — the presentation layer must not have touched the renderer.
