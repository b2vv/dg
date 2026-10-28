# Бриф для codex — R4 зрізи 2-4 (композиція staff-геометрії, Rust)

Ти — Coder. Мова коментарів/нот — українська. Гілка `feat/t126-staff-rust-geometry` (НЕ створюй нову).
**НЕ комітити, НЕ пушити.** Working-log нижче — обов'язковий.

## РОБОЧИЙ ФАЙЛ (append після КОЖНОГО кроку, не rewrite)
`work/reports/staff-rust-geometry/_r4-codex-worklog.md`. Перший запис — рядок `ДАЛІ:` до першого
інструменту. Далі ФАКТ / РІШЕННЯ / ДАЛІ / ПИТАННЯ. Якщо формула неясна чи не ґрунтується в оракулі —
**СТОП, напиши ПИТАННЯ у worklog, не вигадуй геометрію.**

## Контекст
T126 переносить staff-геометрію з TS у Rust. Оракул (джерело правди поведінки) —
`packages/sdk/src/layout/staff/canvasLayout.ts::layoutStaffCanvas`. Уже зроблено зріз 1:
`packages/core/src/staff_compose.rs::compose_tiers` (стек staff-block ярусів + namespaces).
Дефолт-опції (`types.ts`): margin=32, tier_gap=36, zone_label_band=0 (у тестах подавай ненульовий),
node_height=156, org_card_height=64, org_card_width=200, horizontal_gap=20, vertical_gap=28.

## МЕЖА R4/R5 (НЕ порушувати)
`StaffNamespace.x/width` — завжди **0.0** у R4. Межі обгорток (x/width) рахує R5 (єдине джерело для
live+SVG). Не рахуй x/width ніде в R4.

## TDD (обов'язково, кожен зріз)
Червоний тест ПЕРШИМ (stub або відсутня логіка → падіння на асерті), тоді зелений. У коментарі тесту —
посилання на рядки оракула `canvasLayout.ts:NN`. Гейти після КОЖНОГО зрізу, БЕЗ pipe (pipe ховає exit):
`cargo test --manifest-path packages/core/Cargo.toml staff_compose`
`cargo clippy --manifest-path packages/core/Cargo.toml --all-targets -- -D warnings`
`cargo fmt --manifest-path packages/core/Cargo.toml --check`

---

## ЗРІЗ 2 — вісь (перецентрування ярусу-1). Оракул canvasLayout.ts:133-155
1. У `compose_tiers` стампуй `tier = block.tier` на кожну розкладену ноду (оракул: canvasLayout ставить
   `tier: 1 as const` / `tier: 2`). Онови тест зрізу 1, щоб перевіряв `node.tier == block.tier`.
2. Додай `head_id: Option<String>` у `TierBlock`.
3. Після стеку: знайди ноду керівної голови (tier==1 && id == head_id ярусу-1) і поточної голови
   (tier==2 && id == head_id ярусу-2). Якщо обидві є:
   `dx = cur_head.x + cur_head.width/2 - (mgr_head.x + mgr_head.width/2)`; якщо `dx > 0` — додай `dx`
   до `x` УСІХ нод із tier==1. Якщо `dx <= 0` — нічого (лівоякірне розміщення лишається).
4. Тести: (а) вузький ярус-1 ліворуч від широкої голови ярусу-2 → ярус-1 зсунувся на dx; (б) випадок
   dx<=0 → без зсуву.

## ЗРІЗ 3 — ярус-3 org-cards. Оракул canvasLayout.ts:157-232
УВАГА: `StaffOrgCardGeo` несе ЛИШЕ геометрію (org_id,x,y,width,height) — name/positionCount/expanded
живуть у TS, НЕ емітуй їх.
1. Нова функція `compose_org_cards`. Входи: `card_y: f32` (= content_bottom після ярусів), список дітей,
   кожна = `OrgCardInput { org_id: String, expanded_block: Option<ExpandedBlock> }`, де
   `ExpandedBlock { members: Vec<StaffNodeGeo> (локальні коорд), width: f32, height: f32 }`.
   Опції: margin, horizontal_gap, vertical_gap, org_card_width, org_card_height.
2. Логіка (оракул):
   - `card_x = margin`; `tier3_content_height = 0`; `nodes` (ярус-3 expand), `cards`, можливо namespace.
   - для кожної дитини: `column_width = org_card_width`, `column_height = org_card_height`.
     Якщо `expanded_block` є: `origin_x = card_x`, `origin_y = card_y + org_card_height + vertical_gap`;
     додай members зі зсувом (x+origin_x, y+origin_y), `tier = 3`; `column_width = max(org_card_width,
     block.width)`; `column_height = org_card_height + (block.height>0 ? vertical_gap + block.height : 0)`.
   - `cards.push(StaffOrgCardGeo{ org_id, x: card_x, y: card_y, width: org_card_width,
     height: org_card_height })`; `card_x += column_width + horizontal_gap`;
     `tier3_content_height = max(tier3_content_height, column_height)`.
   - після циклу: якщо дітей >0: `t3height = tier3_content_height + margin`; namespace
     `{ tier:3, kind:"org-cards", organization_id: None, x:0, y:card_y, width:0, height:t3height }`;
     `content_bottom = card_y + t3height + margin`. Якщо дітей 0: namespace нема, content_bottom=card_y.
   - поверни { nodes, cards, namespace: Option, content_bottom }.
3. Тести: (а) 2 дитини, 1 expanded → картки на правильних x, expand-ноди з tier==3 під карткою, height
   смуги = max_column + margin; (б) 0 дітей → ні картки, ні смуги.

## ЗРІЗ 4 — розміри канви. Оракул canvasLayout.ts:262-278
1. Функція `canvas_dimensions`. Входи: усі ноди (world), усі картки, `tier2_width: f32`, margin.
   `width = max(margin*2, max(node.x+node.width), max(card.x+card.width), tier2_width) + margin`.
   `height = content_bottom` (фінальний cursor).
2. Тест: ноди+картки різної правизни + tier2_width → правильні width/height (оракул ±0, точні f32).

---
## Після всіх трьох
Онови `work/reports/staff-rust-geometry/_r4-impl-dg21.md` (журнал: зрізи 2-4 готові, формули, гейти).
Фінальна відповідь = стислий переказ worklog: що зроблено, стан гейтів, будь-які ПИТАННЯ.
