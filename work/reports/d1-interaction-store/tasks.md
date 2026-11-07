# D1 — tasks (interaction-store)

**План:** [`plan.md`](./plan.md) рев.2, **GATE 2 ЗЕЛЕНИЙ** ([`_critique.md`](./_critique.md) GREEN, [`_defense.md`](./_defense.md) GREEN).
**Ledger:** [`_ledger.md`](./_ledger.md). Брифи — `briefs/<ID>.md` (англ.).
**Правила паралелі (власник):** неперетинні файли; кодер ганяє лише свої тести (`npm test -w @org-hierarchy/sdk -- <file>`
або `-w @org-hierarchy/demo`); жодних `build`/root `typecheck`/`dist`; коміти й важкі гейти — координатор. Codex `< /dev/null`.

## Pre-code checkpoint
| Пункт | Стан |
|---|---|
| Scope / acceptance | plan §9 (17 рядків); задачі посилаються на рядки |
| GATE 1 | пройдено (spec §Рішення GATE 1, рішення власника Q1-Q6) |
| GATE 2 | ЗЕЛЕНИЙ (critique 4/4 GREEN + defense 5/5 GREEN + конституція PASS) |
| Writers | root, гілка `feat/d1-interaction-store`; неперетинні файли; координатор комітить |
| Readiness | **READY** для D1-A. D1-B/D1-C після D1-A (контракт store). D1-D після D1-B. |

## Задачі

- [ ] **D1-A** — чистий `InteractionStore`. Файли: `state/InteractionStore.ts`, `state/InteractionStore.test.ts`,
  `interaction/interactionState.ts` (тип `InteractionState`). Композує `SelectionStore` (делегати selection), поле
  `hovered`, `subscribe/emit` з ізоляцією слухача (Q2) + snapshot-ітерацією (Q3), 0-змін=0-emit (AC6), selection-зміна
  теж емітить (N1), `reconcile(data)` (N2), `setHovered` приймає будь-який ref (Q1). Рядки **1-6, 10, 11**.
  Готово: RED(success+failure)→GREEN, лише свої тести; typecheck -w + lint; бриф `briefs/D1-A.md`.
- [ ] **D1-B** [P з D1-C] — фасад + публічний API. Файли: `OrgHierarchyDiagram.ts`, `docs/USAGE.md`, `src/index.ts`.
  Замінити `selectionStore` на `InteractionStore`; `subscribeInteraction`; `setHovered`-вхід; `setData`→`reconcile`;
  `onSelectionChange` лишається; USAGE+барель (`InteractionState`, `subscribeInteraction`). Рядки **1, 9, 13**.
  Залежить: D1-A. Готово: RED→GREEN, свої тести; бриф `briefs/D1-B.md`.
- [ ] **D1-C** [P з D1-B] — Pixi-шар єдиноджерельний + селектор. Файли: `render/PersonNode.ts`,
  `render/OrganizationNode.ts`, `render/staffRelated.ts` (перенесений `relatedStaffIds` + dim-селектор) + tests.
  `pointerover`→`setHovered` у store; `hoverRing` рендериться зі state (near/mid, єдине джерело); far-LOD **не**
  додавати (R1); правило акценту hovered==selected → selection виграє (#15). Рядки **7, 7f, 12, 14, 15**.
  Залежить: D1-A. Готово: RED→GREEN, свої тести; бриф `briefs/D1-C.md`.
- [ ] **D1-D** — demo rewire (near-hover через store). Файли: `packages/demo/src/app/StaffChromeBackdrop.ts`,
  `ShpsStaffCard.ts` + demo tests. Прибрати DOM-імперативний `installStaffHoverHighlight`; near pointer→`setHovered`
  через `subscribeInteraction`; споживати перенесений у SDK `relatedStaffIds`. Рядки **8**.
  Залежить: D1-A, D1-B (публічний `subscribeInteraction`). Готово: RED→GREEN, свої demo-тести; бриф `briefs/D1-D.md`.

## Після кожної задачі
Координатор: перевіряє робочий файл → ганяє тести задачі → мутації (одноразова копія для чистих модулів) →
незалежне рев'ю (`gate-reviewer`) → коміт → рядок у ledger.
