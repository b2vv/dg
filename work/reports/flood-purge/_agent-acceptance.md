# Робочий журнал — acceptance spec для flood-purge

ДАЛІ: прочитати work/reports/flood-purge/spec.md повністю, включно з розділом "Правки після GATE 1" (Г1-Г5)

ФАКТ: spec.md прочитано повністю (187 рядків), включно з Г1-Г5, A1-A17, відкритими питаннями В1-В3.
ДАЛІ: знайти наявні тестові файли й e2e-специи, згадані в A-критеріях, перевірити що вони існують.

ФАКТ: rowTreeDepthGuard.test.ts (packages/sdk/src/layout/rowTreeDepthGuard.test.ts) наразі
НЕ доводить архітектурний факт №4 у жодному тесті: MAX_ROW_TREE_DEPTH=2500 (JS-гвардія в
rowTreeLayout.ts) відсікає будь-яку глибину >2500 ДО виклику WASM. Тест "success: an unrelated
WASM feature still works after a refusal" (computeAllContours) проходить, бо WASM взагалі не
торкались — гвардія відмовила на JS-рівні. Реальний трап WASM (memory access out of bounds,
~4500) зафіксований лише РУЧНИМ вимірюванням у work/reports/row-tree-depth/spec.md:22, жодного
автотесту, що його відтворює, немає (нема layoutBridge.test.ts, computeOrgRowTreeLayoutWasm
напряму ніде не тестується). Це саме "тест не про те, що каже" — А8/Г1 вимагають НОВОГО тесту,
що обходить JS-гвардію (прямий виклик computeOrgRowTreeLayoutWasm з дуже глибоким входом) і
доводить, що ПІСЛЯ реального трапу другий валідний computeOrgRowTreeLayout() теж падає.

ФАКТ: worker-bridge.test.ts (packages/sdk/src/contour/worker-bridge.test.ts, 126 рядків) —
ЦІЛКОМ про computeDeptContourInWorker/computeAllContoursInWorker, інших describe немає. "мінус
контурні кейси" = порожній файл → файл видаляється повністю, а не "лишається зеленим".

ФАКТ: 5 з 7 "variantB*" тестів у packages/sdk/src/render/*.test.ts кличуть computeAllContours
і йдуть під ніж: variantBTonguePad, variantBRectRow, variantBContourStrokeDiag,
variantBPaddingPaint, variantBContourAlign. Два виживають (чистий button-group,
paintMagneticGroups): variantBNotchPaint.test.ts, variantBMagnetRadius.test.ts.
variantBNotchPaint.test.ts тримає setContourWasmLoaderForTests у beforeAll, але WASM ніде в
тілі тесту не викликає — це вже зараз рудимент, підтверджує, що button-group не потребує WASM.

ФАКТ: contour/bridge.ts тримає ContourPositionInput, ContourMagnetConfig (переїжджають, Г4) І
VARIANT_B_POSITIONS (лишається, Г5, typed за ContourPositionInput) — після переїзду типів
bridge.ts муситиме імпортувати ContourPositionInput назад із нового дому для власної константи.

ФАКТ: ContourPainter.ts:279,308 і svgExport.ts:85 — дві точки, де сьогодні реальна гілка
`if (engine === 'cell-flood')`; ContourPainter.test.ts:231 ("failure: cell-flood without a
world transform paints nothing") і export.test.ts (~15 flood-кейсів, рядки 201-660+) — це і є
"експорт з двома гілками", що зникає до однієї.

ФАКТ: жодного .test-d.ts чи type-fixture файлу в репо немає — A1 "тест, що фіксує відсутність
поля в типі" зараз не існує в жодній формі; потрібен новий (@ts-expect-error фікстура під
npm run typecheck, або expectTypeOf-подібний файл).

ФАКТ: cargo test -- --list підтверджує 40 тестів зараз, 19 з них у contour.rs → 21 очікується
(A7 співпадає з виміром).

ДАЛІ: скласти фінальну таблицю сценаріїв і порахувати "потребує нового тесту".

РІШЕННЯ: фінальна таблиця — 18 сценаріїв, 3 групи (продукт/happy-path, регресія, межа).
Порахувати "потребує нового тесту".
