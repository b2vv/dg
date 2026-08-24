# Критика `dg` — повторний огляд після T77

**Базис:** `b2vv/dg@9352d52` (`main` після #59/#60/#61).
**Метод:** чотири агенти з різними лінзами (AI-slop, дірки в логіці, зайва складність,
непокриті edge cases), кожен читав код незалежно. Нижче — дедупліковане зведення.
**Статус:** усі чотири огляди завершені.
**Попередній цикл:** [CRITIQUE-dg_907f.md](./CRITIQUE-dg_907f.md) → [T77](../tasks/T77-critique-remediation.md) (M01–M11 ✅, #57–#61).
**Remediation:** [T78](../tasks/T78-post-t77-critique.md)

T77 закрив аварії (worker/PixiHost/drag grab-offset, hanging `parentOrgId`, dishonest PNG stub,
fillet invert, typed promote keys, NaN layout metrics). Цей прохід питає: **що лишилось або з’явилось після фіксів.**

Усі чотири лінзи зійшлися на одному патерні: **M01 Option B не дочищена** — canvas малює TS button-group, а Rust flood, worker, SVG-grid і Variant B тести лишились другим продуктом.

## Scorecard (2026-08-24, post-T78 P1)

| ID | Статус | Де |
|----|--------|-----|
| C1 computeContours then ignore | ✅ T78 P1 | canvas hot path no longer builds IncrementalContourComputer |
| C2 flat/grid paint без member boxes | ✅ T78 | grid path будує `contourMemberBoxesByDept` |
| C3 SVG grid ≠ canvas contour | ✅ T78 | SVG grid → `paintMagneticGroups` |
| L1 staff drag origin з першого gridCell | ✅ T78 | per-card `snapGrid` на pointerdown |
| L2 hybrid floating siblings в одну точку | ✅ T78 | sibling index + floater-vs-floater eject |
| L3 row-tree ліс: другий корінь зникає | ✅ T78 | `findExpandedRootIds` + side-by-side forest |
| L4 export SVG без infer ≠ canvas | ✅ T78 | `inferStaffCurrentOrgId` у export + svg |
| L5 vacant seat click no-op | ✅ T78 P1 | vacant tap → `positionNodeRef` |
| L6 drag preview AABB не їде з карткою | ✅ T78 P1 | `offsetMemberBoxesForGridMove` |
| L7 `placeOrgAtMatrixCell` eject / `inMatrix ?? false` | ✅ T78 P1 | preserve inMatrix; OOB/same-cell no-op |
| L8 AABB blob ковтає чужі картки | ✅ T78 P1 documented skip | union AABB; G5–G7 notch not on canvas |
| L9 PNG без Pixi = порожній «успіх» | ✅ T78 | `ExportError` як PDF |
| T1 `node-compare` e2e без `expect` | ✅ T78 P1 | `expect(node).toBeVisible` + file size |
| T2 `expandIdsForDepth` cycle = `Array.isArray` | ✅ T78 P1 | cycle expects `['a','root']` |
| T3 Variant B тести охороняють мертвий Rust path | ✅ T78 | `variantBMagnetRadius` → cluster/paint |
| T4 `magnetRadius: NaN` → JS splinter / Rust `f32::MAX` | ✅ T78 | `resolveMagnetRadius` + Rust reject |

T77 P0 (A3–A13, fillet, NFC, hanging parent, NaN **layout** metrics, typed promote) — **перевірені як закриті**, не повторюються.

---

## 1. AI-slop — Option B не дочищена

### C1. WASM-контур досі збирається і ігнорується

`index.ts:719` на кожному `renderNow` робить `getContourComputer()` і передає
`computeContours` у `render`. `paintContours` робить `void options.computeContours`
і малює TS button-group. Incremental computer, `configureContourWorker` і
`invalidate()` живуть на hot path заради значення, яке ніхто не читає.
M01 свідомо обрав Option B, але **wiring не видалили**.

### C2. Flat/grid шлях малює контури без card boxes

Staff-гілка будує `contourMemberBoxesByDept` і передає їх у `paintContours`.
Після `return` staff-блоку (`:1073`) fallback викликає `paintContours` **без**
boxes. `polishContourRing([])` → `[]` → canvas без dept-wash для non-staff grid
(Variant B без успішного `currentOrgId`).

### C3. SVG dual path

Staff SVG → `paintMagneticGroups` (TS). Гілка «positions + gridCell, без staff
focus» (`svgExport.ts:327`) → `computeAllContours` (Rust L/C/Chaikin) і сирий
`c.path`. Canvas і SVG більше не один алгоритм.

Тести `variantBMagnetRadius` / `variantBTonguePad` / `variantBRectRow` /
`variantBContourAlign` / demo `variantB.test.ts` асертять Rust compute —
зелений CI охороняє мертвий pipeline (**T3**). Єдиний тест, що чіпає живий
paint, — `variantBNotchPaint.test.ts` (`paintMagneticGroups`).

Дрібніше (P2): `previewGen` інкрементується і ніколи не читається;
`has_cycle` під `#[allow(dead_code)]`; `extractSubtree` / `orgsToSingleRootTree`
без in-package споживачів; `nudgeContourClearOfBoxes` / `DepartmentBlobView.fromPath`
немає production call sites; `pngFallbackBlob` лишився після M07;
`department.layoutCells` / `department.contour` ніколи не пишуться.

---

## 2. Дірки в логіці

### L1. Один origin на всі staff-яруси

`resolveContourWorldTransform` бере **перший** вузол із `gridCell` і з нього
рахує `origin` (inset з **його** width/height). Managing tier і current-org staff
можуть мати той самий `gridCell:{0,0}` у різних світових Y. `renderStaff`
кладе цей origin у `dragGrid` (`:866-880`). Snap іншого ярусу → хибна клітинка
→ `onPersonDragEnd` персистить її.

Контур-фарба тепер з world AABB; ця дірка б’є **drag**, не blob.

### L2. Hybrid floating: діти одного anchor’а в одній точці

`orgBlockLayout.ts:347-355`: кожен floating, що репортує на anchor, отримує
`x = parent.x + (w−fw)/2`, `y = parent.y + h + gap` — без зсуву по сиблінгах.
Фінальний eject розсовує лише з **anchors**, не між floaters.
Два підлеглих без `gridCell` повністю перекриваються; онук (parent не anchor)
лишається на WASM/side-pack координатах і відривається від лінії.

### L3. Ліс організацій: один expanded root

`findExpandedRootId` сортує expanded за глибиною і повертає **один** id.
`computeOrgLayout` (`rowTreeLayout.ts:104`) малює лише його гілку.
Два розкриті корені → другий ліс зникає з полотна без помилки.
T65 (multi-root forest) не підключений до цього вибору.

### L4. Export SVG ≠ те, що на канвасі

Renderer: `options.staff?.currentOrgId ?? inferStaffCurrentOrgId(data)` —
навіть без `setStaffFocus` canvas зі `positions.length > 0` іде в `renderStaff`.
Infer при ≥2 орг бере `orgIds[0]` / єдиний head (`:1323-1329`).

`OrgHierarchyDiagram.export` передає лише `viewState.staffCurrentOrgId`.
`buildDiagramSvg`: `multiOrgUnfocused` → **org hierarchy без посад**.
≥2 орг + positions без фокусу: екран — staff org A, SVG — матриця всіх орг.
Тест `export.test.ts:254-289` **закріплює** цю розбіжність
(`not.toContain('data-position=')`).

### L9. PNG без Pixi — blank success (PDF уже кидає)

`exportDiagram.ts:50-65`: `ctx.app` null → `fillRect` 800×**hardcoded 600**,
потім `canvasToPngBlob`. PDF у тому ж файлі кидає `ExportError`.
M10 закрив dishonest PDF/placeholder; PNG лишився тихим «успіхом».

### L5–L8 (P1)

- Vacant position: `stopPropagation` потім `if (!personId) return` — картка не
  селектиться; context menu працює (`personId ?? ''`).
- Drag preview патчить `session.inputs` col/row; кільця лишаються зі старих
  `memberBoxesByDept` AABB.
- `placeOrgAtMatrixCell`: OOB no-op усе одно шле `onLayoutChange`; eject
  порівнює з нефloor координатами; placed org пише `inMatrix: org.inMatrix ?? false`
  (undefined member → foreign).
- Canvas blob = padded union AABB кластера (G5–G7/notch не на фарбі) —
  чужі картки в «вирізі» візуально всередині wash.

---

## 3. Зайва складність

Найдорожче — **два контури** (Rust flood ~1204 LOC + worker/incremental vs
TS button-group) плюс мертвий compute wiring. SVG staff = B, SVG grid = A.

Далі, не двадцять багів, а шари, які T65/T76/M01 лишили другим SoT:

| Два шари | Живе | Проблема |
|----------|------|----------|
| Rust contour vs `paintMagneticGroups` | TS canvas | P0 dual product |
| `nudgeContourClearOfBoxes` + `mapContourPointsToWorld` | AABB rings | P1 orphan polish |
| TS + Rust `validateOrgHierarchy` | обидва на row-tree | двічі на виклик |
| `position.expanded` XOR `staffExpandedPositionIds` | OR + sync | drift |
| `gridCell` / `layoutX,Y` / `layoutCoords` | усі три | triple «де картка» |
| T76 stores vs фасад | SelectionStore так; DataStore bag | методи без call sites |
| `buildPaintRingsByDept` vs `paintMagneticGroups` | обидва | drift canvas/SVG |

`testAnchors` у конфігу не читається. WASM Ploeg для org/staff layout — **живий**,
його не чіпати разом з contour-delete.

---

## 4. Тести, що не можуть впасти / lock-in

### T3. Variant B suite асертить WASM, не canvas

Align / rect-row / tongue / padding / magnet-radius — `computeAllContours`.
Реальний failure (button-group hat, злиті IT-blobs, padding на `polishContourRing`)
CI не ловить. `variantBPaddingPaint` назва: «Rust path area stays unchanged»;
тіло: `expect(paths0).not.toEqual(paths2)`.
`variantBContourStrokeDiag` вимагає Chaikin-кільце **врізається** в картки.

### T4. `magnetRadius` NaN — протилежна поведінка TS vs Rust

Paint: `config.magnetRadius ?? 1.5` — `??` **не** замінює `NaN`.
JS cluster: `manhattan <= NaN` завжди false → **один blob на картку**.
Rust `:599-603`: non-finite → `f32::MAX` → **один mega-blob**.
Layout metrics після M10 reject `NaN`; magnet — ні. Немає failure-тесту.

### T1 / T2

`e2e/node-compare.spec.ts` — генератор галереї, **жодного `expect`**.
`expandIdsForDepth(..., Infinity)` на циклі `root↔a`: лише
`expect(Array.isArray(ids)).toBe(true)`. Порожній масив і `['root']` — зелені.
Ациклічний Infinity-тест поруч — справжній.

Дрібніше: worker-bridge асертить мок `'M … Z'`; self-parent org (`parentOrgId === id`)
немає окремого кейсу (є лише a↔b); Rust `OrgTreeError::Empty` vs TS `validate([])`
мовчки OK; `e2e/variant-b.spec.ts` не перевіряє контур.

---

## 5. Що я перевірив особисто

Не з чужих слів: `void options.computeContours` (`:596`); flat `paintContours`
без boxes (`:1073`); SVG `else if (gridCell)` → `computeAllContours` (`:327`);
`resolveContourWorldTransform` early-return на першому `gridCell`; hybrid map
ставить усіх floating під одним parent у ту саму `(x,y)`; `findExpandedRootId`
повертає один id і `computeOrgLayout` його єдиний споживає; export бере
`viewState.staffCurrentOrgId`, renderer — `inferStaffCurrentOrgId`; vacant
`if (!personId) return`; PNG `fillRect` при `app: null`; PDF throw у тому ж
файлі; `positionExpand.test.ts:190` лише `Array.isArray`; `node-compare.spec.ts`
без expect; `magnet_radius` non-finite → `f32::MAX`; `inMatrix ?? false`.

T77 досі тримається: hanging parent кидає в TS+Rust; A12 subtree нулить parent
поза payload (`rowTreeLayout.ts:toOrgFlatInput`); fillet `r·tan(φ/2)`;
typed `kind:id` promote; NFC fold; `isOrgCollapsed`.

**Розбіжність між оглядами.** Один лінз поставив T1/T2 як P0, інший як P1.
Правіші P1: `node-compare` у назві generator, cycle-тест хоч гарантує «не hang».
Variant B suite + `export.test.ts:254` + magnet NaN — P0, бо зелений CI
**забороняє** правильну поведінку або не бачить її.

---

## 6. Порядок фіксу (T78)

1. **P0 pixels/layout:** C2 member boxes на grid path; L1 per-tier origin;
   L2 sibling offset для hybrid floating; L3 forest (усі expanded roots).
2. **P0 canvas=export:** L4 той самий org id (зняти lock у `export.test.ts:254`);
   C3 SVG grid = `paintMagneticGroups`; L9 PNG без Pixi → `ExportError` як PDF.
3. **P0 test honesty:** T3 Variant B тести на `paintMagneticGroups` / boxes;
   T4 reject non-finite `magnetRadius` (як layout metrics).
4. **P1 Option B дочистка:** C1 видалити мертвий compute wiring **або** знову
   wire; L5 vacant select; L6 preview boxes; T1/T2 тести, що вміють падати.
5. **P2** dead exports / dual stores / `layoutCoords` / `previewGen`.
