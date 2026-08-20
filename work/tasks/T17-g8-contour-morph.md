# T17 — G8 contour morph during drag

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** T04 drag ✅, T16 incremental contours ✅

---

## TDD

### Success
- [x] `resampleClosedRing` / `lerpClosedRings` interpolate closed rings
- [x] `runPointMorph` reaches target; cancel stops further frames
- [x] `DepartmentBlobView.redrawPoints` updates drawn ring
- [x] Drag move across snap cells → provisional contour recompute + morph (DiagramRenderer)

### Failure
- [x] empty ring → safe zero samples
- [x] invalid snap / cancel drag → restore base contours
- [x] component count change (M4 split) → hard replace (no broken lerp)

---

## Delivered

- `render/contourMorph.ts` — resample, align, ease-out lerp, raf morph driver
- `DepartmentBlobView.redrawPoints` / `fromPoints` / `getDrawnPoints`
- Live drag preview: on snap cell change → incremental compute → morph (~160ms)
- `RenderOptions.contourMorphMs` (0 = snap)

## Out of scope

- Animated camera tween
- TD07 promote overlay
