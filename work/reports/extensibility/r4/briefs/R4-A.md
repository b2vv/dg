You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/extensibility. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, ONLY your own tests: `npm test -w @org-hierarchy/sdk -- Viewport` and `-- wheelConfig`. On `listen EPERM` rerun with needed permission; busy port → wait+retry. No external store.

WORKING FILE: /Users/strelia/projects/dg/work/reports/extensibility/r4/_impl-R4-A.md — append after every step, first line `NEXT:`, labels, full test output (no pipes). End with one STATUS line.

READ FIRST: work/reports/extensibility/r4/plan.md (§1/§3/§4 R4-A, §5, §6 rows) + spec.md. Code: packages/sdk/src/render/Viewport.ts — onWheel (~:263-278, the UNCONDITIONAL e.preventDefault() at :264 you must make conditional), zoomAt/clamp, animateTo (~:177), zoomBy (~:361), wheelPanDelta, getZoom (reads this.scale), the pinch/ctrl comments at :257/:444-446 (trackpad pinch = synthetic ctrl+wheel).

YOUR FILES (exclusive): packages/sdk/src/render/Viewport.ts, packages/sdk/src/render/wheelConfig.ts (new), + Viewport.test.ts and wheelConfig.test.ts. TDD: failing tests first, RED, implement, GREEN. No wheel config / no behavior change beyond the documented default when the resolved config is the default.

1. `render/wheelConfig.ts` (PURE): `resolveWheelConfig(cfg: WheelConfig | undefined, platform: 'mac' | 'other'): ResolvedWheel` and a pure per-event decision `wheelAction(resolved, { ctrlKey, metaKey, shiftKey }): 'zoom' | 'pan-vertical' | 'pan-horizontal' | 'none'`.
   - Defaults: behavior `'zoom-modifier'`, gestures.zoom `'ctrl'`, panHorizontal `false`.
   - **Mac = PRIORITY not remap (B1):** on `'mac'`, zoom fires when `ctrlKey || metaKey` (so trackpad pinch = ctrl+wheel STILL zooms; ⌘ is the recommended explicit key) — NOT meta-exclusive. On `'other'`, strict: `'ctrl'`→ctrlKey, `'meta'`→metaKey. `'none'` → never zoom via wheel (both).
   - behavior `'zoom'` → plain wheel zooms (no modifier). `'pan'` → wheel never zooms (gestures.zoom IGNORED for wheel, N3). `'zoom-modifier'` → zoom only with the gesture modifier.
   - panHorizontal `false` → Shift+wheel → `'none'` (SDK must NOT handle → caller does NOT preventDefault). `'shift'` → Shift+wheel → 'pan-horizontal'.
   - Unknown/malformed strings → fall back to default (no throw, N3). SSR/undefined platform → treat as 'other' (non-Mac strict).
2. `Viewport.ts`: platform detected ONCE (a small helper: mac if navigator.platform/userAgent indicates Apple; SSR/undefined → 'other'). onWheel calls `wheelAction(...)`: zoom → zoomAt(pointer); pan-vertical/horizontal → wheelPanDelta/moveBy; none → **do NOT preventDefault** (let host have the event, UX risk 2). preventDefault ONLY when SDK acts (zoom/pan).
3. **Keyboard zoom (N2):** add `tabindex=0` to the canvas (or its container) and bind `keydown` there; Ctrl/⌘ + `+`/`=`/`-` → zoom to center (clamped). preventDefault only for those combos. Buttons remain the primary a11y path (don't remove them).
4. **Animated zoomBy (N1 — critical):** zoomBy animates via animateTo BUT `getZoom()` must return the FINAL target immediately (not the mid-tween value). Today getZoom reads `this.scale` and animateTo tweens `this.scale` → they conflict. Resolve explicitly: commit the target to a logical/committed scale that getZoom returns right away, animate only the visual; OR have getZoom return the pending animateTo target while a zoom tween is active. Pick one, document it, and TEST it (zoomBy(f) then getZoom() === final target before the tween finishes).
5. Keep: zoom-at-pointer IN/OUT focal stability, clamp min/max (don't regress).

Tests (Viewport.test.ts + wheelConfig.test.ts) — cover plan §6 rows incl 5 (Mac ⌘ zoom), 5b (Mac ctrl/pinch zoom NOT pan), 6 (zoom:'none'), 8 (panHorizontal:false → no preventDefault, event not consumed), 9 (keyboard zoom), 10 (zoomBy animated), 13 (unknown→default), 14 (behavior:'pan' ignores gestures.zoom), 15 (zoomBy then getZoom===final). Each red-if-deleted. Inject platform into resolveWheelConfig for deterministic Mac/other tests.

Done = your files only; tests GREEN (full output); `npm run typecheck -w @org-hierarchy/sdk` + `npm run lint` pass. STATUS line last.
