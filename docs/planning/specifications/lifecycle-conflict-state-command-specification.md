# Lifecycle conflict state and command specification

**Status:** Accepted #35 product decisions Q1–Q63; decision frontier empty; remaining live mechanics and organizational evidence gates remain explicit  
**Evidence cut:** 2026-08-14.  
**Authority:** This records the settled lifecycle state/command contract but does not authorize implementation. The final [domain](boring-log-domain-model.md), [UX](layout-studio-ux-specification.md), [product](rsrender-product-specification.md), [architecture](rsrender-architecture.md), [recovery](recovery-retention-privacy-policy.md), and [acceptance](rsrender-acceptance-strategy.md) specifications govern their respective scopes.  
**Governing durable decisions:** [ADR 0001](../../adr/0001-renderer-independent-lifecycle-and-verified-save.md), [ADR 0002](../../adr/0002-layer-document-ownership-and-storage-commit-authority.md), and the accepted #35 grilling answers. Final specifications reconcile and refine those inputs without reopening the accepted Q1–Q63 behavior.
**Issue trace:** GitHub [#35](https://github.com/blaynesatcentral/RSrender/issues/35), continuation of [#20](https://github.com/blaynesatcentral/RSrender/issues/20).

## Outcome

Each open Log Project or Log Template has one renderer-independent Lifecycle Authority that owns its Document Identity, revisions, dirty state, save transactions, recovery relationships, and document disposition. One application Lifecycle Coordinator/file broker owns application-wide routing for Close All, Quit, Update & Restart, and OS-shutdown coordination. UI surfaces request named commands and render state; they do not decide durability, ownership, conflict, cancellation safety, or whether work may be discarded.

The state model uses independent axes. A document can therefore be `dirty`, saving an older captured revision, and participating in a pending Quit review at the same time without inventing one compound status.

## Non-negotiable invariants

1. `dirty := workingRevision != durableRevision`; only verified commitment of the intended revision advances `durableRevision`.
2. Save captures an immutable revision. Later edits create later working revisions and never mutate the captured Save input.
3. Save/Save As success is reported only after candidate validation, exclusive commit authority, an inside-authority identity/baseline recheck, replacement, and committed-target reopen/verification.
4. Pre-replacement failure, external conflict, and uncertain post-replacement outcome are distinct states with distinct commands.
5. One writable Document Owner exists per stable document identity across paths. A path is not document identity.
6. Save As is create-new by default. Replacing an existing path is a distinct, one-use, race-aware command.
7. Canceling a lifecycle intent never implicitly cancels Save/export. Canceling Save/export exists only when the operation advertises a proven safe cancellation state.
8. Close All, Quit, and Update & Restart never discard or close any document until all requested saves have succeeded and every document/operation passes a final recheck.
9. A Recovery Candidate never becomes authoritative, overwrites a user file, or satisfies Close/Quit merely because it exists.
10. Missing/changed library state does not replace an intact Embedded Template Representation (ETR). Missing, corrupt, or unrenderable required embedded content is an unsuppressible export error.
11. No generic Yes/No, Overwrite, Retry, or Cancel command substitutes for the named consequence-specific commands below.
12. Product language is “validated replacement on supported, tested storage,” not “atomic save.”
13. Save, Save As, file binding, ownership transfer, reconciliation, Close, and publication are lifecycle effects, not document Undo commands. Ordinary document history survives Save.
14. Accepted Refresh and deliberate Embedded Template Representation update each form one named undoable document transaction when their own domain preconditions permit them.
15. While Save is active, a blocked identity, ownership, target, or base-changing command fails non-destructively and is never queued or replayed automatically. Repeated Save is the only coalescing exception.
16. A clean document with an External Change freezes new mutations. Compare is inspection-only and does not end the freeze; only verified Reload External, verified Save As, or eligible deliberate Replace External establishes the next working basis. An unresolved External Change blocks authoritative PDF publication.
17. Genuine post-replacement uncertainty blocks discard, Close, Quit, and restart until classification or verified rescue Save As establishes a durable target.
18. One-export warning acknowledgment is transient and does not dirty a Log Project. Persistent suppression creation, change, or removal is an undoable Log Project mutation and makes it dirty.

## State axes and vocabulary

Identifiers below are provisional specification labels, not new ubiquitous-language terms.

## Decision frontier status

The #35 product-decision frontier is empty:

- **Q62:** Compare is inspection-only. It never changes the working basis or unfreezes a clean External Change. Verified Reload External, verified Save As, or eligible deliberate Replace External must complete first.
- **Q63:** Open Recovery Separately creates an untargeted dirty document with a new Document Identity, its own Document Owner, and inert recovery-origin provenance. The original document and identity remain untouched.

The remaining open items are mechanics, observed-accessibility, source/rights, or organizational-approval evidence assigned to the live-gate register; they are not unasked #35 product choices. Numeric recovery policy and publication-role defaults are settled in the final recovery and product specifications.

### Document revision and target axis

| State/fact | Meaning | Derived user-visible state |
|---|---|---|
| `target = none` | Open document has no Authoritative File. | Untargeted; Save routes to Save As. |
| `target = authoritativeFile` | A verified durable package is bound to the open document. | Targeted; show safe display identity/path under privacy policy. |
| `workingRevision = durableRevision` | Current working state matches the last verified durable revision. | Clean. |
| `workingRevision > durableRevision` | Current working state contains unsaved mutations. | Dirty. |
| `saveCapture = N` | Immutable revision N is the input to an active Save transaction. | “Saving revision N”; dirty may remain or arise independently. |
| `queuedLatestSave = true` | Repeated Save coalesced into one follow-up request. | “Save latest after current.” |
| `externalBaseline = changed` | Current target no longer matches the opened/last-verified baseline. | External Change conflict. |
| `externalTarget = missing` | Bound Authoritative File is absent. | Missing-target conflict; ordinary Save disabled. |
| `commitOutcome = uncertain` | Replacement may have occurred but intended target cannot yet be verified. | Reconciliation required; new mutations frozen. |
| `ownership = readOnlyInspection` | Same stable identity is already owned writable elsewhere. | Bounded inspection only; no independent Save. |

### Save transaction axis

| Save state | Entry | Allowed exit |
|---|---|---|
| `idle` | No transaction. | Capture revision for Save/Save As if command preconditions hold. |
| `preparingCandidate` | Revision captured; candidate serialization/validation underway. | Verified candidate, classified pre-replacement failure, or proven safe cancellation. |
| `waitingForCommitAuthority` | Valid candidate waits for target-scoped authority. | Authority acquired then recheck; bounded cancellation preserving/classifying candidate; conflict/failure. |
| `insideAuthorityRecheck` | Target identity/baseline reopened while authority is held. | Commit eligible or External Change conflict. |
| `replacingAndVerifying` | Replacement may occur; committed target is reopened and verified. | Verified success, classified old-valid/failure, or uncertainty. Cancellation is unavailable once replacement may have occurred. |
| `verifiedSuccess` | Intended captured revision verified at target. | Advance durable revision; bind Save As target; report clean or revision-ahead dirty result. |
| `preReplacementFailure` | Target known not replaced. | Fresh Save/Save As; bounded candidate reuse only if later evidence permits. |
| `externalConflict` | Target identity/baseline failed the authority-time recheck or an external change was detected. | Explicit conflict workflow only. |
| `reconciliationRequired` | Outcome cannot be classified safely. | Read-only classification/rescue commands until one reconciliation result is established. |

### Application lifecycle axis

| State | Meaning | Exit condition |
|---|---|---|
| `noIntent` | No Close All/Quit/update restart in progress. | Lifecycle command requested. |
| `reviewingDisposition` | Stable application-owned rows show every affected document and active operation. | Every required row has a safe disposition, or user cancels the lifecycle intent. |
| `executingRequestedSaves` | Saves execute serially in visible row order. | All succeed, or first failure stops execution and returns to review. |
| `waitingForActiveOperations` | Save/export remains active and not safely canceled. | Completion or explicit safe cancellation. |
| `finalRecheck` | All saves succeeded; documents/operations are reread before discard/close. | All remain eligible, or changed rows return to review. |
| `applyingDisposition` | Approved discards and closes execute only after final recheck. | Requested Close All/Quit completes. |
| `updatePendingDeferrable` | Update is available; restart not requested or deferred. | Explicit Update & Restart, external policy transition, or update withdrawal. |
| `mandatoryLifecycleOnly` | Managed deadline expired. New documents/edits are blocked; lifecycle-safe resolution remains available. | All work clean/resolved, then explicit Restart Now. |

## Document command availability matrix

| Command | Clean/dirty idle | While revision N saves | External/missing conflict | Reconciliation required | Result and guard |
|---|---|---|---|---|---|
| Reversible edit, layout/format/structure, assignment, Presentation Override | Allowed | Allowed on N+1 onward | **Blocked** for a clean External Change until a new working basis is established; allowed on an already-dirty local branch while the conflict remains classifiable | **Blocked** after genuine uncertainty | Each accepted mutation advances working revision. |
| Undo/Redo | Allowed | Allowed; undo of an edit already captured in N creates a later inverse revision | Same clean-versus-already-dirty mutation gate as ordinary edits | **Blocked** after genuine uncertainty | Never mutates the immutable save capture. Lifecycle effects are not Undo commands. |
| Save | Allowed when targeted and no blocking state | Coalesce to one `Save latest after current` request | Disabled; use conflict commands | Disabled | Captures one immutable revision. |
| Save As create-new | Allowed; required when untargeted | Blocked until active Save terminates | Allowed to a distinct no-clobber target | Allowed only as verified rescue Save As to a distinct create-new target | Normal Save As preserves stable document identity and binds only after verified commit. |
| Replace Existing | Distinct Save As branch after collision review | Blocked | Only through eligible conflict workflow | Blocked | One-use authority bound to canonical path, observed file identity, and baseline/digest. Any target change invalidates consent. |
| Save as Separate Template | Allowed for eligible template | Blocked | Allowed only after conflict is resolved or to a distinct create-new target | **Blocked** | Creates new `templateId`; keeps inert origin identity/revision/digest; binds editor only after verified commit. Existing assignments remain unchanged. It is not a reconciliation rescue command. |
| Fork as New Project | Allowed when no blocking lifecycle/base state exists | Blocked | Allowed only to a distinct create-new target without rebinding or replacing the conflicted target | Blocked except through the separately defined rescue Save As path | Creates a new top-level Log Project identity with inert origin provenance; binds only after verified commit. |
| Save a Copy | Semantics settled if exposed: writes a copy without rebinding | Blocked | Cannot bypass conflict/reconciliation gates | Blocked | Not a v0.9 command under the final product scope; any future inclusion requires an explicit specification change. |
| Accepted Refresh, deliberate Embedded Template Representation update, migration, ownership transfer, target/base replacement | Allowed only under their own domain rules | **Rejected non-destructively; name the active Save and captured revision, invite retry after completion, and never queue/replay automatically** | **Blocked** where they would obscure baseline/identity | **Blocked** | These commands alter target, identity, or base semantics and cannot overlap Save. Accepted Refresh and deliberate Embedded Template Representation update are each one named Undo transaction when completed. |
| View/copy visible content | Allowed | Allowed | Allowed | Allowed | Copy must still respect client-data/privacy rules. |

## Save and queued-Save transitions

| Event/precondition | Transition | Feedback | Failure/cancel behavior |
|---|---|---|---|
| Save invoked while idle and targeted | Capture current revision N; start candidate pipeline. | Name document, revision, and Authoritative File. | Pre-replacement failure retains dirty state; no false success. |
| Save invoked while Save active | Set one coalesced `queuedLatestSave`; additional Save commands do not add queue entries or run concurrently. | “Save latest after current” visible once. | Queue is canceled visibly on failure, conflict, or uncertainty. |
| Close/Quit/update review begins with `queuedLatestSave` pending | Represent it as a named pending operation; lifecycle finalization waits for it. | The row distinguishes the active Save from “Save latest after current.” | The user may cancel only the not-yet-started follow-up; the active Save is unaffected. |
| Revision N verifies and no later edits exist | Advance durable revision to N; current document clean. | “Revision N saved to [file].” | If a follow-up Save was explicitly queued, start its named follow-up transaction; do not silently elide the request. |
| Revision N verifies and working revision is N+k | Advance durable revision to N; retain dirty state. | “Revision N saved to [file]; current revision N+k still has unsaved changes.” Expose both revisions in lifecycle details. | If queued-latest exists, capture the then-current revision and begin one follow-up Save. |
| Active Save reaches proven cancellable phase and user invokes Cancel Save | Request operation cancellation. | Named cancellation progress and classified final outcome. | Never call cancellation success until authoritative target/candidate state is classified. |
| Replacement may have occurred | Enter `replacingAndVerifying`; Cancel Save unavailable. | “Finishing and verifying Save”; lifecycle intents wait. | Verification failure enters reconciliation, not generic failure. |
| Candidate writing/validation fails before replacement could occur | Enter classified `preReplacementFailure`; retain dirty and revision-ahead state. | Name the phase and target; offer fresh Save, Save As, details, or dismiss. | Never enter uncertainty, retry automatically, or claim the Authoritative File changed. |

The selected constrained-package contract is settled by ADR 0003 and the closed #33 evidence. Exact cancellable phases, deadlines, filesystem calls, storage outcomes, and packaged-process enforcement remain release-gated by #36/#37; #42 owns resource bounds.

## Save As, identity, and duplicate-open matrix

| Situation | Available commands | Settled result | Prohibited behavior |
|---|---|---|---|
| New path absent | Save As create-new | Preserve document identity; bind new Authoritative File only after verified commit. | Silent suffixing or binding before verification. |
| Chosen path exists | Return to collision review; Compare where valid; distinct Replace Existing | Replacement consent is one-use and invalidated by any creation, deletion, replacement, identity change, or content change. Return to collision review while retaining the proposed path. Final recheck occurs inside commit authority. | Treat OS file-picker confirmation as commit authority or silently suffix the name. |
| Save as Separate Template | Choose new create-only target; verify commit | New `templateId`; inert origin provenance; active editor rebinds to new template. | Retarget existing Template Assignments or create live inheritance. |
| Fork as New Project | Choose new create-only target; verify commit | New top-level Log Project identity; inert origin provenance; active fork binds only after verified commit. | Filesystem copying, Save a Copy, or path change as an automatic identity fork. |
| Same stable identity already writable at another path | Switch to Open Document; Compare; bounded read-only inspection; explicit Fork as New Project | One writable Document Owner across paths. | Edit, export, Save, automatic fork, one writable owner per path, or automatic identity mutation. |
| Future Save a Copy | Choose new create-only copy target | Open document remains bound to its existing target and identity. | Rebinding the open document. |

Package identity discovery and validation follow the selected ADR 0003/#33 contract. Exact path canonicalization, no-clobber races, and supported-storage publication remain release-gated by #36; Electron ownership/routing enforcement remains gated by #37.

## External Change and missing-target matrix

| State | Commands exposed | Preconditions/result | Commands withheld |
|---|---|---|---|
| Comparable External Change | Compare; Save As; Reload when clean; Discard Local Changes and Reload when dirty; Replace External when eligible | Compare is three-way: opened baseline, current local work, and current external target, grouped by domain category. No automatic merge. | Generic Overwrite, silent reload, timestamp-only authorization. |
| Compare completes, is canceled, or fails | Preserve `externalBaseline = changed`, working/durable revisions, mutation freeze, and publication block | Completion shows differences only; cancellation/failure changes no document or basis. | Treating inspection as conflict resolution or acceptance. |
| Eligible Replace External | Compare completed; target is valid, trusted, compatible, and same stable identity; confirmation names the Authoritative File, local revision being published, and external revision being abandoned | Acquire exclusive authority and repeat identity/baseline check immediately before replacement. Only verified replacement establishes the local revision as the new working/durable baseline and clears the conflict/freeze. | Replacement of different-identity, corrupt, untrusted, incompatible, or safely uncomparable target. |
| Dirty local work + Reload request | Verified Save As or explicit Discard Local Changes and Reload | Reload is deliberate and visible. | Generic confirmation that silently discards. |
| Clean local work + Reload request | Visible Reload | Only verified Reload External establishes the verified external revision as the new working/durable baseline and clears the conflict/freeze. | Automatic background reload. |
| Save As during External Change | Distinct create-new target | Only verified Save As binds the new Authoritative File, establishes its verified baseline, and clears the conflict/freeze for that continuing document. | Treating target selection or an unverified write as resolution. |
| Resolution command fails or remains uncertain | Preserve conflict, baseline, revisions, mutation freeze, and publication block | Report the classified failure and retain the same resolution commands when still safe. | Partial unfreeze, publication, or implicit basis change. |
| Clean local work before disposition | Compare; Reload External; Save As; eligible deliberate Replace External; view/copy | Compare is inspection-only. Freeze new mutations until verified Reload External, verified Save As, or eligible deliberate Replace External completes. | Treating Compare or preview/preflight as basis-changing. |
| Any unresolved External Change | Preview; preflight; conflict-resolution commands | Existing Log Documents remain untouched. | Authoritative PDF publication until Reload, Save As, or eligible deliberate Replace External resolves the conflict. |
| Save as Separate Template or Fork as New Project from a conflicted document | Distinct create-new target and identity | Creates a different document branch only after verified commit. The original remains conflicted, frozen when clean, and publication-blocked; the branch command does not resolve or unfreeze it. | Treating a fork as a fourth conflict-resolution exit for the original. |
| Authoritative File missing | Locate Moved File; Save As; Recreate Here | Recreate Here uses create-new/no-clobber publication. Locate rebinds only after trust, compatibility, stable identity, and acceptable lineage/baseline are verified. | Ordinary Save silently recreating, filename-only or heuristic rebind, or rebinding an ineligible package. |
| Untrusted/unreadable/incompatible external target | Save As; bounded safe inspection if later package policy permits | Explicitly “uncomparable.” | Replace External or partial interpretation. |

`Discard Local Changes and Reload` establishes a new working and durable baseline with a new Undo history. Its confirmation states that ordinary Undo cannot restore the discarded branch; recovery never restores it automatically.

The final domain/product specifications and selected #21/#33 boundaries settle semantic comparison categories, contained-object identity, and package validation. Path/identity race behavior remains release-gated by #36; resource bounds remain gated by #42.

## Reconciliation matrix

Entering genuine uncertainty freezes new mutations but preserves all accepted revision-ahead work. Viewing and copying remain available.

| Classification/result | State and feedback | Commands allowed | Commands prohibited |
|---|---|---|---|
| `old-valid` | Report Save not committed; prior Authoritative File intact; document remains dirty. | Fresh Save; Save As; Retry Commit only if the selected adapter proves the candidate reusable, after newly acquired authority and fresh inside-authority recheck. | Automatic candidate retry; treating candidate existence as Save success. |
| `new-valid` | Independently verify intended target revision; advance durable revision and bind Save As target. Remain dirty if later work exists; report both revisions. | Normal commands after verified classification. | Automatic rollback or unnecessary repeat Save. |
| `conflict/not attempted` | Exit reconciliation into External Change conflict; preserve target and dirty work. | Explicit conflict workflow only. | Generic failure, automatic retry/replacement. |
| Still uncertain | Remain reconciliation-required and mutation-frozen. | Retry Read-Only Classification; redacted artifact/status inspection; rescue Save As to a distinct create-new target; copy visible content; Remain Open. | Ordinary Save to original; Replace External; Reload; automatic restoration; Mark Saved; destructive cleanup. |

Candidate reuse and classification must satisfy the selected package and lifecycle contracts. Exact storage outcomes, retry limits, rescue mechanics, and packaged-process enforcement remain release-gated by #36/#37; #42 owns bounded resource behavior.

## Close, Close All, Quit, and Update & Restart matrix

### Review surface contract

- One application-owned surface contains a stable row per affected Log Project/Log Template and separate rows for active Save/export operations.
- Row order is captured tab/window order at intent start. The active document is marked but not moved.
- Clean rows are informational. Dirty targeted rows default to Save; untargeted rows default to Save As.
- Discard is never preselected, inherited, or globally applied. The final command states exact counts and consequences.
- Active-operation rows expose progress and only proven safe cancellation commands.
- `Cancel Close`, `Cancel Quit`, and `Not Now` cancel only the lifecycle intent and leave documents and operations intact.
- `Keep Open` on any row cancels the entire application-wide lifecycle intent before execution. It never creates a partial Quit or closes other rows.
- Once serial execution begins, `Stop After Current Operation` starts no later Save, discard, close, or restart. Completed saves remain durable and pending rows return visibly to review.
- A queued `Save latest after current` is a named pending operation. Finalization waits for it unless the user cancels that not-yet-started follow-up without canceling the active Save.

### Coordinator transition table

| Current state/event | Coordinator action | Success | Failure/change |
|---|---|---|---|
| Close requested for one document | Open a window-owned one-document task dialog using the same Save/Save As/Discard, active-operation, and final-recheck rules. | Close only that document after its requested Save verifies and its final recheck passes. | Cancel or any unresolved/failing state keeps the document open; unrelated documents are untouched. |
| Close All/Quit requested | Snapshot affected row identities/order; enter disposition review. | Continue only after every required choice is explicit. | Cancel returns to prior app state without mutation. |
| Update & Restart requested | Use the same review and operation rows. | Becomes restart-ready only after clean/resolved final recheck. | Not Now defers ordinary update and changes no document. |
| Review confirmed | Save serially in visible row order. | Mark each completed Save; keep it completed. | Stop at first failure. No rollback, discard, or close. Focus failed row; later rows remain pending. |
| Stop After Current Operation requested during serial execution | Let only the active operation reach its classified terminal state. | Preserve completed saves; return to review with completed and pending rows marked. | Start no later Save, discard, close, or restart; phase-safe Cancel Save remains a separate command. |
| All requested saves succeeded | Recheck every document revision/state and active operation. | Apply approved discards and closes only when every row remains eligible. | New dirty work, conflict, reconciliation, or operation returns that row to review and stops finalization. |
| Final recheck succeeds with staged discards | Acquire lifecycle authority and apply each explicitly approved discard immediately before closing. | Complete the requested close only after every disposition remains valid. | Any intervening mutation aborts finalization before later discards/close and returns to review. |
| Save/export active | Show named progress row; other choices may be collected. | Completion updates row and permits recheck. | Final continuation remains disabled until completion or safe explicit cancellation. |
| Cancel Export offered | Only when the export adapter proves cancellation cannot leave a misleading completed Log Document. | Classify and remove or visibly retain every partial candidate according to the export contract; existing Log Documents remain untouched. | Treating an incomplete or unverified output as published, or offering Cancel without proof. |
| Cancel lifecycle intent during active work | Cancel only Close/Quit/update intent. | Existing Save/export continues unaffected. | No operation cancellation is inferred. |
| Keep Open selected before execution | Cancel the entire Close All/Quit/update intent. | Return with every document and operation intact. | No staged Save, discard, close, or restart begins. |
| Ordinary update downloaded | Show persistent non-modal pending state. | Explicit Update & Restart begins coordinator flow. | User may defer while policy permits. |
| Update & Restart requested while Close/Quit owns the coordinator | Keep update intent separate and waiting. | Offer Update & Restart again only after the existing lifecycle flow terminates; if the user defers, leave the downloaded update pending and the current app running. | Piggyback installation on Quit or supersede the active lifecycle intent. |
| Managed deadline expires | Enter lifecycle-only mode. | Permit Save/Save As/conflict/recovery and safe active-work completion; once clean, require explicit Restart Now. | New documents and new edits remain blocked; never force discard or unsafe cancellation. |
| Windows shutdown/sign-out | Request supported bounded deferral; identify dirty documents/operations. | Orderly lifecycle path if OS and user permit. | Never auto-discard or start authoritative Save without consent. If forced, rely on validated Recovery Candidates and record incomplete orderly Quit. |

A document in `reconciliationRequired` makes discard, Close, Quit, and update restart unavailable. Canceling the lifecycle intent leaves the reconciliation state, evidence, and every document intact. Verified rescue Save As may satisfy the document's durability requirement only after it creates and verifies a distinct Authoritative File.

Exact Save/export cancellation phases, waits, deadlines, progress thresholds, storage outcomes, and OS-shutdown integration remain release-gated by #36/#37. Managed-update reminder/grace timing, installer authority, forced-management behavior, and final packaged restart remain gated by #39. Recovery enablement during forced termination additionally requires the approvals/mechanics routed through #38.

## Prompt, focus, keyboard, and announcement contract

| Concern | Settled behavior | Explicitly not claimed |
|---|---|---|
| Ownership/modality | Single-document Close is owned by its window. Close All, Quit, and Update & Restart use one application-modal task dialog. Avoid nested dialogs except a user-invoked OS file picker. | No claim that a particular Electron/native implementation already meets this contract. |
| Accessible name/description | Name exact command and affected count; describe the blocking reason. Each row group names artifact kind/title, Authoritative File, state, and consequence. | No generic Yes/No/Overwrite/Cancel wording. |
| Initial focus | Focus the heading/summary, never Discard or final destructive action. | No framework-default focus. |
| Enter/Escape | Enter activates only the focused control. Escape invokes the named lifecycle cancellation only, never Cancel Save/Export. | No implicit global Continue/Quit activation. |
| Row progress | After a row resolves, focus the next unresolved row. | No dynamic severity reorder. |
| Error focus | Move focus to the failed row's error heading after one assertive failure announcement. | No repeated full-dialog announcement. |
| Restoration | On lifecycle cancellation, restore the invoking control/tab by stable identity. On successful closure, focus the next surviving tab or start surface. | No focus loss to document body or browser chrome. |
| Announcements | Dialog name/description once; meaningful phase and row completion politely; blocking failure once assertively; final saved/discarded/pending counts. | No pointer announcements, every-percent speech, or full table replay after each update. |
| Visual semantics | State and consequence never rely on color alone. | No WCAG conformance claim from semantic markup alone. |
| Command rejected during Save | Keep focus on or restore it to the invoking command; identify the active Save, captured revision, and retry-after-completion action in text. | No silent queue, disabled control without explanation, or automatic replay. |
| Queued follow-up cancellation | Name “Save latest after current” and state that only the not-yet-started follow-up will be canceled. | No implication that the active Save is canceled or rolled back. |
| Fork or Locate validation | Name source and proposed target using privacy-safe display identity; focus the first validation error or the verified-commit progress heading. | No filename-only identity claim or generic “invalid file.” |
| External-conflict publication block | Preview/preflight remains usable; publication control describes the unresolved Authoritative File conflict and named resolution actions. | No warning-only publication or silent export. |
| Mutation rejected during clean External Change | Keep focus on or restore it to the invoking command; state that Compare is inspection-only and name Reload External, Save As, and eligible Replace External as the resolution paths. | No silent rejection or implication that Compare enables editing. |
| Compare completion/cancel/failure | State that the working basis is unchanged, editing remains frozen, and authoritative publication remains blocked; preserve focus on the conflict surface or invoking control. | No success wording that implies acceptance or resolution. |
| Pre-replacement failure | Focus the classified failure heading; announce it once assertively; expose phase, target, unchanged-authority status, and fresh Save/Save As/details/dismiss actions. | No uncertainty wording or automatic retry. |
| Stop After Current Operation | Describe the active operation, completed durable saves, and pending rows; after stopping, focus the review summary. | No “Cancel” wording or implication that completed saves are undone. |
| Recovery discard failure | Keep the candidate row visible, focus its Diagnostic, and announce failure once. | No row removal before cleanup success. |
| Warning acknowledgment/suppression | State whether the action is one-export transient or persistent/undoable/dirtying; focus returns to the affected Diagnostic or export review. | No hidden dirty-state change or disappearance of the underlying Diagnostic. |

Final prompt copy, realistic large-set navigation, packaged-Electron focus behavior, and observed Narrator/NVDA/JAWS, forced-colour, text-size, and display-scale behavior remain **blocked by #34 and #40**. Those tickets may require implementation-detail adjustments without reopening the settled safety semantics.

## Recovery Review state and command matrix

Recovery Review is persistent and non-modal. It never blocks startup merely because a candidate exists.

Discovery is announced once. A durable Recovery Review badge or panel remains available until every candidate is opened, deliberately discarded, or retained through `Later`; navigating elsewhere does not make unresolved candidates disappear.

| Candidate/group state | Presentation | Commands | Result/guard |
|---|---|---|---|
| Multiple candidates | Group by stable document identity and recorded base digest. Put uncertain/action-required groups first; newest-first only within a group. | Compare; Open Separately; Discard; Later. | Ordering never selects a winner automatically. |
| Comparable candidate | Compare candidate with recorded durable base and currently verified Authoritative File where available. | Open comparison details. | Summarize document changes, Source Snapshot freshness, ETR digests, Presentation Overrides, and validation state. Missing/mismatched baseline is labeled incomplete. |
| Open Separately | Create a separate untargeted dirty document with a new Document Identity, its own Document Owner, and inert recovery-origin provenance; leave the original document and identity untouched. | Save As; governed Replace Existing when independently eligible; Continue Editing. | Does not satisfy or overwrite the original automatically. Candidate remains until verified save or deliberate discard. No second writable owner for one identity is created. |
| Later/unresolved/not safely saved | Remains review-eligible. | Later; Compare; Open Separately; Discard with confirmation. | Numeric retention is not inferred. |
| Equivalent to verified durable revision | Becomes cleanup-eligible. | Explicit Discard/cleanup under policy. | Eligibility never means silent deletion. |
| Discard requested | Confirm per candidate; bulk action enumerates every target. | Confirm Discard or Cancel. | Remove row only after cleanup success. Failure keeps row and raises Diagnostic. |
| Default list privacy | Show document kind, safe display identity, time, recovery/divergence state, and validation status. | Deliberate details action under later privacy policy. | No thumbnails, dynamic text, Source Data, override values, credentials, or unrestricted paths by default. |

Package validation follows the selected ADR 0003/#33 contract, and the recovery policy settles comparison, interval, count, age, bytes, pressure, encryption, eligibility, shared-profile, deletion, uninstall, and reconciliation behavior. Storage cleanup remains release-gated by #36; startup/process behavior by #37; organizational recovery approval by #38; uninstall mechanics by #39; and observed accessibility by #34/#40.

## Intact Embedded Template Representation export warning

| Condition | Gate | Commands/effect | Audit/visibility |
|---|---|---|---|
| Library template missing or changed; exact required ETR intact and renderable | Warning | Acknowledge for this export, or apply an eligible narrow project suppression. | Diagnostic remains visible in assignment state, preflight, centralized Diagnostics, and Publication Audit. |
| Acknowledgment | Valid only for exact export attempt, project revision, ETR ID/digest, and observed library condition. | Satisfies this export gate only; transient and does not dirty the Log Project. | Recorded in that export's Publication Audit. Later export or any bound-state change requires renewal. |
| Suppression | Project-local only, bound to exact Diagnostic rule, ETR ID/digest, missing/changed condition, and rationale. | Creating, changing, or removing it is one undoable Log Project mutation and makes the project dirty; it becomes inapplicable when embedded/library state changes. | No user-global, name-based, or all-warning suppression. |
| Export proceeds under warning | Publication Audit is mandatory for that export. | Record Diagnostic code, project/export revision, ETR ID/digest, expected/observed library condition/digest, affected assignments, acknowledgment/suppression, rationale, actor/time where available, and export result. | Exclude full paths and template contents. |
| ETR missing, corrupt, untrusted, incompatible, or unrenderable | Unsuppressible error | Export blocked. | Remains visible with actionable Diagnostic. |

The final product specification §11.2 settles default acknowledgment/suppression authority and permits firm policy to narrow it; lifecycle replacement and publication commands retain their named authority checks. Package persistence follows the selected ADR 0003/#33 contract. Final prompt accessibility remains release-gated by #34/#40.

## Explicit live evidence and approval register

| Live gate | Settled behavior whose enablement is gated | Required release evidence/approval |
|---|---|---|
| #34 | Final lifecycle prompt interaction at realistic scale, keyboard task completion, and screen-reader behavior. | Controlled packaged UI exercise; #34 depends on #40. |
| #36 | Supported-storage qualification; create-new/no-clobber and replacement guarantees; exact Save As races; path/case/reparse behavior; cancellation and retry outcomes. | Direct storage durability/Save As matrix. |
| #37 | Actual Electron ownership/routing, operation cancellation, parser/export crash behavior, OS shutdown/sign-out, process restart, and lifecycle authority survival. | Pinned packaged-Electron prototype. |
| #38 | Organizational enablement of the settled Recovery Candidate content, retention, privacy, encryption-attestation, shared-profile, deletion, hold, and reconciliation policy. | Firm security/privacy/records approval plus routed mechanics evidence. |
| #39 | Updater/installer choice, managed deadline source, reminder/grace cadence, restart handoff, forced-management interaction, signing, rollback, and compatibility window. | Signed Windows installer/update/rollback bake-off and firm IT policy. |
| #40 | Controlled OS/Electron/AT versions, observer/transcript/privacy authority, Narrator/NVDA/JAWS, contrast themes, 200% text, and display scaling. | Controlled accessibility environment before #34/final acceptance. |
| #42 | Package/layout/PDF resource limits, streaming/backpressure, contention, cancellation, and hostile-corpus bounds. | Bounded measurements and fail-closed limit evidence. |
| #43 | Authorized positive source shapes, source/asset rights, and any hostile native-decoder containment prerequisite. | Authorized clean-room evidence and redistribution/security approval; otherwise the capability stays blocked or neutral. |

## Settled-scope completion check

For the #35 scope recorded here, an implementation specification must be able to answer all of the following without invention:

- which immutable revision a Save owns and why a later working revision remains dirty;
- whether Save is idle, queued, failed before replacement, externally conflicted, or genuinely uncertain;
- which exact named commands are safe in each state;
- when Save As preserves identity, a template fork creates identity, and a copy does not rebind;
- why external replacement consent expired or a target is ineligible;
- how every reconciliation result changes durable revision and command availability;
- which document/operation row blocks Close All, Quit, or Update & Restart;
- why partial Save success is retained without any partial discard/close;
- what Cancel applies to, where focus moves, and what is announced;
- why a Recovery Candidate remains separate and what makes it cleanup-eligible; and
- why an intact-ETR warning may pass one export while the underlying Diagnostic remains visible.
- why a blocked command during Save was rejected rather than queued, and what may be retried;
- why a clean External Change freezes edits and blocks authoritative publication;
- which lifecycle effects are outside Undo and which base-changing document commands create one named Undo transaction;
- how Fork as New Project differs from Save As, Save a Copy, and a same-identity duplicate;
- how Keep Open before execution differs from Stop After Current Operation after execution; and
- why a transient acknowledgment leaves dirty state unchanged while persistent suppression mutates it.

Anything requiring evidence or approval from the live-gate register must remain unavailable, conservatively bounded, or explicitly labeled unsupported until that gate closes. Closed specification tickets remain authority/evidence references, not open blockers.

## Decision traceability

This table proves where every #35 grilling decision is represented. `Accepted` means the product semantic is recorded; it does not claim that an externally blocked mechanism has been prototyped or accepted.

| Question | Decision topic | Normative location | Status / external owner |
|---:|---|---|---|
| Q1 | Editing during Save | Invariants 1–2; revision axis; command matrix; save transitions | Accepted; #36/#37 mechanics evidence |
| Q2 | Save As collision authority | Invariants 3/6; command and Save As matrices | Accepted; #36 no-clobber/race evidence |
| Q3 | Save As and identity | Command and Save As matrices; `Document Identity` glossary | Accepted; selected package identity contract, #36 path mechanics |
| Q4 | Deliberate external replacement | External Change matrix | Accepted; final product/domain authority, #36 race evidence |
| Q5 | Uncertain Save reconciliation | Revision/save axes; reconciliation matrix | Accepted; selected classifier contract, #36/#37 mechanics evidence |
| Q6 | Multi-document disposition | Invariant 8; lifecycle axis; review/coordinator tables | Accepted; coordinator proof #37 |
| Q7 | Active Save/export during lifecycle intent | Invariant 7; save transitions; review/coordinator tables | Accepted; #36/#37 cancellation evidence |
| Q8 | Update restart ordering | Lifecycle axis and coordinator table | Accepted; installer/cadence #39 |
| Q9 | Recovery Review surface | Recovery Review contract and matrix | Accepted; final recovery policy, #36–#39 evidence/approval |
| Q10 | Missing/changed library-template export severity | Invariant 10; intact-ETR warning table | Accepted; final product authority and selected package persistence |
| Q11 | Accessible lifecycle prompts | Prompt/focus/announcement contract | Accepted normatively; observed behavior #34/#40 |
| Q12 | Commands while revision N saves | Command matrix | Accepted; runtime enforcement #37 |
| Q13 | Repeated Save | Revision axis; save transitions | Accepted; #36/#37 operation mechanics |
| Q14 | Older-revision Save feedback | Save transitions | Accepted; final copy/AT #34/#40 |
| Q15 | Replace Existing authority lifetime | Command and Save As matrices | Accepted; #36 canonicalization/race evidence |
| Q16 | Duplicate identity across paths | Invariant 5; ownership state; duplicate-open matrix | Accepted; selected identity contract, #36 discovery and #37 routing evidence |
| Q17 | Save as Separate Template effects | Command and Save As matrices | Accepted; final domain/product provenance and selected package persistence |
| Q18 | External comparison model | External Change matrix | Accepted; final domain/product comparison semantics |
| Q19 | Reload External with local work | External Change matrix | Accepted; final product default authority |
| Q20 | Replace External eligibility | External Change matrix | Accepted; final domain/package validation and #36 race evidence |
| Q21 | Missing Authoritative File | External Change/missing-target matrix | Accepted; #36 path/no-clobber evidence |
| Q22 | Reconciled `old-valid` | Reconciliation matrix | Accepted; selected candidate contract, #36/#37 mechanics evidence |
| Q23 | Reconciled `new-valid` | Reconciliation matrix | Accepted; #36/#37 verification evidence |
| Q24 | Reconciled conflict/not attempted | Reconciliation matrix | Accepted; final comparison semantics and #36 race evidence |
| Q25 | Editing during genuine uncertainty | Invariant 17; reconciliation matrix | Accepted; selected classifier contract and #36/#37 evidence |
| Q26 | Safe commands while uncertainty remains | Reconciliation matrix | Accepted; selected classifier contract and #36/#37 rescue evidence |
| Q27 | Multi-document rows and order | Review surface contract | Accepted; large-set navigation #34/#40 |
| Q28 | Row choices and safe defaults | Review surface contract | Accepted; final product role defaults, observed UX #34/#40 |
| Q29 | Save execution and partial success | Coordinator table | Accepted; #36/#37 runtime evidence |
| Q30 | Final revision/state recheck | Coordinator table | Accepted; authority/runtime #36/#37 |
| Q31 | Active-operation lifecycle rows | Review surface and coordinator tables | Accepted; #36/#37 phase/progress evidence |
| Q32 | Explicit operation cancellation | Save axis/transitions and review contract | Accepted; #36/#37 exact-phase/outcome evidence |
| Q33 | Windows shutdown/sign-out | Coordinator table | Accepted; packaged behavior #37, recovery approval #38 |
| Q34 | Mandatory managed update deadline | Lifecycle axis and coordinator table | Accepted; cadence/restart #39 |
| Q35 | Prompt ownership and structure | Prompt/focus/announcement contract | Accepted; packaged/AT proof #34/#40 |
| Q36 | Initial focus and restoration | Prompt/focus/announcement contract | Accepted; observed keyboard/AT #34/#40 |
| Q37 | Announcements and progress | Prompt/focus/announcement contract | Accepted; observed AT #34/#40 |
| Q38 | Recovery grouping and order | Recovery Review matrix | Accepted; final recovery policy, #37 mechanics and #38 approval |
| Q39 | Recovery comparison basis | Recovery Review matrix | Accepted; final domain/recovery comparison and privacy policy |
| Q40 | Open Recovery Separately | Recovery Review matrix | Accepted; new identity per Q63, #36/#37 mechanics evidence |
| Q41 | Logical recovery retention eligibility | Recovery Review matrix | Accepted; final numeric policy, #36 cleanup evidence |
| Q42 | Recovery Review privacy | Recovery Review matrix | Accepted; final privacy policy, observed AT #34/#40 |
| Q43 | Recovery discard and cleanup | Recovery Review matrix; prompt contract | Accepted; #36 deletion evidence and #38 approval |
| Q44 | Warning acknowledgment lifetime | Intact-ETR warning table | Accepted; final product authority and selected package persistence |
| Q45 | Persistent suppression scope | Intact-ETR warning table | Accepted; final product authority and selected package persistence |
| Q46 | Publication Audit under warning | Intact-ETR warning table | Accepted; final product/acceptance authority and selected package persistence |
| Q47 | Diagnostic visibility after action | Intact-ETR warning table | Accepted; presentation/AT #34/#40 |
| Q48 | Blocked command during Save | Invariant 15; command matrix; prompt contract | Accepted; enforcement #37 |
| Q49 | Queued follow-up Save in lifecycle flow | Save transitions; review contract | Accepted; #36/#37 operation mechanics evidence |
| Q50 | Undo boundary | Invariants 13–14; command matrix | Accepted; final domain/UX governance |
| Q51 | Fork as New Project | Command and identity matrices; glossary | Accepted; final domain/package contract and #36/#37 storage/routing evidence |
| Q52 | Clean External Change mutation freeze | Invariant 16; decision-frontier status; External Change matrix | Accepted; Compare is inspection-only per Q62 |
| Q53 | Publication during External Change | External Change matrix; prompt contract | Accepted; final product authority and #36 mechanics evidence |
| Q54 | Locate Moved File validation | External Change matrix; prompt contract | Accepted; selected package validation and #36/#37 path/routing evidence |
| Q55 | Undo after discard/reload | External Change matrix | Accepted |
| Q56 | Pre-replacement Save failure | Save transitions; prompt contract | Accepted; #36/#37 mechanics evidence |
| Q57 | Lifecycle intent during uncertainty | Invariant 17; reconciliation/coordinator rules | Accepted; selected classifier contract and #36/#37 rescue evidence |
| Q58 | Keep Open before execution | Review surface and coordinator tables | Accepted; final interaction #34/#40 |
| Q59 | Stop After Current Operation | Review surface and coordinator tables | Accepted; #36/#37 runtime coordination evidence |
| Q60 | Staged discard application | Invariant 8; coordinator table | Accepted; authority/runtime #36/#37 |
| Q61 | Warning actions and dirty state | Invariant 18; intact-ETR warning table | Accepted; final product authority and selected package persistence |
| Q62 | Compare effect on clean External Change freeze | Decision-frontier status; invariant 16; External Change matrix | Accepted; Compare is inspection-only |
| Q63 | Document Identity of Open Recovery Separately | Decision-frontier status; Recovery Review matrix; glossary | Accepted; new identity with inert recovery-origin provenance |
