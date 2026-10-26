# tasks.md — bulk-мутації ієрархії

> ✅ **ЗАКРИТО 2026-10-26.** Усі 8 тасків DONE. Злито в `main` через PR #95 (merge-коміт
> `dd86c1d`), CI на `main` зелений (Docs freshness + SDK+demo 1178 + Rust 25 + Playwright).
> Підсумок — [`report.md`](./report.md).

Вхід: `plan.md` (GATE 2 PASS). Писар коду — codex; tdd (тести перед кодом, success+failure).
Статус-позначка в самому файлі (у dg немає окремої теки «в роботі»). `[P]` = логічно незалежний,
АЛЕ спільний файл `bulkMutations.ts` → codex-писарі НЕ паралеляться на ньому (урок T3a: конфлікт).
Порядок виконання — послідовний per-tree.

Кожен таск: тести ПЕРШІ (red), тоді код (green), тоді refactor. Гейт таска: `tsc`+`oxlint`+`rstest` зелені.

---

## T-BM1 — типи (фундамент) — статус: DONE
**Файли:** `callbacks.ts` (+4 LayoutPatch-варіанти), `interaction/bulkMutations.ts` (new; Summary-типи +
порожні сигнатури 4 функцій, що кидають `InteractionError('not implemented')` тимчасово — або одразу з T-BM2+).
**Критерій готово:** tsc 0; LayoutPatch union розширено; Summary-типи експортуються.
**Закриває:** передумову для всіх; (частково T2/T3 приймальної таблиці — форми patch/summary).

## T-BM2 — `transferChildren` (pure) + тести — статус: DONE
**Файл:** `interaction/bulkMutations.ts` (+ переюз `rosterOf`/`adminParentsOf` з `positionReparent.ts`).
**Тести (red→green):** A1,A2,A3,A4,A5,A6,A7 + `to===from`→no-op (NB-a).
**Логіка:** знайти admin-лінії `fromId=from` → переписати на `fromId=to`; валідація unknown/cycle
(to справжній нащадок from)/`to===from`=no-op; replace-семантика (N6, без дубль-admin-батька).
**Критерій:** усі A-тести зелені; чиста функція, 0 мутацій на місці.
**Закриває:** A1-A7.

## T-BM3 — `deleteSubtree` (pure) + тести — статус: DONE
**Файл:** `interaction/bulkMutations.ts`.
**Тести:** D1,D2,D3,D4,D5,D6,D7.
**Логіка:** BFS по admin `fromId` (seen-guard); removal-set; прибрати reportLines будь-якого kind де
from|to∈set; осиротілі persons (лише цим set); занулити `department.parentPositionId`∈set (N1); відмова
isHead/head-у-set (OQ1); unknown→throw.
**Критерій:** усі D-тести зелені.
**Закриває:** D1-D7.

## T-BM4 — `transferChildOrgs` (pure) + тести — статус: DONE
**Файл:** `interaction/bulkMutations.ts`.
**Тести:** O1,O2,O3 + `to===from`→no-op.
**Логіка:** orgs з `parentOrgId=from`→`=to`; cycle через `validateOrgHierarchy` ПЕРЕД обходом (NB-b),
`OrgHierarchyError`→`InteractionError`; no-op/unknown.
**Критерій:** O-тести зелені.
**Закриває:** O1-O3.

## T-BM5 — `deleteOrgSubtree` (pure) + тести — статус: DONE
**Файл:** `interaction/bulkMutations.ts`.
**Тести:** OD1,OD2,OD3,OD4,OD5,OD6.
**Логіка:** каскад з plan.md (orgs через `extractSubtree` ПІСЛЯ `validateOrgHierarchy`; positions;
departments; reportLines from|to; orgLinks `?? []`; осиротілі persons; осиротілі groups = survivor-set
`org.groupIds ∪ positions.groupIds`, B1); root→відмова (OQ1); unknown→throw.
**Критерій:** OD-тести зелені.
**Закриває:** OD1-OD6.

## T-BM6 — барель + фасад-методи + fasade-тести — статус: DONE
**Файли:** `interaction/index.ts` (export 4 функції+Summary-типи), `OrgHierarchyDiagram.ts` (4 async-методи:
pure→`commitDataChange(next,patch)`→повернути summary; no-op гілка: порожній summary→без `commitDataChange`).
**Тести (fasade):** T1 (атомарність: getData до/після reject незмінна), T2 (onLayoutChange отримав новий
patch-варіант), + по одному happy-path на метод через фасад (rejects на InteractionError).
**Критерій:** fasade-тести зелені; single-flight-поведінка успадкована (не нова).
**Закриває:** T1, T2.

## T-BM7 — docs/USAGE.md — статус: DONE
**Файл:** `docs/USAGE.md` (+ секція: 4 методи, сигнатури, Summary-типи, 4 LayoutPatch-варіанти,
контракт single-flight, N9 «видалення current-org лишає порожній вид — відповідальність хоста»).
**Критерій:** `npm run check:docs` зелений (базова лінія публічних методів 8→ не зросла непокрито;
+4 методи задокументовані).
**Закриває:** T3.

## T-BM8 — повні гейти + verify — статус: DONE
**Дія:** `npm run typecheck`, `npx oxlint --max-warnings 0`, `npx rstest run` (baseline+нові),
`cargo test` (незмінний), `npm run check:docs`. Далі крок 8 spec-flow (`code-review` на діф гілки).
**Критерій:** усі гейти зелені; code-review без blocking.
**Закриває:** увесь цикл; передує owner-«го» + коміт.

---
**Залежності:** T-BM1 → (T-BM2,3,4,5 послідовно, спільний файл) → T-BM6 → T-BM7 → T-BM8.
**Коміт — лише після owner-«го»** (і, за патерном лінії, після code-review).
