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
  **ДИЗАЙН A2.2 (на критику):** candidate-ladder у clean-path `staff_routes` (розширює A2.1):
  1. compute `same_band = (to_cy-from_cy).abs() < from.h.min(to.h)*0.35`; `prefer_horizontal = kind∈{matrix,dotted} || same_band`.
  2. `route_horizontal(from,to) -> Option<Vec<Pt>>` — порт `horizontalPolyline` (:181-209): go_right=to_cx≥from_cx; clear_gap (eps 0.5) → бічні порти + midX-елбоу (або пряма якщо |Δy|<0.5); інакше None.
  3. кандидати в порядку `prefer_horizontal ? [H, V] : [V, H]` (V = наявний route_ortho). Перший, що `idx.clear_of(cand) && !foreign_frame_blocks(cand)` → цей маршрут.
  4. якщо жоден кандидат не чистий → наявний вертикальний `detour_edge` (corridorY/side-X) БЕЗ змін (= TS around/forced-еквівалент; detour лишається вертикало-центричним, бо власник прийняв detour≠ladder).
  **КРИТИК A2.2 → 🔴 (виправлено, `_r7-a2-2-critic-dg26.md`):**
  - B1 ІНВАРІАНТ ВИПРАВЛЕНО: НЕ «non-sameBand admin байт-ідентичні A2.1». A2.1 не має ladder (V-clean→V, інакше→detour). A2.2 вставляє ladder [V,H] ПЕРЕД detour → admin non-sameBand, де V БЛОКОВАНИЙ а H ЧИСТИЙ, тепер дає H (A2.1 давав detour). Це faithful до TS (:390-401). **Істинний інваріант: лише «V-clean → V» (той самий предикат, V перший для non-prefer)**. Тест: V blocked→H clean→очікувати H, НЕ detour. h6-golden виживає (H там теж блокований) — перевірити прогоном.
  - B2: `route_horizontal` точний порт :189: `go_right=to_cx≥from_cx` (tie→right, не строгий); `clear_gap = go_right ? from_right≤to.x+0.5 : to_right≤from.x+0.5`; None коли !clear_gap (несуча заміна isClean — Rust не перевіряє власні from/to).
  - NB: N4 same_band на per-LOD EdgeRect.height (не StaffNodeGeo/obstacle_rect); N6 H може бути не строго ортогональний (до 0.5px) — не асертити is_orthogonal на H; N7 H+V clean-check ЛИШЕ через idx+foreign (lazy-obs A2.1 зберегти); N8 lead-org+sameBand+avoid ловиться prefer_horizontal ДО A2.3 vertical-drop — golden-assert на такі ребра ВІДКЛАСТИ до A2.3; N9 порти H рахую inline (як оракул), Side::Left/Right НЕ додаю (dead-variant/clippy).
  - Scope: ladder лише в AVOID clean-path (prod card_pad≥8); non-avoid лишається route_ortho (= поточна поведінка, не регресія).
- **A2.3 lead-org drop напрям** (зона: `staff_routes.rs`). Порт `verticalPolyline` з childBelow (ціль вище → порти top→bottom). Для kind=lead-org — вертикаль першим кандидатом, якщо clean+!blocked. Змінює golden (свідомо).
  **ДИЗАЙН A2.3 (на критику):**
  1. `route_vertical(from,to) -> Option<Vec>` — точний порт `verticalPolyline` (:129-175): childBelow=to_cy≥from_cy; childBelow→ports from.bottom→to.top, gap-check `y1>y2-0.5`→None; інакше from.top→to.bottom, gap-check `y2>y1-0.5`→None; straight при |Δx|<0.5; midY-елбоу.
  2. У clean-path, ПЕРЕД ladder: `if kind=="lead-org" { if let Some(v)=route_vertical(from,to) { if is_clean(v) → return v } }`. Інакше → наявний A2.2-ladder.
  3. Факт: для childBelow+clear-gap `route_vertical == route_ortho` точно (corr==midY, ті самі порти). Розходження б'є лише: (а) lead-org sameBand (A2.2 давав H → A2.3 дає V-drop; закриває N8); (б) lead-org target-above (route_ortho хибний напрям → route_vertical правильний); (в) lead-org no-gap → null → падає в ladder.
  **Інваріант:** route_ortho лишається V-кандидатом ladder (НЕ замінюю на route_vertical — інакше admin/matrix V-семантика (null-on-no-gap/напрям) зміниться → ширший golden). route_vertical — ЛИШЕ для lead-org precedence. Non-avoid lead-org — route_ortho (не чіпається).
  **КРИТИК A2.3 → 🟡 (`_r7-a2-3-critic-dg26.md`): A2.3 — NO-OP у проді.** Доведено:
  - childBelow+gap: ladder [V,H], V=route_ortho перший, route_ortho ≡ route_vertical байт-у-байт (corr==midY) → no-op.
  - sameBand lead-org (ефект «а») **геометрично недосяжний**: sameBand (|Δcy|<min(h)·0.35) і clear-gap (Δcy>min(h)) взаємовиключні → route_vertical=None → ladder → H. І це ВЖЕ = TS (verticalPolyline→null→ladder→H). N8 вакуумний, викреслити.
  - no-gap (ефект «в») → route_vertical=None → ladder → no-op, викреслити.
  - **childAbove (ефект «б») — ЄДИНА реальна зміна.** Але обидва lead-org ребра завжди childBelow (яруси 1→2, 2→3). → childAbove lead-org **недосяжний у проді** (lead-org синтезує оркестратор, хост не інжектить).
  - «Змінює golden свідомо» ПЕРЕБІЛЬШЕНО: avoid lead-org golden нема, зміна адитивна; h6 і lead_org_person_to_org_card_resolves (non-avoid) не зачіпаються.
  - Висновок: A2.3 = TS-паритет для prod-недосяжного кейсу. RED-тест МУСИТЬ бити в childAbove (інакше assert-без-фічі). → scope-рішення власнику: реалізувати як захисний паритет чи пропустити як доведений no-op.
  **ДИСКУСІЯ З КРИТИКОМ (власник: «дивіться по принципу відповідальності», append у `_r7-a2-3-critic-dg26.md`):**
  - (а) childAbove lead-org недосяжний ПІДТВЕРДЖЕНО по коду (compose_tiers cursor_y монотонно вниз `staff_compose.rs:42,64`; recenter лише X `:72-82`; card_y нижче tier2 `staff_layout.rs:1038`; external-pin лише всередині tier1; sameBand+gap строго взаємовиключні). Lead-org-only precedence = no-op.
  - (в) РЕАЛЬНИЙ БАГ: matrix/dotted з `input.reports` (`staff_layout.rs:1109-1127`) host-довільні, напрям не обмежений → childAbove PROD-ДОСЯЖНО. Ладдер: preferHorizontal→H; H блокований→V=route_ortho (завжди вниз)→хибний напрям. detour база теж route_ortho. TS V=verticalPolyline (напрям+nullable).
  - (б) ПРИНЦИП ВІДПОВІДАЛЬНОСТІ: route_vertical потрібен НЕ як lead-org-only, а як **ЗАМІНА route_ortho→route_vertical у V-слотах ладдера** (`staff_routes.rs:506,536`). Фіксить досяжний matrix/dotted childAbove, суб'юмить lead-org, точний порт TS (:388/:391), прибирає вироджений route_ortho на no-gap.
  - **ПЕРЕОСМИСЛЕНИЙ A2.3** = «route_vertical як V-кандидат ладдера». Golden ширший: childBelow ідентично; childAbove matrix/dotted + no-gap-вироджені зміняться (faithful-порт). detour-база лишає route_ortho (вертикало-центрична, прийнято). RED-тест: matrix childAbove, H недоступний → очікувати route_vertical (вгору), не route_ortho (вниз).
  - **ОЧІКУЄ ПІДТВЕРДЖЕННЯ ВЛАСНИКА** (scope+golden); НЕ фіксувати як рішення власника до відповіді.
- **A2.4 deptTop синт-порт + ends_on_dept_top** (зона: `staff_geom.rs` FrameRect.head_id НОВЕ поле; `staff_layout.rs` заповнення head_id; `staff_routes.rs` синт-порт). admin-edge у голову відділу (frame.head_id==to_id && from не член рамки) → routeTo синт-бокс {to.centre_x, frame.y, 2×2}, зберегти to_id для obstacle-skip/foreign-frame, `ends_on_dept_top=Some(true)`. Змінює golden + контракт (head_id).
  **КРИТИК A2.4 → 🔴 NO-OP/REFRAME (`_r7-a2-4-critic-dg26.md`):** deptTop ключиться на kind=admin (оракул :455), але admin ВІДСУТНІЙ у Rust staff_routes edge-set (staff_layout.rs:903 vec → лише lead-org 1091/1101 + matrix/dotted 1122; admin = ploeg row-tree :695-704, НЕ роутер). Faithful-порт = NO-OP. R2: емісія admin у staff_routes → ризик ПОДВІЙНОГО малювання (дерево+полілінія) — принципова TS↔Rust розбіжність. R3: нема per-dept голови в Rust (лише per-ORG). R4: Rust routes 0 рантайм-консюмерів (live/SVG через TS resolveStaffRouting) — вся A2 producer-side, verify golden/тестами, wiring на A3/A4.
  **ФОРКИ ВЛАСНИКУ (принцип відповідальності; НЕ код до рішення):** (а) розширити edge-set cross-dept admin (великий, ризик R2, імовірно ORG-рівень); (б) лишити admin деревом → ends_on_dept_top=None у Rust, deptTop борг до admin-уніфікації [РЕК]; (в) відкласти до уніфікації admin-роутингу. Reframe на lead-org РОЗХОДИТЬСЯ з оракулом (TS не ставить deptTop для не-admin).
- **A2.5 edgePort→person_hints wiring** (зона: `staff_layout.rs`). Будувати PersonEdgeHints (GojsRow/FigmaRow) з edgePort/style-даних входу, передати в RouteInputs замість `&[]`. Оракул: TS-резолвер hints (знайти перед кодом). Змінює golden (figma-row порт на tile).

## OPEN (на «го» перед TDD)
1. **Розширення зони.** A2.4/A2.5 чіпають `staff_layout.rs` (зона A1) + `staff_geom.rs` (head_id) + можливо `types.rs`. Рядок 19 хендофу називає лише 2 файли. Пайплайн серійний → конфлікту зон нема. Підтвердити розширення.
2. **Порядок** A2.1→A2.5 (перф-перший, щоб golden-зміни йшли одним блоком A2.2-A2.5). ОК?
3. **FrameRect.head_id** vs зовн. map headId→frame. Поле простіше й локальне. ОК?

## Відкриті борги (успадковано)
- detach-collision golden (на P3), A10 перф вимір (R10).
