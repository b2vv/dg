You are a Coder in repo /Users/strelia/projects/dg. Branch feat/extensibility. Work ONLY in packages/demo. OTHER coders run IN PARALLEL on packages/sdk (facade R3-C) and packages/core (R11) — never touch files outside YOUR list. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run lint`, ONLY your own tests: `npm test -w @org-hierarchy/demo -- <yourTest>`. On `listen EPERM` rerun; busy port → wait+retry. No external store.

WORKING FILE: /Users/strelia/projects/dg/work/reports/extensibility/r2/_impl-R2-C-demo.md — append after every step, first line `NEXT:`, labels, full test output (no pipes). End with one STATUS line.

READ FIRST: work/reports/extensibility/r2/plan.md §4 (R2-C-demo) + spec.md. R2-A landed the `interaction` seam on createReactPromoteOverlay (createReactPromoteOverlay.ts ~:142-149: isSelected(id)/isHovered(id)/subscribe/select(id,mods?)/hover(id,on)). R2-B landed facade public primitives: `isSelected(ref)`, `isHovered(ref)`, `subscribeInteraction`, `selectNode(ref, mods?)`, `setHovered(ref|null)` (read their exact names/signatures in packages/sdk/src/OrgHierarchyDiagram.ts). Demo: packages/demo/src/app/App.ts:701 `createReactPromoteOverlay({ … })` — the construction site.

YOUR FILES (exclusive): packages/demo/src/app/App.ts (ONLY the createReactPromoteOverlay wiring + building the NodeRef from a slot id) + a demo test for it.

TASK R2-C-demo — wire the demo overlay to the diagram's interaction so the host near-card reflects/drives selection+hover (host-visible side of R2). TDD: failing test first, RED, implement, GREEN.

1. At App.ts:701, pass `interaction` to createReactPromoteOverlay, built from the diagram's public primitives: `{ isSelected: (id) => diagram.isSelected(positionRef(id)), isHovered: (id) => diagram.isHovered(positionRef(id)), subscribe: (cb) => diagram.subscribeInteraction(cb), select: (id, mods) => diagram.selectNode(positionRef(id), mods), hover: (id, on) => diagram.setHovered(on ? positionRef(id) : null) }` where `positionRef(id) = { kind: 'position', id }` (match the NodeRef shape the SDK uses for staff). Do not build a parallel store — go through these SDK primitives (single source).
2. The demo card component can now read props.selected/hovered and call onSelect/onHover (that comes from PromoteSlotProps, already provided by R2-A — verify the demo card passes them through / uses them if it renders selection styling; minimal: ensure the wiring compiles and the seam is passed).
3. If a facade primitive you need is missing or differently named, STOP with a QUESTION naming it (do NOT reach into SDK internals).

Test (demo): constructing the overlay passes an interaction seam; a card onSelect(id,mods) calls diagram.selectNode; a store selection makes props.selected true for that card. Keep it lightweight (the heavy per-slot logic is tested in the SDK R2-A suite). Red-if-deleted.

Done = your demo file(s) only; test GREEN (full output); `npm run lint` passes. STATUS line last.
