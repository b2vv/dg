# codex-run 3 — T-BM6 (барель + фасад-методи, tests-first)

Append-only.

---

ДАЛІ: Прочитати план T-BM6, настанови та зразки; спочатку написати фасадні тести, потім додати барелі й 4 async-методи. Перевірка: tsc та oxlint; без rstest, docs і комітів.

КРОК 1: Прочитано T-BM6, контракт no-op і commitDataChange(next, patch), зразки фасадних тестів та локальні стандарти. Seam погоджено користувачем: 4 публічні методи, getData, onLayoutChange. GATE 2 PASS успадковано з доручення; рішення плану не змінюю. Scope: 2 барелі, фасад, новий тест; writer codex3. Наявний WIP поза scope зберігаю. Runtime red/green і mutation runs NOT_TESTED за прямою забороною rstest; далі тести перед реалізацією.

КРОК 2: Перша спроба запису тесту мала помилку cwd (файл не створено); виправлено абсолютним шляхом. Тести створено ПЕРЕД реалізацією: 4 happy-path, 6 unknown-id відмов, 4 no-op. Попередній tsc до створення тесту: exit 0, не доказ нової поведінки.

КРОК 3: tsc після тестів exit 1: 12 звернень до відсутніх методів + пропущений isTemporary у fixture. Fixture виправлено. Це compile-time red, не runtime red. Далі мінімальні обгортки за планом.

КРОК 4: Додано 4 функції й 4 Summary-типи до interaction/public барелів та 4 async-методи. Transfer повертає порожній summary до commitDataChange; delete завжди commit; validation не дублюється. Чисті функції/callbacks/docs не редаговано.

КРОК 5: Гейти PASS: (packages/sdk) npx tsc -p tsconfig.check.json — exit 0; npx oxlint --max-warnings 0 packages/sdk/src/OrgHierarchyDiagram.ts packages/sdk/src/interaction/index.ts packages/sdk/src/index.ts packages/sdk/src/render/bulkMutations.fasade.test.ts — exit 0. rstest не запускався.

КРОК 6 / ФІНАЛ T-BM6 (HEAD 530d24ca568a33181ee753ac866abe8aa4c4c88d, bulk-mutations):
1. Зроблено: 4 async-обгортки в OrgHierarchyDiagram; 4 value + 4 type експорти в обох барелях; новий render/bulkMutations.fasade.test.ts. Зміни лише у цих чотирьох TS-файлах і цьому журналі.
2. Перевірки: tsc exit 0, oxlint по всіх чотирьох файлах exit 0; git diff --check exit 0. Написано 14 сценаріїв: 4 success/summary/data/точний patch, 6 unknown-id/InteractionError/byte snapshot/без patch, 4 no-op/порожній summary/без patch. rstest NOT_TESTED, координатор запускає сам; файл входить у src/**/*.test.ts.
3. Знахідки: commitDataChange емітить безумовно, тому обидва transfer мають ранній return; self-transfer покрито також. Fixture потребує isTemporary: false.
4. Обмеження: runtime і mutation evidence NOT_TESTED; compile-time red не є runtime red. check:docs не запускався — документація в run 4. Session-guard runtime checkpoint не запускався: operator-approved mapping для store/session не наданий; durable стан збережено тут.
5. Збережено: run 1/2 pure-функції, callbacks та всі сторонні хвости; docs не редаговано; комітів немає.
6. Далі координатору: прогнати rstest, продовжити T-BM7/docs та загальний review. T-BM6 виконано за гейтом цього доручення, не заявляю runtime PASS.
Post-deploy: N/A — деплою не було.

ДАЛІ: Виправити лише staff-фікстури bulkMutations.fasade.test.ts: рівно одна голова в кожній залученій org до й після операцій; deleteSubtree видаляє non-head. Перевірити tsc та oxlint; rstest не запускати, без коміту.

READY (fixture-only correction): root /Users/strelia/projects/dg, branch bulk-mutations; writer Codex for the single assigned test file. Existing product/WIP changes belong to other work and remain untouched. Direct-file fallback: inspected resolveStaffHead, the facade test, and interactions.test.ts mounting pattern; no graph needed for fixture-only scope. User supplied the diagnosis and acceptance gates, so no additional product decision or planning review is needed. Plan: default head `from` in a; deleteSubtree fixture uses head `to`; add root/b/child heads; staffCurrentOrgId=root; update surviving/deleted position expectations. Runtime verification remains coordinator-owned; only tsc and targeted oxlint run here.

ЗРОБЛЕНО: makeData(headPositionId = 'from') задає рівно одну isHead у a; root/b/child отримали окремі head-позиції. mount приймає фікстуру і задає staffCurrentOrgId=root, що переживає всі операції. deleteSubtree використовує makeData('to'): видаляються non-head from/c1/c2, to лишається головою. Оновлено списки positions після видалень та removedPositionIds для deleteOrgSubtree (додано child-head). No-op/atomicity використовують ту ж валідну default-фікстуру.
ПЕРЕВІРКИ: packages/sdk: `npx tsc -p tsconfig.check.json` — exit 0; `npx oxlint --max-warnings 0 src/render/bulkMutations.fasade.test.ts` — exit 0. Перший tsc виявив розширення status до string після spread/map; виправлено явним map<DiagramPosition>, повторний gate PASS. `git diff --check` — exit 0.
НЕОЧІКУВАНЕ: лише описаний TypeScript inference; продуктових змін не потрібно.
МЕЖІ: rstest НЕ запускався за дорученням; runtime PASS не заявляється. Продуктовий код не змінював; коміт не створював.
ДОКАЗ: HEAD 530d24ca568a33181ee753ac866abe8aa4c4c88d; test SHA-256 2ff8fb4a4befbe3db63c263394aea8fbc4c7333b2e8d5bd54cfec2702260fdb0. Змінені мною лише призначений test і цей append-only журнал.
ДАЛІ: координатор запускає rstest для виправленого fasade-тесту. Post-deploy N/A: fixture-only, без deploy. Session-guard runtime checkpoint не викликано: operator-approved mapping для store/session не надано; durable checkpoint збережено тут.
