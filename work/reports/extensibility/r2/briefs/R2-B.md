You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/extensibility. ⚠️ You are the ONLY coder touching OrgHierarchyDiagram.ts/index.ts/docs/USAGE.md right now (coordinator-serialized). Keep edits minimal/localized to R2. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, ONLY: `npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram.r2`. On `listen EPERM` rerun; busy port → wait+retry. No external store.

WORKING FILE: /Users/strelia/projects/dg/work/reports/extensibility/r2/_impl-R2-B.md — append after every step, first line `NEXT:`, labels, full test output (no pipes). End with one STATUS line.

CONTEXT — topology correction (GATE re-check GREEN): `createReactPromoteOverlay` is created by the HOST (demo App.ts:701), NOT the facade. So R2-B does NOT pass a sink at a facade overlay-creation point. R2-B = EXPOSE the public primitives a host composes the `interaction` seam from, + document the wiring. The demo wiring itself is R2-C-demo (separate).

READ FIRST: R2-A landed `interaction` seam shape in createReactPromoteOverlay.ts (~:142-149: isSelected(id)/isHovered(id)/subscribe/select(id,mods?)/hover(id,on)). Facade existing public: subscribeInteraction (OrgHierarchyDiagram.ts:1840), setHovered (1846), select (1886, REPLACE-only), getSelection/getSelections, the D1 InteractionStore (handlePointerSelect is PRIVATE via handleNodeSelect :797). Plan work/reports/extensibility/r2/plan.md §4 rev.2.

YOUR FILES (exclusive): packages/sdk/src/OrgHierarchyDiagram.ts, docs/USAGE.md, packages/sdk/src/index.ts, packages/sdk/src/OrgHierarchyDiagram.r2.test.ts (new).

TASK R2-B — make the facade expose exactly what a host needs to build the overlay `interaction` seam, single-source. TDD: failing tests first, RED, implement, GREEN.

1. **NB-A:** add public `isSelected(ref: NodeRef): boolean` and `isHovered(ref: NodeRef): boolean` reading the D1 InteractionStore (so a host builds isSelected(id)/isHovered(id) by constructing the position NodeRef). (Any NEW public OrgHierarchyDiagram method MUST be documented in docs/USAGE.md or check:docs fails.)
2. **NB-B:** the overlay seam's `select(id, mods?)` needs a mods-aware public path; the current public `select` is replace-only and handlePointerSelect is private. Add a public mods-aware select (e.g. `selectNode(ref, mods?)` delegating to the store's handlePointerSelect) — the SDK already has the logic; do NOT make the host re-implement SelectionStore semantics. Document it.
3. **USAGE:** document how a host wires the overlay interaction seam: build `{ isSelected: (id)=>diagram.isSelected(posRef(id)), isHovered: …, subscribe: diagram.subscribeInteraction, select: (id,mods)=>diagram.selectNode(posRef(id),mods), hover: (id,on)=>diagram.setHovered(on?posRef(id):null) }` and pass it to `createReactPromoteOverlay({ interaction })`. State it reflects/drives the SAME interaction state as Pixi (single source) and is inert without opt-in. No facade-creates-overlay claim.
4. Barrel: export any new public type if needed (NodeRef/SelectionPointerMods already public? check).

Tests (OrgHierarchyDiagram.r2.test.ts): isSelected/isHovered reflect the store after select/setHovered; selectNode(ref, shift-mods) ADDS (toggle) not replace; a seam built from these drives the same store the renderer reads. Each red-if-deleted.

Done = your files only; tests GREEN (full output); `npm run typecheck -w @org-hierarchy/sdk` + `npm run lint` pass; USAGE has the new methods (check:docs). STATUS line last.
