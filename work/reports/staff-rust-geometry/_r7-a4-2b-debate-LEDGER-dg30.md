# LEDGER — дебати 3 варіантів A4.2b parity (dg30)

Запущено 3 / повернуто 3 ✅ (усі повернулись).

| агент | варіант | файл | статус |
|-------|---------|------|--------|
| V1 | Rust=істина, повний rebaseline | _r7-a4-2b-debate-v1-rust-truth-dg30.md | ✅ повернуто — ПРОГРАЄ у чистій формі; лише як післяфіксовий фінал; golden сліпий до перетинів → треба візуальна перевірка |
| V2 | Rust має відтворювати TS → лагодити core | _r7-a4-2b-debate-v2-fix-core-dg30.md | launched |
| V3 | проміжне (баги→фікс, divergence→рішення per-subsystem) | _r7-a4-2b-debate-v3-intermediate-dg30.md | launched |

Спільний факт-ґрунт: `_r7-a4-2b-PARITY-FAILURE-dg30.md` (root-cause), `_r7-a4-2b-diag-routing-dg30.md`, `_r7-a4-2b-diag-layout-dg30.md`.
Синтез — оркестратором (не рубер-стемп), потім власнику.
