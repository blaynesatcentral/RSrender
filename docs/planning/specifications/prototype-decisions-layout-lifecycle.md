# Prototype decisions: layout interaction and document lifecycle

**Evidence cut:** 2026-08-14

**Scope:** Durable decisions from GitHub #18 and #20. The disposable code remains on throwaway branches and is not application implementation.

## Evidence boundary

- [Issue #18 primary-source prototype](https://github.com/blaynesatcentral/RSrender/tree/51a8352/prototype-evidence/issue-18) contains the three clean-room layout shells, browser observations, exact synthetic measurements, defects found, and accessibility limits.
- [Issue #20 primary-source prototype](https://github.com/blaynesatcentral/RSrender/tree/d584c8a/prototype-evidence/issue-20) contains the lifecycle reducer, Windows/package harness, hostile fixtures, authoritative raw run, and full Adopt/Reject/Open synthesis.
- The #20 authoritative run matched 74 of 74 declared outcomes: 52 direct observations, 18 simulated lifecycle/update decisions, and four explicit deferrals. A separate root-agent rerun reproduced the same totals. This is expectation agreement, not a coverage metric or production guarantee.

## #18 — layout canvas, Contents, precision editing, and accessibility

### Adopt

1. Continue with a DOM/SVG-first projection for the next layout prototype; no observed state or command need currently justifies Konva, Fabric, or CanvasKit.
2. Keep the scene and named command model renderer-neutral so a later projection change does not rewrite the domain model.
3. Store local visibility and lock values; derive Effective Visibility and Effective Lock State from ancestry without overwriting child values.
4. Store selection as an ordered set with one explicit Key Element. Alignment keeps that element fixed and reports locked/skipped members.
5. Route pointer, keyboard, toolbar, context-menu, and exact-property actions to the same named commands and undo boundaries.
6. Model direct manipulation as begin → preview → commit/cancel. One drag is one undoable command; preview must not rebuild the whole Contents tree.
7. Keep Contents as the complete semantic alternative to the spatial canvas, including hidden and effectively locked items.
8. Restore focus across tree mutations and announce committed results rather than pointer-move previews.
9. Use the persistent three-pane Workbench shell as the next default exploration. Canvas-first may be a focused mode; tree-first contributes accessibility ideas rather than becoming a separate product.
10. Every selectable Canvas or Contents item exposes the same applicable contextual command surface. Right-click or the keyboard menu command includes common edit/hierarchy actions and an element-specific **Format** route to the complete Properties scope; text elements expose typography, text-frame geometry, fill/background, border, padding, transparency, overflow, and binding. Context menus supplement, and never replace, keyboard-accessible menus and Properties.

### Reject

- Pixel-only canvas semantics, pointer-only reorder/reparent, icon-only inherited-state communication, an implicit alignment reference, native HTML drag-and-drop as the only drag mechanism, and selection/document mutations hidden inside undo commands.
- Treating the 2,000-primitive synthetic measurement as a 60 Hz production pass. Selection rebuilds stayed at or below 1.7 ms p95 in the recorded runs, but two-frame stress maxima reached 73.2–107.1 ms.

### Remaining evidence gates

- Minimum-hardware Electron measurements with realistic glyph, text, track, hit-test, snapping, guide, handle, and multi-page density.
- Direct NVDA/Narrator/JAWS behavior, actual high contrast, actual 200% text scaling, non-default display scale, realistic-scale completion of every core keyboard task, and representative-user usability. #34 settled the roving-tree, repeated-nudge, focus-restoration, announcement, and exact-property commit semantics; those decisions are not reopened by this evidence gap.
- The final [Layout Studio UX specification](layout-studio-ux-specification.md) settles snapping, rulers/guides, rotation, nine-point Position Anchors, marquee/overlap selection, and command/history behavior. #30/#34/#40 retain only scale, performance, and accessibility evidence for those decisions.

## #19 — shared-axis Data Track

The disposable model passed 242 of 242 semantic oracle evaluations across 22 states and two independently synthetic fixture families, including a value-free observed-Sample-shape descriptor that copied no vendor values or nested schema.

Adopt these domain and rendering rules:

1. A Data Track owns the page depth transform, configured numeric axes, grid/depth projection, and shared sample-interval geometry. Ordered Data Layers reference an `axisId` and contribute paint only.
2. Moisture, plastic limit, and liquid limit share one compatible percentage axis. N-values use a distinct typed axis in the same track; numeric values are not interchangeable merely because they are numbers.
3. Quantity, unit, and scale compatibility is explicit and validated before painting. No implicit conversion, formula, autoscale, or magnitude inference is allowed.
4. Axis visibility is explicit track state and survives hiding or reordering layers. Layer paint order never changes depth geometry, axes, sample intervals, or pagination.
5. Zero plots as zero. Missing, blank, null/unavailable, ambiguous, invalid, and nonfinal remain distinct non-plotted states with Diagnostics.
6. A PL–LL connector is a derived glyph joining two eligible, independent, same-sample records; it does not create or persist a plasticity index.
7. Out-of-domain values retain identity and original value. The default candidate is an unmistakable edge marker plus Diagnostic; silent clipping, omission, clamping, or layer blocking is rejected.
8. Coincident observations retain exact anchors, stable paint order, and semantic identities; geometric jitter that changes the represented value is rejected.
9. A boundary point is emitted once according to an explicit upstream page-ownership rule. A spanning interval is clipped into traceable page fragments once per track, never once per layer.
10. Recognized field-test/column metadata outranks a compatibility fallback for N-values. A true-absence fallback is labeled; unresolved eligibility selects neither and diagnoses. No N/N60 formula or vendor schema is invented.

The final domain, UX, product, and acceptance specifications now settle the page-boundary convention, bounded conversion policy, v0.9 axis behavior, Diagnostics, and publication consequences. #30/#34/#40 retain performance/accessibility evidence; #43 retains authorized positive source-field and asset evidence. Unsupported conversions or unproved source fields remain diagnosed and unavailable rather than implementation choices.

## #20 — lifecycle, package safety, and recovery

The accepted hard-to-reverse boundary is recorded in [ADR 0001](../../adr/0001-renderer-independent-lifecycle-and-verified-save.md).

### Adopt

1. Dirty is derived from working versus durable revision and clears only after the intended committed target is reopened and verified.
2. Save As does not bind a proposed target until verified commit.
3. Save has explicit candidate-writing, validation, replacement, committed-target verification, conflict/failure, and uncertain/reconciliation states.
4. Commit requires one document owner or exclusive coordination plus a baseline recheck while that authority is held. Baseline-only checking is insufficient.
5. Recovery is app-owned, bounded, strictly validated, and keyed by the origin Document Identity/base digest. Opening separately creates an untargeted dirty document with a new Document Identity and inert recovery-origin provenance; it never auto-overwrites an Authoritative File or changes the original identity.
6. Trust and version compatibility are separate gates. Unsupported future content is at most bounded metadata-only; it cannot edit, export, migrate, Save, or Save As.
7. Missing or changed library templates continue from the exact Embedded Template Representation with a visible Diagnostic and no automatic substitution/adoption.
8. Close, Close All, Quit, update restart, and rollback share one multi-document disposition authority.
9. Carry a declarative, no-extraction, strictly bounded package profile and hostile corpus into the container bake-off without selecting ZIP or the Python harness library.
10. Use exactly one update authority and require trusted publisher/signature evidence in addition to hashes.

### Reject

- Renderer-owned dirty/lifecycle truth; in-place authoritative writes; success before committed-target verification; last-writer-wins; baseline-only concurrency; blind retry or automatic rollback from an uncertain replacement; automatic recovery overwrite; active/executable/network package content; best-effort future-version editing or down-save; filename-based template substitution; recovery as version history; and selecting any production container/parser/updater from this disposable run.

### Remaining evidence and capability gates

- Edit-during-save behavior and immutable revision-ahead semantics are settled by the [lifecycle conflict specification](lifecycle-conflict-state-command-specification.md); #36/#37 retain mechanics evidence.
- Electron single-instance routing, authenticated ownership journaling, crash-after-commit replay, actual PID reuse, and cross-machine authority behavior. #31 and ADR 0002 already settle the layered application-broker, Document Owner/generation, and storage-specific commit-authority model; later work must implement and validate that model rather than choose among those layers again.
- Save As create-new/no-clobber/overwrite races retain #36 mechanics evidence; separate-template identity is settled by the lifecycle and domain specifications.
- Hard-reset/power-loss behavior and support policy for NTFS, SMB, the firm’s sync product, removable/exFAT, long paths, low space/quota, AV/EDR, and cross-machine writers.
- The constrained ZIP envelope, zip.js 2.8.49, canonical validation direction, and migration boundary are selected by ADR 0003/#33; #37/#42 retain packaged process and resource-limit evidence, and hostile native decoding remains unavailable pending #37/#43 containment and rights evidence.
- Recovery interval, age/count/byte retention, comparison/ranking, encryption, client-data eligibility, cleanup, and administrative deletion are settled by the [recovery policy](recovery-retention-privacy-policy.md); #36–#39 retain mechanics and organizational approval evidence.
- Actual Electron process/IPC/runtime behavior, credential brokerage and authorized RSLog authentication, signed installer/update/rollback technology, and lifecycle-dialog accessibility.

## Ticket status implication

These retained prototype decisions are historical evidence inputs, not current ticket status or production test passes. #18 and #20 are closed, and final domain/UX/lifecycle/product/architecture/acceptance specifications now own behavior. Remaining release evidence is routed only to live #30, #34, #36–#40, #42, and #43; a missing result leaves the affected acceptance row gated and never delegates behavior to an implementation agent.

## #31 — document ownership and commit authority

[Issue #31 primary-source prototype](https://github.com/blaynesatcentral/RSrender/tree/31dbc6f/prototype-evidence/issue-31) matched 19 of 19 declared outcomes: 13 direct local-Windows observations, five simulated state-model results, and one explicit SMB/cross-machine deferral. A separate root-agent rerun reproduced the same totals.

Adopt the layered broker + Document Owner + storage commit-authority model recorded in [ADR 0002](../../adr/0002-layer-document-ownership-and-storage-commit-authority.md). The non-negotiable invariant is an identity/baseline recheck while authority is held; acquisition serializes the decision point but never validates an earlier baseline. Reject single-application routing alone, memory/marker/PID ownership alone, a Windows lock as the whole document model, pre-lock checks, TTL/PID stale breaking, and one application-global save lock.

Observed local behavior supports a zero-share sibling handle as the local fixed-NTFS candidate: an owner crash released the kernel handle, stale/live-PID markers did not grant or deny authority, a delayed waiter acquired later and correctly conflicted after recheck, cancellation was non-mutating, scoped handoff rejected the wrong receiver, and distinct documents committed concurrently. Electron routing/journaling, actual PID reuse, crash-after-commit replay, Save As, SMB/cross-machine, and other storage classes remain open in #37 and #36.

## #34 — keyboard and accessibility evidence

[Issue #34 primary-source prototype](https://github.com/blaynesatcentral/RSrender/tree/f41177f/prototype-evidence/issue-34) keeps DOM/SVG viable but does not remove accessibility risk. Browser exercise completed the synthetic keyboard paths and exposed semantic roles/names/states, but no screen reader speech/braille, actual forced-colours mode, actual 200% text size, or alternate display scale was observed.

Adopt these interaction constraints now:

1. Contents uses the ARIA tree pattern with one roving Tab stop, Up/Down navigation, and named commands/menus; three independent Tab stops per row are rejected after nine nodes produced 44 unique sequential targets.
2. Repeated geometry commands update the existing semantic projection in place. Rebuilding on each nudge lost one of twenty commands and destabilized focus; the corrected runs preserved all 20 commands and focus 20/20.
3. Structural renders restore focus by stable element identity after the mutation is committed.
4. Repeated nudges start with one concise debounced status after idle plus an on-demand **Report position** command. Eager per-key live-region writes are rejected as the default; final screen-reader/user validation may revise the timing/message policy.
5. Exact-property editing specifies Enter = commit and Escape = cancel; blur alone is not a reliable commit boundary.
6. Application UI scaling and designed Log Template typography/geometry remain separate transformations.

Release acceptance still requires a controlled packaged-Electron matrix with current Narrator and NVDA, JAWS where required, actual Windows Contrast Themes, actual 200% text size, 100/125/150/200% display scaling, realistic Contents size, observer/speech evidence, and representative-user task validation. DOM snapshots are semantic-surface evidence, never screen-reader or WCAG-conformance evidence.
