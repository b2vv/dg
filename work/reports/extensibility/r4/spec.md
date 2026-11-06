# R4 — Зум: конфігуровний wheel + клавіатура + анімована кнопка — spec

**Статус:** spec. Гілка `feat/extensibility`. Джерело: ROADMAP §R4 (дизайн ВИРІШЕНО власником 2026-11-02 + web-дослідж + ux-ревʼю). GATE-1 з роадмапу.

## Проблема (ROADMAP §R4)
Зараз `Viewport.onWheel` хардкодить: ctrl/⌘+wheel=зум-до-курсора, плейн=вертик-пан, shift=горизонт-пан; `zoomBy`=центр
без анімації; **нема** клавіатурного зуму. Консенсусу «колесо=зум vs модифікатор» нема → **конфіг, не хардкод**.
UX-ризики (3 обовʼязкові): Mac ctrl↔accessibility-зум колізія; SDK ковтає shift/жести (preventDefault) ламає хост;
дискаверабіліті модифікатора.

## Рішення (роадмап, дизайн)
Конфіг: `wheel: { behavior: 'zoom-modifier'(деф) | 'zoom' | 'pan', gestures: { zoom: 'ctrl'|'meta'|'none',
panHorizontal: false(деф) | 'shift' } }` (opt-out) + **Mac→meta пріоритет** (ctrl↔accessibility) + клавіатурний зум
(Ctrl/⌘ +/−) + **анімована** `zoomBy` (через `animateTo`). Дефолт для цього хоста = `zoom-modifier` (портал уже
модифікаторний). **Shift належить ВИБОРУ (R5), не wheel-пану** → `panHorizontal` дефолт `false` (opt-out лишає Shift хосту).

## User scenarios
1. Дефолт (`zoom-modifier`): Ctrl/⌘+wheel зумить до курсора (IN і OUT однаково); плейн wheel — вертик-пан; Shift
   вільний (не горизонт-пан) — лишається хосту/вибору.
2. `behavior:'zoom'`: просте колесо зумить (без модифікатора) — для хостів, що так хочуть.
3. `behavior:'pan'`: колесо завжди панує; зум лише кнопкою/клавіатурою.
4. Mac (**рев.2, GATE-2 B1 — PRIORITY, не remap**): trackpad pinch приходить як синтетичний ctrl+wheel
   (`Viewport.ts:257/444`), тож на Mac **ctrl+wheel МУСИТЬ лишатись зумом** (pinch), інакше pinch панує = регресія.
   «Пріоритет ⌘» (роадмап §R4:233) = ⌘ рекомендований/документований явний модифікатор; ctrl НЕ вимикається.
   Отже на Mac зум спрацьовує на `ctrlKey || metaKey` (коли behavior дозволяє); `gestures.zoom:'ctrl'|'meta'` на Mac
   не ексклюзивний (обидва зумлять — pinch+⌘); строгий лише на non-Mac. `'none'` вимикає wheel-зум на обох.
5. Клавіатура: Ctrl/⌘ + `+`/`-`/`=` зумить (кнопки фокусовні — a11y). 
6. Кнопка зуму (`zoomBy`) — анімований перехід (не стрибок).
7. `panHorizontal:false` (деф): Shift+wheel НЕ перехоплюється SDK (хост може мати свій shift).

## Acceptance (чернетка)
- AC1: `behavior:'zoom-modifier'` (деф) = поточна поведінка АЛЕ Shift+wheel більше не горизонт-панує (деф panHorizontal:false).
- AC2: `behavior:'zoom'` — плейн-wheel зумить до курсора; `behavior:'pan'` — wheel завжди панує, зум лише кнопка/клавіша.
- AC3: `gestures.zoom:'meta'` → на non-Mac лише ⌘+wheel; на Mac ctrl||meta зумлять (pinch збережено, ⌘ рекоменд.); `'ctrl'` на non-Mac=ctrlKey; `'none'` → wheel ніколи не зумить (обидві платформи).
- AC4: `panHorizontal:'shift'` (opt-in) → Shift+wheel горизонт-панує; деф false → не перехоплює Shift.
- AC5: клавіатурний зум Ctrl/⌘ +/−/= зумить (до центру), кламп як є.
- AC6: `zoomBy` анімований (animateTo), не миттєвий стрибок.
- AC7: зум-до-курсора IN/OUT консистентний (вже ок — не регресувати); кламп minScale/maxScale (вже ок).
- AC8: без `wheel`-конфігу — дефолт `zoom-modifier` (поточна поведінка, мінус shift-горизонт-пан — свідома зміна за легендою R5).

## Out of scope / Open
- **Hint-оверлей дискаверабіліті** — ХОСТ (портал уже має легенду «Ctrl+скрол»). SDK дає СТАБІЛЬНИЙ контракт жестів,
  щоб легенда не брехала; сам оверлей не малює (презентація хоста). Note в USAGE: який контракт активний.
- Pinch (mobile) — вже є, не чіпати.
- ⚠️ **Зміна поведінки:** деф `panHorizontal:false` прибирає нинішній Shift+wheel горизонт-пан. Свідомо (роадмап:
  Shift→вибір R5). Хост-видиме → **owner-review при пуші** (як F1/F1b R5). Opt-out: `panHorizontal:'shift'` повертає.
