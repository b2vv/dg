# impl E-A — EmphasisStore (внутрішній рефактор)

Гілка feat/emphasis-store. Виконавець: Codex exec (background). Координатор: Claude.
Бриф: scratchpad/codex-emphasis-E-A.md. GATE-2 рев.2 = GREEN (B1 string, B2 безумовне чищення, нижче порога).

NEXT (координатор): запустити Codex, стежити watch_codex, по завершенню — рев'ю дифу + червоний-якщо-видалити.
NEXT: Read revision 2 plan/spec, instructions, and current facade/store before RED tests.
FACT: Branch is feat/emphasis-store; existing unrelated work is present and will be preserved. Read plan/spec revision 2 and .ai/README.md.
DECISION: Explicit task scope takes precedence over plan table's renderer mention and spec's dedup wording: renderer remains untouched, existing repaint calls remain unchanged.
NEXT: Read TDD skill, repository standards/briefing and relevant implementation/test fixtures.
FACT: All specified facade emphasis accesses match the task. Read store pattern and standards; initial combined briefing output was truncated, requiring focused reads.
DECISION: Apply TDD skill using user-approved store, slot-prop, renderer-spy and interaction seams. No additional approval needed.
NEXT: Inspect focused fixtures and briefing context, then write RED tests.
FACT: Existing facade tests mount real diagrams with matchMedia stub and renderer prototype spies. Briefing refreshed 2026-11-06; live host link constraint confirmed.
NEXT: Read exact slot-prop and key expansion seams without broad output.
FACT: Slot-prop state is exposed by existing getNode(ref).getState(); no new public accessor needed. Found expansion stays in facade. SDK typecheck uses its dedicated configuration.
DECISION: Tests will assert real facade outputs plus the explicitly requested internal emphasis ownership, so reverting routing is observable.
NEXT: Add store and facade tests before production code.
FACT: SDK check config explicitly has noEmit:true and includes tests. Initial key helper path guess did not exist; searching its definition instead.
NEXT: Write tests using literal entity keys and type-checked string assignment.
FACT: Added five store tests and four facade tests before implementation. Tests cover identity, empty/null, string typing, snapshots, clear, slot state, expanded keys, overlapping data and interaction separation.
NEXT: Run both authorized targeted commands for RED; capture complete stdout/stderr and actual exit codes.

FACT: RED command: npm test -w @org-hierarchy/sdk -- EmphasisStore
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run EmphasisStore

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
npm error command sh -c rstest run EmphasisStore

```
FACT: Exit code: 1
NEXT: Implement only after inspecting RED failures.

FACT: RED command: npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram

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
npm error command sh -c rstest run OrgHierarchyDiagram

```
FACT: Exit code: 1
NEXT: Implement only after inspecting RED failures.

FACT: Sandbox denied rstest local listener (::1:3000); neither result is behavioral RED.
NEXT: Retry authorized tests with sandbox escalation for local listener.

FACT: RED retry: npm test -w @org-hierarchy/sdk -- EmphasisStore
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run EmphasisStore

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T11:16:45.266Z"
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
    "total": 760,
    "build": 133,
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

### [F01] src/state/EmphasisStore.test.ts

repro:

```bash
npx rstest 'src/state/EmphasisStore.test.ts'
```

details:

```json
{
  "testPath": "src/state/EmphasisStore.test.ts",
  "project": "rstest",
  "fullName": "",
  "status": "fail",
  "retryCount": 0,
  "errors": [
    {
      "type": "Error",
      "message": "Cannot find module './EmphasisStore.js'",
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
npm error command sh -c rstest run EmphasisStore

```
FACT: Exit code: 1
NEXT: Inspect failures before implementation.

FACT: RED retry: npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram
```text

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T11:16:46.896Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 11,
    "failedFiles": 1,
    "tests": 90,
    "failedTests": 4,
    "passedTests": 86,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1312,
    "build": 165,
    "tests": 1147
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

### [F01] src/OrgHierarchyDiagram.emphasis.test.ts :: OrgHierarchyDiagram emphasis > success: highlight drives existing slot state and repaint without rebuilding

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.emphasis.test.ts' --testNamePattern 'OrgHierarchyDiagram emphasis > success: highlight drives existing slot state and repaint without rebuilding'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.emphasis.test.ts",
  "project": "rstest",
  "fullName": "OrgHierarchyDiagram emphasis > success: highlight drives existing slot state and repaint without rebuilding",
  "status": "fail",
  "duration": 21,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "Cannot read properties of undefined (reading 'highlight')",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.emphasis.test.ts",
        "line": 40,
        "column": 32,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.emphasis.test.ts",
      "line": 40
    }
  ]
}
```

codeFrame (error 1):

```text
38 |     const render = rstest.spyOn(DiagramRenderer.prototype, 'render');
39 |     diagram.highlightPath('a');
40 |     expect(diagram['emphasis'].highlight).toBe('a');
   |                                ^
41 |     expect(node?.getState().hovered).toBe(true);
42 |     expect(repaint).toHaveBeenLastCalledWith('a', null, data().reportLines, expect.anything());
```

### [F02] src/OrgHierarchyDiagram.emphasis.test.ts :: OrgHierarchyDiagram emphasis > success: expands bare ids and preserves typed keys before repaint

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.emphasis.test.ts' --testNamePattern 'OrgHierarchyDiagram emphasis > success: expands bare ids and preserves typed keys before repaint'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.emphasis.test.ts",
  "project": "rstest",
  "fullName": "OrgHierarchyDiagram emphasis > success: expands bare ids and preserves typed keys before repaint",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "Cannot read properties of undefined (reading 'found')",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.emphasis.test.ts",
        "line": 56,
        "column": 32,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.emphasis.test.ts",
      "line": 56
    }
  ]
}
```

codeFrame (error 1):

```text
54 |     diagram.setFoundFocus(['a', 'person:b', '', 'a']);
55 |     const expected = new Set(['position:a', 'organization:a', 'person:a', 'person:b']);
56 |     expect(diagram['emphasis'].found).toEqual(expected);
   |                                ^
57 |     expect(repaint).toHaveBeenLastCalledWith(null, expected, data().reportLines, expect.anything());
58 |     expect(repaint.mock.calls[0]?.[1]).toBe(diagram['emphasis'].found);
```

### [F03] src/OrgHierarchyDiagram.emphasis.test.ts :: OrgHierarchyDiagram emphasis > failure: setData clears both fields even when highlighted and found ids survive

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.emphasis.test.ts' --testNamePattern 'OrgHierarchyDiagram emphasis > failure: setData clears both fields even when highlighted and found ids survive'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.emphasis.test.ts",
  "project": "rstest",
  "fullName": "OrgHierarchyDiagram emphasis > failure: setData clears both fields even when highlighted and found ids survive",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "Cannot read properties of undefined (reading 'state')",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.emphasis.test.ts",
        "line": 69,
        "column": 32,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.emphasis.test.ts",
      "line": 69
    }
  ]
}
```

codeFrame (error 1):

```text
67 |     diagram.setFoundFocus('a');
68 |     diagram.highlightPath('a');
69 |     expect(diagram['emphasis'].state).toEqual({
   |                                ^
70 |       found: new Set(['position:a', 'organization:a', 'person:a']), highlight: 'a',
71 |     });
```

### [F04] src/OrgHierarchyDiagram.emphasis.test.ts :: OrgHierarchyDiagram emphasis > success: emphasis and interaction have independent state owners

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.emphasis.test.ts' --testNamePattern 'OrgHierarchyDiagram emphasis > success: emphasis and interaction have independent state owners'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.emphasis.test.ts",
  "project": "rstest",
  "fullName": "OrgHierarchyDiagram emphasis > success: emphasis and interaction have independent state owners",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "TypeError",
      "message": "Cannot read properties of undefined (reading 'highlight')",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.emphasis.test.ts",
        "line": 87,
        "column": 32,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/OrgHierarchyDiagram.emphasis.test.ts",
      "line": 87
    }
  ]
}
```

codeFrame (error 1):

```text
85 |     diagram.setFoundFocus('a');
86 |     diagram.highlightPath('a');
87 |     expect(diagram['emphasis'].highlight).toBe('a');
   |                                ^
88 |     expect(diagram['emphasis'].found).not.toBeNull();
89 |     expect(changed).not.toHaveBeenCalled();
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram

```
FACT: Exit code: 1
NEXT: Inspect failures before implementation.
FACT: RED confirmed: store import absent; all four new facade tests fail on absent emphasis ownership; 86 existing facade tests pass.
FACT: Implemented plain EmphasisStore, migrated exact requested facade accesses, removed only two ViewStateStore fields. Renderer, barrel and USAGE untouched.
NEXT: Run GREEN targeted tests, SDK noEmit check and lint, preserving full outputs.

FACT: Validation: npm test -w @org-hierarchy/sdk -- EmphasisStore
````text

> @org-hierarchy/sdk@1.1.1 test
> rstest run EmphasisStore

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T11:17:33.809Z"
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
    "total": 316,
    "build": 24,
    "tests": 292
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

- src/state/EmphasisStore.test.ts :: EmphasisStore > success: stores the supplied found set as-is, including an empty set
- src/state/EmphasisStore.test.ts :: EmphasisStore > success: exposes a string highlight in both accessors
- src/state/EmphasisStore.test.ts :: EmphasisStore > failure: empty and null highlights clear an existing id
- src/state/EmphasisStore.test.ts :: EmphasisStore > success: state exposes both current values
- src/state/EmphasisStore.test.ts :: EmphasisStore > failure: clear unconditionally resets both populated fields

### Skipped

None.

## Failures

No test failures reported.

````
FACT: Exit code: 0
NEXT: Inspect validation and final diff.

FACT: Validation: npm test -w @org-hierarchy/sdk -- OrgHierarchyDiagram
````text

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-06T11:17:35.403Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 11,
    "failedFiles": 0,
    "tests": 90,
    "failedTests": 0,
    "passedTests": 90,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 1316,
    "build": 112,
    "tests": 1204
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

- src/OrgHierarchyDiagram.counts.test.ts :: subordinate counts ingestion > success: setData supplies counts shared by getData and the card badge
- src/OrgHierarchyDiagram.counts.test.ts :: subordinate counts ingestion > success: the first scene from create() carries counts without any setData
- src/OrgHierarchyDiagram.counts.test.ts :: subordinate counts ingestion > failure: stale host counts are overwritten, including removal from leaves
- src/OrgHierarchyDiagram.counts.test.ts :: subordinate counts ingestion > success: appendData recomputes the full tree and turns a leaf into a parent
- src/OrgHierarchyDiagram.counts.test.ts :: subordinate counts ingestion > failure: rejected append mapper preserves computed counts
- src/OrgHierarchyDiagram.emphasis.test.ts :: OrgHierarchyDiagram emphasis > success: highlight drives existing slot state and repaint without rebuilding
- src/OrgHierarchyDiagram.emphasis.test.ts :: OrgHierarchyDiagram emphasis > success: expands bare ids and preserves typed keys before repaint
- src/OrgHierarchyDiagram.emphasis.test.ts :: OrgHierarchyDiagram emphasis > failure: setData clears both fields even when highlighted and found ids survive
- src/OrgHierarchyDiagram.emphasis.test.ts :: OrgHierarchyDiagram emphasis > success: emphasis and interaction have independent state owners
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: an untouched staff host keeps local hover and selection callbacks
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: selection parity and additive state subscription with unsubscribe
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: a throwing subscriber cannot prevent selection or later subscribers
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: unchanged data retains hover; disappearance clears stale hover
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: an unknown ref is accepted then reconciled by kind, not bare id
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: subscriptions opt in once and mounted Pixi hover drives state and paint
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: destroy disposes hover paint and cannot rewire or schedule another frame
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: renderer shares hover and repaints changes without rebuilding the scene
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: absent onMarquee never installs or clears a sink
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > failure: destroy clears the installed sink and retained callbacks become inert
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > failure: a throwing host warns once while later frames and selection continue
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: marquee unions with live selection in order, deduplicates and preserves empty hits
- src/OrgHierarchyDiagram.marquee.test.ts :: facade marquee > success: opt-in installs a sink and forwards each world rectangle and null
- src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > passes a simple factory unchanged to the renderer
- src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > passes a retained factory unchanged to the renderer
- src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > explicitly selects the unchanged built-in path when nodeView is omitted
- src/OrgHierarchyDiagram.nodeview.test.ts :: nodeView facade configuration > exports all five node-view types from the public barrel
- src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > reads selection and hover by kind and id without opting in on reads
- src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > uses pointer modifiers to add, toggle off, and replace selection
- src/OrgHierarchyDiagram.r2.test.ts :: R2 host interaction primitives > composes the host seam with the same hover and selection consumed by Pixi
- src/OrgHierarchyDiagram.transitions.e2e.test.ts :: carries a staff collapse through the real facade, Pixi controller and React overlay, then stays idle
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: the first render and LOD crossings supply snap
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: settling publishes structural after per-frame transition delivery
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: a snap caller cannot erase queued animate intent and the next pass resets it
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: structural operations animate, theme and style passes snap
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > failure: a refused pass aborts and does not start the transition
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: omitted animate keeps transition lifecycle inactive
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: export settles before accessing the raster scene
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: destroy disables the controller before destroying the host
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: refit with animation never prepares target-frame overlay cards
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: backdrop teardown settles and redraws Pixi chrome
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > success: resolves opt-in physics once at creation
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > failure: reduced motion disables an opted-in transition
- src/OrgHierarchyDiagram.transitions.test.ts :: facade transitions > failure: one throwing transition subscriber cannot block the next subscriber or frame
- src/OrgHierarchyDiagram.wheel.test.ts :: facade wheel configuration > leaves omitted wheel config undefined and preserves Viewport defaults
- src/OrgHierarchyDiagram.wheel.test.ts :: facade wheel configuration > honors pan-only configuration instead of falling back to modifier zoom
- src/OrgHierarchyDiagram.wheel.test.ts :: facade wheel configuration > forwards public wheel config through PixiHost to the mounted Viewport
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: search Alice returns hits
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > failure: search empty → []
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: revealPath expands ancestors
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: expandOrg on child keeps root visible (A12)

Note: list truncated (showing 50 of 90).

### Skipped

None.

## Failures

No test failures reported.

````
FACT: Exit code: 0
NEXT: Inspect validation and final diff.

FACT: Validation: npm run typecheck -w @org-hierarchy/sdk
````text

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json

src/render/highlight.test.ts(48,33): error TS2339: Property 'highlightedNode' does not exist on type 'ViewStateStore'.
src/render/highlight.test.ts(49,33): error TS2339: Property 'foundFocus' does not exist on type 'ViewStateStore'.
src/render/highlight.test.ts(52,33): error TS2339: Property 'foundFocus' does not exist on type 'ViewStateStore'.
src/render/highlight.test.ts(53,33): error TS2339: Property 'highlightedNode' does not exist on type 'ViewStateStore'.
src/render/highlight.test.ts(109,31): error TS2339: Property 'highlightedNode' does not exist on type 'ViewStateStore'.
src/render/highlight.test.ts(110,31): error TS2339: Property 'foundFocus' does not exist on type 'ViewStateStore'.
src/render/highlight.test.ts(159,33): error TS2339: Property 'foundFocus' does not exist on type 'ViewStateStore'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

````
FACT: Exit code: 1
NEXT: Inspect validation and final diff.

FACT: Validation: npm run lint
````text

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


````
FACT: Exit code: 0
NEXT: Inspect validation and final diff.
FACT: GREEN: EmphasisStore 5/5; OrgHierarchyDiagram 90/90; lint exit 0. Runner itself lists only 50 passed names; its full raw output is preserved above without shell pipes or filtering.
FACT: SDK noEmit typecheck exit 1: seven references in existing src/render/highlight.test.ts to removed ViewStateStore fields. This is a necessary test migration outside the explicit allowed file list.
QUESTION: May I migrate those seven existing assertions to EmphasisStore? Asked asynchronously; awaiting user authorization before touching that file.
NEXT: Inspect final diff and stale references while authorization is pending.

FACT: Final search found no production viewState emphasis references; only seven existing test assertions remain. git diff --check passed. Corrected placement so the existing interaction comment still describes InteractionStore.
NEXT: Await scope answer; inspect native checkpoint registration without reading transcripts.
FACT: Native checkpoint attempted using current registered codex identity; sandbox denied receipt directory access. Automatic approval review rejected escalation because the receipt is outside the repository and user prohibited such writes. No checkpoint was created; no workaround attempted.
QUESTION: Scope approval remains pending for seven existing highlight.test.ts assertions. Native receipt writing also requires explicit approval after automatic-review rejection.
FACT: Implementation scope is five files plus this append-only log; renderer, index.ts and USAGE remain unchanged. No build, emitting tsc, commit, push, branch switch or worktree operation was run.
NEXT: On authorization, migrate existing assertions and repeat SDK noEmit typecheck and required validation. Separate mutation execution was not performed; initial RED and full GREEN evidence are recorded above.
STATUS: BLOCKED — targeted tests and lint pass; SDK typecheck requires an out-of-scope existing-test migration; native checkpoint rejected.
