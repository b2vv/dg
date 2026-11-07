# Wave 1 — mutation evidence (coordinated runner)

**Snapshot:** branch `feat/d3-transitions` @ `bc9a827` + untracked wave-1 files; SHA-256 per file in `_review-wave1-scope.txt`.
**Disposable copy:** scratchpad copy of `packages/sdk/src/render/transition/*.ts` + its only dependency `render/contour/contourMorph.ts`, `node_modules` symlinked to the repo, minimal rstest config (node env). Live working tree NOT mutated. Tests unchanged during the comparison.
**Command:** `node_modules/.bin/rstest run` in the copy. **Baseline:** 58 passed / 0 failed (before and after the series).
**Method:** one mutation at a time, bytes restored after each; KILLED only when a named test assertion failed (format `### [Fnn] file :: test`).

| Mutation | Verdict | Killing test(s) |
|---|---|---|
| M1 reducedMotion ignored | KILLED | resolveAnimate > success: disabled and reduced motion options are quiet |
| M2 'instant' not null | KILLED | resolveAnimate > success: disabled and reduced motion options are quiet |
| M3 invalid → no warn | KILLED | resolveAnimate > failure: invalid option {"option":"toString"} disables animation with exactly one warning // resolveAnimate > failure: invalid option {"option":"unknown"} disables animation with exactly one warning // resolveAnimate > failure: invalid option {"option":42} disables animation with exactly one warning (+21) |
| M4 bounce clamp removed | KILLED | resolveAnimate > success: bounce defaults to zero and clamps at both ends |
| M5 negative damping allowed | KILLED | resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":-1}} disables animation with exact |
| M6 spring retarget zeroes velocity | KILLED | SpringAnimator > failure: position at the threshold is not settled // SpringAnimator > success: retarget preserves momentum without a position jump |
| M7 settled ignores velocity | KILLED | SpringAnimator > failure: position at the threshold is not settled // SpringAnimator > success: retarget preserves momentum without a position jump |
| M8 spring dt clamp removed | KILLED | SpringAnimator > failure: huge dt is bounded to one normal step |
| M9 overflow guard removed | KILLED | SpringAnimator > failure: extreme finite coordinates and coefficients never poison state |
| M10 tween retarget keeps old start | KILLED | TweenAnimator and factory > success: retarget restarts the full duration from current value |
| M11 first prepare animates | KILLED | TransitionController > success: diff enters, updates and exits by kind:id; prepare schedules nothing // TransitionController > success: exiting boxes stay at their last position and re-entry absorbs the fading entr // TransitionController > success: initial, unchanged and size-only frames need no animation |
| M12 animate:false animates | KILLED | TransitionController > failure: disabled and oversized transitions snap and cancel pending frames |
| M13 maxNodes ignored | KILLED | TransitionController > failure: disabled and oversized transitions snap and cancel pending frames |
| M14 zero-change still animates | KILLED | TransitionController > success: initial, unchanged and size-only frames need no animation |
| M15 exiting not faded | KILLED | TransitionController > failure: empty initial targets and removing every target settle without residual frames // TransitionController > success: exiting boxes stay at their last position and re-entry absorbs the fading entr |
| M17 MAX_STEPS clamp removed | KILLED | TransitionController > failure: long frame gaps bound integration work and snap safely even below the cap |
| M18 settle cap disabled | KILLED | TransitionController > failure: stalled animators settle at burst cap despite continuous retargeting |
| M19 stop() does not cancel frame | KILLED | TransitionController > failure: abort restores confirmed target set and the last displayed confirmed frame // TransitionController > failure: snap and destroy invalidate even already captured callbacks |
| M20 listener errors not isolated | KILLED | TransitionController > failure: listener exceptions warn once and do not stop other listeners or settling |
| M21 abort keeps refused frame | KILLED | TransitionController > failure: abort before any confirmation restores empty state // TransitionController > failure: abort restores confirmed target set and the last displayed confirmed frame |
| M22 re-entry creates new entry | KILLED | TransitionController > success: retarget starts at current values and keeps animator velocity |
| M23 destroy does not stop | KILLED | TransitionController > failure: snap and destroy invalidate even already captured callbacks |

**Result:** 22/22 KILLED, 0 survived, 0 inconclusive.
**Note for the spec reviewer:** M22 (re-entry creates a fresh entry instead of absorbing the fading one) was killed by the velocity-carry test, NOT by the re-entry test — the re-entry test itself may not discriminate absorption.

## T-A1 delta (after owner decision on tick())
Baseline 59/59. M24 (owed time not dropped → old snap) KILLED by "a 200 ms frame gap drops owed steps and continues animating"; M24b (owed time kept) KILLED by the same; M22 (re-entry creates new entry) now KILLED by the re-entry test itself ("re-entry absorbs the fading entry") and the velocity test. Baseline after: green.
Directive check: removing `max-classes-per-file` directive from animators.ts in a scratch copy → `oxlint -c .oxlintrc.json` exit 1, `eslint(max-classes-per-file): File has too many classes (2)` — the rule IS active (`pedantic: error`); the standards finding "inert directive" was incorrect.
