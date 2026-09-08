
---
## Сесія рев'ю Standards (T80 flood-purge), старт

ДАЛІ: прочитати .claude/standards.md (маніфест), потім CODING_STANDARDS.md, TDD.md, AGENTS.md

ФАКТ: standards.md прочитано. Ключове: Конституція (тести перед кодом, ієрархія принципів,
межа WASM↔TS явний контракт+власник пам'яті, публічний API SDK не змінюється мовчки, Pocock лише
TS). Гейти зелені (пропускаємо). Мірник TS-стандартів діє лише на packages/sdk, packages/demo.
Rust без документованого стандарту — судити за загальною практикою.
Архітектурний факт після T80 (рядок 148-156): контур має один рушій TS paintMagneticGroups.ts.

ДАЛІ: прочитати CODING_STANDARDS.md §0 (ієрархія) і релевантні секції, TDD.md коротко.

ФАКТ: CODING_STANDARDS.md прочитано повністю. Ключове для рев'ю видалення: §7 Dead code —
"Видаляти, не коментувати". §8 шар Adapters явно називає `contour/bridge.ts` адаптером —
файл, чию назву задача свідомо лишила невідповідною новій ролі (згадано в спек-бріфі).
§2 таблиця "WASM — adapter: Domain описує контракт, Rust/WASM реалізує".

ДАЛІ: git log --oneline dfe255e..HEAD і git diff --stat, потім по комітах К1-К10.

ФАКТ: bridge.ts diff — межа звужена до одного експорту wasm_compute_org_row_tree_layout
(lib.rs підтверджує: contour mod видалено повністю, wasm_compute_dept_contour/AllContours
видалені). bridge.ts тепер несе явний коментар-контракт (рядки 1-11 нової версії) що
пояснює: WASM-модуль один споживач (wasm/layoutBridge.ts + row-tree), і що іменування
(initContourWasm, WasmContourModule, ContourWasmLoader, шлях файлу) свідомо залишені —
це задокументовано в самому файлі. Це прямо відповідає п.5 брифу і задовольняє Конституцію
"межа WASM ↔ TS: контракт явний, власник пам'яті названо" (хоч власник пам'яті тут не
згаданий явно окремим реченням — WASM повертає JsValue/serde, TS споживає одноразово,
немає persistent WASM-стану, тому "власник пам'яті" тривіальний/нема кому належати —
не порушення, а відсутність предмету).
paintMagneticGroups.ts / paintMagneticGroupsCost.test.ts diff — лише зміна імпорту типу
з '../../contour/bridge.js' на './types.js', жодної зміни логіки/геометрії. Відповідає
вимозі "мала лишитись байт-у-байт".

ДАЛІ: перевірити чи є "сироти" — типи/поля без споживачів. Пошук computeDeptContour,
computeAllContours, ContourMagnetConfig, VARIANT_B_POSITIONS, toRustConfig, contourEngine,
cell-flood по всьому репо (код+доки), і index.ts барель diff.

ФАКТ: ТВЕРДЕ ПОРУШЕННЯ #1 — work/SPEC.md §9 "Публічний API (target)" (рядки 583-616,
diff цей блок НЕ чіпав, хоча §3 вище в тому ж файлі перероблено ретельно в цьому ж циклі)
далі імпортує `computeDeptContour, computeAllContours` з '@org-hierarchy/sdk' (рядки 588-589,
606-612) — обох більше немає в бареля: `packages/sdk/src/index.ts` diff (git diff dfe255e..HEAD)
прибирає їхній export повністю. AGENTS.md прямо: "Коли зміна робить документ хибним — виправ
документ у тому ж коміті." SPEC.md — мірник-документ (`.claude/standards.md` таблиця, рядок
"work/SPEC.md §13"). check:docs це не ловить (перевіряє лише публічні методи
OrgHierarchyDiagram, барель *ForTests, onSeatCollision, getOrgMode) — саме той клас дефекту,
який AGENTS.md називає "що чекер не судить".

ФАКТ: ТВЕРДЕ ПОРУШЕННЯ #2 (слабший, приклад-код) — work/TDD.md рядки 74-79:
`describe('computeDeptContour', () => { it('success: returns SVG path for VARIANT_B'...) })`
— приклад тестової конвенції досі показує `computeDeptContour` як живу тестовану одиницю.
TDD.md — мірник-документ. Не торкнутий у диффі жодним із К1-К10 комітів.

ДАЛІ: перевірити docs/USAGE.md diff на коректність (36 рядків) та пошукати сирітські
config-поля/тестові хелпери, які лишились без споживачів (ContourMagnetConfig поля,
config.ts видалено — перевірити немає розсинхрону типів рушія).

ФАКТ: ТВЕРДЕ ПОРУШЕННЯ #3 (мертвий код) — packages/demo/src/scenarios/mockupLayouts.ts:41-53:
`FLOOD_CELL` (рядок 47) і `FLOOD_STAFF_LAYOUT` (рядки 49-53) лишились **експортованими без
жодного споживача**. Комітом К1 (tabConfigs.ts diff) прибрано єдиного споживача — case
'mockup-staff-flood' та імпорт FLOOD_CELL/FLOOD_STAFF_LAYOUT/buildMockupStaffFloodData —
але визначення в mockupLayouts.ts не видалено. `grep -rn "FLOOD_CELL|FLOOD_STAFF_LAYOUT"
packages/` дає лише самопосилання в mockupLayouts.ts, нуль зовнішніх споживачів.
Порушує CODING_STANDARDS.md §7 "Dead code | Видаляти, не коментувати" (мірник діє на
packages/demo). Додатково рядок 42-43 — коментар "Flood copy: tighter cells so the
cell-space contour still hugs the cards" описує видалений Rust-рушій як актуальний —
клас дефекту з брифу п.3 (коментар пережив код).
`buildMockupStaffFloodData` (mockupStaff.ts) видалено коректно — сирота лишилась саме
в mockupLayouts.ts, не в самому сценарії.

ФАКТ: JUDGMENT CALL — CHANGELOG.md:18-23 і заголовок коміту К10 "eleven names fewer"
стверджують "одинадцять імен" прибрано з кореневого бареля, але сам список у тому ж
абзаці перелічує **13** імен (перевірено grep по backtick-ідентифікаторах рядків 18-23:
6 функцій + 7 типів = 13). Числова само-суперечність у документі — не мірник-документ
(CHANGELOG.md немає в таблиці мірника), тому не тверде порушення, але порушує загальний
принцип AGENTS.md "коли зміна робить документ хибним — виправ" у м'якшій формі (документ
хибний сам із собою). Низький пріоритет.

ДАЛІ: фінальна перевірка — базова лінія Фаулера на нових файлів (types.ts, variantBPositions.ts)
і завершити звіт.

ФАКТ: types.ts / variantBPositions.ts — нові файли чесно документують межу переносу
(коментарі пояснюють "чому тут", уникають layer inversion loader→render). ContourMagnetConfig
відкрито зізнається, що частина полів (preferNotch і under.) уже не мають Rust-споживача,
і це свідома, задокументована відмова звужувати публічну поверхню в цьому ж PR — приймається
як judgment call, не порушення (розкрито в самому файлі, рядки 20-25).
ContourMagnetConfig сам не мертвий — споживається ContourPainter.ts.

РІШЕННЯ: рев'ю завершено. Три тверді знахідки (SPEC.md §9 стаз, TDD.md стаз, мертвий код
FLOOD_CELL/FLOOD_STAFF_LAYOUT) + один м'який judgment call (CHANGELOG "eleven" vs 13) +
geometry байт-у-байт підтверджена + межа WASM↔TS звужена й задокументована коректно.

--- КІНЕЦЬ СЕСІЇ ---
