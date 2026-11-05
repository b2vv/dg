NEXT: Read required contracts and source, then add failing success and failure tests before implementation.
FACT: Read D1-A in full; confirmed feat/d1-interaction-store and existing unrelated changes. Read plan and inspected required contracts. Initial combined read exceeded output budget; required source/contracts are being read separately.
DECISION: Test only the authorized InteractionStore public seam. Follow the brief’s explicit success-and-failure RED-first order; change only the three assigned source files and append this log.
NEXT: Inspect selection behavior and listener precedent, then write acceptance tests.
FACT: Read selection implementation, listener-isolation precedent, TDD policy and owner GATE-1 decisions. sameNodeRef(null, null) is false, so null equality needs an explicit guard.
DECISION: Constructor uses optional { onSelectionChange }; selection delegates retain boolean return values. Each subscription gets a distinct entry; warning deduplication follows callback identity.
FACT: Added success and failure tests for rows 1–6, 10, 11, modifier parity, listener isolation, snapshot iteration and duplicate/idempotent subscriptions before production files.
NEXT: Run the authorized test command to establish RED.
FACT: RED command: npm test -w @org-hierarchy/sdk -- InteractionStore

> @org-hierarchy/sdk@1.1.1 test
> rstest run InteractionStore

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
npm error command sh -c rstest run InteractionStore

FACT: RED command exit code: 1
FACT: Initial RED attempt was blocked by rstest listen EPERM, not a test failure.
NEXT: Retry the identical test command with permission to bind the local test port.

> @org-hierarchy/sdk@1.1.1 test
> rstest run InteractionStore

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:20:02.019Z"
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
    "total": 569,
    "build": 102,
    "tests": 467
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

### [F01] src/state/InteractionStore.test.ts

repro:

```bash
npx rstest 'src/state/InteractionStore.test.ts'
```

details:

```json
{
  "testPath": "src/state/InteractionStore.test.ts",
  "project": "rstest",
  "fullName": "",
  "status": "fail",
  "retryCount": 0,
  "errors": [
    {
      "type": "Error",
      "message": "Cannot find module './InteractionStore.js'",
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
npm error command sh -c rstest run InteractionStore

FACT: RED retry exit code: 1
FACT: RED retry exited 1 because InteractionStore did not exist. Success and failure test definitions preceded production code; collection failed at the missing feature module (no behavioral mutation claim).
FACT: Implemented the readonly state type and pure store with internal SelectionStore composition, selection notifications, value-based hover updates, predicate reconciliation, distinct subscription entries and snapshot listener isolation.
NEXT: Run InteractionStore tests, SDK noEmit typecheck and lint; preserve full command output.
FACT: GREEN command: npm test -w @org-hierarchy/sdk -- InteractionStore

> @org-hierarchy/sdk@1.1.1 test
> rstest run InteractionStore

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:20:31.730Z"
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
    "tests": 12,
    "failedTests": 0,
    "passedTests": 12,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 499,
    "build": 101,
    "tests": 398
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

- src/state/InteractionStore.test.ts :: InteractionStore > success: selection changes notify both channels with the new snapshot
- src/state/InteractionStore.test.ts :: InteractionStore > success: pointer modifiers toggle membership: {"ctrlKey":true,"metaKey":false,"shiftKey":false}
- src/state/InteractionStore.test.ts :: InteractionStore > success: pointer modifiers toggle membership: {"ctrlKey":false,"metaKey":true,"shiftKey":false}
- src/state/InteractionStore.test.ts :: InteractionStore > success: pointer modifiers toggle membership: {"ctrlKey":false,"metaKey":false,"shiftKey":true}
- src/state/InteractionStore.test.ts :: InteractionStore > success: clear notifies once and preserves hover
- src/state/InteractionStore.test.ts :: InteractionStore > success: replaceMany deduplicates while preserving selection order
- src/state/InteractionStore.test.ts :: InteractionStore > success: arbitrary hover refs and null notify only interaction listeners
- src/state/InteractionStore.test.ts :: InteractionStore > failure: unchanged selection and hover emit nothing, including empty state
- src/state/InteractionStore.test.ts :: InteractionStore > failure: reconcile clears a stale hover once without changing selection
- src/state/InteractionStore.test.ts :: InteractionStore > failure: throwing listeners are isolated and each warns only once
- src/state/InteractionStore.test.ts :: InteractionStore > failure: unsubscribe during emit keeps the current listener snapshot
- src/state/InteractionStore.test.ts :: InteractionStore > failure: duplicate subscriptions are distinct and disposal is idempotent

### Skipped

None.

## Failures

No test failures reported.

FACT: GREEN command exit code: 0
FACT: InteractionStore GREEN command passed (exit 0).
FACT: Validation command: npm run typecheck -w @org-hierarchy/sdk

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


FACT: SDK typecheck exit code: 0
FACT: Validation command: npm run lint

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: Lint exit code: 0
FACT: All 12 InteractionStore tests passed; SDK noEmit typecheck and repository lint both passed with exit 0. Full outputs are recorded above without pipes.
FACT: Final scope check found exactly the three assigned new source files. SelectionStore.ts and interaction/selection.ts have no diff; unrelated pre-existing changes remain untouched.
FACT: No build, root typecheck, build:types, emitting tsc, branch switch, worktree, commit, push or external checkpoint/store was used.
DECISION: D1-A is complete at its pure-store seam. Facade, barrel, renderer and demo integration remain assigned to later briefs; no integration or deployment claim is made.
NEXT: Coordinator can consume InteractionStore with optional { onSelectionChange } and the exported InteractionState type from their assigned modules.
STATUS: DONE — D1-A; 12 tests GREEN; SDK typecheck PASS; lint PASS.
