# Critique D2 adaptive reserve-space (rev.5) — dg41

Model ID: claude-opus-4-8

ДАЛІ: прочитати банер rev.5 у plan.md, потім заземлити твердження у staff_tidy_layout.rs (compute_staff_tidy_layout:1295, stats_core:983, frozen observers ~2322) та staffLiveGeometry.ts:368. Перевірити 6 фокус-питань + 4 лінзи plan-critique.

## ФАКТИ (заземлення)

FACT (stats_core вже продакшн): `stats_core` :983 НЕ має `#[cfg(test)]`; викликається у ПРОДАКШН-коді route_astar :1190 (repair-пас) та :1282 всередині `tidy_stats`. Тобто stats_core уже компілюється й працює в релізі. Test-only — це `tidy_stats` :1238 (`#[cfg(test)]`), тонка обгортка, що будує EdgeView з готового StaffTidyResult і кличе stats_core. => План хибно називає «stats_core becomes production (was test-only)». Насправді новим у продакшні буде лише обгортка, що рахує cross на фінальному StaffTidyResult (зараз це робить лише cfg(test) tidy_stats). Суть валідна, символ названо неправильно.

FACT (route_astar уже має crossing-aware repair): route_astar :1178-1213 — 4 паси, що беруть `bad`-множину зі stats_core і перероутять. Залишкові cross=4@99 — це ПІСЛЯ цих пасів. Адаптивний reserve-space = ЗОВНІШНІЙ цикл над pad/lane поверх усього compute (placement+routing), не чіпає внутрішній роутер.

FACT (повний рекомпьют): compute_staff_tidy_layout :1295 виводить spacing із pad/lane (sg/lv/dp/bg/bv :1302-1307) ТА передає pad/lane у RouteInput :1632-1633. Збільшення pad/lane рекомпьютить і placement, і routing → кожен «compute» справді повний виклик функції. «≤3 computes» = 3 повні виклики.

FACT (frozen observers): observed_astar :2252 / observed_routes :2407 / characterize :2174 — усі `#[cfg(test)]`, шадовлять route_astar/astar для виявлення дрейфу сигнатури. Адаптивна зміна НЕ міняє сигнатуру route_astar/astar (обгортка на рівні вище) → A7-лок-степ для ЦІЄЇ зміни низький ризик; спостерігачі не в продакшн-поверненні. План консервативно тримає A7 — не помилка, просто overstate blast radius.

FACT (детермінізм повернення): SDK дефолт pad=8 lane=8 (`staffLiveGeometry.ts:368`). Базовий пас ×1 = поточні параметри → якщо count==0 short-circuit повертає той самий об'єкт → байт-ідентично. Гарантія «≤ baseline» тримається механічно: база (×1) завжди в наборі-кандидатів, вибір min-cross → результат ≤ cross(база) за побудовою.

FACT (delivery чесно): банер :20-21 + checkpoint Readiness: WASM rebuild → announced cass-13 deploy = окремий крок, «Tests do not deploy». Збігається з memory-правилом announce-before-sdk-rebuild. Чесно.

## РІШЕННЯ по 6 фокус-питаннях

1. Clean байт-ідентичність: ТРИМАЄТЬСЯ. 0→return-as-is короткозамикає ДО ескалації; навіть без short-circuit вибір «tie→smallest spacing» дав би ×1(cross0). Умова: повертається результат базового compute, не ре-derived. Нема сценарію зміни clean-виходу. OK.

2. Детермінізм/спостерігачі: бит набір {×1,×2,×3} впорядкований, min-cross, tie→smallest → тотальний порядок → детерміновано. Кожен compute сам детермінований (A10, output_is_deterministic). Спостерігачі не зачеплені (сигнатура роутера та сама). OK.

3. Perf: НЕДОЛІК. Адаптив НЕ лагодить perf; на cross>0-сцені робить ≤3 повні computes. @99 один compute ≈820ms WASM (rev.3) → cross>0@99 = ~2.5s. rev.5 acceptance (рядок 26) перелічує лише A1/A8/A9/A10+«dense ≤ baseline» — **A4 (≤50ms@99) мовчки випав** з headline target §1. Пом'якшення: реал ≤75 = 0 cross = 1 compute → реал БЕЗ регресії; 3× тільки на синтетиці, що не шипиться. «bounded» тримається буквально (×3). @500 (беклог) 3× на вже-величезному — але out-of-scope. => назвати явно: A4 не регресує на реалі, синтетична perf не гейтиться; не ховати випад A4.

4. Best-effort чесність: ЧЕСНО. «NOT guaranteed 0», гарантія «≤baseline + clean unchanged», A3 «0 at 99» dropped (рядок 26). Прихованої обіцянки 0 нема. Гарантія ≤baseline механічно валідна. OK.

5. Крайові — майбутня щільніша реал-дата: ретрай спрацює на проді й ЗМІНИТЬ вихід (більший spacing, рефлоу 2-3×). Хост ще не споживає Tidy (§5, AGENTS §5). Але під live edit-mode (known direction, memory staff-edit-mode) додавання 1 посади, що тригерить cross 0→1, дасть РІЗКИЙ стрибок усієї діаграми 2-3× — UX-дискретність не адресована. Non-blocking (edit-mode окрема фіча), але варто занотувати.

6. Delivery: ЧЕСНО (див. FACT). OK.

## 4 ЛІНЗИ

AI-slop: заземлено на вимірах, нема вигаданих API. Єдина грунт-помилка — «stats_core was test-only» (насправді вже продакшн :1190; test-only це tidy_stats). Косметично, виправити формулювання до коду.

Логічні діри: (a) A4 perf мовчки впав; (b) набір spacing «e.g. ×{1,2,3}» — «e.g.» = не зафіксовано → bound=3 формально не закріплений; (c) **селектор однокритеріальний (лише cross), а acceptance 5-вимірна (0/0/0/0/0)** — stats_core повертає cross/over/card/near/dept, але план вибирає варіант лише за cross. На cross>0-ескалації більший spacing міг би зменшити cross, але погіршити over/card/near/dept, а «dense ≤ baseline» це не ловить. На clean усі 0 → moot; ризик низький (spacing зазвичай монотонно допомагає всім гео-метрикам), але припущення недоведене.

Зайва складність: route_astar уже має 4-пас crossing-repair; зовнішній spacing-цикл — другий механізм. Але P0c-докази (99→1 reserve-space > 2 placement > 4 routing) виправдовують саме reserve-space як найдешевший лівер. Глобальний pad відкинуто обґрунтовано (impact finding). Складність виправдана.

Крайові: edit-mode рефлоу (п.5); float-tolerance stats_core детермінований (без флапу); non-monotonic покрито min-вибором; селектор-vs-5D (вище).

## ВЕРДИКТ: GREEN (0 блокуючих; 5 non-blocking)
Ядро дизайну чесне й безпечне: clean байт-ідентичність (short-circuit), гарантія ≤baseline (механічна), best-effort без прихованого 0, delivery відокремлено й анонсовано. Жодне твердження-ядро не спростоване кодом.
Non-blocking до коду: (1) виправити «stats_core test-only»→tidy_stats; (2) явно зафіксувати, що A4 не регресує на реал-даних і синтетична perf не гейтиться (не ховати випад A4); (3) селектувати за повним кортежем (cross,over,card,near,dept) лексикографічно, tie→smallest — дешево, stats_core уже їх повертає; (4) зафіксувати набір spacing (прибрати «e.g.»), бо від нього залежать bound≤3 і детермінізм; (5) занотувати UX-рефлоу-дискретність під edit-mode як окремий ризик.
