claude-opus-4-8

# R6-2 review (Dg22, незалежний ревʼювер)

ДАЛІ: читаю staff_edge_box.rs, lib.rs reexport, оракул visualEdgeBox.ts + personVisualGeometry.ts, дизайн/критик _r6-boundary-dg22.md, types.rs.

ФАКТ (паритет гілок, звірено рядок-у-рядок):
- near+gojs-row: Rust :112-119 {x, y+card_y, w, card_h+count_bar_h, obstacle None} == TS :28-34. ✔
- near+figma-row: Rust :126-138 {x+tile_x, y+tile_y, tile_size, tile_size, obstacle=повний бокс {x,y,w,h}} == TS :39-46. ✔
- near без hints: Rust :140 None → person_visual_world_rect near → :83 повний бокс == TS :48→personVisualLocalRect :30-31. ✔
- mid: Rust :74-77 bh=min(h,max(56,h*0.48)), (0,(h-bh)/2,w,bh) == TS :33-40. hints ігноруються (гілка hints лише під `if lod=="near"` :105). ✔
- far: Rust :78-81 r=max(6,min(w,h)*0.18), (w/2-r,h/2-r,2r,2r) == TS :42-50. ✔
- org far: Rust :166 min(36,w,h), y+(h-size)/2 центр == TS :124-131 Math.min(symbolSize=36,36,w,h). ✔
- org near/mid: Rust :156-164 повний бокс == TS :121-122. ✔

ФАКТ (блокер-1 критика): symbol_size = FIXED const ORG_SYMBOL=36 (:59), fn visual_org_edge_box БЕЗ параметра symbol_size (:148-155). Theme-вхід прибрано. Блокер-1 ЗАКРИТО. ✔

ФАКТ (scope): модуль standalone — лише чисті fn + локальні типи EdgeRect/Rect/PersonEdgeHints. staff_routes НЕ імпортується й не чіпається. obstacle переноситься (figma-row :132-137), ніде не вживається в R6-2. Тихого route-паритету немає. ✔

ФАКТ (regen): EdgeRect/Rect/PersonEdgeHints визначені в staff_edge_box.rs (:18-52), НЕ в types.rs. types.rs не чіпано (git status чистий на types.rs; derive(TS) лише на наявних типах). reexport lib.rs:7 (`mod staff_edge_box`) + :23-25. regen НЕ потрібен. ✔

ФАКТ (тести): 8/8 green (cargo test staff_edge_box). Кожна гілка має тест: gojs(:187), figma(:209), near-none(:233), mid(:250), far(:265), org-far(:276), org-far-clamp(:286), org-near/mid(:294). Числа пінуються: org clamp hardcode 20 (:288-289); mid band та far dot — через дзеркальну формулу з літералами 0.48/0.18 (пін ratio+структури, коментарі «96»/«12.96»).

ФАКТ (слабке покриття — non-blocking): флори MID_BAND_MIN=56 (:55) та FAR_DOT_MIN=6 (:57) НЕ пінуються жодним тестом — mid-тест h=200 (h*0.48=96>56), far-тест h=72 (min*0.18=12.96>6): флор-режим ніколи не активний. Мутація 56→будь-що <96 або 6→<12.96 пройде зелено. Треба тест з малим вузлом (h~80 → band=56; w=h=20 → dot r=6).

ФАКТ (розбіжність на невідомому lod — non-blocking, поза scope): person Rust `_ => повний бокс` (:83, «near і будь-що інше») vs оракул personVisualGeometry.ts:42 else → far-dot. Для валідного enum near/mid/far ідентично; розходяться лише на невідомому рядку lod. LodLevel — контрольований union у TS, тож у проді неможливо. org співпадає (обидва: не-far → повний бокс).

ФАКТ (NaN/від'ємні): критик явно виніс за scope (_r6-boundary :172). Зауваження: Math.min(NaN)→NaN, Rust f32::min(NaN)→інший операнд — латентна розбіжність, якщо NaN колись дійде до шару. Поза scope, не блокер.

РІШЕННЯ: PASS-with-nonblocking. Паритет усіх гілок точний (не лише ±1px — збіг до біта), блокер-1 закрито, scope дотримано, regen не потрібен. Два non-blocking: непінуовані флори (56/6) та розбіжність на невідомому lod. Готовий до коміту.
