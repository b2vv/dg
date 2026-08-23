import { Texture } from 'pixi.js';
import { mediaCacheKey, mediaCacheKeyMatchesUrl } from '../media/types.js';

export type NodeTextureLoader = (url: string) => Promise<Texture | null>;

const cache = new Map<string, Promise<Texture | null>>();
/** Live diagram instances that still need this URL in Pixi Assets (T74 D6 M-C). */
const urlOwners = new Map<string, number>();

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
  urlOwners.clear();
}

/** Drop all global texture promises (tests / hard reset). */
export function clearNodeTextureCache(): void {
  cache.clear();
}

/**
 * Remove global cache entries for one or more raw URLs (all revisions).
 * Does not unload Pixi Assets — caller / {@link releaseNodeTextureUrl} owns that.
 */
export function evictNodeTextureCache(url: string | readonly string[]): void {
  const urls = Array.isArray(url) ? url : [url];
  for (const raw of urls) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    for (const key of [...cache.keys()]) {
      if (mediaCacheKeyMatchesUrl(key, trimmed)) cache.delete(key);
    }
  }
}

/** Mark this diagram instance as holding `url` (refcount). */
export function acquireNodeTextureUrl(url: string): void {
  const trimmed = url.trim();
  if (!trimmed) return;
  urlOwners.set(trimmed, (urlOwners.get(trimmed) ?? 0) + 1);
}

/**
 * Drop one owner. When count hits 0: evict global cache + `Assets.unload`.
 * Safe if URL was never acquired.
 */
export async function releaseNodeTextureUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;
  const next = (urlOwners.get(trimmed) ?? 1) - 1;
  if (next > 0) {
    urlOwners.set(trimmed, next);
    return;
  }
  urlOwners.delete(trimmed);
  evictNodeTextureCache(trimmed);
  try {
    const { Assets, Cache } = await import('pixi.js');
    if (!Cache.has(trimmed)) return;
    await Promise.race([
      Assets.unload(trimmed),
      new Promise<void>((resolve) => {
        setTimeout(resolve, 250);
      }),
    ]);
  } catch {
    // Not loaded in Assets on this runtime.
  }
}

/** Test/diagnostics: current owner count for URL. */
export function nodeTextureUrlOwnerCount(url: string): number {
  return urlOwners.get(url.trim()) ?? 0;
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '::1' || host.endsWith('.localhost')) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;
  return false;
}

/**
 * Allow same-origin relative paths, `data:image/*`, `blob:`, and `https:` to
 * non-private hosts. Reject `javascript:`, `http:`, and private hosts.
 */
export function isAllowedNodeMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return false;
  if (lower.startsWith('data:')) {
    return /^data:image\//i.test(trimmed);
  }
  if (lower.startsWith('blob:')) return true;

  if (trimmed.startsWith('//')) return false;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return true;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol === 'https:') {
    return !isPrivateOrLocalHostname(parsed.hostname);
  }
  return false;
}

/**
 * Load (and cache) a texture by URL + optional revision (T74 D6 M-B).
 * Failure / disallowed URL → `null` (caller keeps placeholder).
 */
export function loadNodeTexture(
  url: string,
  revision?: string | number,
): Promise<Texture | null> {
  const trimmed = url.trim();
  if (!trimmed) return Promise.resolve(null);
  if (!isAllowedNodeMediaUrl(trimmed)) return Promise.resolve(null);

  const key = mediaCacheKey(trimmed, revision);
  const hit = cache.get(key);
  if (hit) return hit;

  const loader = customLoader ?? defaultLoader;
  const pending = loader(trimmed).catch(() => null);
  cache.set(key, pending);
  return pending;
}
