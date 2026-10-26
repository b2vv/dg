claude-opus-4-8

# Gate v3 review — r5 (re-GATE, свіжий контекст)

ДАЛІ: прочитати design-v3.md + r4-звіт, перевірити r4-фікс (спільний resolveStaffRouting) на когерентність, зробити повний SWEEP routing-споживачів.

## ФАКТ — задача 1: когерентність спільного оркестратора
- render-path (DiagramRenderer.ts, HEAD eb1fab8): `renderStaffCanvas` async(:600); layoutStaffCanvas await :631 з ПОВНИМ data (organizations/positions/reports/groups/departments/persons); guard :643; zones :665; await paintStaffDepartments :666; guard :667; paintStaffFrameAndEdges :668. Вставка `await resolveStaffRouting` між :643 і :665 реальна; усі входи resolve (theme.person, options.lod, canvas.orgCards, positionById, positionNodes/edges) наявні. ✅
- svgExport (svgExport.ts): `buildDiagramSvg` — ОДНОРАЗОВА exported async fn(:164). layoutStaffCanvas await :194 з ПОВНИМ data; на точці :270 має canvas.positionNodes/canvas.edges/canvas.orgCards(:274), positionById(:242), personTheme(:265), lod='near'(:281). Усі входи resolveStaffRouting наявні + raw data(reports/departments/positions/orgId :196-203) у scope. ✅ обидва споживачі МОЖУТЬ кликати спільну standalone fn.
- epoch для svgExport: НЕ потрібен. buildDiagramSvg — one-shot (нема setData/resize/epoch/isRenderCurrent); concurrent re-entry у межах одного виклику неможливий. Design коректно вимагає guard-after-await ЛИШЕ в render-path (line 122), асиметрія правильна. ✅
- guard-after-await render-path: design line 122 спеллить `if(!this.isRenderCurrent(epoch)) return;` одразу після await; guard лишається в DiagramRenderer (caller), standalone fn epoch не потребує. Когерентно. ✅

## ФАКТ — import-напрям
- Лінт-конфіг dependency-cruiser/eslint boundaries у репо НЕ знайдено (конвенція, не машинний гейт).
- grep `layout → render` imports: 0 occurrences (layout НЕ імпортує render ніде). render→layout існує (DiagramRenderer:15). export(svgExport)→render існує (:16,:24) і →layout (:3).
- resolveStaffRouting потребує render/visualEdgeBox map-функцій (mapPositionNodesToStaffEdgeBoxes/mapStaffEdgeBoxesForLod) + layout buildStaffEdgeSegments/staffDeptGrouping. Тож МУСИТЬ жити в render/ (або export/) — downhill imports. Якби в layout/ (гіпотеза задачі layout/staff/routing/) → layout→render import, якого зараз 0 → порушення конвенції.
- Design НЕ пінить директорію (`staffRouterV2.ts` без шляху), але описує залежність від render-map-функцій → render/ форсується by-construction. НЕ blocking (конвенція дотримується, якщо в render/), але design мав би назвати директорію явно. NON-BLOCKING нота.

## ФАКТ — задача 2: ПОВНИЙ SWEEP routing-споживачів (production, non-test)
Routing-DECISION sites (кличуть staffEdgePolyline/buildStaffEdgeSegments для обчислення маршруту):
1. render-path: DiagramRenderer:789-801 → StaffEdgesView.fromLayout → StaffEdgesView.redraw:89 `buildStaffEdgeSegments`. ШПС. ЗАДЕКЛАРОВАНО (render-path). ✅
2. svgExport.ts:270 `buildStaffEdgeSegments`. ШПС. ЗАДЕКЛАРОВАНО (r4). ✅
3. matrixLayout.ts:125 `staffEdgePolyline` (orthogonalPath для buildMatrixEdges). → ОРГ-діаграма (computeMatrixLayout над DiagramOrganization[]/DiagramOrgLink[], НЕ positions). ПОЗА ШПС-scope. NON-BLOCKING.
Не-routing / не-site:
- staffEdgeGeometry:73 staffEdgeEndpoints — внутр. helper примітива; 0 production-callers.
- spineBusEdges.ts:187 `staffEdgePolylineToSvg` — ЧИСТА серіалізація готових points (жодного routing-рішення); споживається лише matrixLayout (орг). Не routing-site.
- _shps-routing-probe/probeA,probeB — spike/probe, НЕ імпортуються production (0).

РАХУНОК: 2 ШПС routing-decision sites (обидва задекларовані, обидва тепер уніфіковані під resolveStaffRouting) + 1 орг-діаграма site (matrixLayout, поза scope) + 1 серіалізатор (spineBus, не routing). ЖОДНОЇ незадекларованої ШПС-ділянки. Третьої ШПС-site НЕМА.

## РІШЕННЯ / вердикт
PASS. Спільний оркестратор когерентний (обидва споживачі async, тримають входи); import-напрям чистий by-construction (render/); SWEEP не знайшов незадекларованої ШПС-routing-ділянки — усі 2 ШПС sites задекларовані й уніфіковані.

NON-BLOCKING ноти (у tasks, не блокують старт):
- N1: design не пінить директорію resolveStaffRouting — має бути render/ (не layout/), інакше layout→render import (зараз 0). By-construction форсовано залежностями.
- N2: сигнатура resolveStaffRouting(positionNodes,edges,{theme.person,lod,orgCards}) НЕ несе grouping-входів (reports/departments/positions/inOrg), яких K-loop step1+step3 (staffDeptGrouping rebuild) потребує. Обидва споживачі ці дані ТРИМАЮТЬ (повний data у scope) → доповнюється без редизайну. Також дрібна неузгодженість formulювання: line 117 «повертає фінальні positionNodes» vs line 124 «resolve мутує positionNodes» — обидва працюють, уточнити.
- N3: classifyStaffEdgeRoute (спільний примітив) після frame-skip-розширення має ТРЕТЬОГО callera — matrixLayout:125 (орг-матриця). Нейтральний by-construction (frame-skip gated на memberIds, яких орг-obstacles не мають) — але design цього co-callera не називає. Орг-scope, non-blocking.

Жодна з нот — не клас «routing-placement over different geometry» (r2/r3/r4). Escalation-клаузу r3 НЕ тригернуто. Шов повний.
