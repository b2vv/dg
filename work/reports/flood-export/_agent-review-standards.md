
## Сесія Standards-рев'ю 2026-08-26
ФАКТ: прочитано .claude/standards.md цілком (мірник, конституція, машинні гейти).
ДАЛІ: читаю diff svgExport.ts + CODING_STANDARDS.md + TDD.md + USAGE.md.
ФАКТ: прочитано diff svgExport.ts, exportDiagram.ts, USAGE.md, CHANGELOG, e2e, package.json.
ЗНАХІДКА(кандидат): у resolveExportContourRings хелпер toRings не використано у button-group-гілці — мапінг ring→"M/L" дубльовано інлайн (svgExport.ts, друга гілка painted.map).
ЗНАХІДКА(кандидат): грід-гілка передає cards/orgByPosition, які при transform:null ніколи не впливають на результат — обчислення Map даремне.
ЗНАХІДКА(кандидат): fallback-ланцюги `config.X ?? defaultRenderConfig.X ?? літерал` після `{...defaultRenderConfig, ...input.config}` — потрійний дефолт.
ДАЛІ: читаю CODING_STANDARDS.md (§0, іменування, аргументи), TDD.md, тести T1 (freeze) і export.test.ts diff.
ФАКТ: перевірено defaultRenderConfig (render/types.ts:401+) — corridorCells, minContourMembers:1, contourEngine:'button-group' всі визначені; потрійні fallback-ланцюги в svgExport.ts:68,90,95 мають мертвий хвіст.
ФАКТ: exportDiagram.ts:91-97 — reportExportDiagnostic: handler або console.warn; збігається з CHANGELOG і USAGE §10.
ФАКТ: TDD — коміт 7b2542d (тест-freeze) передує 62a3b04 (feat T3); кожен feat-коміт містить тести; іменування success:/failure: за TDD.md §3.
ЗНАХІДКА (ВАЖЛИВА): .claude/standards.md у ЦЬОМУ diff додає рядок «SVG-експорт завжди button-group» (рядки 103-109) — але сама гілка робить протилежне; мірник тепер суперечить коду гілки й оновленому docs/USAGE.md §6.
ДАЛІ: з'ясувати, який коміт правив standards.md; фінальний звіт.
ФАКТ: standards.md правився лише в fdce1e2 (spec) — зафіксував ДО-фічевий стан і не був оновлений після реалізації.
ФАКТ: default-engine-svg снапшот доданий у 7b2542d і не перегенерований пізніше — заява CHANGELOG «побайтово той самий» підтверджена історією.
ЗНАХІДКА: дубль M/L-джойна: toRings (svgExport.ts:69-74) vs інлайн у button-group-гілці (:126-129) — у функції, створеній для дедупу.
ЗНАХІДКА: ReturnType<typeof resolveContourWorldTransform> замість наявного іменованого ContourWorldTransform (contourWorldTransform.ts:6).
ЗНАХІДКА: тест B1 містить `(p as {...})` — cast у тесті, репо має shoehorn-політику; дрібниця.
ПИТАННЯ: чи навмисно standards.md лишили в до-фічевому стані (може, правити мірник — не справа фіча-гілки)? Якщо так — треба follow-up-коміт.
ЗВІТ: складено, див. фінальну відповідь.
