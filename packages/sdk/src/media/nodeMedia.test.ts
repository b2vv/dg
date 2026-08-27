import { afterEach, describe, expect, it, rstest } from '@rstest/core';
import { Texture } from 'pixi.js';
import {
  clearNodeTextureCache,
  configureNodeTextureLoader,
  evictNodeTextureCache,
  isAllowedNodeMediaUrl,
  loadNodeTexture,
} from './nodeMedia.js';

describe('isAllowedNodeMediaUrl', () => {
  it('success: allows relative, https public, data:image, blob', () => {
    expect(isAllowedNodeMediaUrl('/a.png')).toBe(true);
    expect(isAllowedNodeMediaUrl('https://cdn.example.com/a.png')).toBe(true);
    expect(isAllowedNodeMediaUrl('data:image/png;base64,aaa')).toBe(true);
    expect(isAllowedNodeMediaUrl('blob:https://app/uuid')).toBe(true);
  });

  it('failure: blocks http, javascript, protocol-relative, private https', () => {
    expect(isAllowedNodeMediaUrl('http://evil.test/x.png')).toBe(false);
    expect(isAllowedNodeMediaUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedNodeMediaUrl('//evil.test/x.png')).toBe(false);
    expect(isAllowedNodeMediaUrl('https://169.254.169.254/latest')).toBe(false);
    expect(isAllowedNodeMediaUrl('https://192.168.1.1/a.png')).toBe(false);
    expect(isAllowedNodeMediaUrl('data:text/html,hi')).toBe(false);
  });
});

describe('loadNodeTexture', () => {
  afterEach(() => {
    configureNodeTextureLoader(null);
    clearNodeTextureCache();
  });

  it('success: returns texture from loader and caches by url+revision', async () => {
    const tex = Texture.WHITE;
    const loader = rstest.fn(async () => tex);
    configureNodeTextureLoader(loader);

    const a = await loadNodeTexture('/a.png');
    const b = await loadNodeTexture('/a.png');
    const c = await loadNodeTexture('/a.png', 1);

    expect(a).toBe(tex);
    expect(b).toBe(tex);
    expect(c).toBe(tex);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('success: evict clears all revisions for url', async () => {
    const loader = rstest.fn(async () => Texture.WHITE);
    configureNodeTextureLoader(loader);
    await loadNodeTexture('/e.png', 0);
    await loadNodeTexture('/e.png', 1);
    evictNodeTextureCache('/e.png');
    await loadNodeTexture('/e.png', 0);
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it('failure: empty url → null without calling loader', async () => {
    const loader = rstest.fn(async () => Texture.WHITE);
    configureNodeTextureLoader(loader);
    expect(await loadNodeTexture('   ')).toBeNull();
    expect(loader).not.toHaveBeenCalled();
  });

  it('failure: disallowed url → null without calling loader', async () => {
    const loader = rstest.fn(async () => Texture.WHITE);
    configureNodeTextureLoader(loader);
    expect(await loadNodeTexture('http://169.254.169.254/')).toBeNull();
    expect(loader).not.toHaveBeenCalled();
  });

  it('failure: loader error → null', async () => {
    configureNodeTextureLoader(async () => {
      throw new Error('network');
    });
    expect(await loadNodeTexture('/missing.png')).toBeNull();
  });
});
