# T51 — Zoom mid card center + button-group contour

**Пріоритет:** P0  
**Статус:** done  
**Джерело:** live Variant B — wrong node positions on zoom; padding/smooth → stair “noise” instead of button-group chrome

## Problem

1. **Zoom / mid LOD:** person chrome was top-aligned in the layout AABB while far dots were centered → cards look shifted when zooming through mid.
2. **Contour params:** cell-flood + orthogonal/Chaikin edges read as jagged noise; expected look is a **button group** (one rounded rect around adjacent cards).

## Delivered

- Mid LOD: `PersonNode` + `visualPersonEdgeBox` vertically center the shortened card
- `contourButtonGroup` — member boxes inside ring → rounded AABB when solid (≥85% sample coverage)
- `polishContourRing` **always** button-group wrap around member cards (no L/C fillet fallback)
- Demo Smooth default **2**; Padding still scales button-group margin in px

## Tests

- `contourButtonGroup.test.ts` — solid row / members / L-hole failure
- `contourPolish.test.ts` — noise → rounded; empty failure
- `visualEdgeBox.test.ts` — mid centered

## Verify

```bash
npm test && npm run typecheck
```
