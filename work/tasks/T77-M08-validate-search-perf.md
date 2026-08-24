# T77-M08 — validate O(n²) + search scale (§5)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** §5  
**Пріоритет:** P1 · **Статус:** ✅  
**Файли:** `orgTree.ts`, `org_tree.rs`, `searchIndex.ts`

## Acceptance

- [ ] `byId` будується один раз на validate (TS + Rust).
- [ ] Search: early `[]` коли char відсутній у індексі; не сортувати всі hits перед `limit` (top-k / heap).
- [ ] Bench або тест на 4k orgs без секундного validate.
