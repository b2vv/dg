# T68 — Відображення періоду на організації (D4*)

**Пріоритет:** P1  
**Статус:** planned  
**Parity:** D4 (переформульовано)  
**Уточнення продукту:** кліку по ребру **немає**; потрібно **відображення періоду для організацій**

---

## Вимога

На картці / chrome **організації** показати період (напр. підпорядкування / дії структури):  
формат на кшталт «з DD.MM.YYYY по т.ч.» (як на посадах у GoJS-скрінах, але ціль — **org**).

Не плутати з:

- зеленим періодом **над посадою** (окремий chrome → T70);
- `onEdgeClick` / popover по лінії звітності — **не робити** в цьому тікеті.

## Стан у `dg`

- `DiagramOrganization` — немає полів періоду.
- `DiagramReportLine` — лише `{fromId,toId,kind}`, без meta.
- Org card — name / symbol / group caption / chrome expand.

## Аргументація

1. Продукт явно: «D4 нема, але треба зробити відображення (для організацій)».
2. Дані мають прийти з BE/mapper — SDK лише модель + paint + опційний callback.
3. Малий тікет: поле + Text на `OrganizationNode` (LOD near/mid).

## Пропозиція

```ts
interface DiagramOrganization {
  // ...
  /** Inclusive start of org validity / subordination window */
  periodStart?: string; // ISO date
  periodEnd?: string | null; // null = «по т.ч.»
  periodLabel?: string; // optional preformatted from mapper
}
```

- Render: рядок над/під назвою, колір theme (зелений як у легасі посад — токен).
- Mapper: зібрати з API org DTO.
- i18n label «по т.ч.» — через `periodLabel` з host або SDK uk default.

## Acceptance

- [ ] Org з `periodStart` показує період на картці
- [ ] Без періоду — layout картки без дірки (E2-сумісно)
- [ ] Unit + visual на OrganizationNode
- [ ] Demo fixture з 1–2 org з періодом

## Не входить

- Клік по edge
- Період на position (T70, якщо ще немає)
- Редагування періоду в діаграмі

## Verify

```bash
npm test
# Demo: org card shows «з … по т.ч.»
```
