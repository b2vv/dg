# GATE 2 — plan-defense (bulk-hierarchy-mutations)

Model ID: claude-opus-4-8

ДАЛІ: прочитати spec.md + plan.md, завантажити скіл plan-defense, застосувати 5 питань до 4 мутацій.

## ФАКТ — звірка з кодом
- `positionReparent.ts`: `rosterOf` (49-59), `adminParentsOf` (62-71), `checkReparent` unknown/root/self/unchanged/cycle (94-120), seen-guard проти наявних циклів (112-118), `reparentPosition` replace-admin-line + throw InteractionError (139-154). Переюз-таблиця плану (рядки 9-16) відповідає коду.
- `OrgHierarchyDiagram.reparentPosition` (1907-1920): pure read this.data → `commitDataChange(next, patch)`. Патерн обгортки, на який план посилається (plan 61-70) — реальний.
- `commitDataChange` (687-700): **this.data = next ДО await render** (688). Потім `drawOrRestore` (715-734): при збої render відкочує this.data=lastDrawnData і rethrow. Перевірка `lastDrawnData !== next` (690) → throw "never reached the screen and was not applied" (695-697), якщо сусідня мутація перезаписала.
- `callbacks.ts` LayoutPatch (7-22): union розширюваний; прецедент `displacedPositionId`/`ejectedOrgId`. Нові варіанти плану (74-77) лягають корректно.
- `data/types.ts`: усі поля каскаду існують — `orgLinks?` (19, **optional**), `parentOrgId?` (54, optional), `groupIds` (63/121), `organizationId` (86/119), `personId?` (122, optional), `isHead?` (126).

## РІШЕННЯ — 5 питань plan-defense (застосовано до 4 мутацій)

| # | Питання | Закрито рядком | Вердикт |
|---|---|---|---|
| 1 | кривий інпут (unknown id, from===to, null/undefined, цикл, зіпсовані дані) | `plan.md:80-90` (правила: unknown/cycle/root/head, `to===from` підвипадок cycle 83) + `plan.md:70` (InteractionError ДО commitDataChange) + `plan.md:86,90` (seen-guard проти наявних циклів у зборі піддерева). null/undefined → funnel в unknown (knownIds.has→false). | закрито |
| 2 | відмова залежності (worker/WASM/relayout) | `plan.md:129` (pure TS, межа WASM не зачіпається — у pure-функцій немає зовн. залежності) + `plan.md:68-70,104` (commit через reused `commitDataChange`, що тригерить relayout; збій render → `drawOrRestore` відкочує this.data і rethrow — успадкована поведінка, verify OrgHierarchyDiagram.ts:715-734). | закрито (успадкуванням) |
| 3 | гонка й повторний виклик | **ідемпотентність/повтор:** `plan.md:84` (unknown) + `spec.md:53` — другий `deleteSubtree(pos)` на вже видалений id → unknown → InteractionError (НЕ no-op, свідомо). ЗАКРИТО. **паралельні/overtaking виклики:** — | **ДІРКА** (паралельна половина) |
| 4 | порожні та граничні | `plan.md:70` (no-op, порожній summary, патч не емітиться) + `plan.md:83` (from без дітей→no-op) + `plan.md:88` (from без під-орг→no-op) + `plan.md:89` (коренева орг→root→InteractionError) + сценарії A4/D1/O3/OD5 (143,147,156,161). Порожня DiagramData → unknown. | закрито |
| 5 | rollback | `plan.md:117-122` (адитивна фіча за новим модулем; revert коміту; незалежність методів; валідація-до-мутації лишає this.data недоторканим — verify: pure throw @positionReparent.ts:146 ДО commitDataChange @OrgHierarchyDiagram.ts:688) + `spec.md:75` (undo/redo, персистентність, server-sync — OUT OF SCOPE: незворотного SDK-ефекту немає, хост володіє persist). | закрито |

## Деталь дірки #3 (паралельні виклики)
Код (commitDataChange 687-700): `this.data = next` ставиться синхронно ДО першого await, тож
pure-read + assign у межах одного синхронного вікна → торн-рідів немає, послідовна консистентність
є. АЛЕ: при двох in-flight викликах (`d.deleteSubtree(A); d.deleteSubtree(B)` без await між ними,
A і B — неперетинні) другий ставить this.data=next2, коалесер малює next2, `lastDrawnData=next2`;
перший відновлюється, `lastDrawnData !== next1` → **кидає "never reached the screen and was not
applied"** (695-697) — попри те, що видалення A ВВІЙШЛО в next2. Хост, що робить
`Promise.all([deleteSubtree(A), deleteSubtree(B)])`, побачить реджект першого з оманливою помилкою.
Для bulk це гостріше за одиничний reparent: сама премиса фічі — редагувати «блоками» (spec.md:8),
тобто серії викликів. План НЕ називає поведінку під конкурентним викликом: ні «await серіями / single-flight»,
ні «last-writer-wins, ранній може реджектнути (як усі мутатори)», ні «конкурентні виклики поза скоупом».
Рядок 104 «як наявні мутації» — посилання, а не названа поведінка, яку побачить користувач.

## Non-blocking нотатка (не окрема дірка)
`orgLinks?`/`parentOrgId?`/`personId?` — optional (types.ts:19,54,122). Каскад deleteOrgSubtree крок 5
(plan:97) мусить гардити undefined `orgLinks` (`?? []`). Покрито загальним no-op/empty-closure (Q4),
tdd-деталь; не підіймаю в блокер.

## ВЕРДИКТ
**GATE2-DEFENSE: RED.** Дірок: **1** (рядок таблиці #3, паралельна половина).
Решта 4 питань закриті названими рядками плану.
Закриття #3 — один рядок у plan.md: або вимога await-серій/single-flight, або явне last-writer-wins
з документованим раннім реджектом, або «конкурентні неочікувані виклики поза скоупом, бо хост серіалізує».

## ROUND 2 — перевірка закриття #3
ФАКТ: план дописав секцію «GATE 2 — закриття (round 1)», пункт #3 (plan.md:154-159):
контракт single-flight (await серій); конкурентні in-flight виклики ЯВНО НЕ підтримуються;
успадкування commitDataChange (last-writer-wins + ранній reject «never reached the screen»),
ІДЕНТИЧНО reparentPosition/movePersonToCell; документується в docs/USAGE.md.

РІШЕННЯ: це рівно один із двох прийнятних способів закриття з мого defense — (а) await-серій
ПЛЮС (в) явне звуження скоупу «конкурентні in-flight не підтримуються, бо хост серіалізує».
Названа і поведінка, яку побачить користувач (ранній reject, ідентичний наявним мутаторам),
і межа скоупу. Заява про успадкування звірена з кодом: commitDataChange (OrgHierarchyDiagram.ts:687-700)
дає саме last-writer-wins + reject «never reached the screen» (695-697), і reparentPosition/movePersonToCell
ідуть через той самий commitDataChange — твердження «ідентично» коректне.

Рядок #3 таблиці (паралельна половина) — ЗАКРИТО (plan.md:154-159).

## ФІНАЛЬНИЙ ВЕРДИКТ
**GATE2-DEFENSE: PASS.** Дірок: 0. Усі 5 питань закриті названими рядками плану
(1→80-90,70,86,90; 2→129,68-70,104; 3→154-159; 4→70,83,88,89; 5→117-122,spec:75).
Non-blocking нотатка (orgLinks? guard `?? []`) лишається tdd-деталлю, не блокер.
