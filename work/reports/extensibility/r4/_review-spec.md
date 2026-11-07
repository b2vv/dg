claude-opus-4-8

NEXT: read spec.md, plan.md §6 rows 1-15, ROADMAP §R4, then the diff + untracked test files.

FACT: Read spec.md, plan.md (§6 rows 1-15), Viewport.ts diff, wheelConfig.ts + test, Viewport.test.ts diff, OrgHierarchyDiagram.wheel.test.ts, facade/barrel/PixiHost/USAGE diffs.

FACT: wheelAction logic (wheelConfig.ts:32-43): shift-first (panHorizontal false → 'none'); behavior 'pan' OR zoom 'none' → pan-vertical; Mac modifier = ctrl||meta (priority, not remap), non-Mac strict per gestures.zoom; behavior 'zoom' OR modifier → zoom. onWheel (Viewport.ts:266-288): action 'none' returns BEFORE preventDefault/cancelAnimation → does not consume. Keyboard (Viewport.ts:290-297): ctrl|meta & !alt & +/=/- → zoomBy, unconditional of wheel cfg. zoomBy (Viewport.ts:384-396): animateTo + pendingZoom=target; getZoom returns pendingZoom ?? scale (line 123). cancelAnimation/setZoom/setTransform clear pendingZoom (lines 262,116,91).

FACT: Row-by-row red-if-deleted mapping:
 #1 default zoom-modifier → wheelConfig.test:9-14 + facade:31-47 (shift not prevented, no pan; ctrl zooms; plain pans). RED if shift-horiz default restored.
 #2 behavior zoom → wheelConfig.test:17 + Viewport.test "routes configured zoom".
 #3 behavior pan → wheelConfig.test:18 + Viewport.test pan branch + facade:49-55.
 #4 gestures.zoom meta (non-Mac only meta) → wheelConfig.test:22-26.
 #5 Mac ⌘ zooms → wheelConfig.test:28.
 #5b (B1) Mac ctrl pinch zooms → wheelConfig.test:29 (both zoom='ctrl'&'meta'). RED if Mac used strict remap.
 #6 zoom 'none' → wheelConfig.test:33-40 (both platforms, all behaviors incl 'zoom').
 #7 panHorizontal 'shift' → wheelConfig.test:19 + Viewport.test enabled=true + facade:66-69.
 #8 panHorizontal false not consumed → Viewport.test "leaves disabled Shift...unconsumed" (defaultPrevented false) + facade:37-42. RED if onWheel preventDefaulted.
 #9 keyboard zoom + clamp → Viewport.test "makes canvas focusable..." (tabIndex, ctrl/meta × +/=/-, clamp at min/max, detached no-op).
 #10 animated zoomBy → Viewport.test "animates zoomBy..." (world.scale.x==1 right after, interpolates). RED if instant zoomAt.
 #11 IN/OUT focal stability → Viewport.test focal invariant (60-x)/scale≈60 for ±deltaY.
 #12 no config default → facade:31-47 (create wheel undefined).
 #13 unknown config no throw → wheelConfig.test:42-46 (malformed JSON equals default).
 #14 behavior precedence (pan ignores gestures.zoom) → wheelConfig.test:18.
 #15 zoomBy sync getZoom + accumulate → Viewport.test "animates zoomBy..." (getZoom==2 immediately, ==4 after 2nd, ==0.5 clamp). RED if getZoom returned scale.

FACT: All 29 targeted tests pass (wheelConfig/Viewport/facade). No true-without-feature found: each guard tied to a deletable behavior.

FACT: Owner-decision conformance — default 'zoom-modifier' (resolveWheelConfig:25) ✓; panHorizontal:false Shift→host (line 27, wheelAction:36) ✓; Mac PRIORITY not remap (wheelAction:39-41, test:29) ✓; keyboard zoom ✓; animated button (zoomBy→animateTo) ✓; USAGE §Wheel documents contract incl. the owner-flagged Shift behavior change explicitly.

DECISION: No blocking findings. Two non-blocking notes below. VERDICT: GREEN.
