# Issue #20 review rubric

This is a review aid for the disposable prototype. It is not a product specification or implementation artifact.

## Evidence labels

- **Observed:** executed on the recorded Windows host and captured with inputs, outcome, and limitations.
- **Simulated:** exercised in the state-model prototype without claiming operating-system behavior.
- **Documented:** supported by a primary-source statement but not reproduced locally.
- **Open:** requires another environment, organizational policy, signing identity, source credential, or later prototype.

## Hard checks for this bounded run

| Concern | Minimum evidence this run | Hard failure |
|---|---|---|
| Authoritative save | Faults around candidate write, validation, and replacement leave the old or new file intact | Zero-byte/truncated target, silent success, or source mutation on failed migration |
| Recovery | Recovery is app-owned, identity-keyed, separately chosen, and never silently overwrites the source | Automatic overwrite or ambiguous recovery selection |
| External/concurrent change | Stale baseline is detected before replacement | Last-writer-wins without a visible conflict |
| Hostile package | Traversal, normalized-name collision, link/special entries, excessive expansion/count, malformed schema, digest, and version are rejected before use | Extraction escape, execution/network, partial open, or unbounded work |
| Migration/version | Open is side-effect free; unsupported future versions cannot edit/export/save-over | Original changed on open/failure or unknown required data silently discarded |
| Dirty lifecycle | Close/Quit names every affected artifact and preserves Cancel; failed save remains dirty | Silent discard, partial quit, or dirty state owned only by a renderer |
| Missing template | Embedded effective representation stays usable offline with a visible diagnostic | Silent template substitution or forced network refresh |
| Update/rollback | Application rollback does not touch user projects and incompatible readers refuse safely | User-file rollback or destructive down-save |

## Decision boundaries

This run may settle the logical lifecycle machine and local NTFS behavior. It must not claim to settle SMB, enterprise sync, exFAT/removable media, code signing, updater tamper resistance, Credential Manager policy, real RSLog authentication, screen-reader behavior, or commercial release promotion without direct evidence from those environments.

## Required handoff

The durable decision record must list each conclusion as Adopt, Reject, or Open; link the exact disposable artifact/result; state supported versus untested storage classes; and keep unresolved organization-policy choices as named tickets rather than framework defaults.
