# T125 critique — Dg17 (незалежний критик)

Модель: claude-opus-4-8

ДАЛІ: читаю задачу T125, ADR-0002, HANDOFF-dg17, тоді звіряю з кодом (visualEdgeBox, canvasLayout, StaffZonesView, staffZoneBounds, DepartmentCardView, mockupStyles, ShpsStaffCard) і Rust-боком core.

## ФАКТИ (звірено з кодом)

- Rust WASM експортує РІВНО одну ф-цію `computeOrgRowTreeLayout` (lib.rs:20). Gaps/margin/nodeWidth — ВХІДНІ параметри з TS (layoutBridge.ts:30-52). Тир-аранжування, крос-тир вісь, dept-пакування, floating, overlap-nudge — усе TS (canvasLayout.ts, orgBlockLayout.ts:78-157, staffDeptGrouping.ts:68-103).
- DOM React-картка (ShpsStaffCard) існує ЛИШЕ на near-LOD; на far Pixi малює. Коментар ShpsStaffCard.ts:6-9: «At far zoom the SDK draws the Pixi card instead; every size here is multiplied by viewport.scale» → DOM КОПІЮЄ розміри канви ×scale, НЕ навпаки.
- ADR-0002 (той самий Dg17) ВІДХИЛИВ варіант 3 (rust-якір) і 4 (якір з рендереної картки) — рядки 43-51. Вимога власника №3 просить саме 3+4.
- edgePort:'center' гілка visualEdgeBox.ts:69 — під гардом, дефолт avatar.
- Dept-пакування staffDeptGrouping.ts:82-102: регіони рознесені на `horizontalGap` МІЖ СІДАННЯМИ; DepartmentCardView.ts:43-59 малює рамку з `padding` назовні → сусідні рамки можуть торкатись/накладатись. Інтер-dept gap НЕ враховує padding рамки.
- Lead/current модифікатор: staffZoneAccent має лише `currentOrgChipAccent`; чіпа Lead НЕМА (StaffZonesView.ts:136). resolveZoneBandStyle(style, tier.role) — база за роллю.
- Вісь-тест: staffLayout.test.ts перевіряє існування tier-1 (:278) і cross-tier ребра (:285), але НЕ асертить центр-X tier1 head == tier2 head. dx>0 гард canvasLayout.ts:150; tier-3 від margin (:174). Вісь-тесту досі НЕМА — підтверджено.
