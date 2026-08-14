# Internal workflow representative-validation synthesis template

**Issues:** #10 → #16  
**Status:** Empty controlled template; not evidence and not a closure attestation  
**Use:** Populate only from an exact privacy-reviewed release candidate approved under the [representative-validation protocol](internal-workflow-representative-validation-protocol.md) and [operations runbook](internal-workflow-validation-operations-runbook.md)  
**Non-claim:** Blank cells, example enums, prelisted IDs, and checklist text do not represent participant contact, collected evidence, validation, agreement, policy, fixture approval, #10 closure, or #16 eligibility.

## How to use this template

The restricted synthesis team works from admissible sanitized derivatives, then produces one exact release candidate. Only after human privacy review and designated synthesis approval may a copy of this template be populated in the repository.

Rules:

1. Remove all instructional placeholders before release; a blank required field fails the gate.
2. Use only non-identifying aggregate or non-client-specific synthesis. Row-level evidence remains restricted.
3. Preserve evidence basis, observation scope, confidence, limitation, contradiction state, and trace for every claim.
4. Keep current-practice evidence, product preference, professional consequence, policy authority, direct observation, measured metadata, participant recall, and synthetic review distinct.
5. Do not infer frequency from prompted recognition, typicality from one case, usability from preference, policy from majority count, or measurement from recall.
6. `Unknown`, `not_available`, `not_applicable`, `not_permitted`, `zero_observed`, and absent are distinct.
7. Any content change after privacy/synthesis approval creates a new release candidate and requires renewed approval.
8. If a gate cannot be satisfied, retain `Open`, keep #10 open, and state the smallest next evidence or decision required.

## 1. Release control and non-claims

| Field | Required repository-safe value |
|---|---|
| Synthesis release ID/version | Non-identifying stable ID; no participant/session/project/date encoding. |
| Protocol/version | Exact approved protocol reference. |
| Evidence cut | Approved coarse period or non-identifying cut reference. |
| Release-candidate digest/reference | Digest of this approved sanitized candidate only, if permitted. |
| Human privacy review | `Passed` or `Failed`; failed cannot release. |
| No-client-data review | `Passed` or `Failed`. |
| No-production-response review | `Passed` or `Failed`. |
| Designated synthesis approval | Approving function plus non-identifying control reference; no name. |
| Raw/working evidence state | `retained_under_active_policy`, `pending_authorized_disposition`, `disposed_under_authority`, `legal_or_records_hold`, `incident_process_active`, or `unknown_or_unconfirmed`. |
| Product-owner disposition | `accept synthesis`, `accept named uncertainty`, `keep #10 open`, or `not yet decided`. |
| #10 state | `Open`, `Ready for closure decision`, or `Closed after verified gates`. |
| #16 eligibility | `Blocked` or `Eligible`; never infer from a draft. |

Required release statement:

> This synthesis contains only the exact privacy-reviewed aggregate/non-client-specific release candidate. It contains no participant identity, contact information, session ID, consent record, raw note, recording, artifact, participant-level metadata, production content, credential, API response, filename, path, internal security detail, or restricted policy record. Its findings are bounded by the evidence bases and limitations recorded below.

## 2. Sample, function, variation, and stopping evidence

### 2.1 Sample and sequence

| Field | Required value | Gate |
|---|---|---|
| Countable core sessions | Approved aggregate count. | At least six. |
| Core sessions completed before synthesis checkpoint | `Yes`/`No`. | Must be `Yes`. |
| Targeted remediation sessions | Aggregate count and sanitized reason categories. | Allowed; not saturation checks. |
| Countable later sessions | Approved aggregate count. | At least two normally required. |
| Consecutive qualifying no-new-critical later sessions | `0`, `1`, or `2+`. | Must be `2+` unless an explicit uncertainty disposition applies. |
| Session-ten condition | `not reached`, `stopping rule met`, or `unmet—expanded/uncertainty routed`. | Session ten is never automatic closure. |
| Validation scope limitation | Sanitized statement of what purposive sampling cannot prove. | Required. |

### 2.2 Required function coverage

| Function | Minimum | Aggregate evidence state | Genuine-overlap state | Limitation/unrepresented segment |
|---|---:|---|---|---|
| Current boring-log author/formatter | 2 | `[Evidenced/Open]` | `[none/genuine overlap/unclear]` | [Not assessed] |
| Log Template maintainer/approver | 1 | [Not assessed] | [Not assessed] | [Not assessed] |
| Reviewer/approver/issuer/downstream consumer | 1 | [Not assessed] | [Not assessed] | [Not assessed] |
| RSLog-data/laboratory-exchange steward | 1 | [Not assessed] | [Not assessed] | [Not assessed] |
| Deployment/storage/recovery/user-support owner | 1 | [Not assessed] | [Not assessed] | [Not assessed] |

Role overlap counts only when current performance of each function and relevant evidence were separately established. Report categories, not titles or identifiable combinations.

### 2.3 Maximum-variation coverage

| Variation target | State | Evidence basis | Consequence if absent |
|---|---|---|---|
| Simple/short Log Set | `[covered/evidenced absent/unrepresented/not applicable/uncertainty accepted]` | [Not assessed] | [Not assessed] |
| Long/dense Log Set | [Not assessed] | [Not assessed] | [Not assessed] |
| Single-template practice | [Not assessed] | [Not assessed] | [Not assessed] |
| Mixed Template Assignment practice | [Not assessed] | [Not assessed] | [Not assessed] |
| First/continuation/last-page variants | [Not assessed] | [Not assessed] | [Not assessed] |
| Per-page Reference Depth Range | [Not assessed] | [Not assessed] | [Not assessed] |
| Text overflow/correction | [Not assessed] | [Not assessed] | [Not assessed] |
| Refresh conflict/Presentation Override | [Not assessed] | [Not assessed] | [Not assessed] |
| Laboratory exchange when used | [Not assessed] | [Not assessed] | [Not assessed] |
| Review/publication variation | [Not assessed] | [Not assessed] | [Not assessed] |
| Storage/concurrency/recovery variation | [Not assessed] | [Not assessed] | [Not assessed] |

Small-cell and cross-field re-identification must be reviewed before releasing combinations from a roughly 30-person firm.

## 3. RV claim disposition

Allowed final status: `Evidenced`, `Uncertainty explicitly accepted`, or `Open`. `Open` prevents #10 closure. `[Not assessed]` is permitted only while this remains an unreleased empty/working template; it must become an allowed final status before release. An accepted uncertainty must name the accepting authority, sanitized consequence, and downstream restriction.

| Claim | Status | Minimum evidence actually present | Evidence basis/scope | Contradictions | Limitation or accepted uncertainty | Downstream obligation |
|---|---|---|---|---|---|---|
| RV-01 — actor functions and genuine overlap | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#22/#25 [Not assessed] |
| RV-02 — workflow order, artifacts, and handoffs | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#23/#25 [Not assessed] |
| RV-03 — representative workload envelope | [Not assessed] | Approved metadata required; interviews alone insufficient. | [Not assessed] | [Not assessed] | [Not assessed] | #16/#30/#33 [Not assessed] |
| RV-04 — edge frequency and professional consequence | [Not assessed] | Corroboration required for broad claims. | [Not assessed] | [Not assessed] | [Not assessed] | #16/#26 [Not assessed] |
| RV-05 — interaction usability at realistic volume | [Not assessed] | Moderated task evidence at measured sizes required; preference is insufficient. | [Not assessed] | [Not assessed] | [Not assessed] | #18/#30/#34/#40/#26 [Not assessed] |
| RV-06 — cross-functional workflow acceptability | [Not assessed] | Function-specific evidence plus policy-owner dispositions where applicable. | [Not assessed] | [Not assessed] | [Not assessed] | #22–#26 [Not assessed] |

## 4. Finding and evidence summary

Every released finding gets a stable non-identifying ID unrelated to participant/session/project identity.

| Finding ID | Sanitized finding | Grade `[D/E/H/Q]` | Evidence basis | Value state/unit | Scope/confidence | Frequency basis | Professional consequence | Contradiction state | RV/WF/EC/FX trace | Release eligibility | Limitation | Disposition |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Not assessed] | [Not assessed] | [Not assessed] | `direct observation / participant report / measured metadata / custodian aggregate / approved procedure / synthetic review` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | `excluded/restricted/approved aggregate` | [Not assessed] | `retain/revise/corroborate/policy route/exclude` |

Never publish session IDs, participant-level rows, free-text quotations without separate approval, or combinations that permit reasonable re-identification.

## 5. Actor, task, artifact, and handoff model

| Function/context | Trigger | Actions | Inputs/artifacts | Handoff | Decision authority | Completion signal | Exception/rework | Evidence basis | Change from provisional model |
|---|---|---|---|---|---|---|---|---|---|
| Project engineer / log author | [Not assessed] | [Not assessed] | Controlled artifact categories only | [Not assessed] | Function category only | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| Template maintainer | [Not assessed] | [Not assessed] | Controlled artifact categories only | [Not assessed] | Function category only | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| Reviewer / checker | [Not assessed] | [Not assessed] | Controlled artifact categories only | [Not assessed] | Function category only | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| RSLog/data steward | [Not assessed] | [Not assessed] | Controlled artifact categories only | [Not assessed] | Function category only | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| IT/support | [Not assessed] | [Not assessed] | Controlled artifact categories only | [Not assessed] | Function category only | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| Product/template owner | [Not assessed] | [Not assessed] | Controlled artifact categories only | [Not assessed] | Function category only | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |

State whether each provisional actor lens is `validated`, `revised`, `split by context`, `retained hypothesis`, `rejected`, or `open`. Do not convert functional categories into application permission roles without a separate product decision.

## 6. Workflow disposition

Allowed disposition: `Validated`, `Revised`, `Contextual variants`, `Retained hypothesis`, `Rejected`, or `Open`.

| Workflow | Disposition | Validated/revised sequence reference | Context selector | Required artifacts/handoffs | Failure/reissue path | Evidence basis | Open policy/usability question | Fixture/downstream effect |
|---|---|---|---|---|---|---|---|---|
| WF-01 — create/validate a Log Template offline | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WF-02 — create a Log Project and acquire source data | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WF-03 — assign templates across a heterogeneous Log Set | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WF-04 — review, override, and paginate one Boring Log | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WF-05 — Refresh an edited project | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WF-06 — QA and export a Log Set | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WF-07 — reopen and recover | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |

If a workflow conflicts with an accepted domain/product decision, record an operational mismatch and route it. Participant practice does not silently override the accepted decision.

## 7. Workload envelope

Only approved measurements or custodian aggregates can establish representative workload bands. Recalled values remain labeled recall. Synthetic bands remain stress inputs and cannot be relabeled minimum/typical/large.

| Metric | Minimum | Typical | High/deadline | Largest substantiated | Unit | Evidence basis for each value | Observation scope | Confidence | Sample/aggregation limitation | Representative label allowed? | #16/#30/#33 consequence |
|---|---:|---:|---:|---:|---|---|---|---|---|---|---|
| WL-01 simultaneously active desktop processes | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | count | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | `[yes/no]` | [Not assessed] |
| WL-02 open Log Projects/Templates per process | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | count | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-03 Explorations per Log Project | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | count | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-04 pages per Exploration | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | count | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-05 pages per Log Set | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | count | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-06 Exploration depth | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | `m/ft` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-07 depth-bound records | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | count | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-08 record-family counts | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | count/category | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-09 live layout elements per page | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | count | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-10 Log Template library size/variants | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | count | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-11 distinct templates assigned per Log Project | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | count | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-12 Refresh Explorations/simultaneous requests | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | count | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-13 source payload/package size | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | bytes | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-14 exports per revision cycle/outcome | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | count/category | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-15 storage class/simultaneous writers | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | category/count | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| WL-16 operation kind/elapsed time | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | seconds | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |

Use separate observations for minimum, typical, high/deadline, and largest substantiated. Do not pack a recalled range into one measured cell, relabel one unusually large case as a representative high band, or infer percentiles from a purposive sample.

## 8. Edge-case frequency and consequence disposition

Frequency and professional consequence remain separate. Allowed case status: `Evidenced`, `Evidenced absent`, `Context dependent`, `Retained stress case`, `Rejected`, or `Open`.

| Edge ID | Status | Occurrence state | Frequency basis/category | Professional consequence | Detectability | Current workaround category | Publication impact | Evidence/limitation | Fixture effect | Decision/policy owner |
|---|---|---|---|---|---|---|---|---|---|---|
| EC-SHORT-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-SHORT-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-LONG-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-LONG-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-SPARSE-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-SPARSE-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-DENSE-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-DENSE-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-MISS-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-MISS-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-MISS-03 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-MAL-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-MAL-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-MAL-03 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-OVRFL-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-OVRFL-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-OVRFL-03 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-PAGE-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-PAGE-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-TMPL-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-TMPL-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-REFR-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-REFR-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-OVRD-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-OVRD-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-OVRD-03 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-GW-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-GW-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-GW-03 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-SPT-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-SPT-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-INT-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-INT-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-LAB-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-LAB-02 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-LAB-03 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-COMM-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-SAVE-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| EC-EXPORT-01 | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |

Occurrence state must distinguish `observed`, `reported`, `not observed`, `not available`, `not permitted`, `synthetic only`, and `unknown`. Prompted agreement alone is not frequency evidence, and `not observed` does not mean impossible. A rare case may remain mandatory because professional consequence is high.

## 9. Contradiction and policy-decision register

| Contradiction ID | Sanitized competing accounts | Same context/task? | Evidence-basis difference | Materiality | Classification | Follow-up/authority | Resolution or accepted uncertainty | Affected RV/WF/EC/FX | Saturation/closure effect |
|---|---|---|---|---|---|---|---|---|---|
| [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | `context variation / basis mismatch / terminology / policy / material conflict` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |

Do not resolve professional or policy disagreement by counting participants. A material unresolved contradiction affecting a critical workflow, publication blocker, or fixture-changing edge case prevents the no-new-critical stopping sequence and #10 closure unless explicitly accepted with consequences.

## 10. Fixture consequence register

Allowed disposition: `Retain`, `Add`, `Remove`, `Reshape`, `Rescale`, `Change expected semantics`, `Retain as synthetic stress only`, or `Open`.

| Fixture | Disposition | Evidence basis | Representative label | Required content/shape change | Expected-semantic change | Workload-band change | Rights/privacy effect | Open source/prototype decision | Downstream consumers |
|---|---|---|---|---|---|---|---|---|---|
| FX-01 `smoke-short` | [Not assessed] | [Not assessed] | `[allowed/not allowed]` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#17/#21 |
| FX-02 `boundary-pages` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#17 |
| FX-03 `long-dense` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#17/#30/#33 |
| FX-04 `sparse-missing` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#17/#21 |
| FX-05 `malformed-relations` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#21/#33 |
| FX-06 `text-overflow` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#17/#30/#40 |
| FX-07 `mixed-template` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#17/#23/#33 |
| FX-08 `refresh-pair` family | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#21/#23 |
| FX-08A `accepted-before` member | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#21/#23 |
| FX-08B `staged-after` member | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#21/#23 |
| FX-09 `groundwater` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#19/#21 |
| FX-10 `spt-custom` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#19/#21 |
| FX-11 `interims` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#17/#21 |
| FX-12 `lab-supplemental` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#19/#21 |
| FX-13 `export-recovery` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#17/#20/#33/#36/#39 |
| FX-14 `workload-generator` | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | #16/#17/#19/#21/#30/#33/#40 |

Participant evidence may require a fixture change but is not itself a fixture. #16 owns the legally clean synthetic implementation-neutral corpus specification after #10 closes.

## 11. #10 → #16 handoff manifest

### 11.1 Gate receipt

| Receipt field | Required state for #16 eligibility |
|---|---|
| #10 closure reference | Verified closure comment/attestation; no draft reference. |
| Synthesis release | Exact approved ID/version and permitted digest/reference. |
| Privacy approvals | Human privacy, zero-client-data, no-production-response, and synthesis approval all pass. |
| Function/variation coverage | Complete or every missing segment has an explicit accepted uncertainty. |
| Stopping rule | Passed or explicit uncertainty decision with downstream restriction. |
| RV claims | No `Open` claim. |
| Contradictions | No unhandled material contradiction. |
| Workflow/workload/edge/fixture dispositions | Every prelisted item has a nonblank state. |
| Evidence provenance | Measured, aggregate, recalled, procedure, observed, reported, and synthetic bases remain distinguishable. |
| Rights boundary | No client material/vendor asset; asset/font/hatch/image provenance route stated. |
| Raw evidence | Not transferred to #16 or repository. |
| Downstream restrictions | Every accepted uncertainty is linked to owning ticket/specification. |

### 11.2 #16 input contract

| Input | Allowed handoff | Prohibited inference |
|---|---|---|
| Validated workflow | Sanitized sequence/context/artifact/function categories and limitations. | Application permissions, architecture, or UI behavior not separately decided. |
| Workload envelope | Approved values with unit, basis, scope, confidence, and representative-label permission. | Percentiles, hard limits, or performance budgets not supported by evidence. |
| Edge priorities | Separate frequency and professional-consequence categories plus limitation. | Majority preference as policy or rare as irrelevant. |
| Fixture consequences | Approved retain/add/remove/reshape/rescale/semantic-change instructions. | Copying participant/client artifacts into fixtures. |
| Synthetic reconstruction constraints | Non-identifying structure/relationships/states required for realism. | Production prose, values, IDs, filenames, paths, images, fonts, hatches, or PDFs. |
| Rights/provenance | Approved independently created/synthetic source and asset status categories. | Redistribution rights from possession or viewing. |
| Open uncertainty | Exact owner, consequence, and downstream test/restriction. | Silent default or invented semantic oracle. |

### 11.3 Oracle ownership

Every #16 expected semantic outcome must have one status:

- `decided` — already fixed by accepted product/domain behavior;
- `representative-evidence-supported` — supported by this approved #10 synthesis;
- `representative-unresolved` — still needs representative evidence and cannot be called typical, required, or prioritized;
- `prototype-owned` — #17, #19, #21, #30, #33, or another named prototype must decide/measure it;
- `source-evidence-blocked` — populated shape/permission/semantics need authorized source evidence;
- `policy-owned` — named human authority must decide it;
- `accepted-uncertainty` — explicitly accepted with consequence, review trigger, and downstream restriction, but not converted to evidence;
- `explicitly deferred` — excluded from MVP with consequence and later ticket; or
- `out-of-scope` — explicitly excluded from the product/ticket with rationale.

No `Open`, blank, or mixed-owner oracle may be silently resolved by #16. #16 may specify a neutral fixture state and visible Diagnostic when that behavior is already decided, but cannot invent the missing semantic contract.

### 11.4 Source-shape availability

| Data family | Adapter-level fixture eligibility | Render-Dataset-only eligibility | Missing evidence/owner | #16 treatment |
|---|---|---|---|---|
| Exploration/borehole | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| Strata | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| Samples | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| Field tests/SPT | [Not assessed] | [Not assessed] | [Not assessed] | Populated custom-column evolution must remain explicit. |
| Comments | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] |
| Groundwater/open-hole | [Not assessed] | [Not assessed] | [Not assessed] | Keep families distinct. |
| Piezometer | [Not assessed] | [Not assessed] | Populated shapes may remain source-evidence-blocked. | [Not assessed] |
| Interims | [Not assessed] | [Not assessed] | Populated per-type details may remain source-evidence-blocked. | [Not assessed] |
| Hatch lookup/assets | [Not assessed] | [Not assessed] | Retrieval/redistribution may remain blocked. | Use independently licensed synthetic asset or neutral unavailable Diagnostic only. |
| Laboratory MC/PL/LL | [Not assessed] | [Not assessed] | Supplemental Source schema/status/unit/precedence evidence. | Never assume undocumented API semantics. |

### 11.5 Atomic semantic-oracle ledger

#16's Done when requires every prototype and golden test to name an exact scenario and expected semantic outcome. A fixture-level paragraph is not an atomic oracle.

| Semantic atom ID/revision | Preconditions/input and units | Operation | Observable outcome | Negative oracle | Diagnostic/proof | Oracle layer | Ownership state | Evidence/decision reference | Primary owner | FX/EC trace | Downstream obligation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| [Not assessed] | [Not assessed] | `Refresh/render/paginate/interact/save/export/open/...` | [Not assessed] | Forbidden silent coercion/omission/overwrite/duplicate/partial result | [Not assessed] | `source_adapter/source_snapshot/render_dataset/scene/interaction/package/PDF/accessibility` | [Not assessed] | [Not assessed] | One ticket/function | [Not assessed] | [Not assessed] |

Split expectations until each row has one observable behavior and one current primary owner. Only `decided` and `representative-evidence-supported` atoms may become unconditional #16 oracles. Other states may define inputs, safe negative invariants, visible blocked behavior, and the exact pending question, but not a fabricated outcome.

## 12. Downstream obligation register

| Obligation ID | Source finding/claim/workflow/workload/edge/fixture/semantic IDs | Triggering uncertainty/restriction | Required input artifact | Required action/test | One owning ticket/artifact | Blocks | Acceptance observation/evidence | Dependency state | Closure backlink | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | [Not assessed] | Exactly one of #16/#17/#19/#21/#22–#26/#30/#33/#40 | [Not assessed] | [Not assessed] | `ready/partially ready/blocked/accepted uncertainty` | [Not assessed] | `Open/Accepted/Complete` |

Create one row per atomic obligation and one destination. If one finding affects several tickets, create separately traceable obligation rows rather than a comma-separated handoff.

Accepted uncertainty is not closure-by-omission. It must survive into the affected corpus, prototype, domain/UX/product/architecture specification, acceptance strategy, or roadmap.

## 13. #10 closure-gate attestation

Allowed gate status: `Open`, `Satisfied by evidence`, or `Satisfied by explicit uncertainty decision`. The uncertainty status is valid only where the protocol/runbook permits it and must cite the accepting function, consequence, and downstream restriction. It cannot waive consent, custody, privacy, prohibited-content, or missing-technical-proof requirements.

| Gate | Exact required result | Status | Evidence/decision reference | Limitation or carried restriction |
|---|---|---|---|---|
| C10-01 | Authority and consent are documented for every performed activity. | [Not assessed] | [Not assessed] | [Not assessed] |
| C10-02 | Minimum sample, complete functional coverage, and the exact stopping rule pass, or every permitted missing segment has an explicit uncertainty decision. | [Not assessed] | [Not assessed] | [Not assessed] |
| C10-03 | RV-01 through RV-06 are each `Evidenced` or `Uncertainty explicitly accepted`; none remains `Open`. | [Not assessed] | [Not assessed] | [Not assessed] |
| C10-04 | Material contradictions are resolved, contextualized, or explicitly accepted with consequences. | [Not assessed] | [Not assessed] | [Not assessed] |
| C10-05 | Workflows, actor lenses, workload bands, edge rankings, and fixture requirements are revised or explicitly retained as hypotheses. | [Not assessed] | [Not assessed] | [Not assessed] |
| C10-06 | Evidence provenance is not overstated; measured, aggregate, recalled, procedural, and synthetic bases remain distinct. | [Not assessed] | [Not assessed] | [Not assessed] |
| C10-07 | No participant preference or majority count silently becomes product policy. | [Not assessed] | [Not assessed] | [Not assessed] |
| C10-08 | The exact release candidate passes human privacy, zero-client-data, no-production-response, and designated synthesis review. | [Not assessed] | [Not assessed] | [Not assessed] |
| C10-09 | Raw and working evidence has a recorded non-public retention/disposition state. | [Not assessed] | [Not assessed] | [Not assessed] |
| C10-10 | Every downstream restriction and test obligation is carried into #16 and the affected product/acceptance specifications. | [Not assessed] | [Not assessed] | [Not assessed] |
| Live issue done-when | Product and acceptance requirements trace to representative user scenarios rather than assumptions. | [Not assessed] | [Not assessed] | [Not assessed] |

#10 remains open if any row is `Open` or `[Not assessed]`, any RV claim is `Open`, or the exact candidate fails release review. Passing every row makes #10 ready for the product-owner closure decision; it does not close the GitHub issue automatically.

## 14. Final closure attestation

Complete this section only after all checks pass.

```markdown
## Issue #10 representative-validation closure attestation

- Status: [Representative validation complete | Not complete]
- Approved synthesis release: [non-identifying ID/version]
- Validation period: [approved coarse period]
- Countable sessions: [aggregate]
- Required functions: [complete/accepted uncertainty]
- Maximum variation: [complete/accepted uncertainty]
- Stopping rule: [satisfied/not satisfied]
- Two consecutive qualifying later sessions: [yes/no]
- RV-01–RV-06: [all Evidenced or Uncertainty explicitly accepted / open claims listed]
- Open material contradictions: [count]
- Revised artifacts: [repository-safe references]
- Approved fixture consequences: [FX IDs/dispositions]
- Human privacy review: [passed/failed]
- No-client-data review: [passed/failed]
- No-production-response review: [passed/failed]
- Synthesis approving function/control reference: [non-identifying]
- Raw/working evidence state: [approved categorical state]
- Accepted uncertainties and downstream restrictions: [sanitized list]
- Product-owner decision: [accept/keep open]
- #16 disposition: [eligible/blocked with exact reason]

Final statement: [What is evidenced, what remains uncertain, what must not be inferred, and which downstream tickets own the remaining obligations.]
```

## 15. Release checklist

- [ ] Every release-control field is populated and the exact candidate was approved.
- [ ] Every restricted source row contributing to a released claim had `approved_for_synthesis=true`; restricted intake alone was not treated as release permission.
- [ ] No participant/client/project/source identity, date, prose, filename, path, asset, credential, production response, raw note, recording, row-level metadata, or re-identifying combination remains.
- [ ] Human review assessed the whole candidate in its intended repository/GitHub context, including links, headings, filenames, totals, suppressed cells, existing public artifacts, and cumulative mosaic risk.
- [ ] Function coverage and variation are stated without identifying a person in the small firm.
- [ ] The core-six/synthesis/later-session order and stopping counter are proven by restricted records.
- [ ] RV-01–RV-06 each have an allowed final state and minimum evidence.
- [ ] RV-03 uses approved metadata; RV-05 uses appropriate moderated task evidence or an explicit accepted uncertainty.
- [ ] WF-01–WF-07 each have a disposition.
- [ ] WL-01–WL-16 preserve units, basis, scope, confidence, and representative-label permission.
- [ ] All 39 `EC-*` rows separate frequency from consequence and have a disposition.
- [ ] FX-01–FX-14 each have a disposition, representative-label state, oracle owner, and downstream consumers; `FX-08A` and `FX-08B` remain separate artifacts within the `FX-08` family.
- [ ] Material contradictions are resolved/contextualized or explicitly accepted; none is hidden by aggregation.
- [ ] No participant preference or majority count became product policy.
- [ ] No source/API semantics, rights, populated DTO, boundary convention, overflow policy, graph compatibility, or numeric limit was invented.
- [ ] #16 receives no raw evidence and every allowed input is explicitly traced.
- [ ] #16's receipt requires its own privacy, provenance, asset-rights, determinism, distribution, and derivative-release review; #10 approval is not inherited automatically.
- [ ] Every accepted uncertainty has an owning downstream obligation.
- [ ] The final closure attestation is consistent with live #10/#16 state.

If any item fails, do not release this synthesis, close #10, or unblock #16.

## Sources

- [Internal workflow representative-validation protocol](internal-workflow-representative-validation-protocol.md)
- [Internal workflow validation operations runbook](internal-workflow-validation-operations-runbook.md)
- [Provisional workflow and representative edge cases](internal-boring-log-workflow-edge-cases.md)
- [RSLog read contract and restricted-evidence public handoff](rslog-read-contract-rsagent-evidence.md)
- [Human participation plan](../human-participation-plan.md)
- GitHub issues #10 and #16, current through 2026-08-14
