# AGENTS.md

Guidance for coding agents working in **Org Hierarchy SDK** (`b2vv/dg`).

## Stack (short)

- `packages/core` — Rust → WASM (contours + Ploeg row-tree; canvas paint is TS)
- `packages/sdk` — `@org-hierarchy/sdk` (Pixi render, workers, export, React context menu)
- `packages/demo` — Rsbuild demo (`npm run dev`)
- Spec / TDD / standards: `work/SPEC.md`, `work/TDD.md`, `work/CODING_STANDARDS.md`
- Before implement: [`work/CTO-RESEARCH.md`](./work/CTO-RESEARCH.md) (product, seams, infra, risks). Live P0: `work/tasks/T78-post-t77-critique.md`.

## Commands

```bash
npm install
npm run build:wasm
npm run test:rust
npm test
npm run typecheck
npm run dev
```

## Agent skills

Matt Pocock skills live in `.agents/skills/` (see `skills-lock.json`). Update with `npx skills update`.

### Issue tracker

GitHub Issues on `b2vv/dg` via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root [`CONTEXT.md`](./CONTEXT.md) + `docs/adr/` (ADRs lazy). Also read `docs/REQUIREMENTS.md`, `work/SPEC.md`. See `docs/agents/domain.md`.
