# RSrender

RSrender is an internal-development project for producing precise, readable boring logs from RSLog data without relying on RSLog's report-template designer.

The intended product combines deterministic PDF rendering with a layout-design experience inspired by ArcGIS Pro: physical page dimensions, rulers and guides, snapping, layers, exact typography and line weights, reliable overflow behavior, and geotechnical plots that share a real axis.

## Status

Wayfinder planning is complete. The decision-complete v0.9 product, domain, UX, architecture, acceptance, and implementation-roadmap package is indexed in [`docs/planning`](docs/planning), with the ubiquitous language in [`CONTEXT.md`](CONTEXT.md) and hard-to-reverse decisions under [`docs/adr`](docs/adr).

Production implementation began with BLD-001. The exact internal-use dependency graph is admitted and locked; the TypeScript/Electron workspace, package boundaries, clean build, tests, dependency checks, and deterministic packaging baseline are active. The build frontier is BLD-001 through BLD-013 in the [phased roadmap](docs/planning/specifications/rsrender-phased-implementation-roadmap.md). Open capability, evidence, organizational, and any future external-distribution gates remain tracked in GitHub; they do not reopen settled product behavior.

## Initial problem statement

RSLog stores the required boring data but its template manager does not reliably support:

- multiple datasets on one graph axis;
- PL–LL intervals alongside moisture and penetration values;
- dependable font sizing, alignment, text wrapping, and overflow handling;
- stable headers and footers;
- exact line weights and page geometry; or
- a professional visual layout workflow.

RSrender will explore a renderer and designer that make those behaviors explicit, testable, and portable.

## License

MIT
