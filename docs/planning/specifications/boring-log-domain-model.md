# RSrender boring-log domain model

**Status:** Product-owner approved v0.9 domain contract for GitHub #22  
**Evidence cut:** 2026-08-14  
**Scope:** Source acquisition, accepted source state, supplemental facts, presentation changes, boring-log projection, identity, provenance, value states, Refresh, and validation  
**Not in scope:** Vendor wire DTO implementation, visual interaction details, process topology, physical package schema, or publication-warning policy

## 1. Purpose and authority

This specification defines the domain boundary that implementation agents must preserve. It incorporates the #8 RSLog read contract, #9 laboratory access finding, #16 synthetic corpus, #19 shared-axis prototype, #21 Source Adapter prototype, and the product owner's standing acceptance of recommended choices.

An implementation may add internal types, indexes, or caches, but it may not change the ownership, identity, provenance, absence, acceptance, or source-versus-presentation rules below without a recorded domain decision.

The root [ubiquitous-language glossary](../../../CONTEXT.md) supplies canonical names. This specification is normative when it gives a term a more detailed contract.

## 2. Domain boundary at a glance

```text
Authorized read-only provider
  -> Source Adapter
  -> Source Snapshot Candidate
       -> reject/cancel: prior accepted Source Snapshot is unchanged
       -> deliberate atomic acceptance
  -> Source Snapshot

Log Project
  owns zero or one Source Snapshot
  owns zero or more Supplemental Sources
  owns revisioned Presentation Override, Freeform Annotation,
       and Source Resolution Decision collections
  owns Template Assignments and Embedded Template Representations
  -> pure Render Dataset assembler
  -> immutable Render Dataset
  -> page scene / Log Set / Log Document
```

The Source Adapter never emits a partial Render Dataset. Supplemental Sources and Presentation Overrides never enter a Source Snapshot. The assembler never mutates any input.

## 3. Aggregate ownership

| Aggregate / value | Owns | May reference | Must not own or imply |
|---|---|---|---|
| Log Template | Page Regions, Template Variants, elements, bindings, Named Styles, Template Components, Example Dataset | admissible fonts/assets; typed domain paths | live Source Data, credentials, project overrides, prior template history |
| Log Project | one Log Set composition; zero or one accepted Source Snapshot; Supplemental Source revisions; revisioned Presentation Override, Freeform Annotation, and Source Resolution Decision collections; Template Assignments; shared Embedded Template Representations; publication settings | library templates by stable identity; current source context without secrets | RSLog mutations, old template revisions, credentials, prior Log Documents |
| Source Snapshot Candidate | one Refresh Plan result, collection envelopes, mapped source records, lookup metadata, provenance, candidate Diagnostics, eligibility, logical digest | prior Snapshot only for diff computation | accepted authority, Supplemental Sources, Overrides, renderer state |
| Source Snapshot | one atomically accepted candidate and its immutable source-only records | source provenance and source-context identity | presentation choices, imported laboratory facts, cached prior collections |
| Supplemental Source | separately validated typed facts plus artifact/parser/association provenance | stable Source Snapshot entity targets | primary-source authority, hidden precedence, Presentation Overrides |
| Render Dataset | immutable renderer-facing projection and complete per-value provenance | exactly one accepted Snapshot, admitted Supplemental Sources, applicable Overrides | credentials, raw executable content, lifecycle authority, mutable source truth |
| Data Track | depth transform reference, configured axes, grid and shared interval geometry, ordered Data Layers | Render Dataset observations | source acquisition, per-layer duplicate axes or interval bars |
| Log Document | immutable published PDF pages and publication metadata | one immutable render plan/revision; zero or one canonical Publication Audit paired through a Publication Bundle | editable project state, source authority, or a loosely associated Audit |
| Publication Bundle | exactly one PDF Log Document and exactly one canonical JSON Publication Audit sidecar sharing one Publication ID and cross-verifiable PDF identity/digest | one immutable Publication Candidate and one qualified destination-pair result | project/package state, embedded Audit payload, unrelated sibling files, or a success claim before both artifacts reopen and cross-verify |

Aggregate mutations are transactional at their own boundary. A Render Dataset is disposable derived state and may be rebuilt; a Source Snapshot, Supplemental Source revision, Presentation Override Collection revision, Freeform Annotation Collection revision, or Source Resolution Decision Collection revision is immutable.

### 3.1 Project, Exploration, Boring Log, and template cardinality

- A v0.9 Log Project binds to exactly one Source Context Identity and one provider Source Project. Combining records across provider projects/accounts is deferred; users create separate Log Projects.
- A Log Project owns exactly one ordered Log Set composition, initially empty. Adding an Exploration creates one project membership; removing it removes that membership after conflict review. A publishable composition contains exactly one Boring Log for each included membership. A temporary export subset does not create another Log Set or change membership.
- One Boring Log uses one effective Log Template and produces one or more pages according to its Reference Depth Ranges and Template Variants. A page is not an Exploration and does not own source records.
- Project-local Exploration Groups form an ordered nested tree for organization and Template Assignment only. Each Exploration membership belongs to zero or one immediate group. Groups cannot cycle, and moving membership never changes RSLog.
- Template Assignment resolution is deterministic: Exploration assignment overrides the nearest ancestor-group assignment, which overrides broader ancestor groups, which override Log Set/project assignment. Two assignments at the same scope are an error; name or tree order never breaks the tie.
- A project may exist without an effective template, but preview/publication of every affected Boring Log is blocked by `TEMPLATE_ASSIGNMENT_MISSING` until resolved.
- Template Assignments reference one project-owned Embedded Template Representation identity. All scopes assigned to the same representation share its current editable state; an edit affects every referencing scope. Per-group or per-Exploration divergence requires deliberate Save as Separate Template/new representation plus reassignment. No hidden per-Exploration copy is created.
- One Embedded Template Representation exists per admitted template identity and effective content digest within the project. A deliberate template update replaces the current representation for its referencing assignments after review; it does not retain template history. A missing/changed library entry cannot silently replace it.

## 4. Identity model

### 4.1 Identity classes

| Identity | Construction and scope | Persistence rule |
|---|---|---|
| Document Identity | Generated by RSrender for one Log Project or Log Template | Stable across normal Save As; new for Fork/Separate Template/recovery-open-as-separate |
| Source Context Identity | Adapter type plus provider organization/account scope plus source project scope, represented without credentials | Stored with provenance; prevents cross-account or cross-project ID collision |
| Source Entity Identity | Source Context Identity + entity kind + exact provider-native ID | Stable across Refresh; never based on name, depth, order, or fuzzy matching |
| Source Field Identity | Source Entity Identity + canonical mapped field path or namespaced extension path | Stable basis for bindings, diffs, Overrides, and Diagnostics |
| Candidate Identity | Source context + Refresh Plan identity + completion instant + canonical candidate digest | Unique to one completed retrieval; never reused after retry |
| Snapshot Identity | Candidate Identity and accepted logical digest | Immutable after acceptance |
| Exploration Membership / Group Identity | Project Document Identity + exact Source Entity Identity / generated group identity | Membership survives reorder; group identity survives rename/reparent; delete does not delete Source Data |
| Template Assignment Identity | Project Document Identity + generated assignment identity with exact scope target | Stable through template replacement; duplicate same-scope assignments are invalid |
| Embedded Template Representation Identity | Project Document Identity + admitted template identity + effective content digest | Shared by all referencing assignments; deliberate divergence creates a new identity |
| Supplemental Source Identity | Project Document Identity + generated source identity; each admitted import/refresh creates an immutable revision identity | Stable for the attached logical source; revision changes never reuse identity |
| Supplemental Record Identity | Supplemental Source identity + source-artifact row/key identity | Stable across re-import only when the parser can prove the same source record |
| Project Collection Revision Identity | Project Document Identity + collection kind + monotonically increasing project revision | Identifies the exact Override, Annotation, or Source Resolution collection supplied to assembly/page planning |
| Presentation Override Identity | Project Document Identity + generated item identity; exact Source Field Identity is the target, not the item identity | Stable while enabled/edited; at most one enabled display override per Source Field Identity |
| Freeform Annotation Identity | Project Document Identity + generated item identity | Stable across movement and repagination; anchor validity is evaluated separately |
| Source Resolution Decision Identity | Project Document Identity + deterministic conflict identity + generated decision identity | At most one active decision for the exact competing-input revision set; changed inputs invalidate it |
| Log Set / Boring Log Identity | Project Document Identity + fixed Log Set identity / exact Exploration membership identity | Stable while membership exists; page count does not change Boring Log identity |
| Page / Fragment Identity | Boring Log identity + page-plan revision + stable page-range identity / source identity + fragment range | Recomputed when page plan changes; never substitutes for source identity |
| Data Track / Axis / Layer Identity | Template Element Identity scoped to its owning Template/track | Stable through reorder; copy creates a new identity; axes are unique within one track |
| Diagnostic Identity | stable code + affected exact identity/path + cause key + input revision | Deterministic for the same failure; UI order or message text is not identity |
| Projection Identity | deterministic mapping-version-qualified identity derived from its source/supplemental/override inputs | Reproducible for the same input revision; never substitutes for source identity |
| Element Identity | Template-local stable identity for one element or semantic child | Stable through reorder/grouping; copy creates a new identity |

Source-native IDs are stored as opaque strings. Numeric-looking IDs are not coerced to numbers. Display names, filenames, source order, depth, and content hashes may assist diagnostics but never establish entity identity.

### 4.2 Relationship integrity

- Every child record carries an exact parent Source Entity Identity when the source provides one.
- Missing, duplicate, cross-context, or wrong-kind parents are retained as malformed relationship evidence and diagnosed; RSrender does not silently reparent them.
- Source ordering is retained when explicitly supplied. Deterministic fallback ordering is depth/start, end, source order, then stable identity.
- Duplicate IDs within one source context and entity kind make the affected collection ineligible for automatic acceptance.
- A deleted source entity is absent from the candidate and appears in the Refresh diff; its old record is never copied into the new Snapshot.

## 5. Provenance contract

Every mapped or derived value carries enough provenance to answer: where did this value come from, which source field or record supplied it, which adapter/parser/mapping produced it, when was it retrieved or attached, what transformation occurred, and what input revision was used?

```text
Value Provenance
  provenanceClass: source | supplemental | override | derived | example
  sourceContextIdentity
  entityIdentity / fieldIdentity / supplementalRecordIdentity
  adapterOrParserId + exact contract version
  retrievalOrAttachmentInstant
  inputArtifactDigest where applicable
  mappingRuleId + version
  transformation[]
  unitBefore / unitAfter when converted
  status and eligibility basis
```

Credentials, tokens, cookies, authorization headers, passwords, verification codes, machine paths, and secret tenant material are prohibited provenance fields. A provenance digest proves admitted bytes, not semantic truth, safety, or rights.

Derived presentation values retain links to every input. A PL-LL connector is derived from two independent laboratory facts. A groundwater elevation may be derived only from eligible sourced water depth plus eligible sourced collar elevation and an explicit unit conversion. RSrender does not invent N, N60, PI, engineering classifications, or other engineering interpretations.

## 6. Orthogonal value, association, finality, and eligibility states

All bindings and mappings preserve four independent axes. Truthiness, state collapsing, and default coercion are prohibited. A fact can therefore be `zero + resolved + final + eligible`, `value + ambiguous + final + blocked`, or `null + resolved + unknown-finality + blocked` without losing information.

### 6.1 Content state

| Content state | Meaning | Content rule |
|---|---|---|
| `absent` | A contract/schema-declared field was not present in the admitted source record | No value; distinct from a missing record or failed collection |
| `null` | Field was present with explicit null | No value; distinct from absent |
| `empty-string` | Present string has zero characters (the laboratory term `blank` normalizes here) | Never becomes absent or null |
| `empty-collection` | Present field is an empty collection | Distinct from an `empty` collection-result envelope |
| `zero` | Present numeric value equals zero | Retain and render/plot when otherwise eligible |
| `value` | Present typed non-zero/non-empty value | Retain exact type and original representation |
| `not-available` | Source explicitly states unavailable or not measured | No numeric value; may render configured status text/symbol |
| `not-permitted` | Provider or policy explicitly denied the value | No value; retain denial provenance |
| `malformed` | Present raw value cannot be safely or semantically mapped | Retain safe raw representation/digest; never silently repair |

The absence of an entire record is expressed by collection membership/diff, not a content state called `missing`.

### 6.2 Association state

| Association state | Meaning |
|---|---|
| `resolved` | Exactly one valid semantic target is proven |
| `unmatched` | No valid target is proven |
| `ambiguous` | Multiple targets or competing facts remain unresolved |
| `not-applicable` | The fact does not require a target association |

### 6.3 Finality state

| Finality state | Meaning |
|---|---|
| `final` | Source/import status permits final numeric use |
| `nonfinal` | Provisional, reviewing, or otherwise not final |
| `unknown` | No supported status mapping proves finality |
| `not-applicable` | Finality does not apply to this fact |

Nonfinal or unknown-finality values may be deliberately displayed as status/text, but are excluded from final numeric plotting by default.

### 6.4 Eligibility result

Eligibility is derived, never source truth: `eligible`, `blocked`, or `metadata-only`, with stable reason codes for content, association, finality, unit, relationship, duplicate, rights, or policy failures. The original three state axes remain unchanged when eligibility changes.

Units are explicit. Magnitude never implies a unit. Conversion is allowed only through a versioned, quantity-compatible conversion rule that records before/after units and rounding. An unsupported unit retains the original content and blocks numeric plotting.

## 7. Collection result and Refresh Plan

Every requested collection has exactly one envelope:

```text
Collection Result
  collectionIdentity
  requirement: required | optional
  state: success | empty | failed
  records: non-empty only for success; empty only for empty; absent for failed
  pagination: complete or typed failure
  provenance
  diagnostics[]
```

`failed` never becomes `empty`. A missing envelope is a failed Refresh contract, not an empty collection.

### 7.1 Required and optional policy

The Refresh Plan is computed and shown before retrieval.

- Project identity, selected Exploration identity, and every relationship needed to scope requested records are always required.
- Any collection referenced by the effective templates, active bindings, Data Layers, Presentation Overrides, current publication selection, or integrity checks is automatically required.
- A required failure makes the whole candidate ineligible. The prior accepted Snapshot remains usable and visibly stale.
- A collection may be optional only when it is not needed by the current effective project behavior. An optional failure can be accepted only through explicit review and acknowledgment.
- An accepted optional failure remains a `failed` envelope with no records. It never borrows or merges records from the prior Snapshot.
- If an optional failure would make an existing binding unresolved or remove a currently published fact, the plan upgrades it to required before retrieval.
- `not-permitted` is not optional success. It is a failed/denied outcome whose consequence follows the requirement classification.

This rule preserves atomic Snapshot identity and forbids mixed-freshness records while allowing deliberately unbound discovery collections to fail non-silently.

### 7.2 Refresh state machine

1. **Plan:** resolve source context, selected Explorations, requested collections, required/optional classification, and current accepted Snapshot digest.
2. **Retrieve:** authenticate through the session-only broker and fetch all planned envelopes. One documented token refresh and one replay may occur; repeated unauthorized or forbidden results fail visibly.
3. **Normalize:** validate shapes, map supported fields, capture safe open content, build identities/provenance, and reject secrets/executable content.
4. **Validate candidate:** require complete envelopes, pagination completion, identity/relationship integrity, budgets, and typed Diagnostics.
5. **Diff:** compute created, changed, deleted, unchanged, collection-outcome, lookup, and Override-conflict sets by stable identity.
6. **Review:** show freshness, failures, deletions, changed source values, unresolved lookups, and Override conflicts. No project source state changes yet.
7. **Accept or cancel:** acceptance atomically replaces the Source Snapshot as one undoable project transaction. Cancel/failure leaves the prior Snapshot byte-for-byte and logically unchanged.
8. **Reassemble:** derive a new immutable Render Dataset from the accepted Snapshot plus current Supplemental Sources and Overrides.

Refresh is deliberate and never runs on open, migration, export, template edit, or background schedule.

## 8. Source-domain records

### 8.1 Source Project and Exploration

A Source Project scopes lookups and Explorations. An Exploration is the source record from which one Boring Log is produced. Source Project and Exploration identity must succeed before dependent collections can be accepted.

Exploration carries only sourced facts and explicit value states, including name/number, location/elevation when supplied, total depth, dates, method/status metadata, and source extensions. Coordinates are never inferred. Exploration total depth does not silently clip deeper child records; disagreement is diagnosed.

### 8.2 Stratum

A Stratum is a source interval with start depth, end depth, description/classification content, optional source symbol reference, and provenance. Reversed, zero-length where disallowed, overlapping, gapped, or out-of-exploration intervals are retained and diagnosed; RSrender does not silently trim, merge, split, or reorder source truth.

Each Stratum belongs to exactly one Exploration. Its optional lookup references are scoped to the same Source Context and lookup family.

Text is stored as inert normalized text or an allowlisted styled-run structure plus a safe raw digest. Source HTML/scripts/styles never execute. Rendering policy and severity are later specification concerns.

### 8.3 Sample

A Sample is a source point or interval associated with exactly one Exploration and, when supplied, a sample type and collection/recovery metadata. An absent or null end depth retains that exact content state; it is not synthesized from the next sample. Numeric zero recovery remains zero.

Sample identity is the association target for SPT and laboratory facts. Association by displayed sample number, depth proximity, or row order is prohibited unless a separately approved import rule records an explicit ambiguous/resolved association decision.

### 8.4 Field Test and SPT

Field-test entities with recognized test-type and column metadata are the preferred SPT source. Typed column values retain column identity, name, unit, order, raw structured representation/digest, and parser state.

Each Field Test belongs to exactly one Exploration and may target zero or one exact Sample. Missing sample association does not erase the Exploration relationship. Multiple recognized field-test records claiming the same test/sample/semantic column remain ambiguous; none wins by list order, depth proximity, or most-recent appearance.

- A source-supplied N or N60 is retained as supplied with exact column provenance.
- RSrender does not calculate N, N60, refusal, or corrections unless a later explicit versioned domain rule authorizes that derivation.
- Sample `blowCounts` is a separately provenance-marked compatibility candidate. It may be used only when the field-test collection succeeded and the relevant preferred entity is truly absent, and an exact versioned fallback mapping has been admitted.
- A failed field-test retrieval does not authorize fallback. Conflicting candidates retain both, select the preferred eligible field-test value, and diagnose the conflict.
- Unrecognized or partial fallback shape selects neither and remains available only as inert open content.

The positive `blowCounts` mapping, duplicate-column interpretation, and recognized fallback eligibility remain evidence-blocked under #43. Until that contract is admitted, the field is inert Source Extension content and no fallback value is selected.

### 8.5 Comments and drilling records

Every Comment belongs to exactly one Exploration and may additionally reference one exact related Stratum, Sample, Field Test, drill run, or other supported source entity in that Exploration. It retains point/interval scope if supplied, order, inert text, status, and provenance. Empty text is `empty-string`, not absent.

Boring/drilling detail records and drill runs each belong to exactly one Exploration. A drill run is an interval; a detail record keeps its supported point/interval semantics. They remain separate from Strata, and label text is not treated as method identity. Lookup IDs are scoped by Source Context + lookup family and remain intact when unresolved.

### 8.6 Groundwater

Groundwater is three non-interchangeable families:

1. **Open-hole observation:** belongs to exactly one Exploration and is typed during-drilling, short-term-after, or long-term-after.
2. **Piezometer/well series:** an installation belongs to exactly one Exploration; each time-stamped measurement belongs to exactly one installation.
3. **Drilling groundwater detail:** each provider-specific detail belongs to exactly one Exploration and remains separate from both other families.

Each observation preserves content state plus an observation-kind/status discriminator. Measured numeric zero is content `zero`; dry and not-measured are explicit domain statuses with content `not-available`; unavailable and malformed use their canonical content states. A missing observation is no record, not a value state. Dry is not numeric zero. Observation depth and elevation are separate quantities. Elevation is derived only when all inputs and units are eligible; otherwise its content is `not-available`.

Positive piezometer and drilling-detail wire shapes remain source-evidence-blocked under #43. Implementations must support `empty`, `failed`, and blocked-capability states and the renderer-facing domain types; they must not invent vendor DTO fields.

### 8.7 Interim variation

An Interim Variation is a point-depth source record associated with an Exploration and, when supplied, a parent Stratum. It retains variation type identity, deterministic order, and a typed value union: number, text, lookup reference, color, or inert unknown value. It is not silently expanded into an interval.

List success with detail failure remains different from no interim. Positive wire combinations remain source-evidence-blocked under #43; no source property name or formula may be invented.

### 8.8 Lookups and hatches

Lookup identity and binary/artistic asset are separate.

- Source symbol/method/type IDs and admitted lookup metadata remain source facts.
- An unresolved lookup ID is retained and diagnosed; name matching or substitution is prohibited.
- Vendor hatch bytes are admitted only after authorized retrieval, media validation, and redistribution rights are proven.
- Until then, an explicit neutral RSrender-owned pattern/fill represents the unresolved visual state with a Diagnostic. The fallback never masquerades as vendor artwork.

### 8.9 Authorized open content

Any non-secret information returned by an authorized read-only RSLog surface is eligible for deliberate binding and rendering.

A Source Extension Manifest lists contract/schema-declared extension paths and expected safe JSON kinds for an entity kind. Each admitted record then carries an observation for that path: `absent`, present `null`, or present bounded value. Runtime-discovered authorized fields may add a present manifest entry, but an unknown field cannot be described as absent unless a contract/schema declared it. Extension observations retain source entity/field identity, JSON type, canonical bounded content, and provenance. They receive no default placement and cannot execute code, load URLs, create paths, or select privileged behavior.

An explicit binding may render a safe scalar through a generic formatter or a bounded structured value through an explicit canonical-text/table formatter. The binding carries `SOURCE_EXTENSION_SEMANTICS_UNTYPED` until a typed mapping exists. Unsupported binary/active/over-budget content is rejected or represented by metadata only. Authentication material is never open content.

## 9. Supplemental Sources and laboratory facts

A Supplemental Source is attached deliberately to a Log Project after parser, provenance, rights, schema, and association validation. It never enters the Source Snapshot. The project owns zero or more attached Supplemental Source identities, each with exactly one current immutable revision. Re-import creates a proposed new revision and a semantic diff; acceptance replaces that source's current revision. Detach removes it from the current project revision after conflict review and does not silently convert its facts into Overrides.

Each laboratory fact has its own record identity, sample association state, test kind (moisture, plastic limit, or liquid limit), content state and value, explicit unit, independent finality/status, derived eligibility, source artifact and row identity, parser version, and Diagnostics.

- Moisture, PL, and LL are independent facts. Missing one does not remove another.
- Numeric zero remains eligible zero.
- `empty-string` (source/import blank), `null`, `not-available`, nonfinal/unknown finality, ambiguous/unmatched target, unresolved duplicate, or unsupported-unit facts do not plot as numeric values.
- PL-LL connection is derived presentation only when both independent facts are final, unambiguous, same-sample, same-unit, and axis-compatible.
- PI is not calculated or persisted by v0.9 unless later explicitly specified.
- Two eligible facts claiming the same sample/test/condition are ambiguous until a recorded Source Resolution Decision selects or excludes one; row order never decides.

If a future authorized Source Snapshot contains a fact claiming the same laboratory target as a Supplemental Source, assembly blocks that semantic target until a Source Resolution Decision selects one exact input or explicitly excludes both. The UI may recommend the primary source, but no automatic/default selection enters the Render Dataset. Both provenance chains remain available for review. Choosing a source is not a Presentation Override.

## 10. Presentation Overrides and annotations

A Presentation Override changes displayed project content without changing Source Data.

The Log Project owns one current immutable Presentation Override Collection revision. It contains zero or more item revisions and permits at most one enabled Display Value Override per exact Source Field Identity. Creating another for the same target is an explicit replace/edit transaction, not two-order precedence. Disable/remove/edit creates a new collection revision; retained undo history is session lifecycle state, not stored template history.

### 10.1 Display Value Override

The target is an exact Source Field Identity plus the expected source value digest/type at creation. The override stores the replacement value, explicit unit/type if applicable, author/time where policy permits, reason text when required, and its own revision.

After Refresh:

- unchanged target and baseline: override remains applicable;
- changed source value: conflict; original, new source, and override remain visible;
- deleted target: orphan conflict; no automatic retarget;
- retyped field or incompatible unit: invalid conflict;
- renamed display label with stable identity: no retargeting is needed.

Resolving a conflict explicitly keeps/rebases the override, edits it, disables/removes it, or accepts the source value. Until resolution, no export path may silently choose between them; exact severity is #25-owned.

### 10.2 Freeform Annotation

A Freeform Annotation is project-local content with its own identity and page/depth anchor. It does not replace a source field, claim source provenance, or participate in Refresh matching.

The Log Project owns one current immutable Freeform Annotation Collection revision. An annotation targets exactly one Boring Log and uses one anchor mode:

- `depth`: Exploration depth plus Depth Body horizontal geometry; it follows deterministic repagination;
- `region`: exact Template Variant/Page Region anchor and occurrence rule such as first, continuation, or last;
- `page-plan`: exact Page Identity and page-plan revision for deliberately page-specific content.

If a page-plan anchor disappears after repagination, the annotation becomes an explicit anchor conflict and is not silently moved. Freeform Annotations bypass the source-only Render Dataset and enter the page-scene builder alongside the effective template and page plan.

The Log Project also owns one current immutable Source Resolution Decision Collection revision. A decision targets one deterministic conflict identity and exact competing-input revision set. At most one decision is active for that set. Changed, removed, or newly competing inputs invalidate the decision and require review; list order never selects a replacement.

Overrides and annotations are visibly distinguishable from Source Data during editing and included in Publication Audit when selected or policy requires it.

## 11. Render Dataset projection

The assembler is a pure, deterministic function:

```text
assemble(
  accepted Source Snapshot,
  admitted Supplemental Source revisions[],
  Presentation Override Collection revision,
  Source Resolution Decision Collection revision,
  projection contract version
) -> immutable Render Dataset | typed assembly failure
```

The Render Dataset header records the exact input identities/digests and projection contract version. Every value retains its provenance class. The projection may normalize names, units, ordering, and safe text only under versioned rules; it never erases the original value/state or promotes derived/presentation values to source truth.

The projection contains source-domain observations, supplemental observations, resolved override/display values, Source Resolution outcomes, Diagnostics, and open-content binding surfaces. It does not contain templates, page geometry, Freeform Annotations, credentials, lifecycle state, or mutable editor state.

The later page-scene builder consumes the immutable Render Dataset, effective Embedded Template Representation, Freeform Annotation Collection revision, explicit page plan, and publication settings. This keeps source/supplemental/override assembly deterministic while giving annotations a deliberate presentation path.

An assembly failure leaves all inputs unchanged. Rendering or export requires one successfully assembled immutable revision. Offline opening reassembles from retained inputs without Source Adapter or network access.

## 12. Data Track projection rules

- Each page occurrence of a Data Track template element owns exactly one depth transform derived from that page's Reference Depth Range, plus its grid and shared interval fragments. A track has zero or more numeric axes with identities unique within that track.
- Each numeric point/range Data Layer references exactly one compatible axis in its owning track. An interval-only layer may be axisless and uses only depth geometry. A derived connector references the same compatible numeric axis as its endpoints.
- A missing, deleted, or incompatible axis makes the affected layer render-ineligible with a Diagnostic; no other axis is chosen silently. An axis with zero visible referring layers remains present when its own visibility is on.
- Moisture, PL, and LL may share one compatible percentage axis. N uses a distinct quantity axis in the same track.
- Quantity, unit, and scale compatibility are validated before paint. No implicit conversion or autoscale.
- Layer visibility/order never creates, removes, rescales, or relocates an axis and never duplicates sample intervals.
- Reference Depth Ranges use half-open ownership `[startDepth, endDepth)`; the final range alone includes its terminal project depth. A point exactly on an internal boundary belongs to the deeper page whose range starts there. Spanning intervals produce traceable fragments per intersected page, and zero-length point semantics remain points rather than empty intervals.
- Out-of-domain default is an edge marker plus Diagnostic that retains original value/identity. Coincident values retain exact anchors and semantic identities without jitter.

Tick/label style, reversed/custom/log axes, conversions, interaction, performance, and PDF tolerances are owned by later UX/architecture/acceptance specifications.

## 13. Diagnostics

Every Diagnostic contains:

- stable code and category;
- affected source, supplemental, override, element, page, or collection identity;
- affected field/path when applicable;
- cause and evidence class;
- consequence (unavailable, ignored, fallback, conflict, candidate-ineligible, render-ineligible, export-policy input);
- current policy state and suppressibility owner;
- deterministic ordering key;
- remediation actions that do not mutate Source Data.

Domain code emits facts and consequences, not invented severity policy. #25 decides error/warning/information classification, acknowledgment, suppression, and export gating. Integrity failures that would misidentify, silently omit, or misrepresent source truth are candidate/assembly failures regardless of UI severity wording.

## 14. Domain invariants

1. RSLog and equivalent providers are read-only; no domain command writes source records.
2. A Source Adapter returns one source-only candidate, never a partial Render Dataset.
3. Candidate acceptance is atomic; rejection/cancel/failure does not mutate the accepted Snapshot.
4. Required collection failure rejects a candidate; optional failure is explicit, acknowledged, unbound, and never filled with stale records.
5. Source, supplemental, override, derived, and example provenance never collapse into one undifferentiated value.
6. Identity uses exact scoped IDs, not names, depths, order, filenames, or fuzzy matching.
7. Content, association, finality, and derived eligibility remain orthogonal; absent, null, empty string/collection, zero, value, unavailable, not-permitted, malformed, unmatched, ambiguous, final, nonfinal, and unknown-finality never collapse.
8. No source relation, interval, unit, lookup, formula, status, precedence, or value is silently repaired or inferred.
9. Unknown authorized fields remain inert, bounded, provenance-bearing, deliberately bindable, and never executable or credential-bearing.
10. Refresh never mixes old and new collection records inside one accepted Snapshot.
11. Supplemental facts require explicit association and conflict resolution; Presentation Overrides are not source corrections.
12. The Render Dataset is immutable, deterministic, versioned, and traceable to every exact input revision.
13. Every page/track has one depth transform; Data Layers cannot own duplicate depth axes or sample-interval geometry, and numeric layers cannot exist without one exact compatible axis reference.
14. Offline edit/render/export uses retained Snapshot, Supplemental Sources, Overrides, and Embedded Template Representations without network access.
15. A source-evidence-blocked positive wire shape remains a typed unavailable capability; implementation must not invent it.

## 15. Command and event vocabulary

| Command/event | Domain result |
|---|---|
| Plan Refresh | immutable Refresh Plan or typed planning failure |
| Retrieve Refresh | Candidate or typed retrieval failure; accepted Snapshot unchanged |
| Review Refresh | semantic diff and conflict set; no mutation |
| Accept Refresh | one undoable replacement of accepted Snapshot plus derived reassembly |
| Cancel Refresh | Candidate discarded/retained only as transient evidence per lifecycle policy; no source mutation |
| Attach Supplemental Source | validated immutable source revision or rejection |
| Resolve Source Conflict | explicit resolution record; inputs retained |
| Add/Edit/Remove Presentation Override | new project override revision; Source Snapshot unchanged |
| Bind Source Extension | explicit safe generic/typed binding or Diagnostic; no default placement |
| Assemble Render Dataset | immutable projection or typed failure |
| Refresh Template Representation | deliberate ETR change, separate from Source Refresh |

## 16. Evidence-blocked capabilities and implementation rule

The following remain blocked on positive authorized source/rights evidence in #43: populated piezometer/installations/measurements, populated drilling-groundwater detail, populated interim combinations, supported laboratory API shapes/permissions/semantics, and hatch binary acquisition/redistribution.

This does not leave product behavior undefined. v0.9 must:

- represent each capability as mapped, empty, failed/denied, or source-evidence-blocked;
- preserve inert authorized open content if encountered safely;
- show a Diagnostic for an explicit unsupported binding or missing visual asset;
- use neutral RSrender-owned visual fallback where specified;
- never claim a field mapping, unit, status, relationship, or right that evidence has not established.

#43 may add mappings by a versioned adapter contract without changing the aggregate boundaries in this document.

## 17. Deferred domain capabilities

- source write-back or correction;
- automatic engineering interpretation or inferred N/N60/PI/classification;
- cross-provider record merge without explicit Source Resolution Decisions;
- simultaneous multi-user editing or shared-source conflict merge;
- historical regeneration from prior template revisions;
- executable plugins/scripts or source-supplied active content;
- background/automatic Refresh;
- credential persistence or multiple simultaneous RSLog account contexts;
- GIS/map authoring and geospatial inference.

## 18. Implementation-readiness checklist

- [x] Aggregate ownership and projection boundary are explicit.
- [x] Candidate, Snapshot, Supplemental Source, Override, and Render Dataset are distinct.
- [x] Stable identity and relationship rules are explicit.
- [x] Provenance and prohibited fields are explicit.
- [x] Missing/value/unit/finality states are explicit.
- [x] Required/optional collection failure behavior is explicit.
- [x] Refresh planning, diff, review, and acceptance are explicit.
- [x] Strata, samples, SPT, comments, groundwater, interims, lookups, hatches, and laboratory facts have bounded semantics.
- [x] Open authorized fields have a safe explicit binding path.
- [x] Overrides and source-resolution decisions do not mutate or masquerade as source truth.
- [x] Shared-axis Data Track ownership is explicit.
- [x] Evidence-blocked positive wire shapes have defined unavailable behavior and an exact follow-up owner.

No implementation agent is authorized to fill an evidence-blocked mapping or change these invariants silently.
