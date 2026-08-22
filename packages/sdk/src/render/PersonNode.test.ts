import { afterEach, describe, expect, it, vi } from 'vitest';
import { Texture } from 'pixi.js';
import { PersonNodeView } from './PersonNode.js';
import { configureNodeTextureLoader, clearNodeTextureCache } from './nodeMedia.js';
import { defaultNodeTheme } from './types.js';

describe('PersonNodeView', () => {
  afterEach(() => {
    configureNodeTextureLoader(null);
    clearNodeTextureCache();
  });

  it('success: renders name, title, initials and temp badge', async () => {
    const view = PersonNodeView.create(
      {
        id: 'p1',
        fullName: 'Іваненко Іван',
        photoUrl: undefined,
      },
      {
        id: 'pos1',
        title: 'Інженер',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: true,
      },
      defaultNodeTheme.person,
    );
    await view.mediaReady;
    expect(view.eventMode).toBe('static');
    expect(view.findText('Іваненко Іван')).toBeTruthy();
    expect(view.findText('Інженер')).toBeTruthy();
    expect(view.findText('ІІ')).toBeTruthy();
    expect(view.hasTempBadge()).toBe(true);
    expect(view.hasPhotoSprite()).toBe(false);
    expect(view.hasInitials()).toBe(true);
    expect(view.avatarFill).toBeGreaterThan(0);
  });

  it('success: near lod shows photo sprite when texture loads', async () => {
    configureNodeTextureLoader(async () => Texture.WHITE);
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Іваненко Іван', photoUrl: '/photo.png' },
      {
        id: 'pos1',
        title: 'Інженер',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      defaultNodeTheme.person,
      'near',
    );
    await view.mediaReady;
    expect(view.hasPhotoSprite()).toBe(true);
    expect(view.hasInitials()).toBe(false);
  });

  it('failure: 1×1 data-URI placeholder keeps initials (no sprite)', async () => {
    configureNodeTextureLoader(async () => Texture.WHITE);
    const view = PersonNodeView.create(
      {
        id: 'p1',
        fullName: 'Іваненко Іван',
        photoUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      },
      {
        id: 'pos1',
        title: 'Інженер',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      defaultNodeTheme.person,
      'near',
    );
    await view.mediaReady;
    expect(view.hasPhotoSprite()).toBe(false);
    expect(view.hasInitials()).toBe(true);
  });

  it('failure: missing person uses placeholder name', async () => {
    const view = PersonNodeView.create(
      undefined,
      {
        id: 'vacant',
        title: 'Вакантна посада',
        organizationId: 'org1',
        groupIds: [],
        status: 'vacant',
        isTemporary: false,
      },
      defaultNodeTheme.person,
    );
    await view.mediaReady;
    expect(view.findText('—')).toBeTruthy();
    expect(view.hasTempBadge()).toBe(false);
  });

  it('failure: photo load error keeps placeholder (no sprite)', async () => {
    configureNodeTextureLoader(async () => null);
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Іваненко Іван', photoUrl: '/missing.png' },
      {
        id: 'pos1',
        title: 'Інженер',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      defaultNodeTheme.person,
    );
    await view.mediaReady;
    expect(view.hasPhotoSprite()).toBe(false);
    expect(view.findText('Іваненко Іван')).toBeTruthy();
  });

  it('success: far lod draws dot without name text', async () => {
    configureNodeTextureLoader(async () => Texture.WHITE);
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Іваненко Іван', photoUrl: '/photo.png' },
      {
        id: 'pos1',
        title: 'Інженер',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: true,
      },
      defaultNodeTheme.person,
      'far',
    );
    await view.mediaReady;
    expect(view.lod).toBe('far');
    expect(view.findText('Іваненко Іван')).toBeUndefined();
    expect(view.hasTempBadge()).toBe(false);
    expect(view.hasPhotoSprite()).toBe(false);
  });

  it('success: expand chrome shows when hasChildren', async () => {
    const onToggle = vi.fn();
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Lead' },
      {
        id: 'pos1',
        title: 'Lead',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      defaultNodeTheme.person,
      'near',
      {
        expand: { hasChildren: true, expanded: false, onToggle },
      },
    );
    await view.mediaReady;
    expect(view.hasExpandButton()).toBe(true);
  });
});
