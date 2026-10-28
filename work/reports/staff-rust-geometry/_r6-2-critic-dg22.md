claude-opus-4-8

# КРИТИК R6-2 (Dg22, незалежний) — per-LOD геометрія едж-боксів, Rust-маршрути staff

ДАЛІ: прочитати джерела hints, Rust-контракт, SVG-хардкод, перевірити 6 питань.

## Крок 1 — дизайн + оракул
ФАКТ: personMidBandHeight(personVisualGeometry.ts:12-14)=min(h,max(56,h*0.48)) — ЛИШЕ h.
ФАКТ: personFarDotRadius(:17-19)=max(6,min(w,h)*0.18) — ЛИШЕ w,h.
ФАКТ: personVisualLocalRect(:25-51) near=повний/mid=band/far=dot — ЛИШЕ w,h,lod. Жодного theme/DOM.
ФАКТ: visualOrgEdgeBox(:116-132) default symbolSize=36; far=min(symbolSize,36,w,h) центр по y.
ФАКТ: hints вживаються ЛИШЕ коли lod==='near' (:27 gojs-row, :36 figma-row); mid/far→personVisualWorldRect (чиста).

## Крок 2 — джерела hints (personLayout.ts)
ФАКТ gojs-row (resolveGojsRowLayoutMetrics:96-106):
  cardH = style.cardRowHeight ?? 56 → ТHEME (types.ts:114 cardRowHeight?:number).
  cardY = timelineH = 18 якщо formatOrgPeriodLabel(position) є, інакше 0 → DATA-driven.
  countBarH = 24 якщо formatPositionCountsBadge(position), інакше 0 → DATA-driven.
  => gojs-row hints залежать від THEME (cardRowHeight) + DATA (position). НЕ виводяться з w/h/lod. Мусять бути входом.
ФАКТ figma-row (figmaRowAvatar:29-39): size=FIGMA_ROW_AVATAR_SIZE=40 (const), cx=r=20 → tileX=0 (const),
  tileSize=40 (const), tileY=cy-20=h/2-20 (виводиться з h). Тобто figma-геометрія чиста (h+consts),
  АЛЕ вибір figma-row vs center — style.edgePort/resolvePersonLayout (THEME). Передати hints простіше, ніж тягнути layout-рішення в Rust.

## Крок 3 — контракт, callers, SVG
ФАКТ: StaffNodeGeo (types.rs:423-448) НЕ має edge-hints. Дизайн правий.
ФАКТ: ts-rs regen реальний (types.rs:418-422 derive(TS) export_to rust-types.ts).
ФАКТ: visualOrgEdgeBox прод-caller ОДИН — mapStaffEdgeBoxesForLod:141 — symbolSize НЕ передає → ЗАВЖДИ default 36.
  Єдиний не-дефолт — тест:137 (передає 36). => у проді org far = min(36,w,h); theme symbolSize (types.ts:161/388) НЕ доходить.
ФАКТ: SVG хардкод near — svgExport.ts:287 (v2 lod:'near') та :298 (legacy 'near'). Live: DiagramRenderer.js:639 options.lod??'near'.
ФАКТ: R6-2 draft (рядок 86) оракул = "паритет з TS mapStaffEdgeBoxesForLod ±1px" → BOX-паритет, не route-паритет.

## ВЕРДИКТИ
Q1 ПРАВИЛЬНО. Чиста геометрія (mid/far) залежить ЛИШЕ від w/h/lod (personVisualGeometry.ts:12,17,25) — у Rust. Hints
  (gojs cardY/cardH/countBarH) залежать від theme+DATA → мусять бути входом. Межа коректна. NB: figma tileX/tileSize — консти.
Q2 ПЛЕЙН-ВХІД. ts-rs regen зараз = передчасна публічна поверхня без споживача (wiring R7), тягне rust-types.ts diff. Плейн
  НЕ створює «дві правди» для hints (TS — єдиний продюсер; дублюється лише ЧИСТА формула, що й так гейтиться R6-6). Прецедент R5/R6-1.
Q3 ТРАП на symbolSize. 56/0.48/6/0.18 — fixed. АЛЕ «36» подвійне: default param І літерал-стеля в min. У проді symbolSize завжди 36.
  Якщо Rust зробить symbol_size входом і wiring підв'яже theme.symbolSize<36 → РОЗІЙДЕТЬСЯ з оракулом (TS ігнорує theme, завжди 36).
  Рекомендація: 36 — fixed const, НЕ підв'язувати до theme. Також 56 подвійне: mid-band floor (літерал) ≠ cardRowHeight??56 — не плутати.
Q4 ОРАКУЛ має бути BOX-паритет (draft:86 так і каже) — тоді ОК. Але: org-cards входять у маршрут-набір (mapStaffEdgeBoxesForLod
  конкатенує [persons...,orgs...]); R6-1 staff_routes.find шукає лише &[StaffNodeGeo] → ребра на org-cards = dangling/skip. Інтеграція
  R6-2+ мусить об'єднати person-боксі + org-card-боксі в один lookup. Порядок боксів у виході: persons-then-orgs (для ±1px позиційно).
  SVG near-хардкод → Rust ЗОБОВ'ЯЗАНИЙ віддавати near-набір; near — найскладніший (hints-залежний) шлях, саме його їсть SVG.
Q5 КОРЕКТНО нести obstacle, не вживати — ЗА УМОВИ box-паритету. Якщо хтось зробить route-паритет на R6-2, figma-row near порівнює
  Rust(без avoidance) vs TS buildStaffEdgeSegments(З blocked()/obstacle) → розійдеться на будь-якому обході. Зафіксувати: R6-2 оракул = боксі, НЕ маршрути.
Q6 ДОДАТКОВІ:
  - edgePort==='center' (visualEdgeBox.ts:69): рішення в TS upstream (повертає box БЕЗ hints) → Rust None hints → повний бокс. Обробляється
    неявно через Option<hints>, але дизайн має це ПРЯМО сказати: edgePort-резолв лишається в TS.
  - gojs-portrait (personLayout.ts:11): layout!==gojs/figma → box без hints (:82) → Rust None → чиста геометрія. ОК.
  - вузли без position (:108-110) → bare box → None. ОК.
  - THREADING не описано: як hints доходять у staff_routes (StaffNodeGeo їх не має). Треба явний плейн-параметр (напр. &[Option<PersonEdgeHints>] aligned to nodes). Специфікувати.
  - NaN/від'ємні: JS Math.min(NaN,x)=NaN vs Rust f32::min(NaN,x)=x — за NaN-входу розійдеться. Малий ризик, згадати.
