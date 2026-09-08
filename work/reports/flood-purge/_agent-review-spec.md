# Spec-вісь рев'ю: T80 flood-purge (dfe255e..HEAD)

ДАЛІ: прочитати spec.md, plan.md, T80 task, git log

ФАКТ: git log dfe255e..HEAD = 10 комітів К1–К10 (f656a91 доки К0, e135b7a К1, dbc5f24 К2, a5f86dd К3(тест), 7b731d8 К4(rust), 3344f8a К7(типи), e7781c6 К8(тест), 6268517 К9(доки), 85b45b6 К10(release)). diffstat: 80 files, +1119/-4109.
ФАКТ: spec.md містить A1–A17 (Г1–Г6 після GATE1), plan.md — 18 приймальних сценаріїв + GATE2 (3/5 закрито, 2 дірки: рантайм-обхід типів contourEngine, export.test.ts B1-B5 граничні кейси).
ДАЛІ: перевірити A1 (RenderConfig.contourEngine) і чи дірка №1 GATE2 (рантайм object-spread) була закрита в реалізації.

ФАКТ: A1 підтверджено — RenderConfig (render/types.ts:215+) не має contourEngine. Прод-код sdk/src не містить жодного contourEngine/cell-flood (лише історичні doc-коментарі в contourCorridor.ts:11, svgExport.ts:46, доки).
ФАКТ: A1 "тест, що фіксує відсутність поля" — НЕ заведено (нема .test-d.ts, нема ts-expect-error фікстури). Це узгоджено в plan.md §7 сценарій 1 явно (KISS, не заводити інфраструктуру заради рядка) — тобто розходження spec/plan свідоме, задокументоване.
ФАКТ: A3 підтверджено дифом — paintMagneticGroups.ts і paintMagneticGroupsCost.test.ts мають лише 1-рядкову зміну імпорту (bridge.js → types.js), paintMagneticGroups.test.ts (основний) взагалі без діфу. Геометрія не чіпалась.
ДАЛІ: перевірити A5 (барель) і CHANGELOG щодо переліку імен.

🔴 ЗНАХІДКА: CHANGELOG.md "0.4.0" заголовок пункту каже «Кореневий барель втратив одинадцять імен», але сам перелік під ним містить 6 функцій (computeDeptContour, computeAllContours, computeDeptContourInWorker, computeAllContoursInWorker, configureContourWorker, createIncrementalContourComputer) + 7 типів (DeptContourResult, ContourComputer, ContourComputerFn, DeptContourComputerFn, IncrementalContourComputer, ContourWorkerOptions, ContourWasmLoader) = 13 імен, не 11.
ФАКТ: перевірено по комітах — К2 (dbc5f24) коректно прибрав 11 імен (6 функцій+4 типи з worker-bridge/incremental +1 ContourComputer) і його власне повідомлення коміту каже "eleven" — правильно на той момент. К7 (3344f8a) прибрав ЩЕ 2 типи (DeptContourResult, ContourWasmLoader) при переїзді типів у render/contour/types.ts, коментар до К7 це явно описує ("DeptContourResult did not move... ContourWasmLoader stops being exported"). К10 (реліз) мав просумувати 11+2=13, але скопіював стару цифру "eleven" з К2 в CHANGELOG і в підпис коміту, хоча власний перелік під заголовком коректно містить усі 13. Тобто заявлене число "11" у CHANGELOG і в тексті коміту К10 — застаріле/невірне, хоча деталізований список правильний.
ДАЛІ: перевірити A7 (cargo test 40→21) реальним прогоном.

ФАКТ: A13 підтверджено — git status чистий після npm run build:wasm (перевірено реально).
ФАКТ: wasm bg-розмір — dfe255e: 232732 байт, HEAD: 145597 байт (git cat-file -s). Точний збіг із заявою К4. Зменшення 37.4% ≈ заявлені "37%".
ФАКТ: A7 (cargo test) — реально прогнано `npm run test:rust`: 21 passed; 0 failed. Збігається із заявою.
🔴 ІНЦИДЕНТ (не знахідка по коду, моя помилка методу): `npx rstest run` з КОРЕНЯ репо валить ~250 тестів через "WasmLoadError: fetch failed" — бо кореневий rstest не підхоплює `packages/sdk/rstest.config.ts`/`rstest.setup.ts` (де WASM прелоадиться байтами напряму, обходячи fetch). Це артефакт неправильного виклику, не бага в коді. Правильний виклик — `npm test` з кореня (яке робить `npm run test -w @org-hierarchy/sdk && ... -w @org-hierarchy/demo`) або `npx rstest run` усередині `packages/sdk`.
ФАКТ: коректний прогін `packages/sdk`: 967 юніт-тестів (2 повтори підтвердили той самий тотал: один раз 965 passed+2 failed=967, вдруге 967 passed+0 failed=967 — узгоджується з документованим класом флейків paintMagneticGroupsCost, CTO-RESEARCH.md п.12). Це збігається з заявою К10 "967 unit sdk".
ФАКТ: прогресія 986(K1, "was 1009 — 23 flood cases gone")→977(K2)→966(K4/K7)→967(K10, +1 від нового тесту К8) — усі числа з повідомлень комітів самоузгоджені й підтверджені фінальним реальним прогоном (967).
ДАЛІ: перевірити A6 (worker), A9/A10 (демо-вкладка), A11 (доки), A12 (CHANGELOG/версія), A14-A17.

ФАКТ: A6 підтверджено — worker/wasm-init.ts лише позичає типи (WasmContourModule, WasmLoadError), не кличе лоадер; worker-bridge.test.ts видалений цілком.
ФАКТ: A9/A10 підтверджено — row-tree тести зелені (967 total), Staff·Flood вкладки немає в tabConfigs/tabs/captions, e2e лишає лише історичний коментар про flood.
ФАКТ: A11 підтверджено — npm run check:docs зелений (брифінг на 11 з 25 дозволених комітів, у межах порогу).
ФАКТ: A12 підтверджено — package.json версія 0.4.0, CHANGELOG має розгорнутий запис 0.4.0.
ФАКТ: A14 підтверджено — grep "from '.*contour/bridge" по render/ export/ дає збіги ЛИШЕ в тестових файлах (variantBNotchPaint.test.ts, ContourPainter.test.ts), які й досі імпортують WasmLoadError/лоадер (не самі геометричні типи) — прод-код render/export імпортує типи з render/contour/types.ts. Це коректно (A14 стосується прод-споживачів геометрії, не тестів лоадера).
ФАКТ: A8 підтверджено дифом коміту a5f86dd — кейс :60 видалено, докстрінг :11-16 переписаний чесно ("НІКОЛИ не мав автотесту"), кейс :54 (тепер зсунувся, але логічно той самий) лишився без правок.
ФАКТ: A17 підтверджено — CTO-RESEARCH.md:71 містить окремий 🔴-абзац "цей факт НІКОЛИ не мав автотесту... стоїть на ручному вимірі".
ФАКТ: Out-of-scope дотримано — initContourWasm НЕ перейменовано (лишився з попереджувальним коментарем), інші вкладки демо не чіпались, C-форми не повернуто, paintMagneticGroups не оптимізовано (лише 1-рядкова зміна імпорту).
ФАКТ: DiagramRenderer.ts втратив ContourComputer тип і reportDiagnostic-проводку — не в буквальному плані, але прямо випливає з чистки (K7 коментар це називає "two dead things fell out"), задокументовано в CHANGELOG як "третій пункт, якого ніхто не просив" (ExportOptions.onDiagnostic без постачальника) — прозоро, не приховано.

🔴 ЗНАХІДКА (в): GATE 2 (plan.md §8) сам заявляє "ВЕРДИКТ: закрито 3/5" — дві дірки лишились відкритими навмисно як задокументований залишок. Дірка №1 (рантайм-обхід типів: `contourEngine: 'cell-flood'` з нетипізованого хоста мовчки ігнорується через object-spread у `OrgHierarchyDiagram.ts:331`) мала отримати "одне речення" в §3 або §7 плану — я перевірив: цього речення НЕМАЄ в plan.md (лише в самому розділі GATE 2, де й описана дірка), НЕМАЄ в docs/USAGE.md, НЕМАЄ в CHANGELOG. Код також не отримав рантайм-warning — `OrgHierarchyDiagram.ts:331` і зараз чистий object-spread без валідації. Тобто мандат плану "дописати" не виконаний ніде — GATE2-дірка №1 лишилась і не задокументованою поза власним аудитом, і не виправленою в коді. Дірка №2 (export.test.ts B1-B5) натомість дійсно закрита — тести переписані на дефолтний рушій, з явним коментарем "T80: ці п'ять перевіряють межі САМОГО шару експорту".

ДАЛІ: фінальний звіт.
