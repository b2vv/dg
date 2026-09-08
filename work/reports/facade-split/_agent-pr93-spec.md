# PR #93 Spec Review (t106-measure)

ДАЛІ: зібрати diff, log, PR body, і обидві версії T106 задачі

ФАКТ: diff --stat: OrgHierarchyDiagram.ts -119/+.., new media/diagramMedia.ts (+138), new media/diagramMedia.test.ts (+144).
ФАКТ: PR body claims: OrgHierarchyDiagram.ts 1664(2026-09-02)->1923(now), +259; DiagramRenderer.ts 1139->1226 +87.
ФАКТ: 90 methods breakdown claimed: header 345, 65 public methods 1072 lines (~16.5/method), 25 private 507 lines.
ФАКТ: renderNow claimed to touch 25 different `this` members, 138 lines, calls back into public methods.
ФАКТ: extraction moved expandedOrgIds, mediaUrlsForRef (was resolveMediaUrlsForRef), prefetchOpenMedia (was prefetchConfiguredMedia) out to media/diagramMedia.ts as free functions taking explicit params (data/themeMode/ref, or data/lodLevel/service).
ФАКТ: call sites in OrgHierarchyDiagram.ts now call mediaUrlsForRef({...}) and prefetchOpenMedia({...}) directly inline, not via private wrapper methods.
ДАЛІ: grep confirm no leftover private forwarders in OrgHierarchyDiagram.ts; count tests in diagramMedia.test.ts

ФАКТ: main:T106 §"Шов, який радить аудит" називає 4 поведінки: "інжест і коміт даних, мутація сцени,
row-tree розкладка, збірка рендер-проходу" — жодну з них PR не чіпає; media binding у тому списку
взагалі не згадана. Оновлений текст задачі це не приховує — прямо каже "DiagramRenderer.ts не чіпано",
але не пояснює окремо, чому 4 названі поведінки не спробувані/не заміряні одна за одною (заміряно
детально лише renderNow).
ФАКТ: renderNow (OrgHierarchyDiagram.ts:675-805) — ручний підрахунок унікальних this.* members:
host, destroyed, viewState, nodeTheme, stylesPartial, data, renderConfig, selectionStore,
mediaService, applySelection, repaintSelection, handleNodeSelect, callbacks, toggleStaffOrgExpand,
focusStaffOrg, togglePositionExpand, contextMenu, expandOrg, collapseOrg, movePersonToCell,
reparentPosition, getLayoutDiagnostics, notifyPromoteSync, reportIfRenderFails = ~24 унікальних.
Заява "25" — порядок величини підтверджено.
ФАКТ: grep public methods у класі OrgHierarchyDiagram (regex-based) = 61 + 1 getter ≈ 62-65,
порядок величини "65" підтверджено (неточний regex, не точна лічба).
ФАКТ: describe('expandedOrgIds') має рівно 5 it(), включно з тестом на цикл (parentOrgId) —
claim "п'ять тестів, серед них на цикл" підтверджено. Загалом у файлі diagramMedia.test.ts — 12 it(),
997+12=1009 збігається з PR body.
ФАКТ: grep resolveMediaUrlsForRef/prefetchConfiguredMedia в OrgHierarchyDiagram.ts — 0 збігів
(лише нові імена mediaUrlsForRef/prefetchOpenMedia кличуться інлайн на місцях виклику, рядки 453,800).
Forwarders дійсно відсутні.
ФАКТ: getLastContextMenu (OrgHierarchyDiagram.ts:555) і resolveTestId (:1392) — grep по
packages/sdk/src, packages/demo/src, e2e показує лише визначення, жодних викликів. analysis.md
claim "2 некликані" підтверджено.
ФАКТ: жодних змін у docs/USAGE.md у дифі немає — публічний API незмінний, відповідає власному
порогу задачі T106 ("Якщо поділ лишає публічний API незмінним — інлайн").
ФАКТ: diff у OrgHierarchyDiagram.ts, diagramMedia.ts — чиста механічна переміщення коду (коментарі,
логіка ідентичні), без зміни поведінки.
РІШЕННЯ: суттєвих falsified claims не знайдено; всі перевірені кількісні заяви PR підтверджені
(точно або з правильним порядком величини). Основна знахідка спеки — часткове виконання: T106
початково називала 4 поведінки для винесення, зроблено 1 (медіа), решта явно й чесно позначена
як не зроблена (не прихована). T119/analysis.md — коректно заведені як proposal, що потребує
людського рішення + spec-flow, не імплементовані передчасно — не scope creep.
ДАЛІ: писати фінальну відповідь користувачу
