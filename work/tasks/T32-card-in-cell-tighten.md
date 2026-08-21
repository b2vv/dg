# T32 — Card-in-cell tighten (option A)

**Пріоритет:** P1  
**Статус:** done

## Decision (from layout discussion)

Keep Variant B **notch sketch** (CEO in the middle). Improve “node in block” by making the card nearly fill the grid cell.

## Geometry

| | Before | After |
|--|--------|-------|
| Card | 128×148 | **136×156** |
| Cell | 148×168 | **140×160** |
| Inset | 10×10 | **2×2** |
| Fill ratio | ~82% / ~88% | **≥95%** both axes |

Corridor cells under the top IT row are shorter (160 vs 168), so the empty “basement” under Олена shrinks; cards read as sitting in their blue frames.

## Tests

- `cardInCellGeometry.test.ts` — inset ≤4, fill ≥95%, AABB centering
