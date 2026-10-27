# T127 адверсарна критика — Dg17

Модель: claude-opus-4-8

ДАЛІ: читаю T127 + контекст (_org-wrappers-tree-analysis §8-9, _org-wrappers-critic, T125, T126, ADR-0002, SPEC ~:74-97,:259) і перевіряю код (canvasLayout, orgBlockLayout, staffDeptGrouping, staffZoneBounds, StaffZonesView, staffZoneAccent, DiagramRenderer, types StaffTierBand, index.ts експорти, e2eBridge).

## ФАКТИ (звірено з кодом)
- canvasLayout.ts:174 cardX=margin; :217 cardX+=columnWidth+horizontalGap → ряд від margin, без центрування. ВІРНО.
- canvasLayout.ts:150 `if (dx>0)` — центрування лише вправо. ВІРНО. ADR-0002:56-60 підтверджує: тесту осі нема, dx≤0/ярус-3 непокриті.
- canvasLayout.ts:247-250 curHead→card.orgId kind:'cross-tier' (задача пише :246-250 — зсув на 1). По суті ВІРНО.
- canvasLayout.ts:82 opts.zoneLabelBand у лейауті (зсув нод вниз). ВІРНО.
- DiagramRenderer.ts:712 contentPadding=departmentWrapperPadding(theme,config); :722 labelBand:this.lastZoneLabelBand. ВІРНО.
- **DiagramRenderer.ts:649 КОМЕНТАР У КОДІ: zoneLabelBand "can differ from staffOpts.zoneLabelBand".** → T127.0a заземлена: desync labelBand РЕАЛЬНИЙ, не гіпотеза. :650/:656 — обидва з buildStaffLayoutOptions, render бере окремий zoneLabelBand, лейаут — staffOpts.zoneLabelBand.
- staffZoneAccent.ts:30,39 role:'leading'|'current'|undefined; resolveZoneBandStyle обробляє лише 'current'. 'leading' не резолвиться, 'subordinate' нема. ВІРНО.
- types.ts:147 StaffTierBand.role?:'leading'|'current' (НЕ subordinate). :150-159 StaffCanvasResult, edges kind має 'cross-tier'. ВІРНО.
- **types.ts:126-132 org-cards band має cards[], НЕ має organizationId; enrichStaffTierBands(staffZoneBounds.ts:148) резолвить role ЛИШЕ з tier.organizationId.** → для ярусу 3 role завжди undefined; per-card subordinate-role НЕ має каналу. КЛЮЧОВА ДІРКА.
- index.ts:259 layoutStaffCanvas, :281 type StaffCanvasResult — експортовані. ВІРНО.
- e2eBridge.ts:167 функція зветься **staffLayoutEdgesFor**, не "getStaffLayoutEdges" (задача:52,101 цитує неіснуючий символ). Non-blocking, але в плані на path:line.
- worldBoundsForTier (staffZoneBounds.ts:15-110) чиста; розширює band ВГОРУ на pad+labelBand (:54), ВНИЗ на pad. → сусідні band перетнуться якщо gap контенту < 2*pad+labelBand. I-Z1 НЕ гарантовано самим лейаутом.
- T126 blocked/needs-spec; §8 T127 робить T126 залежним від T127.1 (єдине джерело меж) — але T126 неспецифікований → ризик спроєктувати не той шов.
- ADR-0002 status:accepted, але файл УНТРЕКНУТИЙ (git ??) → правка до merge ОК. І T126, і T127.0b хочуть "розширити ADR-0002" — координація.

## РІШЕННЯ: критику завершено, handback.
