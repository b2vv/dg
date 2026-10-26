# T2 — підняти layout-compute з рендера у #4 (спліт dg #2)

**Status:** spec готова, стейджено T2a→T2b. Критика: 1 раунд (seam/staleness/diagnostics), 0 відкритих.
**Репо:** `~/projects/dg`, `bulk-mutations`, база HEAD `f67731c` (T0). Recon: `_wip-T2-layout-seam-recon.md`.

`DiagramRenderer.render()` сам кличе layout (`computeOrgLayout` :1079, `layoutStaffCanvas` :665) — брудний шов render→layout (×32). T2 підіймає **виклик** (не функції — NB4 релокація call-site, НЕ `LayoutPort`) у `OrgHierarchyDiagram` (#4), щоб `render()` приймав ВЖЕ позиціоноване. Передумова renderer-інтерфейсу T3 (layout рахується ДО вибору рендера). Стан: рендер один (Pixi), тож «обидва рендери той самий результат» поки механічно тривіальне — сам шов і є ціль.

## Чому
Доки `render()` рахує layout усередині, renderer-інтерфейс (T3) не можна визначити як «малюй готове»: кожен адаптер успадкував би layout-виклик. Вада наявного шляху (recon): `render()` :424 гілкується за `data.positions.length` і в staff/org-гілці кличе async layout, по якому вже СТОЇТЬ `isRenderCurrent`-guard — тобто layout та staleness зараз сплетені в рендері. Виміряна корекція посилки: це НЕ однорідний «один виклик нагору» — STAFF тягне рендер-внутрішні хелпери (`resolveStaffZoneStyle` :1224) і діагностику (`canvas.diagnostics`→`lastDiagnostics` :679), а ORG — ні. Тому дроблю.

## Рішення
**Фасад рахує layout ПЕРЕД `render()` і передає результат новим параметром; `render()` стає чистим «малюй позиціоноване».**

**Shape (recon §5):** новий параметр `render(data, theme, resolved, config, options, positioned?)` — `positioned?: StaffCanvasResult | OrgLayoutResult`. options лишаються knobs+callbacks (НЕ запихати туди layout). Коли `positioned` подано — рендер малює його; коли ні — лишається поточний internal-compute (перехідний стан між T2a і T2b).

### T2a — ORG-гілка (зараз)
- Фасад: у `renderNow`, для org-режиму (`data.positions.length === 0 && data.organizations.length > 0`), покликати `computeOrgLayout(this.data.organizations, this.data.orgLinks ?? [], this.viewState.orgLayout)` ПЕРЕД `render()`, передати як `positioned`.
- `renderOrganizations` :1071: якщо `positioned` (org) надано — не кликати `computeOrgLayout` :1079, узяти переданий; інакше (перехід) рахувати як зараз.
- Guard `isRenderCurrent` :1084 ЛИШАЄТЬСЯ (layout тепер awaited у фасаді, але renderCoalesce :299 + dataEpoch усе одно можуть перекрити; зберегти перевірку).

### T2b — STAFF-гілка (наступна фаза)
- Підняти `layoutStaffCanvas` :665; релокувати/експортувати `resolveStaffZoneStyle` :1224 + `inferStaffCurrentOrgId`; staffOpts зібрати у фасаді з theme/config.
- **Діагностика:** `canvas.diagnostics` мусить потекти з фасадного виклику в `getLayoutDiagnostics`/`onLayoutDiagnostics` :914 — інакше тихо порожніє (сторож `layoutDiagnostics.test.ts`).
- Grid-fallback (`renderPositionGrid`) — третій шлях без layout-функції: лишаємо його розкладку в рендері (не має layout-результату) — явно задокументувати.

**Відкинута альтернатива (та її ціна):** підняти ОБИДВІ гілки одним комітом — ×2 ризик за раз (epoch+diagnostics+helper-relocation разом), рев'ю важче, регресія в staff сховала б просту org-перемогу. Ціна staging: проміжний стан, де `render()` приймає `positioned?` опційно (org лифт, staff ще internal) — але це коректний, тестований перехід, а не борг.

**🔒 Інваріанти (зберегти):**
1. **B2** — позиції+розмір їдуть у завершеному `OrgLayoutResult`/`StaffCanvasResult` (`.height` у типі); рендер малює з переданого, не з окремого джерела.
2. **Staleness** — «новіший рендер перекриває старіший»: `renderCoalesce` :299 + `isRenderCurrent`/dataEpoch-guard лишаються діючими (звірити з `renderCoalesce.t104.test.ts`).
3. **0 зміни видимого результату** — ті самі позиції/бокси; layout-функції не чіпаються, лише місце виклику.
4. (T2b) діагностика тече як раніше.

## Поза межами
- Винайдення `LayoutPort`/інтерфейсу (NB4 — це T3, лише relocation тут).
- Будь-який renderer-switch / #2 DOM / камера (T3+).
- Кеш layout (його нема й не додаємо — recon §риз.4).
- Grid-fallback layout у фасад (лишається в рендері).

## Форма перевірки
- **Чисті шви:** `render/layoutDiagnostics.test.ts` (діагностика; критично для T2b), `render/renderCoalesce.t104.test.ts` + `renderCoalesce.test.ts` (staleness/«намалюй що захопив»), `render/setDataEpoch.contract.test.ts`, `render/fitContain.test.ts`, `render/flatOrgRootViewport.test.ts`.
- **Layout-ядро незмінне:** `rowTreeLayout.test.ts`, `reingoldTilford.invariants.test.ts`, `orgBlockLayout*.test.ts` — мусять лишитись зеленими (функції не чіпаємо).
- **Writer-gate перед передачею:** `cd packages/sdk && npx rstest run` (увесь suite); `npx tsc -p tsconfig.check.json` 0; oxlint 0; `cd packages/core && cargo test` 25/0.
- **Контрольна проба:** у T2a тимчасово передати у `render()` НЕ-той positioned (напр. порожні nodes) → org-позиційний/fit тест має почервоніти; повернути.
- Діф T2a = `OrgHierarchyDiagram.ts` + `DiagramRenderer.ts` (+ можливо тип у `types.ts`), без layout/staff/*.

## Критика (seam/staleness/diagnostics, 1 раунд)
- **staleness:** перенос await у фасад НЕ прибирає гонку — renderCoalesce вже серіалізує renderNow; isRenderCurrent у рендері лишаю як 2-й бар'єр, доки не доведено надлишковість. ВЕРДИКТ: лишити обидва, не «спростити».
- **positioned як окремий параметр, не в options:** options = knobs/callbacks (contextual-typed, T0); класти layout-результат туди змішало б дві природи. ВЕРДИКТ: окремий 6-й параметр.
- **перехідний опційний `positioned?`:** між T2a і T2b render() має обидва шляхи — не борг, а тестований міст; T2b прибирає internal-compute повністю. ВЕРДИКТ: прийнято.

## Закрито в grilling
- Чи лишати `isRenderCurrent` у рендері після переносу await — так, доки renderCoalesce.t104 не доведе надлишковість (не в T2).
