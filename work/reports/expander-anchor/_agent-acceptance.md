
---
## Сесія acceptance-spec (2026-09-10)

ДАЛІ: читаю spec.md повністю, gate1-grilling, decisions.md §Рішення 1.

ФАКТ: spec.md прочитано повністю (сценарії С1-С5, A1-A17, out of scope, В1-В3 відповіді хоста, Г1/Г2/Г3/Г7).
ФАКТ: _agent-gate1-grilling.md прочитано (Q1-Q10, деталі механіки кліку/geometry/lod/promote/two-renders).
ФАКТ: decisions.md §Рішення 1 прочитано — форма A (expander?: WorldBox + hasChildren) обрана, варіанти B/C відхилені.
ДАЛІ: шукаю наявні тестові файли — listTestAnchors, createTestAnchorOverlay, e2e flat-orgs, demoBridge, щоб знати що вже покрито.

ФАКТ: createTestAnchorOverlay.ts:82-93 — єдиний обробник click на всі якорі, кличе лише `diagram.focusByTestId`. Підтверджує Г1: якоря для кнопки поки не існує, клік по картці й клікатиме, й виділятиме.
ФАКТ: createTestAnchorOverlay.test.ts — 3 тести, усі на якір вузла (`node-root`), жодного на майбутній `-expander` якір. Юніт для нової гілки кліку — НОВИЙ.
ФАКТ: OrgHierarchyDiagram.ts:1448-1468 listTestAnchors() — 0 юніт-тестів прямо на нього (grep по .test.ts дав 0 у OrgHierarchyDiagram.test.ts і .interactions.test.ts). Юніти на hasChildren/expander-бокс — НОВІ.
ФАКТ: expandOrg (:876) і collapseOrg (:894) вже публічні, вже задокументовані — підтверджує поправку Г1 гейта («поріг двічі» — хибний).
ФАКТ: DiagramRenderer.ts:1097-1127 orgTreeCardOptions — без жодного з onOrgContextMenu/onOrgExpand/onOrgCollapse `base` без chrome; з ними, але без hasChildren||(expand||collapse) — теж без chrome. Підтверджує Г2 третій стан. Немає юніт-тесту, що прямо це доводить (grep по DiagramRenderer.test.ts не існує файлу) — НОВИЙ.
ФАКТ: orgNodeChrome.ts:28,118 hasStaff — вже є (0.4.1), покрито OrganizationNode.test.ts:424,436 — існує, регресія, не новий.
ФАКТ: e2e/flat-orgs.spec.ts:20,23 — `expandOrg(page,'org-1')` через `window.__demoE2e` (demoBridge.ts:5-11) — це та сама дірка з С4/A8, потребує переписати на клік по якорю. Рядок :5-15 (клік по node-root) і :72 (клік по node-root) — DOM-шлях уже є для ВУЗЛА, не для кнопки.
ФАКТ: SceneRegistry.test.ts:38 вже має тест "promoting an id hides its view, and the set survives a clear" — придатний прецедент для A16, але не для expander-бокса конкретно — НОВИЙ тест потрібен саме для експандер-поля.
ФАКТ: layoutDiagnostics.test.ts:94 — прецедент "survives a second render", придатний шаблон для A17, конкретного тесту на listTestAnchors після двох рендерів немає — НОВИЙ.
ФАКТ: демо App.ts:520-524 — #status показує `N selected`, той самий елемент уже читають наявні e2e (flat-orgs.spec.ts :49,:60) — придатний спостережуваний проксі для "не виділив" в e2e.
ФАКТ: package.json — `npm run test -w @org-hierarchy/sdk` (rstest run), `npm run test:e2e` (playwright test), `npx playwright test --list` для звірки числа (з A8/A9/A13 приписки спеки).
РІШЕННЯ: не вигадую окремого runtime-сигналу для розрізнення С3-стану 2 проти 3 (LOD far vs немає підписки) — хост і так знає, чи передав onOrgExpand/onOrgCollapse; розрізнення документне (§14), не API. Тест лише доводить, що для стану 3 бокса нема незалежно від LOD/зуму.
ДАЛІ: компоную фінальну таблицю сценаріїв (~16 рядків), позначаю NEW/existing, перевіряю по коду назви файлів ще раз.
