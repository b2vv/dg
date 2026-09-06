# T116 org-reparent — spec + plan (agent work log)

ДАЛІ: прочитати T116, org-diagram-parity.md (п.16 + Підсумок), взірець seat-collision/spec.md +
plan.md, і стандарти (AGENTS.md, .claude/standards.md, TDD.md, CODING_STANDARDS.md).
Потім — код: callbacks.ts (LayoutPatch), interaction/positionReparent.ts,
OrgHierarchyDiagram.ts (reparentPosition:1664, commitDataChange, org-мутатори),
layout/orgTree.ts, data/types.ts.

## Крок 1 — вимоги прочитано
ФАКТ: T116 читано повністю. Пропонує `{type:'org-reparent'; orgId; fromParentOrgId: string|null;
toParentOrgId: string}` + `interaction/orgReparent.ts` + `reparentOrg(orgId, newParentOrgId)`.
ФАКТ: взірець seat-collision/spec.md — секції: Проблема / Це недоробка / Рішення (продукт) /
Користувацькі сценарії / Acceptance criteria (A1..An таблиця) / Out of scope / Відкриті питання.
plan.md — 1..9: головне рішення, правило вирішення (+таблиця граничних входів), проєкція, коміт,
публічний контракт, порядок робіт (К1..Кn з success+failure тестами), сайд-ефекти, rollback,
відкриті питання.
ДАЛІ: org-diagram-parity.md п.16 + Підсумок; далі код.

## Крок 2 — читання коду, ключові ФАКТИ

ФАКТ (найважливіший): **нічого в `packages/sdk/src` не пише `parentOrgId`.** Grep по всьому
пакету — лише читачі (`layout/orgTree.ts`, `rowTreeLayout.ts`, `orgMode.ts`, `matrixLayout.ts:45,94`,
`staff/canvasLayout.ts:63,124`, `export/subtree.ts:7`, `data/initialExpand.ts:39`,
`interaction/revealPath.ts:21`, `OrgHierarchyDiagram.ts:237-250`). Мутатора справді немає.

ФАКТ: **org-картки взагалі не перетягуються.** `reorderOrg`/`placeOrgAtMatrixCell` — API-only,
жоден жест у них не веде (grep: збіги лише в `index.ts`, фасаді й layout). Drag існує лише для
персон: `personInteractions.ts` (`SeatDragMode = 'move'|'reparent'`), `dropTargetIndex.ts`,
seam `DiagramRenderer.canReparent:251` / `canDropOn:235`. Отже T116 закриває **дані+API**, а не
жест — паритет п.16 без жесту не закритий. Це треба сказати вголос.

ФАКТ (корінь): ліс підтримано — `findExpandedRootIds` (`orgMode.ts:65-85`), `computeOrgLayout`
робить side-by-side для кількох коренів (`rowTreeLayout.ts` T78-L3). Корінь = `!parentOrgId`,
**структурна** властивість, не прапорець.
РІШЕННЯ/доказ: «ліс без кореня» **неможливий за побудовою**: скінченний граф, ≤1 батько на вузол,
без циклів ⇒ існує вузол без батька. Тобто cycle-guard **і є** root-guard. Діри T117 (там корінь —
прапорець `isHead`, який ніхто не боронить) тут немає **за побудовою**, а не за пильністю.

ФАКТ: `validateOrgHierarchy` (`orgTree.ts:10`) викликається **в layout** (`rowTreeLayout.ts:98,143`),
не в `setData`. Тобто цикл, покладений мутатором, впав би на рендері → `drawOrRestore` відкотив би
дані й `commitDataChange` відхилився. Працює, але це помилка рендера замість відмови дії — тому
перевірка **до** коміту обов'язкова.

ФАКТ: `MAX_ROW_TREE_DEPTH = 2500` (`rowTreeLayout.ts:46`) — reparent теоретично може перевищити.
Практично: хост сам ріже глибину ≤10 рівнів у фільтрі (`questions.md` §E16). Pre-check не робимо.

ФАКТ: `commitDataChange` (`OrgHierarchyDiagram.ts:652`) вже дає всю транзакційність T104/T103:
один запис `this.data`, кадр, звірка `lastDrawnData !== next`, і лише тоді `onLayoutChange`.
Піддерево їде разом **за побудовою** — батьківство зберігається на дитині, змінюється один запис.

ФАКТ (розбіжність поведінки): `reparentPosition` (`:1673`) **мовчки** ковтає `InteractionError`;
`movePersonToCell` (`:1687`) те саме. T111/К2 уже визнав це дефектом. T116 вимагає видимої відмови —
отже два сусідні мутатори матимуть різну семантику відмови. Назвати.

ФАКТ (гейт доків): `scripts/check-docs.mjs:110-126` ловить новий публічний метод автоматично
(`fresh` = не в `UNDOCUMENTED_BASELINE`). Нового скрипта, на відміну від T111/A8, **не треба**.

ФАКТ (сайд-ефект, який ніхто не називав): `childrenCount`/`allDescendantCount`
(`data/types.ts:37-39`) — **хостові** бейджі. Після reparent вони брехатимуть на старому й новому
батькові, доки хост не пришле `setData`. SDK їх не рахує.

ФАКТ: додавання варіанта в публічний union `LayoutPatch` ламає хости з вичерпним `switch` +
`assertNever`. Це ламальна зміна типів, хоч і адитивна.

ФАКТ (продуктова розвилка з даних): `DiagramOrganization` має `periodStart`/`periodEnd`/
`periodLabel` — **період підпорядкування**; у хості клік по зв'язку показує саме його
(`questions.md` §E16 `:110-116`). Зміна батька логічно закриває старий період і відкриває новий —
SDK цього вирішити не може.

ФАКТ: у хості є BulkBar «Підпорядкувати» на кілька виділених org
(`org-hierarchy-canvas.view.tsx:146-173`), а одиниця undo = **подія** (questions.md п.15).
Прецедент bulk-форми в SDK є: `setOrgsCollapsed` («One data update and one render for the whole set»).

ДАЛІ: писати spec.md, потім plan.md у work/reports/org-reparent/.

## Крок 3 — написано
ФАКТ: `work/reports/org-reparent/spec.md` — Проблема / Це нова фіча (і половина не в цьому циклі) /
Рішення (таблиця) / доказ «ліс без кореня неможливий» / 8 сценаріїв / A1–A10 / Out of scope /
7 відкритих питань.
ФАКТ: `work/reports/org-reparent/plan.md` — §1 дім і сигнатури (+таблиця відкинутих домів),
§2 правило + граничні входи, §3 мутатор, §4 публічний контракт, §5 К1–К5 з success/failure,
§6 сайд-ефекти, §7 rollback, §8 чого не робить, §9 розходження з T116.
ФАКТ: `npm run check:docs` зелений — лінки нових файлів резолвяться.
РІШЕННЯ: форму патча з T116 прийнято без змін; розходження — чотири відмови замість «плюс п'ята»,
`unchanged` як no-op, піддерево як регресія, і «Готово коли» = лише API-половина паритету.
