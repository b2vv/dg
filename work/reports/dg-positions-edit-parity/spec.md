# spec — SDK subordinate-counts (A) + node-sugar accessor (B)

> Дві суміжні фічі в одному циклі (рішення власника 2026-11-05): A = SDK **рахує** лічильники;
> B = вузловий accessor `node.getData()/getState()` щоб **дешево читати** поля однієї посади.

> spec-flow крок 2 (WHAT/WHY). Поріг: **спрацював** — зміна робить `childrenCount`/`allDescendantCount`
> SDK-computed output = зміна публічного API SDK (`docs/USAGE.md`). Артефакти-дім:
> `work/reports/dg-positions-edit-parity/`. Жива нота: `_wip-subordinate-counts.md`.
> Рішення власника 2026-11-05: «Library must calculate count of children and descendants. Because code
> for calculations into cassiopeia this is legacy.»

## Problem
Лічильники підлеглих посади (скільки прямих підлеглих `N` і всіх нащадків `M`, футер картки `N [M]`)
зараз рахує **хост** (cassiopeia, мапер `position-tree-to-dg-diagram.ts:101-105`) і передає в SDK як
host-input поля `childrenCount?`/`allDescendantCount?` на `DiagramPosition`. Це **legacy GoJS-походження**:
кожен хост-споживач SDK мусив би дублювати цей обхід дерева, а числа на картці (малює SDK) і в сайдбарі
(рахує хост окремо) можуть розійтися — що й ловить парити-біндінг `positions-subordinate-count-card-
sidebar-parity` (зараз сайдбар показує 0, бо `DgTreeDiagramEngine.subordinateCounts` повертає null).

Логіка обходу staff-дерева належить бібліотеці (канон «бібліотека володіє логікою»; геометрія/логіка — в
ядрі). SDK уже будує те саме дерево (BFS від голови вздовж admin-reportLines, `positionExpand.ts:49`), тож
має рахувати ці числа сам — один авторитетний source, і хост дропає legacy-calc.

## User scenarios
1. **Хост малює ШПС і читає лічильники.** Хост передає `setData(DiagramData)` БЕЗ `childrenCount`/
   `allDescendantCount`. SDK рахує їх зі staff-дерева. `getData()` повертає позиції з заповненими полями.
   Футер картки `N [M]` і сайдбар (що читає з `getData()`) показують однакові числа → parity.
2. **Посада-лист.** Посада без підлеглих: `childrenCount=0`, `allDescendantCount=0` (НЕ `undefined`) —
   щоб сайдбар показував «0», а не порожнє, і щоб картка свідомо не малювала футер для листа (поточна
   поведінка: лист без полів → без футера; треба зберегти або свідомо змінити — див. Open questions).
3. **Перехід (host legacy ще шле числа).** Хост поки передає свої `childrenCount`/`allDescendantCount`.
   SDK-обчислене має **збігатися** з host-обчисленим для тих самих даних (однакове дерево → однакові
   числа). Коли SDK-порт готовий — хост синхронно дропає свій calc (координація з Cass-1).
4. **Корінь/голова.** Голова org (`isHead`) має `childrenCount` = прямі admin-підлеглі, `allDescendantCount`
   = всі в staff-піддереві org.

## Acceptance criteria
- **AC1.** Після `setData` з валідним ШПС і БЕЗ host-counts, `getData().positions[i]` має числові
  `childrenCount`/`allDescendantCount` для кожної посади **з ≥1 прямим admin-підлеглим**; лист (0 підлеглих)
  → поля **undefined** (НЕ 0), щоб футер картки лишався прихованим (гейт на присутності поля). [OQ2→undefined]
- **AC2 (семантика прямих, ПО ВСІХ КОРЕНЯХ).** `childrenCount(p)` = к-сть вихідних admin-reportLines від `p`
  (`kind='admin'`, `fromId===p.id`), у межах org `p`. 🔴 Рахується для **КОЖНОЇ** посади, НЕ лише досяжних
  від голови: непідпорядковані корені (UnlinkedPositionRoot) — окремі admin-дерева в тих самих
  positions/reportLines, і вони мають свої лічильники (Cass-1, host walk усіх roots). Крізь org-межу НЕ рахує.
- **AC3 (семантика транзитивних).** `allDescendantCount(p)` = розмір admin-піддерева під `p` (усі транзитивні
  admin-нащадки, БЕЗ самої `p`), у межах org, для кожної посади незалежно від досяжності від голови.
- **AC4 (parity з host-еталоном).** admin-reportLines SDK === host `node.children` **за побудовою**
  (Cass-1: мапер `position-tree-to-dg-diagram.ts:54-63` кладе кожну пару parent→child рівно в одне
  admin-ребро, інших admin-ребер нема). Тест: SDK-числа === host `node.children.length`/`countDescendants`
  для відомого дерева, включно з непідпорядкованим коренем.
- **AC5 (precedence).** SDK **ЗАВЖДИ перераховує й перезаписує** `childrenCount`/`allDescendantCount`,
  навіть якщо host їх передав (host=legacy; один авторитетний source). [OQ1→overwrite]
- **AC6 (парити картка↔getData).** Число футера картки (`orgCardChrome.ts:14`) і число в `getData()` для
  тієї ж посади — ідентичні (один source). Лист: картка без футера, сайдбар `?? 0` → 0 (узгоджено).
- **AC7 (публічний API задокументовано).** `docs/USAGE.md` описує, що SDK обчислює ці поля і хост читає з
  `getData()`; check:docs зелений (конституція).
- **AC8 (failure/edge).** Цикл admin-reportLines (A→B→A) чи дубль-ребро не вішає обхід і не дає
  нескінченність; посада без org / з невідомим org не валить setData.

## Feature B — node-sugar accessor (node.getData() / node.getState())
### Problem (B)
Щоб дістати поля однієї посади (зокрема нові A-лічильники) у node-click колбеку, зараз треба
`diagram.getData()` = `structuredClone` УСІЄЇ сцени (docblock ~7.6мс на 4000 місць). А сам колбек
`onNodeClick(node: NodeRef, …)` (`callbacks.ts:119`) дає лише легкий `NodeRef {kind,id}` — без доступу
до даних/стану вузла. Власник (дослівно): «you can added sugar for node… node.getData() or node.getState()».

### User scenarios (B)
5. **Клік на вузол → дані.** У `onNodeClick` хост бере `node.getData()` → поля ЦІЄЇ посади/org
   (включно з `childrenCount`/`allDescendantCount` з фічі A), **без** клону всієї сцени.
6. **Клік на вузол → стан.** `node.getState()` → поточний інтеракційний стан вузла
   (selected / hovered / expanded / collapsed).

### Acceptance criteria (B)
- **AC9 (per-node data).** Існує вузловий accessor, що віддає дані ОДНІЄЇ посади/org за ref, БЕЗ
  `structuredClone` всієї сцени (читає з `this.data` за id). Для позиції повертає ті самі поля, що й
  `getData().positions[i]`, включно з A-лічильниками.
- **AC10 (per-node state).** Accessor віддає `getState()` = `{selected, hovered, expanded, collapsed}`
  (з `viewState`/interaction-стор), узгоджено з тим, що малює сцена.
- **AC11 (доступ із node-click).** Accessor досяжний зі шляху node-click (власник: «node click event»).
  Форма доставки (enrich колбек-аргумент / factory `diagram.node(ref)` / новий тип) — рішення plan,
  але має бути **additive** до публічного API, де можливо (конституція: не ламати мовчки).
- **AC12 (публічний API задокументовано).** `docs/USAGE.md` описує node-accessor; check:docs зелений.

## Out of scope
- **Org-лічильники** (`DiagramOrganization.childrenCount/allDescendantCount`) — лишаються host-input у цій
  ітерації (#2 про ПОСАДИ/ШПС). Окреме рішення, якщо треба.
- **Host-side зріз** (сайдбар читає з getData, дроп host-calc) — лейн Cass-1 (host-репо), не цей SDK-порт.
- **Матрична/dotted звітність** — лічильники по admin-дереву (як host), не по matrix/dotted ребрах.
- Зміна візуалу футера, крос-org агрегація, кешування понад один setData-цикл (якщо не знадобиться в plan).

## Open questions — ВСІ ЗАКРИТІ (GATE 1, 2026-11-05)
1. ✅ **Precedence** → SDK ЗАВЖДИ перераховує й перезаписує (власник). AC5.
2. ✅ **Лист** → `undefined` (не 0); футер гейтиться на присутності поля → для листа не малюється
   (власник + Cass-1: host теж undefined). AC1/AC6.
3. ✅ **Збіг SDK-дерева з host** → (а) admin-reportLines === host node.children ЗА ПОБУДОВОЮ (Cass-1,
   `position-tree-to-dg-diagram.ts:54-63`). + 🔴 пастка: рахувати по ВСІХ коренях, не лише від голови
   (UnlinkedPositionRoot). AC2/AC3/AC4.
4. ⏭ **Де рахувати й коли** → у plan.md (рекомендація: pure в `core/logic` TS з admin-reportLines-графа,
   виклик на setData, кеш у this.data; межу WASM↔TS не чіпає).

GATE 1 (shared understanding): задоволено прямим підтвердженням власника (precedence, лист) +
верифікацією host-експерта Cass-1 (семантика дерева, all-roots пастка). Формальний grilling не запускався —
відкриті питання розв'язані джерелами напряму; зафіксовано в живій ноті.
