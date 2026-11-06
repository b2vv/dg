# Ship-report — Extensibility R1–R5 + R11 (SDK розширюваність)

> **СТАТУС: КОД-ПОВНО (6/6 закомічено на `feat/extensibility`).** Чекає важких гейтів (спільний dist, після «ок» cass) + owner-review §6 + пуш у main. Шість секцій + post-deploy, дельта від роадмапу/планів.

**Мандат власника (2026-11-06):** зробити ВЕСЬ названий реєстр роадмапу (R1–R5, R11) автономно, multi-agent за AI
Factory (spec-flow → гейти → Codex-кодери + gate-reviewer), максимальна паралель; **пуш у main — коли весь план готовий**.
**Гілка:** `feat/extensibility` off main `da0e184` (після D3+D1). **Джерело:** `work/ROADMAP-extensibility.md`.

## 0. Зведення статусу

| # | Фіча | Коміт | Гейти | Статус |
|---|---|---|---|---|
| R1 | Pixi hover far-LOD (related-dim) | `b40118a` | GATE2 GREEN, Std+Spec — | ✅ DONE |
| R5 | marquee мультивибір (Shift+drag, additive) | `0c78c32` | GATE2 GREEN, Std+Spec GREEN | ✅ DONE |
| R4 | конфігуровний зум (wheel/keyboard/анім.) | `3550b86` | GATE2 GREEN, Std+Spec GREEN | ✅ DONE |
| R3 | Pixi node-view-фабрики + D2 | `173d676` | GATE2 + Std+Spec GREEN | ✅ DONE |
| R2 | React injection-контракт (interaction props) | `98f7ff1` | GATE2 + combined GREEN | ✅ DONE |
| R11 | обгортки як obstacle-регіони (Rust A*, frames) | `9e8130c` | GATE2 + geometry-judgment + combined GREEN | ✅ DONE (frames; T113-grid відкладено) |

**Фінальна верифікація гілки (не чіпає dist):** SDK 186 файлів / 1587 тестів / 0 падінь; demo 19 / 135 / 0; Rust cargo 218 unit + 9 integration + clippy; typecheck -w + lint + check:docs — усі зелені. Коміти: R1 b40118a · R5 0c78c32 · R4 3550b86 · R3 173d676 · R2 98f7ff1 · R11 9e8130c (поверх main da0e184 = D3+D1).

## 1. Зроблено (дельта від роадмапу)

- **R1 — far-LOD hover паритет (dim-only).** D1 зробив hover єдиноджерельним на near/mid; R1 зняв far-виняток
  (`DiagramRenderer.paintInteraction` `view.lod!=='far'`) → related-dim і здалеку. `setHovered`/вузли НЕ чіпано (far-ring
  протік би в не-opt-in legacy → byte-for-byte). Під D1-opt-in.
- **R5 — marquee.** Shift-клік toggle уже був; R5 додав рамку: чистий `render/marquee.ts` (rect+AABB-перетин+поріг),
  жест Shift+лівий-drag у `DiagramRenderer` (world-capture, пан придушено лише при Shift+sink, tapAfterDrag), фасадний
  `onMarquee`-колбек, marquee ЗАВЖДИ additive (легенда). Opt-in: без `onMarquee` — Shift+drag панує байт-у-байт.
- **R4 — зум конфіг.** `wheel: { behavior, gestures{zoom, panHorizontal} }`, чистий `render/wheelConfig.ts`; Mac
  PRIORITY (ctrl||meta зумлять — trackpad pinch збережено); клавіатурний зум (tabindex); анімований `zoomBy` із
  синхронним `getZoom` (pendingZoom). preventDefault лише коли SDK діє. Прибрано мертвий `isZoomWheel`.
- **R3 (у роботі) — node-view-фабрики.** `nodeViewFactory.ts` (union простих/retained фабрик, пул, mark-and-sweep,
  error-containment); `DiagramRenderer` генералізовано D1-hover на інтерфейс `InteractiveNodeView` (PersonNodeView/
  OrganizationNodeView реалізують), хост-root у обгортці `HostNodeView`; фабрика-wiring із fallback. C: `nodeView` конфіг.
- **R2 (у роботі) — React interaction props.** `PromoteSlotProps` += `selected/hovered/onSelect/onHover`; per-slot
  imperative-refresh (не повний rebuild); фасад експонує `isSelected/isHovered/selectNode`; демо (C) зв'язує overlay.
- **R11 (у роботі) — обгортки-перешкоди.** A*-роутер `route_scene`: frame-обгортки в обстакл-список + геометричне
  containment self-exclusion (вкладеність авто) + clearance + NaN-guard. T113-collapsed-grid ВІДКЛАДЕНО (інша коорд-система).

## 2. Протестовані сценарії
- R1: 16 тестів (far-dim, null-source byte-for-byte, 0-related, selection>hover far, emphasis).
- R5: 47 тестів (marquee pure 31 + renderer 11 + facade 5; Shift-gate, pan-suppress, tapAfterDrag, additive, opt-in).
- R4: 29 тестів (Mac-pinch, behavior-modes, keyboard, zoomBy-sync, fallback).
- R3: nodeViewFactory 8 + renderer 77 (пул update/sweep, interface hover, fallback). C — у роботі.
- R2: overlay 44 + facade (R2-B 3 + 4 мутації). C-demo — у роботі.
- R11: 6 фокус cargo-тестів (foreign-detour, nested self-exclusion, clearance, NaN-skip, parity). 3 A*-integration — судження.
- **Рівні:** unit (чисті модулі), integ (повна діаграма rstest), cargo (Rust routing). Повний root `npm test`/`build`/
  `cargo test`/`build:wasm` — на фінальному етапі (спільний dist, після «ок» cass).

## 3. Неочевидні знахідки (що піймали гейти/impl — усе до коду або з чесним флагом)
- **D1 opt-in** (попередній зріз): хост отримував би related-dimming без підписки → загейтили (урок, що повторюється).
- **R5 F1:** порожній лівий-drag уже панує камеру → marquee на Shift+drag, не плейн (інакше регресія навігації).
- **R5 F1b:** Shift перевантажений (тригер+additive) → marquee завжди additive (легенда «рамка=мультивибір»).
- **R4 B1:** Mac trackpad pinch = синтетичний ctrl+wheel → «ctrl→meta remap» зробив би pinch паном; виправлено на priority.
- **R3 B1:** `paintInteraction` гейтований на `instanceof PersonNodeView` → плоска обгортка не отримала б hover; генералізовано на інтерфейс.
- **R3 B2:** хост-фабрика без try/catch валила б увесь рендер (live ШПС) → error-containment+fallback.
- **R2 AC3:** interaction через `notifyPromoteSync('structural')` = повний rebuild на кожен hover → per-slot refresh.
- **R2 topology:** overlay створює ХОСТ, не фасад → host-wired seam + demo-таск.
- **R11 B1:** цілив у A*-роутер, що OFF; detour — дефолт хоста. Переспрямовано на A* (рішення власника dg31) з чесним флагом host-visibility.
- **R11 B2:** self-exclusion однорівнева → геометричне containment для вкладеності.
- **R11 T113:** collapsed-grid в іншій координатній системі → відкладено у follow-on.
- **Операційне:** фоновий `codex exec` без `< /dev/null` висне на stdin (у пам'ять).

## 4. Скріншоти
Нема — усе на рівні бібліотеки (unit/integ/cargo). Візуальна перевірка — ручні рядки приймання на стенді хоста,
коли хост увімкне відповідні opt-in (animate/nodeView/onMarquee/wheel) та A* (для R11).

## 5. User-flow (для хоста) — усе opt-in, без opt-in байт-у-байт
- Hover far (R1): автоматично консистентний із near/mid під interaction-opt-in.
- Marquee (R5): хост дає `onMarquee` → Shift+drag додає ноди; хост малює гумку.
- Зум (R4): `wheel`-конфіг; клавіатура; анімована кнопка. Mac pinch зберігся.
- Node-view (R3): `nodeView`-фабрика малює власний Pixi-візуал; SDK розміщує.
- React-картка (R2): `PromoteSlotProps.selected/hovered/onSelect/onHover` — типізовано, єдине джерело з Pixi.
- Лінії (R11): огинають обгортки (коли A* увімкнено).

## 6. Ризики й обмеження + 🔴 OWNER-REVIEW (рішення, grounded роадмапом, на твій підпис при пуші)
1. **R5 модель жестів:** marquee = Shift+drag; **always-additive** («рамка не очищає вибір»). Grounded легендою порталу.
2. **R4 `panHorizontal:false` деф:** прибирає нинішній Shift+wheel горизонт-пан (Shift→вибір). Opt-out `'shift'` повертає.
3. **R3 API-ергономіка** view-фабрик (`NodeViewContext`, union форма) — твій смак «простіше за GoJS».
4. **R11 ціль = A* (не detour):** R11 доходить до хоста ЛИШЕ коли A* увімкнено (окрема міграція, R3-visual-гейт+golden).
5. **R11 T113-collapsed-grid-докінг ВІДКЛАДЕНО** (координатна проблема) — follow-on; R11 покриває frame-обгортки зараз.
6. **R11 3 A*-integration expectations** змінились (менше перетинів) — рабаселин лише після підтвердження (на судженні).
- Спільний dist: важкі гейти (root typecheck/build/build:wasm) + пуш — після «ок» cass.
- emphasis {found,highlight}, focused/a11y — поза цими зрізами.

## Post-deploy
- [x] Усі 6 закомічені (SHA вище). SDK-рівень зелений: SDK 1587/0, demo 135/0, cargo 218+9, typecheck -w + lint + check:docs.
- [x] **build:wasm НЕ потрібен** — R11 не чіпав types.rs (WASM-межа недоторкана).
- [ ] Важкі гейти (пишуть у СПІЛЬНИЙ dist): root typecheck + build + повний root `npm test` — ПІСЛЯ «ок» cass.
- [ ] dist перезібрано; cass повідомлено фінальний SHA + перелік публічних змін.
- [ ] **Owner-review §6** (6 рішень) пройдено.
- [ ] Мерж `feat/extensibility` → main (ff) + push.
- [ ] Стенд: ручні сценарії під opt-in (+ A* для R11).
