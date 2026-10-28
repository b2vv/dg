# R1 — під-спека межі Rust/TS для staff-геометрії (T126)

**Статус:** чернетка на гейт. **Мандат:** [ADR-0002](../../../docs/adr/0002-edge-dock-point-is-declared-by-the-node.md)
(«геометрію staff рахує Rust в одній системі координат; нода оголошує форму»), рядки 40-41
прямо делегують R1 визначити: межу входів/виходів, LOD/обсяг точок лінків, API результату,
Rust-convention. Рішення власника: O-38 (обсяг Rust), O-48 (повні маршрути), O-30 (злам API ок),
O-16 (розмір content-driven з DOM), O-33 (одна правда для точок лінків), O-49 (R1 перед
залежними підзадачами).

Деливеристики R1: **цей файл** + контракт-типи у `packages/core/src/types.rs` (ts-rs) + план
перегенерації `rust-types.ts`. Логіки лейауту R1 **не** додає — лише фіксує форму (логіка: R3/R4/R6).

---

## 1. Система координат (ADR-0002 §18-19)

Одна світова система координат, початок — лівий-верх канви staff-вікна (ті самі одиниці, що
сьогодні повертає `StaffCanvasResult`: px, вісь Y вниз). **Усі** координати й межі рахує Rust;
споживачі (live-рендер, SVG-експорт, тести) лише читають. TS більше не центрує корінь, не пакує
відділи, не зсуває яруси, не рахує padding обгорток і не виводить точки лінків.

## 2. Входи, що переходять у Rust

Згруповано. Джерело = звідки TS-адаптер бере значення перед передачею.

### 2a. Дерево й членство (з `DiagramData`, адаптер мапить)
| Поле | Тип | Джерело сьогодні | Нотатка |
|---|---|---|---|
| positions | `[{id, organizationId, isHead, departmentId?, …}]` | `data.positions` | членство в орг-блоці й ярусах |
| reportLines | `[{fromId, toId, kind}]` | `data.reportLines` | admin/matrix/dotted ребра |
| organizations | `[{id, parentOrgId, name, role}]` | `data.organizations` | current + managing-parent (ярус 1/2); name/role — **не** геометрія, лишаються в TS (див. §6) |
| departments | `[{id, name, …}]` | `data.departments` | пакування (O-38), magnetic-розріз (O-48 п.5) |
| currentOrgId | `string` | `cfg.staffCurrentOrgId` | корінь вікна |

### 2b. Виміряні розміри нод (O-16, content-driven)
| Поле | Тип | Джерело | Нотатка |
|---|---|---|---|
| nodeSize[id] | `{width, height}` | **DOM-вимір** (two-pass) | механізм подачі/кешу/фолбеку — **R2**, не R1. R1 лише оголошує, що розмір — вхід, а не константа. Фолбек = `nodeWidth/nodeHeight` з 2c |

### 2c. Числові опції
З `StaffLayoutOptions` (`layout/staff/types.ts:12-58`): `nodeWidth, nodeHeight, refCellWidth,
refCellHeight, horizontalGap, verticalGap, margin, tierGap, orgCardWidth, orgCardHeight,
zoneLabelBand`.
**`contentPadding` — НЕ поле `StaffLayoutOptions`** (Dg20-правка): це **обчислюване** TS-значення
(`staffLiveGeometry.departmentWrapperPadding` → `contourButtonGroupMargin`), яке подається в Rust
як число — саме так форма стає однією.
- `contentPadding` — **значення** переходить як вхід; його **похідну з theme/config**
  (`departmentWrapperPadding`) лишаємо TS-адаптером (залежить від `NodeTheme`/`RenderConfig`,
  які в Rust не їдуть). Це усуває подвійну формулу (ADR §13), бо обчислення стає одним і його
  результат подається в Rust як число.
- `zoneLabelBand` — так само: обчислення (font size зони) — TS; значення — вхід.

### 2d. Пакування/розкриття
`deptGrouping, staffCoordMode, memberOrder, expandedOrgIds, maxExpandedOrgCards,
expandedPositionIds, maxExpandedPositions, collapseUnexpandedPositions` — усі з `StaffLayoutOptions`.

### 2e. Порт лінка й LOD (ADR-0002, O-48)
| Поле | Тип | Нотатка |
|---|---|---|
| edgePort[id] | `'center' \| 'avatar'` | нода **оголошує** точку докування (ADR §21, `render/types.ts:144`); правило порту — вхід у Rust |
| dockHints[id] | `figma-row{tileX,tileY,tileSize} \| gojs-row{cardY,cardH,countBarH}` | геометрія докування, виведена з DOM/стилю (`visualEdgeBox.ts:36-94`); переходить як вхід |
| lod | `'near' \| 'mid' \| 'far'` | **вхід**; Rust повертає маршрути для ПЕРЕДАНОГО lod (один виклик на lod) — узгоджено з уже-витягнутою `computeStaffLiveGeometry` (single-lod). Rust НЕ віддає всі lod разом (інакше рендер рахує 3× зайве) |

**Рішення обсягу точок лінків (ADR §34, Q-3 → O-48 п.3):** «повні маршрути» — ортогональні
полілінії з обходом рамок відділів і посад, **не** лише порти-якорі. Перешкоди = Rust-геометрія
для всіх LOD (R6 §7b).

## 3. Виходи Rust (контракт результату)

Єдиний результат `StaffGeometryResult` (замінює `StaffCanvasResult` — §5). Усе — чиста геометрія.

| Вихід | Форма | Замінює сьогодні |
|---|---|---|
| nodes | `[{id, organizationId, x, y, width, height, tier, role, depth?, departmentId?, partIndex?}]` | `StaffCanvasResult.positionNodes` (+`departmentId`/`partIndex` — вхідна умова B5-маршруту до не-головної картки) |
| orgCards | `[{orgId, x, y, width, height}]` | `StaffOrgCard` геометрія (name/positionCount/expanded — TS, §6) |
| **namespaces** | `[{tier, kind, organizationId?, x, y, width, height}]` | **`tiers: StaffTierBand[]`** — перейменовано (§5); межі x/y/w/h **завжди присутні**. **Лише смуги ярусів** (`staff-block`/`org-cards`), НЕ рамки відділів |
| **departmentFrames** | `[{departmentId, partIndex?, x, y, width, height}]` | **нема окремого типу сьогодні** — рамку відділу live і SVG рахують КОЖЕН сам (`staffLiveGeometry.departmentWrapperPadding` vs `svgExport` `contourButtonGroupMargin`, ADR §13). Rust-вихід = **єдине джерело** для live+SVG (R5); `partIndex` виражає magnetic-розріз (B5) — одна рамка на частину зі спільним `departmentId` |
| edges | `[{fromId, toId, kind}]` | `StaffCanvasResult.edges` |
| routes | `{lod, segments: [{fromId, toId, kind, points:[{x,y}]}]}` | те, що рахував рендер (`DiagramRenderer`→`staffEdgeGeometry`); тепер вихід Rust (R6) |
| width, height | `f32` | canvas-розмір |
| diagnostics | `[string]` | `StaffCanvasResult.diagnostics` |

Межі/кути — як сьогодні (px, Y вниз). `label`/`role`/`name`/`positionCount`/`expanded` — **не** у
Rust-виході; TS-адаптер збагачує (§6).

## 4. Таблиця переходу (що в Rust, що лишається TS-адаптером)

| Обчислення | Сьогодні | Після T126 |
|---|---|---|
| row-tree одного орг-блоку | Rust (`core/src/lib.rs`) | Rust |
| пакування відділів + обгортки + внутр. відступи | TS (`staffDeptGrouping.ts`) | **Rust** (R3) |
| композиція ярусів, namespaces, вісь, пере-центрування кореня, зсуви | TS (`canvasLayout.ts:80-152`, `orgBlockLayout.ts:87-102`) | **Rust** (R4) |
| межі смуг ярусів (namespaces) | TS (`staffZoneBounds.ts` `enrichStaffTierBands`) | **Rust** `namespaces`, єдине джерело (R5) |
| межі рамок відділів (+magnetic-частин) | TS дві формули (`staffLiveGeometry.departmentWrapperPadding` vs `svgExport`) | **Rust** `departmentFrames`, єдине джерело (R5) |
| точки лінків / маршрути | TS (`staffEdgeGeometry.ts`, `visualEdgeBox.ts`, рендер) | **Rust** (R6) |
| padding обгортки (значення) | TS дві формули (live `departmentWrapperPadding` ≈36 / SVG `contourButtonGroupMargin` ≈6) | TS рахує **один** раз → вхід у Rust (усуває розбіжність ADR §13) |
| DOM-вимір розміру картки | — | TS (browser), подає в Rust (R2) |
| резолв `NodeTheme`/стилів, `RenderConfig` | TS | TS (не їде в Rust) |
| label/role/name namespace-ів | TS (`enrichStaffTierBands`) | TS-адаптер поверх Rust-виходу |
| Pixi-паінт, React-картки, SVG-серіалізація | TS | TS (читають Rust-геометрію) |
| `DiagramData`→вхідний контракт | TS | TS-адаптер |

## 5. Злам API результату: `tiers` → `namespaces` (похідне від plan.md §4, O-30)

**Джерело — `plan.md §4` (сайд-ефекти):** `tiers`→`namespaces`, **усі споживачі в одній зміні**.
`StaffCanvasResult.tiers: StaffTierBand[]` → `namespaces: StaffNamespace[]` з обов'язковими межами.
Хост цей SDK не споживає (AGENTS.md) → публічний API хосту не рветься понад це.

**Споживачі (plan.md §4 називає; авторитетний список — ре-греп `\.tiers\b|StaffTierBand` на R7,
plan §4/§7):** plan §4 називає `canvasLayout`, `StaffZonesView`, `staffZoneBounds`,
`personInteractions`, `render/types`, тести, `svgExport`, `e2eBridge`, `DiagramRenderer`.
*(Dg20-звірка грепом — не overclaim «повністю»):* прямі `.tiers`/`StaffTierBand` сьогодні мають
`layout/staff/types.ts` (визначення+поле), **барелі** `layout/staff/index.ts:8` і
`render/index.ts:151` (були пропущені планом), `canvasLayout`, `StaffZonesView`,
`render/staffLiveGeometry.ts` (`zones` + `enrichStaffTierBands` → перейменувати на `namespaces`),
`staffZoneBounds`, `export/svgExport.ts`; `render/types.ts:279` — лише коментар. **НЕ** мають
прямого `.tiers`: `personInteractions`, `e2eBridge` (читає `canvas.edges`), `DiagramRenderer`
(опосередковано через `staffLiveGeometry`) — over-inclusion плану. Плюс golden-тест
`staffGeometry.golden.test.ts` (ключ `zones`). Ризик пропуску закриває **мандат ре-грепу на R7**
тим самим патерном — він, а не цей список, є гарантією «усі в одній зміні».

**R0-golden НЕ у формі `namespaces` (plan.md §5.1 + §8 B8 — ОБОВ'ЯЗКОВО):** baseline R0 знімає
**нормалізовану геометрію** (координати/межі/edges/orgCards, ±1px), інваріантну до імені секції;
golden порівнянням перейменування `tiers`→`namespaces` **НЕ** перевіряється. Еквівалентність форми
перевіряє **окремий адаптер** — тест `staffResultAdapter.test.ts` (B8): адаптований новий результат
(`namespaces`→`tiers`-форма) = старому `tiers` поелементно. До R7 у базі співіснують дві формули
меж за прапором форми результату (plan §99, N-6).

`StaffNodeBox.role` (`'anchor'|…|'external'`) і namespace-роль (`'leading'|'current'`) — різні осі;
при переназві не плутати.

## 6. Що лишається TS-адаптером (не геометрія)

- Резолв теми/стилів (`resolveNodeTheme`/`resolveTheme`), `RenderConfig`.
- DOM-вимір (browser) і розрив циклу DOM↔Rust — **R2**.
- Збагачення namespace-ів: `label` (org.name), `role` ('leading'/'current') — з `DiagramOrganization`.
- `orgCard.name/positionCount/expanded`, `node` person/department/label — дані, не координати.
- Pixi-паінт, React `ShpsStaffCard`, SVG-серіалізація, `edgePort` похідна (до приходу Rust-правила — ADR §21 «проміжна TS-реалізація»).

## 7. Rust-convention для `packages/core` (AGENTS.md: стандарту нема)

Поки `packages/core` не має документованого Rust-стандарту (гейтиться лише
`cargo fmt --check` / `clippy -D warnings` / `cargo test` з `21d3560`). R1 фіксує мінімальну
конвенцію для нових staff-модулів (повний стандарт — R9, оновлення стек-ноти AGENTS.md):
- контракт-типи — у `types.rs`, `#[derive(Debug, Clone, Serialize, Deserialize)]` + ts-rs export;
- TS-фейсові імена — `#[serde(rename = "camelCase")]`; опційні — `ts(optional)` + `skip_serializing_if`;
- усі вхідні метрики проходять `validate_layout_metric` (NaN/Inf/знак), як `LayoutOptions::validate`;
- геометричні модулі — чисті функції (без I/O), юніт-тести `#[cfg(test)]` поряд;
- одиниці — f32 px, Y вниз; без прихованих систем координат.

## 8. Перегенерація `types.rs` ↔ `rust-types.ts`

Контракт-структи додаються у `types.rs` під тим самим ts-rs-патерном
(`ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")`) і в тест
`export_rust_types` (кожен тип `::export()`). Регенерація:
`cargo test export_rust_types --features ts-export` (частина `build:wasm`). Згенерований
`rust-types.ts` комітиться; `layoutBridge.ts` реекспортує нові типи, як робить для
`OrgFlatInput`/`OrgRowTreeLayoutResult`.

**R1 додає у `types.rs` (лише форма, без логіки):** `StaffLayoutInput`, `StaffNodeSize`,
`StaffNodeGeo` (+`departmentId?`/`partIndex?`), `StaffOrgCardGeo`, `StaffNamespace`,
`StaffDepartmentFrameGeo`, `StaffEdge`, `StaffRoutePoint`, `StaffEdgeRoute`, `StaffRouteSet`,
`StaffGeometryResult` (+`departmentFrames`) + `validate()` на вхідних метриках.
TS-сторона `StaffCanvasResult` **не** змінюється в R1 (злам застосовується, коли Rust заміняє
TS-композицію — R4/R7).

## 9. Порівняльний гачок (ADR §28, §36)

Варіант 3 (один TS-сайт якоря, Rust лишається row-tree) лишається порівняльною альтернативою,
якщо перф-вимір WASM-межі на 1M-вікні (R10) покаже неприйнятну ціну варіанта 1. R1 фіксує межу
для варіанта 1; якщо R10 завертає — межа звужується до «TS рахує якір/маршрути, Rust лишається
row-tree», решта контракту (DOM-вимір як вхід, одна формула padding) лишається чинною.

## 10. Пункти гейту — РОЗВ'ЯЗАНО (GATE 2, рев'ю `_gate2-r1-critique.md`)

- **G1 (ЗАКРИТО → окремий ВХІД):** `dockHints` — окремий вхід, не Rust-обчислення. Вимушено
  межею §6: `dockHints` виводяться з `figmaRowAvatar`/`resolveGojsRowLayoutMetrics`
  (`visualEdgeBox.ts:70-91`), що залежать від `PersonNodeStyle`/теми, а §6 свідомо тримає резолв
  теми в TS. Застереження: `dockHints` ще **відсутній** у `StaffLayoutInput` — внести на **R6**
  (non-blocking, бо вхід маршрутизації, а не R1-форми результату).
- **G2 (ЗАКРИТО планом):** назва `namespaces` зафіксована `plan.md §4` і ADR.
- **G3 (ЗАКРИТО → лишити в результаті):** `diagnostics` лишаються полем `StaffGeometryResult`
  (збіг зі `StaffCanvasResult.diagnostics`, KISS, на канал менше). Окремий канал виправданий лише
  за вимогою незалежного стрімінгу, якої в спеці нема.
- **БЛОКЕР GATE 2 (ЗАКРИТО):** вихід не ніс меж рамок відділів (центральний дефект «двох правд»
  padding, ADR §13) і не виражав magnetic-частин (B5). Додано `StaffDepartmentFrameGeo` (окремий
  вихід, рішення власника Dg20, Варіант A) + `departmentId`/`partIndex` на `StaffNodeGeo`; regen
  `rust-types.ts`; Rust-гейти зелені (fmt/clippy/`cargo test` 54/0, export-тест), TS typecheck 0.
  Ре-гейт (`_gate2-r1-recheck.md`) підтвердив закриття блокера → **GATE 2 PASS-with-nonblocking**.

### Відкладені non-blocking (ре-гейт Dg20 — закрити на вказаному кроці)
- **N-R1a (→R3/R6):** `StaffDepartmentFrameGeo` без `organizationId`/`tier`; контракт не фіксує
  глобальну унікальність `departmentId`. Паінт по абсолютних координатах не страждає, але
  node→frame-мапінг по `(departmentId, partIndex)` двозначний у багатоорг-вікні (яруси 1/2), якщо
  `departmentId` не унікальний глобально. **Робоче припущення R1:** `departmentId` глобально
  унікальний (як `id` у `data.departments`); якщо R3/R6 виявлять колізію між орг-блоками — додати
  `organizationId` у `StaffDepartmentFrameGeo` тоді, не зараз (R1 — мінімум форми).
- **N-R1b (угода, зафіксовано тут):** `partIndex` — **0-базний**; `None` = нерозрізаний відділ
  (знімає двозначність «None vs 0»). Нумерація вузол↔рамка спільна. Угода в prose, не в типі —
  R3 (magnetic-розріз) мусить її дотримати.
- **N-R1c (→R6):** `dockHints` оголошено входом (§2e), але ще відсутній у `StaffLayoutInput` —
  внести на R6 (вхід маршрутизації, перенесено з G1).

## 11. Основа реалізації R6 (маршрути) — reuse з plan.md §3

Маршрутизацію R6 будуємо на **алгоритмі v3** (`work/reports/shps-routing`, spec/design-v3):
конструктивний layered + K-проходи — приймальна спека R6 (plan §55). Проді-роутер `v2` урізаний
(нема edge-edge, доріжок, `deptTop/Bottom` — plan §62), тож переноситься не він, а v3. Перешкоди
на far/mid — Rust-геометрія для всіх LOD (plan §7b), не DOM.

---
**Походження:** ця спека — похідна від `plan.md §1` (межа), `§4` (злам API + споживачі), `§5`
(план міграції R0→R10), `§8` (приймальні H1-F8), `§3` (reuse), ADR-0002 (мандат), журнал O-16/
O-30/O-38/O-48. Не замінює план — деталізує R1-рядок `tasks.md`. GATE 2 (`plan-critique`) — далі.
