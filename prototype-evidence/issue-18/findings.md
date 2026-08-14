# Issue #18 prototype findings

**Status:** disposable evidence, not application implementation

**Observed:** 2026-08-13 in a live Windows browser session

**Prototype:** [`index.html`](index.html), with `?variant=A`, `?variant=B`, and `?variant=C`

## Question and verdict

Can one DOM-based interaction shell support a clean Contents hierarchy, shared tree/canvas selection, an explicit Key Element, precision keyboard editing, undoable command boundaries, derived visibility/lock state, mixed-value properties, and an accessible semantic alternative to direct canvas manipulation?

**Provisional answer: yes for the state and command model; not yet proven for production-scale performance or accessibility.** The prototype completed every requested interaction path with ordinary HTML controls and an absolute-positioned DOM canvas. Nothing observed justifies introducing Konva, Fabric, or CanvasKit for MVP interaction work. Keep the Log Template scene and command model independent of the DOM projection so a later measured performance failure does not force a domain rewrite.

The result does **not** establish 60 Hz pointer feedback on minimum firm hardware, screen-reader usability, 200% scaling, Windows high contrast, complex hit testing, snapping, guides, rotation, or a production undo architecture. Those remain later prototype and usability work.

## Run it

From the repository root:

```powershell
python -m http.server 4178 --bind 127.0.0.1 --directory .wayfinder-tmp/prototypes/issue-18
```

Open `http://127.0.0.1:4178/index.html?variant=A`. The fixed bottom switcher and URL parameter select:

- **A — Workbench:** persistent Contents, page, and Properties columns;
- **B — Canvas first:** floating Contents over a large canvas with a bottom property strip;
- **C — Tree first:** large keyboard-oriented hierarchy, secondary page preview, Properties below.

All data and state are synthetic and in memory. Reloading resets the prototype.

## Observed browser evidence

Environment reported by the page:

- Windows 10 x64 user agent;
- Chrome `151.0.0.0`;
- device pixel ratio `1.25`;
- 16 state nodes, 15 displayed tree items, and 9 painted page elements in the interactive fixture.

The browser DOM snapshot exposed named regions, a `tree` with levelled and selected `treeitem` nodes, named buttons for local visibility/lock, pressed selection state on canvas items, labelled property inputs, disabled command state, and a polite atomic status region. This is semantic-surface evidence only, not a screen-reader result.

| Behavior exercised | Observed result |
|---|---|
| Tree and canvas selection | Both projections read and update one ordered selection. A canvas click replaces selection after the pointer boundary fix described below. |
| Shift multi-selection | Selecting Project title, then Shift-selecting Exploration identifier produced `2 selected`; Exploration identifier became the sole visibly labelled Key Element. |
| Key Element alignment | Align-left moved Project title from `x=34` to the Key Element's `x=400`; Exploration identifier stayed at `x=400`. One Undo restored `34` and `400`. The live region announced the full named operation. |
| Mixed properties | The two-item selection reported mixed `x`, width, fill, and font size. Applying green fill changed both canvas elements to `rgb(220, 252, 231)` in one undo step and removed fill from the mixed-property list. |
| Effective Visibility | Hiding Depth Body left the N-value layer's local value on but derived `visible=false` and `inheritedHidden=true`; its canvas element count became zero while the tree item remained available. |
| Effective Lock State | Locking Depth Body derived `locked=true` and `inheritedLocked=true` for the N-value layer while preserving its local unlocked value. |
| Keyboard nudge and resize | On a single Project title selection, Right Arrow changed `x 34→35`; Ctrl+Right Arrow changed width `330→331`. They created two named undo steps. |
| One-command canvas drag | A pointer drag changed Project title `x 35→59` and increased history depth by exactly one. The live region announced one committed drag command. |
| Keyboard reorder | Alt+Down on Shared numeric axis swapped its order from `0` to `1` with the N-value layer moving `1→0`. |
| Keyboard reparent | Alt+Left then moved Shared numeric axis from Data Track to Depth Body at order `3`. Focus returned to the same axis tree button and the status region announced the move. |
| Pointer reparent | Dragging the Strata description handle onto Header moved it from Intervals and description to Header at order `3`, created one undo step, and announced the destination. |
| Variant switching | The switcher produced reload-stable `?variant=B` and `?variant=C` URLs without resetting in-memory state. |

## Exact latency measurements

The button runs two deliberately separate probes:

1. **Selection render:** 60 synchronous alternations between one- and two-item selection, including rebuilding this prototype's Contents and canvas DOM. This is JavaScript/DOM work, not input-to-photon latency.
2. **2,000-primitive stress:** temporarily inserts 2,000 visible synthetic DOM primitives, updates all of their transforms for 30 iterations, and measures from update start through **two** `requestAnimationFrame` callbacks. Two callbacks impose an approximately 33.3 ms floor on a 60 Hz display; these values must not be compared directly with a one-frame 16.7 ms budget.

Each variant was loaded directly and run three times. Every final result had a new timestamp (`changed=true`). Times are milliseconds.

| Variant/run | Selection p95 | Selection max | 32,000 effective-state computations | Stress build | Stress two-frame p95 | Stress max |
|---|---:|---:|---:|---:|---:|---:|
| A / 1 | 1.4 | 3.4 | 26.1 | 1.8 | 41.0 | 53.8 |
| A / 2 | 0.6 | 0.8 | 18.7 | 1.0 | 33.8 | 81.9 |
| A / 3 | 1.5 | 1.8 | 37.2 | 2.1 | 34.9 | 107.1 |
| B / 1 | 1.6 | 2.1 | 44.5 | 5.7 | 35.2 | 105.4 |
| B / 2 | 1.7 | 4.6 | 54.2 | 3.7 | 34.1 | 101.9 |
| B / 3 | 1.2 | 2.6 | 28.4 | 1.5 | 33.9 | 106.6 |
| C / 1 | 1.5 | 1.8 | 37.1 | 3.0 | 34.6 | 94.3 |
| C / 2 | 1.0 | 1.2 | 19.4 | 1.9 | 36.9 | 73.2 |
| C / 3 | 1.5 | 1.8 | 32.9 | 1.6 | 33.8 | 85.3 |

The small interactive fixture's selection rebuild remained below `1.7 ms p95` in every run. The stress p95 clustered near the two-frame floor (`33.8–41.0 ms`), but maxima reached `73.2–107.1 ms`. Those spikes and the artificial two-frame method mean the production ticket's 60 Hz criterion is **unresolved**, not passed. A later instrumented prototype should use the target Electron build, the firm's minimum hardware, actual glyph/track density, pointer-event timestamps, one-frame presentation telemetry, and a long enough run to characterize jank.

## Failures found while prototyping

1. **Whole-canvas re-render on pointer-up swallowed click selection.** The first build re-rendered after every pointer-up, even when no drag occurred. Replacing the clicked element before the click event completed preserved a stale multi-selection. It also made pointer capture fragile during drag. The prototype now updates element positions directly during preview and performs the full render only after a moved drag commits. A no-move pointer-up leaves the element intact for click. This strongly supports a production interaction transaction with preview state separated from committed scene state.
2. **Native HTML drag-and-drop was not repeatable through the browser automation path.** Keyboard reparenting worked, but synthetic native DnD did not reliably fire. A dedicated pointer drag handle using pointer capture and hit-testing was added; it successfully reparents in one command. Native DnD should not be the only reorder mechanism. Keep named keyboard commands and consider a pointer implementation that is testable without browser-native drag data transfer.
3. **The first cross-variant benchmark loop read stale Variant A output for the Variant B slot.** It triggered the next action after a fixed wait rather than proving the preceding async probe had completed. Final measurements use direct variant navigation, keyboard activation, longer waits, and a changed-output check. Production performance instrumentation likewise needs completion identities rather than arbitrary delays.

No prototype JavaScript exception was observed. The Chrome host logged intermittent extension message-channel errors with no prototype call site; these were treated as browser-host noise, not evidence about RSrender behavior.

## Manual visual/usability observations

- **Variant A is the best default desktop shell.** Selection, hierarchy, page, and exact properties remain simultaneously visible. The right Properties pane becomes vertically dense, but it does not cover the designed page.
- **Variant B maximizes canvas area but creates occlusion.** The floating Contents panel and bottom Properties strip cover page space, the compact property strip truncates information, and the variant switcher can compete with bottom commands. This is useful as a temporary focused-canvas mode, not the only shell.
- **Variant C gives the hierarchy and keyboard help enough room.** Larger rows make render order and inherited state easier to scan. The tradeoff is a smaller page and Properties content below the fold. It is a useful accessibility/testing mode and a source of ideas for A, not necessarily a separate product mode.
- Local state and Effective state need separate signals. The prototype's struck/inherited icons communicate the distinction visually, but icon-only controls are too cryptic without their accessible names. Production should add tooltips and an explicit inherited-state explanation in Properties.
- The Key Element needs both a distinct canvas outline and a persistent `KEY` marker in Contents. Selection colour alone was not enough to make the alignment reference obvious.
- Tree drag affordance, render-order meaning, and “drop into group” versus “drop before item” need a visible insertion/containment indicator. The prototype only highlights the target row.

These are one agent's clean-room observations at one viewport, not user-study findings.

## Accessibility evidence boundary

**Observed in browser:** semantic roles/names/states in the DOM snapshot; keyboard activation of selection, nudge, resize, reorder, reparent, visibility, lock, alignment, Undo, and property editing; focus restoration to Shared numeric axis after a tree mutation; and live-region text for committed changes.

**Not observed:** NVDA, Narrator, JAWS, or VoiceOver output; browse/focus-mode behavior; announcement interruption or verbosity under repeated nudges; high contrast/forced colours; 200% text scaling; Windows display scales other than the observed DPR; keyboard-only traversal of every control; minimum target sizes; switch access; reduced motion; or usability by engineers. The hidden drag handle is pointer-only by design because equivalent named tree commands exist, but that equivalence still requires manual task testing.

Do not claim WCAG conformance or screen-reader support from this prototype.

## Stack and specification implications

1. Continue ticket #18's next UI prototype with **DOM/SVG first**. The tested state/command needs do not require a canvas framework yet.
2. Keep an immutable, renderer-neutral scene and command adapter. This prototype snapshots the whole array because it is disposable; production needs typed commands, structural sharing or patches, merge rules, and bounded history.
3. Model `localVisible`/`localLocked` as authored values and derive Effective Visibility/Effective Lock State from ancestry. Never overwrite local child values when a parent toggles.
4. Make ordered selection and Key Element explicit state. The last added selected item becomes Key Element; alignment commands name it, keep it fixed, and report skipped locked items.
5. Treat direct manipulation as `begin → preview → commit/cancel`. A drag is one undo command; no-move pointer interaction remains a click; preview updates should not rebuild the full tree.
6. Route pointer, keyboard, toolbar, context-menu, and exact-property actions to the same named commands so geometry and undo boundaries cannot diverge.
7. Keep Contents as the complete semantic alternative to the spatial canvas. Every item remains inspectable there when hidden or effectively locked.
8. Preserve a stable focused item across re-render/reparent and announce committed state, not every pointer-move preview.
9. Do not choose Konva/CanvasKit based on the stress spike alone. Re-run with realistic pages, text measurement, hit testing, guides, and target Electron hardware; introduce a non-DOM projection only after a measured DOM failure.

## Deliberately untested

This throwaway file does not implement snapping, guides, rulers, rotation, nine-point Position Anchors, resize handles beyond a visual marker, overlap cycling, marquee selection, context menus, grouping/deletion recovery edge cases, multiple pages, text overflow, PDF rendering, persistence, RSLog access, or application lifecycle. It answers a bounded interaction-architecture question and should not be promoted into application code.
