# Agent: Spec axis — T105 barrel surface

ДАЛІ: читаю spec.md, plan.md, T105, git diff main...HEAD.

## ФАКТ — K0, п'ять меж перевірені емпірично (не лише прочитані)

Прогони `node scripts/check-docs.mjs` з підміненим `packages/sdk/src/index.ts`:

| Межа (plan §3 К0) | Результат |
|---|---|
| склад main → RED | ✅ 2 проблеми: `resetContourWasmForTests`, `setContourWasmLoaderForTests` |
| `export type { X as FooForTests }` → RED | ✅ спіймано (регулярка `export\s+(?:type\s+)?\{`) |
| `export *` → RED | ✅ «зірковий реекспорт…» |
| порожній файл → RED | ✅ «не знайдено жодного експорту» |
| файл відсутній → RED | ✅ «не читається», без аптрейсу |
| коментар з іменами хуків (line + block) → GREEN | ✅ не червоніє |
| поточна гілка | ✅ EXIT=0 |

Зняття коментарів безпечне: у `index.ts` **нуль** входжень `//` (grep), тож `//`-strip — no-op.
`export *` у `packages/sdk/src` — нуль (єдиний grep-хіт це коментар у `export/types.ts:12`).

## ФАКТ — A3 доводить те, що обіцяно
`rowTreeDepthGuard.test.ts:4` і `OrgHierarchyDiagram.test.ts:2` імпортують `OrgHierarchyError`
з `../index.js` (барель), не з `./orgTree.js`. Три `err.name` → `toBeInstanceOf` у першому,
один у другому = «обидва місця» К2.

## ФАКТ — три заяви §15 звірені з кодом
1. воркер: `worker/bridge.ts:49` `reject(new Error(ev.data.error ?? 'Worker error'))`,
   `:175` `error: err instanceof Error ? err.message : String(err)` → прототип і `name` гинуть. ✅
2. шва немає: `packages/sdk/package.json` `exports` = `.`, `./react`, `./worker`, `./mappers` —
   `./contour` немає; `OrgHierarchyConfig` (OrgHierarchyDiagram.ts:102-170) не має опції loader'а;
   `initContourWasm()` бере loader із модульної змінної, параметра не приймає;
   у `worker/index.ts`, `mappers/index.ts` `ForTests` немає. ✅
3. типи: заява коректна; машинного гейту на це немає (сам план це визнає). ✅

## ФАКТ — К3 не намінтив імен
`docs/USAGE.md` §15 = таблиця **категорія → §розділ** (9 рядків), поіменно згадано лише
`OrgHierarchyError` + два прибрані хуки. Таблиці на ~40 імен немає. ✅

## РІШЕННЯ — вердикт по критеріях і кроках

| # | Вердикт | Чим видно |
|---|---|---|
| A1 | ✅ | `index.ts:50-54` — два рядки прибрано; гейт червоніє на складі `main` |
| A2 | ✅ по суті, ⚠️ по формулюванню | `npm test` = 896 зелених; усі 12 файлів-споживачів беруть хуки з `contour/bridge.js`. Але коміт **правив два тест-файли** (для A3) і він один — стану «К1 без правок тестів» в історії немає |
| A3 | ✅ розрізняє | імпорт із `../index.js`; прибери експорт — імпорт стане `undefined`, `toBeInstanceOf` впаде |
| A4 | ⚠️ частково | таблиця є, але заява «кожна описана у своєму розділі» хибна для 8 імен спекової таблиці груп |
| A5 | ✅ | §15 «Решта кореневих експортів — внутрішні» + абзац про типи |
| A6 | ✅ | `npm run typecheck` зелений (build:types → demo → e2e); `dist/index.d.ts` без `ForTests` |
| К0 | ✅ 5/5 меж | емпірично, таблиця вище |
| К1 | ✅ | |
| К2 | ✅ обидва місця | 3 асерти в `rowTreeDepthGuard`, 1 у `OrgHierarchyDiagram:158` |
| К3 | ✅ без іменної таблиці | |
| К4 | ✅ | `CHANGELOG.md` «Не випущено» з «Кого стосується» в обох записах |

## ФАКТ — (b) scope creep
1. `scripts/check-docs.mjs`: з `UNDOCUMENTED_BASELINE` прибрано `'getData'`. У К0–К4 цього немає.
   Наслідок: `AGENTS.md:39` «**Sixteen now:**» і докстрінг самого скрипта «21 → 16 on 2026-09-05»
   тепер хибні — у сеті **15** імен. Правило AGENTS.md: «fix the document in the same commit».
2. Новий `work/tasks/T110-changelog-died-at-0.2.0.md` (46 рядків) — плану не належить. Він же
   суперечить `plan.md §7`, де сказано, що CHANGELOG «ведеться».

## ФАКТ — (c) виглядає зробленим, але хибне
1. **Число 253 застаріло в тому ж коміті, який його змінив.** `docs/USAGE.md:598` «віддає **253**
   імені» і `CHANGELOG.md` «з 253 кореневих експортів». Заміряно тією ж логікою, що в гейті:
   `main` = 253, `HEAD` = **252** (−2 хуки, +1 `OrgHierarchyError`).
2. **A4: «кожна категорія описана у своєму розділі» — неправда для восьми імен.** `grep` по
   `docs/USAGE.md`: `DiagramOrganization` 0, `DiagramMappers` 0, `OrgHierarchyCallbacks` 0,
   `bulkContextMenuItems` 0, `ExportOptions` 0, `InteractionError` 0, `WasmLoadError` 0,
   `StaffLayoutError` 0 (з помилок згадано лише `ExportError` і `OrgHierarchyError`). За
   `.claude/standards.md:118` вони лишаються **поза** публічним API — тобто спекова таблиця
   «Групи, які оголошуються публічними» не доставлена. `plan.md §9` рядок 10 обрав це свідомо,
   але `spec.md` закомічено без правки → два артефакти в одному коміті суперечать один одному.

## ФАКТ — дрібне
`rowTreeDepthGuard.test.ts` тепер тягне **весь барель** у jsdom — саме те, що `plan.md §3` називав
причиною не робити рантайм-варіант перевірки («затягнув би весь барель разом із `PixiHost`»).
Тести зелені, ціна прийнятна, але аргумент плану сам собі суперечить.
