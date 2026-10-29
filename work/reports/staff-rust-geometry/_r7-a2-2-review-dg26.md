# R7 A2.2 незалежне ревʼю (після кроку) — Dg26

claude-opus-4-8

ДАЛІ: прочитав diff (f2fed1c→WIP), критик B1/B2, план A2.2, оракул horizontalPolyline :181-209 + classifyStaffEdgeRoute :320-410. Далі читаю повний staff_routes.rs: route_ortho, foreign_frame_blocks, clear_of/ObstacleIndex, detour_edge, test-хелпери (node_wh, edge_rect, avoid_input, points_eq, is_orthogonal). Перевіряю 9 пунктів завдання.

## ФАКТ — перевірка по 9 пунктах (код, рядок:файл)

П1 route_horizontal = точний порт horizontalPolyline:181-209:
- go_right=to_cx≥from_cx (tie→right, не строгий) — staff_routes.rs:104 = оракул:188 ✓
- clear_gap знаки — :105-109 (go_right?from_right≤to.x+EPS:to_right≤from.x+EPS) = оракул:189 ✓
- None при !clear_gap — :110-112 ✓ (несуча заміна isClean)
- пряма при |Δy|<EPS, y лишаються різні (from_cy,to_cy) — :115-119 = оракул:196-201 ✓ (не снап, faithful N6)
- midX у зазорі — :121-125 = оракул:202 ✓
- eps=STRAIGHT_EPS(0.5) всюди, НЕ 1e-9 — :106,108,115 (const :42) ✓
- бічні порти на center-Y (from_cy/to_cy), не bottom — :117-118 ✓

П2 ladder faithful:
- prefer_horizontal=matrix|dotted|same_band — :512 = оракул:330 ✓
- same_band=|Δcy|<min(h)*0.35 на EdgeRect(per-LOD) from/to — :509-511; from/to з resolve_box=visual_*_edge_box (near→повний бокс, staff_edge_box.rs:75) ✓ (не StaffNodeGeo)
- порядок prefer→[H,V] / else→[V,H], перший clean виграє, жоден→detour — chosen match :526-543 ✓
- route_ortho (V) завжди ≥2 точки → ladder ніколи порожній; detour лише None-гілка :545 ✓

П3 B1 інваріант — ДОВЕДЕНО:
- admin non-sameBand V-clean→V байт-ідентично A2.1: prefer=false,is_clean(base)→base.clone() :539; base=route_ortho ідентичний A2.1 ✓
- admin non-sameBand V-blocked+H-clean→H(не detour): :541 horizontal.filter(is_clean) ✓ — це і є зміна проти A2.1
- тест admin_vertical_blocked...:1044 — арифметику перевірив: F(cy25)/T(cy225) Δ200≫17.5 non-sameBand; X(40,115,30,20) ріже V-corr(x=50,y50..125 і y=125) → base blocked; H=[(100,25),(150,25),(150,225),(200,225)] чистий від X → H. На A2.1 blocked base→detour дав би [(50,50),(50,99),(250,99),(250,200)]≠H → ТЕСТ ВПАВ БИ на A2.1 (зуби є) ✓

П4 B2 — компенсація відсутнього isClean підтверджена:
- idx.clear_of скіпає from/to по id (:347-349), foreign_frame_blocks лише рамки — ВЛАСНІ бокси не ловляться
- V(route_ortho) порти на bottom/top власного бокса by construction → не входить у власні
- H: clear_gap гейт (:105-109) гарантує from_right≤to.x+0.5 → midX у зазорі, порти на near-edge → H не ріже власні бокси (у межах 0.5-slack, = TS isClean eps0.75) ✓
- чужі картки/рамки для H перевіряє той самий is_clean → не губляться ✓

П5 N7 перф — H+V clean ЛИШЕ idx+foreign (is_clean closure :528-537), per-edge obs будується ЛИШЕ в None=>detour (:546-553, obstacles_for_edge). Чисте ребро → 0 obs-алокацій ✓

П6 детермінізм+clone — chosen клонує обраний Vec (:531,539,541,543); is_clean борроує idx/input/src/dst/edge без зайвих clone у гарячому шляху; фіксований порядок ладдера детермінований ✓

П7 golden/маркер — marked рахується на `points`=ОБРАНИЙ маршрут (:561-568), не на base ✓. h6_combined_scene_matches_golden зелений (прогін нижче) — H там блокований→detour, golden не рушив. N2 (sameBand both-blocked→верт.detour→більше marked за TS) — поведінка, прийнята власником (detour≠ladder), не баг ✓

П8 зуби — matrix_edge(:1027), admin_vertical_blocked(:1044), same_band_admin(:1074): усі дають маршрут, якого A2.1 без ладдера не дає (перевірив арифметику кожного) → впали б на A2.1 ✓. admin_vertical_clean_stays(:1090) — інваріант-гард (зелений і на A2.1), не фіча-тест: легітимний пін істинного B1-інваріанту, не assert-без-фічі у шкідливому сенсі. route_horizontal_none(:1107) — юніт нової функції (на A2.1 не компілюється) ✓

П9 non-avoid — card_pad≤0 → else route_ortho (:557), ладдера нема, не регресія ✓

## Прогони (без pipe-ховання коду виходу)
- `cargo test staff_routes` → 30 passed; 0 failed (h6 golden зелений)
- `cargo clippy --all-targets -D warnings` → чисто

## Діра (non-blocking, N-клас)
- route_horizontal викликається ЕАГЕРНО для КОЖНОГО avoid-ребра (:513), навіть non-prefer з чистою V — алокує малий Vec(2-4 точки), що відкидається. A2.1 еагерно рахував лише base; A2.2 додає один малий Vec/ребро (коли є clear_gap). O(1), не n², домінантний n² (clean-check) лишається індексованим — перф-інваріант тримається. Можна зробити лінивим (рахувати H лише коли prefer або base blocked). Non-blocking, косметика.
- Side enum лишився Top/Bottom (:33-36) — H-порти inline, Side::Left/Right не додано (план N9, уникнення dead-variant/clippy) ✓

## ВЕРДИКТ: 🟢
B1 закрито: істинний інваріант «V-clean→V» реалізовано (:539), хибний «admin байт-ідентичний» не закладено; прицільний тест V-blocked→H-clean→H має зуби.
B2 закрито: route_horizontal→None при !clear_gap (:110-112) — точний порт :189, несуча заміна isClean; H не ріже власні бокси by construction.
Порт horizontalPolyline байт-точний. Ладдер faithful до classifyStaffEdgeRoute:384-401. Perf-інваріант A2.1 (lazy-obs) збережено. Тести мають зуби. Golden h6 свідомо вцілів. Клиппі/тести зелені. Одна non-blocking косметика (еагерний route_horizontal).
