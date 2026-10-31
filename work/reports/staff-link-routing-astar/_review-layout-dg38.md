claude-opus-4-8

# R6 review-after (крос-модель Claude) — LAYOUT-слайс T128 (dg38)

ДАЛІ: читаю diff staff_layout.rs + multi_source_parent.rs, потім контекст-файли (critic/probe/impl), далі прогони cargo test/clippy/fmt.

## ФАКТ — коректність правила (staff_layout.rs:597-602, 799-808)
- decl_index зібрано з `positions.iter().enumerate()` на :598-602 — ДО comparePositions-сорту (:607-623). Ключ = оригінальний індекс у POS-слайсі. ПРАВИЛЬНО — це declaration order, не post-sort.
- root-вибір :799-805: `.filter(external-parent).min_by_key((decl_index[id], id))`. Дає найраніше оголошений external-parent кандидат, tie-break id. Відповідає правилу критика Q1.
- Паніка decl_index[m.id]: БЕЗПЕЧНО. members ← buckets ← sorted ← positions.iter(); кожен member.id походить з positions ⇒ є ключем decl_index. unwrap_or(&members[0]) покриває «нема кандидатів» (members непорожній, :769-771).
- pt2 критика (root-детект за ПЕРВИННИМ parent, не last-wins) СВІДОМО не впроваджено — рішення власника (impl §Перед кодом). parents лишається last-wins admin_parent_map. Для ana це не впливає: ah передує da в POS.
- head_override (:809-814) збережено як борг-гак, бере перевагу коли заданий і member. OK.

## ФАКТ — гейти (прогони)
- `cargo test` (packages/core): 198 unit + 8 integration = **206 passed, 0 failed, 0 ignored**. Збіг із заявою автора.
- `cargo clippy --all-targets -- -D warnings`: чисто, 0 warnings.
- `cargo fmt --check`: exit 0.

## ФАКТ — дискримінаційність тестів
- unit `tree_block_head_uses_declaration_order_not_parent_id`: звірено з admin_parent_map (:113-120, фільтр :117 обидва кінці в positions). z-parent/a-parent НЕ в positions ⇒ edges дропнуто ⇒ z-head/a-head мають None-parent (обидва кандидати-root). Pre-swap: comparePositions tie-break id ставить a-head перший ⇒ СТАРЕ .find→a-head; НОВЕ min(decl_index)→z-head. Асерт z-head.y<a-head.y РОЗРІЗНЯЄ. Swap(1,2) переставляє слайс (не comparePositions, не id, не order=None) ⇒ head→a-head. Доводить: input саме declaration/slice order. НЕ тавтологія.
  - NIT (non-blocking): коментар тесту каже «comparePositions puts parent a-parent first» — a-parent насправді дропнуто, розрізнення працює через id-tie-break None-parent, не через зовнішній parent. Механізм інший, але тест валідний і дискримінаційний.
- integration baseline 6→1: новий тест асертить cross=1, ah.y<da.y/bi.y (head=ah геометрично), frame(ana).y ≥ низ frame(fin), asst (4438,280) незмінний, повна серіалізаційна рівність двох прогонів (детермінізм). Probe (через head_override, окрема /tmp-копія) незалежно відтворив 6→1 + author reverse-mutation (.find) дав 6. Два незалежні шляхи до тієї ж цифри — не тавтологія.

## ФАКТ — регресія
- pack_tree_block викликається ЛИШЕ під `if geom.tree_block` (:659). Flat-шлях (:672+) у дифі не торкнуто ⇒ байт-незмінний. decl_index рахується безумовно (:598) — для flat-шляху це мертва робота (дешево, нешкідливо, NIT).
- S1/asst: integration асертить asst center-x=4438, y=280 — probe-паритет збережено.
- stamp dept_id / cycle-guard / attach_x / singleton / router-membership — у дифі не торкнуті; 5 оригінальних tree-block unit + singleton/S1 тести зелені (у складі 206).
- Детермінізм: min_by_key над Vec members (не HashMap-iter); decl_index лише lookup. Детерміновано.

## NIT — #[allow(clippy::too_many_arguments)] на pack_tree_block (8 арг). Локальний, прийнятний за стилем файлу; не блокуючий.

РІШЕННЯ: GREEN-WITH-NITS. Головне застереження (cross=1 не 0) — очікуване й задокументоване, НЕ дефект. Реальних дефектів (хибна логіка, паніка, прихований регрес, тавтологія, недетермінізм) НЕ знайдено. Два non-blocking нітs: неточний коментар у unit-тесті; decl_index рахується і на flat-шляху. Жоден не блокує.
