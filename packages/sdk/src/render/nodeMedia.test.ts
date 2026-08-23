import { afterEach, describe, expect, it, vi } from 'vitest';
import { Texture } from 'pixi.js';
import {
  clearNodeTextureCache,
  configureNodeTextureLoader,
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

  it('failure: disallowed url → null without calling loader', async () => {
    const loader = vi.fn(async () => Texture.WHITE);
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
