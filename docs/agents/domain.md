# Domain Docs

How the engineering skills should consume this repository’s domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repository root; or
- `CONTEXT-MAP.md` at the repository root if it exists—it points to one `CONTEXT.md` per context.
- ADRs under `docs/adr/` that affect the area being considered.

If these files do not exist, proceed silently. Do not suggest creating them upfront. The `/domain-modeling` skill creates them lazily when terminology or architectural decisions are resolved.

## File structure

RSrender uses a single-context layout:

```text
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-example-decision.md
│   └── 0002-example-decision.md
└── src/
```

## Use the glossary’s vocabulary

When an issue, proposal, hypothesis, or test names a domain concept, use the term defined in `CONTEXT.md`. Do not drift to synonyms the glossary explicitly avoids.

If a required concept is absent, reconsider whether it belongs to the project’s language or record the gap for `/domain-modeling`.

## Flag ADR conflicts

If proposed work contradicts an existing ADR, surface the conflict explicitly rather than silently overriding the decision.
