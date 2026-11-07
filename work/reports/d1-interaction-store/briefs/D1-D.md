You are a Coder in repo /Users/strelia/projects/dg. Branch feat/d1-interaction-store. Work ONLY in packages/demo (the SDK side D1-A/B/C is landed in the working tree). Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/demo` (if noEmit), `npm run lint`, and ONLY your own tests: `npm test -w @org-hierarchy/demo -- <file>`. On `listen EPERM` rerun with the needed permission; busy port → wait+retry. No external store.

WORKING FILE: /Users/strelia/projects/dg/work/reports/d1-interaction-store/_impl-D1-D.md — append after every step, first line `NEXT:`, labels FACT/DECISION/NEXT/QUESTION, full test output (no pipes). End with one STATUS line.

READ FIRST: work/reports/d1-interaction-store/plan.md (§4 D1-D, §4.1, §5, §9 row 8); the LANDED SDK public API you now consume — packages/sdk/src/state/InteractionStore.ts, interaction/interactionState.ts, and the facade additions in OrgHierarchyDiagram.ts (`subscribeInteraction`, `setHovered`) + the relocated selector packages/sdk/src/render/staffRelated.ts (now the SDK home of `relatedStaffIds`). Current demo hover: packages/demo/src/app/StaffChromeBackdrop.ts (installStaffHoverHighlight :71, local relatedStaffIds :47), ShpsStaffCard.ts.

YOUR FILES (exclusive): packages/demo/src/app/StaffChromeBackdrop.ts, packages/demo/src/app/ShpsStaffCard.ts + their *.test.ts.

TASK D1-D — rewire the demo's near-hover to be store-driven through the SDK (row 8, honors owner decision Q4). TDD: failing success AND failure tests first, RED, implement, GREEN.

1. Remove the DOM-imperative `installStaffHoverHighlight` hover path (the one that directly manipulates DOM/alpha on mouseover). Instead: on card pointer enter/leave, call `diagram.setHovered(ref | null)` (the facade method D1-B added); and subscribe via `diagram.subscribeInteraction(state => …)` to drive the related-dimming from `state.hovered`.
2. Use the SDK's relocated `relatedStaffIds` (import from @org-hierarchy/sdk — the barrel/public path, or the SDK module per how the demo imports the SDK) INSTEAD of the demo's local copy. Delete the demo-local duplicate. related-dimming stays a derived selector (not stored).
3. Behavior parity: hovering a seat card still lights its connector/related set exactly as before — but now the state lives in the SDK store, so it is consistent and could be read by both layers. Moving off clears hover.

If the SDK does not expose something you need (e.g. relatedStaffIds not reachable from the demo's import path, or setHovered/subscribeInteraction missing), STOP with a QUESTION naming the exact missing export — do NOT reach into SDK internals or re-implement the selector locally.

Tests (demo): pointer-enter a card → diagram.setHovered called with its ref; subscribeInteraction drives the related highlight; pointer-leave → setHovered(null); related set matches the SDK relatedStaffIds. Would-be-RED-without-feature. Run only your demo test files.

Done = your demo files only; tests GREEN (paste full output); `npm run lint` passes. STATUS line last.
