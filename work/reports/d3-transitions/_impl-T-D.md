NEXT: Read the contract, plan, facts, standards, and overlay sources before writing boundary tests. The brief's requirement for an entry before the first tool call could only be discovered by reading it; this is the first append after that discovery. All work and evidence will stay in this repository.
FACT: Read the landed TransitionFrame contract and task architecture. The combined reference read exceeded tool output limits; reading focused sources next rather than treating truncated output as complete.
NEXT: Inspect overlay implementation and existing tests, and reread required plan seams and standards separately.
FACT: Cards currently render under display:contents slot wrappers; transition must use a transformable wrapper while retaining host absolute positioning. Existing sync hides Pixi before asynchronous React render. Camera fallback currently catches every non-structural reason.
NEXT: Read focused test scaffolding and remaining seams before adding RED cases.
DECISION: Use frame-aware geometry for mounting/filtering and transformable slot wrappers for intermediate motion. Preserve card React elements across backdrop-only updates. Test anchors ignore transition before any DOM work.
NEXT: Confirm failure isolation contract and existing source conventions, then write success/failure tests.
FACT: Plan §5.4 assigns isolation between subscribers to T-E; T-D can verify its own failing frame read is contained and subsequent frames recover, without importing the facade. Existing unrelated working-tree edits belong to parallel sessions.
DECISION: TDD skill applies at the user-approved overlay seam. Success tests cover transform, identity/render counts, backdrop reads, mount/dispose; failure test injects a throwing frame read and expects one warning and recovery.
NEXT: Add tests before production edits.
FACT: Added success and failure tests for scripted frame motion, backdrop refresh, stable cards, frame-read recovery, and unchanged target anchors.
NEXT: Run only the two owned overlay test files for RED.

FACT: RED run exited 1; all three new cases fail (success, failure, anchors); 50 existing tests pass.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/react/createReactPromoteOverlay.test.ts src/react/createTestAnchorOverlay.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:37:39.663Z"
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
    "tests": 53,
    "failedTests": 3,
    "passedTests": 50,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1035,
    "build": 137,
    "tests": 898
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

### [F01] src/react/createReactPromoteOverlay.test.ts :: transition frames > success: moves mounted cards without rendering them and refreshes chrome through settle

repro:

```bash
npx rstest 'src/react/createReactPromoteOverlay.test.ts' --testNamePattern 'transition frames > success: moves mounted cards without rendering them and refreshes chrome through settle'
```

details:

```json
{
  "testPath": "src/react/createReactPromoteOverlay.test.ts",
  "project": "rstest",
  "fullName": "transition frames > success: moves mounted cards without rendering them and refreshes chrome through settle",
  "status": "fail",
  "duration": 7,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected '25px' to be '65px' // Object.is equality",
      "topFrame": {
        "file": "src/react/createReactPromoteOverlay.test.ts",
        "line": 1511,
        "column": 32,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/react/createReactPromoteOverlay.test.ts",
      "line": 1511
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- 65px
+ 25px
```

codeFrame (error 1):

```text
1509 |     try {
1510 |       const card = mount.querySelector<HTMLElement>('[data-promote-card]');
1511 |       expect(card?.style.left).toBe('65px');
     |                                ^
1512 |       expect(card?.style.top).toBe('87px');
1513 |       const initialRenders = renders;
```

console:

```text
[stderr] error: Error: host card blew up
    at component (/Users/strelia/projects/dg/packages/sdk/src/react/createReactPromoteOverlay.test.ts:862:41)
    at Object.react_stack_bottom_frame (/Users/strelia/projects/dg/node_modules/react-dom/cjs/react-dom-client.development.js:25904:1)
    at renderWithHooks (/Users/strelia/projects/dg/node_modules/react-dom/cjs/react-dom-client.development.js:7662:1)
    at updateFunctionComponent (/Users/strelia/projects/dg/node_modules/react-dom/cjs/react-dom-c... [truncated]
```

### [F02] src/react/createReactPromoteOverlay.test.ts :: transition frames > failure: a frame read throws once without stopping later overlay frames

repro:

```bash
npx rstest 'src/react/createReactPromoteOverlay.test.ts' --testNamePattern 'transition frames > failure: a frame read throws once without stopping later overlay frames'
```

details:

```json
{
  "testPath": "src/react/createReactPromoteOverlay.test.ts",
  "project": "rstest",
  "fullName": "transition frames > failure: a frame read throws once without stopping later overlay frames",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"warn\" to be called 1 times, but got 0 times",
      "topFrame": {
        "file": "src/react/createReactPromoteOverlay.test.ts",
        "line": 1556,
        "column": 20,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/react/createReactPromoteOverlay.test.ts",
      "line": 1556
    }
  ]
}
```

codeFrame (error 1):

```text
1554 |       fail = true;
1555 |       act(() => notify('transition'));
1556 |       expect(warn).toHaveBeenCalledTimes(1);
     |                    ^
1557 |       fail = false;
1558 |       x = 45;
```

console:

```text
[stderr] error: Error: host card blew up
    at component (/Users/strelia/projects/dg/packages/sdk/src/react/createReactPromoteOverlay.test.ts:862:41)
    at Object.react_stack_bottom_frame (/Users/strelia/projects/dg/node_modules/react-dom/cjs/react-dom-client.development.js:25904:1)
    at renderWithHooks (/Users/strelia/projects/dg/node_modules/react-dom/cjs/react-dom-client.development.js:7662:1)
    at updateFunctionComponent (/Users/strelia/projects/dg/node_modules/react-dom/cjs/react-dom-c... [truncated]
```

### [F03] src/react/createTestAnchorOverlay.test.ts :: transition signals preserve target anchor positions and DOM identity

repro:

```bash
npx rstest 'src/react/createTestAnchorOverlay.test.ts' --testNamePattern 'transition signals preserve target anchor positions and DOM identity'
```

details:

```json
{
  "testPath": "src/react/createTestAnchorOverlay.test.ts",
  "project": "rstest",
  "fullName": "transition signals preserve target anchor positions and DOM identity",
  "status": "fail",
  "duration": 7,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected <button type=\"button\" …(6)></button> to be <button type=\"button\" …(6)></button> // Object.is equality\n\nIf it should pass with deep equality, replace \"toBe\" with \"toStrictEqual\"\n\nExpected: <button type=\"button\" …(6)></button>\nReceived: serializes to the same string\n",
      "topFrame": {
        "file": "src/react/createTestAnchorOverlay.test.ts",
        "line": 313,
        "column": 62,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/react/createTestAnchorOverlay.test.ts",
      "line": 313
    }
  ]
}
```

diff:

```diff
Compared values have no visual difference.
```

codeFrame (error 1):

```text
311 |     notify('transition');
312 |     notify('transition');
313 |     expect(mount.querySelector('[data-testid="node-root"]')).toBe(anchor);
    |                                                              ^
314 |     expect(anchor?.style.left).toBe('10px');
315 |     expect(list.mock.calls.length).toBe(calls);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/react/createReactPromoteOverlay.test.ts src/react/createTestAnchorOverlay.test.ts

NEXT: Implement frame-aware positions, backdrop-only refresh, isolated transition handling, and anchor ignore.
FACT: Implemented optional frame seam, mount/filter frame geometry, direct wrapper transforms, backdrop-only forceUpdate, transition catch/warn, and anchor early ignore. PromoteSyncReason changed additively only.
NEXT: Run the owned tests for GREEN and inspect any failures.

FACT: First GREEN: 53/53 owned tests passed, exit 0. Full tool output follows (Rstest itself abbreviates its passed-test list).

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/react/createReactPromoteOverlay.test.ts src/react/createTestAnchorOverlay.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:38:45.432Z"
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
    "tests": 53,
    "failedTests": 0,
    "passedTests": 53,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 764,
    "build": 52,
    "tests": 712
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
- src/react/createReactPromoteOverlay.test.ts :: transition frames > success: moves mounted cards without rendering them and refreshes chrome through settle
- src/react/createReactPromoteOverlay.test.ts :: transition frames > failure: a frame read throws once without stopping later overlay frames
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay > success: renders data-testid anchors synced to viewport
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay > success: interactive click calls focusByTestId
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay > success: interactive contextmenu opens menu for ref
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > success: a node carrying a box gets a second anchor beside the first
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > success: the expander anchor is appended AFTER its node anchor
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > failure: a leaf gets no expander anchor, because there is no box
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > success: clicking the expander toggles and does NOT select
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > success: clicking the node anchor still selects — the contrast to the line above
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > failure: a refused toggle is caught — witnessed by the warning, not by the event
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > failure: right-click on the expander opens the diagram menu, not the browser one
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > failure: with interactive off the expander anchor takes no clicks at all
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > success: the expander anchor does not duplicate the node id attributes

Note: list truncated (showing 50 of 53).

### Skipped

None.

## Failures

No test failures reported.

NEXT: Strengthen mid-transition structural and mount handoff checks, including entering scale/opacity and timer avoidance.
FACT: Added a boundary test that observes DOM immediately inside act after mounting and structural sync, models Pixi visibility via the public promotion callback, and checks no transition timer is scheduled.
NEXT: Run RED for the entering-card structural handoff.

FACT: Handoff RED exited 1: mid-transition structural signal left the previous DOM geometry until React flushed.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/react/createReactPromoteOverlay.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:39:15.284Z"
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
    "tests": 39,
    "failedTests": 1,
    "passedTests": 38,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 870,
    "build": 125,
    "tests": 745
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

### [F01] src/react/createReactPromoteOverlay.test.ts :: mount and structural sync commit entering cards before returning, without transition timers

repro:

```bash
npx rstest 'src/react/createReactPromoteOverlay.test.ts' --testNamePattern 'mount and structural sync commit entering cards before returning, without transition timers'
```

details:

```json
{
  "testPath": "src/react/createReactPromoteOverlay.test.ts",
  "project": "rstest",
  "fullName": "mount and structural sync commit entering cards before returning, without transition timers",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected '90px' to be '130px' // Object.is equality",
      "topFrame": {
        "file": "src/react/createReactPromoteOverlay.test.ts",
        "line": 1590,
        "column": 83,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/react/createReactPromoteOverlay.test.ts",
      "line": 1590
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- 130px
+ 90px
```

codeFrame (error 1):

```text
1588 |     act(() => {
1589 |       notify('structural');
1590 |       expect(mount.querySelector<HTMLElement>('[data-promote-card]')?.style.left).toBe('130px');
     |                                                                                   ^
1591 |       expect(mount.querySelector<HTMLElement>('[data-promote-slot]')?.style.opacity).toBe('0.4');
1592 |       expect(mount.querySelector<HTMLElement>('[data-promote-slot]')?.style.transform).toBe('translate(0px, 0px) scale(0.9)');
```

console:

```text
[stderr] error: Error: host card blew up
    at component (/Users/strelia/projects/dg/packages/sdk/src/react/createReactPromoteOverlay.test.ts:862:41)
    at Object.react_stack_bottom_frame (/Users/strelia/projects/dg/node_modules/react-dom/cjs/react-dom-client.development.js:25904:1)
    at renderWithHooks (/Users/strelia/projects/dg/node_modules/react-dom/cjs/react-dom-client.development.js:7662:1)
    at updateFunctionComponent (/Users/strelia/projects/dg/node_modules/react-dom/cjs/react-dom-c... [truncated]
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/react/createReactPromoteOverlay.test.ts

NEXT: Commit frame-aware structural rebuilds synchronously and apply entering scale/opacity immediately.
FACT: Frame-aware sync now commits and applies the frame before returning; static hosts retain existing asynchronous structural semantics.
NEXT: Run owned tests and the permitted noEmit SDK typecheck and lint gates.

FACT: Owned overlay tests exited 0.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/react/createReactPromoteOverlay.test.ts src/react/createTestAnchorOverlay.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:39:36.333Z"
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
    "tests": 54,
    "failedTests": 0,
    "passedTests": 54,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1153,
    "build": 278,
    "tests": 875
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
- src/react/createReactPromoteOverlay.test.ts :: transition frames > success: moves mounted cards without rendering them and refreshes chrome through settle
- src/react/createReactPromoteOverlay.test.ts :: transition frames > failure: a frame read throws once without stopping later overlay frames
- src/react/createReactPromoteOverlay.test.ts :: mount and structural sync commit entering cards before returning, without transition timers
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay > success: renders data-testid anchors synced to viewport
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay > success: interactive click calls focusByTestId
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay > success: interactive contextmenu opens menu for ref
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > success: a node carrying a box gets a second anchor beside the first
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > success: the expander anchor is appended AFTER its node anchor
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > failure: a leaf gets no expander anchor, because there is no box
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > success: clicking the expander toggles and does NOT select
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > success: clicking the node anchor still selects — the contrast to the line above
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > failure: a refused toggle is caught — witnessed by the warning, not by the event
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > failure: right-click on the expander opens the diagram menu, not the browser one
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > failure: with interactive off the expander anchor takes no clicks at all

Note: list truncated (showing 50 of 54).

### Skipped

None.

## Failures

No test failures reported.

FACT: SDK noEmit typecheck exited 1.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/OrgHierarchyDiagram.ts(509,28): error TS2339: Property 'configureTransition' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(510,28): error TS2339: Property 'onTransitionFrame' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(2110,42): error TS2339: Property 'getTransitionFrame' does not exist on type 'DiagramRenderer'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

FACT: Repository lint exited 1.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0

packages/sdk/src/OrgHierarchyDiagram.transitions.test.ts:30:44: error unicorn(no-array-reverse): Use `Array#toReversed()` instead of `Array#reverse()`. help: `Array#reverse()` mutates the original array. Use `Array#toReversed()` to return a new reversed array without modifying the original.
packages/sdk/src/react/createReactPromoteOverlay.ts:251:1: error eslint(max-classes-per-file): File has too many classes (2). Maximum allowed is 1 help: Reduce the number of classes in this file

FACT: Typecheck errors are only in T-E facade references to pending T-C seams. Lint found one owned violation (second class) and an unrelated T-E test violation; only the owned violation will be fixed.
NEXT: Replace the backdrop refresh class with a hook component, then review the owned diff.
FACT: Replaced the second class with a backdrop-only hook refresh handle, preserving the per-frame card render isolation and meeting max-classes-per-file.
NEXT: Inspect the final diff and check active-frame layout assumptions.
FACT: Diff review confirmed the only promoteMath change is its reason union. Static hosts now retain display:contents wrappers exactly; only applyFrame activates transformable full-layer wrappers. Structural ref callbacks clear imperative transforms and opacity.
NEXT: Add back-compat and frame-visible/target-offscreen tests, then rerun owned verification.
FACT: Added boundary coverage for absent getTransitionFrame (no timer, stable static DOM) and visible frame geometry with an offscreen target box. These exercise fallback and mount filtering beyond the original RED cases.
NEXT: Run the final owned tests, SDK noEmit typecheck, and lint.

FACT: Final owned overlay tests exited 0.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/react/createReactPromoteOverlay.test.ts src/react/createTestAnchorOverlay.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:41:04.621Z"
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
    "tests": 56,
    "failedTests": 0,
    "passedTests": 56,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 976,
    "build": 162,
    "tests": 814
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
- src/react/createReactPromoteOverlay.test.ts :: transition frames > success: moves mounted cards without rendering them and refreshes chrome through settle
- src/react/createReactPromoteOverlay.test.ts :: transition frames > failure: a frame read throws once without stopping later overlay frames
- src/react/createReactPromoteOverlay.test.ts :: mount and structural sync commit entering cards before returning, without transition timers
- src/react/createReactPromoteOverlay.test.ts :: failure boundary: absent frame seam ignores transition without scheduling a rebuild
- src/react/createReactPromoteOverlay.test.ts :: mount promotes a currently visible card even when its final target is offscreen
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay > success: renders data-testid anchors synced to viewport
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay > success: interactive click calls focusByTestId
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay > success: interactive contextmenu opens menu for ref
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > success: a node carrying a box gets a second anchor beside the first
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > success: the expander anchor is appended AFTER its node anchor
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > failure: a leaf gets no expander anchor, because there is no box
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > success: clicking the expander toggles and does NOT select
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > success: clicking the node anchor still selects — the contrast to the line above
- src/react/createTestAnchorOverlay.test.ts :: createTestAnchorOverlay expander anchor (T115 K5) > failure: a refused toggle is caught — witnessed by the warning, not by the event

Note: list truncated (showing 50 of 56).

### Skipped

None.

## Failures

No test failures reported.

FACT: Final SDK noEmit typecheck exited 1.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/OrgHierarchyDiagram.ts(512,28): error TS2339: Property 'configureTransition' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(513,28): error TS2339: Property 'onTransitionFrame' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(529,48): error TS2339: Property 'settleNow' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(912,22): error TS2339: Property 'startTransition' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(946,35): error TS2339: Property 'transition' does not exist on type 'RenderOptions'.
src/OrgHierarchyDiagram.ts(965,39): error TS2339: Property 'abortTransition' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(2129,38): error TS2339: Property 'settleNow' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(2136,42): error TS2339: Property 'getTransitionFrame' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(2528,38): error TS2339: Property 'settleNow' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(2577,38): error TS2339: Property 'configureTransition' does not exist on type 'DiagramRenderer'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

FACT: Final repository lint exited 1.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0

packages/sdk/src/OrgHierarchyDiagram.transitions.test.ts:30:44: error unicorn(no-array-reverse): Use `Array#toReversed()` instead of `Array#reverse()`. help: `Array#reverse()` mutates the original array. Use `Array#toReversed()` to return a new reversed array without modifying the original.

FACT: 56/56 owned tests pass. No typecheck or lint diagnostics name T-D files. Shared gates remain blocked by T-E test Array.reverse and pending T-C renderer seams; those files are prohibited to T-D.
NEXT: Final scope/whitespace audit and record integration limits before the terminal status.
FACT: Final scoped git diff --check passed with no whitespace findings. Exactly five owned code/test files were edited, plus this append-only working file; no build, emitting/root typecheck, commit/push, configuration edits, or external-store writes were performed. The first-entry timing exception is recorded at the beginning.
FACT: Delivery — React cards follow kind:id frame positions through CSS transforms without component renders; backdrop refreshes independently; structural sync rebuilds; test anchors ignore transition signals and retain target positions.
FACT: Tested scenarios — 56 owned tests pass, including success/failure RED→GREEN evidence above, non-unit zoom, DOM identity and flat render counts, chrome refresh/line visibility through settle, entering scale/opacity, immediate mount/structural handoff, dispose promotion reset, no transition debounce timer, absent seam, and frame-visible target-offscreen filtering.
FACT: Findings — frame-aware structural rebuilds also need synchronous commit, not only initial mount. The static host path retains its existing display:contents wrapper and asynchronous structural behavior. A failed frame read produces one warning for that failing signal and later frames recover.
FACT: Screenshots — none; verification is at the explicitly requested overlay test boundary. No browser/build was run against the shared live dist.
FACT: User flow — mount reads the current frame, hides only promoted keys, and commits HTML; transition signals move wrappers and refresh chrome; structural signals restore full card/chrome rendering; dispose unsubscribes and clears promotion so the renderer owns the card again.
FACT: Integration/post-deploy limits — actual Pixi sprite geometry and between-subscriber failure isolation are T-C/T-E responsibilities per plan §5.4; the tests here model promotion visibility via the public callback and inject the frame seam. The host was not built or deployed. Final SDK typecheck fails only on pending renderer methods referenced by OrgHierarchyDiagram.ts; lint fails only on Array.reverse in OrgHierarchyDiagram.transitions.test.ts. No prohibited foreign file was changed to satisfy those gates.
NEXT: Coordinator combines T-C/T-E, reruns shared gates, and verifies actual Pixi/HTML handoff plus backdrop detach/settle integration (#29/#40).
FACT: Confirmed plan row #40 assigns backdrop detach/settle integration to T-E and T-D; overlay disposal clears promotion and unsubscribes, while facade settleNow behavior must be checked when the parallel renderer seam lands.
STATUS: DONE_WITH_CONCERNS — T-D implementation and 56 owned tests pass; no owned typecheck/lint diagnostics. Shared typecheck and lint remain red only in parallel-owned files; actual Pixi/facade integration awaits the coordinator.
