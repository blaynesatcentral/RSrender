# RSrender planning workspace

This directory contains the durable evidence and synthesis produced by the completed Wayfinder map in GitHub issue #1. Production implementation is now active in the repository; these documents remain the controlling planning authorities.

The cross-ticket [human participation plan](human-participation-plan.md) treats representative users, custodians, IT/security/records owners, accessibility observers, QA/publication authorities, and final product decisions as scheduled evidence and approval work rather than informal blockers.

The [technical validation environment readiness runbook](technical-validation-readiness-runbook.md) separates dependency-safe owner/inventory preparation for #30, #32, #36, #38, #39, and #40 from the blocked experiments and decisions themselves.

The [BLD-001 authority and dependency-admission approval packet](../governance/bld-001-authority-approval-packet.md) records the two-stage human decision and internal-use boundary for the implementation foundation. The resulting per-identity admission and verification evidence are linked below.

## Authorities

- [`../../CONTEXT.md`](../../CONTEXT.md) is the single-context ubiquitous-language glossary. It defines domain terms but does not specify implementation.
- [`../adr/`](../adr/) contains accepted, hard-to-reverse architectural decisions.
- [`research/`](research/) contains evidence reports. A research finding is not automatically a product decision.
- [`research/bld-001-dependency-admission-candidates.md`](research/bld-001-dependency-admission-candidates.md) is the pre-admission exact-version candidate dossier for implementation seed #45/BLD-001.
- [`../governance/bld-001-internal-dependency-admission.json`](../governance/bld-001-internal-dependency-admission.json) is the machine-readable internal-development admission for all 156 exact dependency identities. It does not authorize public/external/commercial use.
- [`evidence/bld-001-foundation-verification.md`](evidence/bld-001-foundation-verification.md) records the two clean BLD-001 verification runs, deterministic hashes, package-boundary result, and explicit nonclaims.
- [`research/internal-workflow-representative-validation-protocol.md`](research/internal-workflow-representative-validation-protocol.md) is the approved, privacy-bounded protocol for optional later representative validation after issue #10 closed through explicit product-owner uncertainty acceptance; it records no completed participant research and cannot retroactively substantiate representative claims.
- [`research/internal-workflow-validation-operations-runbook.md`](research/internal-workflow-validation-operations-runbook.md) is the authorized coordinator, session, evidence-handoff, saturation, and closure runbook for issue #10; its current state is scheduling pending and it records no completed participant research.
- [`research/internal-workflow-validation-synthesis-template.md`](research/internal-workflow-validation-synthesis-template.md) is the empty privacy-safe release, RV/workflow/workload/edge/fixture synthesis, closure-attestation, and #10-to-#16 handoff contract; its placeholders are not evidence.
- [`specifications/arcgis-layout-atomic-capability-matrix.md`](specifications/arcgis-layout-atomic-capability-matrix.md) is the normalized clean-room benchmark matrix.
- [`specifications/sanitized-example-dataset-golden-log-corpus.md`](specifications/sanitized-example-dataset-golden-log-corpus.md) defines the carrier-neutral synthetic fixture registry, admission/provenance contract, 39-edge semantic-oracle crosswalk, and downstream golden-test handoff for issue #16; it does not claim representative evidence or implement fixture bytes.
- [`specifications/minimum-endpoint-workload-performance-envelope.md`](specifications/minimum-endpoint-workload-performance-envelope.md) records the product-owner-approved #41 minimum Windows endpoint, conservative workload envelopes, predeclared performance budgets, repetition protocol, and privacy-safe evidence policy for #30/#42.
- [`specifications/boring-log-domain-model.md`](specifications/boring-log-domain-model.md) is the normative #22 aggregate, identity, provenance, value-state, Refresh, source-record, Supplemental Source, Override, Render Dataset, and Data Track contract.
- [`specifications/layout-studio-ux-specification.md`](specifications/layout-studio-ux-specification.md) is the normative #23 Production and Advanced Design workspace, command, selection, hierarchy, direct-manipulation, Properties, context-menu, diagnostics, publication, and accessibility behavior contract.
- [`specifications/recovery-retention-privacy-policy.md`](specifications/recovery-retention-privacy-policy.md) records accepted v0.9 recovery cadence, retention, privacy, startup-reconciliation, disk-pressure, and deletion defaults while preserving the named organizational and release-evidence gates.
- [`specifications/rsrender-architecture.md`](specifications/rsrender-architecture.md) is the normative v0.9 process, trust, component, command/query/job, scene/PDF, source, package, persistence, security, test-seam, and post-MVP MCP architecture contract.
- [`specifications/rsrender-product-specification.md`](specifications/rsrender-product-specification.md) is the decision-complete v0.9 product contract for lifecycle, source Refresh and offline work, editable template assignment, layout behavior, Diagnostics, accessible PDF publication, recovery, security, rollout, and explicit exclusions.
- [`specifications/rsrender-acceptance-strategy.md`](specifications/rsrender-acceptance-strategy.md) defines the 69-row verification matrix, nine controlled execution profiles, exact semantic oracles, fixed physical/PDF tolerances, corpus crosswalk, evidence custody, and finite release-gate methods for issue #26; every current result remains non-pass.
- [`specifications/rsrender-phased-implementation-roadmap.md`](specifications/rsrender-phased-implementation-roadmap.md) sequences the completed product and acceptance authorities into nine dependency-safe phases and 13 bounded future build-ticket drafts for issue #27. It does not create implementation issues or authorize coding, dependency, asset, Authoritative File, recovery, or publication writes; #28 is a readiness audit, later explicit user/product-owner instruction is required for activation, and an approved contribution/dependency policy plus accountable employer/rights authority is required before the first dependency addition. Activation never substitutes for employer, vendor, licensor, or asset rights.
- [`specifications/implementation-readiness-audit.md`](specifications/implementation-readiness-audit.md) records the terminal #28 contradiction, custody, traceability, rights-order, open-gate, and future-frontier PASS. It establishes planning readiness only and does not authorize implementation or claim that any acceptance row has passed.
- [`assets/icon-candidates/electron-43-default/`](assets/icon-candidates/electron-43-default/) is a text-only provenance and preference record for the issue #30 icon review. The unapproved third-party icon bytes are local, Git-ignored, non-public, and non-shippable; the record does not approve a production asset.
- [`specifications/prototype-decisions-layout-lifecycle.md`](specifications/prototype-decisions-layout-lifecycle.md) records decisions and explicit limits from disposable prototypes.
- [`specifications/lifecycle-conflict-state-command-specification.md`](specifications/lifecycle-conflict-state-command-specification.md) records the accepted #35 lifecycle conflict, Save As, Close/Quit/update, recovery-review, and warning-gate state/command contract, with externally blocked values routed to their owning tickets.
- GitHub issue #1 and its child issues remain the authority for dependency state, unresolved decisions, fog of war, and the current breadth-first frontier.

Disposable prototype code and raw runs live under `.wayfinder-tmp/` or on linked prototype branches. They are evidence only and must not be promoted into the application by copying them wholesale.

## Completion target

The planning pass is complete only when linked artifacts provide a decision-complete product specification, architecture, domain specification, UX specification, acceptance strategy, and phased implementation roadmap; every remaining uncertainty is explicitly deferred or ticketed; and the first implementation frontier contains no silent product decisions.

No architectural or product decision is established merely by appearing in this index.
