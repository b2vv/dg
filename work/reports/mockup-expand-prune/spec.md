# spec.md — issue #96: ШПС шанує expand-стан на всіх шляхах (always-on + рольова політика)

**Гілка:** `fix/96-mockup-expand-prune` · **PR → main** · **Issue:** b2vv/dg #96
**Поріг пайплайна:** спрацьовує — зсув публічного API (зняття гейта `collapseUnexpandedPositions`,
зміна дефолтної видимості staff-сцени).
**GATE 1 (grilling):** пройдено 2026-11-03 (реформовано live, див. нижче). **Код лише після GATE 2 + owner-go.**
**Джерела правди:** живі ноти Obsidian `2026-11-03 issue-96 mockup expand-prune дослідження (Dg 13)` +
`2026-11-03 issue-96 spec-rewrite (Dg 13)`; handoff `2026-11-03 HANDOFF дві теми`.

---

## Problem

На staff-alpha/mockup-шляху (`render.staffAlphaMockup: true`) згортання/розгортання позиції **не ховає
піддерева**: клік по шеврону рухає камеру (`panToNode`), але набір видимих вузлів не змінюється
(`OrgHierarchyDiagram.ts:1324-1356`, `togglePositionExpand` ставить прапор+pan, прапор нікуди не доходить).

**Корінь (звірено, `path:line`):**
- `computeViaMockup`→`buildStaffMockupInput` (`staffLiveGeometry.ts:327-357`, :366-435) бере **всі**
  `data.positions` поточної org і **не** застосовує expand-прунінг; віддає `tiers:[]`, `orgCards:[]` —
  **однооргівський** рендер (лише `currentOrgId`).
- Rust/TS-шляхи прунять **у бібліотеці** через `collapseVisiblePositions(..., expandedPositionIds)`
  (`buildStaffLayoutInput.ts:158-186,217`), але **лише під гейтом** `collapseUnexpandedPositions`
  (дефолт `false` → за дефолтом теж повне дерево).
- Наслідок: кожен консьюмер змушений прунити host-боком (демо `staffVisibleData`,
  `StaffChromeBackdrop.ts:48`; host cassiopeia — так само) — логіка шару layout дублюється в кожному хості
  (порушення SRP; це блокує cass).

**Ширша неузгодженість (виявлено при звірці):** дефолтна видимість staff-сцени сьогодні не має вродженої
політики — усе видиме, доки консьюмер не ввімкне гейт і не веде expand-set сам. Бажана поведінка (owner,
домен-правила) — **рольова**: поточна org показана повністю, керуюча/підпорядковані org — лише головами
(head-only).

## Рішення власника (GATE 1, реформовано 2026-11-03)

1. **Always-on prune, гейт знято ГЛОБАЛЬНО.** `collapseUnexpandedPositions` прибирається як вмикач на **всіх**
   compute-шляхах (Rust tree / TS / mockup). Прунінг стає вродженою поведінкою staff-layout, не опцією.
2. **Рольова default expand-policy за канонічними ярусами** (`work/SPEC.md` §2.2: Ярус 1 керуюча / Ярус 2
   поточна / Ярус 3 підпорядковані) — не плаский head-only, не «усе видиме»:
   - **Ярус 2 — поточна org** (`role: 'current'` / `staffCurrentOrgId`) → **усі посади** розгорнуті за
     дефолтом (повне дерево), згортаються per-position через `togglePositionExpand`;
   - **Ярус 1 — керуюча org** (`role: 'leading'` / `currentOrg.parentOrgId`) → **head-only** за дефолтом;
   - **Ярус 3 — підпорядковані org / групи org** (child: `parentOrgId === currentOrgId`) → **head-only**
     за дефолтом.

   > **OQ6 розв'язано (owner «GATE 1 is true», 2026-11-03):** head-only ДЕФОЛТ для обох ярусів. Узгодження
   > з §2.2: наявний код уже дає ярусу 1 head-only за дефолтом — `leadershipOf` (голова+прямі,
   > buildStaffLayoutInput.ts:97) лише задає **вміст/стелю** розгортання ярусу 1 (depth-1 «керівний склад»
   > §2.2), а `visiblePositions` із порожнім expand-set повертає **лише голову**. Дефолт обох ярусів =
   > head-only; **зміни наявної tree-поведінки не потрібно.**
3. **Alpha/mockup-шлях шанує collapse ПОТОЧНОЇ org.** На alpha прунінг застосовується до дерева посад поточної
   org (справжній корінь #96); `togglePositionExpand` стає значущим. Alpha лишається однооргівським у рендері —
   **multi-org tier-рендер (керуюча+підпорядковані) на alpha виділено в ОКРЕМИЙ spec** (Варіант Y, owner
   2026-11-03), бо це нова Rust-геометрія (`staff_mockup_layout.rs` не має org-tiers за конструкцією).
4. **Рольовий КОНТРАКТ у бібліотеці** (ярус2 поточна=all; ярус1 керуюча=head-only; ярус3
   підпорядковані=head-only — дефолти) — нормативний для всіх
   шляхів; **tree-шлях (`compute_staff_geometry`/`canvasLayout`) йому вже відповідає** (managing-tier колапситься
   до leadership). Контракт верифікується на tree-шляху + новій multi-org фікстурі.
5. **Multi-org demo/test-фікстура** додається для верифікації рольового контракту (mock3 — single-org, не
   покриває керуючу/підпорядковані).

**Чому так (під інваріант ADR-0002 + північну зірку):** геометрія лишається єдиним джерелом у Rust-мокапі;
видимість (який набір позицій/org показати) рахує **бібліотека** за рольовою політикою, а не консьюмер.
Mockup перестає бути винятком; усі три шляхи шанують одну expanded-set модель (`positionExpand.ts`), без другої
(collapsed-set) моделі.

## User scenarios

1. **Поточна org, toggle.** Користувач згортає позицію з піддеревом на alpha-шляху → піддерево зникає;
   `visibleNodeKeys()` змінюється. Розгортання повертає. (Сьогодні — no-op по видимості.)
2. **Multi-org сцена (tree-шлях / нова фікстура).** Сцена показує поточну org повністю + керуючу org та
   підпорядковані org **лише головами** (head-only) за дефолтом. (На alpha-шляху рендер tier-ів —
   окремий spec; тут контракт верифікується на tree-шляху, який його вже реалізує.)
3. **Консьюмер без налаштувань.** Жоден консьюмер більше **не** веде host-prune для досягнення рольового
   дефолту — бібліотека рахує його сама (розблоковує cass: прибирає `staffVisibleData`-дубль).
4. **Дефолтна видимість поточної org незмінна візуально.** current=all → повне дерево поточної org, як і
   сьогодні у дефолтному демо; змінюється лише те, що toggle тепер значущий, а керуюча й підпорядковані org
   згорнуті до голів (head-only).

## Behavior contract (нормативне; вимірна таблиця AC — у plan.md через acceptance-spec)

- BC1: **Прунінг безумовний.** Жоден публічний прапор більше не вмикає/вимикає collapse. (Видалення
  `collapseUnexpandedPositions`.)
- BC2: **Рольовий дефолт expand-set** (за §2.2). За відсутності явних `expandedPositionIds`: ярус 2 поточна →
  усі позиції трактуються як expanded; ярус 1 керуюча → head-only; ярус 3 підпорядковані → head-only. Явні
  `expandedPositionIds` доповнюють/перекривають дефолт (toggle працює поверх). Стеля розгортання ярусу 1 —
  керівний склад depth-1 (§2.2, `leadershipOf`); ярусу 3 — повне піддерево.
- BC3: **Єдина модель на всіх шляхах.** mockup, Rust-tree і TS-шляхи рахують видимість через ту саму
  `visiblePositions`/`collapseVisiblePositions` — жодної другої (collapsed-set) моделі.
- BC4: **`togglePositionExpand` значущий на всіх шляхах** — змінює набір видимих вузлів, не лише камеру
  (включно з alpha для поточної org).
- BC5: **Рольовий контракт — нормативний для всіх шляхів.** Tree-шлях уже відповідає; alpha відповідає в
  межах поточної org (tier-рендер керуючої/підпорядкованих на alpha — окремий spec, не послаблює контракт).

## Acceptance criteria (намір)

- AC1: позиція поза дефолт-expand і поза `expandedPositionIds` (не `position.expanded`) → її admin-піддерево
  відсутнє у вході й результаті (картки/лінії) на **alpha** так само, як на tree-шляху.
- AC2: `togglePositionExpand(id)` на alpha → `visibleNodeKeys()`/набір карток змінюється.
- AC3: у multi-org фікстурі ярус 1 керуюча та ярус 3 підпорядковані org за дефолтом показані **лише головою**
  (head-only); ярус 2 поточна — повністю. (Розгортання голови ярусу 1 розкриває керівний склад depth-1 §2.2.)
- AC4: прунінг використовує **ту саму** `visiblePositions`/`collapseVisiblePositions`, що й раніше —
  регресій tree/TS-шляхів на наявних фікстурах немає (крім усунення гейта: поведінка, яку раніше давав
  `collapseUnexpandedPositions:true`, тепер дефолтна).
- AC5: консьюмер, що покладався на **дефолт-false = повне дерево** без рольової політики, отримує рольовий
  дефолт (міграційна нотатка — у plan.md; це свідомий breaking-зсув, owner схвалив глобальне зняття гейта).
- AC6: `docs/USAGE.md` оновлено — нова вроджена поведінка, видалення `collapseUnexpandedPositions`, рольовий
  дефолт (конституція: публічний API не міняється мовчки). `check:docs` зелений.
- AC7: нова multi-org фікстура (current+керуюча+підпорядковані) верифікує рольовий контракт — у тестах і, за
  потреби, на tree-шляховому demo-табі. (Alpha-таб лишається single-org до окремого spec.)

## Out of scope (GATE 1 Q-C — наступні spec)

- **node-API сахар** `node.toggle()/expanded()/collapsed()` на презентаційному вузлі — наступний spec.
- **ORG-діаграма defaults** (depth-1 дітей поточної org + search ancestor-reveal) — наступний spec.
- **Orchestrator-шар** (хост не веде видимість) понад рольовий дефолт бібліотеки — наступний spec.
- **ШПС-2-future:** поточна org «1 рівень від голови» замість повного дерева — park (owner непевний).
- **Multi-org tier-рендер на alpha/mockup-шляху** (керуюча+підпорядковані яруси) — ОКРЕМИЙ spec (Варіант Y):
  нова Rust-геометрія org-tiers у `staff_mockup_layout.rs`. Тут alpha лишається однооргівським у рендері.
- Host-боку cassiopeia: початковий вибір org і центрування (`fitStaffChrome`) — політика хоста, поза SDK.

## Open questions (у plan.md)

- OQ1: ~~Rust-геометрія multi-org на mockup-шляху~~ **ЗАКРИТО (Варіант Y):** `StaffMockupInput` (rust-types.ts:149)
  single-org за конструкцією (без `organizations`/currentOrgId); org-tiers лише в Rust-tree
  (`compute_staff_geometry`). Multi-org рендер на alpha = **окремий spec** (нова Rust-геометрія). Тут alpha
  шанує лише collapse поточної org.
- OQ2: де рахувати рольовий дефолт expand-set — спільний хелпер (напр. розширити `positionExpand.ts`), який
  усі три шляхи викликають перед побудовою входу? (reuse-first; уникнути дублю.)
- OQ3: як саме прибрати `collapseUnexpandedPositions` без мовчазного зламу — deprecate+ігнор чи hard-remove?
  (публічний тип; `docs/USAGE.md`; demo-таби staff-tree:213/staff-brigade:344 ставлять `true` — стануть no-op.)
- OQ4: форма multi-org фікстури — розширити mock3 (додати parent+child org) чи нова сцена? (demo-таб + тести.)
- OQ5: tier3 cap (`maxExpandedOrgCards`) і детач-корені (T65) — як рольовий дефолт взаємодіє з ними.
- OQ6: ~~асиметрія ярус1↔ярус3~~ **ЗАКРИТО (owner «GATE 1 is true», 2026-11-03):** head-only дефолт для обох
  ярусів. Наявний код уже так робить (leadershipOf = стеля depth-1, не дефолт; порожній expand-set → лише
  голова). Зміни tree-поведінки не потрібно.
