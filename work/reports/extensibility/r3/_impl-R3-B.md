NEXT: Read renderer and test seams, then add failing R3-B tests.
STEP 1 — Read the complete R3-B brief and local entrypoint. Scope restricted to the five implementation/test files plus this append-only log. No builds, root typecheck, commits, branches, or external stores.
STEP 2 — Read plan, pool, interaction tests, both staff builders, and layer teardown. Existing layer teardown destroys children recursively, so pooled host roots need protection at wrapper teardown. Found PersonInteractions.bind is explicitly typed PersonNodeView; inspecting this seam before edits because personInteractions.ts is outside the authorized file list.
NEXT: Resolve whether the required wrapper can bind without modifying the forbidden file or weakening types.
STEP 3 — BLOCKED before production edits or test creation.
EVIDENCE: packages/sdk/src/render/personInteractions.ts:12 imports PersonNodeView; :101 declares drag-state node: PersonNodeView; :147 declares bind(node: PersonNodeView, args: PersonBindArgs). The binder uses Container events/transforms only, but its declared nominal type requires the private members of PersonNodeView. The required HostNodeView extends Container and cannot satisfy that type.
REQUIRED SCOPE CORRECTION: authorize personInteractions.ts, replacing its PersonNodeView import and the two node annotations with Container. This permits the specified personInteractions.bind(wrapper, {box, ...}) without assertions, duplication, or changing the default PersonNodeView path.
PROHIBITIONS HONORED: no production files changed; no out-of-scope files written; no builds, emitting typechecks, branch/worktree operations, commits, pushes, external stores, or test-output pipes.
TEST OUTPUT: NOT RUN. No tests or implementation were added; RED/GREEN and completion gates are pending the scope correction. Existing PersonNode and organization interaction tests were inspected only.
NEXT: Obtain a corrected brief permitting the minimal personInteractions.ts type generalization; then resume failing renderer tests before implementation.
STATUS: BLOCKED — required wrapper binding needs a type generalization in forbidden personInteractions.ts.
NEXT: Run RED placement tests, then implement the approved renderer seam.
STEP 4 — Scope correction approved: personInteractions.ts import and two annotations only. Read the current pool, renderer, interaction regression tests, plan and standards. Renderer render/layers/boxes and factory callbacks are the brief-approved test seams. Added placement tests for both staff builders before production edits.

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

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:49:54.410Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 5,
    "failedFiles": 1,
    "tests": 70,
    "failedTests": 2,
    "passedTests": 68,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1406,
    "build": 216,
    "tests": 1190
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

### [F01] src/render/DiagramRenderer.nodeview.test.ts :: success: simple factory receives input and SDK places its wrapper (staff=false)

repro:

```bash
npx rstest 'src/render/DiagramRenderer.nodeview.test.ts' --testNamePattern 'success: simple factory receives input and SDK places its wrapper (staff=false)'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.nodeview.test.ts",
  "project": "rstest",
  "fullName": "success: simple factory receives input and SDK places its wrapper (staff=false)",
  "status": "fail",
  "duration": 4,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.setNodeViewFactory is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.nodeview.test.ts",
        "line": 25,
        "column": 14,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.nodeview.test.ts",
      "line": 25
    }
  ]
}
```

codeFrame (error 1):

```text
23 |     const { renderer, render } = setup(staff);
24 |     const factory = rstest.fn(() => new Graphics().rect(0, 0, 30, 20).fill(0xff0000));
25 |     renderer.setNodeViewFactory(factory);
   |              ^
26 |     await render();
27 |     expect(factory).toHaveBeenCalledTimes(3);
```

### [F02] src/render/DiagramRenderer.nodeview.test.ts :: success: simple factory receives input and SDK places its wrapper (staff=true)

repro:

```bash
npx rstest 'src/render/DiagramRenderer.nodeview.test.ts' --testNamePattern 'success: simple factory receives input and SDK places its wrapper (staff=true)'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.nodeview.test.ts",
  "project": "rstest",
  "fullName": "success: simple factory receives input and SDK places its wrapper (staff=true)",
  "status": "fail",
  "duration": 0,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.setNodeViewFactory is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.nodeview.test.ts",
        "line": 25,
        "column": 14,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.nodeview.test.ts",
      "line": 25
    }
  ]
}
```

codeFrame (error 1):

```text
23 |     const { renderer, render } = setup(staff);
24 |     const factory = rstest.fn(() => new Graphics().rect(0, 0, 30, 20).fill(0xff0000));
25 |     renderer.setNodeViewFactory(factory);
   |              ^
26 |     await render();
27 |     expect(factory).toHaveBeenCalledTimes(3);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer
STEP 5 — RED confirmed: both placement tests fail on missing setNodeViewFactory; existing renderer tests pass. Implemented wrapper and interface, both staff factory branches, guarded pool sweep and pool-owned root preservation. Binder changes are type-only. Factory error containment remains in R3-A pool rather than duplicating warnings.
NEXT: Verify first GREEN and add lifecycle/error/hover assertions.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:50:48.232Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 5,
    "failedFiles": 0,
    "tests": 70,
    "failedTests": 0,
    "passedTests": 70,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1409,
    "build": 184,
    "tests": 1225
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
- src/render/DiagramRenderer.nodeview.test.ts :: success: simple factory receives input and SDK places its wrapper (staff=false)
- src/render/DiagramRenderer.nodeview.test.ts :: success: simple factory receives input and SDK places its wrapper (staff=true)

Note: list truncated (showing 50 of 70).

### Skipped

None.

## Failures

No test failures reported.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/OrgHierarchyDiagram.r2.test.ts(29,20): error TS2339: Property 'isSelected' does not exist on type 'OrgHierarchyDiagram'.
src/OrgHierarchyDiagram.r2.test.ts(30,20): error TS2551: Property 'isHovered' does not exist on type 'OrgHierarchyDiagram'. Did you mean 'setHovered'?
src/OrgHierarchyDiagram.r2.test.ts(34,20): error TS2339: Property 'isSelected' does not exist on type 'OrgHierarchyDiagram'.
src/OrgHierarchyDiagram.r2.test.ts(35,20): error TS2339: Property 'isSelected' does not exist on type 'OrgHierarchyDiagram'.
src/OrgHierarchyDiagram.r2.test.ts(36,20): error TS2339: Property 'isSelected' does not exist on type 'OrgHierarchyDiagram'.
src/OrgHierarchyDiagram.r2.test.ts(37,20): error TS2551: Property 'isHovered' does not exist on type 'OrgHierarchyDiagram'. Did you mean 'setHovered'?
src/OrgHierarchyDiagram.r2.test.ts(38,20): error TS2551: Property 'isHovered' does not exist on type 'OrgHierarchyDiagram'. Did you mean 'setHovered'?
src/OrgHierarchyDiagram.r2.test.ts(39,20): error TS2551: Property 'isHovered' does not exist on type 'OrgHierarchyDiagram'. Did you mean 'setHovered'?
src/OrgHierarchyDiagram.r2.test.ts(42,20): error TS2339: Property 'isSelected' does not exist on type 'OrgHierarchyDiagram'.
src/OrgHierarchyDiagram.r2.test.ts(43,20): error TS2551: Property 'isHovered' does not exist on type 'OrgHierarchyDiagram'. Did you mean 'setHovered'?
src/render/interactiveNodeView.ts(54,61): error TS2554: Expected 0-2 arguments, but got 3.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json
STEP 6 — First GREEN: 70 renderer tests pass. Package noEmit check found one new wrapper bounds API error plus concurrent R2 facade test errors (untouched). Added lifecycle, factory failure, default-path, and local hover geometry tests before correcting the bounds calculation.
NEXT: Capture hover geometry RED, then correct wrapper-local bounds.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:51:49.640Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 5,
    "failedFiles": 1,
    "tests": 75,
    "failedTests": 2,
    "passedTests": 73,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1071,
    "build": 84,
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

### [F01] src/render/DiagramRenderer.nodeview.test.ts :: success: retained roots update, sweep only vanished seats, and destroy once (staff=true)

repro:

```bash
npx rstest 'src/render/DiagramRenderer.nodeview.test.ts' --testNamePattern 'success: retained roots update, sweep only vanished seats, and destroy once (staff=true)'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.nodeview.test.ts",
  "project": "rstest",
  "fullName": "success: retained roots update, sweep only vanished seats, and destroy once (staff=true)",
  "status": "fail",
  "duration": 12,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to not be called at all, but actually been called 1 times\n\nReceived:\n\n  1st rstest.fn() call:\n\n    Array []\n\n\nNumber of calls: 1\n",
      "topFrame": {
        "file": "src/render/DiagramRenderer.nodeview.test.ts",
        "line": 59,
        "column": 27,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.nodeview.test.ts",
      "line": 59
    }
  ]
}
```

codeFrame (error 1):

```text
57 |     expect(a.root.parent).toBe(renderer.layers.persons.children[0]);
58 |     expect(a.destroy).not.toHaveBeenCalled();
59 |     expect(b.destroy).not.toHaveBeenCalled();
   |                           ^
60 |     expect(entries.get('c')!.destroy).toHaveBeenCalledTimes(1);
61 |     renderer.destroy();
```

### [F02] src/render/DiagramRenderer.nodeview.test.ts :: success: host hover accents wrapper in local coordinates, dims unrelated seats and preserves root

repro:

```bash
npx rstest 'src/render/DiagramRenderer.nodeview.test.ts' --testNamePattern 'success: host hover accents wrapper in local coordinates, dims unrelated seats and preserves root'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.nodeview.test.ts",
  "project": "rstest",
  "fullName": "success: host hover accents wrapper in local coordinates, dims unrelated seats and preserves root",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected -3 to be 4 // Object.is equality",
      "topFrame": {
        "file": "src/render/DiagramRenderer.nodeview.test.ts",
        "line": 102,
        "column": 37,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.nodeview.test.ts",
      "line": 102
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- 4
+ -3
```

codeFrame (error 1):

```text
100 |   const accent = wrapper.children.find((child) => child !== roots[1])!;
101 |   expect(accent.visible).toBe(true);
102 |   expect(accent.getLocalBounds().x).toBe(4);
    |                                     ^
103 |   expect(accent.getLocalBounds().y).toBe(6);
104 |   expect(roots[1]!.position.x).toBe(7);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer
STEP 7 — Hover RED confirmed: expected wrapper-local accent x=4, received -3. Lifecycle, sweep, fallback and default tests passed. Changed accent bounds to wrapper-local bounds after clearing the accent graphic, preserving host transforms and avoiding world/camera offsets.
NEXT: Run final renderer tests, package noEmit typecheck and lint.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer


> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:52:17.773Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 5,
    "failedFiles": 1,
    "tests": 75,
    "failedTests": 2,
    "passedTests": 73,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1470,
    "build": 197,
    "tests": 1273
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

### [F01] src/render/DiagramRenderer.nodeview.test.ts :: success: retained roots update, sweep only vanished seats, and destroy once (staff=true)

repro:

```bash
npx rstest 'src/render/DiagramRenderer.nodeview.test.ts' --testNamePattern 'success: retained roots update, sweep only vanished seats, and destroy once (staff=true)'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.nodeview.test.ts",
  "project": "rstest",
  "fullName": "success: retained roots update, sweep only vanished seats, and destroy once (staff=true)",
  "status": "fail",
  "duration": 13,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to not be called at all, but actually been called 1 times\n\nReceived:\n\n  1st rstest.fn() call:\n\n    Array []\n\n\nNumber of calls: 1\n",
      "topFrame": {
        "file": "src/render/DiagramRenderer.nodeview.test.ts",
        "line": 59,
        "column": 27,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.nodeview.test.ts",
      "line": 59
    }
  ]
}
```

codeFrame (error 1):

```text
57 |     expect(a.root.parent).toBe(renderer.layers.persons.children[0]);
58 |     expect(a.destroy).not.toHaveBeenCalled();
59 |     expect(b.destroy).not.toHaveBeenCalled();
   |                           ^
60 |     expect(entries.get('c')!.destroy).toHaveBeenCalledTimes(1);
61 |     renderer.destroy();
```

### [F02] src/render/DiagramRenderer.nodeview.test.ts :: success: host hover accents wrapper in local coordinates, dims unrelated seats and preserves root

repro:

```bash
npx rstest 'src/render/DiagramRenderer.nodeview.test.ts' --testNamePattern 'success: host hover accents wrapper in local coordinates, dims unrelated seats and preserves root'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.nodeview.test.ts",
  "project": "rstest",
  "fullName": "success: host hover accents wrapper in local coordinates, dims unrelated seats and preserves root",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected -3 to be 4 // Object.is equality",
      "topFrame": {
        "file": "src/render/DiagramRenderer.nodeview.test.ts",
        "line": 102,
        "column": 37,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.nodeview.test.ts",
      "line": 102
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- 4
+ -3
```

codeFrame (error 1):

```text
100 |   const accent = wrapper.children.find((child) => child !== roots[1])!;
101 |   expect(accent.visible).toBe(true);
102 |   expect(accent.getLocalBounds().x).toBe(4);
    |                                     ^
103 |   expect(accent.getLocalBounds().y).toBe(6);
104 |   expect(roots[1]!.position.x).toBe(7);
```

src/OrgHierarchyDiagram.r2.test.ts(37,33): error TS2322: Type '"org"' is not assignable to type 'NodeKind'.
src/OrgHierarchyDiagram.r2.test.ts(40,32): error TS2322: Type '"org"' is not assignable to type 'NodeKind'.
src/OrgHierarchyDiagram.r2.test.ts(71,17): error TS2554: Expected 2 arguments, but got 1.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json
npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer
STEP 8 — The local-bounds retry still failed: the empty accent graphic contributes the origin to wrapper bounds. Excluded the SDK accent from measurement, so the measurement contains only host content. Package typecheck now reports only concurrent R2 test errors, none in R3 files.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:53:03.855Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 5,
    "failedFiles": 1,
    "tests": 75,
    "failedTests": 1,
    "passedTests": 74,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1429,
    "build": 198,
    "tests": 1231
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

### [F01] src/render/DiagramRenderer.nodeview.test.ts :: success: retained roots update, sweep only vanished seats, and destroy once (staff=true)

repro:

```bash
npx rstest 'src/render/DiagramRenderer.nodeview.test.ts' --testNamePattern 'success: retained roots update, sweep only vanished seats, and destroy once (staff=true)'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.nodeview.test.ts",
  "project": "rstest",
  "fullName": "success: retained roots update, sweep only vanished seats, and destroy once (staff=true)",
  "status": "fail",
  "duration": 25,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to not be called at all, but actually been called 1 times\n\nReceived:\n\n  1st rstest.fn() call:\n\n    Array []\n\n\nNumber of calls: 1\n",
      "topFrame": {
        "file": "src/render/DiagramRenderer.nodeview.test.ts",
        "line": 59,
        "column": 27,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.nodeview.test.ts",
      "line": 59
    }
  ]
}
```

codeFrame (error 1):

```text
57 |     expect(a.root.parent).toBe(renderer.layers.persons.children[0]);
58 |     expect(a.destroy).not.toHaveBeenCalled();
59 |     expect(b.destroy).not.toHaveBeenCalled();
   |                           ^
60 |     expect(entries.get('c')!.destroy).toHaveBeenCalledTimes(1);
61 |     renderer.destroy();
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run DiagramRenderer
STEP 9 — Local hover geometry now passes. Staff retention fixture exposed pruning: a reporting child may leave the visible scene although still present in data. Removed report lines from the lifecycle-only fixture so its expected visible IDs are stable; hover tests retain report lines. No production lifecycle change.
NEXT: Repeat renderer tests, then run sequential checks with complete appended output.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:53:47.216Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 5,
    "failedFiles": 0,
    "tests": 75,
    "failedTests": 0,
    "passedTests": 75,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1332,
    "build": 197,
    "tests": 1135
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
- src/render/DiagramRenderer.nodeview.test.ts :: success: simple factory receives input and SDK places its wrapper (staff=false)
- src/render/DiagramRenderer.nodeview.test.ts :: success: simple factory receives input and SDK places its wrapper (staff=true)

Note: list truncated (showing 50 of 75).

### Skipped

None.

## Failures

No test failures reported.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0

STEP 10 — GREEN: all 75 renderer tests pass, package noEmit typecheck passes, lint passes (0 warnings/errors). Added retained-update failure and animated-wrapper integration coverage for the remaining ownership risks before final verification. Existing PersonNode and organization hover/selection/LOD tests remain unchanged and green.
CHECKPOINT: Automatic approval review rejected the native external checkpoint write because it includes task metadata and session identity outside the repo. No checkpoint was created and no workaround attempted; repository log retains all implementation evidence.
NEXT: Verify added lifecycle/animation tests and close the six-section report here.

> @org-hierarchy/sdk@1.1.1 test
> rstest run DiagramRenderer

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:55:15.205Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 5,
    "failedFiles": 0,
    "tests": 77,
    "failedTests": 0,
    "passedTests": 77,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1518,
    "build": 235,
    "tests": 1283
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
- src/render/DiagramRenderer.nodeview.test.ts :: success: simple factory receives input and SDK places its wrapper (staff=false)
- src/render/DiagramRenderer.nodeview.test.ts :: success: simple factory receives input and SDK places its wrapper (staff=true)

Note: list truncated (showing 50 of 77).

### Skipped

None.

## Failures

No test failures reported.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


NEXT: R3-C may wire the facade to setNodeViewFactory(NodeView | null); no R3-B implementation work remains.
STEP 11 — Final verification: renderer suite 77/77 PASS (exit 0), package noEmit typecheck PASS (exit 0), lint PASS (exit 0), scoped git diff whitespace check PASS. All command output above is appended directly, without test-output pipes. Concurrent facade/Rust/React changes were not edited.

## Done
Implemented InteractiveNodeView without nodeRef in the interface; PersonNodeView and OrganizationNodeView declare it. Renderer binding, paint eligibility, related-seat collection and dim application now accept interactive wrappers. Both staff paths obtain pooled host roots and fall back to the unchanged PersonNodeView create call when absent/failed. NodeViewPool owns normalization and try/catch/warn-once. beginPass/markSeen/endPass run with sweep after the current-render epoch guard; destroy clears the pool. Wrappers detach pooled roots before recursive scene destruction. personInteractions.ts only removes the redundant PersonNodeView import (Container was already imported) and replaces the DragState.node/bind parameter types.

## Tested scenarios
New integration coverage: simple factory placement in both builders; retained update/sweep/destroy in both builders; throwing create fallback and warn-once; throwing retained update cleanup/fallback; wrapper-local hover accent with translated host content, unrelated-seat dimming, selection priority and host-transform preservation; no factory/default restoration; retained root during animated wrapper movement. Existing renderer suite covers PersonNode/organization hover and selection, LOD, culling, marquee and transitions. First placement RED and local hover geometry RED are recorded above. Final total: 77 passing tests, no skipped tests. Typecheck and lint pass.

## Non-obvious findings
Scene destruction must detach pool-owned roots; otherwise a retained update receives a destroyed root. Hover graphics must be excluded from bounds measurement: even empty graphics can contribute the origin. Staff pruning makes a data-present position invisible; lifecycle fixture intentionally uses independent seats so its expected visible set is stable. The existing pool is already the host-error boundary; duplicating its catches/warnings in the renderer would be redundant.

## Screenshots
NOT_RUN: no browser or screenshot gate was authorized for this scoped renderer task. Assertions use real Pixi containers and renderer scene/box outputs.

## User-flow walkthrough
Set a factory, render staff, and each visible seat receives a wrapper registered and bound through the same scene/interaction path. Re-render updates retained roots, removed visible seats are swept, hover accents the wrapper and dims unrelated positions, selection keeps priority, and animation moves the wrapper while host coordinates remain local. Set null to restore direct default nodes on the next render.

## Risks and limitations
R3-C facade/barrel/docs wiring is intentionally outside scope. No builds, root typecheck, emitted dist, commits, pushes, or branch/worktree changes. Independent review and disposable mutation testing were not performed in this implementation task. No new export-specific screenshot verification was run; export continues to consume the generic scene. Native checkpoint is BLOCKED: automatic approval review rejected external metadata/session-identity storage; no checkpoint result or workaround is claimed. Any external retry requires approval.

## Post-deploy
NOT_RUN: no deployment requested or permitted; shared live dist was untouched.

STATUS: DONE — R3-B implemented within approved scope; 77 renderer tests, SDK noEmit typecheck and lint PASS; external checkpoint blocked by automatic approval review.
