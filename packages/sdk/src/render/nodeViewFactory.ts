import { Container } from 'pixi.js';
import type { DiagramPerson, DiagramPosition } from '../data/types.js';
import type { LodLevel } from './lod.js';
import type { NodeTheme } from './types.js';

export interface NodeViewInput {
  kind: 'position';
  id: string;
  data: DiagramPerson | undefined;
  position: DiagramPosition;
}

export interface NodeViewContext {
  readonly lod: LodLevel;
  readonly theme: NodeTheme;
}

export type SimpleNodeView = (node: NodeViewInput, ctx: NodeViewContext) => Container;
export interface RetainedNodeView {
  create(node: NodeViewInput, ctx: NodeViewContext): {
    readonly root: Container;
    update(node: NodeViewInput, ctx: NodeViewContext): void;
    destroy(): void;
  };
}
export type NodeView = SimpleNodeView | RetainedNodeView;

function requireContainer(root: Container): Container {
  if (!(root instanceof Container)) throw new TypeError('nodeView must return a Pixi Container');
  return root;
}

/** Host calls are contained at the pool boundary, where the warning key is known. */
export function normalizeNodeView(view: NodeView): RetainedNodeView {
  if (typeof view !== 'function') return view;
  return {
    create(node, ctx) {
      let root = requireContainer(view(node, ctx));
      return {
        get root() { return root; },
        update(nextNode, nextContext) {
          root.destroy({ children: true });
          root = requireContainer(view(nextNode, nextContext));
        },
        destroy() { if (!root.destroyed) root.destroy({ children: true }); },
      };
    },
  };
}

/** Owned independently of the scene; callers mark visible kind:id keys each pass. */
export class NodeViewPool {
  private readonly factory: RetainedNodeView;
  private readonly entries = new Map<string, ReturnType<RetainedNodeView['create']>>();
  private readonly seen = new Set<string>();
  private readonly warned = new Set<string>();

  constructor(view: NodeView) { this.factory = normalizeNodeView(view); }

  obtain(key: string, node: NodeViewInput, ctx: NodeViewContext): Container | null {
    let entry = this.entries.get(key);
    try {
      if (entry) entry.update(node, ctx);
      else entry = this.factory.create(node, ctx);
      const root = requireContainer(entry.root);
      this.entries.set(key, entry);
      return root;
    } catch (error) {
      this.warnOnce(key, error);
      this.entries.delete(key);
      if (entry) this.destroyEntry(key, entry);
      return null;
    }
  }

  private warnOnce(key: string, error: unknown): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    console.warn(`nodeView failed for ${key}; using default view`, error);
  }

  private destroyEntry(key: string, entry: ReturnType<RetainedNodeView['create']>): void {
    try { entry.destroy(); }
    catch (error) { this.warnOnce(key, error); }
  }

  beginPass(): void { this.seen.clear(); }
  markSeen(key: string): void { this.seen.add(key); }
  endPass(): void {
    for (const [key, entry] of this.entries) {
      if (this.seen.has(key)) continue;
      this.entries.delete(key);
      this.destroyEntry(key, entry);
    }
  }
  clearAll(): void {
    this.beginPass();
    this.endPass();
  }
}
