NEXT: Read required context and renderer seams.
STEP 1: Read .ai/README.md and R5-B brief in full; accepted exclusive two-file scope, append-only log, and command prohibitions.
STEP 2: Read plan/spec, marquee helpers, pointer/pan precedent, renderer tests, domain and TDD guidance. Agreed seams come from the brief. isDrag uses SCREEN pixels; rectangle uses WORLD coordinates. Investigating stage hit area to cover truly empty background.
NEXT: Write gesture test and record RED.
STEP 3: Added first behavior test using real Pixi propagation and Viewport pan. Empty background hits stage, so implementation must intercept stage capture before PixiHost beginPan, with target gating.
RED OUTPUT:

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

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
npm error command sh -c rstest run DiagramRenderer
STEP 4: Sandbox listen EPERM; rerunning with required permission per brief.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:34:23.377Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 4,
    "failedFiles": 1,
    "tests": 58,
    "failedTests": 1,
    "passedTests": 57,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1180,
    "build": 179,
    "tests": 1001
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

### [F01] src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag emits normalized world rectangles, intersects seats and blocks pan

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'success: Shift drag emits normalized world rectangles, intersects seats and blocks pan'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "success: Shift drag emits normalized world rectangles, intersects seats and blocks pan",
  "status": "fail",
  "duration": 14,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.setMarqueeSink is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 27,
        "column": 25,
        "method": "setup"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 27
    }
  ]
}
```

codeFrame (error 1):

```text
25 |   data.positions = ['a', 'b'].map((id, col) => ({ id, title: id, organizationId: 'o', groupIds: [], status: 'vacant', isTemporary: false, gridCell: { col, row: 0 } }));
26 |   await renderer.render(data, defaultNodeTheme, 'light', defaultRenderConfig, { lod, onCanvasClick });
27 |   if (enabled) renderer.setMarqueeSink(sink);
   |                         ^
28 |   const boundary = new EventBoundary(stage);
29 |   function pointer(type: string, x: number, y: number, shiftKey = true, target = stage) {
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer
STEP 5: RED confirmed: missing setMarqueeSink (57 existing tests pass). Implemented minimal world-space gesture and stage capture, using scene.listBoxes and sink only; listener cleanup on destroy.
GREEN OUTPUT:

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:34:51.806Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 4,
    "failedFiles": 1,
    "tests": 58,
    "failedTests": 1,
    "passedTests": 57,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1177,
    "build": 101,
    "tests": 1076
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

### [F01] src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag emits normalized world rectangles, intersects seats and blocks pan

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'success: Shift drag emits normalized world rectangles, intersects seats and blocks pan'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "success: Shift drag emits normalized world rectangles, intersects seats and blocks pan",
  "status": "fail",
  "duration": 66,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "e.currentTarget.isInteractive is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 38,
        "column": 19,
        "method": "pointer"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 38
    }
  ]
}
```

codeFrame (error 1):

```text
36 |     e.shiftKey = shiftKey;
37 |     if (type === 'globalpointermove') stage.emit(type, e);
38 |     else boundary.dispatchEvent(e, type);
   |                   ^
39 |     return e;
40 |   }
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer
STEP 6: First implementation run exposed missing Pixi event mixin in standalone tests (Application normally loads it). Added pixi.js/events initialization so propagation is real, not mocked.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:35:14.875Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 4,
    "failedFiles": 1,
    "tests": 58,
    "failedTests": 1,
    "passedTests": 57,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1354,
    "build": 181,
    "tests": 1173
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

### [F01] src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag emits normalized world rectangles, intersects seats and blocks pan

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'success: Shift drag emits normalized world rectangles, intersects seats and blocks pan'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "success: Shift drag emits normalized world rectangles, intersects seats and blocks pan",
  "status": "fail",
  "duration": 17,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [ [ { x: -3, y: -3, …(2) } ], …(1) ] to deeply equal [ [ { x: -3, y: -3, …(2) } ], …(1) ]",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 54,
        "column": 34,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 54
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

@@ -7,12 +7,12 @@
        "y": -3,
      },
    ],
    [
      {
-       "height": 20,
-       "width": 20,
-       "x": -8,
-       "y": -8,
+       "height": 5,
+       "width": 5,
+       "x": 7,
+       "y": 7,
      },
    ],
  ]
```

codeFrame (error 1):

```text
52 |   pointer('globalpointermove', x - 10, y - 10);
53 |   pointer('globalpointermove', x - 20, y - 20);
54 |   expect(sink.onRect.mock.calls).toEqual([
   |                                  ^
55 |     [{ x: box.x - 5, y: box.y - 5, width: 15, height: 15 }],
56 |     [{ x: box.x - 10, y: box.y - 10, width: 20, height: 20 }],
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer
STEP 7: Real propagation caught stage-target pan leakage: stopPropagation alone leaves other same-target listeners running. Added stopImmediatePropagation for the opted-in gesture alongside stopPropagation.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:35:32.731Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 4,
    "failedFiles": 1,
    "tests": 58,
    "failedTests": 1,
    "passedTests": 57,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1078,
    "build": 91,
    "tests": 987
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

### [F01] src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag emits normalized world rectangles, intersects seats and blocks pan

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'success: Shift drag emits normalized world rectangles, intersects seats and blocks pan'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "success: Shift drag emits normalized world rectangles, intersects seats and blocks pan",
  "status": "fail",
  "duration": 18,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [ [ { x: -3, y: -3, …(2) } ], …(1) ] to deeply equal [ [ { x: -3, y: -3, …(2) } ], …(1) ]",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 54,
        "column": 34,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 54
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

@@ -7,12 +7,12 @@
        "y": -3,
      },
    ],
    [
      {
-       "height": 20,
-       "width": 20,
-       "x": -8,
-       "y": -8,
+       "height": 5,
+       "width": 5,
+       "x": 7,
+       "y": 7,
      },
    ],
  ]
```

codeFrame (error 1):

```text
52 |   pointer('globalpointermove', x - 10, y - 10);
53 |   pointer('globalpointermove', x - 20, y - 20);
54 |   expect(sink.onRect.mock.calls).toEqual([
   |                                  ^
55 |     [{ x: box.x - 5, y: box.y - 5, width: 15, height: 15 }],
56 |     [{ x: box.x - 10, y: box.y - 10, width: 20, height: 20 }],
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer
STEP 8: Pixi source confirms capture-to-target notification invokes a lone target listener despite the flag. Bind down on stage before PixiHost.bindPan (mount ordering verified); stopImmediatePropagation now stops the later same-event listener. No PixiHost edits.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:35:56.649Z"
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
    "tests": 58,
    "failedTests": 0,
    "passedTests": 58,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1170,
    "build": 138,
    "tests": 1032
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

- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: culls at 300 views, restores on pan and counts every pass (AC1/3)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > boundary: below 300 resets stale flags without looking up boxes (AC4)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > boundary: empty scenes still count invocations (AC3/4)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: padding is half the longest screen dimension on all sides (AC6)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: zoom-out restores the whole tree (AC5 part)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: cull and reset preserve promote visibility and all edge flags (AC7)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: identical passes preserve flags and return independent stats snapshots (AC10)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: x=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: x=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: x=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: y=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: y=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: y=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: width=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: width=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: width=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: height=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: height=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: height=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: missing box explicitly restores stale false and continues (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: a box lookup exception cannot abort the paint or remaining views (N3)
- src/render/DiagramRenderer.interaction.test.ts :: success: near pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: success: mid pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: success: far pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > failure: null source preserves local behavior and can roll back mounted nodes
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > failure: unknown or wrong-kind hover paints no accent and dims no nodes
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: selection wins its accent while related dimming remains derived (rows 14/15)
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: found focus and highlighted edges survive hover and selection (row 12)
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: organization source can be replaced on existing nodes and selection wins
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: person refs resolve to their occupied seat for hover and selection
- src/render/DiagramRenderer.interaction.test.ts :: success: staff layout binds both seats and subordinate organization cards
- src/render/DiagramRenderer.interaction.test.ts :: failure boundary: LOD crossing preserves related dim and selection without hover rings
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > failure boundary: null source skips interaction paint and leaves every far seat bright
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: far hover without related lines dims all other visible seats
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: unselected hover keeps related dimming when crossing from near to far
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: selection retains priority over hover at far without dimming the selected hovered seat
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: far hover preserves found focus and highlighted edges
- src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag emits normalized world rectangles, intersects seats and blocks pan
- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > prepares at the old position, starts only on confirmation, and settles with a null signal
- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > restores detached views, boxes and promote visibility after a refused render
- src/render/DiagramRenderer.transitions.test.ts :: renderer ghost lifecycle > keeps a fading exit through another render and absorbs it when the key returns
- src/render/DiagramRenderer.transitions.test.ts :: renderer ghost lifecycle > settles before drag reads the origin
- src/render/DiagramRenderer.transitions.test.ts :: staff chrome staging > hides React lines during motion and returns interpolated org chrome then exact target routes
- src/render/DiagramRenderer.transitions.test.ts :: staff chrome staging > keeps old Pixi lines fading, hides new lines until settle and destroys old lines
- src/render/DiagramRenderer.transitions.test.ts :: Pixi chrome and culling > moves rectangular department chrome as frame boxes, including on far LOD
- src/render/DiagramRenderer.transitions.test.ts :: Pixi chrome and culling > culls moving live cards against both endpoints and exit ghosts against their frame
- src/render/DiagramRenderer.transitions.test.ts :: snap and idle boundaries > null controller preserves the recorded bare-grid positions and requests zero frames
- src/render/DiagramRenderer.transitions.test.ts :: snap and idle boundaries > unchanged data, first render, empty scene and settled scene have zero idle work
- src/render/DiagramRenderer.transitions.test.ts :: snap and idle boundaries > LOD change wins over animate, removes ghosts, then permits animation at the confirmed LOD
- src/render/DiagramRenderer.transitions.test.ts :: snap and idle boundaries > snap during exit removes every ghost and returns lines immediately

Note: list truncated (showing 50 of 58).

### Skipped

None.

## Failures

No test failures reported.
STEP 9: First slice GREEN (58/58). Added completion boundary tests: screen threshold, tap-after-drag, cancel; regression tests for plain/default pan, mid-drag camera changes and far LOD.
RED OUTPUT:

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:36:26.348Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 4,
    "failedFiles": 1,
    "tests": 65,
    "failedTests": 3,
    "passedTests": 62,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1399,
    "build": 179,
    "tests": 1220
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

### [F01] src/render/DiagramRenderer.marquee.test.ts :: failure boundary: below-threshold Shift click emits no marquee and deselects normally

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'failure boundary: below-threshold Shift click emits no marquee and deselects normally'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "failure boundary: below-threshold Shift click emits no marquee and deselects normally",
  "status": "fail",
  "duration": 8,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to not be called at all, but actually been called 1 times\n\nReceived:\n\n  1st rstest.fn() call:\n\n    Array [\n      Array [\n        \"position:a\",\n      ],\n    ]\n\n\nNumber of calls: 1\n",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 83,
        "column": 29,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 83
    }
  ]
}
```

codeFrame (error 1):

```text
81 |   pointer('pointerup', 14, 20, true, renderer.layers.root);
82 |   pointer('pointertap', 14, 20, true, renderer.layers.root);
83 |   expect(sink.onSelect).not.toHaveBeenCalled();
   |                             ^
84 |   expect(sink.onRect.mock.calls.filter(([rect]) => rect !== null)).toEqual([]);
85 |   expect(onCanvasClick).toHaveBeenCalledTimes(1);
```

### [F02] src/render/DiagramRenderer.marquee.test.ts :: success: genuine drag suppresses its tap, but the next ordinary click deselects

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'success: genuine drag suppresses its tap, but the next ordinary click deselects'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "success: genuine drag suppresses its tap, but the next ordinary click deselects",
  "status": "fail",
  "duration": 1,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to not be called at all, but actually been called 1 times\n\nReceived:\n\n  1st rstest.fn() call:\n\n    Array []\n\n\nNumber of calls: 1\n",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 95,
        "column": 29,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 95
    }
  ]
}
```

codeFrame (error 1):

```text
93 |   pointer('pointertap', 60, 80, true, renderer.layers.root);
94 |   expect(sink.onSelect).toHaveBeenCalledTimes(1);
95 |   expect(onCanvasClick).not.toHaveBeenCalled();
   |                             ^
96 |   pointer('pointerdown', 60, 80, false, renderer.layers.root);
97 |   pointer('pointerup', 60, 80, false, renderer.layers.root);
```

### [F03] src/render/DiagramRenderer.marquee.test.ts :: failure boundary: pointercancel clears the rectangle and never selects

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'failure boundary: pointercancel clears the rectangle and never selects'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "failure boundary: pointercancel clears the rectangle and never selects",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected last \"rstest.fn()\" call to have been called with [ null ]",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 119,
        "column": 23,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
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
-   null,
+   {
+     "height": 60,
+     "width": 50,
+     "x": 10,
+     "y": 20,
+   },
  ]
```

codeFrame (error 1):

```text
117 |   pointer('globalpointermove', 60, 80);
118 |   pointer('pointercancel', 60, 80);
119 |   expect(sink.onRect).toHaveBeenLastCalledWith(null);
    |                       ^
120 |   pointer('globalpointermove', 90, 90);
121 |   pointer('pointerup', 90, 90);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer
STEP 10: Three expected RED failures confirmed threshold, tap suppression and cancel. Implemented screen-pixel isDrag with sticky moved state, one-tap suppression, and cancel cleanup. Default/ordinary pan and world-space tests already pass.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:36:47.402Z"
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
    "tests": 65,
    "failedTests": 0,
    "passedTests": 65,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1195,
    "build": 102,
    "tests": 1093
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

- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: culls at 300 views, restores on pan and counts every pass (AC1/3)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > boundary: below 300 resets stale flags without looking up boxes (AC4)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > boundary: empty scenes still count invocations (AC3/4)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: padding is half the longest screen dimension on all sides (AC6)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: zoom-out restores the whole tree (AC5 part)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: cull and reset preserve promote visibility and all edge flags (AC7)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: identical passes preserve flags and return independent stats snapshots (AC10)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: x=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: x=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: x=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: y=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: y=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: y=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: width=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: width=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: width=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: height=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: height=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: height=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: missing box explicitly restores stale false and continues (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: a box lookup exception cannot abort the paint or remaining views (N3)
- src/render/DiagramRenderer.interaction.test.ts :: success: near pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: success: mid pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: success: far pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > failure: null source preserves local behavior and can roll back mounted nodes
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > failure: unknown or wrong-kind hover paints no accent and dims no nodes
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: selection wins its accent while related dimming remains derived (rows 14/15)
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: found focus and highlighted edges survive hover and selection (row 12)
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: organization source can be replaced on existing nodes and selection wins
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: person refs resolve to their occupied seat for hover and selection
- src/render/DiagramRenderer.interaction.test.ts :: success: staff layout binds both seats and subordinate organization cards
- src/render/DiagramRenderer.interaction.test.ts :: failure boundary: LOD crossing preserves related dim and selection without hover rings
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > failure boundary: null source skips interaction paint and leaves every far seat bright
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: far hover without related lines dims all other visible seats
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: unselected hover keeps related dimming when crossing from near to far
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: selection retains priority over hover at far without dimming the selected hovered seat
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: far hover preserves found focus and highlighted edges
- src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag emits normalized world rectangles, intersects seats and blocks pan
- src/render/DiagramRenderer.marquee.test.ts :: success: plain drag with sink still pans
- src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag without sink still pans
- src/render/DiagramRenderer.marquee.test.ts :: failure boundary: below-threshold Shift click emits no marquee and deselects normally
- src/render/DiagramRenderer.marquee.test.ts :: success: genuine drag suppresses its tap, but the next ordinary click deselects
- src/render/DiagramRenderer.marquee.test.ts :: success: mid-drag camera changes preserve the original world start
- src/render/DiagramRenderer.marquee.test.ts :: failure boundary: pointercancel clears the rectangle and never selects
- src/render/DiagramRenderer.marquee.test.ts :: success: far LOD selects from world boxes at a fractional zoom
- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > prepares at the old position, starts only on confirmation, and settles with a null signal
- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > restores detached views, boxes and promote visibility after a refused render
- src/render/DiagramRenderer.transitions.test.ts :: renderer ghost lifecycle > keeps a fading exit through another render and absorbs it when the key returns
- src/render/DiagramRenderer.transitions.test.ts :: renderer ghost lifecycle > settles before drag reads the origin
- src/render/DiagramRenderer.transitions.test.ts :: staff chrome staging > hides React lines during motion and returns interpolated org chrome then exact target routes

Note: list truncated (showing 50 of 65).

### Skipped

None.

## Failures

No test failures reported.
STEP 11: GREEN 65/65. Reviewing lifecycle and pointer ownership before final checks; host exception isolation belongs to facade callHostCallback per fixed seam.
NEXT: Add disable/destroy/foreign-target boundary coverage, then mutation-check previously green regressions.
STEP 12: Added active opt-out, non-background target and outside-release/idle tests before lifecycle changes.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:37:22.056Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 4,
    "failedFiles": 1,
    "tests": 68,
    "failedTests": 1,
    "passedTests": 67,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1179,
    "build": 92,
    "tests": 1087
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

### [F01] src/render/DiagramRenderer.marquee.test.ts :: failure boundary: disabling an active marquee clears its old sink and restores pan

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'failure boundary: disabling an active marquee clears its old sink and restores pan'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "failure boundary: disabling an active marquee clears its old sink and restores pan",
  "status": "fail",
  "duration": 15,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected last \"rstest.fn()\" call to have been called with [ null ]",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 143,
        "column": 23,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 143
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

  [
-   null,
+   {
+     "height": 60,
+     "width": 50,
+     "x": 10,
+     "y": 20,
+   },
  ]
```

codeFrame (error 1):

```text
141 |   pointer('globalpointermove', 60, 80);
142 |   renderer.setMarqueeSink(null);
143 |   expect(sink.onRect).toHaveBeenLastCalledWith(null);
    |                       ^
144 |   pointer('pointerup', 60, 80);
145 |   pointer('pointerdown', 60, 80);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer
STEP 13: Active opt-out RED confirmed; setter now cancels active gesture and clears previous sink before future pan, with destroyed/same-sink guards.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:37:39.026Z"
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
    "tests": 68,
    "failedTests": 0,
    "passedTests": 68,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1264,
    "build": 181,
    "tests": 1083
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

- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: culls at 300 views, restores on pan and counts every pass (AC1/3)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > boundary: below 300 resets stale flags without looking up boxes (AC4)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > boundary: empty scenes still count invocations (AC3/4)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: padding is half the longest screen dimension on all sides (AC6)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: zoom-out restores the whole tree (AC5 part)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: cull and reset preserve promote visibility and all edge flags (AC7)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: identical passes preserve flags and return independent stats snapshots (AC10)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: x=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: x=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: x=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: y=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: y=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: y=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: width=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: width=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: width=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: height=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: height=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: height=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: missing box explicitly restores stale false and continues (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: a box lookup exception cannot abort the paint or remaining views (N3)
- src/render/DiagramRenderer.interaction.test.ts :: success: near pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: success: mid pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: success: far pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > failure: null source preserves local behavior and can roll back mounted nodes
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > failure: unknown or wrong-kind hover paints no accent and dims no nodes
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: selection wins its accent while related dimming remains derived (rows 14/15)
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: found focus and highlighted edges survive hover and selection (row 12)
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: organization source can be replaced on existing nodes and selection wins
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: person refs resolve to their occupied seat for hover and selection
- src/render/DiagramRenderer.interaction.test.ts :: success: staff layout binds both seats and subordinate organization cards
- src/render/DiagramRenderer.interaction.test.ts :: failure boundary: LOD crossing preserves related dim and selection without hover rings
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > failure boundary: null source skips interaction paint and leaves every far seat bright
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: far hover without related lines dims all other visible seats
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: unselected hover keeps related dimming when crossing from near to far
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: selection retains priority over hover at far without dimming the selected hovered seat
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: far hover preserves found focus and highlighted edges
- src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag emits normalized world rectangles, intersects seats and blocks pan
- src/render/DiagramRenderer.marquee.test.ts :: success: plain drag with sink still pans
- src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag without sink still pans
- src/render/DiagramRenderer.marquee.test.ts :: failure boundary: below-threshold Shift click emits no marquee and deselects normally
- src/render/DiagramRenderer.marquee.test.ts :: success: genuine drag suppresses its tap, but the next ordinary click deselects
- src/render/DiagramRenderer.marquee.test.ts :: success: mid-drag camera changes preserve the original world start
- src/render/DiagramRenderer.marquee.test.ts :: failure boundary: pointercancel clears the rectangle and never selects
- src/render/DiagramRenderer.marquee.test.ts :: success: far LOD selects from world boxes at a fractional zoom
- src/render/DiagramRenderer.marquee.test.ts :: failure boundary: disabling an active marquee clears its old sink and restores pan
- src/render/DiagramRenderer.marquee.test.ts :: failure boundary: a node target cannot begin marquee
- src/render/DiagramRenderer.marquee.test.ts :: success: release outside completes once and idle moves do no work
- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > prepares at the old position, starts only on confirmation, and settles with a null signal
- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > restores detached views, boxes and promote visibility after a refused render

Note: list truncated (showing 50 of 68).

### Skipped

None.

## Failures

No test failures reported.

STEP 14 MUTATION: remove Shift guard

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:37:57.879Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 4,
    "failedFiles": 1,
    "tests": 68,
    "failedTests": 1,
    "passedTests": 67,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1234,
    "build": 190,
    "tests": 1044
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

### [F01] src/render/DiagramRenderer.marquee.test.ts :: success: plain drag with sink still pans

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'success: plain drag with sink still pans'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "success: plain drag with sink still pans",
  "status": "fail",
  "duration": 10,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected { x: +0, y: +0, scale: 1 } to deeply equal { x: 30, y: 40, scale: 1 }",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 70,
        "column": 37,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 70
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

  {
    "scale": 1,
-   "x": 30,
-   "y": 40,
+   "x": 0,
+   "y": 0,
  }
```

codeFrame (error 1):

```text
68 |     pointer('globalpointermove', 40, 60, !enabled);
69 |     pointer('pointerup', 40, 60, !enabled);
70 |     expect(viewport.getTransform()).toEqual({ x: 30, y: 40, scale: 1 });
   |                                     ^
71 |     expect(sink.onRect).not.toHaveBeenCalled();
72 |     expect(sink.onSelect).not.toHaveBeenCalled();
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer

MUTATION RESULT: exit 1; original source restored.

STEP 14 MUTATION: remove opt-in guard

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:37:59.122Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 4,
    "failedFiles": 1,
    "tests": 68,
    "failedTests": 2,
    "passedTests": 66,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 958,
    "build": 81,
    "tests": 877
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

### [F01] src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag without sink still pans

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'success: Shift drag without sink still pans'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "success: Shift drag without sink still pans",
  "status": "fail",
  "duration": 9,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected { x: +0, y: +0, scale: 1 } to deeply equal { x: 30, y: 40, scale: 1 }",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 70,
        "column": 37,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 70
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

  {
    "scale": 1,
-   "x": 30,
-   "y": 40,
+   "x": 0,
+   "y": 0,
  }
```

codeFrame (error 1):

```text
68 |     pointer('globalpointermove', 40, 60, !enabled);
69 |     pointer('pointerup', 40, 60, !enabled);
70 |     expect(viewport.getTransform()).toEqual({ x: 30, y: 40, scale: 1 });
   |                                     ^
71 |     expect(sink.onRect).not.toHaveBeenCalled();
72 |     expect(sink.onSelect).not.toHaveBeenCalled();
```

### [F02] src/render/DiagramRenderer.marquee.test.ts :: failure boundary: disabling an active marquee clears its old sink and restores pan

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'failure boundary: disabling an active marquee clears its old sink and restores pan'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "failure boundary: disabling an active marquee clears its old sink and restores pan",
  "status": "fail",
  "duration": 1,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected { x: +0, y: +0, scale: 1 } to deeply equal { x: 10, y: 10, scale: 1 }",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 148,
        "column": 35,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 148
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

  {
    "scale": 1,
-   "x": 10,
-   "y": 10,
+   "x": 0,
+   "y": 0,
  }
```

codeFrame (error 1):

```text
146 |   pointer('globalpointermove', 70, 90);
147 |   pointer('pointerup', 70, 90);
148 |   expect(viewport.getTransform()).toEqual({ x: 10, y: 10, scale: 1 });
    |                                   ^
149 |   expect(sink.onSelect).not.toHaveBeenCalled();
150 | });
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer

MUTATION RESULT: exit 1; original source restored.

STEP 14 MUTATION: store screen start instead of world start

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:38:00.356Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 4,
    "failedFiles": 1,
    "tests": 68,
    "failedTests": 2,
    "passedTests": 66,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 939,
    "build": 96,
    "tests": 843
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

### [F01] src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag emits normalized world rectangles, intersects seats and blocks pan

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'success: Shift drag emits normalized world rectangles, intersects seats and blocks pan'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "success: Shift drag emits normalized world rectangles, intersects seats and blocks pan",
  "status": "fail",
  "duration": 30,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [ [ { x: -3, y: -3, …(2) } ], …(1) ] to deeply equal [ [ { x: -3, y: -3, …(2) } ], …(1) ]",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 54,
        "column": 34,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 54
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

  [
    [
      {
-       "height": 15,
-       "width": 15,
+       "height": 77,
+       "width": 127,
        "x": -3,
        "y": -3,
      },
    ],
    [
      {
-       "height": 20,
-       "width": 20,
+       "height": 82,
+       "width": 132,
        "x": -8,
        "y": -8,
      },
    ],
  ]
```

codeFrame (error 1):

```text
52 |   pointer('globalpointermove', x - 10, y - 10);
53 |   pointer('globalpointermove', x - 20, y - 20);
54 |   expect(sink.onRect.mock.calls).toEqual([
   |                                  ^
55 |     [{ x: box.x - 5, y: box.y - 5, width: 15, height: 15 }],
56 |     [{ x: box.x - 10, y: box.y - 10, width: 20, height: 20 }],
```

### [F02] src/render/DiagramRenderer.marquee.test.ts :: success: mid-drag camera changes preserve the original world start

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'success: mid-drag camera changes preserve the original world start'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "success: mid-drag camera changes preserve the original world start",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected last \"rstest.fn()\" call to have been called with [ { x: 10, y: 20, width: 50, …(1) } ]",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 109,
        "column": 23,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 109
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

  [
    {
-     "height": 60,
-     "width": 50,
-     "x": 10,
-     "y": 20,
+     "height": 10,
+     "width": 60,
+     "x": 60,
+     "y": 80,
    },
  ]
```

codeFrame (error 1):

```text
107 |   viewport.setTransform({ x: -30, y: 10, scale: 0.5 });
108 |   pointer('globalpointermove', 0, 50);
109 |   expect(sink.onRect).toHaveBeenLastCalledWith({ x: 10, y: 20, width: 50, height: 60 });
    |                       ^
110 |   pointer('pointerup', 0, 50);
111 |   expect(sink.onRect).toHaveBeenLastCalledWith(null);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer

MUTATION RESULT: exit 1; original source restored.

STEP 14 MUTATION: delete world-box hit-test

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:38:01.569Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 4,
    "failedFiles": 1,
    "tests": 68,
    "failedTests": 2,
    "passedTests": 66,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 922,
    "build": 93,
    "tests": 829
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

### [F01] src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag emits normalized world rectangles, intersects seats and blocks pan

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'success: Shift drag emits normalized world rectangles, intersects seats and blocks pan'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "success: Shift drag emits normalized world rectangles, intersects seats and blocks pan",
  "status": "fail",
  "duration": 14,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to be called with arguments: [ [ 'position:a' ] ]\n\nReceived:\n\n  1st rstest.fn() call:\n\n  [\n-   [\n-     \"position:a\",\n-   ],\n+   [],\n  ]\n\n\nNumber of calls: 1\n",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 59,
        "column": 25,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 59
    }
  ]
}
```

codeFrame (error 1):

```text
57 |   ]);
58 |   pointer('pointerup', x - 20, y - 20);
59 |   expect(sink.onSelect).toHaveBeenCalledWith([box.id]);
   |                         ^
60 |   expect(sink.onRect).toHaveBeenLastCalledWith(null);
61 |   expect(viewport.getTransform()).toEqual({ x: 100, y: 50, scale: 2 });
```

### [F02] src/render/DiagramRenderer.marquee.test.ts :: success: far LOD selects from world boxes at a fractional zoom

repro:

```bash
npx rstest 'src/render/DiagramRenderer.marquee.test.ts' --testNamePattern 'success: far LOD selects from world boxes at a fractional zoom'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.marquee.test.ts",
  "project": "rstest",
  "fullName": "success: far LOD selects from world boxes at a fractional zoom",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to be called with arguments: [ [ 'position:a' ] ]\n\nReceived:\n\n  1st rstest.fn() call:\n\n  [\n-   [\n-     \"position:a\",\n-   ],\n+   [],\n  ]\n\n\nNumber of calls: 1\n",
      "topFrame": {
        "file": "src/render/DiagramRenderer.marquee.test.ts",
        "line": 135,
        "column": 25,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.marquee.test.ts",
      "line": 135
    }
  ]
}
```

codeFrame (error 1):

```text
133 |   pointer('globalpointermove', x + 5, y + 5);
134 |   pointer('pointerup', x + 5, y + 5);
135 |   expect(sink.onSelect).toHaveBeenCalledWith([box.id]);
    |                         ^
136 | });
137 | 
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer

MUTATION RESULT: exit 1; original source restored.
STEP 15: Four mutation checks failed in the intended tests (Shift guard, opt-in guard, world start, world-box hit-test); restored source after each. SDK noEmit typecheck passed; lint identified test-only side-effect import.
TYPECHECK OUTPUT (exit 0):

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

LINT OUTPUT (exit 1):

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0

packages/sdk/src/render/DiagramRenderer.marquee.test.ts:1:1: error import(no-unassigned-import): Imported module should be assigned help: Consider assigning the import to a variable or removing it if it's unused.
NEXT: Use explicit Pixi event initialization, rerun required checks.
STEP 16: Replaced side-effect import with explicit public extensions.mixin(Container, FederatedContainer); replaced fixture non-null assertions with explicit checks. No production behavior change.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:38:34.183Z"
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
    "tests": 68,
    "failedTests": 0,
    "passedTests": 68,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1228,
    "build": 173,
    "tests": 1055
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

- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: culls at 300 views, restores on pan and counts every pass (AC1/3)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > boundary: below 300 resets stale flags without looking up boxes (AC4)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > boundary: empty scenes still count invocations (AC3/4)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: padding is half the longest screen dimension on all sides (AC6)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: zoom-out restores the whole tree (AC5 part)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: cull and reset preserve promote visibility and all edge flags (AC7)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > success: identical passes preserve flags and return independent stats snapshots (AC10)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: x=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: x=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: x=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: y=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: y=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: y=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: width=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: width=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: width=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: height=NaN explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: height=Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: height=-Infinity explicitly restores a previously culled view (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: missing box explicitly restores stale false and continues (AC12/NB1)
- src/render/DiagramRenderer.cull.test.ts :: DiagramRenderer viewport culling > failure: a box lookup exception cannot abort the paint or remaining views (N3)
- src/render/DiagramRenderer.interaction.test.ts :: success: near pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: success: mid pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: success: far pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > failure: null source preserves local behavior and can roll back mounted nodes
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > failure: unknown or wrong-kind hover paints no accent and dims no nodes
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: selection wins its accent while related dimming remains derived (rows 14/15)
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: found focus and highlighted edges survive hover and selection (row 12)
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: organization source can be replaced on existing nodes and selection wins
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: person refs resolve to their occupied seat for hover and selection
- src/render/DiagramRenderer.interaction.test.ts :: success: staff layout binds both seats and subordinate organization cards
- src/render/DiagramRenderer.interaction.test.ts :: failure boundary: LOD crossing preserves related dim and selection without hover rings
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > failure boundary: null source skips interaction paint and leaves every far seat bright
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: far hover without related lines dims all other visible seats
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: unselected hover keeps related dimming when crossing from near to far
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: selection retains priority over hover at far without dimming the selected hovered seat
- src/render/DiagramRenderer.interaction.test.ts :: far hover dim-only accent > success: far hover preserves found focus and highlighted edges
- src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag emits normalized world rectangles, intersects seats and blocks pan
- src/render/DiagramRenderer.marquee.test.ts :: success: plain drag with sink still pans
- src/render/DiagramRenderer.marquee.test.ts :: success: Shift drag without sink still pans
- src/render/DiagramRenderer.marquee.test.ts :: failure boundary: below-threshold Shift click emits no marquee and deselects normally
- src/render/DiagramRenderer.marquee.test.ts :: success: genuine drag suppresses its tap, but the next ordinary click deselects
- src/render/DiagramRenderer.marquee.test.ts :: success: mid-drag camera changes preserve the original world start
- src/render/DiagramRenderer.marquee.test.ts :: failure boundary: pointercancel clears the rectangle and never selects
- src/render/DiagramRenderer.marquee.test.ts :: success: far LOD selects from world boxes at a fractional zoom
- src/render/DiagramRenderer.marquee.test.ts :: failure boundary: disabling an active marquee clears its old sink and restores pan
- src/render/DiagramRenderer.marquee.test.ts :: failure boundary: a node target cannot begin marquee
- src/render/DiagramRenderer.marquee.test.ts :: success: release outside completes once and idle moves do no work
- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > prepares at the old position, starts only on confirmation, and settles with a null signal
- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > restores detached views, boxes and promote visibility after a refused render

Note: list truncated (showing 50 of 68).

### Skipped

None.

## Failures

No test failures reported.
STEP 17: Final verification complete. Renderer suite: 68/68 GREEN (11 new marquee cases). SDK-only noEmit typecheck and repository lint both exit 0. Scoped git diff --check exits 0.
TYPECHECK OUTPUT (exit 0):

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

LINT OUTPUT (exit 0):

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0

DIFF CHECK OUTPUT (exit 0):
(no output)

DELIVERY: Modified only DiagramRenderer.ts and added DiagramRenderer.marquee.test.ts, plus this required append-only log. No branch/worktree change, commit, push, build, emitting typecheck, external store or other test suite. R5-A and R5-C files untouched.
EVIDENCE: RED for absent seam, threshold, tap suppression, cancellation and active opt-out; mutation RED for Shift gate, opt-in gate, world start and hit-test; final restored source GREEN. All test process output is appended without shell pipes. Rstest itself limits its passed-test listing to 50; no output was filtered by the runner commands.
BOUNDARY: Renderer consumes world boxes and calls sink only. Host callback exception isolation and additive store updates remain the facade-owned R5-C seam. No renderer animation loop or idle paint work added.
NEXT: R5-C integration/review by the owning coordinator; no remaining R5-B implementation steps.
STATUS: DONE — R5-B; 68/68 tests GREEN; SDK typecheck PASS; lint PASS.
