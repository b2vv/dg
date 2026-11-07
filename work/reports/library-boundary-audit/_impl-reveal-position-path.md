NEXT: Read repository rules, revealPath documentation, and TDD instructions before implementation.
FACT: Read repo rules, standards, TDD, domain context and briefing; inspecting existing reveal, expand and test seams. Scope remains the user-approved files and branch.
FACT: reportPath retains only one parent and includes direct children; positionExpand currently provides descendants but no all-parent ancestor traversal. Existing org reveal events include pre-render reveal and failure rollback; retain that contract.
DECISION: Test the authorized public revealPath/getStaffExpandedPositionIds/nodeCanvasPoint and callback seams; renderer failure/count seam follows existing contract tests. Keep existing unrelated dirty files untouched.
DECISION: Move the demo all-parent traversal into the internal SDK positionExpand module; exclude the target itself on cycles. Snapshot both data and expanded-id set for exact rollback. Preserve org event timing; emit one aggregate position-expand notification after success. Demo chevrons can use public promote position/data and expanded-id getter, without a new API.
NEXT: Write and run the requested failing reveal-path contract tests before production changes.
DECISION: Pre-code READY for the explicit reviewer-specified bugfix and migration (single writer; no new public signature, worker or Rust boundary). User supplies acceptance and seams; direct source inspection supplies impact evidence. Relevant source files initially clean; unrelated report WIP preserved. New tests cover person mapping, cycles, matrix exclusion, one frame, cap bypass and failure rollback.

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

FACT: Initial revealPositionPath test run exit 1.
FACT: Initial test run was blocked by sandbox listen EPERM on ::1:3000; no assertions ran. NEXT: Retry the same test with sandbox escalation for the local test runner.

> @org-hierarchy/sdk@1.1.1 test
> rstest run revealPositionPath.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:08:02.521Z"
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
    "tests": 7,
    "failedTests": 5,
    "passedTests": 2,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 879,
    "build": 210,
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

### [F01] src/revealPositionPath.test.ts :: revealPath admin position ancestors > reveals a hidden target through the full admin path in one frame

repro:

```bash
npx rstest 'src/revealPositionPath.test.ts' --testNamePattern 'revealPath admin position ancestors > reveals a hidden target through the full admin path in one frame'
```

details:

```json
{
  "testPath": "src/revealPositionPath.test.ts",
  "project": "rstest",
  "fullName": "revealPath admin position ancestors > reveals a hidden target through the full admin path in one frame",
  "status": "fail",
  "duration": 72,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [] to deeply equal [ 'head', 'manager' ]",
      "topFrame": {
        "file": "src/revealPositionPath.test.ts",
        "line": 62,
        "column": 70,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/revealPositionPath.test.ts",
      "line": 62
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- [
-   "head",
-   "manager",
- ]
+ []
```

codeFrame (error 1):

```text
60 |         expect(visibleIds(mounted.diagram)).toEqual(['head']); // counter-probe
61 |         expect(await mounted.diagram.revealPath(target)).toBe(true);
62 |         expect(mounted.diagram.getStaffExpandedPositionIds().sort()).toEqual(['head', 'manager']);
   |                                                                      ^
63 |         expect(visibleIds(mounted.diagram)).toContain('target');
64 |         expect(mounted.frames()).toBe(1);
```

### [F02] src/revealPositionPath.test.ts :: revealPath admin position ancestors > reveals a hidden person through the full admin path in one frame

repro:

```bash
npx rstest 'src/revealPositionPath.test.ts' --testNamePattern 'revealPath admin position ancestors > reveals a hidden person through the full admin path in one frame'
```

details:

```json
{
  "testPath": "src/revealPositionPath.test.ts",
  "project": "rstest",
  "fullName": "revealPath admin position ancestors > reveals a hidden person through the full admin path in one frame",
  "status": "fail",
  "duration": 4,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [] to deeply equal [ 'head', 'manager' ]",
      "topFrame": {
        "file": "src/revealPositionPath.test.ts",
        "line": 62,
        "column": 70,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/revealPositionPath.test.ts",
      "line": 62
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- [
-   "head",
-   "manager",
- ]
+ []
```

codeFrame (error 1):

```text
60 |         expect(visibleIds(mounted.diagram)).toEqual(['head']); // counter-probe
61 |         expect(await mounted.diagram.revealPath(target)).toBe(true);
62 |         expect(mounted.diagram.getStaffExpandedPositionIds().sort()).toEqual(['head', 'manager']);
   |                                                                      ^
63 |         expect(visibleIds(mounted.diagram)).toContain('target');
64 |         expect(mounted.frames()).toBe(1);
```

### [F03] src/revealPositionPath.test.ts :: revealPath admin position ancestors > expands every parent of a diamond, ignoring matrix links and surviving cycles

repro:

```bash
npx rstest 'src/revealPositionPath.test.ts' --testNamePattern 'revealPath admin position ancestors > expands every parent of a diamond, ignoring matrix links and surviving cycles'
```

details:

```json
{
  "testPath": "src/revealPositionPath.test.ts",
  "project": "rstest",
  "fullName": "revealPath admin position ancestors > expands every parent of a diamond, ignoring matrix links and surviving cycles",
  "status": "fail",
  "duration": 4,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [] to deeply equal [ 'head', 'manager', 'other' ]",
      "topFrame": {
        "file": "src/revealPositionPath.test.ts",
        "line": 84,
        "column": 68,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/revealPositionPath.test.ts",
      "line": 84
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- [
-   "head",
-   "manager",
-   "other",
- ]
+ []
```

codeFrame (error 1):

```text
82 |       expect(visibleIds(mounted.diagram)).not.toContain('target');
83 |       await mounted.diagram.revealPath('target');
84 |       expect(mounted.diagram.getStaffExpandedPositionIds().sort()).toEqual(['head', 'manager', 'other']);
   |                                                                    ^
85 |       expect(visibleIds(mounted.diagram)).toContain('target');
86 |     } finally { mounted.cleanup(); }
```

### [F04] src/revealPositionPath.test.ts :: revealPath admin position ancestors > bypasses maxExpandedPositions to keep the whole revealed path open

repro:

```bash
npx rstest 'src/revealPositionPath.test.ts' --testNamePattern 'revealPath admin position ancestors > bypasses maxExpandedPositions to keep the whole revealed path open'
```

details:

```json
{
  "testPath": "src/revealPositionPath.test.ts",
  "project": "rstest",
  "fullName": "revealPath admin position ancestors > bypasses maxExpandedPositions to keep the whole revealed path open",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [] to deeply equal [ 'head', 'manager' ]",
      "topFrame": {
        "file": "src/revealPositionPath.test.ts",
        "line": 107,
        "column": 68,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/revealPositionPath.test.ts",
      "line": 107
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- [
-   "head",
-   "manager",
- ]
+ []
```

codeFrame (error 1):

```text
105 |       expect(visibleIds(mounted.diagram)).not.toContain('target');
106 |       await mounted.diagram.revealPath('target');
107 |       expect(mounted.diagram.getStaffExpandedPositionIds().sort()).toEqual(['head', 'manager']);
    |                                                                    ^
108 |       expect(visibleIds(mounted.diagram)).toContain('target');
109 |     } finally { mounted.cleanup(); }
```

### [F05] src/revealPositionPath.test.ts :: revealPath admin position ancestors > combines org and position reveal in one frame

repro:

```bash
npx rstest 'src/revealPositionPath.test.ts' --testNamePattern 'revealPath admin position ancestors > combines org and position reveal in one frame'
```

details:

```json
{
  "testPath": "src/revealPositionPath.test.ts",
  "project": "rstest",
  "fullName": "revealPath admin position ancestors > combines org and position reveal in one frame",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [ 'head' ] to include 'target'",
      "topFrame": {
        "file": "src/revealPositionPath.test.ts",
        "line": 119,
        "column": 43,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/revealPositionPath.test.ts",
      "line": 119
    }
  ]
}
```

codeFrame (error 1):

```text
117 |       await mounted.diagram.revealPath('target');
118 |       expect(mounted.diagram.getData().organizations[0]!.collapsed).toBe(false);
119 |       expect(visibleIds(mounted.diagram)).toContain('target');
    |                                           ^
120 |       expect(mounted.frames()).toBe(1);
121 |     } finally { mounted.cleanup(); }
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/sdk
npm error workspace @org-hierarchy/sdk@1.1.1
npm error location /Users/strelia/projects/dg/packages/sdk
npm error command failed
npm error command sh -c rstest run revealPositionPath.test.ts

FACT: Red test retry exit 1.
FACT: RED confirmed: 5 expected reveal failures, 2 passes; hidden-target preconditions passed. Implemented internal all-parent traversal migrated from demo, cap-free ancestor updates, one render and exact data/set rollback; position events occur only after successful frame.
NEXT: Run focused SDK tests before demo migration.

> @org-hierarchy/sdk@1.1.1 test
> rstest run revealPositionPath.test.ts orgExpandChange.contract.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:08:36.278Z"
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
    "tests": 16,
    "failedTests": 0,
    "passedTests": 16,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 857,
    "build": 211,
    "tests": 646
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

- src/orgExpandChange.contract.test.ts :: onOrgExpandChange contract > row 2: toggle reports the changed org and its new collapsed state
- src/orgExpandChange.contract.test.ts :: onOrgExpandChange contract > row 3: expanding an org reports a toggle and preserves selection
- src/orgExpandChange.contract.test.ts :: onOrgExpandChange contract > row 5: collapsing 12 expanded orgs emits one aggregate change
- src/orgExpandChange.contract.test.ts :: onOrgExpandChange contract > row 6: a second collapse of an already-collapsed tree emits no event
- src/orgExpandChange.contract.test.ts :: onOrgExpandChange contract > row 7: setData reports a snapshot that a toggle-only host ignores
- src/orgExpandChange.contract.test.ts :: onOrgExpandChange contract > row 8: every expansion entry point emits a concrete change
- src/orgExpandChange.contract.test.ts :: onOrgExpandChange contract > row 9: reveal render failure reports reveal, rollback, then throws
- src/orgExpandChange.contract.test.ts :: onOrgExpandChange contract > row 10: a throwing host callback is reported once on console.error
- src/orgExpandChange.contract.test.ts :: onOrgExpandChange contract > row 12: toggle still emits after a proven destroy
- src/revealPositionPath.test.ts :: revealPath admin position ancestors > reveals a hidden target through the full admin path in one frame
- src/revealPositionPath.test.ts :: revealPath admin position ancestors > reveals a hidden person through the full admin path in one frame
- src/revealPositionPath.test.ts :: revealPath admin position ancestors > expands every parent of a diamond, ignoring matrix links and surviving cycles
- src/revealPositionPath.test.ts :: revealPath admin position ancestors > does not render or emit when the path is already expanded
- src/revealPositionPath.test.ts :: revealPath admin position ancestors > bypasses maxExpandedPositions to keep the whole revealed path open
- src/revealPositionPath.test.ts :: revealPath admin position ancestors > combines org and position reveal in one frame
- src/revealPositionPath.test.ts :: revealPath admin position ancestors > restores both org data and position state and rethrows a refused frame without expand events

### Skipped

None.

## Failures

No test failures reported.

FACT: Focused SDK green run exit 0.
FACT: Focused SDK green: all 16 tests pass (7 new reveal cases plus existing org expansion contract). NEXT: Remove demo pruning and ancestor compensation; migrate chevron state and document the reveal contract.
FACT: Added demo chevron tests for SDK expanded-id input and position.expanded=true override; corrected the new SDK person fixture to the declared fullName shape.
NEXT: Run demo card tests RED before changing the card input.

> @org-hierarchy/demo@0.1.0 test
> rstest run ShpsStaffCard.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:09:16.966Z"
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
    "tests": 5,
    "failedTests": 1,
    "passedTests": 4,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 640,
    "build": 119,
    "tests": 521
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

### [F01] src/app/ShpsStaffCard.test.ts :: ShpsStaffCard collapse chevron (§8.1, v3 `.card.closed .tg`) > collapsed: filled chip, white text, chevron rotated -90°, direct-report count shown

repro:

```bash
npx rstest 'src/app/ShpsStaffCard.test.ts' --testNamePattern 'ShpsStaffCard collapse chevron (§8.1, v3 `.card.closed .tg`) > collapsed: filled chip, white text, chevron rotated -90°, direct-report count shown'
```

details:

```json
{
  "testPath": "src/app/ShpsStaffCard.test.ts",
  "project": "rstest",
  "fullName": "ShpsStaffCard collapse chevron (§8.1, v3 `.card.closed .tg`) > collapsed: filled chip, white text, chevron rotated -90°, direct-report count shown",
  "status": "fail",
  "duration": 6,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected '<div data-promote-card=\"ceo\" data-sta…' to contain 'aria-expanded=\"false\"'",
      "topFrame": {
        "file": "src/app/ShpsStaffCard.test.ts",
        "line": 52,
        "column": 18,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/app/ShpsStaffCard.test.ts",
      "line": 52
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- aria-expanded="false"
+ <div data-promote-card="ceo" data-staff-pos="ceo" style="position:absolute;left:0;top:0;width:300px;height:112px;box-sizing:border-box;display:flex;flex-direction:column;border-radius:10px;border:1px solid #4c4c54;background:#2c2c31;box-shadow:0 6px 18px rgba(0,0,0,.5);overflow:hidden;pointer-events:auto;font-family:Onest, system-ui, sans-serif;opacity:1;transition:opacity .2s ease, border-color .15s ease"><div style="flex:1;display:flex;gap:11px;padding:11px 12px;align-items:center;min-height:0"><div style="width:38px;height:38px;flex:0 0 38px;border-radius:9px;background:#3e3e45;color:#f1f1f2;display:grid;place-items:center;font-size:13px;font-weight:600">ПО</div><div style="min-width:0;flex:1"><div style="font-size:17px;font-weight:600;line-height:1.28;color:#f6f6f7;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;word-break:break-word" title="Директор">Директор</div><div style="display:flex;align-items:center;gap:6px;font-size:15px;font-weight:500;line-height:1.3;margin-top:4px;color:#c2c2c6"><span>Петренко О. В.</span></div></div></div><div style="position:relative;display:flex;align-items:center;justify-content:center;min-height:34px;padding:6px 12px;border-top:1px solid #3c3c42;background:#26262a"><span style="font-family:JetBrains Mono, monospace;font-size:13px;color:#d6d6da">3 <span style="color:#8a8a90">[7]</span></span><span data-staff-toggle="ceo" role="button" aria-expanded="true" title="Згорнути підлеглі посади" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:4px;height:24px;padding:0 7px 0 6px;border-radius:12px;border:1px solid #e5491d;background:rgba(229,73,29,.14);color:#ff8d68;font-size:12px;font-weight:600;cursor:pointer;pointer-events:auto;transition:background .15s"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;transition:transform .2s;transform:none"><path d="M4 6l4 4 4-4"></path></svg></span></div></div>
```

codeFrame (error 1):

```text
50 |     const Card = makeShpsStaffCard(() => ({ foundId: null, expandedPositionIds: [] }));
51 |     const html = renderToStaticMarkup(Card(headSlot('ceo')));
52 |     expect(html).toContain('aria-expanded="false"');
   |                  ^
53 |     expect(html).toContain('title="Розгорнути підлеглі посади"');
54 |     expect(html).toContain('background:#e5491d');
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/demo
npm error workspace @org-hierarchy/demo@0.1.0
npm error location /Users/strelia/projects/dg/packages/demo
npm error command failed
npm error command sh -c rstest run ShpsStaffCard.test.ts

FACT: Demo card red test exit 1.
FACT: Demo RED confirmed (closed chevron ignored SDK expanded-id input). Removed host pruning, ancestor compensation, unused rerender/refit/tween chain and flushSync import. Toggle delegates to SDK then syncs; card reads expanded ids plus explicit position flag. Removed obsolete backdrop helper tests; updated Ukrainian reveal docs.
NEXT: Run focused demo tests, then all five required gates with full output appended.

> @org-hierarchy/demo@0.1.0 test
> rstest run ShpsStaffCard.test.ts StaffChromeBackdrop.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:09:58.761Z"
runtime: {"node":"v24.11.1","platform":"darwin","cwd":"/Users/strelia/projects/dg/packages/demo"}
---

# Rstest Test Execution Report

## Summary

```json
{
  "status": "pass",
  "counts": {
    "testFiles": 2,
    "failedFiles": 0,
    "tests": 13,
    "failedTests": 0,
    "passedTests": 13,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 873,
    "build": 220,
    "tests": 653
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

- src/app/ShpsStaffCard.test.ts :: ShpsStaffCard search-focus dim (§8.2) > focus set: a non-found card dims to .38, the found card stays full
- src/app/ShpsStaffCard.test.ts :: ShpsStaffCard search-focus dim (§8.2) > no focus (foundId null, or plain card): opacity stays full, never .38
- src/app/ShpsStaffCard.test.ts :: ShpsStaffCard collapse chevron (§8.1, v3 `.card.closed .tg`) > collapsed: filled chip, white text, chevron rotated -90°, direct-report count shown
- src/app/ShpsStaffCard.test.ts :: ShpsStaffCard collapse chevron (§8.1, v3 `.card.closed .tg`) > an explicit position expanded flag keeps the chevron open without a set entry
- src/app/ShpsStaffCard.test.ts :: ShpsStaffCard collapse chevron (§8.1, v3 `.card.closed .tg`) > expanded: tinted chip, chevron unrotated, no count
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > draws world coords raw under a single worldTransform layer (no per-element math)
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > connector lines go in an SVG <g> with the world transform + non-scaling stroke
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > far lod or no geometry → nothing
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > found marker (§8.2): foundId → v3 white ring + «Знайдено» chip
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > found marker: unknown foundId (collapsed/absent node) → no marker, no throw
- src/app/StaffChromeBackdrop.test.ts :: staff host helpers (collapse / search / hover) > relatedStaffIds: hovered + both endpoints of touching lines; boundary = just itself
- src/app/StaffChromeBackdrop.test.ts :: staff host helpers (collapse / search / hover) > hover clear restores the §8.2 focus baseline (not blank) while a search is focused
- src/app/StaffChromeBackdrop.test.ts :: staff host helpers (collapse / search / hover) > hover clear blanks opacity when no search is focused (foundId null)

### Skipped

None.

## Failures

No test failures reported.

FACT: Focused demo green run exit 0.
FACT: Focused demo run completed; reviewing public promote payload and chevron predicate before full gates.
FACT: Focused demo GREEN: 13 tests pass. Public promote payload contains DiagramPosition including expanded; closed predicate matches SDK OR semantics (explicit true or expanded-set membership). SDK computes childrenCount from admin links. No public API added.
NEXT: Required gate — npm test -w @org-hierarchy/sdk (full output below).

> @org-hierarchy/sdk@1.1.1 test
> rstest run

FACT: Reviewed SDK and demo diff while full SDK suite runs; no branch/worktree/commit/push operations performed.
---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:10:41.624Z"
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
    "tests": 1337,
    "failedTests": 0,
    "passedTests": 1335,
    "skippedTests": 2,
    "todoTests": 0
  },
  "durationMs": {
    "total": 15483,
    "build": 326,
    "tests": 15157
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

FACT: npm test -w @org-hierarchy/sdk exit 0.
FACT: Full SDK gate passed. Diff review caught the plain staff-shps card also needing seeded expand state; both staff tabs now receive the public getter, and the stale host-collapse comment is removed.
NEXT: Required gate — npm test -w @org-hierarchy/demo (full output below).

> @org-hierarchy/demo@0.1.0 test
> rstest run

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T12:11:00.504Z"
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
    "total": 3243,
    "build": 243,
    "tests": 3000
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

FACT: npm test -w @org-hierarchy/demo exit 0.
NEXT: Required gate — npm run typecheck (full output below).

> org-hierarchy@0.1.0 typecheck
> npm run typecheck -w @org-hierarchy/sdk && npm run build:types -w @org-hierarchy/sdk && npm run typecheck -w @org-hierarchy/demo && tsc -p tsconfig.e2e.json


> @org-hierarchy/sdk@1.1.1 typecheck
> tsc -p tsconfig.check.json


> @org-hierarchy/sdk@1.1.1 build:types
> tsc --emitDeclarationOnly --declaration --outDir dist


> @org-hierarchy/demo@0.1.0 typecheck
> tsc -p tsconfig.check.json


FACT: npm run typecheck exit 0.
FACT: Full demo gate passed; typecheck running. Native checkpoint registration lookup is read-only and does not read transcripts.
FACT: Typecheck passed; full demo suite passed 132 tests.
NEXT: Required gate — npm run lint (full output below).

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: npm run lint exit 0.
FACT: Lint passed.
NEXT: Required gate — npm run check:docs (full output below).

> org-hierarchy@0.1.0 check:docs
> node scripts/check-docs.mjs

· брифінг відстає на 22 комітів з 25 дозволених
✅ дока свіжа: лінки резолвяться, публічний API описаний, барель без тест-хуків, брифінг у межах

FACT: npm run check:docs exit 0.
FACT: All five required gates passed: SDK 1335 tests; demo 132 tests; typecheck; lint; check:docs. Full command outputs are recorded above. git diff --check passed; removed compensation names have no remaining demo references.
FACT: Final source scope is SDK reveal/helper/new tests, demo App/card/backdrop/tests, and docs/USAGE.md. Existing unrelated report changes were not edited. Branch remains chore/library-boundary-housekeeping; no commits, pushes, worktrees or branch switches.
FACT: Done — admin reveal handles positions/persons, all parents, cycles, cap bypass, one frame, exact rollback and post-frame position events; demo delegates visibility and reads SDK chevron state; Ukrainian docs updated.
FACT: Verification limits — automated suites only; no browser screenshots or deployed walkthrough requested/performed. Post-deploy not applicable: no deployment.
FACT: Native checkpoint was attempted using current host-delivered session identity and registered manual.sh path. Automatic approval review rejected the external handoff-store write because it is outside the user-authorized repository files/log. No workaround attempted; no successful checkpoint claimed. Implementation and all required gates remain complete; this working file is the durable evidence.
QUESTION: Optional external native checkpoint remains blocked pending explicit user approval for that additional store write; it is not needed to review the completed code.
