claude-opus-4-8

ДАЛІ: читаю staff_routes.rs (переписаний), lib.rs:29 (експорт RouteInputs), staff_edge_box.rs, types.rs, попередній критик _r6-3a-part2-critic-dg23.md. Потім перевіряю P1-P4, тести, виродженості, ризики R6-3b/R6-7.

## ФАКТИ (звірено з кодом)

- Сигнатура: `staff_routes(input: &RouteInputs)` staff_routes.rs:100; `RouteInputs<'a>` :38-44
  (persons/org_cards/edges/lod/person_hints — плейн-пари). БЕЗ derive(TS) (derive на :27 — для `Side`),
  містить &-референси → ts-rs фізично не може експортувати. У types.rs export-тесті (types.rs:589+)
  RouteInputs відсутній ⇒ **regen не тригериться (ПІДТВЕРДЖЕНО)**.
- Викликачі: лише lib.rs:11 (mod) + lib.rs:29 (re-export). Жодного прод-WASM-entrypoint чи TS-обгортки
  (grep staffRoutes у sdk/src — порожньо). Зміна сигнатури ламає **тільки in-file R6-1 тести** — усі
  адаптовані. Безпечно.
- P1 precedence person→org: resolve_box :83-94 — два РОЗДІЛЬНІ лінійні find, person-first `return`,
  потім org_cards. Hints лише до персон (:84). Інваріант диз'юнктності задокументовано :12-13 і :74-75.
  Детермінізм: лінійний find (first match) + порядок виходу = ітерація edges (:102), без HashMap. ✔
- P2 kind вербатим :126 `edge.kind.clone()`; route_ortho (:58-72) — суцільний ortho (2- або 4-точковий),
  port() лише Top/Bottom (:47-54), жодного plink/label/frame-порту не запечено. ✔ R6-7 не блокується.
- P3 паритет: near+None person-бокс = повний (x,y,w,h) (staff_edge_box :106-144 → person_visual_world_rect
  near :75 = (0,0,w,h)); corridorY=(from.y+from.h+to.y)/2 (:61). Тест near_no_hints... (:269-279) пінить
  УСІ 4 точки: (50,50)(50,85)(250,85)(250,120), 85=(0+50+120)/2 — числовий паритет R6-1. figma-hint:
  tile(12,16,40)@node(0,0) → бокс (12,16,40,40) → bottom-порт (32,56); тест :326-349 пінить (32,56). ✔
- P4 детектор: staff_clearance під `#[cfg(test)]` (lib.rs:6-7) — у прод-WASM не входить. Тест
  oracle_asserts... (:353-386) бере РЕАЛЬНИЙ `set` з staff_routes і асертить card_clearance(set.segments)==0.
  Глобальне «0» НЕ заявляється (staff_clearance.rs:5 прямо каже). ✔
- Виродженості: self-loop skip :103-105 (ПЕРЕД резолвом), dangling skip :120-122. Тест
  skips_self_loop_and_dangling_and_stamps_lod :258-265. ✔
- Контракт StaffRouteSet/StaffEdgeRoute/StaffRoutePoint/StaffEdge (types.rs :511-564) незмінний. ✔

## РІШЕННЯ / ЗНАХІДКИ

1. [NB, non-blocking] P4-тест, рядок staff_routes.rs:385 — `foreign_frame_intrusions(&set.segments, &[], &no_member)`
   з ПОРОЖНІМ слайсом рамок повертає 0 ЗА ПОБУДОВОЮ (тіло циклу не виконується), незалежно від маршрутів.
   Тобто «frame-половина» P4-асерту реально нічого не дискримінує — справжнім виходом роутера живиться лише
   card_clearance-половина (:380-381). Для P4 («детектор підключений до реального виходу, без global-0») цього
   достатньо, але рядок :385 — псевдо-асерт. Рекомендація (не блокер): або додати в фікстуру 1 реальну чужу
   рамку (щоб перевірити 0 проти непорожнього набору), або прибрати видимість перевірки. Справжній
   frame-дискримінатор уже є в staff_clearance.rs:391-448.

2. [OBS] Фікстура P4 чиста нетривіально: 4 ребра × по 4 чужі боксі, зазори реальні (70-150px). Маржі
   комфортні (не близько до 8px-порога), тож тест ловить грубо-зламаний роутер, але не межу 8px. Прийнятно —
   межу 8px стереже card_clearance.rs:292 (seg_rect_distance на 50px).

3. [OBS→R6-3b/R6-7] route_ortho ігнорує `obstacle` EdgeRect (лише x/y/w/h) — коректно для R6-3a (без обходу);
   obstacle переноситься для R6-3b. port() має лише Top/Bottom — для R6-3b-обходу, можливо, знадобляться
   бічні порти, але це майбутній scope, не дефект зараз. kind вербатим лишає R6-7 вільно рестайлити.

ВЕРДИКТ: GREEN. Частину-2 можна комітити. 4 піни критика (P1-P4) реально виконані в коді й тестах;
єдина знахідка — non-blocking NB про псевдо-асерт на порожніх рамках (staff_routes.rs:385).
