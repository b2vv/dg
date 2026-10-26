# T3a-1 gate review (r2) — independent blind diff review

Model ID: claude-opus-4-8

ДАЛІ: подивлюся git status + повний diff `git diff HEAD -- packages/sdk`, прочитаю нові core/types.ts та core/index.ts, перевірю 3 інваріанти.

## ВЕРДИКТ: PASS (0 blocking, 1 non-blocking nit)

### Інваріант 1 — core-purity: PASS
- `grep "from '../interaction\|from '../render'" packages/sdk/src/core/` → порожньо.
- Усі імпорти в core/ ведуть лише у `./` (within-core) або `../data/types.js`:
  - core/nodeKey.ts:1 → ./types.js
  - core/nodeRefs.ts:1-4 → ../data/types.js, ./nodeKey.js, ./nodeTestId.js, ./types.js
  - core/nodeTestId.ts:1-3 → ../data/types.js, ./types.js
  - core/index.ts:4-23 → лише ./*
- Жодного upward-import, у т.ч. type-only. Прихованого циклу через ре-експорт нема.

### Інваріант 2 — git mv чисте: PASS
- `git diff HEAD --find-renames --stat` (зі старими+новими шляхами): усі 5 файлів
  `{interaction => core}/…` показані з `| 0` → байт-в-байт rename, 0 content-drift.
  (nodeKey.ts, nodeRefs.ts, nodeRefs.test.ts, nodeTestId.ts, nodeTestId.test.ts)
- Імпорти всередині переміщених файлів не чіпались (0 змін) і коректно резолвляться у новому
  розташуванні: `./types.js` тепер → core/types.ts (куди переїхали NodeKind/NodeRef), а
  `../data/types.js` однаково валідний на один рівень нижче src/.
- «new file mode» у content-diff з фільтром лише по core/ — артефакт відсутньої парної делеції
  у фільтрі, не реальна зміна.

### Інваріант 3 — цілісність барелів: PASS
- core/types.ts містить рівно NodeKind, NodeRef, SearchResult, MenuItem (вирізані з
  interaction/types.ts; diff показує видалення тих самих 4 декларацій, заміна на коментар-пойнтер).
- core/index.ts ре-експортує:
  - 4 типи (types.js) — збігається з тим, що старий interaction/index.ts:1 віддавав;
  - 7 символів nodeTestId.js (nodeDomTestId, normalizeTestIdKey, orgTestId, personTestId,
    positionTestId, resolveTestIdInData, TestAnchorCandidate) — точний збіг зі старим блоком
    interaction/index.ts;
  - nodeKey.js (nodeEntityKey, parseNodeEntityKey) + nodeRefs.js (orgNodeRef, normalizeSelected,
    personNodeRef, positionNodeRef, seatNodeRef, resolveNodeRefInData, testIdForRef) — старий
    interaction-барель їх НЕ віддавав (їх імпортували напряму), тож це нова, але НЕ мертва
    поверхня: споживачі є — promoteMath.ts:3 (nodeEntityKey/parseNodeEntityKey),
    OrgHierarchyDiagram.ts та DiagramRenderer.ts (nodeRefs).
- Дублів у core/index.ts нема (`uniq -d` порожній), циклів нема (усе within-core).
- interaction/index.ts після вирізання консистентний: прибрано рядок типів і блок nodeTestId,
  InteractionError + ContextMenu* re-export лишені навмисно (їдуть у T3a-2) — ОК.
- Жоден споживач не тягне перенесені символи зі старих шляхів interaction/nodeKey|nodeRefs|
  nodeTestId або з interaction-барелю (grep чистий; єдиний match «MenuItem» — false-positive на
  `defaultContextMenuItems`).
- ~25 файлів імпортують з core/index.js (підтверджує заявлений репойнт ~25 імпортерів).

### Верифікація
- `npx tsc -p tsconfig.check.json` → EXIT 0.
- core-purity grep → порожній.

### Non-blocking
- promoteMath.ts:5 — коментар досі каже «it lives in `interaction/nodeKey.ts`», хоча файл
  переїхав у core/nodeKey.ts. Застарілий коментар, не впливає на компіляцію. Варто поправити
  в цьому ж коміті (AGENTS.md: «when a change makes a document wrong, fix it in the same commit»),
  але не блокер.
