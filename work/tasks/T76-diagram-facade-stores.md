# T76 — Diagram facade stores (розбір god-object)

**Пріоритет:** P1  
**Статус:** SelectionStore ✅ · ViewStateStore ✅ · DataStore ✅  
**Базис:** [REVIEW-dg-805efee-architecture.md](../tech-debt/REVIEW-dg-805efee-architecture.md) **D4**

---

## Мета

Рознести стан `OrgHierarchyDiagram` (`index.ts`) на stores; фасад лише делегує.

| Store | Відповідальність | Статус |
|-------|------------------|--------|
| `SelectionStore` | selected ids, select/toggle/clear | ✅ `state/SelectionStore.ts` |
| `ViewStateStore` | theme, LOD, staff focus, expand sets | ✅ `state/ViewStateStore.ts` |
| `DataStore` | `DiagramData` (via private get/set `data`) | ✅ `state/DataStore.ts` |

Публічний API діаграми **не** ламати (методи-фасади лишаються).

## Не робити

- Не змішувати з D1/D2/D3 в одному дифі.
- Не переносити layout/WASM у stores.

## Verify

`npm run typecheck` · `npm test` · існуючі interaction e2e зелені.
