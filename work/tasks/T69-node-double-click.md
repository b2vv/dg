# T69 — Double-click по вузлу → sidebar (D5)

**Пріоритет:** P1  
**Статус:** planned  
**Parity:** D5  
**Уточнення:** double-click **мав би відкрити sidebar**

---

## Вимога

| Жест | Очікування |
|------|------------|
| Click | select + `onNodeClick` (host → sidebar optional) |
| **Double-click** | **відкрити sidebar** |

## Важливо (обидва світи)

У **GoJS-проді** рушій емітить `nodeDoubleClick`, але **жоден контролер не підписаний** — другий «мертвий провід» (дзеркало до `reparent`).  
Тобто D5 можна частково закрити **сьогодні одним рядком підписки в host**, без міграції.  
У `dg` все одно потрібен публічний callback для strangler.

## Стан у `dg`

Є `onNodeClick`, **немає** `onNodeDoubleClick`.

## Пропозиція

```ts
onNodeDoubleClick?(node: NodeRef): void;
```

- Double-tap ≤300ms або native dblclick на node view.
- Не тригерити expand на тому ж жесті (політика + тести).
- Demo: status / drawer hook.

## Acceptance

- [ ] API експортовано
- [ ] Unit: sequence → один `onNodeDoubleClick`
- [ ] Не ламає T52 chrome hit-test
- [ ] Документація: host повинен підписатись (урок мертвого проводу GoJS)

## Verify

```bash
npm test
# Manual: dblclick → sidebar
```
