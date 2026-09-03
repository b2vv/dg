# T67 — Мультивибір вузлів (D2)

**Пріоритет:** P2  
**Статус:** Phase 1 done · bulk-меню + host bulk bar (2026-08-25)  
**Parity:** D2  
**Узгодження:** [T73](../archive/tasks-2026-09-02.md)  
**Уточнення продукту:** вимога з **наступних задач** (не блокер поточного cutover)  
**Увага:** у GoJS-проді підказка обіцяє «Shift або рамка», рамки немає — не копіювати брехню UI

---

## Вимога

Вибрати **кілька** вузлів (org / position / person) для масових дій: підпорядкувати, видалити, export selection, тощо.

## Стан у `dg`

```ts
// OrgHierarchyDiagram (T67 Phase 1)
selections: NodeRef[]                 // internal set
getSelection(): NodeRef | null        // primary / first (compat)
getSelections(): readonly NodeRef[]
selectMany(nodes) / toggleSelection(node) / clearSelection()
onSelectionChange?(nodes: NodeRef[]): void  // fires with full set
// gestures: meta/ctrl/shift+click toggle; plain click replace; canvas clear
// marquee — відсутнє (не Phase 1)
```

`selectNode` у `interaction/selection.ts` — replace-one semantics (compat). Set helpers: `replaceSelection` / `toggleInSelection` / `selectMany`.

## Аргументація пріоритету P2

1. Продукт: «D2 — вимога з наступних задач» → планувати API зараз, імплементувати після P0/P1 + T70p2.
2. Не викреслювати з 🔴 (лінза «мертве» не застосовується — це майбутня вимога).
3. Не блокує T64/T66/T70.

## Phase 1 = Set selection API only (agreed)

**Так:** programmatic Set + modifier click. **Ні (Phase 1):** marquee / dragSelecting.

```ts
// Additive preferred (avoid breaking hosts on getSelection scalar)
getSelections(): readonly NodeRef[]
selectMany(nodes: NodeRef[]): Promise<void>
toggleSelection(node: NodeRef): Promise<void>
clearSelection(): Promise<void>
// getSelection(): NodeRef | null  — keep = primary / first selected (compat)

onSelectionChange?(nodes: NodeRef[]): void  // already exists

// gestures (Phase 1)
// - meta/ctrl/shift+click toggle membership
// - plain click → single replace
// - canvas click → clear
// - shift+click range: optional later (shift currently = toggle, same as ctrl)
// marquee: NOT Phase 1 — only if product explicitly orders Phase 2
```

- Context menu: bulk items коли `getSelections().length > 1` — **зроблено** (`bulkContextMenuItems`; org-only набір додає `bulk-expand` / `bulk-collapse`, будь-який — `bulk-copy-ids` / `bulk-clear`). Пункти зʼявляються лише коли клікнутий вузол входить у виділення.
- Promote overlay: multi near-selection — later.
- Тести: toggle, clear on canvas click, optional max selection cap.

## Acceptance (Phase 1)

- [x] Ctrl/Cmd+**Shift**+click додає/знімає з вибору (працює однаково для org / position / person — один шлях `handleNodeSelect`)
- [x] Bulk-меню на правий клік по вузлу з виділення
- [x] Host-демо: bulk bar (`data-testid="bulk-bar"`) з `N selected` + Collapse (для org-набору) / Copy ids / Clear
- [x] `runContextMenuAction` виконує `bulk-*` (не мертві пункти): expand/collapse по виділенню одним рендером через новий `setOrgsCollapsed`, copy ids, clear
- [x] `getSelections()` / docs узгоджено; scalar `getSelection()` не ламає hosts
- [x] Canvas click очищає multi
- [x] Unit success/failure
- [x] Host demo: status показує N selected
- [x] **Не** обіцяти marquee в UI

## Не входить (Phase 1)

- Рамкове виділення (окремий follow-up, **лише** якщо продукт підтвердить)
- Bulk reparent UI (лише callback/patch)
- Marquee-виділення (Phase 2, лише за запитом продукту)

## Verify

```bash
npm test
# Manual: ctrl+click 3 cards → getSelections().length === 3
```
