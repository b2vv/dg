# T68 — Відображення періоду на організації (D4*)

**Пріоритет:** P1  
**Статус:** done  
**Parity:** D4 (переформульовано)  
**Уточнення продукту (2026-08-22):** кліку по ребру **немає**; потрібно **відображення періоду для організацій**.  
Старий формулювання «popover по лінії» — не scope цього тікета.

---

## Вимога

На картці / chrome **організації** показати період (напр. підпорядкування / дії структури):  
формат на кшталт «з DD.MM.YYYY по т.ч.» (як на посадах у GoJS-скрінах, але ціль — **org**).

Не плутати з:

- зеленим періодом **над посадою** (окремий chrome → T70);
- `onEdgeClick` / popover по лінії звітності — **не робити** в цьому тікеті.

## Стан у `dg`

- `DiagramOrganization` — `periodStart` / `periodEnd` / `periodLabel` ✅
- Org card — name / symbol / group / **period line** ✅

## Аргументація

1. Продукт явно: «D4 нема, але треба зробити відображення (для організацій)».
2. Дані мають прийти з BE/mapper — SDK лише модель + paint + опційний callback.
3. Малий тікет: поле + Text на `OrganizationNode` (LOD near/mid).

## Пропозиція

```ts
formatOrgPeriodLabel({ periodStart, periodEnd, periodLabel })
// periodLabel wins; else «з DD.MM.YYYY по т.ч.» / closed window
```

- Render: рядок під назвою (і group), `periodColor` theme (зелений).
- i18n: `periodLabel` з host виграє; інакше SDK uk «по т.ч.»

## Acceptance

- [x] Org з `periodStart` показує період на картці
- [x] Без періоду — layout картки без дірки (E2-сумісно)
- [x] Unit + visual на OrganizationNode
- [x] Demo fixture з 1–2 org з періодом (flat-orgs root + org-2)

## Не входить

- Клік по edge
- Період на position (T70, якщо ще немає)
- Редагування періоду в діаграмі

## Verify

```bash
npm test
# Demo: Flat orgs — org-1 «з 01.01.2024 по т.ч.»
```
