import { afterEach, describe, expect, it, vi } from 'vitest';
import { Texture } from 'pixi.js';
import { MediaService } from './MediaService.js';
import {
  mediaCacheKey,
  resolveThemedMediaUrl,
  resolveThemedMediaFromOrganization,
  resolveThemedMediaFromPerson,
} from './index.js';
import {
  clearNodeTextureCache,
  configureNodeTextureLoader,
  evictNodeTextureCache,
  loadNodeTexture,
  nodeTextureUrlOwnerCount,
  acquireNodeTextureUrl,
  releaseNodeTextureUrl,
} from '../render/nodeMedia.js';

describe('mediaCacheKey', () => {
  it('success: always suffixes revision (absent ≡ 0)', () => {
    expect(mediaCacheKey('blob:x', 3)).toBe('blob:x::3');
    expect(mediaCacheKey('blob:x', undefined)).toBe('blob:x::0');
    expect(mediaCacheKey('blob:x', '')).toBe('blob:x::0');
  });
});

describe('resolveThemedMediaUrl', () => {
  it('success: theme hit then fallback', () => {
    expect(
      resolveThemedMediaUrl(
        { byTheme: { dark: '/d.png', light: '/l.png' }, fallback: '/f.png' },
        'dark',
      ),
    ).toBe('/d.png');
    expect(
      resolveThemedMediaUrl(
        { byTheme: { light: '/l.png' }, fallback: '/f.png' },
        'dark',
      ),
    ).toBe('/f.png');
  });
});

describe('legacyBridge', () => {
  it('success: org legacy maps to byTheme', () => {
    const media = resolveThemedMediaFromOrganization({
      id: 'o1',
      name: 'O',
      groupIds: [],
      symbolUrlLight: '/l.png',
      symbolUrlDark: '/d.png',
    });
    expect(media?.byTheme?.light).toBe('/l.png');
    expect(media?.byTheme?.dark).toBe('/d.png');
  });

  it('success: media wins over legacy', () => {
    const media = resolveThemedMediaFromOrganization({
      id: 'o1',
      name: 'O',
      groupIds: [],
      symbolUrl: '/legacy.png',
      media: { fallback: '/canonical.png' },
    });
    expect(media?.fallback).toBe('/canonical.png');
  });

  it('success: person photoUrl → fallback', () => {
    expect(
      resolveThemedMediaFromPerson({ id: 'p1', fullName: 'A', photoUrl: '/p.png' })?.fallback,
    ).toBe('/p.png');
  });
});

describe('MediaService D6 M0', () => {
  afterEach(() => {
    configureNodeTextureLoader(null);
    clearNodeTextureCache();
  });

  it('success: revision miss does not reuse prior global texture (M-B)', async () => {
    const tex1 = Texture.WHITE;
    const tex2 = Texture.EMPTY;
    const loader = vi
      .fn()
      .mockResolvedValueOnce(tex1)
      .mockResolvedValueOnce(tex2);
    configureNodeTextureLoader(loader);

    const media = new MediaService('light');
    const a = await media.loadTexture('/sym.png', 1);
    const b = await media.loadTexture('/sym.png', 2);
    expect(a).toBe(tex1);
    expect(b).toBe(tex2);
    expect(loader).toHaveBeenCalledTimes(2);
    await media.destroy();
  });

  it('success: invalidate evicts global cache so reload is fresh (M-A)', async () => {
    const tex1 = Texture.WHITE;
    const tex2 = Texture.EMPTY;
    const loader = vi
      .fn()
      .mockResolvedValueOnce(tex1)
      .mockResolvedValueOnce(tex2);
    configureNodeTextureLoader(loader);

    const media = new MediaService('light');
    expect(await media.loadTexture('/a.png', 0)).toBe(tex1);
    await media.invalidate('/a.png');
    // Direct global path must also miss after evict.
    expect(await loadNodeTexture('/a.png', 0)).toBe(tex2);
    expect(loader).toHaveBeenCalledTimes(2);
    await media.destroy();
  });

  it('success: destroy releases ownership without unloading while peer holds URL (M-C)', async () => {
    configureNodeTextureLoader(async () => Texture.WHITE);
    const a = new MediaService('light');
    const b = new MediaService('light');
    await a.loadTexture('/shared.png', 0);
    await b.loadTexture('/shared.png', 0);
    expect(nodeTextureUrlOwnerCount('/shared.png')).toBe(2);

    await a.destroy();
    expect(nodeTextureUrlOwnerCount('/shared.png')).toBe(1);

    await b.destroy();
    expect(nodeTextureUrlOwnerCount('/shared.png')).toBe(0);
  });

  it('success: refresh(ref) invalidates resolved org URLs', async () => {
    configureNodeTextureLoader(async () => Texture.WHITE);
    const reload = vi.fn(async () => undefined);
    const media = new MediaService('light', { default: {} }, {
      onInvalidateViews: async () => {
        await reload();
      },
      resolveNodeUrls: (ref) =>
        ref.kind === 'organization' && ref.id === 'o1' ? ['/org-sym.png'] : [],
    });
    await media.loadTexture('/org-sym.png', 0);
    await media.refresh({ kind: 'organization', id: 'o1', organizationId: 'o1' });
    expect(reload).toHaveBeenCalledTimes(1);
    await media.destroy();
  });
});
