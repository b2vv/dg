claude-opus-4-8

# R6 review-after T-A0 (dg37) — незалежний крос-модель рев'юер

ДАЛІ: читаю git diff (staff_routes.rs, staff_router.rs), tasks-zigzag.md T-A0, _impl-TA0-dg37.md — щоб зрозуміти заявлену зміну перед перевіркою коду.

ФАКТ: diff-скоуп — лише staff_router.rs (is_internal → pub(crate), +форматування сигнатури) і staff_routes.rs (true_turns/turn_limit/turn_totals + 4 тести + рядок A*:). Probe відсутній у diff і в git status. route_stats (staff_router.rs:158) НЕ зачеплено.
ФАКТ: true_turns (696-708) — cross-продукт px*dy!=py*dx (поворот) АБО dot<0 (розворот); нульові відрізки skip через continue (prev не скидається). f32→f64 точні, cross/dot без похибки на ортогональних A*-маршрутах. Крайні 0/1/2/колінеар/дублікати/розворот — коректні.
ФАКТ: turn_limit (710-716) — is_internal → 2, інакше 4. is_internal pub(crate), НЕ реекспортнуто в lib.rs/sdk → крайовий, не публічний leak. Класифікація за парою DeptPart=(String,Option<u32>); same dept+різна part → не internal → 4 (коректно).
ФАКТ: excess (723-731) — Σ max(0, turns−limit) лише коли marked!=Some(true); marked=(failed||intrusion>0) → виключає failed і best-effort. saturating_sub без underflow. total рахується по ВСІХ (для bends/turns).
ФАКТ: bends більше ніде числово не асертиться (єдиний "bends" у тесті — рядок-повідомлення staff_router.rs:2132). Перемикання bends→true_turns ЖОДЕН тест не ламає.
ФАКТ: тести дискримінаційні (звірено логікою): old-bends (points.len()-2 дав би 2≠0), zero-skip (без skip дало б 1≠2), reversal (без dot<0 → 0≠1), limit-swap, marked-filter, saturating — кожен має рядок, що впаде. Збігається з mutation-логом автора.
ФАКТ: cross НЕ приховано/змінено — diag друкує stats.crossings з незміненого route_stats; cross=9 структурно поза скоупом T-A0.
ГЕЙТИ (packages/core, прогнав сам): cargo test 193 passed/0 failed; cargo clippy --all-targets -D warnings rc=0 (реальний recompile після touch); cargo fmt --check rc=0.
NIT (косметика, non-blocking): рядок A*: друкує bends= і turns= тим самим значенням (bends тепер і є true_turns). Свідомий backward-compat вибір автора; дублювання злегка заплутує HUD.

ВЕРДИКТ: GREEN-WITH-NITS. Готово до коміту. Блокерів немає; єдина знахідка — косметичний дубль bends=/turns=.
