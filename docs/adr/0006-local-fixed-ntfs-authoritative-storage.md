---
status: accepted
---

# Support authoritative working files only on local fixed NTFS in v0.9

RSrender v0.9 supports Log Project and Log Template Authoritative Files only on a local fixed NTFS volume that passes the application's storage preflight. SMB/network shares, cloud/sync-managed roots, removable media, exFAT/FAT, optical media, device paths, reparse-point escapes, and unknown filesystem classes are not supported authoritative working locations.

When a user opens a package from an unsupported location, RSrender may validate and inspect it read-only but must require **Save As to a supported local location** before mutation. Exported Log Documents may be copied to a user-selected destination under export-specific rules; that does not make the destination a supported editable project location.

## Consequences

- ADR 0001's validated replacement and ADR 0002's local zero-share commit-authority candidate apply only after exact local-fixed-NTFS preflight and inside-authority baseline recheck.
- Product wording is "validated replacement on supported local fixed NTFS," not "atomic save" or "safe on any drive." Hard-reset, low-space/quota, ACL, AV/EDR, sharing, long-path, and Save As race evidence remains a release gate in #36.
- The application rejects or opens read-only rather than attempting best-effort writes on unsupported storage. It provides actionable local-copy/Save As guidance and never silently stages a local file that later overwrites an unsupported remote original.
- Support for SMB, managed sync, removable media, or another filesystem requires a new direct-evidence certification and storage-specific commit/reconciliation policy. Those classes are deferred, not assumed compatible.
- Recovery storage uses a separate app-owned local-fixed-NTFS root under the user's managed profile and remains governed by #38 privacy/retention policy.

Evidence: [issue #20](https://github.com/blaynesatcentral/RSrender/issues/20), [issue #31](https://github.com/blaynesatcentral/RSrender/issues/31), and the open local-NTFS validation gate [#36](https://github.com/blaynesatcentral/RSrender/issues/36).
