ДАЛІ: RED → реалізація оцінки комбінацій → GREEN → вимір → Rust-гейти.

## Початок / pre-code
ФАКТ: HEAD 72008be + незакомічений S1 у staff_layout.rs; початкову копію збережено в /tmp/dg37-parent-s1.rs. WASM та інші незакомічені файли поза scope. Дизайн і probe прочитано. Поточні первинні джерела: compute_staff_geometry → layout_staff_org_block → group_staff_by_department → pack_tree_block; route_stats та true_turns. Граф для цього локального ланцюга не потрібний. Брифінг CTO прочитано, для цієї задачі актуальний контракт задають надані дизайн і прямий код.
РІШЕННЯ: READY, виконавець Codex; конкретний алгоритм і seam compute_staff_geometry вже погоджені прямим дорученням користувача. Окрема планувальна сесія N/A: реалізуємо наданий дизайн. Прапор, повний добуток ≤12, score (cross, turns, лекс-комбо), оцінка near; fallback без прапора/мульті/при перевищенні cap. Тести: дискримінаційний mock3, повторюваність, no-op, LOD, cap і однакові parent-блоки. Коміт/push/worktree/npm/TS/build:wasm заборонені. Незалежне рев'ю не заявляється.
ФАКТ: probe міняв лише parent_of; справжній override голови змінює також layout_connected_tree. Точні метрики треба виміряти заново.

## RED
ФАКТ: `cargo test --manifest-path packages/core/Cargo.toml --test multi_source_parent -- --nocapture` — exit 101, 1 поведінкове падіння: очікування cross=0, отримано cross=6. Тест компілюється, camelCase-прапор передано JSON; стара реалізація його ігнорує. Baseline cross=6 та рівність absent/false пройшли до дискримінаційного assert.
РІШЕННЯ: override передається через Geom, без зміни сигнатури публічного layout_staff_org_block. true_turns переюзується з crate-видимістю; route_stats не змінюється. Кандидати визначаються за фактично розкладеними блоками baseline, тож no-multi виконує рівно один compute_once.

## GREEN і вимір
ФАКТ: основний дискримінаційний тест — PASS (exit 0): cross=0, sec під dev, diagnostic `sec=ib`, два повні результати ідентичні. Початковий повний cargo test — 197 unit + 4 integration, усі PASS; потім додано ще три малі перевірки guard/tie-break, фінальний прогін нижче.
ФАКТ: тимчасовий `parent_rule_probe` викликав незмінений штатний pipeline і прочитав його повний A* diagnostic (усі 50 ребер, усі перешкоди):

| Режим | cross | over | card | near8 | dept | turns | excess | marked | edges |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| HEAD + S1, прапор false | 6 | 0 | 0 | 0 | 0 | 126 | 18 | 0 | 50 |
| multiSourceParentEval=true | 0 | 0 | 0 | 0 | 0 | 140 | 34 | 0 | 50 |

ФАКТ: комбінація `ana=da, sec=ib`: ana → CEO, sec → dev через cto. Excess **34**, не 32 з parent_of-probe: це справжній override голови з повторним layout_connected_tree. Результат не підганявся.
ФАКТ: для симетрично намальованої малої сцени A* насправді має різні turns: h00=(cross 0, turns 8), h01=(0,6). Початкове припущення про рівність score було хибним; тест виправлено на перевірку пріоритету turns перед лекс-порядком. Для detour тієї ж сцени обидва score=(0,6), вибір h00 перевіряє лекс-tie-break. Тимчасове логування score видалено.

## Паритет і збереження
ФАКТ: окрема тимчасова копія Rust-пакета з початковим staff_layout.rs (S1) і HEAD types.rs виконала compute_staff_geometry на mock3 без прапора. Серіалізований результат до/після ідентичний **байт-у-байт**, 18740 байтів, SHA256 `135c4fc99dfd139ce4cadb4153bfa317aa55e3f91fee1d30334c0e0bebcac2f4`. Обидва cargo run — exit 0. Це прямий паритет цієї фікстури, не заява про запуск TS golden-suite.
ФАКТ: усі 10 доданих/замінених блоків початкового S1 присутні без зміни байтів у фінальному staff_layout.rs. Повний файл закономірно змінився через нове правило. WASM SHA256 незмінний: `1476c6f1d414dfa4a919df9681af7402043d483f3e5722d1127aa19f2450bcdb`.
ФАКТ: тимчасові examples parent_rule_probe.rs / parent_rule_parity.rs та копію /tmp/dg37-parent-baseline-check прибрано. Постійна фікстура tests/fixtures/multi-source-parent.json походить із наданого /tmp/ta0-mock3.json (SHA256 `a433fc142a9a5db9c269197b37f53227038e1074aaebdf014c35b8a5e6ce023d`); тест більше не залежить від /tmp.
РІШЕННЯ: вартість обмежена 12 оцінками комбінацій плюс один baseline для виявлення реально розкладених блоків; non-near додатково маршрутизує переможця на запитаному LOD. Без прапора, без мульті або понад cap — рівно один compute_once. Production route_stats незмінний; true_turns лише отримав pub(crate) для переюзу.

## Підсумковий звіт

### 1. Зроблено
РІШЕННЯ: додано multi_source_parent_eval / multiSourceParentEval, Option<bool> із serde rename/default і ts(optional). Повне тіло оркестратора винесено у compute_once; override потрапляє до pack_tree_block через Geom. Детермінований декартів добуток кандидатів, максимум 12; критерій cross → turns → лекс-комбінація. Переможець обчислюється на near і застосовується для mid/far. Діагностика називає обрані голови.

### 2. Протестовані сценарії
ФАКТ: тестова межа — публічний compute_staff_geometry. Сім integration-тестів охоплюють: mock3 cross 6→0 і повторюваність; absent=false; sec під dev; cap 16→fallback і 12→оцінка; різні посади в одному parent-блоці не мульті; single-source no-op; tree/grouping guards; пріоритет turns; лекс-tie; near/mid/far з однаковими вузлами й вибором.

### 3. Неочікуване
ФАКТ: реальний excess=34; попередній probe мав 32, оскільки не міняв голову внутрішнього дерева. Симетрична мала сцена під A* не має рівного score, тому окремо перевірені turns-пріоритет і рівний detour-score.

### 4. Відхилення й обмеження перевірки
ФАКТ: TS golden-suite, npm, build:wasm, UI/deploy не запускалися за дорученням. Прямий byte-паритет перевірений на mock3. Незалежне рев'ю та mutation-review не виконувалися, PASS для них не заявляється. Жодних комітів, push, worktree або регенерації rust-types.ts.

### 5. Ризики
ФАКТ: мінімізація cross може збільшити turns/excess, як у mock3; over/card/near/dept не входять у score, але на цій фікстурі залишилися 0. Оцінка повторює повний routing до 12 разів; release/WASM latency окремо не вимірювалася. Geom тепер містить карту override й має Clone без Copy; усі локальні Rust-виклики перевірені компіляцією.

### 6. Залишок
РІШЕННЯ: Rust-реалізація готова до TS-обв’язки та build:wasm власником. Незакомічений S1 і початковий WASM збережено. Тимчасовий probe видалено.

### Post-deploy
ФАКТ: N/A — деплой не входить у доручення.

## Фінальні гейти та snapshot
ФАКТ: HEAD 72008be, зміни незакомічені. `cargo test --manifest-path packages/core/Cargo.toml` — exit 0: 197 unit + 7 integration, 0 failed; `cargo clippy --manifest-path packages/core/Cargo.toml --all-targets -- -D warnings` — exit 0; `cargo fmt --manifest-path packages/core/Cargo.toml --check` — exit 0; `git diff --check` — exit 0. Повторна перевірка 10/10 блоків S1 — PASS.

- `packages/core/src/staff_layout.rs` SHA256 `278ab72caa16ec1d91bd942503de2592dc14ff32318ebe30c10f19f670a73b37`
- `packages/core/src/staff_routes.rs` SHA256 `5d69b7d367465c4bffe3d915214c4194c1dcd7e3af0f8ef428d0954f4175bff9`
- `packages/core/src/types.rs` SHA256 `1189dd731cb90e87c22ff83be00aa8cbe475d14ea3c6ccf338f7788419713428`
- `packages/core/tests/multi_source_parent.rs` SHA256 `94020f9c031d7b5c379040284e6a4caa732e22822669b7f9312e27957ccb6043`
- `packages/core/tests/fixtures/multi-source-parent.json` SHA256 `a433fc142a9a5db9c269197b37f53227038e1074aaebdf014c35b8a5e6ce023d`

ДАЛІ: Rust завершено; TS-обв’язка і build:wasm — користувач.
