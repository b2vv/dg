# T77-M07 — Тести, що не можуть впасти (§4)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** §4  
**Пріоритет:** P1 · **Статус:** ✅

## Scope

| Тест | Баг, який зеленіє |
|------|-------------------|
| `export.test.ts` PNG | 8-byte Blob |
| `layout.rs` siblings | gap 240× через `>=` |
| `contour` G6 flood | `!is_empty` на зламаному вході |
| `incremental.test.ts` | fingerprint без foreign cells |
| `worker-bridge` echo | mock echo path |
| `pngExport` jsdom sniff | прод-код нюхає test runner |

## Acceptance

- [ ] Кожен рядок вище або виправлений асерт, або позначений `it.fails` / видалений з green path.
- [ ] Немає `navigator.userAgent.includes('jsdom')` у прод-експорті (inject seam / DI).
