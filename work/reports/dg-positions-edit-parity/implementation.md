# T1–T5 implementation journal

2026-11-05. Owner: Codex; route: implementation of approved GATE 1/2 plan.
Root `/Users/strelia/projects/dg`, branch `feat/subordinate-counts-impl` (no worktree).
Relevant tracked files initially clean; unrelated untracked review notes left untouched.
User explicitly authorizes T1–T5; T6 independent verification belongs to reviewer.
Agreed test seams: computeSubordinateCounts, setData/appendData → getData + badge formatter,
getNode → getData/getState, docs gate. No extra approval needed.
Read spec/plan/tasks, TDD and standards; inspected commit windows and expansion helpers.
T1 READY. T2/T3 depend on T1 green; T4 READY; T5 depends on wiring/accessor green.
Reuse decision: adminChildrenMap requires a single org and filters by it; approved final
contract only requires endpoint membership. Keep a small adjacency builder in core instead
of changing existing layout semantics. Reuse expansion helpers for accessor state.
No WASM, callback signature, host migration, e2e, commit/push/deploy changes.

T1: HEAD 85ca298. Red exit 1: missing module; green exit 0: 3 tests.
Commands: `npm test -w @org-hierarchy/sdk -- subordinateCounts.test.ts`.
Logs: `/tmp/dg-t1-{red,green}.log`. Initial sandbox EPERM was infrastructure,
not red evidence; rerun allowed local Rstest port. T2/T3 now READY.

T2: red exit 1 (both assertions fail: absent SDK counts and legacy 99/999 retained),
green exit 0 (2 tests). T3: red exit 1 (ancestor count stays 1 instead of 2),
green exit 0 (4 tests including mapper rejection). Logs `/tmp/dg-t{2,3}-{red,green}.log`.
Shared private applySubordinateCounts keeps the two synchronous commit paths identical.

T4: red exit 1 (`getNode is not a function`, four tests); green exit 0 (four tests).
Log `/tmp/dg-t4-{red,green}.log`. Includes shallow-copy/no-scene-clone, live/removal,
selection/highlight/position expansion, drawn org expansion and person state.
T5: existing check:docs red exit 1 solely for missing getNode documentation;
added API/counts contract and updated position field comments.
Checkpoint persistence: configured manual.sh attempted; sandbox denied receipt creation.
Escalation auto-review rejected export of task/session metadata to external Factory store.
No retry/workaround; progress is preserved in this repository journal instead.

## 1. Зроблено

T1–T5 виконано на `feat/subordinate-counts-impl`, base HEAD `85ca298`.
- `core/subordinateCounts.ts`: чистий графовий рахунок усіх коренів, visited-set,
  endpoint guard, пропуск self-loop/matrix/dotted; листів у Map немає.
- `OrgHierarchyDiagram.ts`: синхронний перерахунок і видалення host-counts листів
  у setData/appendData після epoch-check перед commit; additive getNode.
- `DiagramNode.ts`, `index.ts`: публічний тип accessor, shallow-copy одного entity,
  live selection/highlight/expansion, last-drawn tier-3 org state.
- `data/types.ts`, `docs/USAGE.md`: SDK-owned counts, правила читання й shallow-copy.
- `tasks.md`: T1–T5 виконані; T6 лишається рев'юеру.

## 2. Перевірені сценарії

11 нових тестів, success і failure в кожному з трьох файлів:
`core/subordinateCounts.test.ts` (3), `OrgHierarchyDiagram.counts.test.ts` (4),
`DiagramNode.test.ts` (4). S1–S8/S10, S9 через docs gate.
Red/green T1–T4 записані вище; T5 red: незадокументований getNode, green після docs.
Фінальні команди 2026-11-05, HEAD 85ca298 + описаний dirty implementation:

| Команда | Exit | Результат / evidence |
|---|---|---|
| `npm test -w @org-hierarchy/sdk` | 0 | 163 files, 1327 passed, 2 skipped; `/tmp/dg-final-test.log` |
| `npm run typecheck` | 0 | SDK, declarations, demo, e2e type config; `/tmp/dg-final-typecheck.log` |
| `npm run lint` | 0 | `/tmp/dg-final-lint.log` |
| `npm run check:docs` | 0 | `/tmp/dg-final-docs.log` |
| `git diff --check` | 0 | no whitespace errors |

Перший lint виявив два array callback references у новому тесті; замінено на arrow
callbacks і повторено всі чотири фінальні перевірки. e2e НЕ запускався.

## 3. Неочевидні знахідки / межі

- adminChildrenMap має org-фільтр, відмінний від остаточного GATE 2 endpoint guard;
  його не змінювали. Expansion helpers перевикористано.
- highlightedNode насправді string | null, тому hovered порівнює ref.id.
- Shallow copy захищає лише поля верхнього рівня; вкладені об'єкти спільні, описано в USAGE.
- DFS для кожного не-листа має worst-case O(V*(V+E)), не заявлене раннім текстом plan
  O(V+E). Це прямий approved per-node visited-set algorithm; perf-бенчмарк не запускався.
- Independent review / architecture assessment — T6, не заявляється виконаним автором.
- Паралельно змінився `_wip-subordinate-counts.md`; цей файл автор імплементації не редагував.
  Інші початкові untracked review notes теж не змінені.

## 4. Скриншоти

Не створювалися: зміни TS-логіки/API, без зміни візуального дизайну.
Футер перевірено через реальний formatPositionCountsBadge; org-state — через mounted
jsdom diagram та завершення render. Це не browser/e2e verification.

## 5. Шлях користувача

Хост передає positions/reportLines у setData → SDK заповнює counts не-листів і
видаляє поля листів → картка й sidebar читають ті самі числа. appendData перераховує
весь merged граф. onNodeClick(ref) → diagram.getNode(ref) → getData/getState без клону сцени.

## 6. Передача рев'юеру

T6 pending: незалежно перевірити diff і повторити гейти. Host migration / Cass-1 signal
не виконувалися: за планом вони після T6. Commit/push/deploy не виконувалися.
Checkpoint у зовнішній Factory store залишається BLOCKED automatic approval review;
питання дозволу передано користувачу, обхід відмови не робився. Цей журнал — durable evidence.

## Post-deploy

NOT_RUN: deploy не входить у завдання. Немає твердження про production acceptance.
