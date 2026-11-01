# Alpha: near-view ШПС через React + CSS-tree (швидкий старт)

Статус: WIP-жива-нота. Рішення власника (2026-11-01): near-view ШПС на React, позиціонування
через CSS; дослідити й покласти алгоритми мокапів; «alpha версія / швидкий старт».

## Дослідження двох мокап-алгоритмів (переказ; третій-сторонній код не цитується)

### A. `ШПС картка v3.html` — NEAR (зблизька), розкладка чистим CSS
- Дерево = вкладені `<ul class="tree">`, що відбивають адмін-ієрархію.
- Сиблінги: flex-row `gap:18px`; верхній рівень `.top-gap gap:28px`.
- Спуск на рівень: `li{padding-top:30px}` + конектор-стем 30px (`::before`).
- Конектори: псевдоелементи `::before`(верт-стем)/`::after`(гориз-бар сиблінгів) на `<li>`,
  плюс `.kids::before`; колір `--line:#c2502a`, товщина `--lw:2px`.
- Картка: `--cw:300px`, `--clamp:3`, pos-fs 17 / who-fs 15.
- Деп-рамка `.dept`: `border 1px #3a3a40`, `radius 12`, `padding 44px 16px 16px`,
  фон `#111113`. Шапка `.dn`: h34, фон `#202023`, нижній бордер `#3a3a40`, radius 11 top
  (залита шапка, left-aligned).
- Fit: `zoom = min(1, доступна_ширина / offsetWidth)` — браузер рахує все, JS лише масштабує.
- Наслідок: КООРДИНАТ НЕМАЄ — layout дає CSS flexbox + DOM-дерево.

### B. `shps-links.js` — FAR (лінії зв'язку), розкладка обчисленням координат
- Дворівневий tidy-tree:
  1. всередині депу: bottom-up ширина = сума ширин дітей + SG·(n-1), clamp до CW;
     top-down центрування над піддеревом; `y = DPt + рівень·(CH+LV)`.
  2. між деп-блоками: той самий патерн на дереві блоків; гориз-gap BG, діти на `y + h + BV`.
- Gap-формули (ev = парне округлення), при pad=8/lane=8:
  SG=max(24,2p+2l+8)=32 · **LV=max(56,2p+4l)=56** · DP=max(28,p+2l+14)=30 ·
  DPt=HD+24=58 · BG=max(44,2p+3l)=44 · **BV=max(96,2p+8l)=96** · CW=236 CH=118 HD=34.
- LV(внутр-рівень) і BV(між-блок) РОЗЧЕПЛЕНІ окремими константами.
- Далі: A* по сітці «стін» (wall()), відступ pad від карток, крок lane; `stats()` рахує
  cross/over/card/near/dept.

## Архітектурна розвилка (ADR 0002)
Near через CSS-tree → геометрію near-band рахує браузер, НЕ Rust. Це кваліфікує ADR 0002
(«вся геометрія в Rust, поверхні читають»). Для alpha прийнятно як свідомий зріз; far/Pixi
лишаються на Rust-координатах. Записати як alpha-обсяг, не кінцевий стан T126.

## In-flight Rust WIP (декаплінг BV≠LV) — ВІДКОЧЕНО
Некомічена правка types.rs/staff_layout.rs (block_vertical_gap) ламала окремий інтеграційний
файл `tests/multi_source_parent.rs` (8 тестів, serde-конструкція без нового поля). Відкочено
(`git checkout`), бо власник обрав ОКРЕМУ версію ліби — декаплінг тепер чисто в новому модулі.

## ВИКОНАНО — Рівень 1 (калькуляція), окрема версія ліби
Рішення власника (2026-11-01): «зроби в rust окрему версію бібліотеки під це, будемо відходити
від неї». Створено ізольований модуль, НЕ чіпаючи `staff_layout.rs`:

- `packages/core/src/staff_mockup_layout.rs` — Rust-порт `layout()`: дворівневий tidy-tree,
  формули SG/LV/DP/DPt/BG/BV з pad/lane, singleton=окремий блок, детермінований вивід
  (ноди/рамки сортовані за id). Батьківство — з admin-ребер (перше = первинне).
  Типи: `StaffMockupInput{positions,reports,departments,params}` → `StaffMockupResult{nodes,frames,width,height}`.
  4 unit-тести: place-all+frame, within-dept LV(118+56), between-block BV(118+96), determinism.
- `lib.rs` — `mod` + `pub use` + wasm-обгортка `computeStaffMockupLayout`.
- `types.rs` — додано 5 типів у `export_rust_types` (ts-rs).
- `packages/sdk/src/wasm/generated/rust-types.ts` — згенеровано (StaffMockup* типи).
- `packages/sdk/src/wasm/pkg/*` — build:wasm, binding у glue.
- `packages/sdk/src/contour/bridge.ts` — `computeStaffMockupLayout` у `WasmContourModule`.
- `packages/sdk/src/wasm/layoutBridge.ts` — `computeStaffMockupLayoutWasm()` + ре-експорт типів.
- тест-мок у `staffGeometryBridge.test.ts` доповнено стабом.

Статус гейтів: `cargo test --all-features` 234+8 passed / 0 failed; `build:wasm` OK; `typecheck` OK.

## Рівень 2 (React-компоненти) — опис власника (ІНКРЕМЕНТАЛЬНО, triває)
Власник: «коли дійдеш до компонентів скажу опишу детально» + «з мокапу v3 добрати компоненти
яких нам бракує».

### Компонент «Організація» — ОДИН базовий компонент, 3 варіанти (за ярусом/роллю):
1. **Керуюча орга** (tier 1) = база + **фон**. v3: `.porg` (смугастий `repeating-linear-gradient`
   фон, dashed-рамка, лейбл «Керівна організація», summary `.xcard`).
2. **Поточна орга** (tier 2) = база + **чіп**. v3: `.org.cur` + чіп `<i>Поточна організація</i>`
   (помаранчева бордер-бейдж).
3. **Підпорядковані** (tier 3) = **бази** (плейн, без фону/чіпа).
«База» = контейнер-рамка організації; варіанти лише додають фон / чіп.

### Пошук посад — добрати з v3:
- **Стилі**: `.sbar/.sbox/.sin/.sl` (бар, інпут, дропдаун), підсвітка `mark`.
- **Чіп** «Знайдено»: `.card.found::before{content:"Знайдено"}`.
- **Загальна поведінка діаграми при знайденій посаді** (v3 `focusCard`): розгорнути згорнуті
  предки, затемнити не-знайдені (`.org.focus .card:not(.found){opacity:.38}`), outline+pulse
  знайденої, плавний скрол у центр.

### ОЧІКУЄ далі: картка посади / деп-рамка / позиціонування (абсолют за координатами vs CSS-tree),
### нова вкладка vs заміна рендера. Наш бік (що є / чого бракує) інвентаризую, коли список повний.
