You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/d1-interaction-store. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, ONLY your own tests: `npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram.interaction`. On `listen EPERM` rerun with the needed permission; busy port → wait+retry. No external store.

WORKING FILE: /Users/strelia/projects/dg/work/reports/d1-interaction-store/_impl-D1-E.md — append after every step, first line `NEXT:`, labels FACT/DECISION/NEXT/QUESTION, full test output (no pipes). End with one STATUS line.

CONTEXT — owner decision (2026-11-06): D1 must NOT change the host's Pixi hover behavior until the host opts in. Right now `OrgHierarchyDiagram.create()` calls `renderer.setInteractionSource({...})` UNCONDITIONALLY (around OrgHierarchyDiagram.ts:523), so the renderer applies related-dimming (staffDimmedIds → alpha 0.45) on Pixi hover for EVERY consumer including hosts that never use the interaction API. That contradicts plan §7 ("host behavior = current until it subscribes"). The renderer is already gated on `interactionSource` (null → nodes keep local hoverRing, no dimming), so ONLY the facade must change.

READ FIRST: work/reports/d1-interaction-store/plan.md §7 + §4.1; packages/sdk/src/OrgHierarchyDiagram.ts (the create() setInteractionSource call ~:523; subscribeInteraction ~:1802; setHovered; the subscribe→onNeedsPaint wiring ~:527-531; destroy/renderCoalesce for cleanup). packages/sdk/src/render/DiagramRenderer.ts setInteractionSource (:226).

YOUR FILES (exclusive): packages/sdk/src/OrgHierarchyDiagram.ts, packages/sdk/src/OrgHierarchyDiagram.interaction.test.ts.

TASK D1-E — make the interaction source OPT-IN (lazy), so an untouched host is byte-for-byte. TDD: failing tests first (RED), implement, GREEN.

1. Do NOT call `renderer.setInteractionSource(...)` in `create()`. Instead add a private `ensureInteractionWired()` that, the FIRST time it runs, calls `renderer.setInteractionSource({ getHovered, setHovered })` AND sets up the subscribe→onNeedsPaint repaint wiring (move the current :527-531 block into it). Idempotent (wires once).
2. Call `ensureInteractionWired()` from BOTH public entry points that signal host intent: `subscribeInteraction(...)` and `setHovered(...)`. (These are the "host opts in" signals, matching plan §7 "until it subscribes".)
3. Until opted in: the store still exists and selection still flows through it (selection parity must stay byte-for-byte — selection does NOT require the interaction source; it uses the store delegates + onSelectionChange as today). Only the RENDERER interaction source (hover routing + dimming + hover repaint) is deferred.
4. On `destroy()`, dispose the paint subscription if it was wired (no leak, no rAF after destroy).

Acceptance (add/adjust tests in OrgHierarchyDiagram.interaction.test.ts):
- **Host-not-opted-in:** after create + a staff render, `renderer.setInteractionSource` was NEVER called; hovering a Pixi node does NOT dim related (no interaction-driven repaint); selection still works and `onSelectionChange` fires as before. (This is the byte-for-byte guarantee — it must be RED before your change, since today the source is set unconditionally.)
- **Opt-in via subscribeInteraction:** calling it wires the source exactly once (a second call does not re-wire); subsequent hover drives the store + repaint.
- **Opt-in via setHovered:** calling it also wires the source once.
- **destroy:** no exceptions; paint subscription disposed.

Done = your 2 files only; tests GREEN (paste full output); `npm run typecheck -w @org-hierarchy/sdk` + `npm run lint` pass. STATUS line last.
