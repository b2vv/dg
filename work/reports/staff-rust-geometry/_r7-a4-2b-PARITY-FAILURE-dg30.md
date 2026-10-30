# 🔴 A4.2b БЛОКЕР — Rust-геометрія НЕ відтворює TS байт-ідентично (dg30, 2026-10-30)

## Суть
Коміт B дротовано (buildStaffDockHints + staffLiveGeometry rewrite на Rust-стек + FORK2).
Перший реальний e2e-прогін golden (Rust-live проти baseline, знятого зі СТАРОГО TS) показав
**масове розходження, НЕ лише `bands`**. Премиса A4.2b («єдиний diff = live.bands→[]») — **хибна**.
НЕ rebaseline (заморозило б неперевірений Rust як істину). WIP не закомічено. Baseline відновлено з git.

## Метод
1. Бекап baseline → `/tmp/dg29-golden-old.json` (1 600 049 B, знятий OLD-конвеєром у Коміті A).
2. `UPDATE_GOLDEN=1` → NEW baseline (1 662 482 B, Rust-стек) → `/tmp/dg29-golden-new.json`.
3. Семантичний leaf-diff по всіх сценах (scratchpad `dg29-real.mjs`), **tolerance = 1px як у golden**,
   виключивши очікуваний `bands` (FORK1 E1).
4. Baseline відновлено (`git checkout`, cmp збігається з бекапом).

## Реальні розходження (>1px, без bands) — 10 з 11 сцен
```
✓ staff-dept-legacy      0        ← ЄДИНА чиста
✗ staff-dept-v2          4        routes
✗ staff-shps            12        routes
✗ mockup-staff-figma    23        routes
✗ staff-tree            30        routes  (вузли БАЙТ-ІДЕНТИЧНІ → чистий routing)
✗ mockup-staff-gojs     90        routes:66 nodes:9 zones:3 orgCards:1 w/h
✗ variant-b            131        routes:84 nodes:18 w/h
✗ worker               131        routes:84 nodes:18 w/h   (== variant-b)
✗ staff-brigade        141        routes:132
✗ mockup-staff-magnetic 307       routes:228 nodes:36 zones:8 w/h
✗ staff-1m           16677        routes:12794 nodes:1899 orgCards:23 zones:9 w/h
```

## Класифікація
- **f32↔f64 шум (benign):** велика частина сирого exact-diff (17 806) — суто субпіксельна
  (`384.56 → 384.55999755859375`); golden ТОЛЕРУЄ ±1px. Це НЕ проблема.
- **routes — систематично в 10/11 сцен (реально, >1px):** навіть де вузли байт-ідентичні
  (`staff-tree`), routes розходяться. Приклад (staff-tree, lead-org, near):
  - OLD `[{92,344},{92,328},{364,328},{364,768}]`
  - NEW `[{92,500},{92,634},{364,634},{364,768}]`
  Той самий кінець (364,768) і x-осі, але **точка доку/згину інша** (start-y 344→500, elbow 328→634).
  lead-org edges НЕ використовують person-dockHints → це НЕ баг buildStaffDockHints.
- **nodes — у matrix/portrait/великих сценах:** variant-b/worker (18), magnetic (36), gojs (9),
  staff-1m (1899). layout-розходження, не лише routing.
- **staff-1m:** canvas **7064→135608 вшир (~19×)** за ТІЄЇ Ж кількості вузлів (633) — горизонтальний
  розгін, НЕ collapse-not-applied (counts збігаються).
- **router-режим не пояснює:** лише staff-dept-v2 = 'v2'; решта 'legacy'. Але legacy staff-dept-legacy
  чистий, а legacy staff-tree — ні.

## Висновок
Rust staff-геометрія (routing скрізь; layout у складних сценах) **не є байт-паритетною** до TS
`layoutStaffCanvas`+`resolveStaffRouting`. Схоже, end-to-end Rust↔TS паритет геометрії
**ніколи не перевірявся** (A3 = typed pass-through bridge; A4.1 тестує лише INPUT-мапінг; A2.x —
Rust-side). Golden сьогодні — перша реальна звірка виходу, і вона червона.

## Потрібне рішення власника (НЕ діяти без нього)
Варіанти (жоден не можна обрати агентом — міняють контракт/скоуп):
1. **Rust — джерело істини, повний rebaseline golden** → суперечить «тільки bands» і премисі
   byte-identical; треба незалежно підтвердити, що Rust-routing/layout КОРЕКТНІ, а не просто інші.
2. **Rust має відтворювати TS → це Rust-баг(и)** у routing (dock-anchor/elbow) + layout
   (matrix/portrait/горизонтальний розгін) → лагодити `packages/core` ПЕРЕД A4.2b.
3. Проміжне: прийняти layout, але не routing (або навпаки) — потребує окремого аналізу.

## ROOT-CAUSE (діагностика D1 routing + D2 layout, 2/2 повернуто)
Деталі: `_r7-a4-2b-diag-routing-dg30.md`, `_r7-a4-2b-diag-layout-dg30.md`. Розходження = три природи:

**(1) Явні БАГИ — лагодяться до паритету:**
- *routing card_pad-гейт*: Rust вмикає обхід карток лише при `content_padding>=8` (staff_layout.rs:1246-1250); blob-стиль → card_pad=0 → сирий ortho. TS (staffRouterV2.ts:60-80) обходить ЗАВЖДИ, гейту content_padding не має. ~1129 TS aroundTop стали ortho. [D1, висока]
- *layout matrix-координати*: `buildStaffLayoutInput.ts:226-231` викидає `gridCell`/`layoutX/Y`/`layoutCoords`; вони вмикають TS matrix (coords.ts:31 → orgBlockLayout.ts:385-434, role='matrix'). Rust tree-only (staff_layout.rs:4-6,971); обіцяного в Rust-коментарі «гейту matrix перед викликом» НЕМА ні в buildStaffLayoutInput, ні в staffLiveGeometry → matrix→tree, координати втрачено (staff-1m 19×). [D2 Root#1, висока]

**(2) Свідомо інша логіка — byte-parity лише переписавши Rust під TS-контракт:**
- routing блокує по clearance-відстані (<card_pad, staff_routes.rs:573-583) vs TS interior-перетин (eps 0.75, staffEdgeGeometry.ts:245). [D2]
- detour-геометрія corridorY+side_detour H-V-H (staff_routes.rs:417-482) vs TS aroundTop/aroundLeft fixed pad=16 (staffEdgeGeometry.ts:102-127). Rust не має aroundTop-примітиву; A2.2-ладдер сам визнає «behavior change vs A2.1». [D3]

**(3) Архітектурна ПРОГАЛИНА:** matrix-режиму в Rust-контракті немає взагалі (tree-only; matrix потребує координат членів, яких Rust не отримує). Або Rust приймає координати+matrix, або адаптер гейтить matrix на TS — останнє лишає TS шляхом (суперечить «одна істина»).

**(вторинне, не доведено до рядка):** gojs detached-inference розходження (pos-sup/pos-vac TS=detached, Rust=tree; ймовірно admin-parent map / report-фільтр buildStaffLayoutInput.ts:218-222). [D2 Root#2, середня]

## Стан репо
- WIP (uncommitted): buildStaffDockHints.ts, staffLiveGeometry.ts rewrite, buildStaffLayoutInput.ts
  (resolveMetrics export + capExpandedChildren export), OrgHierarchyDiagram.ts (FORK2),
  DiagramRenderer.ts (прибрано staffCanvasResult), svgExport.parity.test.ts (прибрано canvas-ін'єкцію).
- typecheck EXIT=0. golden — НЕ rebaseline, baseline відновлено.
- Артефакти: `/tmp/dg29-golden-old.json`, `-new.json`, scratchpad `dg29-real.mjs`/`dg29-perscene.mjs`/`dg29-routes.mjs`.
