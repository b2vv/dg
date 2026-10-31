ДАЛІ: фаза 1 — тимчасовий Rust-probe на mock3; після чистого результату TDD-інтеграція.

## Перед кодом
ФАКТ: HEAD 72008be; незакомічений S1 у staff_layout.rs і наявний WASM збережені. Writer — поточна Codex-сесія. Головне джерело — `_design-bus-dg37.md`, прочитане повністю.
РІШЕННЯ: виконати явно задані дві фази без npm/git-mutations/TS-генерації. Шви тестів: route_scene (форма, перешкоди, fallback), compute_staff_geometry (serde-прапор, LOD, default/no-op). Це конкретизація швів із доручення власника. Додаткове інтерв’ю не потрібне: алгоритм і критерії задані.
ФАКТ: прямий пошук callers виявив route_via_astar та Rust-тести; EdgeSpec зараз не містить kind, route_scene не отримує Geom. Потрібне мінімальне Rust-протягування flag і admin eligibility. CRG не потрібен для цього обмеженого набору callers.
РІШЕННЯ: перевірити також rip-up: він зараз перероутовує всі ребра з перетинами, тому може зруйнувати вже чисту щодо перешкод шину. Detector не змінювати; вимірювати всі його показники.
РІШЕННЯ: READY для прототипу за наданим дизайн-критиком; незалежний післякодовий review не заявляється. Гейти — cargo test, cargo clippy --all-targets -- -D warnings, cargo fmt --check. Probe видалити. Очікування mock3: cross=6; turns<126, excess<18.

## Фаза 1 — ФАКТ: форма чиста, detector-регресія; STOP

`cargo test --manifest-path packages/core/Cargo.toml mock3_bus_prototype -- --nocapture`
(тимчасовий unit-probe у staff_routes.rs, згодом прибраний): перший запуск exit 0,
перевірки всіх 8 кандидатів проти карток/clearance/рамок пройшли. Повтор із явним
`assert_eq!(crossings, 6)` — **exit 101**, фактичне значення **8**. Сирі логи поточної
машини: `/tmp/dg37-bus-prototype.log`, `/tmp/dg37-bus-prototype-gate.log`.

ФАКТ: реальна `/tmp/ta0-mock3.json`, near, useAstar=true, treeBlockLayout=true,
HEAD 72008be + S1 відтворила baseline дослівно. Прототип замінив ЛИШЕ 8 готових
ceo-маршрутів на примусовий elbow_or_straight; решта маршрутів незмінна.
Це вимір прототипу, **не інтегрованої фази** з grid seed/occupancy/rip-up.

Усі 8 кандидатів: `[(4192,196),(4192,266),(child_x,266),(child_x,entry_y)]`.

| Дитина | child_x | entry_y |
|---|---:|---:|
| asst | 4438 | 280 |
| cfo | 1322 | 280 |
| cco | 3454 | 280 |
| cto | 5012 | 280 |
| da | 5778 | 316 |
| hrd | 6570 | 280 |
| lgl | 7390 | 280 |
| sch | 8046 | 316 |

ФАКТ: bus_y=266 > bottom=196; перевірено весь elbow (трунк, горизонталь, спуск):
polyline_hits_box_interior=false, seg_rect_distance>=8 для всіх foreign cards;
frame_intrusion_count=0 з реальним member_of (власна цільова рамка дозволена).

| Показник | Baseline із S1 | Прототип | Зміна |
|---|---:|---:|---:|
| cross | 6 | **8** | **+2, регресія** |
| over | 0 | 0 | 0 |
| card | 0 | 0 | 0 |
| near8 | 0 | 0 | 0 |
| dept | 0 | 0 | 0 |
| turns | 126 | 108 | −18 |
| excess | 18 | 10 | −8 |
| marked | 0 | 0 | 0 |
| edges | 50 | 50 | 0 |

ФАКТ: baseline-пари cross: cfo→ah × ceo→{hrd,lgl,sch} і cto→bi × ceo→{hrd,lgl,sch}.
Додалися **cfo→ah × ceo→da** та **cto→ib × ceo→sch**.

Причина підтверджена координатами: старий ceo→da обходив X=5586 на Y=318
через `(5533,266)→(5533,318)→(5592,318)→(5592,266)`; старий ceo→sch обходив
X=7882 через `(7829,266)→(7829,318)→(7888,318)→(7888,266)`.
Вертикаль cto→ib — `(7882,243)→(7882,280)`. Пряма горизонталь шини @266 її ріже.
Отже твердження дизайну, що ці бампи — лише зайвий обхід власних карток,
**неповне**: на готовій сцені вони також уникають інших ліній.

## Фаза 2 — РІШЕННЯ: не починати

Власник прямо наказав зупинитися, якщо прототип не чистий, і вважає зростання cross
регресією. Тому інтеграцію/прапор не додано; RED→GREEN фази 2 **НЕ ВИКОНАНО**.
Не можна підтвердити cross=6 після випрямлення. Водночас цей post-process probe
не доводить, що інтеграція з повторним A* інших ребер неможлива: це окрема неперевірена
гіпотеза, яку не видаємо за результат. route_stats не змінювався.

## Що зроблено / перевірено / неочікуване / обмеження / рішення / наступний крок

- Зроблено: прототип на реальному mock3, точна форма 8 ліній, повний detector та локалізація +2 cross.
- Перевірено: clearance і рамки для кандидатів; detector baseline і кандидатів одним наявним кодом.
- Неочікуване: cross 6→8 замість очікуваних 6→6; turns справді впали.
- Обмеження: flag/default/LOD/fallback/determinism інтегрованої фази ще не перевірені; незалежний review не виконаний.
- Рішення: STOP після фази 1; тимчасовий probe прибрано; production повернутий до вхідних байтів.
- Далі: уточнити дизайн щодо двох додаткових перетинів і дозволеного повторного маршруту інших менеджерів перед інтеграцією.
- Post-deploy: не застосовується — нічого не деплоїлось; TS/WASM не змінювалися.

## Фінальна перевірка після прибирання probe

ФАКТ: усі команди нижче виконані на HEAD 72008be + вхідний S1, без інтеграції BUS:
- `cargo test --manifest-path packages/core/Cargo.toml` — exit 0, 197 passed; `/tmp/dg37-bus-cargo-test.log`.
- `cargo clippy --manifest-path packages/core/Cargo.toml --all-targets -- -D warnings` — exit 0; `/tmp/dg37-bus-clippy.log`.
- `cargo fmt --manifest-path packages/core/Cargo.toml --check` — exit 0.
- `git diff --exit-code -- packages/core/src/staff_routes.rs packages/core/src/staff_router.rs packages/core/src/types.rs` — exit 0: probe прибрано, змін маршрутизатора/типів немає.

ФАКТ: гейти підтверджують збережений вхідний код, **не** реалізацію MANAGER-BUS.
Змінений цією роботою лише цей звіт. Наявні S1/WASM та інші untracked-звіти залишені.
Checkpoint поточної сесії: `18a856431798344fd121a55c16440bb9-1-4bca0e3a940b`, status OK, exit 0.

ДАЛІ: власнику повернуто STOP фази 1: cross=8 замість 6; перед фазою 2 потрібне уточнення дизайну.
