# R6-4a незалежне ревʼю (Dg23)

Модель: claude-opus-4-8

ДАЛІ: прочитати git diff зрізу R6-4a; перевірити контракт (marked адитивне), рефактор staff_geom/staff_clearance (поведінкова ідентичність), around-lane (obstacles_for_edge, detour, паритет), §12-маркер by construction, per-part A, тести-дискримінатори, детермінізм/clippy, вплив на R6-4b..R6-7.

## ФАКТИ (перевірено проти коду)

- Контракт: types.rs:549-555 `marked: Option<bool>` + serde(default, skip_serializing_if None) + ts(optional) — патерн ІДЕНТИЧНИЙ сусіднім optional-полям (types.rs:18-19). rust-types.ts:58-64 `marked?: boolean`. Адитивне.
- Усі конструктори StaffEdgeRoute мають marked (staff_routes.rs:300 прод; staff_clearance.rs:84 тест). RouteInputs: усі 6 конструкторів мають department_frames.
- Прод-каллера RouteInputs/staff_routes поза модулем НЕМА (lib.rs:30 лише реекспорт) → додавання поля нічого не ламає на межі WASM; frames ще не підключені до реальних даних (staged).
- SDK TS має ВЛАСНИЙ інтерфейс StaffEdgeRoute (staffEdgeGeometry.ts:259, via/points) — окремий від генерованого rust-types. Жоден споживач не читає генерований marked → optional безпечний, typecheck не ламається.
- Рефактор: segment/polyline interior-hit, INTERIOR_EPS, FrameRect/DeptPart/key, frame_intrusion_count перенесено ВЕРБАТИМ у staff_geom (Pt=StaffRoutePoint, staff_geom.rs:13). clearance тепер імпортує. foreign_frame_intrusions = sum(frame_intrusion_count по ребрах) — АЛГЕБРАЇЧНО тотожне старому вкладеному циклу (count += 1 per (ребро,чужа-рамка)). ✓
- PIN-1: marker = frame_intrusion_count(фінальні points)>0 (staff_routes.rs:272-279) — те саме джерело, що детектор. ОДНЕ поле, не паралельний список. ✓
- PIN-2: no_frames_means_no_marker_and_parity — points_eq з R6-3b, marked None. ✓
- PIN-3: member_of (staff_routes.rs:113-118) = (department_id, part_index) з persons; None коли dept None або org-кінець. ✓
- PIN-4: lanes генеруються з УСІХ obstacles (картки+рамки) → around-frame = реюз corridorY-lane (staff_routes.rs:205-210). debug_assert card_pad>=MIN_CARD_PAD інваріант. Бічного обходу нема (→ R6-4b). ✓
- Детур (seg_rect_distance<pad) vs маркер (interior-hit): різні виміри СВІДОМО. Коли детур чистий (≥pad від рамки) → interior-hit неможливий → marked None. Коли залишок → marked можливий. Узгоджено. ✓
- per-part A: own_frame self-exempt у obstacles_for_edge (ключ==src/dst) І у frame_intrusion_count → не перешкода й не маркер (тест own_frame_is_neither_obstacle_nor_marked). ✓
- Тести-дискримінатори реальні: resolvable→огинається+маршрут змінено, unresolvable→marked, own→None+незмінно, marker==detector by construction. Паритет no_frames реальний. ✓
- Детермінізм: lanes sort/dedup/sort детерміновані; member_of=find (перший); frames у вхідному порядку. clippy -D warnings зелений; мертвого коду нема (усі pub-символи вжиті).

## ЗНАХІДКИ
- [INFO] staff_routes.rs: видалено інтеграційний oracle-тест `oracle_asserts_clean_fixture_has_no_clearance_violations` (був R6-3a). Його паритет-покриття здебільшого перекрите avoidance-тестами (violations 0/>0 на реальних боксах) і marker_equals_detector. Не блокує.
- [INFO] Немає frame-specific тесту детермінізму для кількох рамок (scope R6-5/H6). Не блокує.
- [INFO] RouteInputs.department_frames ще не підключений до реальних даних на межі WASM — R6-4b/пізніша інтеграція мусить передати справжні рамки. Не блокує 4a.

## РІШЕННЯ: GREEN. R6-4a можна комітити. Блокерів нема.
