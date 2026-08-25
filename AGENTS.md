# AGENTS.md

Guidance for coding agents working in **Org Hierarchy SDK** (`b2vv/dg`).

## Stack (short)

- `packages/core` — Rust → WASM (contours + Ploeg row-tree; canvas paint is TS)
- `packages/sdk` — `@org-hierarchy/sdk` (Pixi render, workers, export, React context menu)
- `packages/demo` — Rsbuild demo (`npm run dev`)
- Spec / TDD / standards: `work/SPEC.md`, `work/TDD.md`, `work/CODING_STANDARDS.md`
- Before implement: [`work/CTO-RESEARCH.md`](./work/CTO-RESEARCH.md) (product, seams, infra, risks). No live P0 — T78 is closed; the open queue is product decisions, see the briefing §7.
- Public API in use: [`docs/USAGE.md`](./docs/USAGE.md) — what hosts call and what they get back.

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

### Knowledge graph (CRG)

`code-review-graph` is wired for this repo: `.mcp.json` starts the MCP server, `.claude/settings.json`
keeps the graph fresh (incremental `update` after edits, `status` on session start), and
`.claude/skills/` holds the explore / debug / refactor / review wrappers.

```bash
code-review-graph build     # full rebuild (268 files ≈ 2.4k nodes / 20k edges here)
code-review-graph status    # nodes, edges, branch and commit the graph was built at
code-review-graph update    # incremental, what the PostToolUse hook runs
```

The graph itself lives in `.code-review-graph/` (~24 MB) and is **gitignored** — every clone builds
its own. Restart the AI tool after cloning so it picks up `.mcp.json`. The graph can lag a fresh
edit, so confirm «untested / no importers» claims against the code before acting on them.

### Issue tracker

GitHub Issues on `b2vv/dg` via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root [`CONTEXT.md`](./CONTEXT.md) + `docs/adr/` (ADRs lazy). Also read `docs/REQUIREMENTS.md`, `work/SPEC.md`. See `docs/agents/domain.md`.
