# codex-run 4 — T-BM7 (docs/USAGE.md)

Append-only.

---
ДАЛІ: T-BM7 — звірити bulk API з планом і кодом, доповнити docs/USAGE.md, запустити npm run check:docs; код і сторонні гейти не змінювати.

ЗРОБЛЕНО: T-BM7 — docs/USAGE.md §8: чотири сигнатури, параметри, Summary-поля, InteractionError-відмови, no-op, каскади, single-flight і N9; §9: чотири LayoutPatch-варіанти з полями.
ПЕРЕВІРЕНО: звірено з plan.md, OrgHierarchyDiagram.ts, interaction/bulkMutations.ts, callbacks.ts та layout/orgTree.ts. npm run check:docs — exit 0; усі публічні методи описані, посилання резолвляться, freshness 17/25. git diff --check -- docs/USAGE.md — exit 0.
МЕЖІ: змінено лише docs/USAGE.md та цей явно призначений append-журнал; код, сторонній WIP і гейти не змінювалися. Комітів немає. Runtime-тести не запускалися: зміна лише документації. Deploy/post-deploy — N/A. T-BM7 завершено.
