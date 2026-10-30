claude-opus-4-8

ДАЛІ: звіряю еталон shps-links.js (occOps/add/rem/fo/ow/cost/driver), lib.rs re-export, 9 пунктів; наприкінці cargo.

## Крок 1 — код T5 + критик dg33 прочитано.

## Крок 2 — еталон shps-links.js звірено (occOps, add/rem, fo/ow, cost, driver рядки прочитані), lib.rs:33-35 re-export усіх 5 нових символів (occupy, release, route_edges, EdgeSpec, Occupancy) + наявні.

## Крок 3 — 9 пунктів:
1. occOps індекси: node_v/node_h = j*nx+i (ПОВНИЙ, B3 ✓, staff_router.rs:703,715); edge_h = j*(nx-1)+i (:717); edge_v = j*nx+i (:705); j1/i1=min, j2/i2=max через a.y.min/max (:697,709) → порядок точок байдужий. Збіг з мокапом occOps. PASS.
2. B1 off-grid skip: edit_occupancy match→continue (:698-701, :710-713) якщо xi/yi=None. best_effort my off-grid → skip, НЕ паніка. route_edges occupy кожне ребро включно з failed (паритет мокапу `ast.forEach(add)`). PASS (covered-by-construction; окремого тесту occupy-on-failed нема — минор).
3. cost-терми: ea вірний ключ (:936-940), lane len*0.15 own (:941-945), foreign_edge 6000 (:949-952), foreign_node 4000 перевіряє ОБИДВІ node-мапи (:947-948, nn=nj*nx+ni ціль), turn 30. Числа вірні, збіг з мокапом :150. PASS.
4. детермінізм AC8: cost лише .get+fo/ow (предикати існування, порядок Vec байдужий). ЖОДНОЇ ітерації occ-HashMap у astar/route_edges (лише .get і occupy-write). sort (:753-760) start.y,start.x,idx total_cmp → тотальний+стабільний. swap_remove не ламає (предикати). PASS.
5. release симетрія: add=push/remove=swap_remove одне входження (:668-675). L-кут: node_v[corner] і node_h[corner] — РІЗНІ мапи, по 1 push кожна. A*-шлях ациклічний (g-relax) → без self-touch. releasing_* тест доводить функційний round-trip (divert→restore straight). PASS.
6. driver route_edges: route-then-occupy у sorted-порядку (:763-770), повертає INPUT-порядок out[idx] (:762,769,771), owner=from_id (:768). rip-up (4-pass мокап) НЕ тут → T6. PASS.
7. сигнатура: 9-й &Occupancy + #[allow(too_many_arguments)] (:779-790). 6 T4-викликів з &Occupancy::default() → has_own/has_foreign=false → cost=len+turn (ідентично доT5). PASS.
8. тести чесні: occupancy_pushes має КОНТРОЛЬ (baseline overlaps>=1 без occ, :1606-1610 vs ==0 з occ) → не вакуум, cost справді fire. releasing: divert+restore. route_edges: INDEP overlaps>=1 (:1734) vs DRIVEN ==0 (:1695), конфлікт @y≈592 реальний, детермінізм-асерт сильний (flat eq :1708). НЕ асертять повний 0/0/0/0/0 (лише overlaps) → інтеграція. PASS.
9. admissibility N1: OWN_LANE_FACTOR<1 задокументовано як відоме (:633-636); термінація (g спадає, ITER_CAP 250k) + детермінізм тримаються. PASS.

## Крок 4 — B1/B2/B3 критика закриті: B1 skip (:698-713), B2 драйвер route_edges (:745-774) + S4-overlaps доведено single-pass (:1695), B3 node key j*nx+i (:703,715). ✓

## Крок 5 — cargo: 22 staff_router тести PASS; clippy -D warnings чисто; fmt --check чисто (EXIT 0).

## NON-BLOCKING спостереження
- Немає окремого тесту, що route_edges окуповує best-effort (off-grid) маршрут без паніки — покрито конструкцією (skip) + off-grid-port astar тест, але прямого регресу нема. Минор.
- Драйвер sort НЕ має первинного ключа `sec` (cross-перед-ext) з мокапу (`(a.sec||0)-(b.sec||0)`). Детермінізм тримається, але при сумісних cross+ext у реальній сцені порядок може розійтися з мокапом. Коментар (:741-744) чесно заявляє лише Y/X/idx. Для T5-unit поза скоупом; врахувати при wiring у пайплайн.

## ВЕРДИКТ: ПРИЙНЯТИ
Усі 3 блокери критика закриті; індекси, cost-числа, семантика fo/ow/foreign_node, детермінізм, release-симетрія, сигнатура — звірені з еталоном і коректні. Тести чесні (контролі, не вакуум). cargo test/clippy/fmt зелені. Два минор-спостереження non-blocking.
