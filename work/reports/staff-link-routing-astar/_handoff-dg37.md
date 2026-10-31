# Handoff dg37 — ШПС лінії зв'язку: холодний старт наступної сесії

**Дата:** 2026-10-31. **Гілка:** `feat/t126-staff-rust-geometry` (локально, НЕ пушено, ahead ~33).
**Попередній handoff:** `_handoff-dg33.md` (архітектура/пайплайн — досі чинний для базису).
**Задача:** T128 — `work/tasks/T128-staff-link-routing-astar.md`.

---

## 0. TL;DR — де ми і що НЕ так

Ціль: таб `staff-mock3` має виглядати як мокап-еталон `ШПС лінії зв'язку.html` — **0 перетинів І рівні
(чисті, мінімум поворотів) лінії РАЗОМ**. Мокап HUD = `0/0/0/0/0` на 50 зв'язках, лінії рівні.

**Що сталося (чесно):** за сесію ми ганялися за МЕТРИКОЮ `cross`, а не за ЯКІСТЮ. Останній коміт `c7aed85`
(parent-eval) дав `cross=0`, АЛЕ `turns=140, excess=34` — лінії перетворились на мішанину сходинок, і порядок
департаментів НЕ як у мокапі. **Власник: «нас не туди понесло, це brute-force хак, не той метод».**

**РІШЕННЯ ВЛАСНИКА (діє зараз):** код НЕ чіпати, спершу **дослідити правильну методологію** + **емуляцію**
мокап-vs-наш, знайти концептуальну розбіжність, і переробити ПРАВИЛЬНО (відомий layered/Sugiyama-метод), а не латками.

---

## 1. Стан git (коміти dg37-арки)

```
c7aed85 feat(t128): dg37 — S1 + multi-source parent-eval → mock3 cross 6→0   ← ОСТАННІЙ, ПІД СУМНІВОМ (потворно)
72008be fix(t128): dg37 T-S — dept-less singleton біля батька; cross 9→6
f47cd46 feat(t128): dg37 T-A0 — метрик excess_turns + baseline; cross=9 (не 0)
c079226 docs(t128): dg37 spec-flow крок 2 — spec+plan+tasks (GATE1+2)
7571de2 fix(t128): dg35 — оживити tree-block (розчепити deptGrouping від роутера)
c74bbd6 feat(t128): крок 1 — дерево-блоковий staff layout за прапором
```
**Незакомічено:** `work/tasks/T128-...md` (оновлений опис dg37) — закомітити при нагоді.

**DEV-прапори на mock3** (`packages/demo/src/app/tabConfigs.ts` ~131-134):
`staffUseAstar:true` · `staffDeptGrouping:true` · `staffTreeBlockLayout:true` · `staffMultiSourceParentEval:true`.
⚠️ Останній (`multiSourceParentEval`, коміт c7aed85) — це той brute-force хак, що дав потворний вигляд.
**Імовірно його треба ВИМКНУТИ/ВІДКОТИТИ** після дослідження (рішення — за висновками).

---

## 2. 🔴 ПІДВОДНІ КАМЕНІ — що вже пробували і ЧОМУ воно НЕ працює (НЕ повторювати!)

Корінь 6 перетинів на mock3 — НЕ routing, а **розкладка** (мульті-джерельні департаменти). Усі routing-спроби провалились:

| Спроба | Що робила | Результат / чому провал |
|---|---|---|
| **A — bus-консолідація** | об'єднати ребра одного керівника в шину | 0/6 — на mock3 fan-out майже нема (кожне ребро єдине) |
| **B — order-by-target** | сортувати доріжки за X цілі | РЕГРЕС 6→10; occupancy забороняє ЗБІГ, а не H×V-ПЕРЕТИН |
| **channel-lane** | reorder доріжок у топ-каналі | не працює (6→6+); реальна геометрія не така, як дизайн припускав |
| **low_traverse** | опустити traverse у смугу над рамкою | смуга лише ~14px (рамки y=280, віяло y=266) — не влазить 2 лінії |
| **tierGap↑** | більший вертикальний відступ | зазор fan→рамки СТРУКТУРНО фіксований (`frame.y−14`, staff_router.rs:410) — НЕ відкривається |
| **flat-bus** | рівна шина для ceo-дітей | РЕГРЕС 6→8; «бампи» на лініях НЕСУЧІ (уникають перетинів) |
| **parent-eval (c7aed85)** | brute-force перебір parent мульті-деп, min-cross | cross 6→0 АЛЕ turns 140, ПОТВОРНО, порядок ≠ мокап |

**Ключові структурні факти (доведені probe'ами):**
- Віяло ceo ЖОРСТКО на `frame.y − 14` (staff_router.rs:410 FRAME_MARGIN); `vgap` рухає рядок ceo І рамки РАЗОМ
  (staff_layout.rs:976). **Немає важеля підняти віяло окремо** → «смуги» між тірами не існує.
- Мульті-джерельні департаменти (ДАНІ mock3): `ana ← ah(cfo/fin) + bi(cto/dev) + da(secondary ceo)`;
  `sec ← sch(ceo) + ib(cto/dev)`. Вони стоять далеко від джерел (ana≈5600 праворуч від fin=1172 і dev=4862) →
  довгі крос-деп лінії ріжуть віяло ceo = джерело перетинів.
- Поточний вибір block.parent деп = detached-root із ЛЕКСИЧНО найменшим id батька (staff_layout.rs:779-787) —
  арбітрарно, ігнорує перетини. Це справжній корінь.
- §3.1 ШИНА структурно НЕ реалізована (лише емерджентний колінеарний збіг). Кожне ребро A*-иться окремо → сходинки.

**Чому brute-force parent-eval хибний:** оптимізує лише `cross` (топологію), ігнорує `turns`/вигляд; дорогий
(≤12 повних layout+route); дає порядок департаментів НЕ як мокап; візуально бридко.

---

## 3. ⏳ IN-FLIGHT дослідження (перевірити ПЕРШИМ ділом у новій сесії)

Дві задачі запущені перед чисткою сесії. **Перевір, чи файли НЕ порожні; якщо порожні — ПЕРЕЗАПУСТИ (брифи нижче):**

1. **Емуляція мокап vs наш** → `work/reports/staff-link-routing-astar/_emulation-mockup-vs-ours-dg37.md`
   Мета: прогнати ТІ САМІ дані (mock3=shps-links.js DEPTS/POS) через мокап (shps-links.js у node) і через наш
   `compute_staff_geometry`, витягти координати+лінії обох, знайти РОЗБІЖНОСТІ (розстановка/порядок/точки
   приєднання/метод побудови ліній), і головне — **ЧОМУ мокап-лінії рівні, а наші зигзаг** (1-2 кореневі відмінності).
   ⚠️ no-verbatim: shps-links.js ЧУЖИЙ — читати/запускати для розуміння, але НЕ копіювати код у продукт, у звіті
   описувати метод СВОЇМИ словами.

2. **Стандартна методологія** → `work/reports/staff-link-routing-astar/_research-standard-methods-dg37.md`
   Мета: як роблять ПРАВИЛЬНО — Sugiyama (layer→crossing-min через ПОРЯДОК вузлів, НЕ brute-force→coordinate-
   assignment для ПРЯМИХ ліній→routing), ELK orthogonal, GoJS TreeLayout, d3-dag/dagre — як досягають
   «чисто + 0-cross РАЗОМ», і що ми робимо не так концептуально.

**Наступний крок після обох:** звести → чесна картина «де ми концептуально не туди» + ПРАВИЛЬНИЙ метод →
переробити. Потім нова spec-flow-ітерація.

### ✅ ДОСЛІДЖЕННЯ #2 ЗАВЕРШЕНО — КЛЮЧОВИЙ ВИСНОВОК (повний: `_research-standard-methods-dg37.md`)

**ГОЛОВНЕ:** «чисто + 0-cross» — це НЕ дві метрики, що балансує роутер, а ОДИН НАСЛІДОК правильного
ПОРЯДКУ вузлів + правильних КООРДИНАТ. Роутер лише вимальовує вже-чистий результат. Наша помилка — переклали
обидві цілі на геометричний пошук (A*, brute-force parent-eval), який за побудовою НЕ має важелів ordering'у й
глобального coord-assignment → потворний локальний оптимум.

**ПРАВИЛЬНИЙ КОНВЕЄР (Sugiyama, заміна нашого tree-block+per-edge-A*+brute-parent-eval):**
1. tier assignment (рівні).
2. **ORDERING** — crossing-min через ПОРЯДОК вузлів у шарі (barycenter/median layer-by-layer sweep; NP-повна
   задача розв'язується евристикою перестановок, НЕ геометрією). Крос-деп ребра ВРАХОВУЮТЬ тут: мульті-джерельний
   вузол тягнеться до СЕРЕДНЬОГО своїх джерел (barycenter) — це замість brute-force parent-eval!
3. dummy-ланцюги для довгих крос-ребер.
4. **COORDINATE-assignment** (Brandes–Köpf, є erratum 2020; або network-simplex x-coord) → ПРЯМИЗНА ліній
   (вирівнювання вузлів+dummy у вертикальні блоки навколо медіанного сусіда). Прямизна — наслідок КООРДИНАТ, не роутера.
5. **bus/trunk-routing** деревних ребер (спільний стовбур + короткі відводи) + nudging-канали (розведення
   паралельних пучків, VPSC) для залишкових крос-деп ребер. Орто bend-min — ГЛОБАЛЬНИЙ (min-cost flow, Tamassia TSM),
   не per-edge A*.

**Що ми робимо НЕ ТАК:** мінімізуємо перетини геометрією (канон — порядком ДО роутингу); роутимо per-edge жадібно
(прямизна/bend-min — глобальні); не використовуємо bus для дерева; не відділяємо детерміноване дерево (0 перетинів
безкоштовно) від крос-деп ребер (їх враховувати при ВИБОРІ ПОРЯДКУ через barycenter, не brute-parent-eval).
Джерела: Wikipedia Sugiyama, Brandes–Köpf LNCS+erratum, ELK ref, GoJS TreeLayout, yFiles/libavoid, dagre/d3-dag, Tamassia.

⚠️ Це ВЕЛИКИЙ переробіток (layered-конвеєр). Варто обговорити з власником обсяг: повний Sugiyama-конвеєр у Rust vs
поетапно (спершу ORDERING через barycenter замість brute-parent-eval → вимкнути multiSourceParentEval; потім
coordinate-assignment; потім bus-routing). Ймовірно — нова spec-flow-ітерація з цим методом як основою.

### ⏳ Дослідження #1 (емуляція) — статус на момент handoff
`_emulation-mockup-vs-ours-dg37.md` — перевір, чи завершено (мало би дати конкретні координатні розбіжності
мокап-vs-наш + підтвердити, що мокап використовує саме ordering+coord-assignment). Якщо порожнє — перезапустити.

---

## 4. Що МАЄ бути виконано (план, після дослідження)

1. **Звести обидва дослідження** → визначити правильний метод і конкретну концептуальну розбіжність.
2. **Рішення по parent-eval (c7aed85):** найімовірніше ВИМКНУТИ `staffMultiSourceParentEval` на mock3 (а код
   правила лишити як борг/референс) АБО відкотити коміт — бо він дав потворний вигляд. Підтвердити з власником.
3. **Переробити ПРАВИЛЬНО** (не метрика-хак): імовірні складові —
   - **Layout:** crossing-minimization через ПОРЯДОК департаментів/дітей у шарі (barycenter/median), а не brute-force;
     + розміщення мульті-джерельних деп між джерелами (coordinate-assignment).
   - **Routing:** справжня §3.1 шина (рівний trunk per-manager + прямі спуски) + резерв-першими (мокап так робить:
     прямі ceo-елбоу резервуються, потім крос-деп A* обходить).
   - **Метрика якості:** вже є `excess_turns`/`true_turns` (T-A0) — гейт «turns НЕ зростають» + візуал власника.
4. **R3-a (zoom-баг, окремо):** власник помітив — РІЗНИЙ зум дає різні метрики (zoom 0.28: `dept=5, marked=18,
   bends=88`; zoom ≥0.48: `0/0/..., bends=126`). Роутинг НЕ інваріантний до LOD (порушує §8.3). Far-render-баг.
5. Пізніше T128: C-flip (prod detour→A*), T10 golden rebaseline, T12 (прибрати detour).

---

## 5. Технічний довідник

- **Пайплайн:** `staffLiveGeometry.ts` → `buildStaffLayoutInput.ts` → Rust `compute_staff_geometry`
  (`packages/core/src/staff_layout.rs`) → routing `staff_router.rs`/`staff_routes.rs` → `adaptStaffGeometry.ts` → Pixi.
- **Ключові функції:** `pack_tree_block` (staff_layout.rs ~733+, блок-дерево депів), `group_staff_by_department`
  (~579), routing `route_scene` (staff_router.rs), `route_stats` (детектор cross/over/card/near/dept).
- **Метрика (T-A0, f47cd46):** `true_turns`/`turn_limit`/`excess_turns` у staff_routes.rs (поруч із bends ~668);
  у HUD-рядку `A*:` поля `turns=`/`excess=`. `is_internal` pub(crate) у staff_router.rs:889.
- **Прапор-контракт WASM↔TS:** додавати Rust-поле у `packages/core/src/types.rs` (дзеркально `tree_block_layout`:
  serde camelCase + `ts-export ts(optional)`) → `build:wasm` регенерує `rust-types.ts` → TS-обв'язка у
  `RenderConfig` (render/types.ts) + buildStaffLayoutInput.ts + staffLiveGeometry.ts + tabConfigs.ts.
- **Гейти:** `cargo test`/`clippy --all-targets -D warnings`/`fmt --check` (з packages/core); `npm run build:wasm`;
  `npm run test -w @org-hierarchy/sdk` (1231); `-w @org-hierarchy/demo` (108); `npm run typecheck`; `check:docs`.
  ⚠️ CTO-RESEARCH відстав >25 комітів — `check:docs` червоніє на цьому (оновити перед пушем).
- **Мокап-еталон:** статик-сервер `python3 -m http.server 8799 --bind 127.0.0.1 --directory ~/Downloads/mock3`
  (вже може бути піднятий). Файл `ШПС лінії зв'язку.html`. Спека вимог: `_SPEC-source-shps-lines.md` (= промотовано
  в `docs/REQUIREMENTS.md §10`). ⚠️ `shps-links.js` — third-party (no-verbatim).
- **Браузер CDP (claude-in-chrome) ЗАВИСАЄ** на demo-табі (screenshot/navigate timeouts) — не покладатись,
  власник дивиться сам. Емуляцію/виміри робити в node/probe, не скриншотами.
- **Дані mock3:** `packages/demo/src/scenarios/mock3Shps.ts` (DEPTS 10, POS 50; `/tmp/ta0-mock3.json` — вилучений вхід).

## 6. Процес (вимоги власника)
- **R6:** критик-ПЕРЕД на пастки кожного зрізу + незалежний review-ПІСЛЯ (крос-модель: автор Codex → рев'юер Claude).
- **Код пише Codex через exec:** `codex exec --approve-for-me --skip-git-repo-check - < prompt.txt` (НЕ codex-rescue
  агент — його Sonnet-драйвер падав на safeguard). TDD, НЕ worktree, НЕ npm (TS-обв'язку+build:wasm робить координатор).
- **Probe-first:** гіпотезу доводити ізольованим probe ПЕРЕД інтеграцією (це врятувало від кількох марних правок).
- **Жива нота (Obsidian):** `1 - Notes/Sessions/2026-10-31 T128 staff tree-block layout + far-render.md` (інкрементально).
- **Коміти:** локальні, не пушити; `-F` для меседжу (zsh їсть беквоти в `-m`); атрибуція Co-Authored-By Claude Opus 4.8.
- **Мова — українська.**

## 7. Acceptance (ціль)
Мокапові `0/0/0/0/0` (cross/over/card/near/dept) **І** рівні лінії (мінімум поворотів, `excess_turns→0`), **однаково
на всіх зумах** (R3-a). Фінал — візуальна звірка власником з мокапом. НЕ «cross=0 будь-якою ціною».
