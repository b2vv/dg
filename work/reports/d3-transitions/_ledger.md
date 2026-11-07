# D3 — transition-шар: ledger + routing (AI Factory)

**План-джерело:** `work/ROADMAP-extensibility.md` §«D3-деталь» + живу ноту
`1 - Notes/Sessions/2026-11-02 D3 spring-машинерія поглиблення (Dg 13).md` (усі 🔴 розвилки закрито власником).
**Порядок плану (власник):** D3 → D1 → R2/R3 (шаблони). Анкер доставки — A3 (`animate` opt-in OFF, semver minor).
**Root:** `/Users/strelia/projects/dg` · **гілка:** `feat/d3-transitions` · **база:** `0752843` (стекована на
`feat/t132-devtools-panel` → `chore/library-boundary-housekeeping`, не в `main`).
**Поріг spec-flow:** СПРАЦЮВАВ — нова підсистема SDK + публічний API (`animate`).

## Routing (workflow.md «Startup», review-handoff.md) — показано власнику 2026-11-05

| Роль | Хто | Межі |
|---|---|---|
| Coordinator / writer root | ця сесія `dg-13` (Claude) | spec/plan/tasks, нарізка, ledger, інтеграція; **один writer у checkout одночасно** |
| Helper (read-only) | субагенти `general-purpose`, тір sonnet | факти з коду file:line → власний `_helper-*.md`; без правок коду |
| Coder | Codex CLI (`codex exec --approve-for-me`), по одній задачі за раз | лише файли задачі; TDD; без `dist`/`build`/root-`typecheck` |
| Reviewer (незалежний) | субагенти: `gate-reviewer` (GATE 2), `code-review` (Standards+Spec, паралельно, read-only) | пакет за snapshot; PASS прив'язаний до SHA |
| Owner | власник | продуктові рішення, landing |

review_mode = **independent_subagent** (додаткової сесії-рев'юера немає). Спільні ресурси: `packages/sdk/dist`
спільний із хостом через `link:` → `npm run build` і root `npm run typecheck` (пише `.d.ts`) — **лише після «ок»
хост-сесії cass-***.

## Ledger (append-only; статуси DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED)

- H1 render-pipeline seams: dispatched (model=sonnet) → `_helper-H1.md`
- H2 clock/paint/tests/config: dispatched (model=sonnet) → `_helper-H2.md`
- H3 interactions with #96/T131/cull/export/edges: dispatched (model=sonnet) → `_helper-H3.md`
- H1: BLOCKED — API safeguards (Sonnet 5.5, `[reasoning_extraction]`, req_011Cgk2XpP1ovNtcsMW4nWGo); робочий файл не створено (не стартував).
- H2: BLOCKED — те саме (req_011Cgk2XnqVekG27jo3quYod); робочого файлу нема.
- H3: BLOCKED — те саме (req_011Cgk2XkkVeWvuq6oXKrCfq); робочого файлу нема.
- **Підсумок: запущено 3, повернуто 0.** Нічого з H1–H3 не вважається «чистим». Заземлення D3 — НЕ виконано. Рішення про повтор — за власником.

## OWNER OVERRIDE (2026-11-05) — масштабування
- **Кілька writer'ів в одному checkout ДОЗВОЛЕНО** (власник: «1 yes») — замість правила Factory «one writer». Умови:
  кожен кодер має **неперетинний** файловий скоуп (записано в задачі); **коміти робить лише координатор**, по черзі;
  **один слот важких гейтів** (повний `npm test`, `build:wasm`, root `typecheck`, `build`) — по черзі через координатора;
  кодер ганяє лише цільові тести своєї задачі. Worktree/clone — як і раніше заборонені.
- **Модель для helper/reviewer — Opus** (власник: «2 yes»), замість Sonnet 5.5 (впала на safeguards).
- **Усі внутрішні промпти агентам/Codex — англійською** (власник).
- H1–H3: re-dispatch (model=opus).
- H1 (opus): BLOCKED — Opus 5.5 safeguards `[reasoning_extraction]`, req_011Cgk3TVe9tmiLntBH1wPM8; файлу нема.
- H2 (opus): BLOCKED — те саме, req_011Cgk3TVPWxViXpx5oUUTFG; файлу нема.
- H3 (opus): BLOCKED — те саме, req_011Cgk3TVUEMB9nKmi7i61b7; файлу нема.
- **Підсумок двох хвиль: запущено 6, повернуто 0** (Sonnet 5.5 ×3, Opus 5.5 ×3). Заземлення D3 НЕ виконано. Субагенти 5.5-сімейства в цій сесії не стартують. Рішення — за власником.
- Хвиля 3 (власник: «Yes and go» → варіант 1): H1, H2, H3 dispatched (subagent=gate-reviewer, model=Opus 4.8, роль — read-only Helper, не вердикт гейта).
- H2: DONE (Opus 4.8) → `_helper-H2.md`. Ключове: спільного Clock-типу нема (тріо інлайн двічі: Viewport.ts:18-24, contourMorph.ts:122-131); requestPaint = один rAF, cull→render (PixiHost.ts:269-281), без «keep painting»; reduced-motion читається лише в resolveMotionBlur (OrgHierarchyDiagram.ts:2544); прецедент opt-in = staffRefitOnToggle `?? false`; тести — ручний rAF-спай/інжект годинника.
- H3: DONE (Opus 4.8) → `_helper-H3.md`. Ключове: SceneRegistry.clear() на вході render — попереднього layout нема, «from» треба знімати ДО clear; callback-таймінг різний (toggle/revealPath після кадру; expandToDepth/collapsePositionSubtree/setData ДО); T131 prepare-camera ламається від паралельної анімації нод; culling/nodeCenter/anchors/drop-index/overlay читають TARGET-бокси; PNG/PDF знімають живу сцену (треба settle), SVG — з моделі; анімацію стартувати лише після підтвердженого кадру (lastDrawnData===next), скасовна при відмові.
- H1: DONE (Opus 4.8) → `_helper-H1.md`. Ключове: усі staff-шляхи сходяться в `renderStaffCanvas` (DiagramRenderer.ts:717-784); єдина вузька точка — об'єкт `live` з `computeStaffLiveGeometry` (positionNodes+frames+routes) → годує Pixi, overlay (rememberBox→listNodeBoxes) і chrome; org — `OrgLayoutResult` у `renderOrganizations` (:1112-1207). Pixi-views ЗНИЩУЮТЬСЯ й створюються щорендеру (LayerManager.clear, LayerManager.ts:46-63) — пулу нема; переживає лише `promoted`. Лінії alpha — points[] з Rust, внутрішні A*-вершини перераховуються щорендеру. Нод-твінів нема.
- **Хвиля 3: запущено 3, повернуто 3.** Заземлення D3 — ВИКОНАНО.

## GATE 2 — plan-critique (4 лінзи, незалежні, clean context)
- slop: dispatched (gate-reviewer, Opus 4.8) → `_critique-slop.md`
- gaps: dispatched (gate-reviewer, Opus 4.8) → `_critique-gaps.md`
- complexity: dispatched (gate-reviewer, Opus 4.8) → `_critique-complexity.md`
- edges: dispatched (gate-reviewer, Opus 4.8) → `_critique-edges.md`
- Пакет критикам: plan.md + spec.md + _helper-H1..H3 + standards.md + роадмап; БЕЗ авторського вердикту.
- slop: DONE → 0 blocking, 2 non-blocking (isTransitioning без споживача; FrameClock «shared» перебільшено — не дедуплікує Viewport/contourMorph).
- complexity: DONE → 0 blocking, 3 non-blocking (isTransitioning дублює getTransitionFrame!==null; cancel/snapToTarget/settleNow — неоднозначне «settle» між T-B/T-C; 4-рівневий ланцюг onFrame — виправданий, лише не додавати query-методів).
- edges: DONE → 3 blocking, 5 non-blocking. gaps: DONE → 6 blocking, 3 non-blocking.
- **plan-critique: запущено 4 / повернуто 4.** Після злиття: 6 blocking (B1–B6) → закрито правками plan.md (рев. 2); зведення `_gate2-critique.md`.
- Наступне: re-check дельти тими самими лінзами gaps+edges (SendMessage тим самим рев'юерам) ∥ plan-defense (новий gate-reviewer).
- re-check gaps (rev 2): sent to the SAME reviewer (resume). re-check edges (rev 2): sent to the SAME reviewer (resume).
- plan-defense: dispatched (new gate-reviewer, Opus 4.8) → `_defense.md`.
- re-check gaps: DONE → 6/6 попередніх CLOSED; 1 NEW blocking (лінії React-хрому без стадування) + 1 non-blocking (носій RenderReason) → закрито в plan.md рев. 3 (`lines: []` під час руху, `pendingReason` OR-накопичувач, уточнення підтвердження/витіснення, рядок #33).
- plan-defense: DONE → 3 gaps (Q2 material: покадровий 'transition' без try/catch вбиває тік; Q1, Q4 minor) → закрито в plan.md рев. 4 (§5.4, §6 геометрія out-of-scope, рядки #34–#36, таблиця §11).
- re-check edges: DONE → B3/B4/B5 CLOSED; 2 NEW blocking (N1 коалесований animate+LOD → морф між LOD; N2 abort знищує єдину копію підтвердженого кадру) + 2 non-blocking (blob-контури; ghosts при snap) → plan.md рев. 5 (LOD-правило сильніше за причину; abort відновлює; blob стадуються; snap прибирає всіх ghosts; рядки #37, #38).
- Далі: фінальна дельта-перевірка рев. 5 тими самими 3 рев'юерами (gaps, edges, defense) паралельно.
- plan-defense re-check (rev 5): DONE → 5/5 closed, 0 gaps (той самий рев'юер).
- edges final re-check (rev 5): DONE → N1, N2, blob, reaping CLOSED; 0 blocking (edges gate GREEN); 3 non-blocking + impl caveat → внесено в рев. 6 (lastConfirmedLod, abort відновлює views map, ghost-reconcile на кожному проході, backdrop unmount → settleNow, рядки #39, #40).
- gaps final re-check (rev 5): DONE → GREEN, 0 blocking; 3 non-blocking → рев. 6. **GATE 2: critique ЗЕЛЕНИЙ, defense ЗЕЛЕНИЙ.** Далі — конституція inline + tasks.md.
- Конституція (inline, координатор): 1 прогалина (недокументована зміна публічного getStaffChromeGeometry: lines:[] + linesOpacity) → дописано в T-E → PASS. **GATE 2 = ЗЕЛЕНИЙ (critique + defense + конституція).**
- T-A0: dispatched (coder=Codex CLI exec) → `_impl-T-A0.md`
- T-A0: complete (commit bc9a827, review: coordinator verbatim-check vs plan §3 + typecheck/lint, model=Codex CLI).
- T-A: dispatched (coder=Codex CLI #1) → `_impl-T-A.md` · T-B: dispatched (coder=Codex CLI #2, паралельно) → `_impl-T-B.md`
- Wave 1 mutation runner (coordinator, disposable scratch copy): 22/22 KILLED → `_review-wave1-mutations.md`. Reviewers: standards ∥ spec dispatched (gate-reviewer, Opus 4.8).
- Review SPEC (wave 1): DONE → GREEN, 0 blocking; non-blocking: (1) тест re-entry #39 без зубів (поглинання гарантоване Map; пропозиція: assert made.length); (2) tick() snap при >MAX_STEPS — буквально за брифом/#13, АЛЕ поріг ~117мс спрацьовує на ОДНОМУ foreground-ривку в перші 750мс → картки «телепортуються»; фікс: відкинути залишок і продовжити, snap лишити cap-у — ПОТРЕБУЄ РІШЕННЯ ВЛАСНИКА.
- Review STANDARDS (wave 1): DONE → GREEN, 0 blocking; non-blocking: extensionless imports у TransitionController(.test).ts:1-4; data clump confirmed*; неактивна директива eslint (oxlint) animators.ts:49.
- **Review wave 1: запущено 2 / повернуто 2, обидва GREEN.** Коміт — рівно рецензований snapshot (хеші звірено); неблокуючі правки — наступна сесія з дельта-рев'ю.
- T-A: complete (model=Codex CLI, reviewer=gate-reviewer Opus 4.8 ×2, mutations 22/22). T-B: complete (те саме).

## Після handoff (та сама сесія)
- **Рішення власника (2026-11-05, «Yes»):** `tick()` при >MAX_STEPS_PER_FRAME — відкинути залишок акумулятора й ПРОДОВЖИТИ анімацію; snap до кінця лише через cap (750 мс) або settle. Рядок #13 уточнено: 5-секундна пауза → cap → кінцевий стан; одиночний ривок кадру → анімація триває.
- T-A1 (фікс tick + неблокуючі правки хвилі 1): dispatched (coder=Codex CLI) → `_impl-T-A1.md`
- T-A1: DONE_WITH_CONCERNS (Codex: директива max-classes-per-file НЕ неактивна — правило в pedantic=error; замінено на oxlint-disable; координатор підтвердив: без директиви oxlint exit 1). 59/59; мутації M24, M24b, M22 KILLED. Дельта-рев'ю: standards ∥ spec (ті самі рев'юери).
- Delta review STANDARDS (T-A1): DONE → GREEN; знахідку (3) рев'юер ВІДКЛИКАВ (сам перезапустив oxlint); (1) CLOSED; (2) data clump — лишається неблокуючим.
- Delta review SPEC (T-A1): DONE → GREEN; (1) re-entry teeth CLOSED, (2) tick() CLOSED за рішенням власника. **Дельта-рев'ю: 2/2 GREEN.** T-A1: complete.

## Хвиля 2 (нова сесія, 2026-11-05)
- Брифи написано: briefs/T-C.md (рендерер), T-D.md (оверлеї+PromoteSyncReason), T-E.md (фасад+USAGE). Шви зафіксовані plan §5.1–§5.4; контракт §3 landed.
- Звірка якорів у коді перед брифами: DiagramRenderer render(:504)/clear(:523-524)/lastLod(:538)/getStaffChromeGeometry(:444)/onNeedsPaint(:213); promoteMath PromoteSyncReason(:85 = camera|structural|prepare-camera); facade notifyPromoteSync(:637 bare loop)/export(:2449)/destroy(:2516)/T131(:1533-1540). OK.
- T-C ∥ T-D ∥ T-E: dispatched (coder=Codex CLI exec, --approve-for-me, без worktree, 3 паралельно, неперетинні файли) → _impl-T-C.md / _impl-T-D.md / _impl-T-E.md

- **T-C: BLOCKED** (0 змін) — знайшов контрактний баг хвилі 1: `TweenAnimator.retarget(1)` скидає `elapsedMs=0` → `settled=false` навіть при opacity вже=1; `prepare` незмінних даних з animate:true → `isActive()` true → порушення #11 (0 кадрів). Хибно-зелений хвилі 1: тест #11 на фейку `LinearAnimator` (`settled=value===target`) маскував. Координатор підтвердив у коді (animators.ts:66-72, TransitionController.ts:67, test:11). T-C правильно зупинився (бриф: контракт неправильний → QUESTION+stop).
- **T-D: DONE_WITH_CONCERNS** → _impl-T-D.md (785 рядків). 56 тестів зелені, лише свої файли (react/*, promoteMath.ts). Concern = крос-таск typecheck/lint червоний у файлах T-C/T-E (очікувано), інтеграція Pixi/facade — координатору. На рев'ю.
- **T-A2 (контрактний фікс): dispatched** (Codex exec, bfj5tgk7k) → _impl-T-A2.md. RED (реальний createAnimator відтворює #11) → idempotent `TweenAnimator.retarget` при target===current → GREEN. Після нього — перезапуск T-C з чистого стану (0 змін T-C).
- T-E: ще біжить (b09d9pzbp).

- **T-E: DONE_WITH_CONCERNS** → _impl-T-E.md (1317 рядків). 13 boundary-тестів зелені, lint ок. 10 помилок typecheck = рівно посилання на шви T-C (резолвляться після T-C). Нові публічні методи фасаду: `setStaffReactChromeMounted`, `getTransitionFrame`; USAGE оновлено (заявлено). Шви для координатора → `_integration-notes.md`.
- **Хвиля 2 проход 1: запущено 3 / повернуто 3** (T-C BLOCKED-контракт, T-D+T-E DONE_WITH_CONCERNS). Інтеграційні шви зведено в `_integration-notes.md`. Чекаю T-A2 → перезапуск T-C.

- **T-A2: complete** (commit 4cc6b55, review=gate-reviewer Opus 4.8 GREEN, model=Codex CLI, 74/74 transition). Контракт #11 відновлено на реальному factory.
- **T-C: re-dispatched** (Codex exec, briefs/T-C-resume.md — адендум: settle-сигнал getTransitionFrame→null, RenderOptions.transition/RenderReason; базовий бриф T-C.md чинний) → продовження в _impl-T-C.md.

## Хвиля 2 — проход 2 (після T-A2)
- **T-C: DONE** → _impl-T-C.md (resume). 54 owned-тести GREEN, SDK noEmit typecheck + lint PASS. Файли: DiagramRenderer.ts, LayerManager.ts, SceneRegistry.ts, personInteractions.ts + DiagramRenderer.transitions.test.ts.
- **Інтеграція (координатор):** `typecheck -w @org-hierarchy/sdk` ЧИСТО (резолвить 10 посилань T-E). Повний `npm test -w @org-hierarchy/sdk`: **1451 тестів, 0 падінь, 170 файлів**. `check:docs`: ЗЕЛЕНИЙ (лінки, публічний API вкл. нові методи, барель, брифінг у межах).
- Дві «дірки» зі швів виявились хибними: (1) promoteMath.ts diff = лише зміна T-D (glob захопив); (2) `setStaffReactChromeMounted` — за дизайном ХОСТОВИЙ API (оновлює renderConfig.staffReactChrome), backdrop хоста, не оверлея; шов §5.3 коректний і задокументований у USAGE.
- **Рев'ю хвилі 2: dispatched** (gate-reviewer Opus 4.8 ×2, над інтегрованим дифом) → _review-wave2-standards.md ∥ _review-wave2-spec.md. Spec мапить усі 40 рядків приймання на тести (adversarial: true-without-feature?). Standards — KISS/imports/error-isolation/false-green.
- **Рев'ю Standards (хвиля 2): DONE → GREEN**, 0 блокерів. False-green hunt чисто (новий тест рендерера на реальному engine, #11 реально асертиться; facade-seam звучний — кожен шар на реальній реалізації). Error-isolation §5.4 на 4 шарах. WASM незмінний. Неблокуючі: дубль RenderReason (DRY, OrgHierarchyDiagram:288 vs DiagramRenderer:80 — див. _integration-notes §2); AnimatorFactory single-consumer (не дефект).
- **Рев'ю Spec (хвиля 2): DONE → GREEN**, 0 блокерів. Усі 40 рядків приймання → тести з «red-if-deleted» (89 тестів у 4 файлах, 0 падінь). Жоден рядок не суперечить Q1–Q8 чи швам §5. Неблокуючі: (1) нема наскрізного e2e — шари ізольовані (та сама форма, що сховала хибно-зелене хвилі 1) → рекомендація тонкого e2e; (2) #40 auto-wiring відсутній (хостовий API — прийнятно); (3) барель без AnimateOption/TransitionFrame/RenderReason; (4) Q7 камера стрибає на settle, не анімується (рядок #23 виконано, відповідає плану; розходиться лише з візією).
- **Координатор — барель (concern 3): ЗРОБЛЕНО.** index.ts: `export type { AnimateOption, AnimatePreset, TransitionFrame, FrameBox }`. RenderReason/ResolvedAnimate внутрішні — не експортовано (KISS). typecheck ✅, check:docs ✅ (барель-гейт), test:scripts ✅.
- **Концерн 1 (e2e) — беру:** та сама форма, що вкусила хвилю 1, + dist спільний із живим хостом; план §10 і так визначав integ як «повна діаграма». T-F (e2e): dispatched (Codex bxdo296m4) → _impl-T-F.md. Новий координаторський файл OrgHierarchyDiagram.transitions.e2e.test.ts (real facade+renderer+controller+overlay, лише clock інжектований). Якщо шов не збігається — QUESTION+stop (це і є сенс тесту).
- Концерн 2 (#40 auto-wiring) і 4 (Q7 візія) — задокументовано як відомі обмеження; не блокери.
- **T-F (e2e): BLOCKED проход 1** — наскрізний «0 rAF у спокої» не тримається: після settle перехід уже null (D3-спокій ВИКОНАНО), але Pixi EventSystem ticker (EventTicker.mjs:39→Ticker.mjs:128) планує rAF незалежно — ambient event-полінг, прееснуюче, поза скоупом D3. T-F правильно зупинився (не послабив асерт, не чіпав прод). Рендерер-тест не монтує Pixi-події → його 0-rAF валідний на своєму рівні; контролер clock у проді = global rAF (DiagramRenderer.ts:266).
- **Відома нотатка (поза D3, власнику):** ambient Pixi EventTicker трохи суперечить коментарю PixiHost «idle costs nothing» (autoStart:false+app.ticker.stop зупиняють лише render-ticker, не event-ticker). Беклог-кандидат; НЕ чіпаємо в D3.
- **T-F: re-dispatched** (Codex, briefs/T-F-resume.md — міряти D3-спокій через відсутність нових 'transition' promote-sync + getTransitionFrame()===null, не сирий rAF) → продовження _impl-T-F.md.
- **Інцидент T-F resume проход 2:** фоновий `codex exec` без закритого stdin завис ~70 хв на «Reading additional input from stdin...» (nohup-stdin не EOF-иться). Вбито; перезапущено з `< /dev/null` → одразу пішов (лог росте). Урок: фоновий codex завжди з `< /dev/null`.
- **T-F (e2e): complete** (model=Codex CLI). Один it, 32 асерти, реальний стек (facade+renderer+controller+overlay), лише clock інжектований. Координатор звірив кожен асерт на «red-if-deleted» + прогнав сам.
- **Координатор — перевірка перед комітом:** e2e GREEN; повний SDK-сьют **171 файл / 1450 тестів / 0 падінь**; `typecheck -w` чисто; `lint` чисто; `check:docs` зелений.
- **ХВИЛЯ 2 ЗАКОМІЧЕНА: `1c8356c`** (T-C/T-D/T-E + барель + e2e; 15 файлів, +1780/−90). Рев'ю Standards+Spec GREEN, 0 блокерів. T-A2 окремо (4cc6b55).
- **ЩЕ НЕ ЗРОБЛЕНО:** важкі гейти (root `typecheck`, `build`, повний root `npm test`) — пишуть у СПІЛЬНИЙ dist → лише після «ок» cass-сесії (handoff §8). Мутації хвилі 2 на інтеграційному коді — не робив (нові «модулі» = правки великих файлів, не чисті; ключовий false-green ризик закрито T-A2 + e2e). Пуш/мерж — власник не просив.
- **Беклог власнику (поза D3-зрізом-1):** (1) Q7 камера їде з нодами (зараз стрибає на settle, рядок #23 виконано); (2) Pixi EventTicker idle-cost (PixiHost «0 idle» неповний).

## Пост-коміт (user: мутації + пуш + беклог)
- **Пуш:** `origin/feat/d3-transitions @ 1c8356c` (upstream встановлено, 10 комітів поверх origin/main). Мерж — власник.
- **Беклог-issues:** #98 (Q7 камера їде з нодами, enhancement+ready-for-human), #99 (PixiHost idle EventTicker, enhancement+needs-triage).
- **Таргетовані мутації хвилі 2** (in-tree mutate→test→`git checkout`, усе закомічено, 3/3 KILLED):
  - M1 LOD-wins (DiagramRenderer:421, прибрано `lastConfirmedLod===lastLod`) → «LOD change wins over animate» FAIL (очікував null, got frame). KILLED.
  - M2 getTransitionFrame null-at-settle (DiagramRenderer:360, прибрано `isActive()`-гард) → 11 тестів FAIL. KILLED.
  - M4 сигнал-ізоляція (OrgHierarchyDiagram:666, `if(true)`) → «one throwing transition subscriber…» (#34) FAIL. KILLED.
  Дерево відкочено чисто (git status порожній). Інтеграційний код покритий — ключові інваріанти реально вартові.
- **cass-13:** дав «ок» на dist-build, АЛЕ флаг: на :4000 живе vite власника (pid 15278), hot-pick нового dist → питаю власника перед збіркою. Пояснив cass: feat/d3-transitions не в main = незавершена фіча, мерж = рішення власника (не навмисний пін хоста).
- **ЧЕКАЄ:** дозвіл власника на збірку (через :4000). Після — root typecheck+build+повний root npm test, тоді SHA+зміни → cass.

## Важкі гейти (дозвіл власника отримано) — ЗЕЛЕНІ
- root typecheck ✅ (sdk noEmit + build:types→dist + demo + e2e tsc). Демо бачить новий публічний API.
- build ✅ (tsc + copy-wasm + check-package «every referenced file ships»). **dist перезібрано з 1c8356c.**
- повний root npm test ✅ — sdk 171 файлів/1450/0, demo 18 файлів/132/0.
- cass-13 повідомлено: SHA 1c8356c + перелік публічних змін + попередження про 'transition' для власних promote-слухачів. Чекає переміряти baseline меню на новому dist.
- **D3 transition-шар зріз 1 (staff-шлях): ЗАВЕРШЕНО.** Гілка feat/d3-transitions запушена, dist задеплоєно. Мерж у main — рішення власника (не просив).
