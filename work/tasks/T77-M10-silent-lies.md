# T77-M10 — Тихі неправди (§3)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** §3  
**Пріоритет:** P2 · **Статус:** ✅

## Scope

- Export honesty — ✅ PNG Pixi extract throws (no `'Export placeholder'`); PDF without Pixi throws (no gray page); org-only SVG paints org cards; multi-org without `currentOrgId` exports the full org layout, not one staff tree
- Дві дефініції `collapsed` — ✅ unified + `collapsedMatrixOnly` tests
- Promote multi-id → typed `kind:id` keys — ✅ one visual per selection; no personId box alias
- Fillet formula invert — ✅ trim = `r · tan(φ/2)` + octagon unit test
- Search NFC — ✅ `toLowerCase().normalize('NFC')` + tests
- NaN/`is_finite` на layout межі — ✅ Rust `resolve_layout_metric` / `LayoutOptions::validate` + TS `assertOrgLayoutMetrics` (width/height > 0)
- `shiftPositionBlock` false positives — ✅ `positionIds` only ids actually shifted (`gridCell` present)
- Висячий `parentOrgId` — deferred (Rust accepts, TS drops branch, orgBlockLayout re-parents)

## Acceptance

- [x] Чекліст вище з ✅/won't-fix + тест на кожен ✅ (hanging `parentOrgId` — deferred).
