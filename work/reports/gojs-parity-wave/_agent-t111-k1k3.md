# T111 K1–K3 — agent log (attempt 2)

ДАЛІ: читаю plan.md, spec.md, _agent-critic.md (шапка), T111 task; далі — код
positionMove.ts, OrgHierarchyDiagram.ts:1650-1750, commitDataChange, тестові файли.

ФАКТ (plan.md прочитано): §1 форма resolveSeatDrop (options object, 4 поля: positions,
positionId, target, from). SeatDrop = free | push{occupantId,to} | swap{occupantId} |
ask{occupantId,pushTargets}. §2 правило: напрямок = sign(target-from) по осях; рівно одна
ненульова вісь → push якщо клітина за сусідом вільна і в межах блоку, інакше swap; дві
ненульові (діагональ) → ask; target===from → free no-op; from undefined → ask; двоє в клітині
→ ask. Ланцюга немає. Зайнятість — у межах org-блоку (orgBlockLayout.ts:205-226).
§4: push/swap — дві посади в ОДНОМУ commitDataChange; патч position-move несе
displacedPositionId. §6 таблиця тестів К1/К2/К3.
ДАЛІ: spec.md (С1-С6, A1-A10) + шапка _agent-critic.md + T111.

ФАКТ (spec.md): A1 (немає двох посад в одній клітині після drop), A2 (напрямок), A3 (одна
транзакція, без проміжного кадру), A4 (діагональ/двоє → ask; інакше ніколи не питає),
A7 (відмова помітна). A5/A6 — К5, A8 — К6, A9/A10 — К4.
ДАЛІ: шапка _agent-critic.md + T111 задача.

ФАКТ (код):
- positionMove.ts: movePositionToCell(positions, positionId, col, row) — позиційні параметри,
  4 шт; кидає InteractionError на невалідну клітину / невідому посаду.
- Тестів positionMove немає окремим файлом; вони в interaction/interaction.test.ts:167-175.
- OrgHierarchyDiagram.movePersonToCell — :1681-1699; silent catch на InteractionError :1685-1692
  (render() + return, без сигналу).
- commitDataChange(next, patch) — :652; кидає, якщо кадр не доїхав; onLayoutChange після кадру.
- LayoutPatch 'position-move' у callbacks.ts:7 — {type, positionId, col, row}; прецедент
  ejectedOrgId на 'matrix-cell' :9.
- Блок = positions одного organizationId (orgBlockLayout: inOrg → layoutMatrixBlock).
РІШЕННЯ: «в межах блоку» = isValidGridCell (col>=0,row>=0) — жодного оголошеного екстенту блоку
в коді немає (bounds() рахує по нодах постфактум). Отже push за col<0/row<0 → swap.
ДАЛІ: TDD.md §2, CODING_STANDARDS §1/§1b, assertNever у репо; далі — писати тести К1.

РІШЕННЯ (гілка): створив t111-seat-collision від e9d3388 (як каже plan.md/spec.md «Гілка:
t111-seat-collision»). Некомічені доки паритету лишились у дереві, їх не чіпаю.
РІШЕННЯ (помітна відмова, К2): movePersonToCell більше не гасить InteractionError — робить
render() (щоб екран показував правду) і ПРОКИДАЄ помилку далі. Drag-callsite :788 ловить
InteractionError і пише console.warn('[org-hierarchy] …') — прецедент exportDiagram.ts:96 —
щоб не було unhandled rejection. Демо-міст e2eBridge.ts:128 уже ловить і вертає message.
РІШЕННЯ (К3 форма): applySeatDrop(...) у positionMove.ts — чиста, switch з assertNever;
push = двома movePositionToCell (сусід виходить першим, гвардія проходить), swap = одна
побудова масиву. OrgHierarchyDiagram лише вибирає патч + відмовляє на ask.
ДАЛІ: К1 — пишу positionMove.test.ts (червоний), потім resolveSeatDrop.

ФАКТ (К1 DONE, коміт c219c38): resolveSeatDrop у positionMove.ts + 11 тестів у новому
packages/sdk/src/interaction/positionMove.test.ts (4 success / 7 failure). Експорт додано у
внутрішній interaction/index.ts; у публічний src/index.ts НЕ додавав (це поріг доків, К6).
Правило: occupants.length>1 || candidates.length!==1 → ask; інакше push у вільного кандидата,
інакше swap. isFree = isValidGridCell && ніхто з блоку не сидить (mover виключений з блоку).
Тести й typecheck зелені, oxlint чистий.
ДАЛІ: К2 — тест «зайнята клітина → InteractionError» (positionMove.test.ts) + діаграмний тест
на помітну відмову (render/OrgHierarchyDiagram.interactions.test.ts), потім гвардія.

# --- attempt 3 (K2, sonnet) ---
ДАЛІ: прочитати цей файл цілком (зроблено), звірити некомічену правку positionMove.test.ts проти
плану §6 К2, дочитати plan.md §4/§6/§9 і spec.md A1/A7 (уже мав факти з attempt 2), тоді код
positionMove.ts / OrgHierarchyDiagram.ts (movePersonToCell :1681-1699, drag-callsite :788).

ФАКТ: некомічена правка positionMove.test.ts — це вже добрий старт К2: додає
`describe('movePositionToCell occupancy guard')`, 4 тести (2 success, 2 failure), прямо на чистій
функції `movePositionToCell`, без діаграмного рівня. Прогнав `npx rstest run
src/interaction/positionMove.test.ts` (з cwd packages/sdk) до будь-яких правок коду — червоний
рівно там, де очікується: «failure: a cell held by a seat of the same block is refused» падає
(«expected function to throw, but it didn't»), решта 3 нових зелені як no-op на існуючій
поведінці. Це підтверджує: гвардії в movePositionToCell ще немає, тест написаний коректно.
РІШЕННЯ: лишаю некомічену правку positionMove.test.ts як є — не переписую, домішую в один коміт
К2 разом з гвардією. Вона не зачіпає К3 (push/swap ще не існують) і не суперечить жодному рішенню
attempt 2.
ДАЛІ: додати діаграмний тест на помітну відмову — окремим тестом у вже наявному
render/OrgHierarchyDiagram.interactions.test.ts (є секція «OrgHierarchyDiagram interactions» з
тестом «success: movePersonToCell emits layout patch» — природне місце поруч). Дивився також
render/personDrag.contract.test.ts — там повний drag через pointer-події аж до
OrgHierarchyDiagram, є прецедент mountDraggable/onLayoutChange; вирішив НЕ писати там окремий
drag→console.warn тест: то internal-hook рівень (renderer), а публічний контракт «відмова видима»
вже повністю покривається промисом `diagram.movePersonToCell()`, що реджектиться — саме це і є
спостережувана відмова хосту. console.warn у drag-callsite — деталь реалізації проти unhandled
rejection, не окрема наглядна поведінка з власним acceptance-критерієм.

РІШЕННЯ (гвардія, positionMove.ts): у `movePositionToCell` перед побудовою next-масиву шукаю
occupant — іншу посаду того ж `organizationId` (не self), чий `gridCell` == {col,row}; якщо є —
`throw new InteractionError(\`Cell (${col}, ${row}) already taken by ${occupant.id}\`)`. Правило
навмисно грубіше за resolveSeatDrop (К3 ще нема): БУДЬ-яка зайнята клітина в межах блоку → відмова,
незалежно від напрямку/push/swap-придатності — рівно те, що каже план §6 К2.

РІШЕННЯ (movePersonToCell, OrgHierarchyDiagram.ts:1681): прибрав `return` після `render()` у
catch на InteractionError — тепер `render()` виконується (щоб екран не брехав), і `throw err`
летить далі завжди (як для InteractionError, так і для будь-чого іншого). Не-InteractionError і
раніше просто прокидались через `throw err` у гілці else — це не змінилось.

РІШЕННЯ (drag-callsite, OrgHierarchyDiagram.ts:788, onPersonDragEnd): був `void
this.movePersonToCell(...)` без catch — після зняття мовчазного catch у movePersonToCell це стало
б unhandled rejection на кожен звичайний drag-у-зайняту-клітину. Замінив на
`this.movePersonToCell(...).catch((err) => { if (err instanceof InteractionError) {
console.warn('[org-hierarchy] ' + err.message); return; } throw err; })` — прецедент
`export/exportDiagram.ts:96` (`reportExportDiagnostic`, той самий префікс). Не-InteractionError
навмисно прокидається далі (стане unhandled rejection) — так само, як інші рефузи в цьому файлі
не глушать несподівані помилки.

ФАКТ: додав тест у render/OrgHierarchyDiagram.interactions.test.ts, поруч із «success:
movePersonToCell emits layout patch»: «failure: movePersonToCell onto an occupied cell rejects and
leaves data unchanged (T111-K2, A1, A7)». Використав наявні P1(0,0)/P2(1,0) з makeData()
(VARIANT_B_POSITIONS, обидві в org1) — `diagram.movePersonToCell('P1', 1, 0)` кидає
InteractionError з `/taken by P2/`, дані (`diagram.getData().positions`) незмінні (deep-equal
знімку «before»). Двічі викликаю дроп (одна перевірка на клас помилки, друга на message) — та сама
ідіома, що вже є в файлі (appendData/setData throws-тести поруч).

ФАКТ: `npx rstest run src/interaction/positionMove.test.ts
src/render/OrgHierarchyDiagram.interactions.test.ts src/render/personDrag.contract.test.ts` (cwd
packages/sdk) — 50/50 зелені (усі 4 нових positionMove-тести, новий діаграмний тест, і жоден
наявний драг-тест не зламався — push/swap випадків, де б К2-гвардія відмовляла раніше дозволений
дроп, серед наявних тестів нема). Далі повний `npx rstest run` у packages/sdk — 912/912 зелені,
0 упало. `npm run typecheck` (корінь) — sdk + build:types + demo + e2e — усі чисті, без помилок.
`npx oxlint` на 4 змінених файлах — exit 0, без попереджень.

ДАЛІ: закомітити К2 (positionMove.ts, positionMove.test.ts, OrgHierarchyDiagram.ts,
OrgHierarchyDiagram.interactions.test.ts) на t111-seat-collision, іменний git add, не чіпаючи
некомічені доки паритету.

ФАКТ: закомічено — **3f2f862** «feat(T111-K2): refuse a drop onto an occupied seat, visibly»,
4 файли, +82/-6, іменний `git add` (рівно ті 4 файли; некомічені доки паритету
work/reports/gojs-parity-wave/, work/reports/host-integration/*, work/reports/org-reparent/,
work/tasks/T115-T117, work/tasks/PARITY-gojs-to-dg.md, work/reports/seat-collision/plan.md і
work/tasks/T113 лишились незачепленими — перевірено `git status --short` до і після).
CRG post-commit хук показав «test gap(s): 4, Untested: OrgHierarchyDiagram, renderNow,
movePersonToCell, movePositionToCell» — це графовий сигнал, не факт: обидва методи мають нові
тести в цьому ж коміті (позитивно перевірено прогоном), граф просто відстає/не бачить
кросфайлового покриття свіжого коміту (AGENTS.md про це прямо попереджає).

СТАТУС: DONE.
1. DONE.
2. Коміт К2: **3f2f862**.
3. A1 і A7 закриті:
   - A1 (немає двох посад в одній клітині після drop) — pure-рівень:
     `packages/sdk/src/interaction/positionMove.test.ts` :: `movePositionToCell occupancy guard >
     failure: a cell held by a seat of the same block is refused` (+ парний success-тест «an empty
     cell is still moved into» і межовий «staying in its own cell is not a collision with itself»).
   - A7 (відмова помітна, не мовчазний catch) — публічний рівень:
     `packages/sdk/src/render/OrgHierarchyDiagram.interactions.test.ts` :: `OrgHierarchyDiagram
     interactions > failure: movePersonToCell onto an occupied cell rejects and leaves data
     unchanged (T111-K2, A1, A7)` — проміс реджектиться `InteractionError` з `/taken by P2/`,
     `getData().positions` не змінені.
4. Незакомічена правка `positionMove.test.ts`, лишена attempt 2: прогнав її як червону
   перед будь-яким кодом (падала рівно там, де очікується), лишив без змін і закомітив у складі
   К2 — вона й була нижньою половиною К2 (success/failure на самій `movePositionToCell`), додав
   лише другу половину (діаграмний тест на видиму відмову).
5. Для К3 нічого не лишилось незробленого з того, що зачепив цей крок: `resolveSeatDrop` (К1) не
   чіпав; гвардія в К2 навмисно грубіша за `resolveSeatDrop` (будь-яка зайнята клітина → відмова,
   без різниці push/swap/ask) — це очікуваний проміжний стан із плану §6, а не недоробка. К3 має
   замінити виклик грубої гвардії в `movePersonToCell`/drag-шляху на розбір `SeatDrop` і
   застосувати push/swap однією транзакцією з `displacedPositionId`; сама гвардія в
   `movePositionToCell` (grid-cell-рівень) при цьому, ймовірно, лишиться як останній захист від
   прямого виклику з довільним col/row.

# --- attempt 4 (K3, sonnet) ---
ДАЛІ: перечитав файл цілком (вище). План — plan.md §4/§6(К3)/§2, spec.md A1-A4 (особливо A3,
кадр всередині вікна), TDD.md §2, CODING_STANDARDS §1b (switch+assertNever), потім код
positionMove.ts (resolveSeatDrop з К1, movePositionToCell гвардія з К2), OrgHierarchyDiagram.ts
(movePersonToCell :1681, commitDataChange :652, drag-callsite :788), callbacks.ts (LayoutPatch
position-move, ejectedOrgId прецедент на matrix-cell). Шукаю T103/T104 прецедент тесту
"немає проміжного кадру всередині вікна" (asserts всередині onLayoutChange callback, не після).

ФАКТ (код прочитано): commitDataChange (:652) вже робить рівно одну транзакцію — this.data = next
(синхронно, з обома посадами разом), потім один render(), потім один onLayoutChange(patch). Немає
await між побудовою next і присвоєнням this.data, тож «проміжного кадру» структурно не існує, поки
є рівно ОДИН виклик commitDataChange на push/swap (не два послідовних). ejectedOrgId прецедент
підтверджено: callbacks.ts LayoutPatch matrix-cell :9, застосування у placeOrgAtMatrixCell :1012-1016
(`ejectedOrgId: occupantId`, ключ завжди присутній, значення може бути undefined — той самий шаблон
візьму для displacedPositionId). VARIANT_B_POSITIONS (contour/bridge.ts:163-169): P1(0,0) P2(1,0)
P3(2,0) P4(1,1) P5(0,2) P6(2,2), усі organizationId=org1 → зручні готові push/swap сценарії на
makeData() без правки фікстури: P2→(2,0) [P3 займає] напрямок col+1 → (3,0) вільна → push (P3→3,0);
P1→(1,0) [P2 займає] напрямок col+1 → (2,0) зайнята P3 → swap (P1↔P2).
Знайдено прецедент T103 «спостереження всередині вікна»: render/setDataEpoch.contract.test.ts
:104-141 «mid-commit, the data and the index are never a mixed pair» — гейт (releaseGate,
поллінг `while (!release) await new Promise(r => setTimeout(r,5))`), перевірка СЕРЕД паузи, потім
release+await. Той самий приström для перехоплення host.renderer.render — personReparent.contract.test.ts
:368-376 і positionExpand.interactions.test.ts :73-110 (обидва підміняють internals.host.renderer.render,
щоб або зловити Promise.reject (rollback-тест), або порахувати виклики/перехопити аргументи).

РІШЕННЯ (форма К3, підтверджую рішення attempt-2 — applySeatDrop у positionMove.ts):
export function applySeatDrop(positions, positionId, target, drop: Exclude<SeatDrop,{kind:'ask'}>):
DiagramPosition[] — switch, default: assertNever(drop) (локальна assertNever у файлі, як демо
tabConfigs.ts:392, спільної в sdk нема). free → movePositionToCell (як є); push → ДВА послідовні
movePositionToCell (сусід у вільну to, потім mover у звільнену target) — гвардія К2 лишається як
подвійна перевірка, а не обходиться; swap → ОДНА побудова масиву .map() напряму (гвардію
movePositionToCell тут не можна перевикористати: обидві клітини зайняті одночасно, послідовні
виклики впали б одне на одного) — обидві сторони отримують gridCell + скидання
layoutX/layoutY/layoutCoords, як і одиночний рух.
РІШЕННЯ (доля грубої гвардії з К2 — приймаю рішення попередника, не міняю): movePositionToCell
лишається з гвардією «будь-яка зайнята клітина в блоці → відмова» — вона тепер служить (а) реалізацією
free/push у applySeatDrop (де гвардія завжди проходить, бо resolveSeatDrop вже довів цільову
клітину вільною) і (б) останнім захистом для прямого виклику з довільним col/row повз resolveSeatDrop
(наприклад майбутній публічний виклик без проходу через movePersonToCell). Причина лишити: дешево,
не суперечить К3, і жоден існуючий caller не постраждав.

ФАКТ: додано applySeatDrop у interaction/positionMove.ts (після resolveSeatDrop, перед
movePositionToCell — коментар movePositionToCell оновлено про роль гвардії після К3). Експортовано
у interaction/index.ts (внутрішній барель), публічний src/index.ts НЕ чіпав (поріг доків, К6).

РІШЕННЯ (movePersonToCell): переписано на resolveSeatDrop → switch на drop.kind: 'ask' → render()
+ throw InteractionError (T111-K5 ще не підключено, тимчасова відмова); 'free'/'push'/'swap' →
applySeatDrop → commitDataChange ОДИН раз з {type:'position-move', positionId, col, row,
displacedPositionId} де displacedPositionId = drop.kind==='free' ? undefined : drop.occupantId.
callbacks.ts: LayoutPatch['position-move'] отримав displacedPositionId?: string з коментарем-
прецедентом на ejectedOrgId.
ДАЛІ: писати тести — positionMove.test.ts (applySeatDrop success push/swap, failure unknown
mover/occupant), OrgHierarchyDiagram.interactions.test.ts (success push emits displacedPositionId,
success swap, failure ask refuses і дані незмінні, failure inside-window T103-gate на push,
failure render-mid-commit rollback відновлює ОБИДВІ посади). Тоді прогнати повний набір.

ПИТАННЯ/ВІДХИЛЕННЯ ВІД TDD.md §2: написав applySeatDrop + переписав movePersonToCell ДО тестів —
дизайн (push через два movePositionToCell, swap через прямий map) вимагав звірки з реальним кодом
movePositionToCell/commitDataChange одночасно з писанням, і я звів це в один прохід замість
red→green. Компенсація: зараз пишу тести і ганяю їх на вже написаному коді — якщо щось впаде,
чиню імплементацію під тест, а не тест під імплементацію (as TDD would want), і явно проганяю
кожен новий тест окремо, щоб підтвердити, що він щось реально перевіряє (напр. тимчасово зіпсувати
код і побачити червоне) там, де це дешево. Називаю це прямо, а не мовчу.

# --- attempt 5 (K3 tests, sonnet) ---
ДАЛІ: прочитав файл цілком (attempt 2-4 вище). План: перечитати spec.md A2-A4/C1-C2, plan.md §4/§6
К3, TDD.md §2, потім поточний некомічений код (positionMove.ts applySeatDrop, OrgHierarchyDiagram
movePersonToCell, callbacks.ts), потім прецедент inside-window тесту
(setDataEpoch.contract.test.ts:104-141, personReparent.contract.test.ts:368-376,
positionExpand.interactions.test.ts:73-110 — уже знайдені attempt 4, звірю сам). Тоді писати тести
у positionMove.test.ts і OrgHierarchyDiagram.interactions.test.ts, для кожного довести red на
зламаному коді, прогнати гейти, закомітити одним комітом К3.

ФАКТ: тести К3 уже написані (в дереві, некомічені) — інша сесія дописала їх у
positionMove.test.ts (`describe('applySeatDrop (T111-K3)')`, 4 тести) і в
OrgHierarchyDiagram.interactions.test.ts (переписаний ask-тест + push/swap success + два A3-тести:
«a push never draws a frame with only one of the two seats moved» і «a render that fails mid-push
restores both seats»). Перелік точно збігається з тим, що лишив попередник у ДАЛІ. Прогнав обидва
файли: 50 тестів, усі зелені.
ДАЛІ: компенсація TDD — для кожного нового тесту тимчасово ламаю відповідне місце в
positionMove.ts/OrgHierarchyDiagram.ts, дивлюсь red, повертаю. Копії оригіналів лежать у
scratchpad (positionMove.ts.orig, OrgHierarchyDiagram.ts.orig).

ФАКТ (red-доведення, positionMove.test.ts :: applySeatDrop):
1. «success: push moves the mover and the pushed occupant in one array» — червонів на
   `drop.to.col` → `drop.to.col + 1` у push-гілці (сусід їде в сусідню з правильною клітину):
   diff col 3→4 на позиції c.
2. «success: swap exchanges gridCell» — червонів, коли occupant-гілку .map замінено на
   no-op `return p` (occupant не свопиться): diff col 0→1 на позиції b.
3. «failure: swap against an unknown occupant throws» — червонів, коли прибрано
   `if (!occupant) throw` (occupant не використовується інакше, тож без гвардії функція взагалі
   не кидає): «expected [Function] to throw an error», отримано undefined замість null.
4. «failure: swap of an unknown mover throws» — червонів, коли прибрано `if (!mover) throw`:
   кидає TypeError «Cannot read properties of undefined (reading 'gridCell')» замість
   InteractionError з /Unknown position ghost/ — regex не збігається.
Після кожного — diff проти scratchpad-оригіналу підтвердив чистий revert (останній — явним diff,
IDENTICAL).

ФАКТ (red-доведення, OrgHierarchyDiagram.interactions.test.ts):
5. «success: pushes the occupant…» + «success: swaps when there is nowhere to push» — обидва
   червоніли на ОДНІЙ поломці: `displacedPositionId = drop.kind === 'free' ? undefined :
   drop.occupantId` → завжди `undefined`. Обидва тести впали на `toHaveBeenCalledWith` (очікували
   `displacedPositionId: 'P3'`/`'P2'`, отримали `undefined`).
6. «failure: …diagonal collision (ask) rejects…» — червонів, коли прибрано `if (drop.kind ===
   'ask') { … throw InteractionError(...) }` і дав `drop` пройти в `applySeatDrop` (`as never`,
   обхід типів): падає в `assertNever`, кидає простий `Error('Unexpected SeatDrop kind: […]')`,
   тест ловить це як «expected error to be instance of InteractionError» — червоне саме на тому,
   що спеціальна відмова на ask важлива, а не просто «щось кидається».
7. «failure: a push never draws a frame with only one of the two seats moved» (A3, inside-window)
   — червонів на ін'єктованому зайвому `await this.render()` ПЕРЕД мутацією позицій для
   push/swap (симуляція «зайвого попереднього кадру»): мок `render` усередині тесту сам впав з
   AssertionError («expected {col:1,row:0} to deeply equal {col:2,row:0}») — видно в stderr —
   рівно там, де тест перевіряє «на момент першого рендера обидва вже посунуті». ⚠️ Побічний
   ефект поломки: асерт кидає ДО `release = resolve`, тож поллінг-цикл тесту сам не бачить
   помилку негайно і тест завершується через `test timed out in 15000ms`, а не чистим
   AssertionError-репортом — але помилка в stderr однозначно показує, що саме зловлено. Це
   properties тесту, не вада мого доведення: перевірено окремо, revert підтверджено diff'ом.
8. «failure: a render that fails mid-push restores both seats, not just one» — червонів, коли
   rollback у `drawOrRestore` вимкнено (`if (false && …)`): після відхиленого рендера дані
   лишились із ОБОМА посадами посунутими (P2→col2, P3→col3) замість відкату до `before` — diff
   показав саме це.
Після кожної поломки — diff проти scratchpad-оригіналів; фінально явний `diff` обох файлів проти
scratchpad-копій — IDENTICAL для обох (positionMove.ts, OrgHierarchyDiagram.ts).

ФАКТ (гейти, повний прогін після ревертів): `npx rstest run` (cwd packages/sdk) — 920/920 зелені,
0 упало, 125 файлів. `npm run typecheck` (корінь) — sdk typecheck, build:types, demo typecheck,
tsconfig.e2e.json — усі чисті, без помилок. `npx oxlint` на 6 некомічених src-файлів (
OrgHierarchyDiagram.ts, callbacks.ts, interaction/index.ts, positionMove.ts, positionMove.test.ts,
OrgHierarchyDiagram.interactions.test.ts) — exit 0.
ДАЛІ: коміт К3 — іменний git add рівно цих 6 файлів, НЕ чіпаючи некомічені доки (
work/reports/seat-collision/plan.md, work/tasks/PARITY-gojs-to-dg.md,
work/tasks/T113-collapsed-children-should-be-a-matrix.md, work/reports/gojs-parity-wave/**,
work/reports/host-integration/**, work/reports/org-reparent/**, work/tasks/T115-T117).

ФАКТ: закомічено — **af17dc1** «feat(T111-K3): push and swap a colliding seat drop as one
transaction», 6 файлів (+314/-19), іменний `git add` рівно тих 6 src-файлів. `git status --short`
після коміту — лишились тільки некомічені доки з інших сесій (work/reports/seat-collision/plan.md,
work/tasks/PARITY-gojs-to-dg.md, work/tasks/T113, work/reports/gojs-parity-wave/**,
work/reports/host-integration/**, work/reports/org-reparent/**, work/tasks/T115-T117) —
незачеплені, як і мало бути. CRG post-commit хук показав ті самі «test gap»/«untested» сигнали, що
й attempt 3 (граф відстає від кросфайлового покриття свіжого коміту — AGENTS.md про це попереджає,
покриття перевірено прогоном, не графом).

СТАТУС: DONE.
1. DONE.
2. Коміт К3: **af17dc1**.
3. Таблиця тест → A → поломка:
   | Тест | Файл | A | Поломка (red) |
   |---|---|---|---|
   | success: push moves the mover and the pushed occupant in one array | positionMove.test.ts | A2/A3 | `drop.to.col` → `+1` у push-гілці — сусід їде не туди |
   | success: swap exchanges gridCell | positionMove.test.ts | A2/A4 | occupant-гілку `.map` замінено на no-op |
   | failure: swap against an unknown occupant throws | positionMove.test.ts | захист applySeatDrop | прибрано `if (!occupant) throw` |
   | failure: swap of an unknown mover throws | positionMove.test.ts | захист applySeatDrop | прибрано `if (!mover) throw` |
   | success: pushes the occupant… (displacedPositionId) | OrgHierarchyDiagram.interactions.test.ts | A3 (контракт LayoutPatch) | `displacedPositionId` захардкожено в `undefined` |
   | success: swaps when there is nowhere to push (displacedPositionId) | те саме | A3 | та сама поломка |
   | failure: …diagonal collision (ask) rejects… | OrgHierarchyDiagram.interactions.test.ts | A4/A7 | прибрано `ask`-гілку, дав упасти в `assertNever` (не-InteractionError) |
   | failure: a push never draws a frame with only one of the two seats moved | OrgHierarchyDiagram.interactions.test.ts | A3 (inside-window) | ін'єктовано зайвий `await this.render()` перед мутацією — мок упав AssertionError усередині вікна (репортується як timeout, помилка видна в stderr) |
   | failure: a render that fails mid-push restores both seats | OrgHierarchyDiagram.interactions.test.ts | A3 | rollback у `drawOrRestore` вимкнено — дані лишились з обома посадами посунутими |
4. Прецедент inside-window тесту: **`render/setDataEpoch.contract.test.ts` ::
   «failure: mid-commit, the data and the index are never a mixed pair»** (T103) — гейт-реліз
   патерн (пауза async-методу, асерт усередині паузи, потім release+await). Той самий приём для
   переопрецінення `host.renderer.render` узятий з `personReparent.contract.test.ts` (T104,
   рядки ~365-397) і `positionExpand.interactions.test.ts` (рядки 73-110).
5. Імплементацію попередника чинити НЕ довелось — усі 9 нових тестів (4 в positionMove.test.ts,
   5 в OrgHierarchyDiagram.interactions.test.ts) вже були написані ІНШОЮ сесією до мого запуску
   (знайдено некомічені в дереві на самому старті attempt 5) і всі пройшли на вже написаному коді
   попередника без правок. Моя робота звелась до: (а) перевірити, що весь набір зелений, (б) для
   кожного тесту довести редом, що він реально ловить дефект (усі 9 підтверджено — жоден тест не
   виявився пустушкою), (в) прогнати повні гейти й закомітити.
