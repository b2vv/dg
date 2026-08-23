import type { ThemedMedia } from '../data/types.js';
import type { Texture } from 'pixi.js';
export type { ThemedMedia } from '../data/types.js';

export type MediaPlaceholderKind = 'loading' | 'error' | 'far';

/** SVG / image URL per placeholder state (Q15·B). */
export type MediaPlaceholderSet = Partial<Record<MediaPlaceholderKind, string>>;

/**
 * Placeholder assets keyed by host `entityType` (e.g. military / civilian / group).
 * Must include `'default'` (Q23·A).
 */
export type MediaPlaceholderRegistry = Record<string, MediaPlaceholderSet>;

export interface MediaServiceOptions {
  /** Active theme key for resolve/load (Q9·A). */
  themeKey: string;
  placeholders?: MediaPlaceholderRegistry;
  /** Themes to prefetch besides active (Q12·B). */
  prefetchThemeKeys?: readonly string[];
  /** Optional hook for M1 live sprite refresh after invalidate. */
  onInvalidateViews?: (urls: readonly string[]) => Promise<void>;
}

/** Public diagram facade (Q18·C). */
export interface DiagramMediaFacade {
  readonly activeThemeKey: string;
  resolveUrl(media: ThemedMedia | undefined, themeKey?: string): string | undefined;
  loadTexture(url: string, revision?: string | number): Promise<Texture | null>;
  /** M1: SDK map + Pixi Assets unload + live sprite refresh. */
  invalidate(url: string | readonly string[]): Promise<void>;
  /** Resolve current media URLs for node ref and invalidate. */
  refresh(ref: import('../interaction/types.js').NodeRef): Promise<void>;
  setPrefetchThemeKeys(keys: readonly string[]): void;
  /** M3: unload URLs owned by this diagram instance. */
  destroy(): Promise<void>;
}

export function mediaCacheKey(url: string, revision?: string | number): string {
  const trimmed = url.trim();
  if (revision == null || revision === '') return trimmed;
  return `${trimmed}::${revision}`;
}

export function resolveThemedMediaUrl(
  media: ThemedMedia | undefined,
  themeKey: string,
): string | undefined {
  if (!media) return undefined;
  const themed = media.byTheme?.[themeKey]?.trim();
  if (themed) return themed;
  return media.fallback?.trim() || undefined;
}
