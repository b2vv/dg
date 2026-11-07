NEXT: Read repository guidance, plan rows #13/#13a and wave-one reviews; add failing tests before implementation.
FACT: Read local entrypoint, standards manifest and TDD skill. User has confirmed the controller frame-gap and re-entry seams and restricted implementation ownership to three files.
FACT: Verified feat/d3-transitions at 4a3db0c. Read both review files and plan rows #13/#13a. Existing test incorrectly used a 10 s cap and expected snapping at 5 s. Unrelated working changes exist and will be preserved.
DECISION: Replace the old owed-step snap assertion with a moving 200 ms test (six fixed steps, x=21, active, frame emitted, next request, no backlog on a 1 ms tick) and a default-cap 5 s test. Production code unchanged.
NEXT: Run transition suite to establish assertion RED.

FACT: RED attempt: npm test -w @org-hierarchy/sdk -- src/render/transition
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/transition

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
npm error command sh -c rstest run src/render/transition

```
Exit: 1
FACT: Initial run blocked by listen EPERM on ::1:3000; not assertion RED. Rerunning with authorized listener permission.

FACT: RED run: npm test -w @org-hierarchy/sdk -- src/render/transition
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/transition

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:09:04.538Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 3,
    "failedFiles": 1,
    "tests": 59,
    "failedTests": 1,
    "passedTests": 58,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 637,
    "build": 78,
    "tests": 559
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

### [F01] src/render/transition/TransitionController.test.ts :: TransitionController > failure: a 200 ms frame gap drops owed steps and continues animating

repro:

```bash
npx rstest 'src/render/transition/TransitionController.test.ts' --testNamePattern 'TransitionController > failure: a 200 ms frame gap drops owed steps and continues animating'
```

details:

```json
{
  "testPath": "src/render/transition/TransitionController.test.ts",
  "project": "rstest",
  "fullName": "TransitionController > failure: a 200 ms frame gap drops owed steps and continues animating",
  "status": "fail",
  "duration": 10,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected false to be true // Object.is equality",
      "topFrame": {
        "file": "src/render/transition/TransitionController.test.ts",
        "line": 181,
        "column": 26,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/transition/TransitionController.test.ts",
      "line": 181
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
179 |       expect(animator.steps.every((dt) => dt === FIXED_DT)).toBe(true);
180 |     }
181 |     expect(c.isActive()).toBe(true);
    |                          ^
182 |     expect(c.frame().get('person:a')?.x).toBe(21);
183 |     expect(pending.size).toBe(1);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/render/transition

```
Exit: 1
FACT: Assertion RED established: 200 ms case expected isActive() true, received false; 58 passed, 1 failed.
DECISION: Drop whole-step backlog to zero after bounded integration, then snap only if all animators settled. Existing cap/non-finite guards remain. Added .js imports and removed inert eslint directive, preserving explanatory comment.
NEXT: Verify GREEN before strengthening re-entry test.

FACT: Frame-gap GREEN run: npm test -w @org-hierarchy/sdk -- src/render/transition
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/transition

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:09:25.490Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 3,
    "failedFiles": 0,
    "tests": 59,
    "failedTests": 0,
    "passedTests": 59,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 518,
    "build": 83,
    "tests": 435
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

- src/render/transition/animators.test.ts :: SpringAnimator > success: integrates a damped spring with mass in seconds
- src/render/transition/animators.test.ts :: SpringAnimator > success: snappy settles in fewer fixed steps than gentle
- src/render/transition/animators.test.ts :: SpringAnimator > success: retarget preserves momentum without a position jump
- src/render/transition/animators.test.ts :: SpringAnimator > success: snap resets velocity and sets an explicit value as the new rest point
- src/render/transition/animators.test.ts :: SpringAnimator > failure: position at the threshold is not settled
- src/render/transition/animators.test.ts :: SpringAnimator > failure: huge dt is bounded to one normal step
- src/render/transition/animators.test.ts :: SpringAnimator > failure: extreme finite coordinates and coefficients never poison state
- src/render/transition/animators.test.ts :: TweenAnimator and factory > success: factory selects spring and tween implementations
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
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":null}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":0}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":-1}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":null}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":null}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":"1"}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":5e-324}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":1.7976931348623157e+308}} disables animation with exactly one warning
- src/render/transition/TransitionController.test.ts :: TransitionController > success: initial, unchanged and size-only frames need no animation
- src/render/transition/TransitionController.test.ts :: TransitionController > success: diff enters, updates and exits by kind:id; prepare schedules nothing
- src/render/transition/TransitionController.test.ts :: TransitionController > success: retarget starts at current values and keeps animator velocity
- src/render/transition/TransitionController.test.ts :: TransitionController > success: exiting boxes stay at their last position and re-entry absorbs the fading entry
- src/render/transition/TransitionController.test.ts :: TransitionController > failure: empty initial targets and removing every target settle without residual frames

Note: list truncated (showing 50 of 59).

### Skipped

None.

## Failures

No test failures reported.

```
Exit: 0
FACT: Frame-gap fix GREEN: 59/59 transition tests pass.
DECISION: Strengthened row #39 by recording factory count immediately before re-entry prepare and asserting it is unchanged immediately afterwards.
NEXT: Run baseline, temporarily bypass reuse only for exiting keys, observe this exact assertion fail, then restore source bytes.

FACT: Re-entry strengthened baseline: npm test -w @org-hierarchy/sdk -- src/render/transition
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/transition

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:09:48.341Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 3,
    "failedFiles": 0,
    "tests": 59,
    "failedTests": 0,
    "passedTests": 59,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 458,
    "build": 26,
    "tests": 432
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

- src/render/transition/animators.test.ts :: SpringAnimator > success: integrates a damped spring with mass in seconds
- src/render/transition/animators.test.ts :: SpringAnimator > success: snappy settles in fewer fixed steps than gentle
- src/render/transition/animators.test.ts :: SpringAnimator > success: retarget preserves momentum without a position jump
- src/render/transition/animators.test.ts :: SpringAnimator > success: snap resets velocity and sets an explicit value as the new rest point
- src/render/transition/animators.test.ts :: SpringAnimator > failure: position at the threshold is not settled
- src/render/transition/animators.test.ts :: SpringAnimator > failure: huge dt is bounded to one normal step
- src/render/transition/animators.test.ts :: SpringAnimator > failure: extreme finite coordinates and coefficients never poison state
- src/render/transition/animators.test.ts :: TweenAnimator and factory > success: factory selects spring and tween implementations
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
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":null}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":0}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":-1}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":null}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":null}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":"1"}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":5e-324}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":1.7976931348623157e+308}} disables animation with exactly one warning
- src/render/transition/TransitionController.test.ts :: TransitionController > success: initial, unchanged and size-only frames need no animation
- src/render/transition/TransitionController.test.ts :: TransitionController > success: diff enters, updates and exits by kind:id; prepare schedules nothing
- src/render/transition/TransitionController.test.ts :: TransitionController > success: retarget starts at current values and keeps animator velocity
- src/render/transition/TransitionController.test.ts :: TransitionController > success: exiting boxes stay at their last position and re-entry absorbs the fading entry
- src/render/transition/TransitionController.test.ts :: TransitionController > failure: empty initial targets and removing every target settle without residual frames

Note: list truncated (showing 50 of 59).

### Skipped

None.

## Failures

No test failures reported.

```
Exit: 0
DECISION: Authorized temporary re-entry mutation: replace `const entry = this.entries.get(target.key) ?? this.createEntry(previous ?? {` with `const entry = (previous?.phase === 'exiting' ? undefined : this.entries.get(target.key)) ?? this.createEntry(previous ?? {`. Only fading exits bypass animator reuse; tests remain unchanged.

FACT: Re-entry mutation RED: npm test -w @org-hierarchy/sdk -- src/render/transition
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/transition

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:09:48.936Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 3,
    "failedFiles": 1,
    "tests": 59,
    "failedTests": 1,
    "passedTests": 58,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 322,
    "build": 25,
    "tests": 297
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

### [F01] src/render/transition/TransitionController.test.ts :: TransitionController > success: exiting boxes stay at their last position and re-entry absorbs the fading entry

repro:

```bash
npx rstest 'src/render/transition/TransitionController.test.ts' --testNamePattern 'TransitionController > success: exiting boxes stay at their last position and re-entry absorbs the fading entry'
```

details:

```json
{
  "testPath": "src/render/transition/TransitionController.test.ts",
  "project": "rstest",
  "fullName": "TransitionController > success: exiting boxes stay at their last position and re-entry absorbs the fading entry",
  "status": "fail",
  "duration": 8,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected 8 to be 4 // Object.is equality",
      "topFrame": {
        "file": "src/render/transition/TransitionController.test.ts",
        "line": 120,
        "column": 25,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/transition/TransitionController.test.ts",
      "line": 120
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- 4
+ 8
```

codeFrame (error 1):

```text
118 |     const count = made.length;
119 |     c.prepare([box('person:a', 80)], { animate: true });
120 |     expect(made.length).toBe(count);
    |                         ^
121 |     expect(c.frame().size).toBe(1);
122 |     expect(c.frame().get('person:a')?.phase).toBe('updating');
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/render/transition

```
Exit: 1
FACT: Restored exact pre-mutation TransitionController.ts bytes.

FACT: Final validation: npm run typecheck -w @org-hierarchy/sdk
```text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


```
Exit: 0

FACT: Final validation: npm run lint
```text

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0

packages/sdk/src/render/transition/animators.ts:49:8: error eslint(max-classes-per-file): File has too many classes (2). Maximum allowed is 1 help: Reduce the number of classes in this file

```
Exit: 1

FACT: Final restored GREEN: npm test -w @org-hierarchy/sdk -- src/render/transition
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/transition

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:10:03.993Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 3,
    "failedFiles": 0,
    "tests": 59,
    "failedTests": 0,
    "passedTests": 59,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 496,
    "build": 78,
    "tests": 418
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

- src/render/transition/animators.test.ts :: SpringAnimator > success: integrates a damped spring with mass in seconds
- src/render/transition/animators.test.ts :: SpringAnimator > success: snappy settles in fewer fixed steps than gentle
- src/render/transition/animators.test.ts :: SpringAnimator > success: retarget preserves momentum without a position jump
- src/render/transition/animators.test.ts :: SpringAnimator > success: snap resets velocity and sets an explicit value as the new rest point
- src/render/transition/animators.test.ts :: SpringAnimator > failure: position at the threshold is not settled
- src/render/transition/animators.test.ts :: SpringAnimator > failure: huge dt is bounded to one normal step
- src/render/transition/animators.test.ts :: SpringAnimator > failure: extreme finite coordinates and coefficients never poison state
- src/render/transition/animators.test.ts :: TweenAnimator and factory > success: factory selects spring and tween implementations
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
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":null}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":0}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":-1}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":null}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":null}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"stiffness":1,"damping":1,"mass":"1"}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":5e-324}} disables animation with exactly one warning
- src/render/transition/resolveAnimate.test.ts :: resolveAnimate > failure: invalid option {"option":{"duration":1.7976931348623157e+308}} disables animation with exactly one warning
- src/render/transition/TransitionController.test.ts :: TransitionController > success: initial, unchanged and size-only frames need no animation
- src/render/transition/TransitionController.test.ts :: TransitionController > success: diff enters, updates and exits by kind:id; prepare schedules nothing
- src/render/transition/TransitionController.test.ts :: TransitionController > success: retarget starts at current values and keeps animator velocity
- src/render/transition/TransitionController.test.ts :: TransitionController > success: exiting boxes stay at their last position and re-entry absorbs the fading entry
- src/render/transition/TransitionController.test.ts :: TransitionController > failure: empty initial targets and removing every target settle without residual frames

Note: list truncated (showing 50 of 59).

### Skipped

None.

## Failures

No test failures reported.

```
Exit: 0
FACT: Final transition suite passed 59/59 and SDK no-emit typecheck passed. Lint failed: animators.ts:49 eslint(max-classes-per-file), two classes versus maximum one. The review claim that the rule is disabled is false on the current tree. Investigating configuration before choosing an in-scope correction.
FACT: .oxlintrc.json enables pedantic errors and does not override max-classes-per-file. Actual npm run lint proves the rule is active; the prior eslint directive was effective, not inert.
DECISION: Replace the requested eslint directive with oxlint-disable-next-line max-classes-per-file, preserving the same existing local exception and explanation. Splitting modules would exceed the three-file scope; removing the exception cannot meet the required lint gate. This evidence-based deviation must be reported as a concern.
NEXT: Re-run lint after the comment-only correction; inspect final diff and scope.

FACT: Corrected-directive validation: npm run lint
```text

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


```
Exit: 0
FACT: Final lint passes (exit 0); git diff --check passes. Final behavior tests: 59 passed, 0 failed, 0 skipped. SDK typecheck passed with tsc -p tsconfig.check.json; no emitting build invoked. The subsequent edit was only the lint directive comment.
FACT: Changed only the three assigned source/test files and this append-only working file. Existing unrelated work preserved. Branch remains feat/d3-transitions at 4a3db0c; no branch switch, worktree, commit or push performed. No build or external checkpoint/store invoked. confirmed* fields untouched.
FACT: Evidence includes full captured command output without shell pipelines. Rstest itself abbreviates its passed-test listing to 50 of 59; its complete emitted output is preserved above. Assertion RED proved old hitch behavior, and isolated re-entry mutation produced expected 8-to-4 factory-count failure before exact source restoration.
STATUS: DONE_WITH_CONCERNS — All required checks pass; review incorrectly called the max-classes-per-file directive inert, so it was replaced with an oxlint directive instead of removing the necessary existing exception.
