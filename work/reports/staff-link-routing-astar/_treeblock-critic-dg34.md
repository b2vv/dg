model: claude-opus-4-8

# Критик-ПЕРЕД (R6): дерево-блоковий layout для ШПС — пастки

ДАЛІ: читаю `packages/core/src/staff_layout.rs` (`group_staff_by_department` ~573-697, `compute_staff_geometry` ~1000-1090), `staff_compose.rs` (`compose_tiers`, `compose_org_cards`), `staff_packing.rs` (pack_departments — лише тести), і третьосторонній мокап `~/Downloads/mock2/shps-links.js:62-86` + наш опис `_algo-comparison-dg33.md`. Перевіряю план на циклічну залежність сорт↔позиція (Q3), recenter/pin (Q4), цикли admin-графа, part_index (B5), region_bounds/канвас, department_frames_from_nodes.

## ФАКТИ (звірено з кодом)

- Реальний плаский шлях: `group_staff_by_department` (staff_layout.rs:573-697) — регіон на відділ через `layout_connected_tree` (:662), пакування зліва-направо з eject-right (:666-694, guard "did not converge" :677). part_index нод НЕ ставиться (:689 лише department_id; layout_connected_tree:392 part_index=None). no-dept → один NO_DEPARTMENT-регіон (одне дерево).
- Викликається з `layout_staff_org_block` (:891-892) під `use_dept` (:887-889), ПЕР-ТИР: tier1 leadership, tier2 full, tier3 expanded. Прапор уже є — `dept_grouping` (:995, serde).
- `compose_tiers` (staff_compose.rs:66-83): recenter tier1 = РІВНОМІРНИЙ зсув усіх tier1-нод на dx (вісь голів), лише dx>0. Працює на ВИХОДІ блоку — зберігає внутрішню геометрію блоку. Tree-block це НЕ ламає (uniform translate).
- `pin_external_managers` (:759-817): зсуває ВСІ ноди блоку вниз на row_height, додає верхній ряд зовн.менеджерів x=margin+i·pitch (:787). Пре-existing, uniform shift — tree-block не ламає, але pinned-ряд не вирівняний до дерева (пре-existing візуал).
- `department_frames_from_nodes` (:957-978): рамки з ФІНАЛЬНИХ коордів, групування за department_id. Tree-block дає один суцільний прямокутник на відділ → рамки чистіші, НЕ ламаються за умови стемпу department_id.
- Мокап `layout()` (shps-links.js:62-86): §1 per-dept `rel` (локальні x,y, :72) — рахуються ДО розміщення блоків. §2 блок-форест: `b.src=PM[head].p` (:78), `b.parent=blockOf(src)`, `kids.sort(b.rel[a.src].x ... || POS.indexOf)` (:79), `bw` subtree-width (:80), `place` tidy (:81), roots left-to-right (:82). no-dept → КОЖЕН окремий singleton-блок (:76). head=roots[0] (INPUT order), roots=члени без in-dept батька (:68).

## ВІДПОВІДІ Q1-Q4 + ПАСТКИ

Q1: Прапор per-call serde default false — ДОСТАТНЬО, окремий режим НЕ треба (layout рахується щоразу, немає persistent-стану). УМОВА: новий код лише в гілці `use_dept==true && new_flag`; при off — `group_staff_by_department` недоторканий (golden). Tree-block має сенс ЛИШЕ з dept_grouping.

Q2: no-dept singletons — КРИТИЧНО. «Плаский ряд» = нижчий ризик АЛЕ руйнує саму мету для no-dept нод, чий admin-батько ВСЕРЕДИНІ dept-блоку (мокап `aud`,p=acc∈fin:20 → singleton-блок під fin). Плаский ряд → лінія aud←acc знову перетинається. Мокап робить КОЖЕН singleton-блоком саме щоб він сів під реального батька. Рекомендація: singleton-блоки (паритет), не ряд і НЕ один NO_DEPARTMENT-регіон (поточне). Severity HIGH, decide-before-coding.

Q3: ЦИКЛУ НЕМА. kids.sort за `b.rel[a.src].x` — це ЛОКАЛЬНИЙ x у батьк-блоці, фіксований у §1 ДО розміщення (мокап :72 vs :79/:81). Позиція блоку залежить від сорту, сорт від ЛОКАЛЬНОГО rel (не від фінального). ПАСТКА: якщо імплементувати attachment-X з ФІНАЛЬНИХ коордів нод — з'явиться цикл. Вимога: брати локальні коорди (до region-shift) з `layout_connected_tree`. Severity MED, implementation-constraint.

Q4: recenter (compose_tiers) НЕ ламається — uniform shift зберігає внутрішню геометрію; head-center просто знайде ноду голови в новій позиції. pin_external_managers НЕ ламається — uniform vertical shift + top-row. Обидва пре-existing, застосовуються ПІСЛЯ блоку. Severity LOW (не блокує).

## ДОДАТКОВІ РИЗИКИ

R1 (HIGH, non-blocking-for-start): block.parent-цикл. blockOf(src) може утворити цикл (A.head→parent∈B, B.head→parent∈A). Тоді `bk.filter(!parent)` порожній → нічого не розміщено (мокап НЕ гардить, :82). Рекурсивні `bw`/`place` на циклі → stack overflow. Поточний pack має guard (:677) — tree-block ПОТРЕБУЄ свого (cycle-break / віртуальний корінь завжди присутній). Має бути в плані.

R2 (MED): stamp department_id у tree-block ОБОВ'ЯЗКОВО (як :689), інакше `department_frames_from_nodes` втрачає рамки й router-membership (staff_routes.rs:232 keys (department_id,part_index)) ламається. part_index лишати None (паритет поточного). Implementation-requirement.

R3 (MED): вибір head блоку. Мокап head=roots[0] за INPUT order (:68,74). Наш `resolve_dept_heads` — ЛЕКСИЧНО (staff_layout.rs:251). `group_staff_by_department` region-root — за comparePositions-order (:653). Різний head → інший src → інша форма дерева (валідна, але не = мокап). Треба свідомо зафіксувати джерело head/attachment-src. Decide-before-coding (дешево).

R4 (LOW): part_index/B5 — у ПРОД-шляху вже завжди None (pack_departments не в проді). Tree-block = один блок на відділ → None. Регресії немає.

R5 (LOW): канвас-ширина/висота зростуть (дерево ширше за пласке). Все похідне (bounds/canvas_dimensions/enrich_namespaces) адаптується з фінальних коордів. Масштаб/візуал зміниться — не дефект.

R6 (LOW): вертикальне накладання блоків різної висоти — tidy резервує горизонт. span (bw) на піддерево, тому y-перетин різних гілок безпечний (різні x). Залежить від КОРЕКТНОГО bw на все піддерево (мокап :80 коректний).

## ВЕРДИКТ
Жорстких блокерів СТАРТУ немає (все за прапором, golden захищений off-гілкою). Перед кодом вирішити: Q2 (singleton-блоки vs ряд — HIGH, інакше мета фічі під питанням) і R3 (джерело head/attachment-src). У план додати: R1 (cycle-guard) і R2 (stamp department_id). Q3: взяти ЛОКАЛЬНІ rel-коорди, не фінальні.
