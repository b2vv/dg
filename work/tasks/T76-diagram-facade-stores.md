# T76 — Diagram facade stores (розбір god-object)

**Пріоритет:** P1  
**Статус:** planned · **після T75**  
**Базис:** [REVIEW-dg-805efee-architecture.md](../tech-debt/REVIEW-dg-805efee-architecture.md) **D4**

---

## Мета

Рознести стан `OrgHierarchyDiagram` (`index.ts` ~1.4k LOC) на stores; фасад лише делегує.

| Store | Відповідальність |
|-------|------------------|
| `DataStore` | `DiagramData`, setData / merge |
| `SelectionStore` | selected ids, select/toggle/clear (чисті fn з `interaction/selection.ts`) |
| `ViewStateStore` | theme, LOD, staff focus, expand sets |

Публічний API діаграми **не** ламати (методи-фасади лишаються).

## Не робити

- Не змішувати з D1/D2/D3 в одному дифі.
- Не переносити layout/WASM у stores.

## Verify

`npm run typecheck` · `npm test` · існуючі interaction e2e зелені.
