NEXT: Read required setup, project constraints, and current worktree state; create only the assigned integration test.
FACT: Read the full brief, renderer/facade test patterns and standards manifest; existing worktree changes belong to other tasks.
DECISION: Only the assigned new test and this append-only log will be written; no builds, production edits, commits or external stores.
NEXT: Inspect the real overlay and staff fixture setup before wiring the integration test.
FACT: Current branch feat/d3-transitions at 4cc6b55a3b72b047fd7cf9c631ccefb4c2ac102c; setup supplies browser canvas stubs and real WASM. Real PixiHost independently schedules paint rAFs.
DECISION: READY for the narrow test-only scope; adapt the existing facade mount/fixture to a root with a branching head and sibling, use actual overlay, and compare against an opt-out renderer. No production seam mocks. Direct source inspection suffices; no new architecture or public contract.
NEXT: Create one integration scenario and run the assigned test, retaining complete output here.
FACT: Created the assigned single integration test; all four layers remain real and only clock/rAF and reduced-motion browser input are controlled.
NEXT: Run the isolated integration test; stop if a real seam assertion fails.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/OrgHierarchyDiagram.transitions.e2e.test.ts

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
npm error command sh -c rstest run src/OrgHierarchyDiagram.transitions.e2e.test.ts

FACT: Integration test exit code 1.
FACT: Rstest was blocked by listen EPERM on ::1:3000 before executing tests.
NEXT: Rerun with required sandbox permission as explicitly directed by the brief.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/OrgHierarchyDiagram.transitions.e2e.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T18:23:56.148Z"
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
    "total": 760,
    "build": 157,
    "tests": 603
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

### [F01] src/OrgHierarchyDiagram.transitions.e2e.test.ts :: carries a staff collapse through the real facade, Pixi controller and React overlay, then stays idle

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.e2e.test.ts' --testNamePattern 'carries a staff collapse through the real facade, Pixi controller and React overlay, then stays idle'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.e2e.test.ts",
  "project": "rstest",
  "fullName": "carries a staff collapse through the real facade, Pixi controller and React overlay, then stays idle",
  "status": "fail",
  "duration": 79,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"requestAnimationFrame\" to not be called at all, but actually been called 1 times\n\nReceived:\n\n  1st requestAnimationFrame call:\n\n    Array [\n      [Function anonymous],\n    ]\n\n\nNumber of calls: 1\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.e2e.test.ts",
        "line": 71,
        "column": 23,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.e2e.test.ts",
      "line": 71
    }
  ]
}
```

codeFrame (error 1):

```text
69 |   request.mockClear();
70 |   step();
71 |   expect(request).not.toHaveBeenCalled();
   |                       ^
72 | 
73 |   diagram.setViewport({ x: 0, y: 0, scale: 1 });
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/OrgHierarchyDiagram.transitions.e2e.test.ts

FACT: Integration test permitted retry exit code 1.
FACT: The first run reached a real diagram but an rAF remained after two frames; the transition frame was null.
DECISION: Initial setup must be allowed to settle as the brief requests. Add a bounded 60-frame initial drain, asserting no transition throughout, and capture rAF call origins in the injected clock for exact diagnosis. No production behavior is replaced.
NEXT: Rerun to distinguish setup settling from persistent idle work.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/OrgHierarchyDiagram.transitions.e2e.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T18:24:34.557Z"
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
    "total": 855,
    "build": 196,
    "tests": 659
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

### [F01] src/OrgHierarchyDiagram.transitions.e2e.test.ts :: carries a staff collapse through the real facade, Pixi controller and React overlay, then stays idle

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.e2e.test.ts' --testNamePattern 'carries a staff collapse through the real facade, Pixi controller and React overlay, then stays idle'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.e2e.test.ts",
  "project": "rstest",
  "fullName": "carries a staff collapse through the real facade, Pixi controller and React overlay, then stays idle",
  "status": "fail",
  "duration": 154,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "Error: rAF requested\n    at /Users/strelia/projects/dg/packages/sdk/src/OrgHierarchyDiagram.transitions.e2e.test.ts:43:25\n    at willCall (file:///Users/strelia/projects/dg/node_modules/@rstest/core/dist/api%7E0.js:6948:26)\n    at bound  (file:///Users/strelia/projects/dg/node_modules/@rstest/core/dist/api%7E0.js:6749:84)\n    at callback (/Users/strelia/projects/dg/node_modules/pixi.js/lib/ticker/Ticker.mjs:128:1)\n    at /Users/strelia/projects/dg/packages/sdk/src/OrgHierarchyDiagram.transitions.e2e.test.ts:54:37\n    at Array.forEach (<anonymous>)\n    at /Users/strelia/projects/dg/packages/sdk/src/OrgHierarchyDiagram.transitions.e2e.test.ts:54:15\n    at act (/Users/strelia/projects/dg/node_modules/react/cjs/react.development.js:814:1)\n    at step (/Users/strelia/projects/dg/packages/sdk/src/OrgHierarchyDiagram.transitions.e2e.test.ts:50:32)\n    at /Users/strelia/projects/dg/packages/sdk/src/OrgHierarchyDiagram.transitions.e2e.test.ts:76:3: expected \"requestAnimationFrame\" to not be called at all, but actually been called 1 times\n\nReceived:\n\n  1st requestAnimationFrame call:\n\n    Array [\n      [Function anonymous],\n    ]\n\n\nNumber of calls: 1\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.e2e.test.ts",
        "line": 43,
        "column": 25,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.e2e.test.ts",
      "line": 43
    }
  ]
}
```

codeFrame (error 1):

```text
41 |   rstest.spyOn(performance, 'now').mockImplementation(() => now);
42 |   const request = rstest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
43 |     requestOrigins.push(new Error('rAF requested').stack ?? 'No stack');
   |                         ^
44 |     pending.set(++serial, callback);
45 |     return serial;
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/OrgHierarchyDiagram.transitions.e2e.test.ts

FACT: Diagnostic integration test exit code 1.
FACT: After 60 initial frames, the transition remains null but Pixi Ticker requests another rAF on every step. The diagnostic stack identifies node_modules/pixi.js/lib/ticker/Ticker.mjs:128.
QUESTION: The required zero-rAF contract in packages/sdk/src/OrgHierarchyDiagram.transitions.e2e.test.ts:77 cannot hold against the real mounted host: packages/sdk/src/render/PixiHost.ts:309-311 and :323 disable only the application ticker, while node_modules/pixi.js/lib/ticker/Ticker.mjs:128 continues scheduling. Coordinator must resolve the real-host idle contract or clarify whether the assertion excludes Pixi system event ticks. No ticker suppression or rAF filtering has been added.
DECISION: Stop integration implementation at this real boundary mismatch as required. Motion, overlay, parity and unchanged-tree assertions remain unexecuted; no claim of green.
NEXT: Capture the required static gate output without changing production or weakening the failing assertion.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


FACT: SDK noEmit typecheck exit code 0.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0

packages/sdk/src/OrgHierarchyDiagram.transitions.e2e.test.ts:32:10: error unicorn(explicit-length-check): Use `.length > 0` when checking length is not zero. help: Replace `cleanups.length` with `cleanups.length > 0`.
packages/sdk/src/OrgHierarchyDiagram.transitions.e2e.test.ts:70:37: error unicorn(explicit-length-check): Use `.size > 0` when checking size is not zero. help: Replace `pending.size` with `pending.size > 0`.
packages/sdk/src/OrgHierarchyDiagram.transitions.e2e.test.ts:97:16: error eslint(no-negated-condition): Unexpected negated condition. help: Remove the negation operator and switch the consequent and alternate branches.
packages/sdk/src/OrgHierarchyDiagram.transitions.e2e.test.ts:97:16: error unicorn(no-negated-condition): Unexpected negated condition. help: Remove the negation operator and switch the consequent and alternate branches.

FACT: Lint exit code 1.
FACT: SDK noEmit typecheck passed; lint found only explicit-length and conditional-style violations in the new test.
DECISION: Correct those test-only lint violations without changing the failing assertion or production code. Integration remains blocked.
NEXT: Recheck static gates and leave the recorded integration failure for the coordinator.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


FACT: Final SDK noEmit typecheck exit code 0.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: Final lint exit code 0.
FACT: Final SDK noEmit typecheck and lint both passed (exit 0). Integration remains RED; later assertions have not executed.
FACT: Pixi event subscription is node_modules/pixi.js/lib/events/EventTicker.mjs:39; recurring scheduling is node_modules/pixi.js/lib/ticker/Ticker.mjs:128, despite packages/sdk/src/render/PixiHost.ts:323 stopping the application ticker.
FACT: Required native checkpoint attempt failed with exit 1: mktemp could not create manual-selection under the registered receipts directory (Operation not permitted). No successful external checkpoint is claimed; this repository log remains the durable record.
NEXT: Coordinator resolves the recorded zero-rAF contract mismatch before resuming this test; no production fixes or assertion weakening were made.
STATUS: BLOCKED — real Pixi system ticker violates zero-rAF assertion; SDK typecheck and lint PASS.
NEXT: Resume T-F using the resolved D3-specific idle contract; replace only idle instrumentation in the owned test.
FACT: Read both T-F briefs in full. Ambient Pixi EventTicker scheduling is explicitly allowed and out of scope.
DECISION: Count transition promote-sync emissions, retain null-frame and stable-card checks across extra clock steps, and preserve interpolation, overlay, settle ordering and reference parity assertions.
FACT: Replaced global idle-rAF assertions with D3 transition counts and five extra 200ms steps checking null frames and stable Pixi coordinates; initial render also asserts zero transition signals. Other scenario assertions are retained.
NEXT: Run the isolated T-F integration test and append its complete output.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/OrgHierarchyDiagram.transitions.e2e.test.ts

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
npm error command sh -c rstest run src/OrgHierarchyDiagram.transitions.e2e.test.ts

FACT: Resumed integration test exit code 1.
FACT: Rstest could not listen on ::1:3000 under the sandbox.
NEXT: Retry with the required permission, as directed by the brief.

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/OrgHierarchyDiagram.transitions.e2e.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T19:41:04.472Z"
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
    "total": 811,
    "build": 182,
    "tests": 629
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

### [F01] src/OrgHierarchyDiagram.transitions.e2e.test.ts :: carries a staff collapse through the real facade, Pixi controller and React overlay, then stays idle

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.transitions.e2e.test.ts' --testNamePattern 'carries a staff collapse through the real facade, Pixi controller and React overlay, then stays idle'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.transitions.e2e.test.ts",
  "project": "rstest",
  "fullName": "carries a staff collapse through the real facade, Pixi controller and React overlay, then stays idle",
  "status": "fail",
  "duration": 104,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected null not to be null",
      "expected": "null",
      "actual": "null",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.transitions.e2e.test.ts",
        "line": 100,
        "column": 20,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.transitions.e2e.test.ts",
      "line": 100
    }
  ]
}
```

codeFrame (error 1):

```text
 98 |   expect(diagram.getTransitionFrame()).not.toBeNull();
 99 |   const slot = mount.querySelector<HTMLElement>('[data-promote-slot="sibling"]');
100 |   expect(slot).not.toBeNull();
    |                    ^
101 |   const beforeTransform = slot?.style.transform;
102 |   step(34);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run src/OrgHierarchyDiagram.transitions.e2e.test.ts

FACT: Permitted integration retry exit code 1.
FACT: The permitted run now passes initial no-transition, moving-target/start-position, rAF scheduling and active transition-frame assertions, then fails at the previously unexecuted overlay slot assertion (test line 100: sibling slot is null). All complete runner output is above.
NEXT: Inspect the overlay eligibility boundary without changing the fixture or production code; run the two required static checks.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


FACT: Resumed SDK noEmit typecheck exit code 0.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: Resumed lint exit code 0.
QUESTION: The preserved overlay assertion queries the bare id [data-promote-slot="sibling"] at packages/sdk/src/OrgHierarchyDiagram.transitions.e2e.test.ts:99-100, but the real facade returns candidate.id = box.id at packages/sdk/src/OrgHierarchyDiagram.ts:2174-2179; createReactPromoteOverlay.ts:476-477 copies candidate.id into the slot and :226 emits that id as data-promote-slot. The test itself treats position box ids as prefixed (test :133 strips "position:"). This is a different test-to-overlay identifier mismatch, not evidence of a production transition defect. May the test selector be corrected beyond the resume brief's explicit "fix ONLY that assertion" scope?
DECISION: Stop without changing the overlay assertion or production code. Do not claim the later interpolation, settle, parity, idle or unchanged-tree checks passed; execution stopped at line 100.
FACT: SDK noEmit typecheck and lint both passed with exit 0; complete output is appended above. Only the assigned test and this log were written by this task.
FACT: Required native checkpoint attempt exited 1: mktemp could not create manual-selection under the registered receipts directory (Operation not permitted). No successful external checkpoint is claimed.
NEXT: Coordinator resolves the bare-id versus prefixed-slot selector question; then rerun the isolated test and required static checks.
STATUS: BLOCKED — overlay selector identifier mismatch at test line 100; SDK typecheck and lint PASS.

NEXT: Apply the coordinator-approved selector correction and rerun the isolated real-stack test.
FACT: Resume2 answers the previous QUESTION; branch feat/d3-transitions, HEAD 4cc6b55a3b72b047fd7cf9c631ccefb4c2ac102c. Existing wave-2 WIP remains outside this writer scope.
DECISION: READY, resume route, owner T-F coder. Only the assigned test and this append-only log may change. Overlay :226 emits slot.id and :479 takes candidate.id; use position:sibling. No behavioral assertion or production change. Additional planning/architecture review is N/A for this identifier typo; direct source inspection suffices.
FACT: Corrected the single overlay selector; all behavioral assertions retained verbatim.
NEXT: Run the isolated integration test, preserving complete stdout/stderr below.

FACT: Command: npm test -w @org-hierarchy/sdk -- src/OrgHierarchyDiagram.transitions.e2e.test.ts
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/OrgHierarchyDiagram.transitions.e2e.test.ts

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
npm error command sh -c rstest run src/OrgHierarchyDiagram.transitions.e2e.test.ts

```
FACT: Exit code 1.

DECISION: Retry with the required listen permission as explicitly authorized after EPERM.
FACT: Command: npm test -w @org-hierarchy/sdk -- src/OrgHierarchyDiagram.transitions.e2e.test.ts
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run src/OrgHierarchyDiagram.transitions.e2e.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T19:44:26.250Z"
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
    "total": 809,
    "build": 191,
    "tests": 618
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

- src/OrgHierarchyDiagram.transitions.e2e.test.ts :: carries a staff collapse through the real facade, Pixi controller and React overlay, then stays idle

### Skipped

None.

## Failures

No test failures reported.

```
FACT: Exit code 0.

FACT: Real-stack integration PASS: first-render snap; intermediate Pixi and overlay motion; transition then structural; all-card ±0.5px opt-out parity; settled D3 idle; unchanged-tree zero new transition frames.
NEXT: Run SDK noEmit typecheck and lint.

FACT: Command: npm run typecheck -w @org-hierarchy/sdk
```text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


```
FACT: Exit code 0.

FACT: Command: npm run lint
```text

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


```
FACT: Exit code 0.

FACT: Required native checkpoint attempt used current codex/root/session and the registered manual.sh path; exit 1, mktemp Operation not permitted in registered receipts. No successful checkpoint is claimed; no external-store escalation attempted. Repository evidence is preserved here.
FACT: Final author verification: the sole test-source edit in this resume is sibling → position:sibling in the overlay selector. All assertions remain, and all three required commands passed. No production source, other tests, configuration, build output, branch, commit or push was changed by this resume.
DECISION: T-F acceptance complete against the current real wave-2 stack. Independent wave review and deployment are outside this assigned test task; no independent review or deployed validation is claimed.
NEXT: Coordinator can consume the passing test and complete output above.
STATUS: DONE — T-F real-stack test, SDK noEmit typecheck and lint PASS.
