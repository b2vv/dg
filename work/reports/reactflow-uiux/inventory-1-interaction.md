# React Flow — інвентаризація, ділянка 1: взаємодія та редагування

**Матеріал:** клон xyflow, коміт `b1b99e9` (`@xyflow/react@12.11.5`, `@xyflow/system@0.0.81`),
шлях клону: `/private/tmp/.../scratchpad/xyflow`. Усі `шлях:рядок` нижче — відносно кореня клону.

**Наш репо:** `/Users/strelia/projects/dg` (Org Hierarchy SDK, Pixi.js 8 + TypeScript).
Нічого не змінювалось — це інвентаризація.

**Ключова асиметрія, з якої випливає половина вердиктів:** у React Flow ребра малює користувач
(`onConnect` створює `Edge` і кладе його в масив), у нас ребра **виводяться зі структури** —
`layoutStaffCanvas` / `buildSpineBusPaths` рахують геометрію з `reportLines`, а шар ребер узагалі
не приймає події: `packages/sdk/src/render/LayerManager.ts:30` (`this.edges.eventMode = 'none'`),
закріплено тестом `packages/sdk/src/render/nodeInteractions.contract.test.ts:356`.
Тому «створити зв'язок мишею» в нас не має де застосуватись **у первинному вигляді**, але має
осмислене перетлумачення (див. §2.7).

---

## Зведення

| Фіча | Є в React Flow | Є в нас | Вердикт |
|---|---|---|---|
| Плавний драг ноди (d3-drag + snapped-diff gate + in-place мутація) | так, `XYDrag.ts` | частково, `personInteractions.ts` | **треба доробити** (§1) |
| Auto-pan під час драгу | так, `XYDrag.ts:232` | ні | треба (§1.6) |
| `nodeDragThreshold` / `nodeClickDistance` | так | так (4px hard-coded) | є, різниця в конфігурованості |
| `dragHandle` / `noDragClassName` | так | ні (тягнеться вся картка) | не треба (§1.8) |
| Магнітне притягання до handle (`connectionRadius`) | так, `xyhandle/utils.ts:28` | ні | **треба, у перетлумаченні** (§2.7) |
| `connectionMode` loose/strict, `isValidConnection` | так | ні | треба в перетлумаченні (§2.7) |
| Підсвітка валідної/невалідної цілі | так, CSS-класи на handle | ні | треба (§2.7) |
| Перепідключення ребра (`reconnectEdge`, `onReconnect*`) | так | ні | **треба, у перетлумаченні** (§2.6) |
| Connection line + її типи | так | не застосовно | не треба (ребра похідні) |
| `snapToGrid` / `snapGrid` | так | так, але завжди-увімкнено | є, §3 |
| Helper lines / вирівнювання | **ні** (тільки приклад у доках) | ні | див. «чого немає в них» |
| Рамка виділення (box-select) | так, `Pane/index.tsx` | ні | треба (§4) |
| `selectionMode` Full/Partial | так | не застосовно поки нема рамки | §4 |
| `multiSelectionKeyCode` | так | так, але без keyCode (модифікатор миші) | є, §4 |
| Переміщення групи (`NodesSelection`) | так | ні | треба (§4) |
| Клавіатура: стрілки/Enter/Escape | так, `NodeWrapper/index.tsx:128` | **ні взагалі** | треба (§5) |
| `tabIndex` / `role` / `aria-*` / live-region | так, `A11yDescriptions` | ні (Pixi-канва) | треба, але інакше (§5) |
| `autoPanOnNodeFocus` | так | ні | треба (§5) |
| `NodeResizer` / `XYResizer` | так | ні | не треба (§6) |
| `parentId` / `extent:'parent'` / `expandParent` | так | ні (є свій expand/collapse) | не треба у їх вигляді (§6) |
| `deleteKeyCode` / `onBeforeDelete` / каскад на ребра | так | **ні** | треба (§7) |
| DnD із палітри | не в бібліотеці, приклад | ні | треба (§7.2) |
| Копіювання/вставка | **ні** | ні | не треба |
| Undo/redo | **ні** | ні | треба нам (§7.4) |

