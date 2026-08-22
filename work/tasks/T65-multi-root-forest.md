# T65 — Непідпорядкована посада: розміщення (B9)

**Пріоритет:** P2  
**Статус:** planned  
**Parity:** B9 🟡 ~65  
**Блокує cutover:** **Ні**  
**Джерело:** модалка «Непідвʼязані посади»

---

## Вимога

Показати посаду **без керівника** (з модалки) **без вигаданого підпорядкування** на ребрі.

## Уточнення parity ред. 2.1

| Аспект | `dg` | % |
|--------|------|---|
| Ребро до вигаданого parent | Немає — edges лише з `reportLines` | ✅ |
| Позиціонування | `layoutTreeBlock` ре-parent orphan **під head** лише щоб WASM мав unique root | 🟡 |
| `hierarchy.rs` single-root error | На **org**-шляху `build_from_flat`, не на основному staff path | не той gap |

Тобто вимога «без фейкової лінії» **вже виконується**. Різниця з бажаним UX — **своя зона / збоку від дерева**, а не в потоці під head.

GoJS-обхід «сирота = окремий корінь TreeLayout» → §1 (зникає).

## Аргументація пріоритету P2

1. Не блокер 4245 / cutover.
2. Малий візуальний/UX polish після P0.
3. Не плутати з T61 (групи орг) і з «полагодити hierarchy.rs» як обов’язковий крок.

## Пропозиція

1. Flag `position.detached?: true` або membership у «unassigned» bucket.
2. Layout: pack detached у окрему колонку / бічну зону (поруч із T64 zone chrome).
3. Virtual root для WASM лишається внутрішнім — **не рендерити** і не малювати ребра на нього.

## Acceptance

- [ ] Detached position без reportLine → немає лінії до head
- [ ] Візуально не в «хребті» підлеглих head (збоку / окрема зона)
- [ ] Unit + demo fixture модалки

## Не входить

- UI модалки (host)
- Повний multi-root org forest (окремо, якщо знадобиться)

## Verify

```bash
npm test
# Fixture: 1 head + 2 detached → no fake edges; detached not under head column
```
