claude-opus-4-8

ДАЛІ: прочитати диф `git diff -- packages/sdk/src/OrgHierarchyDiagram.ts`, спец T0, і перевірити поведінкову еквівалентність extract-method.

## ФАКТ — порівняння HEAD:renderNow проти нового (git show HEAD vs робоче дерево)
- Порядок кроків ІДЕНТИЧНИЙ: theme(resolveTheme→nodeTheme→setBackground) → bindCanReparent(roster/reportLines/canReparent) → captureDrawingState(drawing,staffOrgIds) → render → afterRender(requestPaint→guard→repaintHighlight→diagnostics→promoteSync→prefetch).
- captureDrawingState: `drawing: this.data` — той самий референс, НЕ клон ✓; `drawingStaffOrgIds: [...this.viewState.staffExpandedOrgIds]` — той самий spread ✓.
- applyRenderTheme повертає `{ nodeTheme: this.nodeTheme, resolved }` — nodeTheme === поле (той самий об'єкт), resolved той самий local ('light'|'dark') ✓. Side-effect (запис this.nodeTheme + setBackground) збережено.
- buildRenderOptions() викликається як 5-й аргумент render() → JS лівий-направо оцінює ВСІ аргументи ДО виклику render, тобто синхронно ДО await, у тій самій точці, що й inline-літерал раніше ✓. Між captureDrawingState() і buildRenderOptions() немає мутацій → обидва spread'и staffExpandedOrgIds бачать ідентичний вміст.
- Усі 19 ключів options присутні й без змін (lod,orgLayout,staff,selected,loadTexture,onCanvasClick,onOrgClick,onOrgDoubleClick,onStaffOrgExpandToggle,onStaffOrgDrill,onPositionExpandToggle,onPersonClick,onPersonDoubleClick,onPersonContextMenu,onOrgContextMenu,onOrgExpand,onOrgCollapse,onPersonDragEnd,onPersonReparent).
- Guards: ранній `!this.host||this.destroyed` (renderNow:738) + post-await `this.destroyed||!this.host` (afterRender) — обидва на місці, ті самі умови ✓.
- afterRender: requestPaint ПЕРЕД guard, як в оригіналі; рання відмова скіпає лише хвіст — ідентично монолітному тілу ✓. host.requestPaint() на тому ж local host, захопленому на вході.
- render() 5-й параметр = RenderOptions (DiagramRenderer.ts:429) → explicit return type `: RenderOptions` у buildRenderOptions дає ТУ САМУ контекстну типізацію колбеків, що й inline-літерал раніше.

## ФАКТ — гейти
- `npx rstest run highlight`: 8/8 PASS, зокрема «a facade request during render is deferred and applied at renderNow tail» (сторож post-render-хвоста). highlight.test.ts НЕ змінено (git status порожній).
- `npx tsc -p tsconfig.check.json`: exit 0, 0 рядків (реальний exit, не tail).

## ФАКТ — відхилення від спеки (не поведінкове)
- Спека планувала `buildRenderOptions(captured)` з аргументом; реалізація — `buildRenderOptions()` без аргументу, re-spread this.viewState всередині. Поведінка ідентична (два незалежні spread'и як і в оригіналі), сигнатура інша. Immaterial.

## ФАКТ — scope
- git diff зачіпає 5 tracked-файлів: OrgHierarchyDiagram.ts (T0) + orgBlockLayout.ts(+16) + package.json + .gitignore + AGENTS.md. Останні 4 — НЕ частина T0-спліту renderNow. Спека вимагає «Діф = лише OrgHierarchyDiagram.ts». Не поведінкова вада декомпозиції, але комітер мусить застейджити ЛИШЕ OrgHierarchyDiagram.ts.

## РІШЕННЯ: ЧИСТО. Поведінкова еквівалентність extract-method підтверджена по коду + гейтах. Жодного BLOCKING.
