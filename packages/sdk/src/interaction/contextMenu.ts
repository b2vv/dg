import type { MenuItem, NodeRef } from './types.js';

export function defaultContextMenuItems(node: NodeRef): MenuItem[] {
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
