import { Texture } from 'pixi.js';

export type NodeTextureLoader = (url: string) => Promise<Texture | null>;

const cache = new Map<string, Promise<Texture | null>>();

let customLoader: NodeTextureLoader | null = null;

async function defaultLoader(url: string): Promise<Texture | null> {
  try {
    const { Assets } = await import('pixi.js');
    const loaded = await Promise.race([
      Assets.load(url),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('node texture load timeout')), 8_000);
      }),
    ]);
    if (loaded instanceof Texture) return loaded;
    return Texture.from(url);
  } catch {
    return null;
  }
}

/** Inject loader for tests; pass `null` to restore default. */
export function configureNodeTextureLoader(loader: NodeTextureLoader | null): void {
  customLoader = loader;
  cache.clear();
}

export function clearNodeTextureCache(): void {
  cache.clear();
}

/**
 * Load (and cache) a texture by URL. Failure → `null` (caller keeps placeholder).
 */
export function loadNodeTexture(url: string): Promise<Texture | null> {
  const trimmed = url.trim();
  if (!trimmed) return Promise.resolve(null);

  const hit = cache.get(trimmed);
  if (hit) return hit;

  const loader = customLoader ?? defaultLoader;
  const pending = loader(trimmed).catch(() => null);
  cache.set(trimmed, pending);
  return pending;
}
