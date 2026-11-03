# Ship-report — issue #96: always-on prune + рольова default-policy ШПС

**Гілка:** `fix/96-mockup-expand-prune` · **Issue:** b2vv/dg #96 · **Дата:** 2026-11-03
**Spec/Plan:** `spec.md`, `plan.md` (поряд). GATE 1 + GATE 2 (повторний) PASS. Owner-go на код отримано.

## 1. Що зроблено (дельта від плану)

- **W1 — рольово-свідомий seed.** `OrgHierarchyDiagram.seedExpandedPositionsFromData` рахує дефолтний expand-set
  за роллю org на три-стані `position.expanded` (SPEC §2.2): поточна org (`!== false` → expanded), керуюча+
  підпорядковані яруси (`=== true` → expanded, інакше head-only); лише позиції з admin-дітьми.
- **W2 — гейт знято глобально.** `collapseUnexpandedPositions` прибрано з публічного типу й усіх читачів
  (`buildStaffLayoutInput`, `orgBlockLayout`, `DiagramRenderer.showExpand`, `types`, doc). Прунінг безумовний.
  `visiblePositions` отримав центральний guard: нерозв'язний head (matrix/headless) → повертає всі позиції
  замість throw.
- **W3 — alpha-шлях шанує collapse.** `buildStaffMockupInput`/`computeViaMockup` прунять поточну org через
  `visiblePositions`; `togglePositionExpand` став значущим на alpha.
- **W4 — zoom-floor 0.36.** `DEFAULT_MIN_SCALE` 0.15→0.36 (універсально org+staff, owner-рішення): велика
  повністю-розгорнута штатка лишається читабельною (скрол замість zoom-out-0.15).
- **W5 — multi-org фікстура + контрактні тести** (`roleDefaultExpand.test.ts`).
- **W6 — `docs/USAGE.md`** оновлено (вроджений прунінг, рольовий дефолт, три-стан, zoom-floor). `check:docs` ✅.
- **W7 — міграція demo** (прибрано гейт із табів/сценаріїв; brigade повно-розгортається + clamp).
- **Прод-фікс поза планом (у межах OC1 MERGE):** `commitDataChange` ре-сідить expand перед draw — інтерактивні
  edit-и (reparent/push/swap/insert) оновлюють видимість; інакше новий менеджер при reparent лишався згорнутим
  і переміщений вузол зникав (знайдено GATE-2-форком через `personReparent.contract` row-23).

**Rust `packages/core` НЕ чіпався** (Варіант Y).

## 2. Протестовані сценарії

- SDK: **1272 pass / 0 fail.** Demo: **135 / 0.** Rust: **220 / 0.** typecheck: 0. check:docs: ✅.
- Новий `roleDefaultExpand.test.ts` (3): AC3 (поточна all, яруси 1/3 head-only); три-стан (явні false/true
  шануються); **MERGE** (нова посада→expanded, ручний collapse переживає `setData`) — покриває NB2 з GATE 2.
- `buildStaffLayoutInput.test.ts` (18): always-on прунінг, leadership-стеля ярусу 1, report-фільтр, cap.
- Міграція (форк + власноруч) 16 geometry/grouping/export тестів + 3 demo (golden R3 smoke, edge-inventory,
  GoJS tier-3) — через `expandedPositionIds`, жодного послабленого асерта.

## 3. Неочевидні знахідки

- **alpha-шлях однооргівський за конструкцією** (`StaffMockupInput` без organizations/tiers) — multi-org
  tier-рендер на alpha винесено в ОКРЕМИЙ spec (Варіант Y). Тут alpha шанує лише collapse поточної org.
- **Сьогоднішнє «повне дерево поточної org» давав гейт=false, НЕ expand-set.** Знявши гейт, рольовий seed
  (поточна=all) мусив це замінити — інакше регресія в head-only.
- **Три-стан `p.expanded` робить MERGE і rollback безкоштовними:** ручний collapse живе як `false` у даних і
  переживає re-seed; нові посади (`undefined`) беруть рольовий дефолт. Інверсної (collapsed-set) моделі немає.
- **`commitDataChange` не ре-сідив** (на відміну від `setData`/`create`/rollback) — латентний баг, що проявився
  лише під always-on. GATE-2-форк зупинився на ньому замість правити тест (правильна дисципліна).

## 4. Скріншоти

Не додавалися (логіка layout/видимості; візуальна перевірка — через demo-таби `staff-alpha`/`staff-brigade`
в `npm run dev`, рекомендовано перед мержем). Post-deploy нижче.

## 5. Прохід user-flow

1. Хост віддає ШПС-дані → поточна org малюється повністю, керуюча+підпорядковані — лише головами.
2. Клік по шеврону посади поточної org → піддерево ховається/показується (раніше на alpha — no-op).
3. Велика штатка повністю розгорнута → fit не падає нижче 0.36, сцена скролиться (читабельно).
4. Хост редагує (reparent) → новий менеджер авто-розгортається, переміщений вузол видно.

## 6. Ризики й обмеження

- **Breaking:** `collapseUnexpandedPositions` зникла з публічного `StaffLayoutOptions`. Консьюмери, що ставили
  `true`, — поведінка тепер дефолтна; що покладались на `false`=повне-дерево-всіх-orgs — отримають рольовий
  дефолт (поточна full, керуюча+підпорядковані head-only). Owner схвалив.
- **zoom-floor 0.36 універсальний:** org-діаграма на ~50k не вміститься повністю у fit (скрол). Owner свідомо
  прийняв.
- **Lint:** передіснуючі TD07-помилки (`work/reports/*.mjs`, `isGenuineTreeScene:147` — не чіпалось) лишаються;
  жодної нової. Не блокує, але CI-lint червоний через TD07 — узгодити з owner окремо.
- Multi-org tier-рендер на alpha, node-API сахар, ORG-діаграма defaults, orchestrator-шар — ОКРЕМІ spec.

## Post-deploy
_(заповнити після рола: `staff-alpha`/`staff-brigade` у проді, порівняння з test-env, cass-інтеграція.)_
