claude-opus-4-8

# R5 scope critic — Dg22 (незалежний критик)

ДАЛІ: читаю tasks.md (R5), plan.md (§1/§3/§5/§8/§99), staffZoneBounds.ts, svgExport.ts, layoutBridge.ts, staff_compose.rs, types.rs; шукаю хто кличе enrichStaffTierBands/worldBoundsForTier.

## ФАКТИ (звірено з кодом)

F1. ОБИДВА споживачі меж уже кличуть ОДНУ TS-функцію `enrichStaffTierBands`:
    - live: `staffLiveGeometry.ts:102` (contentPadding=`departmentWrapperPadding(theme,config)` :99, labelBand=`zoneLabelBand` :106)
    - SVG: `svgExport.ts:214` (contentPadding=`contourButtonGroupMargin(paddingCells,DEPT_STROKE_W)` :223, labelBand ВІДСУТНІЙ)
    → «дві правди» (H3/A2) = НЕ дві формули, а ОДНА формула з РІЗНИМИ аргументами (padding-джерело + labelBand).
    Підтверджує rust-types.ts:29 «усуває подвійний padding (ADR §13: live departmentWrapperPadding vs SVG ...)».

F2. Розбіжність padding найгірша саме на `card`-сцені (а H3 вимагає паритет на card):
    `departmentWrapperPadding` :62-70 на style='card' = card.padding+labelRow (≠ contourButtonGroupMargin); на 'blob' ≈ contourButtonGroupMargin але зі strokeWidth з ТЕМИ, а SVG бере константу DEPT_STROKE_W. + labelBand лише в live → вертикальний зсув.

F3. Канал Rust→TS меж СЬОГОДНІ НЕ ІСНУЄ. `layoutBridge.ts` експонує лише `computeOrgRowTreeLayoutWasm` → `OrgRowTreeLayoutResult` (row-tree), НЕ staff namespaces. `compose_tiers`/`compose_org_cards` (staff_compose.rs) — чисті Rust-продюсери R4, не підключені через WASM-біндинг і не споживані `layoutStaffCanvas` (TS). `StaffNamespace.x/width=0` (types.rs:505-508, compose_tiers.rs:59-61 «R5 заповнює»).
    canvas.tiers сьогодні будує TS `layoutStaffCanvas` (canvasLayout.ts, zoneLabelBand-композиція :82-123).

F4. StaffZonesView.ts:99 коротко-замикає: якщо tier.x/width визначені → читає їх напряму, інакше кличе worldBoundsForTier. svgExport.ts:214 НАВПАКИ — завжди переобчислює з нуля, ігноруючи pre-baked. Тобто навіть якби live читав Rust, SVG однаково переобчислює, доки його НЕ перероблять.

F5. R5 DAG: tasks.md:15 «Залежить: R3, R4» (НЕ R2). §99: між R5 і R7 ДВІ формули меж співіснують за прапором — свідомо. Прапора «форми результату» для меж у коді НЕ існує (є лише config.staffEdgeRouter 'v2'|'legacy' для роутингу).

## ВЕРДИКТ ПО ПИТАННЯХ

Q1: Паритет live↔SVG на R5 БЕЗ R2/R7 через реальний рендер-шлях — НЕДОСЯЖНИЙ. Каналу немає (F3). Щоб обидва читали Rust-межі, треба: (a) WASM-біндинг staff-namespaces, (b) адаптер Rust→canvas.tiers (це R7, ламає tiers→namespaces), (c) content-driven розміри в Rust (торкається R2). Єдине, що досяжно на R5 — cargo-тест Rust-меж проти TS-оракула (worldBoundsForTier), без рендер-шляху.

Q2: В2 ПОРУШУЄ і DAG, і §99. Підключення обох споживачів «за прапором читати Rust» = виконати роботу R7 (адаптер+переробка svgExport, F4) достроково + потребує content-розмірів (R2). Прапор ще не збудований (F5). §99 прямо каже: до R7 дві формули СПІВІСНУЮТЬ — В2 схлопує в одну зараз, що суперечить N-6.

Q3: В1 ЧЕСНО закриває лише «Rust-межі == TS-оракул» (cargo), що є реальна фіча (тест червоніє без порту) — НЕ assert-true-without-feature ЗА УМОВИ, що оракул-тест нетривіальний. АЛЕ В1 НЕ закриває H3/A2 як спостережувану поведінку: два споживачі досі розходяться в аргументах (F1/F2). Маркування R5=«closes H3,A2» під В1 — хибне; H3/A2 лишаються ВІДКРИТИМИ до R7. tasks.md:15 критерій «паритет live vs SVG зелений» під В1 НЕДОСЯЖНИЙ → критерій R5 треба переформулювати на «cargo-паритет із TS-оракулом».

Q4: ТРЕТІЙ ВАРІАНТ існує і він найчистіший архітектурно: де-дуп TS — винести єдиний `buildStaffZones(...)`, який обидва (live+SVG) кличуть з ІДЕНТИЧНИМИ labelBand+contentPadding (або svgExport починає передавати ті самі аргументи). Це закриває H3/A2 як спостережувану поведінку ЗАРАЗ, у TS, дешево, БЕЗ Rust/R2/R7. Rust-as-source лишається на R7. Підводні: (a) це TS-робота в «Rust-only» R5 — скоуп-дрейф; радше окремий дефект-таск; (b) може викинутись на R7 — але це дешевий regression-guard, а SVG-паритет СЬОГОДНІ не стереже ніщо (R0 golden — лише активний live-шлях, B7); (c) мусить торкнутись padding-ДЖЕРЕЛА (F2), не формули — інакше нічого не фіксить.

Q5 (не названі підводні):
- НАЙГЛИБШИЙ: дефект у ВЕРХНЬОМУ шарі (два padding-джерела + labelBand, F1/F2), а не в формулі union+pad (вона вже спільна). Порт спільної формули в Rust БЕЗ уніфікації padding-входів = рух без фіксу. Якщо R5 «запече» конкретне padding-джерело в Rust, воно ВІДТВОРИТЬ «дві правди» в новому місці, доки padding не стане ВХОДОМ Rust.
- cargo-оракул В1 збіжиться з worldBoundsForTier лише якщо Rust отримає ТОЙ САМИЙ labelBand і той самий theme-derived padding (card.padding+labelRow). Ці значення — TS/theme, не очевидно в контракті входів Rust. Ризик зеленого оракула, що не відповідає жодному реальному споживачу.
- R0 golden не стереже SVG-паритет (лише live-геометрію, B7) → В1 нічим не ловить H3-регрес до R7.
- svgExport завжди переобчислює (F4) → В2 мусить переписати і svgExport, не лише «прапор».
- Прапор форми-результату не існує (F5) → В2 будує ще й плумбінг прапора (R7-shaped).

## РЕКОМЕНДАЦІЯ
В1 (pure Rust producer + cargo-оракул), АЛЕ з переформулюванням критерію R5 (зняти «паритет live vs SVG зелений» → «Rust-межі==TS-оракул у cargo»; H3/A2 позначити OPEN до R7). Паритет (H3/A2) винести або в R7, або в окремий дешевий TS-де-дуп таск (Q4) — бо це TS-wiring-проблема, незалежна від того, Rust чи TS рахує межі. В2 відхилити: порушує DAG+§99, тягне R7/R2 у R5. Gate для R5 лишається «не-паритетним».
