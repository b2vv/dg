# T41 — Contour notch / corner fillet

**Пріоритет:** P1  
**Статус:** done  
**База:** T40 pad0 + stroke punch-out

## Problem

Orthogonal / Chaikin contour corners stay square while person cards use `borderRadius: 10` — notch and outer corners look mismatched.

## Delivered

- `filletClosedRing` — circular arcs on **convex** corners only (`CONTOUR_CORNER_RADIUS = 10`)
- Concave notch reentrants stay sharp (CEO mouth preserved)
- Applied in `DiagramRenderer.contourPoints` **before** AABB clearance nudge

## Tests

- `contourFillet.test.ts` — square softens; notch stays; no-op cases
- Existing Variant B align + stroke clearance suites

## Verify

```bash
npm test && npm run typecheck
```
