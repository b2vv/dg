# R7 A4 barrel-критик — dg28

Model ID: claude-opus-4-8

ДАЛІ: перевіряю контекст на коді — (1) grep staff-символів у docs/USAGE.md §14, (2) facadeSurface.mjs scope, (3) barrel-експорти в index.ts + render/index.ts, (4) реальні консюмери (demo/e2e/поза staff), (5) форма layoutBridge.ts StaffGeometryResult vs StaffCanvasResult, (6) читаю terrain-мапу dg28.

## ФАКТ — поріг публічності підтверджено
- `docs/USAGE.md` НЕ містить ЖОДНОГО barrel-staff-символу. grep дає лише config-поля: `staffCurrentOrgId` (USAGE.md:60,136,286,451), `staffLayout` (USAGE.md:134,296), `staffZoneChrome` (:133), `Staff · 1M` таб (:153,796). Жодного `StaffCanvasResult/StaffTierBand/StaffGeometryResult/computeStaff*/layoutStaffCanvas/classifyStaffEdgeRoute`. ⇒ ці barrel-функції/типи **не публічний API** за порогом AGENTS.md («публічний API = те, що описує docs/USAGE.md»).
- `scripts/facadeSurface.mjs:2,29,43` стереже ВИКЛЮЧНО тіло `export class OrgHierarchyDiagram` (regex `^export class OrgHierarchyDiagram\b`, throw якщо хедера нема). Вільні функції/типи barrel він НЕ бачить. ⇒ видалення/зміна цих експортів не чіпає жоден машинний гейт.

## ФАКТ — реальні консюмери (blast radius) — усі в репо
grep по всьому дереву (src, не dist):
- `layoutStaffCanvas`: SDK-internal OrgHierarchyDiagram.ts:787, svgExport.ts:208, svgExport.parity.test; demo-тести e2eBridge.ts:174, mockups.test:176, mockupEdgeInventory.test:9, staffGeometry.golden.test:70, staffEdgeFallbackCensus.test:173-191.
- `computeStaffLiveGeometry`: SDK-internal DiagramRenderer.ts:645, svgExport.parity.test:71; demo staffGeometry.golden.test:91.
- `StaffCanvasResult` (тип): SDK-internal DiagramRenderer.ts:720,801,874; demo staffGeometry.golden.test:44, staffEdgeFallbackCensus.test:53,73.
- `classifyStaffEdgeRoute`: demo staffEdgeFallbackCensus.test:89 (+ internal staffEdgeGeometry).
- `enrichStaffTierBands`: SDK-internal svgExport.ts:225 (+ staffZoneBounds self/tests).
- `buildStaffEdgeSegments`: SDK-internal staffRouterV2.ts:61,80 (+ tests).
- `StaffTierBand`: SDK-internal лише (staffZoneBounds, StaffZonesView, staffLiveGeometry, types) — навіть не в кореневому sdk barrel (terrain §5: публічний тільки через layout/staff під-barrel).
⇒ ЗОВНІШНІХ (host/поза-репо) консюмерів НЕМАЄ. Усе — SDK-internal + demo-тести, тобто код, який A4 так чи інакше мусить правити, щоб видалити TS-пост-проходи. «Breaking» тут майже без ціни.

## ФАКТ — adapt StaffGeometryResult→StaffCanvasResult неповний by design
Rust-контракт (rust-types.ts) НАВМИСНО відкидає TS-власні поля:
- `StaffNamespace` (:116) = tier/kind/org/x/y/w/h — БЕЗ label/role («label/role — TS-адаптер», :114). tiers-форма StaffCanvasResult їх має. ⇒ back-adapt мусить ре-джойнити name/role з DiagramOrganization — це рівно форма `enrichStaffTierBands`.
- `StaffOrgCardGeo` (:141) = лише геометрія; name/positionCount/expanded — TS (:139).
- `markedCrossings`: TS Set ↔ Rust per-route `marked?: boolean` (:81) — конверсія форми.
- `namespaces` vs `tiers`, `StaffRouteSet` vs StaffEdgeSegment[] — різні імена/форми.
- nodeSizes/dockHints (:98,102) — ВХОДИ, які TS мусить збудувати (terrain §4 gap): без них міст не замінить layoutStaffCanvas.
⇒ TS-джойни (label/role, name/count, marked-форма, theme-метрики, nodeSizes/dockHints) лишаються TS у БУДЬ-ЯКОМУ варіанті — Rust їх не володіє. Різниця між варіантами — ДЕ вони живуть: приховано під старою формою чи явно над Rust-контрактом.

## РІШЕННЯ — принцип відповідальності (де ховається дубль)
- Легітимна TS-межа: label/role-enrich, orgCard name/count-merge, marked Set↔bool, theme→metrics, збірка nodeSizes/dockHints. Це НЕ дубль Rust — Rust їх прямо виключив (rust-types коментарі :107,114,139).
- Нелегітимний дубль (мета R7 його прибирає): ре-деривація геометрії — bounds, routing, tier-reshape — лише щоб відновити стару форму StaffCanvasResult/tiers, якої жоден зовнішній консюмер не потребує.
- V1 FACADE зберігає СТАРУ ФОРМУ (tiers, markedCrossings:Set, StaffCanvasResult). Небезпека: back-adapter namespaces→tiers запрошує тягнути назад саме enrichStaffTierBands-логіку; під назвою «адаптер» тихо виживає пост-прохід, який A4 видаляє. Чесним V1 буде лише якщо адаптер робить ВИКЛЮЧНО TS-власні джойни, а геометрію пропускає як є — але сама збережена форма (tiers≠namespaces) тисне в бік ре-деривації.
- V2 REPLACE кладе ті самі TS-джойни ЯВНО поверх Rust-контракту (namespaces + окремий enrich-крок), у відкриту. Дубль нема де сховатись. Нота дешева/необов'язкова (не публічне API), CHANGELOG-рядок нешкідливий.
- V3 DEPRECATE+ALONGSIDE — найгірший: тримає ОБИДВІ форми, тобто V1-адаптер (з його ризиком ре-деривації) НАЗАВЖДИ плюс нову. Deprecation має сенс лише коли є зовнішні консюмери, яких не можна зламати відразу — тут їх НУЛЬ. Платить повну ціну супроводу двох форм заради неіснуючих консюмерів і найсильніше вкорінює дубль.

## ВЕРДИКТ
Ранжування: **V2 > V1 > V3.**
- V2 — найчесніше ізолює межу Rust/TS, не лишає місця прихованому пост-проходу, blast radius = in-repo код, який A4 й так чіпає.
- V1 — прийнятний запасний, але тільки з жорсткою умовою «адаптер = лише TS-джойни, нуль ре-деривації геометрії»; збережена стара форма — постійна спокуса повернути дубль.
- V3 — відхилити: максимум боргу за нуль вигоди (немає кого захищати deprecation-обгорткою).

Рекомендація: **V2 REPLACE** — переписати barrel на bridge-форму (StaffGeometryResult/namespaces), прибрати StaffCanvasResult/StaffTierBand, TS-enrich (label/role, orgCard name/count, marked-форма) винести в явні іменовані функції НАД Rust-контрактом, мігрувати SDK-internal + demo-тести в тому ж PR. CHANGELOG-рядок — так (дешево), формальний «breaking» гейт — ні (не публічне API).

Блокуюча ПЕРЕДумова (не вибір barrel, а готовність A4): перш ніж прибирати StaffCanvasResult, мусять бути закриті gap'и terrain §4-6 — збирач входу nodeSizes/dockHints, merge orgCards name/count, консюмер departmentFrames. Якщо A4 ще не вміє будувати nodeSizes/dockHints — міст НЕ замінює layoutStaffCanvas, і ЖОДЕН варіант не валідний: спершу закрити вхідний gap, потім зрізати barrel. Якщо цей gap закрити в межах A4 не встигають — тимчасовий V1-facade (лише TS-джойни) як міст на один зріз, з явним тригером зняти його, коли вхід готовий; але не V3.

## ГОТОВО
