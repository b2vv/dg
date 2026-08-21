# T50 — Chebyshev pad: row of cells is a rectangle (no “hat”)

**Пріоритет:** P0  
**Статус:** ✅ done  
**Джерело:** live QA — верхній IT blob виглядав як «шляпа», очікувалось квадрат+квадрат+квадрат = прямокутник

---

## Причина

G7 peel різав клітинки з **Manhattan > pad**. Кут `(-1,-1)` від own має Manhattan **2** при pad=1 → зрізався → сходинки на кінцях ряду → після Smooth виглядало як шляпа.

## Фікс

G7 pad distance = **Chebyshev** `max(|dc|,|dr|) ≤ pad` (прямокутний envelope).  
Vacant tongues далі за pad як і раніше зрізаються.

## Done when

- [x] Rust: `g7_row_of_three_pad1_is_axis_aligned_rectangle` (4 corners)
- [x] TS: `variantBRectRow.test.ts`
- [x] REQUIREMENTS / SPEC G7 wording
