NEXT: Read the required plan, spec, and code; add failing interaction tests.
STEP 1 — Read R2-A.md in full and .ai/README.md. Scope restricted to the two overlay files and this append-only log. No builds, root typecheck, commits, branch changes, or external store.
NEXT: Add the first failing interaction integration test.
STEP 2 — Read rev.2 plan and spec, overlay implementation including FrameBackdrop/dispose/transition/structural paths, existing real-root tests, InteractionStore, SelectionPointerMods and NodeRef. Reviewed standards and briefing. TDD skill applies; the user-confirmed seam is the optional interaction object and observable card props/render counts. Implementation will use a per-slot imperative refresh with boolean change detection and effect cleanup on unmount/dispose. No full sync on interaction events.
NEXT: Run the scoped test for RED.
STEP 3 — Added real-root interaction test covering initial state, action arguments, selection and hover changes, unaffected render counts, no candidate resolution/full sync, unchanged-event suppression, removal cleanup and disposal cleanup.

STEP 4 — RED scoped tests
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run createReactPromoteOverlay

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
npm error command sh -c rstest run createReactPromoteOverlay

```
Exit: 1
NEXT: Implement the interaction seam.

STEP 5 — RED retry with localhost permission after EPERM
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run createReactPromoteOverlay

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:36:42.090Z"
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
    "tests": 42,
    "failedTests": 1,
    "passedTests": 41,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1053,
    "build": 138,
    "tests": 915
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

### [F01] src/react/createReactPromoteOverlay.test.ts :: per-slot interaction > reads interaction, forwards actions, refreshes only changed cards and releases subscriptions

repro:

```bash
npx rstest 'src/react/createReactPromoteOverlay.test.ts' --testNamePattern 'per-slot interaction > reads interaction, forwards actions, refreshes only changed cards and releases subscriptions'
```

details:

```json
{
  "testPath": "src/react/createReactPromoteOverlay.test.ts",
  "project": "rstest",
  "fullName": "per-slot interaction > reads interaction, forwards actions, refreshes only changed cards and releases subscriptions",
  "status": "fail",
  "duration": 4,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected undefined to be true // Object.is equality",
      "topFrame": {
        "file": "src/react/createReactPromoteOverlay.test.ts",
        "line": 1678,
        "column": 42,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/react/createReactPromoteOverlay.test.ts",
      "line": 1678
    }
  ]
}
```

diff:

```diff
- Expected:
true

+ Received:
undefined
```

codeFrame (error 1):

```text
1676 |     try {
1677 |       act(() => { overlay = createReactPromoteOverlay({ diagram, mount, component: Card, mode: 'near-visible', interaction }); });
1678 |       expect(seen.get('pos1')?.selected).toBe(true);
     |                                          ^
1679 |       expect(seen.get('pos1')?.hovered).toBe(false);
1680 |       expect(seen.get('pos2')?.selected).toBe(false);
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
npm error command sh -c rstest run createReactPromoteOverlay

```
Exit: 1
NEXT: Implement after confirmed assertion failure.
NEXT: Run scoped GREEN tests.
STEP 6 — Confirmed RED: 41 existing tests passed and new interaction test failed on undefined selected. Added typed props and optional seam; opt-in slot uses useImperativeHandle/useReducer and per-slot subscription with boolean comparison. Layout-effect cleanup releases subscriptions on removal, failure and dispose. Existing static path and DOM remain intact; no interaction path invokes sync or listPromoteCandidates.

STEP 7 — GREEN scoped tests
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run createReactPromoteOverlay

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:37:11.284Z"
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
    "tests": 42,
    "failedTests": 0,
    "passedTests": 42,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1012,
    "build": 136,
    "tests": 876
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
- src/react/createReactPromoteOverlay.test.ts :: per-slot interaction > reads interaction, forwards actions, refreshes only changed cards and releases subscriptions

### Skipped

None.

## Failures

No test failures reported.

```
Exit: 0
NEXT: Verify absent/null compatibility and required gates.
NEXT: Run final scoped tests, SDK noEmit typecheck and lint.
STEP 8 — Added absent and explicit-null passive compatibility tests: false state, safe callbacks, no diagram selection calls, unchanged DOM after callbacks and identical default-card DOM. These assertions would fail against the original missing props/callbacks; the first integration test already established RED for this contract.

STEP 9 — npm test -w @org-hierarchy/sdk -- createReactPromoteOverlay
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run createReactPromoteOverlay

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:37:42.134Z"
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
    "tests": 44,
    "failedTests": 0,
    "passedTests": 44,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 940,
    "build": 129,
    "tests": 811
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
- src/react/createReactPromoteOverlay.test.ts :: per-slot interaction > reads interaction, forwards actions, refreshes only changed cards and releases subscriptions
- src/react/createReactPromoteOverlay.test.ts :: keeps the default card unchanged and actions passive with undefined interaction
- src/react/createReactPromoteOverlay.test.ts :: keeps the default card unchanged and actions passive with null interaction

### Skipped

None.

## Failures

No test failures reported.

```
Exit: 0
NEXT: Inspect remaining gate results and scoped diff.

STEP 9 — npm run typecheck -w @org-hierarchy/sdk
```text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


```
Exit: 0
NEXT: Inspect remaining gate results and scoped diff.

STEP 9 — npm run lint
```text

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


```
Exit: 0
NEXT: Inspect remaining gate results and scoped diff.
NEXT: Complete scoped inspection and final status.
STEP 10 — All 44 scoped tests passed; SDK noEmit typecheck and lint passed. Full command output is preserved above without shell pipes. Scoped git diff --check passed. Only the two assigned source/test files and this log were written; parallel work was left untouched. DefaultPromoteCard and transition/structural handling are unchanged. Per-slot layout-effect cleanup is invoked by the existing root.unmount() in dispose, so no separate registry is needed.
NEXT: Return the single STATUS line.
STEP 11 — Final inspection complete. The developer-required session checkpoint was attempted using the current native host/root/session and registered runtime; exit 1: mktemp could not create the manual-selection directory in the configured receipt parent (Operation not permitted). No checkpoint succeeded and no external store was written. Product gates remain PASS.

DONE: Typed selected/hovered/onSelect/onHover props and optional interaction seam implemented in the library overlay.
TESTED SCENARIOS: Initial state, modifier forwarding, hover true/false forwarding, targeted selection and hover refresh, unchanged-event suppression, zero candidate resolution/full sync, absent/null passive behavior, removal and disposal cleanup; 44 tests passed.
NON-OBVIOUS FINDINGS: Existing root.unmount() invokes per-slot layout-effect cleanup; separate disposal bookkeeping is unnecessary. Localhost tests require escalation after listen EPERM.
SCREENSHOTS: Not applicable; real React root DOM assertions cover this library contract.
USER FLOW: Host supplies interaction seam; each near card receives current booleans and forwards actions for its own string id; changes refresh only affected cards. Without the seam the default DOM remains unchanged.
POST-DEPLOY: Not run; deployment/build/commit/push are outside this brief. R2-B facade wiring and documentation remain assigned to the serialized follow-up.
STATUS: PASS — R2-A implemented; 44 tests, SDK noEmit typecheck and lint passed.
