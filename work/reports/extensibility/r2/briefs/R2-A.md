You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/extensibility. OTHER coders work IN PARALLEL on render/* (R3) and packages/core (R11) — never touch files outside YOUR list. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, ONLY your own tests: `npm test -w @org-hierarchy/sdk -- createReactPromoteOverlay`. On `listen EPERM` rerun with needed permission; busy port → wait+retry (other coders run tests too). No external store.

WORKING FILE: /Users/strelia/projects/dg/work/reports/extensibility/r2/_impl-R2-A.md — append after every step, first line `NEXT:`, labels, full test output (no pipes). End with one STATUS line.

READ FIRST: work/reports/extensibility/r2/plan.md (rev.2 §1, §3, §4 R2-A, §4.1 seam, §6) + spec.md. Code: packages/sdk/src/react/createReactPromoteOverlay.ts — PromoteSlotProps, the slot render, the FrameBackdrop per-slot imperative pattern (`useImperativeHandle` + `useReducer`, ~:173-181 — COPY THIS PATTERN for interaction refresh), dispose() (~:616), the existing 'transition'/'structural' promote-sync handling. D1 InteractionStore shape (state/InteractionStore.ts), NodeRef (core).

YOUR FILES (exclusive): packages/sdk/src/react/createReactPromoteOverlay.ts (+ its PromoteSlotProps type) + createReactPromoteOverlay.test.ts. Do NOT touch OrgHierarchyDiagram.ts / index.ts (that is R2-B, serialized).

TASK R2-A — enrich the near React card contract with typed interaction props, efficiently. TDD: failing tests first, RED, implement, GREEN. Opt-in: without the interaction seam, byte-for-byte.

1. Add to `PromoteSlotProps` (additive): `selected: boolean`, `hovered: boolean`, `onSelect(mods?: SelectionPointerMods): void`, `onHover(on: boolean): void`.
2. Accept an optional `interaction?: { isSelected(id): boolean; isHovered(id): boolean; subscribe(cb: () => void): () => void; select(id: string, mods?: SelectionPointerMods): void; hover(id: string, on: boolean): void } | null` in the overlay options. `null`/absent → props.selected=false, hovered=false, callbacks no-op; card renders exactly as today (byte-for-byte).
3. **AC3 mechanism (CRITICAL — this is why GATE-2 passed):** do NOT trigger the full `sync()`/`listPromoteCandidates` rebuild on interaction change. Instead each SLOT subscribes to `interaction.subscribe(...)` and, on change, imperative-refreshes ONLY that slot (FrameBackdrop pattern :173-181), reading isSelected(id)/isHovered(id) for its own id. A selection/hover change must re-render only the affected card(s), never re-resolve all card data. onSelect/onHover call interaction.select(id,mods)/hover(id,on).
4. dispose(): unsubscribe every per-slot interaction subscription (no leak), alongside the existing unsubscribe (~:616).

Tests (createReactPromoteOverlay.test.ts): with a fake interaction seam → props.selected/hovered reflect it; onSelect/onHover call the seam; a selection change refreshes ONLY the affected slot (assert other slots' render count unchanged AND no full re-resolve — e.g. spy that listPromoteCandidates/sync is NOT called on the interaction event); without interaction → selected/hovered=false, callbacks no-op, card unchanged; dispose unsubscribes. Use real createRoot+act (like existing tests), not stubs. Each red-if-deleted.

Done = your 2 files only; tests GREEN (full output); `npm run typecheck -w @org-hierarchy/sdk` + `npm run lint` pass. STATUS line last.
