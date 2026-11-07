# tasks — subordinate-counts (A) + node-sugar (B)

> spec-flow крок 6. Вхід: `spec.md` (12 AC), `plan.md` (GATE 2 **GREEN**, reviewer Opus 4.8).
> Імплемент — через `codex exec` (сам, не сабагент, не --worktree); Claude пише тести-контракт/рев'юнить +
> женe тести сам (`npm test -w @org-hierarchy/sdk`, НЕ npx rstest). Код НЕ починати до зняття owner-блоку
> «no code». Статус у файлі явний (у dg немає окремої «в роботі» теки).

Легенда статусу: `[ ]` не почато · `[~]` в роботі · `[x]` готово. `[P]` — можна паралельно.

## T1 [P] — core/subordinateCounts.ts (pure) + unit-тести  — СТАТУС: [x]
- Файл: `packages/sdk/src/core/subordinateCounts.ts` + `*.test.ts`.
- `computeSubordinateCounts(positions, reportLines): Map<id,{childrenCount,allDescendantCount}>`.
  Reuse `adminChildrenMap` (positionExpand.ts:15 — уже скіпає self-loop+missing-id). childrenCount=out-degree;
  allDescendantCount=розмір admin-піддерева (DFS, visited-set). **По всіх вузлах**. Лише не-листи в Map.
  cross-org guard = обидва кінці в positions-map.
- Тести (TDD, red-first): S1 не-лист, S3 all-roots (UnlinkedPositionRoot), S4 parity-фікстура, S6 **failure**
  (цикл A→B→A, дубль-ребро → кінечно).
- Done: тести зелені; покриває AC2/AC3/AC4/AC8. Залежності: нема.

## T2 — wiring у setData (overwrite + клобер листа)  — СТАТУС: [x]  (залежить T1)
- `OrgHierarchyDiagram.setData`: між epoch-check (:1305) і commit (:1307) — обчислити мапу, пройти ВСІ
  `next.positions`: entry в Map → записати числа; **немає в Map (лист) → ВИДАЛИТИ** childrenCount/
  allDescendantCount (клобер host-переданого, AC5). Синхронно, без await.
- Тести: S2 лист=undefined (+ футер прихований — contract), S5 overwrite host-числа.
- Done: AC1/AC5 зелені; картка малює SDK-числа. Залежить: T1.

## T3 — wiring у appendData (recompute на merged)  — СТАТУС: [x]  (залежить T1)
- `OrgHierarchyDiagram.appendData`: перерахувати counts на `merged` ПЕРЕД commit (:1374), та сама клобер-логіка.
- Тест: **S10** appendData з новим підлеглим → counts перераховані; лист→не-лист undefined→число.
- Done: S10 зелений (stale-шлях закрито). Залежить: T1.

## T4 [P] — DiagramNode accessor + getNode  — СТАТУС: [x]
- Новий `DiagramNode` + публічний `OrgHierarchyDiagram.getNode(ref: NodeRef): DiagramNode | null`
  (null для невідомого ref). `getData()` → shallow-clone ОДНОГО обʼєкта за ref.kind+id (не сцени);
  `getState()` → {selected (SelectionStore), hovered (viewState.highlightedNode), expanded/collapsed
  (position: isPositionExpanded+positionHasAdminChildren; org: lastDrawnStaffOrgIds; person: false)}.
- Тести: S7 getData (вкл. A-числа), S8 getState (position+org+person).
- Done: AC9/AC10 зелені. Залежність: нема (чистий щодо T1-T3; дані/стор-и наявні). Паралельно з T1-T3.

## T5 — docs/USAGE.md + check:docs  — СТАТУС: [x]  (залежить T2,T4)
- Описати: SDK обчислює childrenCount/allDescendantCount (хост читає з getData()); новий `getNode`.
  facadeSurface зловить getNode → мусить бути в USAGE.md того ж коміту.
- Done: S9 — `npm run check:docs` зелений. AC7/AC12.

## T6 — verify повний  — СТАТУС: [ ]  (залежить усі)
- `npm test -w @org-hierarchy/sdk` (не npx), `npm run typecheck`, `npm run check:docs`, `npm run lint`.
- `code-review` на дифі (standards + spec). Claude не вірить codex-«зелено»: прогнати самому.
- Done: усе зелене; звіт `ship-report` (delta до plan).

## Сигнал Cass-1 (після T6 зеленого)
Надіслати Cass-1 [b223aa] сигнал: SDK-порт готовий → host переводить сайдбар на getData()/getNode і
дропає legacy-мапер-calc + кеш. Не раніше (щоб не було вікна подвійного джерела).

## Порядок
T1 ∥ T4 (паралельно) → T2, T3 (після T1) → T5 (після T2,T4) → T6 (після всіх) → сигнал Cass-1.
