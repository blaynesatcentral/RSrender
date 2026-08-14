# BLD-001 authority and dependency-admission approval packet

**Status:** Stage 2 `ADMITTED_INTERNAL_BLD001` for the exact full Electron/package graph; external/public/commercial scopes remain unapproved  
**Prepared:** 2026-08-14  
**Implementation ticket:** GitHub #45 / `BLD-001`  
**Purpose:** record the bounded authority and exact dependency-admission process used to activate RSrender's internal production workspace.

This packet is not legal advice. Both BLD-001 approval stages are complete for the stated internal-use scope. The named exclusions and future review triggers remain binding; this record does not authorize public/external/commercial use or admit unrelated third-party material.

## 1. Decision roles

The private approval record must name the real people or functions. The public repository should retain only role/function, date, approved scope, sanitized limitations, policy revision, and an opaque private-record identifier.

| Role | Required authority | May not delegate to an implementation agent |
|---|---|---|
| Employer/rights authority | Ownership, employee/contractor contribution, employer equipment/time, repository publication, internal use, distribution, and future transfer | Whether the project or contribution is authorized and who owns it |
| Dependency/license authority | License-policy approval, exception authority, notice/source-offer obligations, redistribution and transfer disposition | Final admission or legal exception for a package/artifact |
| Architecture/security reviewer | Intended use, attack surface, lifecycle scripts, native/downloaded artifacts, maintenance and vulnerability disposition | Rights approval or waiver of the selected architecture |
| Product owner | Activated BLD scope and accepted product behavior | Employer/vendor/licensor rights held by another party |

One person may hold multiple roles only if that authority is real and recorded.

## 2. Approval scopes

Each scope must be explicitly `APPROVED`, `REJECTED`, or `NOT REVIEWED`. Approval of one scope never implies another.

| Scope | Decision | Sanitized limitation/reference |
|---|---|---|
| Use of applicable employer equipment, time, accounts, and facilities | `NOT REVIEWED` | Not inferred from the internal-use decision. |
| Internal development and testing | `APPROVED` | Central Engineering Services/admin confirmation, 2026-08-14. |
| Internal deployment to the engineering firm | `APPROVED` | Operational release gates still apply. |
| Contribution to this repository | `APPROVED FOR INTERNAL DEVELOPMENT RECORDS` | No push/publication authority is inferred. |
| Publication through the public MIT repository | `NOT REVIEWED` | Current work remains local; includes disposition of existing untracked planning documents and prior MIT history. |
| Windows binary distribution | `APPROVED FOR INTERNAL FIRM USE ONLY` | Signing, installer, update, privacy, and evidence gates still apply. |
| Later commercial license, sale, assignment, or transfer | `NOT APPROVED IN THIS DECISION` | User expressly stated the product is not being sold yet. |
| RSLog documented API access/caching/internal rendering | `APPROVED FOR AUTHORIZED READ-ONLY INTERNAL USE` | Admin stated they hold RSLog access rights; #43 still owns technical positive-shape and asset evidence. |
| ArcGIS clean-room functional-specification use | `NOT REVIEWED` | No Esri code, assets, branding, screenshots, or trade dress. |

## 3. Recommended contribution-policy draft

The accountable authority may approve this policy, approve it with written limitations, or replace it. Silence is not approval.

1. **Initial contributor set.** v0.9 accepts contributions only from specifically authorized contributors. Unsolicited external contributions remain closed until counsel/employer selects and publishes an approved contributor model.
2. **Authority record.** Every contribution records the contributor's real identity in the restricted contributor register, applicable employer permission, authorship/provenance, third-party material, AI/tool assistance, reviewer, and intended repository/license scope.
3. **No confidential inputs.** Contributors may not supply credentials, client data, tenant facts, confidential agreements, raw restricted research, proprietary source, undocumented vendor-route inventories, or third-party assets unless their custodian and rights authority explicitly admit the exact material.
4. **AI-assisted work.** AI-assisted output is treated as a contribution, not ownerless material. A human contributor reviews it against the neutral specifications, records the tool/use category without publishing prompts containing restricted information, checks third-party similarity/material provenance, and assumes responsibility only where authorized.
5. **Clean-room boundary.** Implementers use the durable neutral product/domain/UX/architecture/acceptance package. Quarantined ArcGIS/RSLog evidence, vendor bytes, screenshots, sibling repositories, and raw captures are not implementation input unless an approved handoff expressly admits them.
6. **Inbound license.** The existing repository is MIT. No contributor may assume an inbound-equals-outbound, DCO, CLA, assignment, patent, or employer-waiver model until the accountable authority selects it explicitly.
7. **Review and revocation.** Material changes in contributor, employer, repository visibility/license, vendor terms, intended distribution, buyer transaction, or AI policy trigger re-review before affected work continues.

### Contribution-model selection

- [x] No external contributions; named authorized contributors only, with restricted authority records.
- [ ] Developer Certificate of Origin process approved.
- [ ] Contributor License Agreement process approved.
- [ ] Assignment/work-made-for-hire process approved.
- [ ] Other approved model: `[private record/reference]`.

The named-authorized-contributors-only model is selected for internal v0.9 development. Any external contribution model requires a new accountable decision.

## 4. Recommended dependency-admission policy draft

### 4.1 States

| State | Meaning |
|---|---|
| `CANDIDATE` | Read-only research item; may not enter a production manifest/lock or execute. |
| `RESOLUTION_AUTHORIZED` | The authority permits a restricted metadata/artifact-resolution pass solely to enumerate and verify the exact graph; still not admitted to production. |
| `ADMITTED` | Exact version/artifact and intended acts are approved subject to recorded conditions. |
| `REJECTED` | Must not be resolved, installed, executed, committed, distributed, or used. |
| `REQUIRES_EXCEPTION` | Remains unavailable until the named exception authority approves exact terms and conditions. |
| `REVOKED` | Prior admission no longer applies; affected builds/releases stop pending replacement or renewed approval. |

### 4.2 License categories

| Category | Default draft disposition |
|---|---|
| MIT, BSD-2/3-Clause, ISC, zlib, Apache-2.0 | Eligible for exact-version review; never automatically admitted. |
| SIL OFL 1.1 fonts | Eligible only after exact embedding/modification/name/notice and buyer-transfer review. |
| MPL/LGPL or other weak copyleft | `REQUIRES_EXCEPTION` from dependency/license and architecture authorities. |
| GPL/AGPL/SSPL, source-available, field-of-use, noncommercial, evaluation-only, personal-use-only | `REJECTED` unless counsel approves a written distribution/source strategy for the exact intended acts. |
| Proprietary SDK, font, asset, codec, service, or unknown/missing license | `REQUIRES_EXCEPTION`; unavailable without written rights and security approval. |

### 4.3 Required record for every artifact

Every direct, transitive, optional, bundled, downloaded, native, binary, toolchain, CI action, font, fixture, or asset record must contain:

- exact name, version, filename, ecosystem role, and intended use;
- authoritative source/tag/commit, registry/release URL, SRI/checksum, and verified signature/provenance result where available;
- controlling license plus retained copyright, notice, patent, source-offer, relinking, and attribution obligations;
- complete dependency/bundled/runtime relationship and whether it appears in the shipped product;
- lifecycle scripts, network/download behavior, executable/native content, cache behavior, and sandbox/privilege effect;
- current maintenance/support window and time-stamped vulnerability/advisory disposition;
- internal-use, public-repository, redistribution, commercial-transfer, and buyer-transfer disposition;
- alternatives considered and reason for use;
- approver role, date, conditions, review/expiry trigger, and private-record reference; and
- final state from §4.1.

### 4.4 Two-stage process

1. **Stage 1 — policy and resolution authority.** The accountable authority approves/revises §§2–4 and may authorize a restricted admission-resolution environment. It may fetch registry/release metadata and exact artifacts with lifecycle scripts disabled solely to resolve the graph, verify integrity, inventory notices/licenses, and run non-executing scans. It may not write production manifests/locks, execute package code, publish artifacts, or represent admission.
2. **Stage 2 — exact admission.** The completed direct/transitive/bundled/native inventory returns to the authority. Each artifact becomes `ADMITTED`, `REJECTED`, or `REQUIRES_EXCEPTION`. Only a fully admitted graph may enter the production manifest/lock and execute.
3. **Continuous enforcement.** BLD-007 later regenerates and compares locks, SBOM, notices, provenance, and assets. Automation detects drift; it never grants first-time approval.

## 5. Stage-1 candidate set

The primary-source evidence, integrity values, direct dependency surfaces, and unresolved risks are recorded in [`../planning/research/bld-001-dependency-admission-candidates.md`](../planning/research/bld-001-dependency-admission-candidates.md). The exact direct and transitive graph is admitted only for the bounded internal acts above; the machine-readable dispositions are in [`bld-001-internal-dependency-admission.json`](bld-001-internal-dependency-admission.json).

| Candidate | Exact version | Declared license/notice surface | Stage-1 state |
|---|---:|---|---|
| Node.js Windows x64 distribution | 24.18.1 | MIT plus bundled third-party notices | `ADMITTED_INTERNAL_BLD001` |
| Bundled npm CLI | 11.16.0 | Artistic-2.0 plus dependency/bundled notices | `ADMITTED_INTERNAL_BLD001` |
| Electron | 43.4.0 | MIT package plus Chromium/Node/runtime notice bundle and downloaded binary | `ADMITTED_INTERNAL_BLD001` |
| `@zip.js/zip.js` | 2.8.49 | BSD-3-Clause | `ADMITTED_INTERNAL_BLD001` |
| TypeScript | 6.0.3 | Apache-2.0 | `ADMITTED_INTERNAL_BLD001` |
| `@types/node` | 24.13.3 | MIT plus transitive declaration package | `ADMITTED_INTERNAL_BLD001` |
| esbuild | 0.28.1 | MIT plus platform-native optional package/install behavior | `ADMITTED_INTERNAL_BLD001`; only its verified postinstall may run after script-disabled installation |
| `@electron/packager` | 20.0.4 | BSD-2-Clause plus substantial packaging/signing/download tree | `ADMITTED_INTERNAL_BLD001`; selected over custom packaging to preserve the supported technical path |
| Node `node:test` | from 24.18.1 | Included in admitted Node distribution | `ADMITTED_INTERNAL_BLD001` |
| ESLint | 10.8.0 | MIT plus dependency tree | `ADMITTED_INTERNAL_BLD001` |
| `@eslint/js` | 10.0.1 | MIT | `ADMITTED_INTERNAL_BLD001` |
| `typescript-eslint` | 8.65.0 | MIT plus exact internal packages/peers | `ADMITTED_INTERNAL_BLD001` |
| Prettier | 3.9.6 | MIT | `ADMITTED_INTERNAL_BLD001` |

## 6. Stage-1 public confirmation template

An authorized human may revise the language, but every substantive field must be answered truthfully. Confidential agreements/advice stay in the restricted record.

> On `[date]`, acting as `[accountable employer/rights and/or dependency-license role]` for `[entity or sanitized authority scope]`, I approve RSrender contribution/dependency-admission policy revision `DRAFT-2026-08-14` for the following acts: `[approved scopes from §2]`. Limitations: `[sanitized limitations or none]`. The contribution model selected is `[option from §3]`, supported by restricted record `[opaque ID]`. I authorize a restricted, lifecycle-script-disabled admission-resolution pass for the §5 candidates solely to resolve the exact graph, verify integrity/provenance, inventory licenses/notices/native/downloaded content, and perform non-executing security review. This is Stage-1 authority only; it does not admit a package into the production repository, permit package-code execution, authorize RSLog/vendor access or assets, approve release, or establish commercialization rights beyond the listed scope. Return the complete graph for Stage-2 disposition.

Required signatures/attestations:

| Required role | Name kept privately | Public role/date/reference | Decision |
|---|---|---|---|
| Employer/rights authority | Kept outside public tree | Central Engineering Services/admin, 2026-08-14; internal-only scope | `STAGE_1_APPROVED` |
| Dependency/license authority | Kept outside public tree | Central Engineering Services/admin, 2026-08-14; restricted resolution authorized | `STAGE_1_APPROVED` |
| Product owner | Kept outside public tree | BLD-001–BLD-013 scope activated; internal-only limitation retained | `ACTIVATED` |

## 7. Stage-2 admission record template

Stage 2 is created only from an authorized resolution pass. Do not pre-mark approval.

| Artifact identity/digest | Relationship | Intended/shipped use | License/notices | Scripts/native/network | Security/support | Approved scopes | Conditions/trigger | Authority/reference | Decision |
|---|---|---|---|---|---|---|---|---|---|
| `[populated after Stage 1]` | | | | | | | | | `PENDING` |

BLD-001 implementation may start only after every artifact in the selected graph is `ADMITTED`, rejected candidates have been removed from the graph, and no unresolved exception remains.

## 8. Stage-2 internal-use admission decision

On 2026-08-14, Central Engineering Services/admin confirmed that RSrender is internal-only, is not being monetized, and may install the missing packages. The authority explicitly directed the project not to make technically suboptimal substitutions based on an assumption that Electron packages would not be approved.

The selected graph is therefore the full Electron path resolved by Node 24.18.1/npm 11.16.0 from the §5 direct candidates, including Electron 43.4.0 and `@electron/packager` 20.0.4. The exact Stage-1 lock has SHA-256 `4f8952275c39d806dde16d38824fb21049e66535dccd784729e005dd894601c5` and resolves 156 exact package identities: 117 MIT, 15 Apache-2.0, 10 BSD-2-Clause, 2 BSD-3-Clause, 7 ISC, and 5 BlueOak-1.0.0 registry declarations. Registry integrity matched the lock for all 156; registry signatures were present for all; none was marked deprecated; and the lock-only npm advisory query reported zero known vulnerabilities at the evidence cut.

Admission conditions:

1. `@electron/packager` remains selected; the 127-package manual-packaging comparison is rejected as a production direction because dependency-count reduction alone does not justify a custom, less-supported packaging path.
2. Initial production installation runs with lifecycle scripts disabled. The only resolved install-lifecycle surface is `esbuild@0.28.1` `postinstall`; it may run only after its exact tarball/integrity/package-script review. No other package lifecycle script is authorized implicitly.
3. Complete license/notice and packaged Electron/Chromium/Node notice custody must be retained. BLD-007 will continuously enforce graph, SBOM, notice, provenance, and asset drift.
4. Admission is limited to internal development, testing, internal firm deployment, and internal Windows binary use. Public push/publication, external distribution, sale, licensing, assignment, and buyer transfer require separate authority.
5. This decision does not admit RSLog data, undocumented endpoints, vendor assets, fonts, pictures, hatches, go-bys, or quarantined evidence.

Under these conditions, BLD-001 production workspace creation and installation may begin.
