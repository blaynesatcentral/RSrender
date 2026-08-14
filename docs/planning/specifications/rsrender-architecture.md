# RSrender v0.9 architecture specification

**Status:** Decision-complete architecture contract for GitHub #24; implementation and release evidence remain gated as identified below  
**Evidence cut:** 2026-08-14  
**Scope:** Electron process topology, component ownership, typed application boundary, renderer-neutral layout, source integration, package persistence, recovery seams, fonts/assets, PDF publication, security, testing, and post-MVP agentic seam  
**Not in scope:** Application implementation, visual branding, vendor-write behavior, final installer choice, release certification, or claims that open validation tickets have passed

## 1. Outcome and authority

RSrender v0.9 is a Windows-first TypeScript/Electron desktop application with a renderer-independent application and document authority. The Electron main process owns lifecycle, document truth, capabilities, file and source access, and publication authority. Sandboxed renderers project state and collect intent. Transient pure-JavaScript utility processes perform bounded parsing, serialization, migration, and compute-heavy pure jobs. A sandboxed Chromium Layout Host is the one text-measurement authority and the projection used by Electron `webContents.printToPDF`; it does not own document state or independently paginate content.

The architecture implements the canonical terms in [CONTEXT.md](../../../CONTEXT.md), the aggregate boundaries in the [boring-log domain model](boring-log-domain-model.md), and the command semantics in the [Layout Studio UX specification](layout-studio-ux-specification.md). It does not introduce synonyms for `Source Snapshot Candidate`, `Source Snapshot`, `Render Dataset`, `Authoritative File`, `Recovery Candidate`, `Embedded Template Representation`, `Presentation Override`, `Key Element`, or `Diagnostic`.

The following accepted decisions are normative inputs:

- renderer-independent lifecycle and verified replacement ([ADR 0001](../../adr/0001-renderer-independent-lifecycle-and-verified-save.md));
- layered document ownership and per-target storage commit authority ([ADR 0002](../../adr/0002-layer-document-ownership-and-storage-commit-authority.md));
- constrained ZIP packages behind an owned validation boundary ([ADR 0003](../../adr/0003-constrained-zip-document-package.md));
- session-only RSLog authentication ([ADR 0004](../../adr/0004-session-only-rslog-authentication.md));
- source-only Refresh candidates and separate Render Dataset assembly ([ADR 0005](../../adr/0005-source-snapshot-acceptance-boundary.md)); and
- local fixed NTFS as the only v0.9 authoritative working-file class ([ADR 0006](../../adr/0006-local-fixed-ntfs-authoritative-storage.md));
- one Chromium layout authority with resolved DOM/SVG screen and PDF projections ([ADR 0007](../../adr/0007-single-chromium-layout-authority-and-resolved-projections.md)); and
- a main-owned Application Core with sandboxed renderers/Layout Host and transient pure-JavaScript utilities ([ADR 0008](../../adr/0008-main-owned-application-core-and-least-capable-electron-topology.md)).

Prototype results select this direction but are not production test passes. In particular, #17 selected pinned Chromium DOM/SVG plus Electron `printToPDF`, #18 selected a renderer-neutral command model with DOM/SVG interaction, #21 selected the source-only adapter boundary, #33 selected constrained ZIP plus `@zip.js/zip.js`, and #37 selected the least-capable pure-JavaScript process topology while leaving packaged crash/rebind and native-decoder containment open ([#17](https://github.com/blaynesatcentral/RSrender/issues/17), [#18](https://github.com/blaynesatcentral/RSrender/issues/18), [#21](https://github.com/blaynesatcentral/RSrender/issues/21), [#33](https://github.com/blaynesatcentral/RSrender/issues/33), [#37](https://github.com/blaynesatcentral/RSrender/issues/37)).

## 2. Non-negotiable architecture invariants

1. A renderer, preload, Layout Host, utility process, PDF job, or future MCP adapter never owns authoritative document state, credentials, paths, or commit authority.
2. Every mutation is a named, runtime-validated application command. All UI routes for the same operation invoke the same command and create the same history boundary.
3. Queries and projections do not mutate. A missed or stale projection is replaced from main-process truth, never reconciled by trusting renderer state.
4. `Source Snapshot Candidate` acceptance, `Source Snapshot` replacement, and `Render Dataset` assembly remain three distinct operations. Supplemental Sources and Presentation Overrides never enter the Snapshot.
5. The renderer-neutral Page Plan and Resolved Page Scene own physical geometry, depth ownership, text source ranges, overflow outcomes, semantic order, and Diagnostics. Preview and PDF never wrap or paginate independently.
6. Package parsing produces one immutable logical candidate or one typed failure. Only the lifecycle/file broker may publish a validated candidate.
7. Document renderers and ordinary application projections never receive credentials, authentication headers, verification codes, tokens, or account indexes. A dedicated short-lived Auth Entry renderer may transiently collect exact user-entered password/verification fields through its one-shot route as specified below; after submission the main credential broker is the sole holder. Secrets never enter document state, packages, recovery, structured logs/annotations, clipboard operations initiated by RSrender, exports, or support evidence. Raw process memory/minidumps remain a separately controlled residual risk, not a redaction claim.
8. Unsupported storage, package versions, source shapes, fonts, assets, or decoders fail explicitly. They are not guessed, flattened, silently substituted, or enabled through a fallback path.
9. Every long-running job has one explicit `JobScope` (`application`, main-issued opaque `intake`, `document`, or `recovery-candidate`), bounded inputs, a cancellation contract, and a result that can affect only its issuing scope. Candidate-declared document identity is untrusted until main validates and deliberately adopts it.
10. Environment-sensitive behavior is a release gate, not an implementation default that an agent may invent.

## 3. Process and trust topology

```text
                         operating system / user
                                  |
                    dialogs and explicit user grants
                                  v
+------------------------------------------------------------------+
| Electron main: Application Core                                  |
| lifecycle | document owners | command/query bus | capabilities   |
| file broker | commit authority | credential/source transport     |
| recovery coordinator | job supervisor | redacted diagnostics     |
+-------------+----------------+----------------+--------------------+
              |                |                |
     one-shot auth IPC   narrow route IPC   measured/print port   job bytes
              |                |                |                    |
              v                v                v                    v
   +----------------+ +------------------+ +----------------+ +---------------------+
   | short-lived    | | sandboxed        | | sandboxed      | | transient Node      |
   | Auth Entry     | | document UI      | | Chromium       | | utility process     |
   | password / 2FA | | DOM/SVG + HTML   | | Layout Host    | | pure-JS parser /    |
   | no projection  | | no Node/network  | | measure/print  | | serializer / compute|
   +----------------+ +------------------+ +----------------+ +---------------------+

Authoritative Files and recovery roots are reachable only through main-owned
opaque grants. RSLog is reachable only through the main credential/transport
broker. No lower-trust component receives a reusable path or post-submission
credential; Auth Entry is the sole transient pre-submission exception.
```

“No lower-trust component receives a credential” means no post-submission credential is projected or returned. The short-lived Auth Entry component shown above is the sole pre-submission exception for the exact user-entered password/verification code and has no reusable credential or other authority.

A separate short-lived sandboxed **Auth Entry** WebContents is created only by the Application Core for sign-in/2FA. It is not a document renderer and has only the one-shot credential-submission/cancel route described below. It is destroyed after completion, cancellation, terminal failure, or crash.

### 3.1 Application Core in the Electron main process

The Application Core is the sole long-lived privileged authority. It owns:

- the application session, window registry, recent-file index, update/quit disposition, and active account context;
- one `DocumentSession` per open Log Project or Log Template, including `DocumentIdentity`, `DocumentOwner`, ownership generation, authoritative immutable model, chronological command history, working revision, durable revision, dirty/conflict/read-only state, and recovery relationships;
- the command registry, runtime validators, query handlers, command availability, revision-tagged projections, and redacted audit/Diagnostic routing;
- user dialogs, path classification, opaque file grants, storage preflight, per-target commit authority, validated replacement, reopen verification, and export destination grants;
- session-only credential state, supported source request allowlists, source transport, refresh state, and credential-free response transfer to a mapper;
- recovery scheduling, classification, review state, and cleanup requests under the accepted recovery policy; and
- creation, supervision, cancellation, timeout, and teardown of Layout Hosts and transient utility jobs.

The main process does not decode untrusted native media, perform arbitrary renderer-requested network calls, execute package content, or use long-running synchronous parsing/layout on its event loop.

Before opening user files or creating ordinary document windows, the packaged application acquires Electron's application single-instance authority. A secondary instance that loses authority may forward only a bounded untrusted activation/open-request envelope (argument count/length, allowlisted flags, opaque OS-origin metadata, and requested path text) to the primary, then exits without parsing, binding, writing, authenticating, or creating recovery state. The primary treats every forwarded value as hostile input, obtains/revalidates any needed path grant through the normal Open intake, and routes the request through the same application command. A primary crash releases application routing authority; restart reacquires it and reclassifies files/recovery rather than trusting a stale marker. This routing prevents competing app owners but is not storage commit authority: ADR 0002's per-document owner generation, target-scoped authority, and inside-authority baseline recheck remain mandatory. Exact packaged forwarding/crash/restart behavior is a #37/#39 qualification gate.

### 3.2 Dedicated Auth Entry renderer

`Begin Sign In` is an `application` command available only from the application/start route. Main creates a fresh in-memory, nonpersistent session partition and a sandboxed Auth Entry WebContents with no document capability, no Node, no network, no navigation, no child frames, no popup/download/permission path, and no application projection subscription. The exact form is packaged application code; it is never remote content.

The Auth Entry preload exposes only `submitPassword`, `submitVerificationCode`, and `cancel`, each bound to an exact authentication-flow state, one-time capability, field allowlist, and byte limit. It does not expose generic `execute`, queries, tokens, account data, source transport, or Electron. Inputs are uncontrolled password/code fields rather than React/store/application state; on submit the preload sends one one-shot message to main, the page clears the fields immediately, and main invalidates that capability whether the submission succeeds or fails. A 2FA continuation receives a new code-only capability. Completion, cancel, terminal failure, navigation attempt, or crash destroys the WebContents and clears its ephemeral partition.

Each submission returns only a stable sanitized flow result: `verificationRequired` with an approved provider label and vendor-supplied masked destination when available, `signedIn`, `recoverableRejected` with safe retry guidance, or `terminalRejected`. A next-step capability remains only in the preload closure. No token, authentication header, raw vendor challenge, unmasked destination, password, or verification code enters page JavaScript or an ordinary application projection.

This boundary minimizes retention but does not promise JavaScript-string or process-memory zeroization. Clipboard paste and OS/browser input services may create operating-system residues outside RSrender's guarantees; RSrender never reads or writes those clipboard values itself. The main credential broker is the sole post-submission holder and never returns password, code, access token, refresh token, cookie, or authentication header to Auth Entry or another renderer.

Packaged qualification tests paste/autofill behavior, DOM/application-state absence after submit, one-shot/replay rejection, flow-state mismatch, size/extra-field rejection, navigation/window/download/permission denial, cancel/crash teardown, partition/storage cleanup, logs/annotations/support bundles, and secret canaries. #37 owns these packaged security/teardown observations; #34/#40 own keyboard and assistive-technology usability. The boundary is selected but has not yet been runtime-proven. Raw dump capture is governed separately in section 11.

### 3.3 Sandboxed document renderer

Each document renderer is a replaceable projection of one `DocumentSession`. Production windows use `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `nodeIntegrationInWorker: false`, `nodeIntegrationInSubFrames: false`, `webviewTag: false`, `allowRunningInsecureContent: false`, `experimentalFeatures: false`, production `devTools: false`, a packaged application origin, restrictive Content Security Policy including `frame-src 'none'`, no child frames, no remote navigation, no popup/download creation, denied permissions, and no renderer network access. These settings and applicable Electron fuses are asserted in packaged qualification, not merely set in source.

Packaged UI uses a configurable neutral custom scheme registered `standard` and `secure`, with only additional scheme privileges proven necessary. It never uses `file://`, never enables `bypassCSP`, and never serves user/package content under the application origin. The protocol serves only exact packaged host/path/method/MIME/header allowlists and rejects traversal, encoded separators, NUL/control characters, query/fragment ambiguity, unknown hosts/routes, and non-GET/HEAD requests unless a route explicitly proves another method. The literal scheme/host names are configurable commercialization identity, not stored document data. External support links are parsed in main against an exact HTTPS host/path allowlist and opened only after a deliberate user command; renderers never receive generic `openExternal`.

The renderer owns only nondurable interaction state: focus, current pane, zoom/pan, hover, open menus, draft property text before commit, pointer preview, and selection where the UX contract defines it as workspace state. The Application Core owns the committed ordered selection, Key Element, and history when those affect command semantics or accessibility announcements. Direct manipulation follows `begin -> preview -> commit/cancel`; preview geometry is nondirty, and commit invokes one named command.

The renderer receives semantic HTML projections for Contents, Properties, dialogs, Jobs, and Recovery Review, plus SVG page-scene projections. A canvas-only control cannot replace those semantic routes. DOM/SVG remains the v0.9 choice unless #30 demonstrates that it cannot meet the accepted workload on minimum hardware.

Electron does not guarantee a distinct OS process for every future build merely because document origins differ. RSrender requests site/process isolation per document and asserts the actual assignment in packaged tests; isolation is never inferred from a development run. The bounded #37 run observed distinct processes once and therefore supports the seam, not the guarantee ([#37](https://github.com/blaynesatcentral/RSrender/issues/37)).

### 3.4 Preload bridge

Each packaged preload exposes command-shaped and query-shaped methods generated for one exact route. Main issues a route-scoped capability bound to window, main frame, origin, route, and a closed command/query allowlist: `application/start`, `auth-entry`, `document`, or `recovery-review`. No route receives a generic application-wide or dummy document capability. The preload does not expose `ipcRenderer`, channel names, Electron objects, filesystem primitives, generic `invoke`, arbitrary URLs/headers, shell execution, environment variables, or raw capabilities.

For each call, main validates the registered channel, main-frame sender, exact application origin and route, route kind, opaque renderer capability, monotonic request sequence, scope-specific identity/revision fields, and the complete payload schema. Document routes additionally require document identity and ownership generation; recovery routes require recovery-review revision/candidate scope; Auth Entry uses the separate one-shot submission contract. Capabilities remain in the isolated preload closure and are rotated on navigation, crash, ownership handoff, route change, document close, or renderer replacement. Stale, replayed, cross-route, cross-tab, child-frame, and cross-document calls receive typed rejection without revealing target state. These finite rejections were observed in the disposable packaged #37 surface; repeatability and crash rebind remain a gate ([#37](https://github.com/blaynesatcentral/RSrender/issues/37)).

### 3.5 Transient pure-JavaScript utility processes

RSrender starts a fresh Electron `utilityProcess` for a bounded package, migration, scene-computation, or other pure-JavaScript job. A utility receives:

- one immutable versioned job DTO;
- only the document/content bytes needed for that job, through a bounded main-brokered source;
- an output byte sink or immutable result port rather than a destination path;
- a minimal explicit environment; and
- cancellation, elapsed-time, input-byte, output-byte, entry-count, decompression, recursion, and memory budgets.

It never receives raw user paths, credentials, source transport, document capabilities, commit authority, or another document's state. It returns one immutable candidate/result or one typed failure. Main validates the result again before it can enter the domain or lifecycle authority. Utilities are per job, not a shared long-lived pool, unless #42 later proves that the accepted workload requires a pool and #37 revalidates the larger authority lifetime.

This is the selected topology for pure JavaScript, not an OS sandbox. The final packaged #37 run timed out both a normal and deliberate-crash utility case. Production must prove packaged success, crash classification, cancellation, restart, and cleanup before release. A Node utility is explicitly rejected as a boundary for hostile native decoding ([#37](https://github.com/blaynesatcentral/RSrender/issues/37)).

### 3.6 Chromium Layout Host

Each active document may have one supervised sandboxed Layout Host. It is a hidden packaged WebContents with the same no-Node, no-network, navigation, permission, CSP, and capability restrictions as a renderer, but it exposes no user bridge. It receives immutable layout inputs from main and returns runtime-validated measurement results or PDF bytes.

The Layout Host is the sole text-measurement authority for a given pinned Electron/font/locale configuration. The renderer may display cached measurements but cannot author them. A host crash invalidates derived layout caches, leaves document truth and dirty state intact, and requires a new host with a new capability. Publication cannot reuse results whose input, engine, font, or scene digest differs.

The host has two modes over the same resolved scene:

- **measure mode** shapes, breaks, and measures text, returning consumed source ranges, line/run ranges, logical and ink bounds, baselines, effective font identities, fit state, and overflow evidence; and
- **publication mode** projects already resolved, non-wrapping lines and fixed geometry into DOM/SVG, verifies the projection digest, and allows main to invoke `webContents.printToPDF`.

Publication mode does not ask CSS to rediscover line breaks or pagination. The #17 calibration showed that a four-point box-model mismatch changed line count, which is why the digest and non-wrapping projection are mandatory ([#17](https://github.com/blaynesatcentral/RSrender/issues/17)).

### 3.7 Scene-computation and measurement route

Page Plan and Resolved Page Scene computation runs as one bounded transient pure-JavaScript utility job; it does not run as unbounded synchronous work in Electron main. Main creates a `TextMeasurementPort` capability scoped to the exact job, document identity, owner generation, input working revision, layout-engine identity, font-catalog digest, locale, and measurement-policy digest. When the utility needs a measurement, it sends a typed request to main; main validates and forwards it to that document's Layout Host, validates the returned source ranges/bounds/font identities/digests, and returns only the validated measurement to the requesting job.

There is no direct utility-to-Layout-Host channel. The utility cannot choose a WebContents, reuse a capability across jobs/documents/revisions, or install an intermediate scene. Main installs the final Page Plan/Resolved Page Scene candidate only when its complete input and measurement-set digests still match current document truth; otherwise it discards the result as stale. Iteration count, request/response bytes, outstanding measurements, elapsed time, memory, and cancellation are bounded by #30/#42 policy. Tiny pure validation/reducer steps may execute in main only under a predeclared event-loop budget verified by #30; exceeding that budget routes the work to a utility rather than silently widening synchronous main work.

## 4. Production module boundaries

Module names below are architectural responsibilities, not permission to merge ownership because a build tool makes that convenient.

| Module | Responsibility | Allowed dependencies | Forbidden responsibility |
|---|---|---|---|
| `contracts` | Versioned command, query, event, job, package, scene, source, and Diagnostic tagged unions plus runtime schemas | Canonical scalar/value types | Electron, filesystem, network, UI, domain mutation |
| `domain` | Log Template/Project aggregates, identities, value states, invariants, pure reducers, undo records | `contracts` value types | Electron, ZIP, DOM, PDF, paths, credentials |
| `application` | Document sessions, command/query handlers, history, jobs, source acceptance, Render Dataset orchestration | `domain`, ports, `contracts` | Direct Electron APIs or vendor DTO leakage |
| `scene` | Pure Page Plan and Resolved Page Scene construction around a `TextMeasurementPort` | `domain` projections, `contracts` | DOM, SVG nodes, Electron, PDF, source transport |
| `package-contract` | Logical package roles, manifest/schema validation, authoritative digest, migrations | `domain` codecs, `contracts` | ZIP calls, file paths, publication |
| `source-contract` | Refresh Plan, transport request vocabulary, vendor mappers, Candidate validation, pure Render Dataset assembler | `domain`, `contracts` | Credentials, arbitrary HTTP, renderer types |
| `platform-electron-main` | Electron adapters, sessions/capabilities, dialogs, file/credential brokers, job supervisor, WebContents lifecycle | application ports | Domain shortcuts, renderer-owned truth |
| `platform-zipjs` | Strict physical ZIP reconnaissance/read/write using exactly locked zip.js | `package-contract`, byte ports | Domain acceptance, extraction, destination paths |
| `layout-host` | Chromium text measurement and resolved DOM/SVG print projection | `scene` contracts | Document mutation, independent pagination, network |
| `renderer-ui` | Semantic workspaces and SVG interaction projection | generated bridge/projections | Node/Electron imports, source/file access, authoritative reducers |
| `test-support` | Synthetic corpus, semantic goldens, fault adapters, contract spies | public ports/contracts | Shipping product behavior or production client data |

Dependency direction is inward: platform and UI adapters depend on application/domain ports; domain and scene code never depend on Electron, zip.js, the browser DOM, RSLog transport, or an MCP protocol.

### 4.1 Runtime component authority and failure seams

| Runtime component | Inputs | Outputs | Privilege / authority | Failure result | Required test seam |
|---|---|---|---|---|---|
| Application Core | Validated UI/MCP command envelopes, OS dialog results, broker/job results, current immutable document revisions | Revision-tagged projections/events, job state, typed command results | Sole document/lifecycle, capability, path-grant, credential, recovery, commit, and publication authority | Preserve authoritative state; emit a typed failure or reconciliation state; never trust a partial child result | In-memory platform ports, deterministic clock/IDs, command journal, capability and revision fault injection |
| Packaged preload | One main-issued route-scoped capability (`application/start`, `auth-entry`, `document`, or `recovery-review`) held only in its isolated closure; allowlisted UI arguments | Only that route's generated command/query/subscription or one-shot auth envelopes | No independent authority; no generic IPC, dummy document scope, path, network, credential retrieval, Electron, or Node surface | Reject locally or return main's redacted typed rejection; capability rotation invalidates prior calls | Hostile payload, replay, stale revision/generation, cross-route/tab/frame/origin, raw-channel and capability-rotation harnesses |
| Auth Entry renderer | Exact user-entered username/password or verification code in one fresh flow state | One-shot bounded auth submission or cancel; no returned secret/token | Transient credential collection only; no document/application projection, persistence, network, source, path, or generic command authority | Clear fields, invalidate capability, destroy WebContents/ephemeral partition; broker reports sanitized auth state elsewhere | Paste/autofill, replay/extra-field/oversize/flow mismatch, cancel/crash/navigation, storage/partition cleanup, secret canaries |
| Document renderer | Revision-tagged semantic projections and Resolved Page Scene projections | User intent, nondurable previews, named command requests | No filesystem, source transport, credentials, publication, package, or authoritative state | Renderer replacement from main truth; uncommitted preview is discarded | Semantic DOM/ARIA inspection, command-route equivalence, crash/rebind, focus/selection restoration, minimum-endpoint performance |
| Chromium Layout Host | Immutable layout input or resolved publication projection plus exact engine/font/locale digests | Runtime-validated measurements or PDF bytes with matching digests | Derived text/layout/PDF work only; no document mutation, source/network, paths, or destination authority | Invalidate derived cache/result; publication remains uncommitted and document state survives | Measurement/source-range goldens, digest mismatch, font substitution, host crash/restart, inspected-PDF and accessibility tests |
| Transient pure-JS utility | One bounded versioned job DTO and brokered bytes | One immutable candidate/result or typed failure | Node-capable computation only; receives no credentials, reusable paths, document capability, source URLs/hosts/headers/transport grant, or publication authority, but still has residual same-user ambient OS filesystem/network capability | Timeout/cancel/crash discards partial output; main revalidates any result | Positive/crash/restart/cancel/timeout, resource bounds, unrelated-document responsiveness, ambient-access canaries, zero-child cleanup |
| Source credential/transport broker | Main-owned session credentials, allowlisted Refresh Plan requests, explicit Source Context | Bounded credential-free response bytes/envelopes and authentication state transitions | Sole RSLog credential/header and allowlisted network authority | Clear/replace session state as specified; never install a partial Snapshot Candidate | Synthetic 2FA/401/403/expiry, redaction/canary, account-context isolation, request allowlist and size limits |
| Recovery coordinator/store adapter | Credential-free immutable working revision, accepted policy inputs, app-owned root grant | Verified Recovery Candidate or classified/reconciled row and typed Diagnostic | Main-owned scheduling/classification; storage writes only under recovery-root capability | Preserve last verified candidate and dirty work; protected/uncertain/delete-failed rows remain visible | Clock/space/profile/identity/corruption/reparse/delete faults, restart classification, policy-cap and privacy scans |
| Font/asset admission service | User-selected or package-declared inert bytes, type/dimension/license metadata, digest | Admitted immutable asset identity/bytes or typed rejection | No DOM insertion or native decoding before the hardened gate; cannot invent rights | Asset remains unavailable; retain safe metadata and actionable Diagnostic only | Magic/type/active-content/rights/size tests, exact font identity/fallback tests, hardened-decoder tests when introduced |
| Publication coordinator | Immutable preflight candidate, exact scene/font/engine/policy digests, audit mode, main-owned bundle destination grant | Verified PDF plus canonical Audit sidecar when required/selected, or verified PDF-only result for a clean no-audit Candidate; typed bundle commit/result state | Main-only export candidate and exact derived destination-pair authority; Layout Host supplies PDF bytes but cannot commit either artifact | No success until every required final artifact reopens and cross-verifies; preserve staged/pair evidence for uncertain destination state | Cancellation-stage, pair collision/overwrite race, metadata/digest cross-match, mixed-size, font/vector/tag inspection, destination pair fault and reconciliation tests |
| Diagnostic/redaction service | Typed internal failures/events and policy classification inputs | Stable user-facing Diagnostic, accessible announcement, and privacy-minimal approved audit/log records | Central authority for classification/redaction output; no mutation or suppression decision by sinks | Drop/contain unsafe sink payload and emit a safe internal health code; never leak raw input | Secret/client/path canaries, category/severity/blocking matrix, suppression/acknowledgment lifecycle, crash/support-bundle scans |

These rows are normative even if implementation packages combine adapters in one build artifact. Combining code never combines their authorities or bypasses their independent validators and test seams.

## 5. Authoritative and derived state

The architecture maintains five explicit layers:

1. **Authoritative Document Model** — the current Log Project or Log Template plus lifecycle revisions and history, owned by its `DocumentSession`.
2. **Render Dataset** — an immutable, disposable derivation of exactly one accepted Source Snapshot, admitted Supplemental Sources, Presentation Overrides, and Source Resolution Decisions. It contains no templates, page geometry, Freeform Annotations, credentials, or editor state.
3. **Page Plan** — ordered Boring Logs/pages, Template Variant identity, physical page geometry, Header/Depth Body/Footer, Reference Depth Ranges, page/depth ownership, and continuation decisions.
4. **Resolved Page Scene** — renderer-neutral nodes with stable identity, integer physical geometry, z-order, semantic reading order, bindings/provenance, measured text results, clipping, axes, page fragments, and Diagnostics.
5. **Projection** — DOM/SVG for screen and print CSS/DOM/SVG for PDF. A projection is disposable and cannot be read back as document truth.

Canonical physical values use signed integer thousandths of a PostScript point (`mpt`, 1/1000 pt); conversion from user units is explicit and rounded once at the command boundary. The #17 prototype used this quantization successfully for semantic comparison, while cross-machine tolerances remain a PDF qualification concern ([#17](https://github.com/blaynesatcentral/RSrender/issues/17)).

The scene graph uses stable tagged node kinds rather than UI component names: group, region, text frame/run, line/path, shape, admitted image, Data Track, Data Layer, axis, depth interval/point glyph, annotation, and nonprinting Diagnostic marker. Every printable node carries page identity, local transform, bounds, effective visibility/lock, z-order, semantic role/order, style references or resolved style, and source/presentation provenance where applicable. Unknown source extensions are never scene nodes until a deliberate binding resolves them through a supported typed or safe generic formatter.

Data Track construction has one depth transform and owns axes, grids, and shared interval geometry. Layers own glyphs and refer to compatible axis identities. Moisture, PL, and LL may share one numeric axis while N-values use a separate numeric axis in the same track; layers do not duplicate the depth axis or interval bar. This boundary is supported by #19's 22/22 all-pass synthetic states and 242/242 oracle evaluations, not by production-data or production-PDF evidence ([#19](https://github.com/blaynesatcentral/RSrender/issues/19)).

## 6. Typed command, query, event, and job boundary

### 6.1 Contract rules

All cross-process contracts are discriminated, versioned tagged unions with a TypeScript type and an independently executable runtime schema. Runtime validation rejects unknown fields unless the specific contract declares a namespaced extension envelope. JSON-like control messages use canonical UTF-8-safe scalar structures; large bytes use transferable buffers/ports with declared length and digest. Deserialization never invokes constructors from input.

The internal application-service interface is transport-neutral:

```ts
interface ApplicationServicePort {
  execute(command: CommandEnvelope): Promise<CommandResult>;
  query(query: QueryEnvelope): Promise<QueryResult>;
  subscribe(request: SubscriptionRequest): AsyncIterable<ApplicationEvent>;
  cancel(request: CancelJobRequest): Promise<CancelJobResult>;
}
```

The Electron preload is the v0.9 adapter. The interface is not exposed as a generic renderer API; generated preload methods bind a specific command/query kind.

Credential entry does not use `ApplicationServicePort`. Its dedicated preload implements a separate internal `AuthSubmissionPort` with only state-specific `submitPassword`, `submitVerificationCode`, and `cancel` operations. The flow capability remains in the isolated preload closure and is never passed by page JavaScript; each submission invalidates it before the broker evaluates the secret.

### 6.2 Command envelopes and results

`CommandEnvelope` is a closed union with an explicit authority scope. An implementation may not manufacture a dummy document revision or history entry for an application, lifecycle, recovery, or workspace command.

| Envelope scope | Required concurrency fields | Examples | Successful result semantics |
|---|---|---|---|
| `application` | `contractVersion`, `requestId`, `commandId`, `expectedApplicationRevision` when changing application-owned state | New, Open, Recent Files, Begin Sign In, Sign Out, Close All, Quit, update disposition | `stateChanged` with new application revision and affected projections, or `started`; never a document Undo entry; secrets use only `AuthSubmissionPort` |
| `document-domain` | Above plus `documentId`, `ownerGeneration`, `expectedWorkingRevision` | Element/property/hierarchy changes, Overrides, annotations, template assignment, accepted Refresh | `domainCommitted` with new working revision, affected identities, invalidations, Diagnostics, and exactly one history entry when the UX marks the command undoable |
| `document-lifecycle` | `documentId`, `ownerGeneration`, expected lifecycle revision and durable/external baseline fields required by the command | Save, Save As, Close, Reload External, Replace External, publication disposition | `stateChanged`, `started`, `conflict`, or reconciliation result under the lifecycle state machine; no document Undo entry merely for file/lifecycle state |
| `workspace` | Window/document-session identity where applicable and `expectedWorkspaceRevision` for state-changing races | Pane layout, active page, zoom/pan, nondirty selection/focus/view state | `stateChanged` with workspace revision and projections; never dirty and never document history |
| `recovery-policy` | Candidate/profile policy identity and expected recovery-review revision; document owner fields only when an open document is affected | Open Separately, Compare, Discard, Retry Delete, Later | `stateChanged` or `started` under the recovery policy; new document identity/owner returned only by verified Open Separately |

Every envelope also carries a kind-specific payload. Sender capability and monotonic request sequence are attached and checked by the transport adapter, not exposed to page JavaScript. Commands are idempotent by `requestId` within a bounded session replay window; reuse with a different scope or payload is rejected.

`CommandResult` is exactly one of:

- `domainCommitted` with the required working revision/history semantics above;
- `stateChanged` with the named authority scope, new scope revision, affected projections, and no implied document history;
- `completed` for a verified nonmutating command result;
- `started` with a scoped job identity and the exact revision/digest it operates on;
- `rejected` with a stable reason, safe actions, and no unauthorized state change;
- `conflict` with current revision/baseline classification and safe actions; or
- `cancelled` with the last safe stage and no unacknowledged commit.

Undo and Redo are commands. They apply stored domain deltas/inverses under current preconditions, increment working revision, and never roll back a file, recovery cleanup, or publication. Accepted source Refresh is one document-domain history entry: its bounded in-session inverse reinstates the exact prior Source Snapshot and derived/conflict basis without network access or partial collection rollback. Only the current Snapshot is serialized, and closing discards session history. One direct-manipulation gesture, one property commit, one reparent/reorder, and one Key Element align/distribute operation each create one history boundary as specified by the UX contract.

### 6.3 Query and projection boundary

Queries carry `contractVersion`, `requestId`, document identity/owner generation where scoped, and an optional minimum revision. Core queries are:

- application/start/recent-files projection;
- document lifecycle and command-availability projection;
- workspace/Contents/selection/Properties projection;
- viewport-bounded Page Scene projection;
- Diagnostics and Publication Audit projection;
- Refresh candidate/diff projection; and
- job/recovery-review projection.

An explicit `DisplayPath` may appear only in a purpose-scoped visible projection whose UX requires it, such as Recent Files, an Authoritative File target, export result, or conflict prompt. `DisplayPath` is escaped untrusted text, not an OS path grant or command argument. Open/Save/Save As/export/Reveal/Copy Path commands identify a main-owned recent-entry, target, or opaque grant; main resolves and revalidates the real path. A renderer cannot turn a displayed or pasted string into authority. Display paths are excluded from structured logs, crash annotations, telemetry, and support bundles, and hostile control/bidi/long-path rendering is tested.

Events carry document identity, owner generation, monotonically increasing event sequence, and resulting revision. A renderer that sees a sequence gap, generation change, unknown event kind, or patch base mismatch discards its projection and performs a full query. Main never accepts a renderer-generated patch as reconciliation.

### 6.4 Command registry

Every user-visible action has one stable command ID, label/help localization key, applicability predicate, disabled reason, lock/read-only/conflict behavior, expected revision policy, undo class, job/cancellation class, and concise announcement template. Menus, keyboard shortcuts, toolbar buttons, canvas gestures, Contents actions, context menus, Properties, command search, and a future MCP adapter resolve through this registry. This preserves the #18 finding that equivalent routes must share one command and prevents a hidden mutation path ([#18](https://github.com/blaynesatcentral/RSrender/issues/18)).

## 7. Source integration boundary

### 7.1 Credential and transport broker

The main-process broker owns the one active RSLog account/company context and all password, two-factor, access-token, and refresh-token state. State is memory-only and cleared on sign-out, terminal authentication failure, process shutdown, or account-context replacement. Application restart requires authentication. The inert #32 prototype selected this option because neither supported vendor lifecycle evidence nor firm policy justified persistence ([ADR 0004](../../adr/0004-session-only-rslog-authentication.md), [#32](https://github.com/blaynesatcentral/RSrender/issues/32)).

The broker accepts a typed `TransportRequestSpec` only from a registered Source Adapter. The spec names a source family, documented operation ID, method, parameter DTO, pagination budget, and expected response-media/schema version. Main maps that operation ID to a compiled allowlist of supported vendor endpoints; no project, renderer, adapter result, or unknown extension supplies a URL, host, method, header, or credential. Response bodies are client-data-bearing but credential-free when passed to mapping.

### 7.2 Adapter pipeline

The Source Adapter is split into:

1. a pure planner that produces a complete Refresh Plan of supported collection operation IDs;
2. main-owned execution through the credential/transport broker;
3. a pure mapper/validator in a transient utility that produces one immutable `SourceSnapshotCandidate` with collection envelopes, normalized records, provenance, Diagnostics, eligibility, and logical digest;
4. a nonmutating diff/review query; and
5. deliberate `AcceptSourceSnapshotCandidate`, which atomically replaces the accepted Snapshot or changes nothing.

Only after acceptance does the pure assembler derive a Render Dataset from the accepted Snapshot plus independently admitted Supplemental Sources, Presentation Overrides, and Source Resolution Decisions. Candidate cancellation, required-collection failure, rejection, or failed diff leaves the accepted Snapshot and current Render Dataset basis unchanged. These boundaries are the 36/36 pure-oracle result selected by ADR 0005 ([#21](https://github.com/blaynesatcentral/RSrender/issues/21)).

Authorized unknown fields survive in inert Source Extension envelopes with name, JSON type, absent/null/present state, canonical value when present, entity/field identity, and provenance. They have no default placement, never execute, and an attempted explicit binding produces the unsupported-binding Diagnostic until a safe formatter exists. Positive wire shapes for piezometer data, drilling groundwater details, interim variations, laboratory API data, and hatch binaries remain blocked rather than invented. Moisture/PL/LL may enter through a validated Supplemental Source while supported RSLog access remains unproved ([RSLog read-contract research](../research/rslog-read-contract-rsagent-evidence.md), [laboratory access research](../research/rslog-laboratory-index-test-access.md)).

Refresh is deliberate and never a file-open, template-open, preview, print, export, or recovery side effect. Accepted Snapshots make templates/projects editable offline; reconnecting does not refresh automatically.

## 8. Package and persistence architecture

### 8.1 Canonical logical package

Both Log Project and Log Template Authoritative Files use the same constrained ZIP profile and begin with `manifest.json`. Entry names use forward slashes, normalized portable names, and case-unique paths. Absolute names, traversal, device names, backslashes, control characters, ambiguous Unicode/case collisions, undeclared entries, encryption, unsupported compression, executable/active content, symlinks, and duplicate names are rejected before logical admission.

The v0.9 logical roles and canonical roots are:

| Canonical path/root | Role | Authority and presence |
|---|---|---|
| `manifest.json` | Package identity, format/schema versions, document kind/identity, part inventory, media types, sizes, digests, authoritative flags | Required and authoritative |
| `document/project.json` | Log Project aggregate root | Exactly one of project/template |
| `document/template.json` | Log Template aggregate root | Exactly one of project/template |
| `templates/embedded/<id>.json` | Embedded Template Representation | Project-only, zero or more, authoritative |
| `templates/assignments.json` | Template Assignments | Project-only when assignments exist, authoritative |
| `data/example.json` | Example Dataset | Template/embedded-template optional, authoritative |
| `data/source-snapshot.json` | Accepted Source Snapshot | Project-only optional, authoritative |
| `data/supplemental/<id>.json` | One Supplemental Source revision | Project-only, zero or more, authoritative |
| `presentation/overrides.json` | Presentation Overrides and Source Resolution Decisions | Project-only optional, authoritative |
| `assets/<asset-id>/<portable-name>` | Admitted inert asset/font bytes and metadata | Optional, authoritative when referenced |
| `extensions/<namespace>/<part-id>` | Declared namespaced extension bytes | Optional; authoritative flag explicit |
| `derived/<role>/<id>` | Regenerable preview/index/cache | Optional, always non-authoritative |

Freeform Annotations, Template Components, Named Styles, guides, variants, page regions, and publication settings live in their owning project/template JSON aggregate rather than parallel, weakly coordinated parts. The manifest declares every non-manifest part's role, media type, byte length, SHA-256 digest, authority, and schema/extension identity. To avoid self-reference, `packageAuthoritativeDigest` is SHA-256 over a canonical manifest projection with that field and derived-only volatile metadata omitted, followed by every authoritative part declaration and byte digest in stable path order. Derived parts are inventoried but excluded. Unknown authoritative namespaced content is preserved byte-for-byte in a supported copy migration or migration is refused.

The canonical domain JSON codecs are versioned independently of the physical ZIP profile. Optional parts are allowed only when the manifest version declares the role and the logical validator knows its preservation/refusal rule. Missing referenced parts, unreferenced authoritative parts, role/cardinality mismatch, inconsistent document identity, unknown unnamespaced roles, or invalid cross-part references reject the whole candidate. The #33 prototype demonstrated the role inventory, authoritative digest, deterministic support inventory, hostile rejection, and copy migration with zip.js 2.8.49; it did not establish production limits or promote its fixture schema ([#33](https://github.com/blaynesatcentral/RSrender/issues/33)).

### 8.2 Physical ZIP adapter

The physical adapter is exactly locked `@zip.js/zip.js` 2.8.49 behind an RSrender-owned preflight. It performs bounded central-directory reconnaissance, streams admitted entries without extracting them, hashes compressed and logical bytes as required, and hands a container-neutral candidate to the logical validator. It never writes package entries to an extraction directory or lets an archive name select a filesystem path.

The serializer emits canonical entry order, normalized metadata, deterministic JSON encoding, and stable compression settings for supportability. A raw ZIP hash may be recorded when stable, but correctness is the authoritative logical digest and support inventory. Production entry/ratio/byte/time/memory/backpressure limits are supplied by #42; until those limits pass, the parser is not release-enabled.

### 8.3 Open and migration pipeline

Open uses this order:

1. main obtains a user/recent-file grant and classifies the exact path and storage;
2. main reads through an opaque bounded byte source; a transient utility performs physical preflight and logical validation;
3. main validates document identity, supported schema, aggregate invariants, and the returned candidate contract;
4. supported current packages from local fixed NTFS bind as Authoritative Files after baseline capture;
5. a valid package from unsupported storage opens read-only and requires Save As to supported local fixed NTFS before mutation;
6. a supported older schema migrates in memory by a pure ordered migration chain, opens as an untargeted dirty copy, and requires Save As; its source bytes are never altered; and
7. a newer/unknown authoritative version is refused for editing before any Save, with support inventory and safe actions only.

There is no in-place migration, down-save, best-effort partial open, or opaque rewrite of unknown authoritative content.

### 8.4 Save, Save As, and export writes

Save and Save As follow ADRs 0001, 0002, and 0006 exactly: snapshot a working revision, serialize a candidate, independently reopen and fully validate it, acquire per-target commit authority, recheck identity/baseline inside authority, perform validated replacement, reopen and verify the committed target, and only then advance durable revision or bind the new Authoritative File. The serializer/utility creates bytes; the main file broker alone owns the candidate path, target path, storage handle, replacement, and verification decision.

An `AuthoritativeFileGrant` is scoped to document identity, ownership generation, target identity, baseline, operation, and expiry. It is not a string path and is never transferable to a renderer or utility. Save wait is bounded and cancellable. Pre-replacement failure, external conflict, post-replacement uncertainty, and verified success remain different lifecycle states with the exact safe actions in the [lifecycle conflict specification](lifecycle-conflict-state-command-specification.md).

PDF export uses a separate user-selected `ExportDestinationGrant`; it never binds an Authoritative File or satisfies Save. The grant is scoped to one chosen PDF basename, audit mode (`required`, `selected`, or `none` only for a clean Candidate), and the exact main-derived PDF and `<basename>.rsrender-publication-audit.json` sidecar paths. It conveys coordinated Create New/Replace Existing authority only for those artifacts and cannot be reused for another basename or arbitrary sibling.

Main stages the PDF candidate, verifies the qualified engine/configuration identity, bounded PDF envelope, byte count, Publication ID/audit-required metadata marker, and digest, then constructs and validates the canonical Audit sidecar when applicable. Main alone performs the export-specific pair commit/replacement/reconciliation flow: sidecar first, PDF second, followed by reopen of every required final artifact, PDF-digest and Publication-ID cross-match, and destination identity verification. A partial or unverifiable pair is an uncertain outcome, never success; exact artifacts remain governed by inspection/safe-removal/retry/new-basename actions. If the destination adapter cannot prove coordinated pair behavior, audited publication and Replace Existing are unavailable there. The Audit records frozen preflight expectations and actual job/file outcome; it does not claim to be a second PDF parser. Exporting to an unsupported project-storage class does not make that location editable or authorize later overwrite of a project there. The final acceptance strategy owns Chromium metadata-marker and Publication Bundle structural verification; live #36 owns destination pair collision/fault/reconciliation evidence.

### 8.5 Recovery seam

Recovery serialization uses the same logical package codecs, strict validation, and constrained package boundary as Save, but writes a `Recovery Candidate` only in the dedicated app-owned local-fixed-NTFS recovery root. A candidate is a complete captured working package, client-data-bearing, non-authoritative, and excluded from recent files. It never binds an Authoritative File, advances durable revision, overwrites the source, becomes Undo history, or silently satisfies Close/Quit.

Main schedules eligible requests using the accepted 120-second dirty debounce, 300-second continuous-edit maximum, and 120-second minimum spacing. It applies the exact count/age/byte/protected-state, compare, shared-profile, encryption-attestation, cleanup, and uninstall rules in the [recovery policy](recovery-retention-privacy-policy.md). Those product defaults are fixed; firm security/privacy/records approval and #36/#37/#39 mechanics remain release gates. Recovery metadata and logs use opaque hashes/reason codes and never include document content, credentials, unrestricted paths, thumbnails, or source values.

## 9. Layout, text, canvas, and publication

### 9.1 Renderer-neutral scene engine

The scene engine is pure TypeScript. It consumes immutable domain projections and a versioned `TextMeasurementPort`; it emits a Page Plan, Resolved Page Scene, and Diagnostics. It has no DOM, Electron, ZIP, filesystem, or source-transport dependency. It owns:

- Header/Depth Body/Footer and Page Region geometry;
- Template Variant and Reference Depth Range selection;
- page/depth boundary ownership and interval fragmentation;
- element transforms, Position Anchors/Layout Pins, effective hierarchy state, z-order, and semantic order;
- explicit text overflow policy execution and continuation source ranges;
- Data Track depth geometry, axes, shared interval bars, and ordered layers; and
- page construction from Render Dataset plus separate Freeform Annotations.

The engine never drops an item to fit, treats missing as zero, copies a prior source result into a failed Refresh, or omits a nonprinting problem from Diagnostics. Derived scene caches are keyed by document working revision, Render Dataset digest, template/assignment digest, page-plan inputs, layout-engine version, font catalog digest, locale, and relevant publication settings.

### 9.2 Text contract

A text measurement request contains stable text-element/run identity, exact Unicode scalar content and source indexing convention, language/direction, font-family chain, bound font identities/digests, size, features/style, line height, writing box, whitespace convention, wrapping policy, and requested overflow policy. The Layout Host returns exact consumed source ranges and does not normalize away explicit newlines, absent values, or combining sequences.

Each accepted measurement records:

- engine/Electron version and configuration digest;
- requested and effective font face/digest per run;
- line/run source ranges and visual order;
- advances, baselines, logical/ink bounds, and available bounds in `mpt`;
- wrap opportunities and explicit-break ownership;
- authored/effective font size and any bounded shrink steps;
- fit, clip, continuation, or unresolved-overflow outcome; and
- missing/substituted-font and unsupported-glyph Diagnostics.

Preview and publication consume those lines/runs. Raw DOM `scrollWidth`/`scrollHeight` and Range measurements are evidence inputs, not permission for the browser to choose a second product policy. A changed engine/font digest invalidates the measurement and requires remeasurement.

### 9.3 Canvas projection

The visible page is SVG inside a semantic HTML workspace. SVG elements use stable scene IDs and fixed `mpt`-to-CSS transforms; the renderer never writes pixel-rounded geometry back to the document. Semantic Contents and Properties remain complete alternate command routes. Visibility/lock inheritance, ordering/reparenting, ordered multi-selection, explicit Key Element, snapping, guides, movement, resize, rotation, alignment, distribution, and keyboard operations are application commands or nondirty previews according to #23.

The DOM/SVG choice is conditional only on measured production-scale fitness, not on an unspecified rewrite. If #30 misses the accepted latency/memory envelope after bounded optimization, a replacement projection must still consume the same Resolved Page Scene, command/query port, semantic alternate surface, and text results; it cannot change the domain or layout engine.

### 9.4 PDF publication

Publication is a background job over a frozen document revision and complete preflight result:

1. derive and freeze the Render Dataset, Page Plan, Resolved Page Scene, font/asset inventory, Diagnostics, and semantic reading order;
2. require the accepted warning/error/suppression policy and unresolved-conflict rules;
3. load only admitted fonts/assets into a fresh or reset Layout Host;
4. project fixed, non-wrapping text runs and scene geometry to print DOM/SVG;
5. verify scene, node-count, page-geometry, text-range, font, and projection digests;
6. main calls Electron `webContents.printToPDF` with background graphics, CSS page-size preference, and the tagged-PDF target enabled;
7. require that the exact engine/configuration has passed the final acceptance strategy's structural inspection for the requested capability set, then perform a bounded runtime PDF-envelope/size check without interpreting the file as document truth; and
8. stage the PDF and, when required/selected, canonical Audit sidecar; commit only through the exact bundle destination grant; reopen/hash/cross-match every required final artifact; and report one verified bundle result or one typed uncertain/failure result.

Every page retains its own physical page geometry in the scene. The projection emits matching CSS page descriptors and must not normalize mixed or custom sizes. If the pinned Chromium backend cannot preserve the requested page-size sequence, publication blocks with a Diagnostic; the architecture does not silently add a PDF-merging library or rescale pages. The final product and acceptance specifications settle required mixed-size behavior, tagging/PDF-UA target, vector/text fidelity, and tolerances; their acceptance rows remain non-pass until the prescribed evidence exists.

Electron 43.4.0 is the current qualified-development pin because it was directly exercised in #17. Raw Chromium PDF byte hashes may vary due to metadata, so acceptance uses semantic/normalized PDF goldens. A matching screenshot or text extraction alone is insufficient. A test-only, bounded structural inspector defined by the final acceptance strategy examines page boxes, text, fonts, vectors/images, clipping/transparency, tags, and reading order; v0.9 does not silently add a general runtime PDF editor/postprocessor/parser. The prototype did not establish PDF/UA, production font identity, cross-machine parity, or release readiness ([#17](https://github.com/blaynesatcentral/RSrender/issues/17)).

Direct OS printing, printer-driver workarounds, `.prn`, PDF layers/security/profiles, foreground modal export, and independent raster fallback are not v0.9 architecture paths, matching the UX disposition in [#23](layout-studio-ux-specification.md).

## 10. Fonts and assets

### 10.1 Font catalog and binding

RSrender uses a document-visible `FontCatalog` whose entries have stable font identity, family/face/style metadata, source class, exact byte digest when bytes are controlled, license/embedding classification, fallback position, and availability state. Allowed source classes are:

- application-shipped, reviewed, clean-room/licensed font bytes;
- locally installed fonts admitted for local authoring/publication by exact identity/digest and verified PDF-embedding rights, without silently copying their bytes into a portable package; and
- package-embedded fonts only after the asset/font admission and native-decoder gate passes.

This source-class policy is selected for v0.9. A template that depends on a locally installed face is portable only to an endpoint with the same admitted face/digest; otherwise it opens with an actionable missing-font Diagnostic and must be remeasured before publication. A self-contained portable template may use application-shipped reviewed fonts or separately admitted package-embedded fonts. The exact production catalog and rights classification remain approval data, not an architecture choice.

Every text style stores an ordered logical font-family chain, not an unrestricted path. Publication records the effective face/digest for every run. Silent substitution is forbidden: a missing or changed font invalidates prior fit, triggers remeasurement, and surfaces a Diagnostic. `FontFaceSet.check()` is not proof that the requested face supplied glyphs; #17 directly identified that limitation ([#17](https://github.com/blaynesatcentral/RSrender/issues/17)).

Font size is a physical numeric property with no RSLog-derived arbitrary list. Product overflow rules may impose explicit positive bounds or a declared shrink minimum, but the architecture does not quantize to RSLog's choices. Variable fonts, complex fallback, embedded-user-font parsing, subset fidelity, and redistribution must be separately admitted and tested.

### 10.2 Graphics and other assets

Native scene primitives cover lines, rectangles, ellipses, paths, fills, borders, transparency, axes, hatches represented as safe programmatic patterns, and text. Application-shipped SVG/path assets are build-time reviewed, stripped of scripts/external references, hashed, and licensed. Package assets are inert bytes until an admission service validates media type, declared dimensions, limits, digest, rights metadata, and decoder policy.

No user- or package-provided SVG is admitted or rendered in v0.9 before the hardened native/active-content decoder and sanitizer boundary passes #37. Rejecting only known active features or stripping markup in a renderer/Node utility is not an allowed fallback. Application-shipped SVG/path assets remain a separate build-time-reviewed class. Hatch identifiers without authorized bytes/rights render the neutral fallback pattern and Diagnostic; vendor binary hatches are not inferred. Untrusted raster, font, hatch, PDF, SVG, or other decoded inputs are unavailable until #37 proves the separately hardened boundary. A Node utility, renderer, or hidden Layout Host is not that boundary.

Pictures remain a required product capability, but enabling arbitrary picture import is contingent on the native-decoder release gate. Until it passes, command availability must state the reason; an implementation may not quietly decode user bytes in Chromium to make the control appear complete.

## 11. Security and privacy controls

Security follows the current first-party Electron guidance captured in [Electron security/deployment research](../research/electron-security-deployment-update-recovery.md) and the ownership/licensing constraints in [commercialization research](../research/ownership-licensing-clean-room-commercialization.md). The architecture requires:

- exact dependency locks, packaged Electron security preferences/fuses, restrictive CSP, secure packaged origin, context isolation, sandbox, no Node in renderer/workers, no webviews, denied navigation/windows/permissions, and no arbitrary network;
- main-frame, origin, document, ownership-generation, capability, sequence, schema, revision, and command-availability checks on every privileged call;
- least-data projections; ordinary command/query/projection/job bridges carry no reusable path/path grant, credentials, source headers, environment, or unrelated-document data; purpose-scoped escaped `DisplayPath` text is allowed only as specified in section 6.3 and conveys no authority; the sole credential-crossing exception is the exact one-shot Auth Entry password/code submission in section 3.2, which never returns a secret;
- bounded package/source/scene/PDF inputs, structured typed failures, crash/cancel containment, and zero authority from filenames/content;
- privacy-minimal logs with stable codes, opaque correlation IDs, bounded counts/byte bands/digests where policy permits, and centralized redaction before log/crash/support sinks;
- no production client data, credentials, source response bodies, template content, unrestricted paths, machine/user IDs, or document thumbnails in telemetry/crash annotations; and
- release-time SBOM, license notices, vulnerability review, signing, installer/update trust, and documented support inventory.

Structured logs and crash annotations exclude secrets by schema and central redaction, but this does not prove raw process minidumps exclude memory that once held a password, verification code, or token. v0.9 does not upload raw dumps or include them in support bundles by default. Enabling capture, local retention, administrative collection, upload, or external analysis of a dump requires firm privacy/security approval, exact custody/age/deletion controls, explicit user/administrator consequence, and secret/client-data canary tests. Same-user process inspection and any approved local dump remain residual endpoint risks while session credentials exist in memory.

Renderer compromise is assumed possible. It may submit only commands available to its scoped document and current state; main revalidates all domain and file/source preconditions. Utility compromise remains a same-user risk because `utilityProcess` is Node-capable. RSrender withholds reusable user-selected paths, credentials, source URLs/hosts/headers/transport grants, commit authority, and hostile native-decoder inputs from the job contract, but this is capability minimization rather than OS containment: ambient same-user filesystem and network capability remains a residual risk until a separately hardened boundary proves otherwise.

## 12. Jobs, concurrency, failure, and cancellation

Every job captures `jobId`, kind, one closed `JobScope`, input digests, stage, budgets, cancellation state, and redacted result. Scope is exactly one of:

| Job scope | Required trusted fields | Typical jobs | Promotion rule |
|---|---|---|---|
| `application` | Main application-session identity and expected application revision where relevant | Authentication transport, update check/staging, application diagnostics | Result can change only application-owned state under its issuing revision/capability |
| `intake` | Main-issued opaque intake ID, opaque read grant, physical-byte digest, and no trusted document identity | Open/package preflight, parse, validate, migrate-to-candidate | Package-declared identity is inert candidate data until main validates the whole candidate and deliberately creates/binds a DocumentSession |
| `document` | Trusted `documentId`, owner generation, input working/lifecycle revision and complete domain/scene/source digests required by the kind | Save candidate, Refresh, scene/layout, publication | Result installs only if every issuing identity/revision/digest still matches and the command remains eligible |
| `recovery-candidate` | Main-owned candidate ID, recovery-review revision, root capability, and recorded untrusted origin identity/digest fields | Startup classification, Compare preparation, cleanup/delete | Candidate content cannot acquire document authority; Open Separately creates a new identity/owner only after validation and deliberate command commit |

Every child result repeats the issuing job/scope identity and complete input digest; main rejects a mismatched, stale, cross-scope, or candidate-self-promoting result. No unopened package, filename, candidate manifest, or worker may choose a trusted `documentId` or `DocumentOwner`.

Main admits at most one mutating lifecycle job per document and one source acceptance transaction per project. Independent documents may save concurrently because commit authority is per durable target, not global. Multiple read-only scene jobs may run only when their memory/CPU budget passes #30/#42; later results are installed only if their complete input key still matches.

Cancellation is cooperative at declared safe points before publication authority. A utility/host that ignores cancellation is terminated after the job deadline; its partial output is discarded. Once a filesystem replacement enters a noncancellable critical stage, the UI reports that stage and cancellation becomes a request to stop after reconciliation, not a false claim of rollback. Source candidate cancellation never installs partial records. PDF cancellation never mutates the Authoritative File and removes only verified job-owned temporary output under the applicable storage policy.

A renderer or Layout Host crash preserves main-owned authoritative state, dirty state, history, file binding, and jobs that do not depend on that host. Replacement receives a new generation/capability and a fresh projection. A package/scene utility crash returns a typed job failure and cannot publish its bytes. The #37 packaged crash/rebind behavior is not yet proved; these are required invariants and release tests, not claimed observations.

## 13. Testing and evidence architecture

### 13.1 Pure and contract tests

- Domain reducer tests cover every named command, precondition, history boundary, revision transition, aggregate invariant, and cancel/no-change result.
- Property-based tests cover identity uniqueness, hierarchy acyclicity, effective visibility/lock, selection/Key Element invariants, interval fragmentation, no drop/duplication, Snapshot atomicity, unknown-field inertness, package path closure, and migration source preservation.
- Runtime-contract tests send missing, extra, wrong-type, stale, replayed, cross-document, child-frame, oversized, and version-skewed messages to every boundary.
- Source contract tests use only synthetic, authorized captured shapes where permitted; blocked positive shapes stay absent. Supplemental laboratory cases cover unavailable/null/zero/nonfinal/ambiguous/duplicate/unit states.
- Package tests use valid, boundary, corrupt, hostile, resource-exhaustion, unknown-extension, older-version, newer-version, and failed-migration corpora without extracting archives.

### 13.2 Semantic golden tests

The synthetic corpus owns expected domain/page semantics. Goldens are layered so a pixel difference cannot obscure a content error:

1. canonical Authoritative Document and Render Dataset digests;
2. Page Plan identities, variants, depth ranges, boundary ownership, fragments, and Diagnostics;
3. Resolved Page Scene node identities, `mpt` geometry, z-order, semantic order, source ranges, font identities, and overflow results;
4. normalized DOM/SVG structure and accessibility semantics;
5. inspected PDF page boxes, page count, text extraction/ranges, fonts, vector/raster objects, clipping/transparency, tag/reading-order evidence, and Publication Audit; and
6. bounded raster comparisons only for visual regressions, never as the sole oracle.

Chromium PDF raw bytes are not a universal golden because metadata can vary. Every golden records Electron/Chromium, OS build, locale, display scale where relevant, font digests, dependency lock digest, scene-engine version, and fixture identity.

### 13.3 Platform, fault, and release tests

Packaged Windows tests exercise process preferences/fuses, navigation/permission denial, renderer/utility crash and restart, stale-capability rejection, cancellation, child cleanup, source-session clearing, storage faults, external writers, recovery classification, low space, long paths, AV/EDR/ACL interference, installer/update/rollback, and clean uninstall policy. Accessibility tests use real permitted assistive technologies and forced-colour/text/display-scale configurations; DOM snapshots do not count as screen-reader evidence.

Minimum-hardware performance tests measure command-to-feedback latency, drag frames, viewport query/projection, scene/layout jobs, PDF throughput, memory, startup/open, package contention, cancellation latency, and unrelated-document responsiveness against the accepted envelope in [minimum-endpoint workload and performance envelope](minimum-endpoint-workload-performance-envelope.md).

## 14. Dependencies, versions, and licensing

The v0.9 selected runtime baseline is:

| Dependency/capability | Selection | License/evidence condition |
|---|---|---|
| Electron/Chromium/Node runtime distribution | Electron 43.4.0 qualification pin; exact patch locked | Retain and audit the complete exact Electron binary notice bundle, including embedded Chromium, Node, codecs, and other runtime/transitive components; upgrades rerun license, security, layout, PDF, and accessibility gates |
| ZIP | `@zip.js/zip.js` 2.8.49 behind owned validators | BSD-3-Clause; retain notice, exact lock, SBOM, release scan, and commercialization review |
| Interactive projection | Web-platform semantic HTML + SVG | No Konva/Fabric/CanvasKit runtime dependency selected |
| Text/PDF | Pinned Chromium Layout Host + Electron `printToPDF` | PDFKit/fontkit and Typst are not production authorities; Typst may remain an independent later PDF/UA oracle |
| Domain/application/scene | Owned TypeScript, renderer-neutral | Compiler/build/test dependencies selected and reviewed during implementation; none may change these boundaries |

Prototype license inventories and a zero-known-vulnerability point-in-time audit do not constitute final legal/security approval. The #33 retained run demonstrated exact-lock SBOM and notice custody for Electron and zip.js; the approved contribution/dependency policy and every release must refresh the complete graph, licenses, provenance, notices, vulnerability state, and buyer-transfer obligations ([#33](https://github.com/blaynesatcentral/RSrender/issues/33)).

No Esri code, assets, strings, formats, branding, icons, or trade dress are dependencies. ArcGIS research is clean-room behavioral evidence only.

## 15. Post-MVP MCP seam

v0.9 ships no MCP server, MCP listener, agent credentials, hidden automation API, or direct document/source/file access. Agentic interaction is preserved as an architectural seam by the transport-neutral `ApplicationServicePort`, stable command registry, typed projections, job model, and opaque capability checks.

A later MCP adapter must be a separately packaged, explicitly enabled least-privilege adapter with its own authenticated principal and policy. It may expose allowlisted queries and named commands; it may not simulate UI, import arbitrary IPC channel names, access renderer DOM, open arbitrary paths, read credentials, call RSLog directly, mutate Source Data, bypass warnings/locks, or publish without the same preconditions and required user confirmations as the UI. Results retain command IDs, affected document/revision, Diagnostics, and audit provenance.

The future adapter binds to an application-session capability issued by main and revocable independently of document ownership. Read-only inspection can be separately authorized from mutation, source Refresh, Save/Save As, and publication. This seam allows robust MCP work after MVP without making the renderer or document format an automation protocol.

## 16. Explicit remaining release and organizational gates

The core #24 architecture frontier is closed: process ownership, application boundaries, renderer/layout/PDF direction, package envelope, source seam, persistence seam, and future MCP seam are selected above. Final domain, UX, product, lifecycle, recovery, and acceptance authorities also close their product-choice frontiers. The following are live evidence or organizational gates, not implementation-agent choices:

| Release gate/authority | Owner | Required consequence now |
|---|---|---|
| Exact production font catalog, face provenance, and redistribution/PDF-embedding classifications | Approved contribution/dependency policy, accountable rights authority, and #43 evidence | The selected source-class policy in section 10.1 applies; FontCatalog admits only reviewed entries, local-only dependencies are visibly nonportable, and missing rights block embedding/publication rather than substitute |
| Native-decoded user asset formats and associated rights | #37 and #43 | Feature remains unavailable with an actionable reason until both containment and rights are established |
| Installer/update management plane, code-signing authority, channels, rollback, and organizational deployment | Firm IT plus #39 | No implementation agent selects an updater or signing identity |
| Organizational approval of accepted recovery content, retention, privacy, encryption-attestation, shared-profile, deletion, and hold policy | Firm security and privacy/records owners via #38 | Product defaults stay fixed, but recovery release remains disabled where required attestation/approval is absent |
| Authorized positive RSLog wire contracts and redistribution rights for currently blocked source/asset families | #43/vendor authority | Typed blocked capabilities and neutral fallbacks remain; no guessed DTO or proprietary asset |

These items do not reopen the architecture. A contrary evidence result changes the named adapter/policy through a recorded decision; it does not permit an implementer to create a silent fallback.

## 17. Environmental validation and release gates

The following gates are distinct from product choices. “Required” means the selected architecture must pass or explicitly remove the affected capability before release; this document does not claim any pass.

| Ticket | Gate | Architecture response if it fails |
|---|---|---|
| #30 | Production-scale DOM/SVG layout latency, memory, and responsiveness on minimum Windows hardware | Optimize bounded projection/virtualization first; if still failing, replace only the projection behind the same scene/semantic/command boundaries |
| #34 | Keyboard completion, focus, names/roles/states, announcements, forced colours, and 200% text/display behavior | Correct semantic/UI adapters and command announcements; no canvas-only exception |
| #36 | Local fixed NTFS save/Save As, external-writer, low-space/quota, ACL/AV/EDR, long-path, reparse, cleanup, and restart reconciliation | Revise storage mechanism without widening supported storage or weakening verified replacement; do not claim durability |
| #37 | Packaged utility success/crash/restart, renderer crash/rebind, route-scoped capability rejection, Auth Entry one-shot/teardown/ephemeral-storage/secret-canary behavior, single-instance forwarding, child cleanup, protocol/security assertions, and native-decoder isolation/exclusion | Pure-JS/auth topology remains unreleased until repeatable; reject native-decoded untrusted formats unless a hardened boundary passes |
| #38 | Firm recovery security/privacy/records approvals and codeable audit/cleanup enforcement | Disable recovery writes/opening where approval/attestation is absent; preserve already classified data for authorized handling |
| #39 | Signed installer/update/rollback/uninstall behavior and managed deployment on firm endpoints | No release/update channel until firm IT selects and qualifies it; preserve Authoritative Files and governed recovery data |
| #40 | Controlled Windows assistive-technology environment and permitted human validation | Do not claim screen-reader/accessibility acceptance from DOM or automation alone |
| #42 | Parser/layout/PDF resource limits, streaming/backpressure, contention, cancellation, minimum endpoint headroom, and hostile corpus | Refuse over-limit jobs with typed failures; do not tune undocumented limits or introduce a shared worker pool silently |
| #43 | Authorized positive vendor shapes, representative source fixtures where permitted, hatch/media/font rights, and clean-room custody | Keep capability blocked/inert/neutral; never infer from empty responses or copy proprietary assets |

The final product/acceptance specifications define publication correctness and PDF accessibility/conformance while retaining non-pass evidence states. The approved contribution/dependency policy plus accountable rights authority gates dependency admission and release licensing custody. These are downstream acceptance of the selected architecture, not alternative architectures.

## 18. Decision-to-evidence traceability

| Architecture decision | Primary evidence/authority | Remaining proof |
|---|---|---|
| Main-owned lifecycle and validated replacement | [ADR 0001](../../adr/0001-renderer-independent-lifecycle-and-verified-save.md), [ADR 0002](../../adr/0002-layer-document-ownership-and-storage-commit-authority.md) | #36 storage fault matrix; #37 packaged ownership/routing |
| Sandboxed renderer, command-shaped IPC, transient pure-JS utilities | [Electron research](../research/electron-security-deployment-update-recovery.md), [#37](https://github.com/blaynesatcentral/RSrender/issues/37) | #37 packaged success/crash/rebind/cleanup; #42 budgets |
| Renderer-neutral scene plus one Chromium text authority | [technology research](../research/deterministic-layout-typography-canvas-pdf-options.md), [#17](https://github.com/blaynesatcentral/RSrender/issues/17) | Final acceptance PDF parity/tagging/fonts; #30 scale; #42 limits |
| Semantic HTML/SVG interaction projection | [#18](https://github.com/blaynesatcentral/RSrender/issues/18), [#23 UX](layout-studio-ux-specification.md) | #30 performance; #34/#40 accessibility |
| One shared-axis depth-aware Data Track | [#19](https://github.com/blaynesatcentral/RSrender/issues/19), [domain model](boring-log-domain-model.md) | Final acceptance PDF geometry; #30 scale; #43 source evidence |
| Source-only Candidate and separate assembly | [ADR 0005](../../adr/0005-source-snapshot-acceptance-boundary.md), [#21](https://github.com/blaynesatcentral/RSrender/issues/21) | Authorized positive source shapes in #43 |
| Session-only source authentication | [ADR 0004](../../adr/0004-session-only-rslog-authentication.md), [#32](https://github.com/blaynesatcentral/RSrender/issues/32) | #43 authorized supported-vendor integration evidence and firm security release review |
| Constrained ZIP + owned validation + zip.js 2.8.49 | [ADR 0003](../../adr/0003-constrained-zip-document-package.md), [package research](../research/project-template-package-migration-strategy.md), [#33](https://github.com/blaynesatcentral/RSrender/issues/33) | #42 limits; #37 packaged utility behavior; approved dependency/rights policy and per-release custody |
| Local fixed NTFS authoritative storage | [ADR 0006](../../adr/0006-local-fixed-ntfs-authoritative-storage.md) | #36 direct fault/storage observations |
| Complete non-authoritative recovery package | [recovery policy](recovery-retention-privacy-policy.md) | #38 authority; #36 mechanics; #39 uninstall |
| Transport-neutral post-MVP automation seam | Typed command/query architecture and #23 single-command semantics | Separate post-MVP threat model, authorization, usability, and MCP conformance work |

## 19. Implementation handoff rule

Implementation agents may choose internal file names, build tooling, test framework, immutable-data representation, dependency-injection mechanism, and performance optimizations that preserve every boundary above. They may not move authority into a renderer/utility, add independent preview/PDF layout, persist credentials, broaden supported storage, decode blocked native assets, guess source contracts, flatten provenance, introduce a second document format/PDF engine, change recovery policy, or mark a gate passed without its named evidence.

Any evidence that invalidates a selected mechanism must produce a recorded ADR/specification change with its affected contracts and migrations. It must never become an undocumented implementation exception.
