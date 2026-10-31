# T128 / staff A* routing — HANDOFF (dg33 → наступна сесія)

**Гілка:** `feat/t126-staff-rust-geometry`. **НЕ запушено.** Усе локально, кожен крок — повний R6.
**Стан:** A*-роутер зроблено й ВАЛІДОВАНО (R3 власником: «схоже, ближче до правди»). Відкрите —
**layout** (корінь зигзагів) і **стилізація 1:1**. Деталі нижче — читай, не перечитуй мокап з нуля.

---

## 0. TL;DR що робити далі (вибір власника, обидва підтверджені)
1. **Дерево-блоковий layout** — справжній фікс «як мокап» (прямі + без перетинів). Корінь зигзагів =
   наш layout ПЛАСКИЙ, мокапів — ДЕРЕВО блоків-депів. Див. §5 — там готовий алгоритм і де правити.
2. **Стилізація 1:1 під mock3-картки** (власник дав go). Див. §6.
Вимір-оверлей (HUD) уже є — міряє прогрес (bends/cross) наживо (§4).

---

## 1. Що зроблено цієї сесії (коміти, усі R6)
T1 було до сесії. Цієї сесії (dg33):
- `088ee7f` T2 (безумовний card-pad) + T3 (`build_corridor_grid` — статична розріджена сітка wall()+mH/mV)
- `5631f30` T4 (`astar_route` — A* 3-стан/turn30/deptOK/250k/best-effort)
- `d3878d5` T5 (`Occupancy`+`route_edges` — доріжки §5.4, ваги 6000/4000/0.15)
- `8fc1d3b` T6-крок1 (secondary-порт `cx+SX` + un-ignore AC10 через A*-харнес)
- `8bbb7a2` T6-крок2 (`route_edges_ripup` + `route_stats_detailed` bad-множина)
- `8105eec` T7 (`route_scene` — int→елбоу `route_ortho`/cross-ext→A*, класифікація (dept,part))
- `d5916ca` T7-гібрид (брудний int-елбоу гнеться через A* — щільна рамка)
- `43728dd` T8(A) (прод-wiring `resolve_staff_routes`+`route_via_astar` за перемикачем, дефолт DETOUR)
- `0d791a9`+`8a06e22` R3-prep (рантайм `useAstar` + mock3-демо-таб)
- `ab83373` R3 вертикальний відступ нод (не допомогло зигзагам — див. §3)
- `bebbdfb` R3 вимір-оверлей (stats→diagnostics + demo HUD)

**Гейти скрізь зелені:** rust 184 · SDK 1231 · demo 108 · clippy -D warnings · fmt. AC10 = 0/0/0/0/0 на 9 §10.1-схемах.

---

## 2. Архітектура A*-роутера (НЕ перечитуй мокап — ось мапа)
Еталон = `~/Downloads/mock2/shps-links.js` (T128-мандат; переказ, не копія — no-verbatim).
Повна схема мокап↔наш: **`_algo-comparison-dg33.md`** (стадії A–H + таблиця розбіжностей; §5 там = поточний статус).

Пайплайн (усе в `packages/core/src/staff_router.rs`, єдиний прод-вхід `route_scene`):
- **`build_corridor_grid`** (T3) — статична РОЗРІДЖЕНА сітка: `wall()` = coord-lines країв перешкод + midpoint
  + ±lane у gap≥2px; дві реберні матриці `mH`/`mV` прохідності ТІЛЬКИ по картках (pad=8). Рамки → лише координати.
- **`astar_route`** (T4) — A* одного ребра: 3-стан (node×dir), turn-penalty 30, Manhattan, occupancy-ваги,
  deptOK (вхід у ціль зверху §10.2), 250k→best-effort(failed). f64-вартість, heap total_cmp+seq (детермінізм AC8).
- **`Occupancy`/`occupy`/`route_edges`** (T5) — доріжки §5.4: foreign edge +6000 / node +4000 / own lane ×0.15.
- **`route_edges_ripup`** (T6) — single_pass + ≤4 проходи rip-up (детектор→bad→re-route). `route_stats_detailed`=bad-множина.
- **`route_scene`** (T7) — класифікація: int (той самий (dept,part), НЕ secondary) → `route_ortho`-елбоу (reuse зі
  `staff_routes`, pub(crate)) + occupy FIXED; cross/ext → A*. rip-up re-routить УСІ bad (int-елбоу теж гнеться в
  щільній рамці — гібрид). Secondary (bypass, 2 батьки) → `cx+SX`-порт (інакше дві лінії колінеарні).
- **`route_stats`** (T1) — детектор §10.4: cross/over/through_card/near_card/through_foreign. ОДНА істина з rip-up і гейтом.

**Відомі СВІДОМІ розбіжності від мокапу (не дефекти):** int-елбоу corridor=midY (конвенція `route_ortho`, не LV/2);
org→root ext лишається A* (мокап елбоу :110); int-ключ (dept,part) не bare dept (під per-part детектор); f64 tie-break
(спека: не байт-паритет). Повний список — `_algo-comparison-dg33.md §5`.

---

## 3. Зигзаги = LAYOUT, не роутинг (ВАЖЛИВО, не копай роутинг)
Власник помітив зигзагі на `da`/`cto` у R3. ДІАГНОСТОВАНО (вимір на mock3):
| | зламы | перетини |
|---|---|---|
| single-pass (rip-up off) | 90 | **12** |
| rip-up (поточне) | 112 | **0** |
- Rip-up НЕ контортить дарма — прибирає **12 реальних перетинів** крос-деп ліній. Прямі-з-перетинами ⇄ гнуті-без.
- verticalGap 120→300 → **ТІ САМІ 112 зламів** (weaving масштаб-інваріантний; гіпотеза «більший відступ» ХИБНА).
- **КОРІНЬ:** наш layout ПЛАСКИЙ (депи в ряд, `staff_packing` `card_x += column_width+gap`); мокапів — ДЕРЕВО блоків.
  Крос-деп лінії (cto→bi, cto→ib, acc→aud, cfo→ah…) тягнуться через ряд → перетини. Мокап вкладає ana під fin
  (бо ah→cfo), qa під dev → лінії короткі, без перетинів.
Висновок: A*-роутер коректний. Щоб «як мокап» — треба LAYOUT-дерево (§5).

---

## 4. Як запустити R3 + вимір-оверлей
- `npm run dev` → таб **«ШПС · A* (mock3)»** (`?tab=staff-mock3`). Дані = mock3 shps-links.js (DEPTS+POS).
- **HUD унизу праворуч** (`#astar-metrics`): `A*: cross=.. over=.. card=.. near8=.. dept=.. bends=.. marked=.. edges=..`.
  Міряє «гарність ліній» наживо (= мокапів stats-панель). Код: `route_via_astar`→diagnostics; demo `App.onLayoutDiagnostics`.
- **Перемикач A*:** рантайм dev-поле `useAstar` на `StaffLayoutInput` (serde default false) ← `RenderConfig.staffUseAstar`
  ← `buildStaffLayoutInput`. Дефолт DETOUR (golden цілий). Лише mock3-таб ставить `staffUseAstar:true`.
- **ngrok:** `ngrok http 3000` (вже є на ПК); публічний URL через `curl localhost:4040/api/tunnels`.
- **⚠️ Після Rust-зміни ОБОВʼЯЗКОВО `npm run build:wasm`** (demo бере закомічений `pkg/*.wasm`) + перезапуск dev-сервера.

---

## 5. ЗАВДАННЯ: дерево-блоковий layout (справжній фікс під мокап)
**Алгоритм мокапу** (`shps-links.js:62-86`, `layout()`) — переказ:
1. Кожен департамент = БЛОК (member-и депу як міні-дерево; dept-less посади = singleton-блоки `p:id`).
2. Блок-дерево: `block.parent` = блок, що містить посаду, у яку рапортує ГОЛОВА блоку (`src`=head.parent → `blockOf(src)`).
   Тобто ana→fin (ah→cfo), qa→dev (qh→tlb), sec→dev (ib→cto) тощо.
3. **Ключ проти перетинів (рядок 79):** `b.kids.sort((a,c)=>b.rel[a.src].x - b.rel[c.src].x || POS.indexOf…)` —
   дочірні блоки сортуються за X-позицією ДЖЕРЕЛА (точки attachment у батьк. блоці) → лінії не перетинаються.
4. Розкладка (рядок 81-82): блоки як охайне дерево, діти центровані під батьком (ширина BW рекурсивно), вертикаль `y+b.h+BV`.

**Де наше:** `packages/core/src/staff_packing.rs` (пакує депи РЕГІОНАМИ в ряд) + `staff_compose.rs` (стекає яруси по
cursor_y). Члени — з `compute_org_row_tree_layout` (row-tree). Тобто у нас row-tree + плоске пакування депів, НЕ дерево-блоків.
**Що робити:** ввести рекурсивну дерево-блокову розкладку депів (вкладати блок-деп під батьк. блок, сорт за x-джерела),
замінивши/доповнивши плоске пакування. Це T126 staff-layout. ОБЕРЕЖНО: зачепить всю staff-геометрію + golden (детур-golden
теж зміниться, якщо чіпати спільний layout — краще робити за прапором/новим режимом, як A*-перемикач).
**Міряти прогрес HUD-ом** (bends/cross мають падати). Повний R6 (критик-перед на межу з існуючим row-tree обовʼязковий).

---

## 6. ЗАВДАННЯ: стилізація 1:1 під mock3-картки (власник дав go)
Ціль = вигляд картки мокапу (темна, помаранчеві акценти голів, скруглення, заголовок/ПІБ/лічильник N[M], статуси).
- **Наша картка:** `packages/demo/src/app/ShpsStaffCard.ts` (React near-zoom) + Pixi far (DiagramRenderer).
- **Еталон:** `~/Downloads/mock3/ШПС лінії зв'язку.html` розмітка картки (`shps-links.js:190` — `.card/.ct/.ava/.tx/.pos/.who/.cf/.cnt`)
  + CSS `~/Downloads/mock3/shps-panel.css`. Third-party → спостерігати дизайн, відтворювати (reference-ui-reconstruction skill),
  не копіювати код.
- Підхід: skill `design-pass`/`reference-ui-reconstruction`, браузерна звірка власником (агент без браузера). Може бути окремий
  компонент/таб, щоб не ламати staff-shps.

---

## 7. C-flip (прод-дефолт detour→A*) — чекає R3-вердикт власника
T8 зроблено як (A): перемикач, дефолт DETOUR (golden-safe). **(C)** = flip дефолту на A* + rebaseline golden (**T10**) —
гейтиться ВІЗУАЛЬНИМ R3 власника. Відкриті C-блокери (`route_via_astar` doc + `_t8a-review-dg33.md`):
- **N1:** matrix/dotted/lead-org через route_scene НЕ доведені (lead-org best_effort — вхід у рамку ззовні). Рішення
  власника: гнати їх через A* чи лишити на detour.
- **N2:** marked уже = `failed || frame_intrusion>0` (закрито в route_via_astar).
Коли власник підтвердить R3 ОК → flip `DEFAULT_STAFF_ASTAR`/обробити N1 → `UPDATE_GOLDEN=1 npm run test -w @org-hierarchy/demo -- staffGeometry`.

---

## 8. Борг / гейти
- **⚠️ check:docs PUSH-гейт ЧЕРВОНИЙ:** `work/CTO-RESEARCH.md` відстав 28>25 комітів (наслідок сесії). Перед БУДЬ-ЯКИМ push —
  рефреш брифінгу (skill `cto-research`). Не повʼязано з фічею.
- Golden (`staffGeometry.golden.test.ts`) — compare ПАРКОВАНО (`it.skip`, dg32→R4). `staff-mock3` виключено з coverage (A*-вихід не baselined).
- T128 решта відкрита: T9 (контракт-шов x/y), T11 (перф-бенч §8.4 ≤50мс/500), T12 (видалити detour), T13 (verify USAGE).

---

## 9. Мапа ключових файлів
- Роутер: `packages/core/src/staff_router.rs` (build_corridor_grid/astar_route/route_scene/Occupancy/route_stats…).
- Прод-wiring+харнес: `packages/core/src/staff_routes.rs` (`resolve_staff_routes`/`route_via_astar`/detour `staff_routes`/9 схем/AC10).
- Call-site: `packages/core/src/staff_layout.rs:~1273` (compute_staff_geometry → resolve_staff_routes).
- Контракт: `packages/core/src/types.rs` (StaffLayoutInput.`use_astar`, StaffEdgeRoute, StaffLayoutMetrics).
- Layout (для §5): `staff_packing.rs`, `staff_compose.rs`, `org_layout.rs` (row-tree).
- SDK проброс: `render/types.ts` (RenderConfig.staffUseAstar), `render/buildStaffLayoutInput.ts`, `render/staffLiveGeometry.ts`.
- Demo: `scenarios/mock3Shps.ts` (дані+layout), `app/tabs.ts`/`tabConfigs.ts`/`index.html` (таб staff-mock3 + HUD), `app/App.ts` (onLayoutDiagnostics HUD).
- Durable-артефакти сесії: `_algo-comparison-dg33.md` (схеми!), `_t3..t8a-critic/review-dg33.md` (R6), `_t8-recon-dg33.md`, `_r3-recon-dg33.md` (демо/bridge/mock3 мапа).
- Жива нота: Obsidian `1 - Notes/Sessions/2026-10-30 T128 staff link-routing A* spec-flow.md`.

## 10. Процес (нагадування)
R6 власника: критик-перед (на пастки) + незалежне рев'ю-після СУБАГЕНТАМИ на кожен змістовний крок. Артефакти в
`work/reports/staff-link-routing-astar/`. Мова — українська. Жодних worktree (гілки одного checkout). no-verbatim
third-party (мокап — переказ+path:line, дані брати можна). Коміт-меседж через `-F` (zsh їсть backticks у `-m`).
