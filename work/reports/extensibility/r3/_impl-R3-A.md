NEXT: Read the required plan, specification, standards, and implementation references.
STEP 1 — Brief read in full
Scope: only nodeViewFactory.ts, nodeViewFactory.test.ts, and this append-only log. No build, root typecheck, emitting tsc, branch/worktree changes, commits, pushes, or external store. Tests restricted to nodeViewFactory.
NEXT: Write the normalization lifecycle test and run RED.
STEP 2 — Contract and references
Read R3 plan and spec, standards manifest, TDD guidance, domain vocabulary, transition style, and SDK scripts. Tests target the brief-approved normalizeNodeView and NodeViewPool seams. Pool constructor accepts NodeView; obtain returns Container | null for fallback. Context is read-only. Host roots must retain their own visual properties when rebuilt; the original root remains stable.
NEXT: Run normalization RED.
STEP 3 — First test written
Normalization checks initial host root identity, destruction before callback, rebuilt root, and recursive teardown. Clarification of step 2: retained factories keep root identity; simple factories recreate their complete visual (including Graphics on the root), exposing the rebuilt root through a getter.

> @org-hierarchy/sdk@1.1.1 test
> rstest run nodeViewFactory

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
npm error command sh -c rstest run nodeViewFactory

STEP 4 — Normalization RED exit: 1
NEXT: Implement normalization.

> @org-hierarchy/sdk@1.1.1 test
> rstest run nodeViewFactory

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:38:09.254Z"
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
    "total": 872,
    "build": 258,
    "tests": 614
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

### [F01] src/render/nodeViewFactory.test.ts

repro:

```bash
npx rstest 'src/render/nodeViewFactory.test.ts'
```

details:

```json
{
  "testPath": "src/render/nodeViewFactory.test.ts",
  "project": "rstest",
  "fullName": "",
  "status": "fail",
  "retryCount": 0,
  "errors": [
    {
      "type": "Error",
      "message": "Cannot find module './nodeViewFactory.js'",
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
npm error command sh -c rstest run nodeViewFactory

STEP 5 — Permission retry RED exit: 1 (step 4 was environment failure, not behavioral RED).
NEXT: Implement normalization after missing-module RED.
STEP 6 — Normalization implemented
Simple host visual is destroyed recursively before rebuilding; retained factories pass through unchanged. Host exceptions propagate to the forthcoming keyed pool boundary.
NEXT: Run normalization GREEN.

> @org-hierarchy/sdk@1.1.1 test
> rstest run nodeViewFactory

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:38:35.822Z"
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
    "total": 635,
    "build": 180,
    "tests": 455
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

- src/render/nodeViewFactory.test.ts :: normalizes simple views and destroys the old visual before rebuilding

### Skipped

None.

## Failures

No test failures reported.

STEP 7 — Normalization test exit: 0
NEXT: Add retained lifecycle test.

STEP 8 — Retained lifecycle test added.
NEXT: Run pool RED.

> @org-hierarchy/sdk@1.1.1 test
> rstest run nodeViewFactory

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:38:56.740Z"
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
    "total": 665,
    "build": 168,
    "tests": 497
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

### [F01] src/render/nodeViewFactory.test.ts :: retains seen entries, sweeps unseen entries, recreates on reappearance and clears once

repro:

```bash
npx rstest 'src/render/nodeViewFactory.test.ts' --testNamePattern 'retains seen entries, sweeps unseen entries, recreates on reappearance and clears once'
```

details:

```json
{
  "testPath": "src/render/nodeViewFactory.test.ts",
  "project": "rstest",
  "fullName": "retains seen entries, sweeps unseen entries, recreates on reappearance and clears once",
  "status": "fail",
  "duration": 4,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "_nodeViewFactory_js__rspack_import_2.NodeViewPool is not a constructor",
      "topFrame": {
        "file": "src/render/nodeViewFactory.test.ts",
        "line": 42,
        "column": 16,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/nodeViewFactory.test.ts",
      "line": 42
    }
  ]
}
```

codeFrame (error 1):

```text
40 |   const factory = { create };
41 |   expect(normalizeNodeView(factory)).toBe(factory);
42 |   const pool = new NodeViewPool(factory);
   |                ^
43 |   pool.beginPass();
44 |   const root = pool.obtain('position:seat', node, ctx);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run nodeViewFactory

STEP 9 — Pool RED exit: 1
NEXT: Implement retained pool.

STEP 10 — Retained pool implemented.
NEXT: Run lifecycle GREEN.

> @org-hierarchy/sdk@1.1.1 test
> rstest run nodeViewFactory

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:39:17.251Z"
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
    "total": 667,
    "build": 203,
    "tests": 464
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

- src/render/nodeViewFactory.test.ts :: normalizes simple views and destroys the old visual before rebuilding
- src/render/nodeViewFactory.test.ts :: retains seen entries, sweeps unseen entries, recreates on reappearance and clears once

### Skipped

None.

## Failures

No test failures reported.

STEP 11 — Lifecycle GREEN exit: 0
NEXT: Add host failure tests.

STEP 12 — Failure-containment tests added.
NEXT: Run containment RED.

> @org-hierarchy/sdk@1.1.1 test
> rstest run nodeViewFactory

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:39:51.291Z"
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
    "failedTests": 6,
    "passedTests": 2,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 649,
    "build": 166,
    "tests": 483
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

### [F01] src/render/nodeViewFactory.test.ts :: contains create and simple callback exceptions and warns once per key

repro:

```bash
npx rstest 'src/render/nodeViewFactory.test.ts' --testNamePattern 'contains create and simple callback exceptions and warns once per key'
```

details:

```json
{
  "testPath": "src/render/nodeViewFactory.test.ts",
  "project": "rstest",
  "fullName": "contains create and simple callback exceptions and warns once per key",
  "status": "fail",
  "duration": 5,
  "retryCount": 0,
  "errors": [
    {
      "type": "Error",
      "message": "host",
      "topFrame": {
        "file": "src/render/nodeViewFactory.test.ts",
        "line": 67,
        "column": 30,
        "method": "view"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/nodeViewFactory.test.ts",
      "line": 67
    },
    {
      "path": "src/render/nodeViewFactory.ts",
      "line": 38
    }
  ]
}
```

codeFrame (error 1):

```text
65 | it('contains create and simple callback exceptions and warns once per key', () => {
66 |   const warn = rs.spyOn(console, 'warn').mockImplementation(() => {});
67 |   const fail = () => { throw new Error('host'); };
   |                              ^
68 |   for (const factory of [fail, { create: fail }]) {
69 |     const pool = new NodeViewPool(factory);
```

### [F02] src/render/nodeViewFactory.test.ts :: contains update failure, disposes the failed entry and allows recovery

repro:

```bash
npx rstest 'src/render/nodeViewFactory.test.ts' --testNamePattern 'contains update failure, disposes the failed entry and allows recovery'
```

details:

```json
{
  "testPath": "src/render/nodeViewFactory.test.ts",
  "project": "rstest",
  "fullName": "contains update failure, disposes the failed entry and allows recovery",
  "status": "fail",
  "duration": 1,
  "retryCount": 0,
  "errors": [
    {
      "type": "Error",
      "message": "update",
      "topFrame": {
        "file": "src/render/nodeViewFactory.test.ts",
        "line": 80,
        "column": 73,
        "method": "Object.update"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/nodeViewFactory.test.ts",
      "line": 80
    },
    {
      "path": "src/render/nodeViewFactory.ts",
      "line": 61
    }
  ]
}
```

codeFrame (error 1):

```text
78 |   const warn = rs.spyOn(console, 'warn').mockImplementation(() => {});
79 |   const destroy = rs.fn(() => { throw new Error('destroy'); });
80 |   const create = rs.fn(() => ({ root: new Container(), update() { throw new Error('update'); }, destroy }));
   |                                                                         ^
81 |   const pool = new NodeViewPool({ create });
82 |   expect(pool.obtain('position:seat', node, ctx)).toBeInstanceOf(Container);
```

### [F03] src/render/nodeViewFactory.test.ts :: continues sweep and teardown after a host destroy throws

repro:

```bash
npx rstest 'src/render/nodeViewFactory.test.ts' --testNamePattern 'continues sweep and teardown after a host destroy throws'
```

details:

```json
{
  "testPath": "src/render/nodeViewFactory.test.ts",
  "project": "rstest",
  "fullName": "continues sweep and teardown after a host destroy throws",
  "status": "fail",
  "duration": 0,
  "retryCount": 0,
  "errors": [
    {
      "type": "Error",
      "message": "destroy",
      "topFrame": {
        "file": "src/render/nodeViewFactory.test.ts",
        "line": 92,
        "column": 35,
        "method": "Object.<anonymous>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/nodeViewFactory.test.ts",
      "line": 92
    },
    {
      "path": "src/render/nodeViewFactory.ts",
      "line": 75
    }
  ]
}
```

codeFrame (error 1):

```text
90 | it('continues sweep and teardown after a host destroy throws', () => {
91 |   const warn = rs.spyOn(console, 'warn').mockImplementation(() => {});
92 |   const bad = rs.fn(() => { throw new Error('destroy'); });
   |                                   ^
93 |   const good = rs.fn();
94 |   const pool = new NodeViewPool({ create(input) {
```

### [F04] src/render/nodeViewFactory.test.ts :: rejects invalid host roots and entries: null

repro:

```bash
npx rstest 'src/render/nodeViewFactory.test.ts' --testNamePattern 'rejects invalid host roots and entries: null'
```

details:

```json
{
  "testPath": "src/render/nodeViewFactory.test.ts",
  "project": "rstest",
  "fullName": "rejects invalid host roots and entries: null",
  "status": "fail",
  "duration": 1,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "nodeView must return a Pixi Container",
      "topFrame": {
        "file": "src/render/nodeViewFactory.ts",
        "line": 29,
        "column": 43,
        "method": "requireContainer"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/nodeViewFactory.ts",
      "line": 29
    },
    {
      "path": "src/render/nodeViewFactory.test.ts",
      "line": 116
    }
  ]
}
```

codeFrame (error 1):

```text
27 | 
28 | function requireContainer(root: Container): Container {
29 |   if (!(root instanceof Container)) throw new TypeError('nodeView must return a Pixi Container');
   |                                           ^
30 |   return root;
31 | }
```

### [F05] src/render/nodeViewFactory.test.ts :: rejects invalid host roots and entries: {}

repro:

```bash
npx rstest 'src/render/nodeViewFactory.test.ts' --testNamePattern 'rejects invalid host roots and entries: {}'
```

details:

```json
{
  "testPath": "src/render/nodeViewFactory.test.ts",
  "project": "rstest",
  "fullName": "rejects invalid host roots and entries: {}",
  "status": "fail",
  "duration": 0,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "nodeView must return a Pixi Container",
      "topFrame": {
        "file": "src/render/nodeViewFactory.ts",
        "line": 29,
        "column": 43,
        "method": "requireContainer"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/nodeViewFactory.ts",
      "line": 29
    },
    {
      "path": "src/render/nodeViewFactory.test.ts",
      "line": 116
    }
  ]
}
```

codeFrame (error 1):

```text
27 | 
28 | function requireContainer(root: Container): Container {
29 |   if (!(root instanceof Container)) throw new TypeError('nodeView must return a Pixi Container');
   |                                           ^
30 |   return root;
31 | }
```

### [F06] src/render/nodeViewFactory.test.ts :: contains a simple rebuild failure after destroying its old children

repro:

```bash
npx rstest 'src/render/nodeViewFactory.test.ts' --testNamePattern 'contains a simple rebuild failure after destroying its old children'
```

details:

```json
{
  "testPath": "src/render/nodeViewFactory.test.ts",
  "project": "rstest",
  "fullName": "contains a simple rebuild failure after destroying its old children",
  "status": "fail",
  "duration": 0,
  "retryCount": 0,
  "errors": [
    {
      "type": "Error",
      "message": "rebuild",
      "topFrame": {
        "file": "src/render/nodeViewFactory.test.ts",
        "line": 129,
        "column": 86,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/render/nodeViewFactory.test.ts",
      "line": 129
    },
    {
      "path": "src/render/nodeViewFactory.ts",
      "line": 43
    }
  ]
}
```

codeFrame (error 1):

```text
127 |   const root = new Container();
128 |   const child = root.addChild(new Container());
129 |   const factory = rs.fn().mockReturnValueOnce(root).mockImplementation(() => { throw new Error('rebuild'); });
    |                                                                                      ^
130 |   const pool = new NodeViewPool(factory);
131 |   expect(pool.obtain('position:seat', node, ctx)).toBe(root);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run nodeViewFactory

STEP 13 — Containment RED exit: 1
NEXT: Implement per-key containment and cleanup.

STEP 14 — Containment implemented: failed entries evicted and disposed, destroy caught per entry, warnings once per key for pool lifetime.
NEXT: Run GREEN and required SDK noEmit/lint checks.

> @org-hierarchy/sdk@1.1.1 test
> rstest run nodeViewFactory

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:40:17.983Z"
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
    "total": 652,
    "build": 172,
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

- src/render/nodeViewFactory.test.ts :: normalizes simple views and destroys the old visual before rebuilding
- src/render/nodeViewFactory.test.ts :: retains seen entries, sweeps unseen entries, recreates on reappearance and clears once
- src/render/nodeViewFactory.test.ts :: contains create and simple callback exceptions and warns once per key
- src/render/nodeViewFactory.test.ts :: contains update failure, disposes the failed entry and allows recovery
- src/render/nodeViewFactory.test.ts :: continues sweep and teardown after a host destroy throws
- src/render/nodeViewFactory.test.ts :: rejects invalid host roots and entries: null
- src/render/nodeViewFactory.test.ts :: rejects invalid host roots and entries: {}
- src/render/nodeViewFactory.test.ts :: contains a simple rebuild failure after destroying its old children

### Skipped

None.

## Failures

No test failures reported.

STEP 15 — Containment GREEN exit: 0
NEXT: SDK noEmit check.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/render/nodeViewFactory.test.ts(11,17): error TS2322: Type 'RstestUtilities' is not assignable to type 'MaybePromise<void>'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

STEP 16 — SDK typecheck exit: 1
NEXT: Lint check.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


STEP 17 — Lint exit: 0
NEXT: Inspect results.
STEP 18 — Validation result and fix
All eight focused tests passed; lint passed. SDK noEmit found a test afterEach callback returning RstestUtilities; changed the callback to return void.
NEXT: Rerun focused tests and required checks after the fix.

> @org-hierarchy/sdk@1.1.1 test
> rstest run nodeViewFactory

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:40:44.540Z"
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
    "total": 668,
    "build": 168,
    "tests": 500
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

- src/render/nodeViewFactory.test.ts :: normalizes simple views and destroys the old visual before rebuilding
- src/render/nodeViewFactory.test.ts :: retains seen entries, sweeps unseen entries, recreates on reappearance and clears once
- src/render/nodeViewFactory.test.ts :: contains create and simple callback exceptions and warns once per key
- src/render/nodeViewFactory.test.ts :: contains update failure, disposes the failed entry and allows recovery
- src/render/nodeViewFactory.test.ts :: continues sweep and teardown after a host destroy throws
- src/render/nodeViewFactory.test.ts :: rejects invalid host roots and entries: null
- src/render/nodeViewFactory.test.ts :: rejects invalid host roots and entries: {}
- src/render/nodeViewFactory.test.ts :: contains a simple rebuild failure after destroying its old children

### Skipped

None.

## Failures

No test failures reported.

STEP 19 — Final focused tests exit: 0
NEXT: Final SDK noEmit.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


STEP 20 — Final SDK typecheck exit: 0
NEXT: Final lint.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


STEP 21 — Final lint exit: 0
NEXT: Final scope review.
STEP 22 — Final review and runtime checkpoint attempt
Changed source scope: packages/sdk/src/render/nodeViewFactory.ts and nodeViewFactory.test.ts only; this log was appended throughout. Existing concurrent React/core/report work was left untouched. No build, root typecheck, emitting tsc, branch/worktree changes, commits, pushes, or unrelated tests were run.
The higher-priority session guard required a runtime checkpoint attempt. It failed with exit 1 before checkpoint creation: mktemp could not create the registered receipt directory (Operation not permitted). No checkpoint success is claimed; no alternative store was used.

DONE: Exported input/context/simple/retained/union types, normalization, keyed retained pool, mark-and-sweep, teardown, and warn-once containment.
TESTED: Eight focused tests passed; all newly introduced behavior tests first observed RED. SDK noEmit typecheck and lint passed. Complete command output is above without pipes.
FINDINGS: Simple factories rebuild the whole root and recursively destroy the prior visual before invoking the factory; retained factories update the same entry/root. Failed pooled entries are removed and cleanup errors cannot abort other entries' cleanup. R3-B must consume obtain's nullable result and mark seen keys per completed render pass.
SCREENSHOTS: Not applicable to this pure lifecycle module.
FLOW: beginPass -> obtain(kind:id, input, context) -> markSeen(kind:id) -> endPass; clearAll on teardown. Failed obtain returns null for the renderer fallback.
POST-DEPLOY: Not performed; deployment and renderer integration are outside this assigned slice.
NEXT: R3-B integration by its assigned owner.
STATUS: R3-A DONE — 8 tests PASS; SDK typecheck PASS; lint PASS.
