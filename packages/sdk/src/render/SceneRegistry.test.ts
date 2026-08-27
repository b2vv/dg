import { Container } from 'pixi.js';
import { describe, expect, it } from '@rstest/core';
import { SceneRegistry } from './SceneRegistry.js';

const box = (id: string, kind: 'person' | 'organization' | 'position', x = 0, y = 0) => ({
  id,
  kind,
  x,
  y,
  width: 100,
  height: 50,
});

describe('SceneRegistry', () => {
  it('success: a bare id finds its box under the typed key', () => {
    const scene = new SceneRegistry();
    scene.rememberBox(box('p1', 'position'));
    expect(scene.getBox('p1')?.id).toBe('position:p1');
    expect(scene.getBox('position:p1')?.id).toBe('position:p1');
  });

  it('success: person and position ids of the same seat do not collide', () => {
    const scene = new SceneRegistry();
    scene.rememberBox(box('x', 'position', 0, 0));
    scene.rememberBox(box('x', 'person', 500, 0));
    expect(scene.getBox('person:x')?.x).toBe(500);
    expect(scene.getBox('position:x')?.x).toBe(0);
    expect(scene.boxCount).toBe(2);
  });

  it('success: content bounds union every remembered box', () => {
    const scene = new SceneRegistry();
    scene.rememberBox(box('a', 'organization', 0, 0));
    scene.rememberBox(box('b', 'organization', 200, 100));
    expect(scene.contentBounds()).toEqual({ x: 0, y: 0, width: 300, height: 150 });
  });

  it('success: promoting an id hides its view, and the set survives a clear', () => {
    const scene = new SceneRegistry();
    const view = new Container();
    scene.registerView('organization', 'o1', view);
    scene.setPromotedIds(['o1']);
    expect(view.visible).toBe(false);

    scene.clear();
    const next = new Container();
    scene.registerView('organization', 'o1', next);
    expect(next.visible).toBe(false);
    scene.setPromotedIds([]);
    expect(next.visible).toBe(true);
  });

  it('success: media views dedupe across the urls they are bound to', async () => {
    const scene = new SceneRegistry();
    let reloads = 0;
    const view = { reloadMedia: async () => void reloads++ };
    scene.registerMediaView(' logo.png ', view);
    scene.registerMediaView('logo@2x.png', view);
    const found = scene.viewsForMediaUrls(['logo.png', 'logo@2x.png']);
    expect(found).toHaveLength(1);
    await found[0].reloadMedia();
    expect(reloads).toBe(1);
  });

  it('failure: unknown ids, blank urls and an empty scene report nothing', () => {
    const scene = new SceneRegistry();
    expect(scene.contentBounds()).toBeNull();
    expect(scene.getBox('nope')).toBeUndefined();
    scene.registerMediaView('   ', { reloadMedia: async () => {} });
    scene.registerMediaView(undefined, { reloadMedia: async () => {} });
    expect(scene.viewsForMediaUrls(['', '   '])).toEqual([]);
  });
});
