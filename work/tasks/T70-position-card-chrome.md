# T70 — Chrome карток + геометрія знака організації (E* / 4231)

**Пріоритет:** P1 (Phase 0 — **P0** через 4231 №3)  
**Статус:** planned  
**Parity:** E1–E7, E10–E11 (§4 зображення)  
**Джерело:** скріни GoJS, 4231, 4245, parity ред. 2.1

---

## Phase 0 (першим) — contain для знака org

### Вимога 4231 №3

Знак організації: **`ImageStretch.Uniform` / contain — ніколи не розтягувати**.

### Баг у `dg` (підтверджено)

```213:224:packages/sdk/src/render/OrganizationNode.ts
  private showSymbol(texture: Texture, style: OrganizationNodeStyle, lod: LodLevel): void {
    const size =
      lod === 'far' ? Math.min(style.symbolSize, 36) : style.symbolSize;
    // ...
    this.symbolSprite.width = size;
    this.symbolSprite.height = size; // квадрат — аспект ігнорується
  }
```

### Acceptance Phase 0

- [ ] Sprite зберігає aspect ratio текстури (fit inside max box)
- [ ] Unit: wide 400×200 texture → width/height ≠ square unless source is square
- [ ] Far LOD: contain у ≤36px box

---

## Phase 1 — режими коробки org (E1 / E2 / E3 / E10)

| Режим | Коробка | Коли |
|-------|---------|------|
| З підписом | SYMBOL_W × SYMBOL_H | `showShortName !== false` |
| Без підпису | FULL_W × FULL_H | знак займає місце рядка назви |
| Full-bleed | NODE_W × NODE_H, padding 0 | intrinsic display-canvas ~400×200 |

- [ ] `DiagramOrganization.showShortName?`, `fullName?`
- [ ] Немає символу → текст `fullName`/`name`, не ромб-placeholder (E3)
- [ ] E2: measurement test — розмір вузла з/без підпису (сітка, не контент)
- [ ] Опційно: детект intrinsic з декодованої texture (як `recordSymbolCanvas`)

---

## Phase 2 — chrome посад / org (скріни)

| # | Елемент | Дія |
|---|---------|-----|
| E4 | Годинник тимчасової на **org** | badge + scale з символом |
| E5 | `N [M]` | поля counts + paint |
| E6 | unit-code | поле + caption |
| E7 | «(вакансія)», чип періоду на посаді | copy + chip (окремо від T68 org period) |
| E11 | Prefetch light+dark | optional preload другої URL при mount |

Promote (E9) — лише near/selection; сітка потребує Pixi мінімум.

---

## Аргументація

1. Phase 0 — пряма заборона замовника; один метод `showSymbol`.
2. Транспорт/тема вже ✅ — не переписувати loader.
3. Person avatars у `dg` уже кращі (ініціали + LOD) — не чіпати без потреби.

## Не входить

- T64 zone paint, T66 expand hit-areas (координація окремо)
- Заміна Pixi на DOM images

## Verify

```bash
npm test
# Visual: org symbol 2:1 PNG not squashed; vacancy + badge on staff demo
```
