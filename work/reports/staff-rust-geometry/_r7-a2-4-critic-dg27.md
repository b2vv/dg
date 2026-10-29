# A2.4 deptTop — незалежна верифікація критика (Dg27)

Модель: claude-opus-4-8

ДАЛІ: прочитав робочий файл і TS-оракул. Тепер звіряю Rust-пайплайн: admin_parent_map, detached_root_ids, frames_rect build, staff_routes edge-loop, FrameRect/key, member_of. Ключовий фокус — T3/T4 (per-part vs per-dept) і T5 (синт 2×2 крізь ладдер).

## ФАКТ 1 — TS-оракул перевірено на первинному коді
- `resolveDeptHeads.ts:24-27`: adminParent по ВСІХ reportLines ГЛОБАЛЬНО, `kind==='admin' && fromId!==toId`, `adminParent[toId]=fromId`. БЕЗ org-фільтра. → T1 джерело.
- `:30-38`: root per dept — `adminParent[id]` undefined АБО `deptOf[parent]!==dept`.
- `:41-44`: `roots.sort()` лексикографічно, `roots[0]`. → T2 джерело (коментар :9 про H6).
- dept без roots → відсутній у map.

## ФАКТ 2 — TS frame per-DEPT
`staffRouterV2.ts:64-78`: один rect на DEPT = `unionBoxes(members, framePadding??8)` (:68); `memberIds`=всі члени; headId на рамку ЛИШЕ якщо `memberIds.has(headId)` (:76).
`staffEdgeGeometry.ts:454-460`: headFrame лише при `edge.kind==='admin'` (:455); `routeTo={id:to.id, x:to.x+to.w/2-1, y:headFrame.rect.y, 2×2}`; `endsOnDeptTop:true` лише коли headFrame знайдено (:473).

## ФАКТ 3 — РЕТРАКЦІЯ Dg26 ПІДТВЕРДЖЕНА (admin ДОСЯЖНИЙ). План:55 застарів.
Первинний код:
- `layout_staff_org_block` повертає `edges: admin_edges(&in_org, reports)` (`staff_layout.rs:797`); `admin_edges` (:721-735) емітить ВСІ admin-reports у наборі, `kind=r.kind`.
- `pin_external_managers` ДОДАЄ admin-ребра зовнішніх менеджерів (:698-702).
- block1/2/expanded.edges → `edges.extend(...)` (:929, :960, :1022) → у головний `edges`-vec.
- `staff_routes(RouteInputs{edges:&edges,...})` (:1147-1155).
- `staff_routes.rs:511` `for edge in input.edges` БЕЗ kind-фільтра → admin РОУТЯТЬСЯ, продукують `StaffEdgeRoute`.
ВИСНОВОК: admin є у staff_routes edge-set. A2.4 — НЕ no-op. (План AGENTS-summary :55 відображає лише 1-й прохід Dg26; сам файл Dg26 :5-46 уже self-retracted до 🟡 — я згоден з ретракцією.)

## ФАКТ 4 — КЛЮЧОВЕ: у ЦЬОМУ пайплайні рамки PER-DEPT (part_index=None), НЕ per-part
`department_frames_from_nodes` (`staff_layout.rs:854-875`): групує ЛИШЕ за `department_id` (:861), викликає `department_frame(&dept, members, content_padding, 0.0, None)` (:872) — **part_index=None** завжди. Коментар :851-852: «part_index=None — magnetic-розріз B5 робить TS».
`frames_rect` будується з цих department_frames (:1131-1141), успадковує part_index=None.
Вузли в compute_staff_geometry мають part_index=None (magnetic split staff_packing НЕ викликається тут; grep: Some(part_index) лише у staff_packing/staff_clearance, не в layout-шляху compute_staff_geometry; group_staff_by_department :582-588 не чіпає part_index, external-pins :692 None).
→ member_of(head)=(dept,None), frame.key()=(dept,None) — СХОДЯТЬСЯ. ОДНА рамка на dept = union усіх членів = ТОЧНО як TS `unionBoxes(members)`.
→ Робочий файл :26 («рамки per-(dept,part)») ХИБНИЙ для цього пайплайну. T3/T4 per-part-розходження в compute_staff_geometry НЕ ВИНИКАЄ.

## ВЕРДИКТИ T1–T8

### T1 глобальний vs org-scoped adminParent — ПІДТВЕРДЖЕНО-РЕАЛЬНА (low-prob, але impl мусить global)
`admin_parent_map` (:80-101) org-scoped (фільтр org_id :85-89, дроп крос-орг :95-97). TS глобальний. Для РОЗВ'ЯЗКУ root у межах одного org різниці нема (крос-орг батько ⇒ інший dept ⇒ root в обох випадках). АЛЕ реальне розходження: якщо `departmentId` СПІЛЬНИЙ між двома org — TS `rootsByDept` ключить на departmentId ГЛОБАЛЬНО (union roots крос-орг, один head на обидва). `department_frames_from_nodes` теж групує за departmentId ГЛОБАЛЬНО (:861). → resolve_dept_heads МУСИТЬ бути global, щоб head узгоджувався з global-рамкою. Impl-зріз (крок 2: «НЕ перевикористовувати admin_parent_map», global) — ВІРНО. Вимога: adminParent без org-фільтра, групування roots за departmentId глобально.

### T2 сорт positionId vs input-order — ПІДТВЕРДЖЕНО-РЕАЛЬНА
`detached_root_ids` (:171-184) — INPUT-order (positions.iter). Переюз → хибно. TS `roots.sort()` (:42). Impl не переюзає — ок. ЗАСТОРОГА: Rust `String::sort` = UTF-8 bytes; JS default sort = UTF-16 code units. Для ASCII-id тотожно; для не-ASCII розійдеться. Якщо id гарантовано ASCII — безпечно; інакше потрібен code-unit-aware порядок. RED-тест має містити flip-order кейс (аналог H6).

### T3 per-part vs per-dept / from-виключення — СПРОСТОВАНО (per-part не виникає); from-exclusion на DEPT-рівні КОРЕКТНИЙ
Рамки per-dept (ФАКТ 4). Impl-зріз крок 3 («(dept,part)==frame.key()») надлишковий, але НЕшкідливий (обидва None). from-виключення: TS `!memberIds.has(fromId)` = whole-dept. Rust `member_of(from).dept != f.department_id` — ЕКВІВАЛЕНТНО (порівняння лише DEPT, не повного key). ВИМОГА: порівнювати department_id, НЕ повний DeptPart-key (інакше у гіпотетичному per-part світі sibling-part того ж dept хибно б отримав deptTop). Більшість admin-ребер — INTRA-dept (row-tree manager→report): member_of(from).dept==head.dept → виключені → докаються на картку, НЕ deptTop. Це критично й покрито from-виключенням.

### T4 паритет frame.y — ПОТРЕБУЄ-ЗАСТОРОГИ (головний реальний ризик A2.4)
Rust `department_frame` (`staff_packing.rs:34-41`): `y = min_y - pad - header(0)`; pad=content_padding. TS `headFrame.rect.y = unionBoxes(members, framePadding??8).y`. Паритет вимагає: (а) ті самі члени, (б) той самий min_y, (в) content_padding==framePadding(8), (г) unionBoxes віднімає pad без header. РИЗИК-ЕСКАЛАЦІЯ: до A2.4 frame.y входив лише у `foreign_frame_blocks` (`<pad` допуск, :407) та `frame_intrusion_count` (eps 0.75, staff_geom.rs:191) — субпіксельна похибка top БУЛА НЕВИДИМА. Тепер frame.y стає ТОЧНОЮ вихідною координатою routeTo.y → будь-яке субпіксельне розходження = байт-дифф у golden. ВИМОГА: RED-тест, що асертить routeTo.y == точний union-top рамки голови (а не лише в межах допуску), і звірка content_padding↔framePadding + LOD-залежності (frame рахується РАЗ із layout-нод, не per-LOD; TS deptFrames — звірити що теж не per-LOD/однакові).

### T5 синт 2×2 крізь ладдер — ПІДТВЕРДЖЕНО-КОРЕКТНА (з точним порядком)
Трасування admin org-head→dept-head, to_synth={head.cx-1, frame.y, 2×2}:
- same_band = |to_cy-from_cy| < min(from.h, **2**)*0.35 = **0.7px** (`staff_routes.rs:539`). dept далеко нижче → false → prefer_horizontal=false (admin) → порядок [V,H] (:560-564). ЦЕ = TS (sameBand на routeTo-2×2 теж 0.7px, admin не matrix/dotted → [V,H]).
- route_vertical (:98-120): child_below=true; (y1,y2)=(from.bottom, frame.y); clear_gap=from.bottom≤frame.y-0.5; corr=midY; endpoint=(head.cx, frame.y) — ТОЧНО deptTop-порт (елбоу/пряма як TS verticalPolyline).
- V blocked → H; H blocked → detour_edge→route_ortho base, port Top=(to.cx, to.y)=(head.cx, frame.y) — ТОЙ САМИЙ endpoint. → ends_on_dept_top від НАЯВНОСТІ headFrame, НЕ від вибору кандидата (= TS :473).
- is_clean: idx.clear_of скіпає to_id=head по id; foreign_frame_blocks скіпає dst=(head.dept,None) → власна рамка голови НЕ блокує (:403). ОК.
ВИМОГА (порядок): `to` замінити на синт-бокс ПЕРЕД обчисленням same_band/prefer_horizontal і ладдером — щоб вони рахувались на 2×2 (точно як TS classify(from, routeTo)). Синт-x = `resolve_box(head).cx - 1` (per-LOD resolved box, НЕ layout-нода), бо TS бере `byId.get(toId)` (візуальний бокс). ids у synth-боксі = реальний head id (obstacle-skip/foreign-frame keyять на id).

### T6 head_id не тече в golden (R7) — ПІДТВЕРДЖЕНО-БЕЗПЕЧНА
`FrameRect` (`staff_geom.rs:156`) derive лише Debug/Clone/PartialEq — НЕ Serialize/TS. head_id:Option<String> сюди безпечний. Golden-тип `StaffDepartmentFrameGeo` (types.rs:488) Serialize/TS — head_id туди НЕ додавати. frames_rect будується окремо (:1131-1141), head_id заповнюється при побудові frames_rect, НЕ з StaffDepartmentFrameGeo. (Міно: додавання поля міняє PartialEq → літеральні конструкції FrameRect у тестах доведеться оновити — компіляційне, не golden.)

### T7 ends_on_dept_top=Some(true) ЛИШЕ on hit — ПІДТВЕРДЖЕНО-ЧИСТА
`types.rs:573-576`: `skip_serializing_if=Option::is_none`, rename endsOnDeptTop. None→пропущено (=TS omit), Some(true)→`"endsOnDeptTop":true`. НІКОЛИ Some(false). Поточний код :601 None. ВИМОГА: Some(true) лише коли headFrame зматчено.

### T8 синт лише коли kind=="admin" — ПІДТВЕРДЖЕНО-РЕАЛЬНА
TS :455 строго `edge.kind==='admin'`. lead-org/matrix/dotted у головну-картку НЕ отримують deptTop. ВИМОГА: гейт строго kind=="admin" ПЕРЕД пошуком headFrame.

### T9 (ДОДАНО критиком) — member-гейт на ЛЕЙАУТ-нодах, не на positions
TS `staffRouterV2.ts:76` ставить headId лише якщо `memberIds.has(headId)` — memberIds з laid-out member boxes. resolve_dept_heads працює на input.positions; голова може НЕ бути laid-out-нодою в цьому view (LOD/collapsed). ВИМОГА: head_id ставиться на FrameRect лише якщо head-нода реально серед членів рамки (nodes з тим department_id) — тобто крок 3 impl-зрізу мусить звіряти з NODES, не лише з positions. Impl-зріз крок 3 («нода-голова має (dept)==frame.key()») це робить — підтвердити, що перевірка саме по laid-out нодах.

### T10 (ДОДАНО) — intra-dept admin докладніше
НЕ пастка, а підтвердження: переважна більшість admin-ребер — intra-dept row-tree (manager→report у тому ж dept). from-виключення (T3) коректно лишає їх на card-top. deptTop отримують ЛИШЕ cross-dept admin у голову. RED-тест мусить покрити ОБИДВА: cross-dept→deptTop і intra-dept→card-top (інакше assert-без-фічі).

## ПІДСУМОК
Головний блокер Dg26 (no-op) знято самим Dg26 і підтверджено мною: admin досяжний. Per-part-ризик (T3/T4 розходження гранулярності) СПРОСТОВАНО для цього пайплайну — рамки per-dept(None), member_of узгоджений. Реальні застороги: T4 (frame.y тепер вихідна координата → потрібен байт-точний паритет + dedicated RED), T5-порядок (синт ПЕРЕД ладдером, per-LOD resolved box), T1/T2 (global adminParent + sort positionId, не переюз org-scoped/input-order), T9 (гейт на laid-out нодах).

ВЕРДИКТ: 🟡 — impl-підхід ВІРНИЙ і ДОСЯЖНИЙ, блокера нема. Умови before-code:
1. resolve_dept_heads GLOBAL adminParent + roots-by-departmentId global + `roots.sort()` (ASCII-застереження); НЕ переюз admin_parent_map/detached_root_ids.
2. head_id на FrameRect ЛИШЕ коли head серед laid-out членів тієї рамки (T9); порівняння from-виключення на DEPT-рівні (T3).
3. Синтетичний бокс підставити ПЕРЕД same_band/ladder; x із per-LOD resolve_box(head); зберегти to_id (T5).
4. ends_on_dept_top=Some(true) лише on headFrame-hit; гейт kind=="admin" (T7/T8).
5. RED-тести: (а) cross-dept→deptTop з routeTo.y == точний union-top (T4 байт), (б) intra-dept→card-top (T10), (в) flip-order head (T2/H6), (г) non-admin у head → без deptTop (T8).
