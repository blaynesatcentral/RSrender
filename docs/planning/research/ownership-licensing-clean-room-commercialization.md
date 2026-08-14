# Ownership, licensing, clean-room, and commercialization gate

**Status:** counsel-reviewable research brief; its recommended hold was superseded by the product-owner decision recorded in GitHub #29  
**Ticket:** #14  
**As of:** 2026-08-13  
**Not legal advice:** this brief identifies evidence, risks, and decisions for the user, employer, and qualified counsel. It does not determine enforceability, ownership, infringement, competitive status, or authorization.

## Executive gate

**Contemporaneous report recommendation (not current project status): NO-GO for product implementation and further ArcGIS Pro or RSLog product-behavior/API research until employer and counsel review is complete and, if counsel advises, Rocscience authorization is obtained in writing.**

**Recorded project decision (2026-08-13):** after receiving this recommendation, the user/product owner explicitly authorized an unconditional GO in GitHub #29. That decision supersedes the recommended project hold and permits the Wayfinder research and disposable prototypes to continue. It does not establish that the legal facts or external permissions described below have changed, and it cannot itself grant rights held by an employer or vendor. The clean-room, read-only RSLog, credential/client-data, provenance, privacy, asset/font, dependency-license, no-branding, and no-trade-dress controls in this brief remain active product constraints. The gate table is retained as the contemporaneous risk analysis, not as the current issue status.

This hold is driven by four unresolved questions, not by a conclusion that any planned conduct is unlawful:

1. **Chain of title is unconfirmed.** The repository asserts an individual copyright and has one Git author identity, but the relationship between the project, the author's employment, employer resources, assigned duties, contracts, and employer business has not been established.
2. **The repository is already public under MIT.** Assuming the person who applied MIT had authority, recipients of already published copies received broad rights to use, modify, publish, sublicense, and sell those copies. A future sale of the project is permitted, but exclusive control over already published versions is limited.
3. **Current Rocscience Product Terms create a direct review issue.** The July 2026 terms restrict use of a Product or Documentation for competitive analysis, development of a competing product/service, or Rocscience's commercial disadvantage, and separately restrict reverse engineering and source-code access ([Rocscience Product Terms, Part A §2.3](https://static.rocscience.cloud/assets/resources/products/Rocscience-Product-Terms-July-2026.pdf)). This brief does not decide whether RSrender is competing, whether a term applies, or whether it is enforceable. Those are counsel questions.
4. **Clean-room intent is not a legal safe harbor.** Independently expressing functional requirements, avoiding code/assets/branding, and maintaining provenance are important controls. They do not override contracts, copyright, trademark/trade dress, patent, confidentiality, privacy, or access restrictions.

Under that contemporaneous recommendation, safe work would have been limited to ownership/contract collection by authorized people, legal review, evidence preservation, and neutral administrative planning. GitHub #29 subsequently superseded the project hold as recorded above. It did not waive the clean-room, read-only, provenance, privacy, credential, asset, dependency-license, branding, or trade-dress controls, and it did not establish rights that belong to an employer or vendor.

### Public-handoff and restricted-evidence boundary

The public planning tree may retain independently stated functional conclusions, domain requirements, evidence grades, dates, and links to public first-party sources. It must not contain third-party branding bytes, absolute paths into a sibling repository, internal capture locations or inventories, tenant-derived counts or hashes, undocumented application-route inventories, raw responses, or client/account identifiers. Prior restricted local evidence remains outside this public tree under its existing custodian; it must not be copied, deleted, disclosed, or used as implementation input until the employer/counsel/vendor publication and use disposition is recorded.

A public report may say only that restricted local evidence was reviewed, what evidence grade it reached, and which conclusion or uncertainty survived sanitization. That statement is not a transferable evidence package, publication permission, vendor support statement, or authorization to reconstruct or probe the withheld surface. If a conclusion cannot be defended from public sources or a separately approved sanitized handoff, it remains blocked rather than gaining authority from an unavailable citation. The same rule applies to locally retained icon candidates: text-only provenance, hashes, and abstract preference may remain public, while the unapproved third-party bytes stay ignored and are neither public assets nor shippable assets.

## Facts, inferences, and unresolved questions

| Category | Statement | Status |
|---|---|---|
| Repository fact | Root `LICENSE:1-21` is the OSI MIT text with `Copyright (c) 2026 Blayne Sandau`. | Verified locally. A copyright notice is an assertion, not proof of title or authority. |
| Repository fact | MIT was added in initial commit `3c3b1871e933e5c66e7bd4e5a6c2c17ce82f48d8` on 2026-08-13; commit `ea9254074f2b17be76f4bde6dfda7c367af27686` added agent conventions. Both commits show the same author name/email identity. | Verified from local Git history. Git identity does not prove employment status, authorship of every idea, or ownership. |
| Repository fact | On 2026-08-13, GitHub reported `blaynesatcentral/RSrender` as **PUBLIC** and detected MIT. The initial public tree had four files; current `HEAD` has seven tracked files and no application code or dependency manifest. | Verified through GitHub and local Git. See [public repository](https://github.com/blaynesatcentral/RSrender). |
| License fact | MIT expressly allows use, copying, modification, publication, distribution, sublicensing, and sale, conditioned on retaining the notice in copies or substantial portions. | [MIT License text](https://opensource.org/license/mit) and local `LICENSE:1-21`. |
| Hosting fact | GitHub says content added to a repository with a license is contributed under that license unless a separate agreement supersedes, and public repositories grant view/fork rights. | [GitHub Terms §D.5-D.6](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service). |
| Inference for counsel | Assuming valid authority, making future versions private or differently licensed cannot withdraw MIT permissions already granted for copies already distributed. A buyer may still acquire copyright, later proprietary changes, trademarks, goodwill, contracts, and services, but cannot recreate exclusivity over the published MIT material. | Reasoned implication of the license; confirm with counsel, especially if initial licensing authority is disputed. |
| Employment-law issue | US law treats an employer as author/initial owner for an employee work made for hire; Canadian law similarly makes the employer first owner when a work is made in the course of employment, absent agreement otherwise. | [17 U.S.C. §201(b)](https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title17-section201), [US Copyright Office Circular 30](https://copyright.gov/circs/circ30.pdf), [Canada Copyright Act §13](https://laws-lois.justice.gc.ca/eng/acts/C-42/section-13.html). Applicable law and facts are unknown. |
| State-law issue | Washington limits some employee invention-assignment clauses but preserves exceptions for employer business, anticipated R&D, and work performed for the employer. | [RCW 49.44.140](https://app.leg.wa.gov/rcw/default.aspx?cite=49.44.140). This is issue-spotting only; no applicable jurisdiction is established. |
| Rocscience fact | Current terms say Customer Data remains owned by the customer. | [Rocscience Product Terms §13.1](https://static.rocscience.cloud/assets/resources/products/Rocscience-Product-Terms-July-2026.pdf). This does not itself grant rights in RSLog software, documentation, API, symbols, hatches, or other product materials. |
| Rocscience fact | Rocscience's current licensing page states that web products such as RSLog are user-locked and that users can transfer RSLog account data to other applications using an API. Current RSLog help says account holders can read and write project/borehole data from other software and describes in-house integrations. | [Rocscience Licensing](https://www.rocscience.com/plans-pricing/licensing), [RSLog API Functions](https://www.rocscience.com/help/rslog/documentation/import/api-functions). This is evidence of intended integration, not a complete API license or commercialization grant. |
| Rocscience negative finding | The July 2026 Product Terms were searched for “API”; no API-specific grant or API terms were found. The terms state that an MSA, sales quotation, confirmation, and user terms can define the purchased rights. | Exact surface tested: the 19-page July 2026 Product Terms. The firm's actual MSA/order/user terms were not supplied and were not searched. Absence from this PDF is not proof that no authorization exists. |
| Esri fact | Esri's August 2025 Master Agreement restricts reverse engineering, decompiling, disassembly, circumvention, unbundling, and incorporating Esri offerings into a competing third-party product. | [Esri E204 Attachment B §B.1](https://www.esri.com/content/dam/esrisites/en-us/media/legal/ma-full/ma-full.pdf). Applicability depends on the actual license/order and conduct. |
| Esri fact | The same agreement permits internal documentation derivatives for authorized use with attribution, while Esri's website terms limit reproduction of website material and reserve commercial uses. | [Esri E204 §1.1(c)](https://www.esri.com/content/dam/esrisites/en-us/media/legal/ma-full/ma-full.pdf), [Esri Copyright Acknowledgement](https://www.esri.com/en-us/legal/copyright-proprietary-rights), [Website Terms](https://www.esri.com/en-us/legal/terms/web-site-service). |
| Copyright fact | US copyright does not extend to an idea, procedure, process, system, method of operation, concept, principle, or discovery, regardless of how expressed. | [17 U.S.C. §102(b)](https://www.copyright.gov/title17/92chap1.html). This does not grant permission under contract or dispose of expressive similarity, patent, trademark, trade dress, or trade-secret questions. |
| Trademark fact | Names, logos, symbols, and designs can identify source; use that creates confusion about affiliation, origin, sponsorship, or approval can create liability. | [USPTO trademark basics](https://www.uspto.gov/trademarks/basics/what-trademark), [15 U.S.C. §1125](https://www.law.cornell.edu/uscode/text/15/1125). |

## Immediate work classification

These are risk-control recommendations pending counsel, not legal conclusions.

### Safe to continue now

- Preserve existing Git history, file hashes, research-source URLs, dates, and authorship records without rewriting or deleting evidence.
- Compile, in a restricted employer/counsel workspace, the actual employment agreement, invention-assignment/confidentiality terms, job duties, employer policies, contractor agreements, Rocscience order/MSA/User Terms/API terms, and Esri order/license terms. Do not commit confidential agreements to this public repository.
- Record which person or entity paid for licenses, devices, accounts, cloud services, and development time; who directed the work; which employer facilities or confidential information were used; and when each contribution was made.
- Inventory existing repository authors, research inputs, AI-assisted work, third-party snippets, images, fonts, hatches, fixtures, and sample data. Record provenance without copying restricted material into the repository.
- Maintain a private question log and decision register for employer/counsel. Administrative issue wording should not disclose privileged advice or confidential contract terms.
- Research generic open-source licenses, software supply-chain controls, and independently licensed fonts/assets without selecting or adding dependencies.
- Draft neutral product requirements based solely on independently supplied user requirements only if counsel/employer agrees that this administrative work may continue. Keep it separate from vendor-product analysis.

### Hold pending employer/counsel decision

- Any product implementation, prototype, source adapter, UI, renderer, document schema, or export code.
- Further ArcGIS Pro benchmarking, including opening the product for systematic observation, recording behavior, taking screenshots/video, pixel/color/icon measurement, automation, comparative testing, or reproducing its interaction sequence.
- Further use of Esri documentation to derive implementation specifications beyond preserving already collected citations.
- Further RSLog product or API research, including authenticated calls, contract harvesting, browser/network observation, service-proxy or ABP discovery, endpoint guessing, schema probing, and any call to an undocumented route.
- Use of previously captured undocumented RSLog endpoint evidence to implement an adapter.
- Copying, tracing, extracting, transforming, or bundling Esri or Rocscience code, icons, cursors, screenshots, templates, sample logs, fonts, hatches, soil-symbol art, or other product assets.
- Publishing the untracked planning/research corpus to the public MIT repository until counsel decides whether it may be published and under what ownership/license notice.
- Accepting outside contributions or directing contractors/agents to create implementation artifacts before contribution and employer-rights terms are in place.
- Public claims such as “ArcGIS clone,” “official RSLog renderer,” “Rocscience approved,” or any comparative advertising/benchmark result.

### Prohibited by project policy unless counsel gives a written, scoped exception

- Obtaining or sharing credentials, bypassing authentication/authorization, defeating technical controls, or accessing a route/data/tenant without explicit authorization.
- Decompiling, disassembling, extracting source, copying code, or incorporating any part of Esri or Rocscience software.
- Committing client/customer data, credentials, license keys, confidential contracts, protected support materials, or private tenant contract captures to this repository.
- Misrepresenting affiliation with Esri or Rocscience or using their logos, proprietary product assets, or branding as RSrender branding.

## MIT publication and commercialization implications

### What the present MIT text permits

The repository's MIT text grants anyone who obtains a copy broad permission to use, copy, modify, merge, publish, distribute, sublicense, and sell it, subject to inclusion of the copyright and permission notice in copies or substantial portions. It disclaims warranty and liability. MIT does not require disclosure of source for a distributed binary or derivative, does not prohibit commercial use, and does not grant trademark rights. See [OSI's canonical MIT text](https://opensource.org/license/mit).

Therefore, **if the current licensor had authority**:

- RSrender may be sold, licensed commercially, supported for a fee, or acquired;
- others may also use or sell the already published MIT material;
- the existing published material cannot provide a buyer with practical source-code exclusivity;
- a future copyright owner can offer additional licenses or make later wholly owned additions proprietary, but cannot revoke the MIT permissions already attached to copies recipients possess;
- removing the public repository later would not remove existing clones, forks, downloads, or license rights;
- proprietary differentiation can reside in later code, services, trademarks, contracts, support, datasets, or know-how, subject to valid ownership and third-party rights.

GitHub's current terms also say contributions added to a repository bearing a license are licensed on those terms unless a separate agreement supersedes ([GitHub Terms §D.6](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)). An unreviewed pull request could therefore gain MIT rights without giving the project owner the ability to sell that contributor's copyright or relicense it exclusively.

### Current repository evidence

- Initial MIT publication: commit `3c3b1871e933e5c66e7bd4e5a6c2c17ce82f48d8`, 2026-08-13T14:26:43-07:00.
- Second tracked commit: `ea9254074f2b17be76f4bde6dfda7c367af27686`, 2026-08-13T14:36:35-07:00.
- Both commits carry the same Git author identity.
- Initial tree: `.gitignore`, `LICENSE`, `README.md`, `docs/planning/README.md`.
- Current tracked tree: seven files; no `package.json`, lockfile, application source, vendored library, font, image, hatch, sample dataset, or installer is tracked.
- Current GitHub visibility: public; GitHub reports the license as MIT.
- Current local planning documents are untracked. They are not shown by this Git history as published, but committing them to the licensed public repository would create additional publication and GitHub inbound-equals-outbound implications.

This evidence does **not** establish that the named individual, the employer, or another entity owns the work or had authority to apply MIT. Counsel must resolve that before changing visibility, copyright notice, licensing, or accepting contributions.

## Employer and contributor chain of title

### Questions requiring documentary answers

For the original author and every later contributor, collect:

- legal identity and contribution dates;
- employee, officer, owner, contractor, student, or volunteer status;
- applicable employment/contract jurisdiction;
- employment agreement, invention-assignment, confidentiality, acceptable-use, moonlighting, and open-source policies in effect on each contribution date;
- whether the work was within assigned duties or employer business/research;
- whether employer time, equipment, accounts, software licenses, facilities, funds, customer data, trade secrets, or colleagues were used;
- whether the employer requested, approved, sponsored, or expected the work;
- whether another client, institution, or prior project supplied requirements, code, assets, or know-how;
- all assignments, releases, waivers, permissions, or written employer approvals;
- third-party and AI-assisted material used, with source and license.

US and Canadian statutes both make employment context material to first ownership, but their tests and applicable law differ ([17 U.S.C. §201](https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title17-section201), [Canada Copyright Act §13](https://laws-lois.justice.gc.ca/eng/acts/C-42/section-13.html)). The repository location, author email, or copyright line does not answer those questions.

### Contributor policy required before accepting work

Counsel should choose and document one inbound model:

1. **Copyright assignment plus license-back**, optimized for clean acquisition/relicensing; or
2. **A broad CLA**, granting copyright and patent rights sufficient for proprietary relicensing and sale; or
3. **Developer Certificate of Origin/inbound=outbound**, simpler for open source but insufficient by itself to give a buyer exclusive ownership of contributor copyrights.

At minimum, every contribution must include:

- real contributor identity and signed/click-through assent;
- representation of authorship and authority to contribute;
- employer permission when the contributor's obligations could apply;
- disclosure and approval of third-party code, assets, fonts, datasets, AI assistance, and copied/generated snippets;
- source URL, exact version/commit, license identifier/text, notices, and modifications;
- patent-license terms or patent-risk escalation appropriate to the dependency/contribution;
- confirmation that no confidential, client, controlled, or credential material is included;
- a retained review record linking the contribution to approvals.

No contributor agreement should be invented or adopted without counsel. A later buyer may require assignments, moral-rights treatment where permitted, representations, indemnities, and disclosure schedules beyond an open-source CLA.

## Rocscience and RSLog gate

### Five separate rights questions

1. **Customer Data.** The July 2026 Product Terms define Customer Data as data input by the customer/users or on the customer's behalf and say title remains with the customer ([§13.1](https://static.rocscience.cloud/assets/resources/products/Rocscience-Product-Terms-July-2026.pdf)). This supports a data-ownership argument; it does not decide privacy, client confidentiality, employee authority, export format, retention, or rights in Rocscience-added metadata/assets.
2. **API use.** Rocscience's licensing page says RSLog web-license users can transfer account data to other applications via an API ([Licensing](https://www.rocscience.com/plans-pricing/licensing)). The public [RSLog API Functions](https://www.rocscience.com/help/rslog/documentation/import/api-functions) page says an RSLog account holder can use APIs to read and write project/borehole data from other software and identifies in-house integrations. No API-specific license grant was found in the July 2026 general Product Terms. The firm's actual MSA/order, account User Terms, API documentation terms, and any written permission control the real authorization question.
3. **Public documentation.** Public availability does not place documentation in the public domain. The current Product Terms define Documentation and restrict copying/modification and competitive-analysis/product-development use. Counsel must decide what factual interoperability use is permitted and what expression may be retained or published.
4. **Competitive-purpose clause.** Part A §2.3(i) restricts use of a Product or Documentation for competitive analysis, development of a competing software product/service, or Rocscience's commercial disadvantage. This report does not decide whether RSrender, an internal boring-log designer, later sale to Rocscience, or any research activity falls within those words or whether they are enforceable.
5. **Undocumented endpoint observation.** Published ABP graphs, service-proxy routes, authenticated network behavior, and endpoint responses may raise different contract, authorization, confidentiality, and trade-secret issues from the documented public API. Customer ownership of returned records does not itself authorize probing or reuse of the service contract. No further observation or implementation from those materials should occur before a scoped counsel decision.

### Exact counsel questions for RSLog

- Which instruments govern the firm's account: July 2026 Product Terms, earlier accepted terms, MSA, sales quotation, confirmation, User Terms, API terms, privacy/data-processing terms, or negotiated amendments? Which prevails?
- Does the purchased RSLog license authorize an internal read-only desktop application to retrieve the firm's Customer Data through the documented public API?
- Does it authorize use by approximately 30 employees, and must each user have an RSLog Authorized User/license or authenticate individually?
- May Source Snapshots be retained offline in Log Projects, and for how long, including after subscription expiration or account suspension?
- May the application generate PDFs for clients and embed retrieved Customer Data in those deliverables?
- Does the intended project or its possible sale/license constitute “competitive analysis,” a “competing software product or service,” or commercial disadvantage under §2.3(i)? Do not begin from an assumed answer.
- May public RSLog documentation be used to specify interoperability without reproducing its expressive text, figures, screenshots, or assets?
- Are previously captured ABP/service-proxy routes and response shapes permitted evidence? Must they be quarantined or destroyed, and may any sanitized conclusions be retained?
- May any route not listed in the public v1 reference be called? Does publication in an authenticated application's API-definition graph or JavaScript proxy change that answer?
- Are `POST`-shaped read endpoints allowed when they cause no mutation?
- May Rocscience-supplied soil symbols, hatches, image files, lookup labels, template data, or sample logs be cached, embedded, transformed, or redistributed? Are customer-uploaded assets treated differently?
- Does laboratory-result access require separate permission or license scope?
- Does the firm have authority from its clients/data subjects to store Source Snapshots and use their records in a new application?
- Should Rocscience be asked for written integration/commercialization authorization, and if so, what exact scope, endpoint set, asset rights, caching rights, user model, support expectation, and future assignment rights are required?

### Gate outcome required

Counsel/employer must produce a short written decision that identifies the controlling agreements and classifies each activity: documented API reads, caching, internal multi-user deployment, PDF output, public documentation use, undocumented route use, asset/hatch use, and commercialization. If the documents do not clearly authorize the required behavior, the gate remains closed unless Rocscience supplies authorization acceptable to counsel.

## Esri and ArcGIS Pro clean-room gate

ArcGIS Pro is a benchmark, not a dependency. RSrender must not ship Esri code, services, data, fonts, assets, branding, screenshots, or trade dress.

### Relevant first-party terms

- Esri's current legal portal identifies the Master Agreement and Product-Specific Terms as the governing license sources ([Esri Legal Overview](https://www.esri.com/en-us/legal/overview)).
- The August 2025 E204 agreement grants a nonexclusive right to use licensed offerings and allows internal documentation derivatives in connection with authorized use, with an Esri attribution notice ([E204 §1.1](https://www.esri.com/content/dam/esrisites/en-us/media/legal/ma-full/ma-full.pdf)).
- E204 prohibits reverse engineering, decompiling, disassembly, circumvention, unbundling, and incorporating any portion of an Esri Offering into a competing third-party product ([Attachment B §B.1](https://www.esri.com/content/dam/esrisites/en-us/media/legal/ma-full/ma-full.pdf)).
- Esri's public-site terms reserve ownership, restrict commercial reproduction, and prohibit access/hacking of services not made readily available, removal of notices, and systematic harvesting ([Website Terms](https://www.esri.com/en-us/legal/terms/web-site-service)).
- Esri states that its images and screenshots remain its copyrighted property and limits provided media screenshots to specified editorial uses ([Media Terms](https://www.esri.com/en-us/legal/terms/media)).
- E204 says Esri-provided fonts may be used for authorized software use and separately to print output created by the software; third-party font restrictions are in the font file. That is not permission to bundle those fonts in RSrender ([E204 §2.3(c)](https://www.esri.com/content/dam/esrisites/en-us/media/legal/ma-full/ma-full.pdf)).

### Clean-room protocol, if counsel authorizes benchmark research

“Clean room” is used here as an evidence and separation process, not a legal conclusion:

1. **Written scope:** counsel identifies permitted licenses, source types, observation methods, people, accounts, and outputs before research resumes.
2. **Source whitelist:** each source gets URL/title, publisher, version/date, retrieval date, license/terms, permitted use, and content hash where practical.
3. **No prohibited inspection:** no source/binary extraction, decompilation, disassembly, memory inspection, traffic interception, technical-control circumvention, or hidden-service access.
4. **Ordinary-use observation only:** if approved, researchers use a properly licensed non-trial product through normal UI operations; every test records the license context and exact steps. No screenshots/assets enter implementation artifacts unless separately authorized.
5. **Facts separated from expression:** findings are rewritten as neutral atomic capabilities, inputs, states, outputs, and edge cases. No copied prose, UI text beyond necessary short identifiers, visual design, icon, color palette, sound, animation, or branded terminology.
6. **Research/implementation separation:** if counsel requires strict separation, researchers retain raw notes in a restricted evidence store; implementers receive only a counsel-approved functional specification. Existing research files may need sanitization or removal from the implementation repository before coding.
7. **Independent design:** RSrender's information architecture, terminology, icons, component styling, keyboard model, and visual hierarchy are designed from its own domain model and usability requirements. Similarity is reviewed at both component and whole-product levels.
8. **Evidence trail:** each implemented benchmark-derived behavior links to an approved neutral requirement and its public/observed evidence class, not to an Esri artifact.
9. **Asset exclusion:** use independently created icons, synthetic Example Datasets, and licensed fonts/hatches; never trace or transform Esri assets.
10. **Pre-release review:** counsel and design review names, branding, screenshots, marketing comparisons, and overall look-and-feel before external distribution.

### Exact counsel questions for ArcGIS research

- Which Esri agreement and license type governs the account/product used for research?
- May licensed ordinary use include systematic functional observation for an independently implemented boring-log designer?
- Which public documentation may be read, quoted internally, paraphrased, or cited in a product specification intended to support later commercial development?
- Is researcher/implementer separation required, and must raw benchmark notes be outside the source repository?
- Are screenshots, recordings, keyboard tables, pixel measurements, timing results, or comparative matrices permitted internally? Which may be published?
- Does the planned capability comparison or any published performance/usability statement constitute a restricted benchmark or comparative claim?
- What similarity review is required for UI structure, Contents tree behavior, property panes, rulers/guides, selection handles, menus, shortcuts, and layout workflows?
- What wording may accurately acknowledge ArcGIS Pro as research inspiration without suggesting origin, endorsement, compatibility, or affiliation?

## Dependencies, Electron, OS components, and notices

No application stack or package version has been chosen. The current tracked repository contains no package manifest or lockfile. This section is policy, not a dependency approval.

Electron itself is MIT-licensed, and its official repository says it embeds Chromium and Node.js ([Electron repository](https://github.com/electron/electron), [Electron LICENSE](https://github.com/electron/electron/blob/main/LICENSE)). The fact that Electron's own code is MIT does not collapse all bundled Chromium, Node, codec, OS-runtime, installer, updater, or transitive-component obligations into MIT. A release candidate must inventory the exact binary contents and preserve all applicable notices/license files.

### Proposed dependency policy

| Category | Default project policy | Required evidence |
|---|---|---|
| MIT, BSD-2/3-Clause, ISC, zlib, Apache-2.0 | Eligible for routine approval, not automatically approved | Exact version/commit, authoritative license, NOTICE/patent conditions, transitive tree, security/maintenance review |
| Public domain/CC0 | Approval required because provenance and jurisdictional dedication matter | Authoritative dedication, source, version/hash |
| MPL-2.0, EPL, CDDL, LGPL, weak/file copyleft | Counsel and architecture approval | Linking/modification/distribution analysis, source/notice process, installer/update implications |
| GPL, AGPL, SSPL, strong/network copyleft | Forbidden unless counsel and product owner approve an explicit licensing strategy before introduction | Written compatibility and distribution plan |
| Business Source License, Commons Clause, PolyForm, source-available, noncommercial, no-derivatives, field-of-use restrictions | Forbidden by default; counsel exception only | Current and change-date terms, commercial-use fit, written approval |
| Commercial/proprietary SDK, font, asset, codec, service | Written owner/employer/counsel approval | Executed license/order, seats, redistribution, territory, support, assignment/change-of-control rights |
| Unknown, missing, custom, deprecated, or conflicting license | Forbidden until resolved | Primary license text and ownership/provenance |

Every dependency change must produce an updated lockfile, software bill of materials, license/notice inventory, source and checksum, reason for use, alternatives considered, transitive-license scan, vulnerability review, and approval record. Release builds must generate an About/Third-Party Notices surface and retain any required source-offer or relinking materials. Automated scanners assist but do not replace reading the controlling license.

### Operating-system boundary

- Using an OS-provided API or installed font is not the same as redistributing its binary/font file.
- Windows permits applications on licensed Windows installations to use system fonts for screen, print, and ordinary output, but Microsoft's font FAQ says Windows font files generally may not be redistributed with an application without extended rights ([Microsoft Font Redistribution FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq)).
- Each target platform and installer must undergo a release-specific review for SDK runtimes, redistributables, signing/notarization, store rules, updater components, codecs, and attribution. No cross-platform assumption is approved merely because Electron runs there.
- Proprietary codec support or substituted multimedia binaries require separate patent/license review and are forbidden by default.

## Fonts, hatches, fixtures, and other assets

### Fonts

- Prefer fonts under SIL OFL 1.1 or another counsel-approved redistribution license. SIL states OFL fonts may be bundled with commercial applications subject to the license conditions ([OFL site](https://openfontlicense.org/), [OFL FAQ](https://openfontlicense.org/ofl-faq/)). Preserve the font license, copyright, Reserved Font Names, and modification/name requirements.
- OS-installed fonts may be offered as user-selected fonts without bundling their files. Do not extract or copy them into the installer.
- A Log Document's PDF font embedding is a separate right from on-device rendering or app bundling. The PDF exporter must honor the font license and OpenType `fsType`: restricted, preview/print, editable, no-subsetting, and bitmap-only flags ([OpenType OS/2 specification](https://learn.microsoft.com/en-us/typography/opentype/spec/os2)).
- Fonts with missing/unclear licenses, “free for personal use,” noncommercial terms, or prohibited embedding are unavailable until approved. Export must fall back visibly or block with a Diagnostic, not embed silently.
- Esri/Rocscience-bundled fonts are not eligible merely because they are installed with those products.

### Hatches and graphic assets

Every hatch, soil symbol, icon, cursor, texture, logo, and template decoration needs an asset manifest containing creator/owner, source, exact license, modification rights, commercial redistribution rights, attribution, file hash, and approval.

Classify source assets as:

- **RSrender-authored:** created independently with dated source files and contributor ownership record;
- **open-licensed:** exact license and attribution retained;
- **customer-authored:** written representation that the customer owns or may sublicense it for app/cache/output use;
- **vendor-supplied:** forbidden unless the vendor license expressly permits the intended caching, transformation, app bundling, and PDF redistribution;
- **unknown:** forbidden.

Rocscience's statement that Customer Data remains customer-owned does not establish that Rocscience-provided hatches, soil-symbol images, template assets, or lookup artwork are Customer Data. Customer-uploaded art may still contain third-party rights. Use a neutral independently created fallback and Diagnostic when an asset is not approved.

### Data fixtures and examples

- The **Example Dataset** embedded in a Log Template must be deliberately synthetic or separately licensed for this purpose; it must not be copied from a client borehole, vendor tutorial, sample log, screenshot, or support file.
- Test fixtures derived from production Source Data must be de-identified and approved under employer/client privacy and confidentiality rules; field-name preservation alone does not make values safe.
- Proprietary template files and outputs may be used only under a written, scoped test authorization. Golden PDFs should be generated from synthetic data and independently authored templates.
- No vendor screenshots, manual figures, help-video frames, sample PDFs, or extracted assets enter tests, docs, installers, marketing, or issue attachments without permission.

## Branding and acquisition readiness

The product must be brand-configurable so an internal deployment, independent commercial product, or later Rocscience acquisition does not require invasive code changes. Keep these values outside domain behavior:

- product and company names, copyright owner, trademark notices;
- application IDs, executable/bundle names, protocol/file associations, installer publisher, signing identity;
- icons, splash, About screen, colors, typography, website/support/privacy links;
- document metadata producer string and optional Publication Audit branding;
- update channel/feed, telemetry/crash-report endpoints and consent text;
- default templates and Example Datasets;
- Source Adapter display names and compatibility acknowledgements.

Do not ship Esri or Rocscience names/logos as RSrender branding. Any factual compatibility phrase (for example, that a Source Adapter reads authorized RSLog data) requires trademark and contract review and must not imply endorsement. The name “RSrender” itself needs trademark/domain clearance before external branding; this brief does not report a clearance search.

A possible sale to Rocscience may transfer validly owned copyright, future proprietary components, trademarks, domains, contracts, source, build systems, and know-how. The disclosure schedule must identify the public MIT history and every third-party component. A buyer cannot receive exclusivity over already published MIT copies, assuming those licenses were validly granted.

## Go/no-go gates

| Gate | Owner | Exit evidence | If unresolved |
|---|---|---|---|
| G0 — Containment | Product owner + employer | Written hold acknowledged; no implementation/vendor research; confidential agreements and raw captures kept outside public repo | **NO-GO** |
| G1 — Ownership and MIT authority | Employer + counsel | Applicable agreements/jurisdiction reviewed; written owner/authority determination; decision on public repository, copyright notice, existing MIT grants, untracked research publication | **NO-GO** |
| G2 — Contribution model | Counsel + product owner | Approved assignment/CLA/DCO strategy; contributor register; employer-permission and third-party disclosure workflow | No external contributions; implementation remains held if chain of title is required |
| G3 — Rocscience/RSLog rights | Employer + counsel; Rocscience if advised | Controlling agreements identified; written activity matrix for public docs, documented API, caching, internal users, PDF output, lab data, assets, undocumented endpoints, commercialization | **NO-GO for Source Adapter and product implementation** |
| G4 — ArcGIS research protocol | Counsel + product/design leads | Approved source/observation scope and clean-room protocol; decision on prior research corpus; implementer handoff format | **NO-GO for benchmark research or benchmark-derived implementation** |
| G5 — Dependency/asset policy | Architecture + counsel | Approved license policy; candidate stack/dependency BOM; font/hatch/fixture provenance plan; release notice design | No dependency addition or distributable build |
| G6 — Implementation start | Product owner | G1-G5 closed; written authorization to resume with explicit boundaries | **NO-GO** |
| G7 — Internal deployment | Employer | SBOM/notices, signed binaries, data/privacy/security review, authorized user/API model, client confidentiality controls, asset/font clearance | No 30-person rollout |
| G8 — External commercialization/acquisition | Owner + employer + counsel + buyer | Title/IP schedule, valid assignments, public-MIT disclosure, trademark clearance, third-party licenses, security/privacy/export review, commercial contracts, warranties/indemnities, change-of-control rights | No external sale/license or claim of exclusivity |

## Exact questions for employer and counsel

### Ownership and authority

1. Who legally owns each existing tracked and untracked RSrender contribution, and under which jurisdiction and agreement?
2. Was any work created within employment scope, assigned duties, employer business/anticipated R&D, or with employer equipment, time, accounts, licenses, client data, confidential information, or funding?
3. Did the person named in `LICENSE` have authority to publish the initial files under MIT and make the GitHub repository public?
4. If the employer owns or co-owns the work, does it ratify the prior MIT publication? What copyright notice should be used going forward?
5. Should the repository become private while ownership and vendor rights are reviewed? How should existing clones and published grants be disclosed?
6. May the existing untracked research/specification documents be committed to a public MIT repository, or are they employer work/confidential/legal material?
7. Which contributor agreement gives the desired ability to sell or exclusively license later IP to Rocscience?
8. Are moral-rights waivers/non-assertions, patent assignments/licenses, and contractor agreements needed in the applicable jurisdictions?

### Vendor research and interoperability

9. Answer every RSLog question in the RSLog section and identify the controlling contract text for each answer.
10. Must further RSLog integration work wait for written Rocscience permission? If permission is sought, who may request it and what minimum rights are required?
11. What must happen to prior ABP/service-proxy/undocumented-endpoint evidence: preserve under privilege, quarantine, sanitize, avoid, or delete under an approved evidence-retention plan?
12. Answer every ArcGIS question in the clean-room section and approve or reject the proposed protocol.
13. Is the existing ArcGIS research corpus safe for implementers to read, or must counsel create a sanitized functional handoff and segregate researchers?
14. What comparative statements, screenshots, product names, and compatibility claims may appear in internal documents, public issues, marketing, and sales material?

### Commercialization and release

15. Is continued MIT licensing compatible with the intended business/acquisition path, or should later components use a different license after valid ownership is established?
16. What representations can be made to a buyer about exclusivity given the public MIT history?
17. Which open-source/copy-left license categories and notice/source-offer processes are acceptable?
18. What font embedding, hatch caching, and PDF redistribution rights must the app enforce technically?
19. What client consent, privacy, retention, security, professional-responsibility, and insurance terms apply to Source Snapshots and generated Log Documents?
20. What trademark clearance and naming changes are required for “RSrender,” and what nominative references to RSLog/ArcGIS are permitted?

## Counsel decision record template

The gate should close through a dated written record, stored outside the public repository if privileged or confidential:

| Field | Required entry |
|---|---|
| Decision date / reviewer | Name, role, jurisdiction, scope of advice |
| Materials reviewed | Employment agreements, policies, Git history, license texts, MSA/order/User/API terms, research corpus |
| Ownership conclusion | Owner(s), effective dates, assignments/ratification required |
| Existing MIT conclusion | Authority, effect on published copies, future license plan, required notice changes |
| Rocscience activity matrix | Each public-doc, API, cache, user, output, asset, undocumented-route, and commercialization activity: allowed / allowed with conditions / prohibited / authorization required |
| Esri activity matrix | Public docs, ordinary observation, recordings/screenshots, benchmark publication, implementer access, attribution |
| Clean-room controls | Approved people, sources, storage, handoff, prohibited materials, audit evidence |
| Contributor model | Executed agreement/process and employer-permission requirements |
| Dependency/asset policy | Approved categories and review owner |
| Resume authorization | Exact work that may begin; exact work that remains held |

## Primary-source index

### Repository and open source

- Local `LICENSE:1-21` and Git commits `3c3b1871e933e5c66e7bd4e5a6c2c17ce82f48d8`, `ea9254074f2b17be76f4bde6dfda7c367af27686`
- [RSrender public GitHub repository](https://github.com/blaynesatcentral/RSrender)
- [OSI MIT License](https://opensource.org/license/mit)
- [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
- [Electron repository and licensing](https://github.com/electron/electron)
- [Electron MIT license](https://github.com/electron/electron/blob/main/LICENSE)

### Esri

- [Esri Legal Overview](https://www.esri.com/en-us/legal/overview)
- [E204 Master Agreement, revised August 1, 2025](https://www.esri.com/content/dam/esrisites/en-us/media/legal/ma-full/ma-full.pdf)
- [E300 Product-Specific Terms, November 13, 2025](https://www.esri.com/content/dam/esrisites/en-us/media/legal/product-specific-terms-of-use/e300.pdf)
- [Esri Website Terms](https://www.esri.com/en-us/legal/terms/web-site-service)
- [Esri Copyright and Proprietary Rights Acknowledgement](https://www.esri.com/en-us/legal/copyright-proprietary-rights)
- [Esri Media Terms](https://www.esri.com/en-us/legal/terms/media)
- [Esri Product Naming, Marks, and Terminology Guide](https://www.esri.com/content/dam/esrisites/en-us/media/legal/copyrights-and-trademarks/esri-product-naming-guide.pdf)

### Rocscience / RSLog

- [Rocscience Product Terms, July 2026](https://static.rocscience.cloud/assets/resources/products/Rocscience-Product-Terms-July-2026.pdf)
- [Rocscience License Support page linking the current terms](https://www.rocscience.com/support/licenses)
- [Rocscience licensing models and RSLog API statement](https://www.rocscience.com/plans-pricing/licensing)
- [RSLog API Functions](https://www.rocscience.com/help/rslog/documentation/import/api-functions)
- [RSLog license/account documentation](https://www.rocscience.com/help/rslog/documentation/getting-started/activating-your-license)

### Statutes and authoritative license/format owners

- [17 U.S.C. §102](https://www.copyright.gov/title17/92chap1.html)
- [17 U.S.C. §201](https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title17-section201)
- [US Copyright Office Circular 30: Works Made for Hire](https://copyright.gov/circs/circ30.pdf)
- [Canada Copyright Act §13](https://laws-lois.justice.gc.ca/eng/acts/C-42/section-13.html)
- [Washington RCW 49.44.140](https://app.leg.wa.gov/rcw/default.aspx?cite=49.44.140)
- [USPTO Trademark Basics](https://www.uspto.gov/trademarks/basics/what-trademark)
- [SIL Open Font License](https://openfontlicense.org/)
- [SIL OFL FAQ](https://openfontlicense.org/ofl-faq/)
- [Microsoft Font Redistribution FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq)
- [OpenType `fsType` embedding specification](https://learn.microsoft.com/en-us/typography/opentype/spec/os2)

## Decision handoff

At the time of this report, the evidence did not support the report's recommended implementation start. The product owner later accepted that risk and authorized an unconditional GO in GitHub #29, which is the current project decision. The unresolved external facts remain material: ownership/licensing authority, the firm's controlling RSLog agreements, ArcGIS research protocol, and contributor/dependency/asset policy still require evidence before any party can claim those external permissions, rights, or assurances. Internal deployment and commercialization additionally remain subject to the operational gates in this report.
