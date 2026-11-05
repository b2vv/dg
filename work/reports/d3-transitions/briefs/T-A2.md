You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK in packages/sdk). Branch feat/d3-transitions (already checked out). Another coder (T-E) may be running in parallel on OrgHierarchyDiagram.ts + docs/USAGE.md — do NOT touch those. Do NOT switch branches, create worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS (hard):
- packages/sdk/dist is shared LIVE with another project. Do NOT run `npm run build`, root `npm run typecheck`, `build:types`, or any emitting tsc.
- Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, and ONLY the transition tests: `npm test -w @org-hierarchy/sdk -- transition`.
- Rstest needs a localhost listener: on `listen EPERM` rerun with the permission it needs; if a port is busy, wait and retry — do NOT change config.
- No external checkpoint/store. No files outside the repo except the working file.

WORKING FILE: /Users/strelia/projects/dg/work/reports/d3-transitions/_impl-T-A2.md
Append AFTER EVERY STEP. First entry BEFORE first tool call: a `NEXT:` line. Labels FACT/DECISION/NEXT/QUESTION. Paste FULL test output (no pipes). End with one line: `STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` + reason.

CONTEXT — a confirmed wave-1 FALSE GREEN. The controller's acceptance #11 ("unchanged data with animate:true → 0 animation frames") passes only because `TransitionController.test.ts` uses a fake `LinearAnimator` whose `settled` is `value === target`. With the REAL factory it FAILS: `TransitionController.prepare` calls `entry.opacity.retarget(1)` for every retained key, and the real `TweenAnimator.retarget` unconditionally sets `elapsedMs = 0`, so `settled` (`elapsedMs >= durationMs`) becomes false even when opacity is already exactly 1. Result: an unchanged `prepare(..., {animate:true})` on a scene with ≥1 retained node makes `isActive()` true and `start()` requests a frame — violating #11. (x/y/scale use SpringAnimator whose `settled` is distance-based, so they are fine; only the opacity TweenAnimator is wrong.)

YOUR FILES (exclusive): packages/sdk/src/render/transition/animators.ts, animators.test.ts, TransitionController.test.ts. (You may ALSO read, but NOT modify, TransitionController.ts.)

TASK T-A2 — make the animator honour "retarget to the current value = no motion, stay settled", so #11 holds through the real factory. TDD, RED first.

1. RED (two failing tests, paste the red output):
   a. animators.test.ts: a real `TweenAnimator` whose current value is V; `retarget(V)` → `settled` stays `true` and `advance(FIXED_DT)` leaves `value === V` and requests nothing. (Before the fix this is false because `settled` becomes false.)
   b. TransitionController.test.ts: a NEW test wired with the REAL `createAnimator` (import from `./animators.js`), NOT the LinearAnimator fake. Seed a scene with ≥1 node, `prepare(targets,{animate:true})`, drive to settle, `confirm()`, then `prepare(SAME targets,{animate:true})` again → assert `isActive() === false` and that `start()` requests ZERO frames (use the existing fake FrameClock to count requests). This reproduces #11 through the real factory.
2. FIX: in `TweenAnimator.retarget`, if `target === this.current` leave `elapsedMs` at `durationMs` (stay settled) and set `this.start = this.current; this.target = target;` — i.e. an idempotent retarget to the current value, matching SpringAnimator's natural no-op behaviour. Do NOT change `settled`'s definition, `advance`, `snap`, or SpringAnimator.
3. GREEN: both new tests pass; the FULL transition suite stays green: `npm test -w @org-hierarchy/sdk -- transition` (paste full output). Keep the existing LinearAnimator-based tests as they are — do NOT delete them; the point is the real-factory test now guards the behaviour the fake could not.

Done = animators.ts + the two test files only; all transition tests GREEN; `npm run typecheck -w @org-hierarchy/sdk` and `npm run lint` pass. Full outputs in the working file.
