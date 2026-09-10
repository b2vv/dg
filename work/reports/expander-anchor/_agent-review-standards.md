
## Standards review (agent) — start
ДАЛІ: читаю `.claude/standards.md`, `work/CODING_STANDARDS.md`, `work/TDD.md`, потім `git log a8043a0..HEAD` і `git diff a8043a0...HEAD --stat`.

ФАКТ: стандарти прочитано. Мірник = CODING_STANDARDS (лише TS у sdk/demo), TDD.md (увесь репо),
docs/USAGE.md (публічний API), AGENTS.md. Конституція: тести перед кодом (success+failure),
KISS>SOLID>DRY>CleanCode>CleanArch>GoF>Pocock, GoF лише за ≥2-3 повторень, межа WASM↔TS,
публічний API не змінюється мовчки, Pocock лише TS.
ФАКТ: у діапазоні 16 комітів Rust не змінювався (стат: жодного .rs). Дифу 30 файлів, +1809/-146.
ДАЛІ: читаю прод-код дифу: createTestAnchorOverlay.ts, orgNodeChrome.ts, OrganizationNode.ts,
DiagramRenderer.ts, SceneRegistry.ts, nodeTestId.ts, nodeCardChrome.ts, OrgHierarchyDiagram.ts.

ФАКТ: прод-код прочитано. Ключове:
- `nodeTestId.ts`: `TestAnchorCandidate.expander?` + `hasChildren?` (обидва optional, inline rect).
- `SceneRegistry.NodeWorldBox`: те саме inline-поле `expander?` + `hasChildren?`.
- `orgNodeChrome.ts`: новий `ChromeBox` (координати картки) + `expanderBox` у mount; штатна гілка
  (`hasStaff`) заповнює `expanderBox` **без споживача** — у DiagramRenderer штатний шлях свідомо
  НЕ кладе ні `expander`, ні `hasChildren` (коментар :885). → кандидат Speculative Generality.
- `DiagramRenderer.worldExpanderBox()` — локальний → світовий, повертає `Pick<NodeWorldBox,'expander'>`.
- `OrgHierarchyDiagram.toggleOrgExpand()` — новий публічний метод, explicit return type є.
- `createTestAnchorOverlay`: винесено `placeAnchor()`, друга гілка кліку + contextmenu.
ПИТАННЯ: чи чотири структурно однакові rect-типи (ChromeBox / NodeWorldBox.expander /
TestAnchorCandidate.expander / TestAnchorCandidate.world) = Data Clumps? Репо-прецедент `world`
inline уже був до дифу.
ДАЛІ: порядок комітів (TDD: тест перед impl), docs/USAGE.md §14, CHANGELOG/версія, e2e.

ФАКТ: TDD — у кожному кроці тест і impl в ОДНОМУ коміті (`feat(...)`), не окремим RED-комітом
(TDD.md §4 крок 3/4 приписує split; §8 дозволяє «в тому ж PR першим комітом перед impl»).
Success+failure є в усіх чотирьох нових тест-файлах — конституційний рядок виконано.
ФАКТ: `e2e/demoBridge.ts:5 expandOrg` після дифу БЕЗ ЖОДНОГО виклику (єдиний імпорт прибрано
у flat-orgs.spec.ts). oxlint не ловить (експортована). CODING_STANDARDS §7 «Dead code: видаляти»
формально НЕ діє: `e2e/` поза `packages/sdk|demo`. → судження, не тверде порушення.
ФАКТ: докам вірю — `getLastRenderFailure()` (:870) і `orgTreeChrome` (:131) справді існують.
ФАКТ: `flat-orgs.spec.ts` — коментар «T115 крок 2: розгортання йде через якір у DOM» ДВІЧІ
в одному блоці (рядки ~22 і ~30). Duplicated Code (у коментарях) + Clean Code «коментар».
ДАЛІ: змержена гілка cost-тестів (4 файли) + tasks.md/CTO-RESEARCH.

ФАКТ: `render/promoteMath.ts:12` уже експортує `WorldBox {x,y,width,height}` (публічний, у барелі),
і саме його їсть `worldBoxToScreen`, якому оверлей передає `anchor.expander`. Тобто новий
inline-тип двічі (`SceneRegistry.NodeWorldBox.expander`, `TestAnchorCandidate.expander`) дублює
наявне доменне ім'я. → Data Clumps / DRY §4 «спільні типи, не copy-paste».
ФАКТ: `TestAnchorOverlayDiagram` публічно експортований із `@org-hierarchy/sdk/react`
(`react/index.ts`), і діф додав у нього **обов'язковий** член `toggleOrgExpand`. У CHANGELOG 0.5.0
рядка про це немає. Хост із власною заглушкою зламається на компіляції.
ФАКТ: `orgHasChildren` доданий лише в `layout/index.ts`, у публічний барель `src/index.ts` НЕ
потрапив → нової недокументованої публічної поверхні немає. `toggleOrgExpand` у docs/USAGE.md є.
ФАКТ: у прод-TS дифу немає жодного `as` / `any` / `!` / `@ts-`. Усі касти — в тестах, і там уже
був прецедент (`a8043a0:createTestAnchorOverlay.test.ts:59` — `as HTMLButtonElement`;
`as unknown as` — у 12 тест-файлах). → придушено, репо перемагає.
РІШЕННЯ: тверде — TDD.md §4 (немає окремого RED-коміту; тест+impl в одному `feat:`); решта — судження.
