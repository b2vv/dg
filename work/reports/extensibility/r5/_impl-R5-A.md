NEXT: Read required context, verify the exact scene box type, then write failing geometry tests.
FACT: Read R5-A.md in full and R5 plan/spec. Scope is only marquee.ts, marquee.test.ts, and this append-only log. No build, emitting typecheck, other tests, branch switch, commit, push, or external store.
FACT: Existing unrelated changes were present before work; they remain untouched. DiagramRenderer.listNodeBoxes returns readonly NodeWorldBox[] from scene.listBoxes().
DECISION: Use the brief's pre-authorized seams rectFromDrag, boxesIntersectRect and isDrag. The brief's tests-first success/failure batch takes precedence over the skill's one-test-at-a-time preference.
NEXT: Resolve NodeWorldBox and read project coding/TDD guidance before writing tests.
FACT: Confirmed branch feat/extensibility. Read project TDD/coding standards and current CTO briefing context. Two speculative lookup paths did not exist; direct DiagramRenderer import resolved the owner to SceneRegistry.ts.
DECISION: Default drag threshold is 4 screen pixels, measured by Euclidean distance, strictly greater than the threshold. Geometry consumes world coordinates; caller supplies screen coordinates to isDrag.
NEXT: Read the canonical box definition and create success/boundary/failure tests. No integration or browser coverage is claimed for this pure module.
FACT: Created marquee.test.ts before any implementation. Test list: four drag directions; zero/one-unit rectangles; partial/inside/surrounding hits; four outside directions; four inclusive edges and corner; empty input; all kinds; zero-area and line hit tests; default/custom Euclidean thresholds including exact boundary.
DECISION: Reuse NodeWorldBox with a type-only import, avoiding duplicated shape and runtime Pixi dependency. Finite inputs are the caller contract; no NaN guard.
NEXT: Run the exact authorized marquee test command and retain its complete RED output.

> @org-hierarchy/sdk@1.1.1 test
> rstest run marquee

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
npm error command sh -c rstest run marquee

FACT: RED command exit code: 1
NEXT: Inspect RED evidence before implementation.
FACT: First test attempt hit listen EPERM on ::1:3000; this is infrastructure failure, not RED evidence.
NEXT: Retry the same authorized test with the required permission, as instructed by the brief.

> @org-hierarchy/sdk@1.1.1 test
> rstest run marquee

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:30:41.608Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 1,
    "failedFiles": 1,
    "tests": 0,
    "failedTests": 0,
    "passedTests": 0,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 583,
    "build": 107,
    "tests": 476
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

### [F01] src/render/marquee.test.ts

repro:

```bash
npx rstest 'src/render/marquee.test.ts'
```

details:

```json
{
  "testPath": "src/render/marquee.test.ts",
  "project": "rstest",
  "fullName": "",
  "status": "fail",
  "retryCount": 0,
  "errors": [
    {
      "type": "Error",
      "message": "Cannot find module './marquee.js'",
      "topFrame": {
        "file": "dist/.rstest-temp/rstest%20runtime",
        "line": 18,
        "column": 1,
        "method": "Object.apply"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "dist/.rstest-temp/rstest%20runtime",
      "line": 18
    }
  ]
}
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run marquee

FACT: RED retry exit code: 1
NEXT: Inspect test failure.
FACT: RED retry reached the suite and failed because ./marquee.js did not exist (exit 1). No implementation existed before this failure.
FACT: Added marquee.ts: normalized world rectangle, inclusive AABB intersection returning ids in input order, and strict Euclidean screen-pixel drag threshold. Only dependency is an erased type import; no Pixi runtime, DOM, store, side effects, or NaN validation.
NEXT: Run the authorized marquee suite for GREEN, then SDK noEmit typecheck and lint.

> @org-hierarchy/sdk@1.1.1 test
> rstest run marquee

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:31:08.345Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 1,
    "failedFiles": 0,
    "tests": 31,
    "failedTests": 0,
    "passedTests": 31,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 504,
    "build": 104,
    "tests": 400
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

- src/render/marquee.test.ts :: rectFromDrag > success: normalizes direction from (2, 3) to (12, 23)
- src/render/marquee.test.ts :: rectFromDrag > success: normalizes direction from (12, 3) to (2, 23)
- src/render/marquee.test.ts :: rectFromDrag > success: normalizes direction from (2, 23) to (12, 3)
- src/render/marquee.test.ts :: rectFromDrag > success: normalizes direction from (12, 23) to (2, 3)
- src/render/marquee.test.ts :: rectFromDrag > failure boundary: stationary pointer produces a zero-area rectangle
- src/render/marquee.test.ts :: rectFromDrag > success: preserves one-unit dimensions and negative world coordinates
- src/render/marquee.test.ts :: boxesIntersectRect > success: selects partial overlap and fully inside boxes in input order
- src/render/marquee.test.ts :: boxesIntersectRect > failure: excludes a box fully left of the rectangle
- src/render/marquee.test.ts :: boxesIntersectRect > failure: excludes a box fully right of the rectangle
- src/render/marquee.test.ts :: boxesIntersectRect > failure: excludes a box fully above of the rectangle
- src/render/marquee.test.ts :: boxesIntersectRect > failure: excludes a box fully below of the rectangle
- src/render/marquee.test.ts :: boxesIntersectRect > success boundary: includes exact left contact
- src/render/marquee.test.ts :: boxesIntersectRect > success boundary: includes exact right contact
- src/render/marquee.test.ts :: boxesIntersectRect > success boundary: includes exact top contact
- src/render/marquee.test.ts :: boxesIntersectRect > success boundary: includes exact bottom contact
- src/render/marquee.test.ts :: boxesIntersectRect > success boundary: includes exact corner contact
- src/render/marquee.test.ts :: boxesIntersectRect > failure: empty boxes return no ids
- src/render/marquee.test.ts :: boxesIntersectRect > success: a covering rectangle selects every box regardless of kind
- src/render/marquee.test.ts :: boxesIntersectRect > boundary: rectangle (10, 20, 0, 0)
- src/render/marquee.test.ts :: boxesIntersectRect > boundary: rectangle (9, 19, 0, 0)
- src/render/marquee.test.ts :: boxesIntersectRect > boundary: rectangle (9, 19, 1, 1)
- src/render/marquee.test.ts :: boxesIntersectRect > boundary: rectangle (10, 15, 0, 10)
- src/render/marquee.test.ts :: boxesIntersectRect > boundary: rectangle (5, 20, 10, 0)
- src/render/marquee.test.ts :: isDrag > classifies pointer (10, 20) with the default 4px threshold
- src/render/marquee.test.ts :: isDrag > classifies pointer (13, 20) with the default 4px threshold
- src/render/marquee.test.ts :: isDrag > classifies pointer (14, 20) with the default 4px threshold
- src/render/marquee.test.ts :: isDrag > classifies pointer (15, 20) with the default 4px threshold
- src/render/marquee.test.ts :: isDrag > classifies pointer (10, 25) with the default 4px threshold
- src/render/marquee.test.ts :: isDrag > classifies pointer (7, 17) with the default 4px threshold
- src/render/marquee.test.ts :: isDrag > classifies pointer (12, 22) with the default 4px threshold
- src/render/marquee.test.ts :: isDrag > success: honors a custom threshold and its exact boundary

### Skipped

None.

## Failures

No test failures reported.

FACT: GREEN test command exit code: 0
NEXT: Check SDK types and lint.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


FACT: SDK noEmit typecheck exit code: 0
NEXT: Run lint.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: Lint exit code: 0
NEXT: Inspect final evidence and owned file scope.
FACT: Final author check: all 31 marquee tests passed; SDK noEmit typecheck and lint both exited 0. Raw command output above is complete, appended directly without pipes.
FACT: Delivered only packages/sdk/src/render/marquee.ts and packages/sdk/src/render/marquee.test.ts, plus this required append-only working record. Existing unrelated changes remain untouched.
FACT: Tested scenarios cover the brief's geometry contract and failure boundaries. Screen-space threshold and world-space hit geometry are deliberately separate caller inputs; zero-area rectangles remain valid and edge contact is inclusive.
FACT: Screenshots and browser walkthrough are N/A for this pure geometry module. Post-deploy checks and renderer/facade integration are outside R5-A; no deployment occurred. No independent review or executed mutation coverage is claimed.
DECISION: R5-A acceptance is satisfied. R5-B can consume the three exports and R5-C can re-export MarqueeRect; no integration files were changed here.
NEXT: Hand the completed module and raw evidence to the R5 coordinator.
STATUS: PASS — R5-A implemented; 31 tests, SDK noEmit typecheck, and lint pass.
