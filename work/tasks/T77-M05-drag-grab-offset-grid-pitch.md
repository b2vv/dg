# T77-M05 — Drag grab-offset + grid pitch (A10, A11)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** A10, A11, §6.1  
**Пріоритет:** P0 · **Статус:** ✅  
**Файли:** `DiagramRenderer.ts`, `positionMove.ts` / `coords.ts`

## Проблема

1. **A10:** `nx = local.x - width/2` скидає grab-offset → клік з офсетом комітить move.
2. **A11:** snap на `cellWidth`, layout на `refCell + gap` (+ origin ярусу).

## Acceptance

- [x] pointerdown зберігає `grabOffsetX/Y`; move рахує `local − offset`.
- [x] `moved` лише коли зсув ноди > 4 px від origin.
- [x] Snap іде через `drag.snapGrid` / `dragGrid` (pitch + origin + inset), не через `cellWidth`.
- [x] Unit: `render/personDrag.contract.test.ts` — клік без руху не дає drop і повертає ноду в origin; `snapWorldToCell` тримає col/row на pitch≠cell і збивається, якщо підставити cell замість pitch.
