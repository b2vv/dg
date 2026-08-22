# T69 — Double-click по вузлу → sidebar (D5)

**Пріоритет:** P1  
**Статус:** planned  
**Parity:** D5  
**Уточнення продукту:** double-click **мав би відкрити sidebar** (той самий drawer деталей, що й звичайний відкриття з D1)

---

## Вимога

| Жест | Очікування |
|------|------------|
| Click | select + `onNodeClick` → host може відкрити sidebar |
| **Double-click** | **відкрити sidebar** (явний намір «деталі») |

Зараз у `dg`: є `onNodeClick`, **немає** `onNodeDoubleClick` / розрізнення dblclick.

## Аргументація

1. Продукт підтвердив семантику (не «мертвий жест»).
2. Дешево: Pixi `pointertap` vs double-tap timer або native dblclick на view.
3. Host (React) підписує sidebar на новий callback — SDK не володіє drawer.

## Пропозиція

```ts
// callbacks.ts
onNodeDoubleClick?(node: NodeRef): void;
```

- У `DiagramRenderer` / node views: після другого click у ≤300ms (або platform dblclick) викликати callback **замість/після** другого `onNodeClick` (уникнути подвійного toggle expand).
- Політика: dblclick **не** має trigger expandOrg (якщо click уже expand на flat-orgs) — документувати; host вирішує.
- Unit: mock pointer sequence → `onNodeDoubleClick` called once.

## Acceptance

- [ ] API `onNodeDoubleClick` експортовано
- [ ] Demo: dblclick person/org → status «sidebar» / існуючий drawer hook
- [ ] Не ламає T52 chrome clicks (hit-test)
- [ ] E2E опційно: dispatch dblclick на test anchor

## Не входить

- Реалізація самого sidebar (host)
- Multi-select (T67)

## Verify

```bash
npm test
# Manual: dblclick card → host opens drawer
```
