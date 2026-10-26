claude-opus-4-8

ДАЛІ: беру диф OrgHierarchyDiagram.ts + DiagramRenderer.ts, читаю спец T2, перевіряю: подвійний compute, аргументну еквівалентність orgLayout/orgLinks, await-порядок, опціональність 6-го арга, grid-fallback, scope.

ФАКТ: диф = рівно 2 файли. renderNow:751-758 рахує orgLayoutResult за умовою `drawing.positions.length===0 && organizations.length>0`, передає 6-м аргом у render(). Рендер renderOrganizations:1079 `orgLayoutResult ?? await computeOrgLayout(...)`.

ФАКТ (подвійний compute — НЕМАЄ): OrgLayoutResult — обʼєкт (types.ts:50), computeOrgLayout завжди повертає truthy обʼєкт → `??` fallback НЕ виконується в org-гілці. Compute рівно 1 раз (у фасаді).

ФАКТ (аргументна еквівалентність — ОК): captureDrawingState:810 `drawing: this.data` → drawing===data, що йде в render (761). orgLinks: фасад `drawing.orgLinks`, рендер `data.orgLinks` — той самий масив. orgLayout: фасад читає `this.viewState.orgLayout` (756), рендер fallback `options.orgLayout`=buildRenderOptions().orgLayout=`this.viewState.orgLayout` (824). viewState.orgLayout присвоюється ЛИШЕ раз при create (357), ніколи не реасайниться → стабільна референція, розходження між 756 і 765 неможливе. computeOrgLayout з барелю index.js:39 реекспортує ту саму f-цію з rowTreeLayout.ts:231, що й прямий імпорт рендера. Усі 3 аргументи ідентичні.

ФАКТ (умова = dispatch рендера): рендер hasStaff=`positions.length>0` (456). org-гілка = `!hasStaff && organizations>0` = `positions===0 && organizations>0` — ТОЧНО умова фасаду (752). staff → undefined, grid у staff-гілці orgLayoutResult не отримує. staff/grid не зачеплені.

ФАКТ (await-гонка — чисто): drawing захоплено за референцією ДО await; computeOrgLayout оперує drawing.*, не this.data. Мутатор під час await реасайнить this.data, але drawing стабільний → layout рахується зі снапшоту, що й малюється. OK.

ФАКТ (scope/тести): T2a = 2 файли, тестів у дифі немає. Але робоче дерево НЕ чисте: також M .gitignore/AGENTS.md/package.json/layout/staff/orgBlockLayout.ts + ?? _recenterProbe.test.ts — поза T2a (інші треки).

ПРОГОН: npx rstest run twoDiagrams orgExpandChange positionExpand fitContain renderCoalesce → усе зелено. tsc -p tsconfig.check.json → EXIT=0.

РІШЕННЯ (BLOCKING — зміна поведінки на error-path): `await computeOrgLayout` (renderNow:753) стоїть ПОЗА `reportIfRenderFails`, що огортає лише `host.renderer.render(...)` (759-770). Раніше computeOrgLayout виконувався ВСЕРЕДИНІ renderOrganizations → всередині promise render(), який reportIfRenderFails огортає. computeOrgLayout МОЖЕ кинути: rowTreeLayout.ts:236 безумовно кличе validateOrgHierarchy, що throw OrgHierarchyError на дублі id / циклі / unknown root (orgTree.ts:14/21/37/77). Автор сам документує (OrgHierarchyDiagram.ts:1029-1037), що висячий parentOrgId доїжджає до рендеру в штатних сценах → випадок досяжний, не теоретичний.
 - СТАРА поведінка: compute throw → render() reject → reportIfRenderFails:960 ловить → ставить `lastRenderFailure`, фає `onRenderFailed`, rethrow.
 - НОВА: throw тікає з renderNow:753 ДО reportIfRenderFails → `onRenderFailed` НЕ фає, `getLastRenderFailure()` лишається застарілим; reject пролітає сирим.
 Це публічний T97-контракт (revealPath.contract.test.ts:55-80, 76-80 перевіряє onRenderFailed+getLastRenderFailure). Тест зелений бо інжектить фейл у mock renderer.render (досі огорнутий), а НЕ в compute — тож compute-throw шлях не покритий. Спец T2 про error-handling мовчить → недопрацьований gap, не свідоме рішення.
 ФІКС: занести compute у промис, який іде в reportIfRenderFails, напр.:
   await this.reportIfRenderFails((async () => {
     const r = drawing.positions.length===0 && drawing.organizations.length>0
       ? await computeOrgLayout(drawing.organizations, drawing.orgLinks ?? [], this.viewState.orgLayout) : undefined;
     await host.renderer.render(drawing, nodeTheme, resolved, this.renderConfig, this.buildRenderOptions(), r);
   })(), drawing, drawingStaffOrgIds);
 (Reject-досяжність для awaiter'ів однакова в обох версіях — різниться ЛИШЕ side-channel onRenderFailed/getLastRenderFailure.)
