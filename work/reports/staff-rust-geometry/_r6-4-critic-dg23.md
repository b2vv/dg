# R6-4 критик (Dg23) — незалежний критик перед зрізом

Модель: claude-opus-4-8

ДАЛІ: читаю дизайн-ноту _r6-4-design-dg23.md, design-v3.md (65-143, 160-161),
потім Rust-джерела (staff_routes, staff_clearance, staff_geom, staff_bounds, staff_packing, types),
_r6-boundary-dg22.md, _r6-missed-points-analysis-dg23.md §E. Центральне питання — конфлікт 4a vs K-loop.

## ФАКТ (прочитано код)
- staff_routes.rs:1-271 — R6-3b детур. Docstring:3-4 інваріант «бере ВЖЕ позиціоновані вузли... не перерозкладає». detour_edge:154 — per-edge, stateless, lanes = над/під кожною карткою (corridorY-зсув), перша чиста за |Δcorr0|. Нерозв'язне → base (залишок R6-4). card_pad≤0 вимикає.
- staff_clearance.rs:1-138 — TEST-ONLY (#[cfg(test)] у lib.rs per docstring:3). foreign_frame_intrusions:118 + FrameRect:100 (department_id/part_index/x/y/w/h) ВЖЕ Є. card_clearance:65. member_of closure (id→DeptPart). Детектор рамок уже написаний (test-only).
- staff_routes.rs:503-544 oracle-тест УЖЕ використовує foreign_frame_intrusions + FrameRect — детектор рамок є, але детур рамок — нема.
- Контракт StaffEdgeRoute = from_id/to_id/kind/points (НЕ має маркер-поля). R6-1..R6-3b контракт не чіпали.

ДАЛІ: читаю types.rs (StaffDepartmentFrameGeo:476, StaffEdgeRoute, StaffRouteSet) + staff_bounds.rs:135-153 (label_band) + staff_packing (part_index).

## ФАКТ (контракт + .dn)
- types.rs:545 StaffEdgeRoute {from_id,to_id,kind,points} — БЕЗ маркер-поля. StaffRouteSet:561 {lod,segments}.
  Усі derive(TS) export у rust-types.ts → будь-яке нове поле = ts-rs regen (перша зміна контракту після R6-1).
- types.rs:476 StaffDepartmentFrameGeo {department_id, part_index:Option, x,y,w,h} — джерело рамок ІСНУЄ.
  StaffNodeGeo:423 має department_id + part_index → member_of будується з них (прод-форма).
- `.dn` band: label_band СПОЖИВАЄТЬСЯ у vertical() (staff_bounds.rs:51-52 — top-=pad+label_band,
  height+=label_band), НЕ емітиться окремим rect. StaffNamespace-вихід має лише x/y/w/h. ⇒ окремого
  band-rect у виході НЕМА. `.dn`-як-перешкода вимагає НОВОГО джерела геометрії (підтверджує
  _r6-boundary-dg22 ВІДКРИТІ #2: «геометричного джерела в коді НЕМА, потрібне рішення власника»).
- design-v3 Amendment A п.3 (рядки 341-345): ЯВНО ділить (ii) route-lane мінімізація над ФІКСОВАНОЮ
  grouping = СТАРТ ТУТ; (i) K-loop re-invoke grouping = лише якщо (ii) не досягає §10.1.4=0. Тобто сам
  дизайн уже відокремлює route-only (R6-4) від relayout-K-loop (борг) → це ПРЯМИЙ доказ за вердикт A.
- design-v3:160-163: v3 СВІДОМО НЕ відтворює коридор/track §5.4 — лише frame-aware lane + маркер.
  ⇒ §5.4 доріжки у R6-4-roadmap дизайн-ноти = scope-creep проти design-v3, прибрати.

## ВЕРДИКТ: 🟡 YELLOW на старт
Не RED (0 хибних заяв; детектор рамок + контракт-фундамент існують, дизайн когерентний), але не GREEN:
три scope-пункти (A/B, `.dn`, §5.4) — рішення власника, і механізм around-lane має невирішену
алгоритмічну межу (нижче PIN-4). Це розвилки, не баги коду.

## A/B по конфлікту 4a → A (route-only lane + маркер; K-loop relayout лишається боргом 4a)
Докази:
1. Інваріант R6 (staff_routes.rs:3-4) + 4a власника = НЕ перерозкладати. K-loop (design-v3:124-129)
   = reorder+rebuild staffDeptGrouping+re-score = routing-driven RELAYOUT. Порушує обидва.
2. staff_routes приймає StaffNodeGeo (ВЖЕ позиціоновані) — не має reports/departments/positions для
   rebuild grouping. B вимагав би або (a) call-back у layout-WASM з усіма grouping-входами (велика
   зміна сигнатури+архітектури шва R3/R4/R5), або (b) репліку grouping у роутері («дві правди» layout).
3. Сам дизайн (Amendment A п.3) уже ділить (ii) route-lane=старт / (i) K-loop=якщо треба. A = (ii).
4. Маркер при A = ЧЕСНИЙ результат = панель мокапу «N через чужі деп» — головний deliverable варіанта C.
Застереження власнику: A дає чесний маркер, але НЕ мінімізацію через reorder → залишковий count буде
ВИЩИЙ за кінцеву ціль §10.1.4=0. Ціль 0 досягається лише після сплати боргу K-loop (i). A це визнає.
B ламає: тягне grouping+tier-offset relayout у routing-петлю = саме той «routing-driven relayout»,
який власник відклав; blast radius = R3/R4/R5 layout.

## Рекомендована МЕЖА R6-4 + поділ (дзеркалить R6-3a/3b та Amendment A ii/i)
- **R6-4a (брати зараз):** прод-білдер FrameRect з StaffDepartmentFrameGeo + member_of(dept_id,part_index);
  рамки входять у obstacle-set роутера (foreign-only, self-exempt); РЕЮЗ corridorY-lane R6-3b для легких
  блоків; залишок → **видимий маркер** (контракт +1 поле, regen). foreign_frame_intrusions лишається
  test-only оракулом. Доставляє чесний §12-маркер by construction.
- **R6-4b (лише якщо ручний гейт покаже недостатність):** багатший around-frame lane з БІЧНИМ обходом
  (lateral bypass) — коли corridorY-only не огинає ВИСОКУ рамку.
- `.dn` band — НЕ R6-4 (джерела геометрії нема; окремий пункт на рішення власника).
- §5.4 доріжки — НЕ R6-4 (design-v3:160-163).
- K-loop (i) — борг поза T126-R6 (4a). R6-7 = ярусні org-плінки/колапс (інше).

## Ранжовані пастки
1. (HIGH) **corridorY-lane НЕ огинає високу рамку збоку.** detour_edge (staff_routes.rs:183-202) зсуває
   лише ГОРИЗОНТАЛЬНИЙ конектор по y (lanes = ry±pad). Висока чужа рамка на вертикальному дропі вимагає
   БІЧНОГО обходу, якого механізм не виражає → багато frame-блоків впадуть у «нерозв'язне локально» →
   маркер. Якщо реюзати detour_edge як є — around-lane майже не огинає рамки, deliverable = «переважно
   маркер». Назвати власнику; саме це розділяє 4a/4b.
2. (MED) **Маркер мусить = фактичні інтрузії BY CONSTRUCTION.** Якщо прапор рахується окремо від
   foreign_frame_intrusions — маркер≠реальність (діра design-v3:116-117). Один вимірювач, один прохід.
3. (MED) **Паритет-регресія:** ребро без чужих рамок МУСИТЬ лишити R6-3b-вихід байт-ідентичним
   (контроль-проба як avoidance_is_byte_identical_when_no_card_blocks:573).
4. (MED) **Детермінований порядок рамок** в obstacle-set (department_frames вхідний порядок) + lane-сорт
   (вже детермінований R6-3b). Інакше H6 (R6-5) впаде.
5. (LOW) **Змішані self-exemption простори:** картки (id), рамки (dept_id,part_index), org-кінці (None).
   per-part A: рамка (d,part1) чужа ребру в (d,part0). Уже в детекторі (staff_clearance.rs:271-295) — білдер
   прод-member_of мусить відтворити ту саму семантику.
6. (LOW) ts-rs regen — перша зміна контракту; звірити, що rust-types.ts регениться й споживачі (StaffEdgesView
   колір 0xdc2626, svgExport) читають нове поле однаково (паритет R6-6).

## 2-4 піни перед TDD
- PIN-1: Маркер = ОДНЕ адитивне optional-поле на StaffEdgeRoute (serde default, ts optional), значення =
  foreign_frame_intrusions ПІСЛЯ роутингу, by construction. Відхилити паралельний markedCrossings-список
  (join у рендері, дві правди про те саме ребро).
- PIN-2: Контроль-проба паритету: ребро без чужих рамок → байт-ідентично R6-3b (no-op).
- PIN-3: member_of прод = (department_id, part_index) з StaffNodeGeo; own-frame self-exempt; org-кінці None;
  per-part A — та сама семантика, що test-детектор.
- PIN-4: ЗАФІКСУВАТИ рішення: R6-4a реюзає corridorY detour_edge (легкі блоки + маркер) vs R6-4b додає
  бічний обхід. Не починати код around-lane, доки власник не підтвердив поділ.

## Винести власнику
E1: A vs B → A (route-only lane + маркер; K-loop relayout = борг 4a). Підтвердити.
E2: `.dn` band — джерела геометрії нема (label_band згорнуто в namespace, staff_bounds.rs:51-52). Прибрати з R6-4; окреме рішення про джерело.
E3: §5.4 доріжки — НЕ в v3 (design-v3:160-163). Прибрати з R6-4-roadmap.
E4: маркер = перша зміна контракту (ts-rs regen) — прийняти адитивне поле.
E5: поділ R6-4 → 4a (frame-obstacle+маркер, реюз corridorY) / 4b (бічний around-lane якщо ручний гейт покаже потребу).
