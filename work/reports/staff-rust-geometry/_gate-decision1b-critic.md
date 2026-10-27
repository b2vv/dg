# Gate: Decision 1b — де розмістити кластеризацію частин департаменту (критик)

Model ID: claude-opus-4-8

ДАЛІ: звіряю контекст із кодом — clusterPositionIds (TS), pack_departments (Rust), part_index у types.rs, StaffPositionInput, paint-шлях (per-frame чи memo), org-matrix.

## ФАКТИ (звірено з кодом)

F1. Кластеризація живе ТІЛЬКИ в TS: `clusterPositionIds` union-find на (col,row), Manhattan ≤ magnetRadius
    (`packages/sdk/src/render/contour/contourCluster.ts:9-77`). У Rust union-find НЕМАЄ (grep core — лише
    "union AABB" у коментарях рамки, не кластеризація).

F2. Кластеризація викликається ВСЕРЕДИНІ paint: `paintMagneticGroups` робить `clusterPositionIds` по
    кожному відділу (`paintMagneticGroups.ts:147`). Два споживачі paintMagneticGroups:
    - `ContourPainter.buildPaintRingsByDept` (`ContourPainter.ts:129`) — live canvas;
    - `svgExport.ts:61` — експорт (разовий).

F3. Paint НЕ мемоїзований: `refresh()` щоразу кличе `buildPaintRingsByDept()` → paintMagneticGroups →
    clusterPositionIds (`ContourPainter.ts:163-167`). `refresh()` викликається з `previewDrag()` на КОЖЕН
    кадр драгу (`ContourPainter.ts:306-353`) і з `paint()`. Отже кластеризація біжить PER-FRAME на драгу.
    Коментар T107 у contourCluster.ts:36 це прямо називає («per frame», 160k порівнянь → cell-bucket).
    Алго здешевлене (radius 1.5 → span 2, ~25 клітин/посада), але все одно per-frame.

F4. Драг-прев'ю — СИНХРОННИЙ TS, БЕЗ WASM-раунд-тріпу за дизайном (ContourPainter.ts:66-68: «rings are
    computed in TS, with no worker round-trip and no await in the paint path»; T80 прибрав Rust cell flood
    як over-built для «shapes this product does not have»). previewDrag локально міняє (col,row) посади й
    окупанта (ContourPainter.ts:314-316, 332-334) → кластери МОЖУТЬ змінюватися під час драгу → потрібна
    ре-кластеризація на кадр.

F5. Rust-вхід НЕ несе (col,row): StaffPositionInput = id/orgId/isHead/departmentId (`types.rs:324-334`).
    Тобто Rust СЬОГОДНІ фізично не може кластеризувати — координати сітки в нього не передаються. M2/M3
    вимагають РОЗШИРЕННЯ вхідного контракту (grid coords у Rust).

F6. part_index контракт ОГОЛОШЕНИЙ, але НЕ заповнений: StaffNodeGeo.part_index, StaffDepartmentFrameGeo.part_index
    (`types.rs:443-447, 476-487`) існують, але `pack_departments`/`department_frame` жорстко ставлять
    `part_index: None` (`staff_packing.rs:34`). B5 magnetic-split end-to-end НЕ зроблений. Це справді
    greenfield-рішення, а не «вже написано».

F7. pack уже приймає ГРУПИ: `pack_departments(&[DepartmentMembers])`, одна рамка на групу (wrapped)
    (`staff_packing.rs:61-115`). DepartmentMembers = department_id/members/wrapped — part_index поля НЕМАЄ
    (`staff_packing.rs:46-50`). Тобто M1-проводка = додати part_index у DepartmentMembers + штампувати його
    на рамку й ноди. Мінімально, без grid-coords у Rust, без нового алго.

F8. org-matrix (`matrixGrid.ts` applyMatrixPlacement/placeOrgAtMatrixCell) — чистий TS, БЕЗ поняття
    кластеризації (орги в клітинках, magnetic-split немає). Міграція org-matrix у Rust НЕ тягне
    кластеризацію за собою — сітки незалежні.

## РІШЕННЯ (аналіз)

Ключова напруга: один і той самий grouping живить (а) топологію рамок — геометрія, за ADR-0002 Rust;
(б) paint-кільця, що ПЕРЕформовуються наживо під драг БЕЗ раунд-тріпу. Хот-шлях (драг) — синхронний TS.

- M2 (cluster у pack): найгірший шов. Зливає «вирішити топологію» з «розставити регіони», ховає рішення
  групування в пакувальник; pack — layout-time, драг не обслужить узагалі. Ще й вимагає grid-coords у Rust (F5).
- M3 (окрема Rust-стадія, видалити TS-clusterer): правильний ЗА ДУХОМ (ADR, майбутнє «обидві сітки в Rust»),
  АЛЕ заявлений ендпоінт «TS-clusterPositionIds видаляється» НЕДОСЯЖНИЙ без регресу драг-моделі (F4): або
  ре-кластер у TS на драгу (суперечність із «видалити»), або WASM на кожен кадр (ламає T77/T80-дизайн).
  Придатний лише для СТАТИЧНОГО/export/initial-layout боку, не на весь шлях.
- M1 (TS — єдине джерело; pack бере готові частини): тримає ЄДИНИЙ алго на боці, де є хот-інтеракція.
  Rust лишається власником ПІКСЕЛІВ рамки (вже так), TS вирішує МЕМБЕРШИП. Це чистий шов, не «дві правди»,
  ЗА УМОВИ: рівно один clusterer і pack НІКОЛИ не ре-деривує мембершип.

«Дві правди» = алго існує у ДВОХ мовах. Сьогодні він TS-only (F1); коментар «Rust parity» (contourCluster.ts:8)
натякає, що хтось хотів Rust-копію — саме це й було б дублем. Оскільки хот-драг МУСИТЬ кластеризувати в TS
синхронно (F4), єдиний спосіб уникнути другої імплементації — лишити clusterer у TS (M1). M3 форсує або
другий (Rust) алго, або раунд-тріп.

4-й спосіб = «контракт-ізувати M1»: мембершип (кластеризація) — єдине джерело в TS через live-драг; Rust-прохід
геометрії СПОЖИВАЄ TS-групи (TS передає groups → Rust пакує + штампує part_index). Rust ніколи не кластеризує,
TS ніколи не рахує пікселі рамки. Це рівно те, чого pack уже хоче (DepartmentMembers, F7). Чистий end-state:
статичний render читає part_index/frames з Rust-виходу (не ре-кластеризує «в спокої»); лише live-драг ре-юзає
той самий TS-clusterer на локальну дельту. Один TS-алго, двічі вжитий; Rust = пікселі. Без двох правд.

Перф: усі три дешеві алгоритмічно (F3). Реальна ціна M3/M2 — НЕ алго, а WASM-раунд-тріп на драг-хот-шляху,
якого M1 уникає. Перф НЕ розрізняє M1/M2/M3 по алго — розрізняє по межі WASM на драгу.

Питання 2: ТАК — position-matrix це POC (слова власника), тож union-find-Manhattan-1.5 — евристика; вмуровувати
її в Rust-контракт (M2/M3) підвищує ціну зміни правила. Прецедент T80: Rust-контур уже прибрали як over-built
(ContourPainter.ts:66-68). Переносити POC-кластеризацію в Rust ризикує повторити це. Не портувати 1:1.

Таймінг: НЕ розширювати T126/R3 на перенос кластеризації в Rust зараз. Чесний мінімум R3 = закрити gap
part_index=None (staff_packing.rs:34): додати part_index у DepartmentMembers + штампувати на рамку й ноди з
TS-поданих груп (M1). Без нового Rust-алго, без grid-coords у Rust-вході. Будь-яке «кластеризація в Rust»
відкласти до graduation position-matrix із POC та/або міграції org-matrix — і навіть тоді лишити єдиний
TS-clusterer, доки драг синхронний.

## ВЕРДИКТ (ранжовано)
1. M1 (+ 4-й як формальний контракт шва) — ЛОГІЧНІШЕ. Головна причина: live-драг-прев'ю синхронний-TS без
   раунд-тріпу (T77/T80), а кластери реформуються під драг → єдине джерело правди без per-frame WASM можливе
   лише з clusterer на боці TS.
2. M3 — вірний за духом (ADR, both-grids-in-Rust), але «видалити TS-clusterer» недосяжно без регресу драгу /
   дублю алго. Лише для статичного/export боку, не на весь шлях.
3. M2 — найгірший шов; відхилити.

Робити зараз в T126/R3: лише M1-штамп part_index (малий гап staff_packing.rs:34), НЕ переносити алго. Повну
розвилку сполучити з graduation POC / міграцією org-matrix.
