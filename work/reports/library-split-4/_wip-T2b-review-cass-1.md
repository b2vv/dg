claude-opus-4-8

ДАЛІ: читаю новий staffLayoutInputs.ts + git diff DiagramRenderer.ts/OrgHierarchyDiagram.ts; звіряю buildStaffLayoutOptions поле-за-полем зі старим staffOpts (HEAD:655-665), zoneLabelBand, resolveStaffZoneStyle, currentOrgId, await-порядок.

ФАКТ: buildStaffLayoutOptions (staffLayoutInputs.ts:60-100) поле-за-полем = старий staffOpts (HEAD DiagramRenderer:655-665): nodeWidth/nodeHeight/refCellWidth/refCellHeight/zoneLabelBand, потім `...staff?.layout`, потім deptGrouping, expandedOrgIds. Порядок spread той самий — `...staff?.layout` МІЖ zoneLabelBand і deptGrouping. OK.
ФАКТ: zoneLabelBand compute ідентичний (staffZoneChrome ? labelPadding??8 + labelFontSize + 6 : 0). Повертається ОКРЕМО (computed, до spread); renderer:668 `this.lastZoneLabelBand = zoneLabelBand` бере повернутий computed, НЕ options.zoneLabelBand. = HEAD. Жодної lastZoneLabelBand-регресії.
ФАКТ: resolveStaffZoneStyle перенесено в staffLayoutInputs.ts:20-42, тіло байт-у-байт (всі кольори/числа); старий def у DiagramRenderer видалено; 3 call-site: staffLayoutInputs (band compute), DiagramRenderer:735, :814 — усі з імпорту. StaffZoneStyle type-import прибрано, більше не згадується.
ФАКТ: resolveStaffCurrentOrgId = стара інлайн-умова (explicit ?? infer; some(id===) ? id : null). renderStaff:629-632 `if (currentOrgId)` → null=grid. Еквівалентно HEAD.
ФАКТ: await-порядок — org-гілка: computeOrgLayout await → const options=buildRenderOptions() → staffCurrentOrgId=null (positions===0) → без staff-await → render. buildRenderOptions викликається після org-await, як на T2a. Org-поведінка НЕ зрушена.
ФАКТ: mode-взаємовиключність — orgLayoutResult лише при positions===0&&orgs>0; staffCanvasResult лише при positions>0. Не перетинаються; render() дістає один з двох.
ФАКТ: StaffLayoutError з фасаду — layoutStaffCanvas викликається лише коли staffCurrentOrgId!=null (org гарантовано існує), і awaited всередині reportIfRenderFails IIFE → маршрутизується як org-throw. buildStaffLayoutOptions синхронний всередині того ж IIFE — теж під catch.
ФАКТ: канва рахується з `drawing` (captureDrawingState), не this.data. Facade→renderer передає той самий `drawing` як data. Inputs фасаду (nodeTheme/renderConfig/resolved/options.staff/drawing) === inputs renderer-fallback (theme/config/resolvedTheme/options.staff/data). options.staff — та сама референція (render robить `{...options, lod}`, staff незмінний). НЕ дрейфить.
ФАКТ: staffMerged (DiagramRenderer:679) = {...DEFAULT, ...staffOpts} завжди обчислюється для geom, навіть коли canvas pre-computed → geom узгоджена з pre-computed канвою.
ФАКТ: inferStaffCurrentOrgId у фасаді ще вжитий (:2138) — імпорт не osiротів. scope diff = рівно 2 файли + новий staffLayoutInputs.ts.
ФАКТ: targeted rstest 37/37 pass; tsc -p tsconfig.check.json exit 0.

РІШЕННЯ: T2b ЧИСТО. Blocking divergence/lastZoneLabelBand-регресії НЕ знайдено. Non-blocking: (1) новий staffLayoutInputs.ts без власного unit-тесту (покритий інтеграційно); (2) робоче дерево містить не-T2b uncommitted зміни (orgBlockLayout.ts, _recenterProbe.test.ts, package.json, .gitignore, AGENTS.md) — поза scope T2b, але змішані в одному стані → при коміті тримати T2b окремо.
