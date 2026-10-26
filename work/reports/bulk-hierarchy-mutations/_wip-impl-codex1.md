# codex-run 1 — T-BM1 + T-BM2 + T-BM3 (типи + position-мутації, tests-first)

Append-only, по кроках.

---

ДАЛІ: Прочитати контракт, правила репозиторію та наявні helpers; написати red-тести T-BM1–3, реалізувати й пройти tsc/oxlint/rstest без коміту.

КРОК 1: Контракт і типи прочитані; гілка bulk-mutations, сторонній WIP зафіксований і поза scope. Шви тестів уже погоджені користувачем: transferChildren/deleteSubtree над DiagramData, A1–A7/D1–D7 та self-no-op. NB-a має пріоритет над старим AC1. Pre-code: лише interaction/bulkMutations.ts, його тести, два LayoutPatch; без facade/org/docs/commit. Валідація перед змінами, downward BFS із seen; reuse rosterOf і replace-семантики reparentPosition без зайвих head-обмежень для transfer. ДАЛІ: red для transfer.

КРОК 2: Створено transfer-тести A1–A7, self-no-op, duplicate-parent replace та downward-cycle. RED: rstest exit 1, модуль ще відсутній (/tmp/bulk-transfer-red.log). Початкова команда запису мала помилковий відносний шлях; повторено з правильного cwd, сторонні файли не змінені.

УТОЧНЕННЯ КРОКУ 2: фактичний RED ще НЕ підтверджений: rstest не дійшов до collection через sandbox listen EPERM ::1:3000. Попереднє пояснення exit 1 як missing module відкликано. ДАЛІ: знайти дозволений запуск рушія, не підміняти rstest.

КРОК 3: До реалізації додано D1–D7, cycle-seen, N1, збереження спільних/раніше осиротілих persons та immutability. rstest RED заблокований портом; tsc RED перевіряє відсутній модуль. Реалізацію продовжую в дозволеному scope; behavioral red/green лишається NOT_TESTED до запуску в середовищі з портом.

КРОК 4: Реалізовано дві Summary, два LayoutPatch і pure transfer/delete. rosterOf перевикористаний; adminParentsOf не викликається, бо last-parent-wins губить ребра для downward BFS (окремий тест). Replace виконано одним filter+append, без додаткових root/unchanged відмов одиничного reparent. Видалення очищає тільки осіб, осиротілих саме через removal-set, і parentPositionId=null. ДАЛІ: гейти.

КРОК 5 / ФІНАЛЬНИЙ CHECKPOINT:
1. Зроблено: T-BM1–3 implementation у packages/sdk/src/interaction/bulkMutations.ts; дві Summary; callbacks.ts +2 patch-варіанти. Org, facade, docs, barrel та сторонній WIP не змінювались. Комітів немає.
2. Сценарії: bulkMutations.test.ts містить 15 тест-кейсів після розгортання it.each: A1–A7, NB-a, replace duplicate-parent, downward traversal з multiple parents; D1–D7, N1, shared/existing-orphan persons, cycle seen-guard, immutability success/failure. Тести записані перед реалізацією. tsc RED підтвердив відсутність модуля; behavioral RED НЕ підтверджений через середовище.
3. Неочікуване: rstest відкриває локальний порт навіть для unit run. Targeted і повний запуск зупинилися до collection: listen EPERM ::1:3000. Не видавати це за падіння тесту чи успішний TDD цикл.
4. Гейти: `cd packages/sdk && npx tsc -p tsconfig.check.json` exit 0 PASS; `npx oxlint --max-warnings 0 src/interaction/bulkMutations.ts src/interaction/bulkMutations.test.ts src/callbacks.ts` exit 0 PASS; `npx rstest run` exit 1 BLOCKED (sandbox networking). Повний вивід: /tmp/bulk-full-rstest.log; targeted: /tmp/bulk-transfer-red.log; types-red: /tmp/bulk-types-red.log. `git diff --check` exit 0.
5. Обмеження: baseline 1128 та 15 нових кейсів НЕ перевірені виконанням; незалежне review і mutation-testing не проводились. Функціональний gate залишається відкритим, не оголошувати T-BM1–3 повністю прийнятими.
6. Далі: у середовищі з дозволеним local listen виконати targeted rstest, потім повний rstest; при падіннях виправити тільки погоджений scope. Run 2–4 не починались.
Post-deploy: N/A — лише pure SDK-функції, без деплою за цим дорученням.
Session guard: операторського mapping для dispatch checkpoint у цьому дорученні немає; шляхи store/receipt не вигадані. Durable checkpoint — цей явно заданий append-only файл.
