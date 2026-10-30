# Пошук prior-art для T128 (A*-роутер ліній ШПС) — dg31

ДАЛІ: паралельно почати (1) Obsidian: `GET /vault/` → перевірка живості, потім search по термінах route/corridor/lane/astar/obstacle/StaffEdgeRoute/deptTop/crossing; (2) репо: Grep по тих самих термінах у work/, docs/, packages/; читання known-файлів контракту dg24 та r6-аналізів dg23.

---
## ФАКТ (крок 2): знайдено центральний корпус prior-art

ФАКТ: Obsidian REST живий (`GET /vault/` → 200).
ФАКТ: T128-спека вже існує й пройшла GATE 1 — `work/reports/staff-link-routing-astar/spec.md` (83 рядки). Містить AC1–AC11 (детектор stats() §10), 6 user scenarios, out-of-scope, 5 закритих open-questions (рішення власника dg31).
ФАКТ: Рішення власника про ПІДХІД зафіксоване двічі:
  - `work/reports/staff-rust-geometry/_r7-routing-debate-SYNTHESIS-dg31.md:80-95` — «РІШЕННЯ ВЛАСНИКА (dg31)»: Бар-2 → A* повністю (V-A) у Rust; порт stats() зараз; O-33/O-48 лишається для МАРШРУТІВ; V-B мертвий як рантайм; ELK/stats лише офлайн-оракул.
  - `work/reports/staff-rust-geometry/_r7-routing-debate-LEDGER-dg31.md:25` — те саме рішення коротко.
ФАКТ: Дебата трьох варіантів (адвокат-файли): vA-astar / vB-elk-lib / vC-extend-detour (dg31). Конвергенція (SYNTHESIS:7-26): card_pad-гейт = об'єктивний баг 1 рядок `staff_layout.rs:1246`; §10.1 crossing-free = ГЛОБАЛЬНА властивість, яку detour (stateless per-edge `staff_routes.rs:10`) структурно НЕ моделює; навіть мокап-A* не ГАРАНТУЄ crossing-free (occ-штраф+4 re-route паси+звіт лишку), різниця = RATE не гарантія; §6 relayout поза скоупом для всіх; контракт `StaffEdgeRoute.points` (`types.rs:599`) НЕ змінюється; детектор stats() (`shps-links.js:162-172`) портувати ПЕРШИМ.
ДЖЕРЕЛО: spec.md, _r7-routing-debate-SYNTHESIS-dg31.md, _r7-routing-debate-LEDGER-dg31.md.

ДАЛІ: читаю vA-astar адвокат (детальний дизайн A*/сітка/доріжки/rip-up), _r7-link-rules-spec-to-rust-dg30 (мапінг спека→Rust), _rust-ts-routing-contract-dg24 (контракт), _r6-lines-spec-analysis-dg23 + _r6-missed-points-analysis-dg23, _r7-a4-2b-diag-routing-dg30. Потім shps-routing/ (design-v3, spec) і Obsidian Domain-ноти.

---
## ФАКТ (крок 3): детальний A*-дизайн + мапінг спека→Rust + контракт + діагностика прочитано

ФАКТ (A*-дизайн, мапінг до мокапу shps-links.js): `_r7-routing-debate-vA-astar-dg31.md` — повний steelman з модуль-розкладкою:
  - сітка коридорів = `wall()`+збірка X/Y (`shps-links.js:116-119`) — РОЗРІДЖЕНА сітка координат інтересу (краї карток±pad8, рамки±14/±12/+38, середини проміжків ±lane8), НЕ піксельна → `build_corridor_grid()` ~60 рядків.
  - blocked-матриця mH/mV + `deptOK(s,D,role)` (`:92-100,121-123`) — правило перетину рамки (роль A вихід знизу, B вхід зверху нижче hb=y1+38, чужа рамка заборонена) → `grid_blocked()` ~80 рядків.
  - A* ядро: 3 стани на вузол (dir∈{start,H,V}), turn-penalty **30**, чуже ребро на слоті **6000**, чужий вузол **4000**, знижка своєї доріжки **.15**, Manhattan евристика, бінарна купа (stdlib BinaryHeap<Reverse>), ліміт **250000** ітерацій, fallback U-подібна (`shps-links.js:130-155`) → ~120 рядків.
  - occupancy occ.{nH,nV,eH,eV}+add/rem/fo/ow (`:124-128,150`) → ~60 рядків — доріжки §5.4 реалізовані ВАГАМИ, не геометрично.
  - детектор stats() cross/over/card/near/dept/fail (`:162-172`) → `route_stats()` ~90 рядків — ПОРТУВАТИ ПЕРШИМ (той самий код = acceptance-гейт + runtime панель за /debug).
  - rip-up loop 4 проходи по stats().bad, reverse на непарних (`:158`) → ~20 рядків; класифікація det(деревні int+ext-root, без A*) vs ast(решта через A*) (`:107-112`) → ~40 рядків.
  - РАЗОМ ≈470-530 рядків нового Rust ПОВЕРХ спільної геометрії/clearance/CardIndex (не з нуля).
  - Перф: мокап 196мс/50 зв'язків у JS (скрін 13.13.11), ризик 50мс/500 у WASM НЕ доведений — потрібен бенчмарк на §10.1 п.7; мітигації: A* лише для cross/ext (int деревом), кеш сітки, ліміт 250k.
ДЖЕРЕЛО: `_r7-routing-debate-vA-astar-dg31.md:9-227`.

ФАКТ (контракт Rust↔TS): `_rust-ts-routing-contract-dg24.md`. `StaffRouteSet{lod:String, segments:[StaffEdgeRoute]}` `types.rs:593-625`; `StaffEdgeRoute{from_id,to_id,kind:String, points:Vec<StaffRoutePoint{x,y}>, marked:Option<bool>, ends_on_dept_top}` `types.rs:599`. TS-seam віддає `routedSegments[]`+`markedCrossings[]`. Контракт НЕ змінюється при переході detour→A* (той самий points-формат). `FrameRect{department_id,part_index,x,y,w,h}` per-part проти TS whole-dept. ПИТАННЯ власника (dg24): matrix/dotted ребра — side-порти (стара TS) чи bottom→top (нова Rust)? — косметика, у T128 §11.2 вже = «як внутрішні за замовчуванням».
ДЖЕРЕЛО: `_rust-ts-routing-contract-dg24.md:16-44`.

ФАКТ (мапінг спека→Rust + 3 корені baг): `_r7-link-rules-spec-to-rust-dg30.md` + `_r7-a4-2b-diag-routing-dg30.md`:
  - D1 (домінантна): card_pad-гейт `staff_layout.rs:1246-1250` (card_pad=content_padding>=8?..:0) → при <8 avoid=false → `staff_routes.rs:610-611 else{route_ortho}` — обходу НЕМА. Прибрати гейт = AC11 спеки. TS обходить картки БЕЗУМОВНО (obstacle-set=всі edge-boxes, staffRouterV2.ts:60-80).
  - D2: Rust-критерій «чисто» = seg_rect_distance<card_pad (clearance-кільце, staff_routes.rs:573-583); TS = polylineHitsBoxInterior (interior, eps 0.75). Різні множини «коли обходити».
  - D3: Rust detour = corridorY-зсув + side_detour H-V-H (staff_routes.rs:417-482); НЕМА aroundTop-примітиву (emp: TS aroundTop 951→Rust 0); A* природно знаходить верхній обхід.
  - Еталон = мокап+§10+скріни, НЕ TS-паритет (ADR-0002, §5 брифінгу «SDK без споживача»).
  - Канон-спека (зовнішня): `/Users/strelia/Downloads/mock2/Вимоги - Лінії зв'язку ШПС.md` + `shps-links.js`. In-repo дайджест: `work/reports/shps-links-analysis/2026-10-28-shps-links-analysis.md`. Скріни: `work/reports/link-magnetism/*.jpg` + ~/Desktop 13.13.21 (ціль dg-рендер) / 13.13.11 (мокап панель 0/0/0/0/0).
  - Інваріант наявного Rust: `staff_routes.rs:4` «НЕ перерозкладає; §6.5 relayout = борг, поза T126». §12-маркер `marked=Some(true)` коли маршрут ще пенетрує чужу рамку (staff_routes.rs:614-622) — самовизнання невирішених інтрузій.
ДЖЕРЕЛО: dg30 два файли вище.

ФАКТ (r6 аналіз спеки §3-§10): `_r6-lines-spec-analysis-dg23.md`:
  - Порти §3/§4: внутр bottom-center→top-center, шина 30px; міждеп deptBottom(межа A)→коридори→deptTop(межа B); ціль=ГОЛОВА депа → лінія в deptTop і НЕ йде до картки; зовнішній card-порти; орг→орг .plink штрих. top приймає РІВНО 1 лінію.
  - Перешкоди §5.1 БАГАТШІ: картка+8px; заголовок .dn +4px (ОКРЕМА зона); чужі рамки; +.plink span/.tg кнопки/лічильники (дрібні перешкоди — у T128 не згадані явно, ПОТЕНЦІЙНА прогалина).
  - Доріжки §5.4: крок 8px, ширина коридору ≥ 2·відступ+(N-1)·8+lw, бракує→розширити.
  - §8 (ВИВІРЕНО по shps-links.js): джерело ЗАВЖДИ низ картки керівника (НЕ deptBottom!); ціль=верх РАМКИ ⟺ head && kind≠int, інакше верх картки; deptBottom зі спеки §4 прототип НЕ використовує; реальний frame-порт лише deptTop для head-цілей; деп може мати кілька коренів — у рамку лише перший (head), решта → картка (кейс bi/ib особа→особа); kind=int/cross/ext; §3.2 «вхід у B один раз+шина» прототип для не-head НЕ робить (веде кожну незалежно).
ДЖЕРЕЛО: `_r6-lines-spec-analysis-dg23.md:1-93`.

ДАЛІ: читаю shps-links-analysis дайджест + `_r6-missed-points-analysis-dg23.md`; shps-routing/design-v3.md + spec.md (ранній орто-роутинг); Obsidian Domain-ноти (interactions/sdk-render) по routing.

---
## ФАКТ (крок 4): shps-routing (TS-ера), vault-session-ноти, канон підтверджено

ФАКТ (shps-routing/ — TS-ера попередник, НЕ Rust): `work/reports/shps-routing/design-v3.md` — варіант C власника (2026-10-21): ОБМЕЖЕНЕ dept-групування + route-only навколо рамок; залишкові міждеп-перетини → §12 видимий маркер. **Свідомо НЕ відтворив коридор/track-алокатор §3.3/§5.4** (design-v3:160-163,206-209) — ставка на around-frame lane + §12. Збудував crossing-detector пар поліліній (спільний стовбур НЕ перетин, design-v3:170). Це прямий предок §12-маркера й підтвердження, що corridor/lane було відкладено — T128 A* саме це повертає. Файли: design-v2 (над-scope, суперсіднуто), design-v3 (GATE PASS r5), spec.md, impl-brief, implementation-status, 5 gate-review, slice4-seam-analysis, probe-results.

ФАКТ (vault-session T128, НЕ в репо — `1 - Notes/Sessions/2026-10-30 T128 staff link-routing A* spec-flow.md`): контракт-reuse для plan.md:
  - `StaffEdgeRoute.marked: Option<bool>` (§12-залишок R6-4a) = ГОТОВИЙ механізм best-effort Q1(а) (видимий stats()-fail).
  - `StaffGeometryResult.diagnostics: Vec<String>` `types.rs:647` = хук під stats()-вивід.
  - Можливе АДИТИВНЕ поле під stats()-лічильники (не ламає споживачів WASM↔TS). Контракт НЕ змінюється.
  - Відкладені рішення перед implement: Q2 WIP dg30 Коміт B (закомітити/лишити/полагодити svgExport.parity спершу); гілка feat/t126 чи нова feat/t128.
  - Власник дослівно: «все є в obsidian і доках проєкту, це вже обговорювалось. Запусти агента на пошук і можеш робити.»

ФАКТ (поточні Rust-ідентифікатори звірено з кодом): `types.rs:581` StaffRoutePoint, `:593` StaffEdgeRoute, `:599` points, `:612` ends_on_dept_top, `:622` StaffRouteSet, `:647` diagnostics. card_pad-гейт `staff_layout.rs:1246` + `MIN_CARD_PAD=8` `:40-41`. `staff_routes.rs:1-12` сам документує «PIN-1, локальний, НЕ grid-A*, пер-ребро stateless» + §12-маркер.

ФАКТ (канон зовнішній існує, точні рядки для цитування в plan): `/Users/strelia/Downloads/mock2/Вимоги - Лінії зв'язку ШПС.md` (217 рядків):
  - §5.2 коридори :99-102 (вертикальні 9px всередині дерева, 28px між депами верхнього рівня; розширення :102).
  - §5.3 без перетинів :104-108 (визначення перетину :105; спільний стовбур/шина НЕ перетин :106; різні керівники — окремі доріжки :107; інакше перебудова §6 :108).
  - §5.4 доріжки :110-113 (крок 8px :111; порядок без перехрещень :112; ширина ≥ 2·відступ+(N-1)·крок+товщина :113).
  - §6 перебудова layout :117-128 (пріоритет: переставити сусідів / розширити коридор / опустити деп :125-128).
  - §8.4 перф :165-166 (≤50мс/≤500 посад).
  - §9 алгоритм :171-181 (крок4 A* з штрафом за поворот по сітці коридорів :179; крок5 доріжки :180; крок6 перевірка перетинів+перебудова §6+повтор :181).
  - §10 критерії :186-195.

УВАГА (хибнопозитив для plan): `work/SPEC.md:310-340` «corridorPx / contourCorridor.ts» — це КОНТУР-магнетизм орг-блоків (виїмки між чужими картками, G2), ІНШИЙ домен, НЕ лінії-роутинг ШПС. Не плутати lane/corridor роутингу з contour corridor.

Запущено搜索-напрямків: Obsidian(REST) + репо. Vault `3 - Reference/Work/` = symlink на репо (report-файли тотожні); vault-only цінне = `1 - Notes/Sessions/*`.

---
# 📋 ПІДСУМОК ДЛЯ plan.md (структуровано)

## A. УЖЕ ВИРІШЕНО / ЗАФІКСОВАНО (plan ЦИТУЄ, НЕ передумує)
1. **Підхід = V-A (повний орто-A* у Rust), рішення власника dg31.** `_r7-routing-debate-SYNTHESIS-dg31.md:80-95` + `_r7-routing-debate-LEDGER-dg31.md:25` + vault `Sessions/2026-10-30 T126 R7 routing-approach debate.md` (§«РІШЕННЯ ВЛАСНИКА»). Явний вибір через інструмент, не інтерпретація.
2. **Бар-2 (не Бар-1):** планка §10.1 = гарантовано низький rate перетинів на ДОВІЛЬНИХ open-canvas даних (вільна перестановка посад), не лише на мокап-сценах. SYNTHESIS:81-82.
3. **stats()-детектор §10 портувати ЗАРАЗ** як acceptance-гейт (cargo test AC1–AC3 × 9 схем) + рантайм за `/debug`. SYNTHESIS:86-87; spec.md AC1-AC11, Q4.
4. **O-33/O-48 лишається для МАРШРУТІВ** (не лише якорів): routing повністю в Rust = одна правда; V-B (ELK/JS-роутер) мертвий як рантайм, лишається ЛИШЕ офлайн-тест-оракул. SYNTHESIS:88-89.
5. **Контракт `StaffEdgeRoute.points` НЕ змінюється** — `types.rs:593-624`; перехід detour→A* невидимий хосту. spec.md:52-53; vault T128-ноти. `marked:Option<bool>` (`:612`) = готовий best-effort/§12-механізм; `diagnostics:Vec<String>` (`:647`) = хук stats(); адитивне поле під лічильники дозволене.
6. **card_pad-гейт `staff_layout.rs:1246` (MIN_CARD_PAD=8 `:40-41`) — об'єктивний БАГ, безумовний обхід** = AC11, ПЕРШИЙ фікс усередині зрізу. SYNTHESIS:8-10; diag D1 `_r7-a4-2b-diag-routing-dg30.md:48-50`.
7. **§6 повна перебудова layout = OUT OF SCOPE** (мокап теж обходиться rip-up-сурогатом при фіксованих позиціях). spec.md:56-58; vA:126-134. Rip-up reroute (мокапний §6-сурогат) — у скоупі.
8. **GATE 1 ПРОЙДЕНО, 5 відкритих питань ЗАКРИТО власником** (spec.md:66-83): Q1 best-effort+видимий fail; Q2 бенчмарк на §10.1 п.7×п.4 ~500 посад, >50мс→A* лише cross/ext; Q3 стиль дефолт як внутрішні, штрих лише §3.4; Q4 stats() тест+/debug; Q5 повний перерахунок зараз, інкремент пізніше.
9. **Еталон = мокап+§10+скріни, НЕ TS-паритет** (ADR-0002; §5 брифінгу «SDK без споживача»). spec.md:18-19; dg30 файли.
10. **ADR-0002** (`docs/adr/0002-edge-dock-point-is-declared-by-the-node.md:33-34`): Q-3 власника закрито як «ПОВНІ МАРШРУТИ з обходом рамок» рахує Rust; порти залежать від LOD.

## B. УЖЕ ПРОАНАЛІЗОВАНО (plan бере як готовий вхід, НЕ переробляє)
1. **Повний A*-дизайн із модуль-розкладкою й оцінкою рядків** — `_r7-routing-debate-vA-astar-dg31.md:109-124`: build_corridor_grid ~60, grid_blocked+deptOK ~80, astar_route (3 стани, turn-penalty 30, купа stdlib, Manhattan, ліміт 250k) ~120, occupancy+ваги (чуже ребро 6000/вузол 4000/своя доріжка .15) ~60, route_stats ~90, rip-up ~20, det/ast класифікація ~40. РАЗОМ ~470-530 рядків ПОВЕРХ спільної геометрії.
2. **Мапінг кожного примітиву мокапу → рядок shps-links.js** — vA:27-48 (`astar` :130-155, `wall` :116-119, `deptOK` :92-100, `occ` :124-128, `stats` :162-172, rip-up :158, det/ast :107-112).
3. **3 корені розходження Rust↔спека (D1/D2/D3)** — `_r7-a4-2b-diag-routing-dg30.md:47-64`: D1 card_pad-гейт (домінантна), D2 clearance-distance vs interior-hit, D3 немає aroundTop-примітиву (emp. TS 951→Rust 0).
4. **Контракт Rust↔TS формат-мапінг** — `_rust-ts-routing-contract-dg24.md:16-44` (StaffRouteSet/StaffEdgeRoute↔StaffEdgeSegment, marked↔markedCrossings, per-part FrameRect vs whole-dept).
5. **Розбір спеки §3-§10 + інвентар портів** — `_r6-lines-spec-analysis-dg23.md` (порти, перешкоди §5.1 багатші, доріжки §5.4, §8 вивірка по мокапу: джерело=низ картки, deptTop лише head-ціль kind≠int).
6. **Класифікація ліній мокапу + «чому деп→деп vs особа→особа»** — `shps-links-analysis/2026-10-28-shps-links-analysis.md:28-99` (kind int/cross/ext; tgt у рамку ⟺ head; bi/ib = 2-й корінь).
7. **TS-ера попередник (route-only+§12, свідомо БЕЗ corridor/track)** — `shps-routing/design-v3.md` + 5 gate-reviews + impl-brief/implementation-status; crossing-detector поліліній design-v3:170.
8. **9 тестових схем §10.1 → готовий каталог фікстур** — `_r6-lines-spec-analysis-dg23.md:57-61`.
9. **Канон зовнішній, точні рядки** — `/Users/strelia/Downloads/mock2/Вимоги - Лінії зв'язку ШПС.md`: §5.2 :99-102, §5.3 :104-108, §5.4 :110-113, §6 :117-128, §8.4 :165-166, §9 :171-181, §10 :186-195.
10. **Перф-база:** мокап 196мс/50 зв'язків JS (скрін 13.13.11), ризик 50мс/500 WASM НЕ доведений — бенчмарк обов'язковий, мітигації названо (vA:136-163).

## C. ПРОГАЛИНИ (plan вирішує ВПЕРШЕ — у KB/доках нема готового)
1. **§3.2 «один вхід у B + шина» для НЕ-голови** — ні мокап, ні Rust не роблять (мокап веде кожну лінію незалежно). shps-links-analysis:105-109; vA:103-104. Поточні дані кейс не збуджують, але §10.1 п.4 вимагає. Рішення геометрії шини для не-head — відкрите.
2. **Дрібні перешкоди §5.1** (.plink span мітки, .tg кнопки згортання, лічильники) — у T128 spec НЕ згадані явно; `_r6-lines-spec-analysis-dg23.md:16-24,90` фіксує що набір перешкод свідомо НЕповний. Plan має вирішити: включати чи ні в obstacle-set.
3. **Точна структура сітки коридорів у Rust** (які саме X/Y-координати-стіни, інфляція рамок ±14/±12/+38) — мокап дає зразок (`wall()`), але Rust-адаптація (per-part FrameRect, не DOM) не спроєктована на рівні координат. Plan проєктує build_corridor_grid конкретно.
4. **Інкрементальний rip-up / кеш сітки під edit-mode** — відкладено (Q5 «пізніше»), АЛЕ контракт треба спроєктувати так, щоб додати без переробки (spec.md:80-81; vA:165-181 f, D-частина). Plan вирішує, ЯКІ seam-и лишити під майбутній інкремент.
5. **Бенчмарк-гарнес перф §8.4** — названо (Q2, найгірша §10.1 п.7×п.4 ~500 посад), але не існує; план проєктує, як міряти (cargo bench? окремий гейт).
6. **Де саме живе A*-модуль у packages/core** (новий файл vs розширення staff_routes.rs) і як ділиться ~половина спільної геометрії/clearance/CardIndex — SYNTHESIS каже «поверх спільної», але фактичний seam/декомпозиція не зафіксовані.
7. **Міграція ~25 detour-специфічних тестів** — рішення власника «виносимо detour-специфічні, спільну геометрію/clearance/CardIndex лишаємо» (SYNTHESIS:84-85), але поіменний список що саме виносити — не складений.
8. **matrix/dotted ребра маршрут** (не лише стиль): Rust зараз не гілкується за kind; `_rust-ts-routing-contract-dg24.md:41-44` лишає відкритим чи вони йдуть власним маршрутом. T128 §11.2 вирішив СТИЛЬ (як внутрішні), але не чи A* обробляє їх окремим класом.
