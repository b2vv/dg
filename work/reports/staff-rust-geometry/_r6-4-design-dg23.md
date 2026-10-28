# R6-4 дизайн/межа (Dg23) — §12 around-frame lane + маркер + білдер рамок

## Вхід (handoff roadmap): R6-4 = §12 around-frame lane + K-loop + маркер залишку +
білдер рамок/`.dn` (перенесено з R6-3a рішенням b) + спільні доріжки коридору §5.4.

## design-v3 §12/§6.5 (прочитано, рядки 65-143)
- **around-frame lane:** перед `forced` пробувати обхід ЧУЖОЇ рамки як перешкоди
  (рідну рамку пропускаємо — ендпоінт усередині). §Рішення п.2-3.
- **§12 драбина покриває І edge-edge, І frame-intrusion** (polylineHitsBoxInterior проти deptFrames).
- **§6.5 K-loop:** якщо перетинів >0 — ≤K проходів: **reorder сиблінг-депів → rebuild staffDeptGrouping
  → re-score над тими самими boxes**, міра монотонно спадає, стоп у K або 0; тоді **видимий маркер
  залишку** (не тихе прийняття). loose-бакет (NO_DEPARTMENT_ID) рамки НЕ дає.
- рамки = `unionBoxes(memberBoxes[dept], pad)`; рідна — не перешкода (from/to ∈ memberIds).

## 🔴 КОНФЛІКТ ЗІ СКОУПОМ — винести власнику
**§6.5 K-loop reorder+rebuild = routing-driven RELAYOUT.** Власник рішенням **4a** виніс relayout §6
**за межі T126** (борг). Також інваріант R6 (R6-1 docstring): «бере ПОЗИЦІОНОВАНІ вузли, НЕ перерозкладає».
K-loop обидва порушує. Отже R6-4 не може містити K-loop reorder/rebuild без реверсу 4a.

**Дві межі R6-4 (рішення власника):**
- **(A) без relayout (узгоджено з 4a):** around-frame lane (route-only обхід чужих рамок) +
  frame-intrusion детект + **видимий маркер** на залишках, яких lane не прибрав. K-loop reorder =
  лишається боргом (4a). Доріжки §5.4 — теж лише локальні (route-only), без reorder.
- **(B) з relayout:** реверс 4a, K-loop reorder+rebuild у Rust (великий, ламає інваріант «не перерозкладає»).

Рекомендація (моя, підлягає критику+власнику): **(A)** — узгоджено з 4a й інваріантом R6; маркер робить
залишок чесно видимим (рівно як панель мокапу «N через чужі деп»). K-loop relayout — окремий борг.

## Відкриті дизайн-питання (критику)
1. Межа A vs B (конфлікт 4a).
2. **Контракт маркера:** як нести «залишковий перетин»? StaffEdgeRoute має from_id/to_id/kind/points.
   Маркер = нове поле (fail:bool) АБО окремий список markedCrossings у StaffRouteSet? Це може
   тригернути ts-rs regen (на відміну від R6-1..R6-3b, де контракт не мінявся) — зважити.
3. **Білдер рамок (з рішення b):** FrameRect per-part із StaffDepartmentFrameGeo + `.dn`-band ОКРЕМИМ
   входом (label_band губиться в enrich, staff_bounds.rs:135-153). Детектор foreign_frame вже є (test).
   Тепер потрібен прод-білдер + around-lane споживач. membership з node.department_id+part_index.
4. **Around-frame lane метод** (узгоджено з локальним детуром R6-3b): обхід рамки як великого
   прямокутника тим самим corridorY-lane-механізмом? Чи потрібні бічні порти/обхід збоку?
5. **Доріжки §5.4** (спільний коридор, крок 8px): route-only track-алокація пер-ребро — у R6-4 чи далі?
6. Детермінізм; паритет (ребро без чужих рамок = R6-3b-вихід незмінний).

## ✅ РІШЕННЯ ВЛАСНИКА (Dg23) — критик YELLOW, вердикт A, всі E1-E5 прийнято
- **E1 = A:** route-only around-lane + маркер; K-loop relayout лишається боргом (4a). B відхилено
  (тягне relayout у routing → blast radius R3/R4/R5; ламає інваріант «не перерозкладаємо»).
  Доказ: design-v3 Amendment A (341-345) УЖЕ ділить (ii) route-only / (i) K-loop re-invoke.
- **E2:** `.dn`-band ПРИБРАНО з R6-4 — джерела геометрії нема (label_band згортається, staff_bounds.rs:51-52).
- **E3:** доріжки §5.4 ПРИБРАНО з R6-4 — v3 свідомо не відтворює track-роутер (design-v3:160-163).
- **E4:** маркер = ОДНЕ адитивне optional-поле на StaffEdgeRoute = **перша зміна контракту після R6-1**
  → ts-rs regen rust-types.ts (A8: types.rs+regen в одному диффі).
- **E5:** поділ **R6-4a** (реюз corridorY-lane + маркер, зараз) / **R6-4b** (бічний обхід, лише якщо
  ручний гейт покаже недостатність). K-loop(i) — борг поза T126.
- **Caveat прийнято:** R6-4a — переважно ЧЕСНИЙ МАРКЕР, не 0 (0 → R6-4b + борг K-loop).

## R6-4a — scope + піни (TDD red-first)
Піни: PIN-1 маркер = адитивне optional-поле by construction (= foreign-frame check після роутингу),
НЕ паралельний список. PIN-2 паритет-контроль (ребро без чужих рамок → no-op, байт-ідент R6-3b).
PIN-3 прод member_of = (department_id, part_index) зі StaffNodeGeo; own-frame self-exempt; org-кінці None.
PIN-4 R6-4a=реюз corridorY+маркер (бічний обхід = R6-4b).
Архітектура (без двох правд): промоут interior-hit + FrameRect + per-edge frame-intrusion з
staff_clearance(test) → staff_geom(прод); staff_clearance реюзає. staff_routes += department_frames вхід,
around-lane (чужі рамки як перешкоди в detour), marked by construction. Білдер build_dept_frames зі
StaffDepartmentFrameGeo. member_of з persons (department_id+part_index).

## Журнал імплементації R6-4a (Dg23)
- **types.rs**: +`marked: Option<bool>` на StaffEdgeRoute (адитивне, serde default/skip, ts optional).
  Регенеровано rust-types.ts → `marked?: boolean` (E4, перша зміна контракту після R6-1).
- **staff_geom.rs** (прод): +INTERIOR_EPS, interior-hit (segment/polyline), FrameRect+key, DeptPart,
  frame_intrusion_count (per-edge, per-part A). Спільне джерело для роутера й оракула.
- **staff_clearance.rs**: рефактор — FrameRect/interior-hit/frame-intrusion з staff_geom;
  foreign_frame_intrusions = сума frame_intrusion_count. card_clearance лишився.
- **staff_routes.rs**: RouteInputs += department_frames; member_of з persons; obstacles_for_edge
  (картки крім from/to + ЧУЖІ рамки крім рідної per-part A); detour узагальнено на ObstacleRect-список
  (around-lane = рамки як перешкоди тим самим corridorY); §12-маркер `marked=Some(true)` by construction
  (frame_intrusion_count>0 на фінальному маршруті).
- 8 R6-4a-дотичних тестів: паритет без рамок (маркер None), чужа розв'язна→огинається без маркера
  (МУТАЦІЯ рамки-не-перешкоди → падає, вивірено), чужа нерозв'язна→маркер Some(true), рідна рамка не
  перешкода й не маркер (per-part A), маркер==детектор by construction.
- Гейти: core 93/93, fmt, clippy -D warnings, SDK typecheck — усі зелені.
- ДАЛІ: ревʼю-агент → коміт з «го» (R6-4a). R6-4b (бічний обхід) — за потреби пізніше.
