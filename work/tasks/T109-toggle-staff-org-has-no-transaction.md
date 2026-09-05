# T109 — `toggleStaffOrg` міняє стан і малює, не обіцяючи нічого й не відкочуючи

**Пріоритет:** P3 · **Статус:** 🔵 не почато
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

- [ ] Рендер, що впав, не лишає `staffExpandedOrgIds` розбіжним з екраном.
- [ ] Названо, чому обрано знімок або похідність — і чому не інше.
- [ ] Тест ламає рендер і перевіряє **обидві** гілки (розгорнути й згорнути) — одна на дві гілки
      вже одного разу пропустила зламану, див. [звіт T104](../reports/mutation-transaction/report.md) §6 п.3.

**Пов'язано:** [T104](./T104-mutations-are-not-one-transaction.md) (звідки взялось),
[звіт](../reports/mutation-transaction/report.md) §6 п.4.
