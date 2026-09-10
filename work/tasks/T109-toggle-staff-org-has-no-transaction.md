# T109 — `toggleStaffOrg` міняє стан і малює, не обіцяючи нічого й не відкочуючи

**Пріоритет:** P3 · **Статус:** ✅ закрито 2026-09-10 (`dfc75f1`) ·
**Звіт:** [`work/reports/toggle-transaction/report.md`](../reports/toggle-transaction/report.md)
**Підстава:** побічна знахідка [T104](./T104-mutations-are-not-one-transaction.md) — знайдено при
перегляді всіх шляхів, що змінюють стан перед рендером.

---

## Що не так

`toggleStaffOrg` (`OrgHierarchyDiagram.ts:1020-1027`) мутує `viewState.staffExpandedOrgIds` —
**мутабельний `Set`, змінюваний на місці** — і одразу малює:

```ts
if (this.viewState.staffExpandedOrgIds.has(orgId)) {
  this.viewState.staffExpandedOrgIds.delete(orgId);
} else {
  this.viewState.staffExpandedOrgIds.clear();
  this.viewState.staffExpandedOrgIds.add(orgId);
}
await this.render();
return this.viewState.staffExpandedOrgIds.has(orgId);
```

Ні `try`, ні відкоту. Якщо рендер падає, `Set` лишається зміненим, а екран показує попередній
стан — те саме розходження «дані ≠ кадр», яке T104 закрив для шести інших місць.

## Чому це **не** борг T104 і чому пріоритет низький

**Контракту T104 воно не порушує:** цей шлях не шле `onLayoutChange`, тож хосту нічого не
обіцяють і збрехати нема чим. T104 лікував **брехню колбека**; тут колбека немає.

Лишається лише внутрішнє розходження, і воно самовиправне: наступний успішний рендер намалює
той стан, який у `Set`. Тобто вікно неправди коротке, і назовні воно видиме тільки через
`getStaffExpandedOrgIds()`.

## На що спертись, коли візьмуться

Механізм уже є — **не винаходити наново**:

- `drawOrRestore(next)` (`OrgHierarchyDiagram.ts`) робить «намалюй або поверни як було» і вже
  відновлює похідні `Set` через `seedExpandedPositionsFromData()`;
- ⚠️ але `staffExpandedOrgIds` — **не** похідний від `this.data`, на відміну від
  `staffExpandedPositionIds`. Його не перевисієш із даних, тож потрібен або знімок самого `Set`,
  або зробити його похідним. **Це і є справжнє питання цієї задачі**, а не сам `try/catch`.

## Готово, коли

- [x] Рендер, що впав, не лишає `staffExpandedOrgIds` розбіжним з екраном.
      `toggleStaffOrgExpand` іде через `drawOrRestore`, а той відновлює сет із
      `lastDrawnStaffOrgIds`.
- [x] Названо, чому обрано знімок або похідність — і чому не інше. **Знімок**, бо похідність тут
      неможлива за побудовою: шлях не чіпає `this.data`, тож перевисівання відновило б нічого, а
      щоб було що відновлювати, розгорнутість довелося б писати в `DiagramOrganization` — публічний
      тип, який уже несе `collapsed` з іншим значенням. Деталі — §2 звіту.
- [x] Тест ламає рендер і перевіряє **обидві** гілки (розгорнути й згорнути) — одна на дві гілки
      вже одного разу пропустила зламану, див. [звіт T104](../reports/mutation-transaction/report.md) §6 п.3.
      Тут вони справді ламаються по-різному: розгортання давало `['c2']` при `['c1']` на екрані,
      згортання — `[]`. `packages/sdk/src/render/staffOrgExpand.interactions.test.ts`.

## Що лишилось поруч і **не** входило сюди

`focusStaffOrg` чистить той самий сет без відкоту й **додатково** рухає `staffCurrentOrgId`.
Закрити його тим самим механізмом не можна без відповіді на контрактне питання —
[T121](./T121-staff-focus-outruns-the-frame.md).

**Пов'язано:** [T104](./T104-mutations-are-not-one-transaction.md) (звідки взялось),
[звіт](../reports/mutation-transaction/report.md) §6 п.4.
