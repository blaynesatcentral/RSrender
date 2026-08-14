# RSrender

RSrender is the domain of designing, populating, and publishing professional boring logs from read-only source data while keeping presentation decisions separate from geotechnical records.

## Language

**Log Template**:
A reusable definition of boring-log layout, data bindings, formatting rules, and presentation behavior. It contains deliberate example data so it remains editable without access to RSLog.
_Avoid_: Form, layout file, report template

**Log Project**:
A stateful working document for one Source Project and one Log Set composition. It combines zero or one accepted Source Snapshot, selected Exploration memberships/groups, Supplemental Sources, Source Resolution Decisions, Template Assignments, shared Embedded Template Representations, Presentation Overrides, Freeform Annotations, and publication settings.
_Avoid_: Template, drawing, workspace

**Log Document**:
An immutable publication exported from a Log Project, such as a print-ready PDF.
_Avoid_: Project, template, report source

**Publication Audit**:
A record produced alongside a Log Document when the user selects it or publication policy requires it. It identifies the template, source freshness, Presentation Overrides, acknowledged or suppressed diagnostics, and export settings without exposing credentials or unnecessary client data.
_Avoid_: Warning page, application log, Source Snapshot

**Publication Bundle**:
The coordinated publication result formed by a PDF Log Document and its canonical JSON Publication Audit sidecar when the audit is selected or required. Both artifacts share a Publication ID; the sidecar identifies the final PDF filename and digest. The Bundle is successful only after every required artifact reopens and cross-verifies. A clean no-audit publication is a PDF-only result, not a Publication Bundle.
_Avoid_: Project package, embedded audit, loosely associated sidecar files

**Boring Log**:
The professional record that presents the observations, samples, tests, and other source data for one borehole through a Log Template.
_Avoid_: Borehole, report

**Log Set**:
A paginated collection of Boring Logs produced by one Log Project. A Log Set may use one template throughout or assign different templates to groups or individual explorations.
_Avoid_: Report, batch file

**Exploration**:
A selected RSLog investigation record, such as a borehole, from which a Boring Log is produced.
_Avoid_: Page, template instance

**Source Project**:
The provider-owned project scope that contains the Explorations and lookup records read by one Log Project. v0.9 binds one Log Project to one Source Project and Source Context Identity.
_Avoid_: Log Project, workspace, document package

**Exploration Group**:
A project-local ordered grouping of selected Explorations used for organization and Template Assignment. It never creates, moves, renames, or groups records in RSLog.
_Avoid_: Source Project group, Contents group, element Group

**Source Data**:
Read-only geotechnical records obtained from RSLog or an equivalent provider. RSrender may present and validate Source Data but does not author or correct it.
_Avoid_: Project data, editable borehole data

**Render Dataset**:
RSrender's versioned renderer-facing projection assembled from an accepted Source Snapshot, validated Supplemental Sources, explicit Source Resolution Decisions, and project-local Presentation Overrides for binding and rendering. It is derived presentation input, not retained source truth and does not contain Freeform Annotations.
_Avoid_: Source Snapshot, RSAgent bundle, raw API response, Log Project

**Source Adapter**:
A replaceable read-only translator that authenticates to one authorized source, retrieves and validates records, and returns an immutable source-only Source Snapshot Candidate. Acceptance creates a Source Snapshot atomically; a separate assembler derives the Render Dataset from that accepted snapshot, validated Supplemental Sources, Source Resolution Decisions, and Presentation Overrides.
_Avoid_: Writer, scraper, renderer

**Source Snapshot Candidate**:
An immutable, source-only result of one completed Source Adapter retrieval. It preserves typed collection outcomes, identity, provenance, and freshness but remains non-authoritative until deliberate acceptance atomically replaces the Log Project's Source Snapshot.
_Avoid_: Source Snapshot, partial Render Dataset, working cache

**Source Context Identity**:
The non-secret compound scope of one Source Adapter, provider organization/account context, and source project used to prevent otherwise identical native record IDs from colliding.
_Avoid_: Credential, tenant secret, display name

**Source Entity Identity**:
The exact stable identity of one source record, formed from Source Context Identity, entity kind, and the provider-native ID. Names, depths, order, and content similarity never substitute for it.
_Avoid_: Display label, fuzzy match, Render Dataset ID

**Source Extension**:
An inert, bounded, provenance-bearing envelope for an authorized source field that has no typed mapping yet. It may be bound deliberately through a safe generic or later typed formatter, receives no default placement, and never executes.
_Avoid_: Plugin, credential field, arbitrary script

**Supplemental Source**:
A deliberately attached, provenance-bearing dataset that supplies typed records unavailable from the primary Source Adapter, such as laboratory results imported from a validated file.
_Avoid_: Presentation Override, pasted value, hidden merge

**Source Resolution Decision**:
A project-owned explicit choice between two otherwise eligible facts claiming the same semantic target, such as a new primary laboratory result and an attached Supplemental Source result. It retains both provenance chains and is not a source edit or display override.
_Avoid_: Presentation Override, row-order precedence, silent merge

**Example Dataset**:
Deliberately curated, non-production data embedded in a Log Template for offline design and evaluation of data-dependent behavior.
_Avoid_: Cache, live data, test borehole

**Source Snapshot**:
The immutable, provenance-bearing result of an accepted Refresh retained by a Log Project so source facts remain available offline. It excludes Presentation Overrides and is an input to, not a synonym for, the Render Dataset.
_Avoid_: Render Dataset, Example data, automatic cache

**Authoritative File**:
The user-selected durable package currently bound to an open Log Project or Log Template. A candidate, backup, or Recovery Candidate does not become authoritative merely because it exists.
_Avoid_: Current file, temporary file, recovery file

**External Change**:
A detected difference between an Authoritative File and the identity or content baseline last verified by its open document. For a clean document, mutations freeze; comparison is inspection-only, and the working basis changes only through verified Reload External, verified Save As, or eligible deliberate Replace External.
_Avoid_: Automatic reload, background merge, timestamp warning

**Document Identity**:
The stable identity of one Log Project or Log Template across path changes and ordinary Save As operations. Save as Separate Template and Fork as New Project create new Document Identities with inert origin provenance; Save a Copy does not rebind or change the identity of the open document.
_Avoid_: File path, filename, tab identity, process ID, contained-object identity

**Document Owner**:
The one open session currently responsible for mutating commands for a Log Project or Log Template. Its identity is independent of the active window, tab, process ID, display name, and file path.
_Avoid_: Active tab, lock holder, file owner

**Recovery Candidate**:
An app-owned, integrity-checked working revision retained so interrupted unsaved work can be offered for deliberate separate opening. Opening it separately creates an untargeted dirty document with a new Document Identity and inert recovery-origin provenance; the candidate is not an Authoritative File, completed Save, or document history.
_Avoid_: Autosave, backup, version history

**Refresh**:
A user-initiated retrieval, comparison, and accepted replacement of a Log Project's Source Snapshot with newly retrieved Source Data.
_Avoid_: Sync, background update, auto-refresh

**Refresh Plan**:
The immutable pre-retrieval declaration of Source Context, selected Explorations, requested collections, and required/optional classification. Any collection needed by effective bindings, publication selection, Overrides, or relationship integrity is required.
_Avoid_: Background sync schedule, API request log

**Template Assignment**:
The association of an Embedded Template Representation with an entire Log Set, an Exploration Group, or one Exploration membership. Exploration assignment wins, then the nearest assigned ancestor group, then broader ancestors, then Log Set/project assignment; duplicate assignments at one scope are invalid.
_Avoid_: Template copy, template revision

**Embedded Template Representation**:
The exact effective Log Template material retained in a Log Project for offline editing and publication continuity. Assignments to the same representation share one current editable state; deliberate Save as Separate Template plus reassignment creates divergence. It is replaced only by deliberate template update and is not template history.
_Avoid_: Cached template, template history, template revision archive

**Presentation Override**:
A project-local replacement applied to displayed bound content without modifying Source Data. It is visibly distinguishable from source truth while editing; Freeform Annotations are a separate collection and type.
_Avoid_: RSLog edit, source correction, silent substitution

**Display Value Override**:
A Presentation Override that replaces one displayed source field for one exploration while retaining the original Source Data for comparison and refresh-conflict review.
_Avoid_: Source edit, global substitution, annotation

**Freeform Annotation**:
Project-local content anchored to one Boring Log by depth, Page Region/Template Variant occurrence, or an exact page-plan revision without replacing a bound source field. It enters page-scene construction separately from the Render Dataset.
_Avoid_: Display Value Override, source correction

**Page Region**:
A semantic Header, Depth Body, or Footer area that governs the layout and repetition behavior of its elements.
_Avoid_: Layer, arbitrary rectangle

**Log Column**:
A depth-aware element within a Depth Body whose horizontal geometry is designed directly and whose vertical content is rendered against the page's Reference Depth Range.
_Avoid_: Table column, ordinary rectangle

**Reference Depth Range**:
The start and end depths represented by a page's Depth Body, determining its depth scale and the portion of depth-bound content rendered there. Internal ranges are half-open; a boundary point belongs to the deeper range that starts at that depth, while the final range includes its terminal project depth.
_Avoid_: Page number, viewport range

**Diagnostic**:
A non-silent finding about data, layout, or document integrity with a stable code, affected identity, cause, and consequence. The product specification assigns error/warning/information severity and suppression policy; once classified, errors block export and warnings require acknowledgment unless narrowly suppressible.
_Avoid_: Console error, silent failure

**Template Variant**:
A named page composition within a Log Template for a particular role, such as first, continuation, or last page.
_Avoid_: Template revision, project override

**Key Element**:
The explicitly highlighted member of an ordered multi-selection that remains fixed when the other selected elements are aligned to it. The last element added to the selection becomes the Key Element unless the user deliberately chooses another.
_Avoid_: Primary layer, active group

**Position Anchor**:
One of nine reference points on an element used to express and edit its exact page coordinates.
_Avoid_: Layout Pin, rotation pivot

**Layout Pin**:
An explicit constraint connecting an element to an edge of its Page Region so the element responds predictably when that region changes size.
_Avoid_: Position Anchor, snap target

**Effective Visibility**:
Whether an element is rendered after combining its own visibility setting with the visibility settings of its ancestors.
_Avoid_: Local visibility

**Effective Lock State**:
Whether an element can be transformed after combining its own lock setting with the lock settings of its ancestors.
_Avoid_: Selection state, local lock

**Data Track**:
A depth-oriented presentation region that owns one page depth transform, a shared interval system, zero or more numeric axes, and an ordered set of Data Layers. Numeric layers reference exactly one compatible axis; interval-only layers may be axisless.
_Avoid_: Graph, duplicated axis column

**Data Layer**:
An ordered visual encoding of one bound dataset within a Data Track, such as N-values, moisture, plastic limit, or liquid limit.
_Avoid_: Column, axis

**Named Style**:
A reusable template definition for a category of visual properties, such as text, line, fill, border, or graph appearance, that elements may override explicitly.
_Avoid_: Element, theme, hard-coded formatting

**Template Component**:
A template-local reusable composition of elements, such as a title block or sample-symbol assembly.
_Avoid_: Group, external plugin, shared library
