# tasks.md — React-хром near-view (ШПС alpha)

Статус-легенда: [ ] не почато · [~] в роботі · [x] закрито. Кожен task: тест ПЕРЕД кодом.

- [x] **T1 — `frames` у пайплайні** (covers A2). Файли: `sdk/render/staffLiveGeometry.ts`
  (+`frames` у `StaffLiveGeometry`, `computeViaMockup` мапить `result.frames`; інші гілки `[]`).
  Done: тест — computeViaMockup повертає frames; типи зелені. `[P]` з T2.
- [x] **T2 — опція `backdrop`** (covers A5). Файли: `sdk/react/createReactPromoteOverlay.ts`
  (+`backdrop?: ComponentType<{viewport,screen,lod}>`, рендер у `OverlayRoot` ПЕРШИМ під слотами,
  pointerEvents none; backdrop дістає ТОЙ САМИЙ synced viewport, що й слоти — Risk#1).
  **N1:** оновити `docs/USAGE.md` §promote (826-888) — задокументувати `backdrop` В ТОМУ Ж коміті.
  Done: тест — overlay рендерить backdrop-елемент + передає synced viewport/lod; USAGE оновлено. `[P]` з T1.
- [x] **T3 — chrome backdrop** (covers A1,A2,A3,A6). **N2:** чисту частину (world→screen рамок/нод,
  pathD r4, точки `.ent`) — у SDK-хелпер `render/staffChromeGeometry.ts` з rstest (success+failure);
  презентацію (CSS `.dept/.dn`, SVG) — у demo `app/StaffChromeBackdrop.ts`.
  Backdrop: рамки деп. (`.dn` 34px fill #202023 + назва/«N поз.»), org-рамка (поточна + чіп), SVG `.lines`
  (pathD r4 + `.ent`); рендер лише `lod!=='far'`; non-scaling-stroke.
  Done: SDK-тест хелпера зелений; demo-рендер із фікстурою → рамки/org/лінії є; при far → null.
- [x] **T4 — LOD-гейт Pixi chrome** (covers A4,A6). Файли: `sdk/render/types.ts`
  (+`staffReactChrome?: boolean` у RenderConfig, default false) + `sdk/render/DiagramRenderer.ts`
  (`renderStaffCanvas`: якщо `config.staffReactChrome && lod!=='far'` → skip zones/departments/frameAndEdges).
  **НЕ keyed на staffAlphaMockup** (B1: розчеплення layout↔chrome). Done: тест — гейт скіпає Pixi chrome на
  mid коли staffReactChrome=true, малює на far; при false — малює завжди (fallback).
- [x] **T5 — demo-wiring** (covers A1–A6 інтеграція). Файл: `demo/app/App.ts` (+`tabConfigs`):
  для alpha порахувати chrome-геометрію (`computeStaffLiveGeometry` lod:near) один раз; ЛИШЕ при успіху —
  зібрати backdrop + виставити `staffReactChrome:true`; при помилці — прапор false → Pixi fallback (B1).
  currentOrg-switch (N3): mock3 одна орга → switch out-of-scope (зафіксовано). Done: typecheck + DOM-верифікація.
- [ ] **T6 — верифікація + нерегресія** (covers A7). Гейти: SDK rstest, demo, typecheck, build (Rust без змін).
  staff-shps/staff-mock3 не зламані (backdrop лише alpha). Браузер-DOM: рамки/шапка/крапки/org. Done: усе зелене + звіт.

Залежності: T1,T2 паралельні → T3 (потребує frames-тип + backdrop-опцію) → T4 (незалежний, паралельно T3)
→ T5 (потребує T1-T4) → T6.
