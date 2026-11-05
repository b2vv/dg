claude-opus-4-8

NEXT: read spec.md, plan.md §6 (14 acceptance rows), ROADMAP §R5, then the diff and new untracked files.

FACT: Read spec.md, plan.md §6 (14 rows), marquee.ts, 3 test files, diff.
FACT: 47 tests pass via `cd packages/sdk && npm test -- <files>` (31 marquee + 11 renderer + 5 facade). Direct `npx rstest run` fails only on env (window undefined) — not a defect.
FACT: mount(334) precedes bindPan(347) in PixiHost → marquee `down` listener registered first → stopImmediatePropagation blocks later pan listener (verified ordering).
FACT: scene.listBoxes() returns world NodeWorldBox, LOD-independent → far-LOD hit-test valid.
FACT: callHostCallback refactored (…args → args[]+onError); all 4 call sites (529/751/1089/1495) updated; typecheck enforces.

ROW MAP (all red-if-deleted by assertion logic):
1 adds (empty→{B}): facade throwing-host onSelect(['B'])→[B]. OK
2 additive union+dedup+order: facade union test select(A)+onSelect([B,C,B,A])→[A,B,C]. replace would give [B,C,A]→red. OK
3 intersect not inside: marquee.test partial + exact-contact. OK
4 click-not-drag: renderer 4px move→no onSelect, onCanvasClick once. OK
5 rect/frame + null: renderer onRect calls + null; facade forward. OK
6 no onMarquee→nothing: facade absent-sink + renderer no-sink pans. OK
7 far-LOD: renderer far scale 0.5 selects. OK
8 rest 0 work: renderer idle-moves-no-work. OK (event-driven, no rAF)
9 Shift-gate no-shift pans: renderer plain-drag-with-sink pans. OK
10 Shift+drag=marquee not pan: renderer transform unchanged (stopImmediatePropagation). OK
11 no-onMarquee Shift pans: renderer no-sink Shift pans. OK
12 tapAfterDrag: renderer genuine-drag suppresses onCanvasClick, next plain click deselects (reset verified). OK
13 world-start stable: renderer mid-drag camera change, rect stable. OK
14 throw isolated 1 warn: facade throwing-host, 3 onRect+onSelect run, warn once, error none. OK

OWNER-DECISION CONFORMANCE (code vs plan):
- trigger Shift+left-drag: down guard `e.shiftKey && e.button===0`. OK
- always-additive: facade onSelect builds union, no replace path. OK
- opt-in via onMarquee: facade installs sink only if config.onMarquee. OK
- emphasis/hover untouched: diff touches only selection (replaceMany+repaintSelection); no hover/emphasis code. OK

NON-BLOCKING OBSERVATIONS:
- Marquee pointer listeners attached on mount unconditionally; no-op when sink null (down/move early-return). Behaviorally byte-for-byte; tiny extra idle listener. non-blocking.
- Empty marquee onSelect([]) re-runs replaceMany(existing)+repaintSelection → may re-emit onSelectionChange redundantly; selection refs unchanged (spec satisfied). Union test asserts getSelections unchanged but not absence of re-emit. non-blocking.

DECISION: all 14 rows implemented + covered by red-if-deleted tests; code matches plan and owner decisions. VERDICT GREEN.
