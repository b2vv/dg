import { sameNodeRef } from './selection.js';
import type { MenuItem, NodeRef } from './types.js';

export interface ContextMenuItemsOptions {
  /**
   * Current selection set. When it holds more than one node and the clicked
   * node is part of it, the menu becomes bulk actions (T67 D2).
   */
  selection?: readonly NodeRef[];
}

export function defaultContextMenuItems(
  node: NodeRef,
  options: ContextMenuItemsOptions = {},
): MenuItem[] {
  const selection = options.selection ?? [];
  if (selection.length > 1 && selection.some((n) => sameNodeRef(n, node))) {
    return bulkContextMenuItems(selection);
  }
  if (node.kind === 'organization') {
    return [
      { id: 'expand', label: 'Expand' },
      { id: 'collapse', label: 'Collapse' },
      { id: 'focus-subtree', label: 'Focus subtree' },
      { id: 'copy-id', label: 'Copy node id' },
    ];
  }
  return [
    { id: 'focus', label: 'Focus' },
    { id: 'copy-id', label: 'Copy node id' },
  ];
}

/**
 * Actions that apply to the whole selection. Organization-only sets also get
 * expand/collapse; mixed sets keep the kind-agnostic items.
 */
export function bulkContextMenuItems(selection: readonly NodeRef[]): MenuItem[] {
  const count = selection.length;
  const items: MenuItem[] = [];
  if (count > 0 && selection.every((n) => n.kind === 'organization')) {
    items.push(
      { id: 'bulk-expand', label: `Expand ${count} organizations` },
      { id: 'bulk-collapse', label: `Collapse ${count} organizations` },
    );
  }
  items.push(
    { id: 'bulk-copy-ids', label: `Copy ${count} node ids` },
    { id: 'bulk-clear', label: 'Clear selection' },
  );
  return items;
}
