# R6-7 scope A — незалежне ревʼю (Dg25)

model: claude-opus-4-8

ВЕРДИКТ: 🟢 GREEN — готове до коміту (scope A). 0 BLOCKING.

## Перевірені пастки критика (всі закриті)
- (а) accent → admin-only: `StaffEdgesView.ts` `accented = seg.kind === 'admin' && accentKeys.has(key)`;
  arrow `withArrow = !dotted && seg.kind === 'admin'`; `svgExport.ts:310` `withArrow = s.kind === 'admin'`. ✓
- (б) classify-гілка `staffEdgeGeometry.ts:367` cross-tier→lead-org; логіка байт-у-байт та сама (лише kind+коментар). ✓
- (в) golden `staff-geometry.json`: canonical-JSON ІДЕНТИЧНИЙ після ренейму cross-tier→lead-org; admin 3540 і dotted 15 без змін, 190 cross-tier→190 lead-org. Reorder = kind.localeCompare. ✓
- (г) cross-tier видалено скрізь; єдине входження — тест «cross-tier is gone» (staffEdgeStrokes.test.ts:22). ✓
- (д) stroke-таблиця — один модуль `render/staffEdgeStrokes.ts`; StaffEdgesView і svgExport обидва імпортують звідти, дубля немає. ✓
- (е) порожня мітка = no-op: StaffEdgesView не рендерить текст ребер (grep label|text = none). ✓

## Інваріанти
- H3: live+SVG одна таблиця; parity-тест розширено на стиль (dash/color). ✓
- H6: golden «reproduces exactly on a second build» зелений. ✓
- §12 foreign-frame marker: збережено (markedKeys→#dc2626), SVG тепер dashed+red = паритет з live. ✓
- host EdgeStyle override: staffEdgeStrokes застосовує edge.color/width до lead-org (тест figma['lead-org']=0xa6a6a6); accent свідомо НЕ (admin-only). ✓

## Слабка мутація — чесна
Гілка :367 незмінена від cross-tier → routing lead-org = старий cross-tier, нового багу нема. Тест endpoint-preservation guard, чесний.

## Зелене
- rust `lead_org_person_to_org_card_resolves` ok
- SDK 68 passed / 0 failed (staffEdgeStrokes, svgExport.parity, staffEdgeGeometry, staffLayout)
- demo golden+census+mockupEdgeInventory passed
- typecheck чистий (sdk+demo+e2e)

## NON-BLOCKING
1. svgExport тепер стилізує й matrix/dotted (раніше solid #334155) — ширше за lead-org, але у бік H3-паритету, покрито новим тестом. Не дефект.
2. scaleStaff.ts має org з id 'lead-org' (organizationId) — namespace-окремий від edge.kind, колізії нема, лише збіг назв.

## Поза scope
- scope B (deptTop head-target) відсутній: seam (staffRouterV2/staffLiveGeometry) недоторканий, reportLines у canvasLayout не додано. ✓
- check:docs RED (CTO staleness) — пре-існуючий борг, не R6-7.
