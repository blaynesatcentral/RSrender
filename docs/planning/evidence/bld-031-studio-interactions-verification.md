# BLD-031 Studio interaction verification

## Outcome

BLD-031 replaces the Boring Log Studio's decorative interaction surfaces with bounded,
operable controls. The application now has contextual Home, Layout, Data, Review, and
Publish ribbon panels; independently collapsible Contents branches; native collapsible
Properties groups; working Element and Diagnostics tabs; and constrained independent
scroll regions for both side panes.

This ticket does not close BLD-028. It repairs the product-owner-reported interaction
defects while BLD-029, BLD-032, BLD-033, and final BLD-030 qualification remain open.

## Automated evidence

Focused tests:

- `tests/bld-031-studio-interactions.test.mjs` verifies hierarchy/parentage,
  collapse filtering, all five ribbon tab/panel pairs, Properties tab semantics,
  native disclosure elements, and both constrained scroll regions.
- The existing BLD-025 and BLD-026 Studio route tests remain green.

Packaged evidence is retained in `artifacts/bld-028-integrated-mvp-evidence.json` because
the BLD-031 browser probe deliberately exercises the same final package. Three fresh
memory-only sessions against one executable each proved:

- all five ribbon tabs selected the correct contextual panel;
- Contents collapsed from 63 rows to 1 and expanded back to 63;
- a Properties group closed and reopened;
- Diagnostics and Element tabs each exposed the correct panel;
- at 1100 by 600 pixels, the inspector used `overflow-y: auto`, had real overflow,
  and reached `scrollTop` 656;
- selection, text/style/layout edits, Undo/Redo, and PDF publication still passed;
- zero stderr, removed profiles, and zero remaining RSrender processes.

The package executable SHA-256 is
`bab31519ee1bc5b490caf7844e2b1dbcd4f7bb49a13039103952ab381c02ade4` and the packaged
`app.asar` SHA-256 is
`3af864bb756d0f7ece5eaa9d641f157134215628f9c62abe135146540ab01197`.

## Qualification

- Full test suite: 298/298 passing with `--test-concurrency=1`.
- Formatting, lint, TypeScript build, 11-package boundary check, 11-package
  architecture check, dependency admission (156/156), dependency inventory, and
  package output (44 files) passed.
- No dependency, font, asset, manifest, lockfile, or package-topology change was made.

## Honest progress

After BLD-031, the product-owner MVP remains 65% overall. Operable visible UX rises
from roughly 40% to roughly 50%. Production runtime document/template ingress,
qualified Chromium text measurement, reference-capable scene grammar, and final
reference-fidelity qualification are still incomplete.
