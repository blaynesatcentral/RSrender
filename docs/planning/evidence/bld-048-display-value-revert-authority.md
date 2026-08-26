# BLD-048 explicit Revert Override authority

BLD-048 exposes explicit `Revert Override` as a typed, history-backed mutation. The
`presentation-override.revert-display-value` command identifies one admitted local
override by `localOverrideIdentity` and `targetSourceFieldIdentity`, and carries the
expected `overrideRevision` plus `expectedWorkingRevision`. Strict contract decoding
rejects extra, missing, malformed, or stale fields.

The application service removes that item from the retained
`PresentationOverrideCollection`; it does not write the source value into a new
override. The resulting Render Dataset therefore reports the source-original value,
source provenance, and `application.kind: "source"`. The mutation is committed through
the existing project-domain effect/history authority, so `Undo` restores the exact
prior collection and effective override.

The main-owned `DocumentSession` provides `revertDisplayValue(requestId, input)`. The
document route broker validates the same owner, capability, frame, origin, sequence,
and bounded argument envelope as other document commands. The packaged preload
exposes `rsrender.document.revertDisplayValue(input)` through the dedicated
`rsrender:document:revert-display-value:v1` channel and returns only the validated
sanitized command result. The generated preload bundle is regenerated from this
runtime source.

Regression coverage in `tests/bld-048-display-value-revert.test.mjs` proves
override → explicit removal → source-original and Undo → override restoration.
