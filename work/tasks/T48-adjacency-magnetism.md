# T48 — Adjacency magnetism (no forced C-blob)

**Пріоритет:** P0  
**Статус:** ✅ done  
**Джерело:** user — «C-ескіз невірний»; «ряд зверху і два окремих знизу»; «якщо між ними відстань в одну ноду — не магнітяться»

---

## Правило

Магнетизм = той самий `departmentId` **і** Manhattan ≤ **1.5** (сусідні клітинки).  
Gap **2** (одна порожня клітинка між) → **окремі** компоненти (M4).

Variant B IT:

| Група | Cells | Contour |
|-------|-------|---------|
| Top | P1–P3 @(0..2,0) | 1 blob |
| Bottom-left | P5 @(0,2) | 1 blob |
| Bottom-right | P6 @(2,2) | 1 blob |

`magnetRadius: 2` або `8` зліплює все в один C — **не** той магнетизм.

## Фікс

- `VARIANT_B_MAGNET_RADIUS = 1.5`
- Demo caption: magnetic groups, not “head in the notch” C
- Tests: 3 IT components; radius 2 = forced C (failure case for demo intent)
- G6/G7 / tongue / stroke suites that need a single C keep `magnetRadius: 2` explicitly
