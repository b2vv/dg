model: claude-opus-4-8

# Інспекція кроку I1 (SDK-шов геометрії під заміну GoJS)

ДАЛІ: читаю контракт (_form-b2-geometry-getter.md) і план (_plan-b2-impl.md, секція I1), далі diff робочого дерева.

## ФАКТ — прочитано контракт + план + повний diff I1
Змінено: docs/USAGE.md, OrgHierarchyDiagram.ts, index.ts, render/DiagramRenderer.ts,
render/index.ts, render/staffChromeGeometry.ts, render/types.ts. Нові тести:
staffChromeBuild.test.ts, staffChromeCache.test.ts. Демо НЕ чіпалося (підтверджено git status).

## ФАКТ — п.1 кеш-лайфцикл: КОРЕКТНО
- reset `lastStaffChrome=null` на ВЕРХУ render() (DiagramRenderer.ts:470), поряд з lastDiagnostics.
- set non-null ЛИШЕ в reactChrome-ON гілці (DiagramRenderer.ts:710-717), ПІСЛЯ
  isRenderCurrent(epoch) на :677. Між :677 і :712 немає await → epoch не зміниться → stale-рендер
  виходить на :677 до set. Конкурентні рендери: новіший скидає кеш на :470 і ставить свій.
- Шляхи org-view (:484 renderOrganizations) і grid (:655 renderPositionGrid) у renderStaffCanvas
  НЕ заходять → reset на верху гарантує null. reactChrome-off → else-гілка (:718), set пропущено.
- Тест staffChromeCache.test.ts ПЕРЕХІДНИЙ (не assert-true): тест3 (alpha→org-only) червонів би,
  якби reset був усередині renderStaffCanvas (org-view туди не заходить → stale box); тест4
  (alpha→chrome-OFF) червонів би без reset-на-верху. Обидва — справжні переходи alpha→non-alpha.

## ФАКТ — п.2 контракт-типи: ВІДПОВІДАЄ
- StaffChromeGeometry БЕЗ foundId (staffChromeGeometry.ts:97-103); тест явно asserts
  `'foundId' in geom === false`.
- StaffChromePad {x,top,bottom?}, DEFAULT {x:20,top:44} (:118). Set-once: renderConfig зберігається
  на інстансі (OrgHierarchyDiagram.ts:265/372 spread `config.render`), передається кожному render —
  дзеркало, не per-call перерахунок. config.staffChromePad читається лише в DiagramRenderer:716.
- getter повертає null до 1-го рендеру й поза alpha (підтверджено кешем + тестом).
- НЕДОЛІК (неблок): валідації x≥0/top≥0 (N5 контракту) НЕМА ніде. План сам відклав це
  («узгодити з власником у фіналі», ризик №1), тож документований-але-незабезпечений інваріант.
  Негатив не крешить — дає меншу рамку. Також немає окремого pad-сеттера; лише конструктор-опції
  (контракт дозволяє «options діаграми (або сеттером)», тож прийнятно — set-once буквально).

## ФАКТ — п.3 computeStaffFit: МАТЕМАТИКА КОРЕКТНА, кламп збігається
- axis 'width'/'both', align 'top'/'center', clamp [minScale,maxScale] — staffChromeGeometry.ts:168-199.
- Тести ловлять фічу незалежною арифметикою (не тавтологія): cap/floor/axis=both/align=center.
- Страж [0.15,4] = реальні Viewport DEFAULT_MIN_SCALE/MAX (Viewport.ts:25-26) — ЗВІРЕНО. [0.55,1]⊂[0.15,4].
  (fitStaffChrome-фасад — це I3, не I1; тут лише чиста функція, експортована й протестована — трохи
  наперед, нешкідливо.)

## ФАКТ — п.4 buildStaffChromeGeometry: ПЕРЕНОС ТОЧНИЙ
- Звірено з демо StaffChromeBackdrop.ts:72-139. Відмінності: pad тепер параметр (було хардкод
  PAD=20/TOP=44), foundId прибрано, bottom = pad.bottom ?? pad.x. З дефолтом поведінка тотожна
  (bottom=20=PAD). Решта (AABB frames+positionNodes, dept name/count join, lines, nodeBoxes) — 1:1.
- Мутаційний тест pad (staffChromeBuild.test.ts:81-99): base{x10,top10} vs wider{x30,top50,bottom5} —
  різні значення; зміна pad-математики червонила б.

## ФАКТ — п.5 барелі + USAGE: ПОВНО Й ПРАВДИВО
- render/index.ts і index.ts експортують buildStaffChromeGeometry, computeStaffFit,
  DEFAULT_STAFF_CHROME_PAD + типи WorldPoint/StaffChromeGeometry/StaffChromePad/StaffFitOptions/
  ChromeDeptFrame/ChromeLine/NodeBox.
- OrgHierarchyDiagram.getStaffChromeGeometry() форвардить `renderer?.…() ?? null` (:1852).
- USAGE §13.x («Геометрія хрому ШПС») описує null-семантику, foundId-відсутність, pad, focusNode —
  усе звірено з кодом, правдиво. facadeSurface-гейт бачить ім'я методу (substring). check:docs ✓ в автора.

## ФАКТ — п.6 інтеграція/межі: ЧИСТО
- Демо не чіпалося → наявні споживачі цілі; демо-копія buildStaffChromeGeometry + її тест валідні
  (дубль свідомий, міграція — окремий крок плану).
- types.ts→staffChromeGeometry.ts import ЛИШЕ type-only (StaffChromePad); staffChromeGeometry.ts НЕ
  імпортує з types.ts → жодного рантайм-циклу (type-only стирається). Підтверджено typecheck+тестами.
- addStaffPersonCards/OrgCards (:724-725) біжать і в reactChrome-гілці — наявна поведінка, не I1.

## Запуск цільових тестів
`npm run test -w @org-hierarchy/sdk -- staffChrome`: 24/0 (build 13, cache 4, базовий geometry 7). Зелено.

## РІШЕННЯ — ВЕРДИКТ: FIT. Перевірено 6 із 6.
Блокерів немає. Неблокувальне:
1. Pad N5-валідація (x≥0/top≥0) не забезпечена — план свідомо відклав власнику; документований
   інваріант без enforcement. Варто закрити у фіналі Б2 (дефолт-при-негативі чи throw).
2. computeStaffFit присутня наперед (I3-поверхня) — нешкідливо, протестовано.
Жодної дірки між «зелено в автора» і «крок реально зроблено».
