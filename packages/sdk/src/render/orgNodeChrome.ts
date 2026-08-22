import type { Container } from 'pixi.js';
import { attachIconButton, attachMenuButton, type ContextMenuPointer } from './nodeCardChrome.js';

export interface OrgTreeChrome {
  kind: 'tree';
  collapsed: boolean;
  hasChildren: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

export interface OrgStaffExpandChrome {
  kind: 'staff-expand';
  expanded: boolean;
  onToggle: () => void;
}

export type OrgNodeChrome = OrgTreeChrome | OrgStaffExpandChrome;

export interface OrgNodeChromeMount {
  menuButton: Container;
  expandButton?: Container;
}

/** Expand/collapse (tree) or staff chevron + ⋮ menu on org cards. */
export function mountOrgNodeChrome(
  host: Container,
  cardWidth: number,
  chrome: OrgNodeChrome,
  onContextMenu: (pointer: ContextMenuPointer) => void,
): OrgNodeChromeMount {
  let x = cardWidth - 26;
  let expandButton: Container | undefined;

  if (chrome.kind === 'tree') {
    if (chrome.hasChildren && chrome.collapsed) {
      expandButton = attachIconButton(host, x, 4, '+', 'Expand', chrome.onExpand);
      x -= 28;
    } else if (chrome.hasChildren && !chrome.collapsed) {
      expandButton = attachIconButton(host, x, 4, '−', 'Collapse', chrome.onCollapse);
      x -= 28;
    }
  } else {
    expandButton = attachIconButton(
      host,
      x,
      4,
      chrome.expanded ? '▲' : '▼',
      chrome.expanded ? 'Collapse staff' : 'Expand staff',
      chrome.onToggle,
    );
    x -= 28;
  }

  const menuButton = attachMenuButton(host, cardWidth, 4, onContextMenu);
  menuButton.x = x;

  return { menuButton, expandButton };
}
