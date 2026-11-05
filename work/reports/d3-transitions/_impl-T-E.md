NEXT: Read the complete T-E contract and required source context before writing tests.
FACT: Read brief T-E.md in full and .ai/README.md. The requested pre-first-tool entry was not possible before discovering the brief; this is the first write and records that ordering deviation explicitly. No external store is used.
DECISION: Restrict writes to the facade, USAGE, owned facade tests, and this append-only working file; no build, root typecheck, commit, push, or full docs gate.
NEXT: Read plan, helper facts, contracts, standards, and facade.
FACT: Read transition contracts, helper H2/H3 facts, and plan lifecycle/overlay/acceptance requirements. Large combined context output was truncated; targeted reads follow before implementation.
DECISION: Apply the repository TDD skill; use boundary spies if renderer seams are still absent.
NEXT: Inspect facade render confirmation, rollback, camera, and overlay ownership paths.
FACT: Confirmed coalescer has no reason parameter; drawOrRestore and renderNow own distinct rollback/confirmation boundaries. Read TDD policy and skill; the brief already authorizes facade/renderer seam tests.
NEXT: Read remaining focused source and existing fixtures, then add the first success/failure tests.
FACT: Renderer transition methods have not landed yet. Existing overlay destroy only clears promoted IDs, which also happens during ordinary overlay rebuilds and export; that signal alone cannot identify backdrop teardown.
NEXT: Inspect render config setter and overlay teardown contract; use isolated renderer seam fakes for initial tests.
FACT: No existing facade backdrop lifecycle setter exists. setPromotedNodeIds([]) is ambiguous (normal empty viewport, export, disposal).
DECISION: Add documented setStaffReactChromeMounted(mounted: boolean) lifecycle seam for T-D/hosts; settling and a snap redraw on unmount restores Pixi chrome. Coordinator must wire T-D to this explicit seam rather than infer disposal from empty promoted IDs.
NEXT: Write initial config and subscriber isolation tests against a temporarily augmented real renderer prototype (transition-only methods faked until T-C lands).
FACT: Added first success/failure tests for config resolution, create-only reduced-motion sampling, and per-subscriber transition isolation. Renderer transition methods are explicitly faked at the authorized boundary while T-C is absent.
NEXT: Run owned test file for RED; append complete output directly, without pipes.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.transitions.test.ts

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
npm error command sh -c rstest run OrgHierarchyDiagram.transitions.test.ts

FACT: Initial RED command exit code: 1
FACT: Initial run could not reach tests: localhost listener rejected with EPERM. This is not behavioral RED.
NEXT: Retry exactly the owned test with localhost listener permission, as required by the brief.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:38:17.258Z"
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
    "tests": 3,
    "failedTests": 3,
    "passedTests": 0,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 715,
    "build": 176,
    "tests": 539
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

### [F01] src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: resolves opt-in physics once at creation

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.test.ts' --testNamePattern 'facade transitions > success: resolves opt-in physics once at creation'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.test.ts",
  "project": "rstest",
  "fullName": "facade transitions > success: resolves opt-in physics once at creation",
  "status": "fail",
  "duration": 62,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to be called with arguments: [ { stiffness: 120, …(3) } ]\n\nNumber of calls: 0\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.test.ts",
        "line": 65,
        "column": 38,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.test.ts",
      "line": 65
    }
  ]
}
```

codeFrame (error 1):

```text
63 |     const media = rstest.spyOn(window, 'matchMedia');
64 |     const { diagram } = await mount({ animate: { stiffness: 120, damping: 15, mass: 2 } });
65 |     expect(seam.configureTransition).toHaveBeenCalledWith({ stiffness: 120, damping: 15, mass: 2, fadeMs: 200 });
   |                                      ^
66 |     const reads = media.mock.calls.filter(([query]) => query.includes('reduced-motion')).length;
67 |     expect(reads).toBe(1);
```

### [F02] src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > failure: reduced motion disables an opted-in transition

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.test.ts' --testNamePattern 'facade transitions > failure: reduced motion disables an opted-in transition'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.test.ts",
  "project": "rstest",
  "fullName": "facade transitions > failure: reduced motion disables an opted-in transition",
  "status": "fail",
  "duration": 5,
  "retryCount": 0,
  "errors": [
    {
      "type": "RangeError",
      "message": "Maximum call stack size exceeded",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.test.ts",
        "line": 75,
        "column": 76,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.test.ts",
      "line": 75
    }
  ]
}
```

codeFrame (error 1):

```text
73 |     const seam = transitionSeam();
74 |     const original = window.matchMedia.bind(window);
75 |     rstest.spyOn(window, 'matchMedia').mockImplementation((query) => ({ ...original(query), matches: query.includes('reduced-motion') }));
   |                                                                            ^
76 |     await mount({ animate: true });
77 |     expect(seam.configureTransition).toHaveBeenCalledWith(null);
```

### [F03] src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > failure: one throwing transition subscriber cannot block the next subscriber or frame

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.test.ts' --testNamePattern 'facade transitions > failure: one throwing transition subscriber cannot block the next subscriber or frame'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.test.ts",
  "project": "rstest",
  "fullName": "facade transitions > failure: one throwing transition subscriber cannot block the next subscriber or frame",
  "status": "fail",
  "duration": 0,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "Cannot read properties of undefined (reading 'matches')",
      "topFrame": {
        "file": "src/render/theme.ts",
        "line": 14,
        "column": 30,
        "method": "resolveTheme"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.test.ts",
      "line": 51
    },
    {
      "path": "src/render/theme.ts",
      "line": 14
    },
    {
      "path": "src/OrgHierarchyDiagram.ts",
      "line": 402
    }
  ]
}
```

codeFrame (error 1):

```text
12 | export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
13 |   if (mode === 'auto') {
14 |     return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
   |                              ^
15 |   }
16 |   return mode;
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.transitions.test.ts

FACT: Permitted RED command exit code: 1
FACT: Config success test is behavioral RED. Two other cases exposed a test-fixture recursion in the globally mocked matchMedia; fixed the fixture using a captured MediaQueryList shape and explicit reset per test.
NEXT: Repeat RED to verify all failures are missing facade behavior.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:38:45.200Z"
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
    "tests": 3,
    "failedTests": 3,
    "passedTests": 0,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 763,
    "build": 187,
    "tests": 576
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

### [F01] src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: resolves opt-in physics once at creation

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.test.ts' --testNamePattern 'facade transitions > success: resolves opt-in physics once at creation'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.test.ts",
  "project": "rstest",
  "fullName": "facade transitions > success: resolves opt-in physics once at creation",
  "status": "fail",
  "duration": 57,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to be called with arguments: [ { stiffness: 120, …(3) } ]\n\nNumber of calls: 0\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.test.ts",
        "line": 70,
        "column": 38,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.test.ts",
      "line": 70
    }
  ]
}
```

codeFrame (error 1):

```text
68 |     const media = rstest.spyOn(window, 'matchMedia');
69 |     const { diagram } = await mount({ animate: { stiffness: 120, damping: 15, mass: 2 } });
70 |     expect(seam.configureTransition).toHaveBeenCalledWith({ stiffness: 120, damping: 15, mass: 2, fadeMs: 200 });
   |                                      ^
71 |     const reads = media.mock.calls.filter(([query]) => query.includes('reduced-motion')).length;
72 |     expect(reads).toBe(1);
```

### [F02] src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > failure: reduced motion disables an opted-in transition

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.test.ts' --testNamePattern 'facade transitions > failure: reduced motion disables an opted-in transition'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.test.ts",
  "project": "rstest",
  "fullName": "facade transitions > failure: reduced motion disables an opted-in transition",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to be called with arguments: [ null ]\n\nNumber of calls: 0\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.test.ts",
        "line": 81,
        "column": 38,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.test.ts",
      "line": 81
    }
  ]
}
```

codeFrame (error 1):

```text
79 |     rstest.spyOn(window, 'matchMedia').mockImplementation((query) => ({ ...mediaTemplate, matches: query.includes('reduced-motion') }));
80 |     await mount({ animate: true });
81 |     expect(seam.configureTransition).toHaveBeenCalledWith(null);
   |                                      ^
82 |   });
83 | 
```

### [F03] src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > failure: one throwing transition subscriber cannot block the next subscriber or frame

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.test.ts' --testNamePattern 'facade transitions > failure: one throwing transition subscriber cannot block the next subscriber or frame'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.test.ts",
  "project": "rstest",
  "fullName": "facade transitions > failure: one throwing transition subscriber cannot block the next subscriber or frame",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to be called 2 times, but got 0 times",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.test.ts",
        "line": 95,
        "column": 18,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.test.ts",
      "line": 95
    }
  ]
}
```

codeFrame (error 1):

```text
93 |     renderer.onTransitionFrame?.();
94 |     renderer.onTransitionFrame?.();
95 |     expect(next).toHaveBeenCalledTimes(2);
   |                  ^
96 |     expect(next).toHaveBeenLastCalledWith('transition');
97 |     expect(warn).toHaveBeenCalledTimes(1);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.transitions.test.ts

FACT: Corrected RED command exit code: 1
FACT: Corrected RED: all 3 tests failed on missing behavior (no config wiring; no transition subscriber delivery).
FACT: Implemented create-time resolution, renderer callback forwarding, getTransitionFrame, and once-per-listener warning isolation for transition signals only.
NEXT: Run first GREEN slice.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:39:24.691Z"
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
    "tests": 3,
    "failedTests": 0,
    "passedTests": 3,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 628,
    "build": 105,
    "tests": 523
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

- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: resolves opt-in physics once at creation
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > failure: reduced motion disables an opted-in transition
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > failure: one throwing transition subscriber cannot block the next subscriber or frame

### Skipped

None.

## Failures

No test failures reported.

FACT: First GREEN command exit code: 0
FACT: First GREEN passed: 3/3. Full output above.
FACT: Added lifecycle success/failure tests for reason mapping, refused frame rollback/abort, opt-out inactivity, export ordering, destroy cancellation, T131 refit, and backdrop teardown.
DECISION: T131 uses the existing immediate fitStaffChrome target under animate; avoids competing camera tween and prepare-camera while node transitions run.
NEXT: Run lifecycle RED before implementing.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:40:02.300Z"
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
    "tests": 10,
    "failedTests": 6,
    "passedTests": 4,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 727,
    "build": 178,
    "tests": 549
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

### [F01] src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: structural operations animate, theme and style passes snap

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.test.ts' --testNamePattern 'facade transitions > success: structural operations animate, theme and style passes snap'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.test.ts",
  "project": "rstest",
  "fullName": "facade transitions > success: structural operations animate, theme and style passes snap",
  "status": "fail",
  "duration": 59,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected { lod: 'mid', orgLayout: {}, …(17) } to match object { transition: 'animate' }\n(22 matching properties omitted from actual)",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.test.ts",
        "line": 82,
        "column": 45,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.test.ts",
      "line": 82
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

  {
-   "transition": "animate",
+   "loadTexture": [Function loadTexture],
+   "lod": "mid",
+   "onCanvasClick": [Function onCanvasClick],
+   "onOrgClick": [Function onOrgClick],
+   "onOrgCollapse": [Function anonymous],
+   "onOrgContextMenu": [Function onOrgContextMenu],
+   "onOrgDoubleClick": [Function onOrgDoubleClick],
+   "onOrgExpand": [Function anonymous],
+   "onPersonClick": [Function onPersonClick],
+   "onPersonContextMenu": [Function onPersonContextMenu],
+   "onPersonDoubleClick": [Function onPersonDoubleClick],
+   "onPersonDragEnd": [Function onPersonDragEnd],
+   "onPersonReparent": [Function onPersonReparent],
+   "onPositionExpandToggle": [Function onPositionExpandToggle],
+   "onStaffOrgDrill": [Function onStaffOrgDrill],
+   "onStaffOrgExpandToggle": [Function onStaffOrgExpandToggle],
+   "orgLayout": {},
+   "selected": [],
+   "staff": {
+     "currentOrgId": "org",
+     "expandedOrgIds": [],
+     "layout": {
+       "expandedPositionIds": [
+         "head",
+       ],
+     },
+   },
  }
```

codeFrame (error 1):

```text
80 |       seam.startTransition.mockClear();
81 |       await operation();
82 |       expect(render.mock.calls.at(-1)?.[4]).toMatchObject({ transition: 'animate' });
   |                                             ^
83 |       expect(seam.startTransition).toHaveBeenCalledTimes(1);
84 |     }
```

### [F02] src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > failure: a refused pass aborts and does not start the transition

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.test.ts' --testNamePattern 'facade transitions > failure: a refused pass aborts and does not start the transition'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.test.ts",
  "project": "rstest",
  "fullName": "facade transitions > failure: a refused pass aborts and does not start the transition",
  "status": "fail",
  "duration": 4,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to be called 1 times, but got 0 times",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.test.ts",
        "line": 97,
        "column": 34,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.test.ts",
      "line": 97
    }
  ]
}
```

codeFrame (error 1):

```text
95 |     rstest.spyOn(host.renderer, 'render').mockRejectedValueOnce(new Error('refused frame'));
96 |     await expect(diagram.togglePositionExpand('head')).rejects.toThrow('refused frame');
97 |     expect(seam.abortTransition).toHaveBeenCalledTimes(1);
   |                                  ^
98 |     expect(seam.startTransition).not.toHaveBeenCalled();
99 |     expect(diagram.getStaffExpandedPositionIds()).not.toContain('head');
```

### [F03] src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: export settles before accessing the raster scene

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.test.ts' --testNamePattern 'facade transitions > success: export settles before accessing the raster scene'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.test.ts",
  "project": "rstest",
  "fullName": "facade transitions > success: export settles before accessing the raster scene",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [ 'raster' ] to deeply equal [ 'settle', 'raster' ]",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.test.ts",
        "line": 119,
        "column": 19,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.test.ts",
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
-   "settle",
    "raster",
  ]
```

codeFrame (error 1):

```text
117 |     rstest.spyOn(host, 'getApplication').mockImplementation(() => { order.push('raster'); throw new Error('raster refused'); });
118 |     await expect(diagram.export({ format: 'png' })).rejects.toThrow('raster refused');
119 |     expect(order).toEqual(['settle', 'raster']);
    |                   ^
120 |   });
121 | 
```

### [F04] src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: destroy disables the controller before destroying the host

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.test.ts' --testNamePattern 'facade transitions > success: destroy disables the controller before destroying the host'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.test.ts",
  "project": "rstest",
  "fullName": "facade transitions > success: destroy disables the controller before destroying the host",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to be called with arguments: [ null ]\n\nNumber of calls: 0\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.test.ts",
        "line": 128,
        "column": 38,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.test.ts",
      "line": 128
    }
  ]
}
```

codeFrame (error 1):

```text
126 |     const destroy = rstest.spyOn(host, 'destroy');
127 |     diagram.destroy();
128 |     expect(seam.configureTransition).toHaveBeenCalledWith(null);
    |                                      ^
129 |     expect(destroy).toHaveBeenCalledTimes(1);
130 |     expect(diagram.getTransitionFrame()).toBeNull();
```

### [F05] src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: refit with animation never prepares target-frame overlay cards

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.test.ts' --testNamePattern 'facade transitions > success: refit with animation never prepares target-frame overlay cards'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.test.ts",
  "project": "rstest",
  "fullName": "facade transitions > success: refit with animation never prepares target-frame overlay cards",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [ 'structural', 'camera', …(2) ] to not include 'prepare-camera'",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.test.ts",
        "line": 142,
        "column": 25,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.test.ts",
      "line": 142
    }
  ]
}
```

codeFrame (error 1):

```text
140 |     diagram.subscribePromoteSync((reason) => { reasons.push(reason); });
141 |     await diagram.togglePositionExpand('head');
142 |     expect(reasons).not.toContain('prepare-camera');
    |                         ^
143 |     expect(camera).not.toHaveBeenCalled();
144 |     expect(diagram.getViewport()).toEqual(target);
```

### [F06] src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: backdrop teardown settles and redraws Pixi chrome

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.test.ts' --testNamePattern 'facade transitions > success: backdrop teardown settles and redraws Pixi chrome'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.test.ts",
  "project": "rstest",
  "fullName": "facade transitions > success: backdrop teardown settles and redraws Pixi chrome",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "diagram.setStaffReactChromeMounted is not a function",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.test.ts",
        "line": 151,
        "column": 19,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.test.ts",
      "line": 151
    }
  ]
}
```

codeFrame (error 1):

```text
149 |     const { diagram, host } = await mount({ animate: true, render: { staffReactChrome: true } });
150 |     const render = rstest.spyOn(host.renderer, 'render');
151 |     await diagram.setStaffReactChromeMounted(false);
    |                   ^
152 |     expect(seam.settleNow).toHaveBeenCalledTimes(1);
153 |     expect(render.mock.calls.at(-1)?.[3]).toMatchObject({ staffReactChrome: false });
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.transitions.test.ts

FACT: Lifecycle RED command exit code: 1
FACT: Lifecycle RED completed with 6 behavioral failures and 4 passing cases. Added reason OR accumulator/reset, confirmation-gated start, exception abort, export settle, controller disable at destroy, immediate T131 refit without prepare-camera, explicit backdrop lifecycle, and resize settle.
NEXT: Run lifecycle GREEN and inspect any failing assertions.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:40:46.810Z"
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
    "tests": 10,
    "failedTests": 0,
    "passedTests": 10,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 668,
    "build": 157,
    "tests": 511
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

### Skipped

None.

## Failures

No test failures reported.

FACT: Lifecycle GREEN command exit code: 0
FACT: Lifecycle GREEN passed 10/10 with transition seam fakes. No full integration claim: T-C methods remain unavailable at this checkpoint.
NEXT: Add coalescing and edit reason coverage, inspect docs insertion points, then run SDK noEmit typecheck and lint.
FACT: T-C working file now ends BLOCKED: real animator/controller unchanged-target behavior violates #11. Renderer integration cannot be tested until coordinator resolves that dependency; do not edit their files.
FACT: Source review found fitStaffChrome reads interpolated chrome during motion, so immediate refit is insufficient. Strengthened T131 test: defer refit until the frame becomes null (settle), then use final chrome. Added edit reason and queued animate+snap accumulator coverage.
NEXT: Run focused RED for the strengthened final-camera contract.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:42:09.621Z"
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
    "tests": 11,
    "failedTests": 1,
    "passedTests": 10,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 740,
    "build": 181,
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

### [F01] src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: refit with animation never prepares target-frame overlay cards

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.test.ts' --testNamePattern 'facade transitions > success: refit with animation never prepares target-frame overlay cards'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.test.ts",
  "project": "rstest",
  "fullName": "facade transitions > success: refit with animation never prepares target-frame overlay cards",
  "status": "fail",
  "duration": 38,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"fitStaffChrome\" to not be called at all, but actually been called 1 times\n\nReceived:\n\n  1st fitStaffChrome call:\n\n    Array [\n      Object {\n        \"animate\": false,\n      },\n    ]\n\n\nNumber of calls: 1\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.test.ts",
        "line": 166,
        "column": 21,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.test.ts",
      "line": 166
    }
  ]
}
```

codeFrame (error 1):

```text
164 |     diagram.subscribePromoteSync((reason) => { reasons.push(reason); });
165 |     await diagram.togglePositionExpand('head');
166 |     expect(fit).not.toHaveBeenCalled();
    |                     ^
167 |     seam.finish();
168 |     const renderer = host.renderer as DiagramRenderer & { onTransitionFrame?: () => void };
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.transitions.test.ts

FACT: Camera/coalescing RED command exit code: 1
FACT: Strengthened camera test failed as intended; queued reason and edit reason tests passed. Refit now waits for settle and clears pending intent on abort/destroy. Corrected comment attachment and indentation.
NEXT: Run camera/coalescing GREEN, then document public semantics and run allowed checks.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:42:31.316Z"
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
    "tests": 11,
    "failedTests": 0,
    "passedTests": 11,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 618,
    "build": 100,
    "tests": 518
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

### Skipped

None.

## Failures

No test failures reported.

FACT: Camera/coalescing GREEN command exit code: 0
FACT: Camera/coalescing GREEN passed 11/11. Documented animate/AnimateOption, creation-only reduced motion, transition subscriber warning, getTransitionFrame, target anchors/export/destroy, animated T131 policy, moving chrome lines/linesOpacity, and explicit mounted-backdrop contract in USAGE.
NEXT: Run SDK noEmit typecheck and repository lint, appending their complete outputs with no pipes. Full check:docs remains prohibited by the brief.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/OrgHierarchyDiagram.transitions.test.ts(30,44): error TS2550: Property 'toReversed' does not exist on type '(() => void)[]'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2023' or later.
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

FACT: SDK noEmit typecheck exit code: 1

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: Repository lint exit code: 0
FACT: Repository lint passed. SDK noEmit found the expected missing T-C renderer signatures plus one owned test compatibility issue (toReversed requires ES2023). Replaced test cleanup with a pop loop; no compiler target change or suppression.
FACT: Read and reviewed owned facade diff. Added boundary assertions for initial/LOD snap and transition-to-structural delivery. These extend already-RED-tested seams; no new production behavior introduced.
QUESTION: Coordinator integration must have T-C invoke onTransitionFrame after settle with getTransitionFrame() === null (the fixed callback is the only specified settle notification), and have T-D invoke setStaffReactChromeMounted on backdrop mount/dispose. T-E does not own either file.
NEXT: Final owned tests and allowed static checks; preserve complete outputs.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:44:14.014Z"
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
    "tests": 13,
    "failedTests": 0,
    "passedTests": 13,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 735,
    "build": 182,
    "tests": 553
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

### Skipped

None.

## Failures

No test failures reported.

FACT: Final owned test exit code: 0

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

FACT: Final SDK noEmit typecheck exit code: 1

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: Final repository lint exit code: 0
FACT: Final output inspection confirmed 13/13 owned tests pass, lint exit 0, and SDK noEmit has exactly 10 unresolved references to the pending T-C seam (configureTransition, onTransitionFrame, settleNow, startTransition, RenderOptions.transition, abortTransition, getTransitionFrame). No remaining independent owned-file type errors. Full outputs are preserved above.
FACT: Verified USAGE contains every added public member and required contract term; updated the original prepare-camera paragraph itself to exclude active animate, avoiding contradictory prose. No new Markdown links were introduced. Owned git diff --check passed. Full check:docs was not run, as prohibited.
FACT: Done — authored only packages/sdk/src/OrgHierarchyDiagram.ts, packages/sdk/src/OrgHierarchyDiagram.transitions.test.ts, docs/USAGE.md, and this append-only working file. Concurrent T-D and pre-existing report edits were observed but never changed by this task.
FACT: Tested scenarios — create-time physical config/reduced motion, transition subscriber isolation, initial/LOD snap reasons, coalesced animate intent and reset, all six structural operation routes (including reparent through commitDataChange), failed toggle rollback/abort, omitted-animate lifecycle inactivity, raster access ordering on export failure, destroy disabling the controller, final-camera refit, backdrop lifecycle redraw, and transition-to-structural signaling.
FACT: Non-obvious findings — backdrop teardown needs an explicit lifecycle notification; empty promoted IDs are not sufficient evidence. T131 refit must read settled chrome, not interpolated geometry. T-C is blocked by the unchanged-target controller/animator issue recorded in _impl-T-C.md.
FACT: Screenshots — none; no browser/build/deploy was performed. These are facade boundary tests, not rendered-image proof.
FACT: User-flow walkthrough — create with animate; structural edit carries animate into its coalesced render; confirmed frame starts the renderer; per-frame callback sends transition; null frame signals settle, applies any deferred toggle refit, and sends structural. A render exception aborts; export settles first; destroy disables the controller. Explicit backdrop unmount settles and requests a Pixi-chrome redraw.
FACT: Limitations and deferrals — real renderer geometry, PNG/PDF image equality, no-extra-rAF/idle/destroy frame counts, LOD's stronger override, anchors/drag, and integrated overlay teardown remain coordinator integration checks because T-C did not land. Boundary fakes prove calls and ordering, not renderer execution. The tests intentionally fake only the unavailable transition seam over a real facade/host/renderer.
NEXT: Coordinator must resolve T-C's controller dependency and land renderer methods; ensure onTransitionFrame also fires after settle with getTransitionFrame() === null; wire T-D backdrop lifecycle to setStaffReactChromeMounted(true/false); ensure planned public type barrel exports (outside T-E ownership); then run full integration and permitted release gates.
FACT: Post-deploy — not performed; no build, emitting tsc, root typecheck, commit, push, branch/worktree change, full docs gate, or external checkpoint/state store was used. All checkpoint evidence remains in this repository working file. The initial pre-first-tool append ordering deviation is disclosed in the first entry; no history was rewritten to conceal it.
STATUS: DONE_WITH_CONCERNS — T-E facade/docs and 13 boundary tests complete; lint passes, SDK typecheck awaits T-C signatures, and renderer/overlay integration remains explicitly deferred to the coordinator.
