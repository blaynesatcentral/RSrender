# Electron security, deployment, update, and recovery architecture research

**Ticket:** #12  
**Research date:** 2026-08-13  
**Status:** Threat-informed options and prototype gates; no production architecture, package tool, installer, updater, or credential store selected  
**Scope:** The standalone Windows Electron shell and its privileged boundaries. This report does not implement RSrender.

## Executive result

Electron is viable for the intended Discord-like desktop deployment model only if RSrender treats the renderer as an untrusted presentation client, not as the application. The evidence supports carrying this candidate boundary into ticket #20:

- packaged, local UI in sandboxed renderers with `nodeIntegration: false`, `contextIsolation: true`, restrictive CSP, a custom standard/secure protocol, no arbitrary navigation, and no embedded vendor web applications;
- one narrow preload API whose command-specific methods exchange runtime-validated plain data transfer objects;
- a main-process capability broker that authenticates the sending frame and owning `Log Project`, owns windows, dialogs, file grants, credentials, and lifecycle coordination, but does not perform heavy layout, package parsing, or export work;
- separate utility processes for untrusted `Log Template`/`Log Project` parsing and candidate domain/layout work, with a hidden sandboxed Chromium renderer or a second isolated service as competing export strategies;
- user-selected authoritative project/template paths, app-owned bounded recovery storage, and a validate-before-replace save protocol whose actual durability is established on target Windows storage by fault injection;
- a single update authority—either RSrender's signed private feed or firm-managed deployment—not both—and file-format compatibility rules that prevent an application rollback from silently rolling back or corrupting a `Log Project`;
- local-only, redacted diagnostics by default, with any crash or support-bundle upload requiring an explicit organizational privacy decision; and
- reproducible release evidence: signatures, hashes, exact dependency graph, SBOM, third-party notices, security results, and an immutable promotion record.

This is not a production selection. Electron's `utilityProcess` is a Node-capable child process, not a documented security sandbox; TypeScript types disappear at runtime; `safeStorage` does not protect against other applications running as the same Windows user; a file rename/replace sequence has filesystem-dependent failure modes; and installer/update behavior differs materially among Squirrel, NSIS, MSIX, and IT-managed deployment. Those claims require the bounded prototypes below.

Ticket #29 was resolved by the user/product owner's unconditional GO on 2026-08-13. That reopens ticket #20 but does not waive this report's clean-room, read-only RSLog, credential, client-data, asset-provenance, dependency-license, and no-trade-dress controls. Every test fixture must use independently created UI, assets, fonts, hatches, and a synthetic `Example Dataset`.

## Evidence labels and source baseline

- **Documented** — a behavior stated by a cited first-party specification, platform owner, or project owner.
- **Inference** — an RSrender implication derived from documented behavior; not a framework guarantee.
- **Candidate control** — a control to test in #20, not a selected architecture.
- **Prototype hypothesis** — a falsifiable claim with an explicit test below.
- **Policy unknown** — an employer, IT, privacy, legal, retention, signing, or commercialization choice that technical research cannot settle.

All web sources were accessed 2026-08-13. Electron's release index identified **43.4.0**, released 2026-08-11, as the newest stable build, embedding Chromium 150.0.7871.224 and Node.js 24.18.1. Electron 43 became stable 2026-06-30 and reaches end of life 2027-01-05; Electron 44 was still prerelease and scheduled for stable release 2026-08-25. [Electron release index](https://releases.electronjs.org/release/) and [release schedule](https://releases.electronjs.org/schedule)

Electron follows an eight-week major release cycle, considers Chromium major updates breaking changes, and supports multiple major stabilization branches only for their published support windows. **Inference:** RSrender needs an explicit supported-line upgrade SLA and one-major-at-a-time qualification suite; “pin Electron indefinitely” is not a security strategy. [Electron versioning](https://www.electronjs.org/docs/latest/tutorial/electron-versioning)

API statements below target Electron 43.4.0's `latest` documentation and the embedded Node 24 line unless a source says otherwise. Candidate packaging tools are not dependencies; their current behavior and licenses must be re-verified at the exact version proposed by ticket #20.

## Binding product and legal boundaries

This architecture must preserve the repository vocabulary and decisions:

- A `Log Template` is reusable layout, bindings, formatting, behavior, and an embedded synthetic `Example Dataset`.
- A `Log Project` owns Template Assignments, selected Explorations, Presentation Overrides, validated Supplemental Sources, the singular retained Source Snapshot, and current Embedded Template Representations needed to work offline. Its Render Dataset is a derived renderer-facing projection, not retained source truth.
- A `Refresh` is deliberate; opening a file never contacts RSLog or mutates the `Source Snapshot`.
- `Source Data` and `Presentation Override`s remain separately identifiable. The override does not write through to RSLog.
- A `Log Document` is an exported publication, not editable history retained by RSrender.
- A domain `Diagnostic` is not an Electron log line, crash record, or parser exception unless the domain layer deliberately classifies it.

Ticket #13's package invariants are part of this report's threat boundary. In particular, the package is declarative and contains no executable content or credentials; opening and migration are side-effect free; names, links, sizes, assets, versions, hashes, and migrations are validated before use; the original remains intact through failed migration; and recovery is app-owned, bounded, and secret-free. See [project/template package and migration strategy](project-template-package-migration-strategy.md).

Ticket #29 is resolved by an unconditional product-owner GO. Its underlying controls remain product requirements: no Esri or Rocscience code, assets, screenshots, branding, trade dress, sample data, fonts, hatches, traffic, or undocumented endpoints may enter prototypes. Every dependency requires exact-version license/provenance review, transitive inventory, SBOM, notices, vulnerability/maintenance review, and approval before adoption. See [ownership, licensing, clean-room, and commercialization gate](ownership-licensing-clean-room-commercialization.md) and the recorded #29 outcome.

## Threat and trust model

### Protected assets

1. RSLog credentials and refresh/device tokens.
2. Client, exploration, and firm-template data in the current Source Snapshot, attached Supplemental Sources, current Embedded Template Representations, derived Render Dataset, Presentation Overrides, recovery copies, exports, logs, memory, and temporary files.
3. User-authored `Log Template`s, `Log Project`s, and unsaved edits.
4. The integrity of generated `Log Document`s and their diagnostics.
5. Signing identity, update keys, release metadata, installer identity, protocol/file associations, and update channels.
6. Application code, dependency provenance, third-party notices, and clean-room evidence.

### Inputs that remain untrusted even when selected by the user

- renderer messages, DOM state, pasted text/images, dropped files, URLs, clipboard payloads, and drag data;
- every byte and filename in a `Log Template` or `Log Project`, including packages created by an older RSrender;
- imported images, fonts, hatches, and malformed metadata;
- RSLog/API responses and transport errors;
- file paths returned by the OS, paths reopened later, network/sync/removable storage behavior, and concurrent writers;
- update metadata, installer artifacts, environment variables, command-line arguments, protocol activations, file associations, and support bundles.

### Candidate trust boundary

| Boundary | May hold | Must not be trusted to do |
|---|---|---|
| Sandboxed UI renderer | Render state, transient selection/focus, user gestures, short-lived presentation data | Read arbitrary files, hold long-lived credentials, choose IPC channels, authorize its own `Log Project`, write packages, launch programs, navigate to arbitrary content |
| Narrow preload | One method per approved command/event; DTO marshalling | Expose `ipcRenderer`, Electron events, generic `send`, paths, shell, filesystem, environment, or unrestricted callbacks |
| Main capability broker | Window/session ownership, document IDs and capabilities, OS dialogs, credential broker, update and close coordination | Parse untrusted packages or assets on the UI thread; perform long-running layout/export; accept renderer authorization claims at face value |
| Package/domain utility process | Bounded package bytes, normalized domain DTOs, layout job input | Inherit the full environment, credentials, an authenticated browser session, unrestricted network, or broad filesystem access |
| Export renderer/service | A specific immutable render job and licensed font/asset grants | Browse, open arbitrary URLs, mutate the project, refresh RSLog, or keep credentials |
| Source Adapter service | Narrow RSLog endpoint access and transient credentials after separate authorization | Render UI, modify RSLog, persist secrets in packages/logs, or refresh implicitly |
| Release system | Signing identity, immutable artifacts, feed promotion, SBOM/notices | Build from unpinned inputs, expose signing keys, or publish an unsigned partial release |

**Inference:** OS processes alone do not create least privilege. A Node utility process can still read files and make network requests unless the application and OS constrain it. The prototype must measure and attack each effective capability rather than naming a process “sandboxed.”

## Electron process, renderer, and IPC controls

### Documented platform behavior

Electron warns that it is not a browser: JavaScript can reach the filesystem and shell, arbitrary untrusted content is a severe risk Electron is not intended to handle, and ordinary web flaws have greater impact. Its checklist calls for current Electron, secure content, no Node integration for remote content, context isolation, renderer sandboxing, restrictive CSP, permission handling, navigation/window restrictions, sender validation on every IPC message, a custom protocol instead of `file://`, fuse review, and no broad Electron API exposure. [Electron security guide](https://www.electronjs.org/docs/latest/tutorial/security)

`nodeIntegration` has defaulted to false since Electron 5, `contextIsolation` to true since Electron 12, and renderer sandboxing to true since Electron 20. Enabling Node integration disables the renderer sandbox. The main process remains privileged; a sandboxed preload has a limited Electron/Node polyfill but can still leak power if it exposes unsafe APIs. [Electron security guide](https://www.electronjs.org/docs/latest/tutorial/security) and [process sandboxing](https://www.electronjs.org/docs/latest/tutorial/sandbox)

Chromium's Windows design describes a privileged browser **broker** and separate sandboxed **target** processes. The broker defines policy and performs allowed work for targets; the sandbox operates at process granularity and uses Windows restricted tokens, job objects, desktop objects, and integrity levels. **Inference:** Electron renderer sandboxing is meaningful defense in depth, but every capability exposed through preload/IPC is brokered back into a privileged process and must be treated as an intentional policy exception. [Chromium Windows sandbox design](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/design/sandbox.md)

Context isolation gives the preload and page different JavaScript globals, but Electron explicitly says that isolation plus `contextBridge` is not automatically safe. Exposing `ipcRenderer.send` lets page code issue arbitrary messages; the documented safe shape is one filtered method per message. Bridge values use constrained serialization and do not preserve custom prototypes or symbols. [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) and [IPC tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc)

TypeScript erases types when producing JavaScript; its static annotations do not alter runtime behavior. **Inference:** shared TypeScript interfaces improve development but cannot validate a renderer, package, network, or utility-process boundary. [TypeScript for JavaScript programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)

### Candidate renderer invariant

Every UI and export `webContents` should be created with explicit—not default-dependent—preferences:

- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true`;
- no `nodeIntegrationInWorker`, experimental/Blink features, insecure content, popup permission, remote module, or `<webview>`;
- a single packaged preload with a minimal frozen API;
- a restrictive CSP, with a target baseline of `default-src 'none'` and separately enumerated packaged scripts, styles, fonts, images, workers, and connections;
- DevTools and debugging controlled by signed build channel, not by renderer request; and
- no vendor site, user HTML, SVG script, package content, or RSLog response executed as active markup.

This is a **candidate control**. CSP details, worker needs, and the rendering asset pipeline must be proven without weakening isolation.

### IPC contract

Each command should have a stable name and runtime schemas for request, success, and expected failure. A receiver should, in order:

1. identify the exact sending `WebFrameMain`/`webContents` and reject destroyed, unexpected, child, or navigated frames;
2. verify the parsed origin/host/path against the packaged UI allowlist;
3. resolve the main-owned window, `Log Project` ID, document capability, and current lifecycle state;
4. reject unknown fields, wrong types, invalid identifiers, oversized/deep values, illegal state transitions, and stale request versions;
5. apply command-specific path/data authorization rather than a generic filesystem or shell API;
6. assign a request ID, deadline, cancellation path, and bounded progress protocol for long work;
7. validate the result again before returning a plain DTO; and
8. convert internal errors to stable, redacted error codes while retaining a local correlation ID.

Electron notes that any frame can send IPC and tells applications to validate every sender; URL checks should parse the URL rather than use prefix matching. [Electron security recommendations 17 and navigation guidance](https://www.electronjs.org/docs/latest/tutorial/security)

Electron's `ipcMain.handle` only serializes the `message` property of thrown errors to the renderer. **Inference:** expected failures need an explicit discriminated result type rather than relying on exceptions, stack traces, or Electron's error transport. [Electron `ipcMain`](https://www.electronjs.org/docs/latest/api/ipc-main)

File open/save commands should return a main-owned opaque grant or document handle plus display-safe metadata, not make an arbitrary renderer-supplied path authoritative. The renderer may suggest a filename, but the broker resolves and validates the actual operation. No command should be equivalent to `readFile(path)`, `writeFile(path, bytes)`, `exec`, unrestricted `openExternal`, raw HTTP, or “send on channel.”

## Navigation, windows, protocols, permissions, and active content

### Custom application protocol

Electron recommends avoiding `file://`. `protocol.handle` registers a handler; custom schemes can be registered as `standard`, `secure`, `supportFetchAPI`, `allowServiceWorkers`, `bypassCSP`, and other privileges, and scheme registration must happen before `ready`. Protocol handlers are session-specific. [Electron `protocol`](https://www.electronjs.org/docs/latest/api/protocol)

**Candidate control:** serve only packaged UI through a neutral, configurable scheme such as `rsrender-app://ui/...`, registered `standard` and `secure` with only the additional privileges proven necessary. Do not enable `bypassCSP`; do not serve user packages from the application origin; restrict methods, host, path, query, MIME types, and response headers; normalize and containment-check every lookup. The final scheme is a commercial identity decision, so the literal name above is illustrative.

Imported SVG, HTML, XML, PDF, image metadata, or font names must never become executable markup in that origin. Rendering an imported vector format safely may require rasterization or a constrained parser in a separate process; ticket #20 must decide from a hostile corpus.

### Navigation and external launch

Use `will-navigate`, frame-navigation events, redirect handling, and `webContents.setWindowOpenHandler` to deny by default. An external link may reach the OS browser only after parsing, normalizing, and allowlisting an `https:` destination; `file:`, shell, executable, script, credential-bearing, malformed, and unexpected custom schemes remain denied. Electron specifically warns against unrestricted `shell.openExternal` and arbitrary navigation/new windows. [Electron security guide](https://www.electronjs.org/docs/latest/tutorial/security) and [Electron `webContents`](https://www.electronjs.org/docs/latest/api/web-contents)

RSrender has no initial product requirement to display arbitrary web content. `<webview>` should therefore be absent. Electron's own API reference recommends alternatives and warns that `webview` stability is affected by its out-of-process-iframe architecture; `BrowserView` is deprecated in favor of `WebContentsView`. [Electron `<webview>`](https://www.electronjs.org/docs/latest/api/webview-tag), [BrowserView](https://www.electronjs.org/docs/latest/api/browser-view), and [WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view)

### Permissions and sessions

Electron's security guide states that, unless an application configures a permission handler, permission requests may be approved by default. Session partitions beginning `persist:` retain storage; other partitions are in memory. [Electron security permission guidance](https://www.electronjs.org/docs/latest/tutorial/security) and [Electron `session`](https://www.electronjs.org/docs/latest/api/session)

**Candidate control:** install both permission-check and permission-request handlers for every session before loading content, deny everything by default, and explicitly reject notifications, media capture, geolocation, MIDI, USB, serial, HID, Bluetooth, clipboard-read, downloads, and filesystem access unless a later requirement and threat review adds one. Keep packaged UI storage minimal. If the Source Adapter requires Chromium networking, give it a separately named session; do not share cookies or cache with UI or export renderers.

## Background layout, package parsing, and PDF export

Electron's `utilityProcess.fork` starts a child Node process through Chromium's Services API and communicates through message ports. Its environment defaults to the full `process.env`; it can optionally receive a session/partition for network access, and it emits spawn, error, exit, and message events. It is described as equivalent to `child_process.fork`, not as a renderer sandbox. [Electron `utilityProcess`](https://www.electronjs.org/docs/latest/api/utility-process)

Node worker threads run JavaScript in parallel and can share memory. Node recommends a worker pool for repeated tasks because per-task creation can cost more than it saves. **Inference:** workers are a performance tool inside an already trusted process, not a privilege or crash boundary. [Node.js 24 `worker_threads`](https://nodejs.org/docs/latest-v24.x/api/worker_threads.html)

### Candidate process controls

- Spawn package/layout utilities with an explicit allowlisted environment, app-owned working directory, captured/redacted output, no authenticated session, and no inherited credentials.
- Send only a job ID, bounded bytes or an already-granted read handle, immutable options, and licensed asset grants. Validate both directions.
- Apply deadlines, cancellation, concurrency limits, and observed memory/output limits. Treat unexpected exit as a failed job, never as success with partial output.
- Do not let a parser choose output paths, update state, refresh RSLog, or mutate the open `Log Project`.
- Place each candidate output in an app-owned temporary location, validate it, and let the main broker commit it to a user-approved destination.
- Avoid synchronous parsing, layout, image decoding, font handling, or PDF generation in the main process.

### Options to carry into #20

| Option | Boundary and benefit | Material risk/unknown | Prototype decision evidence |
|---|---|---|---|
| A. Utility parser/layout + hidden sandboxed Chromium export renderer | Separates hostile package work from UI and uses Chromium's text/CSS/PDF pipeline | Utility is Node-capable; hidden renderer lifecycle, font determinism, pagination, GPU behavior, crashes, and accessibility/export parity are unproven | Same golden render job across clean boot, repeated run, GPU modes, fonts, 1/100 pages; parser and renderer crash independently; no UI/main stall |
| B. Utility process with a pure Node layout/PDF engine | One non-UI service can be deterministic and easier to test headlessly | Font/text shaping, CSS-like layout, SVG/image attack surface, PDF features, accessibility metadata, and dependency licenses may be worse | Compare measured text, wrapping, transparency, vector output, PDF page boxes, resource use, determinism, and license footprint against A |
| C. Worker pool inside a utility process | Lower repeated CPU scheduling overhead; shared immutable buffers possible | Shared-process crash and memory corruption blast radius; cancellation and leaked jobs | Load/cancel/crash tests show bounded queue, no cross-job state, and measurable benefit over single utility |
| D. Main-process layout/export | Simplest calls | Blocks lifecycle/security-critical broker and expands compromise blast radius | Negative control only; reject if a hostile or complex job affects input, close, recovery, or other project tabs |

No option receives production status from documentation. A render engine dependency or bundled font cannot be chosen until ticket #20 verifies the exact-version license, asset, SBOM, notice, and clean-room gates preserved by #29's GO.

## Untrusted project/template package integration

The Electron shell must enforce ticket #13's logical package contract independently of whichever container survives #20:

1. Open bytes through a user grant without extracting to an attacker-controlled or shared path.
2. Apply compressed, uncompressed, entry-count, ratio, nesting, name-length, JSON-depth, image-dimension, font-table, page-count, and elapsed-time limits independently and in aggregate.
3. Reject absolute, drive-relative, UNC, device, dot-segment, alternate-data-stream, reserved-name, duplicate-normalized, case-colliding, Unicode-colliding, symlink, hard-link, and special-file entries.
4. Strictly decode and validate the manifest before trusting filenames, sizes, versions, IDs, hashes, or relationships.
5. Treat hashes inside the same package as consistency checks, not signatures or provenance.
6. Decode images/fonts/hatches in the isolated pipeline; never load active package content into the app origin.
7. Keep `Source Snapshot`, `Supplemental Source`, `Presentation Override`, and `Embedded Template Representation` distinct through parse, migration, and save; treat the `Render Dataset` as their derived renderer-facing projection rather than retained source truth.
8. Do not contact RSLog during open or migration. A `Refresh` is a separate, user-accepted Source Adapter operation.
9. Preserve original bytes and complete every migration/validation step before presenting a migrated candidate. Save current format only on explicit Save/Save As.
10. Return structured findings; only the domain layer may turn applicable findings into `Diagnostic`s.

**Prototype hypothesis:** a separate utility process plus bounded parser can contain ordinary decoder/parser failure and prevent renderer/main blocking. It does not prove containment from a native-code exploit; dependency selection, process hardening, OS mitigations, and timely patches remain necessary.

## Credentials and RSLog session boundary

Electron `safeStorage` uses operating-system cryptography for local string encryption. On Windows it uses DPAPI and protects data from other users on the same machine, but Electron explicitly says it does **not** protect against other applications running in the same user space. Availability begins after the app is ready; current APIs include asynchronous operations and re-encryption checks. [Electron `safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage)

Windows Credential Manager's `CredWriteW` creates or replaces a credential in the credential set associated with the current user's logon token; `CredReadW` reads a credential by target and type. [Microsoft `CredWriteW`](https://learn.microsoft.com/en-us/windows/win32/api/wincred/nf-wincred-credwritew) and [`CredReadW`](https://learn.microsoft.com/en-us/windows/win32/api/wincred/nf-wincred-credreadw)

| Candidate | Benefit | Limitation / unknown | Required #20 evidence |
|---|---|---|---|
| `safeStorage`-encrypted token blob in restricted app-owned storage | Electron-owned, cross-platform API; no native binding | Same-user applications may decrypt; app owns deletion, corruption, backup, and rotation behavior | Availability, async latency, sign-out deletion, key rotation, corrupted blob, Windows profile migration, same-user threat documentation |
| Windows Credential Manager through a reviewed binding/helper | Native credential inventory and target identity; enterprise familiarity | Windows-only; native dependency and helper increase supply-chain/patch surface; same-user and enterprise policy behavior need review | Install/update/uninstall lifecycle, multiple accounts, target naming, managed profiles, native-module signing, failure and redaction |
| Supported enterprise/device/browser broker flow | May avoid storing passwords and reduce token exposure | RSLog authentication capabilities and firm identity policy remain unresolved | Verify supported flow, scopes, token lifetime/revocation, offline behavior, browser callback protocol, and policy approval before selection |

Candidate invariant: never persist an RSLog password if a refresh/device token is supported. A renderer must never receive a long-lived credential. The credential broker provides only a command-scoped capability to the authorized Source Adapter, redacts errors, and never serializes a secret into a `Log Template`, `Log Project`, recovery file, recent-file entry, log, crash field, or support bundle.

**Policy unknowns:** approved authentication flow; whether local token persistence is allowed; shared Windows accounts; required idle/session expiry; sign-out and employee-offboarding behavior; device management; and whether client/project data may reside on laptops. These require firm security and Rocscience-authorized API decisions, not an Electron default.

## File dialogs, save/replace, recovery, and recent files

Electron's asynchronous `dialog.showOpenDialog` and `showSaveDialog` invoke native OS dialogs and return cancellation plus selected paths. They are main-process APIs. [Electron `dialog`](https://www.electronjs.org/docs/latest/api/dialog)

Electron's `app.getPath('userData')` is intended for configuration, but the docs warn against writing large files there because it may be backed up to cloud storage. `sessionData` defaults beneath `userData` but can be redirected before `ready`; `logs` and `crashDumps` have explicit paths. [Electron `app.getPath`](https://www.electronjs.org/docs/latest/api/app)

Node 24's `fsPromises.writeFile` performs multiple writes, warns that concurrent writes to the same file are unsafe, and offers `flush: true` to call `filehandle.sync()` after successful writes. That is not a documented end-to-end guarantee that a multi-file package replacement survives every Windows/storage failure. [Node.js 24 file system API](https://nodejs.org/docs/latest-v24.x/api/fs.html)

Windows `ReplaceFileW` replaces one file with another and can create a backup while attempting to preserve selected attributes. It documents access, antivirus/share, encryption, and filesystem errors that an application must surface. [Microsoft `ReplaceFileW`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew)

### Candidate save protocol

For an existing authoritative file, carry ticket #13's sequence into #20:

1. acquire a per-document save coordinator and detect another open RSrender document targeting the same normalized identity;
2. write a uniquely named sibling candidate on the same volume, never a predictable shared-temp name;
3. close/flush the candidate and reopen it through the complete hostile-package reader;
4. verify semantic invariants, expected document ID/revision, and content digest;
5. use a platform replace operation with an explicitly managed backup where supported;
6. reopen the authoritative target and verify the committed revision;
7. retain or remove the backup/recovery candidate according to the observed outcome and retention policy; and
8. acknowledge Save only after the selected durability contract is met, otherwise keep the document dirty and show a non-silent actionable failure.

“Atomic save” remains a **prototype hypothesis**, not product language. Test NTFS local disks, SMB shares, OneDrive/other sync folders approved by the firm, exFAT/removable media, low disk, power/process termination points, read-only targets, ACL denial, antivirus locks, rename denial, path length, case-only rename, concurrent tabs/processes, and an already-open PDF/project target. Define which locations are supported, degraded-with-warning, or rejected.

### Storage ownership

- Authoritative `Log Template` and `Log Project` files live only at user-selected locations.
- Recovery candidates live in an app-owned bounded directory, separate from originals by default, keyed by document ID rather than client/project name.
- Chromium cache/session storage is separate from recovery so cache clearing cannot delete recoverable work.
- Recent-file metadata contains only the minimum path, display name, timestamp, and document kind; it never contains credentials, package bodies, thumbnails with client data, or fields from a `Source Snapshot`, `Supplemental Source`, `Embedded Template Representation`, or derived `Render Dataset`.
- Temporary export and parse artifacts use app-owned unpredictable directories and are deleted on normal completion; stale cleanup is bounded and never recursively targets a computed broad directory.
- Opening a recovery candidate creates a separate recovered document and never silently overwrites the original.

**Policy unknowns:** recovery interval, maximum age/count/bytes, whether recovery data requires additional encryption, acceptable client data on endpoints, whether network/sync paths are supported, recent-file retention, backup count, and user/IT deletion workflow.

## Multiple project tabs and window ownership

The product requirement allows multiple projects in tabs, but the correct Electron topology is unresolved.

| Model | Strength | Cost/risk | #20 measurement |
|---|---|---|---|
| One `BrowserWindow`, one renderer, domain-level tabs | Least renderer memory; simplest cross-tab UI | One renderer crash/compromise affects every tab; focus/selection state can leak; a single large document can stall all tabs | 1/5/20 projects, large canvas, crash, memory/GPU, keyboard focus, screen reader, drag/clipboard, dirty-close sequence |
| One `BaseWindow` with a `WebContentsView` per project/tab | Separate `webContents` lifecycles and potential workload/crash isolation while retaining one top-level window | Higher memory; actual renderer-process allocation is not assumed; manual view sizing/focus/accessibility/lifecycle; all views require identical security controls | Same tests plus PID/process allocation, hidden-view throttling, screen-reader tree, tab switch, renderer restart, window close ordering |
| One `BrowserWindow` per project | Clear OS window lifecycle and task switching; candidate renderer crash separation | Window clutter, more memory, actual renderer-process allocation must be observed, cross-window alignment/clipboard/recent-file UX, close-all coordination | Same tests plus PID/process allocation, multi-monitor, taskbar, session restore, update/restart, modal dialog ownership |

`WebContentsView` is the current Electron view composition API; `BrowserView` is deprecated. [Electron `WebContentsView`](https://www.electronjs.org/docs/latest/api/web-contents-view) and [`BrowserView`](https://www.electronjs.org/docs/latest/api/browser-view)

Regardless of topology, the main/domain layer—not the DOM—owns stable document IDs, authoritative revisions, dirty state, save-in-progress state, target grants, recovery generation, and close/update gates. Every renderer receives only its document capability. A renderer crash must not turn an unsaved document clean, release a save lock prematurely, or authorize another tab to overwrite its target.

## Packaged application hardening

Electron fuses are package-time bits. Current fuses can disable `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS`/extra CA environment handling, and CLI inspection; enable cookie encryption; enable embedded ASAR integrity; force application loading from ASAR; and remove extra `file://` privileges. Electron recommends `utilityProcess` when `RunAsNode` is disabled. Fuse state can be inspected after packaging. [Electron fuses](https://www.electronjs.org/docs/latest/tutorial/fuses)

On Windows, ASAR integrity is supported from Electron 30. It validates the packaged `app.asar` header hash and terminates on mismatch. Electron warns that integrity alone can be bypassed by causing another application directory to load, so it should be paired with `OnlyLoadAppFromAsar`. [Electron ASAR integrity](https://www.electronjs.org/docs/latest/tutorial/asar-integrity)

ASAR is an archive and Electron describes it as only cursory concealment of source. **Inference:** ASAR is packaging, and signed ASAR integrity is installed-code tamper evidence; neither is DRM, a confidentiality boundary, nor validation/authentication for user packages. [Electron ASAR archives](https://www.electronjs.org/docs/latest/tutorial/asar-archives)

Candidate release fuse profile to test:

| Fuse | Candidate state | Gate/side effect |
|---|---|---|
| `RunAsNode` | Disabled | Verify every child use is `utilityProcess`; development/test tooling must not leak into release |
| `EnableNodeOptionsEnvironmentVariable` | Disabled | Confirm enterprise proxy/custom CA strategy does not improperly rely on `NODE_EXTRA_CA_CERTS` |
| `EnableNodeCliInspectArguments` | Disabled | Define separate signed diagnostic channel if inspection is ever authorized |
| `EnableCookieEncryption` | Enabled only if Chromium cookies are actually used | One-way store transition; clear migration/recovery test required |
| `EnableEmbeddedAsarIntegrityValidation` | Enabled | Windows package tool must embed the hash; verify installed binary behavior |
| `OnlyLoadAppFromAsar` | Enabled with integrity | Native/unpacked assets and update packaging must still function |
| `GrantFileProtocolExtraPrivileges` | Disabled | Requires the custom protocol path to be complete |

Ticket #20 must inspect the final installed binaries, not merely the build configuration. Code signing, ASAR integrity, fuses, and package hash each cover different threats.

## Windows signing, installer, update, and rollback options

### Documented constraints

Electron's built-in `autoUpdater` uses Squirrel.Windows for traditional Windows installers and the MSIX updater for detected MSIX packages. Electron's update tutorial supports private/self-hosted Squirrel-compatible servers; its free `update.electronjs.org` service is aimed at public GitHub repositories and is therefore not the internal-firm default. [Electron application updates](https://www.electronjs.org/docs/latest/tutorial/updates) and [`autoUpdater`](https://www.electronjs.org/docs/latest/api/auto-updater)

The updater documentation says a successfully downloaded update is applied the next time the application starts even without an explicit `quitAndInstall` call. **Inference:** checking/downloading may be automatic, but restart must participate in RSrender's dirty-document, save, recovery, export, and close coordinator. [Electron `autoUpdater`](https://www.electronjs.org/docs/latest/api/auto-updater)

Electron Forge's Squirrel.Windows maker produces `Setup.exe`, a full NuGet package, and `RELEASES`; it is a per-user, no-admin installation style and requires handling Squirrel startup events promptly. [Forge Squirrel.Windows maker](https://www.electronforge.io/config/makers/squirrel.windows)

Electron-builder documents Windows signature validation, staged rollouts, generic HTTPS feeds, and NSIS support. It also warns that a bad staged release cannot simply be reused at the same version; a corrected update needs a higher version. Its signing configuration can be set to fail the build when no identity is found. These are candidate-tool claims, not Electron guarantees. [electron-builder auto-update](https://www.electron.build/docs/features/auto-update/), [NSIS target](https://www.electron.build/nsis/), and [configuration](https://www.electron.build/docs/configuration/)

Microsoft SignTool signs, timestamps, and verifies files; current SDK behavior requires explicit digest algorithms for signing and timestamping. [Microsoft SignTool](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool)

Microsoft states that valid OV/EV signatures show a verified publisher but do not guarantee immediate SmartScreen reputation; EV no longer bypasses reputation checks, and Microsoft recommends Artifact Signing for non-Store distribution. Self-signed files behave like unsigned files unless enterprise trust is separately deployed. [Microsoft SmartScreen reputation](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation) and [Windows code-signing options](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)

MSIX App Installer can check on launch or in the background and its current schema can permit updates from any version, enabling a controlled downgrade where OS/version conditions are met. [Microsoft App Installer authoring](https://learn.microsoft.com/en-us/windows/msix/app-installer/how-to-create-appinstaller-file)

Microsoft Intune supports managed Win32 application deployment and supersedence relationships for updating or replacing a prior application. Its current supersedence model has bounded chains and explicit uninstall-previous behavior. [Intune Win32 app management](https://learn.microsoft.com/en-us/intune/app-management/deployment/win32) and [Win32 supersedence](https://learn.microsoft.com/en-us/intune/intune-service/apps/apps-win32-supersedence)

### Options matrix

| Option | Rollout authority and fit | Strengths | Risks / evidence gap | Commercial portability |
|---|---|---|---|---|
| Forge Squirrel + Electron `autoUpdater` + private HTTPS feed | Application-managed; plausible small internal pilot | Electron-native path, per-user/no-admin, simple static artifacts | Squirrel startup events, per-user install, downloaded-update restart semantics, authenticated feed, staged rollout and downgrade policy need custom evidence | Feed, publisher, app ID, certificate, and release tooling must be replaceable |
| electron-builder NSIS + `electron-updater` + private generic feed | Application-managed; per-user or machine options | Documented staged percentage, signature validation, NSIS flexibility | Additional updater/tool dependency; metadata compatibility; bad-stage rollback requires higher version; exact version/license/supply chain unreviewed | Widely deployable but builder/updater contract must not enter domain files |
| Signed MSI/WiX-style package + Intune | Firm IT is sole update authority | Managed rings, detection, required install, supersedence/rollback, centralized policy | IT tenant/capacity unknown; admin/per-machine behavior, installer authoring, repair, file associations, and migration need prototype | Good internal control; later buyer replaces management plane without changing domain model |
| Signed MSIX + App Installer or Intune | Windows/package manager is update authority | Package identity, install/update/repair framework, controlled downgrade options | Virtualization/identity, user-selected file access, protocol/file associations, signing, renderer caches, downgrade and enterprise policy need prototype | Store or enterprise paths possible, but identity transfer and Store policy are separate legal/business work |
| Signed manual installer on an internal share | Humans/IT promote and install a build | Smallest pilot infrastructure; easiest to stop | Slow security patching, version drift, inconsistent rollback/uninstall, manual evidence | Temporary pilot only; not a commercial update strategy |

The architecture should never enable two competing authorities. In an IT-managed channel, in-app updating is disabled and reports only channel/installed-version status. In an app-managed channel, enterprise tools must not independently replace binaries during active use.

### Release and rollback invariants

1. Development, internal pilot, broad internal, and any later external channel use distinct signed configuration and immutable promotion records.
2. Every executable, DLL/native module, installer, and update artifact is signed and timestamped; CI fails closed if identity is missing, and verification runs after packaging and after download.
3. Signing credentials live in an approved signing service/HSM/CI secret boundary, never source, packages, developer disk instructions, logs, or support bundles.
4. Feed URL, certificate/publisher, application identity, protocol, file association, company/brand strings, and telemetry endpoint remain build configuration owned by the distributing entity, not serialized into `Log Template`s or `Log Project`s.
5. Update metadata is HTTPS-hosted, allowlisted, authenticated as the chosen updater supports, bounded, and bound to signed artifact hashes. A compromised feed must not make an unsigned artifact installable.
6. The application exposes pending update/restart state to the lifecycle coordinator. Restart waits for successful save/recovery or explicit user disposition of every dirty document and active export.
7. Release compatibility includes package `formatVersion`/`minReaderVersion`, migration fixtures, previous-app/current-file and current-app/previous-file tests, and recovery compatibility.
8. Application rollback never rolls back a user's file. If an older binary cannot safely read a newer `Log Project`, it refuses non-destructively and directs the user to the compatible version. Migration backups remain user data, not installer payload.
9. A release record includes exact source revision, build environment, Electron/Chromium/Node versions, lockfile, artifact hashes, signatures, SBOM, notices, security tests, migration compatibility, channel, approvals, and rollback successor.
10. Security fixes reach supported users within an organizational SLA shorter than Electron's support window; approaching Electron EOL blocks promotion.

**Policy unknowns:** firm Intune/MSIX/MSI capability; per-user versus per-machine install; required admin rights; supported Windows editions/architectures; proxy/private-CA behavior; pilot rings; offline duration; update deferral; signing owner; publisher name; Artifact Signing eligibility; uninstall data retention; and later Rocscience signing/feed transfer.

## Diagnostics, crash recovery, and privacy

Electron's `crashReporter` uses Crashpad. Crash dumps are stored under an application crash directory; uploading can be disabled, a submit URL is optional, and extra fields have documented size/truncation constraints. `crashReporter.start` should occur early for the processes it covers. [Electron `crashReporter`](https://www.electronjs.org/docs/latest/api/crash-reporter)

**Inference:** minidumps and Node diagnostic reports can contain memory-derived or environment-derived sensitive material even when application log fields are redacted. Upload therefore requires an explicit privacy/security decision; absence of an application-defined secret field is not proof that a dump is harmless.

### Candidate diagnostic classes

| Class | Default content | Retention/export rule |
|---|---|---|
| Application event log | Stable event code, UTC time, app/Electron/OS version, process type, correlation/job/document pseudonymous ID, outcome, duration, coarse resource metrics | Local, rotated, size/age bounded; user-initiated bundle only |
| Domain `Diagnostic` | User-visible binding, overflow, pagination, data, or export finding tied to a domain location | Stored only where the product specification allows; never confused with crash/trace logs |
| Crash dump / utility diagnostic report | Framework/process crash evidence | Local and upload-off by default; separately consented/approved collection and short retention |
| Update log | Channel, current/target version, phase, signature/hash status, stable error code | Local; exclude feed credentials/query tokens and full user paths |
| Package/open/save ledger | Phase, format version, counts/limits, migration IDs, validation result, failure-injection point | No package body, source values, client names, overrides, or raw paths |
| Explicit support trace | Narrow subsystem, start/end time, reason, app configuration manifest | Time-limited, visible indicator, redaction preview, explicit user export; network/body tracing excluded unless separately authorized |

Never log credentials, auth headers/cookies, package bodies, raw `Source Snapshot`, `Supplemental Source`, or derived `Render Dataset` fields, `Embedded Template Representation` bodies, rendered dynamic text, client/project/exploration names, `Presentation Override` values, clipboard content, full recent paths, imported asset bodies, signing secrets, or update-feed credentials. Hashing a value may still enable correlation or guessing; pseudonyms and digests require privacy review.

A support bundle should be generated locally from an allowlisted manifest, display exactly what categories it contains, apply deterministic redaction, exclude dumps unless separately selected, and be saved to a user-selected path. No automatic vendor/cloud upload is assumed for the 30-person internal deployment.

Recovery is not telemetry. Recovery files follow the save/recovery rules above, retain enough source-independent state to restore accepted work, and never contain credentials. A startup recovery scan must be bounded and must parse candidates through the hostile-package boundary.

## Dependency notices, SBOM, and later commercialization

Electron's repository is MIT-licensed, but an Electron binary embeds Chromium, Node.js, codecs/runtime components, and third-party libraries whose notices still apply. The installed product must ship the exact third-party notices for the selected binary and dependencies, not merely a top-level “Electron is MIT” statement. [Electron license](https://github.com/electron/electron/blob/main/LICENSE), [Node.js license](https://github.com/nodejs/node/blob/v24.x/LICENSE), and [Chromium licensing](https://www.chromium.org/Home/chromium-security/understanding-chromium-licenses/)

CycloneDX 1.7 and SPDX 3.0 are current standardized SBOM families; this research does not select one. [CycloneDX specification overview](https://cyclonedx.org/specification/overview/) and [SPDX specifications](https://spdx.dev/use/specifications/)

The dependency controls retained from ticket #29's G5 gate apply to Electron itself, the package/installer/updater toolchain, runtime validators, rendering/PDF engines, archive/image/font parsers, native helpers, logging/crash tools, and build-time packages:

- exact version/commit and cryptographic lock;
- direct and transitive license, notice, source-offer, patent/codec, and attribution obligations;
- maintainer/release cadence, vulnerability history, supported Electron/Node/Windows versions, and native-binary provenance;
- SBOM component identity and installed-file mapping;
- runtime/update network endpoints and data collection;
- bundled asset/font/hatch/icon provenance and PDF-embedding rights;
- replaceability and effect on `Log Template`/`Log Project` portability; and
- written approval record before install or distribution.

Candidate build evidence should contain an SBOM for the exact signed artifact, a human-readable Third-Party Notices file/About surface, and a machine-verifiable association from source revision to installer hash. A vulnerability scan or SBOM is evidence, not proof of legal or security fitness.

Later sale to Rocscience is preserved by keeping publisher identity, application IDs, protocol/file associations, signing service, feed, crash endpoint, installer channel, support links, and brand assets configurable. Domain files must use neutral stable IDs rather than employer/product branding. Transfer still requires title/IP/license/trademark/privacy review; configuration flexibility does not itself create assignable rights.

## Threat-control ledger

| ID | Threat / failure | Candidate controls | Required test or evidence | Residual/policy issue |
|---|---|---|---|---|
| E-01 | XSS or renderer compromise reaches filesystem/shell | Local packaged UI, CSP, sandbox, no Node, context isolation, narrow preload | Inject script through every text/image/SVG/package surface; privileged calls remain unavailable and are logged as rejects | Chromium/preload flaws require current Electron and review |
| E-02 | Child frame or navigated renderer sends a valid IPC shape | Validate exact frame/origin, window/document capability, command state, and schemas | Iframe, stale renderer, cross-tab, post-navigation, destroyed-frame, replay tests all fail closed | Origin design and renderer topology unresolved |
| E-03 | Preload exposes a generic capability | One wrapper per command/event; no raw Electron event/channel/path | API-surface snapshot and adversarial argument fuzzing | Code review and build integrity remain necessary |
| E-04 | Navigation, popup, redirect, protocol activation, or `openExternal` launches attacker content/code | Deny navigation/windows/downloads; parsed HTTPS allowlist; protocol activation validation | Malformed URLs, credentials, Unicode host, redirect, file/shell/custom schemes, popup and download corpus | Exact support links and callback protocols are policy choices |
| E-05 | Custom protocol traverses packaged files or executes user content | Fixed host/path map, normalized containment, explicit MIME/CSP, user packages outside app origin | Traversal, encoded separators, NUL, case/Unicode, method/query, SVG/HTML active-content corpus | Renderer engine flaws remain |
| E-06 | Malicious package exhausts resources, escapes paths, or exploits decoder | #13 bounds; no blind extraction; separate utility; decoder allowlist | Complete hostile corpus for bombs, links, collisions, malformed JSON/images/fonts and cancellation | Native parser compromise not eliminated by process naming |
| E-07 | Utility process inherits credentials/environment/network | Explicit environment, no authenticated session, app cwd, narrow grants, validated messages | Probe environment, filesystem, DNS/network, auth cache, cwd, parent messages in packaged build | Node process is not documented as sandboxed |
| E-08 | Layout/export blocks or crashes app and loses work | Separate job process, deadlines/cancel, immutable input, main-owned dirty/recovery state | Stress, infinite/huge job, renderer/utility kill, OOM simulation, concurrent projects | OS-level resource limits/tool behavior unresolved |
| E-09 | Update feed/artifact tamper, replay, downgrade, or channel confusion | One authority, HTTPS/private feed, signatures/hash, version/channel policy, immutable promotion | Proxy/tamper/replay/wrong-channel/expired cert/offline/partial download tests | Exact updater authenticity guarantees vary by candidate |
| E-10 | Unsigned or partially signed release ships | Fail-closed signing, timestamp, post-build/post-download verification, release manifest | Remove identity, alter EXE/DLL/installer, expired/revoked/time-shift tests | SmartScreen reputation still not guaranteed |
| E-11 | Update restart discards dirty edits or active export | Lifecycle coordinator, explicit pending state, save/recovery before restart | Dirty tabs, failed save, canceled prompt, renderer crash, active export during update | Deferral policy unresolved |
| E-12 | Application rollback cannot read a newer project | `minReaderVersion`, copy-on-open migrations, backups, compatibility suite, non-destructive refusal | N-2/N-1/current app-file matrix, failed downgrade open, recovery from newer build | Duration of backward support is product policy |
| E-13 | Tabs/windows/processes save the same target concurrently | Main-owned target identity and save coordinator, expected revision, validated replace | Two tabs, two windows, two app instances, external editor/sync conflict | Cross-machine conflict strategy unresolved |
| E-14 | Temp/recovery/recent/cache leaks client data | App-owned separate dirs, minimal metadata, bounded retention, secret-free files, cleanup | Crash each write phase, inspect disk/profile/backups/cache/uninstall | Encryption and endpoint policy unknown |
| E-15 | Logs, dump, trace, or support bundle leaks sensitive data | Local-only default, allowlist/redaction, consent, size/age caps, preview | Seed credentials/client/path/source canaries and scan every artifact | Dumps may still contain memory; upload requires policy |
| E-16 | Credentials reach renderer/package/log or survive sign-out | Credential broker, command-scoped Source Adapter capability, vault candidate, redaction | Renderer memory/API, package/recovery/log scan, sign-out/revoke/corrupt/profile tests | RSLog-supported flow still requires evidence and policy approval; #29 no longer blocks the prototype |
| E-17 | Installed app code or fuses are altered/bypassed | Signing, ASAR integrity + only-ASAR, inspected fuses, restricted install channel | Modify ASAR/app dir/binary, set env/debug flags, verify launch/update behavior | Same-user/admin attackers and endpoint controls remain |
| E-18 | Future permission, webview, remote content, or insecure preference silently expands surface | Central secure-window factory, deny permission handlers, config tests, no webview | Static/config snapshot for every WebContents/session and negative permission suite | New Electron versions require requalification |
| E-19 | RSLog/API response or imported active content executes in UI/export origin | Plain DTO/domain rendering, escaping, no raw HTML/SVG, isolated decoders | Active markup/scripts/URLs in every dynamic field and asset type | Required rich text/graphics semantics need later design |
| E-20 | Dependency/build compromise or incompatible license enters release | Gate G5, pinning, provenance, SBOM/notices, signing boundary, reproducible evidence | Clean build comparison, dependency substitution, license/notice completeness, vulnerability audit | Counsel and organizational acceptance remain external |

## Bounded prototype plan for ticket #20

These are prerequisite experiments, not production implementation tasks. Ticket #29 now authorizes them through the product owner's unconditional GO. Use only independently created controls and synthetic `Example Dataset`s. Do not copy vendor assets or use credentials/client data; any later ArcGIS observation or live RSLog traffic work must still follow the recorded clean-room and read-only authorization boundaries.

### P12-1 — Secure shell and packaged-build assertions

Build the smallest throwaway Electron shell with one packaged local page and no product UI. Assert every `webPreferences` value, session permission handler, CSP header, navigation/window handler, custom protocol route, DevTools policy, fuse, ASAR-integrity setting, signature state, and installed file. Attack it with a finite XSS/navigation/protocol/permission corpus.

**Pass:** all unlisted navigation, windows, permissions, protocols, active imports, and privileged globals fail closed in development and installed release builds; security configuration is machine-testable.  
**Eliminate/redo:** any control exists only by a version default, security warning, manual reviewer memory, or unsigned development build behavior.

### P12-2 — IPC and capability adversarial harness

Define three representative commands: read an already-granted project, request Save As, and submit/cancel a render job. Runtime-validate both directions; bind sender to window/document capability; fuzz size, depth, unknown fields, wrong states, stale versions, child frames, navigated frames, replay, cross-tab IDs, late replies, and renderer death.

**Pass:** no renderer selects a raw path or channel, no invalid sender reaches domain/filesystem code, expected failures are stable/redacted, and cancellation/crash leaves authoritative state unchanged.  
**Decision:** establishes the IPC contract pattern and validator performance budget; it does not select a validation library before G5.

### P12-3 — Parser/layout/export process comparison

Compare options A–D with identical synthetic render jobs and malicious packages. Measure main-thread responsiveness, process capabilities, cold/warm time, 1/10/100-page output, memory/GPU, cancellation latency, crash containment, repeated determinism, text measurements, wrapping, transparency, vector/raster content, font substitution, PDF page boxes, and temporary-file cleanup.

**Pass:** one or more options meet the later UX/export accuracy budget without credentials/network, UI stall, or partial-success ambiguity.  
**Decision:** retain the least-capable process topology that meets measured requirements; record why rejected engines/topologies fail. License/asset review remains mandatory.

### P12-4 — Hostile package corpus integration with #13

Run every #13 PKG threat through the proposed broker/utility boundary, including ZIP/SQLite/plain controls, nested/ratio bombs, path classes, normalized duplicates, symlinks, malformed JSON/assets/fonts, unknown versions, migration failure, truncated reads, timeouts, and process termination.

**Pass:** bounded memory/time/output; no extraction escape, active execution, network, credential/environment access, main/UI block, original mutation, or unclassified partial open.  
**Decision:** selects a package/process combination only together with #13's semantic, supportability, migration, and save evidence.

### P12-5 — Save, recovery, concurrency, and storage fault matrix

Instrument every candidate-write/flush/reopen/replace/verify phase and terminate or fault it. Test local NTFS, approved SMB, sync folder, exFAT/removable, low disk, ACL/read-only, antivirus/held handle, long/Unicode/case paths, two tabs/windows/processes, external edits, crash restart, retention cleanup, and uninstall.

**Pass:** each outcome is classified as old-valid, new-valid, or recoverable candidate; never corrupt/ambiguous/silent success. Original bytes survive failed migration/save. Concurrent writers receive a non-destructive conflict.  
**Decision:** define supported storage classes and honest durability wording; choose backup/recovery retention with firm policy.

### P12-6 — Multi-project topology and lifecycle

Prototype the three tab/window models with 1, 5, and 20 synthetic projects. Exercise focus, selection, screen reader, keyboard, multi-monitor, clipboard/drag, hidden views, renderer crash/restart, dirty close, Save As, active export, update restart, memory, GPU, and recovery.

**Pass:** chosen model meets an explicit resource budget and preserves main-owned document identity/dirty state across renderer failure.  
**Decision:** select topology from measured UX/accessibility/crash/resource evidence, not assumed renderer isolation.

### P12-7 — Credential-vault candidates

With synthetic secrets only, test `safeStorage` and a reviewed Credential Manager candidate for availability, sign-in/out, multiple accounts, corruption, rotation, Windows profile change, endpoint policy, install/update/uninstall, renderer isolation, and artifact redaction. Do not probe RSLog until authorized.

**Pass:** renderer/packages/recovery/logs never receive the long-lived secret; sign-out/revoke/delete and unavailable-vault states are explicit and testable.  
**Decision:** requires firm authentication/retention policy and later authorized RSLog flow evidence.

### P12-8 — Installer, signing, update, and rollback bake-off

In isolated Windows VMs, compare the retained deployment candidates using a neutral test identity and no client/vendor assets. Test clean install, repair, update rings, partial/offline/proxy, locked app, first-run events, file/protocol associations, wrong channel, tampered metadata/artifact, signature/timestamp verification, update during dirty work/export, rollback, uninstall, and N-2/N-1/current file compatibility.

**Pass:** one authority controls rollout; unsigned/tampered artifacts fail; update never silently loses work; rollback never mutates user files; firm IT can operate and audit the channel.  
**Decision:** firm IT selects internal authority. A later Rocscience/external channel is a separate G8 decision.

### P12-9 — Diagnostics and redaction canary test

Seed unique synthetic canaries into credentials, paths, source fields, overrides, dynamic text, assets, environment, update URL, and clipboard. Trigger normal events, exceptions, renderer/utility crashes, failed saves, migration, updates, support bundle, optional traces, and uninstall; scan every created/upload candidate.

**Pass:** prohibited canaries appear nowhere outside the explicitly selected recovery/project artifact; retention/rotation/preview/deletion work; network upload is absent by default.  
**Decision:** privacy/security owner approves any optional dump or enterprise upload separately.

### P12-10 — Release/SBOM/license and clean-room gate rehearsal

For the throwaway candidate build, generate the exact dependency/native-file inventory, SBOM candidate, licenses/notices, artifact hashes, signature verification, source/build provenance, vulnerability report, font/asset provenance, and a clean-room fixture manifest. Attempt a build with a missing identity, altered dependency, missing notice, vendor-branded asset, and unapproved font.

**Pass:** release fails closed; the signed artifact maps to its source and complete evidence; prohibited/unapproved assets and dependencies cannot promote.  
**Decision:** choose SBOM/notices tooling only after G5; employer/counsel still decides publication and commercialization rights.

## Decision gates and remaining fog

Ticket #20 can close this research only when it records evidence-backed decisions for:

1. exact supported Electron line and upgrade/EOL SLA;
2. renderer/preload/protocol/session/permission/fuse profile;
3. IPC runtime-schema and document-capability contract;
4. parser/layout/export process topology and resource limits;
5. credential store and authorized RSLog authentication flow;
6. supported storage classes, save durability wording, backup/recovery/retention policy;
7. multi-project window/tab topology and accessibility/resource budget;
8. installer, signing identity/service, single update authority, rings, deferral, rollback, and file compatibility window;
9. diagnostic classes, redaction, retention, support bundle, and upload policy; and
10. exact dependency/asset/font licenses, SBOM/notices format, release evidence, and clean-room approval.

The following are **organization-policy unknowns**, not reasons for implementation agents to improvise: employer/counsel authorization; Rocscience API permission and auth flow; client-data endpoint/storage rules; IT management plane; Windows/ARM support; network/share/sync support; signing owner/publisher; recovery and diagnostic retention; telemetry/crash consent; update deferral/rings; commercialization channel; and future buyer identity transfer.

The following remain **prototype-only hypotheses**: utility-process containment is sufficient; hidden Chromium or a Node PDF engine meets text/export determinism; the candidate save sequence deserves “atomic” language on supported storage; one renderer or one view per tab meets resource/accessibility needs; `safeStorage` or Credential Manager fits firm policy; and any installer/updater candidate provides acceptable controlled rollback.

Until those gates close, implementation agents must not silently select a framework default, generic IPC bridge, renderer filesystem API, package parser, PDF engine, vault, recovery directory policy, installer, updater, telemetry service, bundled font, or license treatment.

## Primary source index

All links were accessed 2026-08-13; version-sensitive Electron API links were evaluated against the 43.4.0 stable baseline stated above.

- Electron: [releases](https://releases.electronjs.org/release/), [schedule](https://releases.electronjs.org/schedule), [versioning](https://www.electronjs.org/docs/latest/tutorial/electron-versioning), [security](https://www.electronjs.org/docs/latest/tutorial/security), [process model](https://www.electronjs.org/docs/latest/tutorial/process-model), [sandbox](https://www.electronjs.org/docs/latest/tutorial/sandbox), [context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation), [IPC tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc), [`ipcMain`](https://www.electronjs.org/docs/latest/api/ipc-main), [`protocol`](https://www.electronjs.org/docs/latest/api/protocol), [`session`](https://www.electronjs.org/docs/latest/api/session), [`webContents`](https://www.electronjs.org/docs/latest/api/web-contents), [`utilityProcess`](https://www.electronjs.org/docs/latest/api/utility-process), [`safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage), [`dialog`](https://www.electronjs.org/docs/latest/api/dialog), [`app`](https://www.electronjs.org/docs/latest/api/app), [fuses](https://www.electronjs.org/docs/latest/tutorial/fuses), [ASAR integrity](https://www.electronjs.org/docs/latest/tutorial/asar-integrity), [updates](https://www.electronjs.org/docs/latest/tutorial/updates), [`autoUpdater`](https://www.electronjs.org/docs/latest/api/auto-updater), and [`crashReporter`](https://www.electronjs.org/docs/latest/api/crash-reporter).
- Node.js 24: [`worker_threads`](https://nodejs.org/docs/latest-v24.x/api/worker_threads.html), [file system](https://nodejs.org/docs/latest-v24.x/api/fs.html), and [license](https://github.com/nodejs/node/blob/v24.x/LICENSE).
- Chromium: [Windows sandbox design](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/design/sandbox.md) and [Chromium licensing](https://www.chromium.org/Home/chromium-security/understanding-chromium-licenses/).
- Microsoft: [`CredWriteW`](https://learn.microsoft.com/en-us/windows/win32/api/wincred/nf-wincred-credwritew), [`CredReadW`](https://learn.microsoft.com/en-us/windows/win32/api/wincred/nf-wincred-credreadw), [`ReplaceFileW`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilew), [SignTool](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool), [SmartScreen reputation](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation), [code-signing options](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options), [App Installer authoring](https://learn.microsoft.com/en-us/windows/msix/app-installer/how-to-create-appinstaller-file), [Intune Win32 app management](https://learn.microsoft.com/en-us/intune/app-management/deployment/win32), and [Win32 supersedence](https://learn.microsoft.com/en-us/intune/intune-service/apps/apps-win32-supersedence).
- Candidate tools/specifications: [Forge Squirrel.Windows](https://www.electronforge.io/config/makers/squirrel.windows), [Forge Windows signing](https://www.electronforge.io/guides/code-signing/code-signing-windows), [electron-builder update](https://www.electron.build/docs/features/auto-update/), [NSIS](https://www.electron.build/nsis/), [electron-builder configuration](https://www.electron.build/docs/configuration/), [CycloneDX](https://cyclonedx.org/specification/overview/), and [SPDX](https://spdx.dev/use/specifications/).
