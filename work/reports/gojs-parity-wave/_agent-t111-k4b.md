
ФАКТ: plan.md §3 підтверджує дефект: previewDrag сьогодні рухає лише контур (ContourPainter),
картки в personInteractions лишаються на місці. §3 explicit: push/swap мають рухати картку
сусіда, ask показує swap. restoreAfterFailedDrag (contour) мусить повернути обидві картки —
для спрайтів аналогічно потрібен відкат.

ФАКТ: spec.md A9 explicit: "включно з рухом спрайта сусіда, не лише кільця". A10: скасований
перетяг повертає в початковий стан, "сусід, посунутий у прев�ʼю, теж повертається".
С1/С2/С3 з spec.md — сценарії, які треба покрити.

ФАКТ: К4a (8a1082c) закрив контурну частину. Лишив ЧИСТИЙ плюмбінг:
- DiagramRenderer.ts:220 (or nearby) closure previewDrag вже резолвить SeatDrop через
  resolveSeatDrop(positions=this.currentPositions, positionId, target, from=mover.gridCell)
  і передає в this.contours.previewDrag(positionId, target, drop).
- ContourPainter.previewDrag(positionId, target: GridCell, drop: SeatDrop) вже рахує ЗАНОВО
  з session.baseInputs щоразу (не інкрементально) — можу переюзати цю ж SeatDrop-точку для
  спрайтів, не резолвлячи вдруге.
- currentPositions: DiagramPosition[] нове приватне поле DiagramRenderer, виставляється в render().
- PersonInteractionDeps.previewDrag(positionId, col, row) — межа НЕ чіпана К4a, лишається
  (positionId, col, row) на вході з personInteractions.

ДАЛІ: прочитати personInteractions.ts повністю (bind, dragGrid, snapTo, endDrag, reparent-шлях)
і DiagramRenderer.ts (bind calls :794/:907, previewDrag closure :220, PersonInteractionDeps,
де тримаються PersonNodeView-и/спрайти) щоб вирішити (а) чи (б).

# --- K4b attempt 2 (sonnet) ---
ДАЛІ: читаю personInteractions.ts повністю і DiagramRenderer.ts (bind :794/:907, previewDrag
closure ~:220-248, reset ~:357, cancel-шляхи ~:257-277) щоб вирішити (а)/(б).

ФАКТ: personInteractions.ts прочитано повністю (312 рядків). previewDrag (deps) кличеться
ЛИШЕ для mode !== 'reparent' (move-гілка :243-248, guard на зміну клітини вже є). Reparent-режим
(:239-241, trackTarget) НІКОЛИ не кличе previewDrag — інший механізм (dropTargetAt/canDropOn/
showDropPreview), тому SeatDrop і сусід там не задіяні взагалі.
Скасування: (А) move-режим invalid snap :274-279 — restoreContours()+requestPaint(), сусідського
відкату там ще нема. (Б) reparent-режим :257-267 — картка завжди йде додому, restoreContours()
там і не було (бо контур теж ніколи не рухався в reparent) — за тією ж логікою сусід теж ніколи
не рухався, тож (Б) не потребує restoreCards().

ФАКТ: DiagramRenderer.ts прочитано (previewDrag closure :235-242, bind-виклики :794 і :907,
render() reset-блок :349-360, SceneRegistry:44-55 getBox працює через nodeEntityKey, АЛЕ
views: Map є лише write (registerView) — read-акцесора для view за id НЕМАЄ, треба додати
symmetric getView(kind,id), як getBox.

ФАКТ: ContourPainter.ts має ГОТОВУ функцію-довідник projectedOccupantMove(drop, moverBase)
(:464-479, приватна, не exported) — саме та сама push/swap/ask-as-swap логіка, яку я мав би
написати вдруге. push → occupantId рухається в drop.to; swap/ask → occupantId рухається в
moverBase (клітину, яку звільняє mover). РІШЕННЯ: export цю функцію (з ContourPainter.ts) і
переюзати в DiagramRenderer — не дублюю бізнес-правило "де опиняється сусід".

ФАКТ: snapWorldToCell (positionMove.ts:21) — лише зворотне перетворення (world→cell). Прямого
cell→world НЕМАЄ як переюзної функції (є лише inline `col*pitch+inset` у двох місцях: рендер
:904-905 і T78-L1 origin-формула personInteractions.ts:205-206).

РІШЕННЯ (розвилка 1): (б) — новий dep у DiagramRenderer, НЕ Map<positionId,PersonNodeView>
у PersonInteractions. PersonInteractions уже документує себе як "owns the drag state so the
renderer does not" — власником спрайтів/сцени є DiagramRenderer (SceneRegistry), і previewDrag
closure УЖЕ резолвить SeatDrop і mover там-таки. Дублювати мапу спрайтів у PersonInteractions
означало б два джерела правди про той самий вид. Мінімальний diff: додаю symmetric
SceneRegistry.getView(kind,id) (як getBox), і НОВИЙ дешевий dep restoreCards() (previewDrag
сигнатуру не чіпаю — розширюю логіку ВСЕРЕДИНІ вже наявного previewDrag closure).

РІШЕННЯ (розвилка 2): НЕ абсолютний cell→world (originX+col*pitch+inset), а ДЕЛЬТА від поточного
box сусіда: newX = box.x + (to.col - occupant.gridCell.col)*grid.pitchX (аналогічно Y). Причина:
T78-L1 каже тіри спільно use gridCell-індекси, але МАЮТЬ РІЗНИЙ origin по Y — абсолютна формула
з одним глобальним dragGrid.origin дала б неправильний піксель для сусіда на іншому тірі.
Дельта від сусідового ЖЕ box.x/box.y (SceneRegistry вже тримає правильну авторизовану позицію,
не мутовану під час драгу — рухається лише вузол mover'а напряму) коректна незалежно від тіру,
бо не залежить від origin взагалі, лише від спільного pitch (той самий this.dragGrid.pitchX/Y,
жодної нової сітки не винайдено). push: |Δ|=1 клітина по одній осі (occupant вже стоїть у
target). swap/ask-як-swap: Δ = mover.gridCell − occupant.gridCell.

ДАЛІ: написати тести (RED) у DiagramRenderer.test.ts на: (1) push рухає сусідський sprite view
на dx/dy; (2) swap рухає сусіда на mover.gridCell; (3) відкат при invalid-snap повертає сусіда;
(4) зміна цільової клітини під час одного жесту (push→інший сусід) повертає старого й рухає
нового; (5) reparent-режим не чіпає жодного сусіда. Знайти існуючий тестовий файл і стиль К4a.

ФАКТ: тести написані ПЕРЕД кодом у seatCollisionPreview.contract.test.ts, новий describe
'seat-collision card preview (T111-K4b)' (3 тести: push-рухає-сусіда, swap-рухає-сусіда,
cancel-повертає-сусіда). RED підтверджено: 3 нових тести червоні (push/swap мали б рухати
p2.x/y, ще не рухають — displaced дорівнює 0), 2 старих K4a тести далі зелені (не зламав).
Використав існуючий mountThreeInARow + додав twoInARow/mountTwoInARow (push-кейс, де cell
позаду сусіда вільна) і personNodesByX (сортування за x, щоб тримати референс на p2 окремо
від p1, що рухається).

ДАЛІ: імплементація. Вже зроблено (до тестів): SceneRegistry.getView(kind,id) (symmetric
до getBox), ContourPainter.projectedOccupantMove — export, тип moverBase розширено до
{col,row} (без ContourPositionInput) щоб приймати DiagramPosition['gridCell']. Лишилось:
DiagramRenderer.ts — previewCardDisplacement()/restoreCardAt()/restoreCards(), private
displacedCardId, reset у render(), проводка в previewDrag closure; PersonInteractionDeps.
restoreCards() + виклик у personInteractions.ts поруч з restoreContours() (:274-279).

# --- K4b attempt 3 (finish wiring, sonnet) ---
ДАЛІ: прочитати робочий файл цілком (зроблено) — стан: тести RED написані (3 нових), лишилось
дописати DiagramRenderer.ts (previewCardDisplacement/restoreCardAt/restoreCards, displacedCardId,
reset у render(), проводка в previewDrag closure) і PersonInteractionDeps.restoreCards() +
виклик у personInteractions.ts (~:274-279). Плюс дописати тести (4) зміна цілі під час жесту і
(5) reparent не чіпає сусідів — ПЕРЕД кодом. Далі читаю поточний стан 4 змінених файлів.
