# T131 — refit камери після collapse/expand посади має жити в SDK

**Пріоритет:** P2 · **Статус:** 🔵 не почато · рішення власника 2026-11-05: «refit in SDK»
**Джерело:** аудит межі SDK↔host (`work/reports/library-boundary-audit/_wip-review.md`, п.1).

## Факт

- До 2026-11-05 демо після згортання/розгортання голови сама плавно переводила камеру на org-бокс
  (`refitStaffAlpha` у `packages/demo/src/app/App.ts`, прибрано в гілці `chore/library-boundary-housekeeping`):
  `fitStaffChrome({ animate:false, padding:48, minScale:MOCKUP_FIT_MIN_SCALE (0.55), maxScale:1 })`,
  потім власний 280 ms ease-out-cubic tween від старої камери до цілі.
- Чому не `fitView`: той вписує вміст в обидві осі без верхньої межі, тож одна згорнута голова дає зум 4×,
  а високе дерево падає в далекий LOD (коментар демо).
- SDK `togglePositionExpand` після кадру робить лише `panToNode(positionId, { animate: true })`
  (`packages/sdk/src/OrgHierarchyDiagram.ts`). Хост refit не має — тепер і демо теж.
- Формула вже в SDK: `computeStaffFit` / `fitStaffChrome` (`render/staffChromeGeometry.ts:199-219`,
  `axis:'width'|'both'`, `align:'top'|'center'`, кламп `[minScale,maxScale]`), анімація — `animateViewport`.

## Пастка (виміряно читанням коду)

Promote-оверлей під час руху камери **не перебудовується**: несе шар одним CSS-transform і робить rebuild лише
після `settleMs` (деф. 150 ms, `react/createReactPromoteOverlay.ts:309-323`, `:484`). Картка, якої не було в
стартовому кадрі, «вискакує» в кінці анімації. Демо обходила це так: камера → ціль, `flushSync(promote.sync())`
(картки для цільового кадру), камера ← старт, анімація. Наївний refit через `animateViewport` принесе хостові
цей артефакт.

## Відкриті рішення

1. **Дефолт:** refit увімкнено за замовчуванням чи opt-in (прецедент — A3 `animate` opt-in OFF у
   `work/ROADMAP-extensibility.md`: нова видима поведінка не змінює host-golden при першому pull)?
2. **Параметри й де їх задавати:** одна опція на кшталт `staffLayout.refitOnExpand?: boolean | StaffFitOptions`,
   дефолти з демо (`padding 48`, `minScale 0.55`, `maxScale 1`, `axis 'width'`, `align 'top'`)?
3. **Pop-in:** SDK сам будує картки цільового кадру перед анімацією (потрібен шов «structural sync на цілі»
   між камерою й оверлеєм) чи інакше?
4. **Де діє:** лише коли є staff-chrome бокс (`getStaffChromeGeometry()?.org`); інакше лишається `panToNode`.

## Не входить

- Анімація переходів layout (D3 роадмапу) — окремо; refit лише рухає камеру після кадру.
