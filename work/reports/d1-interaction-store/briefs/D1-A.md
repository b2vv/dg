You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/d1-interaction-store (checked out). Do NOT switch branches, create worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no `npm run build`, no root `npm run typecheck`, no `build:types`, no emitting tsc (dist is shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, and ONLY your own tests: `npm test -w @org-hierarchy/sdk -- InteractionStore`. On rstest `listen EPERM` rerun with the needed permission; busy port → wait+retry, don't change config. No external checkpoint/store.

WORKING FILE: /Users/strelia/projects/dg/work/reports/d1-interaction-store/_impl-D1-A.md — append after every step, first line `NEXT:`, labels FACT/DECISION/NEXT/QUESTION, full test output (no pipes). End with one STATUS line.

READ FIRST: work/reports/d1-interaction-store/plan.md (§1 architecture, §3 type contract, §9 acceptance rows 1-6,10,11); spec.md (owner GATE-1 decisions); code packages/sdk/src/state/SelectionStore.ts and interaction/selection.ts (you COMPOSE SelectionStore, do NOT modify it); OrgHierarchyDiagram.ts:664-678 (the notifyPromoteSync listener-isolation precedent to mirror). work/TDD.md.

YOUR FILES (exclusive, new): packages/sdk/src/state/InteractionStore.ts, state/InteractionStore.test.ts, interaction/interactionState.ts.

TASK D1-A — a PURE interaction store (no Pixi, no DOM). TDD: failing success AND failure tests first, record RED, implement, GREEN.

Contract (plan §3):
```ts
// interaction/interactionState.ts
export interface InteractionState {
  readonly selected: readonly NodeRef[];
  readonly primary: NodeRef | null;
  readonly hovered: NodeRef | null;
}
// state/InteractionStore.ts — composes SelectionStore, adds hovered + subscribe.
new InteractionStore(opts?)                 // may take an onSelectionChange passthrough if useful
get state(): InteractionState                // snapshot
// selection delegates (forward to the composed SelectionStore):
replace / replaceMany / toggle / clear / handlePointerSelect / get primary / get list(selected)
setHovered(n: NodeRef | null): boolean       // pure; accepts ANY ref (no data coupling); returns changed?
reconcile(isPresent: (ref: NodeRef) => boolean): void  // N2: if hovered not present → clear it
subscribe(cb: (s: InteractionState) => void): () => void  // returns unsubscribe
```
Rules (plan §1/§3):
- COMPOSE `SelectionStore` (construct it internally); delegate the selection methods. Do NOT modify SelectionStore.
- `hovered` single `NodeRef | null`. `setHovered` is a pure set: accepts any ref (store has no data), returns whether it changed; equal value → no change, NO emit.
- **emit fires on selection change OR hovered change** (N1): the composed SelectionStore's onChange must re-dispatch to `subscribe` listeners too (not only the legacy selection callback). 0-change → 0-emit (row 10, AC6).
- **subscribe/emit invariants:**
  - Isolate each listener: wrap each call in try/catch, warn once per listener (dedup via a WeakSet/Set), mirror OrgHierarchyDiagram.ts:664-678. A throwing listener must NOT stop the others or throw out of emit (Q2).
  - Iterate a SNAPSHOT of the listener set each emit, so unsubscribe DURING emit is safe and does not skip/crash (Q3). unsubscribe is idempotent (calling the returned disposer twice is a no-op). Double subscribe = two distinct entries.
- `reconcile(isPresent)`: if `hovered` is non-null and `isPresent(hovered)` is false → set hovered null (and emit if changed). Keeps the store decoupled from DiagramData (the facade passes a membership predicate).
- NodeRef equality: reuse `sameNodeRef` from interaction/selection.ts.

Tests (InteractionStore.test.ts) — cover acceptance rows: 1 (select→state+emit once), 2 (toggle mods), 3 (clear), 4 (dedup/order), 5 (setHovered emits, selection callback NOT affected), 6 (setHovered(null)), 10 (0-change=0-emit for both selection and hovered), 11 (reconcile clears stale hovered). PLUS failure/edge tests that would be RED without the feature: a throwing listener is isolated (others still run, warn once, emit does not throw); unsubscribe during emit does not crash or skip a remaining listener; unsubscribe is idempotent; selection change emits subscribe (N1). Use a fake data-membership predicate for reconcile.

Done = your 3 files only; tests GREEN (paste full output); `npm run typecheck -w @org-hierarchy/sdk` and `npm run lint` pass. STATUS line last.
