# T6 крок1 (secondary-порт + AC10 un-ignore) — незалежне рев'ю (R6, dg33)

Модель: claude-opus-4-8

ДАЛІ: прочитати решту staff_router.rs (тести T3-T6), staff_routes.rs (нові тести), lib.rs re-export; звірити з мокапом `shps-links.js`; прогнати cargo test/clippy/fmt.

## ФАКТИ (перевірено)

1. Secondary-правило (staff_routes.rs:1848 edge_is_secondary, :1831 admin_reaches).
   S5 edges: m→gc(0), m→sib(1), sib→gc(2). m→gc=sec (gc має ін. батька sib, і admin_reaches(m,sib)=true
   через m→sib). sib→gc=primary (sib НЕ досягає m). Точно ОДНЕ sec-ребро → паритет мокапу (нижчий батько
   primary, предок bypass). S1/S2/S6/S7: жодна ціль не має 2 батьків → фільтр порожній → усі false. ✔
   BFS: seen-set (HashSet insert) → цикли термінують; результат — булеве досяжності, незалежне від порядку
   стеку → детермінізм. ✔ Хибних спрацювань не видно.

2. SX-порт+grid (staff_router.rs:395). cx+SX додано для ВСІХ карток (паритет мокапу :118). node=100×50,
   gc[300..400], cx=350, cx+28=378 ∈ картки → вхід зверху у ВЛАСНУ картку. target=(tx,c.y) у
   astar_schema_stats (staff_routes.rs:1879). ✔

3. exempt cx+SX (staff_router.rs:869-872). on_port=cx||cx+SX, exempt=c.endpoint&&vert&&on_port → raw
   замість padded ЛИШЕ для власної from/to картки. Чужа картка на cx+SX сусіда: c.endpoint=false → padded →
   блокує. Дірки немає. ✔ Фінальний верт. сегмент до top(y=gc.y) не входить в interior (edge_hits: hi=440,
   lo.max(440)<440 false). ✔

4. sort-ключ (staff_router.rs:763-770). secondary.cmp (false<true → primary first), потім start.y, start.x,
   idx. Паритет мокапу :156 (sec-last). Tie-break idx → AC8 детермінізм. ✔

5. Харнес astar_schema_stats (staff_routes.rs:1862) реально жене route_edges (A*), НЕ detour. Детектор =
   crate::route_stats (той самий, що гейт). diag = crate::diagonal_segments. start=bottom-center,
   target=(cx|cx+SX, c.y top). member=schema_member. ✔

6. AC10 (staff_routes.rs:1912) БЕЗ #[ignore], жене A*, асерт s==default + diag==0. Прогон: PASS, 0 ignored.
   ТЕСТ ЗУБАТИЙ: вимір (_algo-comparison §4) показав, що single-pass route_edges БЕЗ secondary дає S5 over=1
   навіть з occupancy-lane — бо цільовий порт зафіксований на cx для обох, останній верт.сегмент у top
   збігається; lane не рухає обов'язковий target-порт. Отже вимкнення secondary → ac10 ЧЕРВОНИЙ (self-guard).
   detour_leaves_a_violation (S4 over≥1, S5 cross≥1) і clean_schemas лишились валідні (обидва на detour через
   schema_stats, незмінені) — PASS. ✔

7. Паритет-вузькість: загальний dual-sub (два незалежні батьки) → edge_is_secondary=false для обох → знову
   overlap. Задокументовано прозою у doc-comment edge_is_secondary (staff_routes.rs:1845-1847) — не мовчазна
   діра. §11.1 у коді НЕ вигадано (код цитує лише §10.1.5). ✔

8. Перф/стиль: cx+SX для всіх карток = +O(cards) ліній, sparse тримається (тест nx<40). clippy чисто,
   fmt чисто. SECONDARY_PORT_DX re-export (lib.rs:35) — не *ForTests (barrelSurface гейтить TS-barrel, не
   Rust). ✔

## Прогони
cargo test staff: 153 passed, 0 failed, 0 ignored. clippy --all-targets: clean. fmt --check: clean.

## Мінорні (НЕ блокуючі)
M1. astar_schema_stats не асертить !r.failed. Теоретично деградований best_effort Z-рядок міг би пройти
    гейт, якби був чистим. Для акуратних S1-S9 з grid-aligned портами не стається (тести зелені). Пропозиція
    на зміцнення: assert !failed на кожному маршруті у ac10.
M2. (тільки спостереження) admin_reaches O(V+E) × E ребер — test-only, не проблема.

## ВЕРДИКТ: ПРИЙНЯТИ
Блокуючих дефектів у коді й тестах немає. Обидва критик-блокери (B1 харнес=A*, B2 exempt cx+SX) закрито й
перевірено. Гейт AC10 зубатий (self-guard проти вимкнення secondary, підтверджено виміром). M1 — опційне
зміцнення, не блокер.
