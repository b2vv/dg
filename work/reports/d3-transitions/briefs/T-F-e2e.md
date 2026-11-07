You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/d3-transitions (checked out). Wave 2 is landed in the working tree (not yet committed): the D3 staff transition layer across the real facade (OrgHierarchyDiagram), real renderer (DiagramRenderer), real controller (TransitionController), and the React promote overlay. All existing tests are green. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no `npm run build`, no root `npm run typecheck`, no `build:types`, no emitting tsc (dist is shared LIVE with another project). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, and `npm test -w @org-hierarchy/sdk -- <yourTestFile>`. On rstest `listen EPERM` rerun with the needed permission; on busy port wait+retry, don't change config. No external store.

WORKING FILE: /Users/strelia/projects/dg/work/reports/d3-transitions/_impl-T-F.md — append after every step, first line `NEXT:`, labels FACT/DECISION/NEXT/QUESTION, full test output (no pipes). End with one STATUS line.

YOUR FILE (exclusive, NEW): packages/sdk/src/OrgHierarchyDiagram.transitions.e2e.test.ts — create it. Touch NOTHING else (do not modify production code or the other wave-2 test files).

WHY: wave 2 is tested one layer at a time — the facade tests mock the renderer transition seam, the renderer tests use the real controller but no facade, the overlay tests use a fake frame source. Wave 1 already shipped a FALSE GREEN because a fake masked a real contract break. We need exactly ONE thin END-TO-END test that wires the REAL facade + REAL renderer + REAL controller + REAL overlay together with only the clock/rAF injected, so a seam mismatch between layers cannot hide.

READ FIRST for setup patterns (do NOT copy blindly — understand them):
- packages/sdk/src/render/DiagramRenderer.transitions.test.ts — how the REAL engine is driven with a mocked clock (performance.now + requestAnimationFrame spy, manual frame stepping). This is your rAF/clock technique.
- packages/sdk/src/OrgHierarchyDiagram.transitions.test.ts — how a real OrgHierarchyDiagram is created/mounted in rstest, with a small staff data fixture and `animate: true`.
- Any existing OrgHierarchyDiagram*.test.ts that mounts a full diagram with a staff tree — reuse its fixture/mount helper rather than inventing one.
- work/reports/d3-transitions/plan.md §10 rows #2, #3, #4, #11 (the behaviors to assert end-to-end).

THE TEST (keep it THIN — a handful of `it`s, one real diagram, no new production code):
1. Create a real OrgHierarchyDiagram with `animate: true`, reduced-motion false, a small staff tree (one head with ≥2 children), injected clock/rAF. Do an initial render and let it settle (first render must NOT animate — #27).
2. `togglePositionExpand` (or the collapse/expand op the other tests use) on the head → this is an 'animate' pass. Assert END-TO-END, driving frames by hand:
   - requestAnimationFrame IS called (frames actually run) and `diagram.getTransitionFrame()` is non-null DURING the motion;
   - a moving child card's intermediate Pixi position is strictly between its start and its target on some frame (real interpolation, not a jump);
   - after settle: `getTransitionFrame()` is null, requestAnimationFrame is no longer called (0 idle frames, #16), and every card's final position equals the position of the SAME tree rendered with `animate` OFF (±0.5px — the #3/#6 parity, the core "animation changes only the path, not the destination" guarantee). Build the no-animate reference however the existing golden/opt-out test does.
   - `subscribePromoteSync` received `'transition'` at least once during motion and `'structural'` at settle (the real facade→overlay signal path).
3. `#11` end-to-end: with the diagram settled, trigger a render of the SAME tree with animate on → assert 0 animation frames (requestAnimationFrame not called again). This is the wave-1 false-green, now proven through the whole stack.

If any assertion cannot be made to pass because a real seam does not line up, DO NOT paper over it — record a QUESTION with the exact mismatch (file:line on both sides) and stop; that is a real integration defect the coordinator must fix, and catching it is the entire point of this test.

Done = your one new file; its tests GREEN (paste full output); `npm run typecheck -w @org-hierarchy/sdk` and `npm run lint` pass. STATUS line last.
