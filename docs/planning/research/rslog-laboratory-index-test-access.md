# RSLog laboratory and index-test data access research

Status: evidence record for Wayfinder ticket #9  
Research date: 2026-08-13  
Scope: read-only access to sample-associated laboratory/index-test data needed by RSrender, with emphasis on moisture content, plastic limit (PL), and liquid limit (LL). This investigation does not authorize RSLog mutation, does not change RSAgent, and does not treat endpoint discovery as permission or semantic proof.

## Executive answer

RSLog unquestionably stores and renders the required data. Rocscience's current product documentation says laboratory results are entered per sample; identifies moisture content as an Index Tests value; identifies LL and PL as the source of its Atterberg Limits column and Atterberg Limits & Moisture Plot; and supports plotting moisture, LL, PL, and other series together. [Lab Tests](https://www.rocscience.com/help/rslog/documentation/data-entry-design/lab-tests), [Log Columns](https://www.rocscience.com/help/rslog/documentation/reporting/report-templates/borehole-log-columns)

The current public API guide does **not** document laboratory-result endpoints or lab-result fields. It documents `GET /api/v1/sample/{id}` but not the borehole sample-collection route used successfully by RSAgent; its sample field table includes the qualitative `MoistureDescriptorId`, not moisture content, PL, or LL. Searches of the complete public guide for `MoistureContent`, `LiquidLimit`, `PlasticLimit`, and `Lab Test` returned no match on 2026-08-13. This is a negative finding about that named documentation surface only, not about the live server. [RSLog API documentation](https://www.rslogonline.com/APIDocumentation/index.html)

Restricted local evidence reviewed in 2026 showed why the older conclusion “laboratory data is not accessible via the API” must not be generalized. It indicated server-published read actions outside the public guide and lab-shaped properties on an authorized sample response. The underlying capture, route inventory, property names, counts, hashes, and local locations are withheld from this public tree pending employer/counsel/vendor publication disposition.

That evidence does **not** prove a usable adapter. Candidate lab properties were observed only in an unpopulated state, the unpublished application reads were not called, no role/permission result was recorded, and no returned value was compared with a known Lab Tests cell or rendered log. A withheld application-surface observation reached grade R only; current-account permission, non-null response shape, units, null/status semantics, field meaning, vendor support, and permission to use that evidence remain unresolved.

**Recommendation: use a validated Supplemental Source for MVP.** Accept a deliberately exported RSLog Lab Data Exchange workbook or a controlled CSV derived from it, validate and provenance-stamp it, and attach it to the Log Project as a **Supplemental Source**. Do not build against any undocumented application route for MVP. Promote laboratory data to the normal read-only **Source Adapter** only after an authorized probe demonstrates supported public-route values and Rocscience confirms the relied-on public response fields. An internal adapter remains outside the approved architecture.

## Safety and evidence method

No live RSLog call was made for this ticket. The environment contained none of `RSLOG_COMPANY`, `RSLOG_USERNAME`, or `RSLOG_PASSWORD`; only presence was checked, never values. No UI was scraped, no controls were bypassed, no endpoint was guessed, and no mutation or export POST was invoked.

Evidence grades are deliberately cumulative:

- **R - route existence:** the server publishes a verb, route, parameters, and return type name.
- **P - permission:** an identified authorized role receives a successful response from that exact route. Permission is tenant-, role-, feature-, and potentially project-scoped.
- **S - response shape:** a successful response establishes field names, types, cardinality, and association keys. A DTO name alone is not shape proof.
- **M - semantic proof:** non-sensitive known values entered through the supported RSLog workflow match returned values, units, sample association, state/null behavior, and official renderer output.
- **D - documented support:** the public vendor API documentation or written vendor confirmation commits to the route/fields for integration use.

An adapter recommendation should not treat R as P, P as S, or a suggestive field name as M. A commercially supportable Source Adapter additionally needs D or explicit vendor confirmation.

## Sources and dated coverage

### Current first-party web sources checked 2026-08-13

- [RSLog API Functions](https://www.rocscience.com/help/rslog/documentation/import/api-functions) says APIs support read/write access to project or borehole data, require an RSLog account, and direct users to the complete API guide. This broad statement is not a laboratory endpoint contract.
- [Complete RSLog API documentation](https://www.rslogonline.com/APIDocumentation/index.html) is the public `/api/v1` guide checked in full. It documents Samples and `GET /api/v1/sample/{id}` but contains no laboratory-result section or exact MC/PL/LL field names. It also states that features and correct permissions are required.
- [RSLog Lab Tests](https://www.rocscience.com/help/rslog/documentation/data-entry-design/lab-tests) establishes the sample relationship, Index/Strength/Chemical/User-Defined categories, result status workflow, CSV import, and official Lab Data Exchange workbook workflow.
- [RSLog Log Columns](https://www.rocscience.com/help/rslog/documentation/reporting/report-templates/borehole-log-columns) establishes how moisture, LL, and PL are consumed by the renderer and distinguishes moisture content from qualitative sample moisture level.
- [RSLog Data Templates](https://www.rocscience.com/help/rslog/documentation/settings/data-templates) establishes that a data template controls how data is collected, stored, and presented, including user-defined lab tests.
- [Rocscience licensing](https://www.rocscience.com/plans-pricing/licensing) expressly says RSLog Web Lease users can transfer account data to other applications through an API. It does not specifically authorize reliance on undocumented web-application internals.
- [RSLog Users](https://www.rocscience.com/help/rslog/documentation/account/user-management/users) establishes named-user licensing and role-based access, including Viewer users. It does not enumerate laboratory API permissions.

RSLog is a continuously deployed web product; none of the reviewed help pages states a server build number. All web negatives therefore carry the check date above, not an implied timeless version.

### Restricted local evidence custody

Read-only local evidence outside this public repository was reviewed without modification. It supports only these sanitized conclusions: RSAgent does not write laboratory records; a prior negative was limited to the public/prior surface then checked; an authorized sample read exposed unpopulated lab-shaped properties; and an unpublished application surface advertised candidate laboratory reads that were not invoked. The underlying repository paths, capture inventories, route/property inventories, counts, hashes, and source-line anchors are intentionally not published here.

This text is a public functional handoff, not the restricted evidence package and not permission to use or reconstruct it. Implementation may rely on the public Rocscience sources and the accepted Supplemental Source decision. Any use of the withheld material requires the employer/counsel/vendor disposition described in the [ownership and clean-room report](ownership-licensing-clean-room-commercialization.md#public-handoff-and-restricted-evidence-boundary).

No approved clean-room artifact displayed a known non-null MC/PL/LL value paired with its network response. The official renderer documentation is therefore semantic evidence, while a value-by-value renderer/network comparison remains outstanding under ticket #43.

## Product semantics established by Rocscience

| Semantic fact | First-party evidence | RSrender consequence |
|---|---|---|
| Laboratory results belong to samples | The Lab Tests table selects a test hole, then lists its samples in the first column; a result is entered in the sample/test cell. [Lab Tests](https://www.rocscience.com/help/rslog/documentation/data-entry-design/lab-tests) | Render Dataset laboratory records need a stable Exploration + Sample association, not only a depth. |
| Lab tests are categorized | Index, Strength, Chemical, and User-Defined are separate tabs/categories. [Lab Tests](https://www.rocscience.com/help/rslog/documentation/data-entry-design/lab-tests) | Preserve category and test identity; do not flatten every lab result to an untyped number. |
| Result availability has workflow state | Requested, In Progress, Reviewing, Complete, and Canceled are documented; the Result box becomes available when status is Complete. [Lab Tests](https://www.rocscience.com/help/rslog/documentation/data-entry-design/lab-tests) | Import status. A non-Complete test must not silently render as a final result. |
| Moisture content is an Index Test | The Moisture log column draws from Lab Tests > Index Tests > Moisture. [Log Columns](https://www.rocscience.com/help/rslog/documentation/reporting/report-templates/borehole-log-columns) | Name the quantitative result **Moisture Content**, not Moisture Level or moisture descriptor. |
| Qualitative moisture is different | The Samples column's Moisture Level shows descriptor symbols such as Dry or Moist; these are customizable descriptors. [Log Columns](https://www.rocscience.com/help/rslog/documentation/reporting/report-templates/borehole-log-columns) | `moistureDescriptorId` is not laboratory moisture content. Keep both fields in the Render Dataset. |
| Atterberg result display is LL + PL by default | The Atterberg Limits text column displays LL and PL by default and can show PI instead of PL. [Log Columns](https://www.rocscience.com/help/rslog/documentation/reporting/report-templates/borehole-log-columns) | Store source LL and PL independently; PI may be a derived display value with provenance, never a replacement for PL. |
| Atterberg graph source is LL and PL | The Atterberg Limits & Moisture Plot uses Liquid Limit and Plastic Limit entered on the Lab Tests page. [Log Columns](https://www.rocscience.com/help/rslog/documentation/reporting/report-templates/borehole-log-columns) | MC, PL, and LL must be individually bindable Data Layers on one shared Data Track/axis system. |
| Multiple lab/field series can share a graph | The customizable graph can combine SPT, moisture, pocket penetrometer, LL, and PL. [Log Columns](https://www.rocscience.com/help/rslog/documentation/reporting/report-templates/borehole-log-columns) | Confirms the product requirement for shared axes and nonduplicated interval/sample guides. |
| Lab results can be exchanged by file | The official Lab Data Exchange workbook contains categories, samples, requests/statuses, notes, and results; RSLog users export and later import it. [Lab Tests](https://www.rocscience.com/help/rslog/documentation/data-entry-design/lab-tests) | This is the supported foundation for a validated Supplemental Source while API semantics remain unresolved. |
| Multi-borehole CSV uses borehole name + sample number | Rocscience recommends Sample Number and requires Borehole Name when multiple boreholes are included. [Lab Tests](https://www.rocscience.com/help/rslog/documentation/data-entry-design/lab-tests) | File import must detect duplicate/ambiguous composite keys and require resolution; names alone are not globally stable IDs. |

## Access-surface evidence matrix

### Publicly documented `/api/v1` surface

| Surface tested | Date | R | P | S | M | Finding |
|---|---:|---:|---:|---:|---:|---|
| Documented single-sample read | Public guide checked 2026-08-13 | Yes | Not tested for this ticket | Not tested | No | The public guide documents a single-sample read but does not publish a laboratory-result response contract. [API guide](https://www.rslogonline.com/APIDocumentation/index.html) |
| Public Samples request-field table | 2026-08-13 | N/A | N/A | Write/request shape only | No | Includes a qualitative Moisture Descriptor identifier; contains no moisture-content, PL, or LL request fields. This supports the older **write** limitation, not a read limitation. [API guide](https://www.rslogonline.com/APIDocumentation/index.html) |
| Complete public API guide search for lab/MC/PL/LL | 2026-08-13 | No laboratory-result route documented | N/A | No laboratory-result schema | No | No matches for the exact field/test terms. This negative is limited to the public guide at the linked URL. |

Restricted authorized evidence indicates that a sample-list response outside the public guide carried several lab-shaped properties, all unpopulated in the selected project. Their exact route and wire-property inventory are withheld. This proves neither that the service populates those properties nor their units, precedence, status rules, completeness, or supported integration status.

### Withheld application-surface observation

A server-published application graph and generated proxy reviewed in 2026 advertised several laboratory-oriented read actions outside the public guide. They were catalogued but not invoked, so the surviving public evidence grade is R only. Exact routes, DTO names, counts, hashes, parameters, and neighboring mutation actions are withheld pending publication/use disposition. This report neither authorizes probing those routes nor supplies enough detail to reconstruct the inventory.

### Route, permission, shape, and semantics are separate findings

| Claim | Current verdict | Evidence needed to advance it |
|---|---|---|
| A laboratory-oriented application read was advertised | **Grade R in restricted evidence; not an approved public implementation input.** | Written publication/use disposition plus fresh authorized evidence on a vendor-supported surface. |
| The current firm's RSLog role may call it | **Unknown.** | Authorized GET with named role; record 200/401/403/404 distinctly. |
| A supported response includes MC, PL, and LL | **Unknown.** Restricted candidate properties were unpopulated and are not a public contract. | Redacted response schema from a sample known to have complete tests on a supported route. |
| Candidate moisture properties map to Index Tests Moisture | **Unknown.** | Exact UI cell-to-response comparison and renderer comparison plus vendor field documentation. |
| Candidate PL/LL properties are percentage values | **Plausible semantic inference only; not accepted.** | Non-null numeric responses plus vendor confirmation/unit behavior. |
| Null means no test | **Unknown.** | Compare never-requested, requested, in-progress, reviewing, complete, canceled, zero, and cleared states. |
| Public v1 fields are supported for commercial integration | **Unknown.** | Written Rocscience confirmation or documented response contract. |
| Undocumented application reads are stable/licensed for a distributed product | **Unknown and high risk.** | Written vendor authorization/support statement and compatibility commitment. |

## Do not conflate these similarly named values

| Value/surface | Meaning supported by evidence | Must not be treated as |
|---|---|---|
| `moistureDescriptorId` on sample or stratum | Qualitative moisture descriptor/level resolved from template settings. The public API explicitly documents it as a Moisture Descriptor ID. [API guide](https://www.rslogonline.com/APIDocumentation/index.html) | Quantitative laboratory moisture content. |
| `/api/v1/moisture-descriptors` | Data-template lookup for qualitative descriptors. | Lab test results. |
| `plasticityId` / `/api/v1/plasticities` | Soil-classification descriptor/lookup. | Plastic Limit, Liquid Limit, or Plasticity Index result. |
| Withheld lab-shaped sample properties | Restricted evidence observed candidate properties only as unpopulated. | Proven authoritative MC, PL, LL, or formatted numeric data before the semantic probe and vendor confirmation. |
| LL, PL | Sample-associated Index Test source values documented by the renderer. | Stratum classification properties. |
| PI | RSLog can display PI instead of PL; it is conceptually derived from limits, but the reviewed RSLog docs do not specify the computation/rounding contract. | A field to synthesize silently and persist as source truth. |

## Interpretation of existing RSAgent knowledge

RSAgent's 2026-07-25 F2 heading is “Laboratory results are not writable.” Its implementation consequence is to emit no lab records and omit laboratory write validation. That remains a sound boundary for RSAgent and for RSrender's read-only integration.

The quoted sentence inside F2 - “Laboratory test data is NOT accessible via current API” - came from the public API reference/prior analysis and predates the later restricted observation. It should now be read narrowly:

- **Still supported:** the public v1 write/request tables expose no MC/PL/LL mutation fields; RSAgent should not write lab data.
- **Superseded as a blanket negative:** restricted evidence reached grade R for laboratory-oriented reads outside the public guide.
- **Still unresolved for usable read access:** the withheld surface has no approved permission, populated-shape, semantic, stability, or vendor-support proof.

The RSAgent client has no lab-specific reader, the canonical `laboratory_tests` collection is untyped, and the writer test asserts only that no laboratory records are emitted. These are code-coverage decisions, not negative server evidence. RSrender must not infer that a missing RSAgent method means a missing RSLog read surface.

## Adapter options

| Option | Evidence fit | Stability | Licensing/support | Security | Product consequence |
|---|---|---|---|---|---|
| **Supported Source Adapter** using a documented public read | Promising in principle; no supported laboratory response contract is established today. | Best if Rocscience confirms the fields; public routes are the intended integration surface. | Rocscience publicly supports API transfer for RSLog licenses, but exact response fields still need confirmation. | Can use the same least-privilege read-only authentication boundary as other Source Data. | Best destination; blocked by #43 probe/vendor confirmation. |
| **Undocumented internal adapter** | Restricted evidence reached R only, with no P/S/M/D evidence approved for implementation. | Poor: web-application services and DTOs may change without public compatibility notice. | Material support/licensing risk, especially if RSrender is sold externally; written vendor authorization is required. | Would expand token and permission surface beside mutation capabilities. | Rejected for MVP and not specified here; no route inventory or implementation recipe is published. |
| **Validated Supplemental Source** from the official Lab Data Exchange workbook or controlled CSV | Strong product-workflow evidence; numeric fields/statuses can be verified at import. | File layout can change, but validation fails closed and no hidden endpoint contract is assumed. | Uses an official user export/data-exchange workflow. Confirm redistribution/storage terms before external sale, but risk is substantially lower than internal endpoints. | User-selected local file; no RSLog credentials required for the import step. Still contains project/lab data and requires normal encryption/access controls. | **Recommended for MVP.** Adds a deliberate attachment/refresh step and provenance/conflict UX. |

## Recommended MVP: validated Supplemental Source

The Supplemental Source is not a Presentation Override and must never masquerade as live Source Data. It is a typed, provenance-bearing input attached deliberately to a Log Project because the primary Source Adapter cannot yet prove laboratory access.

### Accepted source

1. Prefer the official RSLog Lab Data Exchange workbook exported by an authorized user.
2. Permit CSV only through a documented RSrender schema or a deliberate column-mapping import; do not assume arbitrary RSLog UI exports share one schema.
3. Never automate upload/import back into RSLog. RSrender reads the selected local file only.

### Minimum record contract

Each imported result should retain:

- Supplemental Source file hash, original filename, import time, declared/exported time if present, and parser/schema version;
- source system (`RSLog Lab Data Exchange` or explicit mapped CSV), test category, test name/acronym, status, notes where authorized, and raw source cell representation;
- Exploration association and Sample association, using source IDs when the file provides them; otherwise normalized borehole name + sample number + sample depth/range with ambiguity diagnostics;
- one typed result kind: `moistureContent`, `plasticLimit`, `liquidLimit`, or a separately named user-defined result;
- numeric value and explicit unit/quantity convention when known; retain blank separately from numeric zero;
- provenance for any derived PI, including source LL/PL, formula version, and rounding policy.

Do not impose a silent 0-100 hard range. Some geotechnical index values can exceed 100%; use finite-number/type validation plus configurable plausibility warnings until the firm's accepted engineering ranges are settled. Do not compute PI when either input is absent, nonfinal, or ambiguous.

### Import validation and diagnostics

- Duplicate Exploration + Sample + test-kind rows are an error until a documented status/date rule or user choice resolves them.
- A sample-number collision across explorations is an error; a depth mismatch is at least a warning and must be visible.
- Never-requested, nonfinal, canceled, blank, zero, and malformed are separate states.
- Statuses other than Complete are retained but not presented as final numeric Source Data by default; the designer may show example/nonfinal states through the Example Dataset.
- Source file changes are discovered only through a deliberate Supplemental Source refresh. Show a comparison and require acceptance, following the Log Project's general Refresh philosophy.
- If a future primary Source Adapter returns the same test, compare source identity/value/status/freshness. Do not silently select one. A conflict is a Diagnostic requiring an explicit source-precedence decision.
- Retain accepted typed Supplemental Source records as a distinct provenance-bearing part of the Log Project so it remains renderable offline; do not place them inside the Source Snapshot. Retain only the data needed for rendering/audit and obey client-data controls.

### Rendering contract exposed to later domain/UX tickets

- MC, PL, and LL are independent sample-associated result series.
- Each series can bind to text/number presentation or to a Data Layer.
- Several layers can share one Data Track axis and sample/interval guide system.
- Qualitative Moisture Level is a different binding from quantitative Moisture Content.
- Missing, nonfinal, conflicted, and suppressed values produce explicit designer states and Diagnostics; they are not coerced to zero.

## Exact authorized read-only probe plan

This plan is unresolved because no credentials or explicit live-test authority were available in this session. It must be run by an authorized operator against a non-sensitive test project, not inferred from production data.

### Authority and fixture prerequisites

1. Obtain written approval for read-only API testing and for inspecting the test project's ordinary browser/API responses. Limit the probe to documented or vendor-confirmed public reads; unpublished application routes remain outside this public plan.
2. Use a dedicated test project/data template and purpose-built samples. Through the ordinary supported RSLog UI, enter distinct, non-sensitive values for Moisture Content, PL, and LL on at least two samples. Include blank and numeric-zero cases only if RSLog accepts them legitimately.
3. Cover statuses never requested, Requested, In Progress, Reviewing, Complete, and Canceled where supported. Include two unit systems/data templates if the UI exposes different formatting.
4. Record the RSLog service date and any visible version/build. Use a least-privilege Viewer role first, then an Engineer role only if authorized and needed. Do not use an administrator merely to make the probe pass.

### Read sequence

1. Under #43, obtain written authority and a vendor-supported public laboratory read surface or written confirmation of the laboratory fields returned by a documented public sample read. If neither is supplied, stop; do not rediscover or probe unpublished application routes.
2. Call only the documented or vendor-confirmed read surface for the controlled fixture. Record HTTP status, content type, response cardinality, and a redacted schema containing only approved field names, types, and nullability.
3. Record authentication, authorization/feature, missing-resource/version, validation, empty-success, and populated-success outcomes separately. Do not summarize all failures as “no endpoint.”
4. Generate a boring log through RSLog's supported renderer using Moisture and Atterberg columns/plot. Compare the displayed MC/PL/LL values and sample depths to the supported response. The comparison establishes M; the PDF and fixture values remain confidential.
5. Repeat after changing one fixture value and status through the supported UI. Confirm that the expected field changes while the others do not, and determine whether reads are cached/stale.

### Evidence to retain

- route, method, parameter names/types, return type name, retrieval date, role class, status code, and response schema;
- boolean match results for each fixture field and state, not production values;
- unit/rounding/null/status rules and sample association behavior;
- renderer match result and page/sample reference in a confidential test artifact;
- rate-limit/error behavior and any feature/license dependency;
- written Rocscience support response for the intended integration surface.

Never retain access/refresh tokens, passwords, company code, user identity, unrelated client values, or raw production responses in committed evidence.

### Promotion gates

Promote laboratory data into the supported Source Adapter only if all are true:

1. A public route succeeds for the intended least-privilege role.
2. It returns non-null MC, PL, and LL for known Complete fixture tests.
3. Exact semantics, units, null/status behavior, and sample association match the UI and renderer.
4. Rocscience documents or confirms the relied-on public fields for external integration.
5. The adapter fails non-silently when fields disappear/change and records the retrieval contract version/date in the Source Snapshot.

If no documented or vendor-confirmed public route passes, retain the Supplemental Source decision. A withheld application surface must not become an implementation input merely because restricted evidence once advertised it; any exception requires a new employer/counsel/vendor-approved evidence handoff and architecture decision.

## Decision record for the Wayfinder map

### Known

- RSLog stores MC/PL/LL as sample-associated lab/index results and renders them in text and graph columns.
- The public API guide does not document lab result routes/fields as of 2026-08-13.
- Restricted authorized evidence indicated lab-shaped sample properties, observed only as unpopulated, and laboratory-oriented reads outside the public guide; exact details are withheld and are not implementation authority.
- Existing RSAgent F2 and code constrain **writes**; they do not settle cross-surface read access.
- No live credentials/authority were available in this session, and no permission/semantic probe was performed.

### Decision

Use a **validated Supplemental Source** for laboratory/index-test data in the MVP. Keep the Render Dataset and Source Adapter interfaces capable of typed MC/PL/LL records so a supported API source can replace the file path without changing template bindings. Do not implement an undocumented internal adapter during charting or MVP.

### Open prerequisite research

- Run the authorized probe above on a controlled non-sensitive fixture.
- Ask Rocscience which supported read endpoint/fields supply MC, PL, and LL and whether the public sample response properties are contractual.
- Obtain and schema-profile a sanitized official Lab Data Exchange workbook covering MC/PL/LL and statuses.
- Settle Supplemental Source conflict precedence, retention, encryption, and firm-approved plausibility warnings.
- Test that RSrender's future Data Track renders MC/PL/LL from API and Supplemental Source identically through the same Render Dataset contract.

### Out of scope for this ticket

- Writing, importing, requesting, editing, or deleting laboratory data in RSLog.
- Building the Supplemental Source parser or Source Adapter.
- Inspecting production values, capturing credentials, scraping the RSLog UI, or reverse engineering proprietary renderer code/assets.
- General strength, chemical, user-defined, or raw-test calculation modeling beyond preserving an extensible typed result identity.

## Final negative-finding discipline

The only supportable negatives are:

- **Public API documentation surface, checked 2026-08-13:** no laboratory-result section or exact MC/PL/LL field names.
- **Restricted authorized sample observation:** lab-shaped candidate properties were unpopulated in the selected project, so semantics were not demonstrated; names and capture details are withheld.
- **RSAgent code as of this research:** no laboratory reader/model/writer implementation; the existing test proves only that no lab write records are emitted.
- **This research session, 2026-08-13:** no credentials or authority for live permission/semantic verification.

None of those means “RSLog has no laboratory read API.” Restricted grade-R evidence makes that blanket statement unsafe, but it is neither public implementation evidence nor vendor support. The exact supported path remains unresolved in #43 pending authorized, publishable evidence.
