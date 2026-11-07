ДАЛІ: читаю диф, тест-контракт, spec/plan/tasks

ФАКТ: callsites — 317 selection, 467 'camera', 474 resize, 1002 afterRender, 1662 repaintSelection. Лише 467='camera', решта дефолт 'structural'. Жоден structural не став camera.
ФАКТ: togglePositionExpand → drawOrRestore → render → afterRender(841/1002) → notifyPromoteSync() structural. Той самий шлях, що setData. setData = валідний проксі для tagging. АЛЕ expand ще й panToNode(animate) → 'camera' після structural; проксі цього не відтворює (low risk — structural sync уже відпрацював з свіжими boxes).
ФАКТ: новий describe в overlay.test = 2 it: structural→immediate (before+1), camera→no sync (before). settleMs=10_000 знімає годинник. Оракул = реальні виклики setPromotedNodeIds, незалежний, не тавтологія.
РІШЕННЯ: план T1 обіцяв acceptance 1,2,4,5,7,8 в overlay-тестах; фактично нові — лише 1 і 7. AC4(double-call cancelSettle) НЕ покрито. AC2 new-screenRect/5 resize зводяться до «structural→immediate» (покрито). AC3 покрито наявними 'deferred recompute'/panBy.
РІШЕННЯ: AC1 far-LOD — прямого тесту зі зміною scale через far немає; лише транзитивно (setData→structural + припущення що viewport-render фаєрить). Механізм вірний (комент :466). Partial.
