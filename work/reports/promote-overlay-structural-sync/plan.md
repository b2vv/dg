# plan — promote-overlay: camera vs structural resync

**Статус:** plan · **Гілка:** `fix/promote-overlay-structural-sync` · **Дата:** 2026-11-04
Спека: [`spec.md`](./spec.md). Рішення GATE 1 враховані (підхід (a), публічний API без змін, один structural-шлях).

## Placement

Увесь фікс у `packages/sdk` (TS). Два файли:
- `packages/sdk/src/OrgHierarchyDiagram.ts` — джерело сигналу `notifyPromoteSync`/`subscribePromoteSync`.
- `packages/sdk/src/react/createReactPromoteOverlay.ts` — споживач сигналу (розгалуження camera/structural).
- `docs/USAGE.md` — одне речення (уточнення контракту `settleMs`).
Межі WASM↔TS, worker-контракту не чіпає. `packages/core` — ні. (Маніфест §Розміщення.)

## Reuse-first

| Рішення | Статус | Чому |
|---|---|---|
| Теговий сигнал `reason` на наявному `notifyPromoteSync`/`subscribePromoteSync` | **reuse+extend** | канал уже є (`promoteSyncListeners`); додаємо лише розрізнення, не нову інфраструктуру |
| Негайний ресинк = наявний `sync()` | **reuse** | `sync()` уже робить повний rebuild + `cancelSettle()` на вході — саме те, що треба для structural |
| Camera-шлях = наявний `onCameraChange` (catch-up + `settleMs`) | **reuse, незмінний** | пан працює правильно; AC3 вимагає його зберегти |
| Окремий `subscribeStructuralSync` (варіант b) | **відкинуто** | друга підписка — зайва абстракція (KISS); один тег простіший |
| Self-detect незмінного viewport (варіант c) | **відкинуто** | LOD-перехід змінює `scale` → не відрізнити від пану → AC1 провал |

## Дизайн зміни

### Тип сигналу
`type PromoteSyncReason = 'camera' | 'structural';`

### Джерело (`OrgHierarchyDiagram.ts`)
- `notifyPromoteSync(reason: PromoteSyncReason = 'structural')` — **дефолт `'structural'`**: негайний
  ресинк — безпечний дефолт (не ховає нод), camera-settle — єдиний opt-in для гарячого шляху пану.
- `subscribePromoteSync(listener: (reason: PromoteSyncReason) => void)` — тип слухача приймає `reason`.
  Наявні `() => void`-слухачі лишаються сумісними (функція, що ігнорує арг, присвоювана типу з арг).
- Протегувати 5 викликів (виміряно в коді):

| Рядок | Місце | reason | Чому |
|---|---|---|---|
| 464 | `setOnViewportChange` | **`'camera'`** | рух камери (пан/зум) — єдиний гарячий шлях, catch-up+settle |
| 317 | `selectionStore` callback | `'structural'` | дискретна дія; promoted-set міг змінитись, лаг не ховає камера |
| 471 | `setOnResize` | `'structural'` | viewport не рухається, лише «скільки влазить» → той самий stale-клас, що expand |
| 999 | `afterRender` | `'structural'` | **корінь**: будь-який структурний рендер (LOD, layout) → негайно |
| 1659 | `repaintSelection` | `'structural'` | selection chrome; дискретно |

### Споживач (`createReactPromoteOverlay.ts`)
Підписка (зараз `subscribePromoteSync(onCameraChange)`) стає диспетчером:
```
subscribePromoteSync((reason) => {
  if (reason === 'structural') sync();   // негайний rebuild, cancelSettle() всередині
  else onCameraChange();                 // camera: catch-up + settleMs (незмінно)
});
```
`onCameraChange` і `sync` — без змін усередині.

### Повний перелік точок правки (з GATE 2: N1, N3)
Тип `PromoteSyncReason` — **експортувати** (просочується в публічний `.d.ts` через `subscribePromoteSync`; N3).

| Файл | Рядок (орієнтир) | Правка |
|---|---|---|
| `OrgHierarchyDiagram.ts` | ~50 (поруч з lod-типами) або новий модуль | `export type PromoteSyncReason = 'camera' \| 'structural'` (єдине джерело) |
| `OrgHierarchyDiagram.ts` | 325 | `promoteSyncListeners = new Set<(reason: PromoteSyncReason) => void>()` |
| `OrgHierarchyDiagram.ts` | 556-557 | `notifyPromoteSync(reason: PromoteSyncReason = 'structural')`; `listener(reason)` |
| `OrgHierarchyDiagram.ts` | 464 | `this.notifyPromoteSync('camera')` |
| `OrgHierarchyDiagram.ts` | 317, 471, 999, 1659 | лишити без арг (дефолт `'structural'`) — АБО явно `'structural'` для читабельності |
| `OrgHierarchyDiagram.ts` | публічний `subscribePromoteSync` (~598) | тип слухача `(reason: PromoteSyncReason) => void` |
| `createReactPromoteOverlay.ts` | 65 (local iface `PromoteOverlayDiagram`) | `subscribePromoteSync(listener: (reason: PromoteSyncReason) => void): () => void` + імпорт типу |
| `createReactPromoteOverlay.ts` | 501 | підписка-диспетчер (вище) |
| `createTestAnchorOverlay.ts` | 13, 166 (N2) | **правок не треба** — отримує завжди-негайний sync, reason ігнорує; звірити typecheck |

Диспетчер — `if/else` на двох значеннях; exhaustive-switch на майбутнє не обов'язковий (N4, ніт).

### Чому це лагодить обидва баги
- **A (far):** far-перекидання: camera-виклик (464) планує settle; мікротаск-render → `afterRender`
  (999) → `'structural'` → `sync()` негайно (і `cancelSettle()` знімає той settle) → `setPromotedNodeIds([])`
  → far-крапки видимі в тому ж кадрі. Вікна «лише конектори» немає.
- **B (expand):** `togglePositionExpand` → render → `afterRender` (999) → `'structural'` → `sync()` одразу
  на нові `screenRect`. Ghost немає.

## Side effects

- **Selection/resize тепер синкаються негайно** (317/471/1659), а не через 150 мс. Це **покращення**
  (швидший відгук), не регрес: ці шляхи не пов'язані з рухом камери, catch-up їм нічого не давав.
- **Вартість:** `sync()` робить повний rebuild (walk promote-boxes + React render). На structural-подіях
  (render/selection/resize) він і раніше зрештою ставався — просто через 150 мс. Частота не зростає:
  structural-події дискретні, не на кожен кадр. Пан (гарячий шлях, до 60/с) лишається на catch-up — **не**
  викликає `sync()` частіше. AC3 збережено.
- **Подвійний виклик на far-кадрі** (camera 464 + structural 999): структурний `sync()` робить
  `cancelSettle()`, тож осиротілого settle не лишається. Перевірено в defense.

## Migration plan

Зміна адитивна й зворотно-сумісна:
- `reason` має дефолт `'structural'` → будь-який невказаний виклик безпечний.
- Тип слухача розширюється контраваріантно-сумісно → наявні `()=>void` не ламаються.
- Host (`cassiopeia-admin-ui`) не чіпає цей сигнал (grep порожній) → **host no-op**, перезбірка dist не
  обов'язкова для коректності, лише щоб побачити фікс. Жодної зміни в host-коді.
- Міграційних кроків для споживачів немає; публічні опції `createReactPromoteOverlay` незмінні.

## Rollback

- Один коміт/гілка `fix/promote-overlay-structural-sync`. Відкат = revert коміту: сигнал повертається
  до єдиного (settle-only) шляху, баги A/B повертаються, але нічого іншого не ламається (адитивна зміна).
- Проміжний запобіжник не потрібен (немає міграції даних, схем, персист-стану).

## Конституція (маніфест §Конституція)

- [x] **Тести перед кодом** — red-тест (AC1/AC2: structural-sync без очікування `settleMs`) **перед** фіксом; TDD-скіл.
- [x] **KISS > SOLID/GoF рано** — один тегований канал, без нової підписки/патерна (відкинуто (b),(c)).
- [x] **Межа WASM↔TS** — не перетинається.
- [x] **Публічний API не мовчки** — host-поверхня незмінна; `docs/USAGE.md` отримує речення про негайний structural-ресинк (уточнення `settleMs`), бо контракт уточнюється.
- [x] **Pocock — тільки TS** — зміна суто TS.

## Acceptance scenarios

Спостережуване ззовні (DOM promote-шар + виклики `setPromotedNodeIds`), не приватний стан.
Verification — юніт у наявному harness (fake diagram захоплює listener, тест кличе `listener(reason)`);
e2e timing-залежних **не** додаємо (маніфест §«Окремий випадок»: прибрати годинник, а не ганятись за ним).

### Happy path
| # | Сценарій | Precondition | Дія | Очікуваний спостережуваний результат | Верифікація |
|---|---|---|---|---|---|
| 1 | far-перехід ресинкається негайно (AC1) | overlay на near, сіти promoted (`setPromotedNodeIds([ids])`); `getLodLevel→'far'` | `listener('structural')` (як afterRender після LOD-рендеру) | `setPromotedNodeIds([])` викликано **синхронно** (у тому ж мікротаску), БЕЗ просування таймера на `settleMs` | unit `createReactPromoteOverlay.test.ts` |
| 2 | expand ресинкається на нові позиції негайно (AC2) | overlay на near, сіти на старих `screenRect`; дані оновлені (нові `listPromoteBoxes`), viewport незмінний | `listener('structural')` (як afterRender після expand) | overlay перебудовано: нові слоти мають **нові** `screenRect`, БЕЗ просування таймера | unit `createReactPromoteOverlay.test.ts` |
| 3 | tagging джерела: expand→structural, pan→camera | діаграма з підписаним listener-шпигуном | `togglePositionExpand` vs viewport-change | listener отримав `'structural'` на expand-шляху і `'camera'` на viewport-change | unit `OrgHierarchyDiagram` (новий або `orgExpandChange.contract.test.ts`/`viewportChange.contract.test.ts`) |

### Boundaries
| # | Сценарій | Precondition | Дія | Очікуваний спостережуваний результат | Верифікація |
|---|---|---|---|---|---|
| 4 | подвійний виклик на far-кадрі | overlay на near, pending camera-settle заплановано | `listener('camera')` потім `listener('structural')` у тому ж кадрі | structural `sync()` виконано негайно; попередній settle скасовано (`setPromotedNodeIds` не викликається вдруге, коли таймер «догорає») | unit `createReactPromoteOverlay.test.ts` |
| 5 | resize (viewport не рухається) | overlay на near, сіти promoted | `listener('structural')` (як setOnResize) | ресинк негайний (той самий шлях, що expand) | unit `createReactPromoteOverlay.test.ts` |
| 6 | дефолт reason = structural | — | `notifyPromoteSync()` без аргументу | слухач отримує `'structural'` (безпечний дефолт — негайно, не ховає нод) | unit `OrgHierarchyDiagram` |

### Failures / регрес-гвардії
| # | Сценарій | Precondition | Дія | Очікуваний спостережуваний результат | Верифікація |
|---|---|---|---|---|---|
| 7 | пан НЕ стає негайним (AC3, анти-регрес) | overlay на near, synced viewport | `listener('camera')` з іншим viewport | `sync()` **не** викликано синхронно; записано catch-up transform на шар; `sync()` лише після `settleMs` | unit `createReactPromoteOverlay.test.ts` |
| 8 | пан не частішає rebuild (AC3) | — | N послідовних `listener('camera')` без осідання | `setPromotedNodeIds`/rebuild не викликається на кожен виклик (лише catch-up), доки не мине settle | unit `createReactPromoteOverlay.test.ts` |
| 9 | публічна поверхня незмінна (AC4) | — | збірка типів | наявні `()=>void`-слухачі досі присвоювані; `createReactPromoteOverlay` опції (`settleMs` тощо) не змінились | `npm run typecheck` + наявні тести зелені |

**Групи:** усі три представлені. Ручних рядків **0**.

---

## Tasks

Див. [`tasks.md`](./tasks.md).
