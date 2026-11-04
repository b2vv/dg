# _vault-spec — звірка 6 нот project-vault (lazy-render / CPU build-skip контекст)

ДАЛІ: прочитати 6 нот через MCP `vault_read`, витягти дослівні цитати по A–F.

Статус MCP: `mcp__obsidian__vault_read` ПРАЦЮЄ (vault `diagram-hierarchy` відкритий). 5 нот
повернулись цілими; нота №1 (спліт на 4 міні-бібліотеки) — 95 693 символи, перевищила ліміт,
прочитана через slice збереженого файла. Усі 6 прочитані повністю.

---

## Нота 1 — `2026-10-25 dg — спліт на 4 міні-бібліотеки (vision + архітектура)`
(frontmatter `status: draft / vision — обговорюємо кожен пункт детально`)

### E (спліт на 4 міні-бібліотеки) — ДЕТАЛЬНО
Форма (КАНОН 2026-10-25): **hexagonal ports & adapters, модулі в стилі Go, поки один repo.** Дослівно:
> core (depends on NOTHING):
>   core/domain  — DiagramData, OrgLayoutResult/StaffCanvasResult, NodeRef, NodeKind, SeatDrop; Node<T>/Link<T> з generic `data?:T`
>   core/ports   — RendererPort<T>, InteractionInput<T>, LayoutPort + event-словник
>   core/logic   — nodeKey, viewport-culling, drop-pipeline (resolveSeatDrop→projectedOccupantMove→applySeatDrop, УСІ pure)
> adapters (driven): #1 dg-tidy = LayoutAdapter · #2 DOM = RendererAdapter · #3 Pixi = RendererAdapter
> application: #4 оркестратор — wires ports↔adapters, ВОЛОДІЄ камерою, LOD-switch, store-commit (єдина мутація)

Отже 4 «бібліотеки» = **#1 dg-tidy (layout) · #2 DOM-рендер (близький зум, React-картки) · #3 Pixi-рендер
(далекий зум) · #4 оркестратор (application)**; «5-та shared-база типів» (core/domain+ports) — у resume-хедері
відкритий пункт. Геометрія/layout — у #1 (dg-tidy, WASM) + core/logic (culling, drop-pipeline, усе pure).
Віртуалізація/вікнування — у рендері #2 (DOM) під оркестрацією #4. Редагування — див. A.

### B (вікнування/віртуалізація в БІБЛІОТЕЦІ) — ТАК, owner-spec. Дослівно:
Власник (§17, F-pivot-1): «**DOM при зумі (коли видно react layout) не відображає одночасно всі ноди, а
тільки видимі + додатково захопити зліва і справа**» → нота: «**#2-DOM ВІКОННИЙ (virtualization: visible +
L/R buffer)**». §18 (OWNER-SPEC): «**#2 React малює DOM лише для вузлів у viewport + буфер ¼ viewport з
КОЖНОГО з 4 боків**… Решта дерева порахована, але поза DOM. Re-window на pan/zoom.» Статус: «переходить з
“відкритий greenfield-пункт” у **ухвалену owner-spec**… МОДЕЛЬ зафіксована». Це рендер #2 SDK, не demo/host.
LOD-вісь = **zoom (scale)**, не к-сть нод: base…200% CSS-scale = React (#2); zoom-out за порогом T → Pixi (#3);
поріг T **треба виміряти** (deferred). #4 рахує, які ноди/точки у вікні. Вікно включає й РЕБРА, що інтерсектять
viewport+¼.

### C (spliceData / delta / incremental data / DELETE-дельта / часткова матеріалізація) — НЕ згадано як дані.
Єдиний «інкремент» — про РОЗМІРИ, і він ЯВНО спростований для layout. Дослівно (Cass 1 F2, звірено):
> «ре-лейаут інкрементально / афектоване піддерево» — **ХИБНО**. Layout = ОДИН WASM на все дерево
> (rowTreeLayout.ts:189), Reingold-Tilford пропагує ширину однієї ноди вгору до кореня → recompute ЗАВЖДИ
> whole-tree. **patchNodeSize економить лише re-MEASURE (чужі розміри з кешу), НЕ re-COMPUTE.**

Віконність — «лише про те, що МАЛЮЄТЬСЯ, не про те, що рахується». Жодного `spliceData`, DELETE-дельти чи
часткової матеріалізації даних у ноті нема.

### D (інкрементальна Rust-геометрія / кеш незмінних нод) — ЯВНО ВІДКИНУТО для геометрії; кеш = лише РОЗМІРИ.
Дослівно: «Повний WASM на кожен RO-тік ще й небезпечний: 5-й поспіль зрив вбиває інстанс (rowTreeLayout.ts:62-69,
memory OOB). → patchNodeSize = (синхронний апдейт кешу + dirty) + **debounced ПОВНИЙ recompute** (батчем, не на
тік) + політика recovery/бек-оф WASM-інстанса». Тобто recompute ЗАВЖДИ whole-tree; кешується лише таблиця
РОЗМІРІВ (у #4), не геометрія. Інваріант B2: розмір/позиції їдуть усередині завершеного `OrgLayoutResult`,
рендер не читає окреме джерело.

### A (edit-mode: додавання/редагування/видалення посад/депів/зв'язків у рантаймі) — НЕ згадано.
Навпаки, дослівно: «**вільного редактора не буде**; майбутній drag = ПО КОМІРКАХ (dnd-kit-стиль), окремо й
пізніше → DOM-overlay». Drag нод (§9/§owner-pivot): «**Drag нод = по комірках (dnd-kit-стиль), ОКРЕМИЙ
функціонал, ПІЗНІШЕ**… Не вільний x/y; збігається з наявною staff grid-snap/reparent-семантикою». Жодного CRUD
посад/депів/зв'язків у рантаймі. Мутація в моделі одна: «drop-pipeline УВЕСЬ pure → core/logic; мутація =
store-commit у #4». `data?: T` — «**opaque payload хоста для додаткового функціоналу**» (layout не читає).

### F (рішення власника про розширюваність/SDK-шов) — багато, дослівні тези:
- Size-source = ОБЧИСЛЕНІ дискретні класи (owner-confirm 2026-10-25), width=300 const + classHeight; калібрація у ХОСТІ.
- Камера — у #4; обидва рендери з однієї камери. #4 володіє LOD-switch і store-commit.
- Два рендери + LOD-switch (не один); #2 = власний тонкий DOM, НЕ React Flow.
- TRUNCATE+tooltip замість shrink; шрифт 17px константа.
- a11y/screen-reader = ТВЕРДА ВИМОГА ЗАРАЗ → #2-DOM виправданий (Pixi a11y не дає).
- Node/Link generic `data?: T` = opaque host-payload (owner 2026-10-25).
- zoom клампується зверху на 200% CSS-scale (далі приближати не треба).

---

## Нота 2 — `2026-11-02 HANDOFF Roadmap-дискусія розширюваності (Dg 13)`
Тип: дизайн-ДИСКУСІЯ, нічого не збудовано. Джерело правди `work/ROADMAP-extensibility.md` (`0558296`).

- A (edit-mode CRUD) — НЕ згадано. Є R5 мультивибір, D1 interaction-store `{selected,hovered}`, marquee,
  D2 інжекція view. Жодного runtime-CRUD посад/депів/зв'язків.
- B (вікнування в SDK) — НЕ згадано в цій ноті окремо (вона про анімацію/interaction/зум/мультивибір).
- C (splice/delta) — НЕ згадано.
- D (інкрементальна Rust-геометрія/кеш) — НЕ згадано (D3 про transition-шар/spring-аніматор, не геометрію).
- E (спліт на 4) — НЕ згадано.
- F (рішення власника про розширюваність) — ТАК, дослівно:
  «Північна зірка: API має бути **простішим за GoJS** — чисті функції, інжектована презентація, immutable-дані-
  входом, без стрингових DSL і глобальних мутацій.» «Інваріант (Б2 узагальнений): **геометрія/layout/логіка — в
  ядрі; назовні лише презентація+стилізація ефектів**.» Порядок D3→D1. D3 spring-модель. A* лишається.

---

## Нота 3 — `2026-11-02 HANDOFF dg-swap SDK-шов (Dg 13)`
Про SDK-шов геометрії під хост cassiopeia (Б1/Б2). HEAD `b601cba`.

- A (edit-mode CRUD) — НЕ згадано.
- B (вікнування в SDK) — НЕ згадано.
- C (splice/delta) — НЕ згадано.
- D (інкрементальна Rust-геометрія/кеш) — НЕ згадано (геометрія з того самого обчислення, що й рендер; без
  другого виклику в хості — але це не про кеш незмінних нод).
- E (спліт на 4) — НЕ згадано.
- F (рішення власника / SDK-шов) — ТАК, дослівно:
  «**Інваріант: уся геометрія — лише SDK/Rust; хост подає розміри карток входом і читає геометрію.**»
  «Б1 — розмір на картку (вхід `position.width/height`).» «Б2 — green-light з межею: **геометрія + fit → SDK;
  стиль (PAD-як-оформлення, кольори, підпис, шрифт) → хост**. Хост малює під ОДНИМ camera CSS-transform, нічого
  не множить поелементно, не рахує AABB.» «Alpha-поведінка (картка v3, пошук) — у хості React-overlay.»
  «Без push/publish v1.0.0; хост через file:/link.»

---

## Нота 4 — `2026-11-02 Б2 SDK-шов геометрія+fit (Dg 13)`
Реалізація Б2 (getter геометрії хрому ШПС + worldTransform + fitStaffChrome). Контракт залочено, закрито (HEAD `4830cb2`).

- A (edit-mode CRUD) — НЕ згадано.
- B (вікнування в SDK) — НЕ згадано.
- C (splice/delta) — НЕ згадано.
- D (інкрементальна Rust-геометрія/кеш) — НЕ згадано у сенсі «кеш незмінних нод». Є КЕШ іншого роду:
  `getStaffChromeGeometry()` = «геометрія ОСТАННЬОГО завершеного рендеру» (кеш останнього рендеру, null до
  1-го/поза alpha, reset на верху `render()`). Це кеш результату рендер-геометрії, НЕ інкрементальна re-геометрія
  при редагуванні нод.
- E (спліт на 4) — НЕ згадано.
- F (рішення власника / SDK-шов) — ТАК, дослівно:
  «Геометрія + fit → SDK. Стиль → хост. Хост малює під ОДНИМ camera CSS-transform; нічого не множить поелементно,
  не рахує AABB. Якщо PAD впливає на extent для fit — fit враховує це в SDK.» «Width:0/негатив/NaN/дубль хост
  відсікає ДО SDK.» Контракт: `getStaffChromeGeometry()`, `fitStaffChrome()`, `worldTransform` у
  PromoteBackdropProps, `StaffChromePad` — стан діаграми. Верифікація: логіка — unit+typecheck (dg); ВІЗУАЛ —
  Cass/Storybook.

---

## Нота 5 — `2026-11-02 ШПС alpha §8.2-full + 1.0.0`
Коротка. Реліз 1.0.0 (`0e737de` + тег), §8.1 шеврон+re-fit, CTO-оновлення.

- A–E — НЕ згадано.
- F — дослівно: «ДАЛІ: власник — «**ти і Cass-1 замінюєте GoJS у cassiopeia-admin-ui, спершу таб ШПС**».»
  (staffFitTransform [0.55,1] re-fit — дрібниця рендеру, не про скоуп A–E.)

---

## Нота 6 — `2026-11-03 HANDOFF дві теми — роадмап+issue96 (Dg 13)`
Тема A — роадмап розширюваності (закрито, `5afa5c1`); Тема B — issue #96 ШПС mockup ігнорує expand-стан (жива, spec-flow).

- A (edit-mode CRUD додавання/редагування/видалення) — ЧАСТКОВО дотично через **expand/collapse + toggle**, НЕ
  через CRUD даних. Дослівно (рішення власника по #96):
  «**Q-B: node-API САХАР `node.toggle()/expanded()/collapsed()` на презентаційному вузлі (`PromoteSlotProps`)** —
  тонкий сахар над id-based `togglePositionExpand`. **Наступний крок.**» «collapse — **стандартна вроджена
  поведінка**»; «**Q-A: прибрати гейт `collapseUnexpandedPositions` → always-on prune**. Публічний тип
  міняється.» Рольова default-policy: ШПС lead/subordinate → лише керівна посада (isHead); current org → усі
  посади; ORG → 1 рівень дітей. Це про видимість/прунінг піддерев, НЕ про runtime-додавання/видалення
  сутностей.
- B (вікнування в SDK) — НЕ згадано тут прямо. Але принцип «бібліотека ВОЛОДІЄ collapse, cass не переробляє
  `staffVisibleData`» — суміжний: прунінг/видимість у бібліотеці, не в хості.
- C (splice/delta/DELETE) — НЕ згадано. (Прунінг = фільтр видимих, не дельта-матеріалізація.)
- D (інкрементальна Rust-геометрія/кеш) — НЕ згадано.
- E (спліт на 4) — НЕ згадано.
- F (рішення власника / розширюваність) — ТАК:
  Тема A: «D3 spring-машинерія», «роутинг: злити два A* у generic core (канон T128 staff_router.rs)»,
  «WASM-виграш невиміряний (мандат ADR-0002, не перф) → “міряти, але TS не знімати”», анкери доставки A0–A3.
  Тема B #96: always-on prune + рольова политика + node-API сахар toggle/expanded/collapsed (наступний крок);
  «Бібліотека прунить collapsed-піддерева на ВСІХ шляхах (mockup теж)… бібліотека ВОЛОДІЄ collapse».

ДАЛІ: фінал — SubagentHandback зі стислим переказом + цитатами.
