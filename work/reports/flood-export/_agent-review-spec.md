# Spec review log

ФАКТ: перевірено spec.md, plan.md, tasks.md (повністю прочитані).
ЗНАХІДКА: T10 (M1, ручна перевірка) в tasks.md НЕ позначено ✅ на відміну від T1-T9 — це узгоджено зі спекою ("Ручних рядків: 1", plan.md:171), питання лише чи зафіксовано десь виконання.
ДАЛІ: читаю діф svgExport.ts vs ContourPainter.ts (A1/H1), історію снапшот-файлу (A2/H2), тест на F5, наявність запису про M1.
ПИТАННЯ: чи є звіт ship-report із зафіксованим M1?

ФАКТ: перевірено packages/sdk/src/export/svgExport.ts:65-130 (resolveExportContourRings) проти packages/sdk/src/render/contour/ContourPainter.ts:262-312 (paint) — magnet, transform (pitchX/Y зі staffMerged), cards (staffMerged.nodeWidth/Height), insetX/Y формули збігаються; вибір рушія в обох строго `=== 'cell-flood'`.
ФАКТ: перевірено DiagramRenderer.ts:341-373 — staffOpts.nodeWidth форсується theme.person.width, insetX = (refCellWidth - theme.person.width)/2 — арифметично збігається з svgExport.ts:104 (config.cellWidth - cards.cardWidth)/2, бо cards.cardWidth = staffMerged.nodeWidth.
ЗНАХІДКА: A1/H1 — вхідні дані flood в SVG справді ті самі, що в ContourPainter (не хибна імплементація).

ФАКТ: перевірено git diff 7b2542d..62a3b04 -- .../export.test.ts.snap → +55/-0 змістовних рядків (лише додавання), фікстура H2 (default-engine-svg), знята в T1 до T3, не чіпалась.
ЗНАХІДКА: A2/H2 підтверджено чесно: снапшот дійсно не перезнятий після зміни коду, claim tasks.md ("55 додано/0 видалено") правдивий.

ФАКТ: перевірено packages/sdk/src/export/export.test.ts повністю (grep всіх describe/it, рядки 1-580) — describe-блоки покривають T3/H1, T4/F2-F3, T5/F1-F4, T6/B1-B5, T1/H2; рядка з F5 (2 org-блоки, другий кидає) НЕМАЄ в файлі.
ЗНАХІДКА (BLOCKING): F5 «частковий flood» — plan.md:164 приймальний рядок є, tasks.md:50 (T3) обіцяє "F5 — окремим тестом у T6", tasks.md:81-89 (T6) перелічує лише B1-B5 і НЕ згадує F5 в "Робимо" чи "Закриває". Тесту на F5 не існує взагалі. tasks.md бреше про покриття: plan.md:171 стверджує "Решта 13 — автоматичні: 12 unit + 1 e2e", але фактично лише 12 автоматичних рядків мають тест (F5 випав).
ФАКТ: перевірено packages/sdk/src/render/contour/floodContourEngine.ts:79-118 (computeFloodContours) — механізм часткової відмови реальний (try/catch всередині циклу по org-блоках, ringsByDept зберігає вже додані кільця, diagnostics = generic 'Contour flood unavailable: <err.message>').
ЗНАХІДКА: навіть якби тест існував, діагностика НЕ називає блок/org, що впав (лише err.message) — розходиться з буквальним формулюванням F5 в plan.md:164 "onDiagnostic назвав блок, що впав". Неверифіковано через відсутність тесту.

ФАКТ: перевірено tasks.md:118-123 (T10) — без ✅ на відміну від T1-T9; find work/reports/flood-export -iname "*ship*" — порожньо; жодного запису про виконання/невиконання M1 не знайдено.
ЗНАХІДКА: M1 чесно НЕ позначено виконаним (немає фабрикації), але й не зафіксовано явно "ще не виконано" окремим записом — просто відсутність ✅. Не порушення, але результат M1 невідомий.

ФАКТ: перевірено git diff -- .claude/standards.md, work/SPEC.md, work/CTO-RESEARCH.md, work/tasks/T80-*.md — усі оновлені коректно, узгоджено з новою поведінкою.
ЗНАХІДКА (minor, scope creep): tasks.md T8 (рядки 100-108) заявляє файли лише docs/USAGE.md, T80, CTO-RESEARCH.md; фактично діф чіпає ще .claude/standards.md і work/SPEC.md, не згадані в T8. Зміни коректні й потрібні (та сама застаріла фраза "SVG завжди button-group" там була), але tasks.md не документує ці два файли.

ФАКТ: перевірено packages/sdk/src/export/exportDiagram.ts diff — reportSvgEngineMismatch видалено, reportExportDiagnostic доданий, підключений у buildDiagramSvg через onDiagnostic (T2/T5 підтверджено).
ФАКТ: перевірено e2e/integration-paths.spec.ts diff — новий тест "Flood tab exports contours" перевіряє data-dept > 0 (H3 підтверджено, T7 правдивий).
ФАКТ: перевірено CHANGELOG.md, docs/USAGE.md, packages/sdk/package.json diff — версія 0.2.0, USAGE §6/§10/§14 без "SVG завжди button-group" (A5, T9 підтверджено).

ДАЛІ: звіт сформовано, робота завершена.
