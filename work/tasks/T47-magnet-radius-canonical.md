# T47 — Variant B magnetRadius: 2, not inflated 8

**Пріоритет:** P0 (коректний магнетизм «поруч»)  
**Статус:** ⚠️ superseded by [T49](./T49-adjacency-magnetism.md)  
**Нотатка:** `magnetRadius: 2` все ще дає **один C-blob**. Справжній магнетизм «поруч» — **1.5** (T49).

---

## Проблема

Demo ставив `magnetRadius: 8`, щоб «насильно» зліпити IT у один C-blob. Це ховає справжній магнетизм: злипаються клітини далеко не «поруч».

## Правило

Manhattan gap верх IT ↔ низ IT у Variant B = **2** (P1@(0,0)→P5@(0,2)).

| `magnetRadius` | IT components |
|----------------|---------------|
| 1.5 | 3 (верх + P5 + P6) |
| **2** | **1** (канонічний C) |
| 8 | 1 (той самий C, але радіус брехливий) |

## Фікс

- Константа `VARIANT_B_MAGNET_RADIUS = 2`
- Demo Variant B / Worker + тести + Rust fixture default_cfg
- Регресія `variantBMagnetRadius.test.ts`
