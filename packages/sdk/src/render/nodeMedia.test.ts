import { afterEach, describe, expect, it, vi } from 'vitest';
import { Texture } from 'pixi.js';
import {
  clearNodeTextureCache,
  configureNodeTextureLoader,
  loadNodeTexture,
} from './nodeMedia.js';

describe('loadNodeTexture', () => {
  afterEach(() => {
    configureNodeTextureLoader(null);
    clearNodeTextureCache();
  });

  it('success: returns texture from loader and caches by url', async () => {
    const tex = Texture.WHITE;
    const loader = vi.fn(async () => tex);
    configureNodeTextureLoader(loader);

    const a = await loadNodeTexture('/a.png');
    const b = await loadNodeTexture('/a.png');

    expect(a).toBe(tex);
    expect(b).toBe(tex);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('failure: empty url → null without calling loader', async () => {
    const loader = vi.fn(async () => Texture.WHITE);
    configureNodeTextureLoader(loader);
    expect(await loadNodeTexture('   ')).toBeNull();
    expect(loader).not.toHaveBeenCalled();
  });

  it('failure: loader error → null', async () => {
    configureNodeTextureLoader(async () => {
      throw new Error('network');
    });
    expect(await loadNodeTexture('/missing.png')).toBeNull();
  });
});
