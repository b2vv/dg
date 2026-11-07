claude-opus-4-8

# Helper H2 — fact gathering for TransitionController (read-only)

NEXT: Q1 clock — find Viewport.animateTo clock interface, injection; runPointMorph clock; test fake-clock helper; shared clock type export.

## FACTS

### Q1 Clock
- CameraMotionOptions declared inline, Viewport.ts:18-24 — `animate?`, `durationMs?`, `now?: ()=>number`, `requestFrame?: (cb:(time:number)=>void)=>number`, `cancelFrame?: (id:number)=>void`.
- animateTo resolves defaults Viewport.ts:198-201 (`performance.now`, `requestAnimationFrame`, `cancelAnimationFrame`); tick loop 205-242.
- runPointMorph: contourMorph.ts:116-178, SAME inline trio now/requestFrame/cancelFrame (122-131), same default fallbacks.
- NO shared exported Clock type — grep "Clock" in src *.ts returns only the two inline option interfaces; each duplicates the trio.
- Test fake clock = plain closures, no helper: Viewport.test.ts:139-157 pushes cb into a `queue`, advances `time` manually, drains queue; cancelFrame clears queue. contourMorph.test.ts:49-94 same pattern (frames[] array, manual time).

### Q2 Paint
- PixiHost.requestPaint PixiHost.ts:269-281: guard `if (this.paintRequested || this.destroyed) return;` sets `paintRequested=true`, schedules ONE rAF; inside frame resets handle+flag, then `renderer.cullToViewport(getViewport, getScreenSize)` THEN `app.render()`. Coalesces many calls to one frame.
- Keep-painting mechanism: DiagramRenderer.onNeedsPaint (DiagramRenderer.ts:213) wired to host.requestPaint (PixiHost.ts:343); renderer.requestPaint callback at 264. No continuous loop exists — each state change calls requestPaint once. A tween must re-call requestPaint every frame itself to keep painting (no built-in "while animating" loop). Motion-blur uses a settle timer (setTimeout viewportSettleMs) not a frame loop (OrgHierarchyDiagram.ts:615-616).

### Q3 reduced-motion
- Only read site in src logic: resolveMotionBlur OrgHierarchyDiagram.ts:2544-2547 `window.matchMedia('(prefers-reduced-motion: reduce)').matches` → returns null (checked once at create, mid-session toggle NOT tracked, comment 2538).
- theme.ts:14 reads prefers-color-scheme (not motion).
- Tested motionBlur.contract.test.ts:106-124: overrides window.matchMedia to match reduced-motion, asserts blur never runs, restores orig in finally.
- Global test stub rstest.setup.ts: matchMedia stubbed, matches only queries containing 'dark' → reduced-motion is FALSE by default in tests.

### Q4 Config precedent
- Declared on OrgHierarchyConfig: `motionBlur?: boolean | Partial<MotionBlurOptions>` OrgHierarchyDiagram.ts:161; `staffRefitOnToggle?: boolean | StaffFitOptions` :164.
- Resolved in create(): motionBlur via resolveMotionBlur(config.motionBlur ?? true) :496 (DEFAULT ON); staffRefitOnToggle = config.staffRefitOnToggle ?? false :497 (DEFAULT OFF, stored raw, normalized at use :1533-1535 `=== true ? {} : value`).
- resolveMotionBlur pattern OrgHierarchyDiagram.ts:2539-2551: falsy→null; reduced-motion→null; true→{...defaults}; obj→{...defaults,...cfg}.
- Docs USAGE.md:139 (motionBlur row), :140 (staffRefitOnToggle row) — config options table in Ukrainian. fitView animate documented :347,:1026.

### Q5 Test infra
- rstest.setup.ts: mocks 2d (permissive Proxy) + webgl context so Pixi inits in jsdom; stubs matchMedia (dark-only), ResizeObserver; beforeAll loads real WASM. jsdom "starves requestAnimationFrame" (PixiHost.test.ts:215 comment) — rAF does not auto-fire.
- No shared mount helper module; each test defines local `async function mount()` e.g. staffRefitOnToggle.test.ts:36-56 (creates div, OrgHierarchyDiagram.create, reaches host via `(diagram as unknown as {host:PixiHost}).host`, cleanup destroys). Many test files repeat this.
- Deterministic stepping: spy requestAnimationFrame to push callbacks into an array and invoke manually — PixiHost.test.ts:110-113 (frames[] + manual) proves cull-then-render order. Same closure-queue pattern as the clock injection in Q1. So render timing IS steppable deterministically via either rAF spy or injected clock trio.
