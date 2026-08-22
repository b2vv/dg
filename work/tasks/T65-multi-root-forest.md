# T65 — Непідпорядкована посада: розміщення (B9)

**Пріоритет:** P2  
**Статус:** done  
**Parity:** B9 🟡 → placement gap closed (edges were already ✅)  
**Блокує cutover:** **Ні** (підтверджено T73 — лишається non-cutover)  
**Узгодження:** [T73](./T73-remaining-agreements.md)  
**Джерело:** модалка «Непідвʼязані посади»

---

## Вимога

Показати посаду **без керівника** (з модалки) **без вигаданого підпорядкування** на ребрі.

## Уточнення parity ред. 2.1

| Аспект | `dg` | % |
|--------|------|---|
| Ребро до вигаданого parent | Немає — edges лише з `reportLines` | ✅ |
| Позиціонування | Detached roots + admin subtrees pack у **бічну колонку**; WASM unique-root лише всередині attached / кожної detached-компоненти | ✅ |
| `hierarchy.rs` single-root error | На **org**-шляху `build_from_flat`, не на основному staff path | не той gap |

GoJS-обхід «сирота = окремий корінь TreeLayout» → side-column forest (T65).

## Аргументація пріоритету P2

1. Не блокер 4245 / cutover.
2. Малий візуальний/UX polish після P0 / T70 chrome.
3. Не плутати з T61 (групи орг) і з «полагодити hierarchy.rs» як обовʼязковий крок.

## Реалізація

1. Additive `position.detached?: boolean` **або** infer: in-org, не head, без admin parent у `reportLines` (`isDetachedPosition` / `detachedRootIds`).
2. `layoutTreeBlock`: attached forest під head; кожен detached root (+ admin descendants) окремий WASM tree → `packSideColumn` праворуч від head.
3. Virtual re-parent лише defensive всередині однієї компоненти для WASM — **не** малюється; `adminEdges` лише з реальних `reportLines`.
4. T66: `visiblePositions` завжди сіє detached roots (collapse їх не ховає).

## Acceptance

- [x] Detached position без reportLine → немає лінії до head (регресія: уже так для edges)
- [x] Візуально не в «хребті» підлеглих head (збоку / окрема зона)
- [x] Unit + demo fixture (`staffTree` unassigned seats)

## Не входить (non-goals)

- UI модалки (host)
- Повний multi-root org forest / кілька незалежних дерев org як продукт
- Виправлення `hierarchy.rs` single-root як обовʼязковий крок міграції
- T61 group recursion
- Обовʼязковий chrome «detached» у T70 Phase 2 (опційно пізніше; `role: 'detached'` готовий для cue)

## Verify

```bash
npm test -- packages/sdk/src/layout/staff
# Fixture: 1 head + 2 detached → no fake edges; detached not under head column
```
