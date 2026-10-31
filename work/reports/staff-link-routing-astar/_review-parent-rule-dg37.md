claude-opus-4-8

ДАЛІ: читаю git diff (9 файлів), спеку _design-parent-rule-dg37.md, нові тести tests/, далі прожену cargo test/clippy/fmt і compute mock3 для підтвердження cross=0.

ФАКТ: прочитано весь Rust-diff, tests/multi_source_parent.rs, fixtures/multi-source-parent.json, TS-diff, спеку, impl-нотатки, probe.

ФАКТ (гейти, прожито самостійно у packages/core):
- cargo test → 197 unit + 7 integration, 0 failed (exit 0). Є singleton_attachment_aligns_with_sibling_department_frame (S1) і всі 7 multi_source_* тестів.
- cargo clippy --all-targets -D warnings → exit 0, 0 попереджень.
- cargo fmt --check → exit 0.
- npm run typecheck (обидва пакети) → exit 0.
- WASM свіжий: strings на org_hierarchy_core_bg.wasm містить "Multi-source parents:" → бінарник перебудовано з поточного джерела (impl-нотатка про «wasm не будувався» стосувалася автора; owner перебудував).

ФАКТ (cross=0 РЕАЛЬНО): тест multi_source_parent_chooses_clean_attachment_deterministically сам обчислює геометрію fixture і міряє route_stats: baseline cross=6, enabled cross=0 (PASS, прожито мною). Переможець: sec=ib (asserted), sec дочірній до dev (frame.y). Комбо за probe = ana=da (parent ceo, baseline) + sec=ib (parent cto/dev), 6 комбінацій (ana×3, sec×2), excess=34 (справжній head-override, не 32 probe). over/card/near/dept=0 (probe-таблиця).

ФАКТ (правило коректне):
- compute_once винесено правильно: порожній override → get→None→unwrap_or(&root_id) → байт-ідентичний дефолт (pack_tree_block:787-793).
- Перебір КОМБІНАЦІЙ: декартів добуток BTreeMap-кандидатів, не по одному (staff_layout.rs:1416-1428).
- Cap ≤12 з guard до множення (heads.len() > 12/count), overflow-безпечний, >cap→fallback baseline (:1402-1409). Тести 16→fallback, 12→eval підтверджують межу.
- Критерій min: (cross, turns, combo), combo=Vec лексикографічно; is_none_or + строге < лишає перший → детермінізм (:1445-1451).
- Переможець на near застосований до mid/far: lod==near reuse, інакше compute_once(input, combo) на оригінальному lod (:1453-1458). Тест selection_is_lod_independent: вузли й diagnostics.last ідентичні near/mid/far.

ФАКТ (дискримінаційність): RED задокументовано (cross=6 без фічі). Головний тест падає без фічі (assert cross=0 vs дефолт 6). turns-пріоритет і лекс-tie перевіряють конкретні diagnostic-рядки, які існують лише з фічею. No-op/guard-тести самі по собі слабкі, але в парі з головним — suite червоний без фічі.

ФАКТ (no-op/golden): absent==false серіалізація рівна; повтор-прогони байт-рівні; default false скрізь (types.rs:484 Option default; RenderConfig types.ts:500 + defaultRenderConfig false). S1 (attachment_lift) лише в pack_tree_block → тільки tree_block-шлях (DEV, default off) → не-tree golden незачеплений.

ФАКТ (S1): attachment_lift:955-973 + place lift/child_top:1006-1019; тест по 3 (padding,gap) включно з gap<padding (36,8) — перевіряє гілку vgap.max(lift). 197/197 S1-тестів зелені.

ФАКТ (TS-обв'язка): tabConfigs mock3 staffMultiSourceParentEval:true → staffLiveGeometry config.staffMultiSourceParentEval===true → buildStaffLayoutInput spread {multiSourceParentEval:true} → Rust input. Дзеркалить treeBlockLayout точно. rust-types.ts регенеровано (multiSourceParentEval?:boolean).

ФАКТ (Clone-not-Copy): Geom тепер Clone (head_override:HashMap). Компіляція clippy/test зелена → усі виклики ок (геом клонується в compute_once:1468).

НИТИ (non-blocking):
- N1 вартість: прапор ON у live near-шляху = до ~7 (mock3) / 12 повних A*-routings на один compute; тест lod_independent ішов 63 с. Усвідомлено дизайном, DEV-тільки. Інтерактивне редагування з прапором було б дорогим — але mock3-порівняльний таб.
- N2 покриття: головний тест асертить лише cross==0, не over/card/near/dept==0 (їх міряв probe зовні, не тест). Дрейф тут гейт не зловить.
- N3 назва тесту evaluates_exactly_twelve_combinations лише перевіряє, що фіча спрацювала на межі (не рахує 12). Межу бракетить пара з cap-тестом.

РІШЕННЯ: GREEN-WITH-NITS. Усі гейти зелені самостійно, cross=0 підтверджено власним прогоном, байт-паритет no-op доведено, WASM свіжий, S1 цілий, TS-обв'язка коректна. turns/excess ростуть (140/34) — очікувана ціна cross-min, не регрес. Готово до коміту (нити не блокуючі).
