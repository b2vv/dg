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
| `npm run typecheck` | tsc по sdk + emit types + demo |
| `npm test` | unit sdk + demo |
| `npm run test:e2e` | Playwright smoke |
| `npm run compare:nodes` | візуальне порівняння вузлів |
| `npm run test:verify` | усі чотири вище одним прогоном |
| `npm run test:rust` | `cargo test` у `packages/core` |
| `npm run build:wasm` | wasm-pack build + експорт TS-типів |

CI (`.github/workflows/ci.yml`) — три job: `rust` (cargo test), `sdk` (build:wasm → typecheck → test),
`e2e` (build:wasm → playwright). Тригер: push у `main`/`master`/`cursor/**` і будь-який PR.

### Чого гейти НЕ ловлять (виміряно 2026-08-26)

- **Lint відсутній як клас.** У `package.json` немає жодного lint-скрипта — ні ESLint, ні oxlint,
  ні `cargo clippy`. Тобто **весь** `work/CODING_STANDARDS.md` тримається на людському рев'ю:
  імена, розмір функцій, кількість аргументів, `any`, `satisfies` vs `as`, TS-enum — нічого з
  цього машина не бачить.
- **Форматування ніким не форситься** — ні prettier, ні `cargo fmt --check`.
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
| Типи, що перетинають WASM-межу | `packages/core/bindings` → `packages/sdk/src/wasm/pkg` |

⚠️ **Архітектурний факт:** на канвасі dept-контур малює **TS** (`paintMagneticGroups`), а не Rust
flood із `contour.rs`. WASM-гілка лишилась для SVG-grid, публічного API й тестів
(`work/CTO-RESEARCH.md`; `work/tech-debt/CRITIQUE-dg_9352d52.md` C1–C3). Плануючи «поправити
контур», спершу з'ясуй, у якій із двох гілок.

## Гілки й PR

- GitHub `b2vv/dg`, PR у `main`. Робота через `gh` — `docs/agents/issue-tracker.md`.
- Тріаж-лейбли: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`
  (`docs/agents/triage-labels.md`).
- CI ганяється на PR і на push у `main`/`master`/`cursor/**`.

## Артефакти

- `work/reports/<topic>/` — `spec.md`, `plan.md`, `tasks.md`, звіт.
- `work/tasks/` — детальні T-задачі (наскрізна нумерація).
- `work/AGENDA.md` — черга ходів (`cto-agenda`), перезбирається.
- Жива нота — Obsidian vault `diagram-hierarchy`, MCP `127.0.0.1:27143` (`CLAUDE.local.md` п.2);
  fallback `work/reports/<topic>/_wip-<topic>.md`.
