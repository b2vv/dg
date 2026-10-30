Model: claude-opus-4-8

ДАЛІ: читаю plan.md:68, tasks.md:28, staff_router.rs (route_edges_ripup ~820, route_scene відсутній, Occupancy, astar_route), staff_routes.rs (route_ortho:71, elbow_or_straight:79, route_stats:169, схеми:1672, harness astar_schema_stats ~1860), мокап shps-links.js. Перевіряю 7 пунктів завдання.

ФАКТ (залежність модулів): lib.rs:13-14 — `mod staff_router; mod staff_routes;` — ОБИДВА модулі ОДНОГО крейта packages/core. staff_routes:1660,1866 посилається `crate::route_stats`, `crate::route_edges_ripup` зі staff_router. staff_router.rs:24-29 НЕ посилається на staff_routes. Rust НЕ забороняє взаємні посилання модулів усередині одного крейта → «циклічна залежність» для reuse route_ortho = ХИБНА підстава.

ФАКТ (route_ortho): staff_routes.rs:71-76 `fn route_ortho(from,to)` приватна; corridor=(from.y+from.height+to.y)/2.0 = midY; :79-91 elbow_or_straight. :97 коментар: «для childBelow+gap тотожний route_ortho байт-у-байт (corr==midY)». T0-інвентар (tasks.md «REUSE — Орто-білдери (int-tree T7): port:61, route_ortho:71, elbow_or_straight:79...») ЯВНО планує REUSE route_ortho для int-tree T7. Проп. дизайн (PORT) СУПЕРЕЧИТЬ закоміченому T0.

ФАКТ (мокап класифікація :107-112): kind = m.d && m.d===c.d ? int : m.d && c.d ? cross : ext. det-набір = int (by=mc.y+mc.h+LV/2, :109) ПЛЮС підмножина ext: org-голова→корінь-блоку (!m.d, :110, by=+BV/2). secondary(:112) ЗАВЖДИ ast(A*), kind cross/ext, НІКОЛИ не int — навіть при однаковому депі.

ФАКТ (мокап det-elbow :113): tgt для int → card top (cc.y), бо :105 d.head===c дає d.y1 лише коли дитина = head депу; head має менеджера в ІНШОМУ депі → це cross/ext, не int. Отже int ніколи не докінгує в dept-top; route_ortho(to.top=card top) коректний для int.

ФАКТ (route_stats same-manager): staff_router.rs:182-198 — same_manager (from_id==from_id) звільняє ЛИШЕ overlaps(:194), НЕ crossings. proper_cross(:187) рахується навіть same-manager, але T-junction (вершина, не інтер'єр) звільнений. Шина int-дерева: діти share from_id=manager → колінеарні overlap шини ЗВІЛЬНЕНІ; вертикальні спуски на різних x не перетинаються.

ФАКТ (ФІКСТУРИ S0-S9, staff_routes.rs:1672-1784): S1(m,a,b), S2(h,a,b,c), S4(m1,m2,c1,c2), S5(m,sib,gc), S7(w,w0..9), S9(m,big,n) — УСІ `node()` БЕЗ department_id. schema_member(:1645-1650) → department_id None → member_of повертає None. Отже за класифікацією (int=обидва Some&eq) ЦІ схеми = EXT → A*, НЕ int-elbow. Лише S3(node_dept m=A,ca=A,cb=B), S6(ceo plain, ha=A, hb=B), S8(m=A,cb=B) мають депи.
  - S3: m→ca (A,A) = INT→elbow; m→cb (A,B) = cross→A*.
  - S6: ceo dept-less → ceo→ha, ceo→hb = EXT→A*. Жодного int.
  - S8: m→cb (A,B) = cross→A*. Жодного int.
  ВИСНОВОК: у ВСЬОМУ AC10-наборі рівно ОДНЕ int-ребро — S3 m→ca. Теза завдання «int-елбоу на S1/S2/S7» ХИБНА щодо фікстур (там нема депів).

ФАКТ (harness): staff_routes.rs:1894 astar_schema_stats жене route_edges_ripup. Проп. дизайн вимагає перемкнути харнес → route_scene. route_scene МУСИТЬ жити в staff_router (прод), щоб прод adaptStaffGeometry (T8) і гейт кликали ОДИН вхід — інакше гейт тестує не те, що шипиться.

АНАЛІЗ S3 m→ca elbow: m bottom (50,50), ca top (-100,260), corridor=(50+260)/2=155. pts [(50,50),(50,155),(-100,155),(-100,260)]. frame A x[-170..120] y[-20..320] — уся шина всередині frame A (own dept) → 0 foreign. m→cb — from∈A,to∈B, детектор звільняє frame A і B (D==A||D==B). int(ліворуч-вниз) vs cross(праворуч-вниз), спільний from=m → overlap-exempt; розходяться → crossing малоймовірний, старт-вершина = T-junction exempt. S3 найпевніше лишається 0/0/0/0/0, АЛЕ це мусить підтвердити ЗАПУСК гейта.
