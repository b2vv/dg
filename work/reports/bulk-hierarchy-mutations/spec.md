# spec.md — bulk-мутації ієрархії (transfer children + delete subtree)

Гілка `bulk-mutations`. Поріг пайплайна: **спрацював** (зміна публічного API SDK → повний цикл).
Статус: SPEC / GATE 1 pending.

## Проблема

Хости, що мігрують з GoJS, редагують структуру **блоками**: переносять усіх підлеглих ліквідованої
посади під іншого керівника; прибирають підрозділ разом з усім, що під ним. Сьогодні SDK вміє лише:
- `reparentPosition(positionId, managerId)` — переносить **одну** посаду;
- видалення **немає зовсім**.

Тож bulk-реорг хост може зробити лише багатьма одиничними викликами (N×reparent, без атомарності —
проміжні стани рендеряться) або повним `setData(...)` rebuild (втрата інкрементальності, миготіння,
хост сам рахує каскад). Обидва шляхи перекладають на хост те, що SDK вже вміє рахувати по своїх
структурах (`reportLines`, `parentOrgId`).

## Користувацькі сценарії

1. **Реорг під нового керівника.** Посаду-керівника розформовують; усі її прямі підлеглі мають
   відтепер звітувати іншому керівнику. Посада лишається (вже без reports). → `transferChildren`.
2. **Ліквідація вузла з усім піддеревом.** Посаду та весь її admin-ланцюг підлеглих прибирають зі
   структури; зв'язки й осиротілі люди зникають разом. → `deleteSubtree`.
3. **Перепідпорядкування під-організацій.** Прямі під-організації однієї орг переходять під іншу.
   Вихідна орг лишається. → `transferChildOrgs`.
4. **Розформування організації.** Орг та всі нащадкові орг прибирають разом з їхніми департаментами,
   посадами, зв'язками й осиротілими людьми. → `deleteOrgSubtree`.

## Структури (факт по коду `data/types.ts`)

- **Reporting-дерево позицій:** `reportLines{ fromId, toId, kind:'admin'|'matrix'|'dotted' }`.
  admin-батько посади = reportLine з `kind:'admin'`, `toId=pos`; admin-діти = `fromId=pos`.
  `reparentPosition` уже так і працює (прибрати вхідну admin-лінію, додати нову).
- **Org-дерево:** `DiagramOrganization.parentOrgId`. Нащадки — транзитивно по `parentOrgId`.
  Орг тримає `departments` (через `DiagramDepartment.organizationId`), `positions`
  (через `DiagramPosition.organizationId`), `orgLinks{ fromOrgId, toOrgId }`, `groupIds`.
- `DiagramPerson` прив'язаний через `DiagramPosition.personId`.

## Acceptance criteria (високорівнево; детальна таблиця — у plan.md через acceptance-spec)

### AC1 `transferChildren(fromPositionId, toPositionId)`
- Усі reportLines `{kind:'admin', fromId:from}` стають `{kind:'admin', fromId:to}`; `toId` і піддерева
  дітей не змінюються (діти тягнуть своє піддерево за собою, бо їхні власні admin-лінії незаймані).
- `fromPosition` лишається в `positions`, але більше не має admin-дітей.
- matrix/dotted лінії `from` **не** чіпаються (переносимо лише admin-дітей).
- Крайові: невідомий `from`/`to` → `InteractionError`; `to` є в піддереві `from` (включно з `to===from`
  якщо він власний нащадок) → цикл → `InteractionError`; `from` без дітей → валідний no-op (порожній patch).

### AC2 `deleteSubtree(positionId)`
- Видаляються: `positionId` + усі позиції її admin-піддерева (транзитивно по `fromId`).
- Видаляються всі reportLines будь-якого kind, де `fromId` **або** `toId` ∈ видалені.
- Видаляються persons, чий `personId` зустрічається **лише** на видалених позиціях.
- Крайові: невідомий `positionId` → `InteractionError`; листок (без дітей) → видаляється лише він
  (+його лінії/осиротіла людина).

### AC3 `transferChildOrgs(fromOrgId, toOrgId)`
- Усі орг з `parentOrgId=from` → `parentOrgId=to`. `fromOrg` лишається.
- Крайові: невідомий `from`/`to` → `InteractionError`; `to` є нащадком `from` (цикл org-дерева) →
  `InteractionError`; `from` без під-орг → no-op.

### AC4 `deleteOrgSubtree(orgId)`
- Видаляються: `orgId` + усі нащадкові орг (транзитивно по `parentOrgId`).
- Видаляються `departments` цих орг; `positions` цих орг; reportLines до/від цих позицій;
  persons, осиротілі лише цими позиціями; `orgLinks` де `fromOrgId`/`toOrgId` ∈ видалені.
- Крайові: невідомий `orgId` → `InteractionError`.

### AC-спільне
- **Атомарність:** вся валідація ДО будь-якої мутації; при `InteractionError` дані недоторкані.
- Чисті бібліотечні функції (pure, над `DiagramData`/зрізами) + async-методи-обгортки на
  `OrgHierarchyDiagram` (патерн `reparentPosition`: `commitDataChange` + patch, relayout автоматом).
- Нові публічні методи задокументовані в `docs/USAGE.md` (гейт `check:docs`).
- Тести перед кодом (success + failure), rstest; гейти tsc/oxlint/rstest/cargo зелені.

## Out of scope
- Undo/redo, персистентність, серверна синхронізація (хост сам).
- D&D-жест для цих операцій у канвасі (зараз — лише програмний API; жест — окремий слайс).
- Перенесення matrix/dotted-зв'язків при transfer (переносимо лише admin-дітей).
- Переміщення persons між посадами; редагування полів persons.
- Context-menu-пункти для цих дій (хост вирішує; `bulkContextMenuItems` — окремо).

## GATE 1 — рішення (owner, 2026-10-26)
- **OQ1 → ВІДМОВА.** `deleteSubtree`, якщо target `isHead`, → `InteractionError`. `deleteOrgSubtree`,
  якщо `orgId` не має `parentOrgId` (коренева орг), → `InteractionError`. Уточнення (plan): якщо в
  removal-set `deleteSubtree` трапляється `isHead`-посада org, яку **не** видаляють повністю, —
  теж відмова (не лишати org без голови).
- **OQ2 → ДОЗВОЛЕНО крос-орг** (як `reparentPosition` після T91). Валідація не вимагає спільної org.
- **OQ3 → ПІДСУМОК.** Кожен метод повертає `Promise<Summary>` з id/кількостями зміненого
  (точні форми — у plan.md). Не `void`.
- **OQ4 → ПРИБИРАТИ осиротілі groups** у `deleteOrgSubtree` (group, на який посилались лише
  видалені org/positions). За аналогією з осиротілими persons.
- **OQ5 → назви лишаються** `transferChildren` / `deleteSubtree` / `transferChildOrgs` /
  `deleteOrgSubtree` (veto можливий на GATE 2).

GATE 1 пройдено прямим Q&A по відкритих питаннях спеки (focused замість повного `grilling`:
великі форки зняті до спеки через AskUserQuestion). Вердикт спільного розуміння — owner.
