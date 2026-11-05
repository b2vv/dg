NEXT: Read the required plan, landed SDK API, and demo files; verify the public exports before writing tests.
FACT: Read D1-D.md in full and .ai/README.md. Scope is the two named demo modules and their tests, plus this append-only log. No builds, root typecheck, emitting tsc, commits, branch changes, or external store.
DECISION: Follow the brief's no-external-store prohibition; do not create an external session checkpoint.
FACT: Read the required plan sections and the landed InteractionStore, InteractionState, staffRelated selector, facade method locations, and current demo hover/card implementation. The first combined read was truncated; reread the SDK files and hover implementation separately.
FACT: subscribeInteraction and setHovered exist on OrgHierarchyDiagram. The source barrel search found no relatedStaffIds export. Demo Rsbuild resolves @org-hierarchy/sdk to packages/sdk/src/index.ts.
NEXT: Verify the complete public barrel and package export map; stop if relatedStaffIds has no supported public import.
FACT: Verified the complete packages/sdk/src/index.ts: relatedStaffIds is not exported. packages/sdk/package.json exposes only ., ./react, ./worker, and ./mappers; no supported staffRelated subpath exists. Demo build and test aliases both resolve @org-hierarchy/sdk to the source barrel.
FACT: OrgHierarchyDiagram.subscribeInteraction and OrgHierarchyDiagram.setHovered are present. The exact missing dependency is the public named export relatedStaffIds from @org-hierarchy/sdk.
DECISION: STOP as explicitly required by D1-D.md. No SDK edits, internal imports, local selector reimplementation, production edits, tests, lint, builds, or typechecks performed. No test output exists to paste.
QUESTION: Can the SDK owner export relatedStaffIds from packages/sdk/src/index.ts so the demo can import it from @org-hierarchy/sdk?
NEXT: Resume D1-D after that public export is available, starting with failing success and failure tests, then RED → implementation → GREEN and npm run lint.
STATUS: BLOCKED — missing public export relatedStaffIds from @org-hierarchy/sdk.

NEXT: Resume D1-D with the newly available public selector export; verify the diagram wiring before RED tests.
FACT: packages/sdk/src/index.ts now exports relatedStaffIds and staffDimmedIds. OrgHierarchyDiagram exposes subscribeInteraction and setHovered. The previous missing-export blocker is resolved.
FACT: Re-read the D1-D plan and implementation seams. Current branch is feat/d1-interaction-store. Existing SDK and unrelated report changes belong to other work and were not modified.
FACT: PromoteSlotProps and PromoteBackdropProps in packages/sdk/src/react/createReactPromoteOverlay.ts do not carry a diagram or interaction callbacks. The SDK React barrel exports no diagram context/hook. Neither allowed demo module has a diagram reference.
FACT: App.ts owns the diagram. Its mountOverlays() calls makeShpsStaffCard with only a focus thunk, and installStaffHoverHighlight with only the mount and found-id thunk (lines 709–727). Consequently, changing the two allowed modules alone cannot connect the live demo to diagram.setHovered/subscribeInteraction. Removing the installer export would also break App.ts's import and call.
DECISION: Do not create a global diagram registry, reach into SDK internals, or write an optional disconnected implementation that passes synthetic tests but never runs in the live demo. Do not modify App.ts without expanding the brief's exclusive file scope.
QUESTION: May D1-D also modify packages/demo/src/app/App.ts solely to pass the diagram into the card/backdrop factories and remove the obsolete installStaffHoverHighlight import/call/disposal? The brief currently permits only StaffChromeBackdrop.ts, ShpsStaffCard.ts, and their tests.
NEXT: With that wiring scope authorized (or implemented by its owner), write success and failure tests for pointer enter/leave, subscription-driven card/connector styles, unknown hover, search-focus restoration, and unsubscribe; observe RED, implement, then run only the two demo test files and npm run lint with full output appended here.
FACT: No production files or tests changed in this continuation. No test/lint/build/typecheck commands ran; there is no test output to paste. Only this log was appended. No external store was used.
STATUS: BLOCKED — public export resolved; App.ts wiring change requires expansion of D1-D's exclusive file scope.

NEXT: Implement the authorized App.ts hover wiring after RED evidence.
FACT: User explicitly approved App.ts only for passing the diagram into factories and deleting the old hover installer import/call/disposal. Public selector and facade methods are available.
DECISION: Test the agreed card/backdrop seams with mounted React components and a typed facade fake. Cover pointer enter/leave, SDK-derived related cards, connector accents, unknown/non-position hover, focus restoration, and unsubscribe. Use React subscriptions rather than DOM style mutation.

> @org-hierarchy/demo@0.1.0 test
> rstest run src/app/ShpsStaffCard.test.ts

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
npm error command sh -c rstest run src/app/ShpsStaffCard.test.ts

> @org-hierarchy/demo@0.1.0 test
> rstest run src/app/ShpsStaffCard.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:42:38.066Z"
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
    "tests": 6,
    "failedTests": 1,
    "passedTests": 5,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 852,
    "build": 204,
    "tests": 648
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

### [F01] src/app/ShpsStaffCard.test.ts :: store-driven staff hover > writes position refs on enter/leave and derives related opacity from subscription

repro:

```bash
npx rstest 'src/app/ShpsStaffCard.test.ts' --testNamePattern 'store-driven staff hover > writes position refs on enter/leave and derives related opacity from subscription'
```

details:

```json
{
  "testPath": "src/app/ShpsStaffCard.test.ts",
  "project": "rstest",
  "fullName": "store-driven staff hover > writes position refs on enter/leave and derives related opacity from subscription",
  "status": "fail",
  "duration": 78,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected [] to deeply equal [ { kind: 'position', id: 'cfo' } ]",
      "topFrame": {
        "file": "src/app/ShpsStaffCard.test.ts",
        "line": 117,
        "column": 21,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/app/ShpsStaffCard.test.ts",
      "line": 117
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- [
-   {
-     "id": "cfo",
-     "kind": "position",
-   },
- ]
+ []
```

codeFrame (error 1):

```text
115 |       const card = (id: string) => mount.querySelector<HTMLElement>(`[data-staff-pos="${id}"]`)!;
116 |       card('cfo').dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
117 |       expect(calls).toEqual([{ kind: 'position', id: 'cfo' }]);
    |                     ^
118 |       // Input alone cannot paint: only the subscription changes the view.
119 |       expect(card('acc').style.opacity).toBe('0.38');
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/demo
npm error workspace @org-hierarchy/demo@0.1.0
npm error location /Users/strelia/projects/dg/packages/demo
npm error command failed
npm error command sh -c rstest run src/app/ShpsStaffCard.test.ts

FACT: Initial test run hit listen EPERM; reran with the permission required by the brief. Added mounted success and invalid-hover/clear tests before implementation; existing non-hover render tests are preserved.
NEXT: Observe connector RED, then implement the React subscription path.

> @org-hierarchy/demo@0.1.0 test
> rstest run src/app/StaffChromeBackdrop.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:43:00.348Z"
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
    "tests": 9,
    "failedTests": 3,
    "passedTests": 6,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 774,
    "build": 200,
    "tests": 574
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

### [F01] src/app/StaffChromeBackdrop.test.ts :: store-driven connector hover > restores connector baseline after null

repro:

```bash
npx rstest 'src/app/StaffChromeBackdrop.test.ts' --testNamePattern 'store-driven connector hover > restores connector baseline after null'
```

details:

```json
{
  "testPath": "src/app/StaffChromeBackdrop.test.ts",
  "project": "rstest",
  "fullName": "store-driven connector hover > restores connector baseline after null",
  "status": "fail",
  "duration": 56,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected '#c2502a' to be '#ff8d68' // Object.is equality",
      "topFrame": {
        "file": "src/app/StaffChromeBackdrop.test.ts",
        "line": 145,
        "column": 69,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/app/StaffChromeBackdrop.test.ts",
      "line": 145
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- #ff8d68
+ #c2502a
```

codeFrame (error 1):

```text
143 |         await act(async () => root.render(createElement(Backdrop, props())));
144 |         await emit({ kind: 'position', id: 'a' });
145 |         expect(mount.querySelector('path')?.getAttribute('stroke')).toBe('#ff8d68');
    |                                                                     ^
146 |         expect(mount.querySelector('path')?.getAttribute('stroke-width')).toBe('2.5');
147 |         expect(mount.querySelector('circle')?.getAttribute('fill')).toBe('#ff8d68');
```

### [F02] src/app/StaffChromeBackdrop.test.ts :: store-driven connector hover > restores connector baseline after {"kind":"position","id":"missing"}

repro:

```bash
npx rstest 'src/app/StaffChromeBackdrop.test.ts' --testNamePattern 'store-driven connector hover > restores connector baseline after {"kind":"position","id":"missing"}'
```

details:

```json
{
  "testPath": "src/app/StaffChromeBackdrop.test.ts",
  "project": "rstest",
  "fullName": "store-driven connector hover > restores connector baseline after {\"kind\":\"position\",\"id\":\"missing\"}",
  "status": "fail",
  "duration": 2,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected '#c2502a' to be '#ff8d68' // Object.is equality",
      "topFrame": {
        "file": "src/app/StaffChromeBackdrop.test.ts",
        "line": 145,
        "column": 69,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/app/StaffChromeBackdrop.test.ts",
      "line": 145
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- #ff8d68
+ #c2502a
```

codeFrame (error 1):

```text
143 |         await act(async () => root.render(createElement(Backdrop, props())));
144 |         await emit({ kind: 'position', id: 'a' });
145 |         expect(mount.querySelector('path')?.getAttribute('stroke')).toBe('#ff8d68');
    |                                                                     ^
146 |         expect(mount.querySelector('path')?.getAttribute('stroke-width')).toBe('2.5');
147 |         expect(mount.querySelector('circle')?.getAttribute('fill')).toBe('#ff8d68');
```

### [F03] src/app/StaffChromeBackdrop.test.ts :: store-driven connector hover > restores connector baseline after {"kind":"organization","id":"a"}

repro:

```bash
npx rstest 'src/app/StaffChromeBackdrop.test.ts' --testNamePattern 'store-driven connector hover > restores connector baseline after {"kind":"organization","id":"a"}'
```

details:

```json
{
  "testPath": "src/app/StaffChromeBackdrop.test.ts",
  "project": "rstest",
  "fullName": "store-driven connector hover > restores connector baseline after {\"kind\":\"organization\",\"id\":\"a\"}",
  "status": "fail",
  "duration": 3,
  "retryCount": 0,
  "errors": [
    {
      "type": "AssertionError",
      "message": "expected '#c2502a' to be '#ff8d68' // Object.is equality",
      "topFrame": {
        "file": "src/app/StaffChromeBackdrop.test.ts",
        "line": 145,
        "column": 69,
        "method": "<unknown>"
      },
      "stackFrames": []
    }
  ],
  "candidateFiles": [
    {
      "path": "src/app/StaffChromeBackdrop.test.ts",
      "line": 145
    }
  ]
}
```

diff:

```diff
- Expected
+ Received

- #ff8d68
+ #c2502a
```

codeFrame (error 1):

```text
143 |         await act(async () => root.render(createElement(Backdrop, props())));
144 |         await emit({ kind: 'position', id: 'a' });
145 |         expect(mount.querySelector('path')?.getAttribute('stroke')).toBe('#ff8d68');
    |                                                                     ^
146 |         expect(mount.querySelector('path')?.getAttribute('stroke-width')).toBe('2.5');
147 |         expect(mount.querySelector('circle')?.getAttribute('fill')).toBe('#ff8d68');
```

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/demo
npm error workspace @org-hierarchy/demo@0.1.0
npm error location /Users/strelia/projects/dg/packages/demo
npm error command failed
npm error command sh -c rstest run src/app/StaffChromeBackdrop.test.ts

FACT: RED confirmed: card test failed on missing setHovered call; all three connector cases failed on absent store-driven accent. Both commands exited 1; complete output is above.
FACT: Replaced DOM hover installer/local selector with React subscription-driven styles; cards import relatedStaffIds from the SDK barrel and write position refs for filled seats. App changes only pass the diagram/getter and remove obsolete hover installation/disposal plus stale hover comments.
NEXT: Run both owned demo tests, then lint.

> @org-hierarchy/demo@0.1.0 test
> rstest run src/app/ShpsStaffCard.test.ts src/app/StaffChromeBackdrop.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:43:41.127Z"
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
    "tests": 15,
    "failedTests": 0,
    "passedTests": 15,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 818,
    "build": 205,
    "tests": 613
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
- src/app/ShpsStaffCard.test.ts :: store-driven staff hover > writes position refs on enter/leave and derives related opacity from subscription
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > draws world coords raw under a single worldTransform layer (no per-element math)
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > connector lines go in an SVG <g> with the world transform + non-scaling stroke
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > far lod or no geometry → nothing
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > found marker (§8.2): foundId → v3 white ring + «Знайдено» chip
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > found marker: unknown foundId (collapsed/absent node) → no marker, no throw
- src/app/StaffChromeBackdrop.test.ts :: staff host helpers (collapse / search / hover) > relatedStaffIds: hovered + both endpoints of touching lines; boundary = just itself
- src/app/StaffChromeBackdrop.test.ts :: store-driven connector hover > restores connector baseline after null
- src/app/StaffChromeBackdrop.test.ts :: store-driven connector hover > restores connector baseline after {"kind":"position","id":"missing"}
- src/app/StaffChromeBackdrop.test.ts :: store-driven connector hover > restores connector baseline after {"kind":"organization","id":"a"}

### Skipped

None.

## Failures

No test failures reported.

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


> @org-hierarchy/demo@0.1.0 typecheck
> tsc -p tsconfig.check.json

src/app/App.ts(671,8): error TS2345: Argument of type '() => OrgHierarchyDiagram | undefined' is not assignable to parameter of type '() => Pick<OrgHierarchyDiagram, "subscribeInteraction"> | undefined'.
  Type 'OrgHierarchyDiagram | undefined' is not assignable to type 'Pick<OrgHierarchyDiagram, "subscribeInteraction"> | undefined'.
    Property 'subscribeInteraction' is missing in type 'OrgHierarchyDiagram' but required in type 'Pick<OrgHierarchyDiagram, "subscribeInteraction">'.
src/app/App.ts(713,15): error TS2739: Type 'OrgHierarchyDiagram' is missing the following properties from type 'Pick<OrgHierarchyDiagram, "getStaffChromeGeometry" | "setHovered" | "subscribeInteraction">': setHovered, subscribeInteraction
src/app/ShpsStaffCard.test.ts(3,10): error TS2305: Module '"@org-hierarchy/sdk"' has no exported member 'relatedStaffIds'.
src/app/ShpsStaffCard.test.ts(3,32): error TS2305: Module '"@org-hierarchy/sdk"' has no exported member 'InteractionState'.
src/app/ShpsStaffCard.test.ts(101,64): error TS2345: Argument of type '{ setHovered(ref: NodeRef | null): void; subscribeInteraction(cb: (state: InteractionState) => void): () => void; getStaffChromeGeometry: () => { org: null; depts: never[]; lines: { fromId: string; toId: string; }[]; nodeBoxes: { ceo: { x: number; y: number; width: number; height: number; }; cfo: { x: number; y: num...' is not assignable to parameter of type 'Pick<OrgHierarchyDiagram, "getStaffChromeGeometry" | "setHovered" | "subscribeInteraction">'.
  The types returned by 'getStaffChromeGeometry().lines' are incompatible between these types.
    Type '{ fromId: string; toId: string; }[]' is not assignable to type 'ChromeLine[]'.
      Type '{ fromId: string; toId: string; }' is missing the following properties from type 'ChromeLine': points, endsOnDeptTop
src/app/ShpsStaffCard.ts(1,10): error TS2305: Module '"@org-hierarchy/sdk"' has no exported member 'relatedStaffIds'.
src/app/ShpsStaffCard.ts(74,39): error TS2344: Type '"getStaffChromeGeometry" | "setHovered" | "subscribeInteraction"' does not satisfy the constraint 'keyof OrgHierarchyDiagram'.
  Type '"setHovered"' is not assignable to type 'keyof OrgHierarchyDiagram'.
src/app/ShpsStaffCard.ts(92,39): error TS2344: Type '"setHovered"' does not satisfy the constraint 'keyof OrgHierarchyDiagram'.
src/app/ShpsStaffCard.ts(369,29): error TS18046: 'diagram.setHovered' is of type 'unknown'.
src/app/ShpsStaffCard.ts(370,29): error TS18046: 'diagram.setHovered' is of type 'unknown'.
src/app/StaffChromeBackdrop.test.ts(3,10): error TS2305: Module '"@org-hierarchy/sdk"' has no exported member 'relatedStaffIds'.
src/app/StaffChromeBackdrop.test.ts(3,32): error TS2305: Module '"@org-hierarchy/sdk"' has no exported member 'InteractionState'.
src/app/StaffChromeBackdrop.ts(44,38): error TS2344: Type '"subscribeInteraction"' does not satisfy the constraint 'keyof OrgHierarchyDiagram'.
src/app/StaffChromeBackdrop.ts(47,25): error TS18046: 'diagram.subscribeInteraction' is of type 'unknown'.
src/app/StaffChromeBackdrop.ts(47,55): error TS7006: Parameter 'state' implicitly has an 'any' type.
src/app/StaffChromeBackdrop.ts(65,48): error TS2344: Type '"subscribeInteraction"' does not satisfy the constraint 'keyof OrgHierarchyDiagram'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/demo
npm error workspace @org-hierarchy/demo@0.1.0
npm error location /Users/strelia/projects/dg/packages/demo
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

FACT: GREEN: both owned test files passed (15/15), exit 0. npm run lint passed, exit 0. Full outputs are above.
FACT: Confirmed demo tsconfig.check.json sets noEmit:true, then ran the permitted demo-only typecheck. Exit 1: package resolution reads stale SDK dist declarations without the landed interaction API/selector, plus one incomplete test geometry fixture.
DECISION: Fix the owned fixture (points/endsOnDeptTop); do not build or modify shared SDK dist, SDK source, or tsconfigs. Rerun only authorized checks.
NEXT: Final owned tests/lint, confirm typecheck has only stale declaration errors, inspect scope and record handoff.

> @org-hierarchy/demo@0.1.0 test
> rstest run src/app/ShpsStaffCard.test.ts src/app/StaffChromeBackdrop.test.ts

---
tool: "@rstest/core@0.11.10"
timestamp: "2026-11-05T21:44:20.223Z"
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
    "tests": 15,
    "failedTests": 0,
    "passedTests": 15,
    "skippedTests": 0,
    "todoTests": 0
  },
  "durationMs": {
    "total": 845,
    "build": 223,
    "tests": 622
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
- src/app/ShpsStaffCard.test.ts :: store-driven staff hover > writes position refs on enter/leave and derives related opacity from subscription
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > draws world coords raw under a single worldTransform layer (no per-element math)
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > connector lines go in an SVG <g> with the world transform + non-scaling stroke
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > far lod or no geometry → nothing
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > found marker (§8.2): foundId → v3 white ring + «Знайдено» chip
- src/app/StaffChromeBackdrop.test.ts :: makeStaffChromeBackdrop — one camera transform (Б2) > found marker: unknown foundId (collapsed/absent node) → no marker, no throw
- src/app/StaffChromeBackdrop.test.ts :: staff host helpers (collapse / search / hover) > relatedStaffIds: hovered + both endpoints of touching lines; boundary = just itself
- src/app/StaffChromeBackdrop.test.ts :: store-driven connector hover > restores connector baseline after null
- src/app/StaffChromeBackdrop.test.ts :: store-driven connector hover > restores connector baseline after {"kind":"position","id":"missing"}
- src/app/StaffChromeBackdrop.test.ts :: store-driven connector hover > restores connector baseline after {"kind":"organization","id":"a"}

### Skipped

None.

## Failures

No test failures reported.

> @org-hierarchy/demo@0.1.0 typecheck
> tsc -p tsconfig.check.json

src/app/App.ts(669,8): error TS2345: Argument of type '() => OrgHierarchyDiagram | undefined' is not assignable to parameter of type '() => Pick<OrgHierarchyDiagram, "subscribeInteraction"> | undefined'.
  Type 'OrgHierarchyDiagram | undefined' is not assignable to type 'Pick<OrgHierarchyDiagram, "subscribeInteraction"> | undefined'.
    Property 'subscribeInteraction' is missing in type 'OrgHierarchyDiagram' but required in type 'Pick<OrgHierarchyDiagram, "subscribeInteraction">'.
src/app/App.ts(711,15): error TS2739: Type 'OrgHierarchyDiagram' is missing the following properties from type 'Pick<OrgHierarchyDiagram, "getStaffChromeGeometry" | "setHovered" | "subscribeInteraction">': setHovered, subscribeInteraction
src/app/ShpsStaffCard.test.ts(3,10): error TS2305: Module '"@org-hierarchy/sdk"' has no exported member 'relatedStaffIds'.
src/app/ShpsStaffCard.test.ts(3,32): error TS2305: Module '"@org-hierarchy/sdk"' has no exported member 'InteractionState'.
src/app/ShpsStaffCard.ts(1,10): error TS2305: Module '"@org-hierarchy/sdk"' has no exported member 'relatedStaffIds'.
src/app/ShpsStaffCard.ts(74,39): error TS2344: Type '"getStaffChromeGeometry" | "setHovered" | "subscribeInteraction"' does not satisfy the constraint 'keyof OrgHierarchyDiagram'.
  Type '"setHovered"' is not assignable to type 'keyof OrgHierarchyDiagram'.
src/app/ShpsStaffCard.ts(92,39): error TS2344: Type '"setHovered"' does not satisfy the constraint 'keyof OrgHierarchyDiagram'.
src/app/ShpsStaffCard.ts(369,29): error TS18046: 'diagram.setHovered' is of type 'unknown'.
src/app/ShpsStaffCard.ts(370,29): error TS18046: 'diagram.setHovered' is of type 'unknown'.
src/app/StaffChromeBackdrop.test.ts(3,10): error TS2305: Module '"@org-hierarchy/sdk"' has no exported member 'relatedStaffIds'.
src/app/StaffChromeBackdrop.test.ts(3,32): error TS2305: Module '"@org-hierarchy/sdk"' has no exported member 'InteractionState'.
src/app/StaffChromeBackdrop.ts(44,38): error TS2344: Type '"subscribeInteraction"' does not satisfy the constraint 'keyof OrgHierarchyDiagram'.
src/app/StaffChromeBackdrop.ts(47,25): error TS18046: 'diagram.subscribeInteraction' is of type 'unknown'.
src/app/StaffChromeBackdrop.ts(47,55): error TS7006: Parameter 'state' implicitly has an 'any' type.
src/app/StaffChromeBackdrop.ts(65,48): error TS2344: Type '"subscribeInteraction"' does not satisfy the constraint 'keyof OrgHierarchyDiagram'.
npm error Lifecycle script `typecheck` failed with error:
npm error code 1
npm error path /Users/strelia/projects/dg/packages/demo
npm error workspace @org-hierarchy/demo@0.1.0
npm error location /Users/strelia/projects/dg/packages/demo
npm error command failed
npm error command sh -c tsc -p tsconfig.check.json

> org-hierarchy@0.1.0 lint
> oxlint --max-warnings 0


FACT: Final owned test run passed 15/15, exit 0; final npm run lint passed, exit 0. Full unfiltered command output is appended above. Final demo-only noEmit typecheck exited 1 exclusively on missing interaction API/selector declarations and their consequent type errors; the geometry fixture error is resolved.
FACT: Scope inspection: this continuation changed only App.ts, ShpsStaffCard.ts, StaffChromeBackdrop.ts and the two corresponding test files, plus this append-only log. No obsolete installStaffHoverHighlight reference or demo-local relatedStaffIds implementation remains. Scoped git diff --check produced no diagnostics. Existing SDK/docs/unrelated work was preserved.

### Done
FACT: Card pointer enter writes the seat position ref (including filled seats with a person ref); pointer leave writes null. React card and backdrop subscriptions render hover-derived card opacity and connector path/circle accents. The SDK barrel selector owns related membership. App passes the live diagram to cards and a lazy diagram getter to the backdrop, and no longer installs/disposes delegated DOM hover.

### Tested scenarios
FACT: RED recorded missing facade input and missing connector accent. GREEN covers pointer input versus subscription-only painting, direct parent/child related sets, unrelated dimming, leave/clear, search-focus restoration, unknown position and wrong-kind hover, connector stroke/width/circle fill, and unsubscribe on unmount. Existing camera geometry, found-marker, focus, and collapse-chevron tests remain green. These are mounted React tests with a typed facade fake, not full-diagram integration tests.

### Non-obvious findings
FACT: The backdrop factory is prepared before the diagram exists, requiring a getter. Filled-seat node.ref may name a person, while connectors and related dimming use position ids. The facade subscription does not replay a current snapshot: mounted components consume subsequent state notifications; pre-existing hover before mount is not claimed as covered.
FACT: The permitted demo noEmit typecheck resolves SDK package dist declarations, whereas Rsbuild/Rstest resolve source aliases. Shared dist was not rebuilt or edited. Integration owner must rerun typecheck after the separately authorized SDK declaration build.

### Screenshots
FACT: NOT_TESTED — no browser run or screenshot capture was part of these permitted targeted checks.

### User-flow walkthrough
FACT: Enter a seat → setHovered(position ref) → SDK notification → related cards remain full, unrelated cards dim to .45, touching connectors brighten/thicken, other connectors dim to .18. Leave → setHovered(null) → notification restores connector baseline and the current search-focus opacity (.38 for non-found seats). Unknown or non-position hover uses the baseline.

### Remaining / post-deploy
FACT: No build, root typecheck, emitting tsc, commit, push, branch/worktree switch, SDK edit, or external store was used. Post-deploy/browser verification and independent review are NOT_TESTED in this coder task. No successful external session checkpoint is claimed.
NEXT: Integration owner reviews D1-D and reruns demo typecheck once SDK declarations are refreshed under separate authorization; no further D1-D code change is pending in the approved scope.
STATUS: DONE — D1-D implemented; 15/15 targeted tests and lint pass; demo typecheck remains blocked by stale SDK dist declarations.
