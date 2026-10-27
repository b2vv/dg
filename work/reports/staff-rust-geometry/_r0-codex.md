ДАЛІ: Прочитати локальні інструкції, plan.md §5.1 і §8 та tasks.md R0; перевірити гілку, конфіги staff-сцен і погоджені шви A/B.

ФАКТ: Гілка feat/t126-staff-rust-geometry підтверджена. Початково є стороння зміна work/reports/staff-demo-clean/_owner-requirements-ledger-dg17.md; не торкаюся її. plan §5.1 дозволяє зелений baseline з мутаціями; B8 — окремий майбутній адаптерний тест. Поточне доручення є дозволом на R0 попри старий C9 NOT_RUN у tasks.md.
ДАЛІ: Уточнити джерела конфігів, live-параметрів і тестове завантаження WASM; великі документи читати вибірково, бо сукупний вивід обрізано.

ФАКТ: tabConfigs.ts:402 також задає staffLayout для worker; повний список має 11 сцен. currentOrgId = config.staffCurrentOrgId.
РІШЕННЯ: Додати worker; використовувати справжні buildTabConfig без підміни даних сцен.
ДАЛІ: Прочитати live-шлях, WASM setup та початкове вікно 1M.

ФАКТ: DiagramRenderer.ts:650–681 відтворюється buildStaffLayoutOptions + DEFAULT_STAFF_LAYOUT_OPTIONS; lastZoneLabelBand береться з окремого zoneLabelBand, не options.zoneLabelBand. Theme від resolveNodeTheme (render/theme.ts:28), render config з defaultRenderConfig + config.render.
ФАКТ: DiagramRenderer.ts:712–724 потребує приватного departmentWrapperPadding (1220–1228): card = padding + label row; blob = експортований contourButtonGroupMargin. Цю коротку формулу відтворюю в тесті, production не змінюю.
ФАКТ: DiagramRenderer.ts:829–857: v2 використовує resolveStaffRouting (staffRouterV2.ts:33–54), який додає рамки відділів та викликає mapPositionNodesToStaffEdgeBoxes → mapStaffEdgeBoxesForLod → buildStaffEdgeSegments; legacy викликає цей ланцюжок без рамок.
ФАКТ: App.ts:780–782 відкриває 1M через buildScaleStaffWindow({focusIndex: STAFF_SCALE_DEFAULT_FOCUS}); беру саме це вікно. rstest setup уже завантажує реальний WASM (packages/sdk/rstest.setup.ts:184+).
РІШЕННЯ: Golden міститиме A (чистий layout з конфігу й expandedOrgIds як e2eBridge.ts:184–188) та B (live layout options, zones і near/mid/far маршрути). В A bands зберігають y/height та x/width, якщо layout їх повертає; відсутні x/width задаються через margin/canvas.width як геометрія повної смуги. Без SVG.
ДАЛІ: Написати один тестовий файл із рекурсивним порівнянням ±1, структурними перевірками і точним повтором для детермінізму; згенерувати baseline.

ФАКТ: Генерація golden: exit 1; лог $TMPDIR/t126-r0/generate.log.

ФАКТ: Крок 1 BLOCKED, exit 1: `error listen EPERM: operation not permitted ::1:3000`. rstest run staffGeometry приймає позиційний фільтр, але сервер не може слухати порт у поточному sandbox; тести не почалися. Лог: $TMPDIR/t126-r0/generate.log.
ФАКТ: Створено packages/demo/src/scenarios/staffGeometry.golden.test.ts (чернетка, ще не перевірена тестами/typecheck/lint). Golden JSON не створено; заплановано 11 сцен, фактичні counts nodes/bands/edges НЕ ВИМІРЯНО.
ФАКТ: Два прогони без UPDATE_GOLDEN — NOT_RUN. Мутації (а) layout +1, (б) bounds +1, (в) route shift — NOT_RUN; рядків червоного тесту немає. Тимчасових змін SDK не робив, `git diff --stat packages/sdk` порожній.
ФАКТ: Гейти demo tests, sdk tests, typecheck, lint — NOT_RUN; exit codes відсутні, кількість виконаних тестів/падінь невідома (runner заблокований до виконання).
РІШЕННЯ: Зупинка за прямою інструкцією власника «Якщо щось блокує — зупинись». Не обходжу sandbox і не змінюю конфіг rstest. Комітів/пушу/stash/reset/clean/checkout/worktree не було.
ФАКТ: Session guard: поточний native session_id підтверджено host-повідомленням; точний policy row dg/codex знайдено. Його approved store і receipt parent лежать поза writable roots; checkpoint не запускався, бо поточна політика approval=never не дозволяє запис туди. Durable evidence лишається в цьому журналі; transcript не читався.
ПИТАННЯ: Потрібен запуск R0 у середовищі, де rstest дозволено слухати локальний порт (::1:3000). Поточна sandbox-політика не дозволяє escalation; це блокер виконання, не доведена помилка тесту.
ДАЛІ: Після надання придатного середовища — перевірити чернетку, повторити генерацію, двічі baseline, три окремі мутації з відновленням, потім чотири гейти. Поточний стан R0 — BLOCKED, не завершено.
