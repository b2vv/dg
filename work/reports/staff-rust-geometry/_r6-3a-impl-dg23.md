# R6-3a імплементація (жива нота, Dg23)

Гілка `feat/t126-staff-rust-geometry`. Scope підтверджено власником (див. `_r6-3a-partindex-decision-dg23.md`).
Цикл R6: критик ✅ (dg22 + partindex dg23) → **TDD red-first (тут)** → ревʼю-агент → гейти без pipe → коміт з «го».

ДАЛІ: детектор-оракул `staff_clearance.rs` (#[cfg(test)]) з дискримінаторами на РУЧНИХ полілініях.

## Три частини R6-3a
1. **Детектор-оракул** (test-only, `#[cfg(test)] mod staff_clearance`):
   - `seg_rect_distance(a,b,rect)->f32` — порт `clearance.ts::segRectDistance` (точна відстань, 0 якщо перетин).
   - `polyline_hits_box_interior(pts,rect,eps=0.75)->bool` — порт `staffEdgeGeometry.ts::polylineHitsBoxInterior` (interior, НЕ f32 `==0` — P1).
   - `card_clearance(routes,boxes)->(min,violations)` — ≥8px, self-exempt по id (порт cardClearance).
   - `foreign_frame_intrusions(routes, frames, member_of)->usize` — interior-hit eps 0.75; членство
     per-part: рамка(dept,part) «своя» ребру ⟺ один з кінців має рівну пару (Option-aware). Порт
     edgeIntrudesForeignFrame+throughThirdFrame, об'єднаний на per-part A.
   - Тести ДИСКРИМІНАТОРИ (P8): ручна інтрузивна полілінія → N>0; чиста → 0; фікстури далеко від 8px (P6).
2. **Інтеграція** `staff_routes` по per-LOD боксах:
   - уніфікований lookup {id → (kind, EdgeRect per-LOD)}: persons через `visual_person_edge_box`(+hints),
     org-cards через `visual_org_edge_box`. Закриває HOLE-2 (org-card ціль `to_id==org_id`, не skip).
   - порти з per-LOD бокса (не сирого вузла). near+no-hints = повний бокс = паритет R6-1.
   - hints — плейн-параметр (map id→PersonEdgeHints), HOLE-1. Контракт/regen НЕ чіпаємо (внутрішні типи).
   - НЕ заявляє «0 порушень» (обходу нема) — чесно; вмикає наївну cross-tier геометрію (зафіксовано).
3. **Набір перешкод** (Rust): картки (obstacle figma-row розгортається), чужі рамки (per-part),
   `.dn`/label_band ОКРЕМИМ входом (band-rect foreign-only). Детермінований порядок (P-E).
   ⚠️ СВІДОМО НЕповний проти §5.1: нема `.tg`/лічильника/`.plink span`, `.dn`=4px — зафіксувати (не повнота).

## Пастки (критик, тримати)
P1 eps 0.75 не f32==0 · P2 єдиний id-простір person.id/org_id/dept_id · P3 унікальність (dept,part)
upstream · P4 Option-рівність None · P5 перешкоди за LOD (persons/orgs shrink; рамки/band інваріантні) ·
P6 фікстури далеко від 8px, категоріальні асерти · P7 figma obstacle-розгортання · P8 ручні полілінії.

## Журнал кроків
- (старт) план зафіксовано; читаю готові staff_routes/staff_edge_box/clearance/types — ✅.
- **Частина 1 — детектор-оракул ГОТОВО** (`staff_clearance.rs`, `#[cfg(test)] mod` у lib.rs).
  12 тестів зелені. seg_rect_distance (точний) + segment_hits_box_interior (sampling eps 0.75) +
  card_clearance (self-exempt id, obstacle-розгортання P7) + foreign_frame_intrusions (per-part A).
  МУТАЦІЙНА ПЕРЕВІРКА: key→per-department → `other_part_is_foreign` + `own_part_not_counted` ПАДАЮТЬ
  (дискримінують A/B), решта лишаються зелені. Revert-нуто. Порт вірний: eps 0.75 interior (не f32==0),
  ORIENT_EPS 1e-6 (P1, не 1e-9).
- ЧЕКПОЙНТ (власник): детектор прийнято («все ок»), але спливли ПРОПУЩЕНІ моменти (ярусна модель,
  org-картки, плінк) → аналіз `_r6-missed-points-analysis-dg23.md`. Рішення власника: ярусні org-лінки
  = штрих-плінк, кінець top org-картки; ДОДАЄМО зріз R6-7 у межах T126; детектор комітимо після ревʼю.
- ДАЛІ: ревʼю-агент на детектор → коміт частини-1 → потім частина-2 (інтеграція) вже з урахуванням
  ярусного шару. Backlog: dev-тулз рендеру карток (кінець T126).
- Скріни мокапів підтвердили: панель статистики роутера (5 критеріїв §10.4) = наш детектор-оракул.
