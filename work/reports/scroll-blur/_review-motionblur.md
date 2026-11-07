# R6 review: motion blur on pan/zoom

model: claude-opus-4-8

## ФАКТ (крок 1): скоуп прочитано
- `motionBlur.ts`: чиста `motionBlurPx`, dead-zone + linear ramp + cap. Guard `!(speed > minSpeed)` ловить NaN/negative/dead-zone. Infinity → maxPx.
- Інтеграція в `OrgHierarchyDiagram`, тести unit+contract.

## ФАКТ (крок 2): інтеграція звірена по коду
- `ViewportTransform {x,y,scale}` (Viewport.ts:3). x/y — translation у screen px. speed = hypot(dx,dy)/dt px/ms. ОК.
- onChange фіє на КОЖЕН `Viewport.apply` (PixiHost.ts:244-247), тобто пан, зум ТА програмні tween-и/fit.
- `setTransform → apply` синхронно (Viewport.ts:83-92); `setViewport` синхронний → contract-тест детермінований.
- container = mount element хоста; canvas appendChild (PixiHost.ts:328). Overlay (promote) монтується хостом через createReactPromoteOverlay({mount}) (createReactPromoteOverlay.ts:287) — дитина того ж container ЛИШЕ якщо хост передав той самий mount.

## ФАКТ (крок 3): тести
- 13/13 PASS під sdk jsdom-конфігом (перший мій запуск з кореня впав через ВЛАСНУ помилку — обійшов sdk rstest.config; не дефект тесту).
- typecheck green.
- Дискримінація: unit-оракул hand-computed; contract 75px/ms>cap; reduced-motion = справжній matchMedia-мок; off-default перевіряє untouched; settle 20ms vs sleep 60ms (запас, не flaky).

## РІШЕННЯ: PASS / GATE GREEN. Блокерів немає.

### Підтверджено коректним (по чек-листу)
1. Немає витоку timer: щокадру clear+rearm; clearMotionBlur нулить; destroy→clearMotionBlur. dt<=0 під `if(dt>0)` — без краху/NaN. first frame last=null → skip, без throw. clear повний (filter+willChange).
2. off-default інертний; SSR-guard коректний; onMotionBlurFrame ще й guard на container+destroyed.
3. filter на mount блюрить WebGL canvas (CSS filter на canvas-пікселях) — архітектурно вірно.
4. unit/contract дискримінують, не тавтологія.
5. Перф: hypot+setTimeout дешево; dead-zone уникає GPU blur-pass (px=0 → no filter).
6. Public API узгоджено: config.motionBlur, MotionBlurOptions+motionBlurPx+defaultMotionBlurOptions експорт, USAGE §table.

### Non-blocking
- N1 Власність filter/willChange: SDK безумовно пише і скидає `container.style.filter/willChange` на host-owned mount; clear ставить '' (не відновлює host-значення). Якщо хост сам застосує filter на mount — буде затерто. USAGE не попереджає. Рекомендація: один рядок у doc «SDK володіє filter/willChange на mount».
- N2 Твердження «блюрить canvas+overlay» умовне: overlay — дитина container лише якщо хост так змонтував (SDK сам overlay не чіпляє). Варто зазначити залежність.
- N3 Програмні камер-tween-и й fit-on-load теж блюрять (onChange на будь-який apply). Можливо несподівано на initial fit. Design-note.
- N4 reduced-motion резолвиться раз на create; mid-session toggle не трекається — задокументовано в коді й USAGE (v1 ок).
- N5 Опції не валідуються (negative maxPx → невалідний blur(), браузер ігнорує; maxSpeed<=minSpeed не дає div-by-zero через порядок guard-ів). Крах-шляху нема.
