# RSrender v0.9 Acceptance Strategy

**Status:** Durable, decision-complete verification strategy; no acceptance row is currently a pass  
**Evidence cut:** 2026-08-14  
**Live ticket:** [GitHub #26](https://github.com/blaynesatcentral/RSrender/issues/26)  
**Product authority:** [RSrender v0.9 Product Specification](rsrender-product-specification.md), especially AC-001–AC-020  
**Open evidence gates expressed as methods, not results:** #30, #34, #36, #37, #38, #39, #40, #42, and #43

## 1. Purpose and authority

This strategy converts the settled product, domain, UX, architecture, lifecycle, recovery, corpus, and workload contracts into finite verification methods. It does not certify the product, close a gate, authorize human/client-data work, or treat a prototype as a release result.

Normative inputs are:

- [RSrender v0.9 Product Specification](rsrender-product-specification.md);
- [ubiquitous language](../../../CONTEXT.md);
- [boring-log domain model](boring-log-domain-model.md);
- [Layout Studio UX specification](layout-studio-ux-specification.md);
- [RSrender architecture](rsrender-architecture.md) and [ADRs 0001–0008](../../adr/);
- [lifecycle conflict state and command specification](lifecycle-conflict-state-command-specification.md);
- [recovery retention/privacy policy](recovery-retention-privacy-policy.md);
- [sanitized Example Dataset and golden-log corpus](sanitized-example-dataset-golden-log-corpus.md); and
- [minimum-endpoint workload/performance envelope](minimum-endpoint-workload-performance-envelope.md).

#20 is completed decision evidence and calibration input. It is not an umbrella blocker and does not substitute for packaged #36/#37 observations. #17–#21 are bounded prototype evidence, not release passes.

## 2. Acceptance decision model

### 2.1 Result vocabulary

Every matrix row has exactly one current result:

| Result | Meaning |
|---|---|
| `METHOD_NOT_RUN` | Finite method exists but no qualifying evidence has been executed. This is the initial state of every unblocked row in this strategy. |
| `BLOCKED` | A named prerequisite, authority, fixture, environment, or supported mechanism is absent. A blocked row is not a failure and not a pass. |
| `PASS` | Every required repetition and negative oracle passed in the exact admitted environment with complete custody. |
| `FAIL` | Any mandatory oracle, tolerance, safety invariant, repetition, or evidence-integrity condition failed. One failure rejects the row; averages do not hide it. |
| `INVALID` | Harness, fixture, environment, custody, or authorization invalidated the observation. It must be rerun and cannot be relabeled pass/fail. |
| `APPROVED` / `NOT_APPROVED` | Organizational authority disposition. Technical results cannot substitute for it. |

A release claim requires every applicable mandatory row to be `PASS` and every organizational row to be `APPROVED`. `BLOCKED`, `METHOD_NOT_RUN`, or `INVALID` fails release readiness. A deferred capability may ship only when the durable product specification explicitly defers it and the command/file/source path is unavailable or fails closed with the named Diagnostic.

### 2.2 Verification classes

| Code | Class | Permitted claim | Cannot prove |
|---|---|---|---|
| `EQ` | Deterministic equality | Exact canonical/domain/scene/command result for pinned inputs and version | Cross-environment visual equality or usability |
| `PROP` | Schema/property assertion | Invariants over bounded generated and boundary cases | A specific visual design preference |
| `TOL` | Predeclared tolerance | Physical/PDF/raster equivalence inside a named numeric envelope | Domain completeness, accessibility, or rights |
| `HUM` | Controlled human observation | Task completion, comprehension, focus/speech behavior, professional review | Deterministic implementation correctness outside observed tasks |
| `ORG` | Organizational approval | Authorized security/privacy/records/IT/legal disposition | Technical mechanism correctness |
| `REL` | Release-environment evidence | Behavior of the exact packaged build on the admitted Windows/storage/AT/deployment matrix | Future versions or unsupported environments |

Rows may require more than one class. Visual approval is never a substitute for `EQ`/`PROP`; DOM/ARIA inspection is never a substitute for `HUM`; a technical test is never a substitute for `ORG`.

### 2.3 Evidence grades

| Grade | Evidence | Use |
|---|---|---|
| `G1` | Pure synthetic unit/property/contract evidence | Domain and renderer-neutral mechanics |
| `G2` | Packaged synthetic application evidence | Electron/UI/job/publication behavior |
| `G3` | Controlled release-environment fault evidence | Storage, crash, update, endpoint, resource boundaries |
| `G4` | Controlled human/assistive-technology evidence | Accessibility/usability and professional review |
| `G5` | Restricted client-bearing controlled evidence | Local go-by only; never canonical/public fixture truth |
| `G6` | Signed organizational decision | Security/privacy/records/IT/legal authority |

Higher grade does not automatically replace lower-layer oracles. A G4 reviewer cannot waive a dropped source item, and a G1 test cannot approve recovery retention.

## 3. Common execution profiles

Each matrix row names one or more profiles. These profiles make environment and repetition requirements explicit without repeating them in every cell.

| Profile | Environment and repetitions | Required capture |
|---|---|---|
| `EP-PURE` | Exact dependency lock; pinned locale/time zone; 3 fresh processes; 2 identical runs per fixture revision; property suites use 3 recorded seeds and at least 1,000 generated cases per invariant in addition to every enumerated boundary case | Input/oracle/schema/generator hashes; all exact results and failures |
| `EP-PACKAGED` | Exact release-candidate packaged Electron binary with production preferences/fuses; approved Windows 11 endpoint; 3 fresh app sessions; each deterministic task once per session plus its declared cancel/fault branch. An unsigned byte-identical pre-signing build may calibrate rows unrelated to signature, but final pass requires the signed candidate. | Binary/signature/lock/SBOM/config/harness/fixture hashes; process map; redacted events; output hashes |
| `EP-PDF` | `EP-PACKAGED`; exact FontCatalog/assets/locale; 3 fresh publication jobs per FX-01/02/03/06/07/09/10/12/13 and each supported page-size/orientation capability; include clean `none`, clean `selected`, and every `required` Audit trigger | Scene and projection digests; normalized PDF semantic inventory; bounded raster; exact `ExportDestinationGrant` inventory; PDF metadata; canonical Audit sidecar and Publication Bundle cross-verification when applicable; raw PDF/sidecar restricted when needed |
| `EP-STORAGE` | #36-controlled local fixed NTFS matrix; at least 3 success and 3 injected-fault runs per cell; concurrency/race cells use 20 coordinated runs; true hard-reset/power-loss count is preapproved by endpoint owner | Storage/preflight class, fault stage, exact old/new/candidate/backup or PDF/sidecar identities and digests, commit boundary, surviving-artifact observations, reconciliation result, zero unrelated-file effects |
| `EP-PERF` | Exact protocol in the minimum-endpoint specification: 3 fresh sessions/envelope, 5 warmups, at least 50 discrete iterations/session, 10 five-second continuous traces/session; full 125% run plus 100/150/200% correctness and p95 smoke | p50/p95/p99/max, long tasks, memory, correctness, cancellation, environment and fixture hashes |
| `EP-AT` | #40-approved packaged Windows/AT matrix; current Narrator and NVDA, JAWS only when required; each core task 3 clean runs/config by an authorized evaluator, observed by an authorized recorder; no simulated speech claim | Exact OS/Electron/AT/display/text/contrast versions, focus/speech/status transcript or approved coded observations, failures, consent reference |
| `EP-HUMAN` | Five authorized internal participants spanning template author, production-log author, and reviewer/issuer functions; one practice task, then each assigned task once without coaching; results reported by role class only | Task completion, critical errors, assistance, comprehension, timing as context only, consent/privacy reference |
| `EP-DEPLOY` | #39-approved clean/upgrade/rollback/uninstall Windows VMs and managed-equivalent endpoint; 3 runs per supported transition and one declared interruption at each critical stage | Installer/package/signature/version hashes, exit codes, state/file/recovery inventory, management-plane outcome |
| `EP-GOBY` | Restricted approved workspace; one fresh Codex session from a blank Log Template, then deterministic replay of its supported-command journal in a second fresh app session; no prior project/session memory | Authority record, input custody hashes, app/model/prompt/config hashes, restricted command journal, semantic/output inventories, human rubric and sanitized disposition |

`EP-HUMAN`, `EP-AT`, `EP-STORAGE`, `EP-DEPLOY`, and `EP-GOBY` do not begin until their named authority and consent/safety prerequisites are recorded. Counts are accepted v0.9 verification minima under the standing recommended-for-all decision; they are not participant-population claims.

## 4. Comparison and tolerance contract

### 4.1 Exact equality

Exact comparison applies to canonical JSON, domain identities, collection states, provenance, command results, revision/history transitions, Page Plan ownership, text source ranges/line membership, scene node identity/order, `mpt` geometry, Diagnostics, package logical inventory/digests, Publication ID/audit-required metadata, Audit sidecar fields, PDF digest/filename cross-match, and normalized Publication Audit payload. Canonical values use the format/version and hashing rules in #16/#24. Volatile timestamps, random IDs, and PDF object numbers may be excluded only by an explicit field-level normalizer recorded before the run; stable Publication IDs, Candidate digests, PDF SHA-256 digests, final artifact names, audit mode, and cross-references are never normalized away.

### 4.2 Accepted physical/PDF tolerances

These are the predeclared v0.9 acceptance tolerances adopted under the standing recommended-for-all decision. They are comparison-method limits, not permission to change exact semantic oracles:

| Measurement | Accepted tolerance | Exact negative oracle |
|---|---:|---|
| PDF page MediaBox/CropBox and requested physical page size | absolute error ≤ 0.01 pt per edge | No wrong page count/order/size class or silent scaling |
| Non-text vector bounds, clips, anchors, axes, and depth coordinates | absolute error ≤ 0.02 pt per coordinate | No lost/extra node, changed z-order, duplicated axis/interval, or page reassignment |
| Text line baseline and resolved frame bounds | absolute error ≤ 0.02 pt | Exact source ranges, line count/order, effective font identity, and overflow outcome must still match |
| Raster visual secondary check | after pinned colour profile and antialias mask, ≤ 0.5% pixels exceed ΔE00 2.0 and no unexplained contiguous region exceeds 2 mm² | No mask over content, text, axes, page boundaries, Diagnostics, or missing objects |
| Registered local go-by geometry | page registration ≤ 0.25 mm; rubric-defined major region/column edges ≤ 0.5 mm; line/text styling inspected under the same secondary raster rule | Semantic structure/editability/data coverage must pass independently |

Do not tune these values after observing output. Any future change is a versioned product/acceptance-policy decision that invalidates every dependent row and prior result. PDF byte equality is not required where Chromium metadata is volatile, but normalized semantic equality and the tolerances above remain required.

### 4.3 Human and organizational decisions

Controlled human rows use a predeclared task/rubric with observable completion and critical-error criteria. “Looks good,” preference, and unstructured commentary are supplementary only. Organizational rows require the named accountable function, decision date, scope/build/policy version, conditions, expiry/review trigger, and nonpublic evidence location. Absence of approval is `NOT_APPROVED`, not technical failure.

## 5. Product requirement trace map

This table is the stable bridge from the product contract to the atomic matrix. Text similarity is not traceability: every evidence manifest records the exact section and AC IDs named by its matrix row.

| Product authority | Required behavior | Atomic rows |
|---|---|---|
| Product §4; §5; AC-002–AC-003 | Artifact ownership, Log Set/template cardinality, assignment, current-only ETR behavior | D01, D03–D04, P01, P03–P04, A05 |
| Product §6; AC-001, AC-014 | Save/Save As/conflict/Close/Quit/Update/Recovery and verified outcomes | D04, E03–E10, X06, A01, A03, R02–R03 |
| Product §7; AC-002, AC-004 | Source contract, session auth, complete Candidate, atomic Refresh, offline operation | S01–S04, S07–S08, E11 |
| Product §8; AC-005 | Value/provenance axes, Supplemental Sources, Source Resolution, Overrides, Annotations | D02–D03, S04–S06, X07 |
| Product §9.1; AC-006–AC-008, AC-019 | Workspaces, command parity, Selection/Key Element, hierarchy, direct manipulation, keyboard paths | D04–D05, L07, F01–F02, A01–A05 |
| Product §§9.2–9.4; AC-009 | Semantic composition, live text, explicit overflow, fonts/assets, Styles/Components | L02–L05, L08, X02–X03, G02–G05 |
| Product §10; AC-010 | Page ownership, shared Data Tracks/axes, columns and pagination | L01–L02, L06, X02, X04 |
| Product §11; AC-011–AC-012 | Diagnostic fields/severity/reachability, acknowledgment and six suppressions | D06, S01, S05–S06, L04–L05, L08, X01, X07 |
| Product §12; AC-012–AC-014 | Immutable preflight, tagged/selectable PDF, destinations, failures, canonical Audit sidecar and verified Publication Bundle | X01–X07, L03–L06, A06, G04–G05 |
| Product §13; AC-001, AC-015, AC-017 | Package/migration/storage/recovery/update safety | P01–P06, E01–E10, R02–R04 |
| Product §14; AC-015–AC-017, AC-020 | Electron trust, privacy, clean-room rights, redaction, restricted evidence | S02, S08, L08, P02, P06–P07, E11, R01, R04–R05, G01–G06 |
| Product §15; AC-019 | Keyboard/AT behavior and accessible PDF | E07, X05, A01–A06 |
| Product §16; AC-018 | Minimum/Typical/Large supported workload, fixed budgets and bounded adversarial safety | P05, F01–F05, A04 |
| Product §§17, 21; AC-016–AC-020 | Gated internal rollout and finite controlled evidence | A05, R01–R05, G01–G06 |
| Product S-12; AC-020 | Privacy-safe, single-page controlled go-by reconstruction | G01–G06 |

## 6. Verification matrix

Rows start with the result in section 6.11; a row with any unresolved mandatory facet stays `BLOCKED` even when a safe negative/calibration subtest can run. “Custody” uses `SYN` (canonical synthetic/repository-safe after #16 admission), `LOCAL` (controlled raw evidence, sanitized summary may be committed), `RESTRICTED` (no public/repository content or derivatives without separate approval), or `APPROVAL` (nonpublic authority record plus sanitized disposition). “Invalidate” lists the minimum trigger; section 8 adds global triggers.

### 6.1 Domain and command semantics

| ID | Behavior / trace | Fixture and provenance | Class; oracle/tolerance | Profile / grade | Owner; custody | Invalidate | Fail-closed outcome |
|---|---|---|---|---|---|---|---|
| D01 | Aggregate ownership, identity and cardinality (#22 §§3–4; OA-ID-001) | FX-01/05/07/08, admitted synthetic | `EQ+PROP`; exact IDs/parents/cardinality; no name/depth/path matching | EP-PURE / G1 | Domain owner; SYN | Domain/schema/oracle change | Reject command/candidate/package; no heuristic repair |
| D02 | Orthogonal absent/null/empty/zero/unavailable/finality/association states (#22 §§6,9; OA-VAL-001) | FX-04/09/12 | `EQ+PROP`; exact tagged states through round trip/assembly | EP-PURE / G1 | Domain owner; SYN | Value union/codec change | Diagnose/reject affected binding; never coerce |
| D03 | Provenance separation and deterministic Render Dataset (#22 §§5,11,14; OA-PROV-001) | FX-01/08/12 | `EQ`; source/supplemental/override/resolution/derived provenance and digest exact | EP-PURE / G1 | Domain owner; SYN | Mapper/assembler/schema change | Assembly fails; no flattened value |
| D04 | Named command preconditions, atomic effect, revision and Undo/Redo boundary (#22 §15; #23 §§10–11; #24 §6) | interaction command corpus over FX-01/07/14 | `EQ+PROP`; one result/history record or zero mutation; all UI routes same ID | EP-PURE + EP-PACKAGED / G1+G2 | Application owner; SYN/LOCAL | Command contract/reducer/bridge change | Reject whole command; restore projection from main truth |
| D05 | Selection/Key Element, hierarchy, effective lock/visibility, reparent/order/alignment (#23 §§4–7) | FX-14 exact hierarchy/geometry parameter sets | `EQ+PROP`; stable ordered selection, acyclic tree, deterministic snap, explicit skips | EP-PURE + EP-PACKAGED / G1+G2 | UX/application owner; SYN/LOCAL | Scene/command/projection change | Cancel/reject whole gesture; no partial mutation |
| D06 | Diagnostic structure/order/remediation (product §11; AC-011–AC-012; domain §13; OA-DIAG-001) | all FX families with expected Diagnostic atoms | `EQ`; code/scope/cause/consequence/severity/order/remediation and suppressibility exact | EP-PURE / G1 | Product/domain owner; SYN | Diagnostic catalog/policy change | Missing/unknown policy blocks affected operation/publication |

### 6.2 Source, Refresh, Supplemental Sources, and Overrides

| ID | Behavior / trace | Fixture and provenance | Class; oracle/tolerance | Profile / grade | Owner; custody | Invalidate | Fail-closed outcome |
|---|---|---|---|---|---|---|---|
| S01 | Refresh Plan completeness and collection envelopes (product §§7.3, 11.3; AC-004, AC-011; domain §7; OA-COL-001) | FX-01/04/08/09/11 source-shaped synthetic levels permitted by #16 | `EQ+PROP`; every request is success/empty/failed + required/optional; no omitted envelope | EP-PURE / G1 | Source-contract owner; SYN | Adapter/plan/collection-policy change | Candidate ineligible where required; optional stays explicit/unbound |
| S02 | Auth/transport/2FA/refresh/repeated 401/403/cancel seams (ADR 0004; #24 §7) | inert synthetic state machine; no vendor claim/credential | `EQ+PROP`; session-only, one refresh/replay bound, clear on terminal failure; no secret crosses an ordinary bridge; the exact one-shot Auth Entry password/code submission never returns to or persists in page state | EP-PURE + EP-PACKAGED / G1+G2 | Security/source owner; SYN/LOCAL | Auth flow, broker, vendor-supported contract change | Clear broker; require sign-in; prior Snapshot remains |
| S03 | Candidate mapping, staged diff, cancel/failure, atomic acceptance (#22 §§7.2,14; FX-08; OA-SEP-001) | FX-08A/B admitted pair | `EQ+PROP`; 36-style boundary oracles plus exact diff sets; no prior mutation/partial merge | EP-PURE / G1 | Domain/source owner; SYN | Mapper/assembler/diff/command change | Keep prior Snapshot/Render Dataset basis; discard staged result |
| S04 | Authorized unknown open-content envelope and explicit binding (#22 §8.9) | FX-04/10 plus inert absent/null/object fields | `EQ+PROP`; identity/type/state/canonical value/provenance survive; no default placement/execution | EP-PURE / G1 | Domain/source owner; SYN | Extension schema/formatter change | Preserve inertly or refuse; unsupported-binding Diagnostic |
| S05 | Supplemental laboratory MC/PL/LL states/association/eligibility (product §§8, 11.3; AC-005, AC-011; domain §9; FX-12) | adapter-neutral FX-12 only | `EQ+PROP`; blank/zero/nonfinal/duplicate/unit/unmatched/ambiguous exact; no invented PI/precedence | EP-PURE / G1 | Domain/product owner; SYN | Supplemental schema/policy/source evidence change | Render-ineligible affected fact; retain independent inputs/Diagnostic |
| S06 | Presentation Overrides, Freeform Annotations, source conflict and paste rejection (product §8; AC-005; domain §10; FX-08/05) | admitted synthetic before/after/invalid paste cases | `EQ+PROP`; original retained; override separate/revisioned; conflicts explicit; source unchanged | EP-PURE + EP-PACKAGED / G1+G2 | Domain/UX owner; SYN/LOCAL | Override schema/command/policy change | Reject invalid edit or mark conflict; never mutate/retarget source |
| S07 | Deliberate Refresh and offline continuity (#22 invariant 14; #23 §15) | FX-07/08 serialized project with accepted Snapshot, Supplemental Sources, Overrides, ETRs | `EQ+REL`; reopen/render/export makes zero network requests; Refresh occurs only by command | EP-PACKAGED / G2 | Application/source owner; LOCAL | Retained-source/package/source-command change | Continue from retained state; explicit unavailable/reauth, no background Refresh |
| S08 | Positive source-shape and asset gate (#22 §16; #43) | authorized evidence inventory only; no guessed positive fixture | `ORG+PROP`; mapped/empty/failed/blocked disposition and rights exact | EP-PURE after #43 / G1+G6 | Vendor/data/rights owner; APPROVAL | New route/shape/permission/right/version | Keep piezometer/drilling-detail/interim/lab API/hatch binary blocked/inert/neutral |

### 6.3 Page scene, text, pagination, and Data Tracks

| ID | Behavior / trace | Fixture and provenance | Class; oracle/tolerance | Profile / grade | Owner; custody | Invalidate | Fail-closed outcome |
|---|---|---|---|---|---|---|---|
| L01 | Half-open Reference Depth Ranges and page ownership (#22 §12; FX-02) | FX-02 exact points/intervals including final depth, gaps, overlaps, reversed | `EQ+PROP`; `[start,end)`, final terminal inclusive, deeper page owns boundary; exact fragments | EP-PURE / G1 | Scene/domain owner; SYN | Page convention/engine change | Invalid plan Diagnostic; no page generation/publication |
| L02 | Page Plan and scene determinism/no drop/no duplicate (FX-01–06,09–13; all EC text/depth atoms) | admitted synthetic fixture revisions | `EQ+PROP`; identity, pages, variants, geometry, z/semantic order and coverage exact across processes | EP-PURE / G1 | Scene owner; SYN | Scene engine/template/schema/font input change | Reject scene/publication; retain diagnostic inventory |
| L03 | One Chromium text authority and source-range line breaking (product §§9.3, 12.2; AC-009, AC-013; ADR 0007; FX-06) | FX-06 Latin/combining/RTL/CJK/newline/long-token/mixed-run cases with approved fonts | `EQ+TOL`; exact line/source ranges/font identity/outcome; bounds to §4.2 | EP-PACKAGED + EP-PDF / G2 | Typography owner; LOCAL | Electron/font/CSS/locale/scene change | Invalidate measurement; block publication; no second reflow |
| L04 | Explicit wrap/clip/shrink/grow/continue/fail policy (product §§9.3, 11.3; AC-009, AC-011) | FX-06 and FX-02 continuation cases | `EQ+PROP`; no silent clip; declared minimum; union/no-dup source ranges; exact Diagnostic | EP-PURE + EP-PACKAGED / G1+G2 | Product/scene owner; SYN/LOCAL | Product policy/engine/frame change | Unresolved overflow blocks under product §11; never omit text |
| L05 | Font identity, missing/substitution, embedding eligibility (product §§12.2, 14.3; AC-013; architecture §10) | FX-06 with approved face bytes/digests plus deliberate unavailable face | `EQ+REL`; exact effective face/digest; substitution invalidates fit; rights state enforced | EP-PACKAGED + EP-PDF / G2+G6 | Typography/legal owner; LOCAL/APPROVAL | Font bytes/license/OS/Electron change | Diagnose; remeasure; block embedding/publication if rights/identity absent |
| L06 | Shared-axis Data Track and layer behavior (#22 §12; FX-12/10/09) | FX-12 MC/PL/LL, FX-10 N, missing/incompatible/hidden/reordered/page-boundary cases | `EQ+PROP+TOL`; one depth transform; MC/PL/LL axis, N axis; no duplicate interval/axis; scene exact/PDF ≤0.02 pt | EP-PURE + EP-PDF / G1+G2 | Scene/domain owner; SYN/LOCAL | Axis/scene/PDF engine change | Suppress only ineligible layer with Diagnostic; never choose axis silently |
| L07 | SVG projection equals Resolved Page Scene (#23; ADR 0007) | FX-01/03/06/07/14 viewports | `EQ+PROP`; stable node IDs, geometry/order/text results; renderer never writes pixel geometry back | EP-PACKAGED / G2 | UI/scene owner; LOCAL | Projection/scene/Electron change | Refresh full projection; no renderer-state reconciliation |
| L08 | Assets, neutral fallbacks, clips/transparency and blocked native decode (#24 §10; OA-ASSET-001; #37/#43) | licensed synthetic primitives/assets plus missing/unapproved/native-hostile cases | `EQ+PROP+REL`; admitted digest/right, neutral fallback, active SVG rejection, no unqualified native decode | EP-PURE + EP-PACKAGED / G1+G2/G3 | Security/asset owner; SYN/LOCAL/APPROVAL | Decoder/asset/license/build change | Reject asset/capability; placeholder/Diagnostic; never load active/vendor bytes |

### 6.4 Package, migration, parser, and application security

| ID | Behavior / trace | Fixture and provenance | Class; oracle/tolerance | Profile / grade | Owner; custody | Invalidate | Fail-closed outcome |
|---|---|---|---|---|---|---|---|
| P01 | Current constrained-ZIP logical round trip (ADR 0003; #24 §8) | synthetic package containing every required/optional authoritative role and derived role | `EQ+PROP`; canonical logical digest/inventory/identity exact; derived excluded; source unchanged | EP-PURE + EP-PACKAGED / G1+G2 | Package owner; SYN/LOCAL | Schema/zip.js/codec/build change | Reject whole candidate; no target binding |
| P02 | Hostile/corrupt ZIP and logical package rejection | separately admitted inert hostile corpus | `PROP+REL`; traversal, duplicate/case collision, undeclared/encrypted/active/corrupt/schema/cardinality/digest cases typed and non-extracting | EP-PACKAGED / G2+G3 | Security/package owner; LOCAL | Parser/preflight/limit/dependency change | Reject without extraction/decode/publication; preserve Authoritative File |
| P03 | Ordered copy migration and compatibility | every supported predecessor version, current, future, failed step, unknown authoritative extension | `EQ+PROP`; source byte-identical; preserved extension; current output valid; future refused | EP-PURE + EP-PACKAGED / G1+G2 | Package/domain owner; SYN/LOCAL | Schema/migration/extension rule change | Open older as untargeted dirty Save As; refuse future/failed; never in-place/down-save |
| P04 | Package identity/version/role and duplicate-open enforcement | FX-07/13 current/older/future/same-ID different-path cases | `EQ+REL`; one writable owner; exact identity; read-only/Save As paths | EP-PACKAGED / G2 | Lifecycle/package owner; LOCAL | Identity codec/routing/storage change | Read-only/refuse/fork explicitly; no second writer/heuristic bind |
| P05 | Resource bounds, streaming/backpressure/cancel/contention (#42) | FX-14 minimum/typical/large/adversarial and hostile ratios/counts/depth | `PROP+REL`; all #42 limits at below/equal/above boundaries; visible progress/cancel; no exhaustion | EP-PACKAGED + EP-PERF / G2+G3 | Performance/security owner; LOCAL | Limit/hardware/parser/layout/build change | Reject/virtualize/cancel with typed result; no silent pool/limit tuning |
| P06 | IPC/runtime contract threat matrix (ADR 0008; #24 §§3,6,11; #37) | inert wrong-type/extra/stale/replay/cross-tab/child-frame/path/credential/navigation cases | `PROP+REL`; every invalid call rejected; document/file/credential state unchanged | EP-PACKAGED / G2+G3 | Security owner; LOCAL | Electron/preload/contract/fuse/origin change | Reject, rotate capability where required, redact evidence |
| P07 | Dependency/license/SBOM/notices and clean-room asset custody (#24 §14; #28/#43) | exact release lock/binaries/assets/fonts | `EQ+ORG`; graph/hash/licenses/notices/provenance complete; no Esri/Rocscience assets | EP-PACKAGED / G2+G6 | Release/legal owner; APPROVAL | Any dependency/binary/asset/font/license change | No distributable build; blocked asset omitted |

### 6.5 Electron lifecycle, storage, and recovery

| ID | Behavior / trace | Fixture and provenance | Class; oracle/tolerance | Profile / grade | Owner; custody | Invalidate | Fail-closed outcome |
|---|---|---|---|---|---|---|---|
| E01 | Main-owned truth, renderer/Layout Host replacement and stale capability (#24 §3; ADR 0008; #37) | two-document FX-13 plus renderer/host crash injections | `PROP+REL`; dirty/history/file survive; unrelated doc responds; rebind new capability; stale rejected | EP-PACKAGED / G2+G3 | Security/lifecycle owner; LOCAL | Electron/topology/preload/supervisor change | Freeze affected projection/job; restart safely; no authority transfer |
| E02 | Utility success/crash/timeout/cancel/restart and zero orphans (#37) | pure-JS package/scene jobs, deliberate exit/hang/cancel | `PROP+REL`; classified result, no file mutation, sibling doc responsive, zero exact-path children | EP-PACKAGED / G3 | Security/platform owner; LOCAL | Electron/packaging/worker/supervisor change | Discard output; typed failure; capability unavailable until restart |
| E03 | Save revisions, queued latest, cancellation boundary (lifecycle §§4–6) | FX-13 command/fault sequences at every save stage | `EQ+REL`; captured N immutable; N+k dirty; one queued follow-up; phase-specific cancel/result | EP-PURE + EP-STORAGE / G1+G3 | Lifecycle/storage owner; SYN/LOCAL | State machine/storage adapter/timing change | Preserve last verified file/dirty work; conflict or reconciliation, never false success |
| E04 | Save As create/replace/identity/fork/copy/duplicate-open (lifecycle §7) | FX-07/13 absent/existing/changed/different-ID/same-ID targets | `EQ+REL`; one-use consent, inside-authority recheck, identity rules, no silent suffix | EP-PURE + EP-STORAGE / G1+G3 | Lifecycle/storage owner; LOCAL | Package identity/path/storage/command change | No bind/replace; return to collision/conflict review |
| E05 | External Change, Compare, Reload, Replace, missing target (lifecycle §8) | three-way synthetic baselines and all eligible/ineligible target classes | `EQ+REL`; Compare inspection-only; freeze/block; only verified command establishes basis | EP-PURE + EP-STORAGE / G1+G3 | Lifecycle/storage owner; LOCAL | Compare/domain/package/storage change | Preserve conflict/basis/work; publication blocked |
| E06 | Reconciliation old-valid/new-valid/conflict/uncertain (lifecycle §9) | FX-13 transaction artifacts at every replacement cut point | `EQ+REL`; exact identity/revision/digest classification; no timestamp winner | EP-STORAGE / G3 | Lifecycle/storage owner; LOCAL | Transaction/classifier/storage/build change | Protect all related artifacts; freeze; rescue only to distinct verified target |
| E07 | Close/Close All/Quit/Update disposition, cancel isolation and focus (lifecycle §10) | multi-document rows: clean/dirty/untargeted/save/export/conflict/reconciliation | `EQ+HUM+REL`; stable order, serial saves, stop semantics, no partial discard, focus/announcements | EP-PACKAGED + EP-AT / G2+G4 | Lifecycle/accessibility owner; LOCAL | Lifecycle UI/state/AT/Electron change | Cancel whole intent or stop after current; keep all unsafe rows open |
| E08 | Local fixed NTFS durability/fault matrix (#36; ADR 0006) | #36 admitted files/faults: disk full/quota, ACL, AV/EDR, handle, long path, race, reparse, hard reset | `REL`; EP-STORAGE exact old/new/candidate/backup/recovery outcomes | EP-STORAGE / G3 | Storage/endpoint owner; LOCAL | OS/filesystem/adapter/security product/build change | Unsupported/read-only/reconciliation; never widen storage or claim atomicity |
| E09 | Recovery cadence/publication/startup classification (#38 policy; FX-13) | all listed recovery states, clock rollback, multiple generations, corrupt/wrong/future/reparse/foreign-profile | `EQ+REL`; 120/300/120 cadence; full valid candidate; exact classification/order; no auto-open/winner | EP-PURE + EP-STORAGE / G1+G3 | Recovery owner; LOCAL | Recovery/package/storage/policy/build change | Suspend writes/opening; preserve/protect; visible Diagnostic |
| E10 | Recovery retention/pressure/delete/hold/uninstall semantics (#38/#39) | boundary count/age/bytes/free-space and every protected/cleanup/delete-failed/hold state | `EQ+REL+ORG`; exact thresholds/order; no protected deletion; verified absence/tombstone; approvals | EP-PURE + EP-STORAGE + EP-DEPLOY / G1+G3+G6 | Recovery/security/records owner; LOCAL/APPROVAL | Policy/approval/storage/installer/profile change | Refuse new candidate or preserve root; no recursive/best-effort deletion |
| E11 | Session-only credential exclusion and diagnostic redaction (ADR 0004; #32) | inert canaries across package/recovery/recent/clipboard/log/crash/support/export | `EQ+PROP+REL`; zero canary occurrence; restart/sign-out clear; renderer/path denial | EP-PURE + EP-PACKAGED / G1+G2 | Security owner; SYN/LOCAL | Broker/log/crash/package/support sink change | Clear session; reject artifact/support creation; security incident route if leakage |

### 6.6 PDF and publication

| ID | Behavior / trace | Fixture and provenance | Class; oracle/tolerance | Profile / grade | Owner; custody | Invalidate | Fail-closed outcome |
|---|---|---|---|---|---|---|---|
| X01 | Frozen revision, complete preflight and warning/error/suppression gate (product §§11–12.1; AC-011–AC-012; UX §17; lifecycle intact-ETR rule) | FX-06/07/13 warning/error/conflict/reconciliation/missing ETR states | `EQ+PROP`; exact input digest; errors block; acknowledgment/suppression scope/audit exact | EP-PURE + EP-PACKAGED / G1+G2 | Publication/product owner; SYN/LOCAL | Product policy/diagnostic/revision/template state change | Block job or require exact authority; never publish silent issue |
| X02 | Scene-to-PDF physical/text parity (product §12.2; AC-009, AC-013; ADR 0007) | EP-PDF fixture set | `EQ+TOL`; page/line/source/font/order exact; geometry §4.2 | EP-PDF / G2 | Publication/QA owner; LOCAL | Electron/font/CSS/scene/PDF harness change | Reject engine/config capability; no independent reflow/rescale |
| X03 | Vector/selectable text, clips/transparency and admitted images/fonts | FX-01/06/09/10/12 with licensed assets | `PROP+TOL+REL`; text extraction and font inventory exact; graphics preserved; no unexpected raster/path text | EP-PDF / G2 | Publication/asset owner; LOCAL/APPROVAL | Font/asset/Electron/colour/decode change | Block affected asset/profile/output; Diagnostic |
| X04 | Letter/A4/custom and requested page-size/orientation sequence (product §§5.3, 12.2; AC-013) | FX-02/07/13 per supported Template Variant sequence | `EQ+TOL`; page count/order exact; boxes ≤0.01 pt; no normalization | EP-PDF / G2 | Publication owner; LOCAL | Page/CSS/Electron/config change | Capability unavailable; block rather than scale/merge silently |
| X05 | Tagged structure, language, alt text and reading order independent of z-order (product §§12.2, 15; AC-013, AC-019) | semantic fixture with text, decorative and meaningful graphics, reordered z/reading orders | `PROP+HUM+REL`; qualified PDF checker + keyboard/AT reading-order review; no z-order coupling | EP-PDF + EP-AT / G2+G4 | Accessibility/publication owner; LOCAL | Electron/tagging/profile/scene/AT/checker change | Tagged/conformance claim blocked; required publication profile unavailable |
| X06 | Exact destination grant, PDF-only/Publication Bundle commit, collision, fault, cancel and reconciliation (product §§12.3–12.4, S-10; architecture §8.4; AC-013–AC-014; FX-13) | clean PDF-only; required/selected PDF+sidecar; Create New/Replace Existing with neither/only-PDF/only-sidecar/matched-pair/mismatched-pair targets; injected fault/cancel before staging through final reopen | `EQ+PROP+REL`; grant names exact basename/audit mode/derived artifacts; sidecar-first commit; Authoritative File always unchanged; safe cancel/definite pre-commit failure proves prior output intact; every success reopens/cross-verifies all required artifacts; no false/partial success | EP-STORAGE + EP-PDF / G3 | Publication/storage owner; LOCAL | Export grant/adapter/storage/Electron/bundle protocol change | If pair behavior is unqualified, audited publication and Replace Existing are unavailable; after any post-commit/partial-pair uncertainty make no target-state claim, retain evidence, and require reconciliation or a new basename |
| X07 | Canonical Publication Audit and Publication Bundle structure/privacy (product §§11.2, 12.4, 14.2; architecture §8.4; AC-011–AC-016) | FX-07/08/13 clean `none`, clean `selected`, and required cases with warning, Override, Snapshot freshness, ETR warning, suppression and every result class | `EQ+PROP+ORG`; canonical UTF-8 JSON name/schema/payload exact; shared Publication ID and final PDF filename/SHA-256/Candidate digest cross-match; PDF metadata marker exact; clean `none` is PDF-only; no embedded Audit; prohibited content absent | EP-PURE + EP-PDF / G1+G2+G6 | Publication/privacy owner; SYN/LOCAL/APPROVAL | Policy/schema/metadata/role/revision/PDF/bundle protocol change | Block audit-required/selected publication or reject unverifiable output; never emit an overbroad, detached, embedded, or mismatched Audit |

#### 6.6.1 Publication Bundle atomic oracle

X06 and X07 are one coordinated acceptance boundary with separate evidence owners:

1. **Determine audit mode exactly.** `required` applies to every product §12.4 trigger; `selected` is an explicit user choice for an otherwise clean Candidate; `none` is valid only for a clean Candidate. A clean `none` Candidate grants and commits one PDF only, retains a stable Publication ID, does not claim that an Audit is required, and creates no sidecar. It is not a one-file partial Bundle.
2. **Derive the artifact set in main.** One `ExportDestinationGrant` binds the chosen PDF basename, exact audit mode, final PDF path, and—only for `required` or `selected`—the exact same-directory `<pdf-basename>.rsrender-publication-audit.json` path. Neither renderer, Layout Host, candidate content, nor sidecar content may choose or enlarge that set.
3. **Stage and validate before commit.** Main validates the PDF envelope, qualified engine/configuration, byte count/digest, stable Publication ID, and audit-required metadata. For a Bundle it then constructs canonical UTF-8 JSON containing the same Publication ID, final PDF filename, final PDF SHA-256 digest, Candidate digest, and exact Audit payload. Audit embedding in the PDF is a failure.
4. **Commit the Bundle in order.** The destination adapter obtains coordinated authority for the entire derived pair, rechecks all target baselines/collisions inside that authority, commits the sidecar first and PDF second, then reopens every required final artifact. Success requires matching Publication IDs, the reopened PDF digest matching the sidecar, correct final filename/Candidate digest, and verified destination identities.
5. **Exercise every pair state and fault cut.** Create New and Replace Existing tests cover neither artifact, only PDF, only sidecar, a matched pair, a mismatched/cross-publication pair, baseline races, lock/ACL/space/quota/AV interruption, cancel before its last safe boundary, sidecar commit failure, failure between sidecar and PDF, PDF commit failure, reopen failure, cross-match failure, delete failure, crash and unknown outcome. Only safe cancel or definite failure before the qualified commit boundary may assert that prior output remains intact. A sidecar-only or mismatched survivor is never announced as an audited Log Document.
6. **Reconcile, never guess.** Any partial, collided, post-commit-unverified, or unknown pair is `EXPORT_OUTCOME_UNCERTAIN`. After the commit boundary, RSrender makes no claim that the old output, new output, or pair is intact until reconciliation proves it. Evidence retains the exact observed surviving identities/digests and verifies the availability and safety of inspect, remove-safe-artifacts, retry when eligible, and publish-to-new-basename actions. Timestamp, filename similarity, or “PDF opens” cannot establish a Bundle.
7. **Fail closed by qualification.** #26/X07 owns metadata-marker, canonical sidecar, clean-PDF distinction, and structural/cross-reference verification. #36/X06 owns destination-pair grant, collision/fault/commit/reopen/reconciliation evidence. Until X07 passes, no Publication Bundle structural claim is allowed. Until the destination adapter passes X06 under #36, audited publication and Replace Existing remain unavailable on that destination; Create New PDF-only remains available only after its separate exact X06 branch passes.

### 6.7 Performance and resource behavior

| ID | Behavior / trace | Fixture and provenance | Class; oracle/tolerance | Profile / grade | Owner; custody | Invalidate | Fail-closed outcome |
|---|---|---|---|---|---|---|---|
| F01 | Drag/resize/rotate/nudge/select/snap/tree/property/Undo latency and correctness (#30/#41) | FX-14 Typical and Large exact parameters | `REL`; every p50/p95/p99/max/long-task budget and zero correctness loss | EP-PERF / G3 | Performance owner; LOCAL | Hardware/OS/Electron/projection/command/fixture change | Reject tested projection/config; bounded optimization before alternative projection |
| F02 | Text edit measurement/repaint and page projection | FX-06 + FX-14 Typical/Large | `REL`; text p95/p99 and projection deadlines/feedback/cancel exactly as #41 | EP-PERF / G3 | Performance/typography owner; LOCAL | Font/layout/Electron/hardware change | Show progress/cancel or reject envelope; no stale fit |
| F03 | Working set, five documents, teardown/leak | FX-14 Typical/Large and 20 open/edit/close cycles | `REL`; ≤750 MiB, ≤1.5 GiB, ≤3 GiB, retained growth ≤max(5%,50 MiB) | EP-PERF / G3 | Performance owner; LOCAL | Topology/build/hardware/fixture change | Fail release envelope; no budget weakening after run |
| F04 | Background parse/export isolation and cancellation | unrelated Typical interactive document + Large job | `REL`; unrelated p95 remains; cancel acknowledgment ≤250/500 ms | EP-PERF / G3 | Performance/platform owner; LOCAL | Scheduler/worker/layout/export change | Bound/cancel job; keep unrelated document authoritative/responsive |
| F05 | Adversarial resource safety (#42) | FX-14 adversarial plus hostile parser/assets | `PROP+REL`; reject/simplify/virtualize/progress before exhaustion; exact cap boundaries | EP-PERF + EP-PACKAGED / G3 | Security/performance owner; LOCAL | Limit/parser/decoder/hardware/build change | Typed rejection; native capability remains unavailable; no silent limit increase |

### 6.8 Accessibility and internal human acceptance

| ID | Behavior / trace | Fixture and provenance | Class; oracle/tolerance | Profile / grade | Owner; custody | Invalidate | Fail-closed outcome |
|---|---|---|---|---|---|---|---|
| A01 | Keyboard completion of selection/Key Element, tree reorder/reparent, geometry, properties, Diagnostics, Refresh, Save/export/recovery (#23 §§4–19; #34) | FX-07/08/14 realistic bounded task set | `HUM+REL`; every core task completes without pointer/unsupported workaround/critical loss | EP-AT / G4 | Accessibility owner; LOCAL | UI/command/focus/AT/Electron change | Accessibility acceptance blocked; keep complete semantic alternative/fix route |
| A02 | Roles/names/states/tree semantics and command availability | same tasks plus automated semantic snapshots | `PROP+HUM`; exact role/name/level/order/selected/Key/lock/visibility/disabled reason; spoken confirmation | EP-PACKAGED + EP-AT / G2+G4 | Accessibility owner; LOCAL | DOM/ARIA/projection/command change | Reject UI path; no DOM-only conformance claim |
| A03 | Focus restoration, form errors, live announcements and nudge verbosity | lifecycle/Properties/tree/crash/re-render scenarios | `HUM+REL`; focus by stable identity; required messages once; no per-key speech flood | EP-AT / G4 | Accessibility owner; LOCAL | Focus/live-region/dialog/AT change | Task row fails; retain input/state; no destructive default |
| A04 | Contrast Themes, reduced motion, 200% text and 100/125/150/200% display scale | #40 controlled matrix and all common panes/dialogs/canvas handles | `HUM+REL+TOL`; no clipped/unreachable UI; non-colour cues; page geometry unchanged | EP-AT + EP-PERF smoke / G4+G3 | Accessibility/UI owner; LOCAL | CSS/theme/OS/Electron/display change | Affected configuration unsupported/release blocked; never alter template geometry |
| A05 | Internal Production/Advanced Design/reviewer workflows | synthetic IA-01–IA-06 task pack below | `HUM`; 5 participants, zero critical data-loss/source-mutation/publication errors; every task completion recorded | EP-HUMAN / G4 | Product/QA owner; LOCAL | Workflow/product/command/template change | Do not claim internal usability/readiness; fix or explicitly defer capability |
| A06 | PDF accessibility and reading order (product §§12.2, 15; AC-013, AC-019) | X05 PDFs plus reviewer task | `PROP+HUM+REL`; checker target and observed navigation/reading order/alt meaning meet the mandatory tagged/selectable PDF contract | EP-PDF + EP-AT / G2+G4 | Accessibility/publication owner; LOCAL | PDF profile/Electron/font/scene/AT/checker change | Conformance/profile unavailable; no tagged-PDF claim |

### 6.9 Deployment, update, rollback, and organizational authority

| ID | Behavior / trace | Fixture and provenance | Class; oracle/tolerance | Profile / grade | Owner; custody | Invalidate | Fail-closed outcome |
|---|---|---|---|---|---|---|---|
| R01 | Signed install/launch/repair and packaged security assertions (#39/#37) | clean supported Windows VM/endpoint | `REL+ORG`; signature/trust/publisher/channel exact; no policy bypass; files/permissions expected | EP-DEPLOY / G3+G6 | IT/security owner; LOCAL/APPROVAL | Installer/cert/runtime/OS/policy change | No deployment; preserve data; report non-success |
| R02 | Update, compatibility window, interruption, rollback and restart handoff (#39) | supported previous→current and current rollback matrix with clean/dirty/conflict/recovery docs | `REL+ORG`; no file down-save/identity loss; lifecycle review honored; rollback changes app only | EP-DEPLOY / G3+G6 | IT/lifecycle owner; LOCAL/APPROVAL | Version/schema/updater/cert/policy change | Defer/cancel update; no forced unsafe restart or file rewrite |
| R03 | Uninstall and managed recovery disposition (#38/#39) | preserve/delete-after-classification/missing policy, holds, delete failure, foreign root | `REL+ORG`; preserve default; exact classified delete; Authoritative Files/exports untouched | EP-DEPLOY / G3+G6 | IT/security/records owner; LOCAL/APPROVAL | Installer/recovery/policy/profile change | Preserve root and return non-success; never guess delete |
| R04 | Recovery privacy/security/records approval (#38) | exact accepted policy version and implementation evidence inventory | `ORG`; security and privacy/records signatures cover content/caps/encryption/profile/holds/delete/audit/uninstall | approval only / G6 | Named firm owners; APPROVAL | Policy/build/storage/attestation/authority change or approval expiry | Recovery writes/opening disabled as policy requires; preserve existing root |
| R05 | Vendor/source/asset/legal authority (#43/#28) | controlling agreement/permission and exact source/asset/dependency inventory | `ORG`; activity/rights matrix approves only exact read/cache/render/embed/distribute scope | approval only / G6 | Employer/counsel/vendor as required; APPROVAL | Agreement/source/asset/use/commercial scope change | Keep source/asset capability blocked; no external distribution claim |

### 6.10 Restricted local agentic template-recreation go-by

A separately controlled local custody record confirms one supplied client-bearing page for this scenario. This durable document does not identify, locate, hash, describe, or quote the reference. Local custody does not mean local inference: before a Codex session can receive it, the accountable data/privacy owner must approve the exact model/service, account/tenant, data-use/retention settings, people, tools, and evidence capture. If that approval is absent, the real go-by row remains `BLOCKED`; a synthetic surrogate may test the harness but cannot substitute for acceptance.

Exactly the one supplied page is in scope. No second page or sheet may be invented, reconstructed, or claimed. The session starts from a new blank Log Template with no prior project/session memory and must build through the same supported public command/property boundary available to a user.

| ID | Behavior / trace | Fixture and provenance | Class; oracle/tolerance | Profile / grade | Owner; custody | Invalidate | Fail-closed outcome |
|---|---|---|---|---|---|---|---|
| G01 | Restricted input admission and agent/model authority (product §§14.2–14.3, S-12; AC-016, AC-020) | exact restricted custody identity/digest; no value, path, image hash, content, or source identifier copied here | `ORG+EQ`; custody match, access list, client/employer/model-processing approval, no network/source credential | authority then EP-GOBY / G5+G6 | Privacy/data owner; RESTRICTED/APPROVAL | Any file/model/account/tool/setting/authority change | Do not expose/run; synthetic harness only, not acceptance |
| G02 | Blank start and supported-action boundary (product §§9, 14.1, S-12; AC-006–AC-008, AC-020) | new blank Log Template; pinned app/model/system prompt | `EQ+PROP`; audit shows only public RSrender commands/properties through the supported app boundary | EP-GOBY / G5 | QA/security owner; RESTRICTED | App command/API/model/prompt/harness change | Fail on background/reference embedding, package edit, shell/file injection, hidden API, source mutation, or unsupported automation |
| G03 | Semantic structure and editability (product §§9–10, S-12; AC-006–AC-010, AC-020) | human-authored restricted rubric derived under approved custody | `EQ+HUM`; Header/Depth Body/Footer, editable Contents hierarchy/elements/styles, bindings/Example Dataset, depth-aware columns and shared Data Tracks all present and editable through ordinary UI/commands | EP-GOBY / G5 | Template/product reviewer; RESTRICTED | Rubric/reference/product model change | Fail even if a screenshot resembles the reference; no flattened/background output |
| G04 | Data/text coverage and Diagnostics (product §§9.3, 11, S-12; AC-009, AC-011–AC-012, AC-020) | restricted expected inventory and independently synthetic Example Dataset values | `EQ+HUM`; every required label/binding/graphic/data role accounted for; overrun/missing-asset findings resolved explicitly | EP-GOBY / G5 | Template/publication reviewer; RESTRICTED | Reference/rubric/font/asset/product policy change | Fail on omitted, clipped without exact policy, rasterized-as-text, unbound, or silently substituted content |
| G05 | Save editable template and export comparison PDF (product §12, S-12; AC-013–AC-014, AC-020) | generated template/PDF are restricted derivatives and remain under approved custody | `EQ+TOL+HUM`; package validates/reopens/editable; PDF semantic rows X01–X07; registered geometry/visual tolerance §4.2; reviewer rubric | EP-GOBY + EP-PDF / G5 | QA/publication owner; RESTRICTED | App/model/font/Electron/reference/rubric/tolerance change | No acceptance; do not publish/commit derivative; preserve previous artifacts under custody |
| G06 | One-page scope and anti-cheat negatives (product S-12; AC-020) | the one admitted page only | `PROP`; exactly one reconstructed page; no background/reference asset, package-internal edit, unsupported command, or invented sheet 2 | EP-GOBY / G5 | QA/privacy owner; RESTRICTED | Scope/reference/harness change | Immediate failure; delete only under approved retention authority, never ad hoc |

The command journal replay proves that the resulting state follows supported deterministic commands; it does not require an AI session to be deterministic. Public evidence may state only the scenario ID, hashes of already-approved non-content metadata, app/model version class if permitted, pass/fail/blocked disposition, failure categories, and limitations. Prompts, screenshots, reference/generated PDFs, editable derivative, text/value inventories, raw command journal, paths, model transcript, and client identity remain restricted unless separately authorized.

### 6.11 Current row results

This result overlay is part of the matrix. A blocked row may execute a safe negative or harness-calibration subtest, but it cannot become `PASS` until every named mandatory facet is available.

| Current result | Rows | Reason |
|---|---|---|
| `METHOD_NOT_RUN` | D01–D05; S02–S04, S07; L01–L02, L06–L07; P01–P06; E01–E06, E08–E09, E11; X06; F01–F05; A05 | The method is finite, but no qualifying production/release evidence has been executed. P05/P06 and the listed E/F rows remain method-not-pass even where prototypes exist. |
| `BLOCKED` | D06; S01, S05–S06, S08; L03–L05, L08; P07; X01–X05, X07 | The product rules are settled, but the named production Diagnostic/source/command implementations, qualified FontCatalog/assets/PDF/tagging mechanisms, #37 native-decoder containment, #43 rights/source evidence, dependency/asset legal inventory, or required organizational authority is absent. Safe negative invariants remain executable. |
| `BLOCKED` | E07; A01–A04, A06 | #40-controlled environment/authority and subsequent #34 human/AT observations are absent, including the mandatory Close/Quit/update focus facet of E07. |
| `BLOCKED` | E10; R01–R03 | #39 release installer/update/rollback mechanism, recovery deployment/retention authority, and firm IT evidence are absent. |
| `NOT_APPROVED` | R04–R05 | Required firm security/privacy/records and source/asset/legal approvals are not established by this strategy. |
| `BLOCKED` | G01–G06 | The application/command surface is not implemented and the exact client/model-service/custody authority has not been supplied to this strategy. |

### 6.12 Corpus completeness crosswalk

These tables prevent a future final strategy from overlooking a fixture or treating #16's safe negative atom as an open positive pass.

| Corpus edge atom | Acceptance rows |
|---|---|
| EC-SHORT-01 | L01–L02 |
| EC-SHORT-02 | L01–L02 |
| EC-LONG-01 | L01–L02 |
| EC-LONG-02 | L01–L02, D06 |
| EC-SPARSE-01 | L01–L02 |
| EC-SPARSE-02 | S01, L02 |
| EC-DENSE-01 | L02 |
| EC-DENSE-02 | F01–F05 |
| EC-MISS-01 | D02 |
| EC-MISS-02 | S01, S03 |
| EC-MISS-03 | S08, L08 |
| EC-MAL-01 | D02, D06, S04 |
| EC-MAL-02 | D01, D06 |
| EC-MAL-03 | P02, L08 |
| EC-OVRFL-01 | L03–L04 |
| EC-OVRFL-02 | L05 |
| EC-OVRFL-03 | L04 |
| EC-PAGE-01 | L01, L04 |
| EC-PAGE-02 | L01, D06 |
| EC-TMPL-01 | D01, L02, A05 |
| EC-TMPL-02 | P01, X01 |
| EC-REFR-01 | S03, A05 |
| EC-REFR-02 | S02–S03 |
| EC-OVRD-01 | S06, X07 |
| EC-OVRD-02 | S03, S06 |
| EC-OVRD-03 | S06 |
| EC-GW-01 | S08, L06 |
| EC-GW-02 | D02, S08 |
| EC-GW-03 | S08, L06 |
| EC-SPT-01 | S04, S08 |
| EC-SPT-02 | D03, S08 |
| EC-INT-01 | S08, L02 |
| EC-INT-02 | S01, S08 |
| EC-LAB-01 | S05 |
| EC-LAB-02 | S05 |
| EC-LAB-03 | L06 |
| EC-COMM-01 | L03–L04 |
| EC-SAVE-01 | E03, E08 |
| EC-EXPORT-01 | X01–X02, X06–X07 |

| Fixture family | Acceptance rows |
|---|---|
| FX-01 | D01, S01, L02, P01, X02–X03 |
| FX-02 | L01–L02, L04, X04 |
| FX-03 | L02, F01–F05 |
| FX-04 | D02, S01, S04, L02 |
| FX-05 | D01–D02, D06, S06, P02 |
| FX-06 | L03–L05, X01–X03 |
| FX-07 | D01, P01, P04, X01, A05 |
| FX-08A/B | S01, S03, S06–S07, X07, A05 |
| FX-09 | D02, S08, L06, X02–X03 |
| FX-10 | S04, S08, L06, X02–X03 |
| FX-11 | S01, S08, L02 |
| FX-12 | S05, L06, X02–X03 |
| FX-13 | E03–E10, X01–X07 |
| FX-14 | D04–D05, P05, F01–F05, A01–A05 |

Cross-cutting OA-ID-001, OA-COL-001, OA-VAL-001, OA-PROV-001, OA-DIAG-001, OA-ASSET-001, OA-GOLD-001, OA-REP-001, and OA-SEP-001 are exercised respectively by D01; S01; D02; D03; D06; L08; every evidence manifest; every FX result label; and E03/X06. Their negative oracles remain mandatory even where the positive row is blocked.

## 7. Internal controlled task pack

These tasks feed A05 and overlap AT tasks without replacing them:

| Task | Role route | Required observable | Critical failure |
|---|---|---|---|
| IA-01 | Template author | From blank template create variants, regions/columns, hierarchy/styles/bindings, guides/snaps, overflow policy, Example Dataset; save/reopen/edit | Flattened or uneditable output; hidden overflow; failed save presented as success |
| IA-02 | Production author | New project, deliberate Refresh candidate review/accept, group Explorations, assign shared ETRs, inspect generated pages offline | Automatic Refresh, wrong assignment precedence, source/provenance loss |
| IA-03 | Production author | Add Display Value Override and Freeform Annotation; Refresh changed/deleted target; resolve without source mutation | Source changed, automatic retarget, conflict hidden |
| IA-04 | Reviewer/issuer | Inspect Diagnostics/source-vs-display, warning acknowledgment/suppression, page ranges, PDF preflight and Audit mode; publish a verified PDF-only result or Publication Bundle to a chosen basename | Error bypass, unauthorized action, detached/mismatched Audit, misleading/partial pair, or unverified output |
| IA-05 | Any author | External Change and Save As/Compare/Reload/Replace paths; Close All with multiple dirty/active rows | Compare changes basis, unsafe overwrite, partial discard/quit, lost work |
| IA-06 | Any author/reviewer | Discover Recovery Candidates, compare, Open Separately, save separate branch, discard/delete-failure flow | Automatic overwrite/winner, protected deletion, row disappears on failure |

Tasks use admitted synthetic fixtures. They do not claim frequency, representativeness, firm policy approval, or accessibility merely because participants complete them.

## 8. Evidence custody, retention, and invalidation

### 8.1 Evidence manifest

Every executed row creates an immutable manifest containing:

- matrix row ID and revision; exact product-specification section and AC IDs;
- fixture/corpus/oracle IDs and digests, provenance/admission/rights state;
- application binary, dependency lock, SBOM, harness, schema, migration, command contract, scene engine, Electron/Chromium/Node, font and asset digests;
- sanitized OS/hardware/storage/display/AT/environment profile without username, hostname, serial, internal path, tenant, or network details;
- start/end UTC, repetitions, warmups, seeds, injected faults, exclusions and their predeclared validity rule;
- raw and normalized artifact digests, comparison method/version/tolerance, result per repetition, aggregate result, and every failure;
- evidence grade, executor/observer role category, acceptance owner, approval/consent reference, privacy class, raw location, retention/deletion rule; and
- explicit nonclaims and rerun triggers.

The manifest signs or hashes the evidence inventory; it does not make unsafe/prohibited content safe.

### 8.2 What may be committed

Repository-safe after independent review:

- admitted canonical synthetic fixtures and expected semantic goldens under #16;
- sanitized test code/harnesses with no client data, secrets, internal paths, security configuration, or proprietary assets;
- normalized synthetic results, dependency/version hashes, and privacy-safe aggregate performance/accessibility status; and
- sanitized approval dispositions and limitations when the authority permits publication.

Remain controlled local or restricted:

- raw performance/ETW/crash/storage traces, unrestricted logs/dumps, speech recordings/transcripts, participant notes, security configuration, signing artifacts, and internal endpoint details;
- any RSLog credential, token, raw production response, tenant/client/project identity, source path, or production data;
- recovery payloads and contents;
- the local go-by manifest, references, screenshots, prompts/transcripts, command journal, editable recreation, comparison PDF, rubrics containing client text/geometry, and all derivatives; and
- contracts/approvals whose owners prohibit publication.

Raw performance traces follow the approved #41 30-day rule after sanitized synthesis. Recovery evidence follows the exact #38 authority. Human/AT/go-by/storage/deployment evidence uses its separately approved retention schedule; this strategy does not invent one. Lack of an approved retention/deletion rule blocks collection.

### 8.3 Invalidation rules

All affected rows rerun after any change to:

- normative product behavior, accepted requirement/tolerance/policy, command/runtime schema, package/domain/source/scene/PDF codec, migration, or Diagnostic catalog;
- Electron/Chromium/Node, zip.js, compiler/runtime dependency, build flags/fuses/CSP/origin, OS security build family, storage adapter, installer/updater, font bytes, asset/decoder, PDF checker, AT version, display/contrast/text configuration, or minimum endpoint;
- fixture/oracle/generator/admission/right/provenance or harness/normalizer/tolerance; or
- organizational approval scope, agreement, client/employer permission, model/service/account data setting, retention policy, signing certificate, deployment policy, or evidence-custody failure.

Narrow implementation changes may use an evidence-impact declaration, but “no expected effect” cannot preserve a pass without tests proving the changed component is outside the row's dependency graph. A security, privacy, provenance, or custody breach invalidates every dependent row and triggers the authorized incident process; it does not grant deletion authority.

## 9. Open-gate closure map

Every required live gate has a finite method and explicit failure consequence. Current status is method-not-pass.

The gate-level **aggregate** below is a readiness summary, never a replacement for §6.11 row results. `NOT_APPROVED` is aggregate when a required organizational disposition is absent; otherwise any `BLOCKED` row makes the gate `BLOCKED`; otherwise unexecuted rows make it `METHOD_NOT_RUN`. The parenthetical row-level states remain authoritative and prevent a blocked facet from being hidden behind an unrun technical method.

| Gate | Finite rows/method | Current result | Release effect if absent/failing |
|---|---|---|---|
| #30 | F01–F04, L07, A04 under EP-PERF | `BLOCKED` aggregate (`METHOD_NOT_RUN`: F01–F04, L07; `BLOCKED`: A04) | Reject tested DOM/SVG configuration; no performance claim |
| #34 | A01–A04, E07 under EP-AT after #40 | `BLOCKED` by #40/environment/human evidence | No keyboard/screen-reader/accessibility acceptance |
| #36 | E03–E10 and X06 under EP-STORAGE | `BLOCKED` aggregate (`METHOD_NOT_RUN`: E03–E06, E08–E09, X06; `BLOCKED`: E07, E10) | No authoritative write/recovery durability or Publication Bundle pair-commit claim; affected write capability unreleased |
| #37 | P06, E01–E02, E09/E11, L08 under EP-PACKAGED | `BLOCKED` aggregate (`METHOD_NOT_RUN`: P06, E01–E02, E09, E11; `BLOCKED`: L08) | No packaged topology/crash-rebind pass; hostile native decode unavailable |
| #38 | E09–E10, R03–R04 with G6 approvals | `NOT_APPROVED` aggregate (`METHOD_NOT_RUN`: E09; `BLOCKED`: E10, R03; `NOT_APPROVED`: R04) | Recovery disabled/preserved according to fail-closed policy; no retention approval claim |
| #39 | E07, E10, R01–R03 under EP-DEPLOY | `BLOCKED` (E07, E10, R01–R03) | No signed deployment/update/rollback/uninstall release path |
| #40 | EP-AT environment/consent/capture qualification, then A01–A04/A06 | `BLOCKED` until environment authority is complete | Automated DOM evidence only; no observed AT claim |
| #42 | P05, F04–F05, E02, X06 at all resource boundaries | `METHOD_NOT_RUN` | Parser/layout/PDF jobs remain limited/unreleased at unproved envelopes |
| #43 | S08, L08, P07, R05 | `NOT_APPROVED` aggregate (`BLOCKED`: S08, L08, P07; `NOT_APPROVED`: R05) | Keep typed blocked/inert/neutral outcomes; no guessed mapping/right |

Within #26 itself, X07 owns the PDF metadata marker, canonical JSON sidecar, clean PDF-only distinction, Publication ID/PDF-digest cross-match, and Bundle structural/privacy result. X06 supplies the finite interface to #36 for destination grant, pair collision/fault/commit/reopen/reconciliation mechanics. Neither row may borrow a pass from the other.

The product-specification prerequisite is complete. This removes the traceability placeholder but does not change any evidence result: every row remains `METHOD_NOT_RUN`, `BLOCKED`, or `NOT_APPROVED` as shown in §6.11.

## 10. Strategy completeness and eventual acceptance exit criteria

This durable strategy is structurally complete. A release acceptance claim is ready only when:

- every AC-001–AC-020 requirement and applicable product invariant maps to at least one positive oracle and one relevant negative/fault oracle;
- all 39 `EC-*`, OA-* cross-cutting atoms, and FX-01–FX-14 revisions map to matrix rows with their correct evidence layer;
- exact equality, property, tolerance, controlled human, release-environment, and organizational evidence remain separately reported;
- each row includes fixture/provenance, environment/version, repetitions, grade, owner, custody/retention, result, invalidation, and fail-closed action;
- every open gate above remains method-not-pass until qualifying evidence lands;
- the local go-by has explicit model-service/client-data authority, one-page scope, command-only anti-cheat proof, semantic/editability/data coverage, physical/PDF tolerance, and restricted derivative custody;
- no production source response, credential, client artifact, participant evidence, proprietary asset, or unrestricted path enters the public repository/GitHub; and
- failures remain visible and reject the affected capability/build rather than causing post-result tolerance, budget, support-matrix, warning, or retention changes.

This strategy makes no pass, conformance, durability, accessibility, security, privacy, deployment, licensing, source-access, or commercial-readiness claim.
