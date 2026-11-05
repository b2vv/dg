NEXT: Read T131 and AGENTS.md, verify branch and working tree; do not write dist or external stores.

FACT: Read task, AGENTS, local entrypoint, standards and briefing. Branch is chore/library-boundary-housekeeping; existing unrelated report changes are preserved.
DECISION: Use TDD; no builds, external checkpoints, commits or branch changes.
NEXT: Inspect toggle, fit, overlay sync and test fixtures.

FACT: StaffFitOptions already exported. SDK typecheck uses tsconfig.check.json; root typecheck emits and is forbidden.
DECISION: Add a dedicated preparation reason; flushSync only that reason. Test seams were explicitly specified by owner.
NEXT: Write toggle camera and overlay commit regression tests.

FACT: Added toggle tests for both branches, default/false/true/options, missing box, target and preparation ordering; added overlay immediate DOM assertion plus structural control.
NEXT: Run focused tests before implementation and record red.

> @org-hierarchy/sdk@1.1.1 test
> rstest run staffRefitOnToggle createReactPromoteOverlay

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
npm error command sh -c rstest run staffRefitOnToggle createReactPromoteOverlay

FACT: Focused RED run exit=1.

FACT: The focused run did NOT execute tests: Rstest failed to bind ::1:3000 (listen EPERM). This is an infrastructure failure, NOT a verified TDD red. Full output is above.
DECISION: Stop as explicitly required for an unrelated failure. No production implementation or unrelated test fixes were made.
FACT: Changes are limited to the new packages/sdk/src/staffRefitOnToggle.test.ts, additions in packages/sdk/src/react/createReactPromoteOverlay.test.ts, and this working file. Tests remain unverified drafts and refer to the planned API.
FACT: The five final gates were not reached. Demo tsc typecheck: deferred to reviewer. No build, dist write, branch switch, worktree, commit, push, or external checkpoint was attempted. Commits 945069b and 7080443 remain on the original branch.
NEXT: Resume with a permitted Rstest execution, establish actual failing assertions, then implement SDK preparation/refit, demo flag, Ukrainian docs and run all five allowed gates.
QUESTION: None pending; execution stopped at the owner-defined unrelated-failure boundary.

NEXT: Check instructions, prior work log and draft tests; continue with localhost-enabled RED run.

FACT: Owner addendum supersedes prior stop and demo plan: localhost escalation authorized, no demo changes or runtime setter. Draft tests use prepare-camera.
NEXT: Execute focused RED with localhost permission.

> @org-hierarchy/sdk@1.1.1 test
> rstest run staffRefitOnToggle createReactPromoteOverlay

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:38:19.349Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 2,
    "failedFiles": 2,
    "tests": 43,
    "failedTests": 3,
    "passedTests": 40,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1019,
    "build": 194,
    "tests": 825
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

### [F01] src/react/createReactPromoteOverlay.test.ts :: createReactPromoteOverlay > prepare-camera commits cards synchronously only for camera preparation

repro:

```bash
npx rstest 'src/react/createReactPromoteOverlay.test.ts' --testNamePattern 'createReactPromoteOverlay > prepare-camera commits cards synchronously only for camera preparation'
```

details:

```json
{
  "testPath": "src/react/createReactPromoteOverlay.test.ts",
  "project": "rstest",
  "fullName": "createReactPromoteOverlay > prepare-camera commits cards synchronously only for camera preparation",
  "status": "fail",
  "duration": 45,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected false to be true // Object.is equality",
      "topFrame": {
        "file": "src/react/createReactPromoteOverlay.test.ts",
        "line": 87,
        "column": 71,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/react/createReactPromoteOverlay.test.ts",
      "line": 87
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
85 |         act(() => {
86 |           notify(reason);
87 |           expect(mount.querySelector('[data-promote-card]') !== null).toBe(reason === 'prepare-camera');
   |                                                                       ^
88 |         });
89 |         expect(mount.querySelector('[data-promote-card]')).not.toBeNull();
```

console:

```text
[stderr] error: Error: host card blew up
    at component (/Users/strelia/projects/dg/packages/sdk/src/react/createReactPromoteOverlay.test.ts:852:41)
    at Object.react_stack_bottom_frame (/Users/strelia/projects/dg/node_modules/react-dom/cjs/react-dom-client.development.js:25904:1)
    at renderWithHooks (/Users/strelia/projects/dg/node_modules/react-dom/cjs/react-dom-client.development.js:7662:1)
    at updateFunctionComponent (/Users/strelia/projects/dg/node_modules/react-dom/cjs/react-dom-c... [truncated]
```

### [F02] src/staffRefitOnToggle.test.ts :: staffRefitOnToggle > uses the configured camera policy with chrome: true

repro:

```bash
npx rstest 'src/staffRefitOnToggle.test.ts' --testNamePattern 'staffRefitOnToggle > uses the configured camera policy with chrome: true'
```

details:

```json
{
  "testPath": "src/staffRefitOnToggle.test.ts",
  "project": "rstest",
  "fullName": "staffRefitOnToggle > uses the configured camera policy with chrome: true",
  "status": "fail",
  "duration": 39,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [] to deeply equal [ [ 'prepare', { …(3) } ], …(1) ]",
      "topFrame": {
        "file": "src/staffRefitOnToggle.test.ts",
        "line": 78,
        "column": 28,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/staffRefitOnToggle.test.ts",
      "line": 78
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- [
-   [
-     "prepare",
-     {
-       "scale": 0.704,
-       "x": -22.39999999999999,
-       "y": -92.79999999999998,
-     },
-   ],
-   [
-     "animate",
-     {
-       "scale": 0.8,
-       "x": -300,
-       "y": -400,
-     },
-     {
-       "scale": 0.704,
-       "x": -22.39999999999999,
-       "y": -92.79999999999998,
-     },
-   ],
- ]
+ []
```

codeFrame (error 1):

```text
76 |             const target = computeStaffFit(box, screen, option === true ? {} : option);
77 |             if (option !== true) expect(target).not.toEqual(computeStaffFit(box, screen));
78 |             expect(events).toEqual([['prepare', target], ['animate', from, target]]);
   |                            ^
79 |             expect(m.diagram.getViewport()).toEqual(target);
80 |             expect(pan).not.toHaveBeenCalled();
```

### [F03] src/staffRefitOnToggle.test.ts :: staffRefitOnToggle > uses the configured camera policy with chrome: {"padding":10}

repro:

```bash
npx rstest 'src/staffRefitOnToggle.test.ts' --testNamePattern 'staffRefitOnToggle > uses the configured camera policy with chrome: {"padding":10}'
```

details:

```json
{
  "testPath": "src/staffRefitOnToggle.test.ts",
  "project": "rstest",
  "fullName": "staffRefitOnToggle > uses the configured camera policy with chrome: {\"padding\":10}",
  "status": "fail",
  "duration": 4,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [] to deeply equal [ [ 'prepare', …(1) ], …(1) ]",
      "topFrame": {
        "file": "src/staffRefitOnToggle.test.ts",
        "line": 78,
        "column": 28,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/staffRefitOnToggle.test.ts",
      "line": 78
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- [
-   [
-     "prepare",
-     {
-       "scale": 0.78,
-       "x": -68,
-       "y": -146,
-     },
-   ],
-   [
-     "animate",
-     {
-       "scale": 0.8,
-       "x": -300,
-       "y": -400,
-     },
-     {
-       "scale": 0.78,
-       "x": -68,
-       "y": -146,
-     },
-   ],
- ]
+ []
```

codeFrame (error 1):

```text
76 |             const target = computeStaffFit(box, screen, option === true ? {} : option);
77 |             if (option !== true) expect(target).not.toEqual(computeStaffFit(box, screen));
78 |             expect(events).toEqual([['prepare', target], ['animate', from, target]]);
   |                            ^
79 |             expect(m.diagram.getViewport()).toEqual(target);
80 |             expect(pan).not.toHaveBeenCalled();
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run staffRefitOnToggle createReactPromoteOverlay

FACT: Focused RED executed with localhost permission, exit 1: 43 tests, 3 expected failures (true/options refit ordering and prepare-camera synchronous DOM), 40 passed. Full runner output above.
DECISION: Reuse fitStaffChrome({animate:false}) for target calculation and placement, restore starting viewport, then host.animateViewport. Dedicated prepare-camera signal flushes only preparation.
NEXT: Implement config, toggle helper, overlay signal and Ukrainian docs.

FACT: Implemented opt-in config and shared toggle helper reusing fitStaffChrome, prepare-camera reason, narrowly scoped flushSync and Ukrainian API docs. StaffFitOptions already publicly exported; no barrel change needed.
NEXT: Run focused GREEN then required gates.

> @org-hierarchy/sdk@1.1.1 test
> rstest run staffRefitOnToggle createReactPromoteOverlay

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:39:11.015Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 2,
    "failedFiles": 0,
    "tests": 43,
    "failedTests": 0,
    "passedTests": 43,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1026,
    "build": 182,
    "tests": 844
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

- src/react/createReactPromoteOverlay.test.ts :: createReactPromoteOverlay > prepare-camera commits cards synchronously only for camera preparation
- src/react/createReactPromoteOverlay.test.ts :: createReactPromoteOverlay > structural commits cards synchronously only for camera preparation
- src/react/createReactPromoteOverlay.test.ts :: createReactPromoteOverlay > renders the backdrop behind the cards with the synced viewport and lod
- src/react/createReactPromoteOverlay.test.ts :: createReactPromoteOverlay > backdrop gets a worldTransform that reproduces worldPointToScreen (Б2)
- src/react/createReactPromoteOverlay.test.ts :: createReactPromoteOverlay > omitting backdrop renders no backdrop node (back-compat)
- src/react/createReactPromoteOverlay.test.ts :: createReactPromoteOverlay > success: promotes selection at near lod and hides via setPromotedNodeIds
- src/react/createReactPromoteOverlay.test.ts :: createReactPromoteOverlay > failure: far lod near-selection demotes (no cards)
- src/react/createReactPromoteOverlay.test.ts :: createReactPromoteOverlay > success: custom component receives screenRect synced to viewport
- src/react/createReactPromoteOverlay.test.ts :: near-visible mode > success: every visible seat is promoted, with no selection at all
- src/react/createReactPromoteOverlay.test.ts :: near-visible mode > failure: a seat off screen stays drawn on the canvas, it does not vanish
- src/react/createReactPromoteOverlay.test.ts :: near-visible mode > success: node data is resolved only for the seats that survived the filter
- src/react/createReactPromoteOverlay.test.ts :: near-visible mode > failure: below the detail band (far) nothing is promoted at all
- src/react/createReactPromoteOverlay.test.ts :: hide only what was drawn > failure: a node that vanished from the data is not hidden on the canvas
- src/react/createReactPromoteOverlay.test.ts :: shouldPromote — the host keeps a node on the canvas > failure: a rejected node stays on the canvas with no empty shell in the layer
- src/react/createReactPromoteOverlay.test.ts :: shouldPromote — the host keeps a node on the canvas > success: the predicate sees the node data, so the host can decide by kind
- src/react/createReactPromoteOverlay.test.ts :: shouldPromote — the host keeps a node on the canvas > success: no predicate promotes everything, as before
- src/react/createReactPromoteOverlay.test.ts :: screen size comes from the diagram, not from the DOM > success: sync never reads clientWidth, which would flush layout every frame
- src/react/createReactPromoteOverlay.test.ts :: a card holding focus is not demoted > failure: the card keeps its focused input when the camera moves it off screen
- src/react/createReactPromoteOverlay.test.ts :: a card holding focus is not demoted > success: the same card with no focus in it demotes as usual
- src/react/createReactPromoteOverlay.test.ts :: maxPromoted meets focus > success: a cap of 3 renders three cards
- src/react/createReactPromoteOverlay.test.ts :: maxPromoted meets focus > failure: the focused card survives a cap that would otherwise drop it
- src/react/createReactPromoteOverlay.test.ts :: maxPromoted meets focus > failure: a cap of zero promotes nothing, focus included — the host said zero
- src/react/createReactPromoteOverlay.test.ts :: one broken card does not take the layer down > failure: a component that throws leaves the other cards standing
- src/react/createReactPromoteOverlay.test.ts :: deferred recompute while the camera moves > success: the layer carries the camera while the cards stay put
- src/react/createReactPromoteOverlay.test.ts :: deferred recompute while the camera moves > success: once the camera settles the layer is reset and positions are rebuilt
- src/react/createReactPromoteOverlay.test.ts :: deferred recompute while the camera moves > failure: the latest camera wins, not an intermediate one
- src/react/createReactPromoteOverlay.test.ts :: deferred recompute while the camera moves > failure: dispose during a pending recompute renders nothing and does not throw
- src/react/createReactPromoteOverlay.test.ts :: deferred recompute while the camera moves > success: two consecutive syncs produce identical DOM
- src/react/createReactPromoteOverlay.test.ts :: the card matches the box it replaces > failure: a narrow card is not widened to a floor of its own
- src/react/createReactPromoteOverlay.test.ts :: the card matches the box it replaces > success: the slot carries chrome, scaled to the screen like the box is
- src/react/createReactPromoteOverlay.test.ts :: rows 7 and 12 — nothing to promote, and something that stopped existing > failure: an empty scene renders an empty layer and raises nothing
- src/react/createReactPromoteOverlay.test.ts :: rows 7 and 12 — nothing to promote, and something that stopped existing > failure: a node deleted while promoted leaves no ghost at its old position
- src/react/createReactPromoteOverlay.test.ts :: a node entering the view during a gesture is never a hole > success: a node that scrolls into view stays with Pixi until the camera stops
- src/react/createReactPromoteOverlay.test.ts :: sync reason: structural is immediate, camera is deferred > structural: rebuilds synchronously, without waiting settleMs
- src/react/createReactPromoteOverlay.test.ts :: sync reason: structural is immediate, camera is deferred > camera: does NOT rebuild synchronously (defers to settle)
- src/react/createReactPromoteOverlay.test.ts :: sync reason: structural is immediate, camera is deferred > camera then structural in one frame: structural rebuilds now and cancels the pending settle
- src/staffRefitOnToggle.test.ts :: staffRefitOnToggle > pans on expand and collapse when option=undefined and chrome is absent
- src/staffRefitOnToggle.test.ts :: staffRefitOnToggle > pans on expand and collapse when option=false and chrome is absent
- src/staffRefitOnToggle.test.ts :: staffRefitOnToggle > pans on expand and collapse when option=true and chrome is absent
- src/staffRefitOnToggle.test.ts :: staffRefitOnToggle > uses the configured camera policy with chrome: undefined
- src/staffRefitOnToggle.test.ts :: staffRefitOnToggle > uses the configured camera policy with chrome: false
- src/staffRefitOnToggle.test.ts :: staffRefitOnToggle > uses the configured camera policy with chrome: true
- src/staffRefitOnToggle.test.ts :: staffRefitOnToggle > uses the configured camera policy with chrome: {"padding":10}

### Skipped

None.

## Failures

No test failures reported.

FACT: Focused GREEN exit 0. Both toggle branches and overlay preparation/control tests pass. Config defaults reuse existing computeStaffFit and camera motion defaults. SDK tsconfig.check.json explicitly sets noEmit=true.
NEXT: Format only task test files and run full SDK gate.

FACT: Formatted task test files.
NEXT: Gate npm test -w @org-hierarchy/sdk (full output follows).

> @org-hierarchy/sdk@1.1.1 test
> rstest run

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:39:48.365Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 165,
    "failedFiles": 0,
    "tests": 1351,
    "failedTests": 0,
    "passedTests": 1349,
    "skippedTests": 2,
    "todoTests": 0
  },
  "durationMs": {
    "total": 10655,
    "build": 234,
    "tests": 10421
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

No test failures reported.

Note: all tests passed. Lists omitted for brevity.

FACT: Full SDK gate exit 0. Removed two unrelated formatter-only hunks; placed signal docs in React helpers section.
NEXT: Gate npm test -w @org-hierarchy/demo (no demo edits; full output follows).

> @org-hierarchy/demo@0.1.0 test
> rstest run

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:40:03.812Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/demo"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 18,
    "failedFiles": 0,
    "tests": 133,
    "failedTests": 0,
    "passedTests": 132,
    "skippedTests": 1,
    "todoTests": 0
  },
  "durationMs": {
    "total": 2272,
    "build": 108,
    "tests": 2164
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

No test failures reported.

Note: all tests passed. Lists omitted for brevity.

FACT: Demo regression gate exit 0. Demo tsc typecheck: deferred to reviewer (reads live dist types).
NEXT: Gate npm run typecheck -w @org-hierarchy/sdk (noEmit; full output follows).

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/staffRefitOnToggle.test.ts(61,43): error TS2345: Argument of type '"panToNode"' is not assignable to parameter of type 'keyof OrgHierarchyDiagram'.
src/staffRefitOnToggle.test.ts(82,28): error TS2741: Property 'name' is missing in type '{ x: number; y: number; width: number; height: number; }' but required in type '{ x: number; y: number; width: number; height: number; name: string; }'.
src/staffRefitOnToggle.test.ts(84,43): error TS2345: Argument of type '"panToNode"' is not assignable to parameter of type 'keyof OrgHierarchyDiagram'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

FACT: SDK typecheck exit 1 with three errors confined to new T131 tests: private panToNode spy twice and missing name on org box fixture. This is task-local, not an unrelated failure.
DECISION: Observe host.panTo like revealPositionPath tests and supply required org name.
NEXT: Repair test fixtures, rerun SDK typecheck and SDK tests.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/staffRefitOnToggle.test.ts(89,38): error TS2353: Object literal may only specify known properties, and 'departments' does not exist in type 'StaffChromeGeometry'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

FACT: Second task-local typecheck failure exposed stale draft StaffChromeGeometry fixture keys; corrected to depts and lines from actual interface.
NEXT: Recheck types, then full SDK suite.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


FACT: SDK noEmit typecheck PASS, exit 0.
NEXT: Repeat full SDK suite after task test fixture corrections.

> @org-hierarchy/sdk@1.1.1 test
> rstest run

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:41:30.871Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 165,
    "failedFiles": 1,
    "tests": 1351,
    "failedTests": 2,
    "passedTests": 1347,
    "skippedTests": 2,
    "todoTests": 0
  },
  "durationMs": {
    "total": 10246,
    "build": 250,
    "tests": 9996
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

### [F01] src/staffRefitOnToggle.test.ts :: staffRefitOnToggle > uses the configured camera policy with chrome: undefined

repro:

```bash
npx rstest 'src/staffRefitOnToggle.test.ts' --testNamePattern 'staffRefitOnToggle > uses the configured camera policy with chrome: undefined'
```

details:

```json
{
  "testPath": "src/staffRefitOnToggle.test.ts",
  "project": "rstest",
  "fullName": "staffRefitOnToggle > uses the configured camera policy with chrome: undefined",
  "status": "fail",
  "duration": 15,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected last \"panTo\" call to have been called with [ 100, 142.00000000000003, …(1) ]",
      "topFrame": {
        "file": "src/staffRefitOnToggle.test.ts",
        "line": 119,
        "column": 25,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/staffRefitOnToggle.test.ts",
      "line": 119
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

  [
    100,
-   142.00000000000003,
+   142,
    {
      "animate": true,
    },
  ]
```

codeFrame (error 1):

```text
117 |             expect(center).not.toBeNull();
118 |             const viewport = m.diagram.getViewport();
119 |             expect(pan).toHaveBeenLastCalledWith(
    |                         ^
120 |               (center!.x - viewport.x) / viewport.scale,
121 |               (center!.y - viewport.y) / viewport.scale,
```

### [F02] src/staffRefitOnToggle.test.ts :: staffRefitOnToggle > uses the configured camera policy with chrome: false

repro:

```bash
npx rstest 'src/staffRefitOnToggle.test.ts' --testNamePattern 'staffRefitOnToggle > uses the configured camera policy with chrome: false'
```

details:

```json
{
  "testPath": "src/staffRefitOnToggle.test.ts",
  "project": "rstest",
  "fullName": "staffRefitOnToggle > uses the configured camera policy with chrome: false",
  "status": "fail",
  "duration": 4,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected last \"panTo\" call to have been called with [ 100, 142.00000000000003, …(1) ]",
      "topFrame": {
        "file": "src/staffRefitOnToggle.test.ts",
        "line": 119,
        "column": 25,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/staffRefitOnToggle.test.ts",
      "line": 119
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

  [
    100,
-   142.00000000000003,
+   142,
    {
      "animate": true,
    },
  ]
```

codeFrame (error 1):

```text
117 |             expect(center).not.toBeNull();
118 |             const viewport = m.diagram.getViewport();
119 |             expect(pan).toHaveBeenLastCalledWith(
    |                         ^
120 |               (center!.x - viewport.x) / viewport.scale,
121 |               (center!.y - viewport.y) / viewport.scale,
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run

FACT: SDK rerun exit 1: only two T131 pan-coordinate assertions failed (142 versus 142.00000000000003 from screen/world round trip).
DECISION: Compare derived floating-point coordinates with closeTo; retain exact animation-options and call-order checks.
NEXT: Run SDK gate again.

> @org-hierarchy/sdk@1.1.1 test
> rstest run

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:42:10.790Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 165,
    "failedFiles": 0,
    "tests": 1351,
    "failedTests": 0,
    "passedTests": 1349,
    "skippedTests": 2,
    "todoTests": 0
  },
  "durationMs": {
    "total": 10257,
    "build": 193,
    "tests": 10064
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

No test failures reported.

Note: all tests passed. Lists omitted for brevity.

FACT: Full SDK rerun PASS, exit 0.
NEXT: Recheck noEmit types after assertion correction; then lint.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


FACT: Final SDK noEmit typecheck PASS, exit 0.
NEXT: Gate npm run lint (full output follows).

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: Lint PASS, exit 0.
NEXT: Gate npm run check:docs (full output follows).

> org-hierarchy@0.1.0 check:docs
> node scripts/check-docs.mjs

· задокументовано з часу базової лінії: subscribePromoteSync — приберіть їх з UNDOCUMENTED_BASELINE у scripts/check-docs.mjs, щоб борг не зміг повернутись
· брифінг відстає на 24 комітів з 25 дозволених
✅ дока свіжа: лінки резолвяться, публічний API описаний, барель без тест-хуків, брифінг у межах

FACT: check:docs PASS, exit 0; git diff --check PASS. Docs gate notes subscribePromoteSync is now documented and can leave UNDOCUMENTED_BASELINE; scripts are outside this task scope, so baseline unchanged. Briefing is 24 commits behind, within its 25-commit gate.
FACT: Branch remains chore/library-boundary-housekeeping at 7080443, preserving 945069b. No demo/dist diff, builds, emitting typechecks, worktrees, commits, pushes or external-store writes were made. Unrelated existing/concurrent work remains untouched (including newly appearing T132 task).
DECISION: Implementation is ready for reviewer; host visual comparison and demo typecheck remain with reviewer as instructed.

## 1. Done
FACT: Added staffRefitOnToggle boolean | StaffFitOptions, off by default. Both togglePositionExpand branches reuse fitStaffChrome for target computation/placement, synchronously prepare target-frame overlay cards, restore the start viewport, and invoke host.animateViewport with its existing defaults. Missing chrome falls back to the existing node pan. No runtime setter or demo flag. StaffFitOptions was already exported. Ukrainian docs cover the option and public prepare-camera reason.

## 2. Tested scenarios
FACT: TDD RED: 3 expected assertion failures, 40 passing focused tests; GREEN: all 43 focused tests pass. Tests cover expand and collapse, absent/false options, true/default fit, padding override, target-at-preparation and restored-start-at-animation ordering, missing-box fallback, synchronous DOM commit for preparation, and unchanged ordinary structural commit behaviour.
FACT: Final gates: SDK 1349 passed / 2 skipped across 165 files; demo 132 passed / 1 skipped across 18 files; SDK noEmit typecheck PASS; lint PASS; check:docs PASS. Full command output, including intermediate task-local failures and repairs, is appended above. No unrelated failure occurred.

## 3. Non-obvious findings
FACT: Draft tests needed correction to the actual StaffChromeGeometry shape and a host.panTo spy instead of a private facade method. Screen/world round-trip assertions use closeTo for floating-point coordinates. Production defaults are not duplicated. React flushSync is limited to prepare-camera; existing structural and camera handling remains unchanged.
FACT: These are local automated seam tests, not evidence of host visual integration, browser animation fidelity, independent review or mutation testing. Those checks are NOT_TESTED here.

## 4. Screenshots
FACT: No screenshots captured; no host/demo browser session or build was requested for this run.

## 5. User-flow walkthrough
FACT: With option absent/false, toggle renders and pans to the toggled node as before. With true/options and a staff org box, toggle renders, temporarily fits the target, sends prepare-camera so React commits the target cards synchronously, returns to the start frame, then animates to the fit target. Without a box it pans normally. revealPath, expandToDepth and collapsePositionSubtree retain their existing paths.

## 6. Limits and handoff
FACT: Demo tsc typecheck: deferred to reviewer. No dist-writing gate was run because dist is linked LIVE to another project. Reviewer owns the host comparison and any later builds after that project confirms. This file is the append-only task checkpoint; no external checkpoint store used.
NEXT: Reviewer inspects this diff and runs the deferred host comparison/build/typechecks when authorized by the linked project.
QUESTION: None pending for implementation.

## Post-deploy
FACT: NOT_TESTED — no deploy, commit or push performed or authorized in this task.
