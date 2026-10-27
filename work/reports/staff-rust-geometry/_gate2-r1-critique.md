claude-opus-4-8

# GATE 2 — незалежна критика R1-спеки T126 (staff Rust/TS межа)

ДАЛІ: читаю головний артефакт `_r1-boundary.md`, тоді plan.md / tasks.md / spec.md / ADR-0002 і код контракту (types.rs, rust-types.ts) + TS-сторону.

## ФАКТИ (перевірено проти коду)

- **A8 regen ПІДТВЕРДЖЕНО:** коміт `b8da929` містить і `types.rs` (+377), і `rust-types.ts` (+88), і `_r1-boundary.md`. Усі staff-типи в `rust-types.ts` camelCase (StaffLayoutInput/GeometryResult/Namespace/NodeGeo/NodeSize/RouteSet/EdgeRoute/OrgCardGeo/LayoutMetrics). Тест `export_rust_types` перелічує всі 15 нових типів (types.rs:567-583).
- **Форма §3/§8 збігається з types.rs:** StaffGeometryResult = {currentOrgId, nodes, orgCards, namespaces, edges, routes, width, height, diagnostics} — точно (types.rs:540-552).
- **StaffLayoutOptions поля (types.ts:12-58) реальні:** nodeWidth/nodeHeight/horizontalGap/verticalGap/margin/refCellWidth/refCellHeight/tierGap/orgCardWidth/orgCardHeight/zoneLabelBand — є. **`contentPadding` у цьому інтерфейсі НЕМА** — §2c помилково атрибутує його «із StaffLayoutOptions».
- **dockHints shape §2e точний:** visualEdgeBox.ts:73-91 — figma-row{tileX,tileY,tileSize} | gojs-row{cardY,cardH,countBarH}. edgePort 'center' перевірено (visualEdgeBox.ts:69).
- **Споживачі tiers/StaffTierBand (греп `\.tiers\b|StaffTierBand`):** реальні — canvasLayout.ts:11,55; layout/staff/types.ts:126,152 (ДЕФ); layout/staff/index.ts:8 (barrel re-export); render/StaffZonesView.ts:2,64; render/staffZoneBounds.ts; render/staffLiveGeometry.ts:20,54 (zones); render/types.ts:279 (коментар); render/index.ts:151 (barrel re-export enrichStaffTierBands); export/svgExport.ts:214; DiagramRenderer.ts:694 (zones); тести (staffLayout.test, canvasLayout.deptGrouping.test, staffZoneBounds.test); golden staffGeometry.golden.test.ts:49,96.
  - **personInteractions.ts** — НЕ має прямих посилань на `.tiers`/StaffTierBand (лише коментарі «staff tiers»). У §5 зайвий (over-inclusion, безпечно).
  - **e2eBridge.ts** — читає `canvas.edges` (рядок 189), НЕ `.tiers`. У §5 зайвий щодо саме tiers (over-inclusion, безпечно).
  - **ПРОПУЩЕНІ в §5:** `layout/staff/index.ts:8` та `render/index.ts:151` (барелі-реекспорти). Пойменований список §5 назвав себе «повністю за планом» — це неточно.

## ТАБЛИЦЯ ЗНАХІДОК

| Лінза | Знахідка | Статус | Посилання |
|---|---|---|---|
| Логічні діри / Edge | **Вихід-контракт НЕ несе меж обгорток відділів (dept-frame bounds).** ADR §13 називає подвійний padding обгорток відділів (live ≈36 vs SVG ≈6) як ЦЕНТРАЛЬНИЙ дефект, задля якого існує таск; plan §1 і r1 §4 заявляють «межі обгорток» як єдине Rust-джерело (R5). Але StaffGeometryResult має лише `namespaces` (kind: staff-block|org-cards) — жодного типу/поля для рамки відділу. Одна namespace-смуга містить багато відділів → namespaces не може представити рамку на відділ. Контракт не замикається на мандатований вихід. | **BLOCKING** | types.rs:459-476,540-552; ADR рядок 13; plan.md §1,§4; r1 §4 рядок 88 |
| Логічні діри / Edge | **B5 (magnetic-розріз) не представлено в контракті.** StaffNodeGeo не має `departmentId` ні part-identity; namespaces не мають dept-рівня. Немає способу сказати «картка в частині X відділу» → R6-маршрут до не-головної картки не має на що спертися. Реконструкція по departmentId з входу дасть ОДНУ рамку, не частини, і повертає TS-формулу (те, що таск усуває). | **BLOCKING** (разом із попереднім — одна діра: dept-геометрія) | types.rs:423-438; plan §8 B5; r1 §10 G1 |
| Логічні діри | **`dockHints` оголошено входом (§2e) але НЕМА у StaffLayoutInput.** types.rs StaffLayoutInput = {currentOrgId, positions, reports, organizations, departments, nodeSizes, options, edgePorts, expandedOrgIds, lod} — dockHints відсутній. Це наслідок відкритого G1; але §2e формулює «переходить як вхід» декларативно, не «pending G1». Вхідний контракт для R6-маршрутів не замкнений. | non-blocking (бо G1 явно відкрите; закрити ДО R6) | types.rs:398-413; r1 §2e рядок 57 |
| AI-slop | §5 стверджує список споживачів «тепер за планом повністю» — фактично неповний (2 барелі пропущено) + 2 over-inclusion. «Звучить завершено», але неточно. Пом'якшено мандатом ре-грепу на R7. | non-blocking | r1 §5 рядок 108 |
| AI-slop / точність | §2c атрибутує `contentPadding` «із StaffLayoutOptions (types.ts:12-58)» — там його немає; це нове значення, що TS рахує й подає. Намір пояснено нижче, але цитата хибна. | non-blocking | types.ts:12-58; r1 §2c |
| Надлишкова складність | Контракт у межах мандату R1 (ADR рядки 40-41: API результату + обсяг маршрутів). routes/role-enum/validate() — форма+guard, не логіка лейауту. Over-engineering не виявлено. | — | — |

## КОНСТИТУЦІЯ (6 пунктів, перевірено незалежно)

1. **Тести перед кодом (TDD):** ✓ — types.rs несе `#[cfg(test)]` контракт-тести валідатора, включно з failure (NaN, nonpositive): metrics_validate_rejects_nan_size/nonpositive (types.rs:614-626). R0-golden — окремий таск. Для контракт-спеки достатньо.
2. **KISS→Pocock, міграція виправдана виміряним:** ✓ — ADR документує два виміряні дефекти (padding live/SVG; порт ↔ картка T125 ~130px); Candidate A відхилено власником (ADR варіант 3). Перевірено проти ADR, не з [x].
3. **GoF ≥2-3 повторення:** ✓ — R1 додає лише data-структи, патернів не вводить.
4. **Межа WASM↔TS — явний контракт, regen у тому ж диффі:** ✗ **(тут блокер)** — regen ПІДТВЕРДЖЕНО (b8da929 несе rust-types.ts), власність пам'яті чиста (serde by-value, owned). АЛЕ сам «явний контракт» НЕ повний: мандатований вихід (межі обгорток відділів) відсутній, вхід dockHints відсутній. Контракт не замикається → пункт червоний.
5. **Публічний API не змінюється мовчки:** ✓ — R1 НЕ чіпає TS `StaffCanvasResult` (types.ts:150-159 без змін, `tiers` на місці); rename відкладено на R4/R7; `docs/USAGE.md` не чіпано; хост tiers не споживає (AGENTS.md).
6. **Pocock тільки TS:** ✓ — контракт у Rust (types.rs), Pocock не застосовний.

## G1 — dockHints окремий вхід чи Rust рахує з edgePort+nodeSize?

**Вердикт рев'юера (аргументований, не coin-flip):** окремий ВХІД — правильно і фактично ВИМУШЕНО вже ухваленою межею. dockHints виводяться з `figmaRowAvatar(style)` / `resolveGojsRowLayoutMetrics(position, style)` (visualEdgeBox.ts:70-91), що залежать від `PersonNodeStyle`/теми. r1 §6 і plan «що лишається TS» прямо тримають резолв `NodeTheme`/стилів у TS («не їде в Rust»). Рахувати dockHints у Rust вимагало б перенести резолв теми/аватар-правил у Rust — що суперечить уже зафіксованій межі. Тож це не вільна розвилка власника: межа §6 вже визначила відповідь. Ціна — ширший вхід (avatar-tile геометрія лишається TS) — неминуча, якщо тему не переносити (а її свідомо не переносять). **Застереження:** це рішення треба внести в StaffLayoutInput (зараз dockHints там немає) ДО R6; і зафіксувати, що це розширює вхідну поверхню — прийнятно.

## G3 — diagnostics у гео-виході чи окремий канал?

**Вердикт рев'юера:** лишити в результаті (як зараз, StaffGeometryResult.diagnostics, types.rs:551). Збігається з наявним `StaffCanvasResult.diagnostics` (types.ts:158), на один канал менше, KISS. Виносити окремо варто лише якщо діагностика має стрімитись незалежно від геометрії — такої вимоги в спеці/плані немає. Не блокер; власник може перевизначити, але тиску ціни нема.

## ПІДСУМОК

**FAIL (гейт ЧЕРВОНИЙ).** Блокер: вихід-контракт `StaffGeometryResult` не несе меж обгорток відділів — саме тієї геометрії, подвійність якої (padding live/SVG) є центральним виміряним дефектом таска й мандатованим єдиним Rust-виходом (ADR §13, plan §1, r1 §4) — і не представляє частин відділу для B5; StaffNodeGeo не має departmentId для реконструкції. Контракт не замикається на свій головний deliverable. Поки відкрито — гейт лишається червоним. Решта (regen A8, валідатор F6, rename-відкладення, конституція 5/6) — у порядку; dockHints-вхід і неточності списку споживачів/§2c — non-blocking, закрити до R6/R7.
