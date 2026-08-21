# T40 — G7-lite padding + contour stroke punch-out

**Пріоритет:** P1  
**Статус:** done  
**База:** T38 clearance + T39 arrows on main

## Problem

Vacant U-tongues from demo `paddingCells: 1` (flood into empty cells). Contour stroke under cards fought shadows (unstable z-order look).

## Delivered

1. **Demo `paddingCells: 0`** — slider still 0–2 for debug; default kills vacant exterior fill.
2. **G7-lite** — `CONTOUR_OWN_PADDING_PX = 6` in `contourCardClearanceMargin` (stroke/2 + 6) via existing `nudgeContourClearOfBoxes`.
3. **Stroke punch-out layer** — fill under cards; `LayerManager.departmentStrokes` above persons so corridor outlines stay visible.

## Deferred

- True Rust G7 / morphological peel if pad slider must stay at 1
- ~~Notch corner fillet ≈ card radius~~ → **T41**

## Tests

- `variantBTonguePad.test.ts` — pad0 ring area ≪ pad1
- `DepartmentBlob` stroke not a child of fill container
- existing clearance / align suites

## Verify

```bash
npm test && npm run typecheck
```
