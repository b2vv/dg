# standards.md — Org Hierarchy SDK (`b2vv/dg`)

Мірник цього репо для глобальних скілів (`code-review`, `spec-flow`).
Формат: `~/.agents/rules/repo-standards-manifest.md`. Процес — у скілах, тут лише те, що своє.

## Мірник

| Док | Що він вирішує | Де його чекліст | Діє на |
|---|---|---|---|
| `work/CODING_STANDARDS.md` | Clean Code · Clean Architecture · SOLID/DRY/KISS · GoF · **Matt Pocock** | §0 ієрархія принципів, далі §1+ по темах | **тільки** `packages/sdk`, `packages/demo` (TS) |
| `work/SPEC.md` §13 | стандарти TS у контексті специфікації | §13 | **тільки** TS |
| `work/TDD.md` | тести **перед** кодом, success + failure, red-green-refactor | політика цілком | увесь репо (TS і Rust) |
| `AGENTS.md` | контракт агента: стек, команди, куди дивитись | розділи файлу | увесь репо |
| `docs/USAGE.md` | публічний API — що хости викликають і що отримують | сам файл | межа `packages/sdk` назовні |

> **Область дії — не формальність.** `work/CODING_STANDARDS.md` сам себе обмежує:
> «Обов'язкові вимоги до TS-коду в `packages/sdk`, `packages/demo`». Matt Pocock — це
> **TypeScript**-ідіоми (`satisfies` > `as`, branded types, discriminated unions, `z.infer` як
> SSOT); поза TS у них немає предмета. На `packages/core` вони не поширюються **взагалі**.

### ⚠️ `packages/core` (Rust) мірника не має

Ні `rustfmt.toml`, ні `clippy.toml`, ні документованого Rust-стандарту; у CI по Rust іде
лише `cargo test` (`.github/workflows/ci.yml`, job `rust`). Тобто половина репо судиться
**нічим**, і рев'ю по ній не має на що спертись, крім загальної інженерної практики.

Це записано як стан, а не як норма — кандидат в агенду (`cto-agenda`).

## Не мірник

- `work/tasks/**` — детальні задачі й плани. Наміри, не норми.
- `work/tech-debt/**` — зафіксований борг і критики. **Борг не є порушенням.**
- `docs/REQUIREMENTS.md` — продуктова специфікація. Це вісь **Спека**, не вісь Стандарти:
  за ним судять, чи зроблено те, що просили, а не як написано код.
- `archive/**` — історія.

## Машинні гейти

| Команда | Що ловить |
|---|---|
| `npm run lint` | **oxlint** — correctness/suspicious/pedantic. Борг закрито (T85, 2026-09-02): 27 правил лишаються вимкненими, **жодне як борг** — кожне має причину в `work/tasks/T85-lint-debt.md` |
| `npm run format` | **oxfmt --check** (у CI **не** гейт — див. T85) |
| `npm run typecheck` | tsc по sdk + emit types + demo |
| `npm test` | unit sdk + demo |
| `npm run test:e2e` | Playwright smoke |
| `npm run compare:nodes` | візуальне порівняння вузлів |
| `npm run test:verify` | усі чотири вище одним прогоном |
| `npm run test:rust` | `cargo test` у `packages/core` |
| `npm run build:wasm` | wasm-pack build + експорт TS-типів |
| `npm run test:prod` | **post-deploy smoke по живому деплою** (`playwright.prod.config.ts`, без webServer; ціль — `PROD_URL`, дефолт Pages) |

CI (`.github/workflows/ci.yml`) — три job: `rust` (cargo test), `sdk` (build:wasm → typecheck → test),
`e2e` (build:wasm → playwright). Тригер: push у `main`/`master`/`cursor/**` і будь-який PR.

Ще два workflow:

- **`ai-review.yml`** — два **незалежні** рев'юєри на кожен PR, окремими job'ами (окремі раннери =
  окремі контексти): `standards` судить за цим маніфестом, `spec-and-edges` — за спекою, межами
  й граничними даними, і ставить тріаж-лейбл. Жоден не бачив, як писався код.
  ⚠️ Вимагає секрет `ANTHROPIC_API_KEY`; поки його немає — job чесно рапортує `skipped`,
  а не проходить мовчки.
- **`post-deploy.yml`** — smoke по живому Pages після успішного деплою (`workflow_run`) або вручну.

### Чого гейти НЕ ловлять (виміряно 2026-08-26)

- ⚠️ **Оновлено 2026-09-02:** lint більше не відсутній — **oxlint** у CI (`npm run lint`), гейт
  зелений, і борг вимкнених правил **закрито** (T85): вимкненими лишились 27, але жодне вже не
  стоїть як «колись увімкнемо» — у кожного причина. Що лишилось на людині: розмір функцій
  (`max-lines*`), `no-inline-comments`, `no-underscore-dangle`, `consistent-function-scoping`.
  `no-unused-vars` **машина ловить** — мертві імпорти більше не проходять.
- 🔴 **Чого гейт не замінює:** підказка лінтера — не вирок. Закриваючи T85, знайшли **чотири**
  місця, де застосування автофіксу внесло б баг (мутація під час ітерації в чотирьох мапах,
  `targetOrigin` у воркері, зміна хешу кольорів). `lint:fix` на весь репо — не спосіб закривати
  такий борг.
- **Форматування є, але не форситься:** `oxfmt` налаштований під наявний стиль репо
  (`.oxfmtrc.json`), `npm run format` перевіряє. У CI **не** гейт: застосування зачепить 143 файли,
  і це свідомо відкладено, щоб не конфліктувати з гілками в польоті (T85).
- **`cargo fmt --check` / `clippy` по Rust як не було, так і немає.**
- Усе, що взагалі не виражається лінтером: одна причина для зміни, брехливі імена, коментарі
  проти коду, тихі обрізання, розходження «заявлено в WASM ↔ малює TS».

Наслідок для рев'ю: тут **не діє** звичайне «не звітуй про те, що ловлять гейти» — по TS-стилю
гейтів немає, тож стиль перевіряється руками.

## Конституція

Порушення = стоп, а не зауваження.

- [ ] **Тести перед кодом** (`work/TDD.md`): success **і** failure кейси, red-green-refactor.
- [ ] **Ієрархія принципів** (`CODING_STANDARDS.md` §0): KISS → SOLID → DRY → Clean Code →
      Clean Architecture → GoF → Pocock. **Конфлікт SOLID/GoF з KISS на ранньому етапі —
      перемагає KISS**, поки абстракція не доведена профілем або другим споживачем.
- [ ] **GoF — лише за фактом ≥2–3 повторень проблеми.** Патерн заради патерна не вимагається.
- [ ] **Межа WASM ↔ TS**: що перетинає межу — явний контракт; хто власник пам'яті — названо.
- [ ] **Публічний API SDK** (`docs/USAGE.md`) не змінюється мовчки: зміна сигнатури = зміна доку.
- [ ] **Pocock — тільки TS.** Знахідка Pocock-ідіоми на `.rs` є хибною за побудовою.

Жоден із рядків не форситься машиною (див. вище) — усі перевіряються рев'ю.

## Поріг пайплайна

**Вмикати повний цикл, якщо:**

- нова підсистема в `packages/core` або `packages/sdk`;
- змінюється **публічний API SDK** (те, що описує `docs/USAGE.md`);
- змінюється контракт `main ↔ worker` або межа WASM ↔ TS;
- зміна одночасно зачіпає Rust і TS.

Нижче порога (багфікс усередині модуля, правка демо, докрутка стилів, дрібний рефактор без нової
межі) — легкий інлайн-план і звичайна робота.

Сумнів? Питання одне: **«зсувається межа — публічний API, worker-контракт або WASM↔TS?»**

## Розміщення

| Що | Куди |
|---|---|
| Геометрія, контури, row-tree (Ploeg), алгоритми розкладки | `packages/core` (Rust → WASM) |
| Pixi-рендер, воркери, експорт SVG/PNG/PDF, React context menu | `packages/sdk` |
| Демо-застосунок (Rsbuild) | `packages/demo` |
| Типи, що перетинають WASM-межу | `ts-rs` з `packages/core/src/types.rs` → **`packages/sdk/src/wasm/generated/rust-types.ts`** (у git, 6 типів), споживач один — `packages/sdk/src/wasm/layoutBridge.ts` |

### Rust і TS — один репо, і вони знають одне про одного

- **Один git.** `packages/core` не сабмодуль і не окремий репо: 9 файлів під тим самим версійним
  контролем, `packages/core/target/` у `.gitignore`. Тож CRG індексує обидві половини, а PR
  природно містить зміни по обидва боки межі.
- **Канал знання односторонній і згенерований.** `ts-rs` (feature `ts-export`) експортує типи
  з `packages/core/src/types.rs` у `packages/sdk/src/wasm/generated/rust-types.ts`; файл **у git**,
  генерується `npm run build:wasm` (`cargo test export_rust_types --features ts-export`).
  Rust про TS не знає нічого — знання тече лише в один бік.
- ⚠️ `packages/core/bindings/` **порожня й нікуди не веде** — залишок; не приймай її за канал.
- 🔴 **Наслідок для рев'ю:** розділення мірника по мовах (стовпчик «діє на») стосується **стилю**,
  а не **межі**. Зміна в `types.rs` без перегенерації `rust-types.ts` — і TS компілюється проти
  застарілого контракту; жоден мовний мірник цього не спіймає, бо порушення не всередині мови,
  а між ними. Тому межа судиться окремим рядком Конституції, а не мірником. Якщо дифф чіпає
  `types.rs` — перевір, чи змінився `rust-types.ts` разом із ним.

⚠️ **Архітектурний факт (оновлено 2026-08-26):** контур має **два рушії** за
`RenderConfig.contourEngine`. Default `'button-group'` — TS (`render/contour/paintMagneticGroups.ts`
+ виїмки G2/M2). `'cell-flood'` — Rust flood із `contour.rs`, поблочно на org
(`render/contour/floodContourEngine.ts`). **Експорт малює тим самим рушієм, що й канвас**
(2026-08-26, гілка `cursor/flood-export-svg`): SVG рахує flood тими самими входами, PNG/PDF
беруться з фреймбуфера. Коли flood не може відпрацювати — шар відділів порожній, як на екрані,
а причина йде в `ExportOptions.onDiagnostic`.
Плануючи «поправити контур», спершу з'ясуй, у якому з рушіїв і чи не треба правити обидва
(`work/CTO-RESEARCH.md`; [T80](../work/tasks/T80-contour-engines-ba-demo.md)).

## Гілки й PR

- GitHub `b2vv/dg`, PR у `main`. Робота через `gh` — `docs/agents/issue-tracker.md`.
- Тріаж-лейбли: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`
  (`docs/agents/triage-labels.md`).
- CI ганяється на PR і на push у `main`/`master`/`cursor/**`.

## Артефакти

- `work/reports/<topic>/` — `spec.md`, `plan.md`, `tasks.md`, звіт.
- `work/tasks/` — детальні T-задачі (наскрізна нумерація). **Задачі агента пишуться сюди**, не в чат.

### Життєвий цикл задачі — `work/`

Розкладка **за станом**, не за темою:

| Тека | Що там | Куди далі |
|---|---|---|
| `work/tasks/` | T-задачі: і не початі, і в роботі | закрито → `work/archive/` |
| `work/tech-debt/` | борг і критики (`TD*`, `CRITIQUE-*`, `REVIEW-*`, `D*`) | пункт закрито → викреслюється на місці |
| `work/archive/` | завершені задачі — **вказівники, не копії** | назавжди |

- **Завершене переїжджає в `work/archive/`, а не видаляється** — інакше зникає слід рішення.
- ⚠️ **Кореневий `/archive/` — це не архів задач.** Там legacy-**код** (`legacy-ts/`,
  `legacy-web-rspack/`). Однакове ім'я, різні речі; кореневий уже в `## Не мірник`.
- ⚠️ У dg **немає окремої теки «в роботі»** — стан задачі читається з неї самої, а не з її
  розташування. Тому статус у T-файлі має бути явним, інакше «почато» від «не почато» не відрізнити.
- `work/AGENDA.md` — черга ходів (`cto-agenda`), перезбирається, не дописується.
- `e2e/prod-smoke.spec.ts` + `playwright.prod.config.ts` — сценарії, які перепроходить
  `post-deploy-check`. ⚠️ Шляхи там **base-relative** (без провідного слеша): провідний слеш
  скидає базу `/dg/` і б'є в корінь домену, який віддає 404. Через це хелпери `e2e/demoBridge.ts`
  (вони роблять `goto('/?e2e=1')`) для деплою в підпапку непридатні.
- Жива нота — Obsidian vault `diagram-hierarchy`, MCP `127.0.0.1:27143` (`CLAUDE.local.md` п.2);
  fallback `work/reports/<topic>/_wip-<topic>.md`.
