# Дослідження: залишковий mid-Pixi рендер (promote-overlay-structural-sync)

READ-ONLY. Мета — зрозуміти, що саме малює PersonNode на 'mid', коли воно видиме поза transition, і чи це свідомий fallback чи pre-T129 залишок.

ДАЛІ: читаю PersonNode.ts (mid-гілка), promoteMath.ts (nearVisibleGateOpen), lod.ts; потім CTO-RESEARCH T129, promote-near report, docs/USAGE.md.

## ФАКТ (крок 1) — PersonNode.ts mid-рендер
- `PersonNode.ts` розрізняє LOD лише як `far` vs «не-far». НЕМАЄ окремої гілки 'mid': `updateContent` (457) має `if (lod === 'far')` (467) → далі весь рендер однаковий для mid і near.
- Нюанс: багато деталей включається лише при `lod === 'near'`: avatar tile (404,412), `gojs-portrait`/`figma-row` контент (537,539), фото `applyPhoto` lod!=='near' → hidePhoto (588). gojs-row avatar/фото теж near-gated.
- Отже на MID: малюється card (shadow+rounded rect fill+border, drawCard 390-399), nameText (522), titleText/periodChip через `layoutCompactContent` (542, бо near-гілки gojs-portrait/figma-row пропускаються на mid), badge/hourglass. Avatar circle лише near (420). chrome (menu/expand) — `applyChrome` lod!=='far' (269) → є і на mid, але для gojs-row/figma-row return (271).
- Тобто MID-Pixi = картка з фоном/рамкою + ім'я + (compact title/period). Це і є «стара mid-підкладка», видима поза transition.
- `drawCard` far-гілка (365): circle avatarFill — це «марка» (крапка). mid малює повну картку.

ДАЛІ: lod.ts (пороги far/mid/near), host factory maxPromoted=40, CTO-RESEARCH T129, promote-near report, docs/USAGE.md far/mid.

## ФАКТ (кроки 2-5)
- lod.ts: far<0.45, mid<1.2, near. PersonNode.lod фіксується при create; рендерер перестворює ноду при зміні LOD.
- promoteMath nearVisibleGateOpen = lod!=='far' (T129, коментар 73-77). near-visible → overlay піднімає ВСІ on-screen бокси на mid+near.
- Overlay (createReactPromoteOverlay.ts) шляхи, коли сіт лишається НЕ promoted (→ Pixi малює сам):
  1. failedIds (slot кинув) 298,318,398 — stays Pixi назавжди
  2. screenRectInView=false & !sticky 400 — off-screen (не видимий усе одно)
  3. shouldPromote veto 401 — host: `Boolean(node.position)` → person/position сіт ЗАВЖДИ проходить; вето лише для org/dept (не PersonNode)
  4. applyCap/maxPromoted 421-429 — АЛЕ host НЕ ставить maxPromoted (у cassiopeia-admin-ui/.../make-dg-sdk-factory.ts лише mode:'near-visible', shouldPromote; жодного maxPromoted/setMaxPromoted у src). demo теж не ставить (App.ts 812-834). → стелі НЕМАЄ → over-cap не трапляється.
  5. data-vanish: нода зникла між wantedIds і listPromoteCandidates → менше кандидатів.
  6. focus sticky off-screen — лишається promoted (не Pixi).
- setPromotedNodeIds → DiagramRenderer:310 → scene.setPromotedIds ховає Pixi лише для promoted. Non-promoted = видимий Pixi.

## РІШЕННЯ/ВИСНОВКИ
- Q4 КЛЮЧОВЕ: mid-Pixi картка — PRE-T129 залишок оригінального 3-tier LOD (SPEC §5.1 "near — спрощені person/org/contour"; bf21a29 "LOD far/mid/near driven by zoom"). T129-блок таска (рядки 98-111) змінив ЛИШЕ promoteMath (гейт), PersonNode НЕ чіпав; когерентність перевірено лише спільним hide-шляхом ("без подвійного рендера на mid"). Доказ свідомого залишення саме mid-as-far-fallback — НЕМАЄ.
- АЛЕ mid-Pixi НЕ мертвий код: (а) база для overlay-less споживача Pixi-рендера; (б) designed safety-net overlay'я (коментарі: failed/veto node "goes back to being drawn by Pixi").
- Премиса задачі (host maxPromoted=40 → over-cap Pixi-сіти) НЕ підтверджується: host стелі не ставить. Отже залишковий (не-transition) mid-Pixi PersonNode у ШПС трапляється практично лише при slot-error або data-vanish — рідко. transition-flash лікує sync-race фікс (інша гілка).
