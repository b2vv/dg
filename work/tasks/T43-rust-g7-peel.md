# T43 — Rust G7 vacant peel (true padding)

**Пріоритет:** P1  
**Статус:** done  

## Problem

`padding_cells` only expanded the flood bbox (Chebyshev), filling vacant exterior U-tongues. T40 demo defaulted to pad=0 as a workaround.

## Delivered

- `apply_g7_peel_vacant_exterior` — peel empty cells with Manhattan distance to own **> pad**, bridge-preserving via `own_component_count`
- Order: flood → notch (G5) → **G6** → **G7** (so G6 can still clear CEO far-side using temporary exterior pad)
- Demo **paddingCells = 1** again (breathing room without tongues)

## Tests (Rust)

- Diagonal corners peeled; orthogonal pad kept
- Mid-corridor bridge restored
- Variant B pad=1: C-arms + no CEO wall
- Peel shrinks fill vs post-G6 unpeeled

## Verify

```bash
npm run test:rust && npm run build:wasm && npm test && npm run typecheck
```
