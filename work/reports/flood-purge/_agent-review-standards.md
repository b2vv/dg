
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
