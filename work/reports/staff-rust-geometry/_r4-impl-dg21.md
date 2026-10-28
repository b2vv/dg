# R4 impl — композиція ярусів + namespaces + вісь (T126, Dg21)

**Вхід:** R1 (контракт) + R3 закрито. R4 [P] залежить від R1. Гілка `feat/t126-staff-rust-geometry`.
**Критерій (tasks.md):** `cargo test` осі/namespaces; golden R0 на новому шляху зелений.
**Прекондиція:** R0-golden зелений на HEAD — ✅ підтверджено (3/3, через demo-workspace конфіг).

## Що R4 переносить (із `canvasLayout.ts::layoutStaffCanvas`)
Композицію ярусів у Rust (TS-функція лишиться тонким адаптером на R7):
- стек ярусів по `cursorY` з резервом `zoneLabelBand` (ярус-1 керівництво, ярус-2 штат, ярус-3 орг-картки);
- смуга-namespace на ярус (`StaffNamespace`: tier/kind/orgId?/x/y/w/h) — замість `tiers`/`StaffTierBand`;
- перецентрування ярусу-1 над головою ярусу-2 (вісь): `dx>0 → зсув ярусу-1 вправо`, `dx≤0 → лишити`;
- ширина/висота канви.
Крос-ярус-ребра (fromId/toId/kind) — список простий; маршрути (points) — це R6.

## Вхід у Rust (на зріз, не весь одразу)
Per-tier блоки вже розкладені (локальні координати) — `layoutStaffOrgBlock` лишається TS/row-tree на цьому
етапі; R4 Rust = ЧИСТА композиція блоків (аналог `pack_departments`): compose(blocks, opts) →
{nodes world-coords, namespaces, width, height}.

## Зрізи (TDD, red-first, оракул із TS `canvasLayout.ts`)
1. **compose_tiers (staff-block)** — стек ярусів 1/2 по cursorY+zoneLabelBand; смуга-namespace на ярус
   (y, height=max(block_h, min_h)+band); min_h: ярус-2=nodeHeight+2·margin, ярус-1=orgCardHeight.
2. **вісь (recenter)** — ярус-1 над головою ярусу-2: dx>0 зсув, dx≤0 лишити.
3. **ярус-3 org-cards** — смуга карток + expand-in-place зсуви.
4. **розміри** — width (max node/card right + margin), height = cursorY.
5. (пізніше/R6) крос-ярус-ребра список.

## ⚠️ РОЗВИЛКА R4/R5 (план не розводить чітко) — ПИТАННЯ ВЛАСНИКУ
`StaffNamespace` (Rust) має `x`/`width` ОБОВ'ЯЗКОВІ. У TS їх заповнює окремий пост-прохід
`enrichStaffTierBands` (`staffZoneBounds.ts:113-141`) — рахує bounds із member-boxes ± padding, або повну
ширину канви (`staffZoneBounds.ts:76-99`). Це **межі обгорток = R5** («Rust: межі обгорток і namespaces
як єдиний вихід»), не R4. R4 («композиція+namespaces+вісь») природно дає вертикаль (`tier/kind/orgId/
y/height`); `x`/`width` (bounds) — R5.

**Рекомендація:** R4 емітить namespaces з `y/height/tier/kind/orgId`, а `x`/`width` лишає R5 (єдине
джерело bounds для live+SVG). У R4-зрізах тестую y/height/tier/kind/orgId; x/width тимчасово 0 з
коментарем «R5 заповнює». Альтернатива — зробити x/width у R4 content-extent (дубль із R5 → «дві правди»).
Чекаю підтвердження перед кодом зрізу 1.

## Журнал
- R4/R5-межа ВИРІШЕНА (власник + код): R5 — єдине джерело bounds для SVG + React/DOM + Pixi разом
  (споживачі: svgExport, DiagramRenderer, StaffZonesView, staffLiveGeometry, DepartmentCardView,
  staffRouterV2). React окремого рахунку геометрії не має. Отже R4 → tier/kind/orgId/y/height;
  R5 → x/width.
- **Зріз 1 ГОТОВИЙ (TDD red→green):** `staff_compose.rs::compose_tiers` — стек staff-block ярусів по
  cursor_y + zone_label_band; смуга-namespace на ярус (y/height/tier/kind/orgId; x/width=0 для R5).
  Reexport у lib.rs (compose_tiers/ComposeResult/TierBlock). Тест
  `stacks_two_staff_block_tiers_with_band_reservation`. Гейти: cargo test ok, clippy 0, fmt 0.
  Оракул звірено з canvasLayout.ts:80-131.
- ДАЛІ: зріз 2 — вісь (перецентрування ярусу-1 над головою ярусу-2: dx>0 зсув, dx≤0 лишити).

## Продовження Codex — 2026-10-28: зрізи 2–4 ГОТОВІ

### 1. Зроблено
- **Зріз 2:** `TierBlock.head_id`, stamp `tier = block.tier`, центри голів
  `dx = cur.x + cur.width/2 - (mgr.x + mgr.width/2)`; лише `dx > 0` зсуває всі вузли ярусу 1.
  Оракул: `canvasLayout.ts:80-83,114-117,139-154`.
- **Зріз 3:** `compose_org_cards` приймає локальні expanded-блоки, переносить вузли під картку
  (`origin=(card_x, card_y+org_card_height+vertical_gap)`) зі stamp tier=3.
  Крок x: `max(org_card_width, block.width)+horizontal_gap`; висота колонки:
  `org_card_height + (block.height>0 ? vertical_gap+block.height : 0)`.
  Смуга = max висот колонок + margin; cursor = card_y + смуга + margin.
  Без дітей немає смуги, cursor не змінюється. Оракул: `canvasLayout.ts:173-232`.
- **Зріз 4:** `canvas_dimensions`: width =
  `max(2*margin, node right edges, card right edges, tier2_width)+margin`;
  height = переданий фінальний content_bottom. Оракул: `canvasLayout.ts:262-276`.
- Усі `StaffNamespace.x/width = 0.0`; R5 лишається єдиним джерелом меж.
  Картки несуть лише `StaffOrgCardGeo`, без name/positionCount/expanded.
  Rust reexports доповнено в наявному seam `lib.rs`.

### 2. Протестовані сценарії та гейти
Кожен зріз пройдено послідовно RED → реалізація → GREEN.
- Зріз 2 RED: tier 0≠1 та x [32,188,200]≠[232,388,200]; GREEN 3/3.
  Покрито dx>0, dx=0, dx<0, зсув усіх tier-1 вузлів і незмінність tier-2.
- Зріз 3 RED: cards.len() 0≠2; GREEN 6/6.
  Покрито два child org, широкий expand з ненульовими локальними x/y, порожні діти,
  вузький expand нульової висоти, namespace та фінальний cursor.
- Зріз 4 RED: (0,0)≠(932,812), (0,0)≠(96,500); GREEN 8/8.
  Кожне джерело max перевірене як переможець, включно з margin-floor.

Після **кожного** зрізу всі три команди виконано без pipe з exit 0:
```sh
cargo test --manifest-path packages/core/Cargo.toml staff_compose
cargo clippy --manifest-path packages/core/Cargo.toml --all-targets -- -D warnings
cargo fmt --manifest-path packages/core/Cargo.toml --check
```
Послідовні записи: [worklog](./_r4-codex-worklog.md).

### 3. Неочевидні знахідки
Порожній expanded-блок не додає vertical_gap до висоти колонки; margin після tier-3
враховується двічі — у висоті смуги й після неї. Обидва правила прямо задані оракулом.
Width канви не є width namespace.

### 4. Обмеження перевірки
Це авторські Rust unit/gate перевірки. Незалежне review, мутаційний аудит, R0 на новому
WASM-шляху та browser QA тут не виконувалися: TS/WASM wiring цього брифу не змінено.
Не заявляється завершення всієї T126/R4 інтеграції.

### 5. Рішення й питання
Формули підтверджені оракулом; відкритих геометричних ПИТАНЬ немає.
Native checkpoint не записаний: sandbox заборонив створення receipt у зовнішньому
policy-mapped каталозі (`Operation not permitted`); durable worklog збережений.
Вимогу першого запису до першого інструменту виявлено лише після читання брифу;
відхилення чесно записано першим рядком worklog.

### 6. Передача результату
Зрізи 2–4 готові до review в поточній `feat/t126-staff-rust-geometry`,
HEAD `ca34921a362a830082c26787cce4e5086e28daae` + незакомічений WIP.
Комітів, push, нових worktree не створено; початковий handoff-WIP збережено.

### Post-deploy
N/A: деплою не було; цей бриф обмежений Rust-композицією.

## R4 ЗАКРИТО (Dg21) — reviewer-штамп + рішення власника
- **Рішення власника:** R4 = Rust-композиція + unit-тести (осі/namespaces — перша половина критерію ✓).
  Golden R0 на НОВОМУ шляху — при зашиванні в **R7** за прапором (§6 плану). Wiring у canvasLayout.ts
  НЕ входить у R4.
- **Незалежна верифікація (оркестратор, не exit-claims codex):** код звірено з оракулом canvasLayout.ts
  построково — зрізи 2-4 faithful. Гейти перезапущено самостійно без pipe: cargo test 43/43 (8 нових
  compose), clippy -D warnings 0, fmt 0. Scope diff: lib.rs (reexports) + staff_compose.rs + журнали;
  types.rs/WASM/TS не чіпані (regen не потрібен).
- **Стан:** R0 → R1 → R2(ще) → R3 ✓ → R4 ✓. Далі за tasks.md: **R5** (межі обгорток і namespaces як
  єдиний вихід — заповнює x/width, live+SVG паритет).
