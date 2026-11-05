You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/d1-interaction-store. Another coder (D1-C) works IN PARALLEL on render/* — never touch files outside YOUR list. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, and ONLY your own tests. On `listen EPERM` rerun with the needed permission; busy port → wait+retry. No external store. Package-wide typecheck may show errors in D1-C files (mid-flight) — report, don't fix others.

WORKING FILE: /Users/strelia/projects/dg/work/reports/d1-interaction-store/_impl-D1-B.md — append after every step, first line `NEXT:`, labels FACT/DECISION/NEXT/QUESTION, full test output (no pipes). End with one STATUS line.

READ FIRST (D1-A is LANDED, do not modify): packages/sdk/src/state/InteractionStore.ts, interaction/interactionState.ts — the store you wire in. Plan: work/reports/d1-interaction-store/plan.md (§3 contract, §4 D1-B, §5, §9 rows 1,9,13). spec.md GATE-1 decisions. docs/USAGE.md (you edit it). OrgHierarchyDiagram.ts current selection wiring (~:345-380 selectionStore instantiation + onChange; 739-754 select/toggle/replaceMany/handlePointerSelect; 1042 selected read).

YOUR FILES (exclusive): packages/sdk/src/OrgHierarchyDiagram.ts, docs/USAGE.md, packages/sdk/src/index.ts, and OrgHierarchyDiagram*.test.ts (your own test file only, e.g. OrgHierarchyDiagram.interaction.test.ts).

TASK D1-B — wire the InteractionStore into the facade + public API. TDD: failing success AND failure tests first, RED, implement, GREEN. Point changes behind the existing selection flow — selection behavior must stay byte-for-byte.

1. Replace the private `selectionStore = new SelectionStore(...)` with `new InteractionStore({ onSelectionChange: (sel) => this.callbacks.onSelectionChange?.([...sel]) })` — so `onSelectionChange` keeps firing exactly as today (N1 compatibility, row 13). All existing selection delegate calls (replace/toggle/replaceMany/handlePointerSelect/clear/list/primary) now go through the InteractionStore delegates. No behavior change (AC1, rows 1-4 via existing selection tests).
2. Public `subscribeInteraction(cb: (s: InteractionState) => void): () => void` on OrgHierarchyDiagram — forwards to the store's subscribe (row 9, AC7). A host gets selected+hovered+primary and an unsubscribe.
3. `setHovered(n: NodeRef | null): void` facade entry (public, D1-D demo calls it) — routes to store.setHovered.
3b. **Renderer interaction seam (plan §4.1, you CALL it; D1-C defines it on DiagramRenderer):** after mount/configure,
   call `renderer.setInteractionSource({ getHovered: () => store.state.hovered, setHovered: (r) => store.setHovered(r) })`
   so Pixi nodes can read/write hover through the store. AND subscribe to the store (`store.subscribe`) and on a hovered
   change trigger a repaint via the existing paint path (`renderer.onNeedsPaint?.()` / requestPaint) WITHOUT a scene
   rebuild. `setInteractionSource` is D1-C's method; call it by the §4.1 signature even though DiagramRenderer.ts is
   mid-flight (package typecheck may error there until D1-C lands — report, don't fix).
4. `setData` (and any data-replacing path) calls `this.<store>.reconcile(ref => <ref exists in current data>)` so a hovered node that disappeared is cleared (N2, row 11). Provide the membership predicate from the facade's current data.
5. docs/USAGE.md: document `subscribeInteraction`, the `InteractionState` shape (selected/primary/hovered), and that it is additive (existing `onSelectionChange` unchanged). Note hovered is transient. (AC7; the facadeSurface gate requires every public method in USAGE.)
6. src/index.ts barrel: export `InteractionState` (type) from interaction/interactionState.js; export `subscribeInteraction` is a method (no barrel needed) but ensure `InteractionState` and any new public type are re-exported.

Tests (OrgHierarchyDiagram.interaction.test.ts): selection parity (select→onSelectionChange fires as before, row 1/13); subscribeInteraction receives state on selection AND hovered change, unsubscribe works (row 9); setData clears stale hovered (row 11); existing selection tests stay green. Run only your test file.

Done = your files only; tests GREEN; `npm run typecheck -w @org-hierarchy/sdk` (no NEW errors in your files), `npm run lint`, and the USAGE additions would pass `check:docs` (ensure names present). STATUS line last.
