# BLD-020 Document Session Route Verification

## Result

**PASS** for the bounded BLD-020/#64 main-owned synthetic DocumentSession and generated four-method packaged route.

Authority: [GitHub #64 activation](https://github.com/blaynesatcentral/RSrender/issues/64#issuecomment-5361229180).

This is bounded P06, E01, D04, S06, PI-16, and PI-20 evidence. It is not full P06/E01, a persisted document workflow, representative editor UI, MVP, pilot, distribution, or release acceptance.

## Delivered boundary

Electron main owns one monotonic `DocumentSessionHost`, exact Document Identity, crypto-fresh Document Owner identity, positive ownership generation, the frozen BLD-019 four-operation service, history, and the current validated projection. Replacement prepares a complete new session before synchronously replacing the slot and closing the prior owner; failure preserves the current slot.

The generated preload exposes only `rsrender.document.getProjection`, `setDisplayValue`, `undo`, and `redo`. Page input omits request, document-owner, ownership-generation, route-generation, capability, sequence, actor, and clock authority. One isolated closure owns bootstrap state, a shared monotonic sequence, and the one-in-flight guard. Domain rejection reasons cross only after strict BLD-019 validation; every bootstrap, transport, lifecycle, or forged-result failure collapses to `DOCUMENT_ROUTE_UNAVAILABLE`.

The broker validates the exact live window, WebContents, top frame, route, current session/document/owner generation, route generation, capability, sequence, closed operation schema, and result relation. Navigation and reload rotate the binding before later dispatch. A previously admitted Application Core operation may linearize, but a lifecycle change before its return drops the late result; the route never claims retroactive cancellation.

The exact preload is generated with the admitted esbuild, staged as `preload/document.cjs`, and digest-verified before BrowserWindow construction. Missing, tampered, and valid-but-wrong-route preloads produce the same stable pre-window failure with zero DocumentSession and BrowserWindow authority.

## Qualification receipts

- Admitted Node: **v24.18.1**, `en-US`, UTC.
- Packaged Electron: **43.4.0**; exact executable SHA-256 `bab31519ee1bc5b490caf7844e2b1dbcd4f7bb49a13039103952ab381c02ade4`.
- Pure boundary: **six fresh focused runs**, each **11/11 PASS**, covering the intended three groups x two repetitions.
- Packaged positive: **three fresh sessions**, all exit zero with empty stderr, zero remaining exact executable processes, and verified profile deletion.
- Positive transcript per session: initial projection r0; safe empty-Undo rejection; set r1; full query; Undo r2; full query; Redo r3; two full refetches; denied navigation and redacted stale call; reload with a new route binding and exact r3 reconstruction; denied popup; teardown.
- All three normalized positive transcripts match digest `669a1266ca5667b0556fa022ede335c8c297ec0c3fe24d4776107f83569ca88d`; three retained owner-identity digests are distinct.
- Negative packages: missing, tampered, and wrong-route preload each exit one with stable `DOCUMENT_PRELOAD_UNAVAILABLE`, zero windows, no session, zero remaining processes, empty stderr, and verified profile deletion.
- Exact packaged preload SHA-256: `cced17754a4f0f08e639a7c0d5dbf8bc79c995f0976bd81bf09dd1c1831efb7c`.
- Exact packaged `app.asar` SHA-256: `c4bb18f9db6b5dedc15675f09e7d29908f788313dee710fc9b01297ffb6cc6f5`.
- Integrated pinned `npm run verify`: **247/247 tests PASS** in one run, with zero failures, cancellations, skips, or todos. Enforcement, formatting, lint, typecheck, package boundaries **11/11**, architecture boundaries **11/11**, dependency admission **156/156**, external inventory **156**, workspace inventory **22**, and package outputs **44/44** all PASS. The retained lock SHA-256 is `c2dbdacab14b924c5566a5ee12d75ce40fa029fa906f8e84d32f17d6bf51d351`.

The generated source closures are frozen arity-one functions. Electron 43.4.0 contextBridge proxies them into the main world with observed arity zero; the packaged oracle records that platform behavior while independently proving the exact four-key surface and the source-level arity-one contract.

## Security and effect observations

Every session proves source Snapshot identity, logical digest, encoding digest, Source Context, Source Project, source-original value/provenance, and `sourceBaselineValueDigest` remain exact through set, Undo, Redo, queries, navigation denial, and reload. Initial and Undo dataset digests match; set and Redo dataset digests match; each command/query pair returns the exact same full projection digest. Dirty is false only at r0 and remains revision-true at r1/r2/r3.

The renderer has no `require`, `process`, Electron, raw IPC, capability, route generation, sequence, request ID, command ID, history entry, event, owner identity, actor, or clock surface. CSP, sandbox, context isolation, Node/webview/devtools denial, exact route, permission denial, popup denial, navigation denial, download denial, renderer-network denial, memory-only partition, and certificate-error denial remain main-owned.

The packaged page observes contextBridge proxy arity but no transport details. Raw relational sender/frame/window/document/generation/capability/sequence/schema and hostile graph branches are qualified in the pure broker/preload matrix, where every denial leaves the Application Core and Source authority unchanged.

## Evidence and custody

The normalized artifact is `artifacts/bld-020-document-session-route-evidence.json`:

- physical SHA-256: `303116d4c4958bb16c79edbd1606fba966811d80bc3a784e6b648801623d49bc`;
- window: `2026-08-21T04:49:42.263Z` through `2026-08-21T04:52:16.014Z`;
- custody: repository-safe synthetic only;
- privacy: no capability, raw owner identity, host path, stdout/stderr, credentials, or client data retained;
- manifest/lock/topology delta: none.

The artifact binds the exact application bootstrap, session host, DocumentSession, broker, route contract, security profile, preload runtime/bundle/generator/verifier, main composition, pure tests, packager, runner, package lock, Electron executable, packaged asar, and preload bytes.

## Rerun commands

```powershell
$pinnedDir=(Resolve-Path -LiteralPath '.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64').Path
$env:PATH=$pinnedDir + ';' + $env:PATH
$env:LANG='en-US'; $env:LC_ALL='en-US'; $env:TZ='UTC'
node tooling\generate-document-preload-bundle.mjs --write
node node_modules\typescript\bin\tsc -b --force --pretty false
node --test tests\bld-020-synthetic-override-render-dataset-session.test.mjs tests\bld-020-document-session-route.test.mjs
node tooling\shell-run-bld020.mjs
```

## Nonclaims

No filesystem, Save/Open, package document, source/auth/credential broker, multi-document/window workflow, generic event bridge, arbitrary command, menu/shortcut registry, Canvas/layout/PDF, representative UI, signed release, full P06, or full E01 acceptance is implemented or claimed.

The observed Electron executable/fuse bytes are not fuse hardening, binary hardening, signing, distribution, MVP, pilot, or release evidence. This route remains an in-memory synthetic calibration seam and does not retain state across full application-process restart.
