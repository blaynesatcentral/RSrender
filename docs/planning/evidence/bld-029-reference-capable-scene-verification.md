# BLD-029 reference-capable scene verification

BLD-029 expands the structured synthetic boring-log document and renderer-neutral scene grammar. It does not use, embed, trace, or render the supplied read-only client reference image.

## User-visible result

- The packaged Studio and exported PDF now render a two-row project metadata header; one-foot depth ticks; interval-specific material fills; split-spoon sampler symbols; structured ordinary and partial-penetration blow sequences; explicit refusal outcomes; a shared N/moisture/PL-LL plot; typed legend symbols; notes; an approval seal/signature area; and a structured completion note.
- Screen SVG and PDF continue to consume the same 319-node, 88-semantic-identity Resolved Page Scene.
- The initial structured scene has zero text-overflow Diagnostics with the current admitted text authority.
- The retained PDF is `output/pdf/rsrender-boring-log-mvp.pdf`. It is one 612 x 792 point tagged page with embedded subset Unicode fonts, zero images, 319 represented scene nodes, and 100% coverage of the 105 expected unique text tokens.

## Structured authority

- Fixture `mvp-boring-log-test-01@r3` uses frozen digest `sha256:e93e5352f12c8ea89e92dc2dcb7ae9d3762897ca734ec36eebcc37b29276b771`.
- Template `mvp-template-reference-shaped@r2` uses frozen digest `sha256:04035bdc50c92f54d54d7eb5f677b76e16259eae08fe0c7f2d76a423c46a12fb`.
- Oracle revision 2 uses frozen digest `sha256:85b13c7e8fa24ed7e1cd126a3c33a4abc6e8aca1807144f4d4d019ac5f28d35b`.
- The bundle digest is `sha256:1b589ce142aacd574d8eadf9d5950babab86dbc522562b8ab224b3debff0ed2c`.
- Partial penetration is represented as blow/penetration increment pairs. Refusal is explicit and requires a null N result. Material interval fills reference admitted template visual tokens.
- Source-original and effective-override provenance remain distinct; existing command/history routes remain authoritative for supported edits.

## Qualification

- Full regression after the contract and scene expansion: 299/299 PASS using the pinned Node 24.18.1 runtime with test concurrency 1.
- Final affected renderer, Studio, Layout Host, publication, and interaction rerun after the zero-overflow fixture adjustment: 40/40 PASS.
- Formatting: PASS.
- ESLint: PASS.
- TypeScript build: PASS.
- Package boundaries: 11 packages PASS.
- Architecture boundaries: 11 packages PASS.
- Dependency admission: 156/156 identities PASS.
- Dependency inventory: 156 external packages and 22 workspace entries PASS.
- Final three-run packaged qualification: PASS; every process exited cleanly, every PDF passed normalized inspection, and all runs shared scene digest `sha256:52d747c1576c6eb25908cd718485498477b2da663923193602e9db2c8b906874` and projection digest `sha256:b39840dda7cd4325fa21f01cdc469cb67f535ad3fdb3d9cfc647860fdaffe6da`.
- Packaged executable SHA-256: `bab31519ee1bc5b490caf7844e2b1dbcd4f7bb49a13039103952ab381c02ade4`.
- Packaged `app.asar` SHA-256: `a125793bcb3673025ed7bc8a4abb9ecf9595c9888cd76acde9e6a1c4eb68a8eb`.

## Nonclaims and remaining work

- This is synthetic coverage data, not client-data equivalence.
- BLD-029 does not provide production document/template ingress; BLD-032 remains open.
- The current text authority is still the pre-BLD-033 approximation, not the final qualified Chromium/Layout Host shaping authority.
- Final reference-fidelity/collision qualification and product-owner operation remain open in BLD-030 and BLD-028.
- The product-owner MVP is not complete and the umbrella issue remains open.

Honest checkpoint after BLD-029: **72% overall toward the product-owner MVP and approximately 58% of the operable visible UX**.
