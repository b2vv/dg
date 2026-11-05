claude-opus-4-8

# Review T-A2 — contract fix for TweenAnimator.retarget idempotence

NEXT: read the diff of animators.ts + the two test files, and the controller use at TransitionController.ts:63-78.

FACT: Production change is exactly one line, animators.ts:71 `this.elapsedMs = target === this.current ? this.durationMs : 0;` (was unconditional `= 0`). Only TweenAnimator.retarget touched. SpringAnimator, advance, snap, settled all unchanged.

FACT: settled getter (animators.ts:66) = `elapsedMs >= durationMs`. advance (81-90) early-returns when settled, and on settle sets `current = target` EXACTLY (line 85). So after any completed tween, current === target bit-exactly → a later retarget(sameTarget) hits the strict-equality branch and stays settled. This is the mechanism that closes #11.

DECISION correctness:
- retarget-to-current (opacity 1→1, unchanged coord): target===current → elapsedMs=durationMs → settled → advance no-ops → value stays. Idempotent. CORRECT, fixes #11.
- enter (opacity 0→1): current=0,target=1 → 1!==0 → elapsedMs=0 → animates. OK.
- exit (→0): current=1,target=0 → animates. OK.
- re-entry absorb (mid-exit 0.3 → retarget 1): 1!==0.3 → animates from current. OK.
- mid-tween retarget to different value (0.5→restart to new target): !== → restarts tween from current. OK (unchanged from old behavior).
- mid-tween retarget to SAME in-flight target (0.5 heading to 1, retarget 1 again): 1!==0.5 → restarts (old behavior). Not suppressed. OK.
No case where target===current wrongly suppresses a needed tween: identical endpoints mean zero visible motion by definition. No case wrongly stays unsettled: the `:0` branch only fires when target!==current which always needs a tween.
Float strict-equality safe because tween settle writes current=target exactly; controller passes literal 1/0 and coords that the prior settled tween reached exactly. Spring (tolerance-based settled) needs no exactness and is untouched.

NEXT: assess test quality then run `npm test -w @org-hierarchy/sdk -- transition`.

FACT: Test run `npm test -w @org-hierarchy/sdk -- transition` → 74 passed, 0 failed. Controller file alone: 15 passed, 0 failed. Both new tests present:
- animators.test.ts "success: retargeting the current value stays settled without motion"
- TransitionController.test.ts "success: unchanged targets with real animators request zero frames"

DECISION test quality:
- animators test: RED before fix — old retarget set elapsedMs=0, so `expect(tween.settled).toBe(true)` after `retarget(1)` on a current=1 animator would fail. Load-bearing assertion is genuine, not true-without-feature.
- controller test: uses REAL createAnimator (not LinearAnimator fake). Non-trivial: asserts isActive()===true during the live transition AND requests()>0 (frames actually ran) before asserting the unchanged re-prepare yields isActive()===false and zero new frame requests. RED before fix on BOTH `expect(c.isActive()).toBe(false)` and `expect(requests()-before).toBe(0)` (retarget opacity→1 would have forced unsettled → active → start() requests a tick). Genuinely closes the false-green hole #11 through the real animator path.

DECISION scope: only animators.ts (1 prod line) + the two test files. LinearAnimator fake KEPT (setup() gained optional createAnimator defaulting to the fake; existing fake-based tests untouched). No change to settled/advance/snap/SpringAnimator. Matches stated scope.

VERDICT: GREEN
