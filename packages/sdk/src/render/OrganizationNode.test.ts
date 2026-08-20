import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
});
