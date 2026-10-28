claude-opus-4-8

# R6-1 незалежне ревʼю (staff_routes.rs) — Dg22-review

ДАЛІ: звірити route_ortho/port проти оракула (probeA/legacy), тести на інформативність, scope, детермінізм, межі.

## ФАКТИ (звірено проти коду)

### Реекспорт
- `packages/core/src/lib.rs:8` `mod staff_routes;` + `:23` `pub use staff_routes::staff_routes;` — коректно.

### Паритет порту/формули (питання 1) — ВІРНО
- Порти `port()` `staff_routes.rs:31-38`: bottom-center=(x+w/2, y+h), top-center=(x+w/2, y).
  Збіг із legacy `staffEdgeGeometry.ts:124,131-132` і probeA `bottomPort/topPort:152-156`.
- corridorY `staff_routes.rs:45` = `(from.y+from.height+to.y)/2`. Точно == legacy midY `=(y1+y2)/2`
  де y1=from.y+from.height, y2=to.y (`staffEdgeGeometry.ts:142`). ТОЧНИЙ паритет.
- Поріг прямої `STRAIGHT_EPS=0.5` `staff_routes.rs:28,47` == legacy `:136` (`<0.5`). Правильно НЕ взято
  probe-поріг 1e-6 (`probeA:163`) — саме цього вимагав критик (MAJOR).
- Елбоу `[a,(ax,corr),(bx,corr),b]` `staff_routes.rs:50-55` == probeA routeOrtho `:164`.
- probe-специфіку `to.y - V_GAP/2` (`probeA:191`) НЕ взято — вірно (критик це заборонив).

### Оракул crossingDetector (питання 2) — ВІРНО по суті, з відхиленням
- `segments_properly_cross` `staff_routes.rs:127-138` — точний порт `crossingDetector.ts:35-42`
  (cross/sign/d1..d4, транзверсаль). EPS=1e-6 замість 1e-9 — доречно для f32, це тест-хелпер.
- ВІДХИЛЕННЯ: Rust `proper_crossings` пропускає same-parent ДО перевірки перетину
  (`staff_routes.rs:161-163`), тоді як оракул застосовує sharedSource ЛИШЕ до collinearOverlaps
  (`crossingDetector.ts:107-111`), а properCrossings рахує незалежно від sameManager.
  Безпечно для монотонних деревних маршрутів (спільний батько дає лише collinear shared-trunk або
  дотик у порті, не транзверсаль), але оракул трохи слабший. Також Rust-хелпер портує лише
  транзверсаль, без collinear-overlap — для R6-1 прийнятно (shared-trunk оракул і так виняткує).

### Тести — переважно інформативні, дві слабини
- corridor_y `:224-231`: пінить midpoint=85; зловить probe-формулу (106) → інформативний.
- elbow_endpoints `:212-220`: пінить bottom/top-center + len4 + осьовість → інформативний.
- aligned_x `:235-239`: dx=0.3<0.5 → len2; ЗАМИКАЄ поріг 0.5 (на 1e-6 впав би) → інформативний.
- self-loop/dangling `:256-263`: прибери guard `:65` → len2 → впаде → інформативний.
- СЛАБИНА NB1: preserves_input_edge_order `:243-252` — входи вже алфавітні (a,b). Зловить сорт-за-x
  (b@-200,a@200), але НЕ зловить сорт-за-to_id (алфавіт дав би ту саму черговість). Інваріант
  «без пересортування за id» фактично не запінено.
- СЛАБИНА NB3: multi_parent crossings==0 `:206` слабо-чутливий — субдерева рознесені по x у самій
  фікстурі (0 by construction фікстури, не роутера). Справжні зуби — осьовість `:207` + одноребрні
  тести портів/midpoint. Критик це приймає, але варто назвати.

### Scope (питання 3) — конвенційний, не кодовий (NB4)
- `staff_routes` не фільтрує за kind/tier — маршрутизує БУДЬ-ЯКЕ ребро з resolved кінцями
  (`staff_routes.rs:61-77`). Intra-block admin тримається лише тим, ЩО передає продюсер.
  cross-tier ребро було б тихо промальоване intra-block-формулою. Doc `:7-10` заявляє cross-tier
  поза scope, код не забезпечує. Для гео-примітиву прийнятно, але не самозахищено.

### Детермінізм (питання 4) — ВІРНО
- Без сортування; ітерація `for edge in edges` `:64` зберігає вхідний порядок. Коректно.
- self-loop guard `:65-67` (from==to → skip); dangling через let-else `:68-70`. Коректно, без паніки.

### Межі (питання 5)
- Порожні входи: segments порожній, lod штампується — тривіально коректно (в scope, не тестовано).
- NB5 (санкціоновано критиком, але реальна різниця): від'ємний/нульовий зазор (to.y<from.y+h) —
  legacy повертає null+fallback (`staffEdgeGeometry.ts:133,153`), Rust будує елбоу з corridorY, що
  може опинитися ВИЩЕ from.bottom (нема guard, `:42-56`). Критик виніс «нема верт.зазору» ПОЗА R6-1,
  тож це свідомо, але downstream має знати про поведінкову різницю.
- Дублі ребер: дублюються у вихід (нема dedup — шар валідатора). Поза scope.
- Нульова висота / NaN: без guard; NaN-координата дасть елбоу з NaN (порівняння <0.5 = false).
  Апстрім дає скінченну гео; поза scope R6-1.

### Гейти (перевірено, не на віру)
- `cargo test staff_routes` → 6 passed; 0 failed.
- `cargo clippy --all-targets -- -D warnings` → чисто.

## РІШЕННЯ
PASS-with-nonblocking. Blocking: немає. Non-blocking: NB1 (слабкий тест порядку), NB2 (відхилення
оракула same-parent), NB3 (слабка чутливість crossings), NB4 (scope конвенційний), NB5 (нема
negative-gap, санкціоновано). R6-1 готовий до коміту — жодна знахідка не блокує; NB1 варто підсилити
(переставити входи b,a) при наступному дотику, решта — свідомі межі зрізу.
