# T38 — Variant B contour vs tree: live visual audit + fix plan

**Пріоритет:** P0 (stroke крізь картки + читабельність дерева) → P1 (smooth / notch / tongues) → P2 (z-order / вага stroke)  
**Статус:** plan  
**Джерело:** візуальний аудит Variant B після T34–T37 (2026-08-21)  
**Не плутати:** T37 виправив *довжину* report edges (коридор gap); цей план — *контур ріже ноди*, *шум blob*, *слабке дерево*.

---

## Мета

На Variant B (staff + department contour) має читатися **два шари**:

1. **Контур** = membership / «хто в якому департаменті» (м’який fill, stroke **обходить** AABB).  
2. **Report edges** = ієрархія parent→child (чіткі порти, помітний stroke, опційно стрілки).

Зараз контур виглядає як товстий синій «канал» / декоративна стрічка; дерево майже не читається.

---

## Мапа коду

| Шар | Файли |
|-----|--------|
| Contour G1–G8 | `packages/core/src/contour.rs` (`compute_dept_contour`, notch, G6, Chaikin) |
| Pitch / gaps | `contourWorldTransform.ts`, `VARIANT_B_*_GAP` (T37) |
| Paint blob | `DepartmentBlob.ts` — fill + centered stroke |
| Report edges | `staffEdgeGeometry.ts` → `StaffEdgesView.ts` (без arrowheads) |
| Z-order | `LayerManager`: departments → edges → orgs → persons → overlay |
| Demo defaults | Variant B: `paddingCells=1`, `smoothIterations=2`, `magnetRadius=8` |

**Спека:** G7 у REQUIREMENTS = padding від own bbox; у Rust зараз лише integer `padding_cells` на flood bbox — не px-snap до карток.

---

## Фаза A — P0: контур не ріже ноди + дерево читається

### A1. Stroke / path крізь interior карток

| | |
|--|--|
| **Проблема** | Горизонталі/вертикалі контуру перетинають картки («Ігор», нижній ярус). |
| **Чому** | Perimeter на **кутах grid-cell**; картки ≈ cell (T32). Chaikin (`smooth=2`) тягне кути **всередину** AABB. Pixi stroke центрований → половина лінії в картці. |
| **Рішення** | 1) Регресія: жоден сегмент контуру (після smooth) не перетинає card AABB (з eps = ½ stroke). 2) Outward-only smooth **або** inflate orthogonal ring на ≥½ stroke + card radius **перед** Chaikin. 3) Опційно: fill під картками, stroke з punch-out поза AABB. |
| **Файли** | `contour.rs` (chaikin / post-offset), `DepartmentBlob.ts`, новий `variantBContourClearance.test.ts` |
| **Done when** | Скрін: stroke обходить «Ігор» і P5/P6; тест green на live-геометрії. |

### A2. Report edges як справжнє дерево (порти / контраст / стрілки)

| | |
|--|--|
| **Проблема** | Ієрархія = «head in the notch»; тонкі slate лінії губляться на синьому blob. Немає портів/стрілок. |
| **Чому** | `StaffEdgesView`: admin 2px `#64748b`, без markers. Контур домінує візуально (fill α 0.42 + stroke 1.25). |
| **Рішення** | Темніший/товстіший admin stroke (+ halo); стрілка на child-порту; endpoints строго mid-edge. Контур тихіший (див. C1). |
| **Файли** | `StaffEdgesView.ts`, `staffEdgeGeometry.ts`, theme tokens |
| **Done when** | На 6 нодах видно P4→P2→P1/P3 і P4→P5/P6 без легенди. |

### A3. «Сирітські» сегменти vs справжні edges

| | |
|--|--|
| **Проблема** | Тонкі H/V між ярусами і вертикальні «хвости» виглядають відірваними. |
| **Чому** | Часто це **стінки контуру** (padding у порожні клітинки + C-bridge), не report lines. Elbow mid-сегменти edges у коридорі плутають додатково. |
| **Рішення** | Після A1/A2: prune empty tongues (B2); edges контрастніші. Не малювати contour stroke там, де він читається як «звʼязок». |
| **Done when** | Користувач не плутає contour wall із parent→child. |

---

## Фаза B — P1: геометрія контуру (smooth, notch, tongues, padding)

### B1. Faceted Smooth=2 / шви на стиках

| | |
|--|--|
| **Проблема** | U-повороти з коротких хорд, подвійні обводки на кутах. |
| **Чому** | Classic Chaikin на глибокому C-path; Pixi `lineTo` + centered stroke. |
| **Рішення** | Fillet / quadratic на кутах з R ≈ card `borderRadius`; або 1 Chaikin + round joins; не покладатися на Chaikin як «macaroni» у notch. |
| **Файли** | `contour.rs` chaikin / новий fillet pass; `DepartmentBlob` stroke join |

### B2. Порожні U-петлі / «язики» без нод

| | |
|--|--|
| **Проблема** | Великі порожні криві ліворуч/праворуч — марнування простору. |
| **Чому** | Demo `paddingCells=1` розширює flood у vacant cells; pitch gaps (T37) розтягують lobes. |
| **Рішення** | World/px padding лише навколо own AABB (справжній G7); не pad vacant, окрім необхідних bridge-клітинок C-arms; морфологічний peel порожніх листків. |
| **Файли** | `contour.rs` padding / flood; demo defaults після фіксу алгоритму |

### B3. Notch не «сидить» на картці

| | |
|--|--|
| **Проблема** | Нерівномірні зазори; квадратний notch vs rounded cards; stroke то торкається, то наїжджає. |
| **Чому** | Notch cell-aligned (`prefer_notch` / G6), не card AABB + radius 10. |
| **Рішення** | Offset notch walls до outer card AABB (+ pad px); fillet кутів notch під картки; G6 mouth без привʼязки строго до grid line. |
| **Файли** | `contour.rs` notch/G6; clearance test з A1 |

### B4. Нерівномірний padding уздовж контуру (G7)

| | |
|--|--|
| **Проблема** | То inset 2px, то майже повна padded cell. |
| **Чому** | G7 у коді = uniform cell padding на bbox, не per-AABB envelope. |
| **Рішення** | Реалізувати G7 як рівномірний px offset від own boxes після pitch map; вирівняти inset **перед** smooth. |
| **Done when** | Візуально стабільний «повітряний» зазор навколо всіх own карток. |

---

## Фаза C — P2: шари й вага chrome

### C1. Вага contour stroke конкурує з контентом

| | |
|--|--|
| **Рішення** | Stroke ~0.75–1 **або** fill-only grouping; сильний stroke лише hover/selection. Admin edges залишаються домінантним «деревом». |
| **Файли** | `types.ts` department theme; dark theme |

### C2. Нестабільний z-order (під / над карткою)

| | |
|--|--|
| **Проблема** | Контур то зникає під opaque card, то видно в gap поруч із тінню — відчуття «плаває». |
| **Чому** | Layers стабільні (dept < edges < persons); нестабільний *вигляд* через occlusion + card shadow (T36). |
| **Рішення** | Fill завжди під persons; stroke або (a) clipped outside AABB у dept layer, або (b) окремий stroke pass після persons з punch-out. Не покладатися на under-card occlusion як «frame». |
| **Файли** | `LayerManager` / `DiagramRenderer`, `DepartmentBlob`, можливо mask |

### C3. Дрібне: центрування report lines

| | |
|--|--|
| **Рішення** | Assert mid-edge ports; після A2 контраст достатній — окремий polish лише якщо лишаються off-center elbows. |

---

## Порядок імплементації

```text
1. A1  Contour clearance / no stroke-through cards   ← перший PR
2. A2  Stronger tree edges (+ arrows)                ← той самий або одразу після
3. A3  Verify orphans gone (may need B2)
4. B4 + B2  Real G7 px padding + prune tongues
5. B1  Smooth / fillet quality
6. B3  Notch sits on card
7. C1–C2  Quieter contour + consistent stroke layer
8. C3  Port polish if needed
```

Кожен крок — маленький PR з TDD (success + failure) + скрін Variant B до/після на Pages.

---

## Звʼязок із T33–T37

| Task | Що зробило | Що лишилось (цей план) |
|------|------------|-------------------------|
| T34 | IT C-arms, CEO outside | Chaikin всередину AABB; empty padding lobes |
| T35 | padding=1, smooth=2 defaults | Посилило #4/#5/#6/#8 |
| T36 | тіні, товщі картки | Посилило відчуття z-order (#7) |
| T37 | edge corridor gaps | Довші edges; tongues розтягнулись |

---

## Регресійний чекліст

- [ ] Жоден контурний сегмент не перетинає card AABB (eps ≥ ½ stroke)  
- [ ] P1–P3, P5–P6 ∈ IT fill; P4 ∉ IT fill (зберегти T34)  
- [ ] Видно admin tree P4→… без плутанини з contour walls  
- [ ] Smooth≥1: без faceted double-stroke швів на U-поворотах  
- [ ] Немає великих порожніх tongues без нод (окрім мінімального C-bridge)  
- [ ] Notch: рівномірний зазор навколо CEO; stroke не кліпає radius  
- [ ] Contour fill під картками; stroke не «стрибає» поверх тіні  

---

## Поза скоупом

- Повна відмова від department contour на Variant B  
- Зміна layout-ноти (перестановка grid) без окремої задачі  
- Marketing landing / brand-first redesign демо
