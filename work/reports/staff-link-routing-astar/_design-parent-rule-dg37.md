
---
# Дизайн правила block.parent для мульті-джерельних деп (fork, dg37)

ДАЛІ: прочитати, як pack_tree_block ЗАРАЗ обирає block.parent (single + мульті), знайти звідки sec→ceo.

## 1. Як ЗАРАЗ обирається head → block.parent (код)
- `resolve_dept_heads` / inline (staff_layout.rs:779-787): head відділу = ПЕРШИЙ член у bucket-порядку, чий admin-батько НЕ в членах відділу (detached root), fallback members[0].
- bucket-порядок = `comparePositions` sort (staff_layout.rs:599-615): (parentId None-first, далі **admin-parent id**, далі order, далі id).
- `block.parent` (parent_of, :815-822) = блок, що містить `parents[head_id]` (admin-батька голови).
⇒ Для МУЛЬТІ-джерельного деп (≥2 detached roots із батьками в РІЗНИХ блоках) head = detached root із **лексично найменшим admin-parent id**. Це АРБІТРАРНО, ігнорує перетини.
- sec: detached roots {sch(→ceo), ib(→cto)}. "ceo"<"cto" ⇒ head=sch ⇒ block.parent=ceo ⇒ sec далеко праворуч (7896).
- Probe sec→dev = форс head=ib (→cto/dev) ⇒ cross=0.

## 2. Чому sec→dev → cross=0 (критерій)
Простої геометричної властивості НЕМА: «горизонтальна близькість» (варіант B) СПРОСТОВАНА; ana→fin мінімізує cfo→ah, але ДОДАЄ перетин. Поточний tie-break (лекс. parent-id) не корелює з перетинами. Властивість, що лишається: вибір parent визначає X-позицію деп, а чи ріже це віяло ceo — ЗАЛЕЖИТЬ ВІД усієї сцени (інші лінії/порядок/перешкоди). ⇒ Це **crossing-min задача на рівні сцени**, не локальна евристика. Єдине, що довело ефект — реальний замір cross per-кандидат (що й робив probe вручну).

## 3. РЕКОМЕНДОВАНЕ правило: ОЦІНКА-КАНДИДАТІВ (approach b)
Евристику (a) ВІДХИЛЯЮ: проксі-формули (проліт/близькість) спростовані probe'ом; ризик оверфіту й нових перетинів.
**Правило:**
1. Виявити МУЛЬТІ-джерельні деп = ≥2 detached roots, чиї admin-батьки резолвляться в РІЗНІ блоки.
2. Кандидати деп = ці detached roots (кожен → інший block.parent). 
3. Перебрати КОМБІНАЦІЇ присвоєнь head по всіх мульті-деп (бо НЕ адитивно — probe), запустити повний layout+route, прочитати cross (route_stats, уже є). Обрати комбо з **min cross**; tie-break: min turns → далі поточний лекс.-дефолт (ДЕТЕРМІНІЗМ).
4. **Межа вартості:** cap на кількість комбо (напр. ≤12). Понад cap → greedy-per-dept або поточна поведінка. Типові орги мають мало мульті-деп (mock3: ana 3× cand, sec 2× = ≤6 комбо). compute_staff_geometry ~ms ⇒ дешево.

## 4. Де в коді
- Параметризувати head-вибір: прокинути `head_override: &HashMap<String,String>` (dept_id→position_id) через compute_staff_geometry(:1350) → group_staff_by_department(:651) → pack_tree_block(:779 замість default find).
- Винести ВНУТРІШНЮ `compute_once(input, &override)` (теперішнє тіло compute_staff_geometry — layout+route, :1350-1646). ЗОВНІШНІЙ compute_staff_geometry: якщо прапор ON → enumerate комбо → compute_once per комбо → read cross з route-stats → pick min → фінальний compute_once з переможцем. Прапор OFF (default) → один compute_once із порожнім override (БАЙТ-паритет golden).
- Прапор: новий DEV `multi_source_reparent` (або під наявним reorder-прапором), default false, no-op без нього.

## 5. Розмір / ризики / тест
- **Розмір: M-L** (threading override + factor inner + enumerate/eval loop; механізм cross уже є).
- **Ризики:** (1) комбінаторна вартість → cap. (2) рекурсія → inner compute_once БЕЗ eval-петлі. (3) оверфіт → уникнено (реальний cross на реальних даних, не константа mock3). (4) детермінізм → tie-break turns→лекс. (5) LOD: cross топологічний, оцінювати на одному LOD (near) й застосувати head-вибір до всіх LOD (head — layout-рішення, LOD-незалежне) — НАЗВАТИ в тесті. (6) взаємодія §6.3: head-вибір перекриває §6.3-дефолт лише для мульті-деп під прапором.
- **Дискримінаційний тест:** сцена з мульті-джерельним деп, де лекс.-дефолт дає ≥1 перетин, а eval-правило обирає parent без перетину. Assert: (а) обраний head/parent = очікуваний, (б) cross падає vs default. + детермінізм (двічі ідентично) + no-op без прапора (golden-парність).

## ВЕРДИКТ
Рекомендація: **оцінка-кандидатів (b)**, бо евристика спростована й задача crossing-залежна. Критерій sec→dev = «мінімум реального cross по сцені», не локальна близькість. Вставка: factor `compute_once` + head_override + bounded enumerate у compute_staff_geometry, під DEV-прапором (no-op default). Розмір M-L. Головний ризик — вартість (cap) і рекурсія (inner без петлі).
