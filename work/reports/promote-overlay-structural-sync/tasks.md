# tasks — promote-overlay: camera vs structural resync

**Гілка:** `fix/promote-overlay-structural-sync` · Спека/план: `spec.md`, `plan.md` (GATE 1 ✅, GATE 2 ✅ PASS).
TDD red-first: тести перед кодом (Конституція). Статус явний (у dg немає окремої «в роботі» теки).

Залежності: T1,T2 (тести) → T3,T4 (код) → T5 (док) → T6 (verify). T1 і T2 незалежні `[P]`; T3 перед T4 (T4 типово залежить від експортованого `PromoteSyncReason`).

---

## T1 [P] — RED: overlay-диспетчер (structural негайний, camera settle)
**Статус:** не почато
**Файл:** `packages/sdk/src/react/createReactPromoteOverlay.test.ts`
**Покриває:** acceptance 1, 2, 4, 5, 7, 8.
**Зробити:** додати тести, що драйвлять захоплений listener із `reason`:
- `listener('structural')` → `setPromotedNodeIds`/rebuild викликано **синхронно** (мікротаск), БЕЗ просування таймера `settleMs` (рядки 1,2,5).
- подвійний кадр: `listener('camera')` потім `listener('structural')` → structural sync негайний; попередній settle скасовано — після «догоряння» таймера немає повторного rebuild (рядок 4).
- `listener('camera')` з іншим viewport → `sync()` НЕ синхронно; записано catch-up transform; rebuild лише після `settleMs` (рядок 7).
- N послідовних `listener('camera')` без осідання → rebuild не на кожен виклик, лише catch-up (рядок 8).
**Done:** тести падають проти поточного коду (єдиний settle-шлях), формулювання — поведінка, не приватний стан. Harness: `settleMs` великий (напр. 10_000) там, де перевіряємо, що запис НЕ відкладено — прибрати годинник, не ганятись (маніфест §Окремий випадок).

## T2 [P] — RED: tagging джерела (expand→structural, pan→camera, дефолт)
**Статус:** не почато
**Файл:** `packages/sdk/src/render/OrgHierarchyDiagram.interactions.test.ts` (або новий `*.contract.test.ts`, якщо так чистіше)
**Покриває:** acceptance 3, 6.
**Зробити:** підписати listener-шпигун через `subscribePromoteSync`, перевірити `reason`:
- `togglePositionExpand(...)` → listener отримав `'structural'` (рядок 3).
- viewport-change (pan/zoom без LOD-переходу) → listener отримав `'camera'` (рядок 3).
- прямий `notifyPromoteSync()` без арг → `'structural'` (рядок 6, дефолт).
**Done:** тести падають (зараз listener викликається без арг / сигнатура `()=>void`).

## T3 — GREEN: тип + джерело сигналу (OrgHierarchyDiagram)
**Статус:** не почато · **Залежить:** T2
**Файл:** `packages/sdk/src/OrgHierarchyDiagram.ts`
**Покриває:** 3, 6; розблоковує 1,2,4,5,7,8.
**Зробити (точки з плану §Повний перелік):**
- `export type PromoteSyncReason = 'camera' | 'structural'` (поруч з lod-типами, ~50) — N3.
- `promoteSyncListeners = new Set<(reason: PromoteSyncReason) => void>()` (:325).
- `notifyPromoteSync(reason: PromoteSyncReason = 'structural')`; `listener(reason)` (:556-557).
- тег `'camera'` на :464; решта (317/471/999/1659) — дефолт `'structural'` (явно для читабельності).
- публічний `subscribePromoteSync` — тип слухача `(reason: PromoteSyncReason) => void`.
**Done:** T2 зелений; `npm run typecheck` зелений.

## T4 — GREEN: overlay-диспетчер (createReactPromoteOverlay)
**Статус:** не почато · **Залежить:** T3
**Файл:** `packages/sdk/src/react/createReactPromoteOverlay.ts`
**Покриває:** 1,2,4,5,7,8.
**Зробити:**
- local iface `PromoteOverlayDiagram.subscribePromoteSync(listener: (reason: PromoteSyncReason) => void)` (:65) + імпорт типу — N1.
- підписка-диспетчер (:501): `structural` → `sync()`; `camera` → `onCameraChange()`. `sync`/`onCameraChange` усередині без змін.
**Done:** T1 зелений; наявні overlay-тести зелені (back-compat).

## T5 — док: USAGE.md речення про негайний structural-ресинк
**Статус:** не почато · **Залежить:** T3,T4
**Файл:** `docs/USAGE.md` (біля опису `settleMs`, ~890)
**Покриває:** AC4 (частково), контекст рядка 9.
**Зробити:** одне речення — `settleMs` стосується **лише руху камери**; ресинк після layout/LOD-зміни (expand, far-перехід) — **негайний**, не чекає `settleMs`. (Конституція: публічний контракт уточнюється, не мовчки.)
**Done:** `npm run check:docs` зелений; речення є.

## T6 — verify: typecheck + сюїта + N2/N3
**Статус:** не почато · **Залежить:** T3,T4,T5
**Покриває:** acceptance 9 (публічна поверхня незмінна/зворотно-сумісна).
**Зробити:** `npm run typecheck` (ловить N2 — `createTestAnchorOverlay` типо-сумісний без правок; N3 — експорт типу), `npm test` (sdk+demo), наявні `()=>void`-слухачі не ламаються.
**Done:** усе зелене; далі GATE verify (code-review) на дифі.

---

## Фактичне покриття acceptance (після code-review, виправлено overclaim)

Пряме покриття тестами (не транзитивне):
- **1** (far-ресинк негайний) — `createReactPromoteOverlay.test.ts` «structural: rebuilds synchronously».
- **3** (tagging expand/pan) — `promoteSyncReason.contract.test.ts` (pan→camera, setData→structural).
- **4** (double-call: structural скасовує camera-settle) — `createReactPromoteOverlay.test.ts` «camera then structural in one frame» (додано після spec-review).
- **7** (пан не негайний) — «camera: does NOT rebuild synchronously».
- **AC1-прямий** (зум через far-межу → structural) — `promoteSyncReason.contract.test.ts` «zooming across the far boundary» (додано після spec-review).
- **9** (back-compat) — `npm run typecheck` зелений.

Транзитивне (зводиться до перевіреного «structural→негайно» / «camera→відкладено», без власного it):
- **2** (expand нові screenRect) — той самий afterRender-шлях, що setData (доведено в тесті 3).
- **5** (resize) — дефолт structural (той самий шлях).
- **8** (пан не частішає rebuild) — наявний `describe('deferred recompute')` + тест 7.

### Поза скоупом (окремо, рішення власника 2026-11-04)
- **mid-Pixi legacy** (T129-наслідок) — у дослідженні (`_research-mid-pixi.md`); окремий таск, якщо підтвердиться видимість поза transition.
