# T116 — немає org-level drag-reparent: SDK не вміє переставити організацію під нового батька

**Пріоритет:** P1 · **Статус:** 🟡 spec + plan написані — [`work/reports/org-reparent/spec.md`](../reports/org-reparent/spec.md), [`plan.md`](../reports/org-reparent/plan.md)
**Джерело:** `work/reports/host-integration/org-diagram-parity.md` п.16 — знайдено при звірці
org-diagram GoJS-хоста (`cassiopeia-admin-ui`) з `@org-hierarchy/sdk`, 2026-09-06.

## 🔴 Поправка до заголовка цієї задачі (2026-09-06, після написання спеки)

Заголовок і текст нижче кажуть «немає org-level **drag**-reparent», злипаючи **дві різні
відсутності**. Читання коду під час написання спеки розчепило їх, і перевірено окремо:

1. **мутатора немає** — `grep parentOrgId` по `packages/sdk/src` дає лише **читачів**;
2. **жесту немає теж** — org-картка не перетягується **взагалі**. Єдиний drag у SDK це
   `onPersonDragEnd` (`render/personInteractions.ts:40,281`, `render/DiagramRenderer.ts:103`);
   `reorderOrg`/`placeOrgAtMatrixCell` — API-only, жоден жест у них не веде.

Тому обсяг поділено: **дані + API — цей цикл; жест — окрема задача.** Наслідок, який спека
просить не забути: звіт «D9 закрито» після цього циклу був би такою самою неправдою, якою
рядок D9 прожив до 2026-09-06 (див. поправку в [`PARITY-gojs-to-dg.md`](./PARITY-gojs-to-dg.md)).

**Питання кореня закрите доказом, а не гвардією:** ліс без кореня структурно неможливий
(скінченний граф, ≤1 батько на вузол, без циклів ⇒ безбатченко існує), тож cycle-guard **і є**
root-guard. Дірки T117 тут немає **за побудовою** — там корінь це прапорець `isHead`, який нічим
не боронений, а тут це відсутність поля. Доказ помирає, щойно з'явиться `isRootOrg` або друге
поле батьківства; спека тримає це як названу умову.

⚠️ **7 продуктових розвилок спека свідомо не закрила** — вони в її §Відкриті питання і
потребують рішення людини, не наступного агента.

## Що не так

Хост дає користувачу перетягнути картку організації на іншу — і вона стає підлеглою:
`org-hierarchy-canvas.view.tsx:109` (drag) + пункти меню «задати керівника»/«задати підлеглих»
(`build-org-hierarchy-menu-items.ts`), гейт `editScope === 'full' && hasRole('verificator')`
(`use-org-hierarchy-edit-actions.ts:129`). Це не крайовий випадок — це основна редагувальна дія
над org-деревом.

`@org-hierarchy/sdk` цієї дії **не має взагалі**. `LayoutPatch`
(`packages/sdk/src/callbacks.ts:6-25`) несе шість варіантів — `position-move`, `matrix-reorder`,
`matrix-cell`, `block-shift`, `position-expand`, `position-reparent` — і жоден не переносить
організацію під нового `parentOrgId`. `interaction/positionReparent.ts` (`checkReparent`,
`adminParentsOf`) існує **лише для посад**: воно ходить по `reportLines`/admin-manager, не по
`organizations[].parentOrgId`. Публічні org-мутатори на `OrgHierarchyDiagram`
(`expandOrg`/`collapseOrg`/`setOrgsCollapsed`/`collapseAllOrgs`/`reorderOrg`/
`placeOrgAtMatrixCell`) міняють видимість чи позицію в матриці, жоден не міняє `parentOrgId`.

## Чому це не «просто ще одна фіча»

`work/tasks/PARITY-gojs-to-dg.md` (живий довідник паритету, ред. 2.2) рядок **D9** каже:
«D&D reparent — ❓ мертвий у GoJS / ✅ 100% у dg» — тобто вважав цю дію мертвою у хоста й повністю
закритою в SDK. Обидві половини цього твердження спростовані читанням реального коду хоста
2026-09-06 (org-diagram-parity.md): дія **жива й активно використовується** в org-режимі
редагування, а в SDK її еквівалента немає **зовсім**, не «майже». Рядок D9 виправлено окремо.

## Що зробити

1. Новий варіант `LayoutPatch`: `{ type: 'org-reparent'; orgId: string; fromParentOrgId: string | null; toParentOrgId: string }`
   — за прецедентом форми `position-reparent` (несе і старого, і нового батька, щоб хост міг
   застосувати й відкотити без діффу).
2. `interaction/orgReparent.ts` — аналог `positionReparent.ts`: `checkReparent` по
   `organizations[].parentOrgId` замість `reportLines`, ті самі відмови (`self`/`cycle`/
   `unchanged`/`unknown`), **плюс** перевірка, що організація не стає власним предком
   (цикл в дереві org, а не лише в reportLines-графі).
3. Публічний мутатор на `OrgHierarchyDiagram`, за формою `reparentPosition(positionId, managerId)`
   — `reparentOrg(orgId, newParentOrgId)`.
4. `docs/USAGE.md` + `CHANGELOG` — новий метод і `LayoutPatch`-варіант вище порога пайплайна
   (`.claude/standards.md:118`), тож повний цикл `check:docs`.

## Готово, коли

- [ ] `reparentOrg` існує, застосовує зміну `parentOrgId` через `commitDataChange`, і
      `onLayoutChange` несе `org-reparent`-патч після намальованого кадру (T104-правило).
- [ ] Цикл (org стає предком самої себе) — відмова, `InteractionError`, дані не змінені.
- [ ] `docs/USAGE.md` описує метод і патч; `npm run check:docs` зелений.

## TDD

| Кейс | Тест |
|---|---|
| success | `reparentOrg` міняє `parentOrgId`, старий і новий батько коректні в патчі |
| success | піддерево організації рухається разом з нею (не губить дітей) |
| failure | цикл (org → власний нащадок) → відмова, дані байт у байт |
| failure | `orgId`/`newParentOrgId` невідомі → відмова |

## Межі

Не чіпає `matrix-reorder`/`matrix-cell` (це позиція в матриці одного рівня, не зміна батька) —
різні дії, різні патчі, як і в позиційній парі `position-move` vs `position-reparent`.
