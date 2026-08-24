# T76 — Diagram facade stores (розбір god-object)

**Пріоритет:** P1  
**Статус:** ✅ done  
**Базис:** [REVIEW-dg-805efee-architecture.md](../tech-debt/REVIEW-dg-805efee-architecture.md) **D4**  
**Review:** [REVIEW-t74-t76-pocock-gof.md](./REVIEW-t74-t76-pocock-gof.md)

---

## Результат

| Store | Файл | Роль (GoF / SOLID) |
|-------|------|---------------------|
| `SelectionStore` | `state/SelectionStore.ts` | SRP — selection set; Observer via `onChange` |
| `ViewStateStore` | `state/ViewStateStore.ts` | SRP — theme/LOD/staff expand |
| `DataStore` | `state/DataStore.ts` | SRP — `DiagramData`; facade `get/set data` accessor |

`OrgHierarchyDiagram` лишається **Facade** (GoF) для host API; стан делеговано.

## Verify

`npm run typecheck` · `npm test` · store unit tests
