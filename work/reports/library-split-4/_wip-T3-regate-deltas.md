# T3b/T3c RE-GATE — дельти переозначеного контракту `[gate-1]`

**Мета:** прожарити ЛИШЕ те, що раунд-1 гейта **не бачив** — контракт порта було переозначено
ПІСЛЯ раунду-1 (правки `[gate-1]` у `T3-renderer-port.md`). Раунд-1 рев'ював стару (позиційну)
форму; нова форма (event-об'єкт + drag-канали + onMeasurable + камера-шов) ще не рев'ювнута.
Джерело істини — `T3-renderer-port.md` (рядки нижче). Канон — §9/§11/§12 у vault-ноті спліту.

**Статус T3a:** T3a-1 (релокація словника) — верифіковано, 2 сліпі gate-reviewer PASS, коміт на
паузі (owner-go pending). T3a-2 (drop-pipeline C) — план §C-RED, ще не кодовано. T3b/T3c — ЦЕЙ re-gate ПЕРЕД кодом.

---

## Дельти до прожарки (кожна — що змінилось + гострі питання)

### D1 — `handleNodePointer(e: NodePointerEvent)` з обов'язковими `mods` (B1, NB5)
Контракт: `T3-renderer-port.md:27-34,56,103`. Було: позиційний `(ref,kind,screenPoint)`. Стало:
event-об'єкт `{ref, kind, screen:{global,client}, mods:{ctrlKey,metaKey,shiftKey,button}}`.
Причина: `SelectionStore.ts:64 isSelectionToggleModifier(mods)` — без mods ctrl/shift-мультивибір ламається.
- **critique:** чи `mods` покриває всі наявні канали? `button` — чи достатньо для primary/right-арбітражу, якщо §11-B1 каже hit vs gesture розрізняє АДАПТЕР? Чи немає дубля семантики (button у mods vs kind='contextMenu')?
- **defense (кривий інпут):** NodePointerEvent з `ref=null` (фон) + `kind:'dragStart'` — легальний стан? Що робить #4 з drag від фону?

### D2 — drag-lifecycle: `dragStart/dragMove/dragEnd` вгору + `applyDragPreview(cell)` вниз (B2)
Контракт: `T3-renderer-port.md:21,31,37,61,88,104`. Було: `onPersonDragEnd(positionId,col,row)` з
РОЗВ'ЯЗАНИМИ col/row (рендер рахує стейтово: grabOffset :211, snapWorldToCell :314, dropTargetAt :302/move).
Стало: адаптер шле сирий drag-local world-point вгору; cell-резолв робить #4 через `core/logic`; preview малюється на команду вниз.
- **critique:** `applyDragPreview(cell)` на КОЖЕН move — чи не вводить down-канал latency/реентрантність проти нинішнього синхронного previewDrag :245? Хто власник grabOffset-стану тепер — #4 чи адаптер?
- **defense (гонка/повторний виклик):** dragMove приходить ПІСЛЯ dragEnd (стале событие)? Два dragStart без dragEnd? applyDragPreview(cell) після dragEnd?
- **ВІДКРИТИЙ design-пункт:** розміщення `dropTargetAt`/`DropTargetIndex` (point→logical-cell) — контракт каже «pure-резолв у core/logic, кличе #4; адаптер шле сирий world-point», але лишає на код T3c. Чи цей пункт достатньо визначений, щоб НЕ бути прихованим hitTest-у-порт (owner сказав НІ)?

### D3 — render-resolve: явний `onMeasurable`-сигнал, НЕ звуження `render()` (B4/NB3)
Контракт: `T3-renderer-port.md:23,52,89,100`. Було (писарів нахил): «render() резолвиться після paint-measurable».
Спростовано по коду: render() у DiagramRenderer, paint у PixiHost (afterRender :963 поза await render());
прив'язка перетинає клас-межу й вішає await render() при destroy() :380. Стало: окремий `onMeasurable`-сигнал, якого #4 чекає ПЕРЕД камера-оп; render()-резолв не чіпати.
- **critique:** «coalesced-paint↔pending мапінг — визначити явно» (рядок 52) — це НЕ визначено. Чи re-gate має вимагати явну специфікацію ДО коду T3b, чи це легітимно лишити на код?
- **defense (rollback/liveness):** destroy() під час in-flight → awaiter settle (reject/skip) — а stale-epoch? Повторний render до measurable першого — coalesce не губить awaiter? (рядок 89 перелічує 3 сценарії — чи повні?)

### D4 — камера-lift без подвійного володіння `world` + перепідключення paint (NB2)
Контракт: `T3-renderer-port.md:20,50-51,106`. #4 тримає камеру-СТАН+математику (без Pixi-ref);
`applyCamera({x,y,scale})` в адаптері пише свій world ({position.set,scale.set} :58-62) І САМ кличе requestPaint.
- **critique:** `apply()` :429 параметризується як adapter-side applyCamera — чи математика (zoomAt/panBy/computeFitTransform) переноситься у #4 BYTE-identical, чи є приховані залежності від Pixi-world-інстансу?
- **defense (порожні/граничні):** applyCamera до mount? scale=0 / NaN з математики #4? Хто клампить zoom-межі — #4 чи адаптер?

### D5 — інв «render→interaction=0» дійсний лише після зняття shim (NB6)
Контракт: `T3-renderer-port.md:45,70`. Reexport-shim дозволений ЛИШЕ в межах T3a, знімається до кінця T3a.
- **critique:** T3a-1 (словник) верифіковано БЕЗ shim (прямий репойнт ~25 сайтів; коміт на паузі). T3a-2 (drop-C) — чи вводить shim? Якщо інв#4 перевіряється boundary-gate'ом (§12-F3, рядок 92) — чи gate-механізм уже існує, чи «завести мінімальний»?
- **defense:** якщо shim лишиться випадково — чи щось його ловить, крім ручного grep?

---

## Що re-gate НЕ чіпає (вже закрито раунд-1, не переглядати)
- Стейджинг T3a→T3b→T3c (vs one-shot) — вердикт є (рядок 64).
- RendererPort=host-рівень (PixiHost реалізує), не DiagramRenderer (рядок 97).
- Камера reuse не переписування (рядок 98).
- promote-типи НЕ в core (B3, уже застосовано в T3a) (рядок 43,105).
- measureVisibleBounds лишається в порту (§11-A1) (рядок 68).
- hitTest публічного нема (рядок 78).

## Форма re-gate
2 незалежні сліпі критики (plan-critique + plan-defense лінзи) на D1–D5. Вердикт на кожну дельту:
витримує / blocking-діра / non-blocking. Знахідку писар звіряє по коду (не на віру). Збіг двох
незалежних на одній дельті = сильний сигнал.
