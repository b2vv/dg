# T2b STAFF seam recon — _wip

ДАЛІ: прочитати DiagramRenderer.ts (renderStaff/renderStaffCanvas ~:614-704, resolveStaffZoneStyle ~:1224, diagnostics :479/:679/:914/:1504), inferStaffCurrentOrgId.ts, staff/canvasLayout.ts, staff/types.ts; render() dispatch :455. Repo: ~/projects/dg @ bulk-mutations 19e865b. Read-only.

## ФАКТ — DiagramRenderer.ts staff-карта (@19e865b)
- render() sig :424-431; 6-й param `orgLayoutResult?: OrgLayoutResult` :430 (T2a seam). epoch=++renderEpoch :435.
- render() dispatch: lastDiagnostics=[] reset :445; `hasStaff = data.positions.length>0` :456; renderStaff :458; else-if orgs → renderOrganizations(...,orgLayoutResult) :460; isRenderCurrent guard :462.
- renderStaff :615-631: ctx:623; currentOrgId = options.staff?.currentOrgId ?? inferStaffCurrentOrgId(data) :624; IF currentOrgId && orgs.some(id===) → renderStaffCanvas(ctx,currentOrgId) :625-627; ELSE renderPositionGrid(ctx) :630 (grid-fallback, НЕ рахує staff layout).
- renderStaffCanvas :634-706: staffOpts :655-665 (nodeWidth=theme.person.width, nodeHeight=theme.person.height, refCellWidth=config.cellWidth, refCellHeight=config.cellHeight, zoneLabelBand[local], ...options.staff?.layout, deptGrouping=config.staffEdgeRouter==='v2', expandedOrgIds=options.staff?.expandedOrgIds ?? options.staff?.layout?.expandedOrgIds). zoneLabelBand :648-654 обчислюється через resolveStaffZoneStyle(theme,resolvedTheme) якщо config.staffZoneChrome. layoutStaffCanvas({organizations,positions,reports:data.reportLines,groups,departments,persons}, currentOrgId, staffOpts) :666-677. isRenderCurrent guard :678 (ПІСЛЯ await). lastDiagnostics=[...canvas.diagnostics] :680. staffMerged = {...DEFAULT_STAFF_LAYOUT_OPTIONS,...staffOpts} :682. geom :683-690. dragGrid :691-698. consumers canvas :700-705 (paintStaffZones/paintStaffDepartments/paintStaffFrameAndEdges/addStaffPersonCards/addStaffOrgCards).
- resolveStaffZoneStyle :1232-1259 — МОДУЛЬНА ФУНКЦІЯ (не метод, НЕ тягне this), sig (theme:NodeTheme, mode:'light'|'dark') → StaffZoneStyle. ЧИСТА, повністю релокується/експортується. Викликається :650 (zoneLabelBand), :738, :817.
- diagnostics канал: private lastDiagnostics:string[] :176; reset [] :445; reportContourDiagnostic append :478-480; renderStaffCanvas set [...canvas.diagnostics] :680; getLayoutDiagnostics(): readonly string[] :286-288 (НЕ :1504 як в estimate).
- renderPositionGrid :993-1070: НЕ викликає layoutStaffCanvas; contours.paint + matrixNodeBoxes; diagnostics від нього НЕ йдуть (lastDiagnostics лишається [] з reset). isRenderCurrent guard :1024.
- renderOrganizations :1072-...: orgLayoutResult ?? await computeOrgLayout(...) :1085-1091; guard :1092 — ДЗЕРКАЛО T2a для staff.
- StaffSceneContext :120-127 {data,theme,resolvedTheme,config,options,epoch}. StaffSceneGeometry :130-137.

## ФАКТ — хелпери (чисті)
- inferStaffCurrentOrgId(data:DiagramData):string|undefined — render/inferStaffCurrentOrgId.ts:7-14. ЧИСТА, вже експортована, свій файл. Логіка: 1 унік org серед positions→він; 1 org→він; 1 head→його org; else orgIds[0]. Імпортована у facade :33 і в svgExport.
- resolveStaffZoneStyle — DiagramRenderer.ts:1232-1259, модульна (НЕ метод), (theme,mode)→StaffZoneStyle. ЧИСТА. Зараз НЕ експортована (file-local). Для facade треба export або дублікат.

## ФАКТ — типи
- layoutStaffCanvas(data:StaffCanvasInput, currentOrgId:string, options:StaffLayoutOptions={}):Promise<StaffCanvasResult> — staff/canvasLayout.ts:43. THROWS StaffLayoutError якщо currentOrgId не в orgs (:50-52).
- StaffCanvasInput — canvasLayout.ts:14-21 {organizations,positions,reports,groups,departments,persons} (всі зрізи DiagramData).
- StaffLayoutOptions — types.ts:12-58. StaffCanvasResult — types.ts:141-150: {currentOrgId, tiers, positionNodes, edges, orgCards, width, height, diagnostics:string[]}. diagnostics ВЖЕ їде в результаті (:149).

## ФАКТ — facade OrgHierarchyDiagram.ts (T2a дзеркало)
- renderNow :738-777: captureDrawingState :753; reportIfRenderFails(IIFE promise) :754-775 — org: orgLayoutResult = (positions.length===0 && orgs>0) ? await computeOrgLayout(...) : undefined :756-763; потім host.renderer.render(drawing,...,orgLayoutResult) :764-771 — COMPUTE+RENDER в ОДНОМУ promise. afterRender :776.
- buildRenderOptions :826-...: options.staff заповнюється ТІЛЬКИ коли viewState.staffCurrentOrgId задано :830-839 (currentOrgId, layout{...staffLayout,expandedPositionIds}, expandedOrgIds). Якщо staffCurrentOrgId порожній → options.staff=undefined, і renderer сам інферить.
- reportIfRenderFails :955-974: await pending; success→lastDrawnData/StaffOrgIds; catch→onRenderFailed + rethrow. Layout throw (StaffLayoutError) з render() сюди долетить.
- afterRender :932-943: onLayoutDiagnostics?.(getLayoutDiagnostics()) :936.
- getLayoutDiagnostics (facade) :1526-1535: READS this.renderer.getLayoutDiagnostics() :1527 + додає engine-рядок. => diagnostics-канал = renderer.lastDiagnostics. Якщо staff compute переїде у facade, АЛЕ renderer так само пише lastDiagnostics з переданого canvas — канал ЦІЛИЙ.

## ФАКТ — PRECEDENT: export/svgExport.ts рахує staff ПОЗА рендером
- buildDiagramSvg :166: focusedStaffOrgId = resolveFocusedStaffOrgId(data,input.currentOrgId) :176; dispatch orgOnly vs staff-canvas :177-188; staffOpts :190-196 (refCellWidth/Height=config, ...input.staffLayout, deptGrouping=staffEdgeRouter==='v2', expandedOrgIds); layoutStaffCanvas :197-208. (svg-варіант ОПУСКАЄ nodeWidth/nodeHeight/zoneLabelBand.)
- resolveFocusedStaffOrgId :120-129: currentOrgId-valid?→він; else inferStaffCurrentOrgId(data).
- ⚠️ РОЗБІЖНІСТЬ семантики: renderStaff бере `staff?.currentOrgId ?? infer` (?? лише на null) → якщо explicit currentOrgId INVALID, renderer НЕ інферить, йде в grid. svgExport.resolveFocusedStaffOrgId при invalid explicit → інферить. facade T2b МУСИТЬ копіювати семантику RENDERA (не svg), інакше поведінка зміниться на invalid explicit id.

## ФАКТ — тести-сторожі
- layout-рівень: staff/staffLayout.test.ts, staff/canvasLayout.deptGrouping.test.ts, staff/staffDeptGrouping.test.ts, staff/positionExpand.test.ts.
- render-рівень (КРИТИЧНІ для шва): render/layoutDiagnostics.test.ts, render/staffOrgExpand.interactions.test.ts, render/personReparent.contract.test.ts, render/positionExpand.interactions.test.ts.
- 🔴 layoutDiagnostics.test.ts: :45-53 викликає renderer.render() НАПРЯМУ (staff.currentOrgId:'org1', БЕЗ 6-го param) і чекає renderer.getLayoutDiagnostics() містить 'Anchor overlap'; :56-66 clean→[]. => renderer-direct шлях ОБОВ'ЯЗКОВО має лишити in-renderer fallback-compute layoutStaffCanvas (як renderOrganizations лишив computeOrgLayout fallback), інакше ці тести впадуть порожні. :69-92 facade getLayoutDiagnostics+callback; :94-116 engine-рядок survives 2nd render.

## ПРОПОЗИЦІЯ relocation (план, без коду)
1. render() 6-й param: розширити від `orgLayoutResult?: OrgLayoutResult` до ДВОХ окремих опційних (краще за union — дві гілки взаємовиключні за hasStaff, а union заплутає call-site): додати `staffCanvasResult?: StaffCanvasResult`. renderStaff/renderStaffCanvas отримують його; renderOrganizations лишає orgLayoutResult. Union можливий, але окремий param читабельніший і типобезпечніший (різні shape).
2. renderStaffCanvas: `const canvas = handedStaffResult ?? await layoutStaffCanvas(input, currentOrgId, staffOpts)` — FALLBACK compute ОБОВ'ЯЗКОВИЙ (дзеркало renderOrganizations), щоб renderer-direct тести (layoutDiagnostics.test.ts:45/56) лишились зелені. staffOpts-збірка + zoneLabelBand лишаються в рендері для fallback-гілки.
3. diagnostics: НЕ новий канал. renderer так само робить `this.lastDiagnostics=[...canvas.diagnostics]` незалежно, чи canvas передано, чи обчислено. facade.getLayoutDiagnostics читає renderer — канал цілий, onLayoutDiagnostics не чіпаємо. (Якщо б facade тримав diagnostics сам, а getLayoutDiagnostics читав renderer → ТИХО ПОРОЖНІЄ. Уникаємо саме так.)
4. facade.renderNow: у тому ж reportIfRenderFails-promise, ДО render(), порахувати staffCanvasResult дзеркально org-гілці: визначити currentOrgId семантикою РЕНДЕРА (`viewState.staffCurrentOrgId ?? inferStaffCurrentOrgId(drawing)`, далі `drawing.organizations.some(id===)`); якщо canvas-гілка — зібрати staffOpts (nodeWidth=theme.person.width, nodeHeight=theme.person.height, refCellWidth/Height=config.cell*, zoneLabelBand через resolveStaffZoneStyle+config.staffZoneChrome, ...options.staff?.layout, deptGrouping=config.staffEdgeRouter==='v2', expandedOrgIds) і `await layoutStaffCanvas(input,currentOrgId,staffOpts)`; інакше (grid) → undefined. Передати 7-м аргументом render(). Compute+render в ОДНОМУ promise → StaffLayoutError лишається в reportIfRenderFails.
5. Хелпери: resolveStaffZoneStyle — ЕКСПОРТУВАТИ з DiagramRenderer.ts (або винести в render/staffZoneStyle.ts і імпортувати в обох), щоб facade рахував той самий zoneLabelBand. inferStaffCurrentOrgId — вже експортована/імпортована, нічого робити. (Опційно: винести спільний resolveFocused + staffOpts-builder, щоб facade/renderer/svgExport не розходились — але це ширше за T2b.)
6. grid-fallback (renderPositionGrid) ЛИШАЄТЬСЯ в рендері повністю — він не рахує layoutStaffCanvas, diagnostics від нього не йдуть. facade просто НЕ рахує canvas, коли currentOrgId не валідний.

## НАЙГОСТРІШІ РИЗИКИ
- 🔴 diagnostics тихо порожніє: якщо прибрати in-renderer fallback compute → layoutDiagnostics.test.ts:45/56 (renderer-direct) дадуть []; і будь-який host, що кличе renderer.render() без canvas. ФІКС: fallback compute лишити (п.2).
- 🔴 currentOrgId-семантика: facade МУСИТЬ копіювати `?? infer` + `some()` РЕНДЕРА, не svgExport's resolveFocusedStaffOrgId (розходяться на invalid explicit currentOrgId → canvas vs grid). Інакше тихий behavior-shift.
- 🔴 подвійний compute / розсинхрон staffOpts: якщо facade й renderer збирають staffOpts по-різному (напр. facade забуде nodeWidth/zoneLabelBand) → layout у facade ≠ що намалював би renderer. Builder має бути ІДЕНТИЧНИЙ (спільний хелпер знижує ризик).
- 🟠 epoch/staleness: зараз guard :678 стоїть ПІСЛЯ await layoutStaffCanvas. При переносі compute у facade (до render()), epoch бампиться в render() ПІСЛЯ compute → stale-вікно між compute і epoch зникає; guards :678/:702 лишаються чинні для paint-фази. Compute+render в одному promise (як T2a) зберігає throw-routing. НЕ виносити await layoutStaffCanvas з-під reportIfRenderFails.
- 🟠 StaffLayoutError: layoutStaffCanvas кидає на unknown currentOrgId (:51) та resolveHead (multiple/no head). facade має рахувати canvas ЛИШЕ коли `some(id===)` істинний (як зараз renderStaff перед renderStaffCanvas) — інакше facade кине там, де renderer раніше йшов у grid.
- 🟠 render() 6-й param: не ламати існуючих org-callers (orgLayoutResult лишається на своїй позиції; staffCanvasResult — новий 7-й опційний).

ФАКТ: recon завершено. Фінал → SubagentHandback.
