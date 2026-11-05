NEXT: Read required source seams, then execute R5-C TDD.
STEP 1 — Brief read in full. Scope restricted to four assigned files plus this append-only log. No builds, root typecheck, emitted types, branch/worktree changes, commits or pushes. Initial guidance reads completed; oversized combined output requires targeted rereads.
STEP 2 — Read plan/spec, facade callback/selection/lifecycle seams, InteractionStore, SelectionStore, barrel and USAGE. Confirmed scene IDs are typed entity keys. R5-B setMarqueeSink is absent: use the explicitly authorized fake prototype seam and defer real gesture integration. Applying TDD at the brief-approved seam. First success test written before production edits.
NEXT: Run first RED test, then wire the opt-in rectangle callback.

STEP 3 — RED: npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram.marquee
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.marquee

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
npm error command sh -c rstest run OrgHierarchyDiagram.marquee

```
Exit: 1

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.marquee

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:34:45.278Z"
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
    "total": 706,
    "build": 178,
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

### [F01] src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: opt-in installs a sink and forwards each world rectangle and null

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.marquee.test.ts' --testNamePattern 'facade marquee > success: opt-in installs a sink and forwards each world rectangle and null'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.marquee.test.ts",
  "project": "rstest",
  "fullName": "facade marquee > success: opt-in installs a sink and forwards each world rectangle and null",
  "status": "fail",
  "duration": 56,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to be called 1 times, but got 0 times",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.marquee.test.ts",
        "line": 46,
        "column": 21,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.marquee.test.ts",
      "line": 46
    }
  ]
}
```

codeFrame (error 1):

```text
44 |     const onMarquee = rstest.fn();
45 |     await mount(onMarquee);
46 |     expect(setSink).toHaveBeenCalledTimes(1);
   |                     ^
47 |     const rect = { x: -20, y: 30, width: 80, height: 90 };
48 |     sink().onRect(rect);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.marquee

STEP 4 — Authorized RED retry exit: 1

STEP 5 — Added config type and opt-in sink wiring for rectangle forwarding through callHostCallback. Selection remains a no-op until its RED test.
NEXT: GREEN for rectangle slice.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.marquee

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:35:02.991Z"
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
    "total": 704,
    "build": 205,
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

## Tests

### Passed

- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: opt-in installs a sink and forwards each world rectangle and null

### Skipped

None.

## Failures

No test failures reported.

STEP 6 — Rectangle GREEN exit: 0

STEP 7 — Added additive-selection test: A + B,C, duplicates, empty hit list and live selection changed after installation.
NEXT: Selection RED.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.marquee

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:35:28.085Z"
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
    "total": 703,
    "build": 191,
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

## Failures

### [F01] src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: marquee unions with live selection in order, deduplicates and preserves empty hits

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.marquee.test.ts' --testNamePattern 'facade marquee > success: marquee unions with live selection in order, deduplicates and preserves empty hits'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.marquee.test.ts",
  "project": "rstest",
  "fullName": "facade marquee > success: marquee unions with live selection in order, deduplicates and preserves empty hits",
  "status": "fail",
  "duration": 59,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [ { kind: 'organization', …(2) } ] to deeply equal [ Array(3) ]",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.marquee.test.ts",
        "line": 48,
        "column": 37,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.marquee.test.ts",
      "line": 48
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

@@ -2,16 +2,6 @@
    {
      "id": "A",
      "kind": "organization",
      "organizationId": "A",
    },
-   {
-     "id": "B",
-     "kind": "organization",
-     "organizationId": "B",
-   },
-   {
-     "id": "C",
-     "kind": "organization",
-     "organizationId": "C",
-   },
  ]
```

codeFrame (error 1):

```text
46 |     await diagram.select(orgNodeRef('A'));
47 |     sink().onSelect(['organization:B', 'organization:C', 'organization:B', 'organization:A']);
48 |     expect(diagram.getSelections()).toEqual([orgNodeRef('A'), orgNodeRef('B'), orgNodeRef('C')]);
   |                                     ^
49 |     sink().onSelect([]);
50 |     expect(diagram.getSelections()).toEqual([orgNodeRef('A'), orgNodeRef('B'), orgNodeRef('C')]);
```

### [F02] src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: opt-in installs a sink and forwards each world rectangle and null

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.marquee.test.ts' --testNamePattern 'facade marquee > success: opt-in installs a sink and forwards each world rectangle and null'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.marquee.test.ts",
  "project": "rstest",
  "fullName": "facade marquee > success: opt-in installs a sink and forwards each world rectangle and null",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "Cannot read properties of undefined (reading 'matches')",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.ts",
        "line": 528,
        "column": 28,
        "method": "OrgHierarchyDiagram.create"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.marquee.test.ts",
      "line": 33
    },
    {
      "path": "src/OrgHierarchyDiagram.ts",
      "line": 528
    }
  ]
}
```

codeFrame (error 1):

```text
526 |     const reducedMotion = typeof window !== 'undefined'
527 |       && typeof window.matchMedia === 'function'
528 |       && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    |                            ^
529 |     const resolvedAnimate = resolveAnimate(config.animate, reducedMotion);
530 |     instance.animate = resolvedAnimate !== null;
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.marquee

STEP 8 — Selection RED exit: 1

STEP 9 — Selection assertion failed as intended. Second case exposed shared test setup resetting matchMedia; adopted the existing facade-test beforeEach restoration pattern. No production change yet.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.marquee

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:35:50.151Z"
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
    "failedTests": 1,
    "passedTests": 1,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 710,
    "build": 181,
    "tests": 529
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

### [F01] src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: marquee unions with live selection in order, deduplicates and preserves empty hits

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.marquee.test.ts' --testNamePattern 'facade marquee > success: marquee unions with live selection in order, deduplicates and preserves empty hits'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.marquee.test.ts",
  "project": "rstest",
  "fullName": "facade marquee > success: marquee unions with live selection in order, deduplicates and preserves empty hits",
  "status": "fail",
  "duration": 57,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [ { kind: 'organization', …(2) } ] to deeply equal [ Array(3) ]",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.marquee.test.ts",
        "line": 50,
        "column": 37,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.marquee.test.ts",
      "line": 50
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

@@ -2,16 +2,6 @@
    {
      "id": "A",
      "kind": "organization",
      "organizationId": "A",
    },
-   {
-     "id": "B",
-     "kind": "organization",
-     "organizationId": "B",
-   },
-   {
-     "id": "C",
-     "kind": "organization",
-     "organizationId": "C",
-   },
  ]
```

codeFrame (error 1):

```text
48 |     await diagram.select(orgNodeRef('A'));
49 |     sink().onSelect(['organization:B', 'organization:C', 'organization:B', 'organization:A']);
50 |     expect(diagram.getSelections()).toEqual([orgNodeRef('A'), orgNodeRef('B'), orgNodeRef('C')]);
   |                                     ^
51 |     sink().onSelect([]);
52 |     expect(diagram.getSelections()).toEqual([orgNodeRef('A'), orgNodeRef('B'), orgNodeRef('C')]);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.marquee

STEP 10 — Selection RED with corrected setup exit: 1

STEP 11 — Implemented selection union from the current InteractionStore list, resolving scene IDs through the existing NodeRef resolver, preserving order and deduplicating before replaceMany. Repaints selection through the existing facade path.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.marquee

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:35:56.221Z"
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
    "total": 737,
    "build": 132,
    "tests": 605
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

- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: marquee unions with live selection in order, deduplicates and preserves empty hits
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: opt-in installs a sink and forwards each world rectangle and null

### Skipped

None.

## Failures

No test failures reported.

STEP 12 — Selection GREEN exit: 0

STEP 13 — Added throwing-host failure test: three emissions still reach the host, selection completes, exactly one warn and no console.error. Existing helper currently logs errors per throw; this test discriminates the requested policy.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.marquee

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:36:13.070Z"
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
    "failedTests": 1,
    "passedTests": 2,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 697,
    "build": 180,
    "tests": 517
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

### [F01] src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > failure: a throwing host warns once while later frames and selection continue

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.marquee.test.ts' --testNamePattern 'facade marquee > failure: a throwing host warns once while later frames and selection continue'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.marquee.test.ts",
  "project": "rstest",
  "fullName": "facade marquee > failure: a throwing host warns once while later frames and selection continue",
  "status": "fail",
  "duration": 55,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"warn\" to be called 1 times, but got 0 times",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.marquee.test.ts",
        "line": 59,
        "column": 18,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.marquee.test.ts",
      "line": 59
    }
  ]
}
```

codeFrame (error 1):

```text
57 |     expect(diagram.getSelections()).toEqual([orgNodeRef('B')]);
58 |     expect(onMarquee).toHaveBeenCalledTimes(3);
59 |     expect(warn).toHaveBeenCalledTimes(1);
   |                  ^
60 |     expect(warn).toHaveBeenCalledWith('OrgHierarchyDiagram: onMarquee threw', failure);
61 |     expect(error).not.toHaveBeenCalled();
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.marquee

STEP 14 — Throw isolation RED exit: 1

STEP 15 — Extended callHostCallback with an optional error reporter and tuple arguments. Existing callers retain console.error behavior; marquee supplies a per-instance warn-once reporter.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.marquee

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:36:41.717Z"
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
    "total": 724,
    "build": 180,
    "tests": 544
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

- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > failure: a throwing host warns once while later frames and selection continue
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: marquee unions with live selection in order, deduplicates and preserves empty hits
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: opt-in installs a sink and forwards each world rectangle and null

### Skipped

None.

## Failures

No test failures reported.

STEP 16 — Throw isolation GREEN exit: 0

STEP 17 — Added teardown and no-opt-in tests. Teardown must clear once and prevent retained sink callbacks from changing destroyed state. No-opt-in must never call setMarqueeSink, including destroy.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.marquee

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:36:47.013Z"
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
    "failedTests": 1,
    "passedTests": 4,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 694,
    "build": 119,
    "tests": 575
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

### [F01] src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > failure: destroy clears the installed sink and retained callbacks become inert

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.marquee.test.ts' --testNamePattern 'facade marquee > failure: destroy clears the installed sink and retained callbacks become inert'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.marquee.test.ts",
  "project": "rstest",
  "fullName": "facade marquee > failure: destroy clears the installed sink and retained callbacks become inert",
  "status": "fail",
  "duration": 55,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected last \"rstest.fn()\" call to have been called with [ null ]",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.marquee.test.ts",
        "line": 58,
        "column": 21,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.marquee.test.ts",
      "line": 58
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

  [
-   null,
+   {
+     "onRect": [Function onRect],
+     "onSelect": [Function onSelect],
+   },
  ]
```

codeFrame (error 1):

```text
56 |     const installed = sink();
57 |     diagram.destroy();
58 |     expect(setSink).toHaveBeenLastCalledWith(null);
   |                     ^
59 |     expect(setSink).toHaveBeenCalledTimes(2);
60 |     installed.onRect({ x: 1, y: 2, width: 3, height: 4 });
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.marquee

STEP 18 — Teardown RED exit: 1

STEP 19 — Added opt-in lifecycle flag, clear-sink teardown, and destroyed guards on retained sink callbacks. No callback config means no sink calls at create or destroy.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.marquee

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:37:17.400Z"
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
    "total": 694,
    "build": 163,
    "tests": 531
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

- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: absent onMarquee never installs or clears a sink
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > failure: destroy clears the installed sink and retained callbacks become inert
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > failure: a throwing host warns once while later frames and selection continue
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: marquee unions with live selection in order, deduplicates and preserves empty hits
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: opt-in installs a sink and forwards each world rectangle and null

### Skipped

None.

## Failures

No test failures reported.

STEP 20 — Teardown GREEN exit: 0

STEP 21 — Exported MarqueeRect from the public barrel. Documented config, world rectangle/null, per-frame emission, host drawing, always-additive selection, opt-in pan preservation, throw isolation and host overlay disposal. Updated the existing callback isolation paragraph to avoid a stale exclusivity claim.
NEXT: SDK noEmit typecheck and lint; report R5-B seam errors without editing renderer.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


STEP 22 — SDK noEmit typecheck exit: 0

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0

packages/sdk/src/render/DiagramRenderer.marquee.test.ts:1:1: error import(no-unassigned-import): Imported module should be assigned help: Consider assigning the import to a variable or removing it if it's unused.

STEP 23 — Lint exit: 1

STEP 24 — R5-B seam is now present and SDK typecheck passes. Lint failed exclusively in R5-B-owned DiagramRenderer.marquee.test.ts (unassigned pixi.js/events import); left untouched. Switched from fake sink setter to a spy that calls the real renderer setter; derives sink type from it. Test imports MarqueeRect through public barrel and observes selection callback and repaint as well as state.
NEXT: Recheck real seam tests, typecheck and lint.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.marquee

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T23:38:09.633Z"
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
    "total": 572,
    "build": 96,
    "tests": 476
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

- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: absent onMarquee never installs or clears a sink
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > failure: destroy clears the installed sink and retained callbacks become inert
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > failure: a throwing host warns once while later frames and selection continue
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: marquee unions with live selection in order, deduplicates and preserves empty hits
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: opt-in installs a sink and forwards each world rectangle and null

### Skipped

None.

## Failures

No test failures reported.

STEP 25 — Real renderer seam tests exit: 0

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


STEP 26 — Real seam SDK noEmit typecheck exit: 0

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0

packages/sdk/src/render/DiagramRenderer.marquee.test.ts:1:1: error import(no-unassigned-import): Imported module should be assigned help: Consider assigning the import to a variable or removing it if it's unused.

STEP 27 — Lint recheck exit: 1
mktemp: mkdtemp failed on /Users/strelia/project-data/ai-factory-workspace/runtime-data/ai-factory-handoff/receipts/manual-selection.43IDUawx: Operation not permitted

STEP 28 — Developer-mandated native checkpoint attempt exit: 1; no success claimed without OK.
STEP 29 — Final scope review: branch remains feat/extensibility. Authored only OrgHierarchyDiagram.ts, index.ts, USAGE.md, OrgHierarchyDiagram.marquee.test.ts and this append-only log. Renderer files and unrelated existing changes belong to other work and were not edited. Scoped git diff --check passed. Native checkpoint failed at sandbox-protected receipt-directory creation; no checkpoint or external store write succeeded. No escalation was requested for that external write, respecting the task prohibition.

DONE — Opt-in config and real renderer sink wiring; world rectangle forwarding; per-instance warn-once throw isolation through callHostCallback; ordered additive union; selection notification/repaint; idempotent sink teardown; public MarqueeRect export and USAGE contract.
TESTED SCENARIOS — Five tests pass with the real renderer setter observed by a spy: opt-in forwarding; current-selection union with duplicates and empty results; throwing host continuation and one warn; no sink calls without opt-in; teardown and inert retained callbacks. SDK noEmit typecheck passes. Full RED/GREEN and gate outputs are preserved above.
NON-OBVIOUS FINDINGS — Scene IDs are typed entity keys and need existing NodeRef resolution. selectMany is replacement-only. Existing callHostCallback reports console.error, so its optional error reporter supplies marquee's required warning policy without changing other callbacks. Lint remains blocked solely by the R5-B-owned unassigned pixi.js/events import in DiagramRenderer.marquee.test.ts:1.
SCREENSHOTS — Not applicable to this facade-only task; no demo build or visual deployment performed.
USER FLOW — Host supplies onMarquee; renderer emits world rectangles to host drawing; released hit IDs join the live selection; no opt-in preserves the renderer's disabled sink; destroy clears the installed sink. Pointer gesture production integration belongs to R5-B; these tests exercise the agreed facade seam, not browser pointer dispatch.
POST-DEPLOY — Not run: builds and live dist changes are prohibited. No root typecheck, emitting tsc, other test suites, commit, push, branch/worktree change or renderer edit performed.
COVERAGE LIMIT — RED failures observed for wiring, union, warning policy and teardown. The no-opt-in regression assertion is green on the existing behavior and would fail if the config guard were removed. Disposable mutation runs were not performed because the brief limits authored files and forbids worktrees; no mutation-run PASS is claimed.
NEXT: R5-B owner resolves its lint error; rerun npm run lint. No R5-C implementation work remains pending.
STATUS: BLOCKED — R5-C implemented; 5 tests and SDK typecheck pass; lint fails in R5-B-owned DiagramRenderer.marquee.test.ts:1.
