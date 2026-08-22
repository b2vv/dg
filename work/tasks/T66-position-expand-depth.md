# T66 — Розкриття посади + початкова глибина (C2 / C3)

**Пріоритет:** P0  
**Статус:** done  
**Parity:** C2, C3  
**Джерело:** вимоги **замовника** (підтверджено в parity-дискусії)  
**Блокує:** cutover / здача staff UX vs GoJS

---

## Вимога

| # | Що | Зараз у `dg` |
|---|-----|--------------|
| **C2** | Розкрити/згорнути **окрему посаду** (підлеглі по `reportLines`) | 🔴 лише `toggleStaffOrgExpand(orgId)` — expand **tier-3 org card**, `maxSimultaneousExpands` ≈ 1 |
| **C3** | Початкова глибина розкриття (легасі `countFirstLoad` / «N рівнів») | 🟡 тільки `collapsed` на org у мапері; немає `expandToDepth(n)` |

Афорданс на картці (C5) для org вже є (`+/−`, `▼/▲`) — для **position** expander відсутній або не той семантики.

## Аргументація

1. У GoJS-проді користувач розкриває гілку посад, не лише org-картку підлеглої організації.
2. Це **не** GoJS-обхід і **не** «немає в обох» — замовник підтвердив.
3. Без C2 strangler `modules/positions` не закриє паритет взаємодії.
4. C3 потрібен для першого екрану великих штаток (не показувати 2M розгорнутим).

## Пропозиція API

```ts
// DiagramPosition
expanded?: boolean; // default false — діти по reportLines сховані

// OrgHierarchyDiagram
await diagram.togglePositionExpand(positionId: string): Promise<boolean>
await diagram.expandToDepth(options: {
  organizationId?: string;
  depth: number; // 0 = лише head / roots visible
}): Promise<void>
await diagram.collapsePositionSubtree(positionId: string): Promise<void>
```

### Layout / render

- Staff layout: при `expanded !== true` не класти descendant positions (або zero-size / skip) під цим вузлом; edges до hidden — не малювати.
- PersonNode chrome: `+/−` або `▼/▲` якщо є діти в `reportLines`.
- Ліміт одночасних expands: конфіг `staffLayout.maxExpandedPositions` (замість/поруч org cap).

### Mapper

- Початковий стан: BE/mapper виставляє `expanded` або викликає `expandToDepth` після `setData` (заміна `countFirstLoad`).

## Acceptance

- [x] Expand/collapse **position** показує/ховає підлеглих по admin report lines
- [x] `expandToDepth(n)` відтворює сценарій першого завантаження
- [x] Viewport: після expand — `panTo` / не «зникає» дерево (урок T53)
- [x] Unit: success + failure (немає дітей; unknown id)
- [x] Demo: staff-tree — expander на позиції, не лише на org card

## Не входить

- Multi-select bulk expand (T67)
- Org tree `expandOrg` (вже є)
- Assistants / LastParents

## Verify

```bash
npm test && npm run typecheck
# Manual: розкрити посаду з 3+ дітьми → діти видимі; collapse → зникають
# expandToDepth(1) → лише перший рівень під head
```

## Оцінка інвазивності

**Висока для staff path:** торкається `layout/staff/*`, `PersonNode` chrome, `DiagramRenderer`, data model. Робити TDD за `work/TDD.md`. Не змішувати з T64 в одному PR — різні ризики.
