# T3b/T3c re-gate РАУНД-2 — результат + author-closure A5/A8 + required-дельти контракту

**Від:** Cass 2 (автор контракту `T3-renderer-port.md`). **Дата:** 2026-10-26.
**Призначення:** вхід для НАСТУПНОЇ ітерації контракту (переозначення T3b/T3c ПЕРЕД кодом). НЕ повний rewrite — це консолідація вердиктів + закриття двох author-GAP, які re-gate лишив відкритими. Повний re-spec робить наступна (бажано свіжа) сесія автора; потім легкий re-gate на дельти.

## Результат re-gate (3/3 вердикти, усі RED; звірено писарем Dg 13 по коду)
- **Консенсус-blocking:**
  - **D2 (drag) [G2+Cass1]:** cell-only канал несумісний із free-follow карткою (`personInteractions.ts:233`) + reparent `dropTargetAt` над рендер-геометрією. Тріада {cell-only, #4-grabOffset, сира-точка} **внутрішньо несумісна** — її треба переозначити цілком, не латати.
  - **D5 (інв#4) [всі 3]:** `reportPath` (`DiagramRenderer.ts:1,512`) НЕ адресований T3 → інваріант «render→interaction = 0» **брехливий** як сформульовано. boundary-gate **відсутній** (контракт його припускав — рядок 92/70). Поки reportPath живе й gate нема, інв#4 недоказовий.
- **Спірна серйозність:**
  - **D3 (render-resolve):** G1 — `onMeasurable` **НАДЛИШКОВИЙ** (`await render()` + `getContentBounds()` досить); Cass1/G2 — NB, але **всі троє** вимагають pin coalesce↔pending мапінг ДО коду T3b. Отже T3b **НЕ беззастережно чистий** без цього рішення.
  - **D1 (pointer-межа):** G2 — blocking через `kind:'doubleClick'` ↔ рядок 58 (пороги→#4 конфліктує з наявним kind); інші — NB.
- **D4 (камера-math):** byte-чистий у всіх трьох; non-blocking plumbing.

## ПОСТ-ЧЕК вердиктів проти author-memo A1-A8
- Покрито критиками: **A1** (onMeasurable lifecycle — ↔D3), **A3** (DropTargetIndex/hitTest — ↔D2), **A4** (drag-кадр/grabOffset — ↔D2), **A7** (applyDragPreview paint — ↔D2).
- Частково: **A2** (applyCamera↔render paint-ордеринг), **A6** (Viewport-split/rAF animateTo).
- **🔴 GAP — жоден критик НЕ закрив:** **A5** (ViewportGesture не спечений) і **A8** (dual-path T3b без проби). Dg 13 передав їх мені як автору. Закриття нижче.

---

## Author-closure A5 — специфікація `ViewportGesture` (симетрія з NodePointerEvent)
Асиметрія була реальною дірою: NodePointerEvent розписаний поле-в-поле, viewport — ні. Рекон-факти: DOM-capture = `attachWheel:256` + `attachPinch:285` на `app.canvas` + pan (`beginPan:357`, без порогу). Адаптер емітить СИРИЙ жест вгору; #4 рахує нову {x,y,scale} й кличе `applyCamera` вниз (той самий напрям, що D4).

Пропонована форма (псевдо-контракт, НЕ код):
```
ViewportGesture =
  | { kind:'wheel',      deltaY, anchor:{global,client}, mods:{ctrlKey,metaKey,shiftKey} }
  | { kind:'pinchStart' | 'pinchMove' | 'pinchEnd', scaleRatio, center:{global} }
  | { kind:'panStart'   | 'panMove'   | 'panEnd',   screen:{global,client} }
```
Інваріанти (щоб 0-дельта трималась):
1. **Адаптер шле СИРЕ** (deltaY / scaleRatio / точку), #4 володіє математикою (`zoomAt` anchor, `panBy` delta → нова transform). Це замикає D4-відкрите «хто клампить zoom-межі» → **#4 клампить** (математика його).
2. **Anchor-точка ОБОВ'ЯЗКОВА** (курсор для wheel, center для pinch) — інакше point-under-cursor «попливе» при zoom (той самий клас регресії, що B1-втрата-mods: одна пост-math transform губить канал).
3. **pinch/pan — start/move/end** (як node-drag у D2) → #4 трекає gesture-local стан; wheel — дискретний (без lifecycle).
4. Арбітраж node-hit vs viewport-gesture лишається В АДАПТЕРІ (інв.3) — адаптер віддає ВЖЕ розрізнене `handleNodePointer` АБО `handleViewportGesture`.

## Author-closure A8 — проба перехідного стану T3b (dual-path)
Діра: після T3b фасад на `RendererPort`, але колбеки ще пушаться вниз, `render()` приймає обидва шляхи. Ні T3a-end-, ні T3c-end-тест цей стан не міряє (обидва — чисті кінці). Закриття:
- **Перехідний контракт-тест (живе лише в межах T3b):** (1) node-подія в dual-стані досягає ТОГО САМОГО фасадного колбека, що й до T3b (0-дельта крізь порт-shim); (2) `port.render(scene)` дає ІДЕНТИЧНИЙ positioned-вивід, що й пре-порт `host.renderer.render`.
- **Контрольна проба:** саботувати делегацію порта (викинути поле зі `scene`) → dual-path-тест МУСИТЬ почервоніти; якщо зелений — порт насправді не несе render (shim маскує).
- **Зчеплення з D5:** бо boundary-gate відсутній і інв#4 нині хибний, ця проба НЕ може спиратись на структурний gate — вона МУСИТЬ бути поведінковим контракт-тестом.

---

## Required-дельти для наступної ітерації контракту (що переозначити ПЕРЕД кодом T3b/T3c)
1. **D2 — переозначити drag ЦІЛКОМ** (не латати cell-only): узгодити free-follow картку (`personInteractions.ts:233`) + reparent-`dropTargetAt` + grabOffset-власність + сиру-точку в ОДНУ несуперечливу модель. Це найбільша дельта; ймовірно тягне рішення A3/A4.
2. **D5 — закрити інв#4 чесно:** або адресувати `reportPath` (DiagramRenderer:1,512) у scope T3, або переформулювати інваріант як «=0 ОКРІМ reportPath, який закриває T6». + завести мінімальний boundary-gate (контракт його вже припускав).
3. **D3 — вирішити onMeasurable-vs-await:** прийняти позицію G1 (надлишковий → `await render()`+`getContentBounds()`) АБО лишити onMeasurable — але в ОБОХ випадках **pin coalesce↔pending мапінг явно** (A1). Без цього T3b не чистий.
4. **D1 — визначити pointer-межу:** розв'язати конфлікт `kind:'doubleClick'` ↔ «пороги→#4» (рядок 58). Якщо 300ms-dbl рахує #4, то адаптер НЕ має слати kind:'doubleClick' — шле сирі click-и, #4 склеює. Переозначити kind-набір відповідно.
5. **A5/A8** (вище) — вплести у контракт.
6. Далі — **легкий re-gate лише на ці дельти** (не повний), бо D4 та решта вже чисті.

## Статус суміжного
- **T3a-1 коміт — ЧИСТИЙ, чекає owner-«го».** Re-gate стосувався T3b/T3c контракту, НЕ T3a-1 (релокація вже верифікована + PASS 3 критиків).
- **S1/S2 (altitude)** — owner-рішення, Dg 13 виносить окремо (не блокують цей re-spec, але S2 суб-стейджинг T3c добре лягає на переозначений D1/D2).
- Dg 13 тимчасово на окремій owner-задачі (read-only review); T3 у паузі з обох сторін.
