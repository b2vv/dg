claude-opus-4-8

ДАЛІ: читаю обов'язковий контекст (_handoff-dg37.md §2 історія провалів, _emulation-mockup-vs-ours-dg37.md, _critic-before-layout-dg38.md, _probe-layout-headrule-dg38.md), потім код staff_router.rs / staff_routes.rs / staff_edge_box.rs напряму. Дизайн-критик ROUTING-слайсу T128 (dg38). Код не пишу — лише дизайн D1-D4 + probe D5 + блокери.

---

## ФАКТИ З КОДУ (path:line, звірено)

- `route_scene` класифікація det: `is_int = !secondary && is_internal(from,to)` (staff_router.rs:921-924).
- `is_internal` (staff_router.rs:889-898): `(Some(a),Some(b)) => a==b, _ => false`. ceo/asst/aud = no-dept (member_of=None) → будь-яке ребро З них = НЕ internal → ast.
- Reserve-first для det УЖЕ є: internal elbow occupy перед A* (staff_router.rs:941-953), cross/ext A* проти occ (955-967), rip-up ≤4 (969-997).
- det elbow = `route_ortho(fc,tc)` (staff_router.rs:945) → докує в CARD top, corridor=per-pair (staff_routes.rs:72-77). ІГНОРУЄ EdgeSpec.target/dept_top_y.
- `elbow_or_straight` (staff_routes.rs:80-92) — готова форма спільної шини.
- bus_ys збираються per-edge (staff_router.rs:928-935), НЕ per-manager.
- dept-top target рахується лише в route_via_astar (staff_routes.rs:594-620), кладеться в EdgeSpec.target.
- Прапор-прецедент: `use_astar`/`tree_block_layout` (types.rs:461-480) — internal DEV switch, rename+default+ts(optional).
- route_scene викликається ЛИШЕ з route_via_astar (astar-only) → detour-golden НЕ зачеплено.
- 9-схемний AC10-гейт: staff_routes.rs:1976-2360; `clean_schemas` (2136-2146) вимагає 0/0/0/0/0; **S6 (2091) = no-dept head → реклясифікується**. Гейт докує card-top (2199), не dept-top.

## ДАНІ mock3 (mock3Shps.ts)
- ceo(:51) d=null; asst(:52) d=null p=ceo; aud(:67) d=null p=acc(fin); da(:77) p=ah p2=ceo.
- ast-кандидати (≈8): cfo→ah, cto→bi, cto→ib, tlb→qh, acc→aud, cco→cmo, cco→lgh, ceo→da(secondary). Усі — крос-деп (dept(from)≠dept(to), from має деп) або secondary.
- det ceo-fan (no-dept from): ceo→{cfo,cco,cto,hrd,lgl,sch,asst}.

## D1 — КЛАСИФІКАЦІЯ det/ast
Критерій: `det ⟺ !secondary && (is_internal(from,to) || member_of(from).is_none())`.
Тобто ДОДАТИ до поточного is_int диз'юнкт `member_of(from)==None` (no-dept-керівник fan).
Інфи ДОСТАТНЬО без нових полів: member_of (department_id), is_internal, EdgeSpec.secondary.
РЕКОМЕНДАЦІЯ: винести класифікацію з route_scene у caller (route_via_astar/schema) як поле EdgeSpec.deterministic — розділити ПОЛІТИКУ (що є det) від МЕХАНІЗМУ (reserve det, A* решту). Так прапор живе в caller, route_scene лишається mechanism-only, і 9-схем можна тримати на старій політиці.

## D2 — ДЕТЕРМІНОВАНИЙ bus-елбоу + reserve-first
ПАСТКА (несуча): route_ortho докує card-top; ceo→head має dept-top target у EdgeSpec.target. Якщо det-гілка лишить route_ortho(fc,tc) — dept-top docking ВТРАЧЕНО, елбоу зупиниться в card-top усередині рамки.
ФІКС: det-гілка має будувати елбоу з EdgeSpec.start→bus_y→EdgeSpec.target через elbow_or_straight(e.start.x, e.start.y, e.target.x, e.target.y, bus_y), НЕ route_ortho.
Спільна шина: bus_y PER-MANAGER (не per-edge як зараз 928-935): для кожного det-керівника одна bus_y = (from.bottom + tier_y)/2, усі його діти на ОДНІЙ горизонталі (мокап y=238). Детермінічно (геометрія + from_id-групування в input-порядку).
Reserve-first: уже є (occupy det перед A*, 941-953). Розширення det-множини автоматично резервує ceo-fan першим. Переюз occupancy/rip-up без змін.

## D3 — LOD-ІНВАРІАНТНІСТЬ
КЛАСИФІКАЦІЯ LOD-інваріантна: member_of/is_internal/secondary читають department_id (дані), НЕ геометрію. det/ast НЕ додає LOD-варіативності. ✅
АЛЕ: bus_y/елбоу-геометрія per-LOD (box per-LOD, staff_edge_box.rs far_dot/mid_band) — рухається з LOD, що ОК якщо детектор бачить ті самі боксі.
Zoom-баг (far 0.28: dept=5/marked=18) — ОКРЕМА far-box/frame проблема (R3-a), det/ast НЕ фіксить корінь, але зменшує A*-поверхню (менше ребер блукає в рамки на far) → marked може ВПАСТИ. НЕ погіршить.
ВИМОГА probe: прогнати near І far, довести що det/ast НЕ збільшує far-метрики.

## D4 — ДЕТЕРМІНІЗМ + НЕ-РЕГРЕС
- Детермінізм: routing_order стабільний (794-805); det-резерв у input-порядку (942); occupancy-HashMap лише existence-предикати (не order-sensitive). bus_y з геометрії. ✅
- Golden detour: route_scene astar-only → detour-golden НЕ зачеплено. ✅
- РИЗИК РЕГРЕСУ: S6 (no-dept head) реклясифікується; clean_schemas мусить лишитись 0/0/0/0/0 → `cargo test` ОБОВ'ЯЗКОВО. Гейт докує card-top, тож docking-зміна ним НЕ ловиться — ще причина probe на РЕАЛЬНИХ mock3-координатах з dept-top.
- Прапор: route_scene НЕ має доступу до прапора (чиста функція). Два шляхи: (а) безумовний фікс якщо всі гейти зелені (це корекція коректності); (б) EdgeSpec.deterministic з caller — прапор у route_via_astar. РЕКОМЕНДУЮ (б) для mock3-on/default-off без зміни політики 9-схем.

## D5 — ДИЗАЙН PROBE (prototype-first, node/Rust)
Seam: /tmp-копія core; вхід /tmp/ta0-mock3.json (SHA вже зафіксовано в probe-layout); compute_once для boxes/frames, ПЛЮС layout-фікс head_override={"ana":"ah"} (щоб стартувати з cross=1 стану).
У копії: (1) is_int += `|| member_of(from).is_none()`; (2) det-гілка → elbow з e.start→bus_y(per-manager)→e.target замість route_ortho. Baseline = поточний route_scene на тих самих specs.
МІРЯТИ (route_stats + turn_totals):
  (1) ceo-fan: усі ceo→діти мають РІВНО 2 true_turns і ОДНАКОВУ bus_y (витягти y середнього сегмента кожного) — доказ однієї шини;
  (2) cross 1→0 (чи лишається 1) — ПРЯМО перевірити пару acc→aud × ceo→da через route_stats_detailed attribution (як probe-layout р.66-79);
  (3) excess_turns різко вниз (baseline 14 → ?).
  (4) near І far: обидва LOD, far НЕ гірший.
ДИСКРИМІНАЦІЙНИЙ: якби det/ast не допомагав (як flat-bus) — excess лишиться високим і/або з'являться over/card/near; тоді провал видно числом.
КРИТЕРІЙ УСПІХУ: ceo-fan 2 turns на спільній bus_y; excess різко↓; cross ≤1 (0 — бонус); 0 нових over/card/near/dept на near І far.
КРИТЕРІЙ ПРОВАЛУ: excess не падає; АБО нові over/card/near/dept; АБО ceo-діти на різних y (шина не зійшлась); АБО far регресує.

## 🔴 НАЙІМОВІРНІШЕ МІСЦЕ ЗЛАМУ (чесно)
**cross 1→0 НЕ гарантовано det/ast-поділом.** Останній перетин acc→aud × ceo→da — ОБИДВА лишаються ast за будь-яким розумним правилом (acc має деп; ceo→da secondary). Реклясифікація ceo-fan їх НАПРЯМУ не чіпає. Єдиний механізм, яким cross може впасти: ceo→da має owner=ceo → після резерву ceo-шини OWN_LANE_FACTOR(0.15, staff_router.rs:678) робить реюз ceo-шини дешевим → ceo→da піде вздовж зарезервованої шини й зміном шляху перестане різати acc→aud. Це ДРУГОПОРЯДКОВА occupancy-взаємодія, НЕ прямий наслідок поділу. Якщо не спрацює — slice дає РІВНІ лінії (головна ціль), але cross лишається 1 → знадобиться окремий крок (nudging / port-offset). Probe мусить це явно показати пунктом (2).
Друге слабке місце: docking ceo→head (dept-top vs card-top) — якщо залишити route_ortho, рамкові метрики на far можуть зрости.

## БЛОКЕР СТАРТУ: НЕМАЄ (з однією умовою)
Дизайн реалізовний наявними примітивами (elbow_or_straight, occupancy, rip-up, is_internal). Нових полів даних не треба.
УМОВА: probe (D5) має бути ДИСКРИМІНАЦІЙНИМ саме на пункті cross 1→0 і на far-LOD — інакше ризик повторити flat-bus (зелений excess, але 0/0/0/0/0 не досягнуто або far регресує). Не інтегрувати, доки probe не покаже excess↓ І (cross=0 АБО чесно зафіксовано, що cross=1 лишається й чому).
