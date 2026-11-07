ДАЛІ: читаю план/research, diff vs main по sdk+demo+USAGE, обидва тест-файли; звіряю 7 AC по коду.

## ФАКТ
- motionBlur.ts: чиста motionBlurPx(speed,opts); dead-zone/ramp/cap; NaN/neg→0. Оракул у unit — ручні значення (не тавтологія).
- Застосування: onMotionBlurFrame лише в host.setOnViewportChange (камера-шлях); resize-шлях (notifyViewportChange 'resize') НЕ викликає → resize не ставить blur (by construction).
- Speed = Math.hypot(Δx,Δy)/dt — ЛИШЕ translation; scale не входить.
- resolveMotionBlur: matchMedia reduce → null (один раз на create; mid-session toggle не трекається, задокументовано v1).
- clear: власний timer=viewportSettleMs + у destroy.
- Viewport.apply → onChange синхронно → filter ставиться синхронно в тесті (НЕ flaky на set-боці).

## AC vs тести
1 ✓ unit(cap≤maxPx)+contract(regex, але не асертить ≤6 в integration) 
2 ✓ contract settle-clear (sleep60>settle20)
3 частково: unit(0) є; integration slow-pan НЕМАЄ
4 ✓ contract mock matchMedia
5 ✓ unit cap
6 ✓ contract off
7 ✓ contract destroy
- Resize-не-тригерить (plan AC7): НЕ покрито тестом (лише by construction).

## РІШЕННЯ
- (c) docs USAGE+JSDoc кажуть «пану/зуму», код блюрить лише translation → зум не блюриться (окрім побічного зсуву). Overclaim; research свідомо виніс zoom у v2.
- Перф на великій сцені — ВІДКРИТА manual-умова (plan §gates), у коді/тестах немає; не закрито мовчки.
- Відхилення від плану (guard +&& !motmotionBlur на 541) — замінено self-contained debounce; вимога «works whether host listens» виконана. OK.
- Scope: мінімальний, без creep.
