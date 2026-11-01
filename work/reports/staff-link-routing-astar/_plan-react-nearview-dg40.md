# План — React/CSS near-view 1:1 (dg40)

**Дата:** 2026-11-01 · **Статус:** ПЛАН (до критика)
**Джерело рішень:** чат-рішення власника (dg39 + dg40):
- «1 в 1 за v3 + лінії зв'язку», Pixi не відтворює CSS → near-view = React/CSS-порт.
- Варіанти ліній **1 І 2** обидва (порівняти): (1) простий елбоу+докінг на рамку+вхідні крапки;
  (2) повний A*-роутер із `shps-links.js`. На мокапі перетинів НЕ було (їх прибирає A*).
- «Підключай критика» (R6).
- dg39 чинне: теракота `#c2502a`, рамки суцільні з залитими шапками, **радіус ліній 4px**
  однаковий, картка 300 clamp 3.

## Корінь проблеми (звірка з v3/links CSS)
1. шапка деп: `.dn` h34 pad `0 14px` font14/600, `em`=JetBrains Mono 12 — зараз Pixi.
2. лінії 2px (hover 2.5), радіус 4 — зараз Pixi (інша товщина/масштаб).
3. фонти Onest + JetBrains Mono — Pixi не вантажить.
4. картка: pos **17px**/600, who **15px**, ava38/r9, футер `N [m]`+chevron — `ShpsStaffCard` має pos15/who13.5.
5. лінії протикають рамку: мій елбоу card→card; у мокапі ребро в департамент докається на
   ВЕРХ рамки `[cx, dept.y1]` + вхідна крапка `.ent` r3.5; int-ребра через шину `by=низ_батька+LV/2`;
   решта — A* по сітці з обходом карток/чужих рамок (`deptOK`).

## Архітектура (до критики)
**Єдиний React near-view** (`#world`), керований оркестратором за LOD:
- far → Pixi (як є); mid/near → React near-view, **увесь Pixi staff прихований** (без подвійного паінту).
- Рендерить із live-геометрії: org-рамка + рамки департаментів (`.dept`+`.dn`) + SVG-лінії + картки.
- Камера-синк — як у `createReactPromoteOverlay` (viewport transform + catch-up під час pan/zoom).
- Шрифти: Onest + JetBrains Mono (demo `<link>`), щоб і картки, і лейбли збігались.
- «через оркестратор» дотримано: LOD-перемикання far/near — відповідальність оркестратора,
  не окремий демо-додаток повз пайплайн.

**Геометрія (у Rust `staff_mockup_layout`, рішення A dg):**
- nodes/frames/width/height — є.
- edges — ДВА режими за `StaffMockupParams.routing: 'simple'|'astar'` (serde default 'simple'):
  - simple: елбоу parent→child, докінг на верх рамки деп для ребра-в-департамент + прапор
    вхідної крапки; int через шину `by`.
  - astar: порт `route()`/`astar()`/`stats()` з `shps-links.js` (переказ, НЕ копія; third-party).
- Вибір режиму в demo через `?routing=simple|astar` на alpha-табі.

**Класифікація ребра (переказ shps-links):** `int` (батько й дитина той самий деп),
`cross` (різні department), `ext` (батько без department). Докінг цілі: якщо дитина — голова
департаменту і ребро не `int` → на верх рамки `[cx, dept.y1]` + `.ent`; інакше верх картки.

## Кроки (інкрементально, кожен крок — R6 ревʼю)
1. Безпечна підготовка: `ShpsStaffCard` pos17/who15 (dg-факт v3); Onest+JetBrains Mono у demo.
2. React near-view scaffold: `#world`, рамки департаментів + org-рамка (CSS-порт `.dept/.dn/.org.cur`),
   камера-синк. Pixi staff прихований на mid/near.
3. SVG-лінії у near-view: рендер routes (pathD r4) + вхідні крапки `.ent`.
4. Rust routing variant 1 (simple+докінг+крапки).
5. Rust routing variant 2 (A*-порт) + `?routing=` перемикач.
6. Hover-підсвітка (`.hl`: dim не-rel картки, `.ln.on` #ff8d68 2.5) — наступний слайс.
7. Пошук (v3 `.sbar` + «Знайдено» + focus) — наступний слайс.

## РЕВІЗІЯ після критика (R6, 2026-11-01) — ПРИЙНЯТО
Критик підтвердив напрямок, але спростував 2 твердження «Архітектури». Зміни:
- **НЕ окремий `#world` near-view.** Розширюємо ОДИН `createReactPromoteOverlay`-шар
  (у нього вже camera-sync+catch-up+settle): додаємо опційний `backdrop` (рендер рамок+
  SVG-ліній у тому ж layer, під картками). Один transform → нема desync (пастки #2,#4).
- **Pixi staff НЕ ховається через setPromotedIds** (той ховає лише node-views, не сирі
  шари edges/zones/departments). Фікс: **LOD-гейт у `renderStaffCanvas`** — на `lod!=='far'`
  + alpha пропускати paintStaffZones/paintStaffDepartments/paintStaffFrameAndEdges (пастки #1,#7).
- **`result.frames` зараз викидаються** в computeViaMockup (`staffLiveGeometry.ts`), а Pixi-far
  дер рамку з member-AABB → drift. Фікс: прокинути `frames` у StaffLiveGeometry + Pixi-far
  споживає їх (єдине джерело, пастка #3). Геометрію chrome для backdrop demo бере через SDK-хелпер
  (той самий Rust-результат), БЕЗ нового методу фасаду (facadeSurface-гейт).
- **SVG-лінії:** `vector-effect:non-scaling-stroke` (stroke не масштабується при pan).
- **A*:** мета «0 перетинів як мокап», НЕ байт-паритет; f64 всередині Rust; детермінований
  tie-break (явний Ord на (f,g,cell-index)); гейт на stats()-метрику; обмежити пошук bbox пари.
- **Variant-1:** чесна позначка «проміжний, очікувано гірший (перетини)»; теж потребує frames
  (докінг на верх рамки) — не «дешевший» без плюмбінгу #3.

**Порядок виконання:** (A) #3 frames через пайплайн + Pixi-far споживає. (B) #1 LOD-гейт +
#2/#4 backdrop (рамки+лінії в promote-шарі). (C) variant-1 докінг на рамку + `.ent`. (D) A*.
(E) hover. (F) пошук.

## Пастки (для критика)
- Координатний простір: geometry coords → React absolute px → camera transform; збіг із Pixi-far.
- Подвійний паінт: повне приховування Pixi staff на mid/near (frames+lines+cards+zones).
- Експорт live-геометрії з diagram у near-view (зараз рахується всередині `renderStaffCanvas`).
- A*-порт: вірність сітки/`deptOK`/obstacle; детермінізм; продуктивність на великих сценах.
- `no-verbatim-third-party-code`: `shps-links.js` — лише переказ, не копія.
- Верифікація: скриншот звідси не працює → власник дивиться через ngrok.
