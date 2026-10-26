# plan — реалізація роутера ліній підпорядкування ШПС

**Status:** `plan-GATE-PASS → impl` · рушій = **A (конструктив)** (рішення власника + plan-GATE r1
PASS). Критика: spec GATE r2 зняв 5 blocking; проби (A vs B) виміряно симетрично; plan-GATE r1 PASS
(0 blocking, 5 non-blocking → tasks, NB1 elkjs→devDeps виправлено). Далі: impl A-v2 (задачі нижче)
behind `staffEdgeRouter` flag, acceptance §10.1.4=0 (NB2).
**Поріг:** 🔴 найвищий (успадковано від spec): нова публічна поведінка (гарантії схеми) + новий
контракт (`highlightPath`, `lead-org` kind) + ймовірна нова залежність (ELK.js).
**Джерела:** spec `work/reports/shps-routing/spec.md`; вимоги host
`cassiopeia-admin-ui:work/queue/2026-10-12-sprint-13/4311-shps-line-routing-requirements.md`
(§2 вхід, §5 маршрутизація, §6 розкладка, §10 приймання, §12 деградація); карта коду dg —
Explore staff-layout (нижче цитати file:line з HEAD `036c2c1`).

Дає впорядкований шлях до роутера, який spec уже специфікував engine-agnostic. Стан світу:
spec на GATE PASS, рушій НЕ обрано — рішення винесено на plan-GATE **після** симетричних A/B-проб
(spec §Рішення, B3). Код роутера ще не починали. **Виняток:** проби — одноразовий вимірювальний
скаффолд (throwaway), не продукт; після рішення переможець промотується в роутер, скаффолд
знімається.

## Чому
Не можна чесно обрати рушій без виміру. Spec назвав два кандидати (A конструктивний layered —
розширити dg, 0 нових deps; B ELK.js — менше коду, великий dep) і зафіксував: жоден не дефолтиться
без власного доказу, спайк B НЕ валідує A (B3). Отже перший крок impl — не «писати роутер», а
**побудувати симетричний вимірювальний харнес і прогнати через нього ОБИДВА прототипи на тих самих
схемах за тими самими критеріями**. Виміряна корекція власної посилки: я припускав, що зможу
перевикористати наявний детектор перетинів — Explore показав, що **детектора ребро↔ребро в кодбазі
НЕМА** (`staffEdgeGeometry.ts` має лише сегмент↔картка `polylineHitsBoxInterior:221`); тобто сам
вимірювальний інструмент треба написати й довести контрольною пробою ПЕРШИМ, інакше рішення рушія
спиратиметься на сліпий детектор (пастка «гейт, що не може впасти»).

## Рішення
**Спершу вимірювальний інструмент (харнес) із контрольною пробою, тоді два прототипи рушія в ОДИН
контракт входу/виходу, тоді рішення A/B на plan-GATE за таблицею метрик — і лише тоді промоція
переможця в роутер за наявним рендер-швом.**

Механізм (послідовність):
1. **Probe-харнес (вимірювальний інструмент, RED-first).** Чисті функції над геометрією, без Pixi
   (Explore п.6: headless через layout-функції; rstest має WASM у `beforeAll`). Складники:
   - `edgeEdgeCrossings(edges)` — **НОВИЙ** детектор сегмент↔сегмент (orientation/ccw), що НЕ рахує
     спільний стовбур/шину одного керівника (branch, не crossing). Контрольна проба: дві лінії
     навхрест → >0; дві паралельні → 0; спільний trunk → 0.
   - `minCardClearance(edges, nodes)` — перевикористати `polylineHitsBoxInterior` над AABB,
     інфльованими на 8px (req §5.1). Контроль: лінія за 7px → FAIL, за 9px → PASS.
   - `throughThirdFrame(edges, deptFrames)` — ребро входить у рамку деп-ту, що не джерело/ціль.
   - `isDeterministic(engine, input)` — два прогони (вхід перемішаний) → deep-equal полілінії.
   - `svgSerializable(output)` — полілінії → валідний SVG-path (`staffEdgePolylineToSvg`-сумісно).
   - `perfMs(engine, input500)` — синтетична 500-посад схема; + контрольна важка, що МУСИТЬ >50мс.
2. **Симетричний контракт проб (SPIL).** Обидва рушії: вхід `RouteInput {positions[{id,parentId,
   deptId,order}], departments[{id,parentPositionId,order}], cardSize}` → вихід `RouteOutput
   {nodes[{id,x,y,w,h}], deptFrames[{id,x,y,w,h}], edges[{fromId,toId,kind,points[],marked?}]}`.
   КОЖЕН рушій робить layout+routing САМ (spec: A — це layout+routing разом; B — ELK ієрархічний
   layout+ORTHOGONAL). Харнес міряє вихід — ELK не валідує A, бо обидва проходять ті самі асерти.
3. **Probe A — конструктивний (pure TS, 0 deps).** Layered-розкладка (Reingold–Tilford/Walker
   знизу-вгору, req §6: підлеглий нижче, сусіди за `order`) → деревні ребра 0-перетинів by
   construction; коридор/доріжки за патерном `spineBusEdges.ts` (`DEFAULT_BUS_GAP=14:30`, spine/bus/
   riser); обмежена резолюція міждепарт. ≤K проходів монотонною мірою (spec §5 п.5); драбина §12.
4. **Probe B — ELK.js.** Додати `elkjs` (devDependency — reversible). Мапа `RouteInput` → ELK
   (`layoutOptions.edgeRouting:'ORTHOGONAL'`, ієрархічні вузли = департаменти, діти = посади) →
   назад у `RouteOutput`. Детермінізм/8px/порти/SVG-export довести виміром, не припущенням.
5. **Plan-GATE: рішення A/B.** Таблиця 8 критеріїв × {A,B} на схемах §10.1 (2/4/5) + 500-перф +
   deps-ціна (A=0, B=elkjs) + інтеграційна вартість зі staff-layout. plan-critique + plan-defense.
   Переможець — із власним evidence; нічого не дефолтиться.
6. **Промоція переможця → impl.** Роутер за прапором `staffEdgeRouter:'legacy'|'v2'` (default
   legacy, spec B5) у шов `paintStaffFrameAndEdges` (`DiagramRenderer.ts:769`) → `StaffEdgesView.
   fromLayout` (`:800`). Колір через `EdgeStyle.color` (`types.ts:172`), не хардкод (spec N2).
   `highlightPath` — публічний метод `OrgHierarchyDiagram`. Probe-скаффолд знімається.

**Єдиний шов монтування:** роутер v2 підключається ТІЛЬКИ в `paintStaffFrameAndEdges` за прапором;
`StaffEdgesView.redraw()` (`:82`) фарбує вихід незмінно; legacy-шлях (`buildStaffEdgeSegments`→
`staffEdgePolyline`) лишається за дефолтом.

**Відкинуто:** (1) будувати роутер одразу на кандидаті A без проби B — порушує B3 (спайк одного не
довід проти іншого), ціна: необґрунтований вибір рушія, ризик переробки; (2) міряти перетини
наявним `polylineHitsBoxInterior` — він сегмент↔**картка**, не ребро↔ребро; ціна: сліпий до головного
критерію §10.4, «гейт що не може впасти»; (3) проби в prod-`src` SDK — ціна: ELK і throwaway-код у
релізному барелі; тому проби — ізольований скаффолд поза публічним API, знімний.

## Поза межами
- Орг-діаграма (фаза 2, GoJS) — не чіпаємо.
- Pixel-exact картки — host overlay (card-split); проба бере репрезентативні AABB (`nodeWidth=136,
  nodeHeight=156`, `layout/staff/types.ts:52`), бо рішення рушія — про алгоритм, не pixel-pack.
- Подвійне підпорядкування (§11.1), ручний drag департаментів (§11.5), висхідні зв'язки (§11.3),
  off-screen-індикатор (§11.4) — відкриті питання вимог, не тут.
- `external`/ОР canvas-маркери — Q2 CLOSED (near-LOD HTML-overlay only, canvas-маркер НЕ будуємо).
- Форма маркера залишкового перетину й поріг мінімізації (§12 «власник: можливо повернемось») —
  проба дає мінімальний видимий маркер; фінальна форма — пізніший цикл, не блокує.

## Форма перевірки
- **Чисті шви (юніт, у головному suite — це інструмент):** контрольні проби детектора
  `edgeEdgeCrossings`/`minCardClearance`/`throughThirdFrame` — КОЖЕН RED спершу (вхід, що МУСИТЬ
  дати перетин/<8px/крізь-рамку), потім GREEN на чистому вході. Якщо інструмент не ловить завідомо
  поганий вхід — рішення рушія недійсне.
- **Проби (measure-suite, поза 1042-юнітом):** A і B на схемах §10.1 (2/4/5) → таблиця метрик;
  детермінізм — два прогони deep-equal; перф — 500-посад ≤50мс + контрольна важка >50мс.
- **§10.1.4 (ключова):** на схемі 4 (два керівники різних депів → підлеглі в C) — кожен рушій:
  к-сть залишкових перетинів + чи ПОЗНАЧЕНІ; тихий непозначений перетин = FAIL (spec §12/B2).
- **Ручний гейт (екран, ПІСЛЯ промоції):** highlight — вибір підсвічує root→X + прямі, решта 40%;
  контрольна проба — вузол без зв'язків не підсвічує нічого. Колір зняти з DOM (`--color-cass-adm-
  diagram-link`: dark `#c2502a`/light `#b35a23`), не на око.
- **Plan-GATE перед промоцією:** plan-critique + plan-defense над цим планом + таблицею проб.

## Задачі (impl A-v2, після plan-GATE PASS)
Рушій — **A (конструктив)**, за вердиктом власника; B лишається еталоном якості й fallback.
Acceptance піднято за умовою GATE (нижче). Порядок:
1. **Obstacle-avoidance роутер** на наявних примітивах (`polylineHitsBoxInterior`/
   `segmentHitsBoxInterior` `staffEdgeGeometry.ts`): міждепарт. ребро обходить чужі картки (8px)
   і рамки (не крізь третю, §3.2). Контрольна проба RED: вхід, де наївний шлях порушив би 8px.
2. **Bounded-резолюція коридорів** (spec §5 п.5): доріжки 8px, ≤K проходів монотонною мірою, стоп.
3. **🔴 Acceptance §10.1.4 = 0 перетинів (умова GATE NB2):** B довів, що 0 ДОСЯЖНИЙ на s2/s4/s5,
   тож A-v2 має дати **0** на цих схемах, а НЕ «позначити 3». §12-маркер — лише для входу, де 0
   справді інфізибельний; **додати фікстуру такого входу** (інакше §12-гілка не exercised і маркер
   маскуватиме недобудований obstacle-avoidance).
4. **Carry-forward зі spec r2 (GATE NB3), поіменно в tasks/тестах:** (a) валідація входу — цикл
   `parentId`, **dangling `parentId`** (на неіснуючу/відфільтровану), **self-parent** (`id===parentId`)
   → structured-error, не hang; (b) фікстури **0 посад / 1 посада** (N6); (c) **epoch-guard**
   re-entrancy (`setData`/ресайз під час маршрутизації скасовує прогін, патерн `ingestIsCurrent`).
5. **Шов + прапор:** `staffEdgeRouter:'legacy'|'v2'` (default legacy, spec B5) у
   `paintStaffFrameAndEdges` (`DiagramRenderer.ts:769`) → `StaffEdgesView.fromLayout` (`:72`).
   Колір через `EdgeStyle.color` (`types.ts:174`).
6. **highlightPath** — публічний метод `OrgHierarchyDiagram` (root→X + прямі, решта 40%).
7. **Прибирання:** зняти probe-скаффолд `_shps-routing-probe/` + **elkjs з devDependencies** (NB1).
8. Перф-гейт лишається ≤50мс/500 (A probe = 31–32мс, бюджет є).

## Критика
**plan-GATE r1 (свіжий контекст, Opus 4.8) — ✅ PASS.** Метрики відтворено (18 control-тестів +
measure-таблиця + перф A-500=32мс/B-500=196мс), code-заяви звірено правдивими на HEAD 19e6c13.
Рішення A над B визнано ЧЕСНИМ (не cherry-pick): звіт сам визнає, що прототип A програв на якості й
що B довів 0 на s4 (спростувавши §12-посилку для s4); вибір будується на твердій гарантії tree-0 +
добудовуваній слабкості + 0 deps + sync, з B як fallback. Blocking: немає. Non-blocking (усі → tasks):
- **NB2** (топ-умова): acceptance A-v2 §10.1.4 = 0 (feasibility доведена B), + фікстура реально-
  інфізибельного входу для §12-гілки. → задача 3.
- **NB1** (виправлено ЗАРАЗ): elkjs був у `dependencies`, не devDependencies — перенесено в
  devDependencies; план-крок 4 («devDependency — reversible») тепер правдивий.
- **NB3**: carry-forward spec-r2 (dangling/self-parent enumerate; 0/1-посади N6; epoch-guard) — у
  задачу 4 (усі покриті спекою GATE-r2-PASS; probeA вже має cycle-guard:52 і dept-0-members:89).
- **NB4**: B-перф не профільовано (не доведено «не тюниться», лише out-of-box промах) — rationale
  чесно хеджує; B лишається fallback.
- **NB5**: npm audit 4 high-sev не верифіковано рев'ювером — not load-bearing (A обрано, deps=0).
- Seam line-drift: `fromLayout:72` (план казав :800) — виправлено у задачі 5.
- **Вердикт r1:** PASS. Код A-v2 можна починати; acceptance за NB2.

## Закрито в grilling
- **Рушій A над B:** рішення власника + plan-GATE PASS (чесність підтверджена незалежно).
- **§12 драбина:** лишається, але acceptance A-v2 на §10.1.4 = 0 (B довів досяжність); маркер — для
  справді-інфізибельного входу (додати фікстуру).
- **elkjs:** перенесено в devDependencies; зняти разом зі скаффолдом після промоції A.
