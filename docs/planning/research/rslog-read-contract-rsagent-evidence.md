# RSLog read contract and restricted-evidence public handoff

**Status:** evidence-backed planning contract; no application implementation  
**Research ticket:** #8  
**Research date:** 2026-08-13  
**Proposed contract identifier:** `rsrender.source-adapter.rslog.v0`  
**Restricted local evidence review date:** 2026-08-05; underlying custody details are outside the public tree  

## Executive conclusions

1. RSLog cannot be represented by one API document. The supported integration baseline is the public `/api/v1` reference plus vendor-confirmed behavior. Restricted local observations show that tenant/data-template and response-shape variation exists, but their route inventory and custody details are not public implementation inputs.
2. RSrender must implement a read-only **Source Adapter**, not reuse RSAgent's write-oriented schema. It may call an explicitly allowlisted `POST` only when that endpoint is observational and returns data; HTTP verb alone does not establish domain mutation. No create, update, delete, bulk-delete, import, or inline-update route is in scope.
3. Identity is source ID, never display name. RSLog GUIDs and lookup IDs are opaque. They must be scoped to the tenant, data template, contract snapshot, and retrieval time that supplied them; they must never become global RSrender constants.
4. A Refresh must distinguish `success`, `empty`, and `failed` for every requested collection. Restricted review found prior integration conveniences that collapsed some failures into empty defaults; that behavior is specifically unsuitable for RSrender's commercial document lifecycle. The underlying code location is withheld and is not an implementation dependency.
5. RSLog has three materially different groundwater families: drilling/after-drilling observations on the Exploration, piezometer/well time-series measurements, and drilling-groundwater detail data. They cannot be flattened into one untyped “water level.” Current Rocscience documentation separately describes during, short-term-after, long-term-after, and piezometer readings, including measured/not-measured/dry distinctions ([Groundwater Data](https://www.rocscience.com/help/rslog/documentation/groundwater-data)).
6. Restricted authorized evidence indicates SPT/field-test data beyond the older public v1 sample description. The Render Dataset therefore prefers a supported field-test record plus column metadata when #43 establishes it; sample `blowCounts` remains an explicitly labeled compatibility/fallback field, never a silent equivalent.
7. Laboratory access remains an explicit #43 prerequisite uncertainty. Current RSLog help establishes that lab results are sample-linked and renderable, including moisture, LL, and PL ([Lab Tests](https://www.rocscience.com/help/rslog/documentation/data-entry-design/lab-tests), [Log Columns](https://www.rocscience.com/help/rslog/documentation/reporting/report-templates/borehole-log-columns)). Restricted evidence reached only route/property-existence grades for candidate reads and unpopulated lab-shaped fields. It does **not** prove current-role access, populated types/units, completeness, vendor support, or permission to use the withheld evidence. A validated Supplemental Source remains the MVP path pending #43.
8. Hatch identity and hatch artwork are separate concerns. A stratum's `soilSymbolId` can be read, and lookup metadata can be cached, but the reliable, redistributable asset-retrieval contract remains unresolved. Missing art must produce a visible Diagnostic and an explicit fallback, never an invented hatch.

## Scope and terminology

This report uses the RSrender domain vocabulary:

- **Log Project** — the stateful RSrender document.
- **Exploration** — the RSrender concept corresponding initially to an RSLog borehole/test hole.
- **Source Data** — facts obtained from RSLog. RSrender never edits these facts remotely.
- **Source Adapter** — the versioned read-only boundary that authenticates, retrieves, validates, and maps RSLog data.
- **Source Snapshot** — the immutable local result of an accepted Refresh, retaining Source Data for offline Log Project work and generation.
- **Render Dataset** — the typed, renderer-facing projection derived from an accepted Source Snapshot, validated Supplemental Sources, and project-local Presentation Overrides.
- **Refresh** — a deliberate retrieval and atomic acceptance workflow. It does not silently occur merely because a template is opened.
- **Diagnostic** — a structured, user-visible warning or error with source and remedy context.
- **Supplemental Source** — a separately proven source for data not available through the primary RSLog Source Adapter. None is approved by this report.

The Source Adapter is read-only. Local presentation corrections may be pasted or entered through RSrender editing tools, but they are presentation overrides in the Log Project; they do not change Source Data and must remain distinguishable from it.

## Evidence method and authority

### Authority ladder

| Rank | Evidence | What it can establish | What it cannot establish |
|---|---|---|---|
| A | Current first-party Rocscience help | Current product concepts, UI semantics, renderable data families, tenant/data-template behavior | Exact private application DTO, role permission, stable API availability |
| B | Restricted local application-surface observation | That additional read-looking capabilities were advertised at the review date | A publishable route inventory, permission, successful invocation, populated semantics, vendor support, or implementation authority |
| C | Restricted value-free response-shape observation | Sanitized functional conclusions about identity, null-vs-absent discipline, and known source families for the exact context tested | A transferable schema, wire-field inventory, other tenant/template variants, or universal completeness |
| D | Vendored official `/api/v1` reference | Documented v1 endpoints and claimed request/response fields | Undocumented application routes; freedom from documentation errors |
| E | Restricted RSAgent code/test review | Sanitized conclusions about prior integration behavior | A public source location, reusable implementation, independent vendor truth, or permission to publish the reviewed material |
| F | Restricted prior findings | Sanitized corrections to earlier assumptions | A public evidence package or timeless contract; every conclusion retains its evidence grade and review date |

Current product semantics were checked against Rocscience's [RSLog overview](https://www.rocscience.com/help/rslog/overview), [technical specifications](https://www.rocscience.com/help/rslog/overview/technical-specifications), [test-hole data-entry guide](https://www.rocscience.com/help/rslog/documentation/data-entry-design/test-holes/data-entry), [data-template guide](https://www.rocscience.com/help/rslog/documentation/settings/data-templates), [lab-test guide](https://www.rocscience.com/help/rslog/documentation/data-entry-design/lab-tests), [groundwater guide](https://www.rocscience.com/help/rslog/documentation/groundwater-data), [log-column guide](https://www.rocscience.com/help/rslog/documentation/reporting/report-templates/borehole-log-columns), and [SPT guide](https://www.rocscience.com/help/rslog/documentation/spt-data-on-the-log).

### Restricted local evidence custody

Sibling-repository code, tests, prior findings, a value-free contract capture, and a sanitized reference procedure were reviewed read-only. Their absolute paths, file inventory, source-line anchors, capture counts, hashes, undocumented route inventory, DTO/property inventory, and tenant/template lookup material are intentionally excluded from this public report. The material remains with its existing local custodian outside the public tree pending employer/counsel/vendor publication and use disposition.

The surviving public handoff is limited to the functional conclusions and evidence grades stated here: exact source identity and provenance matter; empty and failed are distinct; source families must not be flattened; SPT custom-column semantics require metadata; interims may require detail completion; and several source shapes remain unproved. This handoff is not permission to reconstruct the withheld inventory, call an unpublished route, or copy RSAgent implementation. See the [ownership and clean-room boundary](ownership-licensing-clean-room-commercialization.md#public-handoff-and-restricted-evidence-boundary).

## Proposed Source Adapter contract

### Contract identity and compatibility

`rsrender.source-adapter.rslog.v0` is a planning contract, not an implementation version. Every accepted Source Snapshot must record:

- adapter identifier and semantic version;
- source contract capture timestamp and content hashes;
- retrieval start/end time;
- opaque tenant scope key, RSLog project ID, and data-template ID when present;
- requested Exploration IDs and exact returned IDs;
- collection-by-collection completion manifest;
- mapping/transformation version;
- unit-system and coordinate-system identifiers;
- diagnostics and user-approved suppressions;
- canonical content hash for each source record and the full snapshot.

A later adapter may change endpoint selection without changing Render Dataset semantics. Any mapping or meaning change requires a new adapter/mapping version and deterministic migration or re-Refresh.

### Required operations

| Operation | Result | Decision |
|---|---|---|
| `authenticate` | access/refresh session held only by the adapter | Support 200 token response, 202 two-factor challenge, verification, and refresh. Credentials and tokens never enter a Log Project, Source Snapshot, Render Dataset, logs, crash reports, or Diagnostics. |
| `listProjects` | summaries with source ID and exact display identifiers | Used for explicit user selection. Never fuzzy-select a similarly named project. |
| `getProject` | full project record | Must confirm the selected source ID and capture project/template/unit metadata. |
| `listExplorations` | complete project roster | Must preserve source order if supplied and source IDs regardless of duplicate names. |
| `getExploration` | full borehole/test-hole record | Must confirm parent project ID where returned. |
| `readCollection` | typed `FetchResult<T[]>` | Used for strata, samples, field tests, comments, drill runs, boring details, interim variations, piezometers, pipes, groundwater measurements, and lookups. |
| `readDetail` | typed `FetchResult<T>` | Used when list DTOs omit fields, notably interim detail. |
| `refresh` | staged Source Snapshot candidate plus comparison | User-initiated, validates completeness, then atomically accepts or retains the prior snapshot. |

### Fetch result and completeness semantics

Every requested resource returns one of three states:

| State | Meaning | Renderer consequence |
|---|---|---|
| `success` | Request completed and validated with one or more records | Map records; retain provenance and any record-level Diagnostics. |
| `empty` | Request completed successfully and the service explicitly returned no records | Render the intentionally empty state where applicable. |
| `failed` | Transport, authentication, authorization, throttling, server, decode, schema, relationship, or validation failure | Never replace with an empty collection. Mark Source Snapshot candidate incomplete and show a non-silent Diagnostic. |

Each result also records route, method, parameters with sensitive values redacted, HTTP status, attempt count, retrieval time, response hash, declared/observed schema version, and whether pagination was exhausted.

Required collection failure blocks acceptance of the new Source Snapshot. The prior accepted snapshot remains usable and is marked stale. Optional collection failure may be accepted only if the product specification names that collection optional and the user explicitly sees the consequence. A `403` is “forbidden,” not “empty”; a `404` is interpreted only in the context of the exact route; invalid JSON is a decode failure, not `{}`.

Restricted RSAgent review showed a bounded transient retry budget, one refresh/replay after `401`, and distinct authentication, authorization, relationship, duplicate, rate-limit, transient-service, and validation failure categories. RSrender should preserve those public functional requirements while retaining full result state; this conclusion neither publishes nor licenses the reviewed implementation.

### Authentication contract

The official v1 reference documents:

- `POST /api/connect/token` with username, password, and company form fields;
- `200` with access/refresh tokens;
- `202` with two-factor status, provider, masked email, and message;
- `POST /api/connect/verify` for the verification code;
- `POST /api/connect/refresh` for token refresh.

See the public [RSLog API documentation](https://www.rslogonline.com/APIDocumentation/index.html). Restricted RSAgent review independently showed the same state split and a distinct two-factor challenge. A prior authorized observation had an account-specific expiry and no two-factor challenge, but its value and account context are withheld and it is not a tenant-independent lifetime or proof that two-factor authentication will not occur.

Contract decisions:

- login is an interactive adapter concern; no credential discovery or credential-file search is allowed;
- a two-factor challenge pauses Refresh without losing the prior accepted Source Snapshot;
- refresh failure does not silently submit the password again;
- one token refresh and one replay are allowed after a `401`; repeated `401` becomes a visible authentication failure;
- `403` becomes authorization failure for the exact surface, not an authentication retry loop;
- masked 2FA destinations may be displayed transiently but are not stored in the project file;
- secrets must be stored only through the desktop platform's approved secret storage, a later architecture decision.

## Atomic read-capability matrix

“Observed” means value-free shape evidence from the single authorized contract-capture context, not universal tenant behavior.

| Capability | Candidate read surface | Evidence state | Source Adapter decision / edge case |
|---|---|---|---|
| Project list/detail | `/api/v1/project`, `/api/v1/project/{id}`, `/api/v1/projects` | Documented; project shape observed | Preserve `id`, title/job number, `dataTemplateId`, unit/coordinate system IDs, audit metadata, and unknown extension fields. |
| Exploration roster | `/api/v1/project/{id}/boreholes` | Documented and observed | Duplicate names are legal from RSrender's perspective; source ID is identity. Confirm each returned borehole belongs to selected project where parent ID exists. |
| Exploration detail | `/api/v1/borehole/{id}` | Documented and observed | Preserve type, status, depth, location, dates, drill/hammer metadata, notes, and all groundwater families without conflation. |
| Strata | `/api/v1/borehole/{id}/stratigraphies`; direct stratum GET | Documented and observed | Preserve interval, classification system, structured classification payload/string, description, lookup IDs, fill, line style, hatch ID, audit metadata. Do not regenerate source description unless explicitly rendering a local derived field. |
| Interim variations | Public v1 stratum-interim surface; any supplemental detail read remains vendor-confirmation work | Documented point model; restricted observations support list/detail incompleteness but publish no route | Variation is a point at one depth, not an interval or comment. Enumerate by parent stratum. When a supported list DTO omits required detail, fail visibly until a vendor-confirmed detail read exists. |
| Samples | Public single-sample read plus a vendor-confirmed collection read to be settled in #43 | Direct sample read documented; restricted evidence supports collection-shaped data but publishes no undocumented route | Preserve interval/point depth, number, type lookup, recovery/RQD, description/color, and explicitly proven compatibility fields. A missing public collection contract is not evidence samples cannot be read. |
| SPT / field tests | Vendor-confirmed field-test read and test-type/column metadata, to be settled in #43 | Restricted authorized evidence supports the functional family but publishes no route inventory | Prefer a supported field-test entity. Parse configurable data defensively while retaining original/hash. Support N1-N4, P1-P4, N-value, N60, and drive/recovery dimensions only after column metadata identifies semantics. |
| Comments | `/api/v1/borehole/{id}/comments` | Documented and observed | Depth-related note. Preserve source text exactly and treat public 500-character statement as a v1 claim, not a renderer limit. |
| Boring details | `/api/v1/borehole/{id}/boring-details` | Documented and observed | Interval segments for method, rig, bit, casing, diameters, notes, date/time. Lookup-resolve with snapshot-scoped catalogs. |
| Drill runs | `/api/v1/borehole/{id}/drill-runs` and direct GET | Documented and observed | Preserve source `run` as text, interval, recovery metrics, RQD/RMR and discontinuity fields. Do not coerce run label to number. |
| Drilling/after-drilling groundwater | borehole detail fields | Observed; current UI semantics documented | Model during, short-term-after, and long-term-after separately, including timestamp and measured/not-measured semantics if available. Do not infer missing from dry. |
| Drilling-groundwater detail | `drillingGroundwaterLevels` and related borehole properties | Observed property family, inner contract incomplete | Preserve as source extension until a populated value-free shape is captured. Never fold into a single scalar. |
| Piezometer/well installation | `/api/v1/borehole/{id}/piezometers`; direct composite GET; pipe/measurement child reads | Documented; target collection observed empty | Model nested wells, installation, pipe segments, and measurements. Exact read DTO and depth representation require a populated fixture. |
| Piezometer groundwater measurement | `/api/v1/piezometer/{id}/groundwater-measurements`; direct groundwater GET | Documented; target collection observed empty | Preserve water-present/dry state, depth, calculated elevation if returned, date/time, weather/notes, parent piezometer. Never infer elevation without collar elevation and unit context. |
| Lookups | documented public lookups plus vendor-confirmed template-scoped catalogs | Broadly documented; restricted observation supports tenant/template variation but publishes no inventory or count | Snapshot by tenant + data template + retrieval. Store IDs and labels used by source records, even if a later lookup Refresh changes them. |
| Soil symbols/hatches | Public soil-symbol metadata where documented; binary asset retrieval remains unproved | Classification/presentation separation is documented; restricted lookup observation supports only the functional distinction | Cache only metadata and assets obtained through a supported, rights-cleared contract; otherwise use an explicit neutral fallback. |
| Laboratory/index tests | Validated Supplemental Source for MVP; supported public read is #43 work | Public help proves semantics; restricted evidence reached only unpopulated-property and advertised-read grades | Keep API prerequisite open. Do not claim complete or unavailable. #43 must settle supported route, role, DTO, units, status, nulls, sample relation, and pagination before API use. |

### SPT semantics

The older v1-only investigation found no complete SPT surface in the documented sample API. Restricted authorized evidence later showed a field-test record with configurable test-column data, but its service names, routes, wire-property inventory, and capture anchors are withheld from the public tree and are not implementation authority.

Current Rocscience help says SPT entry uses N1-N4 and P1-P4, calculates N-value and N60, and allows test columns to be customized ([SPT Data on the Log](https://www.rocscience.com/help/rslog/documentation/spt-data-on-the-log)). Therefore any supported field-test payload must be interpreted through vendor-confirmed field/test-type metadata. RSrender must not hard-code that every record has the same columns.

Precedence for the Render Dataset:

1. supported field-test record plus its test-type/column definition;
2. source-provided N-value/N60 when identified by column metadata;
3. optional locally derived N-value only when the product specification names the formula and records a derivation provenance entry;
4. sample `blowCounts` only as an explicitly labeled compatibility/fallback value.

No fallback may overwrite or masquerade as a more authoritative source.

### Groundwater semantics

RSLog's current help distinguishes during-drilling, short-term-after, long-term-after, and piezometer/well measurement data. It also distinguishes measured values from no measurement and from dry/no-water states, and calculates elevation only when collar elevation is available ([Groundwater Data](https://www.rocscience.com/help/rslog/documentation/groundwater-data), [Test-hole Data Entry](https://www.rocscience.com/help/rslog/documentation/data-entry-design/test-holes/data-entry)). The Source Adapter therefore exposes separate types:

| Render Dataset type | Cardinality | Required semantics |
|---|---:|---|
| `ExplorationWaterObservation` | 0..3+ typed observations | observation kind, measurement state, depth, date/time, source field, unit context |
| `PiezometerInstallation` | 0..n per Exploration | well type, plug/end-cap, stickup, pipes, instrument relation, source ID |
| `PiezometerWaterMeasurement` | 0..n per installation | water-present/dry state, depth, elevation only if sourced/derivable with collar elevation, date/time, temperature, weather/notes |
| `DrillingGroundwaterDetail` | 0..n/opaque pending contract | retain separately until populated shape proves its inner model |

Restricted prior evidence supports open-hole groundwater as Exploration-level fields. The public v1 reference separately documents composite piezometers, pipe segments, and groundwater child reads. Neither surface justifies merging them.

### Interim-variation semantics

The public v1 reference describes an interim as one depth, a variable code, and a typed/reference value. Current UI help describes interim changes as moisture, color, and consistency changes within a stratum ([Test-hole Data Entry](https://www.rocscience.com/help/rslog/documentation/data-entry-design/test-holes/data-entry)). Restricted authorized evidence supports the narrower conclusion that a list projection can omit detail needed for rendering. Its codes, route, and capture anchors are withheld; #43 must establish any supported detail-read contract.

Contract decisions:

- parent is the source stratum ID;
- location is a point depth;
- value remains a discriminated union: number, text, lookup reference, color, or unknown extension;
- source variable code and original JSON type are always preserved;
- list entries with missing detail required for rendering trigger a vendor-confirmed detail-read capability or a blocking Diagnostic;
- absent detail after a successful direct read is a null/absent value, while failed detail read is a Diagnostic and incomplete candidate.

### Hatch and soil-symbol semantics

A stratum's classification determines geotechnical meaning; its log-symbol selection determines presentation. Rocscience help explicitly allows a log symbol to be selected or customized separately from the classification and allows custom hatch patterns ([Test-hole Data Entry](https://www.rocscience.com/help/rslog/documentation/data-entry-design/test-holes/data-entry), [Log Columns](https://www.rocscience.com/help/rslog/documentation/reporting/report-templates/borehole-log-columns)). Restricted local evidence independently supports that separation but is not published as a wire contract.

Restricted evidence observed soil-symbol lookup metadata. It did not prove an authorized, stable binary asset route or redistribution right, and the exact route, record count, property inventory, and capture anchor are withheld.

RSrender must:

- preserve source `soilSymbolId` and source classification independently;
- store a snapshot-scoped lookup record even when the lookup DTO lacks `dataTemplateId`;
- embed an asset in the Source Snapshot only if a later evidence ticket proves the route and licensing/storage boundary;
- show a visible “hatch asset unavailable” Diagnostic with a neutral fallback;
- never synthesize an Esri/Rocscience asset or infer a hatch from a classification label.

## Sanitized functional shape requirements

The restricted observation is summarized only at the domain-family level. Exact key inventories, record counts, lookup values, routes, hashes, and source anchors are withheld.

| Entity | Public functional requirement | Evidence limitation |
|---|---|---|
| Project | Preserve opaque identity, display/job metadata, data-template and unit/coordinate context, and audit/provenance when supported. | Field presence and nullability vary; #43 or public vendor documentation must establish the wire contract. |
| Exploration | Preserve source/parent identity, name, depth, status/type, location/elevation context, groundwater families, and drilling metadata without flattening. | Restricted observation was one context, not a universal schema. |
| Stratum | Preserve interval, classification, source description, presentation-symbol reference, descriptors, and style metadata separately. | Structured classification may require versioned parsing; preserve the source representation before parsing. |
| Sample | Preserve identity/parent, point-or-interval depth, number/type, recovery/RQD, description, and separately proven SPT/laboratory compatibility data. | Laboratory semantics and supported populated shapes remain #43 uncertainties. |
| Comment, boring detail, drill run | Preserve source/parent identity, depth or interval, original text/labels, drilling and recovery metrics, and absence separately from zero. | Exact wire keys are not published here. |
| Interim and piezometer | Preserve as distinct typed families, but block unsupported detail rather than inventing a schema. | Restricted target shapes were insufficient; populated supported fixtures remain required. |
| Lookups and soil symbols | Scope identifiers and labels to tenant, data template, and snapshot; keep classification separate from presentation art. | Exact counts and properties are withheld; no binary asset or redistribution right is established. |

For unknown fields, the adapter retains a Source Extension envelope containing an approved field identity, JSON type, null-vs-absent state, and canonicalized value in the confidential local Source Snapshot. Unknown fields are not exposed as arbitrary executable expressions. Credentials, tokens, secret-bearing headers, and authentication request bodies are always excluded.

## Field-to-Render-Dataset provenance

The table identifies the initial mapping authority. A field absent from this table is not silently invented; it stays in the source-extension envelope or receives a mapping ticket.

| Render Dataset field/family | Preferred source | Alternate/derived source | Required provenance and rule |
|---|---|---|---|
| `project.sourceId` | project `id` | none | Opaque string; exact identity. |
| `project.title`, `project.jobNumber` | project title/job fields | local presentation override only | Preserve raw field and local override separately. |
| `project.unitContext` | `unitSystemId` plus resolved lookup | none | Snapshot-scoped lookup and retrieval time. Do not infer from numeric magnitude. |
| `exploration.sourceId` | borehole `id` | none | Opaque string; name is display only. |
| `exploration.name`, `depth`, `collarElevation`, coordinates | borehole detail | local presentation override | Record source key, JSON type, unit/coordinate-system context, null-vs-absent. |
| `stratum.interval` | stratum `from`/`to` | none | Record original values and unit context; validation may diagnose gaps/overlaps but not rewrite. |
| `stratum.description` | source `description` | optional local presentation text | Do not silently recompile from classification fields. |
| `stratum.classification` | `classificationSystem`, `soilClassLayer`, classification IDs | parsed structured projection | Retain raw JSON string/hash and parser version; failed parse leaves source text available and emits Diagnostic. |
| `stratum.hatchRef` | `soilSymbolId` plus lookup | neutral fallback | Fallback is presentation-only and diagnostically labeled. |
| `interim.depth/type/value` | supported interim list plus supported detail capability where required | none | Parent stratum ID, variable code, original type; retrieval provenance and response hash when used. |
| `sample.interval/point` | sample `depth`/`to` | none | `to = null` remains a point/unknown end, not zero-length interval unless specification decides so. |
| `sample.type` | sample `typeId` plus sample-type lookup | unresolved label retained from record if supplied | Lookup snapshot and unresolved-ID Diagnostic. |
| `sample.recovery/RQD` | sample source fields | none | Preserve source string/number type; parse only with transformation provenance. |
| `fieldTest.SPT` | vendor-confirmed field-test entity plus test-type column definitions | sample `blowCounts` compatibility | Entity ID, test type ID, raw configurable-data hash, column-definition snapshot, parser version. |
| `fieldTest.nValue/n60` | source identified field-test columns | explicit RSrender derivation after later decision | Mark `source` vs `derived`; record formula/version and inputs for derived value. |
| `comment` | borehole comments | none | Source ID, depth, original text; no renderer character limit inherited from v1 docs. |
| `drillingSegment` | boring detail | none | Parent ID, interval, source lookup IDs and resolved labels. |
| `drillRun` | drill-run record | none | Parent ID, interval, run text, source metric fields. |
| `groundwater.openHole` | distinct borehole groundwater columns | none | Observation kind and measured/null state; no merging across kinds. |
| `groundwater.piezometer` | piezometer measurement child record | elevation may be derived from sourced collar elevation and depth | Mark source/derived elevation and formula/unit context. Preserve dry/no-water separately. |
| `lab.moisture`, `lab.PL`, `lab.LL` | validated Supplemental Source for MVP; supported public API read is unresolved in #43 | no API compatibility field is approved | Never prefer a candidate field until populated-type/unit/status comparison and vendor confirmation are complete. Mark unavailable rather than zero. |
| `audit.created/modified` | source audit fields when present | canonical record hash comparison | Preserve timestamps/actors as source metadata. Null timestamp falls back to hash-based Refresh comparison, not “unchanged.” |

Every mapped record carries a `SourceProvenance` envelope with adapter/version, contract-capture date/hash, API surface and route, retrieval time, opaque tenant scope key, project/data-template ID, remote entity type/ID and parent ID, wire field, null-vs-absent state, original JSON type, unit/lookup resolution, raw-record hash, and transformation version.

## Laboratory/index-test uncertainty

### What is established

- RSLog's current UI stores lab results by sample and includes Index, Strength, Chemical, and User-Defined categories. Completed status gates a result in the documented workflow ([Lab Tests](https://www.rocscience.com/help/rslog/documentation/data-entry-design/lab-tests)).
- RSLog's log designer renders Atterberg limits, moisture, general lab results, and a combined LL/PL/moisture plot; the customizable graph can combine field and lab data ([Log Columns](https://www.rocscience.com/help/rslog/documentation/reporting/report-templates/borehole-log-columns)).
- Restricted evidence advertised laboratory-oriented application reads and showed unpopulated lab-shaped properties on an authorized sample response. This reached route/property-existence grades only; exact routes, DTOs, properties, counts, hashes, and capture anchors are withheld.

### What is not established

The exact tested negative surface must be stated narrowly:

- **Public v1 reference negative:** the public [RSLog API documentation](https://www.rslogonline.com/APIDocumentation/index.html), checked 2026-08-13, contains no documented laboratory-result read resource or exact MC/PL/LL response contract. This says only that the named public surface does not document one.
- **Restricted observed-project negative:** lab-shaped sample properties were unpopulated, so the observation did not establish their non-null JSON types, units, rounding, source-of-truth precedence, or completeness. Exact wire-property names are withheld.
- **Restricted-observation coverage negative:** the laboratory-oriented unpublished reads were advertised but not invoked. The withheld observation therefore does not prove successful authorization or a populated response DTO.
- **No fixture negative:** the captured project had no populated response shape for `soil-mech-test-result` or `lab-test-detail`. It cannot establish whether canceled/in-progress results are returned, how status and notes appear, or how multiple results relate to one sample.

The older broad statement in restricted prior findings that laboratory results were inaccessible was based on the public/prior surface then tested. It is no longer safe as a general conclusion, but remains accurate for that named public/prior surface. The correction does not authorize use of the withheld unpublished surface.

### Required prerequisite research/prototype

Before laboratory fields enter the MVP's required Refresh manifest, an authorized read-only probe must:

1. use a deliberately selected fixture containing populated moisture, PL, and LL results and known sample relationships;
2. capture only an employer/counsel/vendor-approved redacted schema and locally protected fixture comparison under #43's authorization rules;
3. call only documented or vendor-confirmed public reads with the required project, Exploration, data-template, and Sample context; do not rediscover or probe unpublished routes from restricted evidence;
4. record `success`, `empty`, `403`, `404`, decode failure, and pagination independently;
5. establish non-null types, unit source, precision, status, notes, sample ID relation, deletion/cancellation visibility, duplicate/multiple-result behavior, and whether sample compatibility fields agree with result entities;
6. compare what RSLog's own log preview renders for the same authorized fixture without copying proprietary assets;
7. decide the authoritative mapping and leave any unsupported field diagnostically unavailable.

This report does not perform that probe and does not authorize credential access.

## Uncertainty register

| ID | Uncertainty and exact tested surface | Impact | Resolution ticket type / exit evidence |
|---|---|---|---|
| RSL-U01 | Lab result DTO/permission: public documentation has no result contract; restricted observations reached only unpopulated property and advertised-read grades | Blocks reliable moisture/PL/LL API access | #43 authorized public/vendor-confirmed probe; populated sanitized shapes, status/units/sample relation, role result, precedence decision |
| RSL-U02 | Piezometer item schema: `/api/v1` schema is documented, but restricted observation did not establish a populated shape | Blocks faithful well construction and monitoring rendering | Authorized populated fixture; compare supported composite/detail/child reads and document IDs, intervals, dry state, units |
| RSL-U03 | Interim item shape across templates: restricted prior behavior supports list/detail incompleteness, but no publishable populated contract exists | Risks missing typed changes and colors | Populated multi-variable fixture; supported list/detail equivalence matrix and detail-completion rule |
| RSL-U04 | Hatch binary retrieval and redistribution: metadata/filename and soil-symbol-code route observed/published; no stable authorized asset contract tested | Blocks exact offline hatch rendering | Vendor/API research plus asset-fetch prototype and licensing decision; cached bytes/hash/mime or explicit fallback decision |
| RSL-U05 | Supported API contract durability: unpublished application observations are neither public compatibility promises nor approved inputs | Adapter maintenance risk | Vendor-supported contract/version evidence; compatibility fixtures; version gate and visible “source contract changed” Diagnostic |
| RSL-U06 | Pagination/default page size for any vendor-confirmed field-test or laboratory read | Could silently truncate data | Supported-route pagination test; prove terminal-page detection and count reconciliation |
| RSL-U07 | 2FA frequency/provider behavior: v1 documents 202; one account observed 200 without 2FA | Refresh UX uncertainty | Supervised auth prototype with no secret capture; document challenge/cancel/retry/recovery states |
| RSL-U08 | Token lifetime: one account returned about three days; no tenant-independent guarantee | Background refresh/recovery risk | Treat expiry as supplied data; tests for expiration during multi-Exploration Refresh |
| RSL-U09 | Stable modified metadata: many observed records expose audit timestamps, but nullability and consistency are not proven across all entities | Refresh diff reliability | Per-entity fixture comparison; always retain canonical content hash fallback |
| RSL-U10 | `drillingGroundwaterLevels` inner shape: borehole property observed/referenced but no complete populated value-free inner schema documented here | Risks flattening groundwater | Populated read-only fixture; discriminated representation or retained extension |
| RSL-U11 | Sample collection documentation: restricted integration evidence supports a collection read that the checked public guide does not document | Public-contract drift | #43 vendor confirmation or supported collection contract; do not publish or adopt a withheld route |
| RSL-U12 | Tenant/template dependence of soil-symbol IDs whose observed lookup rows lack `dataTemplateId` | Wrong hatch/label after template switch | Keep tenant+snapshot scope; compare two authorized templates before considering any broader cache key |
| RSL-U13 | SPT configurable payload and column-definition evolution | Parser could silently mislabel N/P values | Obtain supported test-type/column definitions per template; schema-driven parser and unknown-column preservation |
| RSL-U14 | Partial response/relationship anomalies: current v1 docs list HTTP status codes but do not specify collection completeness | Could accept a corrupt Source Snapshot | Roster/count/parent/depth integrity checks, per-route result state, candidate rejection rules |

## Refresh validation and diagnostics

A candidate Source Snapshot is decision-complete only when:

- selected project and every requested Exploration resolve by exact source ID;
- the returned project/parent relationships match the request;
- every required collection has `success` or `empty`, never an unexamined default;
- all pages are exhausted and any advertised total count reconciles;
- each child record's parent ID is known or explicitly diagnosed;
- lookup IDs resolve within the captured tenant/data-template snapshot, or unresolved IDs retain their source value with a Diagnostic;
- intervals/depths remain as sourced and gaps, overlaps, reversals, out-of-depth records, and unit ambiguity are diagnosed rather than repaired silently;
- every field is either mapped with provenance, retained as an extension, or named as intentionally discarded by a future decision;
- raw payload hashes, contract hashes, transformation version, and completion manifest are stored;
- the old accepted Source Snapshot is retained until the new candidate passes acceptance.

Diagnostics must include a stable code, severity, affected project/Exploration/entity/field, source surface and route, retrieval timestamp, observed state, renderer consequence, and remedy. A user may suppress eligible warnings at the Log Project level, but suppression hides presentation only: it does not erase the underlying Diagnostic or make a failed collection “empty.” Authentication failures, incomplete required Refreshes, and export-blocking missing data cannot be silently suppressed.

## Boundaries and non-goals

- No RSLog mutation is permitted. Published `create`, `update`, `inline-update`, `delete`, `delete-all`, import, bulk, or write endpoints are evidence only and are not Source Adapter capabilities.
- No credentials, tokens, tenant secrets, or raw authentication payloads are read from RSAgent, copied into this repository, or stored in RSrender documents.
- RSAgent remains read-only. This report does not modify it or adopt its write-oriented Pydantic/domain schema.
- This report neither publishes nor approves an undocumented application-service contract. A Source Adapter may use only documented or vendor-confirmed reads admitted through #43; versioning, contract hashes, validation, and Diagnostics remain required.
- The separately accepted laboratory decision uses a validated, provenance-bearing Supplemental Source for MVP. That path is deliberate local input, not an undocumented API workaround and not RSLog mutation.
- Local presentation overrides never write back to RSLog and never replace Source Data provenance.
- Photo/attachment ingestion, write-back reconciliation, live collaboration, RSLog template import, historical generated-log archiving, and MCP control are outside this ticket. The future MCP boundary should call the same validated application/domain commands, not bypass Source Adapter or provenance rules.
- This ticket does not decide renderer layout behavior, page pagination, graph styling, or export policy except where the data contract must preserve information needed by those systems.

## Primary source index

### Rocscience

- [RSLog Overview](https://www.rocscience.com/help/rslog/overview)
- [Technical Specifications](https://www.rocscience.com/help/rslog/overview/technical-specifications)
- [Test-hole Data Entry](https://www.rocscience.com/help/rslog/documentation/data-entry-design/test-holes/data-entry)
- [Lab Tests](https://www.rocscience.com/help/rslog/documentation/data-entry-design/lab-tests)
- [Groundwater Data](https://www.rocscience.com/help/rslog/documentation/groundwater-data)
- [Log Columns](https://www.rocscience.com/help/rslog/documentation/reporting/report-templates/borehole-log-columns)
- [SPT Data on the Log](https://www.rocscience.com/help/rslog/documentation/spt-data-on-the-log)
- [Data Templates](https://www.rocscience.com/help/rslog/documentation/settings/data-templates)
- [CSV Import](https://www.rocscience.com/help/rslog/documentation/getting-started/csv-import)

### Restricted local evidence

Restricted local material was reviewed read-only and remains outside the public tree under its existing custody. Its locations, file inventory, route/property inventory, counts, hashes, and source anchors are not published. The functional conclusions retained in this report require either public first-party support or a future approved sanitized handoff before implementation use.

## Decision handoff

This public handoff is sufficient to close the **domain-facing** Source Adapter contract: identity/provenance rules, all-or-nothing Refresh acceptance, failure semantics, source-family separation, and the rule that unsupported content remains an inert extension or visible fallback. It is not a publishable wire contract for any route or field supported only by restricted evidence. Ticket #43 owns vendor-supported positive shapes and rights for field tests, populated laboratory results, piezometer/drilling-groundwater/interim details, pagination variants, and hatch assets. Implementation may build the generic boundary and public-documented mappings, but must not reconstruct, assume, or silently fill any #43-blocked route, DTO, field, or asset contract.
