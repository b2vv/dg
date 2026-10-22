# R-dg-F — selection path-highlight + found-focus dim (SDK)

**Status:** 🟡 `design` — дизайн-доку до коду. Критика: р0 → **р1 critique+defense (ЧЕРВОНІ): B1, Q1, Q2, N1-N7, Q5, F2-knob — внесено** → **р2 re-gate (ЧЕРВОНІ, збіглись): минулі підтверджено закритими; нове — legacy-router edge-cache (blocking), baseline-source при registerView, EDGE-raw↔NODE-typed ключі — внесено нижче**. Ця редакція — після р2.
**Сторони:** SDK = `dg`/`@org-hierarchy/sdk` (Cass 2, `bulk-mutations` @ `e549827`); споживач = `cassiopeia-admin-ui` ШПС (R-dg-F з host-контракту §4.1).
**Заземлення:** grounding 2026-10-22 (звірено на коді) + host-контракт §4.1.

---

## Лід

SDK має дати **підсвітку шляху** (вибір вузла → лінії root→вузол і прямі підлеглі акцентом, решта edges приглушені) і **found-focus** (пошук → не-знайдені вузли приглушені, знайдені акцентовані), керовані явними фасадними методами й **стійкі до `setData`**. Стан світу: цього в SDK **нема** (`highlightPath`/`setFoundFocus`/dim = 0); selection API повний, але клік малює лише overlay-chrome. **Виняток:** accent/dim — **theme-керовані** (host дає з cass-токенів); шлях — лише `reportLines.kind==='admin'`; до першого успішного render виклики — no-op (стан у viewState, застосується потім).

---

## Чому (§1)

**Біль.** Оператор ШПС має бачити підпорядкування/підлеглих (шлях вибору) і не губити знайдене серед сотень карток (found-dim). Мокап: вибір → акцент #e5491d 2px + решта 40%; пошук → не-знайдені ~38%.

**Вада наявного шляху (dg HEAD `e549827`):**
- **Клік не перемальовує edges/nodes.** `select()`/клік → `repaintSelection` (`DiagramRenderer.ts:481-488`) малює лише selection-chrome у `layers.overlay` («no rebuild»); edges/nodes не чіпає. 🪤 `repaintSelection` кличеться на КОЖЕН клік (`onPersonClick` :808, `onOrgClick` :789) — тож highlight НЕ можна фолдити в нього (N7).
- **Нема обходу `reportLines`.** `DiagramReportLine{fromId,toId,kind}` (`data/types.ts:175-179`) — плаский масив, parent-мапи нема. `revealOrgPath` (`interaction/revealPath.ts:8-34`) йде по `parentOrgId` ОРГ-дерева, не по reportLines.
- **Edge-view малює все per-kind** (`StaffEdgesView.redraw` :86-123; `OrgEdgesView.redraw` :27-40). Готовий per-edge патерн — marked-crossing (`StaffEdgesView.ts:101-104`): ключ `${seg.fromId}\u0000${seg.toId}` у `markedKeys` → інший колір+ширина. 🪤 edge-view створюються ІНЛАЙН і кладуться в `layers.edges` (`DiagramRenderer.ts:810-814,822-826,1054-1058`) — рендер НЕ тримає ref (N3). `OrgEdgesView` малює по SVG `e.path`, БЕЗ fromId/toId (N1 — орг-лінки не акцентуються ключами).
- **Node-dim існує як механізм, не API.** `view.alpha` (`DiagramRenderer.ts:160,889` `EXTERNAL_CARD_ALPHA=0.55` для `role==='external'`, той самий вузол у SceneRegistry :900). `SceneRegistry.getView/registerView` (`:81-114`); `listViews()` НЕМА. 🔴 Baseline alpha зовнішніх = 0.55, НЕ 1 — скид dim мусить це поважати (B1).
- **`setData` гасить усе.** `setData` → `applySelection(null)` (`:1113`) + `render()` (повний rebuild, `SceneRegistry.clear()`); highlight/found не зберігаються → зникли б.

---

## Рішення (§2)

**Два viewState-стани (`highlightedNode`, `foundFocus`), фасадні `highlightPath(nodeId|null)` / `setFoundFocus(ids|null)`; SDK рахує шлях з `reportLines` (чистий `reportPath.ts`), застосовує accent/dim ОКРЕМИМ легким `repaintHighlight` (без WASM-rebuild, з кешу routed-сегментів) і ре-аплаїть стан у хвості renderNow; accent/dim — theme-керовані; скид поважає per-role baseline.**

### Механізм

1. **Чистий обхід — `interaction/reportPath.ts`.** З `reportLines` (лише `kind==='admin'`): `childToParent` (`toId→fromId`) + `parentToChildren`. `reportPath(nodeId, lines)` → `{ nodeKeys:Set, edgeKeys:Set }`: ланцюг root→node + прямі підлеглі (`fromId===node`); `edgeKeys` = `${fromId}\u0000${toId}` (формат StaffEdgesView). 🪤 visited-guard (цикл/самопосилання → обрив, не зависання, прецедент `revealPath.ts:18`); відсутній id → порожньо; `reportLines` порожні/без admin → лише сам вузол (root-only).
2. **ViewState** (`ViewStateStore`, поряд зі `staffExpanded*`, що переживають рендер — `OrgHierarchyDiagram.ts:758`): `highlightedNode: string|null`, `foundFocus: ReadonlySet<string>|null`. 🪤 **Два РІЗНІ простори ключів (не плутати):** EDGE-ключі лишаються **RAW** `${fromId}\u0000${toId}` (raw position-id з `reportLines`, рівно як у `StaffEdgesView.ts:101` — нормалізувати їх у typed = тихий промах accent-match); NODE-ключі (`foundFocus`, SceneRegistry views) — **typed** (`position:id`/`person:id`/`organization:id`, `nodeEntityKey`). Host може дати bare id для `setFoundFocus` → kind-резолюція на вході фасаду: пробувати typed-форми крос-kind (як `getBox` :64-68) або прийняти вже-typed (highlightPath бере nodeId з reportLines → raw, тут нормалізації не треба). Ре-аплай у **ХВОСТІ renderNow** (після `await …render()`, за guard `destroyed`, після `host.requestPaint()` — ~`:861-865`, НЕ `:773` що є `selected:` всередині виклику). `setData` чистить ОБИДВА **явно** (поряд з `applySelection(null)` :1113).
3. **Edge accent/dim.** 🪤 Рендер зберігає **ref на поточні edge-view** (поле або через `layers.edges.children`, N3). 🔴 **Кеш — router-агностичний `lastSegments`** (F-NEW-1): `StaffEdgesView` зберігає сегменти, які РЕАЛЬНО намалював у `redraw` — під `staffEdgeRouter:'v2'` це `routedSegments` (:808-813), під default-`legacy` — результат `buildStaffEdgeSegments(edges,boxes)` (:98). Новий `applyHighlight({accentKeys, dim})` re-stroke'ить `lastSegments` БЕЗ layout. Заборона «НЕ edges+boxes» (p1-N4) стосувалася лише v2-re-routing (`resolveStaffRouting` недетермінований щодо порядку); `buildStaffEdgeSegments` (`layout/staffEdgeGeometry.ts:433-459`) — **чистий/детермінований**, тож legacy-кеш безпечний і лінії не стрибають. Accent-ключі → `accentColor`/`accentWidth`, решта → `dimAlpha` (40%). **`OrgEdgesView` під highlight/found = DIM-ONLY рівномірно** (орг-лінки без from/to-ключів), path-accent лише staff (N1).
4. **Node dim.** `SceneRegistry.listViews()` (нове). 🔴 **Джерело baseline — знятий при `registerView`** (F-NEW-2): `SceneRegistry` зберігає `baselineAlpha` кожного view на момент `registerView` (:110-114) — там alpha вже коректна, бо `role==='external'→0.55` ставиться на `:889` ДО `:900`; `listViews()` сам віддає голий Container без ролі, тож baseline треба памʼятати, інакше імплементер захардкодить 1 і відтворить B1. При активному `foundFocus`: found → `baselineAlpha`, не-found → `foundDimAlpha` (~0.38). 🔴 **Скид (null / `[]` / жоден id не збігся зі сценою) = відновити `baselineAlpha`** (external→0.55, решта→1), **НЕ хардкод 1** (B1). `[]`/no-match = скид, не dim-all (Q1).
5. **Окремий `repaintHighlight` (без rebuild, НЕ у repaintSelection).** Викликається ЛИШЕ з фасаду `highlightPath`/`setFoundFocus` + з re-apply-хука renderNow; **no-op guard**, коли highlight/found неактивні. НЕ фолдити в `repaintSelection` (той на кожен клік — N7). Застосовує edge-accent (п.3, re-stroke з кешу) + node-alpha (п.4). 🪤 **До першого успішного render** (кеш/views ще нема) або коли render впав — `repaintHighlight` = **no-op**; стан лежить у viewState і застосується в хвості renderNow (Q2); guard на порожній кеш/відсутні views.
6. **Фасад** (симетрично `select*`, `:1464-1490`): `highlightPath(nodeId:string|null)`, `setFoundFocus(ids:string[]|string|null)`. Кожен: нормалізує+мутує viewState (п.2) → `repaintHighlight` (п.5). `null` (і `[]` для found) = скид.
7. **Theme-керовані accent/dim.** `EdgeStyle.accentColor?`/`accentWidth?`/`dimAlpha?` — **безпечні** (spread у `mergeTheme :458`). Node-dim — новий **top-level** `NodeTheme.foundDimAlpha?`: 🔴 top-level ключ mergeTheme НЕ протягує сам (per-key allowlist, та сама F2-пастка що з `fonts`) → **внести `foundDimAlpha` в ОБИДВІ гілки `mergeTheme` (render/types.ts:436-489) + розширити theme.test** (N2 / defense-F2). Дефолти = мокап (`0xe5491d`/`2`/`0.40`/`0.38`). Host мапить із cass-токенів (`linkAccent` → `accentColor`) через `positions-dg-theme.ts`. Хардкоду кольору в рендері нема.

### Відкинуті альтернативи та ціна
- **Авто-highlight на кожен `select()`** — зчеплення з bulk/deselect; host-контракт §7.4 просить явний примітив; auto = host кличе сам у `onNodeClick`.
- **Повний `renderNow` на highlight/found** — WASM-layout на кожен клік/пошук, миготіння. → легкий repaint (п.5).
- **Хардкод #e5491d/альф** — знову «правити dg на візуальну зміну», проти theme-API. → theme-knobs (п.7).
- **node-dim як top-level БЕЗ mergeTheme-кроку** — мовчки випаде (F2); тому крок mergeTheme явний (п.7).
- **matrix/dotted/org-path у шлях** — поза межами (шлях лише admin-staff).

**Єдиний шов:** viewState + окремий `repaintHighlight`; нові — `reportPath.ts`, 2 viewState-поля (typed-нормалізовані), 2 фасадні методи, edge-view ref + routed-кеш + per-edge accent, `listViews()`, theme-knobs (+mergeTheme-крок для top-level).

---

## Поза межами
- Accent-ring знайденого (found = просто не приглушений); matrix/dotted/lead-org/org-path у шлях; висхідні зв'язки.
- Engine-swap/host-wiring (host кличе highlightPath/setFoundFocus) — окремо.
- Overlay-картки (React) dim — host.

## Форма перевірки (§Verification)
- **Чисті шви (unit):** `reportPath` — лінійний ланцюг; кілька прямих підлеглих; root-сам; **цикл A→B→A → обрив**; missing id → порожньо; matrix/dotted ігноруються; `reportLines` порожні → root-only. ViewState: highlight/found зберігаються, чистяться на setData, **нормалізація bare id ↔ typed key** (N6). mergeTheme протягує `foundDimAlpha` (base+partial).
- **Компонентні (замокано шов):** `highlightPath(id)` → edge-view accentKeys+dim, nodes не чіпані; `setFoundFocus(ids)` → не-found alpha=foundDimAlpha, found=baseline; **`setFoundFocus([])`/null/no-match → скид до per-role baseline** (не dim-all); **до першого render → no-op, стан у viewState, застосується в хвості renderNow** (Q2); після `setData` стан очищено (accent не висить на нових id); OrgEdges під found = dim-only; **highlight-accent працює і під `legacy`-, і під `v2`-router** (lastSegments-кеш, F-NEW-1).
- **Ручний гейт із контрольною пробою:** вибір → шлях #e5491d, решта 40% (колір МІРЯТИ з канви — memory `feedback_measure_color_from_dom_not_by_sight`); пошук → не-found 38%. **Контрольні проби:** (а) highlightPath на вузол без admin-батька → лише прямі підлеглі, не впав; (б) setFoundFocus на неіснуючий id → ніхто не приглушений (скид), а не всі 38%; (в) 🔴 **пошук при видимій зовнішній картці → скид found → зовнішня лишилась 0.55** (не 1) — доводить baseline-restore (B1); (г) accentColor=0x00ff00 → шлях зелений (theme-керованість, не хардкод).

## Критика (§Critique)
- **р0 (авторський):** decision (явний highlightPath; легкий repaint; theme-knobs) з ціною; seam (viewState+repaintHighlight; marked-crossing+EXTERNAL_CARD_ALPHA реюз).
- **р1 `plan-critique` (ЧЕРВОНИЙ, 1 blocking+7 nb):** B1 baseline-clobber → п.4+Форма(в); N1 OrgEdges dim-only → п.3; N2 node-dim F2 → п.7; N3 edge-view ref → п.3; N4 routed-кеш → п.3; N5 анкор ~:861-865 → п.2; N6 typed-key нормалізація → п.2+Форма; N7 окремий repaintHighlight → п.5. AI-slop чисто.
- **р1 `plan-defense` (ЧЕРВОНИЙ, Q1/Q2/Q5):** Q1 no-match=скид → п.4; Q2 до-першого-render no-op → п.5; Q5 rollback → §Rollback. Q3/Q4 закрито (п.2 last-write + visited-guard).
- **р2 re-gate (ЧЕРВОНИЙ, обидві лінзи збіглись):** B1/N1-7/Q1/Q2/Q5 підтверджено закритими. Нове: **legacy-router edge-cache** (blocking) → п.3 (router-агностичний `lastSegments`); **baseline-source** → п.4 (знімати при `registerView`); **EDGE-raw↔NODE-typed** ключі → п.2. Усе внесено.
- **Вердикт:** концептуальних дірок 0; blocking (legacy-cache) + seam внесено. Залишок — механіка з контрольними пробами, яку доводить код.

## Rollback (Q5)
Фіча **чисто-canvas, opt-in, без persistence/міграцій/зовнішніх ефектів.** Методи фасаду нові (наявні demo/org їх не кличуть), theme-поля опційні з дефолтами → для не-споживачів API **інертний**. Rollback = revert версії dg / не вмикати host-wiring; наявні консюмери не зачеплені; незворотного нема.

## 8 секцій
1. **Що** — path-highlight + found-focus dim (canvas, theme-керовані). 2–6, §Rollback — вище. 7. **Залежності** — reportLines.kind='admin'; host мапить accent/dim-токени (positions-dg-theme.ts); engine-swap вмикає виклики (окремо). Highlight **router-агностичний** (lastSegments, п.3), але ШПС і так ставить `staffEdgeRouter:'v2'` заради dept-routing (R-dg-A) — окрема причина, не умова highlight. 8. **Фази** — нижче.

## Фази
- **Ф-R1 (dg):** `reportPath.ts` + viewState(EDGE-raw/NODE-typed) + `SceneRegistry.listViews()`+`baselineAlpha` при registerView + edge-view ref + `lastSegments`-кеш (router-агностичний) + per-edge accent/dim (Staff) / dim-only (Org) + node-alpha(baseline-aware) + окремий `repaintHighlight`(no-op-guard, before-render-safe) + фасад highlightPath/setFoundFocus(bare-id kind-резолюція) + theme-knobs(EdgeStyle + top-level foundDimAlpha з mergeTheme-кроком обох гілок) + setData-очищення + ре-аплай у renderNow-хвості. Unit + компонентні.
- **Гейти:** package-scoped dg (`test`/`typecheck`/`oxlint`/`check-docs` — нові фасад-методи → USAGE.md).
- **Споживання host'ом** — engine-swap, окремо.

## Закрито в grilling
- р1 critique (B1+N1-7) + defense (Q1/Q2/Q5) — внесено. **Re-gate попереду.**
