# --- K4a attempt 2 (contour projection, sonnet) ---

ДАЛІ: прочитати plan.md §3/§6, spec.md A9/A10/C1-C3, _agent-critic.md знахідку про previewDrag,
TDD.md §2, CODING_STANDARDS.md; потім ContourPainter.ts (previewDrag/restoreAfterFailedDrag),
positionMove.ts (resolveSeatDrop), DiagramRenderer.ts:220, personInteractions (drag.previewCol/Row),
щоб зрозуміти плюмбінг і обрати (а) чи (б) свідомо.

ФАКТ: К1-К3 закомічені й зелені (c219c38, 3f2f862, af17dc1). resolveSeatDrop/applySeatDrop у
positionMove.ts готові, movePersonToCell (OrgHierarchyDiagram.ts:1713) вже їх використовує.

ФАКТ: DiagramRenderer НЕ зберігає DiagramData як поле — render(data,...) отримує data лише
локально в аргументі методу. ContourPainter.session.baseInputs/baseMemberBoxesByDept — це
ContourPositionInput[] (id, departmentId, col, row — БЕЗ organizationId), встановлюються один раз
при beginSession і НЕ мутуються під час drag (тобто це справжній «origin», з якого можна
перерахувати проєкцію з нуля на кожен кадр, а не накопичувати дельти).

ФАКТ: previewDrag сьогодні мутує session.inputs ІНКРЕМЕНТАЛЬНО відносно попереднього кадру
(prev = session.inputs.find(...)), а не від baseInputs. restoreAfterFailedDrag робить ПОВНИЙ
ресет із baseInputs/baseMemberBoxesByDept — тобто вже сьогодні готовий повернути «обох», якщо
previewDrag почне рухати обох: жодної зміни в restoreAfterFailedDrag не потрібно (A10 для контуру
закривається безкоштовно повним ресетом).

ФАКТ: `PersonInteractionDeps.previewDrag(positionId, col, row)` (personInteractions.ts:82) — це
межа, яку previewDrag викликає через `this.deps.previewDrag(...)` (personInteractions.ts:248).
Це НЕ треба чіпати. Резолвити можна прямо в замиканні на DiagramRenderer.ts:220
(`previewDrag: (positionId, col, row) => this.contours.previewDrag(...)`), не змінюючи
PersonInteractionDeps interface і не займаючи particular personInteractions.ts.

РІШЕННЯ: шлях (б), як і пропонував попередник. Причина, підтверджена читанням коду (не лише
довіра до нотатки): DiagramRenderer.ts:220 — єдина точка, де можна одноразово дістати
`this.data.positions` (додаванням одного приватного поля `currentPositions`, що виставляється на
вході в render()) і викликати вже існуючий resolveSeatDrop. ContourPainter лишається без жодного
імпорту доменних типів понад SeatDrop (який і так «одна функція, два споживачі» з плану §1).
Мінімальний плюмбінг: (1) нове приватне поле `currentPositions: DiagramPosition[]` у
DiagramRenderer, виставляється в render(); (2) заміна тіла замикання previewDrag на :220 —
резолвить SeatDrop і передає його вже ContourPainter.previewDrag(positionId, target, drop);
(3) сигнатура ContourPainter.previewDrag міняється з (positionId,col,row) на
(positionId, target: GridCell, drop: SeatDrop) — контур сам вирішує, куди рухати сусіда, за
kind ('push'→drop.to, 'swap'|'ask'→moverBase з session.baseInputs, 'free'→нікого).
`ask` показує swap — рахується як 'swap' у projectedOccupantTarget (та сама гілка switch), тому
не потребує спеціального case: ask навмисно зіставлено з тим самим кодом, що й swap.
Це НЕ торкає personInteractions.ts взагалі (deps interface лишається (positionId,col,row)).

ДАЛІ: переписати previewDrag у ContourPainter.ts так, щоб рахувати проєкцію ЗАНОВО з
session.baseInputs/baseMemberBoxesByDept на кожен виклик (а не інкрементально) — це усуває дрейф,
коли kind міняється між кадрами (push↔swap на межі), і безкоштовно узгоджується з тим, як
restoreAfterFailedDrag вже все скидає. Спершу тести (RED): push рухає обох у нових клітинах;
swap міняє місцями; ask показує swap; restore повертає обох байт-у-байт.

ФАКТ: ContourPainter.previewDrag переписано — нова сигнатура (positionId, target: GridCell,
drop: SeatDrop), рахує ЗАНОВО з session.baseInputs/baseMemberBoxesByDept щоразу (не інкрементально).
Додано projectedOccupantMove (switch з assertNeverSeatDrop) — push→drop.to, swap|ask→moverBase
(тобто ask = swap, як вимагає план §3), free→undefined. Додано previewState(positionId) —
тестовий seam (не в публічному barrel, ContourPainter не експортується з index.ts), повертає
{col,row,box}. restoreAfterFailedDrag НЕ чіпав — вже робив повний ресет із base*, тому A10 для
контуру закрився безкоштовно.
РЕЗУЛЬТАТ: `npx rstest run src/render/contour/ContourPainter.test.ts` — 13/13 GREEN (7 нових
тестів під `T111-K4a seat-collision projection`, зокрема
`ContourPainter.test.ts :: ContourPainter > T111-K4a seat-collision projection > success: restoring after a failed drag puts both seats back byte-for-byte (A10)`
— це і є A10 тест, звіряє previewState('P1'|'P2'|'P3') байт-у-байт до/після).
ДАЛІ: плюмбінг у DiagramRenderer.ts:220 — приватне поле currentPositions, resolveSeatDrop у
замиканні previewDrag, виклик this.contours.previewDrag(positionId, target, drop). Спершу тест на
DiagramRenderer (чи є вже test-файл, який мокає previewDrag дію), потім impl. Далі rstest у sdk,
typecheck у корені.

ФАКТ: DiagramRenderer.ts змінено МІНІМАЛЬНО (плюмбінг, не спрайти):
- імпорт resolveSeatDrop з '../interaction/positionMove.js', DiagramPosition з '../data/types.js';
- нове приватне поле `currentPositions: DiagramPosition[] = []`, виставляється в render() одразу
  після `const epoch = ++this.renderEpoch;` (`this.currentPositions = data.positions;`);
- замикання previewDrag на :220 (тепер трохи нижче через нові коментарі) резолвить SeatDrop
  через той самий resolveSeatDrop, що й movePersonToCell (OrgHierarchyDiagram.ts:1718) — `from`
  бере з `mover.gridCell` (авторська клітина), НЕ з drag-стану — так само, як застерігав план §2
  і робочий файл на старті. Якщо mover не знайдено — fallback {kind:'free'} (не кидає, не ламає
  drag).
PersonInteractionDeps interface і personInteractions.ts НЕ ЧІПАВ — жодного рядка.

ФАКТ: написано e2e-контракт `packages/sdk/src/render/seatCollisionPreview.contract.test.ts` —
повний пайплайн через OrgHierarchyDiagram.create() + реальні pointer-події (pattern як
personDrag.contract.test.ts). Сцена P1@(0,0),P2@(1,0),P3@(2,0) в одному org-блоці; драг P1 на
клітину P2 на 160px (pitchX=140+20) → P3 позаду P2 зайнятий → resolveSeatDrop=swap. Тест
success = "знімок посеред перетягу" (A9, e2e): P1@1,0 / P2@0,0 (повернувся на авторську клітину
P1) / P3@2,0 без змін — доведено через host.renderer.contours.previewState(id) (доступ через
`as unknown as` каст, ContourPainter приватний). Тест failure = A10, e2e: драг за межі сітки
(-100000,-100000) → invalid snap → personInteractions.ts викликає deps.restoreContours() →
previewState для P1/P2/P3 повертається БАЙТ У БАЙТ до baseline, onLayoutChange НЕ викликано.
РЕЗУЛЬТАТ: обидва тести спершу RED (Error: Unexpected SeatDrop kind: undefined — бо
DiagramRenderer.ts:220 ще передавав (positionId,col,row) старим способом), після плюмбінгу —
GREEN.

Файли, торкнуті К4a:
- packages/sdk/src/render/contour/ContourPainter.ts (previewDrag rewritten + previewState +
  projectedOccupantMove + assertNeverSeatDrop)
- packages/sdk/src/render/contour/ContourPainter.test.ts (2 існуючі виклики оновлено під нову
  сигнатуру + 7 нових тестів під "T111-K4a seat-collision projection")
- packages/sdk/src/render/DiagramRenderer.ts (плюмбінг: import, currentPositions поле,
  замикання previewDrag)
- packages/sdk/src/render/seatCollisionPreview.contract.test.ts (новий, e2e success+failure)

ДАЛІ: npx rstest run (весь sdk), npm run typecheck у корені, потім коміт.

ФАКТ: весь набір sdk — `npx rstest run` у packages/sdk → 929/929 GREEN (було 920, +9: 7 у
ContourPainter.test.ts + 2 у seatCollisionPreview.contract.test.ts).
ФАКТ: `npm run typecheck` у корені — EXIT 0, чисто (sdk + build:types + demo + tsconfig.e2e.json).
ФАКТ: `npx oxlint --max-warnings 0` на всіх 4 торкнутих файлах — чисто, 0 warnings.

РІШЕННЯ: закомічено ІМЕНОВАНО лише 4 файли К4a (git add по одному шляху, без -A):
packages/sdk/src/render/DiagramRenderer.ts,
packages/sdk/src/render/contour/ContourPainter.ts,
packages/sdk/src/render/contour/ContourPainter.test.ts,
packages/sdk/src/render/seatCollisionPreview.contract.test.ts.
Некомічені зміни work/reports/**, work/tasks/** (чужа сесія) — НЕ чіпав, лишив як були.

КОМІТ: 8a1082c "feat(T111-K4a): drag preview projects the resolved seat drop, not just the moved card"

СТАТУС: DONE.

Примітка: code-review-graph hook після коміту показав "Untested: OrgHierarchyDiagram,
movePersonToCell, assertNever, applySeatDrop, DiagramRenderer" — це, схоже, статична евристика
графа (не бачить непрямого покриття через seatCollisionPreview.contract.test.ts, який реально
проганяє DiagramRenderer.render()+previewDrag через OrgHierarchyDiagram.create()); movePersonToCell
і applySeatDrop вже мають власні тести з К3 (af17dc1). Наступнику: якщо CRG це знову підніме —
не довіряти без звірки з кодом (граф може відставати), правило вже записане в AGENTS.md.

# --- КІНЕЦЬ К4a ---
