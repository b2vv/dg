import { afterEach, beforeEach, describe, expect, it, rstest } from '@rstest/core';
import { Texture } from 'pixi.js';
import { OrganizationNodeView } from './OrganizationNode.js';
import { configureNodeTextureLoader, clearNodeTextureCache } from '../media/nodeMedia.js';
import { defaultNodeTheme } from './types.js';

describe('OrganizationNodeView', () => {
  const org = {
    id: 'org1',
    name: 'Міністерство',
    groupIds: ['g1'],
    symbolUrlLight: '/sym-light.png',
    symbolUrlDark: '/sym-dark.png',
  };
  const group = { id: 'g1', name: 'Група А', emblemUrl: '/emblem.png' };

  beforeEach(() => {
    // Avoid real Assets.load hangs in jsdom unless a test overrides.
    configureNodeTextureLoader(async () => null);
  });

  afterEach(() => {
    configureNodeTextureLoader(null);
    clearNodeTextureCache();
  });

  it('success: dark theme uses dark symbol url', async () => {
    const view = OrganizationNodeView.create(org, group, 'dark', defaultNodeTheme.organization);
    await view.mediaReady;
    expect(view.resolvedSymbolUrl).toBe('/sym-dark.png');
    expect(view.findText('Міністерство')).toBeTruthy();
  });

  it('success: light theme uses light symbol url and shows sprite', async () => {
    configureNodeTextureLoader(async () => Texture.WHITE);
    const view = OrganizationNodeView.create(org, group, 'light', defaultNodeTheme.organization);
    await view.mediaReady;
    expect(view.resolvedSymbolUrl).toBe('/sym-light.png');
    expect(view.hasSymbolSprite()).toBe(true);
  });

  it('failure: missing group still renders org name', async () => {
    const view = OrganizationNodeView.create(org, undefined, 'light', defaultNodeTheme.organization);
    await view.mediaReady;
    expect(view.findText('Міністерство')).toBeTruthy();
  });

  it('failure: symbol load error keeps placeholder (no sprite)', async () => {
    configureNodeTextureLoader(async () => null);
    const view = OrganizationNodeView.create(org, group, 'light', defaultNodeTheme.organization);
    await view.mediaReady;
    expect(view.hasSymbolSprite()).toBe(false);
    expect(view.findText('Міністерство')).toBeTruthy();
  });

  it('success: far lod hides org name text', async () => {
    configureNodeTextureLoader(async () => Texture.WHITE);
    const view = OrganizationNodeView.create(
      org,
      group,
      'light',
      defaultNodeTheme.organization,
      'far',
    );
    await view.mediaReady;
    expect(view.lod).toBe('far');
    expect(view.findText('Міністерство')).toBeUndefined();
    // T74 M6: far skips texture load — no symbol sprite.
    expect(view.hasSymbolSprite()).toBe(false);
  });

  it('success: M6 far lod does not call loadTexture', async () => {
    const loadTexture = rstest.fn(async () => Texture.WHITE);
    const view = OrganizationNodeView.create(
      org,
      group,
      'light',
      defaultNodeTheme.organization,
      'far',
      { loadTexture },
    );
    await view.mediaReady;
    expect(loadTexture).not.toHaveBeenCalled();
  });

  it('success: tree chrome shows expand control and menu', () => {
    const onMenu = rstest.fn();
    const onExpand = rstest.fn();
    const view = OrganizationNodeView.create(
      org,
      group,
      'light',
      defaultNodeTheme.organization,
      'near',
      {
        onContextMenu: onMenu,
        chrome: {
          kind: 'tree',
          collapsed: true,
          hasChildren: true,
          onExpand,
          onCollapse: () => {},
        },
      },
    );
    expect(view.hasMenuButton()).toBe(true);
    expect(view.hasExpandControl()).toBe(true);
  });

  it('failure: far lod hides chrome controls', () => {
    const view = OrganizationNodeView.create(
      org,
      group,
      'light',
      defaultNodeTheme.organization,
      'far',
      { onContextMenu: () => {} },
    );
    expect(view.hasMenuButton()).toBe(false);
  });

  it('success: activateChromePointer triggers menu callback', () => {
    const onMenu = rstest.fn();
    const view = OrganizationNodeView.create(
      org,
      group,
      'light',
      defaultNodeTheme.organization,
      'near',
      { onContextMenu: onMenu },
    );
    const menuX = defaultNodeTheme.organization.width - 22 - 4 + 10;
    const e = {
      getLocalPosition: () => ({ x: menuX, y: 14 }),
      clientX: 120,
      clientY: 80,
      stopPropagation: () => {},
    } as never;
    expect(view.activateChromePointer(e)).toBe(true);
    expect(onMenu).toHaveBeenCalledWith({ clientX: 120, clientY: 80 });
  });

  it('success: periodStart paints «з … по т.ч.»', async () => {
    const view = OrganizationNodeView.create(
      { ...org, periodStart: '2024-01-15', periodEnd: null },
      undefined,
      'light',
      defaultNodeTheme.organization,
    );
    await view.mediaReady;
    expect(view.hasPeriodLabel()).toBe(true);
    expect(view.findText('з 15.01.2024 по т.ч.')).toBeTruthy();
  });

  it('failure: without period — no period line (no hole)', async () => {
    const view = OrganizationNodeView.create(org, undefined, 'light', defaultNodeTheme.organization);
    await view.mediaReady;
    expect(view.hasPeriodLabel()).toBe(false);
    expect(view.findText('Міністерство')).toBeTruthy();
  });

  it('success: periodLabel from host wins', async () => {
    const view = OrganizationNodeView.create(
      { ...org, periodStart: '2020-01-01', periodLabel: 'з наказу' },
      undefined,
      'light',
      defaultNodeTheme.organization,
    );
    await view.mediaReady;
    expect(view.findText('з наказу')).toBeTruthy();
  });

  it('Phase1: showShortName false → no-caption box larger than symbolSize', async () => {
    configureNodeTextureLoader(async () => Texture.WHITE);
    const style = defaultNodeTheme.organization;
    const view = OrganizationNodeView.create(
      { ...org, showShortName: false },
      undefined,
      'light',
      style,
    );
    await view.mediaReady;
    expect(view.symbolBoxMode).toBe('no-caption');
    expect(view.symbolBox.width).toBeGreaterThan(style.symbolSize);
    expect(view.symbolBox.height).toBeGreaterThanOrEqual(style.symbolSize);
    expect(view.findText('Міністерство')).toBeUndefined();
    expect(view.hasSymbolSprite()).toBe(true);
  });

  it('Phase1 E2: card AABB identical with and without short name', async () => {
    configureNodeTextureLoader(async () => Texture.WHITE);
    const style = defaultNodeTheme.organization;
    const withCaption = OrganizationNodeView.create(org, undefined, 'light', style);
    const noCaption = OrganizationNodeView.create(
      { ...org, showShortName: false },
      undefined,
      'light',
      style,
    );
    await Promise.all([withCaption.mediaReady, noCaption.mediaReady]);
    expect(withCaption.cardSize).toEqual({ width: style.width, height: style.height });
    expect(noCaption.cardSize).toEqual(withCaption.cardSize);
    expect(withCaption.symbolBoxMode).toBe('caption');
    expect(noCaption.symbolBoxMode).toBe('no-caption');
  });

  it('Phase1 E3: no symbol → fullName text, no placeholder diamond', async () => {
    const view = OrganizationNodeView.create(
      {
        id: 'org-nosym',
        name: 'Short',
        fullName: 'Повна назва організації',
        groupIds: [],
      },
      undefined,
      'light',
      defaultNodeTheme.organization,
    );
    await view.mediaReady;
    expect(view.hasSymbolSprite()).toBe(false);
    expect(view.hasSymbolPlaceholder()).toBe(false);
    // Prefix, not exact match: the name label now correctly loses width to the
    // fallback box beside it (see the overlap regression test below), so a long
    // full name truncates with an ellipsis instead of rendering whole.
    expect(view.findTextStartingWith('Повна назва')).toBeTruthy();
    expect(view.findText('Short')).toBeUndefined();
  });

  it('Phase1 E3: a card with no symbol renders its name once, not twice', async () => {
    // Regression, two bugs deep. The resolver set displayName and
    // fullNameFallback to the same string and showed both, so a card without a
    // logo drew its own name twice. They also started at the same x, so the two
    // copies overlapped into one smudge. Fixing only the position would have
    // left two truncated copies side by side, neither readable — the symbol-area
    // copy is symbolW wide and truncates to "Org…".
    const view = OrganizationNodeView.create(
      {
        id: 'org-nosym',
        name: 'Short',
        fullName: 'Повна назва організації',
        groupIds: [],
      },
      undefined,
      'light',
      defaultNodeTheme.organization,
    );
    await view.mediaReady;
    const { name, fallback } = view.debugTextBounds();
    expect(fallback).toBeUndefined();
    expect(name).toBeTruthy();
    // With the symbol area empty, the name starts at the card's padding and has
    // the full width to itself.
    expect(name!.x).toBeLessThan(20);
  });

  it('Phase1: full-bleed when texture is ~400×200', async () => {
    configureNodeTextureLoader(async () => {
      const base = Texture.WHITE;
      return new Proxy(base, {
        get(target, prop, receiver) {
          if (prop === 'width') return 400;
          if (prop === 'height') return 200;
          if (prop === 'source') {
            return new Proxy(target.source, {
              get(s, p, r) {
                if (p === 'width') return 400;
                if (p === 'height') return 200;
                return Reflect.get(s, p, r);
              },
            });
          }
          return Reflect.get(target, prop, receiver);
        },
      }) as Texture;
    });
    const style = defaultNodeTheme.organization;
    const view = OrganizationNodeView.create(org, undefined, 'light', style);
    await view.mediaReady;
    expect(view.symbolBoxMode).toBe('full-bleed');
    expect(view.symbolBox).toMatchObject({
      x: 0,
      y: 0,
      width: style.width,
      height: style.height,
      padding: 0,
    });
    expect(view.cardSize).toEqual({ width: style.width, height: style.height });
  });

  it('Phase2 E4: isTemporary paints top-right T badge (near)', async () => {
    const view = OrganizationNodeView.create(
      { ...org, isTemporary: true },
      undefined,
      'light',
      defaultNodeTheme.organization,
    );
    await view.mediaReady;
    expect(view.hasTempBadge()).toBe(true);
    expect(view.findText('T')).toBeTruthy();
    expect(view.cardSize).toEqual({
      width: defaultNodeTheme.organization.width,
      height: defaultNodeTheme.organization.height,
    });
  });

  it('Phase2 E4: far lod hides temp badge', async () => {
    const view = OrganizationNodeView.create(
      { ...org, isTemporary: true },
      undefined,
      'light',
      defaultNodeTheme.organization,
      'far',
    );
    await view.mediaReady;
    expect(view.hasTempBadge()).toBe(false);
  });

  it('Phase2 E5: filledCount/vacantCount → N [M] badge', async () => {
    const view = OrganizationNodeView.create(
      { ...org, filledCount: 12, vacantCount: 3 },
      undefined,
      'light',
      defaultNodeTheme.organization,
    );
    await view.mediaReady;
    expect(view.hasCountsBadge()).toBe(true);
    expect(view.findText('12 [3]')).toBeTruthy();
  });

  it('Phase2 E5: single count still shows badge with 0 other side', async () => {
    const view = OrganizationNodeView.create(
      { ...org, vacantCount: 2 },
      undefined,
      'light',
      defaultNodeTheme.organization,
    );
    await view.mediaReady;
    expect(view.hasCountsBadge()).toBe(true);
    expect(view.findText('0 [2]')).toBeTruthy();
  });

  it('Phase2 E5: omit counts badge when both undefined', async () => {
    const view = OrganizationNodeView.create(org, undefined, 'light', defaultNodeTheme.organization);
    await view.mediaReady;
    expect(view.hasCountsBadge()).toBe(false);
  });

  it('Phase2 E6: unitCode caption row (truncate)', async () => {
    const view = OrganizationNodeView.create(
      { ...org, unitCode: 'UNIT-42' },
      undefined,
      'light',
      defaultNodeTheme.organization,
    );
    await view.mediaReady;
    expect(view.hasUnitCode()).toBe(true);
    expect(view.findText('UNIT-42')).toBeTruthy();
  });

  it('Phase2 E6: empty unitCode omits row', async () => {
    const view = OrganizationNodeView.create(
      { ...org, unitCode: '  ' },
      undefined,
      'light',
      defaultNodeTheme.organization,
    );
    await view.mediaReady;
    expect(view.hasUnitCode()).toBe(false);
  });

  it('Phase2 E11: default does not prefetch inactive theme URL', async () => {
    const loaded: string[] = [];
    configureNodeTextureLoader(async (url) => {
      loaded.push(url);
      return Texture.WHITE;
    });
    const view = OrganizationNodeView.create(org, undefined, 'light', defaultNodeTheme.organization);
    await view.mediaReady;
    expect(view.resolvedSymbolUrl).toBe('/sym-light.png');
    expect(loaded).toContain('/sym-light.png');
    expect(loaded).not.toContain('/sym-dark.png');
  });

  it('Phase2 E11: opt-in prefetches inactive theme symbol URL', async () => {
    const loaded: string[] = [];
    configureNodeTextureLoader(async (url) => {
      loaded.push(url);
      return Texture.WHITE;
    });
    const view = OrganizationNodeView.create(org, undefined, 'light', defaultNodeTheme.organization, 'near', {
      prefetchInactiveSymbol: true,
    });
    await view.mediaReady;
    expect(loaded).toContain('/sym-light.png');
    expect(loaded).toContain('/sym-dark.png');
  });
});
