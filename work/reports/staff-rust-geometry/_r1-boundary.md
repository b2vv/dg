# R1 — під-спека межі Rust/TS для staff-геометрії (T126)

**Статус:** чернетка на гейт. **Мандат:** [ADR-0002](../../docs/adr/0002-edge-dock-point-is-declared-by-the-node.md)
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

### 2c. Числові опції (із `StaffLayoutOptions`, `layout/staff/types.ts:12-58`)
`nodeWidth, nodeHeight, refCellWidth, refCellHeight, horizontalGap, verticalGap, margin, tierGap,
orgCardWidth, orgCardHeight, zoneLabelBand, contentPadding`.
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
| nodes | `[{id, organizationId, x, y, width, height, tier, role, depth?}]` | `StaffCanvasResult.positionNodes` |
| orgCards | `[{orgId, x, y, width, height}]` | `StaffOrgCard` геометрія (name/positionCount/expanded — TS, §6) |
| **namespaces** | `[{tier, kind, organizationId?, x, y, width, height}]` | **`tiers: StaffTierBand[]`** — перейменовано (§5); межі x/y/w/h **завжди присутні** (єдине джерело для live+SVG, прибирає подвійний padding — R5) |
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
| межі обгорток/namespaces | TS (`staffZoneBounds.ts` `enrichStaffTierBands`) | **Rust**, єдине джерело (R5) |
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

**Повний список споживачів — дослівно з plan.md §4** (звірити грепом `\.tiers\b|StaffTierBand`
перед зміною, R4/R7): `canvasLayout`, `StaffZonesView`, `staffZoneBounds`, **`personInteractions`**,
**`render/types`**, тести, `svgExport`, **`e2eBridge`**, `DiagramRenderer`. Плюс новий
`render/staffLiveGeometry.ts` (повертає `zones` → перейменувати на `namespaces`) і golden-тест
`staffGeometry.golden.test.ts` (ключ `zones`). *(Dg19-правка: раніше тут була підмножина — тепер
за планом повністю.)*

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
`StaffNodeGeo`, `StaffOrgCardGeo`, `StaffNamespace`, `StaffEdge`, `StaffRoutePoint`,
`StaffEdgeRoute`, `StaffRouteSet`, `StaffGeometryResult` + `validate()` на вхідних метриках.
TS-сторона `StaffCanvasResult` **не** змінюється в R1 (злам застосовується, коли Rust заміняє
TS-композицію — R4/R7).

## 9. Порівняльний гачок (ADR §28, §36)

Варіант 3 (один TS-сайт якоря, Rust лишається row-tree) лишається порівняльною альтернативою,
якщо перф-вимір WASM-межі на 1M-вікні (R10) покаже неприйнятну ціну варіанта 1. R1 фіксує межу
для варіанта 1; якщо R10 завертає — межа звужується до «TS рахує якір/маршрути, Rust лишається
row-tree», решта контракту (DOM-вимір як вхід, одна формула padding) лишається чинною.

## 10. Відкриті пункти для гейту (звірено з plan.md)

- **G1 (відкрите):** чи `dockHints` (виведені з DOM) — окремий вхід, чи Rust рахує їх із
  `edgePort` + nodeSize (тоді figma-row avatar-tile геометрія теж у Rust). Схиляюсь: вхід (DOM знає
  тайл), але це розширює межу — на критику GATE 2.
- **G2 (ЗАКРИТО планом):** назва `namespaces` зафіксована `plan.md §4` і ADR — не відкрите питання.
- **G3 (відкрите):** чи `diagnostics` лишаються частиною геометро-виходу, чи окремим каналом — на
  критику.

## 11. Основа реалізації R6 (маршрути) — reuse з plan.md §3

Маршрутизацію R6 будуємо на **алгоритмі v3** (`work/reports/shps-routing`, spec/design-v3):
конструктивний layered + K-проходи — приймальна спека R6 (plan §55). Проді-роутер `v2` урізаний
(нема edge-edge, доріжок, `deptTop/Bottom` — plan §62), тож переноситься не він, а v3. Перешкоди
на far/mid — Rust-геометрія для всіх LOD (plan §7b), не DOM.

---
**Походження:** ця спека — похідна від `plan.md §1` (межа), `§4` (злам API + споживачі), `§5`
(план міграції R0→R10), `§8` (приймальні H1-F8), `§3` (reuse), ADR-0002 (мандат), журнал O-16/
O-30/O-38/O-48. Не замінює план — деталізує R1-рядок `tasks.md`. GATE 2 (`plan-critique`) — далі.
