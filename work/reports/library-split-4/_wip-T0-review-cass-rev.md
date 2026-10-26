claude-opus-4-8

ДАЛІ: прочитати диф + спец T0, звірити capture-before-await, порядок side-effect, guards, підпис reportIfRenderFails, buildRenderOptions, applyRenderTheme side-effect, scope-creep, tsc.

ФАКТ: диф торкається лише packages/sdk/src/OrgHierarchyDiagram.ts (+ import RenderOptions). База HEAD 1a34034, гілка bulk-mutations.

ФАКТ (звірка original HEAD vs working):
1. capture-before-await: captureDrawingState() :742 синхронно ПЕРЕД await :743; drawing=this.data :793 знято до await. Жодного НОВОГО post-await читання this.data — prefetchOpenMedia(this.data) в afterRender було post-await і в оригіналі. PASS.
2. порядок: applyRenderTheme(theme→setBackground) → bindCanReparent → captureDrawingState → render → afterRender(requestPaint→guard→repaintHighlight→diagnostics→promoteSync→prefetch). Ідентично оригіналу. PASS.
3. guards: ранній !host||destroyed :738; post-await destroyed||!host :912 (в afterRender). PASS.
4. reportIfRenderFails(pending, drawing, drawingStaffOrgIds) :933 підпис НЕ змінено; виклик :743 — ті самі 3 арг. PASS.
5. buildRenderOptions() кличеться синхронно як арг render() :749 ДО await; усі 19 полів (lod/orgLayout/staff/selected/loadTexture + 14 on*) ідентичні за порядком і тілом; колбеки замикають this, пізні читання this.data збережені. PASS.
6. applyRenderTheme пише this.nodeTheme :764; повертає nodeTheme:this.nodeTheme :768 — render отримує ТОЙ САМИЙ об'єкт (не копію). PASS.
7. scope-creep T0: диф OrgHierarchyDiagram.ts ізольований, 0 перейменувань членів, тест НЕ чіпано. АЛЕ робоче дерево має сторонні зміни (orgBlockLayout.ts, package.json, .gitignore, AGENTS.md, новий _recenterProbe.test.ts) — не від T0; спец вимагає «діф лише OrgHierarchyDiagram.ts» → звертаю увагу lead, не блок.
8. типізація: buildRenderOptions(): RenderOptions = точний тип 5-го param render() (options: RenderOptions). tsc -p tsconfig.check.json EXIT 0. PASS.

ВЕРДИКТ: чисто, 0 зміни поведінки. highlight test 8/8 PASS (вкл. "facade request during render deferred and applied at renderNow tail"). tsc 0.
