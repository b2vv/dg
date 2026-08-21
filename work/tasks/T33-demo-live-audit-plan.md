# T33 — Live demo audit: проблеми та план фіксів

**Пріоритет:** P0 (алгоритм + читабельність) → P1 (UX chrome) → P2 (polish)  
**Статус:** mostly done (A/B ✅ T34–T35; C ✅ T36); **follow-up contour/tree:** [T38](./T38-contour-vs-tree-audit-plan.md)
  
**Джерело:** огляд https://b2vv.github.io/dg/ (Playwright + візуальні скріни, 2026-08-21)  
**Не плутати:** вкладки **працюють**; «зламані таби» з browser-automation — false positive.

---

## Мета

Зробити демо **читабельним і правдоподібним**, а не «сирим debug UI»: контури покривають своїх людей, ребра читаються як дерево, chrome не конкурує з діаграмою.

---

## Фаза A — P0: алгоритм і структура (блокує довіру)

### A1. IT-контур не покриває P5/P6 (Наталя / Сергій)

| | |
|--|--|
| **Проблема** | При дефолті (`paddingCells: 0`, `smoothIterations: 0`, `magnetRadius: 8`, `preferNotch`) IT path ≈ один верхній ряд (y 0–160). Центри P5/P6 поза fill; CEO notch лишається, низ IT «відрізаний». |
| **Чому сиро** | Візуально «IT» — лише верхня трійка; низ плаває без blob. |
| **Рішення** | 1) Регресія: усі IT-центри **всередині** path, CEO — **зовні** (`variantBContourAlign.test.ts`). 2) Діагностика flood / G6 / notch у `packages/core/src/contour.rs` (corridor + нижні own cells не повинні зникати з fill). 3) Якщо G6 з’їдає C-руки — скоригувати far-side clear або demo `magnetRadius` / layout corridor, не жертвуючи notch навколо CEO. |
| **Файли** | `contour.rs`, bridge positions, `variantBContourAlign.test.ts`, demo Variant B config |
| **Done when** | Тест green на live-геометрії; скрін Variant B — P5/P6 всередині синього IT. |

### A2. Contour cramped + Sharp vs rounded clash

| | |
|--|--|
| **Проблема** | Після T32 inset 2px контур майже впритул до карток; при Smooth=0 — гострі 90°, картки з radius. Smooth=4 дає «осину талію» і артефакти між рядами. |
| **Рішення** | Окремо від A1: (a) дефолтний **візуальний** padding ≥1 cell **або** world inset між картою і stroke; (b) дефолт Smooth ≥1–2 для demo; (c) stroke radius / chamfer узгоджений з card radius. Не роздувати card inset назад до 10px без потреби. |
| **Done when** | Картки не «напхані»; контур читається як група, не wireframe. |

### A3. Staff tree — дірки в ребрах і проміжки

| | |
|--|--|
| **Проблема** | Немає видимого ребра Ada Holding → Ben Ops; Sales / Engineering без зв’язку з рівнем вище; великий вертикальний gap між holding і ops. |
| **Рішення** | 1) Перевірити `reportLines` / org parent edges у `staffTree.ts` + router у `staffEdgeGeometry.ts`. 2) Малювати org→org / org→staff edges для всіх parent links. 3) Підтягнути tier spacing (менше порожнього між holding і ops) або fit так, щоб дерево читалось без pan. |
| **Done when** | Повне дерево зі зв’язками; Sales/Engineering під’єднані до ops. |

### A4. Flat orgs — ребра як сітка / bus

| | |
|--|--|
| **Проблема** | Горизонталі крізь ряди + вертикалі між колонками → не дерево, а «плата». |
| **Рішення** | Orthogonal **tree** routing (як staff): порт parent→children, без наскрізної row-bus лінії; для matrix peers — окремий режим або тонші/інший стиль. Регресія на `staffEdgeGeometry` / matrix edges. |
| **Done when** | На Flat orgs видно хто чий батько без розгадування сітки. |

### A5. Zoom blur (text/avatars pixelate)

| | |
|--|--|
| **Проблема** | При zoom ≈4 текст і кола мильні (canvas resolution / не resolution-aware redraw). |
| **Рішення** | Pixi resolution = `devicePixelRatio` (і оновлення при resize); або перемальовувати текстури тексту при зміні LOD/zoom band; перевірити `PixiHost` + sprite scales. |
| **Done when** | На zoom 3–4 текст читабельний на retina. |

---

## Фаза B — P1: читабельність вкладок і chrome

### B1. Тулбар переповнений + дубль zoom

| | |
|--|--|
| **Проблема** | Таби, search, слайдери, Theme, zoom, Collapse, 4 export в одній каші; `− + Fit` і в тулбарі, і у FAB. |
| **Рішення** | FAB лишити (мобільний UX); з тулбара прибрати дубль zoom **або** навпаки. Export згорнути в меню «Export». Візуальні групи: Nav | View | Contour | Actions. |
| **Done when** | Один очевидний zoom-контроль; тулбар ≤2 логічні ряди без каші. |

### B2. Padding / Smooth лише для Variant B, але завжди в UI

| | |
|--|--|
| **Проблема** | Слайдери мертві на Staff / Flat / 100k — виглядають зламаними. |
| **Рішення** | Disable + tooltip «Variant B only» **або** ховати, коли `tab !== variant-b`. Показати числове value. |

### B3. Search state leak між вкладками

| | |
|--|--|
| **Проблема** | `org-50000` лишається в полі на Mapper/Worker. |
| **Рішення** | Чистити input при `loadTab`, або per-tab search state. |

### B4. 100k — «штрихкод» без сенсу на Fit

| | |
|--|--|
| **Проблема** | Порожні клітинки, слабкі лінії, верхній ряд трохи відірваний; статус як debug (`showing 400/100000 · focus 0 · 0ms`). |
| **Рішення** | LOD: на far — крапки/міні-чіпи + сильніші depth cues; стартовий focus на `org-1` або вікно з підписами; людський status («Вікно 400 з 100 000 · фокус org-N»). Підрівняти top-row alignment. |

### B5. Mapper / Worker — порожнеча і debug overlays

| | |
|--|--|
| **Проблема** | Mapper sample ≈ одна Alice на порожньому полі; Worker бенч поверх Variant B + toast накриває сцену. |
| **Рішення** | Mapper: sample з **кількома** org/staff + auto Fit; Worker: окремий empty/minimal stage або clear diagram; toast у статус-рядок, не поверх центру. |

### B6. Right-click menu affordance

| | |
|--|--|
| **Проблема** | Hint обіцяє menu; ПКМ по порожньому canvas нічого не дає. |
| **Рішення** | Hint: «ПКМ по картці»; або canvas menu (Fit / Collapse). Перевірити React host на person/org card. |

### B7. Startup 404

| | |
|--|--|
| **Проблема** | Console: resource 404 на load Pages. |
| **Рішення** | Знайти URL (favicon / source map / asset), полагодити `rsbuild` public path або прибрати битий ref. |

---

## Фаза C — P2: візуальний polish карток і теми

### C1. Placeholder-аватари (суцільні червоні кола)

| | |
|--|--|
| **Рішення** | Initials на нейтральному fill, або demo JPEG/PNG з `demoMedia`; не solid `#f00`. |

### C2. Помаранчевий «T» без легенди

| | |
|--|--|
| **Рішення** | Tooltip / legend «Temporary»; або chip «Тимчас.» у картці. |

### C3. Низький контраст titles + суфікс «IT» у ПІБ

| | |
|--|--|
| **Рішення** | Title ≥ muted WCAG AA; імена без «IT» (відділ уже в контурі / dept). |

### C4. Staff org-картки: текст top-left, низ порожній

| | |
|--|--|
| **Рішення** | Вертикальне центрування / щільніший layout org card; менше dead space. |

### C5. Тонкі лінії, немає hover/selection

| | |
|--|--|
| **Рішення** | Stroke 1.5–2px @1x; hover outline / selection ring на картках. |

### C6. Demo chrome typography / Theme / status

| | |
|--|--|
| **Рішення** | Не system-only stack для demo (одна display + UI font); Theme з іконкою/станом; status не raw debug string. |

### C7. Fit лишає діаграму дрібною

| | |
|--|--|
| **Рішення** | Fit padding тюнінг + мінімальний zoom floor для малих графів (Variant B / Staff). |

### C8. Variant B «CEO посередині» без пояснення

| | |
|--|--|
| **Рішення** | Короткий caption у demo («staff tiers: subordinates ↑ / head / reports ↓») **або** окремий label на canvas — не міняти notch-геометрію без задачі. |

---

## Порядок імплементації (рекомендований)

```text
1. A1  IT contour + regression test     ← перший PR
2. A3  Staff tree edges/spacing
3. A4  Flat orgs tree edges
4. A2  Contour padding / default smooth
5. A5  Hi-DPI / zoom sharpness
6. B1–B3  Toolbar, sliders, search
7. B4–B7  100k / Mapper / Worker / 404 / menu hint
8. C*   Card & chrome polish
```

Кожен пункт — окремий маленький PR з TDD (success + failure), скрін до/після на Pages.

---

## Регресійний чекліст (після фіксів)

- [ ] Variant B: P1–P3, P5–P6 ∈ IT fill; P4 ∉ IT fill  
- [ ] Staff tree: Ada→Ben→…→Sales/Engineering усі з ребрами  
- [ ] Flat orgs: дерево читається без row-bus  
- [ ] Zoom 4×: текст не мильний  
- [ ] Вкладки: active state = контент; search не тече  
- [ ] Padding/Smooth: disabled поза Variant B  
- [ ] Нема 404 у Network на cold load  
- [ ] Один набір zoom controls (або явна роль FAB)

---

## Поза скоупом цього плану

- Повна зміна layout Variant B (опції D/E з дискусії) — лише якщо A1 недостатньо.  
- Редизайн під product marketing landing (brand-first hero) — demo лишається tool surface.  
- 100k full unwindowed render.
