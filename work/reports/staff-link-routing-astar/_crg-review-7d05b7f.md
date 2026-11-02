# CRG review — 7d05b7f (v3-пошук ШПС alpha, §8.2-full)

Автор-самоперевірка (той самий автор сесії), не незалежне ревʼю. Незалежне — окремий inspector.

**Стан:** repo `/Users/strelia/projects/dg`, гілка `feat/t126-staff-rust-geometry`, HEAD `7d05b7f`,
база `1dccdc6`. Код-дерево чисте (лише untracked `.md`). Граф зібраний на `7d05b7f`.

**Граф:** 6 файлів, 35 символів, ризик 0.60, **0 flows** — демо event-driven, граф його flows не
моделює; це межа інструмента, не доказ безпеки. Без unit-тестів: `focusStaffCard`,
`clearStaffFocus`, alpha-гілка `runSearch` (перевірені лише живими DOM-пробами).

## Знахідки

1. **SUSPECTED (латентно) — неекрановані `dept`/`person` в `innerHTML`.**
   `StaffSearchDropdown.ts` `render`: `sub` інтерполює `h.dept`, `h.person` без escape, хоча
   `markHits` екранує title. Зараз недосяжно: alpha бере вбудовану фікстуру, `mapperData`
   скидається поза табом mapper (`App.ts:401`). Але модуль приймає довільні `DiagramData`.
   Фікс: прогнати `dept`/`person` через той самий `esc`.
2. **PROVEN (низька) — blur→focus за <150 мс закриває щойно відкритий список.**
   `onBlur` ставить `closeTimer`, `onFocus` його не чистить → `render` відкриває, таймер закриває.
   Фікс: `clearTimeout(closeTimer)` на початку `onFocus`.
3. **Прогалина в тестах — інваріант порядку `focusStaffCard`.** `foundId` мусить ставитись ПІСЛЯ
   `rerenderStaffAlpha` (той пересоздає geom з `foundId:null`), а `select(null)` ПІСЛЯ `revealPath`.
   Обидва — тонкі, і обидва покриті лише живою пробою.

## Перевірено, проблем нема

- Escape під час pending-debounce: таймер читає `search.value` у момент спрацювання = `''` →
  `render('')` → закрито + clear. Без гонки (`App.ts:358-362`).
- Життєвий цикл: dropdown знищується в `staffHoverCleanup` ← `disposeDiagram` (`App.ts:497`);
  `rerenderStaffAlpha` не перемонтовує overlays → без дублювання `ul`/слухачів.
- `staffAdminAncestors`: diamond і цикл покриті тестами.
