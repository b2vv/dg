# T38 — Contour stroke clear of cards + round joins

**Пріоритет:** P0 (читабельність контуру)  
**Статус:** done  
**Контекст:** live audit https://b2vv.github.io/dg/ Variant B — Chaikin `smooth=2` dips into person AABBs (clearance 0 vs 2px at `smooth=0`).

## Root cause

Chaikin corner-cutting shrinks the IT C-contour into option-A cards (esp. P5/P6 top edges facing the CEO notch). Contours sit under cards, so the stroke reads as “cutting through” card borders / notch seams. Faceting at `smooth=2` is mild geometrically (≈28° max turn); sharp joins made corners look harsher.

## Delivered

1. **`nudgeContourClearOfBoxes`** — project invading ring samples outside card AABBs (+ margin), densify chords until clearance ≥ `stroke/2 + 2px`.
2. **`DiagramRenderer`** — staff paint passes per-dept card boxes; `contourPoints()` applies nudge after world transform (incl. morph).
3. **`DepartmentBlobView`** — Pixi stroke `join/cap: 'round'`.
4. Regression: `contourClearance.test.ts`, `variantBContourStrokeDiag.test.ts` (raw Chaikin fails clearance; nudged clears; CEO stays outside).

## Remaining (lower priority — not in this PR)

| # | Issue | Severity | Note |
|---|--------|----------|------|
| R1 | Large empty U-loops (smooth radius) | Med | Partially mitigated by T39 Smooth default 1; full G7 prune later |
| R2 | Report edges low contrast on blue fill | ✅ | T38 contrast + T39 arrows + quieter fill |
| R3 | Hierarchy still “notch legend” dependent | Med | T39 arrows help; caption updated |
| R4 | LOD `simplifyPolyline` faceting at mid/far | Low | Only far/mid |

## Verify

```bash
npm run build:wasm   # if core changed — not required for T38 (TS-only)
npm test && npm run typecheck
```
