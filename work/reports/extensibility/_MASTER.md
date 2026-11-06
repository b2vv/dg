# Extensibility R1–R5 + R11 — master ledger

**Мандат власника (2026-11-06):** зробити ВЕСЬ названий реєстр роадмапу (R1–R5, R11) автономно, multi-agent
за AI Factory (spec-flow → гейти → ledger → Codex-кодери + gate-reviewer), мульти-виконання дозволено.
**Пуш у main — ЛИШЕ коли весь план готовий.** Гілка `feat/extensibility` off main `da0e184` (D3+D1 злиті).
GATE-1-рішення беру з роадмапу (там багато вирішено); зупиняюсь на справді відкритих/блокерах.

## Фічі, порядок, залежності (джерело: work/ROADMAP-extensibility.md)

| # | Фіча | Залежить | Статус | Теки |
|---|---|---|---|---|
| R1 | Pixi hover hit-test (far-LOD dim) | D1 OK | DONE b40118a | reports/extensibility/r1/ |
| R5 | Мультивибір: shift-клік toggle + marquee (hit-test за геометрією); SDK-логіка, хост-стиль гумки | D1 ✓ | TODO | r5/ |
| R4 | Зум wheel/button конфіг: behavior/gestures opt-out, Mac→meta, hint, клавіатурний, анімована кнопка | — | TODO | r4/ |
| R3 | Pixi зовнішні view-фабрики (D2: дві моделі інжекції; гола функція + create/update/destroy retained) | R1(hit-test) | TODO | r3/ |
| R2 | React-шар DX: багатший контракт інжекції (анімація переходів = D3, вже є) | — | TODO | r2/ |
| R11 | Правила ліній з обгортками: уніфіковані obstacle-регіони (повʼязано зі staff-link-routing astar) | — | TODO | r11/ |

**Порядок виконання:** R1 → R5 → R4 → R3 → R2 → R11 (залежності + ризик; R1 розблоковує R3-hit-test).
Фічі здебільшого послідовно; паралель — кодери ВСЕРЕДИНІ фічі (неперетинні файли), як D1-B∥C.

## Правила (AI Factory + проєкт)
- Codex exec `< /dev/null` (пам'ять codex-background-needs-stdin-closed); код пише Codex, Claude рев'юнить.
- Кожна фіча: spec → GATE 1 (роадмап-рішення) → plan → GATE 2 (critique∥defense, gate-reviewer Opus 4.8) →
  tasks → implement (Codex, неперетинні файли) → координаторська перевірка (тести+мутації) → інтегроване рев'ю
  (Standards∥Spec) → коміт. Конституція inline. Durable ledger на фічу.
- dist спільний: важкі гейти (root typecheck/build) НЕ чіпати до кінця; demo-typecheck може чекати dist.
- Пуш у main — раз, у кінці всього плану, після «ок» cass на фінальну збірку.

## Журнал (додавати по ходу)
- Старт: гілка feat/extensibility @ da0e184. Майстер-ledger створено. Починаю R1.

## R1 (у роботі)
- spec+plan написано. GATE-1 з роадмапу. Конституція inline PASS. Нарізка: R1-A (DiagramRenderer+PersonNode+OrganizationNode, зняти far-виняток hover).
- GATE 2 (combined critique+defense, 1 gate-reviewer — мала фіча): dispatched → r1/_gate2.md.
- R1 GATE 2: RED (B1 неназваний перевернутий тест; B2 setHovered-правка протікає в legacy-не-opt-in → AC3) → plan рев.2 **DIM-ONLY** (зняти лише :254-виняток, setHovered не чіпати; файли → лише DiagramRenderer.ts). B1: названо interaction.test:186-206 + нові far [1,1,0.45] + null-source тест. Re-check тим самим рев'юером: dispatched.
- R1 GATE 2 re-check: **GREEN** (B1/B2 closed, non-blocking handled). → tasks(R1-A) + implement.
- R1-A: dispatched (Codex `< /dev/null`, dim-only, файли лише DiagramRenderer.ts+test) → r1/_impl-R1-A.md

## R1 — DONE (commit b40118a). far-LOD dim-only, 16 тестів, 177/1503/0, GATE 2 GREEN. Наступна: R5.

## R5 (у роботі) — marquee мультивибір (shift-клік уже є)
- spec+plan: marquee жест у DiagramRenderer; чистий hit-test render/marquee.ts; колбек onMarquee (хост стилізує гумку); opt-in (повний marquee лише з onMarquee — урок D1). Нарізка R5-A(pure)→R5-B(renderer)∥R5-C(facade).
- GATE 2 (combined): dispatched → r5/_gate2.md
- R5 GATE 2: RED (F1 gesture-колізія з stage-pan [продуктове, роадмап-grounded→Shift+drag]; F2 AC6 застаріла; F3 pointertap стирає вибір; F4-F8 nb) → spec AC6/AC8 + plan рев.2: marquee=Shift+drag (роадмап Shift=вибір), пан гаситься лише при Shift AND sink≠null, tapAfterDrag-придушення, world-capture, callHostCallback, reuse-fix. **F1-рішення винести власнику на огляд (роадмап-grounded, не блокую).** Re-check: dispatched.
- R5 GATE 2 re-check: 3 оригінальні CLOSED, NEW F1b (Shift перевантажений тригер+additive → replace недосяжний, сценарії застаріли) → рев.3: marquee ЗАВЖДИ additive (легенда «рамка=мультивибір»), onSelect(ids) без replace, spec-сценарії/AC2 узгоджено. F1+F1b → огляд власника при пуші. Re-check F1b: dispatched.
- R5 GATE 2 re-check F1b: **GREEN** (усі 4 блокери закрито). Non-blocking stale «selectMany/toggle»→«Shift-union» прибрано. → R5-A→R5-B∥R5-C.
- R5-A: dispatched (Codex) → r5/_impl-R5-A.md
- R5-A: DONE (31 тести GREEN, pure render/marquee.ts). → R5-B ∥ R5-C dispatched (Codex, неперетинні: B=DiagramRenderer, C=facade/USAGE/barrel).
- R5-B: DONE (68/68). R5-C: implemented (5 тестів+typecheck ok; «lint-блок» був timing-артефактом — R5-B-файл писався паралельно; тепер lint exit 0). Інтеграція: pkg typecheck+lint чисто, повний сьют 180/1550/0. check:docs ↓.
- Рев'ю R5 Standards: **GREEN**, 0 блокерів. Opt-in byte-for-byte підтверджено; 3 гарди (pan-suppress/union/tap-suppress) red-if-deleted з реальним dispatch; фейків нема; lint 0. Non-blocking: USAGE «every frame»→«per pointermove» (виправлено). Чекаю Spec.
- Рев'ю R5 Spec: **GREEN** (14/14 red-if-deleted, owner-рішення відповідають, emphasis/hover не чіпано). **R5 DONE (commit 0c78c32).** 2/6. Owner-review (F1/F1b) накопичено.
## R5 — DONE 0c78c32. Наступна: R4 (зум конфіг).

## R4 (у роботі) — зум конфіг (дизайн вирішено в роадмапі)
- spec+plan: WheelConfig {behavior, gestures{zoom,panHorizontal}}, Mac ctrl→meta, клавіатурний зум, анімована zoomBy. Нарізка R4-A(Viewport+wheelConfig.ts pure)→R4-B(facade). Owner-review: деф panHorizontal:false прибирає Shift+wheel горизонт-пан (grounded R5).
- GATE 2 (combined): dispatched → r4/_gate2.md
- R4 GATE 2: RED (B1 Mac ctrl→meta remap ламає trackpad-pinch=ctrl+wheel → регресія; N1 zoomBy sync→async stale getZoom; N2 keyboard focus/tabindex; N3 resolveWheelConfig fallback) → spec+plan рев.2: Mac PRIORITY не remap (ctrl+wheel лишається зумом=pinch, ⌘ рекоменд.); zoomBy комітить target синхронно; tabindex+keydown; resolveWheelConfig fallback/precedence; +рядки 5b/13/14/15. Re-check: dispatched.
- R4 GATE 2 re-check: **GREEN** (B1 closed, N1/N2/N3 folded, 5 defense CLOSED). Non-blocking для R4-A: doc-drift «Mac→meta» виправлено до priority; N1 getZoom під tween вертає pending-target (одна scale); platform-detection+SSR→non-Mac. → R4-A→R4-B.
- R4-A: dispatched (Codex, Viewport+wheelConfig.ts, N1 getZoom pending-target, N2 tabindex, Mac priority) → r4/_impl-R4-A.md
- R4-A: DONE (31 тести, Viewport+wheelConfig.ts). Повний сьют 181/1559/0, lint ok. → R4-B dispatched (facade+USAGE+barrel).
- R4-B: BLOCKED (QUESTION) — відсутній seam PixiHostOptions.wheel→new Viewport (R4-A дав Viewport-вхід, не PixiHost-forwarding). Правильно зупинився. Координатор: ДОЗВОЛЕНО додати PixiHost.ts (лише wheel-forwarding). Перезапуск.
- Рев'ю R4 Spec: **GREEN** (15/15 red-if-deleted; B1-фікс Mac-pinch підтверджено; getZoom=pendingZoom??scale #15; owner-рішення+USAGE ок). Non-blocking: row9 unit-only, scenario-1 phrasing. Чекаю Standards.
- Рев'ю R4 Standards: **GREEN** (критичні перевірки red-if-deleted, B1-фікс у коді). Non-blocking: мертвий isZoomWheel → прибрано (+ orphan-тест). **R4 DONE (commit 3550b86).** 3/6.
## R4 — DONE 3550b86. Наступна: R3 (Pixi view-фабрики + D2).

## МАСШТАБУВАННЯ (власник: паралель через фічі) — R3 ∥ R2 ∥ R11
- Зони неперетинні: R3=Pixi/TS render (DiagramRenderer/PersonNode), R2=React overlay, R11=Rust core+TS routing-input.
- Колізія лише R3↔R2 на спільних OrgHierarchyDiagram.ts/index.ts/USAGE.md → facade/barrel/USAGE СЕРІАЛІЗУЄ координатор (R3-C/R2-B по черзі); фіче-ядра (R3-B∥R2-A∥R11-A) паралельно.
- spec+plan написано для всіх 3. GATE 2 (combined ×3): dispatched паралельно → r3/_gate2.md, r2/_gate2.md, r11/_gate2.md.

## МАКС-ПАРАЛЕЛЬ (власник: паралелити й усередині фіч)
- Запуск кодерів ПАЙПЛАЙНОВО: щойно GATE-2 фічі = GREEN → одразу її кодери (не чекати інших гейтів).
- Хвиля-A (незалежні pure/core, паралельно): R3-A (nodeViewFactory) ∥ R2-A (overlay props) ∥ R11-A (Rust router).
- Хвиля-BC (паралельно, після свого A): R3-B(renderer) ∥ R3-C(facade*) ∥ R2-B(facade*) ∥ R11-B(TS routing-input).
  (* R3-C і R2-B чіпають спільні facade/index/USAGE → серіалізує координатор.)
- Рев'ю: інтегровані Standards∥Spec на фічу — паралельно через фічі, щойно фіча зібрана.
- gate-before-code ЛИШАЄТЬСЯ (гейти вже піймали 4 реальні блокери: D1 opt-in, R5 pan, R4 Mac-pinch, + поточні). Швидкість — через паралель, не через пропуск гейтів.
- Ліміт: rstest-порт contention між паралельними Codex — брифи вже мають retry; build:wasm (R11) — лише координатор.

## GATE 2 результати (паралельні)
- R2 GATE 2: RED (AC3 перф — interaction через structural sync() = повний rebuild на hover) → рев.2 per-slot imperative-refresh (FrameBackdrop-патерн), id↔NodeRef, dispose-unsubscribe. Re-check: dispatched.
- R3 GATE 2: RED (B1 обгортка не в D1-hover instanceof-гейті; B2 нема containment фабрики; N1 pool reconcile) → рев.2: інтерфейс InteractiveNodeView (генералізувати paintInteraction/bindInteraction), try/catch-fallback, mark-and-sweep. Re-check: dispatched. Багато confirmed-sound (selection/culling/D3/export).
- R11 GATE 2: ще біжить.
- R2 GATE 2 re-check: **GREEN** (AC3 per-slot imperative-refresh звучний; defense 5/5). → R2-A dispatched (пайплайн, не чекаючи R3/R11).
- R3 GATE 2 re-check: **GREEN** (B1 генералізація, B2, N1 закрито). Нотатки R3-B: (a) nodeRef приватний→прибрати з інтерфейсу; (b) розширити 3 instanceof +OrganizationNodeView +org-hover row9; (c) reconcile destroy у try/catch (у R3-A вже). → R3-A dispatched (pure, пайплайн).
- R2-A: PASS (44 тести). → R2-B dispatched (facade seam, серіалізовано).
- R11 GATE 2: RED (B1 цілив не в той роутер — A* OFF, хост на detour; B2 self-exclusion однорівнева) → рев.2: ціль A* (рішення власника dg31, host-visibility по A*-гейту = owner-review), containment-self-exclusion (KISS, без WASM), обгортки derive-в-Rust. Re-check: dispatched.
- R3-A: DONE (8 тести). → R3-B dispatched (InteractiveNodeView генералізація + фабрика-wiring; renderer, не фасад).
- R11 GATE 2 re-check: **GREEN** (B1 A*, B2 containment). → R11-A dispatched (Rust A* obstacles).
- R2-B: BLOCKED — overlay створює ХОСТ (App.ts:701), не фасад → брифова помилка. R2 план корекція (host-wired seam) + re-gate. R2-A цілий (44 тести).
- R2 план рев.2: overlay host-owned → R2-B=експонувати примітиви+USAGE, +R2-C-demo=App.ts wiring, AC3 уточнено (hover дешевий, selection як було). Re-gate R2: dispatched. R3-B ∥ R11-A кодяться паралельно.
- R3-B: BLOCKED — personInteractions.bind типізований PersonNodeView, HostNodeView не підходить. Авторизовано personInteractions.ts (import+:101+:147 → Container). Перезапуск.
- R2 re-gate (host-wired): **GREEN**. NB для R2-B: +публічні isSelected/isHovered, +mods-aware selectNode, USAGE-wiring. R2-B бриф переписано. → R2-B ∥ R11-A re-dispatch (frames-only).
- R3-B: DONE (77 тестів). R2-B: DONE (3 тести+4 мутації). Інтеграція: pkg typecheck+lint, повний сьют 185/1583/0.
- R11-A: BLOCKED — frames+6 тестів ✅, але 3 A*-інтеграційні expectation-failures (2× 0 перетинів де очік. 1 = МЕНШЕ перетинів; 1× tie-break h00/h01) у multi_source_parent.rs (поза скоупом). A*-специфічні (хост-detour не зачеплено). → незалежне судження improvement-чи-regression → rebaseline якщо покращення.
- Наступна хвиля паралельно: R3-C (facade nodeView) ∥ R2-C-demo (App.ts wiring) dispatched. + R11-judgment reviewer.
- R11-судження: **REBASELINE-OK** (рев'юер валідатором підтвердив: dept=0/marked=0, 0 over-exclusion, маршрути валідні; 3 зміни = покращення). Умови: коментарі 1&2, доля тесту 3 (turns-before-lex). → R11-rebase dispatched (Codex, тест-файл multi_source_parent.rs).
- R3-C: DONE (4 тести). R2-C-demo: DONE (1 тест). **R2 і R3 КОД-ПОВНІ.** Інтеграція: SDK 186/1587/0, demo 19/135/0, lint+check:docs ✅.
- Інтегровані рев'ю dispatched паралельно: R3 Std ∥ R3 Spec (генералізація D1-paint — ризик) + R2 combined. R11-rebase (Rust) паралельно.
- Рев'ю R2 combined: **GREEN** (6/6, per-slot red-if-deleted, рев'юер перепрогнав). Non-blocking: диф R2-файлів містить R3-зміни спільних facade/index/USAGE (серіалізовані правки) → коміт-гігієна: R2+R3 спільні файли комітити разом/per-hunk; demo kind:'position' ок.
- ЧЕКАЮ: R3 Std+Spec рев'ю, R11-rebase. Потім коміти R2+R3 (спільні facade/index/USAGE — один wiring-коміт або git add -p).
- Рев'ю R3 Std+Spec: **GREEN** (генералізація D1-paint семантично еквівалентна, default не регресує; 12/12 red-if-deleted). **R3 DONE — commit 173d676** (+ спільні facade/index/USAGE з R2-примітивами).
- **R2 DONE — commit 98f7ff1** (react overlay + demo wiring).
- **5/6 закомічено:** R1 b40118a, R5 0c78c32, R4 3550b86, R3 173d676, R2 98f7ff1. Лишилось R11 (combined-рев'ю йде → коміт staff_router.rs + multi_source_parent.rs).
- **R11 DONE — commit 9e8130c.** Рев'ю combined GREEN (0 findings). **6/6 ЗАКОМІЧЕНО.** Фінальна верифікація гілки: SDK 186/1587/0, demo 135/0, cargo 218+9, typecheck/lint/check:docs зелені. build:wasm НЕ потрібен (types.rs недоторканий). REPORT фіналізовано.
