# Issue #20 scratch decision draft

**Status:** Decision synthesis from two disposable prototype streams; not a product specification, architecture decision record, implementation artifact, or claim that ticket #20 is complete.
**Evidence cut:** 2026-08-14.
**Inputs:** [lifecycle state-model prototype](rsrender-lifecycle-state-model.html), [empirical findings](empirical/findings.md), [authoritative empirical summary](empirical/runs/20260814T015439.375829Z/raw/summary.json), and [review rubric](review-rubric.md).

## Question and outcome

**Question.** Can RSrender use one explicit lifecycle model for open `Log Project`s and `Log Template`s while keeping the working document, authoritative file, recovery candidates, embedded effective template, package trust/compatibility, multi-document Close/Quit, and application update/rollback independent enough to prevent silent loss or rewrite? What persistence behavior has actually been demonstrated on this Windows host?

**Outcome.** The two streams support adopting the logical lifecycle vocabulary and a **candidate local-fixed-NTFS save/recovery contract**. They also establish a real negative result: a digest/baseline check performed before commit is insufficient across processes because two writers can both pass the check and then overwrite one another. RSrender must have one document owner or an exclusive cross-process coordination primitive and must recheck the baseline while holding it.

The outcome is deliberately partial. The empirical harness reported **74/74 expected outcomes**, meaning that its 52 observations, 18 prototype-logic checks, and four explicit deferrals matched the harness's declared expectations. That number is not a coverage metric, a durability proof, an Electron result, or evidence for untested Windows environments. Ticket #20's full Windows done criterion is **not met**. It should remain open, or be explicitly narrowed to these two evidence streams while the follow-up tickets below carry the unresolved criteria.

## Evidence-grade ledger

The labels below use the [review rubric's definitions](review-rubric.md): **Observed** means executed on the recorded host; **Simulated** means exercised only as explicit prototype logic; **Documented** means a primary-source guarantee carried by the two prerequisite reports but not reproduced locally; **Open** means more environment, product, or policy evidence is required. The empirical harness's `prototype-logic` results are normalized to **Simulated** here.

| Claim | Grade | Exact evidence | Supports | Does not support |
|---|---|---|---|---|
| Dirty state can remain domain-owned and derived from `workingRevision != durableRevision` through edit, save failure, Close, Quit, update restart, and renderer-crash events. | **Simulated** | [Lifecycle model](rsrender-lifecycle-state-model.html), especially `isDirty`, `INJECT_SAVE_FAILURE`, `REQUEST_CLOSE`, `REQUEST_QUIT`; [lifecycle/update results](empirical/runs/20260814T015439.375829Z/raw/lifecycle_update_results.json) | One shared lifecycle coordinator and non-silent disposition rules. | Electron process survival, renderer topology, OS shutdown, or accessibility behavior. |
| A Save/Save As model can keep a document dirty and unbound until committed-target verification. | **Simulated** | [Lifecycle model](rsrender-lifecycle-state-model.html), `START_SAVE`, `START_SAVE_AS`, `ADVANCE_SAVE`; “Happy Save” and “Save As failure” scenarios | State ordering and user-visible invariants. | The production Save As publish primitive, overwrite races, or disk durability. |
| On this local fixed NTFS volume, sibling candidate → `fsync` → reopen/validate → `ReplaceFileW` with backup → reopen/verify preserved either the old-valid or new-valid file under the injected process-exit, validation, sharing, and read-only cases. | **Observed** | [Save findings](empirical/findings.md#observed-save-and-replacement-behavior); [save results](empirical/runs/20260814T015439.375829Z/raw/save_results.json) | A bounded local-NTFS candidate pipeline for further design. | Kernel/power-loss atomicity, directory-entry durability, actual Electron Node behavior, or any other storage class. |
| A process exit after replacement but before application acknowledgment can leave a new-valid target and old-valid backup. | **Observed** | [Save findings](empirical/findings.md#observed-save-and-replacement-behavior); [save results](empirical/runs/20260814T015439.375829Z/raw/save_results.json) | An explicit post-replace reconciliation state; “save returned failure” is not enough to decide rollback. | Automatic selection of the correct artifact after every power/storage failure. |
| Rechecking a baseline digest before replacement detects an already-visible external edit. | **Observed** | [Save results](empirical/runs/20260814T015439.375829Z/raw/save_results.json) | A necessary conflict gate. | Sufficient concurrent-write protection. |
| Baseline checking alone has a TOCTOU lost-update race: two processes passed the same baseline and both replaced; the second silently won. | **Observed** | [Save findings](empirical/findings.md#observed-save-and-replacement-behavior); [save results](empirical/runs/20260814T015439.375829Z/raw/save_results.json) | Rejection of baseline-only concurrency control. | The final ownership/locking mechanism. |
| A real zero-share lock plus an inside-lock baseline recheck made one local writer commit and the other report conflict. | **Observed** | [Save results](empirical/runs/20260814T015439.375829Z/raw/save_results.json) | A viable local prototype control. | Stale-lock recovery, PID reuse, crashes, SMB/cross-machine coordination, or the choice between single-instance and locking. |
| Recovery candidates can be confined to an app-owned root, keyed to stable document identity/base digest, strictly parsed, ranked deterministically, and opened as an untargeted dirty copy without modifying the original. | **Observed + Simulated** | [Recovery findings](empirical/findings.md#recovery-isolation-and-selection); [recovery results](empirical/runs/20260814T015439.375829Z/raw/recovery_results.json); “Recovery restore/discard” in the [lifecycle model](rsrender-lifecycle-state-model.html) | Isolation, integrity gates, explicit separate-open semantics, and no automatic overwrite. | Retention, encryption, automatic ranking as user choice, or treatment of every divergent generation. |
| One constrained ZIP fixture was accepted and 29 hostile fixtures were rejected before extraction/use with expected stable prototype codes. | **Observed** | [Hostile ZIP findings](empirical/findings.md#hostile-zip-and-windows-path-behavior); [ZIP results](empirical/runs/20260814T015439.375829Z/raw/zip_results.json) | Logical package constraints and a hostile corpus for future candidates. | Selection of ZIP, Python `zipfile`, a production parser, realistic limits, or native asset-decoder safety. |
| Default NTFS/Win32 case/trailing-dot aliases exist, and a real directory junction was detectable and rejected by resolve-and-contain logic. | **Observed** | [Path findings](empirical/findings.md#hostile-zip-and-windows-path-behavior); [path results](empirical/runs/20260814T015439.375829Z/raw/path_results.json) | Windows-portable logical names and reparse-aware temporary-file handling. | A real file-symlink case (creation was denied), every reparse type, or remote filesystem behavior. |
| Trusted future-format content can be limited to metadata-only mode while untrusted content is refused before a domain document opens. | **Simulated; hostile version rejection Observed** | “Incompatible / untrusted” in the [lifecycle model](rsrender-lifecycle-state-model.html); [ZIP results](empirical/runs/20260814T015439.375829Z/raw/zip_results.json) | Separate trust and compatibility gates; no edit/export/save-over for unsupported future versions. | A production metadata reader, migrations, signatures, or trust establishment. |
| A missing library template can continue from the exact embedded effective representation; changed same-identity content is not adopted until comparison and deliberate action, which makes the project dirty. | **Simulated** | “Missing template” in the [lifecycle model](rsrender-lifecycle-state-model.html) | Offline project behavior and no silent name-based substitution. | Export-warning severity, template identity rules, comparison UX, or package serialization. |
| Update restart can use the same lifecycle coordinator; application rollback can leave user files untouched and an older reader can refuse newer content non-destructively. | **Simulated** | “Update rollback” in the [lifecycle model](rsrender-lifecycle-state-model.html); [lifecycle/update results](empirical/runs/20260814T015439.375829Z/raw/lifecycle_update_results.json) | Separation of application installation state from user-file state. | A real installer, signing, updater-feed integrity, rollback mechanics, or compatibility window. |
| A hash detects changed bytes, and Windows reported the inert local probe as `NotSigned`. | **Observed** | [Update findings](empirical/findings.md#dirty-close-and-local-update-constraints); [lifecycle/update results](empirical/runs/20260814T015439.375829Z/raw/lifecycle_update_results.json) | Hash and publisher signature are separate requirements. | Publisher identity, timestamping, installer trust, or tamper-resistant delivery. |
| Electron, SMB/sync/removable storage, hard power loss, enterprise deployment, credential storage, RSLog authentication, and screen-reader behavior are ready for production selection. | **Open** | Explicit exclusions in the [review rubric](review-rubric.md#decision-boundaries) and [empirical findings](empirical/findings.md#required-follow-on-evidence) | Named follow-up scope. | Any production guarantee or final architecture choice. |

## Adopt, Reject, and Open

### Adopt for the next specification/architecture synthesis

| ID | Decision | Boundary and rationale |
|---|---|---|
| A-01 | The domain lifecycle coordinator, not a renderer tab, owns each open document's identity, working/durable revisions, dirty state, save transaction, Close/Quit disposition, and recovery relationship. | The logic is internally coherent and renderer-crash simulation did not erase dirty state. Which Electron process hosts it remains open. |
| A-02 | Dirty is derived from revision state; it is cleared only after the authoritative target has been reopened and verified as the intended committed revision. | A successful candidate write or replacement API return is not sufficient. |
| A-03 | `Save As` does not bind the document to the proposed path until commit verification succeeds. | This is a lifecycle invariant. The Windows create-new/no-clobber implementation remains open. |
| A-04 | Every Save has explicit candidate, validation, replacement, verification, failure/conflict, and uncertain/reconciliation states. | Local NTFS observations show that the post-replace/pre-ack boundary is materially different from a pre-replace failure. |
| A-05 | A stale target is never overwritten silently. Commit requires single-owner authority or exclusive cross-process coordination plus a baseline recheck while that authority is held. | The two-writer experiment falsified baseline-only protection. |
| A-06 | Recovery is app-owned, strictly validated, stable-document-ID/base-digest keyed, and offered for deliberate separate opening. It never auto-overwrites an authoritative file and never counts as Save. | Observed isolation plus simulated lifecycle behavior satisfy the bounded rubric; retention/security policy remains open. |
| A-07 | An opened recovery copy is a new untargeted dirty document with explicit provenance. | This preserves the original and makes the next Save/Save As decision visible. |
| A-08 | Compatibility and trust are orthogonal gates. Unsupported future content cannot edit, export, migrate, Save, or Save As; bounded metadata inspection is allowed only if a future production trust gate and metadata reader can do so safely. | This avoids destructive down-save and partial interpretation. |
| A-09 | A `Log Project` carries the exact effective template representation needed for offline rendering. Missing or changed library content produces a visible diagnostic and no automatic substitution/adoption. | The lifecycle model demonstrates the intended state separation; serialization remains open. |
| A-10 | Close, Close All, Quit, update restart, and application rollback use one multi-document disposition coordinator. Cancel leaves every document and operation intact; a failed save stays dirty. | The coordinator must name every affected artifact and respect active save/export operations. |
| A-11 | Application installation/rollback state is independent from project/template durability. Rollback must not rewrite, restore, or down-save user files. | A prior reader refuses incompatible user files non-destructively. |
| A-12 | Carry a no-extraction, bounded, declarative package profile and the hostile corpus into container/library evaluation. | This adopts logical constraints, not ZIP or the prototype's Python library. |
| A-13 | Product/support language says “validated replacement on supported, tested storage,” not “atomic save.” | The current run does not prove power-loss durability or other storage classes. |
| A-14 | Exactly one update authority is active for an installation, and release identity requires a trusted publisher/signature chain in addition to content hashes. | Hash correctness is not publisher authentication. |

### Reject

| ID | Rejected behavior | Reason |
|---|---|---|
| R-01 | Renderer-owned dirty state or a renderer deciding Close/Quit/update disposition independently. | A crash, reload, or second window could lose lifecycle truth. |
| R-02 | Writing/truncating an authoritative package in place or replacing it before full candidate reopen/schema/hash/semantic validation. | The authoritative old-valid file must survive every pre-commit failure. |
| R-03 | Treating candidate-write success or `ReplaceFileW` return as a completed Save without target verification. | The acknowledgment boundary and durable target can diverge. |
| R-04 | Baseline-digest checking without serialized ownership/locking. | It produced an observed lost update. |
| R-05 | Last-writer-wins, blind retry after an uncertain replacement, or automatic rollback after post-replace/pre-ack interruption. | Each can destroy the only current revision. Reconcile target, candidate, and backup first. |
| R-06 | Automatic recovery overwrite or silent selection of one candidate as authoritative. | Recovery must be a separate, deliberate document choice. |
| R-07 | Extracting package member paths supplied by a package, trusting filename extension/display name, or allowing links, scripts, executables, credentials, or network behavior inside a package. | These expand the trust boundary and enable path/active-content failures. |
| R-08 | Best-effort editing/export/down-save of unsupported future packages or in-place migration on open. | Unknown required data must not be silently discarded; open/migration is side-effect free. |
| R-09 | Substituting a library template by display name or refreshing/adopting it automatically. | Same identity does not prove same content; adoption is a user-visible edit. |
| R-10 | Calling recovery “autosave,” using it to bypass dirty prompts, or treating it as long-term version history. | The authoritative file changes only through verified Save/Save As. |
| R-11 | Multiple simultaneous update authorities or accepting an update because its hash alone matches. | Competing authorities and unauthenticated hashes create rollout and publisher ambiguity. |
| R-12 | Selecting Python `zipfile`, ZIP generally, `ReplaceFileW` for all destinations, or any installer/updater solely because this prototype exercised one API shape. | Disposable tools and one host do not decide production dependencies or guarantees. |

### Open

| ID | Open decision | Evidence owner / route |
|---|---|---|
| O-01 | Whether saves freeze mutation or save an immutable revision while later edits continue “ahead” of it. | Product grilling plus lifecycle UX prototype; then architecture state test. |
| O-02 | Single application instance, per-document ownership transfer, OS lock/lease, or a combination; stale-lock/crash/PID-reuse behavior. | Cross-process ownership prototype. |
| O-03 | Save As create-new/no-clobber/overwrite semantics, filename collision races, and template identity when copied. | Storage prototype plus product grilling. |
| O-04 | Power-loss durability and support policy for local NTFS, SMB, enterprise sync, removable/exFAT, long paths, low-space/quota, AV/EDR, and cross-machine writers. | Isolated Windows storage matrix with IT-owned destinations. |
| O-05 | Physical package envelope, production parser/library, deterministic serialization, numeric limits, parser isolation, asset/font decoding, and migration engine. | Package/container bake-off using actual Electron runtime and authorized sanitized scale fixtures. |
| O-06 | Recovery interval, count/age/byte retention, ranking and comparison UX, cleanup, encryption, client-data eligibility, and IT deletion. | Product/security/records decision plus prototype. |
| O-07 | Close/Quit disposition order, active export cancellation/wait behavior, external-change choices beyond Save As, missing-template export warning/gate, and accessible announcements/focus. | Lifecycle UX grilling and accessible prototype. |
| O-08 | Electron process topology, runtime IPC validation, renderer/preload permissions, parser/layout/export worker containment, crash supervision, and actual Node 24 filesystem behavior. | Electron security prototype after architecture candidates are narrowed. |
| O-09 | RSLog authentication flow and `safeStorage` versus Windows Credential Manager policy. | Rocscience-authorized API research plus firm security policy and an inert credential-broker prototype. |
| O-10 | Installer/updater technology, code-signing identity, timestamping, release channels, IT rollout, proxy/offline behavior, repair/uninstall, and rollback compatibility. | Signed isolated-VM bake-off with firm IT. |

## Lifecycle state vocabulary

The following is a normalized vocabulary for #18 and later specifications. Names describe product state, not class/module names.

| Term / axis | Meaning and allowed state |
|---|---|
| **Open Document Session** | One in-memory session for a `Log Project` or `Log Template`, identified independently from tab/window and filesystem path. |
| **Authoritative File** | The user-selected durable package currently bound to the session. It is absent for an untitled or separately opened recovery document. Candidate, backup, and recovery artifacts are never authoritative merely because they exist. |
| **Working Revision** | Current editable domain revision. It may change only through an accepted domain command. |
| **Durable Revision** | Last revision verified in the authoritative file. On restart after an interrupted save, it is reconstructed by reconciliation, not presumed from a lost in-memory acknowledgment. |
| **Dirty** | Derived predicate `workingRevision != durableRevision`. A failure, conflict, recovery snapshot, renderer crash, or Close request never clears it. |
| **Binding** | `untargeted` or `bound(authoritativeFileId, baselineIdentity, baselineDigest/revision)`. Save As changes binding only after verified commit. |
| **Open Mode** | `editable`, `metadata-only`, or `closed`. Refusal occurs before a document session opens. Metadata-only denies edit, export, migration, Save, and Save As. |
| **Package Trust** | `trusted`, `untrusted/corrupt`, or `not-yet-established`. Trust is independent of version compatibility. Exact signature/provenance mechanics remain open. |
| **Package Compatibility** | `compatible`, `unsupported-future/minimum-reader`, or `invalid`. Compatibility never upgrades trust. |
| **Save Transaction** | Immutable input revision plus operation (`Save`/`Save As`), candidate identity, target identity, captured baseline, phase, and outcome. Whether UI edits pause or create a revision-ahead branch is open. |
| **Save Phase** | `idle` → `writing candidate` → `validating candidate` → `ready to replace` → `replacing target` → `verifying committed target` → `idle`; terminal side states are `failed`, `external-change conflict`, and `uncertain/reconciliation required`. |
| **Target Outcome** | `old-valid`, `new-valid`, `conflict/not attempted`, or `uncertain`. An uncertain result blocks blind retry until target, candidate, and backup are classified. |
| **Recovery Candidate** | App-owned, integrity-checked revision associated with stable document ID and base digest. States include `not scanned`, `discovered`, `opened separately`, `suppressed as same as durable`, `rejected`, and `discarded`. Ranking is not user consent. |
| **Template Resolution** | The embedded effective representation remains active while library state is `available/same digest`, `missing`, or `same identity/different digest`. Changed content becomes active only after explicit compare/adopt, which creates a dirty revision. |
| **Close Disposition** | Per document: no decision, Save/Save As required or active, explicit discard approved, or canceled. A decision for one document never applies to another. |
| **Lifecycle Coordinator** | The application-wide authority that collects every dirty document and active save/export for Close All, Quit, update restart, and rollback. |
| **Application Update State** | Separate from document state: none, downloaded, restart blocked, ready to install, installed, or rolled back. Application actions do not mutate user package revisions. |

## Candidate local-NTFS save and recovery contract

This contract is supported only for an **existing authoritative file on the tested class: a local fixed NTFS volume**, subject to the limitations below. “Candidate” means suitable for the next architecture/specification pass, not production-approved.

### Preconditions and commit sequence

1. The lifecycle coordinator owns the document session and an immutable revision for this save transaction. Production must choose whether later editing pauses or advances a separate working revision.
2. The file broker resolves and canonicalizes the authoritative path, confirms it is an allowed local fixed-NTFS destination, and acquires the selected single-owner/cross-process authority.
3. While authority is held, it reopens the target and compares file identity plus the captured baseline digest/revision. Any mismatch becomes a visible conflict; no replacement occurs.
4. It creates a unique, app-named sibling candidate on the same volume. User/package member names never determine temporary filesystem paths.
5. It serializes the immutable revision completely, flushes/synchronizes and closes the candidate, then reopens it through the strict package reader.
6. It validates envelope structure, manifest/schema/version/kind, normalized uniqueness, part digests, semantic invariants, and resource limits. Any failure leaves the target old-valid and the document dirty.
7. For an existing target, it calls the tested Windows replacement path with an old-valid backup, preserving the candidate/backup evidence required to classify failure. A sharing/read-only error is a visible failed save with dirty state retained.
8. It reopens the target independently and verifies that its document ID, revision, and content digest match the intended candidate.
9. Only after step 8 does it update the session's durable revision/baseline, clear dirty when no later edits exist, acknowledge success, and—if relevant—bind a Save As target.
10. Backup/candidate cleanup follows a bounded retention policy only after outcome classification. Startup never blindly deletes an artifact solely because its filename looks temporary.

The sequence does **not** yet specify how a new Save As target is published without clobbering a concurrently created path, or how explicit overwrite consent is revalidated at commit. Those require follow-up F-01/F-02.

### Failure and reconciliation rules

- Before replacement, the authoritative target must remain byte-identical old-valid. A partial/invalid candidate may be removed only after it is classified and no longer needed for support/recovery.
- After replacement begins, an interruption is `uncertain/reconciliation required` until the target, candidate, and backup are reopened and matched by stable document ID/revision/digest. The application does not automatically roll back and does not retry blindly.
- A target sharing violation, read-only/permission error, validation failure, low-space condition, or external conflict is non-silent, keeps the document dirty, names the target, and offers only actions proven safe for that state (for example retry after resolution or Save As).
- A baseline digest checked outside exclusive authority is never a commit authorization. A single document owner or cross-process lock/lease plus an inside-authority recheck is mandatory.
- If a save captured revision N while working state later reaches N+1, successful verification of N advances only `durableRevision` to N; the document remains dirty. This branch is a required invariant even though the current prototype froze edits.
- Diagnostics distinguish `old-valid`, `new-valid`, `conflict/not attempted`, and `uncertain`; “Save failed” alone is insufficient.

### Recovery rules

- Recovery lives under a dedicated app-owned root, separate from browser/Chromium cache and authoritative project/template directories.
- Every candidate carries stable document ID, base durable digest/revision, candidate revision/generation, creation metadata, format/minimum-reader data, and integrity digest. It contains no RSLog credential.
- Enumeration rejects malformed, incompatible, wrong-document, out-of-root, reparse/symlink, or integrity-failing entries. A candidate semantically equal to the durable revision may be suppressed with an auditable reason.
- The UI identifies the source and candidate(s) and requires deliberate choice. Opening recovery creates a new untargeted dirty document with recovery provenance; the original file remains byte-identical.
- Normal Save never targets the original implicitly from a recovered copy. The user must choose/bind a target through verified Save As or another explicitly specified recovery action.
- Exact generation ordering, compare UI, retention, cleanup, encryption, and client-data policy remain open. The prototype's deterministic ranking is not authority to auto-open or auto-overwrite.

## Logical package constraints; no production container/library selected

These constraints survive the prototype regardless of whether a later bake-off selects constrained ZIP, SQLite, or another self-contained envelope:

1. A package is declarative and self-contained for its stated use. It contains stable project/template identity, version/minimum-reader/kind, the exact embedded effective template needed offline, required assets, and content hashes. It contains no credential, script, executable, active HTML, implicit network request, or installer payload.
2. Opening and compatibility inspection are side-effect free. Migration writes a new validated candidate and never mutates the source. A trusted unsupported-future package is at most metadata-only; untrusted/corrupt content is refused before a domain document opens.
3. The manifest/core schema is closed and strictly decoded: valid UTF-8, duplicate JSON keys rejected, required version/kind/parts checked, unknown required/core fields rejected, and ignorable-extension rules explicitly versioned rather than inferred.
4. Logical part names use one specified Unicode normalization/case-fold policy and a Windows-portable grammar. Reject absolute/UNC/drive/ADS paths, backslashes, empty/dot/traversal components, controls, device names, trailing dot/space, exact/case/Unicode collisions, and link/special-file semantics.
5. Package readers do not extract supplied member names. Streaming/pre-allocation bounds apply before decompression/decoding: total bytes, per-part bytes, part count, nesting, compression ratio, dimensions, complexity, and time/memory. The prototype's deliberately tiny numeric thresholds are not product values.
6. Every required part is present exactly once and digest-verified before domain use. If a ZIP-like envelope is considered, local/central metadata agreement and permitted compression methods are part of the narrow profile.
7. If a decoder requires a file, the broker creates a fresh app-owned root and app-generated filename, rejects reparse points, resolves the final path, and verifies containment immediately before each access. Prefer in-memory/stream decoding when bounded and safe.
8. Package identity, filesystem path, and display name are separate. Copy/Save As/template adoption semantics cannot be inferred from a filename.
9. Deterministic serialization, stable ID generation, physical envelope, production parser/library, schema/migration framework, asset/font handling, backup representation, and production scale limits remain **Open**. Python `zipfile` and the synthetic JSON format are test apparatus only.

## Explicit Windows and environment limitations

The authoritative observations apply to Windows API version `10.0.26200.0`, AMD64, on workspace drive `C:` observed as a local fixed NTFS volume, using Python 3.10.11 standard-library code and direct Windows APIs. Local Node was 22.20.0, not Electron 43's embedded Node 24.18.1. The CIM OS-caption probe was denied. No network or production dependency was used.

The following remain unproved or untested:

- abrupt VM/hardware power loss, kernel crash, directory-entry durability, write-cache/controller behavior, and reboot reconciliation at every save boundary;
- SMB/network shares, cross-machine writers, the firm's actual sync product, cloud placeholders, removable media, exFAT/FAT, ReFS, mapped drives, offline files, and redirected profiles;
- true disk-full, per-user/directory quota, very long paths, path races, ACL inheritance, EFS, corporate antivirus/EDR behavior, backup agents, and high-contention workloads;
- Save As create-new/no-clobber behavior, explicit overwrite races, stale locks, process crash while holding authority, PID reuse, lock cleanup, and network lease semantics;
- actual Electron/Node 24 filesystem and process behavior, ASAR/packaged paths, renderer/main/utility-process crashes, OS session shutdown, sleep/resume, and multi-window ownership transfer;
- a real filesystem file symlink under a token allowed to create one; only ZIP symlink metadata and a real directory junction/reparse point were exercised;
- production-size packages, real fonts/images/SVG/PDF/native decoders, resource exhaustion, parser child-process limits, malicious complexity, and a selected production library;
- recovery encryption, retention, endpoint/client-data policy, Windows profile migration, cleanup, multi-user/shared-machine behavior, and administrative deletion;
- `signtool`, `makeappx`, a signing identity, timestamp authority, Squirrel/NSIS/MSIX/App Installer/Intune, signed feeds, proxy/offline installs, repair, uninstall, downgrade, and rollback;
- Windows Credential Manager, Electron `safeStorage`, real RSLog authentication/tokens, credential rotation/offboarding, and redacted diagnostics;
- keyboard/screen-reader behavior, focus restoration after lifecycle dialogs, high DPI/multi-monitor UI, and commercial release promotion/licensing validation.

## Architecture implications for #18

1. Define a renderer-independent **Document Lifecycle service** as the source of truth for document identity, revisions, dirty state, saves, recoveries, close dispositions, and active operations. This is a logical boundary; #20 has not selected the hosting Electron process.
2. Put authoritative filesystem access behind a narrow **File/Package broker**. Renderers receive document commands and status, not arbitrary paths or filesystem APIs. Runtime IPC validation and capability scoping remain a later prototype requirement.
3. Model Save as a transaction/state machine with a journalable intent/outcome sufficient for restart reconciliation. Do not encode it as one boolean/promise.
4. Keep working document, immutable save revision, authoritative package, sibling candidate, backup, and recovery snapshot as distinct artifact roles with stable IDs/digests.
5. Enforce one owner per open document or a cross-process commit authority. The architecture must make it impossible for two renderer windows to bypass the inside-authority baseline check.
6. Keep the logical package API container-neutral and strict. Parser/decoder isolation is a candidate separate process with time/memory/output bounds, not a conclusion from this run.
7. Make storage support capability-based and explicit. Unsupported/unverified destinations must fail visibly or use a separately specified publish workflow; they must not silently inherit the local-NTFS promise.
8. Use one shared disposition coordinator for document Close/Close All/Quit, window closure, update restart, and rollback. Saving, exporting, and discarding are per-document operations with observable progress/failure.
9. Keep updater/install authority and user-document migration separate. Application rollback never rolls back data; compatibility gates protect newer files from older readers.
10. Give every failure/conflict/refusal a stable diagnostic code, safe user message, affected artifact, next safe action, and redacted support detail. `uncertain` is a first-class state, not a generic exception.

## Exact follow-up tickets required

These are proposed ticket keys for charting, not claimed GitHub issue numbers. If #20 retains its original broad scope, all eight are child/blocking tickets. If #20 is narrowed to the completed evidence, create/link these before closing it.

| Key and title | Type | Exact question / acceptance evidence | Prerequisites and dependency |
|---|---|---|---|
| **I20-F01 — Windows storage durability and Save As matrix** | Prototype / IT prerequisite | Run the selected save adapter under actual Electron Node 24 in isolated VMs/devices. Inject process kill and VM hard reset at every candidate/flush/replace/verify boundary; exercise local NTFS, approved SMB share, firm sync product, removable/exFAT, long path, sharing/AV, read-only/ACL, low-space/quota, and Save As create-new/overwrite races. For each declared-supported class, every run ends old-valid or new-valid with explicit reconciliation and no silent success; unsupported classes have a product-visible policy. | Requires an IT-provided destination matrix, isolated VMs, sanitized synthetic fixtures, and a candidate package adapter from F03. Blocks any durability/support claim. |
| **I20-F02 — Single-owner and cross-process commit authority** | Prototype / architecture decision | Compare single-instance routing, per-document ownership, and OS lock/lease candidates. Reproduce two writers, stale lock, owner crash, PID reuse, restart, multi-window handoff, and—if network storage is proposed—cross-machine coordination. Acceptance: no lost update; baseline is rechecked while authority is held; crash recovery cannot grant two owners; user gets a bounded conflict/recovery path. | Can start from the observed lost-update fixture; feeds #18 and F01. |
| **I20-F03 — Package envelope, parser containment, scale, and migration bake-off** | Research + prototype | Evaluate at least constrained ZIP and SQLite/other shortlisted envelopes without changing the logical contract. Use the hostile corpus plus child-process timeout/memory/output bounds, malformed/native asset decoders, deterministic round trips, actual Electron runtime, authorized sanitized largest datasets, sequential migration fixtures, failed-migration source preservation, unknown/future versions, and old-reader refusal. Record exact dependency versions, licenses, SBOM/notices, performance, and numeric limits. Acceptance: one evidence-backed choice or an explicit unresolved comparison; never select the prototype's Python stack by default. | Requires #18 logical boundary and authorized sanitized scale fixtures; feeds F01 and F08. |
| **I20-F04 — Recovery retention, privacy, and reconciliation policy** | Grilling + security/records decision + prototype | Decide interval, generation ordering/compare behavior, max count/age/bytes, cleanup after save/close, encryption need, permitted Source Snapshot/client data, shared-machine behavior, support/admin deletion, and crash reconciliation among target/candidate/backup/recovery. Test corruption, reparse points, disk pressure, profile migration, and multiple divergent generations. Acceptance: an explicit policy table and deterministic, user-chosen, no-overwrite flows with redacted diagnostics. | Requires firm security/records owner; uses F01 storage classifications and F03 format. |
| **I20-F05 — Lifecycle conflict/Close/Recovery UX grilling and accessible prototype** | Grilling + UI prototype | Settle edit-during-save behavior, Save As identity/overwrite, external-change actions beyond Save As, uncertain-save reconciliation, Close/Close All/Quit ordering, active save/export cancel-or-wait, recovery comparison, missing-template export warning/gate, and update-restart prompts. Exercise keyboard-only and NVDA/JAWS focus/state announcements. Acceptance: every state/action/cancel path is decision-complete and no document is implicitly discarded or overwritten. | Can begin now from the lifecycle model; decisions feed #18 and F04. |
| **I20-F06 — Actual Electron security/process/IPC/export prototype** | Security prototype | On the pinned Electron release, test sandbox/context isolation/node-integration settings, runtime-validated typed IPC, navigation/window/protocol/permission denial, multiple tabs/windows, renderer crash, utility-process crash/restart, hostile package/parser containment, long-running layout/PDF export cancellation, and redacted diagnostics. Acceptance: renderer cannot read arbitrary files/credentials or mutate lifecycle state directly; parser/export failure cannot lose dirty state or block other documents. | Requires #18 candidate topology and F03 parser candidate. No real RSLog credentials/client data. |
| **I20-F07 — RSLog authentication and Windows credential-broker decision** | Rocscience/API research + security policy + inert prototype | Establish the authorized RSLog authentication/token lifecycle, then compare no persistence, Electron `safeStorage`, and Windows Credential Manager for availability, corruption, rotation, sign-out/offboarding, shared profiles, uninstall/update, and same-user threat limits. Acceptance: long-lived credentials never reach a renderer, package, recovery, recent-file entry, log, crash report, or support bundle; firm security approves the chosen policy. | Blocked on Rocscience-authorized API facts and firm security owner; never use production credentials in prototype. |
| **I20-F08 — Signed Windows installer/update/rollback bake-off** | IT prerequisite + signed isolated-VM prototype | Compare the viable Squirrel, NSIS, and MSIX/App Installer/Intune paths at pinned versions. Exercise code signing/timestamping, publisher identity, authenticated feed/metadata, channel authority, proxy/offline install, staged rollout, downgrade policy, repair, uninstall, failed update, rollback, and old/new `Log Project` compatibility. Acceptance: exactly one authority per installation; tamper/publisher/channel failure is closed and visible; rollback changes app binaries only; older readers refuse incompatible files without rewrite. | Requires firm IT deployment policy, test signing identity/certificate path, isolated VMs, and F03 compatibility fixtures. |

### Closure recommendation

Do **not** mark the original broad #20 done from the 74/74 result. The completed work is sufficient to record the Adopt/Reject decisions above and to let #18 use the lifecycle vocabulary and bounded local-NTFS candidate. Full closure requires the follow-up tickets to resolve or explicitly exclude the storage, Electron, package, recovery-policy, credential, accessibility, and signed-deployment criteria. If the map instead narrows #20 to “logical lifecycle plus one-host local-NTFS/package hostile-input evidence,” record that scope change explicitly and link I20-F01 through I20-F08 as the remaining frontier.
