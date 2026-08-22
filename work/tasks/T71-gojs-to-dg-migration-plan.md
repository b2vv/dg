# T71 — План міграції GoJS → Org Hierarchy SDK (`dg`)

**Пріоритет:** P0 (roadmap)  
**Статус:** planned  
**Контекст:** прод на GoJS (`gojs-diagram` ~4.4k + ~11k тестів) → ціль заміни = цей репозиторій (`b2vv/dg`)

---

## Мета

Замінити GoJS на `@org-hierarchy/sdk` без втрати **замовлених** можливостей.  
Не мігрувати GoJS-обхідні шляхи (§1). Не обирати React Flow / yFiles / X6 як engine.

## Метод (лінзи parity)

1. **Механізм ≠ вимога** — обходи GoJS зникають (§1).
2. **Зона розкладки ≠ видимий chrome** — layout у `dg` часто вже є; бракує paint.
3. **«Немає в dg» ≠ «втратимо»** — якщо немає і в GoJS-проді → нова фіча, не міграційний ризик.
4. Питати **«що зобов’язані показати користувачу»**, потім міряти API `dg`.

## Scorecard (орієнтир)

| | |
|--|--|
| ✅ покрито | ~24 вимог |
| 🟡 частково | ~8 |
| 🔴 міграційні | ~6–8 |
| 🔴 нова фіча (не cutover) | B8c → T61 |

## Черга задач

| ID | Тема | Пріоритет | Блокує cutover? |
|----|------|-----------|-----------------|
| [T64](./T64-named-display-zones-paint.md) | Іменовані зони (B8/B8a) — paint | **P0** | **Так** |
| [T66](./T66-position-expand-depth.md) | Expand посади + depth N (C2/C3) | **P0** | **Так** |
| [T63](./T63-spine-bus-edges.md) | Spine / шина org-matrix (B3) | P1 | Ні (org-matrix) |
| [T65](./T65-multi-root-forest.md) | Ліс / непідвʼязані (B9) | P1 | Частково (модалка) |
| [T68](./T68-org-period-display.md) | Період на організації (D4*) | P1 | Ні |
| [T69](./T69-node-double-click.md) | Dblclick → sidebar (D5) | P1 | Ні (UX) |
| [T70](./T70-position-card-chrome.md) | Chrome посад зі скрінів (E*) | P1 | Візуальний паритет |
| [T67](./T67-multi-select.md) | Мультивибір (D2) | P2 | Ні (наступні задачі) |
| [T61](./T61-group-recursion-tier3.md) | Рекурсія груп орг (B8c) | P3 | **Ні** |

Вже зроблено (не в цій черзі): T52 chrome/menu, T53 viewport, T54 e2e, T55 testId, T56 inventory.

## §1 — не мігрувати

`formMatrix` / structural group links / lazy `addChildren` / GoJS select hacks / `pendingReveal` / single nodeTemplate bindings.

## Стратегія

```
T64 + T66 (P0)
  → adapter modules/org-hierarchy|positions → OrgHierarchyDiagram
  → T63 / T65 / T68 / T69 / T70
  → T67 коли настане черга продукту
  → T61 коли буде макет рекурсії
  → видалити gojs-diagram
```

## Що не робити

- Міграція на React Flow + elkjs як заміна `dg`
- Копіювання GoJS Group-as-layout
- Рахувати watermark порталу як GoJS license signal

## Verify (програма)

```bash
npm test && npm run typecheck && npm run test:e2e
# + manual QA staff demo vs GoJS screenshots
```
