# codex-run 2 — T-BM4 + T-BM5 (org-мутації, tests-first)

Append-only.

---
ДАЛІ: Прочитати інструкції, план/задачі/spec і наявний код; написати org-тести першими, додати типи й реалізацію, перевірити tsc та oxlint без rstest.

КРОК 1 — Прочитано plan/tasks/spec, orgTree, data types, callbacks і Run 1. Гілка bulk-mutations; наявні сторонні dirty/untracked файли не чіпаю. Scope: T-BM1 org-доповнення, T-BM4, T-BM5; seam — чисті функції bulkMutations (задано користувачем). Reuse: validateOrgHierarchy + extractSubtree з трансляцією OrgHierarchyError. NB-b: guard перед обходом; B1: survivor groups = orgs ∪ positions. План GATE 2 PASS за дорученням; нове погодження не потрібне. Гейт цього run: написані success/failure тести + tsc/oxlint; rstest виконує координатор. File fallback: безпосередньо прочитано джерела, graph не потрібний для цього scope. Session-guard: operator-approved mapping для runtime checkpoint не надано; durable checkpoint ведеться тут, без вгадування шляхів/store/session.

КРОК 2 — T-BM4 тести написані ПЕРЕД реалізацією: O1–O3, self/no-children no-op, unknown обидва боки, прямий/глибокий нащадок, рух до предка, наявний цикл, незмінність input. Функція ще не експортується; runtime RED не запускався (заборона rstest). READY для цього slice, HEAD 530d24ca568a33181ee753ac866abe8aa4c4c88d; writer codex2, наступні facade/docs — координатор.

КРОК 3 — Додано два org LayoutPatch-варіанти, TransferOrgsSummary/DeleteOrgSubtreeSummary, transferChildOrgs та приватний validatedOrgSubtree. Guard виконує validateOrgHierarchy перед extractSubtree і транслює лише OrgHierarchyError. Run-1 функції не змінено. Невідомі id відхиляються до self no-op; self no-op до перевірки циклу (узгоджено з Run 1).

КРОК 4 — T-BM5 тести написані ПЕРЕД реалізацією: OD1–OD6, повний каскад, спільна/осиротіла/непризначена особа, orgLinks обох напрямків і внутрішній link (рахується один раз), optional orgLinks, порожній лист, B1 org/position survivor refs, група лише видаленої позиції, root/unknown, цикл і невідомий parent. Runtime RED не заявляється; rstest не запускався.

КРОК 5 — Реалізовано deleteOrgSubtree: root/unknown guard; validate→extract; каскад org→positions→departments→reportLines→orgLinks→persons→groups. Усі масиви результату нові, input не змінюється; існуючі позиційні операції лишилися як були. Відсутні orgLinks нормалізуються в [] згідно plan. Наступне: обов’язкові tsc та scoped oxlint.

КРОК 6 — Гейти виконані у packages/sdk: `npx tsc -p tsconfig.check.json` → exit 0; `npx oxlint --max-warnings 0 src/interaction/bulkMutations.ts src/interaction/bulkMutations.test.ts src/callbacks.ts` → exit 0. rstest НЕ запускався; pass тестів не заявляю. Наступне: фінальна перевірка scope/дифу й передача координатору.

КРОК 7 — Фінальна перевірка: tsconfig.check.json включає тести; git diff --check без повідомлень. Перелік стороннього WIP той самий; змінені в цьому run лише callbacks.ts, bulkMutations.ts, bulkMutations.test.ts і цей append-only журнал. Run-1 тіла функцій/тести не переписано (у наявних imports лише додані org-залежності). Комітів не робив.

ПІДСУМОК / передача Run 3
- Зроблено: 2 org patch-варіанти, 2 Summary-типи, transferChildOrgs/deleteOrgSubtree з validateOrgHierarchy/extractSubtree reuse і InteractionError.
- Сценарії: написано O1–O3, OD1–OD6 та NB-a/NB-b/B1, success/failure, no-op й атомарність. Runtime виконання НЕ ПРОВЕДЕНО; tsc та scoped oxlint — exit 0.
- Неочікуване: додаткових блокерів немає; rstest не запускався згідно обмеження EPERM.
- Обмеження: це pure/type slice; facade/barrel/docs належать наступним runs. Рекурсивний extractSubtree використано як задано, його алгоритм не змінювався.
- Ризики: поведінковий test PASS ще має підтвердити координатор; author scope check не є незалежним review.
- Далі: координатор запускає rstest, Run 3 інтегрує facade/barrel, Run 4 — docs. Tasks.md не позначав runtime-green.
- Post-deploy: N/A, не комічено й не деплоєно.
