# RSrender

RSrender is a Windows desktop application for turning structured RSLog project data into editable, publication-quality boring logs. It combines a modern ArcGIS Pro-inspired Contents/Canvas/Properties workflow with deterministic rendering from one renderer-neutral Page Plan and Resolved Page Scene.

## Status

RSrender is a working internal beta. The packaged application can:

- sign in to an authorized RSLog account without persisting credentials;
- select a project and import one or more supported borings in place;
- navigate and edit multiple boring logs from structured data;
- synchronize selection across Contents, Canvas, Properties, graphs, and the Attribute Table;
- edit text, dynamic text, typography, layout, column widths, page setup, lithology appearance, and graph symbology through shared command history;
- Undo/Redo and Save/Reopen authored `.rsrender` projects;
- select all or a subset of borings and export one verified PDF package from the same resolved scene used on screen; and
- use Arial plus bundled Source Sans 3, Source Serif 4, and Source Code Pro faces in Regular, Italic, Bold, and Bold Italic styles.

The source of truth is the known-good build on `main`, recovered from the font-complete beta with current RSLog catalog compatibility and correct in-process project-session replacement. Per-edge border authoring and the broader presentation overhaul remain active work. The bundled-font workflow passes packaged Save/Reopen/Undo/Redo/PDF qualification, while formal BLD-007 production-asset/topology admission remains open; this repository does not claim external release approval.

## Rendering path

```text
RSLog or synthetic structured data
  -> Source Snapshot / Render Dataset
  -> renderer-neutral Page Plan
  -> Resolved Page Scene with integer mpt geometry
  -> semantic HTML/SVG Canvas
  -> shared-scene PDF publication
```

Screenshots, background images, external image generation, and monolithic hard-coded SVG are not rendering authorities.

## Development

The repository is an npm workspace targeting the pinned Node and npm versions in `package.json`.

```powershell
npm install
npm run typecheck
npm test
npm run package:check
npm run architecture:check
```

Use the ticket-specific packaged qualification scripts in `tooling/` for executable workflow evidence. Generated packages and local profiles belong under `.tmp/` and must not be committed.

## Project references

- [Product and architecture planning](docs/planning)
- [Domain language](CONTEXT.md)
- [Architecture decisions](docs/adr)
- [Phased implementation roadmap](docs/planning/specifications/rsrender-phased-implementation-roadmap.md)
- [Future maintainability improvements](future_improvements.md)
- [UX and presentation overhaul plan](ux_overhaul_plan.md)
- [GitHub Issues](https://github.com/blaynesatcentral/RSrender/issues)

Only synthetic or explicitly authorized sanitized fixtures belong in the repository. Never commit RSLog credentials, tokens, raw client responses, or real client/project data.

## License

MIT
