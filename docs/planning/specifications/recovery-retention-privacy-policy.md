# Recovery retention, privacy, and reconciliation policy

**Status:** Accepted v0.9 product behavior and defaults; the product-choice frontier is empty. Firm security/privacy/records approvals and #36/#37/#39 observations remain release and organizational gates, not open product choices.  
**Evidence cut:** 2026-08-14.  
**Scope:** Internal v0.9 on a dedicated per-person Windows profile and an app-owned local-fixed-NTFS recovery root.  
**Governing terms:** `Recovery Candidate`, `Authoritative File`, `Document Identity`, `Source Snapshot`, `Supplemental Source`, `Embedded Template Representation`, and `Presentation Override` retain their meanings in `CONTEXT.md`.

## Accepted outcome

Adopt full-working-package Recovery Candidates because a partial presentation-only record cannot reliably restore a Log Project or Log Template. Create them only in a dedicated app-owned root under the current user's managed local profile, never beside an Authoritative File. Treat every candidate as client-data-bearing and non-authoritative. It may be compared, deliberately opened separately, deliberately discarded, or retained by policy; it can never overwrite, rebind, satisfy Save/Close, or become document history automatically.

Opening separately follows the accepted lifecycle contract exactly: create an untargeted dirty document with a new Document Identity, its own Document Owner, and inert recovery-origin provenance. The original document, identity, Authoritative File, and Undo history remain untouched. Save As or an independently eligible governed Replace Existing is required to create an Authoritative File.

The numeric values below are accepted v0.9 product defaults. They are implementation inputs, but release remains blocked until the named security and privacy/records authorities approve their organizational use and #36 validates the local-NTFS mechanics they depend on. An administrator may choose a **stricter** approved value; relaxing a content, age, byte, encryption, shared-profile, or deletion boundary requires renewed security/records approval and an explicit product-policy revision.

## Authority boundary

| Decision | Accepted v0.9 product policy | Required non-product approval | Technical evidence boundary |
|---|---|---|---|
| Checkpoint cadence and visible Recovery Review behavior | Accepted exactly as specified below. | Security confirms that the resulting write frequency and client-data duplication are permitted. | #37 must observe process/startup routing; no packaged behavior is claimed here. |
| Permitted package content | Full working package, bounded exactly below; credentials always excluded. | Firm security and privacy/records owners must approve every content class. | #33 selected the constrained package direction; package admission limits remain governed by that boundary. |
| Count, age, and byte limits | Accepted exactly as specified below. | Privacy/records owner approves retention/disposition; security approves cache exposure. | #36 must validate low-space, quota, cleanup, reparse, ACL, sharing, and deletion outcomes. |
| Local-profile and encryption baseline | Dedicated per-person Windows profile on a firm-managed BitLocker/device-encrypted local fixed NTFS volume. | Firm security/endpoint owner attests the endpoint/profile policy and incident route. | Application code must not claim it can prove organizational compliance merely from a filesystem check. |
| Shared-profile behavior | Reject creation and opening under a shared or unknown-account-use profile. | Firm security defines/attests `dedicated`, `shared`, or `unknown`; the application cannot infer human account sharing reliably. | #37 observes startup enforcement; #36 observes root containment only. |
| User discard | Named, confirmed per candidate; bulk confirmation enumerates all candidate rows. | Records owner approves whether any hold overrides user discard. | #36 must observe deletion success/failure and retained-row behavior. |
| Administrative deletion/uninstall | Explicit policy input; preserve is the product default. | Security/records owners approve authority, hold checks, evidence, and incident handling. | #39 proves installer/uninstaller mechanics; #36 proves root-scoped deletion behavior. |

No endpoint administrator, storage owner, product owner, or prototype result silently substitutes for the required security/privacy/records approval.

## Numeric defaults

All durations use UTC instants for retention and a monotonic clock for in-session cadence. A system-clock rollback never extends or shortens retention silently; it produces `RECOVERY_CLOCK_UNCERTAIN` and protects affected candidates pending classification.

| Policy value | Accepted v0.9 default | Exact rule |
|---|---:|---|
| Dirty debounce | 120 seconds | After the first mutation beyond the last captured recovery revision, wait for 120 seconds without another mutation, then request a Recovery Candidate. |
| Continuous-edit maximum | 300 seconds | While eligible mutations continue, request a candidate no later than 300 seconds after the first uncaptured mutation. |
| Minimum spacing | 120 seconds | Do not create more than one verified candidate for one Document Identity within 120 seconds. A failed attempt does not reset this timer. |
| Failed-write retry | 60 seconds; 3 attempts | Retry only while the document remains dirty and root/space/profile eligibility still passes. After three consecutive failures, suspend automatic attempts for that document until a later mutation or explicit Retry Recovery; keep one visible Diagnostic. |
| Per-document generations | 10 | Keep at most ten ordinary valid generations per original Document Identity, subject to protected-state overrides. |
| Per-profile candidate rows | 50 | Ordinary valid candidates above 50 enter ordered cleanup; protected candidates do not disappear to satisfy this cap. |
| Per-candidate package bytes | 512 MiB | Effective cap is the smaller of 512 MiB and the current admitted constrained-package hard ceiling. Refuse a larger recovery write before publication with `RECOVERY_CANDIDATE_TOO_LARGE`; keep the document dirty and explain that recovery is unavailable. This is not an Authoritative File size limit. |
| Per-document ordinary bytes | 2 GiB | Prune cleanup-eligible/superseded generations oldest-first; never prune a protected generation solely to meet this value. |
| Per-profile ordinary bytes | 5 GiB | Apply the same cleanup order across documents; never cross a Document Identity boundary without retaining its newest valid divergent generation. |
| Valid divergent age | 30 days | After successful startup classification, an unopened ordinary divergent generation older than 30 days becomes `expiredCleanupEligible`; deletion is audited and never performed before classification. |
| Same-as-durable grace | 24 hours | An exact digest-equivalent candidate remains visible/traceable for 24 hours, then becomes cleanup-eligible. |
| Rejected payload quarantine | 7 days | Corrupt/malformed/wrong-identity payload bytes are retained only in the protected root for bounded support/incident review, then become cleanup-eligible unless security places a hold. Never attempt partial opening. |
| Cleanup tombstone | 30 days | Retain only candidate ID, original identity hash, classification, reason code, UTC times, byte count, and deletion outcome. No paths, client values, template contents, or credentials. |
| Low-space warning | free space below max(10 GiB, 10% of volume) | Warn non-modally and run only cleanup-eligible pruning. |
| New-write suspension | free space below max(5 GiB, 5% of volume) | Do not start a new candidate write. Preserve dirty state and emit `RECOVERY_SUSPENDED_LOW_SPACE`. |
| Emergency floor | free space below max(2 GiB, 2% of volume) | Stop recovery parsing/writing except bounded classification metadata needed to explain existing rows. Never delete protected payloads automatically. |
| Pre-write reserve | candidate estimate + max(512 MiB, candidate estimate) | Require room for candidate publication plus one equal-size or 512 MiB safety reserve, whichever is larger, in addition to the suspension floor. #36 must validate this formula. |

`MiB` and `GiB` are binary units. Policy comparison is inclusive at the boundary: a value equal to a cap is admitted; one byte/count above is not. Cap cleanup is deterministic: same-as-durable, verified-saved/opened, expired rejected, expired ordinary divergent, then superseded ordinary generations; oldest verified creation instant first, candidate ID as final stable tie-breaker.

Before a new write, classify and prune already cleanup-eligible artifacts. If the projected candidate would exceed a count/byte cap and no eligible artifact can bring the profile under budget, refuse the write with `RECOVERY_PROTECTED_OVER_BUDGET`; do not write first and decide afterward.

## Package content and privacy contract

A Recovery Candidate is a complete constrained working package sufficient to reconstruct the exact captured working revision. It may contain:

- Log Project or Log Template domain state and captured working revision;
- the accepted Source Snapshot, including permitted client Source Data already stored by the document;
- validated Supplemental Sources and Source Resolution Decisions;
- Template Assignments and required Embedded Template Representations;
- Presentation Overrides, Freeform Annotations, layout elements, styles, publication settings, and Undo data admitted by the package specification;
- Example Dataset content for a Log Template;
- only already-admitted embedded fonts, hatches, pictures, and other assets with their integrity/rights inventory; and
- non-secret Source Context Identity, stable domain identities, base durable revision/digest, candidate revision/generation, format/minimum-reader version, integrity hashes, and inert recovery-origin metadata.

It must not contain:

- passwords, access/refresh tokens, cookies, browser/session state, MFA material, API keys, credential-vault exports, or encryption/recovery keys;
- raw authentication requests/responses, production diagnostics, crash dumps, telemetry, recent-file lists, or unrestricted filesystem paths;
- arbitrary referenced local-file content that was not already deliberately admitted and embedded in the working package;
- hidden raw RSLog wire captures beyond the accepted typed Source Snapshot/authorized Source Extensions;
- installer/update credentials, management endpoints, signing material, or user/machine identifiers unnecessary for document integrity; or
- thumbnails, dynamic-text previews, Source Data values, Presentation Override values, or full paths in default Recovery Review list metadata.

Credentials remain session/broker data and are excluded by construction, not redaction after serialization. The recovery writer receives an already credential-free immutable working revision. Admission validates the resulting package independently before publication.

Default Recovery Review rows show document kind, a privacy-minimal generated display label, candidate time, divergence/classification state, and validation status. A deliberate Details/Compare action may reveal document identifiers and content needed for the user's decision, locally and without telemetry. Support evidence contains reason codes, counts, byte bands, format/version, and hashes only after the applicable release approval.

## Storage, encryption, and profile policy

1. Recovery lives under one dedicated app-owned root on a local fixed NTFS volume beneath the current managed Windows profile, separate from Chromium cache, temp, logs, Authoritative Files, and export destinations.
2. Resolve and validate the root and every enumerated child without following a reparse point. Any root/ancestor reparse point, out-of-root resolution, alternate data stream syntax, device/reserved name, case/Unicode-normalized collision, or unsupported filesystem puts recovery in `rootRejected`; do not create, open, or recursively delete payloads.
3. v0.9 expects firm-managed BitLocker/device encryption and a dedicated per-person Windows account/profile. It does not add bespoke application-level package encryption. This avoids inventing key escrow, loss, rotation, offboarding, and uninstall behavior without security authority.
4. The application consumes a managed profile classification of `dedicated`, `shared`, or `unknown`. Only `dedicated` enables candidate creation/opening. `shared` and `unknown` reject with `RECOVERY_PROFILE_NOT_DEDICATED`; existing rows remain root-contained for an authorized administrator and are not shown across users.
5. Distinct Windows users with distinct protected profiles are permitted; a workstation is not rejected merely because several separate accounts use it. One Windows profile shared by multiple people is rejected.
6. Profile migration is not supported in v0.9. A copied/moved recovery root whose recorded profile binding does not match is `foreignProfile`; do not open, merge, re-encrypt, or delete it automatically. Offer sanitized IT guidance only.
7. If endpoint encryption/profile attestation is absent or revoked, disable new recovery writes and opening; retain visible status without exposing candidate content. Firm security decides administrative remediation or deletion.

Security must explicitly approve this “OS encryption, no additional application encryption” position. Until then, the safe operational default is recovery disabled, not silently unencrypted.

The code-facing policy inputs are therefore `profileMode = dedicated|shared|unknown` and `volumeEncryptionAttested = true|false|unknown`. Missing values normalize to `unknown`; no heuristic upgrades them to eligible.

## Protected and cleanup states

Provisional identifiers below are code/spec labels, not additions to the ubiquitous language.

| State | Protected from automatic cleanup? | Commands / transition |
|---|---|---|
| `writing` | Yes | Hidden from Recovery Review until verified publication; failed partial is classified before any deletion. |
| `validDivergentNewest` | Yes until 30-day classification expiry | Compare; Open Separately; Discard; Later. It is the newest valid divergent candidate for its original identity/base. |
| `validDivergentSuperseded` | No, after a newer valid generation exists | Same commands while retained; ordinary count/byte cleanup may remove it with a tombstone. |
| `sameAsDurableGrace` | Yes for 24 hours | Visible reason; deliberate Discard allowed. After grace, `sameAsDurableCleanupEligible`. |
| `openedUnsaved` | Yes | Remains protected until the separately opened document verifies Save As/eligible Replace Existing or the user deliberately discards the candidate. |
| `openedAndVerifiedSaved` | No | Becomes cleanup-eligible; saving the separate document never rewrites the original candidate in place. |
| `reconciliationRequired` | Yes | Preserve target/candidate/backup/recovery relationships until deterministic classification or verified rescue Save As. No age/count/byte pruning. |
| `futureVersion` | Yes for 30 days | Do not partially parse/rewrite. Invite compatible update or deliberate discard. |
| `rejectedQuarantine` | Yes for 7 days, unless a security hold changes it | No Open Separately. Details show safe rejection reason; security may authorize earlier/later disposition. |
| `deleteRequested` | Yes until deletion succeeds | Keep row and confirmation provenance. |
| `deleteFailed` | Yes | Keep row, focus Diagnostic, announce once, and offer Retry Delete or approved support guidance. |
| `recordsOrIncidentHold` | Yes | Only the named non-product authority may release the hold. User/bulk/space cleanup cannot bypass it. |
| `expiredCleanupEligible` | No | Delete only after startup classification and hold check; retain tombstone. |
| `deletedTombstone` | Payload absent | No open/compare. Tombstone expires after 30 days under approved records policy. |

Protected states may exceed ordinary count/byte/age budgets. Exceeding a budget triggers a visible `RECOVERY_PROTECTED_OVER_BUDGET` Diagnostic and suspends new candidates for the affected identity/profile; it never silently deletes the only recoverable or uncertain work.

## Deterministic startup classification

Startup does not block merely because candidates exist. The classifier runs in a bounded broker/parser path and publishes rows to the persistent non-modal Recovery Review.

1. **Preflight root:** verify configured root, local fixed NTFS class, profile binding, app ownership/ACL expectation, containment, and no reparse-point escape. On failure, classify the root; mutate nothing.
2. **Enumerate without following:** enumerate direct admitted artifact names only. Unknown files, directories, links, collisions, or out-of-root objects become rejection/administrative rows; do not delete or traverse them.
3. **Validate container:** apply package byte/entry/expanded/part/ratio/JSON/native-media bounds before allocating/decoding; verify manifest, role inventory, hashes, format, minimum reader, and required full-package content.
4. **Validate identity:** read original Document Identity, captured working revision, base durable revision/digest, candidate generation/ID, and package digest. Wrong/missing/duplicate identity is rejected, never heuristically grouped.
5. **Classify candidate:** classify each candidate independently as `sameAsDurable`, `validDivergent`, `futureVersion`, `rejected`, `opened`, `discardPending/deleteFailed`, or `uncertain`. Keep the reason code and evidence basis.
6. **Reconcile transaction artifacts:** classify Authoritative File, sibling save candidate, backup, and journal/intent by exact identity/revision/digest. If one verified outcome is not provable, protect all relevant artifacts as `reconciliationRequired`; never auto-commit, roll back, replace, or choose the newest timestamp.
7. **Order presentation:** uncertain/action-required groups first; group by stable original Document Identity and recorded base digest; newest verified creation instant first only within a group. Ordering never chooses a winner.
8. **Apply cleanup policy:** only after every affected artifact is classified, root/hold checks pass, and no row needed by an uncertain relationship would be removed. Record reason/tombstone before removing the Recovery Review row.
9. **Publish review state:** announce discovery once; retain badge/panel until every row is opened, deliberately discarded, or retained through Later/policy. A cleanup/delete failure remains visible.

### Required classification cases

| Observed artifacts | Classification / user consequence |
|---|---|
| Candidate digest exactly equals currently verified durable revision | `sameAsDurableGrace`; never auto-open. |
| Valid candidate differs from durable base | `validDivergent`; Compare/Open Separately/Discard/Later. |
| Missing or mismatched base/target | `validDivergent` with incomplete comparison, unless a save transaction outcome is ambiguous; then `reconciliationRequired`. |
| Corrupt/malformed/integrity failure | `rejectedQuarantine`; no partial opening. |
| Wrong Document Identity/base relationship | `rejectedQuarantine`; never attach by filename/content similarity. |
| Future or incompatible version | `futureVersion`; retain/protect, do not down-convert. |
| Reparse/out-of-root/profile mismatch | `rootRejected` or `foreignProfile`; do not traverse/open/delete. |
| Several valid divergent generations | Keep all until ordinary caps apply; protect newest per identity/base; never auto-select one. |
| Post-replacement target is new-valid | Reconcile as verified success only when intent identity/revision/digest all match; backup/candidates become cleanup-eligible under #36 mechanics. |
| Target old-valid and verified candidate remains | Pre-replacement failure; candidate may be offered as a Recovery Candidate only after full classification, never committed automatically. |
| Target/candidate/backup evidence cannot prove old-valid or new-valid | `reconciliationRequired`; preserve artifacts and block discard/Close/restart for an affected open document until resolved/rescued. |

The live issue's required audit labels map exactly: `same-as-durable` -> `sameAsDurableGrace/cleanupEligible`; `rejected` -> `rejectedQuarantine/rootRejected/foreignProfile`; `retained` -> a protected or ordinary valid candidate with its retention reason; `opened` -> `openedUnsaved/openedAndVerifiedSaved`; `discarded` -> verified payload absence plus `deletedTombstone`; and `uncertain` -> `reconciliationRequired` or `RECOVERY_CLOCK_UNCERTAIN`. None is inferred from a filename or timestamp alone.

## Checkpoint, Save, Close, and cleanup rules

- Capture only an immutable working revision. Editing continues against later revisions.
- Publish a candidate only after full write, flush behavior admitted by #36, independent reopen, package validation, and integrity verification. Failed publication never replaces the previous valid Recovery Candidate.
- A verified Save does not itself delete recovery. It makes exact-equivalent generations `sameAsDurableGrace`; divergent revision-ahead work remains protected.
- Orderly Close after verified Save applies the same classification. Confirmed `Discard Changes` marks Recovery Candidates whose captured revisions belong only to that discarded branch as `deleteRequested` during the staged disposition; it does not preserve them as hidden history. The confirmation states that ordinary Undo and recovery will not restore the branch.
- If deletion required by `Discard Changes` fails, the disposition is incomplete and Close/Quit stops with the visible `deleteFailed` row. The user may Retry Delete, Keep Open, or invoke the separately named `Retain Recovery Data and Continue` consequence after an explicit client-data warning. The last command is accepted product behavior: it cancels deletion and returns the row to retained status, but release exposure remains disabled until security/records approve its organizational use.
- A forced termination may leave a prior verified Recovery Candidate; no shutdown path claims a checkpoint succeeded without verified publication.
- Backups and sibling save candidates are save-transaction artifacts, not ordinary Recovery Candidate generations. Their cleanup waits for #36 outcome classification and never consumes the ordinary generation cap while uncertain.
- Recovery checkpoint creation, cleanup, and discard are lifecycle effects, not document Undo commands.

## Compare policy

Compare is deliberate, local, inspection-only, and never merges, changes the working basis, selects a winning generation, or establishes an Authoritative File.

- Compare a candidate first against its recorded durable base identity/revision/digest and, when independently verified, the current Authoritative File. Missing or mismatched bases produce `comparisonIncomplete`; they never trigger a two-way guess.
- The default summary reports changed domain areas and counts: document structure, Source Snapshot freshness/collection outcomes, Supplemental Sources, Source Resolution Decisions, Template Assignment/Embedded Template Representation digests, Presentation Overrides, Freeform Annotations, assets, and publication settings. It does not show values in the list row.
- Deliberate expansion may show the local field/value differences needed to decide Open Separately or Discard, subject to the same client-data access policy as opening the Log Project. It creates no telemetry, clipboard copy, export, or support bundle automatically.
- Multiple generations are compared independently. Newest-first display order is not authority; no “latest wins” command exists.
- Corrupt, wrong-identity, foreign-profile, or untrusted/incompatible content is not partially compared. Show only the safe rejection/incompatibility reason.

## Disk pressure and failed deletion

At warning pressure, delete only already cleanup-eligible artifacts in the fixed order. At suspension pressure, refuse new candidate publication before writing. At the emergency floor, do not start ordinary package parsing or deletion storms; surface one persistent Diagnostic and preserve protected rows.

Never use unrestricted recursive deletion. Every deletion reopens the app-owned root, rechecks profile/filesystem/containment/no-reparse conditions, addresses one exact classified artifact, verifies absence, then removes its row. If absence cannot be verified, transition to `deleteFailed`.

User Discard requires a named confirmation. A bulk discard lists every candidate and excludes held/ineligible rows. Delete failure:

1. leaves candidate bytes and row intact;
2. records a safe error category and attempt time without unrestricted path/client content;
3. focuses the row Diagnostic and announces failure once;
4. permits bounded Retry Delete only after the cause may have changed; and
5. never reports success, decrements budgets, or removes a row before verified absence.

The product makes no secure-erasure claim. Ordinary deletion on an encrypted managed volume removes the filesystem object; media sanitization, forensic resistance, and decommissioning remain firm endpoint policy.

## Uninstall and managed deletion

- Update, repair, rollback, and ordinary reinstall preserve the recovery root.
- Interactive uninstall defaults to **Preserve recovery data**. If unresolved/protected rows exist, deletion is unavailable unless an authorized records/security policy permits it and the user selects a separately named `Delete RSrender Recovery Data` action that enumerates counts/bytes and consequences.
- Managed uninstall requires an explicit `preserve` or `delete-after-classification` policy. Missing/unknown policy means preserve and return a non-success disposition to management; it never guesses delete.
- `delete-after-classification` requires: no active RSrender process/owner, exact app root and profile binding, no reparse escape, successful classification, hold check, and a retained sanitized outcome outside the deleted root. Failure leaves the root and reports partial/failed disposition.
- Uninstall never deletes Authoritative Files, exports, user templates, recent non-recovery content, or a copied/foreign-profile root.
- A later administrative deletion uses the same checks and authority. Repository/support records expose counts, byte bands, reason/status, and timestamps only—never candidate content, client identity, or full paths.

#39 must prove the installer/uninstaller can honor these semantics. This policy does not select an installer or claim managed deletion exists.

## Diagnostics and audit inventory

Every classification/action has a stable code, candidate ID, opaque original-identity hash, format/version, captured/base revision and digest where safe, UTC times, byte count, reason, action actor category (`user`, `managed-policy`, `system-cleanup`), and outcome. It excludes credentials, Source Data values, template/override content, thumbnails, machine/user identifiers, and unrestricted paths.

Minimum codes:

- `RECOVERY_AVAILABLE_DIVERGENT`
- `RECOVERY_SAME_AS_DURABLE`
- `RECOVERY_RECONCILIATION_REQUIRED`
- `RECOVERY_REJECTED_INTEGRITY`
- `RECOVERY_REJECTED_IDENTITY`
- `RECOVERY_FUTURE_VERSION`
- `RECOVERY_ROOT_REJECTED`
- `RECOVERY_FOREIGN_PROFILE`
- `RECOVERY_PROFILE_NOT_DEDICATED`
- `RECOVERY_SUSPENDED_LOW_SPACE`
- `RECOVERY_CANDIDATE_TOO_LARGE`
- `RECOVERY_PROTECTED_OVER_BUDGET`
- `RECOVERY_DELETE_FAILED`
- `RECOVERY_CLEANUP_COMPLETED`
- `RECOVERY_CLOCK_UNCERTAIN`

## #36 observed-mechanics boundary

As of this evidence cut, live #36 is open and reports **no qualifying #36 fault-matrix observation**. Therefore this policy does not claim that Electron/local NTFS has proved hard reset, true disk-full/quota, ACL/AV/EDR, long-path, held-handle, Save As race, reparse deletion, or uninstall cleanup behavior.

The earlier #20 inert one-host experiment observed only a narrower candidate pipeline on one local fixed NTFS volume: pre-replacement process exits left the Authoritative File old-valid; post-replace/pre-ack could leave new-valid target plus old-valid backup; invalid candidates did not replace; held/read-only targets failed non-silently; a directory junction was detected; and stable-ID/digest/version/integrity recovery selection could reject corrupt/wrong-document candidates and avoid automatic overwrite. Those observations support the state distinctions but do not establish organizational approval, power-loss durability, Electron behavior, or deletion guarantees.

ADR 0006 supplies the storage scope only: recovery uses a separate app-owned local-fixed-NTFS root under the managed profile. #36 must still provide the release evidence for publication, low-space, cleanup, deletion, and reconciliation mechanics. If #36 contradicts a mechanical assumption, revise the mechanism without weakening the no-overwrite, protected-state, visibility, or authority boundaries; if it invalidates a numeric reserve/threshold, return that value to owner approval rather than tuning it silently.

## Codeability audit

| Question an implementation agent must answer | Draft answer | Remaining external gate |
|---|---|---|
| When is a candidate requested? | 120-second idle debounce, 300-second continuous-edit maximum, 120-second minimum spacing, only while dirty/eligible. | Product/security acceptance; #37 timing observation. |
| What exact data is serialized? | Complete admitted working package; enumerated domain content; credential/broker/session/support data excluded before serialization. | Security/privacy/records content-class approval. |
| Where may it be stored? | App-owned contained local-fixed-NTFS root in an attested dedicated encrypted managed profile. | Security/endpoint attestation; #36/#37 enforcement. |
| Which limits apply? | 10/document, 50/profile, 512 MiB/candidate, 2 GiB/document, 5 GiB/profile, exact age/space rules above. | Security/records approval; #36 reserve/pressure proof. |
| Which candidate is selected automatically? | None. Ordering is presentation only. | No gate; accepted lifecycle invariant. |
| How does opening work? | Open Separately -> new identity/owner, untargeted dirty, inert provenance; original untouched. | #33/#36/#37 mechanics only; behavior settled. |
| What survives cleanup pressure? | Every protected state; newest valid divergent per identity/base; uncertain/opened/held/delete-failed states. | Records/security approval for holds and expiry. |
| What may be deleted automatically? | Only classified cleanup-eligible artifacts after root/hold recheck; reason/tombstone retained; no protected artifact. | #36 observed deletion, records approval. |
| What happens on delete failure? | Keep payload and row, Diagnostic, bounded retry; no false budget decrement/success. | #36 observed mechanics. |
| What happens on shared/unknown profile or absent encryption attestation? | New writes/opening disabled; existing root retained for authorized handling. | Firm security approval/attestation mechanism. |
| What does uninstall do? | Preserve by default; explicit classified delete policy only; update/repair preserve. | #39 installer proof and security/records approval. |
| How are target/candidate/backup ambiguities resolved? | Exact identity/revision/digest classification; otherwise protect as reconciliation required; no timestamp/newest heuristic. | #36 fault matrix; #37 startup routing. |

The accepted product behavior is mechanically codeable: every state has an entry condition, visibility, permitted commands, cleanup eligibility, and failure result. Release enablement remains deliberately gated: firm authority has not accepted organizational use of the content/retention/encryption/deletion values, #36 has not observed the storage mechanics, #37 has not observed startup/process behavior, and #39 has not proved uninstall.

## Approval and closure checklist

#38's product-behavior frontier is empty. The ticket remains organizationally/release-gated until all remaining unchecked items are true:

- [x] Product owner accepted every numeric/default and user-visible behavior in this specification.
- [ ] Firm security approves full-package content classes, credential exclusion boundary, dedicated-profile rule, BitLocker/device-encryption reliance, diagnostics, holds/incidents, and managed deletion.
- [ ] Firm privacy/records owner approves 30/24/7-day payload rules, caps, cleanup order, tombstones, user/admin authority, legal/records hold, and uninstall disposition.
- [ ] #36 observes supported-local low-space/quota, cleanup/delete failure, reparse/root containment, restart reconciliation, and any reserve/retry mechanics this policy relies on.
- [ ] #37 observes candidate publication, crash/restart discovery, process containment, and persistent Recovery Review without silent overwrite/delete.
- [ ] #39 proves preserve/delete uninstall and managed outcome handling if v0.9 exposes them.
- [ ] Startup fixtures cover corrupt, wrong identity/digest, future version, reparse/out-of-root, foreign profile, multiple divergent generations, same-as-durable, old-valid/new-valid, and ambiguous post-replacement states.
- [ ] Every state/action produces the privacy-minimal visible/auditable reason required by the live issue.
- [ ] Approval evidence remains non-public where required; repository/GitHub receives only sanitized decision outcomes and limitations.

This specification claims no firm security/privacy/records approval, environment, implementation, prototype result beyond the bounded cited #20 evidence, release readiness, or #38 closure.

## Evidence and authority sources

- [`CONTEXT.md`](../../../CONTEXT.md)
- [Lifecycle conflict state and command specification](lifecycle-conflict-state-command-specification.md)
- [ADR 0006 — local fixed NTFS authoritative storage](../../adr/0006-local-fixed-ntfs-authoritative-storage.md)
- [Technical validation readiness runbook](../technical-validation-readiness-runbook.md)
- [Prototype decisions for layout and lifecycle](prototype-decisions-layout-lifecycle.md)
- [Live GitHub #38](https://github.com/blaynesatcentral/RSrender/issues/38) and [live #36](https://github.com/blaynesatcentral/RSrender/issues/36), read 2026-08-14
