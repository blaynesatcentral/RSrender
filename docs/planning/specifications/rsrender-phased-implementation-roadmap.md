# RSrender v0.9 phased implementation roadmap

**Status:** Durable, decision-complete roadmap for GitHub issue #27; no implementation ticket is authorized or created by this file  
**Evidence cut:** 2026-08-14  
**Live ticket:** [GitHub #27](https://github.com/blaynesatcentral/RSrender/issues/27)  
**Completed planning prerequisites:** [#25](https://github.com/blaynesatcentral/RSrender/issues/25) and [#26](https://github.com/blaynesatcentral/RSrender/issues/26)  
**Readiness boundary:** [#28](https://github.com/blaynesatcentral/RSrender/issues/28) audits contradictions, traceability, fog, ownership and licensing; it does **not** authorize issue creation, coding, dependency installation, asset introduction or other implementation writes  
**Implementation activation:** only a later explicit user/product-owner instruction may activate creation of the build tickets or implementation work defined here

## 1. Outcome and sequencing rule

This roadmap sequences the decision-complete behavior in the closed [product specification](rsrender-product-specification.md) and the verification methods in the closed [acceptance strategy](rsrender-acceptance-strategy.md). Product-specification `PI-*`, `AC-*`, and controlled-scenario `S-*` IDs and acceptance-strategy `D/S/L/P/E/X/F/A/R/G` row and `OA-*` oracle IDs are final trace anchors. #28 may confirm that this frontier is ready; only a later explicit user/product-owner instruction may authorize creating tickets or beginning implementation.

No phase is complete because code exists. Each phase ends with a user-visible or evidence-visible result that uses admitted synthetic data, named oracles, exact versions, and fail-closed behavior. A downstream release gate may remain open while upstream code is built, but its affected capability cannot be enabled, represented as passing, or replaced with an invented fallback.

The implementation critical path is:

```text
0 Repository/tooling foundation
  -> 1 Deterministic domain and Application Core
      -> 2 Package, lifecycle, authentication, and source seams
          -> 3 Renderer-neutral layout, DOM/SVG, and verified PDF
              -> 4 Production workflow
                  -> 5 Advanced Design Studio
                      -> 6 Hardening and controlled internal pilot
                          -> 7 Post-MVP MCP (separate product gate)
                              -> 8 Commercialization readiness
```

The numbering communicates review order, not a claim that commercialization requires MCP. Phase 8 evidence work begins in Phase 0, and a commercial evaluation may follow Phase 6 without implementing Phase 7.

Commercial rights/provenance, endpoint/accessibility environment preparation, and dependency/security review start in parallel; they do not change the semantic order above.

## 2. Delivery principles

1. **Build inward-out.** Domain, commands, and renderer-neutral scene contracts are executable before Electron/UI adapters.
2. **One vertical proof at a time.** Every phase exposes one complete path through the real authority boundary rather than a disconnected mock UI.
3. **Synthetic first.** Canonical FX fixtures and inert canaries are the default. No production RSLog response, credential, client artifact, or restricted go-by enters ordinary development.
4. **Fail closed.** Unproven source shapes, native assets, storage classes, PDF capabilities, recovery environments, or authorities remain unavailable with the specified Diagnostic.
5. **Do not promote prototypes.** Prototype logic may inform tests; production code is written against durable contracts, an approved contribution/dependency-admission policy, accountable rights review, and production security boundaries.
6. **Keep acceptance alongside implementation.** Each build ticket names its #25 `AC/PI/S` trace and #26 row/oracle. Evidence capture is part of Done, not a final cleanup sprint.
7. **No gate-by-date.** Phase exit depends on evidence and authority. Staffing or schedule pressure cannot lower a budget, tolerance, security boundary, or publication rule.

## 3. Staffing and capacity assumptions

This is a capacity model, not a schedule estimate.

| Function | Planning assumption | Primary responsibility |
|---|---:|---|
| Product/domain lead | 0.5 FTE throughout | Resolve only recorded spec contradictions, own acceptance trace, review source/presentation semantics |
| Domain/application engineer | 1 FTE | Aggregates, commands, history, Source Candidate/Snapshot/Render Dataset, deterministic page semantics |
| Electron/platform/security engineer | 1 FTE | Main authority, IPC, workers/Layout Host, file/package/recovery/auth/source brokers, packaging |
| Layout/publication engineer | 1 FTE | Scene engine, text measurement, pagination, Data Tracks, DOM/SVG and PDF projection |
| UI/accessibility engineer | 1 FTE from Phase 3 | Production and Advanced Design workspaces, semantic alternatives, keyboard/focus/AT behavior |
| QA/evidence automation engineer | 1 FTE from Phase 0 | Corpus, property/fault/PDF/performance/accessibility harnesses, evidence manifests, release matrix |
| Firm IT/security/privacy/records/accessibility authorities | Part-time named owners | Environment, retention, credential/source, signing/deployment, AT and pilot approvals |
| Independent reviewer | Part-time at phase boundaries | Security-critical IPC/parser/file work and publication/source-integrity review |

With fewer than four implementation engineers, serialize the critical path; do not combine privileged platform authority with UI shortcuts. With more capacity, parallelize only along the workstreams below. Human/organizational owners are not fungible with engineers.

## 4. Parallel workstreams

| Workstream | Starts | May proceed in parallel | Hard join point |
|---|---|---|---|
| W-A Contracts/domain | Phase 0 | W-B tooling/evidence, W-C platform shell | Domain and command contracts before persisted/project UI |
| W-B Corpus/acceptance automation | Phase 0 | Every phase | Phase 6 release evidence requires all applicable #26 rows |
| W-C Electron/platform/security | Phase 0 after workspace skeleton | W-A pure core, W-D layout research implementation | Phase 2 lifecycle/package/source integration |
| W-D Layout/text/publication | Phase 1 after scalar/scene contracts | W-C package/lifecycle, W-E workflow shells | Phase 3 verified scene/PDF vertical slice |
| W-E Production/Studio UI | Production shell in Phase 3; full workspaces Phases 4–5 | W-D once projections stabilize | Phase 6 integrated accessibility/performance |
| W-F Rights/source/asset/font evidence | Read-only inventory may continue before activation | All activated code phases; no production bytes required | #43 and font/native asset gates before enabling affected capabilities |
| W-G Endpoint/accessibility/deployment operations | Environment preparation during Phases 2–5 | Implementation and synthetic harness work | #30/#34/#36–#40/#42 before pilot/firm-wide gates |

The product specification accepts uncertainty about workflow frequency and organizational task distribution. Staffing and UI sequencing must not relabel synthetic workload classes as observed firm behavior.

## 5. Phase summary

| Phase | User/evidence-visible outcome | Principal dependencies | Gate posture at exit |
|---|---|---|---|
| 0. Repository/tooling foundation | Reproducible empty build, test, package-security smoke, corpus/evidence runner | #25/#26 completed; #28 readiness audit complete; later explicit implementation instruction | No product capability claim |
| 1. Deterministic domain/Application Core | Headless creation/edit/Refresh-accept/assembly/page semantics with exact goldens | Phase 0; #22/#25 contracts | Pure `D/S/L` rows pass; no file/UI claim |
| 2. Package/lifecycle/auth/source seams | Secure packaged shell saves/reopens an offline synthetic project and stages a registered synthetic Refresh | Phase 1; ADRs 0001–0006/0008 | #36/#37/#38/#42 remain release gates; no live vendor claim |
| 3. Renderer/layout/PDF | Same resolved scene appears in semantic DOM/SVG and a structurally inspected PDF | Phases 1–2; ADR 0007; qualified fonts | #30/#34/#37/#40 and PDF rows remain method-not-pass until run |
| 4. Production workflow | Engineer can build a synthetic Log Project, accept Refresh, assign templates and resolve presentation issues; Bundle structure/fault logic is proven, with user-destination publication only after applicable #36/X06 evidence | Phases 2–3 | Source positives stay #43-gated; user publication stays #36-gated; pilot not yet authorized |
| 5. Advanced Design Studio | Maintainer can author a template from blank using Contents/Canvas/Properties and reuse it in Production | Phases 1/3/4 shared contracts | Full keyboard/AT/performance acceptance still open |
| 6. Hardening/internal pilot | Signed controlled build completes declared workflows on firm-approved endpoints with support/recovery controls | Phases 0–5 plus applicable technical/organizational gates | Pilot only after its exact gate set; firm-wide needs all v0.9 gates |
| 7. Post-MVP MCP | Separately authorized agent adapter invokes allowlisted application commands with audit/consent | Successful internal MVP; new product/security specification | Never silently included in v0.9 |
| 8. Commercialization | Due-diligence-ready product, rights, support, security and transfer inventory | Internal evidence plus employer/counsel/vendor decisions | Internal release never implies sale readiness |

## 6. Detailed phases

### Phase 0 — Repository and tooling foundation

**Goal:** establish a reproducible, reviewable production repository without implementing product behavior.

**Prerequisites:** #25 and #26 are complete; #28 has completed its readiness audit; a later explicit user/product-owner instruction has activated this phase; and an accountable employer/rights authority has approved the contribution and dependency-admission policy that governs the exact intended internal, repository, distribution and future-transfer acts. No dependency may be installed, added or locked before that policy admits its exact package/version/provenance/license/use. #28 alone never permits coding or dependency writes, and later user/product-owner activation cannot substitute for employer, vendor, licensor or asset rights. Architecture pins Electron 43.4.0 and `@zip.js/zip.js` 2.8.49 unless a recorded specification/ADR revision changes them, but a technical pin is not a rights approval. Node/npm/TypeScript and build, test, lint and formatting tooling remain selectable implementation choices, then are exactly locked; those choices cannot weaken security, rights or evidence requirements.

**Build scope:**

- npm workspace and package boundaries matching `contracts`, `domain`, `application`, `scene`, package/source contracts, Electron adapters, Layout Host, renderer UI, and test support;
- pre-install admission records for every proposed dependency under the approved policy, followed only for admitted versions by the exact lockfile, reproducible clean install/build/test commands, type checking, formatting/linting, deterministic dependency inventory, and secret/prohibited-content checks;
- fixture manifest/admission reader for the canonical synthetic corpus, without materializing unresolved positive source shapes;
- #26 evidence-manifest/result vocabulary and canonical JSON/hash utilities;
- packaged empty Electron shell with production security preferences, denied navigation/permissions, no Node in renderer, and no document/file/source capability; and
- architecture dependency checks preventing domain/application packages from importing Electron, DOM, ZIP, network, or filesystem modules.

**Parallel:** pure tooling/evidence, package-boundary skeletons, and empty Electron security harness.

**Exit:** a clean clone can install from the exact lock, run all checks, build a packaged empty app, prove the renderer has no Node/Electron globals or arbitrary navigation, load an admitted synthetic fixture manifest, and emit a valid privacy-safe evidence manifest. Dependency/notice inventory is reviewable. No screen, file, source, PDF, or accessibility claim is made.

**Trace:** #24 §§4,11,13–14; P07/P06 harness readiness; AC-015/016 foundations.

### Phase 1 — Deterministic domain and Application Core

**Goal:** make the product's truth and commands executable with no Electron, filesystem, ZIP, browser, or vendor dependency.

**Build scope:**

- canonical identities, physical units, value/association/finality/eligibility states, provenance, Diagnostics, and immutable aggregate codecs;
- Log Template, Log Project, Log Set, Exploration Group, Template Assignment/ETR and page-range/Data Track models;
- runtime-validated command/query/event/job unions, command registry, command availability, immutable working/durable revisions, one-command history boundaries, Undo/Redo, and revision-tagged projections;
- Source Snapshot Candidate collection envelopes, candidate eligibility/diff/atomic acceptance, accepted Snapshot, Supplemental Source, Source Resolution Decision, Override/Annotation, and pure Render Dataset assembler;
- page ownership `[start,end)` with final terminal inclusion, interval fragmentation, compatible axes and one track depth transform; and
- deterministic Diagnostic ordering and fail-closed unknown/source-evidence-blocked states using FX-01–FX-14.

**Parallel:** aggregate/value work; command/history work; source/assembler work; page/Data Track work; property/golden tests.

**Exit:** a headless harness creates a project and template, executes named commands, proves exact revisions/Undo boundaries, stages/rejects/accepts FX-08 Refresh, round-trips every value/provenance state, assembles the same Render Dataset digest in fresh processes, and produces exact FX-02/FX-12 page/Data Track semantics. No renderer or package is involved.

**Trace:** PI-01–08, PI-19–20; AC-003–005/010/011; #26 D01–D06, S01/S03–S06, L01/L06.

### Phase 2 — Package, lifecycle, authentication, and source seams

**Goal:** put the deterministic core behind the selected privileged boundaries and prove one safe offline document/source vertical slice.

**Build scope:**

- main-owned Application Core/DocumentSession, ownership generation, typed preload bridge, job supervisor, transient pure-JS utility contract, and redacted diagnostics;
- constrained ZIP logical validator/migration registry and the exactly locked `@zip.js/zip.js` 2.8.49 physical adapter with no extraction; current/older/future/hostile synthetic package cases;
- local-fixed-NTFS preflight and pluggable storage adapter; Save/Save As candidate/validation/reopen state machine first against deterministic fault adapters, then controlled #36 mechanics;
- recent-file locators, duplicate-open/identity, External Change/Compare/reconciliation, Close/Quit review, and recovery state machine/policy behind explicit environment attestation;
- dedicated short-lived Auth Entry renderer and session-only credential/source broker exercised only with inert canaries;
- operation-ID source transport registry, a synthetic documented-contract read adapter, Source Candidate mapping, deliberate Refresh review/accept, and zero-network offline reopen; and
- application-private structured clipboard plus deliberate OS plain-text/path commands with warnings.

**Parallel:** package/migration worker; lifecycle/storage state machine; Electron IPC/supervision; auth broker; synthetic documented-contract source adapter; recovery classifier; evidence/fault harness.

**Exit:** the packaged app can create, Save, close, reopen, and edit a synthetic Log Project from a current constrained package; older packages open as untargeted migrated copies, future/hostile packages fail safely; a synthetic documented-contract Refresh stages and accepts atomically; restart requires reauthentication; offline reopen performs no network request; secret canaries are absent from every artifact/sink. Fault adapters demonstrate classified old-valid/new-valid/conflict/uncertain states without claiming #36/#37 release proof.

**Trace:** PI-01–05, PI-14–16, PI-19–20; AC-001/002/004/005/015–017, with AC-014 destination/publication foundations only; #26 P01–P07, E01–E11, S01–S04/S07, X06 foundations.

**Unavailable at this phase:** live RSLog operations without the named authorization/contract; positive #43-blocked source families; untrusted native-decoded assets; recovery on unapproved profiles; nonlocal authoritative storage.

### Phase 3 — Renderer-neutral layout, DOM/SVG, and PDF

**Goal:** prove one layout authority and one fixed scene from live preview through verified PDF output.

**Build scope:**

- renderer-neutral Page Plan/Resolved Page Scene, scene cache keys, text measurement port, stable node/semantic order, hit geometry, and nonprinting Diagnostics;
- sandboxed Chromium Layout Host measure mode with exact font/input/engine digests, source ranges, logical/ink bounds, baselines and overflow outcomes;
- semantic HTML shell and SVG page projection consuming fixed scene/text results, not authoring document state;
- Header/Depth Body/Footer, regions/columns, Dynamic Text, basic shapes/lines, approved fonts/assets, first/continuation/last variants, page navigation/zoom and Data Tracks;
- every specified overflow policy and exact continuation/no-drop/no-duplicate semantics;
- publication-mode fixed non-wrapping projection, Electron `printToPDF`, structural inspector, custom/mixed size capability gating, tagged semantics, and PDF/Audit bundle writer behind a qualified destination port; and
- semantic and normalized PDF goldens for FX-01/02/03/06/09/10/12/13.

**Parallel:** pure scene/page planner; Layout Host text measurements; semantic SVG projection; PDF inspector/publication adapter; font/asset qualification; PDF accessibility harness.

**Exit:** changing an FX-06 value updates the live scene with explicit overflow state; the same frozen line/source ranges and `mpt` geometry appear in the normalized PDF inventory. FX-02 boundary ownership and FX-12 shared axes remain exact. Page boxes meet the final #26 tolerances. Unqualified font, tagging, mixed-size, native asset, or engine configuration blocks publication rather than reflowing, rasterizing, substituting, or rescaling.

**Trace:** PI-09/10/12/13/17/20; AC-009/010/013/014, with AC-012 preflight foundations and AC-015 parser/resource foundations only; #26 L01–L08 and X01–X06.

### Phase 4 — Production workflow

**Goal:** deliver the complete synthetic engineer/reviewer workflow before the full template-design surface.

**Build scope:**

- Production workspace: source project/catalog selection, Source Context, Log Set/grouping/order, Exploration membership, ETR catalog/assignment precedence/origin, Boring Log/page navigation, data/provenance inspection and offline status;
- deliberate Refresh planning/retrieval/Candidate diff/accept/cancel and source-conflict presentation;
- Display Value Overrides, Freeform Annotations, Source Resolution Decisions, active structured clipboard and exact conflict/remediation flows;
- centralized Diagnostics, preflight, six allowlisted project suppressions, candidate-bound acknowledgments, immutable Publication Candidate, and accessible feedback;
- verified PDF plus canonical Publication Audit sidecar as one Publication Bundle, including pair identity/digest/reconciliation; and
- packaged synthetic end-to-end tasks S-01/02/04/05/07/08/09/10/11.

Full Advanced Design controls are not required yet; admitted fixture templates/ETRs exercise Production. Basic ETR shared-edit projection may be exposed only through already specified commands, not an interim flattened template editor.

**Parallel:** source/catalog/Refresh UI; Log Set/assignment UI; override/conflict/provenance UI; Diagnostic/preflight/publication UI; lifecycle/recovery UI; accessibility semantics.

**Exit:** an engineer can create a synthetic source-backed project, accept a complete Candidate, organize/assign multiple Explorations/templates, review live pages offline, create a source-preserving Override/Annotation, resolve or be blocked by conflicts, preflight exact Diagnostics, and Save/reopen. Required errors and undisposed warnings cannot be bypassed. Publication Bundle exit has two permitted states: after the applicable #36/X06 destination evidence passes, publish a verified PDF/Audit pair to a user-selected qualified destination; before that evidence, prove only deterministic Bundle structure and pair-fault behavior through the owned synthetic fault adapter while user-destination publication remains unavailable. The latter is not a publication or storage pass.

**Trace:** PI-01–16/19–20; AC-001–005/010–017; #26 S01–S08, E03–E11, X01/X06/X07 and A05 task calibration.

### Phase 5 — Advanced Design Studio

**Goal:** make every required template/layout capability authorable through semantic, keyboard-equivalent commands.

**Build scope:**

- Advanced Design workspace with Page/Template Variant design, Example Dataset selection, Contents, Canvas, Properties, rulers/grid/guides/snapping, styles/components, bindings and Diagnostics;
- shared ordered selection and Key Element, overlaps/marquee, multi-edit/mixed values, alignment/distribution/match size;
- complete typed Contents hierarchy, local/effective visibility/lock, drag and keyboard reorder/reparent, group/ungroup, clipboard/duplicate/delete, context parity and command search;
- direct pointer preview plus exact property/nudge/resize/rotation/anchor/pin commands through one command registry/history authority;
- text runs, formatting, line/fill/border/transparency, picture command gated by admitted decoder/rights, Dynamic Text/binding editor, semantic columns and Data Track/Axis/Layer editors;
- template variants, page size/orientation/margins, per-page Reference Depth Ranges and visible scale, shared ETR editing and Save as Separate Template; and
- focus/announcement/error semantics designed in, with automation before controlled #34/#40 observation.

**Parallel:** Contents/selection; Canvas manipulation; Properties/styles/components; binding/text/overflow; page/Data Track editors; accessibility/command parity automation.

**Exit:** from a blank template, an authorized tester can complete synthetic IA-01 and S-03/S-06 using pointer or keyboard routes, Save/reopen the editable template, use it in Production, and obtain exact equivalent command/history/scene outcomes. Every item is discoverable in Contents and editable via supported Properties/commands. Background-image imitation, package-internal editing, inaccessible drag-only behavior, and silent mixed-value mutation are absent.

**Trace:** PI-06–11/17–20; AC-006–013/019/020; #26 D04–D06, L03–L08, A01–A05. S-12/G01–G06 remain restricted and blocked until their separate authority.

### Phase 6 — Hardening and controlled internal pilot

**Goal:** convert the integrated Phase 0–5 candidate into a supportable controlled build, qualify complete-v0.9 capabilities separately, then expand only through the product's gated rollout.

**Development-qualification work:**

- complete final #26 matrix against the exact signed release candidate and admitted FX corpus;
- #30 minimum-endpoint correctness/performance; #36 storage/fault/reconciliation; #37 packaged process/crash/native exclusion or hardened decoder; #42 resource limits;
- #40-controlled environment followed by #34 keyboard/AT/human evidence;
- #38 security/privacy/records approval and recovery attestation; #39 signed install/update/rollback/uninstall and firm IT policy;
- #43 authorized positive source/asset evidence only where intended for v0.9; otherwise prove typed unavailable/fallback behavior;
- threat model, dependency/SBOM/notices/vulnerability review, structured secret/content canaries, support-bundle redaction and incident/support procedures;
- user/admin documentation for current-only templates, offline/Refresh, Overrides, warnings/audits, storage/recovery, unsupported capabilities and no historical reproduction; and
- privacy-safe synthetic IA-01–IA-06 task observation before restricted/production use.

**Pilot entry:** exact pilot membership, endpoints, storage, source account/user model, template/publisher authority, support contacts, privacy/records handling, known limitations and rollback are approved. Pilot data use never broadens source/vendor rights. Recovery remains disabled if its environment gate is absent. A deliberately bounded pilot may exclude Picture-dependent templates and keep Picture commands unavailable while native-decoder/asset qualification is absent, provided the limitation is explicit and no pilot task or output implies Picture support.

**Pilot exit:** named pilot participants complete the approved bounded production/template/reviewer workflows without a critical source-integrity, data-loss, publication-integrity, security, privacy or accessibility defect; support incidents and evidence stay within custody; exit review disposition is recorded per #26. Complete v0.9 and firm-wide availability additionally require every applicable technical and organizational row to pass/approve, including the required Picture-element path's admitted asset rights, PDF behavior and hardened native-decoder boundary. Pilot success with Picture unavailable is not complete-v0.9, firm-wide or commercial acceptance.

**Trace:** all AC-001–020; #26 D01–G06 as applicable; product rollout §17.

### Phase 7 — Post-MVP MCP

**Goal:** add agentic interaction only as a separately authorized product surface over the existing `ApplicationServicePort` and command registry.

**Prerequisites:** internal MVP/pilot exit; a new product specification, threat model, user-consent/confirmation model, principal/capability/audit/retention policy, MCP protocol/version/dependency review, and privacy authority. S-12/G01–G06 demonstrate controlled recreation through supported commands but do not authorize an MCP server.

**Scope:** separately packaged/explicitly enabled adapter; allowlisted queries/commands; distinct read/mutate/Refresh/Save/publish authorities; user-visible session and revocation; exact document/revision results; confirmation for consequential commands; no renderer DOM automation, direct filesystem, credentials, raw source transport, warning bypass, or unattended publication.

**Exit:** synthetic adversarial and controlled-human tasks show command equivalence, least privilege, consent, revocation, stale/replay rejection, redacted audit and safe cancellation. Production/client use remains separately approved.

### Phase 8 — Commercialization readiness

**Goal:** preserve and demonstrate the option to sell/license/transfer the product without claiming rights or readiness that do not exist.

Phase 8 does not depend on shipping MCP. It may enter formal evaluation after Phase 6 when the exact transaction/product scope is known; Phase 7, if pursued, adds its own separate disclosure and evidence obligations.

**Parallel work begins in Phase 0:** contribution provenance, exact dependency/font/asset/license inventory, clean-room evidence custody, configurable branding, vendor/API authorization questions, security/privacy documentation and public-MIT history disclosure.

**Commercial evaluation work:** employer/counsel ownership and assignment review; contributor/IP schedule; Rocscience/API/cache/asset/commercial rights; product name/trademark/trade-dress clearance; buyer-transfer dependency/font/asset notices; secure development/support/update policy; privacy/security/records contracts; data-processing/export controls; vulnerability/incident/support obligations; commercial signing/distribution and change-of-control terms.

**Exit:** a due-diligence binder identifies every code/dependency/asset/font/data/research contribution and right, public MIT history, unresolved restriction, security/privacy architecture, release evidence, support/upgrade commitments and vendor authorization. External distribution/sale remains blocked until accountable owners approve the exact transaction. Internal use and a buyer's interest do not confer rights.

## 7. Dependency and gate classification

### 7.1 Global readiness and activation boundary

| State | Effect | What remains safe |
|---|---|---|
| #25 and #26 complete | Product behavior and verification methods are final planning inputs | Durable trace/roadmap review |
| #28 incomplete | Planning contradictions, ownership, licensing or hidden decisions may remain | Read-only inventory, review and roadmap correction only |
| #28 complete but no later explicit user/product-owner activation | The frontier may be ready, but no GitHub build issue, code, dependency, asset or other implementation write is authorized | Read-only ticket-body preparation and nonmutating repository review |
| Approved contribution/dependency policy or accountable employer/rights authority absent | No dependency installation/addition/lock, contribution admission, asset introduction or distribution-bearing implementation work may begin | Read-only candidate inventory, license/provenance research and proposed policy review |
| Explicit activation received | Only the specifically authorized tickets/actions may begin, subject to their own dependencies and capability gates | Execute the bounded authorized scope; activation does not waive any gate |

#28 is an audit, never an implementation authority. Neither closing #28 nor publishing this roadmap creates tickets, installs Electron/zip.js/tooling, or starts Phase 0 automatically. User/product-owner activation controls work scope only; it never supplies employer ownership, vendor authorization, dependency-license permission, asset rights or future-transfer authority.

### 7.2 Capability-specific enablement gates

| Gate | Capability that stays unavailable | Work that may proceed after explicit activation |
|---|---|---|
| #43 positive evidence absent | Positive mapper/DTO and rights-dependent source/asset families | Typed unavailable/empty/failed states, inert unknown envelope and neutral fallback |
| #37 hardened native boundary absent | User/package untrusted native image/font/hatch/PDF/SVG decoding and complete-v0.9 Picture support | Programmatic primitives, approved pre-reviewed build assets and explicit unavailable commands |
| Applicable #36/X06 destination evidence absent | User-selected Publication Bundle commit/Replace Existing on that destination | Deterministic Bundle structure and owned synthetic pair-fault adapter; user destination remains unavailable |
| #38 approval or #36/#37/#39 recovery evidence absent | Recovery creation/opening/deletion where its exact policy preconditions are unmet | Recovery domain/state/fault logic and explicit disabled/preserve behavior |
| Restricted go-by authority absent | S-12/G01–G06 client-bearing run and every derivative | Synthetic blank-template harness only |

### 7.3 Evidence and organizational gates

These gates do not grant implementation authority. After explicit activation they constrain claims, capability enablement, pilot entry or release as stated.

| Gate | Earliest meaningful run | If not passed |
|---|---|---|
| #30 performance | Integrated Phase 5 UI on minimum endpoint | No supported workload/UI performance claim; optimize or reduce admitted scope through recorded decision |
| #34 accessibility | Phase 5 packaged workflows after #40 | No accessibility acceptance/pilot expansion |
| #36 storage | Phase 2 real storage adapter, repeated after final build | No durability, Authoritative File write or user-destination Publication Bundle claim |
| #37 packaged security/process | Phase 2 shell/workers; repeat Phase 6 | No packaged topology/crash-rebind claim; native decode remains unavailable |
| #38 recovery approval | Policy review can start now; mechanics Phase 2/6 | Recovery disabled/preserved fail-closed where approval/attestation is absent |
| #39 deployment | Packaged integrated Phase 6 candidate with its exact enabled-capability declaration | No signed pilot/firm-wide install/update/rollback path |
| #40 controlled AT environment | Prepare before Phase 5; qualify before #34 | Automated semantics only; no human/AT evidence |
| #42 resources | Package jobs Phase 2, layout/PDF Phase 3, final Phase 6 | Over-limit capabilities unavailable; no silent limit tuning/shared pool |
| #43 source/assets | Evidence work in parallel; integrate only admitted contracts | Named positive families/assets stay unavailable; core source model remains valid |

A prototype observation never changes these classifications to pass. A failed gate triggers the specified fail-closed response or a recorded spec/ADR change; it does not authorize an implementation-local fallback.

## 8. Explicit deferrals and exclusions

| Capability | Roadmap disposition |
|---|---|
| RSLog write-back/correction/delete/sync | Rejected v0.9; no mutation client, command, permission or hidden endpoint |
| Automatic/background Refresh | Rejected; only deliberate Refresh command |
| Persisted project/template/Snapshot/PDF version history or historical exact reproduction | Rejected/not promised; session Undo is not durable history |
| Production MCP/agent server | Deferred to Phase 7 with new product/security/authority work |
| Collaborative/cloud/shared-server editing | Deferred; no sync/conflict placeholder |
| macOS/Linux | Deferred; Windows-only build/test/deployment |
| Direct OS printing/tiling/`.prn` | Deferred/rejected paths; verified PDF only |
| Full-page raster or untagged PDF fallback | Rejected; failed text/tag/layout blocks output |
| Arbitrary plug-ins/scripts/macros/remote content | Rejected |
| Independent raster layout/export engine | Deferred and never an export-failure escape |
| Unknown lab/interim/piezometer/drilling-detail/hatch wire/asset shapes | Conditional unavailable until #43 admits exact contract/right |
| Remote/sync/removable authoritative storage | Rejected v0.9; read-only plus Save As Local |
| Picture elements | Required but cannot enable until approved decoder, rights, PDF and recovery/security qualification |
| Multiple simultaneous RSLog accounts/source projects per Log Project | Excluded v0.9 |
| Generic GIS authoring/map-frame semantics | Excluded |

Deferred UI controls are omitted or visibly unavailable with an exact reason; they are not nonfunctional placeholders that suggest support.

## 9. First build-ticket frontier

This is a ticket draft, not authorization to create issues. #25 and #26 are completed authorities; #28 only audits readiness. Even after #28 closes, no ticket may be created and no implementation may begin until a later explicit user/product-owner instruction activates the named scope. Ticket bodies must link exact final requirement/acceptance IDs before claim. The frontier intentionally stops before Authoritative File writes, recovery writes, publication writes, vendor access, native decoding, layout policy or user-facing product behavior.

### 9.1 Seed ticket

| Draft ID/title | Small output | Objective Done | Dependencies | Explicit non-scope |
|---|---|---|---|---|
| BLD-001 — Admit proposed dependencies, then create the locked TypeScript/npm workspace and architecture package boundaries | Policy-admitted empty production workspace matching #24 modules | Before installation, every proposed exact dependency/version—including Electron, zip.js and selectable build/test tooling—has an approved policy disposition, provenance and intended-use record from the accountable rights authority; only admitted versions enter the lock. Clean install/build/typecheck/test/package then succeeds twice, deterministic dependency inventory is emitted, and a dependency-direction test rejects a deliberately invalid import fixture | Completed #28 readiness audit; separate explicit activation; approved contribution/dependency policy and accountable rights authority; architecture §§4/14; product §§14/21; #26 P07 input seam | No first-time legal exception, SBOM/notices drift enforcement (BLD-007 owns continuous enforcement), product screen, Electron privilege, domain behavior, source/file/PDF operation |

### 9.2 Initial parallel frontier after BLD-001

| Draft ID/title | Small output | Objective Done | Dependencies | Explicit non-scope |
|---|---|---|---|---|
| BLD-002 — Implement canonical scalar, identity, unit and digest primitives | `contracts` value library | Boundary/property tests for stable IDs, `mpt`, units, canonical JSON and algorithm-qualified SHA-256 pass under EP-PURE | BLD-001; PI-02/19; D01/D02 | No aggregates, UI, persistence |
| BLD-003 — Establish runtime tagged-union validation pattern | One command/query/result/event example and strict validator | Valid case round-trips; missing/extra/wrong/version cases reject with stable nonsecret code; type/schema drift test fails CI | BLD-001; PI-20; #24 §6; D04/P06 | No generic IPC bridge or real mutation |
| BLD-004 — Implement admitted corpus-manifest reader | Read-only #16 fixture metadata/admission validator | Synthetic valid manifest loads; prohibited/pending/wrong-digest/layer-mismatch fixtures reject; it never reads production/restricted go-by content | BLD-001; product §§18/21; #16; OA-GOLD-001/OA-REP-001 | No fixture value invention or physical document package |
| BLD-005 — Emit #26 evidence manifests and result states | Test-support evidence writer/validator | METHOD_NOT_RUN/BLOCKED/PASS/FAIL/INVALID/APPROVED/NOT_APPROVED and provenance/environment/retention/invalidation fields validate; synthetic sample contains no host/user/path | BLD-001; product §21; #26 §§2.1/8.1 | No claim that any product row passed or approval exists |
| BLD-006 — Build empty packaged Electron security shell | Electron 43.4.0 main + one sandboxed inert renderer, no app capability | Packaged smoke asserts context isolation/sandbox/no Node/no navigation/popups/permissions/network and clean teardown; exact binary/preferences recorded | BLD-001; PI-16/20; ADRs 0007–0008; P06 harness | No document state, preload command, file/source/auth access; changing the Electron pin requires recorded specification/ADR revision |
| BLD-007 — Continuously enforce dependency/license/provenance admission | CI enforcement over BLD-001's approved admission records, exact lock/dependency inventory and the empty asset inventory | Every run regenerates SPDX/SBOM/notices/source/hash records and cross-checks them against approved admission; added/changed/unapproved packages, missing/unknown/prohibited licenses, provenance drift or undeclared assets fail before build/distribution | BLD-001; approved contribution/dependency policy and accountable rights authority; product §§14/21; P07; #28-recorded readiness constraints | Enforces and evidences prior decisions; it does not make first-time legality, employer-ownership, vendor-rights or exception decisions and adds no asset |

### 9.3 Next frontier unlocked by the initial parallel tickets

| Draft ID/title | Small output | Objective Done | Dependencies | Explicit non-scope |
|---|---|---|---|---|
| BLD-008 — Implement orthogonal value-state and provenance records | Domain value objects | FX-04/12 boundary cases preserve absent/null/empty/zero/unavailable/finality/association and source/supplemental/override provenance exactly | BLD-002/004; PI-05/19; D02/D03 | No vendor DTO, formulas, UI severity |
| BLD-009 — Implement Log Template/Log Project identity skeletons | Empty valid aggregates and invariant failures | Exactly one project source context/project/Log Set; stable template/ETR identities; duplicate/ambiguous membership rejected | BLD-002/008; PI-02/06–08; D01 | No persistence or template editor |
| BLD-010 — Implement in-memory ApplicationServicePort dispatcher | One no-op query and one synthetic mutation command through strict contracts | Expected revision commits once; stale/replay/invalid command changes nothing; projection sequence/gap recovery exact | BLD-003/009; PI-20; #24 §6; D04 | No Electron bridge, filesystem, Undo or product command surface |
| BLD-011 — Implement working/durable revision and history core | In-memory revision/history service | One mutation/Undo/Redo boundary, captured revision unaffected by later edit, non-document lifecycle effect excluded; property tests pass | BLD-009/010; AC-001; D04/E03 pure seam | No Save adapter or durable claim |
| BLD-012 — Expose one generated preload query against the empty shell | Narrow read-only application-version query | Exact sender/frame/origin/capability/schema/sequence checks pass; stale/replay/child/cross-window cases reject; renderer gets no generic IPC | BLD-003/006/010; PI-16/20; ADR 0008; P06 | No document mutation/path/source/auth capability |
| BLD-013 — Validate the aggregate evidence index for BLD-008–012 | One schema-validated index over already-produced bounded manifests | Index rejects missing/duplicate row identities, wrong schema/oracle/fixture/revision/digest links, unknown result states and absent retained-failure references; every entry links final requirement/acceptance IDs | BLD-004/005; product §21; #26 §8.1 and OA-GOLD-001/OA-REP-001; already-produced manifests from corresponding tickets | No test execution, new row evidence, result reinterpretation, pass aggregation or release claim |

After this frontier, the next planning step is to decompose Phase 1 aggregates/commands into similarly small tickets. Do not jump directly to a “build editor,” “integrate RSLog,” “save files,” or “export PDF” ticket; each would conceal multiple authorities, state machines and acceptance rows.

## 10. Product requirement to phase trace

| Product acceptance | Owning build phase(s) | Final evidence phase |
|---|---|---|
| AC-001 | 1–2, then UI in 4–5 | 6 |
| AC-002 | 1–2 and 4 | 6 |
| AC-003 | 1 and 4 | 4/6 |
| AC-004 | 1–2 and 4 | 6/#43 where positive source evidence applies |
| AC-005 | 1–2 and 4 | 6 |
| AC-006–008 | shared core 1; UI 4–5 | 6/#34/#40 |
| AC-009–010 | 1 and 3; editors 5 | 6 |
| AC-011–012 | 1 and 4 | 6 |
| AC-013–014 | 2–4 | 6/#36/#40 |
| AC-015 | 2 | 6/#36/#37/#42 |
| AC-016–017 | 2 and 6 | 6/#36–#39 |
| AC-018 | instrumentation throughout; integrated 5 | 6/#30 |
| AC-019 | semantics throughout; full workflows 5 | 6/#34/#40 |
| AC-020 | synthetic controls throughout; restricted scenario only under authority | 6/G01–G06 |

## 11. Roadmap completion rule

This durable #27 roadmap is complete only when:

- #25 and #26 are closed and every phase/ticket trace uses their final IDs;
- #28 completes the readiness/contradiction audit and records dependency/ownership constraints without being treated as implementation authority;
- creation of build tickets, dependency writes and implementation remain inactive until a later explicit user/product-owner instruction names the authorized scope;
- an approved contribution/dependency-admission policy and accountable employer/rights authority exist before the first dependency installation/addition/lock, and later activation is never treated as a substitute for employer/vendor/licensor rights;
- every phase has a user/evidence-visible exit, dependency, owner, privacy boundary and fail-closed gate disposition;
- every v0.9 AC-001–020 requirement appears on the phase trace;
- the first build frontier can be created as small GitHub tickets without product questions or hidden cross-authority scope;
- blocked positive source/native/storage/accessibility/deployment/recovery capabilities remain unavailable rather than mocked as complete;
- Phase 6 distinguishes development qualification, controlled pilot and firm-wide availability; and
- MCP and commercialization remain separate post-MVP/authority programs rather than MVP shortcuts.

This roadmap makes no implementation, schedule, staffing availability, gate pass, pilot, firm-wide release, accessibility, durability, security, privacy, source authorization, or commercialization claim. It defines a dependency-safe future frontier; it does not create that frontier in GitHub or authorize any code, dependency, asset, Authoritative File, recovery or publication write.
