# WIP — T109 `toggleStaffOrgExpand` без транзакції

**Сесія:** `dg-62` (друга сесія в репо) · **гілка:** `t109-toggle-transaction`
**Worktree:** `.claude/worktrees/t109`, база `dd2a095` (== `origin/main`)
**Смуга узгоджена** з сесією `New diagram for Cassiopeia`, яка веде T115 крок 2 у `main`.

Правило файлу: **append після кожного кроку**, не rewrite.

---

## ДАЛІ (перший запис)

1. Прочитати `20de078` — сусідня механіка, щоб не описати як баг те, що вже полагоджено. ✅
2. Прочитати T109 і код `OrgHierarchyDiagram.ts:1058` + `drawOrRestore` + `seedExpandedPositionsFromData`. ✅
3. Відповісти на **справжнє питання задачі**: знімок `Set` чи зробити `staffExpandedOrgIds` похідним.
4. Тест-перший: зламати рендер, перевірити **обидві** гілки (розгорнути й згорнути).
5. Реалізація, гейти, звіт.

## ФАКТ (крок 1) — що робить `20de078`

Стосується **рендер-шару**, не тогл-шляху: `DiagramRenderer.orgStaffCardOptions` дістав
`positionCount` і передає `hasStaff` у chrome; `OrganizationNode` не монтує chevron при
`hasStaff: false`. `toggleStaffOrgExpand` цей коміт **не чіпав**. Перетину з T109 немає,
крім того, що обидва про штатну сцену.

## ФАКТ (крок 2) — що саме зламано

`OrgHierarchyDiagram.ts:1058-1067`:

```ts
async toggleStaffOrgExpand(orgId: string): Promise<boolean> {
  if (this.viewState.staffExpandedOrgIds.has(orgId)) {
    this.viewState.staffExpandedOrgIds.delete(orgId);
  } else {
    this.viewState.staffExpandedOrgIds.clear();
    this.viewState.staffExpandedOrgIds.add(orgId);
  }
  await this.render();
  return this.viewState.staffExpandedOrgIds.has(orgId);
}
```

- `render()` замість `drawOrRestore()` — відкоту немає за побудовою;
- `drawOrRestore` відновлює `this.data` і **перевисіває** `staffExpandedPositionIds`
  через `seedExpandedPositionsFromData()` — але `staffExpandedOrgIds` не похідний від
  `this.data`, тож навіть виклик `drawOrRestore` сам по собі задачу **не** закриває;
- гілка «згорнути» втрачає лише один id; гілка «розгорнути» робить `clear()` — тобто
  падіння рендера тут стирає **чужий** розгорнутий id, а не тільки додає свій.
  Дві гілки псують стан по-різному — тест мусить бити в обидві.

## ІНФРА

- worktree створено з `HEAD` (`dd2a095`), `origin/main` там само;
- `npm install` у worktree — зелений (exit 0), тести можна ганяти незалежно від `main`;
- машину для повних прогонів оголошуємо вголос перед `npm test` / `npm run test:e2e`.
