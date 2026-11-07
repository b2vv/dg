NEXT: Inspect demo construction and test seams; write and run the failing focused test.

STEP 1 — READ / SCOPE
Read the complete assigned brief, R2 spec and plan (including section 4). Only App.ts overlay wiring, one demo test, and this append-only log may change. Existing SDK/core edits belong to concurrent coders. Public primitives exist with the requested names. No build, root typecheck, emitting tsc, commits, branch changes, or external store will be used. Initial broad context output was truncated; relevant context will be read in bounded sections before implementation.

STEP 2 — CONTRACT / PRE-CODE
Verified exact public isSelected/isHovered/subscribeInteraction/selectNode/setHovered signatures and the optional overlay interaction contract. DemoPromoteCard forwards PromoteSlotProps unchanged to DefaultPromoteCard; no styling changes required by the brief's minimum. Agreed test seam is App.init construction and real overlay props/actions backed by public diagram state. Use an empty real diagram and a single synthetic promote candidate to avoid scene/layout cost. TDD skill applied; no additional scope or approval needed. Read applicable TS standards and behavior coverage reference. No production changes yet.
NEXT: Add focused demo integration test and capture RED output verbatim.

STEP 3 — TEST WRITTEN
Added App.interaction.test.ts. It initializes App through its public entrypoint, wraps the real overlay to observe card props, and uses a real empty SDK diagram with one stubbed geometric candidate. Checks construction seam, modifier forwarding/toggle, external selection, hover enter/leave, and same-id/different-kind isolation. Production wiring is still absent.
NEXT: Run only App.interaction.test.ts for RED.

STEP 4 — RED ATTEMPT / ENVIRONMENT
Command: npm test -w @org-hierarchy/demo -- src/app/App.interaction.test.ts
Exit: 1 (listen EPERM; no test executed). Full output:
```

> @org-hierarchy/demo@0.1.0 test
> rstest run src/app/App.interaction.test.ts

error   Failed to run Rstest.
error   listen EPERM: operation not permitted ::1:3000
    at Server.setupListenHandle [as _listen2] (node:net:1918:21)
    at listenInCluster (node:net:1997:12)
    at GetAddrInfoReqWrap.callback (node:net:2206:7)
    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:134:8)
npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/demo
npm error workspace @org-hierarchy/demo@0.1.0
npm error location /Users/strelia/projects/dg/packages/demo
npm error command failed
npm error command sh -c rstest run src/app/App.interaction.test.ts
```
NEXT: Rerun the same test with permission to bind the local runner port, as instructed.

STEP 5 — RED CONFIRMED
Command: npm test -w @org-hierarchy/demo -- src/app/App.interaction.test.ts
Exit: 1. Expected behavioral failure: App constructed the overlay without interaction (line 56); test setup reached the real construction site.
Full output:
~~~~text

> @org-hierarchy/demo@0.1.0 test
> rstest run src/app/App.interaction.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T05:09:11.858Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/demo"}
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
    "total": 860,
    "build": 191,
    "tests": 669
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

### [F01] src/app/App.interaction.test.ts :: connects demo card selection and hover to the diagram interaction state

repro:

```bash
npx rstest 'src/app/App.interaction.test.ts' --testNamePattern 'connects demo card selection and hover to the diagram interaction state'
```

details:

```json
{
  "testPath": "src/app/App.interaction.test.ts",
  "project": "rstest",
  "fullName": "connects demo card selection and hover to the diagram interaction state",
  "status": "fail",
  "duration": 105,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected undefined to be defined",
      "topFrame": {
        "file": "src/app/App.interaction.test.ts",
        "line": 56,
        "column": 55,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/app/App.interaction.test.ts",
      "line": 56
    }
  ]
}
```

codeFrame (error 1):

```text
54 |   await act(async () => { await new App().init(); });
55 |   expect(construction).toHaveBeenCalledTimes(1);
56 |   expect(construction.mock.calls[0]?.[0].interaction).toBeDefined();
   |                                                       ^
57 |   expect(card).toBeDefined();
58 |   if (!card) throw new Error('Demo card was not rendered');
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/demo
npm error workspace @org-hierarchy/demo@0.1.0
npm error location /Users/strelia/projects/dg/packages/demo
npm error command failed
npm error command sh -c rstest run src/app/App.interaction.test.ts
~~~~
NEXT: Add the five public facade delegates and typed positionRef at the construction site.

STEP 6 — IMPLEMENTED
Added positionRef and five public interaction delegates directly in mountOverlays; no parallel state or other App changes. The combined log-append/test command was rejected because automatic permission review timed out, before execution. This is not a test failure.
NEXT: Retry the focused test once as a standalone command.

STEP 7 — GREEN
Command: npm test -w @org-hierarchy/demo -- src/app/App.interaction.test.ts
Exit: 0. Full output:
~~~~text

> @org-hierarchy/demo@0.1.0 test
> rstest run src/app/App.interaction.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T05:11:27.495Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/demo"}
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
    "total": 1073,
    "build": 279,
    "tests": 794
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

- src/app/App.interaction.test.ts :: connects demo card selection and hover to the diagram interaction state

### Skipped

None.

## Failures

No test failures reported.
~~~~
NEXT: Run required lint.

STEP 8 — LINT
Command: npm run lint
Exit: 0. Full output:
~~~~text

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0

~~~~
NEXT: Verify the final scoped diff and record closeout.

STEP 9 — FINAL SCOPE / CLOSEOUT
Verified App.ts diff: exactly eight added lines in overlay construction. Demo status contains only App.ts and App.interaction.test.ts. Scoped git diff --check produced no diagnostics. No SDK/core edits made by this worker.

DONE: All five interaction delegates use the captured diagram's public primitives and position NodeRef. Existing default demo card forwards props unchanged.
TESTED SCENARIOS: Overlay construction supplies interaction; card selection forwards modifiers and toggles; public diagram selection updates card props; hover true/false maps to position/null; same-id organization selection does not select the position card. Focused test: 1 passed. Lint: exit 0. Original absent seam produced a behavioral RED before implementation, demonstrating red-if-deleted.
NON-OBVIOUS FINDINGS: The initial runner failed on listen EPERM; authorized rerun worked. One automatic approval review timed out; standalone retry succeeded. SDK/core concurrent edits remained untouched.
SCREENSHOTS: N/A; lightweight jsdom integration only.
USER FLOW: App initializes overlay → card onSelect/onHover delegates to diagram → shared interaction subscription refreshes selected/hovered props.
POST-DEPLOY: NOT_TESTED; no deployment requested. Build and typecheck deliberately not run under the brief's prohibitions. No independent review or disposable mutation campaign claimed.
SESSION GUARD: Higher-priority session instructions required a native checkpoint attempt using the current delivered identity. It failed before checkpoint creation: `mktemp: mkdtemp failed on .../receipts/manual-selection.1W6KGQ0Q: Operation not permitted` (exit 1). No checkpoint success or external-store write claimed; no escalation attempted for this ancillary operation.
NEXT: Coordinator may review the two demo files; implementation and required checks complete.
STATUS: DONE — R2-C-demo; focused test GREEN (1 passed), lint PASS.
