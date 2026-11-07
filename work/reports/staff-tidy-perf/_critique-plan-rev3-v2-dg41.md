# Повторна критика plan.md (rev.3) — dg41

Модель: claude-opus-4-8

ДАЛІ: завантажити plan-critique; прочитати plan.md, попередню критику, докази, код, CI, package.json.

## ФАКТИ — звірка тверджень плану з кодом (усе підтверджено)
- `tidy_scale_row` — staff_tidy_layout.rs:1998-2000 `#[ignore]`, лише вимір (println/dump), ЖОДНОГО assert якості/часу. ✔ (B1-факт істинний)
- Гейт за замовчуванням: `mock3_astar_zero_crossings_and_card_hits` :1842-1856 — assert 0/0/0/0/0 на mock3. ✔
- Великі goldens `golden_large_det_only`/`golden_large_realistic` :2197-2212 — обидва `#[ignore]`. ✔ (не CI-гейт уже зараз)
- CI `cargo test` без `--ignored` (ci.yml:40); `test:rust`=`cargo test` (package.json:23); `test` = sdk+demo (:14). ✔ → жоден scale/large тест у CI не біжить. B1-факт істинний.
- `tidy_cohorts` :1961-1991 будує ЛИШЕ цілі когорти (assert `1 + 49*cohorts` :1989). ✔ → partial-cohort конструктора НЕМАЄ (N5 реальний).
- astar cap `it > 250_000` :872; fallback `simp(...)` :400. ✔
- capdiag: 82 capped / 22 ребра, families ceo→da-* (10) + cto-k→bi-k/ib-k (12) = «дві родини»; occupancy 99.184%; a/b/c=0. ✔ (§0 плану точний)
- DG_TIDY_GOLDEN_WRITE=1 — регенерація goldens :1910. ✔

## ЛІНЗИ (застосовано інлайн, чистий контекст, автор-резонів не бачив) — 4 лінзи / 4 повернуто

### B1 (було blocking) — ЗАКРИТО
§4 тепер фазовий і чесний: до-D2 лише mock3 як CI-гейт, scale-harness свідомо measurement-only
(«no false gate is claimed»); на D2 — asserting scale-тест (cross==over==card==near==dept==0 на
50/99/first-crossing) + явне дротування в CI + регенерація великих goldens один раз. mock3/small
лишаються byte-frozen щофази. Суть блокера (гейт, що вдає assert / вдає CI-покриття якого нема)
усунена: план більше не бреше про покриття до-D2 і дає зобовʼязувальний предикат + A3/A8. НЕ переблокує.

### N1 router-vs-layout критерій — СКЛАДЕНО (non-blocking залишок)
Критерій вимірюваний (orthogonal route, seg_usable AND line-cross-free, within channel). Залишок:
«already-placed edges» не має визначеного референс-набору (роутинг порядко-залежний, 5 проходів) —
D0 мусить зафіксувати порядок/прохід; і пошук cross-free-маршруту сам по собі ≈ задача роутингу,
хоч обмежений 4 перетинами 99-сцени (трактовно). Non-blocking.

### N2 infeasibility-exit — ЗАКРИТО
§3 D1 має явний вихід: нема моделі що бере quality+perf разом → стоп, ре-переговори з власником.

### N3 browser-decisive — СКЛАДЕНО, але СЛАБКЕ місце (найсильніший non-blocking)
A4 оголошує браузер «decisive measure», проте НІ в плані, НІ в репо не названо жодного harness
для WASM-таймінгу в браузері; scale-wasm лише попереджає node≠браузер. Первинна perf-прийомка
не має виконуваного носія. Також CI perf-bound буде native/node-проксі, не браузер — потрібен
виведений поріг (ratio 1.17-1.29× node, браузер невідомий). Non-blocking (прийомка на D2+), але
план має назвати метод браузер-виміру до завершення D2.

### N4 no-op на неконгестованих — ЗАКРИТО
§3 D1 вимагає довести редукцію до поточних маршрутів без контендед-коридору; інакше mock3 →
quality-гейт замість byte-freeze. Суперечність A1↔router-changes-output знята обома гілками.

### N5 partial-cohort конструктор — СКЛАДЕНО (non-blocking edge-case)
Конструктор заявлено (test-only, перші k у фіксованому mock3-порядку). Edge-case: часткова когорта
рве цілісність reports (orphan parent/lead/member) і крос-лінки cto-k→bi-k зʼявляються лише за
наявності конкретних посад → «first-crossing size» може бути артефактом вибірки, не монотонною
властивістю реальної ШПС. Ядро діагнозу все одно стоїть на повній 99-сцені (2 когорти). D0 має
зберігати цілісність reports і трактувати sweep обережно. Non-blocking.

## НОВІ дефекти від ревізії
- [edge/complexity] §4 D2 опція `cargo test --release -- --ignored` запускає ВСІ ignored
  (perf@500, golden 500, 148-когорта ~3.2s) → ризик часу/флейку CI. Краще іменований фільтр
  замість суцільного `--ignored`. Non-blocking (деталь D2).
- [slop/wording] §1 «mock3-50 must not regress» злипає mock3 (~11 посад) і 50-позиційну 1-когортну
  сцену (різні сцени: §0 таблиця). Уточнити формулювання. Non-blocking.
- Регресій тексту / суперечностей між секціями, що ламають коректність, НЕ знайдено. §2 (no
  output-changing code до D1) узгоджено з A6; A7 покриває дрейф frozen-observers від route_astar.

## ВЕРДИКТ: GREEN — 0 blocking
B1 закрито; N1-N5 складено (N1/N3/N5 з non-blocking залишками); нових блокерів ревізія не внесла.
Готовий до plan-defense. Non-blocking до врахування на D1/D2: метод браузер-виміру (N3, найсильніший),
цілісність partial-cohort (N5), іменований CI-фільтр замість `--ignored`, формулювання «mock3-50».
