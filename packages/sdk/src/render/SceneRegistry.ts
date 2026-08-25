import type { Container } from 'pixi.js';
import { nodeEntityKey, parseNodeEntityKey } from '../interaction/nodeKey.js';
import { promoteIdMatches } from './promoteMath.js';

export interface NodeWorldBox {
  id: string;
  kind: 'person' | 'organization' | 'position';
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A view that can reload its texture after the media cache invalidates. */
interface MediaView {
  reloadMedia: () => Promise<void>;
}

/**
 * What the last render put on screen: world boxes per node, the Pixi view for
 * each, and which media URL each view is bound to. Everything that answers
 * «where is node X» or «hide node X because HTML owns it» reads from here.
 */
export class SceneRegistry {
  private boxes = new Map<string, NodeWorldBox>();
  private views = new Map<string, Container>();
  private mediaViews = new Map<string, Set<MediaView>>();
  private promoted = new Set<string>();

  /** Called at render entry — the promote set deliberately survives. */
  clear(): void {
    this.boxes.clear();
    this.views.clear();
    this.mediaViews.clear();
  }

  rememberBox(box: NodeWorldBox): void {
    const key = parseNodeEntityKey(box.id) ? box.id : nodeEntityKey(box.kind, box.id);
    this.boxes.set(key, { ...box, id: key });
  }

  /** Accepts a typed key (`person:p1`) or a bare id, trying each kind in turn. */
  getBox(id: string): NodeWorldBox | undefined {
    const direct = this.boxes.get(id);
    if (direct) return direct;
    const parsed = parseNodeEntityKey(id);
    if (parsed) {
      return this.boxes.get(nodeEntityKey(parsed.kind, parsed.id)) ?? this.boxes.get(parsed.id);
    }
    return (
      this.boxes.get(nodeEntityKey('position', id)) ??
      this.boxes.get(nodeEntityKey('organization', id)) ??
      this.boxes.get(nodeEntityKey('person', id))
    );
  }

  listBoxes(): readonly NodeWorldBox[] {
    return [...this.boxes.values()];
  }

  get boxCount(): number {
    return this.boxes.size;
  }

  /** Axis-aligned union of remembered node boxes (world space). */
  contentBounds(): { x: number; y: number; width: number; height: number } | null {
    if (this.boxes.size === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const box of this.boxes.values()) {
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  registerView(kind: NodeWorldBox['kind'], id: string, view: Container): void {
    const key = nodeEntityKey(kind, id);
    this.views.set(key, view);
    view.visible = !this.isPromoted(key);
  }

  registerMediaView(url: string | undefined, view: MediaView): void {
    const trimmed = url?.trim();
    if (!trimmed) return;
    let set = this.mediaViews.get(trimmed);
    if (!set) {
      set = new Set();
      this.mediaViews.set(trimmed, set);
    }
    set.add(view);
  }

  /** Views bound to any of these URLs, deduped (one view may hold several). */
  viewsForMediaUrls(urls: readonly string[]): MediaView[] {
    const seen = new Set<MediaView>();
    for (const raw of urls) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      for (const view of this.mediaViews.get(trimmed) ?? []) seen.add(view);
    }
    return [...seen];
  }

  /** Hide Pixi views for ids promoted to HTML (avoids a double paint). */
  setPromotedIds(ids: readonly string[]): void {
    this.promoted = new Set(ids);
    this.applyPromoteVisibility();
  }

  listPromotedIds(): readonly string[] {
    return [...this.promoted];
  }

  applyPromoteVisibility(): void {
    for (const [id, view] of this.views) {
      view.visible = !this.isPromoted(id);
    }
  }

  private isPromoted(key: string): boolean {
    if (this.promoted.has(key)) return true;
    return promoteIdMatches(this.promoted, key);
  }
}
