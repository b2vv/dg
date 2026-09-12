# Хост має **записаний** інтерфейс рушія-замінника. Каталог паритету його не знає

**Дата:** 2026-09-12 · Dg 2 · гілка `parity-recheck`
**Ліворуч:** `src/shared/lib/gojs-diagram/tree-diagram-engine.ts` (хост, читання)
**Праворуч:** `packages/sdk` на `main @ ac02433`

## Що знайдено

Шукаючи рядок C1, я натрапив на те, що більше за будь-який рядок каталогу:

> «The **single swap-seam** for the GoJS tree-diagram renderer, generic over a domain payload
> `TPayload`. One concrete impl today (`GoJsTreeDiagramEngine`); **a future React Flow engine is a
> one-class replacement behind this interface.** Controllers depend on this interface + a
> per-domain `DiagramAdapter`, **never on GoJS**.»
> — `tree-diagram-engine.ts:44-52`

Тобто хост **уже** спроєктував заміну рушія й записав її контракт: **19 членів інтерфейсу + 7 типів
подій**. Це не здогад про потреби хоста — це його власна, закомічена вимога до будь-якого
наступника GoJS, зокрема до `dg`.

🔴 **У `PARITY-gojs-to-dg.md` цей файл не згадано жодного разу.** Каталог порівнює
«вимогу → можливість» 51 рядком, вільним текстом і відсотками. Поруч лежить **точний** контракт
із фіксованою арністю, який або виконується, або ні. Ф2 шукала неточності в рядках — а
найбільша неточність у тому, що міряли не те.

## Чому це важить більше за рядок

Каталог відповідає на питання «чи вміє `dg` те саме». Інтерфейс відповідає на інше: **чи стане
`dg` на місце GoJS**, не переписуючи контролери хоста. Це різні питання, і друге — те, яким
вимірюється фаза Б («хост справді перейшов») з `ROADMAP.md`. Перше можна закрити на 100 % і не
зрушити друге.

## Три доктрини, записані в інтерфейсі, і що з ними в `dg`

### 1. Рушій **не володіє** виділенням

> `setSelection: (keys) => void` — «The engine does **NOT** own the selection set — the
> controller's reducer does. Idempotent; updates the E2E digest.» (`:59-64`)
> `nodeClicked` — «the engine reports the modifier keys **without interpreting them**; selection
> policy (sole-select vs bulk-toggle) lives in the controller's reducer.» (`:11-19`)
> `expanderToggled` — «emitted **so policy can assert “no selection change”**.» (`:22`)

У `dg` політику застосовує SDK (`handleNodeSelect` → `selectionStore`), модифікатори назовні не
виходять, а фон-клік чистить виділення всередині й **не має публічного колбека взагалі**
(`onCanvasClick` живе лише в мості рендера; у `callbacks.ts` його немає). Розгортання org теж не
дає події: є `onPositionExpandChange` (лише посади), `onInitialExpand`, `onOrgModeChange` — але
нічого рівного `expanderToggled {nodeKey, expanded}`, тож твердження «розгортання не змінює
виділення» хост **не може перевірити** так, як перевіряє сьогодні.

### 2. Показ вузла **не чіпає** виділення — а в `dg` чіпає **всюди**

> `reveal: (nodeKey) => void` — «Scroll a node into view **WITHOUT changing the selection**.
> Returns `{revealed:true}` … `{revealed:false}` if absent or not yet laid out (a pending reveal
> is recorded and applied after the next layout).» (`:65-70`)

| `dg` | що робить | виділяє? |
|---|---|---|
| `focusNode` (`:1545`) | `applySelection(ref)` → пан | **так** |
| `revealPath` (`:1434`) | розкриває шлях, рендерить, тоді `await this.focusNode(nodeId)` (`:1466`) | **так** |
| `focusByTestId` | «розкриває згорнутого предка, відкриває шлях, **виділяє** і панорамує» (`USAGE.md` §14) | **так** |

**Жодного «показати без виділення» в публічному API немає.** Три входи, усі три виділяють.
Обхід — `listPromoteBoxes()` + `panTo()`, тобто API overlay-промоушену замість навігації, і лише
для вже відмальованих вузлів. Плюс `reveal` у хості має контракт **відкладеного** показу
(«ще не розкладений → запам'ятати й застосувати після наступної розкладки»); у `dg` `focusNode`
просто повертає `false`, якщо коробки немає, — `revealPath` обходить це тим, що сам рендерить
перед фокусом, але для вузла, який не під згорнутим org, відкладеного показу немає.

### 3. Зміна теми **зберігає** модель і стан розгортання

> `applyTheme: (mode) => void` — «rebuilds the node/link/group templates + canvas background in
> place (**the model and expansion state are preserved**)» (`:100-105`)

`dg`: `setTheme` — у базовій лінії недокументованих (`AGENTS.md`), тобто його поведінка щодо
стану розгортання **ніде не заявлена**. Це не знахідка про код — це знахідка про те, що заяву
нема з чим звірити. Перевірка поведінки — окремим прогоном, не читанням; у цю партію не входить.

## Відображення 19 членів — попереднє

Поки без прогонів, лише за публічною поверхнею (`scripts/facadeSurface.mjs` → 64 члени) і
`callbacks.ts`.

| Член інтерфейсу | `dg` | Стан |
|---|---|---|
| `init(host)` | `OrgHierarchyDiagram.create(container, config)` | ✅ |
| `setData(data)` | `setData` / `appendData` | ✅ |
| `expand` / `collapse` | `expandOrg` / `collapseOrg` / `toggleOrgExpand` / `setOrgsCollapsed` | ✅ |
| `setSelection(keys)` | `select` / `selectMany` / `clearSelection` | 🟡 команда є, **доктрина власності — ні** |
| `reveal(key)` **без виділення** | — | 🔴 **немає** |
| `increaseZoom` / `decreaseZoom` / `zoomToFit` | `zoomBy` / `fitView` | 🟡 крокову семантику не звіряв |
| `visibleNodeCount()` / `visibleNodeKeys()` | `listTestAnchors()` (усі з рендера) | 🟡 «видимі» ≠ «у рендері» — не звіряв |
| `selectedKeys()` | `getSelection` / `getSelections` | ✅ |
| `nodeCenter(key)` — **пікселі в'юпорта** | `listTestAnchors().world` — **сценові** | 🟡 перетворення експортоване, але робить хост |
| `expanderCenter(key)` | `listTestAnchors().expander` (T115) | ✅ |
| `invalidateIcon(ref)` | `media.invalidate` / `media.refresh` | ✅ (A4) |
| `exportPng()` | `export` | 🟡 формат/підпис не звіряв |
| `applyTheme(mode)` зі збереженням стану | `setTheme` | 🟡 заява відсутня |
| `on(event, cb) => Unsubscribe` | — | 🔴 **немає**: `dg` бере мішок колбеків у `create`; єдина підписка — `subscribePromoteSync` |
| `dispose()` | `destroy` | ✅ |

**Події:** `nodeClicked` (з модифікаторами) 🔴 · `nodeDoubleClick` ✅ · `backgroundClicked` 🔴 ·
`expanderToggled` 🔴 · `contextMenu` ✅ · `reparent` 🟡 (`onLayoutChange` патчем) ·
`linkClick` зі `structureId` + датами 🔴 — у `dg` кліку по ребру немає взагалі, і каталог це
знає («не edge-click» у D4), але оцінює рядок `✅ 95`.

## Що з цього випливає для Ф2

1. **Найдешевша перевірка паритету — не 51 рядок, а ці 19 + 7.** Контракт скінченний і
   написаний; рядки — вільний текст із відсотками.
2. **Каталог і далі потрібен** — він тримає *продуктові* вимоги (що показати користувачу), яких в
   інтерфейсі немає. Але «чи перейде хост» вимірюється не ним.
3. **Три 🔴 — одна причина.** `reveal` без виділення, `backgroundClicked`, `expanderToggled` і
   сирі модифікатори — це **одна** розбіжність: хост тримає виділення у своєму редюсері, `dg`
   тримає його в собі. Це не чотири задачі, а одне рішення з чотирма наслідками.
4. **`on()` — окрема, дешевша розбіжність** форми інтеграції, не поведінки.

**Рекомендація:** перш ніж проходити рядки 6–51, звірити `dg` з цим інтерфейсом прогоном —
кожен член окремим тестом проти реального фасаду. Це дає хосту відповідь «стане / не стане», якої
каталог не дає в принципі, і робить решту проходу дешевшою: рядок, що впав на доктрині, вже
пояснений.
