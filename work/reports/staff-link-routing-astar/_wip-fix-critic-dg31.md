claude-opus-4-8

ДАЛІ: читаю staffLiveGeometry.ts (поточний + HEAD), orgBlockLayout.ts:340-440, canvasLayout.ts, adaptStaffGeometry.ts, фікстури. Шукаю пастки у фіксі «гейт за coordMode».

## ФАКТИ (path:line)
- Rust tree-only, ІГНОРУЄ coordMode: `staff_layout.rs:883` (layout_staff_org_block → завжди layout_tree_block/dept-group, нема matrix-гілки) + `:494→162` throw на headless.
- Default coordMode = **hybrid**, НЕ tree: `types.ts:69`. `buildStaffLayoutOptions` НЕ задає staffCoordMode явно — лише `...staff?.layout` (`staffLayoutInputs.ts:84-93`). Отже у glue `staffOptions.staffCoordMode` майже завжди undefined → гейт `=== 'tree'` майже завжди FALSE.
- coordMode розв'язується ПО-ОРГ усередині `orgBlockLayout.ts:363,385-396` (per-tier блоки layoutStaffCanvas). Scene-level дзеркало неточне.
- Старий render-шлях = `layoutStaffCanvas` (canvasLayout.ts:43, повні tiers/zones/lead-org/orgCards), НЕ `layoutStaffOrgBlock`. git show HEAD:staffLiveGeometry підтверджує (layoutStaffCanvas + enrichStaffTierBands + resolveStaffRouting).
- 46 падінь: лише overlappingStaffData задає `staffCoordMode:'matrix'` (layoutDiagnostics.test.ts:50,64); 15× gridCell-interactions НЕ задають (default hybrid + coords + no isHead). Mode-string-гейт їх пропустить → знову Rust → знову crash.
- Golden (demo): `staffGeometry.golden.test.ts` через ту саму `computeStaffLiveGeometry`; таби variant-b/staff-1m/mockup-staff-magnetic. dg30: ці мають КОНВЕРГУВАТИ matrix→tree через Rust (SYNTHESIS:25,32; HANDOFF:15). Але вони coord-bearing (VARIANT_B_POSITIONS col/row→gridCell).
- Helpers усі на диску: canvasLayout/staffZoneBounds/staffRouterV2/resolveDeptHeads.
- adaptStaffGeometry повертає `canvas.tiers=[]` (adaptStaffGeometry.ts:165); TS-шлях дає populated tiers. Golden читає canvas.tiers як `bands`.

## ВИСНОВОК
🔴 Headline: дискримінатор. golden demo-сцени (coords+head) і 46 фікстур (coords, no head) ОБИДВІ coord-bearing hybrid-default. coordMode/coords НЕ розрізняє їх. Реальний сепаратор — head-resolvability / намір тесту.
