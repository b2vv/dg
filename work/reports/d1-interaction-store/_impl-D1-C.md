NEXT: Read required sources and constraints before writing failing tests.
FACT: Read D1-C brief in full; scope is renderer, two node classes, staffRelated, and their tests only.
DECISION: No builds, root typechecks, branch changes, commits, or demo edits.
FACT: Read plan sections 1, 4/4.1, acceptance rows 7/7f/12/14/15, node implementations, store contract, selector original, and standards. Branch is feat/d1-interaction-store; unrelated working changes exist and remain untouched.
DECISION: Use the brief-authorized seams: node pointer events and paint flag, renderer source/paint, pure selectors. TDD proceeds one seam at a time. Existing PixiHost paint calls cullToViewport before rendering, enabling hover refresh without editing the host or facade.
NEXT: Add node success/failure tests, run RED with complete output appended, then implement node routing.

> @org-hierarchy/sdk@1.1.1 test
> rstest run PersonNode.interaction.test.ts OrganizationNode.interaction.test.ts

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
npm error command sh -c rstest run PersonNode.interaction.test.ts OrganizationNode.interaction.test.ts

FACT: Node RED exit 1.
NEXT: Inspect failures before implementation.

> @org-hierarchy/sdk@1.1.1 test
> rstest run PersonNode.interaction.test.ts OrganizationNode.interaction.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:28:38.004Z"
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
    "tests": 12,
    "failedTests": 6,
    "passedTests": 6,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 616,
    "build": 88,
    "tests": 528
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

### [F01] src/render/OrganizationNode.interaction.test.ts :: Organization hover at near > success: routes pointer events without locally painting controlled hover

repro:

```bash
npx rstest 'src/render/OrganizationNode.interaction.test.ts' --testNamePattern 'Organization hover at near > success: routes pointer events without locally painting controlled hover'
```

details:

```json
{
  "testPath": "src/render/OrganizationNode.interaction.test.ts",
  "project": "rstest",
  "fullName": "Organization hover at near > success: routes pointer events without locally painting controlled hover",
  "status": "fail",
  "duration": 11,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected last \"rstest.fn()\" call to have been called with [ { kind: 'organization', id: 'a' } ]",
      "topFrame": {
        "file": "src/render/OrganizationNode.interaction.test.ts",
        "line": 20,
        "column": 23,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/OrganizationNode.interaction.test.ts",
      "line": 20
    }
  ]
}
```

diff:

```diff
- Expected:
[
  {
    "id": "a",
    "kind": "organization",
  },
]

+ Received:
undefined
```

codeFrame (error 1):

```text
18 |       const event = new FederatedPointerEvent(new EventBoundary(view));
19 |       view.emit('pointerover', event);
20 |       expect(onHover).toHaveBeenLastCalledWith({ kind: 'organization', id: 'a' });
   |                       ^
21 |       expect(view['hoverRing'].visible).toBe(false);
22 |       view.setHovered(true);
```

### [F02] src/render/OrganizationNode.interaction.test.ts :: Organization hover at mid > success: routes pointer events without locally painting controlled hover

repro:

```bash
npx rstest 'src/render/OrganizationNode.interaction.test.ts' --testNamePattern 'Organization hover at mid > success: routes pointer events without locally painting controlled hover'
```

details:

```json
{
  "testPath": "src/render/OrganizationNode.interaction.test.ts",
  "project": "rstest",
  "fullName": "Organization hover at mid > success: routes pointer events without locally painting controlled hover",
  "status": "fail",
  "duration": 1,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected last \"rstest.fn()\" call to have been called with [ { kind: 'organization', id: 'a' } ]",
      "topFrame": {
        "file": "src/render/OrganizationNode.interaction.test.ts",
        "line": 20,
        "column": 23,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/OrganizationNode.interaction.test.ts",
      "line": 20
    }
  ]
}
```

diff:

```diff
- Expected:
[
  {
    "id": "a",
    "kind": "organization",
  },
]

+ Received:
undefined
```

codeFrame (error 1):

```text
18 |       const event = new FederatedPointerEvent(new EventBoundary(view));
19 |       view.emit('pointerover', event);
20 |       expect(onHover).toHaveBeenLastCalledWith({ kind: 'organization', id: 'a' });
   |                       ^
21 |       expect(view['hoverRing'].visible).toBe(false);
22 |       view.setHovered(true);
```

### [F03] src/render/OrganizationNode.interaction.test.ts :: Organization hover at far > success: routes pointer events without locally painting controlled hover

repro:

```bash
npx rstest 'src/render/OrganizationNode.interaction.test.ts' --testNamePattern 'Organization hover at far > success: routes pointer events without locally painting controlled hover'
```

details:

```json
{
  "testPath": "src/render/OrganizationNode.interaction.test.ts",
  "project": "rstest",
  "fullName": "Organization hover at far > success: routes pointer events without locally painting controlled hover",
  "status": "fail",
  "duration": 1,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected last \"rstest.fn()\" call to have been called with [ { kind: 'organization', id: 'a' } ]",
      "topFrame": {
        "file": "src/render/OrganizationNode.interaction.test.ts",
        "line": 20,
        "column": 23,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/OrganizationNode.interaction.test.ts",
      "line": 20
    }
  ]
}
```

diff:

```diff
- Expected:
[
  {
    "id": "a",
    "kind": "organization",
  },
]

+ Received:
undefined
```

codeFrame (error 1):

```text
18 |       const event = new FederatedPointerEvent(new EventBoundary(view));
19 |       view.emit('pointerover', event);
20 |       expect(onHover).toHaveBeenLastCalledWith({ kind: 'organization', id: 'a' });
   |                       ^
21 |       expect(view['hoverRing'].visible).toBe(false);
22 |       view.setHovered(true);
```

### [F04] src/render/PersonNode.interaction.test.ts :: Person hover at near > success: routes pointer events without locally painting controlled hover

repro:

```bash
npx rstest 'src/render/PersonNode.interaction.test.ts' --testNamePattern 'Person hover at near > success: routes pointer events without locally painting controlled hover'
```

details:

```json
{
  "testPath": "src/render/PersonNode.interaction.test.ts",
  "project": "rstest",
  "fullName": "Person hover at near > success: routes pointer events without locally painting controlled hover",
  "status": "fail",
  "duration": 13,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected last \"rstest.fn()\" call to have been called with [ { kind: 'position', id: 'a' } ]",
      "topFrame": {
        "file": "src/render/PersonNode.interaction.test.ts",
        "line": 20,
        "column": 23,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/PersonNode.interaction.test.ts",
      "line": 20
    }
  ]
}
```

diff:

```diff
- Expected:
[
  {
    "id": "a",
    "kind": "position",
  },
]

+ Received:
undefined
```

codeFrame (error 1):

```text
18 |       const event = new FederatedPointerEvent(new EventBoundary(view));
19 |       view.emit('pointerover', event);
20 |       expect(onHover).toHaveBeenLastCalledWith({ kind: 'position', id: 'a' });
   |                       ^
21 |       expect(view['hoverRing'].visible).toBe(false);
22 |       view.setHovered(true);
```

### [F05] src/render/PersonNode.interaction.test.ts :: Person hover at mid > success: routes pointer events without locally painting controlled hover

repro:

```bash
npx rstest 'src/render/PersonNode.interaction.test.ts' --testNamePattern 'Person hover at mid > success: routes pointer events without locally painting controlled hover'
```

details:

```json
{
  "testPath": "src/render/PersonNode.interaction.test.ts",
  "project": "rstest",
  "fullName": "Person hover at mid > success: routes pointer events without locally painting controlled hover",
  "status": "fail",
  "duration": 1,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected last \"rstest.fn()\" call to have been called with [ { kind: 'position', id: 'a' } ]",
      "topFrame": {
        "file": "src/render/PersonNode.interaction.test.ts",
        "line": 20,
        "column": 23,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/PersonNode.interaction.test.ts",
      "line": 20
    }
  ]
}
```

diff:

```diff
- Expected:
[
  {
    "id": "a",
    "kind": "position",
  },
]

+ Received:
undefined
```

codeFrame (error 1):

```text
18 |       const event = new FederatedPointerEvent(new EventBoundary(view));
19 |       view.emit('pointerover', event);
20 |       expect(onHover).toHaveBeenLastCalledWith({ kind: 'position', id: 'a' });
   |                       ^
21 |       expect(view['hoverRing'].visible).toBe(false);
22 |       view.setHovered(true);
```

### [F06] src/render/PersonNode.interaction.test.ts :: Person hover at far > success: routes pointer events without locally painting controlled hover

repro:

```bash
npx rstest 'src/render/PersonNode.interaction.test.ts' --testNamePattern 'Person hover at far > success: routes pointer events without locally painting controlled hover'
```

details:

```json
{
  "testPath": "src/render/PersonNode.interaction.test.ts",
  "project": "rstest",
  "fullName": "Person hover at far > success: routes pointer events without locally painting controlled hover",
  "status": "fail",
  "duration": 1,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected last \"rstest.fn()\" call to have been called with [ { kind: 'position', id: 'a' } ]",
      "topFrame": {
        "file": "src/render/PersonNode.interaction.test.ts",
        "line": 20,
        "column": 23,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/PersonNode.interaction.test.ts",
      "line": 20
    }
  ]
}
```

diff:

```diff
- Expected:
[
  {
    "id": "a",
    "kind": "position",
  },
]

+ Received:
undefined
```

codeFrame (error 1):

```text
18 |       const event = new FederatedPointerEvent(new EventBoundary(view));
19 |       view.emit('pointerover', event);
20 |       expect(onHover).toHaveBeenLastCalledWith({ kind: 'position', id: 'a' });
   |                       ^
21 |       expect(view['hoverRing'].visible).toBe(false);
22 |       view.setHovered(true);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run PersonNode.interaction.test.ts OrganizationNode.interaction.test.ts

FACT: Node RED permission retry exit 1.
NEXT: Inspect behavioral failures.
FACT: Node RED showed six callback assertions failing; six legacy/far boundary checks passed. Implemented optional onHover routing and explicit state-driven setHovered; preserved far early returns. Added handler rebinding for runtime source rollback.
NEXT: Run node GREEN.

> @org-hierarchy/sdk@1.1.1 test
> rstest run PersonNode.interaction.test.ts OrganizationNode.interaction.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:29:05.217Z"
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
    "tests": 12,
    "failedTests": 0,
    "passedTests": 12,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 675,
    "build": 157,
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

- src/render/OrganizationNode.interaction.test.ts :: Organization hover at near > success: routes pointer events without locally painting controlled hover
- src/render/OrganizationNode.interaction.test.ts :: Organization hover at near > failure boundary: absent callback retains local hover and far never paints a ring
- src/render/OrganizationNode.interaction.test.ts :: Organization hover at mid > success: routes pointer events without locally painting controlled hover
- src/render/OrganizationNode.interaction.test.ts :: Organization hover at mid > failure boundary: absent callback retains local hover and far never paints a ring
- src/render/OrganizationNode.interaction.test.ts :: Organization hover at far > success: routes pointer events without locally painting controlled hover
- src/render/OrganizationNode.interaction.test.ts :: Organization hover at far > failure boundary: absent callback retains local hover and far never paints a ring
- src/render/PersonNode.interaction.test.ts :: Person hover at near > success: routes pointer events without locally painting controlled hover
- src/render/PersonNode.interaction.test.ts :: Person hover at near > failure boundary: absent callback retains local hover and far never paints a ring
- src/render/PersonNode.interaction.test.ts :: Person hover at mid > success: routes pointer events without locally painting controlled hover
- src/render/PersonNode.interaction.test.ts :: Person hover at mid > failure boundary: absent callback retains local hover and far never paints a ring
- src/render/PersonNode.interaction.test.ts :: Person hover at far > success: routes pointer events without locally painting controlled hover
- src/render/PersonNode.interaction.test.ts :: Person hover at far > failure boundary: absent callback retains local hover and far never paints a ring

### Skipped

None.

## Failures

No test failures reported.

FACT: Node GREEN exit 0.
NEXT: Selector relocation success/failure tests.
FACT: Node tests GREEN (12/12). Added selector tests for demo one-hop parity, purity, derived dimming, selected+hovered, null/unknown/wrong-kind hover and empty data.
NEXT: Run selector RED before creating staffRelated.ts.

> @org-hierarchy/sdk@1.1.1 test
> rstest run staffRelated.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:29:31.880Z"
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
    "total": 473,
    "build": 85,
    "tests": 388
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

### [F01] src/render/staffRelated.test.ts

repro:

```bash
npx rstest 'src/render/staffRelated.test.ts'
```

details:

```json
{
  "testPath": "src/render/staffRelated.test.ts",
  "project": "rstest",
  "fullName": "",
  "status": "fail",
  "retryCount": 0,
  "errors": [
    {
      "type": "Error",
      "message": "Cannot find module './staffRelated.js'",
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
npm error command sh -c rstest run staffRelated.test.ts

FACT: Selector RED exit 1.
NEXT: Copy original pure selector and implement derived dimming.
FACT: Selector RED failed because staffRelated did not exist. Copied relatedStaffIds directly from the demo source, byte-for-byte function body; demo unchanged. Added staffDimmedIds as an on-demand pure selector with a visible-node guard.
NEXT: Run selector GREEN.

> @org-hierarchy/sdk@1.1.1 test
> rstest run staffRelated.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:29:51.573Z"
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
    "tests": 5,
    "failedTests": 0,
    "passedTests": 5,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 521,
    "build": 86,
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

- src/render/staffRelated.test.ts :: staff related selectors > success: preserves demo hl() one-hop parity for parent, children and cross-department endpoints
- src/render/staffRelated.test.ts :: staff related selectors > success: derives dimming from current hover independently of selection (rows 14/15)
- src/render/staffRelated.test.ts :: staff related selectors > failure boundary: empty and disconnected lines preserve only the hovered id
- src/render/staffRelated.test.ts :: staff related selectors > failure boundary: null, wrong kind and unknown hover do not dim the scene
- src/render/staffRelated.test.ts :: staff related selectors > success: returns fresh derived sets without mutating inputs or retaining output

### Skipped

None.

## Failures

No test failures reported.

FACT: Selector GREEN exit 0.
NEXT: Renderer wiring/paint/rollback RED tests.
FACT: Selector GREEN (5/5). Added real renderer tests for near/mid/far, source=null rollback, wrong/unknown refs, selection priority, found/highlight preservation, organization routing/source replacement, and occupied-seat person refs.
NEXT: Renderer RED.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer.interaction.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:30:45.505Z"
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
    "tests": 9,
    "failedTests": 9,
    "passedTests": 0,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 704,
    "build": 189,
    "tests": 515
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

### [F01] src/render/DiagramRenderer.interaction.test.ts :: success: near pointer routes to source, paint reads current hover without rebuilding

repro:

```bash
npx rstest 'src/render/DiagramRenderer.interaction.test.ts' --testNamePattern 'success: near pointer routes to source, paint reads current hover without rebuilding'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.interaction.test.ts",
  "project": "rstest",
  "fullName": "success: near pointer routes to source, paint reads current hover without rebuilding",
  "status": "fail",
  "duration": 37,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.setInteractionSource is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.interaction.test.ts",
        "line": 40,
        "column": 14,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.interaction.test.ts",
      "line": 40
    }
  ]
}
```

codeFrame (error 1):

```text
38 |   it(`success: ${lod} pointer routes to source, paint reads current hover without rebuilding`, async () => {
39 |     const { renderer, store, source, paint } = setup();
40 |     renderer.setInteractionSource(source);
   |              ^
41 |     await renderer.render(staffData(), defaultNodeTheme, 'light', defaultRenderConfig, { lod });
42 |     const a = seat(renderer);
```

### [F02] src/render/DiagramRenderer.interaction.test.ts :: success: mid pointer routes to source, paint reads current hover without rebuilding

repro:

```bash
npx rstest 'src/render/DiagramRenderer.interaction.test.ts' --testNamePattern 'success: mid pointer routes to source, paint reads current hover without rebuilding'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.interaction.test.ts",
  "project": "rstest",
  "fullName": "success: mid pointer routes to source, paint reads current hover without rebuilding",
  "status": "fail",
  "duration": 0,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.setInteractionSource is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.interaction.test.ts",
        "line": 40,
        "column": 14,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.interaction.test.ts",
      "line": 40
    }
  ]
}
```

codeFrame (error 1):

```text
38 |   it(`success: ${lod} pointer routes to source, paint reads current hover without rebuilding`, async () => {
39 |     const { renderer, store, source, paint } = setup();
40 |     renderer.setInteractionSource(source);
   |              ^
41 |     await renderer.render(staffData(), defaultNodeTheme, 'light', defaultRenderConfig, { lod });
42 |     const a = seat(renderer);
```

### [F03] src/render/DiagramRenderer.interaction.test.ts :: success: far pointer routes to source, paint reads current hover without rebuilding

repro:

```bash
npx rstest 'src/render/DiagramRenderer.interaction.test.ts' --testNamePattern 'success: far pointer routes to source, paint reads current hover without rebuilding'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.interaction.test.ts",
  "project": "rstest",
  "fullName": "success: far pointer routes to source, paint reads current hover without rebuilding",
  "status": "fail",
  "duration": 0,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.setInteractionSource is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.interaction.test.ts",
        "line": 40,
        "column": 14,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.interaction.test.ts",
      "line": 40
    }
  ]
}
```

codeFrame (error 1):

```text
38 |   it(`success: ${lod} pointer routes to source, paint reads current hover without rebuilding`, async () => {
39 |     const { renderer, store, source, paint } = setup();
40 |     renderer.setInteractionSource(source);
   |              ^
41 |     await renderer.render(staffData(), defaultNodeTheme, 'light', defaultRenderConfig, { lod });
42 |     const a = seat(renderer);
```

### [F04] src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > failure: null source preserves local behavior and can roll back mounted nodes

repro:

```bash
npx rstest 'src/render/DiagramRenderer.interaction.test.ts' --testNamePattern 'renderer interaction boundaries > failure: null source preserves local behavior and can roll back mounted nodes'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.interaction.test.ts",
  "project": "rstest",
  "fullName": "renderer interaction boundaries > failure: null source preserves local behavior and can roll back mounted nodes",
  "status": "fail",
  "duration": 5,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.setInteractionSource is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.interaction.test.ts",
        "line": 67,
        "column": 14,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.interaction.test.ts",
      "line": 67
    }
  ]
}
```

codeFrame (error 1):

```text
65 |     over(a); paint();
66 |     expect(a['hoverRing'].visible).toBe(true);
67 |     renderer.setInteractionSource(source);
   |              ^
68 |     paint();
69 |     expect(a['hoverRing'].visible).toBe(false);
```

### [F05] src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > failure: unknown or wrong-kind hover paints no accent and dims no nodes

repro:

```bash
npx rstest 'src/render/DiagramRenderer.interaction.test.ts' --testNamePattern 'renderer interaction boundaries > failure: unknown or wrong-kind hover paints no accent and dims no nodes'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.interaction.test.ts",
  "project": "rstest",
  "fullName": "renderer interaction boundaries > failure: unknown or wrong-kind hover paints no accent and dims no nodes",
  "status": "fail",
  "duration": 0,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.setInteractionSource is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.interaction.test.ts",
        "line": 85,
        "column": 14,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.interaction.test.ts",
      "line": 85
    }
  ]
}
```

codeFrame (error 1):

```text
83 |   it('failure: unknown or wrong-kind hover paints no accent and dims no nodes', async () => {
84 |     const { renderer, store, source, paint } = setup();
85 |     renderer.setInteractionSource(source);
   |              ^
86 |     await renderer.render(staffData(), defaultNodeTheme, 'light');
87 |     for (const ref of [{ kind: 'position', id: 'missing' }, { kind: 'organization', id: 'a' }] as const) {
```

### [F06] src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: selection wins its accent while related dimming remains derived (rows 14/15)

repro:

```bash
npx rstest 'src/render/DiagramRenderer.interaction.test.ts' --testNamePattern 'renderer interaction boundaries > success: selection wins its accent while related dimming remains derived (rows 14/15)'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.interaction.test.ts",
  "project": "rstest",
  "fullName": "renderer interaction boundaries > success: selection wins its accent while related dimming remains derived (rows 14/15)",
  "status": "fail",
  "duration": 0,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.setInteractionSource is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.interaction.test.ts",
        "line": 95,
        "column": 14,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.interaction.test.ts",
      "line": 95
    }
  ]
}
```

codeFrame (error 1):

```text
93 |   it('success: selection wins its accent while related dimming remains derived (rows 14/15)', async () => {
94 |     const { renderer, store, source, paint } = setup();
95 |     renderer.setInteractionSource(source);
   |              ^
96 |     const selected = { kind: 'position', id: 'a' } as const;
97 |     store.setHovered(selected);
```

### [F07] src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: found focus and highlighted edges survive hover and selection (row 12)

repro:

```bash
npx rstest 'src/render/DiagramRenderer.interaction.test.ts' --testNamePattern 'renderer interaction boundaries > success: found focus and highlighted edges survive hover and selection (row 12)'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.interaction.test.ts",
  "project": "rstest",
  "fullName": "renderer interaction boundaries > success: found focus and highlighted edges survive hover and selection (row 12)",
  "status": "fail",
  "duration": 1,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.setInteractionSource is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.interaction.test.ts",
        "line": 112,
        "column": 14,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.interaction.test.ts",
      "line": 112
    }
  ]
}
```

codeFrame (error 1):

```text
110 |     const { renderer, store, source, paint } = setup();
111 |     const data = staffData();
112 |     renderer.setInteractionSource(source);
    |              ^
113 |     await renderer.render(data, defaultNodeTheme, 'light');
114 |     const found = new Set(['position:b']);
```

### [F08] src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: organization source can be replaced on existing nodes and selection wins

repro:

```bash
npx rstest 'src/render/DiagramRenderer.interaction.test.ts' --testNamePattern 'renderer interaction boundaries > success: organization source can be replaced on existing nodes and selection wins'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.interaction.test.ts",
  "project": "rstest",
  "fullName": "renderer interaction boundaries > success: organization source can be replaced on existing nodes and selection wins",
  "status": "fail",
  "duration": 0,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.setInteractionSource is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.interaction.test.ts",
        "line": 133,
        "column": 14,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.interaction.test.ts",
      "line": 133
    }
  ]
}
```

codeFrame (error 1):

```text
131 |     const data = emptyDiagramData();
132 |     data.organizations = [{ id: 'a', name: 'A', groupIds: [] }];
133 |     renderer.setInteractionSource(source);
    |              ^
134 |     await renderer.render(data, defaultNodeTheme, 'light');
135 |     const view = renderer.layers.organizations.children[0];
```

### [F09] src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: person refs resolve to their occupied seat for hover and selection

repro:

```bash
npx rstest 'src/render/DiagramRenderer.interaction.test.ts' --testNamePattern 'renderer interaction boundaries > success: person refs resolve to their occupied seat for hover and selection'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.interaction.test.ts",
  "project": "rstest",
  "fullName": "renderer interaction boundaries > success: person refs resolve to their occupied seat for hover and selection",
  "status": "fail",
  "duration": 0,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.setInteractionSource is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.interaction.test.ts",
        "line": 155,
        "column": 14,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.interaction.test.ts",
      "line": 155
    }
  ]
}
```

codeFrame (error 1):

```text
153 |     data.persons = [{ id: 'p', fullName: 'Person' }];
154 |     data.positions[0].personId = 'p';
155 |     renderer.setInteractionSource(source);
    |              ^
156 |     await renderer.render(data, defaultNodeTheme, 'light');
157 |     store.setHovered({ kind: 'person', id: 'p' }); paint();
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer.interaction.test.ts

FACT: Renderer RED exit 1.
NEXT: Inspect renderer failures.
FACT: Renderer RED failed at missing setInteractionSource, including rollback and unknown-ref cases. Implemented source binding on registration and source swaps, paint-time hover reads, selection priority, person-to-seat resolution, and derived near/mid dimming. Existing found-focus inputs remain separate from interaction state; dim composes with found alpha and transition opacity. Null-source paints bypass interaction work.
NEXT: Renderer GREEN.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer.interaction.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:31:29.136Z"
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
    "tests": 9,
    "failedTests": 0,
    "passedTests": 9,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 689,
    "build": 171,
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

- src/render/DiagramRenderer.interaction.test.ts :: success: near pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: success: mid pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: success: far pointer routes to source, paint reads current hover without rebuilding
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > failure: null source preserves local behavior and can roll back mounted nodes
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > failure: unknown or wrong-kind hover paints no accent and dims no nodes
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: selection wins its accent while related dimming remains derived (rows 14/15)
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: found focus and highlighted edges survive hover and selection (row 12)
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: organization source can be replaced on existing nodes and selection wins
- src/render/DiagramRenderer.interaction.test.ts :: renderer interaction boundaries > success: person refs resolve to their occupied seat for hover and selection

### Skipped

None.

## Failures

No test failures reported.

FACT: Renderer GREEN attempt exit 0.
NEXT: Inspect result, then validate scoped regression files and noEmit/lint gates.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


FACT: SDK noEmit typecheck exit 0.
NEXT: Inspect errors; do not fix other owners files.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: Repository lint exit 0.
NEXT: Inspect lint output and scoped regression coverage.
FACT: SDK noEmit typecheck and repository lint both passed. Reviewed owned diff and confirmed D1-B now calls the exact source seam and requests paint on hover changes. Added regression coverage for the separate staff-layout construction path, near→far/mid-mark→near crossing, selection persistence, and empty scenes.
FACT: Session guard checkpoint succeeded (exit 0, OK; 9161ca811de331ba51ace553e9f07f90-1-03591f83336f) via registered native root/session mapping, as required by the host session guard.
NEXT: Run only the owned node/renderer/selector test files, including existing node and renderer regression files.

> @org-hierarchy/sdk@1.1.1 test
> rstest run PersonNode.test.ts OrganizationNode.test.ts PersonNode.interaction.test.ts OrganizationNode.interaction.test.ts DiagramRenderer.interaction.test.ts DiagramRenderer.transitions.test.ts DiagramRenderer.cull.test.ts staffRelated.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:32:53.534Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 8,
    "failedFiles": 0,
    "tests": 122,
    "failedTests": 0,
    "passedTests": 122,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1552,
    "build": 193,
    "tests": 1359
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
- src/render/DiagramRenderer.interaction.test.ts :: failure boundary: LOD crossing and mid marks paint no hover while selection survives
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
- src/render/DiagramRenderer.transitions.test.ts :: snap and idle boundaries > throwing frame callbacks warn once but still settle and stay idle
- src/render/DiagramRenderer.transitions.test.ts :: snap and idle boundaries > promote toggles retain the moving Pixi position, and entering cards grow/fade to final
- src/render/DiagramRenderer.transitions.test.ts :: snap and idle boundaries > destroy cancels pending work and remains idempotent
- src/render/DiagramRenderer.transitions.test.ts :: demoting an exiting promoted card reveals its fading Pixi ghost
- src/render/DiagramRenderer.transitions.test.ts :: abort restores the displayed React chrome as well as displayed card coordinates
- src/render/DiagramRenderer.transitions.test.ts :: opt-out and settled alpha cards/routes match the existing DG mockup golden

Note: list truncated (showing 50 of 122).

### Skipped

None.

## Failures

No test failures reported.

FACT: Scoped regression run exit 0.
NEXT: Inspect results and finalize verification.
FACT: Scoped regression run GREEN: 122 tests across eight owned node/renderer/selector files, zero failures/skips. Raw runner output is preserved above without filtering or pipes (the runner itself summarizes only 50 passed names).
DECISION: No broader suite, build, root typecheck, or documentation gate is run: the brief limits execution to owned tests, SDK noEmit typecheck, and lint. No demo, facade, barrel, store, or shared-test edits were made by this coder.
NEXT: Re-run SDK noEmit and lint after the last regression additions, and inspect final owned diff whitespace/scope.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


FACT: Final SDK noEmit typecheck exit 0.
NEXT: Final lint.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: Final lint exit 0.
FACT: Owned diff whitespace check passed; eight source/test paths changed, all within D1-C ownership.
NEXT: Append final report and refresh required session checkpoint.
FACT: DONE — DiagramRenderer exports InteractionSource and supports source attach/replace/null rollback on existing nodes. PersonNode and OrganizationNode accept onHover, route pointerover/out, and paint hover from explicit state. Selected nodes suppress their hover ring. Related dimming is computed per paint, preserving found-focus alpha and transition opacity. relatedStaffIds is relocated unchanged; staffDimmedIds is exported from render/staffRelated.ts.
FACT: TESTED SCENARIOS — Rows 7, 7f, 12, 14, 15 covered. Node callback/local paths at near/mid/far; renderer grid/staff/org paths; unknown/wrong-kind refs; occupied-person aliases; selected+hovered; source replacement and runtime rollback; found/highlight; empty scene; LOD crossing and markAtMid. 122/122 scoped tests GREEN; final SDK noEmit and lint exit 0. Existing regression files were run without edits.
FACT: NON-OBVIOUS FINDINGS — PixiHost calls cullToViewport before app.render, so paint-time interaction refresh works with D1-B's onNeedsPaint subscription and needs no host edit. Person hover uses a position ref; incoming person refs resolve to the occupied seat. Related membership remains local to each paint and absent from InteractionStore. Selection priority applies only on the controlled path, preserving the null-source legacy behavior.
FACT: SCREENSHOTS — Not captured; this task was verified by deterministic Pixi object/event tests, not a browser or visual acceptance session.
FACT: USER FLOW — Pointerover writes through the source; the host requests paint; renderer reads current hovered, suppresses the selected node's duplicate ring, and derives unrelated-seat alpha. Pointerout writes null and next paint restores the emphasis baseline. setInteractionSource(null) restores local pointer behavior on mounted nodes. Far and mid-as-mark nodes never paint a hover ring.
FACT: LIMITS / HANDOFF — No builds/emitting tsc, branch/worktree changes, commits, pushes, or edits outside owned source/test files plus this append-only log. D1-B owns facade/barrel/docs, D1-D owns demo import wiring; neither was modified here. Exported selector names for reuse: relatedStaffIds(lines, hoveredId), staffDimmedIds(hovered, lines, visiblePositionIds). Independent review/mutation verification and manual acceptance row 16 are NOT_TESTED here; no disposable source copy was created outside the exclusive file list.
FACT: POST-DEPLOY — NOT_TESTED; no deployment authorized or performed. Far hover painting remains R1 as specified.
NEXT: Refresh host-required checkpoint, append its result, and return the single STATUS line.
FACT: Final host-required checkpoint refresh exit 0, status OK, checkpoint 9161ca811de331ba51ace553e9f07f90-2-bd81894bc2d4.
NEXT: Coordinator review and D1-D integration; implementation work complete.
STATUS: D1-C COMPLETE — 122 tests GREEN; SDK noEmit typecheck PASS; lint PASS.
