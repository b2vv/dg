# dg32 — незалежне рев'ю фіксу personDrag-регресу (R6)

РОБОЧИЙ ФАЙЛ рецензента. Дописуй ПІСЛЯ КОЖНОГО КРОКУ (append). Перший запис — `ДАЛІ:`.

## Що рев'юємо
Зміна в `packages/sdk/src/render/staffLiveGeometry.ts`: нова функція `isGenuineTreeScene` +
гейт маршрутизації `useRust = staffHeadResolvable(...) && isGenuineTreeScene(...)`.
(Решта файлу — WIP FORK2 dg30, НЕ предмет цього рев'ю.)

## Контекст (факти, перевірені dg32)
- Rust-геометрія реалізує ЛИШЕ `tree` coord-mode. Matrix/hybrid сцени має лежати TS-шлях (`computeViaTs`).
- Старий гейт `staffHeadResolvable` занадто слабкий: одна позиція з authored `gridCell` і без ієрархії
  резолвиться як head (single-parentless, resolveHead.ts:66) → йшла в Rust-tree → роль ноди 'tree'
  → `seatDragMode`='reparent' (DiagramRenderer.ts:155) → `onPersonDragEnd` не викликається → drop не
  репортиться → `personDrag.contract` «real drag reports drop» падав (onDrop 0, очік. 1).
- Проба підтвердила: Rust дає цій ноді role="tree".
- Golden-таби (11) проба coords/head: 4 мають withCoords>0 у currentOrg (variant-b, mockup-staff-magnetic,
  staff-1m, worker), АЛЕ **всі 11 мають явний isHead=1**. personDrag: isHead=0, 0 reportLines, coords=1.

## Твердження фіксу (перевір кожне незалежно)
1. `isGenuineTreeScene` = true, якщо (а) жодна in-org позиція не має coords, АБО (б) є явний isHead,
   АБО (в) є admin reportLine між двома in-org позиціями (не self).
2. Наслідок: усі 11 golden-табів лишаються на Rust БАЙТ-ІДЕНТИЧНО (всі мають isHead) → golden-маршрут не змінено,
   dg30 «converge matrix→tree» для coords-табів збережено.
3. personDrag (coords + слабка голова single-parentless, без isHead, без admin-ліній) → TS matrix → роль 'matrix'
   → drag 'move' → drop репортиться. personDrag 9/9 ✅.
4. Повна sdk-сюїта GREEN (1231 pass, 2-й прогін EXIT=0). `staffEdgeRouterScale` — перф-флака під навантаженням, не регрес.

## Питання рецензенту (пастки)
- Чи є сцена, що РАНІШЕ коректно йшла в Rust, а тепер хибно піде в TS (або навпаки)? Особливо: multi-org
  expanded (гейт дивиться лише currentOrgId), collapse-приховані coords-позиції, coords у дочірніх оргах.
- Чи `isGenuineTreeScene` правильно виключає self-admin-line (fromId===toId)?
- Чи не ламає гейт сцену з coords + admin-ієрархією без isHead (має йти Rust за (в) — перевір, що reportLines
  справді admin-kind і in-org)?
- Чи узгоджено з orgBlockLayout.ts:385-434 (TS per-org matrix/tree/hybrid розгалуження)?

## Вердикт: PASS / BLOCKED (зі списком дір) — у кінці файлу.

---
## Рецензент dg32-review (незалежна сесія)
model: claude-opus-4-8

ДАЛІ: читаю resolveHead.ts, coords.ts, orgBlockLayout.ts:357-440, DiagramRenderer.ts:155-158, types.ts — звіряю семантику гейта.

## ФАКТИ (звірено з кодом)

- staffCoordMode дефолт = 'hybrid' (types.ts:69); collapseUnexpandedPositions дефолт=false (types.ts:84).
- DiagramReportLine.kind: 'admin'|'matrix'|'dotted' (types.ts:178). isHead?:boolean (types.ts:126). gridCell/layoutX/layoutCoords (types.ts:145-150).
- positionHasCoords: gridCell || (layoutX&&layoutY) || layoutCoords (coords.ts:31-36) — ТОЙ САМИЙ предикат, що withCoords в orgBlockLayout:385. Узгоджено.
- resolveStaffHead (resolveHead.ts:48-70): 1 isHead → head; >1 isHead → throw; інакше adminParentMap→ рівно 1 parentless → head; інакше throw StaffLayoutError.
- adminParentMap (resolveHead.ts:5-20): kind==='admin', fromId!==toId, обидва in-org. isGenuineTreeScene умова (в) (staffLiveGeometry.ts:127-129) ДОСЛІВНО повторює ці 3 фільтри. Self-line виключено коректно.
- seatDragMode (DiagramRenderer.ts:155-157): matrix|anchor→'move', решта (tree)→'reparent'. Підтверджує корінь багу.
- TS-еталон (orgBlockLayout.ts:395/415/436): tree якщо withCoords===0; matrix якщо всі coords (without===0); інакше hybrid.

## АНАЛІЗ ГЕЙТА (логічна повнота)

Гейт = staffHeadResolvable(data) && isGenuineTreeScene(data). && короткозамкнений, staffHeadResolvable ПЕРШИЙ.

Ключова лема: для multi-node сцени БЕЗ isHead head-резолвність ⇔ рівно 1 parentless через adminParentMap ⇔ існують in-org admin-лінії (покривають n-1 вузлів). Отже:
- Будь-яка head-резолвна multi-node coords-сцена без isHead ОБОВ'ЯЗКОВО має in-org admin-лінію → умова (в) → Rust. Жодна справжня tree-сцена з coords не піде хибно в TS.
- Єдина coords+no-isHead+head-резолвна сцена, що провалює (а)(б)(в) = ОДИНОЧНИЙ seat (0 admin-ліній, тривіально 1 parentless). Саме її фікс і спрямовує в TS-matrix → role 'matrix' → drag 'move'. Це і є personDrag (isHead=0, 0 reportLines, coords=1). Коректно.
- Порожня org: staffHeadResolvable=false (throw "No positions") → короткозамкнено → TS. Без краху.
- Multi-isHead або coords-forest (>1 parentless): staffHeadResolvable=false → TS. Rust (який би кинув) захищено порядком &&.
- No-coords → (а) Rust; golden всі мають isHead → (б) Rust байт-ідентично.

Висновок: гейт ТОЧНО комплементарний head-резолвності — переспрямовує рівно lone-coords-seat + явно headless matrix, нічого зайвого. Golden не зачеплено.

## НЕ-БЛОКУЮЧІ спостереження

1. Scope гейта = лише currentOrgId (staffLiveGeometry.ts:123, 126). Якщо expanded ДОЧІРНЯ org — чистий matrix (coords, no isHead, no admin, >1 seat), а currentOrg — tree (isHead), сцена піде в Rust, і дочірні seats дістануть tree-role→reparent. АЛЕ: це НЕ регрес — до фіксу (gate=staffHeadResolvable-only) ця сама сцена теж ішла в Rust. Передіснуюче обмеження dg30-конвергенції, поза скоупом фіксу. Сюїта зелена (нема такої фікстури).
2. Умова (в): all-coords + admin-лінії + no-isHead → Rust-tree, тоді як чистий TS дав би matrix (orgBlockLayout:415, without===0). Семантичний зсув drag-role (reparent vs move), але знову — передіснуюче (до фіксу теж Rust) + узгоджено з dg30 «hierarchy signal ⇒ tree». Не регрес.
3. Collapse не моделюється в гейті (дивиться всі позиції, не visiblePositions). Передіснуюче, не введено фіксом; дефолт collapse=false.

## ВЕРДИКТ: PASS

Фікс логічно щільний: isGenuineTreeScene у парі зі staffHeadResolvable переспрямовує РІВНО проблемний lone-coords-seat (+ явно headless matrix) у TS, зберігаючи всі 11 golden (isHead→умова б) на Rust байт-ідентично. Self-line, admin-kind, in-org фільтри дослівно відповідають adminParentMap. Порядок && коректно захищає Rust від throw. Нових дір маршрутизації не знайдено; усі розбіжності з чистим-TS передіснуючі (dg30) і не є регресом.
