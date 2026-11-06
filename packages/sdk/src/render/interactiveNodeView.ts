import { Container, Graphics, Rectangle, type DestroyOptions } from 'pixi.js';
import type { NodeRef } from '../core/index.js';
import type { LodLevel } from './lod.js';

export interface InteractiveNodeView {
  readonly lod: LodLevel;
  setHovered(on: boolean): void;
  setHoverHandler(fn: ((ref: NodeRef | null) => void) | undefined): void;
}

export function isInteractiveNodeView(view: Container): view is Container & InteractiveNodeView {
  return 'lod' in view && (view.lod === 'near' || view.lod === 'mid' || view.lod === 'far') &&
    'setHovered' in view && typeof view.setHovered === 'function' &&
    'setHoverHandler' in view && typeof view.setHoverHandler === 'function';
}

/** Scene owns the wrapper; the retained pool owns the host root. */
export class HostNodeView extends Container implements InteractiveNodeView {
  private readonly hoverRing = new Graphics();
  private hoverHandler: ((ref: NodeRef | null) => void) | undefined;

  constructor(
    private readonly hostRoot: Container,
    readonly lod: LodLevel,
    ref: NodeRef,
    width: number,
    height: number,
  ) {
    super();
    this.addChild(hostRoot, this.hoverRing);
    this.hitArea = new Rectangle(0, 0, width, height);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hoverRing.eventMode = 'none';
    this.hoverRing.measurable = false;
    this.hoverRing.visible = false;
    this.on('pointerover', () => {
      if (this.hoverHandler) this.hoverHandler(ref);
      else this.setHovered(true);
    });
    this.on('pointerout', () => {
      if (this.hoverHandler) this.hoverHandler(null);
      else this.setHovered(false);
    });
  }

  setHoverHandler(fn: ((ref: NodeRef | null) => void) | undefined): void {
    this.hoverHandler = fn;
  }

  setHovered(on: boolean): void {
    this.hoverRing.clear();
    this.hoverRing.visible = on && this.lod !== 'far';
    if (!this.hoverRing.visible) return;
    const bounds = this.getLocalBounds();
    this.hoverRing.roundRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4, 4)
      .stroke({ color: 0x2563eb, width: 2 });
  }

  override destroy(options?: DestroyOptions): void {
    if (this.hostRoot.parent === this) this.removeChild(this.hostRoot);
    super.destroy(options);
  }
}
