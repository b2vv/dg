import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Texture } from 'pixi.js';
import { OrganizationNodeView } from './OrganizationNode.js';
import { configureNodeTextureLoader, clearNodeTextureCache } from './nodeMedia.js';
import { GOJS_BODY_MARGIN, GOJS_NAME_ROW_H, GOJS_SYMBOL_ROW_MARGIN_TOP } from './orgSymbolBox.js';
import type { OrganizationNodeStyle } from './types.js';

const GOJS_ORG_STYLE: OrganizationNodeStyle = {
  width: 220,
  height: 121,
  background: 0x1e293b,
  border: 0x475569,
  borderWidth: 1.5,
  borderRadius: 10,
  nameColor: 0xf1f5f9,
  groupColor: 0xcbd5e1,
  nameFontSize: 13,
  groupFontSize: 11,
  symbolSize: 80,
  symbolWidth: 80,
  symbolHeight: 56,
  orgCardLayout: 'gojs-vertical',
  hidePeriodOnCard: true,
  tempMarkerStyle: 'hourglass',
  brandColor: 0x2563eb,
  metaColor: 0x94a3b8,
  metaFontSize: 10,
  badgeColor: 0xf59e0b,
  countsBadgeBackground: 0x334155,
  countsBadgeTextColor: 0xe2e8f0,
  countsBadgeFontSize: 9,
};

describe('OrganizationNodeView GoJS vertical (brief O1–O10)', () => {
  const org = {
    id: 'org-hq',
    name: 'Brightside Holdings',
    groupIds: [],
    childrenCount: 1,
    allDescendantCount: 6,
    symbolUrl: '/sym.png',
  };

  beforeEach(() => {
    configureNodeTextureLoader(async () => Texture.WHITE);
  });

  afterEach(() => {
    configureNodeTextureLoader(null);
    clearNodeTextureCache();
  });

  it('success: name row above symbol, left-aligned (O1/O2)', async () => {
    const view = OrganizationNodeView.create(org, undefined, 'dark', GOJS_ORG_STYLE);
    await view.mediaReady;

    const name = view.findText('Brightside Holdings');
    expect(name).toBeTruthy();
    expect(name!.anchor.x).toBe(0);
    expect(name!.position.x).toBe(GOJS_BODY_MARGIN.left);
    expect(name!.position.y).toBe(GOJS_BODY_MARGIN.top);

    const sym = view.symbolBox;
    expect(sym.y).toBe(GOJS_BODY_MARGIN.top + GOJS_NAME_ROW_H + GOJS_SYMBOL_ROW_MARGIN_TOP);
    expect(sym.width).toBe(80);
    expect(sym.height).toBe(56);
  });

  it('success: GoJS tree chrome has expander, no ⋮ menu (O8/O9)', async () => {
    const onExpand = vi.fn();
    const view = OrganizationNodeView.create(org, undefined, 'dark', GOJS_ORG_STYLE, 'near', {
      onContextMenu: () => {},
      chrome: {
        kind: 'tree',
        collapsed: true,
        hasChildren: true,
        onExpand,
        onCollapse: () => {},
      },
    });
    await view.mediaReady;
    expect(view.hasMenuButton()).toBe(false);
    expect(view.hasExpandControl()).toBe(true);
  });

  it('success: tree counts badge uses top-right inset (O7)', async () => {
    const view = OrganizationNodeView.create(org, undefined, 'dark', GOJS_ORG_STYLE);
    await view.mediaReady;
    expect(view.hasCountsBadge()).toBe(true);
    expect(view.findText('1 [6]')).toBeTruthy();
  });

  it('success: no symbol shows fullName fallback in symbol box (O6)', async () => {
    const view = OrganizationNodeView.create(
      {
        id: 'org-x',
        name: 'Short',
        fullName: 'Organization Without Symbol',
        groupIds: [],
      },
      undefined,
      'dark',
      GOJS_ORG_STYLE,
    );
    await view.mediaReady;
    expect(view.hasSymbolSprite()).toBe(false);
    expect(view.hasSymbolFallback()).toBe(true);
    expect(view.findText('Organization Without Symbol')).toBeTruthy();
  });
});
