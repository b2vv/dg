# plan.md — bulk-мутації ієрархії (ЯК)

Вхід: `spec.md` (GATE 1 пройдено). Поріг спрацював. Статус: PLAN / GATE 2 pending.

## Reuse-first (звірено по коду @ 530d24c)

| Що | Джерело | Переюз / нове |
|---|---|---|
| `SeatRoster`, `rosterOf(positions)` | `interaction/positionReparent.ts:36-59` | **переюз** (валідація unknown/head) |
| `adminParentsOf(reports)` → Map<toId,fromId> | `interaction/positionReparent.ts:62-71` | **переюз** (інверсія дає admin-дітей; обхід угору для cycle) |
| `checkReparent`/`canReparent` (unknown/root/self/unchanged/cycle) | `positionReparent.ts:94-130` | **патерн-зразок**, не прямий виклик (bulk має інший cycle-предикат) |
| `reparentPosition` (replace admin line) | `positionReparent.ts:139-154` | **переюз** всередині `transferChildren` (по дитині) АБО спільна інверсія — вирішити в tdd |
| `commitDataChange(next, patch)` | `OrgHierarchyDiagram.ts:687` | **переюз** (обгортки) |
| патерн обгортки-мутатора | `OrgHierarchyDiagram.reparentPosition:1907-1920` | **зразок** для 4 нових методів |
| `InteractionError` | `core/errors.ts` | **переюз** (усі відмови) |
| валідація org-дерева `parentOrgId` (цикл) | `layout/orgTree.ts` (згадано в positionReparent:111) | **звірити** й переюзнути предикат циклу org |
| `NO_DEPARTMENT_ID`, `dataStats` | `data/types.ts` | контекст |

Чому не прямий `checkReparent`: у bulk cycle-предикат інший — для `transferChildren` заборонено `to`
∈ піддерево(from); для org — `to` ∈ піддерево(from) по `parentOrgId`. Решту відмов (unknown/head)
беремо з тих самих рострів.

## Розміщення (маніфест `## Розміщення`)

Нові **чисті** функції над `DiagramData` (TS) — не геометрія, тож **не** `packages/core` (Rust).
Найближчий сиблінг (`reparentPosition`) живе в `interaction/`, ці операції — така сама
data-трансформація. → один когезивний модуль:

- **`packages/sdk/src/interaction/bulkMutations.ts`** (новий) — 4 чисті функції + приватні хелпери
  (збір піддерева, інверсія admin-ліній, збір org-нащадків). Переюзує `positionReparent` хелпери
  з того ж каталогу.
- Якщо файл перевищить `max-lines` (стиль-гейт на людині) — спліт `positionBulk.ts` / `orgBulk.ts`.
  Поки KISS: один модуль, доки не доведено потребу (конституція §0, GoF лише за ≥2-3 повторень).
- Експорт через `interaction/index.ts` барель; публічні методи — на `OrgHierarchyDiagram`.
- `LayoutPatch` варіанти — у `callbacks.ts` (публічний union).

Альт відкинуто: `data/` окремий модуль — розірвав би з наявним reparent-патерном і подвоїв хелпери.
(GATE-2 перевірить це рішення: Clean Architecture — чи «interaction» коректний шар для org-wide delete.)

## Публічний API (додається; `docs/USAGE.md` + конституція)

### Чисті функції (`interaction/bulkMutations.ts`)
```
transferChildren(data, fromPositionId, toPositionId): { data: DiagramData; summary: TransferChildrenSummary }
deleteSubtree(data, positionId): { data: DiagramData; summary: DeleteSubtreeSummary }
transferChildOrgs(data, fromOrgId, toOrgId): { data: DiagramData; summary: TransferOrgsSummary }
deleteOrgSubtree(data, orgId): { data: DiagramData; summary: DeleteOrgSubtreeSummary }
```
Чисті: приймають `DiagramData`, повертають **новий** `DiagramData` + summary; нічого не мутують на місці.

### Summary-типи (OQ3)
```
TransferChildrenSummary  = { movedChildIds: string[]; fromPositionId: string; toPositionId: string }
DeleteSubtreeSummary     = { removedPositionIds: string[]; removedPersonIds: string[]; removedReportLineCount: number }
TransferOrgsSummary      = { movedOrgIds: string[]; fromOrgId: string; toOrgId: string }
DeleteOrgSubtreeSummary  = { removedOrgIds: string[]; removedDepartmentIds: string[]; removedPositionIds: string[];
                             removedPersonIds: string[]; removedGroupIds: string[];
                             removedReportLineCount: number; removedOrgLinkCount: number }
```

### Методи `OrgHierarchyDiagram` (async-обгортки, патерн reparentPosition)
```
async transferChildren(fromPositionId, toPositionId): Promise<TransferChildrenSummary>
async deleteSubtree(positionId): Promise<DeleteSubtreeSummary>
async transferChildOrgs(fromOrgId, toOrgId): Promise<TransferOrgsSummary>
async deleteOrgSubtree(orgId): Promise<DeleteOrgSubtreeSummary>
```
Кожна: викликає чисту функцію над `this.data`; при валідній зміні — `commitDataChange(next, patch)`;
повертає summary. Валідація кидає `InteractionError` ДО `commitDataChange`.

**No-op гілка (B2-фікс, GATE 2):** reparent на `unchanged` **КИДАЄ** (`positionReparent.ts:107,146`),
а `commitDataChange` **безумовно** емітить `onLayoutChange` (`OrgHierarchyDiagram.ts:699`) — тож
«патч не емітиться як у reparent» було ХИБОЮ, такої гілки в наявному патерні немає. Правильно:
обгортка сама перевіряє summary — якщо він порожній (transferChildren без admin-дітей; transferChildOrgs
без під-орг; `from===to`), **НЕ** викликати `commitDataChange`, повернути порожній summary, патча немає,
`InteractionError` немає. deleteSubtree/deleteOrgSubtree завжди прибирають щонайменше target → no-op
у них лише через `unknown`→throw.

### LayoutPatch варіанти (`callbacks.ts`, публічний union)
```
| { type: 'bulk-transfer-children'; fromPositionId: string; toPositionId: string; movedChildIds: string[] }
| { type: 'subtree-delete'; positionId: string; removedPositionIds: string[] }
| { type: 'org-transfer-children'; fromOrgId: string; toOrgId: string; movedOrgIds: string[] }
| { type: 'org-subtree-delete'; orgId: string; removedOrgIds: string[] }
```

## Правила валідації (кидають InteractionError ДО мутації)

**transferChildren(from,to):** `from`/`to` відомі (інакше `unknown`); `to===from` → **no-op** (порожній
summary, перевіряється ПЕРШИМ, НЕ cycle — NB-a); `to` справжній нащадок (∈ піддерево(from), крім самого
from) → `cycle`. Крос-орг дозволено (OQ2). `from` без admin-дітей → no-op.
**deleteSubtree(pos):** `pos` відомий; `pos` НЕ `isHead` (OQ1); жодна позиція в removal-set не `isHead`
org, що лишається (OQ1-уточнення) — інакше `head`. Збір піддерева: BFS/DFS по admin `fromId`, із guard
проти наявних циклів (seen-set, як checkReparent:112).
**transferChildOrgs(from,to):** `from`/`to` відомі; `to===from` → **no-op** (перевіряється першим, NB-a);
`to` справжній нащадок `from` по `parentOrgId` → `cycle`. `from` без під-орг → no-op.
**deleteOrgSubtree(org):** `org` відомий; `org` має `parentOrgId` (інакше `root` → відмова, OQ1).
**NB-b:** org-збір нащадків секвенується як `validateOrgHierarchy(organizations)` ПЕРЕД `extractSubtree`
— `extractSubtree` (orgTree.ts:81-87) НЕ має seen-guard, тож на циклічному `parentOrgId` рекурсував би
нескінченно; `validateOrgHierarchy` (orgTree.ts:10-37) кидає на цикл першим. `OrgHierarchyError` з обох
транслюється в `InteractionError` на межі методу. (Той самий ordering — для transferChildOrgs cycle-предикату.)

## Каскад видалення (точний порядок, deleteOrgSubtree)
1. removedOrgIds = org + транзитивні нащадки по parentOrgId.
2. removedPositionIds = positions з organizationId ∈ removedOrgIds.
3. removedDepartmentIds = departments з organizationId ∈ removedOrgIds.
4. reportLines: прибрати де fromId|toId ∈ removedPositionIds.
5. orgLinks: прибрати де `fromOrgId|toOrgId` ∈ removedOrgIds (guard `orgLinks ?? []` — optional, N2/types.ts:19).
6. removedPersonIds = persons, чий id зустрічається як personId ЛИШЕ на removedPositionIds (не на вцілілих).
7. **removedGroupIds (B1-фікс, GATE 2):** survivor-set посилань = `groupIds` вцілілих **org** ∪ `groupIds`
   вцілілих **positions** (`DiagramPosition.groupIds` теж реферить groups — types.ts:121!). removedGroupIds =
   groups, на які після 1-6 НЕ посилається жоден вцілілий у цьому об'єднаному survivor-set. (Рахувати лише
   org.groupIds — хибно: group від вцілілої позиції видалилася б → dangling на survivor.)

deleteSubtree(pos): removal-set = pos + admin-нащадки (BFS по `fromId`, seen-guard проти наявних циклів);
reportLines будь-якого kind де `from|to` ∈ set; persons осиротілі лише цим set.
**N1-фікс:** вцілілі `departments`, чий `parentPositionId` ∈ removal-set, — занулити `parentPositionId`
(`DiagramDepartment.parentPositionId?: string|null`, types.ts:94), інакше dangling-посилання на видалену посаду.
(У deleteOrgSubtree departments тих org видаляються цілком — там dangling неможливий.)

## Сайд-ефекти
- `commitDataChange` тригерить relayout (worker) + `onLayoutChange(patch)` + `onDataChange` (як наявні мутації).
- Видалення позицій/орг змінює кадри рендера — relayout прибере картки/контури; grid-позиції сусідів
  перерахуються розкладкою (не наша турбота на рівні data).
- `onLayoutChange` отримує НОВІ варіанти patch — споживач-хост, що робить exhaustive switch, побачить
  нові гілки (TS-зламу немає — union розширюється; хости з `default` не ламаються).

## План міграції
- Чисте додавання API: нові методи/функції/patch-варіанти. Наявні сигнатури не змінюються.
- `docs/USAGE.md`: додати секцію про 4 методи + Summary-типи + нові LayoutPatch-варіанти (гейт check:docs
  рахує публічні методи OrgHierarchyDiagram — базова лінія 8, впаде на +4, тож документування обов'язкове,
  інакше гейт червоний).
- Хостам нічого не треба робити, доки не викликають нові методи. Зворотно сумісно.

## Rollback
- Фіча — адитивна й за новим модулем. Відкат = revert коміту(ів); наявна поведінка не зачеплена.
- Якщо після релізу знайдеться дефект каскаду — методи незалежні, можна вимкнути документування/експорт
  одного, не чіпаючи інших (кожен у своїй функції + своєму patch-варіанті).
- Транзакційність (валідація до мутації) означає: збій валідації лишає `this.data` недоторканим —
  «відкат» усередині виклику безкоштовний (нова `DiagramData` просто не комітиться).

## Конституція (маніфест `## Конституція`) — самоперевірка (GATE 2 підтвердить інлайн)
- [ ] Тести перед кодом: success+failure на кожну з 4 операцій + кожне правило відмови. (крок 7 tdd)
- [ ] Ієрархія принципів KISS→…: один модуль поки не доведено спліт; без передчасних абстракцій.
- [ ] GoF лише за ≥2-3 повтори: **жодного** спекулятивного спільного хелпера (N3) — position-піддерево
  (admin reportLines) і org-піддерево (parentOrgId, наявний `extractSubtree`) — різні графи, окремі обходи.
- [ ] Межа WASM↔TS: НЕ зачіпається (суто TS data-трансформації; геометрія не рухається).
- [ ] Публічний API не змінюється мовчки: `docs/USAGE.md` оновлюється тим самим PR (+ LayoutPatch).
- [ ] Pocock лише TS: так (увесь код — TS; discriminated unions для Summary/patch, `satisfies` де доречно).

## GATE 2 — закриття (round 1)

Два свіжі незалежні рев'ювери (Opus 4.8): plan-critique (RED: B1,B2) + plan-defense (RED: #3). Усі
знахідки звірено по коду координатором. Закриття:

- **B1** (осиротілі groups ігнорували position.groupIds) — закрито у «Каскад» крок 7 вище.
- **B2** (no-op описано хибно) — закрито у «No-op гілка» вище.
- **#3 (defense: паралельні in-flight виклики)** — **контракт single-flight**. Мутації серіалізуються:
  викликати наступну лише після `await` попередньої. Конкурентні in-flight виклики **не підтримуються** і
  успадковують поведінку `commitDataChange` (last-writer-wins + ранній reject «never reached the screen»),
  ІДЕНТИЧНО наявним `reparentPosition`/`movePersonToCell`. Це документується в `docs/USAGE.md` (не нова
  поведінка — спільна для всіх мутаторів SDK). Вибір (а) зі списку defense: await-серій; (в) як обґрунтування:
  хост серіалізує bulk-операції. KISS + консистентність зі 100% наявних мутацій — не вводимо окремий чергувач.
- **N2** (reuse `extractSubtree`/`validateOrgHierarchy` з orgTree.ts): org-операції **переюзають**
  `extractSubtree` (збір нащадків по parentOrgId) і `validateOrgHierarchy` (детект циклу), але їхній
  `OrgHierarchyError` (orgTree.ts:3,77) обгортається/транслюється в `InteractionError` на межі методу
  (спека вимагає InteractionError). Це НЕ лишається на tdd — названо тут.
- **N3** (спільний collect-subtree — слабко): **прибрано** вимогу спільного хелпера. Два РІЗНІ графи:
  position-піддерево = власний BFS по admin `reportLines` (seen-guard); org-піддерево = наявний
  `extractSubtree`. Жодного форсованого GoF — KISS. (Конституція §0 оновлена відповідно.)
- **N4**: `to===from` у transferChildren/transferChildOrgs — явний **no-op** (порожній summary, без патча),
  НЕ «cycle». Cycle — лише коли `to` справжній нащадок `from`.
- **N5** (крос-орг deleteSubtree тихо прибирає не-head позиції чужої org): **задокументований скоуп** —
  наслідок OQ2 (крос-орг admin-зв'язки дозволені); summary вертає всі removedPositionIds, хост бачить обсяг.
- **N6** (replace-семантика admin-батька): tdd-тест — transferChildren рветься через інверсію/заміну
  admin-ліній дітей `from`; НЕ створювати дубль admin-батьків (переюз логіки `reparentPosition` «replace, not add»).
- **N1, N7, N9** — N1 закрито у каскаді; N7 (summary дублює вхід; 'subtree-delete' без removedPersonIds) —
  лишаємо: summary навмисно самодостатній, patch компактний; N9 (видалення current-org лишає порожній вид) —
  **відповідальність хоста**, згадати в USAGE.

Після цих правок обидва гейти переоцінюються (focused re-review). Решта N — не блокери.

## Приймальні сценарії
Формат acceptance-spec (сценарій · передумова · дія · очікуваний результат · чим перевіряється).
Згенеровано інлайн (похідне від AC1-AC4; acceptance-spec як окремий сабагент не залучався — дані
повністю визначені спекою; зафіксовано в живій ноті).

| # | Сценарій | Передумова | Дія | Очікуваний результат | Чим перевіряється |
|---|---|---|---|---|---|
| A1 | transfer: прямі діти переходять | A має admin-дітей c1,c2; B існує | `transferChildren(A,B)` | reportLines c1,c2 тепер fromId=B; A без admin-дітей; summary.movedChildIds=[c1,c2] | unit (pure) + fasade |
| A2 | transfer: піддерева їдуть з дітьми | c1 має свою дитину g1 | `transferChildren(A,B)` | g1 досі fromId=c1 (не чіпається); лише пряма ланка c1→B | unit |
| A3 | transfer: matrix/dotted не чіпати | A має matrix-лінію | `transferChildren(A,B)` | matrix/dotted A незмінні; рухаються лише admin-діти | unit |
| A4 | transfer: no-op без дітей | A без admin-дітей | `transferChildren(A,B)` | data незмінна; summary.movedChildIds=[]; patch не емітиться | unit + fasade (spy onLayoutChange) |
| A5 | transfer: невідомий id | — | `transferChildren(A,'ghost')` | `InteractionError`; data недоторкана | unit (throws) + fasade (rejects) |
| A6 | transfer: цикл (to ∈ піддерево from) | B — нащадок дитини A | `transferChildren(A,B)` | `InteractionError`; data недоторкана | unit |
| A7 | transfer: крос-орг дозволено | A,B у різних org | `transferChildren(A,B)` | успіх (OQ2); діти під B | unit |
| D1 | delete: лист | pos без дітей, з людиною p (лише тут) | `deleteSubtree(pos)` | pos прибрано; reportLines до/від pos прибрано; p прибрано; summary коректний | unit + fasade |
| D2 | delete: піддерево транзитивно | pos→c→g (admin) | `deleteSubtree(pos)` | прибрано pos,c,g + усі їхні лінії; summary.removedPositionIds=[pos,c,g] | unit |
| D3 | delete: лінії будь-якого kind | g має matrix-лінію до вцілілого s | `deleteSubtree(pos)` | matrix-лінію g→s прибрано (один кінець зник) | unit |
| D4 | delete: особа лишається, якщо тримає вцілілу | p на pos (видаляють) і на s (вціліла) | `deleteSubtree(pos)` | p НЕ прибрано (тримає s); summary.removedPersonIds без p | unit |
| D5 | delete: відмова на isHead | pos.isHead=true | `deleteSubtree(pos)` | `InteractionError` (OQ1); data недоторкана | unit |
| D6 | delete: відмова, якщо head у піддереві лишає org без голови | у піддереві є isHead іншої org | `deleteSubtree(pos)` | `InteractionError` (OQ1-уточнення) | unit |
| D7 | delete: невідомий id | — | `deleteSubtree('ghost')` | `InteractionError` | unit |
| O1 | org transfer: під-орг переходять | orgA має дочірні o1,o2; orgB існує | `transferChildOrgs(A,B)` | o1,o2.parentOrgId=B; A лишається; summary.movedOrgIds=[o1,o2] | unit |
| O2 | org transfer: цикл | B — нащадок A по parentOrgId | `transferChildOrgs(A,B)` | `InteractionError` | unit |
| O3 | org transfer: no-op/unknown | A без під-орг / ghost | `transferChildOrgs(...)` | no-op (порожній summary) / `InteractionError` | unit |
| OD1 | org delete: каскад орг+деп+позиції | orgA→child o1; у них departments, positions, persons | `deleteOrgSubtree(A)` | прибрано A,o1 + їх departments + positions + лінії до/від + осиротілі persons; summary повний | unit + fasade |
| OD2 | org delete: orgLinks | є orgLink до видаленої org | `deleteOrgSubtree(A)` | orgLink прибрано; summary.removedOrgLinkCount≥1 | unit |
| OD3 | org delete: осиротілі groups | group g лише на видалених org | `deleteOrgSubtree(A)` | g прибрано (OQ4); summary.removedGroupIds=[g] | unit |
| OD4 | org delete: спільна group лишається | group g і на вцілілій org | `deleteOrgSubtree(A)` | g НЕ прибрано | unit |
| OD5 | org delete: відмова на корені | orgA без parentOrgId | `deleteOrgSubtree(A)` | `InteractionError` (OQ1) | unit |
| OD6 | org delete: невідомий id | — | `deleteOrgSubtree('ghost')` | `InteractionError` | unit |
| T1 | атомарність | будь-яка відмова валідації | будь-який метод з кривим входом | `this.data` байт-незмінна після reject | fasade (getData до/після) |
| T2 | патч емітиться при зміні | валідний transfer/delete | метод | `onLayoutChange` отримав відповідний новий варіант patch | fasade (spy) |
| T3 | docs/USAGE | — | `npm run check:docs` | 4 нові методи задокументовані; гейт зелений | check:docs |
