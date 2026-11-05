# R1 — Pixi hover паритет (far-LOD акцент) — spec

**Статус:** spec. Гілка `feat/extensibility`. Джерело: ROADMAP R1 + «що вже є». **Гейт:** простіше за GoJS.
GATE-1-рішення — з роадмапу (власник named R1; підхід визначено), зупинка лише на справді відкритому.

## Проблема
D1 зробив hover єдиноджерельним (store) і працює на near/mid (per-node `pointerover`→store→акцент). **На far-LOD
hover не має візуального ефекту**: `PersonNode.setHovered` рано-повертає при `lod==='far'` (немає hoverRing), а
`DiagramRenderer` (`:254`) виключає far із related-набору. Отже здалеку наведення на ноду нічого не підсвічує —
паритет взаємодії через межу LOD неповний (ROADMAP R1 «hover-related — лише React near… Pixi hit-test — справжня робота»).

Ноди на far **існують і хітабельні** (bindInteraction на кожному view), тож окремого pointermove-hit-test-движка не
треба — наявний per-node pointer достатній; бракує лише **рендеру акценту на far**.

## Межа (що R1 РОБИТЬ / НЕ робить)
- **РОБИТЬ:** на far-LOD, коли нода під hover (через D1-store, opt-in), малює акцент **related**-набору — підсвічує
  hovered-ноду + повʼязані ноди/лінії, решту приглушує (`staffDimmedIds`/`relatedStaffIds`, уже в SDK). Тобто
  знімає far-виняток у `setHovered` і в related-селекторі рендерера.
- **НЕ робить:** не чіпає emphasis `{found,highlight}` (окремий власник); не вмикає hover без opt-in (D1-гейт
  лишається — хост байт-у-байт, поки не підпишеться); не додає окремий геометричний hit-test-движок (ноди хітабельні);
  near/mid не змінює.

## User scenarios
1. Хост увімкнув interaction (subscribeInteraction). Зум far. Наведення на ШПС-ноду → нода+повʼязані акцентовані,
   неповʼязані приглушені — так само консистентно, як на near/mid.
2. Перехід near→far зі збереженим hovered → акцент не зникає (D1 store тримає hovered; тепер far його малює).
3. Без opt-in — far-hover, як і раніше, нічого не малює (byte-for-byte).

## Acceptance (чернетка)
- AC1: на far-LOD (opt-in) hover ноди підсвічує related і приглушує непов'язані (спостережуваний alpha), як near/mid.
- AC2: far-LOD акцент читає D1-store (той самий hovered); перехід LOD зі збереженим hovered не губить акцент.
- AC3: без opt-in far-hover = 0 візуальних змін (D1-гейт цілий).
- AC4: emphasis (found/highlight) незмінний; selection-акцент пріоритет над hover (як D1 #15), і на far.
- AC5: 0 вартості в спокої; far-hover не додає rebuild (лише repaint акценту).

## Out of scope / Open
- far-LOD **individual card chrome** (детальні картки) НЕ малюємо — лише акцент/приглушення (far рендерить спрощено).
- Open (для плану): чи малювати hoverRing на far, чи лише dim related (far-ноди дрібні — ring може бути зайвий).
  Рішення в плані: на far — **dim related + підсвітка ліній**, hoverRing лише якщо нода достатньо велика; уточнити кодом.
