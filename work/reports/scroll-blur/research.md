# research — легкий blur під час скролу/пану діаграми

**Дата:** 2026-11-04 · статус: дослідження (не імплементація) · запит власника.
Контекст: Pixi-полотно + HTML-overlay (card-split). Є сигнал `camera`/`structural` ресинку
(щойно додано, `createReactPromoteOverlay`/`OrgHierarchyDiagram.notifyPromoteSync`).

## Висновок коротко
Це **усталений патерн** — «scroll/motion velocity blur»: сила blur прив'язана до швидкості руху,
з **dead-zone** (чітко, коли повільно/стоїть) і **max-cap**. Головний ризик — перформанс: blur
дорогий, тримати малим і коротким. Наш сигнал `camera`→blur / settle→sharp — природний тригер.

## Що кажуть джерела
1. **Патерн реальний.** Framer «Scroll Velocity Blur» і «MotionBlur» (velocity-driven, SVG-filter,
   dead-zone «gentle scroll stays sharp», Max Blur/Sensitivity/Smoothing). Flutter `MotionBlurEffect`
   — **директивний** blur уздовж напрямку руху камери, масштаб за швидкістю між `minSpeed`/`maxSpeed`.
   Unreal/Unigine — директивний velocity-blur + max-velocity-cap.
2. **Blur = головний перф-винуватець.** Тримати малим і коротким; спершу transform/opacity, потім blur;
   не на великих поверхнях; вартість ∝ radius × площа; лагає — вимикати. Cap (напр. ≤8px) — командна
   конвенція, не виміряний поріг.
3. **CSS-blur (HTML-overlay бік).** Потребує `will-change: transform` / `translateZ(0)` для GPU-композиту,
   інакше CPU-повільно. `backdrop-filter` дорожчий за звичайний `filter: blur()` — уникати. Забагато
   compositor-шарів = відеопам'ять.
4. **Pixi BlurFilter (WebGL бік).** Найдешевше — тогл `enabled`; або нижчий `resolution` під час руху;
   менше `passes`. Є `@pixi/filter-zoom-blur` (радіальний/zoom-blur). Прецедент — Foundry VTT (на Pixi)
   крутить blur-фільтри за зумом.

## Два шари — дві точки застосування (card-split)
- **HTML-overlay (картки, «деталь»):** `filter: blur(Npx)` на шар під час руху, зняти на settle.
  Плюс: blur саме там, де вже є catch-up-лаг → **маскує** недосконалість пану. Мінус: багато карток =
  велика поверхня (дорогий кейс) → cap radius, `will-change:transform`, GPU-композит.
- **Pixi-полотно (конектори/хром/far-марки):** `BlurFilter.enabled` під час руху, низький `resolution`.
  Повний stage-blur щокадру під час пану — міряти.

## Тригер — наш сигнал уже готовий
- **State-based (простіше):** на `'camera'`/перший `onCameraChange` → додати blur-клас; на `sync()`
  (settle / `'structural'`) → зняти. Це той самий шов, що я щойно збудував (overlay вже несе
  catch-up transform під час руху й ребілдить на settle).
- **Velocity-based (краще виглядає):** рахувати швидкість із дельти viewport в `onCameraChange`
  (px/кадр), масштабувати blur між min/max, dead-zone для повільного, max-cap. Директивний уздовж
  руху — найкраще, але складніше (gaussian дешевший/простіший для v1).

## Ризики / обов'язкові застереження
- **Перформанс:** cap radius (≤~6-8px), `will-change`, GPU-композит; **міряти** FPS під час пану на
  великій сцені (не на 3-вузловому МО рф). Лагає → знижувати resolution або вимикати.
- **A11y:** поважати `prefers-reduced-motion` — для таких користувачів blur ВИМКНЕНИЙ (motion-sensitivity).
- **Читабельність:** dead-zone (повільний пан чіткий), max-cap, subtle.
- **Export:** SVG/PNG/PDF — Pixi-only, blur їх не стосується (не додавати в експорт).

## Рекомендація
1. **Прототип** (skill `prototype`) на HTML-overlay боці: state-based blur (`'camera'`→клас,
   `sync()`→зняти), `filter: blur(4px)` + `will-change`, `prefers-reduced-motion` гейт. Швидко
   відповісти «чи відчувається добре».
2. Якщо відчувається — підняти до velocity-based (швидкість із `onCameraChange`), виміряти перф на
   великій сцені, рішення про Pixi-шар окремо.
3. Повний цикл (spec-flow) — лише коли підтверджено, що варте (це нова публічна поведінка/опція).

## Джерела
- Framer Scroll Velocity Blur / MotionBlur (velocity-driven, dead-zone, max-cap).
- Flutter `MotionBlurEffect` (директивний, speed-thresholded).
- Pixi BlurFilter docs (`enabled`/`resolution`/`passes`), `@pixi/filter-zoom-blur`, Foundry VTT прецедент.
- CSS blur perf: will-change/translateZ GPU-композит, cost ∝ radius×area, backdrop дорожчий.
- ibelick ui-skills «fixing-motion-performance» (blur малим і коротким; scroll-timeline, не JS-listener).
