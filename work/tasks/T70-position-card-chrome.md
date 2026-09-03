# T70 — Chrome карток + геометрія знака організації (E* / 4231)

**Пріоритет:** P1 (Phase 0 — **P0** через 4231 №3)  
**Статус:** Phase 0 + Phase 1 + Phase 2 done (agreed in T73)  
**Parity:** E1–E7, E10–E11 (§4 зображення)  
**Узгодження:** [T72](../archive/tasks-2026-09-02.md) · [T73](../archive/tasks-2026-09-02.md)  
**Джерело:** скріни GoJS, 4231, 4245, parity ред. 2.1

---

## Phase 0 (першим) — contain для знака org

### Вимога 4231 №3

Знак організації: **`ImageStretch.Uniform` / contain — ніколи не розтягувати**.

### Acceptance Phase 0

- [x] Sprite зберігає aspect ratio текстури (fit inside max box) — `fitContain` / T72
- [x] Unit: wide 400×200 texture → width/height ≠ square unless source is square
- [x] Far LOD: contain у ≤36px box

---

## Phase 1 — режими коробки org (E1 / E2 / E3 / E10)

| Режим | Коробка | Коли |
|-------|---------|------|
| З підписом | SYMBOL_W × SYMBOL_H | `showShortName !== false` |
| Без підпису | FULL_W × FULL_H | знак займає місце рядка назви |
| Full-bleed | NODE_W × NODE_H, padding 0 | intrinsic display-canvas ~400×200 |

- [x] `DiagramOrganization.showShortName?`, `fullName?`
- [x] Немає символу → текст `fullName`/`name`, не ромб-placeholder (E3)
- [x] E2: measurement test — розмір вузла з/без підпису (сітка, не контент)
- [x] Опційно: детект intrinsic з декодованої texture (як `recordSymbolCanvas`)

**Phase 1 note:** `resolveOrgSymbolLayout` + `OrganizationNode` box modes; demo `flatOrgs` org-3 `showShortName: false`, org-4 missing symbol + `fullName`. Card AABB fixed (E2).

---

## Phase 2 — chrome посад / org (скріни)

| # | Елемент | Дія |
|---|---------|-----|
| E4 | Годинник тимчасової на **org** | badge + scale з символом |
| E5 | `N [M]` | поля counts + paint |
| E6 | unit-code | поле + caption |
| E7 | «(вакансія)», чип періоду на посаді | copy + chip (окремо від T68 org period) |
| E11 | Prefetch light+dark | **opt-in** `render.prefetchInactiveOrgSymbol` + URL allowlist in `loadNodeTexture` |

- [x] `org.isTemporary` → top-right **T** badge (PersonNode-style; near/mid)
- [x] `filledCount`/`vacantCount` → `N [M]` badge when either count defined
- [x] `unitCode` caption row (truncate; omit if empty)
- [x] Vacant position name → `(вакансія)`; period chip via `formatOrgPeriodLabel` (not T68 org line)
- [x] E11: prefetch inactive light/dark symbol URL — **opt-in** (`prefetchInactiveOrgSymbol`); `loadNodeTexture` blocks `http:` / private hosts

Promote (E9) — лише near/selection; сітка потребує Pixi мінімум.

### Phase 2 agreement (field → paint)

Types already additive in `packages/sdk/src/data/types.ts` (T72). Implement paint only:

| # | Source field | Paint target |
|---|--------------|--------------|
| E4 | `org.isTemporary` | Org card top-right temp badge (default: same **T** style as PersonNode; clock icon OK if design prefers) |
| E5 | `org.filledCount`, `org.vacantCount` | Org badge ``N [M]`` when ≥1 count present |
| E6 | `org.unitCode` | Org caption row (truncate) |
| E7 | `position.status === 'vacant'` | Name slot → `(вакансія)` (not bare `—`) |
| E7 | `position.periodStart/End/Label` | Position period chip (shared formatter w/ T68; **not** org period line) |
| E11 | `symbolUrlLight` + `symbolUrlDark` | Prefetch inactive theme URL **only when** `render.prefetchInactiveOrgSymbol`; media URLs filtered by `isAllowedNodeMediaUrl` |

**Out of Phase 2:** T65 detached placement; marquee; layout AABB changes; BE rename of E5 counts.

Defaults / soft product Qs → [T73](../archive/tasks-2026-09-02.md).

---

## Аргументація

1. Phase 0 — пряма заборона замовника; один метод `showSymbol`.
2. Транспорт/тема вже ✅ — не переписувати loader (E11 = cache fill only).
3. Person avatars у `dg` уже кращі (ініціали + LOD) — не чіпати без потреби.
4. Phase 2 — дані вже в моделі; бракує paint.

## Не входить

- T64 zone paint, T66 expand hit-areas (координація окремо)
- Заміна Pixi на DOM images
- T65 side-zone layout

## Verify

```bash
npm test
# Visual: org symbol 2:1 PNG not squashed; vacancy + badge on staff demo
```
