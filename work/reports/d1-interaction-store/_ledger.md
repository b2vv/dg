# D1 — ledger (interaction-store)

Гілка `feat/d1-interaction-store` @ main `916a036`. Порядок власника D3→D1 (D3 злито).

## spec-flow
- spec.md: написано. **GATE 1: ПРОЙДЕНО** (рішення власника Q1-Q6 у spec.md §Рішення GATE 1).
- plan.md: написано (архітектура §1, reuse §2, контракт §3, нарізка D1-A/B/C §4, side-effects §5, migration §6, rollback §7, конституція §8, acceptance 16 рядків §9).
- **Конституція (inline, координатор): PASS** — TDD, KISS>SOLID (store композує), WASM-межа не чіпається, публічний API→USAGE (D1-B), Pocock TS-only. Барель без ForTests.
- **GATE 2: dispatched** (gate-reviewer Opus 4.8 ×2) → _critique.md (4 лінзи) ∥ _defense.md (5 питань). Чекаю вердикти.

## Нарізка (plan §4) — хвиля 1 D1
- D1-A: `state/InteractionStore.ts` (+test), `interaction/interactionState.ts` — чистий store: композує SelectionStore, hovered, subscribe/emit (0-змін=0-emit), валідизація hovered. Залежить: —.
- D1-B [P] : `OrgHierarchyDiagram.ts`, `docs/USAGE.md`, `index.ts` — фасад на InteractionStore, subscribeInteraction, USAGE+барель. Залежить: D1-A.
- D1-C [P] : `render/*` — обидва шари читають стан, near pointer→setHovered, related-dimming селектором. Залежить: D1-A.
- Кодери: Codex exec `< /dev/null` (пам'ять codex-background-needs-stdin-closed), неперетинні файли, коміти координатор.

- **GATE 2 plan-defense: DONE → RED** (3 відкриті: Q1 setHovered(unknown) політика; Q2 ізоляція слухача при throw [головний, прецедент notifyPromoteSync]; Q3 double/unsubscribe-під-emit). Q4/Q5 closed. Non-blocking: rollback після публічного subscribe = breaking removal. План дотримується GATE-1 рішень, scope ок. → закрити в plan.md рев.2 (разом із critique).

- **GATE 2 plan-critique: DONE → RED** (4/4 лінзи). B1: наявний Pixi per-node hover (PersonNode:215/338-far-return, OrganizationNode:174) не зведено — «hover через LOD» = нова far-робота (R1), per-node pointerover ≠ R1 hit-test. B2: near-writer+relatedStaffIds у demo (StaffChromeBackdrop:47,71), D1-C лише SDK → AC4 без власника. Non-blk: N1 onChange мультиплекс, N2 setData→reconcile(hovered), N3 reuse relatedStaffIds. Код-заяви звірено координатором (підтверджено). План дотримується GATE-1 рішень.
- **plan.md рев.2 (координатор):** B1 — D1 уніфікує наявні hover-джерела в store; far-LOD painting → R1 (AC3/#7/#16 звужено до near/mid). B2 — relatedStaffIds у SDK (N3), +D1-D demo rewire (честить Q4). N1 subscribe емітить і на selection. N2 facade setData→store.reconcile(data). Defense: Q1 setHovered(unknown)=pure set + render no-op для відсутньої ноди + reconcile чистить; Q2 emit ізолює слухача (try/catch warn-once, прецедент notifyPromoteSync); Q3 emit ітерує snapshot (unsubscribe-під-emit безпечно), unsubscribe ідемпотентний; rollback-note: публічний subscribe → removal breaking.
- **GATE 2 re-check: dispatched** (resume тих самих рев'юерів) — critique (B1/B2/N1-3) ∥ defense (Q1/Q2/Q3). Чекаю дельта-вердикти. GREEN×2 → GATE 2 зелений → tasks + implement (D1-A → D1-B ∥ D1-C → D1-D, Codex `< /dev/null`).
- **GATE 2 plan-defense re-check (рев.2): DONE → GREEN** — усі 5 рядків CLOSED (Q1/Q2/Q3 закрито конкретними рядками; Q4/Q5 лишились closed; rollback-note підтверджено). Нових прогалин нема. Чекаю critique re-check.
- **GATE 2 plan-critique re-check (рев.2): DONE → GREEN** (4/4 лінзи) — B1/B2/N1-N3 закрито, рядки звірено з кодом. Residual non-blocking #15 (пріоритет акценту hovered==selected) → додано правило в plan (selection виграє; D1-C реалізує).
- **GATE 2 = ЗЕЛЕНИЙ** (critique GREEN + defense GREEN + конституція PASS). Далі — tasks.md + implement.
- tasks.md написано (D1-A → D1-B∥D1-C → D1-D). Бриф D1-A написано.
- **D1-A: dispatched** (Codex exec `< /dev/null`) → _impl-D1-A.md
- **D1-A: DONE** → _impl-D1-A.md. 12 тестів GREEN (координатор прогнав сам), typecheck+lint PASS. Файли: state/InteractionStore.ts, .test.ts, interaction/interactionState.ts. Impl звірено з контрактом (snapshot-ітерація, try/catch warn-once WeakSet, entry-Set double-subscribe, equality-guard, reconcile).
- **Мутації D1-A (координатор, 2/2 KILLED):** M-iso (прибрати try/catch) → «throwing listeners isolated» FAIL; M-snap ([...] → жива ітерація) → «unsubscribe during emit keeps snapshot» FAIL. Відкочено. Defense-інваріанти Q2/Q3 реально вартові.
- **D1-A рев'ю: dispatched** (gate-reviewer Opus 4.8, keystone) → _review-D1-A.md. На GREEN — коміт, потім D1-B∥D1-C.
- **D1-A: complete** (commit abebeb6, review=gate-reviewer Opus 4.8 GREEN, mutations 2/2 KILLED, model=Codex). Keystone у дереві.
- Шов D1-B↔D1-C визначено (plan §4.1): `renderer.setInteractionSource({getHovered,setHovered})`; DiagramRenderer.ts → скоуп D1-C.
- **D1-B ∥ D1-C: dispatched** (Codex `< /dev/null`, паралельно, неперетинні файли) → _impl-D1-B.md / _impl-D1-C.md. D1-D — після D1-B.
- **D1-C: COMPLETE** → _impl-D1-C.md. 122 тести GREEN, typecheck+lint PASS. Файли: DiagramRenderer.ts (setInteractionSource), PersonNode.ts, OrganizationNode.ts, staffRelated.ts (+tests).
- **D1-B: IMPLEMENTED** → _impl-D1-B.md. 5/5 своїх тестів PASS, lint PASS; typecheck був BLOCKED на D1-C (паралельно). Файли: OrgHierarchyDiagram.ts, USAGE, index.ts.
- **Інтеграція (координатор):** пакетний typecheck ЧИСТО (шов setInteractionSource зійшовся), lint ЧИСТО, повний SDK-сьют **177 файлів/1495/0 падінь**.
- **D1-D: dispatched** (Codex `< /dev/null`, demo-only) → _impl-D1-D.md. Паралельно — таргетовані мутації D1-C.
- **Мутація D1-C (координатор, KILLED):** far-LOD guard PersonNode:359 → `if(false)` → 2 far-тести FAIL («routes without painting», «far never paints a ring»). B1 scope-boundary реально вартовий. Відкочено.
- **D1-D: BLOCKED проход 1** — потрібен публічний relatedStaffIds із барелю (випав між D1-B/D1-C). D1-D правильно зупинився (не поліз у внутрішнє). Координатор: index.ts += `export { relatedStaffIds, staffDimmedIds }` (typecheck+барель-гейт ок). Перезапуск.
- **D1-D: BLOCKED проход 2** — scope-питання: треба App.ts (передати diagram у фабрики, прибрати installStaffHoverHighlight wiring). D1-D правильно спитав. Координатор: ДОЗВОЛЕНО (App.ts demo-only, не чужий), вузько — лише hover-проводка. Перезапуск.
- **D1-D: DONE** → _impl-D1-D.md. 15/15 тестів + lint pass. Файли: StaffChromeBackdrop(.test), ShpsStaffCard(.test), App.ts (hover-wiring, дозволено). «demo typecheck blocked by stale dist» — очікувано (резолвиться build:types на важкому гейті). Demo-сьют 18/134/0.
- **Усі D1-задачі (A/B/C/D) готові.** Інтеграція: sdk 177/1495/0, demo 18/134/0, typecheck -w + lint чисто.
- **Інтегроване рев'ю D1: dispatched** (gate-reviewer Opus 4.8 ×2, над `git diff main`) → _review-D1-standards.md ∥ _review-D1-spec.md.
- **Рев'ю D1 Standards: DONE → GREEN**, 0 блокерів. KISS-композиція, seam виправданий 2 споживачами, Pocock ок, imperative hover видалено, relatedStaffIds єдине джерело, listener-isolation є+тестовано, WASM незмінний, lint 0. Adversarial: тести behavior-driven, D1-D має сильний анти-false-green ассерт; фейків нема. Рев'юер сам перепрогнав сьюти. Non-blocking: USAGE не згадує relatedStaffIds/staffDimmedIds → додати рядок перед комітом.
- **Рев'ю D1 Spec: DONE → GREEN**, 0 блокерів. Усі 17 рядків → red-if-deleted тести (83/83 interaction-сьюти рев'юер перепрогнав). Рішення власника + шов §4.1 підтверджено. Non-blocking: reconcile-предикат (покращення); found-alpha у paintInteraction (AC5 цілий, тестовано #12); public removal=breaking (plan §7). **ОБИДВА ГЕЙТИ GREEN.**
- USAGE += relatedStaffIds/staffDimmedIds (закрито Standards non-blocking). check:docs ок.
- **D1-B/C/D: complete** (commit 64871ed; D1-A abebeb6). Інтегроване рев'ю Standards+Spec GREEN, 0 блокерів. SDK 1495/0, demo 134/0, typecheck -w + lint + check:docs зелені.
- **ЧЕКАЄ:** важкі гейти (root typecheck/build:types → СПІЛЬНИЙ dist, demo-typecheck потребує) + мерж у main. cass повідомлено (запит на безпеку збірки). Питаю власника (live :4000 hot-swap).

## Пост-рев'ю: opt-in гейт (рішення власника 2026-11-06)
- **Знахідка (cass флагнув, координатор звірив):** фасад ставив `setInteractionSource` БЕЗУМОВНО (OHD:523) → хост отримував related-dimming на Pixi-hover (нове, demo-only раніше), суперечить плану §7 «хост не змінюється, поки не підпишеться». Рев'ю це пропустило (AC1 перевіряло selection-паритет, не hover-dimming хоста).
- **Рішення власника:** ЗАГЕЙТИТИ opt-in (як D3). Хост байт-у-байт (hoverRing як був, 0 dimming), поки не підпишеться; демо opt-in через subscribe/setHovered.
- **Фікс D1-E:** фасад НЕ ставить source при create; ліниво — на перший `subscribeInteraction` АБО `setHovered` (плановий §7-сигнал). Рендерер уже гейтований на source=null. Збірку ТРИМАЮ до D1-E+рев'ю.
- **D1-E (opt-in гейт): dispatched** (Codex `< /dev/null`) → _impl-D1-E.md. Фасад: ліниве ensureInteractionWired() на subscribeInteraction/setHovered; create() більше не ставить source; selection-паритет без source. Тести: host-not-opted-in (RED до фіксу) → no setInteractionSource/no dimming; opt-in wires once; destroy disposes.
- **D1-E: complete** (commit dc163e5). 46 interaction-тестів + SDK 177/1498/0, typecheck+lint. Byte-for-byte RED-before підтверджено.
- **Важкі гейти ЗЕЛЕНІ:** root typecheck (sdk+demo+e2e), build (dist з dc163e5), повний root test (sdk 1498/0, demo 134/0). cass повідомлено фінальний SHA dc163e5 + хост не змінюється (opt-in).
- **D1 ЗАВЕРШЕНО.** ship-report REPORT.md. Далі: коміт артефактів → мерж main + push.
