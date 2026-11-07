# D3 — tasks (зріз 1)

**План:** [`plan.md`](./plan.md) рев. 6, **GATE 2 зелений** ([`_gate2-critique.md`](./_gate2-critique.md), [`_defense.md`](./_defense.md)).
**Ledger / routing:** [`_ledger.md`](./_ledger.md). Брифи кодерам (англійською) — `briefs/<ID>.md`.
**Правила паралелі (власник, 2026-11-05):** неперетинні файли; кодер ганяє **лише свої** тест-файли
(`npm test -w @org-hierarchy/sdk -- <file>`), жодних `build`/root `typecheck`/`dist`; коміти й повні гейти —
лише координатор, по черзі. Якщо `rstest` не може зайняти локальний порт через сусідній прогін — повторити
пізніше, конфіг не чіпати.

## Pre-code checkpoint (AI Factory) — хвиля 1

| Пункт | Стан |
|---|---|
| Scope / acceptance | plan §10, рядки 1–40; задачі нижче посилаються на рядки |
| Grilling | GATE 1 пройдено (spec §7, Q1–Q8, рішення власника) |
| Dependencies / writers | root `/Users/strelia/projects/dg`, гілка `feat/d3-transitions`; writer'и хвилі 1: T-A0 → (T-A ∥ T-B), файли неперетинні; координатор — єдиний, хто комітить |
| Scoped impact | `_helper-H1..H3.md` (path:line); хвиля 1 створює лише нові файли в `packages/sdk/src/render/transition/` — наявного коду не чіпає |
| Planning review / defense | GATE 2 зелений: 4 лінзи + 2 кола re-check тими самими рев'юерами + defense 5/5 + конституція PASS |
| **Readiness** | **READY** для хвилі 1. Хвиля 2 — BLOCKED до злиття хвилі 1 (споживає її API) |

## Задачі

- [ ] **T-A0** — контракт типів і констант. Файли: `render/transition/types.ts`, `render/transition/constants.ts`.
  Дослівно plan §3 + константи. Готово: `npm run typecheck -w @org-hierarchy/sdk` (noEmit) зелений. Рядки: — (контракт).
- [ ] **T-A** [P з T-B] — аніматори й розв'язання `animate`. Файли: `render/transition/animators.ts`,
  `resolveAnimate.ts`, `animators.test.ts`, `resolveAnimate.test.ts`. Рядки **#9, #13, #14, #15, #25**.
  Готово: RED (success+failure) → GREEN, лише свої тести; бриф `briefs/T-A.md`.
- [ ] **T-B** [P з T-A] — `TransitionController`. Файли: `render/transition/TransitionController.ts`,
  `TransitionController.test.ts`. Рядки **#2, #3, #4, #11, #12, #13, #18, #24, #35, #36, #39** (на рівні контролера).
  Готово: RED → GREEN проти фейкового `Animator` (без імпорту коду T-A); бриф `briefs/T-B.md`.
- [ ] **T-C** (хвиля 2) — інтеграція в рендерер. Файли plan §4. Бриф — після злиття хвилі 1.
- [ ] **T-D** (хвиля 2) [P] — оверлей і тест-якорі. Файли plan §4.
- [ ] **T-E** (хвиля 2) [P] — фасад і USAGE. Файли plan §4.

## Після кожної задачі
Координатор: перевіряє робочий файл кодера → сам ганяє тести задачі → незалежний рев'ю (`gate-reviewer`,
read-only, пакет за SHA) → коміт → рядок у ledger `complete (commits …, review …, model=…, reviewer=…)`.
