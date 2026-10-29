# A2.5 dockHints — РОЗСЛІДУВАННЯ edgePorts + ДИСКУСІЯ З КРИТИКОМ (Dg27)

> Власник (варіант 3): спершу розібратися, для чого edgePorts; дискусія з критиком; ПОТІМ варіанти 1/2.
> Форму контрактного типу власник вирішить ПІСЛЯ показу зрізу (Q2). Код НЕ різати до рішення.

## ФАКТИ розслідування edgePorts (первинні джерела)
- `StaffEdgePortInput{id, port:String}` + `StaffLayoutInput.edge_ports` заведено в `b8da929`
  («R1 — під-спека межі»). Плановий R1-плейсхолдер, не випадковість.
- **НЕ споживається в Rust:** лише декл (types.rs:397,421), ts-export (types.rs:634), тест-init
  (staff_layout.rs:1868). Жоден прод-шлях не читає edge_ports.
- ts-rs експортує: `rust-types.ts:59 StaffEdgePortInput = {id,port}`, у StaffLayoutInput.edgePorts.
- **TS НЕ споживає `StaffEdgePortInput`** (лише генерований декл). Натомість у SDK є СПОРІДНЕНИЙ,
  але інший концепт: `PersonNodeStyle.edgePort?: 'center'|'avatar'` (render/types.ts:144),
  вжитий `visualEdgeBox.ts:69` (`if style.edgePort === 'center' return box`) + demo tabConfigs:98.

## R1-контракт (_r1-boundary.md:60-61, 176-202) — ДЖЕРЕЛО ПРАВДИ
| вхід | форма | роль |
|---|---|---|
| edgePort[id] | `'center'｜'avatar'` | нода ОГОЛОШУЄ правило докування (ADR §21) — правило порту як вхід у Rust |
| dockHints[id] | `figma-row{tileX,tileY,tileSize}｜gojs-row{cardY,cardH,countBarH}` | ГЕОМЕТРІЯ докування, виведена з DOM/стилю (visualEdgeBox.ts:36-94); вхід |
- G1 (ЗАКРИТО): dockHints — окремий вхід, не Rust-обчислення (межа §6: виводяться з
  figmaRowAvatar/resolveGojsRowLayoutMetrics у TS). «dockHints ще ВІДСУТНІЙ — внести на R6» (N-R1c).

## НАПРУГА для дискусії (правило × геометрія)
TS `visualEdgeBox.ts:69`: `if style.edgePort === 'center' return box` — ПРАВИЛО вирішує,
повний бокс (center) чи tile-геометрія (avatar/figma). Rust `visual_person_edge_box` бере
`hint: Option<&PersonEdgeHints>` (геометрію), БЕЗ окремого правила. Питання: Rust потребує
ОБИДВА входи (edgePort rule + dockHints geometry), чи dockHints достатньо (наявність figma-row
⟹ avatar-док; відсутність ⟹ center)? Чи edgePort-rule — YAGNI (ніхто не споживає)?

## ЗРІЗ ТИПУ (Q2 — на показ власнику, форму НЕ фіксовано)
```rust
// Дзеркало TS PersonEdgeVisualHints (staffEdgeGeometry.ts:2-15): internally-tagged `layout`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts"))]
#[serde(tag = "layout")]
pub enum StaffDockHint {
    #[serde(rename = "gojs-row")]
    GojsRow { #[serde(rename="cardY")] card_y: f32, #[serde(rename="cardH")] card_h: f32, #[serde(rename="countBarH")] count_bar_h: f32 },
    #[serde(rename = "figma-row")]
    FigmaRow { #[serde(rename="tileX")] tile_x: f32, #[serde(rename="tileY")] tile_y: f32, #[serde(rename="tileSize")] tile_size: f32 },
}
// keyed by person id (внутрішній person_hints = Vec<(String, PersonEdgeHints)>)
pub struct StaffDockHintInput { pub id: String, #[serde(flatten)] pub hint: StaffDockHint }
// StaffLayoutInput += #[serde(rename="dockHints", default)] pub dock_hints: Vec<StaffDockHintInput>
// staff_layout.rs:1222 person_hints: &[] → map dock_hints → (id, PersonEdgeHints)
```
РИЗИКИ зрізу (критик перевір): чи ts-rs підтримує `#[serde(tag)]` internally-tagged + `#[serde(flatten)]`
так, щоб згенерований TS = `PersonEdgeVisualHints`; чи `f32` поля не ламають JSON-round-trip;
чи мапінг StaffDockHint→PersonEdgeHints тотожний (поля 1:1).

---
## ХІД ДИСКУСІЇ (критик append нижче)

---
## КРИТИК Dg27 (claude-opus-4-8) — незалежна позиція

ДАЛІ: звірити edgePort-консюмерів, Rust visual_person_edge_box, ts-rs патерни enum/flatten.

### ФАКТ (первинні джерела)
- **edgePort-RULE живе ЛИШЕ в TS-теми, НЕ в Rust-вході.** Споживачі `edgePort`:
  `render/types.ts:144` (декл `'center'|'avatar'` на `PersonNodeStyle`),
  `visualEdgeBox.ts:69` (`if style.edgePort === 'center' return box`),
  `visualEdgeBox.test.ts:118-131`, `demo/tabConfigs.ts:98`. Rust-поле `edge_ports`
  (`types.rs:420-421`, тип `StaffEdgePortInput{id,port:String}` :397-400) **не читає жоден
  Rust-шлях**; генерований `StaffEdgePortInput` (rust-types.ts:59) **ніким у SDK не споживається**.
  Це ДВА РІЗНІ концепти з однаковою назвою: Rust-вхід ≠ TS-тема.
- **Правило КОЛАПСУЄ в геометрію TS-side, ще ДО Rust.** `staffEdgeBoxForPosition:65-80`:
  якщо `layout==='figma-row'` і `edgePort==='center'` → повертає ПЛОСКИЙ box БЕЗ `personEdgeHints`;
  інакше чіпляє figma-row hint. Тест :127 доводить: `edgePort:'center'` ⟹ `personEdgeHints===undefined`.
  Отже до споживача (`visualPersonEdgeBox`) правило НЕ доходить — доходить лише наявність/відсутність hint.
- **Rust вже кодує center-vs-tile через наявність hint.** `visual_person_edge_box(hints: Option<&PersonEdgeHints>)`
  (staff_edge_box.rs:97-145): `None` на near → `person_visual_world_rect` = повний box (center-dock);
  `Some(FigmaRow)` → tile-порт + obstacle. Окремого правила НЕ треба — presence/absence вже несе рішення.
- **`PersonEdgeHints` у Rust — чисто внутрішній:** `#[derive(Debug, Clone)]` (staff_edge_box.rs:38),
  БЕЗ Serialize/Deserialize/TS. Ніколи не серіалізується. Зріз A2.5 вводить НОВИЙ серіалізовний тип.
- **У types.rs НЕМА жодного `#[serde(tag)]`/`flatten`/`untagged`** — зріз A2.5 був би ПЕРШИМ tagged-enum
  і першим flatten у кодовій базі. serde-compat у ts-rs v10 ДІЄ (доказ: усі camelCase у rust-types.ts
  походять з голого `#[serde(rename)]` без `#[ts(rename)]`).

### РІШЕННЯ по питаннях

**Q1 — Варіант 1, НЕ Варіант 2.** R1 (_r1-boundary:60-61) свідомо розділяє дві ОСІ: `edgePort[id]`
= правило ('center'|'avatar', нода оголошує), `dockHints[id]` = геометрія. Варіант 2 (перепрофілювати
`StaffEdgePortInput` під геометрію) **прямо суперечить :60-61 і G1 (:176-180)**: `port:String` — це
правило-енум, не геометрія; переназвати той самий тип під union-геометрію = оманлива назва + злиття
двох осей. «Економія» на мертвому слоті фальшива: слот несе не ту семантику; щоб вкласти геометрію,
доведеться змінити форму — тобто все одно новий тип, лише з брехливим іменем. **Варіант 1 правильний.**

**Q2 — dockHints САМ достатній; edgePort-rule як Rust-вхід НЕ потрібен.** TS комбінує правило+геометрію
в `staffEdgeBoxForPosition:65-80` (theme-залежно: `resolvePersonLayout`/`figmaRowAvatar` читають style/тему),
а R1 §6 свідомо тримає резолв теми в TS. Результат комбінації — наявність/відсутність figma-hint.
Rust `visual_person_edge_box` (staff_edge_box.rs:106-144) вже кодує це БЕЗ окремого правила. Отже A2.5
потребує ЛИШЕ dockHints-геометрію; правило лишається TS-темою (ADR §21, _r1-boundary:138).

**Q3 — edgePort-rule-вхід у Rust = YAGNI (мертвий placeholder).** Нуль консюмерів зараз. Майбутній
A3/A4 TS-адаптер будуватиме dockHints, виконуючи логіку `staffEdgeBoxForPosition` у TS (СПОЖИВАЄ правило
там) і віддаючи Rust ГЕОМЕТРІЮ, не правило. Щоб правило стало РЕАЛЬНИМ Rust-входом, Rust мусив би сам
обчислювати tile (знати avatar-геометрію/тему) — що §6 віддає TS. Тобто консюмера `edge_ports` немає ні
зараз, ні за чинною межею. Рекомендація: при внесенні dockHints **видалити мертве `edge_ports`/
`StaffEdgePortInput`** (regen rust-types.ts); якщо власник лишає як хедж на «правило-в-Rust колись» —
то це спекулятивно проти §6, позначити явним YAGNI-коментарем, НЕ зливати з dockHints.

**Q4 — вердикт по зрізу типу: internally-tagged enum ВИТРИМАЄ; `#[serde(flatten)]` — ПРИБРАТИ.**
- `#[serde(tag="layout")]` на enum зі struct-варіантами + `#[serde(rename)]` полів: ts-rs v10 з активним
  serde-compat згенерує рівно `{ layout:"gojs-row", cardY,cardH,countBarH } | { layout:"figma-row",
  tileX,tileY,tileSize }` — структурно = `PersonEdgeVisualHints` (staffEdgeGeometry.ts:2-15). НИЗЬКИЙ ризик
  (serde-compat доведено працює в репо).
- `#[serde(flatten)]` з internally-tagged enum — ДВІЧІ ризик: (а) ts-rs flatten надійний для struct→struct
  (intersection), але flatten ЕНУМА — слабке/непокрите місце; (б) serde flatten + internally-tagged має
  відому ваду десеріалізації (content-buffer vs tag-peek). У репо flatten НЕ вживається ніде — не місце
  першого експерименту на контрактному типі.
- **Альтернатива (рекомендована):** прибрати flatten, вкласти hint полем:
  `pub struct StaffDockHintInput { pub id: String, pub hint: StaffDockHint }` → генерує
  `{ id:string, hint: StaffDockHint }`, а `StaffDockHint` === `PersonEdgeVisualHints` (re-export з layoutBridge).
  Дротова форма `{id, hint:{layout,...}}` замість `{id, layout,...}` — несуттєво, бо вхід будує TS-адаптер;
  зате нуль flatten-ризику й тип-дзеркало. f32→number round-trip безпечний (як решта метрик).

### ВЕРДИКТ
Варіант 1 (окремий dockHints) + БЕЗ окремого edgePort-rule-входу в Rust (YAGNI, видалити edge_ports).
Зріз типу: internally-tagged enum ОК; flatten ПРИБРАТИ → nested `hint: StaffDockHint`.
