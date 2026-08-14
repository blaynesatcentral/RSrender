# RSrender v0.9 Product Specification

**Status:** Decision-complete product specification for Wayfinder issue #25  
**Evidence cut:** 2026-08-14  
**Target:** Windows-first, internal v0.9 release for an approximately 30-person engineering firm  
**Product posture:** Standalone Electron desktop software; read-only RSLog integration; clean-room implementation  

This specification defines the behavior implementation agents may build. It integrates the accepted domain, UX, architecture, lifecycle, recovery, corpus, and performance decisions. A linked validation or release gate may prevent shipment, but it does not reopen product behavior unless its evidence falsifies a stated assumption.

Normative words **must**, **must not**, **should**, and **may** have their ordinary requirements meanings. Where this document summarizes a narrower specification, the narrower specification supplies the detailed state table or algorithm. If two planning documents conflict, this product specification controls product scope and behavior; accepted ADRs control architectural boundaries; the domain model controls semantic ownership and vocabulary.

## 1. Product outcome

RSrender lets an engineer design editable professional boring-log templates, bind them to read-only RSLog-derived data, assemble projects containing multiple explorations and template variants, inspect the result live, resolve publication problems, and export accessible PDF Log Documents to a chosen local destination.

The interaction benchmark is the capability depth of a professional layout designer, especially ArcGIS Pro Layout. This is a clean-room capability benchmark only. RSrender must not contain Esri or Rocscience code, proprietary assets, branding, trade dress, undocumented copied schemas, or misleading compatibility claims.

The v0.9 outcome is not merely “a PDF generator.” It is a stateful desktop authoring product in which:

- the editable project remains useful offline;
- source truth, source interpretation, display overrides, and freeform annotations remain distinguishable;
- every visible layout element is discoverable through both the Canvas and Contents pane and editable through supported commands;
- text, data, fonts, assets, and page geometry are measured live by the same layout authority used for export;
- publication is a verified, diagnosable operation rather than a best-effort print action; and
- implementation preserves a transport-neutral command seam for a separately scoped post-MVP agent interface without shipping an MCP server in v0.9.

## 2. Users, jobs, and evidence limits

### 2.1 Persona lenses

These are task lenses, not authorization roles. One employee may occupy several lenses.

| Lens | Primary responsibilities in RSrender |
|---|---|
| Project engineer / log author | Select a source project, organize explorations, choose templates, review live logs, add presentation-only corrections or annotations, preflight, and publish. |
| Template maintainer | Create and edit templates, semantic columns, components, styles, bindings, page plans, and reusable variants. |
| Reviewer / checker | Inspect source provenance, overrides, warnings, pagination, accessible reading order, and publication audit before release. |
| Source-data steward | Resolve incomplete or ambiguous RSLog data in RSLog; advise whether a project-local Source Resolution Decision or display-only Override is appropriate. |
| IT / support | Qualify endpoints, installer/update/recovery controls, storage policy, and privacy-safe diagnostics. |
| Product / standards owner | Maintain office standards, approved fonts/assets/hatches, default templates, and publication policy. |

These lenses are provisional analytical constructs. The representative workflow program was deliberately closed with uncertainty accepted; it did not prove task frequency, workload representativeness, or organization-wide usability.

### 2.2 Jobs to be done

RSrender must support these jobs without assuming that their ordering or frequency has been validated by interviews:

1. create a new editable Log Project or open an existing one;
2. deliberately acquire or refresh a read-only RSLog source project;
3. work offline from retained project material without an automatic network dependency;
4. organize explorations into an ordered Log Set and nested project-local groups;
5. apply one template broadly while assigning different templates to groups or individual explorations;
6. author templates with live data, exact layout controls, reusable styles/components, and explicit overflow handling;
7. correct a displayed value or add a note without changing or impersonating source data;
8. review Diagnostics, warnings, overrides, nonfinal values, pagination, and accessibility before publication; and
9. export a verified PDF Log Document to a user-selected local path.

## 3. Release scope and product boundary

### 3.1 Required v0.9 capabilities

The first internal release must provide:

- a Windows desktop shell with New, Open, Save, Save As, Close, Quit, Recent Files, dirty-state prompts, Recovery Candidate capture/review, and update-safe document handling;
- separate Production and Advanced Design workspaces over the same document, command, selection, and undo authorities;
- a Canvas, Contents tree, Properties pane, catalog/data browsing, bindings, diagnostics, page navigation, status, and export surfaces;
- editable page regions, Log Columns, graphic elements, Dynamic Text, Data Tracks, Data Layers, styles, and reusable components;
- direct manipulation and exact properties, including keyboard-only paths;
- one read-only RSLog source account/company context per session and one Source Project per Log Project;
- offline project authoring and publication from accepted embedded project material;
- deliberate Refresh with complete-candidate review and atomic acceptance;
- multiple Embedded Template Representations in one project and deterministic assignment by project, group, or exploration;
- live text overflow and pagination feedback;
- project-local display-value Overrides, freeform Annotations, and explicit Source Resolution Decisions;
- accessible, selectable-text PDF publication with deterministic page geometry and user-selected destinations; and
- a centralized Diagnostic, preflight, acknowledgment, suppression, and Publication Audit model.

### 3.2 Exact exclusions

The following are not v0.9 product capabilities:

- writing, correcting, deleting, or synchronizing data back to RSLog;
- simultaneous multi-tenant or multi-account source composition in one Log Project;
- automatic or background Refresh on open, edit, export, or a timer;
- collaborative multi-user editing, shared-server projects, cloud sync, or conflict merging;
- persisted version history for templates, projects, source snapshots, or previously published PDFs; session Undo may temporarily retain the immediately needed pre-command state under the rules below;
- storing historical template revisions solely to reproduce old figures;
- spreadsheet-style bulk editing of source records;
- engineering calculations, laboratory interpretation, or inferred units/semantics;
- full-page or export-wide rasterization as a fallback for failed text, fonts, assets, tagging, or layout;
- arbitrary active content, scripts, macros, plug-ins, remote web content, or executable package payloads;
- a production MCP server, autonomous agent, or unattended publication workflow;
- macOS or Linux distribution;
- generic GIS map-frame, legend, north-arrow, or scale-bar semantics merely because the interaction benchmark includes them;
- automatic telemetry or upload of project/client content; and
- bundled proprietary vendor fonts, symbols, hatches, sample data, branding, or client material without explicit rights and provenance.

## 4. Authoritative artifacts and ownership

| Artifact | Purpose | Owner and persistence rule |
|---|---|---|
| Log Template | Independently reusable template package | User-selected Authoritative File when targeted. A new, migrated-copy, or recovery-opened untargeted template has no Authoritative File until verified Save/Save As binds one. Saving a project does not update a separate template file. |
| Embedded Template Representation (ETR) | Complete current template material used by a Log Project | Project-owned and embedded. It is current material, not a link and not template history. |
| Log Project | Authoritative editable work package | User-selected Authoritative File when targeted, containing one Source Context Identity, one Source Project identity, zero or one accepted Source Snapshot, Supplemental Sources, Source Resolution Decisions, Overrides, Annotations, ETRs, one ordered Log Set, and current authoring state. A new, migrated-copy, or recovery-opened untargeted project has no Authoritative File until verified Save/Save As binds one. |
| Source Snapshot Candidate | Complete source-only result of a deliberate Refresh | Temporary and reviewable. It is not the accepted Source Snapshot and cannot produce a project Render Dataset before acceptance. |
| Source Snapshot | Last deliberately accepted complete source-only state | Embedded in the Log Project and replaced atomically only after Candidate acceptance. |
| Render Dataset | Deterministic authoring input derived from accepted project state | Derived, never saved as source truth. Inputs are the accepted Source Snapshot, Supplemental Sources, Source Resolution Decisions, and Overrides. |
| Example Dataset | Synthetic template-design input | Non-authoritative. It must never enter an authoritative publication. |
| Publication Candidate | Immutable, digested input to one preflight/export attempt | Job-scoped; not editable project history. |
| Log Document | Published PDF output | External user-selected file. RSrender does not maintain an output-history archive. |
| Recovery Candidate | Recoverable full working package | App-owned recovery package with its own candidate identity and captured-document/recovery-origin metadata; never an Authoritative File. Open Separately creates a new untargeted dirty document with a new Document Identity while retaining only inert recovery-origin provenance. |
| Publication Audit | Machine-readable record of a publication decision | Canonical JSON sidecar in the Publication Bundle; mandatory under the triggers in Section 12.4. Embedding it in PDF is deferred. |

An Authoritative File may be created and replaced only on a supported local fixed NTFS volume. Unsupported storage opens read-only and offers **Save As Local**. Recovery Candidate stores, installer/update areas, and temporary areas are never valid authoritative destinations.

## 5. Log Project, Log Set, and template assignment

### 5.1 Project cardinality

A v0.9 Log Project must contain exactly one Source Context Identity, exactly one Source Project identity, and exactly one ordered Log Set. Every included Exploration membership produces exactly one Boring Log. Each Boring Log contains one or more ordered pages and has exactly one effective template at evaluation time.

An Exploration may appear at most once in the Log Set. An Exploration Group is project-local organization only; it must not be represented as source truth or written to RSLog. Groups may nest and carry inherited template assignments.

### 5.2 Assignment precedence and variants

Template Assignment resolution must be deterministic:

1. Exploration assignment;
2. nearest ancestor group assignment;
3. next broader ancestor assignment;
4. Log Set/project default assignment.

Two assignments at the same scope for the same target are an error. Missing or ambiguous effective assignment is publication-blocking.

One Log Set may therefore use one template for every exploration, different templates for project groups, different templates for individual explorations, or any deterministic combination. The UI must expose assignment origin and inherited versus explicit state.

All assignments that reference the same ETR share its current edits. To diverge, the user must invoke **Save as Separate Template** or the equivalent explicit clone operation, creating a new template identity, then reassign the desired target. Project save preserves the ETR; it never silently writes changes back to a library Log Template. Updating a reusable Log Template is a separate explicit Save/Save As operation.

The project stores only each ETR's current material. Editing it replaces the project's current design; RSrender does not keep past template versions for reproduction of older Log Documents.

### 5.3 Page plan

Each Boring Log must resolve a contiguous ordered page plan. Page depth ranges use half-open intervals, except the final interval includes its endpoint. A value exactly on an internal page boundary belongs to the deeper page. Page ranges may vary; the user can explicitly set the reference depth scale/range for each page. Template Variants own physical page size, orientation, margins, and Page Regions. Page ownership, continuation, headers, footers, columns, and Data Tracks must remain deterministic when ranges change.

## 6. Document lifecycle

The [lifecycle and conflict specification](lifecycle-conflict-state-command-specification.md) is normative for command availability and transitions. Product-level rules are:

- A document is dirty when working state differs from its last verified durable revision.
- Save snapshots an immutable revision; the user may continue editing while that revision is written. A later verified Save must not clear edits made after the captured revision.
- Save and Save As succeed only after write, commit, validation, reopen, and identity checks complete.
- Definite failure, uncertain outcome, external conflict, and pre-replacement are distinct states with distinct commands and language.
- Save As does not change document identity until the new target is verified. Overwrite requires explicit authority and a final race check.
- External Change freezes mutating commands. Compare is inspection-only. The freeze ends only after verified **Reload External**, verified **Save As**, or eligible deliberate **Replace External**.
- Close, Quit, and Update process every open document; no dirty document is discarded until required saves complete and a final dirty/conflict recheck passes.
- Recovery discovery never makes a Recovery Candidate authoritative. **Open Separately** creates a new untargeted dirty document with a new Document Identity and inert recovery-origin provenance; it does not reuse the candidate identity as document identity. Verified Save/Save As is still required before that document has an Authoritative File.
- Missing template-library provenance with an intact ETR is a warning; missing, corrupt, or unusable ETR material is an error.
- Recent Files store locators and display metadata only. Opening a recent item performs the same trust and lifecycle checks as Open.

The shell must show document identity, dirty state, read-only state, active jobs, conflict/uncertain state, and recovery state in text and accessible semantics, not by color or title-bar punctuation alone.

## 7. Source acquisition, Refresh, and offline behavior

### 7.1 Source Adapter contract

RSLog integration is read-only. Source acquisition must use the versioned Source Adapter boundary and preserve endpoint/collection provenance, stable source identifiers, raw value state, modified metadata where available, and independent collection outcomes.

The Source Adapter may support a source family only where its current admissible contract defines identity, parent/cardinality, fields, value states, units, provenance, and collection failure behavior. The currently admitted core covers projects, explorations/boreholes, strata, samples, mapped SPT/field-test records, comments, the mapped groundwater families, and mapped lookup/boring-detail fields documented by the source contract. Positive piezometer, additional drilling-detail/run, interim-variation, laboratory-API/index-test, hatch-binary, and fallback `blowCounts` shapes remain typed unavailable/blocked pending #43 evidence; they are not “initially supported” merely because RSLog contains them. A blocked/absent/failed family stays distinguishable, and Supplemental Source material is never presented as vendor-sourced.

### 7.2 Authentication

RSLog credentials and tokens are session-only. v0.9 supports one authenticated account/company context per session. A dedicated short-lived sandboxed Auth Entry renderer may transiently collect the exact user-entered password or verification code and submit it once through the narrow route defined by the architecture; it receives no tokens or ordinary application/document projection and is destroyed after completion, cancellation, terminal failure, or crash. The privileged main-process credential/source broker is the sole post-submission holder. Passwords, verification codes, refresh tokens, access tokens, and browser session material must not enter a project, template, recovery, Recent Files, structured log/crash annotation, audit, telemetry, or support bundle. Raw minidump capture/upload is disabled by default and requires separate firm custody approval and secret-canary evidence.

### 7.3 Deliberate Refresh

Refresh is user-initiated and never implicit. It must:

1. acquire every required and requested collection into a new Source Snapshot Candidate;
2. classify each collection as `success`, `empty`, or `failed` without collapsing null, absent, zero, and empty values;
3. validate source context and stable identity;
4. present a source-only Candidate/diff review against the accepted Source Snapshot; and
5. atomically replace the Source Snapshot only after explicit acceptance.

No Render Dataset may be derived from an unaccepted Candidate. During review, the Canvas continues to use the Render Dataset derived from the accepted Source Snapshot. This resolves contrary provisional workflow wording that described a candidate preview Render Dataset.

A required collection failure rejects the Candidate. An optional, unbound collection failure may be accepted only through the declared Refresh policy; it remains explicitly failed and is not stale-merged. A Candidate from the wrong account/company/source project is rejected. Rejection or cancel leaves the project unchanged.

After acceptance, the assembler deterministically derives a new Render Dataset and reports source changes that conflict with Source Resolution Decisions or Overrides. Refresh never silently deletes, retargets, or converts those objects.

Accepted Refresh is one named session Undo transaction. Its inverse reinstates the exact prior accepted Source Snapshot and the corresponding derived/conflict basis retained for that open-session history entry; it never contacts RSLog or partially reverses collections. Undoing/redoing Refresh dirties the project like any other document-domain command. Saving persists only the current accepted Snapshot, and closing the session discards this Undo history, so this behavior does not create persisted Source Snapshot version history.

### 7.4 Offline operation

Open, edit, render, preflight, and export of a source-backed Log Project must work without a network connection from its last accepted Source Snapshot, Supplemental Sources, Source Resolution Decisions, Overrides, Annotations, and ETRs. Template design/preview may separately use an embedded Example Dataset. Offline status and accepted source timestamp/provenance must be visible.

Age or offline status alone is informational. A pending/rejected newer Candidate or a required Refresh failure creates a candidate-specific export warning that requires acknowledgment. Export never triggers Refresh.

A Template or not-yet-source-backed project may use its embedded Example Dataset for design and preview, but it cannot publish an authoritative Log Document. Authoritative preflight requires an accepted Source Snapshot and must fail if any reachable binding still resolves from Example Dataset material.

## 8. Data truth, decisions, overrides, and annotations

RSrender must keep four concerns separate:

| Concern | Meaning | May alter source truth? |
|---|---|---|
| Source Snapshot fact | Captured vendor/source value and provenance | No |
| Source Resolution Decision | Explicit project choice among ambiguous or competing source representations | No; records interpretation and rationale |
| Display Value Override | Exact project-local presentation replacement for one stable source field | No; preserves baseline and provenance |
| Freeform Annotation | User-authored note anchored to a semantic region, depth, or page plan | No |

A Display Value Override must store source entity identity, field identity, baseline value state/digest, replacement, author/time, and rationale. It must not become indistinguishable from source data. If Refresh deletes, retypes, or changes the baseline field, the Override becomes conflicted and blocks publication until explicitly resolved; fuzzy retargeting is forbidden.

In the Production workspace, **Edit Display Value** and pasting text into an eligible bound-value editor create or update this exact Display Value Override; they never edit RSLog, replace the retained Source Snapshot fact, or silently detach the binding. The UI must show the original source value/provenance beside the proposed display value before commit, and an ineligible/multi-target paste fails without a partial Override.

An Annotation must never masquerade as a source field. Depth and semantic-region anchors are preferred; page anchors must disclose reflow risk. Override, Annotation, and Source Resolution Decision creation/removal is undoable and dirtying.

Canonical data keeps independent axes for value state, association state, finality, and renderer eligibility. Zero is a value. `null`, absent, empty collection, failed collection, nonfinal, unassociated, and ineligible are not synonyms. Units must be explicit and compatible; the product must not infer a unit merely because values appear plausible.

Supplemental Sources are admitted, project-owned inputs with provenance and trust classification. They are not relabeled as RSLog facts. Client spreadsheets or exports are not admissible fixtures or product defaults merely because they exist locally.

## 9. Layout Studio behavior

The [Layout Studio UX specification](layout-studio-ux-specification.md) is normative for detailed interaction behavior and atomic capability traceability.

### 9.1 Workspaces and surfaces

Production workspace must emphasize exploration/template selection, page review, source status, Diagnostics, preflight, and export. Advanced Design workspace must expose the full Canvas, Contents, Properties, catalog/data, binding, style/component, guide/grid, page, and Diagnostic surfaces. Switching workspaces changes presentation, not document state, command semantics, selection, undo, or permissions.

The Contents tree must show every page region, group/subgroup, Log Column, Data Track, Data Layer, and graphic element in deterministic render order, with local and effective visibility/lock state. Users must be able to reorder and reparent eligible items by pointer and keyboard with before/after/inside previews, cycle prevention, and undo.

Canvas and Contents must share one Selection Set and one Key Element. Shift-click adds/removes selection. Alignment uses the explicit Key Element as reference, never an inferred “first” item. Direct manipulation, exact numeric editing, group transformations, handles, rotation, anchors/pins, rulers, guides, grid, snapping, nudging, alignment, and distribution must use the accepted UX semantics.

Every command available in an element's Canvas context menu must appear with identical label, availability, consequence, and state in its Contents context menu; keyboard invocation must expose the same command model. This includes element-specific styling such as text-box background, border, padding, opacity, and overflow policy.

Cut, Copy, Paste, Duplicate, Group, Ungroup, Delete, Undo, and Redo must be semantic document commands with deterministic ownership, stable identities, collision-safe placement, and one chronological undo history across Canvas, Contents, and Properties. Named zoom, fit, page navigation, scroll, and Space-pan commands must not mutate document geometry; arrow keys nudge a movable selection rather than ambiguously panning the viewport.

The active Canvas must always identify one explicit editing mode:

| Mode | Authority and allowed change |
|---|---|
| Template Variant Design | Edits template hierarchy, geometry, styles, bindings, page geometry, guides, and grid against an Example Dataset or chosen project preview. |
| Generated Log Set Overview | Navigates and selects in the immutable generated page plan; project-local page-plan commands remain available. |
| Generated Page Focus | Edits Overrides, Annotations, and project-local settings for one generated occurrence; shared structure routes to deliberate template editing. |
| Focused Component | Edits one Data Track or Component definition; the outer scene is visibly unavailable until exit. |
| Publication Preflight | Reviews one immutable Publication Candidate and disposes eligible Warnings; it never hides a scene edit inside export. |
| Compare / Refresh Review | Inspects baseline/local/external or accepted/Candidate facts and runs only the named resolution commands. |

Mode, Exploration, Template Variant, page role/range, data context, mutation availability, and exit route must be visible and programmatically exposed. Focused Canvas is only a pane-layout view, not another behavioral mode.

### 9.2 Semantic page composition

Templates must support Page, Header, Depth Body, and Footer regions; ordered Log Columns; text, lines, shapes, pictures, groups, Dynamic Text, Data Tracks, and Data Layers. Users can change column widths, fonts, font sizes, styles, line weights, fills, borders, transparency, padding, clipping, order, bindings, and element membership through the GUI. No RSLog-specific arbitrary font-size or style restriction applies.

Pictures are a required v0.9 product capability, so the approved native-decoder and asset-policy gates must pass before a build may claim or ship as the complete v0.9 release. Until then, development builds show picture/import as unavailable with the gate reason and never substitute an unsafe renderer/ordinary utility decoder. Shipping without pictures requires an explicit product-scope/version revision and updated acceptance plan; an implementation agent cannot silently omit the feature to close the gate.

### 9.3 Dynamic text and overflow

Dynamic Text must render live against Example or Render Dataset values using the same pinned fonts, measurement authority, line breaks, and geometry used for PDF. Each text frame must have one explicit policy:

- wrap in a fixed frame;
- clip and emit the declared warning;
- bounded shrink to a declared minimum;
- grow only along an allowed constraint and only when the page/region can absorb it;
- continue semantically to a declared target; or
- fail publication on overflow.

Overflow, stale measurement, missing glyph/font, continuation gaps, and text outside the page must be visible on Canvas, in Contents/Properties where relevant, and in Diagnostics. Shrink success and continuation success remain auditable. There is no silent clipping and no rasterization escape.

### 9.4 Styles and components

Named Styles own supported typography, fill, stroke, border, opacity, and related visual properties. A Component is a reusable semantic subtree with stable internal identities and declared override points. Detach, replace, and update operations must disclose ownership, scope, affected instances, and undo consequence. Mixed-selection property editing must distinguish common, mixed, unavailable, inherited, and locally overridden values.

Styles and Components are project/template material, never executable plug-ins. Their identities and references must survive package round-trips and deterministic migration.

## 10. Data Tracks, columns, and pagination

A Data Track owns one depth transform, one ordered set of shared intervals, zero or more explicitly configured numeric axes, shared grid/interval bars, and ordered Data Layers. Every numeric point/range Data Layer references exactly one compatible numeric axis in its owning track. An interval-only layer may be axisless and uses the track's depth/interval geometry. A Data Layer owns a semantic series and rendering style; it must not duplicate an axis or interval bar merely because another layer exists.

Numeric layers may share an axis only when their declared units and semantics are compatible. Moisture content, plastic limit, and liquid limit may share a percent axis when provenance and units permit. SPT N-value uses a distinct configured axis. Axis ranges are explicit; v0.9 must not silently autoscale, infer units, or jitter coincident values.

Intervals use clipped half-open page ownership, with final endpoint inclusion. A point outside its configured domain renders at the nearest edge only when the accepted policy permits it and always emits the declared Diagnostic. Incompatible data/axis bindings are errors.

Columns are semantic layout containers, not flattened drawing coordinates. Page continuation must preserve column ownership, shared depth transform, interval boundaries, accessibility order, and data-to-page provenance. Header/footer editing and Log Column insertion must remain live on the actual page so users can see and resolve overruns before publication.

## 11. Diagnostics and publication policy

### 11.1 Diagnostic model

Every Diagnostic must have a stable rule ID, category, severity, blocking scope, affected semantic identities, source/provenance reference where applicable, input digest, human-readable cause, corrective actions, acknowledgment/suppression eligibility, and accessibility announcement metadata.

Severity is exactly:

- **Error** — a known condition that makes the affected publication result invalid, unsafe, or unverifiable. A reachable Error blocks publication.
- **Warning** — publication may proceed only after exact-candidate acknowledgment or an active allowlisted suppression.
- **Information** — visible/auditable context that does not gate publication.

Categories use stable prefixes for Source, Data, Integrity, Template, Binding, Text, Layout, Font, Asset, Document, Publication, Export, Security, and Recovery conditions. Severity, domain consequence, and blocking scope are independent axes.

Reachability is semantic. A page/subset export may ignore an unrelated page-local Diagnostic only when no document-global source, package, security, lifecycle, template, shared-style, shared-font, shared-asset, shared-axis, or shared-data dependency reaches the selected output.

### 11.2 Acknowledgment and suppression

Acknowledgment is transient, nondirty, and bound to one immutable Publication Candidate and exact Diagnostic fingerprint. There is no blind **Acknowledge All**. Any user performing publication may acknowledge a Warning after reviewing its cause. A firm policy may narrow that authority.

Suppression is a project edit: dirtying, undoable, visible, attributable, rationalized, and bound to exact rule, object identity, cause class, and relevant input digest. It expires when relevant input changes and is never global. Any project editor may create or remove an allowed suppression; a firm policy may narrow that authority.

Only these warning families are suppressible in v0.9:

1. intact ETR whose originating template library is missing or changed;
2. deliberate explicit text clipping;
3. configured out-of-domain Data Layer edge marker;
4. potential, not proven, layout collision;
5. approved neutral hatch fallback; and
6. omitted optional decorative asset.

All other Warnings are acknowledgment-only. Errors are never suppressible or acknowledge-to-bypass. The Diagnostic policy must not allow a generic extension to silently create new suppressible families.

### 11.3 Minimum normative outcomes

The following are publication-blocking Errors when reachable: unavailable required source-backed value, conflicted/orphan Override, unresolved Source Resolution Decision, incompatible axis/unit, identity/relationship/page-coverage defect, missing/ambiguous template assignment, unusable ETR, Example Dataset in an authoritative publication, invalid binding, unproven text measurement, unresolved overflow, missing font/glyph/embedding, unapproved fallback, invalid required asset, package trust/integrity/lifecycle conflict, candidate mutation, export-engine failure, accessibility-structure failure, invalid destination, and uncertain or unverified output. A required collection failure during Refresh blocks Candidate acceptance; it does not replace the prior accepted Snapshot.

The following remain visible without falsifying their nature: active Overrides/Annotations and successful shrink/continuation are Information; known nonfinal inclusion/exclusion is at least acknowledgment-only Warning; an intact ETR with unavailable library provenance is the allowlisted Warning; optional unbound collection failure is Warning during Refresh review and Information after deliberately accepted exclusion; age/offline status alone is Information.

The stable v0.9 rule families are:

| Rule / condition | Outcome | Disposition and required result |
|---|---|---|
| `SOURCE_REQUIRED_COLLECTION_FAILED` | Error; Refresh acceptance | Reject the complete Candidate; prior Snapshot is unchanged. |
| `SOURCE_OPTIONAL_COLLECTION_FAILED` | Warning during Refresh; Information after accepted exclusion | Refresh-review acknowledgment only; preserve a failed envelope and never stale-merge. A later binding makes successful retrieval required. |
| `SOURCE_ACCEPTED_SNAPSHOT_OLDER_THAN_KNOWN_STATE` | Publication Warning | Exact-candidate acknowledgment only; record accepted identity/time and the known newer/pending/rejected/failed condition. |
| `SOURCE_SNAPSHOT_AGE` / offline without newer-state evidence | Information | Show provenance/time; never trigger Refresh. |
| `DATA_REQUIRED_VALUE_UNAVAILABLE` | Error | Preserve exact absent/null/empty/malformed/ambiguous/finality/unit state; never coerce to zero, blank success, final, or a prior value. |
| `DATA_REVIEW_VALUE_EXCLUDED` | Publication Warning | Exact-candidate acknowledgment; retain exact identities and exclusion rule. |
| `DATA_OPTIONAL_EMPTY_POLICY_APPLIED` | Information | Apply only the authored optional empty policy. |
| `DATA_SOURCE_EXTENSION_SEMANTICS_UNTYPED` | Publication Warning | No default placement. Only a deliberate explicit binding may invoke an allowlisted safe generic formatter over the inert value/type/provenance envelope; exact-candidate acknowledgment is required. |
| `DATA_SOURCE_RESOLUTION_UNRESOLVED`, `DATA_OVERRIDE_CONFLICT`, `DATA_OVERRIDE_TARGET_ORPHANED` | Error | Require exact explicit resolution; no silent/fuzzy choice. |
| `DATA_OVERRIDE_ACTIVE`, `DATA_ANNOTATION_ACTIVE` | Information + Audit trigger | Keep source truth and project presentation visibly distinct. |
| `DATA_OUT_OF_DOMAIN_EDGE_MARKER` | Publication Warning | Allow exact narrow suppression; retain original value/identity and edge direction. |
| `DATA_QUANTITY_UNIT_SCALE_INCOMPATIBLE` | Error for affected layer | Do not paint the invalid layer or infer conversion/axis. |
| `INTEGRITY_IDENTITY_OR_RELATION_INVALID`, `INTEGRITY_DUPLICATE_OR_DROPPED_SOURCE`, `INTEGRITY_PAGE_SOURCE_COVERAGE_INVALID` | Error | Block affected assembly/publication; display labels/order/depth cannot substitute for identity. |
| `TEMPLATE_ASSIGNMENT_MISSING_OR_AMBIGUOUS` | Error | Require one exact effective assignment. |
| `TEMPLATE_ETR_REQUIRED_CONTENT_INVALID` | Error | Do not fall back to a library item; require exact repair/replacement. |
| `TEMPLATE_LIBRARY_ENTRY_MISSING_OR_CHANGED_ETR_INTACT` | Publication Warning | Allow exact narrow suppression; continue using the intact ETR. |
| `TEMPLATE_EXAMPLE_DATA_IN_AUTHORITATIVE_PUBLICATION` | Error | Reject the Candidate. |
| `BINDING_TARGET_MISSING`, `BINDING_TOKEN_MALFORMED`, `BINDING_CARDINALITY_INVALID`, `BINDING_FORMATTER_FAILED`, `BINDING_CONVERSION_UNSUPPORTED` | Error unless an explicit optional empty policy owns the case | Do not guess path, aggregate, unit, delimiter, or formatter. |
| `TEXT_MEASUREMENT_UNPROVEN_OR_STALE` | Error | Remeasure with exact qualified engine/font/scene digests. |
| `TEXT_CLIPPED_BY_EXPLICIT_POLICY` | Publication Warning | Allow exact narrow suppression; preserve inspectable consumed/remaining source ranges. |
| `TEXT_OVERFLOW_AT_MINIMUM`, `TEXT_GROW_CONSTRAINT_FAILED`, `TEXT_CONTINUATION_INCOMPLETE`, `TEXT_CONTINUATION_GAP_DUPLICATE_CYCLE`, explicit fail policy | Error | Preserve content and authored geometry; repair before export. |
| `TEXT_SHRINK_APPLIED_WITHIN_DECLARED_MINIMUM`, successful lossless continuation | Information | Report effective size/source ranges. |
| `LAYOUT_REFERENCE_DEPTH_RANGE_INVALID`, `LAYOUT_POINT_OR_INTERVAL_OWNERSHIP_INVALID`, `LAYOUT_PAGE_PLAN_INCOMPLETE` | Error | Enforce complete half-open ranges, deeper-boundary ownership, and terminal inclusion. |
| `LAYOUT_AXIS_MISSING_OR_INCOMPATIBLE`, `LAYOUT_REQUIRED_CONTENT_OUTSIDE_PAGE_OR_REGION`, `LAYOUT_PAGE_SIZE_OR_MIXED_SIZE_UNSUPPORTED` | Error | Do not infer/rescale/omit to fit; require exact repair or a qualified output path. |
| `LAYOUT_POTENTIAL_COLLISION` | Publication Warning | Allow exact narrow suppression for the same identities and geometry digest. |
| `FONT_FACE_MISSING`, `FONT_IDENTITY_UNPROVEN`, `FONT_GLYPH_MISSING`, `FONT_EMBEDDING_PROHIBITED`, `FONT_LAYOUT_BINDING_MISMATCH` | Error | Require approved face/digest, glyph coverage, remeasurement, and rights. |
| `FONT_APPROVED_FALLBACK_USED` | Information | Only an allowlisted digest-bound fallback after full remeasurement; record requested/effective face. |
| `ASSET_REQUIRED_MISSING`, `ASSET_DIGEST_OR_MEDIA_INVALID`, `ASSET_RIGHTS_UNPROVEN`, `ASSET_DECODER_UNAVAILABLE` | Error | Do not decode, transform, bundle, or publish it. |
| `ASSET_NEUTRAL_HATCH_FALLBACK_USED`, `ASSET_OPTIONAL_DECORATION_OMITTED` | Publication Warning | Allow exact narrow suppression; neutral hatch must not imitate vendor artwork, and optional omission cannot cover semantic content. |
| `DOCUMENT_PACKAGE_UNTRUSTED_OR_CORRUPT`, `DOCUMENT_REQUIRED_PART_OR_FEATURE_UNSUPPORTED`, `DOCUMENT_IDENTITY_CONFLICT`, `DOCUMENT_EXTERNAL_CHANGE`, `DOCUMENT_RECONCILIATION_REQUIRED` | Error | Use the exact lifecycle/compatibility command; Compare cannot clear the gate. |
| `SECURITY_ACTIVE_CONTENT_OR_EXTERNAL_REFERENCE`, `SECURITY_PATH_TRAVERSAL_OR_REPARSE_ESCAPE`, `SECURITY_CREDENTIAL_OR_SECRET_PRESENT`, `SECURITY_UNTRUSTED_NATIVE_CONTENT` | Global Error | Reject/contain before privileged work and redact feedback. |
| `SECURITY_RESOURCE_HARD_LIMIT_EXCEEDED` | Operation Error | Fail early and bounded; #42 supplies the approved numeric ceilings. |
| `SECURITY_RESOURCE_WARNING_THRESHOLD` | Publication Warning | Exact-candidate acknowledgment only; #42 supplies thresholds below hard ceilings. |
| `RECOVERY_LOW_SPACE`, `RECOVERY_PROTECTED_OVER_BUDGET` | Recovery Warning only | Follow recovery commands; do not make this a PDF gate. |
| `RECOVERY_CANDIDATE_TOO_LARGE`, `RECOVERY_WRITE_SUSPENDED`, `RECOVERY_DELETE_FAILED` | Recovery-operation Error only | Keep document/lifecycle outcomes distinct; block PDF only if an independent export rule exists. |
| `PUBLICATION_PREFLIGHT_INCOMPLETE_OR_STALE`, `PUBLICATION_UNQUALIFIED_ENGINE_OR_CONFIGURATION` | Error | Rebuild the exact Candidate or use the qualified engine/configuration. |
| `PUBLICATION_PAGE_COUNT_GEOMETRY_OR_SCENE_MISMATCH`, `PUBLICATION_TEXT_VECTOR_OR_FONT_MISMATCH`, `PUBLICATION_TAG_LANGUAGE_ORDER_OR_ALT_TEXT_INVALID` | Verification Error | Reject output; no independent reflow, flattening, or untagged escape. |
| `PUBLICATION_AUDIT_REQUIRED_BUT_UNAVAILABLE` | Error | Do not publish until the exact Audit can be bound. |
| `EXPORT_DESTINATION_INVALID_OR_UNSUPPORTED`, `EXPORT_PERMISSION_LOCK_SPACE_FAILURE`, `EXPORT_TARGET_CONFLICT` | Destination Error | Preserve existing output; require a new destination or exact replace authority. |
| `EXPORT_CANCELLED_SAFE` | Information outcome | State that no Log Document was published and remove only job-owned temporary output. |
| `EXPORT_FAILED_BEFORE_COMMIT`, `EXPORT_OUTCOME_UNCERTAIN`, `EXPORT_COMMITTED_BUT_VERIFY_FAILED` | Error outcome | Never announce success; preserve/reconcile exact target state. |
| `EXPORT_VERIFIED_SUCCESS` | Information outcome | Emit only after final reopen/verification with path, digest, page/sizes, revision, warning count, and Audit state. |

An unknown rule code is never treated as suppressible. An unsupported newer rule fails closed according to its declared domain consequence.

## 12. Preflight and PDF publication

### 12.1 Immutable Publication Candidate

Starting preflight freezes a Publication Candidate containing document revision, selected Boring Logs/pages, page plan, Render Dataset digest, ETR/style/component/font/asset digests, resolved bindings, text measurements, scene graph, applicable Diagnostics, suppressions, acknowledgments, destination intent, and export settings. Later project edits must not mutate the active Candidate.

Preflight must evaluate the exact Candidate intended for export. It must show Errors first, then unacknowledged Warnings, then acknowledged/suppressed Warnings and Information. Export becomes available only when the Candidate has no reachable Error and every reachable Warning is acknowledged or covered by a valid allowlisted suppression.

### 12.2 Output requirements

Every v0.9 Log Document must:

- use the user-selected supported page sizes and orientations from its page plan;
- preserve vector geometry and selectable text where semantically text;
- embed/subset approved fonts as required by their licenses;
- be tagged with primary document language, semantic reading order, page/region structure, and descriptions for meaningful non-text graphics;
- preserve the same fixed line breaks, pagination, and geometry proven by the Layout Host;
- contain no hidden Example Dataset or secret/source token material; and
- pass deterministic structural, geometry, text-coverage, font, and accessibility checks before success is reported.

Tagged accessible PDF is the v0.9 target, not an optional “safe mode.” Full-page raster fallback and untagged export are rejected. Authored raster picture elements may remain raster assets if admitted and described; they do not authorize flattening the page.

### 12.3 Destination and failure

The user selects an explicit supported local `.pdf` destination. **Create New** is the default. **Replace Existing** is distinct, requires explicit confirmation/authority, and repeats the final identity/race check. Export must use sibling temporary output, flush, validate, execute the destination adapter's qualified commit sequence, reopen, and verify final identity before reporting success. Product language is **verified publication on a qualified destination**, never an unqualified claim of atomic export. If the destination has no qualified replacement mechanism, **Replace Existing** is unavailable and the user must choose Create New or another destination.

Cancel must stop at a safe boundary, preserve the project, remove owned partial output, and report cancellation. Definite failure must preserve any pre-existing target. Uncertain outcome must not be labeled success and must provide inspection/retry/save-to-new-location actions.

RSrender stores no hidden archive of old templates or PDFs. A later template edit may make a previous PDF non-reproducible; the product must not imply otherwise.

### 12.4 Publication Audit

A Publication Audit is mandatory when the Candidate contains any Warning, acknowledgment, suppression, Override, Source Resolution Decision, Annotation, neutral fallback, known nonfinal exclusion, untyped extension, or organization-policy exception. It is optional only for a clean Candidate.

The Audit records identities/digests and policy outcomes, never credentials or unnecessary client content. It must state source snapshot provenance, active project decisions, warning disposition, approved fonts/assets, application/build/layout-engine identity, export verification, and controlled-environment classification.

The v0.9 representation is a canonical UTF-8 JSON sidecar named `<pdf-basename>.rsrender-publication-audit.json` in the same destination directory. When required or selected, the PDF and sidecar form one **Publication Bundle**. The PDF carries a stable Publication ID and audit-required marker in its metadata; the sidecar carries the same Publication ID plus the final PDF filename, SHA-256 digest, Candidate digest, and audit payload. This avoids a circular hash dependency. Publication succeeds only after both final files reopen, the PDF digest matches the sidecar, and both Publication IDs match. Audit embedding inside the PDF is deferred and must not be chosen by an implementation agent.

Both files are staged and validated before destination commit. The qualified destination adapter must support coordinated Create New for the pair and, before enabling Replace Existing, coordinated replacement/reconciliation for the pair. It commits the sidecar before the PDF so a lone PDF is never announced as an audited Log Document. Any partial, collision, delete failure, post-commit verification failure, or unknown pair state is `EXPORT_OUTCOME_UNCERTAIN`: no success is announced, exact surviving artifacts are shown, and the user receives inspect, remove-safe-artifacts, retry, or publish-to-new-basename actions. If the adapter cannot prove the pair contract, audited publication and Replace Existing are unavailable on that destination.

## 13. File packages, migration, and recovery

Log Project and Log Template packages must use the accepted constrained ZIP profile, owned path namespace, required manifest and digest coverage, strict quotas, canonical write order, schema validation, migration registry, and validated replacement with classified uncertainty/reconciliation on supported storage as defined by the architecture and ADRs. No crash- or power-loss-durability claim is made before #36 passes. Duplicate or ambiguous paths, unsafe names, links/reparse tricks, active content, unsupported required extensions, and manifest/digest mismatches are rejected before domain hydration.

Newer unsupported packages open only through an explicit safe read-only path when possible. Older supported packages migrate in memory with a preview/audit; the original file remains untouched until a separately verified Save/Save As. Unknown optional extensions may round-trip opaquely only within their declared safe boundary and must generate the applicable publication Warning.

Recovery must implement the accepted [recovery, retention, and privacy policy](recovery-retention-privacy-policy.md), including its fixed debounce/retry/retention/space values, full-package validation, per-user isolation, encryption attestation, startup cleanup, disclosure, and uninstall preservation default. Recovery remains disabled when the storage/profile/security preconditions are not proven. Recovery failure is prominent but does not by itself block publication unless it creates a separate lifecycle, integrity, or export defect.

Software update rollback must never roll back or replace user files. Update waits for the same multi-document close gate as Quit and preserves recovery material independently of executable rollback.

## 14. Security, privacy, provenance, and commercialization

### 14.1 Security boundary

The Electron main process owns filesystem, package, recovery, source integration, publication, and privileged job authority. Renderers and the sandboxed Chromium Layout Host receive least-privilege semantic messages through schema-validated IPC. Node integration is off; context isolation and sandboxing are on. Navigation, popups, permissions, protocols, CSP, and external links are deny-by-default/allowlisted.

Electron 43.4.0 is the development-qualification baseline accepted by the architecture evidence. A production build must lock the exact Electron/Chromium patch it qualifies; changing that patch reopens renderer, PDF, sandbox, packaging, and accessibility evidence rather than silently inheriting an old result.

Untrusted package content and RSLog/source text are data. They must not become HTML, script, URL navigation, executable style, filesystem path authority, IPC method, or command line. The product must stay usable without remote web content.

### 14.2 Privacy

Logs and support bundles default to metadata, stable error codes, counts, timings, redacted paths, and digests. They must exclude credentials, tokens, full source payloads, client names, borehole descriptions, comments, laboratory values, rendered page images, template contents, and document text unless a separately approved, previewed, consented diagnostic operation includes a minimum necessary excerpt.

There is no default telemetry or automatic upload. Recent Files, thumbnails/previews, crash artifacts, recovery, temp files, and Publication Audits are classified owned state with explicit retention and cleanup rules.

Structured element Copy/Paste uses an application-private in-memory clipboard so client-bearing fragments, bindings, admitted assets, and provenance do not enter Windows clipboard history or cloud clipboard. It works across open RSrender documents in the current process, is replaced by the next structured Copy, contains no credentials or reusable paths, and is cleared on Sign Out, Close All, Quit, update restart, or application crash/exit. It is not persisted or recovered.

Plain-text Paste into a focused text or eligible bound-value editor may read the current OS clipboard only after the user invokes Paste; input is bounded, treated as untrusted, and retained only in the resulting edit/Override if committed. **Copy Text** and **Copy Path** are separately named deliberate commands that may write escaped plain text to the OS clipboard after showing that Windows clipboard history/sync or other applications may retain it. RSrender cannot guarantee deletion from OS clipboard history, cloud sync, another process, or a clipboard manager and never describes clearing its in-process buffer as clearing those external residues.

### 14.3 Clean-room and rights

All code and assets require provenance. ArcGIS behavior research may inform atomic capability requirements but not code, proprietary assets, branding, or trade dress. RSLog access must remain within customer/vendor rights and approved interfaces; undocumented endpoint evidence is not a production authorization. Fonts, hatches, symbols, pictures, fixtures, and examples require redistribution/use rights or must be replaced with clean synthetic or approved open material.

Branding must be configurable so a later commercial transaction does not require a domain rewrite. The current MIT history permits sale but limits exclusivity of already published copies; implementation and commercialization remain subject to the ownership/licensing gates and counsel/employer decisions in the licensing brief.

## 15. Accessibility and usability

Keyboard and assistive-technology access are product requirements, not optional polish. Every workflow must provide:

- a complete keyboard path, predictable focus order, visible focus, and focus restoration;
- programmatic names, roles, states, relationships, group depth, selection count, Key Element, local/effective visibility/lock, and command availability;
- no color-only state or transient-only error communication;
- zoom/reflow/high-contrast behavior that does not hide required commands or status;
- reduced-motion-compatible feedback;
- accessible menus, dialogs, trees, tables, numeric editors, drag/reorder alternatives, and live-region announcements;
- validation tied to the affected object with an actionable correction path; and
- an accessible PDF reading order derived from semantic structure, not visual coordinate guessing.

Pointer dragging must always have a keyboard command equivalent. Context-menu parity must include keyboard invocation. Focus must not jump silently after deletion, reparenting, page change, dialog close, undo/redo, or Diagnostic navigation.

Controlled accessibility acceptance under #34 and #40 remains required. Until it passes, the product must not claim conformance merely because semantic hooks exist.

## 16. Performance and supported workload

The accepted [minimum-endpoint workload and performance envelope](minimum-endpoint-workload-performance-envelope.md) is normative. The supported v0.9 floor is a qualifying Windows 11 x64 endpoint with 4 cores/8 threads, 16 GiB installed and at least 8 GiB available at launch, hardware-accelerated DX12-class integrated graphics, local SSD with at least 10 GiB free, and a 1920×1080 display at supported 100–150% scaling. The primary qualification scale is 125%.

Minimum, Typical, and Large synthetic workload classes are supported promises. The bounded Adversarial class is a diagnostic probe, not a support promise. Correctness invariants—including hit testing, source-range preservation, fixed line breaks, pagination, undo, cancellation, and semantic equivalence—must pass before timing results count.

The budgets in the performance envelope are fixed acceptance thresholds and must not be weakened after results. #30 must still produce valid controlled evidence; no current prototype run is a performance pass. If qualification fails, the product must reduce admitted scope or change implementation and rerun the same envelope rather than silently relabel the hardware or workload.

## 17. Internal rollout and operations

Rollout is gated, not date-driven:

1. **Development qualification:** synthetic Example Dataset only; architecture, renderer, file, recovery, security, accessibility, and performance evidence complete enough to support a controlled build.
2. **Controlled internal pilot:** firm-approved endpoints and storage; named template maintainers and publishers; privacy-safe support procedure; no production claim beyond explicitly accepted gates.
3. **Firm-wide internal availability:** installer/update/rollback, records/privacy/security, recovery, minimum-endpoint, accessibility, publication, and source-contract gates approved for the approximately 30-person firm.
4. **External/commercial evaluation:** separate ownership/licensing, product-support, branding, contracting, privacy, security, and vendor/API authorization review. Internal acceptance does not imply this gate passes.

The firm chooses pilot membership and may narrow acknowledgment/suppression authority; those are organizational controls, not hidden application behavior. The application must expose policy configuration and audit outcomes rather than hard-code employee names.

User documentation must cover the current-only template model, offline/source timestamps, Refresh acceptance, Override versus source correction, Diagnostic dispositions, recovery limits, unsupported storage, and the fact that successful export does not create historical project/template versions.

## 18. Controlled acceptance scenarios

### S-01 — New offline-editable project

Given a user creates a Log Project and deliberately selects a source project, when a complete Candidate is accepted and the project is saved, then the package contains the accepted source material and current ETRs and can reopen, render, edit, preflight, and export without a network connection.

### S-02 — Multi-template Log Set

Given a project default template, a group-specific template, and an exploration-specific template, when assignments are evaluated, then each Boring Log shows exactly one effective template and its assignment origin; same-scope duplicates or missing effective assignments are Errors.

### S-03 — Shared edit and deliberate divergence

Given two explorations reference one ETR, when the maintainer changes a column width, both update live. When the user invokes Save as Separate Template and reassigns one exploration, subsequent edits diverge without mutating the original library template.

### S-04 — Refresh with partial failure

Given an accepted Snapshot, when a required collection fails, then the Candidate is rejected and current authoring state is unchanged. When only a declared optional unbound collection fails and the user accepts that explicit outcome, the accepted Snapshot records `failed` for that collection without stale merging.

### S-05 — Source change conflicts with Override

Given an Override whose baseline field changes on accepted Refresh, then the Override becomes conflicted, the original source provenance remains visible, and publication is blocked until explicit resolution. The system never retargets it by label or proximity.

### S-06 — Live text overflow

Given short and long synthetic values, when a bound text frame renders, then Canvas and PDF use the same font/line breaks/geometry. Clip emits its warning; shrink stops at its minimum; continuation uses its semantic target; unresolved overflow blocks export.

### S-07 — Shared graph axes

Given moisture, PL, and LL layers with compatible percent units and an N-value layer, when bound to one Data Track, then the percent layers share one declared axis and intervals, N-value uses its own axis, and no layer duplicates shared axes or bars.

### S-08 — External conflict during work

Given an external file change, then mutations freeze. Compare changes no state. Only verified Reload External, verified Save As, or eligible deliberate Replace External releases the freeze.

### S-09 — Warning-governed publication

Given a Candidate with explicit clipping and a known newer rejected source Candidate, then clipping may use an exact project suppression while the source warning requires exact-candidate acknowledgment. Any changed input invalidates the applicable disposition.

### S-10 — Cancelled, failed, or uncertain export

Given a pre-existing target, a safe pre-commit cancellation or definite pre-commit failure proves the old target remains intact, removes only verified job-owned partial output, leaves the project editable, and never announces success. If commit may have begun or final verification fails, the result is uncertain: RSrender makes no old/new target claim, preserves reconciliation evidence, identifies the exact PDF/Audit artifacts involved, and offers inspection, safe removal where provable, retry, or publication to a new basename.

### S-11 — Recovery after crash

Given a valid Recovery Candidate on an approved managed profile, after restart the user can inspect, **Open Separately**, or discard it. The candidate retains its candidate identity and captured-document/recovery-origin metadata; Open Separately creates a new untargeted dirty document with a new Document Identity and inert recovery-origin provenance, and never overwrites the original document's Authoritative File. Recovery cleanup follows the accepted policy.

### S-12 — Privacy-safe controlled reconstruction

Given separate organizational approval for a restricted internal visual reference, a trained human or supervised agent may start from a blank Log Template and use only supported public commands/properties to reconstruct semantic regions, columns, elements, Data Tracks, styles, and sanitized bindings. Every result must remain normally editable; a reference image cannot be used as the page background or shipped as an asset. Acceptance compares semantic structure, editability, page geometry, text/data coverage, and toleranced PDF output—not screenshots alone. Restricted references, client content, and derived raw excerpts must not be committed, uploaded, quoted, or converted into Example Dataset fixtures. This scenario does not require or authorize a v0.9 MCP interface.

### S-13 — Accessible keyboard authoring

Given a keyboard-only user, every Canvas selection, Key Element change, tree reorder/reparent, numeric property edit, context-menu command, Diagnostic navigation, preflight disposition, and export action can be completed with announced state and restored focus.

## 19. Product invariants

| ID | Invariant |
|---|---|
| PI-01 | RSrender never writes to RSLog in v0.9. |
| PI-02 | Exactly one Source Context Identity and Source Project exist per Log Project. |
| PI-03 | No Render Dataset is derived from an unaccepted Source Snapshot Candidate. |
| PI-04 | Candidate acceptance atomically replaces the complete Source Snapshot or changes nothing. |
| PI-05 | Source fact, Source Resolution Decision, Override, and Annotation never collapse into one provenance class. |
| PI-06 | Every included Exploration has exactly one membership and one effective template. |
| PI-07 | Editing one ETR affects every assignment referencing it; divergence creates a new identity explicitly. |
| PI-08 | Projects contain current template material only; no hidden historical-reproduction promise exists. |
| PI-09 | Canvas, PDF, hit testing, and overflow use the same accepted layout geometry and fixed line breaks. |
| PI-10 | A reachable Error always blocks publication; no acknowledgment or suppression bypasses it. |
| PI-11 | Only the six enumerated Warning families may be suppressed. |
| PI-12 | Publication operates on one immutable Candidate and reports success only after final verification. |
| PI-13 | Example Dataset data never enters an authoritative publication. |
| PI-14 | Authoritative Files are never stored in app-owned Recovery Candidate stores, installer/update areas, or temporary areas. |
| PI-15 | Recovery and update rollback never silently replace or roll back an Authoritative File. |
| PI-16 | Credentials/tokens never persist in product artifacts or diagnostic output. |
| PI-17 | Text that is semantic text remains selectable/tagged text; there is no full-page raster escape. |
| PI-18 | Every pointer-only layout operation has a keyboard equivalent and observable state. |
| PI-19 | Zero, null, absent, empty, failed, nonfinal, and unassociated states remain distinguishable. |
| PI-20 | Unsupported or unproven capabilities fail explicitly; they do not degrade silently. |

## 20. Requirement-level acceptance statements

| ID | Acceptance statement | Proof owner |
|---|---|---|
| AC-001 | New/Open/Save/Save As/Close/Quit/Recent/dirty/conflict/recovery behavior conforms to the lifecycle state/command tables, including edit-during-save and multi-document final recheck. | Implementation tests; #26 verification |
| AC-002 | A saved Log Project reopens offline with identical accepted source identity, current ETRs, Log Set order, assignments, Overrides, Annotations, and layout semantics. | Corpus round-trip oracle; #26 |
| AC-003 | Assignment precedence resolves all project/group/exploration variants deterministically and rejects duplicates/ambiguity. | Domain/property tests; FX-10/FX-11 |
| AC-004 | Refresh never mutates accepted state before explicit acceptance, never creates a candidate Render Dataset, and records every collection outcome independently. | Source Adapter contract tests; #43/source gate |
| AC-005 | Source baseline, resolution, override, annotation, provenance, value state, association, finality, and eligibility survive package and refresh round-trips without collapse. | FX-03–FX-14 semantic oracles |
| AC-006 | Production and Advanced Design workspaces expose their required surfaces while preserving identical document/selection/undo state. | UX command-state tests; controlled usability |
| AC-007 | Contents order equals render order; Canvas/Contents share Selection and Key Element; pointer and keyboard reorder/reparent yield identical transactions. | #18/#30 interaction tests; #26 |
| AC-008 | Canvas and Contents context menus expose identical element commands and state, including complete text-box styling and data-specific commands. | Command registry snapshot + accessibility tests |
| AC-009 | Short/long/dense Dynamic Text has identical fixed line breaks, glyph bounds, pagination, overflow outcome, and source-range coverage on Canvas and verified PDF. | #17 evidence; FX-02/FX-06; #26 |
| AC-010 | Data Tracks share intervals/axes correctly across MC/PL/LL and retain a separate N-value axis; page-boundary and out-of-domain behavior matches the domain model. | Canonical FX-12/FX-10 plus FX-09 missing/value-state and boundary cases exercised by #26 L06 |
| AC-011 | Every Diagnostic has stable identity, severity, scope, cause, actions, and accessibility feedback; only the six listed Warning families accept project suppression. | Taxonomy contract tests; #26 |
| AC-012 | Preflight recomputes the immutable Publication Candidate and blocks every reachable Error and undisposed Warning without allowing blind acknowledgment. | Publication state-machine tests; #26 |
| AC-013 | Verified PDF preserves page geometry, selectable tagged text, primary language, semantic order, descriptions, font embedding, source-range coverage, and digests. | Structural/PDF/accessibility validators; #17/#26/#40 |
| AC-014 | Export cancellation, failure, uncertain outcome, Create New, and Replace Existing preserve prior files and produce accurate accessible feedback. | Fault injection and lifecycle tests; #26 |
| AC-015 | Constrained package validation rejects ambiguous/unsafe paths, active content, quota excess, digest/schema/trust failures, and unsupported required extensions before hydration. | Selected package evidence #33; package/parser/native/resource acceptance #26/#37/#42; storage mechanics #36 |
| AC-016 | Credentials and source/client content do not appear in project-unrelated logs, Recent Files, structured crash annotations, support bundles, Publication Audits, or default telemetry; raw dump upload/support inclusion remains disabled absent the separately approved custody/canary gate. | Security/privacy inspection; #36/#37/#38/#39 |
| AC-017 | Recovery runs only on an approved isolated profile/storage configuration and matches the accepted timing, quota, retention, cleanup, and uninstall rules. | #36/#37/#39 controlled evidence |
| AC-018 | Minimum/Typical/Large workloads pass correctness and fixed performance budgets on a valid minimum endpoint without relabeling scope after measurement. | #30 controlled benchmark |
| AC-019 | Keyboard-only and assistive-technology users can complete the declared authoring/publication workflows with named state, focus restoration, and non-color feedback. | #34/#40 controlled acceptance |
| AC-020 | No production artifact incorporates restricted client references; controlled reconstruction uses supported commands, sanitized data, editable semantics, and controlled comparison evidence. | Privacy/provenance review; controlled acceptance gate |

## 21. Codeable behavior versus evidence and release gates

| Area | Product behavior fixed here | Evidence/release dependency that remains |
|---|---|---|
| Domain and project semantics | Cardinalities, identity, assignment, Candidate/Snapshot/Render Dataset, Overrides, Annotations, Data Tracks | #43 must prove still-unknown source shapes; unknown collections remain unavailable rather than invented. |
| UX and commands | Required panes, commands, selection, tree, direct manipulation, Properties, context parity, diagnostics | #34/#40 must validate accessibility/usability; #30 must validate performance. |
| Renderer and PDF | One Chromium layout authority, fixed lines/geometry, DOM/SVG, tagged selectable PDF, no raster escape | #17 fixed the direction; #26 L/X acceptance rows remain non-pass until executed, while live #34/#37/#40/#43 gate observed accessibility, packaged/native behavior, and font/asset qualification. |
| Packages and lifecycle | Constrained ZIP, local NTFS, verified save/export, conflict and recovery states | #36/#37/#39 must prove storage/profile/installer environment; #26 verifies faults. |
| Security/privacy | Sandboxed topology, session-only auth, deny-by-default content, privacy-safe diagnostics | #36–#39 and #42 require controlled review/approval. |
| Performance | Supported envelope and immutable budgets | #30 must produce a valid-environment pass. Current incomplete/invalid runs are not acceptance evidence. |
| Internal rollout | Gated sequence and required support disclosures | Firm IT, security, privacy/records, publication QA, and accessibility approvals remain organizational gates. |
| Commercial option | Configurable branding, provenance and clean-room posture | #28/licensing and employer/counsel/vendor-rights decisions must pass before commercialization. |
| Agentic use | Transport-neutral command seam; privacy-safe supervised acceptance scenario | Production MCP/agent interface is explicitly post-MVP and requires separate threat, consent, audit, and authorization design. |

Implementation may begin on codeable behavior only when the architecture/licensing gate permits it. A blocked proof does not authorize a silent fallback. Conversely, an external gate must not be encoded as an undefined product choice when behavior is already fixed here.

## 22. Deferred, rejected, and conditional capabilities

| Capability | v0.9 disposition | Revisit condition |
|---|---|---|
| RSLog write-back | Rejected | Separate product authorization, threat model, vendor rights, and domain design. |
| Automatic/background Refresh | Rejected | Separate opt-in workflow with provenance and conflict design. |
| Template/output version history | Rejected | Separate storage/retention/reproduction product decision. |
| Production MCP/agent server | Deferred post-MVP | Transport-neutral command API, authorization, consent, audit, privacy, and safety gates. |
| Collaborative/cloud projects | Deferred | Server, identity, conflict, records, and privacy architecture. |
| macOS/Linux | Deferred | Platform qualification and packaging program. |
| Direct OS printing / tiling | Deferred | Use verified PDF plus the operating system or approved PDF tool; direct print requires its own device, scaling, cancellation, and integrity proof. |
| Full-page raster PDF fallback | Rejected | No planned revisit; conflicts with text/accessibility requirement. |
| Untagged PDF mode | Rejected | No planned v0.9 escape; fix the accessibility defect. |
| Arbitrary plug-ins/scripts/macros | Rejected | Separate signed extension security model. |
| Independent raster render path | Deferred | Only if future product scope supplies a renderer-neutral evidence case; not an export failure escape. |
| Vendor-specific unknown lab/interim/piezometer/hatch shapes | Conditional unavailable | #43 or authorized contract evidence admits them. |
| Picture elements | Required but gated | Approved decoder, asset rights, security, PDF, and recovery qualification. |
| Remote authoritative storage | Rejected for v0.9 | Explicit remote-filesystem conflict/durability qualification. |
| Historical exact reproduction | Not promised | Would require explicit immutable project/template/output history product. |

## 23. Traceability

| Product section | Primary authority and evidence |
|---|---|
| Artifacts, identity, data semantics, Data Tracks | [Boring-log domain model](boring-log-domain-model.md), [ADR-0005](../../adr/0005-source-snapshot-acceptance-boundary.md) |
| Workspaces and layout interaction | [Layout Studio UX specification](layout-studio-ux-specification.md), ArcGIS atomic research summarized there |
| Process topology, renderer, packages, storage, auth | [RSrender architecture](rsrender-architecture.md), [ADR-0002](../../adr/0002-layer-document-ownership-and-storage-commit-authority.md), [ADR-0003](../../adr/0003-constrained-zip-document-package.md), [ADR-0004](../../adr/0004-session-only-rslog-authentication.md), [ADR-0006](../../adr/0006-local-fixed-ntfs-authoritative-storage.md), [ADR-0007](../../adr/0007-single-chromium-layout-authority-and-resolved-projections.md), [ADR-0008](../../adr/0008-main-owned-application-core-and-least-capable-electron-topology.md) |
| Save/conflict/close/recovery commands | [Lifecycle/conflict state-command specification](lifecycle-conflict-state-command-specification.md), [ADR-0001](../../adr/0001-renderer-independent-lifecycle-and-verified-save.md) |
| Recovery timing, quotas, retention, privacy | [Recovery, retention, and privacy policy](recovery-retention-privacy-policy.md) |
| Synthetic data and semantic oracles | [Sanitized Example Dataset and golden-log corpus](sanitized-example-dataset-golden-log-corpus.md) |
| Minimum endpoint and budgets | [Minimum-endpoint workload and performance envelope](minimum-endpoint-workload-performance-envelope.md) |
| Source contract and uncertainty | [RSLog read contract and restricted-evidence public handoff](../research/rslog-read-contract-rsagent-evidence.md) |
| Provisional jobs, scenarios, and non-representative caveat | [Internal boring-log workflow and edge cases](../research/internal-boring-log-workflow-edge-cases.md) |
| Ubiquitous language and accepted decisions | [Repository context](../../../CONTEXT.md) |

## 24. Contradictions resolved and remaining uncertainty

This specification resolves the following planning conflicts:

- Refresh review uses a source-only Candidate/diff; it does not derive a preview Render Dataset before acceptance.
- Tagged accessible PDF is mandatory in v0.9, not an optional export setting.
- There is no export-wide raster fallback; authored admitted raster assets do not permit page flattening.
- Publication Audit is mandatory under the triggers in Section 12.4 and optional only for a clean Candidate.
- Warning acknowledgment belongs to the current publisher; the six narrow suppressions are project edits available to a project editor, subject only to an organization policy that narrows authority.
- Half-open page ranges, optional collection outcomes, boundary ownership, and out-of-domain marker policy follow the settled domain/Diagnostic rules even where older corpus notes called them unresolved.

No unresolved product-owner choice remains in #25. Remaining uncertainty is evidence-bound, not behavior-bound: vendor/source contracts, representative workflow frequency, endpoint performance, controlled accessibility, fonts/assets/decoder rights and behavior, managed recovery/storage, installer/update controls, security/privacy/records approval, publication verification, and commercialization authority. Those gates may require implementation changes or supported-scope reduction if they falsify assumptions, but implementation agents must not invent interim behavior.
