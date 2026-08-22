# BLD-035 Log Project lifecycle verification

## Outcome

The packaged Studio now exposes working New, Open, Save, and Save As commands for a
bounded `.rsrender` Log Project. Closing a dirty Studio, creating a new project, or
opening another project uses a main-owned Save / Don't Save / Cancel decision. A
canceled or failed save does not discard the current session.

The project package retains the validated structured boring-log layout job, the
Phase 1 project aggregate, and the presentation-override collection. Reopen rebuilds
the renderer-neutral Page Plan and Resolved Page Scene from those inputs rather than
persisting an SVG, screenshot, or raster. Source-original values and effective
override provenance remain distinct.

## Persistence authority

- The renderer receives only a display path and lifecycle result; it cannot choose,
  read, write, replace, or reopen filesystem paths directly.
- The logical package has exactly three canonical JSON entries: `manifest.json`,
  `document/project.json`, and `presentation/overrides.json`.
- The ZIP adapter rejects unexpected entries, encryption, executable paths, Zip64,
  decompression-limit violations, and manifest/content digest drift.
- Save captures one exact working revision, writes and flushes a sibling candidate,
  independently decodes it, replaces against a captured baseline under a sibling
  lock, reopens the committed target, and only then marks that captured revision
  durable.
- An external baseline change is refused. Pre-replacement failure leaves the prior
  target authoritative; a post-replacement verification failure is reported as an
  uncertain outcome rather than false success.
- The admitted target for writable operation is an absolute local drive path on a
  fixed NTFS volume with no reparse point in its existing ancestry.

## Packaged evidence

Machine-readable evidence is retained in
`artifacts/bld-035-log-project-lifecycle-evidence.json` with SHA-256
`1196004f8b8651d6ca67191abdf9072210d2bcac6cc904375ebe8e7355efb2f5`.

The final packaged probe performed a visible layout edit, Save As, a second Save,
and an independent main-side reopen. It verified:

- Electron 43.4.0 exited with code 0, zero stderr, zero remaining probe processes,
  and a removed fresh profile;
- the saved project was 159,758 bytes with authoritative logical digest
  `sha256:e2b62fa88a64a69922585706852d3b87432924982a0c94478d75b017e2a73a36`;
- reopened document identity `urn:rsrender:boring-log:test-01`;
- one presentation-override collection and preserved source originals; and
- working revision 9 equaled durable revision 9 after the independently verified
  second save.

## Qualification

The focused BLD-035 persistence and Studio regression set passed 7/7. The full
serial corpus passed 318/319 before topology recording; the sole failure was the
intentional BLD-007 fail-closed response to the six then-unrecorded internal
workspace edges. After recording them, the complete BLD-007 suite passed 32/32, so
all 319 top-level tests are qualified across the serial full run and the exact
post-admission rerun. Formatting, lint, TypeScript, package boundaries, architecture
boundaries, deterministic dependency enforcement, dependency admission, dependency
inventory, and the workspace package gate all passed.

## Topology admission

BLD-035 adds six owned-workspace edges and no new external dependency identity. The
already-admitted `@zip.js/zip.js@2.8.49` identity is reused. Exact edges, lock digest,
and evidence digest are recorded in the BLD-007 topology approval and the product
owner's issue comment.

## Nonclaims

This ticket does not add autosave, crash-recovery retention, recent-file history,
cloud/network storage, reusable Template editing, installer/update behavior, or the
complete release fault-injection matrix. New/Open currently replace the active
single-document session by relaunching the packaged application after validation.
Those nonclaims do not weaken the verified single-project structured-data lifecycle,
but they remain beta work where later tickets require them.
