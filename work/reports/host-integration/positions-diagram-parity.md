# Функціональне порівняння — positions diagram: GoJS (cassiopeia-admin-ui) vs `@org-hierarchy/sdk`

**Дата:** 2026-09-06 · **Скоуп:** штатно-посадова структура (`src/modules/positions/**`), режим
перегляду **і** редагування — на відміну від org diagram, це **один компонент, один рушій, дві
гілки поведінки**, не два монтажі (`positions-canvas.view.tsx:214-229` вирішує гілку прапорцем
`editable`).

**Хост:** `~/projects/cassiopeia/cassiopeia-admin-ui`, гілка `main`,
`cc954772ee4ffb8214157a6901d7511090c7b930`, 2026-09-06 18:52 — на ~1 годину новіше за зріз
`questions.md` (`f7b037e07`, 17:58 того ж дня); файли `positions/**`, які тут цитуються, за цей
проміжок не мінялись (перевірено читанням, не діффом commit-to-commit).

**Метод:** той самий, що й у [`org-diagram-parity.md`](./org-diagram-parity.md) — читання коду
обох репо, `path:line`, вердикт `є`/`немає`/`N/A` без оцінки важливості.

---

## Підсумок

Позиційна канва виявилась **набагато ближчою до SDK, ніж органічна**: багато полів
`DiagramPosition` явно закоментовані з посиланням на GoJS-концепт, який вони відтворюють
(`pending — hourglass marker (GoJS, distinct from isTemporary)`, `periodStart/End — E7 chip`,
`isKeyPosition — brand stroke (GoJS)`) — тобто модель даних уже проєктувалась із цим хостом
в умі, а не знята з нуля.

🔑 **Найбільша знахідка сесії, поза початковим запитом:** positions-канва хоста **теж** має
матрицю схлопнутих сиблінгів (той самий "spine"-модуль, що й в org) — `T113` у нашому репо
описаний лише як org-дефект, а стосується **обох** діаграм. Task-файл варто скоригувати окремо
від цього звіту.

🔴 **Реальний гап:** SDK не захищає `isHead`-посаду (кореневу) від reparent — `checkReparent`
(`interaction/positionReparent.ts:44-60`) відмовляє лише на self/цикл/no-op/unknown-id; хост
натомість типізує корінь (`HierarchyRoot`) і структурно вимикає move/merge/delete для нього
в меню. Другий гап того ж калібру: **move (cross-org)**, **merge** і **clone structure** — три
дії, які хост комітить одразу поза draft-чергою (і навмисно не в undo) — не мають жодного
відповідника в SDK: `reparentPosition`/`movePersonToCell`/`shiftBlock` — це рівно одна посада за
раз, у межах наявної структури.

**Що вже покрито іншими задачами й не дублюється тут:** дев-міст `window.__orgHierarchy` →
[`T115`](../../tasks/T115-test-seam-parity-with-host.md); матриця сиблінгів → `T113` (з
поправкою вище); grid/wrappingColumn і viewport-як-вхід → `questions.md` §11, §C (9-11).

---

## Спільне (view + edit)

### Читання / навігація

| # | GoJS | dg SDK | Вердикт |
|---|---|---|---|
| 1 | Спільний рушій `GoJsTreeDiagramEngine`, інший adapter — `use-positions-diagram.ts:149-153` | Аналогічно: staff-режим того самого `OrgHierarchyDiagram`, окрема сім'я layout-функцій `layout/staff/**` (`docs/USAGE.md` §7 «два сімейства сцен») | **є** |
| 2 | `reveal`/фокус на посаду (search-like з filter-row), авто-фокус на deep-link — `use-positions-diagram.ts:308-310`, `positions-canvas.view.tsx:263-268` | `revealPath(nodeId)` (`OrgHierarchyDiagram.ts:1419-1449`) — узагальнений: резолвить organizationId для будь-якого id (позиція/людина/org) через `resolveOrganizationIdForNode`, розкриває org-ланцюг, фокусить сам вузол. Той самий метод, що й для org | **є** |
| 3 | Root-centering двічі (сирий тайл, потім після приходу tier-блоків), щоб не збити viewport при ребілді моделі — `use-positions-diagram.ts:308-336` | Немає прямого аналога-механізму — але і немає причини: viewport/selection/expansion у SDK живуть поза рендером (той самий структурний аргумент, що в org-звіті §Node visual, п.18), тож ребілд моделі не «збиває» камеру за побудовою | **N/A** — GoJS-специфічна латка на клас бага, якого SDK не має |
| 4 | Export PNG, та сама механіка, що й org — `use-positions-diagram.ts:338-349` | `export({scope, ...})` (`export/exportDiagram.ts:24-35`) — та сама точка входу, що й для org | **є** |
| 5 | «Додати непідпорядковані посади» — client-only reveal з модалки списку, переживає view↔edit навігацію (стан у layout shell, не в канві) | Немає вбудованого «списку непідв'язаних» — але й концепції «непідв'язана посада» як окремого списку в даних немає: SDK бачить лише те, що прийшло `setData`/`appendData`. Показ такого списку — суто хостовий стан, як і сьогодні (стан живе в layout shell хоста, не в GoJS) | **N/A** — той самий поділ відповідальності, що вже є |
| 6 | Перемикач структури активна/історична — `positions-canvas.view.tsx:293-305` | Немає перемикача-як-фічі — але й не потрібен: хост запитує BE за потрібною версією й віддає `setData()`, SDK рендерить будь-який знімок без різниці | **є, структурно** — той самий контракт, що org-timeline у попередньому звіті |

### Виділення

| # | GoJS | dg SDK | Вердикт |
|---|---|---|---|
| 7 | Одинарний select, **без** bulk і без модифікаторів — `use-positions-diagram.ts:157-166` (на відміну від org, де bulk є) | `select`/`selectMany`/`toggleSelection` (`OrgHierarchyDiagram.ts:1385-1403`) працюють для будь-якого `NodeRef`, зокрема `kind: 'position'` — bulk-select **технічно вже є**, host GoJS positions-канва просто не будує його UI | **є (ширше)** — SDK не звужує можливість там, де хост сьогодні звужує сам |
| 8 | Клік по фону знімає виділення | Той самий патерн (`clearSelection`) | **є** |

### Панелі

| # | GoJS | dg SDK | Вердикт |
|---|---|---|---|
| 9 | `PositionDetailDrawer`: ім'я/категорія/кількість підлеглих/чіп «ОР»/поточний+попередні holders/кнопка «відкрити сторінку» — `position-detail-drawer.tsx` | `onNodeClick`/`onSelectionChange` + повна `DiagramData` — той самий обсяг даних, панель малює хост в обох варіантах (той самий висновок, що для org-сайдбару) | **N/A** — UI над даними, не рушій |

### Візуал вузла

| # | GoJS | dg SDK | Вердикт |
|---|---|---|---|
| 10 | Timeline-чіп на картці: «27.06.2018 • по т/н», bind на `timeline`-поле — `positions.adapter.ts:54-82` (точковий показ, **не** скрабер — інший механізм за org) | `periodStart`/`periodEnd`/`periodLabel` на `DiagramPosition`, коментар прямо каже «E7 chip» (`data/types.ts:129-131`) | **є** — поле спроєктоване саме під цей чіп |
| 11 | Аватар з placeholder-плашкою під фото — `positions.adapter.ts:120-143` | `media?: ThemedMedia` на `DiagramPosition` + `media/placeholders.ts` (`mediaPlaceholders`) — той самий патерн, що й в org | **є** |
| 12 | Brand-колір імені для key positions/командира — `positions.adapter.ts:145-176` | `isKeyPosition?: boolean`, коментар «Key position — brand stroke + name color (GoJS)» (`data/types.ts:132-133`); рендер — `render/PersonNode.ts:394,517` | **є** |
| 13 | DASHED рамка — detached/unlinked позиції — `positions.adapter.ts:94-96` | `detached?: boolean` на `DiagramPosition` (`data/types.ts:105-110`, host-hint + layout-inference); рендер — `[5,3]` dashed overlay, `render/PersonNode.ts:392,445-447` | **є** |
| 14 | Pending/temporary-holder — бурштиновий пісочний годинник top-right — `positions.adapter.ts:179-193` | `pending?: boolean`, коментар «Pending assignment — hourglass marker (GoJS, distinct from isTemporary)» (`data/types.ts:134-135`); рендер amber `0xf59e0b`, `render/personCardContent.ts:163-175` | **є** — той самий колір, той самий намір |
| 15 | Count badge `N [M]` знизу, окремий EXPANDER-хіттест (guard від node-click) — `positions.adapter.ts:198-234` | `childrenCount`/`allDescendantCount` (`data/types.ts:127-128`); expander — окремий hit-test із `stopPropagation`, той самий патерн, що в org (`render/personCardContent.ts:211-222`) | **є** |
| 16 | Матриця схлопнутих сиблінгів — `makeGroupTemplate`+`MatrixGroupLayout`, `positions.adapter.ts:271-307` | Див. «Підсумок» — той самий T113-концепт, тепер підтверджено й тут | **див. T113 (уточнити скоуп)** |
| 17 | Декларовані контейнери (tree для департаменту, grid `wrappingColumn:4` для fallback-бакета) — `positions.adapter.ts:324-341,361-398` | `layout/staff/orgBlockLayout.ts` + `layout/matrixGrid.ts` (`ceil(√n)` дефолт) — та сама розвилка tree/grid уже розібрана в `questions.md` §11 | **див. questions.md §11** |
| 18 | «Подвійна посада» — зовнішній **підлеглий** з іншої org у leadership-блоці, довантажується окремими `/positions/{id}` — `use-positions-diagram.ts:245-286` | `externalManagersFor` (`layout/staff/externalManagers.ts:1-40`) пришпилює зовнішнього **керівника** над блоком через `reportLines` (T91 GATE 3) | **є (дзеркальний напрямок)** — SDK покриває «керівник ззовні», хост-фіча — «підлеглий ззовні»; той самий механізм (pin card + `admin`-report за межі org), протилежний бік стрілки |
| 19 | Тема — live re-skin без rebuild — `engine.applyTheme(mode)`, `use-positions-diagram.ts:213-215` | `setTheme()` міняє theme-key і перемальовує без rebuild темплейтів (`OrgHierarchyDiagram.ts:1074-1078`) — той самий висновок, що в org-звіті | **є** |
| 20 | Іконка/фото інвалідується по file-id при переуплоуді — `use-positions-diagram.ts:203-208` | `MediaService` кешує за `mediaCacheKey(url, revision)` (`media/MediaService.ts:80-104`) — інвалідація за ревізією, не за file-id, але той самий намір («нові байти під тим самим іменем не залипають») | **є (інший ключ кешу)** |
| 21 | Лінк: orthogonal routing, `selectable:true`, але **без** `onLinkClick`-хендлера (0 збігів) | `NodeRef` не має kind для зв'язку — той самий висновок, що в org-звіті: SDK теж не має події кліку по ребру | **немає (обидві сторони)** — на відміну від org, тут це не регресія: хост сам цим не користується |

---

## Лише VIEW

| # | GoJS | dg SDK | Вердикт |
|---|---|---|---|
| 22 | 3-ярусна розкладка (tier1 leading + tier2 department containers + tier3 subordinate blocks), пласке дерево в edit — `positions-canvas.view.tsx:214-229` | Уже розібрано: `questions.md` §B8 підтверджує прецедент («розкладка повертається до попередньої»), а сама відповідність — предмет `T113`/плану виконання «вьюпорт як вхід у лейаут» (`questions.md` §C) | **окремо не дублюється тут** — покрито наявним планом |
| 23 | Кнопка «Редагувати» (verificator-гейт) → навігація на edit-роут | Режим/роут — хостова відповідальність (SDK не знає про URL); гейт прав — теж хостовий у GoJS-варіанті так само | **N/A** |

## Лише EDIT

| # | GoJS | dg SDK | Вердикт |
|---|---|---|---|
| 24 | Контекстне меню, 9 пунктів: add-subordinate, edit, merge, move, delete, open-page, add/edit/remove-holder — `build-position-menu-items.tsx:61-131`; **root захищений** від move/merge/delete | `onContextMenu` дає той самий каркас (кастомний `MenuItem[]`), дефолт мінімальний (`interaction/contextMenu.ts:20-28`) — доменні пункти пише хост в обох варіантах. **Але захисту кореня немає**: `checkReparent` не знає про `isHead` (див. «Підсумок») | **є (каркас) / немає (root guard)** — розділено навмисно, це дві різні речі |
| 25 | Drag-reparent → `movePosition` — `use-positions-diagram.ts:174-179` | `reparentPosition(positionId, managerId)` (`OrgHierarchyDiagram.ts:1664-1680`), той самий однопосадовий reparent, guard на self/цикл (`interaction/positionReparent.ts`) | **є**, мінус root-guard вище |
| 26 | SaveBar: dirty/isSaving, undo/redo LIFO над draft-чергою — `positions-canvas.view.tsx:369-389` | SDK не має чернетки/save-черги — кожен мутатор (`reparentPosition` тощо) застосовує й комітить одразу, `onLayoutChange` летить після намальованого кадру (`docs/USAGE.md` §9). Draft/undo/dirty-стан — хостова відповідальність, як і сьогодні (host уже будує це поверх одиничних GoJS-подій) | **N/A** — той самий поділ праці, задокументований і для seat-collision (`work/reports/seat-collision/plan.md` §5, п.15) |
| 27 | «Створити посаду» (новий top-level) | Немає мутатора-«creator»: SDK не створює вузли, host додає в свою модель і кличе `setData`/`appendData` — той самий контракт, що й у GoJS (рушій теж нічого не створює сам) | **N/A** |
| 28 | «Скасувати» (discard), двокроковий вихід з відомою гочею мовчазної відмови — `questions.md` §B7 | Не діаграмна відповідальність — це хостовий roundtrip чернетки | **N/A** |
| 29 | 🔴 «Move» (cross-org перенос), «Merge», «Клонувати структуру» — три дії, що комітяться одразу поза draft-чергою й **не** входять у undo (`use-positions-editing.ts:40`) | Немає жодного відповідника: `reparentPosition`/`movePersonToCell`/`shiftBlock` — рівно одна посада, у межах уже наявної структури. Ні bulk cross-org move, ні merge двох структур, ні clone субдерева | 🔴 **немає** — див. «Підсумок» |
