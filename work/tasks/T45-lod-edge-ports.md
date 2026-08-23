# T45 — LOD-aware staff edge ports (T44 A1)

**Пріоритет:** P0  
**Статус:** done — `personVisualLocalRect` / `personVisualWorldRect` in `personVisualGeometry.ts`

## Problem

Report edges routed against full layout AABB while mid/far paint smaller chrome → floating tails on zoom.

## Delivered

- `visualPersonEdgeBox` / `visualOrgEdgeBox` / `mapStaffEdgeBoxesForLod`
- `DiagramRenderer.renderStaff` + SVG export use LOD boxes
- Arrow shorten skipped when last chord ≤ 2× arrow (no micro-gap)

## Tests

- `visualEdgeBox.test.ts` — near/mid/far geometry + mid port on mid-card
- `staffEdgeArrows.test.ts` — short chord keeps tip on port

## Verify

```bash
npm test && npm run typecheck
```
