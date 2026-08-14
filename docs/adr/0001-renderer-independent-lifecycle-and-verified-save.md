---
status: accepted
---

# Keep document lifecycle outside renderers and verify saves before durability

RSrender will keep each open Log Project or Log Template in a renderer-independent lifecycle authority that owns identity, working and durable revisions, dirty state, save state, recovery relationships, and Close/Quit/update disposition. Save and Save As are explicit transactions: write a candidate, fully validate it, commit under exclusive document authority with an inside-authority baseline recheck, reopen and verify the committed target, and only then advance the durable revision or bind a new Authoritative File. This rejects renderer-owned dirty state, in-place truncation, last-writer-wins, a baseline check without serialized ownership, automatic recovery overwrite, and one generic “save failed” state; the observed two-process prototype lost an update without coordination, while a lock plus an inside-lock recheck produced one commit and one conflict.

## Consequences

- Pre-replacement failure, external conflict, and post-replacement uncertainty are different states with different safe actions.
- A Recovery Candidate opens as a separate untargeted dirty document with a new Document Identity and inert recovery-origin provenance; it leaves the original identity untouched and never silently satisfies Save, Close, or Quit.
- Application rollback changes application state only; it never rolls back or down-saves user files.
- Product language is “validated replacement on supported, tested storage,” not “atomic save,” until power-loss and every supported storage class have direct evidence.
- This ADR does not select an Electron process, package envelope/parser, cross-process ownership mechanism, storage support matrix, recovery-retention policy, credential vault, installer, or updater.

Evidence: [issue #20 prototype branch](https://github.com/blaynesatcentral/RSrender/tree/d584c8a/prototype-evidence/issue-20).
