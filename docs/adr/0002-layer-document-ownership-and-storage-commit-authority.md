---
status: accepted
---

# Layer application routing, document ownership, and storage commit authority

RSrender will use one application lifecycle/file broker, one explicit Document Owner and monotonically increasing ownership generation per open Log Project or Log Template, and a storage-specific exclusive commit authority held only for the commit critical section. These layers solve different problems: routing keeps privileged lifecycle commands out of renderers; ownership makes multi-window handoff explicit; storage authority serializes cooperating writers. Every commit must reopen and recheck target identity and baseline while storage authority is held immediately before ADR 0001’s validated replacement sequence.

## Consequences

- Handoff is a scoped one-use capability over document identity, ownership generation, receiver, baseline, and nonce; it never authorizes overwrite by itself.
- A process ID, timestamp, TTL, marker, queue position, or baseline check made before acquiring authority is diagnostic metadata, never permission to commit or break another owner.
- Wait is bounded and cancellable; a delayed waiter rechecks after acquisition and preserves its candidate on cancellation or conflict.
- For local fixed NTFS, a sibling zero-share Windows handle is the current commit-authority candidate. SMB, cross-machine, sync, removable, and other storage semantics remain unsupported until #36 provides direct evidence.
- One application-global save lock is rejected because independent documents may save concurrently; authority is scoped per durable target/document identity.
- Opening a Recovery Candidate separately creates a new Document Identity and its own Document Owner with inert recovery-origin provenance; it is a new branch, not ownership handoff or a second writer for the origin identity.
- Exact Electron single-instance routing, authenticated command journal, crash-after-commit replay, lock naming/ACL/cleanup, and Save As publication remain follow-up work.

Evidence: [issue #31 prototype branch](https://github.com/blaynesatcentral/RSrender/tree/31dbc6f/prototype-evidence/issue-31).
