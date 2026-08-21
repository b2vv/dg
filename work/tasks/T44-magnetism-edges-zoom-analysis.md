# T44 — Аналіз ескіза магнетизму vs звʼязки при зумі

**Пріоритет:** P0 (читабельність edges при zoom/LOD)  
**Статус:** analysis  
**Джерело:** ескізи користувача (far dots + near cards), Variant B  
**Не плутати:** **магнетизм контуру** ≠ **admin report edges**

---

## 1. Що показує ескіз (два шари)

```text
Far (точки)                         Near (картки)
┌─────────────────────────┐         Олена ──╳── Тарас ──╳── Марія
│  ●    ●    ●   ← фіолет.│              ↑ «плавають» у коридорі
│      група IT top       │
│         ↑               │              Ігор (T)
│         ●  ← CEO        │               │ ╳ ╳  вертикаль «рве»
│        / \              │            ┌──┴──┐
│       ●   ●  ← bottom   │         Наталя  Сергій
└─────────────────────────┘
   синій wash = IT contour
```

| Маркер на ескізі | Що це | Система в коді |
|------------------|--------|----------------|
| Фіолетові рамки навколо груп точок | Очікувані **магнітні групи** (хто в одному dept-blob) | `magnetRadius` → cluster own cells → contour |
| Синій wash / IT | Membership департаменту | Contour G1–G7 (T38–T43) |
| Сірі лінії + стрілки | **Report lines** parent→child | `reportLines` → `staffEdgeGeometry` → `StaffEdgesView` |
| Червоні хвилі / стрілки | «Тут звʼязок не прилипає / криво при зумі» | Edge ports vs visual card |

Демо вже каже: *blue wash = department · arrow lines = reports*.

### Приклад Variant B (дані)

```text
P2 Тарас ←── P4 Ігор (CEO)
 ├──→ P1 Олена
 └──→ P3 Марія
P4 ──→ P5 Наталя
P4 ──→ P6 Сергій
```

Магнетизм: P1–P3 + P5–P6 = **IT** (один blob з notch під CEO).  
Ребра: лише `admin` пари вище — **не** магнетизм.

---

## 2. Вердикт

**Магнетизм контуру працює** (IT wash, notch навколо Ігора, групи на far збігаються з ескізом).

**Звʼязки «не до кінця»** — це переважно:

1. **P0:** при zoom/LOD порти ребер рахуються по **повній** layout-AABB картки, а малюється **зменшений** chrome (mid/far) → лінія «відліпає» від видимої фігури.  
2. **P0/P1 (сприйняття):** на near навмисні коридори T37 (~28×32 px) — сегмент виглядає «підвішеним» між картками, хоча кінці на border AABB.  
3. **P1:** `shortenPolylineForArrow` відтягує stroke ~6 px від child-порта (наконечник має сісти на край).

Камера одна: `Viewport` масштабує весь `layers.root` (edges + persons) — **немає** окремого zoom для ребер.

---

## 3. Приклад бага LOD (чому при зумі «їде»)

```text
Layout AABB (завжди для edges):     Visual mid (~48% height):
┌─────────────────┐                 ┌─────────────────┐
│                 │                 │   картка mid    │
│                 │                 └─────────────────┘
│      картка     │                         ║
│                 │                         ║  ← ребро все ще
│                 │                         ║    від низу AABB
└────────●────────┘  port = низ AABB        ●
         ▲
    admin edge dock
```

| LOD | Що видно | Куди стикується ребро зараз | Артефакт |
|-----|----------|-----------------------------|----------|
| **near** | повна картка 136×156 | border AABB | коридор T37 ≈28–32 px («плаває» між картками) |
| **mid** | картка ~75 px висоти (top-aligned) | низ/верх **повної** 156 px | хвости в порожнечі під/над chrome |
| **far** | точка ~Ø49 у центрі | краї повної AABB | лінія далеко від обода точки |

Код:

- Edge boxes = `canvas.positionNodes` (`DiagramRenderer.renderStaff`) — повні `n.width/n.height`.  
- Visual = `PersonNode.drawCard(lod)` — mid height / far circle.  
- Zoom → `resolveLodLevel` → re-render нод **без** перерахунку edge boxes під visual.

---

## 4. Магнетизм — що ескіз підтверджує (OK)

| Очікування з ескізу | Статус |
|---------------------|--------|
| Верхня трійка в одній магнітній групі | ✅ IT cluster |
| CEO окремо в notch | ✅ foreign + G5/G6 |
| Нижня пара в тому ж IT blob | ✅ C-arms (T34) + G7 (T43) |
| Contour ≠ дерево стрілок | ✅ розділені шари |

Торк `magnetRadius` / flood **не** потрібен, доки QA контуру окремо не впаде.

---

## 5. План фіксів

### A1 — P0: LOD-aware edge boxes

Спільний helper `visualStaffEdgeBox(layoutBox, lod)`:

- **near** — layout AABB  
- **mid** — `{ height: midH }`, top-aligned як `PersonNode`  
- **far** — box навколо dot (center ± r) або порти на колі

Підключити в `DiagramRenderer.renderStaff` + SVG export.

**Done when:** mid/far порти на видимому краї; near Variant B clearance тести зелені.

### A2 — P0/P1: near «підвішені» сегменти

- Залишити T37 коридори (читабельність).  
- Полір: end-markers / не скорочувати дуже короткі сегменти; caption що gap навмисний.  
- Опційно: трохи менший visual inset без повернення до 4px stubs.

### A3 — P1: стрілка flush до border

`shortenPolylineForArrow`: tip на порт; не shorten якщо last chord ≪ 2× arrow.

### A4 — P1: один visual AABB

Hit-test / selection / edges / promote — один helper, щоб LOD знову не розʼїхався.

---

## 6. Порядок імплементації

```text
1. A1  LOD-aware edge ports     ← перший PR
2. A3  Arrow flush
3. A2  Near corridor messaging / polish
4. A4  Shared visual AABB
```

---

## 7. Регресії

- [ ] Near: P4→P2/P5/P6 і P2→P1/P3 стикуються до border карток  
- [ ] Mid/far: порти на mid-card / dot, без «хвостів» у порожнечі  
- [ ] Zoom across LOD bands: edges не стрибають відносно chrome  
- [ ] Contour: IT centers in, CEO out (T34/T43)  
- [ ] SVG parity з canvas ports  

---

## Поза скоупом

- Зміна `magnetRadius` / notch як «фікс звʼязків»  
- Відмова від department contour  
- Повна зміна Variant B grid
