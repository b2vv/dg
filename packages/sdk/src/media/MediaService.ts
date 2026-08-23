import type { Texture } from 'pixi.js';
import type { NodeRef } from '../interaction/types.js';
import { loadNodeTexture } from '../render/nodeMedia.js';
import type {
  DiagramMediaFacade,
  MediaPlaceholderKind,
  MediaPlaceholderRegistry,
  MediaServiceOptions,
  ThemedMedia,
} from './types.js';
import { mediaCacheKey, resolveThemedMediaUrl } from './types.js';

type InvalidateViewsHook = NonNullable<MediaServiceOptions['onInvalidateViews']>;

/**
 * Per-diagram media loader (T74). Skeleton: instance cache + owned URLs + invalidate.
 * Live sprite refresh wiring lands in M1 implementation PR.
 */
export class MediaService implements DiagramMediaFacade {
  private readonly instanceCache = new Map<string, Promise<Texture | null>>();
  private readonly ownedUrls = new Set<string>();
  private prefetchThemeKeys: readonly string[];
  private readonly onInvalidateViews: InvalidateViewsHook | undefined;

  constructor(
    private themeKey: string,
    private placeholders: MediaPlaceholderRegistry = { default: {} },
    options?: Pick<MediaServiceOptions, 'prefetchThemeKeys' | 'onInvalidateViews'>,
  ) {
    this.prefetchThemeKeys = options?.prefetchThemeKeys ?? [];
    this.onInvalidateViews = options?.onInvalidateViews;
  }

  get activeThemeKey(): string {
    return this.themeKey;
  }

  setActiveThemeKey(themeKey: string): void {
    this.themeKey = themeKey;
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

    this.ownedUrls.add(trimmed);
    const pending = loadNodeTexture(trimmed).catch(() => null);
    this.instanceCache.set(key, pending);
    return pending;
  }

  async invalidate(url: string | readonly string[]): Promise<void> {
    const urls = Array.isArray(url) ? url : [url];
    const { Assets } = await import('pixi.js');

    for (const raw of urls) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      for (const key of [...this.instanceCache.keys()]) {
        if (key === trimmed || key.startsWith(`${trimmed}::`)) {
          this.instanceCache.delete(key);
        }
      }
      try {
        await Assets.unload(trimmed);
      } catch {
        // Pixi may not have loaded this URL on this instance.
      }
    }

    if (this.onInvalidateViews) {
      await this.onInvalidateViews(urls.map((u) => u.trim()).filter(Boolean));
    }
  }

  async refresh(_ref: NodeRef): Promise<void> {
    // TODO(T74 M1): resolve entity media URLs from diagram data and invalidate.
    return Promise.resolve();
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
    const keys = new Set<string>([this.themeKey, ...this.prefetchThemeKeys]);
    for (const themeKey of keys) {
      const url = this.resolveUrl(media, themeKey);
      if (url) void this.loadTexture(url, revision);
    }
  }

  async destroy(): Promise<void> {
    const urls = [...this.ownedUrls];
    this.instanceCache.clear();
    this.ownedUrls.clear();
    await this.invalidate(urls);
  }
}
