# Emphasis-зріз — plan РЕВ.2: EmphasisStore (ВНУТРІШНІЙ рефактор)

**Статус:** plan рев.2 (GATE-2 B1/B2 + scope-звуження). Гілка `feat/emphasis-store` off main `565e7c6`. Spec: [`spec.md`](./spec.md).
**GATE-1 рішення (рев.2, YAGNI+рев'юер):** **internal-only рефактор** — БЕЗ публічного `subscribeEmphasis` (нема host-слухача; хост
лише пише setFoundFocus/highlightPath). Це **нижче порога пайплайна** (рефактор без нової межі) → легкий шлях, не повний цикл.
Публічний subscribe — окремий адитивний follow-on, коли зʼявиться слухач.

## 1. Архітектура (рев.2)
`EmphasisStore { found: ReadonlySet<string> | null; highlight: string | null }` (B1: highlight=STRING-id, не NodeRef —
ViewStateStore:11/highlightPath:1930/repaintHighlight:1085 усі string). Чистий state-holder: `setFound(ids)`,
`setHighlight(id)`, `clearEmphasis()`, `get state(): EmphasisState`. **БЕЗ subscribe** (KISS: emphasis-записи йдуть із фасаду,
тож delegates кличуть наявний `repaintHighlight` НАПРЯМУ — не потрібна self-subscription, на відміну від D1, де hover
походить із views). Окремо від InteractionStore (два власники, D1-деталь). auto-highlight (hover→related) = `staffDimmedIds`
на льоту (вже так, DiagramRenderer:285) — не чіпаємо.

## 2. Reuse-first
| Що | Перевикористовуємо | Нове |
|---|---|---|
| emphasis-рендер | `repaintHighlight`/`reportPath`/foundDimAlpha | читання зі store замість viewState-полів |
| фасад-входи | `setFoundFocus`/`highlightPath` | делегати: set у store + repaintHighlight напряму |
| чищення | поточне БЕЗУМОВНЕ (viewState null на ingest :1489-1490, render нулить foundFocus :1002) | `store.clearEmphasis()` на setData (B2: безумовно, НЕ reconcile) |

## 3. Контракт (ВНУТРІШНІЙ — без нового публічного API)
```ts
interface EmphasisState { readonly found: ReadonlySet<string> | null; readonly highlight: string | null }
class EmphasisStore { get state; setFound(ids: ReadonlySet<string>|null); setHighlight(id: string|null); clearEmphasis() }
```
Публічної поверхні НЕ додаємо (USAGE/барель не чіпаємо; check:docs/facadeSurface не зачеплено).

## 4. Наріза (мала, 1 задача — рефактор)
| ID | Файли | Що | Приймання |
|---|---|---|---|
| E-A | `state/EmphasisStore.ts` (+test), `OrgHierarchyDiagram.ts`, `render/DiagramRenderer.ts` (+tests) | EmphasisStore (found+highlight STRING, set/clear); фасад setFoundFocus/highlightPath делегують у store + кличуть repaintHighlight напряму; repaintHighlight читає `emphasisStore.state`; setData→`clearEmphasis()` (безумовно); viewState-emphasis-поля прибрати/перевести. Байт-у-байт. | AC1-AC6 |

## 5. Side effects / rollback
- Поведінка emphasis — БАЙТ-У-БАЙТ (той самий dim/accent/foundDimAlpha; безумовне чищення на setData збережено). Жодного
  нового публічного API. Emphasis окремо від InteractionStore. 0 у спокої.
- Rollback = revert E-A; delegates повертаються до viewState-полів.

## 6. Acceptance-table (рев.2)
| # | Сценарій | Дія | Результат | Рівень | AC |
|---|---|---|---|---|---|
| 1 | found байт-у-байт | setFoundFocus(ids) | не-found приглушені (foundDimAlpha), ідентично поточному | integ | AC1 |
| 2 | highlight байт-у-байт | highlightPath(id) | admin-шлях акцент+dim, ідентично | integ | AC1 |
| 3 | store тримає emphasis | setFound/setHighlight | EmphasisState.found/highlight (STRING); viewState більше не джерело | unit | AC2 |
| 4 | БЕЗУМОВНЕ чищення на setData (B2) | setData з overlapping found-id | found+highlight ОБИДВА null (НЕ утримуються) — як зараз | unit+integ | AC3 |
| 5 | окремо від D1 | emphasis активний | InteractionState без found/highlight; два store | unit | AC4 |
| 6 | highlight=string контракт (B1) | setHighlight('x') | state.highlight==='x' (string, не NodeRef) | unit | AC2 |
| 7 | 0-вартості спокій | після emphasis | без зайвого repaint понад наявний repaintHighlight | integ | AC6 |
| 8 | auto-highlight не регресує | hover related | staffDimmedIds лишається paint-time похідним (не поле store) | unit | AC5 |

## 7. Конституція (inline): TDD; KISS (state-holder без зайвої subscribe-машинерії); WASM незмінний; публічний API
НЕ змінюється (internal рефактор); Pocock-TS. **PASS.** Поріг: нижче (рефактор, без нової межі) → легкий шлях.
