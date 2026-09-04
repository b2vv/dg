# AGENTS.md

Guidance for coding agents working in **Org Hierarchy SDK** (`b2vv/dg`).

## Stack (short)

- `packages/core` — Rust → WASM (contours + Ploeg row-tree; canvas paint is TS)
- `packages/sdk` — `@org-hierarchy/sdk` (Pixi render, workers, export, React context menu)
- `packages/demo` — Rsbuild demo (`npm run dev`)
- Spec / TDD / standards: `work/SPEC.md`, `work/TDD.md`, `work/CODING_STANDARDS.md`
- Before implement: [`work/CTO-RESEARCH.md`](./work/CTO-RESEARCH.md) (product, seams, infra, risks). No live P0. The open queue is a mix — agent-ready structural debt (T101, T102 block Б, T103–T106) and product decisions (T80, T56); see the briefing §7 and [`work/AGENDA.md`](./work/AGENDA.md) for the recommended next move.
- Public API in use: [`docs/USAGE.md`](./docs/USAGE.md) — what hosts call and what they get back.

## Commands

```bash
npm install
npm run build:wasm
npm run test:rust
npm test
npm run typecheck
npm run check:docs
npm run dev
```

## Before pushing

Run `npm run check:docs`. It is also a CI job, so a push that skips it fails there instead —
the point of running it first is to find out in a second rather than after a round trip.

It checks three things, each because that drift already happened here and nothing noticed:

- **every relative `.md` link resolves.** Archiving closed tasks left thirteen dead links inside
  the tasks that survived, and twelve more inside the archive index itself;
- **no public method of `OrgHierarchyDiagram` is missing from `docs/USAGE.md`.** That file is not
  merely documentation: the threshold below defines the public API as *what `docs/USAGE.md`
  describes*, so a method absent from it cannot be seen by the rule that decides how carefully it
  may be changed. Twenty-one were missing when the check went in — they are a named baseline that
  may shrink and never grow;
- **`work/CTO-RESEARCH.md` has not fallen more than 25 commits behind `HEAD`.** «More than a few
  merged PRs» was the rule and was unmeasurable; 25 is what it means now.

What the checker cannot judge stays yours: whether a document still says something **true**. This
session found `T56` claiming two features were WASM ten days after they stopped being WASM, and no
gate can catch that — only reading the claim next to the code can. When a change makes a document
wrong, fix the document in the same commit.

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

Two facts it records that shape every review here: TypeScript is checked by **oxlint** in CI and
**oxfmt** is configured but is not a CI gate; `packages/core` still has **no documented Rust
standard** — no `rustfmt.toml`/`clippy.toml`, no written convention — even though CI has gated on
`cargo fmt --check` and `cargo clippy -D warnings` (plus `cargo test`) since `21d3560`. Judge Rust
by general engineering practice and do not apply the TypeScript-only Pocock rules to it.

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

## Durable work log

For every substantial task, persist the work as it happens rather than reconstructing it at the
end. Put long review artifacts, diagrams and lists in a durable file immediately; chat carries
only the summary and the decision. On completion, write the detailed six-section report (plus
post-deploy) to `work/reports/<topic>/` — see `## Артефакти` in `.claude/standards.md` for where
each kind of artifact lives.

Personal note-taking tooling belongs in an untracked `CLAUDE.local.md`, not here: a machine-local
address or a private vault layout is not repository guidance, and this repo has already had one
personal file reach git history.

Before implementing, read `work/CTO-RESEARCH.md`. If it is older than current `main` by more than
a few merged PRs, refresh the briefing before planning; when the briefing and a primary source
disagree, update the briefing rather than trusting the cache.
