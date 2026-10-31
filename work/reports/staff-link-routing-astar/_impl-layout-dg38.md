ДАЛІ: RED на одиниці group_staff_by_department, мінімальний production-фікс, integration та всі Rust-гейти.

## Перед кодом — READY

Власник scope: користувач/координатор; виконавець: поточна Codex-сесія, один writer. Small bugfix за явним контрактом запиту; додаткових продуктових питань немає. HEAD фактично `7b60154`, core ідентичний `c7aed85` (звірено попереднім probe; додатково перевіряється diff). Сторонні зміни: `packages/demo/src/app/tabConfigs.ts`, `_critic-before-layout-dg38.md`, `_probe-layout-headrule-dg38.md`; їх не змінюємо. Briefing прочитаний; актуальні деталі T128 звірені з production-кодом і наданими critique/probe. Рішення користувача про існуючий last-wins admin_parent_map переважає стару пропозицію критика змінити parent.

Seams уже погоджені запитом: unit root-вибору через group_staff_by_department (head спостерігається як верхній вузол локального дерева), integration compute_staff_geometry на mock3 fixture. Публічної head-діагностики не додаємо. Перевірка failure/boundary: ранній член із внутрішнім parent не є кандидатом; чинні cycle/singleton тести лишаються. Детермінізм: повтор повного результату. План: declaration-index до comparePositions, передати в pack_tree_block, filter+min(index,id) перед незмінним override, зберегти fallback за відсутності кандидатів. Новий прапор, WASM/TS, router, parent-map, attach_x і cycle-guard поза scope. R6 review-after та commit належать координатору.

Impact: прямий пошук pack_tree_block у packages/core — один caller, group_staff_by_department; flat path окремий. Пряме читання достатнє для цього локального diff, граф не потрібен. Гейти: cargo test, cargo clippy --all-targets -- -D warnings, cargo fmt --check.

## RED підтверджено

`cargo test --manifest-path packages/core/Cargo.toml tree_block_head_uses_declaration_order_not_parent_id`: 0 passed, 1 failed, 197 filtered; cargo повідомив failure на assert `z-head.y < a-head.y` (src/staff_layout.rs:2301 до фіксу). Компіляція успішна; це поведінковий RED, не build error. Сирий локальний лог: `/tmp/dg38-red.log`. Shell з tail повернув 0, але cargo-тест упав (явне FAILED). Зміна порядку декларацій та ранній non-root включені в цей unit seam.

## Production-зміна

Зібрано `HashMap<&str, usize>` із positions.enumerate() до comparePositions; передано єдиному caller pack_tree_block. `.find()` замінено на `.filter().min_by_key((declaration index, id))`. Fallback без кандидатів, override і flat path збережені. Восьмий аргумент — локальний allow too_many_arguments, за наявним стилем файлу; додатковий context-тип для одного map не вводився.

## Нові тести і перевірені сценарії

- `packages/core/src/staff_layout.rs:2301`, `tree_block_head_uses_declaration_order_not_parent_id`: z-head оголошено перед a-head, але parent-id порядок протилежний; head спостерігається через Y. Раніше оголошений child із внутрішнім parent відсіюється. Повтор стабільний; перестановка двох декларацій змінює head. Після фіксу 1 passed.
- `packages/core/tests/multi_source_parent.rs:50`, `tree_block_default_mock3_head_is_ah_under_fin_deterministically`: fixture без parent-eval/override; ah вище da/bi (геометричний доказ head), ana нижче низу fin, production route_stats.crossings=1, asst center-X=4438/Y=280. Повтор дає ідентичний повний серіалізований результат.

## Оновлені тести — кожен baseline явно

Єдиний змінений старий тест: `multi_source_parent_chooses_clean_attachment_deterministically`, `packages/core/tests/multi_source_parent.rs:23`: baseline 6 → 1 із коментарем dg38 — declaration-earliest ah переносить ana під fin. Parent-eval enabled усе ще дає 0, тому тест зберігає сенс і всі решта його асертів незмінні. Решта 6 старих parent-eval тестів пройшли без правок.

П'ять початкових unit-сценаріїв tree-block (child-dept, stamps, no-dept singleton, cycle, attachment-X siblings) пройшли без зміни baseline; новіші singleton/S1/balance теж зелені. Жодного тесту не видалено, не skip/ignore, не послаблено заради проходження.

## Гейти та додатковий дискримінаційний доказ

- `cargo test --manifest-path packages/core/Cargo.toml` (еквівалент cargo test з core): exit 0, **198 unit + 8 integration = 206 passed**, 0 failed, 0 ignored; 0 doctests. Integration 63.74 s, unit 0.07 s. Локальний сирий лог `/tmp/dg38-all-tests.log`.
- З `packages/core`: `cargo clippy --all-targets -- -D warnings`: exit 0, 0 warnings/errors; `/tmp/dg38-clippy.log`.
- З `packages/core`: `cargo fmt --check`: exit 0. `git diff --check`: exit 0.
- У disposable `/tmp/dg38-mutation` (копія фінальних source/tests, окремий target) повернуто тільки старий `.find()` замість filter+min. Unit: cargo exit **101**, assert `z-head.y < a-head.y` упав. Integration `multi_source_parent_chooses_clean_attachment_deterministically`: cargo exit **101**, фактичний left **6**, очікуваний right **1**. Логи `/tmp/dg38-mutation-unit.log`, `/tmp/dg38-mutation-cross.log`. Отже 6→1 виміряно на одному fixture, не лише запозичено з probe. У production-дереві мутацій не було. Авторська inverse-mutation перевірка не є незалежним R6 review чи повною mutation-матрицею.

## Diff-місця і межі

`packages/core/src/staff_layout.rs:597` — capture decl_index до сортування; `:660` — проброс; `:753` — новий параметр; `:799` — root-вибір: перший у comparePositions → мінімальний (decl_index,id) серед тих самих кандидатів. `:809` — override збережений. Док-коментар DeptTreeBlock виправлено: правило більше не тотожне flat path. Публічних типів/прапорів немає.

Flat layout-код та golden-файли байт-незмінні в diff. Повний detour-golden harness окремо НЕ запускався (WASM/TS/npm виключені дорученням); не видаємо незмінність виходу всіх golden за виміряний результат. Існуючий Rust flat-path контроль пройшов. Stamp, admin_parent_map, cycle-guard, attach_x, singleton, router-membership не редагувалися.

## Сюрпризи, залишки та передача

Фактичний HEAD `7b60154` замість вказаного `c7aed85`; `git diff c7aed85 HEAD -- packages/core` порожній. Public department frame не експортує layout head, тому integration доводить head геометрією, без додавання test-only API. Єдиний додатковий clippy allow локальний і лише для восьми аргументів pack_tree_block. LOD integration тривав понад 60 секунд, але завершився успішно.

R6 review-after та commit — координатор; коміту не зроблено. Зміни обмежені двома Rust-файлами та цим звітом; сторонній demo diff і critique/probe не редагувалися. Текст/код написані самостійно, сторонній код не копіювався.

## Post-deploy

NOT_RUN: build:wasm, npm/TS, браузер і deploy не входять у цей layout-слайс. Поточний результат — перевірена Rust-імплементація, готова до незалежного R6, не заява про production-deploy.

Службовий checkpoint: спершу sandbox заборонив mktemp у receipts; escalation дозволено, checkpoint завершився exit 0 / OK, ID `627df8ac5b27a94dcc1f4b2320b65226-1-e011fbf7415d`. Запитів додаткового продуктового рішення немає.

ДАЛІ: передати два Rust-diff та цей звіт координатору на R6 review-after; build:wasm і коміт виконує координатор.
