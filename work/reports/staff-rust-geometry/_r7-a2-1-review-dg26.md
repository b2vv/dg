claude-opus-4-8

# R7 A2.1 spatial-index — НЕЗАЛЕЖНЕ рев'ю ПІСЛЯ кроку (Dg26)

ДАЛІ: читаю повний diff staff_routes.rs + сам файл, звіряю новий clean-path із старим route_clear_of (байт-еквівалентність), B1/B2/B3, межові, зуби тестів.

## ФАКТ — 1. Байт-еквівалентність split (ПІДТВЕРДЖЕНО)
- Старий main викликав `detour_edge` напряму; він усередині рахує `base=route_ortho` і `route_clear_of(base,obs)` (`:351-354`). obs=`obstacles_for_edge`=картки(∖from/to by id)+чужі рамки (`:198-213`).
- Новий main (`:462-483`): `base=route_ortho`; якщо `idx.clear_of(base,...) && !foreign_frame_blocks(base,...)` → вертає base; інакше будує той самий obs і кличе той самий detour_edge.
- route_clear_of(base,obs) = (жодна картка∖from/to <pad) AND (жодна чужа рамка <pad) — порядок у OR-скані не впливає на булеве → AND розкладається тотожно. ✓
- (а) clear_of==наївний скан: prune ніколи не губить блокер dist<pad (див. B1). exact-гілка ідентична route_clear_of. rects=obstacle_rect(c) ті самі; skip-by-id той самий (`:303` vs `:201`). ✓
- (б) foreign_frame_blocks (`:321-340`) exempt-предикат `Some(&k)==src||==dst` БАЙТ-в-байт як `obstacles_for_edge:208`; ті самі `(f.x,f.y,f.width,f.height)`; !blocks == route_clear_of над підмножиною рамок. ✓
- (в) на блоці detour отримує ІДЕНТИЧНИЙ obs і сам рекомпутить base → той самий маршрут. Зовнішній `base` у else відкидається (мікро-марна рекомпутація route_ortho, НЕ баг). ✓

## ФАКТ — 2. B1 EXACT (ПІДТВЕРДЖЕНО, усі 3 нерівності)
- band-start `partition_point(|&t| t < min_y-pad-max_height)`: відкинутий top → ry+rh ≤ ry+max_height < min_y-pad → gapY>pad → dist>pad. partition_point вертає перший індекс з t≥X → off-by-one нема. ✓
- break `ry > max_y+pad` (строгий >): gapY=ry-max_y>pad → dist>pad; сорт зростанням → решта ще далі. ✓
- per-axis reject `rx>max_x+pad || rx+rw<min_x-pad || ry+rh<min_y-pad` (строгі): кожна = axis-gap>pad → Minkowski dist(bbox,rect)>pad; polyline⊆bbox → dist(poly,rect)≥dist(bbox,rect)>pad. Рівність gap==pad НЕ reject → перевіряється exact (безпечно). ✓

## ФАКТ — 3. B2 (ПІДТВЕРДЖЕНО)
- CardIndex::build РАЗ поза циклом (`:430-434`). ✓
- clear_of skip по `self.ids[i]` (id), не по індексу (`:303`). ✓
- id-колізія person+org (однаковий id): обидві картки порівнюються по id → обидві continue; тест `id_collision_both_skipped` + інтеграційний `person_wins_over_org_card_on_id_collision` зелені. ✓
- per-edge card-Vec (`obstacles_for_edge`) — ЛИШЕ в else (блок), lazy (`:474`). Чисте ребро → 0 алокацій. ✓

## ФАКТ — 4. B3 (ПІДТВЕРДЖЕНО) — detour_edge (`:344-409`) у diff поза змінами (context-рядки), lane-gen Y (lanes `:367-377`) та X (xlanes `:389-400`) — порядок/dedup/sort НЕ чіпані. ✓

## ФАКТ — 5. Межові (ПІДТВЕРДЖЕНО)
- max_height з `r.3` = obstacle_rect(c).height (figma-row expand). ✓
- NaN: build sort `partial_cmp().unwrap()` панікує на NaN — та сама експозиція, що в наявних lane-сортах (критик NB5); layout дає скінченні f32. Не нова діра. ✓
- Порожні points неможливі (route_ortho ≥2 точки); навіть якби — windows(2) порожнє → true, як наївний. ✓
- `card_index.as_ref().expect` — лише в `if avoid`, де index=Some; avoid гейтить ОБИДВА. Безпечно. ✓

## ФАКТ — 6. Зуби тестів (ПІДТВЕРДЖЕНО)
- Диференційний `card_index_matches_naive_*` (6 кейсів) + абсолютний `card_index_near_miss_is_detected_as_blocker`. 1px-регресія: rx+rw=47 < min_x-1=49 → хибний reject → index≠naive (диф. тест падає) ТА clear_of→true (абс. тест падає). Обидва ловлять. ✓
- Не «assert без фічі»: `far_clear`/`skip_from_id` пінять clear=true (always-false баг впав би), near_miss пінить false. Обидва напрями закриті. ✓
- Інтеграція split захищена наявними: byte_identical_when_no_card_blocks, detours_resolvable, leaves_unresolvable_remnant, foreign_frame_* , h6_golden, marker_equals_detector. Усі 25 зелені; clippy -D warnings exit 0.

## РІШЕННЯ — ВЕРДИКТ 🟢
B1/B2/B3 закриті кодом. Split доведено тотожним route_clear_of для кожного ребра (клін і блок). Нема блокерів. NB (не-блок): зовнішній `base` у блок-гілці рекомпутиться в detour_edge (дешевий route_ortho, не впливає на вихід).
