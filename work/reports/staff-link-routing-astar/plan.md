# plan.md — React-хром near-view (ШПС alpha)

**Поріг:** НА порозі (нова рендер-поверхня в sdk + адитивна опція експортованого
`createReactPromoteOverlay`). Повний цикл. Rust НЕ чіпається.
**Джерела:** spec.md, _plan-react-nearview-dg40.md (+ревізія критика), мокапи v3 / shps-links.

## Reuse-first
| Що | Reuse / New | Чому |
|---|---|---|
| Camera-sync шар (transform, catch-up, settle) | **reuse** `createReactPromoteOverlay` | уже синхронізує картки з Pixi-камерою; розширюємо, не дублюємо |
| Картки | **reuse** `ShpsStaffCard` (promote-слоти) | 1:1 вже є |
| Геометрія (frames/routes/nodes) | **reuse** `computeStaffLiveGeometry` + Rust `result.frames` | єдине джерело; demo кличе сам |
| world→screen | **reuse** `worldBoxToScreen` (promoteMath) | уже є |
| SVG-лінії (pathD r4 + вхідні крапки) | **new** React SVG у backdrop | мокап = SVG; Pixi-лінії лишаються far-only |
| `.dn`/`.dept`/`.org.cur` CSS | **new** React-компоненти (порт v3) | Pixi не 1:1 |
| `backdrop` опція | **new** (адитивна) на `createReactPromoteOverlay` | рендер camera-synced контенту під картками |
| `frames` поле | **new** на `StaffLiveGeometry` (пайплайн result.frames) | зараз викидається |

## Архітектура
1. **`StaffLiveGeometry.frames`** (новий масив `{departmentId,x,y,width,height}`); `computeViaMockup`
   мапить `result.frames`. (Інші шляхи — порожній масив.)
2. **`createReactPromoteOverlay`**: нова опція `backdrop?: ComponentType<{viewport, screen, lod}>`.
   Рендериться в `OverlayRoot` ПЕРШИМ (нижче слотів), у тому ж `layer` (один transform). pointerEvents none.
3. **Demo `StaffChromeBackdrop`** (новий файл): отримує world-геометрію (closure) + {viewport,screen,lod}.
   Рендерить: org-рамку(и) → рамки департаментів (`.dept`+`.dn` 34px) → SVG `.lines` (pathD r4 + `.ent`).
   Рендерить лише коли `lod!=='far'`. world→screen через `worldBoxToScreen`, stroke `non-scaling-stroke`.
4. **Demo App**: для alpha рахує chrome-геометрію через `computeStaffLiveGeometry({...,lod:'near'})`
   один раз; будує backdrop із цією геометрією; передає в overlay.
5. **LOD-гейт у `renderStaffCanvas`** keyed на ОКРЕМОМУ runtime-прапорі `config.staffReactChrome`
   (НЕ на layout-прапорі `staffAlphaMockup`): якщо `config.staffReactChrome && lod!=='far'` →
   пропускати `paintStaffZones`/`paintStaffDepartments`/`paintStaffFrameAndEdges`. На far — Pixi все.
   **Розчеплення (закриває B1):** `staffAlphaMockup` керує РОЗКЛАДКОЮ (завжди); `staffReactChrome`
   керує ХРОМОМ і виставляється demo ЛИШЕ коли backdrop успішно зібрано. Збій геометрії demo-side →
   прапор false → Pixi малює хром (graceful fallback), а НЕ порожній хром. Два прапори — різні власники
   свідомо: гейт вимикає Pixi-хром рівно тоді, коли React-хром його заміняє.

## Acceptance scenarios (→ acceptance-spec)
| # | Precondition | Action | Expected | Verify |
|---|---|---|---|---|
| A1 | alpha, scale 0.55 (mid) | render | рамки деп. — React, шапка 34px fill #202023, назва+«N поз.» | DOM: `[data-staff-dept]` border/bar; getComputedStyle |
| A2 | alpha, mid | render | вхідні крапки на верх. краю рамки (frames=routes джерело) | DOM: координати крапки ≈ frame.top |
| A3 | alpha, mid | render | поточна org-рамка + чіп «Поточна організація» | DOM: `[data-staff-org]` + чіп текст |
| A4 | alpha, mid | render | Pixi zones/dept/edges НЕ малюються | renderStaffCanvas гілка; canvas без дубль-рамок |
| A5 | alpha, mid | pan | хром рухається з картками (без desync) | один layer transform |
| A6 | alpha, scale 0.3 (far) | render | Pixi staff як раніше; React-хром прихований | backdrop null при far |
| A7 | staff-shps / staff-mock3 | render | не зламані (backdrop лише для alpha) | гейти |

## Side effects
- `createReactPromoteOverlay` отримує адитивну опцію (backward-compatible; існуючі виклики без backdrop).
- Pixi staff chrome вимикається на mid/near ЛИШЕ для alpha (гейт за `staffAlphaMockup`); інші табі без змін.
- Demo рахує геометрію двічі (Pixi-far у DiagramRenderer + backdrop у demo) — той самий детермінований
  Rust-результат, нуль drift; вартість мізерна (mock3 мала сцена).

## Migration plan
- Поетапно (tasks T1→T6), кожен крок зелений. Pixi-лінії лишаються робочими до переходу на far-only.
- Жодних змін даних/схем. Жодних Rust-змін.

## Rollback
- Прибрати `backdrop`-опцію + LOD-гейт + `frames`-поле → повертається поточний стан (Pixi chrome на
  mid/near + Pixi-лінії). Коміт-граніт 617d873 — точка відкату. Фіча за прапором `staffAlphaMockup`.

## Constitution (маніфест §Конституція)
- ✅ Тести перед кодом (TDD): кожен task — тест(и) спершу (success+failure).
- ✅ KISS>SOLID>…: розширюємо один шар, не плодимо паралельний near-view (критик).
- ✅ GoF — не вводимо (нема ≥2-3 повторень).
- ✅ WASM↔TS межа — НЕ чіпається (frames уже в result; Rust без змін).
- ⚠️ Публічний API: `createReactPromoteOverlay` — адитивна опція. Перевірити, чи функція в
  `docs/USAGE.md`; якщо так — оновити доку в тому ж коміті. (facadeSurface гейт — лише про методи
  OrgHierarchyDiagram; новий метод фасаду НЕ додаємо — геометрію demo бере сам.)
- ✅ Pocock — лише TS (весь слайс TS).

## Plan-defense (5 питань — inline, GATE2)
1. **Malformed input:** frames порожні / routes порожні → backdrop рендерить 0 рамок/ліній (не кидає).
   Геометрія недоступна → demo НЕ виставляє `staffReactChrome` → LOD-гейт неактивний → Pixi малює хром
   (graceful), backdrop не монтується. Guard у App. (B1 закрито: гейт keyed на chrome-прапорі, не layout.)
2. **Dependency failure:** computeStaffLiveGeometry (WASM) кинув → ловимо в App, backdrop не монтуємо,
   `staffReactChrome` лишається false → Pixi малює хром як раніше. **Ніколи не порожній хром** — гейт і
   backdrop keyed на ОДНОМУ runtime-сигналі (chrome-прапор виставляється лише разом із backdrop). Деградація = Pixi, не діра.
3. **Race / repeated invocation:** overlay sync() рендерить backdrop щоразу; геометрія стала (closure) —
   без гонки. pan → один transform на весь layer (backdrop+картки). Повторний sync ідемпотентний.
4. **Empty / boundary data:** орга без департаментів → 0 рамок, лише org-рамка. Департамент без членів →
   Rust не емітить frame (вже так). scale рівно 0.45 → mid (lod gate `<0.45`=far).
5. **Rollback:** прапор `staffAlphaMockup` + адитивність → вимкнути опцію/гейт повертає стан. Граніт 617d873.

## GATE2 — результат (незалежний рев'юер, Opus, свіжий контекст)
🔴→🟢. Вердикт: ЧЕРВОНО з 1 blocking (B1), решта плану перевірена проти коду й тримається
(Risk#1 один-transform, Risk#2 нуль-drift, Risk#4 z-order, Risk#5 facadeSurface, Risk#6 без дублю карток).
- **B1 закрито:** гейт keyed на `staffReactChrome` (не на layout-прапорі); збій → Pixi fallback. Критик:
  «після закриття B1 гейт зелений».
- **N1 (doc):** USAGE §promote оновити в коміті з T2 — занесено в T4→T2 Done.
- **N2 (testability):** чиста геометрія хрому → SDK-хелпер `staffChromeGeometry.ts` з rstest — занесено в T3.
- **N3 (org-switch stale):** mock3 одна орга → switch out-of-scope (прийнято).
- **N4 (dragGrid/contourWorld):** staff-drag на mid/near alpha — out-of-scope; geom-dragGrid уже виставлено
  до paint (DiagramRenderer:667-674), contourWorld не потрібен → прийнято.
- **N5 (settle-транзієнт ~150ms):** на перетині zoom-межі можливий короткий подвійний/відсутній хром,
  саморозсмоктується → прийнято як відоме обмеження alpha.
GATE2 PASSED (B1 закрито, N1 у task). Перехід до tasks/implement дозволено.
