NEXT: Check repository guidance, current diff, and reveal tests before editing.
FACT: Initial status contains existing SDK admin reveal, demo, docs, and other unrelated changes; all will be preserved. Read local entrypoint, standards manifest, and TDD skill.
DECISION: Owner already specified public test seams and implementation; follow that scope without extra approval or external checkpoint writes.
NEXT: Inspect reveal/focus implementation and mount helper; add requested regression tests before implementation.
FACT: revealPath ends in focusNode; focusNode selects then pans with a person-seat fallback. Actual callback is onSelectionChange. Existing mount helper exposes the host for render observations.
DECISION: Observe pan requests at the host boundary and compare against the rendered target seat box; keep all existing reveal logic intact. Add default and unknown-id guards alongside the requested nonselecting cases.
NEXT: Add tests and run focused suite for RED evidence.

FACT: Added five selection-option tests before production changes.
NEXT: Run focused RED suite.
```text
$ npm test -w @org-hierarchy/sdk -- revealPositionPath.test.ts

> @org-hierarchy/sdk@1.1.1 test
> rstest run revealPositionPath.test.ts

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
npm error command sh -c rstest run revealPositionPath.test.ts

Exit code: 1
```

FACT: Sandbox denied the Rstest localhost listener (EPERM ::1:3000); no tests executed, so this is not RED evidence.
DECISION: Retry the same test command with listener permission; no implementation yet.
NEXT: Inspect actual test results.
```text
$ npm test -w @org-hierarchy/sdk -- revealPositionPath.test.ts

> @org-hierarchy/sdk@1.1.1 test
> rstest run revealPositionPath.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:27:16.972Z"
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
    "tests": 12,
    "failedTests": 4,
    "passedTests": 8,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 884,
    "build": 228,
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

### [F01] src/revealPositionPath.test.ts :: revealPath selection option > reveals target and pans to its seat without selecting or emitting selection callbacks

repro:

```bash
npx rstest 'src/revealPositionPath.test.ts' --testNamePattern 'revealPath selection option > reveals target and pans to its seat without selecting or emitting selection callbacks'
```

details:

```json
{
  "testPath": "src/revealPositionPath.test.ts",
  "project": "rstest",
  "fullName": "revealPath selection option > reveals target and pans to its seat without selecting or emitting selection callbacks",
  "status": "fail",
  "duration": 39,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected { kind: 'person', id: 'person', …(4) } to be null",
      "topFrame": {
        "file": "src/revealPositionPath.test.ts",
        "line": 162,
        "column": 48,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/revealPositionPath.test.ts",
      "line": 162
    }
  ]
}
```

diff:

```diff
- Expected:
null

+ Received:
{
  "departmentId": undefined,
  "id": "person",
  "kind": "person",
  "organizationId": "org",
  "personId": "person",
  "positionId": "target",
}
```

codeFrame (error 1):

```text
160 |         expect(visibleIds(mounted.diagram)).not.toContain('target');
161 |         expect(await mounted.diagram.revealPath(target, { select: false })).toBe(true);
162 |         expect(mounted.diagram.getSelection()).toBeNull();
    |                                                ^
163 |         expect(mounted.diagram.getSelections()).toEqual([]);
164 |         expect(changes).toEqual([]);
```

### [F02] src/revealPositionPath.test.ts :: revealPath selection option > reveals person and pans to its seat without selecting or emitting selection callbacks

repro:

```bash
npx rstest 'src/revealPositionPath.test.ts' --testNamePattern 'revealPath selection option > reveals person and pans to its seat without selecting or emitting selection callbacks'
```

details:

```json
{
  "testPath": "src/revealPositionPath.test.ts",
  "project": "rstest",
  "fullName": "revealPath selection option > reveals person and pans to its seat without selecting or emitting selection callbacks",
  "status": "fail",
  "duration": 4,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected { kind: 'person', id: 'person', …(4) } to be null",
      "topFrame": {
        "file": "src/revealPositionPath.test.ts",
        "line": 162,
        "column": 48,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/revealPositionPath.test.ts",
      "line": 162
    }
  ]
}
```

diff:

```diff
- Expected:
null

+ Received:
{
  "departmentId": undefined,
  "id": "person",
  "kind": "person",
  "organizationId": "org",
  "personId": "person",
  "positionId": "target",
}
```

codeFrame (error 1):

```text
160 |         expect(visibleIds(mounted.diagram)).not.toContain('target');
161 |         expect(await mounted.diagram.revealPath(target, { select: false })).toBe(true);
162 |         expect(mounted.diagram.getSelection()).toBeNull();
    |                                                ^
163 |         expect(mounted.diagram.getSelections()).toEqual([]);
164 |         expect(changes).toEqual([]);
```

### [F03] src/revealPositionPath.test.ts :: revealPath selection option > preserves a different selected node without selection callbacks

repro:

```bash
npx rstest 'src/revealPositionPath.test.ts' --testNamePattern 'revealPath selection option > preserves a different selected node without selection callbacks'
```

details:

```json
{
  "testPath": "src/revealPositionPath.test.ts",
  "project": "rstest",
  "fullName": "revealPath selection option > preserves a different selected node without selection callbacks",
  "status": "fail",
  "duration": 4,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected 'person' to be 'head' // Object.is equality",
      "topFrame": {
        "file": "src/revealPositionPath.test.ts",
        "line": 187,
        "column": 50,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/revealPositionPath.test.ts",
      "line": 187
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- head
+ person
```

codeFrame (error 1):

```text
185 |       changes.length = 0;
186 |       expect(await mounted.diagram.revealPath('target', { select: false })).toBe(true);
187 |       expect(mounted.diagram.getSelection()?.id).toBe('head');
    |                                                  ^
188 |       expect(mounted.diagram.getSelections()).toEqual(before);
189 |       expect(changes).toEqual([]);
```

### [F04] src/revealPositionPath.test.ts :: revealPath selection option > selects the target by default

repro:

```bash
npx rstest 'src/revealPositionPath.test.ts' --testNamePattern 'revealPath selection option > selects the target by default'
```

details:

```json
{
  "testPath": "src/revealPositionPath.test.ts",
  "project": "rstest",
  "fullName": "revealPath selection option > selects the target by default",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected 'person' to be 'target' // Object.is equality",
      "topFrame": {
        "file": "src/revealPositionPath.test.ts",
        "line": 197,
        "column": 50,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/revealPositionPath.test.ts",
      "line": 197
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- target
+ person
```

codeFrame (error 1):

```text
195 |     try {
196 |       expect(await mounted.diagram.revealPath('target')).toBe(true);
197 |       expect(mounted.diagram.getSelection()?.id).toBe('target');
    |                                                  ^
198 |     } finally { mounted.cleanup(); }
199 |   });
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run revealPositionPath.test.ts

Exit code: 1
```

FACT: RED run executed 12 tests: 3 intended nonselecting failures; 1 new default-test expectation was incorrect because occupied positions resolve to their person. Existing 7 tests and unknown-id guard passed.
DECISION: Correct only the newly added default assertion to the existing person/seat contract.
NEXT: Re-run RED before implementation.

```text
$ npm test -w @org-hierarchy/sdk -- revealPositionPath.test.ts

> @org-hierarchy/sdk@1.1.1 test
> rstest run revealPositionPath.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:27:44.488Z"
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
    "tests": 12,
    "failedTests": 3,
    "passedTests": 9,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 858,
    "build": 201,
    "tests": 657
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

### [F01] src/revealPositionPath.test.ts :: revealPath selection option > reveals target and pans to its seat without selecting or emitting selection callbacks

repro:

```bash
npx rstest 'src/revealPositionPath.test.ts' --testNamePattern 'revealPath selection option > reveals target and pans to its seat without selecting or emitting selection callbacks'
```

details:

```json
{
  "testPath": "src/revealPositionPath.test.ts",
  "project": "rstest",
  "fullName": "revealPath selection option > reveals target and pans to its seat without selecting or emitting selection callbacks",
  "status": "fail",
  "duration": 43,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected { kind: 'person', id: 'person', …(4) } to be null",
      "topFrame": {
        "file": "src/revealPositionPath.test.ts",
        "line": 162,
        "column": 48,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/revealPositionPath.test.ts",
      "line": 162
    }
  ]
}
```

diff:

```diff
- Expected:
null

+ Received:
{
  "departmentId": undefined,
  "id": "person",
  "kind": "person",
  "organizationId": "org",
  "personId": "person",
  "positionId": "target",
}
```

codeFrame (error 1):

```text
160 |         expect(visibleIds(mounted.diagram)).not.toContain('target');
161 |         expect(await mounted.diagram.revealPath(target, { select: false })).toBe(true);
162 |         expect(mounted.diagram.getSelection()).toBeNull();
    |                                                ^
163 |         expect(mounted.diagram.getSelections()).toEqual([]);
164 |         expect(changes).toEqual([]);
```

### [F02] src/revealPositionPath.test.ts :: revealPath selection option > reveals person and pans to its seat without selecting or emitting selection callbacks

repro:

```bash
npx rstest 'src/revealPositionPath.test.ts' --testNamePattern 'revealPath selection option > reveals person and pans to its seat without selecting or emitting selection callbacks'
```

details:

```json
{
  "testPath": "src/revealPositionPath.test.ts",
  "project": "rstest",
  "fullName": "revealPath selection option > reveals person and pans to its seat without selecting or emitting selection callbacks",
  "status": "fail",
  "duration": 6,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected { kind: 'person', id: 'person', …(4) } to be null",
      "topFrame": {
        "file": "src/revealPositionPath.test.ts",
        "line": 162,
        "column": 48,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/revealPositionPath.test.ts",
      "line": 162
    }
  ]
}
```

diff:

```diff
- Expected:
null

+ Received:
{
  "departmentId": undefined,
  "id": "person",
  "kind": "person",
  "organizationId": "org",
  "personId": "person",
  "positionId": "target",
}
```

codeFrame (error 1):

```text
160 |         expect(visibleIds(mounted.diagram)).not.toContain('target');
161 |         expect(await mounted.diagram.revealPath(target, { select: false })).toBe(true);
162 |         expect(mounted.diagram.getSelection()).toBeNull();
    |                                                ^
163 |         expect(mounted.diagram.getSelections()).toEqual([]);
164 |         expect(changes).toEqual([]);
```

### [F03] src/revealPositionPath.test.ts :: revealPath selection option > preserves a different selected node without selection callbacks

repro:

```bash
npx rstest 'src/revealPositionPath.test.ts' --testNamePattern 'revealPath selection option > preserves a different selected node without selection callbacks'
```

details:

```json
{
  "testPath": "src/revealPositionPath.test.ts",
  "project": "rstest",
  "fullName": "revealPath selection option > preserves a different selected node without selection callbacks",
  "status": "fail",
  "duration": 10,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected 'person' to be 'head' // Object.is equality",
      "topFrame": {
        "file": "src/revealPositionPath.test.ts",
        "line": 187,
        "column": 50,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/revealPositionPath.test.ts",
      "line": 187
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- head
+ person
```

codeFrame (error 1):

```text
185 |       changes.length = 0;
186 |       expect(await mounted.diagram.revealPath('target', { select: false })).toBe(true);
187 |       expect(mounted.diagram.getSelection()?.id).toBe('head');
    |                                                  ^
188 |       expect(mounted.diagram.getSelections()).toEqual(before);
189 |       expect(changes).toEqual([]);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run revealPositionPath.test.ts

Exit code: 1
```

FACT: Corrected RED: 3 expected failures, 9 passes. Implemented optional exported RevealPathOptions, shared panToNodeOrSeat helper, nonselecting demo staff focus, and Ukrainian docs. Reveal logic before final focus is untouched; demo search remains unchanged.
NEXT: Run focused GREEN, then each required gate with complete output appended here.

```text
$ npm test -w @org-hierarchy/sdk -- revealPositionPath.test.ts

> @org-hierarchy/sdk@1.1.1 test
> rstest run revealPositionPath.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:28:20.813Z"
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
    "total": 745,
    "build": 169,
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

## Tests

### Passed

- src/revealPositionPath.test.ts :: revealPath admin position ancestors > reveals a hidden target through the full admin path in one frame
- src/revealPositionPath.test.ts :: revealPath admin position ancestors > reveals a hidden person through the full admin path in one frame
- src/revealPositionPath.test.ts :: revealPath admin position ancestors > expands every parent of a diamond, ignoring matrix links and surviving cycles
- src/revealPositionPath.test.ts :: revealPath admin position ancestors > does not render or emit when the path is already expanded
- src/revealPositionPath.test.ts :: revealPath admin position ancestors > bypasses maxExpandedPositions to keep the whole revealed path open
- src/revealPositionPath.test.ts :: revealPath admin position ancestors > combines org and position reveal in one frame
- src/revealPositionPath.test.ts :: revealPath admin position ancestors > restores both org data and position state and rethrows a refused frame without expand events
- src/revealPositionPath.test.ts :: revealPath selection option > reveals target and pans to its seat without selecting or emitting selection callbacks
- src/revealPositionPath.test.ts :: revealPath selection option > reveals person and pans to its seat without selecting or emitting selection callbacks
- src/revealPositionPath.test.ts :: revealPath selection option > preserves a different selected node without selection callbacks
- src/revealPositionPath.test.ts :: revealPath selection option > selects the target by default
- src/revealPositionPath.test.ts :: revealPath selection option > returns false for an unknown id without selecting or panning

### Skipped

None.

## Failures

No test failures reported.

Exit code: 0
```

FACT: Focused GREEN passed all 12 tests, including animated seat pan assertions.

NEXT: Run npm test -w @org-hierarchy/sdk
```text
$ npm test -w @org-hierarchy/sdk

> @org-hierarchy/sdk@1.1.1 test
> rstest run

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:28:48.800Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 164,
    "failedFiles": 0,
    "tests": 1342,
    "failedTests": 0,
    "passedTests": 1340,
    "skippedTests": 2,
    "todoTests": 0
  },
  "durationMs": {
    "total": 15258,
    "build": 227,
    "tests": 15031
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

No test failures reported.

Note: all tests passed. Lists omitted for brevity.

Exit code: 0
```
FACT: npm test -w @org-hierarchy/sdk exited 0.

NEXT: Run npm test -w @org-hierarchy/demo
```text
$ npm test -w @org-hierarchy/demo

> @org-hierarchy/demo@0.1.0 test
> rstest run

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:28:51.876Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/demo"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 18,
    "failedFiles": 0,
    "tests": 133,
    "failedTests": 0,
    "passedTests": 132,
    "skippedTests": 1,
    "todoTests": 0
  },
  "durationMs": {
    "total": 2682,
    "build": 154,
    "tests": 2528
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

No test failures reported.

Note: all tests passed. Lists omitted for brevity.

Exit code: 0
```
FACT: npm test -w @org-hierarchy/demo exited 0.

NEXT: Run npm run typecheck
```text
$ npm run typecheck

> org-hierarchy@0.1.0 typecheck
> npm run typecheck -w @org-hierarchy/sdk && npm run build:types -w @org-hierarchy/sdk && npm run typecheck -w @org-hierarchy/demo && tsc -p tsconfig.e2e.json


> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


> @org-hierarchy/sdk@1.1.1 build:types
> tsc --emitDeclarationOnly --declaration --outDir dist


> @org-hierarchy/demo@0.1.0 typecheck
> tsc -p tsconfig.check.json


Exit code: 0
```
FACT: npm run typecheck exited 0.

NEXT: Run npm run lint
```text
$ npm run lint

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0

packages/sdk/src/OrgHierarchyDiagram.ts:1859:9: error eslint(no-negated-condition): Unexpected negated condition. help: Remove the negation operator and switch the consequent and alternate branches.
packages/sdk/src/OrgHierarchyDiagram.ts:1859:9: error unicorn(no-negated-condition): Unexpected negated condition. help: Remove the negation operator and switch the consequent and alternate branches.

Exit code: 1
```
FACT: npm run lint exited 1.
DECISION: Stop gates on failure; inspect evidence before any further action.
FACT: Reviewed the combined diff: existing admin-ancestor expansion/rollback/events are preserved; the only new demo behavior is focusStaffCard using select:false. Default demo search and focusByTestId remain unchanged.
NEXT: Await required gates and inspect any failure before proceeding.

FACT: SDK 1340 tests, demo 132 tests, and typecheck passed. Lint found only two rules on the new negated if/else condition at revealPath. No unrelated failure.
DECISION: Reverse branch order to use select === false, preserving behavior.
NEXT: Re-run SDK, typecheck, lint, and check:docs after this correction; demo code is unchanged since its passing gate.

NEXT: Run npm test -w @org-hierarchy/sdk
```text
$ npm test -w @org-hierarchy/sdk

> @org-hierarchy/sdk@1.1.1 test
> rstest run

FACT: Final source inspection confirms select:false skips applySelection/repaintSelection, both paths share the animated node/seat pan helper, and the default search call remains revealPath(topId). git diff --check passed.
NEXT: Finish remaining gates and record final outcome here.
---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:29:37.381Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 164,
    "failedFiles": 0,
    "tests": 1342,
    "failedTests": 0,
    "passedTests": 1340,
    "skippedTests": 2,
    "todoTests": 0
  },
  "durationMs": {
    "total": 13322,
    "build": 327,
    "tests": 12995
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

No test failures reported.

Note: all tests passed. Lists omitted for brevity.

Exit code: 0
```
FACT: npm test -w @org-hierarchy/sdk exited 0.

NEXT: Run npm run typecheck
```text
$ npm run typecheck

> org-hierarchy@0.1.0 typecheck
> npm run typecheck -w @org-hierarchy/sdk && npm run build:types -w @org-hierarchy/sdk && npm run typecheck -w @org-hierarchy/demo && tsc -p tsconfig.e2e.json


> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


> @org-hierarchy/sdk@1.1.1 build:types
> tsc --emitDeclarationOnly --declaration --outDir dist


> @org-hierarchy/demo@0.1.0 typecheck
> tsc -p tsconfig.check.json


Exit code: 0
```
FACT: npm run typecheck exited 0.

NEXT: Run npm run lint
```text
$ npm run lint

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


Exit code: 0
```
FACT: npm run lint exited 0.

NEXT: Run npm run check:docs
```text
$ npm run check:docs

> org-hierarchy@0.1.0 check:docs
> node scripts/check-docs.mjs

· брифінг відстає на 22 комітів з 25 дозволених
✅ дока свіжа: лінки резолвяться, публічний API описаний, барель без тест-хуків, брифінг у межах

Exit code: 0
```
FACT: npm run check:docs exited 0.
FACT: Completed SDK option/export, shared camera fallback, demo staff focus migration, and Ukrainian documentation. Existing uncommitted admin-ancestor reveal was preserved.
FACT: TDD evidence: corrected RED had 3 intended failures / 9 passes; GREEN had 12/12 passes. Final required gates passed: SDK 1340 tests, demo 132 tests, typecheck, lint, check:docs. Full command outputs and exit codes are recorded above.
FACT: Only this task's allowed source/docs paths and working file were edited. No branch switch, worktree, commit, push, dependency changes, Rust edits, or build command. Typecheck emitted declarations as explicitly authorized; no runtime distribution rebuild was performed.
DECISION: Implementation is complete. Runtime build and live-host verification remain deferred to the linked project's confirmation, as requested.
QUESTION: None.
NEXT: Owner review of the uncommitted changes; no further action in this session.
