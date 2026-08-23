import { Container, Graphics, Text, type FederatedPointerEvent } from 'pixi.js';
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
  menuButton?: Container;
  expandButton?: Container;
}

/** GoJS: brand circle 26×26 at Spot(1,1,-13,-13) — no ⋮ menu. */
export function mountGojsOrgTreeExpander(
  host: Container,
  cardWidth: number,
  cardHeight: number,
  brandColor: number,
  chrome: OrgTreeChrome,
): Container | undefined {
  if (!chrome.hasChildren) return undefined;

  const size = 26;
  const cx = cardWidth - 13;
  const cy = cardHeight - 13;
  const btn = new Container();
  btn.x = cx - size / 2;
  btn.y = cy - size / 2;
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.hitArea = { contains: (x, y) => x >= 0 && y >= 0 && x <= size && y <= size };

  const circle = new Graphics();
  circle.circle(size / 2, size / 2, size / 2);
  circle.fill({ color: brandColor });

  const glyph = new Text({
    text: chrome.collapsed ? '+' : '−',
    style: { fill: 0xffffff, fontSize: 16, fontWeight: '700' },
  });
  glyph.anchor.set(0.5);
  glyph.position.set(size / 2, size / 2);
  glyph.eventMode = 'none';

  btn.addChild(circle, glyph);
  btn.on('pointerdown', (e: FederatedPointerEvent) => e.stopPropagation());
  btn.on('pointertap', (e: FederatedPointerEvent) => {
    e.stopPropagation();
    if (chrome.collapsed) chrome.onExpand();
    else chrome.onCollapse();
  });

  host.addChild(btn);
  return btn;
}

/** Figma / legacy: expand/collapse + ⋮ menu on org cards. */
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
