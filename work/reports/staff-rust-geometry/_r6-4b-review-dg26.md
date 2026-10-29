claude-opus-4-8

ДАЛІ: незалежне ревʼю R6-4b side-detour. Прочитав git diff + критик-файл + staff_routes.rs + staff_geom.rs. Верифікую геометрію пасток, прогнав гейти.

## Гейти (прогнав сам)
- `cargo test staff_routes` → 23 passed, 0 failed (включно з 2 новими + 2 перероблені + h6 golden + card-remnant).
- `cargo fmt --check` → чисто.
- `cargo clippy --all-targets -D warnings` → чисто.

## P1/P2 frames-only — ПІДТВЕРДЖЕНО
detour_edge отримує `frames = &obs[frames_at..]` (staff_routes.rs:350). frames_at = obs.len() ПІСЛЯ карток, ПЕРЕД рамками (obstacles_for_edge:205). X-цикл (:276) ітерує ЛИШЕ `frames`. Картки X-обходу не отримують.
- card-remnant тест `avoidance_leaves_unresolvable_block_as_remnant` (:681): node_wh("X") йде в cards, department_frames порожні → frames=[], xlanes порожні → X-цикл no-op → лишок. Тест НЕ в дифі (байт-ідентичний), зелений. Критикова пастка P2 (картка отримала б X якби lanes з усіх obs) закрита дизайном.

## P3 паритет — ПІДТВЕРДЖЕНО
Aligned early-return `(ax-bx).abs()<STRAIGHT_EPS → return base` (:244) стоїть ПЕРЕД Y- і X-циклами. Y-цикл (:265-270) повний, return на першій чистій. X-цикл (:287-292) тільки після вичерпання Y. Y-резолвні/clean/no-frames/own-frame тести не в дифі, зелені. h6 golden зелений (X не тригериться на сценах де Y резолвить або aligned).

## P4 детермінізм — ПІДТВЕРДЖЕНО НЕ-ВАКУУМНИМ
Тест `side_detour_is_deterministic_across_frame_reorder`: f_ab=[dF(55..145), dG(300..340)], f_ba реверс. ax=150,bx=50.
- З sort (:280-286): xlanes {39,161,284,356}, метрика |lane-ax|.min|lane-bx| → 39:11, 161:11, 284:134, 356:206; .then(value) → 39 перший за будь-якого порядку входу → однаковий маршрут. ✓
- БЕЗ sort (перевірив вручну): f_ab перша спроба 39 (clear, gap 55-39=16) → x=39; f_ba перша спроба 284 (clear, gap 300-284=16) → x=284. РІЗНІ маршрути. Отже sort load-bearing, тест ловить реальний недетермінізм. НЕ вакуумний.

## Перероблені тести — НЕ вакуумні, нерозвʼязні за дизайном
- `foreign_frame_unresolvable_is_marked` (:772): P/c1 aligned (ax=bx=150), dF(120..180) на вертикалі x=150. route_clear_of(base)=false (лінія перетинає рамку) → :244 aligned → return base (X НЕ пробується) → marked Some(true). Нерозвʼязність щира: X свідомо не огинає aligned-рамку (рання віддача). ✓
- `marker_equals_detector_by_construction` (:860): та сама aligned-фікстура; `assert!(detector>0)` доданий → не вакуумний; marked==(detector>0) тримається.

## Новий резолв-тест — ПІДТВЕРДЖЕНО
`foreign_frame_resolvable_via_side_detour`: P(ax=150)/c1(bx=50), dF(55..145,110..140). Y-lanes 94/156 обидві валяться (вертикаль x=150 за 5px від правого краю рамки 145 < pad16). X: xlanes {39,161}, метрика tie 11/11 → 39 перший. side_detour=[(150,50),(39,50),(39,200),(50,200)]: вертикаль x=39, gap до лівого краю 55 = 16 ≥ pad → clear. marked None, точка x=39<49. Це саме кейс §12-залишку R6-4a, тепер резолвиться. ✓

## Інваріанти — ПІДТВЕРДЖЕНО
- marked==detector BY CONSTRUCTION: marked (:356-363) рахується frame_intrusion_count на ФІНАЛЬНИХ points — той самий оракул. route_clear_of (pad=16) ≫ interior eps=0.75 (staff_geom:120): seg_rect_distance≥16 від повного rect ⟹ не пенетрує eps-звужений інтерʼєр. Хибного «clear» що пенетрує — немає.
- Ортогональність: side_detour H-V-H по осях; нуль-сегменти згорнуто (:119-126, STRAIGHT_EPS). Монотонний, без самоперетину.
- Self-exempt рідної рамки: obstacles_for_edge:206-212 виключає рідну ДО detour; frames=obs[frames_at..] теж без рідної. X ніколи не огинає власну.
- route_clear_of валідує X-кандидата проти ВСІХ obstacles (картки+рамки) — строгіше, ніж detector (лише чужі рамки). Може лише ВІДКИНУТИ X, не дати хибний clear. Інваріант marked цілий.

## Non-blocking (не блокери)
- `partial_cmp().unwrap()` у sort (:280,:282,:258) панікне на NaN — але координати скінченні f32 з геометрії вузлів; патерн ідентичний наявному Y-коду. Прийнятно.
- Дизайн-рішення: aligned-колонні рамки свідомо не огинаються (рання віддача). Задокументовано в коментарі тесту (:772) й коментарі :245. Рішення власника (scope frames-only, не aligned).

## ВЕРДИКТ: 🟢 GREEN — 0 BLOCKING
Усі 7 пасток критика перевірені геометрично й тримаються. Гейти зелені. Scope (frames-only, локально пер-ребро, не grid-A*, X після Y і після aligned-return) дотримано. Готово до коміту.
