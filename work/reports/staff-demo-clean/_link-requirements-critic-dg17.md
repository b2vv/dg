claude-opus-4-8

# Адверсарний критик: прожарювання _link-requirements-vs-plan-dg17.md

ДАЛІ: прочитати сам аналіз, який критикую, потім вимоги.txt, потім весь трек shps-routing, код, план T126/T127, мокап. Записувати перелік прочитаного з кількістю рядків.

## КРОК 1 — прочитано поки що
- _link-requirements-vs-plan-dg17.md (52 рядки) — сам аналіз, який критикую
- ~/Downloads/вимоги.txt (240 рядків) — вимоги 4311, таблиця §1 зіпсована, §1-§11, §12 НЕМАЄ (файл закінчується §11 відкриті питання)
- shps-routing/spec.md (190) — GATE-r2-PASS, посилається на §12 req (owner 2026-10-21 вар.1)
- shps-routing/design-v3.md (351) — GATE PASS r5, варіант C, + амендмент A (grouping у layout)

ФАКТ: вимоги.txt закінчується на §11 (рядок 240, «Відкриті питання» 5 пунктів). §12 у файлі НЕМАЄ. Аналіз K2 це стверджує вірно.
ФАКТ: §7 вимоги.txt — колір `--line` «зараз нейтральний сірий», товщина `--lw` 2px, без стрілок, радіус 4 однаковий. Аналіз K3 цитує вірно, АЛЕ: spec §6/N2 каже колір через EdgeStyle токен `--color-cass-adm-diagram-link` = #c2502a dark/#b35a23 light — це НЕ «нейтральний сірий». Треба перевірити мокап.
ДАЛІ: прочитати решту shps-routing (plan, impl-brief, implementation-status, slice4, probe-results, design-v2, gate-reviews), код, T126/T127, ADR, owner-ledger, мокап.

## КРОК 2 — стан реалізації (ВАЖЛИВО: аналіз §0 неточний)
Прочитано: implementation-status.md(26), plan.md(146), impl-brief.md(69), slice4-seam-analysis.md(139), probe-results.md(63), staffRouterV2.ts(59), staffLayoutInputs.ts(96).

ФАКТ: Варіант C + Амендмент A РЕАЛІЗОВАНО й ЗАКОМІЧЕНО — commit 50fa73d «ВАРІАНТ C + Амендмент A — staff dept routing замість GoJS (4311)». Існують staffDeptGrouping.ts, orgBlockLayout.ts deptGrouping, resolveStaffRouting у render+export.
ФАКТ: resolveStaffRouting підключений в DiagramRenderer.ts:830 (за config.staffEdgeRouter==='v2') і svgExport.ts:283. deptGrouping=staffEdgeRouter==='v2' (staffLayoutInputs.ts:92).
ФАКТ: тільки таб 'staff-dept-v2' вмикає v2; staff-shps → legacy (tabConfigs.ts:168). → K8 аналізу ПІДТВЕРДЖЕНО.
ПОМИЛКА аналізу §0: «реалізація НЕ завершена ... зупинилась на шві ... це та сама проблема однієї правди про координати, яку ти назвав мандатом». Це цитата з implementation-status.md:16 — а той опис стосується ПОКИНУТОЇ engine-A codex-worktree (lineage spec.md→plan.md→impl-brief, конструктивний A з повним коридорним роутером), яка справді застрягла на порту rstest + шві. АЛЕ фактично landed варіант C (lineage design-v2→design-v3), і Амендмент A САМЕ розв'язав це питання шва (grouping переїхав у layout). Аналіз змішав дві лінії й подав stale-doc як поточний стан. implementation-status.md ЗАСТАРІЛИЙ щодо коду.
ФАКТ: дві РІЗНІ лінії дизайну. (1) spec.md→plan.md→impl-brief→probe-results: engine A конструктив, ПОВНИЙ коридор/доріжки роутер, highlightPath, lead-org kind. (2) design-v2→design-v3 (суперсідить v2): варіант C = обмежене групування + route-only, СВІДОМО НЕ відтворює коридор/track spec §3.3/§5.4 (design-v3 §Поза межами:160-163). Landed саме (2). Аналіз це не розрізнив явно — критично для D-таблиці (коридори/доріжки) та K5/K7.
ДАЛІ: staffEdgeGeometry.ts (порти/8px/коридори реально?), мокап CSS (--line/--lw скільки й де), ADR-0002, T126, T127b, owner-ledger, arch-review, a6-defense.

## КРОК 3 — код, мокап, план
Прочитано: staffEdgeGeometry.ts(461), мокап ШПС картка v3.html(CSS-грепи), ADR-0002(43), T126(68), owner-ledger O-1..O-39(56), T127b(85), validateRouteInput.ts(86), StaffEdgesView грепи, грепи highlightPath/lead-org.

K3 МОКАП: рівно ОДНЕ визначення --line:#c2502a і --lw:2px (body, рядок 12). Теми НЕ перемикаються (немає data-theme/prefers-color-scheme) — мокап лише dark. lead-org: .plink(р.30) і .org.cur::before(р.19) = 2px dashed #6b6b73 з міткою .plink span(р.31). tree: 30px проміжок (р.94/101), 9px горизонталь (р.97-99) — збігається з вимоги.txt §3.1/§5.2.
K3 РЕАЛЬНІСТЬ: конфлікт стилів НЕ 3, а 4: (1) вимоги.txt §7 сірий 2px; (2) мокап #c2502a 2px; (3) Figma-токени mockupStyles.ts edge #a6a6a6/1px/dot; (4) КОД StaffEdgesView STROKE нейтральний slate з теми (spec N2). Аналіз K3 назвав 3, пропустив що сам КОД уже використовує 4-те значення. Конфлікт реальний і НЕ вирішений. АЛЕ: #c2502a мокапа = spec N2 dark; сірий вимог ≈ Figma #a6a6a6 але 1px≠2px. lead-org dashed #6b6b73+мітка узгоджений між вимогами й мокапом (D7 вірний).

ФАКТ (виправляє аналіз): highlightPath(nodeId:string|null) УЖЕ Є — OrgHierarchyDiagram.ts:1599 + highlight.test.ts. Аналіз D5 подав як «новий метод у spec» (ніби ще нема). Примітив підсвітки шляху вже реалізований; сигнатура (nodeId) ≠ spec (ids).
ФАКТ (виправляє аналіз): validateRouteInput ВЖЕ підключений у продакшн — orgBlockLayout.ts:234 (не «лише тест у покинутій worktree»). Обробляє cycle/self/dangling/unknown-dept/collapsed-dept. Solid.
ФАКТ (виправляє аналіз): edge-edge детектор перетинів у ПРОДАКШН НЕМА (grep crossingDetector/properCrossing поза probe = порожньо). Landed v2 НЕ рахує edge-edge перетини — лише frame-intrusion (edgeIntrudesForeignFrame). Отже «0 перетинів» НЕ виконано навіть для v2.
ФАКТ (виправляє аналіз): 8px кліренс у landed v2 НЕ реалізований — around-lane pad=16 (staffEdgeGeometry.ts:97,111); obstacle=interior-hit (eps 0.75), не 8px. framePadding=8 лише для union рамки, не кліренс карток. K-loop/§12-релаксація НЕ реалізовані — resolveStaffRouting однопрохідний.
ПОМИЛКА K8 аналізу: «гарантії документа (0 перетинів, 8px) діють лише для v2» — ПЕРЕБІЛЬШЕННЯ: v2 як landed НЕ дає ні 0-edge-edge, ні 8px, ні коридорів/доріжок, ні портів deptTop/deptBottom, ні §12-драбини. v2 = групування + рамка-перешкода + маркер frame-intrusion. Це свідомо урізаний роутер (design-v3 variant C §Поза межами:160-163).
lead-org kind: у продакшн НЕМА (лише probe). D7 вірний.
markedCrossings фарбуються (StaffEdgesView.ts:116-122, акцент 0xe5491d/2px). Frame-intrusion marking wired.

K4 (O-29.2): owner-ledger O-29 п.2 дослівно: «без рамки картка організації якщо мається на увазі згорнути підпорядковану ОРГАНІЗАЦІЮ. Якщо за посаду що згорнули підпорядковані тоді рамка залишається». Контекст O-29 — про ОБГОРТКИ організацій (T127a), не про рамки відділів §8.1. Отже «рамка» в O-29.2 = обгортка ОРГАНІЗАЦІЇ, не рамка відділу. K4 трактує це як можливий конфлікт із §8.1 (рамка відділу) — ймовірно ХИБНИЙ конфлікт (різні шари). Питання L-4 все одно доречне, але подача «прямо суперечить §8.1» — перебільшення.
ДАЛІ: arch-review, a6-defense, a6-debate-critic (для K1 Rust-переносимості v3) — чи варіант C життєздатний у Rust-плані.

## КРОК 4 — Rust-переносимість і пропущені конфлікти
Прочитано: _arch-review-req3-dg17.md(155), _a6-ts-vs-rust-defense-dg17.md(41), _a6-debate-critic-dg17.md(47), probe/fixtures.ts(124).

K1/item5: arch-review ТА a6-debate-critic ОБИДВА дійшли висновку, що проблема «однієї правди» власника — це TS-vs-TS розходження (render padding ≠ export padding; якір у 3 місцях), НЕ Rust-vs-TS, і РЕКОМЕНДУВАЛИ ПРОТИ великої міграції в Rust. Власник це ВІДХИЛИВ (O-34/O-33/O-15 «Велика міграція в Rust»), ADR-0002 переписано під мандат. → мандат чинний попри арх-пораду.
item5 TS-специфічне в v3 (аналіз НЕ розкрив): (1) точки лінків залежать від LOD+правила порту — mapStaffEdgeBoxesForLod, visualPersonEdgeBox зсув AABB (visualEdgeBox.ts:25-49); Rust лейаут LOD не знає (a6-defense З2 — ключовий аргумент). (2) async epoch-guard — render-concern. (3) WASM sibling-order reverse (ploeg_layout.rs:48 .rev()) — вже відома крихкість. (4) K-loop §12 re-invoke grouping: якщо grouping→Rust (T126 R3), кожен прохід перетинає WASM-межу, а re-score лишається TS (потребує LOD) → K-loop розтягнутий через межу; перф не виміряно (T126 Q-2/R10). Аналіз K1 «алгоритм v3 переносимо в Rust» — глянцево, не торкнувся цього тертя.
D8 fixtures: probe/fixtures.ts має ЛИШЕ scheme2/4/5 + perf (3 з 9 схем §10.1). Схеми 1,3,6,7,8,9 відсутні. Аналіз D8 «фікстури вже є» перебільшує, хоч і каже «покриває частину» + «§3.3 не перевіряється».

ПРОПУЩЕНІ аналізом конфлікти (item4):
- §5.1 набір перешкод БАГАТШИЙ: картка+8px, заголовок .dn+4px, ЧУЖІ рамки, ПЛАШКИ .plink span, КНОПКИ .tg, ЛІЧИЛЬНИКИ. dg-роутер рахує лише картки+рамки; кнопки/плашки/лічильники НЕ перешкоди. Аналіз не згадав.
- §6.5 порядок перебудови: вимоги.txt §6.5 = переставити→розширити→опустити (swap→widen→drop, р.148-150). Але spec §12.1 (owner authoritative) = widen→swap→drop. spec r2 сам це помітив як non-blocking. Аналіз K7 згадав цикл, але НЕ розбіжність порядку між вимоги.txt і §12.1.
- §4 «top приймає рівно одну лінію» — інваріант, який dg не форсить. Аналіз D2 згадав мимохідь, не як обмеження.
- §7 z-order «лінії нижче карток» — аналіз не згадав (у dg edges-шар; ймовірно ок, але не перевірено/не названо).

ПОМИЛКИ аналізу (підсумок):
1. §0 «реалізація НЕ завершена, зупинилась на шві» — ХИБНО: варіант C+Амендмент A landed (50fa73d), wired, validateRouteInput у продакшн. implementation-status.md стосується ПОКИНУТОЇ engine-A worktree. Ця помилка вже скопійована в T126 §4a і ADR-framing. BLOCKING (план спирається на хибну передумову).
2. K8 «гарантії 0-перетинів/8px діють для v2» — ПЕРЕБІЛЬШЕННЯ: landed v2 НЕ дає edge-edge/8px/коридорів/портів/§12. BLOCKING для точності.
3. D5 highlightPath «новий метод у spec» — вже існує (OHD.ts:1599). non-blocking.
4. K4 «прямо суперечить §8.1» — ймовірно хибний конфлікт (O-29.2 про обгортку орг, не рамку відділу). non-blocking.
5. §0 «це НЕ нові вимоги» суперечить формулюванню власника O-39 «додаткові вимоги» — тон вирішення за власника. non-blocking.
6. K3 назвав 3 стилі, їх 4 (код StaffEdgesView = нейтральний slate). non-blocking.

ПОГОДЖУЮСЯ: K2 (вимоги.txt без §12 — підтверджено, файл кінчається §11), K3-ядро (конфлікт стилів реальний), K5 (бічні порти суперечать §4 — horizontalPolyline для matrix/dotted реально), K6 (§9 ELK/SVG — рекомендація не вимога), K8-факт (staff-shps=legacy, tabConfigs.ts:168), D7 (lead-org новий, dashed #6b6b73+мітка узгоджено вимоги+мокап), D9 (parentPositionId у типі, демо не заповнює).
