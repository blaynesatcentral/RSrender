# Issue #31 document ownership and commit-authority findings

**Disposable prototype — not RSrender application code.**
**Authoritative run:** `runs/20260814T030712.592046Z/`
**Harness:** `run_empirical.py` (SHA-256 `261B82E4F1EE354CE6BF8575859FBDF1B89D997CD2F1F333417B3CA63B0C0412`)
**Logic walkthrough:** [`ownership-state-model.html`](ownership-state-model.html)
**Run command from repository root:** `python .wayfinder-tmp\prototypes\issue-31\run_empirical.py`

## Question and result

The prototype compared three concerns that are easy to blur together:

1. **Single-application routing:** one lifecycle/file broker receives document commands.
2. **Per-document ownership:** one stable owner session and generation routes a particular document and makes handoff explicit.
3. **Storage commit authority:** a storage-specific exclusive critical section serializes cooperating commits.

The question was whether any one approach is sufficient, and which combination prevents silent local lost updates through two writers, owner loss, restart, handoff, external edits, delayed acquisition, cancellation, and stale metadata.

The authoritative run produced **19/19 declared outcomes**:

- 13 **Observed** local Windows/process/filesystem outcomes;
- five **Simulated** state-model/comparison outcomes; and
- one **Open** deferral for SMB/cross-machine behavior.

The result is a layered ADR candidate: use one application lifecycle/file broker, explicit per-document owner sessions for routing/handoff, and a storage-specific commit authority for the short commit critical section. **Every writer rechecks file identity/baseline while that authority is held.** No routing flag, owner record, PID, timestamp, stale-marker timeout, or prior check can substitute for that inside-authority recheck.

This refines, rather than supersedes, ticket #20. Ticket #20 directly observed a lost update when two processes both checked the same baseline before either replaced; both replacements succeeded and the second silently won. See [#20 findings](../issue-20/empirical/findings.md#observed-save-and-replacement-behavior) and its [authoritative save results](../issue-20/empirical/runs/20260814T015439.375829Z/raw/save_results.json). Issue #31 preserved that negative control and tested the proposed ownership layers.

Raw evidence: [`summary.json`](runs/20260814T030712.592046Z/raw/summary.json), [`single_application.json`](runs/20260814T030712.592046Z/raw/single_application.json), [`per_document.json`](runs/20260814T030712.592046Z/raw/per_document.json), [`windows_lock.json`](runs/20260814T030712.592046Z/raw/windows_lock.json), and [`comparison.json`](runs/20260814T030712.592046Z/raw/comparison.json).

The earlier `20260814T030348.114535Z` directory is a harness-development run made before one diagnostic-marker result field was clarified. It passed the same behavioral cases but is not the authoritative decision run.

## Evidence labels

- **Observed:** the harness executed child processes and inert files on the recorded Windows host; the raw input, result, and limitation are captured.
- **Simulated:** the pure state/comparison logic exercised a decision but makes no OS or Electron guarantee.
- **Open:** another storage environment, Electron build, or policy owner is required.

Passing means a finite experiment matched its declared outcome. It is not coverage, a formal proof, or a production guarantee.

## Comparison

| Approach | What the run established | What it cannot establish alone | Disposition |
|---|---|---|---|
| Single-application routing | One broker serialized two same-baseline requests: writer A committed; writer B was rechecked and became `EXTERNAL_BASELINE_CONFLICT`. A concurrently started second broker was denied while the first held the prototype instance authority. A broker killed before processing released authority; a restarted broker rechecked and processed the persistent request. **Observed.** | It cannot stop an external editor or a second/bypassing process unless single-instance authority is real. The crash case was before commit; it does not prove exactly-once replay across crash-after-commit/before-ack. The prototype request JSON is not a production journal. | **Adopt as primary command/lifecycle route, insufficient alone.** |
| Per-document ownership | Two different document paths committed concurrently. A handoff token scoped to document, receiver, and baseline allowed B to take ownership and commit only after it acquired commit authority and rechecked. A wrong-receiver token became `HANDOFF_TOKEN_CONFLICT` without target mutation. **Observed.** | A process-local registry, marker, PID, or token file is advisory across processes and crashes. It cannot itself serialize storage. The inert JSON handoff file demonstrated data shape; it is not the proposed secure transport. | **Adopt stable owner session/generation and explicit handoff, insufficient alone.** |
| Windows zero-share handle on a sibling authority file | Two local writers serialized; one committed and the delayed writer became a conflict after its inside-authority recheck. Terminating a holder released the OS handle; a successor acquired immediately, saw the stale diagnostic marker, rechecked, and committed. A marker naming the still-live harness PID did not block acquisition. Waiting could be canceled without changing the target or deleting the candidate. Normal release cleaned matching marker state; restart rebuilt baseline from the durable file. **Observed on this host.** | It does not coordinate domain commands, make a stale baseline current, prove power-loss behavior, or establish SMB/cross-machine semantics. Marker cleanup and lock-path lifetime need production race review. | **Carry as the local-fixed-NTFS commit-authority candidate, not a universal lease.** |
| Hybrid | The logic walkthrough keeps routing owner, document owner, and commit authority orthogonal. Each observed failure maps cleanly to one layer. **Simulated synthesis over observed parts.** | The exact Electron host, IPC, persistent command journal, storage adapter, and nonlocal support matrix remain unresolved. | **ADR recommendation.** |

## Observed scenarios

### Two writers and delayed acquisition

- One broker routed two same-baseline requests. It committed the first only after rechecking and classified the second as `external-baseline-conflict` after the target digest changed.
- Two independent processes contending for one zero-share authority handle produced exactly one commit and one conflict.
- In the explicit delay case, the waiter spent more than 250 ms waiting, then acquired the handle after the owner committed. It did **not** inherit the old owner's authorization: its inside-authority digest differed and it returned conflict.

This is the key invariant: **acquisition serializes a decision point; it does not validate the candidate.** Baseline verification happens after acquisition every time.

### Owner crash, stale marker, and PID ambiguity

- A child process acquired the zero-share handle, wrote a diagnostic marker, and was then terminated before commit.
- The authoritative target remained at the old revision. Windows released the process handle. A successor acquired with no timeout, observed the prior marker/nonce, rechecked the original baseline, and committed.
- A separate fixture pre-created a marker containing the current live harness PID and an old nonce. With no OS handle held, the new owner acquired and committed normally.

The last case is a real stale-marker/live-PID observation but **not a real PID-reuse event**. Actual PID reuse was not forced. The ambiguity is a simulated design conclusion: PID alone cannot distinguish a prior process start from the current owner and is never authority. Do not “break” an owner because a PID appears dead, a timestamp expires, or a marker looks old. Successful acquisition of the selected OS/storage primitive is the authority test.

### Restart and persistent work

- A single broker was killed after it obtained instance authority but before it processed a pending request.
- A restarted broker acquired authority, read the durable target, rechecked the request's baseline, and committed.
- In a separate sequential restart case, owner 1 committed revision 2 and cleaned its matching marker; owner 2 reconstructed the new target digest and committed revision 3.

This supports reconstruction from durable state, not inherited process memory. It does not settle command idempotency if a broker crashes after replacement but before recording/acknowledging completion; ticket #20's `uncertain/reconciliation required` state remains mandatory.

### Ownership handoff

- Owner A produced a token scoped to stable document ID, receiver B, baseline digest, and a transfer nonce, then released authority.
- B acquired authority, validated the token and baseline inside that critical section, and committed.
- C presented a token scoped to a different receiver. The target stayed unchanged and C received a stable handoff conflict.

The production token should be an authenticated/in-process broker capability or equally controlled message, not a user-writable sidecar file. The JSON file here exists only to make the transition inspectable.

### External edit, cancellation, and cleanup

- An external write after baseline capture was detected only after the local owner acquired authority and rehashed the target. The external file and local candidate were both preserved.
- A waiter canceled while another owner held authority. It returned `cancelled`, did not mutate the target, and retained its candidate. The holder later committed normally.
- Matching diagnostic markers were removed before normal handle release. Crash-stale markers were overwritten only after a successor obtained OS authority. Lock-path cleanup either removed an unowned path or left a path that had already been re-owned.

Production cleanup still needs a race-focused review. Marker deletion must compare owner nonce/generation, and no process may delete or rewrite a successor's metadata. A marker is support evidence only.

## Stable state and conflict vocabulary

### Document ownership states

| State | Meaning |
|---|---|
| `UNOWNED` | No broker session currently routes domain commands for this open document. |
| `OWNED(ownerSessionId, generation)` | Exactly one broker-issued session routes document commands. PID/window/tab is not the identity. |
| `HANDOFF_PENDING(from, to, transferNonce, baseline)` | Current owner remains responsible until the scoped receiver accepts; commit authority must be free before transfer. |
| `OWNER_LOST` | The owner/broker ended unexpectedly. In-memory commands stop; durable target/candidate/recovery reconciliation decides what survives. |

### Commit-authority states

| State | Meaning |
|---|---|
| `FREE` | No cooperating local writer holds the storage-specific authority. A stale marker may still exist. |
| `WAITING` | A cancellable request is waiting. It has no reservation over its captured baseline. |
| `HELD_UNCHECKED` | The requester acquired authority but has not yet re-read file identity/digest. Commit is illegal. |
| `HELD_VERIFIED` | Target identity/digest matched the immutable candidate's captured baseline while authority was held. |
| `COMMITTING` | The ticket #20 validated replacement pipeline is active. |
| `CONFLICT` | Authority was acquired but owner/handoff/baseline validation failed; target and candidate are preserved. |
| `CANCELLED` | Waiting stopped without target mutation or candidate deletion. |
| `UNCERTAIN_RECONCILIATION_REQUIRED` | Replacement may have occurred but verification/acknowledgment did not complete; no blind retry or lock release inference settles the target. |

### Stable user/support codes

| Code | Trigger | Required invariant/action |
|---|---|---|
| `APPLICATION_INSTANCE_BUSY` | Another live application broker holds instance authority. | Route activation/open request to it or fail visibly; do not start a second file broker. |
| `DOCUMENT_OWNER_MISMATCH` | A tab/window/session sends a mutating command without current owner capability. | Reject without state mutation; offer focus/request-handoff if appropriate. |
| `HANDOFF_TOKEN_CONFLICT` | Token has wrong document, receiver, generation/nonce, or baseline. | Reject; current durable target and owner remain unchanged. |
| `COMMIT_AUTHORITY_BUSY` | Authority was not obtained before bounded wait expired. | Keep dirty/candidate state; retry or cancel explicitly. |
| `COMMIT_AUTHORITY_CANCELLED` | User/lifecycle cancellation occurred while waiting. | No target mutation; retain candidate/dirty state. |
| `EXTERNAL_BASELINE_CONFLICT` | Target identity/digest differs during the inside-authority recheck. | Do not replace; preserve external target and local candidate; route to compare/reload/Save As decisions. |
| `OWNER_LOST` | Broker/owner process disappeared. | Reconstruct from durable target, candidate, backup, recovery, and journal; never infer success/failure from stale PID/marker. |
| `TARGET_OUTCOME_UNCERTAIN` | Commit began but final target verification/acknowledgment is missing. | Block blind retry; classify target/candidate/backup using ticket #20 rules. |
| `STORAGE_AUTHORITY_UNSUPPORTED` | Destination has no tested authority semantics (currently including SMB/cross-machine). | Fail visibly or use an explicitly specified publish workflow; never silently reuse local-NTFS claims. |

`STALE_OWNER_MARKER_PRESENT` is a diagnostic, not a conflict or authority state. It may explain a prior crash but cannot block or authorize a commit.

## Environment and limits

The [environment capture](runs/20260814T030712.592046Z/raw/environment.json) recorded:

- Windows API version `10.0.26200`, AMD64 (`Windows-10-10.0.26200-SP0` as reported by Python);
- Python 3.10.11 standard library;
- workspace volume `C:\`, volume name `OS`, observed filesystem **NTFS**;
- inert synthetic JSON documents only;
- no network use and no installed dependency.

The harness used direct Windows `CreateFileW` zero-share handles and `ReplaceFileW` for bounded local observations. It was not Electron and did not exercise Electron's `requestSingleInstanceLock`, Node 24, utility processes, preload/IPC, application shutdown, or packaged deployment.

Not proved or tested:

- SMB, mapped/network shares, cross-machine writers, the firm's sync product, cloud placeholders, DFS/offline files, or network lease/failover semantics;
- exFAT/FAT/ReFS/removable devices, EFS, ACL changes, long paths, quota/disk full, AV/EDR/backup agents, sleep/hibernate, reboot, kernel/power failure, or directory-entry durability;
- an actual PID-reuse event, PID start-time verification, Windows service/session boundaries, shared accounts, multiple user sessions, or hostile local same-user processes;
- exact-once/idempotent command replay after crash between file replacement, journal update, and renderer acknowledgment;
- production lock-file naming/location/ACL, stale diagnostic retention, cleanup races under high contention, nonce generation, or support redaction;
- application/window ownership transfer in a real Electron multi-window process tree;
- Save As target creation/overwrite races or nonexisting-target publication;
- accessibility/usability of conflict, wait, cancel, handoff, crash-recovery, and second-instance UI.

SMB and cross-machine behavior is deliberately **Open**. No claim from this run may be generalized to those environments.

## ADR recommendation

### Status

**Proposed for architecture synthesis; not production-selected.** Accept the logical layering and local-fixed-NTFS behavioral contract. Gate exact Electron APIs, persistent journal, filesystem adapter, and nonlocal storage support on their named prototypes.

### Context

Ticket #20 proved that a baseline digest checked before authority can race. Issue #31 shows that routing, document ownership, and filesystem authority have different scopes:

- routing keeps lifecycle and dirty state out of renderers;
- ownership makes tab/window handoff and command responsibility explicit;
- storage authority serializes the commit decision among cooperating writers;
- the inside-authority recheck protects against a baseline that changed before acquisition.

No single layer covers the other three.

### Decision

Carry forward this candidate architecture:

1. **One application lifecycle/file broker is the only process allowed to issue authoritative save commands.** Renderer tabs/windows send runtime-validated domain commands and never receive general filesystem authority.
2. **Each open document has one broker-issued `ownerSessionId` and monotonically increasing ownership generation.** Owner identity is independent of PID, renderer, window, tab, filename, and diagnostic marker.
3. **Handoff is explicit and scoped** to document ID, current generation, from/to owner sessions, captured baseline, and a one-use transfer nonce. It occurs only with no active commit. Acceptance does not authorize overwrite.
4. **Every commit obtains the destination adapter's authority, then reopens and checks file identity plus baseline digest/revision while authority is held.** Mismatch is `EXTERNAL_BASELINE_CONFLICT`; no replacement occurs.
5. **For the currently evidenced local fixed-NTFS adapter, carry a sibling zero-share Windows authority file/handle into the actual Electron/Node prototype.** Treat its marker as diagnostic only. Do not use PID/age/TTL stale breaking.
6. **Once verified, commit runs ticket #20's candidate → flush → full validation → replacement/backup → target reopen/verification sequence without releasing authority.** Post-replacement uncertainty routes to reconciliation, never blind retry.
7. **Wait is bounded and cancellable.** Cancellation preserves dirty/candidate state. A waiter rechecks after it eventually acquires; elapsed time or queue order never reserves a baseline.
8. **Crash/restart reconstructs from durable artifacts and an idempotent authenticated command journal.** It does not trust renderer memory or a stale marker. The journal design and crash-after-commit boundary remain a prerequisite prototype.
9. **Storage support is adapter- and environment-specific.** SMB/cross-machine is unsupported/open until tested with an authorized environment; local observations do not define remote lease behavior.

### Rejected alternatives

- **Single-application routing alone:** reject as the commit boundary. It cannot stop a second/bypassing process or external writer and needs a real instance authority.
- **Per-document memory/marker/PID ownership alone:** reject as cross-process authority. PID reuse/start ambiguity and crash-stale metadata make it advisory.
- **Windows lock alone:** reject as the document model. It does not route domain commands, preserve dirty state, decide handoff, or validate the baseline.
- **Check-before-wait/check-before-lock:** reject. Ticket #20 demonstrated the lost update; issue #31's delayed waiter confirmed that authority acquisition does not preserve the old check.
- **TTL/PID stale-lock breaking:** reject. The OS handle, not marker age/liveness guess, decides local availability.
- **One application-global save lock:** reject for ordinary multi-document work. Two distinct document paths committed concurrently without interference; authority should be per target/document identity.

### Consequences

Positive:

- one auditable path owns dirty/save/close/recovery state;
- independent documents can save concurrently;
- tab/window handoff is explicit rather than an implementation accident;
- local owner crashes release kernel-held authority without trusting stale metadata;
- conflicts, cancellation, and uncertainty are visible states rather than generic errors.

Costs and follow-ups:

- #18 must define broker, owner-session, journal, storage-adapter, and reconciliation boundaries;
- an Electron prototype must test real single-instance routing, multi-window handoff, crash/restart, IPC validation, and actual Node filesystem behavior;
- a local-NTFS race prototype must review lock/marker cleanup, ACLs, high contention, Save As, and crash-after-commit idempotency;
- SMB/cross-machine/storage support remains a separate IT-authorized ticket;
- lifecycle UX grilling must settle wait/cancel/conflict/handoff/recovery messaging and accessibility.

## Bottom line

Adopt the hybrid ownership model as the architecture candidate, with one non-negotiable rule: **the target baseline is rechecked inside storage commit authority immediately before the validated replacement pipeline.** Treat process routing, document ownership, and markers as coordination metadata—not permission to overwrite. Do not claim SMB/cross-machine support from this local NTFS run.
