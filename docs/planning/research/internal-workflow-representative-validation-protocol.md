# Internal workflow representative-validation protocol

**Issue:** GitHub #10, *Internal boring-log workflow and representative edge cases*  
**Status:** Approved research protocol; operations authorized; human scheduling pending  
**Scope:** Representative internal workflow, workload, artifact, edge-case, and usability evidence for RSrender planning  
**Non-claim:** This document records no completed interview, observation, artifact review, metadata extraction, or usability session.

## Purpose and authority

The product owner selected representative validation instead of provisional closure for issue #10. This protocol turns that decision into an executable, privacy-bounded study. It does not authorize access by itself. Participant contact, evidence handling, and artifact access still require the firm's named approvals.

This protocol is grounded in:

- the [provisional workflow and edge-case report](internal-boring-log-workflow-edge-cases.md), including its 39 edge cases and fourteen synthetic fixture families;
- the [RSLog read-contract public handoff](rslog-read-contract-rsagent-evidence.md), which establishes sanitized source-family requirements and evidence grades, but publishes neither restricted wire schemas nor firm usage/frequency;
- the repository's [ubiquitous language](../../../CONTEXT.md); and
- the product-owner decision and access intake recorded on GitHub issue #10.

The study must not silently turn a participant preference into product policy, a recalled value into a measured workload, a possible API shape into a common workflow, or a synthetic example into representative evidence.

## Claims under test

| ID | Unproven claim | Minimum closing evidence | Interview-only closure? |
|---|---|---|---:|
| RV-01 | The provisional actor lenses represent the functions performed in the firm and their actual overlap. | Approved sessions spanning authoring, template, review/publication, data/laboratory, and deployment/storage/support functions; overlap recorded from self-described work. | Yes |
| RV-02 | The provisional workflow order, artifacts, and handoffs represent actual work. | Multiple recent-case reconstructions, compared with approved checklists or procedures where available. | Yes |
| RV-03 | The workload envelope represents typical, high, and largest substantiated work. | Approved anonymized counts and categories with measured, aggregate, and recalled bases kept distinct. | No; metadata is required |
| RV-04 | Edge-case priority reflects real frequency and professional consequence. | Incident histories, approved support categories or counts, and separate frequency/consequence ranking. | Partly; corroboration is required for broad claims |
| RV-05 | Proposed interactions are usable at realistic volume. | Moderated task evidence at measured small and large sizes, including success, error, comprehension, accessibility, and recovery observations. | No |
| RV-06 | The proposed end-to-end workflow is acceptable across the represented functions. | Function-specific acceptance constraints, objections, and policy-owner dispositions, with material contradictions resolved or explicitly accepted. | Partly; policy and task evidence may be required |

An issue #10 synthesis may trace future acceptance tests to representative scenarios before every interface exists, but it may not label RV-05 proven merely because participants described a preferred interface. If the needed prototype does not yet exist, RV-05 remains `Open` or receives an explicit product-owner uncertainty disposition with a downstream test restriction.

## Study design

### Sample

Conduct 6–10 individual sessions, each 45–60 minutes, using purposive maximum-variation sampling. Recruit by functions actually performed rather than by job title. One participant may cover several functions when that reflects current practice.

The completed sample must include:

- at least two current boring-log authors or formatters, preferably covering different project conditions;
- at least one template maintainer or template approver;
- at least one final-log reviewer, approver, issuer, or downstream consumer;
- at least one RSLog-data or laboratory-exchange steward; and
- at least one deployment, storage, recovery, or user-support owner.

Across the sample, seek simple/short and long/dense work; mixed-template or per-page Reference Depth Range experience; overflow, correction, and Refresh-conflict experience; laboratory work if used; and differing storage/publication practices where they exist.

### Exact stopping rule

Do not stop before six sessions and complete functional coverage. After both conditions are met, require two consecutive interviews that add no new critical workflow, publication blocker, or fixture-changing edge case. Reaching ten sessions is not automatic closure. If the rule is unmet at session ten, keep #10 open and expand the sample or explicitly record the unrepresented segment for a product-owner uncertainty decision.

This is purposeful coverage and saturation checking, not statistical proof about a roughly 30-person population.

## Authority and access gate

No affected collection activity may begin until every applicable row has a named answer in the firm's approved non-public location.

| Gate | Required answer | Ready |
|---|---|---:|
| Contact authority | Who may contact and schedule participants; whether the researcher may contact them directly. | Approved; details non-public |
| Participant coverage | Which 6–10 available participants can cover the required functions and variation. | Approved; roster non-public |
| Notes and recording | Whether structured notes are allowed and whether audio/video may be requested separately. | Approved; notes default, recording separately gated |
| Artifact viewing | Which classes may be viewed without copying. | Approved classes recorded non-publicly |
| Artifact copying | Which sanitized/value-free classes, if any, may enter restricted research storage. | Approved classes recorded non-publicly |
| Metadata extraction | Which anonymized fields and aggregation rules are approved. | Approved scope recorded non-publicly |
| Custodians | Custodians for templates, issued PDFs, review procedures, laboratory material, and workload metadata. | Assigned non-publicly |
| Restricted storage | Approved location, access list, and handling requirements for raw and working evidence. | Approved; details non-public |
| Retention/disposition | Approved period and authorized deletion or other disposition process. | Approved; details non-public |
| Synthesis approval | Person authorized to approve the sanitized repository synthesis. | Assigned non-publicly |
| Organizational constraints | Applicable client, confidentiality, HR/union, records, security, scheduling, and accessibility constraints. | Applicable constraints recorded non-publicly |

An absent authority blocks only the affected activity; it does not permit an informal workaround. Missing evidence continues to block the corresponding claim and #10 closure.

## Consent and privacy instrument

### Opening statement

Before substantive questions, explain that the session studies the work rather than the participant's performance; participation is voluntary; any question or artifact may be declined; and the participant may stop at any time. Ask the participant not to show or state credentials, tokens, client names, project identifiers, coordinates, meaningful production notes, or other client-identifying content. Questions about input, display, pacing, accessibility, or accommodations must not require disability disclosure.

Assign a non-meaningful pseudonymous `sessionId`. It must not contain initials, employee number, job title, client/project identity, office, filename, or timestamp. Keep any necessary identity mapping only in approved restricted storage.

Record `Yes`, `No`, or `Not requested` separately for every permission. A blank means `No`.

| Permission | Scope | Choice |
|---|---|---|
| Participate | Answer voluntary questions and stop or decline at any time. |  |
| Structured notes | Pseudonymous notes in approved restricted storage. |  |
| Audio recording | Audio only when firm policy permits and consent is explicit. |  |
| Video/screen capture | Capture only when policy permits; prohibited content remains prohibited. |  |
| Artifact viewing | View only separately approved artifact classes; no copying implied. |  |
| Artifact copying | Copy only separately approved blank, irreversibly sanitized, or value-free artifacts into restricted storage. |  |
| Metadata extraction | Record only approved value-free fields and categories. |  |
| Direct quotation | Use only a separately reviewed and approved quotation; otherwise paraphrase. |  |
| Sanitized committed findings | Include approved, synthesized, non-client-specific findings in repository planning evidence. |  |

### Evidence classes

With participant and custodian approval where applicable, the study may use blank or irreversibly sanitized templates, synthetic recreations, redacted checklists/procedures, anonymized workload counts, metadata-only page/PDF/storage categories, value-free template inventories, sanitized laboratory schema/status/unit inventories, and anonymized incident categories.

Never collect for repository use: client or participant identities; coordinates; addresses; project numbers; production prose or values; meaningful notes; photos; screenshots; logos; proprietary hatch/font/asset files; production API requests or responses; tenant/source/entity IDs; credentials or tokens; filenames or full paths; raw support bundles, logs, dumps, or telemetry rows; or hashes/encoded copies of prohibited content.

If prohibited content appears unexpectedly, stop capture or viewing, do not transcribe it, and follow the firm's approved restricted-evidence incident/disposition process. This protocol does not grant deletion authority.

### Storage boundary

| Tier | Contents | Repository/GitHub allowed? |
|---|---|---:|
| Restricted raw | Pseudonymous notes, separately consented recordings, approved artifacts, approved metadata rows, minimum identity map if required. | No |
| Restricted working | Finding ledger, paraphrases, contradiction register, and proposed revisions awaiting sanitization and approval. | No |
| Approved synthesis | Aggregated or non-client-specific findings with provenance class, limitations, and designated approval. | Yes |

Every committed finding requires consent for sanitized findings, applicable custodian approval, removal of prohibited content, evidence basis, contradiction state, affected workflow/edge/fixture, and designated synthesis approval.

## Session guide

Follow the participant's real sequence. Do not force the provisional RSrender workflow onto current practice.

### 1. Context and consent — about 3 minutes

Confirm voluntary participation, each permission, prohibited-content boundaries, session format, and any task/accessibility accommodation the participant chooses to request.

### 2. Recent-case reconstruction — about 12 minutes

Primary prompt: “Think of the most recent boring-log deliverable you worked on. Starting with the request, walk through what happened, where information came from, and what artifact existed at each step.” Ask for actions before opinions.

Probe the trigger, sequence, people/functions, systems, artifacts, mandatory versus habitual steps, handoffs, waits, rework, decision authority, completion signal, issued artifact, and reissue path. Capture original vocabulary before mapping it to repository terms.

Primary claims: RV-01, RV-02, RV-06. Fixture prompts: FX-01 and FX-13.

### 3. Variation, failures, and corrections — about 10 minutes

Ask separately for a recent simple case, difficult or dense case, and last case requiring a correction, workaround, special review, or reissue. For every case, record recency, evidence basis, frequency, professional consequence, detectability, workaround, and whether it was directly experienced or hypothetical.

Use FX-02 through FX-13 only as neutral gap probes. A prompted “yes” is not frequency evidence.

Primary claims: RV-04, RV-05, RV-06.

### 4. Template and pagination workflow — about 8 minutes

Determine who creates, approves, distributes, selects, and changes templates; structural versus style variants; Log Set/group/Exploration assignment practice; first/continuation/last-page differences; page size/orientation; per-page Reference Depth Ranges; essential regions, Log Columns, Data Tracks, and Dynamic Fields; asset-rights evidence; preview/PDF differences; and synthetic values that expose problems without production data.

Ask which content overruns, what happens today, which response is professionally acceptable by content type, minimum readable sizes, and which conditions must block publication. A preference informs a later decision; it does not set policy.

Primary claims: RV-01, RV-02, RV-04, RV-05, RV-06. Fixture prompts: FX-02, FX-06, FX-07, FX-10, FX-11, FX-12.

### 5. Source, Refresh, and local correction — about 8 minutes

Determine when source information changes, how users learn of changes, what they compare, and what incomplete retrieval means. Reconstruct actual local display corrections and approvals without collecting the values. Ask what should happen when the source changes or deletes a corrected target. Keep current practice distinct from product policy.

If laboratory moisture, plastic limit, or liquid limit is used, ask how it is obtained, matched, reviewed, refreshed, and classified by unit/status/blank/zero/failure—without inspecting a production response.

Primary claims: RV-02, RV-04, RV-05, RV-06. Fixture prompts: FX-04, FX-05, FX-08A/B, FX-09 through FX-12.

### 6. Review, publication, storage, and recovery — about 8 minutes

Reconstruct checks between author completion and an issued Log Document. Ask about review artifacts, publication blockers, acknowledgment and suppression authority, override/source-freshness checks, PDF profiles, storage classes, output failure, reissue, record retention, Publication Audit expectations, crash/network/shared-drive behavior, concurrent editing, and support evidence.

Collect storage categories only, never paths, provider accounts, machine names, or usernames.

Primary claims: RV-02, RV-04, RV-05, RV-06. Fixture prompts: FX-02, FX-06, FX-07, FX-13.

### 7. Scale and frequency — about 5 minutes

Ask for recent concrete ranges and available approved metadata for Exploration counts, pages, depths, entity density, template inventory, open documents, export/reissue cycles, storage use, concurrent writers, and long operations. Label every number `measured`, `custodian aggregate`, or `recalled`. Do not present existing synthetic bands as firm values.

Primary claims: RV-03, RV-04, RV-05. Fixture prompt: FX-14 and scale variants of FX-03, FX-07, FX-08A/B, and FX-13.

### 8. Wrap-up — about 3 minutes

Ask what was missed; who sees a different part of the process; what is rare rather than normal; what a privacy-safe synthetic recreation must preserve; which fixture should change; and whether the sanitized synthesis may be used within the recorded consent.

## Function-specific modules

Use only modules matching functions the participant actually performs.

| Function | Required probes |
|---|---|
| Author/formatter | Per-page depth ranges; mixed templates; overflow by content; groundwater labels; SPT notation/precedence; local corrections; crash/network expectations. |
| Template maintainer/approver | Template authority and variants; exact fit policies; graph-axis sharing and units; assignment changes; interims; fonts/assets/rights; keyboard and assistive workflows. |
| Reviewer/approver/issuer/consumer | Sign-off; publication blockers; override disclosure; page/PDF/accessibility acceptance; reissue; challenged-output evidence. |
| RSLog/laboratory steward | Source defect and permission handling; success/empty/failure distinctions; privacy-safe source-family shapes; Supplemental Source provenance, units, statuses, matching, and freshness. |
| Deployment/storage/recovery/support | Deployment/update/rollback; storage classes; concurrent use; recovery visibility/retention; local diagnostics; approved incident categories. |

## Anonymized metadata instrument

### Coding rules

Every metric records an `evidenceBasis`, `observationScope`, `valueState`, and `privacyClass`.

`evidenceBasis` is one of `measured_metadata`, `custodian_aggregate`, `participant_recall`, `approved_procedure`, or `synthetic_review`.

`observationScope` is one of `single_recent_case`, `recent_ten_log_sets`, `largest_substantiated_case`, `current_inventory`, `normal_work_period`, `deadline_work_period`, or `unknown`.

`valueState` is one of `known_measured`, `known_custodian_aggregate`, `known_recalled`, `present_category_only`, `zero_observed`, `unknown`, `not_available`, `not_applicable`, or `not_permitted`. Unknown is never encoded as zero. Synthetic review is never occurrence evidence.

`privacyClass` is `P0_CONTROL`, `P1_AGGREGATE`, `P2_RESTRICTED`, or `P3_PROHIBITED`. Row-level `P1` and all `P2` stay restricted. `P3` has no valid collection route.

### Required envelope

| ID | Field | Rule |
|---|---|---|
| ENV-01 | Restricted record ID | Random and non-meaningful; not derived from a person, artifact, project, source ID, or timestamp. |
| ENV-02 | Participant function set | Controlled function categories; no title. |
| ENV-03 | Consent scope | Separate permissions; none inferred. |
| ENV-04 | Collection route | Interview, custodian aggregate, approved metadata/header, value-free inventory, procedure, IT aggregate, or synthetic review. |
| ENV-05 | Evidence basis | Required. |
| ENV-06 | Confidence | `direct_metadata`, `corroborated_recall`, `single_recall`, or `unresolved_contradiction`. |
| ENV-07 | Observation scope | Required. |
| ENV-08 | Value state | Required for each metric. |
| ENV-09 | Approved for synthesis | Boolean; false or blank excludes the row. |

### Workload fields

All counts are non-negative integers. Durations are seconds; file sizes are bytes; depths carry `m` or `ft`. Minimum, typical, and maximum are separate observations with explicit scope.

| ID | Metric | Collection constraints | Traces to |
|---|---|---|---|
| WL-01 | Simultaneously active desktop processes | IT/custodian aggregate preferred; no user/machine identity. | RV-03; FX-14 |
| WL-02 | Open Log Projects/Templates per process | Count only. | RV-03; FX-13/14 |
| WL-03 | Explorations per Log Project | Count only. | RV-03; FX-01/03/07/08/14 |
| WL-04 | Pages per Exploration | Count only. | RV-03; FX-01/02/03/14 |
| WL-05 | Pages per Log Set | Count only. | RV-03; FX-03/13/14 |
| WL-06 | Exploration depth | Depth and unit only; no coordinates/elevation. | RV-03; FX-01/02/04/14 |
| WL-07 | Depth-bound records | Aggregate count. | RV-03; FX-03/04/14 |
| WL-08 | Record family counts | Controlled strata/sample/test/comment/water/interim/lab families. | RV-03/04; FX-03/09/10/11/12/14 |
| WL-09 | Live layout elements per page | Value-free counting rule required. | RV-03/05; FX-03/06/14 |
| WL-10 | Template library size and meaningful variants | Counts; no names or IDs. | RV-03; FX-02/07/14 |
| WL-11 | Distinct templates assigned per Log Project | Count only. | RV-03/04; FX-07/13/14 |
| WL-12 | Refresh Explorations and simultaneous requests | Counts; no vendor-limit inference. | RV-03/05; FX-08/14 |
| WL-13 | Source payload and package size | Custodian aggregate in bytes; no body, route, hash, filename, or path. | RV-03/05; FX-08/13/14 |
| WL-14 | Exports per revision cycle and outcome | Attempts separate from success/cancel/failure/reissue. | RV-03/04; FX-13/14 |
| WL-15 | Storage class and simultaneous writers | Controlled classes only; no path, account, provider, user, or machine. | RV-03/04; FX-13 |
| WL-16 | Operation kind and elapsed seconds | No acceptance budget inferred by this study. | RV-03/05; FX-03/08/13/14 |

### Artifact, workflow, and incident fields

| ID | Metadata group | Allowed content | Traces to |
|---|---|---|---|
| ART-01 | Artifact/document class | Blank/sanitized/synthetic/metadata-only categories and domain document kind; no filename. | RV-02/06 |
| ART-02 | Page geometry | Width, height, unit, orientation. | RV-03/06; FX-02/13 |
| ART-03 | Template/page structure | Variant roles, region presence, assignment scopes, depth-range pattern, element-category counts. | RV-02/03/06; FX-01/02/03/07/14 |
| ART-04 | Bound-content structure | Required/optional/repeated/conditional counts; no field names or values. | RV-03/04; FX-04/06 |
| ART-05 | Overflow | Controlled content and response categories; no text. | RV-04/05/06; FX-06 |
| ART-06 | Fonts/graphics/rights | Controlled asset and rights states; no names, license text, or bytes. | RV-04/06; FX-06/13 |
| ART-07 | Data and graph coverage | Controlled source-family, graph-series, lab-status, quantity, and unit categories; no values. | RV-03/04/06; FX-09/10/11/12 |
| ART-08 | Review and PDF requirements | Checklist/audit/reissue presence and controlled PDF-requirement categories. | RV-02/04/06; FX-13 |
| ART-09 | Presentation corrections | Controlled workaround/override categories; no corrected value. | RV-02/04/06; FX-08/13 |
| FLOW-01 | Ordered workflow step | Workflow code, ordinal, function, action category, artifact category, mandatory/habitual/exception/workaround, handoff, completion signal. | RV-01/02/06 |
| INC-01 | Edge-case occurrence | Existing `EC-*` ID or `unmapped`; aggregate/recalled count and recency category. | RV-04; affected FX |
| INC-02 | Consequence and workaround | Controlled consequence, workaround, and publication-impact categories. | RV-04/06; affected FX |
| INC-03 | Contradiction and fixture effect | Contradiction boolean and add/remove/change/policy/no-change disposition. | RV-04/06; affected FX |

## Evidence and contradiction ledgers

For every finding, record: stable non-identifying ID; `sessionId` or approved aggregate; self-described functions; consent and custodian authority; sanitized paraphrase; `[D]`, `[E]`, `[H]`, or `[Q]`; evidence basis; scope; frequency basis; professional consequence; contradiction state; affected claim/workflow/edge/fixture; candidate fixture effect; follow-up owner; and commit status.

Record competing accounts independently. Determine whether a difference is a conflict, role/context variation, or recalled-versus-measured discrepancy. Do not resolve policy or professional disagreement by participant count. Seek another represented function, an approved procedure, anonymized metadata, a synthetic reconstruction, a moderated task, or an authorized policy decision. A conflict with an existing decision is an operational mismatch to route, not permission to mutate the decision.

Any unresolved contradiction affecting a critical workflow, publication blocker, or fixture-changing edge case prevents the stopping rule. It may remain at closure only through an explicit product-owner acceptance naming its consequence and downstream restriction.

## Moderated interaction evidence

After representative workload bands and scenarios are available, define privacy-safe task instances for the interfaces under test. Existing disposable prototypes may be used only after confirming that their behavior matches the question being tested; their synthetic content and prototype limitations must be disclosed.

At minimum, task evidence must record:

- task and scenario ID, prototype/build identity, fixture and measured workload band;
- participant function and input/accessibility method without identity or disability details;
- completion, errors, assists, reversals, abandonment, and elapsed time;
- comprehension of selection/reference item, source versus override, Refresh comparison, Diagnostic severity, overflow state, and publication consequence as applicable;
- focus, keyboard, announcement, zoom/scaling, and readable-text observations applicable to the task;
- participant comments as reported evidence, separately from observed task behavior; and
- defects, contradictions, and required fixture/specification changes.

No universal latency or task-success threshold is created here. Those thresholds require evidence synthesis and a product decision.

## Sanitization and release checklist

Every applicable item must pass; failure rejects the record from synthesis rather than becoming a warning.

- [ ] Authority, separate consent, artifact custody, restricted storage, retention, and synthesis approval are recorded.
- [ ] Each value has field ID, route, evidence basis, confidence, observation scope, value state, unit, and privacy class.
- [ ] Measured, aggregate, recalled, and synthetic evidence remain distinct; zero is not missing.
- [ ] No client/person/project names, identifiers, coordinates, dates, prose, filenames, paths, assets, hashes, or row combinations capable of easy re-identification are released.
- [ ] No production API call, response, header, URL, trace, schema dump, log, support bundle, credential, token, username, machine, or account appears.
- [ ] Storage and artifacts use controlled categories rather than free text.
- [ ] Row-level evidence remains restricted; only approved aggregation or categorical synthesis is released.
- [ ] Every released claim preserves evidence basis, limitation, contradiction state, and issue/workflow/edge/fixture trace.
- [ ] A final human privacy review found zero client data and zero production-response material.

## Closure gates

Issue #10 may close as **representative validation complete** only when all applicable gates pass:

1. authority and consent are documented for every performed activity;
2. the sample and exact stopping rule are satisfied, or every unrepresented segment has an explicit product-owner uncertainty decision;
3. RV-01 through RV-06 are each `Evidenced` or `Uncertainty explicitly accepted`; `Open` prevents closure;
4. all material contradictions are resolved, contextualized, or explicitly accepted with consequences;
5. workflows, actor lenses, workload bands, edge ranking, and fixture requirements are revised or explicitly retained as hypotheses;
6. workload values retain measured/aggregate/recalled provenance and are not overstated as statistical proof;
7. no interview preference silently becomes product policy;
8. the approved synthesis passes privacy review and contains no prohibited material; and
9. downstream restrictions and test obligations are carried into #16 and the affected product/acceptance specifications.

Until these gates pass, #10 remains open and #16 remains blocked. Protocol preparation alone does not change the frontier.

## Execution records

Store raw session sheets, identity mappings, consent records, recordings, artifacts, and row-level metadata only in approved restricted storage. The repository may later receive only:

- an approved sanitized findings report;
- revised provisional workflows and workload bands with evidence basis;
- a ranked frequency/consequence matrix;
- approved synthetic fixture changes;
- a contradiction and uncertainty summary; and
- the final closure attestation.

The closure attestation must state the validation period, session count, functions and variation covered, stopping-rule result, raw-evidence disposition state, synthesis approver, accepted uncertainties, open contradiction count, revised artifacts, product-owner decision, and downstream restrictions.
