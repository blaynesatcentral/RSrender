# BLD-036 multi-boring project navigation verification

## Outcome

The packaged Studio now owns two ordered Boring Logs inside one structured Log
Project. The always-visible Boring Log control supports searchable selection plus
First, Previous, Next, and Last navigation. Contents, Canvas, Properties, title,
ordinal, warning state, and override state refresh together when the active Boring
Log changes.

Selection is retained per Boring Log for the current workspace session. Navigation
does not create a document-history revision. Edits in either Boring Log route
through the same project command/history authority while remaining scoped to their
distinct source fields. The renderer-neutral assembler and application contract
now retain an ordered maximum of 256 simultaneous presentation overrides; duplicate
enabled targets, invalid baselines, provenance drift, type drift, and unit drift
remain fail-closed.

## Structured project authority

- One project session owns the ordered Boring Log documents, one merged Source
  Snapshot, one Log Set, one command/history service, and per-document layout jobs
  and semantic bindings.
- The merged Source Snapshot retains two distinct Exploration records under one
  source-project scope. Duplicate Boring Log or Exploration identities and
  cross-project inputs are rejected.
- The v2 Log Project package stores the ordered `layoutJobs` array and requires its
  Exploration order to match the Log Set memberships exactly.
- The v1 single-boring package remains decodable, with its one `layoutJob` exposed
  through the compatibility and array views.
- Screen projections are rebuilt from the active structured layout job, shared
  effective dataset, integer-mpt layout, deterministic Chromium text results, and
  semantic SVG. No raster or saved SVG is used as project authority.

## Packaged evidence

Machine-readable evidence is retained in
`artifacts/bld-036-multi-boring-navigation-evidence.json` with SHA-256
`c1e9f8a0a50cbab996e9bd342a0647aa69ee0dc90f012b5cfb8f0d6382dd86bf`.

The final packaged probe verified:

- Electron 43.4.0 exited with code 0, zero stderr, zero remaining packaged
  processes, and a removed isolated profile;
- 35 owned commands were visible and the three-pane semantic SVG contained 328
  vector nodes, 90 semantic elements, and no raster element;
- navigation from Boring 1 to Boring 2 and back preserved each Boring Log's
  selected lithology interval;
- navigation left the working revision unchanged, while the second-boring edit
  advanced it exactly once;
- independent first- and second-boring descriptions remained effective with a
  visible `Has overrides` indicator in each document;
- Boring 2's active renderer-neutral scene exported and reopened as a 127,604-byte
  PDF with digest
  `sha256:9551f657417d8d653fec9eb912d9ac24aaf9dc75d6785cc9cc9107f1bf08a0d2`;
- Save As and a second Save completed at working/durable revision 11;
- the independently reopened 303,215-byte project had authoritative digest
  `sha256:b94b149d8c87fefc914ea754b98907c4373e6dfaf9750b284fef788253e14f9a`;
  and
- the reopened v2 package contained two layout jobs, two ordered Log Set
  memberships, two Source Snapshot Explorations, one override collection, three
  effective override items, and three distinct override target entities.

## Qualification

The exact cross-boring authority regression creates simultaneous material-description
overrides for both Boring Logs through one history service and verifies that both
effective values survive. The route regression admits all four bounded navigation
operations through the capability-bound main-process broker. The packaged proof
exercises the complete renderer UI to preload to route to project authority path,
then saves and independently reopens the result.

The complete top-level corpus passed 323/323 serially under the admitted Node
v24.18.1 runtime. The post-enforcement BLD-007 suite passed 32/32. Formatting,
lint, TypeScript, package boundaries, architecture boundaries, deterministic
dependency enforcement, dependency admission, dependency inventory, and the
workspace package gate all passed. No new workspace dependency edge or external
package identity was added; the admitted external identity count remains 156.

## Nonclaims

This ticket qualifies the exact packaged two-Boring-Log vertical slice. It does not
claim the 64-document input ceiling as a stress-tested resource threshold, persist
workspace selection across application restarts, add freeform grouping/reordering,
or solve large-project scene-build performance. Those remain beta scope. Rich text,
direct manipulation, draggable column/header/footer geometry, and broader ArcGIS
layout authoring remain later tickets.
