# HANDOFF — D3 transition-шар (сесія dg-13 → наступна), 2026-11-05

> Читай першим. Далі — `_ledger.md` (append-only журнал усіх агентів і вердиктів) і `tasks.md`.
> Жива нота Obsidian: `1 - Notes/Sessions/2026-11-05 D3 transition-шар (spec-flow).md`.

## 1. Мета і скоуп

Реалізувати **план** `work/ROADMAP-extensibility.md` у порядку власника **D3 → D1 → R2/R3**. Зараз — **D3,
зріз 1, staff-шлях**: бібліотека сама анімує переходи розкладки (рух, поява, зникнення) однаково для Pixi і
React-оверлея; хост лише вмикає `animate` (opt-in OFF, анкер A3). Org-діаграма — другим зрізом, коли хост її
мігрує (власник). **Не** паралельна лінія тасок: T130–T136 — вхідні знахідки для пунктів плану.

## 2. Джерела правди

| Що | Де |
|---|---|
| Спека D3 (GATE 1, рішення власника Q1–Q8) | `work/reports/d3-transitions/spec.md` §7 |
| План D3 рев. 6 (GATE 2 зелений) | `work/reports/d3-transitions/plan.md` — §1 потік, §3 контракт, §4 задачі, §5 шви, §10 40 рядків приймання, §11 захист |
| Задачі + pre-code checkpoint | `work/reports/d3-transitions/tasks.md` |
| Брифи кодерам (англ.) | `work/reports/d3-transitions/briefs/T-A0.md`, `T-A.md`, `T-B.md` |
| Факти з коду | `_helper-H1.md` (render seams), `_helper-H2.md` (годинник/пейнт/тести), `_helper-H3.md` (взаємодії) |
| GATE 2 | `_gate2-critique.md`, `_critique-*.md`, `_defense.md` |
| Рев'ю хвилі 1 | `_review-wave1-standards.md`, `_review-wave1-spec.md`, `_review-wave1-mutations.md`, `_review-wave1-scope.txt` |
| AI Factory | managed root `/Users/strelia/project-data/ai-factory-kit` (`workflow.md`, `pre-code-checkpoint.md`, `review-handoff.md`, `models.md`) |

## 3. Стан дерева

- Root `/Users/strelia/projects/dg`, гілка **`feat/d3-transitions`** @ **див. `git log -1`** (T-A1 закомічено поверх `4a3db0c`). Нічого **не запушено, не злито**.
- Стек гілок (кожна на попередній): `main` ← `chore/library-boundary-housekeeping` (`945069b`, `7080443`,
  `646e58c`) ← `feat/t132-devtools-panel` (`0752843`) ← `feat/d3-transitions` (`bc9a827`, `d6a62e3`, `4a3db0c`, T-A1).
- Незакомічене **не моє** (не чіпати): `work/reports/dg-positions-edit-parity/_wip-subordinate-counts.md`,
  untracked `work/reports/{lazy-render-viewport,mockup-expand-prune,staff-link-routing-astar}/_*`,
  `work/reports/library-boundary-audit/_impl-*.md`.
- **`packages/sdk/dist`** ПЕРЕЗІБРАНО з `1c8356c` (хвиля 2, після «ок» cass-13 + дозволу власника) — містить увесь
  D3 transition-шар зрізу 1. Гілка `feat/d3-transitions` ЗАПУШЕНА (`origin/feat/d3-transitions`). Наступна збірка —
  знову після «ок» cass-сесії (спільний dist, hot-pick на :4000).

## 4. Рішення (ким)

- Власник: план D3→D1→R2/R3; staff-шлях першим; привиди exit; **стадування ліній** (не твін кінцівок —
  роадмап узгоджено); CSS-трансформ карток; що анімується / що ні (Q5); `nodeCenter`/якорі — кінцеві позиції;
  T131 + animate без `prepare-camera`; stagger — зріз 2; blur — беклог B-blur; кілька кодерів в одному checkout
  (неперетинні файли, коміти й важкі гейти — координатор); helpers/reviewers — Opus; промпти агентам — англ.
- Агент (на перевірку, не власника): `ANIMATE_MAX_NODES = 2000`; невалідний `animate` → вимкнено + 1 warn;
  reduced-motion лише при створенні; **blob-контури відділів стадуються, а не їдуть як бокси** (многокутники;
  прямокутні рамки й рамки хоста — як бокси).

## 5. Перевірки

| Перевірка | Результат | Де |
|---|---|---|
| GATE 2 plan-critique | 4/4 лінзи + 2 кола re-check тими самими рев'юерами → 0 блокерів | `_gate2-critique.md` |
| GATE 2 plan-defense | 5/5 закрито (після 3 прогалин) | `_defense.md`, plan §11 |
| Конституція | PASS (після доповнення документування `getStaffChromeGeometry`) | ledger |
| Хвиля 1 тести (координатор) | 58/58 passed, typecheck (noEmit) і lint зелені | ledger |
| Мутації хвилі 1 | **22/22 KILLED** (одноразова копія модуля в scratchpad, живе дерево не мутовано) | `_review-wave1-mutations.md` |
| Рев'ю Standards / Spec | обидва **GREEN**, 0 блокерів, 2/2 повернуто | `_review-wave1-*.md` |
| Повний `npm test`, root `typecheck`, `build` | **NOT RUN** на `d6a62e3` (root typecheck пише `.d.ts` у спільний dist) | — |

## 6. Відкрите / блокери

1. ✅ **Закрито тієї ж сесії (T-A1):** власник погодив — у `tick()` при >6 заборгованих кроках залишок
   відкидається, анімація **триває**; кінець лише на settle або cap 750 мс (рядок #13a). Неблокуючі правки
   хвилі 1 зроблено (`.js` імпорти; тест повторного входу тепер ловить мутацію M22 сам). Знахідку «неактивна
   eslint-директива» рев'юер **відкликав** — правило `max-classes-per-file` активне (`pedantic: error`),
   директиву перейменовано на `oxlint-disable`. Дельта-рев'ю Standards + Spec: GREEN. Лишився лише
   неблокуючий data clump `confirmed*` (судження).
2. —
3. **Хвиля 2 — BLOCKED → тепер розблокована** (хвиля 1 у `d6a62e3`): T-C (рендерер: `DiagramRenderer`,
   `LayerManager`, `SceneRegistry`, `personInteractions`), T-D (оверлей + тест-якорі + `PromoteSyncReason`),
   T-E (фасад + USAGE). Брифів ще нема — писати з plan §4–§5 + API хвилі 1 (`_impl-T-B.md` фіксує API контролера).
4. **Субагенти:** `general-purpose` на Sonnet 5.5 і Opus 5.5 у цій сесії падали на API safeguards
   `[reasoning_extraction]` до першого кроку (6/6). **Працює** `subagent_type: gate-reviewer` (Opus 4.8).
5. **Codex** двічі пробував писати checkpoint у зовнішнє сховище попри заборону в брифі — автоперевірка
   блокувала; шкоди нема, але в брифі хвилі 2 повторити заборону явно.
6. Інше в черзі (не D3): T132 dev-tools (spec GATE 1 пройдено, план на паузі; бібліотека, хост дає прапор
   `devtools`); D1 (наступний пункт плану); мерж/пуш стеку гілок — власник не просив.

## 7. Наступний крок (один)

**ХВИЛЯ 2 ЗАКОМІЧЕНА — `1c8356c`** (T-C рендерер / T-D оверлеї / T-E фасад+USAGE + барель + e2e T-F).
Контрактний фікс аніматора — окремо `4cc6b55` (T-A2). Рев'ю Standards+Spec GREEN (0 блокерів, усі 40 рядків
приймання → тести «red-if-deleted»). SDK-рівень зелений: повний SDK-сьют 171 файл/1450 тестів/0 падінь,
`typecheck -w` (noEmit), `lint`, `check:docs`. Деталі — `_ledger.md`, рев'ю — `_review-wave2-*.md`,
шви/рішення — `_integration-notes.md`.

**Важкі гейти — ПРОЙДЕНІ (ЗЕЛЕНІ):** root typecheck (sdk+demo+e2e), build, повний root npm test
(sdk 1450/0, demo 132/0). Dist перезібрано з `1c8356c`, cass-13 повідомлено (SHA + зміни). **Зріз 1 ЗАВЕРШЕНО.**

**Наступний крок:** зрізу 1 staff-шляху більше нема що робити. Відкриті напрями (власнику): мерж `feat/d3-transitions`
у main (не просив); зріз 2 — org-діаграма через той самий контролер, коли хост її мігрує; беклог #98 (Q7 камера),
#99 (Pixi idle). Решта черги репо — див. `work/AGENDA.md` / cto-agenda.

**Відкрите (не блокує зріз 1, беклог власнику):** (1) Q7 — камера refit стрибає на settle, не їде з нодами
(рядок #23 виконано); (2) Pixi EventTicker планує rAF у спокої — PixiHost «0 idle» неповний (не стосується D3).
Мутації хвилі 2 на інтеграційному коді не робились (нові «модулі» = правки великих файлів; ключовий false-green
ризик закрито T-A2 + наскрізним e2e). Пуш/мерж — власник не просив.

## 8. Крос-сесія (хост `cassiopeia-admin-ui`)

Сесія `cass-13` закрилась (handoff). Наступна cass-сесія знає: T132 dev-tools — бібліотека (хост лише `devtools`);
хостовий перемикач T131 скасовано; reveal → `revealPath(id, { select: false })`; `toSdkKey` прибрати,
`toBareKey` → `parseNodeEntityKey(key)?.id`; `installMountListener` і перерахунок canvas — тимчасові до шва T130
(шаблони хоста, логіка в бібліотеці = D2/R2/R3 плану). **Протокол dist:** перед `npm run build` і root
`typecheck` — питати cass-сесію «чи не біжить e2e», після — повідомити зміни й SHA.
