import { describe, expect, it, vi } from 'vitest';
import { Container } from 'pixi.js';
import { LayerManager } from './DiagramRenderer.js';

describe('LayerManager.clear (T75 D3)', () => {
  it('success: destroys removed children', () => {
    const layers = new LayerManager();
    const child = new Container();
    const destroy = vi.spyOn(child, 'destroy');
    layers.organizations.addChild(child);
    expect(layers.organizations.children).toHaveLength(1);

    layers.clear();

    expect(layers.organizations.children).toHaveLength(0);
    expect(destroy).toHaveBeenCalledWith({ children: true });
  });
});
