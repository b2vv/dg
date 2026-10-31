ДАЛІ: зафіксувати RED на координатах singleton серед широких sibling-блоків; тоді мінімальна правка й вимір mock3.

ФАКТ: старт HEAD=f47cd46, гілка feat/t126-staff-rust-geometry. Чужий WIP: tasks-zigzag.md (M), _critic-before-TA-dg37.md, _diag-routing-vs-layout-dg37.md, _impl-TB-dg37.md (untracked). Не змінюю їх. Єдиний writer — Codex; без комітів, пушів, worktree, npm.
ФАКТ: прочитано task/діагностику/критику, маніфест стандартів, TDD, CONTEXT і CTO-RESEARCH. Для цього локального Rust-слайса актуальні першоджерела — staff_layout.rs та задані dg37-артефакти; TS-норми не застосовуються.
ФАКТ: pack_tree_block крок 1 створює no-dept singleton; крок 2 ВЖЕ лінкує parent_of за admin-батьком будь-якого блоку. asst не потребує нового лінкування. Крок 4 за рівного attach_x ставить no-dept останнім через індекс блоку. Отже твердження діагностики про окремий forest-root не підтверджене кодом.
РІШЕННЯ: READY для малого T-S за координатним AC користувача. Seam — group_staff_by_department/compute_staff_geometry, спостерігаємо координати; тести внутрішнього parent_of не потрібні. Спочатку дискримінаційний RED, далі стабільне розміщення singleton біля батька серед sibling-блоків, зберігаючи відносний порядок департаментів та чинний cycle-guard. Немає зміни API/router. Додаткові продуктові рішення не потрібні; причина уточнена прямим читанням коду. Перед комітом незалежне рев'ю залишається окремим кроком власника; коміт не входить у доручення.

ФАКТ (RED): cargo test --manifest-path packages/core/Cargo.toml tree_block_singleton_stays_near_its_no_dept_parent — FAILED (cargo exit 101; /tmp/ts-red.log). До зміни production-коду: asst.x=344, ceo.x=188; вертикаль уже дочірня, горизонтальна близькість провалена. Тест вимагає singleton між A і B, біля no-dept ceo, тому старий крайправий sibling-порядок не проходить.
РІШЕННЯ: parent_of не дублювати. Серед дітей з однаковим attach_x помістити singleton-блоки в найближчу до середини за сумарною шириною піддерев позицію. Зберегти взаємний порядок департаментів, singleton-ів, різних attachment-X; корені та розрив циклів не змінювати.

ФАКТ: baseline відтворено тимчасовим examples/ts_probe.rs через compute_staff_geometry(/tmp/ta0-mock3.json): near, useAstar=true, deptGrouping=true, treeBlockLayout=true. cross=9 over=0 card=0 near8=0 dept=0 turns=126 excess=22 marked=0 edges=50. ceo=(4042,84), asst=(8060,316) — asst уже на дочірньому Y, а не окремий корінь. Повний JSON: /tmp/ts-before.json.
ФАКТ (GREEN): після правки лише sibling-порядку `cargo test ... tree_block` — exit 0, 7 passed (/tmp/ts-green.log). Новий координатний тест зелений, старі dept/cycle/attachment тести теж.
ФАКТ: перший вимір після GREEN: cross=6 over=0 card=0 near8=0 dept=0 turns=120 excess=16 marked=0 edges=50. ceo=(4042,84), asst=(4288,316). JSON: /tmp/ts-after.json. Падіння cross рівно 3; пари ще звіряю окремо.
ФАКТ: native checkpoint після RED створено успішно: 0da05ea57898e7b1b9a059229866c497-1-65b6c3fe6a26 (exit 0, OK).

ФАКТ: додаткові координатні перевірки зелені: no-dept ланцюг; singleton без батька-в-сцені лишається коренем; singleton-цикл завершується та зберігає всі позиції; неоднакові ширини; кілька singleton-ів; стабільний порядок і byte-identical JSON двох прогонів. `cargo test ... tree_block`: 9 passed, exit 0 (/tmp/ts-boundary.log).
ФАКТ: strict-interior перевірка з epsilon=0.5 (як proper_cross) на геометрії before/after підтвердила рівно 9→6 перетинів. Прибрано саме:
- X#1: ceo→asst × cfo→ah;
- X#2: ceo→asst × cto→bi;
- X#3: ceo→asst × cto→ib.
ФАКТ: залишилися ті самі шість пар: cfo→ah × ceo→hrd/lgl/sch; cto→bi × ceo→hrd/lgl/sch. Нових пар немає. Скрипт виміру /tmp/ts-cross-pairs.py, результат /tmp/ts-cross-pairs.log; Rust-probe packages/core/examples/ts_probe.rs видалено до фінальних гейтів.

## 1. Зроблено
ФАКТ: у staff_layout.rs додано стабільне центрування singleton-блоків у групі дітей з однаковим attachment-X за ширинами піддерев. parent_of вже був правильний; його, forest-roots та cycle-guard не змінено. Збережено взаємний порядок dept-блоків та singleton-ів; різні attachment-X не переставляються. Ширини мемоізовано до перестановки; перестановка не змінює сумарних ширин піддерев.

## 2. Протестовані сценарії
ФАКТ: основний дискримінаційний тест написаний і запущений RED перед production-зміною, далі GREEN. Додано ще два регресійні тести граничних випадків і стабільності; наявні dept/attachment/cycle тести зелені.
ФАКТ: фінальні гейти на HEAD f47cd46 + лише зміна staff_layout.rs з цього слайса:
- `cargo test --manifest-path packages/core/Cargo.toml`: exit 0, 196 passed, 0 failed; /tmp/ts-cargo-test.log.
- `cargo clippy --all-targets -- -D warnings` у packages/core: exit 0; /tmp/ts-clippy.log.
- `cargo fmt --check` у packages/core: exit 0.
- `git diff --check`: exit 0.

## 3. Неочікуване
ФАКТ: початкова гіпотеза «asst — окремий forest-root» хибна на f47cd46. Він уже дочірній блок ceo, але останній sibling за tie-break індексу. Виправлено фактичну причину, а не повторено наявне лінкування. Незалежного рев'ю не заявляю: виконано авторську перевірку diff та гейти.

## 4. Вимір
| Метрика | Baseline (відтворений) | Після T-S | Зміна |
|---|---:|---:|---:|
| cross | 9 | 6 | −3 |
| over | 0 | 0 | 0 |
| card | 0 | 0 | 0 |
| near8 | 0 | 0 | 0 |
| dept | 0 | 0 | 0 |
| true_turns | 126 | 120 | −6 |
| excess | 22 | 16 | −6 |
| marked | 0 | 0 | 0 |
| edges | 50 | 50 | 0 |

ФАКТ: центр ceo залишається x=4192; центр asst x=8210→4438, відстань центрів 4018→246. Y ceo=84, asst=316 за верхнім краєм карток незмінні. X#1–3 прибрані геометрично, не лише за агрегатом cross.

## 5. Обмеження
ФАКТ: scope — Rust packages/core. npm/SDK/demo/браузер/збірка WASM не запускалися за дорученням. Чужий WIP збережено; немає комітів, пушів, нових гілок чи worktree. CTO-RESEARCH має 36 комітів від останнього оновлення; повний рефреш брифінгу не виконано в цьому вузькому дорученні, факти T-S звірено безпосередньо з кодом та відтвореним probe.

## 6. Наступний крок
РІШЕННЯ: T-S виконано за координатним AC і цільовим зниженням cross. Решта X#4–9 — окремий T-CL/реордер за рішенням власника; excess=16 залишається входом для T-C. Незалежне review-after перед майбутнім комітом — окремий крок власника.

## Post-deploy
ФАКТ: не застосовується — деплою не було. Перевірено локальний Rust-вихід mock3; візуальна перевірка власником не підміняється цими числами.

ДАЛІ: передати власнику diff і цей звіт для незалежного review-after; код та всі запитані Rust-перевірки завершено.
