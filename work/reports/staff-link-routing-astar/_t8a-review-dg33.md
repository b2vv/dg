# T8(A) рев'ю-після (R6) — dg33

Модель: claude-opus-4-8

ДАЛІ: звірив diff обох файлів, детур staff_routes, route_scene/build_corridor_grid, far-LOD бокс; прогнав fmt/clippy/test.

## ФАКТИ
1. GOLDEN-SAFE: staff_layout.rs call-site лише винесено RouteInputs у змінну (поля ідентичні), виклик `resolve_staff_routes(&route_inputs, dims.w, dims.h, DEFAULT_STAFF_ASTAR)`. const=false ⇒ else-гілка → `staff_routes(input)` — та сама функція, той самий input ⇒ байт-ідентично. dims.w/h лише в route_via_astar (мертва в рантаймі). Нічого навколо детур-входу не змінено. ✔
2. B1: route_via_astar start=(obstacle_rect(from).cx,.bottom), target=obstacle_rect(to). build_corridor_grid сідає сітку саме на obstacle_rect кожної картки (router :392,:420-426) ⇒ порти на grid-лініях. Far-дот (staff_edge_box: FAR_DOT_RATIO 0.18) стискає 160×120→~43 ⇒ bottom боксу ≠ raw y+120 ⇒ raw-нод порт впав би off-grid→failed→marked. Тест дискримінує (не вакуум). ✔
3. B2: build_card_set включає org_cards (:252-256); route_via_astar кличе її; route_scene сідає grid із усіх cards. org o1 у card-set (тест асертить). ✔
4. B3: скіпи ідентичні детуру (self-loop :687; dangling :704). specs/meta в input-order; route_scene вертає input-order (single_pass out[idx]). kind із edge по index. ends_on_dept_top=dept_top_y.is_some() = детур `.map(|_|true)`. marked=(failed||intrusions>0): додатковий failed документований і коректний per AStarRoute-doc (:519-524); детур не має failed-поняття. ✔
5. deptTop паритет: гейт admin && head_id==to && from_dept≠frame.dept = детур :715-721; target=(obstacle_rect(to).cx, frame.y). (box.cx vs obstacle_rect.cx розходяться під figma-row — навмисно, для grid-вирівнювання A*; golden-неважливо). ✔
6. admin_reaches/edge_is_secondary промоутнуті на рівень модуля; вжиті route_via_astar + тест-harness; ac10/t7/ripup зелені; дублікатів нема; clippy -D warnings чистий (нема dead_code). ✔
7. Контракт: EdgeSpec/AStarRoute/route_scene/SECONDARY_PORT_DX — pub-реекспорт у lib.rs :35-36 БЕЗ wasm_bindgen; wasm-входи лише compute*. StaffEdgeRoute/StaffRouteSet форма та сама. rust-types.ts поза diff. staff_routes ще імпортується (else-гілка). ✔
8. Тест чесний: admin far marked None (дискримінує raw-нод); org у card-set; kinds по index; lead-org N1 чесно в NOTE (не асертиться, бо входить у рамку ззовні); len==len (не претендує на coord-паритет). ✔
9. N1/N2/C-борг у коментарях route_via_astar + const (flip=C, R3+golden rebaseline T10, remove T12). ✔

## ПРОГОНИ
- cargo fmt --check: EXIT 0
- cargo clippy --all-targets -D warnings: EXIT 0
- cargo test: 184 passed, 0 failed, 0 ignored (t8a + ac10 + t7 зелені)
- Golden сам = TS/demo (тут не ганявся); детур-вихід Rust байт-ідентичний (та сама fn/input) ⇒ golden рухатись не може.

## NON-BLOCKING (C-time watch)
- marked=failed||intrusions розходиться з детур marked=intrusions — задокументовано, матиме значення на flip.
- figma-row порти A* беруть obstacle_rect.cx (увесь рядок), не box.cx — на R3 візуально звірити.

## ВЕРДИКТ: ПРИЙНЯТИ (гейт зелений, 0 blocking).
