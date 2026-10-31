ДАЛІ: додати red-тести T-A0, запустити cargo test, реалізувати метрики й виміряти mock3.

ФАКТ: HEAD c079226b53966a0eb07d803293432814c6f3c260; початкове дерево чисте. Прочитано tasks/plan/spec-zigzag, маніфест, CTO-RESEARCH та TDD. План прямо позначає брифінг застарілим; джерело цього вузького зрізу — актуальний код і погоджені tasks/plan/spec.
РІШЕННЯ: READY, автор Codex, малий зріз AC-0; погоджені користувачем тестові шви true_turns, turn_limit, агрегація excess. Прямий пошук достатній для двох Rust-модулів; граф не потрібний. Інші слайси, npm, коміти, push і worktree виключені. Незалежне рев’ю перед комітом залишається наступним зовнішнім кроком, коміт не замовлено.
ФАКТ: rg bends у packages (Rust і test-файли) не знайшов асертів числового bends. route_stats лишається топологічним. Реальний best_effort містить 4 точки і failed=true; marked утворюється з failed АБО frame intrusion.
РІШЕННЯ: перевикористати is_internal через pub(crate); ліміт за парою (department, part), без зміни семантики роутера. Для excess пропускати marked; сумарні turns/bends рахувати для всіх маршрутів. Нульові відрізки і колінеарні продовження не є поворотами; розворот є зміною напрямку.

ФАКТ (RED): спочатку додано 4 тести, cargo test не скомпілювався через відсутні true_turns/turn_limit/turn_totals (E0425, 15 викликів; /tmp/ta0-red.log). Фікстура викликає справжній astar_route з off-grid портами, тому отримує штатний Z-fallback, а не спрощений A*-маршрут.
РІШЕННЯ: реалізація true_turns пропускає нульові відрізки, порівнює напрямки через cross/dot; turn_totals один раз рахує повороти кожного ребра й повертає (total, excess). Далі green та runtime-перевірка старої формули окремо.

ФАКТ (GREEN): cargo test — 193 passed, 0 failed; усі 4 нові тести пройшли (/tmp/ta0-green.log). Далі вимірюється near-LOD mock3 з useAstar + deptGrouping + treeBlockLayout, center-порти без dockHints.

ФАКТ (baseline): тимчасовий Rust probe на даних mock3Shps.ts: 50 посад, 10 департаментів, 50 зв’язків; near, center ports, useAstar=true, treeBlockLayout=true, deptGrouping=true. Розміри 300×112, gap 28/120, tierGap=120, margin=24, orgCard=300×64. zoneLabelBand=16+14+6=36 (mockupStyles.staffZone); contentPadding=16+14+6=36 (departmentCard з labelRow). Вхід /tmp/ta0-mock3.json отримано прямим вилученням id/p/p2/d з mock3Shps.ts; без ручної зміни складу сцени.
ФАКТ: true_turns=126, excess_turns=22, старий bends=126, marked=0, edges=50. Колінеарні точки НЕ роздувають 126 на цій сцені. Рядок Rust: A*: cross=9 over=0 card=0 near8=0 dept=0 bends=126 turns=126 excess=22 marked=0 edges=50.
ДАЛІ: перевірити cross=9 на незміненому HEAD, прибрати тимчасовий probe, перевірити чутливість тестів і фінальні гейти. cross=9 суперечить очікуванню плану; не приховувати і не розширювати T-A0 на виправлення роутингу.

ФАКТ: оригінальний HEAD у тимчасовій копії crate теж повернув cross=9 over=0 card=0 near8=0 dept=0 bends=126 marked=0 edges=50. Порівняння повного JSON StaffRouteSet до/після T-A0 пройшло: геометрія та маркери ідентичні. Це наявна розбіжність Rust-detector з описаним у плані HUD, не регресія T-A0; route_stats не змінювався. Тимчасовий probe видалено з робочого дерева після заміру.
ФАКТ: cargo clippy --all-targets -- -D warnings вже пройшов. Додано перевірку суми successful+marked, зовнішнього ліміту в агрегації та saturating zero. Далі контрольовані мутації лише в /tmp-копії crate, без git worktree.

ФАКТ (чутливість): у /tmp/ta0-verify-wg177l4x незмінена фінальна версія тестів staff_routes пройшла (45/45). Кожна мутація застосовувалася окремо з відновленням вихідних байтів; робоче дерево не мутувалося. Команда: CARGO_TARGET_DIR=<repo>/packages/core/target cargo test --manifest-path <copy>/Cargo.toml <test-filter> -- --nocapture.
- old-bends: true_turns → points.len().saturating_sub(2); collinear_z_fallback_has_no_true_turns впав: 2 замість 0, exit 101.
- zero-segments: вимкнено пропуск нульових відрізків; true_turns_ignores_duplicates_and_counts_direction_changes впав: 1 замість 2, exit 101.
- reversal: прибрано dot<0; той самий тест впав: 0 замість 1, exit 101.
- limit: поміняно 2/4; turn_limit_uses_endpoint_department_and_part впав: 4 замість 2, exit 101.
- marked: вимкнено фільтр; turn_totals_exclude_marked_failures_only_from_excess впав: (4,2) замість (4,0), exit 101.
- saturating: замінено saturating_sub на віднімання; той самий тест упав на underflow, exit 101.
Сирі виходи: /tmp/ta0-mutation-{baseline,old-bends,zero-segments,reversal,limit,marked,saturating}.log. Це додаткова runtime-перевірка регресій після первинного RED на відсутніх функціях; не підміна хронології TDD.

ФАКТ: перший фінальний cargo test повторно використав артефакт останньої мутації зі спільного CARGO_TARGET_DIR і впав на underflow, хоча робочий код містить saturating_sub. Це помилка ізоляції перевірки. РІШШЕННЯ: перевірити фінальний код з окремим чистим CARGO_TARGET_DIR=/tmp/ta0-final-target, також очистити лише кеш crate org-hierarchy-core у звичайному target і повторити штатні команди. Попередня фінальна спроба не є доказом дефекту робочого коду.

ДАЛІ: передати власнику результат T-A0; наступні слайси не реалізовувати в цій задачі.

## 1. Зроблено
ФАКТ: packages/core/src/staff_routes.rs — true_turns, turn_limit, turn_totals, bends через спільний підрахунок, поля turns= та excess= у A*:, 4 постійні регресійні тести. packages/core/src/staff_router.rs — лише видимість is_internal стала pub(crate) та форматування сигнатури. route_stats, геометрія маршрутів, SDK/API не змінені. Тимчасовий probe прибраний.

## 2. Перевірені сценарії та TDD
ФАКТ: тести написані ДО реалізації; RED — cargo test / E0425 на відсутніх функціях; GREEN — 193/193. Реальний off-grid Z-fallback має 4 точки, старий bends=2, true_turns=0. Перевірені колінеарні точки, дублікати, розворот, порожній шлях, внутрішні/міждепартаментні/міжчастинні/зовнішні кінці, marked=true/false/None, сума кількох ребер і нульовий excess нижче ліміту. Шість runtime-мутацій в окремій копії виявлені тестами.

## 3. Неочікуване
ФАКТ: Rust route_stats на mock3 дає cross=9 (решта 0) як на HEAD, так і після змін. Повний StaffRouteSet порівняно: ідентичний. Тому топологія не регресувала, але твердження плану про Rust-detector 0/0/0/0/0 цим виміром НЕ підтверджене. Спільний Cargo cache після mutation-run вимагав очищення; після cargo clean -p org-hierarchy-core звичайні гейти повторені успішно, окремий чистий target також зелений.

## 4. Гейти
ФАКТ: з packages/core, фінальна версія без probe:
- cargo test — PASS, 193 passed, 0 failed, exit 0 (/tmp/ta0-default-test.log).
- cargo clippy --all-targets -- -D warnings — PASS, exit 0 (/tmp/ta0-default-clippy.log).
- cargo fmt --check — PASS, exit 0 (/tmp/ta0-default-fmt.log).
Додатково git diff --check — PASS. npm не запускався. Комітів, push і git worktree не було.

## 5. Baseline mock3 — головний результат
ФАКТ: **true_turns=126; excess_turns=22; старий bends=126**. 50 ребер, marked=0, near-LOD. Виправлення bends на цій сцені — числовий no-op: 126 є справжніми поворотами, а не артефактом колінеарних точок. Для наступних слайсів базова межа total=126 та excess=22.

## 6. Залишок і передача
РІШЕННЯ: T-A0 реалізований і три замовлені Rust-гейти зелені. Незалежний review-after перед майбутнім комітом — відповідальність зовнішнього циклу Claude/власника за tasks-zigzag; у цій сесії незалежне рев’ю не заявляється. Візуальна оцінка та пояснення різниці Rust cross=9 проти заявленого HUD=0 залишаються окремими діями, не підставою приховувати baseline чи змінювати route_stats у T-A0. Архітектурні патерни N/A: три локальні функції обчислення, без нових залежностей або модульних меж.

## Post-deploy
ФАКТ: N/A — деплой не виконувався і не замовлений. Перевірка браузера/SDK/npm не виконувалась за обмеженням задачі; Rust-проба не видається за браузерну QA.
