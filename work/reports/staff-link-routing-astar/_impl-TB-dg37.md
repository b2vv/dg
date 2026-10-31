ДАЛІ: знайти дискримінаційну фікстуру §10.1.4 і запустити RED на незміненому роутері.

ФАКТ: прочитані tasks-zigzag.md (T-B), plan-zigzag.md, spec-zigzag.md, локальні правила, маніфест стандартів, CTO-брифінг і TDD. Початкове дерево чисте. Базовий HEAD f47cd46. Єдиний writer — Codex; поточна гілка, без worktree/комітів/пушу/npm.
РІШЕННЯ (pre-code): scope — routing_order та його геометричні Rust-тести; secondary перший, target.0/target.1 далі, idx останній. Публічний seam route_edges уже визначено завданням; погодження повторно не потрібне. Прийняті пастки GATE 2: усі A*-сцени, детермінізм; captured golden лишається detour. Гейти cargo test/clippy/fmt; замір тимчасовим probe як T-A0. Незалежне review-after лишається зовнішньому циклу Claude/власника.
ФАКТ: EdgeSpec.target — координати цільового порту; наявний коментар routing_order також потребує зміни з manager Y/X на target X/Y. Baseline mock3: cross=9, excess=22, turns=126.

ФАКТ: тимчасовий геометричний пошук (production-код незмінений) знайшов сцену: m1=(50,0), m2=(250,150), права ціль=(400,500), ліва=(250,500), картки 100×60. Старий порядок дає вертикалі x=100/300 та перетин; цільовий порядок — x=450/300 без перетину. Пошуковий probe замінений постійним тестом через route_edges з належністю A/B/C. Перший запуск cargo помилково з кореня дав missing Cargo.toml; повторено з packages/core, це не TDD RED.
ДАЛІ: виконати постійний тест на старому ключі й зафіксувати справжній RED.

ФАКТ RED: cargo test two_managers_into_one_department_order_lanes_by_target -- --nocapture (packages/core), exit 101: left target must have the left lane: left=300, right=100. Це поведінкове падіння на старому production-коді. Перед цим виправлена помилка компіляції тесту: StaffRoutePoint не має PartialEq, порівнюємо пари координат без зміни типу.
ДАЛІ: мінімальна зміна ключа і GREEN.

ФАКТ GREEN власного AC-B1: новий тест пройшов у cargo test; 193/194 зелені. Єдине падіння — стара контрольна передумова ripup_clears_a_crossing_that_single_pass_leaves: новий порядок уже прибирає її перетин за один прохід. Не послаблюємо асерт: тимчасовий probe знайшов нову сцену з single.cross=1, ripup.cross=0 (y керівників 0/150/0, target.x 250/450/50).
ФАКТ попереднього заміру: cargo run --example tb_probe (packages/core), exit 0: mock3 cross=10 over=0 card=0 near8=0 dept=0 turns=130 excess=22 marked=0 edges=50. Це РЕГРЕСІЯ проти T-A0 (cross +1, turns +4), не успіх per-slice-гейта. Перевірити тим самим probe старий ключ. Тимчасовий приклад видалити після заміру. Помилковий виклик cargo з кореня повторено з packages/core; він не є гейтом.
РІШЕННЯ: виправити тільки геометрію контрольної rip-up-фікстури, зберігши обидва асерти crossing>=1 → crossing=0; не розширювати production scope на bus або rip-up.

ФАКТ: звірено всі 50 POS та 50 report-зв’язків /tmp/ta0-mock3.json із поточним mock3Shps.ts. Метрики T-A0 збережені: картки 300×112, gap 28/120, tierGap=120, margin=24, orgCard=300×64, zoneLabelBand=36, contentPadding=36, deptGrouping=true; near, useAstar=true, treeBlockLayout=true.
ФАКТ: контрольована заміна лише ключа назад на source у тому самому дереві та cargo run --example tb_probe дала baseline cross=9, turns=126, excess=22. Повернення target-ключа й повторний запуск дали cross=10, turns=130, excess=22. Обидва exit 0. Решта детектора в обох: over/card/near8/dept=0, marked=0, edges=50. Отже різниця спричинена T-B, а не входом probe.
ФАКТ: тимчасовий examples/tb_probe.rs видалено. cargo fmt виконано. Фінальний cargo test без probe: 194 passed, 0 failed; doc-tests 0. Обидва h6 golden-тести, orchestrator_determinism_identical_twice, astar_is_deterministic та ripup-тести зелені.
ФАКТ: native checkpoint після дозволеної sandbox-ескалації — OK (exit 0), ID a40ec73d4e112beb32a5b1699a6df390-1-05010a3822d6. Перший sandbox-виклик не мав права запису в receipts, checkpoint не створив.
ДАЛІ: фінальні clippy/fmt, перевірка diff і підсумковий звіт із явним FAIL per-slice-метрик.

ФАКТ — що зроблено: routing_order тепер (secondary, target.0, target.1, idx); secondary лишився первинним, явний idx-tiebreak останнім. Оновлено коментарі; додано геометричний AC-B1-тест із повторним прогоном на детермінізм. Перебудовано лише контрольну weave-фікстуру, щоб rip-up і далі доводив усунення реального перетину. Production-зміна — дві умови ключа.
ФАКТ — TDD/сценарії: RED exit 101 на старому коді (ліва доріжка 300, права 100); GREEN — монотонні доріжки та 0 перетинів. Наявний best-effort/off-grid failure-тест зелений. Golden/determinism Rust: h6_combined_scene_matches_golden, h6_combined_scene_is_byte_identical_across_runs, orchestrator_determinism_identical_twice та A*/rip-up детермінізм зелені.
ФАКТ — гейти з packages/core: cargo test PASS (194/194 + 0 doc-tests); cargo clippy --all-targets -- -D warnings PASS, exit 0; cargo fmt --check PASS, exit 0. git diff --check PASS. HEAD f47cd46; зміни лише staff_router.rs та цей робочий файл. Після гейтів лише перенесено довгий doc-коментар, без зміни коду.
ФАКТ — неочікуване: новий порядок усунув потребу rip-up на старій контрольній сцені, але погіршив загальну mock3. Зміна фікстури не прибирає асерт і не маскує регресію mock3.
ФАКТ — вимір після T-B vs T-A0:

| Метрика mock3 | T-A0 | T-B | Δ |
|---|---:|---:|---:|
| cross | 9 | 10 | +1 |
| excess_turns | 22 | 22 | 0 |
| true_turns | 126 | 130 | +4 |
| over/card/near8/dept | 0/0/0/0 | 0/0/0/0 | 0 |
| marked / edges | 0 / 50 | 0 / 50 | 0 |

РІШЕННЯ — статус приймання: ключ реалізований, AC-B1 та три Rust-гейти PASS, але per-slice-гейт НЕ ПРОЙДЕНО (cross і turns зросли). Cross не впав; гіпотеза про bus-консолідацію як причину не доведена цим заміром. Зміни залишені незакоміченими для рішення власника; автоматично відкат не виконано, бо користувач явно замовив саме цей ключ і звіт навіть без поліпшення cross.
ФАКТ — межі перевірки: golden JSON інших табів не змінений (git diff); Rust detour golden пройшов. Повна captured-golden TS-сюїта (staffGeometry.golden.test.ts, включно staff-dept-v2) НЕ ЗАПУСКАЛАСЯ, її runtime-паритет не заявляється. npm не запускався, WASM/SDK/demo не перебудовувалися. Незалежне review-after та візуал власника лишаються зовнішньому циклу.
ФАКТ — post-deploy: N/A, деплою/комітів/пушу/worktree не було. Тимчасові probes у дереві відсутні.
ДАЛІ: власнику/Claude оцінити регресію mock3 перед прийняттям T-B та переходом до T-A; результат не позначати як загальний PASS.
