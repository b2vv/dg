# T77-M04 — appendData / mergePartial dedupe (A6)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** A6  
**Пріоритет:** P0 · **Статус:** ✅  
**Файли:** `packages/sdk/src/index.ts` (`mergePartial`, `appendData`)

## Проблема

`mergePartial` конкатенує масиви → повторний chunk → `Duplicate organization id` → діаграма зникає.

## Acceptance

- [x] Merge by id (patch wins) — `data/mergeData.ts` (`mergePartial` / `mergeById` / `mergeByKey`; винесено з `index.ts` у T82).
- [x] Повторний chunk — no-throw.
- [x] Unit: `OrgHierarchyDiagram.interactions.test.ts` — «appendData dedupes by id on repeat chunk (A6)» + append без мапера кидає.
