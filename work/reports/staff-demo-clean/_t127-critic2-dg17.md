claude-opus-4-8

# T127 друга адверсарна критика (dg17, свіжий контекст)

ДАЛІ: прочитати три файли плану (T127, T127a, T127b) повністю, тоді контекст (перша критика, tree-analysis, wrapper-map, ADR 0002), тоді перевірити твердження в коді.

## ФАКТИ (звірено з кодом, 2026-10-27)

### B1-B4 (перша критика) — усі зняті на рівні плану
- B1 (одне дерево vs I-T1): ЗНЯТО. D-4 переформульовано «композиція, що ВИГЛЯДАЄ деревом»; I-T1 — вимірна формула; §8 «одне дерево поза скоупом».
- B2 (зона vs обгортка, канал ролі): ЗНЯТО. §2 глосарій розділяє 3 сутності; a3 кладе role на StaffOrgWrapper явно. Заземлення підтверджено: types.ts:147 role?:'leading'|'current' (нема subordinate), org-cards band без organizationId.
- B3 (blast radius): ЗНЯТО. a0 baseline + I-R1; green-first знято мутацією.
- B4 (SPEC після спеки): ЗНЯТО. D-7, b2 залежить від b1 («ПІСЛЯ b1»).

### Заземлення нових тверджень — переважно ВІРНІ
- Жест1 onPersonClick→onNodeClick: ВІРНО (OrgHierarchyDiagram.ts:907-913; план каже :906-912 — зсув 1).
- Жест2 togglePositionExpand :905 (план :904 — зсув 1); onPositionExpandToggle :904. ВІРНО по суті.
- Жест drill onStaffOrgDrill :901 → focusStaffOrg :902 (план «:902»). ВІРНО по суті.
- focusNode:1754-1762 — лише applySelection+panToNode, НЕ розкриває. ВІРНО.
- «Знайдено» ніде в packages (grep exit=1). ВІРНО.
- foundDimAlpha ?? 0.38 DiagramRenderer.ts:517; setFoundFocus:1606. ВІРНО (тьмяніння є, рамка/плашка/pulse нема).
- maxExpandedOrgCards :161-167; штатка під карткою originY=cardY+orgCardHeight+verticalGap :192. ВІРНО.
- focusStaffOrg у USAGE лише :289. ВІРНО. getStaffLayoutEdges e2eBridge:146 + staffLayoutEdgesFor:167. ВІРНО (перший критик помилявся, що символу нема).
- revealNodeId/applyInitialExpand існують (initialExpand.js; OrgHierarchyDiagram:406-426). b6d «перевірити реюз» — заземлено.

### НЕВІРНІ / неповні твердження плану
1. «Площа видалення (виміряна)» focusStaffOrg НЕповна по докам: пропущено CONTEXT.md:79 («_Avoid_: Drill (focusStaffOrg)») і work/README.md:85 (рядок індексу T121). CTO-RESEARCH.md:385 згадано лише в b7, не в §7c.8-списку. Арифметика коду (5/2/1/4/2) сходиться, доки — ні. «Виміряна» перебільшує повноту (MEMORY: measurement-boundary-claims).
2. a3/§7b перелік споживачів tiers/cross-tier (~6 файлів) НЕ повний. Реальний слід grep: ~20 src (canvasLayout, types×2, staffEdgeGeometry, StaffZonesView, StaffEdgesView, staffZoneBounds, DiagramRenderer, render/index, staff/index, svgExport…) + demo (tabConfigs, shpsStaff, mockupStaff) + e2e/mockups.spec.ts + 5 тест-файлів. §5 дає ширше «15 файлів», але a3/a4-готовність ні. typecheck ловить rename типів; рядкові 'cross-tier' — не всі.

### BLOCKING для окремих ґейтованих підзадач (не для Фази 0)
- b6e: публічний delta API НЕдовизначений. setStaffFocus(:1292) і getStaffFocus(:1297) — окремі ПУБЛІЧНІ методи, зав'язані на staffFocus-стан; focusStaffOrg:1443 викликає setStaffFocus. «Поточна орг = завжди staffCurrentOrgId», але setStaffFocus САМЕ його й ставить. План не каже, чи setStaffFocus/getStaffFocus лишаються / видаляються / стають заміною. «5 у OrgHierarchyDiagram» конфлейтить focusStaffOrg+setStaffFocus+onStaffOrgDrill без імен. (У USAGE їх нема → facadeSurface видалення НЕ зловить, хоч вони публічні.)
- b6e doc-повнота (див. НЕВІРНІ #1).
- a4: blast radius занижений (див. НЕВІРНІ #2).

### Non-blocking
- Жест3: onOrgClick:888-894 ЗАРАЗ стріляє onNodeClick для орг-карток; §7c.7 «лише розгортає» → b6c описує візуал заміни, але не зазначає, що треба відрізнити клік підпорядк.-картки від onNodeClick.
- a5 і a6 обидва правлять canvasLayout.ts і обидва залежать від a4; граф не маркує їх взаємно-послідовними (лише a4→кожен). Якщо паралелити codex-ами → конфлікт файлу. Неявно послідовні (не в parallel-списку).
- «більше render-налаштувань» (нотка) — нема окремої підзадачі (частково a8/a9).
- «відступи в Rust» (нотка) — a6 робить у TS; відкладено в T126; ризик редо названо «шов». Власнику підтвердити TS-now.
- Зсуви рядків: :906-912 vs :907-913; SPEC:240-250 vs :244-246.
