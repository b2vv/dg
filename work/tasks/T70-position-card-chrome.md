# T70 — Chrome карток посад (паритет зі скрінів GoJS)

**Пріоритет:** P1  
**Статус:** planned  
**Parity:** E1–E7 (частково E9 promote)  
**Джерело:** скріни GoJS staff + тікети 4231 / 4245

---

## Вимога (що видно на проді)

| # | Елемент | `dg` зараз |
|---|---------|------------|
| E1 | `showShortName:false` → лише знак, крупно | 🟡 фіксований профіль org |
| E2 | Розмір вузла стабільний з підписом і без | ❓ виміряти |
| E3 | Org без знака → `fullName`, не placeholder | 🔴 |
| E4 | Годинник «тимчасова» на org (+ розмір) | 🟡 є на PersonNode `isTemporary` |
| E5 | Бейдж `N [M]` (діти / нащадки) | 🔴 на скрінах є (`1 [1]`, `10 [10]`) |
| E6 | Unit-code під знаком | 🔴 поля нема |
| E7 | Вакансія «(вакансія)», чип періоду, detached cue | 🟡 status/photo; пунктир/чип — слабо |

Скріни підтвердили: помаранчеве ім’я filled, зелена крапка + період над посадою, vacancy без фото, badge внизу.

## Аргументація

1. Щоденний UI штатки — без E5/E7 міграція «виглядає чужою» навіть при правильному layout.
2. Promote (E9) закриває **near/selection**, не всю сітку → потрібен **мінімальний Pixi chrome**.
3. E2 — спочатку measurement test; якщо вже OK — закрити без коду.

## Пропозиція (мінімальний пакет v1)

### Data

```ts
DiagramPosition: {
  childCount?: number;
  descendantCount?: number;
  periodStart?: string;
  periodEnd?: string | null;
  unitCode?: string; // or on org
}
DiagramOrganization: {
  showShortName?: boolean;
  fullName?: string; // fallback when no symbol
}
```

### Render (`PersonNode` / `OrganizationNode`)

1. Vacancy: `(вакансія)` + empty photo slot.
2. Period chip над карткою (як на скріні) — окремо від T68 (org).
3. Badge `N [M]` bottom — якщо counts з mapper.
4. Name color token для filled vs vacant.
5. Org: no-symbol → text `fullName`/`name`; optional emblem-only mode (E1).

### Стратегія vs promote

| LOD | Chrome |
|-----|--------|
| far | крапка/аватар мінімум |
| mid | name + title |
| near | повний chip/badge **або** promote HTML |

## Acceptance

- [ ] Fixture зі скрін-подібними картками (vacancy, period, badge)
- [ ] E2 measurement test documented pass/fail
- [ ] Unit на PersonNode variants
- [ ] Demo staff показує badge + vacancy copy

## Не входить

- Повний HTML editor у картці
- T64 zone paint
- T66 expand (окремий expander chrome — координація, щоб не накладались hit areas)

## Verify

```bash
npm test
# Visual compare demo vs GoJS screenshots (staff cards)
```
