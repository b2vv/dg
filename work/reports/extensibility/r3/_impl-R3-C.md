NEXT: Read facade/test conventions, then write failing R3-C tests.

STEP 1 — Brief and seam inspection
- Read R3-C brief in full. Branch is feat/extensibility; existing unrelated changes are preserved.
- Read nodeViewFactory.ts and public barrel. Actual renderer seam is setNodeViewFactory(factory: NodeView | null); use it directly, as the brief requires (plan §4.1 has an older normalized signature).
- Scope: four assigned files plus this append-only log. No builds, emitting tsc, branch changes, commits, pushes, or external store.

STEP 2 — Tests written before implementation
- Followed existing R2 mount/cleanup conventions; spies use the explicitly requested renderer seam.
- Added simple, retained, omitted-config cases and compiler-resolved barrel/config surface checks (SDK typecheck excludes test files).
- Pre-code scope: additive config field, one mount call, type-only exports, English config documentation. Existing default renderer implementation remains untouched.
NEXT: Run the authorized focused test and record RED in full.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.nodeview

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
npm error command sh -c rstest run OrgHierarchyDiagram.nodeview

RED command exit: 1

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.nodeview

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T05:00:48.893Z"
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
    "tests": 4,
    "failedTests": 4,
    "passedTests": 0,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 847,
    "build": 185,
    "tests": 662
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

### [F01] src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > passes a simple factory unchanged to the renderer

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.nodeview.test.ts' --testNamePattern 'nodeView facade configuration > passes a simple factory unchanged to the renderer'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.nodeview.test.ts",
  "project": "rstest",
  "fullName": "nodeView facade configuration > passes a simple factory unchanged to the renderer",
  "status": "fail",
  "duration": 125,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"setNodeViewFactory\" to be called once with arguments: [ [Function factory] ]\n\nNumber of calls: 0\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.nodeview.test.ts",
        "line": 34,
        "column": 24,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.nodeview.test.ts",
      "line": 34
    }
  ]
}
```

codeFrame (error 1):

```text
32 |     const setFactory = rstest.spyOn(DiagramRenderer.prototype, 'setNodeViewFactory');
33 |     await mount({ nodeView: factory });
34 |     expect(setFactory).toHaveBeenCalledExactlyOnceWith(factory);
   |                        ^
35 |   });
36 | 
```

### [F02] src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > passes a retained factory unchanged to the renderer

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.nodeview.test.ts' --testNamePattern 'nodeView facade configuration > passes a retained factory unchanged to the renderer'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.nodeview.test.ts",
  "project": "rstest",
  "fullName": "nodeView facade configuration > passes a retained factory unchanged to the renderer",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"setNodeViewFactory\" to be called once with arguments: [ { create: [Function create] } ]\n\nNumber of calls: 0\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.nodeview.test.ts",
        "line": 43,
        "column": 24,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.nodeview.test.ts",
      "line": 43
    }
  ]
}
```

codeFrame (error 1):

```text
41 |     const setFactory = rstest.spyOn(DiagramRenderer.prototype, 'setNodeViewFactory');
42 |     await mount({ nodeView: factory });
43 |     expect(setFactory).toHaveBeenCalledExactlyOnceWith(factory);
   |                        ^
44 |   });
45 | 
```

### [F03] src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > explicitly selects the unchanged built-in path when nodeView is omitted

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.nodeview.test.ts' --testNamePattern 'nodeView facade configuration > explicitly selects the unchanged built-in path when nodeView is omitted'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.nodeview.test.ts",
  "project": "rstest",
  "fullName": "nodeView facade configuration > explicitly selects the unchanged built-in path when nodeView is omitted",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"setNodeViewFactory\" to be called once with arguments: [ null ]\n\nNumber of calls: 0\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.nodeview.test.ts",
        "line": 49,
        "column": 24,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.nodeview.test.ts",
      "line": 49
    }
  ]
}
```

codeFrame (error 1):

```text
47 |     const setFactory = rstest.spyOn(DiagramRenderer.prototype, 'setNodeViewFactory');
48 |     await mount();
49 |     expect(setFactory).toHaveBeenCalledExactlyOnceWith(null);
   |                        ^
50 |   });
51 | 
```

### [F04] src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > exports all five node-view types from the public barrel

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.nodeview.test.ts' --testNamePattern 'nodeView facade configuration > exports all five node-view types from the public barrel'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.nodeview.test.ts",
  "project": "rstest",
  "fullName": "nodeView facade configuration > exports all five node-view types from the public barrel",
  "status": "fail",
  "duration": 0,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "Cannot read properties of undefined (reading 'ES2022')",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.nodeview.test.ts",
        "line": 56,
        "column": 29,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.nodeview.test.ts",
      "line": 56
    }
  ]
}
```

codeFrame (error 1):

```text
54 |     const entry = resolve('src/index.ts');
55 |     const program = ts.createProgram([entry], {
56 |       noEmit: true, target: ts.ScriptTarget.ES2022,
   |                             ^
57 |       module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
58 |     });
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.nodeview

STEP 3 — RED retry exit: 1

STEP 4 — RED inspection and test harness correction
- Initial run hit listen EPERM; retried with local-port permission as instructed.
- Three mount tests failed because setNodeViewFactory had zero calls.
- Barrel test exposed bundler interop for TypeScript, not missing exports yet. Load the compiler through Node createRequire, then rerun before implementing.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.nodeview

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T05:02:27.328Z"
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
    "tests": 4,
    "failedTests": 4,
    "passedTests": 0,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 11331,
    "build": 473,
    "tests": 10858
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

### [F01] src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > passes a simple factory unchanged to the renderer

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.nodeview.test.ts' --testNamePattern 'nodeView facade configuration > passes a simple factory unchanged to the renderer'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.nodeview.test.ts",
  "project": "rstest",
  "fullName": "nodeView facade configuration > passes a simple factory unchanged to the renderer",
  "status": "fail",
  "duration": 93,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"setNodeViewFactory\" to be called once with arguments: [ [Function factory] ]\n\nNumber of calls: 0\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.nodeview.test.ts",
        "line": 37,
        "column": 24,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.nodeview.test.ts",
      "line": 37
    }
  ]
}
```

codeFrame (error 1):

```text
35 |     const setFactory = rstest.spyOn(DiagramRenderer.prototype, 'setNodeViewFactory');
36 |     await mount({ nodeView: factory });
37 |     expect(setFactory).toHaveBeenCalledExactlyOnceWith(factory);
   |                        ^
38 |   });
39 | 
```

### [F02] src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > passes a retained factory unchanged to the renderer

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.nodeview.test.ts' --testNamePattern 'nodeView facade configuration > passes a retained factory unchanged to the renderer'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.nodeview.test.ts",
  "project": "rstest",
  "fullName": "nodeView facade configuration > passes a retained factory unchanged to the renderer",
  "status": "fail",
  "duration": 9813,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"setNodeViewFactory\" to be called once with arguments: [ { create: [Function create] } ]\n\nNumber of calls: 0\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.nodeview.test.ts",
        "line": 46,
        "column": 24,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.nodeview.test.ts",
      "line": 46
    }
  ]
}
```

codeFrame (error 1):

```text
44 |     const setFactory = rstest.spyOn(DiagramRenderer.prototype, 'setNodeViewFactory');
45 |     await mount({ nodeView: factory });
46 |     expect(setFactory).toHaveBeenCalledExactlyOnceWith(factory);
   |                        ^
47 |   });
48 | 
```

### [F03] src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > explicitly selects the unchanged built-in path when nodeView is omitted

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.nodeview.test.ts' --testNamePattern 'nodeView facade configuration > explicitly selects the unchanged built-in path when nodeView is omitted'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.nodeview.test.ts",
  "project": "rstest",
  "fullName": "nodeView facade configuration > explicitly selects the unchanged built-in path when nodeView is omitted",
  "status": "fail",
  "duration": 4,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"setNodeViewFactory\" to be called once with arguments: [ null ]\n\nNumber of calls: 0\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.nodeview.test.ts",
        "line": 52,
        "column": 24,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.nodeview.test.ts",
      "line": 52
    }
  ]
}
```

codeFrame (error 1):

```text
50 |     const setFactory = rstest.spyOn(DiagramRenderer.prototype, 'setNodeViewFactory');
51 |     await mount();
52 |     expect(setFactory).toHaveBeenCalledExactlyOnceWith(null);
   |                        ^
53 |   });
54 | 
```

### [F04] src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > exports all five node-view types from the public barrel

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.nodeview.test.ts' --testNamePattern 'nodeView facade configuration > exports all five node-view types from the public barrel'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.nodeview.test.ts",
  "project": "rstest",
  "fullName": "nodeView facade configuration > exports all five node-view types from the public barrel",
  "status": "fail",
  "duration": 13,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "Cannot read properties of undefined (reading 'ES2022')",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.nodeview.test.ts",
        "line": 59,
        "column": 45,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.nodeview.test.ts",
      "line": 59
    }
  ]
}
```

codeFrame (error 1):

```text
57 |     const entry = resolve('src/index.ts');
58 |     const program = ts.createProgram([entry], {
59 |       noEmit: true, target: ts.ScriptTarget.ES2022,
   |                                             ^
60 |       module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
61 |     });
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.nodeview

STEP 5 — Corrected RED exit: 1

STEP 6 — Type-only surface test correction
- Compiler loading remains incompatible with this runner. Use a direct type-export declaration check, following the repository's text-based barrel gate approach. No compiler subprocess or emit is needed.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.nodeview

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T05:03:09.928Z"
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
    "tests": 4,
    "failedTests": 4,
    "passedTests": 0,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 6640,
    "build": 2214,
    "tests": 4426
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

### [F01] src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > passes a simple factory unchanged to the renderer

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.nodeview.test.ts' --testNamePattern 'nodeView facade configuration > passes a simple factory unchanged to the renderer'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.nodeview.test.ts",
  "project": "rstest",
  "fullName": "nodeView facade configuration > passes a simple factory unchanged to the renderer",
  "status": "fail",
  "duration": 390,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"setNodeViewFactory\" to be called once with arguments: [ [Function factory] ]\n\nNumber of calls: 0\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.nodeview.test.ts",
        "line": 34,
        "column": 24,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.nodeview.test.ts",
      "line": 34
    }
  ]
}
```

codeFrame (error 1):

```text
32 |     const setFactory = rstest.spyOn(DiagramRenderer.prototype, 'setNodeViewFactory');
33 |     await mount({ nodeView: factory });
34 |     expect(setFactory).toHaveBeenCalledExactlyOnceWith(factory);
   |                        ^
35 |   });
36 | 
```

### [F02] src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > passes a retained factory unchanged to the renderer

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.nodeview.test.ts' --testNamePattern 'nodeView facade configuration > passes a retained factory unchanged to the renderer'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.nodeview.test.ts",
  "project": "rstest",
  "fullName": "nodeView facade configuration > passes a retained factory unchanged to the renderer",
  "status": "fail",
  "duration": 8,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"setNodeViewFactory\" to be called once with arguments: [ { create: [Function create] } ]\n\nNumber of calls: 0\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.nodeview.test.ts",
        "line": 43,
        "column": 24,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.nodeview.test.ts",
      "line": 43
    }
  ]
}
```

codeFrame (error 1):

```text
41 |     const setFactory = rstest.spyOn(DiagramRenderer.prototype, 'setNodeViewFactory');
42 |     await mount({ nodeView: factory });
43 |     expect(setFactory).toHaveBeenCalledExactlyOnceWith(factory);
   |                        ^
44 |   });
45 | 
```

### [F03] src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > explicitly selects the unchanged built-in path when nodeView is omitted

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.nodeview.test.ts' --testNamePattern 'nodeView facade configuration > explicitly selects the unchanged built-in path when nodeView is omitted'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.nodeview.test.ts",
  "project": "rstest",
  "fullName": "nodeView facade configuration > explicitly selects the unchanged built-in path when nodeView is omitted",
  "status": "fail",
  "duration": 6,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"setNodeViewFactory\" to be called once with arguments: [ null ]\n\nNumber of calls: 0\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.nodeview.test.ts",
        "line": 49,
        "column": 24,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.nodeview.test.ts",
      "line": 49
    }
  ]
}
```

codeFrame (error 1):

```text
47 |     const setFactory = rstest.spyOn(DiagramRenderer.prototype, 'setNodeViewFactory');
48 |     await mount();
49 |     expect(setFactory).toHaveBeenCalledExactlyOnceWith(null);
   |                        ^
50 |   });
51 | 
```

### [F04] src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > exports all five node-view types from the public barrel

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.nodeview.test.ts' --testNamePattern 'nodeView facade configuration > exports all five node-view types from the public barrel'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.nodeview.test.ts",
  "project": "rstest",
  "fullName": "nodeView facade configuration > exports all five node-view types from the public barrel",
  "status": "fail",
  "duration": 6,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected undefined to deeply equal ArrayContaining{…}",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.nodeview.test.ts",
        "line": 57,
        "column": 19,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.nodeview.test.ts",
      "line": 57
    }
  ]
}
```

diff:

```diff
- Expected:
ArrayContaining [
  "NodeView",
  "NodeViewInput",
  "NodeViewContext",
  "SimpleNodeView",
  "RetainedNodeView",
]

+ Received:
undefined
```

codeFrame (error 1):

```text
55 |     const declaration = barrel.match(/export type\s*\{([^}]+)\}\s*from ['"]\.\/render\/nodeViewFactory\.js['"]/);
56 |     const names = declaration?.[1].split(',').map((name) => name.trim()).filter(Boolean);
57 |     expect(names).toEqual(expect.arrayContaining([
   |                   ^
58 |       'NodeView', 'NodeViewInput', 'NodeViewContext', 'SimpleNodeView', 'RetainedNodeView',
59 |     ]));
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.nodeview

STEP 7 — RED surface check exit: 1

STEP 8 — Minimal implementation
- Confirmed all four tests RED for missing wiring/public exports before implementation.
- Combined edit/test escalation timed out in automatic approval review without execution. Applied repository edits separately; retry only the focused test.
- Added NodeView config type and setNodeViewFactory(config.nodeView ?? null) after successful mount, before first rendering.
- Exported all five public types; documented simple/retained forms, local coordinates, SDK placement, id-based retained updates and default card in USAGE config section.
- Default PersonNodeView and renderer code untouched.
NEXT: Focused GREEN, SDK noEmit typecheck, lint.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.nodeview

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T05:11:34.134Z"
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
    "tests": 4,
    "failedTests": 0,
    "passedTests": 4,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 635,
    "build": 126,
    "tests": 509
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

- src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > passes a simple factory unchanged to the renderer
- src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > passes a retained factory unchanged to the renderer
- src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > explicitly selects the unchanged built-in path when nodeView is omitted
- src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > exports all five node-view types from the public barrel

### Skipped

None.

## Failures

No test failures reported.

STEP 9 — GREEN command exit: 0

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


STEP 10 — SDK noEmit typecheck exit: 0

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


STEP 11 — Lint exit: 0

STEP 12 — Final scope and contract review
- Reviewed localized R3-C hunks; preserved existing R2 facade methods and USAGE additions. Renderer and all unrelated files remain untouched by this task.
- Confirmed renderer null setter leaves nodeViewPool null and uses the existing built-in path. The facade test verifies explicit null forwarding; it does not claim a new visual golden test.
- Correction to STEP 2: tsconfig.check.json (used by the allowed SDK typecheck) DOES include tests, unlike tsconfig.json. It passed with noEmit=true. The final barrel test checks erased type-only declarations directly.
- Full focused-test, typecheck and lint output was appended directly without pipes. Four focused tests pass, SDK noEmit typecheck passes, lint passes, and scoped diff whitespace check passes.
- No build, root typecheck, build:types, emitting tsc, branch/worktree change, commit, push, or external store was used.
NEXT: Close the task with the final status.

STEP 13 — Session guard and closeout
- Higher-priority session instructions required a checkpoint attempt through the registered native runtime using the current host/root/session. It failed before writing: mktemp could not create manual-selection under the registered receipt parent (Operation not permitted), exit 1. No checkpoint success or external-store write is claimed; no escalation attempted.
- Product implementation and all three required verification commands are complete and passing.
STATUS: DONE — R3-C implemented; 4 tests GREEN; SDK noEmit typecheck PASS; lint PASS.
