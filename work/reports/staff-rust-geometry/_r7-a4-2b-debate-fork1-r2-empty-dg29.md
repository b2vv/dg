claude-opus-4-8

# R7 A4.2b FORK1 Раунд 2 — позиція «canvas.tiers=[]» (dg29)

ДАЛІ: читаю первинні джерела — staffGeometry.golden.test.ts (normalizeLayout, capture, бейслайн), __golden__/staff-geometry.json, адаптер buildStaffLayoutInput та місце, де формується staffLiveGeometry.canvas.tiers. Перевіряю, хто реально споживає canvas.tiers.

## ФАКТИ (звірено з кодом)

- normalizeLayout `staffGeometry.golden.test.ts:44-58` — СПІЛЬНА для Seam A (`layout`, :108) і Seam B (`live`, :109). `bands` береться з `canvas.tiers` (:49). tiers=[] → bands=[].
- Seam A `layout` = `layoutStaffCanvas` напряму (:70-74) → реальні raw tiers лишаються → `layout.bands` несе raw-смуги (гейт до A4.4). tiers=[] в адаптері Seam B НЕ чіпає Seam A.
- Споживачі `canvas.tiers` поза golden: (1) `staffLiveGeometry.ts:101` enrichStaffTierBands→`zones`; (2) `svgExport.ts:226` enrichStaffTierBands→SVG zones. svgExport має ВЛАСНИЙ `layoutStaffCanvas` (:205-219) — НЕ на Rust-шляху, tiers у нього реальні, адаптер його не торкає.
- staffLiveGeometry `canvas = input.canvas ?? layoutStaffCanvas(...)` (:82-95). У A4.2b Rust-canvas подається як input.canvas з tiers=[]; зони ТОДІ мусять братися з Rust-namespaces (enriched), бо enrichStaffTierBands([])=[] зламало б zones. Це частина A4.2b НЕЗАЛЕЖНО від рішення FORK1 → поза скоупом дебатів.
- StaffCanvasResult.tiers тип `types.ts:152: StaffTierBand[]` → [] валідне.

## РІШЕННЯ КЛЮЧОВОГО ПИТАННЯ

- compare() порівнює КЛЮЧІ об'єкта з толеранс 0 (:124-130, :128). Тому:
  - tiers=[] → live.bands стає [] → падає на `.bands.length` (2 vs 0) → ПОТРІБЕН UPDATE_GOLDEN.
  - drop-bands-key → live втрачає ключ `bands` → падає на `.live.keys` → ТЕЖ ПОТРІБЕН UPDATE_GOLDEN.
  ВИСНОВОК: обидва варіанти вимагають rebaseline. «drop не змінює чисел» — правда, але НЕ рятує від rebaseline (ламається .keys).
- drop «без гілки» можливий як destructure на call-site (:109): `const {bands:_omit,...rest}=normalizeLayout(...)` — тоді normalizeLayout не чіпається. Чесно: на «розмір хірургії» це ~нічия з tiers=[], і контр-аргумент «гілка normalizeLayout» стосується лише drop-варіанту (a).

## РЕКОМЕНДАЦІЯ: canvas.tiers=[]
1. Чесність артефакту: tiers=[] констатує ІСТИННИЙ факт Rust-canvas («немає raw-смуг»), а не ховає поле в оракулі.
2. normalizeLayout лишається ОДНА і НЕЧІПАНА; Seam A layout.bands у бейслайні незмінний (гейт A4.4 стоїть). drop-via-destructure додає unused-binding smell (oxlint-кандидат).
3. Форма-паритет: live.bands=[] поруч із layout.bands=[повні] документує сам факт A4.2b і ТРИМАЄ слот відкритим для A4.4 (переповнити []→числа дешевше, ніж воскрешати ключ+шлях серіалізації).
4. Rebaseline tiers=[] — найлегший до «благословення»: diff = кожен live.bands масив → [], ключі незмінні, НОВИХ чисел нема (нічого звіряти оком). drop змінює набір ключів — трохи менш локальний diff.

Обидва U4-дружні, обидва rebaseline. tiers=[] виграє на чесності+паритеті+легібельності diff. Рекомендація однозначна: canvas.tiers=[].
