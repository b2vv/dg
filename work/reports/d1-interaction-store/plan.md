# D1 — plan: interaction-store (HOW)

**Статус:** plan **рев.2 — GATE 2 ЗЕЛЕНИЙ** (critique GREEN 4/4 + defense GREEN 5/5, re-check тими самими рев'юерами; конституція PASS inline). Гілка `feat/d1-interaction-store` @ main `916a036`.
**Правило акценту (residual #15):** коли нода одночасно `selected` і `hovered` — **selection виграє** для власного акценту ноди (вибір — сильніший персистентний стан); hover-related приглушення інших нод обчислюється селектором однаково. D1-C реалізує це правило.
**Spec:** [`spec.md`](./spec.md) (GATE 1 пройдено, рішення власника). **Placement (маніфест):** `packages/sdk` (shared TS,
не Rust — це стан взаємодії, не геометрія). **Гейт «північної зірки»:** простіше за GoJS.

## 1. Архітектура (одне речення)

Новий тонкий `InteractionStore` у `packages/sdk/src/state/` **композує** наявний `SelectionStore` (недоторканий) і
додає одне транзієнтне поле `hovered: NodeRef | null`; виставляє **єдину** `subscribe((s: InteractionState) => void)`,
на яку підписані обидва рендер-шари (React near + Pixi far) і малюють акцент selection/hover з одного джерела;
related-dimming — похідний **селектор** `f(hovered, mode)`, не збережене поле.

```
InteractionStore (state/InteractionStore.ts)
  ├─ composes SelectionStore (selected: replace/toggle/replaceMany/handlePointerSelect/primary/list — як є)
  │     SelectionStore.onChange → InteractionStore РЕ-ДИСПЕТЧИТЬ підписникам (N1): subscribe емітить і на selection
  ├─ hovered: NodeRef | null · setHovered(n) → змінилось? emit (0-змін=0-emit)
  ├─ reconcile(data) — N2: перевалідизувати hovered проти наявних нод (на facade.setData); зникла → null
  ├─ snapshot(): InteractionState = { selected, primary, hovered }
  └─ subscribe(cb): () => void
       emit ІЗОЛЮЄ кожного слухача (Q2): try/catch, warn-once-per-listener (прецедент notifyPromoteSync
         OrgHierarchyDiagram.ts:664-678) — throw одного не вбиває інших і діаграму
       emit ітерує SNAPSHOT набору слухачів (Q3): unsubscribe під час emit безпечний; unsubscribe ідемпотентний
Споживачі (обидва шари підписані на subscribe):
  near (React) — pointer виставляє hovered у store; рендерить акцент зі state
  Pixi per-node — наявний pointerover (PersonNode.ts:215, OrganizationNode.ts:174) МІГРУЄ: замість локального
       hoverRing-самостійно → пише hovered у store; hoverRing рендериться зі state (єдине джерело). Це near/mid.
  far-LOD painting hover (PersonNode.ts:338 рано-повертає при 'far') — НЕ додається в D1; це R1 (потрібен
       pointermove-hit-test writer). D1 = store + уніфікація наявних джерел; far-акцент приходить із R1.
Related-dimming = селектор на льоту relatedStaffIds(hovered, …) — НЕ поле (Q5); селектор переноситься в SDK (N3)
Політика setHovered(unknownRef) (Q1): store — чистий, приймає будь-який ref (без data-куплінгу); РЕНДЕР малює акцент
  лише для ноди, що є в поточному кадрі (невідомий ref → no-op візуально); reconcile(data) чистить на setData
```

## 2. Reuse-first

| Що | Перевикористовуємо | Нове | Чому наявне не підійшло |
|---|---|---|---|
| Selection | `SelectionStore` (state/SelectionStore.ts) + чисті ops `interaction/selection.ts` — **без змін** | — | уже коректний; D1 його композує, не переписує |
| NodeRef / рівність | `NodeRef`, `sameNodeRef` (`interaction/selection.ts`) | — | hovered використовує ту саму рівність |
| Нотифікація | **форма** `onChange`-колбека SelectionStore | `subscribe` set-of-listeners + `InteractionState` | SelectionStore.onChange — один колбек на selection; D1 потрібна множинна підписка на весь стан |
| Рендер-акцент selection | наявне читання `selectionStore.list`/`primary` у шарах | переведення на `state.selected` | джерело стає store-snapshot, логіка та сама |
| near hover | — | маршрут pointer→`setHovered`; рендер зі state | зараз DOM-імперативний (частково demo-side) — не єдине джерело, не крос-шаровий |

## 3. Контракт типів (публічний — Q6)

```ts
export interface InteractionState {
  readonly selected: readonly NodeRef[];
  readonly primary: NodeRef | null;
  readonly hovered: NodeRef | null;
}
// InteractionStore: композує SelectionStore; додає hovered + subscribe.
//   get state(): InteractionState
//   setHovered(n: NodeRef | null): boolean     // чистий set; приймає будь-який ref (Q1); 0-змін→false, без emit
//   reconcile(data): void                        // N2: hovered не в data → null (на facade.setData)
//   subscribe(cb: (s: InteractionState) => void): () => void  // emit на зміну selected АБО hovered
//   + делегати selection (replace/toggle/replaceMany/handlePointerSelect/clear/primary/list)
// Інваріанти emit: (а) ізоляція слухача — throw одного ловиться (warn-once), інші й діаграма живуть (Q2);
//   (б) ітерація по SNAPSHOT слухачів — unsubscribe під час emit безпечний, unsubscribe ідемпотентний (Q3);
//   (в) 0-змін = 0-emit (AC6); (г) зміна selection через делегати ТЕЖ емітить subscribe (N1).
```
Публічна поверхня (USAGE + барель): `InteractionState`, `NodeRef` (вже є), і фасадна підписка
`subscribeInteraction(cb): () => void` (хост читає selection+hover; `onSelectionChange` лишається для сумісності).

## 4. Нарізка на задачі (неперетинні файли; коміти — координатор)

| ID | Файли (ексклюзивно) | Що | Залежить | Приймання |
|---|---|---|---|---|
| **D1-A** | `state/InteractionStore.ts`, `state/InteractionStore.test.ts`, `interaction/interactionState.ts` (тип) | Чистий store: композує SelectionStore; hovered; subscribe/emit з **ізоляцією слухача** (Q2), **snapshot-ітерацією** (Q3), 0-змін=0-emit (AC6); selection-зміна теж емітить (N1); `reconcile(data)` (N2); setHovered приймає будь-який ref (Q1) | — | AC1, AC2, AC6, AC8 |
| **D1-B** | `OrgHierarchyDiagram.ts` (фасад), `docs/USAGE.md`, `src/index.ts` (барель) | Замінити `selectionStore` на `InteractionStore`; `subscribeInteraction`; `setHovered`-вхід; `setData`→`store.reconcile(data)` (N2); `onSelectionChange` лишається (N1); USAGE+барель | D1-A | AC1, AC5, AC7, AC8 |
| **D1-C** | `render/PersonNode.ts`, `render/OrganizationNode.ts`, `render/staffRelated.ts` (перенесений `relatedStaffIds` + селектор dim) + tests | **Уніфікація наявних Pixi hover-джерел** (B1): PersonNode/OrganizationNode `pointerover` пише `hovered` у store замість локального самостійного `hoverRing`; hoverRing рендериться зі state (єдине джерело, near/mid); related-dimming — селектор `relatedStaffIds(hovered,…)`, **перенесений у SDK** (N3). **far-LOD painting hover НЕ додається** — це R1 (PersonNode:338 лишається рано-поверненим). | D1-A | AC3(near/mid), AC5 |
| **D1-D** | `packages/demo/src/app/StaffChromeBackdrop.ts`, `ShpsStaffCard.ts` (+ demo tests) | **Demo rewire (B2, честить Q4):** прибрати DOM-імперативний `installStaffHoverHighlight`; near pointer→`setHovered` через `subscribeInteraction`; demo споживає перенесений у SDK `relatedStaffIds`. Near-hover стає store-driven. | D1-A, D1-B | AC4 |

**Паралельність:** після D1-A (контракт store) — D1-B ∥ D1-C; D1-D після D1-B (потребує публічний `subscribeInteraction`).
Кодери — Codex exec `< /dev/null` (пам'ять [[codex-background-needs-stdin-closed]]), неперетинні файли, коміти координатор.

⚠️ **Розмежування (B1):** «per-node Pixi `pointerover`» (вбудований, D1-C мігрує) ≠ «R1 pointermove-hit-test по геометрії»
(far-LOD, окремий пункт). D1 робить наявний near/mid hover єдиноджерельним; far-LOD hover-акцент приходить із R1.

### 4.1 Шов D1-B ↔ D1-C (interaction-джерело — фіксується тут, щоб кодери не чекали одне одного)

Pixi-вузол (`PersonNode`/`OrganizationNode`) не має доступу до store — його конструює `DiagramRenderer`. Тож
`DiagramRenderer` входить у скоуп **D1-C** і тримає «interaction-джерело», яке дає йому фасад (D1-B), за аналогією з
`configureTransition` у D3:

- **D1-B (facade) → D1-C (renderer):** `renderer.setInteractionSource(src: InteractionSource | null)`, де
  `InteractionSource = { getHovered(): NodeRef | null; setHovered(ref: NodeRef | null): void }`. Фасад передає
  `{ getHovered: () => store.state.hovered, setHovered: (r) => store.setHovered(r) }`. `null` = старий шлях (hover
  локальний, як сьогодні — безпечний відкат).
- **D1-B** також підписується на store (`subscribeInteraction`) і на зміну hovered кличе наявний пейнт
  (`renderer.onNeedsPaint`/`requestPaint`), щоб Pixi перемалював акцент — **без** rebuild сцени.
- **D1-C (renderer):** тримає `interactionSource`; при побудові вузлів передає `onHover(ref|null)` (вузол
  `pointerover`/`pointerout` → `source.setHovered(ref)` замість локального `hoverRing`-самостійно); при пейнті читає
  `source.getHovered()` і малює `hoverRing`/dim зі стану (near/mid; far-LOD не чіпає). Коли `source===null` — поведінка
  байт-у-байт поточна.
- **D1-C (вузли):** `PersonNode`/`OrganizationNode` приймають `onHover?` у конструкторі/стилі; `pointerover`→`onHover(ref)`,
  `pointerout`→`onHover(null)`; `hoverRing.visible` — від переданого `hovered`-прапорця, не від локального стану.

Файли D1-C уточнено: **`render/DiagramRenderer.ts`** (interaction-джерело + проводка у вузли + пейнт акценту),
`render/PersonNode.ts`, `render/OrganizationNode.ts`, `render/staffRelated.ts`.

## 5. Side effects

- **Публічна поверхня (minor, адитивно):** `InteractionState`, `subscribeInteraction` у барелі/USAGE. `onSelectionChange`
  лишається (не ламаємо). `hovered` — нове спостережуване.
- **Поведінка:** selection незмінна (AC1). near-hover візуально той самий, але тепер store-driven і доступний far-шару.
- **Emphasis** (`found`/`highlight`) не чіпається (AC5) — окремі власники, окремий рендер-вхід.
- **Demo (D1-D):** near-hover жив у demo (`StaffChromeBackdrop.ts:71 installStaffHoverHighlight`, селектор
  `relatedStaffIds:47`). Чиста поведінка (`relatedStaffIds`) **переноситься в SDK** (правило «demo/host → бібліотека»,
  N3); demo стає тонким споживачем `subscribeInteraction` + `setHovered` замість DOM-імперативного обходу.
- **N1/N2:** зміна selection через делегати емітить і `subscribeInteraction`, і наявний `onSelectionChange` (сумісність);
  facade `setData` кличе `store.reconcile(data)` для скидання застарілого hovered.
- **Перф:** subscribe/emit лише при зміні стану (0-змін=0-emit, AC6); related-dimming — чистий селектор, без кешу-десинку.

## 6. Migration plan

Адитивно. `InteractionStore` композує наявний `SelectionStore`, тож усі поточні виклики
(`replace/toggle/replaceMany/handlePointerSelect`) працюють через делегати — байт-у-байт. Фасад перемикається на
новий store поетапно: спершу selection через нього (паритет), потім hovered-вхід і підписка обох шарів. `onSelectionChange`
лишається поряд із `subscribeInteraction`. Хост нічого не змінює, поки не підпишеться на interaction.

## 7. Rollback

- **Рантайм:** якщо хост не підписується на `subscribeInteraction` і не виставляє hovered — поведінка = поточна
  (selection як є, hover як є). `hovered` просто не має писарів поза near.
- **Код:** D1 — один набір у `state/` + точкові правки фасаду/шарів/demo; revert комітів D1 без зачіпання інших фіч.
- **Невалідний hovered** (нода зникла): `reconcile(data)` на `setData` чистить; рендер і так no-op для відсутньої ноди.
- ⚠️ **Публічний `subscribeInteraction` (Q6) → відкат не чистий no-op:** щойно хост підпишеться на нього, видалення
  методу стає **breaking API change**, не безшумним відкотом. Рантайм-no-op (не підписуватись) лишається; але
  публічну поверхню, раз випущену, прибирати — семвер-мажор (defense Q5 non-blocking).

## 8. Конституція (маніфест)

- TDD: кожна задача RED (success+failure) → GREEN.
- KISS>SOLID: `InteractionStore` композує, не абстрагує передчасно; жодного патерну без 2-го споживача (hovered+selected — 2 реальні канали одного стану, єдина підписка виправдана).
- Межа WASM↔TS: НЕ змінюється (interaction-стан — TS, геометрія лишається в ядрі).
- Публічний API ↔ USAGE: `subscribeInteraction`/`InteractionState` документуються в D1-B.
- Pocock — лише TS (тут лише TS).

## 9. Таблиця приймання (acceptance-spec)

«Видиме ззовні» = що бачить хост/тест: значення `InteractionState` (selected/primary/hovered), виклики підписників
(`subscribeInteraction`, `onSelectionChange`), спостережуваний акцент/приглушення у шарах, кількість нотифікацій.
Рівні: **unit** (чистий store, інжектований дата-провайдер для валідизації hovered) · **integ** (повна діаграма в
rstest) · **manual** (стенд — рядок #16).

### Основний шлях

| # | Сценарій | Передумова | Дія | Очікуваний видимий результат | Рівень | AC | Задача |
|---|---|---|---|---|---|---|---|
| 1 | Selection replace | порожній вибір | `select(A)` | `state.selected=[A]`, `primary=A`; `onSelectionChange([A])` і `subscribeInteraction` раз | unit+integ | AC1 | D1-A,B |
| 2 | Selection toggle (mods) | вибрано A | pointer-select B із toggle-mod | `selected=[A,B]`; без mod → `selected=[B]` | unit | AC1 | D1-A |
| 3 | Selection clear | вибрано A | `clear()` | `selected=[]`, `primary=null`; підписники раз | unit | AC1 | D1-A |
| 4 | Selection порядок/дедуп | — | `replaceMany([A,B,A])` | `selected=[A,B]` (дедуп, порядок) | unit | AC1 | D1-A |
| 5 | setHovered нотифікує | hovered=null | `setHovered(A)` | `state.hovered=A`; `subscribeInteraction` раз; `onSelectionChange` НЕ викликано | unit | AC2 | D1-A |
| 6 | hovered скидається | hovered=A | `setHovered(null)` | `hovered=null`; підписники раз | unit | AC2 | D1-A |
| 7 | Єдине джерело hover (near/mid) | hovered=A, near/mid-зум | `pointerover` ноди A у Pixi | `state.hovered=A` через store (не локальний hoverRing-сам); hoverRing A рендериться зі state; один акцент, не два джерела | integ | AC3 | D1-C |
| 7f | far-LOD hover — відкладено (R1) | hovered=A, far-зум | навести/LOD-cross у far | far-LOD hover-акцент **не** малюється в D1 (як сьогодні, PersonNode:338); з'явиться з R1. selection-акцент консистентний | integ | AC3(обмежено) | D1-C |
| 8 | near-hover через store (demo) | near-зум, demo | pointer-over картки A | near пише `hovered=A` через `subscribeInteraction`/`setHovered` (не DOM-імперативно); related-підсвітка зі store | integ | AC4 | D1-D |
| 9 | Публічна підписка | — | `subscribeInteraction(cb)` | cb отримує `InteractionState` при зміні selected АБО hovered; unsubscribe припиняє | unit+integ | AC7,AC8 | D1-B |

### Межі / відмови

| # | Сценарій | Передумова | Дія | Очікуваний видимий результат | Рівень | AC | Задача |
|---|---|---|---|---|---|---|---|
| 10 | 0-змін = 0-emit | вибрано A | `select(A)` знову / `setHovered(поточне)` | підписники НЕ викликані (нема зайвого repaint) | unit | AC6 | D1-A |
| 11 | hovered на зниклій ноді | hovered=A | `setData` без A / видалити A | `hovered` скидається в null (акцент не висить на мертвій ноді) | unit+integ | AC2 | D1-A |
| 12 | Emphasis недоторканий | found=[X] (`setFoundFocus`), highlight (`highlightPath`) | hover/select інших нод | `found`/`highlight` незмінні; store D1 їх не містить; їхній рендер-вхід окремий | integ | AC5 | D1-A,C |
| 13 | onSelectionChange сумісність | хост на `onSelectionChange` | `select(A)` | `onSelectionChange([A])` викликано як раніше (не зламано підпискою interaction) | unit+integ | AC1 | D1-B |
| 14 | related-dimming — селектор | hovered=A | читати рендер приглушення | related обчислено `f(hovered,mode)` на льоту; у store поля related НЕМА (нема десинку) | unit | AC8,AC5 | D1-C |
| 15 | hovered=selected одночасно | вибрано A | `setHovered(A)` | обидва стани на A; рендер не конфліктує (визначений пріоритет акценту) | integ | AC3 | D1-C |

### Ручний

| # | Сценарій | Передумова | Дія | Очікуваний видимий результат | Рівень | AC | Задача |
|---|---|---|---|---|---|---|---|
| 16 | Hover через LOD на стенді | хост підписаний на interaction | навести ноду зблизька, віддалити до far | акцент hover плавно консистентний через LOD; selection теж | **manual** | AC3 | — |

**Підсумок:** 17 рядків (основний 10 з #7f, межі/відмови 6, ручний 1). #16 — ручний на стенді.

## 10. GATE 2 — закриті блокери (рев.2)

| Джерело | Знахідка | Закрито |
|---|---|---|
| critique B1 | наявний Pixi per-node hover не зведено; far = нова робота | §1, §4 D1-C + розмежування; far-LOD → R1; AC3 звужено (#7/#7f); per-node pointerover ≠ R1 hit-test |
| critique B2 | near-writer+relatedStaffIds у demo, AC4 без власника | +D1-D (demo rewire); relatedStaffIds → SDK (N3); AC4→D1-D |
| critique N1 | onChange мультиплекс | §1/§3: selection-зміна теж емітить subscribe; onSelectionChange лишається |
| critique N2 | setData→revalidate hovered | §1/§3 `reconcile(data)`, facade кличе на setData |
| critique N3 | reuse relatedStaffIds | перенесено в SDK `render/staffRelated.ts`, не новий |
| defense Q1 | setHovered(unknownRef) політика | §1/§3: pure set + рендер no-op для відсутньої + reconcile |
| defense Q2 | ізоляція слухача при throw | §1/§3: try/catch warn-once (прецедент notifyPromoteSync) |
| defense Q3 | unsubscribe-під-emit / double-subscribe | §1/§3: snapshot-ітерація, ідемпотентний unsubscribe |
| defense Q5 (nb) | rollback після публічного subscribe | §7: breaking removal задокументовано |

Чекає **re-check** тими самими рев'юерами (critique + defense) по дельті рев.2.
