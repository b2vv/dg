claude-opus-4-8

# Inspector review — T129 §8.2-full (commit 7d05b7f)

ДАЛІ: подивлюсь дифф коміту 7d05b7f і попередніх §8.2-комітів, щоб зрозуміти що реально змінено у ШПС alpha near-view search.

ФАКТ: req1 — getHits→buildConfig() (App.ts:1383) повертає ПОВНІ data; collapse-фільтр staffVisibleData застосовано окремо лише в reload(:430)/rerenderStaffAlpha(:732), НЕ в search. computeStaffSearchHits фільтрує тільки за orgId. ✓
ФАКТ: req2 — styles.css .sl position:fixed, .st mark color#ff8d68; render() субтитр dept·person / <span vac>Вакантно</span>; place() top=rect.bottom+6. ✓
ФАКТ: req3 — onKeydown: Arrow↑↓ (mod hits.length), Enter→pick(act), Escape→input.value=''+close+onClear+blur (до guard). tested. ✓
ФАКТ: req4 — focusStaffCard: staffAdminAncestors→delete зі staffCollapsed→await rerender→foundId→revealPath(panToNode, без zoom; focusNode:1728→panToNode:1117 host.panTo(x,y) без scale)→select(null). backdrop малює білу рамку outline2px#fff + чіп «Знайдено». ✓
ФАКТ: req5 — render('')→onClear→clearStaffFocus foundId=null+sync. ✓
ФАКТ: req6 — render() no-hit гілка innerHTML='.se', onClear НЕ викликається (ring лишається). ✓
ФАКТ: req7 — ShpsStaffCard dimmed opacity0.38 для non-found; installStaffHoverHighlight clear() відновлює baseline(.38/1) коли foundId!=null. tested (2). ✓
ФАКТ: req8 — 9 нових тестів: computeStaffSearchHits(3), dropdown UI/keyboard(4), focus-dim(2), hover-baseline(2), found-marker render, staffAdminAncestors(2). demo 130/0 skipped1. typecheck 0.
ФАКТ: dead-code — App.ts:1519-1544 стара diagram.search-гілка staff-alpha недосяжна (runSearch:1456 робить early-return коли staffSearch set, що завжди на alpha). non-blocking.
ФАКТ: input→runSearch wired debounce150ms (App.ts:358-362).
РІШЕННЯ: Verdict FIT. Усі 8 обов'язкових вимог виконані й звірені з кодом; тести зелені (свіжий прогін); typecheck чистий. Незалежність: той самий модель (Opus 4.8) що й автор — fresh-context same-model, НЕ other-provider.
