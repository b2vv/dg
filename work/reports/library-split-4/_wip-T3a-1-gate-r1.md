
## Фінальна верифікація
- render/index.ts:112-119 ре-експортує nodeEntityKey/parseNodeEntityKey з `./promoteMath.js`; promoteMath.ts:3 тягне їх з `../core/index.js` і promoteMath.ts:7 ре-експортує → публічний шлях render→promoteMath→core цілий ✓
- core-internal imports (core/nodeKey.ts:1, nodeRefs.ts:1-4, nodeTestId.ts:1-3) — усі на `./types.js`/`./nodeKey.js`/`./nodeTestId.js`/`../data`; жоден core-файл НЕ імпортує ../interaction чи ../render → інваріант «core — найнижчий шар» дотримано ✓
- Пошук сталих шляхів: ЖОДЕН .ts у src не імпортує з interaction/nodeKey|nodeRefs|nodeTestId чи interaction/types (окрім contextMenu-типів, які там і лишились). Єдиний хіт — коментар у promoteMath.ts:6 (Знахідка B) ✓
- react/* (DefaultReactContextMenu:3, createReactContextMenuHost:3, createReactPromoteOverlay:10, createTestAnchorOverlay:1-3) + тести (ContextMenuController.test:4, bulkContextMenu.test:4, createTestAnchorOverlay.test:3, SelectionStore.test:4) + state/SelectionStore:1 — усі репойнти коректні ✓
- `npx tsc -p tsconfig.check.json` → EXIT 0. Нуль помилок → жодного загубленого/підміненого символу (контракт 3 підтверджено компілятором).

## ПІДСУМОК КОНТРАКТІВ
- Контракт 2 (public API незмінний): ПІДТВЕРДЖЕНО. Набір і type/value-класифікація ре-експортів у index.ts ідентичні (TestAnchorCandidate лишився type-only, 6 testId-хелперів лишились value, 7 словникових типів усі присутні). Лише джерело розбито interaction→core.
- Контракт 3 (жодного мис-репойнту): ПІДТВЕРДЖЕНО (огляд + tsc 0).
- Контракт 1 (0 зміни поведінки, суто механічно): FALSIFIED для дифа-як-є через Знахідку A (layout-проба в orgBlockLayout.ts). Для суто релокаційної підмножини — тримається.

## ВЕРДИКТ: FAIL (гейт червоний через 1 blocking)
Сама релокація бездоганна (контракти 2, 3 повністю; контракт 1 для релокаційних змін). Але дифа `git diff HEAD -- packages/sdk`, яку я рев'ював, забруднена не-релокаційною зміною поведінки (Знахідка A) + untracked `_recenterProbe.test.ts`/`scratchpad/`. Поки це в комміті T3a-1 — контракт «0 зміни поведінки» хибний і гейт червоний.
FIX: виокремити (unstage/stash) orgBlockLayout.ts + _recenterProbe.test.ts + scratchpad/ з коміту T3a-1 → після цього PASS. Знахідка B (стала коментар-ремарка promoteMath.ts:6) — non-blocking, бажано поправити в тому ж комміті.
