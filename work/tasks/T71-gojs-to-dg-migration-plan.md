# T71 — План міграції GoJS → Org Hierarchy SDK (`dg`)

**Пріоритет:** P0 (roadmap)  
**Статус:** ✅ cutover queue complete (2026-08-23) — залишок: T61 (макет), T67 Phase 2 (marquee, optional)
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
| [T64](./T64-named-display-zones-paint.md) | Іменовані зони (B8/B8a) — paint | **P0** | **Так** ✅ |
| [T66](./T66-position-expand-depth.md) | Expand посади + depth N (C2/C3) | **P0** | **Так** ✅ |
| [T70](./T70-position-card-chrome.md) | Chrome + **contain знака** (4231 №3) | **P0 Phase0** / P1 rest | Phase0–2 ✅ |
| [T63](./T63-spine-bus-edges.md) | Spine / шина org-matrix (B3) | P1 | Ні ✅ |
| [T68](./T68-org-period-display.md) | Період на організації (D4*) | P1 | Ні ✅ |
| [T69](./T69-node-double-click.md) | Dblclick → sidebar (D5) | P1 | Ні ✅ |

| [T65](./T65-multi-root-forest.md) | Detached placement (B9 🟡65) | P2 | **Ні** ✅ |
| [T67](./T67-multi-select.md) | Мультивибір (D2) | P2 | Ні ✅ Phase1 |
| [T61](./T61-group-recursion-tier3.md) | Рекурсія груп орг (B8c) | P3 | **Ні** (макет) |

Повний parity-текст: [PARITY-gojs-to-dg.md](./PARITY-gojs-to-dg.md).  
Залишкові угоди (T70p2 / T65 / T67 / T61): [T73](./T73-remaining-agreements.md).

Вже зроблено: T52–T55, T56 inventory. **G1** закрито через T55 (anchors), не `getTestID()`.

## Стратегія

```
T70 Phase0 (contain) + T64 + T66
  → T63 / T68 / T69 / T70 Phase1
  → T70 Phase2 → T67 Phase1 → T65 → T61 (макет)
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
