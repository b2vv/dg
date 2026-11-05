NEXT: Read T-A2 in full, inspect the permitted files and repository standards, then add the two regression tests before changing implementation.
FACT: Read the full brief and .ai/README.md. The brief's first-entry-before-first-tool requirement was discovered by that initial read; this entry is appended immediately afterward rather than claiming it preceded the read.
DECISION: Limit changes to the three assigned source/test files and this working file. No build, root typecheck, emitting TypeScript, commit, push, branch change, or external store.
FACT: Inspected repository standards and transition sources. Controller.prepare retargets retained opacity to 1; the existing setup injects LinearAnimator. Broad documentation output was truncated, so targeted reads follow.
NEXT: Read the animator tests and TDD instructions without truncation; add regressions only.
FACT: Read TDD skill and animator module/tests in full. Existing unrelated changes are present and will be preserved.
DECISION: The brief explicitly approves both seams and requires both tests before the fix, overriding the skill's one-test-at-a-time default. Reuse the fake FrameClock with an optional real factory and expose its cumulative request count.
NEXT: Add the settled-tween and real-factory unchanged-scene regressions, then run the full allowed transition suite for RED.
FACT: Added both regression tests before modifying animators.ts. Existing LinearAnimator test bodies are unchanged; the real-factory test first completes an actual move/enter transition and counts cumulative frame requests.
NEXT: Capture the complete RED transition output.
FACT: RED command: npm test -w @org-hierarchy/sdk -- transition
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run transition

error   Failed to run Rstest.
error   listen EPERM: operation not permitted ::1:3000
    at Server.setupListenHandle [as _listen2] (node:net:1918:21)
    at listenInCluster (node:net:1997:12)
    at GetAddrInfoReqWrap.callback (node:net:2206:7)
    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:134:8)
npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run transition

```
FACT: RED command exit code: 1
NEXT: Inspect RED result before applying the fix.
FACT: Sandbox denied the localhost listener (EPERM).
NEXT: Retry the same RED command with listener permission as required by the brief.
FACT: RED retry: npm test -w @org-hierarchy/sdk -- transition
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run transition

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:46:49.248Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 4,
    "failedFiles": 2,
    "tests": 74,
    "failedTests": 2,
    "passedTests": 72,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 896,
    "build": 196,
    "tests": 700
  },
  "snapshot": {
    "added": 0,
    "updated": 0,
    "unmatched": 0,
    "removed": 0,
    "unchecked": 0
  }
}
```

## Failures

### [F01] src/render/transition/animators.test.ts :: TweenAnimator and factory > success: retargeting the current value stays settled without motion

repro:

```bash
npx rstest 'src/render/transition/animators.test.ts' --testNamePattern 'TweenAnimator and factory > success: retargeting the current value stays settled without motion'
```

details:

```json
{
  "testPath": "src/render/transition/animators.test.ts",
  "project": "rstest",
  "fullName": "TweenAnimator and factory > success: retargeting the current value stays settled without motion",
  "status": "fail",
  "duration": 17,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected false to be true // Object.is equality",
      "topFrame": {
        "file": "src/render/transition/animators.test.ts",
        "line": 116,
        "column": 27,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/transition/animators.test.ts",
      "line": 116
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- true
+ false
```

codeFrame (error 1):

```text
114 |     expect(tween.settled).toBe(true);
115 |     tween.retarget(1);
116 |     expect(tween.settled).toBe(true);
    |                           ^
117 |     tween.advance(FIXED_DT);
118 |     expect(tween.value).toBe(1);
```

### [F02] src/render/transition/TransitionController.test.ts :: TransitionController > success: unchanged targets with real animators request zero frames

repro:

```bash
npx rstest 'src/render/transition/TransitionController.test.ts' --testNamePattern 'TransitionController > success: unchanged targets with real animators request zero frames'
```

details:

```json
{
  "testPath": "src/render/transition/TransitionController.test.ts",
  "project": "rstest",
  "fullName": "TransitionController > success: unchanged targets with real animators request zero frames",
  "status": "fail",
  "duration": 10,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected true to be false // Object.is equality",
      "topFrame": {
        "file": "src/render/transition/TransitionController.test.ts",
        "line": 91,
        "column": 26,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/transition/TransitionController.test.ts",
      "line": 91
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- false
+ true
```

codeFrame (error 1):

```text
89 |     const before = requests();
90 |     c.prepare(targets, { animate: true });
91 |     expect(c.isActive()).toBe(false);
   |                          ^
92 |     c.start();
93 |     expect(requests() - before).toBe(0);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run transition

```
FACT: RED retry exit code: 1
NEXT: Inspect failures before implementation.
FACT: RED confirmed exactly the two new regressions fail; 72 existing transition tests pass. Tween settled becomes false, and unchanged real-factory controller becomes active. Full output above.
NEXT: Apply the prescribed retarget-only fix.
FACT: Changed only TweenAnimator.retarget elapsedMs assignment: current-value targets use durationMs; other targets use 0. start and target remain assigned. No changes to settled, advance, snap, or SpringAnimator.
NEXT: Run full transition GREEN, SDK noEmit typecheck, and lint; append complete outputs.
FACT: GREEN command: npm test -w @org-hierarchy/sdk -- transition
````text

> @org-hierarchy/sdk@1.1.1 test
> rstest run transition

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:47:15.348Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 4,
    "failedFiles": 0,
    "tests": 74,
    "failedTests": 0,
    "passedTests": 74,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 815,
    "build": 190,
    "tests": 625
  },
  "snapshot": {
    "added": 0,
    "updated": 0,
    "unmatched": 0,
    "removed": 0,
    "unchecked": 0
  }
}
```

## Tests

### Passed

- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: the first render and LOD crossings supply snap
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: settling publishes structural after per-frame transition delivery
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: a snap caller cannot erase queued animate intent and the next pass resets it
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: structural operations animate, theme and style passes snap
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > failure: a refused pass aborts and does not start the transition
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: omitted animate keeps transition lifecycle inactive
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: export settles before accessing the raster scene
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: destroy disables the controller before destroying the host
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: refit with animation never prepares target-frame overlay cards
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: backdrop teardown settles and redraws Pixi chrome
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: resolves opt-in physics once at creation
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > failure: reduced motion disables an opted-in transition
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > failure: one throwing transition subscriber cannot block the next subscriber or frame
- src/render/transition/animators.test.ts :: SpringAnimator > success: integrates a damped spring with mass in seconds
- src/render/transition/animators.test.ts :: SpringAnimator > success: snappy settles in fewer fixed steps than gentle
- src/render/transition/animators.test.ts :: SpringAnimator > success: retarget preserves momentum without a position jump
- src/render/transition/animators.test.ts :: SpringAnimator > success: snap resets velocity and sets an explicit value as the new rest point
- src/render/transition/animators.test.ts :: SpringAnimator > failure: position at the threshold is not settled
- src/render/transition/animators.test.ts :: SpringAnimator > failure: huge dt is bounded to one normal step
- src/render/transition/animators.test.ts :: SpringAnimator > failure: extreme finite coordinates and coefficients never poison state
- src/render/transition/animators.test.ts :: TweenAnimator and factory > success: factory selects spring and tween implementations
- src/render/transition/animators.test.ts :: TweenAnimator and factory > success: retargeting the current value stays settled without motion
- src/render/transition/animators.test.ts :: TweenAnimator and factory > success: fade duration uses milliseconds and ease-out-cubic
- src/render/transition/animators.test.ts :: TweenAnimator and factory > success: retarget restarts the full duration from current value
- src/render/transition/animators.test.ts :: TweenAnimator and factory > failure: huge elapsed time finishes exactly at target
- src/render/transition/animators.test.ts :: TweenAnimator and factory > failure: zero, negative and non-finite steps leave both animators unchanged
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > success: smooth and the equivalent perceptual form resolve identically
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > success: physical values are preserved and mass defaults to one
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > success: bounce defaults to zero and clamps at both ends
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > success: disabled and reduced motion options are quiet
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":null} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":42} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":[]} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":"unknown"} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":"toString"} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":0}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":-1}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":null}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":null}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":"1"}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":1,"bounce":null}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":1,"bounce":null}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":1,"bounce":"0"}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":0,"damping":2}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":-1,"damping":2}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":null,"damping":2}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":null,"damping":2}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":-1}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":null}} disables animation with exactly one warning

Note: list truncated (showing 50 of 74).

### Skipped

None.

## Failures

No test failures reported.

````
FACT: GREEN exit code: 0
NEXT: Check SDK types and lint.
FACT: Validation command: npm run typecheck -w @org-hierarchy/sdk
````text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/OrgHierarchyDiagram.ts(513,28): error TS2339: Property 'configureTransition' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(514,28): error TS2339: Property 'onTransitionFrame' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(537,48): error TS2339: Property 'settleNow' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(920,22): error TS2339: Property 'startTransition' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(954,37): error TS2339: Property 'transition' does not exist on type 'RenderOptions'.
src/OrgHierarchyDiagram.ts(975,23): error TS2339: Property 'abortTransition' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(2136,38): error TS2339: Property 'settleNow' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(2143,42): error TS2339: Property 'getTransitionFrame' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(2543,38): error TS2339: Property 'settleNow' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(2593,38): error TS2339: Property 'configureTransition' does not exist on type 'DiagramRenderer'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

````
FACT: Exit code: 1
NEXT: Continue prescribed validation and inspect scoped diff.
FACT: Validation command: npm run lint
````text

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


````
FACT: Exit code: 0
NEXT: Continue prescribed validation and inspect scoped diff.
FACT: GREEN passed all 74 transition tests in four files, including both new regressions. The runner itself abbreviates its passed-test list to 50; its full emitted output is preserved above without filtering or shell pipes.
FACT: SDK typecheck failed with ten missing renderer-transition API diagnostics in OrgHierarchyDiagram.ts (full output above). No diagnostic names any assigned file. Lint passed with exit code 0.
DECISION: Do not fix the cross-file integration errors: OrgHierarchyDiagram.ts and renderer integration are outside this task's exclusive file list.
FACT: Reviewed the scoped diff and ran git diff --check on all three assigned files; no whitespace errors. The production diff is one assignment in TweenAnimator.retarget. Existing fake-based tests are preserved; the new real-factory test checks inactivity and zero cumulative frame requests after settling and confirming identical targets.
FACT: Only the three assigned files and this working file were written by this task. No build, root typecheck, emitting tsc, commit, push, branch switch, or external store was used.
FACT: Process deviation: the first NEXT entry followed the initial brief read, because the before-first-tool requirement was discovered in that read; this is recorded at the beginning of this file.
STATUS: DONE_WITH_CONCERNS — Fix and both RED-to-GREEN regressions complete; 74 transition tests and lint pass, but required SDK typecheck is blocked by ten out-of-scope renderer integration errors. Initial work-log entry followed the brief read.
