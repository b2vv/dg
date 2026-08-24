# T77-M04 — appendData / mergePartial dedupe (A6)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** A6  
**Пріоритет:** P0 · **Статус:** ✅  
**Файли:** `packages/sdk/src/index.ts` (`mergePartial`, `appendData`)

## Проблема

`mergePartial` конкатенує масиви → повторний chunk → `Duplicate organization id` → діаграма зникає.

## Acceptance

- [ ] Merge by id (patch wins) для orgs/persons/positions/depts/groups/reportLines/orgLinks.
- [ ] Повторний той самий chunk — no-throw, діаграма жива.
- [ ] Unit: success (dedupe) + failure (invalid mapper лишається).
