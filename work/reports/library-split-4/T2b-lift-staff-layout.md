# T2b — підняти STAFF-layout compute у #4 (спліт dg #2b)

**Status:** spec готова. Критика: 1 раунд (divergence/diagnostics/StaffLayoutError), 0 відкритих.
**Репо:** `~/projects/dg`, `bulk-mutations`, база HEAD `19e865b` (T2a). Recon: `_wip-T2b-staff-seam-recon.md`.

Дзеркало T2a для STAFF-гілки: підняти `layoutStaffCanvas` з `DiagramRenderer.renderStaffCanvas` у фасад. Важче за T2a бо (1) `staffOpts` збирається з багатьох полів → ризик тихого розсинхрону з рендером; (2) є потік `diagnostics`; (3) `currentOrgId`-рішення (canvas vs grid) з семантикою, яку НЕ можна розійти з рендером; (4) `layoutStaffCanvas` кидає `StaffLayoutError`.

## Чому
Після T2a org рахується у #4, staff — ще в рендері. Доки так, renderer-інтерфейс (T3) не може прийняти «малюй позиціоноване» однаково для обох гілок. Вада наявного шляху: `staffOpts` (DiagramRenderer.ts:655-665) і `currentOrgId`-рішення (renderStaff :624-626) живуть у рендері; якщо фасад просто ЗДУБЛЮЄ їх — вони розійдуться при майбутній зміні (recon 🔴 risk 2/3; `svgExport` вже розійшовся на invalid currentOrgId). Виміряна корекція: не дублювати — **винести у спільний source**, яким користуються і рендер, і фасад → divergence неможливий by construction.

## Рішення
**Спільні хелпери + 7-й param render() + fallback у рендері (дзеркало T2a).**

1. **Новий модуль `render/staffLayoutInputs.ts`** (обидва — рендер і фасад — залежать на нього; циклу нема):
   - `resolveStaffCurrentOrgId(data, explicit?) → string | null` — `explicit ?? inferStaffCurrentOrgId(data)`, і `null` (grid) коли none або `!data.organizations.some(o=>o.id===id)`. ТОЧНО логіка renderStaff :624-626.
   - `buildStaffLayoutOptions(theme, config, staff) → StaffLayoutOptions` — ТОЧНО збірка staffOpts :655-665 (nodeWidth=theme.person.width, nodeHeight=theme.person.height, refCell*, zoneLabelBand через resolveStaffZoneStyle, ...staff?.layout, deptGrouping, expandedOrgIds).
   - `resolveStaffZoneStyle` **ПЕРЕНОСИТЬСЯ сюди** з DiagramRenderer.ts:1232-1259 (чиста функція); 3 наявні call-site у DiagramRenderer (:650/:738/:817) імпортують звідси. (Інакше layout-builder тягнув би назад у рендер — цикл.)
2. **render() 7-й param `staffCanvasResult?: StaffCanvasResult`** — ОКРЕМИЙ, не union з orgLayoutResult (гілки взаємовиключні, shape різні).
3. **renderStaffCanvas:** `const canvas = staffCanvasResult ?? await layoutStaffCanvas(input, currentOrgId, buildStaffLayoutOptions(...))`. Fallback **ОБОВ'ЯЗКОВИЙ** (renderer-direct caller'и + `layoutDiagnostics.test` кличуть render() без 7-го param). renderStaff викликає `resolveStaffCurrentOrgId` замість інлайн-логіки.
4. **Фасад renderNow (в тому самому reportIfRenderFails-promise, що й org T2a):** після `buildRenderOptions()` → `const currentOrgId = resolveStaffCurrentOrgId(drawing, options.staff?.currentOrgId)` → якщо staff-canvas-режим (`drawing.positions.length>0 && currentOrgId`) → `staffCanvasResult = await layoutStaffCanvas({organizations,positions,reports:drawing.reportLines,groups,departments,persons}, currentOrgId, buildStaffLayoutOptions(nodeTheme, this.renderConfig, options.staff))`; інакше undefined. Передати 7-м арг. Compute під reportIfRenderFails (StaffLayoutError → T97, як org).
5. **Diagnostics — БЕЗ нового каналу:** рендер і далі `this.lastDiagnostics = [...canvas.diagnostics]` з переданого-чи-обчисленого canvas. `StaffCanvasResult.diagnostics` (types.ts:149) їде в результаті. facade.getLayoutDiagnostics/onLayoutDiagnostics не чіпати.

**Відкинута альтернатива (ціна):** здублювати staffOpts+currentOrgId у фасаді (як svgExport) — recon 🔴: тихий розсинхрон при будь-якій майбутній зміні однієї копії; svgExport вже розійшовся на invalid currentOrgId (renderer→grid, svg→infer). Ціна спільного хелпера: 1 новий модуль + перенос resolveStaffZoneStyle (3 call-site) — прийнятно проти silent-layout-bug.

**🔒 Інваріанти (зберегти):**
1. **0 зміни видимого:** staffOpts і currentOrgId ІДЕНТИЧНІ рендеру — гарантовано спільним хелпером (не дубль).
2. **currentOrgId семантика** = рендерова (`?? infer` + `some()`), НЕ svgExport.
3. **StaffLayoutError** рахується лише коли canvas-режим (`some(id===)` істинний) — інакше фасад кине там, де рендер ішов у grid.
4. **Diagnostics** течуть як раніше (канал не чіпати; рендер пише з переданого canvas).
5. **grid-fallback** (`renderPositionGrid`, no currentOrgId) лишається в рендері — фасад дає undefined.
6. **epoch/staleness** — compute+render в одному reportIfRenderFails-promise (як T2a); guards :678/:702 лишаються для paint-фази.
7. compute з ЗАХОПЛЕНОГО `drawing` (T104), не this.data.

## Поза межами
- LayoutPort/renderer-інтерфейс (T3). Кеш layout. Grid-fallback у фасад. Прибирання in-renderer fallback (пізніший cut, коли всі caller'и передають).

## Форма перевірки
- **Критичний сторож diagnostics:** `render/layoutDiagnostics.test.ts` (кличе render() напряму БЕЗ 7-го param :45/:56 + facade-шлях :69/:94) — МУСИТЬ лишитись зеленим (доводить, що fallback тримає diagnostics).
- Staff-шов: `staffOrgExpand.interactions.test.ts`, `personReparent.contract.test.ts`, `positionExpand.interactions.test.ts`; layout-ядро: `staffLayout`, `canvasLayout.deptGrouping`, `staffDeptGrouping`, `positionExpand`.
- **Контрольна проба 1 (живий шов):** саботувати переданий `staffCanvasResult` (positionNodes=[]) → staff-позиційний тест червоніє → доводить, що рендер споживає переданий (fallback не маскує).
- **Контрольна проба 2 (T97 staff):** додати тест: staff-режим з currentOrgId, що дає StaffLayoutError, АБО компут-throw → `onRenderFailed` фає (дзеркало T2a-тесту); control: без compute-під-обгорткою падає.
- **Writer-gate:** `npx rstest run` увесь; `npx tsc -p tsconfig.check.json` 0; oxlint 0; `cargo test` 25/0.
- Діф: `render/staffLayoutInputs.ts`(new) + `DiagramRenderer.ts` + `OrgHierarchyDiagram.ts` (+ тест). Без layout/staff/* логіки.

## Критика (divergence/diagnostics/StaffLayoutError, 1 раунд)
- **divergence (головне):** спільний хелпер замість дубля — єдиний спосіб гарантувати staffOpts/currentOrgId не розійдуться. ВЕРДИКТ: новий модуль, не копія.
- **diagnostics:** НЕ новий канал — StaffCanvasResult уже несе diagnostics; рендер пише lastDiagnostics з переданого. ВЕРДИКТ: канал не чіпати, лише переконатись fallback тримає renderer-direct шлях.
- **StaffLayoutError-досяжність:** фасад рахує canvas лише в canvas-режимі (some(id===)); grid → undefined → рендер у grid. ВЕРДИКТ: currentOrgId===null ⇒ не рахувати.
- **resolveStaffZoneStyle перенос:** 3 call-site у рендері + facade; перенос у staffLayoutInputs уникає циклу layout→render. ВЕРДИКТ: перенести, не ре-експортувати з рендера.

## Закрито в grilling
- 7-й окремий param vs union — окремий (гілки взаємовиключні).
- Прибирання in-renderer fallback — НЕ в T2b (ламає renderer-direct + layoutDiagnostics.test); пізніший cut.
