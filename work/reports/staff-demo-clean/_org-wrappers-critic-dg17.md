# Адверсарний критик — org-wrappers tree analysis (Dg17)

Модель: claude-opus-4-8

ДАЛІ: прочитати аналіз, що критикую (`_org-wrappers-tree-analysis-dg17.md`), потім еталон-вимогу, wrapper-map, T125/T126, ADR-0002, SPEC §ярус 3. Далі — звірити твердження §3 з кодом (canvasLayout, staffEdgeGeometry, StaffZonesView, staffZoneBounds, staffZoneAccent, spineBusEdges, siblingOrgGroups, DiagramRenderer).

## ФАКТИ (звірено з кодом)
- canvasLayout.ts:174 `cardX = opts.margin`; :217 `cardX += columnWidth + horizontalGap` → ряд від margin, без центрування. ВІРНО.
- canvasLayout.ts:247-250 edge `curHead → card.orgId kind:'cross-tier'` (не :246). ВІРНО по суті.
- staffEdgeGeometry.ts:367-376 cross-tier: пряма вертикаль, інакше ladder. ВІРНО.
- StaffZonesView.ts:92,96 includeOrgCardsBand default false, org-cards пропуск. ВІРНО.
- staffZoneAccent.ts:42 resolveZoneBandStyle обробляє лише 'current'; тип role = 'leading'|'current'|undefined — 'subordinate' НЕ існує. 'leading' не резолвиться. ВІРНО.
- SPEC:259 «ярус 3 лишається оглядовим; важка штатка лише в focus» — ВІРНО, цитата точна.
- spineBusEdges.ts:45 buildSpineBusPaths — чиста ф-я parent+children, реюзна. ВІРНО (але rowTree=Rust org-nodes, не staff seats — «готова» перебільшено).

## КЛЮЧОВА ПОМИЛКА D2
- staffZoneBounds.ts:15-151 worldBoundsForTier / enrichStaffTierBands — ЧИСТІ функції над ВИХОДОМ лейауту (positionNodes, orgCards, tier bands) + margin/contentPadding/labelBand. Лежать у render/ лише за розташуванням файлу. Реюз ТІЄЇ Ж функції для кінця ребра = ОДНЕ джерело = АНТИ-desync, а не новий desync. Аналіз ІНВЕРТУВАВ ризик.
- Реальна (мала) залежність: contentPadding = departmentWrapperPadding(theme,config) (DiagramRenderer.ts:712) — theme-вхід. Для layout-фази ребра треба подати theme-padding у лейаут. Це маленьке спаювання, не «desync калькуляції».
- Tier3 band уже має content-union bounds (staffZoneBounds.ts:57-88: union cards+tier3 nodes) — уже content-driven (T126). 
- ПРОПУЩЕНИЙ D4: порахувати band bounds У ЛЕЙАУТІ (canvasLayout:224-230 уже пушить band y/height; worldBoundsForTier чиста → викликати в layout, емітити x/width/y/height, докувати ребро до band). Розчиняє всю дихотомію render-vs-layout, яку аналіз подав як фіксоване обмеження.

## T125/ADR/SPEC контекст
- T125:27 вже казав «база+модифікатори (чіп Lead/чіп Поточна)»; T125:135 N1, :155 Q5 — Lead лишався ВІДКРИТИМ. wrapper-map S2 «Lead=окрема band» подано як РІШЕННЯ ВЛАСНИКА, хоча T125 показує що було відкрито. Нове «фон» — ТРЕТІЙ варіант. Аналіз §2 чесно це фіксує.
- ADR-0002: якір оголошує нода; ярус-3 прямо названий непокритим (:57-58, :73). D2 розширює «точку підʼєднання» на band — узгоджено з напрямом ADR.
- SPEC:259 «оглядовий» vs owner «деревоподібно ярус3» — реальна напруга, має бути BLOCKING, не просто Q5.

## РІШЕННЯ
Критику завершено. Handback з повним звітом.
