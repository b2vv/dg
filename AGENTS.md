# AGENTS.md

Guidance for coding agents working in **Org Hierarchy SDK** (`b2vv/dg`).

## Stack (short)

- `packages/core` — Rust → WASM (contours, tidy / Ploeg layout)
- `packages/sdk` — `@org-hierarchy/sdk` (Pixi render, workers, export, React context menu)
- `packages/demo` — Rsbuild demo (`npm run dev`)
- Spec / TDD / standards: `work/SPEC.md`, `work/TDD.md`, `work/CODING_STANDARDS.md`

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

Single-context: root `CONTEXT.md` + `docs/adr/` (created lazily). Also read `docs/REQUIREMENTS.md`, `work/SPEC.md`. See `docs/agents/domain.md`.
