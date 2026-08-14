# Issue #34 accessibility-validation findings

**Status:** disposable evidence, not application implementation

**Observed:** 2026-08-13 on the available Windows desktop and browser surface

**Harness:** [`accessibility-harness.html`](accessibility-harness.html), with `?variant=A`, `?variant=B`, and `?variant=C`

## Question and verdict

Can the issue-18 DOM-first interaction approach support keyboard completion, useful roles/names/states, stable focus, restrained live announcements, forced-color adaptation, 200% UI text, and display-scale separation well enough to remove accessibility risk from the implementation frontier?

**No—not yet.** The DOM-first stack remains viable and the core tasks are keyboard-operable in this synthetic harness, but the evidence is not release-complete:

- no screen reader was audibly or braille-tested;
- actual Windows forced-colors mode and actual 200% browser/system text scaling were not available through the controlled surface;
- the nine-item fixture produced 44 unique sequential Tab targets, which will not scale to professional logs;
- re-rendering on every nudge initially lost a command and destabilized focus;
- live-region scheduling and blur-only property commit both failed under repeatable browser exercise before being corrected.

The strongest surviving direction is a DOM/SVG projection with a roving-focus Contents tree, in-place geometry preview, explicit structural focus restoration, a concise debounced nudge status plus an on-demand “Report position” command, and later testing on a controlled Windows accessibility matrix. Do not use this prototype to claim WCAG, Narrator, NVDA, JAWS, or forced-colors conformance.

## Run it

From the repository root:

```powershell
python -m http.server 4179 --bind 127.0.0.1 --directory .wayfinder-tmp/prototypes/issue-34
```

Open `http://127.0.0.1:4179/accessibility-harness.html?variant=A`.

The three variants intentionally compare announcement policies while also changing information hierarchy:

- **A — Debounced workbench:** tree, page, and Properties remain visible; repeated nudges write one concise status after 220 ms idle.
- **B — Eager canvas:** page dominates; every nudge writes to the polite status region. This is the deliberately noisy control.
- **C — Queryable tree:** the hierarchy dominates; nudges are silent until the user invokes Report selected position.

All content is synthetic and in-memory. The forced-color and 200% text buttons are explicitly labelled simulations; they do not alter Windows or browser settings.

## Available assistive-technology and test surfaces

The inventory was read-only. Nothing was installed, no accessibility setting was changed, and no assistive technology was launched.

| Surface | Exact evidence on this host | Used? | Evidence boundary |
|---|---|---|---|
| Windows | Registry reports `Windows 10 Pro`, `DisplayVersion 25H2`, build `26200`, UBR `9106`; `[Environment]::OSVersion` reports `10.0.26200.0`, 64-bit | Yes, as host metadata | The registry product name conflicts with the newer build/display fields, so no marketing-edition inference is made. |
| Narrator | `C:\Windows\System32\Narrator.exe`, file/product version `10.0.26100.8521`, 1,204,224 bytes | **No** | Directly installed, but the available tools cannot capture spoken/braille output or drive the desktop Narrator UI. Launching it would disrupt the user without producing auditable evidence. |
| NVDA | No executable in Program Files, Program Files (x86), or the checked LocalAppData program path; no uninstall record; not on PATH; no running process | No | Not installed on the tested host. |
| JAWS | No executable in checked Freedom Scientific Program Files paths; no uninstall record; not on PATH; no running process | No | Not installed on the tested host. |
| Accessibility Insights for Windows | No checked Program Files/LocalAppData executable, AppX package, uninstall record, PATH command, or running process | No | Not installed. |
| Inspect | Windows SDK x64 executable at `C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\inspect.exe`, version `7.2.0.0` | No | Installed, but no desktop-UI automation or UIA-tree capture surface was available. |
| AccEvent | Windows SDK x64 executable beside Inspect, version `7.2.0.0` | No | Installed, but no safe, auditable event capture path was available through the browser controller. |
| Magnifier | `C:\Windows\System32\Magnify.exe`, version `10.0.26100.8737` | No | Present; magnification usability was not requested as a substitute for text scaling. |
| On-screen keyboard | `C:\Windows\System32\osk.exe`, version `10.0.26100.1` | No | Present; not a screen reader or keyboard-only test substitute. |
| Chrome | `C:\Program Files\Google\Chrome\Application\chrome.exe`, version `151.0.7922.110`; page user agent reports Chrome 151 | Yes | Live browser keyboard, DOM, media-query, computed-layout, screenshot, and focus evidence only. |

No Narrator, NVDA, JAWS, Inspect, AccEvent, or Accessibility Insights process was running during inventory.

## Actual host settings observed

- `AppliedDPI=120`, conventionally corresponding to the one observed 125% Windows display-scale state.
- Browser `devicePixelRatio=1.25`, `innerWidth=1536`, `innerHeight=695`, and `visualViewport.scale=1` at baseline.
- Browser `forced-colors: active` was `false`; `prefers-contrast: more` and `prefers-reduced-motion: reduce` were also `false`.
- High Contrast registry data was `Flags="126"` with an empty scheme name; the browser media query, not an interpretation of that bit field, is the direct page-level observation.
- `HKCU\Software\Microsoft\Accessibility\TextScaleFactor` was absent. This is recorded as absent, not silently treated as proof of a particular text-scale percentage.

Only the current 125% display-scale state was observed. Other Windows display scales remain untested.

## Core keyboard and semantic observations

The browser semantic snapshot exposed named `navigation`, Contents, Synthetic page, Exact properties, and evidence regions; a labelled tree with nine levelled treeitems; `aria-selected`, `aria-expanded`, `aria-pressed`, and `aria-disabled` states; named visibility/lock buttons; labelled numeric inputs; a selected-button state for canvas elements; and an atomic polite status region. That proves DOM semantics were emitted, not how any screen reader speaks them.

| Task | Exact observed result |
|---|---|
| Multi-select and Key Element | Shift+Space on Exploration identifier added it to Project title, producing `2 selected`; Exploration identifier became the one named Key Element. |
| Align and Undo | Keyboard activation aligned Project title from `x=34` to Key Element `x=322`, leaving Exploration identifier at `322`; Ctrl+Z restored `34` and `322`. |
| Effective Visibility/Lock | Pressing V then L on Depth Body left N-value layer locally visible/unlocked but derived `visible=false`, `locked=true`, `inheritedHidden=true`, and `inheritedLocked=true`; the canvas item disappeared while the tree item remained. |
| Keyboard reorder | Alt+Up on N-value layer changed it from order `1` to `0` and Strata description from `0` to `1`. |
| Keyboard reparent and structural focus | Alt+Left moved N-value layer from Depth Body to the root at order `2`. After the structural render's focus frame settled, the active element was again the N-value layer tree button and the live text named the move. |
| Locked canvas focus | Shared numeric axis had `aria-disabled=true` and `tabindex=-1`; it never appeared in the 48-step focus trace's canvas targets, while its Contents controls remained reachable. |
| Exact property editing | The first blur-only automated path left X at `34` and created no history entry. After adding an explicit Enter commit, typing `77` and pressing Enter changed X to `77`, created one Undo entry, and retained focus in the X input. |
| Tab completion | A 48-Tab trace found 44 unique focus targets, reached five editable canvas items, all four exact-property inputs, and both variant buttons, then wrapped. The locked axis canvas item was skipped. |

### Focus-order release risk

The 44-target result on only nine content nodes is a functional but unacceptable scaling outcome. Each tree row contributes the name, local visibility, and local lock as separate Tab stops. A realistic Contents hierarchy could produce hundreds of stops before the user reaches the page or Properties.

Production must use the ARIA tree pattern with roving `tabindex`—one tree entry in the page Tab sequence—plus Up/Down navigation and named shortcuts/menu actions for visibility, lock, reorder, and reparent. That redesign requires Narrator and NVDA task testing; simply assigning `role=tree` is insufficient.

## Repeated-nudge announcement comparison

Each final run started from Project title `x=34`, reset evidence counters, sent 20 actual ArrowRight keypresses through the browser, and waited 450 ms. Every final variant reached `x=54`, recorded 20 commands, preserved the focused Project title DOM node for all 20, and lost focus zero times.

| Variant/policy | Live-region writes during 20 nudges | Final live text | Focus result | Disposition |
|---|---:|---|---|---|
| A / debounced | `1` | `Moved 1 item 1, 0 points. Project title: X 54, Y 40, width 270, height 34 points` | `20/20` preserved, `0` lost | **Preferred starting policy.** Concise, timely, and queryable after the sequence. |
| B / eager | `20` | Same final geometry text | `20/20` preserved, `0` lost | **Reject as default.** Twenty polite-region mutations for twenty nudges is a strong verbosity/interruption risk even though speech was not observed. |
| C / queryable | `0` during nudge; `1` after Report position | `Project title: X 54, Y 40, width 270, height 34 points` | `20/20` preserved, `0` lost | Useful as a secondary command, but silence alone may hide successful movement. Combine Report position with A rather than selecting C alone. |

These are DOM live-region write counts, not screen-reader announcement counts. A screen reader may coalesce, interrupt, suppress, or repeat them differently.

## Failures found and corrected in the harness

1. **Animation-frame live-region delivery was nondeterministic.** Clearing the status and refilling it on `requestAnimationFrame` left the DOM status empty for hundreds of milliseconds in a background-controlled tab even after the write counter advanced. Final status writes are synchronous and contain unique geometry text. Screen-reader behavior remains unobserved.
2. **Whole-DOM nudge renders lost input and raced focus.** One final pre-fix Variant C run recorded only `19/20` commands and ended at `x=53`; the A/B runs restored focus only `17/20` and `18/20` times. The harness now updates existing canvas geometry and ARIA labels in place. Final runs are `20/20`, `x=54`, and focus preserved `20/20` for every policy.
3. **Blur-only exact-property commit was not dependable.** Filling X and tabbing away left the model unchanged. An explicit Enter commit made the boundary observable and retained focus. Production must specify Enter=commit and Escape=cancel rather than depend only on blur.
4. **Sequential focus is technically complete but operationally excessive.** The 44 unique targets remain unfixed intentionally because they are a product-level tree-pattern decision, not a throwaway styling bug.

The in-place nudge result reinforces issue #18's conclusion: pointer/keyboard preview must not rebuild the semantic tree. Structural commands may rebuild if they restore focus by stable identity.

## Forced colors and contrast

### Observed

- Actual `forced-colors: active=false` in Chrome 151.
- The harness contains an actual `@media (forced-colors: active)` branch using system colors and visible focus/selection outlines.
- The simulated token mode set `aria-pressed=true`, retained non-colour lock/visibility glyphs, and made selection/focus outlines visible.

### Simulated only

The “Simulate forced-color tokens” control swaps design tokens to CSS system colours without changing Windows. Its screenshot exposed hard-coded canvas-surround grey and a local-lock pink treatment that survived the token swap. Non-colour glyphs still conveyed state, but the surviving authored colours show that token simulation cannot certify actual forced-colors behavior.

### Unobserved release gate

Run the packaged Electron build with Windows Contrast Themes actually active. Verify focus, selected versus Key Element, local versus inherited visibility/lock, diagnostics, scrollbars, canvas/page boundaries, property validation, and hover/disabled states. Inspect both pixels and UIA state. The current evidence does not pass this gate.

## 200% text and display scale

Chrome page-zoom shortcuts exposed through the browser controller did not change DPR, viewport, root font size, or visual-viewport scale. Rather than claim a failed shortcut as a 200% test, the harness provides an explicit **simulation** that changes the root UI font from `16px` to `32px` while keeping designed page text at `12px` and all Log Template point geometry unchanged.

Observed in the simulation:

- Project title's authored box remained `[34, 40, 270, 34]` before and after;
- root UI text became `32px`, designed page text remained `12px`;
- document width remained `1521px` with no horizontal overflow;
- document height grew, so vertical scrolling was required;
- the same two deliberately tight designed-page elements—Shared numeric axis and Page number—reported text overflow at both 100% and simulated 200%; the simulation introduced no additional inspected control overflow;
- keyboard nudge remained functional while simulated 200% text was active.

This is useful reflow and model-separation evidence, not a substitute for real Windows Text size 200%, Chrome/Electron zoom, or 200% OS scaling. Test those independently and verify that application UI scaling never mutates Log Template typography or page coordinates.

## Screen-reader and manual-usability boundary

### Observed

- Browser-emitted roles, accessible names, and states.
- Keyboard operation and resulting model/DOM state.
- Browser focus identity after commands.
- Live-region DOM writes and visible status text.
- Current media queries, DPR, viewport, and simulated reflow.
- One agent's visual inspection of baseline, contrast-token simulation, and 200% text simulation.

### Not observed

- Narrator speech, braille, scan mode, landmark/tree navigation, focus versus browse mode, or announcement interruption.
- Any NVDA or JAWS behavior; neither was installed.
- UIA output from Inspect or event traces from AccEvent.
- Actual Windows forced colours/high contrast.
- Actual 200% Windows text size, browser zoom, or display scale.
- 100%, 150%, 200%, and mixed-monitor display-scale transitions.
- Windows high-DPI monitor movement, touch, switch access, speech input, or keyboard-layout variants.
- Human task completion, fatigue, comprehension, or acceptable announcement verbosity.

DOM snapshots are never represented as screen-reader evidence.

## Required release gates

1. Replace the three-Tab-stops-per-row Contents implementation with a roving-focus tree and repeat the complete keyboard task trace on realistic item counts.
2. Test a packaged Electron build with current Narrator and current NVDA on the supported Windows release; add JAWS if the firm's/customer deployment requires it. Record exact AT, Windows, Electron, Chromium, and app versions.
3. Test selection, multi-selection, Key Element changes, effective lock/visibility, reorder/reparent, nudge/resize, exact property commit/cancel, alignment, Undo/Redo, text-overflow diagnostics, and export status with speech capture or an observer transcript permitted by the test environment.
4. Adopt the debounced status plus Report position hypothesis only after AT users confirm that it is neither silent nor interruptive. Test held-key repeat, slow individual presses, and rapid direction changes.
5. Run actual Windows Contrast Themes and verify computed forced-colors behavior, UIA state, and non-colour cues.
6. Run actual 200% text size and 100/125/150/200% display scaling. Confirm no lost controls, no horizontal page-level scrolling for application UI, minimum target sizes, and unchanged Log Template geometry.
7. Keep in-place geometry preview; test that structural renders restore focus by stable element identity without a delayed or duplicate announcement.
8. Specify exact-property Enter=commit, Escape=cancel, invalid-value retention/error association, and mixed-value editing before implementation.

## Stack implications

- DOM/SVG remains the preferred first production projection because it exposes a usable semantic seam and did not require a canvas accessibility mirror for these tasks.
- The saved scene and command model must remain renderer-neutral; the DOM is still a projection, not Log Template state.
- A semantic tree requires deliberate ARIA interaction design, not merely roles added to many buttons.
- Direct manipulation should follow `begin → preview → commit/cancel`; preview updates geometry/ARIA in place, and one intent becomes one Undo command.
- Visual canvas content that is effectively locked should leave canvas Tab order but remain inspectable and operable in Contents.
- UI text scaling and designed-page typography need separate transforms and tests.
- Accessibility status behavior is part of the command contract and should have testable message IDs/categories, not ad hoc strings scattered through UI components.

## Deliberately out of scope

This harness does not implement the application, PDF accessibility, snapping/guides/rotation, pointer handles, context menus, document lifecycle, persistence, RSLog access, actual text overflow policies, or a production ARIA tree. It exists only to sharpen #34's accessibility release gates and interaction architecture.
