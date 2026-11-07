# R5 — plan: marquee мультивибір

**Статус:** plan. Гілка `feat/extensibility`. Spec: [`spec.md`](./spec.md). Placement: `packages/sdk`. GATE-1 з роадмапу.

## 1. Архітектура (рев.2 — GATE-2 F1/F3/F5)
⚠️ **Жест-колізія (F1):** порожній лівий-drag ЗАРАЗ панує камеру (`PixiHost.bindPan` PixiHost.ts:369-388, button 0|1;
ноди stopPropagation, тож фон доходить до stage). Тому тригер marquee = **Shift + лівий-drag на порожньому**
(роадмап R4-легенда: Shift=вибір, рамка=мультивибір); звичайний (без Shift) drag = пан, НЕЗМІННО. Пан гаситься
(stopPropagation перед beginPan) ЛИШЕ коли: Shift затиснуто AND marquee активний (sink заданий, тобто хост дав
`onMarquee`). Без `onMarquee` — Shift+drag теж панує, байт-у-байт.

Жест у `DiagramRenderer` (володіє сценою): Shift+pointerdown-на-порожньому → захопити старт у **WORLD**-координатах
(F5: щоб пан/зум посеред drag не корумпував rect) → pointermove оновлює world-rect → pointerup. Чистий `render/marquee.ts`
рахує rect і hit-test «box×rect перетин» над world-боксами (`scene.listBoxes()` :660, LOD-незалежні). Щокадру drag
рендерер емітить world-rect хосту (через `callHostCallback` — F6, throw хоста ізольований, не стопорить жест); на release
→ hit-test → id[] → `sink.onSelect(ids)`. **F1b: marquee ЗАВЖДИ additive** (Shift — і тригер, і multi-select-семантика
за легендою; replace-гілки нема, бо без Shift drag = пан) — фасад робить Shift-union. **F3:** після справжнього marquee-drag придушити наступний
`pointertap`→`onCanvasClick` (прапорець `tapAfterDrag`, як T91 personInteractions.ts:124-159), щоб не стерти вибір.
Хост малює гумку своїм стилем; SDK не стилізує.

## 2. Reuse-first
| Що | Перевикористовуємо | Нове |
|---|---|---|
| Selection | `InteractionStore.replaceMany` (REPLACE-only) + `toggle` (D1) | **Shift-union** (додавання до наявного) — НОВИЙ код фасаду (F7: `selectMany`/`replaceMany` замінюють, не обʼєднують) |
| Pointer mods | `readSelectionPointerMods`/`isSelectionToggleModifier` (interaction/selection) | — |
| Node world-боксы | `scene.listNodeBoxes`/listViews (рендер) | — |
| Rect-перетин | — | `boxesIntersectRect` (чистий, render/marquee.ts) |
| Host-шов | прецедент promote-overlay (інжектована презентація) | колбек `onMarquee(rect\|null)` |

## 3. Контракт (публічний — R5-C)
```ts
// world-rect рамки для стилізації хостом; null = рамки нема (кінець/скасування)
interface MarqueeRect { x: number; y: number; width: number; height: number }  // world coords
// OrgHierarchyConfig.onMarquee?: (rect: MarqueeRect | null) => void   (callback, як інші host-колбеки)
```

## 4. Нарізка
| ID | Файли | Що | Залежить | Приймання |
|---|---|---|---|---|
| R5-A | `render/marquee.ts` (+test) | чисто: `rectFromDrag(a,b)`, `boxesIntersectRect(boxes, rect)` → id[]; поріг клік-vs-drag | — | AC3 |
| R5-B | `render/DiagramRenderer.ts` (+test) | жест **Shift+pointerdown-на-порожньому**→move→up; захоп старт у WORLD (F5); пан гаситься (stopPropagation до beginPan) ЛИШЕ при Shift AND активному sink; щокадру world-rect хосту; release → hit-test (R5-A) → ids → `sink.onSelect(ids)` (ЗАВЖДИ additive, F1b); **tapAfterDrag**-придушення `onCanvasClick` після drag (F3); marquee-поріг авторитетний над Pixi-tap (F4) | R5-A | AC1,AC3,AC4,AC5,AC7,AC8 |
| R5-C | `OrgHierarchyDiagram.ts`, `docs/USAGE.md` (+test) | `onMarquee` колбек у конфігу + проводка; marquee-selection через **Shift-union** (НЕ selectMany, що replace-only — F7); `MarqueeRect` у барель; USAGE | R5-B seam | AC1,AC2,AC5,AC6,AC7 |

**Паралель:** після R5-A → R5-B ∥ R5-C (неперетинні файли; шов — сигнатура колбеку вибору/rect, фіксується тут).

### 4.1 Шов R5-B ↔ R5-C
`DiagramRenderer.setMarqueeSink(sink: { onRect(rect: MarqueeRect|null): void; onSelect(ids: string[]): void  // marquee завжди additive (F1b) } | null)`.
Фасад ставить sink ЛИШЕ коли хост дав `onMarquee` (opt-in): `onRect`→host `onMarquee` (через callHostCallback, F6);
`onSelect`→Shift-union (ЗАВЖДИ додає; F1b/F7). `sink===null` → рендерер marquee НЕ запускає, Shift+drag панує (байт-у-байт).
DiagramRenderer кличе sink під час/в кінці жесту й **придушує пан лише коли sink≠null AND Shift** (F1). Рендерер НЕ знає
про store; фасад НЕ знає про pointer.

## 5. Side effects / rollback (рев.2)
- **Opt-in (єдине формулювання, F2/F8):** повний marquee (жест + вибір + візуал) активний ЛИШЕ коли хост дав
  `onMarquee` → фасад ставить `setMarqueeSink`. Без `onMarquee`: sink=null, рендерер marquee НЕ запускає, Shift+drag
  панує як зараз — **байт-у-байт** (урок D1). Жодного тихого змінення хоста.
- Пан: звичайний drag панує завжди; Shift+drag панує, ЯКЩО sink=null; при sink≠null Shift+drag = marquee (пан
  придушено лише в цьому випадку).
- Selection через InteractionStore (onSelectionChange сумісний); Shift-union — новий код фасаду (F7). 0 у спокої.
  Rollback = revert R5-*; без `onMarquee` і так no-op.

## 6. Acceptance-table
| # | Сценарій | Дія | Видимий результат | Рівень | AC |
|---|---|---|---|---|---|
| 1 | marquee додає | onMarquee; Shift+drag над 2 нод (вибір порожній) | selected={ті 2} (додані) | integ | AC1 |
| 2 | additive до наявного | вибрано A; Shift+drag над B | selected={A,B} (marquee завжди додає) | integ | AC2 |
| 3 | перетин, не «всередині» | рамка частково накрила ноду | нода вибрана (перетин) | unit | AC3 |
| 4 | клік-не-drag | pointerdown-up без руху на порожньому | не marquee; зняття вибору як зараз | integ | AC4 |
| 5 | rect хосту | drag | `onMarquee` отримує world-rect щокадру, null на release/cancel | integ | AC5 |
| 6 | без onMarquee | drag на порожньому БЕЗ opt-in | нічого (байт-у-байт) | integ | AC6 |
| 7 | far-LOD marquee | far-зум; рамка | вибір за world-боксами працює на far | integ | AC3 |
| 8 | спокій | після marquee | 0 rAF/жесту | integ | AC7 |
| 9 | Shift-gate (F1) | onMarquee задано; БЕЗ Shift лівий-drag на порожньому | пан камери (НЕ marquee), як зараз | integ | AC8 |
| 10 | Shift+drag = marquee, не пан (F1) | onMarquee; Shift+drag | marquee-rect, камера НЕ панує; результат additive | integ | AC8 |
| 11 | без onMarquee Shift+drag панує (F2) | БЕЗ onMarquee; Shift+drag | пан (байт-у-байт), marquee не запускається | integ | AC6 |
| 12 | tap після drag не стирає (F3) | onMarquee; marquee обрав ноди, release на порожньому | вибір ЗБЕРІГАЄТЬСЯ (onCanvasClick придушено) | integ | AC1,AC4 |
| 13 | пан/зум посеред drag (F5) | marquee drag, камера зсувається | world-rect стабільний (старт у world), вибір коректний | unit+integ | AC3 |
| 14 | onMarquee кидає (F6) | хост onMarquee кидає посеред drag | жест не зависає; наступні кадри/release працюють; 1 warn | integ | AC5 |

## 7. Конституція (inline): TDD; KISS (чистий hit-test + колбек, без нових абстракцій); WASM незмінний; публічний API
(`onMarquee`/`MarqueeRect`) → USAGE (R5-C); Pocock-TS. **PASS.**
