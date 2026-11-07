# 1b — matrix/headless coverage on the tidy path (scope + plan) — dg41

**Статус:** scope/plan draft. **Код НЕ почато** — T126-гейт: «код не запускати до явного го власника + spec-flow».
**Мета (власник 1b, 2026-11-07):** спершу покрити matrix/headless сцени на tidy-движку, ТОДІ enable tidy default +
видалити legacy (чотири removal-гейти в `staffLiveGeometry.ts:211-213`).

## Що таке matrix/headless сцена (research)
`isGenuineTreeScene` (`staffLiveGeometry.ts:144`): сцена = **matrix**, коли позиції мають авторські координати
(`positionHasCoords`/`gridCell`) І **не** несуть ієрархії (жодного `isHead`, жодного admin-reportLine між місцями).
Роль таких місць = `matrix` (drag = **move** до комірки), не `tree` (drag = re-parent). Сьогодні обслуговує лише
`computeViaTs` → `layoutStaffCanvas` (matrix-гілка). FORK2 вже ламала це (tree-only Rust → «cannot resolve staff
head» на matrix-фікстурах) — регрес задокументовано (`:181`).

## Чому tidy їх не покриває (виміряно)
`staff_tidy_layout` — **повністю hierarchy-driven tree**: нема поняття авторських координат/`gridCell`/matrix-ролі.
Вхід `StaffPositionInput` (`crate::types`) не має координат; вихід `StaffTidyNode` = лише id/x/y/w/h (без ролі).
На headless-matrix сцені tidy або впаде (нема голови), або розкладе як tree (ламає drag-контракт matrix).

## Обсяг покриття (scope)
1. **Вхідний контракт** (`crate::types::StaffPositionInput`): додати авторські координати/`gridCell` (опційні).
   Адитивно (tree-сцени їх не мають → поведінка незмінна).
2. **Движок** (`staff_tidy_layout`): matrix-placement шлях — коли сцена headless-matrix (є координати, нема
   ієрархії), класти місця за авторськими координатами (grid), БЕЗ tree-layout. Детермінантність/§10 для matrix
   (ймовірно 0 admin-ребер → роутинг тривіальний або декоративний).
3. **SDK** (`staffLiveGeometry.ts`): маршрутизувати matrix/headless на tidy (замість `computeViaTs`); adapt виходу
   (matrix-роль seats). Зберегти scene-shape routing, доки обидва не на tidy.
4. **Gates removal (після покриття):** golden-rebaseline (matrix фікстури на tidy), cassiopeia-координація,
   enable tidy default, тоді видалити `computeViaTs`/`computeViaRust`/legacy Rust-модулі одним кроком.

## Ризики / відкрите
- **R1:** matrix-роль (drag=move) — чи вона в контракті виходу tidy, чи лишається SDK-деривацією? Вихід
  `StaffTidyNode` ролі не має; якщо SDK виводить роль зі scene-shape — движок ролі не повертає (менша зміна).
- **R2:** великий обсяг під T126-мандат (одна система координат у Rust) → spec-flow (GATE 1 spec/acceptance,
  GATE 2 critique+defense), не lightweight.
- **R3:** golden-rebaseline matrix-сцен — скільки їх, чи всі на tidy дадуть коректний matrix-вихід (drag-контракт).
- **R4:** headless (нема голови) — tidy мусить не падати; потрібен no-head шлях.

## Пропонований наступний крок
Це **substantial feature під spec-flow + T126 owner-go**. Перш ніж код:
- (a) owner **«го»** на spec-flow цикл для 1b (T126-гейт вимагає явного go), і
- (b) рішення R1 (matrix-роль: контракт движка чи SDK-деривація) — визначає розмір контрактної зміни.
Далі: spec/acceptance → plan → critique+defense (GATE 2) → TDD → review → golden-rebaseline → enable+remove.
