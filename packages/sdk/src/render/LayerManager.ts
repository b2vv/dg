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

  constructor() {
    this.root.addChild(
      this.zones,
      this.departments,
      this.edges,
      this.organizations,
      this.persons,
      this.departmentStrokes,
      this.overlay,
    );
    // Edges/strokes/zones are paint-only — must not steal hits from node chrome underneath.
    this.edges.eventMode = 'none';
    this.departmentStrokes.eventMode = 'none';
    this.zones.eventMode = 'none';
  }

  clear(): void {
    this.destroyLayerChildren(this.zones);
    this.destroyLayerChildren(this.departments);
    this.destroyLayerChildren(this.edges);
    this.destroyLayerChildren(this.organizations);
    this.destroyLayerChildren(this.persons);
    this.destroyLayerChildren(this.departmentStrokes);
    this.destroyLayerChildren(this.overlay);
  }

  /** T75 D3: removeChildren alone leaks GPU; destroy detached views. */
  private destroyLayerChildren(layer: Container): void {
    const removed = layer.removeChildren();
    for (const child of removed) {
      child.destroy({ children: true });
    }
  }
}
