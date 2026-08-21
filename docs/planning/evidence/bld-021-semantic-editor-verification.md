# BLD-021 Semantic Editor Verification

## Result

**PASS** for the bounded BLD-021/#65 first packaged semantic editor.

Authority: [GitHub #65 activation](https://github.com/blaynesatcentral/RSrender/issues/65#issuecomment-5371851512).

This is bounded S06/D03/D04, bounded P06, and automated semantic/focus evidence. It is not full D03, D06, P06, E01, S07, AT/human acceptance, Phase 1 exit, Production workspace acceptance, MVP, v0.9, pilot, distribution, or release evidence.

## Delivered interaction

The packaged page renders one semantic source/effective-value table, exact source and effective provenance, working/durable revisions, dirty/history availability, Diagnostic facts, a Display Value Override form, Apply, Undo, Redo, Refetch, associated validation text, and one polite atomic status region.

Renderer state is disposable. It retains only the last validated projection plus local draft/focus state. Apply, Undo, and Redo discard the replica after the command result and perform a full revision-bounded query before committed DOM state is shown. Stale revision recovery discards the local projection and performs an unbounded full query. No DOM value becomes document authority.

The page calls only `rsrender.document.getProjection`, `setDisplayValue`, `undo`, and `redo`. It cannot supply request, capability, transport sequence, owner identity/generation, actor, clock, command identity, history identity, or event authority. The renderer bundle has no raw IPC, Node, network, storage, timer/polling, clipboard, capture, Canvas, SVG, image, worker, or remote-code capability.

The BLD-021 route deliberately changes the frozen BLD-020 document CSP only to admit the exact same-origin `rsrender-shell://document/semantic-editor.js` bundle: `script-src 'self'` and `script-src-attr 'none'`. Inline script, eval, remote code, styles, images, connect, workers, frames, objects, and forms remain denied. Exact renderer bytes are digest-verified before BrowserWindow construction.

## Qualification receipts

- Admitted Node: **v24.18.1**, locale `en-US`; packaged Electron: **43.4.0**.
- Pinned integrated `npm run verify`: **253/253 tests PASS** in **471,694.1536 ms**, with zero failures, cancellations, skips, or todos. Package boundaries **11/11**, architecture boundaries **11/11**, dependency admission **156/156**, dependency inventory **156 external / 22 workspace**, and package outputs **44/44** all PASS.
- Focused semantic boundary: **three fresh processes x two repetitions**, each **6/6 PASS**.
- Packaged semantic editor: **three fresh sessions**, each exit zero, empty stderr, no timeout, zero remaining exact executable processes, and verified profile deletion.
- All three sessions retain the same normalized transcript digest `c08379ccb57fd1bb454160d0d4efc05087fd3286379b4d632f21fd2ff6e9b336`.
- Exact transcript: initial source-effective r0/clean; keyboard Apply r1/dirty; full query; keyboard Undo r2/dirty; full query; keyboard Redo r3/dirty; explicit Refetch remains r3; empty, oversized, and multi-target drafts remain r3; invalid-type and invalid-unit boundary requests reject exactly; an independently admitted r4 edit makes the UI's r3 Undo stale, and the UI discards/refetches exact r4 main truth.
- Focus restoration: Apply returns to the value editor; Undo moves to the now-enabled Redo control; Redo moves to the now-enabled Undo control; Refetch returns to Refetch; invalid input moves to the first invalid field.
- Source Snapshot identity, logical digest, encoding digest, Source Context, and Source Project remain exact. All sessions retain source witness digest `809f25b6d41728ac9d05245125b720b0c0daac09792aadd2259f08ee8c39255e`.
- Each session observes one table, two admitted synthetic rows, one polite live region, zero image/Canvas/SVG nodes, exact four API keys, and no Node/Electron globals.
- Navigation and popup attempts are denied in every session.

## Evidence and custody

The normalized artifact is `artifacts/bld-021-semantic-editor-evidence.json`:

- physical SHA-256: `f9ad7f33bdab760d77372ef70a14579848829620c303c2beb6ea8d3ee8b8ae11`;
- qualification window: `2026-08-21T16:12:32.815Z` through `2026-08-21T16:13:44.074Z`;
- exact Electron executable SHA-256: `bab31519ee1bc5b490caf7844e2b1dbcd4f7bb49a13039103952ab381c02ade4`;
- exact packaged `app.asar` SHA-256: `95e620db56376218fc1f59530195a1b389c3bd2cd90436147518171fe62a0355`;
- exact BLD-020 preload SHA-256: `cced17754a4f0f08e639a7c0d5dbf8bc79c995f0976bd81bf09dd1c1831efb7c`;
- exact semantic renderer SHA-256: `3a13f0dba03092c5c5a968059906c610b52e983676bcae384bb5fed884bc2c10`;
- package-lock SHA-256: `c2dbdacab14b924c5566a5ee12d75ce40fa029fa906f8e84d32f17d6bf51d351`;
- custody: repository-safe synthetic only; no screenshots, raw output, host path, credentials, or client data retained;
- manifest, lock, dependency, workspace-edge, font/image/icon/asset, and topology delta: none.

## Rerun and live-launch commands

```powershell
$pinnedDir=(Resolve-Path -LiteralPath '.wayfinder-tmp\admission-resolution\toolchain\node-v24.18.1-win-x64').Path
$env:PATH=$pinnedDir + ';' + $env:PATH
$env:LANG='en-US'; $env:LC_ALL='en-US'
node node_modules\typescript\bin\tsc -b --force --pretty false
node --test tests\bld-021-semantic-editor.test.mjs
node tooling\shell-run-bld021.mjs
Start-Process -WindowStyle Normal '.tmp\bld-021-semantic-editor\out\RSrenderSemanticEditor-win32-x64\RSrenderSemanticEditor.exe'
```

## Mandatory nonclaims

No Canvas/SVG, Contents tree, layout element, direct manipulation/drag, template authoring, Save/Open/package document, RSLog/source transport, Refresh, Supplemental/Resolution/Annotation workflow, Data Track, scene/PDF, representative usability, performance, screen-reader/AT acceptance, signed deployment, pilot, or release.

This is a bounded `S06/D03/D04` packaged semantic edit. It is **not** full `D03`, `D06`, `P06`, `E01`, `S07`, Phase 1 exit, Production workspace acceptance, MVP, v0.9, or release evidence.
