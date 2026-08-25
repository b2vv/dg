import type { Container, FederatedPointerEvent } from 'pixi.js';
import type { ContextMenuPointer } from '../interaction/contextMenuPayload.js';

/**
 * Right-click on a card: swallow the event, suppress the browser menu, and
 * report the pointer in both client and canvas space. Identical for org cards
 * and seat cards, so it lives once.
 */
export function bindCardContextMenu(
  view: Container,
  report: (pointer: Required<ContextMenuPointer>) => void,
): void {
  view.on('rightclick', (e: FederatedPointerEvent) => {
    e.stopPropagation();
    e.preventDefault?.();
    report({
      clientX: e.clientX,
      clientY: e.clientY,
      canvasX: e.global.x,
      canvasY: e.global.y,
    });
  });
}
