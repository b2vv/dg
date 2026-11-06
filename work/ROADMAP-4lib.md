# ROADMAP — 4-бібліотечний vision (спина плану dg)

**Зведено:** 2026-11-06 · **base `main @ e32e155`** · **основа:** [`work/reports/library-split-4/_recovered-vision.md`](./reports/library-split-4/_recovered-vision.md) (слова власника, 2026-10-24) · напрям у **ADR-0079** (Draft, репо `cassiopeia-admin-ui`).

> ## 🥇 ЦЕ — ГОЛОВНИЙ ФАЙЛ ПЛАНУ (найвищий пріоритет)
> Ієрархія файлів плану (вищий → нижчий):
> 1. **`work/ROADMAP-4lib.md`** ← ти тут. Головний план. При конфлікті з будь-яким іншим роадмапом — **виграє цей**.
> 2. `work/ROADMAP-extensibility.md` — похідний (наповнення #2/#3).
> 3. `work/ROADMAP.md` — похідний (міграція хоста).
> `work/CTO-RESEARCH.md` (брифінг) і `work/AGENDA.md` — не плани, а кеш фактів / вибір наступного ходу; служать цьому файлу.

> ⚠️ Це живий файл-спина. Статуси звірені з кодом на `e32e155`, не з пам'яті/handoff'ів. Чекбокс = перевірено
> проти коду; 🟡 = частково; ⬜ = не почато.

## 🎯 ГОЛОВНЕ vs ПОХІДНЕ (читати першим — щоб не ходити колами)

**ГОЛОВНЕ (мета):** 4-бібліотечна архітектура — #1 layout · #2 React-near · #3 Pixi-far · **#4 оркестратор**,
canvas↔DOM перемикаються за зумом. Усе міряється внеском у ці 4 частини. Джерело правди — `_recovered-vision.md` + ADR-0079.

**Кістяк, що лишився (головне-головне):** **#4 оркестратор** та **T3 (RendererPort + lift камери + §9-інверсія
інтеракцій)**. Доки їх нема — бібліотека не є «4 частинами», лише моноліт `sdk` із концептуальними ролями.

**ПОХІДНЕ (засіб, не мета):** усе решта — наповнення вже наявних частин, НЕ окремі цілі:
- `ROADMAP-extensibility.md` (R1–R5, D1, D3, emphasis) → полиск і спільний стан **#2/#3**. ✅ здебільшого в main.
- Роутинг-трек (вимір A0 → консолідація → F11.5 → A*-enable) → «гарні лінії» між **#1↔#3**. ⬜ не почато.
- `ROADMAP.md` (Ф0–Ф4) → міграція **хоста** з GoJS; окремий трек доставки, не архітектура бібліотеки.

> Правило проти кіл: якщо кандидат на роботу не просувається до #4/T3 і не наповнює #1–#3 — він похідний,
> береться лише коли головне не блокує. Наступний хід обирати з «головного», не з «похідного».

### Пріоритет (вищий → нижчий; бери згори)

1. **P0 — T3 re-gate → T3b/T3c** (RendererPort + lift камери + §9-інверсія інтеракцій). **Найвищий:**
   owner-умова перед кодом, уже стейджено (T3a ✅), і це фізично будує #4. Перший крок дешевий — лише re-gate
   переозначеного контракту (2 сліпі gate-reviewer), далі код.
2. **P1 — #4 оркестратор** як окремий компонент: LOD-арбітр «хто малює зараз» + петля measure→layout. Виростає з T3
   (камера й інтеракції вже підняті). Без нього #1–#3 не зв'язані в «перемикання за зумом».
3. **P2 — #2 на повну:** measure-loop (measured==drawn, ResizeObserver → годує #1 розмірами) + React-Flow-рівень near
   + **a11y**. ✅ Research API React Flow готовий — `reports/reactflow-uiux/api-contract-for-no2.md` (RF 12.12.1;
   ADOPT uncontrolled-модель/one-change-pipe/dual-target registry/measure-loop/layout-boundary; ADAPT imperative instance
   нейминг; REJECT edgeTypes/raw-store/connection-editor; 7 питань власнику). Розблоковує size-aware #1 (задача 4311).
4. **P3 (похідне) — роутинг-трек:** вимір A0 → консолідація К1–К3 → F11.5 → A*-enable. Гейтиться виміром і впирається
   в незавершений T128. Покращує лінії #1↔#3, не кістяк.
5. **P4 (похідне/беклог):** D3 зріз2 (org), B-blur, подальший полиск #2/#3, справжній спліт на пакети (передчасний,
   поки #4/RendererPort не існують).

**Отже наступний хід = P0 (re-gate T3-контракту).** Research RF (фон) готує ґрунт для P2 паралельно.

## Vision (власник, verbatim)
Бібліотека з 4 частин; розв'язує напругу canvas↔DOM — мати **обидва**, перемикати **за зумом**:
1. **#1 layout** — аналог dagre/elk = власний `dg-tidy` WASM (НЕ приймати ELK/dagre).
2. **#2 React Flow analog** — DOM/React ноди ЗБЛИЗЬКА, pixel-parity з макетом + a11y.
3. **#3 canvas підкладка** — Pixi ЗДАЛЕКУ / велике дерево.
4. **#4 оркестратор** — вирішує хто малює ЗАРАЗ + годує layout розмірами.
«бібліотека в бібліотеці» = monorepo-пакети (поки один репо).

---

## Статус частин (проти `e32e155`)

### #1 layout (dg-tidy WASM) — ✅ Є, 🟡 size-aware
- [x] Headless layout `computeOrgRowTreeLayout` існує (`packages/core`, Rust→WASM). Джерело: ADR-0002.
- [x] Staff-геометрія рахується в Rust в одній системі координат (ADR-0002, `1b7c13d`).
- [ ] 🟡 Per-node **w×h** канал у Rust tidy (задача 4311 — щоб ШПС збігалась із макетом): центрування кореня над прольотом приземлено (`804915c`), але завершений layout-result із розмірами на кожну ноду як публічний контракт — **не підтверджено в коді**.

### #2 React Flow analog (DOM near) — 🟡 частково
- [x] Зовнішній React-компонент near: `createReactPromoteOverlay` + `PromoteSlotProps`.
- [x] Інжекція взаємодії (R2): `selected/hovered/onSelect/onHover`, per-slot refresh.
- [x] Спільний стан near↔far (D1 InteractionStore `{selected,hovered}`; emphasis окремо).
- [ ] 🟡 Повний **React-Flow-рівень near** (pixel-parity з макетом як контракт) — частково (promote-overlay), не повна near-сцена.
- [ ] ⬜ **a11y** (node-level aria/role + клавіатурна навігація). Зараз лише Viewport-keyboard (R4) + overlay tabindex; нод-рівня нема. `focused` у D1 свідомо відкладено до a11y.
- [ ] ⬜ measured-size cache з reconciliation (measured==drawn, ResizeObserver) — знімає «два SSOT» HTML-twin↔Pixi. ResizeObserver є точково (overlay/near), повного кешу нема.

### #3 canvas підкладка (Pixi far) — ✅ Є
- [x] Pixi-рендерер (`DiagramRenderer`, SceneRegistry, StaffEdgesView/OrgEdgesView).
- [x] LOD-перемикання near↔far; hover-паритет far (R1); view-фабрики (R3); marquee (R5); зум-конфіг (R4).
- [x] D3 transition-шар зріз 1 (spring/tween, `animate` opt-in) — плавність far.

### #4 оркестратор — ⬜ НЕМАЄ окремим компонентом
- [ ] ⬜ Компонент «хто малює ЗАРАЗ» (LOD-арбітр) — логіка розмазана у фасаді `OrgHierarchyDiagram`.
- [ ] ⬜ Годує layout виміряними розмірами (замкнути петлю #2-measure → #1-layout).
- [ ] ⬜ Lift камери в #4 (без Pixi-ref у оркестраторі) — частина T3.

---

## Трек винесення (library-split-4, парасолька 4311)

### #5 core-база — ✅ приземлено
- [x] T3a-1 — релокація словника (NodeRef/NodeKind/nodeKey/nodeRefs/nodeTestId) → `core/` (`261991c`).
- [x] T3a-2 — drop-pipeline C (SeatDrop/resolveSeatDrop/applySeatDrop/movePositionToCell/InteractionError) → `core/` (`530d24c`).

### T3 — RendererPort + lift камери + §9-інверсія інтеракцій → будує #4
- [x] Gate раунд-1 пройдено (2 сліпі gate-reviewer, Opus); контракт переозначено `[gate-1]`. Spec: `library-split-4/T3-renderer-port.md`.
- [x] T3a (core-база) — див. #5.
- [ ] ⬜ **RendererPort** (Pixi за портом) — класу/інтерфейсу в коді немає.
- [ ] ⬜ **Lift камери** у #4 (камера-шов без Pixi-ref).
- [ ] ⬜ **§9-інверсія інтеракцій**: усі 13 node-callbacks → один `handleNodePointer(e: NodePointerEvent)` вгору (event-об'єкт з `mods`); винос selection/doubleTap/contextMenu/positionMove у #4.
- [ ] ⬜ **RE-GATE переозначеного контракту ПЕРЕД кодом T3b/T3c** (owner-умова): event-об'єкт+mods, drag-канали (dragStart/Move/End + applyDragPreview), onMeasurable-сигнал, камера-шов. 2 сліпі gate-reviewer.
- [ ] ⬜ T3b / T3c — код після re-gate.

### Справжній спліт на пакети — ⬜ майбутнє
- [ ] ⬜ Поки один пакет `sdk` (ролі #1–#4 концептуальні). Пакети core(Rust)/sdk/demo існують; розбиття sdk на #2/#3/#4 — пізніше.

---

## Фідер-треки (наповнюють частини, не кістяк)

| Трек | Куди лягає | Стан |
|---|---|---|
| R1 far-hover · R3 view-фабрики · R4 зум · R5 marquee · D3 зріз1 | #3 Pixi far | ✅ у main |
| R2 React-props · D1 store · emphasis | #2 near + спільний стан | ✅ у main |
| Роутинг: вимір-спайк A0 → консолідація К1–К3 → F11.5 → A*-enable | #1↔#3 (гарні лінії) | ⬜ не почато; A*-enable заблоковано на T128 |
| D3 зріз2 (org) · B-blur · focused/a11y | #2/#3 полиск | ⬜ беклог |

---

## ▶ Наступний хід (по vision, не фічевий)
**Re-gate переозначеного T3-контракту** (plan-critique + plan-defense, 2 сліпі `gate-reviewer`) — це owner-умова
перед кодом T3b/T3c, і саме T3 будує **#4 оркестратор** (lift камери + інверсія інтеракцій) — найбільший
незакритий кістяк vision. Дешевий, оборотний крок, що розблоковує структурну роботу.

**Чому не інше:** фіче-треки (#2/#3 полиск) нічого в кістяку не закривають; роутинг-трек гейтиться виміром і
впирається в незавершений T128; справжній спліт на пакети передчасний, поки #4/RendererPort не існують.

## Першоджерела
- Vision: `work/reports/library-split-4/_recovered-vision.md` · Handoff: `_HANDOFF-T3-to-dg-13.md` · T3-spec: `T3-renderer-port.md`
- RF API-референс для #2: `work/reports/reactflow-uiux/api-contract-for-no2.md` (+ інвентаризація 2026-08-28 там же).
- ADR-0079 (render-model, `cassiopeia-admin-ui`) · ADR-0078 (dg зовнішня, GoJS→dg) · ADR-0002 (Rust-геометрія).
- Фідери: `work/ROADMAP-extensibility.md`, `work/ROADMAP.md`.
