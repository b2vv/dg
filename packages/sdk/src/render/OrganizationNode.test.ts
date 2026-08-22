import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Texture } from 'pixi.js';
import { OrganizationNodeView } from './OrganizationNode.js';
import { configureNodeTextureLoader, clearNodeTextureCache } from './nodeMedia.js';
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
    expect(view.hasSymbolSprite()).toBe(true);
  });

  it('success: tree chrome shows expand control and menu', () => {
    const onMenu = vi.fn();
    const onExpand = vi.fn();
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
    const onMenu = vi.fn();
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
});
