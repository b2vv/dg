claude-opus-4-8

ДАЛІ: читаю staff_router.rs (блок T4), lib.rs re-export, plan.md:63-64, spec.md (AC5/AC8/§5.1), tasks.md:25, staff_geom.rs:190-194, мокап shps-links.js.

## ФАКТИ (звірка з еталоном)

1. dept_ok fidelity — ВІРНО. staff_router.rs:508-550 — усі 6 гілок у порядку мокапу :92-100
   (target-entry B / outside-margin / foreign None→false / header-band→false / inner-inset / source-exit A).
   in_x=(dx1+14,dx2-14) :512. seg_hits_rect→edge_hits :301-308 строга нерівність = hit :89.
   FRAME_MARGIN=14/HEADER_BAND=38/FRAME_INSET=12 :241-245. Гілка1 sy2<=dy2-12, гілка6 sy2>dy2-12 — як мокап.
   Роль A='A'=Source(exit-down), B='B'=Target(entry-top) — збіг.

2. role per-(dept,part) — ВІРНО. :671-686 key=(department_id,part_index), from_key/to_key проти member_of,
   дзеркально frame_intrusion_count staff_geom.rs:191-193 (f.key()). org None не матчить (None==Some→false→foreign).
   Sibling-part має інший part_index → role None → блок (per-part keying і є захистом від sibling-exempt).

3. ok()-exempt — ВІРНО. :705 exempt = endpoint && vert && seg.x≈cx → raw, інакше padded.
   Чужа картка завжди padded. matrix_blocked→hits_card еквівалент мокапу :136 (r=!PC.some). +SX гілка відсутня = N2 scope.

4. A*-коректність — ВІРНО. state=node*3+dir :716-717. stale-skip carry-g :742 `e.g>g[e.state]` коректний,
   свіжі не відкидає (при push e.g==g[state]), без f-h subtraction (краще за мокап, без f32-eps). dir0⇒dj=1 :758,
   вхід target⇒dj=1 :761, goal dir==2 :748 = AC5. turn лише dir!=0&&nd!=dir :775. Реконструкція+simplify :801-813 орто.
   Межі перевірені ДО касту :754, mh/mv індекси в межах. Евристика Manhattan*1.0 admissible при turn≥0 → оптимальність.

5. Детермінізм AC8 — ВІРНО. QEntry Ord :600 o.f.total_cmp(&self.f).then(o.seq) = min-heap по (f,seq), total_cmp тотальний.
   seq монотонний унікальний :727,785. Жодної ітерації HashMap у пошуку (pc/frame_roles — Vec у порядку).

6. best_effort — ВІРНО. off-grid порт (xi/yi None :639-647) АБО goal None :796-798 → fallback 4 точки mid-Y, failed=true,
   без паніки. Порт-перевірка ПЕРЕД будь-яким індексуванням (nx/ny лише len). Index-OOB неможливий до перевірки.

7. Тести чесні — ТАК. foreign-frame через through_foreign==0 (сильний детектор) :1322. detour-card через
   polyline_hits_box_interior :1289. "enters from above" p.y<q.y реально перевіряє напрям :1227. off-grid тест
   сам ассертить xi(355)/yi(305)==None :1337 (самоперевірний). crossing/overlap/near/through — поведінкові, впали б без фічі.
   ЗАУВАЖЕННЯ (non-blocking): astar_is_deterministic — слабкий гейт AC8 (пройшов би за будь-якого детермінованого алго,
   HashMap у межах процесу стабільний); але AC8 тримається by-construction через seq-tiebreak, не через цей тест.

8. Scope — ЧИСТО. T5-occupancy/ваги відсутні (коментар :467-470, cost=len+turn). Жоден тест не ассертить 0 overlaps
   multi-edge (N7). sec/+SX відсутній (N2). Жодної T7/T8-логіки. 19 тестів тільки single-edge router + детектор-фікстури.

ПРОГОНИ: cargo test staff_router → 19 passed/0 failed. clippy -D warnings → чисто. fmt --check → чисто.
lib.rs:33-36 re-export astar_route/build_corridor_grid/AStarRoute/CorridorGrid/route_stats/RouteStats/diagonal_segments.

## ВЕРДИКТ: ПРИЙНЯТИ
Блокерів немає. Код — вірний переказ мокапу з двома узгодженими адаптаціями (per-part role; f64 total-order heap + carry-g).
Non-blocking зауваження: astar_is_deterministic слабкий як AC8-гейт; cap-hit (ITER_CAP) не має прямого тесту (ділить best_effort з off-grid, покритим).
