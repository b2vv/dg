# T65 — Непідпорядкована посада: розміщення (B9)

**Пріоритет:** P2  
**Статус:** planned  
**Parity:** B9 🟡 ~65  
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
| Позиціонування | `orgBlockLayout` / tree path ре-parent orphan **під head** лише щоб WASM мав unique root | 🟡 |
| `hierarchy.rs` single-root error | На **org**-шляху `build_from_flat`, не на основному staff path | не той gap |

Тобто вимога «без фейкової лінії» **вже виконується**. Різниця з бажаним UX — **своя зона / збоку від дерева**, а не в потоці під head.

GoJS-обхід «сирота = окремий корінь TreeLayout» → §1 (зникає).

## Аргументація пріоритету P2

1. Не блокер 4245 / cutover.
2. Малий візуальний/UX polish після P0 / T70 chrome.
3. Не плутати з T61 (групи орг) і з «полагодити hierarchy.rs» як обовʼязковий крок.

## Пропозиція

1. Flag `position.detached?: true` або membership у «unassigned» bucket (additive; ще немає в `types.ts`).
2. Layout: pack detached у окрему колонку / бічну зону (поруч із T64 zone chrome).
3. Virtual root для WASM лишається внутрішнім — **не рендерити** і не малювати ребра на нього.

## Acceptance

- [ ] Detached position без reportLine → немає лінії до head (регресія: уже так для edges)
- [ ] Візуально не в «хребті» підлеглих head (збоку / окрема зона) — **це єдиний gap**
- [ ] Unit + demo fixture модалки

## Не входить (non-goals)

- UI модалки (host)
- Повний multi-root org forest / кілька незалежних дерев org як продукт
- Виправлення `hierarchy.rs` single-root як обовʼязковий крок міграції
- T61 group recursion
- Обовʼязковий chrome «detached» у T70 Phase 2 (опційно пізніше)

## Verify

```bash
npm test
# Fixture: 1 head + 2 detached → no fake edges; detached not under head column
```
