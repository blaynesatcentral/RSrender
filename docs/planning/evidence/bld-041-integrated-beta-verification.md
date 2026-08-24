# BLD-041 integrated working-beta verification

## Outcome

One packaged RSrender executable completed three fresh, isolated sessions covering
the accepted MVP-to-working-beta workflow. The sessions exercised rich
per-occurrence Properties, two-boring navigation and isolation, direct move and
resize, guides and snapping, constrained page-layout authoring, arrangement,
clipboard and grouping, command-authority Undo/Redo, canonical project Save and
reopen, and ordered multi-log PDF publication.

The screen and PDF paths remained renderer-neutral and scene-derived. Every
qualified PDF was tagged, used embedded subset Unicode fonts, and contained zero
raster images. Each probe exited with code 0, wrote zero stderr bytes, left zero
packaged processes, and removed its isolated Electron profile.

## Packaged evidence

Machine-readable evidence is retained in
`artifacts/bld-041-integrated-beta-evidence.json` with SHA-256
`42af5934779dae27860977a9710cbbc9dc549a303d16c13fc0fb1ab35654bf09`.

The exact packaged executable completed:

- a 1,230,099 ms direct-rich-editing session that independently reopened a
  307,780-byte two-boring project with authoritative digest
  `sha256:9fc50a77944a1d906307f1227a4e7add8646c3414b6ac3a6d14b4af5e2970248`
  and inspected a 237,071-byte, three-page PDF;
- a 468,716 ms professional-authoring session that independently reopened a
  302,000-byte project retaining four structured text clones and one group, and
  inspected a 200,430-byte, two-page PDF; and
- a 16,844 ms ordered-publication session that inspected a 199,426-byte, two-page
  PDF in explicit `TEST-02`, `TEST-01` Boring Log order.

The direct session retained its project-owned guide across Save and reopen. The
authoring session retained structured clone/group authority across Save and
reopen. The publication session retained caller-selected Log Set order. All three
normalized inspections verified Letter page geometry, tagged structure, embedded
subset Unicode fonts, ordered extracted titles, no JavaScript, and no images.

## Product correction

The Studio now serializes and de-duplicates lifecycle refresh after a document
command. Undo and Redo remain disabled until the main-owned lifecycle state has
been installed. This closes the observed race where a fast history activation
could mutate shared authority before the UI refreshed its scene and controls.

The aggregate harness uses a hidden qualification-only reliable activation flag,
bounded waits, exact process/profile cleanup, per-session raw checkpoints, and
package-aware PDF inspection. Normal user interaction remains on the product
control path, and dedicated keyboard-workflow probes continue to use native input.

## Qualification

The focused BLD-034 through BLD-041 and BLD-043 through BLD-045 serial regression
set passed 86/86. The complete repository corpus passed 420/420 serially under the
admitted Node v24.18.1 runtime. Formatting, ESLint, TypeScript, package boundaries,
architecture boundaries, deterministic dependency enforcement, dependency
admission, dependency inventory, and the empty-workspace package gate all passed.
No new external package identity or workspace dependency edge was added; the
admitted external identity count remains 156.

## Nonclaims

This evidence does not claim product-owner personal operation, admission of more
than the currently qualified Arial face family, or positive mapping from a real
sanitized RSLog Project Data JSON schema. Those requirements remain represented by
BLD-041 acceptance, BLD-042, and BLD-045. The broader umbrella tracker remains
open.
