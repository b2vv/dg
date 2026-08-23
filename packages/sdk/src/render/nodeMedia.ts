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

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '::1' || host.endsWith('.localhost')) return true;
  // IPv4
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
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  }
  // IPv6 ULA / link-local (coarse)
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;
  return false;
}

/**
 * Allow same-origin relative paths, `data:image/*`, `blob:`, and `https:` to
 * non-private hosts. Reject `javascript:`, `http:` (SSRF/tracking), and
 * private/link-local absolute hosts (security review / E11).
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

  // Relative / root-relative / protocol-relative blocked (//evil.com)
  if (trimmed.startsWith('//')) return false;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return true; // path or ./foo

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
 * Load (and cache) a texture by URL. Failure / disallowed URL → `null`
 * (caller keeps placeholder).
 */
export function loadNodeTexture(url: string): Promise<Texture | null> {
  const trimmed = url.trim();
  if (!trimmed) return Promise.resolve(null);
  if (!isAllowedNodeMediaUrl(trimmed)) return Promise.resolve(null);

  const hit = cache.get(trimmed);
  if (hit) return hit;

  const loader = customLoader ?? defaultLoader;
  const pending = loader(trimmed).catch(() => null);
  cache.set(trimmed, pending);
  return pending;
}
