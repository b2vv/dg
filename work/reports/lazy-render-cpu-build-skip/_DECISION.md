# DECISION — viewport-virtualization = YAGNI (measurement-driven, 2026-11-05)

## Рішення
Підсистему **viewport-virtualization у SDK НЕ будуємо.** Наявного вже достатньо: GPU-cull
(`cullToViewport`, фіча 1-B, у main) + always-on prune + per-canvas Pixi-рендер. Гілку
`feat/sdk-viewport-virtualization` закрито; код не писався (лише research).

Це **другий** YAGNI-вердикт по цій осі. Перший (425cb80) переглянули (5475d08) на премисі «demo-
вікнування 1M = прогалина SDK». Премиса **померла**: власник підтвердив, що реальні дані завжди
департаментні/обмежені (тисячі, не мільйони), а пласка 1M-стіна — demo-артефакт.

## Чому (напруга §6 була ХИБНОЮ дихотомією)
«data-window vs draw-window» розчиняється, щойно відокремити *layout-рахунок* від *матеріалізації+
рендеру*. Вікнування — DRAW-concern, не DATA-concern; `spliceData`/data-slicing як коректність не
потрібні (узгоджено з owner-spec вольту: whole-tree layout, без splice).

## Докази (4 осі виміряно, усі в бюджеті)
| вісь | результат | метод |
|---|---|---|
| Layout (org-RT) | 10k=54мс; 1M=8.6с (гіпотетично) — але реальне ≤100k=0.59с | standalone probe, median-3 |
| Layout (staff-стіна) | арифметика сітки `cellOfSeat`, O(вікно) | код (`scaleStaff.ts:343`) |
| DOM/draw | 1 Pixi-canvas, DOM~сталий (96→105 на зумі), promote capped+viewport-gated | browser (brigade) |
| **Build** (layoutStaffCanvas) | 5k розгорнутий=**29мс**, ~лінійно (~6µs/вузол) | standalone probe + always-on prune |

Повні числа — [`_measure-wasm-ceiling.md`](./_measure-wasm-ceiling.md).
Архітектурний розбір (pattern-architecture-review + step-back-review, канон «4 міні-ліби») —
[`_arch-review-4libs.md`](./_arch-review-4libs.md).

## Що лишається / тригер перегляду
- `cullToViewport` (1-B) лишається — єдиний потрібний draw-window механізм.
- Канон «4 міні-ліби» (hexagonal) — north-star, НЕ передумова. TS-`core/` (pure) уже частково існує;
  бракує лише `core/ports` + DIP-інверсії над layout-движком — робити ЛИШЕ коли буде реальна потреба.
- **Перегляд, якщо** реальний host-кейс покаже: один staff-view з десятками тис. РОЗГОРНУТИХ посад,
  або не-департаментні пласкі дані довільного розміру від хоста. Доти — YAGNI.

## Застереження (чесно)
Build-вимір — `layoutStaffCanvas` (геометрія, важка алгоритмічна частина), не ВЕСЬ render() із
Pixi-display-objects+paint; paint куллиться (1-B). Перші проби були фальшиво-зелені (не те поле /
неекспандований prune) — валідація `out-nodes=in` обов'язкова (урок: зелене ≠ є робота).
