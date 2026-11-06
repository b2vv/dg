claude-opus-4-8

NEXT: gather full R4 diff + untracked files; read each for STANDARDS + 4 correctness checks.

FACT: wheelConfig.ts — resolveWheelConfig (pure, platform injected as param) + wheelAction (pure per-event decision). No side effects, no globals. KISS honored: decision is a pure function; Viewport only consumes it.

FACT (Check 1 — Mac pinch): wheelConfig.ts:39-42 Mac branch modifier = ctrlKey||metaKey (priority, NOT meta-exclusive). Test wheelConfig.test.ts:27-30 asserts mac+ctrl→'zoom' AND mac+meta→'zoom'. Platform is an injected param → deterministic. Red-if-deleted: a meta-exclusive remap makes mac+ctrl→'pan-vertical' → line 29 fails. SOLID.

FACT (Check 2 — conditional preventDefault): Viewport.ts:273-276 computes action; action==='none'→return BEFORE preventDefault. Shift+wheel with panHorizontal:false → wheelAction 'none' (wheelConfig.ts:36) → not preventDefaulted. Tests: Viewport.test.ts:311-320 (enabled=false→defaultPrevented false, enabled=true→true) and wheel.test.ts:37-42. Red-if-deleted: old unconditional preventDefault → defaultPrevented true → fails. SOLID.

FACT (Check 3 — zoomBy getZoom sync): pendingZoom field (Viewport.ts:46); getZoom returns pendingZoom??scale (123). zoomBy (386-396) computes clamped target from getZoom()*factor, calls animateTo (visual tween), THEN sets pendingZoom=scale. finish()/cancel()/cancelAnimation() clear pendingZoom (219,250,262). setZoom calls cancelAnimation (116) so it clears stale pending. Ordering correct: read-before-animate, set-after. Test Viewport.test.ts:382-405: zoomBy(2)→getZoom===2 while world.scale.x===1 (animating, not instant), then frame advances scale between 1 and 2, getZoom still 2; second zoomBy(2) accumulates to 4. Red-if-deleted ✓. SOLID.

FACT (Check 4 — keyboard zoom): onKeyDown (292-297) requires (ctrl||meta)&&!alt and key in +/=/-, preventDefault only then; tabIndex=0 (291) restored on detach (303-304). Test Viewport.test.ts:(makes canvas focusable…) tabIndex===0, consumes only zoom combos, plain '+'/ctrl+a/alt+'-' not prevented, clamps at min/max, detached after destroy not prevented. SOLID.

FACT (STANDARDS): .js import specifiers everywhere ✓. import type for type-only (ResolvedWheel/WheelConfig in Viewport, WheelConfig in PixiHost/OrgHierarchyDiagram, export type in index.ts) ✓. No *ForTests in barrel (grep clean) ✓. WASM/core untouched ✓. oxlint --max-warnings 0 → clean exit, no warnings ✓. All 3 R4 test files pass via `npm test -w @org-hierarchy/sdk` ✓.

FACT (ADVERSARIAL): No true-without-feature tests — each asserts a feature-dependent post-state. No fakes masking Mac-pinch/preventDefault: wheel.test.ts spyOn(PixiHost,'create') calls through (only inspects args); events are real WheelEvent/KeyboardEvent dispatched on real canvas, viewport math real. No lint-disable comments in diff.

FACT (USAGE.md accuracy): doc matches code — Mac both ctrl+⌘ zoom; 'none' disables incl. zoom mode (wheelConfig.ts:37); panHorizontal default false → Shift left to host; keyboard Ctrl/⌘ +/-/= around center. Accurate. `wheel` is a config field, not a public method → no facadeSurface gate impact; no new OrgHierarchyDiagram methods.

FINDING [non-blocking] DEAD CODE: isZoomWheel (Viewport.ts:477, exported) has ZERO production callers after R4 — the wheel handler replaced isZoomWheel(e) with wheelAction. Its logic (ctrl||meta) is now the Mac branch of wheelAction. Only wheelGestures.test.ts (pre-existing, not an R4 file) still imports/tests it. Leftover after removing its sole caller. CODING_STANDARDS §0 KISS / no-dead-code. Harmless to correctness; recommend removing the function + its orphaned test, or justify retention.

DECISION: all 4 GATE-2 regression fixes (B1 Mac priority, N1 zoomBy-sync, N2 tabindex, N3 fallback) are honored in the implementation with red-if-deleted tests; platform injected for determinism; no fakes; lint clean. One non-blocking dead-code leftover.

VERDICT: GREEN (one non-blocking finding).
