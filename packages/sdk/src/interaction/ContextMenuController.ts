import type { DiagramData } from '../data/types.js';
import { defaultContextMenuItems } from './contextMenu.js';
import {
  resolveContextMenuNodeData,
  type ContextMenuPointer,
  type ContextMenuRequest,
} from './contextMenuPayload.js';
import { nodeEntityKey } from './nodeKey.js';
import type { MenuItem, NodeRef } from './types.js';

/** Subset of the host callbacks this controller needs (avoids a module cycle). */
export interface ContextMenuHooks {
  onContextMenu?(request: ContextMenuRequest): MenuItem[] | false | void;
  onContextMenuAction?(item: MenuItem, request: ContextMenuRequest): void;
}

/** Diagram operations a menu item can trigger. */
export interface ContextMenuCommands {
  expandOrg(orgId: string): Promise<void>;
  collapseOrg(orgId: string): Promise<void>;
  focusNode(nodeId: string): Promise<void>;
  setOrgsCollapsed(orgIds: readonly string[], collapsed: boolean): Promise<void>;
  clearSelection(): Promise<void>;
}

export interface ContextMenuDeps {
  data(): DiagramData;
  selection(): readonly NodeRef[];
  hooks(): ContextMenuHooks;
  commands: ContextMenuCommands;
  /** Overridable for tests / non-browser hosts. */
  writeClipboard?(text: string): Promise<void>;
}

/**
 * Builds context-menu requests and dispatches the item the host clicked.
 * Holds the last request so async (React) menus can act after the event.
 */
export class ContextMenuController {
  private last: ContextMenuRequest | null = null;

  constructor(private readonly deps: ContextMenuDeps) {}

  get lastRequest(): ContextMenuRequest | null {
    return this.last;
  }

  /** Build the request, let the host filter/replace items, remember it. */
  open(node: NodeRef, pointer: ContextMenuPointer): void {
    const request: ContextMenuRequest = {
      node: resolveContextMenuNodeData(this.deps.data(), node),
      items: defaultContextMenuItems(node, { selection: this.deps.selection() }),
      pointer: {
        clientX: pointer.clientX,
        clientY: pointer.clientY,
        canvasX: pointer.canvasX,
        canvasY: pointer.canvasY,
      },
    };
    const result = this.deps.hooks().onContextMenu?.(request);
    if (result === false) return;
    if (Array.isArray(result)) request.items = result;
    this.last = request;
  }

  async run(itemId: string, request?: ContextMenuRequest): Promise<void> {
    const req = request ?? this.last;
    if (!req) return;
    const item = req.items.find((i) => i.id === itemId);
    if (!item || item.disabled) return;
    this.deps.hooks().onContextMenuAction?.(item, req);
    await this.dispatch(item.id, req.node.ref);
    this.last = null;
  }

  private async dispatch(itemId: string, ref: NodeRef): Promise<void> {
    const { commands } = this.deps;
    switch (itemId) {
      case 'expand':
        if (ref.organizationId) await commands.expandOrg(ref.organizationId);
        return;
      case 'collapse':
        if (ref.organizationId) await commands.collapseOrg(ref.organizationId);
        return;
      case 'focus':
      case 'focus-subtree':
        await commands.focusNode(ref.positionId ?? ref.personId ?? ref.id);
        return;
      case 'copy-id':
        await this.copy(ref.id);
        return;
      case 'bulk-expand':
      case 'bulk-collapse':
        await commands.setOrgsCollapsed(
          this.selectedOrgIds(),
          itemId === 'bulk-collapse',
        );
        return;
      case 'bulk-copy-ids':
        await this.copy(
          this.deps.selection().map((n) => nodeEntityKey(n.kind, n.id)).join(' '),
        );
        return;
      case 'bulk-clear':
        await commands.clearSelection();
        return;
      default:
        return;
    }
  }

  private selectedOrgIds(): string[] {
    return this.deps
      .selection()
      .filter((n) => n.kind === 'organization')
      .map((n) => n.id);
  }

  private async copy(text: string): Promise<void> {
    if (this.deps.writeClipboard) {
      await this.deps.writeClipboard(text);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(text);
  }
}
