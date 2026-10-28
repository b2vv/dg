# R6 архітектурний огляд (dg24, read-only)

ДАЛІ: прочитати handoff dg23, plan.md, tasks.md, потім Rust staff_routes/staff_geom/staff_clearance/types, далі TS staffRouterV2 + споживачі + StaffEdgesView.


## ФАКТИ (звірено з кодом, 2026-10-28)

### Rust-роутер
- `staff_routes.rs:71 route_ortho` — ЄДИНА модель портів: `from.bottom → corridorY → to.top`. Немає
  бічних портів, around-left/top, cross-tier-drop, kind-залежності. Тобто Rust реалізує НОВУ модель
  власника (джерело=низ картки, ціль=верх), а НЕ поточний TS-роутер.
- `staff_routes.rs:189 detour_edge` — локальний пер-ребро детур: сканує лише corridorY-доріжки (над/під
  кожною перешкодою), бере першу чисту за |Δcorr0|. Тільки горизонтальні доріжки (зсув Y). Бічного
  (X) обходу НЕМА → R6-4b доведеться додати X-кандидати (архітектура це вмістить, grid-A* не треба).
- `marked` by construction через `staff_geom::frame_intrusion_count` (staff_routes.rs:291) — те саме
  джерело, що детектор. Дубль-правди нема: геопримітиви в `staff_geom.rs` спільні для роутера й детектора.
- `staff_clearance.rs` (#[cfg(test)]) — тонкі агрегати (card_clearance, foreign_frame_intrusions) над
  `staff_geom`. Виправдано окремий: test-only, не входить у WASM, не дублює геометрію. ЛИШИТИ.
- Складність пропорційна. Мертвих абстракцій майже нема. Дрібниці: `Side` enum (2 варіанти) лише в port();
  власно-рамковий exempt продубльовано в obstacles_for_edge:166 та frame_intrusion_count:187 (мусять
  лишатись синхронні). Чесно задокументовані не-мутовані гілки (dedup@217, tie-break@220).
- ПЕРФ-РИЗИК: немає просторового індексу. obstacles_for_edge будує свіжий Vec/ребро; route_clear_of
  O(points×obstacles). Разом ~O(edges×(cards+frames)). TS-роутер уже мав n²→855ms і отримав
  ObstacleIndex (staffEdgeGeometry.ts:277, binary search + WeakMap). Rust цього не має → латентний
  ризик для A10 (≤2-3с на 1M), вимір R10. НЕ фіксувати зараз (передчасно), але занотувати.

### TS routing-seam (R6-6)
- `staffRouterV2.ts resolveStaffRouting` — чистий seam, споживачі: staffLiveGeometry.ts:119,
  svgExport.ts:287. Обидва кличуть ТЕ САМЕ → live/SVG не розходяться. R6-6 ціль виконана ДЛЯ live↔SVG.
- АЛЕ сам роутер усередині — `classifyStaffEdgeRoute` (staffEdgeGeometry.ts:314): багата модель —
  vertical/horizontal кандидати, side-порти, aroundTop/aroundLeft, forced, cross-tier-drop,
  kind-preference. Це НЕ те, що робить Rust. ДВА РІЗНІ АЛГОРИТМИ.
- Ім'я `staffRouterV2`/`resolveStaffRouting` — стале: робить і legacy, і v2; після R7 кликатиме Rust.
  Перейменувати доречно (staffRouting.ts), але це churn імпортів → радше R7, коли роль файлу міняється.
- ТРЕТІЙ латентний сайт роутингу: `StaffEdgesView.redraw:100` — `routed?.segments ?? buildStaffEdgeSegments(edges, boxes)`.
  Фолбек повторно запускає TS-роутер БЕЗ рамок (без обходу/маркерів). Прод завжди передає segments
  (DiagramRenderer.ts:799, boxes=[]), тож фолбек у проді фактично мертвий. Це латентна друга правда.
- matrixLayout.ts:125 і spineBusEdges.ts:187 вживають staffEdgePolyline/staffEdgePolylineToSvg — це
  ORG-tier (matrix) лінії, ІНШИЙ домен, не staff(ШПС). Отже R7 НЕ може видалити staffEdgeGeometry
  цілком: примітив полілінії має org-side споживачів.

### Межа Rust↔TS (головне)
- Вихідні КОНТРАКТИ близькі: Rust StaffEdgeRoute{from_id,to_id,kind,points,marked:Option} ↔
  TS StaffEdgeSegment{fromId,toId,kind,points,x1,y1,x2,y2}. Відмінності (всі дешеві в адаптері):
  1. TS денормалізує x1/y1/x2/y2 — виводиться з points[0]/last.
  2. Rust `marked` inline Option<bool> ↔ TS окремий масив `markedCrossings`. Маппінг тривіальний.
  3. kind: Rust String ↔ TS union 'admin'|'matrix'|'dotted'|'cross-tier'.
- РОЗХОДЖЕННЯ, що робить R7 НЕ просто адаптером:
  1. **Алгоритм**: Rust=bottom→top+Y-detour; TS=side-ports+around-lanes+cross-tier-drop. R7 = ЗАМІНА
     поведінки, не злиття. Вигляд лінків зміниться (це закладено: R6=нові «повні маршрути», H4 —
     поведінкова, не golden-паритет; R0-golden НЕ стереже точки маршрутів у новій поведінці).
  2. **Рамки per-part**: Rust FrameRect має part_index (per-part A); TS StaffEdgeFrame має лише
     deptId+memberIds:Set (whole-dept). `department_frames` ще НЕ wired до реального WASM-виходу
     (handoff). R7 має продюсити per-part рамки зі StaffDepartmentFrameGeo (partIndex там є).
  3. **Членство**: Rust member_of(id)→(dept,part); TS memberIds Set на рамку. Моделі треба звести.
- Семантика збігається концептуально (marked↔markedCrossings, deptFrames↔department_frames), але
  per-part та алгоритм — справжня робота R7.

### Наступні кроки
- R6-7 плінки: StaffEdge.kind=String у Rust ПРИЙМЕ новий kind ("plink") без ломки. TS StaffEdgeLink
  union + STROKE_LIGHT/DARK (StaffEdgesView.ts:21-33, keyed by kind, fallback `?? stroke.admin`)
  треба РОЗШИРИТИ. deptTop-порт для head-цілей: Rust port() знає лише Top/Bottom бокса — рамка як
  ДЖЕРЕЛО порту (не перешкода) — нова гілка: для head-цілі резолвити target-порт з department_frame.top.
  Архітектура (порти з rect) це вмістить, але це РЕАЛЬНЕ розширення resolve_box/port, не безкоштовне.
- R6-4b бічний обхід: detour_edge дає лише Y-доріжки; треба додати X-доріжки (навколо високої рамки).
  Локальний пер-ребро детур це вмістить (додати X-кандидати в lanes), grid-A* не треба. Узгоджено.
- R7 tiers→namespaces: StaffNamespace уже в Rust. Ломаються (plan §4): canvasLayout, StaffZonesView,
  staffZoneBounds, personInteractions, render/types, svgExport, e2eBridge, DiagramRenderer, тести.
  StaffCanvasResult.tiers (types.ts:152) — TS-форма, що зникає.
- M6/ВІДКРИТЕ: matrix/dotted мають власний маршрут/стиль (design-v3, missed §E:48-50). Rust-роутер НЕ
  розгалужується за kind → під новою моделлю matrix/dotted теж підуть bottom→top. Чи зберегти для них
  side-порти — РІШЕННЯ ВЛАСНИКА перед R7 (не агента).

## РАНЖОВАНІ РЕКОМЕНДАЦІЇ

### ЗРОБИТИ ЗАРАЗ (≤3, дешево+де-ризик)
1. **StaffEdgesView = чистий маляр.** Прибрати фолбек `?? buildStaffEdgeSegments(edges, boxes)`
   (StaffEdgesView.ts:100) + імпорти buildStaffEdgeSegments/StaffEdgeBox. View приймає лише segments.
   Це ДОВЕРШУЄ R6-6 (єдиний seam) — прибирає третю латентну правду роутингу. Ризик низький: прод
   завжди передає segments (DiagramRenderer.ts:799). Звірити тести StaffEdgesView перед зрізом.
2. **Зафіксувати мапінг Rust→TS як міні-контракт зараз** (нота/стаб адаптера, не код): points→x1..y2,
   marked→markedCrossings, per-part frames зі StaffDepartmentFrameGeo. Щоб R7 був механічним там, де
   може бути. Дешево, знімає ризик «перепису» на межі.
3. (Опційно) **DRY own-frame-exempt** у Rust: винести спільний предикат `is_own_frame(key,src,dst)`
   у staff_geom, бо логіка продубльована (obstacles_for_edge:166 / frame_intrusion_count:187).
   Марджинально; робити лише якщо однаково чіпаємо ці місця в R6-4b/7.

### ЛИШИТИ ЯК Є
- Rust staff_geom/staff_routes/staff_clearance розклад — пропорційний, без мертвих абстракцій,
  єдине джерело геометрії. staff_clearance окремо (test-only) — виправдано.
- Side enum, dedup@217/tie-break@220 — чесно задокументовані, коректні, дешеві. Не чіпати.
- Ім'я staffRouterV2/resolveStaffRouting — стале, але перейменування = churn → разом з R7.

### ЦЕ ВЖЕ R7/БОРГ (не «зараз»)
- Заміна алгоритму TS→Rust (різні моделі портів/обходу) — ПОВЕДІНКОВА заміна, не злиття.
- Per-part рамки: продюсер department_frames на межі WASM + зведення TS memberIds→member_of.
- Видалення TS-пост-проходів + tiers→namespaces; staffEdgeGeometry НЕ видаляти цілком (matrix/spine).
- Перф: просторовий індекс у Rust-роутері, якщо R10 покаже n² на 1M.

### РІШЕННЯ ВЛАСНИКА (перед R7, не агента)
- matrix/dotted: зберегти side-порти/власний маршрут чи звести до bottom→top разом з admin?
  Rust зараз не розгалужується за kind; TS — так. Це контракт вигляду, не агентський вибір.
