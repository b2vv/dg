claude-opus-4-8

# T126 R7 A4.2b — Дебати FORK1 (dg29): позиція «rebaseline лише bands»

ДАЛІ: звірити первинні джерела перед аргументацією —
(1) що саме споживає `canvas.tiers` (grep рендерер vs svgExport vs golden);
(2) Rust namespaces у виході = тільки enriched (staff_bounds.rs:4/:135, staff_layout.rs:1157);
(3) чи існує RAW tier y/height у Rust (мав би не існувати);
(4) формулювання U4 власником (diff=баг, не rebaseline);
(5) стара семантика live.bands=RAW vs live.zones=enriched.
Далі — ФАКТ/РІШЕННЯ/ДАЛІ по кожному.

## ФАКТИ (звірено з первинними джерелами)

F1. **RAW tier y/height народжується cursorY-стекінгом у TS** — canvasLayout.ts:60 `cursorY=margin`;
    :90-97 tier push `y:cursorY` + `cursorY+=height+tierGap`; :124-131 tier2; :224-231 tier3
    `cursorY+=t3height+margin`. Це НЕ content-union, а послідовне накопичення. Саме ця математика
    підлягає видаленню у A4 (єдине джерело геометрії=Rust).
F2. **У виході Rust RAW-смуг немає** — compose_tiers лишає межі нулями (staff_bounds.rs:4),
    enrich_namespaces (staff_layout.rs:1157) заповнює їх content-union+pad+labelBand. У
    StaffGeometryResult.namespaces — ТІЛЬКИ enriched (rust-types.ts:111-116; staff_bounds.rs:135).
    RAW cursorY-band y/height у Rust-виході НЕ існує ніде (підтв. plan-critic:30, terrain:49).
F3. **Рендерер читає live.zones (enriched), НЕ canvas.tiers** — paintStaffZones DiagramRenderer.ts:694
    `zones:tiers` з live.zones; staffLiveGeometry.ts:101 zones=enrichStaffTierBands(canvas.tiers,...).
    canvas.tiers у виході computeStaffLiveGeometry споживає ЛИШЕ golden live.bands (normalizeLayout,
    golden:49-53). (plan-critic:34; terrain:19.)
F4. **svgExport незалежний** — svgExport.ts:208 власний layoutStaffCanvas, :226 власний
    enrichStaffTierBands. A4.2b його НЕ чіпає → зміна live-шва на нього не впливає.
F5. **Golden ловить ДВА шви**: Seam A `layout`=raw layoutStaffCanvas (golden:70-74, A4.2b НЕ чіпає,
    terrain:29) + Seam B `live`=computeStaffLiveGeometry (golden:90-92). normalizeLayout СПІЛЬНА
    (golden:44-57): bands з .tiers. Отже RAW-смуги гейтяться у `layout` НЕЗАЛЕЖНО від live.
F6. **OLD: live.zones=content-enriched, live.bands=RAW canvas.tiers — РІЗНІ значення** (plan-critic:31).
    Тобто live.bands ніколи не описував те, що рендериться; zones його витісняють.
F7. **U4 (власник, terrain:29)**: «diff=баг, НЕ rebaseline». staff_bounds.rs:6-9 окремо застерігає
    проти «двох правд» меж (дублювання математики в новому місці).

## АРГУМЕНТ (позиція: rebaseline лише bands)

A1 (byte-identity фізично неможливий без дублювання). Rust не віддає RAW cursorY-смуг (F2).
   Щоб golden live.bands лишилися байт-ідентичними, TS-міст мусив би ВІДТВОРИТИ cursorY-стекінг
   (F1) — тобто клонувати саме ту layout-математику, яку A4 видаляє. Це створює ДРУГИЙ продюсер
   геометрії → дрейф з Rust = пряма анти-ціль A4 і повтор «двох правд» (F7). Byte-identity тут —
   фальшива чеснота: identity, куплена відновленням мертвого коду.

A2 (U4 НЕ порушено). U4 забороняє МАСКУВАТИ реальний геометричний diff. Тут:
   (i) canvas.tiers у live-шві — рудиментарний проміжний артефакт, не рендериться (F3), svgExport
       незалежний (F4); (ii) механічний diff-доказ є acceptance-гейтом: якщо nodes/orgCards/zones/
       routes/width/height байт-ідентичні, а змінилися ЛИШЕ bands → жодна рендерена геометрія не
       зрушила; (iii) RAW-смуги НЕ зникають з-під гейта — Seam A `layout` їх далі ловить (F5).
   Rebaseline того, що нічого не рендерить і дублюється в layout+zones, — не маскування diff, а
   усунення зайвого поля. U4 цілий.

A3 (репрезентація: `canvas.tiers=[]` > enriched-у-tiers). Варіант «enriched у tiers» зробив би
   live.bands==zones — дві правди в бейслайні (повтор F7 у golden). Варіант `[]` чесний: Rust
   RAW-смуг не має → міст їх не вигадує; live.bands стає `[]`, а band-геометрія лишається гейтнутою
   двічі (raw у layout F5, enriched у zones). Найменший і найчесніший diff → обираю `[]`.

## КОНТРАРГУМЕНТ ОПОНЕНТА — чесно

Опонент: (а) «прибрати ключ bands із live-шва» зберігає інваріант «жодних rebaseline» і теж не є
геометричним rebaseline; (б) reconstruct зберіг би byte-identity.

Поступка по (а): ПРИЙМАЮ як рівноцінне, навіть чистіше формулювання — і воно КОНВЕРГУЄ з моєю
позицією. normalizeLayout спільна (F5), тож «прибрати bands» треба спеціалізувати лише для live
(layout мусить зберегти raw-смуги). Механічно «live.bands відсутні» ≡ «Rust-міст віддає tiers=[]»:
той самий результат. Обидва = «не відновлювати, не підробляти byte-identity». Який саме синтаксис
(порожній масив значень vs відсутній ключ) — косметика бейслайну; суть одна. Тож (а) не спростовує
мене, а уточнює рекомендацію.

Спростування (б): byte-identity через reconstruct — ціль лише для геометрії, яку під час міграції
рахують ОБИДВА шляхи (взаємна звірка). Для артефакту, що тепер продукує тільки Rust і якого рендерер
не читає (F3,F6), byte-identity, куплена другим TS-продюсером, обмінює косметично-зелений diff на
ПОСТІЙНУ поверхню дрейфу (F1,F2,F7). Це програш, не виграш. Reconstruct відхиляю.

## РЕКОМЕНДАЦІЯ

1. НЕ відновлювати cursorY-смуги в TS-мості (анти-ціль, дрейф, «дві правди»).
2. Rust→StaffCanvasResult міст: `canvas.tiers=[]` (Rust RAW-смуг не має; рендерер читає zones).
3. Golden live.bands → `[]`; рівноцінно прибрати ключ bands ЛИШЕ з live-гілки (layout зберігає raw).
4. Acceptance-гейт rebaseline: механічний diff мусить показати bands — ЄДИНА зміна; nodes/orgCards/
   zones/routes/width/height — байт-ідентичні. Інакше diff=баг (U4), не rebaseline.
5. Перевага `[]`/drop над enriched-у-tiers: не плодити live.bands==zones (дві правди в golden).
