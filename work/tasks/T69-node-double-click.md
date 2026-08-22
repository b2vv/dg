# T69 — Double-click по вузлу → sidebar (D5)

**Пріоритет:** P1  
**Статус:** done  
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

- `onNodeDoubleClick?(node: NodeRef)` уже в `packages/sdk/src/callbacks.ts`
- DiagramRenderer: double-tap ≤300ms на body person/org → `onOrgDoubleClick` / `onPersonDoubleClick`
- Chrome hit-test (T52) перший; той самий жест **не** тригерить expand/collapse
- Demo підписаний: status `dblclick org:… · host opens sidebar`

## Acceptance

- [x] API експортовано (`onNodeDoubleClick` у callbacks + emission)
- [x] Unit: sequence → один `onNodeDoubleClick`
- [x] Не ламає T52 chrome hit-test
- [x] Документація: host повинен підписатись (урок мертвого проводу GoJS)

## Verify

```bash
npm test --workspace=@org-hierarchy/sdk
# Manual: dblclick → status «host opens sidebar»
```
