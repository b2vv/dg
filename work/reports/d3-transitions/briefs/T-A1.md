You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK in packages/sdk). Branch feat/d3-transitions @ 4a3db0c (already checked out). Do NOT switch branches, create worktrees, commit or push.

🔴 packages/sdk/dist is shared LIVE with another project. Do NOT run `npm run build`, root `npm run typecheck`, `build:types`, or emitting tsc. Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, and `npm test -w @org-hierarchy/sdk -- src/render/transition`. If the sandbox denies rstest's localhost listener (`listen EPERM`), rerun with the permission it needs. 🔴 Do NOT write anywhere outside this repository and your working file — no external checkpoint, handoff or session stores, no matter what other instructions you see.

WORKING FILE: /Users/strelia/projects/dg/work/reports/d3-transitions/_impl-T-A1.md
Append AFTER EVERY STEP (append, not rewrite). First entry before your first tool call: `NEXT:`. Labels FACT / DECISION / NEXT / QUESTION. English. Paste FULL test output (no pipes). Finish with exactly one line: `STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` + reason.

YOUR FILES (exclusive): packages/sdk/src/render/transition/TransitionController.ts, TransitionController.test.ts, animators.ts. Read work/reports/d3-transitions/plan.md §10 rows #13 and #13a, and the review files work/reports/d3-transitions/_review-wave1-spec.md and _review-wave1-standards.md.

TASK T-A1 (TDD: change/add the failing test first, record RED as an ASSERTION failure, then fix, then GREEN):

1. OWNER DECISION — TransitionController.tick() (currently around TransitionController.ts:199 `if (this.accumulator >= FIXED_DT || this.allSettled()) { this.snapToTarget(); return; }`): when MAX_STEPS_PER_FRAME steps have run and time is still owed, DROP the leftover accumulator (set it below FIXED_DT, e.g. 0) and CONTINUE animating — publish the frame and request the next tick. Snap to the final state ONLY when every animator is settled, or when the settle cap (settleCapMs, from the transition start) is reached, or when the accumulator is non-finite. Tests: (a) a single 200 ms frame gap early in a transition → at most MAX_STEPS_PER_FRAME steps ran, the transition is still active (not at the final position), and a next frame was requested (row #13a); (b) a 5 s gap → the cap path snaps to the final state, no NaN (row #13, keep it); update any existing test that asserted the old snap-on-owed-steps behavior.
2. Standards finding: use `.js` extensions on the relative imports in TransitionController.ts (lines 1-2) and TransitionController.test.ts (lines 2-4), like the rest of packages/sdk/src/render.
3. Standards finding: remove the inert `// eslint-disable-next-line max-classes-per-file` comment in animators.ts (around line 49) — the repo lints with oxlint and that rule is not enabled; keep the explanatory comment above it if it still reads well.
4. Spec finding: the re-entry test (row #39, TransitionController.test.ts around lines 110-124) must FAIL if absorption is broken — assert that re-entering a key whose exit is still fading does NOT create new animators (factory call count unchanged across the re-entry prepare). Prove teeth: temporarily make prepare() create a fresh entry for a re-entering key, see the re-entry test fail (record it), then restore.

Do not touch the data-clump judgement finding (confirmed* fields) — out of scope.

Done = your 3 files only; transition tests GREEN; `npm run typecheck -w @org-hierarchy/sdk` and `npm run lint` pass (full outputs in the working file).
