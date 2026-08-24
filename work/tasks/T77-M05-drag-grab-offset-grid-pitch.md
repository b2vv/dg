# T77-M05 — Drag grab-offset + grid pitch (A10, A11)

**Епік:** [T77](./T77-critique-remediation.md) · **Critique:** A10, A11, §6.1  
**Пріоритет:** P0 · **Статус:** ✅  
**Файли:** `DiagramRenderer.ts`, `positionMove.ts` / `coords.ts`

## Проблема

1. **A10:** `nx = local.x - width/2` скидає grab-offset → клік з офсетом комітить move.
2. **A11:** snap на `cellWidth`, layout на `refCell + gap` (+ origin ярусу).

## Acceptance

- [ ] pointerdown зберігає grab offset; move = pointer − offset.
- [ ] `moved` лише якщо delta pointer (або node) > порогу **до** центрування.
- [ ] Snap використовує той самий pitch/origin, що staff layout (`contourWorld` / staff geom).
- [ ] Unit: click-without-move не викликає `onPersonDragEnd`; snap col/row стабільні на pitch≠cell.
