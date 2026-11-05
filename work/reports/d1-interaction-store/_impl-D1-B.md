NEXT: Read required contracts and facade wiring, then add failing tests.
FACT: Read D1-B brief in full and .ai/README.md. Scope restricted to assigned facade, barrel, USAGE, own test, and this append-only log. No builds, root typecheck, commits, branch changes, or other tests.
FACT: Read store, interaction type, plan and GATE-1 decisions; inspected facade data setter, mount, selection delegates, destroy and existing test patterns. The shared data setter covers setData, append and structural replacement paths.
DECISION: Preserve notifyPromoteSync in the selection callback. Reconcile by NodeRef kind+id in current data. Test the agreed public facade and renderer source seam; run only the new test file.
NEXT: Add success/failure tests and capture RED output verbatim.

> @org-hierarchy/sdk@1.1.1 test
> rstest run --run src/OrgHierarchyDiagram.interaction.test.ts

error   Failed to start Rstest CLI.
error   CACError: Unknown option `--run`
    at Command.checkUnknownOptions (file:///Users/strelia/projects/dg/node_modules/@rstest/core/dist/3374%7E0.js:342:137)
    at CAC.runMatchedCommand (file:///Users/strelia/projects/dg/node_modules/@rstest/core/dist/3374%7E0.js:539:17)
    at cli.parse (file:///Users/strelia/projects/dg/node_modules/@rstest/core/dist/3374%7E0.js:1060:22)
    at setupCommands (file:///Users/strelia/projects/dg/node_modules/@rstest/core/dist/3374%7E0.js:1458:9)
    at runCLI (file:///Users/strelia/projects/dg/node_modules/@rstest/core/dist/index.js:8:9)
    at main (file:///Users/strelia/projects/dg/node_modules/@rstest/core/bin/rstest.js:22:3)
npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run --run src/OrgHierarchyDiagram.interaction.test.ts

FACT: RED command exit 1.
NEXT: Implement facade wiring.

FACT: Initial command was a CLI failure, not RED evidence. Correcting redundant --run.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/OrgHierarchyDiagram.interaction.test.ts

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
npm error command sh -c rstest run src/OrgHierarchyDiagram.interaction.test.ts

FACT: Corrected RED command exit 1.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/OrgHierarchyDiagram.interaction.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:28:30.367Z"
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
    "tests": 5,
    "failedTests": 5,
    "passedTests": 0,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 800,
    "build": 191,
    "tests": 609
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

### [F01] src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: selection parity and additive state subscription with unsubscribe

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.interaction.test.ts' --testNamePattern 'facade interaction state > success: selection parity and additive state subscription with unsubscribe'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.interaction.test.ts",
  "project": "rstest",
  "fullName": "facade interaction state > success: selection parity and additive state subscription with unsubscribe",
  "status": "fail",
  "duration": 51,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "diagram.subscribeInteraction is not a function",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.interaction.test.ts",
        "line": 30,
        "column": 33,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.interaction.test.ts",
      "line": 30
    }
  ]
}
```

codeFrame (error 1):

```text
28 |     const diagram = await mount(selected);
29 |     const changed = rstest.fn();
30 |     const unsubscribe = diagram.subscribeInteraction(changed);
   |                                 ^
31 |     await diagram.select(a);
32 |     await diagram.select({ ...a });
```

### [F02] src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: a throwing subscriber cannot prevent selection or later subscribers

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.interaction.test.ts' --testNamePattern 'facade interaction state > failure: a throwing subscriber cannot prevent selection or later subscribers'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.interaction.test.ts",
  "project": "rstest",
  "fullName": "facade interaction state > failure: a throwing subscriber cannot prevent selection or later subscribers",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "Cannot read properties of undefined (reading 'matches')",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.ts",
        "line": 510,
        "column": 28,
        "method": "OrgHierarchyDiagram.create"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.interaction.test.ts",
      "line": 17
    },
    {
      "path": "src/OrgHierarchyDiagram.ts",
      "line": 510
    }
  ]
}
```

codeFrame (error 1):

```text
508 |     const reducedMotion = typeof window !== 'undefined'
509 |       && typeof window.matchMedia === 'function'
510 |       && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    |                            ^
511 |     const resolvedAnimate = resolveAnimate(config.animate, reducedMotion);
512 |     instance.animate = resolvedAnimate !== null;
```

### [F03] src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: unchanged data retains hover; disappearance clears stale hover

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.interaction.test.ts' --testNamePattern 'facade interaction state > success: unchanged data retains hover; disappearance clears stale hover'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.interaction.test.ts",
  "project": "rstest",
  "fullName": "facade interaction state > success: unchanged data retains hover; disappearance clears stale hover",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "Cannot read properties of undefined (reading 'matches')",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.ts",
        "line": 510,
        "column": 28,
        "method": "OrgHierarchyDiagram.create"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.interaction.test.ts",
      "line": 17
    },
    {
      "path": "src/OrgHierarchyDiagram.ts",
      "line": 510
    }
  ]
}
```

codeFrame (error 1):

```text
508 |     const reducedMotion = typeof window !== 'undefined'
509 |       && typeof window.matchMedia === 'function'
510 |       && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    |                            ^
511 |     const resolvedAnimate = resolveAnimate(config.animate, reducedMotion);
512 |     instance.animate = resolvedAnimate !== null;
```

### [F04] src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: an unknown ref is accepted then reconciled by kind, not bare id

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.interaction.test.ts' --testNamePattern 'facade interaction state > failure: an unknown ref is accepted then reconciled by kind, not bare id'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.interaction.test.ts",
  "project": "rstest",
  "fullName": "facade interaction state > failure: an unknown ref is accepted then reconciled by kind, not bare id",
  "status": "fail",
  "duration": 1,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "Cannot read properties of undefined (reading 'matches')",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.ts",
        "line": 510,
        "column": 28,
        "method": "OrgHierarchyDiagram.create"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.interaction.test.ts",
      "line": 17
    },
    {
      "path": "src/OrgHierarchyDiagram.ts",
      "line": 510
    }
  ]
}
```

codeFrame (error 1):

```text
508 |     const reducedMotion = typeof window !== 'undefined'
509 |       && typeof window.matchMedia === 'function'
510 |       && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    |                            ^
511 |     const resolvedAnimate = resolveAnimate(config.animate, reducedMotion);
512 |     instance.animate = resolvedAnimate !== null;
```

### [F05] src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: renderer shares hover and repaints changes without rebuilding the scene

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.interaction.test.ts' --testNamePattern 'facade interaction state > success: renderer shares hover and repaints changes without rebuilding the scene'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.interaction.test.ts",
  "project": "rstest",
  "fullName": "facade interaction state > success: renderer shares hover and repaints changes without rebuilding the scene",
  "status": "fail",
  "duration": 1,
  "retryCount": 0,
  "errors": [
    {
      "type": "Error",
      "message": "setInteractionSource does not exist",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.interaction.test.ts",
        "line": 85,
        "column": 20,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.interaction.test.ts",
      "line": 85
    }
  ]
}
```

codeFrame (error 1):

```text
83 | 
84 |   it('success: renderer shares hover and repaints changes without rebuilding the scene', async () => {
85 |     const source = rstest.spyOn(DiagramRenderer.prototype, 'setInteractionSource');
   |                    ^
86 |     const diagram = await mount();
87 |     const interaction = source.mock.calls[0]?.[0];
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/OrgHierarchyDiagram.interaction.test.ts

FACT: Authorized RED run exit 1.
NEXT: Inspect failures before implementation.

FACT: Fixed test matchMedia reset; supplied the planned renderer seam only in the test when D1-C is absent.
NEXT: Repeat RED for success and failure scenarios.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/OrgHierarchyDiagram.interaction.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:28:48.422Z"
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
    "tests": 5,
    "failedTests": 5,
    "passedTests": 0,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 669,
    "build": 103,
    "tests": 566
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

### [F01] src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: selection parity and additive state subscription with unsubscribe

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.interaction.test.ts' --testNamePattern 'facade interaction state > success: selection parity and additive state subscription with unsubscribe'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.interaction.test.ts",
  "project": "rstest",
  "fullName": "facade interaction state > success: selection parity and additive state subscription with unsubscribe",
  "status": "fail",
  "duration": 61,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "diagram.subscribeInteraction is not a function",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.interaction.test.ts",
        "line": 39,
        "column": 33,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.interaction.test.ts",
      "line": 39
    }
  ]
}
```

codeFrame (error 1):

```text
37 |     const diagram = await mount(selected);
38 |     const changed = rstest.fn();
39 |     const unsubscribe = diagram.subscribeInteraction(changed);
   |                                 ^
40 |     await diagram.select(a);
41 |     await diagram.select({ ...a });
```

### [F02] src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: a throwing subscriber cannot prevent selection or later subscribers

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.interaction.test.ts' --testNamePattern 'facade interaction state > failure: a throwing subscriber cannot prevent selection or later subscribers'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.interaction.test.ts",
  "project": "rstest",
  "fullName": "facade interaction state > failure: a throwing subscriber cannot prevent selection or later subscribers",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "diagram.subscribeInteraction is not a function",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.interaction.test.ts",
        "line": 63,
        "column": 13,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.interaction.test.ts",
      "line": 63
    }
  ]
}
```

codeFrame (error 1):

```text
61 |     const diagram = await mount(selected);
62 |     rstest.spyOn(console, 'warn').mockImplementation(() => {});
63 |     diagram.subscribeInteraction(() => { throw new Error('host failed'); });
   |             ^
64 |     const healthy = rstest.fn();
65 |     diagram.subscribeInteraction(healthy);
```

### [F03] src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: unchanged data retains hover; disappearance clears stale hover

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.interaction.test.ts' --testNamePattern 'facade interaction state > success: unchanged data retains hover; disappearance clears stale hover'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.interaction.test.ts",
  "project": "rstest",
  "fullName": "facade interaction state > success: unchanged data retains hover; disappearance clears stale hover",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "diagram.subscribeInteraction is not a function",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.interaction.test.ts",
        "line": 74,
        "column": 13,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.interaction.test.ts",
      "line": 74
    }
  ]
}
```

codeFrame (error 1):

```text
72 |     const diagram = await mount();
73 |     const changed = rstest.fn();
74 |     diagram.subscribeInteraction(changed);
   |             ^
75 |     diagram.setHovered(a);
76 |     await diagram.setData(data());
```

### [F04] src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: an unknown ref is accepted then reconciled by kind, not bare id

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.interaction.test.ts' --testNamePattern 'facade interaction state > failure: an unknown ref is accepted then reconciled by kind, not bare id'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.interaction.test.ts",
  "project": "rstest",
  "fullName": "facade interaction state > failure: an unknown ref is accepted then reconciled by kind, not bare id",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "diagram.subscribeInteraction is not a function",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.interaction.test.ts",
        "line": 86,
        "column": 13,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.interaction.test.ts",
      "line": 86
    }
  ]
}
```

codeFrame (error 1):

```text
84 |     const diagram = await mount();
85 |     const changed = rstest.fn();
86 |     diagram.subscribeInteraction(changed);
   |             ^
87 |     diagram.setHovered({ kind: 'position', id: 'a' });
88 |     await diagram.setData(data());
```

### [F05] src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: renderer shares hover and repaints changes without rebuilding the scene

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.interaction.test.ts' --testNamePattern 'facade interaction state > success: renderer shares hover and repaints changes without rebuilding the scene'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.interaction.test.ts",
  "project": "rstest",
  "fullName": "facade interaction state > success: renderer shares hover and repaints changes without rebuilding the scene",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected undefined to be truthy",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.interaction.test.ts",
        "line": 97,
        "column": 25,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.interaction.test.ts",
      "line": 97
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
95 |     const diagram = await mount();
96 |     const interaction = source.mock.calls[0]?.[0];
97 |     expect(interaction).toBeTruthy();
   |                         ^
98 |     const paint = rstest.spyOn(PixiHost.prototype, 'requestPaint');
99 |     const render = rstest.spyOn(DiagramRenderer.prototype, 'render');
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/OrgHierarchyDiagram.interaction.test.ts

FACT: Fixture-corrected RED exit 1.
FACT: Valid RED: all five tests failed on missing facade subscription or missing renderer-source installation, including the throwing-subscriber failure case.
FACT: Steps 1–3 implemented: InteractionStore delegates preserve the selection callback and promote notification; public subscription and hover setter forward directly.
FACT: Step 3b implemented: mount installs the planned renderer source; hover-only subscription requests existing paint and is released on destroy.
FACT: Step 4 implemented in shared data setter so every replacement reconciles hover using current kind/id membership.
FACT: Steps 5–6 implemented: USAGE documents both methods and InteractionState; barrel exports the type.
NEXT: Run own tests, SDK noEmit typecheck and lint. No renderer files modified.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/OrgHierarchyDiagram.interaction.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:29:20.864Z"
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
    "total": 739,
    "build": 198,
    "tests": 541
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

- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: selection parity and additive state subscription with unsubscribe
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: a throwing subscriber cannot prevent selection or later subscribers
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: unchanged data retains hover; disappearance clears stale hover
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: an unknown ref is accepted then reconciled by kind, not bare id
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: renderer shares hover and repaints changes without rebuilding the scene

### Skipped

None.

## Failures

No test failures reported.

FACT: GREEN attempt exit 0.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/OrgHierarchyDiagram.interaction.test.ts(94,60): error TS2345: Argument of type '"setInteractionSource"' is not assignable to parameter of type 'keyof DiagramRenderer'.
src/OrgHierarchyDiagram.interaction.test.ts(101,25): error TS2339: Property 'getHovered' does not exist on type 'string | Container<ContainerChild> | DiagramData | NodeRef | readonly string[] | readonly NodeRef[] | ResolvedAnimate | TransitionFrame | ViewportTransform'.
  Property 'getHovered' does not exist on type 'string'.
src/OrgHierarchyDiagram.interaction.test.ts(106,18): error TS2339: Property 'setHovered' does not exist on type 'string | Container<ContainerChild> | DiagramData | NodeRef | readonly string[] | readonly NodeRef[] | ResolvedAnimate | TransitionFrame | ViewportTransform'.
  Property 'setHovered' does not exist on type 'string'.
src/OrgHierarchyDiagram.interaction.test.ts(107,25): error TS2339: Property 'getHovered' does not exist on type 'string | Container<ContainerChild> | DiagramData | NodeRef | readonly string[] | readonly NodeRef[] | ResolvedAnimate | TransitionFrame | ViewportTransform'.
  Property 'getHovered' does not exist on type 'string'.
src/OrgHierarchyDiagram.ts(523,28): error TS2339: Property 'setInteractionSource' does not exist on type 'DiagramRenderer'.
src/OrgHierarchyDiagram.ts(525,20): error TS7006: Parameter 'ref' implicitly has an 'any' type.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

FACT: SDK noEmit typecheck exit 1.
NEXT: Inspect diagnostics.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: Lint exit 0.
NEXT: Inspect diagnostics.
FACT: Five own tests GREEN; lint PASS. SDK typecheck reports D1-C setInteractionSource missing and cascading inferred-type errors.
DECISION: Explicitly type the facade callback and the test's planned renderer seam, without suppressing the production missing-method diagnostic. This keeps the dependency visible and isolates facade tests from unfinished D1-C implementation.
NEXT: Recheck own tests and gates; record remaining dependency honestly.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/OrgHierarchyDiagram.ts(523,28): error TS2339: Property 'setInteractionSource' does not exist on type 'DiagramRenderer'.
src/render/staffRelated.test.ts(2,49): error TS2307: Cannot find module './staffRelated.js' or its corresponding type declarations.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

FACT: SDK noEmit recheck exit 1.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: Lint recheck exit 0.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/OrgHierarchyDiagram.interaction.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:30:00.996Z"
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
    "total": 600,
    "build": 110,
    "tests": 490
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

- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: selection parity and additive state subscription with unsubscribe
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: a throwing subscriber cannot prevent selection or later subscribers
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: unchanged data retains hover; disappearance clears stale hover
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: an unknown ref is accepted then reconciled by kind, not bare id
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: renderer shares hover and repaints changes without rebuilding the scene

### Skipped

None.

## Failures

No test failures reported.

FACT: Final own-test run exit 0.
NEXT: Final scope and documentation inspection.
FACT: Final own suite PASS 5/5; lint PASS; assigned-file diff whitespace check PASS. USAGE contains subscribeInteraction, setHovered and InteractionState; barrel exports InteractionState.
FACT: SDK noEmit remains blocked by D1-C: missing DiagramRenderer.setInteractionSource at the required facade call and missing render/staffRelated.js from D1-C's test. No other current diagnostics. Do not fix outside ownership.
FACT: Existing selection suites were not run because the brief explicitly permits only our own test file; parity is exercised in the new facade test. Real renderer integration and deployment remain NOT_TESTED; the renderer seam is a typed test double.
FACT: Only assigned source/docs/test files and this append-only working log were written. No build, emitting tsc, root typecheck, commit, push, branch/worktree change or external store used.
NEXT: Coordinator integrates D1-C and reruns SDK typecheck plus renderer integration checks.
FACT: Mandatory session-guard checkpoint attempt failed under sandbox; escalation was rejected by automatic approval review because the receipt writes outside the repository, contrary to the brief. No checkpoint created; no workaround attempted. Durable task evidence remains in this log.
STATUS: IMPLEMENTED — 5/5 own tests PASS; lint PASS; SDK typecheck BLOCKED on D1-C dependencies; external checkpoint rejected by automatic approval review.
