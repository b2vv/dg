# T64 — Іменовані зони відображення (paint) — B8 / B8a

**Пріоритет:** P0  
**Статус:** planned  
**Parity:** B8, B8a, B8b (частково)  
**Блокує:** cutover GoJS→`dg`, макет 4245 §3–4  
**Не плутати з:** вкладеною моделлю членства / GoJS `Group` / B8c (T61)

---

## Вимога (що бачить користувач)

**Іменована зона відображення посад** — область на полотні з:

- фоном / радіусом / рамкою (макет 4245: org block `#191F26` r12 stroke `#3D5067`; dept card `#242F3D` r8);
- **підписом** (назва організації / підрозділу), на макеті — 14px, часто праворуч;
- опційно **пунктирною рамкою** навколо сітки (B8a).

Це **не** відношення членства і не layout-механізм. На легасі GoJS зони часто виглядають легше (підпис + колонка) — мінімум паритету = підпис зони; ціль 4245 = повний chrome.

## Чому це не «вкладені контейнери SDK»

| Шар | Стан у `dg` |
|-----|-------------|
| **Зона розкладки** | ✅ `StaffTierBand`, локальна СК блоку (`orgBlockLayout`), offset ярусів — SPEC §2.2.1 |
| **Видимий chrome** | 🔴 `DiagramRenderer` читає `canvas.orgCards` (рядки ~679, ~733), **не** малює `canvas.tiers` |
| **Департамент** | 🟡 `DepartmentBlob` (органічний контур), не прямокутна картка з підписом |

GoJS дробив розкладку через `Group`, бо інакше не віддати підмножині окремий layout — це **§1 обхід**, у `dg` зникає.  
Робота T64 = **намалювати вже пораховане**, не вводити нову вкладеність моделі.

## Аргументація пріоритету P0

1. 4245 §3: «департаменти — СПРАВЖНІ КОНТЕЙНЕРИ з рамкою, фоном і підписом» — замовлений вигляд.
2. Без зон staff-діаграма виглядає «голим деревом карток» — найбільший візуальний розрив vs GoJS/макет.
3. Scope малий відносно ред. 1 parity («навчити вкладеності») — дешевше і розблоковує міграцію.

## Пропозиція імплементації

### 1. Org / tier band chrome

- У `DiagramRenderer` (staff path): для кожного `StaffTierBand` з `kind: 'staff-block'` намалювати `Graphics` rounded rect за `y/height` + ширина контенту блоку.
- Підпис: `organization.name` (або label з layout), align per theme/mockup.
- Config flag: `render.staffZoneChrome?: boolean` (default true для staff demos).

### 2. Department as rect alternative

- Опція поруч із blob: `render.departmentStyle: 'blob' | 'card'`.
- Card: AABB по `layoutCells` / member bounds + title `DiagramDepartment.name`.
- Blob лишається default для Variant B magnetism demos.

### 3. B8a dashed grid frame

- Обводка union bounds matrix/grid клітинок пунктиром (graphics lineStyle dash).

### 4. B8b

- Не блокер: hybrid head-above-reports уже частково з `reportLines`. Per-container policy — follow-up.

## Acceptance

- [ ] `StaffTierBand` видно як блок з фоном/рамкою/підписом на staff demo
- [ ] Режим dept `card` відповідає макету (колір/radius/підпис) або задокументований відхил
- [ ] Пунктир опційно навколо сітки
- [ ] Unit: band bounds → screen/world rect; snapshot-style assert на наявність zone layer
- [ ] E2E (опційно): `data-testid` зони або visual regression later

## Не входить

- Рекурсія груп організацій (T61)
- Per-container вибір `tree|grid` layout engine
- Заміна `orgBlockLayout`

## Verify

```bash
npm test && npm run typecheck
# Demo: staff-tree / Variant B — зони видимі; порівняти з макетом 4245
```

## Оцінка інвазивності

**Середня:** зміни переважно в `DiagramRenderer` + theme tokens; layout не чіпати. Ризик — подвійний paint з blob; вирішується режимом `departmentStyle`.
