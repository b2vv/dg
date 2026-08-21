# T31 — Regression tests, zoom FAB, 100k window, code review fixes

**Пріоритет:** P0  
**Статус:** done

## Code review (T29/T30) — findings fixed

| Issue | Severity | Fix |
|-------|----------|-----|
| Adaptive edges drew through overlapping cards | P0 | Side ports only with clear gap; else vertical |
| Contour world offset single-sample + gap drift | P0 | Pitch-aware `contourWorldTransform` |
| SVG export ignored `staffLayout` (margin 32 vs 0) | P0 | Pass `staffLayout` + same world map |
| Pinch zoom-then-pan drifted focal point | P1 | Pan mid, then `zoomAt` |
| No mobile zoom on diagram surface | P1 | FAB `+ / − / Fit` on mount |
| 100k orgs would freeze if fully rendered | P0 | Windowed tab (400 of 100k) |

## Tests added

- Edge through-card / matrix mid-gap / slight-offset admin
- Contour transform with nonzero gap (col 2)
- SVG export staffLayout margin=0
- Pinch focal stability
- Scale-100k window size & parent containment

## Demo

- Tab **100k orgs**: search `org-50000` jumps window; click re-centers
- Zoom FAB on every diagram
