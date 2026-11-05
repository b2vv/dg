NEXT: Read the required facade lifecycle and plan sections, then establish RED for lazy opt-in.
FACT: Read D1-E.md in full. Only the two assigned source files and this append-only log will be changed. No builds, emitting typechecks, other tests, branch changes, commits, pushes, or external stores.
DECISION: The brief explicitly authorizes the facade/renderer seam and its spy assertions; follow TDD there. Existing unrelated working-tree changes are preserved.
FACT: Read plan sections 4.1 and 7, facade create/entry points/destroy, renderer source binding, and render coalescing. Source and paint subscription are currently eager; destroy already unsubscribes.
DECISION: Preserve selection delegates and renderer implementation. Test real staff-node hover with a call-through source spy, plus both opt-in entry points and teardown. No external checkpoint store will be used, per the brief.
NEXT: Add the untouched-host regression test before production edits.
FACT: Added the real staff-host regression test with call-through source observation, hover/alpha/paint checks, and selection callback parity. Production code is unchanged.
NEXT: Run the assigned test file for RED.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.interaction

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
npm error command sh -c rstest run OrgHierarchyDiagram.interaction
FACT: Initial RED attempt could not start: listen EPERM on ::1:3000 (full output above). This is not a behavioral RED.
NEXT: Retry the same permitted test with the needed sandbox permission, as required by the brief.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.interaction

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T22:04:54.697Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "fail",
  "counts": {
    "testFiles": 2,
    "failedFiles": 1,
    "tests": 44,
    "failedTests": 1,
    "passedTests": 43,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 952,
    "build": 193,
    "tests": 759
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

### [F01] src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: an untouched staff host keeps local hover and selection callbacks

repro:

```bash
npx rstest 'src/OrgHierarchyDiagram.interaction.test.ts' --testNamePattern 'facade interaction state > success: an untouched staff host keeps local hover and selection callbacks'
```

details:

```json
{
  "testPath": "src/OrgHierarchyDiagram.interaction.test.ts",
  "project": "rstest",
  "fullName": "facade interaction state > success: an untouched staff host keeps local hover and selection callbacks",
  "status": "fail",
  "duration": 20,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected \"rstest.fn()\" to not be called at all, but actually been called 1 times\n\nReceived:\n\n  1st rstest.fn() call:\n\n    Array [\n      Object {\n        \"getHovered\": [Function getHovered],\n        \"setHovered\": [Function setHovered],\n      },\n    ]\n\n\nNumber of calls: 1\n",
      "topFrame": {
        "file": "src/OrgHierarchyDiagram.interaction.test.ts",
        "line": 74,
        "column": 24,
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
72 |     const renderer = staffRenderer(diagram);
73 |     expect(renderer.layers.persons.children).toHaveLength(3);
74 |     expect(source).not.toHaveBeenCalled();
   |                        ^
75 |     const paint = rstest.spyOn(PixiHost.prototype, 'requestPaint');
76 |     hoverFirstSeat(renderer);
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run OrgHierarchyDiagram.interaction
FACT: Behavioral RED confirmed: untouched-host assertion received one eager source call (43 passed, 1 failed). Full runner output is above; the exact required filter selects two files.
FACT: Added subscribe opt-in/idempotence with real Pixi hover, dimming, store notification and repaint; adjusted the setHovered test for lazy wiring; added paint-subscription disposal and post-destroy no-rAF checks.
NEXT: Move the eager block into the guarded private helper and call it from both public intent entry points.
FACT: Removed eager create wiring. ensureInteractionWired guards destroyed/unavailable/already-wired instances, attaches the source and hover paint subscription, and runs from subscribeInteraction and setHovered. Existing destroy disposal is retained. Selection flow is unchanged.
NEXT: Run the exact assigned tests for GREEN.

> @org-hierarchy/sdk@1.1.1 test
> rstest run OrgHierarchyDiagram.interaction

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T22:05:34.226Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/sdk"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 2,
    "failedFiles": 0,
    "tests": 46,
    "failedTests": 0,
    "passedTests": 46,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 892,
    "build": 211,
    "tests": 681
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

- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: an untouched staff host keeps local hover and selection callbacks
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: selection parity and additive state subscription with unsubscribe
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: a throwing subscriber cannot prevent selection or later subscribers
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: unchanged data retains hover; disappearance clears stale hover
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: an unknown ref is accepted then reconciled by kind, not bare id
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: subscriptions opt in once and mounted Pixi hover drives state and paint
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > failure: destroy disposes hover paint and cannot rewire or schedule another frame
- src/OrgHierarchyDiagram.interaction.test.ts :: facade interaction state > success: renderer shares hover and repaints changes without rebuilding the scene
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: search Alice returns hits
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > failure: search empty → []
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: revealPath expands ancestors
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: expandOrg on child keeps root visible (A12)
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > failure: focusNode unknown → false no-op
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: movePersonToCell emits layout patch
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > failure: movePersonToCell onto a diagonal collision (ask) rejects and leaves data unchanged (T111-K3, A1, A4, A7)
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > failure: a refused drop puts the card back WITHOUT a full render (ризик 30)
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: movePersonToCell pushes the occupant when the far cell is free (T111-K3, A2, A3)
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: movePersonToCell swaps when there is nowhere to push (T111-K3, A2, A4)
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > failure: a push never draws a frame with only one of the two seats moved (T111-K3, A3)
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > failure: a render that fails mid-push restores both seats, not just one (T111-K3, A3)
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > failure: appendData without mapper throws
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: appendData dedupes by id on repeat chunk (A6)
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: shiftBlock moves same hierarchy band
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: setData replaces data and fires onDataMapped
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > failure: setData without DiagramData or mapper throws
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: multi-select Set API add/toggle/clear; single-select still works
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: D1 select does not rebuild scene via DiagramRenderer.render
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: selection overlay resolves typed kind:id boxes
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: focusByTestId expands collapsed org then selects
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > success: placeOrgAtMatrixCell emits matrix-cell patch (T78-L7)
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram interactions > failure: placeOrgAtMatrixCell out-of-bounds is a no-op without onLayoutChange (T78-L7)
- src/render/OrgHierarchyDiagram.interactions.test.ts :: bulk selection actions (T67 D2) > success: bulk-collapse applies to the selection, not to the clicked node
- src/render/OrgHierarchyDiagram.interactions.test.ts :: bulk selection actions (T67 D2) > success: bulk-clear empties the selection
- src/render/OrgHierarchyDiagram.interactions.test.ts :: bulk selection actions (T67 D2) > success: bulk-copy-ids writes every selected node as kind:id
- src/render/OrgHierarchyDiagram.interactions.test.ts :: bulk selection actions (T67 D2) > failure: setOrgsCollapsed with an empty list leaves the data untouched
- src/render/OrgHierarchyDiagram.interactions.test.ts :: revealPath renders before focusing (search → focus) > success: a node under a collapsed org is laid out, then panned to
- src/render/OrgHierarchyDiagram.interactions.test.ts :: revealPath renders before focusing (search → focus) > failure: an already visible node reveals without touching the data
- src/render/OrgHierarchyDiagram.interactions.test.ts :: appendData search index (streaming) > success: new chunks merge into the index instead of rebuilding it
- src/render/OrgHierarchyDiagram.interactions.test.ts :: appendData search index (streaming) > failure: a chunk that updates a known org rebuilds, so no stale duplicate
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram seat collision choice (T111-K5) > success: the host answers swap and both seats move in one patch
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram seat collision choice (T111-K5) > success: the host answers push and the occupant goes to the named cell
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram seat collision choice (T111-K5) > failure: the host cancels and the data is byte for byte what it was (A5)
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram seat collision choice (T111-K5) > failure: no handler at all refuses rather than guessing (A6)
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram seat collision choice (T111-K5) > failure: data that moved while the modal was open refuses instead of applying a stale answer
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram seat collision choice (T111-K5) > failure: a push to a cell that was never offered is refused
- src/render/OrgHierarchyDiagram.interactions.test.ts :: OrgHierarchyDiagram seat collision choice (T111-K5) > failure: a second collision while one is open is refused rather than queued

### Skipped

None.

## Failures

No test failures reported.
FACT: GREEN: exact assigned command passed all 46 tests in its two matched files, including all eight facade interaction tests. Full unfiltered output above.
NEXT: Run SDK-only noEmit typecheck and repository lint, then inspect the final diff and scope.

> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


FACT: SDK-only typecheck exit code: 0.
NEXT: Run lint.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: Lint exit code: 0.
NEXT: Inspect final diff and file scope.
FACT: Final diff inspection confirms changes only to the two assigned source files plus this append-only log. The pre-existing subordinate-counts report change is unrelated and was not edited. Branch remains feat/d1-interaction-store. git diff --check passed.
FACT: SDK tsconfig.check.json explicitly uses noEmit=true; no build, root typecheck, build:types, emitting tsc, branch/worktree switch, commit, push, or external store was used.
FACT: Acceptance verified: untouched staff host never attaches a source, real Pixi hover leaves all three alphas at 1 and requests no interaction repaint, and selection callbacks retain their payload. subscribeInteraction attaches exactly once and real hover emits state, requests paint and dims the unrelated seat to 0.45 without rebuilding. setHovered independently attaches once. Destroy disposes paint once and subsequent calls schedule no rAF or paint.
DECISION: Retained the existing destroy cleanup unchanged because it already disposes the deferred subscription correctly; guarded lazy wiring prevents recreation after destruction.
NEXT: Return the required single status line. No remaining implementation steps.
STATUS: PASS — D1-E implemented; RED confirmed; 46 tests GREEN; SDK noEmit typecheck and lint passed.
