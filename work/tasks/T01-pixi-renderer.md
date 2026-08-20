# T01 — Pixi renderer: OrganizationNode, PersonNode, DepartmentBlob

**Пріоритет:** P0 (критичний)  
**Статус:** in_progress  
**Оцінка складності:** висока (новий render layer + theme + LOD hooks)  
**Залежності:** contour bridge ✅, TD04

---

## TDD (обов'язково — перед кодом)

> Політика: [`work/TDD.md`](../TDD.md)

### Success tests
- [x] `create(container, config)` монтує canvas з non-zero розмірами
- [x] `DepartmentBlob.fromPath(VARIANT_B IT path)` створює Graphics з ≥8 corners
- [x] `PersonNode` рендерить ПІБ + title + badge при `isTemporary: true`
- [x] `OrganizationNode` перемикає symbol URL при `theme: 'dark'`

### Failure tests
- [x] `create(null, config)` → throw
- [x] `DepartmentBlob.fromPath('')` → empty Graphics, без throw
- [x] `destroy()` двічі → без leak / без throw
- [x] invalid `contour.path` (malformed SVG) → fallback, warn

---

## Мета

Реалізувати WebGL рендер через **Pixi.js** для трьох візуальних профілів, описаних у `docs/REQUIREMENTS.md` §4.5.

---

## Scope

### 1. Pixi bootstrap

**Файли (proposed):**

```
packages/sdk/src/render/
  Application.ts       — create/destroy Pixi Application
  Viewport.ts          — pan/zoom (pixi-viewport або custom)
  LayerManager.ts      — z-order: dept → edges → persons → orgs → overlay
  index.ts
```

**Вимоги:**

- `OrgHierarchyDiagram.create(container)` монтує `<canvas>` у host element
- ResizeObserver або `resizeTo: container`
- `destroy()` — повний teardown (TD04)

### 2. DepartmentBlob

**Вхід:** `DeptContourResult.path` (SVG) або `points[]`

**Реалізація:**

- Parse SVG path → Pixi `Graphics` або `@pixi/graphics-smooth`/custom path
- Fill + stroke з `DepartmentBlobStyle` (theme-aware)
- Label dept name на centroid contour або anchor point
- LOD: при zoom out — simplified polygon (менше points) + badge count

**Тест:** VARIANT_B — contour IT без лінії справа від CEO

### 3. PersonNode

**Поля UI:**

| Поле | Render |
|------|--------|
| ПІБ | Text (truncate) |
| Посада | Text secondary |
| Фото | Sprite rounded mask / Graphics circle clip |
| temp/permanent | Badge icon top-right |

**Layout:** vertical card, compact (~120×160 px baseline)

**Hit area:** Rectangle для click / context menu

### 4. OrganizationNode

**Поля UI:**

| Поле | Render |
|------|--------|
| Назва org | Text |
| Група | Text secondary |
| Емblem групи | Sprite |
| Symbol org | Sprite, **theme-aware** (`symbolUrlLight` / `symbolUrlDark`) |

**Layout:** horizontal card, інший border/radius ніж PersonNode

### 5. Theme

```ts
interface NodeTheme {
  organization: OrganizationNodeStyle;
  department: DepartmentBlobStyle;
  person: PersonNodeStyle;
}
```

- Prop `theme: 'light' | 'dark' | 'auto'` (matchMedia для auto)
- Стилі injectable для host override

---

## API changes

```ts
// packages/sdk/src/index.ts
OrgHierarchyDiagram.create(container, {
  data,
  mappers,
  theme: 'auto',
  styles?: Partial<NodeTheme>,
});
```

---

## Алгоритм render loop (staff mode)

```
1. positions → group by departmentId
2. computeAllContours(positions, config)  // WASM
3. for each contour:
     DepartmentBlob.update(path, style)
4. for each position:
     PersonNode at (col * cellW, row * cellH)
5. reportLines → Graphics edges (phase 2)
```

---

## Acceptance criteria

- [x] Canvas монтується в container через `create()`
- [x] VARIANT_B: IT contour + 6 person placeholders + CEO outside IT blob
- [x] OrganizationNode відмінний від PersonNode візуально
- [x] Theme switch light/dark змінює org symbol (`setTheme`)
- [x] `destroy()` не залишає listeners / WebGL context leak
- [ ] Typecheck + manual demo у T06

---

## Out of scope (цей task)

- D&D (T04)
- Search (T04)
- Export (T05)
- 2M LOD instancing (окремий sub-task після базового render)

---

## Референси

- `work/SPEC.md` §5, §6
- `packages/sdk/src/contour/bridge.ts` — `VARIANT_B_POSITIONS`
- `docs/REQUIREMENTS.md` §4.1–4.5
