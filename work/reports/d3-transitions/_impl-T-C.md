NEXT: Read the T-C contract, plan, helpers, and repository standards before writing failing renderer tests.
FACT: Read the complete T-C brief and .ai/README.md. The brief's first-entry-before-first-tool requirement could only be discovered by reading it; this is the first working-file write. No builds, root typecheck, commits, pushes, or external stores will be used.
FACT: Read all five landed transition contract modules. prepare is synchronous, confirm is explicit, and controller callbacks are guarded. No source files changed.
NEXT: Read the authoritative render-flow plan and helper evidence to verify integration ordering.
FACT: Read the plan's renderer flow and acceptance rows. A potential landed-contract inconsistency affects required row #11: TweenAnimator.retarget(1) resets elapsedMs even when its value is already 1, while TransitionController.prepare retargets every existing key's opacity to 1 before checking allSettled.
NEXT: Verify the no-change contract against the landed controller tests and exact plan requirements before implementation; the brief requires QUESTION and stop if the contract is wrong.
FACT: Confirmed by source inspection: TransitionController.prepare calls entry.opacity.retarget(1) for every retained target; TweenAnimator.retarget unconditionally sets elapsedMs = 0; TweenAnimator.settled checks elapsedMs >= durationMs (200 ms for the standard preset). Therefore an identical second prepare with animate:true makes isActive true and start requests a frame, violating plan acceptance #11 (zero frames for unchanged data). The controller test 'initial, unchanged and size-only frames need no animation' uses LinearAnimator, whose settled getter compares value to target and therefore masks the real-factory mismatch.
DECISION: Stop under the brief's explicit instruction: 'If the contract looks wrong, write QUESTION and stop.' Do not compensate inside the renderer or edit the read-only landed modules. No implementation or tests were run; consequently there is no test output to paste. No build, root typecheck, commit, push, external checkpoint/store, or out-of-list file write was performed. Only this working file was appended.
QUESTION: Can the coordinator have the owner of the landed animator/controller contract fix unchanged-target handling and verify it with the real createAnimator factory, so prepare of unchanged targets followed by start requests zero frames? Resume T-C after that contract correction.
STATUS: BLOCKED — landed real animator/controller combination violates required no-change zero-frame contract (#11); brief mandates stopping for contract questions.

NEXT: Resume T-C by reading the fixed contract, authoritative plan, renderer seams and standards; write RED success and failure tests before implementation.
FACT: Read T-C-resume.md and T-C.md in full. The prior BLOCKED entry is preserved. TweenAnimator now leaves an equal current target settled. No source changes or prohibited commands executed.
FACT: Read the render-flow specification, acceptance table, H1/H3 seams, TDD rules and TypeScript standards. Existing other-task edits are present in facade/react/docs and will be left untouched.
DECISION: Test the authorized DiagramRenderer public seam with real Pixi containers, real geometry and real transition factory; manual rAF steps. Snapshot rollback must retain views until facade confirmation, and settle must notify only after isActive becomes false. Registry target boxes remain target boxes during motion; rollback restores the displayed confirmed positions.
NEXT: Add initial RED tests for prepared movement and refused-render restoration before implementing the renderer API.
FACT: Initial test attempt could not collect tests: localhost listener denied. This is infrastructure failure, not RED. Full output:
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts

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
npm error command sh -c rstest run src/render/DiagramRenderer.transitions.test.ts
```
NEXT: Rerun the same RED test with localhost permission.
FACT: RED test command output (exit 1):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:54:54.061Z"
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
    "tests": 2,
    "failedTests": 2,
    "passedTests": 0,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 714,
    "build": 166,
    "tests": 548
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

### [F01] src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > prepares at the old position, starts only on confirmation, and settles with a null signal

repro:

```bash
npx rstest 'src/render/DiagramRenderer.transitions.test.ts' --testNamePattern 'renderer transitions with the real controller > prepares at the old position, starts only on confirmation, and settles with a null signal'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.transitions.test.ts",
  "project": "rstest",
  "fullName": "renderer transitions with the real controller > prepares at the old position, starts only on confirmation, and settles with a null signal",
  "status": "fail",
  "duration": 37,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.configureTransition is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.transitions.test.ts",
        "line": 27,
        "column": 12,
        "method": "setup"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.transitions.test.ts",
      "line": 27
    }
  ]
}
```

codeFrame (error 1):

```text
25 |   const renderer = new DiagramRenderer();
26 |   renderers.push(renderer);
27 |   renderer.configureTransition(resolveAnimate(true, false));
   |            ^
28 |   const draw = (input = data(), transition: 'animate' | 'snap' = 'animate') =>
29 |     renderer.render(input, defaultNodeTheme, 'light', defaultRenderConfig, { transition });
```

### [F02] src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > restores detached views, boxes and promote visibility after a refused render

repro:

```bash
npx rstest 'src/render/DiagramRenderer.transitions.test.ts' --testNamePattern 'renderer transitions with the real controller > restores detached views, boxes and promote visibility after a refused render'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.transitions.test.ts",
  "project": "rstest",
  "fullName": "renderer transitions with the real controller > restores detached views, boxes and promote visibility after a refused render",
  "status": "fail",
  "duration": 1,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "renderer.configureTransition is not a function",
      "topFrame": {
        "file": "src/render/DiagramRenderer.transitions.test.ts",
        "line": 27,
        "column": 12,
        "method": "setup"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.transitions.test.ts",
      "line": 27
    }
  ]
}
```

codeFrame (error 1):

```text
25 |   const renderer = new DiagramRenderer();
26 |   renderers.push(renderer);
27 |   renderer.configureTransition(resolveAnimate(true, false));
   |            ^
28 |   const draw = (input = data(), transition: 'animate' | 'snap' = 'animate') =>
29 |     renderer.render(input, defaultNodeTheme, 'light', defaultRenderConfig, { transition });
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/render/DiagramRenderer.transitions.test.ts

```
FACT: RED confirmed: both initial tests fail because configureTransition is absent. Implemented the first vertical slice: controller ownership, prepare/confirm separation, layer/registry snapshots and abort restoration, final null signal.
NEXT: Run the initial tests and no-emit SDK typecheck; then expand staging/chrome/reconciliation coverage.
FACT: Initial implementation test output (exit 0):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:56:04.908Z"
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
    "tests": 2,
    "failedTests": 0,
    "passedTests": 2,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 655,
    "build": 193,
    "tests": 462
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

- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > prepares at the old position, starts only on confirmation, and settles with a null signal
- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > restores detached views, boxes and promote visibility after a refused render

### Skipped

None.

## Failures

No test failures reported.

```
FACT: SDK noEmit typecheck output (exit 1):
```text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/render/DiagramRenderer.transitions.test.ts(11,63): error TS2322: Type 'null' is not assignable to type 'string | undefined'.
src/render/DiagramRenderer.transitions.test.ts(12,21): error TS2322: Type 'null' is not assignable to type 'string | undefined'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

```
FACT: Initial slice GREEN (2/2). SDK typecheck found only two nullable fixture fields in my new test; corrected to undefined.
NEXT: RED for persistent exit ghosts across repeated renders and drag settling before reading the origin.
FACT: Ghost/drag RED output (exit 1):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:57:03.555Z"
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
    "failedTests": 2,
    "passedTests": 2,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 669,
    "build": 170,
    "tests": 499
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

### [F01] src/render/DiagramRenderer.transitions.test.ts :: renderer ghost lifecycle > keeps a fading exit through another render and absorbs it when the key returns

repro:

```bash
npx rstest 'src/render/DiagramRenderer.transitions.test.ts' --testNamePattern 'renderer ghost lifecycle > keeps a fading exit through another render and absorbs it when the key returns'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.transitions.test.ts",
  "project": "rstest",
  "fullName": "renderer ghost lifecycle > keeps a fading exit through another render and absorbs it when the key returns",
  "status": "fail",
  "duration": 38,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected true to be false // Object.is equality",
      "topFrame": {
        "file": "src/render/DiagramRenderer.transitions.test.ts",
        "line": 107,
        "column": 32,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.transitions.test.ts",
      "line": 107
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- false
+ true
```

codeFrame (error 1):

```text
105 |     expect(alpha).toBeGreaterThan(0);
106 |     await draw(empty); renderer.startTransition();
107 |     expect(original.destroyed).toBe(false);
    |                                ^
108 |     step(50);
109 |     expect(original.alpha).toBeLessThan(alpha);
```

### [F02] src/render/DiagramRenderer.transitions.test.ts :: renderer ghost lifecycle > settles before drag reads the origin

repro:

```bash
npx rstest 'src/render/DiagramRenderer.transitions.test.ts' --testNamePattern 'renderer ghost lifecycle > settles before drag reads the origin'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.transitions.test.ts",
  "project": "rstest",
  "fullName": "renderer ghost lifecycle > settles before drag reads the origin",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected 2 to be 282 // Object.is equality",
      "topFrame": {
        "file": "src/render/DiagramRenderer.transitions.test.ts",
        "line": 126,
        "column": 20,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.transitions.test.ts",
      "line": 126
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- 282
+ 2
```

codeFrame (error 1):

```text
124 |     const target = renderer.getNodeBox('a');
125 |     view.emit('pointerdown', { global: { x: view.x, y: view.y }, pointerId: 1, stopPropagation() {} });
126 |     expect(view.x).toBe(target?.x);
    |                    ^
127 |     expect(renderer.getTransitionFrame()).toBeNull();
128 |     expect(pending.size).toBe(0);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/render/DiagramRenderer.transitions.test.ts

```
FACT: Ghost/drag tests were RED at the intended assertions (exit destroyed on retarget; drag still at start position). Preserved prior ghost identity in snapshots and added the drag-start settle seam.
NEXT: Verify GREEN, then cover real staff chrome and lines.
FACT: Ghost/drag implementation output (exit 0):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:57:31.205Z"
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
    "total": 644,
    "build": 174,
    "tests": 470
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

- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > prepares at the old position, starts only on confirmation, and settles with a null signal
- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > restores detached views, boxes and promote visibility after a refused render
- src/render/DiagramRenderer.transitions.test.ts :: renderer ghost lifecycle > keeps a fading exit through another render and absorbs it when the key returns
- src/render/DiagramRenderer.transitions.test.ts :: renderer ghost lifecycle > settles before drag reads the origin

### Skipped

None.

## Failures

No test failures reported.

```
FACT: Ghost reconciliation and drag slice GREEN (4/4).
NEXT: RED for React org-frame interpolation/hidden lines and Pixi old-line preservation/fade; geometry is computed through the real staff path.
FACT: Chrome RED output (exit 1):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:58:08.497Z"
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
    "tests": 6,
    "failedTests": 2,
    "passedTests": 4,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 686,
    "build": 159,
    "tests": 527
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

### [F01] src/render/DiagramRenderer.transitions.test.ts :: staff chrome staging > hides React lines during motion and returns interpolated org chrome then exact target routes

repro:

```bash
npx rstest 'src/render/DiagramRenderer.transitions.test.ts' --testNamePattern 'staff chrome staging > hides React lines during motion and returns interpolated org chrome then exact target routes'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.transitions.test.ts",
  "project": "rstest",
  "fullName": "staff chrome staging > hides React lines during motion and returns interpolated org chrome then exact target routes",
  "status": "fail",
  "duration": 46,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [ { fromId: 'a', toId: 'b', …(2) } ] to deeply equal []",
      "topFrame": {
        "file": "src/render/DiagramRenderer.transitions.test.ts",
        "line": 156,
        "column": 54,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.transitions.test.ts",
      "line": 156
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- []
+ [
+   {
+     "endsOnDeptTop": false,
+     "fromId": "a",
+     "points": [
+       {
+         "x": 618,
+         "y": 112,
+       },
+       {
+         "x": 710,
+         "y": 112,
+       },
+       {
+         "x": 710,
+         "y": 300,
+       },
+       {
+         "x": 802,
+         "y": 300,
+       },
+     ],
+     "toId": "b",
+   },
+ ]
```

codeFrame (error 1):

```text
154 |     expect(old?.lines.length).toBeGreaterThan(0);
155 |     await draw(3);
156 |     expect(renderer.getStaffChromeGeometry()?.lines).toEqual([]);
    |                                                      ^
157 |     expect(renderer.getStaffChromeGeometry()?.org?.x).toBe(old?.org?.x);
158 |     renderer.startTransition(); step();
```

### [F02] src/render/DiagramRenderer.transitions.test.ts :: staff chrome staging > keeps old Pixi lines fading, hides new lines until settle and destroys old lines

repro:

```bash
npx rstest 'src/render/DiagramRenderer.transitions.test.ts' --testNamePattern 'staff chrome staging > keeps old Pixi lines fading, hides new lines until settle and destroys old lines'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.transitions.test.ts",
  "project": "rstest",
  "fullName": "staff chrome staging > keeps old Pixi lines fading, hides new lines until settle and destroys old lines",
  "status": "fail",
  "duration": 6,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected true to be false // Object.is equality",
      "topFrame": {
        "file": "src/render/DiagramRenderer.transitions.test.ts",
        "line": 176,
        "column": 27,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.transitions.test.ts",
      "line": 176
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- false
+ true
```

codeFrame (error 1):

```text
174 |     const old = renderer.layers.edges.children[0];
175 |     await draw(3); renderer.startTransition();
176 |     expect(old.destroyed).toBe(false);
    |                           ^
177 |     expect(renderer.layers.edges.alpha).toBe(0);
178 |     step(50);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/render/DiagramRenderer.transitions.test.ts

```
FACT: Chrome RED failed on live target lines and destroyed old lines. Added React chrome frame targets and frame-derived getter, and detached line/blob fade staging.
NEXT: Verify the chrome slice, then add Pixi rectangular chrome and culling tests.
FACT: Chrome implementation output (exit 0):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:58:49.000Z"
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
    "tests": 6,
    "failedTests": 0,
    "passedTests": 6,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 650,
    "build": 173,
    "tests": 477
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

- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > prepares at the old position, starts only on confirmation, and settles with a null signal
- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > restores detached views, boxes and promote visibility after a refused render
- src/render/DiagramRenderer.transitions.test.ts :: renderer ghost lifecycle > keeps a fading exit through another render and absorbs it when the key returns
- src/render/DiagramRenderer.transitions.test.ts :: renderer ghost lifecycle > settles before drag reads the origin
- src/render/DiagramRenderer.transitions.test.ts :: staff chrome staging > hides React lines during motion and returns interpolated org chrome then exact target routes
- src/render/DiagramRenderer.transitions.test.ts :: staff chrome staging > keeps old Pixi lines fading, hides new lines until settle and destroys old lines

### Skipped

None.

## Failures

No test failures reported.

```
FACT: React chrome and old-line staging GREEN (6/6).
NEXT: RED for Pixi department-frame motion at far LOD and endpoint-union/live-versus-ghost culling.
FACT: Pixi/culling RED output (exit 1):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T17:59:23.894Z"
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
    "tests": 8,
    "failedTests": 2,
    "passedTests": 6,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 764,
    "build": 171,
    "tests": 593
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

### [F01] src/render/DiagramRenderer.transitions.test.ts :: Pixi chrome and culling > moves rectangular department chrome as frame boxes, including on far LOD

repro:

```bash
npx rstest 'src/render/DiagramRenderer.transitions.test.ts' --testNamePattern 'Pixi chrome and culling > moves rectangular department chrome as frame boxes, including on far LOD'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.transitions.test.ts",
  "project": "rstest",
  "fullName": "Pixi chrome and culling > moves rectangular department chrome as frame boxes, including on far LOD",
  "status": "fail",
  "duration": 33,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected 473.5 to be close to -6.5, received difference is 480, but expected 0.005",
      "topFrame": {
        "file": "src/render/DiagramRenderer.transitions.test.ts",
        "line": 197,
        "column": 72,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.transitions.test.ts",
      "line": 197
    }
  ]
}
```

codeFrame (error 1):

```text
195 |     const oldX = renderer.layers.departments.children[0].getLocalBounds().x;
196 |     await draw(3);
197 |     expect(renderer.layers.departments.children[0].getLocalBounds().x).toBeCloseTo(oldX);
    |                                                                        ^
198 |     renderer.startTransition(); step();
199 |     expect(renderer.layers.departments.children[0].getLocalBounds().x).toBeGreaterThan(oldX);
```

### [F02] src/render/DiagramRenderer.transitions.test.ts :: Pixi chrome and culling > culls moving live cards against both endpoints and exit ghosts against their frame

repro:

```bash
npx rstest 'src/render/DiagramRenderer.transitions.test.ts' --testNamePattern 'Pixi chrome and culling > culls moving live cards against both endpoints and exit ghosts against their frame'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.transitions.test.ts",
  "project": "rstest",
  "fullName": "Pixi chrome and culling > culls moving live cards against both endpoints and exit ghosts against their frame",
  "status": "fail",
  "duration": 69,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected false to be true // Object.is equality",
      "topFrame": {
        "file": "src/render/DiagramRenderer.transitions.test.ts",
        "line": 214,
        "column": 60,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.transitions.test.ts",
      "line": 214
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
212 |     await draw(many(100)); renderer.startTransition();
213 |     renderer.cullToViewport({ x: 0, y: 0, scale: 1 }, { width: 800, height: 600 });
214 |     expect(renderer.layers.persons.children[0].renderable).toBe(true);
    |                                                            ^
215 |     renderer.settleNow();
216 |     await draw({ ...data(), positions: [] }); renderer.startTransition();
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/render/DiagramRenderer.transitions.test.ts

```
FACT: Pixi/culling RED exposed target-only rectangle paint and target-only culling. Implemented keyed rectangular chrome painters (departments/zones/dashed frame), redraw from frame boxes, and endpoint-union/ghost-frame culling.
NEXT: Run GREEN and noEmit typecheck.
FACT: npm test -w @org-hierarchy/sdk -- src/render/DiagramRenderer.transitions.test.ts (exit 0):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T18:00:10.086Z"
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
    "tests": 8,
    "failedTests": 0,
    "passedTests": 8,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 691,
    "build": 169,
    "tests": 522
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

- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > prepares at the old position, starts only on confirmation, and settles with a null signal
- src/render/DiagramRenderer.transitions.test.ts :: renderer transitions with the real controller > restores detached views, boxes and promote visibility after a refused render
- src/render/DiagramRenderer.transitions.test.ts :: renderer ghost lifecycle > keeps a fading exit through another render and absorbs it when the key returns
- src/render/DiagramRenderer.transitions.test.ts :: renderer ghost lifecycle > settles before drag reads the origin
- src/render/DiagramRenderer.transitions.test.ts :: staff chrome staging > hides React lines during motion and returns interpolated org chrome then exact target routes
- src/render/DiagramRenderer.transitions.test.ts :: staff chrome staging > keeps old Pixi lines fading, hides new lines until settle and destroys old lines
- src/render/DiagramRenderer.transitions.test.ts :: Pixi chrome and culling > moves rectangular department chrome as frame boxes, including on far LOD
- src/render/DiagramRenderer.transitions.test.ts :: Pixi chrome and culling > culls moving live cards against both endpoints and exit ghosts against their frame

### Skipped

None.

## Failures

No test failures reported.

```
FACT: npm run typecheck -w @org-hierarchy/sdk (exit 1):
```text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/render/DiagramRenderer.transitions.test.ts(125,32): error TS2740: Type '{ x: number; y: number; }' is missing the following properties from type 'Point': clone, copyFrom, copyTo, equals, and 13 more.
src/render/DiagramRenderer.ts(1090,53): error TS2339: Property 'orgId' does not exist on type 'StaffTierBand'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

```
FACT: Pixi/culling slice GREEN (8/8); corrected zone key to organizationId and used a real FederatedPointerEvent in the drag test.
NEXT: Run expanded boundary coverage, including opt-out literal geometry, unchanged data, idle, LOD, snap cleanup, callback isolation, promote and destroy.
FACT: npm test -w @org-hierarchy/sdk -- src/render/DiagramRenderer.transitions.test.ts (exit 1):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T18:01:25.231Z"
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
    "tests": 15,
    "failedTests": 1,
    "passedTests": 14,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 731,
    "build": 154,
    "tests": 577
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

### [F01] src/render/DiagramRenderer.transitions.test.ts :: snap and idle boundaries > null controller preserves the recorded bare-grid positions and requests zero frames

repro:

```bash
npx rstest 'src/render/DiagramRenderer.transitions.test.ts' --testNamePattern 'snap and idle boundaries > null controller preserves the recorded bare-grid positions and requests zero frames'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.transitions.test.ts",
  "project": "rstest",
  "fullName": "snap and idle boundaries > null controller preserves the recorded bare-grid positions and requests zero frames",
  "status": "fail",
  "duration": 33,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [ { id: 'position:a', …(5) } ] to deeply equal [ { id: 'position:a', …(5) } ]",
      "topFrame": {
        "file": "src/render/DiagramRenderer.transitions.test.ts",
        "line": 233,
        "column": 38,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.transitions.test.ts",
      "line": 233
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
-     "height": 184,
+     "height": 156,
      "id": "position:a",
      "kind": "position",
      "width": 136,
      "x": 282,
-     "y": -52,
+     "y": 2,
    },
  ]
```

codeFrame (error 1):

```text
231 |     renderer.configureTransition(null);
232 |     await draw(data(2)); renderer.startTransition();
233 |     expect(renderer.listNodeBoxes()).toEqual([
    |                                      ^
234 |       { id: 'position:a', kind: 'position', x: 282, y: -52, width: 136, height: 184 },
235 |     ]);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/render/DiagramRenderer.transitions.test.ts

```
FACT: npm run typecheck -w @org-hierarchy/sdk (exit 0):
```text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


```
FACT: Expanded checks passed 14/15; the opt-out test had incorrect literal fixture dimensions, not a production failure. Checked the unchanged bare-grid formula and default cell/card metrics: x=282,y=2,w=136,h=156; corrected the oracle. SDK noEmit typecheck passed.
NEXT: RED for promote demotion of an exit ghost and rollback of displayed React chrome.
FACT: Ghost visibility/chrome rollback RED output (exit 1):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T18:03:32.656Z"
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
    "tests": 17,
    "failedTests": 2,
    "passedTests": 15,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 833,
    "build": 177,
    "tests": 656
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

### [F01] src/render/DiagramRenderer.transitions.test.ts :: demoting an exiting promoted card reveals its fading Pixi ghost

repro:

```bash
npx rstest 'src/render/DiagramRenderer.transitions.test.ts' --testNamePattern 'demoting an exiting promoted card reveals its fading Pixi ghost'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.transitions.test.ts",
  "project": "rstest",
  "fullName": "demoting an exiting promoted card reveals its fading Pixi ghost",
  "status": "fail",
  "duration": 33,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected false to be true // Object.is equality",
      "topFrame": {
        "file": "src/render/DiagramRenderer.transitions.test.ts",
        "line": 341,
        "column": 23,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.transitions.test.ts",
      "line": 341
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
339 |   await draw({ ...data(), positions: [] }); renderer.startTransition();
340 |   renderer.setPromotedNodeIds([]);
341 |   expect(old.visible).toBe(true);
    |                       ^
342 |   step(50);
343 |   expect(old.alpha).toBeGreaterThan(0);
```

### [F02] src/render/DiagramRenderer.transitions.test.ts :: abort restores the displayed React chrome as well as displayed card coordinates

repro:

```bash
npx rstest 'src/render/DiagramRenderer.transitions.test.ts' --testNamePattern 'abort restores the displayed React chrome as well as displayed card coordinates'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.transitions.test.ts",
  "project": "rstest",
  "fullName": "abort restores the displayed React chrome as well as displayed card coordinates",
  "status": "fail",
  "duration": 4,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected { org: { x: 462, y: -10, …(3) }, …(3) } to deeply equal { org: { …(5) }, depts: [], …(3) }",
      "topFrame": {
        "file": "src/render/DiagramRenderer.transitions.test.ts",
        "line": 360,
        "column": 45,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.transitions.test.ts",
      "line": 360
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

  {
    "depts": [],
-   "lines": [],
-   "linesOpacity": 0,
+   "lines": [
+     {
+       "endsOnDeptTop": false,
+       "fromId": "a",
+       "points": [
+         {
+           "x": 618,
+           "y": 112,
+         },
+         {
+           "x": 710,
+           "y": 112,
+         },
+         {
+           "x": 710,
+           "y": 300,
+         },
+         {
+           "x": 802,
+           "y": 300,
+         },
+       ],
+       "toId": "b",
+     },
+   ],
    "nodeBoxes": {
      "a": {
        "height": 156,
        "width": 136,
-       "x": 34.89868133696453,
+       "x": 482,
        "y": 34,
      },
      "b": {
        "height": 156,
        "width": 136,
-       "x": 354.8986813369645,
+       "x": 802,
        "y": 222,
      },
    },
    "org": {
      "height": 408,
      "name": "Org",
      "width": 496,
-     "x": 14.898681336964529,
+     "x": 462,
      "y": -10,
    },
  }
```

codeFrame (error 1):

```text
358 |   await expect(draw(refused)).rejects.toThrow('refused layout');
359 |   renderer.abortTransition();
360 |   expect(renderer.getStaffChromeGeometry()).toEqual(displayed);
    |                                             ^
361 | });
362 | 
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/render/DiagramRenderer.transitions.test.ts

```
FACT: Both visibility/chrome rollback tests reproduced failures; fixed ghost promote visibility and captured displayed chrome. Restored emergency views are explicitly noninteractive until replacement.
NEXT: Verify with the independent existing Rust mock3 DG golden (read-only), real alpha collapse/reopen, burst cap and >2000-node snap; run lint.
FACT: npm test -w @org-hierarchy/sdk -- src/render/DiagramRenderer.transitions.test.ts (exit 0):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T18:04:28.353Z"
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
    "tests": 19,
    "failedTests": 0,
    "passedTests": 19,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1027,
    "build": 158,
    "tests": 869
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
- src/render/DiagramRenderer.transitions.test.ts :: continuous retargets obey the 750ms burst cap and scenes over 2000 keys snap

### Skipped

None.

## Failures

No test failures reported.

```
FACT: npm run lint (exit 0):
```text

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


```
FACT: All 19 renderer tests passed, including the existing independent DG mockup golden and real alpha collapse/reopen; npm run lint passed.
NEXT: Close the remaining explicit natural-settle line fade requirement. Keep one null settle signal; only paint work continues for the bounded fade, then zero idle frames. settleNow must finish even that pending paint fade immediately.
FACT: Natural line fade RED output (exit 1):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T18:05:55.989Z"
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
    "tests": 20,
    "failedTests": 1,
    "passedTests": 19,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1136,
    "build": 162,
    "tests": 974
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

### [F01] src/render/DiagramRenderer.transitions.test.ts :: natural settle fades new Pixi lines in, signals settle once, and settleNow finishes a pending line fade

repro:

```bash
npx rstest 'src/render/DiagramRenderer.transitions.test.ts' --testNamePattern 'natural settle fades new Pixi lines in, signals settle once, and settleNow finishes a pending line fade'
```

details:

```json
{
  "testPath": "src/render/DiagramRenderer.transitions.test.ts",
  "project": "rstest",
  "fullName": "natural settle fades new Pixi lines in, signals settle once, and settleNow finishes a pending line fade",
  "status": "fail",
  "duration": 33,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected 1 to be less than 1",
      "topFrame": {
        "file": "src/render/DiagramRenderer.transitions.test.ts",
        "line": 475,
        "column": 39,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/DiagramRenderer.transitions.test.ts",
      "line": 475
    }
  ]
}
```

codeFrame (error 1):

```text
473 |   expect(renderer.getTransitionFrame()).toBeNull();
474 |   expect(renderer.layers.edges.alpha).toBeGreaterThan(0);
475 |   expect(renderer.layers.edges.alpha).toBeLessThan(1);
    |                                       ^
476 |   step(50);
477 |   expect(renderer.layers.edges.alpha).toBeLessThan(1);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/render/DiagramRenderer.transitions.test.ts

```
FACT: Natural-fade RED reproduced immediate alpha=1. Added bounded Pixi paint-only fade after controller settle, with no extra onTransitionFrame signals; settleNow/render/destroy finish or cancel it. React routes still become available immediately at settle.
NEXT: Verify GREEN and all allowed owned regression suites, noEmit typecheck and lint.
FACT: npm test -w @org-hierarchy/sdk -- src/render/DiagramRenderer.transitions.test.ts src/render/DiagramRenderer.cull.test.ts src/render/SceneRegistry.test.ts src/render/layerManager.clear.test.ts src/render/personInteractions.test.ts (exit 0):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts src/render/DiagramRenderer.cull.test.ts src/render/SceneRegistry.test.ts src/render/layerManager.clear.test.ts src/render/personInteractions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T18:06:24.163Z"
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
    "tests": 54,
    "failedTests": 0,
    "passedTests": 54,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1135,
    "build": 79,
    "tests": 1056
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
- src/render/DiagramRenderer.transitions.test.ts :: continuous retargets obey the 750ms burst cap and scenes over 2000 keys snap
- src/render/DiagramRenderer.transitions.test.ts :: natural settle fades new Pixi lines in, signals settle once, and settleNow finishes a pending line fade
- src/render/layerManager.clear.test.ts :: LayerManager.clear (T75 D3) > success: destroys removed children
- src/render/personInteractions.test.ts :: PersonInteractions > success: binding remembers the seat box for hit-testing later
- src/render/personInteractions.test.ts :: PersonInteractions > success: a click without movement selects and never reports a drop
- src/render/personInteractions.test.ts :: PersonInteractions > success: dragging previews the contour once per cell and drops on the snapped cell
- src/render/personInteractions.test.ts :: PersonInteractions > failure: a drop outside the grid restores the contours and returns the card
- src/render/personInteractions.test.ts :: PersonInteractions > failure: reset drops an in-flight drag, so the old card cannot finish it
- src/render/SceneRegistry.test.ts :: SceneRegistry > success: a bare id finds its box under the typed key
- src/render/SceneRegistry.test.ts :: SceneRegistry > success: person and position ids of the same seat do not collide
- src/render/SceneRegistry.test.ts :: SceneRegistry > success: content bounds union every remembered box

Note: list truncated (showing 50 of 54).

### Skipped

None.

## Failures

No test failures reported.

```
FACT: npm run typecheck -w @org-hierarchy/sdk (exit 0):
```text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


```
FACT: npm run lint (exit 0):
```text

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


```
FACT: All 54 owned regression tests, SDK noEmit typecheck and lint passed. Scoped diff whitespace check passed; unrelated concurrent edits remain untouched.
DECISION: Final flow inspection tightened the literal plan ordering: prepare now consumes computed staff/grid target geometry before creating cards, and their first position assignment uses the start frame. End-of-render applies opacity/scale after baseline registration.
NEXT: Re-run owned tests and both required gates after that ordering correction.
FACT: npm test -w @org-hierarchy/sdk -- src/render/DiagramRenderer.transitions.test.ts src/render/DiagramRenderer.cull.test.ts src/render/SceneRegistry.test.ts src/render/layerManager.clear.test.ts src/render/personInteractions.test.ts (exit 0):
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/render/DiagramRenderer.transitions.test.ts src/render/DiagramRenderer.cull.test.ts src/render/SceneRegistry.test.ts src/render/layerManager.clear.test.ts src/render/personInteractions.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T18:08:00.926Z"
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
    "tests": 54,
    "failedTests": 0,
    "passedTests": 54,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1296,
    "build": 171,
    "tests": 1125
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
- src/render/DiagramRenderer.transitions.test.ts :: continuous retargets obey the 750ms burst cap and scenes over 2000 keys snap
- src/render/DiagramRenderer.transitions.test.ts :: natural settle fades new Pixi lines in, signals settle once, and settleNow finishes a pending line fade
- src/render/layerManager.clear.test.ts :: LayerManager.clear (T75 D3) > success: destroys removed children
- src/render/personInteractions.test.ts :: PersonInteractions > success: binding remembers the seat box for hit-testing later
- src/render/personInteractions.test.ts :: PersonInteractions > success: a click without movement selects and never reports a drop
- src/render/personInteractions.test.ts :: PersonInteractions > success: dragging previews the contour once per cell and drops on the snapped cell
- src/render/personInteractions.test.ts :: PersonInteractions > failure: a drop outside the grid restores the contours and returns the card
- src/render/personInteractions.test.ts :: PersonInteractions > failure: reset drops an in-flight drag, so the old card cannot finish it
- src/render/SceneRegistry.test.ts :: SceneRegistry > success: a bare id finds its box under the typed key
- src/render/SceneRegistry.test.ts :: SceneRegistry > success: person and position ids of the same seat do not collide
- src/render/SceneRegistry.test.ts :: SceneRegistry > success: content bounds union every remembered box

Note: list truncated (showing 50 of 54).

### Skipped

None.

## Failures

No test failures reported.

```
FACT: npm run typecheck -w @org-hierarchy/sdk (exit 0):
```text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


```
FACT: npm run lint (exit 0):
```text

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


```
FACT: Final verification: 54/54 tests passed across the five owned renderer/registry/layer/interaction test files; SDK noEmit typecheck exit 0; npm run lint exit 0; scoped git diff --check exit 0. Full raw command outputs are appended above (the Rstest reporter itself lists at most 50 passing test names; its total is 54, with no skipped tests).
FACT: Done — DiagramRenderer owns the real controller; fixed public methods/RenderReason/RenderOptions.transition/onTransitionFrame are present. Computed geometry prepares before card placement; start confirms and schedules, abort restores detached scene/registry/displayed chrome, and settleNow finishes controller and line paint immediately. The final callback observes getTransitionFrame() === null exactly once.
FACT: Tested scenarios — #1 opt-out literal grid geometry plus existing independent Rust mock3 DG golden; #2/#3/#4/#10/#39 collapse/return/movement/enter scale-opacity and one-sprite reconciliation; #5/#6/#7/#30/#33 real staff lines, React org/dept frame geometry and Pixi rectangular repaint; #11/#16/#27/#35 unchanged/first/empty/one-node and zero idle work; #18 burst cap and >2000 nodes; #19 refused render restores identity and displayed boxes/chrome; #20 renderer export prerequisite via settleNow; #22 drag snaps before origin read; #28/#37 LOD wins and next same-LOD pass animates; #29 promote visibility during motion and exit demotion; #34 throwing callback isolation; #36 empty-target exits; #38 snap removes ghosts. Existing culling, interaction, registry and layer regressions also pass.
FACT: Non-obvious findings — the initial landed animator blocker is fixed. Additional RED tests caught persistent-ghost loss, stale promote-hidden ghosts, target-only rollback chrome, premature line destruction, target-only culling and missing natural line fade. All have corresponding GREEN evidence above. The final Pixi line fade is bounded paint-only work after the controller settles; it emits no additional transition/structural signal, and settleNow cancels it synchronously. React exposes final routes at controller settle.
FACT: Screenshots — not captured: this task authorizes direct renderer rstest verification; host visual acceptance #26 remains the coordinator/host manual check. No browser, build or dist operation was run.
FACT: User-flow walkthrough — configured initial render snaps; changed staff geometry prepares the start frame without scheduling; facade confirmation starts motion; live and ghost cards follow frame boxes while old routes fade and new routes stay hidden; settle drops ghosts, exposes final geometry and emits one null-frame signal. Failed animate passes restore a static confirmed scene and request one paint. Drag/export/backdrop teardown can settle immediately.
FACT: Post-deploy — not run; deployment/build/commit/push are prohibited for T-C. Facade, React overlay and docs belong to the other coders; no writes were made to those files. Mutation review and host visual/performance measurement are not claimed by these renderer test results.
FACT: Scope audit — authored changes are confined to packages/sdk/src/render/DiagramRenderer.ts, LayerManager.ts, SceneRegistry.ts, personInteractions.ts, DiagramRenderer.transitions.test.ts and this append-only working file. Existing BLOCKED history is intact. No source contract modules, dist, config, external checkpoint/state store, branch, worktree, commit or push was changed/created. Current native identity is codex / 01a1acd7-3e92-7df3-aa4b-7fa8db354831 / /Users/strelia/projects/dg; durable task state is this authorized in-repo file, with no external checkpoint claimed.
STATUS: DONE — T-C renderer integration complete; 54 owned tests GREEN, SDK noEmit typecheck and lint PASS; all writes limited to the authorized files.
