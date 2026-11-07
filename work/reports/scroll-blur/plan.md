# plan — motion blur під час пану/зуму діаграми

**Статус:** plan · **Дата:** 2026-11-04 · спирається на [`research.md`](./research.md).
Гілка: `feat/motion-blur-on-pan` (нова, від поточної). Нижче — WHAT/HOW + гейти.

## Problem / Goal
Під час руху камери (пан/зум) дати **легкий velocity-scaled blur**, що знімається, коли камера
стає. Маскує catch-up-лаг card-split-overlay і дає відчуття швидкості. Має бути дешевим,
читабельним і поважати accessibility.

## Рішення (HOW)

### Один CSS-filter на спільний parent
`filter: blur(px)` на `PixiHost.container` — спільний батько Pixi-canvas і promote-overlay-шару,
тож **обидва шари блюряться когерентно** одним фільтром (не треба Pixi `BlurFilter` ні координації
шарів). Знімається → `filter:''`.

### Velocity-scaled, dead-zone, cap (чиста функція — тестований шов)
`motionBlurPx(speed, opts) -> px`:
- `speed` = |Δviewport| / Δt (екранні px/мс) між послідовними кадрами камери.
- dead-zone: `speed <= minSpeed` → **0** (повільний пан чіткий, нуль вартості — фільтр не ставиться).
- лінійно між `minSpeed..maxSpeed` → `0..maxPx`, clamp до `maxPx`.
- Дефолти: `maxPx=6`, `minSpeed`/`maxSpeed` підібрати (орієнтир зі screen-px/мс пану).
Це пряме дзеркало `resolveLodLevel` (чиста, юніт-тестована).

### Тригер — наявна settle-машинерія
`notifyViewportChange` уже коалесить у 1 кадр + 1 settled-виклик (`viewportSettleMs`). Розширити:
- коли `motionBlur` увімкнено, rAF/settle крутиться **незалежно** від host-callback (зараз guard
  `!this.callbacks.onViewportChange` на 541 — додати `&& !motionBlur`).
- на кадрі руху (`settled:false`, reason `'camera'`) → порахувати speed, виставити blur.
- на `settled:true`, на reason `!== 'camera'` (resize/structural), на `destroy` → зняти blur.

### Гейти застосування
- **A11y:** `matchMedia('(prefers-reduced-motion: reduce)').matches` → blur **ніколи** не ставиться.
- **Perf:** `will-change: filter` лише під час руху (ставити з blur, прибирати на settle); blur лише
  понад dead-zone (повільні/дрібні пани — нуль). Cap `maxPx`.

### Публічний API
`OrgHierarchyConfig.motionBlur?: boolean | { maxPx?: number; minSpeed?: number; maxSpeed?: number }`
(дефолт **off**). `true` = дефолти. Експортувати тип опцій. `docs/USAGE.md` — абзац.
Demo вмикає його (щоб власник відчув через `npm run dev`).

## Placement
- `packages/sdk/src/render/motionBlur.ts` — чиста `motionBlurPx` + дефолти (нове).
- `packages/sdk/src/OrgHierarchyDiagram.ts` — config, застосування у viewport-машинерії, clear на destroy.
- `packages/sdk/src/render/PixiHost.ts` — гетер/метод доступу до `container` (якщо потрібен сетер filter).
- `docs/USAGE.md`, demo (`packages/demo`).
Межі WASM↔TS/worker не чіпає. `packages/core` — ні.

## Reuse-first
| Рішення | Статус | Чому |
|---|---|---|
| settle-машинерія (`notifyViewportChange`, `viewportSettleMs`) | reuse+extend | «камера стала» вже є |
| один CSS-filter на `container` | reuse | спільний parent canvas+overlay, без Pixi BlurFilter |
| Pixi `BlurFilter` на stage | відкинуто (v1) | дорожче, окрема координація; CSS-filter на parent простіший і когерентний |
| velocity-blur на overlay-only | відкинуто | лишило б Pixi-лінії чіткими → неузгоджено |

## Side effects
- `container.style.filter`/`willChange` керуються SDK під час руху. Хост не має сам ставити filter на
  той самий елемент. Знімається повністю на settle/destroy (без залишку).
- Дрібні/повільні пани — нуль (dead-zone), тож типовий UX не дорожчає.

## Migration / Rollback
- Адитивно, opt-in, дефолт off → наявні споживачі без змін. Rollback = revert; нічого не ламає.

## Acceptance (чернетка — уточнить `acceptance-spec`)
| # | Сценарій | Очікуване | Верифікація |
|---|---|---|---|
| 1 | швидкий пан | blur > 0, ≤ maxPx, на `container` | unit (motionBlurPx) + integration (style.filter) |
| 2 | камера стала (settled) | filter знято | integration |
| 3 | повільний пан (dead-zone) | filter НЕ ставиться (0) | unit |
| 4 | prefers-reduced-motion | blur ніколи | integration (mock matchMedia) |
| 5 | дуже швидкий пан | px = maxPx (cap) | unit |
| 6 | motionBlur off (дефолт) | filter ніколи не чіпається | integration |
| 7 | reason resize/structural | blur не ставиться / знято | integration |

## Конституція
- [ ] Тести перед кодом (чиста `motionBlurPx` + застосування).
- [ ] KISS: один CSS-filter, чиста velocity-функція; без Pixi BlurFilter у v1.
- [ ] Публічний API не мовчки: config + docs/USAGE.md.
- [ ] A11y reduced-motion — обов'язковий гейт (не опція).

## Гейти (R6, скорочено за «відразу»)
Критик inline (у плані) + незалежне рев'ю наприкінці. Перф — **виміряти на великій сцені** (не 3-вузл),
це acceptance-умова, не припущення.

## Ризики
- CSS-filter на контейнері з живим canvas перераховується щокадру → потенційний jank на великій сцені.
  Мітигація: dead-zone (блюр лише на швидкому русі, коротко), cap, will-change, вимір. Якщо дорого —
  v2 знизити (Pixi resolution / overlay-only) або лишити лише на overlay.
