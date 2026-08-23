# D5 — Orphan position layout under head

**Статус:** documented (not a bug)  
**Місце:** `packages/sdk/src/layout/staff/orgBlockLayout.ts` (`layoutConnectedTree`)

Посада без `reportLines`-батька отримує `parentOrgId = headId` **лише для WASM-розкладки**.
Ребра малюються тільки з `reportLines` (`adminEdges`) — хибного підпорядкування на екрані немає.

Вузол сідає в потік ієрархії під керівником, не в окрему зону. Якщо product захоче
відокремлений вигляд — окрема зона / відступ (майбутня задача), не змінювати мовчки.
