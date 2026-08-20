# T19 — Animated camera (fitView / resetView / panTo)

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** T15 fitView ✅

---

## TDD

### Success
- [x] `animateTo` reaches target transform
- [x] `fitBounds(..., { animate: true })` tweens to fit scale
- [x] Diagram `fitView` / `resetView` / `panTo` default `{ animate: true }`
- [x] Sync path unchanged when motion omitted / `{ animate: false }`

### Failure
- [x] `beginPan` / wheel / `setTransform` cancel in-flight tween
- [x] cancel mid-flight leaves intermediate camera (no jump to end)

---

## Delivered

- `Viewport.animateTo` / `computeFitTransform` / `CameraMotionOptions`
- User pan & wheel cancel camera tween
- Public API: `fitView(padding?, motion?)`, `resetView(motion?)`, `panTo(..., motion?)`
- `focusNode` pans with animation

## Out of scope

- TD07 promote overlay
- Staff expand-in-place (SPEC §2.2 follow-up)
