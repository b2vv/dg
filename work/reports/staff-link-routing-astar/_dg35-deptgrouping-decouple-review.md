# dg35 review — decouple staffDeptGrouping

Model: claude-opus-4-8

ДАЛІ: прочитати git diff (незакомічені зміни в 4 файлах), потім перевірити A/B/C/D.

## ФАКТ — diff (git diff)
4 файли, ~15 рядків. types.ts: `staffDeptGrouping?: boolean` + default false.
staffLayoutInputs.ts:94 та svgExport.ts:206 — `deptGrouping = config.staffDeptGrouping === true || config.staffEdgeRouter === 'v2'`.
tabConfigs.ts:132 — mock3 `staffDeptGrouping: true`.

## A — Регресія-нуль: PASS
- Для всіх табів без прапора: `undefined === true` → false → fallback до `staffEdgeRouter==='v2'` — ідентично старому.
- staff-dept-v2 (tabConfigs:195 router='v2'): false||true = true. Збережено.
- legacy-таби: false||false = false. Збережено.
- Тест staffLayoutInputs.test.ts:22 — default staffDeptGrouping=false, router='legacy': LHS=false, RHS=false → true. Прогнано: 6/6 PASS.

## B — Пропущені споживачі: PASS (жодного)
grep показав дві деривації deptGrouping з router==='v2' — обидві оновлені (staffLayoutInputs:94, svgExport:206).
Два місця з router==='v2' (staffLiveGeometry:255, svgExport:296) — це вибір ROUTER, не grouping; правильно НЕ чіпати.
buildStaffLayoutInput.ts:70 читає вже обчислене options.deptGrouping — не деривує з router. OK.

## C — Фіча оживлена: PASS (ланцюг end-to-end)
staffLiveGeometry:137 buildStaffLayoutOptions(config) → options.deptGrouping=true (mock3)
→ :185 buildStaffLayoutInput({options, treeBlockLayout:true(:193), useAstar:true(:192)})
→ buildStaffLayoutInput:70 deptGrouping=true + :245 treeBlockLayout=true → Rust input
→ staff_layout.rs:1294 geom.tree_block=true; :1189 use_dept = dept_grouping && departments≠∅ && ∃department_id
→ mock3Shps.ts:124 departments + :136 departmentId → use_dept=true
→ :1194 group_staff_by_department → :649 if geom.tree_block → pack_tree_block. staffTreeBlockLayout БІЛЬШЕ НЕ мертвий.

## D — Межі/пастки: без блокерів
- staffEdgeRouter лишається 'legacy' для mock3 (не змінено). A* працює через useAstar=true у Rust-геометрії (staffLiveGeometry:192), TS-роутер (resolveStaffRouting:255) = 'legacy'. Ця зв'язка існувала ДО dg35; dg35 її не чіпає — лише layout (позиції нод) тепер dept-grouped, і Rust A* будує ребра над тими ж позиціями. Самоузгоджено.
- Побічні ефекти (dept-регіони/кадри, departmentStyle 'card' → картки департаментів) — ЦЕ й є ціль (форма мокапу), не регресія. orchestrator_dept_grouping_emits_frames (rust:2605) підтверджує емісію кадрів.
- svgExport parity-зміна default-false — без регресії; захищає export-шлях.
- Ніт (не блокер): `staffDeptGrouping` — DEV-поле RenderConfig, не метод фасаду OrgHierarchyDiagram, тож facadeSurface-гейт не вимагає USAGE-запису (прецедент: staffUseAstar/staffTreeBlockLayout додані так само).

## РІШЕННЯ: GREEN. Нічого виправляти перед комітом.
