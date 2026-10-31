ДАЛІ: дискримінаційний тест → RED → мінімальне attachment-top вирівнювання → GREEN → mock3 probe → Rust-гейти → прибрати probe.

ФАКТ: HEAD 72008be; початкові зміни — лише вісім сторонніх untracked звітів, збережу їх. Прочитано обидва критичні джерела, стандарти й брифінг. S1 обмежено Rust layout; route_stats, роутер, TS/WASM-збірка, npm, git commit/push/worktree поза scope.
РІШЕННЯ: малий слайс за явним дорученням власника та діагнозом `_critic-order-dg37.md`. Шов — compute_staff_geometry: nodes + department_frames. Тестуємо однаковий вхідний Y, незмінність без dept-сиблінгів, нащадків нижче, детермінізм, нестандартний padding і малий gap. Додаткове перепланування N/A: продуктових розвилок тут немає. Пряме читання pack_tree_block → compute_staff_geometry → department_frames_from_nodes достатнє для локального impact; граф не оновлювався.
ФАКТ: pack_tree_block задає однаковий child_top усім sibling-блокам; department_frames_from_nodes віднімає content_padding. Для передачі справжнього padding потрібне поле внутрішнього Geom. Рекурсивне розміщення має врахувати зсув до обходу дітей; групувати треба за ID керівника, не лише однаковим X.
РІШЕННЯ: виміряти production diagnostics на /tmp/ta0-mock3.json до і після; тимчасовий example видалити. Критерій: 36→0 px; cross≤6; повні метрики та всі три cargo-гейти записати тут.

ФАКТ — RED: `cargo test --manifest-path packages/core/Cargo.toml singleton_attachment_aligns -- --nocapture`, exit 101. Новий тест упав на `asst.y=340`, `frame.y=304` (різниця 36); production ще незмінений. Тест охоплює padding 36/12, gap 120/8, нащадка, детермінізм та no-dept-only контроль.
ФАКТ — baseline probe: `cargo run --offline --manifest-path packages/core/Cargo.toml --example s1_probe`, exit 0. Production diagnostics: cross=6 over=0 card=0 near8=0 dept=0 turns=120 excess=16 marked=0 edges=50. Кінець ceo→asst Y=316, ceo→cfo Y=280.
РІШЕННЯ: lift=content_padding тільки для singleton із dept-сиблінгом того самого manager ID. Застосувати lift до рекурсії; при gap<padding збільшити child_top до безпечного рівня, щоб singleton не перекривав батька. Роутер і detector незмінені.

ФАКТ — GREEN: той самий `cargo test --manifest-path packages/core/Cargo.toml singleton_attachment_aligns -- --nocapture`, exit 0, 1 passed. Production зміни лише у staff_layout.rs: передача padding у Geom, вибір відповідних singleton-блоків, вирівнювання перед рекурсією.

ФАКТ — підсумковий звіт, 1. Зроблено: S1 вирівнює верх no-dept singleton із верхом рамки dept-сиблінга за спільним ID керівника. Нащадки розкладаються від нового Y; no-dept-only дерево зберігає gap. Ітерації HashSet не визначають порядок — множина використовується лише для contains; порядок блоків не змінено.

ФАКТ — 2. Перевірені сценарії: новий тест через compute_staff_geometry, padding=36/12, gap=120/8; рівність attachment Y; parent-before-child без перекриття; звичайний gap до дитини singleton; повторюваність координат; відсутність зсуву без dept-сиблінга. Повний `cargo test` — 197 passed, 0 failed, doc-tests 0; `cargo clippy --all-targets -- -D warnings` — exit 0; `cargo fmt --check` — exit 0. Команди виконано для packages/core. `git diff --check` — exit 0. RED до production-зміни підтверджує дискримінаційність тесту, не compilation failure.

ФАКТ — 3. Вимір mock3: однаковий /tmp/ta0-mock3.json, near, use_astar=true, tree_block_layout=true, dept_grouping=true. Метрики з повного production detector у diagnostics, без копії алгоритму або правок route_stats. Обидва прогони exit 0, 50 ребер, marked=0.

| Метрика | До (підтверджений baseline) | Після | Δ |
|---|---:|---:|---:|
| ceo→asst, кінцевий Y | 316 | 280 | −36 |
| ceo→cfo/cco/cto/hrd/lgl, кінцевий Y | 280 | 280 | 0 |
| Просідання asst відносно dept-heads, px | 36 | 0 | −36 |
| cross | 6 | 6 | 0 |
| over | 0 | 0 | 0 |
| card | 0 | 0 | 0 |
| near8 | 0 | 0 | 0 |
| dept | 0 | 0 | 0 |
| turns | 120 | 126 | +6 |
| excess | 16 | 18 | +2 |

ФАКТ — 4. Неочікуване / обмеження: cross не зріс, усі геометричні порушення лишилися нульовими; turns та excess зросли через реакцію незміненого роутера на нову геометрію. Не заявляю загального поліпшення routing cost. da/sch лишили кінцевий Y=316; це не no-dept singleton asst. При gap<padding захист піднімає спільний child_top до padding над низом батька, після чого singleton отримує lift; це свідоме запобігання перекриттю. Окремого незалежного рев'ю та mutation-runner не запускалося.

ФАКТ — 5. Артефакти: постійний diff — packages/core/src/staff_layout.rs (код + регресійний тест), цей append-only журнал. Тимчасовий packages/core/examples/s1_probe.rs видалено після виміру. Початкові вісім сторонніх untracked звітів не змінено.

ФАКТ — 6. Стан: S1 реалізовано, RED→GREEN і три Rust-гейти підтверджено. Комітів, пушу, worktree, npm та зміни route_stats немає.

ФАКТ — Post-deploy: N/A — деплой і WASM-збірка не виконувались за scope. Видимий ефект доведено кінцевими точками маршрутів у Rust-виході mock3; браузерний рендер не перевірявся.

ДАЛІ: передати власнику S1 із явним застереженням turns +6 / excess +2; cross=6 незмінний.
