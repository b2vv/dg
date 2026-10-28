claude-opus-4-8

# R6-7b review (deptTop head-target порт) — незалежний рев'ю Dg25

ДАЛІ: читаю критик, повний diff, нові файли. (виконано)

## ФАКТИ (звірено з кодом поверх HEAD 7c68419, незакомічено)

### Пастки критика
- **П1 (endpoint lands)**: синтетична ціль `routeTo = {id: to.id, x: to.x+to.width/2-1, y: headFrame.rect.y, w:2, h:2}` (staffEdgeGeometry.ts:457-459). verticalPolyline childBelow → endpoint (toCx, to.y) = (headCardCx, frameTop). Golden підтверджує (444,70). around-TOP → (headCardCx, frameTop). around-LEFT → (headCardCx-1, frameTop+1): ±1px неточність, у межах радіуса кружечка (3.5). Джерело org→dept-head завжди вище → direct vertical, around рідкісний. НЕ блокер.
- isClean/obstacle-skip: `box.id===to.id` (=real head id, synthetic зберігає id) пропускається в blocked() :362 → реальна головина картка НЕ блокує маршрут. isClean чекає синтетичну 2×2 (ендпойнт на її top edge, interior не пробивається). ✓ «БЕЗ заходу в картку»: frameTop на 8px (padding) вище картки. ✓
- **П2 (flag не ре-деривується)**: `endsOnDeptTop` ставиться 1 раз у buildStaffEdgeSegments:473. Обидва painter читають прапор: svgExport.ts:335, StaffEdgesView.ts:91 (dashed) + :104 (solid). ✓
- **П5 (DEPT-scoped, graceful)**: resolveDeptHeads.ts:34 порівнює `deptOf.get(parent) === dept` (департамент, НЕ орг). Нема кореня → dept відсутній у map, caller фолбек на card-top (staffRouterV2.ts guard `memberIds.has(headId)`), без crash. Тест «graceful cycle» зелений. ✓
- **П6 (детермінізм)**: roots.sort() :42, head=roots[0] (by positionId, не input order). Тест multi-root forward/flipped обидва → d1-a. Golden tripwire «reproduces exactly on second build» зелений. ✓
- **П7 (строга гілка)**: staffEdgeGeometry.ts:454-455 `kind==='admin' && f.headId===toId && !f.memberIds.has(fromId)`. Негативний тест покриває non-head target, member-source, matrix-kind — усі endsOnDeptTop=falsy. ✓ lead-org/matrix/dotted/member не поглинаються.
- **П8 (seam геометричний)**: resolveDeptHeads викликається в callers (staffLiveGeometry.ts:117, svgExport.ts:302), у seam іде готовий `ReadonlyMap`. reportLines/resolveHead у seam НЕ протекли. ✓
- **entry-dot єдине джерело**: ENTRY_DOT_RADIUS=3.5 у staffEdgeArrows.ts:4, імпортується обома. Live (StaffEdgesView drawEntryDot: last point, r, color=style.color, alpha) та SVG (end=last point, r, fill=color) — ІДЕНТИЧНІ. Live бере `pts`/`seg.points` (НЕ shortened), SVG бере `s.points` — та сама остання точка. H3 ✓.

### Інваріанти
- §12 foreign-frame: to.id=head є member власної рамки → `!frame.memberIds.has(to.id)` виключає власну рамку (edgeIntrudesForeignFrame :256-258). deptTop-кінець на власній рамці НЕ маркується хибно. ✓
- legacy-роутер card-top: headId ставиться ЛИШЕ в staffRouterV2 seam (:72); frames без headId → headFrame не знайдеться → deptTop лише v2. ✓
- H3 паритет точок+dot: один seam (resolveStaffRouting) для live+SVG. ✓

### Golden
git diff: РІВНО 24 рядки, 3 hunks × 8, усі всередині `points`. 3 ребра `kind:admin` (u-head→b1, звірено `git show HEAD`), змінились ТІЛЬКИ `y`, усі кінці → (444, 70)=frameTop. 0 дрейфу positionNodes/bounds/orgCards. Заяву власника ПІДТВЕРДЖЕНО.

### Прогони
- typecheck: чистий (sdk + demo + e2e).
- sdk `resolveDeptHeads staffEdgeGeometry svgExport.parity`: усі зелені (включно з 2 новими deptTop + SVG circle).
- demo `staffGeometry`: зелений, tripwire детермінізму OK.

## Знахідки (NON-BLOCKING)
1. **Arrow + dot на deptTop (design-confirm).** admin → `withArrow=true` (StaffEdgesView:86, svgExport:315), тож на deptTop-кінці малюється І стрілка, І кружечок `.ent`, обидва в останній точці. Прототип shps-links.js для head дає лише `.ent` (без стрілки). Скоуп власника явно не казав прибрати стрілку. Обидва painter узгоджені (не H3-брейк) — але варто підтвердити намір власника. path: StaffEdgesView.ts:99-104, svgExport.ts:323-338.
2. **around-left ±1px** (staffEdgeGeometry.ts:111): для рідкісного around-left ендпойнт (headCardCx-1, frameTop+1), не рівно top-center. У межах радіуса dot. Косметика.
3. **SVG parity-тест слабкий асерт**: лише `toContain('<circle')` (svgExport.parity.test.ts:187), без позиції/радіуса/кольору. Точну геометрію покриває staffEdgeGeometry-тест. Достатньо як smoke.
4. **adminParent last-wins** (resolveDeptHeads.ts:26): при 2 admin-батьках на 1 toId останній reportLine перемагає — не стабільно під reorder reportLines. Валідне admin-дерево однобатьківське; теоретичний edge, не впливає на H6-тест (positions reorder).

РІШЕННЯ: вердикт нижче.
