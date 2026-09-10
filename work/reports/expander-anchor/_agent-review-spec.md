
---
# Агент-рев'ю: специфікаційна вісь (expander-anchor)
Старт: 2026-09-11

ДАЛІ: прочитати spec.md, plan.md (§8 — 18 сценаріїв, Д1–Д4, Г1–Г4′), tasks.md (К1–К8),
T115; тоді `git log a8043a0..HEAD --oneline` і `git diff a8043a0...HEAD --stat`.

ФАКТ: spec.md прочитано. 17 критеріїв A1–A17 + 5 сценаріїв С1–С5. Ключове:
- A9/A13 — клік по якорю експандера НЕ виділяє вузол (нова гілка кліку, Г1)
- Г2 — станів «чому кнопки немає» ПʼЯТЬ причин / ТРИ стани для хоста; §14 має назвати третій
- Г3 — hasChildren НЕОБОВʼЯЗКОВЕ, лише для kind==='organization' (A15)
- Г7 — promote: бокс не віддається (A16)
- A17 — зум ≠ 1 і два послідовні рендери
- Out of scope: якір org-menu, якір штатного chevron, перейменування initContourWasm
ДАЛІ: plan.md §8 (18 сценаріїв) + Д1–Д4 + Г1–Г4′.

ФАКТ: plan.md прочитано. §8 = 18 сценаріїв (1-2,8 поведінка; 3-5 стани; 12-15 межі; 6,7,9,10,11,16,17,18 решта).
Д1 toggleOrgExpand(orgId): Promise<boolean>; Д2 hasChildren тільки для org; Д3 плоскі числа при монтуванні;
Д4 promote-виняток у listTestAnchors (не в рендерері!).
Г2′ orgTreeChrome — опція, не підписка; має бути задокументована в USAGE.
Г3′ ще gojsTreeExpander. Г4′ .catch в оверлеї.
ДАЛІ: tasks.md (К1–К8 «готово, коли»).

ФАКТ: tasks.md прочитано; усі К1–К8 позначені [x], із багатьма самокритичними примітками
(мутаційне тестування, регресія contextmenu у К5, e2e 78→81).
ДАЛІ: діф по коду — SceneRegistry, OrganizationNode, DiagramRenderer, nodeTestId,
OrgHierarchyDiagram, createTestAnchorOverlay, orgNodeChrome, nodeCardChrome.

ФАКТ (код К1–К4): геометрія коректна — icon btn.x/btn.y = top-left, 22×22 (CHROME_BTN_SIZE);
gojs btn.x = cx-13, btn.y = cy-13, 26×26. worldExpanderBox = card + local, без getBounds.
ФАКТ: orgHasChildren доданий у layout/index.ts, але НЕ в кореневий index.ts → публічна поверхня не росте.
ФАКТ: штатний шлях rememberBox свідомо не кладе ні expander, ні hasChildren (К2 — так і задумано).
ФАКТ: orgNodeChrome заповнює expanderBox і для штатного chevron (без споживача) — свідомо, коментар є.
ФАКТ: toggleOrgExpand — два охоронці (!org, !orgHasChildren) + re-read після await.
ФАКТ: promote-виняток у listTestAnchors через promoteIdMatches (наявний helper), не в рендерері → Д4 дотримано.
ДАЛІ: createTestAnchorOverlay.ts + тести.

ФАКТ (покриття §8): 1✓ 2✓ 3✓ 8✓ 9✓ 10✓ 11✓ 12✓(два тести) 15✓(рівністю) 16✓ 17✓ 18-частково(немає тесту на дедуплікацію testId).
НЕ покриті тестом: 5 (orgTreeChrome:false — grep дає лише ViewStateStore), 13 (два послідовні рендери), 14 (зум ≠ 1), 7 (hasChildren лише для org — жодного тесту на person/position).
Часткові: 4 (far LOD доведено на view.expanderBox(), не через listTestAnchors, і пара hasChildren=true не пінена), 6 (штат — поле свідомо НЕ заповнюється, що суперечить A4/В3 спеки; тесту на штатну сцену теж немає).
ДАЛІ: docs/USAGE.md §14/§7 vs код + CHANGELOG 0.5.0.

ФАКТ (доки vs код): §7 таблиця «вхід → відповідь → кадр» збігається з двома охоронцями
toggleOrgExpand + re-read. §14 сім станів звірено: 1 лист ✓, 2 orgTreeChrome (facade :781/:786 гейтить
onOrgExpand/onOrgCollapse, DiagramRenderer вимагає їх для tree-chrome) ✓, 3 far LOD (applyChrome
повертає до монтування, hasChildren лишається) ✓, 4 штат (rememberBox :885 не кладе жодного) ✓,
5 promote ✓, 6a/6b (screenRectInView двічі) ✓, 7 впалий кадр ✓, восьмий — прозою, коректно.
gojsTreeExpander свідомо НЕ в переліку: він міняє лише геометрію (types.ts:151 «brand circle vs legacy chip»),
кнопка лишається → правильно.
ФАКТ: applyChrome кличеться ЛИШЕ з create (:194) → застарілого боксу структурно не буває (сценарій 13
безпечний, хоч і без тесту).
ФАКТ (прогони): check:docs exit=0; rstest по 4 файлах 57 тестів, 0 падінь; build -w sdk exit=0 (0.5.0);
package-lock 0.3.0 → 0.5.0.
РІШЕННЯ: фінальні знахідки — (а) 6 дірок покриття + розходження A4/штат; (б) merge cost-тестів у
діапазоні + незамовлений expanderBox для штатного chevron; (в) суттєвих не знайдено, лише дві
косметичні неточності доків.
