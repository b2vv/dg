# plan — `cell-flood` в експорті

**Дата:** 2026-08-26 · **Гілка:** `cursor/flood-export-svg` · **Спека:** [`spec.md`](./spec.md)
**Дерево:** окремий worktree `~/projects/dg-flood-export` — у `~/projects/dg` паралельно працює інша сесія.

## Розміщення (за `.claude/standards.md` §Розміщення)

| Що | Куди | Чому саме там |
|---|---|---|
| Вибір рушія для SVG + збір входів flood | `packages/sdk/src/export/svgExport.ts` | експорт — `packages/sdk`; геометрія не змінюється, змінюється **джерело** кілець |
| Діагностика «чим малювали й чому не тим» | `packages/sdk/src/export/exportDiagram.ts` | там уже живе `reportSvgEngineMismatch` |
| Нічого в `packages/core` | — | Rust не чіпаємо: flood уже вміє все потрібне |

## Reuse-first

**Переюзуємо (нового коду не пишемо):**

| Механізм | Файл | Роль у плані |
|---|---|---|
| `computeFloodContours` | `render/contour/floodContourEngine.ts` | сам flood, поблочно по org, з мапінгом кілець на бокси карток |
| `contourSceneInputs` | `render/contour/contourInputs.ts` | входи + `memberBoxesByDept`; **вже викликається в обох гілках** svgExport |
| `resolveContourWorldTransform` | `render/contour/contourWorldTransform.ts` | pitch/origin для cell-space → world |
| `contourButtonGroupMargin` | `render/contour/contourButtonGroup.ts` | padding кілець; уже імпортований у svgExport |
| `ExportOptions.onDiagnostic` | `export/types.ts` | канал повідомлень; доданий у попередній сесії |
| `DEFAULT_STAFF_LAYOUT_OPTIONS` | `layout/staff/types.ts` | pitch = refCell + gap, як у рендерері |

**Нове (мінімум):**

1. `resolveExportContourRings(...)` у `svgExport.ts` — одна функція, що вирішує «flood чи
   button-group» і повертає кільця + діагностику. Обидві контурні гілки (staff, grid) кличуть її.
2. `CHANGELOG.md` у корені + версія `0.2.0` у `packages/sdk/package.json`.

**Чому наявне не підійшло:** нічого не переписуємо — `paintMagneticGroups` лишається дефолтом,
`computeFloodContours` уже інкапсулює поблочний прохід. Бракує рівно одного: **вибору** між ними
в експорті. Це не новий шар, це `if` у місці, де його забули.

## Кроки

1. **`resolveExportContourRings`** (staff-гілка): при `contourEngine==='cell-flood'` побудувати
   `transform` через `resolveContourWorldTransform(canvas.positionNodes, positionById, cellW, cellH, pitchX, pitchY)`
   і викликати `computeFloodContours`; діагностики з нього — назовні. Інакше — теперішній
   `paintMagneticGroups`.
2. **Grid-гілка**: при `'cell-flood'` лишити `paintMagneticGroups` і додати діагностику
   «flood недоступний для сітки — так само й на канвасі» (дзеркалимо канвас, рішення GATE 1 №3).
3. **`exportDiagram`**: `reportSvgEngineMismatch` більше не спрацьовує від самого факту
   `cell-flood`; повідомляються **реальні** причини заміни, які повернув крок 1/2.
4. **Порожній результат flood** (WASM впав, кілець нема) → fallback на `paintMagneticGroups`
   + діагностика з причиною. Експорт не падає ніколи.
5. **Документи**: `docs/USAGE.md` §6/§10 — прибрати «SVG завжди button-group», описати поведінку
   й деградацію; `T80` — розділ «Експорт бачить лише button-group» переписати на фактичний стан;
   `work/CTO-RESEARCH.md` — ризик №1 закрити.
6. **Версія + CHANGELOG** (рішення GATE 1 №4).

## Сайд-ефекти

- **Швидкість SVG-експорту** для `cell-flood`: додається WASM-прохід на кожен org-блок. Для сцен
  масштабу демо це десятки мс; для 1M-вікна не міряно — і **не міряно взагалі ніде**, тому в
  ризиках нижче це названо, а не приховано.
- **PNG/PDF** не зачіпаються (фреймбуфер).
- **`print()`** іде через ту саму гілку → отримує flood автоматично; окремих змін не треба.
- **Тести**, що асертять поточний SVG на дефолтному рушії, мають лишитись зеленими **без правок** —
  це і є перевірка A2.

## План міграції

Споживачів поки нема (git-залежність, хост ще не підключений), тож міграція — документальна:

1. `CHANGELOG.md` фіксує зміну поведінки `export({format:'svg'})` при `contourEngine:'cell-flood'`.
2. `docs/USAGE.md` втрачає застереження; натомість зʼявляється рядок про деградацію.
3. Хостам на дефолтному рушії робити **нічого** — вихід побайтово той самий (A2).

## Rollback

Одна точка відкату: `resolveExportContourRings` завжди повертає button-group. Технічно —
revert коміту кроку 1, або конфіг: діаграма з `contourEngine:'button-group'` поводиться як
раніше. Незворотного немає: файли на диску в користувача — його, ми не мігруємо дані й не
чіпаємо формат.

## Конституція (`.claude/standards.md` §Конституція)

- [x] **Тести перед кодом** — кроки 1–4 мають failing-тест до реалізації (див. приймальні сценарії).
- [x] **KISS → SOLID → …** — один `if` у наявному місці, без нового шару; патерн не вигадується.
- [x] **GoF лише за ≥2–3 повтореннями** — не застосовуємо.
- [x] **Межа WASM ↔ TS** — контракт уже описаний (`FloodContourInput`); власник памʼяті не
      змінюється, кільця повертаються як plain-обʼєкти.
- [x] **Публічний API не змінюється мовчки** — крок 5 (USAGE) і крок 6 (CHANGELOG) у тому ж PR.
- [x] **Pocock — тільки TS** — уся зміна в TS.

## Приймальні сценарії

Три групи — happy path, межі, відмови. Результат кожного рядка сформульований так, щоб двоє
людей однаково сказали, збігся він чи ні.

| # | Сценарій | Передумова | Дія користувача | Очікуваний спостережуваний результат | Чим перевіряється |
|---|---|---|---|---|---|
| **H1** | Flood доїжджає до SVG | staff-сцена, `contourEngine:'cell-flood'` | `export({format:'svg'})` | у SVG рівно стільки `<path data-dept>`, скільки кілець дав би `computeFloodContours` для цієї ж сцени, і кожен `d` збігається з ними з точністю до 0.5 px | unit `packages/sdk/src/export/export.test.ts` |
| **H2** | Дефолт не змінився | та сама сцена, `contourEngine` не задано | `export({format:'svg'})` | рядок SVG **побайтово** дорівнює тому, що функція повертала до зміни (зафіксований у тесті) | unit `export.test.ts` |
| **H3** | Кнопка в демо | таб «Staff · Flood», `?e2e=1` | клік `#export-svg` | завантажений файл містить `<path data-dept` у кількості > 0, і статус показує `export` | e2e `e2e/integration-paths.spec.ts` |
| **H4** | Друк іде тим самим шляхом | staff-сцена, `cell-flood` | `print()` | у переданому в друк SVG ті самі `data-dept`-шляхи, що й у `export({format:'svg'})` | unit `export.test.ts` |
| **B1** | Сцена без відділів | посади без `departmentId` | `export({format:'svg'})` | у SVG є `<g id="departments">` без жодного `<path data-dept>`; помилки немає | unit `export.test.ts` |
| **B2** | Один відділ, одна посада | 1 посада з `gridCell`, `minContourMembers:1`, `cell-flood` | `export({format:'svg'})` | рівно один `<path data-dept="…">` | unit `export.test.ts` |
| **B3** | `minContourMembers` відсікає | 1 посада у відділі, `minContourMembers:2`, `cell-flood` | `export({format:'svg'})` | жодного `<path data-dept>`; діагностики про заміну рушія **немає** (це не відмова, а налаштування) | unit `export.test.ts` |
| **B4** | Піддерево | `scope:'subtree'`, корінь із 1 з 3 відділів, `cell-flood` | `export({format:'svg', scope:'subtree', subtreeRootId})` | `data-dept` присутні **лише** для відділів піддерева | unit `export.test.ts` |
| **F1** | WASM недоступний | `cell-flood`, flood-лоадер кидає | `export({format:'svg'})` | SVG усе одно повертається і містить button-group-шляхи; `onDiagnostic` отримав рівно одне повідомлення, у якому названо причину заміни | unit `export.test.ts` |
| **F2** | Сітка без staff-фокуса | сцена лише з `gridCell`, без `staffCurrentOrgId`, `cell-flood` | `export({format:'svg'})` | button-group-шляхи + одне повідомлення, що flood недоступний для сітки так само, як на канвасі | unit `export.test.ts` |
| **F3** | Зайвих попереджень немає | дефолтний рушій | `export({format:'svg'})` | `onDiagnostic` не викликано жодного разу | unit `export.test.ts` |
| **F4** | Порожній результат flood | `cell-flood`, flood повернув 0 кілець при ≥1 очікуваному відділі | `export({format:'svg'})` | button-group-шляхи + повідомлення з причиною; порожнього шару відділів **не** буває мовчки | unit `export.test.ts` |
| **M1** | Око: SVG проти екрана | таб «Staff · Flood» | експортувати SVG і відкрити поруч із канвасом | контури в файлі повторюють контури на екрані (та сама C-подібна форма навколо чужої картки) | **вручну** — 1 ручний рядок |

**Ручних рядків: 1** (M1). Решта 12 — автоматичні: 11 unit + 1 e2e.

Кожен таск нижче посилається на номери рядків, які він закриває.
