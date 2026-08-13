# RSrender

RSrender is a planning-stage open-source project for producing precise, readable boring logs from RSLog data without relying on RSLog's report-template designer.

The intended product combines deterministic PDF rendering with a layout-design experience inspired by ArcGIS Pro: physical page dimensions, rulers and guides, snapping, layers, exact typography and line weights, reliable overflow behavior, and geotechnical plots that share a real axis.

## Status

Planning only. No renderer or architectural stack has been selected yet.

Planning artifacts belong in [`docs/planning`](docs/planning). Implementation should begin only after the project scope, data boundary, document model, rendering model, and delivery milestones have been decided there.

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
