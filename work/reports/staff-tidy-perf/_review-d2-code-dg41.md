# R6 Code Review — коміт 25a934a (D2 adaptive reserve-space)

Model ID: claude-opus-4-8

ДАЛІ: прочитати `git show 25a934a`, дизайн (plan.md rev.5, _design-d1-model-dg41.md, _critique-d2-adaptive-dg41.md), поточний код staff_tidy_layout.rs і lib.rs. Перевірити 8 пунктів завдання + тести.

## ФАКТИ (звірено з кодом + прогонами)
- compute_staff_tidy_adaptive :1661-1681 — base=×1 як початковий best; short-circuit на ПОВНОМУ кортежі==(0,0,0,0,0) :1664; ретрай [2.0,3.0] на свіжій клоні input щоразу (не кумулятивно) :1669-1672; заміна лише на strict `<` :1675 → tie→менший spacing. Детермінізм: кортеж — total Ord; HashMap у tidy_stats/stats_core дає порядко-незалежні лічильники (суми комутативні; bad=HashSet обгорткою не читається).
- stats_core :983-1082 — cross/over/card/dept НЕ залежать від pad (чиста геометрія); лише `near` :1056-1059 розширює rect на (pad-0.5). Отже base_q (input.pad) і candidate_q (scaled.pad) міряють `near` РІЗНИМИ порогами. cross — домінантний лекс-ключ і pad-незалежний → первинний вибір чесний.
- tidy_stats :1240 промотовано в продакшн (знято #[cfg(test)]), викликається продакшн-adaptive → без dead_code; clippy --release чисто по регіону.
- lib.rs :102 js_name=computeStaffMockupLayout, :103 сигнатура незмінна, :108 кличе adaptive. Єдиний продакшн-вхід. goldens/observers (cfg(test)) кличуть compute_staff_tidy_layout напряму → adaptive НЕ тече в них; регенерація не потрібна.
- Прогін tidy_scale_row (--release): 50→0/0/0/0/0 @31ms (short-circuit, 1 compute); 99→4/0/0/0/0 @670ms; 148→24/0/0/0/0 @2617ms. У ВСІХ сценах ненульовий лише cross; over/card/near/dept завжди 0 → short-circuit(full==0) ≡ cross==0 на практиці; near-нечесність moot.
- adaptive_byte_identical_on_clean / reduces_dense / deterministic — усі 3 pass (5.5s).

## ЗНАХІДКИ (усі non-blocking)
N1 (тест/claim gap). byte_identical тест перевіряє лише рівність виводу, НЕ кількість computes. Він лишиться зеленим навіть якби short-circuit не спрацював (3 computes), поки base лишається best. Отже perf-claim «real data = 1 compute» НЕ закріплений комітним suite — доводиться лише ігнорованим tidy_scale_row. Precondition асертить тільки cross==0, слабше за full-tuple==0, що реально керує short-circuit. Емпірично (50-pos=0/0/0/0/0) ок, але документація/асерт недоформульовані.
N2 (чесність near у селекторі). near міряється різними pad-порогами для base vs candidate (:1056 vs scaled pad). Теоретично це 4-й tie-break; на практиці near завжди 0 → неспрацьовує. Напрям нечесності консервативний (ширший band→більше near у кандидата→схиляє тримати base/менший spacing), тож хибного вибору гіршого варіанту не дає. Варто занотувати, бо на майбутній щільнішій реал-даті (cross=0,near>0) short-circuit НЕ спрацює → тихий 3× reflow + 3 computes (повторює edit-mode ризик критика #4).
N3. У всіх фікстурах лише cross буває >0 — 5-вимірний селектор поки не має покриття на сцені, де over/card/near/dept розрізняють кандидатів. Логіка коректна, але недотестована.

## ВЕРДИКТ: GREEN — 0 блокуючих
8/8 пунктів завдання звірено з кодом і прогонами; усе тримається. Клон у ретраї коректний, детермінізм повний, біндинг/goldens безпечні, perf відповідає дизайну (A4 чесно поза гейтом). 3 non-blocking — доформулювання тестів/claim і майбутній edit-mode/near ризик, не дефекти поведінки коміту.
