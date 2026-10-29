# T126 R7 A4.2b — DEBATE LEDGER (dg29)

Власник: FORK2 = повний ланцюг зараз (ВИРІШЕНО). B1 + FORK1 — на дискусію субагентів (власник не згоден з піками оркестратора; лінує до «both» на B1, але на дебати).

## Запущено vs повернуто (4-статус: QUEUED / RUNNING / RETURNED / FOLDED)
| # | agent | тема / позиція | робочий файл | статус |
|---|-------|----------------|--------------|--------|
| D1 | debater | B1: «extend golden ONLY — достатньо й найсильніше; adapter-parity тест редундантний» | _r7-a4-2b-debate-b1-extend-dg29.md | RETURNED → extend-only; покриттєво домінує; unit вмирає A4.4; rebaseline ОКРЕМИМ комітом зі старого ПЕРЕД wiring. Межа: process-ризик → unit як страховка |
| D2 | debater | B1: «BOTH / adapter-parity тест дає те, чого golden не може» | _r7-a4-2b-debate-b1-both-dg29.md | RETURNED → BOTH (unit=імунітет до rebaseline-хазарду+вікно до A4.4; extend субсумує parity-at-cut; unit-only НЕ реком) |
| D3 | debater | FORK1: «БЕЗ rebaseline — reconstruct raw tiers у TS АБО прибрати bands з golden; rebaseline порушує U4» | _r7-a4-2b-debate-fork1-norebase-dg29.md | RETURNED → reconstruct ЗНЯТО (недосяжно дешево); рек (б) прибрати bands; конвергує з D4 (НЕ reconstruct, НЕ enriched) |
| D4 | debater | FORK1: «rebaseline bands коректний і чесний ([]/enriched); reconstruct = дублювання/дрейф» | _r7-a4-2b-debate-fork1-rebase-dg29.md | RETURNED → canvas.tiers=[]; НЕ reconstruct; diff-доказ bands=єдина зміна. F5: Seam A `layout` гейтить raw-смуги незалежно (до A4.4). Конвергує з «drop bands» |

Запущено: 4. Повернуто: 2 (D2, D4). (оновлювати числом)

## РІШЕННЯ ВЛАСНИКА (раунд 1)
- FORK2 = повний ланцюг зараз (ВИРІШЕНО).
- B1 = **Both** (extend-golden + throwaway parity-unit) (ВИРІШЕНО).
- FORK1 = власник хоче ЩЕ дискусію на `canvas.tiers=[]` vs прибрати `bands`-ключ (reconstruct/enriched лишаються відкинутими).

## РАУНД 2 — FORK1 focused debate
| # | agent | позиція | робочий файл | статус |
|---|-------|---------|--------------|--------|
| E1 | debater | FORK1: «canvas.tiers=[] — мінімальна хірургія, normalizeLayout не чіпати» | _r7-a4-2b-debate-fork1-r2-empty-dg29.md | RETURNED → canvas.tiers=[]. КЛЮЧОВЕ: ОБИДВА вимагають rebaseline (compare tol=0 на ключах/довжинах :124-130); «drop уникає rebaseline»=хибне. [] виграє семантикою+form-slot+легібільністю diff |
| E2 | debater | FORK1: «прибрати bands-ключ з live-гілки — жодних чисел бейслайну, U4-пурист» | _r7-a4-2b-debate-fork1-r2-dropkey-dg29.md | RETURNED → dropkey. Асиметрія: зміна ЛИШЕ в тест-файлі (2 рядки destructure-omit :109), Seam A не через live (:70); []=продакшн-контракт-зміна заради тесту (YAGNI); diff «ключ видалено» не сплутати з гео-регресією |

Раунд 2 запущено: 2. Повернуто: 2 (E1, E2). НЕ зійшлися.

## СИНТЕЗ FORK1 (оркестратор)
Обидва згодні: (1) адаптер МУСИТЬ дати canvas.tiers={[] або enriched}; enriched=дві-правди відкинуто → природне значення адаптера []; (2) ОБИДВА варіанти вимагають regen бейслайну (compare tol=0 на ключах/довжинах); «drop уникає rebaseline»=хибне; (3) Seam A `layout`.bands тримає raw-гейт до A4.4 незалежно.
Розбіжність — ЛИШЕ чи golden live-шов далі несе `bands`(=[]) чи прибрати ключ:
- E1 keep bands=[]: найпростіше, слот під A4.4, diff []←значення легко переповнити.
- E2 dropkey: зміна лише тест-файлі (2 рядки), diff «ключ видалено» однозначний (не гео-регрес), нема рудиментарної завжди-порожньої асерції.
Оцінка оркестратора: обидва коректні/оборотні/косметичні. Легкий лін до E2 (однозначність diff під U4 + нема вічно-порожньої асерції), адаптер усе одно віддає []. → на рішення власника.
