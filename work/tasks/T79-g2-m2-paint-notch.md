# T79 — G2 / M2 на paint-шляху (foreign ніколи не під заливкою)

**Пріоритет:** P1 · **Статус:** ✅ done (2026-08-25)  
**Вимога продукту:** «G2/M2 бери в роботу» — контур відділу мусить обходити чужі картки, а не накривати їх.  
**Пов'язано:** [T77-M01](./T77-M01-contour-wire-or-delete.md) (Option B), `docs/REQUIREMENTS.md` §4.6.1, `work/SPEC.md` §4.6

---

## Що було

`contourButtonGroup` малював padded union AABB компоненти. Чужа картка всередині цього AABB
опинялась **під заливкою** — пряме порушення M2 («foreign pos ніколи не входить у fill polygon»)
і G2 («contour огинає foreign bbox з gap ≥ corridorMin»). У коді це було зафіксовано як свідомий
скіп T78-L8: «revisit only if product wants the notch».

## Рішення

Option B із T77-M01 **лишається**: renderer не робить WASM round-trip. Натомість G2/M2 рахуються
синхронно у world-space у новому `render/contourNotch.ts`:

1. `frame` = padded AABB компоненти (як і раніше).
2. Кожна чужа картка, що перетинає frame, роздувається на **corridor** (G2) — зараз це той самий
   margin, який контур тримає від власних карток.
3. `notchRect` продовжує виріз до найближчого краю frame — прямокутна виїмка, не діра (G5).
   Порядок сторін `right → down → left → up` повторює far-side пріоритет із Rust (G6);
   коридор, що ріже власну картку, береться лише якщо іншого виходу немає.
4. `subtractRects` віднімає вирізи від frame через координатну компресію + обхід межі:
   якщо виріз розтинає компоненту — повертається кілька кілець.
5. Кільця філетяться тим самим радіусом, що й button-group.

Foreign для компоненти = **усі інші картки**, включно з картками того ж відділу з іншої
магнітної компоненти (M1/M4).

## Межі (що НЕ зроблено)

- Cell-space flood із Rust лишається референсом для export/tests; TS-шлях — його world-space
  еквівалент, не побітова копія. G7 (padding snap) і повний G6 (far-side wall) не портовані.
- Чужа картка без `departmentId` не входить у `memberBoxesByDept`, тож у виріз не потрапляє.
- Дірка (foreign, оточений власними картками з усіх боків) не малюється як hole — коридор
  ріжеться найкоротшим шляхом, навіть якщо він зачіпає власну картку.

## Демо

Таб **Staff · Magnetic**: seat «Service lead» (відділ Supply service) стоїть у клітині `(2,0)`,
всередині bbox командного відділу — командний контур обходить його виїмкою.

## Verify

```bash
npm test        # render/contourNotch.test.ts — G2 gap, M2, split, corridor order
npm run typecheck
npm run dev     # Staff · Magnetic → виїмка у правому верхньому куті командного контуру
```
