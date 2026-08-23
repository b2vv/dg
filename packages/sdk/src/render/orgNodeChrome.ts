import { Container, Graphics, Text, type FederatedPointerEvent } from 'pixi.js';
import {
  attachIconButton,
  attachMenuButton,
  type ContextMenuPointer,
} from './nodeCardChrome.js';

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
  menuButton?: Container;
  expandButton?: Container;
}

const EXPANDER_D = 26;

/** GoJS tree: brand circle bottom-right, no ⋮ (RMB menu only). */
export function mountGojsTreeChrome(
  host: Container,
  cardWidth: number,
  cardHeight: number,
  chrome: OrgTreeChrome,
  brandColor: number,
): Container | undefined {
  if (!chrome.hasChildren) return undefined;

  const cx = cardWidth - 13;
  const cy = cardHeight - 13;
  const btn = new Container();
  btn.x = cx - EXPANDER_D / 2;
  btn.y = cy - EXPANDER_D / 2;
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.hitArea = { contains: (x, y) => x >= 0 && y >= 0 && x <= EXPANDER_D && y <= EXPANDER_D };

  const circle = new Graphics();
  circle.circle(EXPANDER_D / 2, EXPANDER_D / 2, EXPANDER_D / 2);
  circle.fill({ color: brandColor });
  btn.addChild(circle);

  const glyph = new Text({
    text: chrome.collapsed ? '+' : '−',
    style: { fill: 0xffffff, fontSize: 14, fontWeight: '700' },
  });
  glyph.anchor.set(0.5);
  glyph.position.set(EXPANDER_D / 2, EXPANDER_D / 2);
  glyph.eventMode = 'none';
  btn.addChild(glyph);

  const onTap = () => (chrome.collapsed ? chrome.onExpand() : chrome.onCollapse());
  btn.on('pointerdown', (e: FederatedPointerEvent) => e.stopPropagation());
  btn.on('pointertap', (e: FederatedPointerEvent) => {
    e.stopPropagation();
    onTap();
  });

  host.addChild(btn);
  btn.label = 'org-expand';
  return btn;
}

/** Expand/collapse (tree) or staff chevron + ⋮ menu on org cards. */
export function mountOrgNodeChrome(
  host: Container,
  cardWidth: number,
  chrome: OrgNodeChrome,
  onContextMenu: (pointer: ContextMenuPointer) => void,
  options: { cardHeight?: number; brandColor?: number; gojsTree?: boolean } = {},
): OrgNodeChromeMount {
  if (options.gojsTree && chrome.kind === 'tree') {
    const expandButton = mountGojsTreeChrome(
      host,
      cardWidth,
      options.cardHeight ?? 121,
      chrome,
      options.brandColor ?? 0x2563eb,
    );
    return { expandButton };
  }

  let x = cardWidth - 26;
  let expandButton: Container | undefined;

  if (chrome.kind === 'tree') {
    if (chrome.hasChildren && chrome.collapsed) {
      expandButton = attachIconButton(host, x, 4, '+', 'Expand', chrome.onExpand);
      expandButton.label = 'org-expand';
      x -= 28;
    } else if (chrome.hasChildren && !chrome.collapsed) {
      expandButton = attachIconButton(host, x, 4, '−', 'Collapse', chrome.onCollapse);
      expandButton.label = 'org-expand';
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
  menuButton.label = 'org-menu';
  menuButton.x = x;

  return { menuButton, expandButton };
}
