# T77-M08 — validate O(n²) + search scale (§5)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** §5  
**Пріоритет:** P1 · **Статус:** ✅  
**Файли:** `orgTree.ts`, `org_tree.rs`, `searchIndex.ts`

## Acceptance

- [x] `byId` будується один раз на виклик `validateOrgHierarchy`; tri-color DFS із `done` дає O(n).
- [x] Search: `candidatesFor` повертає `null` (→ `[]`), коли біграма/символ відсутні; top-k через `TopKCollector`, повного сортування немає.
- [x] `layout/orgTreeValidatePerf.test.ts` — 20k ланцюгом і 20k сиблінгами < 500 ms, цикл у глибині все одно ловиться.
