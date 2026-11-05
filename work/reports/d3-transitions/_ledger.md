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
