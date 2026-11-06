# R4 — plan: зум конфіг

**Статус:** plan. Гілка `feat/extensibility`. Spec: [`spec.md`](./spec.md). Placement: `packages/sdk`. GATE-1 з роадмапу (дизайн вирішено).

## 1. Архітектура
`Viewport` отримує резольвнутий wheel-конфіг і вирішує per-event: зумити / панувати / ігнорувати — за `behavior` +
`gestures`. Mac (B1): PRIORITY, не remap — на Mac зум спрацьовує на `ctrlKey || metaKey` (зберігає trackpad-pinch=ctrl+wheel; ⌘ рекомендований), не ексклюзивно; строго per-gesture лише non-Mac. Платформа читається раз. Клавіатурний зум (Ctrl/⌘ +/−/=) — слухач
на canvas (focusable). `zoomBy` анімується через наявний `animateTo`. Фасад плюмбить `OrgHierarchyConfig.wheel` у Viewport;
дефолт `zoom-modifier` + `panHorizontal:false`. Без конфігу — дефолт (поточна поведінка мінус shift-горизонт-пан).

## 2. Reuse-first
| Що | Перевикористовуємо | Нове |
|---|---|---|
| zoom-at-pointer / clamp | `zoomAt`/`clamp` (Viewport) | — |
| анімація | `animateTo` (Viewport) — для `zoomBy` | — |
| wheel pan delta | `wheelPanDelta` | — |
| wheel-резолв | — | `resolveWheelConfig(cfg, platform)` + per-event рішення |
| keyboard | — | слухач keydown (Ctrl/⌘ +/−/=) |

## 3. Контракт (публічний)
```ts
type WheelBehavior = 'zoom-modifier' | 'zoom' | 'pan';
interface WheelConfig {
  behavior?: WheelBehavior;                 // деф 'zoom-modifier'
  gestures?: { zoom?: 'ctrl' | 'meta' | 'none'; panHorizontal?: false | 'shift' };  // деф zoom:'ctrl' (на Mac НЕ ексклюзивно: ctrl||meta зумлять, ⌘ рекоменд. — B1 priority), panHorizontal:false
}
// OrgHierarchyConfig.wheel?: WheelConfig
```

## 4. Нарізка
| ID | Файли | Що | Залежить | Приймання |
|---|---|---|---|---|
| R4-A | `render/Viewport.ts`, `render/wheelConfig.ts` (new, чистий резолв+рішення) (+tests) | `resolveWheelConfig(cfg, platform)`; per-event wheel-рішення (zoom/pan/none за behavior+gestures+Mac-меппінг); клавіатурний зум (додати tabindex=0 на canvas/контейнер + keydown ТАМ; кнопки лишаються primary a11y, N2); анімований `zoomBy` що КОМІТИТЬ цільовий scale СИНХРОННО (getZoom одразу точний, анімується лише візуал — N1); Mac pinch(ctrl)=зум; `panHorizontal:false`→не чіпати shift; `resolveWheelConfig`: невідомий рядок→дефолт, `behavior:'pan'`→gestures.zoom ігнор для wheel (N3) | — | AC1-AC7 |
| R4-B | `OrgHierarchyDiagram.ts`, `docs/USAGE.md`, `index.ts` (+test) | `wheel` у конфігу; плюмб у Viewport; `WheelConfig`/`WheelBehavior` у барель; USAGE (контракт жестів + що деф) | R4-A | AC8 + публічний API |

**Паралель:** R4-A (pure резолв + Viewport) → R4-B (facade). wheelConfig.ts — чистий, тестований окремо.

## 5. Side effects / rollback
- Публічний: `wheel` конфіг + типи (адитивно). ⚠️ Деф `panHorizontal:false` прибирає нинішній Shift+wheel горизонт-пан
  (owner-review; opt-out `'shift'` повертає). Решта дефолту = поточна поведінка.
- `preventDefault` лише коли SDK реально обробляє подію (не ковтати shift, якщо panHorizontal:false — UX-ризик 2).
- **zoomBy (N1):** комітить цільовий scale синхронно (публічний `getZoom` одразу вертає фінал), анімує лише візуальну інтерполяцію — демо-лейбл `getZoom` лишається коректним, demo НЕ чіпаємо.
- **Клавіатура (N2):** canvas/контейнер отримує tabindex; keydown там; без фокуса — кнопки (вже a11y). preventDefault лише для своїх комбо.
- Rollback = revert R4-*; дефолт без wheel-конфігу ≈ поточний (мінус shift-пан).

## 6. Acceptance-table
| # | Сценарій | Дія | Результат | Рівень | AC |
|---|---|---|---|---|---|
| 1 | деф zoom-modifier | Ctrl+wheel | зум-до-курсора; плейн wheel вертик-пан; Shift+wheel НЕ панує (деф) | unit+integ | AC1 |
| 2 | behavior zoom | плейн wheel (behavior:'zoom') | зум-до-курсора без модиф. | unit | AC2 |
| 3 | behavior pan | wheel (behavior:'pan') | завжди пан, зум лише кнопка/клавіша | unit | AC2 |
| 4 | gestures.zoom meta | ⌘+wheel vs ctrl+wheel | лише meta зумить; ctrl ні (коли 'meta') | unit | AC3 |
| 5 | Mac ⌘+wheel зумить | platform=mac, ⌘+wheel | зумить (⌘ рекомендований) | unit | AC3 |
| 5b | Mac trackpad pinch (ctrl+wheel) ЗУМИТЬ (B1) | platform=mac, ctrl+wheel (pinch) | зум-до-курсора (НЕ пан) — pinch збережено | unit | AC3,AC7 |
| 6 | zoom none | wheel+будь-який модиф (zoom:'none') | ніколи не зумить | unit | AC3 |
| 7 | panHorizontal shift | Shift+wheel (panHorizontal:'shift') | горизонт-пан | unit | AC4 |
| 8 | panHorizontal false не ковтає | Shift+wheel (деф) | SDK НЕ preventDefault/не панує — подія хосту | unit | AC4 |
| 9 | клавіатурний зум | Ctrl/⌘ +/−/= | зум до центру, кламп | unit+integ | AC5 |
| 10 | анімована кнопка | `zoomBy` | animateTo (не стрибок) | unit | AC6 |
| 11 | курсор IN/OUT | zoom in потім out | фокус-точка стабільна (не регрес) | unit | AC7 |
| 12 | без конфігу | wheel не задано | деф zoom-modifier (поточна мінус shift-пан) | integ | AC8 |
| 13 | невідомий конфіг→дефолт (N3) | behavior:'bogus' | fallback дефолт, без винятку | unit | AC8 |
| 14 | behavior precedence (N3) | behavior:'pan' + gestures.zoom:'ctrl' | wheel завжди панує (gestures.zoom ігнор для wheel) | unit | AC2 |
| 15 | zoomBy sync getZoom (N1) | zoomBy(2) потім getZoom одразу | getZoom = фінальний target (не stale) | unit | AC6 |

## 7. Конституція (inline): TDD; KISS (чистий резолв + реюз zoomAt/animateTo); WASM незмінний; публічний API
(`wheel`/`WheelConfig`) → USAGE+барель (R4-B); Pocock-TS. **PASS.**
