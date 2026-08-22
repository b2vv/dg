# T65 — Ліс / кілька коренів / непідвʼязані посади (B9)

**Пріоритет:** P1  
**Статус:** planned  
**Parity:** B9  
**Джерело:** модалка «Непідвʼязані посади» у прод-продукті

---

## Вимога

Показати на полотні **відв’язані посади** (і/або кілька коренів ієрархії) — окремими коренями, не обов’язково під єдиним head.

## Стан у `dg`

| Компонент | Стан |
|-----------|------|
| `packages/core/src/hierarchy.rs` | `roots.len() != 1` → **помилка** |
| `orgsToSingleRootTree` / `__virtual_root__` | **експортовано**, у staff/org pipeline **майже не викликається** |
| Staff layout | очікує head / current org |

Тобто інфраструктура «звести до одного кореня» частково є; **ліс як first-class** — ні.

## Аргументація

1. Модалка непідвʼязаних — реальний продуктовий сценарій (не GoJS-обхід).
2. Scope: або (A) wire virtual root + pack «острівців», або (B) послабити WASM validate для forest + layout multi-root.
3. Не плутати з B8c (групи орг) — це позиції/дерева без parent.

## Пропозиція

**Варіант A (швидший, рекомендований для v1):**

1. Mapper/API: `detachMode: 'virtual-root' | 'forest'`.
2. Перед layout: `orgsToSingleRootTree` / аналог для positions forest.
3. Virtual root **не рендерити** (invisible), діти — видимі корені зліва-направо (простий pack).

**Варіант B:**

- Змінити `hierarchy.rs` приймати N roots; layout staff для кожного кореня + horizontal packing.

## Acceptance

- [ ] Набір позицій без єдиного parent не падає з помилкою
- [ ] Усі «острівці» видимі після `fitView`
- [ ] Unit: 0 roots / 1 root / 3 roots
- [ ] Demo або fixture «unassigned positions»

## Не входить

- UI модалки (лишається в host)
- Рекурсія DiagramGroup (T61)

## Verify

```bash
npm test
# Fixture: 3 roots → layout width > 0, no throw
```
