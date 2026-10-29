# R7 A4.2b FORK1 Раунд 2 — dropkey (dg29)

Model ID: claude-opus-4-8

ДАЛІ: читаю тест + бейслайн, звіряю Seam A/B, рахую рядки для dropkey, перевіряю covers-tab.

## ФАКТ — структура тесту (staffGeometry.golden.test.ts)
- normalizeLayout (:44-58) СПІЛЬНА; продукує ключ `bands` з `canvas.tiers` (:49-53).
- Seam A `layout` (:70-74) = `layoutStaffCanvas(...)` НАПРЯМУ (сирий canvas з tiers). НЕ йде через computeStaffLiveGeometry.
- Seam B `live` (:90-93) = `computeStaffLiveGeometry(...)`; у golden іде `normalizeLayout(live.canvas, margin)` (:109) → ключ `bands`, плюс окремо `zones` (:96-99) і `routes`.
- compare (:113-133): рекурсивний; перевіряє набір ключів (`.keys`, :128) з tolerance 0 — тобто ПРИБРАННЯ ключа або зміна його — структурна зміна.
- covers-every-tab (:136-140): фільтрує TAB_META за `staffLayout`; до `bands` ЖОДНОГО стосунку → dropkey його НЕ чіпає.
- determinism (:159, tol=0): repeated vs actual; обидва без bands → ок.

## ФАКТ — бейслайн __golden__/staff-geometry.json
11 табів. Сьогодні `live.bands` == `layout.bands` поелементно (обидва через TS layout). Напр. staff-tree: live.bands=3, layout.bands=3, live.zones=3. variant-b/worker: bands=1, zones=0.

## ФАКТ — хто читає live.canvas.tiers (крит. для опонента)
- staffLiveGeometry.ts:100-107 — `zones = enrichStaffTierBands(canvas.tiers, …)` ВСЕРЕДИНІ computeStaffLiveGeometry, ДО return. Тобто зони (що малює рендерер) деривуються з tiers.
- svgExport.ts:224-236 — читає tiers СВОГО власного canvas (окремий layoutStaffCanvas :205-219), НЕ з виходу computeStaffLiveGeometry.
- Повернуте `live.canvas.tiers` як поле зовні читає ЛИШЕ golden-тест (через normalizeLayout). Контекст підтверджено.

## РІШЕННЯ — як виглядає кожна опція насправді
**dropkey (моя):** суто тест-сайд. На :109 вилучити `bands` з live-обʼєкта через destructure-omit:
```
const { bands: _rawBands, ...liveCanvas } = normalizeLayout(live.canvas, margin);
...
live: { ...liveCanvas, zones, routes },
```
~2 рядки + коментар. normalizeLayout НЕ чіпається (Seam A на :108 далі несе bands). SDK НЕ чіпається. Бейслайн регенерується → ключ `live.bands` зникає.

**canvas.tiers=[] (опонент):** когерентна версія = SDK-зміна в staffLiveGeometry.ts — зрізати сирі tiers з повернутого canvas ПІСЛЯ деривації zones (`return { canvas: { ...canvas, tiers: [] }, … }`). Бо прямо `canvas.tiers=[]` до :100 ЗЛАМАЄ zones (і рендерер, і golden). Альтернатива «тест-сайд []» — фальшива асерція (поле насправді населене сьогодні), відкидається.

## АРГУМЕНТ — чому dropkey переважає
1. **Жодне число не змінює ЗНАЧЕННЯ.** dropkey прибирає ключ — числа зникають як поле, жодне не стає іншим числом. А `[]` показує реверзію-подібний diff `bands:[{…},{…}] → bands:[]`, який людина за U4 прочитає як «смуги схлопнулись = гео-баг» і запустить адюдикацію. Diff від dropkey (ключ видалено) однозначно читається «перестали трекати поле», НЕ «гео зламалось». Це і є буква D3 r1: для A4.4 diff'у немає зовсім, а власний diff A4.2b не сплутати з багом.
2. **`bands` у live — немальований рудимент.** Рендерер малює `live.zones`, не `live.canvas.tiers`. Прибрати асерцію чесніше, ніж стверджувати «порожні смуги» (`[]` документує те, чого ніхто не малює).
3. **Seam A `layout` зберігає raw-band гейт до A4.4** — :108 `normalizeLayout(layout,…)`, layout=сирий layoutStaffCanvas (:70) → `layout.bands` далі в бейслайні. Raw-покриття не втрачається.

## Найсильніший контр опонента (чесно)
canvas.tiers=[] «не чіпає спільну normalizeLayout, менша хірургія, нема ризику Seam A».

## Спростування
- dropkey ТЕЖ не чіпає normalizeLayout (destructure на сайті виклику) і ТЕЖ не чіпає Seam A (Seam A не йде через live-return узагалі, :70). Тож перевага опонента НЕ ексклюзивна.
- Рішуча асиметрія ризику: dropkey = зміна ЛИШЕ в тест-файлі (demo). canvas.tiers=[] = зміна ПРОДАКШН-контракту SDK (`staffLiveGeometry.ts` return), зроблена суто заради форми golden, ще й передчасно (до A4.4) → YAGNI-порушення; продакшн формують під зручність тесту. Зрізання tiers із live-return — реальна (хай мала) зміна поведінки SDK зараз.
- Складність розгалуження: тривіальна — 2 рядки destructure проти SDK-правки + ризик, що майбутній/зовнішній споживач live.canvas.tiers втратить поле.

## РЕКОМЕНДАЦІЯ
Однозначно **dropkey**. Тест-сайд, 2 рядки, normalizeLayout і Seam A недоторкані, SDK недоторканий, covers-tab/determinism не зачеплені, raw-band гейт живе у Seam A до A4.4. Diff бейслайну = чисте прибирання ключа, яке не мімікрує під гео-регресію — максимально відповідає U4/D3 r1. canvas.tiers=[] програє: або фальшива асерція, або передчасна продакшн-зміна SDK з реверзія-подібним diff.
