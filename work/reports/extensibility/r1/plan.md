# R1 — plan: Pixi hover паритет (far-LOD акцент)

**Статус:** plan. Гілка `feat/extensibility`. Spec: [`spec.md`](./spec.md). Placement: `packages/sdk` (рендер, TS).
GATE-1: роадмап-рішення (R1 named, підхід визначено). Конституція: TDD, KISS, межа WASM незмінна, Pocock-TS.

## 1. Архітектура (одне речення) — **рев.2 DIM-ONLY (GATE-2 B2)**
R1 **dim-only**: прибрати ЛИШЕ виняток `view.lod !== 'far'` у `DiagramRenderer.paintInteraction` (`:254`), тож на far
непов'язані ноди приглушуються (alpha), а hovered лишається яскравою за контрастом — усе через наявний D1-store і
paint-шлях, який **уже гейтований** на `interactionSource` (opt-in). `setHovered` у PersonNode/OrganizationNode
**НЕ чіпати**: вона спільна з legacy-не-opt-in-шляхом (вузли кличуть її напряму на pointerover без source), тож
far-ring там протік би в не-opt-in хост і зламав AC3. hoverRing на far не додаємо (spec Open закрито: dim-only).

## 2. Reuse-first
| Що | Перевикористовуємо | Нове |
|---|---|---|
| hovered-джерело | D1 `InteractionStore` + `setInteractionSource` (opt-in) | — |
| related-набір | `relatedStaffIds`/`staffDimmedIds` (SDK, D1-C) | — |
| per-node pointer | наявний `pointerover`/`bindInteraction` (ноди хітабельні й на far) | — |
| dim-застосування | `paintInteraction` (D1-C) — розширити на far | гілка far-акценту |

## 3. Нарізка (неперетинні файли)
| ID | Файли | Що | Приймання |
|---|---|---|---|
| R1-A | `render/DiagramRenderer.ts` + його interaction-тест | **dim-only:** прибрати ЛИШЕ виняток `view.lod !== 'far'` (`:254`); на far непов'язані dim (alpha), hovered яскрава; selection>hover і на far. `setHovered`/PersonNode/OrganizationNode **НЕ чіпати** (B2). far-fallback ліній — наявний `interactionLines` (`:257/:900`, не `lastStaffChrome`, що null на far) | AC1,AC2,AC4,AC5 |

(Одна задача; вузька. Файли звужено до DiagramRenderer.ts — PersonNode/OrganizationNode НЕ змінюються, dim-only.)

**GATE-2 (B1) — існуючий тест, що перевертається:** `DiagramRenderer.interaction.test.ts:186-206` («failure boundary:
LOD crossing…») зараз асертить far persons alpha `[1,1,1]` (`:199`). Після зняття `:254` far-hover (hovered=a, lines
`[a→b]`) дає related `{a,b}`, dimmed `{c}` → **`[1,1,0.45]`** — це навмисний AC4-контракт на far. R1-A **переписує цей
тест** із новими far-значеннями (не регресія). Плюс додати тест **null-source far-hover = 0 dim** (реальний AC3).

## 4. Side effects
- Поведінка: far-LOD hover тепер підсвічує related (лише під opt-in — D1-гейт). Без opt-in — 0 змін (AC3).
- Emphasis недоторканий (AC4). Selection-пріоритет і на far.
- Перф: лише repaint акценту (без rebuild); 0 у спокої (AC5).

## 5. Migration / Rollback
- Адитивно; під D1-opt-in. Rollback = revert R1-A; far-hover знову no-op. Хост без підписки — не зачеплений.

## 6. Acceptance-table
| # | Сценарій | Дія | Видимий результат | Рівень | AC |
|---|---|---|---|---|---|
| 1 | far-hover related | opt-in; far-зум; hover ноди A | A+повʼязані акцентовані, непов'язані dim (alpha), як near/mid | integ | AC1 |
| 2 | LOD-cross зі hovered | hovered=A; near→far | акцент на A не зникає на far | integ | AC2 |
| 3 | без opt-in | far-hover без subscribe | 0 візуальних змін, 0 repaint від hover | integ | AC3 |
| 4 | selection>hover на far | A вибрано й hovered, far | selection-акцент виграє; related-dim рахується | integ | AC4 |
| 5 | спокій | після hover, far | 0 rAF/repaint | integ | AC5 |
| 6 | emphasis цілий | found/highlight активні, far-hover | found/highlight незмінні | integ | AC4 |
| 7 | 0-related far (N2) | far; hover ноди без ліній | related={hovered}, dim усіх інших видимих; без винятків | integ | AC1 |
| 8 | unselected hovered near→far (N5) | hovered=A (НЕ вибрано); near→far | related-dim на A зберігається на far (окремо від selected-кейсу #2/legacy :186) | integ | AC2 |
| 3b | null-source far guard (N3/B1) | БЕЗ opt-in; far-hover | paintInteraction не викликано; persons alpha [1,1,1]; 0 dim | integ | AC3 |

## 7. Конституція (inline): TDD RED→GREEN; KISS (розширення D1, без нових абстракцій); WASM незмінний; Pocock-TS;
публічного API не додає (внутрішній рендер) — USAGE не чіпає. **PASS.**
