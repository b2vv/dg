claude-opus-4-8

ДАЛІ: прочитати spec.md + plan.md (приймальна таблиця), tracked-діф, нові файли; викликати code-review.

ФАКТ: прочитано spec.md, plan.md (таблиця A1-A7/D1-D7/O1-O3/OD1-OD6/T1-T3), діф (USAGE/OrgHierarchyDiagram/callbacks/index/interaction), bulkMutations.ts, bulkMutations.test.ts, bulkMutations.fasade.test.ts, positionReparent.ts, orgTree.ts, data/types.ts, commitDataChange.

ФАКТ — коректність 4 чистих функцій:
- transferChildren: unknown→throw ПЕРШИМ; from===to→no-op ДРУГИМ (до cycle, NB-a); cycle через subtreeIds(adminChildrenOf).has(to); movedIds=прямі admin-діти (dedup Set); replace семантика (filter admin by toId + push), matrix/dotted не чіпає. Чиста (новий reportLines масив). Відповідає A1-A7.
- deleteSubtree: unknown→throw; head будь-де в removal-set→throw (OQ1+уточнення; deleteSubtree не видаляє org, тож будь-який head лишає org без голови — коректно суворіше); subtreeIds seen-guard проти наявних циклів; persons осиротілі лише цим set (survivingPersonIds); N1 занулення department.parentPositionId через .map (нові обʼєкти лише для змінених). removedPositionIds фільтрує knownIds (чистить фантомні toId). Відповідає D1-D7.
- transferChildOrgs: unknown ПЕРШИМ; from===to→no-op; cycle через validatedOrgSubtree.some; переюз extractSubtree; no-op без під-орг. Відповідає O1-O3.
- deleteOrgSubtree: unknown→throw; root (!parentOrgId)→throw; каскад orgs→positions→departments→reportLines→orgLinks(?? [])→persons→groups; survivor-groups = org.groupIds ∪ positions.groupIds (B1). Відповідає OD1-OD6.
- NB-b: validateOrgHierarchy ПЕРЕД extractSubtree у validatedOrgSubtree; OrgHierarchyError→InteractionError. Тести NB-b/unknown-parent підтверджують.

ФАКТ — чистота: усі 4 повертають нові масиви через filter/map; вхід не мутується (тести structuredClone before/after + not.toBe). Валідація кидає ДО побудови next → атомарність.

ФАКТ — фасад: transferChildren/transferChildOrgs перевіряють summary.length===0 → return без commitDataChange (no-op без патча); delete* завжди комітять (мінімум target). Патч-форми компактні. commitDataChange: this.data=next, draw, reject якщо кадр не наш (single-flight задокументовано). Валідація кидає до commit → data недоторкана при reject.

ФАКТ — публічний API: Summary-типи + 4 функції експортовані (index.ts, interaction/index.ts); 4 методи документовані у USAGE §8; LayoutPatch +4 варіанти (адитивно, discriminated by type). facadeSurface-гейт зелений.

ФАКТ — стандарти TS: без `as`; discriminated union коректний; adminChildrenOf виправдано окремий від adminParentsOf (коментар); без мертвого коду; KISS (один модуль).

ФАКТ — тести: success+failure на кожну операцію + кожне правило відмови; покривають A1-T3; не assert-true (конкретні toEqual на summary/data); fasade покриває T1 (JSON before/after)/T2 (spy onLayoutChange)/no-op гілки.

РІШЕННЯ: блокерів немає. Non-blocking нижче.

ВЕРДИКТ: CODE-REVIEW PASS (0 blocking).
