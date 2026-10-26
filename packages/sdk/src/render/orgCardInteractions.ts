import type { DoubleTapTracker } from '../interaction/doubleTap.js';
import {
  isPrimaryPointerTap,
  isSelectionToggleModifier,
  readSelectionPointerMods,
  type SelectionPointerMods,
} from '../interaction/selection.js';
import type { ContextMenuPointer } from '../interaction/contextMenuPayload.js';
import type { OrganizationNodeView } from './OrganizationNode.js';
import { bindCardContextMenu } from './cardContextMenu.js';

/** Pointer callbacks an org card can fire (subset of RenderOptions). */
export interface OrgCardHandlers {
  onOrgClick?: (orgId: string, mods: SelectionPointerMods) => void;
  onOrgDoubleClick?: (orgId: string) => void;
  onOrgContextMenu?: (
    orgId: string,
    pointer: Required<ContextMenuPointer>,
  ) => void;
}

export interface OrgCardBindArgs {
  orgId: string;
  doubleTap: DoubleTapTracker;
  handlers: OrgCardHandlers;
  /**
   * Extra action for a plain single tap, before `onOrgClick`. Staff tier-3
   * cards use it to expand in place or drill in; org-tree cards have none.
   */
  onSingleTap?: (orgId: string) => void;
  /**
   * Whether this card may enter the selection set. Staff-scene org cards are
   * drawn beside positions but must not be selectable — there only positions
   * are manipulable (owner 2026-09-13). Default `true` (org-tree cards keep
   * selecting on tap and modifier-tap).
   */
  selectable?: boolean;
}

/**
 * Click, double-tap and context menu for an org card. Shared by the org tree
 * and the staff canvas — the two differed only in what a plain tap does.
 */
export function bindOrgCardInteractions(
  view: OrganizationNodeView,
  args: OrgCardBindArgs,
): void {
  const { orgId, doubleTap, handlers, onSingleTap, selectable = true } = args;

  view.on('pointertap', (e) => {
    if (!isPrimaryPointerTap(e)) return;
    e.stopPropagation();
    const mods = readSelectionPointerMods(e);
    // Modifier+click toggles set membership — do not feed double-tap (T69).
    // A non-selectable card (staff-scene org) swallows the modifier tap without
    // entering the set; it still must not fall through to the plain-tap path.
    if (isSelectionToggleModifier(mods)) {
      doubleTap.reset();
      if (selectable) handlers.onOrgClick?.(orgId, mods);
      return;
    }
    if (doubleTap.tap(`org:${orgId}`) === 'double') {
      handlers.onOrgDoubleClick?.(orgId);
      return;
    }
    onSingleTap?.(orgId);
    if (selectable) handlers.onOrgClick?.(orgId, mods);
  });

  view.on('pointerdown', (e) => {
    // Chrome (+/− expander, menu) ковтає свій `pointerdown` сама
    // (`wireChromeButton`), тож сюди подія з кнопки не доходить. Картка ковтає
    // решту, щоб клік не провалився на канву за нею.
    e.stopPropagation();
  });

  bindCardContextMenu(view, (pointer) => handlers.onOrgContextMenu?.(orgId, pointer));
}
