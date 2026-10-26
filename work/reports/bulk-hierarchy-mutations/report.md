# report.md — bulk-мутації ієрархії (4311)

**Дата:** 2026-10-26 · **Гілка:** `bulk-mutations` → PR #95 → `main` (merge `dd86c1d`, FF-докат `5113442`)
**Вхід:** [`spec.md`](./spec.md) · [`plan.md`](./plan.md) (GATE 2 PASS) · [`tasks.md`](./tasks.md) (8/8 DONE)

Звіт — **дельта до плану**: що відхилилось, що виявилось неочевидним, що лишилось.

## 1. Зроблено

Нова публічна поверхня — **4 bulk-мутації** (`interaction/bulkMutations.ts`, чисті функції; фасад
`OrgHierarchyDiagram.ts:1891-1925`, async через `commitDataChange` — атомарно, single-flight):

| Метод | Семантика |
|---|---|
| `transferChildren(from, to)` | admin-діти `from`→`to`, replace-семантика |
| `deleteSubtree(id)` | BFS admin, осиротілі persons, занулення `parentPositionId` |
| `transferChildOrgs(from, to)` | `parentOrgId` `from`→`to`, `validateOrgHierarchy` **перед** обходом |
| `deleteOrgSubtree(id)` | каскад orgs→positions→departments→reportLines→persons→groups |

Кожна валідує й кидає `InteractionError` **до** побудови next-стану. Контракт — `docs/USAGE.md §8`,
+4 `LayoutPatch`-варіанти (discriminated union, адитивно), Summary-типи експортуються. Реліз SDK
**0.5.1 → 0.6.0**.

Суміжні лінії, що дозріли в тій самій гілці (поза ядром 4311, але в PR #95): спліт dg на міні-
бібліотеки (#0–#5: `renderNow`, ORG/STAFF layout compute, релокація `core/`, drop-pipeline),
SHPS-routing ВАРІАНТ C, render (theme/`setStyles`, `highlightPath`, per-node w×h, recenter кореня),
data-поля (`parentPositionId`+`order`, `role`, `external`).

## 2. Протестовані сценарії (чим перевірено)

- **Unit (rstest):** приймальні сценарії A1–A7 + NB-крайові per-мутація; регрес-гард, що bulk
  org-операції зберігають matrix-поля (`5e8c401`); SP1 (dangling dept-anchor → null) red→green (`c810489`).
- **Повні гейти на `main` @ `5113442` (CI, фактом):** Docs freshness ✅ · SDK+demo **1178** ✅ ·
  Rust **25** ✅ · Playwright e2e ✅ · Pages deploy ✅.
- **SDD-цикл:** spec → plan → GATE 2 → tdd → impl → code-review (**PASS, 0 blocking**) — артефакти
  `_wip-*.md` у цій теці.

## 3. Неочевидні знахідки

- 🔴 **CI був червоний на кожному пуші гілки, а хендоф казав «гейти зелені».** Заяву зняли лише
  локальні прогони; CI (Linux) падав. Урок: гейт-статус у хендофі має посилатись на **CI-прогін**,
  не на локаль.
- 🔴 **`orgBlockLayout.deptGrouping:99` — платформозалежний флак.** Cycle-fallback іде raw через
  `layoutTreeBlock`, а порядок Vec `raw.nodes` з WASM недетермінований між процесами (Rust `HashMap`
  seed per-process): macOS стабільно збігався, Linux — ні. Дерево й координати **ідентичні** — різнився
  лише порядок масиву. Фікс (`3151e74`): порівняння через `nodesById()` (порядко-нечутливо, як сусідній
  тест рядок 62). Продакшн не чіпано: порядок масиву вузлів кодова база вже трактує як неконтрактний.
- **Docs freshness на CI рахує +1 проти локалі** — `pull_request` міряє staleness від merge-коміту
  (PR head + base). 25 локально = 26 на CI. Рефреш брифінгу (базис→`c810489`) закрив.
- **deleteOrgSubtree лишав dangling `parentPositionId`** на вцілілих відділах, чия anchor-посада в
  іншій (видаленій) org — занулюється, як у `deleteSubtree` (SP1, задокументовано в §8).

## 4. Скріни

Немає. Q2 (demo-скрин recenter кореня проти мокапа) — **відкрито**, dev-сервер :3000 ще живий;
візуальну перевірку заплановано окремо.

## 5. Проходка по user flow

Хост викликає `diagram.transferChildren/deleteSubtree/transferChildOrgs/deleteOrgSubtree` → чиста
функція валідує набір і або кидає `InteractionError` (нічого не змінено), або будує next-стан →
`commitDataChange` атомарно застосовує + перемальовує (`requestPaint`, арх. факт №1) → хост дістає
`*Summary` з переліком зачепленого. Matrix-сітку операції **не ведуть** — переукладання після зміни
набору лишається хосту (`placeOrgAtMatrixCell`/`reorderOrg`), задокументовано в §8.

## 6. Ризики й обмеження

- **Публічний API — one-way за звичкою консюмерів:** +4 методи, +4 `LayoutPatch`, нові host-set поля.
  Semver minor. Хост SDK поки **не споживає** (брифінг §5), тож live-регресій споживача немає — ризик
  у майбутній host-інтеграції.
- **WASM-order недетермінізм лишається в корені** (прибрано лише над-строгий тест). Інші `.nodes).toEqual`
  на raw staff-tree шляху — потенційні флаки; нині стабільні лише бо grouped-складання детерміноване.
  Кандидат-задача: детермінований sort у `layoutTreeBlock` return.
- **Router v2 не почато** — `implementation-status.md` у `shps-routing/` це журнал незавершеного
  воркрі, не стан поставки.

## Post-deploy

- `main` @ `5113442`: усі CI-джоби + Pages deploy зелені (перевірено прогоном, не на віру).
- Pages-деплой демо пройшов; post-deploy smoke-воркфлоу стартував автоматично.
- **Не зроблено на проді:** візуальна перевірка recenter (Q2) — demo ще треба відкрити й зняти скрин.
