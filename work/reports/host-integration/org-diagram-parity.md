# Функціональне порівняння — org diagram: GoJS (cassiopeia-admin-ui) vs `@org-hierarchy/sdk`

**Дата:** 2026-09-06 · **Скоуп:** лише org diagram (`OrgHierarchyCanvas`/`OrgHierarchyTabView`,
`work/reports/host-integration/questions.md` §E16-17). Positions (view/edit) — окремий прохід,
не тут.

**Метод:** ліва колонка — цитати з `questions.md` §E16-17 (host, гілка `main`@`f7b037e07`,
2026-09-06, вже перевірені й не звірялись повторно). Права колонка — читання коду
`packages/sdk/src` цієї сесії, `path:line`.

**Вердикт:** `є` / `немає` — бінарно, без оцінки важливості (навмисне рішення: важливість
вирішує той, хто читатиме звіт і заводитиме тікети). Третя мітка `N/A` — там, де GoJS-фіча не є
відповідальністю **рушія** діаграми в жодному з двох варіантів (форми, UI-панелі над даними,
браузерний fullscreen): і сьогодні, і з SDK це пише хост, порівнювати нема чого.

---

## Підсумок

🔴 **Найбільша знахідка: у SDK немає org-level drag-reparent.** `LayoutPatch` (`callbacks.ts:6-25`)
має шість варіантів, і жоден не переносить організацію під нового батька — `position-reparent`
існує лише для посад (T91). GoJS-хост має цю дію в контекстному меню й через drag (`:109`
у `org-hierarchy-canvas.view.tsx`, за `questions.md` §E16). Якщо перехід на SDK планується
з наміром зберегти цю дію — це нова фіча, не перенесення.

Решта: **дев'ять «є» з повною або майже повною відповідністю**, **чотири «немає»** (fullscreen,
click-по-зв'язку, country-панель, і сам org-reparent вище), **дві «немає» структурні** (мережеві
фільтри — не регресія, той самий контракт «SDK не ходить у мережу»), **шість `N/A`** (форми,
UI-панелі, підказки жестів — хостовий код в обох варіантах).

---

## Reading / navigation

| # | GoJS (`questions.md` §E16) | dg SDK | Вердикт |
|---|---|---|---|
| 1 | Ледаче дерево, розкриття по кліку на вузол/органічний `initialDepth` 1-2 | `organizations[].collapsed` (`data/types.ts`) + `expandOrg`/`collapseOrg`/`setOrgsCollapsed`/`collapseAllOrgs` (`OrgHierarchyDiagram.ts:913-981`) | **є** ⚠️ інший механізм: GoJS читає число-глибину при монтуванні, dg читає булеве поле на кожній org — хост сам рахує, які orgs стартують згорнутими, параметра «глибина» немає |
| 2 | Експандер — **не** node-click (окремий шлях, інакше фантомно відкривався сайдбар) | Chrome (+/− expander) має власний `pointerdown`/`pointertap` з `stopPropagation` — `orgCardInteractions.ts:67`, `personCardContent.ts:211-222` | **є** — та сама гарантія, той самий клас багу закритий |
| 3 | `reveal`/`focusOrganization` з розкриттям предків (`expandPathTo`) | `revealOrgPath` (`interaction/revealPath.ts:7-32`) йде по `parentOrgId` до кореня й розкриває root→leaf; викликається з `revealPath()`/`focusNode()` (`OrgHierarchyDiagram.ts:1419,1514`) | **є** |
| 4a | Zoom in/out/to-fit | `setZoom`/`zoomBy`/`fitView`/`resetView`/`getZoom` (`OrgHierarchyDiagram.ts:1618-1660`) | **є** |
| 4b | Повноекранний режим | 0 збігів `fullscreen` у `packages/sdk/src` | **N/A** — контейнер, не рушій; хост керує тим самим `<div>`, яким керував і для GoJS |
| 5 | Export PNG | `export({scope: 'viewport'\|'subtree', …})` → `pngExport.ts` (`export/exportDiagram.ts:24-35`) | **є** |
| 6 | Пошук/перехід до організації в тулбарі | `search()`/`searchAll()` (`OrgHierarchyDiagram.ts:1257-1350`); `searchBeyondWindow` розширює на повний датасет хоста, коли вікно — лише зріз | **є** |

## Selection

| # | GoJS | dg SDK | Вердикт |
|---|---|---|---|
| 7 | Bulk-select модифікатор-клік, нативний select вимкнено, підсвітка через `setSelection` | `ctrlKey`/`metaKey`/`shiftKey` читаються в `interaction/selection.ts:67-85`; `select`/`selectMany`/`toggleSelection`/`clearSelection` (`OrgHierarchyDiagram.ts:1385-1403`) | **є** |
| 8 | `BulkBar` з діями «Підпорядкувати»/«Видалити» | SDK дає `getSelections()`+`onSelectionChange` і дефолтне групове меню `bulkContextMenuItems` (`interaction/contextMenu.ts:38-49`) — сам бар не постачає жоден з двох варіантів | **N/A** — UI-компонент, хостовий і сьогодні, і завтра |
| 9 | Підказка «macOS Ctrl+click = ПКМ» | — | **N/A** — текст підказки, не поведінка рушія |

## Panels

| # | GoJS | dg SDK | Вердикт |
|---|---|---|---|
| 10 | Сайдбар організації (керівництво/ключові посади/особовий склад/групи/військові деталі) | `onNodeClick`/`onSelectionChange` + повна `DiagramData` — той самий обсяг, що й GoJS-рушій давав хосту | **N/A** — жоден рушій не малює цю панель, обидва лише дають подію+дані |
| 11 | Контекстне меню, 7 доменних дій (відкрити/дитина/редагувати/керівник/підлеглі/група/видалити) | `onContextMenu` повертає власний `MenuItem[]` (`callbacks.ts:57`); дефолт — 4 загальні пункти без доменних дій (`interaction/contextMenu.ts:20-25`) | **є (каркас)** — жодної з 7 дій не вшито в жоден рушій; в обох випадках їх пише хост-код (`build-org-hierarchy-menu-items.ts` для GoJS). Той самий обсяг роботи |
| 12 | Клік по **зв'язку** → попап з періодом підпорядкування | `NodeRef` (`interaction/types.ts:3-10`) має лише kinds вузлів — зв'язок не адресована сутність, події кліку по ребру немає. Дані для попапу вже є: `periodStart`/`periodEnd`/`periodLabel` на `DiagramOrganization` (`data/types.ts:41-46`) | **немає** — бракує лише події; дані вже на місці |

## Filters і час

| # | GoJS | dg SDK | Вердикт |
|---|---|---|---|
| 13 | Фільтри (тип, тимчасові, групи, глибина) — усі йдуть у BE-запит | SDK не ходить у мережу (`docs/USAGE.md` §1) — фільтрація відбувається до `setData`, на боці хоста | **немає, структурно** — не регресія: GoJS теж не фільтрував сам, фільтр ішов у хостовий BE-запит |
| 14 | Історичний скрабер — стан **на дату** | Хост запитує BE за станом на дату й віддає `setData()`; SDK рендерить будь-який знімок без різниці «поточний/історичний» | **є, структурно** — та сама схема, що й з GoJS; UI скрабера хостовий в обох варіантах |
| 15 | Панель кореневих організацій по країнах | `DiagramOrganization` не має поля country/geo (повний список полів `data/types.ts:22-56`) і немає вільного metadata-бага для довільних host-полів | **немає** — хосту доведеться тримати мапу org→country окремо від `DiagramData` і рахувати корені самому |

## Editing

| # | GoJS | dg SDK | Вердикт |
|---|---|---|---|
| 16 | Drag-reparent організації (перетягнути на нового батька) | `LayoutPatch` (`callbacks.ts:6-25`): `position-move` / `matrix-reorder` / `matrix-cell` / `block-shift` / `position-expand` / `position-reparent` — жодного варіанта для організацій; `interaction/positionReparent.ts` існує лише для посад | 🔴 **немає** — див. «Підсумок» |
| 17 | Модалки створення/редагування org/групи/зв'язку (RHF+Zod, 4 схеми) | — | **N/A** — форми, не діаграма; хост будує їх сам в обох варіантах |

## Node visual

| # | GoJS | dg SDK | Вердикт |
|---|---|---|---|
| 18 | NATO-символи/емблеми, тема-залежні, свопаються **без rebuild** | `media`-поле (`ThemedMedia`) на org/person/position (`data/types.ts:48,88,140`), `MediaService` (`media/MediaService.ts`); `setTheme()` лише міняє активний theme-key й перемальовує (`OrgHierarchyDiagram.ts:1074-1078`) — темплейти не перестворюються | **є** — і структурно сильніше за GoJS-варіант: expansion/selection/viewport тут явний стан поза рендером, тож клас багу «rebuild = втрата стану» (задокументований як гоча хоста) у dg неможливий за побудовою, а не «вилікуваний окремим `ThemeManager`» |
| 19 | Маркер тимчасової структури | `isTemporary?: boolean` (`data/types.ts:32`) | **є** |
| 20 | Гліфи-плейсхолдери, коли немає символу | `media/placeholders.ts` — `mediaPlaceholders`, хост-конфіг | **є** |
| 21 | Матриця схлопнутих сиблінгів (`matrixOnCollapse`, >1 дітей, «хребет» trunk/bus/riser) | Уже під розбором — [`T113`](../../tasks/T113-collapsed-children-should-be-a-matrix.md), разом із несумісністю з оголошеними контейнерами | **див. T113** |

## Монтування (§E17) — архітектурна нотатка, не рядок таблиці

Хост монтує **один спільний рушій у трьох місцях** (окрема сторінка org-hierarchy, вкладка
«Зовнішня структура», вкладка «Штатно-посадова структура» — questions.md §17), щоразу з іншим
`viewState`-адаптером і скоупом прав. `OrgHierarchyDiagram.create(container, {data, config})`
не прив'язаний до маршруту й бере `staffCurrentOrgId`/скоуп як параметри
(`OrgHierarchyDiagram.ts:344`) — форма сумісна з трьома монтажами за побудовою. Перевірки на
живому прикладі з ін'єктованим адаптером ще не було — це твердження з читання коду, не вимір.
