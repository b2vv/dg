# Рев'ю Стандарти — T113 collapsed matrix (t113-collapsed-matrix)

ДАЛІ: прочитати .claude/standards.md

ФАКТ: standards.md прочитано. Мірник: CODING_STANDARDS.md (§0+, Pocock) діє ТІЛЬКИ на packages/sdk, packages/demo (TS). packages/core (Rust) — без документованого стандарту, суджу загальною інженерією, Pocock на .rs — хибно за побудовою. TDD.md — весь репо. docs/USAGE.md — публічний API межа sdk↔host. Конституція: тести перед кодом (success+failure), ієрархія KISS→SOLID→DRY→CleanCode→CleanArch→GoF→Pocock, WASM↔TS межа явний контракт, публічний API не міняється мовчки.
Гейти вже зелені (oxlint, tsc, cargo fmt/clippy) — не повторюю. check:docs тепер має orgModeDocs.mjs (T113) — перевіряю чи новий скрипт зроблений як seatCollisionDocs.mjs (має власні тести).

ДАЛІ: прочитати CODING_STANDARDS.md §0-1b і TDD.md §2

ФАКТ: прочитано collapsedSiblingGrid.ts (183 р.) і rowTreeLayout.ts (правки). Коментарі — суцільно «чому» (design rationale), не «що». Немає закоментованого коду. Іменування: planCollapsedSiblingGrids, chainCollapsedGrids, unchainGridNodes, orderedMembers, withGridSpines, visibleOrgsForRowTree — описові, singular types (CollapsedSiblingGrid), casing ок.

СПОСТЕРЕЖЕННЯ (кандидат BLOCKING/non-blocking): `withGridSpines(edges, nodes, grids, opts)` у rowTreeLayout.ts — 4 позиційні параметри, не options object. CODING_STANDARDS.md §1 «Few arguments | ≤ 3 параметри; більше → options object з іменованими полями». Функція не публічна (module-private), але правило §1 не робить винятку для приватних функцій — на відміну від §1b (return type), де виняток явно «library/публічний API». planCollapsedSiblingGrids/chainCollapsedGrids/unchainGridNodes навпаки коректно взяли один options-object навіть при 1-2 концептуальних полях — тобто патерн у цьому ж файлі/сусідньому модулі витриманий, withGridSpines — ні. Позначу як non-blocking (4 параметри, не грубе порушення, легко читається розбитим по рядках виклику), але з чіткою цитатою.

ДАЛІ: перевірити return types експортованих функцій (Pocock §1b — публічний SDK API вимагає явний return type) + generics/enum/any

ФАКТ: перевірено rowTreeLayout.test.ts, collapsedSiblingGrid.test.ts, ploeg_layout.rs (2 нові тести), orgModeDocs.mjs + .test.mjs, check-docs.mjs, e2e/flat-orgs.spec.ts.

- TDD: усі нові поведінки в TS (collapsedSiblingGrid.ts, rowTreeLayout.ts зміни) мають і success, і failure тести, чітко позначені префіксами `success:`/`failure:`. orgModeDocs.mjs — теж (success/failure у .test.mjs, +1 «real docs satisfy gate»). Конституція TDD дотримана.
- ploeg_layout.rs: два нові тести — обидва «success»-форми (пінають існуючу геометричну поведінку compute_ploeg_layered_layout, продакшн-код у файлі НЕ змінено). Формально нової behavior/production code тут нема — це characterization-тести під допущення, яке потрібне T113. Failure-половина не додана, але немає й нової гілки поведінки, яку слід було б відхиляти — не вважаю це порушенням §2 TDD.md (там про нові функції/модулі), non-blocking спостереження, не BLOCKING.
- any/enum/generics: не знайдено `any`, немає нових enum, generics не використано — Pocock §1b дотримано. Всі три нових export мають явний return type.
- Публічний API: нові функції в collapsedSiblingGrid.ts НЕ потрапляють у публічний барель (перевірено grep по index.ts — 0 збігів), тобто це внутрішній layout-модуль, не публічний SDK API → docs/USAGE.md вимога не стосується самих функцій. Але USAGE.md таки оновлено — новий розділ «Матриця згорнутих сиблінгів (T113)» пояснює зміну ВИДИМОЇ поведінки getOrgMode()/onOrgModeChange (існуючий публічний API), і саме це вимагає Конституція «Публічний API SDK не змінюється мовчки». Дотримано, плюс є структурний гейт orgModeDocs.mjs (аналог seatCollisionDocs.mjs, з власними тестами, підключений у check-docs.mjs) — відповідає взірцю з T111.
- Law of Demeter / вкладеність / розмір функцій: усі функції короткі (≤~40 рядків), без ланцюжків a.b.c.d.
- Коментарі: рясні JSDoc-коментарі пояснюють «чому» (design rationale, посилання на T113/SPEC/попередні провали), не «що». Закоментованого коду немає.
- DRY/межа WASM↔TS: withGridSpines перевикористовує buildSpineBusEdgesForForest (той самий будівник, що й глобальна матриця) — явно named, немає дублювання бізнес-правила collapse (isOrgCollapsed один раз, з orgMode.ts).

BLOCKING/non-blocking знахідки:
1. non-blocking · packages/sdk/src/layout/rowTreeLayout.ts:119 (`function withGridSpines(edges, nodes, grids, opts)`) · CODING_STANDARDS.md §1 «Few arguments | ≤ 3 параметри; більше → options object з іменованими полями» · 4 позиційні параметри без options object, тоді як сусідні функції в collapsedSiblingGrid.ts (той самий модуль/фіча) послідовно взяли один input-object навіть при 1–2 полях. Виправлення: згорнути в один параметр `{ edges, nodes, grids, opts }`.

Порушень BLOCKING не знайдено.

ДАЛІ: фінальна відповідь координатору.
