# Ticket #20 empirical Windows/package/recovery findings

**Prototype only — not RSrender application code.**
**Authoritative run:** `runs/20260814T015439.375829Z/`
**Harness:** `run_empirical.py` (`SHA-256 c4d7aec4fbb470870e3e0e472d19797dbdb3e9ededcaa5b8979be837cc7bc307`)
**Run command from repository root:** `python .wayfinder-tmp\prototypes\issue-20\empirical\run_empirical.py`

## Question and result

The prototype asked what this Windows workstation can prove about candidate save/recovery/package/lifecycle boundaries without implementing RSrender, contacting RSLog, using client data or credentials, adding production dependencies, signing, or publishing.

The authoritative run produced **74/74 expected outcomes**:

- 52 direct observations of local files, child-process termination, Windows APIs, ZIP parsing, NTFS naming/reparse behavior, hashing, or Authenticode;
- 18 `prototype-logic` outcomes from explicit recovery, dirty-close, and update decision functions; and
- four `not-observed` deferrals that the harness reports as scope limits rather than simulated facts.

Raw evidence is in [`raw/summary.json`](runs/20260814T015439.375829Z/raw/summary.json) and the five adjacent `*_results.json` files. Fixtures and scratch outcomes remain beneath the same run directory. The earlier timestamped run directories are harness-debug evidence: the first stopped during environment capture, and the second exposed a late-bound ZIP test closure that was corrected before the authoritative run. They are not decision evidence.

## Environment

- Windows API version `10.0.26200.0`, AMD64; the OS caption probe was denied by local CIM policy.
- Workspace drive `C:` was observed as fixed **NTFS**.
- Python 3.10.11 was the standard-library harness runtime.
- Locally installed Node is 22.20.0, not Electron 43's embedded Node 24.18.1; no Node durability claim is made.
- `signtool.exe` and `makeappx.exe` were not found by the local command probe.
- No network was used and no dependency was installed.

See [`environment.json`](runs/20260814T015439.375829Z/raw/environment.json) for the exact capture.

## Observed save and replacement behavior

The harness used inert canonical JSON, sibling candidates, `fsync`, full reopen/validation, and the Windows `ReplaceFileW` API with write-through and an optional backup.

| Observation | Result | Architecture implication |
|---|---|---|
| Process exited before candidate creation, during a partial write, after a full non-`fsync` write, after `fsync`, and after validation | The authoritative target remained byte-identical and old-valid. Partial candidate was invalid; later candidates were full and valid. | Never expose candidates as successful saves. Startup/cleanup must classify candidate validity and phase rather than delete blindly. |
| Process exited immediately after replacement but before application acknowledgment | Target was new-valid, candidate was gone, and backup was old-valid. | Save acknowledgment and durable state can diverge. On restart, reconcile target revision/digest and backup; do not infer failure merely from a still-dirty in-memory state. |
| Candidate validation failed | Truncated candidate remained available for evidence; original stayed old-valid and was not replaced. | Full reopen/schema/hash/semantic validation is a hard pre-replace gate. |
| Target held through a real zero-share Windows handle | `ReplaceFileW` failed with Windows error 32; target stayed old-valid and valid candidate remained. | Sharing/antivirus-like failures need bounded retry/cancel and an explicit unsaved state; never truncate or discard the only valid candidate silently. This was a sharing probe, not an antivirus product test. |
| Target had the Windows read-only attribute | `ReplaceFileW` failed with Windows error 5; target stayed old-valid. | Save failure must be non-silent and preserve dirty state/candidate; Save As is a valid recovery path. |
| Target changed after baseline capture | Digest recheck detected the change and did not replace it. | File identity/revision/digest must be checked immediately before commit. |
| Two child processes both checked the same baseline before either replaced | Both later replaced successfully; writer B silently won. | **A baseline check alone has a real TOCTOU lost-update race across processes.** Use one application/document owner or a cross-process lock/lease, then recheck the baseline while holding it. |
| Same writers used a real zero-share lock file and rechecked inside the lock | One replaced; the other acquired later and returned conflict. | An exclusive coordination primitive plus inside-lock recheck is a viable prototype control. Stale-lock/crash/network semantics still need design. |

Full evidence: [`save_results.json`](runs/20260814T015439.375829Z/raw/save_results.json).

This run does **not** prove power-loss durability or atomicity inside the kernel replace operation. It also does not cover SMB, a real sync client, exFAT/removable media, quota/true disk-full behavior, or cross-machine writers. Product language should remain “validated replacement on supported tested storage,” not “atomic save,” until those VM/device tests pass.

## Hostile ZIP and Windows path behavior

One valid constrained ZIP was accepted. Twenty-nine hostile fixtures were rejected with their expected stable prototype code, without extraction or an escape file:

- absolute, UNC, drive-relative/ADS, backslash, dot-component, encoded traversal, reserved device, trailing-dot, and trailing-space names;
- exact duplicates plus case-folded and Unicode-NFC collisions;
- symlink metadata, too many entries, oversized entry, high compression ratio, and nested archive;
- invalid UTF-8, duplicate JSON keys, future format/minimum-reader versions, unknown closed-core field, and kind mismatch;
- missing part, digest mismatch, executable/script part, and local/central ZIP-header disagreement.

The numeric limits are deliberately tiny test values and are **not production limits**. Python `zipfile` is a disposable harness dependency from the standard library, not a production parser decision.

Actual NTFS/Win32 observations reinforced the logical namespace rules:

- `CaseAlias.txt` and `casealias.txt` addressed the same file in the default directory.
- A requested trailing-dot name materialized as the same object without the dot.
- A real directory junction from the test root to a synthetic outside directory carried the reparse-point attribute; resolve-then-containment rejected its child.
- Creating a file symlink was denied with Windows error 1314 under the current token. ZIP symlink metadata was still directly tested, but a real file-symlink recovery candidate remains unobserved.

Full evidence: [`zip_results.json`](runs/20260814T015439.375829Z/raw/zip_results.json) and [`path_results.json`](runs/20260814T015439.375829Z/raw/path_results.json).

Implication: package members should normally never become filesystem paths. If a decoder requires a temporary file, use an app-generated name beneath a fresh app-owned root, reject reparse points, resolve the final path, and verify containment immediately before access.

## Recovery isolation and selection

Actual app-owned recovery files plus a small explicit selection function demonstrated that the reader can:

- isolate candidates by stable document ID;
- reject corrupt and different-document candidates;
- suppress a candidate semantically identical to the durable payload;
- order valid divergent generations and select one deterministically; and
- open the selection as a new untargeted dirty document while leaving the durable original byte-identical.

The validated boundary is ID/digest/version/integrity isolation and **no automatic overwrite**. The exact product policy for whether an older divergent generation remains offered, which timestamp/generation is authoritative, retention limits, and client-data encryption is not settled by this harness. Those remain product/security policy decisions.

Full evidence: [`recovery_results.json`](runs/20260814T015439.375829Z/raw/recovery_results.json).

## Dirty-close and local update constraints

The pure multi-document gate explicitly exercised clean, multiple-dirty, partial disposition, save/discard, cancel, active save, active export, and failed-save cases. It allowed close/restart only when every dirty artifact had a disposition and no save/export remained active. A renderer-crash event did not clear domain-owned dirty state.

This supports one shared lifecycle coordinator for Close, Close All, app quit, and update restart. It is prototype logic, not an Electron window/process observation.

The local update harness also established limited boundaries:

- configuration accepted exactly one authority: application-managed, IT-managed, or manual;
- a matching synthetic artifact hash/size was accepted and a tampered artifact was rejected;
- downgrade was denied by default and required an explicit flag;
- channel mismatch was rejected; and
- Windows Authenticode reported an inert local script as `NotSigned`.

A hash proves byte consistency, not publisher identity. No installer/updater production choice follows. Squirrel, NSIS, MSIX/App Installer, Intune, signing/timestamping, feed publishing, proxy/offline behavior, repair, uninstall, and rollback still require isolated signed-VM experiments and firm IT participation.

Full evidence: [`lifecycle_update_results.json`](runs/20260814T015439.375829Z/raw/lifecycle_update_results.json).

## Architecture decisions this evidence can support

1. Keep sibling candidate → flush → full validation → Windows replacement → post-reopen verification as the local-NTFS candidate pipeline, while retaining honest failure/uncertain states.
2. Treat the post-replace/pre-ack state as recoverable reconciliation, not an automatic rollback.
3. Require single-instance document ownership or cross-process locking plus an inside-lock baseline recheck. The digest check by itself is insufficient.
4. Keep recovery app-owned, stable-ID/digest keyed, strictly validated, and opened separately; never let it overwrite the authoritative file automatically.
5. Carry a no-extraction constrained-ZIP option forward with pre-allocation/stream bounds and strict Windows-portable names; do not yet choose a ZIP library or physical package format.
6. Centralize dirty/save/export disposition for close and update restart.
7. Require one update authority and signed-artifact verification in addition to hashes; this run cannot choose the installer/updater.

## Required follow-on evidence

- abrupt VM power/reset at every write/replace boundary;
- actual Electron-embedded Node 24 and final package-tool behavior;
- SMB, firm sync product, removable/exFAT, low-space/quota, long-path, antivirus, and cross-machine cases;
- stale-lock ownership and crash recovery or a proven single-instance model;
- parser child-process timeout/resource containment and native decoder failures;
- production-scale package limits using authorized sanitized datasets;
- recovery retention/encryption policy;
- signed Squirrel/NSIS/MSIX/Intune bake-off in isolated Windows VMs; and
- installer update/rollback compatibility across old/new `Log Project` versions.
