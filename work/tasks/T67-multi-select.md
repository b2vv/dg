# T67 — Мультивибір вузлів (D2)

**Пріоритет:** P2  
**Статус:** planned  
**Parity:** D2  
**Уточнення продукту:** вимога з **наступних задач** (не блокер поточного cutover)  
**Увага:** у GoJS-проді підказка обіцяє «Shift або рамка», рамки немає — не копіювати брехню UI

---

## Вимога

Вибрати **кілька** вузлів (org / position / person) для масових дій: підпорядкувати, видалити, export selection, тощо.

## Стан у `dg`

```ts
selection: NodeRef | null  // лише одиничне
// shiftKey / ctrlKey / marquee — відсутні
```

`selectNode` / `onSelectionChange` орієнтовані на один ref.

## Аргументація пріоритету P2

1. Продукт: «D2 — вимога з наступних задач» → планувати API зараз, імплементувати в черзі після P0/P1.
2. Не викреслювати з 🔴 (лінза «мертве» не застосовується — це майбутня вимога).
3. Не блокує T64/T66.

## Пропозиція

```ts
selection: NodeRef[]  // breaking або parallel getSelection()/getSelections()
onSelectionChange?(nodes: NodeRef[]): void

// gestures
// - meta/ctrl+click toggle
// - shift+click range (optional, tree order)
// - marquee: Phase 2 (dragSelecting) — лише якщо продукт підтвердить рамку
```

- Context menu: bulk items коли `selection.length > 1`.
- Promote overlay: near-selection mode для multi — later.
- Тести: toggle, clear on canvas click, max selection cap.

## Acceptance

- [ ] Ctrl/Cmd+click додає/знімає з вибору
- [ ] `getSelection()` / масив узгоджено в API docs
- [ ] Canvas click очищає multi
- [ ] Unit success/failure
- [ ] Host demo: status показує N selected
- [ ] **Не** обіцяти marquee в UI, доки Phase 2 не зроблено

## Не входить (Phase 1)

- Рамкове виділення (окремий follow-up, якщо замовлять)
- Bulk reparent UI (лише callback/patch)

## Verify

```bash
npm test
# Manual: ctrl+click 3 cards → selection length 3
```
