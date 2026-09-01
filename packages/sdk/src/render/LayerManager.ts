import { Container } from 'pixi.js';

/**
 * Paint order for the scene. Every render clears through here, so a layer that
 * is not listed in {@link LayerManager.clear} keeps stale views on screen.
 */
export class LayerManager {
  readonly root = new Container();
  /** T64 named zones under department chrome / cards. */
  readonly zones = new Container();
  readonly departments = new Container();
  readonly edges = new Container();
  readonly organizations = new Container();
  readonly persons = new Container();
  /** Contour strokes above cards so corridor outlines stay visible / stable. */
  readonly departmentStrokes = new Container();
  readonly overlay = new Container();
  /**
   * Drag feedback — the target ring and the ghost line (T91).
   *
   * Its own layer rather than a guest in `overlay`, because `repaintSelection`
   * clears `overlay` wholesale: sharing would mean a click during a drag wipes
   * the preview, and a drag wipes the selection ring (T91 row 21).
   */
  readonly dragPreview = new Container();

  constructor() {
    this.root.addChild(
      this.zones,
      this.departments,
      this.edges,
      this.organizations,
      this.persons,
      this.departmentStrokes,
      this.overlay,
      this.dragPreview,
    );
    // Edges/strokes/zones are paint-only — must not steal hits from node chrome underneath.
    this.edges.eventMode = 'none';
    this.departmentStrokes.eventMode = 'none';
    this.zones.eventMode = 'none';
    // Feedback only — it must never swallow the pointer it is reporting on.
    this.dragPreview.eventMode = 'none';
  }

  clear(): void {
    this.destroyLayerChildren(this.zones);
    this.destroyLayerChildren(this.departments);
    this.destroyLayerChildren(this.edges);
    this.destroyLayerChildren(this.organizations);
    this.destroyLayerChildren(this.persons);
    this.destroyLayerChildren(this.departmentStrokes);
    this.destroyLayerChildren(this.overlay);
    this.destroyLayerChildren(this.dragPreview);
  }

  /** T75 D3: removeChildren alone leaks GPU; destroy detached views. */
  private destroyLayerChildren(layer: Container): void {
    const removed = layer.removeChildren();
    for (const child of removed) {
      child.destroy({ children: true });
    }
  }
}
