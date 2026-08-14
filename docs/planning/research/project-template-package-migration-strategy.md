# RSrender project/template package and migration strategy research

**Ticket:** #13  
**Research date:** 2026-08-13  
**Status:** Evidence and prototype requirements; no production file format selected  
**Scope:** Self-contained persistence for `Log Template` and `Log Project` files. A `Log Document` is an exported publication and is not an editable package.

**Terminology reconciliation:** Later domain consolidation distinguishes the retained, source-normalized `Source Snapshot` from the renderer-facing `Render Dataset` derived from it together with Supplemental Sources and Presentation Overrides. It also names the project-retained current template material `Embedded Template Representation`. Those later glossary meanings govern where this research used the older phrases “retained Render Dataset,” “effective template representation,” or “cached working representation”; no template-history archive is implied.

## Executive result

RSrender should define a **logical package contract before selecting a physical container**. The contract can be prototyped over several envelopes without changing domain semantics. That keeps ticket #20 able to test the consequential unknowns instead of letting a convenient library silently define the product.

The evidence supports carrying these options into the prototype:

1. a constrained ZIP package containing a small, validated JSON manifest plus separately hashed JSON and binary parts;
2. an SQLite application file with an equally explicit logical manifest and migration contract; and
3. a plain-directory/debug representation as a support and diff oracle, not necessarily as the user-facing file.

Plain single-file JSON remains a useful control case. Open Packaging Conventions (OPC) is a credible but likely overpowered alternative that should be eliminated or retained based on a short authoring-cost spike, not intuition. A ZIP-wrapped SQLite database adds both attack surfaces and little demonstrated benefit and should not enter the prototype unless a test exposes a requirement neither simpler option can meet.

No option is yet production-ready. In particular:

- ZIP gives excellent inspectability and natural asset separation, but it needs an RSrender-specific deterministic profile, resource limits, and defenses against path traversal, duplicate names, case collisions, links, misleading size metadata, and malformed assets.
- SQLite gives single-file transactions and incremental updates, but its guarantees rely on filesystem behavior; the SQLite project warns that network filesystem synchronization and locking vary and can corrupt remote databases. It is also less friendly to ordinary text diff and hand support.
- `JSON.parse` plus TypeScript types is not validation. JSON itself permits duplicate object-member names with unpredictable consumer behavior; the package reader must reject them before ordinary materialization and then perform schema and semantic validation.
- A content hash detects accidental or malicious changes only when the trusted expected hash is outside the bytes being checked. A manifest that contains hashes of its own parts provides internal consistency, not authorship or authenticity.
- “Self-contained” cannot mean “copy any installed font.” OpenType records embedding rights, and restricted, preview/print, editable, and installable modes have different consequences for editing. Font license treatment is part of package validity.
- A `Log Project` should retain the **Embedded Template Representation** of every assigned `Log Template` needed to edit and render it offline, identified by stable template ID and content digest. This is not a history of every prior template or prior `Log Document`. Missing or changed library templates must never be silently substituted by display name.
- Migration should be copy-on-open and explicit: retain the original bytes, validate and migrate through every known version in memory or a temporary candidate, show the user the result, and write current format only on an explicit Save/Save As. A failed migration leaves the original untouched.

The final section defines a finite prototype plan and decision gates for ticket #20.

## Evidence labels

- **Documented** — guaranteed or required by a cited specification or first-party source.
- **Inference** — an RSrender design implication derived from documented behavior.
- **Proposed invariant** — a candidate product/file-contract rule that ticket #20 should test; it is not yet an architecture decision.
- **Policy unknown** — requires an organizational, legal, retention, or product decision rather than more technical research.

## Product boundaries that the package must preserve

The repository domain model fixes these meanings:

- A `Log Template` is reusable layout, binding, formatting, behavior, and an embedded `Example Dataset`.
- A `Log Project` combines selected `Exploration`s, `Template Assignment`s, Embedded Template Representations, deliberately attached Supplemental Sources, `Presentation Override`s, and a retained `Source Snapshot` for a deliverable set.
- A `Source Snapshot` contains immutable accepted source facts, collection outcomes, provenance, and freshness, not a disposable cache or renderer projection.
- A `Refresh` is deliberate and accepted by the user; opening a package must not contact RSLog or mutate its `Source Snapshot`.
- A `Log Document` is immutable publication output. The package is not required to keep a history of old `Log Document`s.
- `Source Data` and `Presentation Override`s remain distinguishable. A serialization that flattens an override into source truth is invalid even if its drawing is visually correct.
- `Diagnostic`s are domain findings. Parser exceptions and filesystem logs are implementation evidence and must not be mislabeled as domain `Diagnostic`s until classified.

These are already-set product semantics, not conclusions of the container research.

## Evidence baseline

### JSON and schema

JSON is standardized as a portable textual interchange format by IETF RFC 8259 (December 2017). RFC 8259 says object member names **should** be unique but documents unpredictable receiver behavior when they are not; implementations may keep the last value, fail, or expose all duplicates. It also permits numbers beyond the interoperable exact range of common IEEE-754 binary64 implementations. [RFC 8259 §§4 and 6](https://www.rfc-editor.org/rfc/rfc8259.html#section-4)

I-JSON tightens that baseline: UTF-8 is required, duplicate member names are forbidden, and integers outside `[-(2^53)+1, (2^53)-1]` cannot be assumed exact and should be carried as strings when exact interchange matters. [RFC 7493 §§2.1–2.3](https://www.rfc-editor.org/rfc/rfc7493.html#section-2)

JSON Schema Draft 2020-12, published 2022-06-16, defines structural validation vocabularies. Its default handling of `format` is annotation rather than an assertion, so a validator configuration must explicitly enable the format-assertion vocabulary or supply equivalent semantic validators if RSrender intends values such as UUIDs and dates to be enforced. Unknown schema keywords are annotations unless a required vocabulary says otherwise. [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12) and [validation specification §§6–7](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01.html)

RFC 8785 defines the JSON Canonicalization Scheme (JCS): no insignificant whitespace, deterministic property sorting, ECMAScript-compatible primitive serialization, and UTF-8 output. It requires I-JSON-compatible input and explicitly warns that input must still receive ecosystem-specific sanity and correctness checks. JCS makes a JSON value hashable; it does not make that value valid for RSrender. [RFC 8785 §§3–5](https://www.rfc-editor.org/rfc/rfc8785.html#section-3)

**Inference:** A safe JSON pipeline is therefore `bounded byte read → strict UTF-8 and duplicate-key parser → structural schema → semantic/domain validation → migration → current semantic validation`. Ordinary `JSON.parse` cannot be the first and only validation boundary because the duplicate-key evidence is already lost by then.

### ZIP and packaged parts

PKWARE maintains the cross-platform ZIP Application Note. Its archive page lists APPNOTE 6.3.10 as the most recent archived final version visible during this research. ZIP is a general aggregate/compression container with optional features; it does not define an RSrender part graph, semantic schema, safe extraction policy, or deterministic authoring profile. PKWARE also states that some ZIP technology is patented or patent-pending and that the broad free license grant in earlier APPNOTE publications was discontinued, so a commercial product must choose only needed features and review the implementing library and feature set rather than treating every APPNOTE option as automatically cleared. [PKWARE APPNOTE publication page and licensing notice](https://support.pkware.com/pkzip/appnote) and [APPNOTE archive](https://support.pkware.com/pkzip/application-note-archives)

Archive reproducibility is not automatic. Archive metadata can include timestamps, permissions, extra fields, and filesystem-dependent entry order; ZIP may carry additional timestamps in extra attributes. Reproducible Builds recommends normalized timestamps, stable file order, and removal/normalization of unnecessary extra metadata. [Reproducible Builds: archive metadata](https://reproducible-builds.org/docs/archives/) and [timestamps](https://reproducible-builds.org/docs/timestamps/)

**Inference:** If ZIP survives #20, RSrender needs a narrow ZIP profile, not “whatever the library writes”: permitted compression methods, UTF-8 entry names, sorted normalized names, fixed metadata, no encryption at the ZIP layer, no links, no executable semantics, one occurrence of every normalized name, and explicit compressed/uncompressed limits.

### Open Packaging Conventions

ECMA-376 Part 2, Open Packaging Conventions, 5th edition (December 2021), standardizes a ZIP-based document package model with named parts, content types, and relationships. It is a mature way to make relationships explicit, but adopting it would bring XML relationship/content-type machinery in addition to RSrender’s JSON domain schema. [ECMA-376 standard page](https://ecma-international.org/publications-and-standards/standards/ecma-376/)

**Inference:** OPC is worth a bounded spike because it addresses part identity and relationships, but not because RSrender needs Office compatibility. If the same invariants are clearer with a small JSON manifest, OPC’s extra formats and implementation surface are a cost without product value.

### SQLite as an application file

SQLite explicitly positions a database as an application file format. Its official guidance highlights a stable, cross-platform single-file format, an application ID in the database header, atomic transactions, incremental updates, schema extension, and access through common SQLite tools. It also notes that small BLOBs and structured relationships can be efficient in one file. [SQLite as an Application File Format](https://www.sqlite.org/appfileformat.html)

Those guarantees are conditional on the storage stack. SQLite’s atomic-commit documentation describes filesystem and operating-system assumptions. Its network-filesystem guidance warns that synchronization and locking behavior varies, that successful early testing is not proof, and that remote database use can corrupt the database; WAL additionally requires clients on the same host. [SQLite atomic commit](https://www.sqlite.org/atomiccommit.html), [SQLite over a network](https://www.sqlite.org/useovernet.html), and [WAL limitations](https://www.sqlite.org/wal.html#overview)

SQLite deliverable code and documentation are dedicated to the public domain; the project also offers a paid Warranty of Title for organizations that require it. That is favorable for later commercialization, but a Node native binding would have its own license, binary update, ABI, and supply-chain review. [SQLite copyright](https://www.sqlite.org/copyright.html)

### Identifiers and hashes

RFC 9562 (May 2024) defines 128-bit UUIDs, including random UUIDv4 and time-ordered UUIDv7. It recommends UUIDv7 over v1/v6 where time-ordered identifiers are desired. [RFC 9562 §§4–6](https://www.rfc-editor.org/rfc/rfc9562.html)

NIST FIPS 180-4 defines SHA-256 and other Secure Hash Standard algorithms for message digests intended to detect changed messages. NIST announced that FIPS 180-4 will be revised, so the package should name its algorithm rather than hard-code an unnamed “checksum.” [NIST FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)

**Inference:** Stable domain identity and content identity are different:

- `templateId`/`projectId` identifies the conceptual artifact across saves and migrations.
- `packageRevisionId` identifies one saved revision if revision-aware conflict detection is adopted.
- `contentDigest` identifies exact normalized content and changes when meaningful bytes change.
- an asset digest identifies one immutable asset payload and permits safe de-duplication.

Copying a `Log Template` as “Save As new template” needs a product rule about whether it forks to a new `templateId`; byte hashing cannot answer that product question.

### Windows filenames and replacement

Windows file APIs have reserved characters and device names, normally compare names without case sensitivity, interpret `.` and `..` as path components, and discourage trailing spaces or periods. NTFS can enable case-sensitive directories, but that is not the default and must not be assumed. [Microsoft: Naming Files, Paths, and Namespaces, updated 2024-08-28](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)

Windows `ReplaceFile` can replace an existing file while optionally preserving a backup and preserves several original-file attributes. `MoveFileEx` can replace an existing target, but cross-volume movement may become copy/delete and has different security-descriptor behavior. [Microsoft: Moving and Replacing Files, updated 2022-06-14](https://learn.microsoft.com/en-us/windows/win32/fileio/moving-and-replacing-files) and [`MoveFileExW`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw)

Node’s current filesystem documentation (v26.5.1 when researched; Electron #12 must pin the Node version it embeds) says `writeFile` is a series of writes, concurrent calls without waiting are unsafe, and `flush: true` calls `fs.fsync()` after successful writing. It does not promise that `writeFile` plus `rename` is a durable, cross-filesystem transaction. [Node.js `fs` documentation](https://nodejs.org/api/fs.html#fswritefilefile-data-options-callback)

**Inference:** #20 must test the actual Electron-embedded Node version and Windows API path. The production save contract cannot claim “atomic” merely because it writes a temporary file and calls `rename`.

### Font embedding

OpenType 1.9.1 defines `OS/2.fsType` as font-embedding licensing rights. Values distinguish installable, restricted, preview/print, and editable embedding; flags can also prohibit subsetting or allow bitmap embedding only. The specification says applications must not embed fonts that are not licensed to permit it and must honor the recorded restrictions. [OpenType 1.9.1 `OS/2.fsType`](https://learn.microsoft.com/en-us/typography/opentype/spec/os2#fstype)

Microsoft’s Windows font FAQ says Windows-supplied fonts generally may not be redistributed, while document embedding is permitted only when the application follows OpenType/TrueType restrictions. Preview/print fonts require the document to be read-only when used remotely, and embedding rights do not authorize bundling the font into an application. [Microsoft Font Redistribution FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq)

**Inference:** An editable `Log Template` is closer to an editable document than to a final PDF. A preview/print-only font cannot silently be embedded into an editable template. The prototype must distinguish template embedding, transient rendering, PDF embedding/subsetting, and shipping an app-bundled font; each is a separate licensed act.

## Candidate logical package contract

The following is a **container-neutral prototype vocabulary**, not a committed format or filename layout.

| Logical part | Required in `Log Template` | Required in `Log Project` | Purpose |
|---|---:|---:|---|
| package header/manifest | yes | yes | kind, format identifier, schema version, minimum reader, stable ID, package revision, part inventory, hashes, feature declarations |
| current domain payload | yes | yes | complete current semantic model, excluding derived caches |
| `Example Dataset` | yes | included through each Embedded Template Representation | offline design and data-dependent evaluation |
| `Source Snapshot` | no | yes for a populated project | accepted source-normalized facts, collection outcomes, provenance, and freshness; input to the derived `Render Dataset` |
| `Supplemental Source` | no | when deliberately attached and accepted | distinct provenance-bearing project input used with the Source Snapshot to derive the Render Dataset; never folded into source truth |
| `Embedded Template Representation` | n/a | yes for every effective `Template Assignment` | exact current working template material retained for offline editing and publication continuity; used when the library template is missing or changed; never revision history |
| `Presentation Override`s | no | when present | project-local display changes kept distinct from `Source Snapshot` |
| binary assets | when referenced | transitive closure of effective templates plus project-local annotations | pictures, licensed embeddable fonts, hatch/graphic resources |
| human support summary | yes | yes | bounded, non-authoritative metadata readable without rendering the full model |
| optional provenance/audit metadata | optional | optional | creation tool/version, migration provenance, source/template fingerprints; never credentials |
| derived preview/cache | optional, explicitly non-authoritative | optional, explicitly non-authoritative | thumbnails or measured-layout caches that can be deleted and regenerated |

The manifest must distinguish **authoritative** parts from **derived** parts. A missing or invalid authoritative part blocks editing/export with an error `Diagnostic`; a missing derived preview must only trigger regeneration.

## Proposed invariants

These invariants should be treated as acceptance hypotheses for #20.

### I-01 — Kind and version are explicit before deep parsing

Every file declares, in a bounded header or first manifest part:

- a fixed RSrender format identifier;
- `packageKind` (`log-template` or `log-project`);
- an integer schema/format version;
- the minimum reader version or required-feature set;
- a stable package ID; and
- enough part-size metadata to reject obviously impossible input before allocation.

File extensions are UX hints, not trust boundaries. The reader checks magic/container structure and the manifest kind.

### I-02 — No ambient external dependencies

A valid self-contained package has no path or URL that must be dereferenced to edit, render, or export its current state. External provenance may be recorded as inert text, but opening does not fetch it. A `Refresh` is a separate user action through a `Source Adapter`.

For a `Log Template`, the `Example Dataset` and every required non-font asset are embedded. For a `Log Project`, the `Source Snapshot`, accepted Supplemental Sources, Embedded Template Representations, `Presentation Override`s, and all required assets are embedded.

### I-03 — Source truth and presentation remain separable

The `Source Snapshot` serializes the accepted source-normalized records, collection outcomes, provenance, and freshness needed to derive a versioned `Render Dataset`. Supplemental Sources serialize separately with their own provenance and freshness. `Display Value Override`s reference a stable target identity and retain the replacement separately from the original value, and `Freeform Annotation`s remain separate records. A migration may not collapse a Supplemental Source or Presentation Override into Source Data or the Source Snapshot.

### I-04 — Stable identity is not a filename or display name

Every `Log Template`, `Log Project`, element, template component, named style, Embedded Template Representation, and override target that can be referenced across saves has a stable identifier. Display names are editable labels. Filenames can change. Content hashes can change. None replaces the stable ID.

UUIDv4 and UUIDv7 are both standards-based candidates. UUIDv7’s embedded time ordering may leak creation timing and implies ordering semantics; UUIDv4 avoids that but has no natural creation order. #20 need not benchmark either, but the product specification must choose and document one generation policy before implementation.

### I-05 — Content address is algorithm-qualified

Every part inventory entry uses an algorithm-qualified digest such as `sha256:<lowercase-hex>`, calculated over the exact stored uncompressed bytes or over a named canonical representation. The contract must state which. Digests are verified before a part is trusted.

The top-level package digest, if exposed, is computed over a canonical logical manifest that excludes its own digest field. A hash mismatch is an integrity error, not an invitation to “repair” silently.

### I-06 — Deterministic output is semantic, then byte-level

Given identical current semantic content, asset bytes, format version, and declared package options, two saves should produce:

1. identical canonical authoritative JSON parts; and, if the chosen envelope permits it,
2. byte-identical package files.

Creation/modification timestamps and package revision IDs are meaningful state and would deliberately break byte identity. The contract must either exclude volatile values from authoritative content, carry them in a non-hashed support part, or define a “semantic digest” separately. A new random revision ID on every serialization defeats deterministic-package tests and should not be added without a concrete conflict-detection use.

For a ZIP candidate, deterministic authoring requires at least sorted normalized entry names, fixed timestamps, fixed compression method/level/version, fixed platform/permissions fields, no optional extras, and canonical JSON. These are RSrender profile rules, not ZIP guarantees.

### I-07 — Package paths are a closed portable namespace

Logical part names use forward slashes, UTF-8, no leading slash, no drive/UNC prefix, no empty component, no `.`/`..`, no NUL/control characters, no colon or backslash, no trailing dot/space, and no Windows reserved device-name component. They are normalized by one specified Unicode/case algorithm before uniqueness checks.

The prototype should choose either ASCII-only machine-generated part names or a precisely defined Unicode normalization form. ASCII IDs plus original human names in JSON are the safer baseline because they avoid locale and normalization ambiguity without limiting user-facing labels.

No two entries may collide after slash normalization, percent/escape decoding where relevant, Unicode normalization, or invariant case folding. There are no symlink, junction, hard-link, alternate-data-stream, or device entries.

### I-08 — Parse without extraction where possible

Package readers address parts by normalized manifest identity and stream them into bounded memory or an app-owned fresh temporary directory. They never extract to a user-selected destination and never use an archive entry path directly as a filesystem path. If temporary files are required for a decoder, they receive app-generated names and are deleted through a controlled cleanup path.

### I-09 — Every resource has independent and aggregate bounds

Limits are declared and enforced before and during reading:

- maximum package bytes;
- maximum entry count;
- maximum manifest and JSON-part bytes;
- maximum compressed and declared/uncompressed bytes per entry;
- maximum aggregate expanded bytes;
- maximum compression ratio;
- maximum JSON depth, object properties, arrays, strings, and numeric token length;
- maximum image dimensions/pixels and decoded bytes;
- maximum font count/bytes and table sizes;
- maximum explorations, elements, and domain records; and
- maximum migration work/time.

Limit values remain a prototype output because realistic RSLog Source Snapshots and professional raster assets must be measured. Failure is a classified, non-silent `Diagnostic` or safe open failure, never process exhaustion.

### I-10 — Assets are immutable-by-digest

References point to asset IDs and digests, not paths. An asset record declares media type, byte length, digest, original human filename (display only), and license/provenance metadata where required. Decoders verify actual signatures and bounded dimensions rather than trusting extension or declared media type.

Identical assets may share bytes by digest within one package. De-duplication across packages is optional and cannot become a hidden external dependency.

### I-11 — Fonts have a validity state

Each font use resolves to one of:

- an embedded font whose license and `fsType` permit editing in a `Log Template`/`Log Project`;
- an app-bundled font with an approved redistribution license and stable asset digest;
- a system font reference that makes visual portability conditional and produces an explicit missing/substitution `Diagnostic`; or
- a prohibited/unresolved font that blocks portable save/export until replaced or licensing is resolved.

The package records the font face identity and digest actually used for measurement. Silent substitution is forbidden because it can create text overflow and change pagination.

### I-12 — One writer owns a user file

Within one RSrender process, saves to the same normalized target are serialized. Across windows/processes, a saved baseline fingerprint (target file identity, size, modification evidence, and content digest/revision) is compared immediately before replacement. An unexpected external change becomes a conflict requiring Save As or an explicit choice; last-writer-wins is not silent.

### I-13 — Save never mutates the only good copy

The candidate save pipeline is:

1. serialize to a sibling temporary candidate on the same volume;
2. close and flush it using the chosen platform/runtime primitive;
3. reopen and fully validate the candidate, including hashes;
4. replace the target using a platform operation whose behavior was proven for the target class;
5. retain or rotate a bounded backup/recovery artifact; and
6. report the exact durable/uncertain outcome.

A failure before replacement leaves the target unchanged. A failure with uncertain replacement outcome causes RSrender to preserve candidate and backup and tell the user where recovery is available. Network shares, sync folders, removable media, FAT/exFAT, permissions, antivirus locks, and low-disk conditions are separate target classes until tested.

### I-14 — Recovery is not the document history

Autosave/recovery candidates live in an app-owned recovery area, keyed by stable project/template ID and base content digest. They are bounded by age/count/size and never overwrite the user file automatically. On launch, RSrender offers candidates only when they are newer or divergent from the last durable save and lets the user inspect/open them as a separate recovered document.

Recovery retention is an organization-policy unknown because `Source Snapshot`s may contain client data. Recovery never contains RSLog credentials. Deleting recovery after a confirmed durable save is acceptable; maintaining long-term version history is not a current product requirement.

### I-15 — Opening is side-effect free

Opening an old, new, or malformed package does not replace it, contact a source, install a font, write next to it, or change its modification time. Migration happens in memory or in app-owned temporary storage. The document becomes dirty only when the user accepts a migrated working state or makes an edit; the original remains available.

### I-16 — Migrations are explicit and sequential

The reader dispatches by exact declared format version. Supported old versions migrate through tested one-step functions (`v1 → v2 → … → current`), each with pre/post schema and semantic validation. A direct “best effort” parse into the newest model is forbidden because it cannot prove which meanings changed.

Each migration is deterministic, idempotent at its boundary, records its source/target version in temporary provenance, and has fixture-based golden tests. If any step loses a behavior that affects rendering, data truth, `Presentation Override`s, or identifiers, it requires an explicit product decision and user-facing migration note before implementation.

### I-17 — Newer and unknown content fails by policy, not accident

The manifest distinguishes:

- **unknown package version/required feature:** refuse edit and export; allow bounded metadata inspection only;
- **known version with unknown critical field/part:** refuse;
- **unknown namespaced optional extension declared non-critical:** either preserve byte-for-byte without interpretation or refuse, according to the final extension policy;
- **unknown field in a closed core object:** refuse rather than drop; and
- **unknown derived part not referenced by authoritative content:** may ignore only if the manifest marks it non-critical and its resource limits pass.

JSON Schema 2020-12’s unknown-keyword behavior is about schema vocabularies, not RSrender document compatibility. RSrender must define its own field/extension policy.

### I-18 — Downgrade is Save As with declared loss, or unavailable

No in-place down-migration is presumed. If a future product supports saving to an older version, it operates on a copy, enumerates every unsupported feature/data loss, requires confirmation, and reopens/validates the result with the old reader fixture. Otherwise the UI says that older-version export is unavailable.

Rolling back the application does not imply that an older application can read files saved by a newer one. The package header’s minimum reader/feature declaration and migration backup are therefore prerequisites for a reliable software rollback story.

### I-19 — Effective template fallback is exact and visible

A `Log Project` records each `Template Assignment` as:

- stable `templateId`;
- the content digest/revision observed when assigned or last deliberately updated;
- a human display name for support;
- the Embedded Template Representation required to render; and
- the scope and precedence of the assignment.

If the current template library has no matching ID, the project uses its Embedded Template Representation and raises a non-blocking “library template unavailable” `Diagnostic`. If the same ID has a different digest, the project continues with its Embedded Template Representation and offers a deliberate comparison/update action. It never substitutes by name or silently adopts the newer bytes.

The embedded representation is **not template history**: it contains only what the current project needs. Saving changes back to the library template or as a separate template remains an explicit user action. Prior `Log Document`s and prior template versions are not accumulated.

### I-20 — No executable content or credentials

Packages contain declarative data and inert assets only. They cannot contain JavaScript, Electron preload code, native modules, command lines, active HTML, remote CSS/fonts, macros, or plugins. Dynamic text is a bounded expression/data-binding language defined by RSrender, not `eval`.

RSLog access/refresh tokens, passwords, machine paths, autosave locations, recent-file lists, and application telemetry do not belong in a `Log Template` or `Log Project`. A `Source Snapshot` carries source provenance but no authentication material.

## Physical container decision matrix

Scores are directional hypotheses (`++`, `+`, `0`, `-`, `--`) for #20, not an architecture decision.

| Candidate | Self-contained / assets | Human support & diff | Save/recovery | Hostile-input surface | Migration ergonomics | Commercialization | Prototype posture |
|---|---|---|---|---|---|---|---|
| Pretty single-file I-JSON with base64 assets | `+`; one file but binary bloat | `++` for small files; poor with large snapshots/base64 | `-`; whole-file rewrite, external replace needed | `+`; no archive traversal, still parser/asset bombs | `+`; explicit schemas | `+`; standards and MIT validators available | Keep as control and tiny-template candidate |
| Constrained ZIP + canonical JSON parts | `++`; natural discrete assets | `+`; unzip and inspect, JSON diffable | `0`; whole archive candidate/replacement, backups straightforward | `--` unless strongly profiled; archive, path, compression, duplicate-entry risks | `++`; parts and versions explicit | `0/+`; common permissive libraries exist, but APPNOTE feature/licensing review required | Primary prototype candidate |
| OPC package profile | `++` | `0`; standard tools exist, relationships are XML | `0` | `-`; still ZIP plus XML/relationship parsing | `+`; explicit parts and relationships | `0`; standard/license and library review | Short spike only; retain only if it removes custom complexity |
| SQLite application file | `++`; BLOBs and relations | `0`; SQLite tools help, ordinary text diff does not | `++` locally through transactions; network caveat | `-`; untrusted database parser plus query/schema surface, but no extraction paths | `++`; schema/user-version and transactional migrations | `++` for SQLite core public-domain; native binding still reviewed | Primary prototype candidate |
| Directory bundle | `+`; self-contained only as a directory | `++`; best support/diff | `--`; no atomic multi-file replace, users/sync tools can create partial state | `0`; paths still matter, no compression bombs | `+` | `+` | Debug/export oracle, not default user artifact |
| ZIP containing SQLite | `++` | `--` | `--`; must rewrite ZIP and loses SQLite incremental benefit | `--`; both parsers/surfaces | `+` | `0` | Exclude unless another test proves a unique need |

### Plain JSON

Plain JSON is the easiest representation to explain and test. It is a strong option for very small `Log Template`s and an indispensable golden/debug representation. It becomes unattractive when a `Log Project` carries raster assets, fonts, and a large `Source Snapshot`: base64 expands binary content and makes diffs noisy; reading/writing one DOM can spike memory; and any edit rewrites the whole file.

The prototype should include it because it gives a container-independent semantic oracle. If the same model serializes differently between the plain representation and the package manifest, the logical contract is underspecified.

### Constrained ZIP

ZIP aligns with how users expect an editable, asset-bearing document to move as one file. Parts remain independently inspectable and hashable. The risk is that a general ZIP reader supports much more than RSrender needs. The reader must treat both local headers and central-directory metadata as hostile, avoid filesystem extraction, and enforce limits during streaming rather than after allocation.

Only Store and a single widely implemented Deflate method should be considered in the first prototype. Encryption, split/spanned archives, self-extracting behavior, central-directory encryption, exotic methods, and vendor extras add no current product value. The exact allowed subset and library license are prototype outputs.

### OPC

OPC offers standardized part naming, content types, and relationship records. Its cost is an additional XML and relationship model beside the JSON domain model. RSrender does not currently need compatibility with Office tools. The spike should implement one small template in OPC and the custom ZIP manifest, then compare code volume, validation failures, support workflow, and deterministic bytes. Stop OPC work if it does not remove more custom rules than it adds.

### SQLite

SQLite is compelling when projects are large, updates are frequent, recovery must be transactional, or partial loading materially improves startup. It also gives schema constraints and a well-established integrity checker. But the domain must not become an accidental SQL schema exposed to every UI feature; a logical manifest and stable serialization contract are still needed for portability, tests, and future adapters.

The prototype must test local NTFS and company-realistic network/sync destinations. SQLite’s official network warning prevents assuming that its local ACID behavior carries across SMB/OneDrive-like storage. A design that edits a local working database and publishes a validated snapshot to the user path might mitigate this, but that is a different lifecycle requiring explicit prototype evidence.

### Directory bundle

A directory is excellent for fixtures, support extraction, source control, and comparing canonical parts. It is poor as the commercial user file because partial copies, renamed/missing assets, sync races, and no atomic directory-wide save are easy. Treat it as a diagnostic representation generated from an already validated model, not as an alternative parser path that accepts looser content.

## Serialization and schema options

| Option | Evidence-backed strengths | Risks / unresolved | Posture |
|---|---|---|---|
| I-JSON + JSON Schema 2020-12 | readable, interoperable constraints; schemas can close core objects; canonicalizable with JCS | schema cannot express all referential/domain rules; `format` may be annotation; duplicate-key detection precedes common parsers | Required baseline candidate |
| JSON Type Definition (RFC 8927) | deliberately simple portable type schema | weaker for rich unions/evolution patterns; separate semantic validation still required | Do not add unless JSON Schema tooling proves ambiguous |
| CBOR (RFC 8949) | compact binary, deterministic encoding modes exist | less human-supportable, multiple encodings/extension tags, still needs schema/tool choice | Deferred unless measured JSON size/parse cost fails |
| Protocol Buffers | compact, unknown-field preservation and generated types | binary support burden, maps/order/determinism nuances, awkward arbitrary precision/style models, schema compiler/toolchain | Deferred unless cross-language/MCP requirement becomes immediate |
| SQLite typed tables | constraints, partial reads, transactional migration | domain evolution coupled to SQL; native binding; harder fixtures/diff; network behavior | Container candidate, not replacement for logical contract |

JSON Schema should validate shape and closed-world fields, while a second semantic validator checks at least:

- referential integrity and ownership boundaries;
- unique stable IDs across their scopes;
- valid `Template Assignment` precedence without cycles;
- every asset/font reference and digest;
- finite numeric values and domain unit/range rules;
- geometry and transform bounds;
- `Source Snapshot` version/provenance;
- `Presentation Override` target existence and original-value retention;
- acyclic group/component/style references;
- required template variants and page-region constraints; and
- resource limits that depend on totals rather than one JSON node.

Schemas must be embedded with the application and selected by exact package version. Opening a document never downloads `$ref` schemas from a URI. JSON Schema identifiers are identifiers, not network-fetch instructions.

## Migration and compatibility model

### Version axes

One version number is insufficient if it is expected to mean all of these:

| Axis | Meaning | Changes when |
|---|---|---|
| envelope/profile version | physical container rules | ZIP profile, OPC rules, or SQLite header conventions change |
| domain schema version | serialized semantic model | field meaning/shape changes |
| `Render Dataset` version | source-independent geotechnical contract | source mapped data semantics change |
| expression/binding language version | dynamic text and binding semantics | evaluation behavior changes |
| minimum reader/features | compatibility gate | a package uses behavior old readers cannot preserve |

The prototype may combine axes in one integer initially, but fixtures must prove that the reader can distinguish “container unreadable” from “domain version unsupported.” The final format must not infer compatibility from the application marketing version.

### Recommended prototype policy

This policy is a testable default, not yet an ADR:

1. Exact version dispatch; no heuristic version guessing.
2. Closed core schemas. Optional extensions require a reserved namespace and critical/non-critical declaration.
3. Sequential, pure migration functions with pre/post validation and golden fixtures.
4. Open/migrate without modifying the source file.
5. Preserve the original bytes and surface a migration summary.
6. Save current version only after user action.
7. Unsupported future version opens only a bounded metadata/support view; no edit/export.
8. No down-save until a separately specified loss model exists.

### Forward compatibility alternatives

| Policy | Benefit | Failure mode | Suitability |
|---|---|---|---|
| Strict closed world: reject any unknown field/part | cannot silently lose semantics | minor extensions require a reader release | Strong MVP baseline |
| Preserve unknown optional fields byte-for-byte | newer optional metadata can round-trip | editing parent structures may invalidate unknown meaning; canonicalization becomes harder | Only for explicitly namespaced extension islands |
| Ignore unknown optional fields | easiest | older saves silently delete data/behavior | Reject for editable authoritative content |
| Feature declaration + critical flag | precise compatibility | requires disciplined feature registry and tests | Strong future candidate after MVP vocabulary stabilizes |

### Migration failure states

The implementation specification must distinguish at least:

- unreadable envelope;
- manifest invalid;
- integrity/hash mismatch;
- version unsupported;
- structural schema invalid;
- semantic/domain invalid;
- asset/font invalid or disallowed;
- migration step failed;
- migrated result invalid;
- candidate save failed;
- replacement result uncertain; and
- external-change conflict.

Each state needs a stable error code, safe user message, support detail, recovery action, and export/edit gate. Raw parser stack traces are not user `Diagnostic`s and must not include sensitive Source Data in logs.

## Missing current templates and Embedded Template Representation

The requirement to edit `Log Template`s offline and render a `Log Project` offline from its derived Render Dataset and Embedded Template Representations means a library pointer alone is insufficient. At the same time, the product is not a template-version archive.

The coherent boundary is:

- The template library stores the current user-saved `Log Template` files; it does not retain every historical revision automatically.
- Each `Log Project` embeds exactly the Embedded Template Representations used by its current `Template Assignment`s. This makes the project self-contained and protects deliberate project-local behavior.
- The project records the library `templateId` and digest it last observed. It can compare with a current library file but never requires it.
- Updating a project to a changed library template is a deliberate operation with comparison and diagnostics.
- Editing an Embedded Template Representation affects the project unless the user explicitly chooses Save to Template or Save as Separate Template.
- Exported `Log Document`s are not embedded as a history. If a user needs to reproduce a past issued PDF, they must retain the issued `Log Document` and the corresponding saved project state under the organization’s records policy; RSrender does not silently archive every prior state.

Alternative “pointer only” behavior fails offline edit/render. Alternative “embed all template history” conflicts with the stated no-history scope and creates retention/privacy complexity. Alternative “always resolve latest template by name” can change layout, text overflow, pagination, and publication without an intentional decision and must be rejected.

## Threat cases and required reader response

These are RSrender threat-model cases derived from the container/spec behavior above. They are not claims that a particular library is vulnerable.

| ID | Input / fault | Required response |
|---|---|---|
| PKG-T01 | extension says template but magic/manifest says project | reject kind mismatch; never reinterpret by extension |
| PKG-T02 | duplicate JSON member before schema validation | reject before ordinary object materialization |
| PKG-T03 | invalid UTF-8, lone surrogate, BOM ambiguity | reject under one documented encoding policy |
| PKG-T04 | number outside exact supported range or `NaN`/infinity spelling | reject or require schema-defined decimal/string encoding |
| PKG-T05 | unknown root version or required feature | metadata-only inspection; no edit/export/save-over |
| PKG-T06 | unknown core field | reject; never silently drop |
| PKG-T07 | unknown declared optional extension | preserve exactly or reject according to extension policy; never reinterpret |
| PKG-T08 | missing authoritative part or duplicate normalized part name | reject |
| PKG-T09 | `a/b`, `a\\b`, `A/B`, Unicode-equivalent names collide on Windows normalization | reject all colliding packages |
| PKG-T10 | absolute, UNC, drive-relative, `..`, device-name, ADS-colon, trailing-dot/space entry | reject before any filesystem operation |
| PKG-T11 | symlink/junction/hard-link/special-device archive metadata | reject regardless of target |
| PKG-T12 | central and local ZIP headers disagree | reject; do not choose one opportunistically |
| PKG-T13 | many entries, huge declared size, high compression ratio, nested archive | stop at limits; delete bounded temp; stable error |
| PKG-T14 | stream expands beyond declared or configured limit | abort immediately; no partial open |
| PKG-T15 | valid image header with enormous dimensions or truncated payload | bounded decoder rejects; no renderer crash |
| PKG-T16 | malformed font tables, prohibited `fsType`, or mismatched digest | reject embedding/use and report font-specific outcome |
| PKG-T17 | asset media type/extension disagrees with magic | reject or classify by verified decoder; never execute |
| PKG-T18 | digest mismatch | integrity error; do not auto-rewrite hashes |
| PKG-T19 | cyclic group/component/style/reference graph | semantic validation error |
| PKG-T20 | override targets nonexistent or different exploration/source identity | semantic error or explicit refresh-conflict state; never flatten |
| PKG-T21 | embedded HTML/SVG with scripts/external references | sanitize to a specified inert subset or reject; no network, script, or navigation |
| PKG-T22 | package contains JavaScript/native module/executable | reject as unsupported part even if unreferenced, unless final profile permits inert unknown non-critical bytes |
| PKG-T23 | parser process crashes/hangs | parent times out/terminates it, leaves app/file intact, records redacted support event |
| PKG-T24 | two windows save same baseline | one succeeds; other receives external-change conflict |
| PKG-T25 | disk full during candidate write/flush | old target remains valid; candidate is cleaned or retained for support as policy dictates |
| PKG-T26 | power/process loss before/while/after replace | exactly one of old/new is recoverable; ambiguous state is surfaced, not hidden |
| PKG-T27 | antivirus or sync client holds target | bounded retry/cancel; never truncate original |
| PKG-T28 | save to SMB/sync/removable target with weaker semantics | behavior follows tested target policy; unsupported class gets Save As/local-copy guidance |
| PKG-T29 | migration step throws or produces invalid current model | original untouched; no partially migrated save; actionable version/error code |
| PKG-T30 | newer app saved file, then application is rolled back | older app refuses based on minimum reader/features; backup/current installer path remains available |

## Human supportability and diffability

A commercial document format needs support tooling even if end users never edit it by hand. The format should permit a support command/workflow that:

1. reads only the bounded header and manifest;
2. reports package kind, versions, stable IDs, sizes, feature flags, and hash status;
3. validates every authoritative part without rendering;
4. exports a deterministic, redacted directory representation for comparison;
5. produces a semantic diff keyed by stable IDs rather than raw JSON array offsets; and
6. never includes RSLog credentials or sends client data without explicit user action.

Pretty JSON inside a ZIP and a directory oracle make this relatively simple. SQLite requires an export-to-canonical-JSON support path. The support representation is not accepted as a writable package unless it passes the exact same logical validators; otherwise it becomes an undocumented second format.

Raw byte diffs are useful for deterministic packaging tests but not adequate for users. A semantic diff should separately report:

- template structure/style/binding changes;
- `Template Assignment` changes;
- Source Snapshot changes attributable to a `Refresh`;
- `Presentation Override` changes;
- asset/font changes; and
- format-only migration changes.

## Commercial licensing posture

This section is technical inventory, not legal advice.

- JSON/I-JSON/JCS and UUID are published IETF specifications. Code components taken from RFCs carry the IETF Trust terms; RSrender should implement via reviewed libraries or original code and retain required notices. [IETF Trust Legal Provisions](https://trustee.ietf.org/documents/trust-legal-provisions/)
- JSON Schema is a specification, while validators are separately licensed. Ajv currently advertises Draft 2020-12 support and an MIT license; if used, pin the exact release, review its generated-code mode and security guidance, and include its notice. [Ajv repository and license](https://github.com/ajv-validator/ajv)
- Candidate JavaScript ZIP libraries have different feature and maintenance profiles. For example, `fflate` is MIT-licensed and advertises no dependencies; `zip.js` advertises broad ZIP feature support. Broad support is not inherently desirable for RSrender’s reader, so feature-disable capability and security response matter more than feature count. [fflate repository](https://github.com/101arrowz/fflate) and [zip.js project](https://gildas-lormeau.github.io/zip.js/)
- PKWARE’s APPNOTE page includes a technology/patent licensing caution. Restricting the profile to conventional Store/Deflate is technically sensible, but counsel or an approved dependency review must confirm commercial rights for the exact implementation and enabled features before sale. [PKWARE APPNOTE](https://support.pkware.com/pkzip/appnote)
- SQLite core is public domain, with an optional Warranty of Title. Node/Electron bindings and prebuilt binaries are separate dependencies that require license, provenance, update, and vulnerability review. [SQLite copyright](https://www.sqlite.org/copyright.html)
- OPC’s ECMA standard and any implementation library have separate terms; no requirement currently justifies assuming Office libraries or assets.
- Font bytes are third-party content. `fsType` is evidence of embedding rights but not a complete substitute for the font license. Package metadata should retain the original license/notice or an organization-approved license reference, and the application must reject restricted embedding. [OpenType embedding rules](https://learn.microsoft.com/en-us/typography/opentype/spec/os2#fstype)
- Every shipped parser, image/font decoder, compression library, SQLite binding, and canonicalizer needs an SBOM entry, exact version, source/license URL, notice obligation, and replacement path. This preserves the option to sell RSrender or transfer it to Rocscience.

## Organization and product policy unknowns

These cannot be settled by container research:

| Unknown | Why it matters | Owner / resolution |
|---|---|---|
| Approved maximum project/template size and largest expected Source Snapshot | parser limits, memory, save time | measure real sanitized firm datasets in #20; product owner approves headroom |
| Are projects commonly saved on SMB, SharePoint/OneDrive sync, or removable media? | atomicity, locking, SQLite viability | firm workflow inventory plus target tests |
| Required recovery retention and location | client-data retention and disk use | firm records/security policy |
| Encryption-at-rest requirement | Source Snapshot may contain client/project data | security policy; do not improvise ZIP encryption |
| Template ownership and fork semantics | whether Save As preserves or creates `templateId` | grilling/product decision |
| Extension ecosystem before/after MCP work | forward-compatibility policy and feature registry | product architecture decision after MVP |
| Font acquisition/redistribution policy | whether templates can be fully portable | legal/procurement decision and approved font catalog |
| Backward-support window | how many old format fixtures/migrators must ship | commercial support policy |
| Whether issued-work reproduction is a records requirement | package history and retention scope | firm QA/records policy; current statement says no automatic old-figure archive |
| Digital signatures/authenticity | hashes alone do not authenticate sender | security/product decision; separate from corruption detection |

## Bounded prototype plan for ticket #20

### Goal

Choose a physical envelope and migration/save policy using measured evidence while keeping the logical package invariants stable. The prototype is throwaway and must not become application code.

### Candidate implementations

Build the same minimal logical fixture through four adapters:

1. stable pretty-printed I-JSON single file (control, with a separate JCS semantic digest);
2. constrained ZIP + canonical JSON parts;
3. SQLite application file; and
4. deterministic directory oracle.

Implement an OPC micro-spike only through Gate 1 below. Do not build ZIP+SQLite.

The shared fixture must contain:

- one `Log Template` with first/continuation variants, named styles, a component, dynamic bindings, an `Example Dataset`, one raster image, and at least two font states;
- one `Log Project` with three explorations, group- and exploration-level `Template Assignment`s, a realistic `Source Snapshot`, one `Display Value Override`, one `Freeform Annotation`, and two Embedded Template Representations;
- stable IDs, a versioned manifest, hashes, and one derived preview; and
- a redacted support summary.

### Gate 1 — Logical fidelity and support cost

For each adapter:

- round-trip the fixture and compare canonical semantic digests;
- delete/reorder formatting and prove semantic equality;
- generate a readable support inventory and semantic diff;
- measure implementation size/dependencies and number of distinct parsers;
- create identical bytes twice under the deterministic profile; and
- prove a derived preview can be deleted without changing authoritative content.

**Pass:** no semantic loss; stable identifiers survive; Source Snapshot, Supplemental Sources, and Presentation Overrides remain separate; support output identifies a bad part without rendering.  
**Eliminate OPC:** if it adds XML/relationship code and failure modes without reducing custom manifest/validation rules by a material amount agreed before the spike.

### Gate 2 — Scale and resource behavior

Create parameterized fixtures at minimum, typical, large, and adversarial sizes based on sanitized RSAgent/RSLog evidence. Measure:

- open-to-metadata and open-to-editable latency;
- peak main/worker/renderer memory;
- save latency for a one-property edit and a large Source Snapshot replacement;
- package size and compression ratio;
- cancellation responsiveness; and
- whether reads/writes can be streamed without trusting declared sizes.

**Pass:** final limits can be set with measured firm headroom; malformed/over-limit cases terminate within bounded time and memory; no renderer or main-process crash. Numeric thresholds are a prototype deliverable, not guessed here.

### Gate 3 — Hostile corpus

Create and retain fixtures for every PKG-T01 through PKG-T23 case, including:

- duplicate JSON keys and invalid Unicode;
- traversal through `/`, `\\`, drive, UNC, encoded separators, dot segments, reserved names, trailing dots/spaces, and Unicode/case collisions;
- duplicate ZIP names and local/central header disagreement;
- link/special entries;
- nested and high-ratio archives, false sizes, too many entries, and stream overrun;
- malformed/truncated PNG, JPEG, SVG, and OpenType assets;
- unsupported versions/features and unknown critical/optional fields;
- hash mismatch and cyclic references; and
- parser hang/crash injection.

Run parsing outside the renderer/main privilege boundary selected by ticket #12. Capture CPU, memory, temp-file containment, cleanup, stable error code, and whether the original remains byte-identical.

**Pass:** every case has one expected non-silent outcome; no file is written outside the app-owned temporary root; no network/process execution occurs; one hostile file cannot terminate or permanently wedge the app.

### Gate 4 — Save, replacement, and concurrency fault matrix

Run the same scripted save against:

- local NTFS;
- a company-realistic SMB share;
- the company’s actual sync-folder product if used;
- removable/exFAT if supported; and
- read-only/no-space/quota-limited destinations.

Inject termination at every boundary: before candidate create, during write, before/after flush, during validation, immediately before replace, during replace if tooling permits, and after replace before acknowledgment. Also hold the target with another process, change it externally, and save concurrently from two windows.

For ZIP/plain adapters, test sibling temp + validated replacement + backup. For SQLite, test rollback journal and WAL only where officially supported, `integrity_check`, local working-copy/publish if considered, and recovery after abrupt termination.

**Pass:** old or new content remains recoverable in every supported target class; no zero-byte/truncated target; conflicts are detected; uncertain durability is reported. Any target class that cannot pass becomes explicitly unsupported or uses a proven local-work/publish workflow.

### Gate 5 — Migration matrix

Define synthetic `v1`, `v2`, and current fixtures containing a meaning-changing migration, an ID-introduction migration, and an asset-layout migration. Test:

- every one-step and chained forward migration;
- repeatability and idempotence;
- original bytes unchanged on open and on migration failure;
- current Save As followed by reopen;
- unsupported future version and required feature;
- unknown optional extension preservation/rejection;
- app rollback reading a current file; and
- a project whose library template is missing or has the same ID with a different digest.

**Pass:** golden canonical output for every path; no skipped step; no silent field/extension loss; original and migration backup remain available; missing/changed template uses the Embedded Template Representation with the specified `Diagnostic`.

### Gate 6 — Fonts and assets

Use at least:

- an approved editable/installable-embedding font;
- a preview/print-only font;
- a restricted font;
- a missing system font;
- a font with malformed tables or inconsistent flags;
- a large raster and decompression-bomb image; and
- an SVG with script and external references.

Verify template edit, offline reopen, PDF export, missing-font measurement/overflow behavior, license metadata, and cleanup of any temporary font use.

**Pass:** prohibited embedding cannot be saved silently; exact font bytes/digest used for measurement are known; missing/substituted font always creates an actionable `Diagnostic`; no active SVG behavior or external fetch occurs.

### Gate 7 — Library and commercialization review

For each surviving adapter, record:

- exact library/version and release date;
- supported/disabled container features;
- license and notice text;
- transitive dependencies and native binaries;
- vulnerability/security-reporting channel and maintenance activity;
- Electron/Node compatibility;
- deterministic output controls;
- streaming/limit APIs; and
- feasibility of replacing the library without changing the logical package contract.

Legal/procurement reviews the ZIP feature subset and fonts. Security reviews parser isolation and source-data retention. Commercialization fails the gate if a required dependency cannot be redistributed to a future buyer/licensee on acceptable terms.

### Decision scorecard

Record measured values, then weight them before seeing winners:

| Criterion | Suggested weight | Required evidence |
|---|---:|---|
| lossless domain fidelity / migration clarity | 25% | Gate 1 and 5 golden fixtures |
| hostile-input containment | 20% | Gate 3 corpus |
| save/recovery reliability on actual destinations | 20% | Gate 4 fault matrix |
| human supportability/diffability | 10% | support inventory and semantic diff exercise |
| scale/performance | 10% | Gate 2 measurements |
| licensing/transferability | 10% | Gate 7 inventory and review |
| implementation/dependency complexity | 5% | adapter code and dependency count |

No candidate may win on weighted score if it fails a hard gate: source/override separation, hostile path containment, original-file preservation, unsupported-version refusal, offline effective-template rendering, or commercial redistribution review.

### Prototype deliverables

Ticket #20 should produce only decision evidence:

- logical contract revision and invariant results;
- adapter comparison and raw benchmark/fault results;
- malicious and migration fixture corpus;
- save/durability findings by storage class;
- license/SBOM comparison;
- numeric package/resource limits with rationale;
- explicit rejected options;
- recommended envelope and fallback;
- migration/forward-compatibility policy recommendation; and
- ADR candidates for later approval.

It must not become production persistence code.

## Decision frontier after this research

### Evidence-supported direction

- Use a manifest-driven, self-contained logical package with strict I-JSON/JSON Schema plus semantic validation.
- Keep stable IDs, content digests, and package revisions conceptually separate.
- Keep authoritative content separate from derived previews/caches.
- Embed each current Embedded Template Representation in a `Log Project`, not an unbounded template/output history.
- Default to closed core schemas and explicit sequential forward migrations.
- Prototype constrained ZIP and SQLite; keep plain JSON/directory as oracles.
- Treat font embedding and target-storage behavior as validity/compatibility concerns, not polish.

### Still unresolved by design

- physical envelope and library;
- exact schema/version-axis layout;
- UUID generation/fork policy;
- critical/optional extension mechanism;
- deterministic-byte versus deterministic-semantic scope;
- numeric resource limits;
- save support on SMB/sync/removable media;
- recovery retention and encryption policy;
- approved portable font strategy; and
- backward-support/downgrade window.

Those items now have bounded evidence paths in ticket #20 or named policy owners. Selecting them here would exceed the evidence.
