# Internal boring-log workflow and representative edge cases

**Wayfinder ticket:** #10  
**Research date:** 2026-08-13  
**Status:** Local-evidence phase complete; representative-interview validation remains open  
**Scope:** Provisional internal workflow, workload hypotheses, sanitized fixture requirements, and edge-case inventory. No application implementation and no claim that an interview occurred.

## Executive result

The available evidence supports a provisional end-to-end workflow with two related but distinct authoring loops:

1. a template maintainer designs and validates an offline-capable `Log Template` using an embedded `Example Dataset`; and
2. an engineer creates a `Log Project`, deliberately acquires and accepts a `Source Snapshot`, assigns templates at Log Set/group/Exploration scope, reviews `Diagnostic`s and project-local `Presentation Override`s, then exports an immutable `Log Document` and optionally a `Publication Audit`.

The same person may perform both loops. The repository has no evidence that the proposed actor labels correspond to formal job titles or access roles at the firm.

The known deployment population is approximately 30 people. Nothing in the available evidence establishes simultaneous-use levels, typical Exploration counts, common depths, page counts, data density, template-library size, export volume, review practice, or latency expectations. The workload bands in this report are therefore **test-envelope hypotheses**, not observations or acceptance thresholds.

The highest-risk workflow boundary is `Refresh`. A new Source Snapshot must be staged, compared, and deliberately accepted; `success`, `empty`, and `failed` must remain distinct. The prior accepted snapshot remains usable if a required collection fails. Project-local corrections remain visible `Presentation Override`s and do not mutate or impersonate `Source Data`.

Ticket #10 cannot be fully closed as “representative internal workflow research” without actual engineers and template maintainers. It can be closed only as a **provisional evidence model and interview plan** until representative interviews, anonymized workload measurements, and approved synthetic reproductions validate or revise it.

## Evidence boundary and confidence labels

This report uses only:

- the user-provided RSrender Wayfinder brief and grilling answers associated with ticket #10;
- the repository domain language in [`CONTEXT.md`](../../../CONTEXT.md);
- existing RSrender planning research dated 2026-08-13; and
- sanitized, read-only RSAgent documentation and value-free fixture procedures already identified by the RSLog contract research.

No person was contacted. No interview, usability session, workplace observation, credential search, live API call, customer-data inspection, or vendor-product inspection was performed for this ticket. Statements about intended behavior are not evidence of current employee behavior.

Labels used below:

- **[D] Decided** — stated requirement or accepted repository domain rule.
- **[E] Evidenced** — supported by a named local research artifact or value-free RSAgent procedure.
- **[H] Hypothesis** — plausible workflow or workload assumption to validate, not an observed fact.
- **[Q] Open** — requires a person, policy owner, approved measurement, or separate prerequisite ticket.

### Local evidence register

| Code | Evidence | What it supports | What it does not support |
|---|---|---|---|
| BRIEF | User-provided Wayfinder brief and grilling answers for RSrender | Standalone desktop deployment; about 30 internal users; read-only RSLog integration; direct layout editing; live fields; deliberate Refresh; offline template work; template assignment scopes; local display corrections; reference depth per page; PDF export; warning/suppression direction | Actual firm workflow, frequency, roles, volumes, pain severity, or adoption behavior |
| DM | [`CONTEXT.md:3-132`](../../../CONTEXT.md#language) | Ubiquitous language and separation among source, project, template, publication, override, diagnostics, page, and graph concepts | Runtime architecture or observed employee behavior |
| RC | [RSLog read-contract public handoff](rslog-read-contract-rsagent-evidence.md#proposed-source-adapter-contract) | Read contract, provenance, atomic Refresh, three-state collection results, and domain-specific data uncertainties | A complete supported vendor contract or a representative customer dataset |
| LAB | [Laboratory access options](rslog-laboratory-index-test-access.md#adapter-options) | MVP recommendation for a validated `Supplemental Source` and unresolved public/API laboratory access | Actual lab-file frequency, user willingness, or final production source |
| PKG | [`project-template-package-migration-strategy.md:39-48`](project-template-package-migration-strategy.md#product-boundaries-that-the-package-must-preserve), [`:431-444`](project-template-package-migration-strategy.md#missing-current-templates-and-cached-working-representation) | Self-contained effective template state, deliberate Refresh, source/override separation, and no automatic output/template history | Final file container or observed storage practices |
| RSP | Restricted local evidence summary; underlying location is outside the public tree pending publication disposition | Sanitized reference-case procedure, exact parent/child identity, raw-wire provenance, null/absent discipline, lookups, and completeness checks | A firm workflow interview or production values; this row is not a transferable evidence package |
| RSE | Restricted local evidence summary; underlying location is outside the public tree pending publication disposition | SPT custom-column evidence; separate groundwater fields; styled descriptions; interim list/detail behavior | Frequency or severity of those cases in firm work; implementation use requires an approved sanitized handoff |

## Known product decisions that constrain the workflow

1. **[D] Read-only source boundary.** `Source Data` is retrieved through a read-only `Source Adapter`. RSrender can present, validate, and locally override display, but it does not correct RSLog (`CONTEXT.md:35-45,67-73`).
2. **[D] Stateful working document.** A `Log Project` contains selected Explorations, `Template Assignment`s, `Presentation Override`s, and a retained `Source Snapshot` (`CONTEXT.md:11-12`).
3. **[D] Deliberate Refresh.** Refresh is user-initiated comparison and accepted replacement; opening a project is not a refresh (`CONTEXT.md:55-61`; PKG `:46`).
4. **[D] Offline template design.** A `Log Template` carries an `Example Dataset`, while a `Log Project` carries the Embedded Template Representation and Source Snapshot needed for offline work (`CONTEXT.md:7-8,51-56`; PKG `:431-444`).
5. **[D] Scoped template assignment.** A Log Set, a group of Explorations, or one Exploration can receive a template; more-specific assignment wins (`CONTEXT.md:27-28,63-65`).
6. **[D] Local correction semantics.** A `Display Value Override` preserves the original field for comparison and refresh-conflict review. A `Freeform Annotation` adds project-local content without replacing a field (`CONTEXT.md:67-77`).
7. **[D] Non-silent integrity findings.** Errors block export. Warnings require acknowledgment unless a narrowly scoped suppression is recorded (`CONTEXT.md:91-93`).
8. **[D] Page-depth control.** Every page has a `Reference Depth Range`; first, continuation, and last compositions may be different `Template Variant`s (`CONTEXT.md:79-97`).
9. **[D] Shared graph semantics.** A `Data Track` owns shared depth geometry, axes, and ordered `Data Layer`s such as N-values, moisture, PL, and LL (`CONTEXT.md:119-125`).
10. **[D] Publication boundary.** A `Log Document` is an immutable export. The product does not automatically retain all prior generated figures or all historical template revisions (`CONTEXT.md:15-20`; PKG `:299-301,431-444`).

## Provisional jobs to be done

These are hypotheses about jobs, not quotes or interview findings.

| ID | Provisional job | Trigger | Desired outcome | Primary artifacts | Evidence/confidence |
|---|---|---|---|---|---|
| JTBD-01 | Design or revise a reusable boring-log composition without needing live RSLog access | A new client/discipline/office format or a defect in an existing template | A validated, saved `Log Template` whose dynamic content, page variants, and edge cases can be inspected offline | Log Template, Example Dataset, Diagnostic list | [D] offline template and live-bound-content requirements; task frequency [Q] |
| JTBD-02 | Start a deliverable from selected source explorations | A project needs one or more professional Boring Logs | A `Log Project` with unambiguous Project/Exploration identity and an accepted Source Snapshot | Log Project, Source Snapshot, Render Dataset | [D][E] DM and RC; exact selection workflow [Q] |
| JTBD-03 | Apply the right layout to a heterogeneous Log Set | Soil/rock, office/client, or exploration-specific presentation differs | Effective template is predictable at Log Set, group, and Exploration scopes | Template Assignments, Embedded Template Representations | [D]; real grouping rules [Q] |
| JTBD-04 | Make presentation-only corrections without corrupting source truth | A displayed source value is unsuitable or incorrect for this publication | A visible, auditable `Display Value Override` or `Freeform Annotation`, with original value retained | Presentation Override, source/override comparison, Publication Audit | [D]; approval practice [Q] |
| JTBD-05 | Fit depth-bound and freeform content into defensible pages | Long descriptions, dense intervals, or page-depth decisions create conflict | No hidden content loss; page ranges, overflow policy, and diagnostics are explicit | Reference Depth Ranges, Template Variants, Diagnostics | [D]; preferred policies by content type [Q] |
| JTBD-06 | Review a changed source snapshot without losing local intent | The user deliberately requests newer RSLog data | A staged diff that distinguishes additions, changes, deletions, failures, and override conflicts before acceptance | Refresh candidate, current Source Snapshot, comparison, conflict state | [D][E]; tolerable review volume [Q] |
| JTBD-07 | Review and publish a consistent Log Set | Deliverable is ready for QA or issue | A deterministic PDF at the chosen path/page size, with blocking errors resolved and eligible warnings acknowledged/suppressed | Log Document, optional Publication Audit | [D]; sign-off and naming conventions [Q] |
| JTBD-08 | Recover work safely after interruption | Crash, power loss, forced update, or accidental close | User can inspect and recover a newer divergent candidate without silently overwriting the durable file | durable Log Project/Template, recovery candidate | [D] commercial document lifecycle; retention policy [Q] |
| JTBD-09 | Diagnose a source or rendering anomaly without exposing client data | Import/Refresh/render/export does not behave as expected | A stable Diagnostic and redacted support artifact identify the failing entity, source state, and remedy | Diagnostic, sanitized support inventory | [E] RC and PKG; support ownership [Q] |

## Provisional actors, tasks, and artifacts

Actor names are working lenses. They are not assumed job titles, security roles, or separate people.

| Provisional actor | Core tasks | Reads | Creates/changes | Decisions needing authority | Open validation |
|---|---|---|---|---|---|
| Project engineer / log author | Select Explorations; request Refresh; assign templates; inspect pages; add Presentation Overrides; export | Source Snapshot, Render Dataset, templates, Diagnostics | Log Project, assignments, overrides, export settings, Log Document | Accept source replacement; acknowledge/suppress eligible warnings; publish | Who performs these tasks now? Can authors publish without review? |
| Template maintainer | Build page regions/columns/tracks; bind dynamic values; style elements; create Example Dataset; test overflow and pagination; save template or variant | Example Dataset, style/component library, diagnostics | Log Template, Template Variants, Named Styles, Template Components | Promote/replace shared template; approve fonts/assets | Is this centralized, project-local, or ad hoc? How many maintainers? |
| Reviewer / checker | Compare source and displayed values; inspect overrides, page boundaries, omissions, diagnostics, and final PDF | Log Project, source/override comparison, Publication Audit, PDF | Review findings; possibly acknowledgments if authorized | Approve issue; decide whether override evidence is sufficient | Does formal independent checking exist? What constitutes sign-off? |
| RSLog/data steward | Maintain Source Data outside RSrender; clarify identity/permissions; prepare approved lab exchange if used | RSLog records and access administration | No RSrender source mutation; may supply Supplemental Source through approved workflow | Correct source in RSLog; grant read access; validate lab extract | Does this role exist? Who resolves source defects? |
| IT/support | Deploy desktop app; manage updates, recovery location, fonts, paths, logs, and redacted support bundles | Version/support inventory and diagnostics | Installation/update/recovery state, not document content | Approved deployment channel, retention, network/storage support | Is deployment centralized? Are network/sync paths normal? |
| Product/template owner | Set policy for default templates, warning suppression, compatibility, and release readiness | Research evidence, prototypes, interview results | Product decisions and acceptance criteria | Decide policies that individual users must not invent | Who holds this authority internally? |

## Provisional end-to-end workflow scenarios

### WF-01 — Create and validate a Log Template offline

1. The maintainer creates or opens a `Log Template`.
2. The editor uses its embedded `Example Dataset`; it does not contact RSLog merely by opening.
3. The maintainer edits Header, Depth Body, Footer, Log Columns, graphic/text elements, Data Tracks/Layers, styles, and Template Variants.
4. Dynamic content renders live against example values, including deliberately long, missing, Unicode, numeric, and repeated content.
5. The maintainer resolves or explicitly configures overflow, page-break, clipping, shrink, or continuation behavior; hidden truncation is invalid.
6. The maintainer validates first/continuation/last pages and several Reference Depth Ranges.
7. Save updates the template only when explicitly invoked; Save As Separate Template creates a new template identity and reassigns only the deliberately selected assignment scope.

**Failure scenarios:** missing/restricted font, missing hatch/image, invalid binding, cyclic component, impossible page range, unsatisfied required Example Dataset coverage, save conflict, or format migration failure. Each requires a non-silent outcome.

### WF-02 — Create a Log Project and acquire source data

1. The engineer creates a project or opens an existing project.
2. The engineer authenticates only when choosing a source action; credentials/tokens never enter document artifacts.
3. Project and Exploration selection uses stable IDs plus human-readable context to prevent same-name confusion.
4. The Source Adapter retrieves and validates the required collection manifest and stages a source-only Source Snapshot Candidate plus its diff/review projection. RSrender continues rendering from the accepted Source Snapshot; it never derives a Render Dataset from the unaccepted Candidate.
5. Every collection is classified `success`, `empty`, or `failed`. A required failure prevents candidate acceptance.
6. The user reviews summary identity, time, scope, warnings, and differences, then accepts or cancels.
7. Acceptance atomically replaces the Source Snapshot and only then permits derivation of a new Render Dataset. Cancellation or failure leaves the prior snapshot and its Render Dataset basis usable and visibly stale.

**Failure scenarios:** 2FA challenge/cancel, expired session mid-refresh, forbidden child collection, decode/schema error, inconsistent parent ID, deleted Exploration, unresolved lookup, partial collection, throttling, offline state, or source contract change.

### WF-03 — Assign templates across a heterogeneous Log Set

1. A broad Template Assignment establishes the Log Set default.
2. Optional group assignments override the default for defined groups.
3. Optional Exploration assignments override both.
4. The UI shows both the stored assignment and effective template for every Exploration.
5. Reordering Explorations or changing group membership recomputes effective assignment without changing the Source Snapshot.
6. Missing or changed library templates use the exact Embedded Template Representation and raise a visible Diagnostic; substitution by display name is forbidden.

**Failure scenarios:** Exploration belongs to no group or multiple groups under an ambiguous rule, assignment points to missing template ID, same ID/different content digest, deleted template, or a group reorder changes effective assignment unexpectedly.

### WF-04 — Review, override, and paginate one Boring Log

1. The engineer opens an Exploration-specific Boring Log rendered from the current Render Dataset using its effective Embedded Template Representation.
2. The user sees dynamic content live, including overflow and data-integrity Diagnostics.
3. A suspect displayed value can receive a `Display Value Override`; the original remains inspectable and the editor visibly distinguishes the override.
4. Project-specific explanatory content is a `Freeform Annotation`, not a disguised source field.
5. The user adjusts per-page Reference Depth Ranges and uses Template Variants as applicable.
6. Depth-bound intervals that cross pages are clipped/continued by the explicit element policy; data is neither duplicated nor dropped.
7. Diagnostics update live as content, geometry, font, visibility, and pagination change.

**Failure scenarios:** override target deleted/changed after Refresh, duplicated depth, gap/overlap, negative/reversed interval, text that cannot fit under policy, value outside graph axis, hidden required content, or page range gap/overlap.

### WF-05 — Refresh an edited project

1. The project remains renderable from its current accepted inputs and derived Render Dataset while a candidate Refresh runs.
2. The comparison separates created, changed, deleted, unchanged, failed, and unknown records by stable identity and provenance.
3. Presentation Overrides are evaluated against their original target/value. Unaffected overrides remain; conflicts require explicit resolution.
4. Template assignments and page layout remain project state and are not overwritten by source data.
5. The user accepts the complete candidate or keeps the prior snapshot. No collection-level merge is silently inferred unless later specified.

**Failure scenarios:** same display name/new ID, same ID/changed type, null-to-absent change, deleted overridden source field, changed depth moving an annotation context, partial optional data, refresh interrupted after download, or Supplemental Source freshness differing from primary source freshness.

### WF-06 — QA and export a Log Set

1. The reviewer inspects all blocking errors and acknowledged/suppressed warnings at Log Set and Exploration scope.
2. Review includes page count, Reference Depth Range continuity, template assignment, source freshness, override inventory, missing fonts/assets, graph-axis compatibility, and reading order.
3. The user chooses PDF page size/output path and initiates export.
4. Export renders from one immutable in-memory revision so a concurrent edit or late refresh cannot produce a mixed document.
5. Failure leaves no apparently valid partial output at the selected final path.
6. On success, the app produces the `Log Document` and, if selected/policy-required, a `Publication Audit`.

**Failure scenarios:** path unavailable, permission denied, disk full, file locked, unsupported font embedding, output changed externally, renderer crash, canceled export, or a warning becoming an error during final pagination.

### WF-07 — Reopen and recover

1. Opening a saved project/template is side-effect free and uses embedded working data.
2. Newer/divergent recovery candidates are offered for inspection rather than silently replacing the durable file.
3. The user can open recovery as a separate document, compare, Save As, discard according to policy, or return to the durable version.
4. Recent-files entries that moved, were deleted, or are inaccessible produce actionable state rather than blocking startup.

## Provisional 30-user workload envelope

Only the approximate 30-person internal population is a decided fact. The bands below are **parameterized prototype and test inputs** chosen to expose nonlinear behavior. They do not claim that the firm has these volumes. Replace them with anonymized measured percentiles before setting performance acceptance criteria.

| Dimension | Known | Provisional screening bands [H] | Why test it | Evidence needed to replace hypothesis |
|---|---|---|---|---|
| Potential user population | Approximately 30 people [D] | 1, 8, and 30 simultaneously active desktop processes | Update/auth storms, shared template access, support load | Anonymous peak concurrent sessions over a normal and deadline week |
| Active document windows per process | Unknown | 1, 3, 10 | Memory, dirty-state warnings, shared-file conflicts | Interview plus opt-in anonymized local telemetry or task diary |
| Explorations per Log Project | Unknown | 1, 10, 50, 200 | Tree scale, refresh batching, template assignment, export duration | Counts from a redacted sample of representative projects |
| Pages per Exploration | Unknown | 1, 5, 25 | Pagination, navigation, thumbnails, PDF generation | Page-count distribution from approved historical PDFs, metadata only |
| Total pages per Log Set | Unknown | 1, 100, 1,000 | Cancellation, progress, memory, failure recovery | Redacted project/export metadata and largest known deliverable |
| Depth-bound records per Exploration | Unknown | 0, 50, 500, 5,000 | Layout density, validation, interval indexing | Sanitized entity counts for strata, samples, tests, comments, water, interims |
| Live layout elements per page | Unknown | 25, 250, 2,000 | Hit testing, tree performance, selection, repaint | Synthetic templates approximating approved real complexity |
| Template library size | Unknown | 1, 25, 250 | Search, naming, migration, duplicate/missing IDs | Inventory of template names/variants without client content |
| Refresh concurrency per app | Unknown | 1 Exploration serial; bounded batches of 4 and 10 | Rate-limit, partial failure, cancellation, token expiry | Authorized prototype measurement and vendor-supported limits |
| Source payload/package size | Unknown | Small, large, and limit-exceeding generated fixtures; numeric thresholds deferred | Memory, open/save, recovery, parser limits | Sanitized size percentiles and storage-policy review |
| Export frequency | Unknown | Single export, repeated revision cycle, and 10 queued manual exports | File conflicts, stale revision, support expectations | Interview/task diary; no background service is assumed |
| Storage target | Unknown | Local NTFS, approved sync folder, approved network path if actually used | Atomic save, lock, recovery, path latency | Firm storage interview and fault tests on real approved classes |

### Workload interpretation rules

- A 30-person population does not imply 30 simultaneous refreshes or exports.
- The desktop deployment avoids a central RSrender render-service capacity problem in MVP, but RSLog, shared storage, update distribution, and shared template files still have concurrency effects.
- “Large” must ultimately be defined from observed 95th percentile plus explicit headroom and a separately tested hard limit. The table's high bands are discovery stimuli, not promises.
- Performance must be measured independently for open, first editable render, page navigation, canvas manipulation, Refresh, save, recovery scan, and PDF export. One aggregate “load time” hides user-visible stalls.
- Every long operation needs progress and cancellation tests even before its acceptable duration is known.

## Atomic edge-case and expected-behavior matrix

The matrix defines fixture obligations and provisional product invariants. Where final policy is unresolved, the expected behavior is to preserve data and emit a `Diagnostic`, not silently choose.

| ID | Case / sanitized fixture | Expected behavior | Required Diagnostic or proof | Confidence / open point |
|---|---|---|---|---|
| EC-SHORT-01 | Exploration depth fits well within one page | One Boring Log page; unused Depth Body remains intentional | No false overflow; range shown exactly | [H] preferred unused-space treatment [Q] |
| EC-SHORT-02 | Content lands exactly on a page/range boundary | Stable single ownership of boundary records | Golden proof of no double-paint or drop | [D] deterministic integrity; boundary convention [Q] |
| EC-LONG-01 | Long Exploration requiring many continuation pages | First/continuation/last variants and ordered contiguous ranges | No range gaps/overlaps; page count stable | [D] multi-page support |
| EC-LONG-02 | User gives different Reference Depth Ranges per page | Honor explicit ranges; validate monotonic coverage independently of equal scale | Error for invalid/reversed range; warning or error for gaps/overlaps per later policy | [D] per-page scale; severity [Q] |
| EC-SPARSE-01 | Deep Exploration with few records and large empty depth spans | Preserve true depth geometry; do not compress silently | Any intentional discontinuity/break visibly encoded | [D] source fidelity; depth-break design [Q] |
| EC-SPARSE-02 | Valid `empty` child collections | Render explicit empty state or blank according to template; do not claim failure | Refresh completeness records `empty` | [E] RC `:110-122` |
| EC-DENSE-01 | Many coincident strata boundaries, samples, SPT, comments, water, interims, and graph points | Apply explicit stacking/collision/overflow rules; never silently omit | Warnings identify affected entity/element and remedy | [D]; exact collision priorities [Q] |
| EC-DENSE-02 | Thousands of tree elements and deeply nested groups | Responsive navigation, incremental rendering, stable selection/lock/visibility | Performance result and no state loss | [H] scale; target latency [Q] |
| EC-MISS-01 | Field absent, explicit `null`, empty string, numeric zero, and empty array variants | Preserve distinctions through Source Snapshot and Render Dataset | Binding can distinguish states or reports unsupported distinction | [E] RSP and RC |
| EC-MISS-02 | Required collection `failed` while sibling collection is `empty` | Reject candidate Refresh; retain prior snapshot | Non-suppressible incomplete-refresh error names exact collection/surface | [E] RC `:110-124` |
| EC-MISS-03 | Unresolved lookup ID or missing hatch asset | Preserve ID; use neutral explicit fallback only if allowed | Visible unresolved-lookup/hatch-unavailable warning | [E] RC `:218-229` |
| EC-MAL-01 | Reversed/negative interval, `from > to`, depth beyond Exploration, NaN-like text | Preserve raw source; do not repair silently; isolate invalid geometry | Entity-scoped data-integrity error/warning and renderer consequence | [D]; severity per field [Q] |
| EC-MAL-02 | Overlapping strata, gaps, duplicated stable IDs, orphaned child, wrong parent | Do not invent relationship; candidate validity follows required/optional policy | Relationship/coverage Diagnostic with IDs and provenance | [E] RSP completeness rules |
| EC-MAL-03 | Malformed structured classification JSON, unsafe/malformed styled text, unknown extension | Retain inert raw representation/hash; bounded parser fails safely | Parse/sanitization Diagnostic; no script/network behavior | [E] RC `:265-268`; rendering subset [Q] |
| EC-OVRFL-01 | Long prose, long unbroken token, Unicode, combining marks, right-to-left text, mixed styles | Use one measured layout authority and configured overflow policy | Non-silent overflow with affected element/page/source field | [D]; required language corpus [Q] |
| EC-OVRFL-02 | Font missing/substituted or metric changes after reopen | Do not silently accept changed pagination; preserve requested identity | Missing/substituted-font Diagnostic and revalidation | [E] PKG `:227-236` |
| EC-OVRFL-03 | `shrink` reaches minimum size and still does not fit | Stop at configured minimum, then follow explicit fallback or block export | Warning/error reports remaining overflow; never clip silently | [D] explicit policy; fallback order [Q] |
| EC-PAGE-01 | Interval or label crosses an automatic/manual page boundary | Continue/clip according to element policy with source identity retained | Golden proof of no duplicate/lost content | [D] pagination integrity |
| EC-PAGE-02 | Page range gap, overlap, zero-height range, or reversed range | Prevent export until resolved unless an explicitly allowed discontinuity is encoded | Blocking range-integrity error | [H] likely error policy; discontinuity design [Q] |
| EC-TMPL-01 | Log Set default plus group and Exploration-specific Template Assignments | More-specific assignment wins; effective choice visible | Assignment provenance displayed; deterministic after reorder | [D] DM `:63-65` |
| EC-TMPL-02 | Effective template missing from library or same ID/different digest | Render the Embedded Template Representation; offer deliberate compare/update | Library-missing/changed Diagnostic; no name-based substitution | [E] PKG `:289-301,431-444` |
| EC-REFR-01 | Refresh has additions, modifications, deletions, unchanged rows, and null/absent changes | Stage complete semantic diff; accept atomically or cancel | Counts and affected overrides; current snapshot remains intact until acceptance | [D][E] |
| EC-REFR-02 | 2FA, 401 refresh retry, 403, 404, timeout, throttle, invalid JSON, or app close mid-refresh | Preserve distinct failure class; bounded retry/cancel; prior snapshot usable | Source-specific error, no `[]`/`{}` coercion | [E] RC `:110-141` |
| EC-OVRD-01 | Local corrected display value on a valid source field | Render override visibly in edit mode; retain original and provenance | Override inventory and optional Publication Audit entry | [D] DM `:67-73` |
| EC-OVRD-02 | Refresh changes/deletes/retypes the overridden field | Mark conflict; do not silently reapply to a different target or flatten into source | Conflict requires keep/re-target/remove decision | [D][E] PKG `PKG-T20`; UX choice [Q] |
| EC-OVRD-03 | Pasted correction has invalid type, unit, or dangerous rich text | Validate against display/binding contract; preserve inert text only if allowed | Actionable validation error; no source mutation | [D]; paste normalization policy [Q] |
| EC-GW-01 | During-drilling, short-term-after, long-term-after, and piezometer readings coexist | Model and label distinct observation families; do not flatten | Binding/provenance shows kind and time | [E] RC `:164-167,192-203` |
| EC-GW-02 | Dry/no-water, not measured, missing, zero depth, and measured value | Preserve each state; zero is not missing; dry is not null | State-specific rendering/Diagnostic | [E]; exact source enums still [Q] |
| EC-GW-03 | Piezometer measurement lacks collar elevation or populated well shape | Do not invent elevation; render sourced depth/state if valid | Incomplete derivation or unsupported-shape Diagnostic | [E] RC RSL-U02/U10 |
| EC-SPT-01 | Field-test entity has configurable columns including N/P values | Resolve through supported test-type/column metadata; retain the inert raw payload/hash | Unknown-column Diagnostic; no hard-coded semantics | [E] RC SPT semantics, RSL-U13 |
| EC-SPT-02 | Refusal/partial blows, missing blows, supplied N and N60, conflicting sample `blowCounts` | Prefer typed field-test source; treat sample field as labeled fallback; no silent recalculation | Provenance and inconsistency Diagnostic | [E]; calculation policy [Q] |
| EC-INT-01 | Interim at stratum boundary, duplicate interim depth, several types at same depth | Keep point semantics and parent stratum; deterministic ordering without converting to intervals | Ambiguous/duplicate warning if source identity cannot disambiguate | [E] RC `:205-216` |
| EC-INT-02 | List item omits nested detail; direct detail succeeds, is empty, or fails | Merge only evidenced detail; distinguish absent from failed | Required-detail failure makes candidate incomplete according to manifest | [E] RSE `:627-666`; per-type requirement [Q] |
| EC-LAB-01 | No lab access/result, blank field, numeric zero, and populated MC/PL/LL | Distinguish unavailable/blank/zero/populated; bind each measurement independently | Source and status provenance; never coerce unavailable to zero | [E] LAB and RC uncertainty |
| EC-LAB-02 | Multiple lab results/statuses/units for one sample | Do not choose silently; use validated Supplemental Source contract for MVP and diagnose ambiguity | Duplicate/status/unit Diagnostic | [E] recommended source; precedence [Q] |
| EC-LAB-03 | MC, PL, LL, and N-values share a Data Track with compatible/incompatible axes | Shared axis appears once when compatible; explicit separate axis or Diagnostic otherwise | Golden scene proves axis ownership, layer order, boundary continuation | [D]; unit/axis compatibility matrix [Q] |
| EC-COMM-01 | Empty, plain, multiline, very long, and styled comment; overlapping depth ranges | Preserve content and source range; apply configured wrapping/continuation | Overflow/collision Diagnostic | [E] comments exist; styling subset/frequency [Q] |
| EC-SAVE-01 | Crash, disk full, file lock, external change, or unsupported storage during save | Preserve the last good Authoritative File; expose recovery/conflict; never acknowledge an unverified target | Stable save/recovery error and cleanup evidence | [E] PKG threat cases |
| EC-EXPORT-01 | Output path unavailable, permission denied, disk full, target locked/changed, renderer crash, or cancellation during export | Render one immutable revision; leave no apparently valid partial Log Document at the selected final path | Stable export failure/cancellation state and partial-output cleanup evidence | [D] WF-06; exact export adapter proof remains downstream |

## Sanitized fixture requirements

### Fixture safety and provenance

All ticket #10 fixtures must be synthetic or explicitly approved, irreversibly sanitized transformations. Do not copy client names, coordinates, project numbers, notes, photos, proprietary hatch artwork, credentials, tokens, tenant IDs, or vendor assets. Synthetic data is preferred because meaningful free text and spatial combinations are difficult to de-identify reliably.

Every fixture must include a machine-readable manifest containing:

- fixture ID, purpose, revision, creation date, and generator version/seed;
- synthetic/approved-sanitized classification and approval record if applicable;
- source-shape version and Render Dataset schema version;
- stable synthetic Project, Exploration, entity, template, and override IDs;
- unit and coordinate-system labels without real coordinates;
- exact null/absent/empty/zero states intentionally represented;
- expected collection result state: `success`, `empty`, or `failed`;
- expected pages, Reference Depth Ranges, effective Template Assignments, and Diagnostics;
- expected source-to-render provenance and any deliberate derived values;
- required fonts/assets with license/redistribution status; and
- a statement that no credentials or production identifiers are present.

### Minimum fixture suite

| Fixture | Required contents | Primary purpose |
|---|---|---|
| FX-01 `smoke-short` | One Project, one short Exploration, simple strata/sample/comment, no warnings | Basic end-to-end control |
| FX-02 `boundary-pages` | Exact-boundary records, crossing intervals, manual ranges, first/continuation/last variants | Pagination ownership and deterministic ranges |
| FX-03 `long-dense` | Many pages; dense coincident strata, samples, field tests, comments, water, and interims | Layout stress, navigation, collision, export cancellation |
| FX-04 `sparse-missing` | Deep sparse record; empty collections; absent/null/zero variants; unresolved optional lookup | Empty-state and sparse geometry semantics |
| FX-05 `malformed-relations` | Reversed/overlapping intervals, duplicate IDs, orphan children, malformed classification/styled text | Validation, containment, and Diagnostics |
| FX-06 `text-overflow` | Long prose/unbroken tokens, Unicode/RTL/mixed styles, shrink minimum, missing font | Measurement and overflow policy coverage |
| FX-07 `mixed-template` | Log Set default, group override, Exploration override, missing library copy, changed digest | Assignment precedence and offline effective-template behavior |
| FX-08A/B `refresh-pair` | Before/after snapshots with add/change/delete, null/absent change, failure state, and override conflict | Staging, comparison, atomic acceptance, conflict handling |
| FX-09 `groundwater` | All open-hole observation kinds plus piezometer dry/measured/missing-elevation cases | Prevent groundwater flattening |
| FX-10 `spt-custom` | Configurable test columns, partial/refusal blows, N/N60, unknown keys, sample fallback conflict | Schema-driven SPT mapping and provenance |
| FX-11 `interims` | Multiple variable types, duplicate depths, boundary points, list/detail omission/failure | Point semantics and detail-read behavior |
| FX-12 `lab-supplemental` | MC/PL/LL blank/zero/populated, status/unit conflicts, unmatched/ambiguous sample, validated-file provenance | MVP Supplemental Source validation and Data Track binding |
| FX-13 `export-recovery` | Multi-page mixed template with warnings/suppression plus injected save/export faults | Publication Audit, partial-file prevention, recovery |
| FX-14 `workload-generator` | Parameterized Projects, Explorations, pages, records, elements, templates, and assets | Replace hand-made “large” files with reproducible scale bands |

`FX-08` is the stable fixture-family identity. `FX-08A` is its accepted-before member and `FX-08B` is its staged-after member. A trace to the comparison pair uses `FX-08`; a trace to one concrete member uses `FX-08A` or `FX-08B`. The fourteen-family count treats the pair as one family and never collapses the two member artifacts into one state.

Each fixture needs both a source-side value-free/synthetic shape and an expected Render Dataset. Renderer tests must never treat the normalized expected dataset as proof that the Source Adapter mapped the source correctly; adapter and renderer oracles are separate.

## Usability and operational risks

| Risk | Consequence | Required mitigation/evidence |
|---|---|---|
| Source and override look identical | A published correction may be mistaken for source truth | Persistent edit-mode distinction; original/override comparison; audit inventory; interview test of comprehension |
| Stale Source Snapshot is visually quiet | User may issue outdated data | Visible freshness/scope; deliberate Refresh; export policy decision; interview acceptable-age scenarios |
| Diagnostic overload or broad suppression | Critical warnings are ignored | Severity taxonomy, grouped navigation, narrow suppression scope, persistent underlying finding, usability test with dense fixture |
| Refresh failure becomes empty content | Missing data appears legitimate | Three-state fetch contract; incomplete candidate rejection; refresh-failure fixture |
| Template precedence is hidden | Wrong format is published for some Explorations | Effective template shown per tree item and preflight; mixed-template test |
| Page-depth edits create gaps/overlaps | Depth-bound records are omitted or duplicated | Range-integrity validator and page overview; boundary fixture |
| Text fit differs between editor and PDF | Accepted layout changes on export | One measurement authority, pinned fonts, preview/PDF golden comparison |
| Missing font/hatch is silently substituted | Pagination or professional meaning changes | Exact identity, neutral fallback only when allowed, non-silent Diagnostic |
| Long tasks appear frozen | User kills app and loses work or creates partial export | Progress, phase labels, cancellation, bounded recovery; measure with workload generator |
| Autosave is mistaken for history | User expects prior issued figures/templates to be reproducible | Recovery language distinct from version history; records-policy interview |
| Shared template file changes under an open project | Project silently changes | Embedded Template Representation, digest comparison, deliberate update |
| Two users save the same shared file | Lost work or corrupted file | Single-writer/conflict behavior and storage-class testing; determine actual shared-file practice |
| Network/2FA failure during deadline work | Refresh blocks publication or causes unsafe workaround | Offline prior snapshot, clear stale state, retry/cancel, support path; learn deadline workflow |
| Lab Supplemental Source is confused with RSLog truth | Provenance and freshness become misleading | Distinct artifact/source label, validation, separate freshness, audit entry |
| Sensitive data enters support artifacts | Client confidentiality breach | Redacted support schema, preview before sharing, no automatic upload; security review |
| Accessibility is treated as final-stage polish | Tree, canvas, diagnostics, and review become unusable for keyboard/AT users | Keyboard-complete workflows, semantic tree/property UI, focus restoration, interviews that ask about accommodations without requiring disclosure |

## Structured representative-interview plan

### What this plan can and cannot claim

This is a script for future research, not a record of completed sessions. Participation, recording, screenshots, and artifact review require the firm's normal approval and consent. Interviewers must not request RSLog credentials or retain client-identifying data.

A reasonable **proposed** sample is 6–10 sessions across people who actually author logs, maintain templates, review/approve deliverables, and support deployment, allowing role overlap. Continue until at least two consecutive interviews add no new critical workflow or export-blocking edge case, then explicitly document any unrepresented role. This is a sampling recommendation, not statistical proof for a 30-person population.

### Session outline (45–60 minutes)

1. **Context and consent (3 minutes).** Explain that the goal is workflow learning, not performance evaluation. Confirm what may be recorded. Ask the participant not to show credentials or client-identifying material.
2. **Recent-case reconstruction (12 minutes).** “Think of the most recent boring-log deliverable you worked on. Starting from the request, walk me through what happened, where information came from, and what artifact existed at each step.” Ask for actions before opinions.
3. **Variation and exception probe (10 minutes).** Ask for a simple recent case, a difficult recent case, and the last case that required a manual correction or reissue.
4. **Template workflow (8 minutes).** Determine who changes layout, how changes are reused, how one-off changes remain local, and how users discover the correct template.
5. **Data/Refresh workflow (8 minutes).** Determine when source data changes, how users learn about it, what they compare, and what happens to local edits.
6. **Review/publication workflow (8 minutes).** Reconstruct checks, warnings, sign-off, naming, storage location, PDF requirements, and reissue expectations.
7. **Scale and frequency (5 minutes).** Collect ranges and recent concrete counts, clearly separating remembered values from measured ones.
8. **Wrap-up (3 minutes).** Ask what was missed, who sees a different part of the process, and whether a synthetic recreation would be representative.

### Neutral prompts for all participants

- What starts the work, and what tells you it is finished?
- Which files, systems, people, and handoffs are involved?
- Where do you wait, re-enter data, or check the same thing twice?
- What mistake is easiest to miss but most expensive to issue?
- Show or describe the last time content did not fit. What did you do?
- How do you know the PDF contains the newest intended source data?
- When a source value is wrong but cannot be corrected immediately, what happens today?
- What varies among clients, offices, exploration types, or project phases?
- Which warning must always stop publication? Which warnings recur harmlessly, if any?
- What happens after a crash, unavailable network, expired login, or unavailable shared drive?

## Exact unresolved questions

### For engineers / log authors

1. Who initiates a boring log, who authors it, who checks it, and who is allowed to publish it? Can one person hold all roles?
2. What are the actual steps and artifacts from selecting a project to delivering a PDF? Which steps are mandatory versus habit?
3. In the last ten Log Sets, how many Explorations and pages were in each? What is the largest case you can substantiate from metadata?
4. How often do soil and rock, or other exploration categories, need different templates within one Log Set? What determines grouping?
5. Do page depth ranges normally stay uniform? When and why are they changed page by page?
6. What content most often overruns: strata description, sample description, comments, header fields, test values, or something else?
7. For each content type, is the acceptable response wrap, grow, shrink, clip, continue, repaginate, or block export? What minimum readable font size is acceptable?
8. Which source values are locally corrected for publication, who approves the correction, and how should the original/override distinction appear in the PDF or audit?
9. When RSLog data changes after layout work begins, what must be compared before accepting it? Can users accept part of a refresh, or must it be atomic?
10. What is the expected treatment of a source record deleted after a local override or annotation was attached to it?
11. Which Diagnostics are publication blockers, which require acknowledgment, and which—if any—may be suppressed for one project, one Exploration, or one finding?
12. How are groundwater observations labeled today, especially dry, not measured, during drilling, after drilling, and piezometer readings?
13. Which SPT values are issued—raw blows, N, N60, refusal notation—and which source wins if values disagree?
14. How are moisture, PL, and LL obtained today? Which units/statuses are acceptable, and what happens if they are unavailable?
15. Where are working files and issued PDFs stored? Are SMB shares, sync folders, removable media, or local-only paths actually used?
16. What PDF page sizes, orientation, naming, folder structure, bookmarks, accessibility, or print-shop constraints are mandatory?
17. What must survive a crash? How long should recovery candidates remain, and who may see them on a shared workstation?
18. Is reproducing an old issued figure a records requirement despite the current no-history product boundary? If yes, what artifact is authoritative?

### For template maintainers

1. Who creates and approves shared templates, and how do users find the correct current template?
2. How many templates and meaningful variants exist? Which differences are structural versus style-only?
3. Which Header, Depth Body, Footer, Log Columns, graphics, and graph tracks are essential in each common template family?
4. What example values are necessary to expose real problems without production data: longest project name, deepest hole, dense strata, styled comments, missing lab results, etc.?
5. Which dynamic fields are required, optional, repeatable, or conditional? What should an absent value render?
6. Which elements repeat on first, continuation, and last pages? Which change with orientation or page size?
7. Which fonts, line styles, hatch patterns, logos, and images are used, and what evidence establishes redistribution/embedding rights?
8. What is the exact overflow policy by element type, including minimum font size and export-blocking conditions?
9. When users modify a shared template inside a project, when should that remain local, update the original, or be saved as a new template?
10. On Save As new template, should stable identity fork? How should descendants know whether it is a replacement or a new template?
11. How should group/Exploration assignments behave when an Exploration moves groups or a template is renamed, moved, missing, or changed?
12. Which graph series share axes, which units/scales are compatible, and how should out-of-range or missing values appear?
13. Which interim-variation types are used and how should multiple changes at the same depth render?
14. What differences between editor preview and issued PDF are currently tolerated, and which are defects?
15. What keyboard-only or assistive-technology needs must the tree, property editor, canvas, Diagnostics, and export workflow support?

### For reviewers, support, and policy owners

1. Is there a formal review checklist or approval record? May it be inspected and converted into synthetic acceptance cases?
2. What information may appear in a `Publication Audit`, and how long may it and recovery data be retained?
3. What is the supported update/deployment path for approximately 30 people, including rollback and offline machines?
4. What storage destinations and concurrent-edit patterns must be supported?
5. What anonymized counts or approved historical-document metadata may be used to replace the workload hypotheses?
6. Who decides that a warning is suppressible, a template is approved, and a Log Document is ready to issue?
7. What support information can be shared internally without exposing client data, and who receives it?

## Interview evidence capture template

For each approved session, record:

- anonymous participant code and self-described tasks, not assumed title;
- date, interviewer, consent scope, and whether recording/artifact review was permitted;
- one recent-case timeline with trigger, actions, handoffs, artifacts, decisions, failures, and completion signal;
- observed versus recalled counts, with source noted;
- every edge case described, its last occurrence, consequence, workaround, and evidence confidence;
- exact vocabulary the participant uses, mapped later to the repository language without erasing the original phrase;
- unresolved contradictions with earlier sessions;
- candidate synthetic fixture changes; and
- no credentials, client names, production identifiers, or unrestricted screenshots.

## Completion criteria that cannot yet be proven

| Unproven criterion | Why local evidence is insufficient | Evidence that would close it |
|---|---|---|
| Actor model represents the firm | Roles in this report are analytical lenses only | Approved interviews spanning actual authoring, template, review, data, and support work; documented role overlap |
| Workflow order and handoffs are representative | Requirements describe intended product behavior, not current practice | Recent-case reconstructions from multiple participants plus comparison to any approved checklists |
| The workload envelope is representative | Only the approximately 30-person population is known | Anonymized project/page/entity/template/storage counts; concurrent-use measurement; largest approved cases |
| Edge-case priority reflects real frequency and consequence | Local contracts prove possibility, not occurrence | Interview incident histories, support issue categories, and approved metadata counts |
| Overflow defaults match professional judgment | “Non-silent” is decided; per-content fallback order is not | Maintainer/engineer reviews using FX-06 and representative synthetic content; signed product decision |
| Page-range and mixed-template behavior matches practice | Capability is decided but operational grouping is unknown | Real-case walkthroughs reproduced synthetically in FX-02/FX-07 |
| Refresh comparison is usable at realistic volume | Contract semantics are defined, not cognitive load | Moderated prototype study with FX-08 at measured small/large sizes |
| Override governance is sufficient | Local-only/source-preserving behavior is decided; approval/audit rules are not | Engineer and reviewer interviews plus policy-owner decision using conflict scenarios |
| Groundwater, SPT, and interim presentation covers actual cases | Data families are evidenced, but populated shapes/use frequencies remain incomplete | Authorized sanitized populated fixtures and representative user review |
| Laboratory workflow is acceptable | Supplemental Source is recommended, but access/roles/frequency are unresolved | Prerequisite lab research, approved exchange fixture, and engineer/reviewer workflow validation |
| Recovery, file location, and concurrent-save policy fit operations | Storage and retention practice is unknown | IT/user interviews and fault tests on each actually used storage class |
| Publication acceptance criteria are decision-complete | PDF export is required; formal sign-off/accessibility/records rules are unknown | Review checklist, policy-owner decisions, and representative PDF acceptance exercise |

## Evidence-to-decision gate

Ticket #10 should be treated as complete only in two explicit stages:

1. **Provisional charting stage — complete with this report.** The local evidence, hypotheses, fixture corpus, interview script, and unresolved questions are recorded without inventing user research.
2. **Representative validation stage — open.** Run approved interviews and artifact/metadata review, revise the workflows and workload bands, rank edge cases by frequency and consequence, add or change synthetic fixtures, and record contradictions. Completion requires evidence for every row in the preceding table or an explicit product-owner decision to accept the remaining uncertainty.

Until stage 2 closes, implementation agents may use the decided domain invariants and failure semantics, but they must not silently treat the proposed actor labels, workload numbers, workflow ordering, warning severity choices, or interface preferences as validated product behavior.

## Decision handoff

### Known decisions

- The product has distinct `Log Template` and `Log Project` authoring loops, offline-capable embedded data, read-only Source Data, deliberate Refresh, hierarchical Template Assignment, local Presentation Overrides, explicit Diagnostics, per-page Reference Depth Ranges, shared Data Tracks, and immutable PDF publication.
- Refresh failure must never masquerade as empty data.
- Source truth, Supplemental Sources, and Presentation Overrides must remain visibly and structurally distinct.
- The approximately 30-person population is the only established workload number.

### Open tickets / prerequisite evidence

- Representative internal interviews and approved artifact walkthroughs.
- Anonymized workload and storage-class measurement.
- Populated authorized groundwater/piezometer, interim, SPT-custom-column, and laboratory fixture work already named in the RSLog research.
- Prototype validation of pagination/overflow, Refresh comparison, canvas/tree usability, package/save recovery, and shared-axis rendering against the fixture suite.
- Policy decisions for review/sign-off, suppressible warnings, overrides/audit, recovery retention, storage support, and old-publication reproduction.

### Fog of war

- Actual role distribution and workflow ownership.
- Typical and extreme project sizes, density, concurrency, and deadline patterns.
- Frequency and professional consequence of each edge case.
- Template library inventory and permitted fonts/assets.
- Current workaround burden and willingness to adopt a Supplemental Source for laboratory data.

### Out of scope

- Contacting or claiming to represent engineers, template maintainers, Rocscience, or Esri.
- Inspecting credentials, customer data, or confidential production artifacts.
- Implementing UI, source access, rendering, persistence, export, or MCP behavior.
- Writing back to RSLog or changing RSAgent.
- Treating recovery as automatic version history or silently archiving every generated Log Document.
