# T14 — Contour G6 explicit far-side wall drop

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** T07 (M4 / prefer_notch) ✅

---

## TDD

### Success
- [x] Variant B: no vertical contour segment on the right edge of CEO (P4)
- [x] CEO cell center stays outside IT fill (M2)
- [x] Stable under `RUST_HASH_SEED` matrix

### Failure / regression
- [x] Variant A notch still ≥ 6 true corners; CEO outside fill

---

## Delivered

`apply_g6_clear_far_side_fill` — after flood (+ prefer_notch), remove empty fill cells adjacent to foreign on faces with no own beyond. That prevents walls such as “справа від P4”.

## Docs

SPEC §3.3 G6 → ✅
