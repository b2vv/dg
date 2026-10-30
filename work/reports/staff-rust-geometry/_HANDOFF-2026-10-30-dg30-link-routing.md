# HANDOFF — T126 R7 A4.2b → наступна сесія (dg30, 2026-10-30): паритет-блокер розібрано, рішення прийнято, далі — correct-link-routing

> ## 🔴 ПРАВИЛО №1: СЛІДУЙ ПЛАНУ/РІШЕННЯМ ВЛАСНИКА, БЕЗ ОТСЄБЯТІНИ. Неясно/конфлікт → спитай.
> ## 🔴 R6: критик ПЕРЕД зрізом → red-first → незалежний ревʼю ПІСЛЯ → гейти БЕЗ pipe → коміт лише з «го». Коміти `-F`. Українська. No-worktree.
> ## 🔴 Власник: дискусія субагентів на розвилках; інтерпретацію НЕ записувати як рішення; рахувати запущені vs повернуті числом.

Гілка **`feat/t126-staff-rust-geometry`**. Жива нота: Obsidian `1 - Notes/Sessions/2026-10-29 T126 R7 A4.2b wire-renderer.md`.

## ⚠️ ЧОМУ HANDOFF: session-guard (soft 5 МБ). Велика сесія: wiring + діагностика + дебати + рішення власника. Нічого НЕ закомічено. Baseline golden відновлено з git.

## ПЕРША ДІЯ СВІЖОЇ СЕСІЇ (явна вимога власника, тричі поверталися до теми — ЗАКРИТИ рішенням, не зациклитись):
**Підняти критиків/варіанти (саб-агенти, дебата) по ПІДХОДУ до реалізації correct-link-routing у Rust** під спеку ліній §3-§10. Приклади варіантів для дебати: (V-A) портувати мокап-алгоритм A* (shps-links.js, орто A* зі штрафом за поворот + коридори + доріжки + crossing-free) у Rust; (V-B) бібліотека ELK.js-стилю `edgeRouting:ORTHOGONAL` (спека §9 допускає, якщо задовольняє §5-§7) — але це TS/JS, не Rust, суперечить «одна істина в Rust» → оцінити; (V-C) доробити наявний Rust-detour (staff_routes.rs) до §10-критеріїв. Засіяти: спека + мокап + 3 скріни + діагностика + `_r7-link-rules-spec-to-rust-dg30.md`. Робочі файли диз'юнктні, append-протокол, ledger. Синтез оркестратором (не рубер-стемп) → власнику.

## ✅ РІШЕННЯ ВЛАСНИКА (dg30, фінальні):
1. **Staff = дерево ЗАРАЗ, matrix відкласти** (варіант A). Rust tree-only для staff ПРАВИЛЬНИЙ; `matrix→tree` у golden = бажана конвергенція, НЕ регрес. Staff-matrix → майбутня задача з розширенням Rust-контракту (координати членів). Демо-сцени: лишити tree або зняти координати.
2. **Matrix у СТРУКТУРІ ОРГАНІЗАЦІЇ (кейс #1) працює й лишається** — окремий шлях (`collapsedSiblingGrid`/`matrixGrid`/`orgMode`/`ploeg_layout.rs`, T113 локальне per-sibling-set), **A4.2b НЕ чіпає**. (Семантика #1: діти→matrix коли ВСІ collapsed; будь-яка розкрита→tree; майбутній «short» = одна розкрита + картка-лічильник, hover розсуває.)
3. **Правила link для staff — окремий функціонал, УЖЕ специфіковані** (не винаходити): спека `/Users/strelia/Downloads/mock2/Вимоги - Лінії зв'язку ШПС.md` §3-§10 + мокап `ШПС лінії зв'язку.html`/`shps-links.js` (A*). Еталон коректності = МОКАП + скріни + §10, НЕ TS (TS мав баги центрування, ADR-0002; §5 — SDK без споживача).
4. **Кешування координат** — бо ШПС має live edit-mode (зміна/перенос/вилучення нод, підпорядкування з переносом дітей, крос-деп head→child лінії, створення/видалення посад і депів). Rust-контракт має дозволяти інкрементальний перерахунок. Не блокер зараз, формує контракт. Пам'ять: `staff-edit-mode-and-incremental-geometry`.
5. **ціль routing = КОРЕКТНІСТЬ (§10), не byte-паритет до TS.** §10: 0 перетинів / 0 ближче 8px до картки / 0 під карткою/заголовком / детермінізм / перерахунок на collapse·resize·dates·avatar·data / ≤50ms на ≤500 посад.

## ROOT-CAUSE паритет-блокера (діагностика D1/D2, усі пивоти спот-чекнуті):
- **card_pad-гейт = БАГ проти спеки §5.1/§10.4:** Rust обходить картки лише при `content_padding>=8` (staff_layout.rs:1246, MIN_CARD_PAD=8) → лінки РІЖУТЬ картки (доведено staff-tree pos-lead). TS/спека — обхід БЕЗУМОВНИЙ. Прибрати гейт — ПЕРШИЙ об'єктивний фікс (але сам не достатній: відкриває Rust-detour, що ≠ §9 A*).
- **routing detour-модель (D2/D3):** Rust corridorY/side_detour + clearance-блокування (staff_routes.rs:417-482,573-583) vs мокап A*-коридори-доріжки. Rust не має aroundTop-примітиву. Треба довести до §10.
- **matrix (D2 Root#1):** `buildStaffLayoutInput.ts:226-231` викидає координати; `StaffPositionInput` (types.rs:324) їх не несе → matrix структурно недосяжний у Rust. ВИРІШЕНО: staff=tree now, matrix відкласти.
- **gojs detached-inference:** pos-sup/pos-vac TS=detached(side-column) vs Rust=tree; корінь не доведено до рядка (buildStaffLayoutInput.ts:218-222 report-фільтр / admin-parent map?) — допильнувати.
- Деталі: `_r7-a4-2b-PARITY-FAILURE-dg30.md` (root-cause), `_r7-a4-2b-diag-routing-dg30.md`, `_r7-a4-2b-diag-layout-dg30.md`.

## WIP (НЕ закомічено; typecheck EXIT=0):
- `packages/sdk/src/render/buildStaffDockHints.ts` (НОВИЙ) — reuse staffEdgeBoxForPosition, effective-size, superset, edgePort=center→skip.
- `packages/sdk/src/render/adaptStaffGeometry.ts` (фікс readonly cards на :111).
- `packages/sdk/src/render/buildStaffLayoutInput.ts` (export `resolveMetrics` + `capExpandedChildren`).
- `packages/sdk/src/render/staffLiveGeometry.ts` (переписано на Rust-стек; `departmentWrapperPadding` export; прибрано `input.canvas`/FORK2).
- `packages/sdk/src/OrgHierarchyDiagram.ts` (FORK2: прибрано pre-compute staffCanvasResult + 3 imports).
- `packages/sdk/src/render/DiagramRenderer.ts` (прибрано param staffCanvasResult крізь render→renderStaff→renderStaffCanvas).
- `packages/sdk/src/export/svgExport.parity.test.ts` (прибрано canvas-ін'єкцію; тепер крос-pipeline svg-OLD vs live-Rust — ПАДАЄ бо premise «SAME CANVAS» зламано; svgExport wiring = A4.3; розглянути skip до A4.3 АБО вести як finding).
- Кроки Коміту B НЕ зроблені: parity-unit (крок 2) не писався; golden НЕ rebaselined.

## ВІЗУАЛЬНИЙ ЕТАЛОН (скріни ~/Desktop, власник вказав):
- `Screenshot 2026-10-28 at 13.13.21.png` — ЦІЛЬОВИЙ dg-рендер (дерево, deptTop-вхід, штрих від керівної орг).
- `Screenshot 2026-10-28 at 13.13.11.png` + `...13.13.08.png` — МОКАП `ШПС лінії зв'язку.html` з панеллю приймання §10.4 (0 перетинів/0 накладань/0 через картки/0 ближче 8px/0 через чужі деп · 50 зв'язків · 196 мс) + підсвічування обраної посади. Агент браузер НЕ бачить (нема прав) — еталон зі скрінів+мокап-коду+спеки.
- Мапінг спека→Rust→дія: `_r7-link-rules-spec-to-rust-dg30.md`. Синтез дебатів паритету: `_r7-a4-2b-SYNTHESIS-dg30.md`.

## ЧЕРГА (після correct-link-routing):
R2 detached-fix → R3 візуальний гейт проти мокапу (власник відкриває браузер або дозволяє сервер — агент не має прав на file://) → R4 rebaseline golden на коректний Rust = одна істина → A4.3 svgExport на Rust-стек → A4.4/A4.5 cleanup (canvas.tiers/StaffCanvasResult/Seam A) → staff-matrix (майбутнє) → edit-mode/кеш-контракт. Брифінг CTO-RESEARCH освіжити (§5 вже звірено: SDK без споживача).

## Межі: українська · коміт/пуш лише з «го» · `-F` · no-worktree · тести БЕЗ pipe (>log+$?) · Rust не судиться Pocock · критик+ревʼю щозріз · session-guard: explicit handoff ID.
