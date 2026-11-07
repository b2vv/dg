NEXT: Read wiring and agreed contracts, then write the first failing seam test.
STEP 1 — Brief read in full; R2-A overlay interface inspected. Scope: assigned facade/barrel/usage/test files only, plus this append-only log. No builds, root typecheck, emitted types, commits, branch changes, external store, or unrelated tests. TDD seam is explicitly authorized by R2-B.
NEXT: Coordinator must reconcile the brief with the actual overlay creation boundary before implementation.
STEP 2 — BLOCKED: inspected facade, React entry point, host call sites, selection notification, plan and spec.
EVIDENCE:
- OrgHierarchyDiagram.ts has no import or call of createReactPromoteOverlay and no overlay creation options to extend. The existing production caller is packages/demo/src/app/App.ts:701, outside the exclusive file list.
- packages/sdk/src/react/index.ts exports createReactPromoteOverlay from react/createReactPromoteOverlay.ts. The main index.ts does not own or wrap this factory. Changing the main barrel alone would not affect existing React-entry-point callers.
- The actual facade pointer-selection method is private handleNodeSelect (OrgHierarchyDiagram.ts:793); handlePointerSelect is on InteractionStore.
- OrgHierarchyDiagram.ts:353-358 already calls notifyPromoteSync() on every selection change, defaulting to structural. Merely adapting card select to the existing store would therefore still rebuild the overlay, contrary to step 2 / AC3.
DECISION: No speculative new facade factory/getter, no edits to R2-A-owned React files or demo, no test against an invented public seam. Coordinator must specify an authorized creation/adapter boundary and how selection promotion semantics coexist with AC3.
VALIDATION: No tests, typecheck, or lint executed; implementation has not started, so there is no RED/GREEN evidence or test output to report. No source files edited. Existing concurrent changes preserved. No builds, emitted types, commits, pushes, branch/worktree switches, or external-store writes performed.
STATUS: BLOCKED — brief assumes a nonexistent facade overlay creation point; seam and selection-sync contract require correction.
NEXT: Inspect existing facade interaction tests and store, then add the first failing R2 test.
STEP 1 — Read R2-B in full and plan section 4. Confirmed feat/extensibility; existing unrelated changes will be preserved. Scope: three additive facade methods, focused tests, USAGE; barrel only if needed. No builds, emitting typechecks, branch changes, commits, pushes, or external stores. Using /Users/strelia/.agents/skills/tdd/SKILL.md at the user-approved facade seam. NodeRef and SelectionPointerMods already exported. Coordinator owns subsequent review/demo wiring.
NEXT: Run NB-A regression RED before adding readers.
STEP 2 — Inspected existing mounted facade interaction tests, D1 store, renderer wiring, and host overlay option. Readers will compare NodeRef kind+id without opting in; selectNode will reuse handleNodeSelect (store pointer semantics plus repaint). Tests use mounted facade and renderer public methods, no private-store access. Existing public types suffice; index.ts needs no change. Pre-code acceptance: readers track selection/hover and distinguish kinds; Shift toggles; composed host seam shares renderer hover and selection. No new architecture or deployment work.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.r2

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
npm error command sh -c rstest run OrgHierarchyDiagram.r2

RED NB-A exit: 1

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.r2

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:50:39.610Z"
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
    "total": 1290,
    "build": 383,
    "tests": 907
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

### [F01] src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > reads selection and hover by kind and id without opting in on reads

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.r2.test.ts' --testNamePattern 'R2 host interaction primitives > reads selection and hover by kind and id without opting in on reads'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.r2.test.ts",
  "project": "rstest",
  "fullName": "R2 host interaction primitives > reads selection and hover by kind and id without opting in on reads",
  "status": "fail",
  "duration": 92,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "diagram.isSelected is not a function",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.r2.test.ts",
        "line": 29,
        "column": 20,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.r2.test.ts",
      "line": 29
    }
  ]
}
```

codeFrame (error 1):

```text
27 |     const source = rstest.spyOn(DiagramRenderer.prototype, 'setInteractionSource');
28 |     const diagram = await mount();
29 |     expect(diagram.isSelected(posRef('a'))).toBe(false);
   |                    ^
30 |     expect(diagram.isHovered(posRef('a'))).toBe(false);
31 |     expect(source).not.toHaveBeenCalled();
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.r2

STEP 3 — NB-A RED retry exit: 1
NEXT: Verify NB-A GREEN.
STEP 4 — RED confirmed missing isSelected. Added read-only kind/id queries against the existing InteractionStore. Correction to step 2: handleNodeSelect only delegates to the store; the new public selectNode must also explicitly repaint selection.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.r2

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:51:13.811Z"
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
    "total": 863,
    "build": 218,
    "tests": 645
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

- src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > reads selection and hover by kind and id without opting in on reads

### Skipped

None.

## Failures

No test failures reported.

STEP 5 — NB-A GREEN exit: 0
NEXT: Run NB-B and composed-seam tests RED.
STEP 6 — NB-A GREEN (1 test). Added modifier add/remove/replace behavior and a typed host adapter test observing renderer selection repaint and bidirectional shared hover, including unsubscribe.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.r2

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:51:46.649Z"
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
    "total": 995,
    "build": 372,
    "tests": 623
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

### [F01] src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > uses pointer modifiers to add, toggle off, and replace selection

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.r2.test.ts' --testNamePattern 'R2 host interaction primitives > uses pointer modifiers to add, toggle off, and replace selection'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.r2.test.ts",
  "project": "rstest",
  "fullName": "R2 host interaction primitives > uses pointer modifiers to add, toggle off, and replace selection",
  "status": "fail",
  "duration": 41,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "diagram.selectNode is not a function",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.r2.test.ts",
        "line": 50,
        "column": 13,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.r2.test.ts",
      "line": 50
    }
  ]
}
```

codeFrame (error 1):

```text
48 |     const shift = { shiftKey: true, ctrlKey: false, metaKey: false };
49 |     await diagram.select(posRef('a'));
50 |     diagram.selectNode(posRef('b'), shift);
   |             ^
51 |     expect(diagram.getSelections()).toEqual([posRef('a'), posRef('b')]);
52 |     diagram.selectNode(posRef('a'), shift);
```

### [F02] src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.r2.test.ts' --testNamePattern 'R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.r2.test.ts",
  "project": "rstest",
  "fullName": "R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "diagram.selectNode is not a function",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.r2.test.ts",
        "line": 66,
        "column": 37,
        "method": "Object.select"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.r2.test.ts",
      "line": 66
    }
  ]
}
```

codeFrame (error 1):

```text
64 |       isHovered: (id) => diagram.isHovered(posRef(id)),
65 |       subscribe: (callback) => diagram.subscribeInteraction(callback),
66 |       select: (id, mods) => diagram.selectNode(posRef(id), mods),
   |                                     ^
67 |       hover: (id, on) => diagram.setHovered(on ? posRef(id) : null),
68 |     } satisfies NonNullable<ReactPromoteOverlayOptions['interaction']>;
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.r2

STEP 7 — NB-B RED exit: 1
NEXT: Run focused GREEN, SDK noEmit typecheck, lint, and docs gate.
STEP 8 — NB-B RED confirmed missing selectNode in both new tests. Implemented pointer-selection delegation plus repaint. Documented all three new methods, modifier behavior, host-owned overlay composition, bound subscription, same-store semantics, and inert default. NodeRef/SelectionPointerMods already public; no barrel edit needed.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.r2

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:52:18.592Z"
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
    "total": 509,
    "build": 107,
    "tests": 402
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

- src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > reads selection and hover by kind and id without opting in on reads
- src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > uses pointer modifiers to add, toggle off, and replace selection
- src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi

### Skipped

None.

## Failures

No test failures reported.

STEP 9 — R2 GREEN exit: 0

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

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

STEP 10 — SDK noEmit typecheck exit: 1

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


STEP 11 — lint exit: 0

> org-hierarchy@0.1.0 check:docs
> node scripts/check-docs.mjs

· брифінг відстає на 15 комітів з 25 дозволених
✅ дока свіжа: лінки резолвяться, публічний API описаний, барель без тест-хуків, брифінг у межах

STEP 12 — check:docs exit: 0
NEXT: Rerun final checks after correcting test types.
STEP 13 — Three tests GREEN; lint and check:docs PASS. SDK typecheck identified test-only typing defects: invalid 'org' NodeKind and an adapter parameter inferred as required. Corrected to 'organization' and explicitly optional SelectionPointerMods. Production methods unchanged.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


STEP 14 — SDK noEmit typecheck retry exit: 0

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


STEP 15 — lint final exit: 0

NEXT: Verify regression detection for isSelected.
MUTATION: isSelected

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.r2

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:53:11.797Z"
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
    "total": 592,
    "build": 139,
    "tests": 453
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

### [F01] src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > reads selection and hover by kind and id without opting in on reads

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.r2.test.ts' --testNamePattern 'R2 host interaction primitives > reads selection and hover by kind and id without opting in on reads'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.r2.test.ts",
  "project": "rstest",
  "fullName": "R2 host interaction primitives > reads selection and hover by kind and id without opting in on reads",
  "status": "fail",
  "duration": 56,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected false to be true // Object.is equality",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.r2.test.ts",
        "line": 36,
        "column": 45,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.r2.test.ts",
      "line": 36
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
34 |     await diagram.select(posRef('a'));
35 |     diagram.setHovered(posRef('b'));
36 |     expect(diagram.isSelected(posRef('a'))).toBe(true);
   |                                             ^
37 |     expect(diagram.isSelected(posRef('b'))).toBe(false);
38 |     expect(diagram.isSelected({ kind: 'organization', id: 'a' })).toBe(false);
```

### [F02] src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.r2.test.ts' --testNamePattern 'R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.r2.test.ts",
  "project": "rstest",
  "fullName": "R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected false to be true // Object.is equality",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.r2.test.ts",
        "line": 73,
        "column": 41,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.r2.test.ts",
      "line": 73
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
71 |     const unsubscribe = interaction.subscribe(changed);
72 |     interaction.select('a');
73 |     expect(interaction.isSelected('a')).toBe(true);
   |                                         ^
74 |     expect(repaint).toHaveBeenLastCalledWith([posRef('a')]);
75 |     interaction.hover('b', true);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.r2

MUTATION EXIT: 1

NEXT: Verify regression detection for isHovered.
MUTATION: isHovered

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.r2

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:53:12.699Z"
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
    "total": 590,
    "build": 135,
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

## Failures

### [F01] src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > reads selection and hover by kind and id without opting in on reads

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.r2.test.ts' --testNamePattern 'R2 host interaction primitives > reads selection and hover by kind and id without opting in on reads'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.r2.test.ts",
  "project": "rstest",
  "fullName": "R2 host interaction primitives > reads selection and hover by kind and id without opting in on reads",
  "status": "fail",
  "duration": 58,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected false to be true // Object.is equality",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.r2.test.ts",
        "line": 39,
        "column": 44,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.r2.test.ts",
      "line": 39
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
37 |     expect(diagram.isSelected(posRef('b'))).toBe(false);
38 |     expect(diagram.isSelected({ kind: 'organization', id: 'a' })).toBe(false);
39 |     expect(diagram.isHovered(posRef('b'))).toBe(true);
   |                                            ^
40 |     expect(diagram.isHovered(posRef('a'))).toBe(false);
41 |     expect(diagram.isHovered({ kind: 'organization', id: 'b' })).toBe(false);
```

### [F02] src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.r2.test.ts' --testNamePattern 'R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.r2.test.ts",
  "project": "rstest",
  "fullName": "R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected false to be true // Object.is equality",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.r2.test.ts",
        "line": 76,
        "column": 40,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.r2.test.ts",
      "line": 76
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
74 |     expect(repaint).toHaveBeenLastCalledWith([posRef('a')]);
75 |     interaction.hover('b', true);
76 |     expect(interaction.isHovered('b')).toBe(true);
   |                                        ^
77 |     const rendererSource = source.mock.calls[0]?.[0];
78 |     expect(rendererSource?.getHovered()).toEqual(posRef('b'));
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.r2

MUTATION EXIT: 1

NEXT: Verify regression detection for selectNode modifiers.
MUTATION: selectNode modifiers

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.r2

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:53:13.562Z"
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
    "total": 521,
    "build": 101,
    "tests": 420
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

### [F01] src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > uses pointer modifiers to add, toggle off, and replace selection

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.r2.test.ts' --testNamePattern 'R2 host interaction primitives > uses pointer modifiers to add, toggle off, and replace selection'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.r2.test.ts",
  "project": "rstest",
  "fullName": "R2 host interaction primitives > uses pointer modifiers to add, toggle off, and replace selection",
  "status": "fail",
  "duration": 47,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [ { kind: 'position', id: 'b' } ] to deeply equal [ { kind: 'position', id: 'a' }, …(1) ]",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.r2.test.ts",
        "line": 52,
        "column": 37,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.r2.test.ts",
      "line": 52
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
-     "id": "a",
-     "kind": "position",
-   },
-   {
      "id": "b",
      "kind": "position",
    },
  ]
```

codeFrame (error 1):

```text
50 |     await diagram.select(posRef('a'));
51 |     diagram.selectNode(posRef('b'), shift);
52 |     expect(diagram.getSelections()).toEqual([posRef('a'), posRef('b')]);
   |                                     ^
53 |     diagram.selectNode(posRef('a'), shift);
54 |     expect(diagram.getSelections()).toEqual([posRef('b')]);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.r2

MUTATION EXIT: 1

NEXT: Verify regression detection for selectNode repaint.
MUTATION: selectNode repaint

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.r2

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:53:14.336Z"
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
    "total": 483,
    "build": 88,
    "tests": 395
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

### [F01] src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.r2.test.ts' --testNamePattern 'R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.r2.test.ts",
  "project": "rstest",
  "fullName": "R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi",
  "status": "fail",
  "duration": 44,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected last \"repaintSelection\" call to have been called with [ [ { kind: 'position', id: 'a' } ] ]",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.r2.test.ts",
        "line": 74,
        "column": 21,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.r2.test.ts",
      "line": 74
    }
  ]
}
```

diff:

```diff
- Expected:
[
  [
    {
      "id": "a",
      "kind": "position",
    },
  ],
]

+ Received:
undefined
```

codeFrame (error 1):

```text
72 |     interaction.select('a');
73 |     expect(interaction.isSelected('a')).toBe(true);
74 |     expect(repaint).toHaveBeenLastCalledWith([posRef('a')]);
   |                     ^
75 |     interaction.hover('b', true);
76 |     expect(interaction.isHovered('b')).toBe(true);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.r2

MUTATION EXIT: 1

STEP 16 — Restored exact production source after independent reader, modifier, and repaint mutations.
NEXT: Verify restored final tests.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.r2

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T04:53:15.055Z"
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
    "total": 440,
    "build": 90,
    "tests": 350
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

- src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > reads selection and hover by kind and id without opting in on reads
- src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > uses pointer modifiers to add, toggle off, and replace selection
- src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi

### Skipped

None.

## Failures

No test failures reported.

STEP 17 — Final restored test exit: 0
NEXT: Coordinator review and separate R2-C-demo wiring.
STEP 18 — Final author inspection: only assigned OrgHierarchyDiagram.ts, docs/USAGE.md, OrgHierarchyDiagram.r2.test.ts and this log edited. index.ts unchanged because both public types already exist. git diff --check PASS. All four mutations independently failed for the intended assertion (selection reader, hover reader, modifiers, repaint); exact source restored and all 3 focused tests PASS. SDK noEmit typecheck PASS; lint PASS; check:docs PASS (briefing 15 commits behind, within 25).

DONE: Three additive facade methods and documented host-created overlay adapter; no duplicate state or selection semantics.
TESTED SCENARIOS: Empty/matching/nonmatching/kind-distinct readers, clear/reset, Shift add/remove, plain replace, renderer selection repaint, bidirectional shared hover, unsubscribe, passive reads. Full command outputs above, directly appended without pipes.
FINDINGS: Existing handleNodeSelect does not repaint; public selectNode explicitly does. subscribeInteraction needs a receiver-preserving wrapper. Selection retains existing structural promote sync.
SCREENSHOTS: N/A — no visual surface changed in this task.
USER FLOW: Host builds position-ref adapter, passes interaction to its own createReactPromoteOverlay call; callbacks and Pixi share D1 state. Without interaction, overlay remains inert.
POST-DEPLOY: Not run; builds/deployment outside this brief. Coordinator owns review and demo wiring. No commit/push/branch/worktree changes or external-store writes.
SESSION CHECKPOINT: Higher-priority runtime checkpoint attempted with the current native session identity; exit 1, mktemp Operation not permitted in the registered receipt directory. No checkpoint saved; no escalation or alternate store used. Durable repository evidence is this append-only file.
STATUS: DONE — R2-B implemented; 3 tests GREEN, four mutations detected, SDK noEmit typecheck/lint/check:docs PASS.
