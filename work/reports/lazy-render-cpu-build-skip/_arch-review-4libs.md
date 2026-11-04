# pattern-architecture-review — проєктована архітектура «4 міні-ліби» (viewport-virtualization)

> Об'єкт (підтверджено власником 2026-11-04): рев'ю **проєктованого** розкладу SDK на 4 міні-ліби
> (hexagonal ports&adapters) як layout нової підсистеми virtualization. Доказова база — наявний
> demo-windowing + SDK render-seam. Мета — розв'язати напругу §6 (data-window vs draw-window) ПЕРЕД кодом.
> Режим скіла: лише читання + рекомендації; код не міняю.

## Заземлення на код (прочитано 2026-11-04)
- `viewportWindow.ts` — pure-арифметика (header: «nothing here needs Pixi to be tested»). Містить
  `resolveWindowRange` (камера→range), `rebaseViewport`, `RebuildScheduler` (debounce+черга, 1 rebuild
  за раз, мьютекс `tail`). Багатий: reserveScreens, maxSeats, slide/jump, onError-політика.
- `OrgHierarchyDiagram.setData:1290` — повна заміна: epoch++ → await map → await index → commit (без await
  усередині) → render. Чистить selection/highlight/focus. `appendData:1352` — ADD/UPDATE delta (mergePartial),
  БЕЗ DELETE, усе одно повний `render()`. `spliceData` — нема.
- `DiagramRenderer.cullToViewport:456` — виставляє `view.renderable` за перетином world-box×камера з екраном+pad;
  <300 нод → resetCull; no-throw. **Це вже draw-window для Pixi (1-B).** `resetCull:494`, `getCullStats:500`.
- `grep` ports/adapters → **0**. `packages/core` → лише `.rs` (Rust layout = адаптер #1, НЕ TS-ядро канону).
- Публічний API = фасад; setData/appendData/cull не в barrel `index.ts`.

---

# РОЗБІР (дві лінзи: pattern-architecture-review + step-back-review)

## F0-RESOLVED — рішення власника 2026-11-04 + вимір РОЗВ'ЯЗУЮТЬ напругу (оновлено)
**Рішення власника (дослівно):** «1M — not show in one viewport, we need only fast calculate position
and layout». Тобто: 1M ніколи не в одному viewport (draw — віконний); єдина тверда вимога — ШВИДКО
рахувати позиції/layout.

**Вимір + код знімають уявний конфлікт — це була ХИБНА дихотомія:**
- 1M staff-стіна позиціонується **арифметикою сітки**, НЕ WASM: `cellOfSeat(i)={col:i%COLS, row:⌊(i-base)/COLS⌋+1}`
  (`scaleStaff.ts:343`), коорд. `col*pitchX, row*pitchY` (`coords.ts:60`). O(1)/посада, O(вікно) на вікно
  (ніколи не ітеруємо 1M). → «fast calculate layout» для стіни **уже виконане за побудовою**.
- Org-дерево (Reingold-Tilford) — єдине дороге, і воно ≤100k (0.59с одноразово). Теж у бюджеті.
- Виміряні 8.6с/1M стосувались org-RT на гіпотетичному 1M — НЕ реального шляху стіни.
- demo-шні 1.5с/slide — це НЕ layout, а **матеріалізація DiagramData вікна + rebuild search-index +
  повний render()**. Саме це вікнує draw-window (не рахунок).

**Резолюція §6:** напруга «data-window vs draw-window» розчиняється, щойно відокремити
*layout-рахунок* (дешевий: арифметика стіни + RT≤100k) від *матеріалізації+рендеру* (справжня вартість →
вікнувати DRAW, = наявний `cullToViewport`, F2). Отже:
- draw-window **ухвалено** (owner): ніколи не малювати всі 1M; візуалізувати visible+буфер.
- data-window-slicing як *коректність* — **геть**; `spliceData` не потрібен (узгоджено з вольт-spec C).
- windowing = DRAW-concern, не DATA-concern.

🔶→✅ ЗАКРИТО власником 2026-11-04: **реальні дані ЗАВЖДИ департаментні/обмежені (tree, тисячі, не
мільйони).** Пласка 1M-стіна = demo-артефакт; grid-модель `scaleStaff` НЕ переноситься в SDK.

## F0-COLLAPSE — підсистема virtualization здебільшого YAGNI для реальних даних (нове, головне)
Після рішення власника премиси підсистеми провалюються, а потрібні механізми ВЖЕ Є:
1. **Scale-вісь обмежена:** real = департаментне дерево, тисячі вузлів. Layout: org-RT ≤100k=0.59с
   одноразово; департаментне (тисячі) — тривіально. «Fast calculate» уже виконане.
2. **Draw-windowing вже існує й обмежений БЕЗ нової підсистеми:**
   - Pixi: `cullToViewport` (1-B, shipped) — куллить off-screen views при >300 вузлах.
   - HTML: `resolvePromoteIds` промоутить за selection з капом `maxCount=8` (`promoteMath.ts:146`); режим
     `near-visible` обмежується viewport через overlay-гейт (`promoteMath.ts:133` — «overlay owns the
     viewport half»). SDK **НЕ монтує тисячі DOM-карток** — набір capped+viewport-gated.
3. **Історія підтверджує:** 1-A вже визнавали YAGNI; переглянули ЛИШЕ на премисі «demo-вікнування 1M =
   прогалина SDK» (handoff §1.5). Власник щойно сказав, що 1M не реальний → **премиса перегляду померла →
   YAGNI значною мірою повертається**, тепер на твердішому ґрунті (виміряно + код показує обмежені шари).

**РЕКОМЕНДАЦІЯ (ponytail/measurement-driven):** НЕ будувати підсистему virtualization зараз. Підтвердити
емпірично одним виміром (реальний bounded-датасет ~5–10k департаментних посад на близькому зумі: к-сть
DOM-карток + час рендеру). Якщо ок — закрити як YAGNI, лишивши shipped `cullToViewport`. Якщо на bounded-
scale виринає реальна перф-проблема — заскоупити ВУЗЬКИЙ фікс (DOM-card windowing), не 4-lib гексагон.
Це матеріальна зміна скоупу → на затвердження власнику (step-back guardrail).

---
### (архів) F0 як формулювалось до рішення — ЦЕНТРАЛЬНИЙ КОНФЛІКТ data-window vs draw-window
- **Докази:** demo вікнує ДАНІ — `setData(slice)` → WASM розкладає лише вікно (`scaleStaff.ts`,
  grounding §1); whole-tree 1M не рахується. owner-spec вольту вікнує МАЛЮНОК — whole-tree WASM ЗАВЖДИ,
  малювати visible+буфер (`_vault-spec.md` B,C,D). Reingold-Tilford жене ширину до кореня → window-local
  геометрія ≠ whole-tree геометрія (ширини предків різні).
- **Фізичне протиріччя:** owner-канон «whole-tree ЗАВЖДИ» на 1M **заблокований** тим самим обмеженням,
  через яке demo вікнує дані. Поріг T (zoom-scale, DOM#2↔Pixi#3) — перемикач РЕНДЕРУ, не ОБЧИСЛЕННЯ;
  він НЕ знімає проблему compute.
- **Міра, якої ні в кого нема:** стеля whole-tree WASM (скільки посад у бюджет, орієнтир T126:61 Q-2
  ≤50мс/500) — НЕ виміряна; setData на slide ≈1.5с (`viewport-window/report.md:436,510`).
- **ВИМІРЯНО 2026-11-04** (`_measure-wasm-ceiling.md`, org row-tree, лінійно): 10k=54мс, 100k=0.59с,
  1M=**8.6с**. Стеля інтерактиву: ~10k@кадр, ~100k@суб-секунда, 1M поза бюджетом. → draw-window
  життєздатний ≤~100k; на 1M whole-tree НЕ тримається (data-window вимушений). «Поріг T» = НЕ лише
  zoom-switch, а Й розмір-даних-поріг (~десятки тис.). Staff 1M (стіна) — ще не виміряно (лот 2).
- **Рекомендація (найменша дія):** частина 1 F0 ЗАКРИТА (org-число є). Лишилось: (a) виміряти STAFF 1M
  (лот 2), (b) власнику зняти суперечність моделі. Доки (b) — spec-flow на архітектуру передчасний. Паралельно власник мусить зняти суперечність своїх
  власних реплік цієї сесії (чат: data-window + spliceData, бо «CRUD уже в спеці») проти вольт-owner-spec
  (draw-window, whole-tree, БЕЗ splice). step-back-review: НЕ обирати мовчки — винести власнику.

## F1 — 4-міні-ліби НЕ потрібні, щоб відвантажити virtualization (Lens B×A, передчасна абстракція)
- **Докази:** ports/adapters = 0; канон у ноті `status: draft/vision`. Фасад `OrgHierarchyDiagram`
  — єдиний публічний API. AGENTS.md: T119 вже ВИМІРЯВ, що спліт фасаду ламає публічний API і «measurement
  does not refute keeping it flat».
- **Lens B (forest-SRP):** так, фасад несе багато відповідальностей (дані/рендер/пошук/selection/expand/
  reparent/export) — формально кандидат на розбиття. **Lens A (plan):** але розбиття має ціну, яку НІЩО не
  виправдало, а virtualization її не вимагає.
- **Рекомендація:** virtualization потребує ОДНОГО шва (windowing-відповідальність + draw-window у DOM),
  НЕ гексагонального перепису на 4 ліби. Guardrail step-back-review #3: не будувати 4 ліби під фічу,
  обґрунтовану vision-нотою. Канон «4 ліби» лишити як north-star, не як передумову цієї фічі.

## F2 — cullToViewport — це ВЖЕ draw-window; DOM#2 = той самий патерн, не нові порти (Lens A, позитив)
- **Докази:** `cullToViewport:456` виставляє `renderable` по перетину з viewport+pad — це дослівно
  «малювати visible+буфер» owner-спеки, але для Pixi (#3). Фіча 1-B вже відвантажила draw-window для
  далекого зуму.
- **Висновок:** draw-window модель уже живе в кодовій базі (один адаптер). DOM#2 virtualization = той самий
  приём на DOM-шарі (не рендерити off-screen картки + буфер). Це аргумент ЗА draw-window (F0) і ПРОТИ
  введення гексагональних портів зараз — шов (toggle renderable / mount) вже є прецедентом.

## F3 — два вікнувальники: Strategy НЕ рекомендований (GoF, 51% < 60%)
- **Докази:** staff `viewportWindow.ts` (камера-driven, in-place setData+rebase) vs org `scaleOrgs.ts`
  (клік/пошук, повний reload, фіксовані 400) — grounding §4.
- **Strategy fit = 51%:** problem-fit 3/5 (вихід — лише WindowRange, «алгоритм» тонкий); variation 2/5
  (2 варіанти, обидва є, 3-го не заявлено); boundary 3/5 (pure-функції й так тестовані); cost 2/5
  (інтерфейс на 2 варіанти = зайва індирекція). < 60% → не вводити.
- **KISS-альтернатива:** перенести `viewportWindow.ts` (pure, без Pixi) у SDK як є; org зробити
  вродженим окремим випадком багатшого staff-вікнувальника (фіксований span, без reserve), НЕ окремим
  Strategy-класом. Strategy — лише якщо з'явиться реальний 3-й тригер вікна.

## F4 — RendererPort (Adapter) — умовний кандидат (GoF, 72%), але НЕ зараз
- **Adapter/Strategy для #2 DOM / #3 Pixi fit = 72%:** два реальні бекенди під одним оркестратором із
  LOD-switch — хрестоматійний шов; але вартість вилучення портів із фасаду велика (T119).
- **Умова застосовності (60–79% → conditional):** вводити RendererPort ЛИШЕ коли DOM#2 реально будується
  й має співіснувати з Pixi#3 під однією камерою/LOD. НЕ як передумова, НЕ зараз.

## F5 — ДВА «core» на різних рівнях (Clean Arch) — детально
Назва «core» зайнята ДВІЧІ, і це різні шари гексагону, не синоніми:

| | `packages/core` (Rust/WASM) | `packages/sdk/src/core/` (TS) |
|---|---|---|
| Що це | Cargo-крейт `org-hierarchy-core`, `crate-type=[cdylib,rlib]` → WASM | тека всередині пакета SDK |
| Роль у каноні | **адаптер #1 (dg-tidy / LayoutAdapter)** — DRIVEN-адаптер, «деталь» | **core/domain + core/logic** — центр гексагону, «depends on NOTHING» |
| Експортує | `computeOrgRowTreeLayout`, `computeStaffGeometry`, `computeStaffMockupLayout` (JsValue↔serde-wasm-bindgen) | `NodeKind/NodeRef/SearchResult/MenuItem` (domain), `nodeEntityKey/parseNodeEntityKey`, `nodeRefs`, `nodeTestId`, `seatDrop` (drop-pipeline), `InteractionError` |
| Перетинає WASM-межу | так — САМА межа | ні — чистий TS |
| Залежності | лише stdlib+serde; але САМА є деталлю (движок) | `grep` render/wasm/pixi-імпортів → **0** → вже pure |

**Суть (а не рейм):**
1. Канонічний «core» уже ЧАСТКОВО існує — це `packages/sdk/src/core/` (domain-типи + drop-pipeline
   `seatDrop.ts` + nodeKey), і він УЖЕ чистий (без render/wasm). Канон не вимагає будувати його з нуля.
2. `packages/core` (Rust) — це НЕ канонічний core, а **адаптер #1** (layout-движок). У гексагоні він має
   сидіти ЗА `LayoutPort`. Сьогодні `LayoutPort` НЕ існує (grep=0): `render → wasm/layoutBridge.ts →
   packages/core` викликається **напряму** (`layoutBridge.ts:71,95,109`, конкретна залежність).
3. Отже реально бракує не перейменування, а: (a) `core/ports` (RendererPort/LayoutPort), (b) переносу
   viewport-culling із `render/DiagramRenderer` у `core/logic` (зараз culling — у рендері, не в pure-core).
   **DIP-інверсія** над layout-движком — ось справжня відсутня частина, не назва.
4. Для спеки: НЕ плутати «винести логіку в core» (TS, вже майже є) з «core = WASM» (Rust, це адаптер).
   Virtualization-арифметика (`viewportWindow.ts`, pure) природно лягає саме в TS-`core/logic`, поруч із
   drop-pipeline — без жодного дотику до Rust-крейта.

---

## ПІДСУМОК / найменші достатні дії (ранжовано impact×effort)
1. **Виміряти стелю whole-tree WASM** (посад у бюджет) — число вирішує data-window vs draw-window (F0).
   Без нього spec-flow передчасний.
2. **Власнику: зняти суперечність** його реплік сесії (data-window+splice) проти вольт-owner-spec
   (draw-window+whole-tree, без splice). Не обирати мовчки (F0, step-back Lens A).
3. **НЕ будувати 4 міні-ліби** під цю фічу; один windowing-шов + DOM draw-window (F1). Канон = north-star.
4. **Переносити draw-window як патерн cullToViewport** (F2); `viewportWindow.ts` → SDK як pure (F3),
   org = окремий випадок, без Strategy.
5. RendererPort — відкласти до реального DOM#2 (F4). Зафіксувати колізію «core» у спеці (F5).

Confidence: medium-high на F1/F2/F3/F5 (прямі докази в коді+нотах); medium на F0/F4 (залежить від
невиміряного числа й від рішення власника).

## Вхідні (з артефактів, вже прочитано)
- owner-canon (vault нота 1, 2026-10-25): core(domain/ports/logic, depends on NOTHING) + adapters
  (#1 dg-tidy layout · #2 DOM renderer · #3 Pixi renderer) + application #4 оркестратор
  (володіє камерою, LOD-switch, store-commit = ЄДИНА мутація). Віртуалізація → у #2 (DOM) під #4.
- draw-window канон: #2 малює viewport + буфер ¼ з 4 боків (ребра теж); LOD-вісь = zoom-scale; поріг T — виміряти.
- whole-tree WASM ЗАВЖДИ (Reingold-Tilford жене ширину до кореня); кеш лише РОЗМІРІВ (не геометрії); spliceData/DELETE — поза скоупом.
- demo-реальність: ДВА вікнувальники (staff viewportWindow.ts камера-driven in-place setData; org scaleOrgs.ts клік/пошук повний reload); spliceData НЕ існує; кожен slide = повний setData.
- §6 напруга: demo вікнує ДАНІ (slice→WASM розкладає лише вікно), owner-spec вікнує МАЛЮНОК (whole-tree→draw visible+buffer). На 1M конфліктують.
