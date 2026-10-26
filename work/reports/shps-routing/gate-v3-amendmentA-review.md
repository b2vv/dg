claude-opus-4-8

# GATE v3 — Амендмент A — незалежне рев'ю (свіжий контекст)

ДАЛІ: читаю design-v3.md §Амендмент A + §Імплементаційна корекція, slice4-seam-analysis.md, і код-сайти (canvasLayout.ts, DiagramRenderer.ts, svgExport.ts, contourInputs.ts, orgBlockLayout.ts, ploeg_layout.rs).

## ФАКТИ (повне читання коду, не grep)

### Вісь 1 — Correctness/seam (grouping-in-layout → обом споживачам)
- ФАКТ: `canvasLayout.ts` офсетить вихід `layoutStaffOrgBlock` ПО ЯРУСАХ адитивно, НЕзалежно від
  внутрішнього розміщення блоку: tier1 :75-79 (`n.y += cursorY + zoneLabelBand`), tier2 :108-112
  (той самий патерн), tier3 :163-169 (`n.x += originX, n.y += originY`). Офсет не читає внутрішню
  структуру блоку → якщо grouping-гілка в `layoutStaffOrgBlock` поверне роз'єднані dept-регіони в
  ЛОКАЛЬНИХ координатах, офсет накладеться коректно на ВСІ яруси. Теза амендменту «grouping тече всім
  ярусам даром» ПІДТВЕРДЖЕНА на коді.
- ФАКТ: обидва споживачі кличуть `layoutStaffCanvas`: render `DiagramRenderer.ts:631`, export
  `svgExport.ts:194`. Отже згруповані `canvas.positionNodes` обидва отримують через один builder. ПІДТВ.

### Вісь 2 — One-builder інваріант (routing-only)
- ФАКТ: `contourInputs.ts:36-49` — `memberBoxesByDept` будується СУТО з node-боксів (`node.x/y/width/
  height`) + `positionById.departmentId` lookup. Жодного grouping-internal стану. Докблок :26-27
  підтверджує «both engines, matrix path and SVG export share this». Несуча теза амендменту (routing
  відбудовує deptFrames з canvas.positionNodes без grouping-стану) ПІДТВЕРДЖЕНА.
- ФАКТ: обидва routing-site читають `contourSceneInputs(canvas.positionNodes, positionById)` —
  render `DiagramRenderer.ts:721`, export `svgExport.ts:244`. Routing-боксы з
  `mapPositionNodesToStaffEdgeBoxes`/`mapStaffEdgeBoxesForLod` — render :789-799, export :270-283.
  Обидва деривуються з ОДНОГО canvas.positionNodes → спільний resolveStaffRouting над ними зберігає
  «one builder» (svgExport.ts:243 докблок). ПІДТВ. — амендмент не ламає, навіть зміцнює (спільний код
  менший: лише routing).

### Вісь 3 — Completeness
- 3a ФАКТ: caveat Cass rev (reorder-hint + re-callable з K-loop із самого початку) зафіксований в
  амендменті як умова ДО коду (design-v3.md:320-323, «зашити ЗАРАЗ, інакше блокер пізніше»). Import
  render→layout дозволений — базовий §Шов:101 це декларує; амендмент на нього явно посилається. OK.
- 3b ФАКТ: `pinExternalManagers` (`orgBlockLayout.ts:267/275`) — POST-step у `layoutStaffOrgBlock`
  ПІСЛЯ `layoutStaffOrgBlockCore`. Докблок :259-265: «post-step on purpose ... outside manager should
  not change the arrangement the layout chose». Pin рахує `offsetX = anchorMaxX + gap` (:235-237) над
  block.nodes — агностичний до внутрішнього розміщення. Grouping як гілка перед pin → pin лишається
  коректним (просто anchorMaxX більший при ширшій розкладці — benign). orgCards/tiers офсетяться в
  canvasLayout незалежно. Нічого не ламається. ПІДТВ.
- 3c ФАКТ: `ploeg_layout.rs:48` = `for child in node.children.iter().rev()` (grep точний). Інверсія
  §10.1.4 віднесена амендментом лише до сценарію (i) (design-v3.md:338). (i) = K-loop reorder-hint
  (саме там напрям x-порядку значущий); (ii) = routing-lane над ФІКСОВАНОЮ розкладкою (reorder не
  застосовується → напрям інверсії іррелевантний). Віднесення КОРЕКТНЕ логічно, не залежить від
  точного напряму реверсу. OK.

### Ключове питання — чи вводиться НОВА діра «routing/placement over different geometry»?
- ФАКТ: у render-path `renderStaffCanvas` (:600-671) всі downstream-споживачі читають ОДИН
  `canvas.positionNodes` з `layoutStaffCanvas:631`: zones(:665), departments(:666), frame/edges(:668),
  person-cards(:669), org-cards(:670). Grouping у layout → positionNodes вже згруповані на виході
  layout → усі фази на ОДНІЙ геометрії. Амендмент ПРИБИРАЄ render-side переприсвоєння positionNodes
  (яке базовий дизайн вимагав «ДО :665») → менше шва, не більше.
- ФАКТ: під (ii) grouping одноразове, K-loop лише обирає lane над фіксованими positionNodes — геометрія
  між ітераціями НЕ міняється. Під (i) амендмент явно вимагає «кожна ітерація перебудовує edge-boxes над
  НОВИМИ positionNodes перед re-score» (design-v3.md:337-338) → routing завжди скорить над поточною
  геометрією. Жодної stale/divergent геометрії.
- СПОСТЕРЕЖЕННЯ (поза scope амендменту, НЕ блокер): deptFrames будуються з СИРИХ node-боксів
  (contourSceneInputs), тоді як edge-боксы зсунуті `visualPersonEdgeBox` (`visualEdgeBox.ts:25-48`,
  gojs-row зсув y+cardH, figma-row inset до tile). Це розбіжність геометрій frame-vs-edge — АЛЕ вона
  ІДЕНТИЧНА в базовому design-v3 (п.2, §Шов) і НЕ міняється амендментом (grouping у layout чи render —
  deptFrames все одно з contourSceneInputs). Базовий GATE це пройшов (5 раундів). Зсув обмежений
  внутрішньокартковим chrome + frame має pad; членство gated на memberIds (не геометрія). Отже НЕ нова
  діра амендменту; варте уваги імплементатора, але поза межами цього міні-GATE.

РІШЕННЯ: три осі чисті. Амендмент A НЕ вводить нової діри класу «routing/placement over different
geometry» — навпаки прибирає render-side переприсвоєння positionNodes і єдинить геометрію на виході
layout. Escalation-клауза r3 не тригериться.

ВЕРДИКТ: 🟢 PASS
