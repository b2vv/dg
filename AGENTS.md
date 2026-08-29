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

⚠️ The Pocock set is **TypeScript**. It judges `packages/sdk` and `packages/demo`; it has no
subject matter in `packages/core` (Rust), so a Pocock finding on a `.rs` file is wrong by
construction.

### Standards manifest — read before reviewing or planning

[`.claude/standards.md`](./.claude/standards.md) is the yardstick: which docs are a standard and
**which are not**, what each one governs and **on which paths**, the machine gates, and the
measured list of what those gates miss. Global skills (`code-review`, `spec-flow`) read it instead
of guessing, so no per-repo copy of them is needed. Format:
`~/.agents/rules/repo-standards-manifest.md`.

Two facts it records that shape every review here: this repo has **no lint of any kind** (no
ESLint, no oxlint, no clippy, no formatter), and `packages/core` has **no documented Rust
standard** — CI runs `cargo test` only. So TS style is checked by hand, and Rust is judged by
general engineering practice alone.

### Pipeline

research → plan → critique → defense → tests-first → implement → review → report → post-deploy.
Skills: `cto-research` (briefing, freshness gate) · `cto-agenda` (what to do next) ·
`spec-flow` (SDD cycle, gates delegated) · `plan-critique` · `plan-defense` · `acceptance-spec` ·
`tdd` · `code-review`. Parallel work uses the durable ledger and 4-status protocol
(`~/.agents/rules/subagent-orchestration-ledger.md`); who may judge whose artifact is
`~/.agents/rules/multi-model-roles.md`.

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

### Type graph (ttsc-graph)

`@ttsc/graph` is wired alongside CRG: `.mcp.json` starts it, and it answers through one tool,
`inspect_typescript_graph` (`lookup`, `trace`, `entrypoints`, `details`, `tour`, `overview`).
It builds no index of its own — the graph is a byproduct of a real type-check, so every node and
edge is compiler-resolved rather than text-matched, and a `trace` gives the true blast radius of a
type or symbol across both packages.

```bash
npx ttsc-graph dump --cwd . --tsconfig tsconfig.graph.json   # whole graph as JSON
```

`tsconfig.graph.json` exists for this and nothing else: it is the only config spanning both
workspaces, and its `paths` point the demo at the SDK **sources** so cross-package edges land on
code instead of `dist/*.d.ts`. It is not part of any build or `typecheck` script.

Use CRG for call graphs, communities and flows; use this one for questions that follow the type
system across the package boundary. Restart the AI tool after cloning so the tool surfaces.

### Issue tracker

GitHub Issues on `b2vv/dg` via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root [`CONTEXT.md`](./CONTEXT.md) + `docs/adr/` (ADRs lazy). Also read `docs/REQUIREMENTS.md`, `work/SPEC.md`. See `docs/agents/domain.md`.
