# Ship-report — D1 interaction-store

**Фіча:** центральний interaction-store `{ selected, hovered }`, з якого обидва рендер-шари (React near + Pixi far)
читають один стан; near-hover переведено на store (не DOM-імперативно). Фундамент для R1/R2/R3 (ROADMAP D3→D1).
**Гілка:** `feat/d1-interaction-store`. **Коміти:** `abebeb6` (D1-A store) · `64871ed` (D1-B/C/D фасад+Pixi+demo) ·
`dc163e5` (D1-E opt-in гейт). **Дата:** 2026-11-05…06. Шість секцій + post-deploy.

## 1. Зроблено (дельта від плану)

- **D1-A** `InteractionStore` — композує `SelectionStore` (недоторканий) + `hovered: NodeRef|null`; єдина `subscribe`
  з ізоляцією слухача (try/catch warn-once) і snapshot-ітерацією; 0-змін=0-emit; selection-зміна теж емітить;
  `reconcile(isPresent)` чистить застарілий hovered.
- **D1-B** фасад: `selectionStore`→`InteractionStore`; публічні `subscribeInteraction`/`setHovered`/`InteractionState`;
  `setData`→`reconcile`; `onSelectionChange` незмінний; шов `setInteractionSource` у рендерер; USAGE+барель.
- **D1-C** Pixi: `DiagramRenderer.setInteractionSource`; PersonNode/OrganizationNode `pointerover`→store; hoverRing зі
  state (near/mid єдине джерело); **far-LOD hover НЕ додано** (R1); акцент selected>hovered; `relatedStaffIds`+
  `staffDimmedIds` перенесено в SDK (`render/staffRelated.ts`, селектори на льоту, не поле).
- **D1-D** demo: прибрано DOM-імперативний `installStaffHoverHighlight`; картка/backdrop через `subscribeInteraction`+
  `setHovered`; demo споживає перенесений `relatedStaffIds`.
- **D1-E (дельта від плану, рішення власника 2026-11-06):** interaction-source **opt-in** — фасад ставить його ліниво
  на перший `subscribeInteraction`/`setHovered`, не при create. Хост байт-у-байт, поки не підпишеться.

**Відхилення від плану:** (1) `reconcile(isPresent)` замість `reconcile(data)` — чистіше (store без data-куплінгу);
(2) **D1-E opt-in гейт — НЕ було в плані**, додано після знахідки (нижче §3), щоб честити §7 «хост не змінюється».

## 2. Протестовані сценарії

- **Приймання:** усі 17 рядків `plan.md §9` (основний 10 вкл. #7f far-deferred, межі/відмови 6, ручний #16).
  Spec-рев'юер змапив кожен на тест «red-if-deleted».
- **Прогони:** повний SDK-сьют **177 файлів / 1498 тестів / 0 падінь**; demo **18 / 134 / 0**; root typecheck
  (sdk+demo+e2e), build, повний root test, `typecheck -w`, `lint`, `check:docs` — усі зелені.
- **Мутації (координатор, KILLED):** D1-A 2/2 (ізоляція слухача, snapshot-ітерація); D1-C far-LOD guard;
  D1-E byte-for-byte — RED-before підтверджено (безумовне wiring → host-not-opted-in тест падав).

## 3. Неочевидні знахідки

- **Opt-in дірка (критична, хост-видима; cass флагнув, координатор звірив, рев'ю пропустило).** Фасад ставив
  `setInteractionSource` безумовно → рендерер приглушував непов'язані (`staffDimmedIds`) на Pixi-hover для КОЖНОГО
  споживача, включно з хостом (раніше dimming був demo-only). Суперечило плану §7. Обидва інтегровані рев'ю
  (Standards+Spec) GREEN це пропустили — перевіряли selection-паритет (AC1), не hover-dimming хоста. Закрито D1-E
  (opt-in). **Урок:** «no behavior change» треба перевіряти проти РЕАЛЬНОГО споживача (хоста), не лише юніт-паритету;
  крос-сесійний флаг хоста спіймав те, що два незалежні рев'ю — ні.
- **reconcile без data-куплінгу:** предикат `isPresent` замість `data` тримає store чистим і тестованим.
- **far-LOD hover — свідомо відкладено в R1** (B1 critique): D1 уніфікує наявні near/mid джерела, far-painting — окремо.

## 4. Скріншоти

Нема — перевірка на рівні бібліотеки (unit/integ у rstest). Візуальна — рядок #16 (ручний, на стенді, коли хост
увімкне interaction).

## 5. User-flow

- **Хост БЕЗ opt-in:** нічого не змінюється — selection як є, Pixi-hover локальний (hoverRing), 0 related-dimming.
- **Хост/demo opt-in:** `diagram.subscribeInteraction(state => …)` або `diagram.setHovered(ref)` → ставиться
  interaction-source; тепер hover маршрутизується через store, обидва шари рендерять акцент, related-dimming на льоту;
  `setData` чистить застарілий hovered; selected виграє акцент над hovered.

## 6. Ризики й обмеження

- **Спільний dist / живий хост:** збірка = деплой у стенд (протокол: cass-ок + власник). dist перезібрано з `dc163e5`.
- **far-LOD hover painting** НЕ реалізовано — R1 (потрібен pointermove-hit-test writer).
- **Emphasis** `{found,highlight}` поза D1 (окремий власник; AC5 цілий). `focused`/a11y відкладено.
- Нова публічна поверхня: `subscribeInteraction`/`setHovered`/`InteractionState`/`relatedStaffIds`/`staffDimmedIds` —
  видалення після підписки хоста = breaking (семвер-мажор, plan §7).
- Рев'ю-процес: інтегровані рев'ю не ловлять хост-видимі зміни без явного «проти реального споживача» мандата — див. §3.

## Post-deploy

- dist перезібрано з `dc163e5`; cass-13 повідомлено фінальний SHA + підтверджено, що хост не змінюється (opt-in).
- Гейти: root typecheck + build + повний root test зелені (sdk 1498/0, demo 134/0).
- Пост-деплой на стенді (рядок #16, hover через LOD) — коли хост увімкне interaction; лишається ручним.
