Model ID: claude-opus-4-8

ДАЛІ: читаю staff_routes.rs (тести h6_* + h6_scene), staff_geom.rs, staff_edge_box.rs (visual_person_edge_box), types.rs; потім критика.

## ФАКТ — прочитано
- staff_routes.rs повністю (роутер + тести, h6_scene @807, golden @843, 2-run @890).
- staff_edge_box.rs: visual_person_edge_box @97; near без hints → person_visual_world_rect → full box (x,y,w,h), obstacle None (@106-144, near-гілка match None => {} @141, тоді world_rect).
- staff_geom.rs: port/obstacle_rect/seg_rect_distance/frame_intrusion_count/FrameRect.key/DeptPart.
- types.rs: StaffRouteSet/StaffEdgeRoute/StaffRoutePoint — усі derive Debug.

## ФАКТ — незалежний перерахунок h6_scene (near, pad=16)
Персони near-box = raw rect. Cards={P,A,S,T,M,N,X}. Frames df(610,120,120,60)/dh(120,200,60,30) обидві foreign (всі ребра d1).

### P→A
- port bottom P=(50,50), top A=(250,300). corridor=corr0=(0+50+300)/2=175.
- base elbow [(50,50),(50,175),(250,175),(250,300)] — seg2 y=175 x50..250 перетинає X(120,160,60,30, y[160,190]) → dist 0 <16 → БЛОКОВАНО.
- obstacles P→A = S,T,M,N,X,df,dh (7 шт, НЕ один кандидат).
- raw lanes (ry±pad): S{-16,66} T{284,366} M{-16,66} N{284,366} X{144,206} df{104,196} dh{184,246}.
- sort@216→ dedup@217 → [-16,66,104,144,184,196,206,246,284,366].
- sort@218 за |lane-175|: [184(9),196(21),144(31),206(31),104(71),246(71),66(109),284(109),-16(191),366(191)].
- try 184: y=184 ∈ X[160,190] → crosses → reject. try 196: X gap 6<16 (і dh gap 4) → reject. try 144: X gap 160-144=16 (не <16 → ОК), dh далеко, усе інше далеко → CLEAN.
- → [(50,50),(50,144),(250,144),(250,300)]. §12: y=144 гориз + верт x50/x250 не чіпають df(x610)/dh(y200) → intrusions=0 → marked None. **ЗБІГ з golden @851.** ✓

### S→T
- ports (650,50)/(650,300), aligned x=650 → base straight [(650,50),(650,300)].
- df(610,120,120,60): верт x=650 ∈[610,730], y[120,180] на шляху → dist0<16 → блок. detour: |ax-bx|=0 → straight → return base (залишок).
- §12: x=650 пробиває df interior (sample t=0.375→y=143.75 ∈[120.75,179.25]) → intrusions≥1 → marked Some(true). **ЗБІГ з golden @862.** ✓

### M→N
- ports (-350,50)/(-150,300). corridor=175. elbow [(-350,50),(-350,175),(-150,175),(-150,300)].
- усі перешкоди x≥0 (найближча P x0, gap 150) → CLEAN → base. §12: frames x≥120 → 0 → None. **ЗБІГ з golden @872.** ✓

Порядок сегментів edges=[P→A,S→T,M→N] збережено (роутер @253 ітерує по edges, НЕ сортує). lod "near". ✓

## РІШЕННЯ — відповіді на питання
1. Арифметика всіх трьох golden-сегментів ПІДТВЕРДЖЕНА незалежно. Жодної хиби в очікуваних значеннях. P→A y=144 ✓, S→T straight Some(true) ✓, M→N elbow y=175 ✓.

2. Зуби golden:
   - expected виведено незалежно з фікстури й збіглося — НЕ скопійовано з actual (я порахував окремо).
   - M→N пінить corridor-формулу @74 (y=175). P→A пінить lane-offset (±pad) і detour-селекцію: два НАЙБЛИЖЧІ до corr0 кандидати (184 від dh, 196 від df) реально пробуються й відхиляються ДО 144 → selection-order справді під тестом. S→T пінить §12-маркер в обидва боки (одна Some(true), дві None).
   - НАДМІР у коментарі @800: "ловить … dedup" — НЕправда. Дублі-доріжки не змінюють обрану доріжку (route_clear_of дає той самий результат) → видалення dedup вихід НЕ змінює → golden його НЕ ловить. Неблокуюче, але твердження коментаря неточне.
   - Самовпевненої діри-rubber-stamp НЕМА: три сегменти б'ють три РІЗНІ гілки (clean-elbow / straight-remnant+marker / detour-selection).

3. Заява про tie-break ПРАВДА. `.then(a.partial_cmp(b))` @220 редундантний: вхід у sort@218 вже зростаючий (sort@216 + dedup зберігає порядок), а slice::sort_by СТАБІЛЬНИЙ → за рівних |Δcorr0| зростаючий порядок значень зберігається без .then(). Конкретно пара 144/206 (обидві |Δ|=31): 144<206 у вході → стабільний sort лишає 144 першою й без .then(). Отже golden НЕ ловить видалення .then(). Міркування автора коректне.

4. Фікстура справді "кілька рамок/карток": P→A має 7 перешкод (5 карток + 2 рамки) → 14 raw → 10 унікальних доріжок. sort/dedup/селекція реально задіяні; рамки df/dh дають саме два перші-за-|Δ| кандидати (196,184), що відхиляються. НЕ один кандидат.

5. Багів у тестах нема: порти bottom=(x+w/2,y+h)/top=(x+w/2,y) відповідають port()@61; near-person=raw box підтверджено staff_edge_box.rs; членство — df/dh foreign, X — картка d2 (не ендпоінт, dept неістотний). Debug-порівняння безпечне: обидва боки — той самий тип через ту саму Debug-реалізацію, тож форматування f32 збігається by construction.

РІШЕННЯ: APPROVE. Два неблокуючі зауваження: (а) коментар @800 переоцінює — golden НЕ ловить ні dedup, ні tie-break .then() (останнє автор чесно визнає в Q3); (б) все інше коректне й із зубами.
