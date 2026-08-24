# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists: it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.
- Existing product docs (always useful here): `docs/REQUIREMENTS.md`, `docs/TECH_STACK.md`, `work/SPEC.md`, `work/CODING_STANDARDS.md`, `work/TDD.md`.
- **Before implementing:** [`work/CTO-RESEARCH.md`](../../work/CTO-RESEARCH.md) — product, codebase seams, infra, dependencies, ranked risks. Do not start a feature until this briefing matches the ticket you are about to touch.

If `CONTEXT.md` / ADRs don't exist yet, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo:

```
/
├── CONTEXT.md                 ← created lazily by /domain-modeling
├── docs/adr/                  ← created lazily
├── docs/REQUIREMENTS.md
├── docs/TECH_STACK.md
├── work/SPEC.md
└── packages/
    ├── core/                  ← Rust WASM
    ├── sdk/                   ← @org-hierarchy/sdk
    └── demo/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (…), but worth reopening because…_
