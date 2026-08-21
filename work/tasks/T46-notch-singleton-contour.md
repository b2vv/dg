# T46 — Variant B: singleton CEO wash fills IT notch (false “broken magnetism”)

**Пріоритет:** P0 (читабельність membership / notch)  
**Статус:** ✅ done  
**Джерело:** live QA https://b2vv.github.io/dg/ Variant B — «магнетизм / contour membership не працює»

---

## Вердикт QA

| Шар | Статус | Доказ |
|-----|--------|--------|
| **M1 membership** (`departmentId`) | ✅ | IT-центри всередині IT path; CEO поза IT (`variantBContourAlign`, live pad=1/smooth=1/magnet=8) |
| **G1/M4 magnetism** (`magnetRadius`) | ✅ | `magnet=8` → 1 IT component; `magnet=1.5` → 3 IT components |
| **WASM / Pages** | ✅ | `static/wasm/*.module.wasm` 200; status Ready; без console errors |
| **Візуальний notch** | ❌→✅ | Singleton **CEO** контур малювався тим самим blue wash і **заповнював** виїмку IT → виглядало як зламаний membership |

**Не плутати:** admin report arrows ≠ magnetism (див. T44/T45).

---

## Фікс

- `RenderConfig.minContourMembers` (default **1** = попередня поведінка).
- Paint + SVG: `filterContoursForPaint` — депти з `count < min` не малюються.
- Demo Variant B / Worker: `minContourMembers: 2` → CEO blob зникає, IT C-notch знову «порожній».
- Алгоритм contour (Rust) **не змінюється** — foreign CEO лишається для notch/G5/G6.

---

## Done when

- [x] Unit: `contourPaintFilter.test.ts`
- [x] Live-config: IT inside / CEO outside IT; painted depts = IT only when min=2
- [x] Demo Variant B config
- [x] SVG export parity filter
