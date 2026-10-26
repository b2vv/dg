claude-opus-4-8

ДАЛІ: читаю staffLayoutInputs.ts + diff DiagramRenderer.ts/OrgHierarchyDiagram.ts + спеку T2b + recon. Перевірка 10 пунктів.

## ФАКТИ перевірки (10 пунктів)
1. divergence: builder staffLayoutInputs.ts:84-94 збирає staffOpts у ТОМУ Ж порядку, що старий DiagramRenderer (nodeWidth/nodeHeight/refCell*/zoneLabelBand → ...staff?.layout → deptGrouping → expandedOrgIds). resolveStaffZoneStyle тіло ІДЕНТИЧНЕ видаленому (light/dark константи збігаються побітово). рендер(:646 buildStaffLayoutOptions(theme,config,ctx.resolvedTheme,options.staff)) і фасад(:791 buildStaffLayoutOptions(nodeTheme,this.renderConfig,resolved,options.staff)) — ті самі аргументи (render(drawing,nodeTheme,resolved,this.renderConfig,options,...)). Рендер НЕ має власної копії. ЧИСТО.
2. zoneLabelBand: рендер :675(new) this.lastZoneLabelBand = ПОВЕРНУТИЙ computed band (destructure), НЕ options.zoneLabelBand. layout рахується з options (зі spread). Точно старе. ЧИСТО.
3. currentOrgId: resolveStaffCurrentOrgId = explicit ?? infer, then some(id===)?id:null — точно renderStaff старий; НЕ svgExport (той інферить на invalid explicit). ЧИСТО.
4. StaffLayoutError: фасад :776-793 рахує layoutStaffCanvas лише коли staffCurrentOrgId truthy (some(id===) true) → unknown-currentOrgId throw недосяжний; resolveHead-throw можливий, але всередині reportIfRenderFails IIFE → routed. ЧИСТО.
5. diagnostics: рендер :677 this.lastDiagnostics=[...canvas.diagnostics] з переданого-чи-обчисленого. канал не чіпано. ЧИСТО (lead: layoutDiagnostics green).
6. fallback: :670-674 canvas = staffCanvasResult ?? await layoutStaffCanvas(...). renderer-direct caller'и рахують самі. ЧИСТО.
7. epoch/staleness: layoutStaffCanvas awaited у reportIfRenderFails IIFE (facade :759-803, один promise з render); guards :675/:699 лишились; renderCoalesce.schedule серіалізує. ЧИСТО.
8. grid-fallback: фасад → undefined коли staffCurrentOrgId null; рендер renderStaff :627 if(currentOrgId) else renderPositionGrid. ЧИСТО.
9. geom/dragGrid: рендер :646 завжди recompute staffOpts через builder, :679 staffMerged використовує для geom/dragGrid навіть коли canvas переданий — ідентичні значення (ті самі аргументи builder). ЧИСТО.
10. scope/unused: inferStaffCurrentOrgId + StaffZoneStyle видалені з DiagramRenderer, 0 dangling refs. StaffCanvasResult вже імпортований :18. У фасаді inferStaffCurrentOrgId лишився (ще юзаний :2138 — НЕ dead). T2b-тести не змінені.
   ⚠️ АЛЕ working tree НЕ 3 файли: також M .gitignore, AGENTS.md, package.json(0.5.1→0.6.0), layout/staff/orgBlockLayout.ts (ПРОБА root-centering Cass2 2026-10-24) + ?? _recenterProbe.test.ts, scratchpad/. Це ОКРЕМА in-flight робота, НЕ T2b. При коміті T2b — stage лише 3 файли.

## РІШЕННЯ: T2b чисто (10/10 інваріантів). 0 blocking. 1 non-blocking scope-caveat (working tree брудний не-T2b змінами).
