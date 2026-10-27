# GATE 2 ре-чек — R1-спека T126 (StaffGeometryResult контракт)

Модель: claude-opus-4-8

ДАЛІ: читаю types.rs, rust-types.ts, _r1-boundary.md, _gate2-r1-critique.md, plan.md, tasks.md, staffLiveGeometry.ts, svgExport.ts, layout/staff/types.ts, grep tiers/StaffTierBand.

## ФАКТИ (звірено з кодом)

- **Фікс присутній у types.rs:**
  - `StaffDepartmentFrameGeo` (types.rs:476-487): `departmentId: String`, `partIndex: Option<u32>` (rename+optional+skip), `x/y/width/height: f32`. Doc-коментар 466-469 прямо називає «єдине Rust-джерело для live+SVG (R5)» і padding-дефект ADR §13 + magnetic B5.
  - `StaffNodeGeo` += `department_id: Option<String>` (rename `departmentId`, 439-442) + `part_index: Option<u32>` (rename `partIndex`, 444-447); коментар 443 «узгоджено з StaffDepartmentFrameGeo.partIndex».
  - `StaffGeometryResult` += `department_frames: Vec<StaffDepartmentFrameGeo>` (rename `departmentFrames`, 580-581).
  - Export-тест `export_rust_types` містить `StaffDepartmentFrameGeo::export()` (types.rs:614) — усі 15 типів перелічені.
- **Regen rust-types.ts коректний:** `StaffDepartmentFrameGeo = { departmentId: string, partIndex?: number, x,y,width,height: number }` (33); `StaffNodeGeo` з `departmentId?`/`partIndex?` (89-97); `StaffGeometryResult` з `departmentFrames: Array<StaffDepartmentFrameGeo>` (63). camelCase і `?` для optional — вірно. Тип присутній.
- **«Дві правди» padding підтверджено в коді:** live `staffLiveGeometry.ts:62-69` `departmentWrapperPadding` має гілку `card` (padding+labelRow) ТА гілку blob→`contourButtonGroupMargin` (69), і подає як `contentPadding` (99); SVG `svgExport.ts:223` рахує `contourButtonGroupMargin(paddingCells, DEPT_STROKE_W)` напряму (без card-гілки). Формули реально різні → `departmentFrames` як вихід із готовими x/y/w/h усуває це на R5 (читання — R5, контракт це уможливлює). ✓
- **§2c правдивий тепер:** `layout/staff/types.ts:12-58` — поля StaffLayoutOptions реальні; `contentPadding` там НЕМА. §2c тепер явно каже «contentPadding — НЕ поле StaffLayoutOptions (Dg20)». StaffLayoutMetrics (rust) несе `contentPadding` як значення-вхід (rust-types.ts:76) — узгоджено з задумом «значення переходить, похідна лишається TS».
- **§5 грепна звірка правдива:** греп `\.tiers\b|StaffTierBand` по packages/sdk/src дає барелі `layout/staff/index.ts:8` і `render/index.ts:151` (обидва тепер названі в §5); personInteractions/e2eBridge/DiagramRenderer прямих `.tiers`/StaffTierBand НЕ мають (DiagramRenderer у грепі відсутній — читає `zones`) → §5 коректно називає їх over-inclusion.

## РЕ-ЧЕК ПИТАНЬ

1. **Блокер закрито — ТАК.**
   (а) `departmentFrames: Vec<StaffDepartmentFrameGeo>` з явними x/y/w/h = єдине Rust-джерело меж рамки (R5 мандат, plan §1/§4, ADR §13/§19). namespaces явно НЕ рамки відділів (types.rs:489-491) → подвійності типів нема.
   (б) B5: node.`departmentId`+`partIndex` ↔ frame.`departmentId`+`partIndex` виражає «картка в частині X відділу». ✓
2. **Нова неузгодженість у ФОРМІ — лише non-blocking:**
   - **organizationId/tier на frame відсутній.** Рамка розміщується абсолютними світовими координатами → паінт самодостатній без orgId. Ризик лише в node→frame-мапінгу по (departmentId, partIndex), ЯКЩО departmentId не глобально унікальний у багатоорг-вікні (яруси 1/2). Контракт **не фіксує** унікальність departmentId (StaffDepartmentInput={id}, §2a мовчить). Non-blocking: форма B5 виражається; рекомендація — зафіксувати унікальність departmentId у спеці (або додати organizationId на frame) до R3/R6.
   - **partIndex-нумерація** узгоджена коментарем (node↔frame спільний індекс) — prose-assert, не type-enforced; властиве контракту. База (0 vs 1) не зафіксована, але безпечна, бо обидві сторони ділять поле.
   - **None vs partIndex=0:** коментар визначає None=нерозрізаний (одна рамка), Some=частина. Двозначності нема, доки нерозрізаний завжди None (так і сказано). Non-blocking.
   - **B1 (0 посад):** порожня рамка виразна — StaffDepartmentFrameGeo незалежний від вузлів (власні x/y/w/h), запис без жодного StaffNodeGeo на його departmentId. ✓
3. **Точність §3/§4/§8/§10:** §3 вихід-таблиця (nodes +departmentId?/partIndex?, departmentFrames, namespaces=лише смуги) = types.rs ✓; §4 рядок «межі рамок → departmentFrames єдине джерело» ✓; §8 список R1 містить StaffDepartmentFrameGeo + поля ✓; §10 блокер-секція точно описує фікс. §5/§2c — правдиві (вище). «cargo test 54/0» — заява автора, прогін не перевіряв (R1 коду лейауту нема; export-тест структурно присутній).
4. **G1/G3:** G1 (dockHints окремий вхід, внести R6) — згоден: dockHints похідні від теми/стилю (`visualEdgeBox.ts`), а §6 тримає резолв теми в TS → вхід, не Rust-обчислення; non-blocking, бо вхід маршрутизації, не R1-форма результату. G3 (diagnostics у результаті) — згоден: збіг зі StaffCanvasResult.diagnostics, KISS. Обидва обґрунтовані.
5. **Конституція §7 п.4:** regen rust-types.ts відповідає types.rs (усі три зміни відображені, export-тест містить тип). ✓

## ТАБЛИЦЯ ЗАЛИШКОВИХ ЗНАХІДОК

| Знахідка | Статус | Посилання |
|---|---|---|
| frame без organizationId/tier; контракт не фіксує глобальну унікальність departmentId → потенційна двозначність node→frame у багатоорг-вікні | non-blocking (паінт по абс. координатах не страждає; зафіксувати унікальність або orgId до R3/R6) | types.rs:374-376,476-487 |
| partIndex-нумерація/база узгоджена лише prose-коментарем, не типом | non-blocking (властиве контракту) | types.rs:443,479 |
| dockHints оголошено входом (§2e) але відсутній у StaffLayoutInput | non-blocking (перенесено з G1; закрити до R6) | types.rs:398-413; §10 G1 |

## ВЕРДИКТ

- **Блокер із першого проходу (вихід не ніс меж рамок відділів + не виражав B5): ЗАКРИТО.** `StaffDepartmentFrameGeo` + `departmentFrames` + `StaffNodeGeo.departmentId/partIndex`, regen узгоджений, export-тест присутній.
- **Нової БЛОКУЮЧОЇ неузгодженості у формі контракту нема.** Три non-blocking (унікальність departmentId / partIndex-prose / dockHints-вхід) — закрити до R3/R6, не гейтять R1.
- **PASS-with-nonblocking** — блокер закрито, контракт замикається на мандатований вихід; гейт більше не червоний.
