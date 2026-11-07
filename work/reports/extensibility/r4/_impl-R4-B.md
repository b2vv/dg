NEXT: Inspect the facade-to-Viewport path and existing test harness, then write RED tests.
STEP 1 — READ: Read R4-B in full, R4 plan/spec, wheelConfig and Viewport entry-point references, project standards and briefing. Branch is feat/extensibility. Existing R4-A and unrelated working changes are preserved. Only the four assigned files and this append-only log will be written. No builds, emitting compiler, branch changes, commits, pushes, external stores, or unrelated tests.

NEXT: Resolve the missing PixiHost forwarding seam before RED/implementation.
STEP 2 — INSPECTION: Read Viewport.ts in full, PixiHost.ts in full, the facade create path, barrel, and USAGE configuration/zoom references. R4-A exposes wheel only as constructor input ViewportOptions.wheel; the resolved field is private readonly and there is no setter. OrgHierarchyDiagram.create calls PixiHost.create(container, { renderer: config.renderer }). PixiHostOptions has neither wheel nor wheelIntensity nor nested viewport options; PixiHost.init constructs the private Viewport with only minScale and maxScale. DiagramRenderer exposes no alternate wheel/mount forwarding seam. Therefore passing wheel from the assigned facade cannot reach the Viewport through the existing supported API.
QUESTION: May R4-B also modify packages/sdk/src/render/PixiHost.ts to add wheel?: WheelConfig to PixiHostOptions and forward options.wheel into new Viewport, or should R4-A supply this missing seam first? The brief limits writes to four files excluding PixiHost.ts and explicitly requires QUESTION+stop when no usable plumbing path exists. No production files or tests were changed; no test/check commands ran, so there is no test output to report. External checkpoint storage was not used under the brief's no-external-store prohibition.
STATUS: QUESTION — blocked by missing PixiHost wheel forwarding outside the assigned file scope.

NEXT: Write and run the facade wheel RED test.
STEP 3 — AUTHORIZED: User explicitly added PixiHost.ts for WheelConfig type import, wheel option, and constructor forwarding only. Agreed test seams remain facade creation through the real PixiHost/Viewport and the public type barrel. Existing R4-A changes are read-only. Tests use the existing jsdom canvas harness; no browser/GPU integration claim.

NEXT: Implement the authorized forwarding and type exports.
STEP 4 — RED: Initial sandbox test failed to start (listen EPERM ::1:3000); reran with the permission explicitly allowed by the brief. Runtime test now fails because PixiHost receives undefined instead of the requested wheel config. Typecheck output below verifies the missing public types/options before implementation.

COMMAND: npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram.wheel
EXIT: 1
````text

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.wheel

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T00:06:14.954Z"
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
    "tests": 1,
    "failedTests": 1,
    "passedTests": 0,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 858,
    "build": 207,
    "tests": 651
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

### [F01] src/OrgHierarchyDiagram.wheel.test.ts :: facade wheel configuration > forwards public wheel config through PixiHost to the mounted Viewport

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.wheel.test.ts' --testNamePattern 'facade wheel configuration > forwards public wheel config through PixiHost to the mounted Viewport'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.wheel.test.ts",
  "project": "rstest",
  "fullName": "facade wheel configuration > forwards public wheel config through PixiHost to the mounted Viewport",
  "status": "fail",
  "duration": 59,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected undefined to be { Object (behavior, gestures) } // Object.is equality",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.wheel.test.ts",
        "line": 32,
        "column": 46,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.wheel.test.ts",
      "line": 32
    }
  ]
}
```

diff:

```diff
- Expected:
{
  "behavior": "zoom",
  "gestures": {
    "panHorizontal": "shift",
  },
}

+ Received:
undefined
```

codeFrame (error 1):

```text
30 |     const wheel: WheelConfig = { behavior, gestures: { panHorizontal: 'shift' } };
31 |     const { diagram, canvas } = await mount(wheel);
32 |     expect(create.mock.calls[0]?.[1]?.wheel).toBe(wheel);
   |                                              ^
33 |     canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }));
34 |     expect(diagram.getZoom()).toBeGreaterThan(1);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.wheel

````
COMMAND: npm run typecheck -w @org-hierarchy/sdk
EXIT: 1
````text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/OrgHierarchyDiagram.wheel.test.ts(4,15): error TS2305: Module '"./index.js"' has no exported member 'WheelBehavior'.
src/OrgHierarchyDiagram.wheel.test.ts(4,30): error TS2305: Module '"./index.js"' has no exported member 'WheelConfig'.
src/OrgHierarchyDiagram.wheel.test.ts(16,5): error TS2353: Object literal may only specify known properties, and 'wheel' does not exist in type 'OrgHierarchyConfig<DiagramData>'.
src/OrgHierarchyDiagram.wheel.test.ts(32,39): error TS2339: Property 'wheel' does not exist on type 'PixiHostOptions'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

````

NEXT: Run GREEN for the forwarding slice, then cover omitted configuration.
STEP 5 — IMPLEMENT: Added facade WheelConfig option, unchanged raw forwarding through PixiHost.create and new Viewport, and type-only barrel exports. PixiHost changes are exactly the approved import, option, and forwarding line.

NEXT: Run final own-test, SDK noEmit typecheck, and lint checks.
STEP 6 — COVERAGE/DOCS: Forwarding slice passed (1/1). Added omitted-config default coverage (ordinary pan, unhandled Shift, Ctrl zoom) and pan-only negative zoom coverage through real facade/PixiHost/Viewport using the existing mocked canvas harness. Added USAGE contract, defaults, Mac priority/pinch, keyboard shortcuts, host hint responsibility, and explicit Shift default change. Public type imports are checked by SDK noEmit typecheck.

NEXT: Inspect the final scoped diff and record completion.
STEP 7 — VALIDATION: Full unfiltered outputs follow (commands run without pipes).

COMMAND: npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram.wheel
EXIT: 1
````text

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.wheel

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T00:07:11.988Z"
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
    "failedTests": 2,
    "passedTests": 1,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 871,
    "build": 244,
    "tests": 627
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

### [F01] src/OrgHierarchyDiagram.wheel.test.ts :: facade wheel configuration > honors pan-only configuration instead of falling back to modifier zoom

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.wheel.test.ts' --testNamePattern 'facade wheel configuration > honors pan-only configuration instead of falling back to modifier zoom'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.wheel.test.ts",
  "project": "rstest",
  "fullName": "facade wheel configuration > honors pan-only configuration instead of falling back to modifier zoom",
  "status": "fail",
  "duration": 46,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "Cannot read properties of undefined (reading 'matches')",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.ts",
        "line": 551,
        "column": 28,
        "method": "OrgHierarchyDiagram.create"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.wheel.test.ts",
      "line": 18
    },
    {
      "path": "src/OrgHierarchyDiagram.ts",
      "line": 551
    }
  ]
}
```

codeFrame (error 1):

```text
549 |     const reducedMotion = typeof window !== 'undefined'
550 |       && typeof window.matchMedia === 'function'
551 |       && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    |                            ^
552 |     const resolvedAnimate = resolveAnimate(config.animate, reducedMotion);
553 |     instance.animate = resolvedAnimate !== null;
```

### [F02] src/OrgHierarchyDiagram.wheel.test.ts :: facade wheel configuration > forwards public wheel config through PixiHost to the mounted Viewport

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.wheel.test.ts' --testNamePattern 'facade wheel configuration > forwards public wheel config through PixiHost to the mounted Viewport'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.wheel.test.ts",
  "project": "rstest",
  "fullName": "facade wheel configuration > forwards public wheel config through PixiHost to the mounted Viewport",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "Cannot read properties of undefined (reading 'matches')",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.ts",
        "line": 551,
        "column": 28,
        "method": "OrgHierarchyDiagram.create"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.wheel.test.ts",
      "line": 18
    },
    {
      "path": "src/OrgHierarchyDiagram.ts",
      "line": 551
    }
  ]
}
```

codeFrame (error 1):

```text
549 |     const reducedMotion = typeof window !== 'undefined'
550 |       && typeof window.matchMedia === 'function'
551 |       && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    |                            ^
552 |     const resolvedAnimate = resolveAnimate(config.animate, reducedMotion);
553 |     instance.animate = resolvedAnimate !== null;
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.wheel

````

COMMAND: npm run typecheck -w @org-hierarchy/sdk
EXIT: 0
````text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


````

COMMAND: npm run lint
EXIT: 0
````text

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


````

NEXT: Re-run checks after correcting test isolation.
STEP 8 — HARNESS FIX: restoreAllMocks clears the shared matchMedia stub after the first test. Reinstall its return value in beforeEach, matching the adjacent facade marquee harness. The two failures above are harness failures, not wheel-contract failures. SDK typecheck and lint passed. No production change required.

NEXT: Finish scoped audit and report status.
STEP 9 — FINAL CHECKS:

COMMAND: npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram.wheel
EXIT: 0
````text

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.wheel

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T00:07:31.165Z"
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
    "total": 789,
    "build": 277,
    "tests": 512
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

- src/OrgHierarchyDiagram.wheel.test.ts :: facade wheel configuration > leaves omitted wheel config undefined and preserves Viewport defaults
- src/OrgHierarchyDiagram.wheel.test.ts :: facade wheel configuration > honors pan-only configuration instead of falling back to modifier zoom
- src/OrgHierarchyDiagram.wheel.test.ts :: facade wheel configuration > forwards public wheel config through PixiHost to the mounted Viewport

### Skipped

None.

## Failures

No test failures reported.

````

COMMAND: npm run typecheck -w @org-hierarchy/sdk
EXIT: 0
````text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


````

COMMAND: npm run lint
EXIT: 0
````text

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


````

NEXT: R4-B is ready for the parent integration/review step.
STEP 10 — EARLIER RAW OUTPUTS: Retained below for completeness; neither command used pipes.

COMMAND: npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram.wheel (initial sandbox attempt)
EXIT: 1
````text

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.wheel

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
npm error command sh -c rstest run OrgHierarchyDiagram.wheel
````

COMMAND: npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram.wheel (first forwarding GREEN)
EXIT: 0
````text

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.wheel

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T00:06:40.380Z"
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
    "tests": 1,
    "failedTests": 0,
    "passedTests": 1,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 637,
    "build": 157,
    "tests": 480
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

- src/OrgHierarchyDiagram.wheel.test.ts :: facade wheel configuration > forwards public wheel config through PixiHost to the mounted Viewport

### Skipped

None.

## Failures

No test failures reported.
````

STEP 11 — COMPLETION:
- DONE: config.wheel -> PixiHostOptions.wheel -> Viewport, public WheelConfig/WheelBehavior exports, and USAGE gesture contract.
- TESTED: Three facade tests pass through real PixiHost/Viewport with mocked canvas APIs. SDK noEmit typecheck and repository lint pass. git diff --check passed. No unrelated tests, builds, root typecheck, emitting tsc, commits, pushes, or branch changes.
- FINDINGS: Existing restoreAllMocks resets matchMedia; the new test reinstalls it per case. R4-A and all unrelated working changes were preserved. PixiHost diff is exactly three additive lines.
- SCREENSHOTS: N/A; forwarding has no new visual UI.
- FLOW: Host passes wheel at create; unmodified config reaches the Viewport; real canvas wheel events prove zoom-only, pan-only, opt-in Shift pan, and omitted-config defaults. Imported public types are checked by noEmit compilation.
- LIMITS / POST-DEPLOY: Browser/GPU validation, deployment, and independent review were not performed. Disposable mutation runs were not performed under the exclusive file scope; RED runtime evidence covers missing facade forwarding and RED compilation covers absent public exports/options. No external checkpoint store was used under the explicit task prohibition; this append-only file is the durable in-repo record. No check:docs command was run (no push); the requested USAGE additions are present.
STATUS: DONE — R4-B implemented within approved scope; 3/3 tests, SDK noEmit typecheck, and lint pass.
