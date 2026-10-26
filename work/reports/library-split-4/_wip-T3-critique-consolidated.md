# T3 спліт dg — консолідована критика (план + усі огляди)

**Дата:** 2026-10-26. Писар: сесія dg-13. Усі знахідки звірені по коду на HEAD `17b237e` (bulk-mutations).
Критики: 6 сліпих gate-reviewer субагентів + живі сесії Cass 1 (незалежна) і Cass 2 (автор → altitude/author-memo, не correctness).

## Покриття goal (план + критики Cass 1/Cass 2 кількох артефактів)

| Артефакт | Критики | Вердикт |
|---|---|---|
| План (артефакт дельт re-gate) | — | `_wip-T3-regate-deltas.md` ✓ |
| re-gate T3b/T3c контракт | G1 + G2 + Cass 1 (3 сліпі) | 🔴 RED (blockers нижче) |
| Діф T3a-1 (релокація) | R1 + R2 + Cass 1 (3 сліпі) | ✅ PASS (релокація чиста) |
| План T3a-2 (drop-pipeline C) | P1 + P2 + Cass 1 (3 сліпі) | 🟠 ухвалюваний ПІСЛЯ 1 фіксу (конвергентний) |
| Вся T3 стратегія | Cass 2 altitude | 2 owner-рішення (S1/S2) |

---

## 1. Діф T3a-1 (релокація словника) — ✅ PASS, готовий до коміту
3 незалежні огляди (R1, R2 gate-reviewer + Cass 1): релокація чиста за всіма контрактами —
0-behavior (git-mv байт-ідентичні, core/types вирізаний байт-у-байт), публічний API незмінний
(символ-сет 240/240; `TestAnchorCandidate` «доданий» — false-flag, type-only re-source), жодного
мис-репойнту, core-purity (0 upward). Єдиний R1-«blocking» — сторонній хвіст `orgBlockLayout.ts`
(проба 4311) у дифі → знімається staging'ом (не включати в коміт). Коментар promoteMath.ts:6
виправлено. **Коміт безпечний — чекає owner-«го».**

## 2. re-gate T3b/T3c контракт — 🔴 RED (перед кодом переозначити)
3 сліпі (G1/G2/Cass 1), усі RED. Консенсус-blockers (звірені по коду):
- **D2 (T3c):** cell-only `applyDragPreview(cell)` несумісний із free-follow карткою
  (`personInteractions.ts:233` node.position.set щокадру без snap) + reparent `dropTargetAt` над
  рендер-геометрією (порт не має каналу боксів). Тріада {cell-only вниз, #4-grabOffset, адаптер шле
  сиру точку} внутрішньо несумісна. → переозначити drag-контракт цілком.
- **D5:** інв «render→interaction=0» неперевірюваний — `reportPath` (DiagramRenderer.ts:1,512)
  runtime-ребро не адресоване жодним під-кроком; boundary-gate відсутній (`no-restricted-imports` нема).
- **D3 (T3b):** `onMeasurable` — coalesce↔pending мапінг не визначений (liveness-крит);
  G1 каже надлишковий (`await render()`+`getContentBounds` досить). → pin мапінг / можливо викинути.
- **D1 (T3c):** `kind:'doubleClick'` ↔ «сирий pointer, 300ms у #4» суперечність; button-дубль vs kind.
- **D4:** math byte-чистий (ВИТРИМУЄ); non-blocking plumbing (clamp/minScale-maxScale у #4, applyCamera-до-mount, onChange-фанаут LOD/promote).
- **T3b (порт+камера-math) без блокерів** окрім D3-контракту. RED скоуплений у T3c + інв-хвіст.
- Cass 2 (автор) закрила author-GAP A5 (ViewportGesture спечений симетрично) + A8 (dual-path проба) у `_wip-T3-regate-round2-outcome-and-author-closure.md`.

## 3. План T3a-2 (drop-pipeline C) — 🟠 ухвалюваний ПІСЛЯ 1 фіксу
3 сліпі (P1/P2/Cass 1). **Архітектура ВИТРИМУЄ** (усі троє по коду): §C-RED/R1 правильний —
`applySeatDrop` (positionMove.ts:148/153/154) кличе `movePositionToCell`; resolve:92/apply:163/166/170/
move:216/220/232 кидають InteractionError; перенос resolve/apply у core без InteractionError+
movePositionToCell = 2× upward → R1 (ескалювати обидва) правильний. InteractionError leaf;
movePositionToCell sole non-test consumer = applySeatDrop. 0-behavior, публічний API 240/240 незмінний,
межа T3a-2/T3c чиста.

**КОНВЕРГЕНТНИЙ BLOCKING (3/3, звірено по коду):** карта імпортерів §1 **неповна щодо
InteractionError** — 3 тест-сайти імпортують, не репойнтнуті, а §7/рядок 119 хибно кажуть «зелене без змін»:
- `render/OrgHierarchyDiagram.interactions.test.ts:4` ← `../interaction/index.js` (барель)
- `interaction/positionReparent.test.ts:10` ← `./types.js`
- `interaction/positionMove.test.ts:4` ← `./types.js`
Після §5 «no shim» (зняття re-export) tsc почервоніє. **Фікс механічний: репойнт 3 на core + виправити §7/119. ДО імплементації.**

Додаткові NB (Cass 1, звірено):
- **NB1:** §7 grep-проба — denylist `interaction|render`, вужчий за §0-інв «core лише від ../data».
  core→state/media/react/layout пройшли б повз. → allowlist: будь-який `from '../` у core/ крім `../data/` = fail.
- **NB2:** instanceof-сайти (`OrgHierarchyDiagram.ts:937/949/2060/2072`) вимагають MOVE єдиного класу
  InteractionError, не копії → підкріплює R1 і відкид R3; тримається лише якщо ВСІ importers (вкл. 3 пропущені) ведуть на один core-source.
- NB (стиль): positionMove.test варто переїхати в core/seatDrop.test; номери рядків плану застарілі (до T3a-1) — звіряти по імені.

## 4. Стратегія T3 (Cass 2 altitude) — owner-рішення
- **S1:** T3 standalone = 0 user-value; цінність у майбутньому T4-клієнті. AGENTS.md застерігає «host не споживає цей SDK». → підтвердити ставку на T4, інакше T3 під питанням.
- **S2:** full-13 T3c — найризикованіший хунк; розглянути суб-стейджинг T3c (selection→drag→context-menu).

---

## Відкриті owner-рішення
1. **Коміт T3a-1** — «го»? (релокація чиста 3/3; RED re-gate стосується лише майбутнього контракту).
2. **S1/S2** — ставка на T4; суб-стейджинг T3c.
3. **T3b/T3c контракт** — переозначити (D1-D5) свіжою авторською сесією з `_wip-T3-regate-round2-outcome-and-author-closure.md` + цього звіту як вхід; далі легкий re-gate на дельти.
4. **План T3a-2** — застосувати підтверджений фікс (3 репойнти + §7/119 + NB1 allowlist-проба) перед кодом T3a-2.
