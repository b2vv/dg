# T128 — порівняння алгоритмів побудови ліній: мокап (еталон) ↔ наш Rust-порт

**dg33.** Запит власника: передивитись мокап, скласти схему алгоритму мокапу, скласти схему нашого,
порівняти. Мета — перед рішенням по S5 бачити ПОВНУ карту паритету, не лише один симптом.

Еталон: `/Users/strelia/Downloads/mock2/shps-links.js` (third-party → переказ, не цитата).
Наш порт: `packages/core/src/staff_router.rs` (+ `staff_routes.rs` detour, ще чинний).

---

## 1. Схема МОКАПУ — `route(L)` (:103-159)

```
layout(L)  →  cards{id,x,y,w,h}, depts{id,x1,y1,x2,y2,head}, W, H, LV, BV
   │
   ▼
[A] КЛАСИФІКАЦІЯ ребер (:107-112)
   ├─ для КОЖНОЇ посади c з ПЕРВИННИМ батьком c.p:
   │     kind = int   (m.dept == c.dept)           → e.by = m.bottom + LV/2   → DET (елбоу)
   │          | ext-block (m dept-less, block-parent) → e.by = m.bottom + BV/2 → DET (елбоу)
   │          | cross | ext (решта)                 → AST (A*)
   └─ для КОЖНОЇ посади c з ВТОРИННИМ батьком c.p2:  → AST, sec:1  (:112)   ← secondary / dual-sub
   │
   ▼
[B] DET-ребра → простий елбоу (:113):  [mx,m.bottom] → [mx,by] → [tx,by] → [tx,ty]
   │     tx,ty = tgt(c)  (НЕ sec)
   ▼
[C] GRID (:114-123) — статична розріджена сітка
   │   wx = [0,W] + cards(x±pad) + frames(x1,x2,x1±14,x1+12,x2-12)
   │   wy = [0,H] + cards(y±pad) + frames(y1,y2,y1+38,y2±14,y2-12,y1-14)
   │   wall(X,wx); wall(Y,wy)  (coords + midpoint + ±lane у gap≥2)
   │   X.add(cx); X.add(cx+SX)   ← ОБИДВА порти: центр І вторинний (+28)   (:118)
   │   Y.add(c.y); Y.add(c.y+h); Y.add(dept.y1); Y.add(det.by)
   │   mH/mV (Uint8) = blocked якщо ребро ріже padded-картку (hit, строга)
   ▼
[D] OCCUPANCY (:124-129):  occ{nH,nV,eH,eV};  det.forEach(add)  ← елбоу зайнято ПЕРШИМИ
   ▼
[E] AST-сортування (:156):  sort by (sec ?? 0, cards[m].y, cards[m].x)   ← вторинні ОСТАННІ
   ▼
[F] AST-маршрутизація (:157):  для кожного ast-ребра у порядку: e.pts = astar(e); add(e)
   │     astar(e) (:130-155): start = m.bottom-center; target = tgt(c, e.sec)
   │        └ e.sec → порт [cx+SX, cy]  (вхід ЗМІЩЕНИЙ, не колінеарний первинному)
   │        3-стан (node×dir), turn 30, deptOK(role A/B), occupancy-ваги 6000/4000/.15,
   │        вхід у ціль ЛИШЕ вертикаллю згори, 250k → best-effort (fail=1)
   ▼
[G] RIP-UP (:158):  ≤4 проходи: stats(all).bad → re-route bad ast (rem→astar→add), reverse на непарних
   ▼
[H] stats(all) (:162-172):  cross/over/card/near/dept + bad-множина (для rip-up)
```

Ключ до S5: вторинний батько (`c.p2`) → `sec:1` → порт `cx+SX`. Два ребра в одну ціль заходять у
РІЗНІ колонки (cx та cx+28) → НЕ накладаються.

---

## 2. Схема НАШОГО порту (Rust, станом на T5 / коміт d3878d5)

```
(layout/geom — існуюче)  →  EdgeRect cards, FrameRect frames, StaffNodeGeo
   │
   ▼
[A] КЛАСИФІКАЦІЯ:  ❌ НЕМА (T7 ще не роблено). У пробі/гейті — ВСІ ребра йдуть як AST.
   │                 secondary (p2/sec) концепту НЕМА — модель даних плоский список StaffEdge.
   ▼
[B] DET-елбоу:  ❌ НЕМА окремо (detour staff_routes.rs ще має елбоу-білдери, але не в A*-шляху)
   ▼
[C] GRID — `build_corridor_grid` (staff_router.rs:343, T3)  ✅ ПАРИТЕТ, КРІМ:
   │   wall/mH/mV/координати рамок — відповідають :114-123.
   │   ❗ X.add(cx) Є; X.add(cx+SX) — ❌ ВИКИНУТО (N2, T4).  ← корінь S5
   ▼
[D] OCCUPANCY — `Occupancy`+`occupy` (T5)  ✅ ПАРИТЕТ (ключі, fo/ow). det-occupy-first ❌ (нема det).
   ▼
[E] СОРТ — `route_edges` sort (start.y, start.x, idx)  ⚠️ БЕЗ sec-ключа (бо secondary нема).
   ▼
[F] AST — `astar_route` (T4) + `route_edges` driver (T5)  ✅ ПАРИТЕТ, КРІМ:
   │   start=m.bottom-center ✅; target=tgt — ⚠️ лише card-top-center; deptTop ❌, sec+SX ❌.
   │   3-стан/turn30/deptOK/occupancy-ваги/вертик.вхід/250k best-effort — ✅.
   ▼
[G] RIP-UP:  ❌ НЕМА (T6, цей крок).
   ▼
[H] ДЕТЕКТОР — `route_stats` (T1)  ✅ (5 метрик), АЛЕ bad-множина ❌ (лише лічильники) — rip-up потребує.
```

---

## 3. Таблиця розбіжностей

| # | Стадія | Мокап | Наш порт | Наслідок | Де закрити |
|---|--------|-------|----------|----------|-----------|
| D1 | Класифікація int→елбоу | int/ext-block → DET (елбоу), решта → A* | все → A* | коректність OK (виміряно 8/9 чисті), але A* на простих деревах = перф + візуал | **T7** (перф) |
| D2 | **Вторинний порт (sec/SX)** | `c.p2`→ast `sec:1`, порт `cx+SX`; grid має лінію `cx+SX` | ❌ немає secondary-концепту, ні `cx+SX`-лінії | **S5 over=1** (два ребра в gc колінеарні на cx) | **рішення власника** |
| D3 | deptTop-порт голови | tgt голови → верх рамки (dept.y1) | card-top-center | 9 схем чисті (head_id:None), але РЕАЛЬНИЙ хост потребує | T8 (wiring) |
| D4 | det-occupy-first | елбоу зайнято перед A* | немає det | tied D1; A* не уникає елбоу-шин | T7 |
| D5 | **rip-up** | ≤4 проходи re-route | ❌ | жорсткі сцени лишаться брудні (9 схем чисті single-pass крім S5) | **T6 (зараз)** |
| D6 | bad-множина детектора | stats повертає bad (для rip-up) | route_stats лише лічильники | rip-up нема чим керувати | **T6 (зараз)** |
| D7 | сорт sec-ключ | (sec, mgr.y, mgr.x) | (start.y, start.x, idx) | мінор, tied D2 | T6/T7 |

**Паритет підтверджено** на: grid (C), occupancy (D), A*-ядро (F-core), детектор-метрики (H).
**Реальні дірки:** D5+D6 = суть T6 (rip-up + bad). D2 = блокер S5 (рішення власника). D1+D4 = T7 (перф). D3 = T8.

---

## 4. S5 у світлі порівняння

Емпірика (проба route_edges single-pass по 9 схемах, dg33):
`S1-S4,S6-S9 = 0/0/0/0/0; S5 = over=1`. Тобто **єдина розбіжність коректності на 9 канон-схемах — D2**.

У мокапі S5 чистий, бо `gc` має ВТОРИННОГО батька `m` (bypass) → ребро `m→gc` = `sec:1` → порт
`cx+SX` → заходить правіше за `sib→gc` (який на `cx`). Наш плоский StaffEdge не розрізняє первинне
`sib→gc` і вторинне `m→gc`, обидва → `cx` → накладання.

**Отже S5 — не баг A*, а відсутня стадія [A]-secondary + [C]-порт `cx+SX` + [F]-tgt(sec).** Це
структурний елемент еталону, який я передчасно зарахував в out-of-scope (N2). rip-up (D5) і T7 (D1)
його НЕ закривають — підтверджено і критиком, і виміром.

### Варіанти (на рішення власника)
- **(b) SX secondary-port — паритет еталону.** Ввести «вторинне ребро» = друге адмін-ребро в ту саму
  ціль (детектується з плоского списку: ціль має >1 вхідне адмін-ребро → не-первинне стає sec).
  Повернути `cx+SX` у grid (C), `tgt(sec)` у F. Детектор лишається строгим. Un-scope p2 частково.
- **(a) shared-target exemption у детекторі.** Дешево, але слабшає acceptance-гейт (дві лінії візуально
  стекаються в картку — а гейт 0).
- **(c) переглянути дані S5** — трактувати `m→gc` окремо (dotted) або прибрати. Міняє канон-схему.

**Рекомендація:** (b) — єдиний варіант, що зберігає строгий детектор І відтворює поведінку еталону;
решта або ховають дефект, або міняють acceptance-набір. Але це розширює скоуп (grid+tgt+класифікація
secondary), тому — рішення власника.
