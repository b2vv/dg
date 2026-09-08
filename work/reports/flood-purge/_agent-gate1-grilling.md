# GATE 1 (grilling) — flood-purge spec

ДАЛІ: прочитати spec.md, T80, CTO-RESEARCH факт №4, standards.md

ФАКТ: spec.md прочитано повністю (117 рядків). Ключові твердження:
- Єдиний продакшн-виклик computeAllContours = floodContourEngine.ts:90 (треба звірити)
- computeDeptContour мертвий вже зараз (треба звірити)
- wasm/layoutBridge.ts вантажить WASM через initContourWasm з контурного бриджа (треба звірити) — це блокер видалення теки contour/ цілком
- rowTreeDepthGuard.test.ts доводить факт №4 через computeAllContours (треба прочитати тест)
- Радіус 16 файлів (не 23)
- A1-A13 acceptance criteria
- В1/В2/В3 відкриті питання

ДАЛІ: прочитати T80, CTO-RESEARCH факт №4, standards.md поріг

ФАКТ: floodContourEngine.ts:90 підтверджено — єдиний продакшн-виклик computeAllContours.
ФАКТ: computeDeptContour підтверджено мертвим (лише bridge/worker-bridge/compute-handlers/index.ts — плюс сама Rust-сторона).
ФАКТ: wasm/layoutBridge.ts:1,30 підтверджено — initContourWasm справді вантажить WASM для row-tree; contour/bridge.ts не можна видалити.
ФАКТ: rowTreeDepthGuard.test.ts:60-66 підтверджено — "an unrelated WASM feature" тест = саме computeAllContours.

🔴 БЛОКЕР 1: build_from_flat, validate_org_hierarchy, extract_subtree НЕ мають #[wasm_bindgen] —
лише 3 wasm_bindgen fn у крейті: computeOrgRowTreeLayout, computeDeptContour, computeAllContours
(packages/core/src/lib.rs:23,60,79; grep "pub fn\|#\[wasm_bindgen\]"). TS-сторонні
validateOrgHierarchy/extractSubtree (layout/orgTree.ts:10,71) — чиста TS-реалізація, WASM не
торкається взагалі. Після видалення computeDeptContour/computeAllContours лишається РІВНО ОДИН
wasm_bindgen експорт — "непов'язаної WASM-фічі" для доведення факту №4 більше не існує.
Жоден із трьох кандидатів В1 не працює.

🔴 БЛОКЕР 2: packages/sdk/src/contour/magnetRadius.ts використовується button-group рушієм
(paintMagneticGroups.ts:124,147; contourCluster.ts; svgExport.ts) — НЕ лише flood. Не потрапляє
в grep-радіус спеки (не містить "contourEngine|cell-flood|computeAllContours|computeDeptContour").
Тека contour/ тримає два незалежні мотиви лишитись (bridge.ts — row-tree WASM; magnetRadius.ts —
button-group), спека фіксує лише перший.

🔴 БЛОКЕР 3 (менш критичний): contour/incremental.ts (createIncrementalContourComputer) —
публічний експорт з index.ts, побудований навколо ContourComputerFn/DeptContourComputerFn/
DeptContourResult (типи contour/bridge.js), нуль продакшн-викликів у SDK (лише власний тест з
фейковими фн). Не в grep-радіусі (generic param names), не в USAGE.md, не в A1-A13.

ФАКТ (не блокер, підтверджує): 5 variantB*.test.ts у render/ напряму викликають computeAllContours
як SUT (не лише малюють геометрію) — узгоджується з попередженням у T80 і буде впіймано A2-грепом,
але не названо явно в acceptance criteria.

ФАКТ (не блокер): версія 0.3.0 не опублікована в npm (404), тег відсутній — B3 вже правильно
позначене спекою як "підтвердження на GATE 1", не прихована діра.

ФАКТ (не блокер): scripts/check-docs.mjs:196-197 згадує contour/bridge.ts:106,112 лише як
історичний коментар (T105 ForTests-інцидент) — не завʼязано на позиції рядків, ризику немає.

РІШЕННЯ: формую фінальну відповідь — 3 блокуючі питання + вердикт ПОТРЕБУЄ ПРАВОК.
