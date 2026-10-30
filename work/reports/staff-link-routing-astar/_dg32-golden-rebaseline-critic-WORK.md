# dg32 — критик: rebaseline staff-golden ЗАРАЗ vs park до R3

РОБОЧИЙ ФАЙЛ критика. Дописуй ПІСЛЯ КОЖНОГО КРОКУ (append). Перший запис — `ДАЛІ:`.

## Рішення, яке критикуємо
Власник схиляється **rebaseline зараз** (`UPDATE_GOLDEN=1`), щоб закрити червоний golden у Коміті B.
Альтернатива — **park**: `describe.skip` на golden-тесті з finding, відкласти baseline до візуального R3-гейта.
Твоя задача: знайти пастки саме в rebaseline-ЗАРАЗ і дати вердикт SAFE / RISKY (з мінімізацією ризику).

## Механіка golden (перевірено по коду, packages/demo/src/scenarios/staffGeometry.golden.test.ts)
- Тест «matches the baseline and reproduces exactly» ловить 11 staff-табів у 3 LOD.
- Захоплює: Seam-A (TS `layoutStaffCanvas`), Seam-B (`computeStaffLiveGeometry` — через Rust для tree-табів),
  zones, **routes (fromId/toId/kind/points[], endsOnDeptTop, marked)**, width/height, node roles, orgCards.
- `UPDATE_GOLDEN=1` перезаписує `__golden__/staff-geometry.json` поточним захопленням.
- Детермінізм-перевірка (repeated===actual, tolerance=0) біжить ЗАВЖДИ; baseline-порівняння ±1px.
- Поточна причина червоного: `mockup-staff-figma.live.bands.length: expected 2, actual 0` — Rust-адаптер
  навмисно `canvas.tiers=[]` (adaptStaffGeometry.ts:164, FORK1: bands тепер з zones), старий baseline має TS-bands.

## Контекст-застереження (dg30)
- dg30 ПРЯМО застерігав: НЕ rebaselineʼити до ВІЗУАЛЬНОГО R3-гейта у браузері власника, бо **golden сліпий до
  перетинів ліній** — записує будь-які points, але не судить, чи маршрут візуально коректний.
- T128 (повний A*-роутер у Rust) ЩЕ НЕ імплементовано — поточні routes = pre-A* (legacy/detour). Тобто baseline,
  зафіксований зараз, усе одно зміниться, коли A* сяде.

## Питання критику (пастки rebaseline-зараз)
1. Чи «благословляє» rebaseline геометрію/маршрути, які ще не пройшли візуальну перевірку → ризик, що
   crossing/візуальний регрес стане «golden-істиною» і нова робота (T128 A*) проходитиме проти кривого baseline?
2. Чи детермінізм-перевірка реально гарантує відтворюваність (нема прихованого рандому/порядку) перед фіксацією?
3. Чи park краще зберігає сигнал (finding + skip видно в сюїті), а rebaseline його ховає (зелено = «все ок»)?
4. Чи є проміжний варіант: rebaseline ЛИШЕ не-візуальних полів (bands/roles/width), park routes.points до R3?
5. Що дешевше відкотити, якщо R3 покаже криві маршрути: park→rebaseline, чи rebaseline→повторний rebaseline?

## Вердикт: SAFE (rebaseline зараз) / RISKY (park) + мінімальна рекомендація — у кінці файлу.

ФАКТ (baseline структура): 72410 рядків. 2247 блоків "points" (routes — основна маса файлу),
1454 "role", 22 "bands" (2 на таб у layout+live), 11 "routes" (по одному на таб).
Голова: `staff-shps.layout` має nodes(role:tree), bands(2), orgCards[], edges. КЛЮЧОВЕ:
"bands" живе і в layout(Seam-A, TS layoutStaffCanvas) і в live(Seam-B, Rust-адаптер). Червоний —
саме на LIVE.bands (0 vs 2), бо Seam-A досі TS і зберігає tiers. Rebaseline перепише ЛИШЕ ті поля,
що реально змінились (live.bands→0 + будь-які зсуви routes/nodes від нового Rust-пайплайну).
ДАЛІ: читаю dg30-застереження (HANDOFF + PARITY-FAILURE) дослівно.

ФАКТ (dg30 HANDOFF:44 — ЧЕРГА власника): задокументований порядок = R2 detached-fix → R3 ВІЗУАЛЬНИЙ
гейт проти мокапу → **R4 rebaseline golden на КОРЕКТНИЙ Rust = одна істина**. Тобто сам власник
записав rebaseline на R4, ПІСЛЯ R3. Rebaseline зараз (Коміт B, до R2/R3) суперечить власному
записаному рішенню.

ФАКТ (dg30 PARITY-FAILURE): перший реальний e2e golden = ЧЕРВОНИЙ у 10/11 сцен, НЕ лише bands:
- staff-1m: canvas 7064→135608 вшир (~19×) за тієї ж к-сті вузлів → це БАГ (matrix-coords
  викинуто, buildStaffLayoutInput.ts:226-231), НЕ «бажана конвергенція». 12794 route-diff + 1899 node.
- routes розходяться навіть де вузли байт-ідентичні (staff-tree) — docк/elbow інші.
- card_pad-гейт (staff_layout.rs:1246) = БАГ проти §5.1/§10.4: ~1129 TS aroundTop стали сирий ortho
  → лінії РІЖУТЬ картки. Відомий, НЕ полагоджений.
- gojs/variant-b/magnetic: node+zone+orgCard diffs (detached мискласифіковано tree) — відомий баг.
- PARITY:7 ДОСЛІВНО: «НЕ rebaseline (заморозило б неперевірений Rust як істину)». dg30 свідомо
  НЕ rebaselineʼив.
- PARITY:56: варіант «Rust=істина, повний rebaseline» ВИМАГАЄ «незалежно підтвердити, що
  Rust-routing/layout КОРЕКТНІ, а не просто інші» — цього ще не зроблено.

ФАКТ (тест split): блок `matches the baseline and reproduces exactly` робить І детермінізм (183)
І baseline-compare (189) в ОДНОМУ it. `describe.skip`/skip цього блоку вимкне й детермінізм-гейт.
Детермінізм-гейт перевіряє лише ОДИН процес (двічі capture підряд) → f32↔f64/крос-машинну
нестабільність НЕ ловить (PARITY класифікував 17806 субпіксельних diff); ±1px її толерує на
compare, але committed baseline = float однієї машини. Детермінізм ≠ коректність.

РІШЕННЯ: ВЕРДИКТ RISKY — park (skip+finding). Rebaseline зараз заморозив би 3 ВІДОМІ баги
(card_pad-різ карток, matrix-coords 19× розгін staff-1m, detached-мискласифікація) як golden-істину,
проти якої потім валідуватиметься T128 A*. Суперечить і dg30-рішенню, і власній ЧЕРЗІ власника (R4).
Проміжний варіант (rebaseline не-routes) НЕ рятує: node/width/zone diffs у 6+ сценах — теж відомі
layout-баги, не benign; чиста лише staff-dept-legacy. Compare поле-за-полем all-or-nothing без
правки коду.
