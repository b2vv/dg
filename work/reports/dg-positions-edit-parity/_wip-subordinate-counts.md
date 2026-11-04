# WIP — трек B #2: subordinate-counts у SDK (жива нота)

Старт 2026-11-05. Власник схвалив #2 (рахує dg/SDK, не хост). Послідовність (рішення власника):
**спитати Cass-1 host-контракт → потім spec-flow.**

## Орієнтація dg-side (зроблено)
- Поля `childrenCount?`/`allDescendantCount?` УЖЕ в типах: `DiagramPosition` (data/types.ts:169,171)
  і `DiagramOrganization` (data/types.ts:38,40).
- Картка вже рендерить: `render/orgCardChrome.ts:14` → `${childrenCount ?? 0} [${allDescendantCount ?? 0}]`
  (і для org :5-6). `?? 0` ⇒ зараз це **host-input** (опційні), а рішення — **рахує SDK**.
- Отже задача: SDK ОБЧИСЛЮЄ counts з admin-reportLines і віддає так, щоб картка й сайдбар хоста
  читали ОДНЕ джерело (parity-біндінг `positions-subordinate-count-card-sidebar-parity`).
- Це дотик до публічного API → потрібен spec-flow + `docs/USAGE.md`.

## ДАЛІ: чекаю host-контракт від Cass-1 [b223aa]
Надіслано 2026-11-05 (msg c780eda9). 4 питання: (1) форма віддачі (populate getData vs accessor);
(2) де сайдбар читає (host-файл:рядок parity); (3) семантика children=прямі/all=транзитивні,
в межах org чи крізь; (4) пойнтер на reports/dg-positions-edit-parity/.
Коду SDK НЕ чіпаю до контракту.

## ⚠️ ПЕРЕВОРОТ — відповідь Cass-1 (2026-11-05): #2 НЕ потребує коду SDK
Cass-1 (host-репо, HEAD e55fd8a7a, читання коду): **посилка handoff була хибною. Хост УЖЕ рахує й
передає лічильники в SDK.**
- Host-мапер заповнює поля: `src/modules/positions/lib/position-tree-to-dg-diagram.ts:101-105`
  (childrenCount=node.children.length; allDescendantCount=countDescendants, :134-140). Листу не дає.
- Розрив ЛИШЕ на сайдбарі хоста: `DgTreeDiagramEngine.subordinateCounts` повертає null
  (`dg-tree-diagram.engine.ts:383`, docblock :375-381 застарів). Ланцюг: `use-positions-diagram.ts:534`
  → `positions-canvas.view.tsx:368` → drawer → `position-detail-panel-data.ts:153/183` (`?? 0`).
- Еталон GoJS (`gojs-tree-diagram.engine.ts:1021`): читає числа ЗІ СВОЇХ node-даних, без 2-го підрахунку.
- Звіт `reports/dg-positions-edit-parity/2026-11-04-gojs-edit-mode-vs-dg.md` §3 рядок #8 — ТЕЖ застарів.

**Емпіричне підтвердження з dg-side:** картка вже малює числа хоста (`orgCardChrome.ts:14` читає
`position.childrenCount`), отже поля проходять `setData→render` без втрат → `getData()` (клон this.data)
їх теж має. SDK-порт УЖЕ достатній.

**Висновок:** #2 = **host-only фікс** (малий зріз у `dg-tree-diagram.engine.ts:383` — читати лічильники,
що SDK уже несе, як GoJS). Від SDK — НУЛЬ коду. Рішення «рахує dg» ухвалене на хибній посилці Cass-1.

## ✅ РІШЕННЯ ВЛАСНИКА 2026-11-05 (override Cass-1): БІБЛІОТЕКА РАХУЄ
Дослівно: «Library must calculate count of children and descendants. Because code for calculations into
cassiopeia this is legacy.» Тобто host-обчислення (`position-tree-to-dg-diagram.ts:101-105`) — **legacy
GoJS-походження**, має бути замінене SDK-обчисленням. #2 знову SDK-робота, але на ПРАВИЛЬНІЙ посилці:
не «хост не вміє», а «логіка належить бібліотеці» (канон «бібліотека володіє логікою»; пам'ять
scope-by-desired-behavior, rethink-gojs-origin-workarounds).

**Скоуп SDK:** для кожної ПОСАДИ обчислити з staff-дерева (admin-reportLines, BFS від голови —
`positionExpand.ts:49`): childrenCount = прямі admin-report діти; allDescendantCount = транзитивні.
У межах одного org (host-семантика, крізь org не рахує). Поля стають **SDK-computed output**, а не
host-input. Хост після цього дропає legacy-calc і читає з getData() (як GoJS-еталон читає зі своїх даних).

**Відкриті для spec:** (1) precedence — SDK завжди перераховує, чи поважає host-передане? (власник:
host=legacy → SDK авторитетне; транзитивно хост ще шле, доки не прибере); (2) org childrenCount/
allDescendantCount (DiagramOrganization теж має ці поля) — у скоупі #2 чи лише позиції? (#2 про посади);
(3) де рахунок — pure в `core/logic` з reportLines-графа; коли (на setData, кеш до наступного setData).

## spec-flow прогрес
- Гілка `feat/sdk-subordinate-counts` (без worktree). Поріг спрацював (публічний API).
- **spec.md написано** (`work/reports/dg-positions-edit-parity/spec.md`), 8 AC.
- **GATE 1 задоволено** (2026-11-05): усі 4 OQ закриті джерелами напряму:
  - OQ1 precedence → SDK ЗАВЖДИ перераховує/перезаписує (власник).
  - OQ2 лист → undefined (не 0), футер прихований (власник + Cass-1).
  - OQ3 дерево → admin-reportLines === host node.children ЗА ПОБУДОВОЮ (Cass-1,
    position-tree-to-dg-diagram.ts:54-63). 🔴 **all-roots пастка**: рахувати admin-піддерево КОЖНОГО
    вузла, не лише від голови (UnlinkedPositionRoot мають свої числа).
  - OQ4 де/коли → у plan.
- Формальний grilling не запускався — OQ розв'язані джерелами; зафіксовано.

## ФІЧА B додана (рішення власника 2026-11-05): node-sugar accessor
Дослівно: «you can added sugar for node… node click event, node.getData() or node.getState()». Вписано
в ЦЕЙ plan (не окремо). spec AC9-12. Сьогодні `onNodeClick(node: NodeRef{kind,id}, …)` (callbacks.ts:119)
— без методів. B: accessor віддає дані однієї посади (вкл. A-лічильники) без structuredClone сцени
(getData ~7.6мс/4000) + getState {selected,hovered,expanded,collapsed}. Форма доставки → plan (additive).

## ✅ plan.md написано (крок 4) — рішення зафіксовані
- A: pure `core/subordinateCounts.ts` (Map, по всіх коренях, visited-set, лист не в Map, cross-org guard);
  виклик у setData (перезапис) + appendData (щоб не stale).
- B: additive `diagram.getNode(ref)` → `{getData, getState}` (shallow-clone одного обʼєкта, не сцени).
- Side-effects/migration/rollback розписані. Acceptance-таблиця S1–S9 → AC. Констит-чек інлайн ✅.

## 🔄 GATE 2 ЗАПУЩЕНО (gate-reviewer Opus 4.8, свіжий контекст)
plan-critique + plan-defense + конституція на spec+plan. Робочий файл `_gate2-review.md`. Чекаю вердикт.
Після GREEN → код через `codex exec` (сам, не сабагент, не --worktree; Claude рев'юнить+верифікує, не вірить
чужому зеленому). Codex доступний (0.163.0).

## Наступне (після GATE 2 GREEN): implement via codex exec
Промпт Codex: spec + plan-рішення + TDD (success+failure) + точні анкери. Я прожену тести сам
(`npm test -w @org-hierarchy/sdk`, НЕ npx rstest) + code-review дифу. Потім USAGE.md (AC7/AC12) + check:docs.
