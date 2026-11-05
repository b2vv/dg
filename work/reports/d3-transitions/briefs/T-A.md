You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK in packages/sdk). Branch feat/d3-transitions (already checked out). Another coder works IN PARALLEL in the same checkout on TransitionController.ts — never touch files outside your list. Do NOT switch branches, create worktrees, commit or push.

🔴 packages/sdk/dist is shared LIVE with another project. Do NOT run `npm run build`, root `npm run typecheck`, `build:types`, or emitting tsc. Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, and ONLY your own tests: `npm test -w @org-hierarchy/sdk -- <your test file>`. Rstest needs a localhost listener: if the sandbox denies it (`listen EPERM`), rerun the same command with the permission it needs; if the port is busy because the other coder's run is active, wait and retry — do not change config. Do not write outside the repo and the working file.

WORKING FILE: /Users/strelia/projects/dg/work/reports/d3-transitions/_impl-T-A.md
Append AFTER EVERY STEP (append, not rewrite). First entry before your first tool call: `NEXT:`. Labels FACT / DECISION / NEXT / QUESTION. English. Paste FULL test output (no pipes). Finish with exactly one line: `STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` + reason.

READ FIRST: packages/sdk/src/render/transition/types.ts and constants.ts (the contract — do not modify them; if they look wrong, write QUESTION and stop); work/reports/d3-transitions/plan.md §3, §10 rows #9 #13 #14 #15 #25; work/TDD.md.

YOUR FILES (exclusive): packages/sdk/src/render/transition/animators.ts, resolveAnimate.ts, animators.test.ts, resolveAnimate.test.ts.

TASK T-A (TDD: write failing success AND failure tests first, run them, record RED, then implement, then GREEN):

1. `SpringAnimator implements Animator` — damped spring with stiffness/damping/mass; `advance(dt)` integrates one step of size dt (semi-implicit Euler is fine); `retarget(t)` changes target and KEEPS current velocity (no jump); `snap(v?)` sets value (default: target) and zeroes velocity; `settled` = |value−target| < EPS_POS and |velocity| < EPS_VEL. Never produces NaN for finite inputs; a finite but huge dt must not explode (the controller clamps steps, but the animator itself must stay finite for dt ≤ FIXED_DT).
2. `TweenAnimator implements Animator` — fixed duration (ms, from `resolved.fadeMs`), ease-out-cubic, `retarget` restarts from the current value, `settled` when elapsed ≥ duration.
3. `createAnimator: AnimatorFactory` — 'spring' → SpringAnimator, 'tween' → TweenAnimator.
4. `resolveAnimate(option: AnimateOption | undefined, reducedMotion: boolean): ResolvedAnimate | null`:
   - `undefined`/`false`/`'instant'`/reducedMotion → `null`;
   - `true` → preset 'smooth'; preset string → `ANIMATE_PRESETS[name]`;
   - perceptual `{duration, bounce?}` → physics: mass = 1, dampingRatio ζ = 1 − bounce (bounce default 0, clamp to [0, 0.9]), ω = 2π / duration, stiffness = ω²·mass, damping = 2·ζ·ω·mass (describe the formula in a comment; do not copy code from other libraries);
   - physical `{stiffness, damping, mass?}` → as is (mass default 1);
   - fadeMs = FADE_MS for all;
   - INVALID (non-finite or ≤ 0 duration/stiffness/mass, negative damping, unknown string, wrong type) → `null` and exactly ONE `console.warn` per call naming the bad value (row #25). The diagram must keep working.
5. Tests must prove: 'snappy' settles in fewer FIXED_DT steps than 'gentle' (row #9); `{duration:0.4, bounce:0.1}` resolves identical to `true` (row #9); retarget mid-motion keeps velocity → the value changes by at most one normal step's delta (row #12 at animator level); big-dt safety (row #13 at animator level); reduced motion → null (row #14); 'instant' → null (row #15); invalid → null + one warn (row #25).

Done = your 4 files only; your tests GREEN; `npm run typecheck -w @org-hierarchy/sdk` and `npm run lint` pass (full outputs in the working file).
