claude-opus-4-8

ДАЛІ: прочитати 3 джерела (_SPEC-source, _gap-D, spec-zigzag) + grep staff_router.rs/staff_routes.rs на bends/route_stats, щоб зрозуміти як рахуються метрики. Потім оцінити В1 vs В2 за 4 осями.

ФАКТ (механіка метрик):
- `bends` = Σ(points.len()-2) по всіх ребрах (staff_routes.rs:668-672). Рахує ВНУТРІШНІ вершини, НЕ справжні зміни напрямку → колінеарні проміжні точки теж рахуються як bend.
- route_stats (staff_router.rs:41-52,158) повертає ЛИШЕ 5 топологічних (cross/over/through_card/near/through_foreign). Turn-ліміт у ньому НЕ рахується. bends рахується окремо в staff_routes.rs, не в RouteStats.
- §5.1.2 ліміти: внутр ≤2, міждеп ≤4. edge.kind ("admin") + ends_on_dept_top вже є в `meta` (staff_routes.rs:570,628), паралельно до set.segments — тобто per-edge turn-vs-limit обчислюється в scope staff_routes.rs поруч із bends (S).
- TURN_PENALTY=30.0 (staff_router.rs:507) — м'який штраф, не cap; bends=126 — залишок.

РІШЕННЯ (оцінка 4 осей):
1. Вірність: bends — монотонний, але НЕ строгий проксі. Дірки: (a) глобальний агрегат ховає per-edge регресію; (b) points.len()-2 рахує колінеарні вершини → колінеар-dedup РОНЯЄ bends без зміни візуалу (AC-C1 "bends падає" задовольняється косметично). turns-over-limit — вірний СПЕЦІ (§5.1.2 вже цитується AC-C1), per-edge, groundable (ціль=0), але насичується і Z у 2 поворотах легальний. avoidable-step — найвірніший оку, але фрагільний і дублює clearance роутера.
2. Вартість: V1 = 0 коду (bends є, у HUD). bends-threshold = дешево, але нема grounded-цілі (мокап не має bends-лічильника — open-q#1). turns-over-limit = S (meta вже є). avoidable-step = M-L, correctness-sensitive, дублює CardIndex-clearance (staff_routes.rs:709).
3. Over-eng/KISS: слайси A/B/C/D ще НЕ пробувані. Будувати бутіковий естет-детектор ПЕРЕД слайсами — передчасно (не відкалібруєш без мокап-цілі). KISS: bends + візуал на цей цикл. Але ПОСТІЙНИЙ regression-гейт дешевий і вартий — і виражається наявним bends ("не зростає"), нового метрика для цього не треба.
4. Що рахувати в V2: turns-over-limit (≤2/≤4) — sweet spot (вірність спеці × S × groundable ціль=0 × не ховає per-edge). avoidable-step — відкласти. absolute-bends-threshold — відхилити (нема цілі, scene-dependent, gameable).

РЕКОМЕНДАЦІЯ: ГІБРИД. V1-петля для A/B/C/D (bends non-increase + detector 0/0/0/0/0 + owner-visual) + ОДНЕ дешеве вимірюване: `turns_over_limit` у HUD+тест, рахувати на СПРАВЖНІХ змінах напрямку (dedupe колінеар), у staff_routes.rs поруч із bends (meta вже в scope). Converts AC-C1 soft→hard (==0). НЕ будувати avoidable-step цей цикл.
Caveat для автора: і bends, і turns треба рахувати на direction-changes, не на raw-vertex-count — інакше гейт обманюється колінеар-dedup.
