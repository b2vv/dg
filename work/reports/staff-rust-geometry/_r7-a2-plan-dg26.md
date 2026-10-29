# R7 A2 `rust-routing` — план (Dg26, 2026-10-29)

> Цикл R6/R7: критик ПЕРЕД зрізом → TDD red-first → незалежний ревʼю → гейти БЕЗ pipe → коміт лише з «го».
> Межа власника R7: геометрія маршрутів → Rust; фарба → TS. Golden роутингу переписуємо на P3 (рішення #1 прийнято).

## Оракул (джерело правди порту)
`packages/sdk/src/layout/staffEdgeGeometry.ts`:
- `classifyStaffEdgeRoute` (320-410): sameBand, preferHorizontal=matrix|dotted|sameBand, lead-org vertical-drop, candidate-ladder, around/forced.
- `horizontalPolyline` (181-209) — бічні порти left/right при чистому гор. зазорі.
- `verticalPolyline` (129-175) — напрям childBelow (ціль нижче/вище).
- `ObstacleIndex`+`lowerBound` (283-318) + bbox-reject у `blocked` (344-367) — просторовий індекс (перф §12, n²).
- `buildStaffEdgeSegments` (439-477) — deptTop синт-порт + `endsOnDeptTop`.

## Межа Rust-detour vs TS-ladder
Власник прийняв: Rust тримає власну detour-модель (corridorY-lane + side X-lane, R6-4a/4b). A2 НЕ переписує її на TS around-ladder. A2 додає ЛИШЕ port-selection семантику поверх наявного detour.

## Мікрокроки (кожен: критик→TDD red→ревʼю; гейти без pipe)
- **A2.1 spatial-index** (зона: `staff_routes.rs`). Порт `ObstacleIndex` у clean-path. Інваріант: **вихід байт-ідентичний**.
  **ВИМОГИ КРИТИКА A2.1 (гейт RED поки не закрито, `_r7-a2-1-critic-dg26.md`):**
  - B1: інфляція bbox = **`pad`** у ВСІХ трьох місцях (band-start `minY-pad-maxH`, break `r.y>maxY+pad`, reject `rx>maxX+pad`/`rx+rw<minX-pad`/`ry+rh<minY-pad`), строгі `>`. НЕ 1px (TS 1px — бо TS обгортає interior-hit eps0.75; Rust — distance<pad). EXACT: polyline⊆bbox ⇒ dist(polyline,rect)≥dist(bbox,rect); кутові кандидати (до pad·√2) далі перевіряє точний `seg_rect_distance` → булево тотожне.
  - B2: **глобальний** CardIndex (несе id!) збудований РАЗ; clean-check band-query + skip from_id/to_id **по id** (card-set має 2 записи з однаковим id: person+org — тест `person_wins_over_org_card_on_id_collision`); per-edge card-Vec будувати **ЛІНИВО лише коли base блоковано** (чисті ребра — 0 алокацій). Frames лишаються per-edge лінійно (мало).
  - B3: lane-gen (Y `detour_edge:254-257` і X `:275-279`) **байт-незмінні** (dedup_by на f32 чутливий до порядку). Оптимізувати ЛИШЕ валідацію clean-path; на блоці — старий `detour_edge` без змін.
  - B4 тест: наявний golden + НОВИЙ — перешкода на відстані 1<d<pad від base-маршруту мусить блокувати (детур), інакше 1px-інфляція б загубила. partition_point замість ручного lowerBound (NB7). partial_cmp (не total_cmp, NB5). Чесність: індекс прибирає ДОМІНАНТНИЙ n² (clean-check), lane-gen на блоці лишається O(cards) (NB8).
- **A2.2 side-порти + preferHorizontal** (зона: `staff_routes.rs`). Додати `Side::Left/Right` + `route_horizontal` (порт `horizontalPolyline`: clearGap, midX у зазорі). `sameBand` = |ΔcenterY| < min(h)·0.35. Для kind matrix|dotted|sameBand — порядок кандидатів горизонталь-перша. Змінює golden (свідомо).
- **A2.3 lead-org drop напрям** (зона: `staff_routes.rs`). Порт `verticalPolyline` з childBelow (ціль вище → порти top→bottom). Для kind=lead-org — вертикаль першим кандидатом, якщо clean+!blocked. Змінює golden (свідомо).
- **A2.4 deptTop синт-порт + ends_on_dept_top** (зона: `staff_geom.rs` FrameRect.head_id НОВЕ поле; `staff_layout.rs` заповнення head_id; `staff_routes.rs` синт-порт). admin-edge у голову відділу (frame.head_id==to_id && from не член рамки) → routeTo синт-бокс {to.centre_x, frame.y, 2×2}, зберегти to_id для obstacle-skip/foreign-frame, `ends_on_dept_top=Some(true)`. Змінює golden + контракт (head_id).
- **A2.5 edgePort→person_hints wiring** (зона: `staff_layout.rs`). Будувати PersonEdgeHints (GojsRow/FigmaRow) з edgePort/style-даних входу, передати в RouteInputs замість `&[]`. Оракул: TS-резолвер hints (знайти перед кодом). Змінює golden (figma-row порт на tile).

## OPEN (на «го» перед TDD)
1. **Розширення зони.** A2.4/A2.5 чіпають `staff_layout.rs` (зона A1) + `staff_geom.rs` (head_id) + можливо `types.rs`. Рядок 19 хендофу називає лише 2 файли. Пайплайн серійний → конфлікту зон нема. Підтвердити розширення.
2. **Порядок** A2.1→A2.5 (перф-перший, щоб golden-зміни йшли одним блоком A2.2-A2.5). ОК?
3. **FrameRect.head_id** vs зовн. map headId→frame. Поле простіше й локальне. ОК?

## Відкриті борги (успадковано)
- detach-collision golden (на P3), A10 перф вимір (R10).
