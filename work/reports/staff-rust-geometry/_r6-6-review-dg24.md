claude-opus-4-8

# R6-6 review (варіант C: єдиний routing-seam) — незалежний рев'ювер Dg24

ДАЛІ: прочитати всі змінені файли (staffRouterV2.ts, staffLiveGeometry.ts, svgExport.ts, staffRouterV2.test.ts, svgExport.parity.test.ts) + staffEdgeGeometry.ts (сигнатура buildStaffEdgeSegments). Звірити git diff із заявами.

## ФАКТИ (перевірено)

1. **Еквівалентність v2 — байт-рівна.** `resolveStaffRouting` (staffRouterV2.ts:48-70): edgeBoxes тепер рахуються ПЕРЕД deptFrames. Обидві обчислення чисті й НЕзалежні: edgeBoxes залежить лише від input (mapPositionNodesToStaffEdgeBoxes + mapStaffEdgeBoxesForLod — чисті .map/spread, visualEdgeBox.ts:96-143), deptFrames — від contourSceneInputs(positionNodes, positionById). Жодна не мутує input (тест staffRouterV2.test.ts:128-137 «without mutating input» це пінить). Перестановка двох чистих незалежних обчислень → результат ідентичний.
2. **legacy дзеркалить старий інлайн.** staffRouterV2.ts:54-56: `buildStaffEdgeSegments(input.edges, edgeBoxes)` + `markedCrossings:[]`, той самий box-pipeline (mapStaffEdgeBoxesForLod∘mapPositionNodesToStaffEdgeBoxes) що був у старих else-гілках live/svg. Без deptFrames. Збіг точний.
3. **Споживачі seam — рівно два, обидва правильні.** staffLiveGeometry.ts:119 (`router: config.staffEdgeRouter==='v2'?'v2':'legacy'`, personTheme: theme.person) та svgExport.ts:287-288 (той самий маппінг, personTheme). Дефолт `staffEdgeRouter:'legacy'` (types.ts:471) → гілка `else`→'legacy'. Ніхто не лишився на старому if/else.
4. **Осиротілі імпорти прибрані.** grep: у svgExport.ts і staffLiveGeometry.ts НЕ лишилось жодного вжитку buildStaffEdgeSegments/mapStaffEdgeBoxesForLod/mapPositionNodesToStaffEdgeBoxes. StaffEdgeSegment (svg:296, live:54) та StaffEdgeBox (live:108) ще вживані — коректно лишені.
5. **Parity-тест має сенс.** routes.length>0 guard (рядок 96); non-arrow runtime-assert (97) — фікстура matrix+dotted; «той самий canvas» — тест перебудовує canvas тими ж параметрами (refCellWidth/Height, deptGrouping=router==='v2'), svgExport.ts:194-200; computeStaffLiveGeometry приймає `input.canvas ?? layout` (staffLiveGeometry.ts:81-82), тож live маршрутизує переданий canvas. Розбіжність реконструкції дала б FAIL, не фальш-pass (svg маршрутизує власний внутр. canvas). personTheme: svg = {...defaultNodeTheme.person, ...input.personTheme=∅} = defaultNodeTheme.person (svgExport.ts:272-275), тест ставить theme.person=defaultNodeTheme.person; width/height у box перезаписуються з n.* → на routes впливає лише theme.person. Коректно.
   Мінор: svgExport staffOpts містить `expandedOrgIds: undefined` (195-200), тест його опускає — benign (undefined≡omitted для layoutStaffCanvas); у разі розбіжності → FAIL, не фальш-pass.
6. **R7 не зачеплено.** git diff svgExport: лише блок routing (281-299), новий const STAFF_EXPORT_LOD, прибрані імпорти. Зони/департаменти/ширина/persons/org-cards без змін.
7. **Парсинг SVG коректний.** svgExport.ts:304 емітить `M${x} ${y} L...` БЕЗ округлення (на відміну від persons text), тож точки = точки route точно. Regex `[ML]([\d.eE+-]+) ([\d.eE+-]+)` ловить і від'ємні (-16). Стрілки = `<polygon>` (316) → відфільтровані. Group-regex non-greedy до першого `</g>` коректний (edges без вкладених `<g>`). markedCrossings змінює лише колір stroke (306), точки незмінні.

## НЕ-БЛОКУЮЧЕ
- StaffEdgesView.ts:100 тримає ще один виклик `buildStaffEdgeSegments(edges, boxes)` як fallback коли `routed` відсутній. На проді DiagramRenderer.ts:799 ЗАВЖДИ передає `{segments: routes}` із seam → fallback мертвий на основному шляху. Поза скоупом R6-6, pre-existing; варто зняти/позначити в R7 як латентне третє місце маршрутизації.
- Регрес (golden/frozen snapshot, 1307 passed, updated:0): НЕ запускав (інструкція). Стабільність снапшотів випливає з байт-еквівалентності v2 + точного дзеркала legacy; незалежно updated:0 не підтверджував прогоном.

## ВЕРДИКТ: APPROVE. Блокуючих нема.
