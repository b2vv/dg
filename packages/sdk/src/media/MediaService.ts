import type { Texture } from 'pixi.js';
import type { NodeRef } from '../interaction/types.js';
import {
  acquireNodeTextureUrl,
  evictNodeTextureCache,
  loadNodeTexture,
  releaseNodeTextureUrl,
} from '../render/nodeMedia.js';
import type {
  DiagramMediaFacade,
  MediaPlaceholderKind,
  MediaPlaceholderRegistry,
  MediaServiceOptions,
  ThemedMedia,
} from './types.js';
import { mediaCacheKey, mediaCacheKeyMatchesUrl, resolveThemedMediaUrl } from './types.js';

type InvalidateViewsHook = NonNullable<MediaServiceOptions['onInvalidateViews']>;
type ResolveNodeUrls = NonNullable<MediaServiceOptions['resolveNodeUrls']>;

async function tryUnloadAssets(url: string): Promise<void> {
  try {
    const { Assets, Cache } = await import('pixi.js');
    if (!Cache.has(url)) return;
    await Promise.race([
      Assets.unload(url),
      new Promise<void>((resolve) => {
        setTimeout(resolve, 250);
      }),
    ]);
  } catch {
    // Not in Assets / already gone.
  }
}

/**
 * Per-diagram media loader (T74).
 * M0–M1: cache + refcount + live sprite refresh; M4 prefetch; refresh(ref).
 */
export class MediaService implements DiagramMediaFacade {
  private readonly instanceCache = new Map<string, Promise<Texture | null>>();
  /** Raw URLs this instance has acquire()'d (refcount). */
  private readonly ownedUrls = new Set<string>();
  private prefetchThemeKeys: readonly string[];
  private readonly onInvalidateViews: InvalidateViewsHook | undefined;
  private resolveNodeUrls: ResolveNodeUrls | undefined;

  constructor(
    private themeKey: string,
    private placeholders: MediaPlaceholderRegistry = { default: {} },
    options?: Pick<
      MediaServiceOptions,
      'prefetchThemeKeys' | 'onInvalidateViews' | 'resolveNodeUrls'
    >,
  ) {
    this.prefetchThemeKeys = options?.prefetchThemeKeys ?? [];
    this.onInvalidateViews = options?.onInvalidateViews;
    this.resolveNodeUrls = options?.resolveNodeUrls;
  }

  get activeThemeKey(): string {
    return this.themeKey;
  }

  setActiveThemeKey(themeKey: string): void {
    this.themeKey = themeKey;
  }

  setResolveNodeUrls(fn: ResolveNodeUrls | undefined): void {
    this.resolveNodeUrls = fn;
  }

  resolveUrl(media: ThemedMedia | undefined, themeKey = this.themeKey): string | undefined {
    return resolveThemedMediaUrl(media, themeKey);
  }

  async loadTexture(url: string, revision?: string | number): Promise<Texture | null> {
    const trimmed = url.trim();
    if (!trimmed) return null;
    const key = mediaCacheKey(trimmed, revision);

    const hit = this.instanceCache.get(key);
    if (hit) return hit;

    const hasStale = [...this.instanceCache.keys()].some(
      (k) => k !== key && mediaCacheKeyMatchesUrl(k, trimmed),
    );
    if (hasStale) {
      await this.bustUrlCaches(trimmed);
    }

    if (!this.ownedUrls.has(trimmed)) {
      acquireNodeTextureUrl(trimmed);
      this.ownedUrls.add(trimmed);
    }

    const pending = loadNodeTexture(trimmed, revision).catch(() => null);
    this.instanceCache.set(key, pending);
    return pending;
  }

  private async bustUrlCaches(trimmed: string): Promise<void> {
    for (const key of [...this.instanceCache.keys()]) {
      if (mediaCacheKeyMatchesUrl(key, trimmed)) {
        this.instanceCache.delete(key);
      }
    }
    evictNodeTextureCache(trimmed);
    await tryUnloadAssets(trimmed);
  }

  async invalidate(url: string | readonly string[]): Promise<void> {
    const urls = Array.isArray(url) ? url : [url];
    const trimmedList = urls.map((u) => u.trim()).filter(Boolean);

    for (const trimmed of trimmedList) {
      await this.bustUrlCaches(trimmed);
    }

    if (this.onInvalidateViews) {
      await this.onInvalidateViews(trimmedList);
    }
  }

  async refresh(ref: NodeRef): Promise<void> {
    const urls = this.resolveNodeUrls?.(ref) ?? [];
    if (urls.length === 0) return;
    await this.invalidate(urls);
  }

  setPrefetchThemeKeys(keys: readonly string[]): void {
    this.prefetchThemeKeys = keys;
  }

  getPlaceholder(
    entityType: string | undefined,
    kind: MediaPlaceholderKind,
  ): string | undefined {
    const key = entityType?.trim() || 'default';
    return this.placeholders[key]?.[kind] ?? this.placeholders.default?.[kind];
  }

  /** Fire-and-forget prefetch for configured theme keys (M4). */
  prefetch(media: ThemedMedia | undefined, revision?: string | number): void {
    if (this.prefetchThemeKeys.length === 0 && !media) return;
    const keys = new Set<string>([this.themeKey, ...this.prefetchThemeKeys]);
    const rev = revision ?? media?.revision;
    for (const themeKey of keys) {
      const url = this.resolveUrl(media, themeKey);
      if (url) void this.loadTexture(url, rev);
    }
  }

  /** True when host opted into multi-theme prefetch (Q12·B). */
  get hasPrefetchThemes(): boolean {
    return this.prefetchThemeKeys.length > 0;
  }

  async destroy(): Promise<void> {
    const urls = [...this.ownedUrls];
    this.instanceCache.clear();
    this.ownedUrls.clear();
    await Promise.all(urls.map((u) => releaseNodeTextureUrl(u)));
  }
}
