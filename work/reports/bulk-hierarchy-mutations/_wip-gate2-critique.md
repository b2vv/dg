
---

## RE-REVIEW (round 1 закриття) — 2026-10-26

ДАЛІ: звірити закриття B1/B2 і чи N2/N3/N4-правки не внесли нову діру.

### B1 — ЗАКРИТО ✓
plan.md:106-109: survivor-set посилань = `groupIds` вцілілих org ∪ `groupIds` вцілілих positions; прямо цитує types.ts:121 і пояснює dangling-ризик. Саме моя правка. Закрито.

### B2 — ЗАКРИТО ✓
plan.md:71-77: хибний прецедент «як unchanged у reparent» ПРИБРАНО, явно сказано що reparent unchanged КИДАЄ (positionReparent.ts:107,146) і commitDataChange безумовно емітить (OrgHierarchyDiagram.ts:699). Механізм: обгортка перевіряє summary → порожній → НЕ кликати commitDataChange, повернути порожній summary, без патча, без throw. deleteSubtree/deleteOrgSubtree завжди прибирають ≥target → no-op лише через unknown→throw. Коректно. Закрито.

### N2 — закрито в тексті, але лишило діру (нова)
plan.md:160-163: org-операції переюзають extractSubtree + validateOrgHierarchy, OrgHierarchyError транслюється в InteractionError на межі. Добре.
**НОВА ДІРА (non-blocking):** `extractSubtree` (orgTree.ts:81-87) **не має seen-guard** — на циклічному parentOrgId дає нескінченну рекурсію. Але plan.md:97 (валідація deleteOrgSubtree) обіцяє «seen-guard», а plan.md:94 (transferChildOrgs cycle) й :161 кажуть переюзати extractSubtree. Асиметрія з position-боком, який має ВЛАСНИЙ guarded BFS (plan.md:111). План не секвенує «спершу validateOrgHierarchy (кине на цикл), потім extractSubtree». Треба явно: або validateOrgHierarchy ПЕРЕД extractSubtree, або власний guarded-walk. Інакше обіцянка seen-guard (:97) не виконана.

### N3 — закрито ✓ (чисто)
plan.md:141-142, 164-166: спільний хелпер прибрано; position = власний BFS по admin reportLines, org = наявний extractSubtree — різні графи. Конституція §0 оновлена. Нової діри саме з N3 нема (крім спільної з N2 guard-асиметрії вище).

### N4 — закрито, але лишило САМОСУПЕРЕЧНІСТЬ (нова)
plan.md:167-168 (GATE-2 closure): `to===from` → явний **no-op** (порожній summary, без патча), НЕ «cycle».
**АЛЕ** plan.md:90 (Правила валідації) досі: «`to===from` — підвипадок cycle» (а cycle = InteractionError, :87). І plan.md:94 для transferChildOrgs: «`to` не ∈ піддерево(from)» — extractSubtree включає сам root, тож to===from потрапив би в cycle-предикат. Дві секції плану суперечать про спостережувану поведінку для to===from (throw vs тихий no-op). Жоден тест у таблиці (A1-A7, O1-O3) не пінить to===from. Треба узгодити :90/:94 з :167 (стале формулювання :90/:94 прибрати).

### Підсумок re-review
- B1: ЗАКРИТО ✓
- B2: ЗАКРИТО ✓
- Нові non-blocking (унесені правками round 1):
  - NB-a (з N4): самосуперечність to===from — :90/:94 «cycle» проти :167 «no-op». Узгодити.
  - NB-b (з N2/N3): extractSubtree без seen-guard vs обіцяний seen-guard (:97); секвенувати validateOrgHierarchy перед extractSubtree або власний guarded-walk.
- Обидві оригінальні блокери закрито; нові — не блокери (інтент у GATE-2-closure однозначний, правки однорядкові; ризик infinite-recursion реальний лише на вже-невалідних даних, що впали б на relayout).

## ВЕРДИКТ: GATE2-CRITIQUE PASS (0 blocking).
B1 і B2 закриті строго. Лишаються 2 non-blocking (NB-a to===from суперечність; NB-b extractSubtree seen-guard ordering) — рекомендовано усунути до розбивки на tasks, але результат від них не стає неправильним за умови дотримання GATE-2-closure.
