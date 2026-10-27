# Мапа обгорток у бібліотеці (Dg17) — що для чого

Власник назвав три: **Обгортка / Magnetic / Matrix**. У коді вони на **різних рівнях** — це важливо.

## Рівень 1 — зона ОРГАНІЗАЦІЇ / ярусу (staff)
**`StaffZonesView`** (`packages/sdk/src/render/StaffZonesView.ts`) — рамка навколо орг-ярусу staff-сцени.
НЕ department-wrapper. Несе модифікатори за `role`:
- **base** — звичайна орг-зона;
- **current** = база + чіп «Поточна організація» (`currentOrgChipAccent`, `render/staffZoneAccent.ts`) — РІШЕННЯ ВЛАСНИКА;
- **lead** = ОКРЕМА обгортка (окремий band), не база+чіп — РІШЕННЯ ВЛАСНИКА (S2). Зараз НЕ реалізовано (є лише current).

## Рівень 2 — обгортка ДЕПАРТАМЕНТУ: `DepartmentPaintStyle = 'blob' | 'card'` (`render/types.ts:257`)
Вибір через `config.departmentStyle` (дефолт **`'blob'`**, `types.ts:470`; роутер `DiagramRenderer.ts:759`):
1. **`card` = «Обгортка»** — `DepartmentCardView` (`render/DepartmentCardView.ts`): пунктирна **прямокутна рамка**
   + заголовок + бейдж «N поз.». Рамка з padding НАЗОВНІ сідань (`:43-59`). **Використовує ШПС** (`tabConfigs` staff-shps).
2. **`blob` = «Magnetic»** — `paintMagneticGroups` (`render/contour/paintMagneticGroups.js`, експорт `render/index.ts:73`):
   **магнітні контури** (wash) навколо сідань. Потребує `gridCell`-координати (authored), інакше контури пропускаються
   (`DiagramRenderer.ts:769`). Pre-T64 дефолт. `MOCKUP_MAGNETIC_STYLES` (`mockupStyles.ts:131`) — department як контур.

## Рівень 3 (org-matrix) — «Matrix»
**`siblingOrgGroups`** (`layout/siblingOrgGroups.ts` — «dashed chrome B8c / GoJS matrix», `:49`) +
**`matrixLayout`** (`layout/matrixLayout.ts`): рамка-бокс навколо згорнутих **сусідніх ОРГАНІЗАЦІЙ** + матрична сітка орг
(`matrixShape/matrixRows/matrixColumns`, `matrixGrid.ts`). Це про **org-level matrix**, НЕ staff-департаменти.

## Що з цього випливає (на звірку з власником)
- «Три обгортки» власника = **два РІЗНІ рівні**: `blob`/`card` — обгортки ДЕПАРТАМЕНТУ (staff); `matrix` — обгортка
  сусідніх ОРГ (org-режим). Плюс `StaffZonesView` — зона орг-ярусу (окремо від усіх трьох).
- Для ШПС зараз: орг-зони = `StaffZonesView`; департаменти = `card` (`DepartmentCardView`).
- **Відкрите:** чи вимога №1 («3 типи обгорток») стосується department-рівня (blob/card/+matrix?), чи org-зон
  (base/current/lead)? Мапа показує, що це різні осі — треба узгодити, що саме уніфікуємо.

## ✅ РІШЕННЯ ВЛАСНИКА (Dg17)
- **department-рівень: `card` + `blob`(magnetic) — СПРОБУВАТИ ОБ'ЄДНАТИ** в одну обгортку департаменту.
  Вони зараз різні підсистеми: `DepartmentCardView` (прямокутна рамка, потребує tree-layout) vs
  `paintMagneticGroups` (магнітний контур, потребує `gridCell`). Об'єднання = архітектурна розвідка
  (чи одна обгортка з двома режимами рендеру за спільним контрактом bounds), НЕ сліпий код. → нова
  підзадача **S7** (розвідка `pattern-architecture-review` перед кодом, як req#3).
- **org-зони (StaffZonesView):** Lead = ОКРЕМА обгортка; Current = база + чіп; base. (вимога №1 S2.)
- **Matrix** — org-рівень, поки поза скоупом staff-уніфікації (інша вісь).

## TODO мапи (з власником, у наступній сесії)
Коли card+magnetic об'єднані — вирішити, чи matrix теж лягає в той самий уніфікований контракт обгортки,
чи лишається org-рівневим окремо.
