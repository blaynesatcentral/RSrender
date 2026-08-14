---
status: accepted
---

# Use a constrained ZIP envelope behind an owned validation boundary

RSrender v0.9 will use a constrained ZIP document envelope implemented with the exactly locked `@zip.js/zip.js` 2.8.49 library and an RSrender-owned strict preflight and logical validator. The container adapter performs bounded physical reconnaissance and reads outside renderer/main privilege; the container-neutral validator admits only declared inert parts and produces one immutable logical candidate or one typed failure. Only the lifecycle/file broker may publish a validated package through ADR 0001's replacement transaction and ADR 0002's commit authority.

The package carries explicit authoritative roles for Log Project or Log Template state, Example Dataset, Source Snapshot, Supplemental Sources, Presentation Overrides, Embedded Template Representations, Template Assignments, admitted assets, and namespaced extensions. Derived parts are identified separately and excluded from the authoritative digest. Deterministic support inventory, checksums, version refusal, and copy migration are required.

## Consequences

- SQLite is rejected as the primary v0.9 document envelope; it remains a semantic/support oracle and contingency research option, not a runtime fallback.
- Plain JSON/directory remains a semantic and support oracle. OPC is deferred because v0.9 has no unresolved requirement for a second ZIP convention.
- Production code may not extract an archive to the filesystem before complete validation or pass undeclared, encrypted, unsupported-method, executable, active, or unvalidated native content to a decoder.
- Unknown authoritative namespaced content is preserved byte-for-byte through a supported copy migration or migration fails non-silently.
- Older readers refuse unsupported versions before Save; migrations never alter or overwrite their source.
- Exact schema, optional-part policy, and migration sequence are owned by #22/#24. Production numeric limits, streaming/backpressure, cancellation, memory headroom, and autosave/PDF contention are owned by #42. Native decoder/process hardening is owned by #37.
- Exact lock provenance, SPDX SBOM, required third-party notices, release-time vulnerability scanning, and commercialization review remain release gates; the prototype selection is not a production parser or final legal approval.

Evidence: [issue #33](https://github.com/blaynesatcentral/RSrender/issues/33) and its retained disposable prototype artifacts.
