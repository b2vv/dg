# Хід робіт за AI Factory (workflow · lifecycle · skills) — T126 / T127a / T127b (Dg17)

**Вимога власника (O-50):** «Похід всіх задач має бути виконаним за правилами ai factory: workflow, lifecycle, skills».
**Джерела правил (прочитано повністю):** `.ai/README.md`, `.ai/project/adapter.md`; managed root `/Users/strelia/project-data/ai-factory-kit` (pin `17a9527`): `ai-factory/workflow.md`, `pre-code-checkpoint.md`, `feature-lifecycle.md`, `models.md`. **Не прочитано (ризик):** `review-handoff.md` (90 р.), `skills/**/SKILL.md` (spec-flow, plan-critique, plan-defense, acceptance-spec, tdd, code-review, design-pass — читати при виклику). Precedence: **локальні норми `dg` > Factory** (`.ai/README.md` п.4).

## 0. ЧЕСНЕ ВИЗНАННЯ: що в Dg17 було ПОЗА правилами Factory
1. **`.ai/README.md` не читав** (AGENTS.md велить читати першим) — прочитано лише тепер.
2. **Жодного Factory-скіла не викликано** (Skill-tool: `spec-flow`, `plan-critique`, `plan-defense`, `acceptance-spec`, `grilling`, `tdd`, `design-pass`, `code-review`…). Працював сирими агентами й інлайн.
3. **Мої «критики» ≠ planning gate.** Це були ad-hoc адверсарні ревʼю (`gate-reviewer`, свіжий контекст). `plan-critique` вимагає **чотири незалежні лінзи**, `plan-defense` — **п'ять фіксованих питань**; промпт/версія/хеш критика й SHA плану **не записані** (`pre-code-checkpoint.md`: «Record prompt path/version/hash…»). **Тому їхні вердикти НЕ є GATE 1/2 і не зараховуються як PASS планового гейту.** Вони лишаються корисними знахідками.
4. **Startup-запис** (хто виконує критику: новий субагент / наявна сесія / НЕ ВИЗНАЧЕНО) **не оформлено** — оформлено нижче (§1).
5. **Код-diff Dg17 не рев'юовано** скілом `code-review` (дві осі Standards+Spec); ревʼю стосувались документів.
6. **ADR-0002 переписано, але переписану редакцію незалежно НЕ перевірено** (критик перевіряв попередню).
7. **Нові доменні терміни** (`namespace`, `обгортка організації`, `обгортка відділу`) введено в T127, але **глосарій `CONTEXT.md` не оновлено** (`workflow.md`: нові терміни → `grill-with-docs` + `domain-modeling`, реальний glossary update).
8. **Task branch / WIP:** працюю на `feat/shps-staff-demo` з **22 незакоміченими файлами коду** (база Dg13-17). Правило Factory: одна task branch, один writer; **«stash/reset/clean/commit для звільнення дерева — лише з окремого дозволу»** → потрібне рішення власника (див. §3 C4).

## 1. STARTUP-ЗАПИС (`workflow.md` «Startup»; для primary record = T126/T127 + цей файл)
| Поле | Значення |
|---|---|
| Мета | T126 (Rust-геометрія) → T127a (візуал) / T127b (дерево/ребра/SPEC) |
| Review mode | **independent_subagent** (`gate-reviewer`, свіжий контекст; фактична модель за самозвітом агентів `claude-opus-4-8` — **не верифіковано незалежно**) |
| Підстава вибору | **явне доручення власника** («відправ критику», «Нехай критик перевірить», O-7/O-12/O-14/O-32/O-47) — пріоритетніше за вибір контракту |
| Owner | `strelchenko.dev@gmail.com` |
| Writer (єдиний) | ця сесія (`77e655e8-7ea5-460e-8b3f-af9b4344c852`); root `/Users/strelia/projects/dg`, branch `feat/shps-staff-demo`, **HEAD `8e97ff1`**, dirty-відбиток коду `96bcb198e1c3a1eb` (22 файли; список — `_HANDOFF-2026-10-27-dg17.md` «СТАН РОБОЧОГО ДЕРЕВА») |
| Хто передає пакет рев'юеру | автор (ця сесія) за `review-handoff.md` — **пакет має містити:** task/session IDs, root/base/HEAD, scoped dirty hashes+diff, pinned acceptance, raw evidence/commands/exits |
| Coder (виконавець реалізації) | **`codex exec` напряму з Bash** (рішення власника O-17/O-18, не субагенти). **Binding: UNBOUND** — `codex-cli 0.163.0` присутній; entitlement/budget **не перевірено** (`models.md`: без платних probe) |
| Helper | read-only розвідка (Explore/inline), ≤5 кроків/≈800 токенів підсумку |
| Координація shared-resource checks | рев'юери **read-only**; тести/`build:wasm`/e2e — лише writer, **без pipe** |
| Ліміти (`models.md`) | Coder: ≤2 виправлення однієї невдалої перевірки без нових доказів; reviewer: 1 первинний + 1 по виправленнях; null/timeout ≠ clean → 1 retry, далі BLOCKED; handoff ≤1500 токенів + посилання |

## 2. ЖИТТЄВИЙ ЦИКЛ (`feature-lifecycle.md`, 10 етапів) × ЗАДАЧІ — станом зараз
Статуси: PASS (виконано з доказом) · PARTIAL · NOT_RUN · BLOCKED · N/A (з причиною). Виклик скілів у Claude: **`/назва`** (Skill-tool); точний шлях у managed root фіксується при виклику (`skills/<група>/<назва>/SKILL.md`); native discovery у host — NOT_TESTED, читання файла ≠ invocation.

| Етап | Скіл (Claude) | T126 | T127a | T127b | Примітка |
|---|---|---|---|---|---|
| 1 Scope+acceptance | `/grilling`, `/acceptance-spec` | **PARTIAL**: рішення власника дослівно (журнал O-1…O-49, аудит 🟢); `grilling` **не викликано формально**; `acceptance-spec` **NOT_RUN** (інваріанти I-N/I-T/I-A/I-R є, але не як сценарії happy/boundary/failure) | PARTIAL (як T126) | PARTIAL | відкритих питань власнику **0** (O-49) |
| 2 Дослідження | `/cto-research` | PARTIAL: факти з `path:line`; **briefing свіжий за лічильником (7<25)**, але T126 міняє стек-ноту → **оновити перед кодом**; CRG **не використано** (прямий пошук; межі покриття записані) | N/A для a2/a7…(read-only) | PARTIAL | `work/CTO-RESEARCH.md` |
| 3 Spec+план | `/spec-flow` → `/plan-critique` + `/plan-defense` (GATE 1/2) | **NOT_RUN** (обов'язково: нова публічна поведінка, стек-контракт) | a3/a4: **NOT_RUN** (spec-gated); a2/a7/a8/a9/a10/a12 — малий маршрут | b1/b4: **NOT_RUN** (спека з критиком); b0/b6e — малий | ad-hoc критики ≠ gate (§0.3) |
| 4 ADR | локальні ADR-правила | **PARTIAL**: ADR-0002 переписано; **незалежної перевірки переписаної редакції NOT_RUN**; ім'я файлу застаріле | — | — | перейменування окремо |
| 5 UI/design | **`/design-pass`** (+ `/interface-review` обов'язковий фінал) | — | a2, a7, a8, a9, a10, a12 — **ОБОВ'ЯЗКОВО design-pass**; **NOT_RUN** | b6d (рамка «Знайдено») | реальний рендер+взаємодія; build не закриває UI-gate |
| 6 Реалізація | **`/tdd`** (Coder = `codex exec`) | NOT_STARTED (R0…R10) | NOT_STARTED | NOT_STARTED | тест першим, мутація зубів |
| 7 Перевірки | команди репо | R10: `build:wasm`→`cargo fmt/clippy/test`→`npm test`(без pipe)→oxlint→`check:docs`→typecheck; перф WASM | ті ж | ті ж | **Dg17-зміни: PASS** (typecheck, SDK 1197, demo 104, oxlint, check:docs; HEAD `8e97ff1`+dirty `96bcb198…`) |
| 8 Незалежне ревʼю | `/code-review` (Standards+Spec), `/pattern-architecture-review` | NOT_RUN; pattern-architecture-review — **applied (арх-аналіз `_arch-review-req3`)** | NOT_RUN | NOT_RUN | **код Dg17 (edgePort, canvasLayout flatten) — `code-review` NOT_RUN → потрібне ДО коміту** |
| 9 Виправлення | `/receiving-code-review` | N/A (немає findings коду) | N/A | N/A | — |
| 10 Report/handoff | `/ship-report` | NOT_RUN | NOT_RUN | NOT_RUN | handoff Dg17 написано (repo+Obsidian); `post-deploy-check` — N/A (немає деплою) |

## 3. PRE-CODE CHECKPOINT (`pre-code-checkpoint.md`) — по задачах
**Правило:** batch/sprint-схвалення ≠ READY; кожна задача — свій checkpoint; «placed approval» не доводить, що попередник готовий. Readiness = evidenced PASS / усі застосовні критерії (FAIL і NOT_RUN у знаменнику); **blocker переважає відсоток**; stale → NOT_RUN.

### T126 (Rust-геометрія) — маршрут **FULL**, статус **🔴 BLOCKED**
| ID | Критерій (mandatory) | Статус | Доказ / блокер |
|---|---|---|---|
| C1 | Scope + acceptance (acceptance-spec: happy/boundary/failure сценарії) | NOT_RUN | інваріанти є, сценаріїв нема; `/acceptance-spec` |
| C2 | Рішення власника дослівно, відокремлені від інференцій | **PASS** | `_owner-requirements-ledger-dg17.md` O-1…O-49; аудит `_final-audit-critic-dg17.md` 🟢 (на знімку до O-48/O-49 — після них НЕ повторювався → частково stale) |
| C3 | Відкриті питання власнику закриті | **PASS** | відкритих 0 (O-49) |
| C4 | Залежності/writer: task branch, WIP | **PASS** (оновлено після O-51) | WIP закомічено дозволом власника («Роби коміт»): `a2b8ca8`, `1b7c13d`, `b3545b8`; дерево чисте; база для task branch T126 — `b3545b8`; один writer. *(було FAIL: 22 незакомічені файли)* |
| C5 | Scoped impact (callers/contracts/tests, file:line, межі покриття) | PARTIAL→NOT_RUN | факти з `path:line` є; **споживачі `tiers`/`StaffTierBand` — повний grep = результат R1/a3**; CRG не використано |
| C6 | `plan-critique` (4 лінзи, незалежний) | NOT_RUN | `/plan-critique` на спеці R1 |
| C7 | `plan-defense` (5 питань) | NOT_RUN | `/plan-defense` |
| C8 | Briefing свіжий | **PASS** (7<25) / ⚠️ стек-нота зміниться | `check:docs` |
| C9 | Явне «го» власника на код | NOT_RUN | не дано |
**Readiness: 4/9 (44%) — інформаційно (було 3/9; C4 став PASS після коміту); BLOCKED блокерами C1, C6, C7, C9.** Наступна дія для розблокування: створити task branch від `b3545b8`, далі **/spec-flow T126** (stage 1 `acceptance-spec`) після «го».

### T127a/T127b — розбиття за застосовністю
- **Незалежні візуальні / документні (малий маршрут):** T127a a2, a7, a8, a9, a10, a12; T127b b0, b1, b2, b6a-e. Pre-code checkpoint — компактний, **кожен окремо**. **a2** — читання/вимір, **без мутації продукту** → checkpoint N/A для коду; дозволений read-only за O-50.
- **Геометричні (чекають T126, O-49):** a1, a3, a4, a5, a6; b3, b5 — **BLOCKED** до T126.
- **Spec-gated з критиком:** T126 R1/R2, T127b b1/b4 — `/spec-flow` GATE 1/2.

## 4. ХІД ВИКОНАННЯ (послідовність за Factory)
1. **Зараз (дозволено, без мутації):** T127a **a2** через **`/design-pass`** (мокап ↔ демо, однакове вікно; таблиця значень `_mockup-values-dg18.md`). *(читання «2» = a2 — моє; див. чат)*
2. **Рішення власника C4** (WIP/гілка) → далі T126: `/spec-flow` (acceptance-spec → GATE 1 → plan → **GATE 2: plan-critique + plan-defense + конституція**, незалежний verdict, запис промпта/хеша/SHA плану) → tasks → `/tdd` (Coder=`codex exec`) → перевірки → `/code-review` → `/ship-report`.
3. Паралельно (малий маршрут, після «го»): a7/a8/a9/a10/a12 через `/design-pass`; b0/b1/b2/b6.
4. **Перед будь-яким комітом:** `/code-review` на код Dg17 (edgePort + canvasLayout) + оновлення `CONTEXT.md` (глосарій, `domain-modeling`) + перейменування/незалежна перевірка ADR-0002.

## 4a. ВИКОНАНО: T127a a2 через `/design-pass` (read-only) — `_mockup-values-dg18.md`
Контракт референсу записано; мокап виміряно `getComputedStyle` (не на око); мокап і демо — **те саме вікно 2560×1289 DPR 1**; обидва кадри **переглянуто**. Результат **29 застосовних критеріїв: PASS 6 · FAIL 20 · NOT_TESTED 3 → 6/29 (21%)**, 1 N/A. Код репо **не змінювався** (перевірено `git status`: 22 файли коду, як до a2). Не виконано (N/A з причиною): чотири baseline viewport, hover/focus, `interface-review` — UI не змінено. **Що a2 спростував:** заголовок відділу в мокапі **зліва** (демо — праворуч, коментар «як у мокапі» неправдивий); відступ рамка→картка **45** (демо 36); рамки відділів у демо **впритул** (28 між сидіннями, а не між рамками).

## 5. Єдиний наступний крок (handoff-контракт: одна дія, виконавець, критерій)
> **Оновлено після a2.** Наступна дія — **рішення власника C4** (WIP/гілка): без нього T126 не стартує (C4=FAIL). Далі за запитом власника: `/spec-flow` T126 (stage 1 `/acceptance-spec`) **або** візуальні a9/a8/a12 через `/design-pass` (вхід готовий: `_mockup-values-dg18.md`; для коду потрібне «го» + pre-code checkpoint кожної, `/tdd`, `/code-review`).
> *(нижче — попередній текст кроку, виконано: a2)*
**Дія:** виконати T127a **a2** через `/design-pass` (read-only вимір). **Виконавець:** ця сесія (Helper+Coder-вимір). **Критерій:** файл `_mockup-values-dg18.md` із таблицею «значення мокапа (виміряні `getComputedStyle`/DOM) → поле стилю SDK», кадри обох сцен у ОДНАКОВОМУ вікні, розбіжності помічено PASS/FAIL.
